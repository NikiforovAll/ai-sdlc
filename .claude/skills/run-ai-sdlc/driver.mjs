#!/usr/bin/env node
// Drive the running site, not the source. Two commands:
//
//   node .claude/skills/run-ai-sdlc/driver.mjs smoke [team-dir]
//   node .claude/skills/run-ai-sdlc/driver.mjs shot  [team-dir] [--out <dir>]
//
// `smoke` starts `ai-sdlc serve` on a free port, drives every route through a
// real browser (click an activity, close the drawer, switch views, filter by
// role), then exports the one-file artifact and drives that too. `shot` writes
// a PNG per route.
//
// Two things this file is careful about, both learned the hard way:
//
//  1. Every Astro process it starts gets its own `AISDLC_CACHE_DIR`. Astro
//     rewrites `.astro/content-assets.mjs` on start, and a second process
//     sharing that directory breaks whatever dev server is already running with
//     "Failed to load url /.astro/content-assets.mjs".
//  2. The browser is reached through `playwright-cli`'s JS entry rather than the
//     `playwright-cli` shim, so argv carries the eval expressions verbatim and
//     no shell quoting is involved.
import { spawn, spawnSync, execSync } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdir, mkdtemp, readdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SESSION = 'ai-sdlc-driver';
const cleanups = [];

// ── browser ────────────────────────────────────────────────────────────────
// `playwright-cli` is a global npm shim; on Windows only the .cmd is on PATH,
// and going through a shell would mangle the eval expressions.
const PW = (() => {
  const globalRoot = execSync('npm root -g', { encoding: 'utf8' }).trim();
  const js = join(globalRoot, '@playwright', 'cli', 'playwright-cli.js');
  if (!existsSync(js)) {
    console.error('playwright-cli is not installed globally — npm i -g @playwright/cli');
    process.exit(1);
  }
  return js;
})();

function pw(...args) {
  const r = spawnSync(process.execPath, [PW, `-s=${SESSION}`, ...args], { encoding: 'utf8' });
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  if (/### Error/.test(out)) throw new Error(out.split('### Error')[1].trim().split('\n')[0]);
  return out;
}

// playwright-cli prints the return value as a JSON string under `### Result`;
// the page functions here return JSON, so it comes back double-encoded.
function evalPage(expr) {
  const out = pw('eval', expr);
  const line = out.split('### Result')[1]?.split('\n')[1];
  if (line === undefined) throw new Error(`no result from eval:\n${out}`);
  return JSON.parse(JSON.parse(line));
}

// ── processes ──────────────────────────────────────────────────────────────
const freePort = () =>
  new Promise((done) => {
    const s = createServer();
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => done(port));
    });
  });

// Killing the CLI leaves the `astro` grandchild holding the port, so take the tree.
function killTree(child) {
  if (!child.pid) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    try {
      process.kill(-child.pid, 'SIGKILL');
    } catch {
      child.kill('SIGKILL');
    }
  }
}

async function waitFor(url, timeoutMs = 60_000) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {
      /* not listening yet */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`${url} never came up`);
}

async function serveTeam(teamDir, cacheDir) {
  const port = await freePort();
  const child = spawn(
    process.execPath,
    [join(ROOT, 'bin', 'ai-sdlc.mjs'), 'serve', teamDir, '--port', String(port)],
    { cwd: ROOT, env: { ...process.env, AISDLC_CACHE_DIR: cacheDir }, stdio: 'ignore' }
  );
  cleanups.push(() => killTree(child));
  // The dev server binds ::1, so `localhost` resolves and `127.0.0.1` does not.
  const base = `http://localhost:${port}`;
  await waitFor(`${base}/`);
  return base;
}

// The export is one file meant for `file://`, which the browser refuses to open
// under automation — so it is handed over on a loopback port instead. It has to
// be its own process: the browser is driven with `spawnSync`, which blocks this
// event loop, so a server living here would never answer the navigation.
const FILE_SERVER = `
const { createServer } = require('node:http');
const body = require('node:fs').readFileSync(process.argv[1]);
createServer((_, res) => {
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.end(body);
}).listen(Number(process.argv[2]), '127.0.0.1');
`;

async function serveFile(file) {
  const port = await freePort();
  const child = spawn(process.execPath, ['-e', FILE_SERVER, file, String(port)], { stdio: 'ignore' });
  cleanups.push(() => killTree(child));
  const url = `http://127.0.0.1:${port}/`;
  await waitFor(url, 10_000);
  return url;
}

// ── checks ─────────────────────────────────────────────────────────────────
const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${name}${detail ? ` — ${detail}` : ''}`);
}

const processIds = async (teamDir) =>
  (await readdir(join(teamDir, 'processes')))
    .filter((f) => f.endsWith('.yaml'))
    .map((f) => f.replace(/\.yaml$/, ''))
    .sort();

// A node is drawn once per view, so the same activity has three buttons.
const DOC_STATE = `() => JSON.stringify({
  acts: new Set([...document.querySelectorAll('button[data-act]')].map(b => b.dataset.act)).size,
  drawerHidden: document.querySelector('[data-drawer]').hidden,
  view: document.querySelector('main').dataset.view,
  readout: document.querySelector('[data-readout]')?.textContent?.trim(),
  overlay: !!document.querySelector('vite-error-overlay'),
})`;

const OPEN_FIRST_ACT = `() => {
  const b = document.querySelector('button[data-act]');
  b.click();
  return JSON.stringify({
    act: b.dataset.act,
    drawerHidden: document.querySelector('[data-drawer]').hidden,
    open: [...document.querySelectorAll('[data-detail]')].filter(p => !p.hidden).map(p => p.dataset.detail),
  });
}`;

async function driveProcess(base, id) {
  pw('goto', `${base}/${id}`);
  const state = evalPage(DOC_STATE);
  check(`/${id} renders`, state.acts > 0 && !state.overlay, `${state.acts} activities`);
  check(`/${id} drawer starts closed`, state.drawerHidden === true);

  const opened = evalPage(OPEN_FIRST_ACT);
  check(
    `/${id} activity opens its drawer panel`,
    opened.drawerHidden === false && opened.open.length === 1 && opened.open[0] === opened.act,
    opened.act
  );

  // One keydown listener serves every document on the page; Escape must still
  // reach the one that is showing.
  pw('press', 'Escape');
  check(`/${id} Escape closes the drawer`, evalPage('() => JSON.stringify(document.querySelector("[data-drawer]").hidden)') === true);

  pw('eval', `() => { document.querySelector('[data-viewbtn="playbook"]').click(); return ''; }`);
  check(`/${id} view switches to PLAYBOOK`, evalPage(DOC_STATE).view === 'playbook');

  const filtered = evalPage(`() => {
    const chip = [...document.querySelectorAll('.filter__chip')].find(c => c.dataset.filter);
    chip.click();
    return JSON.stringify({ role: chip.dataset.filter, main: document.querySelector('main').dataset.role, readout: document.querySelector('[data-readout]').textContent.trim() });
  }`);
  check(
    `/${id} role filter narrows the readout`,
    filtered.main === filtered.role && /of \d+ activities in scope/.test(filtered.readout),
    filtered.readout
  );
}

// ── commands ───────────────────────────────────────────────────────────────
async function smoke(teamDir) {
  const cache = await mkdtemp(join(tmpdir(), 'ai-sdlc-driver-'));
  cleanups.push(() => rm(cache, { recursive: true, force: true }));
  const ids = await processIds(teamDir);

  console.log(`\nserving ${teamDir}`);
  const base = await serveTeam(teamDir, join(cache, 'serve'));
  pw('open', `${base}/`);

  const overview = evalPage(`() => JSON.stringify({
    title: document.title,
    procs: document.querySelectorAll('[data-doc-kind="team"] [data-goto]').length,
    overlay: !!document.querySelector('vite-error-overlay'),
  })`);
  check('/ renders the team document', !overview.overlay && /ai-sdlc/.test(overview.title), overview.title);

  for (const id of ids) await driveProcess(base, id);

  console.log('\nexporting');
  const out = join(cache, 'export.html');
  spawnSync(process.execPath, [join(ROOT, 'bin', 'ai-sdlc.mjs'), 'export', teamDir, '--out', out], {
    cwd: ROOT,
    stdio: 'ignore',
  });
  check('export writes one file', existsSync(out));

  pw('goto', await serveFile(out));
  const artifact = evalPage(`() => {
    const buttons = [...document.querySelectorAll('.switch__doc')];
    buttons[buttons.length - 1].click();
    const shown = [...document.querySelectorAll('[data-doc]')].filter(d => !d.hidden).map(d => d.dataset.doc);
    const doc = document.querySelector('[data-doc="' + shown[0] + '"]');
    doc.querySelector('button[data-act]').click();
    return JSON.stringify({
      docs: buttons.length,
      shown,
      open: [...doc.querySelectorAll('[data-detail]')].filter(p => !p.hidden).map(p => p.dataset.detail),
      external: [...document.querySelectorAll('[src^="/"],[href^="/_astro"]')].length,
    });
  }`);
  check('export holds every document', artifact.docs === ids.length + 1, `${artifact.docs} documents`);
  check('export shows one document at a time', artifact.shown.length === 1, artifact.shown[0]);
  check('export drawer works offline', artifact.open.length === 1, artifact.open[0]);
  check('export references no external asset', artifact.external === 0);
}

async function shot(teamDir, outDir) {
  const cache = await mkdtemp(join(tmpdir(), 'ai-sdlc-driver-'));
  cleanups.push(() => rm(cache, { recursive: true, force: true }));
  await mkdir(outDir, { recursive: true });

  const base = await serveTeam(teamDir, join(cache, 'serve'));
  pw('open', `${base}/`);
  pw('resize', '1440', '1000');
  for (const route of ['', ...(await processIds(teamDir))]) {
    pw('goto', `${base}/${route}`);
    const file = join(outDir, `${route || 'index'}.png`);
    pw('screenshot', `--filename=${file}`);
    console.log(`  ${file}`);
  }
}

// ── entry ──────────────────────────────────────────────────────────────────
const [command, ...rest] = process.argv.slice(2);
const positional = rest.filter((a) => !a.startsWith('--'));
const flag = (name) => rest.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const teamDir = resolve(positional[0] ?? join(ROOT, 'content', 'teams', 'reference'));

try {
  if (command === 'smoke') await smoke(teamDir);
  else if (command === 'shot') await shot(teamDir, resolve(flag('out') ?? join(ROOT, '_exports', 'shots')));
  else {
    console.error('usage: driver.mjs smoke|shot [team-dir] [--out=<dir>]');
    process.exitCode = 1;
  }
} catch (err) {
  console.error(`\ndriver failed: ${err.message}`);
  process.exitCode = 1;
} finally {
  try {
    pw('close');
  } catch {
    /* no session to close */
  }
  for (const done of cleanups.reverse()) await done();
  const failed = results.filter((r) => !r.ok).length;
  if (results.length) {
    console.log(`\n${results.length - failed}/${results.length} checks passed`);
    if (failed) process.exitCode = 1;
  }
}

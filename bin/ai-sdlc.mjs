#!/usr/bin/env node
// The CLI layer — see `_plans/spec-cli-layer.md`.
//
//   ai-sdlc serve  <team-dir> [--port <n>] [--host]
//   ai-sdlc export <team-dir> [--out <file>]
//   ai-sdlc check  <team-dir>
//
// `<team-dir>` is required in all three. No default and no cwd sniffing: the CLI
// is always explicit about what it renders, and `npm run dev` stays the repo's
// own entry point.
import { spawn } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const PKG_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const USAGE = `ai-sdlc — render a team's delivery process document

  ai-sdlc serve  <team-dir> [--port <n>] [--host]   mapping-session surface, hot reload
  ai-sdlc export <team-dir> [--out <file>]          one self-contained HTML file
  ai-sdlc check  <team-dir>                         validate the YAML, print errors

<team-dir> holds team.yaml and processes/*.yaml.`;

function die(message) {
  console.error(message);
  process.exit(1);
}

async function teamDirOf(positional) {
  if (!positional) die(`missing <team-dir>\n\n${USAGE}`);
  const dir = resolve(positional);
  const ok = await stat(join(dir, 'team.yaml')).then(
    (s) => s.isFile(),
    () => false
  );
  if (!ok) die(`"${dir}" is not a team folder — no team.yaml in it`);
  // The watcher compares the path it registered against the path Windows reports
  // for a change, so an 8.3 short name (`NIKIFO~1`) in the argument aborts the dev
  // server on the first edit. `realpath.native` is what expands it.
  return realpathSync.native(dir);
}

// Astro renders this package's components, with the team folder injected by
// environment — the content root is a variable, not the cwd (D-CLI-2).
function astro(args, teamDir, extraEnv = {}) {
  return new Promise((done, fail) => {
    const child = spawn(
      process.execPath,
      [join(PKG_ROOT, 'node_modules', 'astro', 'astro.js'), ...args, '--root', PKG_ROOT],
      {
        stdio: 'inherit',
        env: { ...process.env, AISDLC_TEAM_DIR: teamDir, ...extraEnv },
      }
    );
    child.on('error', fail);
    child.on('exit', (code) => (code === 0 ? done() : fail(new Error(`astro exited ${code}`))));
  });
}

async function cmdServe(positionals, values) {
  const teamDir = await teamDirOf(positionals[0]);
  const args = ['dev'];
  if (values.port) args.push('--port', String(values.port));
  if (values.host) args.push('--host');
  await astro(args, teamDir);
}

async function cmdExport(positionals, values) {
  const teamDir = await teamDirOf(positionals[0]);
  const out = resolve(values.out ?? `./${basename(teamDir)}.html`);

  // Build into a temp dir and remove it, so no dist/ is left behind and a
  // read-only package dir still works.
  const work = await mkdtemp(join(tmpdir(), 'ai-sdlc-'));
  const dist = join(work, 'dist');
  try {
    await astro(['build', '--outDir', dist], teamDir, { AISDLC_CACHE_DIR: join(work, 'cache') });
    const { inlineExport } = await import('./inline.mjs');
    const html = await inlineExport(dist);
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, html, 'utf8');
    const kb = Math.round(Buffer.byteLength(html) / 1024);
    console.log(`\n${out}  ${kb}K — one file, opens from disk`);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

async function cmdCheck(positionals) {
  const teamDir = await teamDirOf(positionals[0]);
  const { checkTeam, reportProblems } = await import('./check.mjs');
  const { problems } = await checkTeam(teamDir);
  if (problems.length === 0) {
    console.log(`${teamDir} — schema ok`);
    return;
  }
  reportProblems(problems);
  console.error(`\n${problems.length} problem(s)`);
  process.exit(1);
}

const [command, ...rest] = process.argv.slice(2);
if (!command || command === '--help' || command === '-h') {
  console.log(USAGE);
  process.exit(command ? 0 : 1);
}

const { values, positionals } = parseArgs({
  args: rest,
  allowPositionals: true,
  options: {
    port: { type: 'string' },
    host: { type: 'boolean' },
    out: { type: 'string' },
  },
});

try {
  if (command === 'serve') await cmdServe(positionals, values);
  else if (command === 'export') await cmdExport(positionals, values);
  else if (command === 'check') await cmdCheck(positionals);
  else die(`unknown command "${command}"\n\n${USAGE}`);
} catch (err) {
  die(err.message);
}

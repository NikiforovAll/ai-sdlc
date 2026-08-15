#!/usr/bin/env node
// The CLI layer — see `_plans/spec-cli-layer.md`.
//
//   ai-sdlc new    <team-dir> [--name <team name>]
//   ai-sdlc serve  <team-dir> [--port <n>] [--host]
//   ai-sdlc export <team-dir> [--out <file>]
//   ai-sdlc check  <team-dir>
//   ai-sdlc status <team-dir>
//
// `<team-dir>` is required in all of them. No default and no cwd sniffing: the
// CLI is always explicit about what it renders, and `npm run dev` stays the
// repo's own entry point.
//
// `new` and `status` are the authoring layer — see `_plans/spec-authoring.md`.
// Neither asks a question: the interview lives in the `map-team` skill, because
// the model is a graph and a prompt sequence can only walk a list (D-AUTH-1).
import { spawn } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const PKG_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const USAGE = `ai-sdlc — render a team's delivery process document

  ai-sdlc new    <team-dir> [--name <team name>]    write a skeleton team folder
  ai-sdlc serve  <team-dir> [--port <n>] [--host]   mapping-session surface, hot reload
  ai-sdlc export <team-dir> [--out <file>]          one self-contained HTML file
  ai-sdlc check  <team-dir>                         validate the YAML, print errors
  ai-sdlc status <team-dir>                         how far along the document is

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

// `acme-delivery` → `Acme Delivery`. The folder name is the team id either way;
// this only supplies a readable `name:` when --name is not given.
const titleCase = (slug) =>
  slug
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');

// The skeleton is the smallest team the schema accepts and the renderer draws
// (D-AUTH-2): one role, one artifact, one stage, one open activity. It is not
// impressive, and that is the point — nothing on the page is a stranger's
// process for the team to argue with.
async function cmdNew(positionals, values) {
  if (!positionals[0]) die(`missing <team-dir>\n\n${USAGE}`);
  const dir = resolve(positionals[0]);

  const existing = await readdir(dir).catch(() => null);
  if (existing?.length) die(`"${dir}" already has files in it — new writes into an empty folder`);

  const name = values.name ?? titleCase(basename(dir));
  const templates = join(PKG_ROOT, 'templates');

  const team = (await readFile(join(templates, 'team.yaml'), 'utf8')).replace('name: New Team', `name: ${name}`);
  const process_ = await readFile(join(templates, 'processes', 'delivery.yaml'), 'utf8');

  await mkdir(join(dir, 'processes'), { recursive: true });
  await writeFile(join(dir, 'team.yaml'), team, 'utf8');
  await writeFile(join(dir, 'processes', 'delivery.yaml'), process_, 'utf8');

  const here = basename(dir);
  console.log(
    [
      `${here}/`,
      `  team.yaml                  ${name} — 1 role, 1 artifact, empty catalogs`,
      `  processes/delivery.yaml    1 stage, 1 activity, no tooling`,
      '',
      'next',
      `  ai-sdlc serve ${positionals[0]}      render it, and leave this running`,
      `  claude → /map-team           map the team into it while the page redraws`,
    ].join('\n')
  );
}

async function cmdStatus(positionals) {
  const teamDir = await teamDirOf(positionals[0]);
  const { describeTeam, reportStatus } = await import('./status.mjs');
  reportStatus(await describeTeam(teamDir));
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
    name: { type: 'string' },
  },
});

try {
  if (command === 'new') await cmdNew(positionals, values);
  else if (command === 'status') await cmdStatus(positionals);
  else if (command === 'serve') await cmdServe(positionals, values);
  else if (command === 'export') await cmdExport(positionals, values);
  else if (command === 'check') await cmdCheck(positionals);
  else die(`unknown command "${command}"\n\n${USAGE}`);
} catch (err) {
  die(err.message);
}

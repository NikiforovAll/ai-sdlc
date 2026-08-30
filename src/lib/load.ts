// Reading a team folder off disk, in the one place both readers agree on: the
// CLI (`check`, `status`) and the Astro loader in `content.config.ts`. The
// merge rule below is a spec fact, so it is written once and imported twice.
import { readFile, readdir } from 'node:fs/promises';
import { basename, join, relative, resolve } from 'node:path';
import type { ZodType } from 'zod';
import { parse } from 'yaml';
import { CATALOG_KEYS, teamSchema, type TeamData } from './schema.ts';

export interface Problem {
  file: string;
  path: string;
  message: string;
}

export interface LoadedTeam {
  /** The merged document, however incomplete — `status` describes one that fails. */
  team: Record<string, unknown>;
  problems: Problem[];
  /** Which file each catalog was read from — the address a `status` finding needs. */
  fileOf: Record<string, string>;
}

const isMap = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null && !Array.isArray(x);

/**
 * Which folder renders this run. The CLI sets the variable; the packaged example
 * is the fallback so `npm run dev` needs no environment. Stated here rather than
 * where it is read, so the page and the annotation endpoint can never disagree
 * about which folder they are looking at.
 */
export const teamDirFromEnv = (): string => resolve(process.env.AISDLC_TEAM_DIR ?? './examples/reference');

/** The files a team folder may hold, in the order a reader meets them. */
export const teamFiles = (teamDir: string): string[] => [
  join(teamDir, 'team.yaml'),
  ...CATALOG_KEYS.map((k) => join(teamDir, `${k}.yaml`)),
];

/** A team folder outside the cwd relativizes into a stack of `..`; the absolute path is shorter there. */
export const address = (file: string): string => {
  const rel = relative(process.cwd(), file);
  return !rel || rel.startsWith('..') ? file : rel;
};

export const formatProblem = (p: Problem): string => `${address(p.file)}\n  ${p.path ? `${p.path}: ` : ''}${p.message}`;

/** The file is not there. */
export const MISSING = Symbol('missing');
/** The file is there and could not be read — it has already said why in its own words. */
export const FAILED = Symbol('failed');

/** Parse one YAML file, recording a parse failure as a problem against it. */
export async function parseYaml(file: string, problems: Problem[]): Promise<unknown> {
  let raw: string;
  try {
    raw = await readFile(file, 'utf8');
  } catch (err) {
    if ((err as { code?: string }).code === 'ENOENT') return MISSING;
    problems.push({ file, path: '', message: (err as Error).message.split('\n')[0] });
    return FAILED;
  }
  try {
    return parse(raw);
  } catch (err) {
    problems.push({ file, path: '', message: (err as Error).message.split('\n')[0] });
    return FAILED;
  }
}

/** Parse and validate one whole-file document, addressing every issue to that file. */
export async function validateFile(file: string, schema: ZodType, problems: Problem[]): Promise<unknown> {
  const data = await parseYaml(file, problems);
  if (data === MISSING) {
    problems.push({ file, path: '', message: 'not found' });
    return null;
  }
  if (data === FAILED) return null;
  const result = schema.safeParse(data);
  if (!result.success) {
    for (const issue of result.error.issues) {
      problems.push({ file, path: issue.path.join('.'), message: issue.message });
    }
  }
  return data;
}

/**
 * A catalog lives in `team.yaml` or in a sibling file named after it, never in
 * both. The split is what a document of any size actually needs — an artifact
 * shelf outgrows the file that also has to introduce the team — and the inline
 * form stays legal because a five-line team should not be five files.
 *
 * The merged document is validated once, and each issue is addressed back to
 * the file that wrote the key. Validating the halves separately would need a
 * second schema saying which fields are optional in which file, and that second
 * schema is exactly the thing this repo does not want two of.
 */
export async function loadTeam(teamDir: string): Promise<LoadedTeam & { data?: TeamData }> {
  const problems: Problem[] = [];
  const [teamFile, ...catalogFiles] = teamFiles(teamDir);
  // Every key is addressed to `team.yaml` until a file of its own claims it.
  const fileOf: Record<string, string> = Object.fromEntries(CATALOG_KEYS.map((k) => [k, teamFile]));
  // The catalogs that have a file of their own, whatever that file managed to hand over.
  const own = new Set<string>();

  const root = await parseYaml(teamFile, problems);
  if (root === MISSING) problems.push({ file: teamFile, path: '', message: 'no team.yaml' });
  const inline = isMap(root) ? root : {};
  const merged: Record<string, unknown> = { ...inline };

  for (const [i, key] of CATALOG_KEYS.entries()) {
    const file = catalogFiles[i];
    const found = await parseYaml(file, problems);
    if (found === MISSING) continue;
    own.add(key);
    fileOf[key] = file;
    // The key is repeated inside the file it names, so a reader who opens the
    // file alone still knows what they are holding and a schema issue reads
    // `artifacts.3.id` whichever file the shelf lives in.
    if (found === FAILED || !isMap(found) || !(key in found)) {
      // A file that would not parse has already printed the parser's complaint.
      if (found !== FAILED) {
        problems.push({ file, path: '', message: `no \`${key}:\` key — the file is named for the one shelf it holds` });
      }
      continue;
    }
    const extra = Object.keys(found).filter((k) => k !== key);
    if (extra.length) {
      problems.push({ file, path: '', message: `only \`${key}:\` belongs here — also found ${extra.join(', ')}` });
    }
    if (key in inline) {
      problems.push({ file, path: key, message: `also declared in team.yaml — a catalog lives in one file` });
      continue;
    }
    merged[key] = found[key];
  }

  // The folder is the document, so a file that looks like part of it and is not
  // read at all — `harness.yaml`, `tools.yml` — must not pass as ok. Its shelf
  // would simply be absent, and an absent optional shelf reports nothing.
  const known = new Set(teamFiles(teamDir).map((f) => basename(f)));
  for (const name of await readdir(teamDir).catch(() => [])) {
    if (!/\.ya?ml$/.test(name) || known.has(name)) continue;
    problems.push({
      file: join(teamDir, name),
      path: '',
      message: `nothing reads this file — the document is team.yaml, ${CATALOG_KEYS.map((k) => `${k}.yaml`).join(', ')} and processes/*.yaml`,
    });
  }

  const result = teamSchema.safeParse(merged);
  if (!result.success) {
    for (const issue of result.error.issues) {
      const key = String(issue.path[0]);
      const unfilled = issue.path.length === 1 && !(key in merged);
      // A catalog file that exists but handed over no list has already said so in
      // its own words. Repeating it as `artifacts: Required` points at team.yaml,
      // which is the wrong file.
      if (unfilled && own.has(key)) continue;
      problems.push({
        file: fileOf[key] ?? teamFile,
        path: issue.path.join('.'),
        message: unfilled && key in fileOf ? `declare it here or in ${key}.yaml` : issue.message,
      });
    }
  }

  return { team: merged, problems, fileOf, data: result.success ? result.data : undefined };
}

/** The parsed, valid document — for the renderer, which has no way to report a problem. */
export async function loadTeamOrThrow(teamDir: string): Promise<TeamData> {
  const { data, problems } = await loadTeam(teamDir);
  if (problems.length || !data) {
    const lines = problems.map((p) => `  ${basename(p.file)}${p.path ? ` ${p.path}` : ''}: ${p.message}`);
    throw new Error(`team folder does not validate:\n${lines.join('\n')}`);
  }
  return data;
}

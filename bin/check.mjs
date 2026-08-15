// Schema-only validation (D-CLI-7): parse the YAML, run the zod schemas, print
// file + path + message. No referential-integrity pass, no cycle detection — and
// no Astro, which is what makes it faster than a build.
import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { parse } from 'yaml';
import { teamSchema, processSchema } from '../src/lib/schema.ts';

export async function checkTeam(teamDir) {
  const problems = [];

  const run = async (file, schema) => {
    let data;
    try {
      data = parse(await readFile(file, 'utf8'));
    } catch (err) {
      problems.push({ file, path: '', message: err.message.split('\n')[0] });
      return;
    }
    const result = schema.safeParse(data);
    if (!result.success) {
      for (const issue of result.error.issues) {
        problems.push({ file, path: issue.path.join('.'), message: issue.message });
      }
    }
  };

  await run(join(teamDir, 'team.yaml'), teamSchema);

  const procDir = join(teamDir, 'processes');
  let files = [];
  try {
    // `.yaml` only, matching the glob in `src/content.config.ts` — a `.yml` file
    // the renderer will never load must not pass as ok here.
    files = (await readdir(procDir)).filter((f) => f.endsWith('.yaml')).sort();
  } catch {
    problems.push({ file: procDir, path: '', message: 'no processes/ directory' });
  }
  if (files.length === 0 && problems.every((p) => p.file !== procDir)) {
    problems.push({ file: procDir, path: '', message: 'no process files' });
  }
  for (const f of files) await run(join(procDir, f), processSchema);

  return { problems };
}

// A team folder outside the cwd relativizes into a stack of `..`; the absolute
// path is the shorter and clearer address there.
const address = (file) => {
  const rel = relative(process.cwd(), file);
  return !rel || rel.startsWith('..') ? file : rel;
};

export function reportProblems(problems) {
  for (const p of problems) {
    const where = p.path ? `${p.path}: ` : '';
    console.error(`${address(p.file)}\n  ${where}${p.message}`);
  }
}

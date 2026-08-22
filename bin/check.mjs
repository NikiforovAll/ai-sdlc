// Schema-only validation (D-CLI-7): parse the YAML, run the zod schemas, print
// file + path + message. No referential-integrity pass, no cycle detection — and
// no Astro, which is what makes it faster than a build.
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { processSchema } from '../src/lib/schema.ts';
import { address, formatProblem, loadTeam, validateFile } from '../src/lib/load.ts';

export { address };

export async function checkTeam(teamDir) {
  const problems = [];
  const docs = [];

  // The raw parse is returned alongside the verdict so `status` can describe a
  // document without parsing it a second time — including one that fails the
  // schema, which during authoring is the normal state.
  //
  // The team half is several files merged into one document, so `load` reads it
  // and addresses each problem back to the file that wrote the key.
  const { team, problems: teamProblems, fileOf } = await loadTeam(teamDir);
  problems.push(...teamProblems);

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
  for (const f of files) {
    const file = join(procDir, f);
    const data = await validateFile(file, processSchema, problems);
    docs.push({ id: f.replace(/\.yaml$/, ''), file, data });
  }

  return { problems, team, docs, fileOf };
}

export function reportProblems(problems) {
  for (const p of problems) console.error(formatProblem(p));
}

#!/usr/bin/env node
// `schemas/` is a projection of `src/lib/schema.ts`, the same way the site is a
// projection of the YAML. Nothing under `schemas/` is hand-edited — `--check`
// is what enforces that, and CI runs it.
//
// The generated schemas are stricter than `check` in one place: zod's
// `z.object` *strips* unknown keys rather than failing on them, so `check`
// accepts `produce:` for `produces:` in silence, and the schema's
// `additionalProperties: false` does not. That asymmetry is deliberate and in
// the author's favour — a misspelt key is the likeliest authoring mistake there
// is, and nothing else in this repo catches it. Do not "fix" it by loosening
// the schema.
//
// What the schemas cannot do is anything that needs a second file: an id
// referencing a catalog entry, or the never-both rule for a catalog declared in
// two places. Those stay in `src/lib/load.ts` and `bin/status.mjs`.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  CATALOG_KEYS,
  catalogFileSchemas,
  teamFileSchema,
  processSchema,
  id,
  ref,
  entry,
  captioned,
  fill,
  recommendation,
  openSlot,
  tool,
  subActivity,
} from '../src/lib/schema.ts';

const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(PKG_ROOT, 'schemas');

/** Where the schemas are served from once the commit lands. See `schemas/README.md` for why `main`. */
const SCHEMA_BASE_URL = 'https://raw.githubusercontent.com/NikiforovAll/ai-sdlc/main/schemas';

// The shapes worth a name of their own in the output. Passing them here is what
// turns `#/$defs/id` into the one id rule stated once; without it the converter
// dedupes by pointing at whichever field mentioned an id first, which re-points
// every time a field is reordered and makes every diff unreadable.
// `subActivity` is here for a second reason: it is the one recursive shape, and
// without a name of its own the converter points the recursion at the position
// it first appeared — `#/$defs/Process/properties/activities/items/properties/
// activities/items`, which is correct and unreadable and moves whenever the
// shape around it moves.
const shared = { id, ref, entry, captioned, fill, recommendation, openSlot, tool, subActivity };

// draft-07 rather than 2020-12: `redhat.vscode-yaml` implements draft-07
// completely and 2020-12 only in part, and the editor is the whole point.
const options = (name) => ({
  name,
  definitions: shared,
  definitionPath: '$defs',
  target: 'jsonSchema7',
});

/**
 * `superRefine` carries no JSON Schema meaning, so the converter drops
 * `oneOrTheOther` silently — and that is the one rule of the three in
 * `load.ts`'s keeping that JSON Schema *can* state, because it is a fact about
 * a single object. Put it back.
 *
 * Found by shape rather than by name so it lands on `activity` and
 * `subActivity` wherever the converter happened to place them, and survives a
 * `$defs` rename.
 */
function restoreExclusiveTooling(node) {
  if (Array.isArray(node)) {
    node.forEach(restoreExclusiveTooling);
    return;
  }
  if (!node || typeof node !== 'object') return;
  const props = node.properties;
  if (props && typeof props === 'object' && 'tooling' in props && 'open' in props) {
    node.not = { required: ['tooling', 'open'] };
  }
  for (const value of Object.values(node)) restoreExclusiveTooling(value);
}

function build(schema, { file, name, title }) {
  const json = zodToJsonSchema(schema, options(name));
  restoreExclusiveTooling(json);
  // `$id` is how a reader who opened the raw file finds its home; it plays no
  // part in resolution, which the modeline in the YAML does. `$schema` is
  // destructured out and put back first so the dialect is the opening line of
  // the file rather than wherever the converter left it.
  const { $schema, ...rest } = json;
  const body = { $schema, $id: `${SCHEMA_BASE_URL}/${file}`, title, ...rest };
  return { file, text: `${JSON.stringify(body, null, 2)}\n` };
}

function documents() {
  const docs = [
    build(teamFileSchema, {
      file: 'team.schema.json',
      name: 'Team',
      title: 'ai-sdlc team.yaml',
    }),
    build(processSchema, {
      file: 'process.schema.json',
      name: 'Process',
      title: 'ai-sdlc processes/*.yaml',
    }),
  ];
  for (const key of CATALOG_KEYS) {
    docs.push(
      build(catalogFileSchemas[key], {
        file: `${key}.schema.json`,
        name: key[0].toUpperCase() + key.slice(1),
        title: `ai-sdlc ${key}.yaml`,
      })
    );
  }
  return docs;
}

async function main() {
  const checkOnly = process.argv.includes('--check');
  const docs = documents();

  if (checkOnly) {
    const stale = [];
    for (const { file, text } of docs) {
      const current = await readFile(join(OUT_DIR, file), 'utf8').catch(() => null);
      if (current !== text) stale.push(file);
    }
    if (stale.length) {
      console.error(`schemas/ is stale — run \`npm run schemas\`:`);
      for (const file of stale) console.error(`  schemas/${file}`);
      process.exit(1);
    }
    console.log(`schemas/ is current — ${docs.length} files`);
    return;
  }

  await mkdir(OUT_DIR, { recursive: true });
  for (const { file, text } of docs) {
    await writeFile(join(OUT_DIR, file), text);
    console.log(relative(PKG_ROOT, join(OUT_DIR, file)).replace(/\\/g, '/'));
  }
}

await main();

// `annotations` — the reading half of the annotation layer (D-ANN-12).
//
// Two verbs, and they are the whole consumption path: list what readers left,
// and delete one that has been dealt with. Resolving is deleting (D-ANN-9) — the
// YAML is the record, so a note whose change is already in the document is noise.
//
// A sidecar, not part of the team document (D-ANN-10): `check` never reads this
// and a malformed note is reported here rather than failing anyone's build.
import { readAnnotations, resolveAnnotation } from '../src/lib/annotations.ts';
import { address } from '../src/lib/load.ts';

// `2026-08-30T09:12:44.101Z` → `08-30 09:12`. The year is almost always this one
// and the seconds never matter; what a reader wants is the order and the day.
const when = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(+d)
    ? '?'.padEnd(11)
    : `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ` +
        `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// Notes are prose and prose wraps; the id and the anchor line up so the list can
// be scanned down the left edge, and the body is indented under them.
const wrap = (s, width, indent) => {
  const out = [];
  let line = '';
  for (const word of s.split(/\s+/)) {
    if (line && line.length + 1 + word.length > width) {
      out.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) out.push(line);
  return out.map((l, i) => (i === 0 ? l : `${indent}${l}`)).join('\n');
};

export function reportAnnotations({ annotations, problems }, teamDir) {
  if (problems.length) {
    for (const p of problems) console.error(`  ${address(p.file)}  ${p.problem}`);
    console.error('');
  }
  if (annotations.length === 0) {
    console.log(`${address(teamDir)} — no open annotations`);
    return;
  }

  const width = Math.max(...annotations.map((a) => a.anchor.length));
  for (const a of annotations) {
    const head = `${a.id} ${when(a.created)} ${a.anchor.padEnd(width)}`;
    console.log(`${head}  ${wrap(a.note, 78, ' '.repeat(head.length + 2))}`);
  }
  console.log(`\n${annotations.length} open — ai-sdlc annotations <team-dir> --resolve <id> when one is dealt with`);
}

export async function cmdAnnotations(teamDir, values) {
  if (values.resolve) {
    const gone = await resolveAnnotation(teamDir, values.resolve);
    if (!gone) throw new Error(`no annotation "${values.resolve}" in ${teamDir}`);
    console.log(`resolved ${values.resolve}`);
    return;
  }

  const store = await readAnnotations(teamDir);
  if (values.json) {
    console.log(JSON.stringify({ team: teamDir, ...store }, null, 2));
    return;
  }
  reportAnnotations(store, teamDir);
}

// `status` describes how far along a team document is (D-AUTH-5). It is not a
// gate and never fails: mid-authoring the honest answer is "incomplete", and an
// incomplete document is the normal state, not a problem.
//
// The split from `check` is deliberate. `check` answers "is this legal" and its
// exit code has to mean one thing. This answers "how far along is this", and
// counts open slots rather than flagging them — an open slot is the roadmap.
import { basename } from 'node:path';
import { CATALOG_KEYS } from '../src/lib/schema.ts';
import { address, checkTeam } from './check.mjs';

// Every shelf an id can be resolved against, in the order the report reads them.
const KINDS = ['roles', ...CATALOG_KEYS];

const list = (x) => (Array.isArray(x) ? x : []);
const ids = (entries) => new Set(list(entries).map((e) => e?.id).filter((id) => typeof id === 'string'));

// Every activity, sub-activities included, with the YAML path that addresses it
// — a dangling id is only actionable if you can find the line that wrote it.
function walkActivities(doc) {
  const out = [];
  const walk = (a, path) => {
    if (!a || typeof a !== 'object') return;
    out.push({ activity: a, path });
    list(a.activities).forEach((c, i) => walk(c, `${path}.activities.${i}`));
  };
  list(doc?.activities).forEach((a, i) => walk(a, `activities.${i}`));
  return out;
}

export async function describeTeam(teamDir) {
  const { problems, team, docs, fileOf } = await checkTeam(teamDir);

  const catalog = Object.fromEntries(KINDS.map((k) => [k, ids(team?.[k])]));
  const seen = Object.fromEntries(KINDS.map((k) => [k, new Set()]));
  const dangling = [];

  // One pass records both halves of the reference: what a catalog entry is used
  // by, and what a use names that no catalog defines.
  const refer = (kind, id, file, path) => {
    if (typeof id !== 'string') return;
    seen[kind].add(id);
    if (!catalog[kind].has(id)) dangling.push({ kind, id, file, path });
  };

  // The tool shelf may be a file of its own, and a dangling harness id is only
  // actionable when the address names the file the line is actually in.
  list(team?.tools).forEach((t, i) => refer('harnesses', t?.harness, fileOf.tools, `tools.${i}.harness`));

  let activities = 0;
  let filled = 0;
  let open = 0;
  let unclaimed = 0;
  let stages = 0;

  for (const { file, data } of docs) {
    const stageIds = ids(data?.stages);
    stages += stageIds.size;

    for (const { activity: a, path } of walkActivities(data)) {
      activities += 1;
      list(a.roles).forEach((r, i) => refer('roles', r, file, `${path}.roles.${i}`));
      list(a.consumes).forEach((x, i) => refer('artifacts', x, file, `${path}.consumes.${i}`));
      list(a.produces).forEach((x, i) => refer('artifacts', x, file, `${path}.produces.${i}`));

      // A fill counts as filled whether or not it names a tool: the state is
      // declared by `tooling:`, and only the reference to the catalog depends on
      // there being a tool id to refer to.
      if (a.tooling) filled += 1;
      if (a.tooling?.tool) refer('tools', a.tooling.tool, file, `${path}.tooling.tool`);
      // Declared, not inferred, and counted rather than subtracted: the third
      // state is work the team does itself, and a state nobody counts is a state
      // the next one silently lands in.
      if (a.open) open += 1;
      if (!a.tooling && !a.open) unclaimed += 1;
      list(a.recommends).forEach((r, i) => {
        refer('tools', r?.tool, file, `${path}.recommends.${i}.tool`);
        if (r?.event) refer('events', r.event, file, `${path}.recommends.${i}.event`);
      });

      // A sub-activity inherits its parent's stage, so only the top level names one.
      if (typeof a.stage === 'string' && !path.includes('.activities.') && !stageIds.has(a.stage)) {
        dangling.push({ kind: 'stages', id: a.stage, file, path: `${path}.stage` });
      }
    }

    if (data?.constraint?.artifact) {
      refer('artifacts', data.constraint.artifact, file, 'constraint.artifact');
    }
  }

  const unused = Object.fromEntries(
    Object.entries(catalog).map(([kind, set]) => [kind, [...set].filter((id) => !seen[kind].has(id))])
  );

  return {
    id: basename(teamDir),
    name: typeof team?.name === 'string' ? team.name : null,
    version: team?.version ?? null,
    state: team?.status ?? 'living',
    processes: docs.map((d) => d.id),
    counts: {
      stages,
      activities,
      filled,
      open,
      unclaimed,
      ...Object.fromEntries(KINDS.map((k) => [k, catalog[k].size])),
    },
    unused,
    dangling,
    problems,
  };
}

const plural = (n, one) => `${n} ${one}${n === 1 ? '' : 's'}`;

function row(label, count, note) {
  const cells = `  ${label.padEnd(16)}${String(count).padStart(3)}`;
  return note ? `${cells}   ${note}` : cells;
}

export function reportStatus(s) {
  const out = [];
  const head = [s.name ?? '(unnamed)', s.version ? `v${s.version}` : null, String(s.state).toUpperCase()]
    .filter(Boolean)
    .join(' · ');
  out.push(`${s.id} — ${head}`, '');

  const c = s.counts;
  out.push(row('processes', s.processes.length, s.processes.join(' ')));
  out.push(row('stages', c.stages));
  // Counted, not flagged: the gap between blueprint and fill is the signal the
  // document exists to show, so this line must read as an inventory.
  out.push(
    row(
      'activities',
      c.activities,
      `${c.filled} filled · ${plural(c.open, 'open slot')} · ${c.unclaimed} unclaimed`
    )
  );

  for (const kind of KINDS) {
    const idle = s.unused[kind];
    out.push(row(kind, c[kind], idle.length ? `${idle.length} unreferenced: ${idle.join(' ')}` : ''));
  }

  if (s.dangling.length) {
    out.push('', '  ids referenced but not in a catalog');
    for (const d of s.dangling) {
      out.push(`    ${address(d.file)}  ${d.path}  →  ${d.id}`);
    }
  }

  if (s.problems.length) {
    out.push('', `  ${plural(s.problems.length, 'schema problem')} — run \`ai-sdlc check\` to read them`);
  }

  console.log(out.join('\n'));
}

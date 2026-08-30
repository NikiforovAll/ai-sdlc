import type { CollectionEntry } from 'astro:content';
import { DELEGATION_LEVELS } from './schema';
import type { Recommendation, SubActivity } from './schema';

export type TeamDoc = CollectionEntry<'teams'>['data'];
export type ProcessDoc = CollectionEntry<'processes'>['data'];
export type Tool = TeamDoc['tools'][number];
export type { Recommendation };

// The figures read one process at a time, against the team's shared catalogs.
// `Team` is that merged reading — the shape every figure component takes.
export type Team = TeamDoc & Pick<ProcessDoc, 'stages' | 'activities' | 'constraint'>;
export type Activity = ProcessDoc['activities'][number];
export type { SubActivity };
export type AnyActivity = Activity | SubActivity;

export interface Edge {
  from: string;
  to: string;
  artifact: string;
  handoff: boolean;
  constraint: boolean;
}

export interface Placed {
  activity: Activity;
  col: number;
  /** The lane the card is drawn in: the role the author names first. */
  lane: number;
  /** The remaining roles' lanes, where the activity is named again as an echo. */
  echoes: number[];
}

export interface Derived {
  edges: Edge[];
  placed: Placed[];
  cols: number;
}

// Every use of a tool — a fill or a recommendation — names it by id. Resolving
// through the catalog is what keeps the two from drifting apart: an id with no
// entry is a content error, not a blank line in a figure.
export function toolOf(team: Pick<TeamDoc, 'tools'>, id: string): Tool {
  const t = team.tools.find((x) => x.id === id);
  if (!t) throw new Error(`unknown tool "${id}" — no entry in the team's tools: catalog`);
  return t;
}

// A fill may name no tool, so "resolve the fill's tool if it has one" is the shape
// every reader of a fill actually wants. Written once for the same reason the
// three states are: the alternative is the guard repeated at eight sites, where
// one of them can quietly disagree about what a fill without a tool means.
export const fillTool = (team: Pick<TeamDoc, 'tools'>, a: AnyActivity): Tool | null =>
  a.tooling?.tool ? toolOf(team, a.tooling.tool) : null;

// The other three catalogs are read the same way, and unlike a tool a dangling id
// here is schema-legal: `status` reports it, the page prints the raw id, and the
// only symptom is a name that reads like a slug. That fallback is one decision, so
// it is written once rather than in each figure that happens to need a name.
export const nameOf = <T extends { id: string; name: string }>(catalog: T[], id: string) =>
  catalog.find((x) => x.id === id)?.name ?? id;

// The shelf, grouped the way both drawers and the tooling catalog read it: a
// harness is the runtime, and what it holds is everything pointing back at it.
export function toolsOfHarness(team: Pick<TeamDoc, 'tools'>, harness: string): Tool[] {
  return team.tools.filter((t) => t.harness === harness);
}

// A use of a tool, read back from the activity side: the drawer and the playbook
// both need "where is this reached for", which the catalog deliberately no longer says.
export interface ToolUse {
  activity: AnyActivity;
  rec?: Recommendation;
}

export function usesOfTool(team: Team, id: string): ToolUse[] {
  return flatten(team)
    .flatMap(({ activity }) => [
      ...(activity.tooling?.tool === id ? [{ activity }] : []),
      ...(activity.recommends ?? [])
        .filter((r) => r.tool === id)
        .map((rec) => ({ activity, rec })),
    ]);
}

// Tooling is a team catalog, but a process page should only show the entries the
// process actually reaches for — as a fill, or as a recommendation on one of its
// activities. The rest of the shelf stays on the team document.
export function view(team: TeamDoc, process: ProcessDoc): Team {
  const used = new Set<string>();
  // Roles are a team catalog too, and a role this process never names would be
  // drawn as a swimlane with nothing in it — a hatched band that says the role has
  // no part in the work, which is what the team document is for. Sub-activities
  // count: a role that only appears inside an inset still takes part.
  const staffed = new Set<string>();
  const walk = (a: AnyActivity) => {
    if (a.tooling?.tool) used.add(a.tooling.tool);
    for (const r of a.recommends ?? []) used.add(r.tool);
    for (const r of a.roles) staffed.add(r);
    for (const c of a.activities ?? []) walk(c);
  };
  for (const a of process.activities) walk(a);

  return {
    ...team,
    stages: process.stages,
    activities: process.activities,
    constraint: process.constraint,
    roles: team.roles.filter((r) => staffed.has(r.id)),
    tools: team.tools.filter((t) => used.has(t.id)),
  };
}

export function derive(team: Team): Derived {
  const byId = new Map(team.activities.map((a) => [a.id, a]));
  const producerOf = new Map<string, Activity>();
  for (const a of team.activities) for (const art of a.produces) producerOf.set(art, a);

  const edges: Edge[] = [];
  for (const b of team.activities) {
    for (const art of b.consumes) {
      const a = producerOf.get(art);
      if (!a) continue;
      const handoff = !a.roles.some((r) => b.roles.includes(r));
      edges.push({
        from: a.id,
        to: b.id,
        artifact: art,
        handoff,
        constraint: team.constraint?.artifact === art,
      });
    }
  }

  // Longest-path layering over the artifact DAG gives the ordinal x-position.
  const col = new Map<string, number>();
  const depth = (a: Activity, seen: Set<string>): number => {
    const hit = col.get(a.id);
    if (hit !== undefined) return hit;
    if (seen.has(a.id)) return 0; // cycle guard; the model promises a DAG
    seen.add(a.id);
    let d = 0;
    for (const e of edges) {
      if (e.to !== a.id) continue;
      const from = byId.get(e.from);
      if (from) d = Math.max(d, depth(from, seen) + 1);
    }
    col.set(a.id, d);
    return d;
  };
  for (const a of team.activities) depth(a, new Set());

  // The lane axis is nominal: lanes are roles in catalog order, and the midpoint
  // of two of them names a third role rather than a shared one. A two-role
  // activity used to be centred across `min..max`, which put more than a third of
  // a real figure's cards in the lane of a role that has nothing to do with them
  // — and read as wrong precisely because a swimlane's y-position is a claim about
  // who does the work. So the card takes one lane, the first role named, and each
  // further role is handed the activity's name in its own lane instead.
  const laneOf = new Map(team.roles.map((r, i) => [r.id, i]));
  const placed: Placed[] = team.activities.map((a) => {
    const lanes = [...new Set(a.roles.map((r) => laneOf.get(r)).filter((l) => l !== undefined))];
    return {
      activity: a,
      col: col.get(a.id) ?? 0,
      lane: lanes[0] ?? 0,
      echoes: lanes.slice(1).sort((x, y) => x - y),
    };
  });

  const cols = Math.max(...placed.map((p) => p.col)) + 1;

  // No stage spans: a stage's activities can sit at interleaved depths (incident's
  // `resolve` and `learn` both reach column 5), so a stage has no contiguous column
  // range to band. FLOW groups by column; GRID is where stage is a column.
  return { edges, placed, cols };
}

// Ordinal layering of a sub-process, over the children's own artifact edges.
export interface SubPlaced {
  activity: SubActivity;
  col: number;
}

export function deriveSub(children: SubActivity[]): { placed: SubPlaced[]; cols: number } {
  const producerOf = new Map<string, SubActivity>();
  for (const a of children) for (const art of a.produces) producerOf.set(art, a);
  const col = new Map<string, number>();
  const depth = (a: SubActivity, seen: Set<string>): number => {
    const hit = col.get(a.id);
    if (hit !== undefined) return hit;
    if (seen.has(a.id)) return 0;
    seen.add(a.id);
    let d = 0;
    for (const art of a.consumes ?? []) {
      const p = producerOf.get(art);
      if (p && p.id !== a.id) d = Math.max(d, depth(p, seen) + 1);
    }
    col.set(a.id, d);
    return d;
  };
  for (const a of children) depth(a, new Set());
  const placed = children.map((a) => ({ activity: a, col: col.get(a.id) ?? 0 }));
  return { placed, cols: Math.max(...placed.map((p) => p.col)) + 1 };
}

export interface FlatActivity {
  activity: AnyActivity;
  stage: string;
  parent?: AnyActivity;
  depth: number;
}

export function flatten(team: Team): FlatActivity[] {
  const out: FlatActivity[] = [];
  const walk = (a: AnyActivity, stage: string, parent: AnyActivity | undefined, depth: number) => {
    out.push({ activity: a, stage, parent, depth });
    for (const c of a.activities ?? []) walk(c, stage, a, depth + 1);
  };
  for (const a of team.activities) walk(a, a.stage, undefined, 0);
  return out;
}

/* An activity is in one of three states: filled (`tooling:`), open (`open:`), or
   neither — work the team does itself and has said nothing about. Every figure
   and both drawers ask the same question of it: is there anything to report at
   all? The answer is one predicate here rather than a bare `||` at each site,
   because six sites can disagree silently and a fourth state would be a six-file
   edit. Callers still branch on `tooling` / `open` directly to draw the state,
   which is what narrows the type. */
export const statesCapability = (a: AnyActivity) => Boolean(a.tooling || a.open);

/* A ref is authored as either a URL or a path inside the team's own repo, and the
   document has no way to resolve the second: a bare `skills/grill-me` linked from
   `/feature` asks the site for `/feature/skills/grill-me`, which no page serves.
   So only a ref that already addresses somewhere becomes a door; a path is drawn
   as the text it is, which is the form a reader can act on anyway. */
export const isLinkableRef = (ref: string) => /^(https?:\/\/|mailto:|\/\/)/.test(ref);

// The levels are an ordinal ramp, not a set: a figure can draw the level as a
// position on the scale rather than spend a text row on its name. The schema's
// own list is that ramp already, in order, so a new rung is one edit there and
// every figure grows on its own.
export const LEVEL_ORDER: readonly string[] = DELEGATION_LEVELS;

// Where an activity's fill sits on the ramp; an open slot sits at the foot.
// Both flow figures draw the same 2px track from this, so the mapping lives
// here rather than once per template.
export const levelIndex = (a: AnyActivity) =>
  a.tooling ? LEVEL_ORDER.indexOf(a.tooling.level) : 0;

export const LEVEL_LABELS: Record<string, string> = {
  manual: 'MANUAL',
  assisted: 'ASSISTED',
  'delegated-review': 'DELEGATED + REVIEW',
  'gated-autonomous': 'GATED AUTO',
  autonomous: 'AUTONOMOUS',
};

/* The ladder measures delegation, not maturity, so the reader needs the loop
   position to read a level correctly — a figure can show where a fill sits on
   the scale but not what standing there means. Wording follows the steps table
   in docs/ontology/03-capability-fills.md. */
export const LEVEL_NOTES: Record<string, { loop: string; note: string }> = {
  manual: {
    loop: 'NO LOOP',
    note: 'The human does the work; no capability is involved.',
  },
  assisted: {
    loop: 'HUMAN IN THE LOOP',
    note: 'The human does the work and steers throughout; the tool drafts and accelerates inside that loop.',
  },
  'delegated-review': {
    loop: 'HUMAN ON THE LOOP',
    note: 'The tool does the work and hands it back; the human reviews the result.',
  },
  'gated-autonomous': {
    loop: 'HUMAN AT THE GATE',
    note: 'The tool does the work and proceeds unless stopped; the human holds the gate.',
  },
  autonomous: {
    loop: 'NO HUMAN',
    note: 'The tool does the work and nothing holds a gate; the human learns about it afterwards.',
  },
};

import type { CollectionEntry } from 'astro:content';
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
  laneStart: number;
  laneEnd: number;
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
  const walk = (a: AnyActivity) => {
    if (a.tooling) used.add(a.tooling.tool);
    for (const r of a.recommends ?? []) used.add(r.tool);
    for (const c of a.activities ?? []) walk(c);
  };
  for (const a of process.activities) walk(a);

  return {
    ...team,
    stages: process.stages,
    activities: process.activities,
    constraint: process.constraint,
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

  const laneOf = new Map(team.roles.map((r, i) => [r.id, i]));
  const placed: Placed[] = team.activities.map((a) => {
    const lanes = a.roles.map((r) => laneOf.get(r) ?? 0);
    return {
      activity: a,
      col: col.get(a.id) ?? 0,
      laneStart: Math.min(...lanes),
      laneEnd: Math.max(...lanes),
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

// The levels are an ordinal ramp, not a set: a figure can draw the level as a
// position on the scale rather than spend a text row on its name.
export const LEVEL_ORDER = ['manual', 'assisted', 'delegated-review', 'gated-autonomous'];

export const LEVEL_LABELS: Record<string, string> = {
  manual: 'MANUAL',
  assisted: 'ASSISTED',
  'delegated-review': 'DELEGATED + REVIEW',
  'gated-autonomous': 'GATED AUTO',
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
};

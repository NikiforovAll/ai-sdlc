import type { CollectionEntry } from 'astro:content';
import type { SubActivity } from '../content.config';

export type TeamDoc = CollectionEntry<'teams'>['data'];
export type ProcessDoc = CollectionEntry<'processes'>['data'];

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
  stageSpans: { stage: string; name: string; from: number; to: number }[];
  handoffCount: number;
  openSlots: number;
}

// Skills are a team catalog, but a process page should only show the plays that
// touch it: an unbound skill (no activity named) applies anywhere.
export function view(team: TeamDoc, process: ProcessDoc): Team {
  const ids = new Set<string>();
  const walk = (a: AnyActivity) => {
    ids.add(a.id);
    for (const c of a.activities ?? []) walk(c);
  };
  for (const a of process.activities) walk(a);

  return {
    ...team,
    stages: process.stages,
    activities: process.activities,
    constraint: process.constraint,
    skills: team.skills.filter(
      (s) => !s.when.length || s.when.some((w) => !w.activity || ids.has(w.activity))
    ),
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

  const stageIndex = new Map(team.stages.map((s, i) => [s.id, i]));
  const stageSpans = team.stages
    .map((s) => {
      const own = placed.filter((p) => p.activity.stage === s.id);
      if (!own.length) return null;
      return {
        stage: s.id,
        name: s.name,
        from: Math.min(...own.map((p) => p.col)),
        to: Math.max(...own.map((p) => p.col)),
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null)
    .sort((a, b) => (stageIndex.get(a.stage) ?? 0) - (stageIndex.get(b.stage) ?? 0));

  return {
    edges,
    placed,
    cols,
    stageSpans,
    handoffCount: edges.filter((e) => e.handoff).length,
    openSlots: countOpenSlots(team.activities),
  };
}

// An open slot at any depth is still a gap in the roadmap, so the count recurses.
export function countOpenSlots(activities: AnyActivity[]): number {
  let n = 0;
  for (const a of activities) {
    if (!a.tooling) n++;
    n += countOpenSlots(a.activities ?? []);
  }
  return n;
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

export const LEVEL_LABELS: Record<string, string> = {
  manual: 'MANUAL',
  assisted: 'ASSISTED',
  'delegated-review': 'DELEGATED + REVIEW',
  'gated-autonomous': 'GATED AUTO',
};

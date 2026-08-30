// The derivation the two documents used to do in page frontmatter. It lives here
// so `/`, `/[process]`, and `/export` all read the same computation — an export
// that recomputed its own model could drift from the served one.
import { getCollection } from 'astro:content';
import { toolOf, view } from './derive';
import type { AnyActivity, ProcessDoc as ProcessData, Team, TeamDoc } from './derive';
import type { Fill } from './schema';

// A use is where a catalog entry is actually reached for: which process, and the
// entity inside it that answers "where?". `focus` is a drawer key the process
// document resolves — so a relationship that exists becomes a door, and a
// relationship that does not stays plain text.
export interface Use {
  slug: string;
  label: string;
  focus?: string;
}

// The href carries the multi-page route; `data-goto` / `data-focus` carry the same
// intent for the single-file export, where there is no route to point at and the
// script answers the click instead. One rule, so the document and the drawer that
// sits over it cannot answer the same link differently.
export const useHref = (u: Use, inline = false) =>
  inline ? '#' : `${docPath(u.slug)}${u.focus ? `#${u.focus}` : ''}`;

// Routes are flat, but the site is not always served from the root of a host —
// GitHub Pages puts a project site under `/<repo>/`. Every internal link goes
// through here so the deployed demo and `npm run dev` differ only in the prefix
// Astro was configured with; `BASE_URL` is `/` unless `AISDLC_BASE` says otherwise.
export const docPath = (slug = '') => {
  const base = import.meta.env.BASE_URL || '/';
  return (base.endsWith('/') ? base : `${base}/`) + slug;
};

// A use answers "which processes", which is all a table cell has room for. The
// team document's drawer has a panel, and the question a reader opens it with is
// the next one down: which activity, owned by whom, at what degree of
// delegation. A reach is that answer — one row per place the entry is actually
// reached for, across every process, with the activity as the door.
export interface Reach {
  slug: string;
  process: string;
  activity: string;
  actId: string;
  /** Sub-activities live inside their parent's stage, so they name none of their own. */
  stage?: string;
  roles: string[];
  kind: 'fill' | 'recommended' | 'produces' | 'consumes' | 'owns' | 'open';
  level?: Fill['level'];
  /** Only an `owns` row states it: the activity is a declared gap, so it has no level to name. */
  open?: boolean;
  /** The sentence the team wrote about what would fill the gap. Kept apart from
      `usage`, which says how a tool is used — one field with both meanings would
      read the same and mean opposite things. */
  need?: string;
  event?: string;
  usage?: string;
}

/** How a reach reads in a sentence. House wording, not authored content, so it
    has no home in the YAML — but it is stated on three surfaces (the team
    drawer's rows, the activity drawer's "reached for", the playbook item), and
    a rename that reaches two of the three makes them disagree about what a fill
    does. It sits beside `Reach`, whose `kind` union it answers. */
export const VERB: Record<Reach['kind'], string> = {
  fill: 'fills the slot in',
  recommended: 'recommended in',
  produces: 'produced by',
  consumes: 'consumed by',
  owns: 'owned in',
  open: 'declared in',
};

export interface ProcStat {
  slug: string;
  data: ProcessData;
  activities: number;
  open: number;
}

export interface OverviewModel {
  teamId: string;
  team: TeamDoc;
  procs: ProcStat[];
  /** `key` is the drawer panel the figure opens. A stat that has one is a number
      the team is meant to act on, which is also why it is the one drawn in the
      signal colour — two fields for that would let the door and the colour disagree. */
  stats: { n: number; label: string; key?: string }[];
  artifactUse: Map<string, Use[]>;
  harnessUse: Map<string, Use[]>;
  roleUse: Map<string, Use[]>;
  roleActs: Map<string, number>;
  toolUse: Map<string, Use[]>;
  eventUse: Map<string, Use[]>;
  toolReach: Map<string, Reach[]>;
  artifactReach: Map<string, Reach[]>;
  roleReach: Map<string, Reach[]>;
  /** Flat, not keyed: the open slots are one list the whole team reads, and the
      count in the masthead is the door to it. The per-process reading is the same
      rows keyed the way every other panel receives them. */
  openReach: Reach[];
  openByProc: Map<string, Reach[]>;
}

export interface ProcessModel {
  slug: string;
  teamId: string;
  team: TeamDoc;
  process: ProcessData;
  doc: Team;
  file: string;
  siblings: { slug: string; name: string }[];
}

const flatOf = (acts: AnyActivity[], depth = 0): { a: AnyActivity; depth: number }[] =>
  acts.flatMap((a) => [{ a, depth }, ...flatOf(a.activities ?? [], depth + 1)]);

const pushUse = (m: Map<string, Use[]>, key: string, use: Use) => {
  const list = m.get(key);
  if (!list) {
    m.set(key, [use]);
    return;
  }
  if (!list.some((u) => u.label === use.label)) list.push(use);
};

// One team folder renders per run, so the collection holds exactly one entry.
async function loadTeam() {
  const teams = await getCollection('teams');
  if (teams.length === 0) throw new Error('No team found. The team folder needs a team.yaml.');
  return teams[0];
}

async function loadProcesses() {
  const all = await getCollection('processes');
  if (all.length === 0) throw new Error('No processes found. The team folder needs processes/*.yaml.');
  return [...all].sort((a, b) => a.id.localeCompare(b.id));
}

export async function overviewModel(): Promise<OverviewModel> {
  const teamEntry = await loadTeam();
  const team = teamEntry.data;
  const entries = await loadProcesses();
  // One walk per process answers every question below: the counts, the artifact
  // doors, and the tool and event uses. An open slot at any depth still counts.
  const flats = new Map(entries.map((p) => [p.id, flatOf(p.data.activities)]));
  const procs: ProcStat[] = entries.map((p) => {
    const flat = flats.get(p.id)!;
    return {
      slug: p.id,
      data: p.data,
      activities: flat.length,
      // Declared slots only. An activity with no `tooling:` and no `open:` is
      // work the team does itself and has not asked for anything on — counting it
      // as a gap made the roadmap number a headcount of everything unautomated.
      open: flat.filter((e) => e.a.open).length,
    };
  });

  // Which processes touch each artifact, harness, and event — the catalogs are
  // shared, so "used by nothing" is a fact worth showing.
  const artifactUse = new Map<string, Use[]>();
  const harnessUse = new Map<string, Use[]>();
  const roleUse = new Map<string, Use[]>();
  // A team with one process makes the "used in" column read the same word on every
  // row, so the count is what actually distinguishes the roles.
  const roleActs = new Map<string, number>();
  const toolUse = new Map<string, Use[]>();
  // Which tool answers each moment. Read from the activities, because a
  // recommendation is the only place an event is ever named.
  const eventUse = new Map<string, Use[]>();
  // The same walk answers the drawer's deeper question — every activity that
  // reaches for a tool, every hand-off of an artifact — so it is one pass, not a
  // second one per panel.
  const toolReach = new Map<string, Reach[]>();
  const artifactReach = new Map<string, Reach[]>();
  // The team drawer answers a role the way the process drawer does — the work it
  // owns, one line each — because "which processes" is the summary, not the answer.
  const roleReach = new Map<string, Reach[]>();
  const openReach: Reach[] = [];
  const openByProc = new Map<string, Reach[]>();
  // Unlike `pushUse`, every row is kept: two activities reaching for the same
  // tool is the answer, not a duplicate.
  const pushReach = (m: Map<string, Reach[]>, key: string, r: Reach) => {
    const list = m.get(key);
    if (list) list.push(r);
    else m.set(key, [r]);
  };
  const roleNames = new Map(team.roles.map((r) => [r.id, r.name]));

  for (const p of procs) {
    const flat = flats.get(p.slug)!;
    const stageNames = new Map(p.data.stages.map((s) => [s.id, s.name]));

    // An artifact has no panel of its own, so its door is the activity that makes it.
    // A top-level one is preferred: a sub-activity's node sits inside a collapsed inset.
    const doorFor = (art: string) => {
      const by = (f: (e: { a: AnyActivity; depth: number }) => boolean) => flat.find(f)?.a.id;
      return (
        by((e) => e.depth === 0 && e.a.produces.includes(art)) ??
        by((e) => e.a.produces.includes(art)) ??
        by((e) => e.depth === 0 && (e.a.consumes ?? []).includes(art)) ??
        by((e) => (e.a.consumes ?? []).includes(art))
      );
    };
    const touched = new Set(flat.flatMap((e) => [...(e.a.consumes ?? []), ...e.a.produces]));
    for (const art of touched) {
      pushUse(artifactUse, art, { slug: p.slug, label: p.data.name, focus: `act-${doorFor(art)}` });
    }

    for (const { a } of flat) {
      // A role's door is any activity it owns: the process opens with that node
      // selected, which is where "where does this role actually work" is answered.
      for (const r of a.roles) {
        pushUse(roleUse, r, { slug: p.slug, label: p.data.name, focus: `act-${a.id}` });
        roleActs.set(r, (roleActs.get(r) ?? 0) + 1);
      }
      for (const id of [a.tooling?.tool, ...(a.recommends ?? []).map((r) => r.tool)]) {
        if (!id) continue;
        const { harness } = toolOf(team, id);
        pushUse(harnessUse, harness, { slug: p.slug, label: p.data.name, focus: `tool-${id}` });
        pushUse(toolUse, id, { slug: p.slug, label: p.data.name, focus: `tool-${id}` });
      }
      for (const r of a.recommends ?? []) {
        if (!r.event) continue;
        pushUse(eventUse, r.event, { slug: p.slug, label: toolOf(team, r.tool).name, focus: `tool-${r.tool}` });
      }

      const at: Omit<Reach, 'kind'> = {
        slug: p.slug,
        process: p.data.name,
        activity: a.name,
        actId: a.id,
        stage: 'stage' in a ? stageNames.get(a.stage) : undefined,
        roles: a.roles.map((r) => roleNames.get(r) ?? r),
      };
      for (const r of a.roles) {
        pushReach(roleReach, r, { ...at, kind: 'owns', level: a.tooling?.level, open: Boolean(a.open) });
      }
      if (a.open) {
        const row: Reach = { ...at, kind: 'open', need: a.open.need };
        openReach.push(row);
        pushReach(openByProc, p.slug, row);
      }
      // A fill with no tool has no catalog entry to be listed under, so it
      // reaches nothing here. The activity still states its level; the shelf is
      // simply not where that fact is read.
      if (a.tooling?.tool) {
        pushReach(toolReach, a.tooling.tool, { ...at, kind: 'fill', level: a.tooling.level, usage: a.tooling.usage });
      }
      for (const r of a.recommends ?? []) {
        pushReach(toolReach, r.tool, { ...at, kind: 'recommended', level: r.level, event: r.event, usage: r.usage });
      }
      for (const art of a.produces) pushReach(artifactReach, art, { ...at, kind: 'produces' });
      for (const art of a.consumes ?? []) pushReach(artifactReach, art, { ...at, kind: 'consumes' });
    }
  }
  for (const s of team.tools) {
    harnessUse.set(s.harness, harnessUse.get(s.harness) ?? []);
  }

  const totalActivities = procs.reduce((n, p) => n + p.activities, 0);
  const totalOpen = procs.reduce((n, p) => n + p.open, 0);

  return {
    teamId: teamEntry.id,
    team,
    procs,
    artifactUse,
    harnessUse,
    roleUse,
    roleActs,
    toolUse,
    eventUse,
    toolReach,
    artifactReach,
    roleReach,
    openReach,
    openByProc,
    stats: [
      { n: procs.length, label: 'Processes' },
      { n: team.roles.length, label: 'Roles' },
      { n: totalActivities, label: 'Activities · all' },
      { n: team.artifacts.length, label: 'Artifacts' },
      { n: team.harnesses.length, label: 'Harnesses' },
      { n: team.tools.length, label: 'Tools' },
      { n: team.events.length, label: 'Events' },
      { n: totalOpen, label: 'Open slots', key: '__open' },
    ],
  };
}

export async function processModels(): Promise<ProcessModel[]> {
  const teamEntry = await loadTeam();
  const entries = await loadProcesses();
  const siblings = entries.map((p) => ({ slug: p.id, name: p.data.name }));
  return entries.map((p) => ({
    slug: p.id,
    teamId: teamEntry.id,
    team: teamEntry.data,
    process: p.data,
    doc: view(teamEntry.data, p.data),
    file: `${teamEntry.id}/processes/${p.id}.yaml`,
    siblings,
  }));
}

// Role dimming is a stylesheet, not a class toggle: one rule per role, written
// once from the team's roles and shared by every process document on the page.
export function roleDimCss(roles: { id: string }[]): string {
  return roles
    .map(
      (r) =>
        `main[data-role="${r.id}"] [data-roles]:not([data-roles~="${r.id}"]){opacity:.22;}` +
        `main[data-role="${r.id}"] button[data-roles]:not([data-roles~="${r.id}"]){pointer-events:none;}` +
        // Playbook is a per-role reading surface: non-matching roles collapse to a ghost pane instead of dimming.
        `main[data-role="${r.id}"] .pb__role:not([data-roles~="${r.id}"]) > :not(.pb__ghost){display:none;}` +
        `main[data-role="${r.id}"] .pb__role:not([data-roles~="${r.id}"]) .pb__ghost{display:flex;}` +
        `main[data-role="${r.id}"] .pb__role:not([data-roles~="${r.id}"]){opacity:1;}`
    )
    .join('\n');
}

// The zod contract every YAML file is validated against. It imports `astro/zod`
// rather than `astro:content` so `check` can run it from plain Node without
// booting Astro — `content.config.ts` wraps these in collections, nothing more.
import { z } from 'astro/zod';

const id = z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'ids are kebab-case');

// One field with one meaning wherever it appears: where the thing lives, in
// whatever form "lives" takes for it. Declared once so the day it gains a
// constraint it gains it on every shelf at the same time.
// A ref is the address alone, or the address under a name the reader already
// knows it by. Two Confluence pages differ only in an opaque `/x/AbCd`, so an
// address is the worst name a door can have when the author has a better one.
const ref = z.union([z.string(), z.object({ name: z.string(), url: z.string() })]);
export type Ref = z.infer<typeof ref>;
const refs = z.array(ref).optional();

// The two catalog-entry shapes. Artifacts and events are named and described;
// roles and harnesses add the one-line caption a figure prints beside them.
// Written once because four shelves being the same shape is the point, not a
// coincidence four inline literals would let drift.
const entry = z.object({ id, name: z.string(), description: z.string().optional(), refs });
const captioned = entry.extend({ note: z.string().optional() });

export const DELEGATION_LEVELS = ['manual', 'assisted', 'delegated-review', 'gated-autonomous', 'autonomous'] as const;

// A fill names a catalog tool by id — the catalog owns the name and the harness,
// so a use can never drift from the entry it names.
const fill = z.object({
  tool: id,
  level: z.enum(DELEGATION_LEVELS),
  usage: z.string().optional(),
  asset: z.string().optional(),
  refs,
});

// A recommendation has no identity: it is a pointer from one activity to one
// tool, optionally bound to the moment that calls for it. It never fills the
// slot — an activity with ten recommendations and an `open:` block is still open.
const recommendation = z.object({
  tool: id,
  level: z.enum(DELEGATION_LEVELS).optional(),
  event: id.optional(),
  usage: z.string().optional(),
});

// An open slot is declared, never inferred. Absence of `tooling:` used to mean
// "open", which flattened two different facts into one dashed box: work a team
// has decided to hand to a tool and has not yet, versus work they do themselves
// and have no intention of changing. Only the first is a roadmap item, and the
// difference is a sentence only the team can write — so `need:` is required. A
// slot with nothing to say about what it wants is not a slot, it is a blank.
const openSlot = z.object({
  need: z.string(),
});

export type Fill = z.infer<typeof fill>;
export type Recommendation = z.infer<typeof recommendation>;
export type OpenSlot = z.infer<typeof openSlot>;

// The two are mutually exclusive by definition: a slot is open until something
// fills it. Stating both is an authoring mistake worth failing on rather than
// resolving by precedence, which would silently drop whichever lost.
const oneOrTheOther = <T extends { tooling?: unknown; open?: unknown }>(a: T, ctx: z.RefinementCtx) => {
  if (a.tooling && a.open) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['open'],
      message: 'an activity is either filled (`tooling:`) or open (`open:`) — not both',
    });
  }
};

export interface SubActivity {
  id: string;
  name: string;
  roles: string[];
  consumes?: string[];
  produces: string[];
  why?: string;
  tooling?: Fill;
  open?: OpenSlot;
  recommends?: Recommendation[];
  refs?: Ref[];
  activities?: SubActivity[];
}

// Sub-processes recurse: an activity may contain its own activities, using the
// team's roles and artifacts and living inside the parent's stage.
const subActivity: z.ZodType<SubActivity> = z.lazy(() =>
  z.object({
    id,
    name: z.string(),
    roles: z.array(id).min(1),
    consumes: z.array(id).optional(),
    produces: z.array(id).min(1),
    why: z.string().optional(),
    tooling: fill.optional(),
    open: openSlot.optional(),
    recommends: z.array(recommendation).optional(),
    refs,
    activities: z.array(subActivity).optional(),
  }).superRefine(oneOrTheOther)
);

const activity = z
  .object({
    id,
    name: z.string(),
    stage: id,
    roles: z.array(id).min(1),
    consumes: z.array(id).default([]),
    produces: z.array(id).min(1),
    why: z.string().optional(),
    tooling: fill.optional(),
    open: openSlot.optional(),
    recommends: z.array(recommendation).optional(),
    // The step's own reading list. A tool's `refs` are where that tool lives and
    // a fill's are how it is used here; these are the pages the person doing the
    // step reads to do it — a template, a standard, the section of the process
    // page that governs it. They belong to the step, not to whatever tool the
    // step happens to have, so an unclaimed activity can carry them too.
    refs,
    activities: z.array(subActivity).optional(),
  })
  .superRefine(oneOrTheOther);

// One entry of the Tooling catalog: a named tool and the harness it runs in.
// It states no roles and no activities — the activities that name it supply
// that context, so the catalog stays a shelf and never a second flow model.
// `note` is the advice that holds wherever the tool is used; advice that is
// true only in one activity belongs to that activity's recommendation. No level
// either — the same tool is legitimately assisted in one activity and delegated
// in another, and a level on the shelf would forbid exactly that.
const tool = z.object({
  id,
  name: z.string(),
  harness: id,
  kind: z.string(),
  note: z.string().optional(),
  // Same split as the roles below: `note` is the line a figure prints beside the
  // tool, `description` is what a reader stops on the shelf to learn. A tool is
  // the entry most likely to be unfamiliar to the reader, so it needs the long
  // form more than the artifact it acts on does.
  description: z.string().optional(),
  refs,
});

// The same `note` / `description` split the catalogs use, applied to the two
// documents themselves. `note` is the caption — the line the process index
// prints and the one the page hands to `<meta>`. `description` is markdown the
// drawer renders, which is where a document finally has room to say what it
// assumes and how it wants to be read.
// A document's `refs` are the sources it was read out of, not a tool's install
// page: the same field as the catalog carries, one level up, so a reader who
// wants the original can leave from the document panel instead of guessing which
// tool happens to link the root.
// The catalogs a document keeps in a file of their own, one shelf per file,
// beside `team.yaml`. Roles are not among them: they are the lanes of every
// figure and the axis the document is read along, so they stay with the
// identity they belong to. `src/lib/load.ts` owns the merge; this is the list
// it merges, and the same list is still legal inline for a small document.
export const CATALOG_KEYS = ['artifacts', 'harnesses', 'events', 'tools'] as const;

export const teamSchema = z.object({
  name: z.string(),
  note: z.string().optional(),
  description: z.string().optional(),
  refs,
  version: z.string(),
  status: z.enum(['living', 'draft']).default('living'),
  // `note` is the one line a figure can afford to print beside the thing;
  // `description` is markdown the drawer renders when a reader stops on it. Two
  // fields rather than one because the figure has no room for the long form and
  // the drawer has no use for a caption truncated to fit a lane.
  // Every catalog entry takes the same optional `refs:` — where the thing lives,
  // in whatever form "lives" takes for it: a role's charter, a harness's console,
  // the dashboard where an event is actually seen. One field with one meaning
  // across five shelves, so a reader learns it once.
  roles: z.array(captioned).min(1),
  // An artifact's `refs` are where the thing itself lives — the published board,
  // the space it is written in, the template it is written from. A reader who
  // stops on an artifact to ask what it is usually wants to go and look at one.
  artifacts: z.array(entry).min(1),
  harnesses: z.array(captioned).default([]),
  events: z.array(entry).default([]),
  tools: z.array(tool).default([]),
});

export const processSchema = z.object({
  name: z.string(),
  note: z.string().optional(),
  description: z.string().optional(),
  refs,
  stages: z.array(z.object({ id, name: z.string() })).min(1),
  activities: z.array(activity).min(1),
  constraint: z.object({ artifact: id, note: z.string() }).optional(),
});

export type TeamData = z.infer<typeof teamSchema>;
export type ProcessData = z.infer<typeof processSchema>;

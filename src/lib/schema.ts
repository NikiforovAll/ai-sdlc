// The zod contract every YAML file is validated against. It imports `astro/zod`
// rather than `astro:content` so `check` can run it from plain Node without
// booting Astro — `content.config.ts` wraps these in collections, nothing more.
import { z } from 'astro/zod';
import { ID_PATTERN } from './anchor.ts';

// Exported alongside the whole-file schemas below because `bin/gen-schemas.mjs`
// hoists the shared shapes into named `$defs`. A generated schema that says
// `#/$defs/id` reads as the one id rule this file states once; without the
// export the converter dedupes by pointing at whichever field happened to
// mention an id first, which re-points every time a field is reordered.
export const id = z
  .string()
  .regex(new RegExp(`^${ID_PATTERN}$`), 'ids are kebab-case')
  .describe('A kebab-case identifier, unique within its catalog.');

// One field with one meaning wherever it appears: where the thing lives, in
// whatever form "lives" takes for it. Declared once so the day it gains a
// constraint it gains it on every shelf at the same time.
// A ref is the address alone, or the address under a name the reader already
// knows it by. Two Confluence pages differ only in an opaque `/x/AbCd`, so an
// address is the worst name a door can have when the author has a better one.
export const ref = z
  .union([z.string(), z.object({ name: z.string(), url: z.string() })])
  .describe('Where the thing lives: a bare URL, or `{ name, url }` when the author has a better name for it than its address.');
export type Ref = z.infer<typeof ref>;
const refs = z.array(ref).optional().describe('Links to where this lives — one meaning wherever the field appears.');

// The two catalog-entry shapes. Artifacts and events are named and described;
// roles and harnesses add the one-line caption a figure prints beside them.
// Written once because four shelves being the same shape is the point, not a
// coincidence four inline literals would let drift.
export const entry = z.object({
  id,
  name: z.string().describe('The label a figure prints for this entry.'),
  description: z.string().optional().describe('Markdown the drawer renders when a reader stops on this entry.'),
  refs,
});
export const captioned = entry.extend({
  note: z.string().optional().describe('The one line a figure can afford to print beside this entry.'),
});

export const DELEGATION_LEVELS = ['manual', 'assisted', 'delegated-review', 'gated-autonomous', 'autonomous'] as const;

// A fill names a catalog tool by id — the catalog owns the name and the harness,
// so a use can never drift from the entry it names.
//
// The tool is optional because a level is a fact about where the human stands,
// and that fact can be true with no single tool under it: a step a person drives
// with three things open is delegated whichever one they reached for last.
// Naming one of them to get the level said would be the worse lie. The level
// stays required — a fill with neither a tool nor a level says nothing at all.
export const fill = z
  .object({
    tool: id
      .optional()
      .describe('The id of a tool in the Tooling catalog. Optional: a step driven with three things open is still delegated.'),
    level: z
      .enum(DELEGATION_LEVELS)
      .describe(
        'Where the human stands: `manual` (person does it), `assisted` (tool helps, person drives), `delegated-review` (tool does it, person reviews), `gated-autonomous` (tool does it, a gate stops it), `autonomous` (tool does it unattended).'
      ),
    usage: z.string().optional().describe('How the tool is used *here* — advice true of this activity, not of the tool everywhere.'),
    asset: z.string().optional().describe('The concrete thing this use is configured by — a prompt, a config file, a template.'),
    refs,
  })
  .describe('The activity is filled: something does this work today, at a stated delegation level.');

// A recommendation has no identity: it is a pointer from one activity to one
// tool, optionally bound to the moment that calls for it. It never fills the
// slot — an activity with ten recommendations and an `open:` block is still open.
export const recommendation = z
  .object({
    tool: id.describe('The id of the tool being recommended.'),
    level: z.enum(DELEGATION_LEVELS).optional().describe('The level this tool would reach here, if adopted.'),
    event: id.optional().describe('The id of an event that is the moment to reach for this.'),
    usage: z.string().optional().describe('How this tool would be used here.'),
  })
  .describe('A pointer from this activity to a tool it could use. Never fills the slot — an activity with ten of these is still open.');

// An open slot is declared, never inferred. Absence of `tooling:` used to mean
// "open", which flattened two different facts into one dashed box: work a team
// has decided to hand to a tool and has not yet, versus work they do themselves
// and have no intention of changing. Only the first is a roadmap item, and the
// difference is a sentence only the team can write — so `need:` is required. A
// slot with nothing to say about what it wants is not a slot, it is a blank.
export const openSlot = z
  .object({
    need: z.string().describe('What this slot wants — the sentence only the team can write. Required: a slot with nothing to say is a blank, not a slot.'),
  })
  .describe('The activity is open: work the team has decided to hand to a tool and has not yet. A roadmap item, drawn as a dashed box.');

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
export const subActivity: z.ZodType<SubActivity> = z.lazy(() =>
  z.object({
    id,
    name: z.string().describe('What the step is called.'),
    roles: z.array(id).min(1).describe('Ids of the roles who do this step. At least one.'),
    consumes: z.array(id).optional().describe('Ids of the artifacts this step reads. Half of an arrow — the other half is a `produces` somewhere else.'),
    produces: z.array(id).min(1).describe('Ids of the artifacts this step leaves behind. At least one; this is what arrows are derived from.'),
    why: z.string().optional().describe('Why the step exists — the reason a reader would otherwise have to ask for.'),
    tooling: fill.optional(),
    open: openSlot.optional(),
    recommends: z.array(recommendation).optional().describe('Tools this step could use. Does not fill it.'),
    refs,
    activities: z.array(subActivity).optional().describe('A sub-process: steps inside this step, using the same roles and artifacts.'),
  }).superRefine(oneOrTheOther)
);

export const activity = z
  .object({
    id,
    name: z.string().describe('What the step is called.'),
    stage: id.describe('The id of the stage this step is labelled with. A map, never a gate.'),
    roles: z.array(id).min(1).describe('Ids of the roles who do this step. At least one — roles are the lanes every figure is drawn along.'),
    consumes: z.array(id).default([]).describe('Ids of the artifacts this step reads. Half of an arrow — the other half is a `produces` somewhere else.'),
    produces: z.array(id).min(1).describe('Ids of the artifacts this step leaves behind. At least one; this is what arrows are derived from.'),
    why: z.string().optional().describe('Why the step exists — the reason a reader would otherwise have to ask for.'),
    tooling: fill.optional(),
    open: openSlot.optional(),
    recommends: z.array(recommendation).optional().describe('Tools this step could use. Does not fill it.'),
    // The step's own reading list. A tool's `refs` are where that tool lives and
    // a fill's are how it is used here; these are the pages the person doing the
    // step reads to do it — a template, a standard, the section of the process
    // page that governs it. They belong to the step, not to whatever tool the
    // step happens to have, so an unclaimed activity can carry them too.
    refs,
    activities: z.array(subActivity).optional().describe('A sub-process: steps inside this step, living in the parent stage.'),
  })
  .superRefine(oneOrTheOther);

// One entry of the Tooling catalog: a named tool and the harness it runs in.
// It states no roles and no activities — the activities that name it supply
// that context, so the catalog stays a shelf and never a second flow model.
// `note` is the advice that holds wherever the tool is used; advice that is
// true only in one activity belongs to that activity's recommendation. No level
// either — the same tool is legitimately assisted in one activity and delegated
// in another, and a level on the shelf would forbid exactly that.
export const tool = z.object({
  id,
  name: z.string().describe('What the tool is called.'),
  harness: id.describe('The id of the harness this tool runs in.'),
  kind: z.string().describe('What sort of thing it is — a skill, a command, an agent, a check.'),
  note: z.string().optional().describe('Advice that holds wherever this tool is used. Advice true in only one activity belongs on that recommendation instead.'),
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
  name: z.string().describe('The team this document describes.'),
  note: z.string().optional().describe('The one line the masthead prints and the page hands to `<meta>`.'),
  description: z.string().optional().describe('Markdown the drawer renders: what this document assumes and how it wants to be read.'),
  refs,
  version: z.string().describe('The document version, as the team numbers it.'),
  status: z.enum(['living', 'draft']).default('living').describe('`draft` while the document describes how the session went; `living` once it describes how the team actually works.'),
  // `note` is the one line a figure can afford to print beside the thing;
  // `description` is markdown the drawer renders when a reader stops on it. Two
  // fields rather than one because the figure has no room for the long form and
  // the drawer has no use for a caption truncated to fit a lane.
  // Every catalog entry takes the same optional `refs:` — where the thing lives,
  // in whatever form "lives" takes for it: a role's charter, a harness's console,
  // the dashboard where an event is actually seen. One field with one meaning
  // across five shelves, so a reader learns it once.
  roles: z.array(captioned).min(1).describe('The lanes every figure is drawn along. Always here, never a file of their own.'),
  // An artifact's `refs` are where the thing itself lives — the published board,
  // the space it is written in, the template it is written from. A reader who
  // stops on an artifact to ask what it is usually wants to go and look at one.
  artifacts: z.array(entry).min(1).describe('The named things work leaves behind. Here, or in `artifacts.yaml` — never both.'),
  harnesses: z.array(captioned).default([]).describe('The runtimes the team has. Here, or in `harnesses.yaml` — never both.'),
  events: z.array(entry).default([]).describe('The recurring moments a recommendation can be attached to. Here, or in `events.yaml` — never both.'),
  tools: z.array(tool).default([]).describe('The concrete things inside a harness that activities name. Here, or in `tools.yaml` — never both.'),
});

/**
 * The per-file view of `team.yaml`, for `bin/gen-schemas.mjs` alone — never for
 * `check` and never for the loader.
 *
 * `loadTeam` merges the catalogs *before* it validates, so `teamSchema` is a
 * statement about the merged document: `artifacts` is required because a team
 * with no artifact shelf anywhere is not a document. But a folder that keeps its
 * shelves in files of their own has a `team.yaml` with no `artifacts:` key at
 * all, and that file is correct. An editor holding only that file has to accept
 * it, so the catalogs go optional here. "Declare it somewhere" is a rule about
 * the folder, and the folder is what `loadTeam` can see.
 */
export const teamFileSchema = teamSchema.partial(
  Object.fromEntries(CATALOG_KEYS.map((key) => [key, true])) as Record<(typeof CATALOG_KEYS)[number], true>
);

/**
 * One schema per catalog file, projected from `teamSchema.shape` so a fifth
 * shelf — or a constraint added to an existing one — cannot exist in the merged
 * document without the file schema carrying it too. The key is repeated inside
 * the file it names — `artifacts.yaml` holds `artifacts:` — which is the same
 * shape `loadTeam` reads and the shape a generated schema has to describe. The
 * merged view defaults an absent shelf to `[]`; the file named after a shelf
 * exists to declare it, so the default comes off and the key is required.
 */
export const catalogFileSchemas = Object.fromEntries(
  CATALOG_KEYS.map((key) => {
    const shelf = teamSchema.shape[key];
    return [key, z.object({ [key]: shelf instanceof z.ZodDefault ? shelf.removeDefault() : shelf })];
  })
) as Record<(typeof CATALOG_KEYS)[number], z.ZodTypeAny>;

export const processSchema = z.object({
  name: z.string().describe('One named way work flows through this team. The file name is the process id.'),
  note: z.string().optional().describe('The one line the process index prints and the page hands to `<meta>`.'),
  description: z.string().optional().describe('Markdown the drawer renders: what this process assumes and how it wants to be read.'),
  refs,
  stages: z
    .array(z.object({ id, name: z.string().describe('The label the stage prints.') }))
    .min(1)
    .describe('The coarse phases activities are labelled with. A map, never a gate.'),
  activities: z.array(activity).min(1).describe('The steps of this process. At least one.'),
  constraint: z
    .object({
      artifact: id.describe('The id of the artifact the constraint is about.'),
      note: z.string().describe('What the constraint says.'),
    })
    .optional()
    .describe('The one thing that governs this whole process, named against the artifact it governs.'),
});

export type TeamData = z.infer<typeof teamSchema>;
export type ProcessData = z.infer<typeof processSchema>;

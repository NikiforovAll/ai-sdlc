// The zod contract every YAML file is validated against. It imports `astro/zod`
// rather than `astro:content` so `check` can run it from plain Node without
// booting Astro — `content.config.ts` wraps these in collections, nothing more.
import { z } from 'astro/zod';

const id = z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'ids are kebab-case');

export const DELEGATION_LEVELS = ['manual', 'assisted', 'delegated-review', 'gated-autonomous'] as const;

// A fill names a catalog tool by id — the catalog owns the name and the harness,
// so a use can never drift from the entry it names.
const fill = z.object({
  tool: id,
  level: z.enum(DELEGATION_LEVELS),
  usage: z.string().optional(),
  asset: z.string().optional(),
  refs: z.array(z.string()).optional(),
});

// A recommendation has no identity: it is a pointer from one activity to one
// tool, optionally bound to the moment that calls for it. It never fills the
// slot — an activity with ten recommendations and no `tooling:` is still open.
const recommendation = z.object({
  tool: id,
  level: z.enum(DELEGATION_LEVELS).optional(),
  event: id.optional(),
  usage: z.string().optional(),
});

export type Fill = z.infer<typeof fill>;
export type Recommendation = z.infer<typeof recommendation>;

export interface SubActivity {
  id: string;
  name: string;
  roles: string[];
  consumes?: string[];
  produces: string[];
  why?: string;
  tooling?: Fill;
  recommends?: Recommendation[];
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
    recommends: z.array(recommendation).optional(),
    activities: z.array(subActivity).optional(),
  })
);

const activity = z.object({
  id,
  name: z.string(),
  stage: id,
  roles: z.array(id).min(1),
  consumes: z.array(id).default([]),
  produces: z.array(id).min(1),
  why: z.string().optional(),
  tooling: fill.optional(),
  recommends: z.array(recommendation).optional(),
  activities: z.array(subActivity).optional(),
});

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
  refs: z.array(z.string()).optional(),
});

export const teamSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  version: z.string(),
  status: z.enum(['living', 'draft']).default('living'),
  roles: z.array(z.object({ id, name: z.string(), note: z.string().optional() })).min(1),
  artifacts: z.array(z.object({ id, name: z.string() })).min(1),
  harnesses: z.array(z.object({ id, name: z.string(), note: z.string().optional() })).default([]),
  events: z.array(z.object({ id, name: z.string(), description: z.string().optional() })).default([]),
  tools: z.array(tool).default([]),
});

export const processSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  stages: z.array(z.object({ id, name: z.string() })).min(1),
  activities: z.array(activity).min(1),
  constraint: z.object({ artifact: id, note: z.string() }).optional(),
});

export type TeamData = z.infer<typeof teamSchema>;
export type ProcessData = z.infer<typeof processSchema>;

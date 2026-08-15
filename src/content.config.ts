import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const id = z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'ids are kebab-case');

export const DELEGATION_LEVELS = ['manual', 'assisted', 'delegated-review', 'gated-autonomous'] as const;

const fill = z.object({
  harness: id,
  tooling: z.string(),
  level: z.enum(DELEGATION_LEVELS),
  asset: z.string().optional(),
  refs: z.array(z.string()).optional(),
});

export type Fill = z.infer<typeof fill>;

export interface SubActivity {
  id: string;
  name: string;
  roles: string[];
  consumes?: string[];
  produces: string[];
  why?: string;
  tooling?: Fill;
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
  activities: z.array(subActivity).optional(),
});

const skill = z.object({
  id,
  name: z.string(),
  harness: id,
  tooling: z.string(),
  level: z.enum(DELEGATION_LEVELS).optional(),
  roles: z.array(id).min(1),
  when: z
    .array(z.object({ activity: id.optional(), event: id.optional(), note: z.string().optional() }))
    .default([]),
  refs: z.array(z.string()).optional(),
});

// A team is a folder: team.yaml holds the catalogs, processes/*.yaml hold the flow.
// The folder name is the team id; the process file name is the process id.
const teams = defineCollection({
  loader: glob({
    pattern: '*/team.yaml',
    base: './content/teams',
    generateId: ({ entry }) => entry.split('/')[0],
  }),
  schema: z.object({
    name: z.string(),
    description: z.string().optional(),
    version: z.string(),
    status: z.enum(['living', 'draft']).default('living'),
    roles: z.array(z.object({ id, name: z.string(), note: z.string().optional() })).min(1),
    artifacts: z.array(z.object({ id, name: z.string() })).min(1),
    harnesses: z.array(z.object({ id, name: z.string(), note: z.string().optional() })).default([]),
    events: z.array(z.object({ id, name: z.string(), description: z.string().optional() })).default([]),
    skills: z.array(skill).default([]),
  }),
});

const processes = defineCollection({
  loader: glob({
    pattern: '*/processes/*.yaml',
    base: './content/teams',
    generateId: ({ entry }) => {
      const [team, , file] = entry.split('/');
      return `${team}/${file.replace(/\.ya?ml$/, '')}`;
    },
  }),
  schema: z.object({
    name: z.string(),
    description: z.string().optional(),
    stages: z.array(z.object({ id, name: z.string() })).min(1),
    activities: z.array(activity).min(1),
    constraint: z.object({ artifact: id, note: z.string() }).optional(),
  }),
});

export const collections = { teams, processes };

import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { basename, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { teamSchema, processSchema } from './lib/schema';

// One team folder per run: `team.yaml` plus `processes/*.yaml`. The CLI points
// this at any folder on disk; the repo's own reference team is the fallback so
// `npm run dev` keeps working with no environment set.
const TEAM_DIR = resolve(process.env.AISDLC_TEAM_DIR ?? './content/teams/reference');

// The folder name is the team id; the process file name is the process id.
const TEAM_ID = basename(TEAM_DIR);

// `base` is resolved as a URL against the project root, so an absolute path from
// the CLI has to arrive as a file: URL — on Windows `C:\...` is otherwise read
// as a scheme.
const BASE = pathToFileURL(`${TEAM_DIR}/`);

const teams = defineCollection({
  loader: glob({ pattern: 'team.yaml', base: BASE, generateId: () => TEAM_ID }),
  schema: teamSchema,
});

const processes = defineCollection({
  loader: glob({
    pattern: 'processes/*.yaml',
    base: BASE,
    generateId: ({ entry }) => basename(entry).replace(/\.ya?ml$/, ''),
  }),
  schema: processSchema,
});

export const collections = { teams, processes };

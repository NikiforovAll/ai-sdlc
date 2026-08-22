import { defineCollection, type Loader } from 'astro:content';
import { glob } from 'astro/loaders';
import { basename, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { teamSchema, processSchema } from './lib/schema';
import { loadTeamOrThrow, teamFiles } from './lib/load';

// One team folder per run: `team.yaml`, the catalog files beside it, and
// `processes/*.yaml`. The CLI points this at any folder on disk; the packaged
// example is the fallback so `npm run dev` keeps working with no environment set.
const TEAM_DIR = resolve(process.env.AISDLC_TEAM_DIR ?? './examples/reference');

// The folder name is the team id; the process file name is the process id.
const TEAM_ID = basename(TEAM_DIR);

// `base` is resolved as a URL against the project root, so an absolute path from
// the CLI has to arrive as a file: URL — on Windows `C:\...` is otherwise read
// as a scheme.
const BASE = pathToFileURL(`${TEAM_DIR}/`);

// One entry assembled from several files, which the glob loader cannot express:
// it maps one file to one entry. So the team is loaded by hand, and the extra
// files are handed to the dev watcher so a catalog edit redraws the page like
// any other source edit.
const teamLoader: Loader = {
  name: 'team-folder',
  load: async ({ store, parseData, watcher, logger }) => {
    const files = teamFiles(TEAM_DIR);

    const reload = async () => {
      const data = await parseData({ id: TEAM_ID, data: await loadTeamOrThrow(TEAM_DIR) });
      // One team renders per run, so the store holds exactly one entry. Clearing
      // is what makes a second run against a different folder honest: the id is
      // the folder name, so a stale entry from the last folder would otherwise
      // sit beside the new one and `getCollection` would return both.
      store.clear();
      store.set({ id: TEAM_ID, data });
    };

    await reload();

    if (!watcher) return;
    watcher.add(files);
    const changed = (path: string) => {
      if (!files.includes(resolve(path))) return;
      reload().catch((err: Error) => logger.error(err.message));
    };
    for (const event of ['add', 'change', 'unlink'] as const) watcher.on(event, changed);
  },
};

const teams = defineCollection({ loader: teamLoader, schema: teamSchema });

const processes = defineCollection({
  loader: glob({
    pattern: 'processes/*.yaml',
    base: BASE,
    generateId: ({ entry }) => basename(entry).replace(/\.ya?ml$/, ''),
  }),
  schema: processSchema,
});

export const collections = { teams, processes };

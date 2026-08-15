# CLAUDE.md

## The site is a projection

- Process facts belong in YAML. A fact hand-written into a component is a second source of truth that the next YAML edit silently contradicts.

## Source-of-truth documents

Read the relevant one before changing the model or the look, rather than re-deriving it:

| Document | Reach for it when |
| --- | --- |
| `PRODUCT.md` | changing what the product does, who it serves, or its scope |
| `DESIGN.md` | changing anything visual |
| `docs/ontology/` | changing the vocabulary — the layers build in dependency order |

## Design invariants

`DESIGN.md` is the full world. These five are the ones that get broken:

## One team renders per run

Routes are flat — `/feature`, not `/acme/feature` — so one team folder is the whole content root. `src/content.config.ts` reads `AISDLC_TEAM_DIR`, falling back to `content/teams/reference` so `npm run dev` needs no environment. The CLI (`bin/ai-sdlc.mjs`) sets that variable, which is how `serve`/`export`/`check` render a folder anywhere on disk.

The folder name is the team id and each process file name is its process id — renaming a folder renames the team.

## Verifying a change

`npx astro build` is the gate. There is no test suite and no linter, so a clean build reporting the expected page count (5 for the reference team) is the evidence that a change holds. `node bin/ai-sdlc.mjs check <team-dir>` validates YAML alone, without booting Astro.

Edit source with the Edit tool. `sed -i` writes a temp file and renames it over the original, which breaks the Astro dev-server watcher: the browser keeps serving the previous CSS while the file on disk is already correct, so computed styles read from the page disagree with the source for reasons unrelated to the change being made.

## Commits

Conventional commits (`feat:`, `fix:`, `docs:`), on main.

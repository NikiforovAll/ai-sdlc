# JSON Schemas for an ai-sdlc team folder

These give you autocomplete, hover documentation and inline errors while you edit a team's YAML — the thing you want during a live mapping session, when the page is hot-reloading beside the editor and a typo costs a minute of everyone's attention.

**These files are generated.** They are a projection of `src/lib/schema.ts`, the zod contract every reader in this repo validates against. Do not edit them by hand: run `npm run schemas`. CI runs `npm run schemas:check` and fails if what is committed here disagrees with `schema.ts`.

## Using them

Install [`redhat.vscode-yaml`](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-yaml) — without it the modeline below is an ordinary comment and nothing happens, silently. This repo's `.vscode/extensions.json` recommends it.

Put the matching line at the top of each file:

| File | Modeline |
| --- | --- |
| `team.yaml` | `# yaml-language-server: $schema=https://raw.githubusercontent.com/NikiforovAll/ai-sdlc/main/schemas/team.schema.json` |
| `artifacts.yaml` | `…/schemas/artifacts.schema.json` |
| `harnesses.yaml` | `…/schemas/harnesses.schema.json` |
| `events.yaml` | `…/schemas/events.schema.json` |
| `tools.yaml` | `…/schemas/tools.schema.json` |
| `processes/*.yaml` | `…/schemas/process.schema.json` |

`ai-sdlc new` writes these lines for you.

**If a schema change does not show up:** `raw.githubusercontent.com` serves with a CDN cache of roughly five minutes, and the language server caches on top of that. Wait, then run **Developer: Reload Window**. This is the usual cause of "I pushed it and nothing changed" and it is not a bug.

## What they check, and what they do not

Each schema describes **one file in isolation**. That is the whole of what JSON Schema can see, and three of this project's rules need more than one file. They stay with `ai-sdlc check` and `ai-sdlc status`, which are still the gates:

- **Ids that reference other ids.** `tooling.tool: grill-me` naming a tool no `tools.yaml` declares, `roles: [pm]` naming a role `team.yaml` does not list, `stage: build` with no matching stage — all schema-legal. The editor validates the *shape* and says nothing about the *id*. `ai-sdlc status` reports these; an unknown **tool** id fails the build.
- **A catalog declared twice.** A shelf lives in `team.yaml` or in `<key>.yaml`, never both. `src/lib/load.ts` catches that.
- **A file nothing reads.** `harness.yaml`, `tools.yml` — only `load.ts` notices.

For the same reason, `team.schema.json` treats `artifacts`, `harnesses`, `events` and `tools` as **optional**, even though a team document must have artifacts somewhere. A `team.yaml` in a folder that keeps its shelves in files of their own has none of those keys and is correct; the editor has to accept it. "You have no artifacts anywhere" stays `check`'s sentence to say.

One place the schemas are **stricter** than `check`: unknown keys are an error here (`additionalProperties: false`), where zod quietly strips them. So the editor catches `produce:` for `produces:` and `check` does not. That is deliberate.

## Versioning

The URLs point at `main`, unpinned, and should stay that way while the vocabulary is still moving: every team folder wants the newest schema, and a pinned tag would quietly stop offering fields that were just added.

When it settles — the trigger is `version` in a `team.yaml` reaching `1.0`, or the first team outside this repo depending on the schema, whichever comes first — publish `schemas/v1/*.schema.json` from the same generator alongside `main`, and point the templates at the pinned URL so newly created folders are pinned by default. The repo's own examples stay on `main`, so `main` keeps being exercised.

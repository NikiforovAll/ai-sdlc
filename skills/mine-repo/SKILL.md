---
name: mine-repo
description: Mine an ai-sdlc team document out of a repository that already describes its own process. Nobody is interviewed.
disable-model-invocation: true
---

# mine-repo

Some repositories already describe a delivery process. An agentic bundle names its skills, its agents, its gates and the artifacts they pass; a toolkit's README argues for its own order of work. That is a document waiting to be projected, and reading it is faster and more accurate than asking a team to recall it.

You are reading files, not people. Everything that follows exists to keep that distinction visible on the page — because a mined document that reads like an interviewed one is a document a team will trust further than it should.

## What you are producing

A **draft**. `status: draft` in `team.yaml`, and the document's `description` says in its first line that it was read out of a repository and nobody was interviewed.

The output is not the end of the work. It is the thing a coach reads *at* a team so they can cut it — which is the `map-team` skill's job, starting from a folder that already exists. A mined document that is never taken to a team describes a package; only the team can turn it into a description of a team.

## Before the first file

1. **Know what you are reading and where it goes.** The source package and the destination folder are the arguments — `/mine-repo <source> --into <dir>` — and either one that is missing is a question, not a guess.
2. **Write the folder outside this repo** — beside the source, or wherever that team's material already lives. This repository is vendor-neutral by invariant: no client, product, or employer vocabulary belongs in it, and neither do documents mined from someone else's licensed package. The folder name becomes the team id.
3. **Run `ai-sdlc new <dir>`** for a renderable skeleton, then replace its contents. It writes the team as several files read as one document: `team.yaml` introduces the team and holds the roles, and every other shared catalog is a file of its own beside it — `artifacts.yaml`, plus `harnesses.yaml`, `tools.yaml` and `events.yaml` once you have entries for them. A shelf may be written inline in `team.yaml` instead, but never in both places: `check` fails a catalog declared twice.
4. **Read the ontology.** `skills/map-team/references/ontology-cheatsheet.md` is the model on one page; `docs/ontology/` is the long form. The authored-versus-derived distinction is the one that matters: if you find yourself wanting to draw an arrow, name an artifact instead.
5. **Read `references/inference-rules.md`** in this skill. It is the mapping from repository evidence to model element, and it is the reference you consult all the way through.

## Take the inventory before you author anything

Enumerate the whole surface of the package into a scratch file, then author against that list and strike entries off as they land:

```bash
find <pkg> -maxdepth 2 -type d \( -name 'skills' -o -name 'agents' -o -name 'commands' \
  -o -name 'hooks' -o -name 'references' -o -name 'workflows' \) -exec ls {} \;
cat <pkg>/README.md <pkg>/CHANGELOG.md <pkg>/*plugin*/*.json
```

The failure this prevents is the one that happens by default: you read the README, the README describes the main flow beautifully, you author the main flow, and you never notice the four standalone skills the README mentions once in a table. **Coverage comes from a list you check off, not from attention.** Anything you decide to leave out is something you name in the hand-off report, not something you quietly drop.

Read in this order, because later sources correct earlier ones:

| Source | What it settles |
| --- | --- |
| README / architecture reference | the spine, the vocabulary, the arguments |
| Gate or contract references | who resolves what, and on what evidence |
| Artifact / lifecycle references | what is produced and consumed, by name |
| Plugin manifest | which hooks exist, and at which points |
| `SKILL.md` / agent front matter | one-line purpose, hard constraints, whether it is standalone |
| CHANGELOG | why something is the way it is, and what it replaced |

## Surface the decisions before authoring

Three calls change the finished picture more than anything else, and **none of them is derivable from the source**. Put all three to the user in one message, with your recommendation, before you write a process file:

**1. How many documents.** One package is one document; a program of several repositories is a judgement. The evidence for *one* is a shared lifecycle — the same task conventions, the same commit rules, one tracker — and cross-references between the repos. The evidence for *several* is separate audiences: a document each team can be handed without reading the other two.

Ask before authoring, not after. The routes are: **one document, repositories appear as harnesses and tools** — or **one folder per repository, and the shared lifecycle is authored as many times as there are folders**. Getting this wrong is the only decision here that cannot be fixed by editing; it is re-mining.

**2. How the processes are cut.**

| Cut | You get | You pay |
| --- | --- | --- |
| **By mode** — one process per entry point | the contrast is on the page: the same activity, a different resolver and a different level | the spine is authored twice, and every later edit lands in two files |
| **By domain** — one delivery process, modes as sibling sub-activities | nothing is authored twice | the contrast moves inside a drawer, where a reader has to go looking for it |

**3. How fine the artifacts are.** One artifact per file the package names (a review diff, the lens findings, the fix-up diff, the check verdict — sixty or more), or one per thing that visibly changes hands (one review verdict — thirty or so). Fine granularity makes the flow figure honest about the machinery; coarse granularity makes it readable.

State each choice in the document's `description` once it is made. A reader who can see the cut can argue with it.

## The loop

Catalogs first — one file per shelf — then one process at a time. Within a process: read the source for that flow end to end, then write it, then run `ai-sdlc status <dir>` and fix what it names before starting the next.

Carry the `refs:` as you go, never afterwards. Every shelf entry takes one, and on a mined document it is not decoration: the whole claim to accuracy is that a reader can open the file each entry was read from. Write it while the file is still on your screen — a `refs:` pass at the end is a pass where you guess.

Write the spine before the tooling. A stage, a role, an artifact and an activity are cheap to get right and expensive to retrofit; a fill is a two-line edit.

Two YAML traps cost a round-trip every time, and both come from quoting a package that writes in Markdown. A plain scalar may not **start with a backtick**, and may not **contain a colon followed by a space** — `note: \`make test\` is the gate` and `description: reviewed against master: architecture, tests` both fail to parse. Wrap the value in double quotes, or make it a `>-` block. Mining hits this far more often than an interview does, because so much of what you are quoting is prose about file names and commands.

## Never infer these four

Everything else in the model is evidence. These four are the places where a mined document goes wrong in a way no reader can detect:

- **`open:` — only from a declared gap.** A roadmap item, a documented limitation, a "not yet implemented", a TODO with a sentence attached. Quote it as the `need:`. If the package has not asked for something, the document must not ask on its behalf: the gap between blueprint and fill is the most honest signal this product produces, and inventing one destroys it.
- **`why:` — only from the source's own argument.** Quote or compress the rationale the package gives. A `why:` that restates the activity's name is worse than no `why:`, and one you wrote yourself is a claim about a team you never met. No argument in the source, no `why:` on the page.
- **Roles — always marked as inferred.** A package names gates, owners and stand-ins; it does not name people. Write the roles the documents imply, and say in each role's `description` — or at minimum in the team `description` — that these are inferred and need confirmation.
- **Levels — from the mechanism, not the tone.** See the ladder table in `references/inference-rules.md`. A README that sounds confident is not evidence of autonomy; a hook at a fixed point is.

| Rationalization | Reality |
| --- | --- |
| "Anyone can see this step needs a tool" | Then the package's authors could see it too, and did not ask. Unclaimed. |
| "The roadmap implies it" | Quote the sentence or drop the slot. An implication is not a declaration. |
| "The activity is bare, the page looks unfinished" | A bare activity is work the team does itself. It is the most common state in a real document. |
| "I'll write a `why:` so the drawer isn't empty" | An invented argument is the one thing a reader cannot check against the source. |
| "The docs are clearly aspirational, so I'll model what they meant" | Model what they wrote. Where writing and reality differ, that is the team's finding to make, not yours. |

## Keep the graph forward-only

Order is derived from artifacts: one activity's `produces` matching another's `consumes`. A late activity that produces an artifact an earlier one consumes is a cycle, and it corrupts the layout of the figure whose entire job is order.

Packages are full of loops — a sync that rewrites the spec after handoff, a resume that re-enters a phase, a harvest that updates the guides the next run reads. Model each one of them **one of these two ways**:

- give it its own downstream artifact (`run-index`, `curated-memory`), or
- make it a `recommends:` bound to an `event:` on the activity where the loop is felt.

The second is usually the truer one. A rework loop is not a step in the flow; it is a moment, with a play attached.

## Finishing

Three checks, in order, and all three must pass before you report:

```bash
ai-sdlc check  <dir>       # schema; must exit 0
ai-sdlc status <dir>       # no dangling ids, no unreferenced catalog entries
ai-sdlc export <dir>       # the build prints the page count: processes + 2
```

`status` is the one that catches mining mistakes specifically. An id an activity names but no catalog defines is schema-legal — the page renders and the arrow silently never appears. An unreferenced catalog entry is the other direction: a tool you inventoried and never placed, which means either an activity is missing or the entry is not part of this document.

**Write the document's own honest-about paragraph last**, from what `status` actually printed. Written before the processes are authored, it becomes a prediction, and a mined document that opens by miscounting its own open slots has undermined the only thing it was claiming: that every number in it came from somewhere. The same applies to each process's "where it is open" note.

Then report, in this order:

1. The counts `status` prints — activities, filled, open, unclaimed.
2. **The three decisions** you put to the user, and that only the first is expensive to reverse.
3. **What you left out**, from the inventory list, and why.
4. That the roles are inferred and the `why:` lines are quoted, so the team knows which parts are evidence and which are reading.
5. That the next step is `map-team` against this folder, with the team in the room.

---
name: sdlc-annotate
description: Drain the annotation inbox — read what readers flagged on a served ai-sdlc page, fold each note into the team YAML, and resolve the ones you landed.
disable-model-invocation: true
---

# sdlc-annotate

A reader disagreed with the document and said so on the page. Their notes are waiting in `<team-dir>/annotations/`, one file each. You are the other end of that: read the **inbox** and **drain** it into the YAML.

The inbox is not an archive. A note exists to be consumed — folded into the document, then deleted — because the YAML is the record and a note whose change is already made is noise that buries the open ones. A run that ends with the inbox as full as it started has done nothing, whatever else it produced.

One rule holds the whole run together: **resolve only what you landed.** A note you wrote into the YAML is dealt with, so delete it. A note you did not — because it needs a decision that is not yours — stays open and goes in the report. Never delete a note you merely disagree with: the reader is a person who was looking at the page, and deleting their sentence is how their objection disappears without anyone answering it.

## Before the first note

1. **Know which folder you are draining.** It is the argument, or ask. Nothing here sniffs the cwd.
2. **Read the inbox whole**: `ai-sdlc annotations <dir> --json`. Read all of it before editing anything — two notes on the same activity are usually one change, and applying them one at a time writes the second over the first.
3. **Report the `problems` array and move on.** Those are files under `annotations/` that could not be read as notes. They are not yours to repair — a hand-edited file with a broken anchor belongs to whoever edited it — but a silent skip loses somebody's sentence.
4. **Read the `sdlc-ontology` skill**, and its `references/ontology-cheatsheet.md`. Every edit you are about to make is schema-shaped, and the cheatsheet is the reference you consult all run.

Done when you can name every open note, its anchor, and the file the anchor lives in.

## Read the note where the reader stood

Each record is `id`, `anchor`, optional `context`, `created`, and the prose.

The **anchor** is the address — `kind:id`, or bare `team`:

| Anchor | Where it lives |
| --- | --- |
| `process:<id>` | `processes/<id>.yaml` — the file, its stages, its `constraint:` |
| `activity:<id>` | the activity with that id in a process file, possibly nested inside another activity's `activities:` |
| `role:` `artifact:` `tool:` `harness:` `event:` | one entry in a shared catalog — its own file (`tools.yaml`, `artifacts.yaml`, …) when the team has one, otherwise that key inline in `team.yaml` |
| `team` | `team.yaml`'s own fields. The reader clicked nothing in particular, so the note is about the document |

The **context** is the chain above the anchor, outermost first — where the reader was standing when they wrote. It is context, not address: the anchor is the record, and it stays the record even if the chain no longer holds after an edit. Read the chain to *choose between readings*, never to override the anchor.

That distinction is the whole reason the chain exists, and it decides most notes on a shared catalog entry. A tool is drawn under every activity that fills with it, so:

- `tool:ci-workflows`, no context — the catalog entry itself. *"this is really two tools"* edits `tools.yaml`.
- `tool:ci-workflows`, context `feature → run-the-checks` — the reader was looking at one activity's use of it. *"this doesn't run here yet"* is a `tooling:` change on `run-the-checks`, and touching `tools.yaml` would be wrong for the other three activities that use it correctly.

When the prose and the chain disagree about which of the two it is, the prose wins — the chain records the click, the sentence records the intent.

## The loop

One note at a time: **locate → decide → edit → verify → resolve.**

**Locate.** Grep the anchor's id in the team folder. An id that resolves to nothing is a note about a node that has already been renamed or deleted; hand it back rather than guessing which one replaced it.

**Decide what kind of change the sentence is.** Most notes are one of three, and they land in different places:

| The note says | You write |
| --- | --- |
| a fact about the process is wrong or missing | the field that carries it — `roles:`, `consumes:`, `produces:`, `stage:`, a new catalog entry |
| the reason is wrong, or absent | `why:`, in the reader's words where they gave you words |
| this is not how the tooling actually is | `tooling:` on the activity, or `open:`/`need:`, or neither — see below |

The tooling row is the one to slow down on. An activity is filled, **open**, or **unclaimed**, and a note can move it between them. *"we don't actually use that here"* removes the fill — but whether the activity then becomes open or unclaimed depends on whether anyone wants something there, and the note usually does not say. That is a hand-back, not a coin flip: writing `open:` invents a request the team never made, and the gap between blueprinted and filled is the most honest signal the document produces.

**Edit** with the Edit tool, in the team folder — never in this repository. Keep the reader's vocabulary when they gave you a sentence; a `why:` you paraphrase into house style stops being the argument they made.

**Verify** before you resolve. `ai-sdlc check <dir>` is the schema gate and exits non-zero. Then `ai-sdlc status <dir>`: an id you referenced but never added to a catalog is schema-legal, so `check` passes it and the only symptom is an arrow that never draws. Fix every dangling id you introduced before moving to the next note.

**Resolve**: `ai-sdlc annotations <dir> --resolve <id>`. Only now, and only for a note whose change is in the YAML and passing both commands.

Done when every note in the inbox has been either resolved or explicitly handed back.

## Hand a note back rather than guessing

Leave the note open, and say why in the report, when:

- the change needs a decision only the team can make — open versus unclaimed, whether a tool is a fill or a recommendation, which of two contradictory notes on the same node is right;
- the anchor names a node that no longer exists;
- the note is a question rather than a correction, or it disputes something the document says deliberately;
- landing it would mean inventing a fact the note does not contain — a role's name, an artifact nobody mentioned, a `why:` in your own voice.

A handed-back note is not a failure of the run. It is the run doing the one thing an inbox is for: surfacing what needs a person.

## Ending

Report, in this order:

1. **Landed** — one line per note: the id, the file you edited, and what changed. This is what the coach reviews before committing, and `git diff` in the team folder is its evidence.
2. **Handed back** — one line per note: the id, the sentence, and the decision it is waiting on. Say who can settle it.
3. **Unreadable** — the `problems` entries, verbatim.
4. **The state of the document** — the `ai-sdlc status <dir>` counts after the last edit.

Then say plainly that the edits are uncommitted and the resolved note files are deleted in the working tree, so one commit carries both halves: the change and the disappearance of the note that asked for it.

# Rules of inference

From repository evidence to model element. Consult this while authoring; the calls it does not cover are the ones worth putting to the user.

## The elements

| Evidence in the source | Element |
| --- | --- |
| A numbered phase, stage, or step in a documented flow | an **activity** |
| A phase label the flow groups its steps under | a **stage** |
| A file one step writes and another reads | an **artifact** |
| A named decision point — a gate, an approval, a check | an **activity** that produces the decision as an artifact |
| An owner, a stand-in, or "who resolves this" | a **role** |
| A runtime the package installs into or shells out to | a **harness** |
| One file under `skills/`, `agents/`, `commands/`, `hooks/` | one **tool** |
| A hard prerequisite that halts a run | an activity in a separate process, plus a `refs` link |
| A named recurring situation the docs give advice for | an **event**, with the advice as a `recommends:` |
| A sub-flow a single step expands into | nested `activities:` on that step |

Two things that look like model elements and are not:

- **A dependency arrow.** Never authored. Name the artifact and the arrow appears.
- **A rework or retry loop.** Never drawn. It is an `event:` with a `recommends:` attached.

### Loops, in full

Order is derived: one activity's `produces` matching another's `consumes`. A late activity that produces an artifact an earlier one consumes is a cycle, and it corrupts the layout of the figure whose entire job is order.

Packages are full of loops — a sync that rewrites the spec after handoff, a resume that re-enters a phase, a harvest that updates the guides the next run reads. Model each one **one of these two ways**:

- give it its own downstream artifact (`run-index`, `curated-memory`), or
- make it a `recommends:` bound to an `event:` on the activity where the loop is felt.

The second is usually the truer one. A rework loop is not a step in the flow; it is a moment, with a play attached.

## Naming

- **A tool's `id` is its file or directory name**, unchanged. `agents/complexity-assessor.md` → `complexity-assessor`. This is what makes the shelf checkable: a reader can go to the file.
- **A tool's `name` is what the source calls it** when invoked — including a namespace prefix if the source uses one.
- **`kind`** carries provenance, and is where a tool's origin goes: `entry-point skill`, `orchestrator skill`, `agent`, `lifecycle hook`, `adapter`, and the plugin name when tools come from more than one package. Provenance in `kind` is what lets the harness stay a runtime instead of becoming a bundle list.
- **Activity ids and names are verb phrases in the source's own vocabulary.** If the package says "intake", the activity is not called "Gather Requirements".
- **`refs` on every entry that has a file.** Every shelf takes one — artifacts, harnesses, events, tools and roles alike — and so do processes, activities and fills. A mined document's whole claim to accuracy is that each entry can be opened.

  An entry is either the address alone or the address under a name, and the second is the better one whenever the address is not readable:

  ```yaml
  refs:
    - agents/complexity-assessor.md          # a path a reader can already read
    - { name: Review contract, url: https://example.com/x/AbCd }
  ```

## The delegation ladder

Read the mechanism, never the tone. The ladder itself is in the cheatsheet; this is how a repository's evidence lands on it.

| The source says | Level |
| --- | --- |
| A hook, a deterministic check, an exit-code gate — no model in the loop | `gated-autonomous` |
| Runs unattended and only escalates on a named condition | `gated-autonomous` |
| An agent or subagent does the work and a human reads the result | `delegated-review` |
| A tool produces a report and a human makes the decision | `delegated-review` |
| A dialogue: the tool asks and a person answers | `assisted` |
| "Never automatic", "requires approval", "manual only" | `assisted` (the tool does the work, the person triggers and owns it) |
| A person does it and the tools only inform | `manual` |

Two rules that follow from the ladder and are easy to get wrong:

- **The same tool takes different levels in different activities.** A review orchestrator whose verdict *informs a human* is `delegated-review`; the same orchestrator whose verdict *resolves a gate* is `gated-autonomous`. Resolve it once per activity, from the mechanism that activity uses.
- **`gated-autonomous` is not "very automated".** It is a human at the gate. If nothing in the source can hold the gate — no hook, no exit code, no escalation rule — the level is lower.

## Fill, recommendation, open, or nothing

Four states, and the difference between the last two is the whole point of the document.

| The source shows | Write |
| --- | --- |
| This activity is performed by that tool, in this flow | `tooling:` — one fill, with the level from the ladder |
| Another tool is worth reaching for here, or in a named situation | `recommends:` — optionally with `event:` |
| A declared, quotable gap: roadmap item, documented limitation, "not yet" | `open:` with the quoted sentence as `need:` |
| Nothing — the step is described and no tool is named | **neither field.** Unclaimed |
| A tool exists but the docs say a person must do this | `tooling:` at `assisted`, with the policy in `usage:` |

The last row is the one that repays care. "The pipeline never opens a merge request" is not an open slot and not an absence — it is a deliberate boundary, and stating it as a fill at a low level with the reason in `usage:` records the decision instead of erasing it.

A standalone tool the flows never invoke belongs in a **separate process**, not as a recommendation inside one. That is what "standalone" means, and it is worth a process file even for four activities.

## Tool, role, or harness

The stand-in case is the one that decides your whole document's shape: a package ships an agent briefed to answer as the tech lead would.

- Model it as a **role** when the source treats it as *who resolves* — it holds a hat, appears on the vertical axis, and shows which lanes go quiet when nobody is present.
- Model it as a **tool** when the source treats it as *what is dispatched* — it has a file, a contract, and a level.

Both, when the source does both. The role names who is accountable in that mode; the tool names the file that stands in. Two entries, one mechanism, and the drawer reads correctly from either side.

A **harness** is a runtime, and it should stay small: the agent host, the project's own runners and CI, the adapter layer, the deterministic hook points. Resist making a harness per plugin — provenance is `kind`. A useful test: if a tool could be re-implemented tomorrow inside the same runtime, the runtime is the harness.

**A harness with no tools is not a harness.** A repository can have an agent host installed, configured and written for, with nothing captured into it — no skill, no command, no subagent. That is worth saying, and `status` will tell you it is unreferenced. Say it in the document's `description`, where it reads as the finding it is, and leave the catalog to the runtimes that actually hold something. An empty shelf on the page reads as an oversight; the same fact in a sentence reads as an argument.

## Events

Mine these from the source's own troubleshooting, escalation rules, and halt conditions — those sections are a list of recurring moments the package already recognises. Name the moment, never the remedy: *"the run stopped mid-phase"*, not *"resume the run"*. The remedy is the `recommends:` that points at it.

An event with no recommendation attached anywhere is not an event; drop it or attach it.

## The document's own fields

| Field | Mined from |
| --- | --- |
| team `name` | what the package calls itself |
| team `note` | one line: what the document describes, and that it was read out of a repository |
| team `description` | the provenance, how to read it, what is honest, what needs confirming |
| team `refs` | the sources you actually read — the package root, its README, its architecture reference |
| team `version` | your document's version, starting at `0.1`. Not the package's |
| team `status` | `draft`, until a team has confirmed it |
| process `note` / `description` | the flow's own summary and its arguments — assumptions, where it stops, where it is open |
| `constraint` | the source's own claim about what everything waits behind: a mandatory gate, the one expensive step, the queue the docs complain about. One per process, at most |

If the source makes no claim about a constraint, leave it out. A guessed ① points a team's improvement effort at the wrong place, which is the most expensive mistake this document can make.

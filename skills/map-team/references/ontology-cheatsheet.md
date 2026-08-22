# The ontology, on one page

The full version is `docs/ontology/`, five documents in dependency order. This is what you need while a session is running.

## The one distinction that matters

Everything on the rendered page is either **authored** (someone wrote it) or **derived** (the composer computed it). Confusing the two is the most common authoring mistake, because the derived things are the ones that look most like drawings.

| Derived — never author these | Computed from |
| --- | --- |
| Arrows between activities | one activity's `produces` matching another's `consumes` |
| Handoffs (the emphasised arrows) | an arrow whose two activities share no role |
| Left-to-right position | longest path through the artifact graph — **order, never time** |
| The ① marker's placement | the `constraint:` artifact, found wherever it flows |

If a team asks you to draw an arrow, the answer is to name an artifact.

## Layer 1 — the spine (the team folder + `processes/*.yaml`)

| Term | Is | Lives in |
| --- | --- | --- |
| **Team** | the document; owns the shared catalogs | `team.yaml` + one file per catalog |
| **Process** | one named way work flows (feature, bugfix, incident) | one file in `processes/` |
| **Role** | a hat someone wears; the vertical axis of every figure | `team.yaml` |
| **Artifact** | a named thing work leaves behind; the joints of the process | `artifacts.yaml` |
| **Stage** | a coarse phase label — a map, never a gate | per process |
| **Activity** | the atomic unit: roles + stage + consumes/produces | per process |

```yaml
# team.yaml
name: Acme
version: "0.1"
status: draft            # draft | living — prints in the masthead
note: ...                # optional — one plain line; the caption and the page <meta>
description: ...         # optional — markdown, rendered in the drawer
refs:       [ ... ]      # optional — the sources the document was read out of
                         #   each entry: "<url-or-path>" | { name, url }
roles:      [{ id, name, note?, description? }]        # at least one
```

Each other catalog is a file of its own beside `team.yaml`, holding the one key it is named for. A shelf may instead be written inline in `team.yaml` under that key, but never in both places — `check` fails a shelf declared twice.

```yaml
# artifacts.yaml
artifacts:  [{ id, name, description?, refs? }]         # at least one

# harnesses.yaml
harnesses:  [{ id, name, note?, description?, refs? }]   # optional file

# events.yaml
events:     [{ id, name, description?, refs? }]  # optional file — one plain sentence

# tools.yaml
tools:      [{ id, name, harness, kind, note?, description?, refs? }]   # optional file
```

```yaml
# processes/<process-id>.yaml    ← the file name IS the process id
name: Delivery
note: ...                        # optional — one plain line; the caption and the page <meta>
description: ...                 # optional — markdown, rendered in the drawer
refs:   [ ... ]                  # optional — the sources this process was read out of
                                 #   each entry: "<url-or-path>" | { name, url }
stages: [{ id, name }]           # at least one
constraint: { artifact: <id>, note: ... }   # optional, at most one
activities:                      # at least one
  - id: make-change              # kebab-case
    name: Make a Change
    stage: build                 # must be one of this file's stages
    roles: [engineer]            # at least one, from the team catalog
    consumes: [spec]             # optional
    produces: [change-set]       # at least one
    why: One sentence on why this exists.   # optional, worth writing
    tooling: { ... }             # optional — what does this work today
    open: { need: ... }          # optional — a gap the team declared; excludes tooling:
    recommends: [ ... ]          # optional
    activities: [ ... ]          # optional — sub-activities
```

## Layer 3 — capability fills

| Term | Is |
| --- | --- |
| **Harness** | a runtime the team has: an agentic CLI, CI, a tracker |
| **Tool** | a concrete thing inside a harness. Inventory only — the catalog says *what it is*, never *where it is used* |
| **Fill** | `tooling:` on an activity — capability attached to actual work |
| **Open slot** | `open: { need }` on an activity — a gap the team declared, plus their sentence on what would fill it. Renders dashed. **The roadmap, not an error** |
| **Unclaimed** | an activity with neither. Renders plain, no tooling line. Work the team does itself and has asked for nothing on — never counted as a gap |

```yaml
tooling:
  tool: agent-session          # must exist in the tools catalog
  level: delegated-review      # manual | assisted | delegated-review | gated-autonomous
  usage: ...                   # optional — advice true only here
```

```yaml
open:
  need: >-                     # required — the team's own words on what would fill it,
    Something that turns a report into a runnable case.   # naming the work, not a product
```

Open is declared, never inferred. Stating both `tooling:` and `open:` fails `check`.

The level ladder reads as *where the human stands*: **manual** (doing it) → **assisted** (in the loop) → **delegated-review** (on the loop) → **gated-autonomous** (at the gate).

A tool carries no level in the catalog, deliberately. The same tool is legitimately assisted in one activity and delegated in another.

## Layer 4 — recommendations and events

A **recommendation** is a pointer: another tool worth reaching for here, optionally bound to a moment. It has no identity and **never fills the slot** — an activity with ten recommendations and an `open:` block is still open, and one with ten recommendations and no `open:` is not.

An **event** is a named recurring moment ("the task turns out bigger than planned"). It carries no mechanics; it exists so a recommendation can be attached to a situation rather than a process position.

```yaml
recommends:
  - tool: wayfinder
    event: task-too-big        # optional
    level: assisted            # optional
    usage: ...                 # optional
```

## Layer 5 — recursion

An activity may contain `activities:`. A sub-activity **inherits its parent's stage** (it has no `stage:` field) and keeps every other field. It uses the team's own roles and artifacts. Its children get their own derived order, drawn as a closed sub-picture.

Reach for this when one box on the page is hiding a process of its own — not to express every detail.

## Rules that never bend

- **ids are kebab-case**, matching `^[a-z0-9][a-z0-9-]*$` — `review-verdict`, never `Review Verdict`.
- **The folder name is the team id; each process file name is its process id.** Renaming the file renames the process.
- **Order, never duration.** Horizontal position means dependency depth. Dates, estimates and lead times belong to a different product.
- **Forward-only.** The figure draws the path forward; every reader supplies the rework themselves.

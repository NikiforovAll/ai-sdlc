# Layer 3 — Capability Fills

Layers 1–2 describe a delivery process with no AI in it. This layer is where AI enters — and the central design choice is *how little* it takes: capability attaches to the spine as a **fill** on an activity, one uniform shape everywhere, and a gap the team *declares* is itself a first-class, visible thing.

Five concepts: **Harness**, **Tool**, **Fill**, the **Level ladder**, and the **Open slot** — and, between fill and slot, the third state an activity can be in: neither. Two of them are inventory (harness, tool — things the team *has*); the rest are usage (how the process *uses* them). The model keeps that line hard: **a tool never says how it is used — the blueprint references it.**

---

## Harness

**Definition.** A runtime the team has access to — the environment capability runs *in*: an agentic CLI, a tracker's agent platform, a CI pipeline.

**Why it exists.** "We use AI" is too coarse to plan with, and naming individual features too fine to catalog. The harness is the useful middle: the thing you procure, learn, and standardize on once, inside which many concrete tools live. It's a *team* catalog — the bugfix process doesn't get a different CLI.

**Shape.**

```yaml
harnesses:
  - id: claude-code
    name: Claude Code
    note: Agentic CLI — skills, plan mode, subagents.
  - id: ci
    name: CI Pipeline
    note: Build, test, and release automation.
    description: |-
      The automation that builds, tests, and ships. It is the only harness that
      routinely runs **gated-autonomous**.
```

**How it renders.** The harness name prefixes every fill ("Claude Code · Plan Mode"); FIG.03 PLAYBOOK groups each role's capability by harness; the drawer names it in a chip row. That chip opens the harness panel: `description` as markdown, plus every tool on the shelf that runs in it and how many uses each has. Like a role, the harness carries both a `note` for the figure and an optional `description` for the drawer.

**Invariants & non-meanings.**
- A harness is not necessarily an AI product — the CI pipeline qualifies. The catalog answers "what runtimes can capability live in", and gated automation is capability.
- Declaring a harness claims nothing about usage. A harness no tool lives in is just shelf inventory (and the figures will show exactly that: nothing).

---

## Tool

**Definition.** A concrete usable thing inside a harness: a skill, a built-in mode, an agent, a release gate. Inventory with an id — *what the team has*, never *how it's used*.

**Why it exists.** Tools are what the process actually references, and references need reliable identity. As free text, "plan mode" written three times is three unlinked strings — nobody can ask "where is plan mode used?" and the answer can't be drawn. As a catalog entry, every use of a tool points at one id, and the usage map becomes derivable: every activity that fills with it or recommends it, and — just as telling — the tools nothing uses.

**Shape.**

```yaml
tools:
  - id: plan-mode
    name: Plan Mode
    harness: claude-code
    note: Built-in planning mode.
  - id: release-gate
    name: Release Gate
    harness: ci
```

**How it renders.** The tool name on every fill and recommendation line; the drawer for a tool lists every activity that references it.

**Invariants & non-meanings.**
- **A tool carries no usage.** No roles, no level, no when — those belong to whatever references it. The same tool legitimately appears at `assisted` in one activity and `delegated-review` in another; putting a level on the tool would forbid exactly that.
- A tool lives in exactly one harness. If "the same" capability exists in two harnesses, those are two tools.
- A tool nothing references is visible shelf inventory — a fact worth rendering, not an error.

---

## Fill

**Definition.** The statement that an activity is done with AI leverage: `{tool, level, usage?}` — *with what*, *at what degree of delegation*, and optionally *how it's applied here and what problem that solves*. It fills the activity's capability slot; the harness comes along for free, derived from the tool.

**Why it exists.** One uniform shape means every piece of capability in the document — a top-level activity's fill, a nested sub-activity's, or a recommendation on any of them (Layer 4) — reads the same way and is comparable at a glance. The fields answer the questions the inventory can't: which tool, how much is trusted to it, and what this particular use is *for* — the same tool solves a different problem in every fill, and that difference is exactly what a reader drilling into a node wants to know.

**Shape.**

```yaml
- id: write-tests
  name: Write Tests
  ...
  tooling:
    tool: test-from-criteria
    level: delegated-review
    usage: |
      Generates the test skeleton from the acceptance criteria, one test per
      criterion.

      Solves the drift where tests get written from the change instead of the
      criteria — the suite proves conformance, not behavior.
```

`usage` is markdown, free-form, per-fill. Use the literal block style (`|`) — it preserves the line breaks markdown paragraphs and lists depend on; the folded style (`>-`) collapses them.

**How it renders.** The level caption on the node card ("DELEGATED + REVIEW"); the "harness · tool" line in GRID cells and the drawer (harness derived); a per-role tooling item in PLAYBOOK. The `usage` markdown renders in the drawer only — figures stay dense, prose lives in the detail surface.

**Invariants & non-meanings.**
- The fill states no harness — it can't, and that's the point: the tool implies it, so a contradictory pairing is unstatable.
- Three proses, three homes: the tool's `note` says what the tool *is* (identity, once), the activity's `why` says why the *work* exists, the fill's `usage` says how the tool is applied *here* and what problem that solves. If a sentence would be true for every use of the tool, it belongs on the tool, not in a fill.
- One fill per activity — it names the *primary* way the work is done. A second tool is either a recommendation (Layer 4) or, if it's doing distinct work, two sub-activities wanting to exist (Layer 5).
- A fill is a claim about *practice*, not licensing: "this activity is done this way", not "this tool is available".
- The fill never replaces the role. The activity's `roles:` still name who owns the work; the level says how much of the doing is delegated.

> **Schema status.** Built. D15 landed on 2026-08-15 with the model-v3 migration: the fill is `{tool, level, usage?, asset?, refs?}` and names a catalog entry by id, so the harness is derived and can never contradict the tool. The catalog entry carries no level and no roles — the same tool is assisted in one activity and delegated in another. `usage` is authored as markdown, rendered by the same processor the descriptions use. A `refs` entry is either the address alone or `{name, url}`.

---

## Level ladder

**Definition.** The degree of delegation in a fill, on a four-step ladder: **manual → assisted → delegated-review → gated-autonomous**. Read the other way round, it is the model's human-in-the-loop ladder: the level names say what the machine does, the loop position says where the human stands.

**Why it exists.** "Uses AI" hides the only distinction that matters operationally: who does the work and who checks it. The ladder makes delegation comparable across the whole document — and makes the team's overall HITL posture readable in one scan.

**The steps.**

| Level | The human... | The capability... | Loop position |
|---|---|---|---|
| `manual` | does the work | isn't involved (rare as an explicit fill — usually just no fill) | no loop |
| `assisted` | does the work, steers throughout | accelerates and drafts inside the human's loop | **in** the loop |
| `delegated-review` | reviews the result | does the work, hands back for judgment | **on** the loop |
| `gated-autonomous` | can hold the gate | does the work and proceeds unless stopped | **at** the gate |

The loop position is a derived gloss, not a field — nothing authors it, and it never contradicts the level.

**How it renders.** A four-cell **delegation gauge** — cells ink-filled up to the level reached, hairline-outlined beyond — beside the uppercase level caption on every node and tooling item; the muted level chip in the drawer and PLAYBOOK. The gauge is the glanceable form: ordinal by construction, monochrome, and identical from a FLOW node to a GRID cell, so a GRID row reads as one role's HITL posture and a column as one stage's.

```
▮▮▮▯  DELEGATED + REVIEW      ▮▮▯▯  ASSISTED
▮▮▮▮  GATED + AUTONOMOUS      ▯▯▯▯  OPEN SLOT
```

An activity that is neither filled nor open draws no gauge and no caption. The row is absent rather than empty — an empty gauge says "nothing has reached the first rung", which is a claim, and the third state makes none.

**Invariants & non-meanings.**
- The ladder measures *delegation*, not quality or maturity. `assisted` is not a worse state than `gated-autonomous` — shipping is gated-autonomous and spec-writing is assisted in the reference model precisely because the right level differs per activity.
- It is not a maturity roadmap. Nothing in the model says a team should climb; it says a team should *know where it stands* on each activity.
- Levels are per-fill, not per-tool: the same harness appears at `assisted` in one activity and `delegated-review` in another, and that spread is real information.
- The gauge is an ordinal marker, not a progress bar or a percentage. Three filled cells mean "the third rung", not "75% automated" — the model has no quantities.

---

## Open slot

**Definition.** An activity the team has declared it wants capability on and has not filled, together with the sentence saying what would fill it. Not an omission — a claim.

**Why it exists.** The set of open slots *is the team's roadmap*. A document where gaps are invisible invites the fiction of full coverage; a document where every declared gap announces itself turns "where should we invest next" into reading, and pairs naturally with the ① constraint ("fill the slot at the bottleneck first").

**Shape.**

```yaml
open:
  need: >-                       # required — what the team wants here, in their words
    Something that turns a report into a runnable case — the environment,
    the data and the steps, standing up on demand.
```

`open:` and `tooling:` are mutually exclusive: a slot is open until something fills it, and stating both fails `check`.

**How it renders.** The dashed border + green stripe over washi, with a green "OPEN SLOT" caption and an empty four-cell gauge (no rung reached) — the loudest visual voice a node can have; the open-slots count is the accented stat in the masthead; the drawer's TOOLING section prints the `need:` text under an OPEN SLOT mark; a role whose PLAYBOOK has no tooling says so and stops there, because a slot is declared per activity and a role is not an activity.

**Invariants & non-meanings.**
- **Open is declared, never inferred.** An activity with neither `tooling:` nor `open:` is the third state — work the team does itself and has asked for nothing on. It draws plain, with no tooling line at all, and counts as *unclaimed* rather than open.
- That third state is what the `need:` field buys. Before it, absence of `tooling:` meant "open", so Apply Mitigation — work an incident team deliberately keeps in human hands — was rendered as a gap on the roadmap. Two facts had one shape, and the louder reading won.
- An open slot is a *statement about the present*, not a commitment: "unfilled today", never "planned for Q3". (No dates — the model has no time anywhere.)
- Open ≠ broken, and unclaimed ≠ neglected. Apply Mitigation in the reference model has a recommendation and no slot: a tool is available for one moment, and the work itself stays the team's.
- The `need:` sentence is the team's, not the tool vendor's. It names the work that would be taken off them, not the product that would do it — a slot that names a product has already been filled in someone's head.
- Only the fill can be open. Roles, stages, and artifacts are never "open" — the slot metaphor applies to capability alone.

---

## What you can now say

Where AI actually sits in the process, in one uniform sentence per activity — *this work, in this runtime, with this tool, at this level of trust* — and, just as loudly, where it doesn't sit yet. What this layer can't say is *when* capability applies beyond process position: "use this when the task blows up mid-flight" needs situations, not slots. That's [Layer 4 — Recommendations & events](04-recommendations-and-events.md).

# Layer 4 — Recommendations & Events

Layer 3 gave each activity one fill: *this is how this work is done*. But a team knows more about an activity than its one primary tool — there are plays worth reaching for here, some always, some only when a particular moment strikes. This layer adds those: **Recommendations** are extra tools an activity points at, and **Events** name the moments that call for them.

Nothing in this layer executes. The document is a playbook, not a workflow engine: an event "firing" is a human recognizing a moment, and a recommendation is advice for that moment — never a trigger wired to automation.

Two concepts: **Recommendation** and **Event**.

> **Naming note.** Model v2 called this concept a *skill*, which collided with the tools it recommends (a Claude Code skill like `/grill-me` is a *tool* in this model). Renamed to recommendation in v3.

---

## Recommendation

**Definition.** An entry in an activity's `recommends:` list: *a tool also worth reaching for in this work, optionally when a particular moment strikes.* Shape `{tool, level?, event?, usage?}`.

**Why it exists.** The fill answers "how is this done"; it can only answer it once. Real practice has more than one play per activity — the primary way the work runs, plus the things you reach for when the spec smells wrong or the task turns out bigger than planned. Recommendations carry those without competing with the fill for the single slot that decides whether an activity is open.

**Shape.**

```yaml
- id: implement
  name: Implement
  ...
  tooling:                    # the fill — how the work is done
    tool: edit-loop
    level: delegated-review
  recommends:                 # plays also worth reaching for here
    - tool: plan-mode
      level: assisted
      event: task-too-big
      usage: |
        Stop and re-decompose rather than pushing on. Solves the sunk-cost
        drift where a half-built oversized task gets finished anyway.
    - tool: grill-me
      usage: |
        Sanity-check the acceptance criteria before writing against them.
```

**How it renders.** A "recommended here" panel in the activity's drawer, one line per entry — tool name (harness derived), the gauge and level if stated, the event bolt if situational, and the `usage` prose. FIG.03 PLAYBOOK gathers every recommendation whose activity the role owns, grouped by harness.

**Invariants & non-meanings.**
- **A recommendation has no identity.** No id, no name of its own, nothing references it. It is a pointer from one activity to one tool; the name and harness live on the tool.
- **It states no roles.** Whoever owns the activity owns the recommendation. This is the direct consequence of the inversion: the activity is the anchor, so it supplies the context.
- **The same tool recommended in two activities is two entries**, with different `usage` prose. That duplication is deliberate — advice that is true everywhere is usually the tool's `note`, and advice that is true *here* deserves to be written here.
- **`recommends:` never affects the open slot.** An activity with ten recommendations and no `tooling:` is still an open slot: the fill says how the work is *done*, recommendations say what is *available*. Absence of recommendations means nothing at all.
- **`level` is optional here**, unlike on a fill. Omitting it says "reach for this", not "reach for this at this degree of delegation" — the tool is the advice, the ladder is not always part of it.
- A recommendation adds no edges, no columns, nothing to Layer 2's derivation. It annotates an activity; it never creates flow.

> **Schema status.** The current schema carries the v2 top-level `skills:` catalog with its own ids and a `when:` list pointing at activities. The inversion is decided (D17) and lands with the model-v3 migration; this doc describes the target model.

---

## Event

**Definition.** A named moment the team recognizes recurring in its work: *task bigger than planned*, *spec is ambiguous*, *rework requested*. The team-level catalog of situations a recommendation can name.

**Why it exists.** Situational advice needs situations with names. Without a catalog, "when things go sideways" stays tribal knowledge; with one, the team agrees on which moments recur, describes how to recognize each, and can then attach plays to them. The catalog is team-level because the same moments strike in every process.

**Shape.**

```yaml
events:
  - id: task-too-big
    name: Task bigger than planned
    description: Mid-task the work turns out larger than its plan — stop and re-decompose before pushing on.
```

Referenced by id from a recommendation's optional `event:`.

**How it renders.** A drawn bolt glyph marks event-bound recommendation lines everywhere (PLAYBOOK items, drawer panels) — the bolt is the reserved encoding for "this one is for a moment, not for the work in general".

**Invariants & non-meanings.**
- An event is a *recognizable moment*, not an error, an exception, or a state. `rework-requested` is normal operation — and it is precisely how rework exists in the model at all: Layer 2 never draws rework loops, because rework isn't flow, it's a moment with a play attached.
- Events carry no mechanics: no payload, no severity, no handler. The `description` is a recognition aid for a human.
- **An event is never declared on an activity.** Activities don't have events; recommendations name them. An activity prone to a moment says so by carrying a recommendation for it.
- An event nothing names is a moment with no play yet — the situational cousin of an open slot, and worth rendering as such.
- A moment that recurs in several activities is named once in the catalog and referenced from each. The event is shared; the advice is written per activity.

---

## What you can now express

The full playbook: how each activity is done (the fill), plus what else to reach for there and in which moments (recommendations), with the reasoning attached to each use. One structural idea remains: activities that are themselves made of activities — [Layer 5, Recursion](05-recursion.md).

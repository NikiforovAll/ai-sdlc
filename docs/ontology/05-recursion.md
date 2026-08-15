# Layer 5 — Recursion

Every layer so far treats an activity as atomic. But "Implement" is not one move — it's break the work down, write the change, loop between exploring and testing, then self-review. Zoom in far enough on any activity and you find a process; zoom out far enough and any process is one activity in someone else's picture.

This layer adds the one structural idea that handles both: **an activity may contain activities**. Nothing new is introduced to hold them — a sub-activity *is* an activity, so everything from Layers 1–4 applies unchanged at every depth.

Two concepts: **Sub-activity** and **Sub-process**.

---

## Sub-activity

**Definition.** An activity declared inside another activity's `activities:` list. It has the same shape as any activity — roles, consumes, produces, `why`, `tooling`, `recommends` — minus the one field it inherits: `stage`.

**Why it exists.** Detail has to go somewhere, and both alternatives are worse. Flatten it and the figure explodes: forty nodes in one lane, the coarse shape lost. Drop it and the document lies by omission — the interesting AI leverage is often *inside* an activity, on the edit-test loop rather than on "implement". Nesting keeps the top-level picture readable while the detail stays in the model rather than in a comment.

**Shape.**

```yaml
- id: implement
  name: Implement
  stage: build
  roles: [engineer]
  consumes: [work-plan]
  produces: [change-set]
  activities:
    - id: break-down
      name: Break Down
      roles: [engineer]
      consumes: [work-plan]
      produces: [task-list]
    - id: write-change
      name: Write Change
      roles: [engineer]
      consumes: [task-list]
      produces: [change-set]
      tooling:
        tool: edit-loop
        level: delegated-review
```

**How it renders.** A parent with children carries a "▸ N INSIDE" expander beneath its caption. Expanding opens an inset panel in place — a nested swimlane using the same lanes as the figure around it, so a child's role is read off the same axis as its parent's. Deeper nests indent behind a green left spine.

**Invariants & non-meanings.**
- **No `stage`.** A child lives in its parent's stage, always. Stages label the coarse map; sub-activities are below that resolution, and letting a child leave its parent's stage would make the stage bands meaningless.
- **Roles come from the same team catalog**, and a child's roles need not match its parent's. That is how a handoff *inside* an activity becomes visible — the engineer writes the change, the reviewer checks it, and the nesting shows a boundary the parent node hides.
- **Artifacts come from the same team catalog too.** There is no such thing as a private, sub-process-local artifact — if children pass something between them, it is declared like any other artifact. This is a deliberate cost: it keeps one producer per artifact true document-wide, and it forces intermediate things to be named rather than assumed.
- **Fills and recommendations work identically at any depth.** A sub-activity with no `tooling:` is an open slot, dashed and green, exactly like a top-level one. That is the whole payoff of not inventing a separate "step" concept.
- Nesting is *zoom*, not decomposition-by-obligation. Most activities have no children, and that is not a gap — an activity is nested only when the inside is worth showing.
- Child count is not size, effort, or duration. Four children does not mean bigger than two.

---

## Sub-process

**Definition.** The set of children under one parent, taken together: a complete little process with its own derived structure.

**Why it exists.** The children are not a list — they are a process, and they deserve Layer 2's treatment. The same derivation runs inside the box: consumes/produces are matched among siblings, edges appear, ordinal order falls out, handoffs are detected where a child's roles don't overlap its neighbor's. Recursion is only worth having if the inner picture is as honest as the outer one, and that means reusing the derivation rather than hand-drawing the inside.

**Shape.** No shape of its own — it is the `activities:` list. There is nothing to author beyond the children themselves.

**How it renders.** The inset panel: a nested swimlane with its own columns, derived independently of the outer figure's columns.

**Invariants & non-meanings.**
- **Derivation stops at the boundary.** A child's edges are matched only against its siblings — never against activities outside the parent, and never against a cousin in another parent's sub-process. A sub-process is a closed picture.
- **The parent's contract stands on its own.** The parent declares its own consumes/produces, and those are what the outer flow uses. The model does not check that the children's inputs and outputs add up to the parent's; if they disagree, the document is telling two stories and a reader should notice.
- **The parent's position is unaffected by its children.** Expanding a node changes nothing about ordinal order outside it — the outer columns are derived from the outer activities, full stop.
- **Depth is unbounded.** A child may have children. Nothing in the model caps it; readability does.
- A sub-process is not a phase, a sprint, or a stage. It is the inside of one piece of work.

---

## What the whole model can now say

Everything: a team, the processes it runs, the work each is made of, the flow nobody authored, where AI sits and where it doesn't yet, what to reach for and when — at every level of zoom, in one uniform vocabulary that never grows a special case for depth.

That is the ontology. The [overview](00-overview.md) collects it into one map and one glossary.

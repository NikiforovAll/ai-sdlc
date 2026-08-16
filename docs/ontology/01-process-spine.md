# Layer 1 — The Process Spine

The spine is everything a team document says about *how work flows*, before any AI enters the picture. Six concepts: **Team**, **Process**, **Role**, **Stage**, **Activity**, **Artifact**. If you stop after this layer you have a complete, renderable delivery process — just one with no tooling in it.

The load-bearing idea: **you never author the flow**. You author activities and what they consume and produce; the flow — arrows, order, handoffs — is derived from artifact names matching up (see [Layer 2](02-derived-structure.md)).

---

## Team

**Definition.** The document itself: one YAML file, one team. The team owns the shared catalogs — who we are (roles), what we pass around (artifacts), what we have (harnesses and tools), what happens to us (events) — and runs one or more processes over them.

**Why it exists.** The unit of comparison and evolution is a team's *whole* way of working, not a single practice. One file means it can be versioned, diffed, and copied as a starting point for another team — and the catalogs are declared once, because a bugfix process doesn't have different people or different tools than the feature process.

**Shape.**

```yaml
name: Reference Delivery Team
note: >-
  A vendor-neutral reference for how a small product team delivers changes.
description: |-
  Markdown. What this document assumes, how to read it, what it is honest about.
version: "0.2"
status: living   # living | draft
```

**How it renders.** The masthead: team name, version, status, and a stat strip counting everything the document contains. The `note` is the page's `<meta name="description">`; the `description` is markdown the team drawer renders under an **About** heading.

**Invariants & non-meanings.**
- `status: living` is the normal state — the document is expected to change as the team does. `draft` marks a document not yet in use.
- `note` and `description` mean the same two things here as on a role: caption versus what a reader gets after stopping. The split reaches every entity in the model, the two documents included.
- A team document describes *one* team. Shared practice across teams is expressed by copying, not by referencing another document.

---

## Process

**Definition.** One named way work flows through the team: the feature path, the bugfix path, the incident path. A process owns its stages, its activities, and (optionally) its ① constraint; everything else it borrows from the team's catalogs.

**Why it exists.** Real teams run more than one kind of work, and the kinds genuinely differ in shape — a bugfix has no spec-writing, an incident has no planning. Forcing them into one figure produces a diagram nobody's work actually follows. Separate processes over shared catalogs keeps each figure honest without duplicating who the team is.

**Shape.**

```yaml
processes:
  - id: feature
    name: Feature
    stages: [...]
    constraint: { artifact: evidence-pack, note: ... }
    activities: [...]
  - id: bugfix
    name: Bugfix
    stages: [...]
    activities: [...]
```

**How it renders.** A process switcher beside the view tabs; FLOW, GRID, and PLAYBOOK all scope to the selected process. A process carries the same `note` / `description` pair the team does: the `note` is the caption under its name in the overview's process index and the page's `<meta>`, and the `description` is markdown, rendered in the drawer that opens from the masthead — the one place a process has room to say what it assumes and why its stages are in that order.

**Invariants & non-meanings.**
- Processes are independent: there is no cross-process flow, and nothing in one process orders or gates another.
- Ids (activities, artifacts) are unique across the *whole document*, not per process — nothing has to qualify a reference by process.
- Processes share catalogs, never activities. If two processes do "the same" implementation work, each declares its own activity — their inputs differ, and that difference is the point.

> **Schema status.** The current schema carries a single implicit process (the document's top-level `stages:`/`activities:`/`constraint:` *are* the feature process). The `processes:` shape is decided (D14) and is the next build step; this doc describes the target model.

---

## Role

**Definition.** A hat someone on the team wears — a locus of ownership, named by what it owns.

**Why it exists.** Handoffs (Layer 2) are only detectable if activities declare who does them. Roles also give every figure its vertical axis: swimlanes in FLOW, rows in GRID and PLAYBOOK.

**Shape.**

```yaml
roles:
  - id: engineer
    name: Engineer
    note: Owns the change and its proof.
    description: |-
      Turns a spec into a change set and the evidence that it works.

      This is where delegation runs highest — implementation is the work most
      safely handed over, provided the proof comes back with it.
```

**How it renders.** A swimlane per role in FIG.01; a row per role in FIG.02 and FIG.03. The role filter chips at the top of the page are this list. The `note` is the one-line ownership statement shown beside the role name. The lane name opens a drawer panel that renders `description` as markdown, followed by every activity the role owns and the level each one runs at.

**Invariants & non-meanings.**
- A role is not a person or a headcount. Two people can share a role; one person can hold three.
- Declaration order matters: it is the top-to-bottom lane order in FIG.01.
- Write the `note` as an ownership claim ("Owns intent"), not a job description.
- `note` and `description` are not the same field at two lengths. `note` is the caption a figure prints in a lane; `description` is what a reader gets after stopping on the role, and only the drawer shows it.

---

## Stage

**Definition.** A named phase of delivery that groups activities: Define, Plan, Build, Verify, Ship.

**Why it exists.** Pure activity graphs are legible to their author and nobody else. Stages give readers a coarse map — "we're talking about the Build part" — without adding any semantics to the flow itself. Each process declares its own stages: the bugfix path may open with Triage where the feature path opens with Define.

**Shape.**

```yaml
stages:
  - id: build
    name: Build
```

**How it renders.** A column per stage in FIG.02, and a kicker above the name on every FIG.01 node. FIG.01 does *not* band its columns by stage: a stage's activities land at whatever depths their dependencies dictate, and those ranges overlap between stages, so no band could cover one stage's boxes without covering another's. FIG.01's columns are ordinal steps; the stage rides on the box.

**Invariants & non-meanings.**
- A stage is a *label on activities*, not a container with rules. Nothing is enforced at stage boundaries; nothing "moves through" stages.
- Stages do not order the flow. Order comes from artifacts (Layer 2). If a Verify activity consumes nothing from Build, nothing stops it starting first — and the figure will show that.
- Declaration order is the display order — FIG.02's column order, and the reading order of the catalog. It is *not* a claim that stage N finishes before stage N+1 starts; the ordinal columns routinely show two stages side by side.

---

## Activity

**Definition.** The atomic unit of a process: a named piece of work, done by one or more roles, in one stage, that consumes artifacts and produces at least one. Every activity belongs to exactly one process.

**Why it exists.** Everything in the model hangs off activities: flow is derived from their consumes/produces, AI capability attaches to them (Layer 3), they recommend further tools and name the moments that call for them (Layer 4), and they nest (Layer 5).

**Shape.**

```yaml
activities:
  - id: review-conformance
    name: Review Conformance
    stage: verify
    roles: [reviewer]
    consumes: [evidence-pack, acceptance-criteria]
    produces: [review-verdict]
    why: The review judges evidence against criteria — not the diff against taste.
```

**How it renders.** A node card in every figure. In FIG.01 it sits in its roles' lane(s) — an activity with two roles spans both lanes — at the column its dependencies dictate. Clicking a node opens the detail drawer.

**Invariants & non-meanings.**
- `produces` is mandatory and non-empty. An activity that produces nothing is invisible to the flow and to reviewers of the process — if it matters, name what it leaves behind.
- `consumes` is a claim about *inputs required*, not a schedule. "Consumes the spec" means "cannot meaningfully happen without the spec", not "starts when the spec is done".
- The `why` is the activity's reason to exist, written to survive an argument ("Criteria that never became tests are opinions, not gates"). If you can't write one, the activity may be ceremony.
- An activity's position on screen is entirely derived; there is no way to author "this one goes first".

---

## Artifact

**Definition.** A named, inspectable thing that work leaves behind: a spec, a change set, an evidence pack. Artifacts are the joints of the process — every connection between activities is an artifact changing hands.

**Why it exists.** This is the model's central bet: **processes connect through things, not through sequences**. Declaring "Implement comes after Plan Work" is an opinion; declaring "Implement consumes the work-plan that Plan Work produces" is a checkable fact, and the sequence falls out of it.

**Shape.**

```yaml
artifacts:
  - id: evidence-pack
    name: Evidence Pack
    description: |-
      What proves the change does what it claims: test runs, checks, and the
      output a reviewer would otherwise have to reproduce by hand.
```

Then referenced by id from activities' `consumes:` / `produces:` lists.

**How it renders.** Edge labels between nodes in FIG.01; the consumes/produces lists in the drawer, each line naming its producer or consumers. Both are clickable: an artifact has its own drawer panel with `description` rendered as markdown, its producers, and its consumers — the whole chain the edge label can only hint at.

`description` is optional and states what the thing *is*, in the team's own words. Say what would be true of a good one, not how it is produced — the activities already say that.

**Invariants & non-meanings.**
- An artifact must be *inspectable* — someone could open it and judge it. "Alignment" is not an artifact; "acceptance criteria" is.
- One producer per artifact. If two activities both claim to produce `spec`, the model is ambiguous — split the artifact into two named things.
- An artifact declared but never produced or consumed is dead weight; the composer will render nothing for it.
- Artifacts carry no state or lifecycle in the model. Whether the spec is "approved" is a team practice, not a property of the ontology.

---

## What you can now write

A complete, tooling-free team document: name the team, list roles with ownership notes, list every inspectable thing your team passes around, then for each way work flows — feature, bugfix, whatever your team really runs — declare a process with its stages and activities that consume and produce those things. Render it — the flow you never authored appears. That derived structure is [Layer 2](02-derived-structure.md).

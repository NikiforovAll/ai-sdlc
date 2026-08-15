# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Astro with content collections (decided pre-init as D3 in `_scratchpads/design/decisions.md`): zod-validated YAML collections, static site, interactive projections as islands, hot reload on YAML edits.

## Users

- **Coach / process designer** — authors a team's process YAML and runs live mapping sessions: edits the YAML on a screen-share while the rendered site hot-reloads beside it. The site has no write path; the editor is the editor. A new team starts from `ai-sdlc new <dir>` (a minimal renderable skeleton) and the `map-team` skill, which conducts the session's interview and writes the YAML as the team talks — see `_plans/spec-authoring.md`.
- **Team members** — read the rendered site to understand how their project works and how AI is utilized: which activities exist, who does them, what artifacts flow between them, which capability slots are filled with tools and which are open.

## Product Purpose

ai-sdlc is a composer of project delivery processes. A single YAML document describes how a team's project works and how AI is utilized (activities, roles, artifacts, tooling fills); the composer renders it into an interactive visualization with multiple projections (flow swimlane, stage×role grid). Success for the current prototype: firm up the D11 activity-based model — seeing real projections rendered from real YAML tells us whether the schema holds up. The prototype is an instrument, not a showcase.

## Positioning

No exact prior art exists (research 2026-08-13): {stage×role matrix + YAML source + interactive click-through + per-team documents + AI-delivery vocabulary} is an empty niche. Unlike generic diagram tools, the schema is domain-opinionated (D2): it hard-codes the SDLC ontology (stage, role, artifact, activity, delegation level, constraint), so users supply instances, not concepts. Unfilled capability slots render as visible open slots — "empty cells are the roadmap" is structural, not editorial.

## Operating Context

- Source of design truth: `_scratchpads/design/decisions.md` (D1–D12 + principles) and `_scratchpads/design/ideas.md` (parked/rejected ideas — do not pull into scope).
- The team document is one YAML file (D12); packs are the one external reference but are **deferred entirely for the prototype** (user decision 2026-08-14).
- Mapping-session ritual (D9): screen-share editor + browser side by side; edit YAML, page hot-reloads.
- Generalized from a hand-written `ai-factory-blueprint.html` in the airun-coach-cockpit repo (8×8 grid, delegation glyphs, ① constraint marker, problem catalog).

## Capabilities and Constraints

- **Document, not timeline.** Sequence is ordinal — topological sort of artifact edges. No durations, calendar, or lead-time metrics; anything VSM-shaped is out.
- **Forward-only DAG.** Rework/back-edges are never drawn — assumed by any reader.
- **Core entity is the activity** (D11): performed by roles, sits in a stage, consumes/produces artifacts, addresses problems, optional tooling fill. Handoffs are derived (artifact edge crossing a role boundary), never authored. The flow swimlane and the stage×role grid are two projections of the same YAML.
- **Capability slots + tool fills** (D8): an activity without tooling renders as an open slot (dashed). Delegation level is per-activity fill.
- **One global view** (D10): role is a filter (dim others), not separate pages; progressive drill-down L0 grid → stage/cell → activity → tool.
- **Theory of constraints:** a single ① marker is a first-class model field; may mark a handoff edge.
- **Read-only site** (D9): interactivity is navigational only — no in-browser editing, no export.
- **Vendor-neutral** (D4): no EPAM/LEAP vocabulary or any client/team/people data from airun-coach-cockpit in this public-leaning repo.
- Undecided product facts: repo name (`ai-sdlc` collides on GitHub), license, delegation ladder naming (current working set: manual / assisted / delegated+review / gated-autonomous), how much of the problem catalog migrates.

## Evidence on Hand

- Prior-art report: `~/dev/airun-coach-cockpit/_scratchpads/fable-ai-factory/research-prior-art-sdlc-composer.md`.
- Original blueprint being generalized: `~/dev/airun-coach-cockpit/_scratchpads/fable-ai-factory/ai-factory-blueprint.html` + `01-blueprint-spec.md` (reference/anti-reference only — its content is private).
- Sideshow session "ai-sdlc composer design" (id UY9SB8Jl7wA) holds reactable sketches; latest post w3GXId2_AlA shows the sequenced flow + grid projections.
- No testimonials, benchmarks, or customer claims exist; do not fabricate any.

## Product Principles

- **Every mark earns its ink.** If a reader would assume it, don't draw it. Derived/implicit mechanics stay out of the picture.
- **The prototype is an instrument.** Build cheap, expect churn; encodings and layouts are candidates to test, not settled decisions.
- **Projections, not pages.** One model, multiple derived views; nothing is authored twice.
- **Open slots are the roadmap.** The gap between blueprint and fill is the product's most honest signal — keep it visible.
- **Order, never duration.**

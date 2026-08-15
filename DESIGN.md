---
name: ai-sdlc composer
description: One YAML team document rendered as a dense, hairline-ruled mosaic of process figures
colors:
  paper: "#ffffff"
  ink: "#111111"
  signal-green: "#0f6b3c"
  mint-on-ink: "#7fd6a8"
  hairline: "#dadada"
  surface: "#f2f2f2"
  washi: "#f7f7f7"
  sub: "#666666"
  muted: "#999999"
  hatch: "#e4e4e0"
typography:
  display:
    fontFamily: "Archivo Variable, Archivo, Yu Gothic, sans-serif"
    fontSize: "clamp(26px, 4vw, 56px)"
    fontWeight: 800
    lineHeight: 1.02
    letterSpacing: "-0.015em"
  headline:
    fontFamily: "Archivo Variable, Archivo, Yu Gothic, sans-serif"
    fontSize: "28px"
    fontWeight: 800
    lineHeight: "30px"
  subhead:
    fontFamily: "Archivo Variable, Archivo, Yu Gothic, sans-serif"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: "20px"
  body:
    fontFamily: "Archivo Variable, Archivo, Yu Gothic, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "16px"
  label:
    fontFamily: "Archivo Variable, Archivo, Yu Gothic, sans-serif"
    fontSize: "10px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.08em"
  micro:
    fontFamily: "Archivo Variable, Archivo, Yu Gothic, sans-serif"
    fontSize: "9px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.06em"
spacing:
  hair: "1px"
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "12px"
components:
  tab:
    backgroundColor: "{colors.signal-green}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    padding: "5px 8px 4px"
  tab-quiet:
    backgroundColor: "{colors.washi}"
    textColor: "{colors.sub}"
    typography: "{typography.label}"
    padding: "5px 8px 4px"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.micro}"
    padding: "3px 5px 2px"
  chip-muted:
    backgroundColor: "transparent"
    textColor: "{colors.sub}"
    typography: "{typography.micro}"
    padding: "3px 5px 2px"
  chip-inverse:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.micro}"
    padding: "3px 5px 2px"
  module:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
  activity-node:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    padding: "7px 8px"
  activity-node-hover:
    backgroundColor: "{colors.washi}"
    textColor: "{colors.ink}"
    padding: "7px 8px"
  activity-node-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    padding: "7px 8px"
  activity-node-open:
    backgroundColor: "{colors.washi}"
    textColor: "{colors.ink}"
    padding: "7px 8px"
  filter-chip:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    padding: "6px 10px 5px"
  filter-chip-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    padding: "6px 10px 5px"
  view-button-active:
    backgroundColor: "{colors.signal-green}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    padding: "7px 12px 6px"
  process-card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    padding: "14px 16px 16px"
  catalog-row:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    padding: "7px 8px 6px"
  catalog-row-alt:
    backgroundColor: "{colors.washi}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    padding: "7px 8px 6px"
  process-switch:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    padding: "6px 10px 5px"
  process-switch-current:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    padding: "6px 10px 5px"
---

# Design System: ai-sdlc composer

## Overview

**Creative North Star: "The Dense Mosaic"**

A whole reading lives on one screen: a full-bleed mosaic of hairline-ruled, tabbed modules packed edge to edge, in the spirit of Japanese contemporary high-density web design. It refuses the airy sidebar-and-cards internal-tool dashboard. Nothing floats, nothing is rounded, nothing wastes a pixel; density is a feature, and the 1px gray hairline is the primary structural material.

The team document is two page types cut from the same mosaic. The **document page** is the catalog: the team's stat strip, one card per process, and the shared catalogs (roles, harnesses, artifacts, events, skills) as ruled row lists. A **process page** is the reading of one process: no document-wide stats, a process switcher instead, and the three figures. Both are the same material at different zoom.

The page is a printed process figure that happens to be interactive. Every module is a numbered figure (FIG.01 / FIG.02 / FIG.03) with a green tab, an uppercase title, and a right-aligned micro-caption. Ink (#111111) on paper (#ffffff) carries all content; a single utility green appears only as tabs and signals; everything else is a gray. Interaction is stated in the materials themselves: hover washes to washi, selection inverts to solid ink and stays inverted, filtering dims to 22% opacity, and unfilled capability renders as a dashed, green-striped slot.

The system encodes meaning, not decoration. Dashed + stripe = open slot (the team's roadmap). ① = the single constraint. A bolt glyph = a workflow event. A ghost pane = filtered out of the lens. A 45° hatch = an idle band. Horizontal order is ordinal (topological), never time; rework is assumed and never drawn.

**Key Characteristics:**
- Edge-to-edge module mosaic ruled by 1px hairlines; zero border-radius, zero decorative shadows
- One compact gothic (Archivo) at a strict 56/28/16/12/10/9 scale, tabular numerals everywhere
- Green (#0f6b3c) reserved for tabs and semantic signals; ink inversion is the selection voice, washi wash the hover voice
- Dense micro-typography: uppercase labels, wide tracking, 9-10px captions doing real work
- Every visual device is a semantic encoding readable without a legend

## Colors

A near-monochrome utility palette: ink on paper, four grays for structure and hierarchy, and one deep utility green that is always a signal, never a wash.

### Primary
- **Signal Green** (#0f6b3c): the only chromatic voice. Used for module/figure tabs, the active view button, open-slot markers ("OPEN SLOT", dashed borders' stripe fill), the ① constraint glyph and constraint edge, event text and bolt glyphs, expand affordances ("▸ N INSIDE"), the scroll hint, focus outlines, and link hover. Never used as a page or panel background.
- **Mint On Ink** (#7fd6a8): the green's legibility variant for accent text sitting on solid ink (the ① inside the inverted constraint strip; event lines inside a selected, inverted card). Only ever appears on `ink`.

### Neutral
- **Paper** (#ffffff): module and node background; the content ground.
- **Ink** (#111111): all primary text; solid borders on interactive nodes; the inversion background for `aria-current` selection, the ① constraint strip, and text selection.
- **Hairline** (#dadada): the structural material — every module border, table rule, lane divider, and section rule is 1px of this.
- **Surface** (#f2f2f2): the page background behind the mosaic (visible only in the 8-10px seams).
- **Washi** (#f7f7f7): quiet fill — alternating stage bands, table headers, quiet tabs, open-slot base fill, hover wash on light buttons.
- **Sub** (#666666): secondary text (captions, notes, metadata) and the default handoff edge stroke.
- **Muted** (#999999): tertiary text (ghost panes, counts) and dashed open-slot borders; #bbbbbb strokes same-role (non-handoff) edges.
- **Hatch** (#e4e4e0): the 45° idle-band hatch line inside the flow figure.

### Named Rules
**The Green Is A Signal Rule.** Green never fills an area larger than a tab. It marks exactly six things: figure/section tabs, the active view, open slots, the ① constraint, workflow events, and expand/scroll affordances. A screen with green paragraphs or green panels is off-world.

**The Ink Inversion Rule.** Persistent state is spoken by inverting to solid ink with white text — `aria-current` selection, the active filter chip and view button, the constraint strip. Transient hover only washes to washi (dashed open slots darken their border to ink instead, since their base is already washi). No tints, no glows, no colored highlights.

## Typography

**Single Family:** Archivo Variable (fallbacks Archivo, Yu Gothic, sans-serif) — one compact gothic for everything, with `font-variant-numeric: tabular-nums` set globally.

**Character:** Compressed, utilitarian, editorial-schematic. Hierarchy comes from weight (400 → 600/700 → 800), case, and tracking — not from many sizes. Uppercase + wide tracking marks structure; sentence case marks prose.

### Hierarchy
- **Display** (800, clamp(26px, 4vw, 56px), lh 1.02, tracking -0.015em, uppercase): the masthead team name only.
- **Headline** (800, 28px, lh 30px): the eight stat-strip numerals.
- **Subhead** (700-800, 16px): drawer panel titles and playbook role names (roles uppercase).
- **Body** (400, 12px, lh 16-17px): prose — descriptions, drawer "why" text, lane names (bold uppercase at this size). Node titles use an 11px/13px bold step of this role.
- **Label** (700, 10px, tracking 0.06-0.1em, uppercase for structural uses): tabs, module titles, view buttons, filter chips, drawer metadata.
- **Micro** (600-700, 9px, tracking 0.04-0.1em): the workhorse caption size — chips, node level lines, stage metadata, artifact labels, lane notes, section labels, ghost panes.

### Named Rules
**The Strict Scale Rule.** Sizes come from 56/28/16/12/10/9 (plus the 11px node-title step). No intermediate sizes; hierarchy is carried by weight, case, and tracking.

**The Uppercase Structure Rule.** Anything that names structure — tabs, titles, labels, levels, role names, "OPEN SLOT" — is uppercase with letter-spacing. Explanatory prose is never uppercase.

## Layout

Full-bleed vertical stack: `main` has 10px page padding and an 8px gap between modules; modules span the full width with no max-width container.

Two page orders, one stack. **Document page:** masthead (tab strip / display name / description / 8-column stat strip), the PROCESSES module (an `auto-fit minmax(340px, 1fr)` grid of process cards divided by vertical hairlines), then the CATALOG grid (`auto-fit minmax(320px, 1fr)`, 8px gaps, the skills module spanning full width). **Process page:** masthead (PROCESS tab / up-link to the team / source path / activity + stage count), the display process name, the process-switcher row, the VIEW + LENS bar, then FIG.01 full width. Document-wide stats appear only on the document page; a process page states its own counts in the masthead strip instead.

Inside modules, structure is drawn, not spaced: 1px hairlines divide every region, borders collapse (tables use `border-collapse`, adjacent cells share rules), and outermost edges drop their border so the module's own 1px frame is the only edge. Internal padding is tight and consistent: 6-8px in dense heads and cells, 10-14px in reading surfaces (masthead body, drawer, playbook roles).

The flow figure is a fixed-geometry canvas (150px role gutter, 150px columns, 96px lane units, 126×60px nodes, 36px stage-band header) that grows to content width inside an `overflow-x: auto` scroller; the grid table does the same with a min-width of 860px. Below 900px a green "scroll →" hint appears in the figure head; below 860px the stat strip reflows 8 → 4 columns, the view group takes its own row, process cards trade their left hairline for a top one, the stage run drops below the switcher, and catalog row usage tags move to their own line; below 640px a module head's right-aligned meta caption wraps to a full-width second line instead of squeezing the title. Sequence along the x-axis is topological order of artifact edges — ordinal, never time — and parallel activities stack vertically within a lane, growing the lane, rather than overlapping.

**The Ordinal-Not-Time Rule.** Horizontal position encodes dependency order only. Nothing may imply duration, dates, or a timeline; rework loops are assumed to exist and are never drawn.

## Elevation & Depth

Flat. No decorative shadows anywhere; depth is conveyed by hairline rules, washi-vs-paper fills, and ink inversion. The single sanctioned shadow is functional: the sub-process inset overlay carries a white halo (`box-shadow: 0 0 0 6px rgba(255, 255, 255, 0.94)`) whose only job is to separate the overlay from the lane content it occludes — an opaque margin, not a lift.

**The Shadowless Rule.** Surfaces never lift. If two layers must separate, use a solid 1px ink border and, for true overlays only, the white halo.

## Shapes

Everything is a rectangle with square corners; border-radius is 0 throughout and no rounding token exists. Form language is line-drawn: 1px hairline (#dadada) for passive structure, 1px solid ink for interactive nodes and the drawer edge, 1px dashed muted for open slots, 2px solid green for the constraint edge and nested sub-flow spines. The 135° green stripe texture (`--stripe`, 12%-alpha green, 1px stripes on a 6px period) fills open slots over a washi base; a 45° hatch of #e4e4e0 lines fills idle stage×lane cells. Flow edges are cubic bezier curves in SVG; glyphs are drawn or typographic (▸/▾ expanders, ✕ close, ① constraint, an inline SVG bolt) — no icon font, no icon library.

**The Semantic Texture Rule.** Dashed border + green stripe fill = open slot = the team's roadmap; 45° gray hatch = idle band ("empty but claimed"); ① = the single constraint; bolt = workflow event; ghost pane = outside the current lens. These encodings are reserved — never reuse them decoratively, and never invent a second texture for a new meaning without adding it here.

## Components

### Tabs
The world's signature label. Solid signal-green block, white 10px/700 uppercase text with 0.08em tracking, `padding: 5px 8px 4px`, square. Names every module (FIG.01, DETAIL, TEAM DOCUMENT), every stage band, and the VIEW group. The quiet variant (`tab--quiet`, washi background, sub text) labels secondary groups like LENS. Tabs are the accent's home; they are labels, not buttons.

### Modules
White panel, 1px hairline border, no radius, no shadow. Head row: tab + uppercase 10px title + right-aligned 9px uppercase meta caption, separated by a 1px bottom hairline, `padding: 6px 8px 6px 6px`. Every top-level surface (masthead, bar, figures) is a module in the stack.

### Chips
9px uppercase micro-tags with `padding: 3px 5px 2px`. Three voices: default (1px ink border, transparent), muted (hairline border, sub text — automation-level tags), inverse (solid ink, white text — the leading stage/harness tag in drawer chip rows). Chips are static metadata; the interactive filter chips in the LENS bar are larger (10px, `6px 10px 5px`), invert to ink when active, and wash to washi on hover.

### Activity Nodes
The atomic unit across all three figures: white card, 1px solid ink border, left-aligned, stacked 11px/700 name over a 9px level caption (automation level, or "OPEN SLOT"). Hover washes to washi; `aria-current` selection inverts to ink/white (captions shift to hairline gray). The open variant swaps to dashed muted border, washi base, green stripe fill, and a green bold "OPEN SLOT" caption. Nodes with children carry a green "▸ N INSIDE" expander line beneath (9px/700, turns ink when expanded).

### Figures
- **FIG.01 Flow** — swimlanes: alternating white/washi stage bands with stacked stage-tab annotations (tab + "N ACT · N HANDOFF" micro-meta), 150px role gutter with lane name + note, bezier handoff edges (gray #666666 for handoffs, #bbbbbb same-role, 2px green for the constraint), white-bordered artifact labels pinned at edge midpoints (constraint labels get green border + ① glyph), idle cells hatched. The single constraint is restated in a full-width ink-inverse strip below the canvas, its ① set in mint. Sub-process expansion opens an absolutely positioned white inset (1px ink border, white halo) containing a recursive nested swimlane; deeper nests indent behind a 2px green left spine.
- **FIG.02 Grid** — stage × role table: washi header row of stage tabs, role rows with name + note, activity nodes stacked inside hairline cells, collapsed borders with outer edges removed.
- **FIG.03 Playbook** — per-role reading surface: role head (16px name, note, right-aligned counts), then harness cards (hairline border, washi-free white) in an auto-fit grid (min 240px), each listing skill items (ink-border buttons with name + level chip + tooling line + when-lines) and fill items (hairline border). Event-triggered when-lines are green + bold with the inline SVG bolt; roles with no tooling state it as an open-slot sentence.

### Drawer
Fixed right panel, `width: min(400px, 94vw)`, full height, white with a 1px solid ink left edge, z-index 40 — no scrim, no slide animation. Module head with DETAIL tab and a "CLOSE ✕" text button. Body: hairline-ruled sections (Consumes / Produces / Tooling / Sub-process / Recommended skills, or When / Refs for skills) with 9px uppercase section labels; handoffs, ① marks, and bolt events reuse the global encodings. Opens from any activity or skill button; Escape or CLOSE dismisses.

### Ghost Panes
Under a role lens, the playbook does not dim: non-matching role sections collapse to a single-line ghost pane — muted uppercase role name + "outside the current lens" — at full opacity. Everywhere else, non-matching `[data-roles]` elements dim to 22% opacity and interactive ones lose pointer events.

### Navigation (VIEW / LENS bar)
One module row: left, the VIEW group (green tab + three two-line buttons: 10px/800 tracked label over a 9px hint, hairline-separated, active = solid green); right, the LENS group (quiet tab + filter chips + a right-aligned readout counting activities in scope). Views swap by `data-view` on `main`; the lens sets `data-role`.

### Process Cards
The document page's entry to a process, and the only place the display step is used outside a masthead. A cell of the PROCESSES grid (`auto-fit`, min 340px), 14px/16px padding, separated from its neighbour by a 1px vertical hairline (horizontal below 860px) and by nothing else — no card border, no shadow, no gap. Stack: a link line pairing the 28px/800 uppercase process name with a 16px muted `→`, the 12px description at ≤56ch, a stage run (9px uppercase stage names joined by muted `→` separators), a hairline-topped number strip (16px/800 count over a 9px uppercase label: activities, stages, open slots — the open count in green), and, when the process declares one, the ① constraint on a washi band. Hover moves the whole link at 0.14s `--ease-out`: name and arrow turn green, the name grows a 2px green underline, the arrow slides 4px right.

### Catalog Rows
How the document page states a catalog (roles, harnesses, artifacts, events, skills). A borderless list inside a module: each row is a 7px/8px band with a 1px hairline bottom rule, zebra-filled washi on even rows, last row unruled; the tight variant drops to 5px/8px. Row grammar: 12px/700 name, then the 9px muted id, then a right-aligned 9px uppercase usage tag naming where the entry is actually used ("FEATURE · BUGFIX", or "shelf inventory" / "unused" / "no play yet" when nothing uses it). The note is a 10px sub-color line that takes its own full-width row. Below 860px the usage tag drops to its own line and wraps.

### Process Switcher
The process page's sibling navigation, a hairline-topped row under the display name: a quiet PROCESSES tab, one link per process in the team (10px/700 uppercase, 1px ink border, washi on hover, inverted to solid ink for `aria-current="page"`), and a right-aligned stage run of the current process. It is the filter-chip shape doing navigation, so the page's own position reads the same as an active filter. The masthead also carries an up-link to the document page ("↑ TEAM NAME", 10px uppercase, hairline underline that turns green on hover).

### Motion
Two speeds only: 0.12s ease-out for hover washes and selection inversion on nodes, chips, and buttons (0.14s `--ease-out` on the process card's link, the one place a mark also moves — a 4px arrow slide); 0.28s `cubic-bezier(0.16, 1, 0.3, 1)` (`--ease-out`) for filter dim/undim opacity across lanes, edges, labels, and rows. No entrance animations, no transforms, no easing flourishes.

## Do's and Don'ts

### Do:
- **Do** frame every new surface as a tabbed module: green tab, uppercase 10px title, 9px right-aligned meta, 1px hairline frame and internal rules.
- **Do** speak state by ink inversion (#111111 bg, #ffffff text) and quiet hover by a washi wash; keep both at 0.12s ease-out.
- **Do** reuse the semantic encodings exactly: dashed+stripe open slot, ① constraint, SVG bolt event, ghost pane, 45° idle hatch, 22% filter dim.
- **Do** keep captions working: 9px uppercase micro-text with 0.04-0.1em tracking carries counts, sources, and derivations on every module.
- **Do** let wide figures grow inside their own `overflow-x: auto` scroller with a green "scroll →" hint at ≤900px; the page never scrolls horizontally.
- **Do** divide a grid of peers (process cards, catalog rows) with a shared 1px hairline, not with borders and gaps; the seam is the divider.
- **Do** state where a catalog entry is used in its row's right-aligned micro tag, and say so plainly when nothing uses it ("shelf inventory", "unused", "no play yet").

### Don't:
- **Don't** round a corner, add a decorative shadow, or introduce a gradient; the only sanctioned shadow is the inset overlay's white halo.
- **Don't** use green as a fill, background wash, or body-text color; it is a tab-and-signal ink only, with #7fd6a8 as its sole on-ink variant.
- **Don't** imply time on any axis — no timelines, durations, dates, or drawn rework loops; sequence is topological order only.
- **Don't** introduce a second typeface, an icon set, or sizes outside 56/28/16/12/10/9 (+11px node titles).
- **Don't** float modules in whitespace or cap the page width; the mosaic runs edge to edge with only 8-10px seams of surface gray.
- **Don't** repeat document-wide totals on a process page; a process states its own counts, and the document page owns the team's stat strip.

---
name: run-ai-sdlc
description: Use when the user wants to run, serve, build, export, screenshot, smoke-test, or otherwise drive the ai-sdlc site — a team folder of YAML rendered as three interactive figures. Covers the dev server, the ai-sdlc CLI (serve/export/check), the one-file HTML export, and browser-driven verification of the drawer, view switch, and role filter.
---

# Running ai-sdlc

An Astro 5 static site that renders one team folder — `team.yaml`, one file per
shared catalog, and `processes/*.yaml` — into a team document at `/` and a process document at
`/<process>`, each with three figures (FLOW / GRID / PLAYBOOK) and a detail
drawer. Everything interesting is client-side, so **reading the HTML is not
verification**. Drive it with `driver.mjs`.

Paths below are relative to the repo root.

## Prerequisites

Node ≥ 22.18 (`bin/check.mjs` imports a `.ts` file and relies on Node's type
stripping), plus the browser driver, installed globally:

```bash
npm install -g @playwright/cli   # provides `playwright-cli`
npm install                      # repo deps
```

## Run: the driver (agent path)

One command proves the whole thing — server, every route, every interaction,
and the export artifact:

```bash
node .claude/skills/run-ai-sdlc/driver.mjs smoke
```

It starts its own server on a free port, drives a real browser, and exits
non-zero if any check fails. Last verified run:

```
serving C:\Users\nikiforovall\dev\ai-sdlc\examples\reference
  ok   / renders the team document — Example Team — ai-sdlc
  ok   /bugfix renders — 8 activities
  ok   /bugfix drawer starts closed
  ok   /bugfix activity opens its drawer panel — triage-bug
  ok   /bugfix Escape closes the drawer
  ok   /bugfix view switches to PLAYBOOK
  ok   /bugfix role filter narrows the readout — Product Lead — 1 of 8 activities in scope
  … same six for /feature and /incident …

deep links
  ok   /bugfix #view= restores the view — grid
  ok   /bugfix #role= restores the lens — Product Lead — 1 of 8 activities in scope
  ok   /bugfix #open= restores the drawer — triage-bug
  ok   /bugfix view, lens and drawer compose — grid · lead · triage-bug
  ok   /bugfix legacy #act- hash still opens its panel — triage-bug
  ok   /bugfix clicking writes the reading into the hash — #view=grid&role=lead&open=act-triage-bug
  ok   /bugfix clicking adds no history entry — 3 activities + a view · length 18 → 18
  ok   /bugfix a stale #open= drops itself from the hash — #view=grid
  ok   / #open= opens the team drawer on that panel — role:lead

exporting
  ok   export writes one file
  ok   export holds every document — 4 documents
  ok   export shows one document at a time — incident
  ok   export drawer works offline — acknowledge-page
  ok   export references no external asset
  ok   export restores document, view and drawer from one hash — bugfix · grid · triage-bug

34/34 checks passed
```

`fixtures/coverage` runs the same suite at 28/28 — two processes instead of
three, and the deep-link block runs once per team, not once per route.

The one thing the driver cannot reach is the export opened from `file://`, where
the hash is written by `location.replace` because the history API refuses a URL
argument on an opaque origin. Check that branch by hand: open
`_exports/reference.html` from disk, click a view button and an activity, and
confirm the address bar follows while Back still leaves the page.

Screenshots — one PNG per route, at 1440×1000:

```bash
node .claude/skills/run-ai-sdlc/driver.mjs shot --out=/tmp/shots
```

Both commands take a team folder as their first argument and default to
`examples/reference`:

```bash
node .claude/skills/run-ai-sdlc/driver.mjs smoke path/to/other-team
```

### Poking at it by hand

The driver talks to `playwright-cli`, which keeps a named browser session alive
between calls, so you can drive the page yourself once a server is up. The
figures carry their state in data attributes, which makes `eval` a better probe
than a snapshot:

```bash
playwright-cli -s=probe open http://localhost:4321/feature
playwright-cli -s=probe eval "() => { const b = document.querySelector('button[data-act]'); b.click(); return JSON.stringify({ act: b.dataset.act, open: [...document.querySelectorAll('[data-detail]')].filter(p => !p.hidden).map(p => p.dataset.detail) }); }"
# → {"act":"write-spec","open":["write-spec"]}
playwright-cli -s=probe close
```

## Run: the CLI

`bin/ai-sdlc.mjs` renders **any** team folder on disk; the team dir is required
and never inferred:

```bash
node bin/ai-sdlc.mjs check  examples/reference   # zod validation, no Astro — fast
node bin/ai-sdlc.mjs export examples/reference --out _exports/reference.html
AISDLC_CACHE_DIR=/tmp/aisdlc-serve node bin/ai-sdlc.mjs serve examples/reference --port 4400
```

`serve` needs that env var only when another Astro process is already running
against this repo — see the first gotcha. Alone, plain `node bin/ai-sdlc.mjs
serve <dir>` is enough.

`npm run check` and `npm run export` are those two wired to the reference team.

## Run: the repo itself (human path)

```bash
npm run dev     # http://localhost:4321, reference team, hot reload
npm run build   # the verification gate — expects "5 page(s) built"
```

There is no test suite and no linter. A clean `npx astro build` reporting 5
pages is what "it works" means for a source change; `driver.mjs smoke` is what
it means for a behavioural one.

## Gotchas

- **Never run `astro build` in the repo root while a dev server is running.**
  The build rewrites `.astro/content-assets.mjs`, and the running server's
  module graph still points at the old one — the browser then shows *"Failed to
  load url /.astro/content-assets.mjs … Does the file exist?"* and only a
  restart fixes it. Set `AISDLC_CACHE_DIR` to a temp dir for the second process
  (`astro.config.mjs` reads it into `cacheDir`), which is exactly what
  `driver.mjs` and `ai-sdlc export` do. That is why the driver is safe to run
  against a repo that already has `npm run dev` up.
- **The dev server binds `::1` only.** `http://localhost:<port>` resolves;
  `http://127.0.0.1:<port>` refuses the connection. Use `localhost`.
- **`playwright-cli` blocks the `file:` protocol** (`Access to "file:" protocol
  is blocked`), so the one-file export cannot be opened the way a human opens
  it. Serve it over loopback instead — `driver.mjs` spawns a nine-line static
  server for exactly this.
- **A static server for the browser must be its own process.** `playwright-cli`
  is driven with `spawnSync`, which blocks the event loop, so a server running
  in the driver process never answers the navigation — it fails as
  `net::ERR_ABORTED` or a 60s timeout with no request ever logged.
- **An 8.3 short path in the team-dir argument used to abort `serve`** on the
  first file edit (`Assertion failed: !_wcsnicmp(filename, dir, dirlen)`, exit
  3221226505). `teamDirOf` now calls `realpathSync.native`, so
  `C:\Users\NIKIFO~1\…` is fine — but any new path plumbing must keep that
  call.
- **Each activity has three buttons**, one per figure. Count
  `new Set(…map(b => b.dataset.act)).size`, not `querySelectorAll` length, or
  every count is 3× too high.
- **The reading is in the hash, so `location` is a probe.** View, lens and open
  drawer are written as `#view=grid&role=lead&open=act-<id>` on every change —
  with `replaceState`, so `history.length` never grows. A default is absent
  rather than spelled out, so a document sitting on FLOW with no lens and a
  closed drawer has an empty hash. Bare `#act-<id>` / `#tool-<id>` is still read
  as `open=`. The export adds `doc=<slug>` because one file has no routes.
- **`playwright-cli` writes snapshot YAML into `.playwright-cli/`** in the cwd.
  It is gitignored; ignore it.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Browser shows *Failed to load url /.astro/content-assets.mjs* | A build ran under the live dev server. Restart the server; use `AISDLC_CACHE_DIR` next time. |
| `driver failed: net::ERR_ABORTED` on the export URL | The file server died or never started — check nothing else holds that port. |
| `playwright-cli` not found by the driver | It resolves `@playwright/cli` under `npm root -g`; install it globally, not locally. |
| `"<dir>" is not a team folder — no team.yaml in it` | The CLI takes the folder holding `team.yaml`, not the repo root and not `processes/`. |
| `export still references /_astro/…` | A new asset type reached the export; `bin/inline.mjs` must learn to fold it. |
| `duplicate id in export: …` | Two documents emit the same DOM id. Fine on separate routes, fatal in one file — make the id per-document. |

---
name: sdlc-ontology
description: How an ai-sdlc team document is organized — the vocabulary, the folder, the three states an activity can be in, and what the page derives rather than authors. Read before writing or editing team.yaml, a shared catalog, or a process file, and whenever a term in the model needs settling.
---

# sdlc-ontology

The model, and where each part of it is written down. This skill holds no procedure: `mapping-session` interviews a team into a document, `auto-mine-repo` reads one out of a repository, and both of them read the vocabulary here so it is stated once.

## The one distinction

Everything on the rendered page is either **authored** — someone wrote it — or **derived** — the composer computed it. The derived things are the ones that look most like drawings, which is why they are the ones people try to author.

If someone asks you to draw an arrow, the answer is to name an artifact.

## The folder

One team is several files read as one document, and the folder name is the team id:

```
team.yaml          the team, and the roles every figure is drawn along
artifacts.yaml     one file per shared catalog, beside team.yaml
harnesses.yaml     — and tools.yaml, events.yaml, once there are entries
processes/*.yaml   one file per process; the file name is the process id
```

A catalog may be written inline in `team.yaml` instead of in its own file, but never in both: `check` fails a shelf declared twice.

## The three states

An activity is in exactly one of them, and the difference between the last two is what the document exists to show:

- **Filled** — `tooling: {tool, level}`. Capability attached to work, at a stated rung of the ladder.
- **Open slot** — `open: {need}`. A gap somebody declared, plus what would fill it. Draws dashed, and is the roadmap.
- **Unclaimed** — neither field. Work done by hand that nobody has asked for anything on. Draws plain, and is not a gap.

Open is declared, never inferred. A document that turns silence into open slots has destroyed the only signal it produces.

## Where to read

| Reach for | When |
| --- | --- |
| `references/ontology-cheatsheet.md` | writing YAML — every field, every layer, on one page |
| `references/worked-example.md` | a level or a fill-versus-recommendation call will not settle; read it against `ai-sdlc example` |
| `docs/ontology/` | the long form, five documents in dependency order — for maintaining the model, not for using it |

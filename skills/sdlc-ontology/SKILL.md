---
name: sdlc-ontology
description: ai-sdlc team-document model — the vocabulary, the folder, the three states an activity can be in, and what the page derives rather than authors. Read before editing team.yaml, a catalog file (artifacts.yaml, tools.yaml, …), processes/*.yaml, or src/lib/schema.ts, and whenever a term in the model needs settling.
---

# sdlc-ontology

The model, and where each part of it is written down. This skill holds no procedure: `mapping-session` interviews a team into a document, `auto-mine-repo` reads one out of a repository, and both read the vocabulary from here so it is stated once.

If someone asks you to draw an arrow, the answer is to name an artifact. Everything on the page is either **authored** or **derived**, and the derived things are the ones that look most like drawings.

## Where to read

| Reach for | When |
| --- | --- |
| `references/ontology-cheatsheet.md` | writing YAML — every field, every layer, and what `check` and `status` catch, on one page |
| `references/worked-example.md` | a level or a fill-versus-recommendation call will not settle; read it against `ai-sdlc example` |
| `docs/ontology/` | maintaining the model — six documents, an overview plus five layers in dependency order. **In the ai-sdlc repository only**; the installed skill does not carry it |

You are done consulting this when every activity you have written is in exactly one of the three states — filled, open, or unclaimed — and you can say which, and why.

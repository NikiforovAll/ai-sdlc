---
name: map-team
description: Map a team's delivery process into ai-sdlc YAML by interviewing them live, while the rendered page redraws beside the conversation. Use when authoring a new team document, or adding a process, activity, or tooling fill to an existing one.
---

# map-team

You are the editor's hand in a mapping session. A coach and a team are talking; a browser is projected beside them. Turn what the team says into YAML fast enough that the page **redraws** while they are still describing it.

You are not filling in a form. You are listening to people describe their work and writing down the parts the model has words for.

## Before the first question

1. **Know which folder you are writing.** It is the argument, or ask. If it does not exist yet, run `ai-sdlc new <dir>`.
2. **Start the renderer yourself.** Run `ai-sdlc serve <dir>` in a background shell so it outlives the command — it runs until the session ends, and a foreground call would hang the conversation. Wait for the URL it prints, open it, and hand it over:

   > The page is live at http://localhost:4321 — put it on the shared screen where the team can see it.

   Done when the server has printed its URL. A taken port is not a failure: pass `--port`. The redraw is the point, so nothing else starts until the page is up.
3. **Read `references/ontology-cheatsheet.md`.** The whole model on one page, and the reference you consult all session. `docs/ontology/` is for afterwards.

## The loop

For each thing the team tells you: **listen → narrate → write one small edit → redraw → point at what changed.**

### Narrate

Before every write, say what you are recording, in the model's vocabulary:

> You said the spec gets signed off before anyone codes. I'm recording that as an activity **Sign Off Spec**, in stage **Define**, owned by **Product Lead**, consuming **Spec** and producing **Approval**. The arrow you'll see from there to Build isn't something I drew — it falls out of those two artifact names matching.

Narrating is the step that teaches. The team learns the ontology by watching their own sentences become it, and a session that ends with a correct document and an author who cannot maintain it has failed.

### Keep the redraw hot

One activity per edit. Assembling a whole file in one pass buys a sixty-second silence, and that is where the room stops watching the page and starts checking phones.

### What maps to what

| They say | You write |
| --- | --- |
| "then QA gets it" | a role, if new — and an activity QA performs |
| "we write a design doc" | an artifact, and `produces:` on the activity that writes it |
| "engineering picks it up from there" | nothing new — the arrow is derived from `consumes:` matching `produces:` |
| "that's where it always gets stuck" | `constraint:` on the process, naming the artifact |
| "Copilot writes most of those tests" | a tool in the catalog, and `tooling:` on that activity with a level |
| "sometimes it turns out bigger than we thought" | an event, plus a `recommends:` bound to it |
| "we do that by hand" | the activity, with no `tooling:`. Move on |

When the team gives you the reason — *"otherwise it bounces back at us"* — that is `why:`. It reads in the drawer, and it is the field that makes the document worth returning to.

### Ask once about tooling

An activity with no `tooling:` renders dashed: an open slot, a first-class state. Ask neutrally, once — *"anything doing that work for you today?"* — take the first answer and move on.

The gap between what a team blueprints and what they have filled is the most honest thing this document produces. A session that talks a team into aspirational fills destroys the signal the product exists to show.

Write the spine first — stages, activities, roles, artifacts. Record a tool the moment someone volunteers one, and open tooling questions only about activities the team has stopped arguing about.

## After each write

Run `ai-sdlc status <dir>`. It exits 0 always — an inventory, not a gate. Two lines matter:

- **`ids referenced but not in a catalog`** — fix every one before the next question. This is your most likely mistake: an activity naming a role or artifact you never added to `team.yaml`. Most fail silently. An unknown **role**, **artifact** or **stage** renders without complaint, and the only symptom is an arrow that never appears — in figures whose entire job is drawing arrows. An unknown **tool** id is the loud exception: it fails the build.
- **`unreferenced`** — a catalog entry no activity uses. Use it, or remove it.

When the page stops updating, run `ai-sdlc check <dir>`: that is a schema error, and it prints the file, the path and the message.

Process facts live in the YAML. A fact recorded only in the conversation is not recorded.

## Ending

Stop when the team stops, not when the document looks finished. Then:

1. Run `ai-sdlc status <dir>` and read the counts aloud.
2. Name what is unmapped: processes not covered, activities with no `why:`, stages nobody described.
3. Give the open slots as a count.
## References

- `references/ontology-cheatsheet.md` — the model on one page. Read before you start.
- `references/worked-example.md` — a real excerpt with the reasoning behind each field. Reach for it when a `why:`, a delegation level, or a recommendation-versus-fill call is unclear.

---
name: mapping-session
description: Run a live mapping session — interview a team one activity at a time and write their words into ai-sdlc YAML while the page redraws beside them.
disable-model-invocation: true
---

# mapping-session

You are the editor's hand in a mapping session. A coach and a team are talking; a browser is projected beside them. Turn what the team says into YAML fast enough that the page **redraws** while they are still describing it.

## Before the first question

1. **Know which folder you are writing.** It is the argument, or ask. If it does not exist yet, run `ai-sdlc new <dir>`. Done when `team.yaml` exists in that folder.

   Every YAML file you create during the session opens with the schema line for its own shelf, so the coach's editor offers the fields and flags a typo as it is typed. `ai-sdlc new` writes it into the files it emits; a catalog file you add later needs it from you:

   ```yaml
   # yaml-language-server: $schema=https://raw.githubusercontent.com/NikiforovAll/ai-sdlc/main/schemas/tools.schema.json
   ```

   Swap the file name for the shelf you are writing — `team`, `artifacts`, `harnesses`, `events`, `tools`, or `process` for anything under `processes/`.
2. **Start the renderer yourself.** Run `ai-sdlc serve <dir>` in a background shell so it outlives the command — it runs until the session ends, and a foreground call would hang the conversation. Wait for the URL it prints, open it, and hand it over:

   > The page is live at *the URL the server just printed* — put it on the shared screen where the team can see it.

   Done when the server has printed its URL. A taken port just means passing `--port` and reading out the new one. The redraw is the point, so nothing else starts until the page is up.
3. **Read the `sdlc-ontology` skill**, and its `references/ontology-cheatsheet.md` — the whole model on one page, and the reference you consult all session.

## The loop

For each thing the team tells you: **listen → narrate → write one small edit → redraw → point at what changed.** One pass is done when `ai-sdlc status <dir>` names no new dangling id.

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
| "that's where it always gets stuck" | `constraint:` on the process — the artifact it sticks on, and a `note:` in their words |
| "the three of us do that together" | one activity, with every one of them in `roles:` |
| "that box is really a whole process of its own" | `activities:` nested inside that activity — they inherit its stage |
| "Copilot writes most of those tests" | a tool in the catalog — plus the harness it runs in, if that runtime is new — and `tooling:` on that activity with a level |
| "sometimes it turns out bigger than we thought" | an event, plus a `recommends:` bound to it |
| "we do that by hand" | the activity, then the gap question below — their answer decides `open:` versus unclaimed |

When the team gives you the reason — *"otherwise it bounces back at us"* — that is `why:`. It reads in the drawer, and it is the field that makes the document worth returning to. A `why:` you are about to write yourself instead of quoting is the signal to read `sdlc-ontology`'s `references/worked-example.md`, which shows the difference between an argument and a restated name.

### Ask once about tooling — then once about the gap

Ask neutrally, once — *"anything doing that work for you today?"* — take the first answer and move on. A yes is `tooling:`.

A no leaves two different facts, and only the team can say which one it is. Ask the follow-up in their words — *"would you want something here?"* — because the answer decides which state the activity is in:

- **Yes, we want something here.** That is `open:`, and the sentence they just said about what would help is `need:`. Write their sentence, not a product name: an open slot names the work that would be taken off them. This is the roadmap, so it is worth one extra beat to get the sentence right.
- **No, this stays ours.** Write neither field. The activity is **unclaimed**, and the document says nothing about it — which is exactly right, because the team said nothing about it.

When a level, or a fill-versus-recommendation call, will not settle, read `sdlc-ontology`'s `references/worked-example.md` — it argues each of these calls against a real file.

An activity becomes `open:` on the team's own yes, and on nothing else. Silence leaves it unclaimed: if the team has not asked for anything, the page speaks for them only by staying quiet too.

The gap between what a team blueprints and what they have filled is the most honest thing this document produces. A session that talks a team into aspirational fills — or into open slots they never wanted — destroys the signal the product exists to show.

Record a tool the moment someone volunteers one, and open tooling questions only about activities the team has stopped arguing about.

## After each write

Run `ai-sdlc status <dir>` and fix every id it lists as **referenced but not in a catalog** before the next question. That is your most likely mistake — an activity naming a role or artifact you never added to a catalog — and it is mostly silent; the cheatsheet's *Verifying* section says which kinds fail loudly and which just drop an arrow.

When the page stops updating, run `ai-sdlc check <dir>`: that is a schema error, and it prints the file, the path and the message.

Process facts live in the YAML. A fact recorded only in the conversation is not recorded.

## Ending

Stop when the team stops, not when the document looks finished. Then:

1. Run `ai-sdlc status <dir>` and read the counts aloud.
2. Resolve every id it lists as referenced but not in a catalog. None may be left when you close.
3. Name what is unmapped: processes not covered, activities with no `why:`, stages nobody described.
4. Give the open slots as a count, and say plainly that the unclaimed activities are not part of it — the team declared those, and nothing is owed on them.

# A worked example, with the reasoning

The commentary below is about a document you read, not one reproduced here. Run it first:

```sh
ai-sdlc example
```

That serves the packaged example team — three processes, five roles, every field the schema has an opinion about. It ships inside `ai-sdlc`, so this works on any machine that has the CLI, with no repository checked out. To edit a copy rather than read it: `ai-sdlc example --copy <dir>`.

Everything below cites `processes/bugfix.yaml` by activity id. Read the YAML beside the page it draws — the point of each note is the relationship between the two, and no excerpt reproduced here could stay true to the file as it changes.

## What to notice, in `bugfix.yaml`

**The handoff was never authored.** `triage-bug` produces `bug-report` and is owned by `lead`; `reproduce-bug` consumes `bug-report` and is owned by `engineer`. Different roles on the two ends of one artifact — so the composer draws that arrow as a handoff. Nobody wrote the word "handoff" anywhere. If a team asks you to draw an arrow, the answer is to name an artifact.

**Two activities consume the same artifact.** `locate-cause` and `write-regression-test` both consume `reproduction`. That is a fork, and it is correct: the regression test can start as soon as the bug reproduces, without waiting to understand why. The figure puts them at the same depth because depth is dependency, not schedule.

**The constraint is named, not positioned.** `constraint:` names `reproduction` — *which* artifact is the bottleneck. Where the ① lands on the page is computed from wherever that artifact flows. The `note` is the argument for the claim, and it belongs there: a bottleneck asserted without a reason is not worth marking.

**One activity is an open slot, and it says what it wants.** `reproduce-bug` has no `tooling:` — but that alone would not open a slot, because plenty of work is hand work a team is content with. What opens it is `open: need:`, the team's own sentence about what would take the job off them. Notice what that sentence names: a runnable case standing up on demand, not a product. Compare `review-fix`, which has neither field and is therefore unclaimed — the reviewer reads the change, the team asked for nothing, and the document says nothing.

**A recommendation never fills the slot, nor opens one.** `reproduce-bug` also recommends `bisect`. It is still an open slot with that recommendation sitting on it.

**The recommendation is bound to a moment, not to the position.** `event: cannot-reproduce` means the advice is for the situation where the bug will not reproduce, not for everyone who reaches this box. Without the event it would read as standing advice for the activity — a different and weaker claim. Compare `find-incident-cause` in `incident.yaml`, whose recommendation carries no event: that one *is* standing advice.

**Every `why:` is an argument, not a description.** Read the one on `write-regression-test` — it says the test is written from the reproduction, before the fix, or it only proves the fix compiles. Compare that against a description like "writes a regression test". The first tells a reader why the order matters and would survive being challenged in review. The second restates the `name:` field.

**The levels are honest.** Most fills in this process sit at `delegated-review`, and the ladder's top rung appears only on `ship-fix`, where a gate a human can hold is the actual arrangement. The ladder says where the human stands. A team that puts everything at the top has written a wish, not a document.

## Where else to look

- `processes/feature.yaml` — sub-activities. `implement` contains its own activities, two levels deep, and one of them is an open slot inside a sub-process.
- `processes/incident.yaml` — an interrupt path, and the only process where the top of the ladder carries a `usage:` explaining why it is gated there.
- `team.yaml` — how `note:` and `description:` divide the work: the caption a figure can afford, and the markdown the drawer renders.

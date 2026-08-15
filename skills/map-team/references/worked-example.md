# A worked excerpt, with the reasoning

Four activities from the reference team's `bugfix` process. The YAML is real; the commentary is what a coach would have been saying out loud while writing it.

## The excerpt

```yaml
name: Bugfix
description: >-
  The short path: a report becomes a reproduction, a cause, a guarded fix, and a
  release. No spec, no planning — the bug is the spec.

stages:
  - id: triage
    name: Triage
  - id: diagnose
    name: Diagnose
  - id: fix
    name: Fix

constraint:
  artifact: reproduction
  note: >-
    Everything downstream is cheap once the bug reproduces on demand, and
    guesswork until it does. The reproduction is where this path is won or lost.

activities:
  - id: triage-bug
    name: Triage Report
    stage: triage
    roles: [lead]
    produces: [bug-report]
    why: An untriaged report is a rumour; triage decides whether it is work at all.
    tooling:
      tool: rovo-triage
      level: delegated-review

  - id: reproduce-bug
    name: Reproduce
    stage: diagnose
    roles: [engineer]
    consumes: [bug-report]
    produces: [reproduction]
    why: A bug you cannot reproduce on demand is a hypothesis, and fixes to hypotheses do not hold.
    open:
      need: >-
        Something that turns a report into a runnable case — the environment, the
        data and the steps, standing up on demand. Today every reproduction is
        rebuilt by hand from whatever the reporter remembered.
    recommends:
      - tool: bisect
        event: cannot-reproduce
        usage: >-
          Let history say when the behaviour changed — the first good build is a
          reproduction recipe when the report is not one.

  - id: locate-cause
    name: Locate Cause
    stage: diagnose
    roles: [engineer]
    consumes: [reproduction]
    produces: [root-cause]
    why: The first place the symptom appears is rarely the place the defect lives.
    tooling:
      tool: explore-subagent
      level: delegated-review

  - id: write-regression-test
    name: Write Regression Test
    stage: fix
    roles: [engineer]
    consumes: [reproduction]
    produces: [regression-test]
    why: The test is written from the reproduction, before the fix, or it only proves the fix compiles.
    tooling:
      tool: test-from-repro
      level: delegated-review
```

## What to notice

**The handoff was never authored.** `triage-bug` produces `bug-report` and is owned by `lead`; `reproduce-bug` consumes `bug-report` and is owned by `engineer`. Different roles on the two ends of one artifact — so the composer draws that arrow as a handoff. Nobody wrote the word "handoff" anywhere.

**Two activities consume the same artifact.** `locate-cause` and `write-regression-test` both consume `reproduction`. That is a fork, and it is correct: you can start the regression test as soon as the bug reproduces, without waiting to understand why. The figure shows them at the same depth because depth is dependency, not schedule.

**The constraint is named, not positioned.** `constraint: { artifact: reproduction }` says *which* artifact is the bottleneck. Where the ① lands on the page is computed from wherever that artifact flows. The `note` is the argument for the claim, and it belongs there — a bottleneck asserted without a reason is not worth marking.

**One activity is an open slot, and it says what it wants.** `reproduce-bug` has no `tooling:` — but that alone would not open a slot, because plenty of work is hand work a team is content with. What opens it is `open: need:`, the team's own sentence about what would take the job off them. Note what the sentence names: a runnable case standing up on demand, not a product. It also has a *recommendation* — `/bisect`, for when the report does not reproduce — and a recommendation never fills the slot, nor opens one.

**The recommendation is bound to a moment, not to the position.** `event: cannot-reproduce` means the advice is for the situation where the bug will not reproduce on demand, not for everyone who reaches this box. Without the event it would read as standing advice for the activity, which would be a different and weaker claim.

**Every `why:` is an argument, not a description.** Compare "The test is written from the reproduction, before the fix, or it only proves the fix compiles" against a description like "writes a regression test". The first tells a reader why the order matters and would survive being challenged in a review. The second restates the `name:` field.

**The levels are honest.** Three `delegated-review` fills, no `gated-autonomous` anywhere in this excerpt. The ladder is about where the human stands, and a team that puts everything at the top of the ladder has written a wish, not a document.

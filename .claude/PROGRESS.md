# Progress: coaching intelligence

Where the `COACHING-INTELLIGENCE.md` brief stands, phase by phase, with what checks each
claim. Updated at the end of each round of work.

## Phases

| Phase | State | Where |
| --- | --- | --- |
| 0. Licence rules | Kept throughout. AGPL projects were read for ideas only; no code was copied. Every dataset, formula and idea is in `CREDITS.md` with its licence. | `CREDITS.md` |
| 1. Evaluate the reference projects | Done. The owner said to carry on without waiting for approval, and Phase 2 followed in the same branch; `EVALUATION.md` records that. | `EVALUATION.md` |
| 2. The coaching engine | Done: weekly volume against landmarks, fatigue from RPE at the same load, estimated-max trends, autoregulated progression, weak points, and the insights that rank them. Pure functions with tests. | `js/coach/` |
| 3. OpenPowerlifting percentiles | Done: raw only, adults, best per lifter, IPF classes, deciles. Only the three judged lifts get a percentile. Built by `tools/opl-percentiles.py`; the table is 3.7 KB and the source is never committed (`.gitignore`: `*.opl.csv`). | `js/coach/percentile.js`, `js/coach/powerlifting.js`, Progress → Detailed → Strength |
| 4. How coaching is surfaced | Done. See below. | Coach → Coach AI |

## Phase 4, rule by rule

- **One insight at a time.** Coach AI shows the single most important finding or insight, then "N more things the coach sees" behind a tap. The plan check, when it is opened on purpose, shows them all. The dot on the Coach tab counts them all. *Test: "Phase 4: Coach AI shows the most important thing first…"*
- **Always explain.** Every card says what it saw, in the person's own numbers, and why it matters ("The same 80 kg × 8 went from RPE 7 to 9 over your last 4 sessions…"). The coach chat answers the same way.
- **Always overridable.** Nothing changes without a tap, and every change has Undo. "Keep it as it is" and "Not now" are recorded, so the card does not return next session; it comes back only if the numbers behind it change. *Tests: "Coach: an insight set aside stays aside…", "Plan check: … kept until the numbers change".*
- **Never clinical.** Training language only. For pain, the coach chat says to stop the exercise that causes it and to see a doctor or physiotherapist if it lasts, and that it cannot tell what it is.
- **Earn silence.** With nothing worth saying, Coach AI shows one quiet line ("On track. Nothing to change."), with no heading, no cards, no footnote and no dot. *Tests: "Coach: a log that is on track gets no coach card", "Phase 4: one card at a time until there is nothing to say…".*
- **Arabic.** Every string goes through `t()` with an Arabic entry and is checked in RTL. Figures are isolated as one left-to-right run.

The owner asked for two more surfaces, and both follow the same rules:
- **Progress → Simple**: five plain answers.
- **Ask the coach**: a guided chat in Coach AI that answers from the log, offline, with no model and no network.

## Acceptance criteria

| Criterion | State |
| --- | --- |
| `js/coach/` contains no DOM access | Met. No `document`, `window`, storage or network in `js/coach/*.js`; only its test page touches the DOM. |
| Every coaching function returns a defined result on an empty log | Met. Covered by the coach tests ("empty log" cases). |
| No `NaN` or `undefined` reaches any caller | Met. `t.clean()` checks results all the way down. |
| Percentile tables under 100 KB; the 250 MB source not committed | Met. 3.7 KB; the source is git-ignored. |
| `CREDITS.md` names every dataset, its licence and its use | Met. |
| `EVALUATION.md` exists and was approved before Phase 2 | Exists. The owner chose to proceed without a separate approval step. |
| No AGPL code copied | Met. |
| No new screens before `MASTER-BACKLOG.md` items 1–11 | `MASTER-BACKLOG.md` is not in the repository. The new screens (the Coach hub, Progress → Simple, the chat) were the owner's own requests. |

## Verification

- `node tests/coach.mjs`: all assertions pass (90, including the chat's question matcher).
- A real export with several weeks of data: checked against the owner's own coach program and log, which stay on the build machine and are not committed. The insights were ones a coach would say; the stale-card bugs found this way are fixed.
- A one-session log says "not enough yet" everywhere and invents no trend. *Test: "Phase 4: one session and one weigh-in…"*
- Fully offline: the installed app opens with the network off, every tab works, food search works and the coach chat answers. *Test: "Offline: with the network off…"* Every module the app loads is in the service worker's precache.

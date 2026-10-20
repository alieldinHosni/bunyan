# BUNYAN — Coaching Intelligence

**Use the ponytail skill at `full` intensity.**
**Read `.claude/PROGRESS.md` first. Update it and stop at the end of each phase.**

This document covers one objective: make Bunyan a better *coach*, not just a better
logger. It is sequenced in five phases. Do them in order. Do not skip Phase 0.

---

## Sequencing rule — read this before anything else

The coaching **engine** can be built now. The coaching **UI must wait.**

Every function in Phase 2 and Phase 3 is a pure function: data in, insight out. No DOM,
no render, no screens. Build those now, unit-test them, and surface nothing.

Do **not** add new screens or cards until `MASTER-BACKLOG.md` items 1–11 are done. The
app currently rebuilds whole screens with `innerHTML` on small state changes — that one
defect produced five separate bug reports (search jumping, image flashing, star-tap sheet
bounce, sheet bouncing, profile repainting). Any new coaching screen built before that
is fixed inherits the defect, and we will be debugging it a sixth time.

So: engine now, tests now, screens after the backlog.

---

## Phase 0 — Licence rules. Non-negotiable.

You are going to read other people's fitness apps. Most of the good ones are **AGPL-3**,
which is viral: if you copy their code into Bunyan, Bunyan must become AGPL-3 and its
source must be published. Bunyan is on public GitHub Pages, so that is survivable — but
it is a decision the owner has not made, and you do not get to make it by pasting a file.

**The rule:**

- **Read** AGPL code to understand the approach. **Reimplement** from understanding.
- **Never copy** code, comments, variable naming schemes, or file structure from an
  AGPL project.
- **Data** under CC0 or Creative Commons may be used directly, with attribution where
  the licence asks for it.
- If you cannot build something without copying, **say so and stop.** Do not quietly
  copy.

Create and maintain `CREDITS.md` at the repo root. Every dataset and every
reimplemented-from idea gets a line: what it is, where it came from, what licence, what
Bunyan uses it for.

---

## Phase 1 — Evaluate the reference projects, then stop for approval

Read these. Do not change Bunyan during this phase. Produce a written evaluation and
wait.

### Data sources — usable directly

| Project | Where | Licence | Why it matters |
| --- | --- | --- | --- |
| **OpenPowerlifting** | `github.com/sstangl/openpowerlifting`, bulk CSV at `openpowerlifting.gitlab.io/opl-csv` | **CC0** | 2.5M+ judged competition results. Real strength distributions by bodyweight, sex, age. ~250 MB. |
| **USDA FoodData Central** | `fdc.nal.usda.gov/download-datasets` | **CC0** | Authoritative food macros. Use **Foundation Foods + SR Legacy** only — Branded is noisy, self-reported, and enormous. |
| **Compendium of Physical Activities** | `pacompendium.com`, 2024 adult edition | Free to use, cite it | Published MET values. Already required by `CARDIO-SPORTS-EXPANSION.md`. |
| **free-exercise-db** | `github.com/yuhonas/free-exercise-db` | **CC0** | Already the basis of Bunyan's 873-exercise library. Re-check for additions. |

### Code to read and learn from — do not copy

| Project | Where | Licence | What to learn specifically |
| --- | --- | --- | --- |
| **Liftosaur** | `github.com/astashov/liftosaur` | AGPL-3 | Its scripting language for progression, deloads and autoregulation. The most sophisticated open implementation of "the program reacts to the lifter". Read how it models progression rules as data rather than hardcoded branches. |
| **wger** | `github.com/wger-project/wger` | AGPL-3 code, **CC data** | Mature workout/nutrition data model after a decade of real use. Read its schema. Its exercise and ingredient *data* is CC-licensed and usable. |
| **MyFit** | search `github.com/topics/hypertrophy` for the AGPL-3 MyFit | AGPL-3 | Modelled on RP's Hypertrophy app. Read how it tracks per-muscle volume landmarks across a mesocycle. |
| **workout-cool** | `github.com/Snouzy/workout-cool` | check repo | ~8.5k stars. Read it for UX and onboarding flow, not architecture — it is a full stack app and Bunyan is not. |
| **awesome-health-fitness-oss** | `github.com/Dieterbe/awesome-health-fitness-oss` | — | Index. Use it to find anything the list above misses. |

### Deliverable for Phase 1

A single markdown file, `EVALUATION.md`, containing:

1. For each project: licence, what it does well, what Bunyan should take, what Bunyan
   should **not** take and why.
2. Anything in Bunyan that is **worse** than a reference implementation, named
   specifically, with the file and function.
3. Anything in Bunyan that is **better** — so we do not regress it by imitating someone
   else.
4. A recommendation on the one highest-value thing to build first.

**Then stop and wait for approval.** Do not start Phase 2 on your own.

---

## Phase 2 — The coaching engine, from data Bunyan already has

No new data sources. No network. Pure functions over the existing log.

Put all of this in `js/coach/`. One file per concern. Each function takes plain data and
returns plain data. No DOM access anywhere in this directory.

### 2.1 Per-muscle weekly volume, and landmarks

Compute sets-per-muscle-group-per-week from the log, using the muscle tags already on
the exercise library.

Then compare against volume landmarks — MEV (minimum effective volume), MAV (maximum
adaptive volume), MRV (maximum recoverable volume).

**Honesty requirement.** These landmarks are **practitioner heuristics, not measured
constants.** They come from Renaissance Periodization's published ranges and are
reasonable defaults, not physiology. Any UI that eventually shows them must say so in
plain language. Do not present a number like "MRV: 22 sets" as a fact about the user's
body.

Store the ranges in one data file with a comment naming the source. Do not scatter them.

### 2.2 Fatigue detection

The signal: **RPE rising while load stays flat.** If the same weight for the same reps
felt like 7 three weeks ago and feels like 9 now, that is accumulated fatigue, and it is
visible in data Bunyan already stores.

Write a function that, per exercise, finds matched load-and-rep points across recent
sessions and reports the RPE trend. Require at least three matched points before
reporting anything. Below that, return "insufficient data" — not a guess.

### 2.3 Estimated 1RM trending

Bunyan already computes Epley e1RM per set, capped at 12 reps. Extend it to a trend:
per exercise, best e1RM per week, with a simple direction (rising / flat / falling) over
a window the user can see.

Flat for 3+ weeks on a main lift is the trigger for a progression or deload suggestion.
Falling for 2+ weeks is the trigger for a fatigue warning.

**Keep the 12-rep cap.** Epley degrades badly above it. Do not widen the cap to get more
data points.

### 2.4 Autoregulation — extend what exists

Progression currently fires when every working set hits the top of its rep range. That
is a good rule and it stays. Extend it:

- If sets hit the top of the range **and** average RPE ≤ 7 → suggest a larger jump.
- If sets hit the top of the range **and** average RPE ≥ 9 → add load, but flag that
  recovery is marginal.
- If sets fail the range two sessions running → suggest holding load, not dropping it.
- If sets fail the range three sessions running → suggest a deload (−10% load, same
  reps, one week).

Every one of these is a **suggestion the user can decline.** The program never changes
itself.

### 2.5 Weak-point detection

Compare the user's e1RM ratios across lifts against typical ratios (bench : squat :
deadlift, press : bench, row : bench). Where a ratio is well outside the usual range,
that is a weak point worth naming.

Be careful here. Ratio norms vary by leverage, limb length and training history. Report
only large deviations, and phrase them as observations, not diagnoses. A short lifter
with long femurs will have an "abnormal" squat:deadlift ratio forever and nothing is
wrong with him.

### 2.6 Tests

`js/coach/` gets a test file per module. No framework — plain functions that assert and
log, runnable by opening one HTML file. Cover at minimum:

- Empty log → every function returns a defined "no data" result, never `NaN`,
  `undefined`, or a crash.
- One session → no false trends.
- A log containing cardio sessions with no sets → volume functions do not divide by
  zero. (`CARDIO-SPORTS-EXPANSION.md` §5 covers the data model; this is the test.)
- A deliberately fatigued log → fatigue detection fires.
- A deliberately progressing log → fatigue detection does **not** fire.

---

## Phase 3 — OpenPowerlifting percentiles

This is the single feature that no free app does well, and it is the reason to use
OpenPowerlifting at all: telling the user where their lifts sit against 2.5 million
judged results.

### The constraint that shapes the whole implementation

**The dataset is around 250 MB. It cannot ship with the app.**

So:

1. Download the bulk CSV **once, offline, on the developer machine.**
2. Write a one-off generation script — Python or Node, in `tools/`, **not** part of the
   app — that reduces it to percentile lookup tables.
3. Ship only the tables. Target **under 100 KB total.** Bucket by sex, bodyweight class
   and lift; store deciles, not raw rows.
4. The generation script and its output are committed. The 250 MB source is **not** —
   add it to `.gitignore`.

The app itself never downloads anything. Offline-first is a hard constraint and this
does not break it.

### Honesty requirements

Two caveats must be carried in the data layer, not bolted on in UI later:

- **The population is competitors, not gym-goers.** Someone at the 40th percentile of
  OpenPowerlifting is strong by any ordinary standard. The comparison is motivating only
  if framed correctly, and demoralising if it is not. Say it on screen.
- **Only squat, bench and deadlift.** Those are the judged lifts. Do not generate
  percentiles for anything else — there is no data, and inventing one would be the same
  mistake as inventing a MET value.

Equipped vs raw matters too. Filter to **raw** only.

---

## Phase 4 — How coaching gets surfaced (build after backlog items 1–11)

Principles, not screens. When the UI is built, it follows these.

**One insight at a time.** The engine will produce a dozen observations. Showing a dozen
is noise and gets ignored. Show the single highest-value one, with the rest behind a tap.

**Always explain.** Every suggestion states what it saw: "Bench e1RM flat for three
weeks, RPE climbing — consider a deload." Never "Deload recommended." A coach that does
not show its reasoning cannot be argued with, and a user who cannot argue stops
trusting it.

**Always overridable.** Nothing changes the program without a tap. Declining a suggestion
is recorded, and the same suggestion is not repeated next session.

**Never clinical.** No diagnoses, no medical framing, no health claims. Observations
about training, phrased as training.

**Earn silence.** If there is nothing useful to say, say nothing. An app that generates a
daily insight whether or not one exists trains the user to ignore insights. Most days
the honest output is "you are on track" — and that should render as almost nothing.

**Arabic.** Every string through `t()` with an AR entry, verified in RTL. Numbers in
`.num` so bidi does not mangle them. This is not optional and it is not a later pass.

---

## Engineering constraints — unchanged

- **Vanilla ES modules.** No framework, no build step, no npm, no `package.json`. The
  `tools/` generation script is the one exception, and it never runs in the browser.
- All coaching computation is **synchronous and offline.** No network calls, ever.
- Reuse existing design tokens, storage, state and navigation.
- Per-profile storage keys. Coaching state is per-profile like everything else.
- Migration: existing logs have no coaching state. Treat absent as "no history", never
  as zero.

---

## Acceptance criteria

- `js/coach/` contains no DOM access.
- Every coaching function returns a defined result on an empty log.
- No `NaN` or `undefined` reaches any caller.
- Percentile tables are under 100 KB and the 250 MB source is not committed.
- `CREDITS.md` names every dataset, its licence, and its use.
- `EVALUATION.md` exists and was approved before Phase 2 began.
- No AGPL code was copied. If anything could not be built without copying, it was
  reported, not copied.
- No new screens were added before `MASTER-BACKLOG.md` items 1–11.

---

## Verification

- Run the coach test file. All assertions pass.
- Load a real export with several weeks of data. Confirm the insights produced are ones
  a competent coach would actually say.
- Load a one-session log. Confirm it says "not enough data yet" rather than inventing a
  trend.
- Confirm the app still works fully offline with the network disabled.

When done, update `.claude/PROGRESS.md` and stop.

# BUNYAN — Cardio & Sports Tracking Expansion

**Use the ponytail skill at `full` intensity.**
**Read `.claude/PROGRESS.md` first.**

This is a feature expansion, not a bug round. It should be scheduled **after** the open
Round 4 items, because it touches the session data model and several things in Round 4
depend on that model being stable.

---

## Objective

Expand Bunyan beyond strength training with a Cardio & Sports section that sits alongside
the existing Strength section. **Do not replace or break the strength architecture.**

Activities to support:

Padel · Football · Basketball · Handball · Tennis · Running · Walking · Cycling ·
Swimming · Rowing · Elliptical · Stair climber · Boxing · Volleyball · Squash ·
Table tennis · Jump rope · Martial arts · plus user-defined custom activities

---

## 0. Inspect first, then report

Before writing code:

1. Read the existing session data model, history, progress and streak logic
2. Identify which components can be reused rather than rebuilt
3. **Report which files you will modify and why, and wait for approval**

Do not redesign unrelated sections.

---

## 1. Two existing things this collides with — resolve, do not duplicate

**a) The split already contains a football day.** The Anterior/Posterior plan has a day
named `Rest / Football`. If cardio logging is added without connecting to it, the user
will have a football day in their split *and* a separate football activity log that know
nothing about each other.

Decide and implement one behaviour: either logging a football activity satisfies that
scheduled day, or the day is repurposed. Do not ship both in ignorance of each other.

**b) Calorie double-counting is a real risk and must be handled explicitly.**

The existing macro calculator derives its target from Mifflin-St Jeor **multiplied by an
activity factor** that already accounts for training. If cardio calories are then added to
the daily target, the user's training is counted twice and the deficit silently
disappears.

Required:
- **Do not automatically add estimated cardio calories to the nutrition target.**
- Show the estimate in the activity log and in Progress
- If it is ever surfaced in Nutrition, it must be an explicit, off-by-default choice with
  a plain-language explanation of the double-counting risk

This is the single most likely way for this feature to quietly break something that
currently works.

---

## 2. Navigation

Training gains three categories:

- **Strength** — unchanged. Splits, exercises, sets, reps, weight, RPE, replacement,
  workout execution all preserved exactly as they are.
- **Cardio**
- **Sports**

**Cardio and Sports must not require sets and reps.** They are duration-based. Do not
force the strength model onto them.

---

## 3. Activity logging

A dedicated logging interface with:

- Activity selection
- **Duration** — hours and minutes, via an intuitive picker or direct entry
- **Intensity** — Light / Moderate / High
- **Body weight** — pulled from the profile, not entered again
- Date and time
- Estimated calories, calculated live as inputs change
- Optional notes
- Save

All values editable before saving.

**Body weight must come from the profile and must not be hardcoded.** Round 2 Bug 8a
removed hardcoded body stats from the plan builder for exactly this reason — do not
reintroduce them here.

If no body weight is set, prompt for it rather than assuming a default. A calorie estimate
built on an invented weight is worse than no estimate.

---

## 4. Calorie estimation

Fully offline. No paid APIs, no external services, no network dependency.

**Formula:**
```
Calories = (MET × 3.5 × bodyweightKg / 200) × durationMinutes
```

### MET values must be sourced, not invented

Use the **Compendium of Physical Activities** (Ainsworth et al.), the standard published
reference. It is free andpublicly available.

**Every MET value in the database must carry its source.** Do not estimate values for
activities you cannot find. This is the same rule already applied to exercise
illustrations and food data: if the real data does not exist, the entry does not ship.

For activities with no published MET value, either omit them or let the user enter their
own and label it as user-provided.

### Intensity mapping

Light / Moderate / High map to different MET values for the same activity. The Compendium
already distinguishes these for most sports — use its values rather than applying a
multiplier of your own invention.

### Honesty about accuracy

**Label every result as an estimate.** MET-based figures carry wide error margins,
particularly for intermittent sports like padel and football where real intensity varies
enormously within a session. A 90-minute football match is not 90 minutes of continuous
effort.

Do not present the number to a precision the method cannot support. Round to the nearest
10 kcal, not the nearest 1.

---

## 5. Data model — the decision that matters most

Cardio sessions have no exercises and no sets. Strength sessions do. **How they coexist
determines whether history, streak, consistency and volume keep working.**

**Recommended: a `type` field on the existing session record**, rather than a separate
collection.

Reasons:
- History, calendar, streak and consistency already iterate sessions. One array means they
  keep working with a type check rather than being forked.
- A separate collection means every one of those features needs a second code path, and
  they will drift. This is exactly the pattern that produced the food-search-fixed /
  exercise-search-broken split.

**Whichever is chosen, these must be verified not to break:**

- **Volume calculations** sum `weight × reps`. A session with no sets must not produce
  `NaN` or zero-divide. Check every function that touches `entries`.
- **Streak** — decide whether cardio counts. It should. Confirm it does.
- **Consistency %** — currently measures sessions against planned training days. Decide
  whether cardio counts toward that target.
- **PR detection** — must skip cardio sessions, not crash on them.
- **The share-progress snapshot** — must include or exclude cardio deliberately, not by
  accident.

**Migration required.** Existing sessions have no `type`. They must be treated as
strength, not left undefined.

---

## 6. History and summaries

Every saved activity appears in history with: activity name, date, duration, intensity,
body weight used, estimated calories, and notes if present.

**Store the body weight used at the time**, not a reference to the current profile weight.
Otherwise every historical estimate silently changes when the user's weight changes.

Add weekly activity summaries and total active duration.

---

## 7. UI and visual direction

Must feel native to Bunyan, not bolted on:

- Premium dark interface, Bunyan red accent
- Clean 2D. No 3D effects, no bright or mismatched colours
- Strong hierarchy, generous spacing, professional typography
- Consistent icons and cards with the rest of the app
- Smooth transitions using the existing motion tokens
- Mobile-first, one-handed

**Build from the existing design tokens, not new values.** Round 4 Item 7 changes radius,
inset and elevation theme-wide — anything hardcoded here will need reworking.

**No generic template appearance.** If it looks like a different app's screen dropped into
Bunyan, it is wrong.

---

## 8. Engineering constraints

- **Vanilla ES modules.** No framework, no build step, no npm, no `package.json`.
- Reuse existing styling, navigation, storage and state management.
- No paid APIs, no external services, no unnecessary dependencies.
- Sessions must persist across refresh, backgrounding and force-quit.
- **Prevent duplicate activities** in the library and duplicate saves of one session.
- Every new string through `t()` with an Arabic entry. Verified in RTL.
- Round 2 Phase 1 applies: changing duration or intensity updates the estimate only, not
  the whole screen.

---

## 9. Deliverables

Fully working, not a mockup:

- Activity library with sourced MET values
- Cardio/sports logging screen
- Duration and intensity input
- Weight-based calorie estimate
- Activity history
- Weekly summary
- Validation and error states — zero duration, missing weight, missing activity

---

## Acceptance criteria

- A cardio activity can be logged, saved, and survives a refresh
- Strength training, splits, sets, reps, RPE and workout execution are unchanged
- Volume, streak, consistency and PR detection all work with mixed session types
- No `NaN` or undefined anywhere in history or progress after logging cardio
- Estimated calories change when profile weight changes — for **new** entries only,
  not historical ones
- Cardio calories do not silently alter the nutrition target
- Every MET value carries a source
- The football day and football activity do not contradict each other
- Works in Arabic and RTL
- Looks like the same app as every other screen

---

## Verification

Test on a physical iPhone.

By hand:
- Log a padel session, then open Progress, History, Calendar and the streak — confirm none
  of them break or show blank values
- Change your profile weight, then confirm old activities keep their original estimate
- Confirm the nutrition target did not move after logging cardio

When done, update `.claude/PROGRESS.md` and stop.

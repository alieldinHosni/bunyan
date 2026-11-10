# Bunyan — the next phase

A review of the whole app at v256 (10 Nov 2026) and the plan to take it to the next
level, written so that each work package can be handed to a model to build. It was
made by running the app (every main page, the workout from first set to finish, the
first run, the chat, the sheets) at a phone's size, measuring it, and reading the code
behind what looked wrong.

**How to read it.** Part 1 is the verdict. Part 2 is what was found, with the evidence.
Part 3 is the rules every executing model must follow. Part 4 is the work packages, in
the order to build them; each one stands alone. Part 5 is what not to build.

What is marked **Measured** or **Seen** was observed in this review. What is marked
**Proposed** is a design decision made here and is open to the owner's veto.

---

## Part 1 — Verdict

The engineering under Bunyan is strong: a pure engine with 620 unit tests, a browser
suite of about 360 scenarios that now runs on GitHub in six minutes, a renderer that
repaints a page in 5–8 ms, honest formulas with their sources, full Arabic, three
themes, offline. Few apps of this kind are built this carefully.

What holds it back from feeling like a finished product is not any one page. It is
that **the app has many voices and no single head**. Five different parts of the code
each decide, on their own, what to tell the person today. They do not know about each
other, so they pile up, repeat each other and sometimes disagree. The same is true of
the look: each page was polished on its own, so the pieces are good and the whole is
uneven.

The next phase is therefore mostly **consolidation**, in this order:

1. **One head.** A single decision engine that owns "what matters now" for the whole
   app. Every prompt on every page comes from it, ranked, with contradictions resolved
   before the person sees them.
2. **The workout page becomes the flagship.** It is where the app is used with sweat
   on the hands; it gets the 3D figure back, an in-set timer for holds, a real finish
   screen, and nothing that covers the Log button.
3. **Food and training act as one plan.** Today's meals know today's session.
4. **A first run that sells the app** before it asks eleven questions.
5. **One design system**: a small fixed set of components and motions, enforced by a
   test, so the app cannot drift again.
6. **A lighter start**: the app loads 193 script files (4.2 MB) before the first tap.

---

## Part 2 — Findings

Each has an id used by the work packages.

### A. No single head (the main finding)

**F-A1. Contradicting advice on the same day. Seen.** In the test profile, Training
shows a card "Time for a lighter week — fewer sets, about 10% less weight", while the
Coach page, the same minute, shows "Under your range of 10 sets a week: Chest, Quads,
Glutes, Biceps, Triceps → Balance the volume" (add sets) and "Your calories will not
build muscle → Use 2,900 kcal". One says do less, one says do more. Cause: the lighter
week card is drawn by `js/ui/views/train.js` `deloadCard()` from
`engine/formulas.js deloadDue()`; the volume line comes from the weekly check-in
(`js/coach/checkin.js`); the calorie line from `js/engine/plancheck.js`. Nothing
arbitrates between them. `js/ui/views/pcheck.js allAdvice()` only sorts two of the
five sources by a severity number.

**F-A2. The same prescription, two answers. Seen.** The workout page prescribes the
Barbell Bench Press at **12–20 reps** (the block's phase). Asked "I only have 20
minutes today", the coach lists the same exercise, the same day, as **3 × 6–10**.
One reads the phase's range, the other the program's stored range.

**F-A3. Prompts pile up. Seen.** Training home opens on a backup warning, then the
week, then the workout, then the lighter-week card: the thing the person came for
(Start workout) is third. Coach lists 6 items "For you". The Nutrition plan page stacks
three prompts before the plan itself ("The coach suggests 2,900 kcal", "Your macros
add up to 2,430 kcal, 70 under", "Make your meal plan"). Each is reasonable alone.

**F-A4. Sources of prompts today** (all independent): `train.js` (backup card, deload
card, missed day, readiness), `engine/plancheck.js` (18 finding ids), `coach/insights.js`,
`engine/checkin.js` (weekly), `engine/monthly.js` (monthly), `ui/bodyneeds.js` (Food's
"your body needs"), `engine/stress.js`, the coach dot on the dock.

### B. The workout page

**F-B1. A toast covers the main action. Seen (bug).** After logging a set, the "Rep
record" toast sits on top of the **Log set** button for its whole life. When the close
sheet is open it covers "Keep training" and "Discard workout". Cause: `.toast` is fixed
at `bottom: calc(var(--navh) + 14px)` (index.html) whatever is under it.

**F-B2. No figure on the page. Seen.** The workout shows a title and chips; the moving
3D figure is one tap away in the exercise sheet. `docs/MANNEQUIN3D.md` says the figure
belongs on the workout screen; a later change removed it. A person mid-set wants to
glance at the movement, not open a sheet.

**F-B3. A hold has no timer. Seen.** Plank shows "Duration 40 s" with −5/+5 and a Log
button. Nothing counts the 40 seconds. (`js/ui/hold.js` exists and is used by the
warm-up; the working set does not use it.)

**F-B4. Three explanations inside the set card. Seen.** "Recommended 55 kg × 12–20",
"Last time 60 kg × 8" and a two-line note about the new rep range sit under the
steppers and push Log set to the very bottom of the screen (its lower edge is at
830 of 844 px on first open). The readiness question above the card costs another
90 px on the first set.

**F-B5. No finish screen. Seen.** Finishing a workout returns to the list of days.
There is no summary: no time, volume, records, what changes next time, or what to eat
now. The moment of most satisfaction in the app is blank.

**F-B6. Praise that is not earned. Seen.** "Rep record: 12 × 55 kg" is announced when
the person's last session was 60 kg × 8 (a heavier set with a higher estimated max).
A record should mean something.

**F-B7. Header density.** Seven controls before the first number (close, list, coach,
more, info, swap, three chips with their own info icons, next).

### C. Food and training

**F-C1. They do not know about each other during the day. Seen.** Food's page is the
same on a training day and a rest day. The coach knows the textbook's guidance on
eating around training (asked "what should I eat before my workout today?" it answers
from `js/data/faq.js`: carbs before, 400–600 ml of water in the 20–30 minutes before),
but the Food page never says it, and the answer is general, not about today's session.

**F-C2. The time a person trains is not stored. Measured.** No field for it exists
(`trainTime`, `usualTime`: no matches), though every finished session has a start
time from which it can be learned.

**F-C3. Goal and calories can disagree for weeks.** "Your calories will not build
muscle" is correct and useful, but it is item 3 on the Coach page; the Food page's
ring shows 2,500 with no sign that the target is wrong for the goal.

### D. First run

**F-D1. Seen.** After the splash the app opens straight on "Assessment — Question 1 of
11" with the dock visible and tappable under it, a Back button on question 1, and a
validation message ("Enter your age, height and weight to go on") as a toast at the
foot of the screen instead of by the fields. There is no screen that says what the app
does or why eleven questions are worth answering.

### E. Design system

**F-E1. Too many variants. Measured.** 6,300 lines of CSS in `index.html`; 16 motion
durations (`--m-micro` is defined twice, 190 and 200 ms); button styles `btn`, `btn g`,
`btn sm`, `btn d`, `dbegin`, `cf-no`, `afcta`, `pcmore`, `tlink`, `pglink`, `cp-chip`,
`aschip`, `seg-b`, `icobtn`, `srow`, `drow`, plus one-offs. Card surfaces: `card`,
`glass`, `pgcard`, `tgcard`, `ckcard`, `dlcard`, `ttile`, `htile`, `pgc`, `zcard`,
`rcv`, and more. v256 fixed their contrast; their shapes, paddings and radii still
differ page to page.

**F-E2. Section headings come in three styles. Seen.** "For you" (bold, sentence case),
"HIGHLIGHTS" (small caps, tracked), "Today's Meals" (title case).

### F. 3D

**F-F1.** The figure is the app's most distinctive asset and is hidden in a sheet. The
movement table has 209 entries against a library of 949 exercises (coverage of the
library by family was not measured in this review).

### G. Engineering

**F-G1. Start-up weight. Measured.** First load: 199 requests, 193 of them script
modules, 4.2 MB uncompressed. Biggest: `js/i18n/dict.js` 386 KB (both languages, loaded
by everyone), `img/page-home.jpg` 330 KB, `js/ui/views/chat.js` 156 KB, `js/data/faq.js`
126 KB, `exercises.json` 122 KB, `js/data/mannequin/moves.js` 87 KB, `js/ui/sheets.js`
84 KB, three `js/knowledge/*` files of 70–80 KB each. All of it is fetched and parsed
before the first screen, whether or not the person opens the chat. Offline caching
hides this after the first visit; the first visit and every update pay it.

**F-G2. Rendering is fast. Measured.** A full repaint of Training takes 5–8 ms, Food
6 ms. No work needed there.

**F-G3. iPhone-only bugs are found by the owner, not by tests.** The suite runs in
Chromium only. Keyboard, back-swipe and blur bugs this month were all Safari's.

**F-G4. One 6,300-line stylesheet and a 156 KB chat module** make every change riskier
than it needs to be.

### H. Coach gaps

**F-H1. Safety. Seen.** "I feel dizzy" gets "That isn't something I can answer from
your log". Symptoms during training should get a fixed stop-and-seek-help answer.

**F-H2. Seen.** "I'm travelling next week with no gym" is offered to be "remembered"
instead of answered with a plan for the week (the engine can already rebuild a program
for bodyweight; the coach offers it when asked directly).

---

## Part 3 — Rules for whoever builds this

Read `CLAUDE.md` first; it overrides anything here. In short:

- Vanilla ES modules. No framework, no build step, no npm, no `package.json`.
- Never rebuild a whole screen with `innerHTML` for a small state change.
- Every user-facing string goes through `t()` with an Egyptian Arabic entry
  (`js/i18n/dict.js`). Verify in RTL. Numbers in `.num`.
- Design tokens only: no raw hex, spacing or radius values outside the theme blocks.
- Per-profile storage. Migrations treat absent data as "no history", never as zero.
- Formulas are fixed (Epley capped at 12 reps, volume Σ(w×r), Mifflin-St Jeor, 4/4/9,
  MET). Cardio calories never change the nutrition target.
- Honesty: no invented values. If the knowledge base (`js/knowledge/`, `js/data/faq.js`)
  has no figure for something, the feature does not show one. Never copy the textbooks'
  prose from `source/`.
- The app must work offline.

**Workflow for every package**

1. Branch from `main` as `session/<name>`.
2. A new module goes in `sw.js` `FILES`; bump `CACHE` in `sw.js` and `VERSION` in
   `js/version.js` together when anything the browser loads changes.
3. Add a regression test in `tests/regression.mjs` (before the test named
   "Change workout judges each day against the muscles…"). Engine logic gets unit tests
   in `js/engine/test/` or `js/coach/test/`.
4. Run locally: `node tests/architecture.mjs && node tests/engine.mjs && node tests/coach.mjs`,
   then the related browser tests with `ONLY="text|text" node tests/regression.mjs`
   (serve with `python3 -m http.server 8765`).
5. Add an entry to `.claude/PROGRESS.md`.
6. Open a pull request. GitHub runs everything (`.github/workflows/tests.yml`). Merge
   only when all seven checks are green.
7. Look at the result at 390 × 844 in dark and light, English and Arabic, before
   calling it done. The "Contrast" tests must stay green.

**Layering** (`tests/architecture.mjs` enforces it): `js/coach/` and `js/engine/` are
pure or state-reading logic with no DOM; `js/ui/` draws. New decision logic goes in
`js/engine/`, never in a view.

---

## Part 4 — Work packages

Build in this order. WP-1 is the foundation for 2, 4 and 5. WP-0 is a same-day fix.

| # | Package | Fixes | Size |
| --- | --- | --- | --- |
| 0 | Toast never covers an action; honest records | F-B1, F-B6 | small |
| 1 | The head: one decision engine | F-A1–A4, F-C3 | large |
| 2 | Today: one card that leads the day | F-A3 | medium |
| 3 | Workout page, the flagship | F-B2–B5, B7 | large |
| 4 | Finish screen and what happens next | F-B5 | medium |
| 5 | Food and training as one plan | F-C1–C3 | medium |
| 6 | First run | F-D1 | medium |
| 7 | Design system: components and motion | F-E1, E2 | large |
| 8 | 3D, used where it matters | F-B2, F-F1 | medium |
| 9 | A lighter start | F-G1, G4 | medium |
| 10 | Safari in the test suite | F-G3 | small |
| 11 | Coach gaps | F-A2, F-H1, H2 | small |

---

### WP-0 — Toast never covers an action; records that mean something

**Goal.** A toast is never drawn over a button the person is about to press, and a
"record" is only announced when it is one.

**Files.** `js/ui/view.js` (`toast()`, line ~201), `index.html` (`.toast`),
`js/engine/lifts.js` / wherever `recordText` decides a record (`js/engine/formulas.js`
exports `recordText`), `js/ui/handlers/session.js`.

**Build.**
1. In `toast()`, before showing, work out where it may sit: collect the rectangles of
   the visible primary actions (`.sess .log`, `.sess .wkdock`, `#sheet .sheetbox .btn`,
   `.sfoot`, `.kpad.on`). If the default position overlaps any, place the toast at the
   **top** of the screen instead (under the header, `top: calc(env(safe-area-inset-top)
   + var(--s3))`), sliding down. Add a `.toast.top` rule; keep the existing bottom
   position as the default.
2. While a sheet is open (`V.sheet`), toasts always use the top position.
3. Records: a rep record is announced only when the set's estimated 1RM (Epley, capped
   at 12 reps — do not widen) is at least the lift's best estimated 1RM, **or** the
   reps beat the best reps ever done at that weight or heavier. A first-ever set at a
   weight is not a record (this rule already exists for the first time a lift is done;
   extend it to "first time at this weight, lighter than the best").

**Accept.**
- Test: log a set in a workout; the toast's rectangle does not intersect `.sess .log`.
  Open the close sheet with a toast showing; it intersects no `#sheet .btn`.
- Test: last session 60 kg × 8, today 55 kg × 12 (e1RM 77 vs 76) → no record toast;
  55 × 13 after 55 × 12 → record.
- Existing "records: weight, estimated max and reps count" test still passes (update
  its expectations only where this rule changes them, and say so in PROGRESS.md).

---

### WP-1 — The head: one decision engine

**Goal.** One module decides everything the app proactively tells the person. Pages
ask it; they never decide for themselves. Contradictions are resolved inside it.

**New file.** `js/engine/head.js` (reads state, no DOM). Unit tests in
`js/engine/test/head.test.js`.

**The model.** Every existing source becomes a *signal provider* that returns signals
in one shape:

```js
{ id: "deload-due",          // stable, used for dismissal and tests
  domain: "training",        // training | nutrition | recovery | body | data | setup
  kind: "act",               // act (changes a plan) | log (asks for data) | info
  pri: 80,                   // 0–100, see the table below
  effect: {volume:-1},       // what accepting it does: volume, load, kcal, protein: -1 | 0 | +1
  title, body,               // already through t()
  actions: [{label, attr}],  // the same data-* attributes the cards use today
  page: "train",             // the page it belongs to when not the lead
  expires: "2026-11-16" }    // optional
```

Providers (wrap, do not rewrite): `plancheck.checkPlans()`, `coach/insights` via
`coachNow()`, `engine/checkin.checkinOpen()`, `engine/monthly.monthlyOpen()`,
`formulas.deloadDue()/inDeload()`, `engine/stress.js`, `engine/missed.js`,
`ui/bodyneeds.js`'s logic (move its decision part into `js/engine/needs.js`, which
exists), the backup reminder (move its "never exported" test out of `train.js`).

**Priority bands** (fixed, written at the top of the file):

| pri | What |
| --- | --- |
| 100 | Safety: a health condition or injury rule being broken, calories under the floor |
| 80–90 | Recovery: lighter week due, stress/sleep protocol, pain reported |
| 60–79 | Plan is wrong for the goal: calories vs goal, protein, volume far out of range |
| 40–59 | Adherence: missed sessions, check-in open, monthly review |
| 20–39 | Optimisation: balance the volume, phase change, learned maintenance |
| 0–19 | Housekeeping: backup, weigh-in reminder, name not set |

**Conflict rules** (the reason this package exists). Applied after collecting, before
ranking. Each is one small pure function with a unit test:

1. **Recovery beats progression.** While any signal with `effect.volume < 0` or
   `effect.load < 0` and pri ≥ 80 is live (lighter week due or running, stress
   protocol, drained readiness), suppress every signal with `effect.volume > 0`
   ("under your range", "balance the volume", "add a set"). They return when the
   recovery signal clears. *This removes F-A1.*
2. **One calorie voice.** At most one signal with `effect.kcal != 0` is live; the
   highest priority wins and the others are suppressed (learned maintenance vs "will
   not build muscle" vs "macros add up to less").
3. **Deficit and volume.** In a calorie deficit signal (`kcal-down`, `kcal-steep`), do
   not show "add volume"; the existing `deficit-volume` finding already says why.
4. **A missed week is not a weak week.** If sessions done < planned this week, suppress
   "under your range" for muscles whose shortfall is explained by the missed sessions.
5. **Housekeeping never leads** while anything with pri ≥ 40 is live, and at most one
   housekeeping signal shows per day (rotate by date).
6. **Said once.** A signal dismissed ("Not now", "Keep it as it is") stays away as the
   existing `S.pcDismiss` / `S.coachDismiss` do; keep those stores, key them by signal id.

**API.**

```js
headNow()        // → { lead, queue, byPage:{train:[],food:[],coach:[],progress:[]}, count, suppressed }
headFor(page)    // → signals that belong on that page, lead excluded
headWhy(id)      // → which rule suppressed a signal (for the coach chat and tests)
```

Memoise on `dataRev()` + date like `engine/energy.js learnedNow()` does.

**Rewire the views** (each keeps its own card markup; only the *decision* moves):
- `js/ui/views/coach.js forYou()` lists `headNow().queue` (replaces `stressCard`,
  `ckCard`, `moCard`, `adviceList` ordering).
- `js/ui/views/train.js`: `deloadCard()`, the backup card and the missed-day card are
  drawn only if `headFor("train")` contains them.
- `js/ui/views/food.js`: the plan page's three prompts become `headFor("food")`,
  at most one above the plan.
- `js/ui/dock.js` coach dot = `headNow().count`.
- The chat's "what should I do?" answers quote `headNow().lead`.

**Accept.**
- Unit: with deload due and volume under range, `queue` has the deload signal and not
  the volume one; `headWhy("vol-low")` returns `"recovery"`. One test per rule.
- Unit: three calorie findings in → one out.
- Browser: in the seeded profile, Training and Coach never show "lighter week" and
  "Balance the volume" together. The Nutrition plan page shows at most one prompt
  above "Your daily goal".
- Every existing test of the individual cards still passes (they are still drawn, by
  the same markup).

**Risk.** This touches many tests. Do it in two pull requests: (a) `head.js` with
providers, rules and unit tests, no view changed; (b) rewire views one page at a time.

---

### WP-2 — Today: one card that leads the day

**Goal.** Training home opens on the answer to "what do I do now?", built from the
head, and everything else waits below it.

**Files.** `js/ui/views/train.js` (`vTrainHome`), `index.html` (one new block),
`js/engine/head.js` (adds `todayPlan()`).

**Build.**
1. `todayPlan()` returns, for now: `{ state, session, lead, food }` where `state` is
   one of `train` (a session is planned and not done), `resume` (a workout is open),
   `done` (trained today), `rest` (rest day), `light` (lighter week running), and
   `lead` is `headNow().lead` if its pri ≥ 60, else null.
2. The top of Training becomes, in this order, with nothing above it:
   - greeting and date (as now);
   - **the Today card**: the session's name, exercises, minutes and **Start workout**
     (or Resume / Done ✓ with the next session / Rest day with what recovery wants).
     If `lead` exists it is **one line inside this card** with one button
     ("Lighter week is due — Start it"), not a second card;
   - the week strip;
   - weight and steps;
   - at most **one** other card from `headFor("train")`;
   - cardio, your program.
3. The backup reminder moves out of first position; it appears as the single
   housekeeping card at the foot, by rule 5 of WP-1, and in Profile → Your data as it
   does today.

**Accept.**
- On a training day, `[data-startday]` is fully visible without scrolling at
  390 × 844 and 375 × 667, in both languages.
- With deload due: no separate "Time for a lighter week" card; the Today card carries
  the line and the button; tapping it starts the lighter week (existing handler
  `data-deload="start"`).
- Never more than two prompt cards on Training home, whatever the data (test with a
  profile that triggers all of them).

---

### WP-3 — The workout page, the flagship

**Goal.** One glance tells you what to do; one thumb logs it; nothing else competes.

**Files.** `js/ui/views/session.js` (621 lines), `js/ui/workout.js`,
`js/ui/handlers/session.js`, `js/ui/hold.js`, `index.html` (`.sess …`),
`js/ui/mannequin*` (see WP-8 for the figure itself).

**Layout, top to bottom** (Proposed):

1. **Header**: close · "Full Body A — 1 of 6" (opens the list) · elapsed time · ⋯.
   The coach button moves into ⋯ (the floating coach is one swipe away already);
   the segmented progress bar stays.
2. **Stage** (new, ~170 px): the 3D figure of the exercise, playing, on the left; on
   the right the name (two lines max), "Set 2 of 3", and the target in one line:
   **"12–20 reps · leave 3 · tempo 4-2-1-1"**. The three chips with their own info
   icons become this one line; a tap on it opens the existing explanation sheet.
   ⓘ and swap stay as two round buttons on the stage. If the exercise has no figure
   yet, the stage shows its photograph (never an empty box; rule: no exercise without
   an image).
3. **Set card**: weight and reps with their steppers, exactly as now (they are good).
   Under them **one** line, chosen in this order: plates ("Bar + 15 + 2.5 a side") when
   it is a barbell lift; else nothing. "Recommended" and the new-range note are removed
   from the card: the suggested values are already *in* the steppers and marked
   "Suggested". "Last time 60 kg × 8" moves into the set list as the faint value of
   each row not yet done.
4. **Log set** button, then **rest band**, as now.
5. **Set list**, as now. "Next: Wide-Grip Lat Pulldown" moves here, under the list,
   where the eye goes after the last set.
6. Readiness ("How do you feel today?") is asked **before** the workout starts, on the
   Today card's Start (a sheet with the five answers and Skip), not above the first
   set. Its effect on suggestions is unchanged (`engine` readiness rules).

**In-set timer for holds and timed work (F-B3).**
- When the exercise is measured in seconds (Plank, carries, isometrics: the same test
  the page uses to show "Duration"), the Log button reads **"Start 40 s"**. Tapping it
  starts a countdown in the button itself (a fill moving across, the seconds large),
  with the same sound and haptic at the end as the rest timer (`js/ui/workout.js`
  audio; `tap()` in `js/ui/view.js`). At zero the set logs itself at the target and
  rest starts. A tap during the countdown stops it and logs the seconds actually held.
  Reuse `js/ui/hold.js`; do not write a second timer.
- A long-press on the button logs without the timer (for someone who timed it on the
  gym's clock). Say so once in the page guide (`js/ui/tour.js`).

**Motion.** Stage and set card slide between exercises with `PAGE` from
`js/ui/transit.js`; the figure cross-fades (do not restart the WebGL context: keep one
canvas for the page and swap the move).

**Accept.**
- At 390 × 844 on the first set of a barbell lift, the Log button's bottom edge is at
  least 96 px above the bottom of the screen (today: 14 px). At 375 × 667 it is fully
  visible without scrolling.
- Controls above the first number: at most 5 (today 7 plus three chip-info icons).
- Plank: tapping Start counts down; at 0 a set of 40 s is logged and rest runs; a tap
  at 25 s logs 25 s. Works after a reload mid-hold (the hold's start time is stored in
  the open workout, like the rest timer's).
- The existing workout tests pass with their selectors updated; no test deleted.
- RTL: the stage mirrors (figure on the right); the figure itself is not mirrored.

---

### WP-4 — The finish screen, and what happens next

**Goal.** Finishing a workout ends on a screen that closes the loop: what you did,
what it changes, what to do now.

**Files.** New `js/ui/views/finish.js` (a page, `V.train="finish"`), route in
`js/ui/views/train.js vTrain()` and `js/ui/nav.js`; data from `js/engine/stats.js`,
`js/engine/lifts.js`, `js/engine/head.js`; add to `sw.js`.

**Content, in order.**
1. A drawing that draws in (`js/ui/art.js`, same style as the page headers) and the
   line "Full Body A — done", with time, sets and volume (Σ weight × reps; the
   existing figure) counting up (`countTo` in `js/ui/motion.js`).
2. **Records** from this session, each a row (only real ones, by WP-0's rule). None:
   the row is left out, not replaced with filler.
3. **Next time**, one line per lift that changes: "Bench Press: 57.5 kg next time —
   you hit 12 on every set". This is the progression rule the engine already applies
   (`engine/lifts.js` suggestion); show its decision now instead of silently next
   session. Lifts that stay the same are not listed.
4. **How hard was it?** the session RPE taps, if not already answered.
5. **Now**: one line from `todayPlan().food` (WP-5), e.g. "You have 62 g of protein
   left today — log your meal", with a button to Food. Only if a target exists.
6. **Done** (returns to Training, where the Today card now reads "Done ✓ · Next:
   Full Body B, Thursday").

Finishing early (the close button's "Finish workout") lands on the same screen with
the sets actually done.

**Accept.** Test: finish the seeded workout → the page shows minutes, sets, volume
equal to `Σ(weight × reps)` of the logged sets; a lift that met the top of its range
on all sets shows its next weight, equal to what the next session then suggests.
Arabic and RTL checked. Reload on the finish page returns to Training without losing
the session.

---

### WP-5 — Food and training as one plan

**Goal.** Today's food knows today's training, using only what the knowledge base
supports.

**Rule first.** Daily calories and macros do **not** change between training and rest
days: the activity multiplier already counts training (`CLAUDE.md`), and the knowledge
base gives no day-by-day cycling method. What changes is **timing and emphasis within
the same targets**.

**Files.** New `js/engine/dayfuel.js` (pure: session + targets + log + clock in, a
small plan out) with unit tests; `js/ui/bodyneeds.js` / `js/ui/views/food.js` to show
it; `js/engine/head.js`; `js/data/faq.js` / `js/knowledge/nutrition-principles.js` as
the only sources of figures.

**Build.**
1. **Learn when the person trains.** `usualStart(weekday)` = median start time of the
   last 6 finished sessions on that weekday (fall back to all weekdays; none → null).
   Stored nowhere; computed from `S.sessions`. Never asked as a question.
2. **`dayFuel(now)`** returns a list of at most three timed notes for today:
   - *before* (from 2 h before the usual start until the start, on a day with a
     session planned and not done): the knowledge base's own guidance on carbs and
     fluid before training, with **its** figures (the 400–600 ml in the 20–30 minutes
     before is already in `faq.js`; use that entry's text key, do not restate numbers
     in a second place);
   - *after* (from finishing until 2 h later): protein still to go today and the
     knowledge base's guidance on protein after training, if it has one with a figure.
     If it has none, the note says only what is left of today's target;
   - *behind* (any time): what `bodyneeds` says today (protein behind for the time of
     day), unchanged.
   Each note carries `source` (the knowledge entry's id) so the page can show
   "From the textbook" the way the coach's answers do.
3. **Show it** in one place: Food's "Your body needs…" card becomes the day's fuel
   card and leads with the timed note when there is one ("Training at about 18:00 —
   …"). The same line is `todayPlan().food` on Training's Today card and on the finish
   screen. One function, three places, one wording.
4. **Goal and calories in the ring.** When the head holds a pri ≥ 60 calorie signal
   (`surplus-low`, `kcal-off`…), the ring's caption on Food shows it in five words
   with the same one-tap action ("Under what building needs · Use 2,900"). The ring
   never looks fine while the plan is wrong for the goal.
5. **Rest and lighter weeks.** On a rest day the card says so and shows the plain
   target; during a lighter week nothing about food changes (say nothing).

**Accept.**
- Unit: with sessions at 18:05, 17:50, 18:20 on Tuesdays, `usualStart(2)` is 18:05;
  at 16:30 on a Tuesday with a session planned `dayFuel` leads with *before*; at 19:30
  after finishing, *after*; on a rest day neither.
- Every figure shown by a fuel note can be traced to a knowledge entry (test: each
  note has a `source` that exists).
- Browser: the same sentence appears on Food and on Training's Today card.
- No change to `S.goals` is made by any of this (test: targets equal before and after
  a training day).

---

### WP-6 — First run

**Goal.** A new person understands what they get before being asked for anything,
and the assessment feels short.

**Files.** `js/ui/views/assess.js`, `js/ui/views/home.js`, `js/ui/dock.js`,
`index.html`.

**Build.**
1. **Three welcome cards** after the splash, swipeable, skippable, each one drawing in
   the app's line style and one sentence: "A program built for you, and rebuilt as you
   change" · "Food that follows your goal — in Arabic or English, offline" · "Everything
   stays on this phone". Then "Build my plan" (starts the assessment) and a quiet
   "I have a plan already" (opens the existing import: `timport.js`).
2. **No dock during the assessment** (`nav` hidden while `!S.onboarded`), and no coach
   button. Question 1 has no Back (or Back returns to the welcome cards).
3. **Inline validation**: the message goes under the fields that need it
   (`aria-live="polite"`, the fields get `aria-invalid`), not in a toast.
4. **Progress that reads as short**: group the 11 questions under three named steps
   shown in the header ("You · Your week · Your body"), with the bar filling per
   question as now.
5. **The reveal.** After the last question, a build screen (1.5–2.5 s, real work shown
   as it happens: "Choosing your split… Setting your weekly sets… Working out your
   calories…" — each line appears when that engine call returns, never on a fake
   timer), then the plan summary the app already shows.
6. The number fields use the app's keypad (v255) — check they do inside the assessment
   (it is a page, not a sheet; `js/ui/keypad.js isNum()` only accepts `#sheet`; extend
   it to `.assess` fields).

**Accept.** Fresh profile test: the welcome cards show; the dock is absent until the
plan is accepted; leaving age empty shows the message next to the field and no toast;
the keypad opens for Age. Arabic checked.

---

### WP-7 — The design system

**Goal.** A fixed, named set of components and motions; pages are assembled from them;
a test fails when someone adds a one-off.

**Files.** `index.html` (stylesheet), every view that emits markup, new
`docs/DESIGN-SYSTEM.md`, `tests/regression.mjs`.

**The set** (Proposed; names are the classes to keep):

| Component | Class | Replaces |
| --- | --- | --- |
| Primary button | `.btn` | `dbegin`, `afcta` |
| Secondary button | `.btn.g` | `cf-no`, `pcmore`, `ckcard-done` |
| Small button | `.btn.sm` | — |
| Destructive | `.btn.d` | — |
| Text link | `.tlink` | `pglink`, `pgc-go` |
| Icon button | `.icobtn` | per-page round buttons |
| Chip (choice) | `.chip` | `aschip`, `cp-chip` |
| Segmented control | `.seg` | `pgtabs2`, `psecs` variants |
| Card | `.card` | `pgcard`, `tgcard`, `dlcard`, `ckcard`, `zcard`, `rcv`, `pgc` |
| Card, emphasised | `.card.lead` | `thero2`, the gold-edged cards |
| List row | `.srow` | `drow`, `pghl-r` |
| Section header | `.tsec` + `.tsec-h` | `pglbl`, `sg-h` |
| Stat | `.stat` | `ptile` figures, `pgstat` |
| Empty state | `.empty` | per-page ones |

Rules:
- One radius per size: card `--r4`, row/inner `--r3`, pill `--rpill`. One card padding:
  `--s4`. One gap between cards: `--s4`. One section-header style: **sentence case,
  17 px, bold** ("For you", "Today's meals", "Highlights"); the small-caps label style
  (`.shk`) is kept only as the eyebrow *inside* a card.
- One primary button per screen. Everything else is secondary or a link.
- Type scale, 7 steps only: 28 / 22 / 17 / 15 / 13.5 / 12.5 / 11.

**Motion, four speeds** (replace the 16 `--m-*` values; keep the names as aliases for
one release so nothing breaks):

| Token | ms | For |
| --- | --- | --- |
| `--m-press` | 110 | touch feedback |
| `--m-quick` | 200 | small state change, toggles, chips |
| `--m-move` | 380 | sheets, cards entering, expand/collapse |
| `--m-page` | 520 | page travel (`PAGE.ms` in `js/ui/transit.js`) |

Two curves: `--e-standard` for things that change in place, `--e-decel`
(the page curve, `cubic-bezier(0.22, 1, 0.36, 1)`) for things that arrive.

**How to do it without breaking 360 tests.**
1. Write `docs/DESIGN-SYSTEM.md` with the table above and a screenshot of each
   component in dark and light.
2. Migrate **one page per pull request**, in this order: Progress, Coach, Food,
   Training, Profile, plan pages, sheets. For each: change the markup's classes to the
   set, delete the page's own rules that the set now covers, keep the `data-*`
   attributes (tests select by them), compare before/after screenshots.
3. After the last page, delete the aliases.
4. **The guard test** ("Design system: no one-off surfaces"): parse the stylesheet;
   fail if a rule outside the component section sets `border-radius`, a `background`
   that is a surface token (`--card`, `--raised`, `--glass`), or a `transition`
   duration that is not one of the four tokens. A short allow-list sits in the test
   with a reason beside each entry.
5. Keep the stylesheet in one `<style>` in `index.html` (there is no build step, and
   separate files would delay first paint), but order it tokens → components → pages
   under banner comments, and have the guard test enforce that order.

**Accept.** The guard test passes; the three "Contrast" tests pass; before/after
screenshots of each page reviewed in both themes and both languages; stylesheet at
least 25% shorter (it is 6,300 lines).

---

### WP-8 — 3D, used where it matters

> **Superseded by `docs/FIGURE-V3.md`** (the figure's review and full design, packages
> F-0 to F-9). What follows is kept for the workout-stage and coverage parts, which
> are F-9 there.

**Goal.** The figure is seen every set, covers the exercises people actually do, and
never costs a frame.

**Files.** `js/data/mannequin/*`, `js/ui/mannequin*` (see `docs/MANNEQUIN3D.md`, which
is the specification of the renderer; follow it), `js/ui/views/session.js`.

**Build.**
1. **On the workout stage** (WP-3): one canvas for the page, the figure playing at the
   exercise's tempo when the prescription has one (4-2-1-1: four seconds down, two
   held, one up, one held — the animation follows it, which also teaches the tempo
   without a word). It does not turn there (a sideways swipe changes exercise); it
   pauses when the page is hidden, when rest is running out of view, and under
   reduced motion (a still frame).
2. **Coverage report.** Add `tools/figure-coverage.mjs` (a tool, not shipped): for
   each exercise in `exercises.json`, whether `moves.js` resolves a move for it; print
   the share covered, and the uncovered exercises ordered by how often they appear in
   the built-in programs and templates. Extend families in that order. Target: every
   exercise in every template the app can generate has a figure; the rest keep their
   photographs.
3. **Muscle map in 3D on Progress** (Proposed, second step): the same body, standing,
   turnable, each muscle tinted by this week's sets against its range (under, in,
   over) — it replaces the flat front/back drawing on Progress → Strength. Only build
   after step 2 reaches its target.
4. **Budget.** The stage must hold 60 frames a second on a four-year-old phone: cap
   the canvas at 2× pixel ratio on the stage (3× in the sheet), and drop to a still
   frame if three consecutive frames take over 24 ms.

**Do not** add a 3D library, a model download, avatars, or decorative 3D backgrounds.
The figure earns its place by teaching the movement.

**Accept.** Workout test: the stage holds a canvas whose move name matches the
exercise; switching exercise does not create a second WebGL context; hidden page →
no frames requested. Coverage tool prints 100% for exercises used by generated plans.

---

### WP-9 — A lighter start

**Goal.** The first screen needs a fraction of today's 193 modules and 4.2 MB.

**Files.** `js/app.js`, `js/i18n/dict.js`, `js/ui/views/chat.js`, `js/ui/agent.js`,
`js/data/faq.js`, `js/knowledge/*`, `sw.js`, `tests/architecture.mjs`.

**Build** (each step is its own pull request, measured before and after with the
snippet below):

1. **Split the dictionary.** `dict.js` holds English keys with Arabic values (386 KB).
   An English user needs none of it. Move the Arabic table to `js/i18n/ar.js` and
   `import()` it only when the language is Arabic, **before first render** (the
   language is known from the profile's small early key, as the theme is). `t()` stays
   synchronous. The service worker still precaches both.
2. **Load the coach chat on demand.** `chat.js` (156 KB), `agent.js` (69 KB), `faq.js`
   (126 KB) and the `js/knowledge/*` files they pull (≈ 600 KB together) load when the
   chat is first opened or when idle after first paint
   (`requestIdleCallback`, falling back to a 2 s timer), whichever is first. What the
   pages need from them at start (the coach dot's count) comes from `engine/head.js`
   (WP-1), which must not import the knowledge files.
3. **Same for** the 3D moves table (87 KB, until an exercise is shown), the OCR and
   barcode vendors (already lazy — verify), the assessment (once onboarded), the
   import/share modules.
4. **Images.** `img/page-home.jpg` is 330 KB for a background shown under a veil at
   78% opacity; re-encode the eight page photographs at the size a phone needs
   (`tools/images.py` exists) aiming at ≤ 120 KB each, and load only the current
   page's picture at start (the others when idle).
5. **A budget test** in `tests/regression.mjs`: on first load with an empty cache,
   requests before the first screen is interactive ≤ 80 and bytes ≤ 1.6 MB (numbers to
   be confirmed after step 2; set them 10% above what is achieved, so they only catch
   regressions).

Measure with:

```js
performance.getEntriesByType("resource").length                                   // 199 today
performance.getEntriesByType("resource").reduce((a,x)=>a+(x.encodedBodySize||0),0) // 4,224,327 today
```

**Must not break:** offline (everything stays in `sw.js FILES`; lazy means "not
*evaluated* at start", not "not cached"); the architecture test's precache check.

**Accept.** The budget test passes; the offline test ("works with the network
disabled") passes; opening the chat for the first time offline works.

---

### WP-10 — Safari in the test suite

**Goal.** iPhone-only bugs are caught before the owner's phone finds them.

**Files.** `.github/workflows/tests.yml`, `tests/regression.mjs`.

**Build.** Add a second job that installs Playwright's WebKit and runs a **tagged
subset** of the suite in it: tests whose names begin with a marker (add `{webkit:true}`
to the test's options and have `BROWSER=webkit` run only those). Start with: the
keyboard and keypad tests, sheets, the dock, back-swipe, page transitions, the workout
from start to finish, the contrast tests. Fix or mark-with-reason what differs; do not
skip silently. `const browser = await ({chromium, webkit})[process.env.BROWSER||"chromium"].launch()`.

**Accept.** The WebKit job is green and required; a deliberately reintroduced Safari
bug (remove `inputmode="none"` handling) makes it red.

---

### WP-11 — Coach gaps

> **Superseded by `docs/COACH-AGENT.md`** (the coach's review and full upgrade plan,
> packages C-0 to C-10). The items below are C-0, C-4, C-5 and C-8 there.

**Files.** `js/ui/views/chat.js`, `js/coach/intent.js`, `js/knowledge/scope.js`,
`js/engine/coachinfo.js`, tests in `js/coach/test/`.

1. **One prescription (F-A2).** Find where the "I only have N minutes" answer builds
   its list (`chat.js`, answer id `missed`) and make it read sets and reps from the
   same function the workout page uses for today's session (the phase-adjusted
   prescription), not the program's stored `lo`/`hi`. Then search for every other
   place that prints "sets × reps" for an exercise (chat answers, the day page, the
   share text, the PDF/plan copy) and route them all through that one function. Add a
   test: for each exercise of today's session, the chat's list and the workout page
   show the same range.
2. **Symptoms (F-H1).** A fixed answer for symptom words during or about training
   (dizzy, faint, chest pain, short of breath, numb, and their Arabic forms): stop the
   session, rest, and seek medical help if it does not pass or if it is chest pain —
   worded from `js/knowledge/scope.js` (the scope-of-practice rules already in the
   app), with no advice beyond it. It outranks every other intent. If a workout is
   open, the answer carries a "Pause my workout" action.
3. **Travel and no equipment (F-H2).** "Travelling", "no gym", "hotel", "at home this
   week" → offer what the engine already does: a bodyweight version of the week to
   review (the existing rebuild for equipment), for the dates said, with Undo, and
   offer to remember the dates. Not the generic "remember this?".
4. **The coach speaks for the head.** "What should I do today?", "what's most
   important?", "why did you tell me X?" answer from `headNow()` and `headWhy()`
   (WP-1), so the chat and the pages can never disagree.

**Accept.** Unit tests for each phrase in English and Arabic; the consistency test in 1.

---

## Part 5 — What not to build

- **No accounts, servers or cloud sync** in this phase. "Everything stays on this
  phone" is a promise the app makes on its first screen.
- **No calorie cycling, no cardio calories added to the target**, no macro timing
  figures the knowledge base does not hold.
- **No automatic plan changes without a tap.** The owner chose one tap with Undo
  (10 Nov) for learned maintenance; the same holds for every change the head proposes.
- **No 3D for decoration**, no avatar, no framework, no build step.
- **No new page** for any of this. Every package above removes or merges surfaces;
  the count of prompts a person sees should go down, not up.

---

## Appendix — numbers from this review (v256, 390 × 844, Chromium)

| What | Value |
| --- | --- |
| Requests on first load | 199 (193 modules) |
| Bytes on first load (uncompressed) | 4,224,327 |
| Full repaint, Training / Food | 5–8 ms / 6 ms |
| DOM nodes, Training home | 337 |
| Stylesheet | 6,323 lines, 16 motion durations |
| Script modules in `js/` | 247 |
| Largest app modules | dict.js 386 KB, chat.js 156 KB, faq.js 126 KB |
| Log set button, bottom edge on first set | 830 of 844 px |
| Prompts on first screens (seeded profile) | Training 2, Coach 6, Nutrition plan 3 |
| Exercises in the library / entries in the 3D move table | 949 / 209 |

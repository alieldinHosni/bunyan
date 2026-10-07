# Bunyan — training & nutrition tracker

**بنيان** — structure, edifice, something built course by course.

A single-page app. No backend, no accounts, no cost. Everything is stored in your
phone's browser and never leaves the device.

## Put it online (about 10 minutes, free)

1. Create a free GitHub account.
2. Click **New repository**. Name it `bunyan`. Set it to **Public** — GitHub Pages
   only works on free public repos. Nothing sensitive is in the code; your data
   never goes near it.
3. On the repo page choose **Add file → Upload files**, drag in the app files, and
   commit. They are `index.html`, `sw.js`, `manifest.webmanifest`, `exercises.json`,
   `instructions.json`, `foods.json`, `icon-180.png`, `icon-512.png`, `mark.png`,
   `intro.jpg`, **and the whole `js/` folder with its sub-folders intact** — the app is
   ES modules and each one is fetched by its path, so a flattened `js/` will not run.
   That includes `js/vendor/`, which holds the barcode decoder used by iPhones.
   Working folders such as `UI/` and any `.zip` do not belong on the site.
4. Go to **Settings → Pages**. Under Source pick **Deploy from a branch**,
   branch `main`, folder `/ (root)`. Save.
5. Wait two minutes. Your link appears at the top of that page and looks like
   `https://yourname.github.io/bunyan/`.

## Put it on your home screen

Open the link in **Safari** (not Chrome, and not the in-app browser inside
Instagram or WhatsApp — those use separate storage and your data will not follow).
Tap the share icon, then **Add to Home Screen**. You now have an app icon that
opens full screen and works with no signal.

## Back up your data

Profile → Backup and reset → Export a backup. Copy the text into a note or email it to
yourself. If you clear Safari's data, change phones, or delete the home screen app, the
backup is the only way to get your history back. Clearing site data now wipes both
localStorage and IndexedDB, so it is no less important than before.

Once you have five sessions logged, the Training page reminds you if it has been more than a month
since your last backup. "Not now" hides it for a week. The reminder only clears when a
copy actually succeeds, so dismissing the sheet does not count.

## Profiles and sharing

**Profiles** live on one device. If a friend trains on your phone, give him his own
profile in Profile → Add a profile. Separate log, separate weight, separate everything.
The first profile is the admin and cannot be deleted.

**Share codes** are how you follow a friend on his own phone. He taps
Profile → Share my progress, copies the text, sends it to you. You open
Profile → Friends I follow, paste it, and see his sessions, volume, best lifts and
weight trend, read only.

It is a snapshot, not live sync. He sends a new code when he wants you to see an
update. He never sees your log, and his numbers never touch yours.

**Live sync is not possible without a server.** For your data to reach his phone it
would have to pass through one, which means accounts, passwords, a monthly bill past
the free tier, and you holding someone else's data. The share code gets you most of
the benefit at none of that cost.

## Changing the app later

Edit the file you need under `js/` on GitHub and commit. Then open `sw.js`, bump the
`CACHE` line to the next number (`bunyan-v24` → `bunyan-v25`), and commit that too —
otherwise phones keep serving the cached old version. If you add a **new** module, add
its path to `FILES` in `sw.js` as well.

**Opening `index.html` from your desktop will not work any more.** Browsers refuse to
load ES modules over `file://`. Use the GitHub Pages link, or run any local static
server from the project folder.

## How the app is laid out

Five tabs. Two are for the day, one is for planning, one for looking back, one for you.

- **Training** (`views/train.js`, with its top in `views/home.js`) opens the app: the
  greeting, one reminder at most, the week, today's workout (start it, or change the
  day to another of the plan), weigh-in and steps, and a run or a match to log. A
  workout left for later shows here as a Resume card.
- **Food** (`views/food.js`) is the day: what you have eaten against the targets, the
  meals (a planned one is a tap from logging), water, and "Log today's plan".
- **Coach** (`views/coach.js`) is where the planning lives, in three sections:
  - *Training*: the active program's days, other programs, templates, a coach's PDF
    brought in, the exercise library;
  - *Nutrition*: the meal plan, the daily targets, foods of your own, a plan brought in;
  - *Coach AI*: the assessment, which builds the daily targets, the training and the
    meal plan in one step, with one Undo, and puts them on Training and Food; then
    *Ask the coach*; then what the plan check and the coach see (`views/pcheck.js`).

**Ask the coach** (`views/chat.js`, with `coach/intent.js`) is a guided chat, not a
chatbot. A question, tapped from the suggestions or typed in English or Arabic, is
matched to one of a fixed set of things the coach can answer: today's workout, what to
lift, what to eat now, how things are going, the weight trend, protein, where the
calories come from, soreness or pain, a missed day or little time, the program's
balance, strength, the goal, a new plan, water, steps. The answer is worked out on the
phone from the person's own log, plan and targets, with the same engines as the rest of
the app, so it never says more than the app knows; a question outside that set is
told so. Nothing is sent anywhere and no model writes the text. The newest answer
carries its buttons (start the workout, log the plan, a 150 kcal step on the target,
set the goal), each with Undo; the last 30 questions are kept.
- **Progress** (`views/progress.js`) has two slides: *Simple*, five plain answers
  (training this week, weight, strength, food, records), and *Detailed*, the charts
  and numbers a coach reads.
- **Profile**: settings, profiles, backups.

Each thing has one place. Planning screens open over Coach and back returns there;
logging happens on Training and Food only.

## How the code is laid out

No build step, no framework, no dependencies — the browser loads the modules directly.

```
index.html      shell only: styles, empty containers, one <script type="module">
js/
  util.js       ids, dates, escaping, numbers, localStorage. Imports nothing.
  units.js      kg/lb display conversion
  db.js         training history and the food log, in IndexedDB
  scan.js       camera barcode scanning, and the overlay it owns
  ui/nav.js     the back stack: arrow, edge swipe and OS gesture share one path
  ui/sheetdrag.js  drag a sheet header down to dismiss
  state.js      S, profiles, persistence; what S holds, its defaults and its versioned
                migrations are in schema.js (pure, tests in js/test/)
  data/         exercises.js, splits.js, goals.js, movement.js (each exercise's movement
                pattern, read from its name and muscle), with tests in data/test/
  coach/        the coaching engine: pure functions over the log, with tests in coach/test/;
                powerlifting.js is generated by tools/opl-percentiles.py
  engine/       plan.js, formulas.js, nutrition.js, warmup.js, splitparse.js,
                volume.js, mealplan.js, plancheck.js, coachinfo.js, dayplan.js (the
                plan on a date, the next day to train), share.js (what a friend sees);
                body.js (energy, targets, the weight trend, body fat) and intake.js
                (the food log's totals, averages and streaks) are handed what they
                need and read no state, with tests in engine/test/
  i18n/         dict.js (the AR dictionary and t), exnames.js (Arabic exercise names)
  ui/           view.js, render.js, actions.js, sheets.js, facts.js (Progress's plain
                answers, shared with the chat), coachwords.js (the coach's insights in
                words), views/{train,home,session,food,coach,chat,progress,profile,
                assess,warmup,pcheck}.js
  ui/handlers/  what every tap does, by domain: shell (moving around, sheets, the date
                bar), train, session, food, coach, progress, profile; fields.js for
                typing; common.js for what they share; registry.js tries the branches
  app.js        entry point: event listeners, wiring, boot (about 240 lines)
tools/          one-off build scripts that never ship or run in the browser
```

**The layers, enforced.** `node tests/architecture.mjs` reads every import and fails
when one crosses a line it shouldn't (it runs in Node in under a second):
- `js/coach/` imports only itself, and touches no DOM, storage or network.
- The engine never imports the UI. The libraries (`js/data/`) import only themselves and
  `util.js`; they are handed the person's own exercises, equipment and favourites at boot
  (`useUserData`) rather than reading state. `state.js` reaches up into nothing: a profile
  switch tells the UI through `onProfileSwitch`.
- A view may use another view only to show it (Coach shows the planning screens,
  Training the logger). Logic two screens need lives in the engine or in a shared ui
  module (`facts.js`, `coachwords.js`), never in a view.
- No import cycles outside the UI, nothing imports `app.js`, every import names a file
  that exists (dynamic ones included), and every module the app loads is in the
  service worker's precache.
- `app.js` answers no tap itself. Each tap is a branch in one of `js/ui/handlers/`,
  registered at boot by `app.js` in a fixed order; handler modules share code only
  through `common.js`, never by importing each other.
- The pure engine modules (`body.js`, `intake.js`) never reach `state.js`, directly or
  through anything they import. They are handed the profile, the weigh-ins, the food log
  and today's date, and `formulas.js`, `stats.js` and `energy.js` keep their old names as
  one-line wrappers that pass `S` in. `node tests/engine.mjs` runs their tests in Node,
  along with the movement-pattern check over the whole exercise library.

Four more rules hold this together. Each one is a bug that has already happened here:

- **Only `app.js` does anything at import time.** Every other module just declares. Boot
  calls `initState()` explicitly, so startup order is written down rather than being an
  accident of the import graph.
- **Never name a local after something you import.** A parameter called `t` hides the
  translator and the module then looks as though it never needed it. Same for `ex`,
  `day`, `rest`, `val`, `ring`.
- **You cannot assign to an imported binding** — modules are strict and it throws. When
  another module has to replace shared state, the owning module exposes a setter:
  `setS`, `setProfiles`, `setBeeped`, `setLastTick`.
- **The whole `js/` folder ships together and every module is precached.** A missing
  image degrades; a missing module is a blank app.

Modules export only what something else actually imports, so a short export list is
correct rather than an oversight. Two knots were untied on the way in: `util.js` no
longer calls `toast()` (app.js injects the handler through `setStorageErrorHandler`), and
`state.js` no longer calls `render()`.

## Rendering, and what must not be rebuilt

`render()` replaces `#app` and `#sheet` wholesale. That is fine for content and wrong for
anything with its own live state, so three things sit outside it and are mutated instead:

| Surface | Container | Why |
| --- | --- | --- |
| Rest timer | `#rest` | Rebuilding restarts the ring's CSS transition from zero, which is what made every −30s tap stutter |
| Barcode scanner | its own overlay | A rebuild tears a live `<video>` out of the DOM mid-stream |
| The focused field | — | Caret and selection are captured before the rebuild and restored after |

`syncRest()` rebuilds the rest screen only when it is genuinely a different one — a new
exercise, a new set, a language change — and `paintRest()` touches the four things that
change per tick. ±30s and Pause call `paintRest()`, never `render()`.

Search is debounced at 140 ms, and `render()` restores the caret to **where it was**, not
to the end of the value. Sending it to the end on every keystroke is what made typing feel
like the field was fighting back.

## Going back

Every back affordance calls `goBack()` and none of them knows a destination. They used to:
the session arrow went to Home and the train arrows went to the day list, which is why
they behaved as home shortcuts wearing a back icon.

`ui/nav.js` keeps a stack of screens. `pushNav()` records where you are before a
navigation; a tab tap clears the stack, because a tab is a change of place rather than a
step deeper. The arrow and the edge swipe do not navigate themselves — they call
`history.back()` and let `popstate` do the work, so the arrow, the swipe and the OS
gesture cannot drift apart.

The swipe starts within 24 px of the **leading** edge — the right edge in Arabic — and
gives way to a vertical drag or to any horizontally scrollable ancestor, so a filter chip
row keeps its own gesture.

Leaving an active workout is the one back that asks first; that is where "discard this
session" now lives, instead of a separate link at the bottom of the screen.

**A sheet pins the page behind it.** `render()` calls `lockScroll(V.sheet)`, which fixes
the body and puts the scroll offset back when the sheet closes. `overscroll-behavior:
contain` on `.sheetbox` is only half the job — it stops a scroll that starts *inside* the
sheet from chaining outwards, but a drag beginning on the backdrop, or on a part of the
sheet that does not scroll, still moved the page underneath. On iOS `overflow: hidden` on
the body does not hold. `lockScroll` ignores a repeat call in the same direction, because
re-locking would read a scroll position of zero from an already-pinned body and the page
would jump to the top on close.

**Tapping outside closes a sheet, and `cursor:pointer` on the overlay is what makes that
work.** iOS Safari only delivers click events from a plain `div` when it looks
interactive; without it the dimmed area was dead on a phone and fine on a desktop.

Three sheets behave differently on dismissal, and the rule is what the dismissal would
cost: most close freely; the manual food entry asks first when something has been typed,
and **Cancel puts the typing back** rather than discarding it; a destructive confirmation
(`hard:true`) has no `data-close` on its overlay and no drag handle at all, because an
ambiguous dismiss on a delete prompt is unsafe.

## Names, instructions, and what is a key

**Exercise names are split for display only.** free-exercise-db packs two different things
into the name field: a dash usually introduces a real variant
("Triceps Pushdown - Rope Attachment"), brackets usually give an alternate name for the
same movement ("Hyperextensions (Back Extensions)"). The first becomes a pill beside the
muscle; the second is just another word for it.

**The full name stays the key.** Nothing stored is rewritten, so saved splits, logged
sessions, favourites and records keep resolving with no migration — and searching a
stripped qualifier still finds the exercise, because the filter still runs over the full
name. Only 15 base names collide across all 876 entries, and those rows carry the variant
as a subtitle so they stay apart in the picker.

**Instructions are trimmed, not rewritten.** Filler steps go by pattern — "Repeat for the
recommended amount of repetitions" is the same sentence on hundreds of entries — and some
padding is stripped from what is left. That makes the text shorter, not better: rewriting
868 sets by hand is content work, and doing it with a model would need a keyed API this
app deliberately does not have. Three steps show by default with the rest one tap away,
and Common Mistakes is collapsed because it is generated from the movement pattern and
every push exercise shows the same three lines.

## Food search

Exact, substring and alias matching runs first and is unchanged. **Only when that returns
nothing** does a Levenshtein pass run, with a tolerance that scales with word length — one
edit for a short word, three for a long one — so good matches are never diluted and the
common case stays instant. The whole 876-name sweep takes about 35 ms.

Arabic is normalised before any comparison, because Arabic mistyping is character-variant
confusion rather than transposition: `أ إ آ` fold to `ا`, `ى` to `ي`, `ة` to `ه`, and
tashkeel is stripped. That catches more real error than edit distance does, and costs
nothing.

**A guess is offered, never taken.** A near miss appears under "Did you mean…" and has to
be tapped. Logging the wrong food silently corrupts the day's numbers; one extra tap does
not.

## Where your data lives

**Settings, your plan, weigh-ins and the current workout** are one JSON blob in
localStorage per profile, at `bunyan:db:<profile>`. It stays a few kilobytes.

**What it holds is written down**, in `js/schema.js`: JSDoc types for the profile, the
programs, a workout and its sets, the body log, a day's food, and the smaller sections.
The same module fills in what an old blob or a hand-edited backup is missing
(`normalize`), and carries old shapes forward one numbered version at a time
(`migrateDB`): the blob records its version (`v`, now 3), each step runs once, in order,
and a new shape is a new step at the end with its test, never an edit to an old one —
blobs and backups in the old shapes are out there. Version 3 is the move from the v1
list of splits and v2's "active copy" to programs you own; it keeps the day ids history
is keyed on. A **restored backup is checked first** (`checkBackup`): a file that is not
ours, or from a newer version of the app, is refused with the reason, and a damaged
workout is left out and counted in the confirmation rather than refusing the lot. All of
it is pure and runs in `node tests/engine.mjs`.

**The two things that grow without limit are in IndexedDB**, in database `bunyan`:

| Store | One record per | Key |
| --- | --- | --- |
| `sessions` | logged workout | `<profile>\|<session id>` |
| `days` | date in the food log | `<profile>\|<date>` |

The reason is the write path, not capacity. `saveDB()` runs on every logged set and every
tap in the food log, and it used to serialise the whole profile. At three years of use —
1000 logged days and 550 sessions — that blob is **1.25 MB and takes ~24 ms to
serialise**, on the main thread, between your sets. Now the same save touches **3 KB in
~1 ms**, and writes one small record for the workout or the day that actually changed.

Both are still read straight from memory (`S.sessions`, `S.days`), so every screen stays
synchronous and no view code changed. They load once at boot, just after first paint —
which is why Home can show a streak of zero for a moment on a cold start behind the
intro.

`dayRec(date)` is the only way to get a day's record, so it is also where the date is
marked for writing. It over-approximates deliberately: merely reading a day marks it, and
the cost of that is one spare write of one small record.

**Moving across happens by itself, once, per profile.** Data is written to IndexedDB, read
back and counted, and only then dropped from the blob, which is marked `histIDB` /
`daysIDB`. The two move independently, so one can fall back without the other. Two rules
keep it safe:

- **The migrations merge, they never clear.** Records are keyed by session id and by
  date, so running one twice changes nothing. This matters because data can legitimately
  live in both places at once — log a workout or a meal while IndexedDB is unavailable and
  it lands in the blob while older records sit in IndexedDB. Merging keeps both; clearing
  would have eaten the older ones.
- **Every IndexedDB call may fail, and failure is never fatal.** Private windows, blocked
  storage, and browsers that expose `indexedDB` and then refuse to open it all end in the
  same place: the data stays in the localStorage blob and the app behaves as it did
  before. A write that fails flips that store back to the blob and saves there, so a
  finished workout or a logged meal is never left only in memory.

The database is at version 2. Version 1 had only `sessions`; the upgrade adds `days` and
creates each store only if it is missing, so an existing history is carried across
untouched.

**Backups are unaffected.** The export is `JSON.stringify(S)`, and both live in memory, so
a backup still contains every session and every day. Restoring one replaces both stores as
well as the blob.

Deleting a profile and "Delete everything" clear that profile's records in both stores —
otherwise they would outlive the blob that was supposed to own them.

## The maths

- **Volume** = the sum of weight × reps for every set. Not weight × reps × sets,
  which is only right when every set is identical.
- **Estimated 1RM** = weight × (1 + (reps + reps in reserve) ÷ 30): Epley, counting the
  effort left. Reps in reserve come from the RPE you log (RPE 8 is two left, down to RPE
  6, four left; below that it is not trusted), so 8 reps at RPE 8 is worth 10 reps of
  effort and an easy set reads stronger than a grinder at the same weight. With no RPE a
  set counts as taken to failure. Up to 12 reps of effort; a single at RPE 10 is its own
  max. One formula (`js/coach/util.js`) used everywhere: Progress, records, trends and
  the powerlifting standing.
- **Weekly sets** count working sets only; a warm-up is not training volume.
- **Bodyweight lifts with nothing added** progress by reps: the suggestion is body
  weight for the plan's reps, and once the top of the range is reached, a rep or two
  more or a little added load.
- **Average RPE** = total RPE ÷ number of sets.
- **Calories from macros** = protein × 4 + carbs × 4 + fat × 9.
- **Remaining macros** = your daily target minus everything in meals you marked
  complete.
- **Maintenance calories** start as Mifflin-St Jeor BMR × your activity multiplier, a
  guess that is often 10–15% off for one person. After two weeks of logged food and a
  few weigh-ins, the log measures it instead (`js/coach/energy.js`): average intake on
  fully logged days, minus the weight change at 7,700 kcal per kg, over the last four
  weeks. Days far under your usual logged day are left out as partly logged; the weight
  change is the slope of a line through every weigh-in; and the answer is combined with
  the formula by how sure each is, so a short noisy log stays near the formula and a
  long clean one is the log's own. When it differs from what your targets are built on
  by 150 kcal or 6%, Coach AI says so with the numbers, and one tap builds the targets on
  it (kept as `S.energy`, with Undo). Coach → Nutrition → Targets says which one is in use.
- **Seven-day weight average** = the mean of your last seven weigh-ins. Use this,
  not the daily number.
- **Progression** fires when every working set reaches the top of its rep range.
- **How you feel today** (asked as a workout starts) moves today's suggestions, and each
  says why. Drained: about 5% under last time, same reps. Low: last time's weight, no
  increase, and "One set fewer on each exercise" is offered, with Undo. Great, after a
  session with reps to spare: the bigger step (two steps, at most 10%). A lighter week
  already sets the load, so it wins. Nothing changes unless the lifter answers.
- **Training blocks** (`js/coach/block.js`, wired in `js/engine/blocks.js`). A program
  runs in blocks of four weeks: three that build effort, each set stopped with 3, then
  2, then 1 rep in reserve, then the usual lighter week (fewer sets, about 10% less
  weight), arriving on schedule instead of only once the log shows a stall. Block 1
  starts on the first day of the week of the first workout with blocks on; after that
  they roll on four weeks at a time. Ending the lighter week early, or taking an
  unplanned one, starts the next block after it. The Train page shows a four-part bar
  for the weeks and what this one asks.
  After each lifting workout the complete sheet asks one more thing: was the amount of
  work too easy, about right or too much? With the soreness from the recovery sheet
  (7 or more in the two days after overrides the answer), that moves sets per workout
  for the muscles trained: one more for too easy, one fewer for too much, never more
  than three over or two under the plan, never past the weekly maximum the landmarks
  give, and not below the minimum for a muscle the plan has above it. The logger says
  "1 more than the plan" where it applies. Each block starts from the plan again.
  Off in Settings → Training, and left out for a program that brings its own weeks.
- **Warm-up sets** count for nothing. Tap a logged set's number to mark it `W` and it
  drops out of volume, average RPE, personal records, the "last time" column and the
  progression check. The row stays so you can see what you actually did.
- **The warm-up** (`js/engine/warmup.js`) is built from the day. Each exercise counts its
  sets toward its main muscle and half of them toward the muscles it also works; any
  muscle with at least a fifth of the top one's work is part of the day. Those muscles,
  in order, choose four or five moving drills (an opener first, quick hops last on a day
  that jumps or sprints), after a few minutes of easy cardio. A walk or yoga gets none,
  and a plan that opens with its own mobility work keeps it.
- **Ramp-up sets** lead to the first heavy compound lift: the empty bar × 10 on a
  barbell, then 50% × 5 and 75% × 3 of the working weight (40%, 60% and 80% from 100 kg
  up), rounded to 2.5 kg. The working weight is the recommendation from last time, or
  the plan's starting weight. They are not logged.
- **Goals** are one list (`js/data/goals.js`): lose fat; lose fat and build muscle;
  build muscle; get stronger; power and athleticism; endurance and fitness; mobility and
  flexibility; stay fit and healthy. Each says only what it changes: energy against
  maintenance (−20% capped at 750 kcal for fat loss, −10% for both at once, +10% capped
  at 300 for muscle), protein per kg (2.0, 2.2, 1.8 or 1.6), the share of energy from fat,
  and the training style. Carbs take what is left, never under 50 g. Water is 35 ml per kg.
- **Activity** comes from two answers in the assessment: daily life sets the base (1.2
  mostly sitting to 1.5 for physical work) and each training day adds 0.05, so a desk job
  with three sessions is 1.35 and a physical job with five is 1.75.
- **Weekly volume** (`js/engine/volume.js`) counts a set in full for its main muscle and
  half for each muscle it also works, times how often the day comes round in a week. The
  ranges (8–12 sets a beginner, 10–16, 12–20, 14–22 for years of training) are a heuristic
  starting point, and the app says so where it shows them.
- **The workout generator** (`js/engine/plan.js`) shapes the recommended split to the
  person. In order: exercises they cannot do with their equipment, or that load a sore
  spot, are swapped for the closest stand-in (same muscle, same movement pattern,
  compound for compound, familiar exercises first, nothing advanced for someone in
  their first years); sets come from experience, and reps, rest and reps in reserve from
  the goal; the goal's additions go on (jumps first, intervals or mobility last); each
  muscle's weekly sets are brought into its range; the day is trimmed to the time there
  is, accessories first, main lifts never.
- **Movement patterns** (`js/data/movement.js`). Every exercise is tagged with what it
  does, as a coach would say it: squat, lunge and single leg, hinge, hip thrust, horizontal
  and vertical push, horizontal and vertical pull, carry, core, the isolation patterns
  (chest fly, shoulder raise, curl, triceps extension, leg curl and extension, calf
  raise, hip ab- and adduction), explosive lifts, jumps, conditioning and mobility. The
  library's own field is not used for this — it files a sit-up as a pull and a leg curl
  as elbow flexion — so the pattern is read from the name, most specific rule first,
  with the main muscle deciding the words that mean different things (an extension is
  a leg, triceps or back extension depending on the muscle). `node tests/engine.mjs`
  checks every exercise in the library gets one, plus spot checks. Same pattern and
  same main muscle means the same thing trained, and every swap keeps both:
  - **Replace** in a workout lists what trains the same thing first, set apart above
    everything else, and follows the equipment filter, so picking Dumbbell shows the
    dumbbell ways to do the same movement.
  - **Pain** (Something hurts? → Replace this exercise) opens the same list ranked for
    a different way to load it: other equipment first, then the steadier machines and
    cables.
  - **Kit you don't have**: a planned exercise that needs equipment missing from
    Settings → My equipment carries the same movement on what you own, offered beside
    it in the workout ("Don't have the kit?").
  - **The chat**, told what hurts ("my knee hurts", "ركبتي بتوجعني"), lists the next
    workout's exercises that load that area, each with what trains the same movement
    without it, or "leave it out for now" when nothing does.
  - The exercise sheet names the movement under its facts.
- **The meal plan** (`js/engine/mealplan.js`) splits the day's targets into three to six
  meals (protein spread more evenly than energy), picks a plate for each from a set
  written for that meal — Egyptian home food first — that fits the diet and what is left
  out, solves its amounts for the meal's macros a few rounds, rounds every amount to a
  serving, and finally nudges the carbs so the day lands within about 4% of the energy
  target. It goes to the same review as an imported plan before anything is saved.
- **The plan check** (`js/engine/plancheck.js`) reads the targets, the meal plan and the
  active program against the goal, whoever wrote them, and says where they disagree:
  - energy on the wrong side of maintenance for the goal, or more than 30% under it.
    Only building muscle needs a surplus; strength, sport, mobility and staying fit are
    checked against maintenance (more than 15% away from it);
  - protein under 85% of the goal's amount;
  - a meal plan more than 10% off the energy target, or 15% short on protein;
  - a main muscle well outside its weekly range;
  - main lifts too light for a strength goal, rests too long for endurance, no mobility
    work for a mobility goal;
  - a coach's program written for the opposite phase ("fat loss" while eating to grow).
    The fix sets the goal, and the targets with it, to match the program: the program
    is the plan being followed, so it is not replaced;
  - a steep deficit under a heavy week, a surplus over thin training, a lot of cardio
    and sport on under 3 g of carbs per kg.

  Each finding has one fix the app can make, with Undo: set the targets for the goal,
  move protein or carbs while keeping the calories, rebuild the meal plan from the
  targets, or balance the program's volume (main lifts untouched, no day made longer
  than the longest already is). "Keep it as it is" hides a finding until the numbers
  behind it change. A fix made in place always settles its card in one tap: whatever
  it could not reach (a muscle that would need longer sessions) is kept as it is, so
  the card goes and comes back only if those numbers change; Undo restores both. They
  all live in Coach → Coach AI, with a dot on the Coach tab while there is something
  to look at. The coach's insights are
  set aside by kind ("over", "under", or one lift), not by a list of muscles that
  changes with every session, so a set-aside one stays aside.
- **The coach** (`js/coach/`) reads the training log the way a coach would. Every file
  there is a pure function — plain data in, plain data out, no DOM, no storage, no
  network, no imports from the app — and has a test file beside it:
  - `volume.js`: hard sets per muscle per week, from what was logged, against the
    landmarks in `landmarks.js` (minimum effective, adaptive, maximum recoverable).
    These come from Renaissance Periodization's published guidelines and are
    heuristics; the app says so.
  - `fatigue.js`: the same load for the same reps getting harder. Needs three sessions
    with RPE logged before it says anything.
  - `strength.js`: the best estimated max per week (Epley, 12 reps or fewer) and its
    direction. Three flat weeks on a main lift is a stall; two falling weeks a warning.
  - `autoreg.js`: around the progression rule — a bigger step at RPE 7 or less, a step
    with a caution at 9 or more, hold after two misses of the range, a lighter week
    after three. `recommend()` in `js/engine/formulas.js` uses it.
  - `block.js`: where a date falls in four-week training blocks, and how the answers
    after each workout (with soreness) move sets per muscle inside one.
  - `weakpoints.js`: a lift far out of proportion with the others (squat against
    deadlift, bench against squat, press against bench, row against bench), only when
    more than 15% outside the usual range, and always as an observation.
  - `insights.js`: what is worth saying, most important first, one per lift — and
    nothing at all when training is on track.
  - `intent.js`: what a question to the coach chat is asking, in English or Egyptian
    Arabic: phrases scored by the letters they match, so the more specific one wins
    ("how much weight" is the load, "my weight" the scale), and "unknown" rather than
    a guess.

  Coach AI shows them with the plan check's findings, one at a time: the most
  important, and "N more things the coach sees" behind a tap (the plan check, opened on
  purpose, shows them all). Each one says what it saw, offers one thing to do, and can
  be set aside for two weeks. With nothing worth saying, the section is one quiet line,
  "On track. Nothing to change.", and the Coach tab has no dot. Run the tests with `node tests/coach.mjs`, or by
  opening `js/coach/test/index.html` on the local server.
- **Among powerlifters** (Progress → Strength) places the squat, bench press and
  deadlift against raw powerlifting competitors of the same sex and IPF weight class,
  from OpenPowerlifting's meet results (public domain). `tools/opl-percentiles.py` reduces
  about 4 million entries to one small table, `js/coach/powerlifting.js` (under 4 KB):
  - **who counts:** raw only (bare knees or sleeves); adults (an entry whose age, birth
    date or division says under 18 is left out); no disqualified entries or no-shows;
  - **one number per lifter:** each lifter's best in that sex, class and lift, as
    OpenPowerlifting's own rankings count;
  - **classes** by bodyweight at weigh-in (men 59 … 120+, women 47 … 84+); entries with no
    bodyweight are left out rather than guessed from another federation's class;
  - **stored:** the lifter count and the 10th to 90th percentiles, to 0.5 kg.

  Your figure is your best estimated max from the last 12 weeks (Epley, 12 reps or
  fewer), placed between the deciles by straight-line interpolation. Under the 10th or
  over the 90th the card says so ("fewer than 10 in 100") rather than inventing a figure.
  Only the three judged lifts get a number: there is no data for anything else. The card
  always says who the comparison is with ("people who train for these three lifts and
  enter meets. Anywhere on this scale is strong") and that a meet lift is a judged single.
  It is not shown without a sex and bodyweight on the profile, or without one of the
  three lifts in the last 12 weeks.

  To rebuild the table from newer data, fetch only the meet results (about 1 GB, kept out
  of git by `.gitignore`) and run the script. The commands are at the top of
  `tools/opl-percentiles.py`.
- **The cool-down** holds one static stretch for each of the muscles worked, 30 seconds
  (each side where it is one-sided), up to five. Static holds come after the session,
  not before: a long hold just before lifting can take a little off strength for a while.
- **Supersets** are a shared tag on exercises that sit next to each other in a day. Open
  an exercise in the day editor and pair it with the one below; pair again from the
  second and you have a triset. In a session Bunyan hands you straight to the next
  exercise in the group with no rest, and only starts the timer once the round is done.
  Uneven set counts are fine — an exercise drops out of the rotation once it has had all
  its sets. The group is recomputed from adjacency every time, so reordering a day can
  never leave a superset pointing at exercises that have moved apart.
- **Plates** are worked out greedily from the heaviest plate down, per side, after
  subtracting the bar. If the target cannot be made from standard plates it says so
  rather than rounding silently.

## The food database

`foods.json` holds **568 foods**, every one with an Arabic alias, weighted towards what
is actually eaten in Egypt and the Levant: ful, ta'meya, koshari, molokhia, hawawshi,
mahshi, kofta, fatta, feteer, basbousa, konafa, om ali, sahlab, karkade, sugarcane
juice, and the Gulf and Levantine plates alongside them.

Each entry is per 100 g with a list of real serving sizes, so "3 eggs", "طبق كشري" or
"2 tbsp peanut butter" all resolve to grams without the user thinking about it.

**On the numbers.** These are widely published composition figures, not laboratory
measurements — the same standing as the original entries, which is why the app labels
them as the Bunyan database rather than "verified". They are checked at build time
against Atwater with the fibre correction (protein 4, digestible carbs 4, fibre 2,
fat 9); anything drifting more than 25% is reviewed by hand. Three entries fail that
check and are correct anyway: vinegar and lime get calories from organic acids, and
cocoa powder is an accepted reference anomaly. Plain 4/4/9 is not usable as a gate — it
over-counts leafy vegetables badly enough to bury real typos in the noise.

**If you extend it**, keep ids unique, give every food at least one serving size and an
Arabic alias, and re-run the build check. The generator and its batches live outside the
repo; the shipped file is plain JSON and can be edited directly.

## Barcodes

Food → Log fuel has **Enter barcode** always, and **Scan barcode** on browsers that can
decode one. Both run the same lookup, in this order:

1. **Your own foods**, matched on the barcode you saved with them.
2. **Products you have scanned before**, cached in `S.barcodes`. No network.
3. **Open Food Facts**, by barcode — the same keyless, CORS-enabled service the online
   name search already used, with the same six-second timeout and the same distinction
   between "not in the database" and "could not reach it".

If nothing has it, you get manual entry with the barcode already attached. Save that to
My Foods and **the same packet scans locally forever after**, offline. That is the point
of the ordering: scanning teaches this device rather than depending on a service.

The cache is capped at 200 products, oldest evicted. My Foods is never evicted — that is
your data, not a cache.

### Two decoders, one interface

`BarcodeDetector` is built into the browser and costs nothing to use, but it only exists
in Chrome on Android, ChromeOS and macOS — not Windows Chrome, not Firefox, and **not iOS
Safari**, which is this app's main target. So there is a second path:

| | Decoder | Cost |
| --- | --- | --- |
| Native `BarcodeDetector` | the browser's own | nothing downloaded |
| Everywhere else | ZXing, vendored at `js/vendor/zxing.min.js` | 328 KB, once |

ZXing is **fetched on first use, not precached**. A browser with the native detector never
downloads it at all, and the service worker's cache-first handler keeps it after the first
fetch — the same treatment `instructions.json` gets, and for the same reason. The cost of
that choice is that the very first scan on a new iPhone needs a connection; every scan
after it does not.

`js/scan.js` picks between them at run time, so both produce the same thing: a frame in,
digits out. Loading the decoder and opening the camera are **deliberately sequential** —
run together, a camera that resolves after the decoder has already failed leaves a stream
nobody owns and a light nobody turns off.

ZXing is vendored unmodified under the **Apache Licence 2.0**; the full text sits beside it
in `js/vendor/zxing-LICENSE.txt`. It is the only third-party code in the project.

Scanning needs a secure context, which GitHub Pages gives you.

`scan.js` builds its overlay outside `#app` and `#sheet` and owns it directly, because
`render()` replaces their `innerHTML` and would tear a live `<video>` out of the DOM
mid-stream. Every exit — a code found, cancel, an error, the tab hidden, the page going
away — runs through one idempotent `stopScan()`, so the camera is never left on.

## Language and units

The interface is fully bilingual. Every user-facing string goes through `t()` and has an
entry in the `AR` dictionary at the top of the script, and the layout flips to RTL with
the language. **If you add a string, add its `AR` entry in the same commit** — `t()`
falls back to the English key, so a missing entry is silent.

**Exercise names** are translated by composition rather than by phrase. The 876 names
are built from roughly 350 terms, so `EX_TERMS` translates the terms and `exAr()`
assembles the name the way it is said in a gym: movement first, modifiers after it,
equipment last behind `بالـ`. "Barbell Bench Press" becomes "بنش بريس بالبار",
"Standing Calf Raises" becomes "رفع سمانة واقف".

That covers **86%** of the library completely. The rest are proper nouns — Conan's
Wheel, Carioca, Renegade Row — which stay in Latin script deliberately; inventing
Arabic for them would read worse than leaving them. It also means an exercise you add
yourself is translated without anyone touching a table.

**The English name is always the key.** Lookups, favourites, session entries and the
strength-chart `<option value>` all stay English; only what the user reads is
translated. If you add a display site, wrap it in `exName()`, never the data.

Weights are **always stored in kilograms**. The kg/lb preference changes what is shown
and how typed input is read, nothing else — so switching units re-displays your history
rather than rewriting it. Convert at the edges with `toDisp()` and `toKg()`; never
convert anything on its way into storage.

## The identity

**Bunyan (بنيان)** means a structure or edifice — something built deliberately, course
upon course.

The mark is the **horse and the sword**: a horse's head in profile, mane swept back,
with a straight sword standing beside it. Together they read as an angular **N**. It is
ancient-Arabian in feeling — warrior, mount, blade — without being religious, and it
survives being shrunk to a home screen icon.

Two earlier directions were tried and **abandoned**: a gold stepped-arch mark, and a
stone-monolith splash. Neither is used anywhere. If you find a gold arch SVG or a
`splash.jpg` in an old copy of this folder, it is dead weight — delete it.

### Assets

| File | What it is |
| --- | --- |
| `mark.png` | The horse and sword, red on transparent. In-app header and the intro |
| `icon-180.png`, `icon-512.png` | The same mark on `#0D0D0D`, for the home screen |
| `intro.jpg` | The intro artwork: a rider with a raised sword on a rearing horse, both in near-silhouette, an ember glow behind them |

The intro degrades gracefully — if `intro.jpg` is missing the composition still holds on
the ember glow alone, so a missing file never shows a broken screen.

### Palette

The CSS custom properties at the top of `index.html` are the source of truth. In short:

| Role | Colour | Use |
| --- | --- | --- |
| Ground | `#0A0A0C` | The base of the whole interface |
| Surface / Raised | `#141418` / `#1C1C22` | Cards and controls |
| Bone | `#F0EDE8` | Text. Warmer and easier on the eye than white |
| Accent | `#C41E2A` → `#E02534` | The action colour, and the brand |
| Green | `#2E7D32` | Completed states only — a logged set, a finished meal |
| Brass | `#C9A227` | Personal records and earned progression only. Never decoration |

Brass is reserved. If everything is gold, nothing is.

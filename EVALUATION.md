# Evaluation of the reference projects

Phase 1 of `COACHING-INTELLIGENCE.md`: what the open-source fitness projects do well,
what Bunyan should take from them, what it should not, and where Bunyan is already
better. Read on 6 October 2026 from shallow clones of each repository. Nothing was run
from them and nothing was copied into Bunyan.

**The licence rule held throughout.** Liftosaur, wger and MyFit are AGPL-3: their code
was read to understand an approach, and anything Bunyan builds from those ideas is
written from the idea, in Bunyan's own structure and names. Data under a public-domain
or Creative Commons licence may be used directly, with credit (`CREDITS.md`).

## Data sources

| Source | Licence | Reachable from the build machine | Verdict |
| --- | --- | --- | --- |
| **free-exercise-db** (yuhonas) | **Unlicense** (public domain; the brief said CC0, the repository says Unlicense, which is at least as open) | Yes | The basis of the exercise library. Upstream added three since Bunyan's copy (Kettlebell Halo, Kettlebell Halo with Overhead Extension, Kettlebell Overhead Triceps Extension); all three are now in, mapped the same way as the rest, so the library matches upstream's 876. Upstream has no photographs for them yet, so they show the placeholder. The halos are filed as non-compound so a light shoulder circle never becomes a day's main lift. Its movement-pattern field is unreliable (it files Lying Leg Curls as elbow flexion), which Bunyan already works around. |
| **OpenPowerlifting** | CC0 | **No** — `openpowerlifting.gitlab.io` is not reachable from here | The right source for strength percentiles (Phase 3). Needs a one-off reduction on a machine that can download the ~250 MB CSV; the app ships only the tables. Blocked here, not abandoned. |
| **USDA FoodData Central** | CC0 | **No** — `fdc.nal.usda.gov` refuses connections from here | The reference for checking and extending `foods.json`: Foundation Foods and SR Legacy only, as the brief says. Same situation: a developer-machine job. |
| **Compendium of Physical Activities** | Free to use with citation | **No** — not reachable from here | Already the source of the MET values in `js/data/activities.js`, cited in its header comment. |

## Code to learn from

### Liftosaur — AGPL-3

**What it does well.** Progression is data, not code. Every exercise in a program carries
a named rule with parameters:
- **lp:** linear — add weight after N successful sessions, take some off after M failures.
- **dp:** double — climb a rep range, then add weight and start the range again.
- **sum:** add weight once the total reps across sets pass a threshold.
- **custom:** a small script with its own state, for anything else.

The rule is set once per exercise and applies across every week of the program. Warm-ups
are written in the same language, as a percentage of the first work set, and can be
switched off per exercise. AMRAP sets ("5+") are part of the set notation.

**What Bunyan should take.** The idea that each exercise in a program can say *how* it
progresses — linear for a main lift, double progression for an accessory — instead of one
rule for the whole app. A handful of named rules with parameters, chosen in the exercise
editor, is enough.

**What Bunyan should not take.** The scripting language. Liftosaur is a tracker "for
coders"; a DSL is the wrong surface for someone logging sets between rounds in a gym in
Cairo. And none of the code: the idea is reimplemented, nothing more.

### wger — AGPL-3 code, Creative Commons data

**What it does well.**
- **Progression as per-week change rules.** A routine slot holds rules for weight, reps,
  sets, rest and RIR. Each rule says: from which week, add / subtract / replace, by an
  absolute amount or a percentage, whether it repeats every week after, and an optional
  condition on the last logged session.
- **Food records that know more.** Ingredients carry sugar, saturated fat, fibre and
  sodium, vegan and vegetarian flags, a source, and a licence and author *per item*.
- **Achievements** that are evaluated from the log.

**What Bunyan should take.** For foods: explicit diet flags (vegan, vegetarian) and a
source per item, so the meal-plan generator does not have to guess from ids. For programs:
the "from week N, change by X" shape is the cleanest way to write a mesocycle, and it is
how Bunyan should express planned weekly changes when it gets them.

**What Bunyan should not take.** The Django data model wholesale: it is built for a
server with users and gyms. The trophy system: badges for streaks reward showing up for
the badge, which runs against "earn silence". The exercise data is CC-BY-SA; using it
would put a share-alike obligation on Bunyan's derived exercise data — a decision for the
owner, not something to slip in. Its ingredients come from Open Food Facts under ODbL,
the same kind of obligation.

### MyFit — AGPL-3

**What it does well.** It is modelled on Renaissance Periodization's hypertrophy method:
- **Per-muscle feedback after a session:** how hard the work was, how sore the muscle was
  by the next session, joint pain, and the pump. The answers move that muscle's sets for
  the next week, up or down.
- **A planned effort taper across a block:** reps in reserve fall week by week (for
  example 3, 2, 1, 0), and the block ends in a deload.
- **Volume that counts effort:** reps plus reps in reserve, so a set stopped well short of
  failure counts for less than one taken close to it.

**What Bunyan should take.** The principle that volume is adjusted per muscle from what
the lifter reports, not set once. And reps-in-reserve-aware strength estimates: Bunyan
logs RPE but its e1RM ignores it.

**What Bunyan should not take.** Asking four questions per muscle after every session is
too much for most people; one tap per session (Bunyan's session effort) plus the soreness
already in the recovery check-in carry most of the signal. Its server stack (SvelteKit,
tRPC, CockroachDB, OAuth) is the opposite of offline-first. Its particular overload
formula constants come from its code and are not taken; anything Bunyan uses comes from
the published literature directly.

### workout-cool — MIT

**What it does well.** UX: a workout builder in three clear steps — equipment, muscles
picked on a body map, then exercises, with a shuffle for alternatives and short video
demonstrations. It works without an account.

**What Bunyan should take.** The body-map muscle picker as an idea for the library filter,
and "shuffle for an alternative" (Bunyan's Replace already does this from the session).

**What Bunyan should not take.** The leaderboards, premium tier and ads. The code is MIT
and could be used with its notice, but it is React and Next.js and would not fit a
no-build vanilla app.

### awesome-health-fitness-oss — index

Used to find MyFit. Other entries worth a look later: LiftLog (AGPL-3, local-only
tracker), Flexify (MIT, offline), Unbroken (MIT, Tactical Barbell programming), BuffBook
(CC BY-NC-SA, a hypertrophy guide — non-commercial, so read, never reuse).

## Where Bunyan is worse, specifically

1. **One progression rule for everything.** `js/engine/formulas.js` `recommend()` decides
   every exercise's next weight by the same branches (top of range, RPE, missed twice,
   plateau, deload), tuned only by the global `S.profile.prog`. Liftosaur and wger let each
   exercise carry its own rule.
2. **e1RM ignores effort.** `js/engine/formulas.js` `e1RM()` is Epley on reps alone,
   capped at 12 (the cap is right). Eight reps at RPE 7 and eight at RPE 10 give the same
   estimate; MyFit counts reps plus reps in reserve.
3. **Deloads are only reactive.** `deloadDue()` fires on stalls. There is no planned
   effort taper across a block of weeks, as MyFit and wger's per-week rules allow.
4. **No per-muscle response.** Volume is set when the plan is built
   (`js/engine/plan.js` `shapePlan()`) and only moves when the plan check's "Balance the
   volume" is tapped. It never responds to how a muscle recovered.
5. **Foods know too little.** `foods.json` has energy, protein, carbs, fat and fibre, but
   no sugar, saturated fat, sodium or diet flags. `js/engine/mealplan.js` `allowed()`
   recognises meat, fish, eggs and dairy by matching ids against word lists.
6. **Warm-up sets are fixed.** `js/engine/warmup.js` `rampFor()` is one scheme for every
   lift; Liftosaur lets a program override it per exercise.
7. *(Closed.)* The three exercises upstream added since Bunyan's copy are now in
   `exercises.json` and `instructions.json` (see above).

## Where Bunyan is better — do not regress these

1. **Offline and private by construction.** No account, no server, nothing uploaded; data
   lives on the phone. MyFit, wger and workout-cool all need a server.
2. **Reads a coach's PDF.** `js/engine/splitparse.js` and `js/engine/pdfplan.js` turn a
   coach's training and diet PDFs into editable plans, on the phone. None of the
   references do this.
3. **Nutrition and training are checked against each other.** `js/engine/plancheck.js`
   reads targets, meal plan and program against the goal. The references treat food and
   training as separate apps.
4. **Arabic and Egyptian food.** Egyptian Arabic throughout, right-to-left done properly
   (`js/i18n/bidi.js`), and a food database built around what is eaten in Egypt.
5. **Warm-ups and cool-downs from the day's muscles** (`js/engine/warmup.js`), with
   timers, rather than a fixed routine.
6. **Says where every number comes from.** Targets, volume ranges and ramp sets are
   explained on screen, and heuristics are called heuristics.
7. **Screens are patched, not rebuilt.** The brief warns that whole-screen `innerHTML`
   rebuilds caused five bugs. In this repository `js/ui/patch.js` already keeps unchanged
   nodes, which is why the brief's "screens wait for the backlog" rule was not a blocker
   here. `MASTER-BACKLOG.md` does not exist in this repository.

## Recommendation: build first

**Fatigue and progress from the log Bunyan already keeps (Phase 2.2–2.4), surfaced one at
a time.** Every session already stores load, reps and RPE. From that alone the app can
see the two things a coach notices first: the same weight for the same reps getting
harder (fatigue), and a main lift's best estimated max flat or falling for weeks (a stall).
Wiring those into suggestions — a larger jump when sets are easy, hold when they are
missed twice, a lighter week when missed three times or when fatigue is rising — turns
the logger into a coach with no new data and no network. It is the highest value for the
least risk, and it gives the Home card something better to say than a reminder.

Second: per-exercise progression rules (Liftosaur's idea, reimplemented as a few named
rules). Third: OpenPowerlifting percentiles, once the source can be downloaded on a
machine that reaches it.

## Note on sequence

The brief asks for this evaluation to be approved before Phase 2. The owner said to carry
on without waiting, so Phase 2 follows in the same branch. The brief also says no new
screens before the backlog; the assessment and plan check screens were built earlier
because the owner asked for them directly, and they use the patching renderer above.

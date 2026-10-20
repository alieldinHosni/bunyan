# Formula reconciliation — the textbook against the app

Every place where the textbook extraction (`js/knowledge/`) and the app's own maths
disagree, what each says, and where each lives. Written 20 October 2026 by the coaching
engine session, at the owner's request (a one-off exception to folder ownership: `docs/`
belongs to the knowledge session).

**Owner's rule, 20 Oct:** where the textbook's method is better, the app adopts it.
History is never left mixed: when a formula changes, the whole log is recomputed under
the new one, and `PROGRESS.md` records which formula changed and when.

**Nothing in this file has been changed yet.** Every row below is either locked by
`CLAUDE.md` ("Formulas — do not change these") or lives in a folder another session
owns. See "What blocks a change" at the end.

## History and recomputation

The log stores only what was entered: each set's weight, reps and RPE; each food item's
calories and macros; each weigh-in. Estimated maxes, volume, BMR, maintenance and
targets are worked out every time they are read. So for most rows, changing a formula
**recomputes the whole history by itself**, and no entry is left on the old method.

Three stored values do not recompute by themselves:

| Stored | What it holds | What a change needs |
| --- | --- | --- |
| `goals` (`js/schema.js`) | today's targets: kcal, protein, carbs, fat, water, steps | rebuilt from the new formula when it ships |
| `energy` | maintenance learned from the log, using 7,700 kcal per kg | recomputed only if that constant changes (it does not; see row 9) |
| `coachDismiss` | insights set aside until a date, keyed by insight id | none: ids do not depend on the formulas |

## The disagreements

| # | What | Textbook (`js/knowledge/`) | App | Lives in | Locked by `CLAUDE.md` |
| --- | --- | --- | --- | --- | --- |
| 1 | Estimated 1RM | `1RM = load ÷ (1 − 0.025 × reps)`, for 2–10 reps (`acute-variables.js` `ONE_RM`, handout) | Epley, `load × (1 + reps/30)`, with reps plus reps in reserve capped at 12 (`js/coach/util.js` `e1rm`; the engine calls it) | `js/coach/` | **Yes**: "Epley … capped at 12 reps" |
| 2 | Fat-loss deficit | a moderate 500 kcal/day (`nutrition-principles.js` `GOAL_STRATEGIES.fatLoss`, 9.8) | 20% of maintenance, capped at 750 kcal (`js/data/goals.js` `lose`) | `js/data/` | No |
| 3 | Muscle-gain surplus | 350–500 kcal/day; may be unnecessary if protein is high (`GOAL_STRATEGIES.muscleGain`, 9.8) | 10% of maintenance, capped at 300 kcal (`goals.js` `gain`) | `js/data/` | No |
| 4 | Protein while losing | 2.4 g/kg in a deficit lessens lean-mass loss; 1.6–2.2 for athletes cutting (9.8) | 2.0 g/kg (`goals.js` `lose`), lean-adjusted above BMI 30 (`js/engine/body.js` `proteinFor`) | `js/data/` | No |
| 5 | Protein, other goals | 1.6–2.2 g/kg for muscle gain; 1.2–2.0 for performance (9.8) | 1.6–2.2 by goal (`goals.js`) | `js/data/` | No. **Agrees** |
| 6 | Water | total fluid 2.7 L women, 3.7 L men (`HYDRATION.dailyFluid`, 9.5), from all sources, food included | 35 ml/kg, at least 2,000 ml (`body.js` `macroTargetsOf`); 3,000 ml before a profile exists (`schema.js`) | `js/engine/`, `js/schema.js` | No |
| 7 | Rep, set and rest ranges | Table 20-3 by adaptation: strength 1–5 × 4–6 sets, 3–5 min; endurance 12–20 × 1–3, 30–60 s; hypertrophy 6–12 × 3–6, 0–180 s (`BY_ADAPTATION`, 20.3) | `goals.js` `TRAIN` and `js/engine/plan.js` `LEVELS`: strength main lifts 3–5 reps, rest × 1.3; endurance 10–15, rest × 0.6 | `js/data/`, `js/engine/` | No. Open question 21 |
| 8 | Sessions a week by training status | beginner 2–3, intermediate 3–4, advanced 4–6 (`VARIABLES.frequency.byStatus`, 20.3) | no counterpart; days a week is the person's choice | `js/engine/plan.js` | No |
| 9 | Energy per kg of body weight | 3,500 kcal per lb, about 7,716 per kg (`ENERGY`, 8.1) | 7,700 kcal per kg (`js/coach/energy.js`) | `js/coach/` | No. **Agrees** within 0.2% |
| 10 | Maintenance | names Mifflin-St Jeor, Harris-Benedict and Katch-McArdle; says all underestimate measured RMR and work poorly in obesity; gives no better equation (`DAILY_ENERGY`, 8.4) | Mifflin-St Jeor × activity multiplier (`body.js`) | `js/engine/` | **Yes**. The book offers no alternative, so nothing to adopt. Open question 16 |
| 11 | Volume | "reps × sets × load" (`VARIABLES.volume`, 20.3) | Σ(weight × reps) per set (`js/engine/lifts.js`) | `js/engine/` | **Yes**. Same answer when every set is the same; the app's form also handles sets that differ, so it is the general case, not a disagreement |
| 12 | RPE | one 1–10 rating of the whole body's effort, mainly for cardio (`assessments.js` `rpe`, 11.5) | per-set RPE read as reps in reserve (Zourdos, Helms), trusted from 6 to 10 (`js/coach/util.js` `rirOf`); session RPE (`srpe`) is the book's scale | `js/coach/` | No. A different measure, not a different formula |
| 13 | Lowest calorie target | nothing stated | when losing, max(0.95 × BMR, 1,200 women or 1,500 men) (`body.js` `targetKcalOf`) | `js/engine/` | No. **Owner's 2.7A floor is BMR itself**, so the engine can set a day the coach may not move down |
| 14 | Calories from macros | 4 / 4 / 9 | 4 / 4 / 9 | — | **Agrees** |
| 15 | MET calories | `MET × 3.5 × kg / 200` per minute | the same | — | **Agrees** |
| 16 | Volume landmarks (MEV, MAV, MRV) | none: the book counts sets per exercise per session, not per muscle per week | Renaissance Periodization ranges, rounded (`js/coach/landmarks.js`) | `js/coach/` | No. Nothing in the book to compare; RP stays the only source |
| 17 | Strength-ratio norms | none | none since 20 Oct: the unsourced ranges were removed; weak points report "no reference data" | `js/coach/` | No |

## Is the book's method better? Row by row

- **1, 1RM.** Not clearly. Both are standard estimates. They agree at 10 reps, and below
  that Epley reads up to about 2% higher. The book's formula only covers 2–10 reps, so
  adopting it would drop sets of 11–12 (narrowing the range, never widening it). It has
  no reps-in-reserve term; the app adds reps left in reserve before estimating, and that
  would need to be kept or dropped deliberately. **Your decision**, and it needs
  `CLAUDE.md` changed first (below).
- **2, 3, deficit and surplus.** A fixed number of calories against a share of
  maintenance. The share scales with body size, which the book itself says matters
  ("individual needs vary tremendously"). Adopting the book means fixed numbers: −500
  for loss and +350 to +500 for gain (the app's cap is 300 now).
- **4, protein while losing.** The book gives 2.4 g/kg for people in a deficit; the app
  gives 2.0. Adopting it raises the target.
- **6, water.** The book's figures are total water from all sources, food included.
  Using them as a drinking target would overstate it. Better left as it is unless a
  drinking-water figure is extracted.
- **7, 8, plan numbers.** The book's ranges by adaptation are fuller than the app's.
  Adopting them changes generated plans and the plan check; it changes no logged
  history.
- **10, 11, 12, 16.** Nothing in the book to adopt.

## What blocks a change

- **`CLAUDE.md`** says "Formulas — do not change these" for Epley, Mifflin-St Jeor,
  calories from macros, MET calories and volume. The owner's 20 Oct rule makes the book
  the default, but `CLAUDE.md` is loaded into every session, so a formula changed while
  it still says otherwise will look like a violation to every session that follows.
  **`CLAUDE.md` needs updating by the owner first**, for row 1 at least.
- **Folder ownership.** Rows 2–8 and 13 live in `js/data/`, `js/engine/` and
  `js/schema.js`, which belong to the app session. The coaching engine session cannot
  make those changes; each is logged in `.claude/PROGRESS.md` as a request.
- **The coaching brief for this session** also says to keep Epley capped at 12 reps.

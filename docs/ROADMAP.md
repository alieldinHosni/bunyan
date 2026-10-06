# Roadmap

The coaching brief (`.claude/PROGRESS.md`) is done. This is what comes next, in two
tracks: a coach that learns from the person instead of from formulas alone, and code
that stays easy to change as it grows. Each phase ships on its own with its tests, in
order, and the constraints do not move: offline, no paid or external API, every string
in Arabic, nothing changes the plan without a tap.

## Where the code stands (measured, October 2026)

- `js/app.js` is 1,927 lines, and one click handler holds 275 branches.
- One engine module (`formulas.js`) imports from the UI layer.
- 8 of the 11 engine modules read the global state `S` directly, so they can only be
  tested in a browser. `js/coach/` is pure and has 90 Node tests; the engine has none.
- Views borrow logic from other views: Progress and the coach chat take the day's plan
  from the Training view, and the chat takes Progress's answers from the Progress view.
- The guard is the regression suite (111 browser tests) and random-tap stress runs.

## Where the coaching stands

It reads the log well (fatigue, stalls, volume, proportions, progression), but two
things are still fixed when they should be learned:
- **Calories** come from a formula (Mifflin–St Jeor × activity). A formula can be off by
  10–15% for a given person, and the app has the data to see it: logged intake and the
  weight trend.
- **Effort.** RPE is logged but the max estimates ignore it. The "how do you feel today"
  answer shows a note and changes nothing. A program's effort target is the same every
  week, with no planned build and no planned lighter week.

## Phases

| # | Track | Phase | What it gives | State |
| --- | --- | --- | --- | --- |
| A1 | Architecture | **Layer rules, enforced** | A Node test that fails when a module imports across a layer it shouldn't (`coach` imports only `coach`; `engine` never imports `ui`; a view never takes logic from another view). The current breaks fixed: the day's plan moves from the Training view to `engine/`, Progress's plain answers to `engine/`. | Done: `tests/architecture.mjs` |
| B1 | Coaching | **Maintenance that learns** | From two to four weeks of logged food and weigh-ins, the calories your body actually uses (energy balance, with how sure it is). Coach AI and the chat say "your maintenance looks like 2,450, not the 2,600 the formula guessed" and offer targets from it, with Undo. Pure, in `coach/`, with tests. | Done: `js/coach/energy.js` |
| B2 | Coaching | **Effort-aware strength** | Max estimates count the reps left in reserve (8 reps at RPE 8 is 10 reps' worth), so a hard set and an easy one stop reading the same. Used by trends, progression and the powerlifting standing. | Done: effort-aware `e1rm()` |
| B3 | Coaching | **Readiness that acts** | A low "how do you feel" answer turns today's suggestions into a lighter day (hold the weight, one set fewer), shown and overridable; a great day allows the bigger step. | Done: readiness in `recommend()` |
| A2 | Architecture | **`app.js` split by domain** | The 275-branch handler becomes a registry, with handlers in `ui/handlers/{train,session,food,coach,progress,profile}.js`. `app.js` keeps only boot and wiring. Mechanical, guarded by the full suite and stress runs. | Next |
| A3 | Architecture | **A testable engine** | Engine functions take what they need (profile, sessions, goals) instead of reading `S`, starting with energy, protein, the weight trend and nutrition. A Node test suite for the engine like the coach's. | |
| B4 | Coaching | **Blocks, not just weeks** | A program runs in blocks: effort builds week by week (reps in reserve 3 → 2 → 1), then a planned lighter week, then the next block. Sets per muscle move from one tap after each session ("too easy / about right / too much") plus the soreness already asked. | |
| B5 | Coaching | **Swaps that understand movement** | Every exercise tagged by movement pattern (squat, hinge, push, pull, carry, …). Pain, missing equipment or "replace" offers swaps that train the same thing. The chat's pain answer uses it. | |
| A4 | Architecture | **State with a schema** | Documented types for what is stored (JSDoc), versioned migrations with tests, and a check that a restored backup is the app's own shape. | |

## Rules for every phase

- Pure coaching code in `js/coach/`, with Node tests and a defined answer on an empty log.
- Explain, never decide: each suggestion shows the numbers behind it and waits for a tap.
- Earn silence: a learned number appears only when the data supports it, and says how
  sure it is.
- Sources in `CREDITS.md`; nothing copied from AGPL code.
- Every phase ends with the full regression suite, stress runs in English and Arabic,
  the design system updated, and a PR.

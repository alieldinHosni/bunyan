# Roadmap

The coaching brief (`.claude/PROGRESS.md`) is done. This is what comes next, in two
tracks: a coach that learns from the person instead of from formulas alone, and code
that stays easy to change as it grows. Each phase ships on its own with its tests, in
order, and the constraints do not move: offline, no paid or external API, every string
in Arabic, nothing changes the plan without a tap.

## Where the code stands (measured October 2026, updated after A4)

- `js/app.js` was 1,927 lines with one click handler of 275 branches. It is now about
  240 lines of boot and wiring; the branches live by domain in `js/ui/handlers/`,
  registered at boot in a fixed order (A2).
- The engine no longer imports the UI, and views no longer borrow logic from each other
  (A1). Both are enforced by `tests/architecture.mjs`, which also fails on an import of
  a file that does not exist and on a tap answered in `app.js`.
- The body and intake maths (energy, the calorie and protein targets, the weight trend,
  measurements and body fat, the food log's averages and streaks) lives in
  `js/engine/body.js` and `js/engine/intake.js`, which are handed what they need and
  never reach `state.js`; the architecture test holds them to that (A3). The old names
  in `formulas.js`, `stats.js` and `energy.js` are one-line wrappers that pass `S` in.
  The rest of the engine (sessions, records, progression, the plan builder) still reads
  `S` and is next in line as it is touched.
- What a profile stores is written down in `js/schema.js` (JSDoc types), with its
  defaults, the shape check every load runs, versioned migrations (the blob records
  `v`; each step runs once, in order) and the check a restored backup must pass (A4).
- The guard is the regression suite (135 browser tests), the coach tests (143), the
  engine, data and schema tests (`tests/engine.mjs`, 145), the architecture test and
  random-tap stress runs in both languages.

## Where the coaching stands

It reads the log (fatigue, stalls, volume, proportions, progression), and what was
fixed now learns from the person:
- **Calories**: maintenance is measured from logged intake and the weight trend once
  there is enough of both, and offered in place of the formula (B1).
- **Effort**: max estimates count the reps left in reserve (B2); how the lifter feels
  today moves today's suggestions (B3); a program runs in four-week blocks that build
  effort and end in a planned lighter week, with sets per muscle moved by a tap after
  each workout and the soreness already asked (B4).
- **Swaps** keep the movement: every exercise has a pattern, and pain, missing kit, the
  Replace sheet and the chat all offer what trains the same thing (B5).

The phases below are all done. What comes next is chosen from use: the engine's other
modules move to the pure style as they are touched, and new coaching earns its place by
the same rules.

## Phases

| # | Track | Phase | What it gives | State |
| --- | --- | --- | --- | --- |
| A1 | Architecture | **Layer rules, enforced** | A Node test that fails when a module imports across a layer it shouldn't (`coach` imports only `coach`; `engine` never imports `ui`; a view never takes logic from another view). The current breaks fixed: the day's plan moves from the Training view to `engine/`, Progress's plain answers to `engine/`. | Done: `tests/architecture.mjs` |
| B1 | Coaching | **Maintenance that learns** | From two to four weeks of logged food and weigh-ins, the calories your body actually uses (energy balance, with how sure it is). Coach AI and the chat say "your maintenance looks like 2,450, not the 2,600 the formula guessed" and offer targets from it, with Undo. Pure, in `coach/`, with tests. | Done: `js/coach/energy.js` |
| B2 | Coaching | **Effort-aware strength** | Max estimates count the reps left in reserve (8 reps at RPE 8 is 10 reps' worth), so a hard set and an easy one stop reading the same. Used by trends, progression and the powerlifting standing. | Done: effort-aware `e1rm()` |
| B3 | Coaching | **Readiness that acts** | A low "how do you feel" answer turns today's suggestions into a lighter day (hold the weight, one set fewer), shown and overridable; a great day allows the bigger step. | Done: readiness in `recommend()` |
| A2 | Architecture | **`app.js` split by domain** | The 275-branch handler becomes a registry, with handlers in `ui/handlers/{train,session,food,coach,progress,profile}.js`. `app.js` keeps only boot and wiring. Mechanical, guarded by the full suite and stress runs. | Done: `js/ui/handlers/`, `app.js` 1,942 → about 240 lines |
| A3 | Architecture | **A testable engine** | Engine functions take what they need (profile, sessions, goals) instead of reading `S`, starting with energy, protein, the weight trend and nutrition. A Node test suite for the engine like the coach's. | Done: `js/engine/body.js`, `intake.js`, `tests/engine.mjs` |
| B4 | Coaching | **Blocks, not just weeks** | A program runs in blocks: effort builds week by week (reps in reserve 3 → 2 → 1), then a planned lighter week, then the next block. Sets per muscle move from one tap after each session ("too easy / about right / too much") plus the soreness already asked. | Done: `js/coach/block.js`, `js/engine/blocks.js` |
| B5 | Coaching | **Swaps that understand movement** | Every exercise tagged by movement pattern (squat, hinge, push, pull, carry, …). Pain, missing equipment or "replace" offers swaps that train the same thing. The chat's pain answer uses it. | Done: `js/data/movement.js` |
| A4 | Architecture | **State with a schema** | Documented types for what is stored (JSDoc), versioned migrations with tests, and a check that a restored backup is the app's own shape. | Done: `js/schema.js` |

## Rules for every phase

- Pure coaching code in `js/coach/`, with Node tests and a defined answer on an empty log.
- Explain, never decide: each suggestion shows the numbers behind it and waits for a tap.
- Earn silence: a learned number appears only when the data supports it, and says how
  sure it is.
- Sources in `CREDITS.md`; nothing copied from AGPL code.
- Every phase ends with the full regression suite, stress runs in English and Arabic,
  the design system updated, and a PR.

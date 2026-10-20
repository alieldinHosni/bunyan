# Bunyan — project invariants

Rules that hold in every session regardless of the task. Read `.claude/SESSION-RULES.md`
for which directories this session may edit.

## Boundaries

- Edit files in **your session's own directories only**. If a change is needed outside them,
  write it in `.claude/PROGRESS.md` and stop.
- `source/` holds copyrighted textbooks. It is gitignored. **Never commit anything from it,
  never copy its prose verbatim, never use its images.** Facts, systems and prescriptions
  may be extracted and restructured; expression may not be reproduced.
- **Uploading through the GitHub website ignores `.gitignore`.** Never select `source/`
  when uploading files.
- Update `.claude/PROGRESS.md` after every unit of work, not every session.

## Rendering

- **Never rebuild a whole screen with `innerHTML` for a small state change.** A tap, a
  toggle, an added set or a changed field updates only the affected element. Five separate
  bugs have come from this; do not add a sixth.

## Client code

- Vanilla ES modules. No framework, no build step, no npm, no `package.json`. Scripts in
  `tools/` are the exception and never run in the browser.
- The app must keep working offline. Test with the network disabled.
- Use the existing design tokens. Nothing hardcoded — no raw hex, spacing or radius values.
- Per-profile storage keys. Never global state that leaks between profiles.

## Language

- Every user-facing string goes through `t()` with an Arabic entry. No exceptions, not even
  temporary ones.
- Verify in RTL, not just LTR.
- Numbers go in `.num` / `.metric` / `.stat` so bidi does not mangle them.

## Formulas

The textbook's method is the default for prescription and programming. A formula may be
changed when the book's version is demonstrably better, but never on preference. When one
changes, recompute all derived history so a single method applies throughout, and record
the change in PROGRESS.md. Current choices, with reasons:

- Estimated 1RM: Epley, capped at 12 reps. Kept over the book's formula, which covers only
  2-10 reps and carries no reps-in-reserve term.
- Volume, Mifflin-St Jeor, 4/4/9, MET: unchanged. 4/4/9 and MET already match the book;
  the book offers no better method for the others.

- Volume = `Σ(weight × reps)` per set. **Not** `weight × reps × sets`.
- Estimated 1RM = Epley, `weight × (1 + reps / 30)`, **capped at 12 reps**. Do not widen
  the cap.
- Maintenance calories = Mifflin-St Jeor `× activity multiplier`.
- Calories from macros = `protein × 4 + carbs × 4 + fat × 9`.
- MET calories = `(MET × 3.5 × kg / 200) × minutes`. Every MET value carries its source.

## Data

- Body weight comes from the profile, never hardcoded. Historical entries store the weight
  used at the time, not a reference to current weight.
- Cardio calories do not alter the nutrition target. The activity multiplier already counts
  training; adding them double-counts.
- Any migration treats absent data as "no history", never as zero.

## Honesty

- If data for something does not exist, the feature does not ship with an invented value.
  No estimated MET values, no guessed macros, no exercise without an image.
- Label estimates as estimates, at a precision the method supports.
- If something cannot be built without breaking a rule here, say so and stop. Do not work
  around it quietly.

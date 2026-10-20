# Workout screen — diagnosis (SESSION-DESIGN §4, step one)

The current live workout on `main` (`40bd8a3`), measured, not estimated. The captures were
taken in headless Chromium at **390 × 844**, the iPhone 13 Pro's viewport, with the
regression suite's seed profile: Blue dark, English, kg, RPE on the last set, auto-rest on.
Source: `vLogger()` and `vRest()` in `js/ui/views/session.js`, handlers in
`js/ui/handlers/session.js`, actions in `js/ui/workout.js`.

Captures in `current/`: `workout-first-set.png` (the screen as it opens),
`workout-mid-exercise-full.png` (the whole page after set 1, with the rest hidden),
`rest.png`, `rest-complete.png`.

No design yet. This is for approval before any redesign.

---

## 1. What is on screen during an active set

Mid-exercise (set 1 logged, set 2 active, rest hidden). The page is **1,267px tall on an
844px screen**. **31 interactive elements, 23 of them in the first screen; 57 visible
pieces of text.**

| Block | Top (px) | Height | What is in it |
|---|---|---|---|
| Sticky header | 0 | 154 | ✕ close · day name · "Exercise 1 of 6 ▾" · "1 set logged" · session clock tile · ⋯ · progress bar · "Resting 1:59 Show" bar (while a rest is hidden) |
| Exercise strip | 170 | 32 | ‹ · six unlabelled segments (40 × 22, names only in aria) · › |
| Exercise hero | 220 | **376** | "EXERCISE 1 OF 6" (repeats the header) · name 26px · ⓘ · 3D figure 193px with ▶ · tags: Chest, Barbell, 3 × 6–10 · 3 in reserve, Beginner, PR 60 kg |
| Sets card | 612 | 405 | "Sets 1/3 done" · column heads · **3 rows**, each: ✕ delete, set number (doubles as the warm-up toggle), kg, reps, RPE, ✓, and a "Last time 60 kg × 8" line · "+ Add a set" |
| Record card | ~1,030 | ~60 | "New personal record" (gold) |
| Tools | 1,107 | 64 | Replace · Remove · Skip · Add |
| Pain | 1,179 | 48 | "Something hurts?" |

**Before the first set** (`workout-first-set.png`) three more blocks sit above the table:
"How do you feel today?" (5 chips + Skip), a three-line recommendation banner, and day
notes or a pain note when they apply. The active row starts below the bottom of the
screen; only the top of its ✓ shows.

### Where the numbers that matter actually are

| Thing | Size | Position on an 844px screen |
|---|---|---|
| Exercise name | **25.7px**, 800 | 260 — the largest text on screen |
| Session clock | 15px, 700 | in the header |
| **Current weight / reps** (`#in_w`, `#in_r`) | **16px**, 700, in 68 × 42 boxes | **795–837**: the bottom 50px of the screen mid-exercise; **below the screen** before the first set |
| **✓ complete set** | 38 × 38 | 786–824, right edge; under the 44px minimum |
| ✕ delete set | **24 × 24** | right beside the set-number warm-up toggle (24 × 21) |
| Rest digits (full-screen rest) | 64px (the design system's `timer` style) | centre: the one place a number dominates |

---

## 2. Taps for each common action

Starting on the workout screen with the next set's numbers already suggested. "Scroll" is
a separate gesture, counted apart from taps.

| Action | Taps now | How |
|---|---|---|
| **Log a set** | **1** for the first set; **2** for every set after a rest | ✓. But auto-rest puts a full-screen rest over the workout, and when it runs out "Rest complete" stays up until tapped: **Start next set**, then ✓. Skipping the rest early is also 2 (Skip rest, ✓). |
| **Change a weight** (60 → 62.5) | **7** (8 during a rest) | Tap the kg box, ⌫ ⌫, 6 2 . 5. There is no ± stepper on the row. iOS's decimal pad has no Done key, so the keyboard stays up until something else is tapped. During a rest, **Hide** first. |
| **Add a set** | **1 + scroll** | "+ Add a set" sits at 956, below the screen. |
| **Delete a set** | **2** (logged), **1** (not yet logged) | ✕ (24px), then **Delete** in a confirm sheet. A logged set can also be taken back with its green ✓, with Undo in the toast. |
| **Swap an exercise** | **2 + scroll**, **3** with sets logged | Scroll to the tools (1,107) → **Replace** → pick from the "same movement" list. With sets logged, a sheet asks keep or delete. When the plan names an alternative, a one-tap "Or …" link shows before the first set. |
| **See the next exercise** | **2** | Its name is not on the screen. Open the list from the title and close it, or › to go there and ‹ to come back (or swipe). The rest screen says "Up next" but names the next *set* until the last set of an exercise. |
| **Finish the session** | **1–2** at the end, **3** mid-workout | At the end: **Finish workout** on the rest-complete screen or under the table (a sheet asks if planned sets are unlogged). Mid-workout: ⋯ → Finish workout → **Finish now**. The summary sheet follows either way. |

---

## 3. On screen but not needed mid-set

- **The 3D figure and the hero around it: 376px, 45% of the screen**, above the numbers.
  Useful before the first set; between sets 2 and 3 it pushes the active row to the fold.
- "EXERCISE 1 OF 6" in the hero, which the header already says.
- The tag row (muscle, equipment, dose, difficulty, PR): five pills of reference
  information.
- "Last time 60 kg × 8" under **every** row, three times for one figure.
- The "New personal record" card, and "Progression earned" when it shows: news, not
  something to act on mid-set.
- Full editable boxes on sets already logged, with the same weight as the active row.
- **Remove**, a destructive action, at the same weight as Replace, Skip and Add.
- "Something hurts?", full width.
- "1 set logged" in the header next to a progress bar that shows the same thing.
- Before the first set: the recommendation as three lines of text on glass, over the
  background drawing (a §3 contrast case: the palm trees run through the words).

## 4. Needed but buried

- **The current set's weight and reps.** 16px, the same size as body text, at the bottom
  edge of the screen, and off it before the first set. The spec's first rule (the number
  needed now is the largest thing on screen) is not met: the exercise name is.
- **Changing the weight.** Keyboard only, 7 taps, no stepper, and no Done key to put the
  keyboard away.
- **The next exercise's name.** Nowhere on the workout screen; two taps to see.
- **Add a set.** Below the screen.
- **The ✓** is small (38px), and before the first set it sits off the bottom of the screen.
- **The rest gate.** After every set the rest takes the whole screen, and when it ends it
  waits for a tap, so steady logging costs two taps a set.

---

## 5. What kind of problem this is

**Mainly hierarchy, then density. Navigation depth only in two places.**

- **Hierarchy (the main one).** Everything needed mid-set exists, mostly within one tap.
  But the screen is ordered for *before* the exercise (what it is, how it looks, what it
  works), not *during* it. The figure and the name are dominant; the numbers are the size
  of a caption, at the fold.
- **Density.** 31 controls and 57 bits of text, 1.5 screens tall. Three rows of
  full-weight inputs, repeated "Last time" lines, tags and two cards compete with the one
  active row.
- **Depth, in two places only.** Changing a weight (7 taps by keyboard), and the
  rest-complete screen (one extra tap per set). Swap, delete and finish are already 2–3
  taps; their problem is position (below the screen), not depth.

That fits the spec's likely direction (the current set dominant, everything else
recessive), with two additions the counts point to:

1. A way to change weight and reps without the keyboard.
2. Logging the next set straight from the rest-complete screen, or from the rest screen
   itself.

**Settled decisions this has to keep** (spec §4): the Nike-style ✓ to complete a set;
delete from the left of a set row, with confirmation; exercise names without the grip
qualifier (already true: "Barbell Bench Press"); short cues. Delete is on the left, but
it is a 24px target beside a 24px warm-up toggle. The redesign keeps it where it is and
makes it reachable without mis-tapping.

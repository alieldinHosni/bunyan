# Workout screen — component spec (deliverable 5, workout part)

Prototype: `design/workout.html` (open it from a local server at the repo root; it reads
`design/tokens.css`, a generated copy of `main`'s tokens, and the repo's `fonts/`). Each
frame opens on its own with `#<state>-<ltr|rtl>`, e.g. `workout.html#active-ltr`, for the
arm's-length check on a phone.

Colour authority: `main` at `682803f` (owner, 20 Oct). **Every colour is an existing
token. No new colours.** One new token, `--onDanger`, was approved on 20 Oct for the
destructive confirm (see `token-requests.md`); this screen does not use it.

Built on the approved diagnosis (`workout-diagnosis.md`) and the owner's six fixes of
20 Oct.

---

## States

| State | Frame | What is dominant |
|---|---|---|
| Idle | `idle` | Weight and reps of set 1 (76px), visible without scrolling, with the recommendation as one line |
| Active set | `active` | Weight and reps of the set being done (76px); a logged warm-up row above set 1 |
| Active set, warm-up | `warm` | The same card, marked as a warm-up, with "Log warm-up" |
| Set completed | `logged` | The green "Set 2 logged" with Undo; the rest starts above the next set |
| Rest | `rest` | Time left (68px); the next set's numbers (56px) and the check stay on screen |
| Rest, time up | `over` | The rest band turns `accent` with "Rest complete" (a sub-state of Rest) |
| Session complete | `complete` | Check, duration, sets, volume; the personal-record card lives here now |

Every frame is drawn in English (LTR) and Arabic (RTL).

## Layout (390 × 844, iPhone 13 Pro)

Measured in the prototype, LTR. RTL mirrors.

| Element | Active | Rest |
|---|---|---|
| Header (glass) | 0–103 | 0–103 |
| Exercise name, ⓘ, ⇄ | 115–160 | 115–160 |
| Set line, + Warm-up, + Set | 163–207 | 163–207 |
| Rest band | — | 221–352 |
| Set card | 221–477 | 366–599 |
| Weight and reps numbers | 267–349 | 412–475 |
| Log control | 491–567 | 613–689 |
| Next exercise | 581–645 | 703–767 |
| Sets so far, then tools | from 659 | from 781 |

Nothing the user needs mid-set is below the fold. Skip, Add exercise, Remove and Something
hurts? are; they are not used mid-set.

## Components

### WorkoutHeader (changed)
- Close ✕ (44px), day name (13px, `sub`), "Exercise 1 of 6 ▾" (15px/700, `text`), which
  opens today's list as now, clock (15px/700, `sub`), ⋯ (44px). A 3px progress bar
  (`bar-track`, `accent`).
- **The only glass on the screen**: the same treatment as `main`'s session header,
  `rgba(var(--bg-rgb), .72)` with `blur(18px)`. One blurred layer, 103px tall.
- Dropped: "1 set logged" (the bar says it) and the "Resting 1:59 Show" bar (the rest is
  on the screen now).

### ExerciseLine (new, replaces ExerciseHero on this screen)
- Name, 21px Outfit 700. Smaller than the numbers, as the brief requires. No grip
  qualifier (settled).
- ⓘ How to do it, 44px: opens the exercise sheet, which keeps the 3D figure, photos,
  tags and cues.
- ⇄ Replace this exercise, 44px: the picker, as now. Swap is 2 taps without scrolling.
- "Set 2 of 3 · 6–10 reps" (15px, `sub`) and two add buttons, 44px: **+ Warm-up** (dashed
  `gold` edge) and **+ Set** (dashed `border`). See WarmUpSet.

### SetCard (new)
- Flat `raised`, 1px `border`, radius `--r5`. **No glass.**
- Two values, weight and reps: label (13px/700, `dim`), number (76px Outfit 700, `text`,
  tabular). Shrinks to 56px while a rest is counting, because then the time is the
  number that matters.
- **Steppers**, 56px high, `surface`, `border`, radius `--r4`.
  - **Weight** steps by `incrementOf()` (`js/engine/lifts.js`): 5 kg on a heavy barbell
    lift (squat, deadlift, leg press, hip thrust), 2.5 on other barbell lifts and machines,
    2 for dumbbells (4 when logged as the pair's total), 4 for kettlebells, and never more
    than a tenth of the load. In lb: 10 or 5 lb. A per-exercise step the user set wins.
    This is the progression engine's own step, so the buttons and the suggestions cannot
    disagree.
  - **Reps** step by 1.
  - Bodyweight lifts step the added load the same way. Timed sets step seconds by 5.
- **Tapping a number** opens the keyboard on it with the value selected, for a big jump
  (60 → 80). The keyboard path is the fallback, not the main one.
- One reference line under a hairline: "Last time 60 kg × 8" for this set only. Before
  the first set: "Recommended 60 kg × 6–10" and the cue ("Hold the weight, chase a rep"),
  one line each.
- RPE, when it is asked for (the last set by default): a row of 6–10 chips, 44px, in the
  card under the steppers. Not drawn; the seed has RPE on the last set only.

### LogControl (changed; the Nike-style check is kept)
- Full width, 76px, pill, flat `--color-action-fill` with `onAccent` (owner, 20 Oct:
  labels never sit on Machine Red; `token-requests.md` §4). In Red that is `accent-deep`,
  6.80:1, with a 1.5px Machine Red edge in Red dark.
- Label "Log set 2", 20px Outfit 700. The check: a 60px ring with the tick.
- **Logs from the rest too.** Tapping it during a rest logs the set and ends the rest.
  When the rest runs out, nothing waits for a tap: the check is already there.
- **Set completed**: for ~2 s the control becomes `ok` with `onOk`: filled ring, "Set 2
  logged", and Undo (48px). Then it reads "Log set 3". Replaces the toast's Undo for this
  case.
- Double-tap guard as now (700 ms).

### RestBand (new, replaces the full-screen rest)
- Flat `raised` card above the set card: "Rest" (13px, `dim`), time (68px Outfit),
  −30 / pause / +30 (48px round), a 6px progress bar.
- **Time up**: the band fills with `--color-action-fill`, "Rest complete" (40px) and "+0:05 over your
  rest" (20px/700), `role="alert"`. The alarm sound is unchanged.
- **Approved (owner, 20 Oct), and it supersedes Round 4 item 4's full-screen time-up
  state.** The accent band keeps the alert visible with the sound off, and the check stays
  under the thumb.

### NextExercise (new)
- "Next" (13px/700, `dim`) and the name (17px Outfit 700), 64px, `raised`, chevron
  (mirrored in RTL). Tapping it moves to the next exercise. Replaces the
  "Exercise 1 of 6" kicker in the hero and the unlabelled segments.

### SetHistory (changed)
- One row per set, 52px: ✕ delete **on the leading edge** (44px, settled), set number,
  "60 kg × 8", and a 36px green tick on a 44px target that takes the set back (Undo
  toast, as now). The current row reads "now". Pending rows show their planned values.
- **Delete asks in the row**, not a sheet: the row turns into "Delete set 1? 60 kg × 8
  [Delete] [Cancel]". Still two taps, and one sheet fewer.
- The set number is no longer a warm-up toggle (a 24px toggle beside the delete was a
  mis-tap waiting to happen). See WarmUpSet.

### WarmUpSet (new; owner, 20 Oct)
A warm-up is **chosen when the set is added**, not toggled afterwards, so there is nothing
to find later.

- **+ Warm-up** beside the set count adds a warm-up row before the next working set and
  makes it the current set. It starts with the values of the last warm-up on this
  exercise, or else the next working set's weight, to step down from. **No recommended
  warm-up weight is shown**: the app has no rule for one, and it does not invent values.
- **The card says so**: a `gold`-ringed **W** and "Warm-up · Not counted in volume or
  records". The log control reads **Log warm-up**.
- **The row looks different at a glance**: a dashed `gold` edge, **W** in place of the
  set number, and a "Warm-up" tag. Working sets keep their own numbering (1, 2, 3); warm-ups
  do not take a number.
- Gold is the existing role for warm-up marks. The W and the tag are drawn in `text` and
  `sub`, not gold, so they pass AA in the light modes (gold on `surface` measured 3.48–4.27
  there).
- **To change a logged set's kind**: delete it and add it again with the right button. No
  toggle, by design. If this turns out to be needed, the row's own menu is the fallback.
- Behaviour behind it is unchanged: a warm-up set still carries `wu: true` and is left out
  of volume, records and progression, exactly as the toggle did.

### Tools (changed)
- Skip and Add exercise: 52px tiles, `surface`.
- **Remove this exercise** and **Something hurts?**: quiet text links under them (14px,
  `dim`, underlined). Remove is lower in the hierarchy, as asked.

### WorkoutComplete (changed)
- 96px `ok` check, "Workout complete" (30px), day name, three stats (30px Outfit) on
  `raised`, the **personal-record card** (`gold` edge and label), Done (LogControl style,
  20px label).
- The cool-down and "how did it feel" from the current sheet sit under Done (not drawn).

## Removed from this screen

| What | Where it goes |
|---|---|
| 3D figure and photos (376px, 45% of the screen) | The exercise sheet behind ⓘ (`exdetail` in `js/ui/sheets.js`), which already shows the figure |
| Tags: muscle, equipment, difficulty, PR | Same sheet. The dose stays in the set line. |
| "Last time" under every row | Once, in the set card, for the current set |
| Personal-record and Progression-earned cards | Workout complete |
| "How do you feel today?" | Kept, before the first set only, under the log control, so it no longer pushes the numbers down |

## Contrast, measured

Every text element in every LTR frame, against the surface actually behind it, in all
six themes. The worst case per element; gradients are measured at both stops. **L** =
large text (≥ 24px, or ≥ 18.66px bold), needing 3:1; everything else needs 4.5:1.

| Element | Blue dark | Blue light | Red dark | Red light | Sage dark | Sage light |
|---|---|---|---|---|---|---|
| Header: day, clock | 12.01 | 8.19 | 12.44 | 8.64 | 11.11 | 7.77 |
| Header: Exercise 1 of 6 | 17.44 | 15.97 | 17.70 | 17.47 | 15.52 | 11.16 |
| Exercise name | 17.44 L | 15.97 L | 17.70 L | 17.47 L | 15.52 L | 11.16 L |
| Set line, + Add a set | 12.01 | 8.19 | 12.44 | 8.64 | 11.11 | 7.77 |
| Value labels (kg, reps), "Rest" | 5.96 | 6.50 | 6.38 | 6.88 | 6.09 | 6.34 |
| Weight and reps numbers | 15.37 L | 18.60 L | 16.68 L | 18.98 L | 13.82 L | 13.16 L |
| Stepper labels | 6.76 | 5.58 | 5.42 | 5.47 | 6.84 | 5.37 |
| Log set label (on the action fill) | 8.87 | 5.49 | 6.80 | 6.80 | 11.30 | 13.13 |
| Rest time | 15.37 L | 18.60 L | 16.68 L | 18.98 L | 13.82 L | 13.16 L |
| Rest complete, +0:05 (on the action fill) | 8.87 | 5.49 | 6.80 | 6.80 | 11.30 | 13.13 |
| Set logged label (on `ok`) | 10.63 | 5.80 | 6.09 | 5.65 | 7.57 | 4.90 |
| Undo (on `ok`) | 14.92 | 5.80 | 6.09 | 5.80 | 7.57 | 5.76 |
| Next: label | 5.96 | 6.50 | 6.38 | 6.88 | 6.09 | 6.34 |
| Set rows, "now" | 12.01 | 8.19 | 12.44 | 8.64 | 11.11 | 7.77 |
| Row delete ✕ | 5.28 | 5.08 | 6.00 | 6.33 | 5.37 | 5.37 |

All pass at 4.5:1. (Before the owner chose option (b) on 20 Oct, the two Red cells were
3.27:1 and passed only as large text.)

Not measurable as a single number: the header over content scrolling under it. It is
72% `bg` over the page's own flat `bg`, with its text in `text` and `sub`.

## Decisions, as ruled by the owner (20 Oct)

1. **Flat background on this screen: approved.** Content never sits on the ground or on
   glass.
2. **Rest panel instead of a full screen: approved.** Supersedes Round 4 item 4.
3. **Warm-up: chosen when the set is added** (+ Warm-up), with a visible difference on the
   row and the card. A bare long press was rejected as undiscoverable.
4. **Delete confirms inside the row: approved.**
5. Weight steps come from `incrementOf()`.
6. `--onDanger` approved (see `token-requests.md`), and the 20px label on red fills.

## Glass and performance

One blurred layer (the header, 103px). The rest band, set card and every text surface are
opaque. **Not checked on a real iPhone**: this session has no device. To check: open
`workout.html#active-ltr` on the iPhone 13 Pro and scroll the frame. If the header's blur
stutters, swap it for `rgba(var(--bg-rgb), .96)` with no blur.

## New strings (need Arabic entries in `js/i18n/dict.js`)

| English | Arabic used in the prototype |
|---|---|
| Log set {n} | سجّل المجموعة {n} |
| Set {n} logged | المجموعة {n} اتسجلت |
| Hold the weight, chase a rep | ثبّت الوزن وزوّد عدة |
| Delete set {n}? | تمسح المجموعة {n}؟ |
| Log warm-up | سجّل الإحماء |
| Not counted in volume or records | مش محسوب في الحجم ولا الأرقام القياسية |
| Warm-up (the add button; "+ Warm-up") | إحماء |
| Set (the add button; "+ Set") | مجموعة |

Every other string on the screen is already in the dictionary.

## Taps, before and after

| Action | Now | Designed |
|---|---|---|
| Log a set | 1, then 2 after every rest | **1**, always |
| Change a weight (60 → 62.5) | 7 by keyboard | **1** (+2.5) |
| Add a set | 1 + scroll | **1**, at the top (+ Set or + Warm-up) |
| Delete a set | 2 (✕, sheet) | 2 (✕, confirm in the row) |
| Swap an exercise | 2 + scroll | **2** (⇄ by the name) |
| See the next exercise | 2 | **0** |
| Finish the session | 1–2 at the end, 3 mid-way | 1–2 at the end, 3 mid-way |
| Add a warm-up set | 2 + scroll (+ Add a set; after logging, tap its number) | **1** (+ Warm-up) |

None went up. A big weight jump (60 → 80 on bench) is 8 taps on the stepper; tapping the
number and typing stays available for that, at the old cost.

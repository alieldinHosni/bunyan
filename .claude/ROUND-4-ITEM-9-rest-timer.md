# BUNYAN — Round 4, Item 9: Rest timer screen and timer-complete state

**Use the ponytail skill at `full` intensity.**
**Read `.claude/PROGRESS.md` first.** Parts of this may already be built — check before
building, and say what already exists.

**A design image is attached to this message.** It is the visual target for the running
timer screen. Match its layout, hierarchy and spacing. It is direction, not a pixel spec —
where it conflicts with the app's existing design tokens, the tokens win.

---

## Two problems

**1. The running timer screen** should match the attached design.

**2. The timer-complete state is bad.** When the countdown reaches zero it shows a poor
popup: colours that do not match the rest of the app, and nothing that reads as premium.
It is visually disconnected from everything around it.

---

## Required — running timer screen

Match the attached design's layout and hierarchy. Keep the existing functionality that
already works:

- Countdown ring with remaining and total time
- Pause and resume
- +30s / −30s adjustment
- "Up next" showing the coming set
- Skip rest and continue

**Use the app's own tokens for colour, radius, spacing and type.** The timer screen must
look like it belongs to Bunyan, not like a separate product. This is the specific failure
of the current complete-state.

---

## Required — timer-complete state

Replace the popup. When the countdown reaches zero, the screen presents two actions:

| Action | Weight | Behaviour |
|---|---|---|
| **Next set** | **Primary** | Return to logging, ready for the next set |
| **Extend rest** | **Secondary** | Add more rest time and resume the countdown |

**Next set is primary. Extend rest is secondary.** This matches how training actually
works: the rest period ends, you judge whether you are ready, and you either continue or
take more time. The app must not force a rush into the next set, and must not make
continuing the harder option either.

The complete state must:

- Use the same surfaces, radii, spacing and accent as the rest of the app
- Be visually unmistakable — this is the moment the user may be looking away, so it
  should carry the alert on its own, not rely on a small label
- Not be a modal or popup layered over the timer. It is a **state change of the timer
  screen**, not a new surface
- Animate in using the existing motion tokens, at Level 2 weight

---

## Do not create duplicate controls

**This is the most likely way to get this wrong.** The screen already has `+30s` during
rest, and `Skip rest and continue`. Adding `Extend rest` and `Next set` without thinking
produces four controls doing two jobs — the same defect as `COMPLETE SET` versus
`+ ADD A SET` in Round 1, and `+` versus `ADD A SET` in Round 2.

The distinction must be **temporal**, and only one pair is ever visible:

- **While the timer is running:** `+30s`, `−30s`, `Pause`, `Skip rest and continue`
- **After the timer reaches zero:** `Next set` (primary), `Extend rest` (secondary)

Decide whether `Extend rest` adds a fixed amount or offers a choice, then make it
consistent with the running-state `+30s`. Do not ship two different extension
mechanisms.

---

## Related work — do not duplicate or contradict

**Round 4 Item 4 covers the alarm.** Do not re-specify or re-implement it here. In
summary, so this item does not conflict with it:

- 8-second alert at zero, audible with the ring switch on and the app in foreground
- Audio context unlocked on the first logged set, so the first rest is not silent
- **Silent switch, background playback and vibration are impossible on iOS web.** Do not
  build settings implying otherwise.
- Because sound cannot be guaranteed, the **visual** complete state carries the alert.
  That requirement lives in this item.

**Round 2 Phase 1 applies directly.** The rest timer must update only the digits, the
total, and the ring's `stroke-dashoffset` on each tick. It must not re-render the screen.
Tapping ±30s or Pause must not cause a repaint. If this is already done, verify it is
still true after the redesign.

**Round 4 Item 7** changes radius, inset and elevation theme-wide. Build this screen from
the tokens so it inherits that change rather than needing rework.

---

## Acceptance criteria

- Running timer matches the attached design's layout and hierarchy
- Timer-complete state uses the app's own colours, surfaces and type — no foreign palette
- `Next set` is visually primary; `Extend rest` is clearly secondary
- Exactly two controls visible after zero; exactly four while running; no overlap in
  function
- Zero state is unmistakable with sound fully off
- No repaint on tick, pause, or ±30s
- Works in RTL
- Respects `prefers-reduced-motion` and the in-app animation toggle

---

## Verification

Test on a physical iPhone. A headless run proves the values, not the experience.

By hand:
- Start a set, let the timer run to zero without touching the phone, and confirm the
  complete state is noticeable from arm's length
- Confirm `Extend rest` resumes the countdown rather than restarting it
- Confirm nothing flashes or shifts when tapping ±30s or Pause

When done, update `.claude/PROGRESS.md` and stop.

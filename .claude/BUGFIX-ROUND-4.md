# BUNYAN — Round 4: Workout execution redesign, navigation, and the bubble theme

**Use the ponytail skill at `full` intensity.**

Seven items. Two of them are blocked on earlier work and are marked as such. Read the
dependency section before starting anything.

---

## 0. Ground rules

Unchanged from previous rounds, restated because they constrain several items here:

- **Vanilla ES modules.** No framework, no build step, no npm, no `package.json`.
- **No animation or gesture libraries.** CSS and lightweight JS only.
- **No paid or keyed services.**
- **Preserve user data.** Any change to a stored shape needs a migration that upgrades
  existing state rather than discarding it. Real training history exists in
  `localStorage`.
- **Both languages.** Every new string goes through `t()` with an Arabic entry. Every new
  layout verified in RTL — in particular, horizontal swipe direction inverts.
- **Accessibility.** New interactive elements need real accessible names and a 44×44px
  minimum hit area.
- **Reduced motion.** `prefers-reduced-motion` and the in-app animation toggle both
  honoured.
- **Incremental.** One item at a time, verified, then the next.

## 0.1 Dependencies — read before starting

**Item 5 (horizontal exercise pager) is blocked on Round 2 Phase 1** and must not be
attempted before it is done and verified on a physical device.

Reason: the app rebuilds whole surfaces on state change. That is the root cause of five
already-reported bugs — search jumping per keystroke, exercise image flashing on set
add/delete, sheet replaying its open animation on star tap, sheet bouncing on other state
changes, and the Profile screen repainting behind an open sheet. A horizontal swipe
transition running on a surface that rebuilds mid-gesture will stutter in exactly the same
way.

This has already been demonstrated once: during the design-token work, `paintMotion` was
adding CSS classes that the patcher stripped on every render, and the fix was to stop
adding classes and use the existing marker. That is the same defect appearing in new work.

**Item 2 (leaving a session) overlaps Round 2 Bug 5**, the swipe-back reload. If that is
not yet fixed, fix it as part of this item rather than building on top of it.

**Suggested order:** 6 → 3 → 2 → 1 → 7 → 8 → 4 → 5

Item 6 is trivial and removes a constant irritation. Item 3 is small. Item 2 unblocks
leaving a session at all. Item 1 is the large redesign. Item 7 is theme-wide and easier
once 1 is settled. Item 4 is self-contained. Item 5 comes last because it depends on
Phase 1 and on the redesign in item 1.

---

# ITEM 1 — Workout execution screen: major redesign

**This is a redesign, not a patch. Do not iterate on the current layout.**

## Current state

The screen reads as a control panel rather than a modern fitness app. Specific problems:

- A row of six outlined buttons at the bottom: How to, Replace, Plates, Note, Finish,
  plus Discard beneath. All given equal visual weight regardless of frequency of use.
- The primary action — logging a set — does not dominate.
- Recommended values and actual logged values are not clearly distinguished.
- Completed sets are not obviously different from pending ones.
- Too many outlined rectangles competing for attention.

## Required direction

The screen must be usable **between sets, one-handed, without thinking**. That is the
governing constraint. Everything else follows from it.

**a) One obvious primary action.** Logging the current set is the only thing that should
read as primary. Everything else is secondary or tertiary.

**b) Collapse the button row.** How to, Replace, Plates and Note are infrequent. Move them
behind a single overflow control — a `⋯` opening a bottom sheet. Finish is used once per
session and does not need to sit beside them.

Keep **Plates** scoped to barbell lifts only, as already specified in Round 1.

**c) Weight and reps entry must be the obvious interaction.** It should be visually
unmistakable that this is where the user acts. Larger targets, more space, less
competition around it.

**d) Recommended versus actual must be visually distinct.** The Bunyan recommendation and
last session's numbers are reference. The values being entered are the user's own. These
must not look like the same kind of information.

**e) Completed sets must be obvious at a glance.** A logged set should be unmistakable
from a pending one without reading numbers. Green check on a logged row, red on the active
row, as already specified in Round 1.

**f) Motion over borders.** Prefer subtle state transitions to outlined rectangles for
communicating state. Fewer visible edges, clearer hierarchy.

## Constraint interaction

Item 7 makes cards inset and rounder, which **costs horizontal width**. The set row already
carries delete, set number, weight, reps, RPE and the log control. Design the row to
survive the narrower width from item 7, or reduce what it carries. Do not design this
screen and then discover it breaks under the new theme.

## Do not redesign this screen in isolation

The whole flow must follow one interaction system:

```
Training → Start Workout → Exercise → Set logging → Rest → Next Exercise
        → Finish → Workout Summary
```

Components and interaction patterns must be consistent across all of it.

## Acceptance criteria

- A set can be logged in one obvious action from the resting position of a thumb
- No more than two controls at the same visual weight anywhere on screen
- Completed and pending sets distinguishable without reading numbers
- Recommended and actual values visually distinct
- Layout holds at the narrower width imposed by item 7
- Works in RTL

---

# ITEM 2 — Leaving a session

## Current state, all broken together

- The back arrow at the top left **does nothing** on this screen
- Swipe-back **glitches** because the session is open
- The only way out is **Discard**, bottom right — which destroys the session

The user is effectively trapped: the only exit deletes their work.

## Required

**a) Both exits work, and both do the same thing.** The back arrow and the leading-edge
swipe must both call the same navigation function. No control may hardcode a destination.

**b) Leaving does not end the session.** Present a confirmation sheet:

> **Leave workout?**
> Your completed sets are saved. You can resume this workout later.
>
> **Keep workout and exit**
> **Discard workout**
> **Cancel**

"Keep workout and exit" is the primary action. "Discard workout" is destructive-styled.

**c) The session survives everything.** Completed sets, current exercise, current set and
elapsed time must persist through:

- Locking the phone
- Switching apps
- Backgrounding Bunyan
- Accidentally navigating away
- A page reload

**d) Resuming returns to the exact position.** Home and Train show the active session.
Resuming goes to the **exact exercise and set**, not the top of the workout.

> **Workout in progress**
> Day A — Anterior · Exercise 3 of 7
> **Resume workout**

**e) Timer behaviour**, as specified in Round 2 Bug 4: elapsed keeps running while away,
auto-pauses after 7 minutes with no logged set, shows a "Paused" label, stores both active
and wall-clock time, reports active time on completion. The 7-minute threshold lives in one
named constant.

## Gesture conflict — read alongside item 5

Item 5 introduces horizontal swipe to change exercise. That is the same gesture as
edge-swipe-to-go-back. They must not collide:

- **Horizontal swipe within the exercise content** → change exercise
- **Leading-edge swipe** → leave workout, via the confirmation sheet
- **The edge gesture must never silently discard or exit** without the sheet

If reliable separation of the two proves impossible, **the pager wins and the back arrow
becomes the only exit.** A predictable single exit is better than two ambiguous gestures.

## Acceptance criteria

- Back arrow and edge swipe both open the confirmation sheet
- Choosing "Keep workout and exit" leaves the session intact and resumable
- Force-quitting the app and reopening resumes at the same exercise and set
- Reloading the page mid-session does not lose logged sets

---

# ITEM 3 — Discard confirmation modal

## Current state

- The close ✕ is nominally top-left but visibly **offset toward the centre**, not seated
  in the corner with consistent padding
- The modal reads as a desktop-style popup rather than a mobile sheet

## Required

**a) Close control correctly positioned.** Seated in the modal's actual corner with padding
matching the rest of the modal. **In RTL it mirrors to the opposite corner** — use logical
properties, not hardcoded left/right.

**b) Make it a proper bottom sheet.** Consistent with every other sheet in the app.
Round 2 Bug 2 covers drag-to-dismiss and the double-fire defect; this modal inherits that
behaviour with one exception.

**c) Exception — this modal is destructive.** Per Round 2 Item 4, destructive confirmations
**must not dismiss on outside tap**. An ambiguous dismissal on a destructive prompt is
unsafe. Drag-to-dismiss should also be disabled here, or treated as Cancel explicitly.

## Acceptance criteria

- Close control sits in the corner with even padding, mirrored correctly in RTL
- Modal matches the app's sheet language
- Outside tap does not dismiss it
- Cancel and Discard are visually distinguishable at a glance

---

# ITEM 4 — Rest timer alarm

## Requested

Set completed → rest timer starts → reaches zero → audible alert for ~8 seconds, loud,
regardless of phone state.

## What is achievable, stated honestly

**Read this before implementing. Part of the request is not possible and must not be
faked.**

| Requirement | Status on iOS web |
|---|---|
| 8-second alert when the timer hits zero | **Possible** |
| Loud | **Possible** — plays at the device's media volume |
| Plays with the ring/silent switch **off** (silenced) | **Not possible.** iOS applies the hardware silent switch to all web audio. No audio session category, no workaround. |
| Plays while the app is backgrounded or the phone is locked | **Not possible.** The page suspends; audio stops. |
| Vibration alternative | **Not possible.** Safari on iOS has no vibration API. |

**Do not build settings that imply otherwise.** A vibration toggle, a "play when locked"
option, or a "maximum volume" control would each be a switch controlling nothing.

## Required implementation

**a) 8-second alert** at timer zero. An actual alarm-type sound, not a single beep — it has
to be noticeable from across a gym floor.

**b) Unlock audio early.** iOS blocks audio until a user gesture. Unlock the audio context
on the **first set logged**, not when the timer fires, so the first rest period is not
silent.

**c) Wake lock during the session**, so the visual countdown stays on screen. This is the
reliable fallback when sound is unavailable and already exists in the app — verify it is
active during rest.

**d) A visually unmistakable zero state.** Since audio cannot be guaranteed, the screen
must carry the alert on its own: full-width colour change, large state change, not a small
label.

**e) Test Sound control** in settings, alongside a **plain-language explanation** of the
silent-switch limit. The user should learn this from the app, not from a silent gym.

**f) Alert sound choice** if more than one is offered. Do not offer vibration.

## Note for the roadmap, not this round

This requirement is one of the few genuine arguments for moving off the web. A native app
can use a notification-category audio session and fire while backgrounded. If reliable
alarms while locked or silenced matter, that is a platform decision, not something to
solve here.

## Acceptance criteria

- Alert plays for ~8 seconds at timer zero, with the ring switch on and app in foreground
- First rest period of a session is not silent
- Zero state is unmistakable with sound fully off
- Test Sound works, and the limitation is explained in the UI
- No setting exists that does not do something

---

# ITEM 5 — Horizontal swipe between exercises

**Blocked on Round 2 Phase 1. Do not start until Phase 1 is done and verified on a
physical device.**

## Required

Turn the exercise view into a horizontal pager.

- **Swipe left** → next exercise
- **Swipe right** → previous exercise
- Subtle horizontal slide, not an abrupt swap
- The progress indicator at the top **responds to the swipe** — it tracks the gesture, it
  does not jump after the fact
- The indicator remains tappable as it is now

**In RTL, the directions invert.** Next must be the natural forward direction for the
reading order.

## Gesture separation

The single hardest part of this item. See item 2.

- Horizontal swipe inside the content → change exercise
- Leading-edge swipe → leave workout, with confirmation
- The two must not fire together

The distinction is the gesture's **start position**: within roughly 20px of the leading
edge is navigation, anywhere else is paging. If that proves unreliable in practice, drop
edge-swipe-to-exit and keep the pager — the back arrow remains the exit.

## Performance

- `transform` and `opacity` only. No layout-triggering properties.
- The gesture must track the finger in real time, not animate after release
- Adjacent exercises may need pre-rendering to avoid a blank frame mid-swipe. If so, keep
  it to one neighbour each side, not all seven.

## Acceptance criteria

- Swiping between all exercises is smooth, with no flash, stutter or rebuild
- The progress indicator tracks the gesture live
- Swiping does not trigger navigation or exit the session
- Leaving the session still works by its own gesture and by the arrow
- Directions correct in RTL

---

# ITEM 6 — Bottom navigation must be fixed to the viewport

## Current state

On pages with little content the nav **shifts slightly upward**. On long pages it sits
correctly at the bottom.

## Cause

That behaviour means the nav is positioned by the content flow rather than pinned to the
viewport. With enough content it is pushed to the bottom; with little content there is
nothing pushing it.

**If it is already meant to be fixed and still drifts, the cause is almost certainly
`100vh`.** On iOS Safari `100vh` does not equal the visible area — it includes the region
behind the URL bar, so anything anchored to it sits off and moves as the bar shows and
hides. **`100dvh` is the correct unit** and is the specific fix for "slightly upward".

## Required

- Nav pinned to the viewport, never positioned by content
- Page content given bottom padding equal to the nav height plus safe area, so the last
  item is never hidden behind it
- `env(safe-area-inset-bottom)` respected so it does not crowd the home indicator
- Verify the keyboard behaviour from Round 1 still holds — the nav hides on input focus —
  and that this is not a second source of movement

## Acceptance criteria

- Nav occupies the identical screen position on an empty screen and a long scrolling one
- No movement when the Safari URL bar shows or hides
- No content hidden behind it at the bottom of any scroll
- Correct spacing above the home indicator

---

# ITEM 7 — Floating pill navigation and theme-wide bubble mode

## 7a — Floating pill navigation

Reference: a floating, inset pill rather than an edge-to-edge bar, with the active tab in a
filled capsule behind the icon.

**Required:**
- Nav becomes a rounded pill, inset from the screen edges on all sides
- Active tab marked by a filled capsule behind its icon
- Must satisfy item 6 — floating does not mean floating *around*

**Two decisions to make explicitly, not by default:**

**Labels.** The reference has none. Bunyan currently shows HOME / TRAIN / PROGRESS / FOOD /
PROFILE. Icon-only works for universally understood glyphs; a chart icon for "Progress" is
not one of those. **Recommendation: keep labels, or show the label only on the active tab.**
Do not drop them merely because the reference does.

**Active capsule colour.** The reference uses grey. Bunyan's accent is crimson, and a red
capsule behind a red icon will be muddy. **Recommendation: dark grey capsule, accent-coloured
icon.** Keeps the accent meaningful.

## 7b — Bubble mode, theme-wide

Every card and surface becomes inset, rounder and lifted rather than flat and
edge-to-edge.

**Required:**
- Larger corner radius
- Cards inset from screen edges rather than full-bleed
- Surfaces lifted: slightly lighter fill, soft shadow, more space between blocks
- Sheets, modals and the nav all follow the same language

### Implement as tokens, not per component

The existing radii are `--r1:8px --r2:12px --r3:14px`. Bubble mode roughly doubles these
and adds inset and elevation.

**Add tokens for radius, card inset, surface elevation and shadow, then change values.**
Hardcoding 24px in forty places makes this irreversible. As tokens it is one change and
can be tuned or reverted after seeing it on a device.

### Two things to weigh before committing

**This softens the brand.** The current tight radii were chosen deliberately to read
athletic and sharp, matching the horse-and-sword identity. Bubble mode moves toward
Instagram. That is a legitimate choice, but it is a choice — make it knowingly, having seen
it on the phone, not by accident.

**Inset costs horizontal space.** Margins on both sides plus larger internal padding leaves
less room for content. Exercise names already wrap to two lines. The set-logging row is
already tight. **Item 1 must be designed at the post-bubble width**, not the current width.

## Acceptance criteria

- Radius, inset, elevation and shadow are tokens, and reverting is a value change
- Every card, sheet, modal and the nav share one visual language
- The set-logging row and exercise names still work at the reduced width
- Nav still satisfies item 6
- Verified in both themes and in RTL

---

# ITEM 8 — Calendars must be identical everywhere

## Current state

There are two date surfaces and they do not match.

- **Progress** has a date bar **and** the ability to expand to a month view
- **Food** has a date bar **only** — no month view

They were built at different times, which is why they diverged. Round 1 Item 8 specified
one shared behaviour; only one of the two received it.

## Required

**One calendar component, used in both places.** Not two implementations kept in sync — a
single component with a single set of behaviours. Per the ponytail rule: one shared
function beats the same fix applied twice.

Both must have:

- A date bar showing the selected day, with previous and next controls
- **Tap the date text to expand a month view.** Not double-tap — double-tap handling is
  suppressed app-wide by Round 1 Item 6, and a feature built on it would conflict directly
- Picking a day collapses the month view and scopes that screen to the chosen day
- Markers on days that have data: a workout indicator, a food indicator
- The same visual treatment, spacing and animation in both places

## Scoping differs by screen, deliberately

This is the one legitimate difference and must be preserved:

- **Food** — a date is naturally a single day. The whole screen scopes to it.
- **Progress** — most of the screen shows trends over a **range**, driven by the
  1W/1M/3M/6M/1Y chips. The date bar scopes only **day-specific** content: that day's
  session, weight, steps. The range chips continue to drive the charts.

Do not let the two controls fight each other on Progress.

## Also verify

Round 1 Item 8 specified restoring the **day-detail sheet** — training and nutrition for a
single day, shown together — as what the expanded calendar opens. Confirm this exists and
works from both screens. If it does not, build it once and use it in both.

## Acceptance criteria

- Both date bars are visually identical
- Tapping the date expands a month view on **both** screens
- Day markers appear on both
- Picking a day scopes the screen correctly, respecting the range-chip distinction on
  Progress
- The day-detail sheet opens from both
- One component, not two
- Works in RTL, where previous and next invert

---

# Do not break

Verify after each item:

- Workout logging, sets, reps, RPE, rest timer
- The 873-exercise library, its filters and images
- Food logging, natural-language parsing, totals, date history
- Progress charts, PRs, streak, measurements
- Multiple local profiles and their data isolation
- Backup export and restore
- Arabic and RTL on every screen touched
- Offline operation and the service worker
- **`myPlan` remains a single object, never a list.** Reintroducing a list of active
  splits reintroduces the duplicate-split bug already fixed.

# Verification

There is no test suite. Verification to date is a headless Node harness stubbing
`document`, `localStorage` and `navigator`. It catches logic regressions and proves
nothing about layout, gesture or animation.

**Every item in this round is visual, gesture or audio behaviour. All of them must be
tested on a physical iPhone.** A passing headless run means values are correct, not that
the app works.

Specifically verify by hand:

- The nav does not move between an empty screen and a long one
- The pager does not stutter or flash
- The alarm is audible from a distance with the ring switch on
- The session survives a force-quit
- Bubble mode does not break the set-logging row

Bump the service worker cache version when shipping.

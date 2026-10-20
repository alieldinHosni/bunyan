# BUNYAN — Master Backlog

Single source of truth for remaining work. Supersedes ad-hoc requests.

**Always start a session with:**

```
Read .claude/PROGRESS.md, then MASTER-BACKLOG.md item [N] only.
Use ponytail at full intensity.
Do not read instructions.json, exercises.json, foods.json.
Some of this may already be done — check first, say what exists in two lines,
build only what is missing.
Show me the plan before editing. When done, update PROGRESS.md and stop.
```

One item per session. `/clear` between items. That is what keeps you inside the token
budget.

---

## Ground rules — apply to every item

- **Vanilla ES modules.** No framework, no build step, no npm, no `package.json`.
- No paid or keyed services. No animation or gesture libraries.
- Preserve user data. Stored-shape changes need a migration.
- Every new string through `t()` with an Arabic entry. Every layout verified in RTL.
- New interactive elements: real accessible names, 44×44px minimum hit area.
- `prefers-reduced-motion` and the in-app animation toggle both honoured.
- **`myPlan` is a single object, never a list.** A list reintroduces the duplicate-split
  bug.

---

## Execution order

| # | Item | Detail in | Blocked by | Status |
|---|---|---|---|---|
| 1 | Bottom nav stability | **this file** | — | DONE 24 Sep, pending device |
| 2 | Swipe-back rules | **this file** | — | DONE 24 Sep, pending device |
| 3 | Discard modal | ROUND-4 Item 3 | — | |
| 4 | Leaving a session | ROUND-4 Item 2 | item 2 here | |
| 5 | Exercise info before adding | **this file** | — | |
| 6 | Calendars identical | ROUND-4 Item 8 | — | |
| 7 | Workout screen redesign | ROUND-4 Item 1 | — | |
| 8 | Rest timer + complete state | ROUND-4-ITEM-9 | — | |
| 9 | Bubble theme + pill nav | ROUND-4 Item 7 | item 7 here | |
| 10 | Rest alarm | ROUND-4 Item 4 | item 8 here | |
| 11 | Horizontal exercise pager | ROUND-4 Item 5 | **Round 2 Phase 1**, items 2 and 7 here | |
| 12 | Cardio & sports | CARDIO-SPORTS-EXPANSION | items 1–11 | |

Items 1, 2 and 5 are new and specified in full below. The rest point at existing files.

---

# ITEM 1 — Bottom navigation still shifts

## Reproduction, exactly as reported

1. Open the app → **nav is shifted slightly upward on Home**
2. Tap any other tab → nav snaps to the correct position and stays correct
3. Tap Steps on Home, adjust, tap outside to close → **shifted again**
4. Start training → X to discard → back on Home → **shifted again**

## What the pattern tells us

The nav is correct during normal navigation and wrong in exactly three situations: **first
paint**, and **immediately after a sheet closes**. Those are the two moments when layout is
being established or restored, which narrows the cause considerably.

Two likely causes, both plausible, and both should be checked:

**a) `100vh` on iOS Safari.** `100vh` does not equal the visible viewport — it includes the
area behind the URL bar. Anything sized or anchored to it sits off by the bar's height and
moves as the bar shows and hides. **`100dvh` is the correct unit.** This would explain the
first-paint case, when the bar has not settled.

**b) Incomplete restore from the sheet body-scroll lock.** Round 2 Item 4 locks the
background by setting `position:fixed` on `body` with the stored scroll offset, and
restoring both on close. If the restore is not exact — offset not reapplied, or a property
left set — the layout ends up subtly different from before the sheet opened. This would
explain cases 3 and 4, which are both "a sheet just closed".

Both cases produce the same visible symptom, which is why it looks intermittent.

## Required

- Nav pinned to the **visual viewport**, never positioned by content flow
- **Audit every `100vh` in the codebase** and replace with `100dvh` where it refers to the
  visible area
- **Verify the body-scroll-lock restore is exact.** Scroll position and every mutated
  property returned to their prior values, with no residue
- Page content padded at the bottom by nav height plus `env(safe-area-inset-bottom)` so
  nothing hides behind it
- Confirm the keyboard behaviour from Round 1 still holds — nav hides on input focus — and
  is not a third source of movement

## Acceptance criteria

Nav occupies the **identical** screen position in all of these:

- Immediately after cold launch, on Home
- After switching tabs
- After opening and closing the Steps sheet
- After Start training → discard → back on Home
- On an empty screen and on a long scrolling one
- While the Safari URL bar shows and hides

Verify each by hand on a physical iPhone. This has been reported twice; a headless check
will not catch it.

---

# ITEM 2 — Swipe-back must follow the back arrow

## Current state

Edge swipe still navigates back from screens that should not allow it, including after
Start training and Start today's session. Round 2 Bug 5 additionally reported that the
swipe **reloads the whole app** — splash screen and all — which means it is performing a
document-level navigation rather than an in-app view change.

## The rule — simple and complete

**Swipe-back is available if and only if a back arrow is visible on that screen. It is
swiped from the edge the arrow sits on.**

That gives three consequences, all of which follow from the one rule:

1. **No back arrow → no swipe-back.** During an active session, the swipe does nothing.
2. **Arrow on the left (LTR) → swipe from the left edge.**
3. **Arrow on the right (RTL) → swipe from the right edge.**

The arrow and the gesture are the same affordance in two forms. They must be driven by the
same state, not kept in sync by hand. If the arrow is hidden, the gesture handler must be
inactive — not merely ignored.

## Also required

**Stop the document-level reload.** The splash appearing on swipe proves the app is being
reloaded to service the gesture. View changes must push **same-document** history states
via `pushState` — same path, different state. Check specifically for anything setting
`location.href` or pushing a different path.

**Pick one navigation system.** Currently both a custom swipe handler and Safari's native
edge gesture appear to be live, which is also the cause of the earlier bounce-back report.
Recommended: push same-document history and let `popstate` drive the router, with **no
custom swipe gesture at all**. Less code, native physics, and the arrow and gesture cannot
diverge because there is only one path.

**Guard the splash** regardless: it must run only on a genuine cold start. Use a session
flag so any future reload does not replay the intro.

## Interaction with item 11

Item 11 introduces horizontal swipe between exercises during a session. Under this rule
there is **no conflict** — a session has no back arrow, so it has no edge-swipe-back, and
the horizontal gesture owns the screen. This is a good outcome and is the reason the rule
is worth adopting.

## Acceptance criteria

- Swiping from the edge during an active session does nothing
- Swiping from the edge on a screen with a back arrow navigates back, in-app, **without
  the splash appearing**
- In Arabic, the arrow is on the right and the gesture works from the right edge
- The arrow and the gesture always agree, because they read the same state

---

# ITEM 5 — Preview an exercise before adding it

## Current state

Train → a day → Add exercise → search → tap a result → **it is added immediately.** There
is no way to check what an exercise actually is before committing it to a training day.

This matters because the library is 873 exercises with long, qualifier-heavy names, many of
which are near-identical. "Barbell Incline Bench Press - Medium Grip" versus "Smith Incline
Press" is not a decision anyone can make from a name alone.

## Required

Add an **info affordance** on each row in the add/replace picker — a small circular info
control, using the accent colour, at the row end.

- **Tap the row** → add the exercise, as now
- **Tap the info control** → open the exercise detail sheet, without adding

The detail sheet already exists and already carries everything needed: start and finish
photographs, primary and secondary muscles, equipment, difficulty, instructions, and
personal history. **Reuse it. Do not build a second preview surface.**

## Two details that matter

**Add directly from the preview.** Having opened the detail sheet, the user has decided.
There must be an **Add** action inside that sheet so they are not sent back to the list to
find the row again.

**Hit areas must not collide.** The info control sits inside a row that is itself tappable.
It needs its own 44×44px target and must stop the event from reaching the row — otherwise
tapping info also adds the exercise, which is the exact failure this item exists to
prevent.

## Applies everywhere the picker is used

Add exercise, and Replace exercise. Same component, both places.

## Acceptance criteria

- Every row in the picker has an info control
- Tapping it opens the detail sheet and adds nothing
- The detail sheet offers Add
- Tapping the row still adds directly
- Info target is at least 44×44px and never triggers the row
- Correct position in RTL — row end mirrors

---

# On the plugin question

You asked whether a plugin could make the app smoother, stronger on button logic, and more
stable.

**Honestly: no, and it is worth knowing why.**

The instability you are describing is not a tooling problem. It has one architectural
cause, already documented and already reported five separate times:

- Search jumping on every keystroke
- Exercise image flashing on set add or delete
- Sheet replaying its open animation on star tap
- Sheet bouncing on other state changes
- Profile screen repainting behind an open sheet

Every one is the same defect — a small state change rebuilding a whole surface that is
already on screen. No plugin fixes that. **Round 2 Phase 1 fixes that**, and until it is
genuinely done and verified on a device, new work will keep producing new instances. It
already has: during the design-token work, `paintMotion` was adding CSS classes that the
patcher stripped on every render.

**What would actually move the needle, in order:**

1. **Finish and verify Round 2 Phase 1 on your phone.** Not a headless check — watch the
   four original bugs with your own eyes. This is the single highest-value action
   available.
2. **Ponytail, already installed.** Its root-cause rule is precisely aimed at this pattern
   and it has already earned its place once.
3. **`claude-code-setup`** — `claude plugin install claude-code-setup@claude-plugins-official`.
   Anthropic's own. It analyses the codebase and recommends hooks and skills. For a
   28-module project with no tests and no CI, that is genuinely useful.
4. **Graphify**, if the token budget stays tight. It targets "which files does this touch"
   without reading every module.

**What would help more than any plugin: a test that runs on every change.** There is
currently no test suite. The headless harness exists but is run manually. A pre-commit
hook running it would catch regressions at the moment they are introduced rather than when
you notice them on your phone a week later. `claude-code-setup` can scaffold exactly that.

None of this is a substitute for device testing. Every instability you have reported is
visual, gestural or audio — categories a headless run cannot see.

---

# Standing verification requirements

After every item, confirm these still work:

Workout logging, sets, reps, RPE, rest timer · the 873-exercise library, filters and
images · food logging, natural-language parsing, totals, date history · Progress charts,
PRs, streak, measurements · multiple local profiles and their isolation · backup export
and restore · Arabic and RTL on every screen touched · offline operation and the service
worker · `myPlan` still a single object.

**Test on a physical iPhone.** The headless harness proves values are correct, not that
the app works. Bump the service worker cache version when shipping.

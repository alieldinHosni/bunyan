# Bunyan — progress, 22 September 2026

Written for a session with no memory of the one that produced it. Read
`README.md` first for how the app is built; this file is only about what is
half-finished and what to do next.

**Project root:** `C:\Users\ACER\Downloads\Bunyan`
**Service worker cache:** `bunyan-v52` — bump on every change, or phones serve the
old version.
**29 app modules** under `js/` (plus `js/vendor/zxing.min.js`, which is not
precached on purpose).

## How to run and test it

There is no test suite and no npm. Verification is done by driving the real app in
a browser.

```bash
# a static server is required — ES modules will not load over file://
# one was running on :8777 during this work
curl -s -o /dev/null -w "%{http_code}" http://localhost:8777/index.html
```

Then open `http://localhost:8777/` and exercise the modules from the console. The
regression harness used throughout is a single script that renders every tab and
every sheet in both languages and both unit systems and asserts no
`undefined`/`NaN` leaks into the markup, plus a set of invariant checks. It is not
saved to a file — rebuild it from the pattern in the git history of this note or
write a fresh one; it takes about 40 lines.

**Last full run: 184 checks, 0 failures** (22 Sep, after the Figma foundation and Home) —
34 measurements of Home against its Figma frame at 402x874; 13 behavioural checks of
Home's states; 10 contrast pairings; RTL; both themes x both languages x both unit
systems x 5 tabs, with and without a live session, both rest states, all 31 sheets, and
**no horizontal overflow on any of them**; the month grid at 375 and 402; the motion
invariants; the session header still reaching both screen edges at the new gutter; and a
reload proving no test data reached storage.

One more harness caution from this round: **`getComputedStyle().fontFamily` drops the
quotes** from single-word families, so `startsWith('"Outfit"')` is always false. Compare
`fontFamily.split(",")[0]`, or check `document.fonts`.

Four cautions for whoever writes the next harness. Every one of these produced a failure
that looked like a bug in the app and was not:

- **The language lives at `S.prefs.lang`, not `S.lang`.** Setting `S.lang` changes
  nothing. Every "both languages" sweep in this file before 20 Sep set `S.lang`, so
  **those runs were not exercising Arabic** — they rendered English twice and passed.
- **`getPropertyValue()` on a custom property returns the unresolved token string**, not
  a used value: `--navh` reads back as `calc(1px + 9px + 52px + 20px + 0px)`, never a
  number. Assert on the element the property affects, not on the property.
- **Close sheets before measuring layout.** `lockScroll` pins `body{position:fixed}`, so
  a sheet left open from an earlier cell makes the page unscrollable and every scroll
  measurement wrong. The onboarding sheet opens by itself on a profile that is not
  onboarded.
- **Compare geometry with a tolerance.** `getBoundingClientRect().bottom` comes back as
  `812.0000152587891`; `=== innerHeight` is false.

Two things the automated pane cannot do at all, both because it never paints a frame:

- **`requestAnimationFrame` never fires**, so CSS transitions and animations stay at
  their start value. Screenshots need
  `document.getAnimations().forEach(a=>a.finish())` first or they come back blank, and a
  mid-transition `getComputedStyle` reads the *from* value, not the *to*.
- **`ResizeObserver` never delivers a callback** — not even the initial one on
  `observe()`. Anything built on it is unverifiable here; see section 9.

And one the pane cannot do because it has no window focus: **`document.hasFocus()` is
false, so real `focusin`/`focusout` never fire** even though `.focus()` does move
`document.activeElement`. Dispatch the event to exercise the handler.

---

## Where things stand

### Round 1 (twelve issues) — done and verified
All twelve. See README for the ones that changed architecture.

### Round 2, Phase 1 (render architecture) — done and verified
`js/ui/patch.js` is a ~70-line DOM patcher. `render()` now **patches** a surface
that is merely changing and only **replaces** one that is genuinely appearing.
This killed three bugs at once — the exercise image no longer flashes, the search
field is never recreated, and the sheet no longer replays its open animation.

### Round 2, Phase 2 (eight bugs) — done and verified
1. Exercise search — token matching + fuzzy fallback via `js/engine/text.js`,
   sticky field, `min-height` floor on results.
2. Drag-to-dismiss — decide once, animate once. Real cause was a CSS cascade
   problem, written up in the code comments.
3. Image flash — fixed by Phase 1.
4. Leaving a session no longer ends it; computed idle pause at `IDLE_PAUSE`
   (7 min) in `js/ui/views/session.js`.
5. Swipe-back reload — custom swipe handler **deleted**, browser drives via
   `popstate`; the real culprit was a `location.reload()` in the service-worker
   `controllerchange` handler, now removed.
6. Food sheet horizontal overflow — row restructured, `overflow-x:hidden` on
   `.sheetbox`.
7. Favourite star replaying the sheet animation — fixed by Phase 1.
8. Plan builder — fabricated body defaults removed, recommendation now weighted on
   days/level/goal/equipment with equipment **measured** from each preset's own
   exercise list.

### Round 2, Phase 3 (motion + design system) — done, watched, and verified

The motion map was published as an artifact and approved:
https://claude.ai/code/artifact/fc613d62-2886-4152-b141-85f1c2f96631
(The session's watch on it has since dropped; re-read it with the Artifact tool's
`read` action if you need the full table.)

The user then asked for four specific things, all now applied:

- **Ponytail methodology** (https://github.com/DietrichGebert/ponytail) — question
  necessity, prefer standard/native, delete over add, no unrequested abstractions,
  mark deliberate corners. Applied from here on; it is why `paintMotion` shrank
  rather than grew.
- **Design and colours from Uber Base Web** — applied, then **superseded on 22 Sep** by the
  user's own Figma design (section 13). The durations and easings still stand.
- **Animation mix from Google and Uber** — applied.
- **Material Design icons** — applied to the nav, then **replaced on 22 Sep** by the
  design's own exported icons (section 13).

**Nothing from Base Web is installed.** It is a React + Styletron library and the
project forbids npm, a build step and frameworks. Only its *token values* were
taken, by reading the source directly. This was the right call and should not be
revisited without the user explicitly asking for a React rewrite.

---

## What was done in Phase 3

### Files created
| File | What it is |
|---|---|
| `js/ui/patch.js` | DOM patcher. Preserves `data-anim`, `data-count` and `style` across a patch — see `runtimeAttr()`. Without that, motion markers get stripped every render. |
| `js/ui/motion.js` | The only place durations and easings are defined. Writes them to `:root` custom properties at boot and whenever the in-app animation toggle changes. Also `countTo()`, `once()` and `leave()`. Imports `fmtN` and `num` from `util.js`, so a counted number and a static one are formatted by the same rule. |
| `js/engine/text.js` | Shared matcher — Arabic folding, Levenshtein, token matching. Food search and the exercise picker both use it so they cannot drift again. |
| `js/ui/nav.js` | Back stack. No swipe handler in it, deliberately — see the note at the foot of the file. |
| `js/ui/sheetdrag.js` | Drag-to-dismiss. |
| `js/ui/datebar.js` | The one calendar, shared by Progress and Food — the bar, the month grid, the day markers and `shiftDay()`. Added in Round 4 item 8; see section 8. |

### Single sources of truth, and why each exists
Four of them now, each created after the same kind of bug — two places deciding one
thing and drifting apart:

| Owns | Where | Created because |
|---|---|---|
| Durations and easings | `js/ui/motion.js` | ~30 timing values scattered through the stylesheet, none compared with any other. |
| Text matching | `js/engine/text.js` | Food search and the exercise picker had separate matchers that behaved differently. |
| Date bar and month grid | `js/ui/datebar.js` | Progress and Food had separate calendars that had drifted three ways at once — see section 8. |

### Values taken from source, not invented
- **Durations — Base Web** `src/themes/shared/animation.ts`:
  100/150/200/250/300/400/500 ms, mapped onto
  `--m-press/micro/pop/comp/sheet/screen/data/reveal`.
- **Easings — Material 3** `tokens/versions/v0_192/_md-sys-motion.scss`:
  `standard` `cubic-bezier(0.2,0,0,1)`, `emphasized-decelerate`
  `cubic-bezier(0.05,0.7,0.1,1)`, `emphasized-accelerate`
  `cubic-bezier(0.3,0,0.8,0.15)`.
  One deliberate exception: `--e-spring` overshoots slightly, used on exactly two
  things (a logged set, a completed meal). Neither source overshoots; this is a
  documented corner.
- **Colours — Base Web** `src/tokens/color-primitive-tokens.ts` dark ramp:
  `#000000` ground, `gray50Dark #161616`, `gray100Dark #292929`,
  `gray200Dark #383838`, `gray700Dark #ABABAB`, `gray600Dark #8C8C8C`.
- **Icons — Material Design Icons** (Apache 2.0), filled 24px, inlined as five path
  strings in `TABSET()` in `js/ui/render.js`. No dependency, nothing downloaded.

### The accent is deliberately still Bunyan crimson
`--accent:#C41E2A`. The user asked for "colours from Uber", and the greyscale ramp
now is Uber's — but replacing the crimson would discard the horse-and-sword identity
they directed earlier in the project. The four accent lines in `:root` carry a
comment saying exactly how to flip the whole app to Base Web brand blue
(`#276EF1 / #5B91F5 / #0B1B3D`) if that is what was meant. **Ask before doing it.**

### Verified at the time Phase 3 landed
- App boots, no console errors from app modules. (The handful of
  "error fetching the script" lines in the automated pane are the service worker
  failing to register there, not app code — `getRegistration()` returns null.)
- Tokens live and overriding the CSS fallbacks: `--m-press:100ms`, `--m-comp:250ms`,
  `--m-data:400ms`, `--e-decel:cubic-bezier(0.05, 0.7, 0.1, 1)`.
- Colours live: `--bg:#000000`, `--surface:#161616`, `--border:#383838`.
- Five Material icon paths render in the nav.
- Motion markers survive a re-render (`data-anim` unchanged, same DOM node).

For the current regression figure see the top of this file. An older
"153 checks / 29 sheets" line used to sit here and was deleted on 20 Sep: two
competing numbers in one document is the same drift this project keeps finding in
its code, and there is no reason to reproduce it in the notes.

---

## Checklist — sections 1-12 closed; 13 (the Figma design) in progress

### 1. ~~Light theme~~ — DONE
Migrated to the Base Web light ramp. Two things came out of it worth keeping:
- `--glow` is now a token. The page wash was a hardcoded maroon radial gradient that
  turned the white theme muddy; it is `transparent` in light.
- `--dim`/`--faint` in light are gray700/gray600, **not** the gray600/gray400 that
  would mirror the dark theme. The light ramp is not symmetric in contrast: gray400
  on gray100 measures 1.99:1. Both themes now pass AA everywhere, measured.

### 2. ~~Motion map rows~~ — DONE
The CSS keyframes live near the foot of the `<style>` block in `index.html`
(`rowIn`, `rowOut`, `restIn`, `boxIn`, `softIn`, `drawOn`, `barGrow`, `settle`,
`toastIn/Out`) and are keyed off `[data-anim]`. All map rows are now wired:

- **Count-up** — six numbers opt in via `data-count-to`, which `paintMotion()` in
  `js/ui/render.js` looks for: the Food tab calories (already there), the Home
  ring centre (`ring()` in `js/ui/view.js`), and the four workout-summary figures
  (`js/ui/sheets.js`, the `done` sheet). The volume figure keeps its unit in a
  sibling `<span class="unit">`, because counting writes `textContent` and would
  otherwise eat it. Every one of them carries the final value as its text too, so
  reduced motion and a re-render land correctly without animating.
  `countTo()`'s default format now uses `toLocaleString()` — a five-digit volume
  that gained its commas only on the last frame read as a glitch.
- **Exit animations** — `leave(el,done)` in `js/ui/motion.js` plays the row out
  *before* the state change that removes it, because splicing first leaves nothing
  to animate. Two call sites: `ACT.delset` (`js/ui/actions.js`) and `D.dropitem`
  (`js/app.js`); the food item cards gained `data-k="fi:N"` in `js/ui/sheets.js`
  so they can be found. It calls straight through under reduced motion and has a
  `DUR.comp+60` timeout, because `animationend` never arrives for a hidden or
  cancelled animation and a row that never disappears is worse than one that
  vanishes.
- **Toast exit** — `toast()` in `js/ui/view.js` adds `.leaving` and removes the
  node 260ms later. The keyframes had been written for this and nothing was adding
  the class, so toasts blinked out of existence.
- **Segmented-control indicator slide** — specified in the map, **not built, and
  should not be.** There is no segmented control in the app. Building one to
  satisfy a row of the map would be adding a component nobody asked for.

### 2b. Accent refined, measured
`--accentHi` dark went `#E02534` → Base Web red500 `#F83446`. The old value
measured **4.48:1** on black, just under AA for small text, and it is used as text
in twelve places (only ever a fill on one 7px unlabelled dot, so the swap is safe).
Now 5.57 on `--bg` and 4.80 on `--surface`.

`--accent` was **kept** at `#C41E2A` (5.89 with its white label) and light
`--accent` kept at `#A5171F` (7.66 on white — better than any value in the Base
Web ramp). That is the "if you can't refine it, keep it" branch, taken on measured
grounds.

### 3. ~~Nothing about Phase 3 has been checked visually~~ — DONE, 20 Sep

It has now been watched, and watching found two animations that were not running at
all. Both had passed every DOM-state and computed-style check, which is exactly why
this step existed.

**How it was watched, since the obvious route does not work.** `requestAnimationFrame`
is starved in the automated browser pane, so nothing animates in real time and
`countTo` never advances. But *screenshots force a paint*, and the Web Animations API
can scrub a paused animation to an exact time. So: trigger the interaction,
`document.getAnimations().forEach(a=>a.pause())`, set `a.currentTime` to a chosen
point, screenshot. That yields real frames at chosen instants, plus exact computed
values per frame. Rebuild the two helpers from this note if needed:

```js
window.__scrub=(pct)=>{const a=document.getAnimations();a.forEach(x=>{
  const d=x.effect.getTiming().duration||0; x.pause(); x.currentTime=d*pct;}); return a.length;};
```

The check that matters is **not** "is the class applied" but
`el.getAnimations().map(x=>x.animationName+":"+x.playState)`. Both bugs below showed a
correct class and no running animation, or the wrong one running.

#### Bug A — the page transition almost never played
`#app` itself is never replaced (only its children are), so
`classList.toggle("pagein",moved)` left the class **on** across consecutive tab
changes. CSS restarts an animation only when the class changes, so tapping straight
across the tab bar played no transition at all. Measured: four consecutive taps,
**zero** `pageIn` animations. It only reappeared when some same-tab render happened to
clear the class first, which made it intermittent — worse than always or never.
Fixed in `js/ui/render.js` by removing the class, forcing a reflow
(`void appEl.offsetWidth`) and re-adding it. Now fires on every tab change, verified.

#### Bug B — a deleted row played its *entrance* while leaving
`.rowout` is one class, specificity (0,1,0). The entry rule `.setrow[data-anim]` is a
class plus an attribute, (0,2,0). The entry rule won, so a row being deleted ran
`rowIn` and then vanished when `leave()`'s timeout fired. The toast pair never had
this problem because `.toast.leaving` ties with `.toast` and wins on source order —
which is what gave the cause away. Fixed in `index.html` with
`.setrow[data-anim]:not(.rowout)` — excluding the conflict rather than piling on
weight to outrank it. Now runs `rowOut`, verified by frame.

This is the same class of defect as Round 2 Bug 2 (`.settling` lacking
`animation:none`). **Three CSS-cascade motion bugs in this project so far.** When
adding any new animation here, check `getAnimations()`, not the class list.

#### What was watched and reads correctly
- **Sheet rise** — `sheetIn` fires on every open including sheet-to-sheet, and
  correctly does *not* replay on a re-render while open (the Phase 1 invariant, still
  holding). Scrubbed at 0 / 35% / 100%: rise, scrim, settle all read as intended.
- **Page transition**, once it fires. The initial screenshot at t=0 shows a blank
  screen, which looked alarming; measuring the curve showed it is blank only for the
  first ~15-30ms, one or two frames. Perceptually a ~120ms fade (50% at 60ms, 80% at
  120ms) with a lazy tail to 300ms. No visible flash. Not a problem.
- **Toast** in and out, both running, correct classes and order.
- **Reduced motion** — verified by computed `animationName`, not by reasoning:
  page, row entry and row exit all resolve to `none`, and `leave()` removes the set
  synchronously. The `:root.reduced` rules still outrank the new `:not()` selector.

#### Observations from watching — all three now fixed
These were seen while watching and recorded rather than acted on at the time. All
three were fixed afterwards, on request:
1. ~~**Same number, two formats, one screen.**~~ **FIXED, 20 Sep — see section 5.**
2. ~~**The `done` sheet's DURATION figure is accent red.**~~ **FIXED, 20 Sep —
   section 6.**
3. ~~**Row exit does not collapse height.**~~ **FIXED, 20 Sep — section 6.**

### 4. Unverified on a physical device — unchanged, and now larger
Still true of every round: the service worker, offline, gestures, and now every
animation and the entire new colour scheme have never run on an iPhone. Bugs 1, 2,
3, 5, 6, 7 and all of Phase 3 are touch and rendering behaviour.

---

### 5. Number formatting — DONE, 20 Sep

The Progress tile was the visible symptom, not the problem. Scanning every tab and
sheet for a bare run of 4+ digits found the drift was app-wide:

- Progress showed `5724` and `5,724` (two different metrics that happen to coincide,
  but the *same kind of quantity* formatted two ways).
- The Food tab showed a day's intake as **`2,450 / 1950`** — the two halves of one
  ratio, on one line. The left half is counted by `countTo`, which grouped; the right
  half was interpolated raw. That half of the defect was introduced on 13 Sep when
  `countTo` was given a `toLocaleString` default.
- `1950` also appeared bare on Profile and inside the `done` sheet.

Four call sites used `toLocaleString()`, every other one interpolated the raw value,
and `countTo` had a third private rule. **`fmtN()` in `js/util.js` is now the only
place that decides grouping**, and `countTo` delegates to it, so an animated number and
a static one cannot disagree. `js/ui/motion.js` lost its private copy of `num()` in the
process and now imports both from util.

Applied at the display sites for volume and calories in `progress.js`, `food.js`,
`profile.js`, `sheets.js` and `view.js` (the ring).

**The trap, if you extend this.** `data-count-to` must stay **raw**:
`countTo` reads it with `parseFloat`, and `parseFloat("2,450")` is `2`. The pattern is
a raw attribute and grouped text:

```js
'<span data-count-to="'+v+'">'+fmtN(v)+'</span>'
```

Verified: every `data-count-to` in the app parses to a finite number, the `g_kcal`
`<input type="number">` still holds `2400` and not `2,400` (it is parsed back on save),
no year was grouped, and a full sweep of both themes x both languages x both unit
systems x 5 tabs x 31 sheets finds **zero** remaining bare 4-digit numbers.

Grouping follows the *browser* locale, not the app's language toggle — same as the
four `toLocaleString()` calls this replaced. Left as is: changing it needs a decision
about which locale Arabic mode should format to.

### 6. The other two observations — DONE, 20 Sep

**The `done` sheet's four summary figures are now identical.** DURATION was `.metric`
with an inline `font-size:30px`, making it accent red and larger than its three
neighbours. It is now `.stat` like the others. Verified: one class, one font-size
(28px), one colour, across all four. Nothing on that grid ranks above the rest, so
nothing on it is styled above the rest.

**Row exits now collapse their height**, so the rows below slide up instead of
snapping. This is split between `leave()` in `js/ui/motion.js` and the `rowOut`
keyframe in `index.html`, because it has to be:

- `leave()` freezes the element's measured height in px before adding the class. An
  `auto` height cannot be animated at all. The usual `max-height` workaround was
  rejected: it clips a tall row or wastes the first part of the duration crossing
  empty space on a short one, and the two call sites differ hugely — a set row is
  58px, a food card 381px.
- `leave()` also clears that inline height before calling `done()`. The patcher
  preserves `style` as a runtime attribute and matches nodes by key, so a reused row
  would otherwise inherit the pixel height of the row that just left. Verified: the
  reused `set:1` node comes back with no inline height and its normal 58px.
- The keyframe zeroes `height`, both margins, both paddings and both vertical border
  widths, with `overflow:hidden`. Missing any one of them floors the row at its own
  box. Verified on the food card too, whose padding and border differ.

**Two things measurement corrected here, both worth knowing:**

1. **A property listed only in the `100%` block interpolates across the WHOLE
   animation**, from its implicit start value. The `45%` stop does not hold the height.
   The first version of this was written believing the opposite, and the two-stage
   "fade then collapse" it was meant to produce did not exist. The `45%` stop is still
   there and still earns its place, but for opacity only: it makes the row fully
   invisible while the gap is still closing, so you see space closing rather than a
   ghost being squashed.
2. **The easing is `--e-standard`, not the `--e-accel` you would expect for something
   leaving.** Accelerate is right for the fade and wrong for the collapse. Measured, in
   px the row below travels of 65 total, sampled at 45/60/75/90/100%:

   | easing | 45% | 60% | 75% | 90% | 100% |
   |---|---|---|---|---|---|
   | `--e-accel` | 8 | 15 | 26 | 44 | 65 |
   | `--e-standard` | 55 | 60 | 63 | 63 | 65 |

   Accelerate left the empty space sitting open and then slammed it shut over the last
   third — the snap this was meant to remove, just moved later. Standard front-loads
   the travel and settles into place.

Reduced motion is unaffected: `leave()` still returns early, so no height is frozen,
no class is added, and the removal is immediate. Verified.

### 7. ~~The CSS motion tokens are a second, stale source of truth~~ — FIXED, 20 Sep

The nine drifted values in the `:root` block of `index.html` were copied across so the
fallbacks are byte-identical to `DUR` and `EASE` in `js/ui/motion.js`, and the comment
that claimed they already matched was rewritten to say what they are for, what happened,
and what to do when a value changes.

Verified by reading the `:root` rule's own declarations out of the stylesheet and
comparing each against the inline property `motion.js` writes to `documentElement`:
**all thirteen agree, zero mismatches.** The computed values are unchanged, as expected —
the inline properties were already winning, which is why nothing looked wrong.

### 8. Round 4 item 8 — one calendar everywhere — DONE, 20 Sep

**Only item 8 of BUGFIX-ROUND-4 was in scope.** Items 1-7 are untouched: no bubble
theme, no pager, no nav change, no rest-timer alarm.

**What already existed.** Progress had the whole feature — date bar with
previous/next/back-to-today, tap-the-date month expansion, workout markers and food
markers, and the `dayview` day-detail sheet reachable from its "THAT DAY" card. Food had
a cut-down bar and nothing else.

**What the duplication had already cost.** Three separate defects, none of which needed
finding twice:

1. **Progress skipped a day.** Its day arithmetic did `toISOString()` on a local-midnight
   Date without the timezone correction Food had. Reproduced on this machine
   (Africa/Cairo, UTC+3): "previous day" from 20 Sep landed on **18 Sep**. Anywhere east
   of Greenwich, one tap moved two days.
2. **Food was not bilingual.** `"Today, "` and `"Back to today"` were string literals
   that never went through `t()`, so they stayed English in Arabic.
3. **Only Progress could open a month at all.**

**What was built.** `js/ui/datebar.js` — `dateBar({date, open, monthOffset})` plus
`shiftDay(iso, delta)`. Both screens now call it and render **byte-identical markup**,
verified by string comparison of the two `outerHTML`s with only the selected date
normalised. The month grid, day markers and arrow glyphs moved out of `progress.js`
inline styles into `.dbwrap/.dbcal/.dbgrid/.dbday/.dbdot` in `index.html`, so the two
screens match by construction rather than by somebody remembering.

**Five handlers became one.** `D.fday`, `D.pday`, `D.pcal`, `D.pick` and `D.cal` are
deleted; `D.dday`, `D.dopen`, `D.dmonth` and `D.dpick` replace them and branch only on
which day a screen owns. `V.pdate`, `V.pcal` and the new `V.fcal` are now declared in the
`V` literal in `view.js` rather than created on first use.

**The scoping difference is preserved deliberately**, as the brief requires: Food scopes
its whole screen to the chosen day; on Progress the bar scopes only the "THAT DAY" card
while the 1W/1M/3M/6M/1Y chips keep driving every chart. Verified both directions —
changing the day leaves the chart paths byte-identical, changing the range leaves the
selected day alone.

**Hit areas had to be fixed to ship this.** The month grid's day cells measured
41.1x41.1px at 375px, under the 44px minimum in the ground rules. Inside the card's
padding even a 1px gap only reaches 44.5px, so the gap would have been spent for nothing;
full-bleeding the grid with `margin-inline:calc(-1 * var(--s3))` gives **44.5px at the
original 5px gap**. The bar's arrows were 34px wide and are now `min-width:44px`, scoped
to the bar so the shared `.iconbtn` elsewhere is untouched. All measured, not estimated.

**RTL.** The `‹ ›` glyphs are swapped when `dir="rtl"`, in one place, for the bar and the
month nav. The row order reverses on its own; the glyphs do not.

**Day-detail sheet.** `dayview` already existed and `data-openday` was already global, so
nothing was rebuilt. Progress keeps its "THAT DAY" summary card; Food gets an equivalent
compact row placed *outside* the bar, so the two bars stay identical as the acceptance
criteria require.

**No migration needed.** Every value touched (`V.pdate`, `V.fdate`, `V.pcal`, `V.fcal`,
`V.cal`) is view state, not stored shape. Nothing persisted changed.

### 9. Round 4 item 6 — nav fixed to the viewport — DONE, 20 Sep

**The brief's diagnosis does not apply to this codebase.** It says the nav is "positioned
by the content flow" and that the cause "is almost certainly `100vh`". Neither is true:
the nav was already `position:fixed; bottom:0; left:0; right:0` with
`env(safe-area-inset-bottom)` in its own padding, and **`100vh` does not appear anywhere
in the project** — there is no viewport-height unit in the stylesheet at all. Nothing was
positioning the nav by content.

Measured before changing anything: no ancestor of the nav establishes a containing block
for fixed positioning (no `transform`, `filter`, `will-change`, `contain` on the chain),
and the nav's rectangle is byte-identical on a short screen, a long screen, mid-scroll,
at full scroll, with a sheet open and with the keyboard class applied.

**What was actually wrong: a magic number.** `body` reserved a hardcoded
`calc(92px + env(safe-area-inset-bottom))` while the nav measured **81.6px**. Two
unrelated numbers that had to be kept in step by hand, and the kind that fails silently —
change the nav's padding or its label size and the last card slides underneath with
nothing to catch it.

`--navh` is now derived in `:root` from the same three values the nav lays itself out
with, plus its 1px top border:

```css
--nav-pad-t:9px; --nav-pad-b:20px; --nav-btn:52px;
--navh:calc(1px + var(--nav-pad-t) + var(--nav-btn) + var(--nav-pad-b) + env(safe-area-inset-bottom));
```

`nav` and `nav button` consume those tokens, and `body` reserves `calc(var(--navh) + 12px)`.
Verified by changing each of the three tokens in turn and confirming the nav's height and
the reserve move together every time. `env()` sits inside the calc, so a home indicator
widens both at once rather than double-counting.

**A ResizeObserver was written first, and deleted.** Measuring the real element is the
more obviously correct approach, and it is what this started as. It was removed because
**ResizeObserver delivers its callbacks at the end of a frame and the automated pane has
no frames** — a probe showed not one callback ever arrived, not even the initial one that
fires on `observe()`. The mechanism could not be verified at all, and a boot-time
measurement with a dead observer behind it is worse than no observer: it had already
latched a stale 83px against a real 81.6px nav and never corrected. An exact derivation
that can be checked beats a measurement that cannot.

**Also verified**, since the brief asks for it: the keyboard hide still works and is not a
second source of movement. `focusin` adds `body.kb`, the nav translates fully off screen,
`pointer-events` goes to `none`, `focusout` restores it — and **the reserve does not
change during the cycle**, so the page does not reflow when the keyboard appears.

**What cannot be verified here, and is the one thing left for the device.** The reported
symptom — "on pages with little content the nav shifts slightly upward" — cannot be
reproduced in any desktop-class browser, because `position:fixed; bottom:0` does not
depend on content length. On iOS Safari it can happen for a different reason than the
brief gives: a short page never lets the URL bar collapse, so the layout viewport differs
from the long-page case and the nav lands at a different physical position. **No CSS fixes
that**, `dvh` included — `dvh` is for elements sized by viewport height, and nothing here
is. The real remedy is pinning to `window.visualViewport`, which was deliberately not
built: it would be a second writer of `transform` on the nav and would fight
`body.kb nav{transform:translateY(120%)}`, breaking the keyboard hide that currently
works. Check on the phone first; if it still drifts, that conflict is the thing to design
around, not an oversight to patch.

### 10. Round 4 item 3 — discard confirmation modal — DONE, 20 Sep

**Most of it already existed.** The confirmation was already a bottom sheet using the
same `.sheet` / `.sheetbox` / `.sheethead` shell as every other sheet, already
`role="dialog" aria-modal="true"`, and a `hard` flag already withheld `data-close` from
the overlay so an outside tap could not dismiss it. Discard was already accent-filled
against a grey Cancel. Two things were genuinely wrong.

#### a) The close button was inset 48.8px instead of 16px — on every sheet

The brief describes it as "visibly offset toward the centre", and it was, by 32.8px. The
cause was not in the button, which is correctly 16px from its own container's edge. It
was `.sheetbox *{max-width:100%}`.

`.sheethead` is the one child deliberately wider than the sheet's content box: it pulls
out with `margin:-20px -16px 8px` so its underline spans edge to edge. `max-width:100%`
resolves against the containing block's *content* width and capped the head there, so the
negative margins could not widen it — the head came out 33.6px narrow and took the close
button inward with it. Setting the margin inline changed nothing, which is what proved
`width` was being clamped rather than the margin failing.

That overflow guard is load-bearing — it is what fixed the Round 2 Bug 6 food-sheet
overflow — so it stays, with one exemption: `.sheetbox .sheethead{max-width:none}`.

**This was never specific to the discard modal.** Every sheet in the app had it. Measured
after the fix across all 31 sheets in both languages: the close button now sits **16-17px
from the trailing edge in LTR and the leading edge in RTL**, and no sheet or head
overflows horizontally.

RTL needed no new code. `justify-content:flex-end` is already direction-relative and
`.favstar` already uses `margin-inline-end`, so the button mirrors to the opposite corner
on its own — verified by measurement and by screenshot in both directions.

#### b) A destructive confirm blocked the outside tap and then let itself be dragged away

`initSheetDrag` keyed off `.sheethead`, which a hard confirm still has — only the `.grab`
handle is omitted. So the sheet refused an outside tap and then accepted being flung off
the screen by its header, which is the same ambiguous dismissal by a different route.

The guard is now `if(!head.querySelector(".grab"))return;` — **no handle, no drag.** The
handle is the only thing that advertises the gesture, so keying the behaviour to it means
the affordance and the behaviour cannot disagree: draw it and the sheet drags, leave it
out and it does not. No new attribute, no new flag.

Verified both ways: a hard confirm's transform stays `none` through a 200px drag and the
sheet stays open, while a normal sheet still follows the finger (290.9px) and still
dismisses on the fling — Round 2 Bug 2 intact.

#### Also
One dead rule deleted: `.sheethead{justify-content:flex-end}` appeared twice, identical,
about 160 lines apart.

Escape still closes a hard confirm, deliberately. The rule is that *ambiguous* dismissal
is unsafe; Escape, the ✕ and Cancel are all explicit.

### 11. Round 4 item 2 — leaving a session — DONE, 20 Sep

**The trap the brief describes was already gone.** It says the back arrow does nothing,
swipe-back glitches, and the only exit is Discard. Round 2 fixed all three: the arrow
works, `nav.js` routes the arrow, Safari's edge swipe and the OS gesture through one
`doBack()`, and leaving stopped ending sessions. What was missing was the prompt itself —
`navGuard()` returned `false`, so nothing asked, and the scaffolding for asking was
already there and unused. `nav.js` still carried the comment "An active workout is the
one thing that asks before it is left behind."

#### What was built
The guard now opens a three-option sheet, using the existing `confirm` sheet extended
with one optional action (`alt`/`altact`) rendered between the primary and Cancel:

> **Leave workout?** Your completed sets are saved. You can resume this workout later.
> **Keep workout and exit** (accent fill) · **Discard workout** (outlined) · **Cancel** (grey)

Discard needed a style that is neither the primary nor grey, so `.btn.danger` is outlined
in `--accentHi` — 5.57 on the dark ground, 5.89 on the light, both AA for text. A filled
accent would have made keeping and discarding look identical.

The guard protocol was already in `nav.js`: return `true` to cancel the back and take
responsibility, and call the `resume` you were handed once the user chooses. Both the
arrow and popstate go through it, so the two exits cannot diverge.

#### Two bugs found while wiring it up

**a) The guard fired everywhere, not just in the workout.** `if(!S.active)return false`
was not enough: with a session alive, a back gesture on Food or Progress would have
stopped to ask about a workout the user was not looking at. The condition is
`!S.active || V.tab!=="train"`, because `vTrain()` returns `vLogger()` for as long as a
session is live — the Train tab *is* the workout.

**b) "Keep workout and exit" did not exit.** It closed the sheet and stayed put. Same
cause: the gesture's own destination is a Train route, and a Train route with a live
session renders the logger, so honouring it put the user straight back where they were.
Both outcomes now land on Home, decided in one place for the arrow and the swipe alike —
which is also where the Resume card lives, so leaving and returning are adjacent.

#### A third bug, found while verifying the timer
**The "Paused" label was showing whenever a session was open, running or not.**
`.ss-paused{display:block}` outranks the UA stylesheet's `[hidden]{display:none}`, so the
attribute was being set correctly every render and ignored — a clock ticking upward with
the word PAUSED under it. There was no global `[hidden]` guard in the project; there is
now, once, rather than per component. Verified in all three states: hidden while
training, visible past the threshold, hidden again when a set lands.

#### Verified against the acceptance criteria
- Arrow and edge swipe both open the sheet — same guard, same function.
- Keep-and-exit: session, sets and position all intact, and it leaves.
- Cancel: session, sets, position and screen all unchanged.
- Discard: session ended, lands on Home.
- **Survives a real page reload** — the page was actually reloaded mid-session and the
  same session id, the same per-exercise set counts, `idx`, `activeMs` and day name all
  came back, with Resume returning to exercise 5 of 7.
- Timer: runs while training, auto-pauses past `IDLE_PAUSE` (7 min, one named constant),
  caps the paused clock at the threshold rather than the whole absence, tracks wall time
  separately.
- Home reads "Workout in progress / Day A — Anterior · Exercise 3 of 7 / Resume workout",
  and Resume returns to that exact exercise.
- Both languages, RTL, 44px hit areas on all three options, no overflow.

#### Not done, and why
The gesture separation in the brief's "read alongside item 5" section is moot until item
5 exists: there is no horizontal pager to collide with, and `nav.js` deliberately has no
swipe handler of its own — Safari's native edge swipe fires `popstate`, which is already
routed through the same guard.

### 12. Round 4 item 4 — rest timer alarm — DONE, 21 Sep

The brief is explicit that part of this request is impossible on iOS and must not be
faked. Nothing was built that pretends otherwise: **no vibration toggle, no "play when
locked", no "maximum volume"** — verified by asserting the settings sheet contains no
such control and that every toggle in it names a real key in `S.prefs`.

#### What the alert is now
`alarmStart()` in `js/ui/view.js` schedules **eight one-second cycles of a two-tone
square-wave pattern — 880 Hz then 1175 Hz** — running from t=0 to t=7.39s inside an
8-second window. The timer previously played `SOUNDS.rest`: two sine beeps totalling
0.33 seconds, which is inaudible at three metres over gym music. Measured by spying on
`createOscillator` and `frequency.setValueAtTime`: 16 oscillators, two distinct
frequencies, one-second cadence.

Every oscillator is scheduled up front against the audio clock rather than by
`setTimeout`, so a throttled tab still plays the pattern correctly. The nodes are kept so
the alarm can be cut short the instant the user acts, which is the normal case.

#### The zero state carries the alert on its own
The rest surface used to **vanish** at zero — there was no zero state at all. `V.restDone`
is a third rest state (counting / paused / finished-and-unacknowledged), and in it the
screen becomes **full-bleed accent** with a `clamp(40px,13vw,64px)` "Rest over", the ring
gone, the up-next card kept, and one inverted control. `role="alertdialog"` and
`aria-live="assertive"`. This is what the brief asks for: with sound fully off, the screen
is unmistakable. Measured background `rgb(196,30,42)`, headline 48.8px.

#### One function ends the rest, because ten places end it
Logging a set, skipping, jumping exercise, finishing, discarding, leaving — each cleared
`restEnd` and `restPaused` by hand. Adding a third state *and* an alarm that must be
silenced would have meant getting ten sites right and keeping them right. `endRest()` in
`view.js` does all of it; the specific failure it prevents is an alarm outliving the
screen that raised it.

#### Audio unlock (b) already worked
`startRest()` calls `audioOn()` before its `autorest` early-return, and it runs from the
log-set handler, which is a real user gesture — so the context is unlocked on the first
set logged, not when the timer fires. The first rest of a session is not silent. No
change needed; verified rather than assumed.

#### Wake lock (c)
Already held for the whole session via `keepAwake(true)` in `startDay`, re-acquired on
`visibilitychange`. Rest is inside the session, so it is covered.

#### Test Sound and the explanation (e)
Test Sound now plays **the actual alarm** rather than the PR fanfare — a test that plays a
different sound from the real one tests nothing the user cares about. With Sounds off it
says so instead of doing nothing. Beneath it, in both languages:

> On iPhone the side switch silences this alarm, and it cannot play while the app is in
> the background or the phone is locked. The screen turns red when the rest is over, so
> you can see it with the sound off.

It lives in **set_training**, with the other session settings, not set_app.

#### A cascade bug, the third of this shape
`.restdone-go` (one class) lost to `.rbtn.main` (two), so the ready button kept its accent
fill and rendered **invisible on the accent ground** — it looked like bare text. Caught by
screenshot, not by assertion. Fixed by scoping to `.restwrap.done .restdone-go`.

#### Sound choice (f)
One alarm is offered, not a picker. The brief says "if more than one is offered"; adding
a chooser nobody asked for is exactly the unrequested abstraction the ground rules forbid.

#### Worth knowing
The **Haptic feedback** setting does nothing on iOS — Safari has no vibration API — while
working normally on Android. It predates this item and removing it would degrade Android,
so it stays, but it is the one setting in the app that is inert on one platform.

### 13. The original Bunyan design, from Figma — all frames but Progress built, 29 Sep

The user's own design is in Figma and is now the source of truth for how the app looks.
It supersedes the Base Web greys adopted in Phase 3, which were a stand-in chosen while
the original was not reachable.

#### Access
- **`q6AJ6YJmBYfU35RktEfQOg` — readable.** Shared with the connected account on 22 Sep.
- **`7PpQqtZalbwsu9sJA3Hp9I` — still refused** on every tool, including screenshots. The
  user asked specifically for its node `11:13`, and **that frame has never been seen.**
  Connected Figma account: the owner's Figma account email, Starter plan, View seat. The fix is
  on the user's side — share that file too, "can edit".
- The separate `plugin:figma` MCP server is not authorised; `/mcp` in an interactive
  `claude` terminal. The claude.ai Figma connector works and is what was used.

#### What is in the readable file — 26 screens, 402x874 (iPhone 16 Pro)
| group | frames (node id) |
|---|---|
| core app | splash `2:11`, **home `2:35` (DONE)**, train-hub `2:120`, active-workout `2:191`, rest-timer `2:276`, exercise-detail `2:309`, nutrition `2:383`, progress `2:484` |
| workout canvas `2:809` | 1 train-hub `2:810`, 2 workout-overview `2:915`, 3 active-exercise `2:1008`, 4 set-logging-focus `2:1060`, 5 set-completion `2:1149`, 6 exercise-detail `2:1182`, 7 exercise-replacement `2:1244`, 8 workout-complete `2:1311`, 9 exercise-library `2:1360` |
| food | dashboard `13:12`, meal-detail `13:118`, add-food-search `13:188`, food-detail-quantity `13:266`, natural-language-input `13:337`, unknown-food `13:403`, custom-food `13:464`, nutrition-goals `13:531`, states-reference `13:599` |

To list them again without hitting the output limit, run `get_metadata` on page `0:1`
and grep the saved file for frames at least 300 wide and 600 tall.

**The file has no Figma variables** — `get_variable_defs` returns `{}` — so every token
below is a literal value read out of the frames.

#### Foundation — applies to every screen
- **Palette**, into the existing tokens so every screen picked it up at once: ground
  `#0b0b0c`, cards `#141418` (`--raised`), inner elements `#1c1c22` (`--surface`), border
  `#25252c`, text `#faf6ee`, a new `--sub` `#d5d1c9` for secondary body text,
  `--dim`/`--faint` `#888580`, accent `#e31b23`. The ember wash is off; the design is flat.
  The light theme got a `--sub` too, or it would have inherited pale text on white.
- **Type:** Outfit (titles, display numbers) and Manrope (everything else), **self-hosted**
  in `fonts/` under the SIL OFL, licences alongside. Manrope is one variable file for
  400-700. Outfit is loaded at **700 only** — the only weight any frame uses — so nothing
  may ask Outfit for more than 700. Titles are title case now; the design never uppercases
  a title. RTL keeps its own system Arabic stack, since neither face has Arabic glyphs.
- **Buttons:** 48px, radius 8, Outfit Bold 15 caps, optional 16px icon. The 48px floor is
  `.btn:not(.sm):not(.d)` — see the cascade note below for why it is not an override.
- **Cards:** radius 14, padding 20.
- **Nav:** `#141418` bar with a hairline top, 72px, five fixed 64px tabs, 22px icons,
  10px title-case labels (Medium, Bold when active), active icon red, no underline.
- **Gutter:** 24px, as a `--gutter` token, because the session header bleeds to the screen
  edge by exactly this amount and had its own hardcoded `-16px`.
- **Icons are Figma's own exported vectors** in `icons/`, never redrawn. They carry their
  colour baked in, so they are applied as CSS masks (`.navico`, `.ico`) and tinted by
  `background` — the artwork is untouched and the active state can still go red.

#### Home — built to frame `2:35`
Greeting (time of day + the profile's own name, avatar initial), Today's Session (badge,
estimated minutes, sharp divider, Start Training with the play icon), Daily Nutrition
(calories and protein against goal, 72px ring), Weekly Discipline (this week's seven days).
**Verified by 34 measurements against the frame** — every colour, size, radius, padding,
gap and font — plus a side-by-side screenshot at 402x874.

Bound to real data, never the frame's placeholders ("Khalid", 2,450 kcal, 5/7). The week is
Sunday-first: the frame is a Thursday with five lit dots, which only a Sunday-first week
produces, so that order is the design's rather than a choice.

The ring is **drawn live** with the geometry of the design's own track asset (r=33,
6px stroke). The exported fill asset is a fixed 87% arc and cannot show a real value.

#### Deliberate departures from the frame — each one is a decision, not an oversight
1. **Small red text uses `#F83446`, not the design's `#e31b23`.** Measured: `#e31b23` is
   3.61:1 on the badge fill and 3.89:1 on a card, under AA; `#F83446` is 4.52 and 4.87.
   `#e31b23` is still used everywhere it is a fill.
2. **The primary button keeps the design's exact red, and misses AA by a hair:** off-white
   on `#e31b23` is **4.38:1**, needing 4.5 at 15px. Left at the brand colour because the
   standing rule is to ask before changing `--accent`. **`#dc1a22` measures 4.60** and is
   indistinguishable at a glance — a one-value change if the user agrees.
3. **A Steps card sits under the design's three cards.** Home was the only place in the
   app that opened the steps sheet; matching the frame by deleting it would have removed a
   feature. Water and weight did move off Home, because Food and Progress already carry them.
4. **The in-progress workout** reuses the Today's Session card (badge, position, Resume)
   since the frame only shows the ready state. It keeps the accent border.
5. **The Daily Nutrition card taps through to Food.** It replaces the removed "Add food"
   quick action rather than adding new behaviour.

#### A regression the gutter change caused, caught and fixed
The wider gutter narrowed every card, and the month-grid day cells fell to **42.2px** at
375, under the 44px minimum that Round 4 item 8 had just established. The gap is now
`max(0px, min(5px, calc((100% - 7 * 44px) / 6)))` — the design's 5px where there is room,
never so wide a day drops under 44. It encodes the rule, not a breakpoint, so the next
gutter change cannot break it silently. Measured: 44.0px at 375, 5px gap at 402.

#### A cascade trap avoided
Giving `.btn.sm` and `.btn.d` `min-height:0` to exempt them from the 48px floor would
have outranked `.iconbtn`'s own 44px minimum — two classes beat one — and shrunk the
date-bar arrows. The floor is scoped with `:not()` instead. Fourth cascade issue of this
exact shape in this project.

#### Decisions the user needs to make before the rest can be built faithfully
- **"PREMIUM" programs with photography** (train-hub: "SABRE Hypertrophy", "DESERT
  Endurance"). Bunyan is free by standing instruction, and no such programs or images
  exist in the app. Build them as free programs, keep the look without the badge, or drop?
- **Progress photos** (Progress frame) — no such feature exists. Build it, or omit?
- **Two versions of the workout flow**: the four-screen core row and the nine-screen canvas.
  The canvas is the complete flow Round 4 item 1 describes; recommend it.
- **A layout bug in the Progress frame itself**: "Discipline Timeline" is drawn over the
  Arms and Thighs cards. Build the evident intent, not the overlap.


#### Screens built to the design so far

Each was built the same way: `get_design_context` on the frame (the
`figma-design-to-code` skill loaded first — mandatory), its icons downloaded into
`icons/` and added to the `sw.js` precache, every figure bound to real state, then
measured in the browser at 402x874 and screenshotted against the frame.

| Frame | Node | Where it lives |
|---|---|---|
| Home | `2:35` | `js/ui/views/home.js` |
| Train hub | `2:809` screen 1 | `vTrain()` in `js/ui/views/train.js` |
| Day view | `2:809` screen 2 | `vDay()` in `js/ui/views/train.js` |
| Live session | `2:809` screens 3+4 | `js/ui/views/session.js` |
| Rest / set complete | `2:809` screen 5 (`2:1149`) | `vRest()` in `js/ui/views/session.js` |
| Exercise detail | `2:809` screen 6 (`2:1182`) | `exdetail` sheet in `js/ui/sheets.js` |
| Exercise replacement | `2:809` screen 7 (`2:1244`) | `exercise` sheet in `js/ui/sheets.js` |
| Workout complete | `2:809` screen 8 (`2:1311`) | `done` sheet in `js/ui/sheets.js` |
| Exercise library | `2:809` screen 9 (`2:1360`) | `vLibrary()` in `js/ui/views/train.js` |
| Profile | no frame exists | `js/ui/views/profile.js` |
| Add Food / servings / Quick Add | `13:188` `13:266` `13:337` `13:403` | `js/ui/views/addfood.js` |
| Enter manually | `13:464` | `vManual()` in `js/ui/views/addfood.js` |
| Nutrition goals | `13:531` | `set_nutrition` sheet in `js/ui/sheets.js` |
| Food states | `13:599` (reference) | applied in `addfood.js` |
| Food dashboard | `13:12` | `vFood()` in `js/ui/views/food.js` |
| Meal detail | `13:118` | `vMeal()` in `js/ui/views/food.js` |

Screens 3 and 4 of the canvas are one screen here. Screen 3 is the context above the
set table and screen 4 is the table; the app has always shown them together, and
splitting them would add a mode to the one screen that has to work one-handed
between sets.

**Premium is dropped** on the user's instruction (22 Sep). No paywall badge, no
premium concept anywhere.

#### Food, specifically

- **Every figure is derived, none is copied from the frame.** The hero ring is an arc
  of `eaten / goal` — the frame draws a full 6px border, which can only ever read
  100%. Macro bars are `eaten / goal` per macro, clamped at 100% and turning `--ok`
  green once the goal is met. Verified: 118/175 = 67.4%, 126/170 = 74.1%,
  43/62 = 69.4%, all measured off the rendered bars.
- **Over goal** flips the hero's remainder line from "584 kcal left" to
  "200 kcal over" in `--gold`, and clamps the arc at 100% rather than overdrawing.
- **Water glasses are derived, not the frame's fixed eight.** Water is stored in
  millilitres and the goal is the user's, so a glass is 250 ml until that would need
  more than sixteen glasses, at which point the glass grows to the next 50 ml instead
  (`glassUnit()`). A 3,000 ml goal gives 12 glasses; 6,000 ml gives 15 of 400 ml. The
  litre figure beside the row is exact either way. **No migration was needed — the
  stored shape is still millilitres.**
- **Tapping a glass sets the day to that many**, and tapping the last full one empties
  it again, so the frame's lone `+` button gets an undo without a second control. Each
  glass button is 44px tall; twelve of them cannot also be 44px wide at 402px, so the
  `+` beside them is the full 44x44 target.
- **The meal detail's delete is a permanent button, not a swipe.** The frame draws it
  revealed behind a swiped-away row. The app has no list-swipe anywhere else, and a
  delete that must be discovered by dragging is a delete some users never find.
- **`V.meal` is part of the nav route** (`loc`/`apply`/`rootOf` in `js/ui/nav.js`), so
  the arrow, the edge swipe and the OS gesture all return to the dashboard, and a tab
  tap clears it rather than returning to a meal opened twenty minutes ago.
- **The screen title is dropped**, as the frame has it and as Home and the Train hub
  already do. The date bar is the top of the screen. `dateBar()` is kept over the
  frame's plain chevron/label selector: it is the same bar Progress uses, with the
  month view and the markers.
- The frequent foods and saved meals the frame has no room for are kept below the
  meal list.

**One honest departure to raise:** the floating add button sits over the meal list, as
floating buttons do, and at 402x874 it covers the kcal figure on whichever row falls
at its height. A spacer keeps it off the last row at rest and scrolling reveals
anything under it, but on a screen whose whole point is figures this is a real cost.
It is the frame's own element, so it stays until the user says otherwise; the
alternative is a full-width "Add food" button above the meal list.

#### Rest, specifically (canvas screen 5, node `2:1149`)

The rest surface already existed and was already good. This is the frame applied to
it, not a rewrite: `vRest()` and `paintRest()` in `js/ui/views/session.js`.

What the frame adds:
- **The confirmation banner.** "SET 2 COMPLETE" in `--ok` on `--okSoft`, pinned to the
  top edge with the check icon. The surface never gave a receipt for the set before.
- **A 170px ring in a 180px box**, down from 236px, digits 40px. `REST_C` is now
  2π × 79 = 496.37; `paintRest()` shares the constant with `vRest()` rather than
  keeping its own copy.
- **Icon controls.** ±30s become 44px pills and pause becomes a 60px accent circle
  carrying `pause.svg` / `play.svg`. Because the button no longer has text,
  `paintRest()` swaps the glyph by class and moves the label to `aria-label` —
  writing `textContent` there would have deleted the icon.
- **A bordered footer** for "Skip rest and continue", underlined in accent.

What the frame leaves out and the app keeps, each because it is a figure the frame
had no data for:
- **"of 2:00" instead of "SECONDS LEFT".** The frame's label is wrong the moment the
  clock reads 1:30. The total it replaces is always true.
- **"Rest period" instead of "REST TIMER ACTIVE"**, which is wrong while paused, and
  which is already translated.
- **"of 3"** in the sub-line — the frame has "Set 2: 30kg × 10 @ RPE 7", the app has
  "Set 2 of 3: 60kg × 10 @ RPE 8". The RPE clause is the frame's and is new here.

**The cascade trap this one carried.** `.rbtn.main` is shared with the rest-over
screen, whose single button is a wide "I am ready" pill. Turning `.rbtn.main` into a
60px circle would have turned that into a circle too — and `.restwrap.done
.restdone-go`, which exists specifically to outrank `.rbtn.main`, sets only colours
and `min-width`, so it would not have saved it. The circle rules are scoped
`.restwrap:not(.done)`. Verified by measurement: the done button is still 314 × 52
with a 26px radius.

**Two bugs fixed in passing, both pre-existing:**
- `t("Replace Exercise")` and `t("Skip Exercise")` fell through to English, because
  the dictionary holds `"Replace exercise"` with a lowercase e. Both title-case forms
  are now keys.
- "−30s" begins with a neutral character, which an RTL paragraph reorders to "30s−".
  `.restctl .rbtn:not(.main){direction:ltr}` isolates the pills; their positions still
  mirror with the row.

#### Exercise detail, specifically (canvas screen 6, node `2:1182`)

The frame is drawn as a full screen with a back arrow and a pinned footer. It stays a
**sheet**: it opens from the ⓘ mid-workout and from the picker, and a route would have
to unmount the logger to show it. The sheet head's ✕ and ★ are the frame's back and
star, in the one place a long exercise name cannot shove them around.

Everything the frame shows already existed here. What changed is arrangement:

- **Subtitle** (`.exd-sub`) — the frame's "Horizontal Push Classic" is the movement
  pattern plus the variant, both of which the app knows. Renders as "Push · Medium
  Grip". It replaces the loose variant pill.
- **Labelled chips** (`.exd-chip`) — `Primary: Chest`, `Secondary: Shoulders ·
  Triceps`, `Equipment: Barbell`, label dim and value bold. These carried the same
  three facts as the old pill row *and* the two Primary/Secondary rows under the
  photographs, so both of those are gone rather than saying it twice. Difficulty is a
  fourth chip: the app has it and the frame had nowhere to put it. The secondary
  muscles now go through `t()`, which they did not before.
- **Form panels** (`.exd-form`) — the frame draws a bar-and-arm diagram in each 130px
  panel; these are the library's own photographs of the two positions, which is what
  the diagram stands for.
- **Ringed numerals** (`.exd-num`) — 24px, accent-soft fill inside an accent ring. The
  three-step default and "Show all" are unchanged.
- **Tips row** (`.exd-tips`) — one ruled row with the amber ⓘ and a chevron that
  rotates when open, in place of the grey "Common mistakes" button. Same `data-exmiss`
  handler, now with `aria-expanded`.

**ADD TO WORKOUT is built but effectively unreachable today.** It is gated on
`!S.active && dayOf(V.dayId)`. `V.dayId` survives into a live session, so the day test
alone would have offered "add" from the ⓘ mid-set — and it would have added to the
plan, not to the workout in front of you. With that gate correct, the only paths that
currently reach this sheet are the session ⓘ and the `sessmore` sheet, both of which
are inside a session. The picker adds on tap with no detail step in between — which is
exactly **backlog item 5**. When item 5 lands and routes the picker through this sheet,
the button is already here and already correct.

Not translated, and out of scope: the instruction steps themselves come from
`instructions.json`, which has no Arabic. All of the screen's own chrome does.

---

#### Exercise replacement, specifically (canvas screen 7, node `2:1244`)

The frame is the exercise picker in replace mode, so this is the existing `exercise`
sheet with the frame's three additions rather than a new screen. It already ranked
alternatives against the exercise being replaced; what it never did was say so.

- **The current-exercise row** (`.exswapfrom`) — "CURRENT EXERCISE", the name, and the
  frame's SWAPPING badge. Before this the title was the only thing on screen saying a
  replacement was in progress, and it did not say of what.
- **Equipment pills**, as a second filter row. `V.exe` already filtered the list; it
  simply had no control in this sheet, so it could only be set by arriving from the
  bodyweight entry and never cleared from here.
- **A Swap action on every result**, styled as the frame's button but rendered as a
  `<span>`: a button inside the row button is invalid, and two targets stacked on one
  row is worse to hit than one. The whole row remains the tap. It reads "Swap" when
  replacing and "Add" when adding.
- The result sub-line takes the frame's shape — equipment · difficulty — and drops the
  muscle when the muscle filter is already showing it.

**Two rows of pills, not the frame's one.** It draws the muscle pill and two equipment
pills side by side. They filter different things, and mixed into a single unlabelled
row there is nothing to say why turning one off widens the list while the other
narrows it. Same pills, same scroll, one row each.

**Four bugs found and fixed while in here**, all pre-existing:

1. **Swapping the live exercise titled itself "Add exercise".** `V.sd.replace` was the
   only replace test; `swaplive` is the other one and was missing from it.
2. **The exercise being replaced appeared in its own list of replacements**, ranked
   near the top, because it scores full marks against itself.
3. **The add flow inherited the replace flow's filters.** `data-addex` never reset
   them. It had always leaked, but the replace entries set `V.exm="All"`, so what
   leaked was "All" and nothing showed. Preselecting a real muscle (below) would have
   made it visible, so the reset goes in with it.
4. **Seven strings in this sheet never went through `t()`** — the two titles, "Best
   alternatives to … first", "shown", "matched to your equipment", and both states of
   the show-everything button. The muscle pills were untranslated too.

**One behaviour change the frame asks for:** a replacement now opens with the current
exercise's muscle already selected — the frame's "Chest Selected". Ranking alone put
like-for-like first but left the rest of the library under it. `pickMuscle()` in
`js/app.js` guards it: `muscleOf()` can answer "Other", which is a real classification
but not one the filter row offers, so selecting it would empty the list with no pill
lit to explain why. "All" is one tap away.

---

#### Backlog item 1 — bottom navigation

**The `100vh` audit is done.** Four remained after the `min-height:100dvh` added with
the Food work: the sheet's `max-height:88vh`, `.exresults{min-height:52vh}`, the
splash's `margin-bottom:15vh` and the ember keyframe's `translateY(-80vh)`. Each is
now a `vh` line followed by a `dvh` line, so declaration order does the feature test.

**The scroll-lock restore was already exact** — all five inline properties cleared and
the offset reapplied. The backlog guessed at "residue left behind"; that is not what is
wrong. Taking the body out of flow **empties the document**, so its scroll height drops
to exactly one viewport and the page stops being scrollable. Safari reads that as
nothing to scroll, brings its collapsed toolbar back, and the visual viewport shrinks —
which moves everything pinned to the bottom of it, the nav included. Closing the sheet
makes the page scrollable again, but the toolbar stays out until something scrolls, so
the nav is still displaced afterwards. That is why tapping another tab appears to fix
it, and it is repro steps 3 and 4 exactly.

Measured, on the Train tab at 390×844:

| | document scrollHeight |
|---|---|
| unlocked | 1277 |
| locked, old code | **844** — one viewport, i.e. not scrollable |
| locked, new code | 1277 |
| unlocked again | 1277 |

`lockScroll()` now holds `documentElement.style.height` at the height the document had,
released on unlock. The page stays exactly as scrollable as it was, so the toolbar
never changes state and nothing pinned to the viewport moves.

**The keyboard is not a third source of movement.** `body.kb` translates the nav fully
off-screen (`top >= innerHeight`) and releases the transform on blur — a deliberate
hide, not a reposition. Verified by driving the app's own `focusin`/`focusout` listener
directly, because the browser pane's document never holds focus and a programmatic
`.focus()` dispatches nothing there.

**Also fixed while in the sheet head:** `.sheethead .x` and `.favstar` are drawn as
38px discs, 6px under the minimum target. The discs stay 38px and a transparent 3px
`::after` outset takes the tappable area to 44 — growing the circles would have redrawn
the header of all 21 sheets to fix a hit area nobody can see.

**What remains unverified.** The backlog says to check item 1 by hand on a physical
iPhone, and that has not happened. What is proved here is the mechanism — the document
height no longer collapses, and the nav rect is byte-identical across cold launch, all
five tabs, sheet open, sheet close, start→✕→discard, keyboard focus and blur, mid-scroll
and page end. Whether iOS's toolbar then behaves as predicted is the one link in the
chain a headless check cannot close.

#### Workout complete, specifically (canvas screen 8, node `2:1311`)

**Built from a PNG export, not `get_design_context`.** The Figma connector hit the
Starter plan's call cap and stayed capped across two days and four attempts, so the
user exported all nine canvas screens as 2× PNGs. Every measurement in `.wc-*` was
read off `screen-8-workout-complete.png` at 804×1748 and halved. That is less exact
than the tool — spacing was read to the nearest couple of pixels rather than taken
literally — so if the connector frees up, this screen is the one worth re-checking
against the node. The exports are kept in the scratchpad, not the repo.

The sheet already had every fact this screen needs. What changed is what it says:

- **The medal** replaces the green tick. `icons/award.svg` is Lucide's `award` — the
  same set every other icon here comes from, ISC licensed, fetched from unpkg because
  the Figma export of it was behind the same cap. Accent ring over accent-soft, which
  is how the rest of the canvas marks anything earned.
- **Four tiles, two up**, in place of one PERFORMANCE SUMMARY card.
- **A gold record banner** with the frame's 🏆, in place of the plain PR card.
- **Key Achievements**, which is new. Each line is derived and printed only when it is
  true of this session: every planned set logged, every exercise completed, volume up
  N% on the last time this day was trained, trained near your limit at RPE ≥ 8.5. If
  none hold, the section is not there.
- **A ruled footer** with DONE and SHARE WORKOUT STATS.

**Two figures the summary could not answer, now carried by it.** `finishSession()`
counts `exsPlanned` and `setsPlanned` *before* the filter that drops untouched
exercises, because "7 of 7" and "every planned set logged" are about what the day
asked for, not what survived; and it stores `prevVol` so the volume line can be a
percentage rather than a raw kilogram delta.

**EST. CALORIES is a real estimate or it is not shown.** `sessionKcal()` in
`formulas.js` is the standard MET equation at 5.0 METs — the middle of the Compendium
of Physical Activities' band for resistance training, which runs 3.5 to 6.0. It takes
active minutes, not wall clock. With no body weight ever logged it returns 0 and the
tile shows SETS LOGGED instead, because the figure scales linearly with body weight
and an estimate off a default is not an estimate.

**Two things the frame implies that the app had to decide.** The frame prints "47:23",
which is mm:ss; the summary only stored rounded minutes, so every workout ever logged
would have read `:00` — a format promising precision the figure did not have. It now
stores `secs`. And a first-ever workout sets a record on every lift in it, which turned
the banner into a second summary as long as the screen; it is now heaviest-first, three
named, the rest counted.

**SHARE WORKOUT STATS shares this workout**, via the Web Share API with a clipboard
fallback — both free, neither a dependency. It is deliberately not the existing
`share` sheet, which is a progress snapshot for friends and a different thing.

**Three bugs of my own, caught by testing rather than by reading.** Two were missing
imports in `app.js` (`wUnit`, then `fmtN`) that threw inside the click handler, so the
button did nothing at all and said nothing about it — the console had the answer both
times and guessing did not. The third was mine by construction:
`navigator.clipboard.writeText()` rejects *asynchronously*, so the `try/catch` I wrapped
it in caught nothing and a blocked clipboard answered the tap with silence.

**Verified:** 50 checks across both themes and languages, each driving a full workout
end to end — every set of every exercise logged, then the screen read. Volume
arithmetic confirmed against a second session of the same day (19,800 → 23,100 = +17%),
the no-body-weight fallback confirmed by clearing the body log, the share text
confirmed by stubbing `navigator.share`, and the fallback confirmed by removing it.

---

#### Exercise library, specifically (canvas screen 9, node `2:1360`)

Built from the 2× PNG export, same as screen 8 and with the same caveat: spacing was
read off the image to within a couple of pixels rather than taken literally.

The screen already had every control the frame shows — search, muscle pills,
equipment pills, rows with thumbnails. What changed is how it presents them:

- **Its own header** (`.libhead`) with the favourites star where the frame puts it.
  The shared `head()` renders a BUNYAN watermark in that corner, so this screen has a
  header of its own rather than a watermark and a star stacked together. The frame's
  "Search 400+ targeted tutorials" is a placeholder; the real library size goes there,
  the same figure the Train hub's card already shows.
- **A search field with the icon inside it**, in accent. The bare input it replaces
  gave no hint of what could be searched; the placeholder now says muscles and gear
  as well as exercises.
- **Filter pills that read as controls** — 13px sentence case in a 44px target,
  rather than the 11px uppercase tag the base `.pill` is. The selected pill is
  **outlined** in accent rather than filled, because that is what the frame draws and
  because filled is what `.pill.a` means everywhere else in the app; both at once
  would have read as two different states. Scoped to `.libfilters`, so the filled pill
  elsewhere is untouched.
- **"Chest Exercises (84)"** — the filter and the count, said once and in the right
  place, replacing a tiny "84 of 873 shown" line above the search box. With no muscle
  filter on it says "All Exercises", because naming a muscle there would be a lie.
- **Bigger rows**: a 62px thumbnail, the name at 17px, and muscle · equipment beneath
  with **the equipment in accent** — the frame colours that one word, and it is the
  part that decides whether you can do the exercise at all.

**What the frame shows that the app does not have.** Its rows read "Chest (Mid)",
"Chest (Upper)", "Chest (Lower)" — anatomical regions this library does not model. It
has a muscle per exercise and nothing finer. The rows say the muscle. Inventing a
region per exercise across 873 of them would have been fabrication dressed as detail.

**One layout bug of my own, caught by measuring rather than looking.** `.librow-n` and
`.librow-s` are spans; inline, they ran the name and the detail together on one line
and collapsed the row onto its thumbnail. The screenshot showed it, but what named it
was asserting that the name's bottom edge sits above the detail's top edge.

Also fixed in passing: the muscle and equipment pills were rendering their English
labels in Arabic, and `patternOf` became an unused import once the row sub-line
dropped to two facts.

**Verified:** 34 checks across both themes and languages — geometry measured rather
than eyeballed (62px thumbnails, 48px field, 44px pills, name above detail), the
outlined-not-filled selected pill, muscle and equipment filters composing, search
narrowing, the count heading agreeing with the number of rows actually rendered, the
150-row cap and its explanation, the empty state, a row opening the exercise detail
and returning with its filters intact, and in RTL the search icon, thumbnails and
chevrons all mirrored.

---

#### Profile, specifically (no frame)

**There is no Profile design, confirmed rather than assumed.** On 29 Sep the Figma cap
had lifted, and `get_metadata` on the page lists all nineteen top-level frames. None
is a profile screen; the nine "Profile" matches in the file are all tab-bar labels,
and the one unnamed frame (`1:2 Frame 1`) is an empty 100×100 box. So this tab is
built from the language the other frames share rather than from a design of its own:

- **The Train hub's header** — a bare `<h1>` in `.thead`, replacing `head()` and its
  "Warrior designation: Me" subtitle and BUNYAN watermark.
- **A hero card** (`.card.phero`) with **Home's accent-ringed avatar**, larger here
  because here it is the subject, the name, and the active program's name beneath it.
- **Three stats ruled off the card's edges**, at equal weight. The streak used to be the
  accent-red one of the three; none of them outranks the others, so none is styled as
  if it did — the same argument the workout-complete tiles made.
- **The Train hub's grouped rows** (`.tsec` + `.card.tdays` + `.trow`) for every
  setting, which put each value *under* its name. The old `setRow` squeezed the value
  against the chevron, where a long one had nowhere to go.

Same four groups, same nine rows, same order, and every row still opens exactly the
sheet it opened before — verified by tapping all nine.

**A real bug, and the one the user named at the start.** The "You" row concatenated
`age`, `height` and `weight` whole. All three default to `null`, so a profile that
skipped them rendered, literally, **`null · nullcm · 86kg`** — two nulls and a body
weight nobody entered, from an `86` fallback meant for arithmetic, not display. It now
shows only what has actually been entered, joined without stray separators ("31 yrs ·
180.8 lb" when height is missing), and "Add your age, height and weight" when nothing
has been. `yrs` and `cm` are translated; the weight goes through `fmtW`, so it converts
in pounds (82 kg reads 180.8 lb).

**Dead code removed.** `setRow` had one caller, and it was this file. It is gone from
`view.js` and its export, and so is `.rowval`, the CSS that only it used.

The "86" fallback also exists in `bmr()` and in the body-weight stepper's starting
value. Those are calculation defaults, not display, and are left alone — but `bmr()`
feeding a target from a weight nobody gave is worth a look some day.

**Verified:** 49 checks — empty, full and partially filled profiles, kg and lb, all nine
rows opening their sheets, 44px rows, both themes and both languages (RTL chevrons on
the left and mirrored, `سنة` / `سم` / `كجم` in the You row), and a five-tab sweep after
restoring the dev profile to exactly how it was found.

---

#### The food group (13:188, 13:266, 13:337, 13:403, 13:464, 13:531, 13:599)

Two frames were read from Figma before the cap closed again; the other five from the
user's 2× PNG exports. Specs for all seven are kept in `.claude/FOOD-FRAMES.md`.

**The architecture question, and how the frames answered it.** The first two frames
describe *search → pick one result → set servings → add*. The app has only ever been
*describe a whole meal in words → parsed list → add all*. 13:337, "natural-language
input", showed the design wants **both**. They are now three modes of one sheet, in
the new module `js/ui/views/addfood.js` (`V.food.mode`):

- **Add Food / search** (13:188) — live search as you type over the built-in database
  and your own foods (`searchFoods`, now exported), tabs for Search / Recent / Frequent
  / Custom, frequent-food pills, the barcode camera inside the field. Every result row
  opens the servings screen; the `+` beside it logs one default serving directly.
  Zero local hits offers Open Food Facts and manual entry, and online results list
  beside local ones.
- **Add Food / servings** (13:266) — the calorie figure at 64px, a serving-size
  chooser built from the food's own servings (a drumstick offers "drumstick (95 g)"
  and 100 g), a servings stepper in whole steps with a half below one, "More
  nutrients", and the add button naming the meal.
- **Quick Add** (13:337, 13:403) — the old flow, restyled: status line, recognised
  cards with an edit toggle, the amber unknown-food card with **Add details** (puts the
  caret after that phrase in the box) / **Try again** (Open Food Facts) / **Enter
  manually**, the green total, "Add all to Dinner" or "Add recognized items".

Quick Add is reached from the first row under an empty search — no frame shows the
way in. **Enter manually** (13:464) and **Nutrition goals** (13:531) are the `manual`
and `set_nutrition` sheets restyled. **13:599** is a component reference, not a
screen; its loading, estimated, offline and empty states are applied in the sheet.

**The meal is now in the header, and it is carried.** Every frame puts the meal in
the subtitle and the button. It is chosen by an invisible native select laid over the
subtitle, replacing the two separate meal `<select>`s at the feet of the old sheets —
which could disagree with each other.

**Departures, each for a reason:**

- **"AI Natural Language" is not the subtitle.** The parser is a set of local rules —
  free, offline, and not AI. The subtitle is the meal, as on every other food screen.
- **"Favorites" is "Frequent".** Foods have no favourites in this app; frequency is
  what the app has always used, and labelling it Favorites would claim a starring
  feature that does not exist.
- **"More Nutrients (Fiber, Sodium…)" is "More nutrients".** The database has fibre
  and not sodium.
- **The frame's split — 26% + 44% + 25% — sums to 95.** The real split is the calories
  from each macro's grams, rounded by largest remainder so it always sums to exactly
  100 (1950 kcal / 175 · 170 · 62 g reads 36 · 35 · 29).
- **"Remaining today" is the Food ring's arithmetic**, and was verified to agree with
  the ring to the character.
- **Water and steps stay on the goals sheet.** The frame omits them; the app measures
  against them.

**Six bugs fixed, five pre-existing:**

1. **Every context-free add went to Snack.** `quickfood` hard-coded it — including a
   pill tapped inside a sheet opened for Breakfast — and so did the dashboard's
   floating button and saved meals. `mealNow()` (in `food.js`) picks the meal by time
   of day; the sheet's own meal wins whenever there is one. All adds now go through
   one `logFood()` in `app.js`.
2. **Quick Add edited the wrong item.** Its controls carried the item's position among
   the *recognised* items, while the handlers index the *whole* list. With an
   unrecognised line first — "exotic bowl, 3 eggs" — pressing + on the eggs changed
   something else. They carry the real index now; verified with exactly that input.
3. **A scanned product logged an object as its weight.** The barcode handler stored
   `grams:g` where `g` is the `{g:100,label:"100 g"}` that `gramsFor()` returns, so the
   card read "NaN g". A scanned product now opens the servings screen.
4. **Adding a meal with an unanswered "Did you mean" threw and logged nothing.** A
   pending suggestion has no food, and the filter let it through to `toLogItem()`,
   which reads `it.food.id`. Same filter fixed in `ACT.savemeal`.
5. **"Change" dropped the meal.** `openSheet("pickfood",{idx})` replaced the sheet's
   data; the meal is carried now, and "Search online instead" on that sheet returns
   to the add-food sheet instead of updating behind it.
6. **"1 items logged"** on the dashboard's meal rows — mine, from the Food dashboard
   work.

Also: `D.parse` replaced `V.food` wholesale, which now holds the mode and tab too; the
manual sheet's Cancel-restore path read the removed meal select and dropped the
serving; eight strings in the old sheets never went through `t()`. `srcBadge()`,
three imports in `sheets.js` and the old food markup are removed as dead.

**Verified:** 100 checks, each against the real engine rather than a stub — live
search keeping the focused input across re-renders, servings maths (163 → 326 → 81.5
kcal for 1 → 2 → 0.5), meal routing from each entry point, the index bug with an
unrecognised line first, commit with a pending suggestion, calories derived from
macros (416), the split summing to 100 before and after an edit, the goals sheet
agreeing with the Food ring, the offline card under a failing `fetch`, and all five
screens in Arabic + light with RTL mirroring measured. The dev profile was restored
afterwards, including the frequency counts the test logging built up.

---

#### Backlog item 2 — swipe-back follows the back arrow

Three of the item's requirements were already met and are worth recording as met, so
nobody goes looking again: **there is no document-level navigation anywhere** — no
`location.href`, `assign` or `replace` in the codebase, every view change is a
same-document `pushState` on the same path; **there is one navigation system**, the
browser's, with no hand-written swipe handler, which is what the item recommends; and
**the splash is already guarded by a session flag** (`sessionStorage["bunyan:seen"]`),
so a reload for any reason does not replay the intro. Both sides of that were checked:
clearing the flag plays it, a reload after it does not.

What was missing was the rule itself.

**One predicate, `canBack()` in `js/ui/nav.js`.** Back is available exactly when there
is somewhere in-app to return to (`STACK.length > 0`) and the screen is not holding it
off (a live workout). The back arrows are now rendered by `backBar()` and
`backArrow()` in the same file, both gated on the same call, so "swipe-back is
available if and only if a back arrow is shown" is true by construction rather than by
keeping two lists in step. Six hand-rolled arrows across `train.js` and `food.js`
collapsed into those two.

**The spare history entry.** `initNav()` now pushes one entry in front of wherever the
user is, and every path that declines a back pushes it again. The gesture always has
something of ours to land on. Without it, a swipe at a tab root had nothing to consume
and walked out of the document — and coming back in reloaded the app, splash and all,
which is what Round 2 Bug 5 was describing. The spare is never counted in `DEPTH`, so
the in-app controls cannot spend it.

**`H.locked` is pure now.** It used to toast from inside the predicate; `canBack()`
consults it on every render to decide whether to draw an arrow, so a side effect there
would have fired on every repaint. Telling the user why a gesture did nothing is
`H.onBlocked`, which runs only on a real attempt, and only for the session — a swipe at
a tab root does nothing because there is nowhere to go, which needs no explaining.

**One bug found on the way:** `data-go` (Progress → "Start a workout", Home → the
nutrition card) set `V.tab` but not `V.train`, so it could land on the Train tab still
showing whatever sub-view was open, with an empty stack behind it. Harmless while the
arrow was unconditional; with the arrow now derived it would have shown a day view
with no way back but the tab bar. It resets the sub-view like a tab tap, which is what
it always was.

**What this costs.** Under the rule as written, back at a tab root does nothing —
including the very first back, which previously exited the app. Installed to the home
screen that is right and invisible. In a browser tab it means back no longer leaves
Bunyan; the user needs the browser's own UI. That is the rule's own consequence, not a
side effect, but it is worth knowing before it is reported as a bug.

**The one requirement that cannot be met in code.** "In Arabic, the arrow is on the
right and the gesture works from the right edge." The arrow is on the right — verified
by measurement, it sits in the trailing half of its header. Which *edge* the gesture
starts from is the browser's, not ours: there is no custom gesture handler, by the
item's own recommendation, and no API sets the edge. Writing one to force it would
reintroduce exactly the two-backs-per-swipe bug documented at the foot of `nav.js`. If
Safari does not mirror its own gesture for `dir="rtl"`, the honest options are to live
with it or to accept a hand-written gesture and its costs — not something to decide
without seeing it on the device.

**Verified:** 54 checks across both languages — arrow absent and gesture inert at every
tab root, arrow present and gesture navigating on day / library / preview, four
consecutive root gestures leaving the app intact, session blocked while its ✕ still
opens the leave confirmation, a sheet consuming the gesture and nothing else, splash
guarded both ways, and the RTL arrow measured on the right. What no headless check can
reach is the physical edge swipe itself; everything here drove `history.back()`, which
is the same event Safari's gesture raises but not the same gesture.

---

## Exact next step (updated 23 Sep, after the workout canvas and Food)

`sw.js` is at `bunyan-v52`. The user's own Figma design is the source of truth for the
app's look (section 13). **Every frame is built except Progress.** The nine-screen workout
canvas, the nine food frames, and Profile (which has no frame). The user's instruction of
22 Sep settled three of the four open decisions: use the nine-screen canvas, drop
premium, and bind every displayed name and figure to real state.

1. **Progress `2:484`.** The last frame. Needs a PNG export — the connector is capped. Build the evident intent, not the frame's own overlap bug —
   "Discipline Timeline" is drawn over the Arms and Thighs cards.
2. **Splash and first screen.** The user asked for these to be made premium with the new
   palette and dimensions **without being replaced** — the horse and knight stay. The
   splash is already restyled to `#040406` (the seam fix); the rest is open.
3. **Ask about the button contrast** (section 13, departure 2): `#e31b23` gives 4.38:1 on
   the primary button; `#dc1a22` gives 4.60. One value, but it is the brand colour.
4. **Raise the two open design questions**: the floating add button covering figures on
   Food (section 13), and the canvas's nav icons (dumbbell / apple / bar-chart) differing
   from the core frames' (activity / pie / trending-up). The core frames' set is in the
   app; one of the two has to win.
5. **The Figma connector allows almost nothing.** Capped from 24 Sep; on 29 Sep it
   allowed exactly three calls (one metadata, two frames) and capped again. Do not plan
   around it resetting. PNG exports from the user are the reliable route — screens 8
   and 9 were built that way. Every frame that *was* read is written down in
   `.claude/FOOD-FRAMES.md` so no call is spent twice. The food group was finished from exports; Progress is the only frame left unread.
6. **`7PpQqtZalbwsu9sJA3Hp9I` is still refused** on every tool. Pasting the link does not
   grant access. The user has to share that file with the owner's Figma account email,
   "can edit". Node `11:13` has never been seen.
7. **Put it on a phone.** Unchanged and still the largest risk — none of this has run on
   real hardware. The fonts and icons in particular have only ever loaded from localhost.
   **Backlog item 1 is waiting on exactly this**: the fix is in and the mechanism is
   measured, but the last link — whether iOS's toolbar then behaves — needs the device.
   Item 1's own acceptance list is the script to run.
8. Bump `CACHE` in `sw.js` on any change, and add every new asset to its precache list.

### A method note worth keeping

**1. A class is not an animation.** Three separate motion bugs here were CSS-cascade
problems that every DOM-state assertion passed. Asserting that a class is applied
proves nothing about whether an animation runs, or which one:

```js
el.getAnimations().map(x => x.animationName + ":" + x.playState)
```

**2. Comments in this project have been wrong more often than the code.** Four so far:
`.setrow`'s "height is animated" (it was not), `rowOut`'s two-stage fade (the stages
did not exist), the `:root` block's "these are the values it writes" (nine of thirteen
are not — section 7), and my own first attempt at the collapse. When a comment asserts
a behaviour, measure it before trusting it, and fix the comment when it turns out to
be describing an intention rather than the code.

**3. CSS keyframe semantics that caught this project out.** A property listed only in
the `100%` block interpolates across the *whole* animation from its implicit start
value. An intermediate keyframe that does not mention that property does not hold it.
So a `45%` stop staging a "fade, then collapse" stages nothing unless every property
appears in both stops.

**4. Pick easings per property, not per intuition.** "Leaving" does not automatically
mean accelerate. The fade wants accelerate; the layout closing behind it wants
standard. Measure the travel at several points and compare — section 6 has the table.


**5. A harness can pass by testing nothing.** Every "both languages" sweep here before
20 Sep set `S.lang`, which nothing reads — the real flag is `S.prefs.lang`. The runs
rendered English twice and reported full marks. When a test matrix never fails on any
axis, check that the axis is actually connected before trusting the green.

**6. Duplication does not stay merely untidy.** Progress and Food's calendars were the
same feature written twice. By the time they were merged they had drifted into three
separate defects, including one that made a date control skip a day for every user east
of Greenwich. Each would have had to be found twice. That is the argument for every row
in the "single sources of truth" table above, and the reason to add to it rather than
copy a block of markup.


**7. Check the brief's diagnosis before implementing its fix.** Round 4 item 6 said the
nav was positioned by content flow and that `100vh` was "almost certainly" the cause.
Neither was true — the nav was already fixed, and the project contains no viewport-height
unit at all. Implementing the prescribed fix would have changed nothing and hidden the
actual defect, which was a hardcoded reserve drifting from the nav's real height. A brief
describes a symptom accurately and a cause speculatively; measure before trusting the
second half.

**8. Do not ship what the harness cannot exercise.** A ResizeObserver measuring the nav
was written, and then deleted once a probe showed the observer never fires in the test
pane. The replacement is a pure-CSS derivation that can be checked by changing a token
and watching two numbers move. Unverifiable correctness is a claim, not a property.


**9. When a box is the wrong size, suspect what constrains it, not what sizes it.** The
sheet's close button looked mis-positioned for three rounds. The button was correct; its
container was being clamped by a `max-width:100%` written for something else entirely.
Setting the margin inline and seeing *nothing change* is what identified it — if forcing
a property has no effect, that property is not the one in charge.

**10. Blocking one route to a dangerous action is not blocking the action.** The
destructive confirm refused an outside tap and then let itself be flung off screen by its
own header. When a rule exists because an outcome is unsafe, enumerate every route to
that outcome — tap, drag, gesture, key — rather than the one route that was reported.


**11. `hidden` is not enough on its own.** It carries only the UA stylesheet's
`display:none`, so any rule setting `display` on the same element beats it silently — the
attribute goes on, nothing happens, and the state you thought you were toggling is always
on. `[hidden]{display:none!important}` belongs in every project once. This one shipped a
clock labelled PAUSED while it was running.

**12. A brief's "current state" can be a description of the past.** Item 2 opened with
"the back arrow does nothing, swipe-back glitches, the only way out is Discard". All
three had been fixed in an earlier round; the one thing genuinely missing was the prompt.
Re-verify a reported symptom before rebuilding around it, or you will fix it twice and
miss what is actually absent.


**13. Scheduled audio is testable without hearing it.** Spy on `createOscillator` and
`frequency.setValueAtTime` and you get the whole pattern — count, frequencies, cadence,
total span — as numbers. `frequency.value` will lie to you: it returns the current value,
not the one scheduled for a future time, so a two-tone alarm reads as a single 440 Hz.

**14. Some failures only a screenshot will find.** The ready button on the zero state
passed every assertion — it existed, it was the right size, it had the right label — and
was invisible, because an accent-filled button on an accent ground looks like bare text.
Assertions check what you thought to ask about; a picture shows what is actually there.

## Deploying

Upload to GitHub: **these eleven root files**, plus **three folders** with their contents
and sub-folders intact — `js/` (including `js/vendor/`), `fonts/` and `icons/`.

```
README.md               index.html              sw.js
manifest.webmanifest    icon-180.png            icon-512.png
mark.png                intro.jpg               exercises.json
foods.json              instructions.json

js/        fonts/        icons/
```

**`fonts/` and `icons/` are new as of 22 Sep and easy to miss.** Without `icons/` the
tab bar shows five blank tabs — the icons are masks, so a missing file draws nothing
rather than a broken image. Without `fonts/` the app silently falls back to system type
and stops looking like the design.

Every one of them is referenced by the app — verified by grepping `index.html`,
`sw.js`, `manifest.webmanifest` and every module for asset paths.

**Do not upload `files.zip`.** It sits in the project root and is not part of the app,
which is why "the eleven root files" used to be ambiguous: counting what is in the
folder gives twelve.

**Never flatten `js/`.** The app is ES modules fetched by path; a flattened folder is
a blank black screen. The same applies to `fonts/` and `icons/`: the paths are fixed.

**After uploading, hard-refresh once.** The service worker serves the previous cache
until the new `CACHE` name takes effect — currently `bunyan-v52`.

## Knowledge session

Owns `js/knowledge/`, `docs/`, `tools/`, plus two files by explicit exception:
`.claude/INGESTION-LOG.md` and this heading in `PROGRESS.md`. Spec:
`.claude/KNOWLEDGE-BASE-INGESTION.md`. Resume from `INGESTION-LOG.md`.

- **20 Oct — Section 1 (inventory and section ledger) done; waiting on owner approval of
  the skip list.** 22 files in `source/`, 2,181 pages, every page in one ledger row:
  935 to extract, 1,009 proposed skip, 75 pass-two checklist, 162 duplicate. Textbook
  ledger is 131 rows, contiguous 1–999, checked by script. No book content extracted.
  The textbook PDF is incomplete: ch 20 lessons 11–12 are missing, and it ends mid-ch 23.
  `null.pdf` is a steroid drug reference, proposed skip in full.
- `source/` gitignore rule verified with `git check-ignore -v` in a scratch repo
  (`.gitignore:2:source/`). **The project folder is not a git repository**, so nothing is
  committed yet, including `INGESTION-LOG.md`.
- `CLAUDE.md` gained one line: website uploads ignore `.gitignore`; never select `source/`.
- **20 Oct — Section 1 approved** (1.6 kept → `scope.js`; ch 3–4 → `adherence.js`).
  `null.pdf` **removed** from `source/` on the owner's instruction. Section 2 started.
- **20 Oct — 1.3 done** (pp 34–43, 222 facts) → `js/knowledge/assessments.js`,
  `scope.js`, `residual.js`. New tools: `tools/count-facts.sh` (fact counter) and
  `tools/serve.ps1` (static server on :8777, refuses `source/` and `.claude/`; this
  machine has no node or python). All knowledge files import cleanly in the browser.
- **20 Oct — 1.4 done** (pp 44–46, 56 facts) → `residual.js` `injury-regions`.
- **20 Oct — 1.6 done** (pp 51–53, 79 facts) → `js/knowledge/scope.js`: 24 hard-limit
  rules (in-scope, out-of-scope, preconditions, referral triggers, conduct). Each
  trainer rule carries an `agentReading` — Bunyan's interpretation, labelled, awaiting
  owner review (INGESTION-LOG open question 12). **Chapter 1 complete.** Next: 3.1 p94.
- **20 Oct — 3.1 done** (pp 94–100, 144 facts) → new `js/knowledge/adherence.js`.
- **20 Oct — 3.2 done** (pp 101–105, 117 facts) → `adherence.js` barriers and goals.
- **20 Oct — 3.3 done** (pp 106–115, 181 facts) → `adherence.js` social influence, support types, groups.
- **20 Oct — 3.4 done** (78 facts) and 3.5 summary checked. **Chapter 3 complete** → `adherence.js` (14 exports). Next: 4.1 p122.
- **20 Oct — 4.1 done** (85 facts) → `adherence.js` determinants, techniques, expectations.
- **20 Oct — 4.2 done** (75 facts) → `adherence.js` stages of change.
- **20 Oct — 4.3 done** (88 facts) → `adherence.js` communication.
- **20 Oct — 4.4 done** (52 facts) → `adherence.js` motivational interviewing.
- **20 Oct — 4.5 done** (186 facts) → `adherence.js` strategies (goals, planning, self-monitoring, cognitive).
- **20 Oct — 4.6 done** (66 facts) → `adherence.js` intake. All chapter-4 lessons done.
- **20 Oct — Chapter 4 complete** (4.1–4.6, 554 facts) and study-guide checklists run for
  chapters 1, 3 and 4 (32 more facts, tagged `SG.n`). `tools/count-facts.sh` rewritten
  (v2, brace-aware); two ledger counts corrected. Next: 5.1 p157 (anatomy).
- **20 Oct — 5.1 done** (116 facts) → new `js/knowledge/anatomy.js`.
- **20 Oct — 5.2 done** (125 facts) → `anatomy.js` skeletal.
- **20 Oct — 5.3 done** (78 facts) → `anatomy.js` joints, bone life course.
- **20 Oct — 5.4 done** (128 facts) → `anatomy.js` muscular. All chapter-5 lessons done.
- **20 Oct — Chapter 5 complete** (447 facts) → `anatomy.js` (8 exports); study-guide checklist ch 5 run (5 facts). Knowledge files total 125.8 KB. Next: 6.1 p206.
- **20 Oct — 6.1 done** (149 facts) → `anatomy.js` cardiovascular, `assessments.js` resting heart rate.
- **20 Oct — 6.2 done** (105 facts) → `anatomy.js` respiratory; `scope.js` + abnormal-breathing referral.
- **20 Oct — 6.3 done** (150 facts) → `anatomy.js` endocrine.
- **20 Oct — Chapter 6 complete** (494 facts + 8 SG) → `anatomy.js`, new `nutrition-principles.js`, `assessments.js` resting HR, `scope.js` +2 referrals. 154.5 KB total. Next: 7.1 p243.
- **20 Oct — 7.1 done** (41 facts) → `anatomy.js` movement-science terms.
- **20 Oct — 7.2 done** (84 facts) → `anatomy.js` planes of motion.
- **20 Oct — 7.3 done** (50 facts) → `anatomy.js` muscle actions.
- **20 Oct — 7.4 done** (90 facts) → `anatomy.js` muscle roles, 19 tagged muscles. Gap found: the muscle appendix is not in the PDF.
- **20 Oct — 7.5 done** (142 facts) → `anatomy.js` force; **new `js/knowledge/imbalances.js`**
  (2 partial patterns); **new `MUSCLE_MAP`** (46 muscles → library tags, one vocabulary);
  **new `tools/check-muscles.html`** (vocabulary check — OK).
- **20 Oct — Chapter 7 complete** (480 facts + 10 SG) → `anatomy.js` (18 exports), `imbalances.js` seeded, `MUSCLE_MAP` 49 muscles. 189 KB total. Next: 8.1 p289.
- **20 Oct — 8.1 done** (78 facts) → `nutrition-principles.js` energy and fuels; 3 source inaccuracies recorded.
- **20 Oct — 8.2 done** (78 facts) → `nutrition-principles.js` energy systems.
- **20 Oct — 8.3 done** (86 facts) → `nutrition-principles.js` exercise energy, work:rest, talk test, fat-burning myth.
- **20 Oct — Chapter 8 complete** (315 facts + 8 SG) → `nutrition-principles.js` (6 exports).
  Bunyan's MET formula verified consistent with the source. **Open question 16:** the source
  says all RMR equations, incl. Mifflin-St Jeor, tend to underestimate — no change made.
  208 KB total. Next: 9.1 p312.
- **20 Oct — 9.1 done** (83 facts) → `scope.js` nutrition boundary (3 rules), `nutrition-principles.js` basics.
- **20 Oct — 9.2 done** (206 facts) → `nutrition-principles.js` protein (targets per population kept separate).
- **20 Oct — 9.3 done** (142 facts) → `nutrition-principles.js` carbohydrate.
- **20 Oct — 9.4 done** (122 facts) → `nutrition-principles.js` lipids.
- **20 Oct — 9.5 done** (325 facts) → `nutrition-principles.js` micronutrients, hydration. Open question 18 (water goal default).
- **20 Oct — 9.6 done** (83 facts) → `nutrition-principles.js` weight management; `scope.js` + weight/medication referral.
- **20 Oct — 9.7 done** (119 facts) → `nutrition-principles.js` food labels.
- **20 Oct — 9.8 done** (172 facts) → `nutrition-principles.js` goal strategies. **Open question 19:** Bunyan gain +250 vs source 350–500.
- **20 Oct — Chapter 9 complete** (1,253 facts + 5 SG) → `nutrition-principles.js` (15 exports),
  `scope.js` nutrition boundary (32 rules total). **Open questions 17–19** (alcohol kcal, water
  default, gain surplus). Knowledge files total 265 KB; still lazy-loadable modules. Next: 10.1 p382.
- **20 Oct — 10.1 done** (63 facts) → new `js/knowledge/supplements.js` (education only).
- **20 Oct — 10.2 done** (292 facts) → `supplements.js` regulation, reference values, labels, third-party testing.
- **20 Oct — 10.3 done** (352 facts) → `supplements.js` health supplements.
- **20 Oct — 10.4 done** (236 facts) → `supplements.js` ergogenic aids; `scope.js` + stimulant referral and **no PED guidance** (owner's instruction).
- **20 Oct — Chapter 10 complete** (943 facts + 9 SG) → new `supplements.js` (9 exports,
  education only); `scope.js` now 34 rules incl. `no_ped_guidance`. Knowledge files 306 KB,
  still on-demand modules (nothing in the app imports them). Next: 11.1 p420 (assessment).
- **20 Oct — Owner instruction:** all steroid content removed from `js/knowledge/`
  (`supplements.js`, `scope.js`); a generic banned-drug refusal stays. Applies to all
  future sections. Owner also asked for autonomous progress to the end.
- **20 Oct — 11.1 pp 420–429 done, 146 facts.** `assessments.js` + `SCREENING` (why screen,
- **20 Oct — 11.2 pp 430–433 done, 25 facts.** `assessments.js` + `PROTOCOL`: comfort and
- **20 Oct — 11.3 pp 434–438 done, 48 facts.** `assessments.js`: `resting_heart_rate` +
- **20 Oct — 11.4 pp 439–453 done, 157 facts.** `assessments.js` + eight entries: BMI
- **20 Oct — Chapter 11 complete** → `assessments.js` (20 entries + SCREENING, PROTOCOL), `imbalances.js` causes/injuries, `scope.js` +2 referrals. Open question 20 (test termination criteria image-only).
- **20 Oct — 12.2 pp 471–475 done, 116 facts.** `assessments.js` + `static_posture`
- **20 Oct — 12.3 pp 476–494 done, 192 facts.** `assessments.js` + `dynamic_posture`,
- 20 Oct — 12.4 (70 facts; gap 6, later performance tests missing), 12.5 (66, incl. pain referral rule), 12.6 checklist (9) done.
- 20 Oct — SG ch12 checklist (1 new, SG.12). Chapter 12 complete except gap 6.
- 20 Oct — Chapter 13 done: new phases.js (13.1 69, 13.2 68, 13.3 106, 13.4 1 facts); SG ch13 checked.
- 20 Oct — 14.1–14.4 done: new corrective.js and cues.js (37/71/28/106 facts); new tools/check-cues.html.
- 20 Oct — 14.5 static stretching done (99 facts; 17 stretches, 5 cued).
- 20 Oct — 14.6 (37) and 14.7 (76, incl. controversial stretches) done; SG ch14 checked. Chapter 14 complete.
- 20 Oct — Chapter 15 done: new cardio.js (13/92/76/143/24 facts); gap 7 (cardio stage 5 absent from PDF); SG ch14 p45 + ch15 checked.
- 20 Oct — Chapter 16 done: new core.js (53/72/112/91 facts), posterior tilt pattern, 26 exercises cued; SG ch16 checked.
- 20 Oct — Chapter 17 done: new balance.js (23/59/77/42 facts) incl. ankle-instability rehab facts; 28 exercises cued; SG ch17 checked.
- 20 Oct — Chapter 18 done: new plyometrics.js (48/77/44 facts); 37 exercises cued; SG ch18 checked.
- 20 Oct — Chapter 19 done: new saq.js (46/106/44 facts); gap 8 (SAQ cone drill descriptions absent); SG ch19 checked.
- 20 Oct — 20.1–20.6 done: new acute-variables.js (principles, adaptations, all ten variables, Table 20-3, 14 systems, safety, progression); open question 21 (plan.js numbers vs source).
- 20 Oct — 20.7–20.10 and 20.13 done (exercise key points + cues; cue audit trimmed 5 unsupported cues; 51 cued). SG ch20 checked. Chapter 20 complete except gap 1.
- 20 Oct — Chapter 21 done: phases.js now has PERIODIZATION, TEMPLATE, MOVEMENT_PATTERNS, PHASE_VARIABLES for all 5 phases (synopsis tables recovered from the study guide), GOAL_PLANS (fat loss only; gap 9).
- 20 Oct — Chapter 22 done: new modalities.js (brand names generalised); gap 10 (free weights/cables sections absent); SG ch22 checked.
- 20 Oct — Chapter 23 done: new conditions.js (3 populations, 9 conditions, residual chronic-conditions migrated); scope.js +7 medical rules. TEXTBOOK COMPLETE (gaps 1,2,5–10 logged). Next: handouts, residual review, §3/§4/§7.
- 20 Oct — All handouts done (217 facts: 1RM rule, 5 sample sessions, templates, intake extras, form checks, PAR-Q+ logic). Ledger has no todo rows left.
- 20 Oct — End-of-book residual review: 4 topics migrated (glossary.js, epidemiology.js, injuries.js new; conduct → scope.js); 10 residual entries remain; counts verified.
- 20 Oct — Corrective SEQUENCE filled; name-reconciliation proposal (1 muscle flag, 3/3 hand-check OK); docs/erd.md, uml.md, flows.md (6 diagrams, all render). REMAINING: docs/COVERAGE.md + five-section re-read.
- 20 Oct — Alcohol removed from all knowledge files and docs (owner instruction); OQ17 withdrawn.
- 20 Oct — docs/COVERAGE.md written: page accounting (1,239), 11,402 facts / 22 files, honest pass-two reading, residual, refused, thin sections, open questions, five-section random re-read (2 gaps in 5 sections, both fixed). EXTRACTION TASK COMPLETE.
- 20 Oct — Spec items: Arabic for 83 cues (RTL verified); diagrams confirmed + ERD activation gap fixed; reconciliation re-run vs GitHub (unchanged); 44 new-exercise proposals in tools/, all without images.
- 20 Oct — **Moved (owner):** `docs/COVERAGE.md` → `.claude/COVERAGE.md`, so the coverage report (which names the textbooks) is not published by GitHub Pages; earlier lines that say `docs/COVERAGE.md` mean this file. `COACHING-INTELLIGENCE.md` and `SESSION-AGENT.md` moved from Downloads into `.claude/` so cloud sessions can read them.
- 20 Oct — **NOTE FOR THE APP SESSION — cross-folder change, approved by the owner as a one-off exception to folder ownership.** Three small edits outside the knowledge folders, so the Arabic cues reach `t()`:
  1. `js/i18n/dict.js`: imports `AR` from `../knowledge/cues.js` and merges it into its own `AR` map. The app's own strings win on any clash.
  2. `tests/architecture.mjs`: adds a `knowledge` layer (`js/knowledge/`) that may import nothing. `i18n` may now read it.
  3. `sw.js`: precaches `./js/knowledge/cues.js` and bumps `CACHE` by one.

  Nothing else in `js/i18n/`, `js/ui/` or the tests was changed. If you edit `dict.js`, keep the merge line after the `AR` literal.


- 20 Oct — **Salvaged fixes:** the two 13 Oct UI fixes that never reached GitHub (`patch.js` keyed lists, `photos.js` URL cache) are rebased onto main @ 38126ac as diffs in `.claude/salvaged-fixes.md`, for the session working on main. Not applied here. This folder's other app code is stale and discarded.
---

<!-- Merged 20 Oct from GitHub main (38126ac): the coaching-intelligence session's progress file, kept whole and unedited below. Headings demoted one level. -->

## Progress: coaching intelligence

Where the `COACHING-INTELLIGENCE.md` brief stands, phase by phase, with what checks each
claim. Updated at the end of each round of work.

### Phases

| Phase | State | Where |
| --- | --- | --- |
| 0. Licence rules | Kept throughout. AGPL projects were read for ideas only; no code was copied. Every dataset, formula and idea is in `CREDITS.md` with its licence. | `CREDITS.md` |
| 1. Evaluate the reference projects | Done. The owner said to carry on without waiting for approval, and Phase 2 followed in the same branch; `EVALUATION.md` records that. | `EVALUATION.md` |
| 2. The coaching engine | Done: weekly volume against landmarks, fatigue from RPE at the same load, estimated-max trends, autoregulated progression, weak points, and the insights that rank them. Pure functions with tests. | `js/coach/` |
| 3. OpenPowerlifting percentiles | Done: raw only, adults, best per lifter, IPF classes, deciles. Only the three judged lifts get a percentile. Built by `tools/opl-percentiles.py`; the table is 3.7 KB and the source is never committed (`.gitignore`: `*.opl.csv`). | `js/coach/percentile.js`, `js/coach/powerlifting.js`, Progress → Detailed → Strength |
| 4. How coaching is surfaced | Done. See below. | Coach → Coach AI |

### Phase 4, rule by rule

- **One insight at a time.** Coach AI shows the single most important finding or insight, then "N more things the coach sees" behind a tap. The plan check, when it is opened on purpose, shows them all. The dot on the Coach tab counts them all. *Test: "Phase 4: Coach AI shows the most important thing first…"*
- **Always explain.** Every card says what it saw, in the person's own numbers, and why it matters ("The same 80 kg × 8 went from RPE 7 to 9 over your last 4 sessions…"). The coach chat answers the same way.
- **Always overridable.** Nothing changes without a tap, and every change has Undo. "Keep it as it is" and "Not now" are recorded, so the card does not return next session; it comes back only if the numbers behind it change. *Tests: "Coach: an insight set aside stays aside…", "Plan check: … kept until the numbers change".*
- **Never clinical.** Training language only. For pain, the coach chat says to stop the exercise that causes it and to see a doctor or physiotherapist if it lasts, and that it cannot tell what it is.
- **Earn silence.** With nothing worth saying, Coach AI shows one quiet line ("On track. Nothing to change."), with no heading, no cards, no footnote and no dot. *Tests: "Coach: a log that is on track gets no coach card", "Phase 4: one card at a time until there is nothing to say…".*
- **Arabic.** Every string goes through `t()` with an Arabic entry and is checked in RTL. Figures are isolated as one left-to-right run.

The owner asked for two more surfaces, and both follow the same rules:
- **Progress → Simple**: five plain answers.
- **Ask the coach**: a guided chat in Coach AI that answers from the log, offline, with no model and no network.

### Acceptance criteria

| Criterion | State |
| --- | --- |
| `js/coach/` contains no DOM access | Met. No `document`, `window`, storage or network in `js/coach/*.js`; only its test page touches the DOM. |
| Every coaching function returns a defined result on an empty log | Met. Covered by the coach tests ("empty log" cases). |
| No `NaN` or `undefined` reaches any caller | Met. `t.clean()` checks results all the way down. |
| Percentile tables under 100 KB; the 250 MB source not committed | Met. 3.7 KB; the source is git-ignored. |
| `CREDITS.md` names every dataset, its licence and its use | Met. |
| `EVALUATION.md` exists and was approved before Phase 2 | Exists. The owner chose to proceed without a separate approval step. |
| No AGPL code copied | Met. |
| No new screens before `MASTER-BACKLOG.md` items 1–11 | `MASTER-BACKLOG.md` is not in the repository. The new screens (the Coach hub, Progress → Simple, the chat) were the owner's own requests. |

### Verification

- `node tests/coach.mjs`: all assertions pass (90, including the chat's question matcher).
- A real export with several weeks of data: checked against the owner's own coach program and log, which stay on the build machine and are not committed. The insights were ones a coach would say; the stale-card bugs found this way are fixed.
- A one-session log says "not enough yet" everywhere and invents no trend. *Test: "Phase 4: one session and one weigh-in…"*
- Fully offline: the installed app opens with the network off, every tab works, food search works and the coach chat answers. *Test: "Offline: with the network off…"* Every module the app loads is in the service worker's precache.

## Coaching engine session (js/coach/, branch claude/happy-davinci-vydujg)

- 20 Oct — **SESSION-RULES.md created** (owner-approved one-off exception to folder ownership): the ownership table from SESSION-PLAN.md, copied, nothing more. Note: the table has no row for a coaching session; js/coach/ ownership is per the owner's instruction to this session.
- 20 Oct — **Audit before code.** Phase 2 (2.1–2.6) already exists in js/coach/ and passes `node tests/coach.mjs` (147). Owner: extend, do not rebuild; js/engine/ return shapes unchanged.
  - js/knowledge/ has **no strength-ratio norms** (searched every file; assessments.js bench/squat strength tests carry no norms). weakpoints.js's RATIOS are unsourced → to return "no reference data" (owner decision).
  - js/knowledge/ has **no MEV/MAV/MRV**. BY_ADAPTATION is sets per exercise per session, a different measure, not a second landmark source.
  - **Open, for the app/engine session:** `js/engine/body.js` `bmrOf` falls back to a hardcoded 86 kg when the profile has no weight and there are no weigh-ins (`num(p.weight,86)`). CLAUDE.md: body weight comes from the profile, never hardcoded. Not changed here.
  - **Open, layer rule:** `tests/architecture.mjs` allows js/coach/ to import only js/coach/; js/engine/ imports js/coach/ (lifts.js uses coach/util.js `e1rm`, the one Epley implementation). Awaiting owner decision on how 2.7A gets BMR/targets.
- 20 Oct — **2.5 done** (72e7cb8): weakpoints.js has no unsourced ratios; `weakPoints()` returns no findings, `weakPointReport()` returns `no_reference_data`. `REFERENCE` is empty until sourced norms exist. Cardio-with-no-sets cases added to the strength, fatigue, autoreg, insights and weak-points tests.
- 20 Oct — **2.7 pure core done** (e3df8d6): `js/coach/reconcile.js` (`reconcileNutrition`, `reconcileTraining`) and `js/coach/context.js` (`addFact`, `removeFact`, `listFacts`, `readContext`, `emptyContext`, `KINDS`), with tests. All coach tests: 219 pass (`node tests/coach.mjs` runs 156 of them; see request 1). Architecture rules and the engine tests (355) still pass.
- 20 Oct — **docs/FORMULA-RECONCILIATION.md** written (owner-requested exception: docs/ is the knowledge session's): 17 rows, book against app. **No formula changed.** Owner's rule from 20 Oct: the book is the default, and a changed formula is applied to the whole history at once, never leaving old entries on the old one. The log stores raw inputs only, so a change recomputes history by itself, except `goals` (rebuild it when the formula ships).

**Requests from the coaching engine session (outside js/coach/ — not done here):**
1. `tests/coach.mjs` — add `"context","reconcile"` to `names`. Until then only `js/coach/test/index.html` runs them.
2. `tests/architecture.mjs` — let the coach layer import `js/engine/body.js` (pure, already in `PURE`; no cycle). The owner asked for one thin wrapper in js/coach/ that gets BMR and targets from the engine; the current rule (`coach: ["coach"]`) forbids it. Note: BMR and targets live in `body.js` (`bmrOf`, `macroTargetsOf`), not `nutrition.js`, which reads state.js and so cannot be imported by pure code. **The wrapper is not written until this rule changes.**
3. `js/schema.js` / state — a per-profile `context` field holding `js/coach/context.js`'s store (`{v, next, items}`); absent = empty.
4. `js/engine/body.js` `bmrOf` — the hardcoded 86 kg fallback (above). The 2.7A BMR floor must not rest on it.
5. **`CLAUDE.md`** (owner) — "Formulas — do not change these" conflicts with the 20 Oct rule that the book is the default. Update it before any formula row in docs/FORMULA-RECONCILIATION.md is changed, or every later session will read the change as a violation.
6. Knowledge session — `nutrition-principles.js` `GOAL_STRATEGIES`: the `bunyan` notes are stale. "lose" is now 20% of maintenance capped at 750, not TDEE − 500; "gain" is 10% capped at 300, not +250 (`js/data/goals.js`).

### ⚠ PRIORITY — two bugs for the app session (owner, 20 Oct) — both DONE 20 Oct, see "App session — 20 Oct" below

**P1. `js/engine/body.js` `bmrOf` defaults to 86 kg when no weight exists** (`num(p.weight,86)`). That is the owner's own body weight hardcoded as a fallback: every other profile with no weight silently gets the owner's BMR, and every target derived from it (maintenance, calories, macros) is wrong. It also breaks `CLAUDE.md` ("body weight comes from the profile, never hardcoded"). **Fix:** with no weigh-in and no profile weight, return a "no weight set" result and prompt for a weight, never a default. (The coach's wrapper `js/coach/targets.js` already refuses to call it without a real weight.)

**P2. Two calorie floors.** `targetKcalOf` lets a weight-loss target fall to 0.95 × BMR, which sits **below** the BMR floor the owner set for weekly reconciliation (2.7A). Two floors is the inconsistency being removed. **Fix:** raise the engine's floor to BMR itself, so there is one floor in the app. Nothing automated may take a user below BMR.

### Book values to adopt — for the app session (owner, 20 Oct: the book is the default) — adopted 20 Oct except sets, rest and sessions a week; see "App session — 20 Oct" below

Details and sources in `docs/FORMULA-RECONCILIATION.md`. Each is in `js/data/goals.js` or `js/engine/`, outside the coach's folder. Logged history is not affected (targets and plans are worked out when read); rebuild the stored `goals` when each ships.
- **Fat-loss deficit:** book a moderate **500 kcal/day** (`nutrition-principles.js` `GOAL_STRATEGIES.fatLoss.moderateDeficit`, 9.8). App: 20% of maintenance, capped at 750 (`goals.js` `lose`).
- **Muscle-gain surplus:** book **350–500 kcal/day**, noting a surplus may be unnecessary with high protein (`GOAL_STRATEGIES.muscleGain.surplus`, 9.8). App: 10%, capped at 300 (`goals.js` `gain`).
- **Protein in a deficit:** book **2.4 g/kg** lessens fat-free-mass loss (`GOAL_STRATEGIES.muscleGain.protein.higher`, `fatLoss.protein.findings`, 9.8). App: 2.0 g/kg for "lose".
- **Rep, set and rest ranges:** book Table 20-3 (`acute-variables.js` `BY_ADAPTATION`, 20.3). **Maximal strength 1–5 reps × 4–6 sets at 85–100% 1RM, rest 3–5 min; hypertrophy 6–12 × 3–6 at 75–85%, rest 0–180 s; stabilisation/endurance 12–20 × 1–3 at 50–70%, rest 30–60 s; power 1–10 × 3–6, rest 3–5 min.** App: `goals.js` `TRAIN` (strength main lifts 3–5 reps, rest × 1.3; endurance 10–15, rest × 0.6) and `plan.js` `LEVELS`. Open question 21.
- **Sessions a week by training status:** book beginner 2–3, intermediate 3 (total body) or 4 (split), advanced 4–6 (`VARIABLES.frequency.byStatus`, 20.3). No app counterpart.

### For the Knowledge session

- `nutrition-principles.js` `GOAL_STRATEGIES`: two `bunyan` notes describe the app's old targets. `fatLoss.moderateDeficit.bunyan` says "matches Bunyan's 'lose' target (TDEE − 500)"; it is 20% of maintenance capped at 750. `muscleGain.surplus.bunyan` says "TDEE + 250"; it is 10% capped at 300 (`js/data/goals.js`). Please correct them.
- **Knowledge-base shortfall:** no MRV (or MEV/MAV) for Forearms, Adductors or Neck. The coach's only landmarks are `js/coach/landmarks.js` (RP), which has none for them, so missed sets for those muscles move under the one-set-per-session limit alone, and the result says there is no recovery-ceiling data.

### Coaching engine session — 20 Oct, round 3

- **`tests/architecture.mjs`** (owner-approved one-off exception): the coach layer may now import `js/engine/body.js` (`"engine:body"`), pure and with no cycle. Request 2 above: done.
- **`CLAUDE.md`** (owner instruction): "Formulas — do not change these" replaced with the owner's formula policy and the current choices. Request 5 above: done. **Formula changed: none.** Estimated 1RM stays Epley, capped at 12 (owner decision).
- **`js/coach/targets.js`**: the thin wrapper. `dayTargetsFor` and `reconcileWeekFor` take BMR and targets from `body.js`; no weight → `no_weight`, never a default; past days use the weigh-ins up to that day.
- **Training reconciliation moves what fits:** `kind` adjust / partial / week_fine, with missed, moved and gone per muscle ("1 of 6 moved to Saturday, the other 5 are gone"). A muscle with no MRV moves under the one-set limit alone and is marked `ceiling:"none"`. Results carry `landmarks.js` `BASIS` ("practitioner heuristics … not measured constants").
- Tests: 235 pass in `js/coach/test/index.html` (checked headless) and in Node; `node tests/coach.mjs` still runs only the original ten files (request 1 open). Architecture and engine tests pass.

### App session — 20 Oct

**Salvaged render fixes** (8cb0436): `.claude/salvaged-fixes.md` applied exactly. The base blobs matched (patch.js 7bee43a, photos.js f405001). `js/ui/patch.js` inserts or drops a keyed element where the list gained or lost one (`keyAhead`) instead of replacing every row after it; `js/ui/photos.js` keeps each photo's address by id and revokes only the ones removed. CACHE bunyan-v134. Full browser suite 192/192 before the rebase onto f3154d4.

**P1 done: no weight is never a default weight.** `bmrOf` returned the owner's 86 kg for any profile without one. Now:
- `js/engine/body.js`: `weightOf` (weigh-in, else profile, else 0) and `missingOf` ("no_profile" without age or height, "no_weight" without a weight, the coach's words). `bmrOf`, `tdeeFormulaOf`, `targetKcalOf`, `kcalFloorOf` and `macroTargetsOf` return **null** when something is missing; `maintenanceInUseOf` returns `{kcal:null, source:"none"}`. A learned maintenance with no weight still gives no target, since the floor needs BMR.
- The same 86 was in four more places, two of which **wrote it**: the weigh-in sheet's stepper started at 86 and Save kept it as a weigh-in (`sheets.js`, `handlers/progress.js`); the You sheet prefilled Weight with 86 and Save stored it as the profile weight (`settings.js`); the stepper's +/- stepped from 86 (`handlers/session.js`). Now the weigh-in is an empty field to type into when no weight is known, Save with nothing typed saves nothing (and checks 30–300 kg), and the You sheet's Weight is empty until entered.
- Every caller handles null and asks for what is missing: Targets ("Log your weight…" with Log weight, or the You sheet when age/height are missing too), the chat's calories, protein and goal answers, the plan-check fixes and the chat's goal/kcal buttons (open the weigh-in), Use these targets, the assessment preview, `learnedDiffers`. Strings through `t()` with Arabic; checked in RTL.
- Also fixed in the weigh-in sheet: its instruction line and Save label were raw English, not through `t()`.

**P2 done: one floor, BMR.** `kcalFloorOf` = BMR, never under 1,200 kcal (women) / 1,500 (men); the old 0.95 × BMR while losing is gone. It applies to every goal's target and to the chat's "eat N kcal less" step (which only had 1,200/1,500). Nothing automated now sets a target under BMR. The 1,200/1,500 minimum stays as an absolute minimum and only binds when BMR is below it (a small, older woman); the coach's reconciliation (`js/coach/reconcile.js`) holds days at BMR alone, so for such a person a reconciled day could sit between BMR and 1,200. Owner to decide whether the minimum stays.

**Formula changed: the textbook's values (owner, 20 Oct; docs/FORMULA-RECONCILIATION.md rows 2, 3, 4, 7, 13).** Formula version 2, from 20 Oct 2026:
| What | Was (version 1) | Now (version 2) |
| --- | --- | --- |
| Fat-loss deficit | 20% of maintenance, at most 750 | **500 kcal/day**, fixed (`goals.js` `lose.fixed`) |
| Muscle-gain surplus | 10% of maintenance, at most 300 | **350 kcal/day**, fixed — the low end of the book's 350–500, since most of a larger surplus is stored as fat (`gain.fixed`) |
| Protein, fat loss | 2.0 g/kg | **2.4 g/kg** (`lose.protein`) |
| Lowest target | max(0.95 × BMR while losing, 1,200/1,500) | max(BMR, 1,200/1,500), every goal |
| Strength main lift reps | 3–5 | **1–5** (`TRAIN.str.main`) |
| Endurance reps | main 10–15, accessories 12–15 | **12–20** both (`TRAIN.end`) |
Recomposition and Get stronger keep a capped share of maintenance (the book gives no figure for them). `kcal` stays on lose and gain as the direction the plan check reads. Not changed, not asked: sets and rest by adaptation (strength main lifts get 3–4 sets and 150–240 s rest against the book's 4–6 sets and 180–300 s; endurance main lifts 60–120 s against 30–60 s), sessions a week, power's 1–10. Recomposition's protein stays 2.2 although it runs a deficit (the book's 2.4 is "in a deficit"): owner to decide.

**History under one method.** Logged entries store only what was entered, so estimated maxes, volume, BMR, maintenance and every suggested target recompute by themselves. The stored targets (`goals`) do not: `js/engine/retarget.js` rebuilds them once per profile (`formulaV` 1 → 2, at start-up, profile switch and restore) **where they are exactly what version 1 produced** (energy in tens, fat the goal's share, carbs the rest, protein version 1's g/kg of a weight the profile has had) and version 2 gives this person different numbers. Targets typed on the Targets screen, read from a PDF or moved by a coach step are the person's and are kept; the Targets screen offers the new suggestion beside them. Rebuilt targets say so in a toast with Undo. Without a weight they are left as they are. Generated programs keep the rep ranges they were made with (they are the person's, possibly edited); a plan generated from now uses the new ranges. `formulaV` is deliberately not in `DEF`, or `normalize` would mark old blobs current.

**Found, not fixed — owner to decide:** a new profile's `goals` default (`js/schema.js` `DEF`) is 1,950 kcal, 175 g protein, 170 g carbs, 62 g fat. Those look calculated and are shown as targets before anything is entered — the same kind of value as the 86 kg. Making them empty needs every screen that reads `S.goals` to handle no target; not done in this unit.

**For other sessions:**
- Coaching session: `js/coach/targets.js`'s header says `bmrOf()` falls back to a fixed weight; it no longer does (null, and `missingOf` gives the same "no_profile"/"no_weight"). If the reconciliation should use the app's one floor including the 1,200/1,500 minimum, take `kcalFloorOf` instead of `bmrOf` for `bmr`.
- Knowledge session: `docs/FORMULA-RECONCILIATION.md` rows 2–4, 7 and 13 are now adopted (above). `nutrition-principles.js` `GOAL_STRATEGIES`: "lose" is now TDEE − 500 (the old note is right again); "gain" is TDEE + 350, not + 250.
- Request 1 (`tests/coach.mjs` names) is still open: `context`, `reconcile` and `targets` pass when run directly (79 tests, run against these changes).

Tests: engine 388 (new: `js/engine/test/retarget.test.js`, body tests for no weight and the floor), coach 156, architecture (153 modules, `retarget.js` pure and precached), browser suite 198/198 (six new: no weight on Targets and the weigh-in, the You sheet, the chat, the floor at BMR, the rebuild with Undo, kept targets). CACHE bunyan-v135.

### Design import — 20 Oct

- Design session's files committed from its two published prototypes (workout screen, Ask panel): `design/workout.html`, `design/chat.html`, `design/tokens.css`, and `docs/design/` workout-spec, chat-spec, token-requests, workout-diagnosis, palette-comparison, coachchat-current, arabic-names-audit. Copied byte for byte; the copies shared by both pages were identical.
- **Not recovered:** the captures in `docs/design/current/` (PNGs the diagnosis and CoachChat notes cite) and the Design session's own PROGRESS entries (the main → design system colour re-sync task, the proposed Arabic rope-pushdown name). Neither page published them; they exist only on that session's local branch.
- No change to `js/`, `css/` or `index.html`.

## Workout implementation (6b) — branch session/workout-impl

Owner's brief, 20 Oct: build docs/design/workout-spec.md into the app, workout screen only (not the Ask panel). Note: SESSION-RULES.md has no 6b row; this session edits `js/ui/` (Stabilise's) and `index.html` per the owner's instruction for this task.

- 21 Oct — **Tokens** (token-requests.md §2–§4, approved 20 Oct): `--onDanger` (#FFFFFF, all six themes); `--color-action-fill` / `--color-action-edge` (Red: accent-deep, with a 1.5px Machine Red edge in Red dark; Blue and Sage: accent); `--color-danger-action-fill` (danger-deep). Applied to the primary `.btn`, the confirm sheet's primary, the destructive confirm (now danger-deep + onDanger, no `#fff`), and the Red dock pill (accent-deep). Other accent-gradient fills with labels elsewhere in the app (`.btn.fadd`, `.thero2 .btn`, `.pill.a`, `.tnext`, day chips…) are **not** changed: outside the workout screen. Listed for a follow-up.
- 21 Oct — **Components** (`js/ui/views/session.js` `vLogger`, `js/ui/workout.js`, `js/ui/handlers/session.js`, `js/ui/actions.js`, `js/ui/sheets.js` done sheet, CSS in `index.html`): WorkoutHeader (glass only here; "n sets logged" and the Resting bar gone), ExerciseLine (ⓘ → exercise sheet, ⇄ swap, + Warm-up, + Set), RestBand (replaces the full-screen rest; `#rest` stays empty; time-up band `role="alert"` on the action fill; alarm unchanged), SetCard (76/56px numbers as inputs that select on focus, 56px steppers from `incrementFor` → `incrementOf`, RPE chips 6–10 when asked), LogControl (logs from the rest, ~2 s "Set n logged" + Undo, 700 ms guard kept, Undo ignored for 800 ms after a log), NextExercise, SetHistory (✕ leading, delete confirms in the row, tick takes back), WarmUpSet (`e.wuq` queue; logged sets carry `wu:true` exactly as before), Tools (Skip/Add tiles, Remove/Something hurts? quiet links), WorkoutComplete (ok check, stats, PR card and Progression earned moved here). The 3D figure, photos and tags are no longer on the screen (they are in the ⓘ sheet). The segment strip and ‹ › arrows are gone (NextExercise and the title's list replace them; the swipe stays). Flat page on the workout: `body.wkflat` hides the ground and drawing.
  - Volume, records and progression maths unchanged. Warm-ups still `wu:true`; `recordIn` already skips them.
  - **Decisions taken (flag for owner):** (1) bodyweight lifts: `incrementOf` returns 0 for Bodyweight equipment, so their added load steps by `incrementOf`'s "Other" step (2.5 kg / 5 lb, capped at a tenth of the load, at least 1 kg). (2) Logged sets are no longer edited in place on this screen (the rows are text, per the spec); fix by tick-undo, or after the workout with Edit. (3) The prototype's cue "Hold the weight, chase a rep" stands for the engine's own note; the card shows `recommend().note`, the actual reason. The string is in the dictionary but not shown. (4) `syncDraft` now skips warm-ups when pre-filling a working set (otherwise the working set would start at the warm-up's weight).
  - Old CSS for the full-screen rest (`.rt*`, `.restwrap`) and the exercise hero (`.exhero`) is now unused; left in place for a cleanup pass.
- 21 Oct — **Verified and opened as draft PR #47.** Regression suite: 193 pass, 1 fail (the same "Back returns… a tab opens at its top" failure that `main` has); architecture, engine and coach tests pass. Every state checked in headless Chromium at 390 × 844, LTR and RTL, all six themes, offline: no page errors, no text below AA. Not checked: the header blur on a real iPhone.
- 21–26 Oct — **Workout screen, revised (owner's redesign brief of 21 Oct, which supersedes parts of the spec):** selective card glass (translucent `--card` + rim over the flat page; only the header blurs); compact sizes (64px numbers, 50px for 4+ characters, scaling to the column with a container query; 52px steppers; 64px log control; compact rest band); unit beside the number; uppercase value labels; a "Suggested" tag and quieter numbers until a value is touched; "Add warm-up" (flame) and "Add a set" chips; next exercise as one row with its thumbnail; sets as one list with hairlines, delete leading, state ring/tick trailing; **logged values editable in place again** (`editLoggedSet`, as before the redesign); tools read "Skip exercise" / "Add exercise", quiet "Remove exercise" / "Something hurts?". Workout icons moved into `js/ui/glyphs.js` (one stroke style). "How do you feel today?" stays readiness for the day (it adjusts the recommendation), not set feedback, so its wording is unchanged.

## Red repalette and the floating Coach — branch session/coach-float (stacked on session/workout-impl)

Owner's brief, 26 Oct (with a reference image): Red becomes red on night navy, matching the reference; the Coach becomes a floating, contextual assistant instead of a docked destination.

- 26 Oct — **Red repalette** (`index.html` theme blocks, `js/ui/theme.js` swatch, `js/ui/settings.js` icon swatch). Colours sampled from the reference image, not estimated: page `#03060F`, cards `#081224` (card glass `rgba(12,26,52,.62)`), chips and fields `#0E1B30`, border `#1C2A44`, action red `#E7172E` (new `--signal-red`), labels on it `#FFFFFF`, secondary text `#A9B7CE`, dim `#8496B3`, accent as text `#FF5A6A`; the ground is navy lit red from the top right. Red light keeps its Glacier page and takes the same Signal Red with white labels. **White on `#E7172E` is 4.6:1**, so Red's label fill is its accent again (the 20 Oct `accent-deep` + Machine Red edge workaround for Red is removed; the aliases stay for Blue and Sage). The dock pill is Signal Red with a white name. Machine Red (`#FF2E3A`) stays only in the token list and the app icon PNGs (`icon-red-180.png` not regenerated: flagged).
  - **Bug fixed from PR #47:** in Red, dropping the primary button's gloss also dropped its fill (`.btn`'s colour came from `background-image`), so primary buttons such as "Export a backup" and the confirm sheet's primary had no red. They now take `--color-action-fill` as a background colour.
- 26 Oct — **Floating Coach** (`js/ui/coachfab.js`, new; wired in `render.js`, `nav.js`, `app.js`, `handlers/coach.js`, `handlers/common.js`, `handlers/fields.js`, `handlers/session.js`, `sheets.js`, `dock.js`, `views/chat.js`, `views/coach.js`; CSS in `index.html`; precached in `sw.js`). One component, one visibility policy (`fabShown`): the launcher shows on the roots of Train, Food, Progress and Plan; never over a live workout or run, a sheet, the assessment, a builder, a meal, a sub-screen, or while the keyboard is up; it slides away with the dock while scrolling down. The panel opens from it (260 ms scale from the launcher, veil, reduced-motion respected), compact by default (the newest exchange, three questions for where it was opened, the field under the conversation), full height by a tap, closed by ✕, the veil, Escape or the back gesture. It lives outside `#app`, so the screen under it is never rebuilt and closing it returns to exactly where you were. An answer's button that goes elsewhere closes it. **Same conversation and matcher as before** (`S.chat`, `js/coach/intent.js`, `ask()`, `bubble()`, follow-ups in the conversation's language): nothing new is claimed and nothing is sent anywhere. The old full-page chat route (`V.chat`) now opens the panel full height.
  - **During a workout:** "Ask Coach" is the first item of the ⋯ menu; the panel opens over the set with workout questions (what to lift, sore or tired, short on time); closing it leaves the exercise, typed values, sets and rest untouched (regression test).
  - **Fixed while building:** tapping send (or an answer's button) blurred the field and the panel jumped by the dock's height between touch and click, so the tap landed on whatever moved under it. The panel now holds its position through `body.kbleave`.
- **Decision for the owner: the Coach tab.** The brief says to remove the docked Coach tab, but that tab is the **planning hub** (programs, the exercise library, the meal plan, targets, your own foods, Coach AI's weekly check and advice); removing it would cut off all of that. Done instead: the tab is renamed **Plan** (clipboard icon), unchanged inside; only the conversation moved out to the floating Coach. Alternatives if the owner prefers: fold Training planning into Train and Nutrition planning into Food and drop the tab; or a "More" tab as in the reference image.
- 26 Oct — **Workout screen in the mockup's colours** (owner: colours, saturation and the glow of the dark blue rectangles did not match; preference: dark, high-contrast, like an iPhone set to dark large icons). Values sampled from the owner's workout mockup into `--wk-*` tokens: page `#030B19`, cards `#0E1A2E` with a `#2A446E` rim (brighter `#405881` along the top) and a soft blue glow; wells `#13223A`/`#2C4874`; secondary type `#B4CAEB`, dim `#9EB5D2`; the check a `#A8D3FD`→`#92C5FD` gradient with a glow under it; done ticks `#4C85CB`. Exact in Blue dark; Red dark uses the same navy with Signal Red for the check and ticks; Sage and the light modes keep their card glass. Big figures stay white while suggested (the tag says so). Contrast sweep (gradients now measured at every stop): 0 below AA in all 12 theme × direction runs.

## Layout fixes and the coach's action half — branch session/agent-actions

Owner's brief, 26 Oct: Part 1 layout fixes, Part 2 the agent (actions), Part 3 knowledge and voice, then items 16–18 (unstructured input, no guilt-driven restriction, remembered context). Service worker `bunyan-v137`.

- 26 Oct — **Part 1, layout.** The "Ask me anything" card is gone from Plan; the conversation opens only from the floating Coach. The launcher is now **docked beside the dock, in the dock's own band** (`#cfab` anchored to `--dock-lift`, the dock giving up `--dock-h + --s2` on the right when it shows, its circles narrower so the open pill's name still fits at 360px): it can no longer cover a card, a value or a tap target, and the page already ends above the dock (the extra `padding-bottom` that made the dead area under the dock is removed; so is `body.wkflat`'s `min-height`). The panel opens showing the top of the newest exchange (`toEnd()` scrolls to its question, and in compact to the top), not its last line. **Viewport:** every `100vh` used for a layout height is `100dvh` (or `--vvh` from `visualViewport`, with `100dvh` as the fallback); the one exception kept on purpose is `min-height:100lvh` in standalone display mode, the documented iOS dead-band fix — switching it to `dvh` brings that bug back. The viewport is re-read on `pageshow`, `load`, `visibilitychange` and `orientationchange`, twice more after first paint, and when a sheet's scroll lock is released, so a first paint against the wrong height corrects itself without a relaunch. **Not verified by a cold launch from an iPhone home screen** (no device in this session): measured in headless Chromium at 390, 375, 360 and 320 wide, LTR and RTL, with a regression test that scrolls every tab to its end.
- 26 Oct — **Part 2, the agent.** `js/ui/handlers/actions.js` (new): a registry of named actions grouped by domain (`exercise.add/remove/swap/swapToday`, `set.log`, `food.log`, `progress.weighIn`, `plan.calories/goal`, `profile.reassess/open/you`, `cardio.open`), each with a description, parameters and `confirm`. Every one runs **through the branch the screen's own button runs** (`dispatchTap` with the same data-* key: `pickex`, `rmex`, `saveweight`, `logset`, `chatkcal`, `setup`…) or the same function (`logFood`, lent through `common.js` so handler modules still do not import each other). A regression test checks that every tap key the registry uses is a registered branch. Undo is one step for the session: the state an action touches is copied before it runs and put back on Undo.
  - `js/coach/intent.js`: new intents appended, the parser untouched — `exadd`, `exremove`, `exswap` (its own intent: `swap` stays the food swap, and which one a message is decides on what it names), `foodlog`, `weighlog`, `reassess`; plus `kg`/`unit`/`grams` read from the message. A message starting with the verb is that request ("add squats").
  - `js/ui/agent.js` (new): finds what a request names with the matchers the app already has (the program import's `matchExercise`, the picker's `tokenMatch`/`fuzzyRank`, `searchFoods`/`fuzzyFoods`/`parseFoodInput`, the split's day names). It never invents: one good match → a confirmation; several → "Which exercise?"/"Which day?"/"Which food?" with the real entries; only near misses → "No exercise called “…”. Closest:" with real library entries and None of these. A misspelt food now gets the same close-matches shape instead of a silent match (that silent fallback is what answered a training question with food facts).
  - Confirmation, applied and undo follow `docs/design/chat-spec.md`: inline in the panel (never a sheet), the action's own verb ("Add it" → "Added …"), Not now, an applied row with Undo that stays for the session, an undone row. While an action runs the panel stays open over whatever screen it moved to, and the screen's own toast is muted (the row says it).
  - Render granularity: every exchange is in the panel, keyed (`data-k`); compact hides the older ones with CSS, so sending appends one row and the earlier rows are the same DOM nodes (regression test). The "Show the whole conversation" button keeps its place (hidden when not needed) so the positional patcher never shifts the rows.
- 26 Oct — **Part 3, knowledge and voice.** `js/engine/kb.js` (new) reads `js/knowledge/` (acute-variables, nutrition-principles, scope) and returns each number with the entry it came from. New answers for reps, sets, rest, frequency, weekly volume, tempo, warm-up, session length and the 1RM estimate: the knowledge file's range beside the person's own program or log, and the source in More ("From the coaching notes: Training variables 20.3"). The protein answer's range is now the knowledge file's (1.4–2.0 g/kg, nutrition-principles 9.2), replacing a general-knowledge 1.6–2.2. **The scope check runs first, whatever the question:** diagnosis or injury assessment, medication and medical conditions, supplements, and mental health each get who to see and what the app can show instead, citing the `scope.js` rule. Outside what it knows it says what it understood and where to go (height → Profile > You with an Open it button; heart rate → "not something I have data on", with what it can show); nonsense says it won't guess. Every answer leads with one or two sentences (figures in `.num`); the rest is behind More (`<details>`).
  - **Layer rule changed** (`tests/architecture.mjs`): the engine may read `js/knowledge/` (for `kb.js`); `handlers/actions.js` is shared like `registry.js`/`common.js`.
- **Open points for the owner:**
  - The weekly volume range per muscle (e.g. chest 12–20) is **not in `js/knowledge/`**: it is the app's own `js/coach/landmarks.js` (Renaissance Periodization heuristics). The volume answer uses it and says so in its More; the knowledge entry it cites is only "several sets beat one".
  - Some library exercises share one Arabic name (`exName`), e.g. two "بنش بريس"; when they appear together in a choice, the English library name is shown under each. The pending library renames and Arabic name fixes were **not** applied (waiting on the owner's batch review).
  - Not built from the spec: the tab behind scrolling the changed row into view with an "Added" outline (the applied row in the panel says it instead). The answer header still shows the "Coach" label.
  - Older answers that still state the app's own heuristics rather than a knowledge entry: the balance answer's "10 to 20 hard sets a week", the water answer's 35 ml/kg (the app's target arithmetic).
- 26 Oct — **Items 16–18.** Part 1 went into commit 1c80918 together with Parts 2 and 3 (not in a commit of its own); all of it was pushed before items 16–18 were started.
  - **Unstructured input (16).** `situationOf()` in `js/coach/intent.js` (pure) reads a report rather than a question: its signals (missed, didn't, skipped, bad day, tired, stressed, sore, blew, overate…, and the Egyptian Arabic for them, with the prefixes Arabic writes onto words) and what went off (food, training, sleep/energy, pain; "day" when nothing says which). A question is never a report. The answer acknowledges in one clause and asks **one** question with its answers as buttons. Food → "Work out the week" (`reconcileNutrition` in `js/coach/reconcile.js`, against `S.goals` and the engine's BMR, today closed as logged; a day with nothing logged is no history and is said to be uncounted) or "Just log it"; training → "Work out the week" (`reconcileTraining` for fixed-weekday programs, sets per muscle counted the app's way, both numbers said; a rotation loses nothing) or "Just move on"; sleep/energy → "Adjust today" (the low-day effort guidance and the coach's own fatigue reading, if any) or the recovery log; **pain → the recovery log only, no advice** — the old pain answer's advice ("stop the exercise", "train around it") is gone; asked about pain, the answer is the scope referral with what in the next workout loads the area.
  - **No guilt-driven restriction (17).** The reconciliation spreads the gap over the days left, at most 15% a day and never under BMR (reconcile.js's limits), protein held; it never offers a stricter tomorrow and never changes the app's targets ("Your targets in the app stay as they are"). If the gap doesn't fit, the answer is "The week is still fine…", plainly.
  - **Context (18).** A statement about the person's life ("I work 13-hour days", "I can't do squats", "I don't eat pork"; `factOf()` in intent.js) is answered with an offer to keep it **in their words, under the kind they pick** (four buttons, plus Don't keep it); nothing is kept without that tap and nothing is inferred (`js/coach/context.js`, `S.context`, per profile). "What have I told you?" (also a row in Profile) lists every kept fact with a Delete button. Kept facts are said back where they bear: schedule and obstacles on today's workout, short-on-time, session length, frequency and the week's training; food-related ones (by their own words) on the food answers; and an exercise in today's workout that a constraint names ("You said “I can't do bench press”, and Barbell Bench Press is in it.").
  - `tests/coach.mjs` now also runs the `context` and `reconcile` tests (PROGRESS request 1 from 20 Oct): 228 pass.
- 26 Oct — **Fix from the owner's screenshot** ("Can u add push ups to my current week?" with a Push day answered "No exercise called “ups current week”"). Three causes in `js/ui/agent.js`: (1) a day's name was taken as the day wherever its word appeared, so "push" in "push ups" became the Push day — now a day name counts only where it is said as one (after to/from/in/on/for or the Arabic for them, or before day/workout), and only that occurrence is taken out; (2) "current week" and the like were not set aside as filler; (3) a name split or run together ("push ups", "pushups", "push-ups") now matches the library entry directly. Regression test added. CACHE `bunyan-v139`.

## Workout: a one-time swipe hint — branch session/swipe-hint

Owner, 26 Oct: like the first-run guide, an arrow at the right edge of the screen and an animation showing to swipe left for the next exercise. CACHE `bunyan-v142`.

- `js/ui/tour.js` (`swipeHint`): the first time a workout of more than one exercise reaches its first exercise, the screen dims, a tab with an arrow sits at the edge the next exercise comes from (right in English; left in Arabic, where swiping right is next, as `exswipe.js` already does), and a finger slides across from it, looping, over one line: "Swipe left for the next exercise", with "And right to go back. The list at the top reaches any of them." A tap anywhere, Escape, or moving to another exercise puts it away for good (`S.prefs.toured.swipe`, per profile; Profile → Show the guide again brings it back with the other guides). With Animations off or reduced motion, the finger and arrow stand still.
- Regression test added (English and Arabic edges, tap, moving on).
## Chat: scroll in compact, follow-ups in context, a day of history — branch session/chat-context

Owner, 26 Oct (with screenshots): compact can't scroll through messages; the coach doesn't remember the context within the session ("Is it pull ups?" after a close-matches answer got "I won't guess"); erase chat history after 24 h but keep the context. CACHE `bunyan-v141`.

- **Compact scrolls.** Every exchange is in the panel at both sizes and scrolls; compact opens on the newest. "Show the whole conversation" is gone (the ⤢ button remains for full height).
- **Follow-ups.** Within 30 minutes of the last exchange: a typed answer to a pick is that pick ("Is it pull ups?", "the first one", a day's name, "for today"); "yes"/"no" to a waiting change is Add it / Not now (the same tap); "yes" to a choice asks it again; "and squats" / "and a banana" repeats the last request with the new thing. Only what the pick asked for is looked for, never invented (`answerPick` in `js/ui/agent.js`). "yes"/"no" are never read as food names.
- **24-hour history.** Messages older than a day are dropped when a question is asked and when the panel opens. What the person asked the coach to keep (`S.context`, js/coach/context.js) is separate and untouched; it is per profile, saved with the profile and included in backups.
## Workout: the next exercise in view, and no photo flash in the exercise sheet — branch session/workout-next

Owner, 26 Oct: "when I start a workout, I don't see the small reminder of the next exercise; this page should be as simple as possible" and "when I click the i, the 3D video flashes and shows the old start and end photos". CACHE `bunyan-v140`.

- **Next, in view.** The Next card sat under the log button, the feel chips and the recommendation, below the fold on a 375 × 667 phone (or with Display Zoom). It is now one quiet line under the exercise's name ("NEXT Wide-Grip Lat Pulldown ›", one tap goes there; inside a superset, the next in the round), and the card lower down is removed. The warm-up card says what follows it ("THEN Barbell Bench Press").
- **No flash in the exercise sheet.** The 3D figure's start and end photos were its first frame: the sheet showed them at 8:3, then the figure replaced them at 4:3. The photos are now only the fallback (`data-still`: no WebGL2, an error, no record, or not drawn within 4 s); until the figure is drawn the stage is empty at its final size. `patch.js` keeps `data-still` as a runtime attribute, like `data-live`.
- Regression test added; the navigation test now taps the new line.

## Workout polish — branch session/workout-polish

Owner, 26 Oct (screenshot of a Pushups set): remove Add warm-up; Add a set under the sets, not above; when the rest finishes, close it or extend it; the warm-up screen reads like a PDF and its icons flash at the start; fix the tab-history test that fails on main. CACHE `bunyan-v143`.

- **The failing test** ("Back returns… a tab opens at its top", red on main for weeks) was the test, not the app: it scrolled down, which puts the dock away (`nav.dhid`, faded out), then tapped where the hidden dock was. `tapTab()` now scrolls up a little first when the dock is away, as a thumb would. The same helper fixes the intermittent "tab taps do not grow the browser history".
- **Add warm-up** is gone from the exercise screen (the warm-up set logic stays, for sets already logged). **Add a set** is the last row of the sets list.
- **Rest complete** now carries **+30** (a fresh 30-second rest from now) and **✕** (puts it away), on one line with the text.
- **Warm-up screen**: a short header (before you start · about N min, the muscles, "0 of 6 done" with a bar), one card per step, no photos or drawings in the rows (they loaded at different moments and flickered; the name still opens how to do it), the ramp-up's explanation behind "Why", and Start the workout / Skip pinned at the bottom with what comes after it.
- Regression tests added for each.
- **Noticed, not changed:** the owner's screenshot shows Pushups with an *added* weight of 86 kg suggested ("Recommended 86 kg × 8–20 · Same weight, aim for more reps"). That reads as 86 kg logged as added load on a bodyweight lift earlier (e.g. body weight typed into the +KG box, or a session from before the 86 kg default was removed). Needs the owner's data to confirm; not touched.

## The coach, local and smarter — branch session/local-brain

Owner, 26 Oct (three screenshots): the coach loses the thread ("How many hours should I sleep?" got the soreness answer, then "Yeah but how many hours?" got "I won't guess"), can't reach the knowledge base, and should be able to do everything the user can do in the app; "except for the APIs and agents, make it local". No model, no network, nothing leaves the phone (SESSION-AGENT.md's "no LLM" respected). CACHE `bunyan-v144`.

- **The whole knowledge base answers** (`js/engine/kbsearch.js`): 16 knowledge files cut into ~1,060 passages, ranked against the question with BM25, a light stemmer, a synonym table (English and folded Egyptian Arabic onto the files' own words), phrase rules ("best time", "how long", "how much fat"), and a lift for the passage holding the figure a "how many/how much" asks for. Weak matches are not answers (two of the question's words, or one naming the passage, and a score clear of noise); "what is the capital of France" still gets "I won't guess". Left out on purpose: scope, conditions, injuries, supplements, residual, cues. `chat.js aKnow` leads with the best line, lists the rest under More, then the person's own side (nights of sleep logged, water target and today, protein/macro targets, cardio minutes this week, training days) and the button to act on it. Lines for the other sex are dropped when the profile says which.
- **When it answers instead of the fixed answers:** a question none is for; one the matched answer is only loosely about (a one-word match like "sleep" → soreness, when asked as a question); "what is / why / how many / before a workout" against a soft answer.
- **Context:** a short follow-up ("yeah but how many hours?", "and…", ≤4 words) is read with the question before it; "why?" / "more" after a knowledge answer gives the next lines.
- **Sources are kept, not shown.** "From the coaching notes: …" is gone from the bubble; the entry stays on the message and as `data-src` on the answer (tests read it there).
- **Doing things** (`js/coach/commands.js` → `agent.js planCommand` → new registry actions in `handlers/actions.js`, each the app's own tap): open any place (Food, Training, Progress, Coach, Profile, meal plan, targets, program, programs, history, weigh-in, steps, sleep, activities, assessment, settings, your details, backup, new meal plan); add water ("two glasses", "500 ml", "شربت كوبايتين مية"); log steps; units, language, light/dark, colour theme (at once, with Undo); start today's workout, next exercise, finish (the app's own confirmation), skip or extend rest; log a set ("80 kg for 8"); raise/lower calories; change goal. Anything that writes the log or the plan waits for a tap, as before. Questions are never commands ("how much water should I drink" is answered).
- **Arabic:** every new string has an entry. The knowledge files are English data, so their lines stay English inside an Arabic answer (as food names do). Translating the knowledge base is the remaining gap.
- Regression tests added (knowledge answers and follow-ups, Arabic, commands with Undo, Arabic water); the knowledge-citation test now checks the source is kept and not shown.

## Plan harmony, the textbook's sets and rest, the owner's ground picture, the result page — branch session/plan-harmony (stacked on session/local-brain)

Owner, 26 Oct (screenshots): right after retaking the assessment (Endurance and fitness, bodyweight, 3 days, 45 min) Coach AI said "Some muscles get little training — Balance the volume" about the plan the app had just built; is the assessment following the knowledge base; Training's background is a flat redrawing of the owner's 3D picture; and a drawing of how the result page should look. CACHE `bunyan-v145`.

- **Why the app argued with itself.** The plan check judged every goal against the muscle-growth weekly range (RP landmarks, `RANGE` by level), but the builder only fits what the session length allows, and for a non-muscle goal that range was never the target. Now:
  - `js/coach/landmarks.js` `rangeFor(level, train)`: the weekly floor applies to the "hyp" goals only (lose, recomp, gain); strength, power, endurance, mobility and general fitness have none (the textbook prescribes them per exercise), only the ceiling (`ceilingFor`).
  - `volume.js volumeCheck(prog, level, train)`, the builder's `balance` and the plan check all read it, so the three can't disagree.
  - The plan check offers "Balance the volume" only when it would move something (`canBalance` dry-runs `rebalance` on a copy): a full schedule isn't a finding.
  - `coachinfo.js`: "Less training than your program has" counts a muscle as planned only where the program gives it at least its mev, so it can't blame skipped sets for what the program never had.
  - Regression test "Harmony" reproduces the owner's case (fails on the old plan check, passes now) plus three other profiles.
- **The textbook's sets and rest (owner: the plan follows the knowledge base; this was the open item from 20 Oct).** `plan.js shapePlan`: every prescribed lift's sets go into the adaptation's range (endurance 1–3, hypertrophy 3–6, strength 4–6, power 3–6; `BY_ADAPTATION`), the main lift's rest into its range (endurance 30–60 s, hypertrophy up to 180 s, strength and power 180–300 s), other lifts no longer than the range. Mobility and general fitness have no row and keep the level's. Time trimming still comes after.
- **Recomposition protein 2.2 → 2.4 g/kg** (it runs a deficit; the book's 2.4 is for a deficit). Formula version 3: `retarget.js` rebuilds version 2 recomposition targets once, if they are exactly what version 2 made (same rule as before: typed targets are kept). Endurance 1.6 and strength 1.8 stay; both are inside the book's 1.4–2.0 for people who train.
- **Training's ground is the owner's picture**, one per theme (`img/ground-red.jpg`, `-blue`, `-sage` = the green one for Sage), cut from the owner's upload. It sits at the top and fades out, and is faint in light mode. `js/ui/scene.js` (the flat redrawing) is removed. Other pages keep their drawings.
- **The result page as drawn:**
  - Daily targets as five tiles with icons.
  - Training: the split's name, its reason (now in Arabic too; `whyThisSplit` goes through `t()`), the alternatives, and each day as a row with its first exercise's picture that opens to the whole day with doses.
  - Weekly training load: a bar per muscle in its own ink. Out of the ceiling; the range band only for muscle goals.
  - Meal plan as cards (Arabic food names where the database has them).
  - Back and Use this plan side by side.
- **Food photos:** the meal cards use glyphs. There are no food photographs in the app, and none are invented (CLAUDE.md, Honesty): waiting on the owner for photos.
- **Noticed, not changed:** in the bodyweight endurance plan, "Bent Press → Butt-Ups" (a kettlebell press swapped for a core move) is the stand-in logic's choice; worth a look in the movement table.

## Every place on its own picture — branch session/page-photos

Owner, 26 Oct: a sheet of eight photographs, one per place (home, training, start workout, warm-up, food, coach, progress, profile): "crop and use this instead, every picture has its location". CACHE `bunyan-v146`.

- Cut into `img/page-{home,training,workout,warmup,food,coach,progress,profile}.jpg`, leaving out each tile's caption, the menu over the profile tile and the made-up stats panel over the progress tile (CLAUDE.md, Honesty: no invented figures on screen).
- `js/ui/bgart.js` is now the pictures only; the line drawings and the per-theme rider (`img/ground-*`) are gone. `render.js groundOf()` picks the place: Training's first page is home, a day before Start workout is workout, planning (builder, library, Coach → Training) is training, Coach → Nutrition is food, Coach AI, the chat and the assessment are coach.
- The workout keeps its flat ground (workout-spec.md), so the warm-up's picture is in the warm-up card's header (`.wu-art`).
- Each picture has a veil of the ground's own tone, darkest at the top, so titles read on a bright sky; Coach's is quieter because the tablet in it carries words of its own. Not mirrored in Arabic. Faint in light mode. The photographs are the same in every theme.
- The ground test is rewritten for the eight places.

## Coach without "AI", the health questions, the kit rebuild, haptics on iPhone — branch session/coach-sync

Owner, 27 Oct (screenshot: "Can I restructure my workout plan to be home based with no equipment?" answered with the protein RDA). CACHE `bunyan-v147`.

- **"Coach", not "Coach AI"**: the section tab, its kicker, the chat's "things worth a look" line and the guide (English and Arabic).
- **The wrong answer.** The question shared only synonyms with a protein passage whose key was "take home". Two fixes:
  - It is a request: `commands.js` reads "make / restructure / switch my plan … no equipment / at home / gym" (also as a question, in English or Egyptian Arabic) as `plan.gear`. The registry's `plan.gear` opens the assessment as it stands, taps its equipment answer to the new kit, and shows the result to review; nothing changes until Use this plan.
  - The knowledge search now needs two of the person's own words (not synonyms), or one in the passage's name, and structural words in a key ("take home", "notes", "rules") no longer count as a name.
- **The assessment follows the knowledge base:**
  - A **health step** (the PAR-Q+ topics as `assessments.js SCREENING.parq.logic` paraphrases them; the instrument itself isn't reproduced). The book's rule: screen every new exerciser. Any one ticked means the plan drops jumps and intervals (low to moderate effort), and the result says to check with a doctor or a qualified exercise professional first. Over 45, the vigorous-intensity note.
  - **Your week** shows the textbook's sessions a week for the level (`kb.frequency`).
  - **Sleep** shows 7–9 hours (`kb.sleep`, new).
- **Warm-up**:
  - The picture is a soft vignette instead of a box.
  - The workout header fades into the page instead of a ruled edge.
  - The Start footer spans the screen at the workout's gutter, with a taller fade.
- **Haptics on iPhone**: Safari has no vibration API; since iOS 18 a hidden `<input type="checkbox" switch>` ticks the Taptic Engine when its label is clicked inside a tap. `view.js iosTick` does that on every button tap (where Android vibrates). Its clicks stop at the label. The Haptic feedback setting now shows on iPhone too. Not verifiable in the headless browser: check on the phone.
- Tests: the assessment walk-through takes the new step; new tests for the health step and the textbook notes, the kit request, and the haptic switch; the registry test accepts `on()` branches (`D.as`).
- **The workout stands on Training's picture** (owner, 27 Oct: "the same training page background on the page after the warm-up"). `render.js groundOf`: a live workout shows `home`; while the warm-up is up the ground stays clear (its card has its own). The workout page's colour moved from `body` to the root (`:root:has(body.wkflat)`), because a body background covers the ground layer.

## Motion, the keyboard under the chat, and answers tailored to the person — branch session/motion-tailor

Owner, 27 Oct: the chat screen shifts badly when the keyboard opens; tab changes and opening the chat should be a little slower and more dynamic; suggestions (exercises, volume, progress) must come from the knowledge base and be tailored to what the assessment and the chat know. CACHE `bunyan-v148`.

- **Keyboard:** the chat's question box is now held like a sheet's field (`keyboard.js inSheet` covers `#cpanel .cp`), so Safari no longer scrolls the page under the panel. The panel follows the keyboard with a transition on its top, height and padding (`--m-kb` 320 ms, `--e-ios`) instead of snapping. Not verifiable headless: check on the phone.
- **Motion tokens:** `--m-tab` 420 ms and `--m-panel` 380 ms, with `--e-spring` (a slight settle).
  - The page change (`#app.pagein`) rises 16 px over `--m-tab`.
  - The dock pill and its label slide on it too.
  - The coach panel opens over `--m-panel`.
  - A theme test waits for the dock's change to finish before reading its colour.
- **One prescription everywhere:** `plan.js doseFor(name, profile)` gives an added exercise the same sets, reps, rest and effort as the builder's accessories: the goal's training style and level, then into the textbook's range for the goal's adaptation. Used by:
  - the picker (`actions.js addExercise`, was a fixed 3 × 8–12)
  - the coach's "add …" confirmation (was a fixed "3 × 8–12")
  - the new suggestions
- **"What exercises for legs?"** (`agent.js suggestExercises`, also "best exercise for …", "تمارين صدر"): exercises are drawn from the library, then:
  - Filtered: the person's kit (`usable`), nothing on the avoid list for a sore spot they named (`avoids`), no advanced or skill moves for someone new, no jumps for someone new or with a health tick (unless the goal is power), no strongman implements. Stretches, holds and cardio drills only for mobility or endurance.
  - Ranked: compounds first, loaded moves first for size and strength when there is a load, beginner-rated moves first for someone new.
  - At most two of each movement; each shows the goal's dose and whether it's already in the program.
  - A tap adds it to a day, asking which.
- **The volume answer is goal-aware:** a goal that isn't muscle size gets "no weekly target per muscle; {a}–{b} sets an exercise" instead of the RP range.
- **Knowledge answers are tailored** (`chat.js tailor`):
  - The goal's sets, reps and rest when the passage is about how to train.
  - A health-tick note on vigorous topics, and a sore-spot note on movement topics.
  - What the person told the coach that bears on it.
- Tests: the suggestions (kit, sore spot, goal dose, the day asked) and the goal's dose for an added exercise.
- **The workout stands on the training picture** (owner, 27 Oct, two screenshots: the two backgrounds should be the same; the workout's looked zoomed in): `groundOf` gives a live workout `training`, the picture of Plan → Training, framed the same.
- **Owner, 27 Oct (screenshot): asking to rebuild for no equipment jumped straight to the result page with no message or motion: it looked like a glitch.** Now the coach says what it will do ("Yes. I can rebuild your program for no equipment…, nothing changes until you tap Use this plan") with **Show me** / Not now. On the tap, and for any "open …" command, the answer is marked done and shown for a beat, then the panel closes back into its button, and only then does the page move, with its rise (`coach.js goAfter`).
- **Warm-up footer pinned** (owner, 27 Oct: scrolling the warm-up, Start and Skip moved up). The body keeps room under the page for the dock, which the workout puts away; at the end of the scroll the sticky footer stopped above that room. `body.focus:has(.wu-foot){padding-bottom:0}`. Test: the footer's bottom is the screen's at the top, the middle and the end.
- **The 86 kg on push-ups, fixed.** Push-up sets logged with the lifter's body weight in the weight field (an old logger filled it in) made every suggestion "+86 kg", and the warm-up ramped up to it (42.5, 65, then 86 kg). `lifts.js recommendIn` now treats a weight within 1.5 kg of the body weight, on a body-weight exercise, as body weight alone (`ctx.bodyKg` from `formulas.recommend`). `warmup.js` no longer ramps a body-weight exercise. The logged sets themselves are left as they are (the person's history).
- **The old 86 kg sets corrected in the log** (owner: "correct the logged data … then merge"). `js/engine/logfix.js` (new): once per profile (`logFixV` 1, validated in schema.js), each body-weight exercise's set logged within 1.5 kg of that day's body weight (`bodyAtIn`) gets 0 added weight. A real added weight (a vest, a belt) is far from it and stays. It runs once the history is in memory (it is kept in IndexedDB: at boot after `loadStored`, after a profile switch and after a restore), saves each changed session where history lives, and says how many sets changed, with Undo. Derived numbers follow by themselves: such a set's load is now body weight × the exercise's share, the same as every set logged since the box said "added".
  Tests: corrected once with Undo, a 20 kg vest set kept, Undo kept across a reload, the correction kept across a reload and said once.

## Rest-complete circles, the meal button's room, the open workout's old sets — branch session/polish-gaps

Owner, 27 Oct (two screenshots). CACHE `bunyan-v150`.
- **+30 off-centre** in Rest complete: the base `.rb-ctl button` fixes a control's width at `--hit` (44 px); "+30" was wider than that and ran past the circle to one side. Both controls are now equal 52 px circles (`--hit + --s2`), centred, text 14 px. Measured: 14 px either side of "+30".
- **Build today's meal touched the Water card**: `.btn.fbuild` margin is now `--s3` above, `--s4` below (16 px measured).
- **The open workout**: the screenshot (3:56, before the merge) still showed "+86 kg". The correction only touched the saved history, so a workout open at the update kept its 86 kg sets. `logfix.js` version 2 also reads the workout in progress, and runs once more on phones that already ran version 1 (harmless: corrected sets are 0 and are left alone). Test added.
- **Owner, 27 Oct (two screenshots): the chat's resize, the motion, the dock after a link, a swap answer.** CACHE `bunyan-v151`.
  - **The coach's button missing from the dock** after "Open Food" in an answer: `syncCoach` decided whether to show the launcher before closing the panel for the route change, so it stayed hidden until another render. The panel's step-aside now comes first. Test added.
  - **Smaller / bigger**: the panel glides from its old box to its new one (`coachfab.js flip`, measured before and after, `--m-panel`), its contents fading back as it settles; with or without the keyboard. Was: a jump and a 4 px rise.
  - **Slower motion, app-wide** (tokens): micro 190, pop 260, comp 320, sheet and screen 380, data 480, reveal 600, fade 260 ms; tab 460, panel 420, keyboard 340; the panel's close 260 ms, and the coach's "say it, close, then move" beat 420 + 290 ms. A press stays quick (110).
  - **Swaps, one item, done in the chat**: "replace the talibia grill in my lunch" finds the planned item with a typo allowed (`planItemNamed`, a word within two letters), offers three like-for-like foods with their kcal and macros, and a tap then "Swap it" replaces it in the plan (`meal.swap`, Undo). Like for like: a food from another aisle counts against it (rice → breads and taro, not cornflakes), and "Cornflakes" / "Corn Flakes" are one food. "Other foods for lunch" no longer reads "lunch" as luncheon meat; the whole-meal answer says how to swap one.
  - **Doing it here**: the water answer's button adds a glass instead of opening Food.

## The owner's full photographs — branch session/full-photos

Owner, 27 Oct: the background photos re-uploaded at a phone's shape (941×1672), to replace the
small cuts from the sheet. CACHE `bunyan-v152`.
- `img/page-home.jpg` (the mark over the water), `page-training.jpg` (the rack under the pergola),
  `page-workout.jpg` (bottle and towel) and `page-coach.jpg` (the tablet) are now the full
  photographs, JPEG q80. The coach's is cut above its printed caption ("COACH / AI ASSISTANT"),
  which would read as the app's own words.
- These four fill the screen's height (`#bgart .art.photo:is(...)`, fade from 50 % to 94 %) so
  each is seen whole instead of its top 64 vh. Warm-up, Food, Progress and Profile keep their
  sheet cuts: the sheet the owner sent with them carries captions and, on Progress, a stats
  card drawn into the picture, and its tiles are no wider than the current cuts.
- Test: the full photograph fills the height.

## Progress controls from the owner's mock; Plan's icon a brain — branch session/progress-controls

Owner, 27 Oct (a mock of Progress's controls). CACHE `bunyan-v153`.
- `seg()` (view.js) takes an optional icon per item (`items[i][3]`, inner SVG on the 24 grid, a
  module constant). With one, the control gets `.ic`: icon over word, a taller cell.
- Progress: Overview / Strength / Body carry a chart, the dumbbell and a person; each span a
  calendar; the page's name has the bars mark in the accent. The range and the halves are now
  filled like the views (the mock), no longer the tinted secondary style.
- All / Upper / Lower: the owner asked for body icons instead of arrows. They are one figure,
  the half not chosen drawn faint, icon beside the word. Their accessible names are "Whole
  body", "Upper body", "Lower body" (Arabic added). Kept as three: it is one tap to narrow the
  records and the lift list, and All is the default, so nobody has to use it.
- Dock: Plan's clipboard is now a brain (dock.js `ICON.coach`).
- Test: icons on each control, the halves' figure and names, the control kept in place on a tap,
  the brain.

## Every page photo whole; the meal plan button's room — branch session/photos-meal-btn

Owner, 27 Oct (a full Progress photo, a second sheet of five, a Plan screenshot). CACHE `bunyan-v154`.
- `page-progress.jpg` is the owner's full photograph (the banner by the bay, 941×1672);
  `page-warmup.jpg`, `page-food.jpg` and `page-profile.jpg` are cut from the new sheet. Each had a
  printed caption ("PROGRESS", "WARM UP", "FOOD / NUTRITION", "PROFILE / SETTINGS"); painted out
  (OpenCV inpaint over a mask of the caption's pixels, in tools only, not shipped). Workout and
  coach keep the full photographs from earlier today; the sheet's versions of them are smaller.
- Every photograph now fills the screen's height (the 64 vh frame is gone) and fades only toward
  the dock. Framing so nothing is lost: Progress aligned to its left edge (the banner), Food to its
  foot (the bowl; it is narrower than a phone, so only sky goes) and fading later; the warm-up
  card's picture at 60 % (the banner and steps).
- **"New meal plan from my targets" touched the tiles**: `.cplan-gen`'s 12 px margin lost to
  `.btn.sm{margin:0}`; now `.btn.cplan-gen{margin:var(--s3) 0 0}`. Test: the gap is at least 10 px.

## Ask next slim after the first answer; Progress controls in two low rows — branch session/compact-controls

Owner, 27 Oct (two screenshots). CACHE `bunyan-v155`.
- **Ask next took the conversation's room**: after the first answer it is still the list under
  its heading (a way in); from the second answer on it is one slim row that scrolls sideways,
  its end fading, named "Ask next" for a screen reader (`askNext(last,n)`, both the chat page
  and the floating Coach).
- **Progress's three tall rows** (about 30 % of the screen): now the views with their icons
  beside the words (44 px), and one row under them with the spans (words only) and, on Strength,
  the halves as the figure alone (`seg` options `row` and `bare`; each half keeps its full
  accessible name). On a phone too narrow for both (under 390 px) the halves wrap under the
  spans instead of cutting a word. The calendar icons are gone (they doubled the row's height).
- Tests: the list then the slim row; the controls under a fifth of the screen, spans and halves
  on one row.
- **Icons redrawn** (owner: the halves looked like a child's drawing, the brain like a tomato).
  CACHE `bunyan-v156`. The halves are now one athlete's figure drawn solid (broad shoulders,
  arms apart, a V to the waist, a waistline between the halves), the half not chosen at 30 %.
  The dock's brain is drawn for Bunyan (no icon set's path), round-capped where the other
  dock icons are square (a brain has no corners). First drawn from above; the owner asked for
  the side (CACHE `bunyan-v157`): the cerebrum's dome with its main fissure and folds, the
  cerebellum under the back, the stem; drawn on the 24 grid, scaled to the dock's 22.

## Chat history — branch session/chat-history

Owner, 27 Oct (two screenshots): Profile's "What you've told the coach" sent "What have I told
you?" into the chat. CACHE `bunyan-v158`.
- **Profile → Chat history** (`data-sheet="set_chat"`, `histSheet` in chat.js, registered in
  settings.js): thirty days of the conversation by day, newest day first, read only (bubbles drawn
  with `ro`: no buttons, no Undo, no field to type in), and one "Delete chat history" with Undo.
- **Kept 30 days, shown 24 hours**: `pruneChat` now drops only what is older than 30 days;
  `chatShown()` is what the chat and the floating Coach show (the last day, since it was last
  cleared). Follow-ups read on only from what is shown.
- **Clear** in the chat now sets `S.chatFrom` (validated in schema.js): the conversation leaves the
  chat but stays in the history. The history's own button deletes it.
- **"Review chat history"** at the top of the conversation whenever the history holds more than
  the chat shows: the panel closes (its own close, 260 ms), Profile comes in, and 420 ms later the
  history rises over it.
- What the person asked the coach to keep is still asked in the chat ("What have I told you?"),
  where each item can be deleted.
- Tests: the day / thirty days split, the way from the chat and from Profile, nothing tappable or
  sendable in the history, delete with Undo; clear hides, not deletes; day-old messages leave the
  chat for the history.
- **The panel's motion** (owner, 27 Oct). CACHE `bunyan-v159`.
  - **Opened scrolled up**: `toEnd` measured the newest exchange with getBoundingClientRect while
    the panel was scaling in from the launcher (scale .12), so it scrolled a fraction of the way.
    It now measures by layout (`offIn`, offsetTop up to `#cpB`, which is `position:relative`).
  - **Smaller / bigger flashed dark**: the old FLIP scaled a picture of the box and faded its
    contents out and back. Now the box's own left/top/width/height glide from the old rectangle
    to the new (`--m-panel`, `--e-ios`), the conversation in view and reflowing all the way;
    inline styles cleared when it settles. `.cp.flipping` is gone.
  - **Too quick to read as a conversation**: the question flies for 600 ms; the dots come once it
    has landed (420 ms) and stay 1–2 s by the answer's length; the answer arrives over 560 ms, its
    parts 120 ms apart; the panel glides to keep each new thing in view (`follow`).
  - Tests: opens on the newest exchange; mid-resize the box is not transformed and its contents
    are fully opaque, and settles back to the CSS; the dots wait for the question and are still
    there a beat later.

## The coach makes an exercise of the person's own — branch session/coach-new-exercise

Owner, 27 Oct: "if I need to do an exercise that isn't in my library, can the chat create it and
add it to a day?" It couldn't (exercise.add takes library names only). CACHE `bunyan-v160`.
- `exercise.create` (actions.js): a name and the muscle it works, saved to `S.myEx` and the library
  exactly as the picker's "add your own" does (no picture, no guide), then added to the day through
  the picker's own tap. Undo (`snap:"exlib"`) puts back the program, `S.myEx` and the library.
- agent.js: "add X to Monday" with no match → `createAsk`: the muscle is asked (the library's,
  less Cardio and Sports; two to a row), never guessed, since it decides volume; then the day if
  not said; then a confirmation with the day's dose ("no picture or guide"). Under the closest
  names, "None of these" goes on to make it. A name that turns out to exist is simply added.
- "create / make a (new) exercise called …" and "اعمل تمرين جديد …" are an add (chat.js VERB);
  the words around the name are dropped (`NEWEX`).
- **Fixed in passing**: last round's 30-day constant was declared as `KEEP` in chat.js, which
  already had `KEEP=30` (the most messages kept), so the cap silently became 30 days in ms. Now
  `KEEP_MS` (30 days) and `KEEP=500` messages, the cap a month's history needs.
- Test: made from a name the library lacks, muscle asked, confirmed, in library and day, Undo
  restores both.

## Coach skills: dose, schedule, lighter week, weekly check-in, a machine taken — branch session/coach-skills

Owner, 27 Oct: build the four starred ideas, and "if I'm in the gym and the machine is occupied,
ask for an alternative". CACHE `bunyan-v161`. All through commands.js (pure parsing) → agent.js
(what the chat shows) → actions.js (what runs, with Undo).
- **Sets, reps, rest** (`ex.dose` → `exercise.dose`): "make bench 4 sets of 6", "squats 5x5",
  "rest 2 min on squats", "shorter rests on Legs" (a whole day, 30 s, never under 30), Arabic too.
  Changed wherever the exercise is in the program unless a day is said, through `setExField`
  (the steppers' own limits). Out-of-range values are refused, not clamped silently.
- **Skip / move** (`sched.skip`, `sched.move`; snap `sched`): today, tomorrow or a weekday (EN/AR,
  `whenIn`). Skip makes the date a rest day (`S.daySwap[date]="rest"`, read by `planOn`); move puts
  the workout on the new date and what was there back on the old one (or a rest day). The day's
  "Change workout" sheet gained the same "Rest day" row, so a tap can do what the coach does.
- **Lighter week** (`deload.start` / `deload.end`; snap `deload`): the Training card's own button.
  "should I deload?" stays a question. Answers that say one is due now carry "Start a lighter week".
- **Weekly check-in** (intent `week`, `aWeek`): last week in the first two days of a new week, else
  this week so far: workouts vs plan, working sets and volume vs the week before, protein days of the
  logged ones, average weight vs the week before, lifts past their best e1RM; each only with data;
  then one thing to change. Offered first in the panel's suggestions in a new week until read
  (`S.ckSeen`, validated in schema.js). "How was my week?" moved here from `track`.
- **A machine taken** (`ex.busy`): "the machine is taken", "someone's on the bench", "الجهاز مشغول",
  or the workout's first suggestion (Ask Coach in the workout's ⋯ menu). Up to four alternatives
  for the same muscle: same movement first, other equipment, the person's kit, nothing near a sore
  spot, nothing already in today's workout; then `exercise.swapToday`. Not once sets are logged.
- Tests: one per skill (each with Undo), the registry's domains, the workout's suggestions, intent
  cases.

## Warm-up timer turned into a page-tall column — branch session/warmup-timer

Owner, 27 Oct (two screenshots): tapping the 4:00 "Raise your pulse" timer made it a tall vertical
bar. Cause: the running timer took the class `run`, and the GPS run screen's page-wide `.run`
(index.html, flex column, `min-height:100dvh`) applied to it. The timer's state class is now
`timing` (warmup.js, hold.js, index.html). CACHE `bunyan-v162`.
Test: the running timer keeps its height and stays a row.

## Coach batch 1: haptics on iPhone, the panel in the hand, the coach in the gym — branch session/coach-batch1

Owner, 27 Oct: build the suggested ideas (all but the ones needing an online service) and make
sure haptics work on the iPhone. CACHE `bunyan-v164`.
- **Haptics on iPhone**: every button press already ticked (app.js), but through one hidden switch
  kept in the page and toggled back and forth. Now the recipe known to tick on iOS 18+: a fresh
  `<input type=checkbox switch>` in a hidden label in <head>, clicked and removed, per tick
  (view.js `iosTick`). Swipes now tick too (exercise swipe, date swipe), at the touch's end, the
  one moment iOS allows it; timers cannot (iOS blocks haptics outside a touch). Settings → App has
  "Test haptics", with what an iPhone needs (iOS 18+, System Haptics on).
- **The workout's coach button** (`.ss-coach`, `data-coachopen`) in the top bar, one tap; on phones
  under 360 px the bar reads "1 of 6" without "Exercise".
- **Gym commands**: "too easy" / "too heavy" / "I failed" → the next set a step up or about 10% down
  (`incrementFor`; reps for unloaded), confirmed, `set.next` fills the logger, Undo (snap `draft`).
  "How do I do this?" → the steps of the exercise on screen and its guide. "Plates for 87.5" → per
  side on the plates sheet's bar, with what standard plates can't make.
- **The panel in the hand** (js/ui/chatgest.js, precached): the header dragged down shrinks the
  whole conversation to compact, then closes it (ticks on release); "More" grows open and shut
  (WAAPI height); a long press on an exchange opens Copy / Delete by the finger (Delete has Undo;
  Copy uses the clipboard, a hidden field where refused); the typing dots are a status saying
  "Coach is typing". Yes/Not now chips were not added: every confirmation already has its two
  buttons.
- Tests: haptic recipe, gym commands, header button, drag, long press, More, typing status.

## Coach batch 2: understanding and logging — branch session/coach-batch2 (on batch 1)

CACHE `bunyan-v165`.
- **Corrections and "same for"** (chat.js `rewrite`): "no, I meant Friday", "same for Thursday",
  "and Pull too": the last request (as it was run, `m.qq`) said again with the day, program day or
  exercise changed. Only when what follows is a day or a short name, never a request of its own.
- **Two requests in one** (`splitTwo`): split on "and", "then", "ثم", "وبعدين" when both halves
  are things to do; two messages (`pair`), both confirmations live (`liveAt`).
- **"Undo that" / "swap it back"** (`undo.last`): offers the newest change that can still be
  undone, as a button (the change's own Undo).
- **Gym slang** (commands.js `slang`): "2 plates" = bar + two plates a side (20 kg / 45 lb by the
  app's unit); "bodyweight x 12" = a set with no load. Franco detection no longer reads 3x8, 5k,
  30min, 20kg as Arabic letters (intent.js FRANCO).
- **Cardio in a sentence** (`act.log`): "ran 5 km in 28 min", "45 min football", "لعبت كورة ساعة";
  25 activities by the words people use; minutes, hours, km, miles; today or yesterday. Saved as a
  finished one-bout session; kcal only from the activity's MET and a known weight, said as an
  estimate, never added to the food target.
- **A lift done without the app** (`past.log`): "yesterday I did bench 3x8 at 80", "on Monday I did
  squats 5x5 100kg": into the history on that date (a "Logged in chat" session, appended to if one
  exists), counting toward records and progress.
- **Sleep and soreness** (`recovery.log`): "slept 5 hours", "legs are very sore", "soreness 7/10";
  the recovery log's fields for today, with what it means for today's training.
- Undo for history changes (snap `sessions`): new sessions removed, appended entries trimmed.
- Tests: logging (each with Undo), corrections / same-for / two requests / undo that, slang;
  registry domains.

## Coach batch 3: advice — branch session/coach-batch3 (on batch 2)

CACHE `bunyan-v166`.
- **A stuck lift** (intent `plateau`, `aPlateau`): "why isn't my bench going up?", "my squat has
  plateaued". The lift named (else one `plateauOf` flags, else the first). From six weeks of the
  log: sessions, the estimated max's change, average RPE of working sets, its muscle's weekly sets
  against the growth range (size goals only), logged sleep, a fat-loss goal. Each reason only with
  data, then one change (a second day, a lighter week with its button, add weight, one more set,
  sleep, or four weeks in a lower rep range). Fewer than three sessions: too few to say.
- **A sore spot across the program** (`limit.add` → `plan.avoid`; snap `avoid`): "swap exercises that
  load my shoulder", or one tap from the pain answers (both the knowledge one and the report one,
  `data-chatsay`). Each program exercise the plan's AVOID list matches goes to its closest stand-in
  (`standIn`, the area added to limits); any without one stays, said so. The area joins
  `profile.limits`, so new plans keep away from it. Never advice about the pain itself.
- **Travel mode** (`travel.set` / `travel.end`; snap `travel`; `S.travel` validated in schema.js):
  "travelling for a week, bodyweight only", "hotel gym with dumbbells only until Sunday",
  "مسافر اسبوع ومعايا دمبل بس". Until the date, each workout swaps what needs kit left at home for its
  stand-in with the kit at hand (actions.js `startDay`, the original a tap away as `alt`); the
  program itself is untouched. Training shows a quiet line with End it; "I'm back" ends it.
- `data-chatsay` (handlers/coach.js, common.js `sendText`): an answer's button that sends a request,
  shown in the conversation as the button's words.
- Tests: sore spot (asked and from the pain answer, Undo), travel mode end to end, plateau.

## How weights are logged: the coach understands, dumbbells count as moved — branch session/coach-load-logging

CACHE `bunyan-v167`. From the owner's screenshots: "the barbell weight per hand?" got the body-weight
trend; two longer questions with "include" in them started an add-exercise and offered "No exercise
called “<the whole sentence>”".
- **A question is not a command** (chat.js `askedOnly`, in `route`): exadd/exremove/exswap only when
  the verb leads ("add …", "can you put …") or the message isn't asked. Asking words first (does, is,
  when, how, هل, ازاي…) or a question mark after anything but can/could/please/ممكن… go to the next
  intent the words touch instead. "how do I add X to Y" stays a request (`HOWDO`).
- **A sentence is not looked up as a name** (agent.js `closeOf`): six words or more matching no
  exercise say so, with Open Training, instead of four unrelated "closest" names.
- **New intent `loadlog` → `aLoadLog`** ("How weights are logged"): barbell = total, bar included;
  dumbbells per hand or both together (the person's setting, said); one side at a time = one side;
  machines = the stack; body-weight lifts = added only. What volume counts. Dumbbell setting button.
  Weight-with-a-load-word ("barbell weight per hand") is this, not body weight. Arabic phrases too.
- **Barbell weight box** reads "Weight · with bar" (session.js wKey), as dumbbells read "per hand".
- **Formula change — volume** (owner, 27 Oct): still Σ(weight × reps), but the weight is what was
  moved: a two-dumbbell exercise logged per hand counts both dumbbells (×2; lifts.js `setVolIn`,
  `log.dbHand` from formulas.js/stats.js `LOG()`; exercises.js `pairOfDumbbells`). One-side
  exercises, barbells, everything else unchanged. Volume is never stored, so every past session
  is recomputed by the same rule. Records and estimated maxes stay per the box, as logged.
- **Switching per hand ↔ both together converts the history** (logfix.js `convertDbLoads`, common.js
  `setDbLoad`, used by Settings and the old `dbload` key): every two-dumbbell set ×2 or ÷2, the
  workout under way, and own steps (`S.incr`) — so one method holds throughout. Toast with Undo.
- Stale test fixed: "Movement: pain said…" expected only the recovery-log button; batch 3 added the
  swap offer to the pain answer on purpose. It now expects both.
- Tests: intent cases (the owner's three sentences, Arabic, guards), engine (volume both hands,
  conversion both ways), regression "Coach understanding: …how weights are logged…" and
  "Dumbbells per hand or together…".

## The workout, simpler: no duplicates, barbell sense, thumb reach, a quicker warm-up — branch session/workout-flow

CACHE `bunyan-v168`. Owner, 27 Oct: "no duplicates" — ⋯ repeated the close button, the coach
button and ⓘ.
- **⋯ holds only what is nowhere else** (sheets.js `sessmore`): Session note, Warm-up again,
  Something hurts? (moved from under the workout), Remove this exercise (moved; red). Gone: Ask
  Coach (header button), How to do it (ⓘ), Plates (the plates line), Finish and Discard (the close
  button). Under the workout only Skip exercise and Add exercise stay.
- **Close button asks three ways**: Save and exit (primary, as before), Finish workout (new `mid`
  choice on the confirm sheet: `mid`/`midact`, handler `confirmmid`; `ACT.leavefinish` →
  `confirmFinish`, its own question about sets left), Keep training; Discard in red (`altbad`).
- **Barbell**: a first time starts at the bar (actions.js `syncDraft`, `isBarbell`, `barKg`); the
  steppers move by one pair of the smallest plates, 2.5 kg / 5 lb (session.js `weightStep`) and
  stop at the bar going down (workout.js `stepDraft`); a 0 kg barbell set is refused with the
  bar's weight said. The bar chosen on the plates sheet is now kept per profile (`S.prefs.bar`,
  validated 0–40 in schema.js; was `V.bar`, lost on reload) and used by warm-up, coach, sheet.
- **Plates line** under a barbell's weight ("Bar + 20 a side", "Just the bar", "· not exact"),
  a tap to the plates sheet; typing updates that line alone (fields.js → `plateLine`).
- **Logged** says itself quietly: an ok hairline, not a solid green bar. **Log set** is
  `position:sticky` at the bottom, in reach when scrolled to the sets.
- **Warm-up**: the drill's name ticks it (ⓘ beside it for how); ticking scrolls the next one still
  to do into view. The pulse timer has a copy in the bottom bar that shows only while it runs and
  its row is out of view (hold.js `paint` toggles `.away`). "Skip warm-up". Start puts the ramp-up
  sets on their lift as warm-up rows (W), each prefilled (workout.js `queueRamp`, `e.wuRamp`,
  dropped at finish).
- Already there, so not built: swipe between exercises (exswipe.js), typing the weight (it is an
  input), the finish summary.
- Tests: updated for the moved controls (`finishEarly` helper); new "Warm-up, quicker…" and
  "The workout, simpler…".
- Full-suite fixes: the plates line's update had been put inside fields.js's if/else chain, so a
  typed body weight was cleared at once (weigh-in saved nothing); moved after it. A workout open
  across a reload filled its numbers before the history and library had loaded (0 on a barbell,
  no suggestion); an untouched draft is now filled again once they are in (app.js `bootDraft`).
## Coach: unsure, Not what I asked, "it", a phrasing corpus, history search — branch session/coach-unsure

CACHE `bunyan-v169` (session/workout-flow is v168; whichever merges second keeps the higher).
- **A shaky reading offers the others** (intent.js `unsure`, `second`, each score's `parts`): a near
  tie with the runner-up (≤1 apart), or one keyword carrying six words or more. The answer still
  comes; under it "Or did you mean" with up to two other readings that have a question to ask
  (`m.alt`, chat.js). Ask next leaves those out, so nothing shows twice. Measured on the intent
  tests: 3 of 137 flagged, each a real near tie. Coverage (matched letters ÷ letters) was tried and
  dropped: real questions sit as low as misread ones.
- **Not what I asked** (newest answer, typed questions): keeps {q, id, at, lang} in `S.missed`
  (per profile, 200 at most, validated in schema.js) and says so in place. Chat history shows
  "Questions the coach got wrong" with Copy the list (plain lines "question → read as") and Clear
  (with Undo). The owner sends the list on; each line becomes a corpus entry and a fix.
- **"it", "that", "ده"** in a change request naming no exercise (add/put/remove/swap…) is the
  exercise the last exchange was about (`withReferent` in `rewrite`): its agent params' name, else
  the one its words named. "add it to Pull too" → "add pushups to pull". Trailing too/also dropped.
- **Corpus** (js/coach/test/corpus.test.js, in tests/coach.mjs and the browser runner): 127
  phrasings across every answer, EN / Egyptian Arabic / Franco. 14 were misread at first; phrases
  added for each (starving; left to eat today; is my program good; missing muscles; best lifts;
  how did yesterday's workout go; what can replace X; put X on Y day; take X out of; how do I warm
  up; log both dumbbells; a lift stalled / isn't going up).
- **Chat history search**: a field above the days; typing hides what doesn't match (question or
  answer), each row in place, and says when nothing does (fields.js `chhq`).
- Tests: coach 229 (corpus included); regression "Coach, when unsure and when wrong…".

## Own exercises the library has after all — branch session/exercise-match

CACHE `bunyan-v170`. Owner, 27 Oct (screenshots): "Overhand grip barbell curl", "Single arm rear delt
fly", "Barbell wrist curl", "Reverse wrist curl", "Seated triceps extension" showed as the person's own
(muscle Other, no picture): a program import had no name for them, so useDraft made them own.
- **splitparse.js KNOWN**: reverse / overhand / pronated (grip) curls → Reverse Barbell Curl (and the
  dumbbell and cable ones); wrist curls palms up / down, barbell, dumbbell, seated; seated (overhead /
  dumbbell) triceps extension → Seated Triceps Press; single / one arm rear delt fly, rear delt raise →
  Reverse Flyes. "Overhand grip barbell curl" had matched plain Barbell Curl "exact"; now right.
- **matchExercise(raw, {lib:true})**: the shipped library only. LIBKEYS includes own exercises, so an
  own name matched itself.
- **adoptLibrary** (logfix.js), run with fixLogsNow on every load (common.js `adoptLibNow`): each own
  exercise whose name the library knows for certain (exact, never "close") becomes the library's in
  every program, the open workout, every session (name, exId, muscle), favourites, skips and own steps;
  dropped from myEx and LIB. Said once with the names and Undo; Undo puts all back and adds the names to
  `S.keepOwn` (schema-validated) so they are not adopted again.
- Test: "Own exercises the library has after all…".
## A plan to another Bunyan user — branch session/plan-share

CACHE `bunyan-v171` (session/exercise-match is v170). Owner, 27 Oct: a workout or nutrition plan,
made, imported or built with the coach, shared to another Bunyan user and arriving the same.
- **No server** (the app has none; server/ belongs to the Backend session): the plan travels as a
  code in an ordinary message. js/engine/planshare.js: `packPlan` (program without ids or history,
  the sender's own exercises it uses, meals with each food's own nutrition; never log, weight,
  targets or profile), `encodePlan` (JSON → deflate-raw via CompressionStream where there is one
  → base64url, "BNY1." / plain "BNY0."), `decodePlan` (finds the code inside a whole pasted message),
  `cleanPlan` (every field checked and clamped: it comes from outside), `planSummary`.
  Precached. A 6-day, 48-exercise program is a ~330-character code.
- **Send**: "Share this program" under any program with exercises (train.js builder), "Share my meal
  plan" under a meal plan with food (food.js vPlan). The code is made, then the sheet (settings.js
  `sendplan`) offers Share… (the OS sheet, its own tap as iOS needs) and Copy the message. The message
  says how to add it and ends in a link `…#plan=<code>`.
- **Receive**: Profile → People → "Add a shared plan" (`recvplan`): paste (or the Paste button,
  clipboard), Read it, then what it holds and, per part, "Add it and train with it" / "Add it to my
  programs" (fresh ids, exIds, own exercises joined) and "Use this meal plan" (replaces the meals;
  targets untouched), each with Undo. Opening the link (a browser, or Android's installed app)
  shows the same sheet and clears the address (app.js). On iPhone a link opens Safari, whose storage
  is not the Home Screen app's — hence paste first.
- Tests: engine planshare (pack, accept, refuse, clamp); regression "A plan to another Bunyan user…"
  (two phones: program and meal plan compared field by field; link).
## InBody results for the coach — branch session/inbody

CACHE `bunyan-v172` (#75 v170, #76 v171). Owner, 27 Oct: upload an InBody to the coach so plans use it.
- **No text recognition in the app** (it would need a model this offline app does not carry, or an
  API). Instead: the sheet shows the chosen photo (memory only, never stored), and on iPhone its text
  is copied with Live Text and pasted. js/engine/inbody.js `readInBody` finds each figure by its label
  (EN and Arabic, Arabic digits, lb converted): on the label's own line first, else a labels-column /
  figures-column copy paired in order only when the counts match. Out-of-range figures are left out;
  fat mass that disagrees with weight × % is dropped. Every figure is shown to be checked.
- **Saved** (Progress → Body → Body composition → "Add an InBody result", or the coach's button) as the
  test date's body entry: `weight`, `bf` (where the app already reads them: targets, lean mass,
  charts), plus `smm, fatkg, vfl, ibmr, tbw, ibscore`, `src:"inbody"`; with Undo.
- **Progress** says "From your InBody test" and shows skeletal muscle, visceral fat level, score.
- **Coach** (intent `inbody`, `aInBody`): the latest test; body fat against the textbook's ranges
  (assessments.js body_fat_ranges, 11.4: men 10–20 %, women 20–30 %, varies with age; `fatBand`);
  fat and muscle change since the test before; a goal that disagrees (above the range but not losing,
  or in range but losing) is said with Change my goal; the device's BMR is shown and not used —
  targets keep Mifflin-St Jeor for everyone (CLAUDE.md formulas); the textbook's hydration caveat.
  Figures in the coach's lines are wrapped in bidi isolates so a sign stays with its number in Arabic.
- Tests: engine inbody (labels, table copy, missing figure, Arabic, lb, out of range, bands);
  corpus phrasings; regression "InBody: …" (photo, read, check, edit, save, Progress, coach).
## Agent intelligence from the four linked repos — branch session/agent-memory

CACHE `bunyan-v173`. Owner, 27 Oct, linked samiralibabic/open-ended-agent, thefilesareinthecomputer/
agent-zero, yepmdg/ollama-agent, openinterpreter/openinterpreter, "use whatever can be implemented".
Read (cloned read-only outside the repo): all four drive a language model on a computer — Ollama /
llama.cpp / an OpenAI-compatible endpoint (open-ended-agent: Bun loop with memory files; agent-zero:
LangGraph + Ollama + ChromaDB, Python; ollama-agent: Python ReAct loop + ChromaDB; Open Interpreter:
a terminal coding agent, a Codex fork in Rust). None runs in an iPhone browser, and a phone app served
over https cannot reach an Ollama on the home network (mixed content). So the model parts cannot come
in; their patterns can, where Bunyan's coach did not have them yet:
- Already here: BM25 knowledge retrieval over js/knowledge (engine/kbsearch.js — agent-zero's KB
  retrieval), a tool registry with descriptions (handlers/actions.js — ollama-agent tools.yaml),
  multi-part requests (chat.js splitTwo — ollama-agent router's "multipart"), facts memory.
- **Built: memory that does not keep contradictions** (agent-zero memory_manager DEDUP/CONTRADICT):
  coach/context.js `relation(a,b)` → "same" (≥85 % of content words shared, same polarity: kept once)
  or "opposite" (≥60 % shared and one negated — "I eat pork"/"I don't eat pork", "بحب"/"مبحبش" —
  or the same statement with its figure changed, "13-hour"/"12-hour"). `addFact` returns
  why:"contradicts" (id, was) for an opposite of any kind; opts.replace / opts.both settle it. The
  chat asks "Earlier you told me “…”. Which stands now?" — This one, instead / Both stand.
- Not built, the owner's decision: a language model on the phone (WebGPU, WebLLM-style, 0.5–1.5 GB
  download, recent iPhones only, slow and battery-heavy) — that is what would make the coach answer
  anything; everything here stays rule-based without it.
- Tests: coach context (relations, contradiction, replace, both); regression "Coach memory: …".
## Workout fixes from the gym, and two sessions in a day — branch session/workout-more

CACHE `bunyan-v174`. Owner, 27 Oct, from screenshots taken mid-workout:
- **"I need to complete the current exercise"** was answered with a knowledge card about energy.
  commands.js: complete / finish / end / done with / skip / move on from (this / the current)
  exercise, "this exercise is done", "خلصت التمرين ده" → workout.next {done:1}; agent.js says
  "Done with {ex}: n sets logged. On to the next." (the last exercise → finish, confirmed on screen;
  no workout → said so). chat.js `DOWORK`: anything that does something to a set / exercise /
  workout is never looked up in the knowledge files.
- **RPE** was asked in the set card before the set ("How hard was that set?"), so a tap after
  finishing went to the next set. Now `vRpeAsk` asks "How hard was set n?" once that set is logged
  (every set or the last, per Settings), a tap writes it to that set (`rpeset`) and the card leaves.
- **The set being done can be deleted** (✕ on every row): it leaves today's plan and the next row is
  current; with none left the log control is Next exercise / Finish workout.
- **Today's exercises reorder** from the title's list: a grip per row (reorder.js, keyboard too);
  common.js `moveRow` for `le<i>` ids keeps the exercise on screen on screen; supersets tidied.
- **Two sessions in a day**: by weekday, a weekday chip held by another day is now shared, not
  moved (marked, and a note under the days); schedule.js `pinnedAllOn`; dayplan.js: today, with a
  session done and another pinned day left, that day is today's ("Session 2 today"). On the go: a
  done day's card offers "Start another session" — a sheet with every training day (today's done
  ones ticked) and "A run, a class or a sport".
- Tests: "Workout fixes: …", "Two sessions in a day: …"; the builder weekday test now expects sharing.
## The smart coach: an optional language model on the phone — branch session/smart-coach

CACHE `bunyan-v175`. Owner, 27 Oct: "yes go for it" (an on-device model, opt-in), using the linked
repos' ideas.
- **Library**: WebLLM 0.2.86 (Apache-2.0, from the npm registry: js/vendor/web-llm.js unchanged +
  LICENSE) in a worker (js/vendor/web-llm-worker.js). Vendor is outside the import graph: loaded only
  when switched on (js/engine/llm.js dynamic import), never precached. sw.js: the library is cached
  first in "bunyan-llm", kept across releases; activate now deletes only old "bunyan-vN" caches, so
  WebLLM's own model caches (hundreds of MB the person chose to download) survive app updates.
- **Models** (llm.js MODELS): Qwen2.5 Instruct 4-bit, small 0.5B (~0.3 GB) / better 1.5B (~0.9 GB),
  f16 where the GPU has shader-f16, else f32; context 2048. `support()` checks WebGPU and an adapter.
  `remove()` deletes every file of both sizes. A test seam (`globalThis.__bunyanFakeLLM`) stands in
  for the model in tests/regression.mjs: a test browser has no GPU.
- **Grounding** (js/engine/smart.js, from agent-zero / ollama-agent: a local model told only what it
  may use): the person's snapshot (js/ui/smartcoach.js `snapshot`: goal, targets, today's plan, the
  workout under way, weight and its 7-day average, body fat / lean mass, last three sessions' top sets,
  what they told the coach), the BM25 passages the question reaches (kbsearch), the last two
  exchanges, and the rules: only these figures, never invent a number (CLAUDE.md honesty), no
  diagnosis / injury treatment / doses, Egyptian Arabic or English as asked, ≤4 sentences.
- **Acting**: never directly. "DO: <request>" on its last line becomes a button that sends that
  request through the app's own parser (data-chatsay), which shows it and asks; a request the parser
  does not know is dropped.
- **When it answers**: only what the rules could not — `unknown`, or a question met only loosely by a
  textbook passage (chat.js: such a `know` goes to it when it is ready, with the same passages). Every
  request, log, command, textbook answer and hard limit stays with the rules. Not what I asked →
  "Let the smart coach try". Its answers say they were written by the model and can be wrong.
- **Setting**: Profile → Smart coach (settings.js `set_smart`): what it costs (download, iOS 26 /
  WebGPU, battery), Small / Better, Download and turn on (progress), Turn off and remove (confirm).
  `S.prefs.smart {on,size}` schema-validated; boot loads it quietly from what is downloaded.
- Not tested with a real model here (no GPU in this environment): the plumbing, grounding, fallback
  and button path are tested with the stand-in. First real run is on the owner's iPhone.
- Tests: engine smart (prompt, Arabic, passages, DO line, thinking stripped); regression "Smart coach: …".

## InBody read from its photo; saved, the coach says what it means — branch session/inbody-ocr

CACHE `bunyan-v176`. Owner, 27 Oct: "start" on what was missing: the photo read by the app, not
copied off by hand, and the InBody result put to the plans.
- **Reader**: Tesseract in WebAssembly (js/vendor/ocr/: tesseract.js 7.0.0 + core 7.0.0, Apache-2.0;
  English and Arabic tessdata_best integer data, Apache-2.0; README.txt lists them). js/engine/ocr.js
  `readPhoto(file, onProgress)`: the photo shrunk to 2000 px, English + Arabic, LSTM only, worker
  terminated after each read. SIMD core where WebAssembly SIMD validates (~3.9 MB), the plain one
  otherwise; ~4.6 MB of language data. Fetched only on the first read; sw.js keeps js/vendor/ocr/ cache
  first in "bunyan-ocr", across releases (activate deletes only old "bunyan-vN"). Checked offline:
  read once online, reload offline, same photo reads.
- **Sheet**: choosing the photo reads it (common.js `ibPhoto`); only the status line `#ibOcr` changes
  while it reads (CLAUDE.md rendering rule); its text goes into the paste box and through `ibRead`, so
  every figure is shown to be checked. A newer photo or a closed sheet drops an older reading. Paste
  stays for a figure it misses. `ibRead` moved to common.js (handlers share through common only).
- **readInBody**: a right-to-left sheet read off a photo comes out "range, figure, label": the figure is
  the number nearest before the label that is not part of a range. Bidi marks stripped.
- **Saved → the coach**: saving opens the coach on "What does my InBody mean for my plans?": aInBody's
  reading, the textbook's range (11.4), and Change my goal when it points the other way (both plans are
  rebuilt on a goal change).
- **Not changed, on purpose**: maintenance stays Mifflin-St Jeor × activity. The knowledge base (8.4)
  names Katch-McArdle (lean-mass based) but says every equation underestimates and more so for muscular
  people, and offers no better one (FORMULA-RECONCILIATION row 10). Protein stays g per kg of body
  weight, as the book gives it. InBody's weight is the day's weigh-in, so targets already follow it.
- Tests: engine inbody (right-to-left photo text); regression "InBody from its photo: …" (a drawn sheet
  read in the browser, outside requests blocked and none made, figures in fields, save opens the coach).

## Motion, two sessions a day, a smarter smart coach — branch session/motion-coach

CACHE `bunyan-v177`. Owner, 28 Oct (screenshots): the RPE card "disappears" on a tap; motion in the
workout and in every phase of the chat (keyboard up or down, bigger or smaller, sending) too fast or
jumping; the smart coach answered "two sessions a day?" with "don't forget to rest" and the follow-up
with an unrelated passage; and the two-sessions option could not be found.
- **Motion token** `flow` 400 ms (motion.js, Base Web timing400): a card arriving on, or leaving, a
  screen in use. `leave(el, done, slow)`; `.rowout.slow`.
- **Workout**: render.js marks `.sess [data-k]` (not inputs), so each card that appears (rest, RPE,
  Next exercise, a set row) arrives (`cardIn`, decelerate). Next exercise has its own key (`lognext`):
  a new card, not the log button relabelled. The RPE question: the chosen number is held a moment
  (`V.rpeOut`, drawn by vRpeAsk so the rest clock's renders do not cut it), then it plays out and the
  cards below rise. `.sess .rpeask` lost its own animation, which outranked the exit. The rest card,
  once over or put away, plays out where it was (render.js `leavingCards`/`playOut`: the removed node
  put back as an inert, id-less `.ghost`; patch.js steps over ghosts).
- **Chat**: the keyboard, ahead of itself (view.js `kbPredict`, keyboard.js focusin/focusout on iOS):
  once its height is known, a field taking or losing the focus sets `--vvh` at once, so the panel and
  sheets glide alongside the keyboard (`--m-kb` 380 ms) instead of after it; readings from before it
  moved are ignored for 800 ms. The compact box's max-height eases too. Bigger/smaller while typing
  keeps the field, its text, caret and keyboard (coachfab.js). A tap on a panel button keeps the
  field's focus (bindPanel, mousedown), so the keyboard stays and nothing moves under the finger; the
  panel's two-step drop after the keyboard (`body.kbleave`) is gone. Close 260 → 340 ms (`--m-close`).
  Reduced motion: no transitions on the panel.
- **Two sessions a day**: Training's today card always offers "Add another session today" (the
  `another` sheet, worded for before or after today's first); the builder says how, By weekday (tap a
  weekday another day has; such a chip is dashed, not faded) and In rotation (switch to By weekday).
  Coach intent `twice` (EN/AR) → aTwice: the two ways, with buttons for each.
- **Smart coach**: a question met only loosely by a passage now goes to the smart coach whenever it is
  ready (not only when no rule knew it). smart.js gives it "How the app works" (where each feature is)
  and the person's program (name, schedule, days, weekdays), and tells it to answer for this person,
  name the place in the app, and leave out filler.
- Tests: regression "Workout motion, with motion on: …", "Chat motion: …"; coach intent cases; engine
  smart (app guide and program in the prompt).
- **The sent question, seen flying** (owner, 28 Oct: "the moment I tap send … leaves the text box and
  drops into the chat"): the flight existed but went behind the panel (`.chat-ghost` z-index 60 under
  #cpanel's 95) and aimed at where the question was before the conversation scrolled to it. Now over
  the panel (97, under sheets), the conversation brought to the new exchange before measuring, and it
  leaves from the field's text (its leading edge, the field's line), lifts a little and drops in.
- **Compact box, one height with a conversation** (`.cp.has-log`): it grew in jumps as the question,
  the dots and the answer came in, under a question still in flight. Empty it fits the welcome; the
  first exchange takes it to its full compact height in one glide (flip).
- **Close keeps the field too** (bindPanel): the one button that let the field go dropped the keyboard
  flag, the panel shifted and the tap missed (the reason `body.kbleave` existed). fabShown ignores a
  "kb" that is the panel's own field, so the launcher returns as the panel closes.
- **Fixed, InBody photo**: a finished reading wrote its text over what the person had pasted or typed
  meanwhile, even when it found nothing. It now fills the box only when the box is empty.
- **Test, not app**: "Coach, a rough day" put 1,100 kcal over on any day; from Wednesday of a Saturday
  week that is more than two days can take, and the app rightly said the week is fine. The overage is
  now sized to the days left (300 kcal each); on the week's last day it expects "a new one starts".

## Audit, 28 Oct — branch session/polish

CACHE `bunyan-v179`.

Owner, 28 Oct: "look for any enhancement, bugs … UI, interface, design, UX, CSS, functionality,
efficiency … fix them and merge". A crawl of every tab, page under them and sheet, English and
Arabic, at 390 and 320 wide (errors, sideways overflow, English left in Arabic, small targets), the
assessment end to end at 320 in both languages, and full-page screenshots read by eye.
- **Clean**: no page errors, no sideways overflow anywhere, the assessment runs through in both
  languages at 320. The rest clock already paints only its numbers each second (app.js tickSession).
- **Equipment sheet**: was entirely English (intro, the equipment names, "Have it"/"No"); now through
  t(), and "No" reads "Not here"; each row says its state (aria-pressed).
- **Favourites sheet**: the empty message was English, the title shown twice, the names untranslated
  (exName now).
- **Water glasses**: the targets were 13px wide (7 at 320); the buttons now share the row with no
  gaps (about 20–24px each), the drawn glass still at most 20px.
- **Plates line** in the set card: a 28px-tall button mid-set; at least 36px now.
- **Assessment**: a figure out of range said "Enter your age, height and weight" with all three
  entered; it now names the figure and its range (assess.js youWhy; weight in the person's unit).
- Test: regression "Audit: …".
## The coach wherever the dock is; bigger with the keyboard up, in place — branch session/coach-everywhere

CACHE `bunyan-v178`. Owner, 28 Oct: "I need the coach icon available anywhere the dock is
available"; and minimised with the keyboard up, Maximise should grow the chat from its bottom
without the keyboard closing.
- **fabShown** (coachfab.js): the launcher is wherever the dock is: every tab and every page under
  them (a day, the builder, a meal, the history, the profile, the assessment). Not over a live workout
  or run (the dock is away there too; the workout's header opens the coach), a sheet, the full chat
  page, or the keyboard (other than the panel's own field). It sits in the dock's band, beside it, and
  the dock makes room (cfab-on), so it covers no content.
- **Bigger or smaller is patched, not rebuilt**: the field stays the same element, so the keyboard is
  never touched and the box grows from where it sits above the keyboard (flip from its old rectangle).
- Tests: regression "Coach launcher wherever the dock is: …"; "Floating Coach: on every tab, …".
- **Under the sets, no Add exercise** (owner, 28 Oct, screenshot: "makes no sense to be here"): adding
  one is in today's list (the title's ⌄, "Add an exercise"). And **no Skip once the sets are done**: the
  big button is Next exercise then, and Skip beside it was the same thing twice. Skip shows only while
  the exercise has sets still to do.

## Audit, round two: the core flows by touch — branch session/polish2

CACHE `bunyan-v180`. The flows driven as a person would, by tapping and typing (not by setting state):
log a food from search, add an exercise from search mid-workout, log a set after typing the reps,
save a weigh-in.
- **Fixed, the first tap on a search result did nothing** (food and exercise search sheets): while
  typing, the sheet hides its title and counts (`body.kb .srch`); the tap that takes the keyboard away
  brought them back and pushed the list down 65px under the finger, so the + was missed and only a
  second tap added. They now stay aside for a moment after the keyboard goes (`body.kbleave`). The
  full chat page's box had the same move and gets the same moment.
- **Fixed, the weigh-in could only be stepped in tenths**: with a weight on record the sheet showed a
  display-only stepper (84 to 79.6 was 44 taps). It is always the typable one now, starting from the
  last weight; the display-only `stepper()` had no other use and is removed.
- Checked and right: a set logs on the first tap after typing its reps; an exercise is added on the
  first tap after a search.
- Tests: regression "Search sheets: typing, then the first tap …" (fails on the old CSS, passes now);
  "Weigh-in: with a weight on record …".

## Done on the keyboard: the chat glides down once, no bounce — branch session/kb-close

CACHE `bunyan-v181`. Owner, 28 Oct (screenshot, compact chat, the keyboard's ✓): the panel bounced up
and down, then settled.
- **Cause**: going down, the prediction set the whole screen at once, but iOS's readings on the way
  (sizes in between, and the page's offset held up until the very end) were still taken, each pulling
  the panel back up mid-glide. Now, while the keyboard is going down, nothing it reports is taken; the
  reading after it has gone settles it (view.js syncViewport).
- **And**: the panel's room above the dock came back 60ms after the screen did (when the keyboard flag
  dropped), two moves started apart. Now in the same instant (`body.kbdown`, set by kbPredict).
- Slower: `--m-kb` 380 → 440ms.
- Test: regression "Chat, iPhone keyboard closed with Done: …" (an iPhone browser with iOS's viewport
  readings played in; the panel sampled every frame: one way, no turn). Fails on the old code.

## The training calendar: Today, and the week held open into the month — branch session/calendar

CACHE `bunyan-v182`. Owner, 28 Oct (screenshot of Training's week): "a small return to today button,
plus it needs to expand with slow animation when I tap on it and hold to see the whole calendar and
check training days from past weeks".
- **views/train.js weekStrip** (Training's own; Home's "openday" strip is unchanged): the week and,
  folded under it, the month (`monthGrid`: the person's first weekday, the months either side quieter,
  training days ticked, planned ones dotted, the month's session count, ‹ › for any month). Both are
  always in the page, one folded to nothing (`.twk-fold` / `.twk-mo`, grid rows 1fr↔0fr with opacity,
  `--m-cal` 620ms, `--e-cal` an even ease in and out: the app's usual curves cover most of the way in
  the first third and read as quick). The folded one is inert.
- **Opening**: held (js/ui/calhold.js: 480ms without moving more than 10px; the tap it ends with is
  swallowed so no day is picked; the phone's own long-press menu is kept off) or the ⌄ in the header,
  which stays for anyone who does not hold and for a screen reader (aria-expanded). Held on the month,
  it folds back. A day in the month shows in the card below, as a day of the week does (V.tdate).
- **Today**: a pill in the header whenever another day or another month is showing; one tap back to
  today and its month (handlers/train.js caltoday). V.calOpen, V.calM.
- Tests: regression "Training calendar: …" (⌄, months, a past training day shown below, Today, held
  both ways, the hold's tap swallowed); "week strip: …" now counts the week's row.
- **Food's calendar, the same way** (owner, 28 Oct: "do the same for this calendar … keep its style,
  just add the animation"): js/ui/datebar.js rendered its month only when open, so it appeared and
  vanished. It is now always in the page, folded (`.dbfold`, inert) and unfolding with `--m-cal` /
  `--e-cal` as Training's does; the bar's ⌄ turns at the same pace. Its look (.dbcal) is unchanged.
  Test: regression "Food's calendar unfolds slowly …".

## The run page: a phone sitting still runs nowhere; controls fixed; pace now and splits — branch session/run

CACHE `bunyan-v183`. Owner, 28 Oct (screenshots of a live run): "the buttons should be fixed to the
bottom of the screen not moving … The line drawn should represent a running path, but in fact it drew
this while I was sitting on the chair and shook my phone … think as a runner".
- **Why the line appeared**: every fix the phone reported within 30 m of accuracy was kept once it lay
  more than a few metres from the last, so a still phone's wandering GPS (5–20 m of noise) added up
  to a path and distance. js/engine/run.js addFix is now one pipeline, tuned by simulation (`RUNTUNE`):
  fixes worse than 25 m dropped (20 m to start the line); a leap no runner makes dropped; a light
  Kalman smoothing whose trust in each fix follows the phone's own speed reading; **stillness** — the
  phone's speed under 0.4 m/s with the move inside twice its accuracy, or 15 s in which the net
  movement stayed inside max(10 m, 1.5 × accuracy) — adds no point and no distance; a point is kept only
  past max(10 m, 2 × accuracy, capped 25 m). Simulated: a still phone with 15 m of noise over 10 min
  ≤ 27 m (was hundreds); runs within 1.3 %, track loops 1.5 %, walks 4 %.
- Points carry moving time ([lat, lon, t, ms]) so **splits** (`splitsOf`) and **pace now** (`paceNow` /
  `speedNow`, over the last ~200 m or 60 s of points ending at the newest one) leave pauses out.
  js/schema.js accepts 3- and 4-element points (it was dropping the new ones).
- **Page (js/ui/run.js vRun)**: moving time big; distance its own card; pace now, average and
  "≈kcal, an estimate" beneath; a status pill (Finding GPS…, Not moving…, Paused); splits by km with
  the change from the one before; a tap and a "Kilometre n · m:ss" note at each km. The controls are
  fixed to the bottom over a fade: Pause alone while running (no finishing by accident); paused shows
  Resume and "Finish and save". GPS reads on / fair / weak.
- Not done, by what a web app can do: tracking with the screen off (the phone stops sharing position
  with a page in the background; the note says so), and auto-pause (the "Not moving…" status shows
  instead, the time keeps counting). Needs checking on a real phone outdoors.
- Tests: engine run.test.js (noise tables, still phone, km runs, rough / leap / paused, splits, pace now);
  regression "Live tracking: a phone sitting still, its GPS wandering, is not a run …" (105 m on the old
  code, nothing now), and the run / ride / hike tests for the new layout and fixed controls.

## Warm-up for each session's own lifts; the coach on it; the chat opens up as you type — branch session/warmup

CACHE `bunyan-v184`. Owner, 28 Oct (screenshots of the coach): "I am not sure why I see the same warm up
in every session, I think warm up and static stretches at the end could vary based on the exercise and
the training session itself"; the coach answered "customise my warm-up for each session in split" with
Split Squats; "when chat is minimized and I open the keyboard … automatically maximize with slow
animation so the user can see the chat".
- **Why the warm-ups looked alike**: js/engine/warmup.js chose drills by muscle only, two or three per
  muscle, so every upper-body day came out Thoracic Rotation, Pass-Through, Arm Circles, Arm Swings, and
  push and pull days nearly matched. It now reads each lift's **movement** (`moveOf`: press to the front,
  overhead, raise, row, pull-down, arms, squat, lunge, hinge, glute bridge/thrust, hamstrings,
  adductors, calves, core), weights the first lifts more (×2, ×1.5: done fresh and heaviest), and takes
  drills per movement, the main one two (`DRILLS_FOR`, 14 movements, 32 drills, the new ones all
  photographed library entries). The count follows the day: 4 to 6 (the book: 3 to 10). The opener
  follows the day too (whole body with legs in it, upper back on a pull day, shoulders on a press day).
  Mobility work in the plan does not count as load. The library calls leg curls elbow flexion: arms
  drills only for arm muscles.
- **Stretches after**: per muscle as before (the book: static stretches of the muscles worked, 30 s),
  more of them (biceps, forearms, a second for shoulders, triceps, hamstrings, calves, core), and the
  movement picks which comes first (`STRETCH_FIRST`: a row ends on the middle back, a pull-down on the
  lats, an overhead press on the front delt, a lunge on the hip flexor). Biceps no longer get the chest
  stretch. Simulated over every preset day (scratchpad wu2.mjs): push, pull and leg days now differ.
- Arabic names for the new drills and stretches (exnames.js whole-name terms).
- **Coach**: new intent `warmplan` ("can the warm up be customised…", "why is my warm-up the same every
  session", "الاحماء نفس الشكل كل تمرين ليه") → chat.js aWarmPlan: yes, how it is built, and the next
  session's actual drills and stretches. Before, no rule knew it, the smart coach offered to "set a
  custom warm-up" (nothing to set), and the follow-up's "split" matched Split Squats in the plan:
  "split", "session" and "exercise" no longer name an exercise on their own (GENERIC).
- **Chat**: the small panel's field tapped on a phone (pointer: coarse) grows the panel to the whole
  conversation once the keyboard is up (480 ms), at the calendar's slower even pace (flip `slow`,
  --m-cal / --e-cal); the field, what is typed and the keyboard stay. Made smaller while typing, it
  stays small (no new focus).
- Tests: regression "Warm-up engine: each day warms up for its own lifts …", "Coach, warm-up: …",
  "Coach panel: the small panel's field tapped on a phone, it grows by itself …"; intent cases.

## Training the coach: a question bank, an answer bank, and a measured loop — branch session/coachtrain

CACHE `bunyan-v185`. Owner, 28 Oct: "train my smart coach, do a full program on how to make it smarter …
simulation of every question that could be asked … start training and entering these info to its
database". The on-device model itself (Qwen 2.5, prebuilt) cannot be retrained here; what makes a small
model smart is what it is given and what answers before it, so that is what was trained.
- **Measuring first.** tools/coach-eval.mjs runs every question in a bank through chat.js ask() in the
  real app (Playwright, a seeded lifter, smart coach off) and checks where the answer came from (a rule
  on the person's own log, the textbook search, the answer bank, the limits). Banks, EN / Egyptian
  Arabic / Franco-Arabic: tools/coachdata/questions.mjs (537, the tuning set), heldout.mjs (173, written
  after round 1), heldout2.mjs (136, written after round 2, run once). Reports beside them.
- **Results.** On questions never tuned on (heldout2): main 41.2 % → 77.2 % (Arabic 16/41 → 31/41;
  no answer at all 18 → 5). Tuning set: 56.2 % → 99.3 %. Held-out round 1 (now tuned on): 45.1 % →
  80.9 %.
- **The answer bank** (js/data/faq.js, matched by js/engine/faq.js): 70 answers (training, cardio,
  mobility, food, body, habits, and 21 on where things are in the app, each with a button there),
  1,125 example wordings, every line in English and Arabic (FAQ_AR joins the dictionary). Each answer
  is written from the knowledge passages it cites or from the app's own code; js/engine/test/faq.test.js
  fails if a figure is not in a cited passage (or listed from the app), a source does not exist, a line
  has no Arabic or its Arabic carries other figures, or an answer cannot be found from its own examples.
  Where the textbooks do not cover something (alcohol, intermittent fasting, Ramadan, cheat days, cardio
  order), the answer says so and gives only what they do say around it. Matching: the knowledge search's
  terms plus gym slang and Arabic skeletons, idf-weighted best-example overlap; an answer's defining
  word missing makes a match 0.55 as strong (need).
- **Routing (chat.js).** The bank answers when no rule knew the question; stands in for a rule the words
  only touched (beats, ≥ 0.6) unless the question is about the person's own log ("am I", "did I",
  "بتاعي"); a very close answer (≥ 0.75) beats a barely-matched rule. It never takes requests, logging,
  the limits, a pending choice, or "my heart rate"-style no-data questions. Follow-ups ("why?", "but how
  many?") stay with the answer before. A request whose object is neither an exercise nor a food ("how do I
  add another profile") goes to the app answer. A logging command is not run from a question ("اشرب
  مايه قد ايه" no longer logs a glass).
- **Fixed on the way**: the limits matched inside Arabic words ("ملخص" as a sprain, "التوتر" and "سبوتر"
  as a tendon, "مكسره" as a fracture) — whole words now; "سكر", "ضغط", "حمل", "cholesterol", "vitamin"
  and "pre-workout" count only in their medical / supplement sense; "do I have" needs a condition after
  it. "بكره" (tomorrow, folded) was saved as "I hate". "Kept" facts no longer swallow questions. Pain
  reported as a situation now says to see a physio or a doctor if sharp, swollen or lasting. The warm-up
  answer no longer names a "+ Warm-up" button that is gone. ~60 intent wordings added (tomorrow, stuck
  lifts, records, steps, sets, rest, tempo, 1RM, Arabic and Franco).
- **Smart coach**: buildMessages now gives the model the two closest bank answers as notes.
- Tests: engine faq.test.js (7 checks over all 70); regression "Coach brain" now expects the Sleep answer.
- Next rounds: run heldout2, fix by pattern, write heldout3 and run it once; add answers where a topic
  keeps missing.

## The coach reads recovery before the next day; Training's calendar in Food's look, paced — branch session/recovery

CACHE `bunyan-v186`. Owner, 2 Nov: "I have push today, but I decided to train pull, and tomorrow was
planned to be pull: the app should understand that the muscles trained today need time to recover …
and suggest or change the next day"; "make the calendar in the training page look like the one in food,
and make the click to full calendar animate well, not too slow, or fast".
- **js/coach/recovery.js** (pure): readiness per muscle from the log. The textbook's rule (acute
  variables · frequency): at least one rest day between sessions on the same muscles, so a muscle is
  fully ready two days after a hard session and part-way the day after, by how much it did (a set counts
  in full for its main muscle, half for the ones it helps, half again at RPE 6 or easier; FULL = 4 such
  sets is a full session's dose, a modelling choice, so readiness is only ever said in words). Soreness
  7+/10 logged in the last two days holds recent muscles back. A planned day's readiness is its planned
  sets weighted by each muscle's; when under 0.65 and another training day of the split is at least 0.25
  fresher, the nearest such day after it in the split's order is suggested, naming the tired muscles.
- **js/engine/recovery.js**: the same for this profile and a date (log, soreness, library); a day already
  moved or kept by hand (S.daySwap) is left alone.
- **Training**: a coach card under the day's card offers the fresher day ("Most of Pull lands on back
  and biceps, trained yesterday … Legs is fresh") with Train Legs instead / Keep Pull; either is kept as
  that day's swap. The chat's "What do I train today?" says the same with the same button.
- **Calendar**: Training's month is now Food's calendar markup (.dbcal / .dbgrid / .dbday): round
  arrows, this month's days only, a filled dot for a day trained, a ring for one planned. Motion:
  --m-cal 620 → 380 ms on an ease-out curve (it read as lag), opacity at 0.6 of it; Food's month too.
- Tests: coach recovery.test.js (10); regression "Recovery: Pull trained yesterday, Pull due today …";
  calendar tests updated to the new cells and to "paced, not slow".

## A week built for the person, not a template; a deeper assessment — branch session/builder

CACHE `bunyan-v187`. Owner, 2 Nov: "the food and workout plan are not customized based on each person
… you have ready templates, which shouldn't be the case; everything should be tailored to the user's
input and assessment, which you can change if it doesn't collect all the needed info".
- **js/engine/build.js** (pure; added to architecture's PURE list): buildWeek(p, gear, helpers).
  1. Weekly hard sets per muscle from js/coach/landmarks.js RANGE for the experience: the middle for a
     size goal, the bottom for other goals and whenever sleep is under 6 h or stress is high; one level
     up for up to three priority muscles. Arms get half of their own (presses and rows give the rest);
     calves and core 6 (8 if priority). Nothing here is a new figure: the range is the app's existing one.
  2. Placement: push (chest/shoulders/triceps), pull (back/biceps) and legs are each placed as a unit
     on as many days as their sets need (2–3; every day for ≤3 days, the whole body each session), with
     every pair of a unit's days at least two apart round the week (the textbook's rest day between
     sessions on the same muscles). Every combination is tried; the chosen one uses every day, keeps
     the days' work even, and with four or more days does not mix an upper day with legs. Core goes
     on the lightest days. Upper/Lower, Push/Pull/Legs or full body come out of that, not from a list.
  3. Exercises: from the movements the app's own programs use (PRESETS' names), plus starred and
     logged ones; nothing hidden, out of reach for the equipment, or loading a sore spot; no slams,
     olympic lifts, strongman, jumps, mobility or conditioning; Nordic/glute-ham/pistol and the
     library's Advanced only for experienced lifters; a deadlift is a leg day's hinge, a shrug is not
     back work. Only when the equipment leaves a muscle under two kinds of movement does the wider
     library (plain strength, beginner–intermediate) fill in. Starred +8, logged +4, in the pool +3.
  4. Volume: each muscle gets the exercises its weekly sets still need after the half-sets earlier
     muscles' exercises gave it (the same counting as volume.js), sets per exercise from doseFor so
     the week is what the plan engine will hold; one exercise per muscle per day first, then more
     while the session length (mins − 8 for the warm-up) has room, up to three per muscle per day. A
     muscle the day's presses or rows already work gets an isolation exercise next (a raise, not a
     second press). The priority muscles come first in their sessions.
  plan.js: generatePlan() now builds this by default (id "built", schedule "week" on the given or
  spread weekdays, plan.built = {targets, freq}); a preset id still gives that template, shaped as
  before. Shoulders read high on the volume bars in most weeks: rows and presses count half a shoulder
  set each under the app's counting, and the builder already gives shoulders a single raise a day.
- **Assessment** (js/ui/views/assess.js, handlers/coach.js): a new step after "Where do you train":
  muscles to bring up (up to three, cap enforced with a toast) and big lifts you won't do (merged
  into S.skip on "Use this plan", and back out on Undo). The week step takes fixed weekdays (two or
  more set the day count; picking a different count lets them go). The sleep step asks stress
  (low / normal / high) and says what it changes. Profile now carries wd, focus and stress. The
  result shows "Built for you" first, chosen, with why from what it was built on; the templates stay
  as alternatives. Intro no longer counts the questions.
- Arabic for every new string; "Built for you" and day letters D–F in exnames.
- Tests: js/engine/test/build.test.js (7 profiles × rest rule, every day used, no odd movements, only
  owned gear, session length, full body on ≤3 days; targets for focus, sleep and stress; hidden and
  starred exercises; priority first). Regression: the first-run assessment test walks the new step;
  new "Assessment: fixed days set the week, stress and short sleep lower the volume …" (EN + Arabic RTL).
- Not changed: the assessment's chips still re-render the screen (as they did before this branch);
  that is against the innerHTML rule and is left for its own change rather than widened here.
## Meals from your own food — branch session/ownmeals

CACHE `bunyan-v188` (after session/builder's v187). Owner, 2 Nov: "Then start on the meals from my own
food" (the suggestion: a meal plan written from what you log, not the app's plates).
- **js/engine/habits.js** (pure; in architecture's PURE list): the last 28 days of the food log →
  `eaten` (days each food was logged) and `usual` meals: the same two or more foods together in a meal
  on 3+ days, up to two per kind (Breakfast; Main = Lunch/Dinner; Snack; a meal of their own by its
  energy, 350 kcal+ is a main), with median grams and the meal it is usually eaten at. Only items with a
  food id the database or My Foods knows, energy above zero, and grams.
- **js/engine/mealplan.js**: a usual meal is tried first for its kind (the one usually eaten at that
  meal first, each once a day). Each food takes the part its energy says (protein ≥ 30 % of kcal, fat
  ≥ 60 %, carbohydrate ≥ 50 %; anything else stays at its usual amount), moves between half and twice
  the usual amount in a counted serving or grams, and the same solver as the plates fits it to the
  meal's share; it is used when it lands within 20 % of the meal's energy, otherwise the app's plates
  as before. In every plate a slot now takes the food the person logs most when one fits ("Another
  version" moves to the next of theirs). Densities use the food's own `per`, so My Foods work.
- nutrition.js `ownFood()` reads it with the database loaded; the assessment's meal plan and Coach's
  "New meal plan from my targets" pass it (refreshed after the database loads).
- Review screen: a usual meal says "Your usual: logged on N days in the last four weeks. The amounts are
  set for your targets."; the day says how many of its foods are ones they log, or, with no log, that a
  few days of logging makes the plan theirs. Arabic for all three.
- Tests: engine habits.test.js (9); regression "Meal plan from your own food: …" (EN + Arabic).

## The weekly check-in: last week read, specific changes to approve — branch session/checkin

CACHE `bunyan-v189` (after ownmeals' v188). Owner, 2 Nov: "start the weekly check-in" (the suggestion:
"each week the coach reads volume per muscle, how hard sets felt, soreness, bodyweight trend and missed
days, then proposes specific changes for you to approve").
- **js/coach/checkin.js** (pure): last week (the seven days before this week began) and the week before.
  Facts, each only with data: workouts against planned (a session of activities alone is not one),
  average RPE of working sets against 10 − the goal's accessory RIR, soreness from the recovery sheet,
  food days and average kcal against the target, and the weight's slope (least squares, 3 weeks, 4+
  weigh-ins over 10+ days, said as an estimate) against the goal's pace = (target − maintenance) × 7 /
  7,700 kcal per kg (the app's own gap, the same constant as coach/energy.js). Changes:
  - days: planned ≥ 3 and both weeks short → a week built for the average trained (≥ 2);
  - kcal: under ½ or over 1½ × the pace (or drifting > 0.25 kg/wk on a hold goal), only on a week with
    food logged on 4+ days within 10 % of the target (else the eating, not the target, is off), STEP =
    100 kcal (a modelling choice: a small step, then another week), never under kcalFloor;
  - deload: soreness ≥ 6 on 3+ days, or 12+ sets averaging ≥ 1.5 RPE over plan; not during one;
  - balance: the program's planned weekly sets per judged muscle under the range or > 1.15 × its top.
- **js/engine/checkin.js**: the inputs from state; open while a new week's check-in is not closed
  (`S.ckDone`) and last week has something logged; changes made this week (`S.ckDid`) drop off. Both
  validated in schema.js.
- **Coach page**: a "Weekly check-in · Last week" card under the week card: facts, each change with its
  button (Build a 2-day week / Set 1,900 kcal / Start a lighter week / Balance the volume), "Not this
  week" or "Got it". Each change has Undo; kcal moves carbs by kcal/4, protein and fat stay; days sets
  profile.days (clears fixed weekdays that no longer match) and rebuilds the built week.
- **Chat**: "How was my week?" ends with the open check-in's changes and the same buttons ("From last
  week's check-in:" outside the first two days).
- js/ui/checkin.js (shared ui module): the words, figures in .num (a trailing full stop kept out).
  Arabic for every string; checked in RTL.
- Tests: coach checkin.test.js (14); regression "Weekly check-in: last week read on Coach …".

## One calendar: Food's day bar on Training too, the month unfolding inside the bar — branch session/datebar

Owner, 2 Nov (screenshots of Food's bar, then of its month as a separate card under it): "I meant all the
calendar to look like this one, and when it expands, it expands from the calendar bar body, not as a
separate full calendar".
- **js/ui/datebar.js**: the bar and its month are one card (`.dnav-card`, carrying the surface, the
  today accent and the shadow that `.dnav` had); the month (`.dbfold` → `.dbcal`) unfolds inside it under
  a hairline, with no card of its own (`.dnav-card .dbcal`), so the bar's own body grows and folds back.
  "Back to today" sits under the card. New `o.mark(iso) → {t, p, lbl}` for a screen's own marks.
- **Training**: the week strip and its separate month (and the press-and-hold, js/ui/calhold.js, and its
  handlers tweek/calopen/calm/caltoday) are gone; Training uses the same dateBar (future days open), its
  second line saying what the day holds (the plan's day, "Done", "Rest day", "Nothing logged"), its
  month a dot for a day trained and a ring for one planned (ring 6 px so it reads as a ring). The shell's
  dday/dopen/dmonth/dpick handlers already served Train (V.tdate, V.tcal).
- The guide's Training tip now points at the bar; the light theme's glass list names .dnav-card.
- Tests updated: Training opens with the bar; "Training's day bar: the next day …"; the week-starts-on-
  Saturday checks read the month's first column; the Training calendar test checks the month is inside
  the bar's card under a hairline with no card of its own, rings for planned days, a past day picked folds
  it back; Coach AI's gauge is checked against the plan's week.

## A missed day, rebalanced — branch session/missed (on session/datebar)

CACHE `bunyan-v191`. Owner, 2 Nov: "start rebalancing a missed day" (the suggestion: "if you skip a day,
the coach moves its key work into the rest of the week instead of dropping it").
- **js/coach/missed.js** (pure) `rebalanceWeek`: only a program on weekdays loses a day by missing it (a
  rotating one carries on from what was trained), so only that is read. The latest planned day before
  today this week with no session and not yet dealt with; its main muscles are what its exercises
  mainly train, a quarter of its sets or more (a row's half-set to the biceps does not make biceps a
  main muscle); it tires nothing, since it did not happen.
  1. move: the first free day from today on, with no session of 2+ sets on those muscles the day before
     or after (the textbook's rest day between sessions on the same muscles);
  2. fold: else, for each main muscle the days left will not train (as main muscle) at half the missed
     day's sets, the missed day's first multi-joint lift for it, KEY_SETS = 2 sets (a modelling choice),
     onto the first day left whose neighbours do not train that muscle and that has the time
     (session length − 8 min warm-up, +5 slack, the lift timed with doseFor's rest);
  3. covered: the days left train those muscles anyway: nothing to carry, and it says so;
  4. none: nothing fits; let it go, said plainly, naming what could not fit.
- **js/engine/missed.js**: this week with a day either side (sessions for days trained; pinnedOn for days
  past, planOn — swaps included — for days ahead; lifts already carried counted in).
  `S.dayAdd {date: [lift]}` holds carried lifts (with doseFor's reps, rest and effort, 2 sets);
  `S.missedDone {date: 1}` marks a missed day dealt with; both validated in schema.js and pruned to this
  week. startDay adds a date's carried lifts after the day's own.
- **Training** (today only): a coach card, "You missed Pull on Sunday." then: "Today is free … train it
  today." [Move it to today] · or "… its key lifts go into the days left: Bent Over Barbell Row, 2 sets,
  today." [Add it] · or covered / none [OK]; [Let it go]. Each with Undo. Today's card says "plus Bent
  Over Barbell Row from a missed day" and counts it in. Arabic throughout; figures in .num.
- Tests: coach missed.test.js (9); regression "A missed day: moved to a free day …, or its key lift
  carried into the next day and into that workout …".

## Dock "Coach" / Coach Hub, the travelling red, stress kept in mind, a warm coach — branch session/dockhub

CACHE `bunyan-v192`. Owner, 2 Nov.
- **Dock**: the planning tab is "Coach" (الكوتش), its page "Coach Hub" (مركز الكوتش). The red is one shape
  (`.dock-hl`) under the buttons (js/ui/dock.js moveHl): on a change of tab it eases from the old button
  to the new one, following the new one as it opens into its pill, and lands on it; reduced motion, it is
  simply there. The open tab's own fill is transparent.
- **Stress** ("I set stress to high so it lowered the volume, but afterwards it shows 'Some muscles get
  little training' … it should remember … and schedule a follow-up"): js/engine/stress.js. High stress or
  sleep under 6 h keeps the week light on purpose; while it does, the plan check's vol-low, the coach's
  "under" insight and the weekly check-in's "under your range" stay quiet (too much is still flagged).
  profile.stressAt is the day it was said (assessment); the coach asks again after 28 days (the
  textbook reassesses assessment answers "monthly or quarterly", assessments.js protocol · reassess) or
  when told "It's better now". A Coach card says it is light on purpose and when it will ask; the
  follow-up asks stress (and sleep, if that was the reason), one tap: no longer the reason → stressAt
  cleared and the built week rebuilt, with Undo; still high → asked again in four weeks.
- **Chat**: the coach's indexes (knowledge search ~265 ms cold, answer bank ~48, phrases, food and
  exercise names) are built when the chat panel is bound, a piece per idle moment (warmCoach); the
  first question no longer waits 60–100 ms before the message leaves the box (the intermittent
  "no message flying from the box").
- Tests: "Dock: the red travels …", "Stress said high: …"; the dock label test reads Coach/الكوتش; the
  light-theme dock test reads the red off the travelling shape; the Arabic figures test no longer needs
  the week strip's fraction (gone with the day bar).

## A day told in one message; food by its everyday name; foods you like — branch session/dayrecap

CACHE `bunyan-v193`. Owner, 2 Nov: "the coach should be smart … I should be able to ask things like … or vent
out: اتا كلت بيض النهاردة في ساندويتش … ولو ينفع تدخلي المعلومات ديه في اليوم بتاعي"; "the food names [should] be the
common ones: Tilapia in Egypt is called سمك بلطي, Bolti"; "I am not sure if the food is being customized … if
there are better assessments for food … start displaying it".
- **js/coach/recap.js** (pure): a day told in one message → foods (the words, the meal from a time word,
  whether the amount was a guess, the pieces of an "و" written onto the next word), muscles trained,
  "what else" and "put it in my day". Clauses start at each verb, so "… الضهر وكمان اتمرنت ضهر" is a meal
  then a workout. A single food, a question, or "I had a bad day" is not a day told.
- **Chat** (recapMsg): only when a food it knows or a workout is in it. Foods found by the food search
  (score ≥ 85, cooked over raw; "X في ساندويتش" tried as the sandwich first), one usual serving each unless
  said (said as an estimate); one card "Add to my day" (new action food.logMany, each to its meal, Undo).
  What it couldn't find is named ("سكريات"), the workout noted without inventing sets, and what else today:
  rest for what was trained (and tomorrow's plan if it trains it too), protein left with a protein food and
  how much it adds, kcal left or over (no stricter tomorrow), water left, sleep 7–9 h (KB). Answered in the
  language asked, whatever the app's language (as every answer already was).
- **Food names** (nutrition.js foodName): in Arabic the everyday Egyptian name (first Arabic alias; AR_NAME
  where it needs writing out, e.g. سمك بلطي, شاورما فراخ, رز مصري; "(ني)" on raw); in English the database
  name with the local one beside it where Egypt says it differently (Tilapia (Bolti), Grey Mullet (Bouri)).
  Shown everywhere a food is (Food, the add-food sheet, the day sheet, the assessment, the coach); stored
  names are untouched. chat.js's own foodName removed in favour of this one.
- **Foods you like**: the assessment's food step offers the meal plan's staples to pick (prefs.likes); the
  plan counts them as eaten on two days (ahead of its own choice, behind what the log shows). The result says
  what the meals were built from: meals a day, style, diet, what is left out, the person's foods that made
  it in, and usual meals served again; the plan review counts foods "you log or picked".
- Tests: coach recap.test.js (11); regression "A day told in one message, in Arabic with the app in
  English …".
## Trained days are green dots — branch session/greendot

CACHE `bunyan-v194`. Owner, 2 Nov: "the days I trained should be green dots". In the month (Food's and
Training's, js/ui/datebar.js): a day trained is a solid green dot (--ok), a planned day a ring in the accent, a
day with only food logged (Food) a dot in the accent. Dots 5 px round, so they read on a phone.

## The next day follows today's, live, in a rotation as on weekdays — branch session/greendot

Owner, 2 Nov: "the app changing the next day based on the previous day doesn't work when I make it in rotation,
it only works by week". It did work once a workout was logged (a rotation follows on from what was trained),
but not as soon as today was changed, and the coach only judged a day by what was already logged:
- dayplan.js: in a rotation, today changed by hand to another day (S.daySwap) and not yet trained counts as
  the last day trained for the days after it, so tomorrow follows on from it at once (Pull today → Legs
  tomorrow, not Pull again).
- recovery.js readyOn(iso, sp): for a day ahead, the workouts planned between now and then count as done
  (planned sets), so tomorrow is judged against today's workout, trained or not yet.
- Training, on today (views/train.js aheadCard): "Coach · tomorrow": on weekdays, tomorrow's day checked
  against today's muscles with "Train Legs tomorrow instead" / "Keep Pull"; in a rotation changed by hand,
  "Your rotation follows on from Pull: tomorrow is Legs." Arabic for both.
- Tests: regression "Tomorrow follows today, live, …"; the recovery test now expects the rotation's word on
  what follows after today is moved.

## Training's calendar is a week rail — branch session/weekrail

CACHE `bunyan-v195`. Owner, 2 Nov: "Go with words and Saturday weeks … smart, not taking too much space,
function well … modern and premium with option to expand". Training's day bar (Food's `.dnav-card`) is
replaced on Training by `.wkr` (js/ui/views/train.js weekRail/railDay); Food keeps its day bar.
- One glass card: "This week / Next week / Last week / a date range", "N of M done" and a thin progress bar.
- Seven days from the week start setting (Saturday by default), each with its weekday, date and a word for
  what it holds (planName shortened: "Upper A", "Push", "—" for rest). Marks: green dot done, accent ring
  planned, dim ring a rotation's projected day, square a weekday-pinned day gone by unlogged, ⇄ moved.
- The chosen day sits on a pill that glides (--i, spring) to the day tapped; RTL mirrored.
- Arrows and a swipe on the row page a week (data-wkpage; app.js swipe takes `[data-swipe]`, "week" or day);
  "Today" appears when away. The corner chevron (data-wkopen) folds the week away and opens the month inside
  the same card (datebar.js monthGrid, exported); a day picked there folds it back onto its week.
- View state: V.twkBase (week shown, null = the selected day's), V.wkDir (slide direction), V.tcal.
- Tour: the Training tip is "Your week" on `.wkr`. Arabic for every new string.
- Tests: the Training day-bar tests now drive the rail (helper railTo); new: the rail's words, pill, paging,
  swipe and moved mark; the rail in Arabic.

Then, same day (owner, with a concept image): "remove the arrow buttons … gesture-first … tap the selected
day again to expand its details … tap again or outside to collapse … the header transitions with the date
range underneath":
- No arrows on screen. Swipe pages the week; the row follows the finger while dragging (app.js touchmove,
  `translate` on `.wkr-r`, snaps back under 48 px), and a page change gives the haptic. Two visually hidden
  buttons (`.vh` data-wkpage) remain for keyboard and screen readers.
- The month opens from a small calendar icon (`.wkr-cal`, lit while open), in the same card as before.
- Header: "This week / Next week / Last week / N weeks ago / In N weeks", the date range and "N of M done"
  underneath; a new week's title and days slide in from the side they came from. The bar grows in.
- The chosen day tapped again unfolds `.wkr-pk` (views/train.js railPeek): full name, a status chip (Done,
  Today, Planned, In your rotation, Missed, Rest day; Moved), exercises and sets, minutes (a session's own,
  or the plan's estMinutes shown as "~N min Estimated"), and the top muscles by sets. Tapped again or a tap
  outside the rail folds it (datebar.js setPeek: classes and inert only, no render). It stays open when
  another day is picked and shows that day. V.wkPeek holds it.

## Change workout judges each day against the muscles — branch session/smartswap

CACHE `bunyan-v196`. Owner, 2 Nov (today Full A, and the app let tomorrow be Full A too): "the app didn't scan
the muscles in my split and identify the next possible day from the load on each muscle and the rest it needs".
- Recovery model corrected (js/coach/recovery.js readiness): the day after a session is inside the textbook's
  "at least one day of rest between sessions that stress the same muscles" (acute-variables · frequency), so a
  muscle trained hard is not ready the day after (it counted as half ready, which let a full-body day follow a
  full-body day). Ready from the second day on, as before. Coach tests updated to the rule; tiredOn now names
  every tired muscle with 2+ planned sets (a full-body day gives each muscle a small share).
- engine/recovery.js dayOptions(sp, iso): every day of the plan judged for a date: readiness, the muscles still
  recovering, and the day after (weekdays: the day pinned there; rotation: the day that follows) — whether this
  choice leaves it too soon. best: the plan's own day if it fits, else the readiest that fits, else rest.
- Change workout sheet (sheets.js swapday): each row says Ready / Too soon for {muscles} / Leaves {day}'s {x}
  too soon; Best fit marked (rest when nothing fits, with a note why). Picking a day too soon asks first, with
  the rule (Train it anyway / Pick another / Cancel): the person decides.
- Test: regression "Change workout judges each day against the muscles…" (full-body and upper/lower).

## Health conditions shape the plan — branch session/conditions

Owner, 2 Nov ("all, in order"): item 1 of the knowledge-base plan. CACHE `bunyan-v197`.
- js/engine/conditions.js: rulesFor(profile) reads js/knowledge/conditions.js (chapter 23) for each condition
  the person picked (profile.conds) and the age groups that follow from age (older adults 65+, youth <18):
  reps (the narrowest range all agree on), sets max, strength days/week (said, never forced), no jumps, no
  lying on the back or front (high blood pressure; pregnancy past 12 weeks), steady breathing (no Valsalva),
  talk test (medication blunts heart rate), stand up slowly. No figure of our own: all read from the data.
- Assessment (health step): "Do any of these apply?" — high blood pressure, heart disease, diabetes,
  osteoporosis, arthritis, lung condition, PAD, cancer, pregnancy (first 12 weeks / past 12; women only).
- Plan (engine/plan.js): limitsOf(p) adds "floor" (AVOID.floor: supine/prone/head-down names; incline,
  seated, standing, cable, machine kept) so standIn swaps those lifts; a last pass fits every loaded lift's
  reps/sets (fitDose: into the range, two reps wide at least); noPlyo drops jumps and intervals. doseFor,
  the coach's swaps (agent.js) and travel/gear stand-ins use limitsOf too.
- conformProgram(sp, p, gear, dry): a program the builder did not make, brought into line; My program shows
  "Adjusted for your health" (ui/dose.js condCard) with what does not fit and "Make it fit" (Undo).
- Assessment result and My program show the card: which conditions, what changes, "your doctor comes first".
- Workout set card: a one-line breathing / stand-up-slowly cue for those conditions.
- Tests: engine conditions.test.js; regression "Health conditions: …".

## Recovery time by what was trained — same branch

Item 2. What the knowledge base says (correcting the owner-facing summary, which said 72 h for maximal
strength — the 72 h is not that): at least a day of rest between sessions on the same muscles (48 h, as
before); 72 h after a complex (a heavy lift then a similar jump for the same muscles, acute-variables.js
complex system); plyometrics need 24 h between sessions, beginners 48–72 h (plyometrics.js recovery: the top
is used). coach/recovery.js readiness(…, o.novice): a muscle that jumped after a heavy lift for it, or a
beginner's jumps, stays tired on the third day (LONG_DAYS=3). engine/recovery.js passes plyo (jump names),
compound, and novice (level "new"). Swap confirm text names both rules. Coach tests added.

## Squat check → corrective warm-up — same branch

Item 3. Assessment (limits step): "A quick squat check (optional)" with how to do it (assessments.js
overhead_squat, paraphrased) and seven faults (feet out, knees in, low back arches, chest drops forward, arms
drift forward; shoulders shrug / head pokes forward when pressing or rowing). profile.faults, faultsAt.
- js/engine/corrective.js correctiveFor(faults, {avoid, has}): imbalances.js MOVEMENT_FAULTS → overactive and
  underactive muscles (ranked by how many faults name them) → the corrective continuum (corrective.js
  SEQUENCE): roll (30 s), stretch (30 s), wake up (slow 12–20 or a hold). Two of each (the book's 1–3).
  MAP muscle → library exercise is ours (named as such); muscles with no fitting exercise are left out; no
  rolling over the lower back or neck (the book's warning). Lying-down versions swapped when a condition
  rules them out (rolling on the floor included, per the hypertension guideline).
- Warm-up (engine/warmup.js ctx.fix; views/warmup.js): "For your squat check" card before the moving drills,
  each row "Roll / Stretch / Wake up · dose", with a Why fold; counted in the progress and the minutes.
- exnames.js: "-SMR" entries display as "Foam roll · IT band" / "رول فوم · …".
- Tests: engine corrective.test.js; regression "Squat check: …".

## Training phases — same branch

Item 4. js/engine/phase.js: each four-week block runs a phase of the book's model (knowledge/phases.js):
everyone starts at 1 (stabilisation endurance), then 2 (strength endurance), then the goal's. Sequences:
lose/recomp/gain/general 1→2→3 (fat loss is the book's GOAL_PLANS; the rest are ours, the source's plans being
absent — gap 9); strength 1→2→4 (3 for a beginner); athletic 1→2→4→5 (1→2 for a beginner); endurance 1→2;
mobility 1; any health condition or age group 1→2. Phase 1 comes round again after the goal's phase.
- engine/blocks.js blockDay: the phase's reps, sets range and tempo on every lift first (phases 4–5: the heavy
  range on multi-joint lifts only, single-joint keep 6–12 — ours), rest capped (not phase 2's superset rest),
  a condition's range still wins; then the answers' set shifts on top. phaseNow().
- engine/lifts.js recommendIn: last time's reps outside the new range by more than 2 → a weight estimated
  from the last best set (Epley, capped at 12, aiming at the middle of the range), said to be an estimate.
- Training block card: the phase, its reps and tempo, what it is for, and the next block's phase. The set
  line shows "Tempo 4-2-1-1". Existing users: the phase follows their current block number at once.
- Tests: engine phase.test.js; regression "Phases: …".

## Cardio zones and stages — same branch

Item 5. js/engine/zones.js. The book prescribes from the person's own VT1/VT2 (talk test); zones are heart-rate
bands only with those (ZONE_CALC: zone 2 VT1→midpoint, zone 3 midpoint→VT2); otherwise said by feel (RPE and
the talk test), with Tanaka's 208 − 0.7 × age shown as "a starting point only". No bpm band invented per zone.
Medication that blunts heart rate (conditions talkTest): feel only, no numbers.
Stage: 1 (steady zone 1) until three easy (RPE ≤ 4 or unrated) cardio sessions of 30+ min in the last 7 days;
then 2 (intervals just above VT1) once VT1 is known, else "do the talk test"; 3 needs VT2 and not a beginner,
a condition, or a modest goal (lose/recomp/maintain/mobility). Stages 4–5 not offered.
- Cardio & Sports sheet opens with "Your cardio · Stage N": what to do, what opens the next stage, the zones
  (feel + bpm or RPE). "Find your zones" sheet: the talk test in four steps (paraphrased), VT1/VT2 inputs,
  validated (60–230, VT2 > VT1), per profile (S.profile.vt1/vt2).
- Tests: engine zones.test.js (the book's worked example 145/165); regression "Cardio zones: …".

## Barriers in the weekly check-in — same branch

Item 6. Fewer workouts than planned last week → the check-in asks "What got in the way?" (engine/barriers.js:
time, convenience, unrealistic goals, social physique anxiety, ambivalence, no social support — adherence.js
BARRIERS — and "ill or injured", the book's physical barrier). The answer (S.ckWhy by week, 8 weeks kept)
shows that barrier's strategy, paraphrased, with the app's action: fit the week to my time / plan for home /
review my goal (the assessment at that step, data-setupstep) or share my plan. Next week recalls it
("Better than the week before, when it was: …" / "Is it still?"). A check-in now shows even with only missed
workouts logged. Also: four weeks after the squat check, "Redo the squat check" (assessments: repeat
periodically). Test: regression "Check-in barriers: …".

## Something hurts: where, and the plan steered away — same branch

Item 7. The pain sheet (sheets.js hurt) asks where: knee, lower back or hip, shoulder, wrist or elbow, ankle or
foot, neck. For each, what protects that area, paraphrased from injuries.js REGIONS and imbalances.js
INJURY_EFFECTS (the wrist has no entry there, so no note); how many sessions in the last four weeks it has
come up (entries' painArea), with "get it looked at" from the second time; and "Steer my plan away from it"
(the area into profile.limits, each program exercise that loads it swapped by standIn, Undo). The flag keeps
its area (workout.js flagPain). Never a diagnosis: the sheet still says Bunyan cannot tell what it is.
Test: regression "Something hurts: …".

## Own additions (item 8) — same branch

- Exercise picker: an exercise the person's limits or a health condition rule out is marked ("Lies down: not
  for your health" / "Loads an area you're working around") and asks before it is added (Add it anyway /
  Pick another).
- Coach chat: three new intents — phase (block, phase, reps, tempo, the sequence and next block), zones
  (cardio stage, zones by feel or bpm, Find your zones), health (what the conditions change; points to the
  assessment's health step when none). A medical statement ("I have high blood pressure") still goes to the
  scope guard; asking what the plan does about it is answered.
- Week rail: a planned day still ahead that comes too soon for the muscles it trains (engine/recovery.js
  tooSoon, everything planned before it counted) gets an amber ring and word; its details say which
  muscles, with Change.

## Rest band flash; "I can't do 20 push-ups" in the chat — same branch

Owner, 3 Nov (screenshot): closing the finished rest band flashed before it went; and the coach answered
"I'm overweight, not sure I can do the 20 reps push-ups, shall I adjust it?" with the generic weights rule and
"change the 20 reps in my active training to something reasonable" with "I don't have that".
- Rest band: `.rb{animation:wkIn}` came after `.rowout` with the same weight and won, so the leaving ghost
  faded back in from 0 (the flash) and then vanished at the timeout. Now `.rb:not(.rowout)`. Test: "Rest
  complete, closed: …".
- Coach: command "ex.fit" (coach/commands.js: can't / not sure I can / too many / reasonable / adjust …
  reps / push-ups; Arabic too) → agent.js planFit: for the exercise on screen (or named), today only: a
  range from the person's best logged set (best−3 to best+2, never above the plan), else a health condition's
  range, else 8–12; a number they asked for ("to 10") is used; for a body-weight lift, an easier version of
  the same movement (incline / knee; never feet up). Pick → confirm → action "live.fit" (snap live, Undo).
  The program is not changed. Test: "Coach, in a workout: 'not sure I can do 20 push-ups…'".

## Rest by the book's heavy phases; coming back after a lapse; the workout first in the chat — same branch

Owner, 3 Nov: (1) "confirm rest is calculated from the trained muscle and goal, whatever is in the knowledge
base"; (2) "a long-time lifter, an inconsistent year, six months almost off: consider it in the assessment,
the workout plan and the diet"; (3) "in a live workout the chat should put the session first".
- Rest (answer): the book sets rest by the adaptation and the load (acute-variables.js BY_ADAPTATION, restRule),
  not by muscle. The plan: experience base (main lift / multi-joint / single-joint) × the goal's factor,
  clamped into the goal's adaptation range; the block's phase caps it (phase 1 ≤ 90 s). New: phases 4–5 put
  multi-joint lifts at the book's 3–5 min (BY_ADAPTATION maximal_strength/power restS) — phase.js.
- Coming back: assessment "Training lately" (steady / on and off this past year / mostly off for months),
  profile.lapse/lapseAt. On use with a lapse: blocks restart this week (phase 1). Result card "Coming back".
  ensureBlock: four weeks or more with no lifting (our threshold) restarts the blocks at phase 1.
  recommendIn: a lift last done six weeks or more ago (our threshold; the book gives no detraining figure)
  suggests no old weight — last time shown, "start lighter and find today's weight". Food: habits first
  (protein daily, logging most days); calories at the check-in once the log is steady (it already needs 4+
  logged days). Level "new" now reads "New to lifting." (returning lifters keep their level).
- Chat in a workout: aLive answers "what now", rest/reps/sets/weight questions about this session, vague
  messages, for the exercise on screen (set n of N, target, weight, rest, tempo, next). OFFSESS (food,
  water, sleep, body weight, steps, other days) keeps their own answers; an exercise named that is not in
  today's workout keeps its own answer. Test: "Coach in a live workout: …".

## Recovery in numbers on Change workout — same branch

Owner, 3 Nov: "can this show percentages, recovered at how many percent". engine/recovery.js muscleStatus(sp,
iso): each muscle still recovering on the date (logged sessions, plus for a date ahead the workouts planned
before it, counted as done — the same basis as the day rows), its readiness in quarters (≈0/25/50/75%: the
model is an estimate, so no false precision) and the first day it is ready by the rest-day rule. The sheet
lists the six least ready (bar, ≈%, "ready Wed", "+N more"), with the note that it is an estimate; each day
row says "≈N% ready". bidi.js: "≈" is part of a figure (RTL kept "≈0%" in order).
- On a day where every workout comes too soon (always the day after on a full-body plan), the note offers easy zone-1 cardio, the book's recovery option (cardio.js stage 1), with a Cardio & Sports button.

## Experienced lifters choose; the rest of the open list — same branch (CACHE v199)

Owner, 3 Nov: "anything mandatory by the book that could be optional by experience: a suggestion, and experienced
lifters decide; work on everything else".
- Stabilisation (phase 1): experienced/advanced with no health condition get it as a suggestion on the block card
  ("Skip it" / "Use the book's order", profile.skipStab; phase.js canSkipStab, seqFor drops 1).
- Cardio: stage 3 for an experienced lifter whose only bar is a modest goal (fat loss, keeping) is their choice
  (profile.cardio3); stage 4 offered to advanced athletes (athletic/endurance/strength) with VT1+VT2 at stage 3
  (profile.cardio4), with the book's recovery gauge and overtraining signs.
- Already the person's call: Train it anyway on a day too soon; Skip warm-up (corrective work included).
- My program: "This block is {phase}: your workouts use {a}–{b} reps…; the reps below are used when blocks are off".
- Phase 2 supersets (phase.js supersetsFor; actions.js startDay): the book's pairs the library has both halves of —
  bench → push-ups, chest press → standing cable chest press, calf raise → single-leg calf raise — grouped (grp),
  the partner at 8–12, slow tempo; kit and limits respected. Squat/RDL/row/pulldown/press pairs are not in the
  library: those lifts stay alone (nothing invented).
- Higher body weight: opt-in in the assessment's conditions (never from BMI): conditions.js obesity — 10–15 reps,
  standing or seated (no floor), steady breathing.
- Chat warm-up answer opens with the squat check's corrective work. Run screen: today's target zone by feel (and
  zone 1's bpm when measured). Chat: a resting heart rate question is not the zones answer (no data; says so).
- Tests: engine phase/zones/conditions additions; regression "Experienced lifters choose: …"; coach actions domain
  list includes live.

## Compact cards; no "the book" on screen — branch session/compact (CACHE v200)

Owner, 3 Nov (screenshots): the block card took the screen, My program's phase note could not be put away,
Change workout's recovery list was long, and the screens talked about "the book" — the person never chose a book.
- Training's block card (views/train.js blockCard) is one line until its arrow opens it: "Block 1 · Week 2 of 4",
  then "phase · reps · N in reserve" and the week bar. The arrow opens why, next block, tempo, the skip-stabilisation
  choice and the set shifts. The lighter week keeps its line and End it outside the fold.
- Folding is generic: `.fold` > `[data-fold=key]` + `.fold-body`; handlers/train.js toggles the class on that card
  only (no render) and keeps the choice in V.fold for the session.
- My program's phase note has Got it: S.phaseSeen = the phase number (per profile, schema.js "Also kept"); it comes
  back when the block moves to another phase.
- Change workout (sheets.js recoveryList): folded to "N still recovering · all ready {day}", the muscles on tap.
- Every user-facing "the book"/"the textbook" string reworded (guidelines, usual range, most people) in the
  source and dict.js, Arabic too. Code comments still cite the book; that is for us.
- Tests: regression "Compact: …"; updated wording in four tests.

## Workout motion: cards glide, leaving cards fade in place — branch session/motion (CACHE v201)

Owner, 3 Nov: closing the rest, the set card "lags while it jumps upwards"; every move in the workout should be
smooth, a little slow, never glitching. Cause: the leaving card collapsed in the layout (rowOut, height to 0), but
the pane's grid gap stayed until it was removed, so the cards below snapped the last 12px; and nothing moved the
cards that a new card pushed down.
- motion.js snapCards/glideCards (FLIP), called from render() around every workout patch: each top-level keyed
  card in .sess that moved glides from its old place (440 ms, standard easing). A card that grew or shrank changes
  height over the same time, clipped to it. A card in GHOSTK (rest, rpeask) that has gone is put back absolutely
  positioned over its old place and fades (320 ms) — out of the layout, so nothing waits on it.
  Skipped under reduced motion, on a screen change, and when the exercise changes (that is the pane's slide).
- The RPE answer: the number held ~400 ms, then the card goes through the same ghost path (no more leave()).
- Next exercise (button) slides the new exercise in as a swipe does. Swipe: out 220 ms, in 380 ms, spring back 320.
- The workout's own pace: .sess sets --m-micro 200, --m-pop 260, --m-comp 320, --m-flow 460 (not under .reduced).
  leave()'s fallback timeout is generous so it never cuts a slower animation short.
- Tests: "Workout motion" and "Rest complete, closed" check ghost + glide instead of rowOut.

## Haptics device test page — same branch

Owner, 3 Nov: is real haptics possible on the complete-set control? `tests/haptics.html` (not part of the app: not
linked, not precached, not translated) has four controls to tap on the iPhone: A plain button, B a visually hidden
`<input type="checkbox" switch>` inside a label styled as the check control, C the switch itself, D the app's
current trick (view.js iosTick: a button that clicks a hidden switch in code). Each has Felt it / Nothing and a
summary to send back. Waiting on the owner's results; no app change until then.

## Week rail: the calendar button flashed going back to today — branch session/railfix (CACHE v202)

Owner, 3 Nov. The rail header's buttons (Today, the two hidden week buttons, the calendar) had no keys, so when
Today went the patcher matched by position: the hidden next-week button was turned into the calendar button and
its colour transition replayed. Each now carries a data-k (wkr-today, wkr-prev, wkr-next, wkr-cal). Regression
test watches the calendar button through Today and through tapping today's date: same node, no attribute change.

## Training hero: Change beside the label, off the rider — same branch

Owner, 3 Nov: the Change button covered the figure. It moved out of the card's top corner into the text column,
as a see-through chip after the day's label (.thero2-k row; hairline border, accent icon, 44 px hit area through
::before). The title no longer reserves 86 px for it. Checked in English and Arabic, rest day and workout day.

## Real haptics on the complete-set control (iPhone) — branch session/haptics (CACHE v203)

Owner's iPhone, iOS 18.7, Safari, tests/haptics.html: A plain button nothing; B hidden switch inside a label felt;
C the switch itself felt; D the app's old trick (a button clicking a hidden switch from code) nothing.
- views/session.js vLogControl: with haptics on (S.prefs.haptic !== false) the control is
  `<label class="log" data-k="log" data-logset="1">` around `<input type="checkbox" switch class="vh hapt-in"
  role="button" aria-label="Complete set N">`, the visible text and check aria-hidden. Same look (CSS by class).
  Haptics off: the plain `<button>` as before.
- app.js click: label[data-logset] joins the selector; the label's own click is ignored (the browser passes it
  to the switch), the switch's click dispatches with the label's dataset — one log for a tap, Space, or
  VoiceOver's activate — then the switch is set back to unchecked.
- fields.js: Enter on the switch clicks it (a button's Enter). Focus ring drawn on the pill (:has(:focus-visible)).
- view.js: iosTick removed — it gave nothing on the owner's phone and would have been a stand-in pretending to be
  haptics. tap() is navigator.vibrate only (Android). canBuzz still true on iOS: the setting chooses switch or button.
- Not yet felt in the installed home-screen app; the owner tested in Safari. If the home-screen app gives no tick,
  say so and revert to the button (no fallback).

## Ticks across the app — branch session/haptics2 (CACHE v204)

Owner, 3 Nov: the complete-set tick works; "go through the whole app and see what makes sense".
- js/ui/haptic.js hb(html): one <button> → <label class="… hap"> with the same attributes and content and a visually
  hidden <input type="checkbox" switch class="vh hapt-in"> LAST inside it (so :first-child rules still match). aria-label,
  aria-pressed, aria-expanded, aria-controls move to the switch (role="button"). A role="switch" aria-checked button
  becomes the native switch, checked as it was (Settings). Disabled or other-role buttons stay buttons. Haptics off in
  Settings → every control is the plain button.
- Used on: complete set; RPE chips; weight/reps steppers; rest −30, pause/resume, +30, +30 more, close; Next exercise /
  Finish workout; delete-set confirm; readiness chips; activity intensity; Start / Begin / Resume workout; Train anyway;
  the week rail's days; Change workout's rows; water (+, each glass, the body card's glass); food + and Add to / Update;
  Settings switches; the confirm sheet's OK; save weigh-in, save steps; how the workout felt.
  Not used on navigation, tabs, sheet openers, links or lists: a tick on every tap stops meaning anything.
- app.js: label.hap joins the click selector; the label's own click is ignored, the switch's dispatches with the
  label's dataset; then switch.checked = defaultChecked. fields.js Enter on .hapt-in clicks it. sheetdrag skips label.hap.
- CSS: every selector naming `button` as a type now reads :is(button,label:where(.hap)) (same specificity; done by a
  scanner over the <style> blocks, 69 rules). :where(label.hap) carries a button's defaults (inline-block, centred,
  border-box, 1px 6px). The RPE chip and food + set their padding, the glass its colour, explicitly.
- Verified by a computed-style comparison (button vs label, every converted control, every state it appears in,
  children included): 0 differences. Tests: "Ticks across the app", "Complete set, with haptics", iPhone test.

## The Coach hub restructured — branch session/coachre (CACHE v205)

Owner, 3 Nov: "the worst part of the app, not easy to understand or navigate"; full restructure approved, plus the
dock glitch and every button that sent you elsewhere (the chat) to do its job.

Where things live now
- Coach tab = the coach only (views/coach.js): mark, goal · program; an ask box (opens the one chat panel; the
  floating Coach button stays beside the dock here too, owner 28 Oct); this week in one strip (workouts done of
  planned with a bar, protein days, streak); "For you": ONE numbered list (stress follow-up, weekly check-in, what
  the coach noticed), count = items, three shown and the rest opened in place; Take the assessment again; small print.
  The gauge, plan tiles and the "Coach Hub / Plan it here" header are gone.
- Training: a program card under today's card (views/train.js programCard: name, how it falls in the week, Plan ›,
  the training block folded inside) opens Training's plan page (V.train="plan", V.tplan program|programs|exercises).
- Food: a "Your plan" card after Add Food (views/food.js foodPlanCard) opens Food's plan page (V.fplan
  plan|targets|foods). Meal screens (pslot, smeal, pimport) are under the Food tab.
- toPlan(area, sub) (handlers/common.js) replaces toCoach: resetNav, the tab's own page, then pushNav into the plan
  page, so back always lands on Training or Food. data-csec/ctsub/cfsub still arrive (chat answers, old links) and
  map to the new places; data-tplan/data-fplan open or switch the plan page parts. A dock tab tap resets V.fplan.
- nav.js loc/apply carry tplan and fplan. render.js view keys: food/plan|pslot|smeal|pimport; coach/hub.
- Page guides (tour.js): Coach rewritten (v 2), Training gets the program card step, Food the plan card step.

The pages
- Program: Edit (where Reorder was) shows each day's ✕ and grip; out of Edit, no ✕. Rest days are thin rows. The
  schedule (By weekday / In rotation) sits under the days as a setting, with the one-time "Train on fixed weekdays?"
  offer for a rotation program right under it. Bottom: Share, Switch program, Workout settings as one list. On the plan page the hero is just the
  name (rename) and the exercise count; the page line says how it falls in the week.
- Day: "Session Routine" → Exercises; the strip's count is a number; Edit for ✕ and grips.
- Programs: the new-program cards' pictures are faint marks clear of the words; My programs' active row switches
  to My program in place.
- Meal plan: Edit for ✕ and grips; "Build it from my targets" (data-pgen) beside Import; Meal names under the list.
- Targets: the coach's suggestion first when it differs (current target beside it, one Use, with Undo), then the
  targets; macros that do not add up say by how much and "Fit carbs to the target" (data-fitmacros, Undo).
- My foods: "Save a meal" and "Add a food", each saying what it is; the empty state on a card of its own.

No more detours
- Build today's meal: a sheet over Food (js/ui/todaymeal.js) builds one meal of real foods for what is left today
  (engine/mealplan.js buildOneMeal: the day plan's plates and solver, capped at 1,100 kcal a sitting), Add to the
  next meal with Undo, Another for a different plate.
- An InBody result: its reading opens in a sheet where it was saved (views/chat.js inbodyReading); Change my goal
  opens Profile → You.
- Findings "Heavy enough for strength?" and "Long rests for endurance" fix the program themselves
  (engine/plancheck.js heavyMains / shortRests), with Undo, instead of opening it.

Dock glitch
- Reproduced: after a tab change under the chat panel, the dock re-centred and the highlight stayed at the old x.
  dock.js settleHl puts it back on the active button on every sync, on any size change in the dock (ResizeObserver),
  on window resize, and when a travel ends; an interrupted travel no longer leaves the "travelling" flag set.

Motion
- A plan page's parts slide in from the side they are on (render.js slideSection, 360 ms; reduced motion: none).
- Coach page cards blur the photograph behind them, so its tablet's words never read through as the page's.

Found by the full suite and fixed
- toPlan used pushNav without importing it: every "go to the plan" (an import used, a template adopted) threw and
  left you on Training. Old "builder"/"splits" routes now render the plan page instead of falling through to home.
- The test rewrites had dropped eight unrelated tests and the liveStart helper (Offline, Arabic type, the
  powerlifter placing, two Food body-needs tests, a Phase 4 test, live tracking's way in); restored from main and
  checked against main's list. Tests that described the old Coach hub now describe the new places.

## Plan pages, round 2 — branch session/plan2 (CACHE v206)

Owner, 3 Nov, after the restructure (PR #106).
- The training block card moved from Training's program card to My program (under the name). The card on
  Training is the way in only.
- Exercises are part of Programs: Training's plan page has two tabs, "My program" and "Programs & exercises"
  (programs, templates, then the library, favourites and bodyweight work under an "Exercises" heading, #pex).
  An old route to tplan "exercises" lands on Programs, scrolled to the library.
- Swipe between plan tabs, on Training and Food, the workout's way (js/ui/exswipe.js, now for any pane marked
  data-pswipe): the pane follows the finger and travels the whole width (no fade: its cards are frosted). A drag
  that starts on something that scrolls sideways (templates, pills) or on a grip is not a swipe. Arabic is
  mirrored. render.js slideSection stays out of a swiped change (V.pswiped).
- Page push/back within a tab (render.js pageMove, nav.js navDepth): the old page stays as a still copy
  (.pghost, inert, out of the tab order) and fades out early while the new one slides over it, 600 ms; back
  plays it the other way. Tab changes keep their own entrance; reduced motion has neither.
- Schedule redesigned as one card (views/train.js schedCard): a segmented choice with icons, then a picture of
  the week it makes — by weekday, the seven weekdays with each day's number on its weekday (two numbers = two
  sessions); in rotation, the days in order then "Again" — and one line on two sessions a day. The one-time
  weekdays offer follows it.
- Fixed: weekday names mixed short and long ("Mon, Wednesday, Saturday") — .map(wdName) passed the index as the
  "long" flag. schedLine now names them in full; the weekdays offer short.
- "Build today's meal" removed (owner: no real value): the button, js/ui/todaymeal.js, its sheet, handlers,
  CSS and engine/mealplan.js buildOneMeal. mealPrefs went back to handlers/coach.js.
- Stress follow-up (owner: "What if I am still stressed?"): the card now has "Still stressed" beside "It's
  better now". Still stressed keeps the week light, takes the card out of For you, and leaves one line under
  the list with the date the coach asks again and "Better now?" (profile.stressOk). The follow-up date still
  brings the question back.
- The guide rewritten (v 3; owner: unclear, didn't say what buttons do): Training opens with "How Bunyan
  works" (a centred step, nothing lit), then each thing and what a tap on it does, including the floating
  Coach button; Food and Coach rewritten the same way; new guides for Training's plan page (tabs and swipe,
  name, block, days, Edit, schedule) and Food's (its three tabs and swipe). Everyone sees the new version once.
- Found by the full suite: the old page's copy kept the tapped button's press look (.tapd) while it slid out;
  the copy is now cleaned of it. Tests that reached the block on Training home, or the Exercises tab, now go to
  My program and Programs & exercises (the test helper maps "exercises" there).

## Food's plan pages, round 3 — branch session/food3 (CACHE v207)

Owner, 3 Nov: the app is glitching; the nutrition plan pages are inconsistent, unorganised, "look like a PDF",
tabs that do not make sense; the swipe's tab highlight lags the page.
- Glitch: Meal names was drawn with the old .bsched classes, whose styles the schedule card replaced in
  round 2, so it showed as bare white boxes. It is now a settings row with the soft segment.
- Two tabs, Meal plan and Targets. My foods is a library you log from, not a plan: a page of its own, one step
  in (V.fplan "foods", pushNav), from the meal plan's settings list. Old routes to fplan foods land there.
- Meal plan: one summary card (calories and protein planned against the target, bars, and a verdict: on
  target / n kcal left / n over); the meals with Edit; "Fill the plan" as two tiles (Build from targets,
  Import); one settings list (Meal names, My foods, Share). The two big cards and the loose link are gone.
- Targets: one card says the target (kcal, the split bar, grams and shares of each macro, water and steps,
  where maintenance comes from, a macro mismatch with Fit carbs); Edit opens it as fields with Save and
  Cancel (V.tgedit). The coach's suggestion is a one-line offer with Use, only when it differs. "Is it
  working?" stays; the eating history folds under one row.
- My foods: two tiles to add; lists only when they hold something; ✕ behind Edit as on every other list; the
  duplicate "Add your own food" button gone.
- Swipe: the tabs' highlight follows the finger while the page is dragged (exswipe segFollow, .seg.drag) and
  carries on to the landing tab in one movement with the page (--segdur), or springs back with it.
- Figures and their units stay one left-to-right run in Arabic (they read "2,500 / 0").
- Found by the full suite: the new cards (plan summary, target card, tiles, offer, fold) and the program,
  plan and schedule cards were not in the frosted-card lists, so they were flat beside every other card. Added.

## One grammar for the plan and coach pages — branch session/tidy (CACHE v208)

Owner, 3 Nov: things that belong together, together; easy for someone not technical; "a platform streamlined
and robust, not a PDF, and random sentences everywhere".
- The grammar every planning page now follows: a card for what the page is about; the list it holds (Edit for
  ✕); tiles for the ways to start something new; one settings list (rows with a name, one line and a chevron)
  for everything else. No loose sentences between them.
- Coach: "For you" is always a section; with nothing to decide it holds one card ("You're on track"). What
  trailed under it as lines — a week kept light, advice set aside, the small print — and the assessment are
  one list, "Your coach" (views/coach.js coachList): each row says what it is and has its button. The small
  print is a sheet, How the coach works (coachinfo).
- Meal plan: with nothing planned, "Make your meal plan" comes first with its two ways; once planned, the
  summary card shows and starting again moves into the settings list (so it is not tapped by accident).
- Plain words: Targets → Daily goals; "Fit carbs to the target" → "Fix it for me"; "Maintenance by formula…" →
  "Worked out from your age, height, weight and activity…"; Build/Import → "Make it from my goals" / "Copy in a
  plan"; programs: "Build a program" / "Copy in a program".
- Training's My program ends in the same settings list (Switch program, Workout settings, Share) instead of
  three lines of text; Programs & exercises opens with two tiles instead of two large cards.

## Copy in reads a shared plan — branch session/sharein (CACHE v209)

Owner, 3 Nov: "Copy in a plan should also work … when some other Bunyan user has shared his split with me,
instead of me going to settings."
- Food's Copy in a plan and Training's Copy in a program both recognise a Bunyan plan code (BNY0/BNY1) in
  what is pasted, words around it included, and open the Add a shared plan sheet with what it holds (meal plan
  and/or program, each added on its own tap). Anything else is read as before. readPlan/isShared moved to
  handlers/common.js; Settings' own Add a shared plan still works.
- Both screens are titled as their buttons (Copy in a plan / Copy in a program) and say a shared message works
  there; the buttons' lines say so too.

## Copy in and Share side by side on My program — branch session/sharepair (CACHE v210)

Owner, 3 Nov: "Can it be the same for share my program?" My program's settings list now ends with Copy in a
program (PDF, text, or a program another Bunyan user shared) directly above Share my program, as the meal
plan's does with Copy in a plan and Share my meal plan. "Share this program" is "Share my program"
everywhere (the share sheet's title too); the coach's answer on sharing names the new places instead of
Profile > Add a shared plan.

## Motion sweep: no jumps, no flashes, a real carousel; no duplicate buttons — branch session/sweep (CACHE v211)

Owner, 3 Nov: "bugs in motion when I swipe between pages, or flashes … give the impression that the app is
buggy"; duplicate buttons for the same job. Each interaction was filmed frame by frame (CDP screencast) and
scanned for frames that jump, flash or stall; the causes found and fixed:
- Mid-swipe the whole background photo jumped and zoomed: a tab sliding sideways stuck out past the screen
  and the phone widened the page to fit, rescaling everything fixed to the screen. html,body{overflow-x:clip}
  for good (clip, not hidden: no scroll container, sticky and scrolling untouched).
- Fades switched off the frosted cards' blur (a fading parent is a backdrop root), so cards popped between
  frosted and plain: the old page faded under a push, a tapped tab faded in. Now nothing that holds cards
  fades: old and new travel together edge to edge, transform only (motion.js stillCopy/slidePair) — a page
  push, back, and a tab tap alike.
- A swipe was sequential (old out, then new in) with empty ground under the finger: now the next tab is
  drawn when the drag picks a direction (app.js peek) and follows the finger beside the dragged one; on
  release both carry on together from where the finger left them, and the tab highlight with them; a nudge
  springs both back.
- The background photograph swapped at once when a page's ground changed: it now decodes, then crossfades.
- Duplicates removed: the bell on Training's header (the dock's Coach tab opens the same page and carries
  the same dot), the Coach page's "Ask your coach anything" box (the floating Coach button opens the same
  chat; the ready questions stay), and My program's Switch program row (the Programs & exercises tab above).

## Food: one summary, one slim card — branch session/foodtop (CACHE v212)

Owner, 3 Nov: the summary card and the body figure showed the same numbers twice; keep one, or a mix that
saves space for what is useful. The summary card stays (calories ring, protein/carbs/fat against the goals,
kcal left). The figure with its four rings is gone; what it said that the summary does not is one slim card
right under the summary (js/ui/bodyneeds.js): what is behind for the time of day, how much to go, and three
foods that bring it in one tap (a glass, for water). Nothing behind: no card. Coach noticed stays.

## Your meal plan: a review built to be changed — branch session/foodtop (CACHE v213)

Owner, 3 Nov: the plan review read like a PDF; it should be easy to amend, with alternatives of similar
nutrition or preference, well structured. views/food.js planReview (a built plan and one copied in alike):
- One summary card: meals and foods, a verdict against the goal, calories and protein bars, Another version
  (a built plan) and a badge with how many of its foods are ones they eat. The explanatory paragraphs went.
- Each meal a card: its name (rename in place), calories and protein, ✕; each food one row (name, amount,
  protein, calories) and one tap; "Your usual: n days in the last 4 weeks" as a badge; lines that matched
  nothing with Find; + Add food.
- A food's sheet (vPlanFood): its numbers; Change amount; Remove (Undo); Swap for something similar —
  engine/mealplan.js similarFoods: every food the diet and exclusions allow, sized to the same calories (a
  whole or half serving when one fits, else 5 g steps), ranked by how close protein, carbs and fat are as
  shares of those calories, the same kind of food first, impractical amounts left out; one tap swaps it in
  its place, with Undo.
- Use this plan sits in reach above the dock.

## My program: icons by the name, settings gear, block at the foot — branch session/progicons (CACHE v214)

Owner, 3 Nov: the block card should sit at the bottom; Switch program, Share and Workout settings should be
icons; remove "Copy in a program" (Programs & exercises already has it). views/train.js builderBody:
- The program name row carries two round icon buttons: switch (opens Programs & exercises) and share (shown
  once a day has exercises). The list of buttons under the plan (.plset) is gone, Copy in with it.
- Workout settings is a gear (glyphs.js `gear`) at the top right of the Training plan header (.dhead-a,
  margin-inline-start:auto, so it sits top left in Arabic).
- The training block card and its phase note are the last things on My program; the note now says "the reps
  above". Guide: 8 steps, with Switch and share and Workout settings. Tests: the My program test asserts all
  of it.

## Fix round: plan review, sheets, swipe, Food plan icons — branch session/fixround (CACHE v215)

Owner, 3 Nov (screenshots): "Use this plan" floats mid-screen; taps on the plan glitch and flash; the
swipe still catches; Food's plan actions should be icons as on Training; the icons touch; water is stuck
to the card above.
- Use this plan (.prcta) is no longer sticky: it closes the review, in the page. Its glass over the meals
  scrolling through it read as a glitch.
- Every sheet now slides down when put away (render.js sheetLeave): a still copy of it beside #sheet, so
  nothing reads it as open, gone after the slide. A sheet the finger already flung away is not slid again
  (sheetdrag.js marks it). Closing used to cut it out in one frame — the flash after a swap or remove.
- Swipe between plan tabs (exswipe.js): the tabs next door are drawn ahead, while idle after each paint,
  instead of as the finger starts to move (that was laying out the whole page mid-gesture); on release the
  tab under the finger and its neighbour travel together and the real tab is drawn only once they land,
  where the neighbour stands, so nothing renders during the motion. Filmed: no flash, no jump.
- Icons by a name no longer touch: .icobtn carries a -10px end margin for header use; .bname-a resets it.
- Food's plan page: the settings list is gone. Icons by "Your meal plan" (bowl: My foods; once there is a
  plan, spark: new from goals, arrow down: copy in, arrow up: share) and a gear at the top right for Meal
  names (settings.js set_meals). Guide updated (fplan, v5). New glyph `download`.
- Food: the plan card keeps a gap above the water card.

## Fix round 2 — branch session/fixround2 (CACHE v216)

Owner, 4 Nov (screenshots):
- How do you feel today?: on a phone every choice is a label round its button (haptic.js hb), an inline
  block, so the word sat at the top of the pill. .ready-c and .sc-rpe-c choices are flex-centred. Test runs
  with haptics on (the suite's default has them off, which is why no test saw it).
- Plan swipe: a plan tab now travels the screen's width (it travelled its own, and the gutter beside it
  left a strip of the old tab at the edge until the slide ended). Scrolled down a tab, the next one comes
  in from its own top at the top of the screen, and on landing the page is moved to it in the same frame;
  easing back up to the tabs after landing was the jump. The tab's word turns as the highlight arrives.
- Food's plan page: My foods and Make a new plan from my goals moved into the gear (set_meals); by the
  name only Copy in and Share; no row at all before there is a plan. Guide v6.

## Plan swipe lands without a jump — branch session/swipejump (CACHE v217)

Owner, 4 Nov: the swipe is good now, but Programs & exercises still jumps up at the start. Measured: the
tab coming in stood 12 px lower than the real one then landed. Programs' first card (.ptiles) has a 12 px
top margin; in the page it merges with the 16 px gap under the tabs, drawn on its own (the swipe's still
copy is a fixed box) it did not. exswipe.js peekFollow now zeroes that margin in the copy and places it
where the page will (max(gap, new margin) − max(gap, current margin)); landing aligns on the copy's own
position. The Plan swipe test compares the first card, scrolled and unscrolled, both pages, each way; it
fails on the previous build (12 vs 24) and passes now.
- Same day: a tap on a plan tab's word (or the switch icon, anything on the page naming a tab) now runs the
  swipe's own slide (exswipe.js slideTab, from shell.js tplan/fplan): the next tab drawn beside, both
  travel the screen's width, the real tab drawn where it landed. Tapping had kept the old render-then-slide
  path with its leftover strip and offset (owner: "the same old issue if I tap the word"). CACHE v218.

## Copy in a plan is a sheet — branch session/importsheet (CACHE v219)

Owner, 4 Nov: the Copy in a plan page should be a pop-up from the icon. The arrow icon (and the empty
plan's tile) open sheet "pimport" (views/food.js vImportSheet): the paste box, Open a file, Read the plan,
the PDF's progress line. Once read (handlers/common.js toReview) the sheet goes and the plan opens one
step in as "Check the plan" (vImport, no paste box), Back returns to the meal plan, and the pasted text is
kept for the next time the sheet opens. Nothing found: the sheet stays with a toast. A Bunyan share
pasted there opens its own sheet as before. Training's Copy in a program is still a page.

## Copy in a program is a sheet too — branch session/tsheet (CACHE v220)

Owner, 4 Nov: as on Food, the Copy in a program tile leaves Programs & exercises; an icon beside Share on
My program (swap · copy in · share) opens sheet "timport" (views/timport.js vTImportSheet): paste box,
Open a file, Read the program, the PDF's progress line, and what could not be read, said in the sheet.
Read (common.js readTraining), the sheet goes and the draft opens one step in as "Check the program".
Start over, and the icon from the draft, go back to My program first and open the sheet once Back has
landed (handlers/train.js copyInSheet: Back goes through history). Programs keeps Build a program, full
width. Also: the My programs row read "3 training daysIn rotation" (its dot had no size outside a flex
row); a middle dot as text now. Guide v6.
Rename question (owner): renaming only changes the program's name (actions.js renamesplit); a probe that
renames, reloads and lists finds one program. Asked the owner for the steps that showed a second one.

## Opening a page: no strip of the old one, pictures ready — branch session/libpage (CACHE v221)

Owner, 4 Nov: opening the Exercise Library has "the same old swiping issue" and its pictures flash.
render.js pageMove: the new page and the old one's copy each travel the screen's width plus 40 px
(they went 100% of #app, and in the slide's slow end the old page's last cards showed at the edge);
and the slide waits, 250 ms at most, for the pictures on the new page's first screen, asked for eagerly
and decoded: they are loading="lazy", and a lazy picture on a page still off the screen is not fetched
until it comes in, so each appeared after the page had. The tab swipe's copy of the next tab asks for
its pictures eagerly too. Filmed: no blank pictures, ground between the pages. Test fails on the
previous build and passes now.
- My foods (owner, 4 Nov): the two tiles are "Build your own meal" (foods you eat together, logged in one
  tap) and "Create a food" (type it in from its nutrition label), in place of Save a meal and Add a food.
  CACHE v222.

## My foods and the meal plan, together — branch session/mfnames (CACHE v223)

Owner, 4 Nov: My foods and Make a new plan from my goals "have common functions"; owner chose: My foods
a tab, the new plan a button, the gear for settings only, and the two wired together.
- Nutrition plan has three tabs: Meal plan · My foods · Daily goals (FPLAN, app.js PTABS). My foods is no
  longer a page one step in; swipe and tab taps go through all three (a tap two tabs away brings in the
  tab tapped: exswipe.js peekFollow takes the step).
- The gear holds Meal names only. "Rebuild from my goals" is a button on the plan's summary card; it
  opens the review as before.
- The plan builder (engine/mealplan.js) now draws on the meals built in My foods (nutrition.js
  ownFood().saved, savedPlates: every food with its amount; a meal with a quick add in it cannot be
  resized honestly and is left out). After the meals eaten most days and before the app's own, sized to
  the meal's calories within the same 20% as the usual ones, each once a day, Another version starts the
  list elsewhere. The review says "Your meal: {name}".
- A built meal's own page has "Put in my meal plan": a sheet of the plan's meals, each with what it holds;
  the one chosen takes its foods, with Undo.
- Names: "Your meals" over the built meals, "Your own meal" on a meal's page.
Tests: the meal plan, swipe and tap tests for three tabs; a built meal in a rebuilt plan and Put in my
meal plan with Undo.
- Suite: the container restarted twice mid-run; 244 passed before it, the remaining 83 were run on their
  own (82 passed; Plan tabs expected Targets one swipe from Meal plan, now My foods; Press found the
  helper's tab tap had not landed yet, since a tab tap now draws the tab when its slide ends). The
  coach() helper waits for the tab to land; the 17 tests that switch tabs through it pass again.

## The plan's verdict says it is the plan's — branch session/ontarget (CACHE v224)

Owner, 4 Nov: "On target based on what? I didn't enter anything for that day." It compared the meal
plan's total with the goal, not what was eaten, and read as a judgement of the day. Now: label
"Plan vs. goal"; "The plan matches your goal." / "The plan is {n} kcal under (over) your goal." on its
own line under the label, on the plan page and on the plan under review.
- Owner, 4 Nov: the plan cards go last — Food's "Your plan" under Water, Training's program card under
  Log cardio or a sport — the day first, the way into planning after it. The guides follow the page
  order. CACHE v225.

## Daily goals folded into the meal plan; looking back is Progress's — branch session/goalsmerge (CACHE v226)

Owner, 4 Nov: the plan-vs-goal card and the Daily goals card "could be combined, and the daily goals
page could be removed", with How you have been eating in Progress.
- Nutrition plan has two tabs, Meal plan · My foods. The Meal plan opens on the goal's card (views/food.js
  goalCard: the coach's suggestion when it differs, the goal with Edit in place, macros, water and steps,
  where maintenance comes from) and inside it "This plan": the verdict, the two bars, Rebuild from my
  goals. Nothing planned: the card, then Make your meal plan. An old way to Daily goals (V.fplan
  "targets") lands on the meal plan.
- Progress → Overview ends with How you have been eating (vNutrition over Progress's own range, its first
  heading the section's name); Progress → Body has Is it working? under the weight.
- Tests: the helper sends "targets" to the meal plan; the plan card is clicked, not tapped (last on its
  page, a toast or the dock can be over it on a short page); goal tests check Progress for the history;
  the tab tests for two tabs.
- Owner, 4 Nov: the New meal dialog "lags while opening and while disappearing". A dialog with a field
  now opens where the keyboard leaves it (it was placed by the space left, so it opened mid-screen and
  slid up as the keyboard rose, and back down as it went); put away, a dialog fades and shrinks a little
  in 170 ms instead of the sheet's slide down. Build a program is the accent's glass with the standing
  figure drawn at its edge. CACHE v227.

## The dock's tabs swipe — branch session/mainswipe (CACHE v228)

Owner, 4 Nov: "the same swipe structure between Train, Food, Coach and Progress, to function really
well". On a main tab's own page (app.js atRoot: Training's day page, Food's day, the Coach page,
Progress; no sheet, panel, workout or run) #app is marked data-tswipe and swipes as a whole, through the
same machinery as the plan tabs (exswipe.js kind "tab"): the next tab's page drawn ahead while idle
(app.js peek renders it as the dock's tap would leave it, then puts the state back), both pages travel
the screen's width, and the real tab is drawn only when they land (go = the dock's tap, without the
page entrance). The day's card and Training's week keep their own swipes; side-scrolling rows keep
theirs; one step in, the plan page's tabs swipe instead. On the page as a whole the listener is passive
and the page is touch-action: pan-y, so no scroll waits for script. Arabic runs the other way. Filmed:
no flash, no jump; the next page lands where it was drawn. Test: the four tabs both ways, the last
resisting, the day's card, and no tab swipe one step in.

## Create, by My programs — branch session/createbtn (CACHE v229)

Owner, 4 Nov (a mock): Build a program "could be very simple, just Create". The card is gone; My programs
has a line under it ("Your training routines, all in one place.") and a Create button beside it.
The Programs tab got shorter with it, and a swipe from far down My program put the tab coming in higher
than the page could scroll to: exswipe.js now places it where the page will come to rest (the tab's
height measured in its copy), and lands by the first thing on the tab, not the pane's edge.
- Owner, 4 Nov: the note under the goal ("Matches the coach's suggestion. Worked out from your age…")
  "shouldn't appear all the time". It has Got it (views/food.js srcNote): put away per profile under a
  key of what it says (the suggestion matching or not, maintenance by formula or measured, the build-on-
  your-log offer), so it comes back only when that changes; only the note leaves the page. CACHE v230.

## "How do you feel today?" goes without a bounce — branch session/readyskip (CACHE v231)

Owner, 4 Nov: Skip scrolled down "bounces up in an odd way"; scrolled up, "a big noticed bounce when the
survey disappears". Two causes, measured frame by frame. The question was not a keyed card, so the
patch dropped it in one frame. And at the end of the page, the page lost its height at once, so the
browser pulled everything down by 88px while the cards glided back.
- The question is now a keyed card ("ready"). When it is answered or skipped, it folds in the page's
  flow (motion.js FOLDK/foldAway): it is put back where it was, fades, and closes up with the grid
  gap, so the cards below follow its edge. A ghost floating over the rising set list read as two
  things stacked on each other. The low-day note is keyed too and arrives as the workout cards do.
- The workout's page keeps its place (motion.js holdScroll). After a same-screen render it keeps the
  room the page had below the view as an empty block after #app, and shrinks that block only as the
  person scrolls up. A new screen or exercise drops it (clearHold). This holds with reduced motion too.

## A change of mind mid-swipe stays put — branch session/swipecancel (CACHE v232)

Owner, 4 Nov: "when I hold my finger to swipe left then change my mind half distance, the app glitch and
restart". A drag that came back past where it started was read as a new swipe the other way. Let go
past a third of the width (or with a flick), it went to the tab before. From Food that is Training,
which looked like the app starting again. exswipe.js now keeps the direction a drag set out in
(st.dir). Brought back past its start, the pane rests at zero with its peek on its own side, and when
let go it springs back. The test reproduces Food → Training on the old code.

## One page for the meal plan; My foods behind a star — branch session/myfoods (CACHE v233)

Owner, 4 Nov: remove the My foods page as a tab and make your own foods reachable from an icon beside the
settings gear. "Build your own meal" goes, and its job moves to "Add a meal". Create a food is offered
where food is added. The owner chose: Create a meal makes a meal in the plan and opens it to be filled.
- Nutrition plan has no tabs now. The star (new glyph "star") beside the gear opens My foods: the foods
  you created and the meals you saved, to change, remove or log in one tap. It is a page one step in;
  back returns to the plan. Its header has Create a food.
- "Add a meal" is "Create a meal". It is named, then opens straight into the new meal to add its foods
  (ACT.addslot opens V.pslot).
- Build your own meal is gone. Saved meals are still made from Quick Add ("save as a meal"), still
  listed under the star and in Add Food → Meals, and an empty one can still be filled from its own
  screen.
- Add Food's search home has Create a food under Quick Add, opening the label form. The Custom tab
  keeps it too.
- render: My foods is its own view ("myfoods"), so it arrives as a page. The plan page has no section
  slide for Food. PTABS fplan is the plan alone. The guide's two-tabs step is replaced by the star.
- Tests that swiped Food's tabs now swipe Training's, the only plan page with tabs.

## Back without a second slide — branch session/backmove (CACHE v234)

Owner, 4 Nov: the back arrow or a swipe back from My foods made the Nutrition plan "flash, or start a
weird motion from left to right before it stabilises", and the same happened on other backs. Two
causes:
- The swipe. The phone's back swipe slides the page before in natively, then fires popstate, and the
  app ran its own slide again on top. nav.js now marks a popstate that its own controls did not ask
  for (V.osBack). render.js puts that page in place with no copy, no slide and no entrance.
- The arrow. slidePair asked for the new page's animation and cleared its starting transform in the
  same moment. WebKit can draw a frame before an animation starts, so the new page showed in place for
  that frame, then jumped out to slide in. The new page now holds its start in its own style, and the
  animation holds its end (fill forwards) until it is let go. Chromium never showed the flash; the
  hold makes it impossible in WebKit too.

## Pictures that do not flash as a page opens or a swipe lands — branch session/imgflash (CACHE v235)

Owner, 4 Nov: the templates' pictures on Programs & exercises "flash when I open the page or swipe right or
left". They are small (16–47 KB) and precached, so the cause was not the download:
- They were loading="lazy". A lazy picture drawn afresh is not even requested until the phone has seen it
  on screen, so every redraw showed it blank first. Templates are eager now (train.js splitCover, with
  width and height).
- When a swipe landed, the tab that came in was removed in the same frame as the real one was drawn, so
  the real one's freshly made pictures were blank until decoded. The incoming tab now stays above
  (z-index 5) until the real one's on-screen pictures are decoded, at most 200 ms (exswipe.js
  seenImgs). The prebuilt neighbours decode their pictures ahead.

## A workout logged afterwards — same branch (CACHE v236)

Owner, 4 Nov: "Sometimes I train but forget to use the app, so I need the option to log training from past
days." On Training, a past day with nothing logged now has "Log a workout for this day". It opens a sheet
(pastlog) with the program's training days, and the chosen one opens the usual workout screen for that
date: startDay(dayId, past) sets S.active.date and past.
- The past workout has no clock (the header shows the date), no rest timer, no warm-up and no
  how-do-you-feel question. Lifts carried from a missed day are not added.
- On finish no time is kept (activeMs 0, mins, secs and wallMins null), since none was measured. The
  averages already count timed sessions only. The complete sheet shows Sets in place of Duration, and
  history is re-sorted so the session sits on its date.
- A workout already in progress has to be finished or saved first.

## Launch that never draws; coach card spacing; log the missed day — branch session/pastlog2 (CACHE v237)

Owner, 5 Nov:
- "Sometimes when I open the app I see" only the background, "then I will have to close and open". The
  app always paints once at boot, so a blank page means its code failed before that. The likely cause is
  an update landing mid-launch on a weak signal, so the page and its modules come from two releases.
  An inline watchdog (index.html, before app.js) handles it. If a script error or unhandled rejection
  happens before the first paint, or nothing is drawn after 12 s, it drops the cached bunyan-v* releases
  when online and reloads, once per session. It keeps the error in localStorage bunyan:booterr for
  tracing. Missing images are ignored.
- The coach card's Move it to today and Let it go touched: .reco-a gap is var(--s2).
- "I trained it but forgot to log it": the missed-day card has "I trained it: log it", which opens that
  day's workout for its date (startDay past). Once logged, the day counts as done and the card goes. The
  past-workout sheet lists the day the plan had there first, marked Planned.

## The program rows flashing as Programs opens — branch session/rowflash (CACHE v238)

Owner, 5 Nov: the My programs rows "flashing when I open the page". The cause was v235's hold. The tab that
slid in stayed over the real one (z-index 5) until the real one's pictures were decoded. It is frosted,
so its rows blurred the real rows through them, and then they snapped clear. Templates hid it (opaque
pictures); the see-through program rows showed it. The real tab now waits hidden (visibility) under
the incoming one and the two swap in one frame. The pictures-on-a-swipe test also checks that the two
are never both on show; that check fails on v237.

## Progress, second redesign — branch session/progress2 (CACHE v239)

Owner, 5 Nov: "start working on them all" (the 21-point Progress review).
- Correctness:
  - Consistency is weeks kept against the plan's training days (figures.js weekRunIn), not days in a row.
  - The scale's rate is one figure everywhere: the trend's regression per week (body.js); until there is one, the change since the weigh-in a week or more before, said the same way on Overview and Body.
  - Every range-bound card names its range; this week's and all-time cards say so.
  - Volume in kilograms is gone (it mostly counted sessions); hard sets a week took its place.
  - Estimated maxes show to the half unit and are called estimates.
  - A lift that moves the body and was never loaded in the range is scored by its reps (repsOnlyIn / repsSeriesIn).
  - Cardio has a place: minutes a week, distance, best running pace over a km (cardioIn).
  - The trend's advice has Apply (±150 kcal, the middle of the book's 100–200; ±200 for a gain trend going the wrong way; ±100 when holding). It changes carbohydrate, as the weekly check-in does, with Undo.
- Structure: four views, Overview, Strength, Body and Habits, swipeable like the plan pages; at the first or last view the swipe carries on to the dock's tab.
  - Overview: Is it working (verdict chip, rate against the goal's band, smoothed trend with the weigh-ins as dots, Apply); This week (a dot a day, weeks kept); Highlights for the range; Milestones; the month's recap; recent workouts.
  - Strength: one list of lifts (figure, shape, change, PR badge), each opening its own sheet (chart, records, sessions); the muscles merged into one card (map, this week against the target, the range's weekly average); the powerlifting comparison only with all three judged lifts trained, at the bottom.
  - Body: the smoothed trend chart with weigh-ins as dots and a legend; Apply under Is it working; photos can be compared (two chosen, one over the other with a slider, each with the weight nearest its date).
  - Habits: eating (moved from Overview), steps against the goal, cardio.
- Charts: a press held still reads a chart (js/ui/scrub.js) with a bubble and a tick per point, and a tap marks one point. A swipe across a chart is still a swipe. A new range draws its line on again (keyed by range), and figures count to their value (data-count-dp for decimals).
- Drawings: milestones as eight-pointed stars (khatam), the newest shining once (prefs.msSeen); the month's card with the star; the recap sheet saved as a 1080×1350 picture in the app's colours and type (shared where the phone can share a file, else downloaded).
- The smoothed line is an exponentially weighted average, a tenth of the way to each weigh-in per day (as the Hacker's Diet draws it). It is for the chart only: the rate against the goal stays the regression. No prescription formula changed.

## Workout page, streamlined — branch session/workout2 (CACHE v240)

Owner's review, 6 Nov. What changed, and why:

- **Ticking chips centre their words** (`label.hap` is inline-flex, centred). Intensity's
  Easy/Moderate/Hard/All-out sat 14 px high on the iPhone, where the labels wrap the buttons.
- **The dose is chips under the name**: target reps, reps in reserve, tempo. The set line
  no longer repeats the reps. Reserve and tempo open a short "What it means" sheet
  (`openSheet("explain",{k})`). Tempo is kept as one left-to-right run (`dir="ltr"`), or
  Arabic showed 4-2-1-1 as 1-1-2-4. The same applies in the sheet's text.
- **Draft reps start inside today's range.** Last time's 8 from an old range no longer opens
  a 12–20 day (`syncDraft` clamps when the plan has lo/hi and is not timed). Within a
  workout, the next set still copies the set just done: that is what was lifted.
- **"Last time" sits beside "Recommended"** in the hint.
- **How you feel is asked first**, above the set card. It used to sit under the log button,
  in the middle of logging.
- **`.wkdock`**: the rest band and the log button share one sticky block at the thumb.
- **Header progress is one segment per exercise**, filling as its sets are done, the one on
  show marked.
- **A record set gets a gold eight-pointed star** in its toast (`toast(msg,null,null,"rec")`,
  `STAR8` in view.js). The finish screen's record card carries the same star. The `mane`
  drawing sits behind the tick: the one drawing that screen gets.
- Not done: preloading the next exercise's image. The workout screen shows no photo, so
  there is nothing to preload. The set-row ✕ already asks before deleting (`V.askDel`), so
  the review overstated that risk.

Tests: four new workout tests. Each fails on the old code and passes now.
- **Fold motion in a grid** (motion.js foldAway): a grid row cannot shrink below zero, so
  the folding card's negative margin never closed the gap, and the card below snapped
  12 px when the ghost went. In a grid, the next card now takes the negative margin.
  "Feel today" now measures the glide (no late step over 8 px).
- Tests updated for the new layout: the swipe test aims at the set line (the number boxes
  never start a swipe), and the bodyweight record test looks for the star toast.

## Fix round, 9 Nov — branch session/fixes3 (CACHE v241)

- **A missed day that fits nowhere** (owner: "Let it go should be Skip, option to log it, or to adjust
  the whole week or a training day to fix the issue and the volume"):
  - `rebalanceWeek` returns `adjust` when nothing fits, or some muscles are left over:
    - `adjust.move`: the free day ahead whose neighbours train those muscles least, naming them;
    - `adjust.fold`: the key lifts onto the days left anyway, time limit set aside, with each day's
      extra minutes.
  - The card offers Adjust the week (main), I trained it: log it, Skip. "Let it go" is now Skip
    everywhere.
  - The `missadj` sheet shows each choice with the rule it bends; the choice goes through
    `missApply(kind,true)`, with Undo.
- **Intensity words**: an explicit `.act-int label.hap` centring rule as well as the zero-weight
  default. The owner's screenshot most likely predates v240, which already centred them (test
  -14 px → 0).
- **My programs flashing on iPhone**: no flash in Chromium. Recorded tap, swipe and open frame by
  frame; nothing jumps. The rows are frosted glass inside a page that slides, and Safari redraws a
  backdrop blur when a transformed layer comes to rest. The templates beside them, opaque, never
  flashed. The program rows are now solid (`--glass-solid`), with no backdrop blur. To confirm on
  the phone.

## Restarts nobody asked for, noted — branch session/actlog (CACHE v242)

Owner, 9 Nov: "When I logged Football session today, the app showed a white page, then reloaded."

- **Not reproduced in Chromium.** Tried every path, with and without phone haptics and with animations
  on: log only, Save and exit, and Finish workout through the finish screen. No page error, no empty
  #app, and no redraw loop (4 mutations in 2 s).
- **Likely cause:** a white page and a reload is Safari's recovery when the page's WebContent process
  dies, usually from memory. The boot watchdog would have left the app's dark background and a
  `bunyan:booterr`.
- **What was added:** js/ui/crashnote.js.
  - `dispatchTap` leaves a trace (`bunyan:last`, the first data key) before each tap.
  - pagehide and visibility-hidden wipe it.
  - At launch (`bootCheck`, first thing in app.js), a leftover trace is kept in `bunyan:crash` (last
    three), with any script error from the 30 s before (`bunyan:lasterr`).
  - Shown under Settings › About as "Unexpected restarts", only when there is one.
- **Test:** crashes the renderer (CDP Page.crash) after Log activity and relaunches. The note names
  `logact` and About shows it. A reload notes nothing.
- **Next:** when the owner sees it again, read About and fix what it names.

## Profile and settings, streamlined — branch session/profile2 (CACHE v243)

Owner, 9 Nov: "do the same as the workout page with the profile and settings page, and execute".

- **One door to You.** The top card opens it: name, goal · program, and age · height. The duplicate You
  row is gone.
- **Weeks kept** replaces Streak. Streak counted days in a row, nearly always 0 on a 3-day plan.
  Weeks kept is `weekRun().weeks`, as Progress counts it. Workouts and weeks count up.
- **The default name.** "Me" shows as أنا in Arabic, and the card offers Add your name (renames the
  profile).
- **Groups:**
  - Settings: Training, Nutrition, Smart coach, App.
  - People.
  - Your data: Backup, Chat history.
  - Help: Guide, About.
- **Version.** js/version.js holds the version, shown at the foot of Profile and in About.
  tests/architecture.mjs keeps it equal to sw.js's CACHE: bump both together.
- **Training sheet:**
  - The row under Progression is "Weight increases".
  - RPE, countdown warning and keep-awake each get a line.
  - Footnote figures isolated (`figs`) so Arabic keeps "و2 كجم" in order.
- **You sheet.** Save and See my targets sit in a sticky `.sfoot`. `max-width:none` is needed: a sheet
  rule caps children at 100%.
- **App sheet.** The Home Screen icon note is folded (`details.sg-more`). Test haptics has a Try pill.
- **Arabic.** "Last set only" is آخر مجموعة, so it fits its button.
- **Kept as is.** Nutrition row units (kcal, g) stay untranslated, as everywhere else in the app.

## More than one goal, and the parts of a muscle — branch session/goals2 (CACHE v244)

Owner, 9 Nov: "Can I combine between these goals … based on knowledge base and still be able to
create a customized program, same for the focused muscle … the three shoulder muscles".

- **Goals** (js/data/goals.js): one main goal plus up to two more (`profile.goals2`, from
  `EXTRA_OK`: gain, strength, athletic, endurance, mobility).
  - The main goal sets the food. Calories go one way, so lose, recomp and maintain are main goals
    only.
  - `proteinOf` is the highest g/kg of the goals (body.js `proteinFor`). retarget.js is left alone:
    it reproduces old formula versions.
- **Training** follows the textbook's undulating periodisation (js/knowledge/phases.js: vary day
  to day "to improve all three adaptations together").
  - `dayGoals(p,n)`: the main goal on alternate days, the others between; one day each when there
    are few days.
  - `shapePlan` doses each training day by its goal's TRAIN and adaptation row, and adds that
    goal's extra (plyo, cond, mob). It stores `d.goal`, shown as a tag on the program's day rows.
  - The skeleton is built to hypertrophy volume when any goal is size.
  - The plan tag lists all the goals.
- **Parts** (js/data/parts.js): Shoulders front/side/rear; Chest upper/mid/lower; Back
  lats/upper/lower; Biceps peak/brachialis; Triceps long/outer; Glutes max/medius; Calves
  standing/seated; Core abs/obliques.
  - A part is read from the movement's name, in order (incline before bench press).
  - Focus holds "Muscle.part"; a whole muscle still works.
  - build.js counts a part for its muscle (`focusMuscles`). Each focused part gets an exercise
    that works it (`partCandidates`, from the whole library whichever muscle it is filed under),
    placed on the day that trains its muscle and led first.
  - The cap is three muscles; a whole muscle and its parts replace one another.
- **UI:**
  - Assessment goal step: "Also training for" chips.
  - Assessment focus step: muscle groups with All of it plus their parts.
  - The You sheet has "Also training for" too (takes effect when the plan is rebuilt).
- **Tests:** engine (parts, dayGoals, goalsOf, proteinOf, parts in buildWeek) and a browser test
  through Apply.

## The coach, reviewed — branch session/coach3 (CACHE v245)

Owner, 9 Nov: "do as you did for the workout page … with the coach structure … smart … compared to
knowledge base … weekly and monthly checks very accurate, suggested changes effective, and changing
the surrounding factors if needed".

- **Weekly check-in** (js/coach/checkin.js) also reads, and proposes:
  - `eat`: weight off pace on a week eaten well off the target. The target stays and the coach
    names the eating. Before, it said nothing, because a target change would not have helped.
  - `protein`: under 85% of target on 4+ logged days.
  - `steps`: under 70% of the goal on 4+ logged days. The proposal is a stepping stone 1,500 above
    what was walked, a goal that gets met.
  - Facts: protein, steps, and the main lifts over six weeks (rising, holding, slipping), so good
    news is said too.
  - The effort target comes from the program's planned RIR (`plannedRpe`), so combined-goal weeks
    and edited programs are read as they are.
- **Monthly review**, new: js/coach/monthly.js, js/engine/monthly.js, `moCard` in js/ui/checkin.js.
  - Open on days 1–10 for the month before, until done (`S.moDone`).
  - Facts: workouts against plan; weight change, first-week average against last-week average,
    compared with the goal's pace over the month; the best lift; food days.
  - Changes:
    - `days`: under 60% done.
    - `emphasis`: no main lift rising in a steady month. Adds strength (else size) as an extra goal
      and rebuilds: the textbook's undulating plan.
    - `weigh`: under 4 weigh-ins.
    - `food`: under 10 food days on a calorie goal.
    - `reassess`: 12 weeks since `profile.assessedAt`, now set on Apply. A profile without the date
      is never asked.
  - Undo on the plan changes. The chat answers "How was my month?" (intent `month`) with the same
    facts and buttons.
- **Coach page:**
  - The header names every goal.
  - The strip counts weeks kept (as Progress and Profile), not days in a row.
  - The month card leads For you in its first days.
- **Plan check:**
  - With more than one goal, "Heavy enough for strength?" reads the strength days only, and
    endurance rests the endurance days only. `heavyMains` and `shortRests` change only their days.
  - The protein note uses `proteinOf`.
  - New: a focused part (js/data/parts.js) the program no longer works. Fix `addpart`
    (engine/plan.js `addPartExercise`, from `partCandidates`) puts one first in its day.
- **Bug, older than today:** the number-wrapping helpers ran after escaping, so an apostrophe's
  `&#39;` had its 39 wrapped and showed as typed. Affected: check-in `nums`, the missed-day card,
  Settings `figs`, the missed-day sheet. All now keep entities whole.

## The pictures under the real sky — branch session/sky
Owner, 10 Nov: "make it dark as a night in night, and bright and sunny in day, and depends on the season … very accurate."
- js/engine/sun.js (pure): the sun's height and bearing from the NOAA solar equations (after Meeus) with refraction;
  sunrise/sunset found by stepping and halving (midnight sun / polar night come out as such); the twilight bands
  (civil 6°, nautical 12°, astronomical 18°, golden hour to 6° up); the season by hemisphere from the declination.
  Checked against the astral library: sunrise and sunset within half a minute for Cairo, London, Sydney, Riyadh,
  Tromsø across the year (js/engine/test/sun.test.js, published solstice times). skyLook's keyframes (how dark,
  warm, blue each band looks) are a modelling choice, said so in the file.
- js/data/tzplaces.js: the time zone's city stands for the place offline (~80 zones); an unknown zone takes its
  meridian at 30°N and Settings says "approximate". "Use my location" (Settings → App → Background) asks once,
  rounds to 0.1° and keeps it in this profile's prefs (S.prefs.skyLoc); S.prefs.nosky turns the whole thing off.
- js/ui/sky.js: sets --sky-* on #bgart each minute; the CSS registers them with @property, so the browser eases
  each minute into the next (60 s linear); set at once at start and on coming back after two minutes away.
  Filter (brightness/saturate/sepia/hue) on the photo, night blue on .photo::before, the horizon's glow over the
  veil in ::after. Only the pictures: cards, words and the theme's ground are untouched, so contrast holds.
## Profile › Nutrition is a settings sheet — branch session/nutset

Owner, 9 Nov: "I hate it when there is no nutrition settings, it just directs me to the nutrition page
… either remove it … or add actual useful settings".

- `set_food` (js/ui/settings.js foodSheet):
  - Daily targets: one row to where they are edited (the plan page's daily-goal card), showing what
    they are now.
  - Meals a day (3–6), Meal names (the existing `mstyle`), Food style (egy, mixed, intl).
  - Diet (any, veg, pesc, vegan); Leave out (dairy, eggs, fish, nuts, gluten); Protein powder
    (`toggle`).
  - "Rebuild my meal plan" (`data-pgen`): the plan built from these, shown before it is used.
- These are the assessment's food answers, in S.prefs, read by `mealPrefs`. Handlers `nset` and
  `navoid` in handlers/profile.js.
- The Profile row opens the sheet and says the meals a day too.
## The back swipe, drawn by the app on the Home Screen — branch session/backswipe (CACHE v246)

Owner, 9 Nov: "When swiping back it shows a black page for a moment then gets to the previous page
correctly. Need it smoother."

- **Measured.** The app paints the page before in the frame after popstate: no hidden, transparent
  or empty frame, and the ground cross-fades. The black is Safari's own swipe in a Home Screen app.
  While the finger moves it shows its picture of the page before, and it has none, so it shows the
  bare ground (--bg) until the swipe ends and popstate arrives. The same happened at a tab root,
  where the spare entry let the swipe start and then repushed.
- **The fix.** On the Home Screen (`navigator.standalone`, or sessionStorage `bunyan:ownback` for
  tests), js/ui/nav.js makes no history entries (`OWN`), so Safari's swipe has nothing to go back
  to and never starts.
  - js/ui/edgeback.js draws the swipe. A touch within 20 px of the left edge (the strip exswipe
    leaves alone) that moves right, on a page with a back arrow: the page on show becomes a still
    copy with its own ground (theme gradient and its photo) and follows the finger. The real page
    before is drawn under it at once (`peekBack`), a third of the way in, and shaded.
  - Past 35% or a flick it lands (`commitPeek`); otherwise it springs back and the page is drawn
    again (`cancelPeek`).
  - The arrow goes back through `stepBack` (the workout guard, the app's own slide).
- **Unchanged:** in a browser tab history drives everything as before; a live workout has no back
  arrow, so it is never swiped; a sheet is closed by its own drag.
- **Test:** turns the mode on and checks that no history entries are made, the page before is under
  the finger mid-drag, a short drag springs back, a long one lands, the root does nothing, and the
  arrow works.
- **Not testable here:** Safari's own gesture. To confirm on the phone.

## Dock with the swipe — branch session/docksync
Owner, 10 Nov: "The synchronization between the main swipe and the dock highlights is delayed." Swiping between
the main tabs, the dock's highlight moved only after the page had landed and render() ran syncDock, ~half a second
late. js/ui/dock.js now has dockFollow (the highlight moves towards the next tab by the share of the screen the
finger has brought the page), dockLand (on release: the next tab is set on at once, its pill opens while the page
slides, and the highlight travels the rest over the slide's own duration with the page's ease-out curve) and
dockBack (home with a page that springs back). exswipe.js calls them through app.js helpers (follow/land/back);
moveHl takes a duration and a force flag. Regression test "Dock with the swipe".

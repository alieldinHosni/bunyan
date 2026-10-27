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

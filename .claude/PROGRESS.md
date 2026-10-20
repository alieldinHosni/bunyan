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

### ⚠ PRIORITY — two bugs for the app session (owner, 20 Oct)

**P1. `js/engine/body.js` `bmrOf` defaults to 86 kg when no weight exists** (`num(p.weight,86)`). That is the owner's own body weight hardcoded as a fallback: every other profile with no weight silently gets the owner's BMR, and every target derived from it (maintenance, calories, macros) is wrong. It also breaks `CLAUDE.md` ("body weight comes from the profile, never hardcoded"). **Fix:** with no weigh-in and no profile weight, return a "no weight set" result and prompt for a weight, never a default. (The coach's wrapper `js/coach/targets.js` already refuses to call it without a real weight.)

**P2. Two calorie floors.** `targetKcalOf` lets a weight-loss target fall to 0.95 × BMR, which sits **below** the BMR floor the owner set for weekly reconciliation (2.7A). Two floors is the inconsistency being removed. **Fix:** raise the engine's floor to BMR itself, so there is one floor in the app. Nothing automated may take a user below BMR.

### Book values to adopt — for the app session (owner, 20 Oct: the book is the default)

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

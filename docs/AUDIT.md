# BUNYAN: Functional, Technical and Fitness-Product Audit

Audited commit: `a1b3ba9` (main after PR #8). Date: 29 Sep 2026.
No application code was changed during this audit.

## How this was done, and what the labels mean

- **Code read:** every module that affects behaviour: navigation, state and persistence, IndexedDB, rest timer, session engine, plan engine, formulas, nutrition, service worker, sheets and render.
- **Browser tests:** about 30 scripted Playwright flows in headless Chromium at 390×844 with touch emulation. They ran against a seeded profile (29–500 sessions, up to 365 food days), plus fresh, corrupted and legacy data.
- **Status labels:**

| Label | Meaning |
|---|---|
| **CONFIRMED** | Reproduced in the running app, with the observed output quoted. |
| **CODE-CONFIRMED** | The code path is deterministic and was read end to end, but it depends on a platform event I can't trigger here (for example the phone locking). |
| **RISK** | A plausible failure that I couldn't prove. |
| **NOT TESTED — ENVIRONMENT LIMITATION** | Needs a real iPhone. The manual test steps are given in section H. |

Chromium is not iOS Safari. Nothing in this report claims iOS behaviour unless it is labelled that way.

---

## A. Executive summary

**Overall functional condition:** the core loop works. You can plan a day, start it, log sets, rest, finish, and see the workout in history. It works offline, back navigation never exits the app, a live workout survives a reload, and a finished workout is recorded exactly once. Rendering is fast, 2–15 ms even with 500 sessions.

The weaknesses are **data safety**, **input integrity** and **training logic**, not the UI.

**Biggest risks:**

1. **The backup can't be restored.** A backup exported from the current app is rejected by the app's own Restore screen: "That does not look like a backup." All data lives only on the phone. Safari can also wipe it (clearing site data; the 7-day eviction for sites that aren't installed). So today there is no working recovery path. **P0.**
2. **Easy, silent loss of logged work during a workout:**
   - A double tap on ✓ logs the set and immediately removes it again.
   - Tapping the green tick deletes a set with no undo.
   - Replacing an exercise wipes the sets already logged for it.
   - A second open copy of the app can overwrite an active workout.
3. **Stored data isn't validated.**
   - A corrupted save is silently replaced with defaults, and the original is overwritten.
   - A save that is missing a section (profile, goals) makes the app throw on every render.
   - Negative weights and reps, 99,999 kg and 1,000 reps are all accepted and flow into records and recommendations.
4. **Recommendations are fed values the user never entered.** RPE 8 is pre-filled and saved as performed on every set. The progression rule then trusts it.
5. **The plan generator produces flawed programmes:**
   - Planks become "2 × 9–15 seconds".
   - The strength goal turns every compound, including machine presses, into 3–4 reps with 235 s rest.
   - Full Body runs three full-body days back to back.
   - The rotation never schedules a rest day as "today".

**Biggest architectural problems:**
- About 800 lines of `if (D.x)` business logic in one global click handler (`js/app.js`).
- Two global mutable stores: `S` (persisted) and `V` (memory only). The rest timer and the current exercise live only in `V`.
- Exercises are identified by their display-name string.
- The workout model is "sets with optional fields". Activities are recognised by looking up the name, not by a type on the record.

**Most important areas to fix, in order:** backup and restore, set-logging safety (double tap, undo, replace), stored-data validation, input validation, persisting the workout position and rest timer, then the plan-generator logic.

**Biggest fitness-product gaps:**
- Weekly volume per muscle against a target. It is computed (`weeklySets`, `plannedWeekly`) but never used.
- Performed values are not kept honestly separate from suggested ones (RPE especially).
- No deload or plateau signals.
- Rest days are not respected.
- Nutrition doesn't use training at all. That is acceptable, but it isn't stated.
- There's no minimal readiness check. The Recovery sheet exists but nothing opens it.

---

## B. Critical and high-severity bugs

Each bug lists severity, status, where it is, how to reproduce it, what happens versus what should happen, the root cause, the fix, and the files.

### B1: Exported backups cannot be restored
- **Severity:** P0. **Status:** CONFIRMED.
- **Where:** `js/app.js` lines 772–776, the `D.dorestore` handler.
- **Reproduce:** Profile → Backup, copy the text, then Restore and paste it.
- **What happens:** the toast "That does not look like a backup." The test backup had 29 sessions and 21 food days.
- **What should happen:** the backup is restored.
- **Root cause:** the check `if(!o||!o.splits)throw 1`. `splits` is the old schema key. `migrate()` deletes it on every boot (`js/state.js`, `delete S.splits`), so no current backup has it.
- **Fix:**
  - Validate on `v`, then `sessions`, `myPlan` or `prefs`.
  - Merge the backup with the defaults (`DEF`) and run `migrate()`.
  - Show a summary before overwriting ("29 workouts, 21 food days, from 12 Sep").
  - Add a file export. A downloaded `.json` via Blob, or the share sheet, beats copying roughly 20 KB to 5 MB of text by hand on a phone.
  - Photos are not included; say so, or add them as an optional archive.
- **Files:** `js/app.js`, `js/ui/sheets.js` (backup and restore sheets), `js/state.js`.

### B2: A double tap on ✓ logs a set and then removes it
- **Severity:** P1. **Status:** CONFIRMED (with the auto rest timer off).
- **Where:** `js/app.js` 228 (`D.logset`) and 270 (`D.unlog`).
- **Reproduce:** turn off auto-start rest, start a workout, and double-tap the red ✓. Result: `sets = 0` after the two taps; a third tap logs it again.
- **With auto-rest on:** the second tap lands on the rest overlay instead, which is harmless most of the time.
- **Root cause:**
  - Render is synchronous, so the same element spot switches from "log" (`data-logset`) to "undo" (`data-unlog`) under the finger.
  - Undo takes one tap with no confirmation.
- **Fix:**
  - Ignore `data-unlog` for about 700 ms after that row was logged (store `V.freshAt`).
  - Better: make undo reachable only through the toast or a long press.
- **Files:** `js/app.js`, `js/ui/views/session.js`.

### B3: Removing a logged set has no undo, although the code comment says it does
- **Severity:** P1. **Status:** CONFIRMED.
- **Where:** `js/app.js` 270–273.
- **What happens:** the toast "Set removed." appears with no Undo button (`.toast-undo` absent).
- **Root cause:** `toast(t("Set removed."))` is called without the undo callback that `toast()` supports. The food delete (`D.dropfood`) does pass one.
- **Fix:** pass a callback that puts the set back at the same index and saves.
- **Files:** `js/app.js`.

### B4: Replacing an exercise mid-workout deletes its logged sets
- **Severity:** P1. **Status:** CONFIRMED.
- **Where:** `js/ui/actions.js` line 229 (`cur.sets=[]`).
- **Reproduce:** log 2 sets, tap Replace Exercise, pick anything. Result: the name changes and `sets = 0`, with no warning and no undo.
- **What should happen:** the performed sets stay in history under the exercise they were done on.
- **Fix:**
  - If the entry has sets, insert the replacement as a new entry after the current one and mark the old entry as done.
  - Or ask first: "Keep 2 sets of Incline Bench and switch to X?".
  - Also reset `planned` when replacing a lift with an activity, or the other way round.
- **Files:** `js/ui/actions.js`, `js/app.js` (`D.swap`).

### B5: Corrupted or incomplete stored data is either wiped silently or crashes the app
- **Severity:** P1. **Status:** CONFIRMED.
- **Where:** `js/util.js` 8 (`rd`), `js/state.js` 66 (`hydrate`).
- **Test (a):** a truncated JSON blob. The app restarts onboarding and the stored blob is overwritten with defaults. The original can't be recovered.
- **Test (b):** a valid blob with no `profile` or `goals`. Each render throws `Cannot read properties of undefined (reading 'kcal')` three times, and the dock tap fails.
- **Root cause:**
  - `rd()` swallows parse errors and returns the fallback.
  - `hydrate()` fills defaults only for a few keys (`prefs` only when it is missing entirely, and never its individual fields).
- **Fix:**
  - Before resetting, copy the raw string to `bunyan:db:<pid>:corrupt:<timestamp>` and tell the user.
  - Add `normalize(S)`, which deep-merges `DEF` and checks types (arrays are arrays, numbers are finite).
  - Run it on boot, restore and profile switch.
- **Files:** `js/util.js`, `js/state.js`.

### B6: The plan generator applies rep ranges to exercises they don't fit
- **Severity:** P1 (training logic). **Status:** CONFIRMED by running `buildPlan()`.
- **Where:** `js/engine/plan.js` 132–152.

| Profile | Result |
|---|---|
| Beginner, lose fat | Full Body. Plank **2 × 9–15** (it is a timed exercise, so seconds). Bench, pulldown and leg press all 3 × 9–13 with 120 s rest. |
| Advanced, strength | Push/Pull/Legs. Bench, machine shoulder press and incline DB press all **4 × 3–4, 235 s rest**. Calf raises 6–8, hanging leg raise 6–8. |

- **Root cause:** every exercise whose muscle isn't Ankle, Mobility or Cardio is overwritten with the level's compound or isolation numbers plus the goal's shift. Nothing marks a main lift, a timed hold or a core or calf movement.
- **Fix:**
  - Add a role to each preset exercise: `main`, `secondary`, `accessory`, `timed`.
  - Apply the strength shift only to the main lift or lifts of the day.
  - Never rewrite timed holds.
  - Keep calves and core in their own range.
  - Round rest to sensible values (60/90/120/180 s).
- **Files:** `js/engine/plan.js`, `js/data/splits.js`.

### B7: The rotation never makes today a rest day, so full-body days run back to back
- **Severity:** P1 (training logic). **Status:** CODE-CONFIRMED, plus the preset data.
- **Where:** `js/ui/views/train.js` 31 (`nextDayOf`) and 53 (`planOn`); `js/data/splits.js`.
- **What happens:**
  - `nextDayOf()` skips days with no exercises, so after any session today's plan is the next training day.
  - The presets put all their rest days at the end: Full Body is A, B, C, then 4 rest days; Upper/Lower is 4 training days, then 3 rest days.
  - The result: three full-body sessions on consecutive days, then four days off.
  - The "Rest day" card only ever shows for future dates.
- **What should happen:** at least a day between sessions that hit the same muscles. A common default is FB A · rest · FB B · rest · FB C · rest · rest.
- **Fix:**
  - Interleave rest days in the presets.
  - Make `planOn(today)` respect a rest day that follows a completed session. For example, only move forward when the previous day in the cycle was trained or has passed.
  - This is a product decision: a rotation versus a calendar. Keep the rotation, but let rest days count.
- **Files:** `js/ui/views/train.js`, `js/data/splits.js`, `js/ui/views/home.js`.

### B8: Suggested values are recorded as performed (RPE in particular)
- **Severity:** P1 (data integrity). **Status:** CONFIRMED. Every set logged in tests without touching RPE stored `"rpe":8`.
- **Where:**
  - `js/ui/actions.js` 150 (`syncDraft`: `V.draft.rpe = ... || 8`).
  - `js/app.js` 228 (the set is saved with `rpe:V.draft.rpe`).
  - `js/engine/formulas.js` (`recommend`: `avg<=9` counts as "not near failure").
- **What happens:**
  - With RPE set to "last set only", every other set still gets a stored RPE of 8.
  - The progression rule counts those as real ratings, so it always passes the "not near failure" gate.
  - Weight and reps are pre-filled too: the recommendation, or the last set. That is acceptable UX (tap ✓ to confirm), but nothing records that the value was suggested and not typed.
- **Fix:**
  - Draft RPE should be `null`, and RPE stored only when the user sets it.
  - Show the suggestion as a ghost value.
  - Optionally store `src:"confirmed"|"edited"` per set, so analytics can tell them apart.
- **Files:** `js/ui/actions.js`, `js/app.js`, `js/ui/views/session.js`, `js/engine/formulas.js`.

### B9: Resume and reload return to the first exercise
- **Severity:** P1 (workout flow). **Status:** CONFIRMED.
- **Reproduce:** start a workout, move to exercise 3 with Next exercise, then ✕ → Save and exit → Resume.
- **What happens:** `logIdx = 0` and the screen shows exercise 1. After a reload the same happens (`V.logIdx=0`, `S.active.idx` stale).
- **Root cause:**
  - `S.active.idx` is updated only by the segment jump and superset paths, never by `D.nextex` (`app.js` 305).
  - `V.logIdx` isn't restored from `S.active` when the app starts or when the Train tab opens.
- **Fix:** one setter `setLogIdx(i)` that writes both `V.logIdx` and `S.active.idx` and saves. Restore `V.logIdx` from `S.active.idx` in boot and on Train entry.
- **Files:** `js/app.js`, `js/ui/actions.js`, `js/ui/views/session.js`.

### B10: The rest timer is lost on reload or when the OS kills the tab
- **Severity:** P1. **Status:** CONFIRMED (the rest was running before the reload and gone after it).
- **Root cause:** `restEnd`, `restTotal`, `restPaused`, `restLeft` and `restDone` live only in `V` (`js/ui/view.js`).
- **Fix:** persist `S.active.rest={end,total,paused,left}` on every change and restore it on boot. The timer is already timestamp-based, so a restored rest shows the correct time left.

### B11: The screen wake lock is never re-acquired after the app returns from the background
- **Severity:** P2. **Status:** CODE-CONFIRMED; NOT TESTED on a device.
- **Where:** `js/ui/view.js` 119 (`keepAwake`).
- **Root cause:** the browser releases the lock whenever the page is hidden, but `wakeLock` keeps pointing at the released lock. `keepAwake(true)` then skips the request because `!wakeLock` is false.
- **Fix:** add `wakeLock.addEventListener("release",()=>wakeLock=null)`, and re-request on `visibilitychange` when the page is visible.
- **Note:** iOS supports the Wake Lock API from 16.4. In Home Screen apps it only started working reliably in recent iOS versions. See section H.

### B12: If a rest ends while the phone is locked, the alarm plays on return
- **Severity:** P2. **Status:** CODE-CONFIRMED.
- **Where:** `js/app.js` 1011–1018.
- **What happens:** iOS pauses JavaScript in the background, so the tick doesn't run. On return, `left<=0 && !beeped` starts the full 8-second alarm, even if the rest ended minutes ago.
- **Fix:**
  - If the first time the tick sees zero is more than about 5 s after `restEnd`, skip the sound and show "Rest ended 3:12 ago".
  - Also run the tick immediately on `visibilitychange`, not up to 1 s later.

### B13: Negative and absurd numbers are accepted
- **Severity:** P1 (data integrity). **Status:** CONFIRMED.
- **What was logged:** `-20 kg × -5`, `99999 kg × 8`, and `60 kg × 1000 reps`.
- **Where it spreads:** volume, records ("PR 99,999 kg"), recommendations and charts.
- **Root cause:** there's no bounds check in `D.logset`. The in-place edit handler clamps to ≥ 0 only.
- **Fix:**
  - Validate: weight 0–1000 kg, reps 1–100, seconds 1–3600, RPE 1–10 or empty.
  - Show an inline error and don't log.
  - The same rule should apply in the session edit sheet.

### B14: Clearing the weight field logs the previous weight
- **Severity:** P2. **Status:** CONFIRMED. An empty weight logged the previous 99999.
- **Root cause:** `if(lw.value!=="")` skips an empty field and keeps the old draft value.
- **Fix:** an empty field means 0 (bodyweight), or ask.

### B15: "Finish workout" with no sets discards silently and leaves the ⋯ sheet open
- **Severity:** P2. **Status:** CONFIRMED.
- **What happens:** `active=false`, the session count is unchanged, `V.sheet="sessmore"`, and there's no toast.
- **Fix:** ask first ("Nothing logged. Discard this workout?"), and close the sheet afterwards.

### B16: Two open copies of the app overwrite each other; an active workout was wiped
- **Severity:** P2. **Status:** CONFIRMED.
- **Reproduce:** tab A logs a set. Tab B, with a stale copy, saves a setting. After tab A reloads: `active? false`.
- **Root cause:** every save writes the whole in-memory blob, so the last writer wins, and nothing listens for storage events.
- **Fix:**
  - Listen for the `storage` event and re-read `S`, or warn "Bunyan is open elsewhere".
  - Longer term, store the active session under its own key with a revision counter.

---

## C. Navigation and state

**Model.**
- `pushNav()` records a location and pushes a history entry. `resetNav()` runs on every tab tap.
- One `popstate` handler serves the in-app back arrow and the browser gesture.
- A spare history entry stops the gesture at a tab root from leaving the app.
- Sheets don't push history; back closes them first.

**Verified in Chromium:**

| Flow | Result |
|---|---|
| Day view → edit sheet → back → back → back | Sheet closes → hub → stays on hub. Never leaves `/index.html`. ✔ |
| Library → exercise sheet → similar exercise → back | The sheet closes completely. It doesn't return to the first exercise. P3. |
| Library search → Food → Train | The Library view and search query are kept. ✔ |
| Progress sub-tab → Home → Progress | The sub-tab is kept. ✔ |
| Browser back during a workout | Held off with the message "Tap the close button…". ✔ |
| ✕ during a workout | The leave sheet opens. Save and exit goes to Home, Discard to Train. ✔ |
| 20 × (Train → Library → Home) | `history.length` grew by 20. The entries are never unwound. P3, a history leak. |
| Tab switch after scrolling | The new tab opens at the old scroll offset (57 px). The previous tab's scroll isn't restored. P3. |
| Rest screen shown | Covers the whole app, dock included. You can't switch tab, open exercise info, or fix the set you just logged until you skip. P2 (design). |

**State problems found:**
- The exercise index (`V.logIdx` vs `S.active.idx`, B9) and the rest timer (B10) are split between memory and storage.
- The Food date (`V.fdate`) persists across tab switches. Coming back later can log to yesterday; the header does say so. P3.
- Editing a session's date doesn't re-sort history. "Previous performance", the rotation and the streak read array order, not date. P3.
- There is no single "current workout position" object. Position is spread over `V.logIdx`, `S.active.idx`, `V.fresh` and `V.draft`.

---

## D. Workout engine

| Check | Result |
|---|---|
| Start from a day, log sets, rest, next, finish | ✔ Works. |
| Recorded exactly once | ✔ A double tap on Finish on the last exercise added 1 session, not 2. |
| Active workout survives a reload | ✔ Sets are kept, but the position and rest are lost (B9, B10). |
| Planned vs performed | ✔ Structurally separate: `entry.planned` vs `entry.sets`. ✖ RPE and pre-filled values blur this (B8). |
| Previous performance | ✔ `prevPerf()` takes the newest session with the exercise and excludes warm-ups. |
| Editing a logged set | ✔ Edits in place, but values aren't validated (0 reps is allowed). |
| Add set / remove empty row | ✔ Works. Removing empty rows can go below the prescription, which is fine. |
| Replace exercise | ✖ Deletes logged sets (B4). |
| Undo a set | ✖ No undo (B3); a double tap removes it (B2). |
| Zero-set finish | ✖ Silent discard (B15). |
| "End workout" on the rest screen | Finishes immediately, even with planned sets left. There's no confirmation. P3. |
| Timed exercises | The logger hides the weight column, so farmer's walks and weighted carries can't record load. The rest screen then describes timed sets as reps (`ex_isTimed(e.name)` should be `ex_isTimed(e)`, `session.js` 499). P3. |
| Supersets | Present (`grp`). The rest is skipped inside a round. Not stress-tested. |
| Cardio and sports | Logged as minutes, km and intensity; these don't count toward volume or records. ✔ (tested in PR #7/#8) |

**Root cause shared by most workout bugs:**
- Session mutations happen inline in the global click handler (`app.js`), with no action layer that validates, persists and adds undo in one place.
- `D.logset`, `D.unlog`, `D.swap` and `D.nextex` each re-implement part of "change the session".

---

## E. Rest timer

- **Timestamp-based:** ✔ `restEnd=Date.now()+…`, and the remaining time is always recomputed from it. Background throttling can't make it drift.
- **Start, pause, resume, ±30 s, skip, extend +30/+60, done screen:** ✔ Tested. Pause holds exactly.
- **Only one timer:** ✔ One `setInterval` for the whole app. A new rest replaces the old one, so there are no duplicate timers.
- **Rest time:** comes from the exercise (120 s for compounds by default) ✔.
- **Problems:**
  - Lost on reload or app kill (B10).
  - A late alarm on return (B12).
  - The wake lock is lost after backgrounding (B11).
  - The alert happens only while the page is running. iOS won't run JavaScript or play audio while locked or in the background.
  - A web app can't schedule a local notification on iOS (the Notification Triggers API isn't supported), so the timer can't alert you while the phone is locked. The screen alert when you return is the ceiling. Say so in the app.
- **Sound:** Web Audio oscillators scheduled up front ✔. They respect the silent switch on iOS, and the app already says so.
- **Vibration:** `navigator.vibrate` doesn't exist in iOS Safari, so every haptic call is a no-op on iPhone. Don't depend on it.

---

## F. Nutrition

**Verified:**
- Search works offline against 501 local foods.
- The servings screen adds the correct grams (oats ×2 = 80 g, 311 kcal).
- Logging to a chosen past date works.
- Deleting an item has undo.
- Unit conversion ml/L/oz and the other units come from earlier work.

**Problems:**
- **Food data errors (P2, CONFIRMED):**
  - "Chicken Breast, Raw" = 165 kcal / 31 g protein, the same as cooked. Raw is about 120 kcal / 22.5 g.
  - "Shrimp" equals "Shrimp, Cooked".
  - Three foods have macro-to-calorie mismatches over 25%. Cocoa, artichoke and kale are explained by fibre, which is acceptable.
- **Saved meals** are added to the current time's meal on the Food date, not to the meal the sheet was opened for (`D.addsaved`). P3.
- **Targets:**
  - A fixed −500 kcal deficit with no floor.
  - Protein at 2 g per kg of scale weight, which is high for people with high body fat.
  - Exercise calories are never added. Given that the activity multiplier already includes training, that is the right default, but the UI never says so.
  - See M9.
- **Open Food Facts** is the only network dependency; its failure is handled with a message ✔.

---

## G. Data and persistence

### Entity map (current)

| Entity | Where | Written by | Read by |
|---|---|---|---|
| Profiles list, current id | localStorage `bunyan:profiles`, `bunyan:current` | Profile settings | Boot, switching |
| Profile (age, height, sex, activity, goal, level, days, prog) | blob `bunyan:db:<pid>` → `S.profile` | Setup, Settings | Targets, plan engine, recommendations |
| Preferences, goals | blob → `S.prefs`, `S.goals` | Settings | Everywhere |
| Plan | blob → `S.myPlan {days:[{id,name,ex:[{id,name,muscle,sets,lo,hi,rest,grp,min,rpe,km}]}]}`, `S.userSplits` | Train editors, `buildPlan` | Train, Home, `startDay` |
| Presets | Code (`splits.js`) | — | Plan engine, Programs |
| Day swaps | blob → `S.daySwap{date:dayId}` | Change workout | `planOn` |
| Active workout | blob → `S.active {id,date,started,lastSet,activeMs,idx,dayId,dayName,notes,entries:[{name,muscle,planned,rest,grp,extra,sets:[{w,r,rpe,wu,min,km,kcal}]}]}` | Session handlers | Logger, Home |
| Rest timer, current exercise, draft set | **memory only** (`V`) | Session handlers | Logger, rest screen |
| Sessions (history) | IndexedDB `sessions`, key `pid|id`, `ord` for order; in memory as `S.sessions` (newest first) | `recordSession`, edit and delete | Progress, previous performance, records, rotation |
| Food log, water, steps, recovery | IndexedDB `days`, key `pid|date` → `S.days[date]` | Food, Home | Food, Progress, Home |
| Body weight and measurements | blob → `S.body[]` (weight rows and measurement rows mixed) | Weigh, measure sheets | Progress, targets, calories |
| Foods | `foods.json` (local database), `S.myFoods`, `S.savedMeals`, `S.freq` | Food flows | Search |
| Exercises | `exercises.json`, `instructions.json`, `activities.js`, `S.myEx`, `S.favs`, `S.gear` | — or user | Library, logger |
| Photos | IndexedDB (photostore) | Progress | Progress (not in backup) |

**Strengths:**
- The migration from localStorage to IndexedDB is careful: write, read back, then drop.
- Falls back to the blob when IndexedDB fails ✔.
- The legacy v1 schema (`splits`/`currentSplit`) migrated correctly in testing ✔.
- A full storage quota shows a toast ✔. The current workout isn't persisted in that state, which is expected.

**Problems:**
- B1 (restore), B5 (corruption), B16 (multiple tabs).
- **IndexedDB becomes unavailable after migration** (CONFIRMED): history looks empty (`sessions 0`) with no message. The data isn't lost, but the user will think it is. Show a "history unavailable" banner.
- **No `navigator.storage.persist()` request.** Safari and Chrome can evict the data under storage pressure.
- **ITP:** Safari deletes script-written storage after 7 days without a visit for sites *not* added to the Home Screen. RISK / platform behaviour.
- **Separate storage on iOS:** a Home Screen app has storage separate from Safari. Data logged in the Safari tab doesn't appear in the installed app. NOT TESTED; worth checking on the device.
- **Mixed records in `S.body`:** weight and measurement rows share one array. Every reader filters by field.
- **Exercise identity is the display name.** Renaming or re-keying `exercises.json` would orphan history. There are no ids.
- **Derived values stored:** `entry.muscle` is cached at plan time. The code already works around stale copies (the `muscleOfEntry` comment).

---

## H. Safari and iPhone compatibility

**Checked in code or CSS:**
- The viewport meta has `viewport-fit=cover` ✔.
- Heights: `100dvh` in the browser, `100lvh` in standalone (fix from PR #3) ✔.
- `env(safe-area-inset-*)` is used on the dock, rest screen and sheets ✔.
- Touch listeners are passive ✔. `touch-action: manipulation` is set globally (no double-tap zoom delay) ✔.
- `overscroll-behavior: contain` on sheets ✔. The body is locked with `position:fixed` while a sheet is open ✔.
- **Inputs below 16 px, which iOS zooms into on focus:** only `#snote` (15 px, session note) and `#rs` (12 px, Restore). P3, a one-line fix.
- **Navigation gestures:** the back gesture is Safari-tab only. A Home Screen app on iOS has no edge-swipe back at all, so the ✕ and back arrows must always be visible. They are.

**Everything below is NOT TESTED — ENVIRONMENT LIMITATION. How to test each on an iPhone:**

| # | What | Manual test | Pass condition |
|---|---|---|---|
| H1 | Rest timer while locked | Start a 60 s rest, lock the phone for 2 min, unlock | Shows "Rest complete". After B12 is fixed, no 8-second alarm long after the rest ended. |
| H2 | Wake lock | Start a workout with "Keep screen awake" on, leave the phone for longer than the auto-lock time, switch apps and back, wait again | The screen stays on both times. Fails today after the app switch (B11). |
| H3 | Silent switch | Silent on → rest ends | No sound, but the alert screen shows. |
| H4 | Keyboard | In the logger, tap the kg field, type, tap the reps field | The page doesn't jump, the dock hides, and the ✓ stays reachable. |
| H5 | Zoom | Tap Session note and the Restore text box | No zoom after fixing to 16 px. |
| H6 | Safari → Home Screen | Log a meal in Safari, add to Home Screen, open the app | Check whether the meal is there. If not, tell users to install first or use backup. |
| H7 | 7-day eviction | Use in a Safari tab only, don't open for 8 days | Data present? Expected risk of loss. |
| H8 | Update | Deploy, then open the Home Screen app, close fully, reopen | New version, with no mixed old/new screens (fixed in PR #5; verify). |
| H9 | Offline | Airplane mode → open the app, start a workout, log, finish, search food | Everything works. Open Food Facts shows a clear message. |
| H10 | Weak signal | Open the app on 1-bar signal | Opens within about 2 s. RISK: the service worker is network-first without a timeout (see I). |
| H11 | Orientation | Rotate during a workout | The manifest locks portrait; the Safari tab can rotate. Layout still usable. |
| H12 | Back gesture (Safari tab) | Swipe back on the Train hub, in a day view, during a workout | Hub: nothing. Day view: back to hub. Workout: held off with the message. |

---

## I. Performance

Desktop Chromium figures, with 500 sessions and 365 food days. Expect roughly 3–5× slower on an iPhone.

| Measurement | Result |
|---|---|
| `render()` Home / Food / Train / logger | 1.7–2.2 ms |
| `render()` Progress overview / strength | 9.7 / 10.1 ms |
| `render()` Library, no filter | 15.1 ms |
| Logging a set (handler + save + render) | 2–3 ms. The first set takes about 60 ms because the AudioContext is created then. |
| `saveDB()` | 0.1 ms. The blob is 4 KB, because history is in IndexedDB. |
| DOM nodes on the logger | about 160 |

Performance is not a problem today. Watch-points:
- The Library re-renders up to 120 rows per keystroke, debounced to 140 ms.
- Progress walks all sessions on each render. Memoise per session count if history reaches thousands of sessions.
- Create the AudioContext on the first tap of Start workout, not on the first set, so logging the first set stays instant.

**Service worker (RISK, NOT TESTED):**
- Since PR #5, the page *and all ~45 modules* are fetched network-first with `cache:"no-cache"` revalidation and no timeout.
- On a weak connection, a cold launch waits for each revalidation.
- Chromium's page-level throttling doesn't apply to the service worker's own fetches, so I couldn't measure it here.
- **Fix:** race the network against a 2–3 s timeout, then serve the cache. Or cache-first, checking a small `version.json` to decide whether to refetch.
- **Offline fallback bug:** any failed app URL, including `.js` and `.json`, gets `index.html` back (`sw.js` 83). Only navigations should get it.

---

## J. Errors and edge cases (results)

| Scenario | Result |
|---|---|
| Empty reps | "Enter reps first." ✔ |
| 0 reps | Blocked ✔ (but 0 is allowed when editing a logged set) |
| Decimal weight 62.25 | Accepted ✔ |
| Negative weight or reps, 99,999 kg, 1,000 reps | Accepted ✖ (B13) |
| Empty weight | Logs the previous value ✖ (B14) |
| Non-numeric weight | The number field refuses it ✔ |
| Double tap ✓ | Logs then undoes ✖ (B2) |
| Double tap Finish | One session ✔ |
| Start → immediately back | Held; ✕ shows the leave sheet ✔ |
| Start → log → refresh | Sets kept ✔; position and rest lost ✖ (B9, B10) |
| Start → discard → reopen | Fresh session ✔ |
| Replace after logging | Sets lost ✖ (B4) |
| Rest ends on another tab | Rest overlay covers every tab, so it's global ✔; done state kept ✔ |
| Corrupted save / missing sections | Reset or crash ✖ (B5) |
| Legacy v1 save | Migrates ✔ |
| Storage full | Toast ✔ |
| IndexedDB unavailable | History looks empty, no message ✖ |
| Two copies open | Active workout overwritten ✖ (B16) |
| Offline boot, log, finish, search food, exercise steps | ✔ |
| Restore own backup | Rejected ✖ (B1) |

---

## K. Architecture and code quality

**Maintainable parts:**
- A clear module split: `state`, `db`, `engine/*`, `ui/views/*`, `sheets`.
- Pure formula functions.
- Honest, detailed comments.
- No framework and no dependencies except the barcode library.

**Problems:**

| Problem | Where | Consequence | Direction | When |
|---|---|---|---|---|
| One global click handler of about 800 lines mixing UI and business logic | `app.js` | Every session change is re-implemented. Validation, persistence and undo are inconsistent (B2–B4, B13–B15). | Extract `sessionActions` (log, unlog, edit, replace, next, finish) with validate → mutate → persist → undo in one place. The handler only dispatches. | Phase 2 |
| Two global mutable stores; important state memory-only | `V` (view.js) | Lost on reload (B9, B10). | Persist the workout's runtime state (`idx`, rest, draft) on `S.active`. Keep `V` for pure UI. | Phase 1–2 |
| No schema normalisation or versioning | `state.js` | Crashes on partial data, data loss on corruption. | `normalize()` + `DEF` deep merge + `v` migrations table. | Phase 1 |
| Exercise identity by name | sessions, plans | Renames orphan history; can't have variants. | Stable exercise ids in `exercises.json`. Store `exId` next to `name` in new entries; fall back to name for old ones. | Phase 3 |
| Workout model is sets-with-optional-fields; type inferred from the name | `entries[].sets` | Every consumer must special-case activities. | Add `entry.kind: "strength"|"timed"|"activity"` and typed performance records. | Phase 3 |
| Personal data baked into generic code | `splits.js` AP preset (Ankle, Football), Recovery "Ankle pain" | Every user gets one person's rehab plan as the default (`migrate()` fallback) and a rehab field. | Move personal plans to user data. Generic presets only. | Phase 1 |
| Dead code | `weeklySets`, `daysSince`, `consistency`, `plannedWeekly` (unused); `.wc-*` and `.rt-opt` CSS; `sessionKcal` import; unreachable Recovery sheet | Confusion; features look implemented but aren't. | Delete, or wire up (weekly sets; see M). | Phase 2 |
| Mixed body records | `S.body` | Every reader filters. | `weights[]` and `measurements[]`. | Later |
| Strings not translated | toasts ("Weight saved.", "Restored."), backup text | The Arabic UI mixes in English. | Route through `t()`. | Phase 3 |

---

## L. Functional improvements (things that work but are poorly designed)

1. **Rest screen blocks everything.** Let the rest run as a compact bar at the top of the logger, with a full-screen alert only when it ends. That lets you fix a typo or read the next exercise mid-rest.
2. **Undo instead of confirm** for set removal, replacement and "End workout" (the app already has undo toasts).
3. **Mark suggestions as suggestions:** ghost values, and "✓ as suggested" vs "✓ edited".
4. **Resume exactly where you were:** exercise, set, rest (B9, B10).
5. **Food date:** snap back to today when the Food tab opens after midnight or after 30 minutes away.
6. **Backup as a file,** plus a monthly reminder that actually works (B1). Say plainly that the data lives only on this phone.
7. **"History unavailable" banner** when IndexedDB fails.
8. **Similar exercises** should keep a back stack inside the exercise sheet.
9. **First-set speed:** create audio when the workout starts.

---

## M. Fitness and training-logic audit

### M1. Programming logic (13.1)
- **Splits:** Full Body, Upper/Lower, Anterior/Posterior, PPL, Bro, Arnold and Bodyweight are reasonable choices. The split-picker scores frequency, level, goal and equipment coverage, and explains its choice ✔.
- **Exercise order:** in presets, compounds come first and isolation later ✔.
- **Problems:**
  - Rest days aren't respected, and rest days sit at the end of the cycle (B7).
  - Level and goal overwrite every exercise (B6).
  - The **fat-loss goal raises reps** (+1/+3). There's no evidence higher reps burn more fat. In a deficit the aim is to keep load, to preserve muscle; energy balance drives fat loss. Keep the hypertrophy ranges.
  - The **Bodyweight preset** ("nothing but the floor") contains "Split Squat with Dumbbells", "Weighted Sissy Squat", pull-ups and chin-ups (these need a bar).
  - The Bro split's Chest day has Reverse Flyes (a rear-delt exercise).
  - The AP preset's "Butt Lift (Bridge) 3 × 30–45" is logged as reps, not seconds.
- **Planned vs performed:** separate in the model ✔, blurred by pre-fill (B8).
- **Equipment:** `S.gear` filters picks and replacements ✔. It's ignored when adopting a preset, apart from the coverage score.

### M2. Progressive overload (13.2)
- **Current:** double progression. If all but one set reach the top of the range and average RPE is ≤ 9, add 2.5 kg (5 kg for heavy lower-body lifts; conservative, standard or aggressive modes). If RPE ≥ 9.5, hold.
  - This is a sound, widely used method for beginner to intermediate hypertrophy training ✔.
- **Gaps:**
  1. **RPE input is fake** (B8), so the RPE gate doesn't work.
  2. **Increment size isn't relative to the exercise:** +2.5 kg on a 10 kg lateral raise is +25%. Use the smallest realistic jump per equipment type (dumbbell 1–2 kg per hand, machine stack step, barbell 2.5 kg) or about 2–5% of load.
  3. **Units:** increments are in kg even for lb users (2.5 kg shows as 5.5 lb).
  4. **Load convention:** dumbbell per hand vs total is undefined, so volume isn't comparable.
  5. **No regression rule:** a missed rep range for 2–3 sessions should suggest holding or reducing 5–10%, or a deload.
  6. **Records by weight only:** rep records at a given weight and e1RM records aren't flagged, though e1RM (Epley, ≤ 12 reps) is computed.
- **What should stay user-controlled:** progression speed (it already is), increments per exercise, and deload timing (suggest, don't force).
- **Data already collected:** weight, reps, RPE (unreliable), warm-up flag, date, planned range.
- **Data missing:** "RPE was actually entered", load convention, increment per exercise.

### M3. Exercise execution (13.3)
- **Available:** start and end photos, primary and secondary muscles, equipment, difficulty, 3 steps (expandable), generic "Tips and common mistakes" by movement pattern, and similar exercises ✔.
- **Problems:**
  - Mistakes are generic per pattern ("Bouncing the weight off the chest" appears for every push, including overhead press).
  - There's no unilateral flag, so logging per side is unclear.
  - No tempo or range-of-motion cue beyond the steps.
  - Safety notes are generic and there's no pain guidance in the logger.
  - The mid-workout screen is good: the photos and prescription are visible. Keep the long text behind ⓘ.

### M4. Experience level (13.4)
Level changes the split score and the set and rep defaults ✔. Suggested additions:
- Beginners should get fewer exercise choices, form-first notes and fixed progression.
- Advanced lifters should get RPE-based load control and weekly volume targets.
- Don't add formulas beyond these.

### M5. Goals (13.5)
Goal changes the split score, rep shift and rest multiplier. Recommended mapping, evidence-based and simple:

| Goal | What should change |
|---|---|
| Strength | Main lift 3–6 reps, 2–4 min rest; accessories keep 6–12 |
| Hypertrophy / gain | 6–12 (up to 15–20 for isolation), 10–20 hard sets per muscle per week, 1–3 min rest |
| Fat loss | Keep hypertrophy or strength loading; the deficit comes from nutrition; optional cardio minutes target |
| General fitness | Full body 2–3×/week plus cardio minutes per week (e.g. a 150 min moderate-activity guideline), steps |
| Endurance and sport | Cardio and sport sessions as the primary log; strength 2×/week maintenance |

### M6. Cardio and sports (13.6)
- **Now:** an activity is an entry whose "sets" carry minutes, km, RPE and kcal. It's recognised by name, with MET-based calories and plannable duration and intensity.
- **Gaps:**
  - No pace or speed (derivable from km and min).
  - No intervals.
  - No heart rate. It could be entered manually: average HR, optional.
  - No per-sport metrics (for example score or minutes played) — optional, later.
- **Architecture:** add `entry.kind` and a typed `performance` object (`{min, km, avgHr, rpe, intervals[]}`), so consumers don't infer the type from names (see K). Needed before adding intervals or pace charts. Phase 3.

### M7. Recovery and readiness (13.7)
Minimum useful set: session RPE (one tap at finish), an optional readiness 1–5 before starting, and rest-day respect (B7). Show them as trends, never scores. Sleep, soreness and energy are optional.

Delete or generalise the unreachable Recovery sheet and its "Ankle pain" field.

### M8. Safety (13.8)
The app makes no medical claims ✔. Add:
- A one-line onboarding note: consult a professional if you have an injury or condition; stop on sharp pain.
- A "this hurt" flag per exercise that offers substitutes and suggests professional evaluation if it repeats.
- A warning when a suggested jump is above about 10%, or a logged load is more than 30% above your previous best (probably a typo).

### M9. Nutrition and training integration (13.9)
- The target is BMR (Mifflin) × activity factor − 500. The activity factor includes training, so exercise calories aren't added, which avoids double counting ✔. The app should state it: "Your target already includes 3 lifts/week".
- **Improvements:**
  - A deficit as a percentage (15–25%) or a rate (0.5–1% of body weight per week).
  - A floor near BMR.
  - Protein 1.6–2.2 g/kg, based on goal or target weight for users with a high BMI.
  - Label every burn figure "estimated".
  - A weekly weight-trend check: expected vs actual change.

### M10. Fitness data model (13.10)

| Entity | Why | Contents | Exists? | When |
|---|---|---|---|---|
| Exercise (stable id) | History integrity, variants | id, name, muscles, equipment, pattern, unilateral, load convention, increment | By name only | Phase 3 |
| Workout template (day) | Planning | exercises with role (main/accessory/timed) and targets | Yes, no role | Phase 2 (role) |
| Workout session | History | date, template id, kind, duration, session RPE, notes | Yes | — |
| Exercise entry | Per-exercise log | exId, kind, planned, performance records | Yes, kind implicit | Phase 3 |
| Set / bout | Performance | strength {w, r, rpe?, wu, src}, timed {s, w?}, activity {min, km, hr, rpe} | Union of fields | Phase 3 |
| Body weight / measurement | Progress | separate lists | Mixed in one list | Later |
| Personal record | Motivation | derived, not stored | Derived ✔ | — |
| Recovery metric | Readiness | readiness 1–5, session RPE | Unreachable sheet | Phase 4 |
| Nutrition day, meal, food | Intake | exists | ✔ | — |

### M11. Intelligence that could run offline (13.11)

| Idea | Data | Local calc | Reliable? | When |
|---|---|---|---|---|
| Weekly hard sets per muscle vs target | sets, muscles | sum per ISO week | Yes | **Now** (already computed, unused) |
| Plateau flag | e1RM per exercise | no gain in 3+ sessions | Yes, if RPE honest | Phase 4 |
| Deload suggestion | plateau + rising RPE | rule | Medium | Phase 4 |
| Typo/outlier guard | previous best | > +30% | Yes | Phase 1 (with validation) |
| Adherence | planned vs done days | count | Yes | Phase 4 |
| Weight trend vs goal | weigh-ins | 7-day mean slope | Yes | Phase 4 |
| Session duration and rest trends | timestamps | mean | Yes | Later |

None of these need an external API or AI.

### M12. Real trainee walkthrough (13.12)

| Moment | Verdict |
|---|---|
| **Before** | Today's workout, duration and exercises are clear. Weak points: a rest day never shows as today (B7); new users may get the personal AP plan. |
| **During** | Fast entry, pre-fill, previous performance column, photos. Friction: the double-tap trap, no undo, fake RPE, replace wipes sets. |
| **Between sets** | A clear rest screen, now gym-friendly. It blocks everything else, and the alarm plays late after the phone was locked. |
| **Between exercises** | Next exercise works. Resume loses your place. |
| **After** | Clear summary (time, volume, sets, one highlight). Edit and delete are available ✔. |
| **Next workout** | Weight suggestion from last time ✔, but its RPE gate is broken. |
| **Week to week** | There's no weekly volume or adherence view, though the data exists. |
| **Month to month** | Progress charts, strength index and records ✔. Could add a plateau flag and a weight-vs-goal trend. |

### M13. Feature gap classification (13.13)

| Capability | Class | Why |
|---|---|---|
| Working backup and restore (file) | **Required** | Local-only data |
| Undo for set changes | **Required** | Mid-workout mistakes |
| Input validation | **Required** | Data integrity |
| Resume position + persisted rest | **Required** | Interrupted workouts are normal |
| Honest RPE | **Required** | Progression depends on it |
| Rest days respected | **Required** | Recovery |
| Weekly volume per muscle | Useful enhancement | Main hypertrophy metric |
| Plateau and deload hints | Useful enhancement | Long-term progress |
| Per-exercise increments, load convention | Useful enhancement | Correct suggestions |
| Pace, intervals, heart rate for cardio | Optional / future | Endurance users |
| Readiness check | Optional / future | Low cost |
| Reminders / notifications | Optional; limited on iOS | Platform |
| Friends / share | Not necessary now | Exists; low value |
| AI coaching | Not necessary | Deterministic rules suffice |

### M14. Architecture for the future (13.14)

| Current | Problem | Future consequence | Direction | When |
|---|---|---|---|---|
| Sets-with-optional-fields | Type from name | Every new activity metric touches every consumer | `entry.kind` + typed performance | Phase 3 |
| Name as identity | Renames and variants break history | Can't reorganise the library | Exercise ids | Phase 3 |
| Logic in click handler | No single mutation path | Undo, validation and sync impossible to guarantee | Action layer | Phase 2 |
| Blob + two IndexedDB stores, no schema version | Silent corruption | Migrations get riskier | `normalize` + versioned migrations | Phase 1 |
| Plan = flat list without roles | Goal logic can't target main lifts | Bad programmes | Exercise role in templates | Phase 2 |
| Rotation ignores rest | Consecutive sessions | Overtraining risk for beginners | Rest-aware scheduler | Phase 2 |

### M15. Fitness report

**A. Already solid:**
- Split recommender with explanations.
- Planned-vs-performed structure.
- Double progression concept.
- Warm-up flag excluded from stats.
- e1RM.
- Activities out of strength statistics.
- Timestamp timer.
- Previous-performance column.
- MET-based estimates labelled as estimates.

**B. Present but needs work:**
- RPE capture.
- Increments.
- Generic cues.
- Records by weight only.
- Nutrition targets.
- The Recovery sheet.

**C. Important missing:**
- Weekly volume per muscle.
- Rest-aware schedule.
- Plateau and deload hints.
- File backup.

**D. Potentially unnecessary:** friends/share snapshots, the Recovery "Ankle pain" field, and the ~14 cardio-machine entries duplicated between the library and new activities.

**E. Programming logic:** B6, B7, the fat-loss rep shift, the Bodyweight preset equipment, a personal plan as the default.

**F. Data model:** name identity, implicit kind, mixed body list, fake RPE.

**G. Workout execution:** B2, B3, B4, B9, B10, B13, B14, B15; load for timed exercises.

**H. Cardio and sports:** no kind field, no pace, intervals or heart rate.

**I. Nutrition and training:** the target basis isn't explained; fixed deficit; no floor.

**J. Progress tracking:** weekly volume unused; weight-only records; no trend vs goal.

**K. Recovery:** rest days, session RPE, optional readiness.

**L. Safety:** onboarding note, pain flag, jump and outlier warnings.

**M. Future:** plateau detection, deload, adherence, weight trend.

**N. Now:** B1–B10, B13–B16, B6–B7, B8.

**O. Later:** exercise ids, typed activities, readiness, intervals and pace, per-exercise increments.

---

## N. Feature gap analysis
See M13 (classification) and M11 (intelligence). The core product is complete enough. What it lacks is the **reliability layer** (backup, undo, validation, resume) and **honest inputs** (RPE, suggestions), not more features.

## O. Technical debt (P3 list)
- History entries grow with every navigation (resetNav).
- Tab scroll offsets are neither reset nor remembered.
- Session date edits don't re-sort history.
- `ex_isTimed(e.name)` on the rest screen.
- The service worker returns `index.html` for failed JS and JSON requests.
- Two textareas below 16 px.
- Untranslated toasts.
- Dead code (weekly sets and related functions, `.wc-*` and `.rt-opt` CSS, the Recovery sheet).
- Similar-exercise back behaviour.
- "End workout" without confirmation.
- lb increments.
- Saved meal goes to the wrong meal.
- Food data: raw chicken breast and shrimp.
- History entries leak.

---

## P. Prioritized implementation plan

### Phase 1: Fix immediately (data safety)

| # | Problem | Fix | Files | Depends on | Test |
|---|---|---|---|---|---|
| 1.1 | B1 restore | Validate `v`/`sessions`/`myPlan`; normalise; preview; file export and import | app.js, sheets.js, state.js | 1.3 | Export → wipe → import: identical session and food counts |
| 1.2 | `storage.persist()` | Request it after onboarding; show the result in Settings | state.js/app.js | — | Chrome: `navigator.storage.persisted()` true |
| 1.3 | B5 corruption | Keep a raw copy; `normalize()` with `DEF` deep merge | util.js, state.js | — | Truncated blob → message, copy kept; partial blob → no throw |
| 1.4 | B2/B3 | Unlog guard of 700 ms; undo toast | app.js | — | Double tap → 1 set; remove → Undo restores it |
| 1.5 | B4 | Replace inserts a new entry when sets exist | actions.js | — | Log 2 → replace → the old entry keeps 2 |
| 1.6 | B13/B14 | Bounds and empty handling in log and edit | app.js | — | -20, 99999, 1000, "" rejected with a message |
| 1.7 | B16 | `storage` listener, re-read or warn | app.js/state.js | 1.3 | Two tabs: the active workout survives |
| 1.8 | Personal default plan | Default to the recommender or Full Body; move AP/Ankle/Football to user data | state.js, splits.js | — | Fresh profile skips setup → generic plan |

### Phase 2: Stabilise architecture
- **2.1** `sessionActions` module: log, unlog, edit, replace, next, jump, finish, discard. Each one validates, mutates, persists and returns undo. The click handler only dispatches. Files: new `js/engine/session.js`, `app.js`. Test: all of W1–W8 again.
- **2.2** Persist workout runtime state (`idx`, `rest`) on `S.active` (B9, B10). Test: log at exercise 3, reload → exercise 3 with the rest remaining.
- **2.3** Exercise roles in templates; fix `buildPlan` (B6). Test: each profile's plan table; the plank stays timed.
- **2.4** Rest-aware scheduling and interleaved preset rest days (B7). Test: Full Body A today → rest tomorrow.
- **2.5** Remove dead code, or wire weekly sets (see 4.1).

### Phase 3: Core functionality
- **3.1** Honest RPE and suggestion markers (B8). Test: log without RPE → stored `rpe` absent; recommendation text changes accordingly.
- **3.2** `entry.kind` + typed performance (activity, timed with optional weight). Fixes load on carries. Migrate old entries by name.
- **3.3** Exercise ids (keep the name as a fallback).
- **3.4** Rest as an in-logger bar. The full-screen alert is kept for the end of the rest.
- **3.5** Zero-set finish confirmation, End-workout undo, sheet cleanup (B15).
- **3.6** Translate the remaining strings.

### Phase 4: Fitness functionality
- **4.1** Weekly hard sets per muscle vs a level target (the code exists).
- **4.2** Per-exercise increments, load convention, lb increments.
- **4.3** Plateau flag → deload suggestion.
- **4.4** Nutrition: percentage deficit, floor, explain the activity factor, weight-trend check.
- **4.5** Safety: onboarding note, pain flag, jump and outlier warning.
- **4.6** Fix the food data (raw chicken breast and shrimp) and presets (Bodyweight, Bro chest, bridge).

### Phase 5: Safari and iPhone hardening
- **5.1** Wake lock re-acquire (B11). Late-alarm suppression and an immediate tick on `visibilitychange` (B12).
- **5.2** Service worker: network timeout race; navigation-only HTML fallback.
- **5.3** Textareas to 16 px.
- **5.4** Run H1–H12 on a device.

### Phase 6: Performance
- **6.1** Create audio on workout start.
- **6.2** Memoise Progress aggregates by session count.
- **6.3** Virtualise or trim Library rows if the device measures above 16 ms.

### Phase 7: Final QA
- Keep the ~30 Playwright scenarios from this audit as a regression suite (`tests/`), run before each merge.
- Plus the H1–H12 manual pass on an iPhone: Safari tab and Home Screen app.

**Order of dependencies:**
- 1.3 before 1.1 and 1.7.
- 2.1 makes 1.4–1.6 permanent. The Phase 1 versions can be small patches first.
- 2.3 before 4.2.
- 3.2 before cardio metrics.

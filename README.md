# Bunyan — training & nutrition tracker

**بنيان** — structure, edifice, something built course by course.

A single-page app. No backend, no accounts, no cost. Everything is stored in your
phone's browser and never leaves the device.

## Put it online (about 10 minutes, free)

1. Create a free GitHub account.
2. Click **New repository**. Name it `bunyan`. Set it to **Public** — GitHub Pages
   only works on free public repos. Nothing sensitive is in the code; your data
   never goes near it.
3. On the repo page choose **Add file → Upload files**, drag in the app files, and
   commit. They are `index.html`, `sw.js`, `manifest.webmanifest`, `exercises.json`,
   `instructions.json`, `foods.json`, `icon-180.png`, `icon-512.png`, `mark.png`,
   `intro.jpg`, **and the whole `js/` folder with its sub-folders intact** — the app is
   ES modules and each one is fetched by its path, so a flattened `js/` will not run.
   That includes `js/vendor/`, which holds the barcode decoder used by iPhones.
   Working folders such as `UI/` and any `.zip` do not belong on the site.
4. Go to **Settings → Pages**. Under Source pick **Deploy from a branch**,
   branch `main`, folder `/ (root)`. Save.
5. Wait two minutes. Your link appears at the top of that page and looks like
   `https://yourname.github.io/bunyan/`.

## Put it on your home screen

Open the link in **Safari** (not Chrome, and not the in-app browser inside
Instagram or WhatsApp — those use separate storage and your data will not follow).
Tap the share icon, then **Add to Home Screen**. You now have an app icon that
opens full screen and works with no signal.

## Back up your data

Profile → Backup and reset → Export a backup. Copy the text into a note or email it to
yourself. If you clear Safari's data, change phones, or delete the home screen app, the
backup is the only way to get your history back. Clearing site data now wipes both
localStorage and IndexedDB, so it is no less important than before.

Once you have five sessions logged, Home reminds you if it has been more than a month
since your last backup. "Not now" hides it for a week. The reminder only clears when a
copy actually succeeds, so dismissing the sheet does not count.

## Profiles and sharing

**Profiles** live on one device. If a friend trains on your phone, give him his own
profile in Profile → Add a profile. Separate log, separate weight, separate everything.
The first profile is the admin and cannot be deleted.

**Share codes** are how you follow a friend on his own phone. He taps
Profile → Share my progress, copies the text, sends it to you. You open
Profile → Friends I follow, paste it, and see his sessions, volume, best lifts and
weight trend, read only.

It is a snapshot, not live sync. He sends a new code when he wants you to see an
update. He never sees your log, and his numbers never touch yours.

**Live sync is not possible without a server.** For your data to reach his phone it
would have to pass through one, which means accounts, passwords, a monthly bill past
the free tier, and you holding someone else's data. The share code gets you most of
the benefit at none of that cost.

## Changing the app later

Edit the file you need under `js/` on GitHub and commit. Then open `sw.js`, bump the
`CACHE` line to the next number (`bunyan-v20` → `bunyan-v21`), and commit that too —
otherwise phones keep serving the cached old version. If you add a **new** module, add
its path to `FILES` in `sw.js` as well.

**Opening `index.html` from your desktop will not work any more.** Browsers refuse to
load ES modules over `file://`. Use the GitHub Pages link, or run any local static
server from the project folder.

## How the code is laid out

No build step, no framework, no dependencies — the browser loads the modules directly.

```
index.html      shell only: styles, empty containers, one <script type="module">
js/
  util.js       ids, dates, escaping, numbers, localStorage. Imports nothing.
  units.js      kg/lb display conversion
  db.js         training history and the food log, in IndexedDB
  scan.js       camera barcode scanning, and the overlay it owns
  state.js      S, profiles, persistence, migration
  data/         exercises.js, splits.js
  engine/       plan.js, formulas.js, nutrition.js
  i18n/         dict.js (the AR dictionary and t), exnames.js (Arabic exercise names)
  ui/           view.js, render.js, actions.js, sheets.js, views/{home,train,session,
                progress,food,profile}.js
  app.js        entry point: event listeners, wiring, boot
```

Four rules hold this together. Each one is a bug that has already happened here:

- **Only `app.js` does anything at import time.** Every other module just declares. Boot
  calls `initState()` explicitly, so startup order is written down rather than being an
  accident of the import graph.
- **Never name a local after something you import.** A parameter called `t` hides the
  translator and the module then looks as though it never needed it. Same for `ex`,
  `day`, `rest`, `val`, `ring`.
- **You cannot assign to an imported binding** — modules are strict and it throws. When
  another module has to replace shared state, the owning module exposes a setter:
  `setS`, `setProfiles`, `setBeeped`, `setLastTick`.
- **The whole `js/` folder ships together and every module is precached.** A missing
  image degrades; a missing module is a blank app.

Modules export only what something else actually imports, so a short export list is
correct rather than an oversight. Two knots were untied on the way in: `util.js` no
longer calls `toast()` (app.js injects the handler through `setStorageErrorHandler`), and
`state.js` no longer calls `render()`.

## Where your data lives

**Settings, your plan, weigh-ins and the current workout** are one JSON blob in
localStorage per profile, at `bunyan:db:<profile>`. It stays a few kilobytes.

**The two things that grow without limit are in IndexedDB**, in database `bunyan`:

| Store | One record per | Key |
| --- | --- | --- |
| `sessions` | logged workout | `<profile>\|<session id>` |
| `days` | date in the food log | `<profile>\|<date>` |

The reason is the write path, not capacity. `saveDB()` runs on every logged set and every
tap in the food log, and it used to serialise the whole profile. At three years of use —
1000 logged days and 550 sessions — that blob is **1.25 MB and takes ~24 ms to
serialise**, on the main thread, between your sets. Now the same save touches **3 KB in
~1 ms**, and writes one small record for the workout or the day that actually changed.

Both are still read straight from memory (`S.sessions`, `S.days`), so every screen stays
synchronous and no view code changed. They load once at boot, just after first paint —
which is why Home can show a streak of zero for a moment on a cold start behind the
intro.

`dayRec(date)` is the only way to get a day's record, so it is also where the date is
marked for writing. It over-approximates deliberately: merely reading a day marks it, and
the cost of that is one spare write of one small record.

**Moving across happens by itself, once, per profile.** Data is written to IndexedDB, read
back and counted, and only then dropped from the blob, which is marked `histIDB` /
`daysIDB`. The two move independently, so one can fall back without the other. Two rules
keep it safe:

- **The migrations merge, they never clear.** Records are keyed by session id and by
  date, so running one twice changes nothing. This matters because data can legitimately
  live in both places at once — log a workout or a meal while IndexedDB is unavailable and
  it lands in the blob while older records sit in IndexedDB. Merging keeps both; clearing
  would have eaten the older ones.
- **Every IndexedDB call may fail, and failure is never fatal.** Private windows, blocked
  storage, and browsers that expose `indexedDB` and then refuse to open it all end in the
  same place: the data stays in the localStorage blob and the app behaves as it did
  before. A write that fails flips that store back to the blob and saves there, so a
  finished workout or a logged meal is never left only in memory.

The database is at version 2. Version 1 had only `sessions`; the upgrade adds `days` and
creates each store only if it is missing, so an existing history is carried across
untouched.

**Backups are unaffected.** The export is `JSON.stringify(S)`, and both live in memory, so
a backup still contains every session and every day. Restoring one replaces both stores as
well as the blob.

Deleting a profile and "Delete everything" clear that profile's records in both stores —
otherwise they would outlive the blob that was supposed to own them.

## The maths

- **Volume** = the sum of weight × reps for every set. Not weight × reps × sets,
  which is only right when every set is identical.
- **Estimated 1RM** = weight × (1 + reps ÷ 30), the Epley formula. Shown only for
  sets of 12 reps or fewer, where it is reasonably accurate.
- **Average RPE** = total RPE ÷ number of sets.
- **Calories from macros** = protein × 4 + carbs × 4 + fat × 9.
- **Remaining macros** = your daily target minus everything in meals you marked
  complete.
- **Maintenance calories** = Mifflin-St Jeor BMR × your activity multiplier.
- **Seven-day weight average** = the mean of your last seven weigh-ins. Use this,
  not the daily number.
- **Progression** fires when every working set reaches the top of its rep range.
- **Warm-up sets** count for nothing. Tap a logged set's number to mark it `W` and it
  drops out of volume, average RPE, personal records, the "last time" column and the
  progression check. The row stays so you can see what you actually did.
- **Supersets** are a shared tag on exercises that sit next to each other in a day. Open
  an exercise in the day editor and pair it with the one below; pair again from the
  second and you have a triset. In a session Bunyan hands you straight to the next
  exercise in the group with no rest, and only starts the timer once the round is done.
  Uneven set counts are fine — an exercise drops out of the rotation once it has had all
  its sets. The group is recomputed from adjacency every time, so reordering a day can
  never leave a superset pointing at exercises that have moved apart.
- **Plates** are worked out greedily from the heaviest plate down, per side, after
  subtracting the bar. If the target cannot be made from standard plates it says so
  rather than rounding silently.

## The food database

`foods.json` holds **501 foods**, every one with an Arabic alias, weighted towards what
is actually eaten in Egypt and the Levant: ful, ta'meya, koshari, molokhia, hawawshi,
mahshi, kofta, fatta, feteer, basbousa, konafa, om ali, sahlab, karkade, sugarcane
juice, and the Gulf and Levantine plates alongside them.

Each entry is per 100 g with a list of real serving sizes, so "3 eggs", "طبق كشري" or
"2 tbsp peanut butter" all resolve to grams without the user thinking about it.

**On the numbers.** These are widely published composition figures, not laboratory
measurements — the same standing as the original entries, which is why the app labels
them as the Bunyan database rather than "verified". They are checked at build time
against Atwater with the fibre correction (protein 4, digestible carbs 4, fibre 2,
fat 9); anything drifting more than 25% is reviewed by hand. Three entries fail that
check and are correct anyway: vinegar and lime get calories from organic acids, and
cocoa powder is an accepted reference anomaly. Plain 4/4/9 is not usable as a gate — it
over-counts leafy vegetables badly enough to bury real typos in the noise.

**If you extend it**, keep ids unique, give every food at least one serving size and an
Arabic alias, and re-run the build check. The generator and its batches live outside the
repo; the shipped file is plain JSON and can be edited directly.

## Barcodes

Food → Log fuel has **Enter barcode** always, and **Scan barcode** on browsers that can
decode one. Both run the same lookup, in this order:

1. **Your own foods**, matched on the barcode you saved with them.
2. **Products you have scanned before**, cached in `S.barcodes`. No network.
3. **Open Food Facts**, by barcode — the same keyless, CORS-enabled service the online
   name search already used, with the same six-second timeout and the same distinction
   between "not in the database" and "could not reach it".

If nothing has it, you get manual entry with the barcode already attached. Save that to
My Foods and **the same packet scans locally forever after**, offline. That is the point
of the ordering: scanning teaches this device rather than depending on a service.

The cache is capped at 200 products, oldest evicted. My Foods is never evicted — that is
your data, not a cache.

### Two decoders, one interface

`BarcodeDetector` is built into the browser and costs nothing to use, but it only exists
in Chrome on Android, ChromeOS and macOS — not Windows Chrome, not Firefox, and **not iOS
Safari**, which is this app's main target. So there is a second path:

| | Decoder | Cost |
| --- | --- | --- |
| Native `BarcodeDetector` | the browser's own | nothing downloaded |
| Everywhere else | ZXing, vendored at `js/vendor/zxing.min.js` | 328 KB, once |

ZXing is **fetched on first use, not precached**. A browser with the native detector never
downloads it at all, and the service worker's cache-first handler keeps it after the first
fetch — the same treatment `instructions.json` gets, and for the same reason. The cost of
that choice is that the very first scan on a new iPhone needs a connection; every scan
after it does not.

`js/scan.js` picks between them at run time, so both produce the same thing: a frame in,
digits out. Loading the decoder and opening the camera are **deliberately sequential** —
run together, a camera that resolves after the decoder has already failed leaves a stream
nobody owns and a light nobody turns off.

ZXing is vendored unmodified under the **Apache Licence 2.0**; the full text sits beside it
in `js/vendor/zxing-LICENSE.txt`. It is the only third-party code in the project.

Scanning needs a secure context, which GitHub Pages gives you.

`scan.js` builds its overlay outside `#app` and `#sheet` and owns it directly, because
`render()` replaces their `innerHTML` and would tear a live `<video>` out of the DOM
mid-stream. Every exit — a code found, cancel, an error, the tab hidden, the page going
away — runs through one idempotent `stopScan()`, so the camera is never left on.

## Language and units

The interface is fully bilingual. Every user-facing string goes through `t()` and has an
entry in the `AR` dictionary at the top of the script, and the layout flips to RTL with
the language. **If you add a string, add its `AR` entry in the same commit** — `t()`
falls back to the English key, so a missing entry is silent.

**Exercise names** are translated by composition rather than by phrase. The 873 names
are built from roughly 350 terms, so `EX_TERMS` translates the terms and `exAr()`
assembles the name the way it is said in a gym: movement first, modifiers after it,
equipment last behind `بالـ`. "Barbell Bench Press" becomes "بنش بريس بالبار",
"Standing Calf Raises" becomes "رفع سمانة واقف".

That covers **86%** of the library completely. The rest are proper nouns — Conan's
Wheel, Carioca, Renegade Row — which stay in Latin script deliberately; inventing
Arabic for them would read worse than leaving them. It also means an exercise you add
yourself is translated without anyone touching a table.

**The English name is always the key.** Lookups, favourites, session entries and the
strength-chart `<option value>` all stay English; only what the user reads is
translated. If you add a display site, wrap it in `exName()`, never the data.

Weights are **always stored in kilograms**. The kg/lb preference changes what is shown
and how typed input is read, nothing else — so switching units re-displays your history
rather than rewriting it. Convert at the edges with `toDisp()` and `toKg()`; never
convert anything on its way into storage.

## The identity

**Bunyan (بنيان)** means a structure or edifice — something built deliberately, course
upon course.

The mark is the **horse and the sword**: a horse's head in profile, mane swept back,
with a straight sword standing beside it. Together they read as an angular **N**. It is
ancient-Arabian in feeling — warrior, mount, blade — without being religious, and it
survives being shrunk to a home screen icon.

Two earlier directions were tried and **abandoned**: a gold stepped-arch mark, and a
stone-monolith splash. Neither is used anywhere. If you find a gold arch SVG or a
`splash.jpg` in an old copy of this folder, it is dead weight — delete it.

### Assets

| File | What it is |
| --- | --- |
| `mark.png` | The horse and sword, red on transparent. In-app header and the intro |
| `icon-180.png`, `icon-512.png` | The same mark on `#0D0D0D`, for the home screen |
| `intro.jpg` | The intro artwork: a rider with a raised sword on a rearing horse, both in near-silhouette, an ember glow behind them |

The intro degrades gracefully — if `intro.jpg` is missing the composition still holds on
the ember glow alone, so a missing file never shows a broken screen.

### Palette

The CSS custom properties at the top of `index.html` are the source of truth. In short:

| Role | Colour | Use |
| --- | --- | --- |
| Ground | `#0A0A0C` | The base of the whole interface |
| Surface / Raised | `#141418` / `#1C1C22` | Cards and controls |
| Bone | `#F0EDE8` | Text. Warmer and easier on the eye than white |
| Accent | `#C41E2A` → `#E02534` | The action colour, and the brand |
| Green | `#2E7D32` | Completed states only — a logged set, a finished meal |
| Brass | `#C9A227` | Personal records and earned progression only. Never decoration |

Brass is reserved. If everything is gold, nothing is.

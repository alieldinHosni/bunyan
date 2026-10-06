# Credits

Every dataset, library, font and borrowed idea in Bunyan: what it is, where it came
from, its licence, and what Bunyan uses it for. Kept up to date with each change that
adds one (see `COACHING-INTELLIGENCE.md`, Phase 0).

## Data

| What | Source | Licence | Used for |
| --- | --- | --- | --- |
| **Exercise library** — 876 exercises with muscles, equipment, level and steps, and two photographs each for all but the three newest (Kettlebell Halo, Halo with Overhead Extension, Overhead Triceps Extension), which upstream has not photographed yet | [free-exercise-db](https://github.com/yuhonas/free-exercise-db) by yuhonas | Unlicense (public domain) | `exercises.json`, `instructions.json`; photos loaded from the repository through jsDelivr. Bunyan adds Arabic names and its own extra exercises (`js/data/extra.js`). |
| **MET values** for cardio, sports and classes | Compendium of Physical Activities (Herrmann, Willis, Ainsworth et al., 2024 adult edition) | Free to use with citation | `js/data/activities.js`: calories burned by activities. |
| **Food composition** — 568 foods per 100 g | Widely published composition figures, compiled for Bunyan and checked against Atwater energy (see README, "The food database") | Bunyan's own compilation | `foods.json`. Not a copy of any one database. USDA FoodData Central (CC0) is the intended reference for checking it. |
| **Powerlifting results**: raw squat, bench press and deadlift percentiles by sex and IPF weight class | [OpenPowerlifting](https://www.openpowerlifting.org) meet results ([opl-data](https://gitlab.com/openpowerlifting/opl-data), `meet-data/`) | Public domain (the project's `LICENSE-DATA`). Their code is AGPL-3; none of it is used | `js/coach/powerlifting.js`, built by `tools/opl-percentiles.py` from the published CSV files: the "Among powerlifters" card in Progress. This page uses data from the OpenPowerlifting project, https://www.openpowerlifting.org. You may download a copy of the data at https://gitlab.com/openpowerlifting/opl-data. |
| **Barcode lookups**, when online | Open Food Facts | ODbL (database), content per product | Optional, only when the user scans a barcode not already saved; results are remembered on the phone. |

## Formulas and published methods

| What | Source | Used for |
| --- | --- | --- |
| Resting energy | Mifflin–St Jeor equation (1990) | `bmr()` in `js/engine/formulas.js` |
| Estimated one-rep max | Epley formula, capped at 12 reps | `e1RM()` in `js/engine/formulas.js` |
| Protein 1.6–2.2 g/kg | Morton et al. 2018 meta-analysis and the ISSN position stands | `js/data/goals.js` |
| Weekly sets per muscle as ranges | Practitioner heuristics in the style of Renaissance Periodization's published volume landmarks, cross-checked against Schoenfeld et al. 2017 on weekly volume | `js/engine/volume.js` — shown in the app as a starting point, not a rule |
| Reps in reserve | Zourdos et al. 2016, the RIR-based RPE scale | effort targets in generated plans |
| Energy in food | Atwater factors with the fibre correction | the build-time check on `foods.json` |

## Ideas learned from other apps (no code taken)

| Idea | Learned from | Its licence | In Bunyan |
| --- | --- | --- | --- |
| Progression as a named rule per exercise, not one rule for all | Liftosaur | AGPL-3 | Planned (see `EVALUATION.md`); will be written from the idea only. |
| Volume read per muscle, week by week, against landmarks | MyFit (after Renaissance Periodization) | AGPL-3 | The coaching engine's weekly volume (`js/coach/volume.js`), written from the idea only. |
| Per-week change rules, diet flags and per-item sources for foods | wger | AGPL-3 code, CC data | Planned; no wger code or data is used. |
| Three-step builder: equipment, muscles, exercises; body-map muscle picker | workout-cool | MIT | Read for its flow; nothing used yet. |

## Libraries

| What | Licence | Used for |
| --- | --- | --- |
| [pdf.js](https://github.com/mozilla/pdf.js) (Mozilla) | Apache-2.0 — `js/vendor/pdfjs/LICENSE.txt` | Reading plan PDFs on the phone |
| [ZXing for JS](https://github.com/zxing-js/library) 0.21.3 | Apache-2.0 — `js/vendor/zxing-LICENSE.txt` | Barcode scanning where the browser has no detector |

## Fonts

| Font | Licence | Used for |
| --- | --- | --- |
| Manrope | SIL Open Font Licence — `fonts/OFL-Manrope.txt` | Body text |
| Outfit | SIL Open Font Licence — `fonts/OFL-Outfit.txt` | Headings and numbers |

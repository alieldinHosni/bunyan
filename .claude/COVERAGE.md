# Bunyan — knowledge-base coverage report

Spec §7. Written 20 Oct, when extraction finished. This report is for a person to check completeness, not for the extractor to assert it.

- **Detail lives in:** `.claude/INGESTION-LOG.md` (ledger, extraction log, residual log, open questions, refused list).
- **How facts are counted:** by `tools/count-facts.sh`. Every quoted value and bare number is one fact. `src`, `id`, `topic` and `agentReading` are not counted. It is a proxy that makes thin sections stand out, not a measure of truth.
- **Book titles** are not repeated here; the ledger names the files.

## 1. Page accounting

| Source | Pages | Extracted | Approved skip (not extracted) | Read as checklist | Duplicate |
|---|---|---|---|---|---|
| Textbook | 999 | 916 | 59 | — | 24 |
| Study guide | 68 | — | — | 68 | — |
| Study-guide copies | 136 | — | — | — | 136 |
| Handouts and forms | 36 | 26 | 1 | 7 | 2 |
| **All** | **1,239** | **942** | **60** | **75** | **162** |

**Sum:** 942 + 60 + 75 + 162 = **1,239**, the total page count of every file in `source/`. The textbook ledger rows were re-summed by script on 20 Oct: 999.

- **Textbook "extracted" (916)** includes 12.6 and 13.4: approved-skip summaries that were read as checklists and yielded facts. Other summaries (3.5, 6.5, 7.7, 8.5, 11.6) were also read as checklists but are counted under approved skips.
- **Approved skips (59)** are chapter 2 (business), learning-objective pages and similar, all approved by the owner.
- **Refused pages:** none. Refusals are per item (figures, tables as tables), not per page. See §5.

**Missing from `source/` entirely, so not counted and not filled** (ledger gap list 1–10):
- Gap 1: chapter 20 lessons 11–12.
- Gaps 2 and 5: everything after p999 — the end of 23.7, the chapter 23 summary, the appendices.

**Present but incomplete pages:**
- Gap 6: the 12.4 performance tests.
- Gap 7: cardio stage 5.
- Gap 8: SAQ cone-drill instructions.
- Gap 9: chapter 21 synopsis tables and two goal plans. The tables were recovered from the study guide.
- Gap 10: the 22.1 free-weight and cable sections. Partly recovered from the study guide.

## 2. Fact counts per knowledge file

**11,402 facts in 22 files** (601 KB, uncompressed).

| File | Facts |
|---|---|
| `nutrition-principles.js` | 1611 |
| `anatomy.js` | 1288 |
| `conditions.js` | 1149 |
| `assessments.js` | 1149 |
| `adherence.js` | 1046 |
| `supplements.js` | 910 |
| `phases.js` | 900 |
| `acute-variables.js` | 641 |
| `corrective.js` | 461 |
| `cardio.js` | 351 |
| `modalities.js` | 332 |
| `core.js` | 301 |
| `imbalances.js` | 230 |
| `scope.js` | 214 |
| `saq.js` | 198 |
| `balance.js` | 196 |
| `plyometrics.js` | 153 |
| `cues.js` | 96 |
| `glossary.js` | 59 |
| `injuries.js` | 56 |
| `epidemiology.js` | 35 |
| `residual.js` | 26 |

## 3. Pass-two yield — honest reading

- **In-section pass two:** after each section's first pass, the section was re-read for missed facts. This found **close to zero** new facts almost everywhere: 0 new is the logged result for nearly every section. The spec warns that near-zero across the board means pass two was not done properly. It cannot be ruled out here, so treat it as a real weakness of the in-section pass.
- **The effective second pass was the study-guide cross-check.** Each chapter's study-guide recap was checked independently against the knowledge base after extraction. It yielded **180 facts** (`src:"SG.*"`). Most came from 4 (20), 7 (10), 21 (58: the phase synopsis tables missing from the textbook) and 22 (29).
- **Handouts** added **217** facts (`src:"H.*"`).
- **The five-section random re-read (§8)** found **2 small gaps in 5 sections**, about 1 missed fact per 2–3 sections of 5–14 pages. Extrapolated, roughly 50–60 small facts may still be missing across the book. They would be single statements, not tables or prescriptions.

## 4. Residual facts

**10 remain** in `residual.js`: `safety-cautions` 4, `supplement-history` 3, `nutrition` 2, `weight-management` 1.

| Topic | Peak entries | Became |
|---|---|---|
| chronic-conditions | 12 | `conditions.js` (OVERVIEW) |
| definitions | 15 | `glossary.js` |
| epidemiology | 17 | `epidemiology.js` |
| injury-regions | 6 | `injuries.js` |
| professional-conduct | 6 | `scope.js` conduct rules (`business:true`) |

- Fact totals per section were re-verified after each move; they were unchanged.
- The four remaining `safety-cautions` are each now also covered by a schema (SMR contraindications, Valsalva rules, inhalers in `conditions.js`).

**New schemas beyond the spec's eight files**, each logged with its reason: `adherence.js` and `scope.js` (owner-approved), `supplements.js`, `cardio.js`, `core.js`, `balance.js`, `plyometrics.js`, `saq.js`, `modalities.js`, `conditions.js`, `glossary.js`, `epidemiology.js` and `injuries.js`.

## 5. Refused extractions

The full itemised list is in the log ("Refused extractions"). By kind:

- **Every figure and photo** (anatomy illustrations, exercise photos, product photos, charts, graphs). None is in the repo. Where a figure's content is also in the text, it was captured from the text.
- **Tables as tables.** Every table was modelled as data with reworded examples, never reproduced. Column-mixed tables were rebuilt from layout extraction, about 15 times.
- **Content trapped in images:**
  - Figure 11-3, the exercise-test termination criteria — a **safety gap**, open question 20.
  - Table 11-10, the Durnin-Womersley lookup.
  - The push/pull start positions (12.3).
- **Verbatim and expressive material:** analogies, mnemonics, puns and study scenarios.
- **Brand names:** products are generalised (e.g. "half-dome trainer"). No brand names are in app data.
- **Instruments:** the PAR-Q+ questions (only its decision logic is modelled) and the 1RM chart (reduced to its exact formula).
- **Removed on the owner's instruction:**
  - All performance-steroid content (10.4).
  - All alcohol content: 15 mentions across 6 files, and open question 17 withdrawn.
  - Two *medical* corticosteroid mentions remain as see-a-doctor flags (open question 23).

## 6. Thin sections

These have the lowest facts per page among extracted sections. All but one are photo-heavy exercise lessons, where most pages are photos, captions and video links. That explains them, but it is worth an owner spot-check:

| Section | Pages | Facts | Facts/page | Why |
|---|---|---|---|---|
| 13.4 | 2 | 1 | 0.5 | summary lesson, read as a checklist |
| 20.7 | 12 | 16 | 1.3 | total-body exercise photos |
| 17.4 | 27 | 42 | 1.6 | balance exercise photos |
| 18.3 | 23 | 44 | 1.9 | plyometric exercise photos |
| 14.6 | 17 | 37 | 2.2 | active stretches repeat the static positions (stored as references, not duplicated) |
| 20.13 | 15 | 38 | 2.5 | leg exercise photos |
| 20.9 | 7 | 20 | 2.9 | back exercise photos |
| 22.1 | 4 | 12 | 3.0 | free-weight and cable sections missing (gap 10) |

For comparison, text lessons run 10–30 facts per page.

## 7. Open questions for the owner

Full text is in the log. Still needing a decision or awareness:

- **16 — Calorie equation:** all prediction equations tend to underestimate RMR. Mifflin-St Jeor is kept; targets are labelled as estimates.
- **18 — Water default:** 3,000 mL vs the source's 2.7 L (women) / 3.7 L (men).
- **19 — Gain target:** TDEE +250 vs the source's +350–500.
- **20 — Termination criteria:** exercise-test termination criteria exist only as an image. **No exertion test should ship until they come from a readable source.**
- **21 — Plan engine:** `plan.js` "Get stronger" and "Lose fat" numbers are lighter than Table 20-3.
- **22 — 1RM:** the source chart is load ÷ (1 − 0.025 × reps); Bunyan's Epley reads up to ~2% higher below 10 reps.
- **23 — Medical steroids:** two corticosteroid mentions kept as safety flags.
- **15 — Library observations:** tag issues (hammer curls, hyperextension pattern, Cable Hip Adduction), plus library entries the book argues against (straight-leg toe touch, behind-the-neck pulldown, lumbar and neck SMR). Also in `tools/name-reconciliation.json` → `cautions`.
- **2 — A complete textbook copy** would close gaps 1, 2 and 5.

Resolved, withdrawn or informational: 1, 3–14, 17.

## 8. Five-section random re-read

Sections were drawn at random from the 131 extracted textbook sections (`shuf` with a fixed seed, so the draw is reproducible). Each was re-read cold from the PDF and checked item by item against the knowledge files.

| Section | Pages | What was checked | Missing | Fixed |
|---|---|---|---|---|
| 5.2 Skeletal system | 14 | bone counts, remodelling cells, Wolff's law, weight-bearing tip, 5 bone types, long-bone structures, youth growth-plate myth, markings, vertebral segments, discs, neutral spine, 3 curves | none | — |
| 5.3 Joints | 7 | roll, slide, spin; synovial structures and fluid; 6 synovial types with examples; non-synovial; joint functions; ligaments (collagen, elastin, ACL); growth plate; peak bone mass ages; 30–50 plateau; exercise recommendation | none | — |
| 9.8 Goal-based nutrition | 9 | scope line, deficit routes, drastic-deficit risks, 500 kcal deficit, all 7 food swaps, portion guides, EAT limits, NEAT examples, three protein findings (unmerged), cautions, surplus 350–500, protein, carbohydrate, fat and per-meal ranges, meal frequency, anabolic window | none | — |
| 11.3 Heart rate and BP | 5 | RHR as indicator, morning timing, radial vs carotid (vagus), BP definition, SBP and DBP, age-dependent mortality predictor, Table 11-1 with actions, measurement steps, arm-discrepancy referral | **1** — the general rule that a pulse can be felt wherever an artery crosses a bone or joint | yes — `assessments.js` `pulseSites` |
| 23.6 Cancer, pregnancy | 7 | lifetime incidence, treatment effects, Tables 23-19 to 23-22, SMR during chemo or radiation, trimesters, contraindications, high-risk list, positions after 12 weeks, stop signs, postpartum | **1** — pregnancy assessments use seated and standing versions where applicable | yes — `conditions.js` `pregnancy.assessments` |

**Result: 2 gaps in 5 sections, both single statements, both now fixed.** No table, prescription or safety rule was missing in the sample. This is consistent with §3: extraction is thorough on structured content, and the residual risk is isolated one-sentence facts.

## 9. Other acceptance checks

- **No images:** no book image exists anywhere in the repo. Nothing was ever written from `source/` except text-derived data; `source/` is in `.gitignore`.
- **Leaf data:** `js/knowledge/` has no imports, DOM access or network calls (grep verified).
- **Diagrams:** the UML shows no cycles (`docs/uml.md`). The ERD answers "findings → corrective exercises, order, parameters" (`docs/erd.md`). All 6 diagrams render (`tools/check-mermaid.html`).
- **Granularity:** per-phase, per-population and per-level values are kept separate. Where tables in the same source disagree, both values are recorded with a confidence, never averaged (e.g. older-adult Tables 23-3 vs 23-4, dynamic-stretch reps).
- **Exercise library:** untouched. 873 entries. Zero renames applied.
- **Name reconciliation:** the muscle-group validation ran — 56 rows, 1 flag (`tools/name-reconciliation.json`). 3 random renames hand-checked against the book: all correct.
- **Vocabulary checks:** `tools/check-muscles.html` and `tools/check-cues.html` pass. 59 muscles mapped; 51 exercises cued.
- **No new UI.** The app is unchanged and still fully offline.
- **Not done here, outside this session's scope:**
  - §3.2 new exercises and §3.3 images.
  - §5 coaching-engine wiring.
  - Arabic `t()` entries for cues.
  - `CREDITS.md` (no new images were added).

## Appendix — facts per source section

Textbook sections (`N.N`), study-guide checklists (`SG.N`) and handouts (`H.*`). Pages from the ledger.

| Section | Pages | Facts | Facts/page |
|---|---|---|---|
| 1.3 | 10 | 217 | 21.7 |
| 1.4 | 3 | 56 | 18.7 |
| 1.6 | 3 | 85 | 28.3 |
| 3.1 | 7 | 145 | 20.7 |
| 3.2 | 5 | 116 | 23.2 |
| 3.3 | 10 | 181 | 18.1 |
| 3.4 | 5 | 78 | 15.6 |
| 3.5 | 1 | 3 | 3.0 |
| 4.1 | 7 | 85 | 12.1 |
| 4.2 | 5 | 75 | 15.0 |
| 4.3 | 5 | 90 | 18.0 |
| 4.4 | 4 | 52 | 13.0 |
| 4.5 | 11 | 186 | 16.9 |
| 4.6 | 3 | 66 | 22.0 |
| 5.1 | 15 | 116 | 7.7 |
| 5.2 | 14 | 125 | 8.9 |
| 5.3 | 7 | 78 | 11.1 |
| 5.4 | 13 | 128 | 9.8 |
| 6.1 | 13 | 149 | 11.5 |
| 6.2 | 8 | 105 | 13.1 |
| 6.3 | 9 | 150 | 16.7 |
| 6.4 | 5 | 77 | 15.4 |
| 6.5 | 2 | 13 | 6.5 |
| 7.1 | 6 | 41 | 6.8 |
| 7.2 | 8 | 84 | 10.5 |
| 7.3 | 7 | 50 | 7.1 |
| 7.4 | 5 | 90 | 18.0 |
| 7.5 | 14 | 143 | 10.2 |
| 7.6 | 5 | 68 | 13.6 |
| 7.7 | 1 | 5 | 5.0 |
| 8.1 | 6 | 78 | 13.0 |
| 8.2 | 6 | 79 | 13.2 |
| 8.3 | 6 | 85 | 14.2 |
| 8.4 | 4 | 67 | 16.8 |
| 8.5 | 1 | 6 | 6.0 |
| 9.1 | 9 | 81 | 9.0 |
| 9.2 | 10 | 206 | 20.6 |
| 9.3 | 8 | 142 | 17.8 |
| 9.4 | 7 | 122 | 17.4 |
| 9.5 | 14 | 325 | 23.2 |
| 9.6 | 5 | 83 | 16.6 |
| 9.7 | 8 | 119 | 14.9 |
| 9.8 | 9 | 172 | 19.1 |
| 10.1 | 4 | 63 | 15.8 |
| 10.2 | 11 | 292 | 26.5 |
| 10.3 | 11 | 352 | 32.0 |
| 10.4 | 12 | 210 | 17.5 |
| 11.1 | 10 | 145 | 14.5 |
| 11.2 | 4 | 25 | 6.2 |
| 11.3 | 5 | 49 | 9.8 |
| 11.4 | 15 | 157 | 10.5 |
| 11.5 | 13 | 371 | 28.5 |
| 11.6 | 1 | 5 | 5.0 |
| 12.1 | 3 | 18 | 6.0 |
| 12.2 | 5 | 116 | 23.2 |
| 12.3 | 19 | 192 | 10.1 |
| 12.4 | 5 | 70 | 14.0 |
| 12.5 | 7 | 66 | 9.4 |
| 12.6 | 2 | 9 | 4.5 |
| 13.1 | 9 | 69 | 7.7 |
| 13.2 | 5 | 68 | 13.6 |
| 13.3 | 5 | 106 | 21.2 |
| 13.4 | 2 | 1 | 0.5 |
| 14.1 | 5 | 37 | 7.4 |
| 14.2 | 7 | 71 | 10.1 |
| 14.3 | 3 | 28 | 9.3 |
| 14.4 | 12 | 106 | 8.8 |
| 14.5 | 17 | 99 | 5.8 |
| 14.6 | 17 | 37 | 2.2 |
| 14.7 | 19 | 76 | 4.0 |
| 15.1 | 3 | 13 | 4.3 |
| 15.2 | 13 | 92 | 7.1 |
| 15.3 | 4 | 76 | 19.0 |
| 15.4 | 9 | 142 | 15.8 |
| 15.5 | 2 | 24 | 12.0 |
| 16.1 | 9 | 53 | 5.9 |
| 16.2 | 9 | 72 | 8.0 |
| 16.3 | 5 | 112 | 22.4 |
| 16.4 | 23 | 89 | 3.9 |
| 17.1 | 4 | 23 | 5.8 |
| 17.2 | 6 | 59 | 9.8 |
| 17.3 | 5 | 77 | 15.4 |
| 17.4 | 27 | 42 | 1.6 |
| 18.1 | 6 | 48 | 8.0 |
| 18.2 | 4 | 77 | 19.2 |
| 18.3 | 23 | 44 | 1.9 |
| 19.1 | 6 | 46 | 7.7 |
| 19.2 | 6 | 106 | 17.7 |
| 19.3 | 4 | 44 | 11.0 |
| 20.1 | 8 | 70 | 8.8 |
| 20.2 | 4 | 43 | 10.8 |
| 20.3 | 9 | 138 | 15.3 |
| 20.4 | 11 | 160 | 14.5 |
| 20.5 | 6 | 37 | 6.2 |
| 20.6 | 6 | 75 | 12.5 |
| 20.7 | 12 | 16 | 1.3 |
| 20.8 | 6 | 22 | 3.7 |
| 20.9 | 7 | 20 | 2.9 |
| 20.10 | 8 | 27 | 3.4 |
| 20.13 | 15 | 38 | 2.5 |
| 21.1 | 9 | 60 | 6.7 |
| 21.2 | 5 | 64 | 12.8 |
| 21.3 | 12 | 189 | 15.8 |
| 21.4 | 8 | 120 | 15.0 |
| 21.5 | 3 | 31 | 10.3 |
| 21.6 | 1 | 18 | 18.0 |
| 22.1 | 4 | 12 | 3.0 |
| 22.2 | 9 | 56 | 6.2 |
| 22.3 | 8 | 66 | 8.2 |
| 22.4 | 3 | 43 | 14.3 |
| 22.5 | 6 | 59 | 9.8 |
| 22.6 | 5 | 67 | 13.4 |
| 23.1 | 12 | 178 | 14.8 |
| 23.2 | 8 | 112 | 14.0 |
| 23.3 | 6 | 92 | 15.3 |
| 23.4 | 10 | 184 | 18.4 |
| 23.5 | 7 | 171 | 24.4 |
| 23.6 | 7 | 188 | 26.9 |
| 23.7 | 7 | 150 | 21.4 |
| H.1RM | — | 19 | — |
| H.forms | — | 1 | — |
| H.lifestyle | — | 8 | — |
| H.parq | — | 44 | — |
| H.programs | — | 129 | — |
| H.templates | — | 16 | — |
| SG.1 | — | 6 | — |
| SG.3 | — | 6 | — |
| SG.4 | — | 20 | — |
| SG.5 | — | 5 | — |
| SG.6 | — | 8 | — |
| SG.7 | — | 10 | — |
| SG.8 | — | 9 | — |
| SG.9 | — | 4 | — |
| SG.10 | — | 8 | — |
| SG.11 | — | 1 | — |
| SG.12 | — | 1 | — |
| SG.14 | — | 6 | — |
| SG.15 | — | 4 | — |
| SG.16 | — | 1 | — |
| SG.17 | — | 1 | — |
| SG.18 | — | 1 | — |
| SG.19 | — | 2 | — |
| SG.21 | — | 58 | — |
| SG.22 | — | 29 | — |

# Bunyan — module structure (UML)

What each module exports, what it depends on, and the direction of every dependency. Exports are copied from the files' `export {…}` lines (generated 20 Oct).

**The rule this diagram proves:** `js/knowledge/` depends on nothing. Every knowledge module has zero imports, no DOM access and no network calls (checked by `grep` for `import`, `fetch(`, `document.`, `window.`, `localStorage`: no matches). Cross-references between knowledge files are strings in comments and fields (e.g. `"see anatomy.js MUSCLE_MAP"`), not imports. So there are no arrows between them and no cycles are possible.

```mermaid
classDiagram
    direction LR

    class UI["js/ui (views)"]
    class Coach["js/coach (on GitHub main; 13 modules)"] {
      autoreg; block; energy; fatigue; insights; intent
      landmarks; percentile; powerlifting; strength; util; volume; weakpoints
    }
    class Engine["js/engine"] {
      formulas.js
      plan.js
      nutrition.js
      stats.js
      text.js
    }
    class State["js/state.js"]
    class Data["js/data + exercises.json"]

    class phases { meta; PRINCIPLES; COMPONENTS; LEVELS; PHASES; PROGRESSION; PERIODIZATION; PHASE_SUMMARY; TEMPLATE; MOVEMENT_PATTERNS; PHASE_VARIABLES; PHASE_VARIABLES_NOTE; SAMPLE_SESSIONS; GOAL_PLANS }
    class acuteVariables["acute-variables"] { meta; PRINCIPLES; ADAPTATIONS; VARIABLES; BY_ADAPTATION; SYSTEMS; SAFETY; GUIDELINES; EXERCISES; ONE_RM }
    class imbalances { meta; BASICS; PATTERNS; MOVEMENT_FAULTS; CAUSES; INJURY_EFFECTS }
    class corrective { meta; FLEXIBILITY; DYSFUNCTION; RATIONALE; SEQUENCE; SEQUENCE_NOTE; SEQUENCE_RULES; TECHNIQUES; COMBINING; CONTROVERSIAL }
    class assessments { meta; SCREENING; PROTOCOL; ASSESSMENTS }
    class anatomy { meta; MUSCLE_MAP; …17 more }
    class cues { meta; CUES }
    class scope { meta; RULES }
    class conditions { meta; OVERVIEW; INTRO; POPULATIONS; CONDITIONS }
    class nutritionPrinciples["nutrition-principles"] { meta; …14 exports }
    class supplements { meta; …8 exports }
    class adherence { meta; …21 exports }
    class cardio { meta; …11 exports }
    class core { meta; BASICS; RATIONALE; ACTIVATION; GUIDELINES; PROGRESSION; CHECKPOINTS; EXERCISES }
    class balance { meta; BASICS; RATIONALE; GUIDELINES; PROGRESSION; EXERCISES }
    class plyometrics { meta; BASICS; RATIONALE; GUIDELINES; PROGRESSION; EXERCISES }
    class saq { meta; BASICS; POPULATIONS; PROGRAM }
    class modalities { meta; RULES; RESISTANCE; PROPRIOCEPTIVE; TECH }
    class injuries { meta; REGIONS }
    class glossary { meta; GLOSSARY }
    class epidemiology { meta; STATS }
    class residual { meta; RESIDUAL }

    UI --> Coach : reads (sheets, chat, pcheck, coachwords)
    UI --> Engine : reads
    UI --> State : reads / writes
    Engine --> Coach : reads (blocks, coachinfo, energy, lifts, volume)
    Engine --> State : reads
    Engine --> Data : reads
    Coach ..> phases : reads
    Coach ..> acuteVariables : reads
    Coach ..> imbalances : reads
    Coach ..> corrective : reads
    Coach ..> assessments : reads
    Coach ..> anatomy : reads
    Coach ..> cues : reads
    Coach ..> scope : reads
    Coach ..> conditions : reads
    Coach ..> nutritionPrinciples : reads
    Coach ..> core : reads
    Coach ..> balance : reads
    Coach ..> plyometrics : reads
    Coach ..> cardio : reads
```

## Today vs planned

- **Today (GitHub `main`, checked in a clone on 20 Oct):** `js/coach/` exists with 13 modules. They import only each other: `insights` → fatigue, strength, autoreg, volume, weakpoints; `percentile` → powerlifting, weakpoints; `block` and `volume` → landmarks; most → util. There are no cycles. `js/engine/` (blocks, coachinfo, energy, lifts, volume) and the UI (sheets, chat, pcheck, coachwords) import `js/coach/`. **Nothing imports `js/knowledge/` yet.**
- **Planned:** `js/coach/` imports knowledge modules lazily with dynamic `import()` the first time a coaching feature opens. The dotted arrows above are those planned reads. Arrows still only point down: UI → engine → coach → knowledge. Knowledge points at nothing.
- **Note:** this folder (Downloads\Bunyan) predates `js/coach/`. The knowledge base was built here and is being imported into the repo on a branch.

## Weight

- Knowledge files: **600,833 bytes** (22 files, uncompressed).
- Nothing in the app loads them yet, so today's app weight is unchanged. Once wired, load per feature (e.g. only `corrective.js` + `imbalances.js` + `cues.js` for a corrective block), never all 22 at start-up.

# BUNYAN — Knowledge Base Ingestion

**Use the ponytail skill at `full` intensity.**
**Read `.claude/PROGRESS.md` first.**
**This is a long, multi-session task. Section 0.3 explains how to survive a session limit.
Read it before starting.**

Certification textbooks have been uploaded. The objective is to lift their **methodology**
into Bunyan's knowledge base so the app coaches like a qualified trainer, and to reconcile
the exercise library against their naming and cueing.

---

## 0. Ground rules — read all three before touching a file

### 0.1 What may be extracted, and what may not

Bunyan is published on public GitHub Pages. That makes this a real constraint, not a
formality.

**Extract freely — facts, systems and procedures are not copyrightable:**

- Training phase models and their progression logic
- Acute variable prescriptions (sets, reps, tempo, rest, intensity, frequency per phase
  and per goal)
- Assessment protocols and what their findings indicate
- Muscle-imbalance and postural-distortion relationships (which muscles are typically
  overactive / underactive in a given pattern)
- The corrective exercise sequence and what each stage is for
- Anatomy, muscle actions, joint mechanics
- Energy systems, macronutrient roles, hydration and recovery principles
- Exercise names, equipment, target muscles, and the mechanical description of movement
- Contraindications and safety rules

**Never extract:**

- **Any image, photograph, illustration, chart or diagram from the books.** Not cropped,
  not traced, not "redrawn from". Section 3 covers how the image gaps get filled instead.
- **Verbatim prose.** Every line that enters the knowledge base is rewritten in Bunyan's
  own voice. Not reworded sentence-by-sentence — restructured as data.
- **Tables reproduced as tables.** Take the relationships, model them yourself.
- Brand names, trademarked model names, acronyms, or certification language. The app
  carries no reference to the source, as specified.

If a piece of information cannot be expressed without copying it, **leave it out and note
it in the extraction log.** Do not copy quietly.

### 0.2 The source files never ship

The uploaded books go in `source/` and `source/` goes in `.gitignore`. They are reference
material for the extraction step only. Nothing in `source/` is ever committed, bundled, or
fetched by the app.

### 0.3 Completeness is the priority. It needs a mechanism, not good intentions.

**The owner's requirement: almost nothing from these books should be missed.** That is the
standard this task is judged against. Speed is irrelevant. A slow, complete extraction is a
success; a fast, lossy one is a failure that nobody will notice until the coach gives bad
advice six months from now.

Extraction loses information in three ways, and all three are designed against below:

1. **Skipping** — a section judged unimportant and passed over. Fixed by page accountability.
2. **Summarising** — four prescriptions compressed into one general statement. Fixed by the
   granularity rule.
3. **Homelessness** — a fact with no field to go in, so it quietly evaporates. This is the
   largest source of loss and the least visible. Fixed by §2.9.

### Page accountability

Before reading any content, create `.claude/INGESTION-LOG.md`:

```
## Source inventory
- <filename> — <page count> — <what it covers>

## Page ledger
| File | Pages | Section title | Class | Status | Extracted to | Facts |
(one row per SECTION, not per chapter. Every page of every book appears in
exactly one row. Pages must sum to the total page count — verify this.)

## Extraction log
(append-only; one line per completed section)

## Residual facts
(append-only; see §2.9)

## Open questions for the owner
(append-only)

## Refused extractions
(append-only; what was not extracted and why)
```

**Every page is accounted for.** Sum the page ranges in the ledger and confirm the total
matches the book. A page that appears in no row is a hole, and holes are what "almost
nothing missed" means in practice.

### Granularity

- **Work in units of one section** — a numbered subsection, not a chapter. Chapters are too
  big to extract without compressing.
- **Never hold more than one section in context.** Pull the page range with the pdf tooling.
- **Preserve granularity. Structuring is not summarising.** If the book gives four rep ranges
  for four training ages, the output has four entries. Never one entry with a range that
  spans them, never "varies by experience level". Specificity is the entire value here — a
  general statement about periodisation is worthless, the exact numbers are not.
- Record the **fact count** per section in the ledger. A section that yields two facts where
  the neighbouring sections yielded thirty is a signal that something was compressed. Go
  back and check it.
- Mark a section `done` only when its output file exists and its facts are counted.

### Two-pass extraction — the second pass is not optional

For every section:

- **Pass one:** read it and extract into the knowledge files.
- **Pass two:** re-read the same pages with the extracted output beside them, and answer one
  question in writing: *what is in these pages that is not in my output?* Log the answer.
  Anything found goes in — or into Residual facts, or into Refused, but never nowhere.

Pass two routinely finds 20–30% more than pass one, because pass one reads for the
structures it expects and pass two reads for what is actually there.

### Resuming

At the start of every session: read `INGESTION-LOG.md`, find the first section not marked
done, resume there. Never re-extract a done section. Never skip ahead to a more interesting
chapter.

---

## 1. Pass one — inventory, then stop

Do not extract anything yet.

1. Identify each uploaded file: title, page count, and what it actually covers.
2. Build the chapter map in `INGESTION-LOG.md` — every chapter, its page range, its topic.
3. Classify each **section** by what it can contribute:
   - `method` — phase models, programming logic, acute variables
   - `assess` — assessments and what findings mean
   - `corrective` — imbalance patterns and correction sequences
   - `exercise` — exercise descriptions, cues, technique
   - `nutrition` — macros, energy systems, hydration, timing
   - `anatomy` — reference material
   - `skip` — proposed for exclusion
4. Flag any section whose value is mostly in its images, since those cannot be used. The
   *information* in a chart is still extractable even when the chart itself is not — read the
   chart and model its relationships as data.

### Nothing is skipped silently

`skip` is a **proposal to the owner, not a decision.** Every proposed skip needs a one-line
reason in the ledger, and the owner approves the skip list before extraction begins.

Expect to propose: exam preparation, certification logistics, business and client
acquisition, professional ethics, scope-of-practice and legal chapters. These have genuinely
nothing to give the app.

Be slow to propose anything else. Psychology, behaviour change and adherence chapters look
skippable and are not — they are where "why did the user stop logging in week three" is
answered, and a coach that cannot address adherence is not much of a coach. Special
populations chapters look irrelevant to one user and are not: the owner is 25 now, trains
around a 13-hour workday, and is recovering from a significant injury. Modifications for
fatigue, limited time and prior injury are directly applicable.

**Report the full section ledger and the proposed skip list, then wait for approval.** This
is the cheapest point to correct scope, and it is the only approval gate before Section 5.

---

## 2. The knowledge base

Everything goes in `js/knowledge/` as ES modules exporting plain data. No DOM, no network,
no prose paragraphs — **structured data the coaching engine can query.**

Prose in a knowledge file is a failure of *format*, not a licence to drop content. If an
idea cannot be reduced to fields and relationships, it goes in `residual.js` (§2.8) — it
does not get summarised away, and it does not get abandoned.

### 2.1 `phases.js` — the progression model

Model the training phases as data: each phase's purpose, its target adaptation, its acute
variable ranges (reps, sets, tempo, rest, intensity as % 1RM), its typical duration, what
precedes and follows it, and what readiness signals justify moving on.

This is the single most valuable thing in these books for Bunyan, because it turns the app
from "you lifted this" into "here is where you are in a plan and why."

### 2.2 `acute-variables.js` — prescription lookup

A lookup keyed by **goal × phase × training age**, returning the rep range, set range,
tempo, rest interval and intensity band.

Bunyan currently hardcodes rep ranges per exercise in the split templates. Once this file
exists, those templates should *derive* their ranges from it rather than carrying their own
numbers. Do not change the split templates in this phase — note it for later.

### 2.3 `imbalances.js` — pattern → muscle relationships

For each postural or movement distortion pattern: which muscles are typically overactive
(needing lengthening), which are underactive (needing activation), and which movement
faults are observable.

Key each muscle by the **same muscle identifiers already used in the exercise library's
tags.** If the books use different anatomical naming, map it — do not introduce a second
muscle vocabulary. Two vocabularies will drift, and then the corrective engine will silently
match nothing.

### 2.4 `corrective.js` — the correction sequence

The four-stage sequence (inhibit → lengthen → activate → integrate), modelled as data:
each stage's purpose, its appropriate modalities, prescription parameters (duration, reps,
hold times), and ordering rules.

**This one matters personally.** The owner is recovering from a severe ankle sprain and the
current plan has isometrics and flexibility work bolted on by hand. Once this file exists,
that rehab block can be generated from the pattern rather than hand-written — and it will
be correct for whatever the next injury is too.

### 2.5 `assessments.js` — protocols and findings

Each assessment: what it is, how it is performed, what is observed, and what each
observable finding indicates — mapping to the patterns in `imbalances.js`.

**Only include assessments the user can genuinely self-administer with a phone.** An
assessment requiring a second person, a goniometer, or a trained observer is not usable in
Bunyan. Mark those `notSelfAdministrable: true` and exclude them from any UI.

### 2.6 `nutrition-principles.js`

Macronutrient roles and ranges by goal, protein targets per kg by training status, nutrient
timing where the evidence is solid, hydration guidance, and energy system contributions by
work duration.

Reconcile against what Bunyan already does: it uses Mifflin-St Jeor with an activity
multiplier. If the books prescribe a different method, **do not silently switch.** Record
both in the file with a note, and flag the discrepancy as an open question. Changing the
calorie formula changes the owner's live targets.

### 2.7 `cues.js` — coaching cues per exercise

Short, imperative technique cues, keyed to exercise IDs. Maximum two cues per exercise,
maximum ten words each.

The owner has already specified this constraint for instructions: *"we're checking this
while we're training so it needs to be simple, direct and short."* A cue that needs reading
twice is useless mid-set. Rewrite long technique descriptions into something glanceable, or
omit them.

### 2.8 `residual.js` — the file that prevents most of the loss

The schemas in §2.1–2.7 were designed before reading the books. They will not have a field
for everything the books contain. **A fact with nowhere to go must not be dropped.**

`residual.js` is an append-only array. Each entry: the fact as structured data, the section
it came from, and a `topic` string. No schema, no validation, no shape requirement.

Rules:

- When a fact does not fit any existing schema, it goes here. **Immediately.** Not "note it
  for later" — later does not come.
- Log it in the Residual facts section of `INGESTION-LOG.md` too.
- When six or more residual facts share a topic, that is a schema the knowledge base is
  missing. Propose a new file for it and migrate them. The books know things about coaching
  that the schemas written in advance did not anticipate — this is the mechanism that lets
  those things in.
- Review `residual.js` at the end of every book, not at the end of the whole task.

An empty `residual.js` at the end of this task does not mean the extraction was clean. It
means facts were being discarded.

### 2.9 Every file carries its own provenance

Each knowledge file exports a `meta` object: what it covers, what it was derived from
(generically — "certification curriculum", not a title), and a `confidence` field per entry
where the books were ambiguous.

---

## 3. The exercise library — reconcile, do not overwrite

Bunyan has 873 exercises with CC0 illustrations, 100% image coverage, zero duplicates. That
state was expensive to reach. **Protect it.**

### 3.1 Name reconciliation — proposal only, never automatic

Generate `tools/name-reconciliation.json`: for each library exercise, the current name, the
proposed book-aligned name, a confidence score, and the reason.

**Apply nothing automatically.** Three remappings have already gone wrong in this project
(Wall Sit → "Barbell Squat 40-60 reps"; three distinct ankle drills all collapsed to "Ankle
Circles"; a rear delt movement mapped to a chest exercise). Automated matching on exercise
names fails in exactly this way — plausibly and invisibly.

Required in the proposal:

- Confidence per row: `exact`, `likely`, `uncertain`
- Anything below `exact` requires owner review
- A **validation pass** that flags any rename where the proposed name's muscle group differs
  from the current entry's tags. That check is what caught all three earlier errors.
- Renames are a separate, reviewed commit. Never bundled with other work.

Honour the existing naming rule: `"Barbell Incline Bench Press - Medium Grip"` → `"Barbell
Incline Bench Press"`. Grip and stance variants go in a `variant` field, not the name.

### 3.2 New exercises

Add exercises that are in the books but not the library — expect warm-ups, mobility drills,
activation work, and corrective movements, which is where the current library is thinnest.

Each new entry needs the full schema: name, equipment, target and secondary muscles (using
the existing muscle vocabulary), mechanical description, cues, and an image. **An entry
without an image does not ship** — same rule as before.

### 3.3 Missing images — this is where book photos would have gone

They are not used. Fill the gaps in this order:

1. **Re-check `free-exercise-db`** (`github.com/yuhonas/free-exercise-db`, CC0) for anything
   added since the library was built.
2. **Wikimedia Commons**, filtered to CC0 / CC-BY / public domain, with the licence and
   author recorded in `CREDITS.md` per image.
3. **Generate SVG line art** in Bunyan's own style for whatever remains.

Option 3 is the real answer for warm-ups, mobility and corrective drills, and it is better
than photographs would have been. A consistent set of brand-styled line drawings looks like
one app. A mix of CC0 photos and textbook photos looks like two libraries stapled together.

SVG requirements: single accent-colour stroke on transparent background, legible at 64px,
under 4 KB each, directional arrow where the movement is not obvious from the pose, in
`assets/exercises/`. They are drawn from the *mechanical description* — the joint angles and
movement path — never traced from a book figure.

---

## 4. Diagrams — ERD, UML, and flow

Produce these as **Mermaid source in `docs/`**, committed as text. Mermaid because it
diffs, reviews, and renders on GitHub without tooling.

### 4.1 `docs/erd.md` — the data model

One entity-relationship diagram covering **both** the knowledge base and the user's data,
and showing where they join:

- Knowledge entities: Phase, AcuteVariableSet, Exercise, Cue, MuscleGroup, ImbalancePattern,
  CorrectiveStage, Assessment, NutritionRule
- User entities: Profile, Session, Entry, Set, Meal, FoodItem, BodyWeight, ActivityLog,
  CoachingState
- Cardinality on every relationship
- The join points marked explicitly — an Entry references an Exercise; a Session's
  prescription derives from an AcuteVariableSet; a CoachingState references the current Phase

The purpose of this diagram is to make the knowledge base *queryable by the coaching engine*
rather than a pile of unconnected files. If the ERD cannot express "given this user's
assessment findings, return the corrective exercises for their pattern", the model is wrong
and must be fixed before Section 5.

### 4.2 `docs/uml.md` — module structure

A class/module diagram of `js/knowledge/` and `js/coach/`: what each module exports, what it
depends on, and the direction of every dependency.

One rule the diagram must prove: **`js/knowledge/` depends on nothing.** It is leaf data.
`js/coach/` reads it. UI reads `js/coach/`. No arrows pointing back up. If the diagram shows
a cycle, the code has one.

### 4.3 `docs/flows.md` — decision flowcharts

Flowcharts for the decisions the app actually makes:

- Phase selection and progression — how a user's state determines their phase, and what
  moves them on
- Corrective prescription — assessment findings → pattern → four-stage exercise selection
- Progression / deload — how logged performance produces a load recommendation
- Nutrition target derivation — profile and activity → calorie and macro targets

The owner has Figma MCP configured. These Mermaid sources can be rendered to FigJam with
`generate_diagram` for reviewing, but **the Mermaid in `docs/` is the source of truth** and
stays current.

---

## 5. Wiring it into the coaching engine

This section depends on `COACHING-INTELLIGENCE.md`. Read it first.

The sequencing rule there still holds: **the engine may be built now, the UI may not.**
Coaching screens wait for `MASTER-BACKLOG.md` items 1–11, because the whole-screen
`innerHTML` rebuild defect has already produced five separate bug reports and any new screen
built now inherits it.

What this knowledge base changes in the engine:

- **Volume landmarks** get a second reference point. `COACHING-INTELLIGENCE.md` §2.1 notes
  that the practitioner heuristics there are "not measured constants." Where the books give
  a different range, record both and note the disagreement in the data. **Do not average
  them.** An averaged number has no source and no defence.
- **Phase awareness.** The autoregulation rules in §2.4 currently react to the last few
  sessions. With `phases.js` they can react to where the user is in a plan — the same RPE
  means different things in an accumulation week and a peaking week.
- **Weak-point detection** gains a real mechanism. §2.5 infers weak points from e1RM ratios,
  which is crude. `imbalances.js` plus `assessments.js` gives a basis that was designed for
  the purpose.
- **Corrective prescription** becomes possible at all. There is nothing in the current app
  that can do this.

Everything stays pure functions. No DOM in `js/knowledge/` or `js/coach/`.

---

## 6. Engineering constraints — unchanged

- **Vanilla ES modules.** No framework, no build step, no npm, no `package.json`. Scripts in
  `tools/` are the exception and never run in the browser.
- Knowledge files are **static data, loaded lazily.** Measure total added weight and report
  it. If the knowledge base pushes the app past a few hundred KB, split it so a user who
  never opens coaching features never downloads it.
- Fully offline. No network calls, ever.
- Every user-facing string through `t()` with an Arabic entry, verified in RTL. Cues and
  exercise names included — a cue that only exists in English is not finished.
- Existing design tokens. Nothing hardcoded.

---

## 7. The coverage report

When extraction finishes, produce `docs/COVERAGE.md`. This is how completeness gets
checked by a person rather than asserted by the extractor.

It contains:

- **Page accounting.** Total pages per book; pages extracted; pages skipped with approval;
  pages refused. These must sum to the total. State the sum.
- **Fact counts** per knowledge file and per source section.
- **Pass-two yield** — how many additional facts the verification pass found. If this is near
  zero across the board, pass two was not done properly and must be redone.
- **Residual facts** — how many, grouped by topic, and which ones became new schemas.
- **Refused extractions** — every item, with the reason. Mostly images and verbatim tables.
- **Thin sections** — any section whose fact count is far below its neighbours', listed for
  owner spot-checking.
- **Open questions** — anything ambiguous in the books, or contradicting what the app
  currently does.

Then pick **five sections at random**, re-read them cold, and report whether anything in them
is missing from the knowledge base. Put the result in the report honestly. A report saying
"found two gaps in five sections, both now fixed" is useful. A report claiming perfection is
not believable and will be treated as unverified.

---

## Acceptance criteria

- `INGESTION-LOG.md` has one row per section, and the page ranges **sum to the full page
  count of every book.** State the arithmetic.
- Every section is marked extracted, approved-skip, or refused-with-reason. No section is
  unaccounted for.
- Pass two was run on every section and its findings logged.
- `residual.js` is non-empty, and any topic with six or more entries became its own schema.
- `docs/COVERAGE.md` exists, its page arithmetic adds up, and the five-section random
  re-read was done and reported honestly.
- Granularity preserved: no case where the books give per-level or per-phase values and the
  output carries a single merged range.
- `source/` is in `.gitignore` and nothing from it is committed.
- **No image from the books exists anywhere in the repo.** Verify by inspection, not by
  assumption.
- No verbatim prose in any knowledge file. Spot-check by searching the books for any
  distinctive phrase that appears in the output.
- `js/knowledge/` contains no DOM access and no network calls.
- The UML diagram shows no dependency cycles.
- The ERD can answer: given a user's assessment findings, which corrective exercises are
  prescribed, in which order, with what parameters.
- Exercise library still has 100% image coverage, zero duplicates, zero missing URLs.
- Zero renames applied without owner review. The muscle-group validation check ran and its
  output is in the log.
- `CREDITS.md` lists every new image with its licence and author.
- No new UI screens were added.
- App still works fully offline.

---

## Verification

- Run the existing library validation. It must return zero problems, as it did before.
- Load the app with network disabled. Confirm every feature still works.
- Pick three exercises at random from the proposed renames and check them by hand against
  the books. If any one is wrong, the whole proposal needs re-review.
- Render the ERD and UML and read them. If you cannot explain the data flow from the diagram
  alone, it is not finished.
- Check total app weight before and after. Report both numbers.

Update `.claude/PROGRESS.md` and `INGESTION-LOG.md` at the end of **every section**, not
every session. A session that dies with five sections extracted and nothing logged has
lost five sections of work.

Then stop.

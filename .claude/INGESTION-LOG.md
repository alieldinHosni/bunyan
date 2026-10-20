# Knowledge base ingestion — log

Section 1 (inventory and ledger) done and **approved by the owner on 20 Oct**, with two
changes: 1.6 is kept (→ `js/knowledge/scope.js`), and `null.pdf` was removed from
`source/` rather than skipped. Section 2 (extraction) is under way — see the Extraction
log.

Classes as in the spec, plus `behaviour` (adherence, motivation, behaviour change),
approved 20 Oct, output to `js/knowledge/adherence.js`, and `scope` (what is out of
bounds for a trainer or the agent, and when to refer out), output to
`js/knowledge/scope.js`.

`skip` = approved skip. `dup` = byte- or page-identical copy of
pages listed elsewhere in this ledger. `img` = value is mostly in photographs or figures
(under ~100 extracted words per page against a 258 median); the information is still
extracted, the images never are.

## Source inventory

Files in `source/`, identified by page-tree count and extracted text.

| File | Pages | What it is |
|---|---|---|
| `Nasm CPT7.pdf` | 999 | Main certification textbook, chapters 1–23. **Incomplete PDF**: see gaps below. |
| `NASM_CPT7_Study_Guide.pdf` | 68 | Exam study guide — per-chapter recap of the textbook. |
| `NASM_CPT7_Study_Guide (1).pdf`, `(2).pdf` | 68 each | Byte-identical copies of the above (same MD5). |
| `CPT7_Study-Guide_Section4.pdf` | 7 | Study-guide excerpt for chapters 11–12 (assessment), with emphasis markings. |
| `CPT7_1_rep_max_conversion.pdf` | 8 | Reps-to-%1RM conversion handout. |
| `CPT7_Fat_Loss1.pdf` … `Fat_Loss4.pdf` | 1 each | Sample phase-1 programs for a fat-loss goal (4 variants). |
| `CPT7_Fat_Loss1 (1).pdf` | 1 | Byte-identical copy of `Fat_Loss1`. |
| `CPT7_Performance1.pdf` | 1 | Sample phase-1 program for a performance goal. |
| `CPT7_OPT_programming_template-revised.pdf` | 1 | Blank program template (31 words). |
| `CPT7_OPT_programming_template-revised (1).pdf` | 1 | Byte-identical copy. |
| `CPT7_weekly-monthly-annual_programming_template.pdf` | 1 | Blank periodisation planner (week / month / year). |
| `CPT7_Lifestyle-and-health-history_handout.pdf` | 3 | Intake questionnaire. |
| `CPT7_body_composition_assessment_template.pdf` | 1 | Assessment recording form. |
| `CPT7_cardio_assessment_template.pdf` | 1 | Assessment recording form. |
| `CPT7_static_posture_assessment.pdf` | 1 | Assessment recording form. |
| `CPT7_dynamic-posture_assessment_template.pdf` | 2 | Assessment recording form (movement compensations checklist). |
| `January2020PARQPlusFillable.pdf` | 4 | PAR-Q+ (2020) pre-exercise screening form — a third-party published instrument, not part of the textbook. |
| ~~`null.pdf`~~ | ~~942~~ | **REMOVED 20 Oct, on the owner's instruction — not skipped.** *Anabolics* (W. Llewellyn), a drug reference on anabolic steroids and other performance-enhancing drugs: dosing, cycles, sourcing. Not certification material; PED dosing and sourcing have no place in a knowledge base that serves other users and coaches. Sent to the Windows Recycle Bin and its scratch text extract deleted, so no later pass can read it. **Nothing from it was extracted, and nothing ever will be.** |

**Unique material: 1,101 pages** (999 textbook + 68 study guide + 34 handouts and forms).
Duplicate files add 138 pages (68 + 68 + 1 + 1), accounted for in the ledger below as
`dup`. 1,101 + 138 = 1,239 pages across the 21 remaining files.

### Gaps in the main textbook PDF — pages that do not exist in `source/`

1. **Chapter 20, lessons 11 and 12 are absent.** The running headers go from lesson 10
   (shoulder exercises, ends p854) straight to lesson 13 (legs, starts p855). Judging by
   the sequence, these are the arm exercise lessons.
2. **The PDF ends at p999, mid-way through Chapter 23 lesson 7.** No Chapter 23 summary,
   and no glossary, appendix or index. The page tree confirms 999 is the true count, so
   this is the file, not the extraction.
3. **Chapter 21 has no summary lesson** and lesson 6 is a single page (p907).
5. **The appendices are missing** — 7.4 refers readers to an appendix of individual
   muscles (actions, attachments). It would sit after p999 with the rest of the back
   matter (found 20 Oct at 7.4). This is the single most useful missing piece for
   `imbalances.js`, which needs per-muscle detail.
6. **Lesson 12.4 is cut short.** The PDF goes from the vertical jump's introduction
   (p499) straight to lesson 12.5 (p500). The vertical jump protocol and the long jump,
   LEFT, 40-yard dash and pro shuttle descriptions are absent (found 20 Oct). Only the
   one-line purposes in the 12.6 summary are recorded. **Missing — do not fill.**
7. **Cardio stage 5 is absent from the textbook PDF.** Lesson 15.4 says there are five
   stages, but the pages run stage 1 → stage 4 → lesson 15.5 (p637 → p639; p638 is
   blank). The study guide's chapter-15 summary confirms a stage 5 (conditioning drills,
   HIIT with small-sided games and agility drills). Only that one-line summary is
   recorded (`SG.15`). **Missing — do not fill.** Found 20 Oct.
8. **SAQ drill descriptions are absent (19.3).** The text refers readers to the 5-10-5,
   T-drill, box drill and modified box drill ("see …"), and names six ladder drills, but
   pp 775–777 carry only photo captions and video links. Names recorded; no
   instructions. **Missing — do not fill.** Found 20 Oct.
9. **Chapter 21 is incomplete.**
   - The five phase synopsis tables (21-9, 21-11 to 21-14) are not in the PDF; pp 885,
     895, 901–903 and 906 hold only a few words each.
   - The phase 5 resistance protocol, client's choice and cool-down paragraphs are also
     absent.
   - Lesson 21.6 announces three goal plans (fat loss, lean mass, performance), but only
     the fat-loss plan is on p907. The "Appendix B" sample programmes it cites are part
     of gap 5.

   **Recovered from the study guide:** its chapter-21 pages reprint the five synopsis
   tables, so every phase's sets, reps, tempo, rest and intensity are recorded with
   `src:"SG.21"`. Where the textbook text gives the same values, they agree. The lean-mass
   and performance plans stay **missing — do not fill.** Found 20 Oct.
10. **Lesson 22.1 has no free-weight or cable sections.** Its title is "Strength-training
    Machines, Free Weights, and Cables", but the text goes from machines straight to
    elastic resistance. The study guide's chapter-22 summary has one line on each (and one
    more on machines), recorded as `SG.22`. Nothing further. **Missing — do not fill.**
    Found 20 Oct.
4. **Pages 1–24 duplicate pages 31–53** (Chapter 1 lessons 2–6, appearing twice; the true
   chapter start, lesson 1, is p25). Verified by comparing page text.

**MISSING — DO NOT FILL.** Gaps 1, 2 and 6–10 stay marked `missing` in the ledger until a
complete copy arrives. The owner is trying to get one. Nothing in these sections may be
written from general knowledge or guessed from neighbouring lessons; the knowledge base
carries nothing for them until the real pages are read.

## Page ledger

### `Nasm CPT7.pdf` — 999 pages

| Pages | n | Ch.L | Section | Class | Status | Notes |
|---|---|---|---|---|---|---|
| 1–24 | 24 | 1.2–1.6 | Duplicate of pp 31–53 | skip | dup | Same pages twice at the head of the PDF |
| 25–30 | 6 | 1.1 | Welcome / certification orientation | skip | approved | Certification logistics |
| 31–33 | 3 | 1.2 | Global state of health | skip | approved | Population statistics; no user-level fact or prescription |
| 34–43 | 10 | 1.3 | Physical inactivity and chronic disease | method | **done** | → `assessments.js` (54), `scope.js` (4), `residual.js` (161). **219 facts** (recount, counter v2) |
| 44–46 | 3 | 1.4 | Muscular dysfunction and injury | corrective | **done** | → `residual.js` (56). **56 facts** |
| 47–50 | 4 | 1.5 | Healthcare continuum | skip | approved | Industry positioning |
| 51–53 | 3 | 1.6 | Scope of practice, code of conduct | scope | **done** | **Kept by owner, 20 Oct.** → `scope.js` (73), `residual.js` (6). **79 facts** |
| 54 | 1 | 1.7 | Summary | skip | approved | Chapter recap — re-read during pass two of ch.1 |
| 55–63 | 9 | 2.1 | Industry employment landscape | skip | approved | Business |
| 64–70 | 7 | 2.2 | Career development | skip | approved | Business |
| 71–74 | 4 | 2.3 | A day in the life | skip | approved | Trainer working day |
| 75–81 | 7 | 2.4 | Sales | skip | approved | Client acquisition |
| 82–88 | 7 | 2.5 | Marketing | skip | approved | Client acquisition |
| 89–91 | 3 | 2.6 | Continuing education | skip | approved | Certification logistics |
| 92–93 | 2 | 2.7 | Summary | skip | approved | Recap of a skipped chapter |
| 94–100 | 7 | 3.1 | Role of psychology in fitness | behaviour | **done** | → `adherence.js` (101), `residual.js` (27), `scope.js` (8), `assessments.js` (8). **144 facts** |
| 101–105 | 5 | 3.2 | Common barriers to exercise | behaviour | **done** | → `adherence.js` (117). **117 facts** |
| 106–115 | 10 | 3.3 | Social influences on exercise | behaviour | **done** | → `adherence.js` (181). **181 facts** |
| 116–120 | 5 | 3.4 | Psychological benefits of exercise | behaviour | **done** | → `adherence.js` (70), `scope.js` (4), `residual.js` (4). **78 facts** (dense — see log) |
| 121 | 1 | 3.5 | Summary | skip | **checked** | Approved skip; read as ch 3 checklist → 1 practice in `adherence.js` (3 facts) |
| 122–128 | 7 | 4.1 | Intro to behavioural coaching | behaviour | **done** | → `adherence.js` (85). **85 facts** |
| 129–133 | 5 | 4.2 | Stages of change | behaviour | **done** | → `adherence.js` (75). **75 facts** |
| 134–138 | 5 | 4.3 | Communication skills | behaviour | **done** | → `adherence.js` (90). **90 facts** (recount, counter v2) |
| 139–142 | 4 | 4.4 | Motivational interviewing | behaviour | **done** | → `adherence.js` (52). **52 facts** |
| 143–153 | 11 | 4.5 | Strategies to enhance adherence | behaviour | **done** | → `adherence.js` (180), `residual.js` (6). **186 facts** |
| 154–156 | 3 | 4.6 | The initial session | behaviour | **done** | → `adherence.js` (66). **66 facts** |
| 157–171 | 15 | 5.1 | Nervous system | anatomy | **done** | → `anatomy.js` (116). **116 facts** |
| 172–185 | 14 | 5.2 | Skeletal system | anatomy | **done** | → `anatomy.js` (125). **125 facts** |
| 186–192 | 7 | 5.3 | Joints | anatomy | **done** | → `anatomy.js` (78). **78 facts** |
| 193–205 | 13 | 5.4 | Muscular system | anatomy | **done** | → `anatomy.js` (128). **128 facts** |
| 206–218 | 13 | 6.1 | Cardiorespiratory system | anatomy | **done** | → `anatomy.js` (110), `assessments.js` (33), `residual.js` (6). **149 facts** |
| 219–226 | 8 | 6.2 | Respiratory system | anatomy | **done** | → `anatomy.js` (94), `residual.js` (6), `scope.js` (5). **105 facts** |
| 227–235 | 9 | 6.3 | Endocrine system | anatomy | **done** | → `anatomy.js` (150). **150 facts** |
| 236–240 | 5 | 6.4 | Digestive system | nutrition | **done** | → `nutrition-principles.js` (77). **77 facts** |
| 241–242 | 2 | 6.5 | Summary | skip | **checked** | Approved skip; read as ch 6 checklist → `anatomy.js` (2), `nutrition-principles.js` (6), `scope.js` (5). 13 facts |
| 243–248 | 6 | 7.1 | Intro to human movement science | anatomy | **done** | → `anatomy.js` (41). **41 facts** |
| 249–256 | 8 | 7.2 | Planes of motion | anatomy | **done** | → `anatomy.js` (84). **84 facts** |
| 257–263 | 7 | 7.3 | Muscle actions | anatomy | **done** | → `anatomy.js` (50). **50 facts** |
| 264–268 | 5 | 7.4 | Functional anatomy of muscles | anatomy | **done** | → `anatomy.js` (90). **90 facts** |
| 269–282 | 14 | 7.5 | Muscular force | anatomy | **done** | → `anatomy.js` (128), `imbalances.js` (14). **142 facts** |
| 283–287 | 5 | 7.6 | Motor behaviour | anatomy | **done** | → `anatomy.js` (68). **68 facts** |
| 288 | 1 | 7.7 | Summary | skip | **checked** | Approved skip; read as ch 7 checklist → `anatomy.js` (5). 5 facts |
| 289–294 | 6 | 8.1 | Exercise metabolism intro | nutrition | **done** | → `nutrition-principles.js` (78). **78 facts** |
| 295–300 | 6 | 8.2 | Energy and mechanical work | nutrition | **done** | → `nutrition-principles.js` (78). **78 facts** |
| 301–306 | 6 | 8.3 | Energy during exercise | nutrition | **done** | → `nutrition-principles.js` (85 + 1). **86 facts** |
| 307–310 | 4 | 8.4 | Daily energy needs | nutrition | **done** | → `nutrition-principles.js` (67). **67 facts** |
| 311 | 1 | 8.5 | Summary | skip | **checked** | Approved skip; read as ch 8 checklist → `nutrition-principles.js` (6). 6 facts |
| 312–320 | 9 | 9.1 | Intro to nutrition | nutrition | **done** | → `scope.js` (49), `nutrition-principles.js` (34). **83 facts** |
| 321–330 | 10 | 9.2 | Protein | nutrition | **done** | → `nutrition-principles.js` (206). **206 facts** |
| 331–338 | 8 | 9.3 | Carbohydrates | nutrition | **done** | → `nutrition-principles.js` (142). **142 facts** |
| 339–345 | 7 | 9.4 | Lipids | nutrition | **done** | → `nutrition-principles.js` (122). **122 facts** |
| 346–359 | 14 | 9.5 | Micronutrients and hydration | nutrition | **done** | → `nutrition-principles.js` (325). **325 facts** |
| 360–364 | 5 | 9.6 | Nutrition strategies | nutrition | **done** | → `nutrition-principles.js`, `scope.js`. **83 facts** |
| 365–372 | 8 | 9.7 | Food labels | nutrition | **done** | → `nutrition-principles.js` (119). **119 facts** |
| 373–381 | 9 | 9.8 | Goal-based nutrition | nutrition | **done** | → `nutrition-principles.js` (172). **172 facts** |
| 382–385 | 4 | 10.1 | Intro to supplements | nutrition | **done** | → `supplements.js` (55), `residual.js` (8). **63 facts** |
| 386–396 | 11 | 10.2 | Supplement guidelines and labels | nutrition | **done** | → `supplements.js` (292). **292 facts** |
| 397–407 | 11 | 10.3 | Health supplements | nutrition | **done** | → `supplements.js` (352). **352 facts** |
| 408–419 | 12 | 10.4 | Ergogenic aids | nutrition | **done** | → `supplements.js`, `scope.js`. **210 facts** (after owner-requested removal, 20 Oct) |
| 420–429 | 10 | 11.1 | Pre-participation screening | assess | **done** | → `assessments.js`, `imbalances.js`, `scope.js`. **146 facts** |
| 430–433 | 4 | 11.2 | Conducting assessments | assess | **done** | → `assessments.js` (25). **25 facts** |
| 434–438 | 5 | 11.3 | Heart rate and blood pressure | assess | **done** | → `assessments.js` (43), `scope.js` (5). **48 facts** |
| 439–453 | 15 | 11.4 | Anthropometry, body composition | assess | **done** | → `assessments.js` (157). **157 facts** |
| 454–466 | 13 | 11.5 | Cardiorespiratory assessments | assess | **done** | → `assessments.js` (371). **371 facts** |
| 467 | 1 | 11.6 | Summary | skip | **checked** | Approved skip; read as ch 11 checklist → `assessments.js` (5). 5 facts |
| 468–470 | 3 | 12.1 | Intro to posture/movement assessment | assess | **done** | → `imbalances.js`, `assessments.js`. **18 facts** |
| 471–475 | 5 | 12.2 | Static posture | assess · corrective | **done** | → `imbalances.js`, `assessments.js`, `anatomy.js`. **116 facts** |
| 476–494 | 19 | 12.3 | Dynamic posture | assess · corrective | **done** | → `assessments.js`, `imbalances.js`, `anatomy.js`. **192 facts** |
| 495–499 | 5 | 12.4 | Performance assessments | assess | **done** | → `assessments.js`. **70 facts**. Gap 6: later performance tests missing |
| 500–506 | 7 | 12.5 | Implementing the assessment | assess | **done** | → `assessments.js`, `scope.js`. **66 facts** |
| 507–508 | 2 | 12.6 | Summary | skip | **done** | checklist → `assessments.js`. **9 facts** |
| 509–517 | 9 | 13.1 | Integrated training principles | method | **done** | → `phases.js` (new). **69 facts** |
| 518–522 | 5 | 13.2 | Integrated training concepts | method | **done** | → `phases.js`. **68 facts** |
| 523–527 | 5 | 13.3 | The phase model | method | **done** | → `phases.js`. **106 facts**; variables pending ch 21 |
| 528–529 | 2 | 13.4 | Summary | skip | **done** | checklist → `phases.js`. **1 fact** |
| 530–534 | 5 | 14.1 | Intro to flexibility | corrective | **done** | → `corrective.js` (new). **37 facts** |
| 535–541 | 7 | 14.2 | Human movement system review | corrective | **done** | → `corrective.js`. **71 facts** |
| 542–544 | 3 | 14.3 | Rationale for flexibility training | corrective | **done** | → `corrective.js`. **28 facts** |
| 545–556 | 12 | 14.4 | Self-myofascial techniques | corrective · exercise | **done** | → `corrective.js`, `cues.js` (new). **106 facts** |
| 557–573 | 17 | 14.5 | Static stretching | corrective · exercise | **done** | → `corrective.js`, `cues.js`, `anatomy.js`. **99 facts** |
| 574–590 | 17 | 14.6 | Active stretching | corrective · exercise | **done** | → `corrective.js`. **37 facts** |
| 591–609 | 19 | 14.7 | Dynamic and controversial stretches | corrective · exercise | **done** | → `corrective.js`, `cues.js`. **76 facts** |
| 610–612 | 3 | 15.1 | Intro to cardio training | method | **done** | → `cardio.js` (new). **13 facts** |
| 613–625 | 13 | 15.2 | Cardio guidelines | method | **done** | → `cardio.js`. **92 facts** |
| 626–629 | 4 | 15.3 | Cardio components | method | **done** | → `cardio.js`. **76 facts** |
| 630–638 | 9 | 15.4 | Stage (zone) training | method | **done** | → `cardio.js`. **143 facts**; gap 7 stage 5 |
| 639–640 | 2 | 15.5 | Postural considerations in cardio | corrective | **done** | → `cardio.js`. **24 facts** |
| 641–649 | 9 | 16.1 | Intro to core | method | **done** | → `core.js` (new). **53 facts** |
| 650–658 | 9 | 16.2 | Why train the core properly | method | **done** | → `core.js`, `imbalances.js`. **72 facts** |
| 659–663 | 5 | 16.3 | Core guidelines | method | **done** | → `core.js`. **112 facts** (no per-phase variables here) |
| 664–686 | 23 | 16.4 | Core exercises | exercise | **done** | → `core.js`, `cues.js`. **91 facts** |
| 687–690 | 4 | 17.1 | Balance concepts | method | **done** | → `balance.js` (new). **23 facts** |
| 691–696 | 6 | 17.2 | Rationale for balance training | method | **done** | → `balance.js`. **59 facts** |
| 697–701 | 5 | 17.3 | Balance guidelines | method | **done** | → `balance.js`. **77 facts** |
| 702–728 | 27 | 17.4 | Balance exercises | exercise | **done** | → `balance.js`, `cues.js`. **42 facts** |
| 729–734 | 6 | 18.1 | Plyometric principles | method | **done** | → `plyometrics.js` (new). **48 facts** |
| 735–738 | 4 | 18.2 | Plyometric guidelines | method | **done** | → `plyometrics.js`. **77 facts** |
| 739–761 | 23 | 18.3 | Plyometric exercises | exercise | **done** | → `plyometrics.js`, `cues.js`. **44 facts** |
| 762–767 | 6 | 19.1 | Speed/agility/quickness concepts | method | **done** | → `saq.js` (new). **46 facts** |
| 768–773 | 6 | 19.2 | SAQ for non-athletes | method | **done** | → `saq.js`. **106 facts** |
| 774–777 | 4 | 19.3 | SAQ drills and programming | exercise | **done** | → `saq.js`. **44 facts**; gap 8 |
| 778–785 | 8 | 20.1 | Intro to resistance training | method | **done** | → `acute-variables.js` (new). **70 facts** |
| 786–789 | 4 | 20.2 | Progressive adaptations | method | **done** | → `acute-variables.js`. **43 facts** |
| 790–798 | 9 | 20.3 | Acute variables | method | **done** | → `acute-variables.js`. **138 facts** |
| 799–809 | 11 | 20.4 | Resistance training systems | method | **done** | → `acute-variables.js`. **160 facts** |
| 810–815 | 6 | 20.5 | Safety | method | **done** | → `acute-variables.js`. **37 facts** |
| 816–821 | 6 | 20.6 | Resistance training guidelines | method | **done** | → `acute-variables.js`. **75 facts** |
| 822–833 | 12 | 20.7 | Total-body exercises | exercise | **done** | → `acute-variables.js`. **16 facts** |
| 834–839 | 6 | 20.8 | Chest / push exercises | exercise | **done** | → `acute-variables.js`, `cues.js`. **22 facts** |
| 840–846 | 7 | 20.9 | Back / pull exercises | exercise | **done** | → `acute-variables.js`, `cues.js`. **20 facts** |
| 847–854 | 8 | 20.10 | Shoulder / vertical press exercises | exercise | **done** | → `acute-variables.js`, `cues.js`. **27 facts** |
| — | 0 | 20.11–20.12 | *Not in the PDF* (probably arm exercises) | — | **missing** | Do not fill — see gaps |
| 855–869 | 15 | 20.13 | Leg exercises | exercise | **done** | → `acute-variables.js`, `cues.js`. **38 facts** |
| 870–878 | 9 | 21.1 | Intro to program design | method | **done** | → `phases.js`. **60 facts** |
| 879–883 | 5 | 21.2 | The phase model (programming) | method | **done** | → `phases.js`. **52 facts** |
| 884–895 | 12 | 21.3 | Stabilisation level | method | **done** | → `phases.js`. **172 facts** |
| 896–903 | 8 | 21.4 | Strength level | method | **done** | → `phases.js`. **120 facts** |
| 904–906 | 3 | 21.5 | Power level | method | **done** | → `phases.js`. **31 facts** + SG.21; gap 9 |
| 907 | 1 | 21.6 | Applying the model | method | **done** | → `phases.js`, `acute-variables.js`. **18 facts**; gap 9 |
| 908–911 | 4 | 22.1 | Machines, free weights, cables | exercise | **done** | → `modalities.js` (new). **12 facts**; gap 10 |
| 912–920 | 9 | 22.2 | Elastic resistance, medicine balls | exercise | **done** | → `modalities.js`. **56 facts** |
| 921–928 | 8 | 22.3 | Kettlebell and bodyweight | exercise | **done** | → `modalities.js`. **66 facts** |
| 929–931 | 3 | 22.4 | Sandbags, other implements, ropes | exercise | **done** | → `modalities.js`. **43 facts** |
| 932–937 | 6 | 22.5 | Proprioceptive modalities | exercise | **done** | → `modalities.js`. **59 facts** |
| 938–942 | 5 | 22.6 | Activity trackers | method | **done** | → `modalities.js`. **67 facts** |
| 943–954 | 12 | 23.1 | Age considerations | method | **done** | → `conditions.js` (new), `scope.js`. **178 facts** |
| 955–962 | 8 | 23.2 | Obesity | method | **done** | → `conditions.js`, `scope.js`. **112 facts** |
| 963–968 | 6 | 23.3 | Diabetes | method | **done** | → `conditions.js`, `scope.js`. **92 facts** |
| 969–978 | 10 | 23.4 | Hypertension, coronary heart disease | method | **done** | → `conditions.js`, `scope.js`. **185 facts** |
| 979–985 | 7 | 23.5 | Osteoporosis, arthritis | method | **done** | → `conditions.js`, `scope.js`. **173 facts** |
| 986–992 | 7 | 23.6 | Cancer, pregnancy | method | **done** | → `conditions.js`, `scope.js`. **187 facts** |
| 993–999 | 7 | 23.7 | Chronic lung disease, claudication | method | **done** | → `conditions.js`, `scope.js`. **150 facts**; gap 2 |
| — | 0 | 23.7 rest, 23 summary, back matter | *Not in the PDF* — everything after p999 | — | **missing** | Do not fill — see gaps |

**Arithmetic.** 131 page rows, plus two empty rows for the missing material. Ranges are
contiguous from 1 to 999 with no gap or overlap, and the sum of `n` = **999**, the
page-tree count — both checked by script. Approved skips: 87 pages (24 duplicate +
63 content). To extract: 912 pages. 912 + 63 + 24 = 999.

### `NASM_CPT7_Study_Guide.pdf` — 68 pages

One row per chapter recap. Proposed treatment: **not a separate extraction source.** It
is exam preparation and restates the textbook; it is used as a **pass-two checklist**
for each matching chapter (anything it mentions that the knowledge base lacks is a gap).

| Pages | n | Covers | Class | Status |
|---|---|---|---|---|
| 1–2 | 2 | Ch 1 | skip | **checked** (6 facts) |
| 3–5 | 3 | Ch 2 | skip | **checked** (0 — business chapter, approved skip; p3 top repeats ch 1 HDL/diabetes, already held) |
| 6–7 | 2 | Ch 3 | skip | **checked** (6 facts) |
| 8–10 | 3 | Ch 4 | skip | **checked** (20 facts) |
| 11–15 | 5 | Ch 5 | skip | **checked** (5 facts) |
| 16–20 | 5 | Ch 6 | skip | **checked** (8 facts) |
| 21–24 | 4 | Ch 7 | skip | **checked** (10 facts) |
| 25–27 | 3 | Ch 8 | skip | **checked** (8 facts) |
| 28–30 | 3 | Ch 9 | skip | **checked** (5 facts) |
| 31–33 | 3 | Ch 10 | skip | **checked** (9 facts) |
| 34–35 | 2 | Ch 11 | skip | **checked** (1 fact) |
| 36–40 | 5 | Ch 12 | skip | **checked** (1 fact) |
| 41–42 | 2 | Ch 13 | skip | **checked** (0 new; confirmed Table 13-10 pairs) |
| 43–44 | 2 | Ch 14 | skip | **checked** (1 new on p45, SG.14) |
| 45–46 | 2 | Ch 15 | skip | **checked** (stage 5 summary, SG.15 — gap 7) |
| 47–49 | 3 | Ch 16 | skip | **checked** (1 new, SG.16) |
| 50–51 | 2 | Ch 17 | skip | **checked** (1 new, SG.17) |
| 52–53 | 2 | Ch 18 | skip | **checked** (1 new, SG.18) |
| 54–55 | 2 | Ch 19 | skip | **checked** (0 new; 1 conflict, SG.19) |
| 56–60 | 5 | Ch 20 | skip | **checked** (0 new) |
| 61–62 | 2 | Ch 21 | skip | **checked** (synopsis tables recovered, SG.21: 58 facts) |
| 63–64 | 2 | Ch 22 | skip | **checked** (3 new, SG.22) |
| 65–68 | 4 | Ch 23 — also the only recap of the chapter end missing from the textbook PDF | skip | **checked** (0 new for ch 23; ch 22 pros/cons → SG.22) |

Sum = **68**. Copies `(1)` and `(2)`: 68 + 68 = 136 pages, `dup`, not read.

### Handouts and forms — 34 pages unique

| File | Pages | Class | Status | Notes |
|---|---|---|---|---|
| `CPT7_Study-Guide_Section4.pdf` | 1–2 (Ch 11) **checked — duplicate of SG pp 34–35**, 3–7 (Ch 12) **checked — duplicate of SG pp 36–40** = 7 | skip | checklist | Same treatment as the study guide; its emphasis marks show what the owner was told matters |
| `CPT7_1_rep_max_conversion.pdf` | 1–8 = 8 | method | **done** | → `acute-variables.js` `ONE_RM`: the chart reduced to its exact rule, 1RM = load ÷ (1 − 0.025 × reps), fitted to all 160 rows. The table is not reproduced. **19 facts.** Open question 22 (vs Epley) |
| `CPT7_Fat_Loss1.pdf` | 1 | method | **done** | → `phases.js` `SAMPLE_SESSIONS.fatLoss[0]` |
| `CPT7_Fat_Loss2.pdf` | 1 | method | **done** | → `SAMPLE_SESSIONS.fatLoss[1]` |
| `CPT7_Fat_Loss3-1.pdf` | 1 | method | **done** | → `SAMPLE_SESSIONS.fatLoss[2]` |
| `CPT7_Fat_Loss4.pdf` | 1 | method | **done** | → `SAMPLE_SESSIONS.fatLoss[3]` and the progression. Sample handouts together: **129 facts** |
| `CPT7_Performance1.pdf` | 1 | method | **done** | → `SAMPLE_SESSIONS.performance[0]` |
| `CPT7_OPT_programming_template-revised.pdf` | 1 | skip | approved | Blank form, layout only (31 words) |
| `CPT7_weekly-monthly-annual_programming_template.pdf` | 1 | method | **done** | → `phases.js` `TEMPLATE.forms` (annual, monthly and session grids). **16 facts** with the OPT session template |
| `CPT7_Lifestyle-and-health-history_handout.pdf` | 1–3 = 3 | assess | **done** | Already covered by 11.1 `SCREENING`; only its 7 extra questions were added (`intakeForm`). **8 facts** |
| `CPT7_body_composition_assessment_template.pdf` | 1 | assess | **done** | Checked against 11.4: same sites and methods. 0 new |
| `CPT7_cardio_assessment_template.pdf` | 1 | assess | **done** | Checked against 11.5: same tests. 1 new (BP only when indicated). **1 fact** |
| `CPT7_static_posture_assessment.pdf` | 1 | assess | **done** | Checked against 12.2: same 3 views × 5 checkpoints. 0 new |
| `CPT7_dynamic-posture_assessment_template.pdf` | 1–2 = 2 | assess | **done** | Checked against `MOVEMENT_FAULTS` and `PATTERNS`: every finding → muscle row matches, including "lats (OHSA only)". 0 new |
| `January2020PARQPlusFillable.pdf` | 1–4 = 4 | assess | **done** | Screening logic only (which answers mean "see a doctor first"). The questions are the instrument's own wording and are **not** reproduced | → `assessments.js` `SCREENING.parq.logic`: decision paths, 10 follow-up categories, delay rules, 12-month validity; topics paraphrased, questions not reproduced. **44 facts** |
| Duplicates: `Fat_Loss1 (1)`, `OPT_programming_template (1)` | 1 + 1 | — | dup | Not read |

Sum of unique = 7 + 8 + 5 + 1 + 1 + 3 + 1 + 1 + 1 + 2 + 4 = **34**.

### `null.pdf` — *Anabolics* — 942 pages — REMOVED

Removed from `source/` on 20 Oct on the owner's instruction. It was not skipped, it is
gone, so no later pass can read it by accident. Its 942 pages are not part of this
ledger's totals. Nothing from it was extracted at any point; Section 1 read only its
title pages and contents list to identify it.

## Totals

| Source | Pages | To extract | Approved skip | Checklist | Duplicate |
|---|---|---|---|---|---|
| Textbook | 999 | 912 | 63 | — | 24 |
| Study guide | 68 | — | — | 68 | — |
| Study guide copies | 136 | — | — | — | 136 |
| Handouts and forms | 34 + 2 dup | 26 | 1 | 7 | 2 |
| **All files** | **1,239** | **938** | **64** | **75** | **162** |

938 + 64 + 75 + 162 = **1,239**, which equals the sum of every remaining file's page
count: 999 + (68 × 3) + 34 + 2 = 1,239. Not in `source/` at all: textbook ch 20 lessons
11–12 and everything after p999 (see gaps) — **missing**, not counted, not filled.

## Extraction log
(append-only; one line per completed section)

Fact counts come from `tools/count-facts.sh` (rule in its header): every quoted value and
bare number in an entry tagged with the section's `src`. A proxy for spotting thin
sections, not a measure of value. Every knowledge file is checked by importing it in the
browser (`tools/serve.ps1` on :8777) before a section is marked done.

- **20 Oct — `null.pdf` REMOVED from `source/`** on the owner's instruction (sent to the
  Recycle Bin, scratch text deleted). Not skipped — removed. Nothing extracted from it.
- **20 Oct — 1.3 pp 34–43 done, 222 facts.** BMI and blood-pressure classification →
  `assessments.js`; medical clearance before exercise with a chronic condition →
  `scope.js`; condition profiles (obesity, CVD, hypertension, dyslipidaemia, T1/T2
  diabetes, cancer, COPD, stress), definitions, a weight-maintenance finding and
  population statistics → `residual.js`. The section contains no activity guideline
  (minutes per week): the ledger note expecting one was wrong. **Pass two** found 11
  more: glucose, insulin and endorphin definitions; three general chronic-condition
  facts; heart disease "highly preventable" and atherosclerosis leading directly to heart
  attack and stroke; stress drivers and trend; obesity still rising in developing
  regions; the public-health response; BP guidelines deliberately set lower to act
  earlier. All added. One refusal (Figure 1-6).
- **20 Oct — 1.4 pp 44–46 done, 56 facts.** Five body regions (foot/ankle, knee,
  lumbo-pelvic-hip, shoulder, head/neck) plus the general sitting-and-inactivity link →
  `residual.js` `injury-regions`: the common injuries, causes, knock-on effects,
  prevention and what to watch. Includes the ankle re-injury fact the owner's rehab
  depends on. **Pass two** re-read all three pages against the output: 0 new facts; the
  only uncaptured lines were the trainer-must-know role statements, which carry no
  data. Plausible for a three-page survey section; flagged for the random re-read
  anyway. No figures in the section, no refusals.
- **20 Oct — 1.6 pp 51–53 done, 79 facts** (kept by owner). → `scope.js`: 24 rules — 2
  in-scope (the role, jurisdiction), 5 out-of-scope (diagnose, treat, train a diagnosed
  condition, nutrition/supplement advice, misrepresent qualifications), 3 preconditions
  (chronic-condition clearance from 1.3, signed health history, emergency
  certification), 4 referral triggers (health or medication change, undiagnosed
  problem, unusual pain mid-session → stop now, catch-all), 10 conduct rules
  (confidentiality, minors, records, respect, harassment, honest promotion…). Each rule
  that was written for an in-person trainer carries an `agentReading` — **Bunyan's
  interpretation, labelled as such and excluded from fact counts** — of what it means for
  the agent and for in-app coaches. Six trainer-business obligations with no app use
  (hygiene, dress, insurance, CEUs, 4-year records, IP law) → `residual.js`
  `professional-conduct`, so nothing is dropped. **Pass two** found 1: the obligation to
  know neighbouring professions' scopes and stay current on local law. Added. One line
  deliberately not extracted: the statement that certified professionals must sign up to
  the certifying body's code — certification logistics, inside the approved skip.

- **20 Oct — 3.1 pp 94–100 done, 144 facts.** New file `adherence.js`: participation
  drivers and competing demands; motivation (intensity × direction, dynamic, drift and
  abrupt triggers); extrinsic / intrinsic / mixed / amotivation, each with what it
  sustains and what it seeks; reward-matching rule; self-determination needs
  (competence, relatedness, autonomy); motives by age and population; three evidence
  findings; five coaching practices. `scope.js` + `no_mental_health_care` (diagnose,
  assess, counsel or treat mental illness, incl. exercise addiction and eating-disorder
  body image). `assessments.js` + the motivation inventory, by name and structure only —
  instrument not reproduced. Psychology/psychologist/psychiatrist definitions →
  residual. **Pass two:** 0 new. Deliberately not extracted: learning objectives (exam
  framing) and "helps grow a client base" (business, approved skip). Figure 3-1 refused
  (image; its content is in the text and captured).

- **20 Oct — 3.2 pp 101–105 done, 117 facts** (116 counted under 3.2, plus one 3.2 fact
  stored in the 3.1-tagged `DRIVERS` object and counted there). `adherence.js` +
  `BARRIER_RULES` (definition, physical vs perceived, coach's role, how barriers shift
  with age and parenthood), `BARRIERS` (time — with the one-week time-log tool —
  unrealistic goals, no social support, social physique anxiety with its signals,
  convenience, ambivalence; each with who, why and strategies), `GOALS` (outcome vs
  process, must-be, pitfalls, rules for novices), and one coach practice. **Pass two**
  found 3: the definition of a barrier, its universality, and time also blocking
  eating well and stress management. Added. Table 3-1 modelled as data with Bunyan's
  own examples, not reproduced. Figure 3-2 refused. The four example remarks that
  signal social physique anxiety were paraphrased into signals, not quoted.

- **20 Oct — 3.3 pp 106–115 done, 181 facts.** `adherence.js` + `SOCIAL` (influence,
  sources, life-phase sources, source credibility, receptiveness, online/social media
  with a reliability test), `SUPPORT_TYPES` (instrumental, emotional, informational,
  companionship — what each is, examples, effect, coach role), `EMPATHY` (vs sympathy),
  `COACH_SUPPORT` (what is assumed in a coach relationship, what to do when support is
  missing, first-meeting questions), `GROUPS` (family, parents, exercise leader with the
  four leadership components, exercise group with roles, identity and ten reasons people
  are drawn to it, community/built environment), and two practices. **Pass two** found
  2: group settings do not suit everyone but stay popular; people come to groups for
  several reasons at once. Added. Tables 3-2, 3-3 and 3-4 modelled as data, not
  reproduced. Deliberately not extracted: "leadership is unexpected when entering the
  industry" (career framing, approved skip). Two stock photos — nothing to model.

- **20 Oct — 3.4 pp 116–120 done, 78 facts.** `adherence.js` + `BENEFITS`: mood (vs
  emotion; 10–60 min bouts suffice), self-esteem domains and physical subdomains, body
  image (accuracy, sex and culture differences, the "women's problem" misconception,
  two evidence findings), the reciprocal esteem–image link and its clinical ties, sleep
  (role, deficit risks, six exercise findings incl. ≥150 min/week moderate for insomnia
  and an excess threshold), depression and anxiety (activity gap, prevention, moderate
  over high intensity, walking 3×/week for anxiety), sedentary–depression link with
  unclear direction. `scope.js` + `refer_suspected_mental_illness` → primary-care
  physician; never prescribe exercise as treatment. Two statistics → residual
  `epidemiology`. **Pass two** found 1: mental health always taken seriously. Added.
  **Count note:** this section's sentences often carry two or three findings each, so
  its value count understates it — not a thin section. Figure 3-3 refused; the lesson
  video is not in the PDF.
- **20 Oct — 3.5 p121 (approved skip, used as chapter-3 checklist).** Every barrier,
  support type, influence and benefit it lists is already in `adherence.js`. One point
  not yet captured — habit-building is hard for most people and needs motives, barrier
  plans and support together — added as a 3.5 practice (3 facts). **Chapter 3 complete.**

- **20 Oct — 4.1 pp 122–128 done, 85 facts.** `adherence.js` + `DETERMINANTS` (ten
  exercise determinants; nine physical-activity findings incl. self-efficacy as one of
  the strongest and job strain/long hours inverse; resistance-training determinants
  with planning as the intention→behaviour bridge), `TECHNIQUES` (13 behaviour-change
  techniques grouped by the outcome they serve, the selection rule, and delivery
  channels outside sessions — reminders, email, social), `EXPECTATIONS` (first
  impression, coach qualities, environment and "third space", what people weigh before
  joining a gym). **Pass two** found 1: the technique-selection rule was in a comment
  only. Added as data. Table 4-1 modelled, not reproduced. Learning objectives
  deliberately not extracted (exam framing).

- **20 Oct — 4.2 pp 129–133 done, 75 facts.** `adherence.js` + `STAGES`: the five stages
  as ordered states, each with definition, why people are there, which processes fit
  (cognitive early, behavioural late) and what the coach does; staged **per behaviour**,
  not per person; termination and why it does not apply to exercise; decisional
  balance; the missed-session rule (reschedule, or plan to keep training if the new
  session is more than 24–48 h away); and the four-question screen as ordered logic in
  Bunyan's own wording — verified in the browser. **Pass two:** 0 new. **Conflict
  recorded:** the screen and the stage definitions time "preparation" differently (open
  question 13). **Cross-reference:** the precontemplation myth correction contains a
  prescription (30–60 min resistance training, 2–4 days/week, for significant health
  benefit) — reconcile with `acute-variables.js` at chapter 20. Figure 4-1 refused;
  the worksheet table modelled as logic, not reproduced.

- **20 Oct — 4.3 pp 134–138 done, 88 facts.** `adherence.js` + `COMMUNICATION`: what a
  good communicator does; non-verbal channels and rules; the verbal clarity loop;
  reflective and active listening; the five listening techniques — open vs closed
  questions, the 1–10 importance ruler with the "why not lower" follow-up (the source
  gives no reading for 7–8, recorded as a gap), reflections, three summary types,
  affirmations vs compliments, asking permission. The source's example questions and
  affirmations are recorded as what they ask or do, not quoted. **Pass two** found 1:
  ask before sharing even though the person pays for information. Added. Figure 4-2
  refused.

- **20 Oct — 4.4 pp 139–142 done, 52 facts.** `adherence.js` + `INTERVIEWING`: what MI is
  and its style; its link to the contemplation stage; ambivalence; the method;
  self-discrepancy (no perceived gap → no motivation); sustain-talk and change-talk
  **markers** (four each — detectable in what a user writes); avoiding argument, with
  question patterns that provoke vs promote change; the importance / confidence /
  readiness ruler with thresholds (7–10 ready, 1–6 needs coaching). This **fills the
  7–8 gap** logged at 4.3; the 4.3 entry now points here. **Pass two** found 1:
  everyone gets stuck in ambivalence at times. Added. Table 4-2 modelled as question
  patterns in Bunyan's words; two fragments that sat too close to the source's wording
  were rewritten. Figures 4-3 and 4-4 refused.

- **20 Oct — 4.5 pp 143–153 done, 186 facts.** `adherence.js` + `STRATEGIES`: the
  intention–behaviour gap (predicted >3/week, actual 1.39); behavioural strategies;
  goals — why/what/how hierarchy, four functions, long-term-first order, subgoals,
  SMART criteria with the "short enough for urgency, long enough for 1–2 slips" rule,
  four worked examples as structured parts, outcome vs process with a progression
  example; self-efficacy (praise attempts, early); planning — implementation intentions
  with habit-linking and the 3× mantra, coping plans, and their **limits** (not for low
  self-efficacy or contemplation; listing barriers can backfire → review past barriers
  first); self-monitoring — what to log beyond sets, benefits; seven time-management
  tactics; cognitive strategies — self-talk (reverse listing, stopping, five coaching
  steps, cognitive fusion), imagery (three types), psyching up. Two goal-example numbers
  → residual `nutrition` for chapter 9 to confirm. **Pass two** found 2: membership and
  coaching purchases as intention signals; a second set of outcome/process examples.
  Added. **Source arithmetic error:** the half-marathon build-up says ~18 weeks; its own
  numbers give 20 (computed from the data in the browser) — both recorded, confidence
  low (open question 14). Figures 4-5 (SMART) and 4-6 (diet record worksheet) refused.
  Pages 147–148 of the text extract repeat; read once.

- **20 Oct — 4.6 pp 154–156 done, 66 facts.** Reclassified `assess` → `behaviour`: it
  is an intake procedure, not an assessment. `adherence.js` + `INTAKE`: the four ordered
  steps (health concerns, goals, exercise history, fitness assessment), each with why
  and what to do; the vague-goal-to-capability-to-subgoal technique; history follow-ups;
  the likely barriers; programme timing (designed after, presented at the first real
  session); what must be covered and asked before the session ends; technique and
  channel choice; introducing people to others. **Pass two:** 0 new. One stock photo.

- **20 Oct — Fact counter v2.** v1 carried the latest `src` forward line by line, so a
  nested `src` (needed for study-guide additions inside existing objects) would have
  credited every following line to the wrong section, and it counted quoted text in
  comments. v2 scopes each `src` to its own object by brace depth, lets a late `src`
  claim the values before it in the same object, and skips comments. Recounts: **1.3
  222 → 219** (v1 counted quoted text inside a comment); **4.3 88 → 90** (the 7–8 gap
  note, extended at 4.4, sits in a 4.3 object). Everything else unchanged.
- **20 Oct — Study-guide checklist, chapters 1, 3 and 4** (SG pp 1–2, 6–10; chapter 2's
  pp 3–5 not read — chapter 2 is an approved skip). Facts found that the knowledge
  base lacked, each tagged `src:"SG.n"`:
  ch 1 — 3 definitions (evidence-based practice, acute and chronic disease) from
  sections 1.1/1.2, which were approved skips → residual `definitions`, 6 facts.
  ch 3 — three more process-goal examples; and a **conflict**: the guide calls
  instrumental support the most influential type in general, the textbook says so for
  adolescents only — both recorded, textbook preferred, 6 facts.
  ch 4 — self-efficacy and self-monitoring definitions; "most coaching effort targets
  self-efficacy"; closed-question examples; three not-SMART examples with reasons
  (incl. 50 lb in 2 months being unsafe for most); programmes built on ability, health
  concerns and goals; and stage timings that **corroborate the stage definitions over
  the worksheet** (resolves open question 13 toward the definitions) — 20 facts.
  Everything else the guide lists for these chapters was already present. Business,
  networking and code-of-conduct lines: approved skip. **Chapter 4 complete.**

- **20 Oct — 5.1 pp 157–171 done, 116 facts** (counter cross-checked by hand: 144 quoted
  − 19 src/id − 16 meta + 7 numbers). New file **`anatomy.js`** — its `meta` lists the
  exercise library's 13 muscle tags so every muscle mapped later uses that vocabulary.
  `MOVEMENT_SYSTEM` (kinetic chain, domino effect), `NERVOUS` (neuron parts, central vs
  peripheral, afferent/efferent, somatic/autonomic, sympathetic/parasympathetic, reflex,
  four receptor types, three functions, proprioception with self-tests, the three
  mechanoreceptors incl. the 1–2 ms stretch reflex and the Golgi tendon organ's relaxing
  effect, life course with ageing figures), `SKILL_STAGES` (cognitive → associative →
  autonomous with what the coach does at each). **Source error recorded:** water listed
  as one of four primary electrolytes — confidence low. **Pass two:** 0 new. Learning
  objectives not extracted. Figures 5-1 to 5-8 refused.

- **20 Oct — 5.2 pp 172–185 done, 125 facts.** `anatomy.js` + `SKELETAL`: functions; bone
  and joint counts (checked: 80 + 126 = 206); bones as levers and support; remodelling
  (osteoclasts/blasts, peak by the thirties, Wolff's law, poor posture reinforcing
  itself); **weight-bearing vs non-weight-bearing loading** and when each fits; five
  bone types with tissue and examples; long-bone parts; **youth strength-training
  myth** and the evidence; bone markings (fossa, sulcus, five process kinds); spine —
  five segments, discs, functions, neutral spine and its three curves. **Pass two:** 0
  new. Deliberately removed: the source's memory aid for vertebra counts (a teaching
  device, not a fact). Tables 5-1 and 5-2 modelled as data. Figures 5-9 to 5-23 and a
  stock photo refused.

- **20 Oct — 5.3 pp 186–192 done, 78 facts.** `anatomy.js` + `JOINTS` (osteo- vs
  arthrokinematics; roll, slide, spin; synovial joints — share, parts, fluid, six types;
  non-synovial; joint functions; tendon vs ligament, collagen/elastin, the ACL example,
  **ligaments' poor blood supply → slow healing and adaptation**) and `BONE_LIFE`
  (growth plate; 90% of peak bone by 18 F / 20 M, peak ~30, stable 30–50, decline
  after; osteoporosis; peak-bone factors; weight-bearing and resistance exercise for
  bone and fall prevention). **Pass two:** 0 new. **Cross-reference:** the ligament
  healing fact belongs beside 1.4's ankle re-injury fact when `injuries.js` is built
  (open question 10). Figures 5-24 to 5-35 refused.

- **20 Oct — 5.4 pp 193–205 done, 128 facts.** `anatomy.js` + `MUSCULAR`: three muscle
  types; the seven ordered layers fascia → myofilament; connective tissue's role;
  strain vs sprain; tropomyosin/troponin; neural activation (junction, motor unit,
  action potential, acetylcholine); the five-step excitation-contraction sequence,
  power stroke and the two sliding-filament principles; muscle electrolytes and cramps;
  small vs large motor units and the all-or-nothing principle; type I, II, IIa, IIx
  properties; fibre mix by muscle (soleus/gastrocnemius → `Calves`, quadriceps →
  `Quads`); life course — peak 20–30, plateau to 50, then −1–2 %/yr mass and
  −1.5–5 %/yr strength, countered by resistance training. **Tag check run in the
  browser:** every `tag` in `anatomy.js` is one of the library's 13, and `meta.libraryTags`
  equals the set in `exercises.json`. 5.1's electrolyte note now points to 5.4's
  explanation. **Pass two:** 0 new. Table 5-3 modelled; figures 5-36 to 5-43 and a stock
  image refused.

- **20 Oct — Study-guide checklist, chapter 5** (SG pp 11–15). 4 refinements, 5 facts,
  tagged `SG.5`: nutrition as well as exercise drives bone mass in ageing; osteo-
  kinematics as visible limb movement; ligaments and fascia also support synovial
  joints; fascia around bones as well as muscles (textbook says muscles — both
  recorded). The guide repeats the water-as-electrolyte claim; already flagged.
  Everything else was present. Section counts unchanged by the additions, confirming
  counter v2 scopes nested `src` correctly. **Chapter 5 complete — 447 facts.**
- **Weight check after chapter 5:** five knowledge files, 125.8 KB of source text, no
  DOM, network or import statements. The spec's threshold for splitting is "a few
  hundred KB"; the files are already separate modules, so a screen that needs only one
  loads only one. Revisit at chapter 9.

- **20 Oct — 6.1 pp 206–218 done, 149 facts.** `anatomy.js` + `CARDIOVASCULAR` (heart
  position, chambers, sides, conduction SA → AV, stroke volume and cardiac output with
  worked figures — verified in the browser, blood composition and its three support
  mechanisms, vessels and capillary exchange, Frank-Starling, BP determinants).
  `assessments.js` + **`resting_heart_rate`** (bands, athletes' 40–60, measurement
  methods incl. **phone fingertip sensors possibly valid and face-scan HR not
  recommended**) and, on `blood_pressure`, the European >139/>89 threshold and the US
  staging (which supports reading "hypertension" as stage 1+ — see open question 9).
  Two safety cautions (anticoagulants and bruising from foam rolling/massage; venous
  pooling and light-headedness on standing) → residual `safety-cautions`, held for
  chapter 14/20. **Pass two:** 0 new. Learning objectives not extracted. Table 6-1
  modelled; Table 6-2 duplicates the BP classes already modelled; figures 6-1 to 6-7
  refused.

- **20 Oct — 6.2 pp 219–226 done, 105 facts.** `anatomy.js` + `RESPIRATORY`: functions;
  pump bones and muscles with **library tags** (scalenes and SCM → `Neck`, pectoralis
  minor → `Chest`, abdominals → `Core`; diaphragm and intercostals → `null`, no library
  group; upper trapezius noted as `Back`, the library's own tag for shrugs — checked in
  `exercises.json`, not guessed); quiet vs forced breathing; resting rate 12–16; Valsalva
  benefit, cost and rule; conducting vs respiratory airways; gas exchange; oxygen uptake
  and "fat needs oxygen"; abnormal patterns (>24 tachypnoea, <8 bradypnoea, signs,
  causes, posture) and diaphragmatic breathing. `scope.js` + `refer_abnormal_breathing`.
  Valsalva-with-hypertension and asthma-inhaler cautions → residual `safety-cautions`
  (now 4). **Pass two:** 0 new. Tables 6-3 and 6-4 modelled; figures 6-8 to 6-10 and a
  stock image refused.

- **20 Oct — 6.3 pp 227–235 done, 150 facts.** `anatomy.js` + `ENDOCRINE`: glands, hormones,
  target cells, carriers; insulin and glucagon and how exercise shifts them (insulin
  sensitivity gains possibly independent of diet and weight loss); catecholamines;
  cortisol (rhythm, causes of excess, why "high cortisol = overtraining" is too simple);
  testosterone (pathway, age, health), estrogen, growth hormone, IGF and mechano-growth
  factor (up to 48 h after training), thyroid and calcitonin; **six acute
  exercise-hormone findings** (5×10 squat at 75 % → testosterone up to 45 min, bench
  less; slow reps and slow eccentrics; high-intensity short-rest overload; extreme
  endurance → overtraining) and sleep (5–6 h typical vs ~2 h more needed; <6 h →
  glucose intolerance vs >7 h). The source's own limit — hormone responses are acute —
  is recorded, plus an `agentReading` (Bunyan's, excluded from counts) forbidding
  "boosts testosterone" as a reason to train. **Source error:** lipolysis glossed as
  "fat synthesis" — confidence low. **Pass two:** 0 new. **Cross-reference:** the five
  training findings (tempo, eccentrics, rest, large lifts) should be reconciled into
  `acute-variables.js` at chapter 20. Figures 6-11 to 6-13 and a stock image refused.

- **20 Oct — 6.4 pp 236–240 done, 77 facts.** New file **`nutrition-principles.js`**, with a
  header stating that Bunyan's Mifflin-St Jeor × activity maths is not changed by this
  file. `DIGESTION`: three regions in order, stomach juices and chyme, small-intestine
  absorption by segment, the enteric nervous system, large-intestine path, fluid
  balance, gut immune share (70–80 %), water and constipation, and exercise and transit
  time (combined aerobic + resistance beat aerobic alone). **Pass two:** 0 new. Figures
  6-14 to 6-17 refused.
- **20 Oct — 6.5 pp 241–242 (approved skip) read as the chapter checklist, 13 facts:**
  maximal oxygen consumption; oxygen lack and retained waste stiffening muscles and
  joints; digestion's dependence on endocrine and neural input and on diet, fluids,
  medication and activity; low fibre impeding digestion; and a broad referral line
  (headaches, anxiety, fatigue, poor sleep or circulation → refer immediately) →
  `scope.js` `refer_breathing_related_symptoms`, confidence medium because it is broader
  than the lesson text.
- **20 Oct — Study-guide checklist, chapter 6** (SG pp 16–20), 8 facts tagged `SG.6`:
  lipolysis defined as fat breakdown (**corroborates the 6.3 correction**), catabolic and
  anabolic definitions, a sharper Valsalva definition, large intestine using water to
  pass waste, and a **conflict** — the guide says exercise *increases* transit time,
  the textbook's evidence shows it falls; textbook followed. **Chapter 6 complete — 494
  facts + 8 SG.** Six knowledge files, 154.5 KB, no DOM/network/imports, all tags valid.

- **20 Oct — 7.1 pp 243–248 done, 41 facts.** `anatomy.js` + `MOVEMENT_SCIENCE`: the
  kinetic chain, regional interdependence with two examples, biomechanics vs
  kinesiology, what coaches need, the anatomic position, and ten location terms.
  Table 7-1's definitions modelled; **its examples replaced with Bunyan's own** (10 of
  the 41 values are those examples). Short section — mostly terminology and a figure.
  **Pass two:** 0 new. Learning objectives not extracted. Figures 7-1 to 7-3 refused.

- **20 Oct — 7.2 pp 249–256 done, 84 facts.** `anatomy.js` + `PLANES`: the three planes
  with their axes, motions (19 in all, incl. hyperextension's narrow meaning,
  dorsi/plantar flexion, eversion/inversion, foot abduction/adduction), joints and
  example exercises per plane; femoral-on-pelvic vs pelvic-on-femoral hip flexion; foot
  pronation (landing) and supination (push-off) as multiplanar combinations; normal vs
  hyper- and hypomobile movement. The per-plane exercise lists are a seed for tagging
  the library by plane later. **Pass two:** 0 new. Deliberately omitted: the source's
  memory analogies (glass hallway, dolphin fin, planting a garden) — teaching devices,
  not facts. Figures 7-4 to 7-7 and a stock image refused.

- **20 Oct — 7.3 pp 257–263 done, 50 facts** (dense sentences; count understates it).
  `anatomy.js` + `MUSCLE_ACTIONS`: isotonic (eccentric — efficiency, deceleration,
  greater capacity, **slower-lowering tempo rule**, anabolic advantage; concentric),
  isometric (dynamic stabilisation; the squat example), isokinetic; the muscle action
  spectrum with curl and squat walk-throughs; curl grips → which elbow flexor, with
  library tags; and **squat depth limited by ankle dorsiflexion** — heel lift short-term,
  ankle stretching long-term (relevant to the owner's ankle). **Library observation**
  (not acted on — `exercises.json` is outside this session): hammer and reverse curls
  are tagged primary `Biceps`, and only some carry `Forearms` as secondary although the
  source says the hammer grip emphasises the brachioradialis; "Hammer Curls" itself has
  none — for the §3.1 reconciliation (open question 15). **Pass two:** 0 new. Table 7-2
  modelled; figures 7-9 to 7-12 refused.

- **20 Oct — 7.4 pp 264–268 done, 90 facts.** `anatomy.js` + `MUSCLE_ROLES`: agonist,
  synergist, stabiliser (with feed-forward activation), antagonist — each with examples
  stated **per joint motion**, and 19 muscle → library-tag pairs, all validated in the
  browser (multifidus → `Back` and hip flexors → `null` because the library has no
  deep-stabiliser or hip-flexor group — both noted); one muscle in three roles
  (infraspinatus); open vs closed chain with traits and examples. **Source label
  recorded:** brachialis called a "forearm muscle" (it is upper arm) — confidence low.
  **New gap:** the lesson refers to an appendix of individual muscles, which is not in
  the PDF (added to the gaps list). **Library observation:** both "Hyperextensions"
  entries carry pattern `"Elbow extension"` — a back extension is hip/spine extension;
  added to open question 15. **Pass two:** 0 new. Figures 7-13, 7-14 refused.

- **20 Oct — 7.5 pp 269–282 done, 142 facts.** `anatomy.js` + `FORCE`: length-tension;
  muscle balance, reciprocal and altered reciprocal inhibition, over- vs underactive,
  and **the correction order** (assess → flexibility for overactive → strengthening for
  underactive); stretch-shortening cycle, amortisation, depth jump, agility, and the
  bench-bounce caution; force-velocity (concentric and eccentric); force-couples; local
  vs global systems with the four subsystems; levers (three classes) and torque, incl.
  the lateral-raise worked example. **New file `imbalances.js`** seeded with two partial
  patterns the section states outright — knees-in (adductors overactive, gluteus
  medius underactive) and anterior pelvic tilt (hip flexors overactive, transversus
  abdominis and internal obliques underactive). Multifidus was first added to the
  second and then **removed**: the sentence names only the two; adding it was inference.
  **New `MUSCLE_MAP`** in `anatomy.js` — the single place a muscle name maps to a
  library tag; 46 muscles, each with its basis (a library exercise that shows the
  convention, or "anatomy"); 5 untagged. Library evidence **corrected 7.4**: hip flexors
  → `Quads` (the library tags hip-flexor stretches Quads), not `null`. **New tool
  `tools/check-muscles.html`** enforces the one-vocabulary rule (imbalance muscles ∈
  MUSCLE_MAP, every tag ∈ exercises.json) — run: OK. **Source arithmetic:** the torque
  example compares distance differences ("11×", "5×"); lever-arm ratios (12×, 6×) give
  the stated "about half" exactly — both recorded. **Library observation:** "Cable Hip
  Adduction" is tagged `Quads`, "Band Hip Adductions" `Adductors` — added to open
  question 15. **Pass two:** 0 new. Omitted: the lever mnemonic (teaching device).
  Figures 7-15 to 7-24 refused.

- **20 Oct — 7.6 pp 283–287 done, 68 facts.** `anatomy.js` + `MOTOR_BEHAVIOUR`: motor
  control, learning and development; muscle synergies with **Table 7-3's four lifts
  modelled by `MUSCLE_MAP` names** (squat, shoulder press, bench, row — pectoralis major,
  deltoids and posterior deltoid added to the map; vocabulary check extended to cover
  synergies, still OK); proprioception and its alteration after injury (→ core and
  balance training); sensorimotor integration and why poor form causes injury;
  feedback — internal, and external as knowledge of results and of performance, each
  **faded as the person improves**, and the risk of dependence on external feedback.
  **Source claim recorded:** internal feedback "via the autonomic nervous system" —
  confidence low (proprioception is somatic). **Pass two:** 0 new. Table 7-3 modelled.
- **20 Oct — 7.7 p288 (approved skip) read as the chapter checklist, 5 facts** (needs for
  learning movement; what correcting movement requires; study each muscle's
  functions) → `MOTOR_BEHAVIOUR.summary`.
- **20 Oct — Study-guide checklist, chapter 7** (SG pp 21–24), 10 facts tagged `SG.7`:
  the four scapular motions (not named in the textbook text), lats as antagonist to the
  deltoids in a shoulder press, and the guide's alternative definition of the
  integrated performance paradigm (dampen → stabilise → accelerate) with the SSC's
  three phases. **Chapter 7 complete — 480 facts + 10 SG.** Seven knowledge files,
  189.0 KB, no DOM/network/imports, vocabulary check OK.

- **20 Oct — 8.1 pp 289–294 done, 78 facts.** `nutrition-principles.js` + `ENERGY`: ATP;
  bioenergetics terms; the first law and energy balance; carbon in → carbon out
  (mass leaves only as exhaled CO2); substrates and interconversion; the four fuels —
  glucose/glycogen, fat (with the source's 3,500 kcal/lb conversion and worked
  example, checked), protein (20 / 9 essential / 11 non-essential; protein sparing;
  negative balance), ketones (nutritional ketosis 0.5–1.5 mmol/L vs ketoacidosis);
  **VT1** (50/50 carbohydrate/fat) and **VT2**, the wall, gels. **Three source
  inaccuracies recorded, each with the correct statement and confidence low:** body fat
  "broken down into triglycerides" (it is triglyceride, broken into fatty acids);
  triglycerides "called" free fatty acids in blood (different molecules); ketones
  "metabolised anaerobically" (they are oxidised aerobically). The corrections are
  Bunyan's and are counted (6 values). The 3,500 kcal/lb figure is recorded only as the
  source's conversion — Bunyan's calorie maths is unchanged. **Pass two:** 0 new.
  Learning objectives not extracted. Figure 8-1 refused.

- **20 Oct — 8.2 pp 295–300 done, 78 facts** (same total as 8.1 — checked by hand, a
  coincidence). `nutrition-principles.js` + `ENERGY_SYSTEMS`: ~40 % of metabolic energy
  to work, rest heat; ATP structure and the ADP cycle; the three systems always
  summing to 100 % ("dimmer switches"); an all-out timeline; ATP-PC (10–15 s),
  glycolysis (stated capacity 30–60 s; carbohydrate runs out after ~1 h sustained →
  gels for >60 min events; pyruvate's two fates; lactic acid, acidosis and the Cori
  cycle), oxidative (Krebs, ETC, acetyl CoA, beta-oxidation, mitochondria and
  training). **Internal conflict recorded:** the same lesson gives glycolysis "about 2
  minutes" and "30–60 seconds" — both kept, confidence low. Palmitate's 129 ATP noted
  as the source's figure (modern estimates are lower). **Pass two:** 0 new. Omitted: the
  petrol / oil-refinery analogy (teaching device). Figures 8-2 to 8-8 refused.

- **20 Oct — 8.3 pp 301–306 done, 86 facts** (85 under 8.3 + the 8.2 conflict's
  "resolved" note, which sits in an 8.2 object). `nutrition-principles.js` +
  `EXERCISE_ENERGY`: intensity × duration; fuel by intensity; **system profile** from
  Table 8-1 (onset, exhaustion, limiting factor — its 30–60 s for glycolysis resolves
  the 8.2 conflict toward the shorter figure); steady state (O2 deficit → aerobic
  takeover → EPOC and its purposes); intermittent work and **work-to-rest rules** (<1 min
  → ~1 min recovery; longer intervals ~1:1); breathing markers of VT1 and VT2 and the
  **talk test**; the **fat-burning-zone myth** with Table 8-2's figures (the missing
  moderate-intensity carbohydrate cell derived as 60 and marked derived; both rows
  verified in the browser) and who benefits from which approach. **Pass two:** 0 new.
  Tables 8-1, 8-2 modelled; figures 8-9 to 8-11 refused.

- **20 Oct — 8.4 pp 307–310 done, 67 facts.** `nutrition-principles.js` + `DAILY_ENERGY`:
  energy balance; what changes needs; calorie vs kilocalorie; TDEE = RMR (~70 %) + TEF
  (7–10 % of food calories; protein highest) + EAT + NEAT (up to 20 % in manual jobs;
  ways to raise it); **RMR measurement** — calorimetry vs Harris-Benedict, Mifflin-St
  Jeor and Katch-McArdle, and the source's statement that **all prediction equations
  tend to underestimate RMR**, more so for muscular and clinical populations, and work
  poorly in obesity → **open question 16; Bunyan's formula unchanged.** ~5 kcal per
  litre of O2; PAL (printed "1:1–2:5", read as 1.1–2.5, confidence medium); METs.
  **Consistency check passed:** the source's 3.5 mL/kg/min and 5 kcal/L give exactly
  Bunyan's `MET × 3.5 × kg / 200` per minute — verified in the browser (80 kg, 5 MET,
  30 min = 210 kcal both ways). That note and the `bunyan` field are Bunyan's and are
  counted (about 4 values). **Pass two:** 0 new. Figure 8-12 refused.
- **20 Oct — 8.5 p311 (approved skip) as checklist, 6 facts:** ATP the only direct
  energy for contraction; glycolysis carbohydrate-only; oxidative the only pathway for
  all substrates incl. ketones (**supports the 8.1 ketone correction**); steady state
  lasts several minutes; every system contributes in intervals.
- **20 Oct — Study-guide checklist, chapter 8** (SG pp 25–27), 8 facts tagged `SG.8`:
  example exercises per energy system (sprints/Olympic lifts/plyometrics; 8–12-rep
  strength training; extended running); glycolysis 30–60 s (corroborates 8.3);
  ketones oxidised aerobically (corroborates the correction); glycogen stores far
  smaller than fat stores. **Chapter 8 complete — 315 facts + 8 SG.** Seven files,
  208.2 KB, no DOM/network/imports.

- **20 Oct — 9.1 pp 312–320 done, 83 facts.** `scope.js` + three rules: **nutrition in
  scope** (16 things a coach may do for healthy people), **nutrition out of scope** (11
  things never to do — meal plans, menus, therapy, very-low-calorie, fasting/detox,
  food-group bans, diets for chronic conditions, eating-disorder counselling…), and
  **refer_nutrition** with the credentials to refer to — Table 9-2 and 9-1 modelled and
  reworded, plus the source's two worked cases as one in-scope and one out-of-scope
  example; `agentReading` added for the out-of-scope rule. `nutrition-principles.js` +
  `NUTRITION_BASICS`: definition, roles, macro energy (4/4/9 + alcohol 7 — **matches
  `CLAUDE.md`'s macro formula**), micronutrients, how to judge a nutrition claim and the
  credible sources. **Pass two:** 0 new. Learning objectives not extracted.

- **20 Oct — 9.2 pp 321–330 done, 206 facts.** `nutrition-principles.js` + `PROTEIN`:
  functions; structure; all 20 amino acids by class, BCAAs, conditionally essential
  ones and when; complete vs incomplete sources with each group's limiting amino acid;
  mutual supplementation (same day suffices); quality — PER, BV, PDCAAS (0.9–1.0 vs
  0.4–0.7), NPU, and the 30 g example; digestion and liver fates; protein for energy;
  what needs depend on; RDA 0.8 g/kg and AMDR 10–35 %; **daily targets kept as four
  separate entries by population and source** (0.8; 1.6–1.7; 1.2–1.4; 1.4–2.0 g/kg) and
  **three separate per-meal recommendations** — granularity preserved, nothing merged;
  needs in a deficit; three myths with the evidence; the >2.2 g/kg discussion. **App
  check:** Bunyan's protein goal is user-entered (`S.goals.p`), not derived — no
  conflict. **Source inconsistencies recorded:** "11 non-essential" but 10 listed; "up to
  2.2 g/kg" called very high, then ">2.2 g/kg" called safe. **Pass two:** 0 new. Tables
  9-4 to 9-6 modelled; figures 9-1 to 9-3 and a stock image refused.

- **20 Oct — 9.3 pp 331–338 done, 142 facts.** `nutrition-principles.js` + `CARBOHYDRATE`:
  importance vs protein; mono-, di-, polysaccharides with sources; **fibre targets by
  sex** (women 25–28 g, men 30–34 g, ages 19–50) and soluble vs insoluble with foods
  and benefits; digestion and fate of excess; blood-sugar response; **glycemic index
  bands** (≤55 / 56–69 / ≥70 — boundaries checked in the browser) and glycemic load (the
  popcorn example); needs, AMDR 45–65 % with a 130 g floor; **five activity-based
  g/kg rows kept separate** (3–5, 5–7, 6–10, 8–10, 8–12 ultra) — not merged; fuel use
  by intensity; before / during / after timing. **Source wording recorded:** the 130 g
  floor is said to be "based on a 2,000-kcal diet", but 45 % of 2,000 kcal is 225 g —
  noted, confidence medium. **Pass two:** 0 new. Tables 9-7 to 9-12 modelled; figure
  9-4 refused.

- **20 Oct — 9.4 pp 339–345 done, 122 facts.** `nutrition-principles.js` + `LIPIDS`:
  9 kcal/g; triglycerides (98 % of stored, 95 % of food lipids), phospholipids, sterols;
  saturation; five fat types with benefits and foods (omega-3 sources mapped to EPA/
  DHA/ALA); omega-6:omega-3 (~4:1 optimal vs 10–20:1 Western; evidence leans to obesity
  and inactivity); digestion to chylomicrons and lipoprotein lipase; AMDR 20–35 %;
  **saturated-fat limits kept as three separate guideline entries** (US 10 %, Australia
  10 %, UK 11 %); satiety; cholesterol (dietary cholesterol has little effect on blood
  cholesterol for most healthy people; refer personal concerns). **Source wording
  recorded:** HDL said to remove triglycerides to the liver — HDL's recognised role is
  cholesterol transport; confidence low. **Pass two:** 0 new. **Cross-reference:** the
  1.3 residual `dyslipidaemia` entry (LDL <100, HDL ~60) is consistent with this. Tables
  9-13, 9-14 modelled; figure 9-5 refused.

- **20 Oct — 9.5 pp 346–359 done, 325 facts.** `nutrition-principles.js` +
  `MICRONUTRIENTS` (all 13 vitamins with roles, deficiency diseases and foods; the two
  B-vitamin groups; 7 major and 9 trace minerals with roles and foods) and `HYDRATION`
  (functions; **daily fluid kept separate by sex** — women 2.7 L, men 3.7 L; what raises
  needs; water-rich foods; eight effects of dehydration; urine colour; >4 % body-weight
  loss danger; **the seven-step event protocol**, each timing its own entry; 125 %
  post-exercise replacement with the worked example checked in the browser; sports
  drinks and the three tonicities). **Table cells lost in plain-text extraction were
  recovered from a layout re-extraction** (B6 and B5 sources, potassium and selenium
  roles) — not guessed. **Three source inaccuracies recorded, confidence low:** the
  essential-vitamin exceptions are given with the reason reversed; "Cori (Krebs) cycle"
  conflates two cycles; hypertonic drinks said to absorb fastest (hypotonic do). One
  garbled table cell (the >90 min row) noted. **App observation:** the default water
  goal is 3,000 mL for everyone; the source's figures differ by sex — open question 18.
  **Pass two:** 0 new. Tables 9-15 to 9-20 modelled; figures 9-6, 9-7 (incl. the urine
  colour chart) and a stock image refused.

- **20 Oct — 9.6 pp 360–364 done, 83 facts.** `nutrition-principles.js` +
  `WEIGHT_MANAGEMENT`: six factors (modifiable or not, refer or not); energy balance,
  energy density (orange vs smoothie) and whole vs processed foods; **sleep 7–9 h** for
  adults 18–64, the ghrelin / peptide YY mechanism and next-day intake (cross-referenced
  with 6.3's 5–6 h typical); endocrine disorders and medications that change weight;
  BMR and how far it can be raised (marginally — EAT and NEAT matter more); **adaptive
  thermogenesis** with the 250 → 175 lb example. **App check:** `bmr()` already uses the
  latest logged weight, so Bunyan's maintenance target falls with weight loss as the
  source advises. `scope.js` + `refer_weight_medical`. **Pass two:** 0 new. Figure 9-8
  refused.

- **20 Oct — 9.7 pp 365–372 done, 119 facts.** `nutrition-principles.js` + `FOOD_LABELS`:
  what every label carries; US panel (per serving, dual column for 1–3 servings, total
  vs added sugars and the <10 % added-sugar limit, Table 9-21's twelve questions
  reworded, % DV with **≤5 % low / ≥20 % high**, nutrients with no DV and why); UK/EU
  panel (**per 100 g / 100 mL — the convention Bunyan's Open Food Facts scanner uses**),
  % RI, traffic-light colours; ingredient order, allergens, UK percentage rule, list
  length as a processing signal; what to look at by goal. **Source slip recorded:** the
  protein question mentions "carbohydrate needs". **Pass two:** 0 new. Table 9-21
  reworded as questions; figures 9-9 to 9-13 (label images) refused.

- **20 Oct — 9.8 pp 373–381 done, 172 facts.** `nutrition-principles.js` +
  `GOAL_STRATEGIES`: **fat loss** — moderate 500 kcal/day deficit (**matches Bunyan's
  "lose"**), seven swaps with Bunyan's own examples (Table 9-22's reworded), MyPlate /
  Eatwell, EAT minimum 150 min moderate or 75 min vigorous a week (the first activity
  guideline the source has given), NEAT, and **three deficit-protein findings kept
  separate** (2.3–3.4; 1.6–2.2 for athletes; 2.4); **muscle gain** — surplus optional if
  protein is high, else 350–500 kcal/day (**Bunyan's "gain" is +250 — open question
  19, no change**), protein 1.6–2.2 (1.6 best in some studies), HBV, carbohydrate
  4–7 g/kg, fat 20–35 % and not below 15–20 %, meal frequency, the anabolic window
  revised to 24–48 h; **performance** — kcal/kg by athlete type, carbohydrate 5–12 /
  8–10, protein 1.2–2.0, timing (1–4 g/kg 1–4 h before; 30–60 g/h over 90 min;
  1 g/kg/h and 0.3 g/kg/h protein after for up to 4 h), sleep 7–9 h and 9–10 h for
  hard training. **Two internal conflicts recorded:** recreational kcal/kg 25–35 (text)
  vs 25–30 (table); per-meal protein 0.25–0.40 here vs 0.25–0.55 in 9.2 from the same
  cited position. **Pass two:** 0 new. Tables 9-22 to 9-24 modelled, examples reworded.

- **20 Oct — Study-guide checklist, chapter 9** (SG pp 28–30), 5 facts: `SG.9` — the
  guide calls vitamins and minerals "inorganic" (vitamins are organic; confidence low);
  the 12–16 oz every 10–15 min rule qualified as "for activities over 60 minutes".
  `SG.8` (on the same page, chapter 8's terms) — RMR measured fasted and at complete
  rest. Everything else it lists was present. **Chapter 9 complete — 1,253 facts + 5
  SG.**
- **Weight check after chapter 9: 265.2 KB** across seven knowledge files, no DOM,
  network or imports. The spec says to split once past "a few hundred KB" so people who
  never open coaching never download it. They are already separate modules and nothing
  in the app imports them yet; the coaching engine should `import()` them on demand.
  `nutrition-principles.js` is the largest — split it further if one coaching screen
  only needs part of it. Sizes:
  adherence.js 68.9 KB
  anatomy.js 78.9 KB
  assessments.js 5.6 KB
  imbalances.js 1.7 KB
  nutrition-principles.js 76.8 KB
  residual.js 19.1 KB
  scope.js 14.9 KB

- **20 Oct — 10.1 pp 382–385 done, 63 facts.** New file **`supplements.js`** — its header
  states it is education only and points to the two `scope.js` rules that forbid
  recommending supplements; split out from `nutrition-principles.js` so screens that
  never touch supplements never load it. `BASICS`: the coach's position (asked, asked to
  sell, influencer roles — stay in scope); the legal definition and ingredient classes;
  oral-only forms; regulation after release, not before, and what that means for
  quality; use by country and age; multivitamin association vs causation. History and
  market size → residual (`supplement-history` new topic, `epidemiology`). **Pass two:**
  0 new. Learning objectives not extracted; one stock image.

- **20 Oct — 10.2 pp 386–396 done, 292 facts.** `supplements.js` + `REGULATION` (four
  regions, natural-or-replica rule, risks, manufacturing practice), `RESPONSIBLE_USE`
  (not food; upper limits and toxicity; dose; the six rules reworded), `REFERENCE_VALUES`
  (**all 27 micronutrients with adult and pregnancy/lactation DV and UL**, the RAE and
  DFE conversions and the age-specific UL notes; **8 macronutrient DVs**), `LABELS`
  (required fields, food vs supplement listing, proprietary blends, other ingredients,
  claims and the US disclaimer, the eight allergens, warnings, two examples),
  `THIRD_PARTY` (five testing programmes). **Tables 10-1 and 10-2 were scrambled in
  plain text and recovered from a layout re-extraction** — every value read, not
  inferred; a sanity check in the browser found only magnesium with DV > UL, which the
  source explains (supplement-only UL). **Table 10-3's X marks did not align in either
  extraction**, so each tester's coverage is taken from the prose and the table noted
  as illegible. **Cross-reference:** the 2,300 mg sodium DV confirms the residual
  `nutrition` entry held from 4.5. **Pass two:** 0 new. Figures 10-1 to 10-3 refused.

- **20 Oct — 10.3 pp 397–407 done, 352 facts.** `supplements.js` + `HEALTH_SUPPLEMENTS`:
  active vs inactive vitamin forms; fat-soluble (A, D with blood-level positions of two
  bodies and the Endocrine Society intake — checked: 1,500–2,000 IU = 38–50 mcg, 4,000 IU
  = the 100 mcg UL; deficiency by region and who is at risk; E; K and its warfarin
  interaction); water-soluble (C absorption ceiling; B-complex toxicity, folate dosing
  and masking of B12, each B deficiency; choline intakes incl. the egg effect);
  minerals (16 essential, 14 labelled; calcium forms; antinutrients; magnesium;
  electrolytes and salty sweat; iron heme vs non-heme absorption and who is at risk;
  iodine; zinc; chromium's limited evidence); the multivitamin study; omega-3 (EPA/DHA
  vs ALA conversion 5–15 %, 250 mg minimum, 1–4 g optimal, ratios). **Header restates:
  doses are reference, never advice to a user.** **Count difference recorded:** cobalt
  listed as a trace mineral here (10) but not in 9.5 (9). **Pass two:** 0 new. Omitted:
  the scurvy pun (memory aid). Table 10-5 modelled; figures 10-4 to 10-7 refused.

- **20 Oct — 10.4 pp 408–419 done, 236 facts.** `supplements.js` + `ERGOGENIC`: caution
  and liability; protein (leucine as the trigger, 0.05 g/kg/meal, 3 h signal; leucine
  ranking whey > egg > soy > wheat; total → quality → timing; powders; EAA alternative;
  post-workout meta-analysis; the 80 kg / 120 g portion example, checked = 1.5 g/kg);
  creatine (mechanism, monohydrate, 5 g / up to 10 g, optional 20 g × 5–7 d loading, no
  cycling, 2–3 g low-gain option = 0.03 g/kg, kidney and cramp myths); caffeine (uses,
  mechanism, +5–9 % endurance, not strength, forms, 3–6 mg/kg ~1 h before, 85–90 %
  responders, >400 mg side effects, ~10 g lethal); ethics and legality (three questions,
  good-study checklist, 25 % adulteration, FDA database); banned stimulants (DMAA,
  ephedra) and **anabolic steroids — definition, legal status and harms only (Table 10-7,
  columns recovered from a layout extraction after a first pass misassigned shared
  items)**; the coach's role. `scope.js` + `refer_stimulants` and **`no_ped_guidance`**
  — the latter's `agentReading` carries the owner's 20 Oct instruction: no PED dosing,
  cycles, stacks or sourcing. **Internal tension recorded:** 6 mg/kg caffeine exceeds the
  source's own 400 mg threshold above ~67 kg (low confidence). **Pass two:** 0 new.
  Tables 10-6, 10-7 modelled; figure 10-8 and a stock image refused.

- **20 Oct — Study-guide checklist, chapter 10** (SG pp 31–33), 9 facts tagged `SG.10`:
  the UL definition and "do not exceed it unless a dietitian or physician directs";
  adverse effects from product change or contamination; ergogenic aid = "performance
  supplement", may target body composition; the guide's framing of 0.03 g/kg creatine
  as the *minimum effective* dose (the textbook frames it as the low-gain option — both
  recorded). The guide's steroid table **matches the corrected columns** (corroboration
  of the 10.4 fix). Chapter 10 has no summary lesson. **Chapter 10 complete — 943 facts
  + 9 SG.** Eight knowledge files, **306.0 KB**, no DOM/network/imports. Past the
  spec's "few hundred KB" mark: the files remain separate, on-demand modules; nothing
  in the app imports them, so a user who never opens coaching downloads none of it.

- **20 Oct — 11.1 pp 420–429 done, 146 facts.** `assessments.js` + `SCREENING` (why screen,
  HRA vs fitness assessment, subjective vs objective, eight purposes, PAR-Q+ structure
  only — instrument not reproduced — HHQ fields and privacy, lifestyle questions for
  exercise/diet/sleep/stress/occupation/recreation, medical history); `imbalances.js` +
  `CAUSES` (prolonged sitting → hip flexors overactive, rounded shoulders, forward head;
  high heels → tight calves, lost dorsiflexion, overpronation) and `INJURY_EFFECTS`
  (**ankle sprain → reduced gluteus medius and maximus activation** — directly relevant
  to the owner's rehab; knee, low back, shoulder); `scope.js` + `refer_symptoms`.
  Vocabulary check extended to causes and injuries — OK. **Pass two:** 0 new. Figure
  11-1 (PAR-Q+ image) refused.

- **20 Oct — 11.2 pp 430–433 done, 25 facts.** `assessments.js` + `PROTOCOL`: comfort and
  rationale; **sequencing** (no-exertion tests first — HR, BP, skinfolds — because
  exertion and vasodilation skew them; flexibility after a warm-up); CPR/AED and the
  emergency plan; pre-test preparation (24 h fluids; no heavy food, tobacco, alcohol or
  caffeine for 3 h; no exercise that day or the day before; sleep); explain,
  demonstrate, practise. **GAP: the exercise-test termination criteria exist only as
  Figure 11-3 (an image) — not extractable; recorded as `criteria:null` with a note that
  they must come from a readable source before any exertion test ships (open question
  20).** Figure 11-2 (rationale) likewise image-only. **Pass two:** 0 new.

- **20 Oct — 11.3 pp 434–438 done, 48 facts.** `assessments.js`: `resting_heart_rate` +
  protocol (indicator of training status; **men ~5–10 bpm below women — compare each
  person only with themselves**; measure before getting up; **radial, not carotid**,
  because of the vagus nerve); `blood_pressure` + protocol (systolic vs diastolic;
  which predicts mortality by age; **action per class** from maintain to immediate
  medical attention; brachial site; six measuring steps; arm-to-arm discrepancy →
  physician). `scope.js` + `refer_blood_pressure`. A brace error in the first edit was
  caught by the browser import and fixed. **Pass two:** 0 new. Table 11-1 modelled;
  figures 11-4 to 11-7 refused.

- **20 Oct — 11.4 pp 439–453 done, 157 facts.** `assessments.js` + eight entries: BMI
  additions (lowest risk 22–24.9; worked example checked = 25.1 both ways), healthy
  body-fat ranges (men 10–20 %, women 20–30 %), **waist** (thresholds and four bands by
  sex), **waist-to-hip ratio**, seven circumference sites, **skinfolds**
  (`notSelfAdministrable` — sites, technique, three protocols), **bioimpedance** (and what
  skews it), **hydrostatic** (`notSelfAdministrable`). **Tables 11-3 and 11-4 recovered
  from a layout extraction.** **Two source inconsistencies recorded:** women's waist
  threshold 88 cm in the text vs the table's 90 cm "high" start; men's WHR 1.0 in both
  "moderate" and "high". **Refused:** Table 11-10 (Durnin-Womersley lookup) is an image —
  only the worked example kept. **Pass two:** 0 new. Figures 11-8 to 11-11 refused.

- **20 Oct — 11.5 pp 454–466 done, 371 facts.** `assessments.js` + seven entries:
  cardio overview (VO2max, peak age, **decline 5 %/decade fit vs 10 % unfit**, why
  submaximal), **RPE** (1–10 scale and 6–20 anchors, recovered from a layout extraction;
  Bunyan's set RPE is 1–10), **YMCA step test**, **Rockport walk**, **1.5-mile run** (each
  with steps and **full norms by sex and age**, recovered from a layout extraction; gaps
  and one reversed cell kept as printed), **VT1 talk test** (increments, stage length,
  continuous-talk rule, judging criteria, the worked example) and **VT2 20-minute test**
  (0.95 correction; example checked = 169 bpm). All five field tests are
  self-administrable with a phone, tape or track. **Partly fills the 11.2 safety gap:**
  each test names its stop symptoms (light-headedness, dizziness, chest pain,
  excessive breathlessness) — added to `PROTOCOL.termination.partial`; the full criteria
  remain image-only (open question 20). **Pass two:** 0 new. Norm tables modelled as
  data, not reproduced as tables.
- **20 Oct — 11.6 p467 (approved skip) as checklist, 5 facts:** HRA as a legal and
  ethical duty; choosing assessments; direct VO2max risk; what each body-composition
  method is good for; exercise vs resting BP.
- **20 Oct — Study-guide checklist, chapter 11** (SG pp 34–35 and the Section 4 excerpt
  pp 1–2): one new item, the definition of a contraindication (`SG.11`). **The Section 4
  excerpt's chapter-11 pages are word-for-word the main guide's** — a duplicate of the
  guide, not separate material. **Chapter 11 complete.**

- **20 Oct — 12.1 pp 468–470 done, 18 facts.** `imbalances.js` + `BASICS` (what an
  imbalance is, causes, over- vs underactive as *relative* terms, posture as a roadmap,
  carry-over from static to movement); `assessments.js` + `posture_overview`. **Pass
  two:** 0 new. Learning objectives not extracted.

- **20 Oct — 12.2 pp 471–475 done, 116 facts.** `assessments.js` + `static_posture`
  (method, five checkpoints, **three views with every checkpoint's ideal and faults**,
  plumb lines); **`imbalances.js` + the three full distortion patterns** —
  pes planus, lower crossed, upper crossed — static positions plus over- and underactive
  muscles, **the first `complete:true` patterns**. Tables 12-1 to 12-3 were column-mixed in
  plain text; recovered from a layout extraction **and cross-checked against the
  Section 4 study guide**, which matches. `MUSCLE_MAP` + 4 muscles (lumbar extensors,
  rhomboids, levator scapulae, deep cervical flexors); vocabulary check OK (53 muscles,
  5 patterns). The 7.5 anterior-pelvic-tilt seed now points to lower crossed. **Pass
  two:** 0 new. Tables modelled, not reproduced; figures 12-1 to 12-4 refused.

- **20 Oct — 12.3 pp 476–494 done, 192 facts.** `assessments.js` + `dynamic_posture`,
  `overhead_squat`, `single_leg_squat`, `pushing`, `pulling` (start, movement, ideal, faults,
  self-administration via phone video). **`imbalances.js` + `MOVEMENT_FAULTS`: twelve
  finding → overactive / underactive mappings** (OHSA five, single-leg one, push three,
  pull three) — the assessment-to-correction join the ERD needs. **All four solutions
  charts (Tables 12-5, 12-7, 12-9, 12-11) were column-mixed in plain text and recovered
  from a layout extraction.** `MUSCLE_MAP` + 5 (TFL → `Glutes` with confidence medium —
  no library group; rectus femoris and psoas → `Quads` per the library's hip-flexor
  convention; external obliques → `Core`; teres major → `Back`); vocabulary check
  extended to faults — OK (58 muscles). **Gap:** the push and pull starting positions
  are shown only in figures (p488 has no text) — recorded `start:null`. **Pass two:** 0
  new. Findings sheets 12-4/6/8/10 modelled as fault lists; figures 12-5 to 12-24
  refused.

- **20 Oct — 12.4 pp 495–499 done, 70 facts.** `assessments.js` + `performance_overview`,
  `push_up_test` (60 s, 90° elbows, kneeling option, reassess every 4–6 weeks; no norms in
  the source), `bench_press_strength` and `squat_strength` (3-rep sets, 2 min rest, load
  steps 10–20 lb or 5–10% for bench and 30–40 lb or 10–20% for squat, 1RM from the conversion
  chart; both `selfAdministrable:false`, spotter required), `training_load` (most clients
  need no 1RM test; choose loads by trial). **Gap 6:** the PDF stops 12.4 after the
  vertical jump's introduction. The vertical jump protocol and the long jump, LEFT,
  40-yard dash and pro shuttle pages are missing, so only their one-line purposes from the
  12.6 summary are recorded. **Pass two:** 0 new. Figures refused.

- **20 Oct — 12.5 pp 500–506 done, 66 facts.** `assessments.js` + `assessment_sequence`
  (order from screening to performance; cardio and performance on separate days; why
  exertion skews early tests; pain → medical evaluation; progress only when able; rapport
  use; reassess monthly or quarterly, with three reasons; **modifications for four
  populations**: overweight/obese, youth, older adults, prenatal (no prone or supine in the
  2nd and 3rd trimesters, medical clearance)). `scope.js` + `refer_pain_movement`. The
  sales and recruiting framing was skipped as business content, keeping only the
  client-facing communication rule. **Pass two:** 0 new.

- **20 Oct — 12.6 pp 507–508 (approved skip), read as a checklist, 9 facts:**
  single-leg squat only for people not at fall risk; what push/pull evaluates; choose
  assessments by goal; and the one-line purposes of the performance tests whose pages are
  missing (12.4 gap 6). These come from the summary itself, not from general knowledge.

- **20 Oct — Study-guide checklist, chapter 12** (SG pp 36–40 and the Section 4 excerpt
  pp 3–7): every pattern and solutions-chart muscle matches what was modelled from the
  layout extraction. One new item: when to use the single-leg squat (`SG.12`). The
  excerpt's chapter-12 pages repeat the main guide again. **Chapter 12 complete,
  except gap 6.**

- **20 Oct — 13.1 pp 509–517 done, 69 facts.** **New file `phases.js`** + `PRINCIPLES`:
  what integrated training is, its four benefit groups, and seven programming rules
  (systematic and progressive, with the consequences of skipping steps vs following them;
  the five fundamental movement patterns and pattern splits vs body-part splits; posture
  symmetry; ROM with scar-tissue constraints; all three planes; the ten acute variables
  with definitions; designing from assessment results). Chef-salad and house analogies
  not extracted. **Pass two:** 0 new.

- **20 Oct — 13.2 pp 518–522 done, 68 facts.** `phases.js` + `COMPONENTS`: the seven
  training components, each with definition, who it is for and benefits (Tables 13-2 to
  13-8 modelled as lists). **Pass two:** 0 new.

- **20 Oct — 13.3 pp 523–527 done, 106 facts.** `phases.js` + `LEVELS` (three) and
  **`PHASES` (five)**: purpose, adaptation, method, who, precedes/follows, readiness,
  example supersets (Tables 13-9 and 13-10). Table 13-10's power column is unaligned in the
  PDF and was **confirmed against the study guide**. `PROGRESSION` covers start, optional
  phases and return to phase 1. **Every phase's `variables` is `null` until chapter 21**
  (the spec wants reps/sets/tempo/rest/%1RM, which ch 13 does not give). Goal routing is
  only `agentReading` until 21. Figures 13-1 to 13-4 refused. **Pass two:** 0 new.

- **20 Oct — 13.4 pp 528–529 (approved skip), checklist, 1 fact.** The SG ch 13 checklist
  (pp 41–42) has nothing new and confirms the Table 13-10 pairs. **Chapter 13 complete.**

- **20 Oct — 14.1 pp 530–534 done, 37 facts.** **New file `corrective.js`** + `FLEXIBILITY`:
  definitions (flexibility, extensibility, mobility), eleven limiting factors, relative
  flexibility with two worked compensations, and Table 14-1's multiplanar requirements for
  three muscles, modelled as fields. **Pass two:** 0 new.

- **20 Oct — 14.2 pp 535–541 done, 71 facts.** `corrective.js` + `DYSFUNCTION`: kinetic-chain
  regions, causes and effects of imbalance, **altered reciprocal inhibition and synergistic
  dominance with muscle-level examples** (named per `MUSCLE_MAP`; checked), joint
  dysfunction, neuromuscular efficiency, autogenic inhibition, the three sources of ROM
  gain, and the lengthening reaction as steps. Spindle, GTO and reciprocal inhibition
  basics already sat in `anatomy.js` (7.x), so they were not duplicated. The basketball
  analogy was not extracted. **Pass two:** 0 new.

- **20 Oct — 14.3 pp 542–544 done, 28 facts.** `corrective.js` + `RATIONALE`: pattern
  overload with examples, **the cumulative injury cycle as six ordered steps**, Davis's
  law, the four purposes of flexibility work, and the targeting rule (stretch only
  overactive muscles; the lower-crossed example). **Pass two:** 0 new.

- **20 Oct — 14.4 pp 545–556 done, 106 facts.** `corrective.js` + `TECHNIQUES.self_myofascial`:
  tools, mechanism (autogenic inhibition), mechanical vs neural effects, **prescription:
  1–3 sets, hold each tender spot ≥30 s**, DOMS (24–72 h), the no-roll zones, ten regions,
  and **Table 14-3 precautions (15) and Table 14-4 contraindications (22)** as lists, plus
  the rule that five conditions can fall either way. `SEQUENCE_RULES`: roll before
  stretching, and in the cool-down. **New file `cues.js`**: 7 SMR exercises keyed to
  library ids, ≤2 cues of ≤10 words, checked by the new `tools/check-cues.html` (OK).
  `SEQUENCE` (the spec's four stages) is a scaffold with `technique:null` until the source
  names the stages, so nothing is inferred. Library notes go to open question 15
  (Lower Back-SMR and Neck-SMR vs the source's no-roll zones). Product photos and video
  links refused (brand names). **Pass two:** 0 new.

- **20 Oct — 14.5 pp 557–573 done (image-heavy), 99 facts.** `corrective.js` +
  `TECHNIQUES.static_stretch`: definition, mechanisms (stretch tolerance; reciprocal
  inhibition when the antagonist is contracted, with two muscle-level examples),
  **prescription 1–3 sets × 30 s**, the three usage rules, the strength/power debate
  resolved as data (acute holds of 2 min or more before maximal efforts impair power;
  habitual holds of 30 s or less followed by dynamic work do not), overstretching signs,
  and **seventeen stretches** with target muscles (MUSCLE_MAP names, checked) and key
  points in Bunyan's words. `MUSCLE_MAP` + adductor magnus → `Adductors` (59 entries).
  `cues.js` + 5 library stretches (Side Neck Stretch matched with medium confidence).
  The other 12 stretches have no clear library twin and are queued for §3 name
  reconciliation, not forced. `check-muscles.html` now also checks `corrective.js` (OK).
  Photos and video links refused. **Pass two:** 0 new.

- **20 Oct — 14.6 pp 574–590 done (image-heavy), 37 facts.** `corrective.js` +
  `TECHNIQUES.active_stretch`: mechanism (reciprocal inhibition, with the quadriceps →
  hamstring example), **prescription 1–3 sets, 1–2 s holds × 5–10 reps**, use (pre-activity),
  order (after SMR and static stretching), the posture tip (chin tuck, drawing-in). Twelve
  stretches share the static positions, so they are recorded as `sameAsStatic` ids
  instead of being duplicated; the gastrocnemius and soleus versions differ and are listed.
  **Pass two:** 0 new.

- **20 Oct — 14.7 pp 591–609 done (image-heavy), 76 facts.** `corrective.js` +
  `TECHNIQUES.dynamic_stretch` (**1 set, 10–15 reps, 3–10 exercises**; the text says 10
  reps and the table says 10–15, so both are recorded with confidence medium; readiness;
  dose without fatigue; thirteen drills), `COMBINING` (research findings and order) and
  **`CONTROVERSIAL`**: five risky stretches, each with the structures stressed and who must
  avoid it, plus the athlete exception. `cues.js` + Arm Circles and Rope Jumping.
  **Library flag (open question 15):** "Standing Toe Touches" is the straight-leg toe
  touch the source calls controversial. Not removed (the library is outside this
  session), and it gets no cue. Figures 14-18 to 14-22 refused. **Pass two:** 0 new.
- **20 Oct — SG ch14 checklist (pp 43–45):** one new item. The chapter-14 notes run onto SG p45 and give a **third dynamic-stretching prescription** (1–3 sets × 5–10 reps), now recorded beside the text (1 × 10) and the table (1 × 10–15) as `SG.14`. Every other definition and
  prescription it lists is already modelled. **Chapter 14 complete.**

- **20 Oct — 15.1 pp 610–612 done, 13 facts.** **New file `cardio.js`** (new schema: the
  spec has no cardio file, and chapter 15 is a self-contained programming system).
  `BASICS`: the five health components, cardio fitness as a mortality predictor, and
  rate of progression as the common error. **Pass two:** 0 new.

- **20 Oct — 15.2 pp 613–625 done, 92 facts.** `cardio.js` + `GUIDELINES` (FITTE-VP:
  150/75 min, 300/150 for more benefit, ≥250 min for weight loss, 1,200–2,000 kcal/week,
  NEAT, **≤10% weekly volume increase**), `INTENSITY_METHODS` (VO2max, **Tanaka
  208 − 0.7 × age**, **Karvonen HRR**, MET, RPE → `assessments.js`, talk test; the worked
  examples were checked, and the source rounds 119.85 to 120) and `FORMATS` (intervals,
  HIIT, Tabata 20/10 × 8, fartlek). Tables 15-1 and 15-4 modelled; the RPE tables were
  already in `assessments.js` (11.5). **No app change:** Bunyan has no HR-zone code. If
  zones are added, Tanaka and Karvonen are the source's formulas. **Pass two:** 0 new.

- **20 Oct — 15.3 pp 626–629 done, 76 facts.** `cardio.js` + `SESSION`: warm-up (general
  vs specific, 5–10 min low to moderate, Table 15-5 benefits → effects), conditioning
  benefits (Table 15-7), cool-down (5–10 min, five goals), and the example warm-up and
  cool-down (Tables 15-6 and 15-9, **column-mixed in plain text and recovered from a
  layout extraction**). **Pass two:** 0 new.

- **20 Oct — 15.4 pp 630–638 done, 143 facts.** `cardio.js` + **`ZONES` (four, with
  VT1/midpoint/VT2 bounds, RPE on both scales and how each feels)**, `ZONE_CALC` (the
  145/165 worked example; the rounding rule is `agentReading` only), **`STAGES` 1–4**
  (who, zones, format, intervals and ratios, readiness rule for stage 1 → 2: 30 min of
  zone 1 three times a week, step-by-step examples, stage rotation, the stage-4 recovery
  gauge, overtraining signs) and `STAGE_RULES`. **Gap 7:** stage 5 is not in the PDF;
  only the study guide's summary is recorded. Figures 15-1 to 15-5 refused. **Pass
  two:** 0 new.

- **20 Oct — 15.5 pp 639–640 done, 24 facts.** `cardio.js` + `POSTURE`: three postures
  linked to `imbalances.js` patterns, what to watch on each machine, and muscles to
  lengthen or strengthen (MUSCLE_MAP names, checked). **SG ch15 checklist (pp 45–46):**
  stage 5 (`SG.15`) is the only new item. **Chapter 15 complete, except gap 7.**

- **20 Oct — 16.1 pp 641–649 done, 53 facts.** **New file `core.js`** + `BASICS`: the
  four objectives with definitions, LPHC boundaries, **local vs global muscles with
  actions (Table 16-1)**, the traits of the local muscles, and four rules (local first;
  local dysfunction can exist beside strong global muscles; inside-out). Conflict noted:
  Table 16-1 lists internal obliques as global, while 7.5 groups them with the deep
  stabilisers. **Pass two:** 0 new.

- **20 Oct — 16.2 pp 650–658 done, 72 facts.** `core.js` + `RATIONALE` (posture: anterior
  and posterior tilt muscles, scoliosis, gluteus medius and low-back pain; performance,
  injury and rehab findings; muscles underactive in chronic LBP; the hyperextension
  risk) and `ACTIVATION` (drawing-in: how, effect, the SCM fault; bracing; both together).
  **`imbalances.js` + `posterior_pelvic_tilt`** (complete:false). The named-study boxes
  are reduced to findings, without authors. **Pass two:** 0 new.

- **20 Oct — 16.3 pp 659–663 done, 112 facts.** `core.js` + `GUIDELINES` (Table 16-2
  variables, proprioceptive environment, **no weight belts for healthy adults in moderate
  programmes**, design priorities, readiness tests, the three outcomes in order),
  **`PROGRESSION` (three levels with their exercise lists)** and `CHECKPOINTS` (five).
  **The ledger's note "acute variables per phase" turned out wrong:** chapter 16 gives no
  sets, reps or tempo by phase, so those wait for chapter 21. **Pass two:** 0 new.

- **20 Oct — 16.4 pp 664–686 done (image-heavy), 91 facts.** `core.js` + `EXERCISES`
  (27, each with its safety or technique point and level). `cues.js` + 12 library
  exercises (now 26 cued; two bridge matches are medium confidence). The level-3 list
  names an "overhead throw" while the pages show a "back-extension throw"; both are
  recorded. `check-muscles.html` now also checks `core.js` (OK, 6 patterns). Photos and
  video links refused. **SG ch16 checklist (pp 47–49):** one new item, `SG.16` (change
  one variable at a time). **Chapter 16 complete.**

- **20 Oct — 17.1 pp 687–690 done, 23 facts.** **New file `balance.js`** + `BASICS`:
  centre of gravity, base of support, limits of stability, three balance types with
  examples, three senses and what each gives, and what impairs balance. **Pass two:**
  0 new.

- **20 Oct — 17.2 pp 691–696 done, 59 facts.** `balance.js` + `RATIONALE`: performance,
  injury resistance and rehabilitation (Tables 17-1 to 17-3), findings reduced to data
  (**−46% ankle-sprain risk in athletes; up to −20% falls in older adults**), older-adult
  screening, **chronic ankle instability: the traditional single-leg programme vs
  hop-to-stabilisation**, both limbs after ACL injury, perturbation, scope (refer and
  clear), and **never use balance equipment with maximal lifts**. Owner note: these are
  the source's ankle-sprain facts, the basis for a generated rehab block (spec §2.4).
  **Pass two:** 0 new.

- **20 Oct — 17.3 pp 697–701 done, 77 facts.** `balance.js` + `GUIDELINES` (Table 17-4:
  selection, the progression axes, the equipment order, **the six-step stance
  progression**, perturbation, what makes it harder or easier, one variable at a time)
  and **`PROGRESSION`** (three levels, exercises, landing hold 3–5 s). The ledger's
  "acute variables per phase" note was wrong again; they come in chapter 21. **Pass
  two:** 0 new.

- **20 Oct — 17.4 pp 702–728 done (image-heavy), 42 facts.** `balance.js` + `EXERCISES`
  (15, each with its key point and level). `cues.js` + 2 at medium confidence (single-leg
  RDL ↔ Kettlebell One-Legged Deadlift; step-up to balance ↔ Step-up with Knee Raise).
  28 cued; the cue check passes. The library has no tandem stance, single-leg balance
  reach or hop-to-stabilisation drills; they are queued for §3 reconciliation as
  possible additions, nothing added. Photos refused. **SG ch17 checklist (pp 50–51):**
  one new item, the enriched-environment definition (`SG.17`). **Chapter 17 complete.**

- **20 Oct — 18.1 pp 729–734 done, 48 facts.** **New file `plyometrics.js`** + `BASICS`
  (definition, rate of force production, the integrated performance paradigm, **the
  three phases of the stretch-shortening cycle with Table 18-1's events and actions**,
  readiness, cautions) and `RATIONALE` (effects, why stability shortens ground contact,
  safety through progression, four findings). The mechanism points to `anatomy.js`
  `FORCE.stretchShortening` rather than repeating it. The rubber-band analogy was not
  extracted. **Pass two:** 0 new.

- **20 Oct — 18.2 pp 735–738 done, 77 facts.** `plyometrics.js` + `GUIDELINES` (screening,
  shoes, surfaces, progression axes, intensity rule, **volume as contacts (3 × 5 = 15)**,
  **1–3 sessions a week, ≥24 h between sessions, 48–72 h for novices, 60–120 s between
  drills**; Table 18-2) and `PROGRESSION` (three levels; hold the level-1 landing 3–5 s).
  There are no per-phase sets or reps here either; they come in chapter 21. **Pass two:**
  0 new.

- **20 Oct — 18.3 pp 739–761 done (image-heavy), 44 facts.** `plyometrics.js` + `EXERCISES`
  (14 with key points). `cues.js` + 9 library exercises (Split Jump ↔ lunge jump and
  Lateral Bound ↔ ice skaters at medium confidence); 37 cued, check OK. Photos refused.
  **SG ch18 checklist (pp 52–53):** one new item, teaching landing and rebounding
  mechanics (`SG.18`). **Chapter 18 complete.**

- **20 Oct — 19.1 pp 762–767 done, 46 facts.** **New file `saq.js`** + `BASICS`: speed
  (stride rate × length), agility vs change of direction (the textbook's rule: agility
  drills need a signal), quickness, **frontside (triple flexion) vs backside (triple
  extension) mechanics**, and the four running checkpoints (Table 19-1, including the
  pelvo-ocular reflex). **Pass two:** 0 new.

- **20 Oct — 19.2 pp 768–773 done, 106 facts.** `saq.js` + `POPULATIONS`: non-athletes
  (prerequisites, technique before speed), **youth (1–3×/week, 4–8 drills, 1–4 × 3–5, rest
  15–60 s; Table 19-2)** with two play drills, **weight loss (start 1–2 workouts/week, then
  2–3 × 3–4 sets × 3–5 reps, rest 15–60 s)** with two circuits, and **older adults** (bone
  and fracture facts, readiness checklist, start with 1–2 sets of 1–2 drills) with two
  drills. **Pass two:** 0 new.

- **20 Oct — 19.3 pp 774–777 done, 44 facts.** `saq.js` + `PROGRAM`: **Table 19-3 by
  experience level (drills, sets, reps, rest)**, which was column-mixed in plain text and
  recovered from a layout extraction; ladder drill names. **Gap 8:** the cone drills the
  text points to (5-10-5, T, box, modified box) have no descriptions in the PDF. **SG
  ch19 checklist (pp 54–55):** no new facts. One conflict was recorded: the guide calls
  an obstacle course agility, while the textbook calls it change of direction; the
  textbook is kept (`SG.19`, medium). **Chapter 19 complete, except gap 8.**

- **20 Oct — 20.1 pp 778–785 done, 72 facts.** **New file `acute-variables.js`** +
  `PRINCIPLES`: benefits (Table 20-1), **GAS with three stages** (alarm timing 6–48 h,
  DOMS 24–48 h, soreness a poor marker of damage; resistance development; exhaustion and
  its consequences; Table 20-2), periodisation, overtraining vs overreaching, and **SAID
  specificity** (types, the exception for risky patterns, mechanical, neuromuscular and
  metabolic specificity, fibre types). **Pass two:** 0 new.

- **20 Oct — 20.2 pp 786–789 done, 43 facts.** `acute-variables.js` + `ADAPTATIONS` (five:
  stabilisation, endurance, hypertrophy (visible at 4–8 weeks; the 24-week 3 × 8–12
  example), strength (neural first, most gains in the first 12 weeks), power (F × v;
  work ÷ time)). **Pass two:** 0 new.

- **20 Oct — 20.3 pp 790–798 done, 138 facts.** `acute-variables.js` + `VARIABLES` (all ten:
  rep bands 1–5/6–12/12+ (the bands overlap at 12, recorded), **tempo notation with both
  worked examples**, volume formula, **frequency by status (Table 20-4)**, duration 30–90
  min, selection and order rules) and **`BY_ADAPTATION`** (**Table 20-3 recovered from a
  layout extraction** plus the text's rest per adaptation: 30–60 s, 0–180 s, 3–5 min,
  3–5 min). **Open question 21:** `plan.js` hardcodes different strength and endurance
  numbers; not changed. **Pass two:** 0 new.

- **20 Oct — 20.4 pp 799–809 done, 161 facts.** `acute-variables.js` + **`SYSTEMS`
  (fourteen)**, each with its definition and numbers (warm-up set 10–15 reps; pyramid;
  superset variants; complex training with PAP, 72 h recovery and 2–4×/week, frequency at
  medium confidence; drop set 5–20% × 2–4 reps × 2–3 drops; giant set rests 5–15 s and
  2–5 min, Table 20-5 says 4+ exercises and the text 3+, recorded; rest-pause steps;
  circuit 1–3 × 8–20; peripheral heart action; **split routines 2–6 days (Table 20-7
  recovered from a layout extraction)**; vertical vs horizontal loading). **Pass two:**
  0 new.

- **20 Oct — 20.5 pp 810–815 done, 37 facts.** `acute-variables.js` + `SAFETY`: scope duties,
  equipment rules, **the spotting checklist (seven points)**, monitoring (RPE →
  `assessments.js`; the RPE table was not duplicated), and **breathing (exhale on the
  concentric; Valsalva: what it is, its risks, avoid with hypertension or heart disease,
  unnecessary for most)**. **Pass two:** 0 new.

- **20 Oct — 20.6 pp 816–821 done, 75 facts.** `acute-variables.js` + `GUIDELINES`: Table
  20-11's variables, the five patterns first, and **the stabilisation → strength → power
  sequence** (slow tempo, 12–20 reps, 1–3 sets; bilateral → alternating → unilateral →
  smaller base; tailoring). A branded bar was generalised to "an oscillating-load bar"
  (no brand names). Figures 20-1 to 20-14 refused. **Pass two:** 0 new.

- **20 Oct — 20.7 pp 822–833 done (image-heavy), 16 facts.** `acute-variables.js` +
  `EXERCISES` (seven total-body combinations with their key points). The library has no
  equivalents of these combinations; queued for §3. **Pass two:** 0 new.

- **20 Oct — 20.8 pp 834–839 done (image-heavy), 22 facts.** `acute-variables.js` +
  `EXERCISES` (six chest/push, with fault → meaning → action where the source gives one).
  `cues.js` + 4. **Pass two:** 0 new.

- **20 Oct — 20.9 pp 840–846 done (image-heavy), 20 facts.** `acute-variables.js` + seven
  back/pull exercises. `cues.js` + 3. **Library flag (open question 15):** the library's
  "Wide-Grip Pulldown Behind The Neck" is the variant the source says is not advised.
  Left in the library, uncued. **Pass two:** 0 new.

- **20 Oct — 20.10 pp 847–854 done (image-heavy), 27 facts.** `acute-variables.js` + eight
  shoulder/press exercises (rotator-cuff targets checked against MUSCLE_MAP). `cues.js`
  + 3. **Cue audit:** while cueing 20.10/20.13, five cues across the file were found to
  contain technique the source does not state (band rotations, calf raise, lateral raise,
  and parts of the plank, crunch, reverse crunch, squat jump and hip flexor cues). They
  were removed or trimmed back to source content. 51 cued, check OK. **Pass two:** 0 new.

- **20 Oct — 20.13 pp 855–869 done (image-heavy), 38 facts.** `acute-variables.js` + twelve
  leg exercises. `cues.js` + 5 (dumbbell squat, leg press, barbell squat, deadlift, plus
  the earlier step-up). Lessons 20.11–20.12 remain **missing** (gap 1); nothing was
  inferred for the arm exercises. **SG ch20 checklist (pp 56–60):** nothing new; it
  repeats Table 20-3, Table 20-5 and the spotting checklist. **Chapter 20 complete,
  except gap 1.**

- **20 Oct — 21.1 pp 870–878 done, 60 facts.** `phases.js` + `PERIODIZATION`: the design
  questions, the iceberg effect, adherence first, periodisation objectives and aims,
  **macro/meso/microcycles** (4-week meso, 7–10-day micro, 3–6 micro per meso), the
  sport phases, **linear (Table 21-1: weeks 1–4 at 60–70%, 5–8 at 70–85%, 9–12 at
  85–100% 1RM)** and undulating periodisation. Annual, monthly and weekly plan figures
  refused. **Pass two:** 0 new.

- **20 Oct — 21.2 pp 879–883 done, 52 facts.** `phases.js` + `PHASE_SUMMARY` (Table 21-3:
  adaptations and progression methods per phase; column-mixed in plain text and
  rebuilt by reading order, which the study guide confirms) and **`TEMPLATE` — the
  six-section daily workout** (warm-up, activation, skill, resistance, client's choice,
  cool-down) with each section's rules. The staircase image is recorded in `PROGRESSION`.
  **Pass two:** 0 new.

- **20 Oct — 21.3 pp 884–895 done, 172 facts.** `phases.js` + `MOVEMENT_PATTERNS` (squat,
  hinge, pull, push, press, multiplanar: muscles mapped to MUSCLE_MAP and checked,
  actions, daily and exercise examples, squat technique; Tables 21-4 to 21-8) and
  **`PHASE_VARIABLES[phase 1]`: every template section's numbers** (SMR 1–3 groups ≥30 s;
  static 1–3 × ≥30 s; core and balance 1–4 × 12–20 × 1–3, slow; plyometrics 1–3 × 5–8 ×
  1–3 with 3–5 s holds; SAQ 1–3 × 1–3 × 1–3; resistance 1–3 × 12–20, slow 4-2-1-1; rest
  0–90 s and 12–20 RM from the study guide; cool-down order). One text slip was recorded
  (the balance paragraph says "core exercises"). **Pass two:** 0 new.

- **20 Oct — 21.4 pp 896–903 done, 120 facts.** `phases.js` + `PHASE_VARIABLES` phases 2–4.
  - **Phase 2:** active stretching; core and balance 8–12 × 2–4 at moderate 2-0-2-0;
    plyometrics 8–12 × 2–4; SAQ 3–5 × 2–4; resistance 1–2 supersets per part × 8–12 ×
    2–4, rest 0–60 s, 8–12 RM. The nine example supersets come from Table 21-10. The
    "4-21-1" typo is recorded.
  - **Phase 3:** 3–6 × 6–12 (12–20 option) at 2-0-2-0, 2–4 exercises per part, rest
    0–3 min.
  - **Phase 4:** 4–6 × 1–5 explosive, 2–4 per part, rest 0–3 min, 1–5 RM.
  - Plus 2–6 weeks per phase and the routing after phase 3.

  **Pass two:** 0 new.

- **20 Oct — 21.5 pp 904–906 done, 31 facts (+ SG.21).** `phases.js` + `PHASE_VARIABLES[phase 5]`:
  SMR plus dynamic only; optional explosive core 1–2 × 8–12 × 1–3; hop-stabilisation
  balance; plyometrics 1–4 × 8–12 × 3–5; heavy 85–100% (1–5 RM) and light 30–45%
  (8–10 RM) loads. **Gap 9:** the phase 5 resistance protocol is absent from the PDF.
  **The study guide's phase 5 synopsis** supplies it: 3–5 sets, 1–5 + 8–10 reps,
  explosive, rest 1–2 min between pairs and 3–5 min between circuits. Its strength and
  power columns don't align row by row, so they are kept as lists, not pairs.
  **Pass two:** 0 new.

- **20 Oct — 21.6 p907 done, 18 facts.** `phases.js` + `GOAL_PLANS`: the **fat-loss annual
  plan** (phases 1 → 2 → 3 monthly January to June, then undulating). The lean-mass and
  performance plans are missing (gap 9). `PROGRESSION.agentReading` (the guessed routing
  from ch 13) was removed now that the source's routing is in. `acute-variables.js` +
  `meta.lookup`, mapping the spec's goal × phase × training-age lookup onto
  `BY_ADAPTATION`, `PHASE_VARIABLES` and `frequency.byStatus`. **SG ch21 checklist (pp
  61–62):** the five synopsis tables (`SG.21`, 58 facts), trunk rotation as a pattern,
  "cardio anywhere", and "the model uses linear and undulating". **Chapter 21 complete,
  except gap 9.**

- **20 Oct — 22.1 pp 908–911 done, 12 facts (+3 SG.22).** **New file `modalities.js`**
  (new schema: equipment rules for when the agent suggests substitutes) + `RULES` (three
  risk-over-reward rules) and `RESISTANCE.machines`. **Gap 10:** the lesson's free-weight
  and cable sections are absent; one study-guide line each is recorded. **Pass two:** 0
  new.

- **20 Oct — 22.2 pp 912–920 done, 56 facts.** `modalities.js` + elastic resistance (≤250%
  stretch, progression by thicker or doubled bands, variable resistance, colour codes that
  differ by maker, a pre-session band check), a rotational band bar (spine rotation:
  lumbar 12–13°, thoracic about 70°) and medicine balls (≤10% bodyweight for speed; a
  release allows full concentric power). **Brand names generalised.** **Pass two:** 0 new.

- **20 Oct — 22.3 pp 921–928 done, 66 facts.** `modalities.js` + kettlebells (benefits, rules,
  their own five checkpoints, setup, phase examples), bodyweight (closed vs open chain)
  and suspension training (benefits, phases 1–2 ideal). **Pass two:** 0 new.

- **20 Oct — 22.4 pp 929–931 done, 43 facts.** `modalities.js` + sandbags, a loaded rubber
  tube (the source says 9 weights but lists 8; the list is recorded with medium
  confidence) and battle ropes (diameter → adaptation and work time). **Pass two:** 0 new.

- **20 Oct — 22.5 pp 932–937 done, 59 facts.** `modalities.js` + `PROPRIOCEPTIVE`: stability
  ball (sizing by height, Table 22-3; **safety rules, Table 22-4, including never stand
  on it and no lifts at 85–100% 1RM**; progression), a half-dome trainer (never stand on
  the flat side), an inflatable platform (safe for a supine dumbbell press), and the
  bodyweight-competency-first rule. **Pass two:** 0 new.

- **20 Oct — 22.6 pp 938–942 done, 67 facts.** `modalities.js` + `TECH`: trackers (what to ask,
  features, motivation, **about 50% quit in 6 months**, accountability, accuracy limits,
  medical uses), nutrition and fitness apps (benefits and cautions), **heart-rate
  monitors (chest strap most accurate; wrist optical worse at high intensity; one-minute
  recovery as a heart-health sign)**. `agentReading` applies these limits to Bunyan
  itself. **SG ch22 checklist (pp 63–64):** 3 new items (machines vs free weights, free
  weights, cables; `SG.22`). **Chapter 22 complete, except gap 10.**

- **20 Oct — 23.1 pp 943–954 done, 178 facts.** **New file `conditions.js`** (the
  schema proposed when the residual chronic-conditions topic reached 12 entries; **those 12
  were migrated into `OVERVIEW`**, and the 1.3 count was re-verified at 219). Added
  `POPULATIONS.youth` (physiology Table 23-1 recovered from a layout extraction, heat,
  resistance safety and gains, Table 23-2) and `older_adults` (normal vs disease change,
  BP referral at any age, declines, PAR-Q+, Tables 23-3 and 23-4; their duration and
  intensity disagree, both recorded). `scope.js` + `refer_hypertensive_any_age`.
  **Pass two:** 0 new.

- **20 Oct — 23.2 pp 955–962 done, 112 facts.** `conditions.js` + obesity: BMI table and
  worked example, energy balance (refer diet to a dietitian), the sedentary-ageing
  figures, **200–300 kcal per session and 1,200 → 2,000 kcal/week**, positions,
  psychosocial rules, Tables 23-6 and 23-7. **Pass two:** 0 new.

- **20 Oct — 23.3 pp 963–968 done, 92 facts.** `conditions.js` + diabetes: types 1
  and 2, exercise as insulin-like, foot care, Tables 23-8 and 23-9 (the intensity wording
  conflicts; medium confidence), glucose reference values and **the hypoglycaemia signs
  and first step**. `scope.js` + `refer_hypoglycaemia` (Bunyan never advises on insulin or
  carbohydrate dosing). **Pass two:** 0 new.

- **20 Oct — 23.4 pp 969–978 done, 185 facts.** `conditions.js` + hypertension (10–20
  mmHg average lowering, medication blunts HR, positions, Tables 23-10 and 23-11, a
  1-second tempo cap) and coronary heart disease (**a physician's safe upper limit before
  anything starts**, no HR formulas, resistance only after 3+ symptom-free months,
  Tables 23-12 and 23-14; Table 23-13 RPE was not duplicated). `scope.js` +
  **`no_exercise_bp_limit` (SBP 200 / DBP 115)** and `chd_upper_limit_first`. The BP
  categories match `assessments.js`; one crisis-boundary wording difference was recorded.
  **Pass two:** 0 new.

- **20 Oct — 23.5 pp 979–985 done, 173 facts.** `conditions.js` + osteoporosis (types,
  sites, risk factors, **>75% 1RM for bone, about 6 months to effect**, fall prevention over
  strength alone, Tables 23-15 and 23-16) and arthritis (OA vs RA, flare-ups, **pain
  lasting over 1 hour → modify**, no early-morning exercise, Tables 23-17 and 23-18; the
  units conflict and both are recorded). Oral corticosteroids are kept only as a
  medical-caution note, per the owner's steroid instruction (medical, not performance).
  **Pass two:** 0 new.

- **20 Oct — 23.6 pp 986–992 done, 187 facts.** `conditions.js` + cancer (treatment
  effects, low-to-moderate intensity, immune-safe settings, no SMR during
  chemo/radiation, Tables 23-19 and 23-20) and `POPULATIONS.pregnancy` (trimesters,
  contraindications, high-risk factors, **no prone or supine after 12 weeks**, +300
  kcal/day, stop signs, postpartum, Tables 23-21 and 23-22). `scope.js` +
  `pregnancy_stop_signs`. **Pass two:** 0 new.

- **20 Oct — 23.7 pp 993–999 done, 150 facts.** `conditions.js` + chronic lung disease
  (restrictive vs obstructive, **oximetry floor 90%/85%**, never adjust oxygen, upper-body
  dyspnoea, Tables 23-23 and 23-24) and PAD/claudication (walk into discomfort, rest,
  repeat; no smoking within 1 hour; Tables 23-25 and 23-26). `scope.js` +
  `lung_desaturation_stop` and `refer_claudication_pain`. **Only what is on these pages
  was extracted (gap 2).** The study guide's chapter-23 recap also ends at PAD, so the
  lost pages after p999 are likely the summary and back matter. **SG ch23 checklist (pp
  65–68):** nothing new for chapter 23. Its p65 carries a **machines vs free weights
  pros/cons table** for chapter 22, added as `SG.22` (partly fills gap 10).
  **Chapter 23 and the textbook are complete, except the logged gaps.**

- **20 Oct — Handouts and forms (34 unique pages), 217 facts.** `src` tags `H.*`.
  - **1RM chart → one exact rule:** 1RM = load ÷ (1 − 0.025 × reps). It fits all 160 rows
    to 3 decimals. The chart is not reproduced (`acute-variables.js` `ONE_RM`; open
    question 22).
  - **Five sample sessions** (fat loss 1–4 of 12, performance 1 of 12) → `phases.js`
    `SAMPLE_SESSIONS`, with the progression they show. Client name and layout omitted.
    Rest placement is medium confidence (unaligned columns; the mini-circuit rule is
    stated on every sheet).
  - **Programming templates** → `TEMPLATE.forms`.
  - **Lifestyle questionnaire:** 7 questions not already in 11.1.
  - **Four assessment forms:** checked against 11.4, 11.5, 12.2 and 12.3. All match; one
    new rule (BP only when indicated).
  - **PAR-Q+:** decision logic only. Topics are paraphrased and the instrument is not
    reproduced. One follow-up item mentions long-term steroid medication; it is kept as
    a medical flag, as with 9.6.

  Duplicates confirmed byte-identical and not re-read.

- **20 Oct — Closing deliverables (part 1).**
  - `corrective.js` SEQUENCE filled from the 21.2–21.3 template (inhibit → lengthen → activate → integrate, each with technique and dose).
  - **§3.1:** `tools/name-reconciliation.ps1` → `tools/name-reconciliation.json` (proposal only, nothing applied):
    - 56 rows; 20 exact, 36 need review.
    - **Muscle validation: 1 flag** (Cable Hip Adduction tagged Quads; the book says adductors).
    - 29 library names break the variant naming rule.
    - 6 cautions (controversial or not-advised entries).
    - Hand check of 3 random renames (soleus stretch, depth jump, single-leg RDL): all correct.
  - **§4:** `docs/erd.md`, `docs/uml.md`, `docs/flows.md` — 6 Mermaid diagrams, all parse and render (`tools/check-mermaid.html`). The ERD answers the corrective question. Knowledge modules have no imports, DOM or network (grep verified) and weigh 600,833 bytes, not yet loaded by the app.
  - **Still to do:** §7 `docs/COVERAGE.md`, including the five-section random re-read.

- **20 Oct — Alcohol removed (owner instruction: "nothing to do with alcohol in my app").**
  The same treatment as steroids: 15 mentions were deleted across 6 files.
  - `assessments.js`: the intake drinks-per-week question; alcohol in the pre-test rules.
  - `conditions.js`: seven risk-factor, cause and lifestyle items.
  - `scope.js`: the nutrition-education line.
  - `supplements.js`: "alcoholism" in the B6 entry; "sugar alcohol" relabelled "polyols (sugar substitutes)".
  - `nutrition-principles.js`: the 7 kcal/g energy entry and its app note.
  - `docs/flows.md`: the alcohol line.

  Open question 17 is withdrawn. A grep for "alcohol" in `js/knowledge`, `docs` and `tools` finds nothing, and all edited files still load. Non-alcoholic "drink" mentions (water, sports drinks) are kept. Section fact counts drop slightly; COVERAGE.md uses the post-removal numbers.

- **20 Oct — Four spec items (owner request).**
  1. **Arabic (spec §6):** `cues.js` + `AR` holds all 83 cues in the dictionary's shape and register (English → Egyptian colloquial). `t()` serves them once `js/i18n/dict.js` merges the map; that is a one-line change in the app session, since dict.js is outside this folder and newer on GitHub.
     - `tools/check-cues.html` checks coverage, ≤10 words, Arabic script and no orphans, and renders the cues RTL. Result: OK, 83/83, read visually. Two translations were caught reading backwards ("أبدًا" without a negation) and fixed.
     - No other knowledge string reaches a screen today: the rest is agent-facing reference data, and nothing imports `js/knowledge/` yet.
  2. **Diagrams (§4):** the ERD, UML and flows are confirmed and all 6 render. The UML is corrected to GitHub's real `js/coach/` (13 modules, no cycles).
     - The ERD's corrective question was tested by running it on the data, which exposed a model gap: activation exercises had no muscle `targets`. Fixed only where the book names them (floor bridge, single-leg balance, single-leg RDL, step-up to balance).
     - Upper-body activation is linked through a labelled `agentReading` only; the limit is stated in `docs/erd.md`.
  3. **Name reconciliation (§3.1):** re-run read-only against this folder's library and GitHub main (876 entries). Identical: 56 rows, 1 muscle flag, 29 variant names.
     - The script now takes `-Library` and `-OutFile`. A stray file from a variable-name collision was found and deleted.
  4. **New exercises (§3.2):** `tools/new-exercises.proposal.json` — 44 book drills (warm-up 9, mobility 3, activation 13, corrective 16, plyometric 1, agility 2) in the library's schema, with Arabic names and cues and source sections. 13 carry `nearest` for owner decision; 21 have book-sourced tags.
     - **No entry has an image (44 of 44).**
     - `tools/check-new-exercises.html` passes. There are 0 collisions with GitHub's library, which was not touched.

## Residual facts
(append-only)

- 1.3 → 34 entries: `chronic-conditions` 12, `epidemiology` 14, `definitions` 7,
  `weight-management` 1. Three topics passed six — see open questions 6–8.

- 1.4 → 6 entries, all `injury-regions` (general + foot/ankle, knee, LPHC, shoulder, head/neck).
  Topic reached six — see open question 10.

- 1.6 → 6 entries, all `professional-conduct`. Reached six, but recommend **no** schema:
  trainer-business obligations with no use in the app. See open question 11.

- 3.1 → 5 entries, all `definitions` (now 12).

- 4.5 → 2 entries, `nutrition` (sodium ceiling from a goal example; food diary). Held for chapter 9.

- SG.1 (study-guide checklist) → 3 entries, `definitions` (now 15).

- 6.1 → 2 entries, new topic `safety-cautions`. Held for the flexibility (14) and resistance-safety (20.5) chapters.

- 6.2 → 2 entries, `safety-cautions` (now 4).

- 10.1 → 4 entries: `supplement-history` 3 (new topic), `epidemiology` 1 (now 17).

- **20 Oct — end-of-book residual review (spec §2.8).** Four topics had six or more entries and were migrated whole by a brace-aware script (text unchanged, every section's fact total re-verified):
  - `chronic-conditions` 12 → **`conditions.js` OVERVIEW**
  - `definitions` 15 → **`glossary.js`**
  - `epidemiology` 17 → **`epidemiology.js`**
  - `injury-regions` 6 → **`injuries.js`**
  - `professional-conduct` 6 → **`scope.js`** conduct rules with `business:true`. This is an existing schema, not a new file.

  This supersedes my earlier "no schema" recommendations (open questions 8 and 11): the spec's rule is to migrate at six. Both are one-line reversals if you prefer them back in residual.

  **Left in residual (10 entries, under six per topic):** `safety-cautions` 4 (each now also covered elsewhere — SMR contraindications, Valsalva, inhalers in `conditions.js`), `supplement-history` 3, `nutrition` 2 (the 2,300 mg sodium figure is still only an example value; chapter 9 gives no ceiling), and `weight-management` 1.

## Open questions for the owner
(append-only)

1. ~~Skip list~~ **Answered 20 Oct:** approved, except 1.6 kept (→ `scope.js`) and `null.pdf`
   removed.
2. Is a complete copy of the textbook available? Ch 20 lessons 11–12 and everything after
   p999 are missing. **Open — owner is trying to get one.** Until then: marked missing, not
   filled.
3. ~~Where does this log live?~~ **Answered 20 Oct:** `.claude/INGESTION-LOG.md`, by explicit
   exception to the session's directory ownership. Never in `docs/` (published).
4. ~~Commit it?~~ **Answered 20 Oct:** yes — it is the resume mechanism. Book titles in a work
   log are citation, not reproduction. *Blocked:* the project folder is not a git
   repository yet, so there is nothing to commit to.
5. ~~`behaviour` class?~~ **Answered 20 Oct:** yes; chapters 3–4 → `js/knowledge/adherence.js`,
   first-class material.
6. **Resolved 20 Oct — `conditions.js` created at 23.1.** **Residual `chronic-conditions` reached 12 (1.3).** Proposed schema: `conditions.js` —
   per condition: what it is, risk factors, what exercise does, what is recommended,
   what requires clearance. Chapter 23 will add most of its content. Recommend creating
   it when 23.1 is reached rather than now, so its shape comes from the fullest section.
7. **Resolved 20 Oct — `glossary.js`.** **Residual `definitions` reached 7 (1.3).** Proposed schema: `glossary.js`. Low urgency.
8. **Superseded 20 Oct — migrated to `epidemiology.js` per the spec rule; reversible.** **Residual `epidemiology` reached 14 (1.3).** Recommend **no** schema: population
   statistics drive no coaching decision. Keep them in residual as provenance for any
   claim the app makes ("most adults do not meet activity guidelines").
9. **Blood pressure, 1.3:** the lesson defines hypertension as "above 120/80" and, a
   paragraph later, gives a staged table in which 120–129/<80 is "elevated", not
   hypertension. Both recorded in `assessments.js`, confidence low. Revisit at 11.3.
   **Update 6.1:** the staged US table (and a European >139/>89 alternative) supports
   reading hypertension as stage 1 and above; the "above 120/80" line looks loose.
10. **Resolved 20 Oct — `injuries.js`.** **Residual `injury-regions` reached 6 (1.4).** Proposed schema: `injuries.js` — per
    region: common injuries, causes, knock-on regions, re-injury risk, prevention, what
    to watch, and later the corrective link into `imbalances.js`. Recommend creating it
    once chapter 12 (posture) is read, because that is where regions meet muscles.
11. **Superseded 20 Oct — moved into `scope.js` as `business:true` conduct rules (no new file); reversible.** **Residual `professional-conduct` reached 6 (1.6).** Recommend **no** schema — hygiene,
    dress, insurance, CEUs, tax records and IP law drive nothing in the app.
12. **`scope.js` `agentReading` fields are interpretations, not source.** Each translates
    a trainer rule into an agent or coach behaviour (e.g. "the agent never claims to be a
    certified trainer"; "for any sign of an emergency, tell the user to contact
    emergency services now"). They are the part of `scope.js` the agent will actually
    enforce, so **please review all of them** before the agent session consumes this file.

13. **Stages of change, 4.2:** the four-question screen sends "plans to start within 6
    months" to *preparation*, but the stage definitions put that in *contemplation* and
    give preparation "within the next month". Both recorded; the data says to follow the
    definitions. Confirm, or tell me to follow the screen. **Update:** the study guide
    (SG.4) times preparation "within the next month", corroborating the definitions.

14. **Arithmetic error in the source, 4.5:** a half-marathon build-up (20 min ×3/week, +10 min
    every 2 weeks, to 120 min) is said to take ~18 weeks; its own numbers give 20. Both
    recorded, confidence low. No decision needed unless you want the app to use this
    progression — it would use 20.

15. **Exercise library tags, found at 7.3:** hammer and reverse curls are primary `Biceps`;
    some list `Forearms` as secondary and some (e.g. "Hammer Curls") do not, though the
    hammer grip emphasises the brachioradialis (a forearm muscle). Not changed — the
    library is outside this session. Queued for the §3.1 reconciliation proposal.
    **Also (7.4):** both "Hyperextensions" entries have pattern `"Elbow extension"`; a
    back extension is hip and spine extension. **Also (7.5):** "Cable Hip Adduction" is
    tagged `Quads`; "Band Hip Adductions" is `Adductors`. **Also (14.4):** the library has
    "Lower Back-SMR" and "Neck-SMR". The source says to avoid rolling over the lumbar and
    cervical spine; both stay uncued in `cues.js` (no cue invented). **Also (14.7):** "Standing Toe Touches" is the straight-leg toe touch the source lists as a controversial stretch (disc stress; avoid with herniated discs or sciatic-type pain). You may want it hidden or relabelled. **Also (20.9):** "Wide-Grip Pulldown Behind The Neck" is the lat pulldown the source says is not advised (shoulder and neck stress). Same treatment: left in the library, uncued. The source's
    "lateral thigh" technique is cued on "Iliotibial Tract-SMR" (the library's name for
    the same region).

16. **Calorie maths, 8.4 — needs your decision, no change made.** The source names
    Mifflin-St Jeor (Bunyan's equation) among RMR prediction equations and says *all* of
    them tend to **underestimate** RMR versus measurement — more for muscular and clinical
    populations — and work poorly in obesity. It gives no correction factor. Bunyan's
    maintenance = Mifflin-St Jeor × activity multiplier stays as is. Options: keep it
    (and label targets as estimates, as `CLAUDE.md` already requires), or later offer
    Katch-McArdle for users who log body fat. Changing it changes live targets.

17. **Withdrawn 20 Oct — owner: no alcohol content in the app; the 7 kcal/g entry was removed.** **Alcohol calories, 9.1:** alcohol yields 7 kcal/g. Bunyan's calories-from-macros formula
    (`p×4 + c×4 + f×9`) has no alcohol term and no app code mentions alcohol. Whether that
    matters depends on whether drinks in `foods.json` carry their own kcal — not checked;
    outside this session.

18. **Water goal, 9.5:** Bunyan defaults every profile to 3,000 mL (`state.js`). The source's
    daily fluid figures are 2.7 L for women and 3.7 L for men (total fluid, US Institute of
    Medicine), raised by exercise, heat, altitude, illness and more protein or fibre. The
    default sits between them. No change made; a sex-aware default would be a
    `state.js` change outside this session.

19. **Muscle-gain calories, 9.8 — needs your decision, no change made.** Bunyan's `targetKcal()`
    sets "gain" to TDEE **+250** (`formulas.js:23`). The source suggests a **350–500 kcal/day**
    surplus for hypertrophy, while also noting a surplus may be unnecessary if protein is
    high enough (1.6–2.2 g/kg). Its fat-loss figure (−500) matches Bunyan's "lose". Keep +250,
    move into the 350–500 range, or let the user choose? Changing it changes live targets.

20. **Exercise-test termination criteria, 11.2 — safety gap.** The source gives the signs and
    symptoms that mean "stop the test now" only as Figure 11-3, an image, so they could not
    be extracted. Any exertion test (e.g. a step or run test, from 11.5) must not ship in the
    app until these come from a readable source — the complete textbook copy you are
    seeking, or a public guideline you approve.

21. **Plan-engine numbers vs the source, 20.3. No change made; it is your decision.**
    `js/engine/plan.js` `LEVELS`/`GOALS` hardcode their own ranges (e.g. "Just starting"
    3/2 sets × 8–12 reps, rest 120/75 s; "Get stronger" shifts reps down by 2–4 and rest
    ×1.3). The source's Table 20-3:
    - **Hypertrophy:** 6–12 reps × 3–6 sets at 75–85% 1RM, rest 0–180 s. This broadly
      matches Bunyan's default.
    - **Maximal strength:** 1–5 reps × 4–6 sets at 85–100%, rest 3–5 min. Bunyan's
      "Get stronger" lands near 4–8 reps with about 2.5–4 min rest, so it is lighter than
      the source.
    - **Endurance and stabilisation:** 12–20+ reps × 1–3 sets at 50–70%, rest 30–60 s.
      Bunyan's "Lose fat" shifts reps up by 1–3 only.

    Frequency by training status (beginner 2–3, intermediate 3–4, advanced 4–6 sessions a
    week) has no counterpart in the app. Per spec §2.2, the templates should later
    *derive* from `acute-variables.js` rather than carry their own numbers. Noted for
    later. Changing them changes live plans.

22. **1RM estimate, handout. No change made.** The source's conversion chart is exactly
    1RM = load ÷ (1 − 0.025 × reps). Bunyan uses Epley (load × (1 + reps ÷ 30), capped at
    12 reps). They agree at 10 reps; below 10, Epley reads higher, by about 2% at 5 reps
    and 1.4% at 2. Small enough that no change is suggested. If you want the app to match
    the source, it is a one-line swap in the 1RM function, but it changes every logged
    PR's estimate.

23. **Medical-steroid mentions, 23.5 and the PAR-Q+.** Following your instruction to remove
    steroid content, all performance-drug material is gone. Two *medical* mentions
    remain, both as safety flags only:
    - long-term oral corticosteroids in arthritis (fracture and osteoporosis risk), and
    - the PAR-Q+'s "steroid medication for more than 3 months" follow-up.

    They tell the agent to seek physician input, the same treatment as the 9.6 referral
    already kept. Say if you want even these removed.

## Refused extractions
(append-only)

- 1.3 — Figure 1-6 (world map of inactivity prevalence): image. Its data is not given in
  the text, so nothing could be modelled from it.
- 1.3 — Table 1-1 (BMI classes) was not reproduced as a table; its bands are modelled as
  data in `assessments.js`.
- 3.1 — Figure 3-1 (intrinsic vs extrinsic motivation): image. Same content is in the text and captured.
- 3.2 — Figure 3-2 (social physique anxiety vs participation): image; only its stated direction (inverse) is recorded.
- 3.2 — Table 3-1 (goal types): not reproduced; modelled as data with different examples.
- 3.3 — Tables 3-2 (support types), 3-3 (leadership components), 3-4 (benefits of group exercise): not reproduced; each modelled as data in `adherence.js`, examples reworded.
- 3.4 — Figure 3-3 (exercise, self-esteem and body image): image. The reciprocal relationship is stated in the text and captured.
- 3.4 — Lesson video: not part of the PDF; nothing to read.
- 4.1 — Table 4-1 (behaviour-change techniques): not reproduced; modelled as data grouped by outcome, reworded.
- 4.2 — Figure 4-1 (stages diagram): image; the stages are in the text and captured.
- 4.2 — Stage-of-change worksheet: not reproduced; its decision order modelled as `STAGES.screen` with reworded questions.
- 4.3 — Figure 4-2 (reflective listening): image; the technique is described in the text and captured. Example questions and affirmations not quoted; recorded by purpose.
- 4.4 — Figures 4-3 (self-discrepancy) and 4-4 (importance/confidence/readiness ruler): images; both concepts are in the text and captured. Table 4-2: not reproduced; modelled as reworded question patterns.
- 4.5 — Figures 4-5 (SMART goals) and 4-6 (diet record worksheet): images/forms; SMART criteria are in the text and captured; the worksheet is not reproduced.
- 5.1 — Figures 5-1 to 5-8 (neuron, nervous system diagrams, spindle, GTO, joint receptors): anatomical illustrations; their content is in the text and captured.
- 5.2 — Figures 5-9 to 5-23 (skeleton, bone types, markings, spine): anatomical illustrations; content captured from the text. Tables 5-1 and 5-2 modelled as data. The vertebra-count memory aid omitted as expression.
- 5.3 — Figures 5-24 to 5-35 (arthrokinematics, joint types, ligaments, growth plates): illustrations; content captured from the text.
- 5.4 — Figures 5-36 to 5-43 (muscular system, fascicle, myofibril, junction, sliding filament): illustrations; content captured. Table 5-3 modelled as data.
- 6.1 — Figures 6-1 to 6-7 (heart, conduction, vessels, manual pulse procedure): illustrations; content captured. Table 6-1 modelled; Table 6-2 already modelled as BP classes.
- 6.2 — Figures 6-8 to 6-10 (respiratory system, breathing, passages): illustrations; content captured. Tables 6-3 and 6-4 modelled as data.
- 6.3 — Figures 6-11 to 6-13 (endocrine organs, insulin and glucagon responses): illustrations; content captured.
- 6.4 — Figures 6-14 to 6-17 (digestive system): illustrations; content captured.
- 7.1 — Figures 7-1 to 7-3 (HMS, anatomic position, locations): illustrations. Table 7-1: definitions modelled, examples not reproduced (own examples written).
- 7.2 — Figures 7-4 to 7-7 (planes, flexion/extension, abduction/adduction, rotation): illustrations; content captured. Memory analogies omitted as expression.
- 7.3 — Figures 7-9 to 7-12 (curl and squat phases): photos/illustrations; content captured. Table 7-2 modelled.
- 7.4 — Figures 7-13, 7-14 (closed- and open-chain exercises): photos; content captured.
- 7.5 — Figures 7-15 to 7-24 (length-tension, imbalance, force-velocity, force-couple, subsystems, levers, torque): illustrations; content captured. Lever mnemonic omitted as expression.
- 7.6 — Table 7-3 (muscle synergies): modelled with MUSCLE_MAP names, not reproduced.
- 8.1 — Figure 8-1 (energy metabolism overview): diagram; content captured.
- 8.2 — Figures 8-2 to 8-8 (ATP→ADP, energy-system curve, ATP-PC, glycolysis, cell, oxidative system, mitochondria): diagrams; content captured. Fuel analogy omitted as expression.
- 8.3 — Figures 8-9 to 8-11 (intensity–duration, steady-state metabolism, contribution by duration): graphs; their relationships captured as data. Tables 8-1, 8-2 modelled.
- 8.4 — Figure 8-12 (TDEE components): chart; its shares captured as data.
- 9.1 — Tables 9-1, 9-2, 9-3: modelled and reworded in `scope.js` and `nutrition-principles.js`, not reproduced. Practice scenarios reduced to two examples.
- 9.2 — Tables 9-4, 9-5, 9-6 (amino acids, protein sources, protein targets): modelled as data, not reproduced. Figures 9-1 to 9-3: diagrams.
- 9.3 — Tables 9-7 to 9-12 (sugars, polysaccharides, fibre, GI, carbohydrate targets): modelled as data. Figure 9-4: diagram.
- 9.4 — Tables 9-13, 9-14 (lipid classes, fat types): modelled as data. Figure 9-5: diagram.
- 9.5 — Tables 9-15 to 9-20 (vitamins, minerals, hydration protocol, sports drinks): modelled as data. Figures 9-6, 9-7 (fluid recommendations; urine colour chart): images — the colour rule is in the text and captured.
- 9.6 — Figure 9-8 (energy conversion): diagram; content captured.
- 9.7 — Figures 9-9 to 9-13 (US, dual-column, UK, %RI and colour-coded labels): images; label rules captured from the text. Table 9-21 reworded as questions.
- 9.8 — Tables 9-22 to 9-24 (fat-loss, muscle-gain and performance strategies): modelled as data with reworded examples.
- 10.2 — Tables 10-1, 10-2 modelled from a layout re-extraction; Table 10-3 illegible as a matrix, coverage taken from the prose; 10-4 is a list, captured. Figures 10-1 to 10-3 (supplement labels): images.
- 10.3 — Table 10-5 (omega-3 sources): modelled. Figures 10-4 to 10-7 (vitamin and mineral groups): images. Scurvy pun omitted as expression.
- 10.4 — Tables 10-6 (amino acids), 10-7 (steroid adverse effects): modelled. Figure 10-8 (ATP-PC): diagram.
- **20 Oct — REMOVED by the owner's instruction:** every item about anabolic steroids in
  10.4 (definition, legal status, the adverse-effects table) and in its study-guide
  checklist, plus two passing mentions in 10.2/10.4. Not refused for copyright — the
  owner does not want the topic in the app. `scope.js` keeps a generic refusal
  (`no_banned_drugs`) that names no substance. Medication mentions of corticosteroids
  (e.g. prednisone, as a cause of weight change needing referral, 9.6) are kept — a
  medical referral trigger, not the excluded topic. Future sections: the same
  exclusion applies.
- 11.2 — Figures 11-2 (assessment rationale) and 11-3 (test termination criteria): images; **11-3 holds safety content that could not be captured** (open question 20).
- 11.3 — Table 11-1 modelled; figures 11-4 to 11-7 (pulse sites, BP): images.
- 11.4 — Tables 11-2 to 11-9 modelled (11-3, 11-4 from a layout extraction). **Table 11-10 (Durnin-Womersley %-fat lookup): image, no values extractable.** Figures 11-8 to 11-11: images.
- 12.3 — Tables 12-4 to 12-11 modelled (solutions charts via layout extraction). Figures 12-5 to 12-24: photos. **Push/pull start positions exist only as figures.**

- **20 Oct — File moves (owner).** `docs/COVERAGE.md` → `.claude/COVERAGE.md` (not published). References above to `docs/COVERAGE.md` mean the new location. The spec (`KNOWLEDGE-BASE-INGESTION.md`) still says `docs/`; it was left unedited because it is the owner's document.

# The coach agent — review and upgrade plan

A review of the chat coach at v256 and the instructions to make it what the owner
asked for: a coach that understands what it is told, acts on it, stays a step ahead,
and never contradicts the rest of the app. Written to be built from; each package
stands alone and follows Part 3 of `docs/NEXT-PHASE.md` (rules, workflow, tests).

**How it was reviewed.** Forty-five things a real person says to a trainer (English
and Egyptian Arabic; questions, requests, complaints, corrections) were put to the
coach through its own entry point (`ask()` in `js/ui/views/chat.js`) on the test
profile, and each answer was read. The code behind it was read: the intent router
(`js/coach/intent.js`), the answers (`js/ui/views/chat.js`, 156 KB), the actions
(`js/coach/commands.js`, `js/ui/agent.js`), the knowledge search
(`js/engine/kbsearch.js`, `js/engine/faq.js`, `js/data/faq.js`), what it remembers
(`js/coach/context.js`), and the optional on-device model (`js/engine/smart.js`,
`js/engine/llm.js`).

---

## 1. Verdict

**What is right, and stays.** The coach answers from the person's own log and from
the knowledge base, says so when it cannot, refuses medical and supplement advice,
and changes things only through a confirmation with Undo. Its figures are the app's
figures. That honesty is the hard part and it is done.

**What is wrong.** It is a **switchboard, not a coach**: it matches words to one of
about forty canned answer types. When the words match the wrong type, it answers a
different question with full confidence. In the review, **16 of 45 answers (about one
in three) did not answer what was asked**; two of those are safety failures.

### The sixteen

| # | Said | Got | Kind of failure |
| --- | --- | --- | --- |
| 1 | "I feel chest pain" | "Want me to put it in today's recovery log? If it is sharp… see a physio" | **Safety.** Chest pain is treated like a sore muscle. |
| 2 | "I feel dizzy" (earlier review) | "That isn't something I can answer" | **Safety.** |
| 3 | "how do I do a deadlift correctly?" | A list of the person's best sets | Wrong intent: "deadlift" matched records. |
| 4 | "should I do cardio before or after weights?" | Today's suggested weights | Wrong intent: "weights". |
| 5 | "explain why you increased my weight" | Today's suggested weights again | No explanation exists to give. |
| 6 | "my bench went down this week" | A general status of the week | The lift named is ignored. |
| 7 | "what's my best squat?" | Every lift's best | The lift named is ignored. |
| 8 | "what did I eat yesterday?" | "Nothing logged yet today" | Time is ignored: always today. |
| 9 | "I missed two workouts this week" | "Sounds like today got away from you" | Scope is ignored: week vs today. |
| 10 | "I feel tired all the time" | "A low day, then" | Scope: chronic vs today. |
| 11 | "I'm going to a wedding tonight, how do I handle food?" | "Reading labels lets people compare products" | A knowledge fragment that is not about the question. |
| 12 | "I don't like lunges" | "Mp lunge, group: legs. Mp lunge, variants: front, lateral…" | Raw knowledge-base records shown as an answer; the request (change it) not understood. |
| 13 | "can I train chest two days in a row?" | Three stitched fragments | The answer is in there ("at least one day between") but not said. |
| 14 | "I want to lose 5 kg in a month" | Protein fragments | The question (is that rate safe, what would it take) not answered. |
| 15 | "make my program 4 days" | Sent to redo the whole assessment | The engine can rebuild for 4 days; the coach does not ask it to. |
| 16 | "اعمل ايه النهارده؟" | "I can't answer that" | The same question in English works: Arabic is behind. |

Also seen: "you're wrong" gets "I can't answer that" (no way to correct the coach);
"remind me to weigh in" gets the weight trend (the app has no reminders, and does not
say so); "I only have 20 minutes" lists rep ranges that differ from the workout page
(`docs/NEXT-PHASE.md` F-A2).

### Why (the causes, in the code)

- **C1. Words, not meaning.** `intentOf()` scores keywords. It does not extract *what
  the sentence is about*: which exercise, which day, how long, which muscle. So "best
  squat" and "best lifts" are the same intent, and "yesterday" is not read at all.
- **C2. No order of precedence for safety.** A symptom is one intent among forty and
  can lose to another on score.
- **C3. The knowledge fallback shows raw search hits.** `know` answers are the
  top-scoring facts from `kbsearch.js` turned into prose mechanically. When the match
  is weak the person sees fragments, and structured records ("Mp lunge, group: legs")
  leak through.
- **C4. Requests that need the engine are answered with words.** "30 minutes, only
  dumbbells", "4 days", "I don't like lunges" are planning problems the engine can
  solve (`engine/plan.js`, `build.js`, `retarget.js`); the coach has no route to them.
- **C5. No reasons to give.** The engines decide (raise the weight, hold it, lighter
  week) but do not return *why* in a form the coach can say.
- **C6. Little conversation state.** A follow-up carries on the last request, but there
  is no topic, no "it", no correction, and no question back when something needed is
  missing.
- **C7. One 156 KB file** holds routing, forty answers, formatting and state. Nobody,
  human or model, can change one answer without risking the others.
- **C8. No measure of quality.** There are tests for individual answers, but nothing
  that says "the coach understands 91% of what people say", so it cannot be improved
  on purpose, and regressions like #16 are found by the owner.

---

## 2. The target: how the coach should work

One pipeline, each stage a small pure module in `js/coach/`, each testable in Node:

```
what was said
   │
   ▼
1. SAFETY      red flags first, before anything else can answer            safety.js
   │
   ▼
2. UNDERSTAND  → {act, topic, entities, time, scope, lang, confidence}      understand.js
   │              act: ask | do | tell | correct | chat
   │              entities: exercise, muscle, food+amount, equipment, minutes, days, number+unit
   │              time: today | yesterday | this week | last week | a date | a range
   │              scope: now | lately | always
   ▼
3. RESOLVE     "it", "that one", "the second", "same as yesterday" → the thing   dialogue.js
   │           missing something needed → ONE question back, with choices
   ▼
4. DECIDE      ask → an answer builder for (topic × entities × time)         answers/*.js
   │           do  → a command for the engine, as a preview                  commands.js (exists)
   │           tell → remember it, and act on it if it changes a plan        context.js (exists)
   │           correct → undo or re-read the last turn
   ▼
5. COMPOSE     every answer in one shape: the answer, the evidence,          compose.js
   │           the next step, the source
   ▼
6. CHECK       no raw records, no figure without a source, no clash          guard.js
               with the head (js/engine/head.js); else an honest "not covered"
```

### 2.1 The answer contract

Every reply, whatever its topic, has the same four parts, in this order. `compose.js`
builds it and `guard.js` refuses to send one that breaks it.

1. **The answer**, first sentence, direct. "Yes — leave at least a day between two
   chest sessions." Not a lead-in.
2. **The evidence**, from this person's own data where there is any, with the period
   said. "You trained chest Monday and it is in tomorrow's Full Body B."
3. **The next step**, at most one button, that does the thing. "Move Full Body B to
   Thursday."
4. **The source**, small: "From your log" · "From the textbook (rest between
   sessions)" · "Worked out (Mifflin–St Jeor)". Never missing; an answer with no
   source is not sent.

Length: three short paragraphs at most; lists only for things that are lists. The
person's name is not used; no praise that is not earned by a number.

### 2.2 Safety comes first (C2)

`js/coach/safety.js`, run before understanding, in both languages, on every message:

| Class | Words (and their Egyptian Arabic forms) | The reply |
| --- | --- | --- |
| **Stop now** | chest pain or pressure, pain spreading to arm or jaw, fainting or passed out, severe shortness of breath, sudden severe headache, numbness or weakness on one side, slurred speech | Stop training now. This can be an emergency: call the local emergency number or get to a doctor now. Nothing else: no log offer, no advice. If a workout is open: a "Pause my workout" button. |
| **Stop the session** | dizzy, light-headed, nauseous, blurred vision, heart racing or fluttering at rest, sharp or sudden joint pain, a pop or snap, pain that shoots or tingles | Stop this session, sit, sip water. If it does not pass in a few minutes or comes back, see a doctor before training again. Offer: end the workout, note it in the recovery log. |
| **Refer** | medicines, diagnosed conditions and fasting, pregnancy, eating very little, making oneself sick, self-harm | The existing scope answer (`js/knowledge/scope.js`), unchanged in spirit; for self-harm and eating-disorder language, a kind line and "talk to a doctor or someone you trust today", no numbers, no plan changes offered. |

The wording is fixed text reviewed once by the owner, taken from the scope-of-practice
rules already in `js/knowledge/scope.js`; the coach adds nothing to it. A safety reply
cannot be outranked, rewritten by the on-device model, or followed by a sales pitch
for another feature. Unit tests: every phrase, both languages, in the middle of a
longer sentence, with typos.

### 2.3 Understanding (C1)

`understand.js` replaces "pick the best-scoring intent" with "read the sentence".

- **Entities are found by resolvers that already exist** and are reused, not
  rewritten: exercise names (the library's matcher, `js/data/exercises.js`, with the
  Arabic names and gym slang the coach already knows), foods (`engine/nutrition.js
  fuzzyFoods`), muscles (`MUSCLE_TAGS`), numbers with units (the commands parser).
  New: **time** (today, yesterday, tonight, this/last week, this/last month, weekday
  names, "since Ramadan", dates; Arabic forms), **duration** ("30 minutes"),
  **equipment** ("only dumbbells", "at home", "hotel gym"), **scope** ("all the
  time", "lately", "always" vs "today", "now").
- **The act** is decided from the sentence's form, not its nouns: a question
  ("how/what/why/can/should", "ازاي/ايه/ليه/ينفع"), a request ("make/change/swap/add/
  log", "خلي/غير/بدل/ضيف/سجل"), a statement about oneself ("I ate / I slept / I don't
  like / my knee hurts"), a correction ("no / wrong / I meant / not that").
- **Topic × entities × time picks the answer.** "best" + exercise → that lift's
  record; "best" alone → all. "how do I do" + exercise → technique. "eat" +
  yesterday → that day's log. "why" + a recent change → its reason (2.5).
- **Confidence.** If the top reading is not clearly ahead, the coach **asks, with the
  two readings as buttons** ("Do you mean: how to do a deadlift · your best deadlift?").
  The existing "ask when unsure" behaviour is kept and fed by this.
- **Arabic is not a second pass.** Every pattern is written for both languages in the
  same table, and the evaluation (2.8) fails if a question passes in one language and
  not the other.

### 2.4 Requests go to the engine (C4)

A request is turned into a **command** and shown as a **preview with Undo**, as the
agent already does for adding and swapping exercises. New commands, each calling
engine code that exists:

| Said | Command | Engine |
| --- | --- | --- |
| "I have 30 minutes" / "only dumbbells today" / both | `session.fit {minutes, equipment}` → today's session rebuilt to fit: main lifts kept, same prescription the workout page uses, substitutes for missing equipment | `engine/dayplan.js`, `plan.js` substitutes |
| "make my program 4 days" / "I can only train Mon Wed Fri" | `program.days {n | weekdays}` → rebuilt week to review beside the current one | `engine/build.js`, `schedule.js` |
| "I don't like lunges" / "never give me burpees" | `exercise.avoid {name}` → stored as a dislike (the assessment already has the list), every occurrence replaced with the family's next best for this person | `plan.js AVOID`, `retarget.js` |
| "my knee hurts when I squat" (after the safety check: not sharp or sudden) | `limit.add {area}` → the injury rules the app already applies from the assessment, applied now: what loads the area is flagged, substitutes offered | `engine/conditions.js`, `knowledge/injuries.js` |
| "travelling next week, no gym" | `program.away {from, to, equipment:none}` → a bodyweight week for those dates, the normal program back after | `build.js` for equipment |
| "move today's workout to tomorrow" | exists (`app`); keep | |
| "change my goal to fat loss" | exists; the preview shows what changes in training **and** food together | `goals.js`, `retarget.js` |

Rules: a preview always shows **what changes, in numbers, and what stays**; nothing is
applied without a tap; every applied change has Undo; a request the engine cannot do
is answered "I can't do that yet" with the nearest thing it can do, never with an
unrelated answer.

### 2.5 Reasons (C5)

The engines that decide things return a **reason object** with what they decided:

```js
{ decision:"hold", lift:"Barbell Bench Press", from:60, to:60,
  because:[{k:"no-gain", sessions:3}, {k:"rpe-high", avg:9.2, planned:8}],
  rule:"missed-twice-hold", source:"acute-variables 20.3" }
```

Stored with the suggestion (`S.cur` for the open workout, the session when finished)
so that "why did you raise my weight?", "why is today lighter?", "why 2,900 kcal?"
and "why this exercise?" can be answered from what actually happened, in one
sentence each, with the rule named. Covers: load progression (`engine/lifts.js`),
lighter weeks (`formulas.js deloadDue`), readiness adjustments, calorie targets
(`engine/energy.js`, `plancheck.js`), exercise choice (`plan.js`), day order
(`engine/recovery.js`). Where an engine cannot give a reason, the coach says "the app
suggested it; I can't show the working for this one" — it never invents one.

### 2.6 Knowledge answers that are answers (C3)

- **Written answers first.** `js/data/faq.js` (the coach's own written answers) is the
  first source for general questions. The review's misses become new entries, each
  written from the knowledge base with its section noted: training the same muscle on
  consecutive days; cardio before or after weights; how fast weight can safely be
  lost (the KB's own rate, with the person's numbers put in); eating at an event
  (plan the day around it: the KB's energy-balance and protein guidance, no "cheat
  meal" lore); feeling tired all the time (sleep, energy intake, the overtraining
  entry, and "see a doctor if it goes on" — the scope rule).
- **Technique questions open the exercise.** "How do I do X" → the exercise's sheet
  (steps, the figure once it passes its safety gate — `docs/FIGURE-V3.md` 2.6 — cues
  from `knowledge/cues.js`), with the two cues that matter most said in the chat.
- **The search fallback is gated.** A `know` answer is sent only if (a) the top
  passage scores above a threshold tuned on the evaluation set, (b) every sentence is
  a complete sentence (starts with a capital, has a verb; no "key: value" records —
  filter by the fact's type in `kbsearch.js prose()`), and (c) it shares at least two
  content words with the question. Otherwise: "The textbooks here don't cover that"
  plus the two nearest topics it *can* answer, as buttons. An honest miss is a pass;
  a fragment is a fail.

### 2.7 Conversation (C6)

`js/coach/dialogue.js` keeps, for the life of a conversation (the app's existing
day-long window):

- **The topic and its entities**, so "and squats?", "what about last week?", "make it
  lighter" continue it. (The existing follow-up code moves here.)
- **One pending question.** When something needed is missing ("log a set" — of what?),
  the coach asks one question with choices; the next message is read as its answer.
- **Corrections.** "No", "wrong", "that's not what I asked", "I meant…" → if the last
  turn made a change, offer Undo; if it was an answer, re-read the earlier message
  with the next-best reading and say so ("I took that as X. Did you mean Y?"). The
  existing "Not what I asked" link feeds the same path. Every correction is recorded
  (2.8).
- **Memory the person can see.** What the coach keeps (dislikes, limits, schedule
  facts, "travelling 12–19 Nov") is listed in Profile → Smart coach → "What the coach
  remembers", each line removable. Nothing is kept that is not shown there.

### 2.8 Measuring it (C8)

- **The evaluation set**: `tests/coach-eval.json`, at least **300** utterances to
  begin with (the 45 of this review, every phrase in the existing coach tests, and
  the owner's reported misses from `.claude/PROGRESS.md`), each in English **and**
  Arabic, each with:
  `{say, profile, expect:{act, topic, entities, time}, mustSay:[…], mustNotSay:[…], action}`.
- `node tests/coach-eval.mjs` runs it in Node (the pipeline is pure) and prints the
  score by stage: safety 100% required; understanding ≥ 92% to merge, rising; answer
  contract 100% (shape); English–Arabic parity: no item passing in one language only.
  It runs in the "Engine, coach and architecture" job on GitHub.
- **Learning from real use, on the phone only.** Each time the coach asks "did you
  mean", gets "Not what I asked", gets a correction, or answers "not covered", the
  utterance and the reading are kept in a local list (per profile, capped at 200,
  never sent anywhere). Profile → Your data → "Export coach misses" writes them to a
  file the owner can hand to a builder, who adds them to the evaluation set. This is
  how the coach gets better month on month without a server.

### 2.9 A step ahead

The coach speaks first only through **the head** (`js/engine/head.js`, WP-1 of
NEXT-PHASE), so it can never contradict a page:

- **Opening the chat** shows the lead signal as the coach's first line with its one
  action, then the usual suggestions — chosen from what is live today (a session
  planned, food behind, a check-in open), not a fixed list.
- **After a workout**, one debrief line in the chat thread (the finish screen's "next
  time" content, WP-4), so the conversation has the session in it for follow-ups.
- **During a workout**, the suggestions are about this exercise: "Machine taken",
  "Too heavy", "Show me the form", "Swap it".
- **Weekly**, the check-in's summary is said in the chat with its decisions as
  buttons, the same ones as the Coach page.
- It does **not** send notifications, nag, or repeat a dismissed signal.

### 2.10 The on-device model's place

The optional Smart coach (`js/engine/smart.js`, off by default, a large download) is
kept **optional** and given a narrower, safer job:

- **Understanding only, when the rules are unsure**: it is asked to return the
  structure of 2.3 as constrained JSON (`{act, topic, entities, time}`) for the
  sentence; the app validates every field against its own lists (an exercise it does
  not have is dropped). The answer is still built by the app from the log and the KB.
- **Rewording**: it may rephrase the composed answer for tone, with the figures passed
  as locked tokens it cannot change; `guard.js` compares the numbers in and out and
  discards the rewrite if any differ.
- It never answers a safety message, never states a figure of its own, never decides
  a plan change. The coach must reach the evaluation's pass mark **with the model
  off**; the model only improves the long tail.

---

## 3. Work packages

Build in this order. C-0 and C-1 are small and remove real risk; do them first.

| # | Package | Fixes | What is built | Accept |
| --- | --- | --- | --- | --- |
| C-0 | **Safety first** | #1, #2, C2 | `js/coach/safety.js` and its fixed replies (2.2), called at the top of `askOne()`; "Pause my workout" action | Every phrase of 2.2, both languages, alone and inside a sentence, gets its class's reply and nothing else (unit). "My chest is sore from benching" does **not** trigger "stop now" (unit: soreness words + a muscle, no pain-spreading/pressure words). |
| C-1 | **The evaluation set and runner** | C8 | `tests/coach-eval.json` (300+), `tests/coach-eval.mjs`, wired into the GitHub job; today's score recorded in PROGRESS.md as the baseline | The runner prints per-stage scores; CI fails under the thresholds of 2.8 (set at today's score first, raised by each later package). |
| C-2 | **Split the file** | C7 | `chat.js` → `js/coach/answers/<topic>.js` (pure: state in, answer object out), `js/ui/views/chat.js` keeps only drawing; no behaviour change | Every existing chat test passes unchanged; evaluation score unchanged; `chat.js` under 40 KB. |
| C-3 | **Understanding** | #3–#10, #16, C1 | `understand.js` (2.3): act, entities, time, scope; answers take entities and time ("best squat", "ate yesterday", "bench this week") | Evaluation understanding ≥ 92%; parity 100%; the ten rows named pass. |
| C-4 | **The answer contract and the guard** | #11–#14, C3 | `compose.js`, `guard.js` (2.1, 2.6); new written answers in `faq.js`; technique questions open the exercise | No answer in the evaluation contains a raw record (regex for `\w+, \w+: ` patterns and lower-case-start fragments); every answer has a source; rows 11–14 pass. |
| C-5 | **Requests to the engine** | #12, #15, C4 | The commands of 2.4 with previews and Undo | Browser tests: each command previews, applies on tap, undoes; "30 minutes, only dumbbells" produces a session whose estimated time ≤ 30 and whose every exercise needs only dumbbells or bodyweight; its ranges equal the workout page's. |
| C-6 | **Reasons** | #5, C5 | Reason objects from the engines (2.5); "why" answers | For each of the six decision kinds, "why…?" names the actual rule and numbers (unit, with seeded logs). |
| C-7 | **Conversation** | C6 | `dialogue.js` (2.7): topic, pending question, corrections, visible memory | Scripted multi-turn conversations in the evaluation set (at least 30) pass; "you're wrong" after a change offers Undo. |
| C-8 | **A step ahead** | — | 2.9, after WP-1 (the head) is merged | The chat's first line equals `headNow().lead`; no suggestion contradicts a page (test with the profile that triggers deload + low volume). |
| C-9 | **The model, narrowed** | — | 2.10 | With the model on, numbers in a reworded answer equal the composed answer's (unit with a stub model that tries to change one); with it off, the evaluation passes. |
| C-10 | **Misses, exported** | C8 | The local miss list and its export (2.8) | A "Not what I asked" adds a line; export produces a JSON file; nothing is sent over the network (test with the network blocked). |

## 4. Rules for this work

Everything in Part 3 of `docs/NEXT-PHASE.md`, and:

- **No invented values.** An answer's every number comes from the log, an engine, or a
  knowledge entry with its section. If none has it, the coach says it is not covered.
- **Scope of practice.** No diagnosis, no medicine, no supplement dosing, no meal
  plans for medical conditions: `js/knowledge/scope.js` decides, and the safety layer
  runs before it.
- **Nothing changes without a tap, everything has Undo** (owner, 10 Nov).
- **Both languages or neither.** A new pattern, answer or command ships with its
  Egyptian Arabic form and its evaluation items in both languages.
- **Offline.** Nothing in this plan needs a server. The misses stay on the phone until
  the owner exports them.
- **No personality layer.** The coach is direct, specific and brief. It does not use
  emoji, exclamation marks, or praise without a number behind it.

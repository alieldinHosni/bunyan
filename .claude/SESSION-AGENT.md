# BUNYAN — Assistant

**Read `CLAUDE.md` and `.claude/SESSION-PLAN.md` first.**
**This is Session 5. It runs after `MASTER-BACKLOG.md` items 1–11 are complete.**

---

## What this is

A conversational layer over the app's own actions. **Anything the user can do by tapping,
they can ask for in a sentence instead.**

The problem it solves: the app has a lot of functionality and the user cannot always find
or reach it. They know what they want. They should be able to say it.

> "add triceps pushdown to my push day"
> "swap my squat for leg press today"
> "log 200g chicken"
> "what's my bench doing lately"
> "ضيف ترايسبس بوش داون"

## What this is not

- **Not an LLM.** No API, no key, no server, no per-request cost. It works offline in a
  basement gym with no signal, which is where it will mostly be used.
- **Not an autonomous agent.** It does not decide things, plan multi-step work, or act
  without being asked.
- **Not a new capability surface.** It has access to exactly the actions the UI already
  exposes and nothing more. If a human cannot do it by tapping, the assistant cannot do it
  either.

It should *feel* like talking to a competent coach. That feeling comes from how it handles
the cases it cannot satisfy, not from how it handles the easy ones. See §3.

---

## 1. The action registry — build this first

Before any parsing, enumerate every action a user can currently perform in the app.

The audit counted 106 event branches. Go through them and produce `js/agent/actions.js`: a
registry where each entry has

- a stable `id` — `exercise.add`, `exercise.swap`, `set.delete`, `food.log`, `progress.show`
- a short `description` in plain language
- its `parameters`, each with a type and whether it is required
- a `handler` that calls **the same function the UI button calls** — not a copy of it
- `confirm: true` for anything destructive or program-altering

**Rules:**

- **Wrap existing functions. Never reimplement them.** If the registry duplicates logic, the
  two copies will drift and the assistant will start behaving differently from the buttons.
- **No privileged actions.** The registry cannot contain anything the UI cannot do.
- Group by domain: `exercise.*`, `set.*`, `food.*`, `plan.*`, `progress.*`, `profile.*`,
  `cardio.*`.
- Report the full registry before writing the parser. It is the contract everything else
  depends on, and it is worth reviewing on its own.

This registry has three uses beyond the assistant: it is a testable inventory of what the
app does, it is what a future LLM route would call, and it documents the app's own surface.

---

## 2. Resolution — sentence to action

### Reuse the matcher that already works

The food search handles typos and Arabic and the owner has confirmed it works well. **Use
that same matcher** for exercises, day names and foods. Do not write a second fuzzy-matching
implementation — the app already has one good one, and a second will diverge.

### The pipeline

1. **Normalize** — lowercase, strip punctuation, normalize Arabic forms (أ/ا, ى/ي, ة/ه,
   remove diacritics).
2. **Intent** — match against a verb table. Each action id carries its trigger words in both
   languages: `add` / `put` / `ضيف` / `حط` → `exercise.add`.
3. **Entities** — fuzzy-match the remainder against the relevant collection: the
   873-exercise library, the user's split day names, the food database, measurement names.
4. **Resolve** — produce a candidate action with its parameters filled, plus a confidence
   score, plus any parameters still missing.
5. **Confirm, then execute** — never the other way round.

### Confidence drives behaviour, not a yes/no

- **High** — one clear match. Show what it will do, apply on confirm.
- **Medium** — a plausible match. Say what it understood and ask.
- **Low / none** — do not guess. Go to §3.

**Never invent.** The assistant cannot reference an exercise not in the library or a day not
in the split. A parser that cannot hallucinate is the main advantage this design has over a
model, and it must not be given up.

---

## 3. The conversational layer — this is where it feels smart

Perceived intelligence lives almost entirely in the failures. Anyone can handle
"add bench press to push day".

### The one hard rule

**Never say "I don't understand."** Always say what *was* understood, then what is needed.

### Failure taxonomy — each gets its own response shape

**Unknown exercise.** Name the problem, offer the nearest matches from the library.
> "No exercise called 'tricep extention machine' in your library. Closest I have: Triceps
> Pushdown, Cable Overhead Extension, Machine Dip. Which one?"

**Ambiguous target.** Ask only for the missing piece. Do not re-ask what you already have.
> "You've got two push days this week — Monday or Thursday?"

**Missing parameter.** Ask for exactly one thing.
> "How many grams of chicken?"

**Understood but not possible here.** Say where it lives. Do not pretend.
> "I can change your target weight, but height is in Profile → Body. Want me to open it?"

**Out of scope entirely.** Say so plainly and offer the nearest thing you can do.
> "I can't tell whether your ankle is ready for cutting drills — that needs a physio. I can
> show you how your ankle isometrics have been trending."

**No data yet.** Say what is missing and how much is needed.
> "Only one bench session logged, so there's no trend yet. Three sessions and I can show you
> a direction."

### Voice

- **Short.** The owner's existing rule holds: this gets read mid-set, between working sets,
  one-handed. Two sentences maximum. One is better.
- **Direct.** No "Great question!", no "I'd be happy to", no apologising, no exclamation
  marks.
- **A coach, not a chatbot.** States what it did or what it needs. Does not chat.
- **Never clinical.** No diagnosis, no medical advice, no injury assessment. The scope
  boundaries extracted into `js/knowledge/scope.js` are hard limits here — when a request
  crosses one, say what it can offer instead.

---

## 3b. Answering technical questions from the knowledge base

The assistant answers training questions, not just commands. The knowledge base built in
Session 4 is what it answers from.

### Two sources, and the combination is the point

- **`js/knowledge/`** — the extracted methodology: phases, acute variables, imbalance
  patterns, corrective stages, cues, nutrition rules, scope boundaries.
- **`js/coach/`** — the user's own log: weekly volume per muscle, e1RM trends, fatigue
  signals, current phase.

Either alone is ordinary. A textbook answer is a textbook answer, and a number from the log
is just a number. **Answering from both is what sounds like a coach who knows you.**

```
"how many sets should I do for chest?"
→ "You're at 11 sets of chest this week. The useful range is roughly 12–20, so
   there's room for one more pressing session."

"why am I doing ankle isometrics?"
→ "They load the joint without moving it, so you build tolerance before adding
   range. Yours are at the activation stage — next is working them into
   single-leg movements."

"what does tempo 2/0/2 mean?"
→ "Two seconds lowering, no pause at the bottom, two seconds lifting."
```

The first and second answers are only possible because the app knows both the method and the
user. Prefer that shape wherever the data exists.

### The knowledge base is the only source

**If the answer is not in `js/knowledge/`, say so. Do not answer from general knowledge.**

This is the rule that keeps the assistant trustworthy. A parser that answers only from a
verified store cannot be wrong about what it says — the moment it starts filling gaps from
elsewhere, every answer becomes unverifiable and the user has no way to tell which is which.

```
"what's the best protein powder?"
→ "Not something I have data on. I can show you your protein intake for the
   week against your target."
```

### Answers are generated, never quoted

Every answer is **built from the structured data in the app's own voice.** Response templates
take values and produce a sentence.

Answer templates must not be book sentences with blanks in them. If a template reads like
the source text, it is wrong — the extraction rule in `CLAUDE.md` applies to output as much
as to storage.

### Two tiers

Short answer first — one or two sentences, the §3 voice rules hold. Then an optional expand
for the detail: the full prescription, the reasoning, the related exercises.

The owner reads this between working sets. A paragraph is a failure even when every word in
it is correct.

### Honesty about confidence

Where the knowledge base records a value as a practitioner heuristic rather than a measured
constant — volume landmarks above all — say so when it matters to the decision.

> "Those ranges are rules of thumb, not precise numbers. Your own recovery tells you more."

Where two sources in the knowledge base disagree and both were recorded, say there is no
single accepted answer rather than picking one silently.

### Scope is a hard stop

`js/knowledge/scope.js` holds the out-of-scope action list. The assistant does not cross it
regardless of how the question is phrased, and it never diagnoses, assesses an injury, or
advises on a medical condition.

```
"is my ankle healed?"
→ "That's not something I can judge — it needs a physio. I can show you how
   your ankle work has been trending."
```

### Questions about the user's own numbers

Route to `js/coach/`, not a canned string. "How's my bench doing" returns the real e1RM
trend. If the engine reports insufficient data, say that — never fill the gap with
encouragement.

---

## 4. Confirmation and undo

- Anything that changes the program or the log shows what it will do and waits for a tap.
- Read-only queries answer immediately, no confirmation.
- Every applied action is undoable for the rest of the session. One undo is enough; no
  history stack.
- A confirmation is a chip or inline row, **not a modal.** Modals and sheets are the source
  of several existing bugs and the assistant should not add more of them.

---

## 5. Where it lives

A persistent input, reachable from anywhere, that does not cover the content behind it.

- Does not block the bottom nav
- Does not trigger the swipe-back gesture
- Keyboard appearing does not shift the layout
- Closes by tapping outside, and that does not fire an action
- Full RTL, with the input and its history mirrored

**Render granularity applies.** Sending a message appends one row. It does not rebuild the
conversation, the screen behind it, or anything else. Five bugs have come from whole-screen
rebuilds — a chat log appending on every message is the shape most likely to produce a
sixth.

---

## 6. Arabic

- Every string through `t()` with an AR entry, including every failure message in §3.
- Trigger words defined in both languages per action, not translated at runtime.
- Arabic normalization in the matcher (hamza forms, taa marbuta, diacritics) so typed Arabic
  matches library entries.
- Mixed-language input works: Arabic verb with an English exercise name is normal and must
  resolve.

---

## 7. Constraints

- Vanilla ES modules. No framework, no build step, no npm.
- **Fully offline. No network calls of any kind.**
- You own `js/agent/` only. The registry wraps existing functions; it does not modify them.
  If an existing function needs changing to be callable, write the request in
  `PROGRESS.md` and stop.
- Existing design tokens only.

---

## 8. The later LLM option — design for it, do not build it

If the parser cannot resolve a sentence, that is the natural place to later hand off to a
model. Leave a single clearly marked seam for it and nothing more.

Do not build it, do not add a key, do not add a server. The rules path must stay the default
forever, so that the common case is free, instant and works offline.

---

## Acceptance criteria

- Every registry action maps to a function the UI already calls. No duplicated logic.
- Every technical answer traces to an entry in `js/knowledge/`. Nothing is answered from
  general knowledge, and no answer template reproduces source phrasing.
- Where both exist, answers combine the knowledge base with the user's own data rather than
  giving a generic range.
- The assistant cannot perform any action unavailable through the UI.
- No network calls. Verify with the network disabled.
- No invented exercises, days or foods — ever, at any confidence level.
- Every failure in §3 produces its specified response shape. None produces
  "I don't understand."
- Every destructive or program-altering action is confirmed and undoable.
- Sending a message appends one row and rebuilds nothing.
- Works fully in Arabic and RTL, including mixed-language input.
- No response exceeds two sentences.

---

## Verification

Test on a physical iPhone, with the network off.

By hand, in both languages:

- Add an exercise to a day. Confirm it appears in the plan exactly as the button would add it.
- Misspell an exercise badly. Confirm it offers real alternatives and invents nothing.
- Ask for something that does not exist. Confirm it says so and offers the nearest action.
- Ask a medical question. Confirm it declines and offers something it can actually do.
- Ask about a lift with one session logged. Confirm it says there is not enough data.
- Ask a technical question the knowledge base covers. Confirm the answer is correct, under
  two sentences, and uses your own numbers where it can.
- Ask a technical question the knowledge base does not cover. Confirm it says so rather than
  answering anyway.
- Undo an action. Confirm the app state is exactly as before.

When done, update `.claude/PROGRESS.md` and stop.

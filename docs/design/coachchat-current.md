# CoachChat today — what it is, before the assistant is designed on top of it

Design session, §5 step one (owner, 20 Oct: extend CoachChat, do not build a second chat).
Read from `main` (`40bd8a3`): `js/ui/views/chat.js` (691 lines), `js/coach/intent.js`
(192), `js/ui/chatmotion.js`, the chat handlers in `js/ui/handlers/coach.js` and
`common.js`, and the chat rules in `index.html` (~4385–4494).

No design yet. This is for the owner to confirm before anything is drawn.

---

## 1. Where it lives

- **One place: Coach → Coach AI.** The Coach AI page carries a composer card ("Ask me
  anything", a field that opens the chat with the keyboard up, and five question chips).
  Tapping it pushes a full-screen route, `coach/chat` (`V.chat`), with a back arrow.
- **Nowhere else.** Not on Training, Food or Progress, and **not during a workout**: the
  live workout has no dock and no way to Coach, and `render()` sets `V.chat=false` the
  moment the tab is not Coach.
- It is a screen, not a sheet or a modal. The question field (`.chat-form`) is sticky at
  the bottom, above the dock (`bottom: calc(var(--navh) + 10px)`), and drops to the
  bottom edge when the keyboard is up (`body.kb`).

## 2. What it answers

A **guided** chat: no model, no network. `intentOf()` matches a typed question, in
English, Egyptian Arabic or Franco-Arabic ("3ayez akol eh"), to one of a fixed set of
intents. It tolerates one-letter typos and Arabic spelling variants. The answer is worked
out from the person's own log, plan and targets with the same engines the app uses, and
comes back in the language the question was asked in.

| Group | Intents (21) |
|---|---|
| Training | today, tomorrow, last workout, what to lift (names exercises in the plan), short on time / missed, sore or in pain, program balance |
| Food | what to eat now, rest of today, food swaps, food facts (names a food) |
| Body and progress | how am I doing, weight trend, protein, calories, strength (with percentiles), goal, a new plan, water, steps and cardio |
| Conversation | help, hello, thanks, unknown |

**What it can do**, through buttons on the newest answer:

| Kind | Buttons | How it happens today |
|---|---|---|
| Go somewhere | Open Food, Open Progress, Targets, Open my program, View session, Log weight, Log steps… | Navigates away |
| Start something | Start workout, Train anyway, Resume workout, Start the assessment | Acts at once |
| **Change the plan or log** | Eat 150 kcal less/more a day (`chatkcal`), Set my goal to … (`chatgoal`), Build my targets on … kcal (`pcfix`), a coach fix (`cofix`), Log today's plan (`logday`) | **Applied on the tap, no confirmation**; Undo is a toast |

**What it cannot do:** any command. "Add triceps pushdown to my push day", "swap my squat
for leg press today", "log 200 g chicken" all fall to an intent that answers a question,
or to *unknown*. That is the gap `SESSION-AGENT.md` fills.

The conversation is kept: the last 30 questions and answers in `S.chat`, per profile,
in backups too. Only the newest answer keeps its buttons.

## 3. What it looks like

- **Empty state:** a pulsing orb with the whistle glyph, one line ("Ask me about today's
  training, your food, or how things are going…"), then 12 questions in three groups
  (Training, Food, Progress) as rows with a glyph each, then a privacy line.
- **A question:** a bubble on the trailing side, an accent gradient with a tail corner.
- **An answer:** a card (`raised`, shadow) headed "Coach · <topic>" with the topic's
  glyph, then paragraphs, ruled lists and small notes, then its buttons (the first one
  filled, the rest grey).
- **Under the newest answer:** "Ask next", three suggestion chips.
- **Motion** (`chatmotion.js`): the question flies from the field to its place, then
  **three typing dots for 720 ms**, then the answer's parts arrive one after another.
  The answer is already computed; the dots are staging.

## 4. Against the design brief (§5) and the agent spec

| Requirement | Today |
|---|---|
| Persistent input, reachable from anywhere | **No.** Coach AI only; not during a workout |
| Short answers, one or two sentences | **No.** Most answers are 2–6 paragraphs plus a list and a note (calories: up to five paragraphs) |
| Inline confirmation for actions | **No.** Plan-changing buttons apply on the tap |
| Undo after an action | **Partly.** A toast, gone after a few seconds, not in the conversation |
| Clarifying question with options | **No.** Nothing asks back |
| Nearest matches, 3–4 to choose from | **No.** Worse: a food named with a typo is **matched silently** (`namedFood()` takes a fuzzy hit at distance ≤ 2 and answers about it). That breaks "guesses are offered, never taken" |
| Empty state that suggests what to say | **Yes.** 12 grouped questions |
| No avatars, timestamps, read receipts, typing dots | **Typing dots: present** (720 ms). No timestamps or receipts |
| No persona, mascot, greeting | **The pulsing orb** reads as a mascot. "Coach" heads every answer. *hello* answers "Hi {name}." |
| Keyboard does not shift the layout | Handled by `body.kb`; not verified on a phone in this session |
| Does not block the dock; no swipe-back | Sits above the dock. It is a pushed screen, so the edge swipe goes back, by design |
| Sending appends one row and rebuilds nothing | **No.** `ask()` then `render()`: the whole conversation (up to 30 entries) is rebuilt as a string and patched in. Patched, not replaced, but not one appended row |
| Never "I don't understand" | *unknown* says "I can't answer that one…" and shows chips. Close to the forbidden shape |
| Arabic, mixed input | **Yes, and well.** Per-question language detection, Franco-Arabic, Arabic normalisation |

**What to keep:** the matcher, the per-question language, the "from your log, on this
phone" honesty, the answers' content and the empty state's grouped questions. All of it
works and was built to the honesty rules.

## 5. Proposed direction (for approval; not designed yet)

1. **One conversation, more doors.** The same `S.chat` and the same screen, reached from
   every tab and from the workout, not only from Coach AI. The question is *how* (see
   the decisions below).
2. **Two tiers for every answer.** A lead of one or two sentences, set large enough to
   read mid-set, and "More" that unfolds today's paragraphs and lists. Nothing written
   today is lost; it moves behind the lead.
3. **Four new answer shapes**, all inline in the conversation, none a sheet:
   - **Action**: what will change, in one line, with **Apply** and **Not now**.
   - **Applied**: the same row turned to done, with **Undo** that stays for the session.
   - **Clarify**: one short question with its answers as buttons ("Monday or Thursday?").
   - **Nearest matches**: "No exercise called '…'. Closest:" with three or four options
     and "None of these". This also replaces the silent food match.
4. **Take out the chat-app staging**: the typing dots, the pulsing orb, and the
   question's bubble tail. The answer appears when it is ready, which is at once.
5. **Answers keep their topic header**, without the "Coach" label on each one.

## 6. Decisions needed before drawing

1. **The door from other tabs.** (a) A slim glass "Ask" bar above the dock on Training,
   Food and Progress, opening the full chat screen; or (b) an Ask button in each tab's
   header. (a) is always in reach; (b) costs no height.
2. **During a workout.** The log control owns the bottom of that screen. Proposal: an
   Ask button in the workout header's ⋯ row, never a bar near the check.
3. **The expanded conversation.** Keep it as today's full-screen route (no new sheet), or
   an inline panel over the current tab. The brief warns against new sheets; a panel over
   content is one in all but name. Recommendation: the existing screen.

## 7. Captures, and what they showed

`docs/design/current/`: `chat-card.png` (the composer on Coach AI), `chat-empty.png`,
`chat-answer.png` ("how much should I lift on bench"), `chat-long-answer.png` ("why are my
calories set like this"), `chat-command.png`. Headless Chromium at 390 × 844, the
regression suite's seed profile, Blue dark, English.

- **A command is answered as something else, wrongly.** "add tricep extention machine to
  push day" came back as **Food facts: White Rice, Cooked, 205 kcal per cup**. No intent
  matched, so `ask()` fell through to `namedFood()`, which stripped the question words and
  took a fuzzy food hit. This is the silent guess in §4, seen live. It is the strongest
  argument for the nearest-matches shape, and for a command never landing on a food fact.
- **The answers are long.** The three answers measured 95, 112 and 43 words, and 421, 521
  and 283px tall: the calories answer alone is more than half a screen.
- **The field covers content.** On the empty state the sticky field sits over the topic
  list ("How much protein do I need?" is under it). Under an answer it sits clear, at
  682–738.
- **Text over the drawing.** The empty state's opening line and the "Ask next" chips sit
  on the background drawing, whose lines run through the words: the same §3 case as the
  workout's recommendation banner.

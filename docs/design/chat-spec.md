# Ask panel — component spec (deliverable 5, chat part)

CoachChat, extended, not replaced (owner, 20 Oct). Same conversation (`S.chat`), same
matcher (`js/coach/intent.js`), same answers; a new place to open it, a new shape for
answers, and four new answer types for the agent's actions (`SESSION-AGENT.md`).

Prototype: `design/chat.html`, reading `design/tokens.css` (`main`'s tokens). Each frame
opens on its own with `#<state>-<ltr|rtl>`. Every colour is an existing token; no new
colours. Built on `coachchat-current.md` and the owner's rulings of 20 Oct.

---

## Owner's rulings this design follows

1. **One entry point, the same place on every tab.** A dock item if the dock has room;
   otherwise one header button in the same position everywhere.
2. **During a workout: in the ⋯ menu**, nowhere near the log control.
3. **A panel over the current tab**, so an action is seen landing. **Not a draggable
   sheet**: no drag, no drag-to-dismiss. It closes with ✕ or a tap outside. It may go full
   screen for reading history, by a tap.
4. Answers are one or two sentences, detail behind an expand.
5. The input never overlaps content.
6. No text over the background drawing.

## 1. Does the dock have room? Yes, measured

The dock today holds four places (Training, Food, Coach, Progress); the open one is a pill
with its name. A fifth circle was added in the browser and measured, with the widest name
open ("Progress" in English, "التقدم" in Arabic), transitions off:

| Screen | Free space with 4 | With 5: circles | Open pill | Name cut? |
|---|---|---|---|---|
| 390 (iPhone 13 Pro) | 96px | 49px | 113px | no |
| 375 (iPhone SE, mini) | 87px | 47px | 113px | no |
| 375, Arabic | 75px | 47px | 95px | no |
| 320 | 47px | 40px | 96px | **yes**, by 17px ("Progr…") |
| 320, Arabic | — | 41px | 92px | by 3px |

**It fits on every current iPhone (375 and up) with nothing cut.** At 320 the open name is
ellipsised, which the dock already allows by design, and its circles fall to 40px, under
44. Note: the four-place dock is already 42px there today.

**So: Ask is the fifth place on the dock**, at the right end in both languages (the dock
never mirrors, by `main`'s rule). Its icon is drawn in the dock's own cut (square ends,
mitred corners): a speech outline with a question mark.

**Ask is not a tab.** Tapping it does not change the tab or the open pill; it opens the
panel over whatever is on screen, and its circle takes a 2px `dock-pill` ring while the
panel is open. Tapping it again closes the panel.

## 2. States

| State | Frame | What it shows |
|---|---|---|
| Empty | `empty` | One line on what can be said, then four things to say in two groups: Ask, Change |
| Answer | `answer` | The question, the topic, a two-sentence lead at 18px, More |
| Action confirmation | `confirm` | What will change, in one sentence and one detail line; **Add it** / **Not now** |
| Applied | `applied` | Done, with Undo; the tab behind scrolls the new row into view, outlined, marked Added |
| Clarifying question | `clarify` | One short question; the answers as buttons |
| Close matches | `matches` | "No exercise called …. Closest:" three real library entries and None of these |
| After undo | `undone` | "Undone. Push A is as it was."; the tab behind is back as it was |

All in English (LTR) and Arabic (RTL). The tab behind is Training's Push A day, drawn
plainly; it is context, not part of this design.

## 3. Components

### AskPanel (new; replaces the `coach/chat` route as the way in)
- Floats over the current tab: 10px from each side, its bottom 10px above the dock. **The
  dock stays visible and usable.**
- **As tall as what it holds**, up to 250px from the top of the screen. A short answer
  leaves most of the tab in view; the measured panels run from 250px (close matches) to
  482px (after undo) at the top.
- Flat `raised`, `border`, radius `--r5`, `shadow-float`. **Opaque: no glass, no blur in
  the panel**, and no text on the background drawing. The only blurred layer on screen is
  the dock, as today.
- **No grabber, no drag.** Nothing in it responds to a vertical drag except the
  conversation's own scroll.
- Header: "Ask" (18px Outfit 700), "From your log, worked out on this phone" (13px,
  `dim`), ⤢ full screen (44px), ✕ close (44px).
- **Outside it**: a veil of `rgba(var(--bg-rgb), .42)`, light enough to see a change land.
  A tap on the veil closes the panel and does nothing else; the tap is not passed through.
- **⤢**: the whole conversation full screen (today's `coach/chat` screen, kept for
  history). By a tap only.
- Keyboard: when the field has focus the dock hides (`body.kb`, as today) and the panel
  sits on the keyboard; the tab behind does not move.

### AskField (changed)
- **In the panel's flow, under the conversation**, never positioned over it. The
  conversation scrolls between the header and the field. This removes the overlap found on
  today's opening screen by construction.
- 48px pill on `surface`, placeholder "Ask, or say what to change"; a 48px send button
  (icon only, on the action fill: 6.80:1 in Red).

### Question line (changed)
- The person's words, on the reading-end side, `surface` with `sub` type, 15px. No bubble
  tail, no "you" label.

### Answer (changed)
- Topic (13px/700, `dim`), from today's TOPIC table, **without the "Coach" label**.
- **Lead: one or two sentences, 18px/600, `text`.** Numbers in the lead are bold.
- **More** (44px, `accentHi`) unfolds today's paragraphs, lists and notes, unchanged.
  Nothing written today is lost; it moves behind the lead.
- Today's action buttons stay, under the lead, for answers that go somewhere.

### ActionConfirm (new)
- For anything that changes the program or the log (`confirm: true` in the registry,
  `SESSION-AGENT.md` §1). Read-only questions answer at once.
- Lead as a question ("Add Triceps Pushdown to Push A?"), then the change itself on
  `surface`: the name, and one line of what it brings (3 × 10–12 · last in the day).
- **Add it**: the action's own verb, never "Confirm". 52px, 20px Outfit 700 label
  on the action fill. **Not now**: 52px, `surface`.
- On `--color-action-fill` (never Machine Red under a label; `token-requests.md` §4):
  6.80:1 in Red.
- The verb carries through: **Add it** → "Added …". Swap → "Swapped …". Log → "Logged …".

### Applied (new)
- `okSoft` row with an `ok` edge, a 36px `ok` check, "Added Triceps Pushdown to Push A.",
  and **Undo** (44px). **Undo stays for the session** on the newest applied action (one
  undo, no history stack, as `SESSION-AGENT.md` §4 says), not in a passing toast.
- **Seeing it land**: the tab behind scrolls the changed row into the strip above the
  panel and outlines it (`accent` edge, an "Added" mark) until the panel closes.

### AfterUndo (new)
- Dashed `border` row, the undo glyph, "Undone. Push A is as it was." in `sub`. No buttons.
  The row behind disappears.

### Clarify (new)
- Asks only for the missing piece (`SESSION-AGENT.md` §3): "Squats are in two workouts
  this week. Which one?"
- The answers as full-width 52px rows on `surface`: the name, and when each is (Today,
  Thursday), plus "Both" where it applies. One tap answers; typing still works.

### CloseMatches (new)
- "No exercise called “rope tricep thing”. Closest:" then **three or four real entries
  from the library**, each a 52px row, and **None of these** (dashed). Never the nearest
  food; never an invented exercise.
- This shape is also what a misspelt **food** gets, replacing today's silent match.
- **Arabic needs distinct names to work.** `exName()` gives "ترايسبس بوش داون" for both
  "Triceps Pushdown" and "Triceps Pushdown - Rope Attachment", so two of the three choices
  would read the same. The prototype uses "ترايسبس بوش داون بالحبل" for the rope version:
  **a proposed name, not the app's today.** Logged in `PROGRESS.md`.

### Empty (changed)
- No greeting, no orb. One line: "Ask about your training, food or progress, or say what
  to change." Then two groups of 48px rows: **Ask** (What do I train today? What's left
  to eat today?) and **Change** (Add an exercise to a day; Swap an exercise for today). A
  Change row starts the sentence in the field rather than acting.

### Taken out
- The three typing dots (720ms of staging), the pulsing orb, the "Coach" label on every
  answer, the question bubble's tail. The answer appears when it is ready, at once.

## 4. During a workout

Ask is the first item of the workout's ⋯ menu ("Ask", with the same icon). The panel opens
over the workout above the bottom edge (there is no dock there), with the same rules. The
log control is never covered by anything the panel adds outside its own bounds, and the
panel closes on ✕ or a tap outside, back to the set.

## 5. Contrast, measured

Every text element inside the panel and the dock, in every LTR frame, against what is
actually behind it, in all six themes. Worst case per element; gradients at both stops.
**L** = large text (≥ 24px, or ≥ 18.66px bold), 3:1; everything else 4.5:1.

| Element | Blue dark | Blue light | Red dark | Red light | Sage dark | Sage light |
|---|---|---|---|---|---|---|
| Header title, Change/Done text | 9.38 | 7.46 | 11.02 | 8.70 | 8.73 | 7.84 |
| Header subtitle, topic, group labels | 5.96 | 6.50 | 6.38 | 6.88 | 6.09 | 6.34 |
| Answer lead (18px) | 15.37 | 18.60 | 16.68 | 18.98 | 13.82 | 13.16 |
| Question line | 9.38 | 7.46 | 11.02 | 8.70 | 8.73 | 7.84 |
| Hint, Undone line | 10.59 | 9.55 | 11.72 | 9.38 | 9.90 | 9.16 |
| More | 7.81 | 6.95 | 5.11 | 5.95 | 12.52 | 11.96 |
| Add it (on the action fill) | 8.87 | 5.49 | 6.80 | 6.80 | 11.30 | 13.13 |
| Option rows, Not now | 13.61 | 14.55 | 15.68 | 17.59 | 12.19 | 11.26 |
| Undo | 15.37 | 18.60 | 16.68 | 18.98 | 13.82 | 13.16 |
| Dock: open pill name (on `--dock-pill-fill`) | 8.87 | 8.87 | 6.80 | 6.80 | 12.13 | 14.30 |

Everything passes at 4.5:1, including the dock's pill name, which failed in `main`
(3.27:1) and is fixed by the same rule (`token-requests.md` §3 and §4).

The tab behind the veil is not measured: it is dimmed context, not read through the panel.

## 6. New strings (need Arabic entries in `js/i18n/dict.js`)

| English | Arabic used in the prototype |
|---|---|
| Ask, or say what to change | اسأل، أو قول عايز تغيّر إيه |
| Show the whole conversation | اعرض المحادثة كلها |
| Ask about your training, food or progress, or say what to change. | اسأل عن تمرينك أو أكلك أو تقدمك، أو قول عايز تغيّر إيه. |
| Change (group label) | غيّر |
| Add an exercise to a day | ضيف تمرين ليوم |
| Swap an exercise for today | بدّل تمرين النهاردة |
| Change your program | تغيير في برنامجك |
| Add {ex} to {day}? | أضيف {ex} لـ {day}؟ |
| Add it | ضيفه |
| Added {ex} to {day}. | {ex} اتضاف لـ {day}. |
| Added (mark on the row) | اتضاف |
| Undone. {day} is as it was. | اتلغى. {day} رجع زي ما كان. |
| Swap for today | تبديل للنهاردة |
| {ex} is in two workouts this week. Which one? | {ex} موجود في تمرينين الأسبوع ده. أنهي واحد؟ |
| Which exercise? | أنهي تمرين؟ |
| No exercise called “{q}”. Closest: | مفيش تمرين اسمه «{q}». الأقرب: |

Already in the dictionary: Ask, From your log, worked out on this phone, Not now, None of
these, Undo, Close, More, and the suggested questions.

## 7. Glass and performance

No blurred layer in the panel. On screen with it open: the dock's blur only, as today.
Not checked on a real iPhone (no device in this session).

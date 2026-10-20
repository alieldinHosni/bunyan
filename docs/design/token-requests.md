# Token requests — Design session (deliverable 6)

Changes the designs need that the design system does not currently provide. **Proposals
only.** Nothing here has been added to the design system or to `index.html`; the owner
decides, and the implementation session (6b) applies.

Contrast is WCAG 2.x relative luminance, measured with a script, not estimated. Values are
`main`'s at `682803f`, authoritative for colour per the owner (20 Oct).

---

## 1. Red: the primary button label fails AA at its current size

**Where:** BUNYAN Red, dark and light. The primary button (`.btn`) is a vertical gradient
from `accent` (Machine Red `#FF2E3A`) at the top to `accent-deep` (`#A80E19`) at the
bottom. The label is `onAccent`, Glacier Blue `#DBF6FF`, in 16px Outfit Bold. At 16px it is
body text and needs **4.5:1**. Values are `main`'s at `682803f`; the fill, label and
`accent-deep` are the same in the design system.

**Measured, Glacier Blue over the gradient:**

| Point in the gradient | Fill | Ratio | 4.5:1 (16px) | 3:1 (large) |
|---|---|---|---|---|
| Top (0%) | `#FF2E3A` | 3.27:1 | fails | passes |
| 30% | `#E52430` | 4.03:1 | fails | passes |
| 40% | `#DC212D` | 4.34:1 | fails | passes |
| 50% | `#D41E2A` | 4.64:1 | passes | passes |
| Bottom (100%) | `#A80E19` | 6.80:1 | passes | passes |

For reference, white on Machine Red is 3.68:1. The label stays Glacier Blue, the theme's
`onAccent`; 3.27:1 is its worst point.

### Option a — keep Machine Red, set the label as large text. **Recommended.**

WCAG's large text is **at least 18.66px (14pt) bold, or 24px (18pt) regular**, and needs
only 3:1. The label's worst point on the gradient is 3.27:1, so a large label passes as it
is, with no colour changed.

- **Size:** Outfit 700 at **20px**. Note: 18px bold is *under* the 14pt line (18.66px) and
  does not count as large; 19px is the smallest whole size that does, and 20px leaves a
  margin for rounding.
- **Result:** 3.27:1 at the worst point, 6.80:1 at the best; passes AA for large text
  everywhere on the fill, in Red dark and Red light.
- **Keeps** Machine Red on the primary action, which is the brand.
- **Icon-only controls** on the red fill (the ✓) are graphical objects and need 3:1:
  3.27:1, passes.

### Option b — darken the fill to `accent-deep`, where the label cannot be large

For a label that has to stay small (a pill button, a 14px chip action), the fill under it
reads `accent-deep` (`#A80E19`) instead of the gradient. Glacier Blue on it: **6.80:1**,
passes AA at any size. No new token.

### How the designs use it

Every text label on the red fill in the workout and chat designs is set at 20px Outfit 700
(option a). Nothing in the designs needs option b yet; it is the fallback for 6b wherever
an existing small control cannot grow.

---

## 2. The destructive confirm button: same defect, same resolution

`ConfirmSheet`'s destructive button (`.cf.bad .cf-ok`) puts white on a gradient from
`danger-fill` to `danger-deep`. At its current size it fails in every theme.

| Theme | Top of the gradient | White on it | Bottom | White on it |
|---|---|---|---|---|
| Red | `#FF2E3A` | 3.68:1 | `#A80E19` | 6.80:1 |
| Blue, Sage | `#E5323E` | 4.32:1 | `#B3131B` | 6.94:1 |

- **Option a (recommended):** the label at 20px Outfit 700. The worst point is 3.68:1
  (Red) and 4.32:1 (Blue, Sage), so it passes 3:1 for large text everywhere.
- **Option b (fallback):** where the label must stay small, the fill reads `danger-deep`,
  6.80:1 or 6.94:1.
- The rule also hardcodes `#fff` instead of a token, which `CLAUDE.md` forbids. The label
  should read a token; the nearest is `onOk` in light modes (`#FFFFFF`) or a new
  `onDanger` token. Proposal: add **`--onDanger`**, `#FFFFFF` in every theme, so the
  destructive label stops borrowing from an unrelated role. **Approved by the owner,
  20 Oct.** Option a for both buttons approved too, at 20px (18px bold is under the
  18.66px line).

---

## 3. The dock's open pill label fails AA in Red (found while designing the chat)

The open tab's name ("Train", "Food"…) is 12.5px bold `dock-pill-ink` on `dock-pill`. In
Red that is Glacier Blue on Machine Red: **3.27:1**, under the 4.5:1 a 12.5px label needs.
It passes in Blue (navy on Sky Blue) and Sage. This is `main` as it ships, not a new
design.

- Option a (large text) does not fit: the pill holds 12.5px; 19px bold would not fit five
  places on a 375px phone.
- **Option b (recommended here):** in Red only, `dock-pill` reads `accent-deep`
  (`#A80E19`): Glacier Blue on it is **6.80:1**. The icon-only circles are unaffected.
  No new token. *Needs the owner's approval.*

---

## 4. Machine Red is not a text-bearing colour (owner's question, 20 Oct)

Machine Red under its label measured 3.27:1 three times (primary button, Add it, the dock
pill), and white on it 3.68:1 (destructive confirm). The question: (a) keep it under
labels at 20px bold minimum forever, or (b) put labels on `accent-deep` and keep Machine
Red for fills with no text.

**Label on the fill, and the fill against the page, per theme:**

| Theme | Label on `accent` | Label on `accent-deep` | `accent` vs page | `accent-deep` vs page | `accent-deep` vs card |
|---|---|---|---|---|---|
| Blue dark | **8.87** | 4.81 | 8.87 | 4.81 | 4.24 |
| Blue light | 5.49 | **7.64** | 4.71 | 6.56 | 7.64 |
| Red dark | 3.27 | **6.80** | 5.42 | **2.61** | **2.46** |
| Red light | 3.27 | **6.80** | 3.27 | 6.80 | 7.39 |
| Sage dark | **11.30** | 8.15 | 14.05 | 10.14 | 9.03 |
| Sage light | 13.13 | **15.63** | 10.14 | 12.07 | 14.24 |

### Recommendation: (b), with two adjustments

**Why not (a):** it cannot be applied everywhere. The dock pill holds a 12.5px label and
five places at 375px leave no room for 19px; chips and small buttons are the same. So (a)
would need exceptions on day one, and every new control would have to be checked against
it. It also passes by 0.27, the thinnest margin in the system.

**Why (b):** 6.80:1 under every label in Red, at any size, and Machine Red keeps the jobs
it does best: progress, rings, the active marks, the brand mark, the check icon.

**What (b) costs, which the table shows:**

1. **Applied to every theme, it makes two of them worse.** In Blue dark the label drops
   from 8.87 to 4.81 (navy on Steel Blue: a pass by 0.31), and in Sage dark from 11.30 to
   8.15. **So scope it to Red.** The other themes keep their current fills, which already
   pass with room.
2. **In Red dark, a deep-red button nearly disappears into the wine-black page:**
   2.61:1 against the page and 2.46:1 against a card, under the 3:1 a control's shape
   should have. Machine Red against the same page is 5.42:1. **So give the deep fill a
   1.5px Machine Red edge** in Red dark: the label sits on the deep red, the brand red
   draws the outline (a fill with no text, which is what (b) reserves it for), and the
   button keeps a 5.42:1 edge.
3. The gradient goes: a flat `accent-deep` fill. Anything darker under it (`accent-dark`)
   drops the edge to 1.27:1.
4. Already true today and unchanged by either option: in Red, the primary and the
   destructive buttons share one fill, so they differ only by their labels.

### What it needs, as tokens

No new colours. Two semantic aliases, set per theme from existing tokens:

| Alias | Red dark | Red light | Blue, Sage |
|---|---|---|---|
| `--color-action-fill` (under a label) | `accent-deep` | `accent-deep` | `accent` (as today) |
| `--color-action-edge` | `accent` (1.5px) | none | none |

The same pattern for destructive: `--color-danger-action-fill` = `danger-deep` in every
theme (6.80–6.94:1 white, with `--onDanger`). It supersedes option a in §1 and §2 and
generalises §3: **labels never sit on Machine Red or on `danger-fill`.** The 20px labels
in the workout and Ask designs can then stay 20px by choice, not by necessity.

**Approved by the owner, 20 Oct: option (b).** Labels never sit on Machine Red; Machine
Red is kept for fills with no text (accents, bars, indicators, rings, the brand mark).
Applied as recommended: the label fill is `accent-deep` in Red, with the Machine Red edge
in Red dark; Blue and Sage keep `accent` under labels (moving them to `accent-deep` would
take Blue dark from 8.87 to 4.81). Applied in `design/workout.html` and `design/chat.html`.

### Every affected component under (b), measured in the prototypes

Label (or icon) against the fill actually under it, all six themes:

| Component | Size | Blue dark | Blue light | Red dark | Red light | Sage dark | Sage light |
|---|---|---|---|---|---|---|---|
| Log set (workout) | 20px/700 | 8.87 | 5.49 | **6.80** | **6.80** | 11.30 | 13.13 |
| Done (workout complete) | 20px/700 | 8.87 | 5.49 | **6.80** | **6.80** | 11.30 | 13.13 |
| Rest complete band | 40px/700 | 8.87 | 5.49 | **6.80** | **6.80** | 11.30 | 13.13 |
| "+0:05 over your rest" on the band | 20px/700 | 8.87 | 5.49 | **6.80** | **6.80** | 11.30 | 13.13 |
| Add it (Ask panel) | 20px/700 | 8.87 | 5.49 | **6.80** | **6.80** | 11.30 | 13.13 |
| Send (icon only) | 22px glyph | 8.87 | 5.49 | **6.80** | **6.80** | 11.30 | 13.13 |
| Dock open pill name (§3) | 12.5px/700 | 8.87 | 8.87 | **6.80** | **6.80** | 12.13 | 14.30 |
| Destructive confirm (§2), on `danger-deep` | any | 6.94 | 6.94 | 6.80 | 6.80 | 6.94 | 6.94 |

Before (b), the Red cells were 3.27:1 (3.68:1 for the destructive confirm), passing only
as large text. **Every one now passes 4.5:1 at any size**, so the 20px labels stay 20px by
choice.

The fill against the page, and the edge that carries it where it is weak:

| | Blue dark | Blue light | Red dark | Red light | Sage dark | Sage light |
|---|---|---|---|---|---|---|
| Label fill vs page | 8.87 | 4.71 | **2.61** | 6.80 | 14.05 | 10.14 |
| Machine Red edge vs page | — | — | **5.42** | — | — | — |

The full text sweeps of both prototypes (every text element, six themes) pass with no
failures after the change, including the dock pill name that failed before.

---

*Further requests will be added here as the workout and chat designs need them.*

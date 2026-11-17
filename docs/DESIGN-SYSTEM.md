# Bunyan — the design system

Pages are put together from the set below. A page doesn't get its own button, card,
radius or speed. `tests/design.mjs` checks this on every pull request (see "The guard").

The plan comes from `docs/NEXT-PHASE.md`, WP-7. This file is the reference. When the
code and this file disagree, fix one of them in the same pull request.

## Tokens

All tokens live in `index.html`, in the `:root` block and the theme blocks. Never write
a raw value where a token exists.

**Spacing:** `--s1` 4 · `--s2` 8 · `--s3` 12 · `--s4` 16 · `--s5` 24 · `--s6` 32 px.
Card padding is `--s4`, and so is the gap between cards. The smallest tap target is
`--hit` (44 px).

**Radius:** use one per size.

| Token | px | For |
| --- | --- | --- |
| `--r4` | 18 | cards |
| `--r3` | 14 | rows and anything inside a card |
| `--r2` | 12 | small controls inside a row |
| `--rpill` | 999 | pills, chips, round buttons |

`--r1` (8) and `--r5` (28) exist for the dock and sheets, and nothing else uses them.

**Type:** seven steps only, 28 / 22 / 17 / 15 / 13.5 / 12.5 / 11 px. Section headers
are sentence case, 17 px, bold ("For you", "Today's meals", "Highlights"). The
small-caps label (`.shk`) is only allowed as the eyebrow inside a card.

**Colour:** colours come only from the theme blocks' tokens (`--text`, `--sub`, `--dim`,
`--card`, `--raised`, `--accent*`, `--warning` …). Contrast is held by the three
"Contrast" browser tests.

**Surfaces:** a page has no live blur (`backdrop-filter`). Cards are tinted glass on
`--card-fill`. Only the dock, the coach's button, sheets and toasts blur. The iPhone
check fails a page that draws more than 4 blur layers (v273; see `.claude/PROGRESS.md`).

## Motion: four speeds, two curves

| Token | ms | For |
| --- | --- | --- |
| `--m-press` | 110 | touch feedback |
| `--m-quick` | 200 | a small change in place: toggles, chips, a row's state |
| `--m-move` | 380 | sheets, cards arriving, expand and collapse |
| `--m-page` | 520 | travel between pages; equal to `PAGE.ms` in `js/ui/transit.js` |

`--e-standard` is for things that change where they are. `--e-ios`, the page curve
`cubic-bezier(0.22, 1, 0.36, 1)`, is for things that arrive. The older `--m-*` names
(`--m-micro`, `--m-pop`, `--m-comp`, `--m-sheet`, `--m-tab` …) keep their current values
until each page moves onto the four speeds. Then they are deleted. The workout keeps its
own slower pace (owner, 3 Nov) by setting the four speeds inside `.sess`, not by adding
names.

## Components

The left column is the class to keep. The right column lists the classes to fold into
it, page by page.

| Component | Class | Folds in |
| --- | --- | --- |
| Primary button | `.btn` | `dbegin`, `afcta` |
| Secondary button | `.btn.g` | `cf-no`, `pcmore`, `ckcard-done` |
| Small button | `.btn.sm` | — |
| Destructive | `.btn.d` | — |
| Text link | `.tlink` | `pglink`, `pgc-go` |
| Icon button | `.icobtn` | the per-page round buttons |
| Chip (choice) | `.chip` | `aschip`, `cp-chip` |
| Segmented control | `.seg` | `pgtabs2`, `psecs` variants |
| Card | `.card` | `pgcard`, `tgcard`, `dlcard`, `ckcard`, `zcard`, `rcv`, `pgc` |
| Card, emphasised | `.card.lead` | `thero2`, the gold-edged cards |
| List row | `.srow` | `drow`, `pghl-r` |
| Section header | `.tsec` + `.tsec-h` | `pglbl`, `sg-h` |
| Stat | `.stat` | `ptile` figures, `pgstat` |
| Empty state | `.empty` | the per-page ones |

Rules:
- Each screen gets one primary button. Everything else is secondary or a link.
- Keep the `data-*` attributes when moving a page. Taps and tests select by them, not
  by class.
- Numbers go in `.num`, `.metric` or `.stat`, so right-to-left layout doesn't scramble
  them.
- Every string goes through `t()` and has an Egyptian Arabic entry. Check each page
  right to left.

## How a page moves onto the set

One page per pull request, in this order: Progress, Coach, Food, Training, Profile, plan
pages, sheets. For each page:

1. Take screenshots before: dark and light, English and Arabic, 390 × 844.
2. Change the markup's classes to the set, and delete the page's own rules that the set
   now covers.
3. Take the screenshots after and compare them. Nothing should move that wasn't meant
   to.
4. Run `node tests/design.mjs`, then lower the ceilings it reports in the same pull
   request.
5. The page's browser tests, the three "Contrast" tests and the iPhone check must all
   pass.
6. Note the change in `.claude/PROGRESS.md` and bump the version (`js/version.js` and
   `sw.js`).

After the last page, delete the old `--m-*` names and the folded-in classes.

## The guard

`tests/design.mjs` runs in node with the engine tests. It counts four things in the
stylesheet:

- corner radii written in px instead of a radius token
- transition and animation times written in ms or s instead of a `--m-*` token
- raw `#` colours
- how many `--m-*` duration tokens exist

It fails if a count goes above its ceiling. The ceilings were today's counts on 17 Nov
(v275): radius 174, duration 57, hex 382, motion 18. They only ever go down, toward the
targets: 0 radii, 0 times, and the 4 speeds. It also fails if any of the four speeds or
two curves is missing, or if `--m-page` doesn't equal `PAGE.ms`.

The stylesheet stays in one `<style>` in `index.html`. There is no build step, and a
separate file would delay first paint.

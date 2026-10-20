# Palette comparison — design system vs `main`

Design session, §0. Written 2026-10-20. Nothing here changes code; it records what the
implementation session (6b) will need to reconcile.

- **Design system**: the Bunyan Design System artifact, `project/tokens.json`
  (index last changed 2026-10-13 19:43 UTC; `meta.source` says synced 2026-10-04 from
  `claude/design-system-extraction-9tw7p9@735fccb`).
- **`main`**: `index.html` `<style>` at `40bd8a3`, theme blocks lines 128–396 and the
  semantic layer at 433.

**Owner's ruling (20 Oct, after this comparison): `main` wins for colour.** Design from
`main`'s palette as of `682803f` (14 Oct), including the 31 tokens that exist only there.
The design system stays authoritative for **components**; for **colour** it is stale.

**Sync direction: `main` → design system.** The design system's colour tokens are to be
re-synced *from* `main`, never the other way. Nothing in `index.html` should be changed to
match the design system's colours. Logged as a task in `.claude/PROGRESS.md`.

## Read this first — `main`'s colours are newer than the design system's

The design system's colour tokens match `main` at **`e8b2e6a` (2026-10-13 10:02 UTC,
"New look: pill dock, Blue theme…")** exactly — every `bg`, every `card` fill.

`main` then changed the palette at **`682803f` (2026-10-14 15:47 UTC, "Blue by default,
a Sage theme from the reference, glass everywhere…")**, about 20 hours after the design
system's last recorded change. That commit:

1. Replaced **Monochrome** (Zero Black / Ghost Green) with **Sage** (deep sage-teal, slate
   action) — every Mono token differs.
2. Re-grounded **Red dark** in wine black (`#0D0709`, wine glass cards) instead of the
   cool near-black (`#0A0B0E`).
3. Made **Blue the default** (the design system's README still says Red is the default).
4. Changed every theme's glass `card` / `card-edge`, and the dock's per-theme hairline,
   dot and ink colours.
5. Added the `glass-hi`, `glass-btn`, `glass-btn-edge` tokens and the 3D figure's `mq-*`
   stage tokens (later commits).

The owner confirmed the second: it was not re-synced after 14 October.

## Theme mapping

| Column | Design system `data-theme` | `main` `data-palette` + `data-theme` |
|---|---|---|
| Blue dark | `blue` | `blue` + `dark` (the `:root` default on main) |
| Blue light | `blue-light` | `blue` + `light` |
| Red dark | `dark` (the default in the DS README) | `red` + `dark` |
| Red light | `light` | `red` + `light` |
| Mono→Sage dark | `mono` = Monochrome | `mono` + `dark` = Sage |
| Mono→Sage light | `mono-light` = Monochrome | `mono` + `light` = Sage |

The switching mechanism itself differs too: the design system uses one attribute with six
values; `main` uses two attributes.

## Summary

| | Count |
|---|---|
| Tokens compared | 118 |
| Identical in both, every theme | 13 (the 8 reference colours, `danger-fill`, `danger-deep`, `warning`, `color-warning`, `color-danger-fill`) |
| In both, differ in at least one theme | 72 |
| Only in the design system | 2: `splash-ground`, `rest-ground` |
| Only in `main` | 31 (30 after `shadow-card`, which the DS keeps under Shadow) |

**Blue is essentially aligned**: Blue dark and Blue light differ only in `card`,
`card-edge`, `dock-hair` and (Blue light) `dock-bar`. **Red light** differs only in the
dock and card tokens. **Red dark** differs in every surface, type and glass token.
**Mono/Sage** differs in almost everything.

Other drift found while comparing:

- The DS `shadow-card` still carries keys for a `pink` theme that no longer exists, and
  none for `blue` / `blue-light`.
- The DS README describes "Red (the default), Blue and Monochrome"; `main`'s README says
  Blue (default), Red and Sage.
- `main`'s `.btn` comment says "radius 8, Outfit Bold 15 in caps"; its rule is a pill,
  16px, no caps. Stale comment only.

## Every colour, side by side

A plain value means both sources agree. **Bold** cells give both values where they differ.
`DS:` or `main:` alone means the token exists only there. Roles come from the design
system's usage notes where it has one, otherwise from `main`'s stylesheet comments.

### Reference colours (fixed, theme-independent)

| Token | Role | Status | Blue dark | Blue light | Red dark | Red light | Mono→Sage dark | Mono→Sage light |
|---|---|---|---|---|---|---|---|---|
| `machine-red` | BUNYAN Red's action colour, exactly as given: the primary fill, rings, progress, the active tab. | same | `#FF2E3A` | `#FF2E3A` | `#FF2E3A` | `#FF2E3A` | `#FF2E3A` | `#FF2E3A` |
| `glacier-blue` | BUNYAN Red's highlight, exactly as given: labels on Machine Red, the big figures in Dark, the page in Light. | same | `#DBF6FF` | `#DBF6FF` | `#DBF6FF` | `#DBF6FF` | `#DBF6FF` | `#DBF6FF` |
| `zero-black` | Monochrome's black, exactly as given: the ground in Dark; type and the primary fill in Light. | same | `#050505` | `#050505` | `#050505` | `#050505` | `#050505` | `#050505` |
| `ghost-green` | Monochrome's off-white, exactly as given: type and the primary fill in Dark; the page in Light. | same | `#D7FFE0` | `#D7FFE0` | `#D7FFE0` | `#D7FFE0` | `#D7FFE0` | `#D7FFE0` |
| `night-navy` | BUNYAN Blue's ground in Dark, from the owner's night-blue reference; labels on Sky Blue. | same | `#070B1A` | `#070B1A` | `#070B1A` | `#070B1A` | `#070B1A` | `#070B1A` |
| `steel-blue` | BUNYAN Blue's steel blue, from the reference: the lower stop of the primary fill in Dark. | same | `#5C7FB5` | `#5C7FB5` | `#5C7FB5` | `#5C7FB5` | `#5C7FB5` | `#5C7FB5` |
| `sky-blue` | BUNYAN Blue's action colour in Dark (a lighter step of Steel Blue, 8.9:1 under navy labels), and the open dock pill in both modes. | same | `#8AB0EC` | `#8AB0EC` | `#8AB0EC` | `#8AB0EC` | `#8AB0EC` | `#8AB0EC` |
| `signal-green` | BUNYAN Blue's live mark, from the reference: done, on, and the dot for something new. | same | `#82FC4F` | `#82FC4F` | `#82FC4F` | `#82FC4F` | `#82FC4F` | `#82FC4F` |

### Surfaces and type

| Token | Role | Status | Blue dark | Blue light | Red dark | Red light | Mono→Sage dark | Mono→Sage light |
|---|---|---|---|---|---|---|---|---|
| `bg` | Page and sheet ground under the blend (--ground). | differs: Red dark, Sage/Mono dark, Sage/Mono light | `#070B1A` | `#E9EEF6` | **DS `#0A0B0E`<br>main `#0D0709`** | `#DBF6FF` | **DS `#050505`<br>main `#0D1A1B`** | **DS `#D7FFE0`<br>main `#D2DBDA`** |
| `raised` | Sheets, dialogs, toasts and anything that floats over content: the solid elevated surface. | differs: Red dark, Sage/Mono dark, Sage/Mono light | `#121A30` | `#FFFFFF` | **DS `#13151A`<br>main `#1A0E12`** | `#F5FCFF` | **DS `#111211`<br>main `#152527`** | **DS `#FFFFFF`<br>main `#E6ECEB`** |
| `surface` | Chips, inputs, set rows and wells inside a card: one step past raised. | differs: Red dark, Sage/Mono dark, Sage/Mono light | `#1B2440` | `#DDE4EF` | **DS `#1B1E25`<br>main `#25131A`** | `#E4F5FC` | **DS `#1A1B1A`<br>main `#1D2F31`** | **DS `#EAFFEF`<br>main `#D3DCDB`** |
| `border` | The 1px hairline on cards, lists and inputs. | differs: Red dark, Sage/Mono dark, Sage/Mono light | `#2A3452` | `#C3CDDD` | **DS `#262A33`<br>main `#3A2029`** | `#BCDCE8` | **DS `#272927`<br>main `#2A3F41`** | **DS `#B5DCBE`<br>main `#AEBDBC`** |
| `text` | Primary type on bg, raised and surface (14.9–20.4:1 in every theme). | differs: Red dark, Sage/Mono dark, Sage/Mono light | `#EEF2F8` | `#0B1226` | **DS `#F1F5F8`<br>main `#F8EFF1`** | `#0A0B0E` | **DS `#D7FFE0`<br>main `#EAF1EF`** | **DS `#050505`<br>main `#132627`** |
| `sub` | Secondary type: subtitles, stat lines. | differs: Red dark, Sage/Mono dark, Sage/Mono light | `#C3CBDA` | `#3A4560` | **DS `#C4CCD2`<br>main `#DCC7CB`** | `#334750` | **DS `#BCCDC0`<br>main `#BFD0CD`** | **DS `#2B352E`<br>main `#2C4041`** |
| `dim` | Tertiary type: dates, durations, meta, idle nav. | differs: Red dark, Sage/Mono dark, Sage/Mono light | `#8D98B0` | `#525E78` | **DS `#8A939B`<br>main `#A99096`** | `#465B65` | **DS `#86918A`<br>main `#8FA5A2`** | **DS `#46524A`<br>main `#435857`** |
| `faint` | The quietest type that still reads (same as dim): placeholders, chevrons. | differs: Red dark, Sage/Mono dark, Sage/Mono light | `#8D98B0` | `#525E78` | **DS `#8A939B`<br>main `#A99096`** | `#465B65` | **DS `#86918A`<br>main `#8FA5A2`** | **DS `#46524A`<br>main `#435857`** |
| `scrim` | The overlay behind sheets and dialogs, tinted to the theme. | differs: Red dark, Sage/Mono dark, Sage/Mono light | `rgba(3,5,14,.66)` | `rgba(11,18,38,.42)` | **DS `rgba(4,5,8,.62)`<br>main `rgba(8,3,5,.64)`** | `rgba(6,22,32,.42)` | **DS `rgba(0,0,0,.72)`<br>main `rgba(4,10,11,.66)`** | **DS `rgba(5,5,5,.45)`<br>main `rgba(14,28,30,.40)`** |
| `well` | A recessed chip or panel inside a hero card (the program's day and exercise counts). | differs: Red dark, Sage/Mono dark, Sage/Mono light | `rgba(3,5,14,.45)` | `rgba(11,18,38,.06)` | **DS `rgba(8,8,10,.45)`<br>main `rgba(10,3,5,.45)`** | `rgba(10,40,60,.07)` | **DS `rgba(0,0,0,.5)`<br>main `rgba(2,8,9,.45)`** | **DS `rgba(5,5,5,.06)`<br>main `rgba(19,38,39,.06)`** |

### Action and accent

| Token | Role | Status | Blue dark | Blue light | Red dark | Red light | Mono→Sage dark | Mono→Sage light |
|---|---|---|---|---|---|---|---|---|
| `accent` | The primary: fills, rings, progress, focused fields. | differs: Sage/Mono dark, Sage/Mono light | `#8AB0EC` | `#3D6AA8` | `#FF2E3A` | `#FF2E3A` | **DS `#D7FFE0`<br>main `#DCE7E4`** | **DS `#050505`<br>main `#142E33`** |
| `accentHi` | The accent as text and line: kickers, links, the drawings, the focus ring. | differs: Sage/Mono dark, Sage/Mono light | `#8AB0EC` | `#2F5A96` | `#FF2E3A` | `#C30F1C` | **DS `#D7FFE0`<br>main `#DCE7E4`** | **DS `#050505`<br>main `#142E33`** |
| `onAccent` | Type and glyphs on the accent fill: Glacier Blue on red, Night Navy on Sky Blue (white on Blue Light's steel), black/Ghost Green in Monochrome. | differs: Sage/Mono dark, Sage/Mono light | `#070B1A` | `#FFFFFF` | `#DBF6FF` | `#DBF6FF` | **DS `#050505`<br>main `#142E33`** | **DS `#D7FFE0`<br>main `#F2F6F5`** |
| `accent-deep` | The lower stop of the primary fill's gradient and its pressed state. | differs: Sage/Mono dark, Sage/Mono light | `#5C7FB5` | `#2C5390` | `#A80E19` | `#A80E19` | **DS `#D7FFE0`<br>main `#B3C8C3`** | **DS `#050505`<br>main `#0A1F23`** |
| `accentSoft` | A quiet accent fill: the avatar, soft badges. | differs: Red dark, Sage/Mono dark, Sage/Mono light | `rgba(138,176,236,.13)` | `#DCE7F8` | **DS `rgba(255,46,58,.12)`<br>main `rgba(255,46,58,.13)`** | `#FFE3E5` | **DS `rgba(215,255,224,.10)`<br>main `rgba(220,231,228,.10)`** | **DS `#E3F5E7`<br>main `rgba(20,46,51,.10)`** |
| `secondary` | The theme's highlight colour: Glacier Blue (Red), pale steel (Blue), white (Monochrome) in Dark; plain text in Light. | differs: Sage/Mono light | `#D4D9E2` | `#0B1226` | `#DBF6FF` | `#0A0B0E` | `#FFFFFF` | **DS `#050505`<br>main `#142E33`** |
| `figure` | Big figures — a day's calories, a tile's number, a record: the highlight colour in Dark, plain text in Light. | differs: Sage/Mono light | `#E6ECF7` | `#0B1226` | `#DBF6FF` | `#0A0B0E` | `#FFFFFF` | **DS `#050505`<br>main `#142E33`** |
| `glow` | The accent's coloured light, under the blend (--ground) and behind glows: red ember, blue haze; none in Monochrome. | differs: Red dark, Sage/Mono dark | `rgba(92,127,181,.28)` | `rgba(92,127,181,.22)` | **DS `rgba(255,46,58,.14)`<br>main `rgba(255,46,58,.22)`** | `transparent` | **DS `transparent`<br>main `rgba(120,155,150,.22)`** | `transparent` |
| `accent-tint` | A selected state's fill. | differs: Red dark, Sage/Mono dark, Sage/Mono light | `rgba(138,176,236,.16)` | `rgba(61,106,168,.14)` | **DS `rgba(255,46,58,.16)`<br>main `rgba(255,46,58,.17)`** | `rgba(255,46,58,.14)` | **DS `rgba(215,255,224,.12)`<br>main `rgba(220,231,228,.12)`** | **DS `rgba(5,5,5,.08)`<br>main `rgba(20,46,51,.10)`** |
| `accent-edge` | A selected state's 1px ring. | differs: Red dark, Sage/Mono dark, Sage/Mono light | `rgba(138,176,236,.34)` | `rgba(61,106,168,.32)` | **DS `rgba(255,46,58,.32)`<br>main `rgba(255,46,58,.34)`** | `rgba(255,46,58,.32)` | **DS `rgba(215,255,224,.30)`<br>main `rgba(220,231,228,.30)`** | **DS `rgba(5,5,5,.30)`<br>main `rgba(20,46,51,.30)`** |
| `accent-glow` | A selected state's halo. | differs: Red dark, Sage/Mono dark, Sage/Mono light | `rgba(92,127,181,.30)` | `rgba(61,106,168,.22)` | **DS `rgba(255,46,58,.22)`<br>main `rgba(255,46,58,.28)`** | `rgba(255,46,58,.20)` | **DS `rgba(215,255,224,.10)`<br>main `rgba(120,155,150,.26)`** | **DS `rgba(5,5,5,.10)`<br>main `rgba(20,46,51,.18)`** |
| `accent-dark` | The deep stop of the accent field that stands in for a missing program cover. | differs: Sage/Mono dark, Sage/Mono light | `#1F3358` | `#1F3358` | `#4A0910` | `#5A0B12` | **DS `#1E2A22`<br>main `#1E3436`** | **DS `#3E4A42`<br>main `#0A1F23`** |

### Status

| Token | Role | Status | Blue dark | Blue light | Red dark | Red light | Mono→Sage dark | Mono→Sage light |
|---|---|---|---|---|---|---|---|---|
| `ok` | Done, and nothing else: a logged set, a done day, a met target. | differs: Sage/Mono dark, Sage/Mono light | `#82FC4F` | `#177530` | `#22A34B` | `#177530` | **DS `#4C9E6B`<br>main `#5DBB8A`** | **DS `#177530`<br>main `#1D7448`** |
| `okSoft` | The quiet done fill behind ok text (ok on it 4.5:1 or more). | differs: Sage/Mono dark, Sage/Mono light | `#14301A` | `#DDF2E5` | `#0E2415` | `#DDF2E5` | **DS `#0F2116`<br>main `#10261B`** | **DS `#DCF3E2`<br>main `#D7ECDF`** |
| `onOk` | Words on an ok fill. | differs: Red dark, Sage/Mono dark | `#070B1A` | `#FFFFFF` | **DS `#0A0B0E`<br>main `#0D0709`** | `#FFFFFF` | **DS `#050505`<br>main `#0D1A1B`** | `#FFFFFF` |
| `gold` | Earned: records, favourites, supersets, warm-up marks. | differs: Red dark, Sage/Mono dark, Sage/Mono light | `#F0C658` | `#7A6213` | **DS `#C9A227`<br>main `#D9B13A`** | `#7A6213` | **DS `#D7FFE0`<br>main `#E3C26B`** | **DS `#050505`<br>main `#7A6213`** |
| `warning` | A caution: over target, an unmatched food, a pain note. | same | `#FFB561` | `#8A5600` | `#E8A33A` | `#8A5600` | `#E3B04B` | `#8A5600` |
| `danger` | Destructive and error, as text and line: Delete links, the bin, the error card. | differs: Sage/Mono light | `#FF6B70` | `#C41E2A` | `#FF2E3A` | `#C30F1C` | `#FF5C61` | **DS `#C41E2A`<br>main `#B8222D`** |
| `danger-fill` | The top stop of a destructive confirm's button. | same | `#E5323E` | `#E5323E` | `#FF2E3A` | `#FF2E3A` | `#E5323E` | `#E5323E` |
| `danger-deep` | The lower stop of a destructive confirm's button (white label 5.2:1 or more). | same | `#B3131B` | `#B3131B` | `#A80E19` | `#A80E19` | `#B3131B` | `#B3131B` |

### Data (macro series)

| Token | Role | Status | Blue dark | Blue light | Red dark | Red light | Mono→Sage dark | Mono→Sage light |
|---|---|---|---|---|---|---|---|---|
| `mac-p` | Protein, in every macro view. | differs: Sage/Mono dark, Sage/Mono light | `#5E8FE8` | `#2F5A96` | `#FF2E3A` | `#D41E2A` | **DS `#D7FFE0`<br>main `#DCE7E4`** | **DS `#050505`<br>main `#142E33`** |
| `mac-c` | Carbs (see mac-p). | differs: Sage/Mono dark, Sage/Mono light | `#21A68A` | `#14936B` | `#22A6B3` | `#009AA6` | **DS `#8FAA98`<br>main `#5FAFA5`** | **DS `#34443A`<br>main `#3F8E86`** |
| `mac-f` | Fat (see mac-p). | differs: Sage/Mono dark, Sage/Mono light | `#D27C2C` | `#B8641E` | `#7F78F2` | `#6D5FE6` | **DS `#58695D`<br>main `#D6A35A`** | **DS `#74917D`<br>main `#B8732A`** |

### Glass, hairlines, tracks

| Token | Role | Status | Blue dark | Blue light | Red dark | Red light | Mono→Sage dark | Mono→Sage light |
|---|---|---|---|---|---|---|---|---|
| `glass` | The dock and workout bar, where blur is available: the theme's darkest glass, in light modes too. | differs: Red dark, Sage/Mono dark, Sage/Mono light | `rgba(18,26,48,.78)` | `rgba(18,26,48,.88)` | **DS `rgba(19,21,26,.78)`<br>main `rgba(30,12,17,.74)`** | `rgba(10,11,14,.86)` | **DS `rgba(17,18,17,.82)`<br>main `rgba(16,30,32,.74)`** | **DS `rgba(5,5,5,.90)`<br>main `rgba(20,40,43,.84)`** |
| `glass-solid` | The same glass where blur is not available. | differs: Red dark, Sage/Mono dark, Sage/Mono light | `rgba(18,26,48,.96)` | `rgba(18,26,48,.97)` | **DS `rgba(19,21,26,.96)`<br>main `rgba(30,12,17,.96)`** | `rgba(10,11,14,.97)` | **DS `rgba(17,18,17,.96)`<br>main `rgba(16,30,32,.96)`** | **DS `rgba(5,5,5,.97)`<br>main `rgba(20,40,43,.97)`** |
| `hair` | Hairlines on glass and the divider line. | differs: Red dark, Sage/Mono dark, Sage/Mono light | `rgba(212,217,226,.09)` | `rgba(11,18,38,.10)` | **DS `rgba(255,255,255,.08)`<br>main `rgba(255,226,230,.08)`** | `rgba(10,40,60,.10)` | **DS `rgba(215,255,224,.09)`<br>main `rgba(220,235,232,.09)`** | **DS `rgba(5,5,5,.10)`<br>main `rgba(19,38,39,.12)`** |
| `hair-hi` | The lit top edge of glass. | differs: Red dark, Sage/Mono dark, Sage/Mono light | `rgba(212,217,226,.16)` | `rgba(255,255,255,.16)` | **DS `rgba(255,255,255,.14)`<br>main `rgba(255,226,230,.15)`** | `rgba(255,255,255,.14)` | **DS `rgba(215,255,224,.15)`<br>main `rgba(220,235,232,.16)`** | **DS `rgba(255,255,255,.16)`<br>main `rgba(255,255,255,.50)`** |
| `seg-track` | The recessed track under a segmented control. | differs: Red dark, Sage/Mono dark, Sage/Mono light | `rgba(212,217,226,.05)` | `rgba(11,18,38,.05)` | **DS `rgba(255,255,255,.04)`<br>main `rgba(255,226,230,.05)`** | `rgba(10,40,60,.06)` | **DS `rgba(215,255,224,.04)`<br>main `rgba(220,235,232,.05)`** | **DS `rgba(5,5,5,.05)`<br>main `rgba(19,38,39,.06)`** |
| `bar-track` | An unlit bar or progress track. | differs: Red dark, Sage/Mono dark, Sage/Mono light | `rgba(212,217,226,.16)` | `rgba(11,18,38,.12)` | **DS `rgba(255,255,255,.14)`<br>main `rgba(255,226,230,.15)`** | `rgba(10,40,60,.12)` | **DS `rgba(215,255,224,.14)`<br>main `rgba(220,235,232,.14)`** | **DS `rgba(5,5,5,.12)`<br>main `rgba(19,38,39,.14)`** |
| `card` | Glass: the fill of the in-page cards, a tint of the ground so its blend shows through. | differs: Blue dark, Blue light, Red dark, Red light, Sage/Mono dark, Sage/Mono light | **DS `rgba(37,48,80,.52)`<br>main `rgba(37,48,80,.48)`** | **DS `rgba(255,255,255,.70)`<br>main `rgba(255,255,255,.62)`** | **DS `rgba(22,24,30,.80)`<br>main `rgba(66,20,31,.46)`** | **DS `rgba(245,252,255,.80)`<br>main `rgba(255,255,255,.58)`** | **DS `rgba(215,255,224,.045)`<br>main `rgba(160,190,186,.09)`** | **DS `rgba(255,255,255,.55)`<br>main `rgba(224,231,230,.56)`** |
| `card-edge` | A glass card's lighter edge. | differs: Blue dark, Blue light, Red dark, Red light, Sage/Mono dark, Sage/Mono light | **DS `rgba(212,217,226,.13)`<br>main `rgba(212,217,226,.14)`** | **DS `rgba(255,255,255,.85)`<br>main `rgba(255,255,255,.88)`** | **DS `#262A33`<br>main `rgba(255,214,220,.14)`** | **DS `rgba(188,220,232,.9)`<br>main `rgba(255,255,255,.88)`** | **DS `rgba(215,255,224,.10)`<br>main `rgba(220,235,232,.14)`** | **DS `rgba(255,255,255,.80)`<br>main `rgba(255,255,255,.62)`** |
| `shadow-card` | Card shadow (in the design system it lives under Shadow, not Colour, with stale "pink" theme keys) | in both (DS: Shadow family) | main: `0 1px 0 rgba(212,217,226,.05) inset,0 10px 30px rgba(2,4,12,.45)` | main: `0 1px 0 rgba(255,255,255,.7) inset,0 10px 30px rgba(11,18,38,.10)` | main: `0 1px 0 rgba(255,226,230,.05) inset,0 10px 30px rgba(10,2,4,.45)` | main: `0 1px 0 rgba(255,255,255,.6) inset,0 10px 30px rgba(10,40,60,.10)` | main: `0 1px 0 rgba(220,235,232,.05) inset,0 10px 30px rgba(2,8,9,.45)` | main: `0 1px 0 rgba(255,255,255,.5) inset,0 12px 30px rgba(14,30,31,.16)` |
| `glass-hi` | Highlight edge on glass controls | main only | main: `rgba(212,217,226,.16)` | main: `rgba(255,255,255,.85)` | main: `rgba(255,226,230,.16)` | main: `rgba(255,255,255,.85)` | main: `rgba(220,235,232,.16)` | main: `rgba(255,255,255,.62)` |
| `glass-btn` | Fill of a glass button | main only | main: `rgba(37,48,80,.42)` | main: `rgba(255,255,255,.56)` | main: `rgba(64,20,30,.42)` | main: `rgba(255,255,255,.56)` | main: `rgba(160,190,186,.10)` | main: `rgba(236,242,241,.58)` |
| `glass-btn-edge` | Edge of a glass button | main only | main: `rgba(212,217,226,.16)` | main: `rgba(255,255,255,.88)` | main: `rgba(255,214,220,.16)` | main: `rgba(255,255,255,.88)` | main: `rgba(220,235,232,.16)` | main: `rgba(255,255,255,.72)` |

### Dock

| Token | Role | Status | Blue dark | Blue light | Red dark | Red light | Mono→Sage dark | Mono→Sage light |
|---|---|---|---|---|---|---|---|---|
| `dock-hair` | Hairline edge of the dock | differs: Blue dark, Blue light, Red dark, Red light, Sage/Mono dark, Sage/Mono light | **DS `rgba(255,255,255,.08)`<br>main `rgba(212,217,226,.14)`** | **DS `rgba(255,255,255,.08)`<br>main `rgba(212,217,226,.16)`** | **DS `rgba(255,255,255,.08)`<br>main `rgba(255,226,230,.14)`** | **DS `rgba(255,255,255,.08)`<br>main `rgba(255,226,230,.16)`** | **DS `rgba(255,255,255,.08)`<br>main `rgba(220,235,232,.14)`** | **DS `rgba(255,255,255,.08)`<br>main `rgba(255,255,255,.18)`** |
| `dock-bar` | The dock's pill: dark glass in every theme and mode, blurred over the page. | differs: Blue light, Red dark, Red light, Sage/Mono dark, Sage/Mono light | `rgba(18,26,48,.78)` | **DS `rgba(18,26,48,.88)`<br>main `rgba(18,26,48,.80)`** | **DS `rgba(19,21,26,.78)`<br>main `rgba(30,12,17,.74)`** | **DS `rgba(10,11,14,.86)`<br>main `rgba(30,12,17,.80)`** | **DS `rgba(17,18,17,.82)`<br>main `rgba(16,30,32,.74)`** | **DS `rgba(5,5,5,.90)`<br>main `rgba(20,40,43,.82)`** |
| `dock-bar-solid` | The dock's pill where the browser cannot blur. | differs: Blue light, Red dark, Red light, Sage/Mono dark, Sage/Mono light | `rgba(18,26,48,.96)` | DS: `rgba(18,26,48,.97)` | **DS `rgba(19,21,26,.96)`<br>main `rgba(30,12,17,.96)`** | DS: `rgba(10,11,14,.97)` | **DS `rgba(17,18,17,.96)`<br>main `rgba(16,30,32,.96)`** | DS: `rgba(5,5,5,.97)` |
| `dock-dot` | A tab's round button on the dock: a faint light glass. | differs: Red dark, Sage/Mono dark, Sage/Mono light | `rgba(212,217,226,.08)` | `rgba(212,217,226,.08)` | **DS `rgba(255,255,255,.06)`<br>main `rgba(255,226,230,.07)`** | `rgba(219,246,255,.10)` | **DS `rgba(215,255,224,.07)`<br>main `rgba(220,235,232,.08)`** | **DS `rgba(215,255,224,.14)`<br>main `rgba(244,248,247,.94)`** |
| `dock-dot-solid` | The same, solid: the ring around the news dot. | differs: Red dark, Red light, Sage/Mono dark, Sage/Mono light | `#1F2840` | `#1F2840` | **DS `#1E2026`<br>main `#2A141A`** | **DS `#1D2226`<br>main `#2A141A`** | **DS `#1A1D1B`<br>main `#1D2F31`** | **DS `#202722`<br>main `#F2F6F5`** |
| `dock-dot-edge` | A tab circle's hairline. | differs: Red dark, Red light, Sage/Mono dark, Sage/Mono light | `rgba(212,217,226,.10)` | `rgba(212,217,226,.10)` | **DS `rgba(255,255,255,.07)`<br>main `rgba(255,226,230,.10)`** | **DS `rgba(219,246,255,.10)`<br>main `rgba(219,246,255,.12)`** | **DS `rgba(215,255,224,.09)`<br>main `rgba(220,235,232,.12)`** | **DS `rgba(215,255,224,.12)`<br>main `rgba(255,255,255,.70)`** |
| `dock-dot-ink` | A tab circle's icon. | differs: Red dark, Red light, Sage/Mono dark, Sage/Mono light | `#B3BED2` | `#B3BED2` | **DS `#AEB6BD`<br>main `#D9BEC3`** | **DS `#B9C7CE`<br>main `#E3CBD0`** | **DS `#A9BBAE`<br>main `#B9CAC7`** | **DS `#CFE9D5`<br>main `#142E33`** |
| `dock-pill` | The tab that is on: its open pill (the action colour; Ghost Green in Monochrome light, on the black dock). | differs: Sage/Mono dark, Sage/Mono light | `#8AB0EC` | `#8AB0EC` | `#FF2E3A` | `#FF2E3A` | **DS `#D7FFE0`<br>main `#E6EEEC`** | **DS `#D7FFE0`<br>main `#FFFFFF`** |
| `dock-pill-ink` | The icon and name on the open pill. | differs: Sage/Mono dark, Sage/Mono light | `#070B1A` | `#070B1A` | `#DBF6FF` | `#DBF6FF` | **DS `#050505`<br>main `#142E33`** | **DS `#050505`<br>main `#142E33`** |
| `dock-flag` | The dot that says there is news (the Coach tab, the bell): the accent, Signal Green in Blue. | differs: Sage/Mono dark, Sage/Mono light | `#82FC4F` | `#82FC4F` | `#FF2E3A` | `#FF5C66` | **DS `#D7FFE0`<br>main `#9BE3B9`** | **DS `#D7FFE0`<br>main `#2E8B5E`** |

### Ground, maps, imagery

| Token | Role | Status | Blue dark | Blue light | Red dark | Red light | Mono→Sage dark | Mono→Sage light |
|---|---|---|---|---|---|---|---|---|
| `map-water` | The river on the drawn city under a run (RunningMode). | differs: Sage/Mono dark, Sage/Mono light | `rgba(138,176,236,.20)` | `rgba(138,176,236,.40)` | `rgba(219,246,255,.10)` | `rgba(120,190,215,.30)` | **DS `rgba(215,255,224,.10)`<br>main `rgba(220,235,232,.10)`** | **DS `rgba(120,170,135,.30)`<br>main `rgba(120,160,160,.30)`** |
| `map-park` | Parks and their trees on the drawn city under a run. | differs: Sage/Mono dark, Sage/Mono light | `rgba(130,252,79,.07)` | `rgba(90,190,60,.16)` | `rgba(219,246,255,.05)` | `rgba(120,190,215,.14)` | **DS `rgba(215,255,224,.06)`<br>main `rgba(220,235,232,.06)`** | **DS `rgba(120,170,135,.16)`<br>main `rgba(120,160,160,.16)`** |
| `splash-ground` | The intro's ground: the rider artwork's own black, so the picture has no visible edge. | design system only | DS: `#040406` | DS: `#040406` | DS: `#040406` | DS: `#040406` | DS: `#040406` | DS: `#040406` |
| `rest-ground` | The rest-timer screen's ground, under the turning swirl. | design system only | DS: `#050506` | DS: `#050506` | DS: `#050506` | DS: `#050506` | DS: `#050506` | DS: `#050506` |
| `img-tone` | CSS filter that recolours the red photos into the theme | main only | main: `hue-rotate(-150deg) saturate(.8) brightness(1.05)` | main: `hue-rotate(-150deg) saturate(.8) brightness(1.05)` | main: `saturate(1)` | main: `saturate(1)` | main: `grayscale(1) sepia(.3) hue-rotate(128deg) saturate(.75) contrast(1.06)` | main: `grayscale(1) sepia(.3) hue-rotate(128deg) saturate(.75) contrast(1.04)` |
| `ground` | The page background blend (gradients) under the glass | main only | main: `radial-gradient(115% 55% at 85% -8%,rgba(92,127,181,.45) 0%,transparent 60%), radial-gradient(95% 60% at 0% 105%,rgba(82,125,174,.24) 0%,transparent 62%), linear-gradient(180deg,#0B1229 0%,var(--night-navy) 55%)` | main: `radial-gradient(115% 55% at 85% -8%,rgba(138,176,236,.55) 0%,transparent 60%), radial-gradient(90% 55% at 0% 100%,rgba(92,127,181,.22) 0%,transparent 62%), linear-gradient(180deg,#EEF2F8 0%,#D9E1EE 100%)` | main: `radial-gradient(115% 55% at 85% -8%,rgba(255,46,58,.34) 0%,transparent 60%), radial-gradient(95% 60% at 0% 105%,rgba(150,22,48,.34) 0%,transparent 62%), radial-gradient(70% 40% at 0% 38%,rgba(219,246,255,.05) 0%,transparent 70%), linear-gradient(180deg,#1E0A10 0%,#0D0709 55%)` | main: `radial-gradient(115% 55% at 85% -8%,rgba(255,46,58,.30) 0%,transparent 60%), radial-gradient(95% 60% at 0% 105%,rgba(110,190,220,.55) 0%,transparent 62%), linear-gradient(180deg,#EEFAFF 0%,#CDE9F4 100%)` | main: `radial-gradient(115% 55% at 85% -8%,rgba(122,152,150,.42) 0%,transparent 60%), radial-gradient(95% 60% at 0% 105%,rgba(58,96,95,.38) 0%,transparent 62%), linear-gradient(180deg,#152729 0%,#0D1A1B 55%)` | main: `radial-gradient(85% 42% at 0% 24%,rgba(44,72,73,.96) 0%,rgba(44,72,73,.6) 38%,transparent 74%), radial-gradient(75% 38% at 0% 70%,rgba(50,78,79,.82) 0%,transparent 72%), radial-gradient(80% 36% at 100% 2%,rgba(190,201,202,.78) 0%,transparent 64%), radial-gradient(120% 34% at 60% 108%,rgba(224,228,229,.95) 0%,transparent 62%), linear-gradient(165deg,#53696A 0%,#62797A 46%,#7C8F90 100%)` |
| `fig-tone` | Filter on the exercise figure (Sage only) | main only | — | — | — | — | main: `grayscale(1) contrast(1.05)` | main: `grayscale(1) contrast(1.05)` |

### RGB triplets (for rgba mixes)

| Token | Role | Status | Blue dark | Blue light | Red dark | Red light | Mono→Sage dark | Mono→Sage light |
|---|---|---|---|---|---|---|---|---|
| `glow-rgb` | The glow colour as an r,g,b triplet for rgba() mixes | main only | main: `92,127,181` | main: `92,127,181` | main: `255,46,58` | main: `255,46,58` | main: `120,155,150` | main: `20,46,51` |
| `bg-rgb` | bg as an r,g,b triplet | main only | main: `7,11,26` | main: `233,238,246` | main: `13,7,9` | main: `219,246,255` | main: `13,26,27` | main: `210,219,218` |
| `accent-rgb` | accent as an r,g,b triplet | main only | main: `138,176,236` | main: `61,106,168` | main: `255,46,58` | main: `255,46,58` | main: `220,231,228` | main: `20,46,51` |
| `accentHi-rgb` | accentHi as an r,g,b triplet | main only | main: `138,176,236` | main: `47,90,150` | main: `255,46,58` | main: `195,15,28` | main: `220,231,228` | main: `20,46,51` |
| `danger-rgb` | danger as an r,g,b triplet | main only | main: `229,50,62` | main: `229,50,62` | main: `255,46,58` | main: `255,46,58` | main: `229,50,62` | main: `229,50,62` |
| `warning-rgb` | warning as an r,g,b triplet | main only | main: `255,181,97` | main: `138,86,0` | main: `232,163,58` | main: `138,86,0` | main: `227,176,75` | main: `138,86,0` |
| `gold-rgb` | gold as an r,g,b triplet | main only | main: `240,198,88` | main: `122,98,19` | main: `217,177,58` | main: `122,98,19` | main: `227,194,107` | main: `122,98,19` |

### 3D figure stage

| Token | Role | Status | Blue dark | Blue light | Red dark | Red light | Mono→Sage dark | Mono→Sage light |
|---|---|---|---|---|---|---|---|---|
| `mq-top` | 3D figure stage (top) | main only | main: `#0A1226` | main: `#F3F6FB` | main: `#09111E` | main: `#F4FAFD` | main: `#0E1B1D` | main: `#E8EEED` |
| `mq-mid` | 3D figure stage (mid) | main only | main: `#121D38` | main: `#FFFFFF` | main: `#0F1B2E` | main: `#FFFFFF` | main: `#18292B` | main: `#F6F9F8` |
| `mq-edge` | 3D figure stage (edge) | main only | main: `#04070F` | main: `#CDD7E6` | main: `#050A13` | main: `#C9DCE6` | main: `#071012` | main: `#B7C6C4` |
| `mq-pool` | 3D figure stage (pool) | main only | main: `#2B5FB5` | main: `#A68B5B` | main: `#2068C4` | main: `#A6875B` | main: `#3E6B67` | main: `#6F8784` |
| `mq-pool-k` | 3D figure stage (pool-k) | main only | main: `1` | main: `-.3` | main: `1` | main: `-.3` | main: `.9` | main: `-.3` |
| `mq-skin` | 3D figure stage (skin) | main only | main: `#656A73` | main: `#949DA9` | main: `#656A73` | main: `#949DA9` | main: `#5B6765` | main: `#9AA6A4` |
| `mq-metal` | 3D figure stage (metal) | main only | main: `#353D4D` | main: `#4B5568` | main: `#373E49` | main: `#4E5866` | main: `#34403F` | main: `#46514F` |
| `mq-pad` | 3D figure stage (pad) | main only | main: `#313848` | main: `#3A4254` | main: `#343942` | main: `#3B434F` | main: `#2E3939` | main: `#364140` |
| `mq-steel` | 3D figure stage (steel) | main only | main: `#949CAC` | main: `#C9D0DA` | main: `#949CAC` | main: `#C9D0DA` | main: `#A3B3B1` | main: `#CBD5D3` |
| `mq-mark` | 3D figure stage (mark) | main only | main: `#8AB0EC` | main: `#3D6AA8` | main: `#C2474C` | main: `#D9303B` | main: `#DCE7E4` | main: `#142E33` |
| `mq-rim` | 3D figure stage (rim) | main only | main: `#B1D6FF` | main: `#E9F0F7` | main: `#B1D6FF` | main: `#E9F0F7` | main: `#DDEBE8` | main: `#EEF4F3` |
| `mq-bounce` | 3D figure stage (bounce) | main only | main: `#5E8FE8` | main: `#9DB7D8` | main: `#6198E4` | main: `#9DB7D8` | main: `#7FA39F` | main: `#AFC0BD` |
| `mq-deep` | 3D figure stage (deep) | main only | main: `#2F6BFF` | main: `#1F4FA8` | main: `#E44C3B` | main: `#E0202E` | main: `#3F8E86` | main: `#17524B` |
| `mq-hot` | 3D figure stage (hot) | main only | main: `#A8CCFF` | main: `#3D7CF0` | main: `#FFAC7B` | main: `#FF6A4D` | main: `#A9E2D8` | main: `#2F8C80` |
| `mq-shade` | 3D figure stage (shade) | main only | main: `1` | main: `.9` | main: `1` | main: `.9` | main: `1` | main: `.9` |
| `mq-arrow` | 3D figure stage (arrow) | main only | main: `#82FC4F` | main: `#177530` | main: `#84BAFF` | main: `#1F6FE0` | main: `#DCE7E4` | main: `#142E33` |
| `mq-arrow-glow` | 3D figure stage (arrow-glow) | main only | main: `#3FA52A` | main: `#7CC79A` | main: `#468CFF` | main: `#7FB0F5` | main: `#5FAFA5` | main: `#6F9C96` |

### Semantic aliases (follow their base token)

| Token | Role | Status | Blue dark | Blue light | Red dark | Red light | Mono→Sage dark | Mono→Sage light |
|---|---|---|---|---|---|---|---|---|
| `color-bg-base` | Semantic alias | differs: Red dark, Sage/Mono dark, Sage/Mono light | `#070B1A` | `#E9EEF6` | **DS `#0A0B0E`<br>main `#0D0709`** | `#DBF6FF` | **DS `#050505`<br>main `#0D1A1B`** | **DS `#D7FFE0`<br>main `#D2DBDA`** |
| `color-surface-1` | Semantic alias | differs: Red dark, Sage/Mono dark, Sage/Mono light | `#121A30` | `#FFFFFF` | **DS `#13151A`<br>main `#1A0E12`** | `#F5FCFF` | **DS `#111211`<br>main `#152527`** | **DS `#FFFFFF`<br>main `#E6ECEB`** |
| `color-surface-2` | Semantic alias | differs: Red dark, Sage/Mono dark, Sage/Mono light | `#1B2440` | `#DDE4EF` | **DS `#1B1E25`<br>main `#25131A`** | `#E4F5FC` | **DS `#1A1B1A`<br>main `#1D2F31`** | **DS `#EAFFEF`<br>main `#D3DCDB`** |
| `color-surface-well` | Semantic alias | differs: Red dark, Sage/Mono dark, Sage/Mono light | `rgba(3,5,14,.45)` | `rgba(11,18,38,.06)` | **DS `rgba(8,8,10,.45)`<br>main `rgba(10,3,5,.45)`** | `rgba(10,40,60,.07)` | **DS `rgba(0,0,0,.5)`<br>main `rgba(2,8,9,.45)`** | **DS `rgba(5,5,5,.06)`<br>main `rgba(19,38,39,.06)`** |
| `color-border` | Semantic alias | differs: Red dark, Sage/Mono dark, Sage/Mono light | `#2A3452` | `#C3CDDD` | **DS `#262A33`<br>main `#3A2029`** | `#BCDCE8` | **DS `#272927`<br>main `#2A3F41`** | **DS `#B5DCBE`<br>main `#AEBDBC`** |
| `color-border-subtle` | Semantic alias | differs: Red dark, Sage/Mono dark, Sage/Mono light | `rgba(212,217,226,.09)` | `rgba(11,18,38,.10)` | **DS `rgba(255,255,255,.08)`<br>main `rgba(255,226,230,.08)`** | `rgba(10,40,60,.10)` | **DS `rgba(215,255,224,.09)`<br>main `rgba(220,235,232,.09)`** | **DS `rgba(5,5,5,.10)`<br>main `rgba(19,38,39,.12)`** |
| `color-text-primary` | Semantic alias | differs: Red dark, Sage/Mono dark, Sage/Mono light | `#EEF2F8` | `#0B1226` | **DS `#F1F5F8`<br>main `#F8EFF1`** | `#0A0B0E` | **DS `#D7FFE0`<br>main `#EAF1EF`** | **DS `#050505`<br>main `#132627`** |
| `color-text-secondary` | Semantic alias | differs: Red dark, Sage/Mono dark, Sage/Mono light | `#C3CBDA` | `#3A4560` | **DS `#C4CCD2`<br>main `#DCC7CB`** | `#334750` | **DS `#BCCDC0`<br>main `#BFD0CD`** | **DS `#2B352E`<br>main `#2C4041`** |
| `color-text-tertiary` | Semantic alias | differs: Red dark, Sage/Mono dark, Sage/Mono light | `#8D98B0` | `#525E78` | **DS `#8A939B`<br>main `#A99096`** | `#465B65` | **DS `#86918A`<br>main `#8FA5A2`** | **DS `#46524A`<br>main `#435857`** |
| `color-text-accent` | Semantic alias | differs: Sage/Mono dark, Sage/Mono light | `#8AB0EC` | `#2F5A96` | `#FF2E3A` | `#C30F1C` | **DS `#D7FFE0`<br>main `#DCE7E4`** | **DS `#050505`<br>main `#142E33`** |
| `color-action-primary` | Semantic alias | differs: Sage/Mono dark, Sage/Mono light | `#8AB0EC` | `#3D6AA8` | `#FF2E3A` | `#FF2E3A` | **DS `#D7FFE0`<br>main `#DCE7E4`** | **DS `#050505`<br>main `#142E33`** |
| `color-action-primary-deep` | Semantic alias | differs: Sage/Mono dark, Sage/Mono light | `#5C7FB5` | `#2C5390` | `#A80E19` | `#A80E19` | **DS `#D7FFE0`<br>main `#B3C8C3`** | **DS `#050505`<br>main `#0A1F23`** |
| `color-on-action-primary` | Semantic alias | differs: Sage/Mono dark, Sage/Mono light | `#070B1A` | `#FFFFFF` | `#DBF6FF` | `#DBF6FF` | **DS `#050505`<br>main `#142E33`** | **DS `#D7FFE0`<br>main `#F2F6F5`** |
| `color-success` | Semantic alias | differs: Sage/Mono dark, Sage/Mono light | `#82FC4F` | `#177530` | `#22A34B` | `#177530` | **DS `#4C9E6B`<br>main `#5DBB8A`** | **DS `#177530`<br>main `#1D7448`** |
| `color-warning` | Semantic alias | same | `#FFB561` | `#8A5600` | `#E8A33A` | `#8A5600` | `#E3B04B` | `#8A5600` |
| `color-danger` | Semantic alias | differs: Sage/Mono light | `#FF6B70` | `#C41E2A` | `#FF2E3A` | `#C30F1C` | `#FF5C61` | **DS `#C41E2A`<br>main `#B8222D`** |
| `color-danger-fill` | Semantic alias | same | `#E5323E` | `#E5323E` | `#FF2E3A` | `#FF2E3A` | `#E5323E` | `#E5323E` |
| `color-record` | Semantic alias | differs: Red dark, Sage/Mono dark, Sage/Mono light | `#F0C658` | `#7A6213` | **DS `#C9A227`<br>main `#D9B13A`** | `#7A6213` | **DS `#D7FFE0`<br>main `#E3C26B`** | **DS `#050505`<br>main `#7A6213`** |
| `color-data-protein` | Semantic alias | differs: Sage/Mono dark, Sage/Mono light | `#5E8FE8` | `#2F5A96` | `#FF2E3A` | `#D41E2A` | **DS `#D7FFE0`<br>main `#DCE7E4`** | **DS `#050505`<br>main `#142E33`** |
| `color-data-carbs` | Semantic alias | differs: Sage/Mono dark, Sage/Mono light | `#21A68A` | `#14936B` | `#22A6B3` | `#009AA6` | **DS `#8FAA98`<br>main `#5FAFA5`** | **DS `#34443A`<br>main `#3F8E86`** |
| `color-data-fat` | Semantic alias | differs: Sage/Mono dark, Sage/Mono light | `#D27C2C` | `#B8641E` | `#7F78F2` | `#6D5FE6` | **DS `#58695D`<br>main `#D6A35A`** | **DS `#74917D`<br>main `#B8732A`** |
| `color-set-target` | Semantic alias | differs: Red dark, Sage/Mono dark, Sage/Mono light | `#8D98B0` | `#525E78` | **DS `#8A939B`<br>main `#A99096`** | `#465B65` | **DS `#86918A`<br>main `#8FA5A2`** | **DS `#46524A`<br>main `#435857`** |
| `color-set-active` | Semantic alias | differs: Sage/Mono dark, Sage/Mono light | `#8AB0EC` | `#3D6AA8` | `#FF2E3A` | `#FF2E3A` | **DS `#D7FFE0`<br>main `#DCE7E4`** | **DS `#050505`<br>main `#142E33`** |
| `color-set-done` | Semantic alias | differs: Sage/Mono dark, Sage/Mono light | `#82FC4F` | `#177530` | `#22A34B` | `#177530` | **DS `#4C9E6B`<br>main `#5DBB8A`** | **DS `#177530`<br>main `#1D7448`** |
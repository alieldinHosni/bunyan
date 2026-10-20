# Food frames — specs read from Figma

The Figma connector's Starter allowance is tiny: on 29 Sep it allowed three calls
before capping again. Every frame read here cost one of them, so the specs are
kept rather than re-fetched. Values are the frames' own (CSS px, 402×874 frame).

Palette in these frames maps onto the app's tokens: `#090a0c` bg, `#14161b`
surface, `#26282e` border, `#eceae6` text, `#8e8c84` dim, `#e31b23` accent,
`#3d0d10` accent-soft. They are drawn in Inter; the app uses Outfit/Manrope.

## Read

### 13:188 add-food-search
- **Header** — back chevron, then a stack: "Add Food" 18px bold / meal name 13px dim.
- **Search box** — surface, 1px border, radius 12, padding 14, gap 12: search icon
  20px, placeholder "Search food or scan barcode" 15px dim, **camera icon 20px** at
  the trailing end (barcode). `icons/camera.svg` saved.
- **Tabs** — Search (active: 14px bold text + 2px accent bar 32px wide beneath) /
  Recent / Favorites / Custom (14px medium dim). Gap 16, padding 8 24.
- **Quick pills** — wrap, gap 8: surface, border, radius 20, padding 8 14, 13px text.
  (Chicken Breast, White Rice, Banana, Greek Yogurt, Eggs.)
- **Results** — overline `RESULTS FOR "CHICKEN"` 12px bold uppercase dim; cards:
  surface, radius 12, padding 16; name 15px bold ("Chicken Breast, Grilled (100g)"),
  line 12px dim `165 cal  •  P: 31g  •  C: 0g  •  F: 3.6g`; trailing add button:
  accent-soft fill, radius 8, padding 8, plus icon 16px.

### 13:266 food-detail-quantity
- **Header** — back chevron, then: food name 18px bold / "Add to Breakfast" 13px dim.
- **Monumental header** — full-width surface band, padding 32, centred, gap 16:
  "TOTAL CALORIES" 14px bold uppercase dim; "165" **64px** extrabold; "kcal" 16px
  bold **accent**; macro row gap 24 — value 14px extrabold over label 11px
  uppercase dim (PRO / CARB / FAT).
- **Modifiers** — padding 24, gap 20:
  - "SERVING SIZE" 12px bold uppercase dim; a select row: surface, border, radius 12,
    padding 16, "100g" 16px bold + chevron-down 20px.
  - "NUMBER OF SERVINGS"; stepper row: surface, radius 12, padding 12, space-between:
    − button 44×44 `#26282e` radius 8 text 20px; value 24px extrabold; + button 44×44
    accent-soft radius 8, **accent** text 20px.
  - "More Nutrients (Fiber, Sodium...)" row: surface, border, radius 12, padding 16,
    info icon 20px + 14px bold text, plus icon 16px trailing. `icons/info.svg` saved.
  - CTA: accent, **56px** tall, radius 12, "ADD TO BREAKFAST" 16px bold.

## Read from PNG exports (29 Sep)

The other five came as 2× PNGs from the user, so their spacing is read to within a
couple of pixels rather than taken literally. All seven are built — see PROGRESS.md
section 13, "The food group".

- 13:337 natural-language-input — "Quick Add": describe a meal, parsed list, green total.
- 13:403 unknown-food-state — amber field and card; Add details / Try again / Enter manually.
- 13:464 custom-food-entry — name, serving, 2×2 macro input tiles, Save-to-My-Foods switch.
- 13:531 nutrition-goals — energy goal, 3-colour macro split, remaining today.
- 13:599 food-states-reference — a component sheet, not a screen: loading, estimated,
  offline, empty. Its states are applied inside the add-food sheet.

## How the open question was answered

13:337 settled it: the design has **both** ways in. "Add Food" (search, pick, servings)
and "Quick Add" (describe a meal) are two modes of one sheet. Quick Add is reached from
the first row under an empty search, because no frame shows how to get there.

# Program covers

Every preset program has a cover at `img/split-<id>.jpg`, mapped in `SPLIT_IMG` in
`js/ui/views/train.js`. Seven are photographs. Six are drawn in the Bunyan pen until
they get one: `sl5`, `db`, `glute`, `ppl3`, `foot`, `fl`.

To replace a drawing, save a photo over the file with the same name and bump `CACHE`
in `sw.js`. No code changes.

## What a cover has to be

- **Size:** 720 × 400 JPEG (the card shows it at 180 × 100), about 20–60 KB. The
  existing photos are 360 × 200, which is the smallest that stays sharp.
- **Look:** the same as the photo covers beside it — a dark gym, one athlete lit in deep
  red, everything else near-black, a red diagonal slash behind the figure.
- **Left fifth:** a dark panel with a thin red vertical line at the edge and two or
  three flat red pictograms stacked, divided by thin grey rules. Keep the athlete out
  of it.
- **No text** except the program's figure where it is the name (5×5, ×3).
- The card darkens the cover by 40%, so err on the bright side.

## Prompts

Each prompt ends with the same style line so the six match each other and the seven
that exist:

> Style: cinematic photograph, 16:9, near-black background, deep crimson (#E31B23)
> rim light and red colour grade, red diagonal slash graphic behind the athlete, left
> fifth of the frame a dark panel with a thin red vertical line and three flat red
> pictogram icons separated by thin grey lines, high contrast, no text, no logos.

| File | Program | Prompt |
| --- | --- | --- |
| `split-sl5.jpg` | Strength 5×5 | A powerful man at the bottom of a heavy barbell back squat in a dark power rack, plates loaded, chalk dust in the red light. Pictograms: barbell, weight plate, squat rack. Large red "5×5" in the upper right. |
| `split-db.jpg` | Home Dumbbells | A muscular man doing a one-arm dumbbell row on a flat bench in a dim home garage gym. Pictograms: dumbbell, flat bench, house. |
| `split-glute.jpg` | Glutes & Legs Focus | An athlete mid barbell hip thrust against a bench, side view, glutes and hamstrings lit in red. Pictograms: kettlebell, plyo box, resistance band. |
| `split-ppl3.jpg` | Push / Pull / Legs × 3 | A muscular man mid pull-up, seen from behind, red light across the back. Pictograms: push arrow, pull arrow, up-down squat arrow. Large red "×3" in the upper right. |
| `split-foot.jpg` | Footballer: Strength & Conditioning | A footballer sprinting past training cones on a dark pitch at night, ball at his feet, red floodlight. Pictograms: cone, stopwatch, speed lines. |
| `split-fl.jpg` | Fat Loss: Lift + Cardio | An athlete on a rowing machine or assault bike, sweat in red light, a kettlebell on the floor beside him. Pictograms: heartbeat line, dumbbell, flame. |

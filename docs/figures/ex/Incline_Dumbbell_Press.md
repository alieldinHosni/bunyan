# Incline Dumbbell Press — exercise dossier

`docs/FIGURE-V3.md` 2.8. Library id `Incline_Dumbbell_Press`. Written before the record
was touched; the record (`js/data/mannequin/moves.js`, `inclineDbPress()`, reached from
the `benchPress` family with `strict:true`; the family's other dumbbell presses keep the
old record until their own reviews) and the test
(`js/data/test/ex/Incline_Dumbbell_Press.test.js`) are written from it.

Sources, by tag: **LIB** the library's entry (`exercises.json`: m Chest; x Shoulders,
Triceps; Dumbbell; Beginner) and its instructions (`instructions.json`); **KB** the app's
knowledge base (`js/knowledge/`), named where used; **GEN** general biomechanics. No
textbook prose is used.

## Technique sheet

```
Exercise:        Incline Dumbbell Press (palms toward the feet)
Family:          bench press (incline, dumbbells)
Plane:           mostly sagittal, the elbows out to the sides; view from in front and
                 to the left, a little above (yaw 40, pitch 20)
Equipment:       adjustable bench at 35°; two dumbbells
Contacts:        upper back and hips on the bench; both feet flat on the floor; each
                 hand round its dumbbell's handle
Setup (u = 0):   the bottom: dumbbells beside the upper chest, handles in line across
                 the body, palms toward the feet; each forearm upright under its
                 dumbbell; upper arms 50° out from the trunk and 15° below its front;
                 shoulder blades drawn back and down; head on the line of the spine
Movement:        press up and slightly back until the dumbbells are over the shoulders;
                 the forearms stay near upright, the wrists straight
Top (u = 1):     arms long, elbows about 12° short of locked, dumbbells over the
                 shoulders with a gap between them; held half a second
Order:           none
Spine / neck:    neutral / in line
Shoulder blade:  set (back and down) throughout: the raised arms do not lift or spread them
Tempo default:   lift 1 s, hold 0.5 s, lower 2 s, rest 0.5 s ([1, .5, 2, .5]); a
                 prescribed tempo replaces it
Roles:           prime: chest (refined to "Upper chest"); synergist: front delts
                 (library "Shoulders", refined), triceps; stabiliser: not shown
```

## Differs from its family in

The flat press lies level and lowers to mid-chest. Here the bench is inclined, so
"upright" for the forearm is the world's vertical, not square to the bench; the
dumbbells finish over the shoulders, which on an incline is toward the head along the
body; and the trunk lies 35° from level, so the top arm is at about 125° to the trunk.

## Its own safety rules

| # | Rule | Measured as (test) | Source |
|---|------|--------------------|--------|
| 1 | Bench at 30–45°, the body lying along it | the bench's angle 30–45°; the trunk within 3° of it at 41 moments; audit: back and hips touch the bench | GEN; LIB ("lie back on an incline bench") |
| 2 | Wrists over elbows, wrists straight | forearm within 5° of upright at the bottom, 15° all the way; hand within 10° of the forearm's line | GEN (FIGURE-V3 2.0 "the wrist stays straight under the load"; 2.3 bench row); FIGURE-V3 2.6 bench clearance |
| 3 | Elbows 45–70° from the trunk, never straight out to the side under load | in-plane angle of the upper arm from the trunk's axis 45–70° at the bottom, and at most 70° while the elbows are below the shoulders | GEN (FIGURE-V3 2.3 bench row) |
| 4 | Shoulder blades set (back and down), not shrugged or spread | the shoulder joint moves under 1 cm on the chest, toward the ears or forward, over the repetition | KB `imbalances.js` MOVEMENT_FAULTS push_shoulders_elevate; KB `cues.js` Standing_Cable_Chest_Press ("shoulders stay down"); GEN |
| 5 | The dumbbells do not touch at the top | at least 2 cm between their inner plates | GEN (clanking them loses the shoulder's tension and control) |
| 6 | Controlled depth | upper arm 0–20° below the trunk's front at the bottom | KB `acute-variables.js` EXERCISES dumbbell_chest_press ("only as low as is controlled without compensating"); KB `cues.js` Dumbbell_Bench_Press ("lower only as far as you control") |
| 7 | Arms long, not locked; the weight finishes over the shoulders; never over the face | elbows 5–20° short of straight at the top; grip within 4 cm of plumb over the shoulder; the path never swings toward the feet by more than 2.5 cm; audit bench clearance (never more than 5 cm past the shoulders toward the head; over the chest at the bottom) | GEN (FIGURE-V3 2.3, 2.6) |
| 8 | Spine neutral, head on the line of the spine | `spine:"neutral"`; neck within 10° | KB `acute-variables.js` barbell_bench_press ("buttocks, shoulders and head on the bench"); KB MOVEMENT_FAULTS push_low_back_arch, push_head_forward |
| 9 | Feet flat on the floor | soles within 1 cm of the floor; audit slide | KB `cues.js` Barbell_Bench_Press ("feet down"); KB `core.js` checkpoints |
| 10 | Lowered under control | lowering at least 1.5 × the lift | LIB ("lowering … about twice as long as raising"); KB `acute-variables.js` SAFETY breathing |
| 11 | Palms toward the feet, the dumbbells in line across the body | palm normal toward the feet at the bottom | LIB ("palms … facing away from you") |

## Joints, bottom → top (as the record measures them)

| | Bottom (u = 0) | u = 0.25 | Middle (u = 0.5) | Top (u = 1) |
|---|---|---|---|---|
| Elbow bend | 125° | 96° | 68° | 12° |
| Forearm from upright | 0° | 3° | 6° | 12° |
| Upper arm out from the trunk (in its plane) | 50° | 66° | 86° | (arm points up: not defined) |
| Upper arm below (+) / above (−) the trunk's front | 15° | −12° | −37° | −55° |
| Dumbbell handle from the shoulder joint, toward the feet | 12 cm | 14 cm | 13 cm | 2 cm |
| Handle above the chest's front surface | 10 cm | — | — | — |
| Shoulder blades (shrug taken off the raised arm) | set | set | set | set |
| Gap between the dumbbells' inner plates | — | — | — | 2.9 cm |

## What the figure must show

- The back and hips on the bench, feet flat, head on the line of the spine.
- At the bottom: forearms upright under the dumbbells, elbows below and out at about 50°,
  the dumbbells beside the upper chest.
- The dumbbells pressed up and slightly back to over the shoulders, wrists straight.
- A small gap between the dumbbells at the top; elbows soft, not snapped straight.

## What it must never show

- Elbows straight out at 90° to the trunk at the bottom, or tucked to the ribs.
- Wrists bent back under the dumbbells; forearms leaning in or out at the bottom.
- The dumbbells over the face or the neck; dumbbells knocking together.
- Shoulders shrugged toward the ears or rolled forward off the bench.
- The low back arching off the bench; heels lifting; the head lifting.
- Bouncing out of the bottom or a deep stretch past control.

## What the camera must show

In front and to the left, a little above (yaw 40, pitch 20): both dumbbells, the face
clear of them, the forearms' line, the elbows' angle out from the body. The opposite
view (behind and to the right) shows the back on the bench.

## What this body and engine forced

- **The elbows open as the arms rise.** With the forearms kept upright and the weight
  travelling up and back to over the shoulders, the upper arm's angle out from the trunk
  grows from 50° at the bottom to about 70° as the elbows pass shoulder height and about
  86° halfway (where the upper arm is already 37° in front of the trunk, carrying little
  of the stretch). A bottom flare of 60° would pass 70° below shoulder height, so the
  bottom is 50°. Holding 45–70° all the way up would need either forearms tilting by
  30° (tried: a straight grip path with the elbows placed under the hands) or the
  dumbbells swinging 7–12 cm toward the feet before coming back (tried: a middle key);
  both are worse faults, so rule 3 is measured while the elbows are below the shoulders.
- **The elbow is closed (125°) at the bottom.** On a 35° incline an upright forearm
  over an elbow that points down toward the hips gives that angle; it is inside the
  145° range.
- **Depth is moderate.** The handles stop about 10 cm above the chest's front surface,
  upper arms 15° below the trunk's front. Each 5° deeper lowers the handles about 2 cm;
  the owner may want it deeper or shallower (see Review).
- **The top is not locked** (12° short), against the library's "lock your arms at the
  top": FIGURE-V3's bench row asks for arms long, not locked hard, and that is followed.
- **The shoulder blades** are held by taking off, each moment, the lift the engine gives
  the clavicle when the arm is raised (`shrug`); the engine moves the clavicle only.
- The bench is placed where the upper back rests (the old record left a 5 cm gap); the
  old record's dumbbells passed 4 cm into the chest and the elbows went to 159°.

## Exercise-specific tests

`js/data/test/ex/Incline_Dumbbell_Press.test.js`: rules 1–11, numbered as above, plus
every audit check (penetration, contacts, clearances, limits, joint speed, slide), plus
the gate.

## Review

**Ready for owner review — 2026-11-13.** Not marked `checked`.

Pictures (not in the repository): `review/Incline_Dumbbell_Press/` in the session's
scratch folder: `cam-u0/u0.5/u1.png` (the record's view), `opp-u0/u0.5/u1.png` (the
opposite side), `strip-8.png` (eight moments), `rep.gif` (one repetition, 3 s).

What to look at:
1. The bottom (`cam-u0`, `opp-u0`): forearms upright, elbows at about 50°, and whether
   the depth (handles about 10 cm above the chest) is what you want taught.
2. The middle (`cam-u0.5`): the elbows open to about shoulder height as the arms rise
   (see "What this body and engine forced"); is that acceptable?
3. The top (`cam-u1`): dumbbells over the shoulders with a gap, elbows soft.

```
Reviewed:  [ ] stills beside photos at start / middle / top
           [ ] played at 0.5× for a whole repetition, from two angles
           [ ] every rule above read against the picture
```

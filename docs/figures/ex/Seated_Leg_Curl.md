# Seated Leg Curl — exercise dossier

`docs/FIGURE-V3.md` 2.8. Library id `Seated_Leg_Curl`. Written before the record was
touched; the record (`js/data/mannequin/moves.js`, `legMachine()` with
`kind:"seated", strict:true`; the Leg Extension and the Lying Leg Curl keep the family's
record until their own reviews) and the test (`js/data/test/ex/Seated_Leg_Curl.test.js`)
are written from it.

Sources, by tag: **LIB** the library's entry (`exercises.json`: m Hamstrings; x none;
Machine; Beginner), its instructions (`instructions.json`) and its two photographs;
**GEN** general biomechanics. No textbook prose is used.

## Technique sheet

```
Exercise:        Seated Leg Curl
Family:          leg machine (seated)
Plane:           sagittal; seen from the front and to the side (yaw 78, pitch 10),
                 where the knee's bend and the roller's arc are seen
Equipment:       a seated leg curl machine: seat, back pad, a lap pad across the thighs
                 with a handle at each end, a lever pivoting at the knee with a roller
Contacts:        seat under the thighs and hips; back against the back pad; the lap pad
                 on the thighs just above the knees; the roller behind the lower legs,
                 a few centimetres under the calves; the hands on the lap pad's handles
Setup (u = 0):   seated, back on the pad, legs straight out in front (knees about 6°
                 short of straight), the roller behind the lower legs, toes pointing
                 straight
Movement:        the knees bend, drawing the roller down and back under the seat; the
                 thighs, hips and trunk do not move
End (u = 1):     knees bent about 103°, the heels under the front of the seat, held a
                 second
Order:           the knees alone
Spine / neck:    neutral against the back pad / in line
Tempo default:   curl 1 s, hold 1 s at the curl, return 2 s, a moment with the legs
                 long ([1, 1, 2, .4]); a prescribed tempo replaces it
Roles:           prime: hamstrings (library m). The library names no other muscle, so
                 none is lit: the calves and the small knee flexors that help (GEN)
                 are not shown
```

## Differs from its family in

The family's record had the hands on side handles beside the seat (the wrists bent 51°
sideways, past the 40° limit), the roller 9 mm into the shins, the back 2.5 cm off its
pad, and a curl of 92°. This one holds the lap pad's handles as in the photographs,
rests the roller on the lower legs and the back on its pad, sits 2 cm higher so the feet
clear the floor at the bottom of the arc, and curls to 103°.

## Its own safety rules

| # | Rule | Measured as (test) | Source |
|---|------|--------------------|--------|
| 1 | Start with the legs straight | knees at most 10° short of straight at u = 0 | LIB ("ensure that the legs are fully straight") |
| 2 | A full curl, inside the knee's range, in one smooth bend | knee bend 100–120° at u = 1; the bend never reverses during the curl | LIB ("as far as possible"); GEN (2.0 knee limit) |
| 3 | The torso stays still | trunk angle and hip angle each change by less than 2° | LIB ("Keep your torso stationary at all times") |
| 4 | The back against the back pad | trunk within 1 cm of the pad at 41 moments | LIB ("back against the back support pad") |
| 5 | The lap pad holds the thighs, just above the knees | the pad within 1 cm of the thighs, never into them; 60–95% of the way from hip to knee | LIB ("secure the lap pad against your thighs, just above the knees") |
| 6 | The roller under the lower calves, never on the heel or the back of the knee | the roller within 1 cm of the shins, never into them; 5–35% of the way from ankle to knee | LIB ("just a few inches under the calves") |
| 7 | The knees stay on the machine's pivot | the knees move at most 2 cm over the repetition | GEN (a knee off the lever's axis loads it sideways and the roller slides) |
| 8 | The feet clear the floor and the frame | lowest point of the feet at least 3 cm above the floor; nothing through anything | GEN (2.6) |
| 9 | Controlled: a held curl, a slow return | return at least 1.5 × the curl; a hold of at least 0.5 s | LIB ("Hold the contracted position for a second. Slowly return") |
| 10 | Only what the library names is lit | the hamstrings, as prime mover, and nothing else | LIB (m Hamstrings, x none); FIGURE-V3 2.4 |
| — | Hands do not slip; wrists in range | audit: slide and limits pass | GEN (2.0) |

## Joints, start → end (as the record measures them)

| | Start (u = 0) | Middle (u = 0.5) | End (u = 1) |
|---|---|---|---|
| Knee bend | 6° | 55° | 103° |
| Hip flexion | 75° | 75° | 76° |
| Trunk back from upright | 14° | 14° | 14° |
| Back to back pad | 0.2 cm | 0.2 cm | 0.2 cm |
| Lap pad to thighs | 0.1–0.2 cm | | |
| Roller to shins | 0.4 cm | 0.4 cm | 0.4 cm |
| Feet above the floor (lowest over the repetition) | | 4.7 cm | |

## What the figure must show

- Legs long in front, the back on its pad, the hands on the lap pad's handles.
- Only the lower legs moving: the roller drawn down and back under the seat in an arc
  about the knee.
- A held curl with the heels under the front of the seat, then a slower return.

## What it must never show

- The hips lifting off the seat or the trunk rocking to help the curl.
- The roller on the heels or behind the knees.
- The knees sliding forward off the pivot.
- The feet striking the floor or the frame.

## What the camera must show

From the front and to the side (yaw 78): the knee's bend, the roller's arc and the lap
pad. The opposite side (yaw 258) shows the back against its pad.

## What this body and engine forced

- **The curl stops at 103°.** The photographs show about 100°; with this seat height a
  deeper curl brings the feet into the frame's base.
- **The seat is 2 cm higher than the family's** so the feet clear the floor at the
  bottom of the arc (2.7 cm before, 4.7 cm now).
- **The trunk is 14° back**, the back pad's angle; the photographs show the lifter a
  little more upright, on a more upright pad.
- **The library tags this exercise's pattern "Elbow flexion"** (`exercises.json` p). That
  is a library error; nothing here reads it, and it is noted for the library's owner.

## Exercise-specific tests

`js/data/test/ex/Seated_Leg_Curl.test.js`: rules 1–10, numbered as above, plus every
audit check (penetration, contacts, clearances, limits, joint speed, slide), plus the
gate: until the owner approves, the app cannot reach this record (`checked` empty).

## Review

**Ready for the owner's review, not checked.** Until it is approved, the app keeps
showing this exercise's photographs.

Pictures (not in the repository): start, middle and end from the record's view and from
the opposite side, beside the library's two photographs.

What to look at:
1. The start: legs long, the back on its pad, the hands on the lap pad's handles.
2. The end: knees bent about 103°, heels under the front of the seat, hips and trunk
   unmoved.
3. Whether the roller sits where you want it taught: behind the lower legs, a few
   centimetres under the calves.

```
Reviewed:  [ ] stills beside photos at start / middle / end
           [ ] played at 0.5× for a whole repetition, from two angles
           [ ] every rule above read against the picture
```

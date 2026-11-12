# Pullups — exercise dossier

`docs/FIGURE-V3.md` 2.8. Library id `Pullups`. Written before the record was touched;
the record (`js/data/mannequin/moves.js`, `strictPullup()`, reached from the `pullup`
family with `strict:true`; Chin-Up and V-Bar Pullup keep the family's old record until
their own reviews) and the test (`js/data/test/ex/Pullups.test.js`) are written from it.

Sources, by tag: **LIB** the library's entry (`exercises.json`: m Back; x Biceps;
Bodyweight; Beginner) and its instructions (`instructions.json`); **KB** the app's
knowledge base (`js/knowledge/`), named where used; **GEN** general biomechanics. No
textbook prose is used.

## Technique sheet

```
Exercise:        Pullups (overhand grip, strict)
Family:          pull-up
Plane:           sagittal and frontal (the elbows come down to the sides); view from
                 behind and to the left (yaw 118, pitch 6), where the back that works
                 and the shoulder blades are seen
Equipment:       a fixed bar 2.30 m high on a frame
Contacts:        both hands round the bar, overhand, 74 cm apart (about one and a half
                 shoulder widths); nothing else: the feet hang clear
Setup (u = 0):   hanging with the arms long (elbows about 10° short of straight),
                 shoulders engaged (not sunk to the ears), legs straight-ish and a
                 little in front of the hips, the body still under the bar
Movement:        first the shoulder blades draw down (the body rises a few cm with the
                 arms still long), then the elbows drive down to the sides; the chest
                 rises toward the bar, the trunk tipping back as it rises
Top (u = 1):     chin over the bar, chest up, trunk about 22° back from upright, the
                 face behind the bar; held a second
Order:           shoulder blades, then elbows
Spine / neck:    neutral / in line
Shoulder blade:  down (depressed) before the pull, held down through it
Tempo default:   lift 1.2 s, hold 1 s at the top, lower 2 s, a moment in the hang
                 ([1.2, 1, 2, .4]); a prescribed tempo replaces it
Roles:           prime: back (refined to "Lats"); synergist: biceps (library x);
                 stabiliser: core, not named by the library and not shown
```

## Differs from its family in

The family's chin-up and neutral-grip pull-up keep their old two-pose record (they are
not reviewed here). This one is a strict pull-up built from keys: a scapular phase
before any elbow bend, the centre of mass held under the bar, the trunk tipping back as
it rises, legs fixed to the pelvis.

## Its own safety rules

| # | Rule | Measured as (test) | Source |
|---|------|--------------------|--------|
| 1 | Start from a full hang, hanging free | elbows at most 12° short of straight at u = 0; the feet at least 8 cm off the floor | LIB ("arms fully extended"); GEN |
| 2 | Shoulders engaged; the blades go down first | by u = 0.15 the shoulders have dropped at least 1.5 cm away from the ears with the elbows unchanged (within 3°); no elbow bend before then | KB `acute-variables.js` EXERCISES standing_cable_row ("start every row by retracting and depressing the shoulder blades; no shrugging"); KB `imbalances.js` MOVEMENT_FAULTS pull_shoulders_elevate; LIB ("drawing the shoulders … down and back"); GEN (FIGURE-V3 2.3, the first 15% of a pull is the blades) |
| 3 | Chin over the bar at the top | chin's lowest point at least 1.5 cm above the top of the bar at u = 1 | GEN (FIGURE-V3 2.3 family table) |
| 4 | The head never meets the bar | face and neck at least 3 cm from the bar at 41 moments | GEN (FIGURE-V3 2.6, the head clearance for pulls); KB `acute-variables.js` lat_pulldown (the bar passes in front of the face) |
| 5 | No kipping | hip and knee angles each change by less than 5° over the repetition | GEN |
| 6 | No swing | the body's centre of mass (Winter's segment table) within 2 cm of the bar's vertical at 41 moments; the trunk's lean back grows steadily (never rocks) and stays at most 25° | GEN (a body hanging still has its centre of mass under its hands); LIB ("the upper torso should remain stationary … only the arms should move"; "torso back around 30 degrees") |
| 7 | Spine neutral, neck in line: no arching the low back, no craning the chin | `spine:"neutral"`; neck within 10° of the chest's line | KB MOVEMENT_FAULTS pull_low_back_arch, pull_head_forward |
| 8 | Elbows down to the sides, inside their range | upper arm within 20° of the trunk's plane; elbow bend never past 145° | GEN (FIGURE-V3 2.3: "elbow path in the plane of the trunk"; 2.0 limits) |
| 9 | Controlled lowering, a held top | lowering at least 1.5 × the lift; a hold of at least 0.5 s at the top | LIB ("after a second on the contracted position … slowly lower"); KB `acute-variables.js` SAFETY breathing |
| 10 | Overhand grip a little wider than the shoulders | palms face away; hand spacing 1.3–1.8 × shoulder-joint spacing | LIB (palms forward; medium to wide grip) |
| — | Hands do not slip | audit: slide passes (hands move under 2 mm on the bar) | GEN (FIGURE-V3 2.0) |

## Joints, bottom → top (as the record measures them)

| | Hang (u = 0) | Blades set (u = 0.15) | Middle (u = 0.5) | Top (u = 1) |
|---|---|---|---|---|
| Elbow bend | 10° | 10° | 82° | 139° |
| Shoulder blades (the engine's shrug) | −4° (engaged) | −16° (down) | −16° | −16° |
| Chin relative to the bar's centre | −54 cm | −50 cm | −34 cm | +4 cm |
| Trunk back from upright | 2° | 3° | 10° | 22° |
| Hip flexion / knee bend | 21° / 16° | 21° / 16° | 22° / 16° | 22° / 16° |
| Centre of mass from the bar's vertical | 0.1 cm | 0.1 cm | 0.2 cm | 0.3 cm |
| Feet above the floor (lowest point) | 12 cm | — | 36 cm | 86 cm |

## What the figure must show

- A still hang with long arms, then the shoulders dropping away from the ears before the
  elbows bend.
- Elbows driving down to the sides; the chest rising to the bar; the chin clearing it.
- The face passing behind the bar with room to spare.
- Legs quiet: no kick, no swing; the body turning back a little as one piece.
- A held top, a slow lowering to a full hang.

## What it must never show

- Kipping or swinging the legs; the body rocking forward and back.
- Shoulders shrugged to the ears at the bottom or at the top.
- A half repetition: elbows stopping bent at the bottom, or the chin short of the bar.
- The chin or face hitting the bar; the head craning forward to "get the chin over".
- An arched low back.

## What the camera must show

Behind and to the left (yaw 118): the back, the shoulder blades' drop and the elbows'
path. The opposite view (front and to the right) shows the chin and face against the
bar. A pure side view is blocked by the frame's upright, which stands in the bar's line.

## What this body and engine forced

- **The trunk leans back 22° at the top.** Hanging upright, this body needs about 160° of
  elbow bend to bring the chin over the bar (beyond the 145° limit) and its face passes
  through the bar. Leaning back as it rises, with the centre of mass kept under the bar,
  lets the face pass 4.4 cm behind it and finishes the elbows at 139°. The library's own
  instructions ask for the torso back "around 30 degrees", so this agrees with the
  source; the family table's "no trunk swing" is met because the lean grows steadily
  and the centre of mass never leaves the bar's vertical.
- **The grip is 74 cm across** (the family's default had been 80 cm). At 60 cm the elbows
  run out of range before the chin clears the bar on this body.
- **The chin clears the top of the bar by 2.3 cm.** More would ask the elbows past 140°.
- **Scapular depression** is the engine's `shrug` on the clavicle (−12° from the hang
  to the set position). It raises the body 4 cm with straight arms. A real lifter's
  blades also tilt and rotate; the engine moves the clavicle only.
- An extra key halfway through the blades' drop keeps the spline from dropping the
  shoulders faster than the body rises (which had pulled the hands 4–6 mm along the
  bar).

## Exercise-specific tests

`js/data/test/ex/Pullups.test.js`: rules 1–10, numbered as above, plus every audit check
(penetration, contacts, clearances, limits, joint speed, slide), plus the gate.

## Review

**Ready for owner review — 2026-11-12.** Not marked `checked`.

Pictures (not in the repository): `review/Pullups/` in the session's scratch folder:
`cam-u0/u0.5/u1.png` (the record's view), `opp-u0/u0.5/u1.png` (the opposite side),
`strip-8.png` (eight moments), `rep.gif` (one repetition, 3 s).

What to look at:
1. The top (`opp-u1`, `cam-u1`): chin over the bar, face behind it, and whether a 22°
   lean back with the legs a little forward is the strict pull-up you want taught.
2. The first two frames of `strip-8`: the shoulders drop before the elbows bend.
3. The hang (`opp-u0`): arms long, shoulders not shrugged, feet clear of the floor.

```
Reviewed:  [ ] stills beside photos at start / middle / top
           [ ] played at 0.5× for a whole repetition, from two angles
           [ ] every rule above read against the picture
```

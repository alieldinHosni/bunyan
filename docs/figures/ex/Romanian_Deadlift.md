# Romanian Deadlift — exercise dossier

`docs/FIGURE-V3.md` 2.8. Library id `Romanian_Deadlift`. Written before the record was
touched; the record (`js/data/mannequin/moves.js`, `pull()` with `kind:"rdl"`) and the
test (`js/data/test/ex/Romanian_Deadlift.test.js`) are written from it.

Sources, by tag: **LIB** the library's entry (`exercises.json`: m Hamstrings; x Calves,
Glutes, Back; Barbell; Intermediate) and its instructions (`instructions.json`);
**KB** the app's knowledge base (`js/knowledge/`), named where used; **GEN** general
biomechanics. No textbook prose is used.

## Technique sheet

```
Exercise:        Romanian Deadlift (barbell)
Family:          hinge (the pull model shared with Barbell Deadlift)
Plane:           sagittal; view from the side and a little in front (yaw 64, pitch 9)
Equipment:       Olympic barbell, plates; nothing else
Contacts:        both hands on the bar (overhand, a little wider than the shoulders);
                 both feet flat on the floor; the bar against the front of the thighs
Setup (u = 1):   standing tall with the bar at the tops of the thighs; arms long; knees
                 soft (about 17°); feet about hip width; spine neutral; head in line
Movement:        the hips travel back and the trunk tips forward as one piece about the
                 hips; the knees keep their soft bend; the bar slides down the thighs,
                 staying over the middle of the foot
Bottom (u = 0):  where the hips stop: hip flexion about 85°, the bar a few cm above the
                 knee; back still neutral; then the hips drive forward to stand
Order:           none: the hips do the work, the knees hold
Spine / neck:    neutral / in line
Shoulder blade:  set (chest up), not drawn forward by the bar
Tempo default:   lower 2 s, hold 0.4 s, lift 1.6 s, hold 0.6 s (the record's
                 [lift, hold, lower, rest] = [1.6, .4, 2, .6]); a prescribed tempo
                 replaces it
Roles:           prime: hamstrings, glutes; synergist: lower back (erectors, as the
                 library's "Back", refined to "Lower back"); stabiliser: calves
                 (library x), forearms not named by the library and not shown
```

## Differs from its family in

The deadlift starts from the floor with the knees well bent and finishes standing; the
Romanian deadlift starts standing, never puts the bar down, and keeps the knees at one
soft bend: the hips alone move the bar. Depth is set by the hamstrings' length, not by
the floor.

## Its own safety rules

| # | Rule | Measured as (test) | Source |
|---|------|--------------------|--------|
| 1 | Spine neutral throughout: the back never rounds, the low back never arches | `spine:"neutral"` (the five spine bones turn as one piece); neck within 10° of the chest's line at 41 moments | KB `acute-variables.js` EXERCISES deadlift ("a neutral — not rounded — spine"); KB `imbalances.js` MOVEMENT_FAULTS (low back arches); LIB ("back straight") |
| 2 | Bar on the thighs: it slides down the legs, never swings away | bar within 1 cm of the thighs/shins and never into them by more than 3 mm, 41 moments | GEN (the load's lever arm about the low back stays shortest); LIB |
| 3 | Bar over the middle of the foot | bar's x within ±2 cm of mid-foot, 41 moments | GEN |
| 4 | Knees soft and constant: not locked, not squatting | knee bend 12–25° at every moment, its range under 10°; shins within 8° of upright | GEN (FIGURE-V3 2.3 family table); LIB ("bend the knees slightly and keep the shins vertical", "only slightly bending the knees, unlike when squatting") |
| 5 | Hips back: a hinge, not a squat | hip flexion grows by at least 55° while the knees change under 10°; at the bottom the hips are behind the heels | GEN; LIB ("lower the bar by pushing the hips back") |
| 6 | Stop where the hips stop, without rounding | hip flexion at the bottom 80–90°; the bar no lower than 4 cm below the knee joint | GEN (passive hamstring length: a straight-leg raise of about 80°, a few more with the knees soft); KB `acute-variables.js` dumbbell_chest_press (depth "only as low as is controlled without compensating", the general principle) |
| 7 | Arms long: the bar hangs, the arms do not pull | elbow bend under 10° throughout | GEN; LIB ("keeping your back and arms completely straight") |
| 8 | Stand tall at the top, no lean back | trunk within 5° of upright at u = 1, never past upright backward | GEN; KB MOVEMENT_FAULTS (low back arches) |
| 9 | Balance: the body over the feet | body's centre of mass (Winter's segment table) within the feet's outline, 3 cm from either end, 41 moments; with the bar over mid-foot this holds for any load | GEN (FIGURE-V3 2.0 "balance is real") |
| 10 | Feet flat and planted | audit: feet clearance passes; slide passes | KB `core.js` checkpoints (feet); GEN |
| 11 | Controlled lowering | lowering time at least the lifting time | KB `acute-variables.js` SAFETY breathing (in on the lowering, out on the lift); LIB ("should not be fast but steady and under control") |
| 12 | Grip a little wider than the shoulders, hands outside the thighs | hand spacing 1.0–1.5 × shoulder-joint spacing; the hands do not touch the thighs (audit penetration) | LIB |

## Joints, start → bottom (as the record measures them)

| Joint | Top (u = 1) | Middle (u = 0.5) | Bottom (u = 0) |
|---|---|---|---|
| Knee bend | 17° | 23° | 18° |
| Hip flexion | 23° (the soft knees put the thigh ahead of upright) | 56° | 85° |
| Trunk from upright | 0° | 31° | 63° |
| Shin from upright | 4° | 4° | 1° |
| Elbow bend | 4° | 4° | 4° |
| Neck to chest line | 4° | 4° | 4° |
| Bar height (knee joint 0.54 m) | 0.84 m | 0.73 m | 0.58 m |
| Hips behind the ankles | 7 cm | 11 cm | 15 cm (the heels are 8 cm behind) |
| Body's centre of mass, x (mid-foot +6 cm) | −3 cm | +4 cm | +9 cm |

## What the figure must show

- The trunk as one straight piece from the pelvis to the head, at every moment.
- The bar touching the thighs on the way down and up, its line straight up and down.
- The hips moving back as the trunk tips; the knees held at one soft bend.
- The bottom with the back still flat, the bar a little above the knee.
- Standing tall at the top, hips through, without leaning back.

## What it must never show

- A rounded back or a dropped head; the chin poking up.
- The bar drifting forward off the legs.
- The knees bending into a squat, or locking straight.
- Chasing depth past where the hips stop (the bar to the floor).
- Leaning back at the top; heels lifting.

## What the camera must show

Side and a little in front (yaw 64, pitch 9), so the back's line, the bar on the thighs
and the hands are visible; from the opposite side the near plate no longer hides the
legs, so the knee angle reads there.

## What this body and engine forced

- The bottom is defined by hip flexion (85°), not by the bar's height. The family table's
  "bar just below the knee" would take about 97° of hip flexion on this body (its arms
  are short against its legs), more than most people's hamstrings allow with soft knees;
  the figure stops where the hips stop, and the bar ends about 3 cm above the knee joint.
  The previous record asked for "4 cm below the knees", but its solver never moved from
  its first guess (the path constraints set the pelvis, so the equations it solved had
  no slope); it stopped at a trunk pitch of 62° with the bar 4.5 cm above the knee. Now
  the pitch is found by stepping on hip flexion, which converges in five steps.
- The knees come out of where the path constraints put the body, so they swell from 17°
  to 23° in the middle of the repetition (the blend between two keys); the range stays
  under 10°.
- The arms hang about 20° behind upright at the bottom: the bar is held on the thighs
  over mid-foot while the shoulders are ahead of it. This is what a real lifter does
  (the lats hold the bar in), not a fault.

## Exercise-specific tests

`js/data/test/ex/Romanian_Deadlift.test.js`: rules 1–12, numbered as above, plus every
audit check (penetration, contacts, clearances, limits, joint speed, slide), plus the gate
(the record is not reachable through `recordFor`).

## Review

**Ready for owner review — 2026-11-12.** Not marked `checked`.

Pictures (not in the repository): `review/Romanian_Deadlift/` in the session's scratch
folder: `cam-u0/u0.5/u1.png` (the record's view), `opp-u0/u0.5/u1.png` (the opposite
side), `strip-8.png` (eight moments), `rep.gif` (one repetition, 3 s).

What to look at:
1. The bottom (`cam-u0`, `opp-u0`): is the back flat from pelvis to head, and is the depth
   (hips at 85°, bar a little above the knee) where you want the figure to stop?
2. The middle (`opp-u0.5`): knees soft, not squatting; bar on the thighs.
3. The top (`cam-u1`): standing tall, not leaning back, knees soft.

```
Reviewed:  [ ] stills beside photos at start / middle / bottom
           [ ] played at 0.5× for a whole repetition, from two angles
           [ ] every rule above read against the picture
```

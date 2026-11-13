# The 3D figure: safety audit

Written by `tools/figure-audit.mjs` (app version 265) from `js/data/mannequin/collide.js`. Do not edit by hand; run the tool again.

Every record the families' table (`moves.js` TABLE) and the hand-written records (`records.js` RECORDS) hold, checked at 41 moments of its repetition (u = 0 is the start, the stretched position; u = 1 the end of the lift). This is the work list for the per-exercise reviews of `docs/FIGURE-V3.md` 2.8. **No figure is shown in the app until its exercise has been reviewed and marked checked** (`records.js` recordFor), whatever this audit says: passing every check here is necessary, not enough.

What each check is (thresholds and how contacts are derived are written at the top of `collide.js`):

- **Penetration**: a part of the body through a solid of the equipment, the floor, or another part of the body that is not its neighbour, by more than 3 mm (what a hand holds, and a part resting on a pad or on the body up to 4 cm, are let off).
- **Contacts**: a contact that should touch and does not (a gap over 5 mm): a hand off what it holds, a part off what it rests on at both ends of the movement, a declared contact.
- **Clearances** (2.6), for the families they apply to: *bench*: the weight never more than 5 cm past the shoulder line toward the head, over the chest at the bottom with the forearms within 10° of upright; *head*: a bar or handle at least 5 cm from the head (overhead presses, pulldowns, skull crushers); *feet*: both feet flat on the floor (standing lifts). `n/a`: no general clearance applies; its own rules belong in its dossier.
- **Joint speed** and **Slide** (2.0, no teleporting and no sliding; reported, not yet part of *pass every check* so the totals stay comparable with earlier audits): the fastest any joint moves between two frames at 60 a second over one repetition at the record's tempo, at most 4 m/s; a planted foot (resting on a support that does not move, at both ends) or a hand gripping something that does not move may shift at most 2 mm over the repetition.
- **Limits** (2.0): elbow ≤ 145°, knee ≤ 140°, neither bending sideways or backwards; the forearm turned no further than palm-up or palm-down; the wrist within 70° either way and 40° to the side, not turned on the forearm by more than 25°; the neck within 10° of the chest's line.

Body parts: `head`, `neck`, `trunk.upper`, `trunk.lower`, `pelvis`, and per side (`.l` the figure's left, `.r` its right) `upperarm`, `forearm`, `hand`, `thigh`, `shin`, `foot`. A solid is named by its piece of equipment and its shape (`barbell:capsule` is the bar, `barbell:cylinder` a plate).

## Totals

| | Records |
| --- | --- |
| Checked (shown in the app) | 0 |
| Audited | 211 |
| Pass every check | 17 |
| Fail penetration | 151 |
| Fail contacts | 61 |
| Fail clearances | 49 of the 122 a clearance applies to |
| Fail limits | 144 |
| Fail joint speed (reported) | 8 |
| Fail slide (reported) | 37 |

## The ten deepest penetrations

| # | Exercise | What | Depth | At |
| --- | --- | --- | --- | --- |
| 1 | Barbell Hip Thrust | trunk.upper through bench:box | 16.1 cm | u=0.275 |
| 2 | Preacher Hammer Dumbbell Curl | trunk.upper through preacher:box | 14.6 cm | u=1 |
| 3 | Two-Arm Dumbbell Preacher Curl | trunk.upper through preacher:box | 14.6 cm | u=1 |
| 4 | Preacher Curl | trunk.upper through preacher:box | 14.6 cm | u=1 |
| 5 | Reverse Barbell Preacher Curls | trunk.upper through preacher:box | 14.5 cm | u=1 |
| 6 | Hyperextensions (Back Extensions) | trunk.lower through soft:box | 13.7 cm | u=0 |
| 7 | One Arm Dumbbell Preacher Curl | trunk.upper through preacher:box | 13.5 cm | u=1 |
| 8 | Arnold Dumbbell Press | pelvis through adjBench:box | 13.2 cm | u=0 |
| 9 | Dumbbell Shoulder Press | pelvis through adjBench:box | 13.2 cm | u=0 |
| 10 | Seated Barbell Military Press | pelvis through adjBench:box | 13.2 cm | u=0 |

## By exercise

Failing first (most checks failed, then the deepest penetration). Each cell gives how many distinct faults the check found and the worst of them; every fault is listed in the next section.

| Exercise | Family | Penetration | Contacts | Clearances | Limits | Joint speed | Slide |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Dumbbell Floor Press | benchPress | **FAIL** 9: upperarm.l through floor 8.2 cm at u=0.025 | **FAIL** 2: trunk.upper off floor by 4.0 cm at u=0 | **FAIL** 2: forearms upright under the weight at the bottom (forearm.l), 50° from upright (limit 10°) at u=0 | **FAIL** 4: wrist.l bent sideways past its range -65° (limit ±40°) at u=0.55 | pass 1.1 m/s (el.l) | pass |
| Incline Cable Chest Press | benchPress | **FAIL** 4: upperarm.l through tube:capsule 5.2 cm at u=0.375 | **FAIL** 2: trunk.upper off bench by 5.0 cm at u=0 | **FAIL** 2: forearms upright under the weight at the bottom (forearm.l), 83° from upright (limit 10°) at u=0 | **FAIL** 6: wrist.l bent sideways past its range -70° (limit ±40°) at u=0.6 | pass 1.6 m/s (el.l) | pass |
| Hammer Grip Incline DB Bench Press | benchPress | **FAIL** 2: upperarm.l through dumbbell:cylinder 5.0 cm at u=0 | **FAIL** 2: trunk.upper off bench by 5.0 cm at u=0 | **FAIL** 2: forearms upright under the weight at the bottom (forearm.l), 50° from upright (limit 10°) at u=0 | **FAIL** 6: wrist.l bent sideways past its range -74° (limit ±40°) at u=0.775 | pass 1.8 m/s (el.l) | pass |
| Incline Dumbbell Bench With Palms Facing In | benchPress | **FAIL** 2: upperarm.l through dumbbell:cylinder 5.0 cm at u=0 | **FAIL** 2: trunk.upper off bench by 5.0 cm at u=0 | **FAIL** 2: forearms upright under the weight at the bottom (forearm.l), 50° from upright (limit 10°) at u=0 | **FAIL** 6: wrist.l bent sideways past its range -74° (limit ±40°) at u=0.775 | pass 1.8 m/s (el.l) | pass |
| Dumbbell Bench Press with Neutral Grip | benchPress | **FAIL** 2: upperarm.l through dumbbell:cylinder 5.0 cm at u=0 | **FAIL** 2: trunk.upper off bench by 3.0 cm at u=0 | **FAIL** 2: forearms upright under the weight at the bottom (forearm.l), 24° from upright (limit 10°) at u=0 | **FAIL** 2: elbow.l bent past its range 153° (limit ±145°) at u=0.075 | pass 1.2 m/s (el.l) | pass |
| Dumbbell Bench Press | benchPress | **FAIL** 5: trunk.upper through dumbbell:cylinder 4.1 cm at u=0.1 | **FAIL** 2: trunk.upper off bench by 3.0 cm at u=0 | **FAIL** 2: forearms upright under the weight at the bottom (forearm.l), 50° from upright (limit 10°) at u=0 | **FAIL** 4: wrist.l bent sideways past its range -65° (limit ±40°) at u=0.55 | pass 1.1 m/s (el.l) | pass |
| Decline Dumbbell Bench Press | benchPress | **FAIL** 5: trunk.upper through dumbbell:cylinder 4.1 cm at u=0.1 | **FAIL** 4: trunk.upper off bench by 4.0 cm at u=0 | **FAIL** 2: forearms upright under the weight at the bottom (forearm.l), 36° from upright (limit 10°) at u=0 | **FAIL** 4: wrist.l bent sideways past its range -65° (limit ±40°) at u=0.5 | pass 1.0 m/s (el.l) | pass |
| Preacher Hammer Dumbbell Curl | curl | **FAIL** 11: trunk.upper through preacher:box 14.6 cm at u=1 | **FAIL** 4: forearm.l off preacher:box by 1.5 cm at u=0.6 | n/a | **FAIL** 1: neck out of line with the spine 12° (limit ±10°) at u=0 | pass 0.7 m/s (wr.l) | pass |
| Two-Arm Dumbbell Preacher Curl | curl | **FAIL** 7: trunk.upper through preacher:box 14.6 cm at u=1 | **FAIL** 4: forearm.l off preacher:box by 1.5 cm at u=0.6 | n/a | **FAIL** 1: neck out of line with the spine 12° (limit ±10°) at u=0 | pass 0.7 m/s (wr.l) | pass |
| Reverse Barbell Preacher Curls | curl | **FAIL** 3: trunk.upper through preacher:box 14.5 cm at u=1 | **FAIL** 4: forearm.l off preacher:box by 1.4 cm at u=0.575 | pass (feet) | **FAIL** 3: forearm.l turned past palm-up or palm-down 216° (limit -5° to 185°) at u=0 | pass 0.7 m/s (wr.l) | pass |
| Hyperextensions (Back Extensions) | hyper | **FAIL** 20: trunk.lower through soft:box 13.7 cm at u=0 | **FAIL** 4: hand.l off trunk.upper by 99999999998.4 cm at u=0 | n/a | **FAIL** 2: forearm.l turned past palm-up or palm-down -36° (limit -5° to 185°) at u=0 | pass 2.0 m/s (head) | pass |
| One Arm Dumbbell Preacher Curl | curl | **FAIL** 5: trunk.upper through preacher:box 13.5 cm at u=1 | **FAIL** 2: forearm.l off preacher:box by 1.5 cm at u=0.675 | n/a | **FAIL** 1: neck out of line with the spine 12° (limit ±10°) at u=0 | pass 0.7 m/s (wr.l) | pass |
| Arnold Dumbbell Press | press | **FAIL** 8: pelvis through adjBench:box 13.2 cm at u=0 | pass | **FAIL** 2: bar or handle at least 5 cm from the head (dumbbell:cylinder), 8.7 cm into the head (wanted ≥ 5.0 cm) at u=0.35 | **FAIL** 4: forearm.l turned past palm-up or palm-down 267° (limit -5° to 185°) at u=0.6 | pass 1.4 m/s (el.l) | pass |
| Dumbbell Shoulder Press | press | **FAIL** 10: pelvis through adjBench:box 13.2 cm at u=0 | pass | **FAIL** 1: bar or handle at least 5 cm from the head (dumbbell:cylinder), 0.1 cm from the head (wanted ≥ 5.0 cm) at u=0.675 | **FAIL** 4: wrist.l bent sideways past its range -68° (limit ±40°) at u=0.6 | pass 1.8 m/s (el.l) | pass |
| Seated Barbell Military Press | press | **FAIL** 3: pelvis through adjBench:box 13.2 cm at u=0 | pass | **FAIL** 1: bar or handle at least 5 cm from the head (barbell:capsule), 3.3 cm from the head (wanted ≥ 5.0 cm) at u=0.55 | **FAIL** 2: elbow.l bent past its range 158° (limit ±145°) at u=0.025 | pass 1.4 m/s (el.l) | pass |
| Seated Dumbbell Press | press | **FAIL** 10: pelvis through adjBench:box 13.2 cm at u=0 | pass | **FAIL** 1: bar or handle at least 5 cm from the head (dumbbell:cylinder), 0.1 cm from the head (wanted ≥ 5.0 cm) at u=0.675 | **FAIL** 4: wrist.l bent sideways past its range -68° (limit ±40°) at u=0.6 | pass 1.8 m/s (el.l) | pass |
| Seated Triceps Press | triceps | **FAIL** 7: pelvis through adjBench:box 13.2 cm at u=0 | **FAIL** 2: hand.l off what it holds by 1.6 cm at u=0.075 | n/a | **FAIL** 4: forearm.l turned past palm-up or palm-down -22° (limit -5° to 185°) at u=1 | pass 1.0 m/s (wr.l) | pass |
| Smith Machine Overhead Shoulder Press | press | **FAIL** 8: pelvis through adjBench:box 13.2 cm at u=0 | pass | **FAIL** 1: bar or handle at least 5 cm from the head (barbell:capsule), 1.8 cm into the head (wanted ≥ 5.0 cm) at u=0.375 | **FAIL** 4: elbow.l bent past its range 163° (limit ±145°) at u=0.075 | pass 2.0 m/s (el.l) | pass |
| Floor Press | benchPress | **FAIL** 4: upperarm.l through floor 10.9 cm at u=0 | **FAIL** 2: trunk.upper off floor by 4.0 cm at u=0 | **FAIL** 2: forearms upright under the weight at the bottom (forearm.l), 17° from upright (limit 10°) at u=0 | pass | pass 0.7 m/s (el.l) | pass |
| Bodyweight Walking Lunge | lunge | **FAIL** 1: foot.r through floor 10.3 cm at u=0 | **FAIL** 1: foot.l off floor by 6.3 cm at u=0.5 | n/a | **FAIL** 2: wrist.l bent sideways past its range -67° (limit ±40°) at u=1 | pass 0.9 m/s (kn.r) | **FAIL** 2: foot.r moves 629 mm by u=1 |
| Tricep Dumbbell Kickback | triceps | **FAIL** 11: thigh.l through dumbbell:cylinder 9.6 cm at u=0.075 | **FAIL** 1: forearm.l off thigh.l by 99999999995.8 cm at u=0 | n/a | **FAIL** 5: forearm.r turned past palm-up or palm-down 200° (limit -5° to 185°) at u=0 | pass 0.5 m/s (wr.l) | pass |
| Dumbbell One-Arm Shoulder Press | press | **FAIL** 5: upperarm.l through dumbbell:cylinder 9.3 cm at u=0 | pass | **FAIL** 1: bar or handle at least 5 cm from the head (dumbbell:cylinder), 0.1 cm from the head (wanted ≥ 5.0 cm) at u=0.675 | **FAIL** 2: wrist.l bent sideways past its range -68° (limit ±40°) at u=0.6 | pass 1.8 m/s (el.l) | pass |
| Standing Alternating Dumbbell Press | press | **FAIL** 6: upperarm.l through dumbbell:cylinder 9.3 cm at u=0 | pass | **FAIL** 1: bar or handle at least 5 cm from the head (dumbbell:cylinder), 0.1 cm from the head (wanted ≥ 5.0 cm) at u=0.675 | **FAIL** 3: wrist.l bent sideways past its range -68° (limit ±40°) at u=0.6 | pass 1.8 m/s (el.l) | pass |
| Standing Dumbbell Press | press | **FAIL** 7: upperarm.l through dumbbell:cylinder 9.3 cm at u=0 | pass | **FAIL** 1: bar or handle at least 5 cm from the head (dumbbell:cylinder), 0.1 cm from the head (wanted ≥ 5.0 cm) at u=0.675 | **FAIL** 4: wrist.l bent sideways past its range -68° (limit ±40°) at u=0.6 | pass 1.8 m/s (el.l) | pass |
| Incline Push-Up Medium | pushup | **FAIL** 8: trunk.upper through bar:box 9.3 cm at u=0.2 | **FAIL** 2: hand.l off what it holds by 2.0 cm at u=1 | n/a | **FAIL** 9: forearm.l turned past palm-up or palm-down 269° (limit -5° to 185°) at u=0.925 | pass 0.7 m/s (kn.l) | **FAIL** 4: foot.l moves 339 mm by u=1 |
| Incline Push-Up Close-Grip | pushup | **FAIL** 10: trunk.upper through bar:box 9.3 cm at u=0.2 | **FAIL** 2: hand.l off what it holds by 2.0 cm at u=1 | n/a | **FAIL** 9: forearm.l turned past palm-up or palm-down 258° (limit -5° to 185°) at u=1 | pass 0.8 m/s (kn.l) | **FAIL** 4: foot.l moves 337 mm by u=1 |
| Incline Push-Up Wide | pushup | **FAIL** 8: trunk.upper through bar:box 9.2 cm at u=0.125 | **FAIL** 2: hand.l off what it holds by 2.0 cm at u=1 | n/a | **FAIL** 7: forearm.l turned past palm-up or palm-down 270° (limit -5° to 185°) at u=0.525 | pass 0.6 m/s (kn.l) | **FAIL** 4: foot.l moves 290 mm by u=1 |
| Push-Up Wide | pushup | **FAIL** 6: foot.l through floor 8.3 cm at u=0 | **FAIL** 2: forearm.l off floor by 0.9 cm at u=0.425 | n/a | **FAIL** 3: wrist.l bent back past its range -83° (limit ±70°) at u=1 | pass 0.7 m/s (head) | **FAIL** 2: foot.l moves 20 mm by u=1 |
| Reverse Flyes | raise | **FAIL** 2: thigh.l through adjBench:box 7.5 cm at u=0 | **FAIL** 1: head off adjBench:box by 1.0 cm at u=0 | pass (feet) | **FAIL** 3: forearm.l turned past palm-up or palm-down -89° (limit -5° to 185°) at u=0 | pass 1.2 m/s (wr.l) | pass |
| Standing Palms-In Dumbbell Press | press | **FAIL** 9: upperarm.l through dumbbell:cylinder 7.1 cm at u=0 | pass | **FAIL** 1: bar or handle at least 5 cm from the head (dumbbell:cylinder), 2.5 cm from the head (wanted ≥ 5.0 cm) at u=0.5 | **FAIL** 4: wrist.l bent sideways past its range -56° (limit ±40°) at u=0.6 | pass 1.4 m/s (el.l) | pass |
| Stiff-Legged Dumbbell Deadlift | hinge | **FAIL** 3: thigh.l through dumbbell:cylinder 7.0 cm at u=0.875 | pass | **FAIL** 2: feet flat on the floor (foot.l ball off the floor), 4.2 cm (limit 0.5 cm) at u=0 | **FAIL** 1: neck out of line with the spine 35° (limit ±10°) at u=0 | pass 1.1 m/s (head) | pass |
| Front Barbell Squat | squat | **FAIL** 6: upperarm.l through barbell:capsule 6.8 cm at u=0.925 | **FAIL** 4: hand.l off trunk.upper by 99999999998.4 cm at u=0 | n/a | **FAIL** 3: wrist.l bent sideways past its range -44° (limit ±40°) at u=0 | pass 0.7 m/s (wr.l) | **FAIL** 2: foot.l moves 9 mm by u=0.85 |
| Sit-Up | crunch | **FAIL** 8: trunk.lower through thigh.r 6.2 cm at u=1 | **FAIL** 5: hand.l off head by 99999999998.4 cm at u=0 | n/a | **FAIL** 2: forearm.l turned past palm-up or palm-down 262° (limit -5° to 185°) at u=1 | pass 1.7 m/s (el.l) | pass |
| Bench Dips | benchDip | **FAIL** 4: foot.l through block:box 5.8 cm at u=0 | **FAIL** 2: hand.l off bench:box by 0.6 cm at u=0 | n/a | **FAIL** 4: forearm.l turned past palm-up or palm-down 203° (limit -5° to 185°) at u=0 | pass 0.4 m/s (hip.l) | **FAIL** 2: foot.l moves 39 mm by u=1 |
| Lying Leg Curls | legMachine | **FAIL** 4: trunk.upper through soft:box 5.4 cm at u=0 | **FAIL** 2: thigh.l off soft:box by 0.6 cm at u=0.025 | n/a | **FAIL** 5: wrist.l bent sideways past its range -62° (limit ±40°) at u=0 | pass 1.4 m/s (an.l) | pass |
| Wide-Grip Pulldown Behind The Neck | pulldown | **FAIL** 5: pelvis through seat:box 4.1 cm at u=1 | pass | **FAIL** 1: bar or handle at least 5 cm from the head (tube:capsule), 3.8 cm into the head (wanted ≥ 5.0 cm) at u=0.475 | **FAIL** 3: neck out of line with the spine 22° (limit ±10°) at u=1 | pass 0.9 m/s (el.l) | pass |
| Standing Cable Chest Press | cablePress | **FAIL** 4: forearm.l through cable:capsule 3.0 cm at u=0.7 | pass | **FAIL** 2: feet flat on the floor (foot.l ball off the floor), 3.1 cm (limit 0.5 cm) at u=0 | **FAIL** 4: wrist.l bent sideways past its range -62° (limit ±40°) at u=0.5 | pass 1.5 m/s (el.l) | pass |
| Bodyweight Squat | squat | **FAIL** 1: hand.l through hand.r 3.0 cm at u=0.975 | **FAIL** 2: hand.l off head by 99999999998.4 cm at u=0 | n/a | **FAIL** 1: neck out of line with the spine 14° (limit ±10°) at u=0 | pass 0.7 m/s (head) | **FAIL** 2: foot.l moves 9 mm by u=0.85 |
| Goblet Squat | squat | **FAIL** 3: trunk.lower through kettlebell:sphere 2.9 cm at u=1 | **FAIL** 4: hand.l off trunk.upper by 99999999998.4 cm at u=0 | n/a | **FAIL** 11: forearm.l turned past palm-up or palm-down 208° (limit -5° to 185°) at u=0 | pass 0.7 m/s (wr.l) | **FAIL** 2: foot.l moves 9 mm by u=0.85 |
| Crunches | crunch | **FAIL** 4: hand.l through hand.r 2.5 cm at u=0.65 | **FAIL** 5: hand.l off head by 99999999998.4 cm at u=0 | n/a | **FAIL** 2: forearm.l turned past palm-up or palm-down 262° (limit -5° to 185°) at u=1 | pass 0.6 m/s (el.l) | pass |
| EZ-Bar Skullcrusher | triceps | **FAIL** 3: hand.l through barbell:capsule 2.4 cm at u=0 | **FAIL** 2: trunk.upper off bench by 3.0 cm at u=0 | **FAIL** 1: bar or handle at least 5 cm from the head (barbell:capsule), 0.7 cm into the head (wanted ≥ 5.0 cm) at u=0 | pass | **FAIL** 8.2 m/s (el.l) | pass |
| Lying Triceps Press | triceps | **FAIL** 3: hand.l through barbell:capsule 2.4 cm at u=0 | **FAIL** 2: trunk.upper off bench by 3.0 cm at u=0 | **FAIL** 1: bar or handle at least 5 cm from the head (barbell:capsule), 0.7 cm into the head (wanted ≥ 5.0 cm) at u=0 | pass | **FAIL** 8.2 m/s (el.l) | pass |
| V-Bar Pulldown | pulldown | **FAIL** 4: trunk.upper through hand.l 2.2 cm at u=1 | pass | **FAIL** 1: bar or handle at least 5 cm from the head (tube:capsule), 4.2 cm from the head (wanted ≥ 5.0 cm) at u=0.6 | **FAIL** 1: neck out of line with the spine 14° (limit ±10°) at u=0 | pass 1.2 m/s (el.l) | pass |
| Wide-Grip Decline Barbell Bench Press | benchPress | **FAIL** 2: foot.l through declineBench:cylinder 1.5 cm at u=0 | **FAIL** 4: trunk.upper off bench by 4.0 cm at u=0 | **FAIL** 2: forearms upright under the weight at the bottom (forearm.l), 19° from upright (limit 10°) at u=0 | pass | pass 0.6 m/s (wr.l) | pass |
| Cable Lying Triceps Extension | triceps | **FAIL** 1: head through grip:capsule 1.0 cm at u=0 | **FAIL** 2: trunk.upper off bench by 3.0 cm at u=0 | **FAIL** 1: bar or handle at least 5 cm from the head (grip:capsule), 1.0 cm into the head (wanted ≥ 5.0 cm) at u=0 | pass | **FAIL** 8.2 m/s (el.l) | pass |
| Low Cable Triceps Extension | triceps | **FAIL** 1: head through grip:capsule 1.0 cm at u=0 | **FAIL** 2: trunk.upper off bench by 3.0 cm at u=0 | **FAIL** 1: bar or handle at least 5 cm from the head (grip:capsule), 1.0 cm into the head (wanted ≥ 5.0 cm) at u=0 | pass | **FAIL** 8.2 m/s (el.l) | pass |
| Crunch - Hands Overhead | crunch | **FAIL** 2: foot.l through mat:box 0.9 cm at u=0 | **FAIL** 1: pelvis off mat:box by 1.0 cm at u=0 | n/a | **FAIL** 1: neck out of line with the spine 16° (limit ±10°) at u=1 | pass 0.8 m/s (wr.l) | pass |
| Close-Grip Front Lat Pulldown | pulldown | **FAIL** 2: thigh.l through tube:capsule 0.7 cm at u=1 | pass | **FAIL** 1: bar or handle at least 5 cm from the head (tube:capsule), 4.1 cm from the head (wanted ≥ 5.0 cm) at u=0.6 | **FAIL** 9: forearm.l turned past palm-up or palm-down 197° (limit -5° to 185°) at u=1 | pass 2.6 m/s (el.l) | pass |
| Underhand Cable Pulldowns | pulldown | **FAIL** 2: thigh.l through tube:capsule 0.7 cm at u=1 | pass | **FAIL** 1: bar or handle at least 5 cm from the head (tube:capsule), 4.1 cm from the head (wanted ≥ 5.0 cm) at u=0.6 | **FAIL** 11: forearm.l turned past palm-up or palm-down -50° (limit -5° to 185°) at u=0.4 | pass 1.7 m/s (el.l) | pass |
| Wide-Grip Lat Pulldown | pulldown | **FAIL** 2: thigh.l through tube:capsule 0.7 cm at u=1 | pass | **FAIL** 1: bar or handle at least 5 cm from the head (tube:capsule), 3.8 cm from the head (wanted ≥ 5.0 cm) at u=0.55 | **FAIL** 1: neck out of line with the spine 14° (limit ±10°) at u=0 | pass 0.9 m/s (el.l) | pass |
| Lying Close-Grip Barbell Triceps Press To Chin | triceps | **FAIL** 1: head through barbell:capsule 0.7 cm at u=0 | **FAIL** 2: trunk.upper off bench by 3.0 cm at u=0 | **FAIL** 1: bar or handle at least 5 cm from the head (barbell:capsule), 0.7 cm into the head (wanted ≥ 5.0 cm) at u=0 | pass | **FAIL** 8.2 m/s (el.l) | pass |
| Cable Rope Rear-Delt Rows | facePull | pass | **FAIL** 1: foot.r off floor by 0.8 cm at u=0 | **FAIL** 1: feet flat on the floor (foot.r ball off the floor), 0.8 cm (limit 0.5 cm) at u=0 | **FAIL** 8: forearm.l turned past palm-up or palm-down 188° (limit -5° to 185°) at u=1 | pass 0.7 m/s (el.l) | pass |
| Close-Grip Barbell Bench Press | benchPress | pass | **FAIL** 2: trunk.upper off bench by 3.0 cm at u=0 | **FAIL** 2: forearms upright under the weight at the bottom (forearm.l), 52° from upright (limit 10°) at u=0 | **FAIL** 6: forearm.l turned past palm-up or palm-down 190° (limit -5° to 185°) at u=0 | pass 0.6 m/s (wr.l) | pass |
| Face Pull | facePull | pass | **FAIL** 1: foot.r off floor by 0.8 cm at u=0 | **FAIL** 1: feet flat on the floor (foot.r ball off the floor), 0.8 cm (limit 0.5 cm) at u=0 | **FAIL** 8: wrist.l bent toward the palm past its range 165° (limit ±70°) at u=0.975 | pass 0.8 m/s (wr.l) | pass |
| Lying Dumbbell Tricep Extension | triceps | pass | **FAIL** 2: trunk.upper off bench by 3.0 cm at u=0 | **FAIL** 1: bar or handle at least 5 cm from the head (dumbbell:cylinder), 3.0 cm from the head (wanted ≥ 5.0 cm) at u=0 | **FAIL** 2: forearm.l turned past palm-up or palm-down -90° (limit -5° to 185°) at u=1 | **FAIL** 8.2 m/s (el.l) | pass |
| Pull Through | pullThrough | pass | **FAIL** 2: foot.l off floor by 0.6 cm at u=1 | **FAIL** 2: feet flat on the floor (foot.l ball off the floor), 0.6 cm (limit 0.5 cm) at u=1 | **FAIL** 1: neck out of line with the spine 28° (limit ±10°) at u=0 | pass 1.1 m/s (head) | **FAIL** 2: foot.l moves 3 mm by u=1 |
| Smith Machine Close-Grip Bench Press | benchPress | pass | **FAIL** 2: trunk.upper off bench by 3.0 cm at u=0 | **FAIL** 2: forearms upright under the weight at the bottom (forearm.l), 52° from upright (limit 10°) at u=0 | **FAIL** 6: forearm.l turned past palm-up or palm-down 190° (limit -5° to 185°) at u=0 | pass 0.6 m/s (wr.l) | pass |
| Barbell Hip Thrust | bridge | **FAIL** 3: trunk.upper through bench:box 16.1 cm at u=0.275 | pass | n/a | **FAIL** 5: wrist.l bent sideways past its range -56° (limit ±40°) at u=1 | pass 0.9 m/s (head) | pass |
| Preacher Curl | curl | **FAIL** 3: trunk.upper through preacher:box 14.6 cm at u=1 | pass | n/a | **FAIL** 3: forearm.l turned past palm-up or palm-down -75° (limit -5° to 185°) at u=0 | pass 0.7 m/s (wr.l) | pass |
| Seated Cable Shoulder Press | press | **FAIL** 9: pelvis through adjBench:box 13.2 cm at u=0 | pass | pass (head) | **FAIL** 4: wrist.l bent sideways past its range -68° (limit ±40°) at u=0.6 | pass 1.8 m/s (el.l) | pass |
| One-Arm Dumbbell Row | row | **FAIL** 11: thigh.l through dumbbell:cylinder 10.7 cm at u=0.925 | pass | n/a | **FAIL** 3: forearm.r turned past palm-up or palm-down 196° (limit -5° to 185°) at u=0 | pass 0.8 m/s (el.l) | pass |
| Standing Dumbbell Upright Row | uprightRow | **FAIL** 15: trunk.upper through dumbbell:cylinder 10.5 cm at u=0.95 | pass | pass (feet) | **FAIL** 8: wrist.l bent sideways past its range -92° (limit ±40°) at u=0.7 | pass 1.7 m/s (el.l) | pass |
| Barbell Lunge | lunge | **FAIL** 1: foot.r through floor 10.3 cm at u=0 | **FAIL** 1: foot.l off floor by 6.3 cm at u=0.5 | n/a | pass | pass 0.9 m/s (kn.r) | **FAIL** 2: foot.r moves 629 mm by u=1 |
| Barbell Walking Lunge | lunge | **FAIL** 1: foot.r through floor 10.3 cm at u=0 | **FAIL** 1: foot.l off floor by 6.3 cm at u=0.5 | n/a | pass | pass 0.9 m/s (kn.r) | **FAIL** 2: foot.r moves 629 mm by u=1 |
| Dumbbell Lunges | lunge | **FAIL** 3: foot.r through floor 10.3 cm at u=0 | **FAIL** 1: foot.l off floor by 6.3 cm at u=0.5 | n/a | pass | pass 0.9 m/s (kn.r) | **FAIL** 2: foot.r moves 629 mm by u=1 |
| Dumbbell Rear Lunge | lunge | **FAIL** 3: foot.r through floor 10.3 cm at u=0 | **FAIL** 1: foot.r off floor by 1.0 cm at u=0.8 | n/a | pass | pass 1.0 m/s (kn.r) | **FAIL** 2: foot.r moves 629 mm by u=1 |
| Standing Dumbbell Reverse Curl | curl | **FAIL** 5: thigh.l through dumbbell:cylinder 10.1 cm at u=0 | pass | pass (feet) | **FAIL** 2: forearm.l turned past palm-up or palm-down 187° (limit -5° to 185°) at u=0.1 | pass 0.9 m/s (wr.l) | pass |
| Standing Bent-Over Two-Arm Dumbbell Triceps Extension | triceps | **FAIL** 6: thigh.l through dumbbell:cylinder 9.1 cm at u=0.175 | pass | pass (feet) | **FAIL** 1: neck out of line with the spine 30° (limit ±10°) at u=0 | pass 0.4 m/s (wr.l) | pass |
| Push-Ups - Close Triceps Position | pushup | **FAIL** 16: upperarm.l through floor 8.9 cm at u=0 | pass | n/a | **FAIL** 9: forearm.l turned past palm-up or palm-down 197° (limit -5° to 185°) at u=0 | pass 0.8 m/s (head) | **FAIL** 2: foot.l moves 29 mm by u=1 |
| Sumo Deadlift | hinge | **FAIL** 8: thigh.l through barbell:capsule 8.7 cm at u=1 | pass | n/a | **FAIL** 1: neck out of line with the spine 25° (limit ±10°) at u=0 | pass 1.3 m/s (kn.l) | pass |
| Alternate Incline Dumbbell Curl | curl | **FAIL** 5: trunk.upper through dumbbell:cylinder 8.6 cm at u=1 | pass | n/a | **FAIL** 1: elbow.l bent past its range 158° (limit ±145°) at u=1 | pass 0.9 m/s (wr.l) | pass |
| Incline Dumbbell Curl | curl | **FAIL** 6: trunk.upper through dumbbell:cylinder 8.6 cm at u=1 | pass | n/a | **FAIL** 2: elbow.l bent past its range 158° (limit ±145°) at u=1 | pass 0.9 m/s (wr.l) | pass |
| Incline Push-Up | pushup | **FAIL** 6: foot.l through floor 8.4 cm at u=0.375 | pass | n/a | **FAIL** 9: wrist.l bent sideways past its range -59° (limit ±40°) at u=0.625 | pass 0.8 m/s (head) | **FAIL** 2: foot.l moves 195 mm by u=1 |
| Pushups | pushup | **FAIL** 10: foot.l through floor 8.3 cm at u=0 | pass | n/a | **FAIL** 9: wrist.l bent sideways past its range -57° (limit ±40°) at u=0.6 | pass 0.8 m/s (head) | **FAIL** 2: foot.l moves 29 mm by u=1 |
| Dumbbell Squat | squat | **FAIL** 6: thigh.l through dumbbell:cylinder 8.3 cm at u=0.325 | pass | n/a | **FAIL** 1: neck out of line with the spine 19° (limit ±10°) at u=0 | pass 0.8 m/s (head) | **FAIL** 2: foot.l moves 7 mm by u=0.95 |
| Dumbbell Squat To A Bench | squat | **FAIL** 6: thigh.l through dumbbell:cylinder 8.3 cm at u=0.325 | pass | n/a | **FAIL** 1: neck out of line with the spine 19° (limit ±10°) at u=0 | pass 0.8 m/s (head) | **FAIL** 2: foot.l moves 7 mm by u=0.95 |
| Dumbbell Side Bend | sideBend | **FAIL** 4: thigh.r through dumbbell:capsule 8.3 cm at u=0 | pass | pass (feet) | **FAIL** 1: wrist.l bent sideways past its range -45° (limit ±40°) at u=1 | pass 0.5 m/s (head) | pass |
| Cable Crunch | cableCrunch | **FAIL** 6: head through cable:capsule 8.0 cm at u=1 | pass | n/a | **FAIL** 15: forearm.l turned past palm-up or palm-down 237° (limit -5° to 185°) at u=0.975 | pass 2.6 m/s (el.l) | **FAIL** 2: foot.l moves 7 mm by u=1 |
| Standing Dumbbell Triceps Extension | triceps | **FAIL** 2: trunk.upper through dumbbell:cylinder 7.9 cm at u=0 | pass | pass (feet) | **FAIL** 4: forearm.l turned past palm-up or palm-down -22° (limit -5° to 185°) at u=1 | pass 1.0 m/s (wr.l) | pass |
| Low Pulley Row To Neck | cableRow | **FAIL** 9: trunk.lower through thigh.l 7.5 cm at u=0 | pass | n/a | **FAIL** 4: elbow.l bent past its range 160° (limit ±145°) at u=1 | pass 1.3 m/s (el.l) | pass |
| Seated Cable Rows | cableRow | **FAIL** 21: trunk.lower through thigh.l 7.5 cm at u=0 | pass | n/a | **FAIL** 6: wrist.l bent toward the palm past its range 159° (limit ±70°) at u=0.1 | pass 1.8 m/s (wr.l) | pass |
| Seated One-arm Cable Pulley Rows | cableRow | **FAIL** 14: trunk.lower through thigh.l 7.5 cm at u=0 | pass | n/a | **FAIL** 3: wrist.l bent toward the palm past its range 159° (limit ±70°) at u=0.1 | pass 1.8 m/s (wr.l) | pass |
| Elevated Cable Rows | cableRow | **FAIL** 21: trunk.lower through thigh.l 7.5 cm at u=0 | pass | n/a | **FAIL** 6: wrist.l bent toward the palm past its range 159° (limit ±70°) at u=0.1 | pass 1.8 m/s (wr.l) | pass |
| Alternating Kettlebell Press | press | **FAIL** 14: upperarm.l through kettlebell:sphere 7.3 cm at u=0.075 | pass | pass (head, feet) | **FAIL** 3: wrist.l bent sideways past its range -68° (limit ±40°) at u=0.6 | pass 1.8 m/s (el.l) | pass |
| Two-Arm Kettlebell Military Press | press | **FAIL** 14: upperarm.l through kettlebell:sphere 7.3 cm at u=0.075 | pass | pass (head, feet) | **FAIL** 4: wrist.l bent sideways past its range -68° (limit ±40°) at u=0.6 | pass 1.8 m/s (el.l) | pass |
| Narrow Stance Leg Press | legPress | **FAIL** 4: trunk.lower through thigh.l 6.9 cm at u=0 | pass | n/a | **FAIL** 1: neck out of line with the spine 12° (limit ±10°) at u=0 | pass 0.6 m/s (kn.l) | pass |
| Leg Press | legPress | **FAIL** 4: trunk.lower through thigh.l 6.8 cm at u=0 | pass | n/a | **FAIL** 1: neck out of line with the spine 12° (limit ±10°) at u=0 | pass 0.7 m/s (kn.l) | pass |
| Decline Push-Up | pushup | **FAIL** 9: foot.l through block:box 6.8 cm at u=0 | pass | n/a | **FAIL** 9: wrist.l bent sideways past its range -59° (limit ±40°) at u=0.45 | pass 0.8 m/s (head) | **FAIL** 2: foot.l moves 104 mm by u=1 |
| Push-Ups With Feet Elevated | pushup | **FAIL** 9: foot.l through block:box 6.8 cm at u=0 | pass | n/a | **FAIL** 9: wrist.l bent sideways past its range -59° (limit ±40°) at u=0.45 | pass 0.8 m/s (head) | **FAIL** 2: foot.l moves 104 mm by u=1 |
| Bent Over Two-Dumbbell Row With Palms In | row | **FAIL** 5: thigh.l through dumbbell:cylinder 6.5 cm at u=0.275 | pass | pass (feet) | **FAIL** 3: neck out of line with the spine 28° (limit ±10°) at u=0 | pass 0.6 m/s (el.l) | pass |
| Flat Bench Lying Leg Raise | legRaise | **FAIL** 1: foot.l through foot.r 6.1 cm at u=1 | pass | n/a | **FAIL** 4: wrist.l bent sideways past its range -84° (limit ±40°) at u=0 | pass 2.3 m/s (an.l) | pass |
| Incline Hammer Curls | curl | **FAIL** 8: thigh.l through dumbbell:cylinder 5.7 cm at u=0.625 | pass | n/a | **FAIL** 2: elbow.l bent past its range 158° (limit ±145°) at u=1 | pass 0.9 m/s (wr.l) | pass |
| Bent Over Two-Dumbbell Row | row | **FAIL** 6: trunk.upper through dumbbell:cylinder 5.5 cm at u=1 | pass | pass (feet) | **FAIL** 1: neck out of line with the spine 28° (limit ±10°) at u=0 | pass 0.6 m/s (wr.l) | pass |
| Smith Machine Upright Row | uprightRow | **FAIL** 10: trunk.upper through forearm.l 5.3 cm at u=0.8 | pass | pass (feet) | **FAIL** 6: wrist.l bent sideways past its range -90° (limit ±40°) at u=0.625 | pass 1.9 m/s (el.l) | pass |
| Upright Barbell Row | uprightRow | **FAIL** 10: trunk.upper through forearm.l 5.3 cm at u=0.8 | pass | pass (feet) | **FAIL** 6: wrist.l bent sideways past its range -90° (limit ±40°) at u=0.625 | pass 1.9 m/s (el.l) | pass |
| Upright Cable Row | uprightRow | **FAIL** 11: trunk.upper through forearm.l 5.3 cm at u=0.8 | pass | pass (feet) | **FAIL** 6: wrist.l bent sideways past its range -90° (limit ±40°) at u=0.625 | pass 1.9 m/s (el.l) | pass |
| Two-Arm Kettlebell Row | row | **FAIL** 10: thigh.l through kettlebell:sphere 5.3 cm at u=0.675 | pass | pass (feet) | **FAIL** 3: neck out of line with the spine 28° (limit ±10°) at u=0 | pass 0.6 m/s (el.l) | pass |
| Reverse Cable Curl | curl | **FAIL** 2: thigh.l through grip:capsule 4.8 cm at u=0 | pass | pass (feet) | **FAIL** 2: forearm.l turned past palm-up or palm-down 187° (limit -5° to 185°) at u=0.1 | pass 0.9 m/s (wr.l) | pass |
| Alternating Cable Shoulder Press | press | **FAIL** 4: upperarm.l through cable:capsule 4.7 cm at u=0.4 | pass | pass (head, feet) | **FAIL** 3: wrist.l bent sideways past its range -68° (limit ±40°) at u=0.6 | pass 1.8 m/s (el.l) | pass |
| Reverse Machine Flyes | pecDeck | **FAIL** 3: pelvis through seat:box 4.6 cm at u=0 | pass | n/a | **FAIL** 2: forearm.l turned past palm-up or palm-down 270° (limit -5° to 185°) at u=0.65 | pass 1.3 m/s (wr.l) | pass |
| Smith Machine One-Arm Upright Row | uprightRow | **FAIL** 4: trunk.upper through forearm.l 4.6 cm at u=0.825 | pass | pass (feet) | **FAIL** 4: wrist.l bent sideways past its range -92° (limit ±40°) at u=0.675 | pass 1.8 m/s (el.l) | pass |
| Barbell Full Squat | squat | **FAIL** 2: trunk.lower through thigh.l 4.5 cm at u=0 | pass | n/a | **FAIL** 1: neck out of line with the spine 19° (limit ±10°) at u=0 | pass 1.0 m/s (head) | **FAIL** 2: foot.l moves 9 mm by u=0.8 |
| Reverse Barbell Curl | curl | **FAIL** 2: thigh.l through barbell:capsule 4.5 cm at u=0 | pass | pass (feet) | **FAIL** 2: forearm.l turned past palm-up or palm-down 187° (limit -5° to 185°) at u=0.1 | pass 0.9 m/s (wr.l) | pass |
| Butt Lift (Bridge) | bridge | **FAIL** 10: upperarm.r through mat:box 4.5 cm at u=0 | pass | n/a | **FAIL** 5: knee.l bent past its range 158° (limit ±140°) at u=0 | pass 0.7 m/s (head) | **FAIL** 2: foot.l moves 4 mm by u=0.95 |
| Narrow Stance Squats | squat | **FAIL** 2: trunk.lower through thigh.l 4.5 cm at u=0 | pass | n/a | **FAIL** 1: neck out of line with the spine 19° (limit ±10°) at u=0 | pass 0.8 m/s (head) | **FAIL** 2: foot.l moves 12 mm by u=1 |
| Olympic Squat | squat | **FAIL** 2: trunk.lower through thigh.l 4.5 cm at u=0 | pass | n/a | **FAIL** 1: neck out of line with the spine 19° (limit ±10°) at u=0 | pass 1.0 m/s (head) | **FAIL** 2: foot.l moves 13 mm by u=0.9 |
| Front Barbell Squat To A Bench | squat | **FAIL** 3: upperarm.l through hand.l 3.3 cm at u=1 | pass | n/a | **FAIL** 13: forearm.l turned past palm-up or palm-down 268° (limit -5° to 185°) at u=0.25 | pass 0.8 m/s (el.l) | **FAIL** 2: foot.l moves 9 mm by u=0.85 |
| Front Squat (Clean Grip) | squat | **FAIL** 3: upperarm.l through hand.l 3.3 cm at u=1 | pass | n/a | **FAIL** 13: forearm.l turned past palm-up or palm-down 268° (limit -5° to 185°) at u=0.25 | pass 0.8 m/s (el.l) | **FAIL** 2: foot.l moves 9 mm by u=0.85 |
| Kneeling Single-Arm High Pulley Row | kneelPull | **FAIL** 5: upperarm.l through grip:capsule 3.2 cm at u=1 | pass | n/a | **FAIL** 4: knee.l bending sideways 84° (limit ±45°) at u=0 | pass 1.8 m/s (el.l) | pass |
| Close-Grip EZ Bar Curl | curl | **FAIL** 6: thigh.l through hand.l 3.0 cm at u=0 | pass | pass (feet) | **FAIL** 2: forearm.l turned past palm-up or palm-down -73° (limit -5° to 185°) at u=0 | pass 0.8 m/s (wr.l) | pass |
| Smith Machine Bent Over Row | row | **FAIL** 4: thigh.l through barbell:capsule 2.6 cm at u=0 | pass | pass (feet) | **FAIL** 1: neck out of line with the spine 28° (limit ±10°) at u=0 | pass 0.5 m/s (wr.l) | pass |
| Standing Cable Wood Chop | chop | **FAIL** 3: forearm.r through cable:capsule 2.4 cm at u=0.875 | pass | pass (feet) | **FAIL** 4: forearm.l turned past palm-up or palm-down -39° (limit -5° to 185°) at u=0.85 | **FAIL** 4.2 m/s (wr.l) | pass |
| Close-Grip Standing Barbell Curl | curl | **FAIL** 2: thigh.l through hand.l 2.3 cm at u=0 | pass | pass (feet) | **FAIL** 2: forearm.l turned past palm-up or palm-down -57° (limit -5° to 185°) at u=0.025 | pass 0.9 m/s (wr.l) | pass |
| EZ-Bar Curl | curl | **FAIL** 2: thigh.l through hand.l 2.0 cm at u=0 | pass | pass (feet) | **FAIL** 2: forearm.l turned past palm-up or palm-down -45° (limit -5° to 185°) at u=0.05 | pass 0.9 m/s (wr.l) | pass |
| Standing Cable Lift | chop | **FAIL** 3: hand.r through cable:capsule 1.8 cm at u=0.425 | pass | pass (feet) | **FAIL** 4: forearm.r turned past palm-up or palm-down -48° (limit -5° to 185°) at u=0 | **FAIL** 4.9 m/s (wr.r) | pass |
| Dumbbell One-Arm Triceps Extension | triceps | **FAIL** 1: trunk.upper through dumbbell:cylinder 1.7 cm at u=0 | pass | pass (feet) | **FAIL** 1: elbow.l bent past its range 149° (limit ±145°) at u=0 | pass 1.0 m/s (wr.l) | pass |
| Standing One-Arm Dumbbell Triceps Extension | triceps | **FAIL** 1: trunk.upper through dumbbell:cylinder 1.7 cm at u=0 | pass | pass (feet) | **FAIL** 1: elbow.l bent past its range 149° (limit ±145°) at u=0 | pass 1.0 m/s (wr.l) | pass |
| Cable Rear Delt Fly | crossover | **FAIL** 4: forearm.l through cable:capsule 1.7 cm at u=1 | pass | pass (feet) | **FAIL** 2: forearm.l turned past palm-up or palm-down 230° (limit -5° to 185°) at u=0.65 | pass 2.3 m/s (wr.l) | pass |
| Kneeling High Pulley Row | kneelPull | **FAIL** 4: foot.l through mat:box 1.7 cm at u=0 | pass | n/a | **FAIL** 6: knee.l bending sideways 84° (limit ±45°) at u=0 | pass 2.1 m/s (el.l) | pass |
| Decline Barbell Bench Press | benchPress | **FAIL** 2: foot.l through declineBench:cylinder 1.5 cm at u=0 | **FAIL** 4: trunk.upper off bench by 4.0 cm at u=0 | pass (bench) | pass | pass 0.6 m/s (el.l) | pass |
| Decline Dumbbell Flyes | fly | **FAIL** 2: foot.l through declineBench:cylinder 1.5 cm at u=0 | **FAIL** 4: trunk.upper off bench by 4.0 cm at u=0 | n/a | pass | pass 1.0 m/s (wr.l) | pass |
| Decline Smith Press | benchPress | **FAIL** 2: foot.l through declineBench:cylinder 1.5 cm at u=0 | **FAIL** 4: trunk.upper off bench by 4.0 cm at u=0 | pass (bench) | pass | pass 0.6 m/s (el.l) | pass |
| Smith Machine Decline Press | benchPress | **FAIL** 2: foot.l through declineBench:cylinder 1.5 cm at u=0 | **FAIL** 4: trunk.upper off bench by 4.0 cm at u=0 | pass (bench) | pass | pass 0.6 m/s (el.l) | pass |
| Incline Cable Flye | fly | **FAIL** 2: forearm.l through tube:capsule 1.3 cm at u=1 | **FAIL** 2: trunk.upper off bench by 5.0 cm at u=0 | n/a | pass | pass 1.1 m/s (wr.l) | pass |
| One-Arm Kettlebell Swings | kbSwing | **FAIL** 3: thigh.r through hand.r 1.2 cm at u=0.225 | pass | pass (feet) | **FAIL** 1: neck out of line with the spine 30° (limit ±10°) at u=0 | pass 2.8 m/s (wr.l) | **FAIL** 2: foot.l moves 2 mm by u=0.8 |
| Leg Extensions | legMachine | **FAIL** 4: shin.l through tube:capsule 0.9 cm at u=1 | pass | n/a | **FAIL** 2: wrist.l bent sideways past its range 51° (limit ±40°) at u=0 | pass 1.0 m/s (an.l) | pass |
| Seated Leg Curl | legMachine | **FAIL** 2: shin.l through tube:capsule 0.9 cm at u=0 | pass | n/a | **FAIL** 2: wrist.l bent sideways past its range 51° (limit ±40°) at u=0 | pass 1.1 m/s (an.l) | pass |
| Barbell Glute Bridge | bridge | **FAIL** 2: foot.l through mat:box 0.9 cm at u=0 | pass | n/a | **FAIL** 7: wrist.l bent sideways past its range -74° (limit ±40°) at u=1 | pass 0.7 m/s (head) | **FAIL** 2: foot.l moves 4 mm by u=0.95 |
| Cable Crossover | crossover | **FAIL** 2: forearm.l through tube:capsule 0.6 cm at u=1 | pass | **FAIL** 2: feet flat on the floor (foot.l ball off the floor), 2.4 cm (limit 0.5 cm) at u=0 | pass | pass 2.0 m/s (wr.l) | pass |
| Dips - Chest Version | dip | **FAIL** 2: forearm.l through tube:capsule 0.5 cm at u=0 | pass | n/a | **FAIL** 6: wrist.l bent sideways past its range 71° (limit ±40°) at u=0 | pass 0.6 m/s (head) | pass |
| Dips - Triceps Version | dip | **FAIL** 4: forearm.l through tube:capsule 0.5 cm at u=0 | pass | n/a | **FAIL** 8: forearm.l turned past palm-up or palm-down 186° (limit -5° to 185°) at u=1 | pass 0.5 m/s (head) | pass |
| Parallel Bar Dip | dip | **FAIL** 2: forearm.l through tube:capsule 0.5 cm at u=0 | pass | n/a | **FAIL** 8: forearm.l turned past palm-up or palm-down 186° (limit -5° to 185°) at u=1 | pass 0.5 m/s (head) | pass |
| Flat Bench Cable Flyes | fly | **FAIL** 2: forearm.l through tube:capsule 0.4 cm at u=1 | **FAIL** 2: trunk.upper off bench by 3.0 cm at u=0 | n/a | pass | pass 1.0 m/s (wr.l) | pass |
| Barbell Bench Press - Medium Grip | benchPress | pass | **FAIL** 2: trunk.upper off bench by 3.0 cm at u=0 | **FAIL** 2: forearms upright under the weight at the bottom (forearm.l), 17° from upright (limit 10°) at u=0 | pass | pass 0.7 m/s (el.l) | pass |
| Barbell Incline Bench Press - Medium Grip | benchPress | pass | **FAIL** 2: trunk.upper off bench by 5.0 cm at u=0 | **FAIL** 2: forearms upright under the weight at the bottom (forearm.l), 34° from upright (limit 10°) at u=0 | pass | pass 0.8 m/s (el.l) | pass |
| Bench Press - Powerlifting | benchPress | pass | **FAIL** 2: trunk.upper off bench by 3.0 cm at u=0 | **FAIL** 2: forearms upright under the weight at the bottom (forearm.l), 18° from upright (limit 10°) at u=0 | pass | pass 0.7 m/s (el.l) | pass |
| Box Squat | squat | pass | **FAIL** 2: foot.l off floor by 0.8 cm at u=1 | n/a | **FAIL** 1: neck out of line with the spine 19° (limit ±10°) at u=0 | pass 0.9 m/s (kn.l) | **FAIL** 2: foot.l moves 6 mm by u=0.65 |
| One-Arm High-Pulley Cable Side Bends | sideBend | pass | **FAIL** 1: forearm.r off trunk.upper by 99999999995.8 cm at u=0 | pass (feet) | **FAIL** 2: elbow.r bent past its range 161° (limit ±145°) at u=0.4 | pass 0.4 m/s (head) | pass |
| Smith Machine Bench Press | benchPress | pass | **FAIL** 2: trunk.upper off bench by 3.0 cm at u=0 | **FAIL** 2: forearms upright under the weight at the bottom (forearm.l), 17° from upright (limit 10°) at u=0 | pass | pass 0.6 m/s (el.l) | pass |
| Smith Machine Incline Bench Press | benchPress | pass | **FAIL** 2: trunk.upper off bench by 5.0 cm at u=0 | **FAIL** 2: forearms upright under the weight at the bottom (forearm.l), 34° from upright (limit 10°) at u=0 | pass | pass 0.8 m/s (el.l) | pass |
| Smith Machine Stiff-Legged Deadlift | hinge | pass | pass | **FAIL** 2: feet flat on the floor (foot.l ball off the floor), 3.0 cm (limit 0.5 cm) at u=0 | **FAIL** 1: neck out of line with the spine 35° (limit ±10°) at u=0 | pass 0.9 m/s (kn.l) | pass |
| Standing Barbell Press Behind Neck | press | pass | pass | **FAIL** 1: bar or handle at least 5 cm from the head (barbell:capsule), 4.0 cm from the head (wanted ≥ 5.0 cm) at u=0.45 | **FAIL** 1: neck out of line with the spine 14° (limit ±10°) at u=0 | pass 0.8 m/s (el.l) | pass |
| Standing Military Press | press | pass | pass | **FAIL** 1: bar or handle at least 5 cm from the head (barbell:capsule), 1.5 cm from the head (wanted ≥ 5.0 cm) at u=0.525 | **FAIL** 2: elbow.l bent past its range 158° (limit ±145°) at u=0.025 | pass 1.4 m/s (el.l) | pass |
| Stiff-Legged Barbell Deadlift | hinge | pass | pass | **FAIL** 2: feet flat on the floor (foot.l ball off the floor), 4.2 cm (limit 0.5 cm) at u=0 | **FAIL** 1: neck out of line with the spine 35° (limit ±10°) at u=0 | pass 1.1 m/s (head) | pass |
| Triceps Overhead Extension with Rope | triceps | pass | pass | **FAIL** 2: feet flat on the floor (foot.l ball off the floor), 4.9 cm (limit 0.5 cm) at u=0 | **FAIL** 4: forearm.l turned past palm-up or palm-down -40° (limit -5° to 185°) at u=1 | pass 1.0 m/s (wr.l) | pass |
| Wide Stance Stiff Legs | hinge | pass | pass | **FAIL** 2: feet flat on the floor (foot.l ball off the floor), 5.9 cm (limit 0.5 cm) at u=0 | **FAIL** 1: neck out of line with the spine 35° (limit ±10°) at u=0 | pass 1.1 m/s (head) | pass |
| Wide-Grip Barbell Bench Press | benchPress | pass | **FAIL** 2: trunk.upper off bench by 3.0 cm at u=0 | **FAIL** 2: forearms upright under the weight at the bottom (forearm.l), 25° from upright (limit 10°) at u=0 | pass | pass 0.6 m/s (wr.l) | pass |
| Barbell Step Ups | stepUp | **FAIL** 3: foot.r through block:box 9.5 cm at u=0.425 | pass | n/a | pass | pass 1.1 m/s (an.r) | pass |
| Dumbbell Step Ups | stepUp | **FAIL** 5: foot.r through block:box 9.5 cm at u=0.425 | pass | n/a | pass | pass 1.1 m/s (an.r) | pass |
| Dumbbell Alternate Bicep Curl | curl | **FAIL** 2: thigh.l through dumbbell:cylinder 8.5 cm at u=0.05 | pass | pass (feet) | pass | pass 0.9 m/s (wr.l) | pass |
| Dumbbell Bicep Curl | curl | **FAIL** 2: thigh.l through dumbbell:cylinder 8.5 cm at u=0.05 | pass | pass (feet) | pass | pass 0.9 m/s (wr.l) | pass |
| Seated Dumbbell Curl | curl | **FAIL** 13: thigh.l through dumbbell:cylinder 7.8 cm at u=0.4 | pass | n/a | pass | pass 0.9 m/s (wr.l) | pass |
| Alternate Hammer Curl | curl | **FAIL** 2: thigh.l through dumbbell:cylinder 7.5 cm at u=0.025 | pass | pass (feet) | pass | pass 0.9 m/s (wr.l) | pass |
| Hammer Curls | curl | **FAIL** 2: thigh.l through dumbbell:cylinder 7.5 cm at u=0.025 | pass | pass (feet) | pass | pass 0.9 m/s (wr.l) | pass |
| Barbell Deadlift | hinge | **FAIL** 4: trunk.lower through thigh.l 7.5 cm at u=0 | pass | pass (feet) | pass | pass 3.7 m/s (head) | pass |
| Split Squat with Dumbbells | lunge | **FAIL** 4: shin.r through bench:box 6.9 cm at u=0.15 | pass | n/a | pass | pass 0.6 m/s (kn.r) | **FAIL** 1: foot.r moves 6 mm by u=1 |
| Smith Single-Leg Split Squat | lunge | **FAIL** 2: shin.r through bench:box 6.9 cm at u=0.15 | pass | n/a | pass | pass 0.6 m/s (kn.r) | **FAIL** 1: foot.r moves 6 mm by u=1 |
| Machine Chest Press | machine | **FAIL** 2: pelvis through beam:box 5.8 cm at u=0 | pass | n/a | pass | pass 0.5 m/s (el.l) | pass |
| Standing Low-Pulley Deltoid Raise | raise | **FAIL** 3: shin.r through cable:capsule 5.7 cm at u=0.6 | pass | pass (feet) | pass | pass 1.8 m/s (wr.l) | pass |
| Cable Hammer Curls - Rope Attachment | curl | **FAIL** 9: pelvis through forearm.l 4.9 cm at u=0 | pass | pass (feet) | pass | pass 0.8 m/s (wr.l) | pass |
| Seated Machine Row | machine | **FAIL** 1: pelvis through seat:box 4.8 cm at u=0 | pass | n/a | pass | pass 0.7 m/s (el.l) | pass |
| Seated Side Lateral Raise | raise | **FAIL** 1: pelvis through bench:box 4.8 cm at u=0 | pass | n/a | pass | pass 1.2 m/s (wr.l) | pass |
| Front Cable Raise | raise | **FAIL** 1: thigh.l through cable:capsule 4.5 cm at u=1 | pass | pass (feet) | pass | pass 1.4 m/s (wr.l) | pass |
| Butterfly | pecDeck | **FAIL** 1: pelvis through seat:box 4.2 cm at u=0 | pass | n/a | pass | pass 0.6 m/s (wr.l) | pass |
| Front Dumbbell Raise | raise | **FAIL** 2: thigh.l through dumbbell:cylinder 3.2 cm at u=0 | pass | pass (feet) | pass | pass 1.4 m/s (wr.l) | pass |
| Front Two-Dumbbell Raise | raise | **FAIL** 2: thigh.l through dumbbell:cylinder 3.2 cm at u=0 | pass | pass (feet) | pass | pass 1.6 m/s (wr.l) | pass |
| Standing Dumbbell Straight-Arm Front Delt Raise Above Head | raise | **FAIL** 2: thigh.l through dumbbell:cylinder 3.2 cm at u=0 | pass | pass (feet) | pass | pass 2.2 m/s (wr.l) | pass |
| Dumbbell Shrug | shrug | **FAIL** 2: thigh.l through dumbbell:cylinder 1.9 cm at u=0.675 | pass | pass (feet) | pass | pass 0.2 m/s (el.l) | pass |
| Cable Shrugs | shrug | **FAIL** 2: pelvis through grip:capsule 1.9 cm at u=1 | pass | pass (feet) | pass | pass 0.2 m/s (el.l) | pass |
| Barbell Shrug | shrug | **FAIL** 1: pelvis through barbell:capsule 1.6 cm at u=1 | pass | pass (feet) | pass | pass 0.2 m/s (el.l) | pass |
| Standing Biceps Cable Curl | curl | **FAIL** 2: thigh.l through grip:capsule 0.4 cm at u=0 | pass | pass (feet) | pass | pass 0.9 m/s (wr.l) | pass |
| Barbell Shrug Behind The Back | shrug | pass | pass | pass (feet) | **FAIL** 2: forearm.l turned past palm-up or palm-down -20° (limit -5° to 185°) at u=0.25 | pass 0.2 m/s (el.l) | pass |
| Barbell Side Bend | sideBend | pass | pass | pass (feet) | **FAIL** 5: wrist.l hand turned on the forearm 100° (limit ±25°) at u=0 | pass 0.5 m/s (head) | pass |
| Barbell Squat | squat | pass | pass | n/a | **FAIL** 1: neck out of line with the spine 19° (limit ±10°) at u=0 | pass 0.8 m/s (head) | **FAIL** 2: foot.l moves 9 mm by u=0.85 |
| Barbell Squat To A Bench | squat | pass | pass | n/a | **FAIL** 1: neck out of line with the spine 19° (limit ±10°) at u=0 | pass 0.8 m/s (head) | **FAIL** 2: foot.l moves 9 mm by u=0.85 |
| Bent Over Barbell Row | row | pass | pass | pass (feet) | **FAIL** 1: neck out of line with the spine 28° (limit ±10°) at u=0 | pass 0.6 m/s (el.l) | pass |
| Cable Rope Overhead Triceps Extension | triceps | pass | pass | pass (feet) | **FAIL** 2: elbow.l bent past its range 147° (limit ±145°) at u=0 | pass 1.0 m/s (wr.l) | pass |
| Chin-Up | pullup | pass | pass | n/a | **FAIL** 7: forearm.l turned past palm-up or palm-down -61° (limit -5° to 185°) at u=0.4 | pass 0.7 m/s (head) | pass |
| Dumbbell Flyes | fly | pass | **FAIL** 2: trunk.upper off bench by 3.0 cm at u=0 | n/a | pass | pass 1.0 m/s (wr.l) | pass |
| Good Morning | hinge | pass | pass | pass (feet) | **FAIL** 3: neck out of line with the spine 30° (limit ±10°) at u=0 | pass 1.0 m/s (head) | pass |
| Hanging Leg Raise | legRaise | pass | pass | n/a | **FAIL** 1: neck out of line with the spine 10° (limit ±10°) at u=0 | pass 1.1 m/s (an.l) | pass |
| Incline Dumbbell Flyes | fly | pass | **FAIL** 2: trunk.upper off bench by 5.0 cm at u=0 | n/a | pass | pass 1.1 m/s (wr.l) | pass |
| Inverted Row | invertedRow | pass | pass | n/a | **FAIL** 4: elbow.l bent past its range 158° (limit ±145°) at u=1 | pass 1.0 m/s (kn.l) | pass |
| Overhead Squat | squat | pass | pass | n/a | **FAIL** 1: neck out of line with the spine 12° (limit ±10°) at u=0 | pass 0.7 m/s (head) | **FAIL** 2: foot.l moves 9 mm by u=0.85 |
| Reverse Grip Bent-Over Rows | row | pass | pass | pass (feet) | **FAIL** 3: neck out of line with the spine 28° (limit ±10°) at u=0 | pass 0.6 m/s (el.l) | pass |
| Reverse Grip Triceps Pushdown | triceps | pass | pass | pass (feet) | **FAIL** 2: forearm.l turned past palm-up or palm-down -12° (limit -5° to 185°) at u=0.8 | pass 0.6 m/s (wr.l) | pass |
| Rope Straight-Arm Pulldown | straightArm | pass | pass | pass (feet) | **FAIL** 2: forearm.l turned past palm-up or palm-down -79° (limit -5° to 185°) at u=0 | pass 3.6 m/s (el.l) | pass |
| Smith Machine Behind the Back Shrug | shrug | pass | pass | pass (feet) | **FAIL** 2: forearm.l turned past palm-up or palm-down -20° (limit -5° to 185°) at u=0.25 | pass 0.2 m/s (el.l) | pass |
| Smith Machine Squat | squat | pass | pass | n/a | **FAIL** 1: neck out of line with the spine 11° (limit ±10°) at u=0 | pass 0.6 m/s (head) | **FAIL** 2: foot.l moves 7 mm by u=0.95 |
| Standing Overhead Barbell Triceps Extension | triceps | pass | pass | pass (feet) | **FAIL** 4: forearm.l turned past palm-up or palm-down -22° (limit -5° to 185°) at u=1 | pass 1.0 m/s (wr.l) | pass |
| Stiff Leg Barbell Good Morning | hinge | pass | pass | pass (feet) | **FAIL** 3: neck out of line with the spine 30° (limit ±10°) at u=0 | pass 1.0 m/s (head) | pass |
| V-Bar Pullup | pullup | pass | pass | n/a | **FAIL** 3: wrist.l bent back past its range -74° (limit ±70°) at u=0.95 | pass 0.7 m/s (head) | pass |
| Wide Stance Barbell Squat | squat | pass | pass | n/a | **FAIL** 1: neck out of line with the spine 19° (limit ±10°) at u=0 | pass 1.3 m/s (kn.l) | pass |
| Wide-Grip Standing Barbell Curl | curl | pass | pass | pass (feet) | **FAIL** 2: forearm.l turned past palm-up or palm-down -9° (limit -5° to 185°) at u=1 | pass 0.9 m/s (wr.l) | pass |
| Barbell Curl | curl | pass | pass | pass (feet) | pass | pass 0.9 m/s (wr.l) | pass |
| Front Plate Raise | raise | pass | pass | pass (feet) | pass | pass 1.1 m/s (wr.l) | pass |
| Incline Dumbbell Press | benchPress | pass | pass | pass (bench) | pass | pass 1.6 m/s (wr.l) | pass |
| One-Arm Side Laterals | raise | pass | pass | pass (feet) | pass | pass 1.2 m/s (wr.l) | pass |
| Plank | plank | pass | pass | n/a | pass | pass 0.0 m/s | pass |
| Pullups | pullup | pass | pass | n/a | pass | pass 1.7 m/s (an.l) | pass |
| Romanian Deadlift | hinge | pass | pass | pass (feet) | pass | pass 1.3 m/s (head) | pass |
| Side Lateral Raise | raise | pass | pass | pass (feet) | pass | pass 1.2 m/s (wr.l) | pass |
| Smith Machine Calf Raise | calfRaise | pass | pass | n/a | pass | pass 0.2 m/s (kn.l) | pass |
| Standing Barbell Calf Raise | calfRaise | pass | pass | n/a | pass | pass 0.2 m/s (kn.l) | pass |
| Standing Dumbbell Calf Raise | calfRaise | pass | pass | n/a | pass | pass 0.2 m/s (kn.l) | pass |
| Standing Front Barbell Raise Over Head | raise | pass | pass | pass (feet) | pass | pass 1.9 m/s (wr.l) | pass |
| Standing One-Arm Cable Curl | curl | pass | pass | pass (feet) | pass | pass 0.9 m/s (wr.l) | pass |
| Straight-Arm Pulldown | straightArm | pass | pass | pass (feet) | pass | pass 1.3 m/s (wr.l) | pass |
| Triceps Pushdown | triceps | pass | pass | pass (feet) | pass | pass 0.6 m/s (wr.l) | pass |
| Triceps Pushdown - Rope Attachment | triceps | pass | pass | pass (feet) | pass | pass 0.6 m/s (wr.l) | pass |
| Triceps Pushdown - V-Bar Attachment | triceps | pass | pass | pass (feet) | pass | pass 0.6 m/s (wr.l) | pass |

## Every fault, exercise by exercise

### Dumbbell Floor Press

benchPress · clearances: bench

- Penetration: upperarm.l through floor, 8.2 cm deep at u=0.025 (from u=0 to 0.2)
- Penetration: upperarm.r through floor, 8.2 cm deep at u=0.025 (from u=0 to 0.2)
- Penetration: forearm.l through floor, 7.8 cm deep at u=0.025 (from u=0 to 0.175)
- Penetration: forearm.r through floor, 7.8 cm deep at u=0.025 (from u=0 to 0.175)
- Penetration: trunk.upper through dumbbell:cylinder, 4.1 cm deep at u=0.1 (from u=0 to 0.3)
- Penetration: upperarm.l through dumbbell:cylinder, 2.5 cm deep at u=0 (from u=0 to 0.075)
- Penetration: upperarm.r through dumbbell:cylinder, 2.5 cm deep at u=0 (from u=0 to 0.075)
- Penetration: forearm.l through dumbbell:cylinder, 0.3 cm deep at u=0.55 (from u=0.5 to 0.6)
- Penetration: forearm.r through dumbbell:cylinder, 0.3 cm deep at u=0.55 (from u=0.5 to 0.6)
- Contact: trunk.upper off floor, 4.0 cm away at u=0 (from u=0 to 1)
- Contact: pelvis off floor, 3.2 cm away at u=0 (from u=0 to 1)
- Clearance: forearms upright under the weight at the bottom (forearm.l), 50° from upright (limit 10°) at u=0 (from u=0)
- Clearance: forearms upright under the weight at the bottom (forearm.r), 50° from upright (limit 10°) at u=0 (from u=0)
- Limit: wrist.l bent sideways past its range, -65° (limit ±40°) at u=0.55 (from u=0.1 to 1)
- Limit: wrist.r bent sideways past its range, 65° (limit ±40°) at u=0.55 (from u=0.1 to 1)
- Limit: elbow.l bent past its range, 157° (limit ±145°) at u=0.05 (from u=0 to 0.3)
- Limit: elbow.r bent past its range, 157° (limit ±145°) at u=0.05 (from u=0 to 0.3)

### Incline Cable Chest Press

benchPress · clearances: bench

- Penetration: upperarm.l through tube:capsule, 5.2 cm deep at u=0.375 (from u=0.275 to 1)
- Penetration: upperarm.r through tube:capsule, 5.2 cm deep at u=0.375 (from u=0.275 to 1)
- Penetration: forearm.l through tube:capsule, 4.4 cm deep at u=0.325 (from u=0.275 to 1)
- Penetration: forearm.r through tube:capsule, 4.4 cm deep at u=0.325 (from u=0.275 to 1)
- Contact: trunk.upper off bench, 5.0 cm away at u=0 (from u=0 to 1)
- Contact: pelvis off bench, 0.5 cm away at u=0 (from u=0 to 1)
- Clearance: forearms upright under the weight at the bottom (forearm.l), 83° from upright (limit 10°) at u=0 (from u=0)
- Clearance: forearms upright under the weight at the bottom (forearm.r), 83° from upright (limit 10°) at u=0 (from u=0)
- Limit: wrist.l bent sideways past its range, -70° (limit ±40°) at u=0.6 (from u=0 to 1)
- Limit: wrist.r bent sideways past its range, 70° (limit ±40°) at u=0.6 (from u=0 to 1)
- Limit: elbow.l bent past its range, 159° (limit ±145°) at u=0.175 (from u=0 to 0.45)
- Limit: elbow.r bent past its range, 159° (limit ±145°) at u=0.175 (from u=0 to 0.45)
- Limit: wrist.l hand turned on the forearm, 27° (limit ±25°) at u=0 (from u=0)
- Limit: wrist.r hand turned on the forearm, -27° (limit ±25°) at u=0 (from u=0)

### Hammer Grip Incline DB Bench Press

benchPress · clearances: bench

- Penetration: upperarm.l through dumbbell:cylinder, 5.0 cm deep at u=0 (from u=0 to 0.15)
- Penetration: upperarm.r through dumbbell:cylinder, 5.0 cm deep at u=0 (from u=0 to 0.15)
- Contact: trunk.upper off bench, 5.0 cm away at u=0 (from u=0 to 1)
- Contact: pelvis off bench, 0.5 cm away at u=0 (from u=0 to 1)
- Clearance: forearms upright under the weight at the bottom (forearm.l), 50° from upright (limit 10°) at u=0 (from u=0)
- Clearance: forearms upright under the weight at the bottom (forearm.r), 50° from upright (limit 10°) at u=0 (from u=0)
- Limit: wrist.l bent sideways past its range, -74° (limit ±40°) at u=0.775 (from u=0.225 to 1)
- Limit: wrist.r bent sideways past its range, 74° (limit ±40°) at u=0.775 (from u=0.225 to 1)
- Limit: elbow.l bent past its range, 159° (limit ±145°) at u=0.15 (from u=0 to 0.4)
- Limit: elbow.r bent past its range, 159° (limit ±145°) at u=0.15 (from u=0 to 0.4)
- Limit: wrist.l hand turned on the forearm, 28° (limit ±25°) at u=0.775 (from u=0.65 to 0.925)
- Limit: wrist.r hand turned on the forearm, -28° (limit ±25°) at u=0.775 (from u=0.65 to 0.925)

### Incline Dumbbell Bench With Palms Facing In

benchPress · clearances: bench

- Penetration: upperarm.l through dumbbell:cylinder, 5.0 cm deep at u=0 (from u=0 to 0.15)
- Penetration: upperarm.r through dumbbell:cylinder, 5.0 cm deep at u=0 (from u=0 to 0.15)
- Contact: trunk.upper off bench, 5.0 cm away at u=0 (from u=0 to 1)
- Contact: pelvis off bench, 0.5 cm away at u=0 (from u=0 to 1)
- Clearance: forearms upright under the weight at the bottom (forearm.l), 50° from upright (limit 10°) at u=0 (from u=0)
- Clearance: forearms upright under the weight at the bottom (forearm.r), 50° from upright (limit 10°) at u=0 (from u=0)
- Limit: wrist.l bent sideways past its range, -74° (limit ±40°) at u=0.775 (from u=0.225 to 1)
- Limit: wrist.r bent sideways past its range, 74° (limit ±40°) at u=0.775 (from u=0.225 to 1)
- Limit: elbow.l bent past its range, 159° (limit ±145°) at u=0.15 (from u=0 to 0.4)
- Limit: elbow.r bent past its range, 159° (limit ±145°) at u=0.15 (from u=0 to 0.4)
- Limit: wrist.l hand turned on the forearm, 28° (limit ±25°) at u=0.775 (from u=0.65 to 0.925)
- Limit: wrist.r hand turned on the forearm, -28° (limit ±25°) at u=0.775 (from u=0.65 to 0.925)

### Dumbbell Bench Press with Neutral Grip

benchPress · clearances: bench

- Penetration: upperarm.l through dumbbell:cylinder, 5.0 cm deep at u=0 (from u=0 to 0.15)
- Penetration: upperarm.r through dumbbell:cylinder, 5.0 cm deep at u=0 (from u=0 to 0.15)
- Contact: trunk.upper off bench, 3.0 cm away at u=0 (from u=0 to 1)
- Contact: pelvis off bench, 2.2 cm away at u=0 (from u=0 to 1)
- Clearance: forearms upright under the weight at the bottom (forearm.l), 24° from upright (limit 10°) at u=0 (from u=0)
- Clearance: forearms upright under the weight at the bottom (forearm.r), 24° from upright (limit 10°) at u=0 (from u=0)
- Limit: elbow.l bent past its range, 153° (limit ±145°) at u=0.075 (from u=0 to 0.275)
- Limit: elbow.r bent past its range, 153° (limit ±145°) at u=0.075 (from u=0 to 0.275)

### Dumbbell Bench Press

benchPress · clearances: bench

- Penetration: trunk.upper through dumbbell:cylinder, 4.1 cm deep at u=0.1 (from u=0 to 0.3)
- Penetration: upperarm.l through dumbbell:cylinder, 2.5 cm deep at u=0 (from u=0 to 0.075)
- Penetration: upperarm.r through dumbbell:cylinder, 2.5 cm deep at u=0 (from u=0 to 0.075)
- Penetration: forearm.l through dumbbell:cylinder, 0.3 cm deep at u=0.55 (from u=0.5 to 0.6)
- Penetration: forearm.r through dumbbell:cylinder, 0.3 cm deep at u=0.55 (from u=0.5 to 0.6)
- Contact: trunk.upper off bench, 3.0 cm away at u=0 (from u=0 to 1)
- Contact: pelvis off bench, 2.2 cm away at u=0 (from u=0 to 1)
- Clearance: forearms upright under the weight at the bottom (forearm.l), 50° from upright (limit 10°) at u=0 (from u=0)
- Clearance: forearms upright under the weight at the bottom (forearm.r), 50° from upright (limit 10°) at u=0 (from u=0)
- Limit: wrist.l bent sideways past its range, -65° (limit ±40°) at u=0.55 (from u=0.1 to 1)
- Limit: wrist.r bent sideways past its range, 65° (limit ±40°) at u=0.55 (from u=0.1 to 1)
- Limit: elbow.l bent past its range, 157° (limit ±145°) at u=0.05 (from u=0 to 0.3)
- Limit: elbow.r bent past its range, 157° (limit ±145°) at u=0.05 (from u=0 to 0.3)

### Decline Dumbbell Bench Press

benchPress · clearances: bench

- Penetration: trunk.upper through dumbbell:cylinder, 4.1 cm deep at u=0.1 (from u=0 to 0.3)
- Penetration: upperarm.l through dumbbell:cylinder, 2.5 cm deep at u=0 (from u=0 to 0.05)
- Penetration: upperarm.r through dumbbell:cylinder, 2.5 cm deep at u=0 (from u=0 to 0.05)
- Penetration: foot.l through declineBench:cylinder, 1.5 cm deep at u=0 (from u=0 to 1)
- Penetration: foot.r through declineBench:cylinder, 1.5 cm deep at u=0 (from u=0 to 1)
- Contact: trunk.upper off bench, 4.0 cm away at u=0 (from u=0 to 1)
- Contact: pelvis off bench, 3.2 cm away at u=0 (from u=0 to 1)
- Contact: shin.l off declineBench:box, 1.0 cm away at u=0 (from u=0 to 1)
- Contact: shin.r off declineBench:box, 1.0 cm away at u=0 (from u=0 to 1)
- Clearance: forearms upright under the weight at the bottom (forearm.l), 36° from upright (limit 10°) at u=0 (from u=0)
- Clearance: forearms upright under the weight at the bottom (forearm.r), 36° from upright (limit 10°) at u=0 (from u=0)
- Limit: wrist.l bent sideways past its range, -65° (limit ±40°) at u=0.5 (from u=0.075 to 1)
- Limit: wrist.r bent sideways past its range, 65° (limit ±40°) at u=0.5 (from u=0.075 to 1)
- Limit: elbow.l bent past its range, 159° (limit ±145°) at u=0 (from u=0 to 0.25)
- Limit: elbow.r bent past its range, 159° (limit ±145°) at u=0 (from u=0 to 0.25)

### Preacher Hammer Dumbbell Curl

curl

- Penetration: trunk.upper through preacher:box, 14.6 cm deep at u=1 (from u=0 to 1)
- Penetration: thigh.l through dumbbell:cylinder, 9.6 cm deep at u=0 (from u=0 to 0.175)
- Penetration: thigh.r through dumbbell:cylinder, 9.6 cm deep at u=0 (from u=0 to 0.175)
- Penetration: shin.l through dumbbell:cylinder, 9.3 cm deep at u=0 (from u=0 to 0.15)
- Penetration: shin.r through dumbbell:cylinder, 9.3 cm deep at u=0 (from u=0 to 0.15)
- Penetration: trunk.lower through preacher:box, 7.2 cm deep at u=0 (from u=0 to 1)
- Penetration: pelvis through preacher:box, 5.0 cm deep at u=0 (from u=0 to 1)
- Penetration: thigh.l through dumbbell:capsule, 3.8 cm deep at u=0 (from u=0 to 0.05)
- Penetration: thigh.r through dumbbell:capsule, 3.8 cm deep at u=0 (from u=0 to 0.05)
- Penetration: shin.l through dumbbell:capsule, 3.6 cm deep at u=0 (from u=0 to 0.05)
- Penetration: shin.r through dumbbell:capsule, 3.6 cm deep at u=0 (from u=0 to 0.05)
- Contact: forearm.l off preacher:box, 1.5 cm away at u=0.6 (from u=0.225 to 0.95)
- Contact: forearm.r off preacher:box, 1.5 cm away at u=0.6 (from u=0.225 to 0.95)
- Contact: upperarm.l off preacher:box, 0.9 cm away at u=0.65 (from u=0.35 to 0.85)
- Contact: upperarm.r off preacher:box, 0.9 cm away at u=0.65 (from u=0.35 to 0.85)
- Limit: neck out of line with the spine, 12° (limit ±10°) at u=0 (from u=0 to 1)

### Two-Arm Dumbbell Preacher Curl

curl

- Penetration: trunk.upper through preacher:box, 14.6 cm deep at u=1 (from u=0 to 1)
- Penetration: trunk.lower through preacher:box, 7.2 cm deep at u=0 (from u=0 to 1)
- Penetration: pelvis through preacher:box, 5.0 cm deep at u=0 (from u=0 to 1)
- Penetration: thigh.l through dumbbell:cylinder, 1.4 cm deep at u=0 (from u=0 to 0.025)
- Penetration: thigh.r through dumbbell:cylinder, 1.4 cm deep at u=0 (from u=0 to 0.025)
- Penetration: shin.l through dumbbell:cylinder, 1.2 cm deep at u=0 (from u=0)
- Penetration: shin.r through dumbbell:cylinder, 1.2 cm deep at u=0 (from u=0)
- Contact: forearm.l off preacher:box, 1.5 cm away at u=0.6 (from u=0.225 to 0.95)
- Contact: forearm.r off preacher:box, 1.5 cm away at u=0.6 (from u=0.225 to 0.95)
- Contact: upperarm.l off preacher:box, 0.9 cm away at u=0.65 (from u=0.35 to 0.85)
- Contact: upperarm.r off preacher:box, 0.9 cm away at u=0.65 (from u=0.35 to 0.85)
- Limit: neck out of line with the spine, 12° (limit ±10°) at u=0 (from u=0 to 1)

### Reverse Barbell Preacher Curls

curl · clearances: feet

- Penetration: trunk.upper through preacher:box, 14.5 cm deep at u=1 (from u=0 to 1)
- Penetration: trunk.lower through preacher:box, 6.3 cm deep at u=0 (from u=0 to 1)
- Penetration: pelvis through preacher:box, 2.6 cm deep at u=0 (from u=0 to 1)
- Contact: forearm.l off preacher:box, 1.4 cm away at u=0.575 (from u=0.225 to 0.925)
- Contact: forearm.r off preacher:box, 1.4 cm away at u=0.575 (from u=0.225 to 0.925)
- Contact: upperarm.l off preacher:box, 0.9 cm away at u=0.625 (from u=0.35 to 0.825)
- Contact: upperarm.r off preacher:box, 0.9 cm away at u=0.625 (from u=0.35 to 0.825)
- Limit: forearm.l turned past palm-up or palm-down, 216° (limit -5° to 185°) at u=0 (from u=0 to 0.175)
- Limit: forearm.r turned past palm-up or palm-down, 216° (limit -5° to 185°) at u=0 (from u=0 to 0.175)
- Limit: neck out of line with the spine, 12° (limit ±10°) at u=0 (from u=0 to 1)

### Hyperextensions (Back Extensions)

hyper

- Penetration: trunk.lower through soft:box, 13.7 cm deep at u=0 (from u=0 to 1)
- Penetration: thigh.l through soft:box, 12.9 cm deep at u=1 (from u=0.075 to 1)
- Penetration: thigh.r through soft:box, 12.9 cm deep at u=1 (from u=0.075 to 1)
- Penetration: pelvis through soft:box, 12.2 cm deep at u=1 (from u=0.25 to 1)
- Penetration: upperarm.l through hand.r, 6.2 cm deep at u=0.675 (from u=0.175 to 1)
- Penetration: hand.l through upperarm.r, 6.2 cm deep at u=0.675 (from u=0.175 to 1)
- Penetration: forearm.l through forearm.r, 6.0 cm deep at u=0 (from u=0 to 1)
- Penetration: forearm.l through beam:box, 5.6 cm deep at u=0 (from u=0 to 0.075)
- Penetration: forearm.r through beam:box, 5.6 cm deep at u=0 (from u=0 to 0.075)
- Penetration: trunk.upper through forearm.l, 5.0 cm deep at u=0.925 (from u=0 to 1)
- Penetration: trunk.upper through forearm.r, 5.0 cm deep at u=0.925 (from u=0 to 1)
- Penetration: trunk.upper through hand.l, 4.9 cm deep at u=0.975 (from u=0 to 1)
- Penetration: trunk.upper through hand.r, 4.9 cm deep at u=0.975 (from u=0 to 1)
- Penetration: foot.l through tube:capsule, 4.7 cm deep at u=1 (from u=0 to 1)
- Penetration: foot.r through tube:capsule, 4.7 cm deep at u=1 (from u=0 to 1)
- Penetration: trunk.lower through thigh.l, 4.5 cm deep at u=0 (from u=0 to 0.025)
- Penetration: trunk.lower through thigh.r, 4.5 cm deep at u=0 (from u=0 to 0.025)
- Penetration: shin.l through tube:capsule, 1.6 cm deep at u=1 (from u=0 to 1)
- Penetration: shin.r through tube:capsule, 1.6 cm deep at u=1 (from u=0 to 1)
- Penetration: trunk.upper through beam:box, 0.6 cm deep at u=0 (from u=0)
- Contact: hand.l off trunk.upper, 99999999998.4 cm away at u=0 (from u=0 to 1)
- Contact: hand.r off trunk.upper, 99999999998.4 cm away at u=0 (from u=0 to 1)
- Contact: forearm.l off trunk.upper, 99999999995.8 cm away at u=0 (from u=0 to 1)
- Contact: forearm.r off trunk.upper, 99999999995.8 cm away at u=0 (from u=0 to 1)
- Limit: forearm.l turned past palm-up or palm-down, -36° (limit -5° to 185°) at u=0 (from u=0 to 0.325)
- Limit: forearm.r turned past palm-up or palm-down, -36° (limit -5° to 185°) at u=0 (from u=0 to 0.325)

### One Arm Dumbbell Preacher Curl

curl

- Penetration: trunk.upper through preacher:box, 13.5 cm deep at u=1 (from u=0 to 1)
- Penetration: trunk.lower through preacher:box, 7.2 cm deep at u=0 (from u=0 to 1)
- Penetration: pelvis through preacher:box, 5.0 cm deep at u=0 (from u=0 to 1)
- Penetration: thigh.l through dumbbell:cylinder, 1.4 cm deep at u=0 (from u=0 to 0.025)
- Penetration: shin.l through dumbbell:cylinder, 1.2 cm deep at u=0 (from u=0)
- Contact: forearm.l off preacher:box, 1.5 cm away at u=0.675 (from u=0.225 to 1)
- Contact: upperarm.l off preacher:box, 1.1 cm away at u=0.725 (from u=0.325 to 0.975)
- Limit: neck out of line with the spine, 12° (limit ±10°) at u=0 (from u=0 to 1)

### Arnold Dumbbell Press

press · clearances: head

- Penetration: pelvis through adjBench:box, 13.2 cm deep at u=0 (from u=0 to 1)
- Penetration: thigh.l through adjBench:box, 9.5 cm deep at u=0 (from u=0 to 1)
- Penetration: thigh.r through adjBench:box, 9.5 cm deep at u=0 (from u=0 to 1)
- Penetration: head through dumbbell:cylinder, 8.7 cm deep at u=0.35 (from u=0.1 to 0.775)
- Penetration: neck through dumbbell:cylinder, 4.8 cm deep at u=0.35 (from u=0.1 to 0.4)
- Penetration: trunk.upper through dumbbell:cylinder, 3.3 cm deep at u=0.025 (from u=0 to 0.25)
- Penetration: hand.l through dumbbell:cylinder, 0.4 cm deep at u=0.15 (from u=0.15 to 0.175)
- Penetration: hand.r through dumbbell:cylinder, 0.4 cm deep at u=0.15 (from u=0.15 to 0.175)
- Clearance: bar or handle at least 5 cm from the head (dumbbell:cylinder), 8.7 cm into the head (wanted ≥ 5.0 cm) at u=0.35 (from u=0.025 to 0.9)
- Clearance: bar or handle at least 5 cm from the head (dumbbell:capsule), 0.4 cm from the head (wanted ≥ 5.0 cm) at u=0.3 (from u=0.175 to 0.45)
- Limit: forearm.l turned past palm-up or palm-down, 267° (limit -5° to 185°) at u=0.6 (from u=0.125 to 0.825)
- Limit: forearm.r turned past palm-up or palm-down, 267° (limit -5° to 185°) at u=0.6 (from u=0.125 to 0.825)
- Limit: wrist.l bent sideways past its range, 56° (limit ±40°) at u=0 (from u=0 to 0.075)
- Limit: wrist.r bent sideways past its range, -56° (limit ±40°) at u=0 (from u=0 to 0.075)

### Dumbbell Shoulder Press

press · clearances: head

- Penetration: pelvis through adjBench:box, 13.2 cm deep at u=0 (from u=0 to 1)
- Penetration: thigh.l through adjBench:box, 9.5 cm deep at u=0 (from u=0 to 1)
- Penetration: thigh.r through adjBench:box, 9.5 cm deep at u=0 (from u=0 to 1)
- Penetration: upperarm.l through dumbbell:cylinder, 9.3 cm deep at u=0 (from u=0 to 0.3)
- Penetration: upperarm.r through dumbbell:cylinder, 9.3 cm deep at u=0 (from u=0 to 0.3)
- Penetration: trunk.upper through dumbbell:cylinder, 1.3 cm deep at u=0.075 (from u=0 to 0.15)
- Penetration: forearm.l through dumbbell:cylinder, 1.2 cm deep at u=0.6 (from u=0.425 to 0.85)
- Penetration: forearm.r through dumbbell:cylinder, 1.2 cm deep at u=0.6 (from u=0.425 to 0.85)
- Penetration: upperarm.l through dumbbell:capsule, 0.6 cm deep at u=0 (from u=0 to 0.05)
- Penetration: upperarm.r through dumbbell:capsule, 0.6 cm deep at u=0 (from u=0 to 0.05)
- Clearance: bar or handle at least 5 cm from the head (dumbbell:cylinder), 0.1 cm from the head (wanted ≥ 5.0 cm) at u=0.675 (from u=0.35 to 0.875)
- Limit: wrist.l bent sideways past its range, -68° (limit ±40°) at u=0.6 (from u=0.3 to 1)
- Limit: wrist.r bent sideways past its range, 68° (limit ±40°) at u=0.6 (from u=0.3 to 1)
- Limit: elbow.l bent past its range, 163° (limit ±145°) at u=0.175 (from u=0 to 0.475)
- Limit: elbow.r bent past its range, 163° (limit ±145°) at u=0.175 (from u=0 to 0.475)

### Seated Barbell Military Press

press · clearances: head

- Penetration: pelvis through adjBench:box, 13.2 cm deep at u=0 (from u=0 to 1)
- Penetration: thigh.l through adjBench:box, 9.5 cm deep at u=0 (from u=0 to 1)
- Penetration: thigh.r through adjBench:box, 9.5 cm deep at u=0 (from u=0 to 1)
- Clearance: bar or handle at least 5 cm from the head (barbell:capsule), 3.3 cm from the head (wanted ≥ 5.0 cm) at u=0.55 (from u=0.225 to 0.65)
- Limit: elbow.l bent past its range, 158° (limit ±145°) at u=0.025 (from u=0 to 0.325)
- Limit: elbow.r bent past its range, 158° (limit ±145°) at u=0.025 (from u=0 to 0.325)

### Seated Dumbbell Press

press · clearances: head

- Penetration: pelvis through adjBench:box, 13.2 cm deep at u=0 (from u=0 to 1)
- Penetration: thigh.l through adjBench:box, 9.5 cm deep at u=0 (from u=0 to 1)
- Penetration: thigh.r through adjBench:box, 9.5 cm deep at u=0 (from u=0 to 1)
- Penetration: upperarm.l through dumbbell:cylinder, 9.3 cm deep at u=0 (from u=0 to 0.3)
- Penetration: upperarm.r through dumbbell:cylinder, 9.3 cm deep at u=0 (from u=0 to 0.3)
- Penetration: trunk.upper through dumbbell:cylinder, 1.3 cm deep at u=0.075 (from u=0 to 0.15)
- Penetration: forearm.l through dumbbell:cylinder, 1.2 cm deep at u=0.6 (from u=0.425 to 0.85)
- Penetration: forearm.r through dumbbell:cylinder, 1.2 cm deep at u=0.6 (from u=0.425 to 0.85)
- Penetration: upperarm.l through dumbbell:capsule, 0.6 cm deep at u=0 (from u=0 to 0.05)
- Penetration: upperarm.r through dumbbell:capsule, 0.6 cm deep at u=0 (from u=0 to 0.05)
- Clearance: bar or handle at least 5 cm from the head (dumbbell:cylinder), 0.1 cm from the head (wanted ≥ 5.0 cm) at u=0.675 (from u=0.35 to 0.875)
- Limit: wrist.l bent sideways past its range, -68° (limit ±40°) at u=0.6 (from u=0.3 to 1)
- Limit: wrist.r bent sideways past its range, 68° (limit ±40°) at u=0.6 (from u=0.3 to 1)
- Limit: elbow.l bent past its range, 163° (limit ±145°) at u=0.175 (from u=0 to 0.475)
- Limit: elbow.r bent past its range, 163° (limit ±145°) at u=0.175 (from u=0 to 0.475)

### Seated Triceps Press

triceps

- Penetration: pelvis through adjBench:box, 13.2 cm deep at u=0 (from u=0 to 1)
- Penetration: thigh.l through adjBench:box, 9.5 cm deep at u=0 (from u=0 to 1)
- Penetration: thigh.r through adjBench:box, 9.5 cm deep at u=0 (from u=0 to 1)
- Penetration: trunk.upper through dumbbell:cylinder, 7.8 cm deep at u=0 (from u=0 to 0.125)
- Penetration: neck through dumbbell:cylinder, 2.5 cm deep at u=0 (from u=0 to 0.1)
- Penetration: hand.l through adjBench:box, 1.5 cm deep at u=0.1 (from u=0.1 to 0.575)
- Penetration: hand.r through adjBench:box, 1.5 cm deep at u=0.1 (from u=0.1 to 0.575)
- Contact: hand.l off what it holds, 1.6 cm away at u=0.075 (from u=0 to 0.075)
- Contact: hand.r off what it holds, 1.6 cm away at u=0.075 (from u=0 to 0.075)
- Limit: forearm.l turned past palm-up or palm-down, -22° (limit -5° to 185°) at u=1 (from u=0.625 to 1)
- Limit: forearm.r turned past palm-up or palm-down, -22° (limit -5° to 185°) at u=1 (from u=0.625 to 1)
- Limit: elbow.l bent past its range, 148° (limit ±145°) at u=0 (from u=0 to 0.025)
- Limit: elbow.r bent past its range, 148° (limit ±145°) at u=0 (from u=0 to 0.025)

### Smith Machine Overhead Shoulder Press

press · clearances: head

- Penetration: pelvis through adjBench:box, 13.2 cm deep at u=0 (from u=0 to 1)
- Penetration: thigh.l through adjBench:box, 9.5 cm deep at u=0 (from u=0 to 1)
- Penetration: thigh.r through adjBench:box, 9.5 cm deep at u=0 (from u=0 to 1)
- Penetration: trunk.upper through forearm.l, 7.3 cm deep at u=0 (from u=0 to 0.025)
- Penetration: trunk.upper through forearm.r, 7.3 cm deep at u=0 (from u=0 to 0.025)
- Penetration: head through barbell:capsule, 1.8 cm deep at u=0.375 (from u=0.275 to 0.525)
- Penetration: trunk.lower through upperarm.l, 0.9 cm deep at u=0.025 (from u=0 to 0.05)
- Penetration: trunk.lower through upperarm.r, 0.9 cm deep at u=0.025 (from u=0 to 0.05)
- Clearance: bar or handle at least 5 cm from the head (barbell:capsule), 1.8 cm into the head (wanted ≥ 5.0 cm) at u=0.375 (from u=0.125 to 0.7)
- Limit: elbow.l bent past its range, 163° (limit ±145°) at u=0.075 (from u=0 to 0.5)
- Limit: elbow.r bent past its range, 163° (limit ±145°) at u=0.075 (from u=0 to 0.5)
- Limit: wrist.l bent sideways past its range, 41° (limit ±40°) at u=0 (from u=0)
- Limit: wrist.r bent sideways past its range, -41° (limit ±40°) at u=0 (from u=0)

### Floor Press

benchPress · clearances: bench

- Penetration: upperarm.l through floor, 10.9 cm deep at u=0 (from u=0 to 0.275)
- Penetration: upperarm.r through floor, 10.9 cm deep at u=0 (from u=0 to 0.275)
- Penetration: forearm.l through floor, 10.5 cm deep at u=0 (from u=0 to 0.275)
- Penetration: forearm.r through floor, 10.5 cm deep at u=0 (from u=0 to 0.275)
- Contact: trunk.upper off floor, 4.0 cm away at u=0 (from u=0 to 1)
- Contact: pelvis off floor, 3.2 cm away at u=0 (from u=0 to 1)
- Clearance: forearms upright under the weight at the bottom (forearm.l), 17° from upright (limit 10°) at u=0 (from u=0)
- Clearance: forearms upright under the weight at the bottom (forearm.r), 17° from upright (limit 10°) at u=0 (from u=0)

### Bodyweight Walking Lunge

lunge

- Penetration: foot.r through floor, 10.3 cm deep at u=0 (from u=0 to 0.95)
- Contact: foot.l off floor, 6.3 cm away at u=0.5 (from u=0.025 to 0.975)
- Limit: wrist.l bent sideways past its range, -67° (limit ±40°) at u=1 (from u=0 to 1)
- Limit: wrist.r bent sideways past its range, 67° (limit ±40°) at u=1 (from u=0 to 1)
- Slide: foot.r on its support moves 629.0 mm by u=1
- Slide: foot.l on its support moves 360.0 mm by u=1

### Tricep Dumbbell Kickback

triceps

- Penetration: thigh.l through dumbbell:cylinder, 9.6 cm deep at u=0.075 (from u=0 to 0.425)
- Penetration: shin.l through dumbbell:cylinder, 9.3 cm deep at u=0.075 (from u=0 to 0.3)
- Penetration: shin.l through dumbbell:capsule, 5.5 cm deep at u=0 (from u=0 to 0.125)
- Penetration: foot.r through bench:box, 5.5 cm deep at u=0 (from u=0 to 1)
- Penetration: forearm.l through thigh.l, 5.4 cm deep at u=0 (from u=0 to 0.3)
- Penetration: shin.l through hand.l, 5.3 cm deep at u=0 (from u=0 to 0.075)
- Penetration: trunk.lower through thigh.l, 4.6 cm deep at u=0 (from u=0 to 1)
- Penetration: trunk.lower through thigh.r, 4.3 cm deep at u=0 (from u=0 to 1)
- Penetration: thigh.r through bench:box, 4.2 cm deep at u=0 (from u=0 to 1)
- Penetration: thigh.l through hand.l, 4.0 cm deep at u=0 (from u=0 to 0.125)
- Penetration: thigh.l through dumbbell:capsule, 3.5 cm deep at u=0 (from u=0 to 0.1)
- Contact: forearm.l off thigh.l, 99999999995.8 cm away at u=0 (from u=0 to 1)
- Limit: forearm.r turned past palm-up or palm-down, 200° (limit -5° to 185°) at u=0 (from u=0 to 1)
- Limit: knee.r bending sideways, 90° (limit ±45°) at u=0 (from u=0 to 1)
- Limit: neck out of line with the spine, 40° (limit ±10°) at u=0 (from u=0 to 1)
- Limit: wrist.r bent sideways past its range, 54° (limit ±40°) at u=0 (from u=0 to 1)
- Limit: wrist.r hand turned on the forearm, -27° (limit ±25°) at u=0 (from u=0 to 1)

### Dumbbell One-Arm Shoulder Press

press · clearances: head, feet

- Penetration: upperarm.l through dumbbell:cylinder, 9.3 cm deep at u=0 (from u=0 to 0.3)
- Penetration: thigh.r through dumbbell:cylinder, 1.6 cm deep at u=0 (from u=0 to 1)
- Penetration: trunk.upper through dumbbell:cylinder, 1.3 cm deep at u=0.075 (from u=0 to 0.15)
- Penetration: forearm.l through dumbbell:cylinder, 1.2 cm deep at u=0.6 (from u=0.425 to 0.85)
- Penetration: upperarm.l through dumbbell:capsule, 0.7 cm deep at u=0 (from u=0 to 0.05)
- Clearance: bar or handle at least 5 cm from the head (dumbbell:cylinder), 0.1 cm from the head (wanted ≥ 5.0 cm) at u=0.675 (from u=0.35 to 0.875)
- Limit: wrist.l bent sideways past its range, -68° (limit ±40°) at u=0.6 (from u=0.3 to 1)
- Limit: elbow.l bent past its range, 162° (limit ±145°) at u=0.175 (from u=0 to 0.475)

### Standing Alternating Dumbbell Press

press · clearances: head, feet

- Penetration: upperarm.l through dumbbell:cylinder, 9.3 cm deep at u=0 (from u=0 to 0.3)
- Penetration: upperarm.r through dumbbell:cylinder, 9.3 cm deep at u=0 (from u=0 to 1)
- Penetration: trunk.upper through dumbbell:cylinder, 1.3 cm deep at u=0.075 (from u=0 to 1)
- Penetration: forearm.l through dumbbell:cylinder, 1.2 cm deep at u=0.6 (from u=0.425 to 0.85)
- Penetration: upperarm.l through dumbbell:capsule, 0.7 cm deep at u=0 (from u=0 to 0.05)
- Penetration: upperarm.r through dumbbell:capsule, 0.7 cm deep at u=0 (from u=0 to 1)
- Clearance: bar or handle at least 5 cm from the head (dumbbell:cylinder), 0.1 cm from the head (wanted ≥ 5.0 cm) at u=0.675 (from u=0.35 to 0.875)
- Limit: wrist.l bent sideways past its range, -68° (limit ±40°) at u=0.6 (from u=0.3 to 1)
- Limit: elbow.l bent past its range, 162° (limit ±145°) at u=0.175 (from u=0 to 0.475)
- Limit: elbow.r bent past its range, 158° (limit ±145°) at u=0 (from u=0 to 1)

### Standing Dumbbell Press

press · clearances: head, feet

- Penetration: upperarm.l through dumbbell:cylinder, 9.3 cm deep at u=0 (from u=0 to 0.3)
- Penetration: upperarm.r through dumbbell:cylinder, 9.3 cm deep at u=0 (from u=0 to 0.3)
- Penetration: trunk.upper through dumbbell:cylinder, 1.3 cm deep at u=0.075 (from u=0 to 0.15)
- Penetration: forearm.l through dumbbell:cylinder, 1.2 cm deep at u=0.6 (from u=0.425 to 0.85)
- Penetration: forearm.r through dumbbell:cylinder, 1.2 cm deep at u=0.6 (from u=0.425 to 0.85)
- Penetration: upperarm.l through dumbbell:capsule, 0.7 cm deep at u=0 (from u=0 to 0.05)
- Penetration: upperarm.r through dumbbell:capsule, 0.7 cm deep at u=0 (from u=0 to 0.05)
- Clearance: bar or handle at least 5 cm from the head (dumbbell:cylinder), 0.1 cm from the head (wanted ≥ 5.0 cm) at u=0.675 (from u=0.35 to 0.875)
- Limit: wrist.l bent sideways past its range, -68° (limit ±40°) at u=0.6 (from u=0.3 to 1)
- Limit: wrist.r bent sideways past its range, 68° (limit ±40°) at u=0.6 (from u=0.3 to 1)
- Limit: elbow.l bent past its range, 162° (limit ±145°) at u=0.175 (from u=0 to 0.475)
- Limit: elbow.r bent past its range, 162° (limit ±145°) at u=0.175 (from u=0 to 0.475)

### Incline Push-Up Medium

pushup

- Penetration: trunk.upper through bar:box, 9.3 cm deep at u=0.2 (from u=0 to 0.55)
- Penetration: foot.l through floor, 8.4 cm deep at u=0.225 (from u=0 to 1)
- Penetration: foot.r through floor, 8.4 cm deep at u=0.225 (from u=0 to 1)
- Penetration: upperarm.l through bar:box, 7.3 cm deep at u=0 (from u=0 to 0.2)
- Penetration: upperarm.r through bar:box, 7.3 cm deep at u=0 (from u=0 to 0.2)
- Penetration: trunk.upper through bar:capsule, 3.9 cm deep at u=0 (from u=0 to 0.125)
- Penetration: foot.l through mat:box, 3.7 cm deep at u=0.175 (from u=0 to 1)
- Penetration: foot.r through mat:box, 3.7 cm deep at u=0.175 (from u=0 to 1)
- Contact: hand.l off what it holds, 2.0 cm away at u=1 (from u=0.55 to 1)
- Contact: hand.r off what it holds, 2.0 cm away at u=1 (from u=0.55 to 1)
- Limit: forearm.l turned past palm-up or palm-down, 269° (limit -5° to 185°) at u=0.925 (from u=0 to 1)
- Limit: forearm.r turned past palm-up or palm-down, 269° (limit -5° to 185°) at u=0.925 (from u=0 to 1)
- Limit: wrist.l hand turned on the forearm, 165° (limit ±25°) at u=1 (from u=0 to 1)
- Limit: wrist.r hand turned on the forearm, -165° (limit ±25°) at u=1 (from u=0 to 1)
- Limit: wrist.l bent toward the palm past its range, 130° (limit ±70°) at u=0 (from u=0 to 1)
- Limit: wrist.r bent toward the palm past its range, 130° (limit ±70°) at u=0 (from u=0 to 1)
- Limit: wrist.l bent sideways past its range, -72° (limit ±40°) at u=0.15 (from u=0 to 0.85)
- Limit: wrist.r bent sideways past its range, 72° (limit ±40°) at u=0.15 (from u=0 to 0.85)
- Limit: neck out of line with the spine, 12° (limit ±10°) at u=0.65 (from u=0 to 1)
- Slide: foot.l on its support moves 339.2 mm by u=1
- Slide: foot.r on its support moves 339.2 mm by u=1
- Slide: hand.l on bar:capsule moves 40.0 mm by u=1
- Slide: hand.r on bar:capsule moves 40.0 mm by u=1

### Incline Push-Up Close-Grip

pushup

- Penetration: trunk.upper through bar:box, 9.3 cm deep at u=0.2 (from u=0 to 0.55)
- Penetration: foot.l through floor, 8.4 cm deep at u=0.225 (from u=0 to 1)
- Penetration: foot.r through floor, 8.4 cm deep at u=0.225 (from u=0 to 1)
- Penetration: upperarm.l through bar:box, 7.9 cm deep at u=0 (from u=0 to 0.325)
- Penetration: upperarm.r through bar:box, 7.9 cm deep at u=0 (from u=0 to 0.325)
- Penetration: trunk.upper through bar:capsule, 3.9 cm deep at u=0 (from u=0 to 0.125)
- Penetration: foot.l through mat:box, 3.7 cm deep at u=0.25 (from u=0 to 1)
- Penetration: foot.r through mat:box, 3.7 cm deep at u=0.25 (from u=0 to 1)
- Penetration: trunk.upper through hand.l, 1.8 cm deep at u=0 (from u=0 to 0.05)
- Penetration: trunk.upper through hand.r, 1.8 cm deep at u=0 (from u=0 to 0.05)
- Contact: hand.l off what it holds, 2.0 cm away at u=1 (from u=0.55 to 1)
- Contact: hand.r off what it holds, 2.0 cm away at u=1 (from u=0.55 to 1)
- Limit: forearm.l turned past palm-up or palm-down, 258° (limit -5° to 185°) at u=1 (from u=0 to 1)
- Limit: forearm.r turned past palm-up or palm-down, 258° (limit -5° to 185°) at u=1 (from u=0 to 1)
- Limit: wrist.l hand turned on the forearm, 114° (limit ±25°) at u=1 (from u=0.2 to 1)
- Limit: wrist.r hand turned on the forearm, -114° (limit ±25°) at u=1 (from u=0.2 to 1)
- Limit: wrist.l bent toward the palm past its range, 150° (limit ±70°) at u=0.3 (from u=0.3 to 1)
- Limit: wrist.r bent toward the palm past its range, 150° (limit ±70°) at u=0.3 (from u=0.3 to 1)
- Limit: wrist.l bent sideways past its range, -94° (limit ±40°) at u=0.275 (from u=0 to 1)
- Limit: wrist.r bent sideways past its range, 94° (limit ±40°) at u=0.275 (from u=0 to 1)
- Limit: neck out of line with the spine, 12° (limit ±10°) at u=0.125 (from u=0 to 1)
- Slide: foot.l on its support moves 336.8 mm by u=1
- Slide: foot.r on its support moves 336.8 mm by u=1
- Slide: hand.l on bar:capsule moves 40.0 mm by u=1
- Slide: hand.r on bar:capsule moves 40.0 mm by u=1

### Incline Push-Up Wide

pushup

- Penetration: trunk.upper through bar:box, 9.2 cm deep at u=0.125 (from u=0 to 0.6)
- Penetration: foot.l through floor, 8.4 cm deep at u=0.25 (from u=0 to 1)
- Penetration: foot.r through floor, 8.4 cm deep at u=0.25 (from u=0 to 1)
- Penetration: upperarm.l through bar:box, 7.3 cm deep at u=0 (from u=0 to 0.2)
- Penetration: upperarm.r through bar:box, 7.3 cm deep at u=0 (from u=0 to 0.2)
- Penetration: trunk.upper through bar:capsule, 3.9 cm deep at u=0 (from u=0 to 0.125)
- Penetration: foot.l through mat:box, 3.7 cm deep at u=0.3 (from u=0 to 1)
- Penetration: foot.r through mat:box, 3.7 cm deep at u=0.3 (from u=0 to 1)
- Contact: hand.l off what it holds, 2.0 cm away at u=1 (from u=0.55 to 1)
- Contact: hand.r off what it holds, 2.0 cm away at u=1 (from u=0.55 to 1)
- Limit: forearm.l turned past palm-up or palm-down, 270° (limit -5° to 185°) at u=0.525 (from u=0 to 1)
- Limit: forearm.r turned past palm-up or palm-down, 270° (limit -5° to 185°) at u=0.525 (from u=0 to 1)
- Limit: wrist.l hand turned on the forearm, 178° (limit ±25°) at u=0.825 (from u=0 to 1)
- Limit: wrist.r hand turned on the forearm, -178° (limit ±25°) at u=0.825 (from u=0 to 1)
- Limit: wrist.l bent toward the palm past its range, 117° (limit ±70°) at u=1 (from u=0 to 1)
- Limit: wrist.r bent toward the palm past its range, 117° (limit ±70°) at u=1 (from u=0 to 1)
- Limit: neck out of line with the spine, 12° (limit ±10°) at u=0 (from u=0 to 1)
- Slide: foot.l on its support moves 289.8 mm by u=1
- Slide: foot.r on its support moves 289.8 mm by u=1
- Slide: hand.l on bar:capsule moves 40.0 mm by u=1
- Slide: hand.r on bar:capsule moves 40.0 mm by u=1

### Push-Up Wide

pushup

- Penetration: foot.l through floor, 8.3 cm deep at u=0 (from u=0 to 1)
- Penetration: foot.r through floor, 8.3 cm deep at u=0 (from u=0 to 1)
- Penetration: foot.l through mat:box, 3.7 cm deep at u=0 (from u=0 to 1)
- Penetration: foot.r through mat:box, 3.7 cm deep at u=0 (from u=0 to 1)
- Penetration: trunk.upper through mat:box, 1.4 cm deep at u=0 (from u=0 to 0.025)
- Penetration: trunk.lower through mat:box, 0.6 cm deep at u=0 (from u=0)
- Contact: forearm.l off floor, 0.9 cm away at u=0.425 (from u=0 to 1)
- Contact: forearm.r off floor, 0.9 cm away at u=0.425 (from u=0 to 1)
- Limit: wrist.l bent back past its range, -83° (limit ±70°) at u=1 (from u=0.55 to 1)
- Limit: wrist.r bent back past its range, -83° (limit ±70°) at u=1 (from u=0.55 to 1)
- Limit: neck out of line with the spine, 12° (limit ±10°) at u=0.025 (from u=0 to 1)
- Slide: foot.l on its support moves 19.6 mm by u=1
- Slide: foot.r on its support moves 19.6 mm by u=1

### Reverse Flyes

raise · clearances: feet

- Penetration: thigh.l through adjBench:box, 7.5 cm deep at u=0 (from u=0 to 1)
- Penetration: thigh.r through adjBench:box, 7.5 cm deep at u=0 (from u=0 to 1)
- Contact: head off adjBench:box, 1.0 cm away at u=0 (from u=0 to 1)
- Limit: forearm.l turned past palm-up or palm-down, -89° (limit -5° to 185°) at u=0 (from u=0 to 0.45)
- Limit: forearm.r turned past palm-up or palm-down, -89° (limit -5° to 185°) at u=0 (from u=0 to 0.45)
- Limit: neck out of line with the spine, 10° (limit ±10°) at u=0 (from u=0 to 1)

### Standing Palms-In Dumbbell Press

press · clearances: head, feet

- Penetration: upperarm.l through dumbbell:cylinder, 7.1 cm deep at u=0 (from u=0 to 0.325)
- Penetration: upperarm.r through dumbbell:cylinder, 7.1 cm deep at u=0 (from u=0 to 0.325)
- Penetration: trunk.upper through forearm.l, 4.3 cm deep at u=0 (from u=0)
- Penetration: trunk.upper through forearm.r, 4.3 cm deep at u=0 (from u=0)
- Penetration: trunk.upper through dumbbell:cylinder, 3.3 cm deep at u=0 (from u=0 to 0.15)
- Penetration: upperarm.l through dumbbell:capsule, 1.4 cm deep at u=0 (from u=0 to 0.1)
- Penetration: upperarm.r through dumbbell:capsule, 1.4 cm deep at u=0 (from u=0 to 0.1)
- Penetration: trunk.lower through upperarm.l, 0.4 cm deep at u=0 (from u=0)
- Penetration: trunk.lower through upperarm.r, 0.4 cm deep at u=0 (from u=0)
- Clearance: bar or handle at least 5 cm from the head (dumbbell:cylinder), 2.5 cm from the head (wanted ≥ 5.0 cm) at u=0.5 (from u=0.25 to 0.7)
- Limit: wrist.l bent sideways past its range, -56° (limit ±40°) at u=0.6 (from u=0.35 to 1)
- Limit: wrist.r bent sideways past its range, 56° (limit ±40°) at u=0.6 (from u=0.35 to 1)
- Limit: elbow.l bent past its range, 160° (limit ±145°) at u=0.125 (from u=0 to 0.5)
- Limit: elbow.r bent past its range, 160° (limit ±145°) at u=0.125 (from u=0 to 0.5)

### Stiff-Legged Dumbbell Deadlift

hinge · clearances: feet

- Penetration: thigh.l through dumbbell:cylinder, 7.0 cm deep at u=0.875 (from u=0.7 to 1)
- Penetration: thigh.r through dumbbell:cylinder, 7.0 cm deep at u=0.875 (from u=0.7 to 1)
- Penetration: pelvis through dumbbell:cylinder, 4.7 cm deep at u=1 (from u=0.8 to 1)
- Clearance: feet flat on the floor (foot.l ball off the floor), 4.2 cm (limit 0.5 cm) at u=0 (from u=0 to 0.425)
- Clearance: feet flat on the floor (foot.r ball off the floor), 4.2 cm (limit 0.5 cm) at u=0 (from u=0 to 0.425)
- Limit: neck out of line with the spine, 35° (limit ±10°) at u=0 (from u=0 to 0.7)

### Front Barbell Squat

squat

- Penetration: upperarm.l through barbell:capsule, 6.8 cm deep at u=0.925 (from u=0 to 1)
- Penetration: upperarm.r through barbell:capsule, 6.8 cm deep at u=0.925 (from u=0 to 1)
- Penetration: forearm.l through forearm.r, 6.8 cm deep at u=0 (from u=0 to 1)
- Penetration: trunk.upper through barbell:capsule, 1.3 cm deep at u=0.25 (from u=0 to 1)
- Penetration: hand.l through upperarm.r, 0.3 cm deep at u=1 (from u=1)
- Penetration: upperarm.l through hand.r, 0.3 cm deep at u=1 (from u=1)
- Contact: hand.l off trunk.upper, 99999999998.4 cm away at u=0 (from u=0 to 1)
- Contact: hand.r off trunk.upper, 99999999998.4 cm away at u=0 (from u=0 to 1)
- Contact: forearm.l off trunk.upper, 99999999995.8 cm away at u=0 (from u=0 to 1)
- Contact: forearm.r off trunk.upper, 99999999995.8 cm away at u=0 (from u=0 to 1)
- Limit: wrist.l bent sideways past its range, -44° (limit ±40°) at u=0 (from u=0 to 0.4)
- Limit: wrist.r bent sideways past its range, 44° (limit ±40°) at u=0 (from u=0 to 0.4)
- Limit: neck out of line with the spine, 12° (limit ±10°) at u=0 (from u=0 to 0.15)
- Slide: foot.l on its support moves 9.1 mm by u=0.85
- Slide: foot.r on its support moves 9.1 mm by u=0.85

### Sit-Up

crunch

- Penetration: trunk.lower through thigh.r, 6.2 cm deep at u=1 (from u=0.725 to 1)
- Penetration: trunk.lower through thigh.l, 6.2 cm deep at u=1 (from u=0.725 to 1)
- Penetration: pelvis through mat:box, 4.0 cm deep at u=1 (from u=0.275 to 1)
- Penetration: pelvis through floor, 2.8 cm deep at u=1 (from u=0.5 to 1)
- Penetration: hand.l through hand.r, 2.5 cm deep at u=0.45 (from u=0 to 1)
- Penetration: foot.l through mat:box, 0.9 cm deep at u=0 (from u=0 to 1)
- Penetration: foot.r through mat:box, 0.9 cm deep at u=0 (from u=0 to 1)
- Penetration: neck through hand.r, 0.6 cm deep at u=1 (from u=0.8 to 1)
- Contact: hand.l off head, 99999999998.4 cm away at u=0 (from u=0 to 1)
- Contact: hand.r off head, 99999999998.4 cm away at u=0 (from u=0 to 1)
- Contact: forearm.l off head, 99999999995.8 cm away at u=0 (from u=0 to 1)
- Contact: forearm.r off head, 99999999995.8 cm away at u=0 (from u=0 to 1)
- Contact: pelvis off mat:box, 1.0 cm away at u=0 (from u=0 to 0.075)
- Limit: forearm.l turned past palm-up or palm-down, 262° (limit -5° to 185°) at u=1 (from u=0 to 1)
- Limit: neck out of line with the spine, 15° (limit ±10°) at u=1 (from u=0.75 to 1)

### Bench Dips

benchDip

- Penetration: foot.l through block:box, 5.8 cm deep at u=0 (from u=0 to 1)
- Penetration: foot.r through block:box, 5.8 cm deep at u=0 (from u=0 to 1)
- Penetration: shin.l through block:box, 0.7 cm deep at u=0 (from u=0 to 0.1)
- Penetration: shin.r through block:box, 0.7 cm deep at u=0 (from u=0 to 0.1)
- Contact: hand.l off bench:box, 0.6 cm away at u=0 (from u=0 to 1)
- Contact: hand.r off bench:box, 0.6 cm away at u=0 (from u=0 to 1)
- Limit: forearm.l turned past palm-up or palm-down, 203° (limit -5° to 185°) at u=0 (from u=0 to 1)
- Limit: forearm.r turned past palm-up or palm-down, 203° (limit -5° to 185°) at u=0 (from u=0 to 1)
- Limit: wrist.l bent back past its range, -78° (limit ±70°) at u=1 (from u=0.875 to 1)
- Limit: wrist.r bent back past its range, -78° (limit ±70°) at u=1 (from u=0.875 to 1)
- Slide: foot.l on its support moves 39.3 mm by u=1
- Slide: foot.r on its support moves 39.3 mm by u=1

### Lying Leg Curls

legMachine

- Penetration: trunk.upper through soft:box, 5.4 cm deep at u=0 (from u=0 to 1)
- Penetration: trunk.lower through soft:box, 4.7 cm deep at u=0 (from u=0 to 1)
- Penetration: shin.l through tube:capsule, 0.9 cm deep at u=0.025 (from u=0 to 1)
- Penetration: shin.r through tube:capsule, 0.9 cm deep at u=0.025 (from u=0 to 1)
- Contact: thigh.l off soft:box, 0.6 cm away at u=0.025 (from u=0 to 1)
- Contact: thigh.r off soft:box, 0.6 cm away at u=0.025 (from u=0 to 1)
- Limit: wrist.l bent sideways past its range, -62° (limit ±40°) at u=0 (from u=0 to 1)
- Limit: wrist.r bent sideways past its range, 62° (limit ±40°) at u=0 (from u=0 to 1)
- Limit: neck out of line with the spine, 25° (limit ±10°) at u=0 (from u=0 to 1)
- Limit: elbow.l bent past its range, 160° (limit ±145°) at u=0 (from u=0 to 1)
- Limit: elbow.r bent past its range, 160° (limit ±145°) at u=0 (from u=0 to 1)

### Wide-Grip Pulldown Behind The Neck

pulldown · clearances: head

- Penetration: pelvis through seat:box, 4.1 cm deep at u=1 (from u=0.6 to 1)
- Penetration: head through tube:capsule, 3.8 cm deep at u=0.475 (from u=0.35 to 0.625)
- Penetration: trunk.upper through tube:capsule, 0.9 cm deep at u=0.975 (from u=0.925 to 1)
- Penetration: thigh.l through tube:capsule, 0.7 cm deep at u=1 (from u=0 to 1)
- Penetration: thigh.r through tube:capsule, 0.7 cm deep at u=1 (from u=0 to 1)
- Clearance: bar or handle at least 5 cm from the head (tube:capsule), 3.8 cm into the head (wanted ≥ 5.0 cm) at u=0.475 (from u=0.25 to 0.775)
- Limit: neck out of line with the spine, 22° (limit ±10°) at u=1 (from u=0 to 1)
- Limit: wrist.l hand turned on the forearm, 28° (limit ±25°) at u=1 (from u=1)
- Limit: wrist.r hand turned on the forearm, -28° (limit ±25°) at u=1 (from u=1)

### Standing Cable Chest Press

cablePress · clearances: feet

- Penetration: forearm.l through cable:capsule, 3.0 cm deep at u=0.7 (from u=0.175 to 1)
- Penetration: forearm.r through cable:capsule, 3.0 cm deep at u=0.7 (from u=0.175 to 1)
- Penetration: upperarm.l through cable:capsule, 2.4 cm deep at u=0.45 (from u=0.225 to 1)
- Penetration: upperarm.r through cable:capsule, 2.4 cm deep at u=0.45 (from u=0.225 to 1)
- Clearance: feet flat on the floor (foot.l ball off the floor), 3.1 cm (limit 0.5 cm) at u=0 (from u=0 to 1)
- Clearance: feet flat on the floor (foot.r ball off the floor), 1.7 cm (limit 0.5 cm) at u=0 (from u=0 to 1)
- Limit: wrist.l bent sideways past its range, -62° (limit ±40°) at u=0.5 (from u=0.15 to 1)
- Limit: wrist.r bent sideways past its range, 62° (limit ±40°) at u=0.5 (from u=0.15 to 1)
- Limit: elbow.l bent past its range, 161° (limit ±145°) at u=0.05 (from u=0 to 0.3)
- Limit: elbow.r bent past its range, 161° (limit ±145°) at u=0.05 (from u=0 to 0.3)

### Bodyweight Squat

squat

- Penetration: hand.l through hand.r, 3.0 cm deep at u=0.975 (from u=0 to 1)
- Contact: hand.l off head, 99999999998.4 cm away at u=0 (from u=0 to 1)
- Contact: hand.r off head, 99999999998.4 cm away at u=0 (from u=0 to 1)
- Limit: neck out of line with the spine, 14° (limit ±10°) at u=0 (from u=0 to 0.275)
- Slide: foot.l on its support moves 9.1 mm by u=0.85
- Slide: foot.r on its support moves 9.1 mm by u=0.85

### Goblet Squat

squat

- Penetration: trunk.lower through kettlebell:sphere, 2.9 cm deep at u=1 (from u=0.5 to 1)
- Penetration: trunk.upper through kettlebell:capsule, 2.5 cm deep at u=0.75 (from u=0 to 1)
- Penetration: trunk.upper through kettlebell:sphere, 2.0 cm deep at u=1 (from u=0.65 to 1)
- Contact: hand.l off trunk.upper, 99999999998.4 cm away at u=0 (from u=0 to 1)
- Contact: hand.r off trunk.upper, 99999999998.4 cm away at u=0 (from u=0 to 1)
- Contact: forearm.l off trunk.upper, 99999999995.8 cm away at u=0 (from u=0 to 1)
- Contact: forearm.r off trunk.upper, 99999999995.8 cm away at u=0 (from u=0 to 1)
- Limit: forearm.l turned past palm-up or palm-down, 208° (limit -5° to 185°) at u=0 (from u=0 to 0.1)
- Limit: forearm.r turned past palm-up or palm-down, 208° (limit -5° to 185°) at u=0 (from u=0 to 0.1)
- Limit: wrist.l hand turned on the forearm, 133° (limit ±25°) at u=0 (from u=0 to 1)
- Limit: wrist.r hand turned on the forearm, -133° (limit ±25°) at u=0 (from u=0 to 1)
- Limit: wrist.l bent sideways past its range, -94° (limit ±40°) at u=0.2 (from u=0 to 1)
- Limit: wrist.r bent sideways past its range, 94° (limit ±40°) at u=0.2 (from u=0 to 1)
- Limit: wrist.l bent toward the palm past its range, 94° (limit ±70°) at u=0.2 (from u=0 to 0.2)
- Limit: wrist.r bent toward the palm past its range, 94° (limit ±70°) at u=0.2 (from u=0 to 0.2)
- Limit: wrist.l bent back past its range, -85° (limit ±70°) at u=0.225 (from u=0.225 to 0.875)
- Limit: wrist.r bent back past its range, -85° (limit ±70°) at u=0.225 (from u=0.225 to 0.875)
- Limit: neck out of line with the spine, 12° (limit ±10°) at u=0 (from u=0 to 0.15)
- Slide: foot.l on its support moves 9.1 mm by u=0.85
- Slide: foot.r on its support moves 9.1 mm by u=0.85

### Crunches

crunch

- Penetration: hand.l through hand.r, 2.5 cm deep at u=0.65 (from u=0 to 1)
- Penetration: foot.l through mat:box, 0.9 cm deep at u=0 (from u=0 to 1)
- Penetration: foot.r through mat:box, 0.9 cm deep at u=0 (from u=0 to 1)
- Penetration: neck through hand.r, 0.6 cm deep at u=1 (from u=0.775 to 1)
- Contact: hand.l off head, 99999999998.4 cm away at u=0 (from u=0 to 1)
- Contact: hand.r off head, 99999999998.4 cm away at u=0 (from u=0 to 1)
- Contact: forearm.l off head, 99999999995.8 cm away at u=0 (from u=0 to 1)
- Contact: forearm.r off head, 99999999995.8 cm away at u=0 (from u=0 to 1)
- Contact: pelvis off mat:box, 1.0 cm away at u=0 (from u=0 to 1)
- Limit: forearm.l turned past palm-up or palm-down, 262° (limit -5° to 185°) at u=1 (from u=0 to 1)
- Limit: neck out of line with the spine, 16° (limit ±10°) at u=1 (from u=0.725 to 1)

### EZ-Bar Skullcrusher

triceps · clearances: head

- Penetration: hand.l through barbell:capsule, 2.4 cm deep at u=0 (from u=0 to 1)
- Penetration: hand.r through barbell:capsule, 2.4 cm deep at u=0 (from u=0 to 1)
- Penetration: head through barbell:capsule, 0.7 cm deep at u=0 (from u=0)
- Contact: trunk.upper off bench, 3.0 cm away at u=0 (from u=0 to 1)
- Contact: pelvis off bench, 2.2 cm away at u=0 (from u=0 to 1)
- Clearance: bar or handle at least 5 cm from the head (barbell:capsule), 0.7 cm into the head (wanted ≥ 5.0 cm) at u=0 (from u=0 to 0.075)
- Joint speed: el.l at 8.2 m/s at u=0.883

### Lying Triceps Press

triceps · clearances: head

- Penetration: hand.l through barbell:capsule, 2.4 cm deep at u=0 (from u=0 to 1)
- Penetration: hand.r through barbell:capsule, 2.4 cm deep at u=0 (from u=0 to 1)
- Penetration: head through barbell:capsule, 0.7 cm deep at u=0 (from u=0)
- Contact: trunk.upper off bench, 3.0 cm away at u=0 (from u=0 to 1)
- Contact: pelvis off bench, 2.2 cm away at u=0 (from u=0 to 1)
- Clearance: bar or handle at least 5 cm from the head (barbell:capsule), 0.7 cm into the head (wanted ≥ 5.0 cm) at u=0 (from u=0 to 0.075)
- Joint speed: el.l at 8.2 m/s at u=0.883

### V-Bar Pulldown

pulldown · clearances: head

- Penetration: trunk.upper through hand.l, 2.2 cm deep at u=1 (from u=0.9 to 1)
- Penetration: trunk.upper through hand.r, 2.2 cm deep at u=1 (from u=0.9 to 1)
- Penetration: thigh.l through tube:capsule, 0.7 cm deep at u=1 (from u=0 to 1)
- Penetration: thigh.r through tube:capsule, 0.7 cm deep at u=1 (from u=0 to 1)
- Clearance: bar or handle at least 5 cm from the head (tube:capsule), 4.2 cm from the head (wanted ≥ 5.0 cm) at u=0.6 (from u=0.525 to 0.65)
- Limit: neck out of line with the spine, 14° (limit ±10°) at u=0 (from u=0 to 0.4)

### Wide-Grip Decline Barbell Bench Press

benchPress · clearances: bench

- Penetration: foot.l through declineBench:cylinder, 1.5 cm deep at u=0 (from u=0 to 1)
- Penetration: foot.r through declineBench:cylinder, 1.5 cm deep at u=0 (from u=0 to 1)
- Contact: trunk.upper off bench, 4.0 cm away at u=0 (from u=0 to 1)
- Contact: pelvis off bench, 3.2 cm away at u=0 (from u=0 to 1)
- Contact: shin.l off declineBench:box, 1.0 cm away at u=0 (from u=0 to 1)
- Contact: shin.r off declineBench:box, 1.0 cm away at u=0 (from u=0 to 1)
- Clearance: forearms upright under the weight at the bottom (forearm.l), 19° from upright (limit 10°) at u=0 (from u=0)
- Clearance: forearms upright under the weight at the bottom (forearm.r), 19° from upright (limit 10°) at u=0 (from u=0)

### Cable Lying Triceps Extension

triceps · clearances: head

- Penetration: head through grip:capsule, 1.0 cm deep at u=0 (from u=0)
- Contact: trunk.upper off bench, 3.0 cm away at u=0 (from u=0 to 1)
- Contact: pelvis off bench, 2.2 cm away at u=0 (from u=0 to 1)
- Clearance: bar or handle at least 5 cm from the head (grip:capsule), 1.0 cm into the head (wanted ≥ 5.0 cm) at u=0 (from u=0 to 0.075)
- Joint speed: el.l at 8.2 m/s at u=0.883

### Low Cable Triceps Extension

triceps · clearances: head

- Penetration: head through grip:capsule, 1.0 cm deep at u=0 (from u=0)
- Contact: trunk.upper off bench, 3.0 cm away at u=0 (from u=0 to 1)
- Contact: pelvis off bench, 2.2 cm away at u=0 (from u=0 to 1)
- Clearance: bar or handle at least 5 cm from the head (grip:capsule), 1.0 cm into the head (wanted ≥ 5.0 cm) at u=0 (from u=0 to 0.075)
- Joint speed: el.l at 8.2 m/s at u=0.883

### Crunch - Hands Overhead

crunch

- Penetration: foot.l through mat:box, 0.9 cm deep at u=0 (from u=0 to 1)
- Penetration: foot.r through mat:box, 0.9 cm deep at u=0 (from u=0 to 1)
- Contact: pelvis off mat:box, 1.0 cm away at u=0 (from u=0 to 1)
- Limit: neck out of line with the spine, 16° (limit ±10°) at u=1 (from u=0.725 to 1)

### Close-Grip Front Lat Pulldown

pulldown · clearances: head

- Penetration: thigh.l through tube:capsule, 0.7 cm deep at u=1 (from u=0 to 1)
- Penetration: thigh.r through tube:capsule, 0.7 cm deep at u=1 (from u=0 to 1)
- Clearance: bar or handle at least 5 cm from the head (tube:capsule), 4.1 cm from the head (wanted ≥ 5.0 cm) at u=0.6 (from u=0.5 to 0.675)
- Limit: forearm.l turned past palm-up or palm-down, 197° (limit -5° to 185°) at u=1 (from u=0.875 to 1)
- Limit: forearm.r turned past palm-up or palm-down, 197° (limit -5° to 185°) at u=1 (from u=0.875 to 1)
- Limit: wrist.l bent sideways past its range, -90° (limit ±40°) at u=0.625 (from u=0 to 1)
- Limit: wrist.r bent sideways past its range, 90° (limit ±40°) at u=0.625 (from u=0 to 1)
- Limit: elbow.l bent past its range, 158° (limit ±145°) at u=0.725 (from u=0.575 to 1)
- Limit: elbow.r bent past its range, 158° (limit ±145°) at u=0.725 (from u=0.575 to 1)
- Limit: neck out of line with the spine, 14° (limit ±10°) at u=0 (from u=0 to 0.4)
- Limit: wrist.l hand turned on the forearm, -28° (limit ±25°) at u=0.675 (from u=0.65 to 0.7)
- Limit: wrist.r hand turned on the forearm, 28° (limit ±25°) at u=0.675 (from u=0.65 to 0.7)

### Underhand Cable Pulldowns

pulldown · clearances: head

- Penetration: thigh.l through tube:capsule, 0.7 cm deep at u=1 (from u=0 to 1)
- Penetration: thigh.r through tube:capsule, 0.7 cm deep at u=1 (from u=0 to 1)
- Clearance: bar or handle at least 5 cm from the head (tube:capsule), 4.1 cm from the head (wanted ≥ 5.0 cm) at u=0.6 (from u=0.5 to 0.675)
- Limit: forearm.l turned past palm-up or palm-down, -50° (limit -5° to 185°) at u=0.4 (from u=0 to 0.7)
- Limit: forearm.r turned past palm-up or palm-down, -50° (limit -5° to 185°) at u=0.4 (from u=0 to 0.7)
- Limit: wrist.l hand turned on the forearm, -41° (limit ±25°) at u=0.45 (from u=0.225 to 0.6)
- Limit: wrist.r hand turned on the forearm, 41° (limit ±25°) at u=0.45 (from u=0.225 to 0.6)
- Limit: wrist.l bent sideways past its range, 47° (limit ±40°) at u=0.45 (from u=0.325 to 0.55)
- Limit: wrist.r bent sideways past its range, -47° (limit ±40°) at u=0.45 (from u=0.325 to 0.55)
- Limit: elbow.l bent past its range, 152° (limit ±145°) at u=0.675 (from u=0.55 to 1)
- Limit: elbow.r bent past its range, 152° (limit ±145°) at u=0.675 (from u=0.55 to 1)
- Limit: neck out of line with the spine, 14° (limit ±10°) at u=0 (from u=0 to 0.4)
- Limit: wrist.l bent back past its range, -73° (limit ±70°) at u=0.475 (from u=0.375 to 0.55)
- Limit: wrist.r bent back past its range, -73° (limit ±70°) at u=0.475 (from u=0.375 to 0.55)

### Wide-Grip Lat Pulldown

pulldown · clearances: head

- Penetration: thigh.l through tube:capsule, 0.7 cm deep at u=1 (from u=0 to 1)
- Penetration: thigh.r through tube:capsule, 0.7 cm deep at u=1 (from u=0 to 1)
- Clearance: bar or handle at least 5 cm from the head (tube:capsule), 3.8 cm from the head (wanted ≥ 5.0 cm) at u=0.55 (from u=0.45 to 0.65)
- Limit: neck out of line with the spine, 14° (limit ±10°) at u=0 (from u=0 to 0.4)

### Lying Close-Grip Barbell Triceps Press To Chin

triceps · clearances: head

- Penetration: head through barbell:capsule, 0.7 cm deep at u=0 (from u=0)
- Contact: trunk.upper off bench, 3.0 cm away at u=0 (from u=0 to 1)
- Contact: pelvis off bench, 2.2 cm away at u=0 (from u=0 to 1)
- Clearance: bar or handle at least 5 cm from the head (barbell:capsule), 0.7 cm into the head (wanted ≥ 5.0 cm) at u=0 (from u=0 to 0.075)
- Joint speed: el.l at 8.2 m/s at u=0.883

### Cable Rope Rear-Delt Rows

facePull · clearances: feet

- Contact: foot.r off floor, 0.8 cm away at u=0 (from u=0 to 1)
- Clearance: feet flat on the floor (foot.r ball off the floor), 0.8 cm (limit 0.5 cm) at u=0 (from u=0 to 1)
- Limit: forearm.l turned past palm-up or palm-down, 188° (limit -5° to 185°) at u=1 (from u=0 to 1)
- Limit: forearm.r turned past palm-up or palm-down, 188° (limit -5° to 185°) at u=1 (from u=0 to 1)
- Limit: wrist.l bent toward the palm past its range, 165° (limit ±70°) at u=0.825 (from u=0.45 to 1)
- Limit: wrist.r bent toward the palm past its range, 165° (limit ±70°) at u=0.825 (from u=0.45 to 1)
- Limit: wrist.l hand turned on the forearm, 74° (limit ±25°) at u=0.5 (from u=0.375 to 1)
- Limit: wrist.r hand turned on the forearm, -74° (limit ±25°) at u=0.5 (from u=0.375 to 1)
- Limit: wrist.l bent sideways past its range, -88° (limit ±40°) at u=0.45 (from u=0.35 to 1)
- Limit: wrist.r bent sideways past its range, 88° (limit ±40°) at u=0.45 (from u=0.35 to 1)

### Close-Grip Barbell Bench Press

benchPress · clearances: bench

- Contact: trunk.upper off bench, 3.0 cm away at u=0 (from u=0 to 1)
- Contact: pelvis off bench, 2.2 cm away at u=0 (from u=0 to 1)
- Clearance: forearms upright under the weight at the bottom (forearm.l), 52° from upright (limit 10°) at u=0 (from u=0)
- Clearance: forearms upright under the weight at the bottom (forearm.r), 52° from upright (limit 10°) at u=0 (from u=0)
- Limit: forearm.l turned past palm-up or palm-down, 190° (limit -5° to 185°) at u=0 (from u=0 to 0.05)
- Limit: forearm.r turned past palm-up or palm-down, 190° (limit -5° to 185°) at u=0 (from u=0 to 0.05)
- Limit: wrist.l bent sideways past its range, -58° (limit ±40°) at u=0 (from u=0 to 0.975)
- Limit: wrist.r bent sideways past its range, 58° (limit ±40°) at u=0 (from u=0 to 0.975)
- Limit: elbow.l bent past its range, 149° (limit ±145°) at u=0 (from u=0 to 0.1)
- Limit: elbow.r bent past its range, 149° (limit ±145°) at u=0 (from u=0 to 0.1)

### Face Pull

facePull · clearances: feet

- Contact: foot.r off floor, 0.8 cm away at u=0 (from u=0 to 1)
- Clearance: feet flat on the floor (foot.r ball off the floor), 0.8 cm (limit 0.5 cm) at u=0 (from u=0 to 1)
- Limit: wrist.l bent toward the palm past its range, 165° (limit ±70°) at u=0.975 (from u=0.55 to 0.975)
- Limit: wrist.r bent toward the palm past its range, 165° (limit ±70°) at u=0.975 (from u=0.55 to 0.975)
- Limit: wrist.l bent sideways past its range, -92° (limit ±40°) at u=0.975 (from u=0.35 to 1)
- Limit: wrist.r bent sideways past its range, 92° (limit ±40°) at u=0.975 (from u=0.35 to 1)
- Limit: wrist.l hand turned on the forearm, 61° (limit ±25°) at u=0.6 (from u=0.4 to 0.9)
- Limit: wrist.r hand turned on the forearm, -61° (limit ±25°) at u=0.6 (from u=0.4 to 0.9)
- Limit: elbow.l bent past its range, 165° (limit ±145°) at u=1 (from u=0.8 to 1)
- Limit: elbow.r bent past its range, 165° (limit ±145°) at u=1 (from u=0.8 to 1)

### Lying Dumbbell Tricep Extension

triceps · clearances: head

- Contact: trunk.upper off bench, 3.0 cm away at u=0 (from u=0 to 1)
- Contact: pelvis off bench, 2.2 cm away at u=0 (from u=0 to 1)
- Clearance: bar or handle at least 5 cm from the head (dumbbell:cylinder), 3.0 cm from the head (wanted ≥ 5.0 cm) at u=0 (from u=0 to 0.125)
- Limit: forearm.l turned past palm-up or palm-down, -90° (limit -5° to 185°) at u=1 (from u=0.9 to 1)
- Limit: forearm.r turned past palm-up or palm-down, -90° (limit -5° to 185°) at u=1 (from u=0.9 to 1)
- Joint speed: el.l at 8.2 m/s at u=0.883

### Pull Through

pullThrough · clearances: feet

- Contact: foot.l off floor, 0.6 cm away at u=1 (from u=1)
- Contact: foot.r off floor, 0.6 cm away at u=1 (from u=1)
- Clearance: feet flat on the floor (foot.l ball off the floor), 0.6 cm (limit 0.5 cm) at u=1 (from u=1)
- Clearance: feet flat on the floor (foot.r ball off the floor), 0.6 cm (limit 0.5 cm) at u=1 (from u=1)
- Limit: neck out of line with the spine, 28° (limit ±10°) at u=0 (from u=0 to 0.625)
- Slide: foot.l on its support moves 3.2 mm by u=1
- Slide: foot.r on its support moves 3.2 mm by u=1

### Smith Machine Close-Grip Bench Press

benchPress · clearances: bench

- Contact: trunk.upper off bench, 3.0 cm away at u=0 (from u=0 to 1)
- Contact: pelvis off bench, 2.2 cm away at u=0 (from u=0 to 1)
- Clearance: forearms upright under the weight at the bottom (forearm.l), 52° from upright (limit 10°) at u=0 (from u=0)
- Clearance: forearms upright under the weight at the bottom (forearm.r), 52° from upright (limit 10°) at u=0 (from u=0)
- Limit: forearm.l turned past palm-up or palm-down, 190° (limit -5° to 185°) at u=0 (from u=0 to 0.075)
- Limit: forearm.r turned past palm-up or palm-down, 190° (limit -5° to 185°) at u=0 (from u=0 to 0.075)
- Limit: wrist.l bent sideways past its range, -58° (limit ±40°) at u=0 (from u=0 to 0.95)
- Limit: wrist.r bent sideways past its range, 58° (limit ±40°) at u=0 (from u=0 to 0.95)
- Limit: elbow.l bent past its range, 149° (limit ±145°) at u=0 (from u=0 to 0.075)
- Limit: elbow.r bent past its range, 149° (limit ±145°) at u=0 (from u=0 to 0.075)

### Barbell Hip Thrust

bridge

- Penetration: trunk.upper through bench:box, 16.1 cm deep at u=0.275 (from u=0 to 0.6)
- Penetration: head through bench:box, 13.3 cm deep at u=0.3 (from u=0 to 0.55)
- Penetration: neck through bench:box, 9.9 cm deep at u=0.4 (from u=0.1 to 0.6)
- Limit: wrist.l bent sideways past its range, -56° (limit ±40°) at u=1 (from u=0 to 1)
- Limit: wrist.r bent sideways past its range, 56° (limit ±40°) at u=1 (from u=0 to 1)
- Limit: neck out of line with the spine, 25° (limit ±10°) at u=0.95 (from u=0 to 1)
- Limit: wrist.l hand turned on the forearm, 27° (limit ±25°) at u=1 (from u=0.875 to 1)
- Limit: wrist.r hand turned on the forearm, -27° (limit ±25°) at u=1 (from u=0.875 to 1)

### Preacher Curl

curl

- Penetration: trunk.upper through preacher:box, 14.6 cm deep at u=1 (from u=0 to 1)
- Penetration: trunk.lower through preacher:box, 7.2 cm deep at u=0 (from u=0 to 1)
- Penetration: pelvis through preacher:box, 5.0 cm deep at u=0 (from u=0 to 1)
- Limit: forearm.l turned past palm-up or palm-down, -75° (limit -5° to 185°) at u=0 (from u=0 to 0.6)
- Limit: forearm.r turned past palm-up or palm-down, -75° (limit -5° to 185°) at u=0 (from u=0 to 0.6)
- Limit: neck out of line with the spine, 12° (limit ±10°) at u=0 (from u=0 to 1)

### Seated Cable Shoulder Press

press · clearances: head

- Penetration: pelvis through adjBench:box, 13.2 cm deep at u=0 (from u=0 to 1)
- Penetration: thigh.l through adjBench:box, 9.5 cm deep at u=0 (from u=0 to 1)
- Penetration: thigh.r through adjBench:box, 9.5 cm deep at u=0 (from u=0 to 1)
- Penetration: upperarm.l through cable:capsule, 3.9 cm deep at u=0.4 (from u=0.25 to 0.9)
- Penetration: upperarm.r through cable:capsule, 3.9 cm deep at u=0.4 (from u=0.25 to 0.9)
- Penetration: forearm.l through cable:capsule, 2.8 cm deep at u=0.25 (from u=0.2 to 1)
- Penetration: forearm.r through cable:capsule, 2.8 cm deep at u=0.25 (from u=0.2 to 1)
- Penetration: upperarm.l through grip:capsule, 0.5 cm deep at u=0 (from u=0 to 0.025)
- Penetration: upperarm.r through grip:capsule, 0.5 cm deep at u=0 (from u=0 to 0.025)
- Limit: wrist.l bent sideways past its range, -68° (limit ±40°) at u=0.6 (from u=0.3 to 1)
- Limit: wrist.r bent sideways past its range, 68° (limit ±40°) at u=0.6 (from u=0.3 to 1)
- Limit: elbow.l bent past its range, 163° (limit ±145°) at u=0.175 (from u=0 to 0.475)
- Limit: elbow.r bent past its range, 163° (limit ±145°) at u=0.175 (from u=0 to 0.475)

### One-Arm Dumbbell Row

row

- Penetration: thigh.l through dumbbell:cylinder, 10.7 cm deep at u=0.925 (from u=0.175 to 1)
- Penetration: shin.l through dumbbell:cylinder, 9.3 cm deep at u=0.45 (from u=0.125 to 0.8)
- Penetration: foot.r through bench:box, 5.5 cm deep at u=0 (from u=0 to 1)
- Penetration: thigh.l through dumbbell:capsule, 5.3 cm deep at u=0.525 (from u=0.4 to 1)
- Penetration: shin.l through dumbbell:capsule, 5.1 cm deep at u=0.525 (from u=0.375 to 0.675)
- Penetration: trunk.lower through thigh.l, 4.6 cm deep at u=0 (from u=0 to 1)
- Penetration: trunk.lower through thigh.r, 4.3 cm deep at u=0 (from u=0 to 1)
- Penetration: thigh.l through hand.l, 4.3 cm deep at u=0.6 (from u=0.475 to 0.975)
- Penetration: thigh.r through bench:box, 4.2 cm deep at u=0 (from u=0 to 1)
- Penetration: shin.l through hand.l, 4.1 cm deep at u=0.6 (from u=0.475 to 0.725)
- Penetration: trunk.upper through dumbbell:cylinder, 0.8 cm deep at u=1 (from u=1)
- Limit: forearm.r turned past palm-up or palm-down, 196° (limit -5° to 185°) at u=0 (from u=0 to 1)
- Limit: knee.r bending sideways, 90° (limit ±45°) at u=0 (from u=0 to 1)
- Limit: neck out of line with the spine, 40° (limit ±10°) at u=0 (from u=0 to 1)

### Standing Dumbbell Upright Row

uprightRow · clearances: feet

- Penetration: trunk.upper through dumbbell:cylinder, 10.5 cm deep at u=0.95 (from u=0.4 to 1)
- Penetration: trunk.lower through dumbbell:cylinder, 9.0 cm deep at u=0.475 (from u=0.175 to 0.775)
- Penetration: pelvis through dumbbell:cylinder, 7.7 cm deep at u=0.175 (from u=0 to 0.475)
- Penetration: trunk.upper through forearm.l, 4.1 cm deep at u=0.825 (from u=0.65 to 0.95)
- Penetration: trunk.upper through forearm.r, 4.1 cm deep at u=0.825 (from u=0.65 to 0.95)
- Penetration: trunk.upper through hand.l, 3.6 cm deep at u=0.825 (from u=0.675 to 0.975)
- Penetration: trunk.upper through hand.r, 3.6 cm deep at u=0.825 (from u=0.675 to 0.975)
- Penetration: trunk.upper through dumbbell:capsule, 2.6 cm deep at u=0.95 (from u=0.65 to 1)
- Penetration: forearm.l through dumbbell:cylinder, 2.1 cm deep at u=0.575 (from u=0.3 to 0.725)
- Penetration: forearm.r through dumbbell:cylinder, 2.1 cm deep at u=0.575 (from u=0.3 to 0.725)
- Penetration: thigh.l through dumbbell:cylinder, 1.2 cm deep at u=0.075 (from u=0 to 0.175)
- Penetration: thigh.r through dumbbell:cylinder, 1.2 cm deep at u=0.075 (from u=0 to 0.175)
- Penetration: upperarm.l through dumbbell:cylinder, 0.9 cm deep at u=1 (from u=0.975 to 1)
- Penetration: upperarm.r through dumbbell:cylinder, 0.9 cm deep at u=1 (from u=0.975 to 1)
- Penetration: trunk.lower through dumbbell:capsule, 0.9 cm deep at u=0.475 (from u=0.425 to 0.525)
- Limit: wrist.l bent sideways past its range, -92° (limit ±40°) at u=0.7 (from u=0.05 to 1)
- Limit: wrist.r bent sideways past its range, 92° (limit ±40°) at u=0.7 (from u=0.05 to 1)
- Limit: wrist.l hand turned on the forearm, 49° (limit ±25°) at u=0.775 (from u=0.6 to 0.875)
- Limit: wrist.r hand turned on the forearm, -49° (limit ±25°) at u=0.775 (from u=0.6 to 0.875)
- Limit: forearm.l turned past palm-up or palm-down, -19° (limit -5° to 185°) at u=1 (from u=0.925 to 1)
- Limit: forearm.r turned past palm-up or palm-down, -19° (limit -5° to 185°) at u=1 (from u=0.925 to 1)
- Limit: elbow.l bent past its range, 150° (limit ±145°) at u=0.925 (from u=0.8 to 1)
- Limit: elbow.r bent past its range, 150° (limit ±145°) at u=0.925 (from u=0.8 to 1)

### Barbell Lunge

lunge

- Penetration: foot.r through floor, 10.3 cm deep at u=0 (from u=0 to 0.95)
- Contact: foot.l off floor, 6.3 cm away at u=0.5 (from u=0.025 to 0.975)
- Slide: foot.r on its support moves 629.0 mm by u=1
- Slide: foot.l on its support moves 360.0 mm by u=1

### Barbell Walking Lunge

lunge

- Penetration: foot.r through floor, 10.3 cm deep at u=0 (from u=0 to 0.95)
- Contact: foot.l off floor, 6.3 cm away at u=0.5 (from u=0.025 to 0.975)
- Slide: foot.r on its support moves 629.0 mm by u=1
- Slide: foot.l on its support moves 360.0 mm by u=1

### Dumbbell Lunges

lunge

- Penetration: foot.r through floor, 10.3 cm deep at u=0 (from u=0 to 0.95)
- Penetration: thigh.l through dumbbell:cylinder, 4.2 cm deep at u=0.65 (from u=0.325 to 0.95)
- Penetration: thigh.r through dumbbell:cylinder, 2.5 cm deep at u=0 (from u=0 to 0.925)
- Contact: foot.l off floor, 6.3 cm away at u=0.5 (from u=0.025 to 0.975)
- Slide: foot.r on its support moves 629.0 mm by u=1
- Slide: foot.l on its support moves 360.0 mm by u=1

### Dumbbell Rear Lunge

lunge

- Penetration: foot.r through floor, 10.3 cm deep at u=0 (from u=0 to 0.55)
- Penetration: thigh.l through dumbbell:cylinder, 3.9 cm deep at u=0.575 (from u=0.25 to 0.95)
- Penetration: thigh.r through dumbbell:cylinder, 3.4 cm deep at u=0.65 (from u=0 to 0.95)
- Contact: foot.r off floor, 1.0 cm away at u=0.8 (from u=0.65 to 0.95)
- Slide: foot.r on its support moves 629.0 mm by u=1
- Slide: foot.l on its support moves 360.0 mm by u=1

### Standing Dumbbell Reverse Curl

curl · clearances: feet

- Penetration: thigh.l through dumbbell:cylinder, 10.1 cm deep at u=0 (from u=0 to 0.15)
- Penetration: thigh.r through dumbbell:cylinder, 10.1 cm deep at u=0 (from u=0 to 0.15)
- Penetration: pelvis through dumbbell:cylinder, 3.6 cm deep at u=0 (from u=0 to 0.1)
- Penetration: thigh.l through dumbbell:capsule, 2.2 cm deep at u=0 (from u=0 to 0.025)
- Penetration: thigh.r through dumbbell:capsule, 2.2 cm deep at u=0 (from u=0 to 0.025)
- Limit: forearm.l turned past palm-up or palm-down, 187° (limit -5° to 185°) at u=0.1 (from u=0.1 to 0.125)
- Limit: forearm.r turned past palm-up or palm-down, 187° (limit -5° to 185°) at u=0.1 (from u=0.1 to 0.125)

### Standing Bent-Over Two-Arm Dumbbell Triceps Extension

triceps · clearances: feet

- Penetration: thigh.l through dumbbell:cylinder, 9.1 cm deep at u=0.175 (from u=0 to 0.75)
- Penetration: thigh.r through dumbbell:cylinder, 9.1 cm deep at u=0.175 (from u=0 to 0.75)
- Penetration: shin.l through dumbbell:cylinder, 8.1 cm deep at u=0.15 (from u=0 to 0.325)
- Penetration: shin.r through dumbbell:cylinder, 8.1 cm deep at u=0.15 (from u=0 to 0.325)
- Penetration: thigh.l through dumbbell:capsule, 1.1 cm deep at u=0.1 (from u=0 to 0.2)
- Penetration: thigh.r through dumbbell:capsule, 1.1 cm deep at u=0.1 (from u=0 to 0.2)
- Limit: neck out of line with the spine, 30° (limit ±10°) at u=0 (from u=0 to 1)

### Push-Ups - Close Triceps Position

pushup

- Penetration: upperarm.l through floor, 8.9 cm deep at u=0 (from u=0 to 0.2)
- Penetration: upperarm.r through floor, 8.9 cm deep at u=0 (from u=0 to 0.2)
- Penetration: forearm.l through floor, 8.5 cm deep at u=0 (from u=0 to 0.175)
- Penetration: forearm.r through floor, 8.5 cm deep at u=0 (from u=0 to 0.175)
- Penetration: foot.l through floor, 8.3 cm deep at u=0 (from u=0 to 1)
- Penetration: foot.r through floor, 8.3 cm deep at u=0 (from u=0 to 1)
- Penetration: upperarm.l through mat:box, 5.5 cm deep at u=0 (from u=0 to 0.2)
- Penetration: upperarm.r through mat:box, 5.5 cm deep at u=0 (from u=0 to 0.2)
- Penetration: forearm.l through mat:box, 4.5 cm deep at u=0.1 (from u=0 to 1)
- Penetration: forearm.r through mat:box, 4.5 cm deep at u=0.1 (from u=0 to 1)
- Penetration: foot.l through mat:box, 3.7 cm deep at u=0 (from u=0 to 1)
- Penetration: foot.r through mat:box, 3.7 cm deep at u=0 (from u=0 to 1)
- Penetration: trunk.upper through mat:box, 1.4 cm deep at u=0 (from u=0 to 0.025)
- Penetration: trunk.lower through mat:box, 0.6 cm deep at u=0 (from u=0)
- Penetration: hand.l through mat:box, 0.3 cm deep at u=0 (from u=0 to 1)
- Penetration: hand.r through mat:box, 0.3 cm deep at u=0 (from u=0 to 1)
- Limit: forearm.l turned past palm-up or palm-down, 197° (limit -5° to 185°) at u=0 (from u=0 to 0.4)
- Limit: forearm.r turned past palm-up or palm-down, 197° (limit -5° to 185°) at u=0 (from u=0 to 0.4)
- Limit: wrist.l bent sideways past its range, -68° (limit ±40°) at u=1 (from u=0 to 1)
- Limit: wrist.r bent sideways past its range, 68° (limit ±40°) at u=1 (from u=0 to 1)
- Limit: wrist.l hand turned on the forearm, 38° (limit ±25°) at u=1 (from u=0.775 to 1)
- Limit: wrist.r hand turned on the forearm, -38° (limit ±25°) at u=1 (from u=0.775 to 1)
- Limit: elbow.l bent past its range, 153° (limit ±145°) at u=0 (from u=0 to 0.1)
- Limit: elbow.r bent past its range, 153° (limit ±145°) at u=0 (from u=0 to 0.1)
- Limit: neck out of line with the spine, 12° (limit ±10°) at u=0.65 (from u=0 to 1)
- Slide: foot.l on its support moves 28.7 mm by u=1
- Slide: foot.r on its support moves 28.7 mm by u=1

### Sumo Deadlift

hinge

- Penetration: thigh.l through barbell:capsule, 8.7 cm deep at u=1 (from u=0.275 to 1)
- Penetration: thigh.r through barbell:capsule, 8.7 cm deep at u=1 (from u=0.275 to 1)
- Penetration: thigh.l through hand.l, 7.1 cm deep at u=1 (from u=0.6 to 1)
- Penetration: thigh.r through hand.r, 7.1 cm deep at u=1 (from u=0.6 to 1)
- Penetration: shin.l through barbell:capsule, 6.4 cm deep at u=0.3 (from u=0.15 to 0.475)
- Penetration: shin.r through barbell:capsule, 6.4 cm deep at u=0.3 (from u=0.15 to 0.475)
- Penetration: forearm.l through thigh.l, 6.0 cm deep at u=1 (from u=0.8 to 1)
- Penetration: forearm.r through thigh.r, 6.0 cm deep at u=1 (from u=0.8 to 1)
- Limit: neck out of line with the spine, 25° (limit ±10°) at u=0 (from u=0 to 0.6)

### Alternate Incline Dumbbell Curl

curl

- Penetration: trunk.upper through dumbbell:cylinder, 8.6 cm deep at u=1 (from u=0.55 to 1)
- Penetration: thigh.l through dumbbell:cylinder, 8.1 cm deep at u=0.475 (from u=0.3 to 0.625)
- Penetration: pelvis through dumbbell:cylinder, 6.8 cm deep at u=0.4 (from u=0.25 to 0.675)
- Penetration: pelvis through adjBench:box, 4.9 cm deep at u=0 (from u=0 to 1)
- Penetration: trunk.lower through dumbbell:cylinder, 4.3 cm deep at u=0.525 (from u=0.4 to 0.825)
- Limit: elbow.l bent past its range, 158° (limit ±145°) at u=1 (from u=0.9 to 1)

### Incline Dumbbell Curl

curl

- Penetration: trunk.upper through dumbbell:cylinder, 8.6 cm deep at u=1 (from u=0.55 to 1)
- Penetration: thigh.l through dumbbell:cylinder, 8.1 cm deep at u=0.475 (from u=0.3 to 0.625)
- Penetration: thigh.r through dumbbell:cylinder, 8.1 cm deep at u=0.475 (from u=0.3 to 0.625)
- Penetration: pelvis through dumbbell:cylinder, 6.8 cm deep at u=0.4 (from u=0.25 to 0.675)
- Penetration: pelvis through adjBench:box, 4.9 cm deep at u=0 (from u=0 to 1)
- Penetration: trunk.lower through dumbbell:cylinder, 4.3 cm deep at u=0.525 (from u=0.4 to 0.825)
- Limit: elbow.l bent past its range, 158° (limit ±145°) at u=1 (from u=0.9 to 1)
- Limit: elbow.r bent past its range, 158° (limit ±145°) at u=1 (from u=0.9 to 1)

### Incline Push-Up

pushup

- Penetration: foot.l through floor, 8.4 cm deep at u=0.375 (from u=0 to 1)
- Penetration: foot.r through floor, 8.4 cm deep at u=0.375 (from u=0 to 1)
- Penetration: trunk.upper through block:box, 3.8 cm deep at u=0 (from u=0 to 0.1)
- Penetration: foot.l through mat:box, 3.7 cm deep at u=0.425 (from u=0 to 1)
- Penetration: foot.r through mat:box, 3.7 cm deep at u=0.425 (from u=0 to 1)
- Penetration: trunk.lower through block:box, 0.8 cm deep at u=0 (from u=0 to 0.05)
- Limit: wrist.l bent sideways past its range, -59° (limit ±40°) at u=0.625 (from u=0 to 1)
- Limit: wrist.r bent sideways past its range, 59° (limit ±40°) at u=0.625 (from u=0 to 1)
- Limit: wrist.l hand turned on the forearm, 39° (limit ±25°) at u=1 (from u=0.425 to 1)
- Limit: wrist.r hand turned on the forearm, -39° (limit ±25°) at u=1 (from u=0.425 to 1)
- Limit: wrist.l bent back past its range, -80° (limit ±70°) at u=1 (from u=0.9 to 1)
- Limit: wrist.r bent back past its range, -80° (limit ±70°) at u=1 (from u=0.9 to 1)
- Limit: elbow.l bent past its range, 153° (limit ±145°) at u=0 (from u=0 to 0.1)
- Limit: elbow.r bent past its range, 153° (limit ±145°) at u=0 (from u=0 to 0.1)
- Limit: neck out of line with the spine, 12° (limit ±10°) at u=0.05 (from u=0 to 1)
- Slide: foot.l on its support moves 195.2 mm by u=1
- Slide: foot.r on its support moves 195.2 mm by u=1

### Pushups

pushup

- Penetration: foot.l through floor, 8.3 cm deep at u=0 (from u=0 to 1)
- Penetration: foot.r through floor, 8.3 cm deep at u=0 (from u=0 to 1)
- Penetration: foot.l through mat:box, 3.7 cm deep at u=0 (from u=0 to 1)
- Penetration: foot.r through mat:box, 3.7 cm deep at u=0 (from u=0 to 1)
- Penetration: trunk.upper through mat:box, 1.4 cm deep at u=0 (from u=0 to 0.025)
- Penetration: trunk.lower through mat:box, 0.6 cm deep at u=0 (from u=0)
- Penetration: hand.l through mat:box, 0.3 cm deep at u=0 (from u=0 to 1)
- Penetration: hand.r through mat:box, 0.3 cm deep at u=0 (from u=0 to 1)
- Penetration: forearm.l through mat:box, 0.3 cm deep at u=0.9 (from u=0 to 1)
- Penetration: forearm.r through mat:box, 0.3 cm deep at u=0.9 (from u=0 to 1)
- Limit: wrist.l bent sideways past its range, -57° (limit ±40°) at u=0.6 (from u=0 to 1)
- Limit: wrist.r bent sideways past its range, 57° (limit ±40°) at u=0.6 (from u=0 to 1)
- Limit: wrist.l hand turned on the forearm, 35° (limit ±25°) at u=1 (from u=0.525 to 1)
- Limit: wrist.r hand turned on the forearm, -35° (limit ±25°) at u=1 (from u=0.525 to 1)
- Limit: elbow.l bent past its range, 154° (limit ±145°) at u=0 (from u=0 to 0.1)
- Limit: elbow.r bent past its range, 154° (limit ±145°) at u=0 (from u=0 to 0.1)
- Limit: wrist.l bent back past its range, -77° (limit ±70°) at u=1 (from u=0.925 to 1)
- Limit: wrist.r bent back past its range, -77° (limit ±70°) at u=1 (from u=0.925 to 1)
- Limit: neck out of line with the spine, 12° (limit ±10°) at u=0.1 (from u=0 to 1)
- Slide: foot.l on its support moves 29.2 mm by u=1
- Slide: foot.r on its support moves 29.2 mm by u=1

### Dumbbell Squat

squat

- Penetration: thigh.l through dumbbell:cylinder, 8.3 cm deep at u=0.325 (from u=0.075 to 1)
- Penetration: thigh.r through dumbbell:cylinder, 8.3 cm deep at u=0.325 (from u=0.075 to 1)
- Penetration: shin.l through dumbbell:cylinder, 8.0 cm deep at u=0.2 (from u=0 to 0.525)
- Penetration: shin.r through dumbbell:cylinder, 8.0 cm deep at u=0.2 (from u=0 to 0.525)
- Penetration: trunk.lower through thigh.l, 4.5 cm deep at u=0 (from u=0 to 0.025)
- Penetration: trunk.lower through thigh.r, 4.5 cm deep at u=0 (from u=0 to 0.025)
- Limit: neck out of line with the spine, 19° (limit ±10°) at u=0 (from u=0 to 0.45)
- Slide: foot.l on its support moves 7.5 mm by u=0.95
- Slide: foot.r on its support moves 7.5 mm by u=0.95

### Dumbbell Squat To A Bench

squat

- Penetration: thigh.l through dumbbell:cylinder, 8.3 cm deep at u=0.325 (from u=0.075 to 1)
- Penetration: thigh.r through dumbbell:cylinder, 8.3 cm deep at u=0.325 (from u=0.075 to 1)
- Penetration: shin.l through dumbbell:cylinder, 8.0 cm deep at u=0.2 (from u=0 to 0.525)
- Penetration: shin.r through dumbbell:cylinder, 8.0 cm deep at u=0.2 (from u=0 to 0.525)
- Penetration: trunk.lower through thigh.l, 4.5 cm deep at u=0 (from u=0 to 0.025)
- Penetration: trunk.lower through thigh.r, 4.5 cm deep at u=0 (from u=0 to 0.025)
- Limit: neck out of line with the spine, 19° (limit ±10°) at u=0 (from u=0 to 0.45)
- Slide: foot.l on its support moves 7.5 mm by u=0.95
- Slide: foot.r on its support moves 7.5 mm by u=0.95

### Dumbbell Side Bend

sideBend · clearances: feet

- Penetration: thigh.r through dumbbell:capsule, 8.3 cm deep at u=0 (from u=0 to 0.6)
- Penetration: thigh.r through hand.r, 7.1 cm deep at u=0 (from u=0 to 0.45)
- Penetration: forearm.r through thigh.r, 5.1 cm deep at u=0 (from u=0 to 0.075)
- Penetration: thigh.r through dumbbell:cylinder, 3.9 cm deep at u=0 (from u=0 to 1)
- Limit: wrist.l bent sideways past its range, -45° (limit ±40°) at u=1 (from u=0.925 to 1)

### Cable Crunch

cableCrunch

- Penetration: head through cable:capsule, 8.0 cm deep at u=1 (from u=0 to 1)
- Penetration: head through tube:capsule, 3.8 cm deep at u=0.375 (from u=0 to 1)
- Penetration: foot.l through mat:box, 1.7 cm deep at u=0 (from u=0 to 1)
- Penetration: foot.r through mat:box, 1.7 cm deep at u=0 (from u=0 to 1)
- Penetration: foot.l through floor, 0.5 cm deep at u=0 (from u=0 to 1)
- Penetration: foot.r through floor, 0.5 cm deep at u=0 (from u=0 to 1)
- Limit: forearm.l turned past palm-up or palm-down, 237° (limit -5° to 185°) at u=0.975 (from u=0.65 to 1)
- Limit: forearm.r turned past palm-up or palm-down, 237° (limit -5° to 185°) at u=0.975 (from u=0.65 to 1)
- Limit: wrist.l hand turned on the forearm, -175° (limit ±25°) at u=0.025 (from u=0 to 1)
- Limit: wrist.r hand turned on the forearm, 175° (limit ±25°) at u=0.025 (from u=0 to 1)
- Limit: wrist.l bent toward the palm past its range, 138° (limit ±70°) at u=0 (from u=0 to 0.825)
- Limit: wrist.r bent toward the palm past its range, 138° (limit ±70°) at u=0 (from u=0 to 0.825)
- Limit: wrist.l bent sideways past its range, 85° (limit ±40°) at u=0.65 (from u=0.475 to 0.925)
- Limit: wrist.r bent sideways past its range, -85° (limit ±40°) at u=0.65 (from u=0.475 to 0.925)
- Limit: knee.l bending sideways, 85° (limit ±45°) at u=1 (from u=0 to 1)
- Limit: knee.r bending sideways, -85° (limit ±45°) at u=1 (from u=0 to 1)
- Limit: wrist.l bent back past its range, -79° (limit ±70°) at u=0.65 (from u=0.65 to 0.925)
- Limit: wrist.r bent back past its range, -79° (limit ±70°) at u=0.65 (from u=0.65 to 0.925)
- Limit: elbow.l bent past its range, 149° (limit ±145°) at u=0.275 (from u=0 to 1)
- Limit: elbow.r bent past its range, 149° (limit ±145°) at u=0.275 (from u=0 to 1)
- Limit: neck out of line with the spine, 12° (limit ±10°) at u=0 (from u=0 to 0.1)
- Slide: foot.l on its support moves 7.1 mm by u=1
- Slide: foot.r on its support moves 7.1 mm by u=1

### Standing Dumbbell Triceps Extension

triceps · clearances: feet

- Penetration: trunk.upper through dumbbell:cylinder, 7.9 cm deep at u=0 (from u=0 to 0.15)
- Penetration: neck through dumbbell:cylinder, 1.7 cm deep at u=0 (from u=0 to 0.05)
- Limit: forearm.l turned past palm-up or palm-down, -22° (limit -5° to 185°) at u=1 (from u=0.625 to 1)
- Limit: forearm.r turned past palm-up or palm-down, -22° (limit -5° to 185°) at u=1 (from u=0.625 to 1)
- Limit: elbow.l bent past its range, 147° (limit ±145°) at u=0 (from u=0)
- Limit: elbow.r bent past its range, 147° (limit ±145°) at u=0 (from u=0)

### Low Pulley Row To Neck

cableRow

- Penetration: trunk.lower through thigh.l, 7.5 cm deep at u=0 (from u=0 to 1)
- Penetration: trunk.lower through thigh.r, 7.5 cm deep at u=0 (from u=0 to 1)
- Penetration: foot.l through slab:box, 5.2 cm deep at u=1 (from u=0 to 1)
- Penetration: foot.r through slab:box, 5.2 cm deep at u=1 (from u=0 to 1)
- Penetration: pelvis through bench:box, 5.2 cm deep at u=0.075 (from u=0 to 1)
- Penetration: hand.l through grip:capsule, 0.4 cm deep at u=0 (from u=0)
- Penetration: hand.r through grip:capsule, 0.4 cm deep at u=0 (from u=0)
- Penetration: trunk.upper through thigh.l, 0.4 cm deep at u=0 (from u=0)
- Penetration: trunk.upper through thigh.r, 0.4 cm deep at u=0 (from u=0)
- Limit: elbow.l bent past its range, 160° (limit ±145°) at u=1 (from u=0.775 to 1)
- Limit: elbow.r bent past its range, 160° (limit ±145°) at u=1 (from u=0.775 to 1)
- Limit: wrist.l bent sideways past its range, -50° (limit ±40°) at u=0.575 (from u=0.225 to 0.8)
- Limit: wrist.r bent sideways past its range, 50° (limit ±40°) at u=0.575 (from u=0.225 to 0.8)

### Seated Cable Rows

cableRow

- Penetration: trunk.lower through thigh.l, 7.5 cm deep at u=0 (from u=0 to 1)
- Penetration: trunk.lower through thigh.r, 7.5 cm deep at u=0 (from u=0 to 1)
- Penetration: foot.l through slab:box, 5.2 cm deep at u=1 (from u=0 to 1)
- Penetration: foot.r through slab:box, 5.2 cm deep at u=1 (from u=0 to 1)
- Penetration: pelvis through bench:box, 5.2 cm deep at u=0.075 (from u=0 to 1)
- Penetration: forearm.l through thigh.l, 4.6 cm deep at u=0.375 (from u=0.175 to 0.725)
- Penetration: forearm.r through thigh.r, 4.6 cm deep at u=0.375 (from u=0.175 to 0.725)
- Penetration: forearm.l through shin.l, 4.4 cm deep at u=0.375 (from u=0.175 to 0.65)
- Penetration: forearm.r through shin.r, 4.4 cm deep at u=0.375 (from u=0.175 to 0.65)
- Penetration: thigh.l through hand.l, 2.4 cm deep at u=0.55 (from u=0.5 to 0.7)
- Penetration: thigh.r through hand.r, 2.4 cm deep at u=0.55 (from u=0.5 to 0.7)
- Penetration: upperarm.l through thigh.l, 2.3 cm deep at u=0.3 (from u=0.15 to 0.45)
- Penetration: upperarm.r through thigh.r, 2.3 cm deep at u=0.3 (from u=0.15 to 0.45)
- Penetration: shin.l through hand.l, 2.2 cm deep at u=0.55 (from u=0.5 to 0.625)
- Penetration: shin.r through hand.r, 2.2 cm deep at u=0.55 (from u=0.5 to 0.625)
- Penetration: upperarm.l through shin.l, 1.3 cm deep at u=0.2 (from u=0.15 to 0.225)
- Penetration: upperarm.r through shin.r, 1.3 cm deep at u=0.2 (from u=0.15 to 0.225)
- Penetration: trunk.upper through hand.l, 1.0 cm deep at u=1 (from u=1)
- Penetration: trunk.upper through hand.r, 1.0 cm deep at u=1 (from u=1)
- Penetration: trunk.upper through thigh.l, 0.4 cm deep at u=0 (from u=0)
- Penetration: trunk.upper through thigh.r, 0.4 cm deep at u=0 (from u=0)
- Limit: wrist.l bent toward the palm past its range, 159° (limit ±70°) at u=0.1 (from u=0.1 to 0.175)
- Limit: wrist.r bent toward the palm past its range, 159° (limit ±70°) at u=0.1 (from u=0.1 to 0.175)
- Limit: wrist.l bent sideways past its range, -94° (limit ±40°) at u=0.075 (from u=0 to 1)
- Limit: wrist.r bent sideways past its range, 94° (limit ±40°) at u=0.075 (from u=0 to 1)
- Limit: wrist.l hand turned on the forearm, 25° (limit ±25°) at u=0.15 (from u=0.15)
- Limit: wrist.r hand turned on the forearm, -25° (limit ±25°) at u=0.15 (from u=0.15)

### Seated One-arm Cable Pulley Rows

cableRow

- Penetration: trunk.lower through thigh.l, 7.5 cm deep at u=0 (from u=0 to 1)
- Penetration: trunk.lower through thigh.r, 7.5 cm deep at u=0 (from u=0 to 1)
- Penetration: foot.l through slab:box, 5.2 cm deep at u=1 (from u=0 to 1)
- Penetration: foot.r through slab:box, 5.2 cm deep at u=1 (from u=0 to 1)
- Penetration: pelvis through bench:box, 5.2 cm deep at u=0.075 (from u=0 to 1)
- Penetration: forearm.l through thigh.l, 4.6 cm deep at u=0.375 (from u=0.175 to 0.725)
- Penetration: forearm.l through shin.l, 4.4 cm deep at u=0.375 (from u=0.175 to 0.65)
- Penetration: thigh.l through hand.l, 2.4 cm deep at u=0.55 (from u=0.5 to 0.7)
- Penetration: upperarm.l through thigh.l, 2.3 cm deep at u=0.3 (from u=0.15 to 0.45)
- Penetration: shin.l through hand.l, 2.2 cm deep at u=0.55 (from u=0.5 to 0.625)
- Penetration: upperarm.l through shin.l, 1.3 cm deep at u=0.2 (from u=0.15 to 0.225)
- Penetration: trunk.upper through hand.l, 1.0 cm deep at u=1 (from u=1)
- Penetration: trunk.upper through thigh.l, 0.4 cm deep at u=0 (from u=0)
- Penetration: trunk.upper through thigh.r, 0.4 cm deep at u=0 (from u=0)
- Limit: wrist.l bent toward the palm past its range, 159° (limit ±70°) at u=0.1 (from u=0.1 to 0.175)
- Limit: wrist.l bent sideways past its range, -94° (limit ±40°) at u=0.075 (from u=0 to 1)
- Limit: wrist.l hand turned on the forearm, 25° (limit ±25°) at u=0.15 (from u=0.15)

### Elevated Cable Rows

cableRow

- Penetration: trunk.lower through thigh.l, 7.5 cm deep at u=0 (from u=0 to 1)
- Penetration: trunk.lower through thigh.r, 7.5 cm deep at u=0 (from u=0 to 1)
- Penetration: foot.l through slab:box, 5.2 cm deep at u=1 (from u=0 to 1)
- Penetration: foot.r through slab:box, 5.2 cm deep at u=1 (from u=0 to 1)
- Penetration: pelvis through bench:box, 5.2 cm deep at u=0.075 (from u=0 to 1)
- Penetration: forearm.l through thigh.l, 4.6 cm deep at u=0.375 (from u=0.175 to 0.725)
- Penetration: forearm.r through thigh.r, 4.6 cm deep at u=0.375 (from u=0.175 to 0.725)
- Penetration: forearm.l through shin.l, 4.4 cm deep at u=0.375 (from u=0.175 to 0.65)
- Penetration: forearm.r through shin.r, 4.4 cm deep at u=0.375 (from u=0.175 to 0.65)
- Penetration: thigh.l through hand.l, 2.4 cm deep at u=0.55 (from u=0.5 to 0.7)
- Penetration: thigh.r through hand.r, 2.4 cm deep at u=0.55 (from u=0.5 to 0.7)
- Penetration: upperarm.l through thigh.l, 2.3 cm deep at u=0.3 (from u=0.15 to 0.45)
- Penetration: upperarm.r through thigh.r, 2.3 cm deep at u=0.3 (from u=0.15 to 0.45)
- Penetration: shin.l through hand.l, 2.2 cm deep at u=0.55 (from u=0.5 to 0.625)
- Penetration: shin.r through hand.r, 2.2 cm deep at u=0.55 (from u=0.5 to 0.625)
- Penetration: upperarm.l through shin.l, 1.3 cm deep at u=0.2 (from u=0.15 to 0.225)
- Penetration: upperarm.r through shin.r, 1.3 cm deep at u=0.2 (from u=0.15 to 0.225)
- Penetration: trunk.upper through hand.l, 1.0 cm deep at u=1 (from u=1)
- Penetration: trunk.upper through hand.r, 1.0 cm deep at u=1 (from u=1)
- Penetration: trunk.upper through thigh.l, 0.4 cm deep at u=0 (from u=0)
- Penetration: trunk.upper through thigh.r, 0.4 cm deep at u=0 (from u=0)
- Limit: wrist.l bent toward the palm past its range, 159° (limit ±70°) at u=0.1 (from u=0.1 to 0.175)
- Limit: wrist.r bent toward the palm past its range, 159° (limit ±70°) at u=0.1 (from u=0.1 to 0.175)
- Limit: wrist.l bent sideways past its range, -94° (limit ±40°) at u=0.075 (from u=0 to 1)
- Limit: wrist.r bent sideways past its range, 94° (limit ±40°) at u=0.075 (from u=0 to 1)
- Limit: wrist.l hand turned on the forearm, 25° (limit ±25°) at u=0.15 (from u=0.15)
- Limit: wrist.r hand turned on the forearm, -25° (limit ±25°) at u=0.15 (from u=0.15)

### Alternating Kettlebell Press

press · clearances: head, feet

- Penetration: upperarm.l through kettlebell:sphere, 7.3 cm deep at u=0.075 (from u=0 to 0.55)
- Penetration: upperarm.r through kettlebell:sphere, 7.2 cm deep at u=0 (from u=0 to 1)
- Penetration: forearm.l through kettlebell:sphere, 6.1 cm deep at u=0.25 (from u=0 to 1)
- Penetration: forearm.r through kettlebell:sphere, 5.2 cm deep at u=0 (from u=0 to 1)
- Penetration: upperarm.l through kettlebell:cylinder, 4.9 cm deep at u=0.15 (from u=0 to 0.675)
- Penetration: upperarm.r through kettlebell:cylinder, 4.7 cm deep at u=0 (from u=0 to 1)
- Penetration: forearm.l through kettlebell:cylinder, 4.0 cm deep at u=0.25 (from u=0 to 1)
- Penetration: forearm.l through kettlebell:capsule, 3.2 cm deep at u=0.15 (from u=0 to 0.325)
- Penetration: forearm.r through kettlebell:cylinder, 3.2 cm deep at u=0 (from u=0 to 1)
- Penetration: hand.l through kettlebell:capsule, 3.0 cm deep at u=0.2 (from u=0 to 0.925)
- Penetration: hand.r through kettlebell:capsule, 2.8 cm deep at u=0 (from u=0 to 1)
- Penetration: forearm.r through kettlebell:capsule, 2.6 cm deep at u=0 (from u=0 to 1)
- Penetration: upperarm.l through kettlebell:capsule, 1.0 cm deep at u=0.075 (from u=0 to 0.15)
- Penetration: upperarm.r through kettlebell:capsule, 0.7 cm deep at u=0 (from u=0 to 1)
- Limit: wrist.l bent sideways past its range, -68° (limit ±40°) at u=0.6 (from u=0.3 to 1)
- Limit: elbow.l bent past its range, 162° (limit ±145°) at u=0.175 (from u=0 to 0.475)
- Limit: elbow.r bent past its range, 158° (limit ±145°) at u=0 (from u=0 to 1)

### Two-Arm Kettlebell Military Press

press · clearances: head, feet

- Penetration: upperarm.l through kettlebell:sphere, 7.3 cm deep at u=0.075 (from u=0 to 0.55)
- Penetration: upperarm.r through kettlebell:sphere, 7.3 cm deep at u=0.075 (from u=0 to 0.55)
- Penetration: forearm.l through kettlebell:sphere, 6.1 cm deep at u=0.25 (from u=0 to 1)
- Penetration: forearm.r through kettlebell:sphere, 6.1 cm deep at u=0.25 (from u=0 to 1)
- Penetration: upperarm.l through kettlebell:cylinder, 4.9 cm deep at u=0.15 (from u=0 to 0.675)
- Penetration: upperarm.r through kettlebell:cylinder, 4.9 cm deep at u=0.15 (from u=0 to 0.675)
- Penetration: forearm.l through kettlebell:cylinder, 4.0 cm deep at u=0.25 (from u=0 to 1)
- Penetration: forearm.r through kettlebell:cylinder, 4.0 cm deep at u=0.25 (from u=0 to 1)
- Penetration: forearm.l through kettlebell:capsule, 3.2 cm deep at u=0.15 (from u=0 to 0.325)
- Penetration: forearm.r through kettlebell:capsule, 3.2 cm deep at u=0.15 (from u=0 to 0.325)
- Penetration: hand.l through kettlebell:capsule, 3.0 cm deep at u=0.2 (from u=0 to 0.925)
- Penetration: hand.r through kettlebell:capsule, 3.0 cm deep at u=0.2 (from u=0 to 0.925)
- Penetration: upperarm.l through kettlebell:capsule, 1.0 cm deep at u=0.075 (from u=0 to 0.15)
- Penetration: upperarm.r through kettlebell:capsule, 1.0 cm deep at u=0.075 (from u=0 to 0.15)
- Limit: wrist.l bent sideways past its range, -68° (limit ±40°) at u=0.6 (from u=0.3 to 1)
- Limit: wrist.r bent sideways past its range, 68° (limit ±40°) at u=0.6 (from u=0.3 to 1)
- Limit: elbow.l bent past its range, 162° (limit ±145°) at u=0.175 (from u=0 to 0.475)
- Limit: elbow.r bent past its range, 162° (limit ±145°) at u=0.175 (from u=0 to 0.475)

### Narrow Stance Leg Press

legPress

- Penetration: trunk.lower through thigh.l, 6.9 cm deep at u=0 (from u=0 to 0.75)
- Penetration: trunk.lower through thigh.r, 6.9 cm deep at u=0 (from u=0 to 0.75)
- Penetration: foot.l through slab:box, 0.5 cm deep at u=0.975 (from u=0 to 1)
- Penetration: foot.r through slab:box, 0.5 cm deep at u=0.975 (from u=0 to 1)
- Limit: neck out of line with the spine, 12° (limit ±10°) at u=0 (from u=0 to 1)

### Leg Press

legPress

- Penetration: trunk.lower through thigh.l, 6.8 cm deep at u=0 (from u=0 to 0.725)
- Penetration: trunk.lower through thigh.r, 6.8 cm deep at u=0 (from u=0 to 0.725)
- Penetration: foot.l through slab:box, 0.5 cm deep at u=1 (from u=0 to 1)
- Penetration: foot.r through slab:box, 0.5 cm deep at u=1 (from u=0 to 1)
- Limit: neck out of line with the spine, 12° (limit ±10°) at u=0 (from u=0 to 1)

### Decline Push-Up

pushup

- Penetration: foot.l through block:box, 6.8 cm deep at u=0 (from u=0 to 1)
- Penetration: foot.r through block:box, 6.8 cm deep at u=0 (from u=0 to 1)
- Penetration: head through mat:box, 5.7 cm deep at u=0 (from u=0 to 0.1)
- Penetration: head through floor, 4.5 cm deep at u=0 (from u=0 to 0.075)
- Penetration: neck through mat:box, 1.2 cm deep at u=0 (from u=0)
- Penetration: hand.l through mat:box, 0.3 cm deep at u=0 (from u=0 to 1)
- Penetration: hand.r through mat:box, 0.3 cm deep at u=0 (from u=0 to 1)
- Penetration: forearm.l through mat:box, 0.3 cm deep at u=0.975 (from u=0 to 0.975)
- Penetration: forearm.r through mat:box, 0.3 cm deep at u=0.975 (from u=0 to 0.975)
- Limit: wrist.l bent sideways past its range, -59° (limit ±40°) at u=0.45 (from u=0 to 1)
- Limit: wrist.r bent sideways past its range, 59° (limit ±40°) at u=0.45 (from u=0 to 1)
- Limit: elbow.l bent past its range, 156° (limit ±145°) at u=0 (from u=0 to 0.125)
- Limit: elbow.r bent past its range, 156° (limit ±145°) at u=0 (from u=0 to 0.125)
- Limit: wrist.l hand turned on the forearm, 36° (limit ±25°) at u=1 (from u=0.025 to 1)
- Limit: wrist.r hand turned on the forearm, -36° (limit ±25°) at u=1 (from u=0.025 to 1)
- Limit: wrist.l bent back past its range, -76° (limit ±70°) at u=1 (from u=0.925 to 1)
- Limit: wrist.r bent back past its range, -76° (limit ±70°) at u=1 (from u=0.925 to 1)
- Limit: neck out of line with the spine, 12° (limit ±10°) at u=0.65 (from u=0 to 1)
- Slide: foot.l on its support moves 104.3 mm by u=1
- Slide: foot.r on its support moves 104.3 mm by u=1

### Push-Ups With Feet Elevated

pushup

- Penetration: foot.l through block:box, 6.8 cm deep at u=0 (from u=0 to 1)
- Penetration: foot.r through block:box, 6.8 cm deep at u=0 (from u=0 to 1)
- Penetration: head through mat:box, 5.7 cm deep at u=0 (from u=0 to 0.1)
- Penetration: head through floor, 4.5 cm deep at u=0 (from u=0 to 0.075)
- Penetration: neck through mat:box, 1.2 cm deep at u=0 (from u=0)
- Penetration: hand.l through mat:box, 0.3 cm deep at u=0 (from u=0 to 1)
- Penetration: hand.r through mat:box, 0.3 cm deep at u=0 (from u=0 to 1)
- Penetration: forearm.l through mat:box, 0.3 cm deep at u=0.975 (from u=0 to 0.975)
- Penetration: forearm.r through mat:box, 0.3 cm deep at u=0.975 (from u=0 to 0.975)
- Limit: wrist.l bent sideways past its range, -59° (limit ±40°) at u=0.45 (from u=0 to 1)
- Limit: wrist.r bent sideways past its range, 59° (limit ±40°) at u=0.45 (from u=0 to 1)
- Limit: elbow.l bent past its range, 156° (limit ±145°) at u=0 (from u=0 to 0.125)
- Limit: elbow.r bent past its range, 156° (limit ±145°) at u=0 (from u=0 to 0.125)
- Limit: wrist.l hand turned on the forearm, 36° (limit ±25°) at u=1 (from u=0.025 to 1)
- Limit: wrist.r hand turned on the forearm, -36° (limit ±25°) at u=1 (from u=0.025 to 1)
- Limit: wrist.l bent back past its range, -76° (limit ±70°) at u=1 (from u=0.925 to 1)
- Limit: wrist.r bent back past its range, -76° (limit ±70°) at u=1 (from u=0.925 to 1)
- Limit: neck out of line with the spine, 12° (limit ±10°) at u=0.65 (from u=0 to 1)
- Slide: foot.l on its support moves 104.3 mm by u=1
- Slide: foot.r on its support moves 104.3 mm by u=1

### Bent Over Two-Dumbbell Row With Palms In

row · clearances: feet

- Penetration: thigh.l through dumbbell:cylinder, 6.5 cm deep at u=0.275 (from u=0 to 1)
- Penetration: thigh.r through dumbbell:cylinder, 6.5 cm deep at u=0.275 (from u=0 to 1)
- Penetration: shin.l through dumbbell:cylinder, 6.3 cm deep at u=0.275 (from u=0 to 0.475)
- Penetration: shin.r through dumbbell:cylinder, 6.3 cm deep at u=0.275 (from u=0 to 0.475)
- Penetration: trunk.lower through dumbbell:cylinder, 1.5 cm deep at u=1 (from u=0.95 to 1)
- Limit: neck out of line with the spine, 28° (limit ±10°) at u=0 (from u=0 to 1)
- Limit: wrist.l bent sideways past its range, -42° (limit ±40°) at u=0.55 (from u=0.35 to 0.725)
- Limit: wrist.r bent sideways past its range, 42° (limit ±40°) at u=0.55 (from u=0.35 to 0.725)

### Flat Bench Lying Leg Raise

legRaise

- Penetration: foot.l through foot.r, 6.1 cm deep at u=1 (from u=0 to 1)
- Limit: wrist.l bent sideways past its range, -84° (limit ±40°) at u=0 (from u=0 to 1)
- Limit: wrist.r bent sideways past its range, 84° (limit ±40°) at u=0 (from u=0 to 1)
- Limit: knee.l bending sideways, -80° (limit ±45°) at u=0.4 (from u=0 to 1)
- Limit: knee.r bending sideways, 80° (limit ±45°) at u=0.4 (from u=0 to 1)

### Incline Hammer Curls

curl

- Penetration: thigh.l through dumbbell:cylinder, 5.7 cm deep at u=0.625 (from u=0.275 to 0.725)
- Penetration: thigh.r through dumbbell:cylinder, 5.7 cm deep at u=0.625 (from u=0.275 to 0.725)
- Penetration: pelvis through adjBench:box, 4.9 cm deep at u=0 (from u=0 to 1)
- Penetration: upperarm.l through dumbbell:cylinder, 4.7 cm deep at u=1 (from u=0.875 to 1)
- Penetration: upperarm.r through dumbbell:cylinder, 4.7 cm deep at u=1 (from u=0.875 to 1)
- Penetration: pelvis through dumbbell:cylinder, 4.1 cm deep at u=0.65 (from u=0.25 to 0.725)
- Penetration: trunk.upper through dumbbell:cylinder, 2.9 cm deep at u=0.9 (from u=0.75 to 1)
- Penetration: trunk.lower through dumbbell:cylinder, 1.5 cm deep at u=0.525 (from u=0.425 to 0.85)
- Limit: elbow.l bent past its range, 158° (limit ±145°) at u=1 (from u=0.9 to 1)
- Limit: elbow.r bent past its range, 158° (limit ±145°) at u=1 (from u=0.9 to 1)

### Bent Over Two-Dumbbell Row

row · clearances: feet

- Penetration: trunk.upper through dumbbell:cylinder, 5.5 cm deep at u=1 (from u=0.85 to 1)
- Penetration: trunk.lower through dumbbell:cylinder, 2.7 cm deep at u=1 (from u=0.925 to 1)
- Penetration: thigh.l through dumbbell:cylinder, 0.9 cm deep at u=0.275 (from u=0.175 to 0.4)
- Penetration: thigh.r through dumbbell:cylinder, 0.9 cm deep at u=0.275 (from u=0.175 to 0.4)
- Penetration: shin.l through dumbbell:cylinder, 0.7 cm deep at u=0.275 (from u=0.2 to 0.35)
- Penetration: shin.r through dumbbell:cylinder, 0.7 cm deep at u=0.275 (from u=0.2 to 0.35)
- Limit: neck out of line with the spine, 28° (limit ±10°) at u=0 (from u=0 to 1)

### Smith Machine Upright Row

uprightRow · clearances: feet

- Penetration: trunk.upper through forearm.l, 5.3 cm deep at u=0.8 (from u=0.725 to 0.875)
- Penetration: trunk.upper through forearm.r, 5.3 cm deep at u=0.8 (from u=0.725 to 0.875)
- Penetration: trunk.upper through hand.l, 4.9 cm deep at u=0.825 (from u=0.5 to 1)
- Penetration: trunk.upper through hand.r, 4.9 cm deep at u=0.825 (from u=0.5 to 1)
- Penetration: trunk.upper through barbell:capsule, 2.4 cm deep at u=0.95 (from u=0.65 to 1)
- Penetration: trunk.lower through barbell:capsule, 0.9 cm deep at u=0.475 (from u=0.425 to 0.525)
- Penetration: trunk.lower through forearm.l, 0.6 cm deep at u=0.35 (from u=0.3 to 0.375)
- Penetration: trunk.lower through forearm.r, 0.6 cm deep at u=0.35 (from u=0.3 to 0.375)
- Penetration: trunk.lower through hand.l, 0.4 cm deep at u=0.35 (from u=0.325 to 0.375)
- Penetration: trunk.lower through hand.r, 0.4 cm deep at u=0.35 (from u=0.325 to 0.375)
- Limit: wrist.l bent sideways past its range, -90° (limit ±40°) at u=0.625 (from u=0.05 to 1)
- Limit: wrist.r bent sideways past its range, 90° (limit ±40°) at u=0.625 (from u=0.05 to 1)
- Limit: forearm.l turned past palm-up or palm-down, -28° (limit -5° to 185°) at u=1 (from u=0.85 to 1)
- Limit: forearm.r turned past palm-up or palm-down, -28° (limit -5° to 185°) at u=1 (from u=0.85 to 1)
- Limit: wrist.l hand turned on the forearm, 48° (limit ±25°) at u=0.7 (from u=0.55 to 0.825)
- Limit: wrist.r hand turned on the forearm, -48° (limit ±25°) at u=0.7 (from u=0.55 to 0.825)

### Upright Barbell Row

uprightRow · clearances: feet

- Penetration: trunk.upper through forearm.l, 5.3 cm deep at u=0.8 (from u=0.725 to 0.875)
- Penetration: trunk.upper through forearm.r, 5.3 cm deep at u=0.8 (from u=0.725 to 0.875)
- Penetration: trunk.upper through hand.l, 4.9 cm deep at u=0.825 (from u=0.5 to 1)
- Penetration: trunk.upper through hand.r, 4.9 cm deep at u=0.825 (from u=0.5 to 1)
- Penetration: trunk.upper through barbell:capsule, 2.4 cm deep at u=0.95 (from u=0.65 to 1)
- Penetration: trunk.lower through barbell:capsule, 0.9 cm deep at u=0.475 (from u=0.425 to 0.525)
- Penetration: trunk.lower through forearm.l, 0.6 cm deep at u=0.35 (from u=0.3 to 0.375)
- Penetration: trunk.lower through forearm.r, 0.6 cm deep at u=0.35 (from u=0.3 to 0.375)
- Penetration: trunk.lower through hand.l, 0.4 cm deep at u=0.35 (from u=0.325 to 0.375)
- Penetration: trunk.lower through hand.r, 0.4 cm deep at u=0.35 (from u=0.325 to 0.375)
- Limit: wrist.l bent sideways past its range, -90° (limit ±40°) at u=0.625 (from u=0.05 to 1)
- Limit: wrist.r bent sideways past its range, 90° (limit ±40°) at u=0.625 (from u=0.05 to 1)
- Limit: forearm.l turned past palm-up or palm-down, -28° (limit -5° to 185°) at u=1 (from u=0.85 to 1)
- Limit: forearm.r turned past palm-up or palm-down, -28° (limit -5° to 185°) at u=1 (from u=0.85 to 1)
- Limit: wrist.l hand turned on the forearm, 48° (limit ±25°) at u=0.7 (from u=0.55 to 0.825)
- Limit: wrist.r hand turned on the forearm, -48° (limit ±25°) at u=0.7 (from u=0.55 to 0.825)

### Upright Cable Row

uprightRow · clearances: feet

- Penetration: trunk.upper through forearm.l, 5.3 cm deep at u=0.8 (from u=0.725 to 0.875)
- Penetration: trunk.upper through forearm.r, 5.3 cm deep at u=0.8 (from u=0.725 to 0.875)
- Penetration: trunk.upper through hand.l, 4.9 cm deep at u=0.825 (from u=0.5 to 1)
- Penetration: trunk.upper through hand.r, 4.9 cm deep at u=0.825 (from u=0.5 to 1)
- Penetration: trunk.upper through grip:capsule, 2.7 cm deep at u=0.95 (from u=0.625 to 1)
- Penetration: trunk.upper through cable:capsule, 1.4 cm deep at u=0.95 (from u=0.875 to 1)
- Penetration: trunk.lower through grip:capsule, 1.2 cm deep at u=0.475 (from u=0.4 to 0.55)
- Penetration: trunk.lower through forearm.l, 0.6 cm deep at u=0.35 (from u=0.3 to 0.375)
- Penetration: trunk.lower through forearm.r, 0.6 cm deep at u=0.35 (from u=0.3 to 0.375)
- Penetration: trunk.lower through hand.l, 0.4 cm deep at u=0.35 (from u=0.325 to 0.375)
- Penetration: trunk.lower through hand.r, 0.4 cm deep at u=0.35 (from u=0.325 to 0.375)
- Limit: wrist.l bent sideways past its range, -90° (limit ±40°) at u=0.625 (from u=0.05 to 1)
- Limit: wrist.r bent sideways past its range, 90° (limit ±40°) at u=0.625 (from u=0.05 to 1)
- Limit: forearm.l turned past palm-up or palm-down, -28° (limit -5° to 185°) at u=1 (from u=0.85 to 1)
- Limit: forearm.r turned past palm-up or palm-down, -28° (limit -5° to 185°) at u=1 (from u=0.85 to 1)
- Limit: wrist.l hand turned on the forearm, 48° (limit ±25°) at u=0.7 (from u=0.55 to 0.825)
- Limit: wrist.r hand turned on the forearm, -48° (limit ±25°) at u=0.7 (from u=0.55 to 0.825)

### Two-Arm Kettlebell Row

row · clearances: feet

- Penetration: thigh.l through kettlebell:sphere, 5.3 cm deep at u=0.675 (from u=0.4 to 1)
- Penetration: thigh.r through kettlebell:sphere, 5.3 cm deep at u=0.675 (from u=0.4 to 1)
- Penetration: shin.l through kettlebell:sphere, 5.1 cm deep at u=0.675 (from u=0.375 to 0.95)
- Penetration: shin.r through kettlebell:sphere, 5.1 cm deep at u=0.675 (from u=0.375 to 0.95)
- Penetration: thigh.l through kettlebell:cylinder, 4.8 cm deep at u=0.825 (from u=0.675 to 1)
- Penetration: thigh.r through kettlebell:cylinder, 4.8 cm deep at u=0.825 (from u=0.675 to 1)
- Penetration: shin.l through kettlebell:cylinder, 4.6 cm deep at u=0.825 (from u=0.575 to 0.975)
- Penetration: shin.r through kettlebell:cylinder, 4.6 cm deep at u=0.825 (from u=0.575 to 0.975)
- Penetration: hand.l through kettlebell:capsule, 0.9 cm deep at u=0.525 (from u=0 to 1)
- Penetration: hand.r through kettlebell:capsule, 0.9 cm deep at u=0.525 (from u=0 to 1)
- Limit: neck out of line with the spine, 28° (limit ±10°) at u=0 (from u=0 to 1)
- Limit: wrist.l bent sideways past its range, -42° (limit ±40°) at u=0.55 (from u=0.35 to 0.725)
- Limit: wrist.r bent sideways past its range, 42° (limit ±40°) at u=0.55 (from u=0.35 to 0.725)

### Reverse Cable Curl

curl · clearances: feet

- Penetration: thigh.l through grip:capsule, 4.8 cm deep at u=0 (from u=0 to 0.05)
- Penetration: thigh.r through grip:capsule, 4.8 cm deep at u=0 (from u=0 to 0.05)
- Limit: forearm.l turned past palm-up or palm-down, 187° (limit -5° to 185°) at u=0.1 (from u=0.1 to 0.125)
- Limit: forearm.r turned past palm-up or palm-down, 187° (limit -5° to 185°) at u=0.1 (from u=0.1 to 0.125)

### Alternating Cable Shoulder Press

press · clearances: head, feet

- Penetration: upperarm.l through cable:capsule, 4.7 cm deep at u=0.4 (from u=0.225 to 1)
- Penetration: forearm.l through cable:capsule, 3.2 cm deep at u=0.225 (from u=0.125 to 1)
- Penetration: upperarm.l through grip:capsule, 0.5 cm deep at u=0 (from u=0 to 0.05)
- Penetration: upperarm.r through grip:capsule, 0.5 cm deep at u=0 (from u=0 to 1)
- Limit: wrist.l bent sideways past its range, -68° (limit ±40°) at u=0.6 (from u=0.3 to 1)
- Limit: elbow.l bent past its range, 162° (limit ±145°) at u=0.175 (from u=0 to 0.475)
- Limit: elbow.r bent past its range, 158° (limit ±145°) at u=0 (from u=0 to 1)

### Reverse Machine Flyes

pecDeck

- Penetration: pelvis through seat:box, 4.6 cm deep at u=0 (from u=0 to 1)
- Penetration: foot.l through tower:box, 2.9 cm deep at u=0 (from u=0 to 1)
- Penetration: foot.r through tower:box, 2.9 cm deep at u=0 (from u=0 to 1)
- Limit: forearm.l turned past palm-up or palm-down, 270° (limit -5° to 185°) at u=0.65 (from u=0 to 0.65)
- Limit: forearm.r turned past palm-up or palm-down, 270° (limit -5° to 185°) at u=0.65 (from u=0 to 0.65)

### Smith Machine One-Arm Upright Row

uprightRow · clearances: feet

- Penetration: trunk.upper through forearm.l, 4.6 cm deep at u=0.825 (from u=0.75 to 0.85)
- Penetration: trunk.upper through hand.l, 4.1 cm deep at u=0.825 (from u=0.65 to 1)
- Penetration: trunk.upper through barbell:capsule, 2.4 cm deep at u=0.95 (from u=0.65 to 1)
- Penetration: trunk.lower through barbell:capsule, 0.9 cm deep at u=0.475 (from u=0.425 to 0.525)
- Limit: wrist.l bent sideways past its range, -92° (limit ±40°) at u=0.675 (from u=0.05 to 1)
- Limit: wrist.l hand turned on the forearm, 49° (limit ±25°) at u=0.75 (from u=0.575 to 0.85)
- Limit: forearm.l turned past palm-up or palm-down, -22° (limit -5° to 185°) at u=1 (from u=0.9 to 1)
- Limit: elbow.l bent past its range, 148° (limit ±145°) at u=0.925 (from u=0.825 to 1)

### Barbell Full Squat

squat

- Penetration: trunk.lower through thigh.l, 4.5 cm deep at u=0 (from u=0 to 0.05)
- Penetration: trunk.lower through thigh.r, 4.5 cm deep at u=0 (from u=0 to 0.05)
- Limit: neck out of line with the spine, 19° (limit ±10°) at u=0 (from u=0 to 0.45)
- Slide: foot.l on its support moves 8.8 mm by u=0.8
- Slide: foot.r on its support moves 8.8 mm by u=0.8

### Reverse Barbell Curl

curl · clearances: feet

- Penetration: thigh.l through barbell:capsule, 4.5 cm deep at u=0 (from u=0 to 0.05)
- Penetration: thigh.r through barbell:capsule, 4.5 cm deep at u=0 (from u=0 to 0.05)
- Limit: forearm.l turned past palm-up or palm-down, 187° (limit -5° to 185°) at u=0.1 (from u=0.1 to 0.125)
- Limit: forearm.r turned past palm-up or palm-down, 187° (limit -5° to 185°) at u=0.1 (from u=0.1 to 0.125)

### Butt Lift (Bridge)

bridge

- Penetration: upperarm.r through mat:box, 4.5 cm deep at u=0 (from u=0 to 0.125)
- Penetration: upperarm.l through mat:box, 4.5 cm deep at u=0 (from u=0 to 0.125)
- Penetration: forearm.r through mat:box, 4.1 cm deep at u=0 (from u=0 to 0.1)
- Penetration: forearm.l through mat:box, 4.1 cm deep at u=0 (from u=0 to 0.1)
- Penetration: upperarm.r through floor, 3.3 cm deep at u=0 (from u=0 to 0.075)
- Penetration: upperarm.l through floor, 3.3 cm deep at u=0 (from u=0 to 0.075)
- Penetration: forearm.r through floor, 2.9 cm deep at u=0 (from u=0 to 0.075)
- Penetration: forearm.l through floor, 2.9 cm deep at u=0 (from u=0 to 0.075)
- Penetration: foot.l through mat:box, 0.9 cm deep at u=0 (from u=0 to 1)
- Penetration: foot.r through mat:box, 0.9 cm deep at u=0 (from u=0 to 1)
- Limit: knee.l bent past its range, 158° (limit ±140°) at u=0 (from u=0 to 0.975)
- Limit: knee.r bent past its range, 158° (limit ±140°) at u=0 (from u=0 to 0.975)
- Limit: wrist.r bent sideways past its range, -54° (limit ±40°) at u=0.325 (from u=0 to 1)
- Limit: wrist.l bent sideways past its range, 54° (limit ±40°) at u=0.325 (from u=0 to 1)
- Limit: neck out of line with the spine, 10° (limit ±10°) at u=0.675 (from u=0.025 to 0.975)
- Slide: foot.l on its support moves 4.4 mm by u=0.95
- Slide: foot.r on its support moves 4.4 mm by u=0.95

### Narrow Stance Squats

squat

- Penetration: trunk.lower through thigh.l, 4.5 cm deep at u=0 (from u=0 to 0.05)
- Penetration: trunk.lower through thigh.r, 4.5 cm deep at u=0 (from u=0 to 0.05)
- Limit: neck out of line with the spine, 19° (limit ±10°) at u=0 (from u=0 to 0.45)
- Slide: foot.l on its support moves 11.8 mm by u=1
- Slide: foot.r on its support moves 11.8 mm by u=1

### Olympic Squat

squat

- Penetration: trunk.lower through thigh.l, 4.5 cm deep at u=0 (from u=0 to 0.05)
- Penetration: trunk.lower through thigh.r, 4.5 cm deep at u=0 (from u=0 to 0.05)
- Limit: neck out of line with the spine, 19° (limit ±10°) at u=0 (from u=0 to 0.45)
- Slide: foot.l on its support moves 12.8 mm by u=0.9
- Slide: foot.r on its support moves 12.8 mm by u=0.9

### Front Barbell Squat To A Bench

squat

- Penetration: upperarm.l through hand.l, 3.3 cm deep at u=1 (from u=0 to 1)
- Penetration: upperarm.r through hand.r, 3.3 cm deep at u=1 (from u=0 to 1)
- Penetration: trunk.upper through barbell:capsule, 1.3 cm deep at u=0.25 (from u=0 to 1)
- Limit: forearm.l turned past palm-up or palm-down, 268° (limit -5° to 185°) at u=0.25 (from u=0 to 0.75)
- Limit: forearm.r turned past palm-up or palm-down, 268° (limit -5° to 185°) at u=0.25 (from u=0 to 0.75)
- Limit: wrist.l hand turned on the forearm, 86° (limit ±25°) at u=0 (from u=0 to 1)
- Limit: wrist.r hand turned on the forearm, -86° (limit ±25°) at u=0 (from u=0 to 1)
- Limit: wrist.l bent sideways past its range, 84° (limit ±40°) at u=0.05 (from u=0 to 1)
- Limit: wrist.r bent sideways past its range, -84° (limit ±40°) at u=0.05 (from u=0 to 1)
- Limit: wrist.l bent back past its range, -103° (limit ±70°) at u=0 (from u=0 to 0.025)
- Limit: wrist.r bent back past its range, -103° (limit ±70°) at u=0 (from u=0 to 0.025)
- Limit: elbow.l bent past its range, 173° (limit ±145°) at u=1 (from u=0 to 1)
- Limit: elbow.r bent past its range, 173° (limit ±145°) at u=1 (from u=0 to 1)
- Limit: wrist.l bent toward the palm past its range, 82° (limit ±70°) at u=0.275 (from u=0.05 to 0.825)
- Limit: wrist.r bent toward the palm past its range, 82° (limit ±70°) at u=0.275 (from u=0.05 to 0.825)
- Limit: neck out of line with the spine, 12° (limit ±10°) at u=0 (from u=0 to 0.15)
- Slide: foot.l on its support moves 9.1 mm by u=0.85
- Slide: foot.r on its support moves 9.1 mm by u=0.85

### Front Squat (Clean Grip)

squat

- Penetration: upperarm.l through hand.l, 3.3 cm deep at u=1 (from u=0 to 1)
- Penetration: upperarm.r through hand.r, 3.3 cm deep at u=1 (from u=0 to 1)
- Penetration: trunk.upper through barbell:capsule, 1.3 cm deep at u=0.25 (from u=0 to 1)
- Limit: forearm.l turned past palm-up or palm-down, 268° (limit -5° to 185°) at u=0.25 (from u=0 to 0.75)
- Limit: forearm.r turned past palm-up or palm-down, 268° (limit -5° to 185°) at u=0.25 (from u=0 to 0.75)
- Limit: wrist.l hand turned on the forearm, 86° (limit ±25°) at u=0 (from u=0 to 1)
- Limit: wrist.r hand turned on the forearm, -86° (limit ±25°) at u=0 (from u=0 to 1)
- Limit: wrist.l bent sideways past its range, 84° (limit ±40°) at u=0.05 (from u=0 to 1)
- Limit: wrist.r bent sideways past its range, -84° (limit ±40°) at u=0.05 (from u=0 to 1)
- Limit: wrist.l bent back past its range, -103° (limit ±70°) at u=0 (from u=0 to 0.025)
- Limit: wrist.r bent back past its range, -103° (limit ±70°) at u=0 (from u=0 to 0.025)
- Limit: elbow.l bent past its range, 173° (limit ±145°) at u=1 (from u=0 to 1)
- Limit: elbow.r bent past its range, 173° (limit ±145°) at u=1 (from u=0 to 1)
- Limit: wrist.l bent toward the palm past its range, 82° (limit ±70°) at u=0.275 (from u=0.05 to 0.825)
- Limit: wrist.r bent toward the palm past its range, 82° (limit ±70°) at u=0.275 (from u=0.05 to 0.825)
- Limit: neck out of line with the spine, 12° (limit ±10°) at u=0 (from u=0 to 0.15)
- Slide: foot.l on its support moves 9.1 mm by u=0.85
- Slide: foot.r on its support moves 9.1 mm by u=0.85

### Kneeling Single-Arm High Pulley Row

kneelPull

- Penetration: upperarm.l through grip:capsule, 3.2 cm deep at u=1 (from u=0.925 to 1)
- Penetration: foot.l through mat:box, 1.7 cm deep at u=0 (from u=0 to 1)
- Penetration: foot.r through mat:box, 1.7 cm deep at u=0 (from u=0 to 1)
- Penetration: foot.l through floor, 0.5 cm deep at u=0 (from u=0 to 1)
- Penetration: foot.r through floor, 0.5 cm deep at u=0 (from u=0 to 1)
- Limit: knee.l bending sideways, 84° (limit ±45°) at u=0 (from u=0 to 1)
- Limit: knee.r bending sideways, -84° (limit ±45°) at u=0 (from u=0 to 1)
- Limit: elbow.l bent past its range, 160° (limit ±145°) at u=0.9 (from u=0.6 to 1)
- Limit: wrist.l bent sideways past its range, 47° (limit ±40°) at u=1 (from u=1)

### Close-Grip EZ Bar Curl

curl · clearances: feet

- Penetration: thigh.l through hand.l, 3.0 cm deep at u=0 (from u=0 to 0.025)
- Penetration: thigh.r through hand.r, 3.0 cm deep at u=0 (from u=0 to 0.025)
- Penetration: pelvis through hand.l, 1.2 cm deep at u=0 (from u=0 to 0.025)
- Penetration: pelvis through hand.r, 1.2 cm deep at u=0 (from u=0 to 0.025)
- Penetration: hand.l through barbell:capsule, 0.3 cm deep at u=0 (from u=0)
- Penetration: hand.r through barbell:capsule, 0.3 cm deep at u=0 (from u=0)
- Limit: forearm.l turned past palm-up or palm-down, -73° (limit -5° to 185°) at u=0 (from u=0 to 0.575)
- Limit: forearm.r turned past palm-up or palm-down, -73° (limit -5° to 185°) at u=0 (from u=0 to 0.575)

### Smith Machine Bent Over Row

row · clearances: feet

- Penetration: thigh.l through barbell:capsule, 2.6 cm deep at u=0 (from u=0 to 0.1)
- Penetration: thigh.r through barbell:capsule, 2.6 cm deep at u=0 (from u=0 to 0.1)
- Penetration: shin.l through barbell:capsule, 2.2 cm deep at u=0 (from u=0 to 0.05)
- Penetration: shin.r through barbell:capsule, 2.2 cm deep at u=0 (from u=0 to 0.05)
- Limit: neck out of line with the spine, 28° (limit ±10°) at u=0 (from u=0 to 1)

### Standing Cable Wood Chop

chop · clearances: feet

- Penetration: forearm.r through cable:capsule, 2.4 cm deep at u=0.875 (from u=0.725 to 1)
- Penetration: hand.l through hand.r, 2.1 cm deep at u=0.425 (from u=0.425)
- Penetration: hand.r through cable:capsule, 1.8 cm deep at u=0.4 (from u=0 to 1)
- Limit: forearm.l turned past palm-up or palm-down, -39° (limit -5° to 185°) at u=0.85 (from u=0.175 to 0.85)
- Limit: forearm.r turned past palm-up or palm-down, -35° (limit -5° to 185°) at u=0.425 (from u=0.025 to 0.95)
- Limit: wrist.r bent sideways past its range, 50° (limit ±40°) at u=0.25 (from u=0 to 0.475)
- Limit: wrist.l bent sideways past its range, -49° (limit ±40°) at u=0.925 (from u=0.625 to 1)
- Joint speed: wr.l at 4.2 m/s at u=0.552

### Close-Grip Standing Barbell Curl

curl · clearances: feet

- Penetration: thigh.l through hand.l, 2.3 cm deep at u=0 (from u=0 to 0.025)
- Penetration: thigh.r through hand.r, 2.3 cm deep at u=0 (from u=0 to 0.025)
- Limit: forearm.l turned past palm-up or palm-down, -57° (limit -5° to 185°) at u=0.025 (from u=0.025 to 0.525)
- Limit: forearm.r turned past palm-up or palm-down, -57° (limit -5° to 185°) at u=0.025 (from u=0.025 to 0.525)

### EZ-Bar Curl

curl · clearances: feet

- Penetration: thigh.l through hand.l, 2.0 cm deep at u=0 (from u=0)
- Penetration: thigh.r through hand.r, 2.0 cm deep at u=0 (from u=0)
- Limit: forearm.l turned past palm-up or palm-down, -45° (limit -5° to 185°) at u=0.05 (from u=0.05 to 0.5)
- Limit: forearm.r turned past palm-up or palm-down, -45° (limit -5° to 185°) at u=0.05 (from u=0.05 to 0.5)

### Standing Cable Lift

chop · clearances: feet

- Penetration: hand.r through cable:capsule, 1.8 cm deep at u=0.425 (from u=0 to 1)
- Penetration: upperarm.r through cable:capsule, 1.3 cm deep at u=1 (from u=1)
- Penetration: forearm.r through cable:capsule, 0.9 cm deep at u=1 (from u=1)
- Limit: forearm.r turned past palm-up or palm-down, -48° (limit -5° to 185°) at u=0 (from u=0 to 0.9)
- Limit: forearm.l turned past palm-up or palm-down, -35° (limit -5° to 185°) at u=0.575 (from u=0.35 to 0.8)
- Limit: wrist.r bent sideways past its range, 52° (limit ±40°) at u=0.075 (from u=0 to 0.375)
- Limit: wrist.l bent sideways past its range, -48° (limit ±40°) at u=0.725 (from u=0.55 to 1)
- Joint speed: wr.r at 4.9 m/s at u=0.526

### Dumbbell One-Arm Triceps Extension

triceps · clearances: feet

- Penetration: trunk.upper through dumbbell:cylinder, 1.7 cm deep at u=0 (from u=0 to 0.025)
- Limit: elbow.l bent past its range, 149° (limit ±145°) at u=0 (from u=0 to 0.025)

### Standing One-Arm Dumbbell Triceps Extension

triceps · clearances: feet

- Penetration: trunk.upper through dumbbell:cylinder, 1.7 cm deep at u=0 (from u=0 to 0.025)
- Limit: elbow.l bent past its range, 149° (limit ±145°) at u=0 (from u=0 to 0.025)

### Cable Rear Delt Fly

crossover · clearances: feet

- Penetration: forearm.l through cable:capsule, 1.7 cm deep at u=1 (from u=0.8 to 1)
- Penetration: forearm.r through cable:capsule, 1.7 cm deep at u=1 (from u=0.8 to 1)
- Penetration: hand.l through cable:capsule, 0.9 cm deep at u=0.05 (from u=0.05)
- Penetration: hand.r through cable:capsule, 0.9 cm deep at u=0.05 (from u=0.05)
- Limit: forearm.l turned past palm-up or palm-down, 230° (limit -5° to 185°) at u=0.65 (from u=0.525 to 0.65)
- Limit: forearm.r turned past palm-up or palm-down, 230° (limit -5° to 185°) at u=0.65 (from u=0.525 to 0.65)

### Kneeling High Pulley Row

kneelPull

- Penetration: foot.l through mat:box, 1.7 cm deep at u=0 (from u=0 to 1)
- Penetration: foot.r through mat:box, 1.7 cm deep at u=0 (from u=0 to 1)
- Penetration: foot.l through floor, 0.5 cm deep at u=0 (from u=0 to 1)
- Penetration: foot.r through floor, 0.5 cm deep at u=0 (from u=0 to 1)
- Limit: knee.l bending sideways, 84° (limit ±45°) at u=0 (from u=0 to 1)
- Limit: knee.r bending sideways, -84° (limit ±45°) at u=0 (from u=0 to 1)
- Limit: elbow.l bent past its range, 160° (limit ±145°) at u=0.9 (from u=0.6 to 1)
- Limit: elbow.r bent past its range, 160° (limit ±145°) at u=0.9 (from u=0.6 to 1)
- Limit: wrist.l bent sideways past its range, 47° (limit ±40°) at u=1 (from u=1)
- Limit: wrist.r bent sideways past its range, -47° (limit ±40°) at u=1 (from u=1)

### Decline Barbell Bench Press

benchPress · clearances: bench

- Penetration: foot.l through declineBench:cylinder, 1.5 cm deep at u=0 (from u=0 to 1)
- Penetration: foot.r through declineBench:cylinder, 1.5 cm deep at u=0 (from u=0 to 1)
- Contact: trunk.upper off bench, 4.0 cm away at u=0 (from u=0 to 1)
- Contact: pelvis off bench, 3.2 cm away at u=0 (from u=0 to 1)
- Contact: shin.l off declineBench:box, 1.0 cm away at u=0 (from u=0 to 1)
- Contact: shin.r off declineBench:box, 1.0 cm away at u=0 (from u=0 to 1)

### Decline Dumbbell Flyes

fly

- Penetration: foot.l through declineBench:cylinder, 1.5 cm deep at u=0 (from u=0 to 1)
- Penetration: foot.r through declineBench:cylinder, 1.5 cm deep at u=0 (from u=0 to 1)
- Contact: trunk.upper off bench, 4.0 cm away at u=0 (from u=0 to 1)
- Contact: pelvis off bench, 3.2 cm away at u=0 (from u=0 to 1)
- Contact: shin.l off declineBench:box, 1.0 cm away at u=0 (from u=0 to 1)
- Contact: shin.r off declineBench:box, 1.0 cm away at u=0 (from u=0 to 1)

### Decline Smith Press

benchPress · clearances: bench

- Penetration: foot.l through declineBench:cylinder, 1.5 cm deep at u=0 (from u=0 to 1)
- Penetration: foot.r through declineBench:cylinder, 1.5 cm deep at u=0 (from u=0 to 1)
- Contact: trunk.upper off bench, 4.0 cm away at u=0 (from u=0 to 1)
- Contact: pelvis off bench, 3.2 cm away at u=0 (from u=0 to 1)
- Contact: shin.l off declineBench:box, 1.0 cm away at u=0 (from u=0 to 1)
- Contact: shin.r off declineBench:box, 1.0 cm away at u=0 (from u=0 to 1)

### Smith Machine Decline Press

benchPress · clearances: bench

- Penetration: foot.l through declineBench:cylinder, 1.5 cm deep at u=0 (from u=0 to 1)
- Penetration: foot.r through declineBench:cylinder, 1.5 cm deep at u=0 (from u=0 to 1)
- Contact: trunk.upper off bench, 4.0 cm away at u=0 (from u=0 to 1)
- Contact: pelvis off bench, 3.2 cm away at u=0 (from u=0 to 1)
- Contact: shin.l off declineBench:box, 1.0 cm away at u=0 (from u=0 to 1)
- Contact: shin.r off declineBench:box, 1.0 cm away at u=0 (from u=0 to 1)

### Incline Cable Flye

fly

- Penetration: forearm.l through tube:capsule, 1.3 cm deep at u=1 (from u=0.85 to 1)
- Penetration: forearm.r through tube:capsule, 1.3 cm deep at u=1 (from u=0.85 to 1)
- Contact: trunk.upper off bench, 5.0 cm away at u=0 (from u=0 to 1)
- Contact: pelvis off bench, 0.5 cm away at u=0 (from u=0 to 1)

### One-Arm Kettlebell Swings

kbSwing · clearances: feet

- Penetration: thigh.r through hand.r, 1.2 cm deep at u=0.225 (from u=0.175 to 0.275)
- Penetration: shin.r through hand.r, 1.0 cm deep at u=0.225 (from u=0.175 to 0.275)
- Penetration: hand.l through kettlebell:capsule, 0.6 cm deep at u=1 (from u=1)
- Limit: neck out of line with the spine, 30° (limit ±10°) at u=0 (from u=0 to 0.65)
- Slide: foot.l on its support moves 2.3 mm by u=0.8
- Slide: foot.r on its support moves 2.3 mm by u=0.8

### Leg Extensions

legMachine

- Penetration: shin.l through tube:capsule, 0.9 cm deep at u=1 (from u=0 to 1)
- Penetration: shin.r through tube:capsule, 0.9 cm deep at u=1 (from u=0 to 1)
- Penetration: foot.l through tube:capsule, 0.5 cm deep at u=0.975 (from u=0 to 1)
- Penetration: foot.r through tube:capsule, 0.5 cm deep at u=0.975 (from u=0 to 1)
- Limit: wrist.l bent sideways past its range, 51° (limit ±40°) at u=0 (from u=0 to 1)
- Limit: wrist.r bent sideways past its range, -51° (limit ±40°) at u=0 (from u=0 to 1)

### Seated Leg Curl

legMachine

- Penetration: shin.l through tube:capsule, 0.9 cm deep at u=0 (from u=0 to 1)
- Penetration: shin.r through tube:capsule, 0.9 cm deep at u=0 (from u=0 to 1)
- Limit: wrist.l bent sideways past its range, 51° (limit ±40°) at u=0 (from u=0 to 1)
- Limit: wrist.r bent sideways past its range, -51° (limit ±40°) at u=0 (from u=0 to 1)

### Barbell Glute Bridge

bridge

- Penetration: foot.l through mat:box, 0.9 cm deep at u=0 (from u=0 to 1)
- Penetration: foot.r through mat:box, 0.9 cm deep at u=0 (from u=0 to 1)
- Limit: wrist.l bent sideways past its range, -74° (limit ±40°) at u=1 (from u=0 to 1)
- Limit: wrist.r bent sideways past its range, 74° (limit ±40°) at u=1 (from u=0 to 1)
- Limit: wrist.l hand turned on the forearm, 46° (limit ±25°) at u=1 (from u=0 to 1)
- Limit: wrist.r hand turned on the forearm, -46° (limit ±25°) at u=1 (from u=0 to 1)
- Limit: knee.l bent past its range, 158° (limit ±140°) at u=0 (from u=0 to 0.975)
- Limit: knee.r bent past its range, 158° (limit ±140°) at u=0 (from u=0 to 0.975)
- Limit: neck out of line with the spine, 10° (limit ±10°) at u=0.675 (from u=0.025 to 0.975)
- Slide: foot.l on its support moves 4.4 mm by u=0.95
- Slide: foot.r on its support moves 4.4 mm by u=0.95

### Cable Crossover

crossover · clearances: feet

- Penetration: forearm.l through tube:capsule, 0.6 cm deep at u=1 (from u=0.925 to 1)
- Penetration: forearm.r through tube:capsule, 0.6 cm deep at u=1 (from u=0.925 to 1)
- Clearance: feet flat on the floor (foot.l ball off the floor), 2.4 cm (limit 0.5 cm) at u=0 (from u=0 to 1)
- Clearance: feet flat on the floor (foot.r ball off the floor), 1.0 cm (limit 0.5 cm) at u=0 (from u=0 to 1)

### Dips - Chest Version

dip

- Penetration: forearm.l through tube:capsule, 0.5 cm deep at u=0 (from u=0 to 1)
- Penetration: forearm.r through tube:capsule, 0.5 cm deep at u=0 (from u=0 to 1)
- Limit: wrist.l bent sideways past its range, 71° (limit ±40°) at u=0 (from u=0 to 1)
- Limit: wrist.r bent sideways past its range, -71° (limit ±40°) at u=0 (from u=0 to 1)
- Limit: wrist.l hand turned on the forearm, -55° (limit ±25°) at u=1 (from u=0 to 1)
- Limit: wrist.r hand turned on the forearm, 55° (limit ±25°) at u=1 (from u=0 to 1)
- Limit: wrist.l bent back past its range, -76° (limit ±70°) at u=1 (from u=0.925 to 1)
- Limit: wrist.r bent back past its range, -76° (limit ±70°) at u=1 (from u=0.925 to 1)

### Dips - Triceps Version

dip

- Penetration: forearm.l through tube:capsule, 0.5 cm deep at u=0 (from u=0 to 1)
- Penetration: forearm.r through tube:capsule, 0.5 cm deep at u=0 (from u=0 to 1)
- Penetration: trunk.lower through hand.l, 0.4 cm deep at u=0.225 (from u=0.175 to 0.275)
- Penetration: trunk.lower through hand.r, 0.4 cm deep at u=0.225 (from u=0.175 to 0.275)
- Limit: forearm.l turned past palm-up or palm-down, 186° (limit -5° to 185°) at u=1 (from u=1)
- Limit: forearm.r turned past palm-up or palm-down, 186° (limit -5° to 185°) at u=1 (from u=1)
- Limit: wrist.l hand turned on the forearm, -61° (limit ±25°) at u=1 (from u=0 to 1)
- Limit: wrist.r hand turned on the forearm, 61° (limit ±25°) at u=1 (from u=0 to 1)
- Limit: wrist.l bent sideways past its range, 69° (limit ±40°) at u=0 (from u=0 to 1)
- Limit: wrist.r bent sideways past its range, -69° (limit ±40°) at u=0 (from u=0 to 1)
- Limit: wrist.l bent back past its range, -84° (limit ±70°) at u=1 (from u=0.875 to 1)
- Limit: wrist.r bent back past its range, -84° (limit ±70°) at u=1 (from u=0.875 to 1)

### Parallel Bar Dip

dip

- Penetration: forearm.l through tube:capsule, 0.5 cm deep at u=0 (from u=0 to 1)
- Penetration: forearm.r through tube:capsule, 0.5 cm deep at u=0 (from u=0 to 1)
- Limit: forearm.l turned past palm-up or palm-down, 186° (limit -5° to 185°) at u=1 (from u=1)
- Limit: forearm.r turned past palm-up or palm-down, 186° (limit -5° to 185°) at u=1 (from u=1)
- Limit: wrist.l hand turned on the forearm, -60° (limit ±25°) at u=1 (from u=0 to 1)
- Limit: wrist.r hand turned on the forearm, 60° (limit ±25°) at u=1 (from u=0 to 1)
- Limit: wrist.l bent sideways past its range, 69° (limit ±40°) at u=0 (from u=0 to 1)
- Limit: wrist.r bent sideways past its range, -69° (limit ±40°) at u=0 (from u=0 to 1)
- Limit: wrist.l bent back past its range, -83° (limit ±70°) at u=1 (from u=0.875 to 1)
- Limit: wrist.r bent back past its range, -83° (limit ±70°) at u=1 (from u=0.875 to 1)

### Flat Bench Cable Flyes

fly

- Penetration: forearm.l through tube:capsule, 0.4 cm deep at u=1 (from u=0.975 to 1)
- Penetration: forearm.r through tube:capsule, 0.4 cm deep at u=1 (from u=0.975 to 1)
- Contact: trunk.upper off bench, 3.0 cm away at u=0 (from u=0 to 1)
- Contact: pelvis off bench, 2.2 cm away at u=0 (from u=0 to 1)

### Barbell Bench Press - Medium Grip

benchPress · clearances: bench

- Contact: trunk.upper off bench, 3.0 cm away at u=0 (from u=0 to 1)
- Contact: pelvis off bench, 2.2 cm away at u=0 (from u=0 to 1)
- Clearance: forearms upright under the weight at the bottom (forearm.l), 17° from upright (limit 10°) at u=0 (from u=0)
- Clearance: forearms upright under the weight at the bottom (forearm.r), 17° from upright (limit 10°) at u=0 (from u=0)

### Barbell Incline Bench Press - Medium Grip

benchPress · clearances: bench

- Contact: trunk.upper off bench, 5.0 cm away at u=0 (from u=0 to 1)
- Contact: pelvis off bench, 0.5 cm away at u=0 (from u=0 to 1)
- Clearance: forearms upright under the weight at the bottom (forearm.l), 34° from upright (limit 10°) at u=0 (from u=0)
- Clearance: forearms upright under the weight at the bottom (forearm.r), 34° from upright (limit 10°) at u=0 (from u=0)

### Bench Press - Powerlifting

benchPress · clearances: bench

- Contact: trunk.upper off bench, 3.0 cm away at u=0 (from u=0 to 1)
- Contact: pelvis off bench, 2.2 cm away at u=0 (from u=0 to 1)
- Clearance: forearms upright under the weight at the bottom (forearm.l), 18° from upright (limit 10°) at u=0 (from u=0)
- Clearance: forearms upright under the weight at the bottom (forearm.r), 18° from upright (limit 10°) at u=0 (from u=0)

### Box Squat

squat

- Contact: foot.l off floor, 0.8 cm away at u=1 (from u=1)
- Contact: foot.r off floor, 0.8 cm away at u=1 (from u=1)
- Limit: neck out of line with the spine, 19° (limit ±10°) at u=0 (from u=0 to 0.45)
- Slide: foot.l on its support moves 6.1 mm by u=0.65
- Slide: foot.r on its support moves 6.1 mm by u=0.65

### One-Arm High-Pulley Cable Side Bends

sideBend · clearances: feet

- Contact: forearm.r off trunk.upper, 99999999995.8 cm away at u=0 (from u=0 to 1)
- Limit: elbow.r bent past its range, 161° (limit ±145°) at u=0.4 (from u=0 to 1)
- Limit: wrist.l bent sideways past its range, -41° (limit ±40°) at u=0 (from u=0 to 0.025)

### Smith Machine Bench Press

benchPress · clearances: bench

- Contact: trunk.upper off bench, 3.0 cm away at u=0 (from u=0 to 1)
- Contact: pelvis off bench, 2.2 cm away at u=0 (from u=0 to 1)
- Clearance: forearms upright under the weight at the bottom (forearm.l), 17° from upright (limit 10°) at u=0 (from u=0)
- Clearance: forearms upright under the weight at the bottom (forearm.r), 17° from upright (limit 10°) at u=0 (from u=0)

### Smith Machine Incline Bench Press

benchPress · clearances: bench

- Contact: trunk.upper off bench, 5.0 cm away at u=0 (from u=0 to 1)
- Contact: pelvis off bench, 0.5 cm away at u=0 (from u=0 to 1)
- Clearance: forearms upright under the weight at the bottom (forearm.l), 34° from upright (limit 10°) at u=0 (from u=0)
- Clearance: forearms upright under the weight at the bottom (forearm.r), 34° from upright (limit 10°) at u=0 (from u=0)

### Smith Machine Stiff-Legged Deadlift

hinge · clearances: feet

- Clearance: feet flat on the floor (foot.l ball off the floor), 3.0 cm (limit 0.5 cm) at u=0 (from u=0 to 0.3)
- Clearance: feet flat on the floor (foot.r ball off the floor), 3.0 cm (limit 0.5 cm) at u=0 (from u=0 to 0.3)
- Limit: neck out of line with the spine, 35° (limit ±10°) at u=0 (from u=0 to 0.7)

### Standing Barbell Press Behind Neck

press · clearances: head, feet

- Clearance: bar or handle at least 5 cm from the head (barbell:capsule), 4.0 cm from the head (wanted ≥ 5.0 cm) at u=0.45 (from u=0.25 to 0.55)
- Limit: neck out of line with the spine, 14° (limit ±10°) at u=0 (from u=0 to 1)

### Standing Military Press

press · clearances: head, feet

- Clearance: bar or handle at least 5 cm from the head (barbell:capsule), 1.5 cm from the head (wanted ≥ 5.0 cm) at u=0.525 (from u=0.15 to 0.7)
- Limit: elbow.l bent past its range, 158° (limit ±145°) at u=0.025 (from u=0 to 0.375)
- Limit: elbow.r bent past its range, 158° (limit ±145°) at u=0.025 (from u=0 to 0.375)

### Stiff-Legged Barbell Deadlift

hinge · clearances: feet

- Clearance: feet flat on the floor (foot.l ball off the floor), 4.2 cm (limit 0.5 cm) at u=0 (from u=0 to 0.425)
- Clearance: feet flat on the floor (foot.r ball off the floor), 4.2 cm (limit 0.5 cm) at u=0 (from u=0 to 0.425)
- Limit: neck out of line with the spine, 35° (limit ±10°) at u=0 (from u=0 to 0.7)

### Triceps Overhead Extension with Rope

triceps · clearances: feet

- Clearance: feet flat on the floor (foot.l ball off the floor), 4.9 cm (limit 0.5 cm) at u=0 (from u=0 to 1)
- Clearance: feet flat on the floor (foot.r ball off the floor), 3.1 cm (limit 0.5 cm) at u=0 (from u=0 to 1)
- Limit: forearm.l turned past palm-up or palm-down, -40° (limit -5° to 185°) at u=1 (from u=0.9 to 1)
- Limit: forearm.r turned past palm-up or palm-down, -40° (limit -5° to 185°) at u=1 (from u=0.9 to 1)
- Limit: elbow.l bent past its range, 147° (limit ±145°) at u=0 (from u=0)
- Limit: elbow.r bent past its range, 147° (limit ±145°) at u=0 (from u=0)

### Wide Stance Stiff Legs

hinge · clearances: feet

- Clearance: feet flat on the floor (foot.l ball off the floor), 5.9 cm (limit 0.5 cm) at u=0 (from u=0 to 1)
- Clearance: feet flat on the floor (foot.r ball off the floor), 5.9 cm (limit 0.5 cm) at u=0 (from u=0 to 1)
- Limit: neck out of line with the spine, 35° (limit ±10°) at u=0 (from u=0 to 0.7)

### Wide-Grip Barbell Bench Press

benchPress · clearances: bench

- Contact: trunk.upper off bench, 3.0 cm away at u=0 (from u=0 to 1)
- Contact: pelvis off bench, 2.2 cm away at u=0 (from u=0 to 1)
- Clearance: forearms upright under the weight at the bottom (forearm.l), 25° from upright (limit 10°) at u=0 (from u=0)
- Clearance: forearms upright under the weight at the bottom (forearm.r), 25° from upright (limit 10°) at u=0 (from u=0)

### Barbell Step Ups

stepUp

- Penetration: foot.r through block:box, 9.5 cm deep at u=0.425 (from u=0.2 to 0.975)
- Penetration: trunk.lower through thigh.l, 4.1 cm deep at u=0 (from u=0)
- Penetration: shin.r through block:box, 2.7 cm deep at u=0.125 (from u=0.025 to 0.9)

### Dumbbell Step Ups

stepUp

- Penetration: foot.r through block:box, 9.5 cm deep at u=0.425 (from u=0.2 to 0.975)
- Penetration: trunk.lower through thigh.l, 4.1 cm deep at u=0 (from u=0)
- Penetration: thigh.l through dumbbell:cylinder, 2.9 cm deep at u=0.525 (from u=0.25 to 0.9)
- Penetration: thigh.r through dumbbell:cylinder, 2.7 cm deep at u=0.075 (from u=0 to 1)
- Penetration: shin.r through block:box, 2.7 cm deep at u=0.125 (from u=0.025 to 0.9)

### Dumbbell Alternate Bicep Curl

curl · clearances: feet

- Penetration: thigh.l through dumbbell:cylinder, 8.5 cm deep at u=0.05 (from u=0 to 0.175)
- Penetration: thigh.r through dumbbell:cylinder, 7.3 cm deep at u=0 (from u=0 to 1)

### Dumbbell Bicep Curl

curl · clearances: feet

- Penetration: thigh.l through dumbbell:cylinder, 8.5 cm deep at u=0.05 (from u=0 to 0.175)
- Penetration: thigh.r through dumbbell:cylinder, 8.5 cm deep at u=0.05 (from u=0 to 0.175)

### Seated Dumbbell Curl

curl

- Penetration: thigh.l through dumbbell:cylinder, 7.8 cm deep at u=0.4 (from u=0 to 0.575)
- Penetration: thigh.r through dumbbell:cylinder, 7.8 cm deep at u=0.4 (from u=0 to 0.575)
- Penetration: thigh.l through dumbbell:capsule, 7.4 cm deep at u=0.425 (from u=0.3 to 0.5)
- Penetration: thigh.r through dumbbell:capsule, 7.4 cm deep at u=0.425 (from u=0.3 to 0.5)
- Penetration: thigh.l through hand.l, 7.3 cm deep at u=0.45 (from u=0.225 to 0.525)
- Penetration: thigh.r through hand.r, 7.3 cm deep at u=0.45 (from u=0.225 to 0.525)
- Penetration: shin.l through dumbbell:cylinder, 5.2 cm deep at u=0.3 (from u=0.175 to 0.575)
- Penetration: shin.r through dumbbell:cylinder, 5.2 cm deep at u=0.3 (from u=0.175 to 0.575)
- Penetration: pelvis through bench:box, 4.8 cm deep at u=0 (from u=0 to 1)
- Penetration: shin.l through hand.l, 3.5 cm deep at u=0.475 (from u=0.375 to 0.525)
- Penetration: shin.r through hand.r, 3.5 cm deep at u=0.475 (from u=0.375 to 0.525)
- Penetration: shin.l through dumbbell:capsule, 1.8 cm deep at u=0.45 (from u=0.4 to 0.475)
- Penetration: shin.r through dumbbell:capsule, 1.8 cm deep at u=0.45 (from u=0.4 to 0.475)

### Alternate Hammer Curl

curl · clearances: feet

- Penetration: thigh.l through dumbbell:cylinder, 7.5 cm deep at u=0.025 (from u=0 to 0.175)
- Penetration: thigh.r through dumbbell:cylinder, 7.3 cm deep at u=0 (from u=0 to 1)

### Hammer Curls

curl · clearances: feet

- Penetration: thigh.l through dumbbell:cylinder, 7.5 cm deep at u=0.025 (from u=0 to 0.175)
- Penetration: thigh.r through dumbbell:cylinder, 7.5 cm deep at u=0.025 (from u=0 to 0.175)

### Barbell Deadlift

hinge · clearances: feet

- Penetration: trunk.lower through thigh.l, 7.5 cm deep at u=0 (from u=0 to 0.375)
- Penetration: trunk.lower through thigh.r, 7.5 cm deep at u=0 (from u=0 to 0.375)
- Penetration: trunk.upper through thigh.l, 0.5 cm deep at u=0 (from u=0 to 0.05)
- Penetration: trunk.upper through thigh.r, 0.5 cm deep at u=0 (from u=0 to 0.05)

### Split Squat with Dumbbells

lunge

- Penetration: shin.r through bench:box, 6.9 cm deep at u=0.15 (from u=0 to 0.6)
- Penetration: foot.r through bench:box, 5.6 cm deep at u=0 (from u=0 to 1)
- Penetration: thigh.r through dumbbell:cylinder, 2.6 cm deep at u=0.1 (from u=0 to 1)
- Penetration: thigh.l through dumbbell:cylinder, 2.2 cm deep at u=0.925 (from u=0.425 to 1)
- Slide: foot.r on its support moves 5.5 mm by u=1

### Smith Single-Leg Split Squat

lunge

- Penetration: shin.r through bench:box, 6.9 cm deep at u=0.15 (from u=0 to 0.6)
- Penetration: foot.r through bench:box, 5.6 cm deep at u=0 (from u=0 to 1)
- Slide: foot.r on its support moves 5.7 mm by u=1

### Machine Chest Press

machine

- Penetration: pelvis through beam:box, 5.8 cm deep at u=0 (from u=0 to 1)
- Penetration: pelvis through seat:box, 4.8 cm deep at u=0 (from u=0 to 1)

### Standing Low-Pulley Deltoid Raise

raise · clearances: feet

- Penetration: shin.r through cable:capsule, 5.7 cm deep at u=0.6 (from u=0.225 to 1)
- Penetration: thigh.l through cable:capsule, 5.1 cm deep at u=0.825 (from u=0.275 to 1)
- Penetration: thigh.r through cable:capsule, 4.9 cm deep at u=1 (from u=0.7 to 1)

### Cable Hammer Curls - Rope Attachment

curl · clearances: feet

- Penetration: pelvis through forearm.l, 4.9 cm deep at u=0 (from u=0 to 0.025)
- Penetration: pelvis through forearm.r, 4.9 cm deep at u=0 (from u=0 to 0.025)
- Penetration: thigh.l through hand.l, 4.4 cm deep at u=0 (from u=0 to 0.05)
- Penetration: thigh.r through hand.r, 4.4 cm deep at u=0 (from u=0 to 0.05)
- Penetration: pelvis through hand.l, 4.1 cm deep at u=0 (from u=0 to 0.075)
- Penetration: pelvis through hand.r, 4.1 cm deep at u=0 (from u=0 to 0.075)
- Penetration: thigh.l through tube:capsule, 0.6 cm deep at u=0 (from u=0)
- Penetration: thigh.r through tube:capsule, 0.6 cm deep at u=0 (from u=0)
- Penetration: pelvis through tube:capsule, 0.4 cm deep at u=0 (from u=0)

### Seated Machine Row

machine

- Penetration: pelvis through seat:box, 4.8 cm deep at u=0 (from u=0 to 1)

### Seated Side Lateral Raise

raise

- Penetration: pelvis through bench:box, 4.8 cm deep at u=0 (from u=0 to 1)

### Front Cable Raise

raise · clearances: feet

- Penetration: thigh.l through cable:capsule, 4.5 cm deep at u=1 (from u=0.375 to 1)

### Butterfly

pecDeck

- Penetration: pelvis through seat:box, 4.2 cm deep at u=0 (from u=0 to 1)

### Front Dumbbell Raise

raise · clearances: feet

- Penetration: thigh.l through dumbbell:cylinder, 3.2 cm deep at u=0 (from u=0 to 0.05)
- Penetration: thigh.r through dumbbell:cylinder, 3.2 cm deep at u=0 (from u=0 to 1)

### Front Two-Dumbbell Raise

raise · clearances: feet

- Penetration: thigh.l through dumbbell:cylinder, 3.2 cm deep at u=0 (from u=0 to 0.05)
- Penetration: thigh.r through dumbbell:cylinder, 3.2 cm deep at u=0 (from u=0 to 0.05)

### Standing Dumbbell Straight-Arm Front Delt Raise Above Head

raise · clearances: feet

- Penetration: thigh.l through dumbbell:cylinder, 3.2 cm deep at u=0 (from u=0 to 0.025)
- Penetration: thigh.r through dumbbell:cylinder, 3.2 cm deep at u=0 (from u=0 to 0.025)

### Dumbbell Shrug

shrug · clearances: feet

- Penetration: thigh.l through dumbbell:cylinder, 1.9 cm deep at u=0.675 (from u=0 to 1)
- Penetration: thigh.r through dumbbell:cylinder, 1.9 cm deep at u=0.675 (from u=0 to 1)

### Cable Shrugs

shrug · clearances: feet

- Penetration: pelvis through grip:capsule, 1.9 cm deep at u=1 (from u=0.55 to 1)
- Penetration: pelvis through cable:capsule, 0.6 cm deep at u=1 (from u=0.85 to 1)

### Barbell Shrug

shrug · clearances: feet

- Penetration: pelvis through barbell:capsule, 1.6 cm deep at u=1 (from u=0.6 to 1)

### Standing Biceps Cable Curl

curl · clearances: feet

- Penetration: thigh.l through grip:capsule, 0.4 cm deep at u=0 (from u=0)
- Penetration: thigh.r through grip:capsule, 0.4 cm deep at u=0 (from u=0)

### Barbell Shrug Behind The Back

shrug · clearances: feet

- Limit: forearm.l turned past palm-up or palm-down, -20° (limit -5° to 185°) at u=0.25 (from u=0 to 1)
- Limit: forearm.r turned past palm-up or palm-down, -20° (limit -5° to 185°) at u=0.25 (from u=0 to 1)

### Barbell Side Bend

sideBend · clearances: feet

- Limit: wrist.l hand turned on the forearm, 100° (limit ±25°) at u=0 (from u=0 to 0.65)
- Limit: wrist.l bent back past its range, -119° (limit ±70°) at u=0 (from u=0 to 0.275)
- Limit: wrist.l bent sideways past its range, 85° (limit ±40°) at u=0.275 (from u=0 to 0.725)
- Limit: wrist.r bent sideways past its range, -54° (limit ±40°) at u=1 (from u=0.8 to 1)
- Limit: wrist.r hand turned on the forearm, -35° (limit ±25°) at u=1 (from u=0.875 to 1)

### Barbell Squat

squat

- Limit: neck out of line with the spine, 19° (limit ±10°) at u=0 (from u=0 to 0.45)
- Slide: foot.l on its support moves 9.0 mm by u=0.85
- Slide: foot.r on its support moves 9.0 mm by u=0.85

### Barbell Squat To A Bench

squat

- Limit: neck out of line with the spine, 19° (limit ±10°) at u=0 (from u=0 to 0.45)
- Slide: foot.l on its support moves 9.0 mm by u=0.85
- Slide: foot.r on its support moves 9.0 mm by u=0.85

### Bent Over Barbell Row

row · clearances: feet

- Limit: neck out of line with the spine, 28° (limit ±10°) at u=0 (from u=0 to 1)

### Cable Rope Overhead Triceps Extension

triceps · clearances: feet

- Limit: elbow.l bent past its range, 147° (limit ±145°) at u=0 (from u=0)
- Limit: elbow.r bent past its range, 147° (limit ±145°) at u=0 (from u=0)

### Chin-Up

pullup

- Limit: forearm.l turned past palm-up or palm-down, -61° (limit -5° to 185°) at u=0.4 (from u=0 to 0.9)
- Limit: forearm.r turned past palm-up or palm-down, -61° (limit -5° to 185°) at u=0.4 (from u=0 to 0.9)
- Limit: wrist.l hand turned on the forearm, -43° (limit ±25°) at u=0.475 (from u=0.125 to 0.725)
- Limit: wrist.r hand turned on the forearm, 43° (limit ±25°) at u=0.475 (from u=0.125 to 0.725)
- Limit: wrist.l bent sideways past its range, 54° (limit ±40°) at u=0.45 (from u=0.175 to 0.675)
- Limit: wrist.r bent sideways past its range, -54° (limit ±40°) at u=0.45 (from u=0.175 to 0.675)
- Limit: neck out of line with the spine, 14° (limit ±10°) at u=0.575 (from u=0 to 1)

### Dumbbell Flyes

fly

- Contact: trunk.upper off bench, 3.0 cm away at u=0 (from u=0 to 1)
- Contact: pelvis off bench, 2.2 cm away at u=0 (from u=0 to 1)

### Good Morning

hinge · clearances: feet

- Limit: neck out of line with the spine, 30° (limit ±10°) at u=0 (from u=0 to 0.65)
- Limit: wrist.l bent sideways past its range, 40° (limit ±40°) at u=1 (from u=1)
- Limit: wrist.r bent sideways past its range, -40° (limit ±40°) at u=1 (from u=1)

### Hanging Leg Raise

legRaise

- Limit: neck out of line with the spine, 10° (limit ±10°) at u=0 (from u=0 to 1)

### Incline Dumbbell Flyes

fly

- Contact: trunk.upper off bench, 5.0 cm away at u=0 (from u=0 to 1)
- Contact: pelvis off bench, 0.5 cm away at u=0 (from u=0 to 1)

### Inverted Row

invertedRow

- Limit: elbow.l bent past its range, 158° (limit ±145°) at u=1 (from u=0.825 to 1)
- Limit: elbow.r bent past its range, 158° (limit ±145°) at u=1 (from u=0.825 to 1)
- Limit: wrist.l bent sideways past its range, -45° (limit ±40°) at u=0.625 (from u=0.4 to 0.8)
- Limit: wrist.r bent sideways past its range, 45° (limit ±40°) at u=0.625 (from u=0.4 to 0.8)

### Overhead Squat

squat

- Limit: neck out of line with the spine, 12° (limit ±10°) at u=0 (from u=0 to 0.15)
- Slide: foot.l on its support moves 9.1 mm by u=0.85
- Slide: foot.r on its support moves 9.1 mm by u=0.85

### Reverse Grip Bent-Over Rows

row · clearances: feet

- Limit: neck out of line with the spine, 28° (limit ±10°) at u=0 (from u=0 to 1)
- Limit: forearm.l turned past palm-up or palm-down, -16° (limit -5° to 185°) at u=0.125 (from u=0 to 1)
- Limit: forearm.r turned past palm-up or palm-down, -16° (limit -5° to 185°) at u=0.125 (from u=0 to 1)

### Reverse Grip Triceps Pushdown

triceps · clearances: feet

- Limit: forearm.l turned past palm-up or palm-down, -12° (limit -5° to 185°) at u=0.8 (from u=0.65 to 0.8)
- Limit: forearm.r turned past palm-up or palm-down, -12° (limit -5° to 185°) at u=0.8 (from u=0.65 to 0.8)

### Rope Straight-Arm Pulldown

straightArm · clearances: feet

- Limit: forearm.l turned past palm-up or palm-down, -79° (limit -5° to 185°) at u=0 (from u=0 to 0.2)
- Limit: forearm.r turned past palm-up or palm-down, -79° (limit -5° to 185°) at u=0 (from u=0 to 0.2)

### Smith Machine Behind the Back Shrug

shrug · clearances: feet

- Limit: forearm.l turned past palm-up or palm-down, -20° (limit -5° to 185°) at u=0.25 (from u=0 to 1)
- Limit: forearm.r turned past palm-up or palm-down, -20° (limit -5° to 185°) at u=0.25 (from u=0 to 1)

### Smith Machine Squat

squat

- Limit: neck out of line with the spine, 11° (limit ±10°) at u=0 (from u=0 to 0.1)
- Slide: foot.l on its support moves 7.2 mm by u=0.95
- Slide: foot.r on its support moves 7.2 mm by u=0.95

### Standing Overhead Barbell Triceps Extension

triceps · clearances: feet

- Limit: forearm.l turned past palm-up or palm-down, -22° (limit -5° to 185°) at u=1 (from u=0.625 to 1)
- Limit: forearm.r turned past palm-up or palm-down, -22° (limit -5° to 185°) at u=1 (from u=0.625 to 1)
- Limit: elbow.l bent past its range, 147° (limit ±145°) at u=0 (from u=0)
- Limit: elbow.r bent past its range, 147° (limit ±145°) at u=0 (from u=0)

### Stiff Leg Barbell Good Morning

hinge · clearances: feet

- Limit: neck out of line with the spine, 30° (limit ±10°) at u=0 (from u=0 to 0.65)
- Limit: wrist.l bent sideways past its range, 40° (limit ±40°) at u=1 (from u=1)
- Limit: wrist.r bent sideways past its range, -40° (limit ±40°) at u=1 (from u=1)

### V-Bar Pullup

pullup

- Limit: wrist.l bent back past its range, -74° (limit ±70°) at u=0.95 (from u=0.925 to 0.95)
- Limit: wrist.r bent back past its range, -74° (limit ±70°) at u=0.95 (from u=0.925 to 0.95)
- Limit: neck out of line with the spine, 14° (limit ±10°) at u=0.575 (from u=0 to 1)

### Wide Stance Barbell Squat

squat

- Limit: neck out of line with the spine, 19° (limit ±10°) at u=0 (from u=0 to 0.45)

### Wide-Grip Standing Barbell Curl

curl · clearances: feet

- Limit: forearm.l turned past palm-up or palm-down, -9° (limit -5° to 185°) at u=1 (from u=0.9 to 1)
- Limit: forearm.r turned past palm-up or palm-down, -9° (limit -5° to 185°) at u=1 (from u=0.9 to 1)

## Order of work

Written by `tools/figure-coverage.mjs`: every exercise with a figure record, by how many of the 13 built-in programs (`js/data/splits.js`) use it, then in how many of 480 weeks the program builder (`js/engine/build.js`) makes for a spread of people it appears (2 to 6 days, four levels, every goal; a full gym, home dumbbells, or body weight). The owner's own program comes before all of these (2.8); it is not in the repository.

| # | Exercise | Programs | Built weeks | Audit |
| --- | --- | --- | --- | --- |
| 1 | Pullups | 9 | 155 | passes every check |
| 2 | Incline Dumbbell Press | 9 | 128 | passes every check |
| 3 | Romanian Deadlift | 8 | 19 | passes every check |
| 4 | Seated Leg Curl | 8 | 18 | fails 2 of 4 |
| 5 | Triceps Pushdown - Rope Attachment | 8 | 0 | passes every check |
| 6 | Wide-Grip Lat Pulldown | 7 | 160 | fails 3 of 4 |
| 7 | Side Lateral Raise | 7 | 57 | passes every check |
| 8 | Leg Press | 7 | 0 | fails 2 of 4 |
| 9 | Plank | 7 | 0 | passes every check |
| 10 | Barbell Squat | 6 | 160 | fails 1 of 4 |
| 11 | Barbell Bench Press - Medium Grip | 6 | 160 | fails 2 of 4 |
| 12 | Bent Over Barbell Row | 6 | 160 | fails 1 of 4 |
| 13 | Hammer Curls | 6 | 127 | fails 1 of 4 |
| 14 | Leg Extensions | 6 | 86 | fails 2 of 4 |
| 15 | Seated Cable Rows | 6 | 18 | fails 2 of 4 |
| 16 | Face Pull | 6 | 0 | fails 3 of 4 |
| 17 | Reverse Flyes | 5 | 315 | fails 3 of 4 |
| 18 | Standing Biceps Cable Curl | 5 | 0 | fails 1 of 4 |
| 19 | Seated Dumbbell Press | 4 | 155 | fails 3 of 4 |
| 20 | Hanging Leg Raise | 4 | 0 | fails 1 of 4 |
| 21 | Pushups | 3 | 228 | fails 2 of 4 |
| 22 | Barbell Incline Bench Press - Medium Grip | 3 | 160 | fails 2 of 4 |
| 23 | Butterfly | 3 | 110 | fails 1 of 4 |
| 24 | Split Squat with Dumbbells | 3 | 57 | fails 1 of 4 |
| 25 | EZ-Bar Curl | 3 | 27 | fails 2 of 4 |
| 26 | Barbell Deadlift | 3 | 0 | fails 1 of 4 |
| 27 | Cable Rope Overhead Triceps Extension | 3 | 0 | fails 1 of 4 |
| 28 | Preacher Curl | 3 | 0 | fails 2 of 4 |
| 29 | Standing Military Press | 3 | 0 | fails 2 of 4 |
| 30 | Butt Lift (Bridge) | 2 | 407 | fails 2 of 4 |
| 31 | Dumbbell Bench Press | 2 | 249 | fails 4 of 4 |
| 32 | Bench Dips | 2 | 172 | fails 3 of 4 |
| 33 | Lying Leg Curls | 2 | 160 | fails 3 of 4 |
| 34 | Barbell Curl | 2 | 127 | passes every check |
| 35 | Close-Grip Barbell Bench Press | 2 | 24 | fails 3 of 4 |
| 36 | Goblet Squat | 2 | 6 | fails 3 of 4 |
| 37 | Seated Machine Row | 2 | 3 | fails 1 of 4 |
| 38 | Barbell Hip Thrust | 2 | 0 | fails 2 of 4 |
| 39 | Lying Triceps Press | 2 | 0 | fails 3 of 4 |
| 40 | Machine Chest Press | 2 | 0 | fails 1 of 4 |
| 41 | Bodyweight Squat | 1 | 320 | fails 3 of 4 |
| 42 | Chin-Up | 1 | 320 | fails 1 of 4 |
| 43 | Inverted Row | 1 | 217 | fails 1 of 4 |
| 44 | One-Arm Dumbbell Row | 1 | 175 | fails 2 of 4 |
| 45 | Tricep Dumbbell Kickback | 1 | 172 | fails 3 of 4 |
| 46 | Bodyweight Walking Lunge | 1 | 169 | fails 3 of 4 |
| 47 | Barbell Walking Lunge | 1 | 160 | fails 2 of 4 |
| 48 | Incline Push-Up Close-Grip | 1 | 95 | fails 3 of 4 |
| 49 | Dips - Chest Version | 1 | 0 | fails 2 of 4 |
| 50 | Dumbbell Shrug | 1 | 0 | fails 1 of 4 |
| 51 | Front Cable Raise | 1 | 0 | fails 1 of 4 |
| 52 | Straight-Arm Pulldown | 1 | 0 | passes every check |
| 53 | V-Bar Pulldown | 1 | 0 | fails 3 of 4 |
| 54 | Decline Dumbbell Flyes | 0 | 160 | fails 2 of 4 |
| 55 | Dumbbell Flyes | 0 | 23 | fails 1 of 4 |
| 56 | Incline Dumbbell Flyes | 0 | 3 | fails 1 of 4 |
| 57 | Alternate Hammer Curl | 0 | 0 | fails 1 of 4 |
| 58 | Alternate Incline Dumbbell Curl | 0 | 0 | fails 2 of 4 |
| 59 | Alternating Cable Shoulder Press | 0 | 0 | fails 2 of 4 |
| 60 | Alternating Kettlebell Press | 0 | 0 | fails 2 of 4 |
| 61 | Arnold Dumbbell Press | 0 | 0 | fails 3 of 4 |
| 62 | Barbell Full Squat | 0 | 0 | fails 2 of 4 |
| 63 | Barbell Glute Bridge | 0 | 0 | fails 2 of 4 |
| 64 | Barbell Lunge | 0 | 0 | fails 2 of 4 |
| 65 | Barbell Shrug | 0 | 0 | fails 1 of 4 |
| 66 | Barbell Shrug Behind The Back | 0 | 0 | fails 1 of 4 |
| 67 | Barbell Side Bend | 0 | 0 | fails 1 of 4 |
| 68 | Barbell Squat To A Bench | 0 | 0 | fails 1 of 4 |
| 69 | Barbell Step Ups | 0 | 0 | fails 1 of 4 |
| 70 | Bench Press - Powerlifting | 0 | 0 | fails 2 of 4 |
| 71 | Bent Over Two-Dumbbell Row | 0 | 0 | fails 2 of 4 |
| 72 | Bent Over Two-Dumbbell Row With Palms In | 0 | 0 | fails 2 of 4 |
| 73 | Box Squat | 0 | 0 | fails 2 of 4 |
| 74 | Cable Crossover | 0 | 0 | fails 2 of 4 |
| 75 | Cable Crunch | 0 | 0 | fails 2 of 4 |
| 76 | Cable Hammer Curls - Rope Attachment | 0 | 0 | fails 1 of 4 |
| 77 | Cable Lying Triceps Extension | 0 | 0 | fails 3 of 4 |
| 78 | Cable Rear Delt Fly | 0 | 0 | fails 2 of 4 |
| 79 | Cable Rope Rear-Delt Rows | 0 | 0 | fails 3 of 4 |
| 80 | Cable Shrugs | 0 | 0 | fails 1 of 4 |
| 81 | Close-Grip EZ Bar Curl | 0 | 0 | fails 2 of 4 |
| 82 | Close-Grip Front Lat Pulldown | 0 | 0 | fails 3 of 4 |
| 83 | Close-Grip Standing Barbell Curl | 0 | 0 | fails 2 of 4 |
| 84 | Crunch - Hands Overhead | 0 | 0 | fails 3 of 4 |
| 85 | Crunches | 0 | 0 | fails 3 of 4 |
| 86 | Decline Barbell Bench Press | 0 | 0 | fails 2 of 4 |
| 87 | Decline Dumbbell Bench Press | 0 | 0 | fails 4 of 4 |
| 88 | Decline Push-Up | 0 | 0 | fails 2 of 4 |
| 89 | Decline Smith Press | 0 | 0 | fails 2 of 4 |
| 90 | Dips - Triceps Version | 0 | 0 | fails 2 of 4 |
| 91 | Dumbbell Alternate Bicep Curl | 0 | 0 | fails 1 of 4 |
| 92 | Dumbbell Bench Press with Neutral Grip | 0 | 0 | fails 4 of 4 |
| 93 | Dumbbell Bicep Curl | 0 | 0 | fails 1 of 4 |
| 94 | Dumbbell Floor Press | 0 | 0 | fails 4 of 4 |
| 95 | Dumbbell Lunges | 0 | 0 | fails 2 of 4 |
| 96 | Dumbbell One-Arm Shoulder Press | 0 | 0 | fails 3 of 4 |
| 97 | Dumbbell One-Arm Triceps Extension | 0 | 0 | fails 2 of 4 |
| 98 | Dumbbell Rear Lunge | 0 | 0 | fails 2 of 4 |
| 99 | Dumbbell Shoulder Press | 0 | 0 | fails 3 of 4 |
| 100 | Dumbbell Side Bend | 0 | 0 | fails 2 of 4 |
| 101 | Dumbbell Squat | 0 | 0 | fails 2 of 4 |
| 102 | Dumbbell Squat To A Bench | 0 | 0 | fails 2 of 4 |
| 103 | Dumbbell Step Ups | 0 | 0 | fails 1 of 4 |
| 104 | EZ-Bar Skullcrusher | 0 | 0 | fails 3 of 4 |
| 105 | Elevated Cable Rows | 0 | 0 | fails 2 of 4 |
| 106 | Flat Bench Cable Flyes | 0 | 0 | fails 2 of 4 |
| 107 | Flat Bench Lying Leg Raise | 0 | 0 | fails 2 of 4 |
| 108 | Floor Press | 0 | 0 | fails 3 of 4 |
| 109 | Front Barbell Squat | 0 | 0 | fails 3 of 4 |
| 110 | Front Barbell Squat To A Bench | 0 | 0 | fails 2 of 4 |
| 111 | Front Dumbbell Raise | 0 | 0 | fails 1 of 4 |
| 112 | Front Plate Raise | 0 | 0 | passes every check |
| 113 | Front Squat (Clean Grip) | 0 | 0 | fails 2 of 4 |
| 114 | Front Two-Dumbbell Raise | 0 | 0 | fails 1 of 4 |
| 115 | Good Morning | 0 | 0 | fails 1 of 4 |
| 116 | Hammer Grip Incline DB Bench Press | 0 | 0 | fails 4 of 4 |
| 117 | Hyperextensions (Back Extensions) | 0 | 0 | fails 3 of 4 |
| 118 | Incline Cable Chest Press | 0 | 0 | fails 4 of 4 |
| 119 | Incline Cable Flye | 0 | 0 | fails 2 of 4 |
| 120 | Incline Dumbbell Bench With Palms Facing In | 0 | 0 | fails 4 of 4 |
| 121 | Incline Dumbbell Curl | 0 | 0 | fails 2 of 4 |
| 122 | Incline Hammer Curls | 0 | 0 | fails 2 of 4 |
| 123 | Incline Push-Up | 0 | 0 | fails 2 of 4 |
| 124 | Incline Push-Up Medium | 0 | 0 | fails 3 of 4 |
| 125 | Incline Push-Up Wide | 0 | 0 | fails 3 of 4 |
| 126 | Kneeling High Pulley Row | 0 | 0 | fails 2 of 4 |
| 127 | Kneeling Single-Arm High Pulley Row | 0 | 0 | fails 2 of 4 |
| 128 | Low Cable Triceps Extension | 0 | 0 | fails 3 of 4 |
| 129 | Low Pulley Row To Neck | 0 | 0 | fails 2 of 4 |
| 130 | Lying Close-Grip Barbell Triceps Press To Chin | 0 | 0 | fails 3 of 4 |
| 131 | Lying Dumbbell Tricep Extension | 0 | 0 | fails 3 of 4 |
| 132 | Narrow Stance Leg Press | 0 | 0 | fails 2 of 4 |
| 133 | Narrow Stance Squats | 0 | 0 | fails 2 of 4 |
| 134 | Olympic Squat | 0 | 0 | fails 2 of 4 |
| 135 | One Arm Dumbbell Preacher Curl | 0 | 0 | fails 3 of 4 |
| 136 | One-Arm High-Pulley Cable Side Bends | 0 | 0 | fails 2 of 4 |
| 137 | One-Arm Kettlebell Swings | 0 | 0 | fails 2 of 4 |
| 138 | One-Arm Side Laterals | 0 | 0 | passes every check |
| 139 | Overhead Squat | 0 | 0 | fails 1 of 4 |
| 140 | Parallel Bar Dip | 0 | 0 | fails 2 of 4 |
| 141 | Preacher Hammer Dumbbell Curl | 0 | 0 | fails 3 of 4 |
| 142 | Pull Through | 0 | 0 | fails 3 of 4 |
| 143 | Push-Up Wide | 0 | 0 | fails 3 of 4 |
| 144 | Push-Ups - Close Triceps Position | 0 | 0 | fails 2 of 4 |
| 145 | Push-Ups With Feet Elevated | 0 | 0 | fails 2 of 4 |
| 146 | Reverse Barbell Curl | 0 | 0 | fails 2 of 4 |
| 147 | Reverse Barbell Preacher Curls | 0 | 0 | fails 3 of 4 |
| 148 | Reverse Cable Curl | 0 | 0 | fails 2 of 4 |
| 149 | Reverse Grip Bent-Over Rows | 0 | 0 | fails 1 of 4 |
| 150 | Reverse Grip Triceps Pushdown | 0 | 0 | fails 1 of 4 |
| 151 | Reverse Machine Flyes | 0 | 0 | fails 2 of 4 |
| 152 | Rope Straight-Arm Pulldown | 0 | 0 | fails 1 of 4 |
| 153 | Seated Barbell Military Press | 0 | 0 | fails 3 of 4 |
| 154 | Seated Cable Shoulder Press | 0 | 0 | fails 2 of 4 |
| 155 | Seated Dumbbell Curl | 0 | 0 | fails 1 of 4 |
| 156 | Seated One-arm Cable Pulley Rows | 0 | 0 | fails 2 of 4 |
| 157 | Seated Side Lateral Raise | 0 | 0 | fails 1 of 4 |
| 158 | Seated Triceps Press | 0 | 0 | fails 3 of 4 |
| 159 | Sit-Up | 0 | 0 | fails 3 of 4 |
| 160 | Smith Machine Behind the Back Shrug | 0 | 0 | fails 1 of 4 |
| 161 | Smith Machine Bench Press | 0 | 0 | fails 2 of 4 |
| 162 | Smith Machine Bent Over Row | 0 | 0 | fails 2 of 4 |
| 163 | Smith Machine Calf Raise | 0 | 0 | passes every check |
| 164 | Smith Machine Close-Grip Bench Press | 0 | 0 | fails 3 of 4 |
| 165 | Smith Machine Decline Press | 0 | 0 | fails 2 of 4 |
| 166 | Smith Machine Incline Bench Press | 0 | 0 | fails 2 of 4 |
| 167 | Smith Machine One-Arm Upright Row | 0 | 0 | fails 2 of 4 |
| 168 | Smith Machine Overhead Shoulder Press | 0 | 0 | fails 3 of 4 |
| 169 | Smith Machine Squat | 0 | 0 | fails 1 of 4 |
| 170 | Smith Machine Stiff-Legged Deadlift | 0 | 0 | fails 2 of 4 |
| 171 | Smith Machine Upright Row | 0 | 0 | fails 2 of 4 |
| 172 | Smith Single-Leg Split Squat | 0 | 0 | fails 1 of 4 |
| 173 | Standing Alternating Dumbbell Press | 0 | 0 | fails 3 of 4 |
| 174 | Standing Barbell Calf Raise | 0 | 0 | passes every check |
| 175 | Standing Barbell Press Behind Neck | 0 | 0 | fails 2 of 4 |
| 176 | Standing Bent-Over Two-Arm Dumbbell Triceps Extension | 0 | 0 | fails 2 of 4 |
| 177 | Standing Cable Chest Press | 0 | 0 | fails 3 of 4 |
| 178 | Standing Cable Lift | 0 | 0 | fails 2 of 4 |
| 179 | Standing Cable Wood Chop | 0 | 0 | fails 2 of 4 |
| 180 | Standing Dumbbell Calf Raise | 0 | 0 | passes every check |
| 181 | Standing Dumbbell Press | 0 | 0 | fails 3 of 4 |
| 182 | Standing Dumbbell Reverse Curl | 0 | 0 | fails 2 of 4 |
| 183 | Standing Dumbbell Straight-Arm Front Delt Raise Above Head | 0 | 0 | fails 1 of 4 |
| 184 | Standing Dumbbell Triceps Extension | 0 | 0 | fails 2 of 4 |
| 185 | Standing Dumbbell Upright Row | 0 | 0 | fails 2 of 4 |
| 186 | Standing Front Barbell Raise Over Head | 0 | 0 | passes every check |
| 187 | Standing Low-Pulley Deltoid Raise | 0 | 0 | fails 1 of 4 |
| 188 | Standing One-Arm Cable Curl | 0 | 0 | passes every check |
| 189 | Standing One-Arm Dumbbell Triceps Extension | 0 | 0 | fails 2 of 4 |
| 190 | Standing Overhead Barbell Triceps Extension | 0 | 0 | fails 1 of 4 |
| 191 | Standing Palms-In Dumbbell Press | 0 | 0 | fails 3 of 4 |
| 192 | Stiff Leg Barbell Good Morning | 0 | 0 | fails 1 of 4 |
| 193 | Stiff-Legged Barbell Deadlift | 0 | 0 | fails 2 of 4 |
| 194 | Stiff-Legged Dumbbell Deadlift | 0 | 0 | fails 3 of 4 |
| 195 | Sumo Deadlift | 0 | 0 | fails 2 of 4 |
| 196 | Triceps Overhead Extension with Rope | 0 | 0 | fails 2 of 4 |
| 197 | Triceps Pushdown | 0 | 0 | passes every check |
| 198 | Triceps Pushdown - V-Bar Attachment | 0 | 0 | passes every check |
| 199 | Two-Arm Dumbbell Preacher Curl | 0 | 0 | fails 3 of 4 |
| 200 | Two-Arm Kettlebell Military Press | 0 | 0 | fails 2 of 4 |
| 201 | Two-Arm Kettlebell Row | 0 | 0 | fails 2 of 4 |
| 202 | Underhand Cable Pulldowns | 0 | 0 | fails 3 of 4 |
| 203 | Upright Barbell Row | 0 | 0 | fails 2 of 4 |
| 204 | Upright Cable Row | 0 | 0 | fails 2 of 4 |
| 205 | V-Bar Pullup | 0 | 0 | fails 1 of 4 |
| 206 | Wide Stance Barbell Squat | 0 | 0 | fails 1 of 4 |
| 207 | Wide Stance Stiff Legs | 0 | 0 | fails 2 of 4 |
| 208 | Wide-Grip Barbell Bench Press | 0 | 0 | fails 2 of 4 |
| 209 | Wide-Grip Decline Barbell Bench Press | 0 | 0 | fails 3 of 4 |
| 210 | Wide-Grip Pulldown Behind The Neck | 0 | 0 | fails 3 of 4 |
| 211 | Wide-Grip Standing Barbell Curl | 0 | 0 | fails 1 of 4 |

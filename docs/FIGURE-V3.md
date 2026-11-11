# The 3D figure, third version — review and design

A review of the figure as it is at v256, and the design for the next one: a body that
looks like an athlete, a place that looks like a gym, and movement that follows the
biomechanics of each lift. It replaces WP-8 of `docs/NEXT-PHASE.md` and is written to
be built from, package by package. `docs/MANNEQUIN3D.md` remains the description of
the renderer as built; update it as each package lands.

**How it was reviewed.** Eleven exercises (squat, deadlift, Romanian deadlift, lunge,
lat pulldown, pull-up, seated cable row, dumbbell shoulder press, barbell curl,
push-up, plank) were drawn by the app's own renderer at the start, middle and end of
the repetition (`tools/figures/live.html`, `setU(0 | .5 | 1)`), and the code that
makes them was read (`js/data/mannequin/*`, `js/ui/mannequin.js`).

**Where the science comes from.** Two sources, kept apart:
- **KB** — the app's knowledge base: `js/knowledge/anatomy.js` (`MUSCLE_ROLES`: agonist,
  synergist, stabiliser, antagonist; `MUSCLE_ACTIONS`: concentric, eccentric, isometric,
  squat depth, curl grips; `PLANES`; `FORCE`: length-tension, force-velocity;
  `MUSCLE_MAP`), `js/knowledge/acute-variables.js` (tempo), `js/knowledge/assessments.js`
  and `imbalances.js` (the overhead squat's checkpoints and movement faults),
  `js/knowledge/cues.js`.
- **GEN** — general, textbook-level biomechanics that any exercise science text
  agrees on (a bar stays over the middle of the foot; the shoulder blade and the arm
  move together; a hinge is at the hips with the spine held). Used only for *how the
  figure moves*. Nothing marked GEN may be shown to the person as a number or a claim;
  it shapes the animation and is checked by tests, as the lever arcs are today.

---

## 1. Feedback on the current figure

### What is good and stays

- One real human mesh on a skeleton, skinned on the graphics card, no library, works
  offline. This is the right foundation; nothing below replaces it.
- Hands close on the bar, feet stay planted, machines move on true pivots.
- The camera (turn, zoom, double tap) and the theme tokens.
- Fallback to stills when WebGL is missing.

### What looks wrong

| # | Seen | Why it matters |
| --- | --- | --- |
| L1 | **The figure is small.** In the squat it fills about a third of the picture's height; most of the frame is empty stage. | On a phone the body is a few centimetres tall; the movement cannot be read. |
| L2 | **A clay mannequin.** One flat grey for the whole skin, no hair, no eyes or brows, no skin tone, no definition between muscles. | It reads as a crash-test dummy, not an athlete. The word "mannequin" is the problem. |
| L3 | **Muscles are a blue stain.** A lit muscle is a soft tint with no edge and no shape; in the squat the whole leg, calf included, glows the same. Quads, hamstrings and glutes cannot be told apart. | The figure's main job is to show *what works*. It shows a region, not a muscle. |
| L4 | **Nothing changes shape.** A biceps at the top of a curl is the same shape as at the bottom. | Contraction is what the eye expects to see. |
| L5 | **The stage is an empty dark gradient** with a scalloped band across the horizon (a visible artefact in every frame). No floor texture, no depth, nothing that says gym. | It looks unfinished and gives no sense of scale. |
| L6 | **Equipment is bare.** The squat has no rack; plates are oversized discs; the pulldown has no thigh pad and its weight stack does not move; cables are single lines. | Small tells that make the scene feel fake. |
| L7 | **One arrow, loosely placed.** On the seated row it is drawn down at the foot plate, nowhere near the handle's path. | The arrow is the only motion cue and is sometimes wrong. |

### What is dangerous to show

Owner, 11 Nov (screenshot of Incline Push-Up Medium): "sometimes the 3D video glitches
and I start seeing the human moving through the bar". Reproduced here, and it is not
one exercise:

| # | Seen | Why it is serious |
| --- | --- | --- |
| D1 | **Incline push-up: the chest and stomach pass through the bar** at the bottom of every repetition. | A body cannot do it, so the picture teaches a depth and a hand position that do not exist. |
| D2 | **Dips: the legs pass through the frame's cross-bars**, knees folded into the uprights. | Same. |
| D3 | **Bench press: at one point of the lowering the bar is over the throat**, not the lower chest. | This is the one way a bench press kills. A demonstration must never show it. |
| D5 | **Plank (owner's screenshot, 11 Nov): the forearm is twisted and the hand folds back through the wrist**; the elbow sits behind the shoulder instead of under it. | A wrist cannot do it; the support position shown is wrong. |
| D6 | **Decline push-up (owner's screenshot): the face goes into the floor and the hands end up behind the head's line**; the body's line breaks at the hips. | Depth and hand position shown are impossible and unsafe to copy. |
| D4 | **Nothing in the code checks any of this.** The body is posed by targets for hands, feet and pelvis; the equipment is drawn separately; no test asks whether they overlap. | Every new exercise can ship with the same fault. |

Owner, 11 Nov: "I am sure there are others… every exercise has its own safety rules…
it varies from one exercise to another, which is why it is crucial and not easy to
standardise, and needs to be worked on one by one." That is taken as the rule of this
design: **general checks only catch the impossible; what is *correct* is decided
exercise by exercise** (2.8), and no figure is shown until its own exercise has been
through that.

A person copies what the figure does. **A wrong demonstration is worse than none**, so
the design below makes it impossible to ship one (2.6): each figure must pass every
check, or the exercise shows its photographs instead.

### What moves wrong

The cause of most of these is one design limit: **every exercise is two poses (start
and end) blended in a straight line with one easing curve** (`motion.js`: `keys:[a,b]`,
`ease = ½ − ½cos`). Real lifts are not straight lines between two poses.

| # | Seen | What is correct (GEN unless marked) |
| --- | --- | --- |
| M1 | **Deadlift and Romanian deadlift: the bar swings out in an arc** (the arrow is a C). | The bar travels in a near-vertical line over the middle of the foot, in contact with the shins and thighs. |
| M2 | **Deadlift start: hips as low as a squat, back curved.** The spine is "eased from pelvis to chest", which draws a hinge as a rounded back. | Hips above the knees, shoulders just in front of the bar, spine neutral: the trunk moves as one piece and the bend is at the hips. |
| M3 | **Lat pulldown stops at ear level.** | The bar comes to the upper chest, the trunk leaning back a little, the shoulder blades drawn down first, then the elbows. |
| M4 | **Seated row: the trunk rocks** forward at the start and well back at the end. | The trunk stays close to upright; the movement is the shoulder blades and elbows. |
| M5 | **Push-up: hands ahead of the shoulders, elbows flared straight out**, chest flat on the floor at the bottom. | Hands under the shoulders, elbows about 45° from the body, a straight line from head to heel, the chest stopping just above the floor. |
| M6 | **Shoulder press starts with the dumbbells in front of the face**, elbows forward and narrow. | Forearms vertical under the weights, elbows a little in front of the body's side (the plane of the shoulder blade). |
| M7 | **Lunge: the back foot lies flat on its top.** | The back foot is on its ball, heel up. |
| M8 | **Every repetition has the same rhythm** (about 1 s up, 1.7 s down), whatever the program prescribes. The workout says "Tempo 4-2-1-1"; the figure does something else. | KB: tempo is a prescribed variable (`acute-variables.js`). The figure should perform the prescription. |
| M9 | **All lit muscles glow together**, a little brighter on the way up. | KB (`MUSCLE_ACTIONS`, `MUSCLE_ROLES`): muscles act concentrically, eccentrically or isometrically, and as prime mover, helper or stabiliser. These are different things and can be shown. |
| M10 | **No life.** No breath, no shift of weight, a hold is a frozen picture (the plank is one still frame). | A held position has breathing and small corrections; a heavy lift has a brace before it. |

---

## 2. The design

### 2.0 The standard: a real athlete

Owner, 10 Nov: "the body, joints, muscles, structure, posture and movement need to be
realistic, as if it is an athlete." That is the bar for everything below, and each
part of it is made checkable, so "realistic" is a test and not an opinion.

**Structure (the skeleton under the skin).**
- **Proportions** are a real adult's and are measured in the bake, not judged by eye:
  total height 7.5 head-heights; leg length (hip joint to floor) 47–49% of height;
  arm span within 3% of height; upper arm : forearm about 1.2 : 1; thigh : shin about
  1 : 1; shoulder width (between the shoulder joints) 23–26% of height for the male
  body, hip width less than shoulder width. `tools/body/bake.py` prints these and
  fails outside the ranges (GEN: standard anthropometry).
- **Joint centres where they are in a body**: the hip joint deep in the pelvis (not at
  the surface of the hip), the shoulder joint under the outer end of the collarbone,
  the knee and elbow as hinges on their true axes, the spine's bend spread over its
  segments (most of forward bending in the lower back and hips, most of twisting in
  the mid-back). Checked in the bake against the mesh: each joint centre must sit
  inside the limb's cross-section at that level, within its middle third.

**Joints (how far and which way each moves).**
- Every joint gets **limits**, and no pose, blend or IK solve may leave them
  (`skin.js solve()` clamps and a unit test sweeps every record at 21 moments):

  | Joint | Limit (GEN: standard ranges of motion) |
  | --- | --- |
  | Elbow | bends 0–145°, never backwards; forearm turns ±85° along its length |
  | Knee | bends 0–140°, never backwards or sideways |
  | Hip | bends to 120°, extends 20° behind, opens 45° to the side |
  | Shoulder | arm raises to 180° **only with the shoulder blade turning** (1° of blade for each 2° of arm); behind the body 50° |
  | Ankle | toes up 20°, down 45° |
  | Wrist | 70° either way; in a press or a curl **the wrist stays straight under the load** (within 10°) |
  | Spine | neutral unless the exercise is a spinal movement; total forward bend spread over its segments, never a single kink |
  | Neck | in line with the spine in every lift (within 10°): the head does not crane up or drop |

- **Joints that deform like joints.** The mesh must not collapse or balloon when a
  joint bends (the "candy wrapper" twist at the forearm and shoulder, the pinched
  elbow and knee, the flattened buttock in a deep squat). Three measures: twist
  spread along the forearm and upper arm (the two forearm bones already exist; add
  the same for the upper arm and thigh in the bake's weights); **corrective offsets**
  baked for the five worst bends (elbow, knee, hip, shoulder raise, shoulder forward)
  and blended in by joint angle; volume kept at elbow and knee (the crease moves out
  as the joint closes). Test: the limb's cross-section area 4 cm either side of the
  joint changes by less than 15% over its whole range.

**Muscles (anatomy, not paint).**
- The 20 muscle fields are checked against anatomy for **where each starts and ends**
  (origin and insertion regions on the skeleton: the biceps from the shoulder to just
  below the elbow, the hamstrings from the sitting bone to below the knee, the lats
  from the low back to the upper arm) and for **which joints each crosses**. A table
  in `rig.js` records it (`{muscle, from, to, crosses:[joint…], action}`) with names
  and actions taken from `anatomy.js MUSCLE_MAP` where it has them (KB), completed
  from standard anatomy where it does not (GEN, marked). This one table drives the
  bulge (2.1), the roles (2.4) and the "tap a muscle" label.
- **A muscle shortens when its joint moves the way it pulls** and lengthens the other
  way; the figure shows exactly that (bulge and fibre stripes), so it can never show a
  muscle "working" in a movement it cannot perform. Unit test: for every family, each
  prime mover's length changes over the repetition; a muscle whose length does not
  change may only be a stabiliser.

**Posture (how an athlete stands and holds).**
- **Neutral standing** is the reference pose and is tested: seen from the side, ear,
  shoulder, hip, knee and ankle on one vertical line within 2 cm (GEN; the same
  checkpoints the KB's static posture assessment uses, `assessments.js`); the spine's
  natural curves present (the rest pose's own), pelvis level, ribs over the pelvis,
  shoulder blades flat and slightly back, kneecaps and second toes pointing the same
  way, weight over the middle of the foot.
- **Under load** the athlete's posture is added per family (2.3): the chest up and
  blades set before a pull or a press, the brace before a heavy lift, the neck in
  line. None of the KB's movement faults (`imbalances.js MOVEMENT_FAULTS`: knees
  moving in, heels rising, low back arching or rounding, shoulders lifting, head
  jutting forward) may appear in a correct demonstration; the unit tests of 2.3 check
  each family for the faults that apply to it.
- **Balance is real**: the combined centre of mass of body and load (segment masses
  from a standard table, GEN; the load at the weight set) stays over the base of
  support (the feet's outline, or feet and hands) at every moment. Unit test for every
  record. This alone catches most poses that "look wrong".

**Movement (how an athlete moves).** Covered in 2.3: phases instead of two poses, the
bar where physics puts it, joints leading in the right order, the shoulder blade
moving with the arm, speed that shows effort, the prescribed tempo, breath and brace.
Added here: **no foot slides and no hand slips** (a planted foot or a gripping hand
moves less than 2 mm over the repetition, unit test), and **no teleporting joints**
(the largest joint speed between two frames at 60 a second stays under a limit, so a
blend never snaps).

### 2.1 The body: an athlete, not a mannequin

Keep MakeHuman's CC0 mesh, skeleton and weights (`tools/body/bake.py`). Change what
is baked and how it is shaded.

**Shape (bake).**
- **One body: the athletic male build**, as now (owner, 11 Nov: no female figure). No
  second body is baked and nothing in the app chooses between bodies.
- **Hair**: a short cropped cap as geometry (a shell 4–6 mm off the scalp from the
  scalp's own vertices, baked, carried by the head bone), and brows. No long hair,
  no cloth simulation.
- **A face that reads**: keep the mesh's features; bake eye, brow and lip masks as
  per-vertex values so the shader can tone them. No expression, no eye movement.
- **Outfit**: shorts as now; add a fitted training top option (a per-vertex mask like
  the shorts) that is **off by default for men when the exercise lights trunk muscles
  and on otherwise**. The lit muscles
  must never be hidden by clothing: where a muscle is lit under cloth, the cloth
  thins to show it (mask × glow).

**Skin and muscle (shader).**
- **A real skin tone**, from a `--mq-skin` token per theme as now, but shaded with
  (a) a soft wrap light, (b) a faint red-shifted scatter in the shadow edge, (c) a
  broad specular with a Fresnel rim. No texture maps: all from the vertex data.
  Offer three skin tones in Profile → App (tokens, not code).
- **Definition**: bake a **muscle-boundary field** (how close a vertex is to the edge
  between two muscle fields) and a **curvature** value per vertex. The shader darkens
  boundaries a little and lifts the bellies, so the body has visible muscle separation
  even when nothing is lit.
- **A lit muscle is a muscle**: its fill in the theme's colour with an **edge line**
  from the boundary field, fibres suggested by a fine stripe along the muscle's
  **fibre direction** (baked per muscle as a direction in the rest pose: one vector
  per muscle is enough), and a rim glow. Three visual levels, from the KB's roles:
  **prime mover** (full colour, edge, fibres), **synergist** (half colour, edge),
  **stabiliser** (outline only, a slow pulse). The level comes from data (2.4).
- **Muscles that change shape.** Per muscle, a baked **bulge direction** (the vertex
  normal weighted by the muscle field). In the vertex shader, a muscle's vertices move
  out along it by up to 6–8 mm × *shortening*, where shortening comes from the joint
  angle the muscle crosses (elbow angle for biceps and triceps, knee for quads and
  hamstrings, hip for glutes, shoulder for delts and chest, ankle for calves) — a
  table of muscle → joint → the angle range over which it shortens (GEN). This is the
  single change that makes the body look alive, and costs one extra attribute.

**Budget.** Vertex count unchanged (15,824). Two more attributes (boundary+curvature
packed in one, bulge in one). `body.bin` grows by about 15%.

### 2.2 The place: a gym, lit like a studio

Replace the empty gradient stage. Everything procedural, in the shader or from the
existing kit of solids; no image files.

- **Floor**: rubber gym tiles (a fine grid and speckle from a hash in the fragment
  shader), slightly reflective (a blurred mirror of the figure faded to nothing by
  30 cm: draw the body once more, flipped, at low alpha, before the floor's own pass),
  the pool of light kept. A **platform** under barbell lifts (wood centre, rubber
  sides) from two boxes.
- **Back wall** at 3.5 m, soft and out of focus: a darker band with a thin line of
  the theme's light along it (the "edge light" token), and the **silhouette of a
  rack and a dumbbell stand** as a few low-contrast boxes, so the eye reads depth and
  scale. It must never compete with the figure: maximum contrast against the stage is
  capped (8% luminance).
- **Fix the horizon artefact** (the scalloped band): it is the floor meeting the
  stage gradient; replace with a single analytic horizon fog in the stage shader.
- **Light**: keep the camera-fixed key/fill/rim. Add contact shadow under feet and
  hands (a small analytic blob per contact, on top of the shadow map) so the figure
  is planted.
- **Equipment that convinces**: a squat rack (uprights, J-hooks, safeties) for every
  barbell lift done standing under a bar; bench with visible frame; plates at true
  size (450 mm for a 20 kg plate, smaller for lighter ones — the bar is loaded to the
  **weight the person has set**, in plates the app already knows how to compute for
  "Bar + 15 + 2.5 a side"); a thigh pad on the pulldown; **the weight stack moves**
  with the cable (stack height = cable travel); cables as thin cylinders that bend
  round their pulleys.
- **Framing**: the figure fills 70–80% of the picture's height at every moment of the
  movement (`fitCamera` margin from 1.0 to about 0.62; test it), with the default view
  chosen per family for the plane the movement happens in (KB `PLANES`): sagittal
  lifts from the side and a little in front (yaw 60–70°), frontal ones from the front
  quarter, pulls from behind-quarter so the back is seen.

### 2.3 Movement: phases, not two poses

**The model.** A record's `keys` becomes a list of **phases**, each a pose at a
fraction of the repetition, joined by a spline, with **constraints applied after
blending** so the result obeys the lift's mechanics whatever the blend does:

```js
keys:[ {at:0,   pose:setup},
       {at:.12, pose:brace},      // optional: the breath and brace before a heavy lift
       {at:.55, pose:mid},        // the sticking region
       {at:1,   pose:lockout} ],
path:{ track:"bar", rule:"overMidfoot" },   // or "onLever", "onCable", "arcAbout:elbow"
order:["knees","hips"],                      // which joints lead, for lifts where it matters
spine:"neutral",                             // "neutral" | "flex" (crunch) | "extend" (back extension)
scap:"rhythm"                                // shoulder blade follows the arm 1 : 2
```

- Poses blend by **Catmull-Rom through the keys** (pelvis, hands, feet, angles), not
  a straight line. Two-key records keep working unchanged.
- **Path constraints** (new, in `motion.js`, each pure and unit-tested):
  - `overMidfoot` — after blending, the bar's x is moved to stay within ±2 cm of the
    middle of the foot, and the pelvis is shifted to keep the hands on it. Squat,
    deadlift, Romanian deadlift, overhead press, bent-over row. *Fixes M1.*
  - `onLever`, `onCable` — as the machines do today; the cable's handle moves along
    the line from the last pulley.
  - `arcAbout:joint` — the hand keeps its distance from a fixed joint (curls, triceps
    push-downs, raises).
  - `touch:part` — the bar stays within 1 cm of the thighs/shins (deadlifts).
- **Spine**: `"neutral"` makes the five spine bones turn **together as one piece**
  about the hips (the trunk's `pitch`), with the natural curves kept; the easing from
  pelvis to chest that reads as a rounded back is used only for `"flex"`. *Fixes M2.*
- **Shoulder rhythm** (GEN): for every arm raised above 30°, the shoulder blade
  rotates upward one degree for each two of the arm, and on pulls it draws back and
  down **before** the elbow bends (the first 15% of a pull is shoulder blades only).
  `skin.js` already moves the blade with the arm; make the ratio explicit and add the
  lead. *Fixes M3, part of M4.*
- **Velocity that looks like effort** (KB `FORCE`, force-velocity): the lifting phase
  is not a symmetric ease. Use an asymmetric curve that is **slowest through the
  sticking region** given by the family (just above parallel in a squat, off the chest
  in a press, mid-shin to knee in a deadlift) and quickest near lockout; the lowering
  phase is even and controlled.
- **Tempo from the prescription** (KB): the figure takes the four numbers the workout
  shows (4-2-1-1: lower 4, hold 2, lift 1, hold 1) and performs them. With no
  prescribed tempo it uses the record's default. In the exercise sheet a small
  **"1 ×  ·  ½ ×"** control plays it at half speed.
- **Life**: breathing (the chest's `bend` ±1.2° and ribcage scale ±0.6% on a 4 s
  cycle, in during lowering and out through the lift where the tempo allows), a
  **brace** before heavy compound lifts (ribs down, a held breath for the first part
  of the lift), a 2–3 mm sway at the pelvis on standing holds, tremor-free. A plank or
  a wall sit breathes and makes small corrections for its whole hold. *Fixes M10.*

**Per-family corrections** (each becomes a unit test on joint angles, as the two
hand-written machines have today). GEN.

| Family | Setup | Movement | End | Checks |
| --- | --- | --- | --- | --- |
| Squat | Bar over mid-foot, feet shoulder width, toes out 10–20° | Hips and knees bend together; knees travel in line with the toes; trunk and shin stay near parallel | Hip crease at or just below the knee (KB `MUSCLE_ACTIONS.squatDepth` for what depth is advised) | bar x within ±2 cm of mid-foot throughout; heels on the floor; knee over second toe (the overhead squat's checkpoints, KB `assessments.js`) |
| Deadlift | Bar over mid-foot touching the shins; hips above knees, below shoulders; shoulders just ahead of the bar; arms straight; spine neutral | Knees straighten first with the back angle held, then the hips come through | Standing tall, no lean back | bar vertical ±2 cm and touching the legs; back angle constant until the bar passes the knees |
| Romanian deadlift | Standing, knees soft (15–20°) | Hips travel back, knees stay soft, bar slides down the thighs | Bar just below the knee, or where the hips stop travelling | knee angle changes < 10°; spine neutral |
| Bench / push-up | Shoulder blades drawn together and down; forearms vertical under the bar at the bottom | Bar touches low on the chest and travels up and slightly back toward the shoulders; elbows 45–70° from the trunk | Arms long, not locked hard | forearm within 10° of vertical at the bottom; push-up: hands under shoulders, head-to-heel straight ±3° |
| Overhead press | Forearms vertical, elbows slightly in front of the bar | Bar passes the face in a straight line, head moving back then through | Bar over the shoulder, hip and mid-foot; blades rotated up | bar path vertical; no back arch beyond neutral |
| Pulldown / pull-up | Arms long, blades up | Blades down first, then elbows to the sides; trunk back 10–15° on the pulldown only | Bar to the upper chest / chin over the bar | elbow path in the plane of the trunk; no trunk swing |
| Row | Trunk upright (seated) or hinged 30–45° (bent-over), spine neutral | Blades back, then elbows past the trunk | Handle to the lower ribs | trunk angle changes < 8° (seated) |
| Curl / push-down | Upper arm vertical at the side | Only the elbow moves | Full bend without the elbow drifting forward > 5 cm | upper arm within 8° of vertical |
| Lateral raise | Arms at the side, slight elbow bend | Up in the plane of the shoulder blade (about 30° in front of the side) | Hand at shoulder height | blade rhythm 1 : 2 |
| Lunge / split squat | Stride so both knees reach about 90° | Straight down; trunk upright | Back knee just off the floor, **back foot on its ball** | front shin within 10° of vertical; front heel down |
| Plank | Elbows under shoulders | Held, breathing | — | ear, shoulder, hip, ankle on one line ±3° |

### 2.4 Muscles: what works, how, and when

Today: main muscle full, the rest half, all the time. New: **role × action × phase**,
all from data.

- **Roles (KB `MUSCLE_ROLES`).** Each family lists its muscles by role:
  `{prime:[…], synergist:[…], stabiliser:[…]}`. The exercise's own `m` and `x` from
  the library stay the source for *which* muscles (rule: no invented muscles;
  `refine` as today); the family only assigns the **role**, and only to muscles the
  library already names for that exercise, plus stabilisers from a fixed short list
  per family (core in standing barbell lifts, rotator cuff shown as rear delt in
  presses…). Where the library and the family disagree, the library wins and a test
  reports it.
- **Action (KB `MUSCLE_ACTIONS`).** From the phase: lifting = concentric (bright,
  fibres drawing together: the stripe pattern compresses), lowering = eccentric
  (the same colour a step cooler and the stripes lengthening), holds = isometric
  (steady, no stripe motion). A small legend under the figure in the sheet names the
  phase in words: "Lifting · Lowering · Hold" (through `t()`).
- **Emphasis by phase (GEN, used sparingly).** A per-family curve can shift emphasis
  between prime movers through the range where it is uncontroversial: in a squat,
  glutes and adductors strongest out of the bottom, quads through the middle; in a
  deadlift, quads off the floor, glutes and hamstrings to lockout; in a press, chest
  off the chest, triceps to lockout. Maximum shift ±25% of brightness; never turns a
  muscle off. If a family has no curve, emphasis is flat.
- **Tap a muscle** (sheet only): the camera turns to it, it is named
  ("Gluteus maximus — prime mover"), with its one-line function from
  `anatomy.js MUSCLE_MAP`. The name and function come from the KB; nothing else is
  said.

### 2.5 Teaching aids (sheet only, off on the workout page)

- **Path trace**: the bar's or hand's path drawn as a fading line as it moves,
  replacing the floating arrow. The arrow remains as a small head on the trace.
- **Form lines** (a toggle, "Show form"): the line the lift is judged by — bar over
  mid-foot (a vertical dashed line from the foot), head-to-heel line in a plank or
  push-up, knee-over-toe line in a squat. Only lines that the family's checks above
  actually test.
- **Common faults** (second step, only for the movements the KB covers): the overhead
  squat's faults (`imbalances.js MOVEMENT_FAULTS`: knees move in, heels rise, low back
  arches, arms fall forward) can be **shown on the figure** as a "wrong / right"
  toggle, each tied to its KB entry and its corrective work. No fault is animated
  that the KB does not describe.

### 2.6 The safety gate: nothing through anything, nothing shipped unchecked

**No part of the body passes through the equipment, the floor or the body itself.**
- `js/data/mannequin/collide.js` (new, pure): the body as **capsules** from the solved
  joints (head, neck, upper and lower trunk, pelvis, upper arms, forearms, hands,
  thighs, shins, feet: about 17, with radii measured from the mesh in the bake), and
  the scene's solids as they already are (`sceneAt().solids`: capsules, boxes,
  cylinders).
- `penetration(scene)` returns every pair that overlaps by more than **3 mm**, except
  the pairs a record declares as contact (`contact:[["hand.l","bar"],["back","bench"],
  ["foot.l","floor"]…]`): a hand round a handle, a back on a pad, a bar resting on the
  traps or in the hip crease. Declared contacts are checked the other way too: they
  must **touch** (within 5 mm), so a hand never floats beside its bar.
- Body against body: forearm through thigh, hand through chest, knee through elbow.
  Neighbouring segments are exempt.
- Checked at **41 moments** of every repetition, for every record, in the unit tests.
- The solver uses it, not only the tests: when a blended pose penetrates, `motion.js`
  moves the offending target out along the contact normal and re-solves (two passes).
  If it still penetrates, the record fails; it is not drawn "nearly right".

**Clearances that are about injury, not looks** (GEN), each a unit test for the
families it applies to:

| Rule | Applies to |
| --- | --- |
| The bar is never over the neck or face while it is being lowered or pressed; at the bottom it is over the lower chest, the forearms upright under it | every bench press |
| The bar or handle never comes within 5 cm of the head on its way past | overhead presses, pulldowns, skull crushers |
| Depth stops where the hands' support allows: the chest reaches the bar or floor and stops, hands beside the chest | push-ups, incline push-ups, dips (upper arm no lower than level with the elbow) |
| The knee never bends sideways, the lower back never rounds under load, the neck stays in line | every loaded lift (2.0) |
| Feet stay flat and whole on the floor or plate unless the exercise is a calf raise | every standing lift, leg press |

**The gate.** A record carries `checked:{by, on, version}` only when (a) every unit
test of 2.0, 2.3 and 2.6 passes for it, and (b) its start, middle and end have been
looked at beside the library's photographs of the same exercise
(`tools/figures/review.mjs`). `recordFor(name)` returns nothing for a record without
it, and the app shows the photographs, as it does today for exercises with no figure.
A test counts them: **no unchecked record is reachable from the app.** When a family's
code changes, its records lose `checked` until re-run (the version is a hash of the
family's source).

### 2.7 How an exercise is written: the technique sheet

Each family, and each exercise that differs from its family, is written from one
sheet. This is the instruction for whoever (person or model) authors a movement; a
record that cannot fill every line is not written.

```
Exercise:        Incline Push-Up (hands on a bar at hip height)
Family:          push-up
Source:          library photographs bn_…-0 and -1; KB cues (cues.js) if any; GEN rules used
Plane:           sagittal (KB PLANES); default view from the side-front, yaw 60–70°
Equipment:       bar at 0.85–0.95 m, fixed; mat
Contacts:        hands on bar (grip, a little wider than the shoulders); balls of feet on floor
Setup (u=0):     arms long, not locked; body one line from ear to ankle (±3°);
                 hands under the shoulders' line of push; blades flat
Movement:        elbows bend to about 45° from the trunk; the body moves as one piece
                 about the feet; chest travels to the bar
Bottom (u=1):    lower chest 2–4 cm from the bar, never through it; forearms square to the bar;
                 elbow about 90°; line ear–ankle still straight
Order:           nothing leads; trunk rigid throughout
Spine / neck:    neutral / in line
Shoulder blade:  draws together going down, spreads coming up
Tempo default:   2-0-1-0 unless the workout prescribes one
Roles:           prime: chest; synergist: front delts, triceps; stabiliser: core
                 (must agree with exercises.json m and x for this exercise)
Must never show: hips sagging or piked; elbows straight out to the side; head dropping;
                 the body through the bar; hands sliding
Checks:          line ±3°; elbow angle 85–95° at bottom; clearance chest–bar ≥ 2 cm;
                 penetration none; centre of mass over feet–hands base; no foot slide
```

The sheets live in `docs/figures/<family>.md`, one file per family, and the unit tests
read the numbers from the record, which is written from the sheet. A reviewer compares
three things that must agree: the sheet, the record's tests, the rendered stills.

### 2.8 One exercise at a time

The general rules (2.0, 2.6) are a floor: they stop a body passing through a bar or a
wrist bending backwards. They do not know that a decline push-up stops with the nose
above the floor and the hands under the shoulders, that a plank's elbows sit under the
shoulders with the forearms flat and parallel, or that a skull crusher's bar passes
behind the head on purpose. **Each exercise has its own correct technique and its own
ways to hurt someone, and gets its own file.**

**The exercise dossier**: `docs/figures/ex/<library-id>.md`, one per exercise (not per
family), written before any code for that exercise is touched. It is the technique
sheet of 2.7 filled in for this exact exercise, plus:

```
Differs from its family in:   feet raised 40–60 cm on a box; more load on the shoulders;
                              the head is the lowest point, so depth is limited by the face
Its own safety rules:         1. nose and forehead stay ≥ 3 cm above the floor at the bottom
                              2. hands under the shoulders (wrist within 5 cm of the shoulder's
                                 vertical, seen from the side) — never forward of the head
                              3. ear–shoulder–hip–ankle one line ±3° throughout: no sag at the hips
                              4. elbows 30–60° from the trunk; wrists straight, fingers forward
                              5. feet stay on the box (no slide)
Joints, start → bottom:       shoulder: flexion ~90° → ~45° with horizontal abduction;
                              elbow 170° → 85–95°; wrist extended ~70–80°, constant;
                              scapula: protracted → retracted
Muscles, by role:             prime: chest (upper fibres emphasised by the angle), front delts;
                              synergist: triceps; stabiliser: core, serratus (shown as "Core")
                              — must agree with exercises.json m and x for this id
What the camera must show:    side view; the gap between face and floor visible at the bottom
Sources:                      library photos <id>-0, <id>-1; the exercise's own instructions
                              (instructions.json); KB cues if present; GEN rules named
Exercise-specific tests:      the five rules above, each as an assertion with its number
Reviewed:                     [ ] stills beside photos at start / middle / bottom
                              [ ] played at 0.5× for a whole repetition, from two angles
                              [ ] every rule above read against the picture
```

**The order of work** — by what people actually do, not alphabetically:
1. Every exercise in the programs the app can build and in its templates (from
   `tools/figure-coverage.mjs`, by how many programs use it).
2. The owner's own program first of all.
3. The rest of the library by family.

**The procedure for each exercise** (the instruction for whoever builds it):
1. Read the library's entry: name, muscles (`m`, `x`), equipment, its instructions
   and its two photographs. Do not start from the family's record.
2. Write the dossier. If a line cannot be filled from the sources above, write
   "unknown" — and the exercise is **not animated**; it keeps its photographs.
3. Only then write or adjust the record, as a variation of its family where it truly
   is one.
4. Write the exercise-specific tests from the dossier's rules, in
   `js/data/mannequin/test/ex/<id>.test.js`. They run with the general ones.
5. Render start, middle and bottom from the dossier's camera and from the opposite
   side; put them beside the photographs; go down the dossier's rules one by one
   against the pictures. Any doubt is a fail.
6. Tick the review boxes, set `checked` on the record. One exercise per commit, so
   one can be withdrawn without the others.

**What the app shows meanwhile.** `checked` starts **empty**: when F-0b ships, every
exercise shows its photographs, as the library did before the figure existed. Figures
come back one exercise at a time as each passes. The exercise sheet says nothing
about this; a photograph is not an error.

**Not to be automated away.** A model doing this work must not batch-approve a family
("all push-up variations pass"), must not copy one exercise's dossier to another and
change the name, and must not mark `checked` on the strength of the automatic tests
alone: the review in step 5 is done per exercise and its pictures are attached to the
pull request.

---

## 3. Work packages

Each is one pull request, follows Part 3 of `docs/NEXT-PHASE.md`, adds unit tests in
`js/data/mannequin/test/`, and is checked by eye on the review sheets
(`tools/figures/review.mjs`) in all six looks. Order matters: motion first (it fixes
what is *wrong*), then the body, then the place.

| # | Package | Fixes | Notes |
| --- | --- | --- | --- |
| F-0 | **The realism checks** | 2.0 | Write the tests first: proportions in the bake, joint limits, centre of mass over the base, no foot slide, neutral-standing alignment, the muscle table (`from`, `to`, `crosses`). Run them on today's figure and list what fails; that list is the work for F-2, F-3 and F-5. |
| F-0b | **The safety gate** (built, v258: `collide.js`, `docs/figures/AUDIT.md`) | D1–D4 | `collide.js`, declared contacts, the injury clearances, `checked` on records and the gate in `recordFor`. **`checked` starts empty: every exercise shows its photographs** until its own dossier and review are done (2.8). Also writes `tools/figure-coverage.mjs` and the ordered list of exercises to do. Ship this before anything else about the figure: it is the only package here that removes a risk already in people's hands. |
| F-1 | **Frame and stage fixes** | L1, L5 (artefact), L7 | `fitCamera` margin so the figure fills 70–80% of the height; analytic horizon; arrow follows the tracked point's real path. Small; do first — it improves every figure at once. |
| F-2 | **Phases and constraints** | M1, M2, M8 | `motion.js`: multi-key spline, `path` rules (`overMidfoot`, `touch`, `arcAbout`), `spine:"neutral"`, tempo from the prescription (`fig3dHtml(name,{tempo})` from `js/ui/views/session.js`), asymmetric lift curve. Unit tests: bar x over the whole repetition for squat, deadlift, RDL, press. |
| F-3 | **Exercises, one by one** | M3–M7, D1–D6 | The procedure of 2.8 for each exercise in the order given there: dossier, record, its own tests, review with pictures, `checked`. One exercise per commit, a handful per pull request. The families in `moves.js` are corrected as their exercises need (table in 2.3), never approved wholesale. This is the long package; it runs alongside the others. |
| F-4 | **Roles, actions, phase emphasis** | L3 (data), M9 | `rig.js highlight()` returns `{muscle:{level, role}}`; families gain `roles`; renderer gets role and action uniforms. Consistency test against `exercises.json` `m`/`x`. |
| F-5 | **The body's shading and shape** | L2, L3, L4 | `tools/body/bake.py`: boundary+curvature, bulge direction, fibre direction, hair cap, face masks; shader: skin, definition, lit-muscle rendering, bulge. Then the three skin tones (Profile → App). |
| F-6 | **The gym** | L5, L6 | Floor, reflection, back wall, contact shadows; rack, platform, true-size plates loaded to the set weight, moving weight stack, thigh pad, cables. |
| F-7 | **Life** | M10 | Breathing, brace, sway; holds that breathe. Off under reduced motion. |
| F-8 | **Teaching aids** | — | Path trace, form lines, tap a muscle; then faults for the overhead squat. |
| F-9 | **Coverage and the workout stage** | — | As WP-8 of NEXT-PHASE: `tools/figure-coverage.mjs`, families extended in order of use, the figure on the workout page (WP-3) once F-1 to F-3 are in. |

**Acceptance for the whole design** (a test page, `tools/figures/live.html`, plus unit
tests):
- No penetration over 3 mm at 41 moments of any reachable record; every declared contact
  touches; the injury clearances of 2.6 hold; no unchecked record reachable from the app (unit).
- Deadlift, RDL, squat, overhead press: bar within ±2 cm of mid-foot through the whole
  repetition (unit).
- Every check in the table of 2.3 holds at 11 sampled moments of each family (unit).
- Every check of 2.0 holds for every record: joint limits, centre of mass over the base of
  support, no foot slide, wrists and neck in line, and the proportions in the bake (unit).
- Limb cross-section near elbow and knee changes by less than 15% over the joint's range (unit).
- The figure's height is 70–80% of the canvas at u = 0, .5, 1 for every record (unit,
  from `framing`).
- With tempo 4-2-1-1 the lowering takes 4.0 s ± 0.05 (unit, `phaseAt`).
- A lit prime mover, synergist and stabiliser are distinguishable in a greyscale
  screenshot (browser test: three different mean luminances in their regions).
- Frame time on the stage canvas at 2× within the budget of WP-8; a still frame under
  reduced motion.
- Contrast tests and all existing figure tests pass.

## 4. What this design does not do

- No motion capture, no physics simulation, no downloaded animation files: movement
  stays authored poses plus constraints, small and testable.
- No texture maps or image-based lighting: everything from vertex data and tokens, so
  the themes keep working and nothing new is downloaded but the body.
- No claims to the person beyond the KB: muscle names, roles and functions come from
  `anatomy.js`; the GEN rules shape the animation only.
- No fault animation the KB does not describe; no "perfect form" for exercises whose
  family has not been checked against the library's photographs.

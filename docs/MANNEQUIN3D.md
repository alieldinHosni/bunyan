# The 3D figure

A real-time 3D figure that does the exercise: a real human body on gym equipment, the
muscles the exercise works glowing in the theme's colour, an arrow the way the movement
goes, on a lit stage. It runs in the app, offline, with no library and no build step.

It started with two exercises written by hand (**Machine Chest Press** and **Seated
Machine Row**). The rest of the library is being drawn by **movement families**: a
curl, a press, a squat or a row written once, with parameters for the implement, the
grip and the position (see "The library's movements" below). An exercise gets its
figure only once its family has been checked beside the library's own photographs of
it; until then it keeps its photographs.

Where it appears: the exercise sheet (it plays, and a drag turns it) and the workout
screen (it plays and does not turn, because a sideways swipe there changes exercise).
Everywhere else (lists, the library) the exercise shows a still thumbnail of the same
figure, drawn by the same renderer.

## What changed in the second version, and why

The first version was a field of rounded solids drawn by a ray marcher. On a phone it
looked poor, for three reasons that could not be tuned away:

- **Pixelated.** A ray marcher's cost is per pixel, so it was drawn at no more than
  about 200,000 pixels (down to 30% on a slow phone) and stretched to fit: about a
  third of a modern phone's pixels, with no smoothing of edges.
- **Not a human.** Spheres and cones blended together give swollen joints and a body
  that reads as a mannequin, however carefully the solids are placed.
- **A jumpy camera.** The framing was worked out in 5° steps of turn, so the picture
  jumped as the figure turned.

The second version replaces the body and the renderer and keeps everything else (the
records, the equipment kit, the pose controller, the muscle tags, the themes):

| | First version | Now |
| --- | --- | --- |
| **Body** | about 120 procedural solids | MakeHuman's CC0 human mesh: 15,824 vertices on a 74-bone skeleton, 1.80 m |
| **Drawing** | ray marching, one shader | triangles, skinned on the graphics card |
| **Resolution** | ≤ 200,000 pixels, scaled up | the screen's own (up to 3 pixels a point), multisampled |
| **Hands** | fists | five fingers that close round the handle |
| **Outfit** | none | shorts with a hem, and trainers with soles |
| **Shadow** | a soft blob on the floor | a shadow map: the figure and the machine shadow the floor and themselves |
| **Camera** | 5° steps, a fixed turn rate | an exact fit at every angle, with weight, zoom and a reset |

## How it is built

```
MakeHuman's CC0 data ──► tools/body/bake.py ──► img/fig/body.bin + js/data/mannequin/body.js
                                                 (mesh, skin weights, muscles, outfit; skeleton)
exercise name ──► records.js ─ the record: keys, equipment, tempo, camera, refinements
                       │
library m, x ──► rig.js highlight() ─ which muscles light, and how much
                       │
time ──► motion.js phaseAt() ─ where in the repetition (eased lift, hold, lower, rest)
                       │
         motion.js sceneAt() ─ skin.js solve(): every bone's matrix for this pose
                       │      + kit.js props(): the equipment as solids
                       │
         mesh.js ─ each solid's shape as a mesh, built once, moved by a matrix
                       │
         js/ui/mannequin.js ─ WebGL2: shadow map, stage, floor, equipment, skinned body, arrow
```

| File | What it is |
| --- | --- |
| `img/fig/body.bin` | **The body's mesh**: positions, triangles, four bones and weights a vertex, the two muscles each vertex is most in, the outfit (how far inside the shorts, the trainer and its sole each point is) and how hollow it sits. 502 KB (230 KB compressed) |
| `js/data/mannequin/body.js` | The skeleton (74 bones: names, parents, rest heads and tails), the layout of `body.bin`, the muscle names. Generated |
| `js/data/mannequin/skin.js` | **The posing**: from a pose to every bone's matrix. Two-bone IK for arms and legs with a bending hint, the spine eased from the pelvis to the chest, the shoulder blade moving with the arm, the forearm's roll shared along it, the fingers' curl, the foot set by its sole |
| `js/data/mannequin/rig.js` | **The pose language** (documented at its top), the muscle tags and `MUSCLE_TAGS` (the app's muscle names → the body's muscles), `highlight()` |
| `js/data/mannequin/kit.js` | **The equipment**: free weights, benches, and a machine kit (beam, pad, seat, weight-stack tower, pivot hub, lever arm, grip) |
| `js/data/mannequin/mesh.js` | The kit's solids (sphere, ellipsoid, round cone, round cylinder, rounded box) as triangle meshes, each built once and kept |
| `js/data/mannequin/motion.js` | **The pose controller**: tempo and easing, pose interpolation, rigid arcs for levers, the scene at a moment, the camera's fit at any angle, the motion path and the arrow |
| `js/data/mannequin/records.js` | **The exercise records**: the two written by hand, and `recordFor(name)`, which falls back to the families |
| `js/data/mannequin/moves.js` | **The library's movements**: the families, and the table of which library exercise is which family |
| `js/data/mannequin/geom.js` | Vectors, the camera and its projection |
| `js/ui/mannequin.js` | The renderer, the camera's handling, the markup, mounting and teardown |
| `tools/body/bake.py` | Makes `body.bin` and `body.js` from MakeHuman's files (below) |
| `tools/figures/stills.mjs` | Draws each record's start and end with the live renderer, for the stills and thumbnails |
| `tools/figures/live.html` | Every record in every theme, live, for checking by eye |
| `tools/figures/review.mjs`, `review.py` | Each named exercise's start and end beside the library's two photographs of it, on sheets to look through |

All of `js/data/mannequin/` is pure (no DOM, no state), so it is tested in Node.

### The body

MakeHuman's base mesh (hm08) with its body-shape targets, its default skeleton and its
skin weights, all CC0 (see `CREDITS.md`; MakeHuman's code is AGPL and none of it is
used, its files are only read). `tools/body/bake.py`:

1. **Shapes the body** with MakeHuman's own sliders, weighted as MakeHuman weighs them:
   male, 25 years, muscle 0.78, weight 0.52, height 0.55, ideal proportions, plus a
   little more V-taper, lats and chest. An athlete, not a bodybuilder.
2. **Folds the skeleton** from 163 bones to 74: the face's bones, the toes and the
   breasts go into their parents. What is left is what a pose moves: the spine in five,
   the neck in three, the head, the shoulder blades, the arms in two and the forearms in
   two (for the roll), the wrists, every finger's three joints, the legs, the feet.
3. **Draws the muscles on the skin.** Each muscle the app can light (20 of them, from
   chest to calves) is a field over the body, found from the rest pose: on the limbs by
   where a point sits round its bone and along it, on the trunk by outlines on the
   front and back drawn in proportion to the trunk's height. The fields are eased along
   the mesh (about 2 cm), and each vertex keeps the two muscles it is most in, with how
   much. So a lit muscle has a smooth outline, two lit muscles that meet are one
   surface, and a lit muscle beside an unlit one fades.
4. **Dresses it.** The shorts are not geometry: each vertex stores how far inside them
   it is, and the shader draws the edge from that, sharp at any size, with a hem. The
   trainers are made: a sole the length of the foot, wide at the ball and narrow at the
   heel, a collar round the ankle, a toe box; carried by the foot's bone. The foot
   inside them is not drawn.
5. **Writes it** in the app's frame (x forward, y up, the figure's left at +z),
   positions quantised to 16 bits (to within 0.03 mm).

### The figure is independent of the exercise

There is one body. A record never brings its own body or its own muscles; it gives:

```js
"Machine Chest Press":{
  id:"bn_machine_chest_press",              // the library's id: the stills are named by it
  keys:[start, end],                        // two poses: pelvis, trunk, hands, elbow hints, grip…
  drive:onLevers(.78),                      // the hands follow the machine's lever arms
  equip:function(J,u,rec){…},               // the machine, built from the kit around the body
  tempo:[1.0,.3,1.7,.5],                    // lift, hold, lower, rest (seconds)
  cam:{yaw:55,pitch:8},                     // the view
  arrow:{track:"wr.l"},                     // what the arrow follows
  refine:{Shoulders:"Front delts"}}         // a broad library name narrowed for this movement
```

The pose language (pelvis, trunk lean and twist, head, hands and feet, which way elbows
and knees bend, which way a palm faces, the grip, the shoulder blades) is documented at
the top of `rig.js`. The muscles come from the library at run time: Machine Chest Press
is `m: Chest`, `x: Triceps, Shoulders`, so the chest lights in full and the triceps and
(refined) the front of the shoulder at half. The Seated Machine Row is `m: Back`,
`x: Biceps`: lats, traps and rear delts in full, biceps at half. `refine` can only swap
a name for another of the library's own names; it cannot invent one.

### Movement that is accurate, not just animated

- **Start and end are checked against the arm's geometry.** The press starts with the
  grips at chest height and the elbows bent (about 68°) and ends with the arms long but
  not locked (about 163°); the hands travel forward about a quarter of a metre, level,
  the grips drawing a little together. The row starts with the arms long and ends with
  the grips at the lower ribs, the elbows behind the shoulders (about 50° at the
  elbow). The unit tests hold these numbers.
- **The machine decides the path.** Each lever arm turns on a pivot overhead and keeps
  its length, and the palm stays on the grip all the way (to within a hundredth of a
  millimetre). Elbows are solved each frame by IK.
- **The body moves as a body.** The shoulder blade rises and comes forward as the arm
  reaches; the forearm turns along its length, not at the wrist; the fingers close round
  the handle; the hips sit on the seat.
- **Tempo.** Out of each end slowly, quickest through the middle; the lift (the working
  half) first, then a short hold, a slower lowering, a rest. The muscles glow hardest
  during the lift.
- **The arrow** follows the path the hand actually travels, the middle three quarters
  of it, set beside it: of several places it takes the one that covers least of the
  figure (with a little room round it). It is placed again when the figure is turned.

### Drawing it

A frame: the pose at this moment gives every bone's matrix, which go up as a small
float texture (4 texels a bone). A shadow map is drawn from the key light (1024 square).
Then the stage, the floor with the figure's shadow and its pool of light, the
equipment, the body (its skin moved by its bones in the vertex shader, four bones a
vertex) and the arrow over it.

The light is a studio's, fixed to the camera so the figure is lit well from any side: a
soft key from the front and above (wrapped, so the shading rolls off gently), a fill,
the theme's edge light from behind, the stage's sky and floor colours round it, and a
little extra shade in the hollows (worked out once, in the bake). How much each vertex
glows is worked out in the vertex shader from its two muscles, so the glow blends
smoothly across every triangle.

### The camera

- **A drag turns it** all the way round, and up and down from just below the hips' level
  to 48° above. It follows the finger closely, carries on a little when let go, and
  settles: a turn has weight.
- **Two fingers, or a wheel, bring it nearer or further** (0.7 to 1.6 times).
- **A double tap** eases back to the exercise's own view.
- **Nothing jumps.** The framing is worked out exactly for the angle the camera is at,
  aimed at a fixed point (the middle of the whole movement), so the distance changes
  smoothly as it turns (the unit tests measure it: at most 1.1% in 3°), and the whole
  movement stays in the picture from every side.

### The themes

Every colour comes from a `--mq-*` token in the six theme blocks of `index.html` (stage
top, middle, edge; the floor's pool of light; skin, metal, pad, steel, the machine's
line; the edge and floor lights; the muscle colours; the shade; the arrow), read from
the element, so a theme preview or a change of theme repaints it. The outfit is made
from those (the shorts from the pad, the trainers from the metal, their soles from the
steel), and the key and fill lights are a warm white blended toward the theme's edge
light.

| | Dark | Light |
| --- | --- | --- |
| **Red** | navy stage, blue rim and floor light, red-orange muscles, light-blue arrow | a pale stage, a lighter figure, red muscles, a blue arrow |
| **Blue** (default) | navy stage, muscles in the theme's blue, Signal Green arrow | pale blue stage, deep blue muscles, green arrow |
| **Sage** (once Monochrome) | deep teal stage, muscles in sage teal, a sage-white arrow | pale sage stage, deep teal muscles, a slate arrow |

### On a phone

- The body is downloaded once (502 KB, 230 KB compressed) and kept by the service
  worker with the rest of the app, so it works offline.
- It is drawn at the screen's own resolution, up to 3 pixels a point, multisampled. If
  frames take longer than 30 ms for a while, the resolution steps down by half a pixel
  a point, never below one pixel a point. If it is still too slow, the figure stops
  and holds still, with its play button.
- It stops when off screen (IntersectionObserver) or when the app is in the
  background. It holds still under reduced motion (the app's Animations setting or the
  system's) until play is pressed. A closed sheet releases the graphics context.
- No WebGL2, a driver that will not build the shaders, the body not loaded, or a lost
  context: the element keeps showing the two stills it was written with, so nothing is
  ever blank.

**Measured:** in the test environment's software renderer (SwiftShader on 4 CPU
cores), a frame at 364 × 272 takes about 0.1 to 0.2 s, against 0.85 s for the
ray-marched figure at the same size, while drawing every pixel instead of a reduced
set. That is CPU emulation of a GPU and only a relative measure. **Not measured:** real
phones. A triangle renderer of 28,000 triangles is light work for any phone GPU of the
last several years, but that is an expectation, not a test; the first real-device
check should be a mid-range Android phone with the preview page below.

## The library's movements

Most of the library is a few movements with different equipment, grips and positions,
so `js/data/mannequin/moves.js` writes each movement once, as a **family**, with its
biomechanics, and gives it parameters for what varies:

| Family | Parameters | Examples |
| --- | --- | --- |
| `curl` | barbell, EZ bar, dumbbells or cable; palms up, in, down, or turning up; standing, seated, incline, preacher; one arm | Barbell Curl, Hammer Curls, Preacher Curl, Incline Dumbbell Curl |
| `press` | barbell, dumbbells, kettlebells; standing or seated; Arnold's turn; one arm | Standing Military Press, Arnold Dumbbell Press |
| `raise` | to the side, the front, or the rear (bent over or face down on an incline bench) | Side Lateral Raise, Reverse Flyes |
| `shrug`, `uprightRow` | barbell or dumbbells | Barbell Shrug, Upright Barbell Row |
| `squat` | bar on the back, front rack, crossed arms, overhead, goblet (dumbbell or kettlebell), dumbbells, hands behind the head; stance | Barbell Squat, Goblet Squat, Overhead Squat |
| `hinge` | deadlift, Romanian, stiff-legged, sumo, good morning | Barbell Deadlift, Romanian Deadlift |
| `row` | barbell, dumbbells, kettlebell; grip; one arm with a knee and hand on a bench | Bent Over Barbell Row, One-Arm Dumbbell Row |
| `benchPress`, `fly` | barbell or dumbbells; flat, incline, decline or the floor; grip width | Barbell Bench Press, Dumbbell Flyes |
| `triceps` | overhead, lying (skull crusher), kickback, cable pushdown; bar, rope, dumbbells | EZ-Bar Skullcrusher, Triceps Pushdown |
| `pushup`, `pullup`, `dip`, `crunch`, `plank`, `lunge`, `calfRaise`, `bridge` | hands on a box or a bar, feet raised; grip; lean; split, forward or reverse, rear foot on a bench; bench or floor | Pushups, Chin-Up, Sit-Up, Barbell Hip Thrust |
| `pulldown`, `cableRow`, `crossover` | wide, close, underhand or V-handle grip; behind the neck; one arm | Wide-Grip Lat Pulldown, Seated Cable Rows, Cable Crossover |
| `legMachine`, `legPress`, `pecDeck` | leg extension, lying or seated leg curl; stance; the pec deck forward or reversed | Leg Extensions, Lying Leg Curls, Leg Press, Butterfly |
| `stepUp`, `sideBend`, `benchDip`, `invertedRow`, `legRaise`, `hyper`, `kbSwing` | dumbbells or a bar; feet raised; on the floor, a bench or hanging, knees bent; one arm | Dumbbell Step Ups, Bench Dips, Hanging Leg Raise, Hyperextensions |

A family places the body with the same pose language as the hand-written records, and
then puts the hands on what they hold: `grasp` sets each hand round its handle (the
handle in the middle of the palm, the fingers along the forearm, the palm the right way
round), so a bar is always in both palms and a dumbbell in its hand, whatever the arms
do. Free weights hang where straight arms put them and clear the legs; a bar on the
back rides on the trapezius; the benches (flat, incline, decline, preacher) are placed
from the body.

**Which exercise is which family is written by hand** in `TABLE`, by the library's
exact name: nothing is guessed from a name. An exercise is added only after its row on
a review sheet agrees with the library's photographs: the same setup (standing, seated,
on a bench, face down), the same implement, the same start and end. 162 of the
library's exercises are in it so far. The first pass over 62 found real differences,
all fixed before any shipped: Reverse Flyes is
done face down on an incline bench, the library's Split Squat with Dumbbells has the
rear foot on a bench, its Front Barbell Squat crosses the arms, its Goblet Squat holds a
kettlebell, its Bodyweight Squat has the hands behind the head, and the kickback has a
knee and hand on a bench. Later passes did the same:

- the incline push-ups are done with the hands on a bar, so they got a variant;
- the one-arm exercises got the free arm the photographs show (hanging with its dumbbell, empty, or on the hip);
- the pulldown and reverse-fly machines got their weight stacks in front, as in the photographs.

Exercises whose photographs show a setup no family draws yet were left out rather than
drawn wrongly: a kettlebell press seated on the floor with the legs apart, a one-arm
kettlebell row in a split stance, a one-arm press braced on a bench, a lat pulldown with
two separate handles, and a one-arm low cable crossover.

**What lights up** stays the library's. Where the library lists no secondary muscles,
the app fills them in from the movement's pattern; raises and shrugs are filed as
pushes and pulls, so they used to borrow a press's (triceps and chest) or a row's
(biceps). They now get their own: the traps for a raise, the forearms for a shrug,
on the figure and on the exercise sheet's muscle map alike.

To add exercises: put them in `TABLE` with their family and parameters, then

```sh
node tools/figures/review.mjs OUT "Name one" "Name two"    # their start and end, drawn
python3 tools/figures/review.py OUT                         # beside the library's photographs
```

and look at every row. The unit tests then hold every exercise in the table to:

- its name being in the library;
- solving at every moment, with the hands reaching what they hold all the way through;
- nothing going through the floor;
- moving;
- being in the picture from its own view.

## Setup and testing

Nothing to install for the app. No dependencies were added.

```sh
python3 -m http.server 8765                 # from the repository's folder
# the app:      http://localhost:8765/   → Train → the exercise library → Machine Chest Press
# the preview:  http://localhost:8765/tools/figures/live.html   (every theme side by side;
#               ?ex=Seated%20Machine%20Row&themes=red-dark,mono-light to narrow it)

node tests/engine.mjs          # the model's unit tests (data/test/mannequin.test.js)
node tests/architecture.mjs    # the layer rules (the model is in js/data, pure)
PW_PATH=$(npm root -g)/ CHROMIUM=… ONLY="Live figure" node tests/regression.mjs
```

The unit tests cover:

- **the records:** they come from the library, the ids match, and they name no muscles;
- **the highlighted muscles:** exactly those the library gives, and every one a region
  of the body's skin;
- **the body:** a full mesh on 74 bones, 1.80 m standing; in every pose each bone only
  turns and moves (no stretch, no shear) and each joint stays where its parent holds it;
- **the IK:** a hand within reach is put exactly where it is asked, its elbow bending
  toward the hint; out of reach the arm reaches straight toward it;
- **the movement:** joint angles, travel, the rigid levers, the palms on the grips, the
  hips on the seat, and the path's direction;
- **the tempo:** it is eased and continuous;
- **the equipment:** every piece is a closed mesh facing out;
- **the picture:** from every side the whole movement stays in view and the camera's
  distance changes smoothly; the arrow sits inside the picture and points the way the
  hands move.

The browser tests check the figure in the actual app:

- in the exercise sheet it draws, lights its muscles (compared with the same figure unlit), survives a repaint, turns under a drag, plays and pauses, and lets go when closed;
- the row works too;
- light mode lightens the stage, and Sage and Blue have no red (these run in Red, where the lit muscles are the red the test looks for);
- in the workout it draws and keeps running through repaints;
- without WebGL2 the stills show;
- the stills and thumbnails ship.

The stills are re-made whenever a pose or the look changes, by the live renderer:

```sh
node tools/figures/stills.mjs OUT                      # start and end of every record, 1080×810
python3 tools/images.py rendered OUT                   # img/fig/, img/ex/, js/data/figures.js
```

The body is re-baked only if its shape, muscles or outfit change (needs numpy and a
copy of MakeHuman's repository):

```sh
git clone --depth 1 https://github.com/makehumancommunity/makehuman
python3 tools/body/bake.py makehuman/makehuman/data img/fig/body.bin js/data/mannequin/body.js
```

## Adding an exercise

1. Add a record to `js/data/mannequin/records.js` under the library's exact name, with
   its `id`. Set two keys: the stretched position first.
2. Build its equipment from `kit.js`. If the machine guides the hands, use a `drive`
   (as `onLevers`) so they follow it. If a piece is missing, add it to the kit, not the
   record.
3. Check the muscles the library gives. Narrow a broad one with `refine` only to
   another library name.
4. Look at it in `tools/figures/live.html`, in every theme and from every side. Add its
   numbers (angles, travel, direction) to `js/data/test/mannequin.test.js`.
5. Render its stills (above), and add any new module files to `sw.js`.

`tools/figures/poses.mjs` holds drafted poses for the other exercises without
photographs (from the earlier line drawings). They are a starting point for records,
not records: each still needs its equipment, its two keys checked against the
movement, and a look from every side before it is shown.

## What it does not do yet

- **Not the whole library yet.** The families cover the exercises in `TABLE`; the
  rest keep their photographs until each has been checked. A figure doing the wrong
  movement is worse than a photograph.
- **No face detail, no cloth movement, no muscles that change shape** as they work:
  the glow shows what works, the body's shape stays the same.
- **The machines are generic selectorized designs**, not a particular brand. The
  levers turn on overhead pivots so the hands follow a true arc.
- **Performance on real phones has not been measured** (above).
- **Arabic:** the figure has no text in it; its two labels (the drag hint and the
  play/pause name) are translated.
- **No Purple theme.** It is in the original reference but is not a BUNYAN theme. If
  one is added, the figure needs no code: a `[data-palette="purple"]` block with the
  `--mq-*` tokens is enough.

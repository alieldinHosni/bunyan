# The 3D figure (pilot)

A real-time 3D figure that does the exercise: one sculpted, faceless body on gym
equipment, the muscles the exercise works lit red, an arrow the way the movement goes,
on a stage in the app's theme colours. It runs in the app, offline, with no library and
no build step. Two exercises have it so far, on purpose: **Machine Chest Press** (the
reference's Seated Chest Press) and **Seated Machine Row**, the second built from the
first one's parts to show that the figure, the equipment and the motion are reusable.

Where it appears: the exercise sheet (it plays, and a drag turns it) and the workout
screen (it plays and does not turn, because a sideways swipe there changes exercise).
Everywhere else (lists, the library) the exercise shows a still thumbnail of the same
figure.

## The audit this was built on

Verified in the repository before anything was written:

- **The app** is plain ES modules loaded by the browser: no `package.json`, no bundler,
  no TypeScript, no React, no three.js. It is an offline PWA: `sw.js` precaches every
  module. Pages are strings of markup patched into the DOM (`js/ui/patch.js`), and
  `render()` runs after every change.
- **3D**: none before this. No WebGL anywhere. Chromium in the test environment has
  WebGL2 (software, through SwiftShader).
- **Themes**: `data-palette` (red, blue, mono) × `data-theme` (dark, light) on `<html>`,
  six blocks of tokens in `index.html`, and a test that fails if the stylesheet names a
  colour outside them. **There is no Purple theme.**
- **Exercise data**: `exercises.json`, 876 records keyed by name, each with a stable id
  `i`, the main muscle `m` and the others `x`; `js/data/extra.js` adds 75 of Bunyan's
  own. Both pilot exercises are Bunyan's own and had no pictures at all.
- **Existing pictures**: photographs for the library (free-exercise-db), list
  thumbnails in `img/ex/`, line drawings for the warm-up drills (`js/data/poses.js`), the
  SVG muscle map on the exercise sheet (`js/data/bodymap.js`).
- **Tools in the container**: Node 22, Python with Pillow and numpy, Chromium. No
  Blender, no GPU, no image generator, and network access to GitHub only.

## The starter code, and why it was not used as it was

The brief's `BunyanMannequin.tsx` is React, TypeScript, three.js and
@react-three/fiber, with a `THEME` object (dark, light, purple), body parts as capsules
and spheres on joints, a `Mannequin` component and a preview. It was read as a
reference. Its limitations, against this repository:

1. **Dependencies the app does not have.** It needs `react`, `react-dom`, `three` and
   `@react-three/fiber`, a TypeScript compiler and a bundler (Vite or similar), so a
   `package.json`, `node_modules`, a build step and a changed deploy. BUNYAN has none of
   these by design: the browser loads the source as it is. Adding them would change how
   the whole app is built, for one component.
2. **The body is capsules.** It cannot look like the reference: no muscle shapes, no
   blend between parts, nothing for a muscle highlight to light but a whole limb.
3. **Poses as joint angles.** Hands cannot be put on a handle; every exercise would be
   hand-tuned angles, and the equipment would not follow the body.
4. **Muscles by body part**, not from the exercise's data.
5. **Its own colours.** The `THEME` object is not BUNYAN's themes and would drift from
   them.
6. **No equipment, no motion arrows, no fallback** when 3D is missing, nothing to stop
   it off screen, no reduced motion, no accessible name.

What was kept from it is the idea: one reusable figure, a pose controller, equipment as
components, highlights by muscle, and theme variants.

## How it is built

The figure is a field of rounded solids (spheres, ellipsoids, round cones, boxes,
cylinders): the body's volumes with the muscles laid over them, each blended in with a
small radius so it swells out of the limb under it, and the lines between muscles carved
as shallow grooves. The graphics card draws it by marching a ray from each pixel into
that field (a signed-distance-field ray marcher in one fragment shader). Nothing is
downloaded and there is no mesh file: the model is about 53 KB of JavaScript, the
renderer 33 KB.

```
exercise name ──► records.js ─ the record: keys, equipment, tempo, camera, refinements
                       │
library m, x ──► rig.js highlight() ─ which muscles light, and how much
                       │
time ──► motion.js phaseAt() ─ where in the repetition (eased lift, hold, lower, rest)
                       │
         motion.js sceneAt() ─ rig.js figure() + kit.js props(): the solids of this moment
                       │
         pack.js ─ the solids as a float texture and a cluster table
                       │
         js/ui/mannequin.js ─ WebGL2: floor pass, scene pass, glow, picture + arrow
```

| File | What it is |
| --- | --- |
| `js/data/mannequin/geom.js` | Vectors, the five solids, their exact distances, the scene's distance field, the camera |
| `js/data/mannequin/rig.js` | **The base figure**: proportions, two-bone IK, the sculpted body, the muscle tags and `MUSCLE_TAGS` (the app's muscle names → the figure's muscles), `highlight()` |
| `js/data/mannequin/kit.js` | **The equipment**: free weights, benches, and a machine kit (beam, pad, seat, weight-stack tower, pivot hub, lever arm, grip) |
| `js/data/mannequin/motion.js` | **The pose controller**: tempo and easing, pose interpolation, rigid arcs for levers, the scene at a moment, framing, the motion path and the arrow |
| `js/data/mannequin/records.js` | **The exercise records**: the two pilot exercises |
| `js/data/mannequin/pack.js` | The layout handed to the graphics card |
| `js/ui/mannequin.js` | The renderer, the markup, mounting and teardown |
| `tools/figures/` | The same model rendered offline at print quality for the stills (`run.mjs`), and `live.html`, a page showing the live figure in every theme |

All of `js/data/mannequin/` is pure (no DOM, no state), so it is tested in Node.

### The figure is independent of the exercise

There is one body. A record never brings its own figure or its own muscles; it gives:

```js
"Machine Chest Press":{
  id:"bn_machine_chest_press",              // the library's id: the stills are named by it
  keys:[start, end],                        // two poses: pelvis, trunk, hands, elbow hints…
  drive:onLevers(.78),                      // the hands follow the machine's lever arms
  equip:function(J,u,rec){…},               // the machine, built from the kit around the body
  tempo:[1.0,.3,1.7,.5],                    // lift, hold, lower, rest (seconds)
  cam:{yaw:55,pitch:8},                     // the view
  arrow:{track:"wr.l"},                     // what the arrow follows
  refine:{Shoulders:"Front delts"}}         // a broad library name narrowed for this movement
```

The muscles come from the library at run time: Machine Chest Press is `m: Chest`,
`x: Triceps, Shoulders`, so the chest lights in full and the triceps and (refined) the
front of the shoulder at half. The Seated Machine Row is `m: Back`, `x: Biceps`: lats,
traps and rear delts in full, biceps at half. `refine` can only swap a name for another
of the library's own names; it cannot invent one.

### Movement that is accurate, not just animated

- **Start and end are checked against the arm's geometry.** The press starts with the
  grips wide at mid-chest height and the elbows out in line with the body, about 60° at
  the elbow, and ends with the arms long but not locked, about 169°; 0.33 m of travel,
  the grips drawing together. The row starts with the arms long (about 160°) and ends
  with the grips at the lower ribs and the elbows back and down behind the shoulders.
  The unit tests hold these numbers.
- **The machine decides the path.** Each lever arm turns on a pivot overhead and keeps
  its length: the grips run on a true arc (to within a millionth of a metre), and the
  hands stay on the grips all the way (within 2 mm). Elbows are solved each frame by IK.
- **Tempo.** Out of each end slowly, quickest through the middle; the lift (the working
  half) first, then a short hold, a slower lowering, a rest. The muscles glow hardest
  during the lift.
- **The arrow** follows the path the hand actually travels, the middle three quarters
  of it, set beside the body: of several places it takes the one that covers least of
  the figure. It is placed again when the figure is turned.

### The themes

Every colour is a `--mq-*` token in the six theme blocks of `index.html` (stage top,
middle, edge; the floor's pool of light; skin, metal, pad, steel, the machine's line;
the edge and floor lights; the muscle colours; the shadow; the arrow), read from the
element, so a theme preview or a change of theme repaints it. It follows BUNYAN's real
configuration:

| | Dark | Light |
| --- | --- | --- |
| **Red** (default) | the reference's Dark: navy stage, blue rim and floor light, red-orange muscles, light-blue arrow | the reference's Light: a pale stage, a lighter figure, red muscles, a blue arrow |
| **Blue** | navy stage, muscles in the theme's blue, Signal Green arrow | pale blue stage, deep blue muscles, green arrow |
| **Monochrome** | near-black stage, muscles in Ghost Green white | Ghost Green stage, muscles in near-black |

**Purple** is in the reference but is not a BUNYAN theme, so it is not wired to
anything. Adding a whole app palette is a product decision beyond this pilot. If one is
added, the figure needs no code: a `[data-palette="purple"]` block with the `--mq-*`
tokens (for the reference's look, a stage of about `#1A0F2E` → `#2A1748` → `#0C0716`,
a violet pool `#7A3FD6`, a lilac rim `#D7B8FF`, and the red muscles kept) is enough.

### On a phone

- The scene is ray-marched at no more than about 200,000 pixels and scaled up. If the
  frame rate falls (frames slower than 30 ms), the resolution steps down to 30%. If it
  is still too slow, the figure stops and holds still, with its play button.
- Each ray first tests the bounding spheres of about eleven clusters of solids (the
  body's regions, the shoes, the equipment in groups) and only ever evaluates the ones
  it passes near. The soft shadow on the floor is worked out at a quarter of the size.
- It stops when off screen (IntersectionObserver) or when the app is in the background.
  It holds still under reduced motion (the app's Animations setting or the system's)
  until play is pressed. A closed sheet releases the graphics context.
- No WebGL2, a driver that will not build the shader, or a lost context: the element
  keeps showing the two stills it was written with (the same figure at the start and
  end, from `tools/figures/`), so nothing is ever blank.

**Measured:** in the test environment's software renderer (SwiftShader on 4 CPU
cores), one frame at 366 × 274 takes about 0.85 s. That is CPU emulation of a GPU and is
only a relative measure. **Not measured:** real phones. A GPU is typically one to two
orders of magnitude faster than SwiftShader, which puts a mid-range phone in the range
where the adaptive resolution keeps it smooth, but that is an estimate, not a test. The
first real-device check should be a mid-range Android phone with the preview page
below.

## Setup and testing

Nothing to install. No dependencies were added.

```sh
python3 -m http.server 8765                 # from the repository's folder
# the app:      http://localhost:8765/   → Train → the exercise library → Machine Chest Press
# the preview:  http://localhost:8765/tools/figures/live.html   (every theme side by side;
#               ?ex=Seated%20Machine%20Row&themes=red-dark,mono-light to narrow it)

node tests/engine.mjs          # 46 unit tests for the model (data/test/mannequin.test.js)
node tests/architecture.mjs    # the layer rules (the model is in js/data, pure)
PW_PATH=$(npm root -g)/ CHROMIUM=… ONLY="Live figure" node tests/regression.mjs
```

The unit tests cover:

- **the records:** they come from the library, the ids match, and they name no muscles;
- **the highlighted muscles:** exactly those the library gives;
- **one body:** both exercises use the same figure;
- **the movement:** joint angles, travel, the rigid levers, the hands on the grips, and the path's direction;
- **the tempo:** it is eased and continuous;
- **the packing:** the packed solids read back exactly as the model's solids, every solid once, the clusters in order;
- **the picture:** the framing keeps the whole movement in view, and the arrow sits inside the picture and points the way the hands move.

The browser tests check the figure in the actual app:

- in the exercise sheet it draws, lights its muscles (compared with the same figure unlit), survives a repaint, turns under a drag, plays and pauses, and lets go when closed;
- the row works too;
- light mode lightens the stage, and Monochrome and Blue have no red;
- in the workout it draws and keeps running through repaints;
- without WebGL2 the stills show;
- the stills and thumbnails ship.

The stills are re-made from the records whenever a pose changes:

```sh
node tools/figures/run.mjs OUT "machine chest press"    # 1080×810 PNGs and the path (PREVIEW=1: half size)
python3 tools/images.py figures OUT                     # img/fig/, img/ex/, js/data/figures.js
```

## Adding an exercise

1. Add a record to `js/data/mannequin/records.js` under the library's exact name, with
   its `id`. Set two keys: the stretched position first.
2. Build its equipment from `kit.js`. If the machine guides the hands, use a `drive`
   (as `onLevers`) so they follow it. If a piece is missing, add it to the kit, not the
   record.
3. Check the muscles the library gives. Narrow a broad one with `refine` only to
   another library name.
4. Look at it in `tools/figures/live.html`, in every theme. Add its numbers (angles,
   travel, direction) to `js/data/test/mannequin.test.js`.
5. Render its stills (above), and add the new module files to `sw.js` if you add any.

## A rigged model, and what to make for production

**Looked for, not found.** A licensed, rigged, anatomical human with muscle regions
that could ship in a free offline app:

- MakeHuman's base meshes are CC0 but generic and need Blender to rig and export.
- BodyParts3D and Z-Anatomy are anatomically detailed but CC BY-SA (share-alike) and
  not rigged.
- Mixamo's characters and animations are free to use in projects under Adobe's terms,
  which restrict handing out the files themselves. A PWA ships its model as a file
  anyone can download, so those terms would need checking before use.
- Quaternius and Kenney are CC0 but stylised, not anatomical.

There is no Blender here to adapt any of them, so the pilot uses the procedural figure,
which needs no asset at all.

**The best production path** keeps the records, the kit's roles, `MUSCLE_TAGS` and the
pose controller, and replaces the procedural body with assets made separately:

1. **A sculpted base mesh**: about 15–30k triangles, athletic and faceless, matching the
   reference. Blender, starting from MakeHuman CC0 or sculpted.
2. **A rig**: a humanoid skeleton, Mixamo-compatible names so motion tools work, with
   two-bone IK targets for the hands and feet. The records' keys already give wrist and
   ankle targets.
3. **Muscle masks**: one region per tag in `MUSCLE_TAGS`, as vertex groups or a mask
   texture, so the highlight stays driven by the library's data.
4. **Equipment models** for the kit's roles (seat, tower, lever arm, grip, bench, bar),
   so a record keeps naming parts, not files.
5. **Motion**: the records' two keys and tempo already describe each exercise. Baked
   clips (glTF animation) would add in-between nuance such as scapular movement and
   wrist roll.
6. **Format and budget**: glTF 2.0 (`.glb`) with Draco or meshopt compression, about
   1–2 MB for the figure and kit, precached.

Drawing that needs a mesh renderer with skinning. Either extend `js/ui/mannequin.js`
(raw WebGL2, no dependency), or vendor three.js as an ES module file into `js/vendor/`
(no build step needed), which would take a change to the layer rules (today only the
engine may use `js/vendor/`).

## What it does not do yet

- **Two exercises only**, by design. The other 69 exercises without photographs keep
  their current pictures until the pilot is approved.
- **The figure is procedural.** It is close to the reference in style but not an
  artist's sculpt. It has no fingers (fists only), no shoulder blades moving (a full
  row also pulls them back), and no cloth.
- **The machines are generic selectorized designs**, not a particular brand. The
  levers turn on overhead pivots so the hands follow a true arc.
- **Performance on real phones has not been measured** (above).
- **Arabic:** the figure has no text in it; its two labels (the drag hint and the
  play/pause name) are translated.
- **No Purple theme** (above).

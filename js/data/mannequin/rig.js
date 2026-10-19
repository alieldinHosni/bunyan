/* Bunyan — the mannequin: the pose language
   One body for every exercise (skin.js: a real human mesh on its skeleton). An exercise
   never brings its own body: it gives a pose (where the pelvis is, how the trunk leans,
   where the hands and feet go) and the body is solved to it. Elbows and knees are found
   by two-bone inverse kinematics, bending toward a hint, so a hand can be put on a
   handle and the arm follows.

   pose = {
     pelvis:[x,y,z]              the pelvis centre (6 cm above the hips)
     yaw, pitch, roll, twist     degrees. pitch leans the trunk forward (90 = face down,
                                 -90 = on the back); roll leans it to its left; twist
                                 turns the chest on the hips
     axes:{u,f}                  the trunk by its up and forward axes instead (lying on
                                 a side, a side plank)
     head, look                  degrees the head nods forward from the trunk's line,
                                 and turns to its left
     hands:{l,r}  feet:{l,r}     wrist and ankle targets; left out, an arm hangs and a
                                 leg stands straight under its hip
     elbows:{l,r} knees:{l,r}    the way each bends (a direction): back and forward by
                                 default
     handDir:{l,r} footDir:{l,r} where a hand or foot points: along the forearm, and
                                 square to the shin toward the knee's front, by default
     palm:{l,r}                  the way a palm faces (a direction): toward the body's
                                 middle by default, a neutral grip
     grip                        how the fingers close: "open", "grip" (round a bar or
                                 a handle), "fist", or 0..1; per side as {l,r}
     toes:{l,r}                  degrees a foot points down from that (a calf raise)
     sole:{l,r}                  the way a sole faces, for a foot on a plate or a wall
     shrug, reach:{l,r}          degrees the shoulder blade lifts and comes forward,
                                 beyond what the arm brings by itself
   }

   World axes, in metres: x forward (the way the figure faces), y up, z the figure's
   left. Pure: no DOM, no state. */
import {solve, frame, axesFrame, ik, DIM} from "./skin.js";

/* Every joint of a pose (skin.js solve): P the pelvis, its frame pf and the chest's cf,
   neck, head (its up hu and forward hf), and per side sh shoulder, el elbow, wr wrist,
   hd where the hand points, pn the way the palm faces, grip where a handle sits in the
   hand, hip, kn knee, an ankle, fd the foot's frame. */
function joints(p){return solve(p).J;}

/* The app's muscle names (exercises.json m and x, and the names Progress and the coach
   use), as the muscles of the figure. */
var MUSCLE_TAGS={Chest:["chest"],"Upper chest":["chest"],Shoulders:["frontdelt","sidedelt","reardelt"],
  "Front delts":["frontdelt"],"Rear delts":["reardelt"],Back:["lats","traps","reardelt"],"Upper back":["traps","reardelt"],
  Lats:["lats"],"Lower back":["lowerback"],Traps:["traps"],Biceps:["biceps"],Triceps:["triceps"],Forearms:["forearms"],
  Quads:["rf","quads"],Hamstrings:["hams"],Glutes:["glutes","gmed"],"Hams & glutes":["hams","glutes"],Legs:["rf","quads","hams","glutes"],
  Calves:["calves"],Core:["abs","obliques"],Abs:["abs"],Obliques:["obliques"],Adductors:["adductors"],Abductors:["gmed"],
  "Hip flexors":["rf"],Neck:["neck"]};
/* What an exercise works, as the figure's lit muscles: its main muscle in full, the
   others at half. refine narrows a broad name to the part an exercise really uses
   ({Shoulders: "Front delts"} for a press), in the app's own muscle names. */
function highlight(primary,secondary,refine){
  var hl={};refine=refine||{};
  function tags(m){return MUSCLE_TAGS[refine[m]||m]||[];}
  (secondary||[]).forEach(function(m){tags(m).forEach(function(t){hl[t]=Math.max(hl[t]||0,.5);});});
  tags(primary).forEach(function(t){hl[t]=1;});
  return hl;}

export {DIM, frame, axesFrame, ik, joints, MUSCLE_TAGS, highlight};

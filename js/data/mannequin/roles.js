/* Bunyan — the figure's muscles by role (docs/FIGURE-V3.md 2.4, F-4, the data half)
   What an exercise works, and how: the prime mover, the synergists that help it, and
   the stabilisers that hold still while they work (js/knowledge/anatomy.js MUSCLE_ROLES,
   7.4). The renderer lights each muscle at its role's level (litFor, js/ui/mannequin.js).

   Which muscles: the library's own (exercises.json m and x, through the record's
   refinement, as rig.js highlight). The prime mover is its m, the synergists its x. A
   family adds only stabilisers, from a short fixed list, each with where it comes
   from; a muscle the library already names keeps the library's role (the library
   wins, and the test reports where the two meet). No muscle is invented.

   Pure: no DOM, no state. */
import {MUSCLE_TAGS} from "./rig.js";
import {FAMILIES, TABLE} from "./moves.js";

/* The stabilisers a family adds, in the app's muscle names. src: the knowledge entry.
   - Core holds the lumbo-pelvic-hip complex during hip extension (7.4: transversus
     abdominis and internal obliques, the library's Core).
   - In a squat the hip abductors and adductors hold still against side-to-side and
     turning movement while the legs work (7.3, the squat example).
   - The rotator cuff holds the shoulder during upper-limb movement (7.4); the figure
     has no rotator cuff of its own, so it is shown as the rear of the shoulder in the
     presses (docs/FIGURE-V3.md 2.4). */
var HIPEXT={muscles:["Core"],src:"anatomy 7.4"};
var CUFF={muscles:["Rear delts"],src:"anatomy 7.4",note:"the rotator cuff, shown as the rear delt"};
var STAB={
  squat:[HIPEXT,{muscles:["Abductors","Adductors"],src:"anatomy 7.3"}],
  hinge:[HIPEXT],lunge:[HIPEXT],bridge:[HIPEXT],kbSwing:[HIPEXT],pullThrough:[HIPEXT],stepUp:[HIPEXT],hyper:[HIPEXT],
  press:[CUFF],benchPress:[CUFF],pushup:[CUFF],dip:[CUFF],cablePress:[CUFF],benchDip:[CUFF]};

/* An exercise's family, by name (moves.js TABLE). */
var FAMNAME=new Map(Object.keys(FAMILIES).map(function(k){return [FAMILIES[k],k];}));
function familyOf(name){var row=Object.prototype.hasOwnProperty.call(TABLE,name)?TABLE[name]:null;return row?FAMNAME.get(row[0])||null:null;}

/* {figureTag: {level, role}}: prime 1, synergist .5, stabiliser .3. refine narrows a
   broad name as in rig.js highlight. */
function rolesFor(primary,secondary,refine,family){
  var out={};refine=refine||{};
  function tags(m){return MUSCLE_TAGS[refine[m]||m]||[];}
  function put(tag,level,role){var o=out[tag];if(!o||o.level<level)out[tag]={level:level,role:role};}
  (STAB[family]||[]).forEach(function(s){s.muscles.forEach(function(m){tags(m).forEach(function(t){put(t,.3,"stabiliser");});});});
  (secondary||[]).forEach(function(m){tags(m).forEach(function(t){put(t,.5,"synergist");});});
  tags(primary).forEach(function(t){put(t,1,"prime");});
  return out;}

/* What the renderer lights, {figureTag: level}: the roles' levels (prime 1, synergist .5
   as rig.js highlight gives them; a stabiliser .3, faintest). */
function litFor(name,primary,secondary,refine){
  var r=rolesFor(primary,secondary,refine,familyOf(name)),out={};
  for(var k in r)out[k]=r[k].level;
  return out;}

export {familyOf, litFor, rolesFor, STAB};

/* Bunyan — what the squat check found, and the corrective work for it
   Owner, 2 Nov ("all, in order"), item 3: "an overhead-squat self-check in the
   assessment; a few taps on what you notice map to the book's overactive and
   underactive muscles; the warm-up then adds the release and activation for them".

   The faults and the muscles behind each are the knowledge base's
   (js/knowledge/imbalances.js MOVEMENT_FAULTS, from the overhead squat, pushing and
   pulling assessments). The order of the work is the book's corrective continuum
   (js/knowledge/corrective.js SEQUENCE): calm the overactive muscles (rolling, at least
   30 s on a tender spot), lengthen them (static stretch, 30 s), then wake the underactive
   ones (slow, 12–20 reps), all in the warm-up; the lifts that follow are the fourth stage.
   1–3 muscle groups at a time, as the book doses rolling and stretching (two here).

   What is not here is an exercise picked for a muscle: the book names muscles, not
   exercises in this app's library. MAP is that choice, each one an exercise the library
   has (with its picture), and a muscle with no fitting exercise (the deep neck flexors,
   the shin muscles' activation) is left out rather than given an invented one. The
   rolling the book warns against (over the lower back and the neck) is never offered.

   correctiveFor(faults, o) → null | {over[], under[], inhibit[], lengthen[], activate[]}
     o.avoid(name) → true for an exercise to leave out (lying down, for a condition).
   Pure. */
import {MOVEMENT_FAULTS} from "../knowledge/imbalances.js";

/* What the assessment asks, in plain words, by the knowledge base's fault id. */
var ASK=[["ohsa_feet_turn_out","Feet turn out"],["ohsa_knees_in","Knees cave in"],["ohsa_low_back_arch","Lower back arches"],
  ["ohsa_forward_lean","Chest drops far forward"],["ohsa_arms_forward","Arms drift forward"],
  ["push_shoulders_elevate","Shoulders shrug up when you press or row"],["push_head_forward","Head pokes forward when you press or row"]];

/* Muscle (as the knowledge base names it) → [roll, stretch] for one overactive, and
   [activation, the same without lying down] for one underactive. "" where the library has
   nothing that fits, or the book says not to roll there. */
var OVER={
  "gastrocnemius":["Calves-SMR","Standing Gastrocnemius Calf Stretch"],
  "soleus":["Calves-SMR","Standing Soleus And Achilles Stretch"],
  "hamstring complex":["Hamstring-SMR","Hamstring Stretch"],
  "tensor fasciae latae":["Iliotibial Tract-SMR","IT Band and Glute Stretch"],
  "adductors":["","Butterfly Stretch"],
  "hip flexor complex":["Quadriceps-SMR","Kneeling Hip Flexor"],
  "rectus femoris":["Quadriceps-SMR","Kneeling Hip Flexor"],
  "psoas":["","Kneeling Hip Flexor"],
  "lumbar extensors":["","Child's Pose"],
  "latissimus dorsi":["Latissimus Dorsi-SMR","Overhead Lat Stretch"],
  "teres major":["Latissimus Dorsi-SMR","Overhead Lat Stretch"],
  "pectoralis major":["","Doorway Chest Stretch"],
  "pectoralis minor":["","Doorway Chest Stretch"],
  "rectus abdominis":["","Standing Lateral Stretch"],
  "external obliques":["","Standing Lateral Stretch"],
  "levator scapulae":["","Chin To Chest Stretch"],
  "upper trapezius":["","Chin To Chest Stretch"],
  "sternocleidomastoid":["",""]};
/* A stretch that has a version without the floor, for those who cannot lie or kneel down. */
var STANDING={"Kneeling Hip Flexor":"Standing Hip Flexors","Child's Pose":"Overhead Lat Stretch","Butterfly Stretch":""};
var UNDER={
  "gluteus maximus":["Glute Bridge Hold","Hip Extension with Bands"],
  "gluteus medius":["Monster Walk","Monster Walk"],
  "hamstring complex":["Ball Leg Curl","Standing Leg Curl"],
  "abdominals":["Dead Bug","Pallof Press"],
  "lumbar extensors":["Bird Dog","Bird Dog"],
  "middle trapezius":["Band Pull Apart","Band Pull Apart"],
  "lower trapezius":["Band Pull Apart","Band Pull Apart"],
  "rhomboids":["Band Pull Apart","Band Pull Apart"],
  "posterior deltoid":["Face Pull","Face Pull"],
  "rotator cuff":["External Rotation with Band","External Rotation with Band"],
  "tibialis anterior":["",""],"tibialis posterior":["",""],"deep cervical flexors":["",""]};
/* What the activation holds or repeats: a hold in seconds, else slow reps, each side
   where it is one side at a time. The book's phase-1 activation is 12–20 slow reps. */
var DOSE={"Glute Bridge Hold":{sec:20},"Dead Bug":{n:12,side:1},"Bird Dog":{n:12,side:1},"Monster Walk":{n:12,side:1},
  "Ball Leg Curl":{n:12},"Standing Leg Curl":{n:12,side:1},"Hip Extension with Bands":{n:12,side:1},"External Rotation with Band":{n:12,side:1}};
var ONE_SIDE=/Hip Flexor|Hamstring Stretch|Gastrocnemius|Soleus|IT Band|Overhead Lat|Lateral Stretch/;
/* Two of each: the book's 1–3, kept to the shorter end so the warm-up stays a warm-up. */
var MAX=2,HOLD=30;

function faultById(id){for(var i=0;i<MOVEMENT_FAULTS.length;i++)if(MOVEMENT_FAULTS[i].id===id)return MOVEMENT_FAULTS[i];return null;}
/* Muscles across the faults, the ones more faults name first. */
function ranked(faults,key){
  var n={},first={};
  faults.forEach(function(f,i){(f[key]||[]).forEach(function(m,j){n[m]=(n[m]||0)+1;if(first[m]==null)first[m]=i*10+j;});});
  return Object.keys(n).sort(function(a,b){return n[b]-n[a]||first[a]-first[b];});}

function correctiveFor(ids,o){
  o=o||{};var avoid=o.avoid||function(){return false;},has=o.has||function(){return true;};
  var faults=(ids||[]).map(faultById).filter(Boolean);
  if(!faults.length)return null;
  var over=ranked(faults,"overactive"),under=ranked(faults,"underactive");
  var inhibit=[],lengthen=[],activate=[],seen={};
  function ok(n){return n&&!seen[n]&&has(n)&&!avoid(n);}
  over.forEach(function(m){
    var x=OVER[m];if(!x)return;
    if(inhibit.length<MAX&&ok(x[0])){seen[x[0]]=1;inhibit.push({name:x[0],sec:HOLD,side:false});}
    var s=x[1];if(s&&avoid(s)&&STANDING[s]!=null)s=STANDING[s];
    if(lengthen.length<MAX&&ok(s)){seen[s]=1;lengthen.push({name:s,sec:HOLD,side:ONE_SIDE.test(s)});}});
  under.forEach(function(m){
    var x=UNDER[m];if(!x)return;
    var a=avoid(x[0])?x[1]:x[0];
    if(activate.length<MAX&&ok(a)){seen[a]=1;var d=DOSE[a]||{n:15};activate.push({name:a,n:d.n||0,sec:d.sec||0,side:!!d.side});}});
  if(!inhibit.length&&!lengthen.length&&!activate.length)return null;
  return {faults:faults.map(function(f){return f.id;}),over:over,under:under,inhibit:inhibit,lengthen:lengthen,activate:activate};}

export {ASK as FAULTS_ASK, correctiveFor};

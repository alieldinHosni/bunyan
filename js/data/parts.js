/* Bunyan — the parts of a muscle someone can ask to bring up
   Owner, 9 Nov: "same for the focused muscle, need to be more details, not just
   shoulders, it should include the three shoulder muscles and same for the other
   muscles". The library files an exercise under one muscle ("Shoulders"); which part it
   works is in what the movement is, as the anatomy has it (js/knowledge/anatomy.js:
   the anterior deltoid flexes the shoulder, the posterior works in a row): a lateral
   raise is the side of the shoulder, a reverse fly or a face pull the back, a press
   overhead the front. So a part is a name pattern over the exercise, tried in order,
   the first that matches.

   A part is written "Muscle.part" in the profile's focus ("Shoulders.side"); a muscle
   on its own still means all of it. partsOf(muscle) lists a muscle's parts, partOf(name,
   muscle) says which part an exercise works (or null), and focusMuscles(focus) the
   whole muscles a focus list touches, for everything that works by muscle. */

var PARTS={
  Shoulders:[["rear","Rear delts",/rear delt|rear lateral|reverse (machine |cable |dumbbell )?fl(y|ye)|back fl(y|ye)|face pull|pull[- ]?apart|bent[- ]over (dumbbell |cable )?(lateral )?raise|prone (y|t) raise|reverse pec deck/i],
             ["side","Side delts",/lateral raise|side lateral|upright row|lu raise|\by[- ]raise|cable lateral|lean[- ]away/i],
             ["front","Front delts",/front raise|overhead press|military|shoulder press|arnold|push press|landmine press|seated (dumbbell |barbell )?press|handstand|pike push/i]],
  Chest:[["upper","Upper chest",/incline|low[- ]to[- ]high|low cable crossover|reverse[- ]grip bench/i],
         ["lower","Lower chest",/decline|\bdips?\b|high[- ]to[- ]low|^(single-arm )?cable crossover/i],
         ["mid","Middle chest",/bench press|push-?ups?|fl(y|ye)s?\b|chest press|pec deck|cable cross|svend|floor press/i]],
  Back:[["lats","Lats (width)",/pulldown|pull-?ups?|chin-?ups?|pullover|straight[- ]arm|muscle-?up/i],
        ["upper","Upper back and traps",/\brows?\b|rowing|t-bar|shrug|rack pull|high pull/i],
        ["lower","Lower back",/back extension|hyperextension|good morning|superman|reverse hyper/i]],
  Biceps:[["brach","Brachialis (outer arm)",/hammer|reverse(-| )?grip curl|reverse curl|zottman|cross[- ]body/i],
          ["biceps","Biceps peak",/curl/i]],
  Triceps:[["long","Triceps long head",/overhead|french|skull|lying (triceps|extension)|tate|behind the head/i],
           ["outer","Triceps outer heads",/push-?down|kickback|close[- ]grip|\bdips?\b|diamond/i]],
  Glutes:[["med","Side glutes (medius)",/abduct|clam|lateral (band )?walk|side[- ]lying|fire hydrant|monster walk/i],
          ["max","Glutes (max)",/hip thrust|glute bridge|bridge|kickback|step[- ]?up|bulgarian|frog pump|pull[- ]through/i]],
  /* The front of the shin is filed with the calves (js/knowledge/anatomy.js: tibialis
     anterior, tag Calves); a reverse calf raise works it. */
  Calves:[["tib","Front of the shin (tibialis)",/reverse calf|tibialis raise|toe raise/i],
          ["seated","Seated calves (soleus)",/seated/i],
          ["standing","Standing calves",/calf/i]],
  /* The quadriceps' one muscle that also crosses the hip (rectus femoris) is worked
     hardest where the hip stays open and the knee does the work: a leg extension, a
     sissy squat. Squats, presses and lunges load the vasti most. */
  Quads:[["rf","Front of the thigh (rectus femoris)",/leg extension|sissy|reverse nordic|spanish squat/i],
         ["vasti","Squat muscles (vasti)",/squat|leg press|lunge|step[- ]?ups?|split|hack/i]],
  /* The hamstrings cross two joints: a hip hinge loads them long at the hip, a curl
     shortens them at the knee. A plan that has only one misses half of what they do. */
  Hamstrings:[["hinge","Hamstrings at the hip (hinges)",/romanian|stiff[- ]leg|good morning|one-legged deadlift|single[- ]leg (romanian )?deadlift|pull[- ]?through/i],
              ["curl","Hamstrings at the knee (curls)",/leg curl|hamstring curl|nordic|glute[- ]ham|ball leg curl|hamstring slides/i]],
  Forearms:[["ext","Outer forearm (wrist extensors)",/palms-down|reverse wrist|wrist roller/i],
            ["flex","Inner forearm (wrist flexors)",/palms?-up|wrist curl|finger curl/i],
            ["grip","Grip",/plate pinch|hand squeeze|farmer|grip/i]],
  Core:[["obl","Obliques",/oblique|side plank|side bridge|side bend|russian twist|wood ?chop|pallof|windmill|bicycle/i],
        ["abs","Abs",/crunch|sit-?up|leg raise|knee raise|ab (wheel|roll)|rollout|hollow|v-?up|plank|dead bug|toes to bar/i]]
};

function partsOf(m){return (PARTS[m]||[]).map(function(x){return {id:m+"."+x[0],part:x[0],label:x[1]};});}
/* The part of a muscle an exercise works, by its name: "Shoulders.side", or null. */
function partOf(name,m){
  var L=PARTS[m];if(!L||!name)return null;
  for(var i=0;i<L.length;i++)if(L[i][2].test(name))return m+"."+L[i][0];
  return null;}
/* An exercise that works this part, whichever muscle the library files it under (a
   reverse fly is Shoulders in one library and Back in another). */
function works(name,id){
  var k=String(id).split("."),L=PARTS[k[0]]||[];
  for(var i=0;i<L.length;i++)if(L[i][2].test(name))return L[i][0]===k[1];
  return false;}
function partLabel(id){
  var k=String(id).split("."),x=(PARTS[k[0]]||[]).filter(function(p){return p[0]===k[1];})[0];
  return x?x[1]:k[0];}
/* The whole muscles a focus list touches: "Shoulders.side" counts for Shoulders. */
function focusMuscles(focus){
  var out=[];(focus||[]).forEach(function(f){var m=String(f).split(".")[0];if(out.indexOf(m)<0)out.push(m);});
  return out;}
/* The parts in a focus list, as ids. */
function focusParts(focus){return (focus||[]).filter(function(f){return String(f).indexOf(".")>0;});}

export {focusMuscles, focusParts, partLabel, partOf, partsOf, PARTS, works};

/* Bunyan — movement patterns
   What an exercise does, as a coach would say it: a squat, a hinge, a horizontal
   push, a vertical pull, a carry. Two exercises with the same pattern and the same
   main muscle train the same thing, which is what a swap needs to know — for pain,
   for missing equipment, or because the person would rather do something else.

   The library's own field (v.p in exercises.json) cannot be used for this: it files
   a sit-up as a pull and a leg curl as elbow flexion. The pattern is read from the
   name instead, most specific first, with the main muscle settling the words that
   mean different things on different muscles — an extension is a leg extension on
   the quads, a triceps extension on the triceps and a back extension on the lower
   back. tests/library.mjs checks every exercise in the library gets one.

   Pure: a name and its main muscle in, an id out. Labels are English and go through
   t() where they are shown. */

var MOVES={
  squat:"Squat",lunge:"Lunge and single leg",hinge:"Hinge",thrust:"Hip thrust and bridge",
  hpush:"Horizontal push",vpush:"Vertical push",hpull:"Horizontal pull",vpull:"Vertical pull",
  fly:"Chest fly",raise:"Shoulder raise",shrug:"Shrug",curl:"Biceps curl",ext:"Triceps extension",
  kneeflex:"Leg curl",kneeext:"Leg extension",calf:"Calf raise",hip:"Hip abduction and adduction",
  core:"Core",carry:"Carry",power:"Explosive lift",jump:"Jump",grip:"Grip and forearm",neck:"Neck",
  cardio:"Conditioning",mobility:"Mobility"};

/* Name rules, first match wins. A rule may name the muscles it applies to (only) or
   the ones it never applies to (not). */
var RULES=[
  ["mobility",/stretch|\bsmr\b|-smr|mobility|cat cow|90\/90|dislocat|\bcircles?\b|\bchild'?s pose|\bcobra\b|world'?s greatest|thoracic rotation|\bopener\b|\btorso rotation|\bwindmills\b|hip flexor$|^on your|^lying (hamstring|crossover)|^knee across|\bspinal twist|\bdown(ward)? dog/i],
  ["core",/get[- ]?up\b/i],
  ["grip",/dead hang/i],
  ["cardio",/\brun(ning)?\b|sprint|butt kick|high knees|\bskip\b|start technique|acceleration|wall drill|claw series|battling ropes?|\bjog|bicycl(?!e crunch)|\bbike\b|cycling|rowing, stationary|row machine|elliptical|stair ?(master|climb|mill)|rope jump|jumping jacks?|burpee|mountain climbers?|battle rope|treadmill|\bswim|trail running|step mill|recumbent|skipping/i],
  ["hinge",/(clean|snatch) deadlift/i],
  ["squat",/clean grip/i],
  ["power",/\bclean\b|\bsnatch|\bjerk\b|high pull\b|power (clean|snatch)|hang pull|clean pull|snatch pull|muscle snatch/i],
  ["jump",/jump|\bhops?\b|hopping|\bbounds?\b|bounding|plyo|depth (drop|landing)|\bskater\b|tuck jump|\bthrow\b|medicine ball (slam|chest pass)|\bslam\b|chest pass|scoop toss|\btoss\b|\bleap\b|push-off|shuffle|\bskating\b/i],
  ["hip",/monster walk|band walk|lateral walk/i],
  ["carry",/^(?!.*(\brow\b|fl(y|ye)|extension|curl)).*(carry|farmer|\byoke\b|suitcase|\bsled\b|\bdrag\b|prowler|walk(?!.*lunge)|backward (drag|walk)|tire flip|\bkeg\b|atlas stone|conan|sandbag load)/i],
  ["kneeflex",/leg curl|hamstring curl|nordic|glute[- ]ham|natural glute|\bball leg curl|hamstring slides|manual hamstring/i],
  ["kneeext",/leg extension|knee extension/i],
  ["shrug",/shrug/i],
  ["calf",/calf|calves|heel raise|toe raise|tibialis|\bankle\b/i],
  ["hip",/abduct|adduct|hip (ab|ad)|\bclam|fire hydrant|groin|band walk|monster walk|lateral walk|side[- ]lying leg|thigh (ab|ad)|\bhip flexion\b/i],
  ["thrust",/hip thrust|glute bridge|\bbridge\b|hip lift|butt lift|frog pump|donkey kick|glute kickback|hip raise|pelvic tilt|\bbutt\b/i,null,["Core"]],
  ["hinge",/deadlift|\brdl\b|romanian|good ?morning|\bswing\b|hyperextension|back extension|rack pull|stiff[- ]leg|pull[- ]?through|hip extension|reverse hyper|superman|bent[- ]knee good|axle dead/i],
  ["lunge",/lunge|split squat|step[- ]?up|pistol|bulgarian|single[- ]leg squat|one[- ]leg squat|skater squat|cossack|lateral squat|side squat|\bstep ?ups?\b/i],
  ["squat",/squat|leg press|\bhack\b|wall sit|sissy|thruster|\bsit squat|zercher|\bjefferson/i],
  ["vpull",/pull[- ]?ups?|chin[- ]?ups?|pull ?downs?|pulldowns?|muscle[- ]?up|pullover|lat pull|rope climb|\bv-bar pull/i],
  ["hpull",/rear delt|rear lateral|reverse (machine )?fl(y|ye)|back fl(y|ye)|\bbench pull/i],
  ["vpush",/log lift|rack delivery|circus bell|jammer/i],
  ["raise",/upright (barbell |cable |dumbbell )?row|delt(oid)? raise|lateral raise|front raise|side lateral|\by[- ]raise|\blu raise|cuban|\bfront plate|lateral to front|laterals? to front|\bscaption|\bpower partials|external rotation|internal rotation|rotator|\bl-fly|\blying one-arm lateral/i,null,["Core","Calves","Hamstrings","Glutes"]],
  ["hpull",/\brows?\b|\browing\b|face pull|reverse fl(y|ye)|rear delt|pull[- ]?apart|bent[- ]over (dumbbell )?raise|seal row|t-bar|renegade|\bband pull|\bstraight arm|\bscapular? (pull|retraction)|\binverted/i],
  ["vpush",/overhead press|shoulder press|military|push press|arnold|handstand|landmine press|\bz[- ]press|bradford|behind the neck|see-saw|pike push|seated (dumbbell |barbell )?press|standing (dumbbell |barbell |palms?-in |alternating )?(one-arm )?(dumbbell )?press|kettlebell press|\bsots/i],
  ["hpush",/bench press|push[- ]?ups?|press[- ]?ups?|chest press|floor press|\bdips?\b|board press|pin press|guillotine|svend|incline (dumbbell |barbell )?press|decline (dumbbell |barbell )?press|close[- ]grip (barbell |ez bar |dumbbell )?press|\bjm press|smith machine (incline |decline )?press|\bhex press|\bsqueeze press|\bplate press|dumbbell press|\bcable (chest )?press|machine press|neck press|\btate press/i],
  ["fly",/\bfl(y|ye|yes|ies)\b|pec deck|crossover|butterfly|around the worlds/i],
  ["grip",/./,["Forearms"]],
  ["curl",/curl/i,null,["Hamstrings","Calves","Core","Quads","Glutes"]],
  ["ext",/tricep|push ?downs?|pushdown|skull|kickback|extension|\bjm\b/i,["Triceps"]],
  ["core",/crunch|sit[- ]?ups?|plank|leg raise|knee raise|toes to bar|toes-to-bar|roll ?out|ab wheel|ab roller|twist|wood ?chop|dead bug|bird dog|hollow|pallof|side bend|jackknife|jack knife|v[- ]?up|flutter|scissor|l-sit|dragon flag|hanging|oblique|\babs?\b|cocoon|pull[- ]in|knee tuck|windmill|russian|stir the pot|\bget[- ]up|\bturkish|\bsit[- ]?out|\bbody saw|\bhip drop|\btuck\b|\bcorkscrew|\bspell caster|\bsaxon|\bjack ?knife|\bgorilla chin|\bcrunches|\bplate twist|\bhalf moon/i],
  ["neck",/./,["Neck"]]
];
/* When no rule names it, the main muscle does, by what that muscle's exercises
   most often are. A press on the chest is a horizontal push; on the shoulders a
   vertical one. */
var BY_MUSCLE={Chest:function(n){return /press|push|thrust|bench/i.test(n)?"hpush":"fly";},
  Shoulders:function(n){return /press|push/i.test(n)?"vpush":/\brows?\b|pull(?!ey)/i.test(n)?"hpull":"raise";},
  Back:function(n){return /pull|chin|down/i.test(n)?"vpull":"hpull";},
  Quads:function(){return "squat";},Hamstrings:function(){return "hinge";},Glutes:function(){return "thrust";},
  Biceps:function(){return "curl";},Triceps:function(n){return /press|push|dip/i.test(n)?"hpush":"ext";},
  Calves:function(){return "calf";},Core:function(){return "core";},Forearms:function(){return "grip";},
  Adductors:function(){return "hip";},Abductors:function(){return "hip";},Neck:function(){return "neck";},
  Cardio:function(){return "cardio";},Sports:function(){return "cardio";},Classes:function(){return "cardio";}};

/* The pattern of an exercise. pattern is the library's own field: trusted only for
   "Mobility" (stretches and foam rolling), which it gets right. */
function movementOf(name,muscle,pattern){
  var n=String(name||"");
  if(pattern==="Mobility")return "mobility";
  if(/^(Cardio|Sports|Classes)$/.test(muscle)&&!/stretch/i.test(n))return "cardio";
  for(var i=0;i<RULES.length;i++){
    var r=RULES[i];
    if(r[2]&&r[2].indexOf(muscle)<0)continue;
    if(r[3]&&r[3].indexOf(muscle)>=0)continue;
    if(r[1].test(n))return r[0];}
  var f=BY_MUSCLE[muscle];
  return f?f(n):"";}
function movementLabel(id){return MOVES[id]||"";}

export {movementLabel, movementOf, MOVES};

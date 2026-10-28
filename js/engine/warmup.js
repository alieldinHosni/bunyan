/* Bunyan — the warm-up before a session and the cool-down after it
   Both are built from what the day trains: the movements its lifts make (a press
   to the front or overhead, a row or a pull-down, a squat, a lunge, a hinge) and
   the muscles they work. Each exercise counts its sets toward its movement and its
   main muscle, and half of them toward the muscles it also works; the first lifts
   of the day count for more, since they are done fresh and heaviest. A bench day
   and an overhead day are both "upper body", but they do not warm up the same way
   (owner, 28 Oct: "the same warm-up in every session").

   The textbook (js/knowledge/phases.js, 21): a dynamic warm-up of 3 to 10 moving
   stretches specific to the session; at the end, static stretches of the muscles
   worked, 30 s each.

   Before:  raise the pulse for a few minutes, take the joints the session will
            load through their range with moving drills, then ramp up to the first
            heavy lift in a few lighter sets.
   After:   hold a stretch for each of the muscles worked.
   Static holds come at the end, not the start: a long hold just before lifting
   can take a little off strength for a while, and moving drills warm up as well
   without that cost.

   A gentle day (a walk, yoga) needs neither. A day whose plan already opens with
   its own mobility work keeps it, and is only given the pulse raiser and the
   ramp-up sets. Nothing here is logged, and all of it can be skipped. */
import {EXDB, isCompound, loadable, muscleOf, patternOf, secondaryOf} from "../data/exercises.js";
import {actInfo, isActivity} from "../data/activities.js";

/* name, stage, dose. Stages run in order: open up the joints, wake the muscles
   that steady them, move through the patterns, then a few quick contacts on a day
   that will jump or sprint. Doses are reps (n), each side (side) or seconds (sec). */
var DRILL={
  wgs:   ["World's Greatest Stretch",1,{n:4,side:1}],
  thor:  ["Thoracic Rotation",1,{n:8,side:1}],
  ankle: ["Knee-to-Wall Ankle Mobilisation",1,{n:10,side:1}],
  ankC:  ["Ankle Circles",1,{n:10,side:1}],
  circ:  ["Arm Circles",1,{n:10}],
  shC:   ["Shoulder Circles",1,{n:10}],
  elbC:  ["Elbow Circles",1,{n:10}],
  wrist: ["Wrist Circles",1,{n:10}],
  hipC:  ["Standing Hip Circles",1,{n:8,side:1}],
  cat:   ["Cat Stretch",1,{n:8}],
  pass:  ["Shoulder Pass-Through",1,{n:10}],
  spider:["Spiderman Lunge",1,{n:5,side:1}],
  scapPU:["Scapular Push-Up",2,{n:10}],
  scapPL:["Scapular Pull-Up",2,{n:8}],
  apart: ["Band Pull Apart",2,{n:15}],
  bridge:["Glute Bridge Hold",2,{sec:20}],
  bug:   ["Dead Bug",2,{n:6,side:1}],
  sman:  ["Superman",2,{n:10}],
  dynCh: ["Dynamic Chest Stretch",3,{n:10}],
  dynBk: ["Dynamic Back Stretch",3,{n:10}],
  swingF:["Front-to-Back Leg Swings",3,{n:10,side:1}],
  swingS:["Side-to-Side Leg Swings",3,{n:10,side:1}],
  hug:   ["Walking Knee Hug",3,{n:6,side:1}],
  quad:  ["Walking Quad Pull",3,{n:6,side:1}],
  lat:   ["Lateral Lunge",3,{n:6,side:1}],
  groin: ["Groiners",3,{n:6,side:1}],
  squat: ["Bodyweight Squat",3,{n:10}],
  bandGM:["Band Good Morning",3,{n:10}],
  swing: ["Arm Swings",3,{n:15}],
  inch:  ["Inchworm",3,{n:5}],
  knees: ["High Knees",4,{sec:20}],
  pogo:  ["Pogo Hops",4,{n:15}]
};
/* The drills for each movement, the most specific first. */
var DRILLS_FOR={
  hpush:["scapPU","dynCh","pass","swing"],
  vpush:["pass","shC","circ","scapPU"],
  raise:["circ","shC","apart"],
  hpull:["apart","thor","cat","dynBk"],
  vpull:["scapPL","thor","dynBk","swing"],
  arms: ["elbC","wrist","swing"],
  squat:["squat","ankle","quad","spider"],
  lunge:["spider","lat","hug","groin"],
  hinge:["inch","swingF","bandGM","hug"],
  glute:["bridge","hipC","wgs"],
  hams: ["swingF","inch","hug"],
  adduct:["swingS","lat","groin"],
  calves:["ankle","ankC","pogo"],
  core: ["bug","cat","sman"]
};
/* What a muscle's own work is, when the exercise does not say more. */
var MOVE_OF={Chest:"hpush",Shoulders:"raise",Triceps:"arms",Biceps:"arms",Forearms:"arms",Back:"hpull",
  Quads:"squat",Hamstrings:"hams",Glutes:"glute",Adductors:"adduct",Calves:"calves",Core:"core"};
var LOWER_MOVE={squat:1,lunge:1,hinge:1,glute:1,hams:1,adduct:1,calves:1};
var UPPER_MOVE={hpush:1,vpush:1,raise:1,hpull:1,vpull:1,arms:1};

/* Stretches for each muscle, held at the end. Where the day's movement says which
   part of a muscle took the work, that one comes first: a row ends on the middle
   back, a pull-down on the lats; a squat on the quads, a lunge on the hip flexor. */
var STRETCH={
  Chest:["Doorway Chest Stretch"],
  Shoulders:["Cross-Body Shoulder Stretch","Seated Front Deltoid"],
  Triceps:["Triceps Stretch","Overhead Triceps"],
  Back:["Overhead Lat Stretch","Child's Pose","Middle Back Stretch"],
  Biceps:["Standing Biceps Stretch"],
  Forearms:["Kneeling Forearm Stretch"],
  Quads:["Standing Quad Stretch","Kneeling Hip Flexor"],
  Hamstrings:["Hamstring Stretch","Seated Floor Hamstring Stretch"],
  Glutes:["Pigeon Stretch","Figure-Four Stretch"],
  Adductors:["Butterfly Stretch"],
  Calves:["Standing Gastrocnemius Calf Stretch","Standing Soleus And Achilles Stretch"],
  Core:["Cobra Stretch","Standing Lateral Stretch"]
};
var STRETCH_FIRST={hpull:{Back:"Middle Back Stretch"},vpull:{Back:"Overhead Lat Stretch"},
  vpush:{Shoulders:"Seated Front Deltoid"},lunge:{Quads:"Kneeling Hip Flexor"},hinge:{Hamstrings:"Hamstring Stretch"}};
var ONE_SIDE=/Cross-Body|Triceps Stretch|Standing Quad|Hip Flexor|Hamstring Stretch|Pigeon|Figure-Four|Gastrocnemius|Soleus|Overhead Lat|Seated Front Deltoid|Standing Lateral/;
var LOWER={Quads:1,Hamstrings:1,Glutes:1,Adductors:1,Calves:1};

/* What a sport or a run asks of the body, by the kind of activity it is. */
var ACT_MUSCLES={
  run:["Calves","Hamstrings","Quads","Glutes"],
  bike:["Quads","Glutes","Calves"],
  hike:["Calves","Quads","Glutes"],
  ball:["Hamstrings","Adductors","Calves","Quads","Glutes"],
  racket:["Shoulders","Calves","Adductors","Core","Hamstrings"],
  fight:["Shoulders","Core","Calves","Back"],
  swim:["Shoulders","Back","Core","Chest"],
  row:["Back","Quads","Glutes","Hamstrings","Core"],
  pulse:["Quads","Glutes","Shoulders","Core","Hamstrings"]
};
/* Below this effort (a walk, yoga, golf) the activity is its own warm-up. */
var GENTLE_MET=5;
var JUMPY=/\b(jumps?|hops?|bounds?|plyo|sprints?)\b/i;

/* The gym machines come from the library under one icon; their names say more. */
function icoOf(n,a){
  if(/run|jog|treadmill|stair|step mill/i.test(n))return "run";
  if(/bik|cycl|spin/i.test(n))return "bike";
  if(/\brow/i.test(n))return "row";
  return a.ico;}
function setsOf(e){return Math.max(1,+((e.planned&&e.planned.sets)||e.sets)||3);}

/* The movement an exercise makes, from its pattern, its muscle and its name. */
function moveOf(n){
  var p=patternOf(n),m=muscleOf(n);
  if(p==="Hinge")return "hinge";
  if(p==="Squat")return /lunge|split|step|bulgarian/i.test(n)?"lunge":(m==="Glutes"?"glute":"squat");
  /* The library calls a leg curl elbow flexion too: arms only when it is an arm. */
  if(m==="Biceps"||m==="Triceps"||m==="Forearms")return "arms";
  if(m==="Chest")return "hpush";
  if(m==="Shoulders"&&p==="Push")return /raise|fly|flye/i.test(n)?"raise":"vpush";
  if(m==="Back")return /pull-?ups?|pulldown|chin|pullover|straight-arm|muscle.?up/i.test(n)?"vpull":"hpull";
  if(m==="Glutes")return /thrust|bridge|kickback|abduct/i.test(n)?"glute":"hinge";
  return MOVE_OF[m]||null;}

/* Movements and muscles in order of how much the day works them. The first lift
   counts twice, the second one and a half times. */
function workload(entries){
  var score={},moves={},jumpy=false,moving=false,k=0;
  entries.forEach(function(e){
    var n=e.name,s=setsOf(e);
    if(isActivity(n)){
      var a=actInfo(n)||{},ico=icoOf(n,a);
      if(!(a.met>=GENTLE_MET))return;
      moving=true;
      if(ico==="run"||ico==="ball"||ico==="racket"||ico==="pulse")jumpy=true;
      (ACT_MUSCLES[ico]||ACT_MUSCLES.pulse).forEach(function(m,i){
        var v=4-i*0.5;score[m]=(score[m]||0)+v;var mv=MOVE_OF[m];if(mv)moves[mv]=(moves[mv]||0)+v;});
      return;}
    if(patternOf(n)==="Mobility")return;
    moving=true;
    var wt=k===0?2:k===1?1.5:1;k++;
    if(JUMPY.test(n)||patternOf(n)==="Plyometric")jumpy=true;
    var m=muscleOf(n),mv=moveOf(n);
    score[m]=(score[m]||0)+s*wt;
    if(mv)moves[mv]=(moves[mv]||0)+s*wt;
    (secondaryOf(n)||[]).forEach(function(x){score[x]=(score[x]||0)+s*wt/2;});});
  var rank=function(o,keep){
    var r=Object.keys(o).filter(keep).sort(function(a,b){return o[b]-o[a];});
    /* A fifth of the top one's work is part of the day; less is a passenger. */
    var top=r.length?o[r[0]]:0;
    return r.filter(function(x){return o[x]>=top*0.2;});};
  return {ranked:rank(score,function(m){return STRETCH[m];}),moves:rank(moves,function(x){return DRILLS_FOR[x];}),
          jumpy:jumpy,moving:moving};}

function have(name,gear){
  var v=EXDB&&EXDB[name];if(!v)return false;
  if(!gear||!v.e||v.e==="Bodyweight"||v.e==="Other")return true;
  return gear.indexOf(v.e)>=0;}

/* Working weight → the lighter sets that lead up to it. A barbell starts with the
   empty bar; nothing is repeated, and every step is a weight that can be loaded. */
function rampFor(w,barbell,bar){
  var steps=w>=100?[[0.4,5],[0.6,3],[0.8,2]]
           :w>=40?[[0.5,5],[0.75,3]]
           :[[0.5,8],[0.75,4]];
  var out=[],last=0;
  if(barbell&&w>bar+5){out.push({w:bar,r:10});last=bar;}
  steps.forEach(function(s){
    var x=Math.round(w*s[0]/2.5)*2.5;
    if(x<=last+2||x>=w)return;
    out.push({w:x,r:s[1]});last=x;});
  return out;}

/* entries: the session's exercises (name, planned.sets).
   ctx.work(entry): the working weight in kg for an entry, 0 when unknown.
   ctx.gear: the equipment owned, or null for a full gym.
   ctx.hold: seconds per stretch (default 30). */
function warmupFor(entries,ctx){
  ctx=ctx||{};
  var w=workload(entries||[]);
  if(!w.moving)return null;
  var gear=ctx.gear||null;
  var names={};(entries||[]).forEach(function(e){names[e.name]=1;});
  var lower=w.moves.some(function(m){return LOWER_MOVE[m];}),
      upper=w.moves.some(function(m){return UPPER_MOVE[m];});
  var acts=(entries||[]).filter(function(e){return isActivity(e.name);});
  var runDay=acts.length&&acts.length===entries.length;

  /* The plan's own warm-up: two or more mobility drills before the first lift. */
  var own=0;
  for(var i=0;i<entries.length&&patternOf(entries[i].name)==="Mobility";i++)own++;

  var drills=[];
  if(own<2){
    /* The book asks for 3 to 10: one or so for each of the day's movements, 4 to 6. */
    var picked={},want=Math.max(4,Math.min(6,w.moves.length+2));
    var take=function(k){
      var d=DRILL[k];if(!d||picked[k]||names[d[0]]||!have(d[0],gear))return false;
      picked[k]=1;drills.push({key:k,name:d[0],stage:d[1],n:d[2].n||0,side:!!d[2].side,sec:d[2].sec||0});return true;};
    /* One opener first: the whole body on a day with legs in it, the upper back on
       a pulling day, the shoulders on a pressing one. Then the day's movements in
       order, one drill each per round (the main one two in the first), until there
       are enough. */
    var lead=w.moves[0];
    take(lower?"wgs":lead==="hpull"||lead==="vpull"?"thor":"circ");
    for(var round=0;round<4&&drills.length<want;round++)
      w.moves.forEach(function(m,mi){
        var list=DRILLS_FOR[m]||[],n=round===0&&mi===0?2:1;
        for(var j=round;j<list.length&&n>0&&drills.length<want;j++)if(take(list[j]))n--;});
    /* A day that jumps or sprints gets quick contacts last, once everything is warm. */
    if(w.jumpy&&lower)take(runDay?"knees":"pogo");
    drills.sort(function(a,b){return a.stage-b.stage;});}

  /* Ramp-up sets on the first heavy lift: a compound with a weight to it. */
  var ramp=null,more=0;
  for(var k=0;k<entries.length;k++){
    var e=entries[k],n=e.name;
    /* Body weight is not ramped: there is no lighter bar to work up from. */
    if(isActivity(n)||!isCompound(n)||(e.planned&&e.planned.timed)||(EXDB&&EXDB[n]&&EXDB[n].e==="Bodyweight"))continue;
    if(!ramp){
      var kg=ctx.work?+ctx.work(e)||0:0,bb=loadable(n);
      if(!kg&&!bb&&!(EXDB&&EXDB[n]&&/Dumbbell|Machine|Cable|Kettlebell/.test(EXDB[n].e)))continue;
      ramp={name:n,work:kg,sets:kg?rampFor(kg,bb,ctx.bar||20):[]};}
    else if(muscleOf(n)!==muscleOf(ramp.name))more++;}

  /* The ramp-up sets happen at the bar, as part of the first lift: not counted here. */
  var mins=(runDay?5:4)+Math.round(drills.length*0.75);
  return {focus:w.ranked.slice(0,4),pulse:{min:runDay?5:4,how:runDay?"run":gear&&gear.indexOf("Machine")<0?"home":"gym"},
          drills:drills,own:own>=2,ramp:ramp,moreLifts:more,min:mins};}

function cooldownFor(entries,ctx){
  ctx=ctx||{};
  var w=workload(entries||[]);
  if(!w.moving)return null;
  var hold=ctx.hold||30,out=[],used={};
  /* Each muscle's stretches, the one its movement today calls for first. */
  var list=function(m){
    var l=(STRETCH[m]||[]).slice();
    for(var i=w.moves.length-1;i>=0;i--){
      var f=STRETCH_FIRST[w.moves[i]]&&STRETCH_FIRST[w.moves[i]][m];
      if(f){l=l.filter(function(x){return x!==f;});l.unshift(f);}}
    return l;};
  /* Two rounds: the first stretch of each muscle, then the second where there is
     one, until five. A short day still gets three. */
  for(var round=0;round<2&&out.length<5;round++)
    w.ranked.forEach(function(m){
      var s=list(m)[round];
      if(!s||used[s]||out.length>=5||!(EXDB&&EXDB[s]))return;
      used[s]=1;out.push({name:s,sec:hold,side:ONE_SIDE.test(s)});});
  if(!out.length)return null;
  var secs=out.reduce(function(n,s){return n+s.sec*(s.side?2:1)+10;},0);
  return {stretches:out,min:Math.max(2,Math.round(secs/60))};}

export {cooldownFor, rampFor, warmupFor};

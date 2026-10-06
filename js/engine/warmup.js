/* Bunyan — the warm-up before a session and the cool-down after it
   Both are built from what the day trains. Each exercise counts its sets toward
   its main muscle and half of them toward the muscles it also works; the muscles
   with the most work choose the drills and the stretches.

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
  circ:  ["Arm Circles",1,{n:10}],
  pass:  ["Shoulder Pass-Through",1,{n:10}],
  spider:["Spiderman Lunge",1,{n:5,side:1}],
  scapPU:["Scapular Push-Up",2,{n:10}],
  scapPL:["Scapular Pull-Up",2,{n:8}],
  apart: ["Band Pull Apart",2,{n:15}],
  bridge:["Glute Bridge Hold",2,{sec:20}],
  bug:   ["Dead Bug",2,{n:6,side:1}],
  swingF:["Front-to-Back Leg Swings",3,{n:10,side:1}],
  swingS:["Side-to-Side Leg Swings",3,{n:10,side:1}],
  hug:   ["Walking Knee Hug",3,{n:6,side:1}],
  quad:  ["Walking Quad Pull",3,{n:6,side:1}],
  lat:   ["Lateral Lunge",3,{n:6,side:1}],
  squat: ["Bodyweight Squat",3,{n:10}],
  swing: ["Arm Swings",3,{n:15}],
  inch:  ["Inchworm",3,{n:5}],
  knees: ["High Knees",4,{sec:20}],
  pogo:  ["Pogo Hops",4,{n:15}]
};
var DRILLS_FOR={
  Chest:["pass","scapPU","swing"],
  Shoulders:["pass","circ","scapPU"],
  Triceps:["swing","circ"],
  Back:["thor","scapPL","apart"],
  Biceps:["swing","circ"],
  Forearms:["circ"],
  Quads:["squat","quad","spider"],
  Hamstrings:["swingF","hug","inch"],
  Glutes:["bridge","spider","wgs"],
  Adductors:["swingS","lat"],
  Calves:["ankle","pogo"],
  Core:["bug","thor"]
};
/* One stretch per muscle, the first not already chosen. side: held on each side. */
var STRETCH={
  Chest:["Doorway Chest Stretch"],
  Shoulders:["Cross-Body Shoulder Stretch"],
  Triceps:["Triceps Stretch"],
  Back:["Overhead Lat Stretch","Child's Pose"],
  Biceps:["Doorway Chest Stretch"],
  Quads:["Standing Quad Stretch","Kneeling Hip Flexor"],
  Hamstrings:["Hamstring Stretch"],
  Glutes:["Pigeon Stretch","Figure-Four Stretch"],
  Adductors:["Butterfly Stretch"],
  Calves:["Standing Gastrocnemius Calf Stretch"],
  Core:["Cobra Stretch"]
};
var ONE_SIDE=/Cross-Body|Triceps Stretch|Standing Quad|Hip Flexor|Hamstring Stretch|Pigeon|Figure-Four|Gastrocnemius|Overhead Lat/;
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

/* Muscles in order of how much the day works them. */
function workload(entries){
  var score={},jumpy=false,moving=false;
  entries.forEach(function(e){
    var n=e.name,s=setsOf(e);
    if(isActivity(n)){
      var a=actInfo(n)||{},ico=icoOf(n,a);
      if(!(a.met>=GENTLE_MET))return;
      moving=true;
      if(ico==="run"||ico==="ball"||ico==="racket"||ico==="pulse")jumpy=true;
      (ACT_MUSCLES[ico]||ACT_MUSCLES.pulse).forEach(function(m,i){score[m]=(score[m]||0)+4-i*0.5;});
      return;}
    moving=true;
    if(JUMPY.test(n)||patternOf(n)==="Plyometric")jumpy=true;
    var m=muscleOf(n);
    score[m]=(score[m]||0)+s;
    (secondaryOf(n)||[]).forEach(function(x){score[x]=(score[x]||0)+s/2;});});
  var ranked=Object.keys(score).filter(function(m){return DRILLS_FOR[m]||STRETCH[m];})
    .sort(function(a,b){return score[b]-score[a];});
  var top=ranked.length?score[ranked[0]]:0;
  /* A muscle that gets a fifth of the top one's work is part of the day; less than
     that is a passenger. */
  ranked=ranked.filter(function(m){return score[m]>=top*0.2;});
  return {ranked:ranked,jumpy:jumpy,moving:moving};}

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
  var lower=w.ranked.some(function(m){return LOWER[m];}),
      upper=w.ranked.some(function(m){return !LOWER[m]&&m!=="Core";});
  var acts=(entries||[]).filter(function(e){return isActivity(e.name);});
  var runDay=acts.length&&acts.length===entries.length;

  /* The plan's own warm-up: two or more mobility drills before the first lift. */
  var own=0;
  for(var i=0;i<entries.length&&patternOf(entries[i].name)==="Mobility";i++)own++;

  var drills=[];
  if(own<2){
    var picked={},want=lower&&upper?5:4;
    var take=function(k){
      var d=DRILL[k];if(!d||picked[k]||names[d[0]]||!have(d[0],gear))return false;
      picked[k]=1;drills.push({key:k,name:d[0],stage:d[1],n:d[2].n||0,side:!!d[2].side,sec:d[2].sec||0});return true;};
    /* One opener for the whole body first, then the muscles in order, one drill each
       per round, until there are enough. */
    take(lower?"wgs":"thor");
    for(var round=0;round<3&&drills.length<want;round++)
      w.ranked.forEach(function(m){
        if(drills.length>=want)return;
        var list=DRILLS_FOR[m]||[];
        for(var j=round;j<list.length;j++)if(take(list[j]))return;});
    /* A day that jumps or sprints gets quick contacts last, once everything is warm. */
    if(w.jumpy&&lower)take(runDay?"knees":"pogo");
    drills.sort(function(a,b){return a.stage-b.stage;});}

  /* Ramp-up sets on the first heavy lift: a compound with a weight to it. */
  var ramp=null,more=0;
  for(var k=0;k<entries.length;k++){
    var e=entries[k],n=e.name;
    if(isActivity(n)||!isCompound(n)||(e.planned&&e.planned.timed))continue;
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
  /* Two rounds: the first stretch of each muscle, then the second where there is
     one, until five. A short day still gets three. */
  for(var round=0;round<2&&out.length<5;round++)
    w.ranked.forEach(function(m){
      var s=(STRETCH[m]||[])[round];
      if(!s||used[s]||out.length>=5||!(EXDB&&EXDB[s]))return;
      used[s]=1;out.push({name:s,sec:hold,side:ONE_SIDE.test(s)});});
  if(!out.length)return null;
  var secs=out.reduce(function(n,s){return n+s.sec*(s.side?2:1)+10;},0);
  return {stretches:out,min:Math.max(2,Math.round(secs/60))};}

export {cooldownFor, rampFor, warmupFor};

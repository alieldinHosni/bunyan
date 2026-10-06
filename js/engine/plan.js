/* Bunyan — plan
   Split recommendation and plan generation. */
import {EXDB, isCompound, LIB, muscleOf, patternOf} from "../data/exercises.js";
import {isActivity} from "../data/activities.js";
import {PRESETS} from "../data/splits.js";
import {addProgram, makeProgram, S, saveDB} from "../state.js";
import {num, uid} from "../util.js";
import {goalOf, GOALS, trainOf} from "../data/goals.js";
import {JUDGED, RANGE, weeklySets} from "./volume.js";

/* ============================================================ plan engine */
/* sets and rest are [compound, isolation]. Compounds always get more of both. */
var LEVELS={
  new:        {label:"Just starting",    sets:[3,2], reps:[8,12], rest:[120,75], weekly:10},
  some:       {label:"Six months in",    sets:[3,3], reps:[6,12], rest:[150,90], weekly:14},
  experienced:{label:"A couple of years",sets:[4,3], reps:[6,12], rest:[150,90], weekly:17},
  advanced:   {label:"Long term lifter", sets:[4,3], reps:[5,12], rest:[180,90], weekly:20}
};
/* What each goal changes lives in js/data/goals.js, with the list itself. */
/* Days used to decide this almost alone: experience split one branch, goal was barely
   consulted, and equipment was ignored entirely — which could hand someone training at
   home a barbell split. The answer looked arbitrary because it so rarely changed.

   It also returned "pro" for five days, and that preset had been deleted, so five days
   resolved to nothing and fell through to the default. That is the real reason it
   seemed to always say Anterior/Posterior. Every id below is checked against PRESETS()
   before it can be returned. */
var SPLIT_FIT={            /* how well each split suits a number of training days */
  fb:    {2:9,3:9,4:5,5:2,6:1},
  ul:    {2:8,3:6,4:9,5:5,6:6},
  ap:    {2:5,3:8,4:8,5:5,6:4},
  ppl:   {2:2,3:7,4:6,5:7,6:9},
  bro:   {2:1,3:2,4:4,5:9,6:6},
  arnold:{2:1,3:2,4:3,5:7,6:9},
  bw:    {2:7,3:7,4:7,5:5,6:4}
};
/* Goal genuinely moves the result: fat loss wants frequency and compound work, size
   wants volume per muscle, strength wants the big lifts often. Weighted to compete
   with frequency: at plus-or-minus three against a days term of up to eighteen, goal
   could never move the answer. Each goal's weights are in js/data/goals.js. */
var SPLIT_LEVEL={
  new:        {fb:4,ul:3,ap:1,ppl:-1,bro:-3,arnold:-4,bw:3,sl5:2,db:3,glute:0,ppl3:1,foot:1,fl:3},
  some:       {fb:1,ul:2,ap:2,ppl:1,bro:0,arnold:-1,bw:0,sl5:3,db:1,glute:2,ppl3:3,foot:2,fl:2},
  experienced:{fb:0,ul:1,ap:2,ppl:2,bro:1,arnold:1,bw:-1,sl5:1,db:0,glute:3,ppl3:1,foot:3,fl:0},
  advanced:   {fb:-1,ul:1,ap:1,ppl:2,bro:2,arnold:2,bw:-1,sl5:0,db:-1,glute:1,ppl3:0,foot:1,fl:-1}
};
/* Measured, not assumed. Guessing which split "shapes" need a barbell is wrong —
   Upper/Lower is perfectly good with dumbbells; what matters is how much of a given
   preset's actual exercise list the user can perform with what they own. This reads
   the equipment off the exercises themselves. */
function coverage(preset,gear){
  if(!gear||!gear.length)return 1;          /* nothing chosen means no restriction */
  var ok=0,n=0;
  (preset.days||[]).forEach(function(d){
    (d.ex||[]).forEach(function(e){
      n++;
      var v=EXDB&&EXDB[e.name], eq=v&&v.e;
      /* Something that can stand in for it counts nearly as well as the thing. */
      if(!eq||eq==="Bodyweight"||gear.indexOf(eq)>=0)ok++;
      else if(standIn(e.name,gear,[],null))ok+=0.8;
    });
  });
  return n?ok/n:1;
}

function splitScores(days,level,goal,gear){
  var d=Math.max(2,Math.min(6,num(days,3)));
  var lv=SPLIT_LEVEL[level]||SPLIT_LEVEL.some;
  var gl=goalOf(goal).split||{};
  var byId={};PRESETS().forEach(function(p){byId[p.id]=p;});
  var out=[],id;
  for(id in SPLIT_FIT){
    if(!Object.prototype.hasOwnProperty.call(SPLIT_FIT,id))continue;
    var s=(SPLIT_FIT[id][d]||0)*2+(lv[id]||0)+(gl[id]||0);
    /* A split half of which you cannot perform is the wrong answer however well it
       scores on frequency. Up to twenty points, proportional to what is missing. */
    var cov=byId[id]?coverage(byId[id],gear):1;
    s+=(cov-1)*20;
    out.push({id:id,score:s,cov:cov});
  }
  out.sort(function(a,b){return b.score-a.score;});
  return out;
}
/* Two or three real options with the recommended one marked, rather than one silent
   answer. Anything missing from PRESETS() is dropped here, so a stale id can never
   reach the caller — and if nothing survives, that is a bug worth hearing about
   rather than a quiet fallback. */
function splitCandidates(days,level,goal,gear){
  var real={};PRESETS().forEach(function(p){real[p.id]=p;});
  var ranked=splitScores(days,level,goal,gear).filter(function(x){return real[x.id];});
  if(!ranked.length)throw new Error("recommendSplit: no candidate exists in PRESETS()");
  return ranked.slice(0,3).map(function(x){
    return {id:x.id,score:x.score,name:real[x.id].name,tag:real[x.id].tag,
            cov:x.cov,why:whyThisSplit(days,level,goal,x.id)};});
}
function recommendSplit(days,level,goal,gear){
  return splitCandidates(days,level,goal,gear)[0].id;
}
/* Said out loud with the result. A choice the user cannot see the reasoning for reads
   as arbitrary even when it is sound. */
function whyThisSplit(days,level,goal,id){
  var d=Math.max(2,Math.min(6,num(days,3)));
  var byId={
    fb:"Every session covers the whole body, so each muscle is trained as often as "
      +"the week allows. Hard to beat on few days.",
    ul:"Upper and lower alternating: everything twice a week with a day of recovery "
      +"between the halves.",
    ap:"Front of the body one day, back the next. Every muscle twice a week without "
      +"two heavy pushing days in a row.",
    ppl:"Push, pull and legs run twice. A lot of volume per muscle, and it needs the "
      +"days to recover from it.",
    bro:"One muscle a day with real volume behind it. It wants five or six days to "
      +"work at all.",
    arnold:"Chest with back, shoulders with arms, legs on their own. High volume for "
      +"someone who has been lifting a while.",
    bw:"Nothing but the floor, so it fits whatever you have to hand."
  };
  var goalNote=goal==="lose"
      ?" Frequency and compound work hold onto muscle while you are eating less."
    :goal==="recomp"?" Every muscle trained often, so the muscle you build outpaces the fat you lose."
    :goal==="gain"?" Volume per muscle is what drives size."
    :goal==="strength"?" The big lifts come round often enough to practise them."
    :goal==="athletic"?" Jumps first while you are fresh, then the strength that powers them."
    :goal==="endurance"?" Whole-body sessions with short rests, and conditioning to finish."
    :goal==="mobility"?" Whole-body strength through full ranges, with mobility work every session."
    :"";
  return (byId[id]||"")+" "+d+" days a week."+goalNote;
}
var TIMED=/Hold|Plank|Wall Sit|Balance|Isometric|Stretch|Dead Hang|L-Sit|Carry|Farmer|Bridge/i;
var JUMPY=/\b(jumps?|hops?|bounds?|plyo|climbers?)\b/i;
function round30(v){return Math.max(30,Math.round(v/30)*30);}

/* ---- working around: equipment and sore spots ------------------------------------
   Exercises that load a sore area are swapped for one that trains the same muscle
   the same way without it. These are cautious defaults, not a diagnosis: anything
   that hurts should be seen by a physio, and the swap can always be undone. */
var AVOID={
  knee:/Jump|Hop|Bound|Pistol|Sissy|Plyo|Lunge Sprint|Skater|Mountain Climber/i,
  back:/Barbell Deadlift|^Deadlift|Good Morning|Bent Over|Stiff[- ]Leg|^Barbell (Full |Back )?Squat|Hyperextension/i,
  shoulder:/Behind|Upright Row|Dips|Military Press|Barbell Shoulder Press|Overhead Press|Push Press|Snatch|Handstand/i,
  wrist:/Front Squat|Plyo Push|Handstand|Barbell Curl|Clean/i,
  ankle:/Jump|Hop|Bound|Pogo|Skater|Sprint|Rope Jumping/i
};
function avoids(name,limits){
  return (limits||[]).some(function(k){return AVOID[k]&&AVOID[k].test(name);});}
function usable(name,gear){
  var v=EXDB&&EXDB[name];if(!v)return true;
  if(!gear||!gear.length||!v.e||v.e==="Bodyweight")return true;
  return gear.indexOf(v.e)>=0;}
/* The closest stand-in: same muscle, same movement, compound for compound, something
   you own and nothing that loads a sore spot. The library's movement patterns are
   not reliable enough to match on alone (it files a leg curl as elbow flexion), so
   the movement is read from the name too: a row for a row, a press for a press.
   Exercises the built-in programs use come first, being the familiar ones, then
   the same equipment, then the library's own over ones the app added. No match is
   better than a strange one: the exercise is then left out. */
var MOVE=/face pull|pull apart|press|row|curl|squat|lunge|raise|extension|fly|flye|pulldown|pull-?up|chin|deadlift|bridge|thrust|dip|push-?up|pushdown|shrug|crunch|kickback|pullover|good morning|swing|step/i;
function moveOf(n){var m=String(n).match(MOVE);return m?m[0].toLowerCase().replace(/-/g,"").replace(/flye/,"fly"):"";}
var FAMILIAR=null,SUBS={},SKILLED=true;
function familiar(){
  if(!FAMILIAR){FAMILIAR={};PRESETS().forEach(function(p){p.days.forEach(function(d){d.ex.forEach(function(e){FAMILIAR[e.name]=1;});});});}
  return FAMILIAR;}
function standIn(name,gear,limits,taken){
  var key=name+"|"+(gear||[]).join(",")+"|"+(limits||[]).join(",");
  if(!taken&&SUBS[key]!==undefined)return SUBS[key];
  var m=muscleOf(name),pt=patternOf(name),c=isCompound(name),e0=(EXDB&&EXDB[name]||{}).e,mv=moveOf(name),
      fam=familiar(),best=null,bs=-1,tk=taken||{};
  LIB.forEach(function(l){
    var n=l[0];
    if(n===name||tk[n]||isActivity(n)||l[1]!==m||!usable(n,gear)||avoids(n,limits))return;
    if(isCompound(n)!==c||TIMED.test(n)!==TIMED.test(name))return;
    /* No movement word to go by: the pattern has to match instead. */
    if(mv?moveOf(n)!==mv:patternOf(n)!==pt)return;
    var v=EXDB&&EXDB[n]||{},sc=0;
    if(fam[n])sc+=3;
    /* A loaded exercise is replaced by a loaded one where there is the kit for it:
       a squat with dumbbells, not with nothing. */
    if(e0&&e0!=="Bodyweight"&&v.e&&v.e!=="Bodyweight")sc+=3;
    if(gear&&gear.length&&gear.indexOf(v.e)>=0)sc+=2;
    if(!v.own)sc+=1;
    if(v.e===e0)sc+=2;
    if(patternOf(n)===pt)sc+=1;
    if(v.d==="Beginner"||v.d==="Intermediate")sc+=1;
    if(v.d==="Advanced"){if(!SKILLED)return;sc-=2;}
    if(/ - |\(/.test(n))sc-=1;
    if(sc>bs){bs=sc;best=n;}});
  if(!taken)SUBS[key]=best;
  return best;}

/* ---- what a goal adds to a day ------------------------------------------------------ */
var LOWERM={Quads:1,Hamstrings:1,Glutes:1,Calves:1,Adductors:1};
function lowerDay(d){
  var lo=0,up=0;
  d.ex.forEach(function(e){if(isActivity(e.name))return;if(LOWERM[muscleOf(e.name)])lo+=e.sets;else up+=e.sets;});
  return lo>=up;}
/* Which half of the body a day trains: one, if it has three quarters of the sets. */
function halfOf(d){
  var lo=0,up=0;
  d.ex.forEach(function(e){if(isActivity(e.name))return;var m=muscleOf(e.name);
    if(LOWERM[m])lo+=e.sets;else if(m!=="Core")up+=e.sets;});
  return lo>=(lo+up)*0.75?"lower":up>=(lo+up)*0.75?"upper":"both";}
function liftEx(n,sets,lo,hi,rest,extra){
  var e={name:n,muscle:muscleOf(n),sets:sets,lo:lo,hi:hi,rest:rest};
  if(extra)Object.keys(extra).forEach(function(k){e[k]=extra[k];});
  return e;}
/* Jumps go first in a session, while fresh: few, quick and fully rested. */
function plyoFor(d,limits){
  if(lowerDay(d)){
    if(avoids("Jump",limits))return [];
    return [liftEx("Freehand Jump Squat",3,5,5,90),liftEx("Standing Long Jump",3,3,3,90)];}
  if(avoids("Plyo Push-up",limits))return [liftEx("Medicine Ball Chest Pass",3,6,6,60)];
  return [liftEx("Plyo Push-up",3,5,5,90)];}
/* Conditioning to finish: intervals on whatever there is. */
function condFor(gear){
  var gym=!gear||!gear.length||gear.indexOf("Machine")>=0;
  return [{name:gym?"Rowing, Stationary":"Rope Jumping",muscle:"Cardio",sets:1,lo:0,hi:0,rest:0,min:12,rpe:7}];}
/* Mobility to finish: one moving drill and one hold, for the half of the body the
   day worked. Timed holds are seconds, per side where one-sided. */
function mobFor(d){
  return lowerDay(d)
    ?[liftEx("World's Greatest Stretch",2,5,5,30,{side:true}),liftEx("Pigeon Stretch",2,45,45,30,{timed:true,side:true})]
    :[liftEx("Thoracic Rotation",2,8,8,30,{side:true}),liftEx("Overhead Lat Stretch",2,45,45,30,{timed:true,side:true})];}

/* Minutes a day takes: each set and its rest, cardio by its minutes. */
function dayMinutes(d){
  var s=0;
  d.ex.forEach(function(e){
    s+=isActivity(e.name)?(e.min||30)*60:e.sets*((e.rest||75)+(e.timed?(e.hi||30)*(e.side?2:1):35));});
  return s/60;}

/* ---- the generator ----------------------------------------------------------------
   The chosen split is shaped to the person. In order:
   1. exercises they cannot do with what they own, or that load a sore spot, are
      swapped for the closest stand-in;
   2. sets come from experience, reps, rest and effort from the goal: the first
      compound of a day is its main lift; rir is how many reps to leave in reserve;
   3. the goal's additions go on: jumps first, conditioning or mobility last;
   4. the day is trimmed to the time there is, accessories first, main lifts never.
   Timed holds, core, calves, mobility and cardio keep the preset's own prescription. */
function shapePlan(plan,p,gear){
  var L=LEVELS[p.level]||LEVELS.some,T=trainOf(p.goal),limits=p.limits||[];
  var budget=Math.max(25,(num(p.mins)||60)-8);   /* the warm-up takes about eight */
  var tired=num(p.sleep)>0&&num(p.sleep)<6;
  var swaps=[];KEEP=[];MAINS=[];
  /* Nordic curls and pistols are not a stand-in for someone in their first years. */
  SKILLED=p.level==="experienced"||p.level==="advanced";SUBS={};
  plan.days.forEach(function(d){
    if(!d.ex.length)return;
    var taken={};d.ex.forEach(function(e){taken[e.name]=1;});
    d.ex=d.ex.map(function(e){
      if(isActivity(e.name)||(usable(e.name,gear)&&!avoids(e.name,limits)))return e;
      var n=standIn(e.name,gear,limits,taken);
      if(!n)return null;
      swaps.push([e.name,n]);taken[n]=1;
      var c=JSON.parse(JSON.stringify(e));c.name=n;c.muscle=muscleOf(n);delete c.exId;
      /* Your own weight in place of a load: more reps to make it the same work. */
      if((EXDB&&EXDB[n]||{}).e==="Bodyweight"&&(EXDB&&EXDB[e.name]||{}).e!=="Bodyweight"){c.lo=Math.max(c.lo,8);c.hi=Math.max(c.hi,15);}
      return c;})
      .filter(Boolean);
    var mainDone=false,keep=[];
    d.ex.forEach(function(e){
      var mu=muscleOf(e.name);if(!mu||mu==="Other")mu=e.muscle||"";
      if(isActivity(e.name)||/^(Ankle|Mobility|Cardio|Sports|Core|Calves|Neck)$/.test(mu)||
         TIMED.test(e.name)||patternOf(e.name)==="Conditioning"||JUMPY.test(e.name))return;
      var comp=isCompound(e.name),main=comp&&!mainDone,bw=(EXDB&&EXDB[e.name]||{}).e==="Bodyweight";
      if(main){mainDone=true;keep.push(e);MAINS.push(e);}
      e.sets=Math.max(2,(comp?L.sets[0]:L.sets[1])+(main?0:T.sets)-(tired&&!main?1:0));
      /* A beginner starts the main lift a couple of reps lighter than the goal's range. */
      var r=main?T.main:T.acc,nb=p.level==="new"&&T!==trainOf("endurance")?2:0;
      /* Your own body weight is not a load you can set, so its reps stay open. */
      if(!bw){e.lo=r[0]+(main?nb:0);e.hi=r[1]+(main?nb:0);}
      e.rir=main?T.rir[0]:T.rir[1];
      e.rest=round30((main?L.rest[0]:comp?Math.max(90,L.rest[0]-30):L.rest[1])*T.rest);});
    var extra=T.add==="plyo"?plyoFor(d,limits):T.add==="cond"?condFor(gear):T.add==="mob"?mobFor(d):[];
    keep=keep.concat(extra);
    d.ex=T.add==="plyo"?extra.concat(d.ex):d.ex.concat(extra);
    KEEP=KEEP.concat(keep);});
  balance(plan,p,gear,budget,T);
  /* Over time: drop the last accessory, then a set from each, never a main lift
     or the goal's additions. */
  plan.days.forEach(function(d){
    var guard=0;
    while(d.ex.length&&dayMinutes(d)>budget+5&&guard++<30){
      var acc=d.ex.filter(function(e){return KEEP.indexOf(e)<0&&!isActivity(e.name)&&!isCompound(e.name)&&!e.timed&&!TIMED.test(e.name);});
      if(acc.length>2){d.ex.splice(d.ex.lastIndexOf(acc[acc.length-1]),1);continue;}
      var cut=false;
      for(var k=d.ex.length-1;k>=0&&!cut;k--){var e=d.ex[k];
        if(KEEP.indexOf(e)<0&&!isActivity(e.name)&&e.sets>2){e.sets--;cut=true;}}
      if(!cut)break;}});
  KEEP=[];MAINS=[];SKILLED=true;SUBS={};
  return swaps;}

/* ---- volume per muscle -------------------------------------------------------------
   After shaping, each muscle's weekly sets are brought into the range for the
   lifter's experience (js/engine/volume.js). Short: a set is added to that
   muscle's exercise with the fewest, on a day with time to spare, or, if there is
   none, a familiar accessory is added to the shortest day that suits it. Long: a
   set comes off its accessory with the most. Main lifts and the goal's additions
   are never cut. A few rounds, since a press adds to shoulders as well as chest. */
var KEEP=[],MAINS=[];
var ACC={
  Chest:["Dumbbell Flyes","Cable Crossover","Dumbbell Bench Press","Pushups"],
  Back:["Seated Cable Rows","One-Arm Dumbbell Row","Inverted Row"],
  Shoulders:["Side Lateral Raise"],
  Biceps:["Dumbbell Bicep Curl","Hammer Curls"],
  Triceps:["Triceps Pushdown - Rope Attachment","Dumbbell One-Arm Triceps Extension","Bench Dips"],
  Quads:["Leg Extensions","Goblet Squat","Dumbbell Squat","Bodyweight Squat"],
  Hamstrings:["Seated Leg Curl","Lying Leg Curls","Stiff-Legged Dumbbell Deadlift"],
  Glutes:["Barbell Hip Thrust","Butt Lift (Bridge)","Glute Kickback"]
};
function lifts(e){return !isActivity(e.name)&&!TIMED.test(e.name)&&!e.timed;}
function balance(plan,p,gear,budget,T){
  var r=RANGE[p.level]||RANGE.some,limits=p.limits||[];
  for(var it=0;it<30;it++){
    var w=weeklySets(plan),changed=false;
    for(var q=0;q<JUDGED.length&&!changed;q++){
      var m=JUDGED[q],s=w[m]||0;
      if(s<r[0]){
        /* A main lift can take a fifth set, an accessory a fourth; the goal's
           additions are left as they are. */
        var cand=[];
        plan.days.forEach(function(d){
          if(!d.ex.length||dayMinutes(d)+3>budget+5)return;
          d.ex.forEach(function(e){
            var isMain=MAINS.indexOf(e)>=0;
            if(lifts(e)&&muscleOf(e.name)===m&&e.sets<(isMain?5:4)&&(isMain||KEEP.indexOf(e)<0))cand.push(e);});});
        cand.sort(function(a,b){return a.sets-b.sets;});
        if(cand.length){cand[0].sets++;changed=true;break;}
        var n=(ACC[m]||[]).filter(function(x){return EXDB&&EXDB[x]&&usable(x,gear)&&!avoids(x,limits);})[0];
        if(!n)continue;
        /* Only onto a day that trains that half of the body, or the whole of it:
           no chest flyes on leg day. */
        var half=LOWERM[m]?"lower":"upper";
        var days=plan.days.filter(function(d){
          var h=halfOf(d);
          return d.ex.length&&(h===half||h==="both")&&!d.ex.some(function(e){return e.name===n;})&&dayMinutes(d)+7<=budget+5;});
        days.sort(function(a,b){return dayMinutes(a)-dayMinutes(b);});
        if(!days.length)continue;
        var d=days[0],at=d.ex.length;
        /* In before the goal's closing additions, conditioning or mobility. */
        while(at>0&&KEEP.indexOf(d.ex[at-1])>=0&&(isActivity(d.ex[at-1].name)||TIMED.test(d.ex[at-1].name)||d.ex[at-1].side))at--;
        d.ex.splice(at,0,liftEx(n,3,T.acc[0],T.acc[1],round30((LEVELS[p.level]||LEVELS.some).rest[1]*T.rest),{rir:T.rir[1]}));
        changed=true;}
      else if(s>r[1]*1.15){
        var cut=[];
        plan.days.forEach(function(d){d.ex.forEach(function(e){
          if(lifts(e)&&muscleOf(e.name)===m&&e.sets>2&&KEEP.indexOf(e)<0)cut.push(e);});});
        cut.sort(function(a,b){return b.sets-a.sets;});
        if(cut.length){cut[0].sets--;changed=true;}}}
    if(!changed)break;}}

/* The plan check's "Balance the volume", on any program, a coach's included: the
   first compound of each day is its main lift and is left alone; sets go where
   there is time; nothing makes a day longer than the longest one already is, or
   the session length, whichever is more. Returns how many sets and exercises moved. */
function rebalance(prog,p,gear){
  p=p||S.profile;
  var T=trainOf(p.goal),before={};
  KEEP=[];MAINS=[];SKILLED=p.level==="experienced"||p.level==="advanced";SUBS={};
  prog.days.forEach(function(d){var first=true;
    d.ex.forEach(function(e){before[e.id||e.name]=e.sets;
      if(first&&!isActivity(e.name)&&isCompound(e.name)){MAINS.push(e);KEEP.push(e);first=false;}});});
  var longest=Math.max.apply(null,prog.days.map(dayMinutes).concat([0]));
  balance(prog,p,gear,Math.max(longest-5,(num(p.mins)||60)-8),T);
  KEEP=[];MAINS=[];SKILLED=true;SUBS={};
  var sets=0,added=0;
  prog.days.forEach(function(d){d.ex.forEach(function(e){
    if(!e.id){e.id=uid();added++;return;}
    sets+=Math.abs(e.sets-(before[e.id]||0));});});
  return {sets:sets,added:added};}

/* The plan for the profile as it stands, not yet saved: what the assessment shows
   before anything is used. id picks a split other than the recommended one. */
function generatePlan(id){
  var p=S.profile, L=LEVELS[p.level]||LEVELS.some, G=goalOf(p.goal);
  id=id||recommendSplit(num(p.days,3),p.level,p.goal,S.gear);
  var base=PRESETS().filter(function(x){return x.id===id;})[0];
  var plan=makeProgram(base);
  plan.tag=L.label.toLowerCase()+" · "+G.label.toLowerCase()+" · "+p.days+" days";
  plan.meta={goal:p.goal,phase:G.label,swaps:shapePlan(plan,p,S.gear)};
  plan.days.forEach(function(d){d.ex.forEach(function(e){if(!e.id)e.id=uid();});});
  return plan;}
function buildPlan(id){
  var plan=generatePlan(id);
  addProgram(plan,true);
  S.plannedWeekly=(LEVELS[S.profile.level]||LEVELS.some).weekly;
  saveDB();
  return plan;
}


export {AVOID, buildPlan, dayMinutes, generatePlan, GOALS, LEVELS, rebalance, shapePlan, splitCandidates, SPLIT_LEVEL};

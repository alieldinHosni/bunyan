/* Bunyan — plan
   Split recommendation and plan generation. */
import {EXDB, isCompound} from "../data/exercises.js";
import {PRESETS} from "../data/splits.js";
import {adoptSplit, S, saveDB} from "../state.js";
import {num} from "../util.js";

/* ============================================================ plan engine */
/* sets and rest are [compound, isolation]. Compounds always get more of both. */
var LEVELS={
  new:        {label:"Just starting",    sets:[3,2], reps:[8,12], rest:[120,75], weekly:10},
  some:       {label:"Six months in",    sets:[3,3], reps:[6,12], rest:[150,90], weekly:14},
  experienced:{label:"A couple of years",sets:[4,3], reps:[6,12], rest:[150,90], weekly:17},
  advanced:   {label:"Long term lifter", sets:[4,3], reps:[5,12], rest:[180,90], weekly:20}
};
var GOALS={
  lose:    {label:"Lose fat",        shift:[1,3],  rest:1.0},
  gain:    {label:"Build muscle",    shift:[0,0],  rest:1.0},
  strength:{label:"Get stronger",    shift:[-2,-4],rest:1.3},
  maintain:{label:"Maintain",        shift:[0,0],  rest:1.0}
};
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
   wants volume per muscle, strength wants the big lifts often. */
/* Weighted to actually compete with frequency. At plus-or-minus three against a days
   term of up to eighteen, goal could never move the answer — which is what made the
   result look fixed whatever you entered. */
var SPLIT_GOAL={
  lose:    {fb:5,ul:4,ap:3,ppl:1,bro:-4,arnold:-4,bw:3},
  gain:    {fb:-2,ul:1,ap:2,ppl:5,bro:4,arnold:4,bw:-2},
  strength:{fb:3,ul:5,ap:3,ppl:0,bro:-4,arnold:-4,bw:-3},
  maintain:{fb:2,ul:3,ap:3,ppl:1,bro:0,arnold:0,bw:2}
};
var SPLIT_LEVEL={
  new:        {fb:4,ul:3,ap:1,ppl:-1,bro:-3,arnold:-4,bw:3},
  some:       {fb:1,ul:2,ap:2,ppl:1,bro:0,arnold:-1,bw:0},
  experienced:{fb:0,ul:1,ap:2,ppl:2,bro:1,arnold:1,bw:-1},
  advanced:   {fb:-1,ul:1,ap:1,ppl:2,bro:2,arnold:2,bw:-1}
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
      if(!eq||eq==="Bodyweight"||gear.indexOf(eq)>=0)ok++;
    });
  });
  return n?ok/n:1;
}

function splitScores(days,level,goal,gear){
  var d=Math.max(2,Math.min(6,num(days,3)));
  var lv=SPLIT_LEVEL[level]||SPLIT_LEVEL.some;
  var gl=SPLIT_GOAL[goal]||SPLIT_GOAL.maintain;
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
    :goal==="gain"?" Volume per muscle is what drives size."
    :goal==="strength"?" The big lifts come round often enough to practise them."
    :"";
  return (byId[id]||"")+" "+d+" days a week."+goalNote;
}
function buildPlan(){
  var p=S.profile, L=LEVELS[p.level]||LEVELS.some, G=GOALS[p.goal]||GOALS.lose;
  var id=recommendSplit(num(p.days,3),p.level,p.goal,S.gear);
  var base=PRESETS().filter(function(x){return x.id===id;})[0];
  var plan=adoptSplit(base);
  plan.tag=L.label.toLowerCase()+" \u00b7 "+G.label.toLowerCase()+" \u00b7 "+p.days+" days";
  plan.days.forEach(function(d){
    d.ex.forEach(function(e){
      var comp=isCompound(e.name);
      if(e.muscle!=="Ankle"&&e.muscle!=="Mobility"&&e.muscle!=="Cardio"){
        e.sets=comp?L.sets[0]:L.sets[1];
        e.lo=Math.max(3,(comp?L.reps[0]:8)+G.shift[0]);
        e.hi=Math.max(e.lo+1,(comp?L.reps[0]+2:L.reps[1])+G.shift[1]);
        e.rest=Math.round((comp?L.rest[0]:L.rest[1])*G.rest/5)*5;
      }
    });
  });
  S.myPlan=plan;
  S.plannedWeekly=L.weekly;
  saveDB();
  return plan;
}


export {splitCandidates, buildPlan, GOALS, LEVELS};

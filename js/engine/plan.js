/* Bunyan — plan
   Split recommendation and plan generation. */
import {isCompound} from "../data/exercises.js";
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
function recommendSplit(days,level){
  if(days<=2)return "ul";
  if(days===3)return level==="new"?"ul":"ap";
  if(days===4)return "ul";
  if(days===5)return "pro";
  return "ppl";
}
function whyThisSplit(days,level){
  if(days<=2)return "Two days means every session has to cover the whole body, so upper and lower "
    +"alternating gives each muscle the most frequency you can get.";
  if(days===3)return level==="new"
    ? "Three days as a newer lifter is best spent on compound movements hit often, not on split days."
    : "Three days works best split front and back, so every muscle is trained twice a week.";
  if(days===4)return "Four days is the classic upper and lower rotation. Everything twice a week with "
    +"enough recovery in between.";
  if(days===5)return "Five days lets each muscle get its own session with real volume behind it.";
  return "Six days suits push, pull and legs run twice, which is a lot of volume and needs good recovery.";
}
function buildPlan(){
  var p=S.profile, L=LEVELS[p.level]||LEVELS.some, G=GOALS[p.goal]||GOALS.lose;
  var id=recommendSplit(num(p.days,3),p.level);
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


export {buildPlan, GOALS, LEVELS};

/* Bunyan — the coach, connected to the app
   js/coach/ is pure and knows nothing of the app. This hands it what it needs: the log,
   what each exercise is (its muscles, whether it is cardio, the load a set moved with
   body weight counted), and from the active program its main lifts (the first compound
   of each day), their rep ranges and the muscles it trains. Declined insights stay
   quiet until the date they were set aside to.

   Worked out once per change to the log, the program or the dismissals: Home asks on
   every render. */
import {insights} from "../coach/insights.js";
import {isActivity} from "../data/activities.js";
import {isCompound, muscleOf, secondaryOf} from "../data/exercises.js";
import {loadOf} from "./formulas.js";
import {S, split} from "../state.js";
import {today} from "../util.js";

var INFO={muscle:muscleOf,secondary:secondaryOf,activity:isActivity,load:loadOf};
var MEMO={k:null,v:[]};

function programFacts(){
  var prog=split(),mains=[],ranges={},planned={};
  ((prog&&prog.days)||[]).forEach(function(d){
    var first=true;
    (d.ex||[]).forEach(function(e){
      if(!e||isActivity(e.name))return;
      planned[muscleOf(e.name)]=1;
      if(first&&isCompound(e.name)){if(mains.indexOf(e.name)<0)mains.push(e.name);first=false;}
      if(e.lo&&e.hi&&!ranges[e.name])ranges[e.name]={lo:e.lo,hi:e.hi};});});
  return {mains:mains,ranges:ranges,planned:Object.keys(planned),id:prog&&prog.id};}

function coachNow(){
  var ss=S.sessions||[],pf=programFacts();
  var k=[today(),ss.length,ss[0]&&ss[0].id,pf.id,pf.mains.join(","),JSON.stringify(S.coachDismiss||{})].join("|");
  if(MEMO.k===k)return MEMO.v;
  var v=[];
  try{v=insights(ss,INFO,{today:today(),mains:pf.mains,ranges:pf.ranges,planned:pf.planned,dismissed:S.coachDismiss||{}});}
  catch(e){v=[];}
  MEMO={k:k,v:v};
  return v;}

export {coachNow};

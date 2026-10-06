/* Bunyan — the coach, connected to the app
   js/coach/ is pure and knows nothing of the app. This hands it what it needs: the log,
   what each exercise is (its muscles, whether it is cardio, the load a set moved with
   body weight counted), and from the active program its main lifts (the first compound
   of each day), their rep ranges and the muscles it trains. Declined insights stay
   quiet until the date they were set aside to.

   Worked out once per change to the log, the program or the dismissals: Home asks on
   every render. */
import {insights} from "../coach/insights.js";
import {standing} from "../coach/percentile.js";
import {isActivity} from "../data/activities.js";
import {isCompound, muscleOf, secondaryOf} from "../data/exercises.js";
import {lastWeight, loadOf} from "./formulas.js";
import {S, split} from "../state.js";
import {today} from "../util.js";

var INFO={muscle:muscleOf,secondary:secondaryOf,activity:isActivity,load:loadOf};
/* A cheap fingerprint of the log, so an edited workout (a set, a weight, a date) is
   noticed as well as an added or deleted one: dates, exercise names and sets. */
function logSig(ss){
  var h=ss.length;
  ss.forEach(function(x){
    var d=String(x&&x.date||"");for(var i=0;i<d.length;i++)h=(h*31+d.charCodeAt(i))%1000000007;
    ((x&&x.entries)||[]).forEach(function(e){
      var n=String(e&&e.name||"");for(var j=0;j<n.length;j++)h=(h*31+n.charCodeAt(j))%1000000007;
      ((e&&e.sets)||[]).forEach(function(z){if(!z)return;
        h=(h*31+Math.round((+z.w||0)*10)*7+(+z.r||0)*3+(z.wu?1:0)+Math.round((+z.rpe||0)*2))%1000000007;});});});
  return h;}
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
  var k=[today(),logSig(ss),pf.id,pf.mains.join(","),JSON.stringify(S.coachDismiss||{})].join("|");
  if(MEMO.k===k)return MEMO.v;
  var v=[];
  try{v=insights(ss,INFO,{today:today(),mains:pf.mains,ranges:pf.ranges,planned:pf.planned,dismissed:S.coachDismiss||{}});}
  catch(e){v=[];}
  MEMO={k:k,v:v};
  return v;}

/* Where the squat, bench and deadlift sit among raw powerlifting competitors, from the
   last 12 weeks. Needs the profile's sex and a bodyweight; otherwise "none". */
var SMEMO={k:null,v:null};
function standingNow(){
  var ss=S.sessions||[],p=S.profile||{},bw=lastWeight()||+p.weight||0;
  var k=[today(),logSig(ss),p.sex,bw].join("|");
  if(SMEMO.k===k)return SMEMO.v;
  var v;
  try{v=standing(ss,INFO,{today:today(),sex:p.sex,bodyweight:bw});}
  catch(e){v={kind:"none",lifts:[]};}
  SMEMO={k:k,v:v};
  return v;}

export {coachNow, standingNow};

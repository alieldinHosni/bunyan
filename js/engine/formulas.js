/* Bunyan — formulas
   Training and body maths: volume, 1RM, RPE, BMR, progression. */
import {FOODDB, sumNutrition} from "./nutrition.js";
import {dayRec, S, saveDB, split} from "../state.js";
import {num, r1, today} from "../util.js";
import {V} from "../ui/view.js";

/* ============================================================ formulas */
/* A warm-up counts for nothing: not volume, not average RPE, not a record, and not
   the progression check. It is there so the row exists, not so it scores. */
function setVol(x){return x.wu?0:num(x.w)*num(x.r);}
function volume(sets){var tot=0;for(var i=0;i<sets.length;i++)tot+=setVol(sets[i]);return tot;}
function sessionVolume(s){var tot=0;s.entries.forEach(function(e){tot+=volume(e.sets||[]);});return tot;}
function avgRPE(sets){var n=0,tot=0;sets.forEach(function(x){if(x.wu||!x.rpe)return;tot+=x.rpe;n++;});return n?r1(tot/n):0;}
function e1RM(w,r){if(!w||!r||r>12)return 0;return r1(w*(1+r/30));}
function bestE1RM(sets){var b=0;sets.forEach(function(x){var e=e1RM(num(x.w),num(x.r));if(e>b)b=e;});return b;}
function macroKcal(p,c,f){return Math.round(num(p)*4+num(c)*4+num(f)*9);}
function bmr(){var p=S.profile,w=lastWeight()||num(p.weight,86);
  return Math.round(10*w+6.25*num(p.height)-5*num(p.age)+(p.sex==="f"?-161:5));}
function tdee(){return Math.round(bmr()*num(S.profile.activity,1.4));}
function targetKcal(){var td=tdee(),g=S.profile.goal;
  return g==="lose"?td-500:g==="gain"?td+250:g==="recomp"?td-250:td;}
/* Clearing Safari's data wipes everything and there is no server copy, so losing a
   history is the most likely real harm this app can do. Once there is enough logged to
   be worth protecting, ask — quietly, and only every so often. */
var BACKUP_EVERY=30*864e5, BACKUP_SNOOZE=7*864e5;
function backupDue(){
  if(S.sessions.length<5)return false;
  var now=Date.now();
  if((S.backupSnooze||0)>now)return false;
  return now-(S.lastBackup||0)>BACKUP_EVERY;}
function backupAgeDays(){
  if(!S.lastBackup)return null;
  return Math.floor((Date.now()-S.lastBackup)/864e5);}

function lastWeight(){for(var i=S.body.length-1;i>=0;i--)if(S.body[i].weight)return S.body[i].weight;return 0;}
function avg7(){var v=S.body.slice(-7).map(function(b){return b.weight;}).filter(function(x){return x>0;});
  return v.length>=3?r1(v.reduce(function(a,b){return a+b;},0)/v.length):0;}
/* Working sets only. The "last time" column and the recommendation engine would both
   be misled by a warm-up. */
function prevPerf(name){
  for(var i=0;i<S.sessions.length;i++){
    var e=S.sessions[i].entries.filter(function(x){return x.name===name&&x.sets.length;})[0];
    if(e){
      var work=e.sets.filter(function(x){return !x.wu;});
      if(work.length)return {date:S.sessions[i].date,sets:work};}
  } return null;}
function prFor(name){
  var best={w:0,e:0,vol:0,reps:0,date:null};
  S.sessions.forEach(function(s){s.entries.forEach(function(e){
    if(e.name!==name)return;
    e.sets.forEach(function(x){
      if(x.wu)return;
      var w=num(x.w),r=num(x.r);
      if(w>best.w){best.w=w;best.reps=r;best.date=s.date;}
      var er=e1RM(w,r);if(er>best.e)best.e=er;
      if(w*r>best.vol)best.vol=w*r;
    });});});
  return best;}
function recommend(e){
  var p=prevPerf(e.name);
  if(!p||!p.sets.length)return null;
  var top=0,topR=0,rpes=[];
  p.sets.forEach(function(x){
    if(num(x.w)>top){top=num(x.w);topR=num(x.r);}
    if(x.rpe)rpes.push(x.rpe);});
  var avg=rpes.length?rpes.reduce(function(a,b){return a+b;},0)/rpes.length:0;
  var hitTop=p.sets.filter(function(x){return num(x.r)>=e.planned.hi;}).length>=Math.max(1,p.sets.length-1);
  var mode=S.profile.prog,heavy=/Squat|Deadlift|Leg Press|Hack|Hip Thrust/i.test(e.name);
  var inc=mode==="conservative"?2.5:mode==="aggressive"?(heavy?10:5):(heavy?5:2.5);
  var w=top,note;
  if(!top){return {w:0,lo:e.planned.lo,hi:e.planned.hi,note:"Find a weight you can control for "+e.planned.lo+" reps."};}
  if(hitTop&&(!avg||avg<=9)){w=r1(top+inc);note="You hit the top of the range last time.";}
  else if(avg&&avg>=9.5){w=top;note="Last session was near failure. Hold this weight.";}
  else note="Same weight, aim for more reps.";
  return {w:w,lo:e.planned.lo,hi:e.planned.hi,note:note,last:top+" \u00d7 "+topR};}
function progressionHint(e){
  if(!e.sets.length)return null;
  var work=e.sets.filter(function(x){return !x.wu&&num(x.r)>0;});
  if(work.length<Math.max(2,e.planned.sets-1))return null;
  var allTop=work.every(function(x){return num(x.r)>=e.planned.hi;});
  if(!allTop)return null;
  var mode=S.profile.prog,heavy=/Squat|Deadlift|Leg Press|Hack|Hip Thrust/.test(e.name);
  var inc=mode==="conservative"?2.5:mode==="aggressive"?(heavy?10:5):(heavy?5:2.5);
  var w=Math.max.apply(null,work.map(function(x){return num(x.w);}));
  if(!w)return null;
  return {inc:inc,next:r1(w+inc)};}
function weeklySets(){
  var cut=Date.now()-7*864e5,out={};
  S.sessions.forEach(function(s){
    if(new Date(s.date+"T00:00:00").getTime()<cut)return;
    s.entries.forEach(function(e){
      if(!e.sets.length)return;
      out[e.muscle]=(out[e.muscle]||0)+e.sets.length;});});
  return out;}
function daysSince(muscle){
  for(var i=0;i<S.sessions.length;i++){
    var hit=S.sessions[i].entries.some(function(e){return e.muscle===muscle&&e.sets.length;});
    if(hit)return Math.floor((Date.now()-new Date(S.sessions[i].date+"T00:00:00").getTime())/864e5);
  } return null;}
function consistency(){
  var cut=Date.now()-28*864e5;
  var n=S.sessions.filter(function(s){return new Date(s.date+"T00:00:00").getTime()>=cut;}).length;
  var planned=split().days.filter(function(d){return d.ex.length;}).length*4;
  return planned?Math.min(100,Math.round(n/planned*100)):0;}
function mealTotal(name,d){
  var r=dayRec(d),m=r.meals[name];
  return sumNutrition(m&&m.items||[]);}
function curDate(){return V.fdate||today();}
function eatenToday(d){
  var r=dayRec(d),all=[];
  Object.keys(r.meals).forEach(function(k){
    var m=r.meals[k];
    (m.items||[]).forEach(function(i){all.push(i);});});
  return sumNutrition(all);}
function bumpFreq(id){if(!id)return;S.freq[id]=(S.freq[id]||0)+1;}
function frequentFoods(n){
  var pool=(S.myFoods||[]).concat(FOODDB||[]);
  return Object.keys(S.freq||{})
    .sort(function(a,b){return S.freq[b]-S.freq[a];})
    .map(function(id){return pool.filter(function(f){return f.id===id;})[0];})
    .filter(Boolean).slice(0,n||8);}
function addItems(meal,items,d){
  var r=dayRec(d);
  if(!r.meals[meal])r.meals[meal]={done:true,items:[]};
  items.forEach(function(i){r.meals[meal].items.push(i);bumpFreq(i.fid);});
  r.meals[meal].done=true;
  saveDB();}



export {addItems, avg7, avgRPE, BACKUP_SNOOZE, backupAgeDays, backupDue, bestE1RM, consistency, curDate, daysSince, eatenToday, frequentFoods, lastWeight, macroKcal, prevPerf, prFor, progressionHint, recommend, sessionVolume, targetKcal, tdee, volume, weeklySets};

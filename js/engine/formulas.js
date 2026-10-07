/* Bunyan — formulas
   Training and body maths: volume, 1RM, RPE, BMR, progression. The maths itself is
   in lifts.js and body.js, which read no state; what is left here hands them this
   profile's, and the food log's helpers. */
import {FOODDB, sumNutrition} from "./nutrition.js";
import {dayRec, S, saveDB, split} from "../state.js";
import {num, r1, today} from "../util.js";
import {t} from "../i18n/dict.js";
import {fmtW} from "../units.js";
import {blockNow, plannedLight} from "./blocks.js";
import {avgRPE, bestE1RMIn, bodyAtIn, bwShare, consistencyIn, daysSinceIn, deloadDueIn, deloadSets, e1RM, incrementOf,
        loadIn, plateauIn, prevPerfIn, prIn, progressionHintOf, recommendIn, recordIn, recordsOfEntry, repsAtIn,
        sessionVolumeIn, snapDown, volumeIn, weeklySetsIn} from "./lifts.js";
import {avg7Of, bmrOf, lastWeightOf, macroTargetsOf, proteinFor, sessionKcalOf, targetKcalOf, tdeeFormulaOf,
        tdeeOf} from "./body.js";

/* ============================================================ formulas */
/* The lifts' maths lives in lifts.js, which is handed the log it works from (the
   workouts, the weigh-ins, the profile's weight); these pass in this profile's state,
   so the screens and the coach keep calling them as before. */
function LOG(){return {sessions:S.sessions,body:S.body,weight:S.profile&&S.profile.weight};}
function bodyAt(date){return bodyAtIn(LOG(),date);}
function loadOf(name,w,date){return loadIn(LOG(),name,w,date);}
function volume(sets,name,date){return volumeIn(LOG(),sets,name,date);}
function sessionVolume(s){return sessionVolumeIn(LOG(),s);}
function bestE1RM(sets,name,date){return bestE1RMIn(LOG(),sets,name,date);}
function macroKcal(p,c,f){return Math.round(num(p)*4+num(c)*4+num(f)*9);}
/* The body's maths lives in body.js, which is handed what it needs; these pass in
   this profile's state, so the screens and the coach keep calling them as before. */
function bmr(){return bmrOf(S.profile,S.body);}
function tdeeFormula(){return tdeeFormulaOf(S.profile,S.body);}
/* Maintenance in use: what the log measured, once the person chose to build their
   targets on it (S.energy, set from js/engine/energy.js); otherwise the formula. */
function tdee(){return tdeeOf(S.profile,S.body,S.energy);}
function targetKcal(){return targetKcalOf(S.profile,S.body,S.energy);}
function proteinTarget(w){return proteinFor(S.profile,w);}
function macroTargets(){return macroTargetsOf(S.profile,S.body,S.energy);}
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

function lastWeight(){return lastWeightOf(S.body);}
/* Calories burned by a session (body.js has the equation), at the latest weigh-in.
   0 when no body weight has ever been logged: the caller shows something it knows. */
function sessionKcal(mins){return sessionKcalOf(lastWeight(),mins);}
function avg7(){return avg7Of(S.body);}
function prevPerf(name){return prevPerfIn(LOG(),name);}
function prFor(name){return prIn(LOG(),name);}
/* The next load step for an exercise: its own step if one was set (S.incr, kg; not
   when auto), else by its equipment, the unit, how dumbbells are logged and how fast
   the person wants weight to go up (lifts.js incrementOf). */
function incrementFor(name,top,auto){
  return incrementOf(name,top,{own:!auto&&S.incr&&num(S.incr[name]),lb:!!(S.prefs&&S.prefs.unit==="lb"),
    dbTotal:dbTotal(),prog:S.profile.prog});}
function plateauOf(name){return plateauIn(LOG(),name);}
/* How dumbbell loads are entered: per hand (the default, and what the numbers on the
   dumbbells say) or as the pair's total. */
function dbTotal(){return !!(S.prefs&&S.prefs.dbLoad==="total");}
/* ---- a lighter week ----------------------------------------------------------
   Suggested, never imposed (lifts.js deloadDueIn has the case). While it runs the
   plan's sets drop by about 40% and suggested loads by about 10%. A lighter week runs
   when one was started from the card, or when a training block reaches its planned one
   (js/engine/blocks.js). */
function inDeload(){return !!(S.deload&&S.deload.until&&today()<=S.deload.until)||plannedLight();}
function deloadDue(){
  /* Blocks bring their own lighter week every fourth, so none is suggested on top. */
  if(inDeload()||blockNow())return null;
  return deloadDueIn(LOG(),S.deload,today());}
function repsAt(name,w){return repsAtIn(LOG(),name,w);}
function recordOf(name,x,earlier){return recordIn(LOG(),name,x,earlier,today());}
function recordsIn(e){return recordsOfEntry(LOG(),e,today());}
/* How a set's weight reads: "BW + 10 kg" or "BW" on a bodyweight lift. */
function loadText(name,w){
  if(bwShare(name)>0)return num(w)>0?t("BW")+" + "+fmtW(w):t("BW");
  return fmtW(w);}
function recordText(rec){
  if(!rec)return "";
  if(rec.k==="e")return t("New best estimated max")+": "+fmtW(rec.e)+" ("+loadText(rec.n,rec.w)+" \u00d7 "+rec.r+")";
  if(rec.k==="r")return t("Rep record")+": "+rec.r+" \u00d7 "+loadText(rec.n,rec.w);
  return t("New record")+": "+loadText(rec.n,rec.w)+" \u00d7 "+rec.r;}
function recommend(e){
  return recommendIn(LOG(),e,{increment:function(n,top){return incrementFor(n,top);},deload:inDeload(),
    ready:S.active&&num(S.active.ready)});}
function progressionHint(e){return progressionHintOf(e,function(n,w){return incrementFor(n,w);});}
function weeklySets(){return weeklySetsIn(LOG(),Date.now());}
function daysSince(muscle){return daysSinceIn(LOG(),muscle,Date.now());}
function consistency(){return consistencyIn(LOG(),split().days.filter(function(d){return d.ex.length;}).length,Date.now());}
function mealTotal(name,d){
  var r=dayRec(d),m=r.meals[name];
  return sumNutrition(m&&m.items||[]);}
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



export {bmr, bodyAt, bwShare, loadOf, loadText, recordText, dbTotal, deloadDue, deloadSets, inDeload, recordOf, recordsIn, snapDown, proteinTarget, incrementFor, plateauOf, addItems, avg7, avgRPE, BACKUP_SNOOZE, backupAgeDays, backupDue, bestE1RM, consistency, e1RM, daysSince, eatenToday, frequentFoods, lastWeight, macroKcal, prevPerf, prFor, progressionHint, recommend, sessionKcal, sessionVolume, targetKcal, tdee, tdeeFormula, volume, weeklySets, macroTargets};

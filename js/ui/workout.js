/* Bunyan — workout
   Every change to the live workout, in one place: logging a set or a bout, taking
   one back, marking a warm-up, fixing a logged number, moving between exercises,
   the rest timer's controls, readiness and pain, finishing and discarding.

   The click handler in app.js only dispatches to these. Before, each of them was a
   branch of that one handler, mixed in with food, settings and navigation, so there
   was no single place to see — or test — what can happen to a workout in progress.
   Each function here validates what it is given, changes S.active, saves, and
   repaints; none of them reads the event that caused it. */
import {t} from "../i18n/dict.js";
import {actKcal} from "../data/activities.js";
import {muscleOf, MUSCLES} from "../data/exercises.js";
import {lastWeight, prFor, recordOf, recordText} from "../engine/formulas.js";
import {S, saveDB} from "../state.js";
import {fmtW, toKg} from "../units.js";
import {num, r1} from "../util.js";
import {ACT, askConfirm, closeSheet, finishSession, openSheet, syncDraft, val} from "./actions.js";
import {render} from "./render.js";
import {resetNav} from "./nav.js";
import {groupNext, groupRun, noteSet, paintRest, rowsFor} from "./views/session.js";
import {alarmStop, endRest, ex_isTimed, play, setBeeped, setLastTick, startRest, syncWorkoutState, tap, toast, V} from "./view.js";

function current(){return (S.active&&S.active.entries[V.logIdx])||null;}

/* The muscle filter a replacement should open on. muscleOf() can answer "Other",
   which is a real classification but not one the filter row offers — selecting it
   would filter the list to nothing with no pill lit to explain why. */
function pickMuscle(name){
  var m=name?muscleOf(name):null;
  return (m&&MUSCLES.indexOf(m)>=0)?m:"All";
}

/* Bounds for a logged set, in storage units (kg). Wide enough for any real lifter,
   narrow enough to catch a slipped digit before it becomes a record. */
function setProblem(w,r,timed){
  if(!isFinite(w)||w<0)return t("Weight cannot be negative.");
  if(w>1000)return t("That weight is more than Bunyan accepts. Check it.");
  if(!r||r<1)return t(timed?"Enter the seconds first.":"Enter reps first.");
  if(r!==Math.round(r))return t("Reps are whole numbers.");
  if(r>(timed?3600:100))return t(timed?"That is longer than an hour.":"That is more than 100 reps. Check it.");
  return null;
}

/* ---- where you are ------------------------------------------------------------ */
/* Back to the exact exercise and set, not the top of the workout. V is memory only,
   so the position rides on the session itself and survives a reload. */
function resume(){
  resetNav();V.tab="train";V.train="days";
  V.logIdx=Math.min(num(S.active&&S.active.idx,0),(S.active?S.active.entries.length-1:0));
  V.fresh=-1;syncDraft();render();}
function jumpTo(n){
  if(!S.active||n<0||n>=S.active.entries.length)return;
  V.logIdx=n;S.active.idx=n;endRest();V.fresh=-1;syncDraft();saveDB();render();}
function nextExercise(){
  if(!S.active)return;
  if(V.logIdx>=S.active.entries.length-1){confirmFinish();return;}
  play("set");endRest();V.fresh=-1;
  V.logIdx=V.logIdx+1;
  saveDB();syncDraft();render();}

/* ---- before the first set ---------------------------------------------------- */
function setReady(v){if(!S.active)return;S.active.ready=v;saveDB();render();}
/* "Something hurts": the flag stays on the entry either way; then replace it, skip
   it for today, or note it and carry on. */
function flagPain(mode){
  var eh=current();if(!eh){closeSheet();return;}
  eh.pain=true;saveDB();
  if(mode==="swap"){
    V.exm=pickMuscle(eh.name);V.exe="All";V.exq="";
    openSheet("exercise",{swaplive:true,like:eh.name});return;}
  closeSheet();
  if(mode==="skip"){
    if(V.logIdx>=S.active.entries.length-1){confirmFinish();return;}
    endRest();V.fresh=-1;V.logIdx=V.logIdx+1;syncDraft();saveDB();render();return;}
  toast(t("Noted. Stop if it gets worse."));}

/* ---- logging ------------------------------------------------------------------- */
/* Complete the active set. Reads the live inputs first so a value typed but not
   blurred is never lost. */
function logSet(){
  /* No two sets are logged inside a second. The recommendation banner above the
     table goes away after the first set, the rows move up, and the second tap of a
     double tap would land on the next row's button and log a phantom set. */
  if(V.loggedAt&&Date.now()-V.loggedAt<700)return;
  var e3=current();if(!e3)return;
  var lw=document.getElementById("in_w"),lr=document.getElementById("in_r"),
      lp=document.getElementById("in_rpe");
  /* What is in the fields is what gets logged. A cleared weight is bodyweight (0),
     not the previous set's load, which is what an empty field used to log. */
  if(lw)V.draft.w=lw.value===""?0:toKg(lw.value);
  if(lr)V.draft.r=lr.value===""?0:num(lr.value);
  if(lp)V.draft.rpe=lp.value===""?null:Math.min(10,Math.max(1,Math.round(num(lp.value,8)*2)/2));
  var bad=setProblem(V.draft.w,V.draft.r,ex_isTimed(e3));
  if(bad){toast(bad);return;}
  var ns={w:V.draft.w,r:V.draft.r};if(V.draft.rpe)ns.rpe=V.draft.rpe;
  if(V.draftSg)ns.sg=1;
  var rec3=recordOf(e3.name,ns,e3.sets);
  e3.sets.push(ns);
  /* A slipped digit (80 → 800) would become a record and drive every suggestion
     after it. Far above the lifter's best, say so — the set is logged, and the tick
     undoes it. */
  var bestW=prFor(e3.name).w;
  if(bestW>=20&&ns.w>bestW*1.3)setTimeout(function(){
    toast(t("That is well above your best of")+" "+fmtW(bestW)+". "+t("Check the weight. Tap the tick to undo."));},50);
  else if(rec3)setTimeout(function(){toast("🏆 "+recordText(rec3));},50);
  V.loggedAt=Date.now();
  /* Closes the active period and starts a new one; the clock resumes by itself. */
  noteSet(S.active);
  V.fresh=e3.sets.length-1;
  play("set");tap("ok");
  /* In a superset you move straight to the next exercise and only rest once the
     round is finished. Resting between the pair would make it two exercises. */
  var run=groupRun(S.active.entries,V.logIdx);
  if(run.length>1){
    var nxt=groupNext(S.active.entries,V.logIdx);
    if(nxt===null){startRest(e3);}
    else{
      var wrapped=run.indexOf(nxt)<=run.indexOf(V.logIdx);
      if(wrapped)startRest(e3); else endRest();
      V.logIdx=nxt;S.active.idx=nxt;V.fresh=-1;
    }
    saveDB();syncDraft();render();return;
  }
  startRest(e3);saveDB();syncDraft();render();}
/* One bout of cardio or sport: time, and distance, intervals and heart rate where
   they were given. */
function logBout(){
  var ea=current();if(!ea)return;
  var mEl=document.getElementById("in_min"),kEl=document.getElementById("in_km"),hEl=document.getElementById("in_hr");
  var amin=Math.max(1,Math.min(1440,Math.round(num(mEl&&mEl.value!==""?mEl.value:V.draft.min,30))));
  var akm=kEl&&kEl.value!==""?Math.min(500,Math.max(0,r1(num(kEl.value)))):0;
  var ahr=hEl&&hEl.value!==""?Math.min(240,Math.max(30,Math.round(num(hEl.value)))):0;
  var arpe=V.draft.rpe||6;
  var bout={w:0,r:0,min:amin,km:akm,rpe:arpe,kcal:actKcal(ea.name,amin,arpe,lastWeight())};
  if(ahr)bout.hr=ahr;
  var ivN=Math.round(num(val("in_ivn"),0)),ivOn=Math.round(num(val("in_ivon"),0)),ivOff=Math.round(num(val("in_ivoff"),0));
  if(ivN>0&&ivN<100&&ivOn>0&&ivOn<=3600)bout.iv={n:ivN,on:ivOn,off:Math.max(0,Math.min(3600,ivOff))};
  ea.sets.push(bout);
  V.draft.min=amin;V.draft.km=akm;V.draft.hr=ahr;
  if(bout.iv){V.draft.ivn=bout.iv.n;V.draft.ivon=bout.iv.on;V.draft.ivoff=bout.iv.off;}
  noteSet(S.active);V.fresh=ea.sets.length-1;play("set");tap("ok");saveDB();render();}

/* ---- taking it back ----------------------------------------------------------- */
/* Removing a row. An empty one destroys nothing, so it goes at once; one with a
   logged set asks, and says what it is about to throw away. */
function removeRow(i){
  var eD=current();if(!eD)return;
  if(i<eD.sets.length){
    var sD=eD.sets[i];
    askConfirm({title:t("Delete set")+" "+(i+1)+"?",icon:"trash",
      body:(num(sD.w)?fmtW(sD.w)+" × "+num(sD.r):num(sD.r)+" "+t("reps"))
           +" "+t("will be removed."),
      cta:t("Delete"),act:"delset",data:i,hard:true});
    return;}
  eD.extra=(eD.extra||0)-1;
  saveDB();syncDraft();render();}
/* Tapping the green tick undoes that set. Reversible, so no confirm. */
function unlogSet(i){
  /* The log button turns into this one under the finger, so the second tap of a
     double tap would remove the set it had just logged. Ignored for a moment. */
  if(V.loggedAt&&Date.now()-V.loggedAt<800&&i===V.fresh)return;
  var e4=current();if(!e4)return;
  var gone=e4.sets.splice(i,1)[0];
  if(!gone)return;
  V.fresh=-1;saveDB();syncDraft();render();
  toast(t("Set removed."),function(){
    if(!S.active||S.active.entries.indexOf(e4)<0)return;
    e4.sets.splice(Math.min(i,e4.sets.length),0,gone);saveDB();syncDraft();render();});}
function addRow(){
  var e5=current();if(!e5)return;
  e5.extra=(e5.extra||0)+1;V.fresh=-1;saveDB();render();}
function toggleWarm(i){
  var ew=current(),sw=ew&&ew.sets[i];
  if(!sw)return;
  sw.wu=!sw.wu;V.fresh=-1;saveDB();syncDraft();render();
  toast(sw.wu?t("Marked as a warm-up."):t("Counting as a working set."));}
/* Editing a set that is already logged, in place. Previously the only way to fix
   a typo was to delete the set and re-enter it. */
function editLoggedSet(i,k,raw){
  var en=current();
  if(!en||!en.sets[i])return;
  var v=num(raw,0);
  if(k==="rpe")v=v?Math.min(10,Math.max(1,v)):0;
  else if(k==="w")v=Math.min(1000,Math.max(0,toKg(v)));
  else{
    v=Math.round(Math.max(0,v));
    /* A logged set keeps at least one rep: zero is not a set. */
    if(!v||v>(ex_isTimed(en)?3600:100)){toast(t(v?"That is more than Bunyan accepts.":"A set needs at least one rep."));render();return;}}
  en.sets[i][k]=v;
  V.fresh=-1;saveDB();syncDraft();render();}

/* ---- the rest timer ---------------------------------------------------------- */
/* Pause, resume and ±30s only repaint the rest screen, so they save here rather
   than waiting for the next tick — a reload a moment later keeps them. */
function persistRest(){if(syncWorkoutState())saveDB();}
/* Pause, resume and ±30s change the countdown and nothing else on the screen, so
   they repaint the four live parts rather than rebuilding. A full render here was
   what flashed the previous screen and restarted the ring from zero. Only leaving
   rest entirely is a real navigation. */
function restControl(cmd){
  if(cmd==="pause"){V.restLeft=Math.max(0,Math.ceil((V.restEnd-Date.now())/1000));
    V.restPaused=true;V.restEnd=0;paintRest();persistRest();return;}
  if(cmd==="resume"){V.restPaused=false;V.restEnd=Date.now()+V.restLeft*1000;
    setBeeped(false);paintRest();persistRest();return;}
  if(cmd==="skip"){endRest();render();return;}
  if(cmd==="hide"){V.restMin=true;render();return;}
  if(cmd==="show"){V.restMin=false;render();return;}
  /* From the rest-over screen: start another countdown of that length. */
  if(cmd==="ext30"||cmd==="ext60"){
    var ext=cmd==="ext30"?30:60;
    alarmStop();V.restDone=false;V.restPaused=false;
    V.restTotal=ext;V.restEnd=Date.now()+ext*1000;setBeeped(false);setLastTick(99);
    render();return;}
  var by=+cmd;if(!isFinite(by))return;
  if(V.restPaused){V.restLeft=Math.max(0,V.restLeft+by);
    V.restTotal=Math.max(15,V.restTotal+by);
    /* Trimming a paused timer to zero ends the rest, which is a real change. */
    if(!V.restLeft){V.restPaused=false;render();return;}}
  else{V.restEnd=Math.max(Date.now(),V.restEnd+by*1000);
       V.restTotal=Math.max(15,V.restTotal+by);
       if(by>0)setBeeped(false);}
  paintRest();persistRest();}

/* ---- the end ------------------------------------------------------------------- */
/* Finishing early is a choice worth one question: nothing logged means the workout
   would simply vanish, and sets still planned are left out of the record. When every
   planned set is logged there is nothing to ask. */
function confirmFinish(){
  var a=S.active;if(!a)return;
  var logged=0,left=0;
  a.entries.forEach(function(e){logged+=e.sets.length;left+=Math.max(0,rowsFor(e)-e.sets.length);});
  if(!logged){
    askConfirm({title:t("Nothing logged yet"),icon:"trash",
      body:t("Finishing now throws this workout away."),
      cta:t("Discard workout"),act:"discard",cancel:t("Keep training")});return;}
  if(left>0){
    askConfirm({title:t("Finish workout?"),icon:"leave",
      body:left+" "+t(left===1?"planned set is not logged. It is left out of this workout.":"planned sets are not logged. They are left out of this workout."),
      cta:t("Finish now"),act:"finishnow",cancel:t("Keep training")});return;}
  finishSession();
}
ACT.finishnow=function(){finishSession();};
/* Throwing a workout away is only ever deliberate: a control inside the session,
   never a question asked because you glanced at another screen. */
function askDiscard(){
  askConfirm({title:t("Discard this session?"),icon:"trash",
    body:t("Every set you logged in this workout is thrown away. This cannot be undone."),
    cta:t("Discard it"),act:"discard",hard:true});}

export {addRow, askDiscard, confirmFinish, editLoggedSet, flagPain, jumpTo, logBout, logSet, nextExercise,
        persistRest, pickMuscle, removeRow, restControl, resume, setProblem, setReady, toggleWarm, unlogSet};

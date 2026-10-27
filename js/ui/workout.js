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
import {isBarbell, muscleOf, MUSCLES} from "../data/exercises.js";
import {barKg, lastWeight, prFor, recordOf, recordText} from "../engine/formulas.js";
import {exName} from "../i18n/exnames.js";
import {S, saveDB} from "../state.js";
import {fmtW, toDisp, toKg} from "../units.js";
import {num, r1} from "../util.js";
import {ACT, askConfirm, closeSheet, finishSession, openSheet, syncDraft, val} from "./actions.js";
import {render} from "./render.js";
import {resetNav} from "./nav.js";
import {groupNext, groupRun, LOGGED_MS, noteSet, paintRest, rowsFor, weightStep} from "./views/session.js";
import {warmOf} from "./views/warmup.js";
import {endRest, ex_isTimed, play, setBeeped, startRest, syncWorkoutState, tap, toast, V} from "./view.js";

function current(){return (S.active&&S.active.entries[V.logIdx])||null;}
var loggedTimer=0;

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
/* Looking at another exercise — by swipe, the arrows, the segments or the list. The
   rest timer keeps running: checking what is next is not the end of a rest. */
function jumpTo(n){
  if(!S.active||n<0||n>=S.active.entries.length||n===V.logIdx)return;
  V.logIdx=n;S.active.idx=n;V.fresh=-1;syncDraft();saveDB();render();}
function nextExercise(){
  if(!S.active)return;
  if(V.logIdx>=S.active.entries.length-1){confirmFinish();return;}
  play("set");endRest();V.fresh=-1;
  V.logIdx=V.logIdx+1;
  saveDB();syncDraft();render();}

/* ---- dropping an exercise from today ------------------------------------------
   Today only: the program keeps it. With nothing logged it goes at once, and the
   toast can bring it back; with sets logged it asks first, since they go with it. */
function removeExercise(){
  var a=S.active,i=V.logIdx,e=current();
  if(!e||a.entries.length<2)return;
  if(e.sets.length){
    var n=e.sets.length;
    askConfirm({title:t("Remove {ex}?").replace("{ex}",exName(e.name)),icon:"trash",
      body:t(n===1?"The set you logged on it is deleted with it.":"The {n} sets you logged on it are deleted with it.").replace("{n}",n),
      cta:t("Remove"),act:"rmex",data:i,hard:true});
    return;}
  dropExercise(i);}
function dropExercise(i){
  var a=S.active;if(!a||!a.entries[i]||a.entries.length<2)return;
  var e=a.entries.splice(i,1)[0],stamp=a.started;
  /* The next exercise moves up into its place; the last one hands over to the one
     before it. */
  if(V.logIdx>=a.entries.length)V.logIdx=a.entries.length-1;
  a.idx=V.logIdx;V.fresh=-1;
  saveDB();syncDraft();render();
  toast(t("{ex} removed from this workout.").replace("{ex}",exName(e.name)),function(){
    var b=S.active;if(!b||b.started!==stamp)return;
    var k=Math.min(i,b.entries.length);
    b.entries.splice(k,0,e);V.logIdx=k;b.idx=k;V.fresh=-1;
    saveDB();syncDraft();render();});}
ACT.rmex=function(_,i){dropExercise(i);};

/* ---- before the first set ---------------------------------------------------- */
function setReady(v){if(!S.active)return;S.active.ready=v;saveDB();render();}
/* A low day, taken lighter: one set fewer on every exercise not yet started (never
   below one), with Undo. Asked for, never done on its own. */
function lighterDay(){
  var a=S.active;if(!a)return;
  var before=a.entries.map(function(e){return e.planned?e.planned.sets:0;}),n=0;
  a.entries.forEach(function(e){
    if(!e.planned||(e.sets||[]).length||num(e.planned.sets)<=1)return;
    e.planned.sets=num(e.planned.sets)-1;n++;});
  a.lighter=true;saveDB();render();
  toast(t(n===1?"One set fewer on 1 exercise.":"One set fewer on {n} exercises.").replace("{n}",n),function(){
    a.entries.forEach(function(e,i){if(e.planned)e.planned.sets=before[i];});a.lighter=false;saveDB();render();});}
/* "Something hurts": the flag stays on the entry either way; then replace it, skip
   it for today, or note it and carry on. */
function flagPain(mode){
  var eh=current();if(!eh){closeSheet();return;}
  eh.pain=true;saveDB();
  /* The replacement for something that hurts: the same movement, loaded another way. */
  if(mode==="swap"){
    V.exm=pickMuscle(eh.name);V.exe="All";V.exq="";
    openSheet("exercise",{swaplive:true,like:eh.name,pain:true});return;}
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
  /* A barbell set at 0 is a slip, not a set (owner, 27 Oct): the bar alone weighs. */
  if(!bad&&isBarbell(e3.name)&&barKg()>0&&!(V.draft.w>0))
    bad=t("A barbell can't be 0: the bar alone is {b}. Enter the total, bar included.").replace("{b}",fmtW(barKg()));
  if(bad){toast(bad);return;}
  /* A warm-up is chosen when it is added (+ Warm-up), so the set knows its kind as it
     is logged: wu, and out of volume, records and progression as before. */
  var wu=num(e3.wuq)>0;
  var ns={w:V.draft.w,r:V.draft.r};if(V.draft.rpe&&!wu)ns.rpe=V.draft.rpe;
  if(V.draftSg)ns.sg=1;
  if(wu){ns.wu=true;e3.wuq=num(e3.wuq)-1;}
  var rec3=recordOf(e3.name,ns,e3.sets);
  e3.sets.push(ns);
  /* A slipped digit (80 → 800) would become a record and drive every suggestion
     after it. Far above the lifter's best, say so — the set is logged, and the tick
     undoes it. */
  var bestW=prFor(e3.name).w;
  if(!wu&&bestW>=20&&ns.w>bestW*1.3)setTimeout(function(){
    toast(t("That is well above your best of")+" "+fmtW(bestW)+". "+t("Check the weight. Tap the tick to undo."));},50);
  else if(rec3)setTimeout(function(){toast("🏆 "+recordText(rec3));},50);
  V.loggedAt=Date.now();V.askDel=null;
  /* For a moment the check says the set is logged and offers Undo, then reads the next
     set (workout-spec.md, LogControl). */
  var nWork=e3.sets.filter(function(x){return !x.wu;}).length;
  V.justLogged={idx:V.logIdx,i:e3.sets.length-1,n:nWork,wu:wu,at:V.loggedAt};
  clearTimeout(loggedTimer);
  loggedTimer=setTimeout(function(){if(V.justLogged&&Date.now()-V.justLogged.at>=LOGGED_MS){V.justLogged=null;if(S.active)render();}},LOGGED_MS+30);
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
  /* A logged set asks inside its own row: still two taps, one sheet fewer. */
  if(i<eD.sets.length){V.askDel={x:V.logIdx,i:i};render();return;}
  /* A pending row: a queued warm-up leaves the queue, a working set the plan. */
  if(i-eD.sets.length<num(eD.wuq))eD.wuq=num(eD.wuq)-1;
  eD.extra=(eD.extra||0)-1;
  saveDB();syncDraft();render();}
function cancelDelete(){V.askDel=null;render();}
/* The row's Delete. A warm-up was a row of its own (+ Warm-up), so its row goes with it. */
function deleteSet(i){
  var e=current(),ask=V.askDel;V.askDel=null;
  if(!e||!ask||ask.x!==V.logIdx||ask.i!==i||!e.sets[i]){render();return;}
  if(e.sets[i].wu&&num(e.extra)>0)e.extra=num(e.extra)-1;
  ACT.delset(null,i);}
/* Tapping the green tick undoes that set. Reversible, so no confirm. */
function unlogSet(i){
  /* The log button turns into this one under the finger, so the second tap of a
     double tap would remove the set it had just logged. Ignored for a moment. */
  if(V.loggedAt&&Date.now()-V.loggedAt<800&&i===V.fresh)return;
  var e4=current();if(!e4)return;
  var gone=e4.sets.splice(i,1)[0];
  if(!gone)return;
  /* A warm-up taken back is the warm-up still to do, not a working set. */
  if(gone.wu)e4.wuq=num(e4.wuq)+1;
  V.fresh=-1;V.justLogged=null;V.askDel=null;saveDB();syncDraft();render();
  toast(t("Set removed."),function(){
    if(!S.active||S.active.entries.indexOf(e4)<0)return;
    if(gone.wu)e4.wuq=Math.max(0,num(e4.wuq)-1);
    e4.sets.splice(Math.min(i,e4.sets.length),0,gone);saveDB();syncDraft();render();});}
/* Undo on the "Set 2 logged" control: the set comes back off, with the numbers it was
   logged with, and the rest it started ends. Not within a moment of logging, or the
   second tap of a double tap would land here. */
function undoLogged(){
  var j=V.justLogged,e=current();
  if(!j||!e||j.idx!==V.logIdx)return;
  if(V.loggedAt&&Date.now()-V.loggedAt<800)return;
  var gone=e.sets[j.i];if(!gone||j.i!==e.sets.length-1)return;
  e.sets.pop();if(gone.wu)e.wuq=num(e.wuq)+1;
  V.justLogged=null;V.fresh=-1;endRest();
  syncDraft();V.draft.w=num(gone.w);V.draft.r=num(gone.r);V.draft.rpe=gone.rpe||null;V.draftSg=!!gone.sg;
  saveDB();render();}
function addRow(){
  var e5=current();if(!e5)return;
  e5.extra=(e5.extra||0)+1;V.fresh=-1;saveDB();render();}
/* + Warm-up: a warm-up row before the next working set, and the set being done. Its
   numbers start from the last warm-up on this exercise, or else the next working set,
   to step down from; no warm-up weight is recommended, since there is no rule for one. */
function addWarmup(){
  var e=current();if(!e)return;
  e.extra=num(e.extra)+1;e.wuq=num(e.wuq)+1;V.fresh=-1;V.askDel=null;
  saveDB();syncDraft();render();}
/* The warm-up's ramp-up sets, put on the lift they lead to as warm-up rows (W) when
   the workout starts (owner, 27 Oct): done where they are logged, each filled in with
   its weight and reps (actions.js syncDraft reads e.wuRamp). Once per exercise, and
   not after a set of it is logged. */
function queueRamp(){
  var a=S.active,w=a&&warmOf(a);if(!w||!w.ramp||!w.ramp.sets.length)return;
  var e=a.entries.filter(function(x){return x.name===w.ramp.name;})[0];
  if(!e||e.wuRamp||e.sets.length)return;
  var n=w.ramp.sets.length;
  e.wuRamp=w.ramp.sets.map(function(s){return {w:num(s.w),r:num(s.r)};});
  e.extra=num(e.extra)+n;e.wuq=num(e.wuq)+n;}
/* The steppers: weight by the exercise's own step at this load, reps by 1, seconds by
   5. What is typed in the box but not yet blurred is read first. */
function stepDraft(k,dir){
  var e=current();if(!e||(k!=="w"&&k!=="r"))return;
  var f=document.getElementById("in_"+k);
  if(f&&f.value!=="")V.draft[k]=k==="w"?toKg(f.value):num(f.value);
  if(k==="w"){
    var st=Math.round(toDisp(weightStep(e.name,V.draft.w))*100)/100;
    /* Stepping down stops at the bar: a barbell is never lighter than it. */
    var floor=isBarbell(e.name)&&toDisp(V.draft.w)>=toDisp(barKg())?toDisp(barKg()):0;
    var d=Math.max(floor,Math.min(toDisp(1000),Math.round((toDisp(V.draft.w)+dir*st)*100)/100));
    V.draft.w=toKg(d);}
  else{
    var timed=ex_isTimed(e),by=timed?5:1;
    V.draft.r=Math.max(1,Math.min(timed?3600:100,Math.round(num(V.draft.r))+dir*by));}
  V.draftSg=false;render();}
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
  /* Over: thirty seconds more, a fresh short rest from now. */
  if(cmd==="extend"){endRest();V.restTotal=30;V.restEnd=Date.now()+30000;setBeeped(false);persistRest();render();return;}
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

export {addRow, addWarmup, queueRamp, askDiscard, cancelDelete, confirmFinish, deleteSet, removeExercise, editLoggedSet, flagPain, jumpTo, logBout, logSet, nextExercise,
        lighterDay, persistRest, pickMuscle, removeRow, restControl, resume, setProblem, setReady, stepDraft, undoLogged, unlogSet};

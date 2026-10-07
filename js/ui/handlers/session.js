/* Bunyan — the live workout
   A workout under way: starting and resuming, the warm-up and cool-down, how you feel,
   moving between exercises, logging sets and activities, rest, swapping and adding,
   pain, plates, notes, finishing and leaving. */
import * as W from "../workout.js";
import {lastWeight} from "../../engine/formulas.js";
import {t} from "../../i18n/dict.js";
import {dayRec, S, saveDB, saveSession, sessionById} from "../../state.js";
import {toDisp} from "../../units.js";
import {num, r1} from "../../util.js";
import {ACT, askConfirm, closeSheet, openSheet, startActivity, startDay, swapAlt, val} from "../actions.js";
import {enter as enterEx, fromOf} from "../exswipe.js";
import {holding, startHold, stopHold} from "../hold.js";
import {pushNav, resetNav} from "../nav.js";
import {render} from "../render.js";
import {endRest, keepAwake, toast, V} from "../view.js";
import {warmShown} from "../views/warmup.js";
import {has, key, NEXT, on} from "./registry.js";

/* ---- leaving an active workout ------------------------------------------- */
/* One prompt, reached by every exit. nav.js routes the back arrow, Safari's edge
   swipe and the OS gesture through this same guard, so no control hardcodes a
   destination and none of them can behave differently from the others.

   The protocol: return true to cancel this back and take responsibility for it. The
   guard is handed the function that finishes the job and calls it once the user has
   chosen, so "Keep workout and exit" leaves exactly where the gesture was going.

   Leaving has not ended a session since Round 2 — the session is saved and resumable
   either way. The sheet is not there to prevent loss; it is there to say so, because
   a user who does not know their sets are safe will not risk the gesture. That is why
   keeping is the primary and discarding is the secondary, outlined rather than filled:
   the dangerous option should be reachable, not inviting. */
var leaveResume=null;
/* While the logger is the screen you are looking at, the back gesture is held off and
   the ✕ is the way out. Same condition as navGuard below, because it has to be the
   same screen: anywhere else in the app the gesture keeps working normally.

   Pure. canBack() consults it on every render to decide whether to draw a back arrow,
   so anything with a side effect here would fire on every repaint. */
function sessionLocked(){
  /* The workout itself, not its Resume card on the Training page ("hub"). */
  return !!(S.active&&V.tab==="train"&&V.train!=="hub"&&!V.sheet);
}
/* A gesture answered by nothing at all reads as a frozen app, so it says what to do
   instead — once per workout, not per swipe, which would be its own annoyance. Only
   the session has anything to explain: a swipe at a tab root does nothing because
   there is nowhere to go, which needs no telling. */
var lockSaid=false;
function backBlocked(){
  if(!S.active){lockSaid=false;return;}         /* armed again for the next workout */
  if(!sessionLocked()||lockSaid)return;
  lockSaid=true;toast(t("Tap the close button to leave this workout."));
}

function navGuard(resume){
  /* Only when the workout is the thing you are actually looking at. vTrain() returns
     the logger for as long as a session is live, so "the Train tab" and "the workout"
     are the same screen and that is the whole condition. Without the tab test, every
     back gesture anywhere in the app — on Food, on Progress — would stop to ask about
     a workout the user is not currently in. */
  if(!S.active||V.tab!=="train"||V.train==="hub")return false;
  leaveResume=resume||null;
  askConfirm({title:t("Leave workout?"),icon:"leave",
    body:t("Your sets are saved. Pick up where you left off any time."),
    cta:t("Save and exit"),act:"leavekeep",cancel:t("Keep training"),
    alt:t("Discard workout"),altact:"leavediscard"});
  return true;
}
/* Cancel needs no handler: closing the sheet without choosing leaves the session and
   the screen exactly as they were, which is what Cancel means.

   Both outcomes land on Home rather than calling the resume the gesture was carrying.
   That is not a shortcut — back inside Train resolves to a Train route, and a Train
   route with a live session renders the logger, so honouring the gesture's own
   destination would put the user straight back in the workout they just left. Home is
   also the screen that carries the Resume card, so leaving and returning are adjacent.
   The destination is decided here, once, for the arrow and the swipe alike. */
function leaveTo(tab){
  leaveResume=null;
  resetNav();V.tab=tab||"train";V.train=V.tab==="train"&&S.active?"hub":"days";render();window.scrollTo(0,0);
}

/* What this module answers. app.js calls register() once, at boot, in the order
   the branches are tried in (see registry.js). */
function register(){
  ACT.leavekeep=function(){leaveTo("train");};
  /* Discarding ends the workout, so there is nothing to resume and no reason to leave
     Train: you stay on the Train hub, ready to pick another day. */
  ACT.leavediscard=function(){
    S.active=null;endRest();V.fresh=-1;
    keepAwake(false);saveDB();
    leaveTo("train");
  };
  on(function(D){return D.ready!==undefined&&S.active;},function(D){W.setReady(+D.ready);return;});
  on(function(D){return D.readyless&&S.active;},function(){W.lighterDay();return;});
  /* How the amount of work felt, inside a training block. Tapping the chosen answer
     again takes it back. */
  key("sfeel",function(D){
    var sf=V.sd&&sessionById(V.sd.id);if(!sf)return;
    if(sf.feel===D.sfeel)delete sf.feel;else sf.feel=D.sfeel;
    saveSession(sf);render();return;});
  key("srpe",function(D){
    var sw9=V.sd&&sessionById(V.sd.id);if(!sw9)return;
    sw9.srpe=+D.srpe;saveSession(sw9);render();return;});
  key("hurt",function(){openSheet("hurt");return;});
  key("hurtdo",function(D){W.flagPain(D.hurtdo);return;});
  key("startday",function(D){pushNav();startDay(D.startday);return;});
  has("continue",function(){W.resume();return;});
  /* Moving between exercises: the segments, the arrows either side of them, and the
     list from the title all slide the new one in from the side it lies on. */
  /* The warm-up: done, skipped, brought back from the ⋯ menu; its ticks and timers,
     and the cool-down's on the complete sheet. */
  on(function(D){return D.wugo||D.wuskip;},function(D){if(S.active){S.active.warm=D.wugo?1:0;stopHold();saveDB();window.scrollTo(0,0);render();}return;});
  key("wuopen",function(){if(S.active){S.active.warm="open";closeSheet();window.scrollTo(0,0);}return;});
  has("wutick",function(D){var wa=S.active;if(wa){wa.wuDone=wa.wuDone||{};
    if(wa.wuDone[D.wutick])delete wa.wuDone[D.wutick];else wa.wuDone[D.wutick]=1;saveDB();render();}return;});
  has("cdtick",function(D){V.cdDone=V.cdDone||{};
    if(V.cdDone[D.cdtick])delete V.cdDone[D.cdtick];else V.cdDone[D.cdtick]=1;render();return;});
  key("hold",function(D){var hk=D.hold,hn=D.holdn;
    if(holding(hk)){stopHold();render();return;}
    startHold(hk,+D.secs||30,D.side==="1",function(){
      if(hk.indexOf("cd")===0){V.cdDone=V.cdDone||{};V.cdDone[hn]=1;}
      else if(S.active){S.active.wuDone=S.active.wuDone||{};S.active.wuDone[hn]=1;saveDB();}
      render();});
    return;});
  on(function(D){return (D.jump!==undefined||D.exnav!==undefined||D.jumpl!==undefined)&&S.active&&warmShown(S.active);},function(){
    S.active.warm=S.active.warm==="open"?1:0;stopHold();return NEXT;});
  has("jump",function(D){var jF=+D.jump-V.logIdx;W.jumpTo(+D.jump);if(jF)enterEx(fromOf(jF));return;});
  has("exnav",function(D){var nS=+D.exnav,nT=V.logIdx+nS;if(S.active&&nT>=0&&nT<S.active.entries.length){W.jumpTo(nT);enterEx(fromOf(nS));}return;});
  has("exlist",function(){openSheet("exlist");return;});
  has("jumpl",function(D){closeSheet();W.jumpTo(+D.jumpl);return;});
  key("stp",function(D){
    var id=D.stp,d1=parseFloat(D.d);
    var cur=id==="bw"?(V.draft.bw!=null?V.draft.bw:toDisp(lastWeight()||86))
           :id==="st"?(V.draft.st||dayRec().steps||0):V.draft[id];
    var min=id==="w"?0:id==="rpe"?1:id==="st"?0:1;
    var max=id==="rpe"?10:1e6;
    V.draft[id]=Math.min(max,Math.max(min,r1(num(cur)+d1)));
    render();return;});
  key("rpe",function(D){V.draft.rpe=+D.rpe;render();return;});
  key("actint",function(D){V.draft.rpe=+D.actint;render();return;});
  key("logact",function(){W.logBout();return;});
  key("activ",function(){V.actIv=true;render();var ivf=document.getElementById("in_ivn");if(ivf)ivf.focus();return;});
  key("quickact",function(D){V.sheet=null;V.sd=null;startActivity(D.quickact);return;});
  key("actsheet",function(){openSheet("acts");return;});
  key("logset",function(){W.logSet();return;});
  has("delset",function(D){W.removeRow(+D.delset);return;});
  has("unlog",function(D){W.unlogSet(+D.unlog);return;});
  key("addrow",function(){W.addRow();return;});
  key("rest",function(D){W.restControl(D.rest);return;});
  key("swap",function(){
    var eS=S.active.entries[V.logIdx];
    V.exm=W.pickMuscle(eS&&eS.name);V.exe="All";V.exq="";
    openSheet("exercise",{swaplive:true,like:eS?eS.name:null});return;});
  key("nextex",function(){W.nextExercise();return;});
  key("rmlive",function(){W.removeExercise();return;});
  /* Added to this workout only: the picker starts from the whole library. */
  key("addlive",function(){V.exm="All";V.exe="All";V.exq="";openSheet("exercise",{addlive:true});return;});
  has("sessmore",function(){openSheet("sessmore");return;});
  key("finish",function(){W.confirmFinish();return;});
  has("discard",function(){W.askDiscard();return;});
  /* The plan's other choice for this exercise, before anything is logged on it. */
  on(function(D){return D.swapalt&&S.active;},function(){var ea=S.active.entries[V.logIdx];if(!ea||!ea.alt||ea.sets.length)return;
    swapAlt(ea.alt,V.logIdx,ea.name);return;});
  on(function(D){return D.warm!==undefined&&S.active;},function(D){W.toggleWarm(+D.warm);return;});
  key("plates",function(){openSheet("plates");return;});
  has("bar",function(D){V.bar=+D.bar;render();return;});
  key("note",function(){openSheet("note");return;});
  key("savenote",function(){
    if(S.active){S.active.notes=val("snote");saveDB();}
    closeSheet();toast(t("Note saved."));return;});}

export {backBlocked, navGuard, register, sessionLocked};

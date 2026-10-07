/* Bunyan — app
   Entry point: event listeners, wiring and boot. */
import {register as shellTaps} from "./ui/handlers/shell.js";
import {register as trainTaps} from "./ui/handlers/train.js";
import {backBlocked, navGuard, register as sessionTaps, sessionLocked} from "./ui/handlers/session.js";
import {register as foodTaps} from "./ui/handlers/food.js";
import {register as coachTaps} from "./ui/handlers/coach.js";
import {register as progressTaps} from "./ui/handlers/progress.js";
import {register as profileTaps} from "./ui/handlers/profile.js";
import * as W from "./ui/workout.js";
import {initState, loadStored, onProfileSwitch, refreshFromStorage, S, saveDB, saveSession, startupNote, storageKey} from "./state.js";
import {alarmStart, beeped, keepAwake, lastTick, play, restoreWorkoutState, setBeeped, setLastTick, syncViewport, syncWorkoutState, tap, toast, V} from "./ui/view.js";
import {closeSheet, syncDraft} from "./ui/actions.js";
import {dispatchTap} from "./ui/handlers/registry.js";
import {draftFrom} from "./ui/views/assess.js";
import {initDockScroll} from "./ui/dock.js";
import {initExSwipe} from "./ui/exswipe.js";
import {initNav} from "./ui/nav.js";
import {initPress} from "./ui/press.js";
import {initReorder} from "./ui/reorder.js";
import {initSheetDrag} from "./ui/sheetdrag.js";
import {loadExDB, reconcileExercises, useUserData} from "./data/exercises.js";
import {mmss, paintOver, paintRest, sessionClock} from "./ui/views/session.js";
import {moveRow, requestCloseSheet} from "./ui/handlers/common.js";
import {onChange, onInput, onKeydown} from "./ui/handlers/fields.js";
import {render, syncKeyboard} from "./ui/render.js";
import {setStorageErrorHandler} from "./util.js";
import {syncWbar} from "./ui/wbar.js";
import {t} from "./i18n/dict.js";

/* Read as the finger lands, not on the click: by then Chrome has already taken the
   focus off the field for a tap outside it, and iOS has not. */
var askTyping=false;
document.addEventListener("pointerdown",function(){
  askTyping=V.sheet==="ask"&&!!document.activeElement&&document.activeElement.id==="askv";},true);

/* Taps. Every branch lives by domain in js/ui/handlers/ and is tried in order by
   dispatchTap (js/ui/handlers/registry.js). What is decided here, before any branch:
   the element tapped, the haptic, and whether the name prompt was being typed in. */
document.addEventListener("click",function(ev){
  /* Named el, not t: t() is the translator. */
  var el=ev.target.closest("button,[data-close],[data-stop]");
  if(!el)return;
  if(el.matches("button"))tap(el.classList.contains("btn")?"heavy":"light");
  /* In the ask dialog a tap that misses the field lowers the keyboard first (see the
     stop and close branches in handlers/shell.js). */
  var typingAsk=V.sheet==="ask"&&askTyping;askTyping=false;
  dispatchTap(el.dataset,el,ev,{typingAsk:typingAsk});
});
document.addEventListener("input",onInput);
document.addEventListener("keydown",onKeydown);
document.addEventListener("change",onChange);

/* Swiping the date navigator moves the day, as the arrows do — it presses the arrow,
   so the rule for which days are reachable lives in one place. A swipe is a quick,
   mostly horizontal drag of at least 48px; anything else is left to scrolling, which
   these listeners never block (passive). */
var swipe=null;
document.addEventListener("touchstart",function(ev){
  var el=ev.touches.length===1&&ev.target.closest&&ev.target.closest('[data-swipe="day"]');
  swipe=el?{el:el,x:ev.touches[0].clientX,y:ev.touches[0].clientY,at:Date.now()}:null;
},{passive:true});
document.addEventListener("touchend",function(ev){
  var sw=swipe;swipe=null;
  if(!sw||!ev.changedTouches.length)return;
  var dx=ev.changedTouches[0].clientX-sw.x,dy=ev.changedTouches[0].clientY-sw.y;
  if(Math.abs(dx)<48||Math.abs(dx)<Math.abs(dy)*1.5||Date.now()-sw.at>700)return;
  /* Content follows the finger: dragging left brings the next day in. */
  var step=dx<0?1:-1;
  if(document.documentElement.getAttribute("dir")==="rtl")step=-step;
  var btn=sw.el.querySelector('[data-dday="'+step+'"]');
  if(btn&&!btn.disabled){swipedAt=Date.now();btn.click();}
},{passive:true});
/* A handled swipe must not also count as a tap on whatever the finger ended over —
   the date itself would open the month. Only the click that immediately follows. */
var swipedAt=0;
document.addEventListener("click",function(ev){
  if(swipedAt&&Date.now()-swipedAt<400&&!(ev.target.closest&&ev.target.closest("[data-dday]"))){
    swipedAt=0;ev.preventDefault();ev.stopPropagation();}
},true);

/* The dock steps aside while the keyboard is up (see syncKeyboard in render.js). The
   same test decides both directions, and render() re-checks it, so the flag cannot be
   left behind by a field that was destroyed rather than blurred. */
document.addEventListener("focusin",syncKeyboard);
document.addEventListener("focusout",function(){setTimeout(syncKeyboard,60);});

/* The clock and the rest ring are the only things that change every second, so they
   are patched directly. Re-rendering the whole screen on a timer threw away scroll
   position and stole focus from the set inputs mid-entry. */
function tickSession(){
  if(!S.active)return;
  /* Computed from the last logged set, so a suspended page comes back with the right
     number rather than a counter that stopped when iOS froze the tab. */
  var ck=sessionClock(S.active);
  var c=document.getElementById("sessClock");
  if(c)c.textContent=mmss(ck.ms/1000);
  var pz=document.getElementById("sessPaused");
  if(pz)pz.hidden=!ck.paused;
  syncWbar();
  if(V.restDone)paintOver();
  if(!V.restEnd||V.restPaused)return;
  var left=Math.ceil((V.restEnd-Date.now())/1000);
  /* Running out is the one tick that changes the screen rather than the numbers. The
     rest surface does not disappear at zero any more — it turns into the alert, and
     stays until the user acknowledges it. Sound cannot be relied on (silent switch,
     backgrounded tab), so the screen has to carry it. */
  if(left<=0){V.restOver=V.restEnd;V.restEnd=0;V.restPaused=false;V.restDone=true;V.restMin=false;
    if(!V.sheet)render();else syncWbar();return;}
  paintRest();
}
setInterval(function(){
  if(V.restEnd&&!V.restPaused&&!beeped){
    var left=Math.ceil((V.restEnd-Date.now())/1000);
    var warn=S.prefs.warn||10;
    if(left<=Math.min(3,warn)&&left>0&&left!==lastTick){setLastTick(left);play("tick");}
    if(left===warn&&lastTick!==warn){setLastTick(warn);play("tick");}
    /* A rest that ran out while the page was frozen (phone locked, app in the
       background) is not announced minutes later: the screen shows it is over, and
       the eight-second alarm is only for a rest ending in front of you. */
    if(left<=0){setBeeped(true);if(Date.now()-V.restEnd<5000){alarmStart();tap("ok");}}}
  tickSession();
  if(syncWorkoutState())saveDB();},1000);
document.addEventListener("visibilitychange",function(){
  if(document.visibilityState!=="visible")return;
  if(S.active)keepAwake(true);
  /* Catch up at once instead of on the next one-second tick: a rest that ended while
     away shows as over the moment the app is back. */
  if(S.active&&V.restEnd&&!V.restPaused&&Date.now()>=V.restEnd){setBeeped(true);tickSession();}
  else tickSession();});

/* The intro is skippable — a tap ends it immediately. It also runs short when the
   user has asked for less motion, either in the OS or in App settings. */
function endSplash(){var sp=document.getElementById("splash");if(sp)sp.remove();}

/* Ids and names agree once both the library and the history have arrived; run on
   each of the two callbacks, whichever lands last does the work. A rename in the
   library is persisted only for the sessions it actually touched. */
function applyExReconcile(){
  var r=reconcileExercises(S);
  if(r.plansChanged)saveDB();
  r.changedSessions.forEach(function(s){saveSession(s);});
}

/* Boot. Nothing above ran on import, so this is the whole startup sequence
   in the order it actually happens. */
/* The taps the app answers, registered first, in the order their branches are tried
   in (js/ui/handlers/registry.js). No two domains answer the same element, so the
   order only matters inside a module, but it is written here rather than left to
   the import graph. */
shellTaps();trainTaps();sessionTaps();foodTaps();coachTaps();progressTaps();profileTaps();
/* The installed app gets the full-screen page height (see "The Home Screen app" in
   index.html). The display-mode query covers current iOS; this covers older ones. */
try{if(navigator.standalone)document.documentElement.classList.add("standalone");}catch(e){}
/* The exercise library reads the person's own exercises, equipment and favourites
   through this, rather than importing state (js/data/exercises.js). */
useUserData(function(){return S;});
/* A profile switch leaves the screen, the rest timer and the workout in memory with the
   profile being left (state.js calls this rather than reaching into the view). */
onProfileSwitch(function(){
  V.tab="train";V.train="days";V.logIdx=0;
  V.restEnd=0;V.restPaused=false;V.restDone=false;
  restoreWorkoutState();});
initState();
setStorageErrorHandler(toast);
/* One back path for the arrow, the edge swipe and the OS gesture. */
initNav({render:render,guard:navGuard,closeSheet:requestCloseSheet,
         locked:sessionLocked,onBlocked:backBlocked});
initSheetDrag(requestCloseSheet);
syncViewport();
if(window.visualViewport){
  window.visualViewport.addEventListener("resize",syncViewport);
  window.visualViewport.addEventListener("scroll",syncViewport);}
initReorder(moveRow,function(){tap("light");});
initDockScroll();
initPress();
/* A swipe on the exercise moves through the workout (js/ui/exswipe.js). */
initExSwipe({
  can:function(step){var a=S.active,n=V.logIdx+step;return !!(a&&!V.sheet&&V.tab==="train"&&n>=0&&n<a.entries.length);},
  go:function(step){W.jumpTo(V.logIdx+step);tap("light");}});
/* History comes from IndexedDB, so it arrives a tick later than everything else.
   Painting first and repainting when it lands keeps a slow or wedged IndexedDB from
   holding the whole app behind the intro; in practice it resolves well inside it. */
loadStored(function(){ applyExReconcile(); render(); });
/* The intro belongs to a cold start, not to every document load. A reload for any
   reason — a service worker taking over, a crash recovery, the OS reclaiming the
   tab — used to replay it, which reads as the app restarting. */
var coldStart=true;
try{ coldStart=!sessionStorage.getItem("bunyan:seen"); sessionStorage.setItem("bunyan:seen","1"); }
catch(e){ coldStart=true; }
if(!coldStart||(S.prefs&&S.prefs.splash===false))document.body.classList.add("nosplash");
else{
  var reduced=false;
  try{reduced=window.matchMedia("(prefers-reduced-motion:reduce)").matches;}catch(e){}
  var brief=reduced||(S.prefs&&S.prefs.anim===false);
  setTimeout(endSplash,brief?2150:3750);
  var spEl=document.getElementById("splash");
  if(spEl)spEl.addEventListener("click",endSplash);
}
loadExDB(function(){applyExReconcile();render();});
if(startupNote()==="corrupt")setTimeout(function(){
  toast(t("Your saved data could not be read, so Bunyan started fresh. A copy of it was kept on this phone."));},1200);
/* Ask the browser not to evict this origin's data under storage pressure. Everything
   Bunyan knows lives only here; this is free and silent where it is granted. */
try{if(navigator.storage&&navigator.storage.persist&&S.onboarded)
  navigator.storage.persisted().then(function(p){if(!p)navigator.storage.persist();}).catch(function(){});}catch(e){}
window.addEventListener("storage",function(ev){
  if(ev.key!==storageKey())return;
  refreshFromStorage(function(){if(S.active)syncDraft();render();});
});
/* Reopened mid-workout (a reload, or iOS having reclaimed the tab): straight back to
   the exercise and the rest that were on screen, not to Home. */
V.csec=(S.prefs&&S.prefs.csec)||"ai";
if(S.active){restoreWorkoutState();syncDraft();V.tab="train";V.train="days";}
if(!S.onboarded){V.tab="coach";V.csec="ai";V.assess=true;V.asd=draftFrom();}
render();

if("serviceWorker" in navigator){
  window.addEventListener("load",function(){
    navigator.serviceWorker.register("sw.js").then(function(reg){
      reg.update();
      reg.addEventListener("updatefound",function(){
        var nw=reg.installing;
        if(!nw)return;
        nw.addEventListener("statechange",function(){
          if(nw.state==="installed"&&navigator.serviceWorker.controller){
            nw.postMessage("skipWaiting");
            toast(t("Updated. Reopen the app to finish."));
          }});});
    }).catch(function(){});
  });
  /* No automatic reload. controllerchange fires on the first install as well as on
     an update, so this reloaded the page at an arbitrary moment — which replayed the
     intro and looked exactly like the app restarting under a back gesture. Reloading
     mid-workout is hostile anyway; the toast above already says what to do, and the
     new version is picked up on the next open. */
}
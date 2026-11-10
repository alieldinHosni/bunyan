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
import {alarmStart, beeped, keepAwake, kbPredict, lastTick, play, restoreWorkoutState, setBeeped, setLastTick, syncViewport, syncWorkoutState, tap, toast, V} from "./ui/view.js";
import {closeSheet, openSheet, syncDraft} from "./ui/actions.js";
import {decodePlan} from "./engine/planshare.js";
import {boot as smartBoot, onChange as smartChanged} from "./ui/smartcoach.js";
import {dispatchTap} from "./ui/handlers/registry.js";
import {draftFrom} from "./ui/views/assess.js";
import {initDockScroll} from "./ui/dock.js";
import {initExSwipe} from "./ui/exswipe.js";
import {initNav, resetNav} from "./ui/nav.js";
import {bindPanel, closeCoach} from "./ui/coachfab.js";
import {initPress} from "./ui/press.js";
import {initReorder} from "./ui/reorder.js";
import {initSheetDrag} from "./ui/sheetdrag.js";
import {initChatGest} from "./ui/chatgest.js";
import {initKeyboard} from "./ui/keyboard.js";
import {loadExDB, reconcileExercises, useUserData} from "./data/exercises.js";
import {mmss, paintOver, paintRest, sessionClock} from "./ui/views/session.js";
import {fixLogsNow, moveRow, requestCloseSheet, retargetNow} from "./ui/handlers/common.js";
import {onChange, onInput, onKeydown} from "./ui/handlers/fields.js";
import {render, syncKeyboard} from "./ui/render.js";
import {vTrain} from "./ui/views/train.js";
import {vFood} from "./ui/views/food.js";
import {vCoach} from "./ui/views/coach.js";
import {vProgress} from "./ui/views/progress.js";
import {initScrub} from "./ui/scrub.js";
import {isolateNums} from "./i18n/bidi.js";
import {setStorageErrorHandler} from "./util.js";
import {syncWbar} from "./ui/wbar.js";
import {paintRun} from "./ui/run.js";
import {t} from "./i18n/dict.js";
import {bootCheck} from "./ui/crashnote.js";
import {setPeek} from "./ui/datebar.js";
import {applySky, initSky} from "./ui/sky.js";
/* A restart nobody asked for is noted before anything else runs (js/ui/crashnote.js). */
bootCheck();

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
  var el=ev.target.closest("button,label.hap,[data-close],[data-stop]");
  if(!el)return;
  /* A control with a tick in it (js/ui/haptic.js): its label's own click is passed on by
     the browser to the switch inside, and it is that click, from a tap, Space or
     VoiceOver alike, that does the thing. The switch goes back to what its markup says
     after (off for a button, the setting's state for a switch). */
  var sw=null;
  if(el.matches("label")){if(!(ev.target.matches&&ev.target.matches("input.hapt-in")))return;sw=ev.target;tap(el.classList.contains("btn")?"heavy":"light");}
  if(el.matches("button"))tap(el.classList.contains("btn")?"heavy":"light");
  /* In the ask dialog a tap that misses the field lowers the keyboard first (see the
     stop and close branches in handlers/shell.js). */
  var typingAsk=V.sheet==="ask"&&askTyping;askTyping=false;
  dispatchTap(el.dataset,el,ev,{typingAsk:typingAsk});
  if(sw)sw.checked=sw.defaultChecked;
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
  var el=ev.touches.length===1&&ev.target.closest&&ev.target.closest('[data-swipe]');
  swipe=el?{el:el,x:ev.touches[0].clientX,y:ev.touches[0].clientY,at:Date.now()}:null;
},{passive:true});
/* Training's week follows the finger while it drags, so the swipe is felt before it lands. */
function dragOff(sw){if(sw&&sw.drag){sw.el.classList.remove("drag");sw.el.style.removeProperty("translate");sw.el.style.removeProperty("opacity");}}
document.addEventListener("touchmove",function(ev){
  var sw=swipe;if(!sw||sw.el.getAttribute("data-swipe")!=="week"||ev.touches.length!==1)return;
  var dx=ev.touches[0].clientX-sw.x,dy=ev.touches[0].clientY-sw.y;
  if(!sw.drag&&(Math.abs(dx)<8||Math.abs(dx)<Math.abs(dy)*1.5))return;
  if(!sw.drag)sw.el.classList.add("drag");
  sw.drag=true;
  var m=Math.max(-120,Math.min(120,dx*0.55));
  sw.el.style.translate=m+"px 0";sw.el.style.opacity=String(1-Math.abs(m)/300);
},{passive:true});
document.addEventListener("touchcancel",function(){dragOff(swipe);swipe=null;},{passive:true});
document.addEventListener("touchend",function(ev){
  var sw=swipe;swipe=null;
  dragOff(sw);
  if(!sw||!ev.changedTouches.length)return;
  var dx=ev.changedTouches[0].clientX-sw.x,dy=ev.changedTouches[0].clientY-sw.y;
  if(Math.abs(dx)<48||Math.abs(dx)<Math.abs(dy)*1.5||Date.now()-sw.at>700)return;
  /* Content follows the finger: dragging left brings the next day in. */
  var step=dx<0?1:-1;
  if(document.documentElement.getAttribute("dir")==="rtl")step=-step;
  /* A day on Food's bar; a week on Training's rail, whose arrows sit in its card. */
  var wk=sw.el.getAttribute("data-swipe")==="week",scope=wk?(sw.el.closest(".wkr")||sw.el):sw.el;
  var btn=scope.querySelector(wk?'[data-wkpage="'+step+'"]':'[data-dday="'+step+'"]');
  if(btn&&!btn.disabled){swipedAt=Date.now();btn.click();tap();}
},{passive:true});
/* A handled swipe must not also count as a tap on whatever the finger ended over —
   the date itself would open the month. Only the click that immediately follows. */
var swipedAt=0;
/* The week rail's open day folds away at a tap anywhere outside the rail. */
document.addEventListener("pointerdown",function(ev){
  if(V.wkPeek&&!(ev.target.closest&&ev.target.closest(".wkr")))setPeek(false);},true);
document.addEventListener("click",function(ev){
  if(swipedAt&&Date.now()-swipedAt<400&&!(ev.target.closest&&ev.target.closest("[data-dday],[data-wkpage]"))){
    swipedAt=0;ev.preventDefault();ev.stopPropagation();}
},true);

/* The dock steps aside while the keyboard is up (see syncKeyboard in render.js). The
   same test decides both directions, and render() re-checks it, so the flag cannot be
   left behind by a field that was destroyed rather than blurred. */
document.addEventListener("focusin",syncKeyboard);
/* A stepper's typed figure (steps, minutes) and the set card's two numbers are selected on
   focus, so typing replaces them. */
document.addEventListener("focusin",function(ev){var x=ev.target;
  if(x&&x.classList&&(x.classList.contains("stn")||x.classList.contains("val-n"))&&x.select)setTimeout(function(){try{x.select();}catch(e){}},0);});
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
  if(left<=0){V.restOver=V.restEnd;V.restEnd=0;V.restPaused=false;V.restDone=true;
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
  if(S.run)paintRun();
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
  applySky(true);
  V.tab="train";V.train="days";V.logIdx=0;
  V.restEnd=0;V.restPaused=false;V.restDone=false;V.justLogged=null;V.askDel=null;
  restoreWorkoutState();
  retargetNow();});
initState();
/* Targets the old formula made are rebuilt on the current one, once per profile. */
retargetNow();
setStorageErrorHandler(toast);
/* One back path for the arrow, the edge swipe and the OS gesture. */
initNav({render:render,guard:navGuard,closeSheet:requestCloseSheet,closeCoach:function(){closeCoach(render);},
         locked:sessionLocked,onBlocked:backBlocked});
/* The pictures under the sun of this place and minute (js/ui/sky.js). */
initSky();
initSheetDrag(requestCloseSheet);
/* The coach's header dragged down: the whole conversation gets smaller, the compact panel
   closes; with the tick, since the finger has just let go (a moment iOS allows it). */
initChatGest(function(){tap();if(V.coach==="full"){V.coach="compact";render();}else closeCoach(render);});
/* A field in a sheet takes the keyboard without the page jumping under it (iPhone). */
initKeyboard(kbPredict);
/* The small panel's field tapped on a phone: the whole conversation, once the keyboard is up. */
bindPanel(function(){V.coach="full";render();});
/* What the keyboard and the browser chrome leave visible (--vvh, --vvt), measured again
   whenever it can have changed. A cold launch from the Home Screen is the case that bit:
   iOS reports a short viewport for the first frames, and a value read once at boot kept the
   sheets, the Coach panel and the dock's band laid out against it until the next launch.
   So it is measured again after the first frames and after the page settles, on resize,
   rotation, a return from the background and a restore from the back-forward cache. */
function settleViewport(){
  syncViewport();
  requestAnimationFrame(function(){requestAnimationFrame(syncViewport);});
  setTimeout(syncViewport,250);setTimeout(syncViewport,1000);}
settleViewport();
if(window.visualViewport){
  window.visualViewport.addEventListener("resize",syncViewport);
  window.visualViewport.addEventListener("scroll",syncViewport);}
window.addEventListener("resize",syncViewport);
window.addEventListener("orientationchange",settleViewport);
window.addEventListener("pageshow",settleViewport);
window.addEventListener("load",settleViewport);
document.addEventListener("visibilitychange",function(){if(document.visibilityState==="visible")settleViewport();});
initReorder(moveRow,function(){tap("light");});
initDockScroll();
initPress();
/* Progress's charts, read with a finger (js/ui/scrub.js). */
initScrub();
/* A swipe on the exercise moves through the workout (js/ui/exswipe.js). */
/* The plan pages' tabs, in the order they sit (views/train.js TPLAN, views/food.js FPLAN). */
var PTABS={tplan:["program","programs"],fplan:["plan"],ptab:["overview","strength","body","habits"]};
/* Each kind's tab, as V holds it; Progress's starts on Overview. */
function ptabOf(k){return k==="tplan"?V.tplan:k==="fplan"?V.fplan:(V.ptab||"overview");}
function ptabSet(k,v){if(k==="tplan")V.tplan=v;else if(k==="fplan")V.fplan=v;else V.ptab=v;}
/* The dock's four tabs, swiped between on their own pages (owner, 4 Nov). */
var MTABS=["train","food","coach","progress"];
/* A main tab's own page: what a tap on its dock button opens. */
function atRoot(){
  if(V.sheet||V.coach||V.assess||V.pcheck)return false;
  if(V.tab==="train")return !S.active&&!S.run&&(V.train==="days"||V.train==="hub");
  if(V.tab==="food")return !V.fplan&&!V.meal&&!V.smeal&&!V.pslot&&!V.pimport;
  if(V.tab==="coach")return !V.chat;
  if(V.tab==="progress")return !V.phist;
  return false;}
/* Where a tab's own page starts, as the dock's tap leaves it (handlers/shell.js "tab"). */
var ROOTV=["tab","train","fplan","tgedit","meal","smeal","pslot","pimport","chat","advall","phist","dnavDir","fdate"];
function asRoot(tb){V.tab=tb;V.train="days";V.fplan=null;V.tgedit=false;V.meal=null;V.smeal=null;V.pslot=null;V.pimport=false;
  V.chat=false;V.advall=false;V.phist=false;V.dnavDir=0;if(tb==="food")V.fdate=null;}
function ptabNow(k){var l=PTABS[k],v=ptabOf(k);return Math.max(0,l.indexOf(v));}
initExSwipe({
  root:atRoot,
  can:function(step,k){
    if(k==="tab"){var m=MTABS.indexOf(V.tab)+step;return atRoot()&&m>=0&&m<MTABS.length;}
    if(k&&k!=="ex"){var n2=ptabNow(k)+step;return !V.sheet&&n2>=0&&n2<PTABS[k].length;}
    var a=S.active,n=V.logIdx+step;return !!(a&&!V.sheet&&V.tab==="train"&&n>=0&&n<a.entries.length);},
  /* The tab next door, drawn as it would be, for the swipe to bring in under the finger
     (exswipe.js peek). Nothing is changed: the tab is put back at once. */
  peek:function(step,k){
    if(k==="tab"){
      var nt=MTABS[MTABS.indexOf(V.tab)+step];if(!nt)return null;
      var keep={},hm="";ROOTV.forEach(function(f){keep[f]=V[f];});
      asRoot(nt);
      try{hm=nt==="train"?vTrain():nt==="food"?vFood():nt==="coach"?vCoach():vProgress();}catch(e){hm="";}
      ROOTV.forEach(function(f){V[f]=keep[f];});
      if(S.prefs&&S.prefs.lang==="ar")hm=isolateNums(hm);
      return hm||null;}
    var l=PTABS[k],i=ptabNow(k)+step;if(!l||i<0||i>=l.length)return null;
    var was=ptabOf(k),h="";
    ptabSet(k,l[i]);
    try{h=k==="tplan"?vTrain():k==="fplan"?vFood():vProgress();}catch(e){h="";}
    ptabSet(k,was);
    if(S.prefs&&S.prefs.lang==="ar")h=isolateNums(h);
    var box=document.createElement("div");box.innerHTML=h;
    var p=box.querySelector(".psec");return p?p.innerHTML:null;},
  go:function(step,k){
    /* The same move as the dock's tap, without its page entrance: the swipe brought the
       page in itself. */
    if(k==="tab"){var gt=MTABS[MTABS.indexOf(V.tab)+step];if(!gt)return;
      resetNav();asRoot(gt);V.tswiped=true;render();return;}
    if(k&&k!=="ex"){var v=PTABS[k][ptabNow(k)+step];ptabSet(k,v);
      /* The swipe brings the tab in itself; the section's own slide stays out of it. */
      V.pswiped=true;render();return;}
    W.jumpTo(V.logIdx+step);tap("light");}});
/* History comes from IndexedDB, so it arrives a tick later than everything else.
   Painting first and repainting when it lands keeps a slow or wedged IndexedDB from
   holding the whole app behind the intro; in practice it resolves well inside it. */
/* The history is in: old body-weight sets are read as body weight, once (js/engine/logfix.js). */
var bootDraft="";
/* A workout open across a reload: its first numbers were filled in before the history
   and the library were in, so with no suggestion to go on (0 on a barbell, say). Untouched,
   they are filled in again now that last time is known. */
/* The smart coach: loaded in the background when it was switched on, and its setting
   repainted as the download moves. */
smartChanged(function(){if(V.sheet==="set_smart"||V.tab==="profile")render();});
loadStored(function(){ smartBoot(); applyExReconcile(); fixLogsNow();
  /* Opened from a shared plan's link (#plan=…): what it holds, ready to add, and the
     link taken out of the address so a reload does not ask again. */
  var ph=/[#&]plan=([^&]+)/.exec(location.hash||"");
  if(ph&&S.onboarded){try{history.replaceState(null,"",location.pathname+location.search);}catch(e){}
    loadExDB(function(){decodePlan(decodeURIComponent(ph[1])).then(function(g){openSheet("recvplan",g?{got:g,done:{}}:{text:ph[1],err:1});});});}
  if(S.active)loadExDB(function(){if(S.active&&bootDraft&&JSON.stringify(V.draft)===bootDraft){bootDraft="";syncDraft();render();}});
  render(); });
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
if(S.active){restoreWorkoutState();syncDraft();bootDraft=JSON.stringify(V.draft);V.tab="train";V.train="days";}
if(!S.onboarded){V.tab="coach";V.assess=true;V.asd=draftFrom();}
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
/* Bunyan — render
   The single render entry point. */
import {applyLang} from "../i18n/exnames.js";
import {isolateNums} from "../i18n/bidi.js";
import {t} from "../i18n/dict.js";
import {vFood} from "./views/food.js";
import {vCoach} from "./views/coach.js";
import {vAssess} from "./views/assess.js";
import {adviceCount} from "./views/pcheck.js";
import {vProfile} from "./views/profile.js";
import {vProgress} from "./views/progress.js";
import {vSheet} from "./sheets.js";
import {S, saveDB, storeWarning} from "../state.js";
import {vTrain} from "./views/train.js";
import {ensureRunWatch, vRun} from "./run.js";
import {tourCheck} from "./tour.js";
import {syncRest} from "./views/session.js";
import {warmShown} from "./views/warmup.js";
import {PERSIST} from "../util.js";
import {lockScroll, syncWorkoutState, V} from "./view.js";
import {patch, replace} from "./patch.js";
import {checkDock, syncDock} from "./dock.js";
import {syncWbar} from "./wbar.js";
import {applyMotion, countTo, glideCards, isReduced, once, slidePair, snapCards, stillCopy} from "./motion.js";
import {navDepth} from "./nav.js";
import {applyLook} from "./theme.js";
import {bindExSwipe} from "./exswipe.js";
import {bindMore} from "./more.js";
import {syncMannequins} from "./mannequin.js";
import {syncBgArt} from "./bgart.js";
import {syncCoach} from "./coachfab.js";

/* ============================================================ render */
/* Motion is applied after the DOM has settled, and only to what changed.

   Each entry animation is keyed by the surface it belongs to and marked with once(),
   because the patcher deliberately keeps nodes alive across renders: without a key a
   "once per view" reveal would either replay on every repaint or never fire at all.
   A node that is genuinely new has no marker, so it animates; one that survived a
   patch keeps its marker and stays still. */
function paintMotion(root,viewKey){
  if(!root)return;
  var i,els;

  /* Marking is the whole mechanism: the CSS keys its entry animations off
     [data-anim], which the patcher is told to preserve. An earlier version added a
     class instead and the patcher stripped it every render, because `class` appears
     in the markup and `data-anim` does not. Marking is also cheaper. */
  /* The workout's cards too (.sess): each one that appears — the rest, the RPE
     question, Next exercise — arrives rather than popping in (owner, 28 Oct). */
  els=root.querySelectorAll(".empty,.setrow[data-k],.list .item[data-k],.bar,.sess [data-k]:not(input)");
  for(i=0;i<els.length;i++)once(els[i],viewKey,function(){});

  /* The one that needs more than a marker: a draw-on needs the path's own length,
     which only the browser can measure. The inline style survives because the view
     never sets one on this element. */
  els=root.querySelectorAll("svg path.line");
  for(i=0;i<els.length;i++)once(els[i],viewKey,function(p){
    var len=0;
    try{len=p.getTotalLength();}catch(e){}
    if(!len)return;
    p.style.strokeDasharray=len;
    p.style.strokeDashoffset=len;
  });

  /* Numbers that changed count to their new value. Opt-in from the view, because
     only some numbers are the thing the user just altered. */
  els=root.querySelectorAll("[data-count-to]");
  for(i=0;i<els.length;i++)countTo(els[i],els[i].getAttribute("data-count-to"));
}

var lastView="",lastSheet=null,lastEx=-2,lastSec=null;
/* A plan page's parts (Training: program, programs, exercises; Food: meal plan, targets,
   my foods): changing part slides the new one in from the side it is on, the way the
   week moves, rather than swapping in place (owner, 3 Nov: everything animated). The
   page itself arriving is a page change and has its own entrance. */
var SECS={t:["program","programs"],f:["plan","targets"]};
function secNow(){
  if(V.tab==="train"&&V.train==="plan"&&!S.active)return "t:"+(V.tplan||"program");
  if(V.tab==="food"&&V.fplan&&!V.smeal&&!V.pslot&&!V.pimport)return "f:"+V.fplan;
  return null;}
/* Before the page is redrawn: if a plan page's tab is about to change by a tap (a swipe
   moves its own), a still copy of the tab on show, and which way the new one comes. */
function sectionCopy(root,moved){
  var now=secNow(),was=lastSec;
  if(moved||V.pswiped||!now||!was||now===was||now[0]!==was[0]||isReduced())return null;
  var el=root.querySelector(".psec");if(!el||!el.animate)return null;
  var list=SECS[now[0]],dir=list.indexOf(now.slice(2))>list.indexOf(was.slice(2))?1:-1;
  if(document.documentElement.getAttribute("dir")==="rtl")dir=-dir;
  return {g:stillCopy(el),dir:dir};}
/* After it: the new tab and the copy of the old one travel together, the way a swipe does. */
function slideSection(root,moved,sc){
  var swiped=V.pswiped;lastSec=secNow();V.pswiped=false;
  if(!sc)return;
  var el=root.querySelector(".psec");if(!el){sc.g.remove();return;}
  slidePair(el,sc.g,(sc.dir*100)+"%",(-sc.dir*100)+"%",400,"cubic-bezier(0.22, 1, 0.36, 1)");}
/* Going one page deeper within a tab, or back up (owner, 3 Nov: slower and smooth, then
   "flashes … give the impression that the app is buggy"): the page you were on and the
   new one travel together, edge to edge, the new one in from the side it lies on, the old
   one out the other way — transform only (motion.js stillCopy, slidePair). Back plays it
   the other way round. A tab change keeps its own entrance; reduced motion has neither. */
var lastDepth=0,lastTab="",PG_MS=520,PG_EASE="cubic-bezier(0.25, 0.8, 0.25, 1)";
function pageMoveOf(moved,view){
  var d=navDepth(),dd=d-lastDepth,same=V.tab===lastTab;lastDepth=d;lastTab=V.tab;
  if(!moved||!same||!dd||isReduced()||V.assess||/\/(session|run)$/.test(view))return 0;
  return dd>0?1:-1;}
/* A page opened from a page, or back: the new one and a still copy of the old travel
   together. Each goes the screen's width and a little more, so in the slide's slow end
   what shows between them is ground, not the old page's edge (owner, 4 Nov: the Exercise
   Library "has the same old swiping issue"). And it waits, a quarter of a second at most,
   for the pictures it opens on: they are lazy, and a lazy picture on a page still off
   the screen is not fetched until it comes in, so each one appeared after the page had
   (the flash). */
var PG_GAP=40;
function pageMove(appEl,g,dir){
  var side=document.documentElement.getAttribute("dir")==="rtl"?-1:1,
      d=dir*side*((document.documentElement.clientWidth||window.innerWidth)+PG_GAP);
  var imgs=firstScreenImgs(appEl);
  appEl.classList.add("pgfront");
  var go=function(){if(go.done)return;go.done=true;appEl.style.transform="";
    slidePair(appEl,g,d+"px",(-d)+"px",PG_MS,PG_EASE,function(){appEl.classList.remove("pgfront");});};
  if(!imgs.length){go();return;}
  appEl.style.transform="translateX("+d+"px)";
  readyImgs(imgs,250).then(go);}
/* The pictures within the first screen of a page, asked for now rather than lazily. */
function firstScreenImgs(root){
  var h=window.innerHeight||800,out=[];
  root.querySelectorAll("img").forEach(function(im){
    var r=im.getBoundingClientRect();
    if(r.bottom>-50&&r.top<h+50&&r.width>0){if(im.loading==="lazy")im.loading="eager";out.push(im);}});
  return out;}
function readyImgs(imgs,cap){
  return Promise.race([
    Promise.all(imgs.map(function(im){return im.decode?im.decode().catch(function(){}):Promise.resolve();})),
    new Promise(function(r){setTimeout(r,cap);})]);}
/* Which picture a place stands on: Training's first page is home; a day about to be
   started is the workout's; planning a program is training's; Coach's sections are
   their own; the assessment is Coach's. */
function groundOf(){
  if(V.assess)return "coach";
  /* The workout stands on the same picture as planning your training, framed the same
     way (owner, 27 Oct); the warm-up carries
     its own in its card, so the ground stays clear while it is up. */
  if(V.tab==="train"&&S.active&&V.train!=="hub")return warmShown(S.active)?"":"training";
  if(V.tab==="train")return V.train==="day"||V.train==="preview"?"workout":V.train==="days"?"home":"training";
  /* The Coach page stands on Coach's own ground. */
  if(V.tab==="coach")return "coach";
  return V.tab;}
function dropSheetGhosts(){
  document.querySelectorAll(".sheetghost").forEach(function(g){g.remove();});}
function sheetLeave(sheetEl){
  var old=sheetEl.firstElementChild;
  if(!old||isReduced()||old.getAttribute("data-flung"))return;
  dropSheetGhosts();
  var g=old.cloneNode(true);
  g.classList.remove("entering");g.classList.add("sheetghost");
  g.removeAttribute("id");g.setAttribute("aria-hidden","true");
  g.querySelectorAll("[id]").forEach(function(x){x.removeAttribute("id");});
  var b=old.querySelector(".sheetbox"),gb=g.querySelector(".sheetbox");
  if(b&&gb)gb.scrollTop=b.scrollTop;
  sheetEl.parentNode.insertBefore(g,sheetEl.nextSibling);
  setTimeout(function(){g.remove();},420);}
function render(){
  if(syncWorkoutState())saveDB();
  applyLook();
  applyLang();
  /* Both routes into reduced motion, re-evaluated every render so the in-app toggle
     takes effect immediately rather than on the next load. */
  applyMotion(S.prefs&&S.prefs.anim===false);
  document.body.classList.toggle("noanim",S.prefs&&S.prefs.anim===false);
  document.body.classList.toggle("compact",!!(S.prefs&&S.prefs.compact));
  /* Home is gone (Training opens the app) and the plan check lives in Coach AI; an old
     route to either lands on its new place. */
  if(V.tab==="home"||!V.tab)V.tab="train";
  /* The plan check, asked for: Coach AI with every finding open. */
  if(V.pcheck){V.pcheck=false;V.tab="coach";V.advall=true;}
  /* The chat is a Coach screen; leaving Coach leaves it (back restores it from the trail). */
  if(V.tab!=="coach")V.chat=false;
  /* The conversation is the floating Coach's now (js/ui/coachfab.js): a route that
     still asks for the old chat screen (an answer asked from Food) opens the panel. */
  if(V.chat){V.chat=false;V.coach=V.coach||"compact";}
  /* Planning lives in its own tab now (owner, 3 Nov): Training's plan page and its
     builders under train/, Food's plan page and its meal screens under food/. */
  var view=V.assess?"assess":V.tab+"/"+(V.tab==="train"?(S.active?"session":S.run?"run":V.train)
    :V.tab==="food"?(V.smeal?"smeal":V.pslot?"pslot":V.pimport?"pimport":V.fplan?"plan":"")
    :V.tab==="coach"?"hub":"");
  var moved=view!==lastView;lastView=view;
  /* Note what has focus and where the caret sits before the rebuild destroys it.
     Restoring the caret to the end of the value, which is what this used to do,
     threw the cursor to the end of the word on every debounced keystroke. */
  var was=document.activeElement, wasId=was&&was.id?was.id:null, selS=null, selE=null;
  if(wasId&&was.setSelectionRange){
    try{selS=was.selectionStart;selE=was.selectionEnd;}catch(e){selS=null;}
  }
  /* How many things Coach AI has to say, counted once: the dock's dot and the bell at
     the top of Training both show it. */
  V.advice=adviceCount();
  var h="";
  if(V.assess)h=vAssess();
  /* A run in progress is the Training tab, as a workout is (js/ui/run.js). */
  else if(V.tab==="train"&&S.run&&!S.active)h=vRun();
  else if(V.tab==="train")h=vTrain();
  else if(V.tab==="coach")h=vCoach();
  else if(V.tab==="progress")h=vProgress();
  else if(V.tab==="food")h=vFood();
  else h=vProfile();
  if(!PERSIST)h='<div class="card" style="border-color:var(--accent)"><p class="tiny" style="margin:0">'
    +'This browser is blocking storage, so nothing will be saved. Open the hosted link in Safari or Chrome.</p></div>'+h;
  /* Not during a workout: that screen has one job, and nothing logged there is at risk. */
  var sw=storeWarning();
  if(sw&&!(V.tab==="train"&&S.active))
    h='<div class="warnbar" role="alert"><b>'+t(sw==="hist"?"Your workout history did not open":"Your food log did not open")+'</b>'
     +'<span>'+t("Nothing has been deleted; it is still on this phone. Close the app fully and open it again. Anything you log meanwhile is kept and joins it.")+'</span></div>'+h;
  /* Whether a surface is *appearing* or merely *changing* decides both how it is
     written and whether its entry animation runs. A rebuild is for the first case
     only; the second patches, so unchanged nodes — images, the focused field, an
     element mid-animation — are never destroyed and recreated. */
  /* Arabic: every figure is one left-to-right run (see i18n/bidi.js). */
  var rtl=S.prefs&&S.prefs.lang==="ar";
  if(rtl)h=isolateNums(h);
  var appEl=document.getElementById("app");
  /* Restarting the animation takes more than leaving the class on. #app itself is
     never replaced — only its children are — so on two tab changes in a row the class
     was already present, CSS saw no change, and pageIn did not fire. Tapping straight
     across the tab bar played no transition at all; it only reappeared after some
     same-tab render happened to clear the class. Removing it and forcing a reflow
     before re-adding is the standard way to replay a CSS animation. */
  appEl.classList.remove("pagein");
  /* The workout's cards glide to their new places, and one put away fades where it was
     (motion.js glideCards); a new screen is a page change and has its own entrance. */
  /* Not when the exercise itself changes: that is the pane's slide (exswipe.js), and
     the cards it brings are new ones, not the old ones moved. */
  var exNow=S.active?V.logIdx:-1,sameEx=exNow===lastEx;lastEx=exNow;
  var before=moved||!sameEx?null:snapCards(appEl);
  var pm=pageMoveOf(moved,view),ghost=pm?stillCopy(appEl):null,sc=sectionCopy(appEl,moved);
  if(moved)replace(appEl,h); else patch(appEl,h);
  glideCards(appEl,before);
  slideSection(appEl,moved,sc);
  if(ghost)pageMove(appEl,ghost,pm);
  /* A swipe between the dock's tabs brought the page in itself (exswipe.js). */
  else if(moved&&!V.tswiped){ void appEl.offsetWidth; appEl.classList.add("pagein"); }
  V.tswiped=false;
  bindExSwipe();
  bindMore(render);

  /* The live workout owns the screen, so the dock leaves while it is up. Its own ✕ is
     the way out: Save and exit lands on Train with the Resume card, where the dock is
     back. The page stops keeping room for the dock too (body.focus in index.html). */
  var focus=!V.assess&&V.tab==="train"&&((!!S.active&&V.train!=="hub")||(!!S.run&&!S.active));
  document.body.classList.toggle("focus",focus);
  /* The workout itself is flat: no ground, no drawing behind it (workout-spec.md). */
  document.body.classList.toggle("wkflat",focus&&!!S.active);
  /* The dock is built once and only its state changes after that — see dock.js. */
  syncDock(document.getElementById("nav"),V.tab,V.advice);
  /* The place's picture on the ground (js/ui/bgart.js); the assessment is Coach's. */
  syncBgArt(groundOf());
  ensureRunWatch();
  /* The page's guide, the first time it opens (js/ui/tour.js). */
  tourCheck();
  /* A workout under way, seen from another tab. */
  syncWbar();
  /* A new screen opens with the dock in view (see dock.js). */
  checkDock([V.tab,V.tab==="train"?(S.active?"session":V.train):"",V.previewId,V.dayId,V.meal,V.smeal,V.pslot,
    V.pimport,V.phist,V.chat].join("|"));

  /* The sheet animates in when it opens and never again. Replaying sheetIn on every
     render is what made tapping the favourite star look like the sheet was being
     dragged. #app has been gated this way for a while; this is the same rule. */
  var sheetEl=document.getElementById("sheet");
  var appearing=V.sheet&&V.sheet!==lastSheet;
  var sheetHtml=vSheet();
  if(rtl)sheetHtml=isolateNums(sheetHtml);
  /* A sheet put away slides down rather than vanishing: what is left of it moves out of
     #sheet into a still copy beside it, so nothing reads the closed sheet as open, and
     goes when the slide ends (owner, 3 Nov: taps on the plan "glitch and flash"). One
     already pulled off the screen by the finger has done its leaving (sheetdrag.js). */
  if(!V.sheet&&lastSheet)sheetLeave(sheetEl);
  else if(appearing)dropSheetGhosts();
  if(appearing||!V.sheet)replace(sheetEl,sheetHtml);
  else patch(sheetEl,sheetHtml);
  var boxEl=sheetEl.firstChild;
  if(boxEl&&boxEl.classList)boxEl.classList.toggle("entering",!!appearing);
  /* Owns its own container and rebuilds only when it is genuinely a different rest
     screen, so a repaint elsewhere cannot restart the ring. */
  syncRest();
  /* A sheet is modal, so hide the screen behind it from assistive tech and move
     focus into it the moment it opens. Sheets used to be invisible to both. */
  /* The floating Coach: the launcher where it may sit, the panel when it is open. */
  syncCoach();
  appEl.setAttribute("aria-hidden",V.sheet||V.coach?"true":"false");
  document.getElementById("nav").setAttribute("aria-hidden",V.sheet||focus?"true":"false");
  document.getElementById("wbar").setAttribute("aria-hidden",V.sheet?"true":"false");
  /* And stop it moving, for the same reason it is hidden from assistive tech: while
     a sheet is up, the screen behind is not something the user is operating. */
  lockScroll(V.sheet||V.coach);
  var opened=V.sheet&&V.sheet!==lastSheet;
  lastSheet=V.sheet;
  /* Only a rebuild can lose focus. On the patch path the field the user is typing in
     was never destroyed, so touching it here would be the caret bug reintroduced. */
  var rebuilt=moved||appearing||!V.sheet;
  var restored=!rebuilt&&!!wasId&&document.activeElement===was;
  if(!restored&&wasId){
    var back=document.getElementById(wasId);
    /* Never back into the screen behind an open sheet: that is how the library's
       search field kept the keyboard up over the exercise sheet. */
    if(back&&V.sheet&&!sheetEl.contains(back))back=null;
    if(back){
      if(back!==document.activeElement){
        try{back.focus({preventScroll:true});}catch(e){try{back.focus();}catch(e2){}}
      }
      if(selS!=null&&back.setSelectionRange){
        try{back.setSelectionRange(selS,selE);}catch(e){}
      }
      restored=true;
    }
  }
  /* The keyboard flag follows the focused element, not the focus events alone. A
     render that replaces the field being typed in destroys it without a focusout,
     which left "kb" on the body and the dock hidden on the next screen. */
  syncKeyboard();
  paintMotion(appEl,view);
  paintMotion(sheetEl,"sheet:"+(V.sheet||""));
  /* The live 3D figures: new ones start, kept ones carry on, gone ones let go of the
     graphics card (js/ui/mannequin.js). */
  syncMannequins();

  /* No search field is focused for you. Opening the picker with the keyboard already
     up hid half the list behind it before anything was typed; browsing by muscle
     needs no keyboard, and the field is one tap away. */
  if(appearing&&V.sheet){
    var ae=document.activeElement;
    if(ae&&ae!==document.body&&!sheetEl.contains(ae)&&ae.blur)ae.blur();}
  var av=document.getElementById("askv");
  if(!restored&&av&&document.activeElement!==av){av.focus();try{av.select();}catch(e){}}
  if(opened&&!restored&&!av){
    var sb=document.querySelector(".sheetbox");
    if(sb){sb.setAttribute("tabindex","-1");try{sb.focus({preventScroll:true});}catch(e){}}}
}


/* Whether a text field has focus — the one time the dock steps aside, because iOS lays
   a fixed bar out against the layout viewport and would float it over the keyboard.
   Pickers, checkboxes and file inputs raise no keyboard and leave it alone. */
function isTyping(el){
  if(!el||!el.matches)return false;
  if(el.matches("textarea,[contenteditable=true]"))return true;
  return el.matches("input")&&!el.matches("[type=checkbox],[type=radio],[type=range],[type=file],[type=button],[type=submit],[type=color]");
}
/* When the keyboard goes away the dock fades back in — right where a finger may be
   landing on the button that dismissed it (the ✓ of a set typed near the bottom of
   the screen). For a moment after it returns the dock lets taps through, so that tap
   reaches the button under it instead of a tab. */
var kbLeaveTimer=0;
function syncKeyboard(){
  var b=document.body,typing=isTyping(document.activeElement),was=b.classList.contains("kb");
  b.classList.toggle("kb",typing);
  if(was&&!typing){
    b.classList.add("kbleave");
    clearTimeout(kbLeaveTimer);
    kbLeaveTimer=setTimeout(function(){b.classList.remove("kbleave");},450);
  }
}

export {isTyping, render, syncKeyboard};

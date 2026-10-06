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
import {syncRest} from "./views/session.js";
import {PERSIST} from "../util.js";
import {lockScroll, syncWorkoutState, V} from "./view.js";
import {patch, replace} from "./patch.js";
import {checkDock, syncDock} from "./dock.js";
import {syncWbar} from "./wbar.js";
import {applyMotion, countTo, once} from "./motion.js";
import {applyLook} from "./theme.js";
import {bindExSwipe} from "./exswipe.js";
import {bindMore} from "./more.js";

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
  els=root.querySelectorAll(".empty,.setrow[data-k],.list .item[data-k],.bar");
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

var lastView="",lastSheet=null;
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
  if(V.pcheck){V.pcheck=false;V.tab="coach";V.csec="ai";V.advall=true;}
  /* The chat is a Coach screen; leaving Coach leaves it (back restores it from the trail). */
  if(V.tab!=="coach")V.chat=false;
  var view=V.assess?"assess":V.tab+"/"+(V.tab==="train"?(S.active?"session":V.train):V.tab==="coach"?(V.train!=="days"?V.train:V.pslot?"pslot":V.pimport?"pimport":V.smeal?"smeal":V.chat?"chat":"hub"):"");
  var moved=view!==lastView;lastView=view;
  /* Note what has focus and where the caret sits before the rebuild destroys it.
     Restoring the caret to the end of the value, which is what this used to do,
     threw the cursor to the end of the word on every debounced keystroke. */
  var was=document.activeElement, wasId=was&&was.id?was.id:null, selS=null, selE=null;
  if(wasId&&was.setSelectionRange){
    try{selS=was.selectionStart;selE=was.selectionEnd;}catch(e){selS=null;}
  }
  var h="";
  if(V.assess)h=vAssess();
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
  if(moved)replace(appEl,h); else patch(appEl,h);
  if(moved){ void appEl.offsetWidth; appEl.classList.add("pagein"); }
  bindExSwipe();
  bindMore(render);

  /* The dock is built once and only its state changes after that — see dock.js. */
  syncDock(document.getElementById("nav"),V.tab,adviceCount());
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
  if(appearing||!V.sheet)replace(sheetEl,sheetHtml);
  else patch(sheetEl,sheetHtml);
  var boxEl=sheetEl.firstChild;
  if(boxEl&&boxEl.classList)boxEl.classList.toggle("entering",!!appearing);
  /* Owns its own container and rebuilds only when it is genuinely a different rest
     screen, so a repaint elsewhere cannot restart the ring. */
  syncRest();
  /* A sheet is modal, so hide the screen behind it from assistive tech and move
     focus into it the moment it opens. Sheets used to be invisible to both. */
  appEl.setAttribute("aria-hidden",V.sheet?"true":"false");
  document.getElementById("nav").setAttribute("aria-hidden",V.sheet?"true":"false");
  document.getElementById("wbar").setAttribute("aria-hidden",V.sheet?"true":"false");
  /* And stop it moving, for the same reason it is hidden from assistive tech: while
     a sheet is up, the screen behind is not something the user is operating. */
  lockScroll(V.sheet);
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

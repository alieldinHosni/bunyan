/* Bunyan — render
   The single render entry point. */
import {t} from "../i18n/dict.js";
import {applyLang} from "../i18n/exnames.js";
import {vFood} from "./views/food.js";
import {vHome} from "./views/home.js";
import {vProfile} from "./views/profile.js";
import {vProgress} from "./views/progress.js";
import {vSheet} from "./sheets.js";
import {S} from "../state.js";
import {vTrain} from "./views/train.js";
import {syncRest} from "./views/session.js";
import {PERSIST} from "../util.js";
import {lockScroll, V} from "./view.js";
import {patch, replace} from "./patch.js";
import {applyMotion, countTo, once} from "./motion.js";

/* ============================================================ render */
/* The five tabs. The icons are the Bunyan design's own vectors, exported from Figma
   into icons/ and applied in CSS as masks — there is no path data here any more.
   The Material icons that stood in before are gone; the design names these
   activity, pie-chart and trending-up, not a dumbbell, a list and a bar chart. */
function TABSET(){return [
 ["home",t("Home")],
 ["train",t("Train")],
 ["food",t("Food")],
 ["progress",t("Progress")],
 ["profile",t("Profile")]];}

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
  document.documentElement.setAttribute("data-theme",S.theme);
  applyLang();
  /* Both routes into reduced motion, re-evaluated every render so the in-app toggle
     takes effect immediately rather than on the next load. */
  applyMotion(S.prefs&&S.prefs.anim===false);
  document.body.classList.toggle("noanim",S.prefs&&S.prefs.anim===false);
  document.body.classList.toggle("compact",!!(S.prefs&&S.prefs.compact));
  var view=V.tab+"/"+(V.tab==="train"?(S.active?"session":V.train):"");
  var moved=view!==lastView;lastView=view;
  /* Note what has focus and where the caret sits before the rebuild destroys it.
     Restoring the caret to the end of the value, which is what this used to do,
     threw the cursor to the end of the word on every debounced keystroke. */
  var was=document.activeElement, wasId=was&&was.id?was.id:null, selS=null, selE=null;
  if(wasId&&was.setSelectionRange){
    try{selS=was.selectionStart;selE=was.selectionEnd;}catch(e){selS=null;}
  }
  var h="";
  if(V.tab==="home")h=vHome();
  else if(V.tab==="train")h=vTrain();
  else if(V.tab==="progress")h=vProgress();
  else if(V.tab==="food")h=vFood();
  else h=vProfile();
  if(!PERSIST)h='<div class="card" style="border-color:var(--accent)"><p class="tiny" style="margin:0">'
    +'This browser is blocking storage, so nothing will be saved. Open the hosted link in Safari or Chrome.</p></div>'+h;
  /* Whether a surface is *appearing* or merely *changing* decides both how it is
     written and whether its entry animation runs. A rebuild is for the first case
     only; the second patches, so unchanged nodes — images, the focused field, an
     element mid-animation — are never destroyed and recreated. */
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

  var navEl=document.getElementById("nav");
  patch(navEl,TABSET().map(function(tb){
    return '<button data-k="'+tb[0]+'" data-tab="'+tb[0]+'"'+(V.tab===tb[0]?' class="on"':'')+'>'
     +'<span class="navico" aria-hidden="true"></span>'+tb[1]+'</button>';}).join(""));

  /* The sheet animates in when it opens and never again. Replaying sheetIn on every
     render is what made tapping the favourite star look like the sheet was being
     dragged. #app has been gated this way for a while; this is the same rule. */
  var sheetEl=document.getElementById("sheet");
  var appearing=V.sheet&&V.sheet!==lastSheet;
  var sheetHtml=vSheet();
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
  paintMotion(appEl,view);
  paintMotion(sheetEl,"sheet:"+(V.sheet||""));

  var q=document.getElementById("exq");
  if(!restored&&q){q.focus();try{q.setSelectionRange(q.value.length,q.value.length);}catch(e){}}
  var av=document.getElementById("askv");
  if(!restored&&av&&document.activeElement!==av){av.focus();try{av.select();}catch(e){}}
  if(opened&&!restored&&!q&&!av){
    var sb=document.querySelector(".sheetbox");
    if(sb){sb.setAttribute("tabindex","-1");try{sb.focus({preventScroll:true});}catch(e){}}}
}


export {render};

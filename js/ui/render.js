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
function TABSET(){return [
 ["home",t("Home"),'<path d="M3 10l9-7 9 7v10a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z"/>'],
 ["train",t("Train"),'<path d="M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12"/>'],
 ["progress",t("Progress"),'<path d="M3 17l5-6 4 4 5-7 4 5"/><path d="M3 21h18"/>'],
 ["food",t("Food"),'<path d="M6 3v8a3 3 0 003 3v7M6 3v5M9 3v5M18 3c-1.5 2-2 4-2 7h4V3z"/>'],
 ["profile",t("Profile"),'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>']];}

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
  appEl.classList.toggle("pagein",moved);
  if(moved)replace(appEl,h); else patch(appEl,h);

  var navEl=document.getElementById("nav");
  patch(navEl,TABSET().map(function(tb){
    return '<button data-k="'+tb[0]+'" data-tab="'+tb[0]+'"'+(V.tab===tb[0]?' class="on"':'')+'>'
     +'<svg viewBox="0 0 24 24">'+tb[2]+'</svg>'+tb[1]+'</button>';}).join(""));

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
  var q=document.getElementById("exq");
  if(!restored&&q){q.focus();try{q.setSelectionRange(q.value.length,q.value.length);}catch(e){}}
  var av=document.getElementById("askv");
  if(!restored&&av&&document.activeElement!==av){av.focus();try{av.select();}catch(e){}}
  if(opened&&!restored&&!q&&!av){
    var sb=document.querySelector(".sheetbox");
    if(sb){sb.setAttribute("tabindex","-1");try{sb.focus({preventScroll:true});}catch(e){}}}
}


export {render};

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
  var appEl=document.getElementById("app");
  appEl.classList.toggle("pagein",moved);
  appEl.innerHTML=h;
  document.getElementById("nav").innerHTML=TABSET().map(function(tb){
    return '<button data-tab="'+tb[0]+'"'+(V.tab===tb[0]?' class="on"':'')+'>'
     +'<svg viewBox="0 0 24 24">'+tb[2]+'</svg>'+tb[1]+'</button>';}).join("");
  document.getElementById("sheet").innerHTML=vSheet();
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
  /* Put the user back exactly where they were. Only if that fails do the
     open-the-sheet focus rules below get a say. */
  var restored=false;
  if(wasId){
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

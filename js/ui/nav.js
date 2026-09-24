/* Bunyan — nav
   One back path, shared by the in-app arrow and the browser's own back gesture.

   Every back affordance used to hardcode where it went: the session arrow went to
   Home, the train arrows went to the day list. That is why they behaved as home
   shortcuts wearing a back icon. Now they all call goBack() and nothing else knows
   a destination.

   The browser's history is the single source of truth. The arrow does not navigate
   itself — it calls history.back() and lets popstate do the work, so the arrow and
   the hardware gesture are the same code path rather than two that must be kept in
   step. See the note at the foot of this file. */

import {V} from "./view.js";
import {t} from "../i18n/dict.js";

/* Locations we can return to, oldest first. A location is a screen, not a sheet:
   sheets are modal and close before any of this is consulted. */
var STACK=[];
/* How many history entries are ours. Without this, a back from the root screen
   would walk out of the app. */
var DEPTH=0;
var H={};                       /* render, guard, closeSheet — wired by app.js */

function initNav(hooks){
  H=hooks||{};
  try{
    history.replaceState({bunyan:1},"");
    /* One spare entry, always, in front of wherever the user is. The browser's back
       gesture has to land on something; with nothing of ours to consume it walks out
       of the document, and coming back in reloads the app — splash and all, which is
       what "the swipe restarts the app" was. The spare is consumed by the gesture and
       pushed again immediately, so it is always there and never navigates anywhere.

       It is not nav depth and is never counted in DEPTH: the in-app controls below
       must not be able to spend it. */
    history.pushState({bunyan:1},"");
  }catch(e){}
}
function loc(){return {tab:V.tab,train:V.train,dayId:V.dayId,previewId:V.previewId,meal:V.meal};}
function apply(l){V.tab=l.tab;V.train=l.train;V.dayId=l.dayId;V.previewId=l.previewId;V.meal=l.meal||null;}
function rootOf(tab){return {tab:tab||"home",train:"days",dayId:null,previewId:null,meal:null};}

/* Call before mutating V for a genuine navigation: it records where you are now. */
function pushNav(){
  STACK.push(loc());
  DEPTH++;
  try{history.pushState({bunyan:1},"");}catch(e){}
}
/* A tab tap is not a navigation into depth — it is a change of place. Keeping the
   stack would let back walk through every tab the user had ever touched. */
function resetNav(){ STACK.length=0; }

function fallback(){
  if(STACK.length)apply(STACK.pop());
  else apply(rootOf(V.tab));
  if(H.render)H.render();
}
/* ---- the one predicate ------------------------------------------------------
   Back is available exactly where there is somewhere in-app to return to, and the
   screen is not one that holds it off. Both the gesture and the back arrows read
   this, so the rule "swipe-back is available if and only if a back arrow is shown"
   holds by construction rather than by keeping two lists in step.

   H.locked must be pure — this runs on every render. Telling the user why the
   gesture did nothing is H.onBlocked's job, and that only runs on a real attempt. */
function canBack(){
  if(V.sheet)return true;                    /* back closes the sheet */
  if(H.locked&&H.locked())return false;      /* a live workout: the ✕ is the way out */
  return STACK.length>0;
}
function repush(){ try{history.pushState({bunyan:1},"");}catch(e){} }
/* The back affordance itself, rendered here rather than in each view. That is what
   makes "the arrow and the gesture read the same state" true by construction: one
   canBack() decides both, and there is one arrow to keep right instead of six.

   Two shapes because the app has two — a bar above the content on the list screens,
   an icon in the header row on the two detail screens. The session's ✕ is neither:
   it is a close, it stays in session.js, and canBack() is false while it is on
   screen, which is exactly the rule. */
function backBar(){
  return canBack()
    ?'<button class="btn d sm" data-back="1" style="width:auto">‹ '+t("Back")+'</button>'
    :'';}
function backArrow(){
  return canBack()
    ?'<button class="icobtn back" data-back="1" aria-label="'+t("Back")+'">'
      +'<span class="ico ico-cleft" aria-hidden="true"></span></button>'
    :'';}
/* Set for the length of one back that an in-app control asked for, so the popstate it
   causes can be told apart from one the user's edge-swipe caused. Both arrive at the
   same listener; only the control's is allowed through the lock below. */
var viaControl=false;

function doBack(){
  /* A sheet is the top-most thing on screen, so it is what back closes first. It
     costs no history entry, so nothing is popped here. */
  if(V.sheet){ if(H.closeSheet)H.closeSheet(); return; }
  if(DEPTH>0){ history.back(); return; }   /* popstate finishes the job, guard included */
  if(H.guard&&H.guard(fallback))return;
  fallback();
}
/* The one entry point for the app's own controls — the session's ✕, the screen back
   arrows. The OS gesture does not come through here; it arrives at popstate directly,
   which is exactly what lets the lock tell the two apart. */
function goBack(){ viaControl=true; doBack(); }

window.addEventListener("popstate",function(){
  var byControl=viaControl; viaControl=false;
  if(V.sheet){
    /* The gesture was spent closing a sheet, so give the entry back. */
    if(H.closeSheet)H.closeSheet();
    repush();
    return;
  }
  /* The rule, in one place: a gesture is honoured exactly where a back arrow is
     shown. Everywhere else — a tab root with nothing behind it, a live workout — the
     entry is handed straight back and nothing else runs, so the swipe is a no-op
     rather than something that navigates or, at a root, leaves the app entirely.

     This is the most a page can do about the gesture itself. It belongs to the
     browser and no API cancels it; what is controllable is whether it lands anywhere.

     byControl exempts the app's own controls. The session's ✕ is a close, not a back
     arrow, so canBack() is false there and the gesture is held off — but the ✕ still
     has to work, and it does, because goBack() set the flag on its way in. */
  if(!byControl&&!canBack()){
    repush();
    if(H.onBlocked)H.onBlocked();
    return;
  }
  if(DEPTH>0)DEPTH--;
  /* An active workout is the one thing that asks before it is left behind. The
     guard re-runs doBack() itself once the user has decided. */
  if(H.guard&&H.guard(doBack)){
    DEPTH++;
    repush();
    return;
  }
  fallback();
});

/* ---- the gesture ----------------------------------------------------------
   There is deliberately no swipe handler here.

   Every view change pushes a same-document history entry, so Safari's own
   edge-swipe already has something in-document to go back to and fires popstate,
   which the handler above answers. A second, hand-written gesture on top of that
   ran alongside the native one rather than instead of it: two backs for one swipe,
   and on the root screen the native one walked out of the document entirely, which
   is what reloaded the app and replayed the intro.

   Letting the browser drive costs less code and gets the native rubber-band
   physics for free, and the arrow and the gesture are the same thing by
   construction rather than by keeping two implementations in step. */

export {backArrow, backBar, canBack, initNav, goBack, pushNav, resetNav};

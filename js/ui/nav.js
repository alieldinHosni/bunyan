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

/* Locations we can return to, oldest first. A location is a screen, not a sheet:
   sheets are modal and close before any of this is consulted. */
var STACK=[];
/* How many history entries are ours. Without this, a back from the root screen
   would walk out of the app. */
var DEPTH=0;
var H={};                       /* render, guard, closeSheet — wired by app.js */

function initNav(hooks){
  H=hooks||{};
  try{history.replaceState({bunyan:1},"");}catch(e){}
}
function loc(){return {tab:V.tab,train:V.train,dayId:V.dayId,previewId:V.previewId};}
function apply(l){V.tab=l.tab;V.train=l.train;V.dayId=l.dayId;V.previewId=l.previewId;}
function rootOf(tab){return {tab:tab||"home",train:"days",dayId:null,previewId:null};}

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
function doBack(){
  /* A sheet is the top-most thing on screen, so it is what back closes first. It
     costs no history entry, so nothing is popped here. */
  if(V.sheet){ if(H.closeSheet)H.closeSheet(); return; }
  if(DEPTH>0){ history.back(); return; }   /* popstate finishes the job, guard included */
  if(H.guard&&H.guard(fallback))return;
  fallback();
}
/* The one entry point. Arrow, swipe and OS gesture all land here. */
function goBack(){ doBack(); }

window.addEventListener("popstate",function(){
  if(V.sheet){
    /* The gesture was spent closing a sheet, so give the entry back. */
    if(H.closeSheet)H.closeSheet();
    try{history.pushState({bunyan:1},"");}catch(e){}
    return;
  }
  if(DEPTH>0)DEPTH--;
  /* An active workout is the one thing that asks before it is left behind. The
     guard re-runs doBack() itself once the user has decided. */
  if(H.guard&&H.guard(doBack)){
    DEPTH++;
    try{history.pushState({bunyan:1},"");}catch(e){}
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

export {initNav, goBack, pushNav, resetNav};

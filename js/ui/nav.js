/* Bunyan — nav
   One back path, shared by the arrow, the leading-edge swipe and the OS gesture.

   Every back affordance used to hardcode where it went: the session arrow went to
   Home, the train arrows went to the day list. That is why they behaved as home
   shortcuts wearing a back icon. Now they all call goBack() and nothing else knows
   a destination.

   The browser's history is the single source of truth for ordering. The arrow and
   the swipe do not navigate themselves — they call history.back() and let popstate
   do the work, so the three inputs cannot drift apart. */

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

/* ---- leading-edge swipe --------------------------------------------------- */
/* Leading, not left: in Arabic the app is mirrored and the gesture starts on the
   right. */
function rtl(){return document.documentElement.getAttribute("dir")==="rtl";}
/* A filter chip row scrolls sideways and starts near the screen edge, so a swipe
   beginning inside one belongs to it, not to us. */
function hScrollable(el){
  while(el&&el.nodeType===1&&el!==document.body){
    if(el.scrollWidth>el.clientWidth+2){
      var ov=getComputedStyle(el).overflowX;
      if(ov==="auto"||ov==="scroll")return true;
    }
    el=el.parentElement;
  }
  return false;
}
var sx=0,sy=0,armed=false,fired=false;
document.addEventListener("touchstart",function(ev){
  armed=false;
  if(!ev.touches||ev.touches.length!==1)return;
  var x=ev.touches[0].clientX,w=window.innerWidth||1;
  if(!(rtl()?x>w-24:x<24))return;
  if(hScrollable(ev.target))return;
  sx=x;sy=ev.touches[0].clientY;armed=true;fired=false;
},{passive:true});
document.addEventListener("touchmove",function(ev){
  if(!armed||fired||!ev.touches||ev.touches.length!==1)return;
  var dx=ev.touches[0].clientX-sx, dy=ev.touches[0].clientY-sy;
  /* A mostly-vertical drag is the page scrolling, not a back gesture. */
  if(Math.abs(dy)>Math.abs(dx)){armed=false;return;}
  if((rtl()?-dx:dx)>60){fired=true;armed=false;goBack();}
},{passive:true});
document.addEventListener("touchend",function(){armed=false;},{passive:true});

export {initNav, goBack, pushNav, resetNav};

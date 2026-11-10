/* Bunyan — one way a page moves
   Owner, 10 Nov: the motion worked from the dock and not from a swipe, the background
   blended on one page and not another, a page jumped as it landed. Each came from a route
   that moved pages in its own way: a tab tapped, a tab swiped, a plan page's tab tapped or
   swiped, a page opened or closed, the back swipe on the Home Screen. Each had its own
   duration, its own curve, its own idea of when the ground's picture changed and of what
   the page coming in showed while it moved.

   They all ask here now:
   - PAGE: the one duration and curve a page travels with. A tap gives it the whole
     duration; a finger that has already brought the page part of the way gives it what
     is left of it (gestureMs), never less than MIN_MS, so a flick is not a jump.
   - The page coming in is held at the first frame of its entrance while it moves
     (entranceAtStart for a copy of it, entranceHold for the real page drawn under a
     gesture) and plays it as it lands (entranceGo): the drawing draws in, the bars fill,
     the figures count, whichever way it came.
   - The ground's picture changes with the page, over the same time and curve
     (js/ui/bgart.js reads PAGE; under a finger it follows the finger: bgFollow). */
import {countTo, isReduced} from "./motion.js";

var PAGE={ms:520,ease:"cubic-bezier(0.22, 1, 0.36, 1)"};
var MIN_MS=260;
/* What is left of the travel when a finger let go at dx of a width w. */
function gestureMs(dx,w){
  w=w||1;return Math.max(MIN_MS,Math.min(PAGE.ms,Math.round((w-Math.abs(dx||0))/w*PAGE.ms)));}

/* What render.js animates as it appears, marked the same way on a copy. */
var ENTER=".empty,.setrow[data-k],.list .item[data-k],.bar,.sess [data-k]:not(input)";
function anims(el){return el&&el.getAnimations?el.getAnimations({subtree:true}):[];}
/* A copy of the page coming in (a swipe's peek), held at its entrance's first frame: the
   drawings undrawn, the bars empty, the chart lines undrawn, the figures at 0. */
function entranceAtStart(w){
  if(!w||isReduced())return;
  w.querySelectorAll(".art.draw").forEach(function(a){a.classList.add("go");});
  w.querySelectorAll(ENTER).forEach(function(e){e.setAttribute("data-anim","peek");});
  w.querySelectorAll("svg path.line").forEach(function(p){var len=0;try{len=p.getTotalLength();}catch(e){}
    if(len){p.style.strokeDasharray=len;p.style.strokeDashoffset=len;p.setAttribute("data-anim","peek");}});
  w.querySelectorAll("[data-count-to]").forEach(function(e){var dp=+e.getAttribute("data-count-dp")||0;
    e.textContent=dp?(0).toFixed(dp):"0";e.setAttribute("data-count","0");});
  anims(w).forEach(function(a){try{a.pause();a.currentTime=0;}catch(e){}});}
/* The real page, drawn under a gesture (the back swipe draws the page before under the
   finger): its entrance, already begun by the render, waits at its start for the landing. */
function entranceHold(el){
  if(!el||isReduced())return;
  anims(el).forEach(function(a){try{a.pause();a.currentTime=0;}catch(e){}});}
/* Landed: the entrance plays. counts: a copy's figures count up with it. */
function entranceGo(el,counts){
  if(!el||isReduced())return;
  anims(el).forEach(function(a){try{a.play();}catch(e){}});
  if(counts)el.querySelectorAll("[data-count-to]").forEach(function(e){var dp=+e.getAttribute("data-count-dp")||0;
    countTo(e,e.getAttribute("data-count-to"),dp?{format:function(v){return Number(v).toFixed(dp);}}:undefined);});}

export {entranceAtStart, entranceGo, entranceHold, gestureMs, PAGE};

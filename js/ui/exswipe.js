/* Bunyan — moving between a workout's exercises by swipe
   The exercise follows the finger left and right; let go past a third of the screen,
   or with a quick flick, and the next (or previous) one slides in. Short of that it
   springs back, so a nudge never changes the exercise.

   The rules that keep it from firing by mistake:
   - Direction is decided once per touch, after 10px of movement, and only a clearly
     sideways move (1.3 × more across than down) becomes a swipe. Everything else is a
     scroll, and stays one for the rest of that touch.
   - A touch that starts in a number field, or within 20px of either screen edge (the
     system's own back gesture), is never a swipe.
   - At the first and last exercise the pane resists and always springs back.
   - After a change there is a short pause before another swipe is read, so one fling
     cannot carry it two exercises.
   - The tap that ends a swipe never reaches the button under the finger.

   Direction follows the content: dragging it left brings in what is to the right —
   the next exercise in English, the previous one in Arabic. */
import {isReduced} from "./motion.js";

var H=null,st=null,lockUntil=0,swallowUntil=0;
var EDGE=20,SLOP=10,RATIO=1.3;

function rtl(){return document.documentElement.getAttribute("dir")==="rtl";}
/* The exercise a drag of dx moves to: +1 next, -1 previous. */
function stepOf(dx){var s=dx<0?1:-1;return rtl()?-s:s;}
function pane(){return document.querySelector("#app [data-exswipe]");}

function onStart(ev){
  st=null;
  if(!H||ev.touches.length!==1||Date.now()<lockUntil)return;
  var t0=ev.target,p=t0&&t0.closest&&t0.closest("[data-exswipe]");
  if(!p||t0.closest("input,textarea,select,[contenteditable]"))return;
  var tt=ev.touches[0];
  if(tt.clientX<EDGE||tt.clientX>window.innerWidth-EDGE)return;
  st={p:p,x:tt.clientX,y:tt.clientY,mode:null,dx:0,w:p.offsetWidth||window.innerWidth,
      samples:[[Date.now(),tt.clientX]]};}

function onMove(ev){
  if(!st)return;
  if(ev.touches.length!==1){cancel();return;}
  var tt=ev.touches[0],dx=tt.clientX-st.x,dy=tt.clientY-st.y;
  if(!st.mode){
    if(Math.abs(dx)<SLOP&&Math.abs(dy)<SLOP)return;
    st.mode=Math.abs(dx)>Math.abs(dy)*RATIO?"h":"v";
    if(st.mode==="v"){st=null;return;}
    /* Measured from here, so the pane does not jump by the slop. */
    st.x=tt.clientX;dx=0;}
  if(ev.cancelable)ev.preventDefault();
  st.dx=dx;
  st.samples.push([Date.now(),tt.clientX]);
  if(st.samples.length>6)st.samples.shift();
  var x=H.can(stepOf(dx))?dx:dx*0.3;
  st.p.style.transition="none";
  st.p.style.transform="translateX("+Math.round(x)+"px)";
  st.p.style.opacity=String(1-Math.min(.35,Math.abs(x)/st.w*.5));}

function springBack(p){
  if(isReduced()){p.style.transition="";p.style.transform="";p.style.opacity="";return;}
  p.style.transition="transform 220ms cubic-bezier(0.05,0.7,0.1,1),opacity 220ms ease";
  p.style.transform="";p.style.opacity="";}

function cancel(){var s=st;st=null;if(s&&s.mode==="h")springBack(s.p);}

function onEnd(){
  var s=st;st=null;
  if(!s||s.mode!=="h")return;
  swallowUntil=Date.now()+400;
  var step=stepOf(s.dx);
  /* Speed over the last moments of the drag, px/ms. */
  var a=s.samples[0],b=s.samples[s.samples.length-1],v=b[0]>a[0]?(b[1]-a[1])/(b[0]-a[0]):0;
  var far=Math.abs(s.dx)>s.w*0.3,flick=Math.abs(v)>0.45&&Math.abs(s.dx)>40&&(v<0)===(s.dx<0);
  if(!H.can(step)||!(far||flick)){springBack(s.p);return;}
  lockUntil=Date.now()+380;
  /* Dragged left, the old exercise leaves to the left and the new one comes in from
     the right; dragged right, the other way round. */
  var from=s.dx<0?1:-1;
  if(isReduced()){s.p.style.transition="";s.p.style.transform="";s.p.style.opacity="";H.go(step);return;}
  s.p.style.transition="transform 150ms cubic-bezier(0.3,0,0.8,0.15),opacity 150ms ease";
  s.p.style.transform="translateX("+(s.dx<0?-s.w:s.w)+"px)";
  s.p.style.opacity="0";
  setTimeout(function(){H.go(step);enter(from);},150);}

/* The new exercise arriving: from +1 the right, -1 the left. */
function enter(from){
  var p=pane();if(!p)return;
  if(isReduced()||!from){p.style.transition="";p.style.transform="";p.style.opacity="";return;}
  var w=p.offsetWidth||window.innerWidth;
  p.style.transition="none";
  p.style.transform="translateX("+Math.round(from*w*0.35)+"px)";
  p.style.opacity="0";
  void p.offsetWidth;
  p.style.transition="transform 240ms cubic-bezier(0.05,0.7,0.1,1),opacity 200ms ease";
  p.style.transform="";p.style.opacity="";}

/* Where an exercise change by step comes in from, on screen. */
function fromOf(step){return (rtl()?-1:1)*(step>0?1:-1);}

/* The one listener here that can stop a scroll — it has to, to keep a sideways drag
   from also scrolling the page — sits on the exercise pane alone. On the document it
   made every scroll in the app wait for script before it could start, on every tab.
   render() calls this after each paint; a pane already bound is left alone. */
function bindExSwipe(){
  var p=pane();
  if(p&&!p._exswipe){p._exswipe=true;p.addEventListener("touchmove",onMove,{passive:false});}}

function initExSwipe(hooks){
  H=hooks;
  document.addEventListener("touchstart",onStart,{passive:true});
  document.addEventListener("touchend",onEnd,{passive:true});
  document.addEventListener("touchcancel",cancel,{passive:true});
  document.addEventListener("click",function(ev){
    if(swallowUntil&&Date.now()<swallowUntil){swallowUntil=0;ev.preventDefault();ev.stopPropagation();}},true);}

export {bindExSwipe, enter, fromOf, initExSwipe};

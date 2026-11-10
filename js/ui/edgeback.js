/* Bunyan — the back swipe, drawn by the app (on the iPhone's Home Screen)
   Owner, 9 Nov: "When swiping back it shows a black page for a moment then gets to the
   previous page correctly. Need it smoother." On the Home Screen, Safari's own swipe had
   no picture of the page before to show under the finger, so it showed the bare ground
   until the swipe ended and the app drew the page. There the app makes no history
   entries (js/ui/nav.js OWN), so Safari's swipe never starts, and this draws it instead:

   - a finger that starts on the left edge's strip (.ebedge, the gutter's width) (the strip js/ui/exswipe.js leaves
     alone, so the two never both start) and moves right, on a page with a
     back arrow (nav.js canBack), takes the page;
   - the page you are on is frozen as a copy (motion.js stillCopy) and follows the finger;
     the real page before is drawn under it at once (nav.js peekBack), a third of the way
     in and shaded, and comes to rest as the finger goes, as iOS draws its own;
   - let go past COMMIT of the width, or flicked faster than FLICK, it lands on the page
     before; otherwise it springs back and the page you were on is drawn again
     (cancelPeek). A live workout has no back arrow, so it is never taken.

   Only in that mode: in a browser tab the browser's own swipe and back button stay.

   The touches are caught by that strip, whose
   touch-action keeps the browser from scrolling a touch that starts there, rather than
   by a page-wide listener that can stop a scroll: every other scroll never waits on
   script. A tap that lands on the strip is passed to what is under it. */
import {cancelPeek, commitPeek, ownBack, peekBack} from "./nav.js";
import {stillCopy} from "./motion.js";

var START=10,COMMIT=0.35,FLICK=0.5,PARALLAX=0.3,SHADE=0.28,SETTLE=260;
var EASE="cubic-bezier(0.25, 0.8, 0.25, 1)";
var g=null;   /* the gesture under way */

function width(){return document.documentElement.clientWidth||window.innerWidth||390;}
function place(p){
  var w=width();
  g.copy.style.transform="translateX("+Math.round(p*w)+"px)";
  g.app.style.transform="translateX("+Math.round(-(1-p)*PARALLAX*w)+"px)";
  g.shade.style.opacity=String((1-p)*SHADE);}
/* The page you are leaving moves as a whole page, not as glass over the one coming in:
   its own ground under its cards, the theme's and the picture it stood on (bgart.js),
   framed to the screen as they were. */
function ground(copy){
  var top=-(parseFloat(copy.style.top)||0),h=window.innerHeight||800;
  var pic=document.querySelector("#bgart .photo:last-child"),layer="";
  /* With the light of the sky the picture is under now (js/ui/sky.js): its filter, the
     night's blue over it and the veil and glow from its sky, as the ground shows them. */
  if(pic){var cs=getComputedStyle(pic),bf=getComputedStyle(pic,"::before"),af=getComputedStyle(pic,"::after");
    var q=function(x){return String(x).replace(/"/g,"'");};
    var box='position:absolute;left:0;right:0;top:'+top+'px;height:'+h+'px;pointer-events:none;';
    layer='<div aria-hidden="true" style="'+box+'z-index:-1;opacity:'+cs.opacity+';filter:'+q(cs.filter)+';-webkit-mask-image:'+q(cs.webkitMaskImage||cs.maskImage||"none")+';mask-image:'+q(cs.maskImage||cs.webkitMaskImage||"none")+'">'
      +'<div style="position:absolute;inset:0;background-image:'+q(cs.backgroundImage)+';background-size:'+cs.backgroundSize+';background-position:'+cs.backgroundPosition+';background-repeat:no-repeat"></div>'
      +(bf.content&&bf.content!=="none"?'<div style="position:absolute;inset:0;background:'+q(bf.backgroundColor)+';opacity:'+bf.opacity+'"></div>':'')
      +(af.content&&af.content!=="none"?'<div style="position:absolute;inset:0;background-image:'+q(af.backgroundImage)+'"></div>':'')+'</div>';}
  copy.style.background="var(--ground,var(--bg))";copy.style.backgroundAttachment="scroll";
  copy.style.minHeight=(top+h)+"px";copy.style.isolation="isolate";
  if(layer)copy.insertAdjacentHTML("afterbegin",layer);}
function begin(){
  var app=document.getElementById("app");if(!app)return false;
  /* The page you are on, frozen, above everything the page before will draw. */
  var copy=stillCopy(app,6);
  ground(copy);
  var cur=peekBack();
  if(!cur){copy.remove();return false;}
  var shade=document.createElement("div");
  shade.className="ebshade";shade.setAttribute("aria-hidden","true");
  document.body.appendChild(shade);
  copy.classList.add("ebcopy");
  document.documentElement.classList.add("pgmoving","ebmoving");
  g.copy=copy;g.app=app;g.shade=shade;g.cur=cur;g.on=true;
  place(0);
  return true;}
function finish(keep){
  var x=g;g=null;
  var w=width(),p=x.p||0,to=keep?1:0,ms=Math.max(140,Math.round(SETTLE*Math.abs(to-p)/0.6));
  [x.copy,x.app,x.shade].forEach(function(e){e.style.transition="transform "+ms+"ms "+EASE+",opacity "+ms+"ms "+EASE;});
  requestAnimationFrame(function(){
    x.copy.style.transform="translateX("+(keep?w:0)+"px)";
    x.app.style.transform="translateX("+(keep?0:Math.round(-PARALLAX*w))+"px)";
    x.shade.style.opacity=String(keep?0:SHADE);});
  var done=false,end=function(){if(done)return;done=true;
    if(keep)commitPeek();else cancelPeek(x.cur);
    x.copy.remove();x.shade.remove();
    x.app.style.transition="";x.app.style.transform="";
    document.documentElement.classList.remove("pgmoving","ebmoving");};
  x.copy.addEventListener("transitionend",end);setTimeout(end,ms+80);}

function onStart(ev){
  if(g||ev.touches.length!==1)return;
  var tch=ev.touches[0];
  g={x0:tch.clientX,y0:tch.clientY,on:false,p:0,t:[[tch.clientX,Date.now()]]};}
function onMove(ev){
  if(!g)return;
  var tch=ev.touches[0],dx=tch.clientX-g.x0,dy=tch.clientY-g.y0;
  if(!g.on){
    if(Math.abs(dx)>3||Math.abs(dy)>3)g.moved=true;
    if(Math.abs(dy)>START&&Math.abs(dy)>Math.abs(dx)){g=null;return;}
    if(dx<START)return;
    if(!begin()){g=null;return;}}
  g.p=Math.max(0,Math.min(1,dx/width()));
  g.moved=true;g.t.push([tch.clientX,Date.now()]);if(g.t.length>6)g.t.shift();
  place(g.p);}
function onEnd(){
  if(!g)return;
  if(!g.on){var x=g;g=null;
    if(!x.moved)passTap(x.x0,x.y0);
    return;}
  var a=g.t[0],b=g.t[g.t.length-1],v=(b[0]-a[0])/Math.max(1,b[1]-a[1]);
  finish(g.p>=COMMIT||(v>=FLICK&&g.p>0.08));}
function onCancel(){if(g&&g.on)finish(false);else g=null;}

var strip=null;
/* A tap on the strip (no drag): to what lies under it, as if the strip were not there. */
function passTap(x,y){
  strip.style.pointerEvents="none";var el=document.elementFromPoint(x,y);strip.style.pointerEvents="";
  if(!el)return;
  if(/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)){el.focus();return;}
  el.click();}
function initEdgeBack(){
  if(!ownBack()||strip)return;
  strip=document.createElement("div");strip.className="ebedge";strip.setAttribute("aria-hidden","true");
  document.body.appendChild(strip);
  strip.addEventListener("touchstart",onStart,{passive:true});
  strip.addEventListener("touchmove",onMove,{passive:true});
  strip.addEventListener("touchend",onEnd,{passive:true});
  strip.addEventListener("touchcancel",onCancel,{passive:true});}
export {initEdgeBack};

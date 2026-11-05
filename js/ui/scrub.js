/* Bunyan — reading a chart with a finger
   Progress's line charts carry their points (data-pts: across and down as shares of the
   drawing, the date, the value in words). Pressed and slid along, the nearest point is
   marked, with its date and value in a bubble above it, and a light tick each time the
   finger reaches another point (owner, 5 Nov: "charts can't be read precisely"). The chart
   lets a vertical drag scroll the page (touch-action: pan-y in index.html), so reading one
   never traps the page; it starts with a press held still, so a swipe across a chart is
   still a swipe. Nothing here re-renders: the marker is the chart's own child and
   goes with the next paint. */
import {tap} from "./view.js";

var cur=null;
function chartOf(el){return el&&el.closest?el.closest("[data-pts]"):null;}
function mark(f,x){
  var pts;try{pts=JSON.parse(f.getAttribute("data-pts"));}catch(e){return;}
  var svg=f.querySelector("svg");if(!pts||!pts.length||!svg)return;
  var r=svg.getBoundingClientRect(),fr=f.getBoundingClientRect();if(!r.width)return;
  var px=(x-r.left)/r.width*100,bi=0,bd=1e9;
  pts.forEach(function(p,i){var d=Math.abs(p[0]-px);if(d<bd){bd=d;bi=i;}});
  var p=pts[bi],m=f.querySelector(".pgscrub");
  if(!m){m=document.createElement("div");m.className="pgscrub";m.setAttribute("aria-hidden","true");
    m.innerHTML='<i class="pgscrub-l"></i><i class="pgscrub-p"></i><span class="pgscrub-b"><b></b><small></small></span>';f.appendChild(m);}
  var lx=r.left-fr.left+p[0]/100*r.width,ly=r.top-fr.top+p[1]/100*r.height;
  m.style.setProperty("--x",lx+"px");m.style.setProperty("--y",ly+"px");
  m.style.setProperty("--t",(r.top-fr.top)+"px");m.style.setProperty("--h",r.height+"px");
  var b=m.querySelector(".pgscrub-b");b.firstChild.textContent=p[3];b.lastChild.textContent=p[2];
  /* The bubble over the point, kept inside the chart at either end. */
  var bw=b.offsetWidth||0;b.style.left=Math.max(0,Math.min(fr.width-bw,lx-bw/2))+"px";
  if(cur&&cur.i!==bi){cur.i=bi;tap("light");}}
function end(){
  if(!cur)return;var f=cur.f,held=cur.held;clearTimeout(cur.tm);cur=null;
  f.classList.remove("scrubbing");document.documentElement.classList.remove("scrubbing");
  var m=f.querySelector(".pgscrub");if(!m)return;
  /* A tap leaves its point showing a moment; a reading ends with the finger. */
  setTimeout(function(){m.classList.add("out");setTimeout(function(){if(m.parentNode)m.remove();},220);},held?0:1600);}
/* A press held still for a moment starts the reading; a finger that moves first is a
   swipe or a scroll and is left alone (owner, 5 Nov: a swipe across a chart still has to
   change the tab). A quick tap marks the nearest point. */
var HOLD=220,SLOP=8;
function initScrub(){
  document.addEventListener("pointerdown",function(e){
    var f=chartOf(e.target);if(!f)return;
    if(cur)end();
    cur={f:f,i:-1,id:e.pointerId,x:e.clientX,y:e.clientY,held:false,moved:false};
    var c=cur;c.tm=setTimeout(function(){if(cur!==c||c.moved)return;c.held=true;
      f.classList.add("scrubbing");document.documentElement.classList.add("scrubbing");mark(f,c.x);},HOLD);},{passive:true});
  document.addEventListener("pointermove",function(e){if(!cur||e.pointerId!==cur.id)return;
    if(!cur.held){if(Math.abs(e.clientX-cur.x)>SLOP||Math.abs(e.clientY-cur.y)>SLOP){cur.moved=true;clearTimeout(cur.tm);cur=null;}return;}
    mark(cur.f,e.clientX);},{passive:true});
  document.addEventListener("pointerup",function(e){if(!cur||e.pointerId!==cur.id)return;
    if(!cur.held&&!cur.moved){clearTimeout(cur.tm);mark(cur.f,cur.x);}end();},{passive:true});
  document.addEventListener("pointercancel",function(e){if(cur&&e.pointerId===cur.id)end();},{passive:true});}

export {initScrub};

/* Bunyan — the coach's panel in the hand
   Three gestures on the conversation, each what a phone already teaches (owner, 27 Oct):

   - The panel's header dragged down: the panel follows the finger; let go far or fast
     enough and it gets smaller (the whole conversation → the compact panel) or, already
     compact, closes into its button. Short of that it springs back. Only the header is
     a grip, so scrolling the conversation never fights it.
   - "More" under an answer opens and closes by growing to its height, not by jumping.
   - A long press on an exchange offers Copy and Delete, in a small menu by the finger.
     The menu's buttons are ordinary taps (handlers/coach.js msgcopy, msgdel).

   Nothing here decides anything: closing, resizing and deleting go through the same
   code their buttons use. */
import {isReduced} from "./motion.js";
import {t} from "../i18n/dict.js";
import {esc} from "../util.js";

var resize=null;   /* (mode) → the panel's own resize or close, handed in by app.js */
function initChatGest(fn){resize=fn;}

/* ---- the header, dragged down ------------------------------------------------------ */
var drag=null;
document.addEventListener("touchstart",function(ev){
  if(!ev.touches||ev.touches.length!==1)return;
  var el=ev.target,head=el&&el.closest&&el.closest("#cpanel .cp-h");
  if(!head||el.closest("button"))return;
  var box=head.closest(".cp");if(!box)return;
  drag={box:box,y:ev.touches[0].clientY,dy:0,t:Date.now(),v:0,last:ev.touches[0].clientY,lt:Date.now()};
},{passive:true});
document.addEventListener("touchmove",function(ev){
  if(!drag)return;
  var y=ev.touches[0].clientY,now=Date.now();
  drag.dy=Math.max(0,y-drag.y);
  drag.v=(y-drag.last)/Math.max(1,now-drag.lt);drag.last=y;drag.lt=now;
  drag.box.style.transition="none";
  /* It gives a little as it goes, so the finger feels the weight. */
  drag.box.style.transform="translateY("+(drag.dy*0.85)+"px)";
},{passive:true});
function release(){
  var d=drag;drag=null;if(!d)return;
  var go=d.dy>90||(d.v>0.6&&d.dy>24);
  if(go&&resize){d.box.style.transition="";d.box.style.transform="";resize();return;}
  d.box.style.transition=isReduced()?"none":"transform var(--m-comp) var(--e-ios)";
  d.box.style.transform="";
  setTimeout(function(){d.box.style.transition="";},400);}
document.addEventListener("touchend",release,{passive:true});
document.addEventListener("touchcancel",function(){if(drag){drag.box.style.transform="";drag=null;}},{passive:true});

/* ---- More, grown open ---------------------------------------------------------------- */
document.addEventListener("click",function(ev){
  var sum=ev.target&&ev.target.closest&&ev.target.closest(".chat-more>summary");
  if(!sum||isReduced()||typeof sum.animate!=="function")return;
  var d=sum.parentNode;ev.preventDefault();
  if(d.dataset.moving)return;
  var from=d.offsetHeight,opening=!d.open;
  if(opening)d.open=true;
  var to=opening?d.scrollHeight:sum.offsetHeight;
  d.dataset.moving="1";d.style.overflow="hidden";
  var a=d.animate([{height:from+"px"},{height:to+"px"}],{duration:320,easing:"cubic-bezier(.2,.8,.2,1)"});
  a.onfinish=a.oncancel=function(){if(!opening)d.open=false;d.style.overflow="";delete d.dataset.moving;};
},true);

/* ---- a long press: Copy, Delete --------------------------------------------------------- */
var lp=null,swallow=0;
function closeMenu(){var m=document.getElementById("msgmenu");if(m)m.remove();}
document.addEventListener("touchstart",function(ev){
  if(!ev.touches||ev.touches.length!==1)return;
  var x=ev.target&&ev.target.closest&&ev.target.closest(".chat-x:not(.ro)");
  if(!x||ev.target.closest("button,a,summary,input"))return;
  var at=(x.getAttribute("data-k")||"").replace(/^x/,"");if(!at)return;
  var p=ev.touches[0];
  lp={x:p.clientX,y:p.clientY,at:at,el:x,timer:setTimeout(function(){openMenu(lp);},480)};
},{passive:true});
document.addEventListener("touchmove",function(ev){
  if(!lp)return;var p=ev.touches[0];
  if(Math.abs(p.clientX-lp.x)>10||Math.abs(p.clientY-lp.y)>10){clearTimeout(lp.timer);lp=null;}},{passive:true});
document.addEventListener("touchend",function(){if(lp){clearTimeout(lp.timer);lp=null;}},{passive:true});
function openMenu(o){
  if(!o)return;lp=null;closeMenu();swallow=Date.now()+600;
  var m=document.createElement("div");m.id="msgmenu";m.className="msgmenu";m.setAttribute("role","menu");
  m.innerHTML='<button role="menuitem" data-msgcopy="'+esc(o.at)+'">'+esc(t("Copy"))+'</button>'
    +'<button role="menuitem" class="d" data-msgdel="'+esc(o.at)+'">'+esc(t("Delete"))+'</button>';
  document.body.appendChild(m);
  var w=m.offsetWidth,h=m.offsetHeight;
  m.style.left=Math.max(12,Math.min(innerWidth-w-12,o.x-w/2))+"px";
  m.style.top=Math.max(12,o.y-h-16)+"px";
  o.el.classList.add("held");setTimeout(function(){o.el.classList.remove("held");},700);
  var b=m.querySelector("button");if(b)try{b.focus({preventScroll:true});}catch(e){}}
/* The tap the finger ends with after a long press is not a tap on the bubble; any other
   tap outside the menu closes it. */
document.addEventListener("click",function(ev){
  if(swallow&&Date.now()<swallow&&!(ev.target.closest&&ev.target.closest("#msgmenu"))){swallow=0;ev.preventDefault();ev.stopPropagation();return;}
  if(!(ev.target.closest&&ev.target.closest("#msgmenu")))closeMenu();
},true);
/* The message's text, for Copy: the question, then the answer as it reads. */
function msgText(at){
  var x=document.querySelector('.chat-x[data-k="x'+at+'"]');if(!x)return "";
  x.querySelectorAll(".chat-more").forEach(function(d){d.open=true;});
  var q=x.querySelector(".chat-q"),a=x.querySelector(".chat-a");
  return ((q?q.innerText.trim():"")+"\n\n"+(a?a.innerText.trim():"")).trim();}

export {closeMenu, initChatGest, msgText};

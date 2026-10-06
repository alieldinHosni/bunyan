/* Bunyan — dock
   The bottom navigation: a floating dock with one sliding active indicator.

   It is built once and then only updated. render() used to patch the whole bar on
   every state change, which is harmless for plain buttons but wrong for a shared
   indicator: the indicator has to be the same element from one tab to the next, or
   its transform has nothing to transition from. So the markup is written the first
   time and again only when the language changes the labels; every other render
   touches three things — the active class, aria-current and the --i index the
   indicator slides to.

   Position is CSS alone (see "The dock" in index.html). Nothing here moves the fixed
   bar; the one thing that moves is the dock inside it, out of the way on scroll (see
   "out of the way while reading" below). */
import {t} from "../i18n/dict.js";

/* Icons on one grid (22), one stroke, one cap. Home, activity, trending-up and user
   are the Bunyan Figma file's own vectors (they were icons/nav-*.svg); food is its
   pie chart with the dock reference's leaf set into the open quarter. Inline rather
   than masks, so the stroke itself can take the accent and thicken when active. */
var ICON={
  home:'<path d="M13.75 19.25v-7.33a.92.92 0 0 0-.92-.92H9.17a.92.92 0 0 0-.92.92v7.33M2.75 9.17a1.83 1.83 0 0 1 .65-1.4l6.42-5.5a1.83 1.83 0 0 1 2.36 0l6.42 5.5a1.83 1.83 0 0 1 .65 1.4v8.25a1.83 1.83 0 0 1-1.83 1.83H4.58a1.83 1.83 0 0 1-1.83-1.83z"/>',
  train:'<path d="M20.17 11h-2.28a1.83 1.83 0 0 0-1.77 1.34l-2.15 7.66a.23.23 0 0 1-.44 0L8.47 2a.23.23 0 0 0-.44 0L5.88 9.66A1.83 1.83 0 0 1 4.12 11H1.83"/>',
  food:'<path d="M11 2.4a8.6 8.6 0 1 0 8.6 8.6H11z"/><path d="M13.4 8.6c0-3.6 2.4-6 6.2-6 0 3.7-2.5 6-6.2 6z"/><path d="M13.4 8.6l3.2-3.2"/>',
  progress:'<path d="M20.17 11.92V6.42h-5.5m5.5 0-7.8 7.79-4.58-4.58-5.96 5.95"/>',
  /* A speech bubble with a spark: the coach that plans for you. */
  coach:'<path d="M4.58 2.75h12.84a1.83 1.83 0 0 1 1.83 1.83v9.17a1.83 1.83 0 0 1-1.83 1.83H9.17l-4.59 3.67v-3.67a1.83 1.83 0 0 1-1.83-1.83V4.58a1.83 1.83 0 0 1 1.83-1.83z"/><path d="M11 5.96l.92 2.37 2.37.92-2.37.92L11 12.54l-.92-2.37-2.37-.92 2.37-.92z"/>',
  profile:'<path d="M17.42 19.25v-1.83a3.67 3.67 0 0 0-3.67-3.67h-5.5a3.67 3.67 0 0 0-3.67 3.67v1.83M14.67 6.42a3.67 3.67 0 1 1-7.34 0 3.67 3.67 0 0 1 7.34 0z"/>'
};
/* id, what a screen reader announces. The names are the sections', not the icons'. */
function items(){return [
  ["train",t("Training")],["food",t("Food")],["coach",t("Coach")],
  ["progress",t("Progress")],["profile",t("Profile")]];}

var built=null;   /* the label set the markup was written with */

function build(el){
  var list=items();
  el.setAttribute("aria-label",t("Main navigation"));
  el.innerHTML='<div class="dock">'
   +'<span class="dock-ind" aria-hidden="true"></span>'
   +list.map(function(it){
     return '<button type="button" class="dock-b" data-tab="'+it[0]+'" aria-label="'+it[1]+'">'
      +'<svg viewBox="0 0 22 22" width="24" height="24" aria-hidden="true" focusable="false">'
      +ICON[it[0]]+'</svg></button>';}).join("")
   +'</div>';
  built=list.map(function(it){return it[1];}).join("|");
}

/* ---- out of the way while reading ------------------------------------------------
   Scrolling down slides the dock away and scrolling up brings it back.

   Each move is one CSS transition, handed to the compositor whole. It used to be a
   position written from script on every scroll event, and on a phone that lands a
   frame behind the page — the dock judders against the content it is meant to move
   with — and a layer pushed off the screen that way is repainted when it comes back,
   so its icons flicker in. A transition runs off the main thread: it is smooth however
   busy the page is, and the dock is never repainted while it moves.

   It still keeps the scroll's pace. The move is slower for a slow scroll and quicker
   for a flick (SLOW…QUICK ms), and it always eases out, so it never snaps. A change of
   mind half-way turns it round from where it is.

   When it moves:
   - Away once the page has gone AWAY px down in one go, past the first TOP px.
   - Back once it has come BACK px up in one go. A small reversal — a thumb adjusting,
     a flick settling — is not someone asking for the dock.

   These are short pages, not a feed, so:
   - The rubber band past either end is not scrolling: positions are clamped to the
     page, so the bounce at the bottom can never read as a scroll up.
   - Reaching the bottom does not bring it back. Only scrolling up does.
   - A page that gets shorter under the reader (a set deleted at the end) carries the
     position up with it. That is not a scroll up either.
   - A page with less than about a third of a screen to scroll keeps its dock. Hiding
     it there buys almost nothing and only makes it flicker.
   It is always there at the top of a page, on a new screen, and when focus moves into
   it.

   Only the dock inside <nav> moves, and the workout bar's pill, which drops into the
   dock's place rather than leaving, so a workout in progress stays one tap away. The
   fixed boxes themselves never move (see "The dock" in index.html). */
var TOP=56,AWAY=24,BACK=40,QUICK=300,SLOW=520;
var navEl=null,wbEl=null,away=false,travel=0,lastY=null,lastMax=0,acc=0,trail=[];
function measure(){
  var d=navEl&&navEl.firstChild;if(!d)return;
  var lift=parseFloat(getComputedStyle(navEl).paddingBottom)||12;
  /* Its height, the gap under it, and room for its shadow. */
  travel=d.offsetHeight+lift+24;}
function reducedMotion(){
  try{return document.body.classList.contains("noanim")||matchMedia("(prefers-reduced-motion: reduce)").matches;}
  catch(e){return false;}}
function maxScroll(){return Math.max(0,document.documentElement.scrollHeight-window.innerHeight);}
function tooShort(){return maxScroll()<Math.max(travel*2,window.innerHeight*.35);}
/* How fast the page is moving, px/ms, over about the last tenth of a second. */
function speed(){
  if(trail.length<2)return 0;
  var a=trail[0],b=trail[trail.length-1];
  return b[0]>a[0]?Math.abs(b[1]-a[1])/(b[0]-a[0]):0;}
/* A slow scroll (0.15 px/ms and under) gets the slow move, a flick (1.5 and over) the
   quick one, and everything between is in proportion. */
function paceFor(v){
  var k=Math.min(1,Math.max(0,(v-.15)/1.35));
  return Math.round(SLOW-(SLOW-QUICK)*k);}
function setAway(on,ms){
  if(away===on)return;
  away=on;
  var fade=reducedMotion();
  [navEl,wbEl].forEach(function(el){
    if(!el)return;
    /* Duration first, in the same style change as the class: a transition takes the
       timing of the style it is going to. */
    el.style.setProperty("--dt",(fade?150:ms||SLOW)+"ms");
    el.classList.toggle("dfade",fade);
    el.classList.toggle("dhid",on);});}
function showDock(){acc=0;setAway(false,paceFor(speed()));}
function onScroll(){
  /* A sheet pins the page (lockScroll), which reads as a jump to the top and, when it
     closes, back down again. Neither is the user scrolling. */
  if(document.body.style.position==="fixed"){lastY=null;return;}
  var max=maxScroll(),now=performance.now();
  /* Clamped: iOS reports positions past either end while the page bounces. */
  var y=Math.min(max,Math.max(0,window.pageYOffset||0));
  var shrank=max<lastMax&&y>=max-1;
  lastMax=max;
  if(lastY===null||shrank){lastY=y;acc=0;trail=[[now,y]];return;}
  var dy=y-lastY;
  if(!travel)measure();
  /* The first event of a new scroll is measured over one frame: the one before it
     belongs to the last scroll, however long ago that was. */
  if(!trail.length||now-trail[trail.length-1][0]>100)trail=[[now-16,lastY]];
  lastY=y;
  trail.push([now,y]);
  while(trail.length>2&&now-trail[0][0]>110)trail.shift();
  if(y<=TOP||tooShort()){showDock();return;}
  if(!dy)return;
  /* Distance in one direction; turning round starts the count again. */
  acc=(acc*dy>0?acc:0)+dy;
  if(!away&&acc>=AWAY)setAway(true,paceFor(speed()));
  else if(away&&acc<=-BACK)setAway(false,paceFor(speed()));}
function initDockScroll(){
  navEl=document.getElementById("nav");wbEl=document.getElementById("wbar");
  window.addEventListener("scroll",onScroll,{passive:true});
  /* Only re-measured: Safari fires resize as its toolbar collapses mid-scroll, and
     showing the dock then would bring it back while scrolling down. */
  window.addEventListener("resize",function(){measure();lastMax=maxScroll();});
  /* Keyboard and screen-reader users reach the dock by focus, not by scrolling. */
  if(navEl)navEl.addEventListener("focusin",showDock);}
/* After every render. A new screen — another tab, or a page inside one, like a day or
   the exercise library — always opens with the dock in view, and so does a page too
   short to be worth hiding it on. */
var lastScreen=null;
function checkDock(screen){
  var moved=lastScreen!==null&&screen!==lastScreen;
  lastScreen=screen;
  /* A new screen starts its own scroll: whatever position it lands on, or an event
     still in flight from the old one, is not the user scrolling it. */
  if(moved){lastY=null;acc=0;}
  if(!away)return;
  if(!travel)measure();
  if(moved||tooShort())showDock();}

/* The whole of what changes when the tab does. */
/* advice: how many things Coach AI has to say. A dot on Coach says there is
   something; the number is in its accessible name. */
function syncDock(el,tab,advice){
  if(!el)return;
  var list=items(),key=list.map(function(it){return it[1];}).join("|");
  if(built!==key||!el.firstChild)build(el);
  var idx=0,btns=el.querySelectorAll(".dock-b");
  for(var i=0;i<btns.length;i++){
    var id=btns[i].getAttribute("data-tab"),on=id===tab;
    if(on)idx=i;
    btns[i].classList.toggle("on",on);
    if(on)btns[i].setAttribute("aria-current","page");
    else btns[i].removeAttribute("aria-current");
    if(id==="coach"){
      var dot=!!advice;
      if(btns[i].classList.contains("advice")!==dot)btns[i].classList.toggle("advice",dot);
      var lbl=t("Coach")+(dot?", "+t(advice===1?"1 thing to look at":"{n} things to look at").replace("{n}",advice):"");
      if(btns[i].getAttribute("aria-label")!==lbl)btns[i].setAttribute("aria-label",lbl);}
  }
  var dock=el.firstChild;
  if(dock&&dock.style.getPropertyValue("--i")!==String(idx))dock.style.setProperty("--i",idx);
}

export {checkDock, initDockScroll, syncDock};

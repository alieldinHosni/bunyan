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
  profile:'<path d="M17.42 19.25v-1.83a3.67 3.67 0 0 0-3.67-3.67h-5.5a3.67 3.67 0 0 0-3.67 3.67v1.83M14.67 6.42a3.67 3.67 0 1 1-7.34 0 3.67 3.67 0 0 1 7.34 0z"/>'
};
/* id, what a screen reader announces. The names are the sections', not the icons'. */
function items(){return [
  ["home",t("Home")],["train",t("Training")],["food",t("Nutrition")],
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
   As in the feed apps, scrolling down slides the dock off the bottom with the
   content and scrolling up brings it back. It follows the finger, then settles fully
   in or fully out once the scroll stops. It is always there at the top of a page, at
   the bottom of one, on a new screen, and when focus moves into it.

   Only the dock inside <nav> moves, and only by the translate property, which the
   stylesheet scales by --dh (0 shown … 1 hidden) on nav and on the workout bar: the
   fixed boxes themselves never move (see "The dock" in index.html). The workout bar
   drops into the dock's place rather than leaving, so a workout in progress stays
   one tap away. */
var navEl=null,wbEl=null,hid=0,travel=0,lastY=null,dir=0,acc=0,settleT=0,frame=0;
var TOP=56;     /* scrolled less than this, the dock stays */
function measure(){
  var d=navEl&&navEl.firstChild;if(!d)return;
  var lift=parseFloat(getComputedStyle(navEl).paddingBottom)||12;
  /* Its height, the gap under it, and room for its shadow. */
  travel=d.offsetHeight+lift+24;}
function reducedMotion(){
  try{return document.body.classList.contains("noanim")||matchMedia("(prefers-reduced-motion: reduce)").matches;}
  catch(e){return false;}}
function paintHide(settle){
  var p=travel?Math.min(1,Math.max(0,hid/travel)):0,fade=reducedMotion();
  [navEl,wbEl].forEach(function(el){
    if(!el)return;
    el.classList.toggle("dsettle",!!settle);
    el.classList.toggle("dfade",fade);
    el.classList.toggle("dhid",p>=1);
    el.style.setProperty("--dh",String(Math.round(p*1000)/1000));});}
function showDock(){
  clearTimeout(settleT);
  if(hid===0)return;
  hid=0;paintHide(true);}
function settle(){
  if(!travel||hid===0||hid===travel)return;
  /* Finish the way it was going, unless it had barely started. */
  hid=dir>0?(hid>travel*.25?travel:0):(hid<travel*.75?0:travel);
  paintHide(true);}
function onScroll(){
  /* A sheet pins the page (lockScroll), which reads as a jump to the top and, when it
     closes, back down again. Neither is the user scrolling. */
  if(document.body.style.position==="fixed"){lastY=null;return;}
  var y=window.pageYOffset||0;
  if(lastY===null){lastY=y;return;}
  var dy=y-lastY;lastY=y;
  if(!travel)measure();
  var max=Math.max(0,document.documentElement.scrollHeight-window.innerHeight);
  if(y<=TOP||y>=max-4){showDock();return;}
  if(!dy)return;
  dir=dy>0?1:-1;
  clearTimeout(settleT);
  if(reducedMotion()){
    /* No sliding: it fades out going down and back in going up, once the scroll has
       gone far enough in one direction to mean it — a layout shift of a pixel or two
       is not a scroll. */
    acc=(acc*dir>0?acc:0)+dy;
    if(Math.abs(acc)<16)return;
    var to=dir>0?travel:0;
    if(hid!==to){hid=to;paintHide(true);}
    return;}
  var nh=Math.min(travel,Math.max(0,hid+dy));
  if(nh!==hid){
    hid=nh;
    if(!frame)frame=requestAnimationFrame(function(){frame=0;paintHide(false);});}
  settleT=setTimeout(settle,140);}
function initDockScroll(){
  navEl=document.getElementById("nav");wbEl=document.getElementById("wbar");
  window.addEventListener("scroll",onScroll,{passive:true});
  /* Only re-measured: Safari fires resize as its toolbar collapses mid-scroll, and
     showing the dock then would bring it back while scrolling down. */
  window.addEventListener("resize",measure);
  /* Keyboard and screen-reader users reach the dock by focus, not by scrolling. */
  if(navEl)navEl.addEventListener("focusin",showDock);}
/* After every render. A new screen — another tab, or a page inside one, like a day or
   the exercise library — always opens with the dock in view, and a page too short to
   scroll has nothing to make room for. */
var lastScreen=null;
function checkDock(screen){
  var moved=lastScreen!==null&&screen!==lastScreen;
  lastScreen=screen;
  /* A new screen starts its own scroll: whatever position it lands on, or an event
     still in flight from the old one, is not the user scrolling it. */
  if(moved)lastY=null;
  if(hid===0)return;
  var max=document.documentElement.scrollHeight-window.innerHeight;
  if(moved||max<=TOP)showDock();}

/* The whole of what changes when the tab does. */
function syncDock(el,tab){
  if(!el)return;
  var list=items(),key=list.map(function(it){return it[1];}).join("|");
  if(built!==key||!el.firstChild)build(el);
  var idx=0,btns=el.querySelectorAll(".dock-b");
  for(var i=0;i<btns.length;i++){
    var on=btns[i].getAttribute("data-tab")===tab;
    if(on)idx=i;
    btns[i].classList.toggle("on",on);
    if(on)btns[i].setAttribute("aria-current","page");
    else btns[i].removeAttribute("aria-current");
  }
  var dock=el.firstChild;
  if(dock&&dock.style.getPropertyValue("--i")!==String(idx))dock.style.setProperty("--i",idx);
}

export {checkDock, initDockScroll, syncDock};

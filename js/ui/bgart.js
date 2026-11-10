/* Bunyan — the ground's pictures
   Behind the glass, a picture for each place in the app: the owner's own photographs
   (img/page-*.jpg), one per place, each filling the screen's height and fading into
   the ground toward the dock. Home, training, workout, coach and progress are the
   owner's full photographs (27 Oct); warm-up, food and profile are cut from the owner's
   second sheet (27 Oct), its printed captions painted out:

     home       the mark carved in stone over the water (Training, the first page)
     training   the rack under the pergola (planning: the program, the library)
     workout    the bottle and towel on the step (a day, before Start workout)
     warmup     the banner by the steps (the warm-up's own header, js/ui/views/warmup.js)
     food       the bowl on the terrace (Food, and Coach's Nutrition)
     coach      the coach on the tablet (Coach AI, the chat, the assessment)
     progress   looking out over the bay (Progress)
     profile    the banner on the stone (Profile)

   They lie on the ground layer under everything else (#bgart in index.html), so the
   frosted cards show them softened, and the workout itself keeps a flat ground
   (workout-spec.md). Which picture is the CSS's (#bgart .photo[data-p]), so nothing here
   runs per frame or per theme. */
import {isReduced} from "./motion.js";
import {PAGE} from "./transit.js";

var PAGES={home:1,training:1,workout:1,warmup:1,food:1,coach:1,progress:1,profile:1};
var shown="";
/* The picture for a place, as markup. */
function bgArt(key){
  return PAGES[key]?'<div class="art photo bgart-'+key+'" data-p="'+key+'" aria-hidden="true"></div>':"";}
/* Called by every render: puts the place's picture on the ground when the place changes.
   It used to swap at once, which read as a flash behind a page sliding in (owner, 3 Nov:
   "flashes at some points … give the impression that the app is buggy"). Now the new
   picture is decoded first, then fades in over the old one as the old one fades out.
   Reduced motion, or nothing there yet: at once. */
/* Over the page's own time and curve (js/ui/transit.js), so the picture changes with the
   page that brings it, not after it. */
var FADE=PAGE.ms;
/* Held while a gesture shows the page before under the finger (js/ui/edgeback.js): the
   render that draws it says which picture it wants, and the gesture brings it in with
   the finger (bgFollow) instead of at once. */
var held=false,wanted=null;
function holdBg(on){held=!!on;if(!on)wanted=null;}
function bgWanted(){return wanted;}
function syncBgArt(key){
  if(held){wanted=key;return;}
  var el=document.getElementById("bgart");
  if(!el||key===shown)return;
  shown=key;el.setAttribute("data-page",key||"");
  var html=bgArt(key),old=[].slice.call(el.children);
  if(isReduced()||!old.length||!html||!el.animate){el.innerHTML=html;return;}
  /* A fade still under way is finished first: never more than two pictures. */
  old.slice(0,-1).forEach(function(o){o.remove();});
  var prev=old[old.length-1],box=document.createElement("div");box.innerHTML=html;
  var nw=box.firstElementChild;el.appendChild(nw);
  var to=getComputedStyle(nw).opacity,from=getComputedStyle(prev).opacity;
  nw.style.opacity="0";
  var go=function(){
    if(!nw.parentNode)return;
    var a=nw.animate([{opacity:0},{opacity:to}],{duration:FADE,easing:PAGE.ease,fill:"forwards"});
    prev.animate([{opacity:from},{opacity:0}],{duration:FADE,easing:"cubic-bezier(0.5, 0, 0.75, 0)",fill:"forwards"});
    a.onfinish=function(){if(prev.parentNode)prev.remove();nw.style.opacity="";a.cancel();};};
  var m=/url\(["']?([^"')]+)/.exec(getComputedStyle(nw).backgroundImage||"");
  if(!m){go();return;}
  var im=new Image();im.src=m[1];
  (im.decode?im.decode():Promise.resolve()).then(go,go);}
/* ---- with the finger ----------------------------------------------------------
   Owner, 10 Nov: swiping between the main tabs, only Coach's ground seemed to blend; the
   others changed after the page had landed (syncBgArt runs on the render that follows).
   Now the next tab's picture comes in under the swipe: bgFollow fades it in over the old
   one by the share of the screen the finger has brought the page, bgLand finishes the
   fade over the page's own landing time and makes it the shown one (so the render after
   does nothing), bgBack fades it out again with a page that springs back. */
var drag=null;
function bgFollow(key,f){
  var el=document.getElementById("bgart");if(!el||!PAGES[key]||isReduced())return;
  if(key===shown){return;}
  if(!drag||drag.key!==key){
    if(drag&&drag.nw.parentNode)drag.nw.remove();
    var old=[].slice.call(el.children);old.slice(0,-1).forEach(function(o){o.remove();});
    var prev=el.lastElementChild,box=document.createElement("div");box.innerHTML=bgArt(key);
    var nw=box.firstElementChild;el.appendChild(nw);
    var to=+getComputedStyle(nw).opacity||1,from=prev?(+getComputedStyle(prev).opacity||1):0;
    drag={key:key,nw:nw,prev:prev,to:to,from:from};}
  var k=Math.max(0,Math.min(1,f));
  drag.nw.style.opacity=String(drag.to*k);
  /* The old one goes slower than the new one comes, so the ground never shows through
     between them. */
  if(drag.prev)drag.prev.style.opacity=String(drag.from*(1-k*k));}
function bgLand(key,ms){
  var d=drag;drag=null;
  if(!d||d.key!==key){syncBgArt(key);return;}
  var el=document.getElementById("bgart");shown=key;if(el)el.setAttribute("data-page",key);
  var nw=d.nw,prev=d.prev,dur=ms||320;
  if(!nw.animate){nw.style.opacity="";if(prev)prev.remove();return;}
  var a=nw.animate([{opacity:nw.style.opacity||0},{opacity:d.to}],{duration:dur,easing:PAGE.ease,fill:"forwards"});
  if(prev)prev.animate([{opacity:prev.style.opacity||d.from},{opacity:0}],{duration:dur,easing:PAGE.ease,fill:"forwards"});
  a.onfinish=function(){nw.style.opacity="";a.cancel();if(prev&&prev.parentNode)prev.remove();};}
function bgBack(ms){
  var d=drag;drag=null;if(!d)return;
  var nw=d.nw,prev=d.prev,dur=ms||320;
  if(!nw.animate){nw.remove();if(prev)prev.style.opacity="";return;}
  var a=nw.animate([{opacity:nw.style.opacity||0},{opacity:0}],{duration:dur,fill:"forwards"});
  if(prev)prev.animate([{opacity:prev.style.opacity||d.from},{opacity:d.from}],{duration:dur,fill:"forwards"}).onfinish=function(){prev.style.opacity="";this.cancel();};
  a.onfinish=function(){if(nw.parentNode)nw.remove();};}
/* For the tests. */
function bgArtKey(){return shown;}
export {bgArt, bgBack, bgFollow, bgLand, bgWanted, holdBg, syncBgArt, bgArtKey};

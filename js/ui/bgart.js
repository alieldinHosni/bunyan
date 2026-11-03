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
var FADE=420;
function syncBgArt(key){
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
    var a=nw.animate([{opacity:0},{opacity:to}],{duration:FADE,easing:"ease-out",fill:"forwards"});
    prev.animate([{opacity:from},{opacity:0}],{duration:FADE,easing:"ease-in",fill:"forwards"});
    a.onfinish=function(){if(prev.parentNode)prev.remove();nw.style.opacity="";a.cancel();};};
  var m=/url\(["']?([^"')]+)/.exec(getComputedStyle(nw).backgroundImage||"");
  if(!m){go();return;}
  var im=new Image();im.src=m[1];
  (im.decode?im.decode():Promise.resolve()).then(go,go);}
/* For the tests. */
function bgArtKey(){return shown;}
export {bgArt, syncBgArt, bgArtKey};

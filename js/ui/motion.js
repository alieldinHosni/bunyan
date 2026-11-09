/* Bunyan — motion
   Every duration and easing in the app, in one place.
   Imports fmtN and num from util so a counted number and a static one are formatted
   by the same rule; motion.js carried a private copy of num() until now.

   Before this there were roughly thirty distinct timing values scattered through the
   stylesheet, most of them chosen once and never compared with anything. The point of
   a token set is not tidiness: it is that "component" means the same length of time
   whether it is a card, a list row or a sheet, so the app reads as one thing rather
   than as a set of screens that each decided for themselves.

   The tokens are written to custom properties on :root, so CSS consumes them directly
   and JS only has to know the names. */
import {fmtN, num} from "../util.js";

/* Durations are Base Web's timing scale, easings are Material 3's. That split is
   deliberate: Uber's scale is the coarser and more disciplined one — seven steps you
   can actually tell apart — while Material's emphasized curves carry more character
   than Base Web's, which are close to linear at the ends.

   Values are taken from the two sources rather than tuned by eye:
     baseweb/src/themes/shared/animation.ts
     material-web/tokens/versions/v0_192/_md-sys-motion.scss */
var DUR={
  press: 100,    /* baseweb timing100  — button and chip press */
  micro: 150,    /* baseweb timing150  — toggles, indicators */
  pop:   200,    /* baseweb timing200  — a set logged, a meal completed */
  comp:  250,    /* baseweb timing250  — cards, rows, list in and out */
  sheet: 300,    /* baseweb timing300  — sheet rise and backdrop */
  screen:300,    /* baseweb timing300  — tab and page changes */
  data:  400,    /* baseweb timing400  — rings, counters, bars */
  flow:  400,    /* baseweb timing400  — a card arriving on, or leaving, a screen in use:
                    the workout's rest, RPE and Next exercise, the chat's panel and rows.
                    Owner, 28 Oct: at 250 the RPE card "disappears", the eye cannot follow. */
  reveal:500     /* baseweb timing500  — chart draw-on, once per view */
};
var EASE={
  /* md-sys-motion easing-standard */
  standard:"cubic-bezier(0.2, 0, 0, 1)",
  /* md-sys-motion easing-emphasized-decelerate — things arriving */
  decel:   "cubic-bezier(0.05, 0.7, 0.1, 1)",
  /* md-sys-motion easing-emphasized-accelerate — things leaving */
  accel:   "cubic-bezier(0.3, 0, 0.8, 0.15)",
  /* The one exception to both systems. Neither Material nor Base Web overshoots, and
     for good reason, but a logged set is the single moment in this app that earns a
     touch of life. Used on two things and nothing else. */
  spring:  "cubic-bezier(.2,.9,.3,1.06)",
  /* The dock's glide, and everything that slides the way it does — a shared
     indicator moving between cells. Quick off the mark, long settle, no overshoot. */
  ios:     "cubic-bezier(0.22, 1, 0.36, 1)"
};
/* Opacity is treated separately under reduced motion: a hard cut between two screens
   is disorienting in its own way, so fades are shortened rather than removed. */
var FADE=200, FADE_REDUCED=100;

var _reduced=false;
function prefersReduced(){
  try{ return window.matchMedia("(prefers-reduced-motion:reduce)").matches; }
  catch(e){ return false; }
}
/* Both routes, as the brief requires: the OS setting and the in-app toggle. Either
   one alone is enough to turn movement off. */
function motionOff(appToggleOff){ return prefersReduced()||!!appToggleOff; }
function isReduced(){ return _reduced; }

/* Called at boot and again whenever the in-app toggle changes. Under reduced motion
   the movement tokens collapse to 1ms — not 0, because a zero-length transition never
   fires transitionend and the sheet dismiss listens for it. */
function applyMotion(appToggleOff){
  _reduced=motionOff(appToggleOff);
  var r=document.documentElement.style,k;
  for(k in DUR){
    if(!Object.prototype.hasOwnProperty.call(DUR,k))continue;
    r.setProperty("--m-"+k,(_reduced?1:DUR[k])+"ms");
  }
  r.setProperty("--m-fade",(_reduced?FADE_REDUCED:FADE)+"ms");
  for(k in EASE){
    if(!Object.prototype.hasOwnProperty.call(EASE,k))continue;
    r.setProperty("--e-"+k,EASE[k]);
  }
  document.documentElement.classList.toggle("reduced",_reduced);
}
/* For JS-driven motion, which needs the number rather than the property. */
function ms(name){ return _reduced?1:(DUR[name]||0); }

/* Counting a number up to its new value. Used only where the number itself is the
   thing that changed — a ring total, a day's calories, a finished workout's figures.
   Under reduced motion it sets the final value and returns, as the map specifies. */
function countTo(el,to,opts){
  if(!el)return;
  opts=opts||{};
  /* Grouped by default, and by the same function the views use. Having a private
     format here is what let the Food tab render "2,450 / 1950" — the counted half and
     the static half formatted by different rules. */
  var fmt=opts.format||fmtN;
  var from=num(el.getAttribute("data-count"),opts.from!=null?opts.from:0);
  to=num(to,0);
  el.setAttribute("data-count",to);
  if(_reduced||from===to){ el.textContent=fmt(to); return; }
  var dur=opts.ms||DUR.data, t0=0;
  /* One handle per element, so rapid changes replace rather than queue. */
  if(el._countRaf)cancelAnimationFrame(el._countRaf);
  function step(t){
    if(!t0)t0=t;
    var p=Math.min(1,(t-t0)/dur);
    /* Same deceleration as the CSS token, so JS and CSS motion agree. */
    var e=1-Math.pow(1-p,3);
    el.textContent=fmt(from+(to-from)*e);
    if(p<1)el._countRaf=requestAnimationFrame(step);
    else{el._countRaf=0;el.textContent=fmt(to);}
  }
  el._countRaf=requestAnimationFrame(step);
}

/* Play an element out, then do the thing that removes it.

   Anything leaving has to outlive the state change that removed it, or there is
   nothing left to animate. Deleting a set, dropping a food item, and a workout card that
   has done its job (the RPE question once answered, slow: the card is larger than a row).

   Under reduced motion, and if the element has gone, it calls straight through: the
   removal must happen whether or not the animation can. */
function leave(el,done,slow){
  if(!el||_reduced||!el.parentNode){ done(); return; }
  /* Freeze the measured height so the exit can collapse it and the rows below slide up
     instead of snapping. An auto height cannot be animated at all, and the usual
     max-height workaround either clips a tall row or spends the first part of the
     duration travelling through empty space on a short one. This costs one layout read
     on an element that is about to be destroyed. */
  el.style.height=el.getBoundingClientRect().height+"px";
  el.classList.add("rowout");
  if(slow)el.classList.add("slow");
  var fired=false;
  var go=function(){ if(fired)return; fired=true;
    el.removeEventListener("animationend",go);
    /* Drop the frozen height before the re-render. The patcher preserves style as a
       runtime attribute and matches nodes by key, so a reused row would otherwise
       inherit the pixel height of the row that just left. */
    el.style.height="";
    done(); };
  el.addEventListener("animationend",go);
  /* animationend does not arrive if the element is hidden or the animation is
     cancelled, and a row that never disappears is worse than one that vanishes. */
  /* Generous: the workout runs its own, slower durations (index.html, .sess), and a
     fallback that fires first cuts the last frames off. */
  setTimeout(go,(slow?DUR.flow:DUR.comp)+260);
}

/* Runs an entry animation exactly once per element, keyed by a name. The patcher keeps
   nodes alive across re-renders, so without this a "once per view" reveal would only
   ever fire on the very first paint — or, if keyed wrongly, on every one. */
function once(el,key,fn){
  if(!el)return;
  if(el.getAttribute("data-anim")===key)return;
  el.setAttribute("data-anim",key);
  if(_reduced)return;
  fn(el);
}


/* ---- the workout's cards moving as one surface (owner, 3 Nov: "the box with the reps
   and weight lags while it jumps upwards … everything streamlined, a little slow, never
   glitching").

   A re-render changes the layout in one frame: a card that appears or leaves pushes the
   ones below by its height, at once. snapCards() notes where each card is on screen
   before the change; glideCards() then starts every card that moved from where it was
   and lets it travel to where it now is (FLIP). A card that has gone (the rest put
   away) is put back as a ghost over its old place, out of the layout, and fades there,
   so nothing waits on it and nothing snaps when it finally goes.

   Cards are the workout's top-level keyed blocks: [data-k] inside .sess that are not
   inside another keyed block. Inputs are never moved. Positions are read with the
   transform in place, so a card caught mid-glide carries on from where it is seen. */
var GLIDE=440, GHOST=320;
var GLIDE_EASE="cubic-bezier(0.2, 0, 0, 1)";
function cardsOf(root){
  var out=[];if(!root)return out;
  root.querySelectorAll(".sess [data-k]:not(input)").forEach(function(el){
    var up=el.parentElement&&el.parentElement.closest("[data-k]");
    if(up&&root.contains(up))return;
    if(el.classList.contains("ghost"))return;
    out.push(el);});
  return out;}
function snapCards(root){
  if(_reduced)return null;
  var m={};cardsOf(root).forEach(function(el){var k=el.getAttribute("data-k");m[k]={el:el,r:el.getBoundingClientRect()};
    if(FOLDK[k]){m[k].up=el.parentElement;m[k].next=el.nextElementSibling;}});
  /* A card that may leave as a ghost is noted wherever it sits (the RPE question is
     inside the set card). */
  Object.keys(GHOSTK).forEach(function(k){if(m[k])return;var el=root.querySelector('.sess [data-k="'+k+'"]');
    if(el)m[k]={el:el,r:el.getBoundingClientRect(),inner:true};});
  return m;}
/* The keys whose cards may play out as ghosts when they go: those that stand alone. The
   log button turns into the next one in place and needs no ghost of the last. */
var GHOSTK={rest:1,rpeask:1};
/* Cards that fold away in the page's flow instead: put back where they were, they fade
   and close up, and the cards below follow their edge rather than gliding beneath them.
   The readiness question (owner, 4 Nov: Skip "bounces"; a ghost over the rising set
   list read as two things on top of each other). */
var FOLDK={ready:1};
function glideCards(root,before){
  if(!before||_reduced)return;
  Object.keys(FOLDK).forEach(function(k){
    var b=before[k];if(!b||b.el.isConnected||!b.up||!b.up.isConnected||root.querySelector('.sess [data-k="'+k+'"]'))return;
    foldAway(b.el,b.up,b.next&&b.next.parentElement===b.up?b.next:null,b.r.height);});
  var now=cardsOf(root);
  /* Stop any glide still running so the new layout is measured without it. */
  now.forEach(function(el){(el.getAnimations?el.getAnimations():[]).forEach(function(a){if(a.id==="glide")a.cancel();});});
  now.forEach(function(el){
    var k=el.getAttribute("data-k"),b=before[k];if(!b)return;
    var r=el.getBoundingClientRect(),dy=b.r.top-r.top,dh=b.r.height-r.height;
    if(!el.animate)return;
    if(Math.abs(dy)>=1){var a=el.animate([{transform:"translateY("+dy+"px)"},{transform:"translateY(0)"}],{duration:GLIDE,easing:GLIDE_EASE});a.id="glide";}
    /* A card that grew or shrank (a question added inside it, or answered) changes its
       height over the same time, its contents clipped to it, so its edge never jumps. */
    if(Math.abs(dh)>=1&&b.el===el){
      el.style.overflow="clip";
      var h=el.animate([{height:b.r.height+"px"},{height:r.height+"px"}],{duration:GLIDE,easing:GLIDE_EASE});h.id="glide";
      var done=function(){el.style.overflow="";};h.onfinish=done;h.oncancel=done;}});
  Object.keys(before).forEach(function(k){
    if(!GHOSTK[k]||root.querySelector('.sess [data-k="'+k+'"]'))return;
    var g=before[k].el,host=root.querySelector(".sess");
    if(!host||g.isConnected||!g.animate)return;
    var hr=host.getBoundingClientRect(),r=before[k].r;
    g.removeAttribute("data-k");g.removeAttribute("id");g.querySelectorAll("[id]").forEach(function(x){x.removeAttribute("id");});
    g.classList.add("ghost");g.classList.remove("rowout");g.setAttribute("aria-hidden","true");g.inert=true;
    g.style.cssText="position:absolute;margin:0;z-index:0;pointer-events:none;top:"+(r.top-hr.top)+"px;left:"+(r.left-hr.left)+"px;width:"+r.width+"px;height:"+r.height+"px";
    host.appendChild(g);
    var a=g.animate([{opacity:1,transform:"none"},{opacity:0,transform:"translateY(-8px) scale(.97)"}],{duration:GHOST,easing:"cubic-bezier(0.3, 0, 0.8, 0.15)",fill:"forwards"});
    var gone=function(){if(g.parentNode)g.parentNode.removeChild(g);};
    a.onfinish=gone;a.oncancel=gone;setTimeout(gone,GHOST+120);});}

function foldAway(g,up,next,h){
  g.removeAttribute("data-k");g.removeAttribute("id");g.querySelectorAll("[id]").forEach(function(x){x.removeAttribute("id");});
  g.classList.add("ghost");g.setAttribute("aria-hidden","true");g.inert=true;
  up.insertBefore(g,next);
  if(!g.animate){g.remove();return;}
  var ucs=getComputedStyle(up),gap=parseFloat(ucs.rowGap)||0;
  g.style.overflow="clip";g.style.pointerEvents="none";
  /* The gap the ghost's row adds closes with it. A grid row never shrinks below zero, so
     there the card below takes the negative margin (it pulls its row up); in a flex
     column the ghost's own margin does (owner, 6 Nov: the set card under the question
     glided, then snapped the last 12 px). */
  var grid=/grid/.test(ucs.display)&&next,nx=null;
  var a=g.animate([{height:h+"px",opacity:1,marginBottom:"0px"},{opacity:0,offset:.45},{height:"0px",opacity:0,marginBottom:(grid?0:-gap)+"px"}],
    {duration:GLIDE,easing:GLIDE_EASE,fill:"forwards"});
  if(grid&&next.animate)nx=next.animate([{marginTop:"0px"},{marginTop:(-gap)+"px"}],{duration:GLIDE,easing:GLIDE_EASE,fill:"forwards"});
  var gone=function(){if(g.parentNode)g.parentNode.removeChild(g);if(nx){nx.cancel();nx=null;}};
  a.onfinish=gone;a.oncancel=gone;setTimeout(gone,GLIDE+160);}

/* ---- the page keeps its place when a card leaves near its end ----------------------
   A card that goes shortens the page. Scrolled to the bottom, the browser then pulls the
   whole page down by that much in one frame, and everything above the card moves though
   nothing there changed (owner, 4 Nov: Skip on "How do you feel today?" scrolled down
   "bounces up in an odd way"). So the page keeps the room it had below the view, as an
   empty block after it, and gives it back only as the person scrolls up, where it is
   never seen to go. A new screen drops it (clearHold). */
var _hold=null,_holdOn=false;
function holdFit(){
  var sp=_hold;if(!sp||!sp.isConnected){clearHold();return;}
  var se=document.scrollingElement||document.documentElement;
  var content=se.scrollHeight-sp.offsetHeight,need=Math.max(0,Math.ceil(window.scrollY+window.innerHeight-content));
  if(need<1){clearHold();return;}
  sp.style.height=need+"px";}
function holdScroll(after,y0){
  if(!after||y0==null)return;
  var se=document.scrollingElement||document.documentElement;
  var cur=_hold&&_hold.isConnected?_hold.offsetHeight:0;
  var content=se.scrollHeight-cur,need=Math.max(0,Math.ceil(y0+window.innerHeight-content));
  if(need<1){clearHold();if(Math.abs(window.scrollY-y0)>=1&&y0<=se.scrollHeight-window.innerHeight)window.scrollTo(0,y0);return;}
  if(!_hold||!_hold.isConnected){_hold=document.createElement("div");_hold.className="phold";_hold.setAttribute("aria-hidden","true");}
  if(_hold.previousElementSibling!==after)after.after(_hold);
  _hold.style.height=need+"px";
  if(Math.abs(window.scrollY-y0)>=1)window.scrollTo(0,y0);
  if(!_holdOn){_holdOn=true;window.addEventListener("scroll",holdFit,{passive:true});}}
function clearHold(){
  if(_holdOn){_holdOn=false;window.removeEventListener("scroll",holdFit);}
  if(_hold&&_hold.parentNode)_hold.parentNode.removeChild(_hold);_hold=null;}

/* ---- a still copy, for things that leave as their replacement arrives ----------------
   A page, or a plan page's tab, about to be replaced is copied where it stands (fixed, out
   of reach, ids and pressed looks removed) so the old and the new can travel together,
   edge to edge. Transform only, never opacity: a fading parent switches off its frosted
   cards' blur for the length of the fade, which read as a flash (owner, 3 Nov). */
function stillCopy(el,z){
  var r=el.getBoundingClientRect(),g=el.cloneNode(true);
  g.querySelectorAll("[id]").forEach(function(e){e.removeAttribute("id");});
  g.classList.remove("tapd","pagein");g.querySelectorAll(".tapd").forEach(function(e){e.classList.remove("tapd");});
  g.classList.add("stillcopy");g.setAttribute("aria-hidden","true");g.inert=true;
  var cs=getComputedStyle(el);
  g.style.cssText="position:fixed;left:"+r.left+"px;top:"+r.top+"px;width:"+r.width+"px;margin:0;box-sizing:border-box;"
    +"padding:"+cs.padding+";pointer-events:none;transform:none;transition:none;opacity:1;z-index:"+(z||0);
  /* A part of the page is wrapped as the page, so the page's own styles (its frosted
     cards are styled under #app) still draw it exactly as it was. */
  if(el.id!=="app"&&el.closest("#app")){
    var w=document.createElement("div");w.id="app";w.className="stillcopy";w.setAttribute("aria-hidden","true");w.inert=true;
    w.style.cssText=g.style.cssText+";padding:0;max-width:none";g.classList.remove("stillcopy");g.style.cssText="margin:0;transform:none;transition:none;opacity:1";
    w.appendChild(g);document.body.appendChild(w);return w;}
  document.body.appendChild(g);
  return g;}
/* The new and the copy of the old, moving together: the new from `from` (a translateX
   value) to rest, the copy from rest to `to`. done runs once, however it ends. */
function slidePair(live,copy,from,to,ms,ease,done){
  document.documentElement.classList.add("pgmoving");
  /* The new page is held where it starts by its own style until the animation has it,
     and the animation holds where it ends until it is let go here. WebKit draws a
     frame between asking for an animation and starting it: without the hold the new
     page showed in its place for that frame, then jumped out to slide in (owner,
     4 Nov: the page before "flashes" on back). */
  live.style.transform="translateX("+from+")";
  var a=live.animate([{transform:"translateX("+from+")"},{transform:"none"}],{duration:ms,easing:ease,fill:"forwards"});
  var fin=false,end=function(){if(fin)return;fin=true;
    live.style.transform="";try{a.cancel();}catch(e){}
    if(copy.parentNode)copy.remove();
    if(!document.querySelector(".stillcopy"))document.documentElement.classList.remove("pgmoving");if(done)done();};
  copy.animate([{transform:"none"},{transform:"translateX("+to+")"}],{duration:ms,easing:ease,fill:"forwards"});
  a.onfinish=end;a.oncancel=end;setTimeout(end,ms+250);
  return a;}
export {applyMotion, clearHold, countTo, DUR, EASE, glideCards, holdScroll, isReduced, leave, motionOff, ms, once, slidePair, snapCards, stillCopy};

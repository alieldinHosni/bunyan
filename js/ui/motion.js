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
  spring:  "cubic-bezier(.2,.9,.3,1.06)"
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
   nothing left to animate. Two call sites use this — deleting a set and dropping a
   food item — which is what earns it a function rather than four inline lines.

   Under reduced motion, and if the element has gone, it calls straight through: the
   removal must happen whether or not the animation can. */
function leave(el,done){
  if(!el||_reduced||!el.parentNode){ done(); return; }
  /* Freeze the measured height so the exit can collapse it and the rows below slide up
     instead of snapping. An auto height cannot be animated at all, and the usual
     max-height workaround either clips a tall row or spends the first part of the
     duration travelling through empty space on a short one. This costs one layout read
     on an element that is about to be destroyed. */
  el.style.height=el.getBoundingClientRect().height+"px";
  el.classList.add("rowout");
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
  setTimeout(go,DUR.comp+60);
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

export {applyMotion, countTo, DUR, EASE, isReduced, leave, motionOff, ms, once};

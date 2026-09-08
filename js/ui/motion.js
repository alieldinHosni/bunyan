/* Bunyan — motion
   Every duration and easing in the app, in one place.

   Before this there were roughly thirty distinct timing values scattered through the
   stylesheet, most of them chosen once and never compared with anything. The point of
   a token set is not tidiness: it is that "component" means the same length of time
   whether it is a card, a list row or a sheet, so the app reads as one thing rather
   than as a set of screens that each decided for themselves.

   The tokens are written to custom properties on :root, so CSS consumes them directly
   and JS only has to know the names. */

var DUR={
  press:  90,    /* button and chip press — felt more than seen */
  micro: 150,    /* toggles, indicators, small state changes */
  pop:   180,    /* a set logged, a meal completed */
  comp:  240,    /* cards, rows, list insertion and removal */
  sheet: 280,    /* sheet rise and backdrop */
  screen:300,    /* tab and page changes */
  data:  420,    /* rings, counters, bars — the value that changed */
  reveal:460     /* chart draw-on, once per view */
};
var EASE={
  standard:"cubic-bezier(.2,.7,.3,1)",   /* most things */
  decel:   "cubic-bezier(.16,.84,.34,1)",/* things arriving */
  accel:   "cubic-bezier(.5,0,.9,.3)",   /* things leaving */
  spring:  "cubic-bezier(.2,.9,.3,1.06)" /* the only overshoot, and it is slight */
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
  var fmt=opts.format||function(v){return String(Math.round(v));};
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
function num(v,d){v=parseFloat(v);return isFinite(v)?v:(d||0);}

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

export {applyMotion, countTo, DUR, EASE, isReduced, motionOff, ms, once};

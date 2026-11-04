/* Bunyan — moving between a workout's exercises by swipe
   The exercise follows the finger left and right; let go past a third of the screen,
   or with a quick flick, and the next (or previous) one slides in. Short of that it
   springs back, so a nudge never changes the exercise.

   The rules that keep it from firing by mistake:
   - Direction is decided once per touch, after 10px of movement, and only a clearly
     sideways move (1.3 × more across than down) becomes a swipe. Everything else is a
     scroll, and stays one for the rest of that touch.
   - A touch that starts in a number field, or within 20px of either screen edge (the
     system's own back gesture), is never a swipe.
   - At the first and last exercise the pane resists and always springs back.
   - After a change there is a short pause before another swipe is read, so one fling
     cannot carry it two exercises.
   - The tap that ends a swipe never reaches the button under the finger.

   Direction follows the content: dragging it left brings in what is to the right —
   the next exercise in English, the previous one in Arabic.

   The plan pages' tabs move the same way (owner, 3 Nov: "navigate through these pages by
   swiping left and right as I am doing in the workout page"): a pane marked data-pswipe
   ("tplan" Training, "fplan" Food) is one tab; swiped, the next tab comes in. Those panes
   hold frosted cards, which lose their blur under a fading parent, so they travel the
   whole width instead of fading. A touch that starts in something that scrolls sideways
   (templates, pills) or on a grip is that thing's, not a swipe. */
import {isReduced} from "./motion.js";
import {tap} from "./view.js";

var H=null,st=null,lockUntil=0,swallowUntil=0;
var EDGE=20,SLOP=10,RATIO=1.3;

function rtl(){return document.documentElement.getAttribute("dir")==="rtl";}
/* The exercise a drag of dx moves to: +1 next, -1 previous. */
function stepOf(dx){var s=dx<0?1:-1;return rtl()?-s:s;}
var SEL="[data-exswipe],[data-pswipe]";
function pane(){return document.querySelector("#app [data-exswipe],#app [data-pswipe]");}
function kindOf(p){return p.getAttribute("data-pswipe")||"ex";}
/* Something between the touch and the pane that scrolls sideways keeps the touch. */
function sideScroller(el,p){
  for(var e=el;e&&e!==p;e=e.parentElement){
    if(e.scrollWidth>e.clientWidth+2){var o=getComputedStyle(e).overflowX;if(o==="auto"||o==="scroll")return true;}}
  return false;}

function onStart(ev){
  st=null;
  if(!H||ev.touches.length!==1||Date.now()<lockUntil)return;
  var t0=ev.target,p=t0&&t0.closest&&t0.closest(SEL);
  if(!p||t0.closest("input,textarea,select,[contenteditable],[data-grip]")||sideScroller(t0,p))return;
  var tt=ev.touches[0];
  if(tt.clientX<EDGE||tt.clientX>window.innerWidth-EDGE)return;
  /* A plan tab travels the whole screen, not its own width: by its own width the margin
     beside it was still on screen when the slide ended, and the old tab showed there for
     a moment before it went (owner, 4 Nov). */
  var k0=kindOf(p);
  st={p:p,k:k0,x:tt.clientX,y:tt.clientY,mode:null,dx:0,w:k0!=="ex"?(document.documentElement.clientWidth||window.innerWidth):(p.offsetWidth||window.innerWidth),
      samples:[[Date.now(),tt.clientX]]};}

function onMove(ev){
  if(!st)return;
  if(ev.touches.length!==1){cancel();return;}
  var tt=ev.touches[0],dx=tt.clientX-st.x,dy=tt.clientY-st.y;
  if(!st.mode){
    if(Math.abs(dx)<SLOP&&Math.abs(dy)<SLOP)return;
    st.mode=Math.abs(dx)>Math.abs(dy)*RATIO?"h":"v";
    if(st.mode==="v"){st=null;return;}
    /* Measured from here, so the pane does not jump by the slop. */
    st.x=tt.clientX;dx=0;}
  if(ev.cancelable)ev.preventDefault();
  st.dx=dx;
  st.samples.push([Date.now(),tt.clientX]);
  if(st.samples.length>6)st.samples.shift();
  var x=H.can(stepOf(dx),st.k)?dx:dx*0.3;
  /* A plan page: the highlight over its tabs moves with the finger, the same share of a
     tab as the page has moved of its width (owner, 3 Nov: it lagged behind the page). */
  if(st.k!=="ex"){segFollow(st,x);peekFollow(st,x);}
  st.p.style.transition="none";
  st.p.style.transform="translateX("+Math.round(x)+"px)";
  if(st.k==="ex")st.p.style.opacity=String(1-Math.min(.35,Math.abs(x)/st.w*.5));}

/* The tabs' highlight: where it was when the drag began, and where the drag has it now. */
function tabsOf(){return document.querySelector("#app .psecs");}
function segFollow(s,x){
  var g=tabsOf();if(!g)return;
  if(s.i0==null){s.g=g;s.i0=parseFloat(g.style.getPropertyValue("--i"))||0;s.n=parseFloat(g.style.getPropertyValue("--n"))||2;}
  var f=(rtl()?x:-x)/s.w;
  g.classList.add("drag");
  g.style.setProperty("--i",String(Math.max(-0.15,Math.min(s.n-0.85,s.i0+f))));}
function segSettle(s,to,ms){
  var g=s&&s.g;if(!g||s.i0==null)return;
  g.style.setProperty("--segdur",(ms||320)+"ms");
  g.classList.remove("drag");
  void g.offsetWidth;
  g.style.setProperty("--i",String(to));}
/* The tab next door, under the finger: drawn when the drag picks a direction (H.peek),
   placed beside the tab being dragged and moved with it, so the next tab slides in as
   the finger goes rather than empty ground. Turning back the other way swaps it. */
function peekFollow(s,x,toStep){
  /* A tap can name a tab further than next door (Meal plan straight to Daily goals). */
  var step=toStep||stepOf(x);
  if(!H.can(step,s.k)||!H.peek){peekDrop(s);return;}
  if(!s.nb||s.nbStep!==step){
    peekDrop(s);
    var w=takePeek(step,s.k);if(!w)return;
    if(!s.base){var t0=s.p.style.transform;s.p.style.transform="";s.base=s.p.getBoundingClientRect();s.p.style.transform=t0;
      /* Scrolled down this tab, the next one comes in from its own top, at the top of the
         screen, not from as far down it as this one was; landing puts the page there. */
      s.top=Math.max(s.base.top,safeTop()+12);}
    w.style.cssText="position:fixed;left:"+s.base.left+"px;top:"+s.top+"px;width:"+s.base.width+"px;margin:0;padding:0;max-width:none;pointer-events:none;z-index:0";
    w.style.transform="translateX("+Math.round(x+(x<0?s.w:-s.w))+"px)";
    document.body.appendChild(w);
    /* In the page the first card's top margin merges with the gap under the tabs; drawn
       on its own it does not, and the tab came in lower than it then landed: the page
       jumped up as it arrived (owner, 4 Nov: Programs, 12 px). Placed as the page will
       place it. */
    var fc=w.querySelector(".psec").firstElementChild,cur=s.p.firstElementChild,tabs=tabsOf(),
        mb=tabs?parseFloat(getComputedStyle(tabs).marginBottom)||0:0,
        mn=fc?parseFloat(getComputedStyle(fc).marginTop)||0:0,mc=cur?parseFloat(getComputedStyle(cur).marginTop)||0:0;
    if(fc)fc.style.marginTop="0px";
    w.style.top=(s.top+Math.max(mb,mn)-Math.max(mb,mc))+"px";
    s.nb=w;s.nbStep=step;}
  s.nb.style.transform="translateX("+Math.round(x+(x<0?s.w:-s.w))+"px)";}
/* The tabs next door, drawn ahead while nothing is happening (owner, 3 Nov: the swipe
   still caught). Drawing one meant laying out the whole page as it would be, and doing
   that as the finger began to move was the hitch at the start of every swipe. Made
   again after every paint, since what they show may have changed. */
var pre={},preT=0;
function buildPeek(step,k){
  var html=H.peek(step,k);if(html==null)return null;
  var w=document.createElement("div");w.id="app";w.className="stillcopy peek";w.setAttribute("aria-hidden","true");w.inert=true;
  var p=document.createElement("div");p.className="psec";p.innerHTML=html;
  p.querySelectorAll("[id]").forEach(function(e){e.removeAttribute("id");});
  /* Off the screen until the finger brings it, so a lazy picture would wait to load
     until it was already showing: asked for now. */
  p.querySelectorAll('img[loading="lazy"]').forEach(function(im){im.loading="eager";});
  w.appendChild(p);return w;}
function takePeek(step,k){
  var c=pre[step],w=c&&c.k===k?c.w:null;pre[step]=null;
  return w||buildPeek(step,k);}
function prepPeeks(){
  pre={};clearTimeout(preT);
  var p=pane();if(!p||!H||!H.peek)return;
  var k=kindOf(p);if(k==="ex")return;
  var idle=window.requestIdleCallback||function(f){return setTimeout(f,120);};
  preT=setTimeout(function(){idle(function(){
    if(st||pane()!==p)return;
    [-1,1].forEach(function(step){if(H.can(step,k)){var w=buildPeek(step,k);if(w)pre[step]={k:k,w:w};}});});},250);}
var _sat=null;
function safeTop(){
  if(_sat==null){var d=document.createElement("div");d.style.cssText="position:fixed;top:0;height:0;padding-top:env(safe-area-inset-top);visibility:hidden";
    document.body.appendChild(d);_sat=d.offsetHeight||0;d.remove();}
  return _sat;}
function peekDrop(s){if(s&&s.nb){s.nb.remove();s.nb=null;s.nbStep=0;}}
function springBack(p,s){
  if(s)segSettle(s,s.i0,320);
  /* The tab next door goes back where it came from with the dragged one. */
  if(s&&s.nb){var nb=s.nb;s.nb=null;
    if(isReduced()||!nb.animate)nb.remove();
    else{var a=nb.animate([{transform:nb.style.transform},{transform:"translateX("+(s.dx<0?s.w:-s.w)+"px)"}],{duration:320,easing:"cubic-bezier(0.2,0,0,1)",fill:"forwards"});
      a.onfinish=function(){nb.remove();};setTimeout(function(){if(nb.parentNode)nb.remove();},600);}}
  if(isReduced()){p.style.transition="";p.style.transform="";p.style.opacity="";return;}
  p.style.transition="transform 320ms cubic-bezier(0.2,0,0,1),opacity 320ms ease";
  p.style.transform="";p.style.opacity="";}

function cancel(){var s=st;st=null;if(s&&s.mode==="h")springBack(s.p,s);}

function onEnd(){
  var s=st;st=null;
  if(!s||s.mode!=="h")return;
  swallowUntil=Date.now()+400;
  var step=stepOf(s.dx);
  /* Speed over the last moments of the drag, px/ms. */
  var a=s.samples[0],b=s.samples[s.samples.length-1],v=b[0]>a[0]?(b[1]-a[1])/(b[0]-a[0]):0;
  var far=Math.abs(s.dx)>s.w*0.3,flick=Math.abs(v)>0.45&&Math.abs(s.dx)>40&&(v<0)===(s.dx<0);
  if(!H.can(step,s.k)||!(far||flick)){springBack(s.p,s);return;}
  lockUntil=Date.now()+380;
  /* The touch's own end: the one moment an iPhone allows the tick. */
  tap();
  /* Dragged left, the old exercise leaves to the left and the new one comes in from
     the right; dragged right, the other way round. */
  var from=s.dx<0?1:-1;
  if(isReduced()){peekDrop(s);s.p.style.transition="";s.p.style.transform="";s.p.style.opacity="";H.go(step,s.k);return;}
  if(s.k!=="ex"){slidePlan(s,step);return;}
  /* Unhurried both ways (owner, 3 Nov): out over 220 ms, in over 380 ms. */
  s.p.style.transition="transform 220ms cubic-bezier(0.4,0,1,1),opacity 220ms ease";
  s.p.style.transform="translateX("+(s.dx<0?-s.w:s.w)+"px)";
  s.p.style.opacity="0";
  setTimeout(function(){H.go(step);enter(from);},220);}

/* The new exercise arriving: from +1 the right, -1 the left. */
function enter(from){
  var p=pane();if(!p)return;
  if(isReduced()||!from){p.style.transition="";p.style.transform="";p.style.opacity="";return;}
  var w=p.offsetWidth||window.innerWidth;
  p.style.transition="none";
  p.style.transform="translateX("+Math.round(from*w*0.35)+"px)";
  p.style.opacity="0";
  void p.offsetWidth;
  p.style.transition="transform 380ms cubic-bezier(0.05,0.7,0.1,1),opacity 300ms ease";
  p.style.transform="";p.style.opacity="";}

/* A plan tab let go: the tab you dragged and the next one travel on together, edge to
   edge, from where the finger left them (a still copy of the old one goes out as the new
   one comes in; transform only, so the frosted cards never lose their blur), at the
   pace the rest of the width needs. The highlight over the tabs lands with them. If the
   page had been scrolled past its tabs, it eases back up to them once the tab is in. */
var SE="cubic-bezier(0.22, 1, 0.36, 1)";
function slidePlan(s,step){
  var w=s.w,dx=s.dx,ms=Math.max(260,Math.min(440,Math.round((w-Math.abs(dx))/w*440)));
  segSettle(s,(s.i0||0)+step,ms);
  /* The words change colour as the highlight arrives under them, not after it has. */
  if(s.g)s.g.querySelectorAll(".seg-b").forEach(function(b,i){b.classList.toggle("on",i===Math.round((s.i0||0)+step));});
  var nb=s.nb,p=s.p,out=dx<0?-w:w;s.nb=null;
  document.documentElement.classList.add("pgmoving");
  var fin=false,end=function(){if(fin)return;fin=true;
    /* The real tab is drawn now that nothing moves: exactly where the one that came in
       stands, so swapping one for the other cannot be seen. */
    H.go(step,s.k);
    var np=pane();
    [p,np].forEach(function(e){if(e){e.style.transition="none";e.style.transform="";e.style.opacity="";
      if(e.getAnimations)e.getAnimations().forEach(function(x){x.cancel();});}});
    /* The real tab exactly where the one that came in stands: if the page had been
       scrolled down the old tab, it is moved up to it in the same frame, unseen. Easing
       the page back up to the tabs afterwards was the jump (owner, 4 Nov). */
    if(np&&nb&&s.top!=null){var d=np.getBoundingClientRect().top-nb.getBoundingClientRect().top;if(Math.abs(d)>=1)window.scrollBy({top:d,behavior:"instant"});}
    if(nb)nb.remove();
    if(!document.querySelector(".stillcopy"))document.documentElement.classList.remove("pgmoving");};
  /* Both travel on together, edge to edge, from where the finger left them, transform
     only; nothing is drawn until they land. */
  var a=p.animate([{transform:"translateX("+dx+"px)"},{transform:"translateX("+out+"px)"}],{duration:ms,easing:SE,fill:"forwards"});
  if(nb)nb.animate([{transform:"translateX("+(dx+(dx<0?w:-w))+"px)"},{transform:"translateX(0px)"}],{duration:ms,easing:SE,fill:"forwards"});
  a.onfinish=end;a.oncancel=end;setTimeout(end,ms+250);}
/* A tap on a plan page's tab (or anything else there that names one, like the switch
   icon): the same slide as a swipe let go at the start, so the two cannot look different.
   Tapped, it used to be drawn first and then slid, with the old tab's copy only its own
   width away and the new one placed apart from the page (owner, 4 Nov: "the same old
   issue if I tap the word"). True when it took the change; false leaves it to the caller. */
function slideTab(k,to){
  var p=pane();if(!p||!H||!H.peek||isReduced()||st)return false;
  if(kindOf(p)!==k)return false;
  if(document.documentElement.classList.contains("pgmoving"))return true;
  var g=tabsOf();if(!g)return false;
  var bs=[].slice.call(g.querySelectorAll(".seg-b")),
      from=bs.findIndex(function(b){return b.classList.contains("on");}),
      dest=bs.findIndex(function(b){return b.getAttribute("data-"+k)===String(to);});
  var step=dest-from;if(from<0||dest<0||!step||!H.can(step,k))return false;
  var w=document.documentElement.clientWidth||window.innerWidth;
  var s={p:p,k:k,mode:"h",w:w,dx:0,g:g,i0:parseFloat(g.style.getPropertyValue("--i"))||from,n:bs.length};
  /* The sign a finger would have had for this step. */
  var x=(step>0?-1:1)*(rtl()?-1:1);
  peekFollow(s,x,step);
  if(!s.nb)return false;
  s.dx=x;lockUntil=Date.now()+460;
  slidePlan(s,step);
  return true;}

/* Where an exercise change by step comes in from, on screen. */
function fromOf(step){return (rtl()?-1:1)*(step>0?1:-1);}

/* The one listener here that can stop a scroll — it has to, to keep a sideways drag
   from also scrolling the page — sits on the exercise pane alone. On the document it
   made every scroll in the app wait for script before it could start, on every tab.
   render() calls this after each paint; a pane already bound is left alone. */
function bindExSwipe(){
  var p=pane();
  if(p&&!p._exswipe){p._exswipe=true;p.addEventListener("touchmove",onMove,{passive:false});}
  prepPeeks();}

function initExSwipe(hooks){
  H=hooks;
  document.addEventListener("touchstart",onStart,{passive:true});
  document.addEventListener("touchend",onEnd,{passive:true});
  document.addEventListener("touchcancel",cancel,{passive:true});
  document.addEventListener("click",function(ev){
    if(swallowUntil&&Date.now()<swallowUntil){swallowUntil=0;ev.preventDefault();ev.stopPropagation();}},true);}

export {bindExSwipe, enter, fromOf, initExSwipe, slideTab};

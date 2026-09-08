/* Bunyan — sheetdrag
   Drag the sheet header down to dismiss. The rounded top edge and the handle have
   always implied this; now they do it.

   Only the header is a drag surface. Making the whole sheet draggable would fight
   the scrolling inside it on every sheet long enough to scroll. */

var box=null, startY=0, dy=0, lastY=0, lastT=0, vel=0, on=false;
var closeFn=null;

function initSheetDrag(close){ closeFn=close; }

function reset(){
  if(box){box.classList.remove("dragging","settling");box.style.transform="";}
  box=null;on=false;dy=0;vel=0;
}

/* Where the sheet is sitting right now, mid-animation or not. Grabbing a sheet that
   is still springing back must continue from where it visually is, or the finger and
   the CSS fight over the same property and the sheet jumps. */
function currentY(b){
  var tr=getComputedStyle(b).transform;
  if(!tr||tr==="none")return 0;
  var m=tr.match(/matrix\(([^)]+)\)/);
  if(m)return parseFloat(m[1].split(",")[5])||0;
  var m3=tr.match(/matrix3d\(([^)]+)\)/);
  if(m3)return parseFloat(m3[1].split(",")[13])||0;
  return 0;
}

document.addEventListener("touchstart",function(ev){
  if(!ev.touches||ev.touches.length!==1)return;
  var el=ev.target;
  if(!el||!el.closest)return;
  var head=el.closest(".sheethead");
  if(!head)return;
  /* The close button is a control, not a grip. */
  if(el.closest("button"))return;
  var b=head.closest(".sheetbox");
  if(!b)return;
  box=b;on=true;vel=0;
  /* Freeze whatever transition is running and adopt its current offset. */
  var cur=currentY(b);
  /* Also drop the open animation's gate: a finger on the sheet outranks its entry. */
  var ov=b.parentNode;
  if(ov&&ov.classList)ov.classList.remove("entering");
  b.classList.remove("settling");
  b.classList.add("dragging");
  b.style.transform="translateY("+cur+"px)";
  dy=cur;
  startY=ev.touches[0].clientY-cur;
  lastY=ev.touches[0].clientY;
  lastT=Date.now();
},{passive:true});

document.addEventListener("touchmove",function(ev){
  if(!on||!box||!ev.touches||ev.touches.length!==1)return;
  var y=ev.touches[0].clientY;
  var now=Date.now(), dt=Math.max(1,now-lastT);
  vel=(y-lastY)/dt;                     /* px per ms, positive is downward */
  lastY=y;lastT=now;
  dy=y-startY;
  /* Upward drag resists and never grows the sheet: there is nothing above it. */
  if(dy<0)dy=Math.max(-56,dy*0.22);
  box.style.transform="translateY("+dy+"px)";
},{passive:true});

/* Decide once, then animate once. The two outcomes are mutually exclusive: running
   the spring-back and the dismiss together is what made a long drag travel back up
   and only then close. */
function end(){
  if(!on||!box)return;
  var b=box, moved=dy, v=vel;
  on=false; box=null;
  b.classList.remove("dragging");
  b.classList.add("settling");

  var far=moved>Math.max(90,b.offsetHeight*0.35);
  /* Velocity counts on its own. A flick from near the top travels almost nothing and
     should still dismiss — that is what a native sheet does. */
  var flung=v>0.55&&moved>10;

  if(far||flung){
    /* Always downward from where the finger left it. translateY(100%) is 100% of the
       sheet's own height, so a drag further than that animated *upwards* first. */
    var gap=window.innerHeight-b.getBoundingClientRect().top;
    b.style.transform="translateY("+(moved+Math.max(gap,0)+24)+"px)";
    once(b,function(){ reset(); if(closeFn)closeFn(); },340);
    return;
  }
  b.style.transform="translateY(0px)";   /* springs back, and never closes */
  once(b,function(){
    b.classList.remove("settling");
    b.style.transform="";
  },300);
  dy=0;vel=0;
}
/* transitionend is not guaranteed to arrive — an interrupted or zero-length
   transition never fires it — so every settle has a timeout behind it. */
function once(el,fn,ms){
  var done=false;
  var go=function(){ if(done)return; done=true;
    el.removeEventListener("transitionend",go); fn(); };
  el.addEventListener("transitionend",go);
  setTimeout(go,ms);
}
document.addEventListener("touchend",end,{passive:true});
document.addEventListener("touchcancel",function(){ if(box){box.style.transform="";} reset(); },{passive:true});

export {initSheetDrag};

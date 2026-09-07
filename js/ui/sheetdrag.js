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
  box=b;on=true;dy=0;vel=0;
  startY=lastY=ev.touches[0].clientY;
  lastT=Date.now();
  box.classList.add("dragging");
  box.classList.remove("settling");
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

function end(){
  if(!on||!box)return;
  var b=box, moved=dy, v=vel;
  on=false;
  b.classList.remove("dragging");
  b.classList.add("settling");
  var far=moved>Math.max(90,b.offsetHeight*0.35);
  var flung=v>0.6&&moved>40;            /* a quick flick counts even if it is short */
  if(far||flung){
    b.style.transform="translateY(100%)";
    var done=false;
    var finish=function(){
      if(done)return;done=true;
      b.removeEventListener("transitionend",finish);
      reset();
      if(closeFn)closeFn();
    };
    b.addEventListener("transitionend",finish);
    setTimeout(finish,320);             /* transitionend can be missed */
    box=null;
    return;
  }
  b.style.transform="";                 /* springs back */
  var clear=function(){b.classList.remove("settling");b.removeEventListener("transitionend",clear);};
  b.addEventListener("transitionend",clear);
  setTimeout(clear,300);
  box=null;dy=0;vel=0;
}
document.addEventListener("touchend",end,{passive:true});
document.addEventListener("touchcancel",function(){ if(box){box.style.transform="";} reset(); },{passive:true});

export {initSheetDrag};

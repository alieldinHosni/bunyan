/* Bunyan — press feedback that waits for a tap
   Buttons, rows and tiles answer a press: they dip, or an icon in them lights up. With
   :active that happens the instant a finger lands, and on a phone most fingers that
   land are starting a scroll — so every scroll began with whatever was under the
   thumb flashing its pressed look and snapping back. The icons blinked as you read.

   Native scroll views wait before showing a press, and so does this. On touch, the
   pressed look is the class .tapd, not :active (index.html writes every press rule
   both ways, with :active kept for a mouse and the keyboard):
   - it comes on HOLD ms after the finger lands, if the finger has not moved;
   - it never comes on if the finger moves more than SLOP px or the page scrolls
     first — that touch was a scroll, not a press;
   - a tap quicker than HOLD still shows it, briefly, as the finger lifts, so a tap
     never goes unanswered.
   It goes on everything the finger is on, from the element up, as :active does, so
   the rules read the same either way. */

var HOLD=90,SLOP=8,FLASH=120;
var root=document.documentElement,timer=0,lit=[],x0=0,y0=0,chain=null;

function light(){
  timer=0;if(!chain)return;
  lit=chain;
  for(var i=0;i<lit.length;i++)lit[i].classList.add("tapd");}
function unlight(){
  for(var i=0;i<lit.length;i++)lit[i].classList.remove("tapd");
  lit=[];}
function cancel(){
  if(timer){clearTimeout(timer);timer=0;}
  chain=null;unlight();}
/* The touched element and its ancestors, as :active would mark them. A disabled
   control takes no press. */
function chainOf(el){
  var out=[];
  for(;el&&el!==document.body&&el.nodeType===1;el=el.parentElement){
    if(el.disabled)return [];
    out.push(el);}
  return out;}

function onStart(ev){
  cancel();
  if(ev.touches.length!==1)return;
  var t=ev.touches[0];
  x0=t.clientX;y0=t.clientY;
  chain=chainOf(ev.target);
  if(chain.length)timer=setTimeout(light,HOLD);}
function onMove(ev){
  if(!chain&&!lit.length)return;
  var t=ev.touches[0];
  if(!t||Math.abs(t.clientX-x0)>SLOP||Math.abs(t.clientY-y0)>SLOP)cancel();}
function onEnd(){
  if(timer){
    /* A quick tap: answer it as the finger lifts. */
    clearTimeout(timer);light();
    var was=lit;lit=[];chain=null;
    setTimeout(function(){for(var i=0;i<was.length;i++)was[i].classList.remove("tapd");},FLASH);
    return;}
  chain=null;unlight();}

function initPress(){
  /* Press rules use :active only until a finger is seen; from then on .tapd. A mouse
     brings :active back, for a laptop with a touch screen. */
  document.addEventListener("pointerdown",function(ev){
    root.classList.toggle("tch",ev.pointerType==="touch");},{passive:true,capture:true});
  document.addEventListener("touchstart",function(ev){root.classList.add("tch");onStart(ev);},{passive:true,capture:true});
  document.addEventListener("touchmove",onMove,{passive:true,capture:true});
  document.addEventListener("touchend",onEnd,{passive:true,capture:true});
  document.addEventListener("touchcancel",cancel,{passive:true,capture:true});
  /* Any scroll — the page, a sheet, a sideways row — means the touch was not a press. */
  document.addEventListener("scroll",function(){if(chain||lit.length)cancel();},{passive:true,capture:true});}

export {initPress};

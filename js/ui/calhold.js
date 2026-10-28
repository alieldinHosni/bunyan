/* Bunyan — the training calendar, held open
   A press held on Training's week (owner, 28 Oct: "tap on it and hold to see the whole
   calendar") opens it into the month, and held on the month folds it back: the same as
   the ⌄ in its header (handlers/train.js toggleCal), which stays for anyone who does not
   hold, and for a screen reader.

   Held means HOLD ms without moving more than SLOP px: a finger that moves is scrolling
   the page or the week. The tap the finger ends with is not a tap on the day under it,
   so it is swallowed. */
var HOLD=480,SLOP=10;
var hold=null,swallow=0,onHold=function(){};

function initCalHold(fn){onHold=fn;}

document.addEventListener("pointerdown",function(ev){
  if(ev.button>0)return;
  var el=ev.target,cal=el&&el.closest&&el.closest(".twk.cal");
  /* Its own buttons in the header (Today, ⌄, a month either side) are taps only. */
  if(!cal||el.closest(".twk-h,.twk-mh"))return;
  clearTimeout(hold&&hold.timer);
  hold={x:ev.clientX,y:ev.clientY,timer:setTimeout(function(){
    hold=null;swallow=Date.now()+700;cal.classList.add("held");
    setTimeout(function(){cal.classList.remove("held");},400);
    onHold();},HOLD)};
},{passive:true});
document.addEventListener("pointermove",function(ev){
  if(!hold)return;
  if(Math.abs(ev.clientX-hold.x)>SLOP||Math.abs(ev.clientY-hold.y)>SLOP){clearTimeout(hold.timer);hold=null;}
},{passive:true});
function cancel(){if(hold){clearTimeout(hold.timer);hold=null;}}
document.addEventListener("pointerup",cancel,{passive:true});
document.addEventListener("pointercancel",cancel,{passive:true});
document.addEventListener("click",function(ev){
  if(swallow&&Date.now()<swallow){swallow=0;ev.preventDefault();ev.stopPropagation();}
},true);
/* The phone's own long-press menu (copy, look up) is not what a hold here asks for. */
document.addEventListener("contextmenu",function(ev){
  if(ev.target&&ev.target.closest&&ev.target.closest(".twk.cal"))ev.preventDefault();
});

export {initCalHold};

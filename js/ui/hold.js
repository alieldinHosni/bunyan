/* Bunyan — a hold, counted down where it is listed
   A stretch or a timed drill in the warm-up or the cool-down starts its own count
   with a tap on its time. One runs at a time; starting another stops the first.
   A hold done on each side counts the first side, says "Other side" with a tick
   and a buzz, then counts the second. When it ends, it is ticked off.

   The count is painted straight into the row ([data-holdt="<key>"]) a few times a
   second, so a running hold costs no renders. A render in the middle redraws the
   row from holdState(), so it carries on from where it was. */
import {play, tap} from "./view.js";
import {t} from "../i18n/dict.js";

var H=null;

function holdState(key){
  if(!H||H.key!==key)return null;
  var left=Math.max(0,(H.end-Date.now())/1000);
  return {left:Math.ceil(left),p:1-left/H.total,half:H.half,second:H.half>0&&left<=H.half};}

/* "30 s", "4:00". */
function fmt(s){return s>=60?Math.floor(s/60)+":"+String(s%60).padStart(2,"0"):s+" "+t("s");}
/* The label a row shows: its time, or the count while it runs. */
function holdLabel(key,secs){
  var s=holdState(key);
  if(!s)return fmt(secs);
  /* Each side counts down its own half. */
  return s.second?t("Other side")+" · "+fmt(s.left):fmt(s.half?s.left-s.half:s.left);}

function paint(){
  if(!H)return;
  var s=holdState(H.key);
  if(s.second&&!H.switched){H.switched=true;play("tick");tap();}
  var els=document.querySelectorAll('[data-holdt="'+H.key+'"]');
  for(var i=0;i<els.length;i++){
    var lab=els[i].querySelector(".hold-l");
    if(lab)lab.textContent=holdLabel(H.key,0);
    els[i].style.setProperty("--p",s.p.toFixed(3));
    els[i].classList.add("run");}
  if(s.left<=0){var done=H.done;stopHold();play("set");tap("ok");if(done)done();}}

function startHold(key,secs,side,done){
  stopHold();
  var total=secs*(side?2:1);
  H={key:key,total:total,half:side?secs:0,end:Date.now()+total*1000,done:done,switched:false};
  H.timer=setInterval(paint,200);
  paint();}

function stopHold(){
  if(!H)return;
  clearInterval(H.timer);
  var els=document.querySelectorAll('[data-holdt="'+H.key+'"]');
  for(var i=0;i<els.length;i++){els[i].classList.remove("run");els[i].style.removeProperty("--p");}
  H=null;}

function holding(key){return !!(H&&(key==null||H.key===key));}

export {holdLabel, holdState, holding, startHold, stopHold};

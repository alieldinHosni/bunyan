/* Bunyan — the warm-up step and the cool-down card
   The warm-up is the workout's first screen, before the first exercise: raise the
   pulse, the drills for what the day trains, the lighter sets that lead up to the
   first heavy lift. One button starts the workout, one skips it; the ⋯ menu brings
   it back. The cool-down is a card on the Workout complete sheet: a stretch for
   each muscle worked, each with a hold timer. What they contain comes from
   js/engine/warmup.js; this file only draws it. */
import {t, tm} from "../../i18n/dict.js";
import {exName} from "../../i18n/exnames.js";
import {thumb} from "../../data/exercises.js";
import {recommend} from "../../engine/formulas.js";
import {cooldownFor, warmupFor} from "../../engine/warmup.js";
import {S} from "../../state.js";
import {fmtW} from "../../units.js";
import {esc, num} from "../../util.js";
import {V} from "../view.js";
import {holdLabel, holdState} from "../hold.js";

var TICK='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
var PLAY='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10-6.5z"/></svg>';

/* The weight the first set of an exercise will be done at: the recommendation
   from last time, or the plan's starting weight. 0 when neither is known. */
function workKg(e){
  var r=null;try{r=recommend(e);}catch(err){}
  return (r&&num(r.w))||num(e.planned&&e.planned.w0)||0;}

function warmOf(a){
  return warmupFor(a.entries,{work:workKg,gear:S.gear||null,bar:V.bar==null?20:V.bar});}

/* The warm-up shows before the first set of a session, unless it is switched off;
   from the ⋯ menu it shows whenever asked for. */
function warmShown(a){
  if(!a||!a.entries||!a.entries.length)return false;
  if(a.warm==="open")return true;
  if(a.warm!=null||S.prefs.nowarm)return false;
  if(a.entries.some(function(e){return e.sets&&e.sets.length;}))return false;
  return !!warmOf(a);}

function muscles(list){
  return list.map(function(m){return tm(m).toLowerCase();}).join(S.prefs.lang==="ar"?"، ":", ");}

function doseOf(d){
  if(d.sec)return d.sec+" "+t("s")+(d.side?" "+t("/ side"):"");
  return d.n+" "+(d.side?t("/ side"):t("reps"));}

/* A drill or a stretch: tick, the exercise (tap for how), and a hold timer when it
   is held rather than repeated. */
function row(key,name,dose,secs,side,done,tickAttr){
  var hs=secs?holdState(key):null;
  return '<div class="wu-row'+(done?' did':'')+'" data-k="'+key+'">'
   +'<button class="wu-tick" '+tickAttr+'="'+esc(name)+'" aria-pressed="'+(done?"true":"false")+'" aria-label="'
   +esc(t("Done")+": "+exName(name))+'">'+TICK+'</button>'
   +'<button class="wu-ex" data-exdetail="'+esc(name)+'">'+thumb(name,40)
   +'<span class="wu-t"><span class="wu-n">'+esc(exName(name))+'</span><span class="wu-d">'+esc(dose)+'</span></span></button>'
   +(secs?'<button class="wu-hold'+(hs?' run':'')+'" data-hold="'+key+'" data-secs="'+secs+'" data-side="'+(side?1:0)
     +'" data-holdn="'+esc(name)+'" data-holdt="'+key+'"'+(hs?' style="--p:'+hs.p.toFixed(3)+'"':'')
     +' aria-label="'+esc(t(hs?"Stop the timer":"Start the timer")+": "+exName(name))+'">'
     +PLAY+'<span class="hold-l">'+esc(holdLabel(key,secs))+'</span></button>':'')
   +'</div>';}

var PULSE={
  gym:"Easy bike, rower or a brisk walk. Breathing harder, still able to talk.",
  home:"March or jog on the spot, then a few jumping jacks. Breathing harder, still able to talk.",
  run:"Walk briskly, then jog easily. Breathing harder, still able to talk."};

function vWarm(a){
  var w=warmOf(a);
  if(!w)return "";
  var done=a.wuDone||{};
  var h='<section class="wu">'
   +'<div class="wu-head"><span class="shk">'+t("Before you start")+'</span>'
   +'<h1>'+t("Warm-up")+'</h1>'
   +'<p class="sub">'+t("About {n} min").replace("{n}",w.min)
   +(w.focus.length?' · '+esc(t("for {m}").replace("{m}",muscles(w.focus))):'')+'</p></div>';
  var step=0;
  /* 1. Pulse: timed as a whole, so it can run while you get on the bike. */
  var pk="wp";
  h+='<div class="wu-step"><div class="wu-sh"><b>'+(++step)+'</b><span>'+t("Raise your pulse")+'</span></div>'
   +'<div class="wu-row wu-pulse'+(done[pk]?' did':'')+'" data-k="wp">'
   +'<button class="wu-tick" data-wutick="'+pk+'" aria-pressed="'+(done[pk]?"true":"false")+'" aria-label="'+esc(t("Done")+": "+t("Raise your pulse"))+'">'+TICK+'</button>'
   +'<p class="wu-txt">'+esc(t(PULSE[w.pulse.how]))+'</p>';
  var phs=holdState(pk);
  h+='<button class="wu-hold'+(phs?' run':'')+'" data-hold="'+pk+'" data-secs="'+w.pulse.min*60+'" data-side="0" data-holdn="'+pk+'" data-holdt="'+pk+'"'
   +(phs?' style="--p:'+phs.p.toFixed(3)+'"':'')+' aria-label="'+esc(t(phs?"Stop the timer":"Start the timer"))+'">'
   +PLAY+'<span class="hold-l">'+esc(holdLabel(pk,w.pulse.min*60))+'</span></button></div></div>';
  /* 2. The drills for what the day trains, or a word that the plan has its own. */
  if(w.own)
    h+='<div class="wu-step"><div class="wu-sh"><b>'+(++step)+'</b><span>'+t("Move what you'll train")+'</span></div>'
     +'<p class="wu-note">'+t("Your plan opens with its own mobility work. Do that next, as the session lists it.")+'</p></div>';
  else if(w.drills.length){
    h+='<div class="wu-step"><div class="wu-sh"><b>'+(++step)+'</b><span>'+t("Move what you'll train")+'</span></div>';
    w.drills.forEach(function(d,i){
      h+=row("wd"+i,d.name,doseOf(d),d.sec,d.side,done[d.name],"data-wutick");});
    h+='</div>';}
  /* 3. Ramp-up sets on the first heavy lift. */
  if(w.ramp){
    h+='<div class="wu-step"><div class="wu-sh"><b>'+(++step)+'</b><span>'
     +esc(t("Ramp up to {ex}").replace("{ex}",exName(w.ramp.name)))+'</span></div>';
    if(w.ramp.sets.length)
      h+='<div class="wu-ramp">'+w.ramp.sets.map(function(s){
          return '<span class="wu-rs"><b>'+esc(fmtW(s.w))+'</b> × '+s.r+'</span>';}).join("")
       +'<span class="wu-rs work">'+esc(t("then"))+' <b>'+esc(fmtW(w.ramp.work))+'</b></span></div>';
    else h+='<p class="wu-note">'+t("Build up over two or three lighter sets to your first working weight.")+'</p>';
    h+='<p class="wu-note">'+t("Lighter sets, short rests, nothing near failure. They get you ready; they are not logged.")
     +(w.moreLifts?' '+t("Each big lift after it: one lighter set of five first."):'')+'</p></div>';}
  h+='<p class="wu-why">'+t("Moving drills now, held stretches at the end: a long hold just before lifting can take a little off your strength for a while.")+'</p>'
   +'<button class="btn wu-go" data-wugo="1">'+t("Start the workout")+'</button>'
   +'<button class="btn g wu-skip" data-wuskip="1">'+t("Skip the warm-up")+'</button>'
   +'</section>';
  return h;}

/* The cool-down for a finished session, worked out once, at the finish. */
function coolFor(entries){
  if(S.prefs.nocool)return null;
  return cooldownFor(entries,{});}

function coolCard(c){
  if(!c||!c.stretches||!c.stretches.length)return "";
  var done=V.cdDone||{};
  var h='<section class="cd"><div class="cd-h"><span>'+t("Cool down")+'</span><span class="cd-m">'
   +t("About {n} min").replace("{n}",c.min)+'</span></div>'
   +'<p class="cd-sub">'+t("Hold each stretch and breathe slowly. Ease into it: a pull, never pain.")+'</p>';
  c.stretches.forEach(function(s,i){
    h+=row("cd"+i,s.name,s.sec+" "+t("s")+(s.side?" "+t("/ side"):""),s.sec,s.side,done[s.name],"data-cdtick");});
  return h+'</section>';}

export {coolCard, coolFor, vWarm, warmOf, warmShown};

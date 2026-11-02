/* Bunyan — the weekly check-in, said (js/engine/checkin.js decides it; a shared ui module)
   What last week's log shows, a line each where there is data, and each change the
   coach proposes with the one button that makes it. Shared by Coach's card and the
   chat's "How was my week?", so the two say the same. */
import {BARRIER_HELP, BARRIERS_ASK} from "../engine/barriers.js";
import {t, tm} from "../i18n/dict.js";
import {fmtW} from "../units.js";
import {esc, fmtN, pretty} from "../util.js";
import {glyph} from "./glyphs.js";

function fill(x,o){Object.keys(o).forEach(function(k){x=x.split("{"+k+"}").join(o[k]);});return x;}
function list(ms){return ms.map(function(m){return tm(m).trim();}).join(", ");}
/* Escaped, with every figure (a sign and a unit with it) in .num, so right to left
   keeps "−0.1 kg" whole. */
function nums(x){return esc(x).replace(/[−+]?\d(?:[\d,.]*\d)?(?:\s?(?:kg|lb|kcal))?/g,function(m){return '<span class="num">'+m+'</span>';});}
function signed(kg){return (kg>0?"+":kg<0?"−":"")+fmtW(Math.abs(kg));}

function ckFacts(c){
  var L=[];
  if(c.planned)L.push(fill(t("Workouts: {n} of {p} planned"),{n:c.done,p:c.planned}));
  else if(c.done)L.push(fill(t("Workouts: {n}"),{n:c.done}));
  if(c.rpe)L.push(fill(t(c.rpe.target?"Effort: RPE {r} on average over {n} sets, against about {t} planned":"Effort: RPE {r} on average over {n} sets"),
    {r:c.rpe.avg,n:c.rpe.n,t:c.rpe.target}));
  if(c.sore)L.push(fill(t("Soreness: {s} out of 10 on average, on the {n} days you logged it"),{s:c.sore.avg,n:c.sore.n}));
  if(c.food)L.push(fill(t(c.food.target?"Food: logged on {n} days, {k} kcal a day on average against {t}":"Food: logged on {n} days, {k} kcal a day on average"),
    {n:c.food.n,k:fmtN(c.food.avg),t:fmtN(c.food.target||0)}));
  if(c.weight)L.push(fill(t(c.weight.pace!=null?"Weight: {r} a week, an estimate from {n} weigh-ins over three weeks; your goal's pace is {p}":"Weight: {r} a week, an estimate from {n} weigh-ins over three weeks"),
    {r:signed(c.weight.perWeek),n:c.weight.n,p:signed(c.weight.pace||0)}));
  return L;}

/* {text, btn} for a change. */
function ckChange(x){
  if(x.kind==="days")return {text:fill(t("You trained {a} times last week and {b} the week before, against {p} planned. A {n}-day week, built for you, fits the weeks you have."),
    {a:x.done,b:x.donePrev,p:x.planned,n:x.to}),btn:fill(t("Build a {n}-day week"),{n:x.to})};
  if(x.kind==="kcal")return {text:t(x.why==="slow"?(x.by<0?"Weight is coming off at under half your goal's pace, on a week you ate to target. A little less: {k} kcal a day.":"Weight is going on at under half your goal's pace, on a week you ate to target. A little more: {k} kcal a day.")
      :x.why==="fast"?(x.by>0?"Weight is coming off faster than your goal's pace, which costs muscle. A little more: {k} kcal a day.":"Weight is going on faster than your goal's pace, most of it fat. A little less: {k} kcal a day.")
      :(x.by>0?"Your weight is drifting down while the goal is to hold it. A little more: {k} kcal a day.":"Your weight is drifting up while the goal is to hold it. A little less: {k} kcal a day."))
      .replace("{k}",fmtN(x.to))+" "+t("Then another week to see."),btn:fill(t("Set {k} kcal"),{k:fmtN(x.to)})};
  if(x.kind==="deload")return {text:t(x.sore&&x.hard?"Sore most days and the sets harder than planned: a lighter week, then build back up."
      :x.sore?"Sore on three days or more: a lighter week lets it settle, then build back up."
      :"Your sets were well harder than planned: a lighter week, then build back up."),btn:t("Start a lighter week")};
  if(x.kind==="balance")return {text:[x.low.length?fill(t("Under your range of {lo} sets a week: {m}."),{lo:x.lo,m:list(x.low)}):"",
      x.high.length?fill(t("Well over {hi} sets a week: {m}."),{hi:x.hi,m:list(x.high)}):""].filter(Boolean).join(" "),btn:t("Balance the volume")};
  return {text:"",btn:""};}

/* Fewer workouts than planned: what got in the way (engine/barriers.js), and once said,
   that barrier's strategy with what the app can do about it. Last week's answer is
   recalled when this week went better or no better. */
function ckWhy(c){
  if(!c.missed)return "";
  var h='<div class="ckwhy" data-k="ckwhy">';
  if(c.prevBarrier&&c.donePrev!=null){var lab=(BARRIERS_ASK.filter(function(x){return x[0]===c.prevBarrier;})[0]||[])[1];
    if(lab)h+='<p class="ckwhy-p">'+esc(fill(t(c.done>c.donePrev?"Better than the week before, when it was: {b}.":"The week before, it was: {b}. Is it still?"),{b:t(lab).toLowerCase()}))+'</p>';}
  if(!c.barrier){
    h+='<p class="ckwhy-q">'+esc(t("Fewer workouts than planned. What got in the way?"))+'</p><div class="aschips">'
     +BARRIERS_ASK.map(function(x){return '<button class="aschip" data-ckwhy="'+x[0]+'">'+esc(t(x[1]))+'</button>';}).join("")+'</div>';}
  else{var H=BARRIER_HELP[c.barrier]||{},lb=(BARRIERS_ASK.filter(function(x){return x[0]===c.barrier;})[0]||[])[1]||"";
    h+='<p class="ckwhy-q"><b>'+esc(t(lb))+'</b> <button class="ckwhy-x" data-ckwhy="">'+esc(t("Change"))+'</button></p>'
     +'<p>'+esc(t(H.text||""))+'</p>'
     +(H.act==="setup"?'<button class="btn sm" data-setupstep="'+H.step+'">'+esc(t(H.btn))+'</button>':H.act==="share"?'<button class="btn sm" data-share="1">'+esc(t(H.btn))+'</button>':'');}
  return h+'</div>';}
/* Coach's card: last week, what changes, and done for the week. */
function ckCard(c){
  if(!c)return "";
  var facts=ckFacts(c);
  return '<section class="ckcard" aria-labelledby="ck_h">'
   +'<div class="ckcard-h"><span class="ckcard-i" aria-hidden="true">'+glyph("whistle")+'</span>'
   +'<div><span class="shk">'+esc(t("Weekly check-in"))+'</span><h2 id="ck_h">'+esc(t("Last week"))+'</h2>'
   +'<p>'+esc(pretty(c.from)+" – "+pretty(c.to))+'</p></div></div>'
   +(facts.length?'<ul class="ckcard-f">'+facts.map(function(f){return '<li>'+nums(f)+'</li>';}).join("")+'</ul>':'')
   +ckWhy(c)
   +(c.recheck?'<div class="ckcard-c"><p>'+esc(t("Four weeks since your squat check: do it again to see what has changed."))+'</p><button class="btn sm" data-setupstep="limits">'+esc(t("Redo the squat check"))+'</button></div>':'')
   +(c.changes.length?c.changes.map(function(x){var w=ckChange(x);
      return '<div class="ckcard-c"><p>'+nums(w.text)+'</p><button class="btn sm" data-ckdo="'+esc(x.kind)+'">'+nums(w.btn)+'</button></div>';}).join("")
     :'<p class="ckcard-ok">'+esc(t("Nothing to change: keep going as you are."))+'</p>')
   +'<button class="btn g sm ckcard-done" data-ckok="1">'+esc(t(c.changes.length?"Not this week":"Got it"))+'</button></section>';}

export {ckCard, ckChange, ckFacts};

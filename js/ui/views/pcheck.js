/* Bunyan — the plan check and the coach, on screen
   Two sources of advice share one place, Coach → Coach AI:
     the plan check (js/engine/plancheck.js): targets, meal plan and program against
       the goal — "your plan will not get you there";
     the coach (js/coach/, through js/engine/coachinfo.js): what the training log shows
       — fatigue, a stalled or falling lift, volume well off, a lift out of proportion.
   Each says what it saw and why it matters, offers one thing to do, and can be set
   aside; nothing changes without a tap. Which of them show, and in what order, is the
   head's (js/engine/head.js); this file only draws them. */
import {t} from "../../i18n/dict.js";
import {esc} from "../../util.js";
import {headNow} from "../../engine/head.js";
import {words} from "../coachwords.js";
import {ckCard, moCard} from "../checkin.js";

var AREA={food:"Nutrition",train:"Training",both:"Nutrition and training"};

function findingCard(f,cls){
  return '<div class="pcf sev'+f.sev+(cls?' '+cls:'')+'" data-k="pc:'+f.id+'">'
   +'<div class="pcf-k">'+esc(t(AREA[f.area]||"Plan check"))+'</div>'
   +'<h3>'+esc(f.title)+'</h3><p>'+esc(f.why)+'</p>'
   +'<div class="pcf-acts"><button class="btn sm" data-pcfix="'+f.id+'">'+esc(f.fix.label)+'</button>'
   +'<button class="btn d sm" data-pckeep="'+f.id+'">'+esc(t("Keep it as it is"))+'</button></div></div>';}

function coachCard(c,cls){
  var w=words(c);if(!w)return "";
  return '<div class="pcf sev'+c.pri+' coach'+(cls?' '+cls:'')+'" data-k="co:'+esc(c.id)+'">'
   +'<div class="pcf-k">'+esc(t("From your training"))+'</div>'
   +'<h3>'+esc(w[0])+'</h3><p>'+esc(w[1])+'</p>'
   +'<div class="pcf-acts"><button class="btn sm" data-cofix="'+esc(c.id)+'">'+esc(w[2])+'</button>'
   +(w[3]!=="ok"?'<button class="btn d sm" data-cokeep="'+esc(c.id)+'">'+esc(t("Not now"))+'</button>':'')+'</div></div>';}
function coachAct(c){var w=words(c);return w?w[3]:"ok";}

/* A signal from the head (js/engine/head.js), as its card: a plan check finding, a coach
   insight, the weekly check-in, the monthly review. Which ones, and in what order, is the
   head's to say; the card is the source's own. A check-in's or a review's changes are
   the ones the head kept (its parts); a balance change goes with either of its halves,
   because its one button moves sets both ways. */
function standing(s){
  var r=s.src,parts=s.parts||[],has=function(k){return parts.indexOf(s.id+":"+k)>=0;};
  return Object.assign({},r,{changes:(r.changes||[]).filter(function(x){
    if(x.kind!=="balance")return has(x.kind);
    return !(x.low&&x.low.length&&!has("balance-low"))&&!(x.high&&x.high.length&&!has("balance-high"));})});}
function signalCard(s){
  if(s.source==="plancheck")return findingCard(s.src);
  if(s.source==="coach")return coachCard(s.src);
  if(s.source==="checkin")return ckCard(standing(s));
  if(s.source==="monthly")return moCard(standing(s));
  return "";}

/* How many: the dot on the Coach tab. What the plan check and the coach noticed, as the
   head keeps it: what it put away (a lighter week holding back "add sets", the calorie
   voices after the first) is not counted. */
function adviceCount(){return headNow().queue.filter(function(s){return s.source==="plancheck"||s.source==="coach";}).length;}

export {adviceCount, coachAct, signalCard};

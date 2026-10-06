/* Bunyan — the plan check and the coach, on screen
   Two sources of advice share one place, Coach → Coach AI:
     the plan check (js/engine/plancheck.js): targets, meal plan and program against
       the goal — "your plan will not get you there";
     the coach (js/coach/, through js/engine/coachinfo.js): what the training log shows
       — fatigue, a stalled or falling lift, volume well off, a lift out of proportion.
   Each says what it saw and why it matters, offers one thing to do, and can be set
   aside; nothing changes without a tap. When there is nothing worth saying, nothing is
   said, and the dot on the Coach tab is gone. */
import {t} from "../../i18n/dict.js";
import {checkPlans} from "../../engine/plancheck.js";
import {coachNow} from "../../engine/coachinfo.js";
import {S} from "../../state.js";
import {esc} from "../../util.js";
import {V} from "../view.js";
import {words} from "../coachwords.js";

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

/* Everything worth saying, most important first: the plan's findings and the coach's
   insights side by side, a plan finding first where they weigh the same. */
function allAdvice(){
  var out=[];
  checkPlans().forEach(function(f){out.push({sev:f.sev,html:function(cls){return findingCard(f,cls);}});});
  coachNow().forEach(function(c){out.push({sev:c.pri-0.1,html:function(cls){return coachCard(c,cls);}});});
  return out.sort(function(a,b){return b.sev-a.sev;});}
/* How many: the dot on the Coach tab. */
function adviceCount(){return S.onboarded?allAdvice().length:0;}

/* Coach AI's advice. One thing at a time: the most important finding or insight, and
   the rest behind a tap, because a dozen at once is noise that gets ignored. Every card
   says what it saw and why, and nothing changes without a tap. When there is nothing
   worth saying the section is one quiet line, so a day that is on track looks like
   it. The plan check, opened on purpose (V.advall), shows them all. */
function adviceBody(){
  var all=allAdvice(),kept=Object.keys(S.pcDismiss||{}).length+Object.keys(S.coachDismiss||{}).length;
  var again=kept?'<button class="pglink pcagain" data-pcreset="1">'+esc(t("Check the ones you kept again"))+'</button>':'';
  if(!all.length)return '<p class="pcquiet"><span class="ico ico-check" aria-hidden="true"></span>'
    +esc(t((S.sessions||[]).length<3?"Nothing to change. After a few weeks of sessions the coach reads your training too.":"On track. Nothing to change."))+'</p>'+again;
  var open=V.advall||all.length===1;
  var h='<div class="tsec"><h2 class="tsec-h">'+t("What the coach sees")+'</h2>'
   +'<span class="libn">'+all.length+'</span></div>';
  h+=(open?all:all.slice(0,1)).map(function(x){return x.html();}).join("");
  if(all.length>1)h+=open
    ?'<button class="btn g sm pcmore" data-advall="0">'+esc(t("Show only the most important"))+'</button>'
    :'<button class="btn g pcmore" data-advall="1">'+esc(t(all.length===2?"1 more thing the coach sees":"{n} more things the coach sees").replace("{n}",all.length-1))+'</button>';
  if(kept)h+='<p class="dsub">'+esc(t("You chose to keep some as they are. They come back here if the numbers behind them change."))+'</p>'+again;
  h+='<p class="as-note">'+esc(t("Ranges and targets here are starting points from the research, not rules. How you feel, recover and progress over a few weeks says more."))+'</p>';
  return h;}

export {adviceBody, adviceCount, coachAct};

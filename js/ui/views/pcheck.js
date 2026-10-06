/* Bunyan — the plan check and the coach, on screen
   Two sources of advice share one place:
     the plan check (js/engine/plancheck.js): targets, meal plan and program against
       the goal — "your plan will not get you there";
     the coach (js/coach/, through js/engine/coachinfo.js): what the training log shows
       — fatigue, a stalled or falling lift, volume well off, a lift out of proportion.
   Home shows the single most important of them, never a list. The Plan check screen
   has the rest. Each says what it saw and why it matters, offers one thing to do, and
   can be set aside; nothing changes without a tap. When there is nothing worth saying,
   nothing is said. */
import {t, tm} from "../../i18n/dict.js";
import {checkPlans} from "../../engine/plancheck.js";
import {coachNow} from "../../engine/coachinfo.js";
import {exName} from "../../i18n/exnames.js";
import {S} from "../../state.js";
import {fmtW} from "../../units.js";
import {esc} from "../../util.js";
import {backArrow} from "../nav.js";

var AREA={food:"Nutrition",train:"Training",both:"Nutrition and training"};

function findingCard(f,cls){
  return '<div class="pcf sev'+f.sev+(cls?' '+cls:'')+'" data-k="pc:'+f.id+'">'
   +'<div class="pcf-k">'+esc(t(AREA[f.area]||"Plan check"))+'</div>'
   +'<h3>'+esc(f.title)+'</h3><p>'+esc(f.why)+'</p>'
   +'<div class="pcf-acts"><button class="btn sm" data-pcfix="'+f.id+'">'+esc(f.fix.label)+'</button>'
   +'<button class="btn d sm" data-pckeep="'+f.id+'">'+esc(t("Keep it as it is"))+'</button></div></div>';}

/* ---- the coach's insights, in words ---------------------------------------------- */
var LIFT={squat:"squat",bench:"bench press",deadlift:"deadlift",press:"overhead press",row:"row"};
function fill(s,o){Object.keys(o).forEach(function(k){s=s.split("{"+k+"}").join(o[k]);});return s;}
function muscleList(ms,key){
  return ms.map(function(x){return tm(x.m)+" "+x[key];}).join(S.prefs.lang==="ar"?"، ":", ");}
/* What an insight says and what it offers: [title, why, action label, action]. */
function words(c){
  var ex=c.name?exName(c.name):"";
  if(c.kind==="fatigue")return [fill(t("{ex} is feeling harder"),{ex:ex}),
    fill(t("The same {w} × {r} went from RPE {a} to {b} over your last {n} sessions. The weight has not changed, so this is fatigue building up, not lost strength. A lighter week usually clears it."),
      {w:fmtW(c.w),r:c.r,a:c.from,b:c.to,n:c.points}),t("Take a lighter week"),"deload"];
  if(c.kind==="falling")return [fill(t("{ex} is going backwards"),{ex:ex}),
    fill(t("Your best estimated max on it has dropped {n} weeks running, from {a} to {b}. That is usually fatigue or too little recovery, not lost strength. A lighter week usually brings it back."),
      {n:c.weeks,a:fmtW(c.peak),b:fmtW(c.latest)}),t("Take a lighter week"),"deload"];
  if(c.kind==="stall")return [fill(t("{ex} has stalled"),{ex:ex}),
    fill(t("No new best on it for {n} weeks, around {b}. A lighter week, or a few weeks in a different rep range, usually gets it moving again."),{n:c.weeks,b:fmtW(c.best)}),
    t("Take a lighter week"),"deload"];
  if(c.kind==="deload")return [fill(t("{ex}: three sessions short of the range"),{ex:ex}),
    fill(t("Three sessions running you stayed under {lo} reps at {w}. Your next session on it suggests about 10% less for a week, same reps, then building back up."),{lo:c.lo,w:fmtW(c.w)}),
    t("Got it"),"ok"];
  if(c.kind==="over")return [t("More volume than most recover from"),
    fill(t("Hard sets a week over the last {n} weeks: {list}. That is above what most people recover from. It is a rule of thumb, not your limit, but if you feel run down, this is the first place to trim."),
      {n:c.weeks,list:muscleList(c.muscles,"avg")}),t("Balance the volume"),"balance"];
  if(c.kind==="under")return [t("Less training than your program has"),
    fill(t("Hard sets a week logged over the last {n} weeks: {list}. That is under where growth usually starts. Your program has more; skipped sets or exercises are the usual reason."),
      {n:c.weeks,list:muscleList(c.muscles,"avg")}),t("Open my program"),"program"];
  if(c.kind==="weak"){var a=t(LIFT[c.a]),b=t(LIFT[c.b]);
    return [fill(t(c.side==="low"?"Your {a} is behind your {b}":"Your {a} is ahead of your {b}"),{a:a,b:b}),
      fill(t("Your {a} is about {p}% of your {b}; most lifters' sit between {lo}% and {hi}%. Leverages differ, so this may simply be how you are built. If it matters to you, more {a} practice closes the gap."),
        {a:a,b:b,p:Math.round(c.ratio*100),lo:Math.round(c.lo*100),hi:Math.round(c.hi*100)}),t("Got it"),"ok"];}
  return null;}
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

/* Home: one at most, so it never becomes a list of chores. */
function pcHome(){
  if(!S.onboarded)return "";
  var all=allAdvice();if(!all.length)return "";
  return '<div class="pchome">'+all[0].html("card")
   +(all.length>1?'<button class="linkbtn pcmore" data-pcopen="1">'+esc(t("{n} more in Plan check").replace("{n}",all.length-1))+'</button>':'')+'</div>';}

/* A row that opens the screen, for My Program and Food → Targets. */
function pcRow(){
  var n=checkPlans().length+coachNow().length;
  return '<button class="pcrow'+(n?' has':'')+'" data-pcopen="1"><span class="pcrow-d" aria-hidden="true"></span>'
   +'<span>'+esc(n?t(n===1?"Plan check: 1 thing to look at":"Plan check: {n} things to look at").replace("{n}",n):t("Plan check: everything fits"))+'</span>'
   +'<span class="ico ico-chev" aria-hidden="true"></span></button>';}

function vPlanCheck(){
  var all=checkPlans(),co=coachNow(),kept=Object.keys(S.pcDismiss||{}).length+Object.keys(S.coachDismiss||{}).length;
  var h='<div class="dhead">'+backArrow()+'<h1 class="dhead-t">'+t("Plan check")+'</h1></div>'
   +'<p class="dsub">'+esc(t("Your targets, meal plan and training, side by side with your goal: where they pull different ways, why it matters, and a fix. Nothing changes unless you choose it."))+'</p>';
  if(!all.length)h+='<div class="pcok"><b>'+t("Everything fits together")+'</b><p>'
    +esc(t("Calories and protein suit your goal, the meal plan matches the targets, and every main muscle gets a fair share of training."))+'</p></div>';
  else h+=all.map(function(f){return findingCard(f);}).join("");
  /* The log, read like a coach would. Quiet when there is nothing to say. */
  h+='<div class="tsec"><h2 class="tsec-h">'+t("From your training")+'</h2></div>';
  h+=co.length?co.map(function(c){return coachCard(c);}).join("")
    :'<p class="dsub">'+esc(t((S.sessions||[]).length<3?"Not enough training logged yet to read trends from. A few weeks of sessions, with effort logged, is enough."
      :"Nothing to flag: your lifts are moving and your volume is in a sensible range."))+'</p>';
  if(kept)h+='<div class="tsec"><h2 class="tsec-h">'+t("Kept as they are")+'</h2></div>'
    +'<p class="dsub">'+esc(t("You chose to keep these. They come back here if the numbers behind them change."))+'</p>'
    +'<button class="btn g" data-pcreset="1">'+t("Check them all again")+'</button>';
  h+='<p class="as-note">'+esc(t("Ranges and targets here are starting points from the research, not rules. How you feel, recover and progress over a few weeks says more."))+'</p>';
  return h;}

export {coachAct, pcHome, pcRow, vPlanCheck};

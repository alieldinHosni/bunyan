/* Bunyan — Coach
   The coach, and only the coach (owner, 3 Nov: "the worst part of the app, not easy to
   understand or navigate"). Planning moved to where it is done: the program, other
   programs and the exercise library are Training's plan page (views/train.js
   vTrainPlan); the meal plan, the targets and your own foods are Food's (views/food.js
   vFoodPlan). What is left here, top to bottom:
     · the coach's mark, the goal and the program
     · a box to ask it anything, with three questions to start from (the conversation
       itself is the one panel, js/ui/coachfab.js, whose button stays beside the dock here
       as on every page: owner, 28 Oct, "available anywhere the dock is")
     · this week in one strip: workouts done, protein days, weeks kept
     · "For you": one numbered list of everything that wants a decision this week, the
       check-in, a week kept light and what the coach noticed, each with its own buttons,
       the count above it the number shown
     · the assessment, to take again, and the small print
   Before the assessment, only the way to start it. */
import {t} from "../../i18n/dict.js";
import {planName} from "../../i18n/exnames.js";
import {goalOf, goalsOf} from "../../data/goals.js";
import {weekRun} from "../../engine/stats.js";
import {monthlyOpen} from "../../engine/monthly.js";
import {sumNutrition} from "../../engine/nutrition.js";
import {planOn} from "../../engine/dayplan.js";
import {weekDates} from "../../engine/schedule.js";
import {S, split} from "../../state.js";
import {esc, num, pretty, today} from "../../util.js";
import {V} from "../view.js";
import {art} from "../art.js";
import {glyph} from "../glyphs.js";
import {adviceList} from "./pcheck.js";
import {ASK, vChat} from "./chat.js";
import {suggestFor} from "../coachfab.js";
import {ckCard, moCard} from "../checkin.js";
import {checkinOpen} from "../../engine/checkin.js";
import {followDue, followOn, lightOnPurpose} from "../../engine/stress.js";

function vCoach(){
  /* The conversation, under anything an answer opened over it. */
  if(V.chat)return vChat();
  var p=S.profile||{},sp=split(),h='';
  if(!S.onboarded){
    h+='<div class="thead"><div><h1>'+t("Coach")+'</h1></div></div>';
    h+='<div class="coachhero">'+art("wall",{cls:"coachhero-art"})
     +'<span class="shk">'+t("Coach")+'</span>'
     +'<h2>'+t("Your plan, built for you")+'</h2>'
     +'<p>'+esc(t("Answer a short assessment: your goal, body, week, equipment, sore spots and how you eat. The coach builds your training and your meals, and puts them on the Training and Food pages. Nothing changes until you say so."))+'</p>'
     +'<button class="btn" data-setup="1">'+t("Start the assessment")+'</button></div>';
    return h;}
  /* Every goal trained for, the main one first (js/data/goals.js goalsOf). */
  var sub=[goalsOf(p).map(function(k){return t(goalOf(k).label);}).join(" + "),sp?planName(sp.name):""].filter(Boolean).join(" · ");
  h+='<div class="thead chead"><span class="chead-mark" aria-hidden="true">'+glyph("whistle")+'</span><div><h1>'+t("Coach")+'</h1>'
   +'<p class="thead-s">'+esc(sub)+'</p></div></div>';
  h+=askBox();
  h+=weekStrip();
  h+=forYou();
  h+=coachList();
  return h;}

/* ---- your coach: the rest, as one list ---------------------------------------------
   Owner, 3 Nov: "random sentences everywhere … not a PDF". What used to trail under the
   list as loose lines (a week kept light, advice set aside, the small print) and the
   assessment are rows of one list, each with its mark, its name, one line and what a tap
   does. The small print is a page of its own, How the coach works. */
function coachList(){
  var p=S.profile||{},rows='',kept=Object.keys(S.pcDismiss||{}).length+Object.keys(S.coachDismiss||{}).length;
  var row=function(gl,name,sub){return '<span class="gtile">'+glyph(gl)+'</span><span class="srow-t"><span class="srow-n">'+esc(name)+'</span>'+(sub?'<span class="srow-s">'+esc(sub)+'</span>':'')+'</span>';};
  if(lightOnPurpose(p)&&stressKept(p)){var on=followOn(p);
    rows+='<div class="srow stressline">'+row("moon",t("Your week is kept light"),t("I'll ask again on {d}").replace("{d}",on?pretty(on):""))
     +'<button class="btn g sm" data-stressask="1">'+esc(t("Better now?"))+'</button></div>';}
  if(kept)rows+='<div class="srow pcagain">'+row("archive",t("Advice you set aside"),t(kept===1?"1 item. It comes back if your numbers change.":"{n} items. They come back if your numbers change.").replace("{n}",kept))
     +'<button class="btn g sm" data-pcreset="1">'+esc(t("Show again"))+'</button></div>';
  rows+='<button class="srow crow" data-setup="1">'+row("restore",t("Take the assessment again"),t("Rebuilds your training and meals. You see both first."))+'<span class="ico ico-chev" aria-hidden="true"></span></button>'
   +'<button class="srow" data-sheet="coachinfo">'+row("info",t("How the coach works"),"")+'<span class="ico ico-chev" aria-hidden="true"></span></button>';
  return '<div class="tsec"><h2 class="tsec-h">'+t("Your coach")+'</h2></div><section class="sg cmore"><div class="sg-list">'+rows+'</div></section>';}

/* ---- ask -------------------------------------------------------------------------
   A field-shaped button that opens the conversation, and three questions that ask at
   once (the same ones the panel starts with on this page). */
/* Questions that ask at once. Asking anything else is the floating Coach button beside
   the dock: no second box here that opens the same chat (owner, 3 Nov). */
function askBox(){
  return '<section class="cask" aria-label="'+esc(t("Ask your coach"))+'"><span class="shk">'+esc(t("Ask your coach"))+'</span>'
   +'<div class="cask-q">'+suggestFor("coach").map(function(id){
     return '<button class="cp-chip" data-chatq="'+id+'">'+esc(t(ASK[id]))+'</button>';}).join("")+'</div></section>';}

/* ---- this week, in one strip -------------------------------------------------------
   Workouts done against those planned (a bar, the share in words), the days protein
   reached its target so far, and the weeks kept. */
function weekStrip(){
  var sp=split(),now=today(),done=0,plan=0,pdays=0,sofar=0,g=S.goals||{};
  weekDates(now).forEach(function(iso){
    if(sp){var d=planOn(sp,iso);
      if(d.kind==="done")done++;
      if(d.kind==="done"||(d.kind!=="past"&&!d.rest&&d.kind!=="none"))plan++;}
    if(iso>now)return;
    sofar++;
    var items=[],ms=((S.days||{})[iso]||{}).meals||{};
    Object.keys(ms).forEach(function(k){items=items.concat((ms[k]&&ms[k].items)||[]);});
    if(items.length&&g.p&&sumNutrition(items).p>=g.p*0.9)pdays++;});
  /* Weeks kept, as Progress and Profile count them (a day-by-day streak is nearly always
     0 on a plan with rest days). */
  var pct=plan?Math.min(1,done/plan):0,st=weekRun().weeks,fig=function(x){return '<b class="num">'+x+'</b>';};
  return '<section class="cweek2" aria-label="'+esc(t("This week"))+'">'
   +'<div class="cweek2-h"><span class="shk">'+esc(t("This week"))+'</span>'
   +'<span class="cweek2-w">'+(plan?esc(t("{a} of {b} workouts")).replace("{a}",fig(done)).replace("{b}",fig(plan)):esc(t("No workouts planned this week")))+'</span></div>'
   +'<div class="cweek2-bar" aria-hidden="true"><i style="width:'+Math.round(pct*100)+'%"></i></div>'
   +'<div class="cweek2-s">'
   +'<span>'+glyph("shaker")+fig(pdays+"/"+sofar)+' '+esc(t("protein days"))+'</span>'
   +'<span>'+glyph("flame")+fig(st)+' '+esc(t(st===1?"week kept":"weeks kept"))+'</span></div></section>';}

/* ---- for you ------------------------------------------------------------------------
   Everything that wants a decision, in one list and in the order it matters: a week kept
   light (when it is time to ask again), the weekly check-in (its first days), then what
   the coach noticed, most important first. The count is what is listed. Three show; the
   rest are one tap away, opened in place. */
function forYou(){
  var items=[],st=stressCard(),ck=ckCard(checkinOpen()),mo=moCard(monthlyOpen());
  if(st)items.push(st);
  /* The month first in its first days: its changes are the larger ones. */
  if(mo)items.push(mo);
  if(ck)items.push(ck);
  adviceList().forEach(function(x){items.push(x.html());});
  /* Nothing to decide: one card that says so, where the list would be. */
  if(!items.length)return '<div class="tsec"><h2 class="tsec-h">'+t("For you")+'</h2></div>'
    +'<div class="pcquiet glass"><span class="pcquiet-i" aria-hidden="true">'+glyph("check")+'</span><span><b>'+esc(t("You're on track"))+'</b>'
    +'<span>'+esc(t((S.sessions||[]).length<3?"Nothing to change. After a few weeks of workouts the coach reads your training too.":"Nothing needs a decision this week."))+'</span></span></div>';
  var open=V.advall||items.length<=3;
  var h='<div class="tsec"><h2 class="tsec-h">'+t("For you")+'</h2><span class="libn num">'+items.length+'</span></div>'
   +'<ol class="cfor">'+(open?items:items.slice(0,3)).map(function(x,i){return '<li><span class="cfor-n num" aria-hidden="true">'+(i+1)+'</span>'+x+'</li>';}).join("")+'</ol>';
  if(items.length>3)h+=open
    ?'<button class="btn g sm pcmore" data-advall="0">'+esc(t("Show fewer"))+'</button>'
    :'<button class="btn g pcmore" data-advall="1">'+esc(t(items.length===4?"1 more":"{n} more").replace("{n}",items.length-3))+'</button>';
  return h;}

/* ---- a week kept light on purpose (js/engine/stress.js) ------------------------------
   While stress is high or sleep short, a line says so and when the coach will ask again;
   on that day, or when the person says it is better, the question itself: stress now
   (and sleep, if that was the reason), one tap each. */
/* Owner, 3 Nov: "The only option here is It's better now? What if I am still stressed?"
   Both answers are here. Still stressed keeps the week light and takes the card out of
   the list; a line under it says so, until when, and keeps "Better now?" one tap away.
   On the follow-up day the question comes back whatever was answered. */
function stressKept(p){return !!p.stressOk&&!followDue(p)&&!V.stressAsk;}
function stressCard(){
  var p=S.profile||{};if(!lightOnPurpose(p)||stressKept(p))return "";
  var why=p.stress==="high"&&num(p.sleep)>0&&num(p.sleep)<6?t("stress was high and sleep short"):p.stress==="high"?t("stress was high"):t("sleep was short");
  var due=followDue(p)||V.stressAsk,h='<section class="ckcard stresscard" data-k="stresscard">'
   +'<div class="ckcard-h"><span class="ckcard-i" aria-hidden="true">'+glyph("whistle")+'</span><div><span class="shk">'+esc(t("Your coach"))+'</span>'
   +'<h2>'+esc(t(due?"How are you now?":"Kept light on purpose"))+'</h2></div></div>';
  if(!due){
    var on=followOn(p);
    h+='<p class="ckcard-ok">'+esc(t("You said {w}, so your week is built to the bottom of the range while you recover. I'll ask again on {d}.").replace("{w}",why).replace("{d}",on?pretty(on):""))+'</p>'
     +'<div class="ckcard-acts"><button class="btn g sm ckcard-done" data-stresskeep="1">'+esc(t("Still stressed"))+'</button>'
     +'<button class="btn g sm ckcard-done" data-stressask="1">'+esc(t("It's better now"))+'</button></div>';
    return h+'</section>';}
  h+='<p class="ckcard-ok">'+esc(t(V.stressAsk?"Glad to hear it. Where are things now?":"A while ago you said {w}. Where are things now?").replace("{w}",why))+'</p>';
  var chips=function(f,list,cur){return '<div class="aschips">'+list.map(function(x){var on=String(cur)===String(x[0]);
    return '<button class="aschip'+(on?' on':'')+'" data-stressnow="'+f+'|'+x[0]+'" aria-pressed="'+on+'">'+esc(x[1])+'</button>';}).join("")+'</div>';};
  h+='<div class="as-l">'+esc(t("Stress from work and life, lately"))+'</div>'+chips("stress",[["low",t("Low")],["normal",t("Normal")],["high",t("High")]],p.stress||"normal");
  if(num(p.sleep)>0&&num(p.sleep)<6)h+='<div class="as-l">'+esc(t("How do you sleep?"))+'</div>'
    +chips("sleep",[[5,t("Under 6 hours")],[6.5,t("6 to 7 hours")],[8,t("7 to 9 hours")],[9.5,t("More than 9")]],p.sleep);
  return h+'</section>';}

export {vCoach};

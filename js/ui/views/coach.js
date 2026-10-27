/* Bunyan — Coach
   Where the planning lives, so Training and Food can stay simple. Three sections:
     Training   planned by hand: the active program's days, other programs, templates,
                a coach's PDF brought in, the exercise library.
     Nutrition  planned by hand: the meal plan, the daily targets, foods of your own,
                a meal plan brought in.
     Coach AI   the coach itself: how this week is going, at a glance; what the plan
                check and the coach noticed, one card at a time; a box to ask it anything
                (js/ui/views/chat.js); and the plan it built, as tiles that open where
                each part is planned. Before the assessment, only the way to start it.
   A screen opened from a section (a program's builder, the library, one meal's plan, an
   import) opens over it, and back returns to the section. */
import {t} from "../../i18n/dict.js";
import {planName} from "../../i18n/exnames.js";
import {goalOf} from "../../data/goals.js";
import {mealSlots} from "../../engine/meals.js";
import {sumNutrition} from "../../engine/nutrition.js";
import {planOn} from "../../engine/dayplan.js";
import {weekDates} from "../../engine/schedule.js";
import {S, split} from "../../state.js";
import {esc, fmtN, today} from "../../util.js";
import {seg, streak, V} from "../view.js";
import {art} from "../art.js";
import {glyph} from "../glyphs.js";
import {builderBody, exercisesPage, programsPage, trainSub, weekOffer} from "./train.js";
import {foodSub, vMyFoods, vPlan, vTargets} from "./food.js";
import {adviceBody, adviceNote} from "./pcheck.js";
import {vChat} from "./chat.js";

var CSECS=[["train","Training"],["food","Nutrition"],["ai","Coach"]];
var TSUBS=[["program","My program"],["programs","Programs"],["exercises","Exercises"]];
var FSUBS=[["plan","Meal plan"],["targets","Targets"],["foods","My foods"]];
function pick(v,list,dflt){return list.some(function(x){return x[0]===v;})?v:dflt;}
function csec(){return pick(V.csec||S.prefs.csec,CSECS,"ai");}

function vCoach(){
  var sub=trainSub();if(sub!=null)return sub;
  sub=foodSub();if(sub!=null)return sub;
  /* The conversation, under anything an answer opened over it. */
  if(V.chat)return vChat();
  var sec=csec(),n=V.advice||0,h='';
  h+='<div class="thead"><div><h1>'+t("Plan")+'</h1>'
   +'<p class="thead-s">'+t("Plan it here. Do it in Training and Food.")+'</p></div></div>';
  h+=seg({items:CSECS.map(function(x){return [x[0],t(x[1])+(x[0]==="ai"&&n?" ·"+n:"")];}),value:sec,attr:"csec",tabs:true,
    cls:"tsecs csecs",label:t("Coach"),key:"csecs"});
  if(sec==="train"){
    var ts=pick(V.ctsub,TSUBS,"program");
    h+=seg({items:TSUBS.map(function(x){return [x[0],t(x[1])];}),value:ts,attr:"ctsub",soft:true,cls:"csub",label:t("Training"),key:"ctsub"});
    var sp=split();
    if(ts==="programs")h+=programsPage();
    else if(ts==="exercises")h+=exercisesPage();
    else h+=builderBody(sp,S.activeProgram,true)+weekOffer(sp);
    return h;}
  if(sec==="food"){
    var fs=pick(V.cfsub,FSUBS,"plan");
    h+=seg({items:FSUBS.map(function(x){return [x[0],t(x[1])];}),value:fs,attr:"cfsub",soft:true,cls:"csub",label:t("Nutrition"),key:"cfsub"});
    if(fs==="targets")h+=vTargets();
    else if(fs==="foods")h+=vMyFoods();
    else h+=vPlan();
    return h;}
  return h+vCoachAI();}

/* Coach AI. Before the assessment, only the way to start it; after, the coach's page:
   this week, what it noticed, a box to ask it anything, and the plan it built. */
function vCoachAI(){
  var h='';
  if(!S.onboarded){
    h+='<div class="coachhero">'+art("wall",{cls:"coachhero-art"})
     +'<span class="shk">'+t("Coach")+'</span>'
     +'<h2>'+t("Your plan, built for you")+'</h2>'
     +'<p>'+esc(t("Answer a short assessment: your goal, body, week, equipment, sore spots and how you eat. The coach builds your training and your meals, and puts them on the Training and Food pages. Nothing changes until you say so."))+'</p>'
     +'<button class="btn" data-setup="1">'+t("Start the assessment")+'</button></div>';
    return h;}
  h+=weekCard();
  h+=adviceBody();
  /* The conversation is reached from the floating Coach button only (js/ui/coachfab.js). */
  h+=planTiles();
  /* The small print belongs to the advice: a week with nothing to say has none. */
  if(V.advice)h+=adviceNote();
  return h;}

/* ---- this week, at a glance ----------------------------------------------------
   The coach's mark and what it makes of things (on track, or how many things it has
   noticed), then a gauge of this week's workouts done against those planned, the way
   the reference draws a track record: a half-ring of ticks filled to the share, with a
   dot where it stands. Under it, three figures in rings: workouts, the days protein
   reached its target so far this week, and the streak. */
function weekCard(){
  var sp=split(),now=today(),done=0,plan=0,pdays=0,sofar=0,g=S.goals||{},n=V.advice||0,p=S.profile||{};
  weekDates(now).forEach(function(iso){
    if(sp){var d=planOn(sp,iso);
      if(d.kind==="done")done++;
      if(d.kind==="done"||(d.kind!=="past"&&!d.rest&&d.kind!=="none"))plan++;}
    if(iso>now)return;
    sofar++;
    var items=[],ms=((S.days||{})[iso]||{}).meals||{};
    Object.keys(ms).forEach(function(k){items=items.concat((ms[k]&&ms[k].items)||[]);});
    if(items.length&&g.p&&sumNutrition(items).p>=g.p*0.9)pdays++;});
  var pct=plan?Math.min(1,done/plan):0,st=streak();
  var head=n?t(n===1?"1 thing to look at":"{n} things to look at").replace("{n}",n):t("On track");
  var sub=[t(goalOf(p.goal).label),sp?planName(sp.name):""].filter(Boolean).join(" · ");
  return '<section class="cweek">'
   +'<div class="cweek-top"><span class="cweek-mark" aria-hidden="true">'+glyph("whistle")+'</span>'
   +'<div class="cweek-t"><span class="shk">'+esc(t("Your coach"))+'</span><h2>'+esc(head)+'</h2>'
   +'<p>'+esc(sub)+'</p></div></div>'
   +'<div class="cweek-g" role="img" aria-label="'+esc(plan?done+" / "+plan+" "+t("of this week's workouts"):t("No workouts planned this week"))+'">'
   +gauge(pct,plan>0)
   +'<div class="cweek-gv" aria-hidden="true"><b>'+(plan?Math.round(pct*100)+'%':'—')+'</b>'
   +'<span>'+esc(plan?t("of this week's workouts"):t("No workouts planned this week"))+'</span></div></div>'
   +'<div class="cweek-s">'
   +stat("dumbbell",done+"/"+plan,t("Workouts"))
   +stat("shaker",pdays+"/"+sofar,t("Protein days"))
   +stat("flame",String(st),t(st===1?"Day in a row":"Days in a row"))
   +'</div></section>';}
function stat(gl,v,k){
  return '<div class="cweek-st"><span class="cweek-sti" aria-hidden="true">'+glyph(gl)+'</span>'
   +'<b>'+esc(v)+'</b><span>'+esc(k)+'</span></div>';}
/* 31 ticks over a half circle, every fifth a little longer; those up to the share are
   in the accent, and a dot in the theme's flag colour marks where it stands. */
function gauge(pct,live){
  var N=31,on=Math.round(pct*(N-1)),h='';
  for(var i=0;i<N;i++){
    var a=Math.PI*(1+i/(N-1)),c=Math.cos(a),s=Math.sin(a),r2=i%5===0?90:85;
    h+='<line x1="'+(100+72*c).toFixed(1)+'" y1="'+(98+72*s).toFixed(1)+'" x2="'+(100+r2*c).toFixed(1)+'" y2="'+(98+r2*s).toFixed(1)+'"'
     +(live&&i<=on&&pct>0?' class="on"':'')+'/>';}
  if(live){var am=Math.PI*(1+on/(N-1));
    h+='<circle cx="'+(100+62*Math.cos(am)).toFixed(1)+'" cy="'+(98+62*Math.sin(am)).toFixed(1)+'" r="4.5" class="dot"/>';}
  return '<svg class="cweek-svg" viewBox="0 0 200 104" aria-hidden="true">'+h+'</svg>';}

/* ---- the plan it built -----------------------------------------------------------
   Four tiles: the daily targets, the training, the meals, and the assessment that
   built them, to take again. Each opens where that part is planned. */
function planTiles(){
  var p=S.profile||{},g=S.goals||{},sp=split();
  var tdays=sp?sp.days.filter(function(d){return d.ex.length;}).length:0;
  var planned=mealSlots().filter(function(x){return (x.plan||[]).length;}),all=[];
  planned.forEach(function(x){all=all.concat(x.plan);});
  var mt=sumNutrition(all);
  return '<section class="cplan"><div class="tsec"><h2 class="tsec-h">'+t("Your plan")+'</h2>'
   +'<span class="libn">'+esc(t(goalOf(p.goal).label))+'</span></div>'
   +'<div class="cplan-g">'
   +tile('data-csec="food" data-cfsub="targets"',"bowl",t("Daily targets"),kcal(g.kcal),t("{n} g protein").replace("{n}",g.p||0))
   +tile('data-csec="train" data-ctsub="program"',"dumbbell",t("Training"),sp?planName(sp.name):t("No program yet"),
      sp?tdays+" "+t(tdays===1?"training day":"training days"):"")
   +tile('data-csec="food" data-cfsub="plan"',"clipboard",t("Meals"),
      planned.length?planned.length+" "+t(planned.length===1?"meal planned":"meals planned"):t("No meal plan yet"),
      planned.length?kcal(mt.kcal):"")
   +tile('data-setup="1"',"restore",t("Assessment"),t("Take it again"),t("Rebuilds both plans"))
   +'</div><button class="btn g sm cplan-gen" data-pgen="1">'+t("New meal plan from my targets")+'</button></section>';}
function kcal(n){return t("{n} kcal").replace("{n}",fmtN(Math.round(n||0)));}
function tile(attr,gl,k,v,s){
  return '<button class="cplan-t" '+attr+'><span class="gtile">'+glyph(gl)+'</span>'
   +'<span class="cplan-k">'+esc(k)+'</span><b class="cplan-v">'+esc(v)+'</b>'
   +(s?'<span class="cplan-s">'+esc(s)+'</span>':'')+'</button>';}

export {vCoach};

/* Bunyan — Coach
   Where the planning lives, so Training and Food can stay simple. Three sections:
     Training   planned by hand: the active program's days, other programs, templates,
                a coach's PDF brought in, the exercise library.
     Nutrition  planned by hand: the meal plan, the daily targets, foods of your own,
                a meal plan brought in.
     Coach AI   planned for you: the assessment reads the person and builds both plans
                at once, and they land on the Training and Food pages. Then what the plan
                check and the coach see, one card each.
   A screen opened from a section (a program's builder, the library, one meal's plan, an
   import) opens over it, and back returns to the section. */
import {t} from "../../i18n/dict.js";
import {planName} from "../../i18n/exnames.js";
import {goalOf} from "../../data/goals.js";
import {LEVELS} from "../../engine/plan.js";
import {mealSlots} from "../../engine/meals.js";
import {sumNutrition} from "../../engine/nutrition.js";
import {S, split} from "../../state.js";
import {esc, fmtN} from "../../util.js";
import {seg, V} from "../view.js";
import {art} from "../art.js";
import {builderBody, exercisesPage, programsPage, trainSub, weekOffer} from "./train.js";
import {foodSub, vMyFoods, vPlan, vTargets} from "./food.js";
import {adviceBody, adviceCount} from "./pcheck.js";

var CSECS=[["train","Training"],["food","Nutrition"],["ai","Coach AI"]];
var TSUBS=[["program","My program"],["programs","Programs"],["exercises","Exercises"]];
var FSUBS=[["plan","Meal plan"],["targets","Targets"],["foods","My foods"]];
function pick(v,list,dflt){return list.some(function(x){return x[0]===v;})?v:dflt;}
function csec(){return pick(V.csec||S.prefs.csec,CSECS,"ai");}

function vCoach(){
  var sub=trainSub();if(sub!=null)return sub;
  sub=foodSub();if(sub!=null)return sub;
  var sec=csec(),n=adviceCount(),h='';
  h+='<div class="thead"><div><h1>'+t("Coach")+'</h1>'
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

/* Coach AI: the assessment and what it built, then the advice. */
function vCoachAI(){
  var h='';
  if(!S.onboarded){
    h+='<div class="coachhero">'+art("wall",{cls:"coachhero-art"})
     +'<span class="shk">'+t("Coach AI")+'</span>'
     +'<h2>'+t("Your plan, built for you")+'</h2>'
     +'<p>'+esc(t("Answer a short assessment: your goal, body, week, equipment, sore spots and how you eat. The coach builds your training and your meals, and puts them on the Training and Food pages. Nothing changes until you say so."))+'</p>'
     +'<button class="btn" data-setup="1">'+t("Start the assessment")+'</button></div>';
    return h;}
  var p=S.profile||{},G=goalOf(p.goal),g=S.goals||{},sp=split();
  var tdays=sp?sp.days.filter(function(d){return d.ex.length;}).length:0;
  var sl=mealSlots(),planned=sl.filter(function(x){return (x.plan||[]).length;}),all=[];
  planned.forEach(function(x){all=all.concat(x.plan);});
  var mt=sumNutrition(all);
  h+='<section class="coachplan"><span class="shk">'+t("Your plan")+'</span>'
   +'<h2>'+esc(t(G.label))+'</h2>'
   +'<p class="coachplan-s">'+esc([LEVELS[p.level]?t(LEVELS[p.level].label):"",p.days?p.days+" "+t("days a week"):"",p.mins?p.mins+" "+t("min"):""].filter(Boolean).join(" · "))+'</p>'
   +'<div class="coachplan-r">'
   +row(t("Daily targets"),fmtN(g.kcal)+' kcal · '+t("Protein")+' '+(g.p||0)+' g',"food","targets")
   +row(t("Training"),sp?planName(sp.name)+' · '+tdays+' '+t(tdays===1?"training day":"training days"):t("No program yet"),"train","program")
   +row(t("Meals"),planned.length?planned.length+' '+t(planned.length===1?"meal planned":"meals planned")+' · '+fmtN(mt.kcal)+' kcal':t("No meal plan yet"),"food","plan")
   +'</div>'
   +'<div class="coachplan-a"><button class="btn g sm" data-setup="1">'+t("Retake the assessment")+'</button>'
   +'<button class="btn g sm" data-pgen="1">'+t("New meal plan from my targets")+'</button></div></section>';
  h+=adviceBody();
  return h;}
/* A line of the plan; tapping it opens where it is planned. */
function row(k,v,sec,sub){
  return '<button class="coachplan-l" data-csec="'+sec+'" data-'+(sec==="train"?"ctsub":"cfsub")+'="'+sub+'">'
   +'<span class="coachplan-k">'+esc(k)+'</span><span class="coachplan-v">'+esc(v)+'</span>'
   +'<span class="ico ico-chev" aria-hidden="true"></span></button>';}

export {vCoach};

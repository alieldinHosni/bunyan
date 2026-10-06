/* Bunyan — the assessment
   A few minutes of questions, one screen each, and then the plan they add up to:
   daily targets, the training plan with its weekly volume and effort, and a meal
   plan from the food database on request. It replaces the four-question setup
   sheet, which could not tell a sore back from a full gym or a vegetarian from
   anyone else.

   Answers are a draft (V.asd) until "Use this plan": backing out changes nothing.
   The result is worked out from the draft without touching what is saved, so what
   is shown is exactly what "Use this plan" would do. Every number on it says where
   it came from. */
import {t, tm} from "../../i18n/dict.js";
import {GOAL_ORDER, GOALS, goalOf, trainOf} from "../../data/goals.js";
import {dayMinutes, generatePlan, LEVELS, splitCandidates} from "../../engine/plan.js";
import {lastWeight, macroTargets, tdee} from "../../engine/formulas.js";
import {volumeCheck} from "../../engine/volume.js";
import {buildMealPlan} from "../../engine/mealplan.js";
import {FOODDB, sumNutrition} from "../../engine/nutrition.js";
import {exName, planName} from "../../i18n/exnames.js";
import {S} from "../../state.js";
import {toDisp, toKg, wUnit} from "../../units.js";
import {esc, fmtN, num, today} from "../../util.js";
import {V} from "../view.js";
import {backArrow} from "../nav.js";
import {importName} from "./food.js";

/* Equipment as a choice of three, and what each means in the equipment list. */
var GEARS={gym:null,home:["Dumbbell","Band","Kettlebell"],bw:["Bodyweight"]};
function gearKind(g){
  if(!g||!g.length||g.indexOf("Machine")>=0||g.indexOf("Barbell")>=0)return "gym";
  return g.indexOf("Dumbbell")>=0?"home":"bw";}
/* Daily life, as the base of the energy multiplier; training days add to it. A desk
   job and three sessions comes to about 1.35, a physical job and five to 1.75 —
   the usual sedentary-to-very-active scale, built from two answers instead of one
   that mixed them. */
var JOB={desk:1.2,some:1.3,feet:1.4,physical:1.5};
function activityOf(a){return Math.min(1.9,Math.round((JOB[a.job]||1.3)*1000+num(a.days)*50)/1000);}
var LIMITS=[["knee","Knees"],["back","Lower back"],["shoulder","Shoulders"],["wrist","Wrists"],["ankle","Ankles"]];
var AVOIDS=[["dairy","Dairy"],["eggs","Eggs"],["fish","Fish and seafood"],["nuts","Nuts"],["gluten","Gluten"]];
var STEPS=["intro","you","goal","level","week","gear","life","limits","food","sleep","result"];

function draftFrom(){
  var p=S.profile||{},pr=S.prefs||{};
  return {step:0,sex:p.sex||"m",age:num(p.age)||"",height:num(p.height)||"",
    weight:lastWeight()||num(p.weight)||"",goal:GOALS[p.goal]?p.goal:"lose",level:LEVELS[p.level]?p.level:"some",
    days:num(p.days)||3,mins:num(p.mins)||60,gear:gearKind(S.gear),job:p.job||"desk",limits:(p.limits||[]).slice(),
    meals:num(pr.meals)||4,diet:pr.diet||"any",avoid:(pr.avoid||[]).slice(),powder:!!pr.powder,style:pr.fstyle||"egy",
    sleep:num(p.sleep)||7.5,split:null,done:false};}

/* The profile the draft describes. */
function profileOf(a){
  return {sex:a.sex,age:num(a.age),height:num(a.height),weight:num(a.weight),goal:a.goal,level:a.level,
    days:num(a.days),mins:num(a.mins),job:a.job,activity:activityOf(a),limits:a.limits.slice(),sleep:num(a.sleep)};}
function foodPrefs(a,variant){
  return {meals:num(a.meals)||4,diet:a.diet,avoid:a.avoid.slice(),powder:!!a.powder,style:a.style,variant:variant||0};}

/* Everything "Use this plan" would set, worked out with the draft in place of what
   is saved, then put back. Cached on the answers. */
var CACHE={k:null,v:null};
function preview(a){
  var key=JSON.stringify([profileOf(a),a.gear,a.split,foodPrefs(a),!!FOODDB]);
  if(CACHE.k===key)return CACHE.v;
  var keep={profile:S.profile,gear:S.gear,body:S.body},out=null;
  try{
    S.profile=Object.assign({},S.profile,profileOf(a));
    S.gear=GEARS[a.gear]?GEARS[a.gear].slice():null;
    S.body=[{date:today(),weight:num(a.weight)}];
    var cands=[];try{cands=splitCandidates(num(a.days),a.level,a.goal,S.gear);}catch(e){}
    var plan=generatePlan(a.split||(cands[0]&&cands[0].id));
    var tg=macroTargets(),meals=null;
    /* The meals need the food database, which loads on the way to this screen. */
    if(FOODDB)try{meals=buildMealPlan(tg,foodPrefs(a));}catch(e){meals=null;}
    out={tg:tg,td:tdee(),plan:plan,cands:cands,vol:volumeCheck(plan,a.level),meals:meals};
  }finally{S.profile=keep.profile;S.gear=keep.gear;S.body=keep.body;}
  CACHE={k:key,v:out};
  return out;}

/* ---- pieces ------------------------------------------------------------------------- */
function chip(field,val,label,on,multi){
  return '<button class="aschip'+(on?' on':'')+'" data-'+(multi?'asm':'as')+'="'+field+'|'+esc(String(val))+'" aria-pressed="'+(on?"true":"false")+'">'+esc(label)+'</button>';}
function chips(field,list,cur){
  return '<div class="aschips">'+list.map(function(x){return chip(field,x[0],x[1],String(cur)===String(x[0]));}).join("")+'</div>';}
function mchips(field,list,cur){
  return '<div class="aschips">'+list.map(function(x){return chip(field,x[0],t(x[1]),cur.indexOf(x[0])>=0,true);}).join("")+'</div>';}
/* A choice that needs a line of explanation: a goal, a level, where you train. */
function card(field,val,title,desc,on){
  return '<button class="ascard'+(on?' on':'')+'" data-as="'+field+'|'+esc(String(val))+'" aria-pressed="'+(on?"true":"false")+'">'
   +'<b>'+esc(title)+'</b>'+(desc?'<span>'+esc(desc)+'</span>':'')+'</button>';}
function q(title,sub){return '<h2 class="as-q">'+esc(title)+'</h2>'+(sub?'<p class="as-sub">'+esc(sub)+'</p>':'');}
function lbl(text){return '<div class="as-l">'+esc(text)+'</div>';}

function youOk(a){
  var kg=num(a.weight);
  return num(a.age)>=13&&num(a.age)<=95&&num(a.height)>=120&&num(a.height)<=230&&kg>=30&&kg<=300;}

function body(a){
  var s=STEPS[a.step],h='';
  if(s==="intro"){
    h+='<div class="as-hero"><span class="shk">'+t("A few minutes")+'</span><h1>'+t("Let's build your plan")+'</h1>'
     +'<p class="as-sub">'+t("Ten short questions about you, your goal, your week and your food. From them: your daily targets, a training plan with the right volume and effort, and a meal plan from foods you eat.")+'</p>'
     +'<p class="as-sub">'+t("Everything stays on this phone. You see the whole plan before anything changes, and every part of it can be edited afterwards.")+'</p></div>';}
  else if(s==="you"){
    h+=q(t("About you"),t("For your calorie needs. Nothing leaves this phone."));
    h+=lbl(t("Sex"))+chips("sex",[["m",t("Male")],["f",t("Female")]],a.sex);
    h+='<div class="grid3 as-in">'
     +'<label><span>'+t("Age")+'</span><input id="as_age" type="number" inputmode="numeric" value="'+esc(String(a.age))+'"></label>'
     +'<label><span>'+t("Height (cm)")+'</span><input id="as_height" type="number" inputmode="numeric" value="'+esc(String(a.height))+'"></label>'
     +'<label><span>'+t("Weight")+' ('+wUnit()+')</span><input id="as_weight" type="number" inputmode="decimal" step="0.1" value="'+(num(a.weight)?toDisp(num(a.weight)):"")+'"></label></div>';}
  else if(s==="goal"){
    h+=q(t("What are you after most?"),t("One main goal. The plan is built around it; you can change it any time."));
    h+='<div class="ascards">'+GOAL_ORDER.map(function(k){return card("goal",k,t(GOALS[k].label),t(GOALS[k].desc),a.goal===k);}).join("")+'</div>';}
  else if(s==="level"){
    h+=q(t("How long have you been lifting?"),t("Consistently, not counting long breaks."));
    var LD={new:"New to it, or back after a long time off.",some:"Training regularly for six months or more.",
      experienced:"A couple of years, and you know the main lifts.",advanced:"Many years, and progress has slowed right down."};
    h+='<div class="ascards">'+Object.keys(LEVELS).map(function(k){return card("level",k,t(LEVELS[k].label),t(LD[k]),a.level===k);}).join("")+'</div>';}
  else if(s==="week"){
    h+=q(t("Your week"),t("What you can keep up on a normal week, not your best one."));
    h+=lbl(t("Days a week you can train"))+chips("days",[[2,"2"],[3,"3"],[4,"4"],[5,"5"],[6,"6"]],a.days);
    h+=lbl(t("Time for each session, warm-up included"))+chips("mins",[[30,"30 "+t("min")],[45,"45 "+t("min")],[60,"60 "+t("min")],[75,"75 "+t("min")],[90,"90 "+t("min")]],a.mins);}
  else if(s==="gear"){
    h+=q(t("Where do you train?"),t("Exercises you cannot do are swapped for ones that work the same muscles."));
    h+='<div class="ascards">'+card("gear","gym",t("A gym"),t("Machines, cables, barbells and dumbbells."),a.gear==="gym")
     +card("gear","home",t("At home, with dumbbells"),t("Dumbbells, bands or a kettlebell, and a bench or a chair."),a.gear==="home")
     +card("gear","bw",t("Bodyweight only"),t("The floor, and a bar or a door frame to pull on if you have one."),a.gear==="bw")+'</div>';}
  else if(s==="life"){
    h+=q(t("The rest of your day"),t("Outside training. It decides most of what you burn."));
    h+='<div class="ascards">'+card("job","desk",t("Mostly sitting"),t("A desk, a car, a sofa."),a.job==="desk")
     +card("job","some",t("Some walking"),t("On your feet now and then, errands, stairs."),a.job==="some")
     +card("job","feet",t("On my feet most of the day"),t("Shop floor, teaching, nursing, a lot of walking."),a.job==="feet")
     +card("job","physical",t("Physical work"),t("Lifting, carrying, building, farming."),a.job==="physical")+'</div>';}
  else if(s==="limits"){
    h+=q(t("Anything to work around?"),t("A sore spot steers the plan away from what loads it. This is not a diagnosis: pain that lasts or is sharp deserves a physio."));
    h+=mchips("limits",LIMITS,a.limits);
    h+='<p class="as-note">'+t(a.limits.length?"Leave these on only while they are a problem.":"Nothing selected: nothing is worked around.")+'</p>';}
  else if(s==="food"){
    h+=q(t("How you eat"),t("For the meal plan. It uses foods from the app's database, Egyptian home food first."));
    h+=lbl(t("Meals a day"))+chips("meals",[[3,"3"],[4,"4"],[5,"5"],[6,"6"]],a.meals);
    h+=lbl(t("Diet"))+chips("diet",[["any",t("Everything")],["veg",t("Vegetarian")],["pesc",t("Pescatarian")],["vegan",t("Vegan")]],a.diet);
    h+=lbl(t("Leave out"))+mchips("avoid",AVOIDS,a.avoid);
    h+=lbl(t("Protein powder"))+chips("powder",[["1",t("I use it")],["0",t("No powder")]],a.powder?"1":"0");
    h+=lbl(t("Food style"))+chips("style",[["egy",t("Egyptian home food")],["mixed",t("A mix")],["intl",t("International")]],a.style);}
  else if(s==="sleep"){
    h+=q(t("How do you sleep?"),t("Most nights. Short sleep slows recovery, so the plan asks a little less of you."));
    h+=chips("sleep",[[5,t("Under 6 hours")],[6.5,t("6 to 7 hours")],[8,t("7 to 9 hours")],[9.5,t("More than 9")]],a.sleep);}
  else if(s==="result")h+=result(a);
  return h;}

/* What the energy target means, said once: maintenance, the change, the pace. */
function kcalWhy(a,r){
  var d=r.tg.kcal-r.td,G=goalOf(a.goal);
  var line=t("Maintenance is about {m} kcal a day.").replace("{m}",fmtN(Math.round(r.td/10)*10));
  if(Math.abs(d)<40)return line+" "+t("Your target holds you there.");
  /* About 7,700 kcal to a kilo of body weight; a guide, not a promise. */
  var kg=Math.abs(d)*7/7700,pace=kg<0.15?t("slowly"):t("about {k} kg a week").replace("{k}",(Math.round(kg*20)/20).toFixed(2).replace(/0$/,""));
  return line+" "+t(d<0?"{d} kcal less a day, to lose {p}.":"{d} kcal more a day, to gain {p}.")
    .replace("{d}",fmtN(Math.abs(Math.round(d/10)*10))).replace("{p}",pace)
    +(G.kcal<0?" "+t("Eat at least this; much less and you lose muscle with the fat."):"");}

function result(a){
  var r=preview(a);
  if(!r)return '<p class="as-sub">'+t("Something went wrong working this out. Go back a step and try again.")+'</p>';
  var G=goalOf(a.goal),T=trainOf(a.goal),tg=r.tg,plan=r.plan,h='';
  h+='<div class="as-hero"><span class="shk">'+t("Your plan")+'</span><h1>'+esc(t(G.label))+'</h1>'
   +'<p class="as-sub">'+esc(t(LEVELS[a.level].label)+" · "+a.days+" "+t("days a week")+" · "+a.mins+" "+t("min"))+'</p></div>';
  if(a.done)h+='<div class="as-done" role="status">'+t("Your plan is in: today's training is on the Training page and today's meals on the Food page. Change anything in Coach.")+'</div>';
  /* Daily targets. */
  h+='<section class="ascard2"><h3>'+t("Daily targets")+'</h3>'
   +'<div class="as-kcal"><b>'+fmtN(tg.kcal)+'</b><span>kcal</span></div>'
   +'<p class="as-why">'+esc(kcalWhy(a,r))+'</p>'
   +'<div class="as-macros">'
   +'<div><b>'+tg.p+' g</b><span>'+t("Protein")+'</span></div>'
   +'<div><b>'+tg.c+' g</b><span>'+t("Carbs")+'</span></div>'
   +'<div><b>'+tg.f+' g</b><span>'+t("Fat")+'</span></div>'
   +(tg.water?'<div><b>'+(tg.water/1000).toFixed(2).replace(/0$/,"")+' L</b><span>'+t("Water")+'</span></div>':'')
   +(tg.steps?'<div><b>'+fmtN(tg.steps)+'</b><span>'+t("Steps")+'</span></div>':'')+'</div>'
   +'<p class="as-why">'+esc(t("Protein at {g} g per kg keeps and builds muscle; fat at about a quarter of your energy; carbs fuel the training.").replace("{g}",G.protein))+'</p></section>';
  /* Training. */
  var c0=r.cands.filter(function(c){return c.id===(a.split||(r.cands[0]&&r.cands[0].id));})[0];
  h+='<section class="ascard2"><h3>'+t("Training")+'</h3>'
   +'<div class="as-split"><b>'+esc(planName(plan.name))+'</b>'+(c0?'<span>'+esc(c0.why)+'</span>':'')+'</div>';
  if(r.cands.length>1)h+='<div class="aschips as-alt">'+r.cands.map(function(c){
      var on=c.id===(a.split||r.cands[0].id);
      return '<button class="aschip'+(on?' on':'')+'" data-assplit="'+esc(c.id)+'" aria-pressed="'+on+'">'+esc(planName(c.name))+'</button>';}).join("")+'</div>';
  h+='<div class="as-days">'+plan.days.filter(function(d){return d.ex.length;}).map(function(d){
      return '<div><b>'+esc(planName(d.name))+'</b><span>'+d.ex.length+' '+t("exercises")+' · ~'+Math.round(dayMinutes(d)/5)*5+' '+t("min")+'</span></div>';}).join("")+'</div>';
  h+='<p class="as-why">'+esc(t("Effort: stop each set with {a} reps left in reserve on the main lift and {b} on the rest. That is close enough to failure to grow, far enough to recover.").replace("{a}",T.rir[0]).replace("{b}",T.rir[1]))+'</p>';
  if(T.add)h+='<p class="as-why">'+esc(t(T.add==="plyo"?"Jumps open each session, while you are fresh.":T.add==="cond"?"Each session ends with twelve minutes of intervals.":"Each session ends with mobility work for what it trained."))+'</p>';
  /* Weekly sets per muscle, against the range for the level. */
  var mx=Math.max.apply(null,r.vol.map(function(v){return Math.max(v.sets,v.hi);}).concat([1]));
  h+='<div class="as-l">'+t("Hard sets a week, by muscle")+'</div><div class="as-vol">'
   +r.vol.map(function(v){
      return '<div class="as-vr '+v.status+'"><span>'+esc(tm(v.m))+'</span>'
       +'<i><em style="inset-inline-start:'+(v.lo/mx*100)+'%;width:'+((v.hi-v.lo)/mx*100)+'%"></em><b style="width:'+(Math.min(v.sets,mx)/mx*100)+'%"></b></i>'
       +'<span class="num">'+v.sets+'</span></div>';}).join("")+'</div>'
   +'<p class="as-note">'+esc(t("The shaded band is a typical range for your experience: {lo}–{hi} sets. It is a starting point, not a rule; how you recover decides.").replace("{lo}",r.vol[0].lo).replace("{hi}",r.vol[0].hi))+'</p>';
  var sw=plan.meta&&plan.meta.swaps||[];
  if(sw.length)h+='<div class="as-l">'+t("Swapped for your equipment and sore spots")+'</div><ul class="as-swaps">'
    +sw.map(function(x){return '<li>'+esc(exName(x[0]))+' → <b>'+esc(exName(x[1]))+'</b></li>';}).join("")+'</ul>';
  h+='</section>';
  /* Meals: the day's targets as food, in the meals and style asked for. */
  h+='<section class="ascard2"><h3>'+t("Meals")+'</h3>';
  if(!r.meals)h+='<p class="as-why">'+esc(t("Putting your meals together…"))+'</p>';
  else{
    var all=[];r.meals.forEach(function(m){all=all.concat(m.items);});
    var mt=sumNutrition(all);
    h+='<div class="as-days as-meals">'+r.meals.map(function(m,i){
        var tot=sumNutrition(m.items);
        return '<div><b>'+esc(importName(m,i))+'</b><span>'+fmtN(tot.kcal)+' kcal · '+t("P:")+' '+tot.p+'g</span>'
         +'<small>'+esc(m.items.map(function(x){return x.n;}).join(", "))+'</small></div>';}).join("")+'</div>'
     +'<p class="as-why">'+esc(t("The day comes to {k} kcal and {p} g of protein. Every food and amount can be changed in Coach → Nutrition.").replace("{k}",fmtN(mt.kcal)).replace("{p}",mt.p))+'</p>';}
  h+='</section>';
  h+='<p class="as-note">'+t("Bunyan is a training log, not medical advice. If you have an injury or a health condition, check with a professional first, and stop any exercise that causes sharp pain.")+'</p>';
  if(!a.done)h+='<div class="dcta"><button class="btn dbegin" data-asuse="1">'+t("Use this plan")+'</button>'
    +'<p class="bnote">'+t("Sets your daily targets, makes this your training and fills your meals. Your history stays as it is.")+'</p></div>';
  else h+='<div class="dcta"><button class="btn dbegin" data-astrain="1">'+t("Today's training")+'</button>'
    +'<button class="btn g" data-asfood="1">'+t("Today's food")+'</button></div>';
  return h;}

function vAssess(){
  var a=V.asd||(V.asd=draftFrom()),s=STEPS[a.step],n=STEPS.length-2;
  var h='<div class="dhead">'+backArrow()+'<h1 class="dhead-t">'+t("Assessment")+'</h1></div>';
  if(s!=="intro"&&s!=="result")
    h+='<div class="as-prog" role="progressbar" aria-valuemin="1" aria-valuemax="'+n+'" aria-valuenow="'+a.step+'"><i style="width:'+(a.step/n*100)+'%"></i></div>'
     +'<p class="as-count">'+t("Question {i} of {n}").replace("{i}",a.step).replace("{n}",n)+'</p>';
  h+='<div class="as">'+body(a)+'</div>';
  if(s!=="result"){
    /* Checked on Next rather than by disabling it: typing must not redraw the screen. */
    h+='<div class="as-nav">'
     +(a.step>0?'<button class="btn g" data-asback="1">'+t("Back")+'</button>':'')
     +'<button class="btn" data-asnext="1">'+t(s==="intro"?"Start":s==="sleep"?"See my plan":"Next")+'</button></div>';}
  else if(!a.done)h+='<div class="as-nav"><button class="btn g" data-asback="1">'+t("Back")+'</button></div>';
  return h;}

export {activityOf, draftFrom, foodPrefs, GEARS, preview, profileOf, STEPS, vAssess, youOk};

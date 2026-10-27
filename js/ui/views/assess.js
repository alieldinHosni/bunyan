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
import {importName} from "../../engine/meals.js";
import {ceilingFor} from "../../coach/landmarks.js";
import * as KB from "../../engine/kb.js";
import {exThumb} from "../../data/exercises.js";
import {doseText} from "../dose.js";
import {glyph} from "../glyphs.js";

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
/* The health questions before a new programme: the PAR-Q+ topics as the knowledge base
   paraphrases them (js/knowledge/assessments.js SCREENING.parq.logic; the instrument
   itself is not reproduced). The book's rule: screen every new exerciser first. */
var HEALTH=[["heart","A heart condition or high blood pressure, as a doctor told you"],["chest","Chest pain at rest, in daily life or when active"],
  ["dizzy","Dizziness that cost you your balance, or fainting, in the last 12 months"],["chronic","Another long-term condition a doctor diagnosed"],
  ["meds","Medication prescribed for a long-term condition"],["joint","A bone, joint or muscle problem in the last year that activity could worsen"],
  ["supervised","A doctor said to exercise only under medical supervision"]];
var STEPS=["intro","you","goal","level","week","gear","life","limits","health","food","sleep","result"];

function draftFrom(){
  var p=S.profile||{},pr=S.prefs||{};
  return {step:0,sex:p.sex||"m",age:num(p.age)||"",height:num(p.height)||"",
    weight:lastWeight()||num(p.weight)||"",goal:GOALS[p.goal]?p.goal:"lose",level:LEVELS[p.level]?p.level:"some",
    days:num(p.days)||3,mins:num(p.mins)||60,gear:gearKind(S.gear),job:p.job||"desk",limits:(p.limits||[]).slice(),health:(p.health||[]).slice(),
    meals:num(pr.meals)||4,diet:pr.diet||"any",avoid:(pr.avoid||[]).slice(),powder:!!pr.powder,style:pr.fstyle||"egy",
    sleep:num(p.sleep)||7.5,split:null,done:false};}

/* The profile the draft describes. */
function profileOf(a){
  return {sex:a.sex,age:num(a.age),height:num(a.height),weight:num(a.weight),goal:a.goal,level:a.level,
    days:num(a.days),mins:num(a.mins),job:a.job,activity:activityOf(a),limits:a.limits.slice(),health:(a.health||[]).slice(),sleep:num(a.sleep)};}
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
    /* The assessment asks for a weight before this step (youOk); without one there are no targets. */
    if(!tg)return out;
    /* The meals need the food database, which loads on the way to this screen. */
    if(FOODDB)try{meals=buildMealPlan(tg,foodPrefs(a));}catch(e){meals=null;}
    out={tg:tg,td:tdee(),plan:plan,cands:cands,vol:volumeCheck(plan,a.level,goalOf(a.goal).train),meals:meals};
  }finally{S.profile=keep.profile;S.gear=keep.gear;S.body=keep.body;}
  CACHE={k:key,v:out};
  return out;}

function fill(x,o){Object.keys(o).forEach(function(k){x=x.split("{"+k+"}").join(o[k]);});return x;}
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
    /* The textbook's sessions a week for this much experience (acute-variables). */
    var fr=KB.frequency(a.level),pw=fr&&fr.per;
    var lo=pw?(pw.min!=null?pw.min:Math.min(pw.totalBody||3,pw.split||4)):0,hi=pw?(pw.max!=null?pw.max:Math.max(pw.totalBody||3,pw.split||4)):0;
    if(lo)h+='<p class="as-note">'+fill(t("For your experience, {lo}–{hi} sessions a week is the usual range."),{lo:lo,hi:hi})+'</p>';
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
  else if(s==="health"){
    h+=q(t("Your health"),t("The standard questions before starting a new programme. Tick any that apply to you."));
    h+=mchips("health",HEALTH,a.health||[]);
    h+='<p class="as-note">'+t((a.health||[]).length
      ?"Then check with your doctor or a qualified exercise professional before hard training. Until then your plan keeps to low and moderate effort: no jumps and no intervals."
      :"None ticked: you're clear to start. Build up gradually.")+'</p>';
    if(num(a.age)>45)h+='<p class="as-note">'+t("Over 45 and not used to hard efforts? Check with a qualified exercise professional before training at a vigorous intensity.")+'</p>';}
  else if(s==="food"){
    h+=q(t("How you eat"),t("For the meal plan. It uses foods from the app's database, Egyptian home food first."));
    h+=lbl(t("Meals a day"))+chips("meals",[[3,"3"],[4,"4"],[5,"5"],[6,"6"]],a.meals);
    h+=lbl(t("Diet"))+chips("diet",[["any",t("Everything")],["veg",t("Vegetarian")],["pesc",t("Pescatarian")],["vegan",t("Vegan")]],a.diet);
    h+=lbl(t("Leave out"))+mchips("avoid",AVOIDS,a.avoid);
    h+=lbl(t("Protein powder"))+chips("powder",[["1",t("I use it")],["0",t("No powder")]],a.powder?"1":"0");
    h+=lbl(t("Food style"))+chips("style",[["egy",t("Egyptian home food")],["mixed",t("A mix")],["intl",t("International")]],a.style);}
  else if(s==="sleep"){
    h+=q(t("How do you sleep?"),t("Most nights. Short sleep slows recovery, so the plan asks a little less of you."));
    h+=chips("sleep",[[5,t("Under 6 hours")],[6.5,t("6 to 7 hours")],[8,t("7 to 9 hours")],[9.5,t("More than 9")]],a.sleep);
    var sl=KB.sleep();
    if(sl)h+='<p class="as-note">'+fill(t("Adults do best on {lo} to {hi} hours a night."),{lo:sl.min,hi:sl.max})+'</p>';}
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

/* The result, as the owner drew it (26 Oct): the goal, then three cards — the day's
   targets as tiles, the training as its days (each with its first exercise's picture,
   opening to the whole day) and its weekly load per muscle, and the meals as cards —
   and Back and Use this plan side by side. */
var MUSCLE_INK={Chest:"--accent",Back:"--mac-p",Shoulders:"--gold",Quads:"--accentHi",Hamstrings:"--ok",Glutes:"--mac-f",Biceps:"--mac-c",Triceps:"--warning"};
var MEAL_GLYPH=[[/breakfast|فطار|فطور/i,"grain"],[/lunch|غدا/i,"bowl"],[/dinner|عشا/i,"flame"],[/snack|سناك/i,"avocado"]];
function mealGlyph(name){for(var i=0;i<MEAL_GLYPH.length;i++)if(MEAL_GLYPH[i][0].test(name))return MEAL_GLYPH[i][1];return "bowl";}
/* A food by its Arabic name where the database has one, as the Food page shows it. */
function foodLabel(x){
  if(S.prefs.lang!=="ar"||!FOODDB)return x.n;
  var f=FOODDB.filter(function(y){return y.id===x.fid;})[0],a=f&&(f.a||[]).filter(function(z){return /[\u0600-\u06FF]/.test(z);})[0];
  return a||x.n;}
function tile(ico,v,label){return '<div class="as-tile">'+glyph(ico)+'<b class="num">'+v+'</b><span>'+esc(label)+'</span></div>';}
function cardHead(ico,label){return '<div class="as-ch">'+glyph(ico)+'<span>'+esc(label)+'</span></div>';}
function result(a){
  var r=preview(a);
  if(!r)return '<p class="as-sub">'+t("Something went wrong working this out. Go back a step and try again.")+'</p>';
  var G=goalOf(a.goal),T=trainOf(a.goal),tg=r.tg,plan=r.plan,h='';
  h+='<div class="as-hero"><span class="shk">'+t("Your plan")+'</span><h1>'+esc(t(G.label))+'</h1>'
   +'<p class="as-sub">'+esc(t(LEVELS[a.level].label)+" · "+a.days+" "+t("days a week")+" · "+a.mins+" "+t("min"))+'</p></div>';
  if((a.health||[]).length)h+='<div class="as-warn" role="note">'+glyph("info")+'<span>'+t("You ticked a health question: check with your doctor or a qualified exercise professional before hard training. This plan keeps to low and moderate effort.")+'</span></div>';
  if(a.done)h+='<div class="as-done" role="status">'+t("Your plan is in: today's training is on the Training page and today's meals on the Food page. Change anything in Coach.")+'</div>';
  /* Daily targets. */
  h+='<section class="ascard2">'+cardHead("target",t("Daily targets"))
   +'<div class="as-kcal"><b class="num">'+fmtN(tg.kcal)+'</b><span>'+t("kcal")+'</span></div>'
   +'<p class="as-why">'+esc(kcalWhy(a,r))+'</p>'
   +'<div class="as-tiles">'+tile("shaker",tg.p+" g",t("Protein"))+tile("grain",tg.c+" g",t("Carbs"))+tile("avocado",tg.f+" g",t("Fat"))
   +(tg.water?tile("drop",(tg.water/1000).toFixed(1)+" L",t("Water")):'')
   +(tg.steps?tile("route",fmtN(tg.steps),t("Steps")):'')+'</div>'
   +'<p class="as-note">'+esc(t("Protein at {g} g per kg keeps and builds muscle; fat at about a quarter of your energy; carbs fuel the training.").replace("{g}",G.protein))+'</p></section>';
  /* Training. */
  var c0=r.cands.filter(function(c){return c.id===(a.split||(r.cands[0]&&r.cands[0].id));})[0];
  h+='<section class="ascard2">'+cardHead("dumbbell",t("Training"))
   +'<h2 class="as-split">'+esc(planName(plan.name))+'</h2>'+(c0?'<p class="as-why">'+esc(c0.why)+'</p>':'');
  if(r.cands.length>1)h+='<div class="aschips as-alt">'+r.cands.map(function(c){
      var on=c.id===(a.split||r.cands[0].id);
      return '<button class="aschip'+(on?' on':'')+'" data-assplit="'+esc(c.id)+'" aria-pressed="'+on+'">'+esc(planName(c.name))+'</button>';}).join("")+'</div>';
  h+='<div class="as-days">'+plan.days.filter(function(d){return d.ex.length;}).map(function(d){
      var names=d.ex.slice(0,3).map(function(e){return exName(e.name);}).join(", ");
      return '<details class="as-day"><summary><img class="as-th" src="'+esc(exThumb(d.ex[0].name))+'" alt="" loading="lazy" decoding="async">'
       +'<span class="as-dt"><b>'+esc(planName(d.name))+'</b><small>'+esc(names)+'</small></span>'
       +'<span class="as-dm"><span class="num">'+d.ex.length+'</span> '+esc(t("exercises"))+'<br>~<span class="num">'+Math.round(dayMinutes(d)/5)*5+'</span> '+esc(t("min"))+'</span>'
       +glyph("chev","as-chev")+'</summary>'
       +'<ul class="as-dex">'+d.ex.map(function(e){return '<li><span>'+esc(exName(e.name))+'</span><span class="num">'+esc(doseText(e))+'</span></li>';}).join("")+'</ul></details>';}).join("")+'</div>';
  h+='<p class="as-note">'+esc(t("Effort: stop each set with {a} reps left in reserve on the main lift and {b} on the rest. That is close enough to failure to grow, far enough to recover.").replace("{a}",T.rir[0]).replace("{b}",T.rir[1]))
   +(T.add&&(T.add==="mob"||!(a.health||[]).length)?" "+esc(t(T.add==="plyo"?"Jumps open each session, while you are fresh.":T.add==="cond"?"Each session ends with twelve minutes of intervals.":"Each session ends with mobility work for what it trained.")):"")+'</p>';
  /* Weekly sets per muscle: against the range where the goal is muscle, against the
     ceiling of what most people recover from otherwise. */
  var top=ceilingFor(a.level),ranged=r.vol[0]&&r.vol[0].lo!=null;
  h+='<div class="as-ch as-ch2">'+glyph("bars")+'<span>'+esc(t("Weekly training load"))+'</span></div><div class="as-vol">'
   +r.vol.map(function(v){
      return '<div class="as-vr '+v.status+'" style="--ink:var('+(MUSCLE_INK[v.m]||"--accent")+')"><span>'+esc(tm(v.m))+'</span>'
       +'<i>'+(ranged?'<em style="inset-inline-start:'+(v.lo/top*100)+'%;width:'+(Math.min(v.hi,top)-v.lo)/top*100+'%"></em>':'')
       +'<b style="width:'+(Math.min(v.sets,top)/top*100)+'%"></b></i>'
       +'<span class="num">'+v.sets+' / '+top+'</span></div>';}).join("")+'</div>'
   +'<p class="as-note">'+esc(ranged
      ?t("Hard sets a week. The shaded band is a typical range for your experience: {lo}–{hi} sets. It is a starting point, not a rule; how you recover decides.").replace("{lo}",r.vol[0].lo).replace("{hi}",r.vol[0].hi)
      :t("Hard sets a week, out of {n}, about the most people recover from. Your goal isn't muscle size, so there is no weekly target per muscle: each exercise's sets and rest follow your goal.").replace("{n}",top))+'</p>';
  var sw=plan.meta&&plan.meta.swaps||[];
  if(sw.length)h+='<div class="as-l">'+t("Swapped for your equipment and sore spots")+'</div><ul class="as-swaps">'
    +sw.map(function(x){return '<li>'+esc(exName(x[0]))+' → <b>'+esc(exName(x[1]))+'</b></li>';}).join("")+'</ul>';
  h+='</section>';
  /* Meals: the day's targets as food, in the meals and style asked for. */
  h+='<section class="ascard2">'+cardHead("bowl",t("Meal plan"));
  if(!r.meals)h+='<p class="as-why">'+esc(t("Putting your meals together…"))+'</p>';
  else{
    var all=[];r.meals.forEach(function(m){all=all.concat(m.items);});
    var mt=sumNutrition(all);
    h+='<div class="as-meals">'+r.meals.map(function(m,i){
        var tot=sumNutrition(m.items),nm=importName(m,i);
        return '<div class="as-meal"><details><summary><span class="as-mi">'+glyph(mealGlyph(nm))+'</span>'
         +'<span class="as-mt"><b>'+esc(nm)+'</b><small>'+esc(m.items.slice(0,3).map(foodLabel).join(S.prefs.lang==="ar"?"، ":", "))+'</small>'
         +'<small><span class="num">'+fmtN(tot.kcal)+'</span> '+t("kcal")+' · <span class="num">'+tot.p+'</span> g '+esc(t("protein"))+'</small></span>'+glyph("chev","as-chev")+'</summary>'
         +'<ul class="as-dex">'+m.items.map(function(x){return '<li><span>'+esc(foodLabel(x))+'</span><span class="num">'+esc(x.label||"")+'</span></li>';}).join("")+'</ul></details></div>';}).join("")+'</div>'
     +'<p class="as-note">'+esc(t("The day comes to {k} kcal and {p} g of protein. Every food and amount can be changed in Coach → Nutrition.").replace("{k}",fmtN(mt.kcal)).replace("{p}",mt.p))+'</p>';}
  h+='</section>';
  h+='<p class="as-note as-disc">'+glyph("info")+'<span>'+t("Bunyan is a training log, not medical advice. If you have an injury or a health condition, check with a professional first, and stop any exercise that causes sharp pain.")+'</span></p>';
  if(!a.done)h+='<div class="as-cta"><button class="btn g" data-asback="1">'+glyph("arrow","as-back")+t("Back")+'</button>'
    +'<button class="btn dbegin" data-asuse="1">'+glyph("check")+t("Use this plan")+'</button></div>'
    +'<p class="bnote">'+t("Sets your daily targets, makes this your training and fills your meals. Your history stays as it is.")+'</p>';
  else h+='<div class="as-cta"><button class="btn g" data-asfood="1">'+t("Today's food")+'</button>'
    +'<button class="btn dbegin" data-astrain="1">'+t("Today's training")+'</button></div>';
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
  return h;}

export {activityOf, draftFrom, foodPrefs, GEARS, preview, profileOf, STEPS, vAssess, youOk};

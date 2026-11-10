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
import {EXTRA_MAX, EXTRA_OK, GOAL_ORDER, GOALS, goalOf, goalsOf, trainOf} from "../../data/goals.js";
import {focusMuscles, partLabel, partsOf} from "../../data/parts.js";
import {bodyView} from "../../data/bodymap.js";
import {BUILT, dayMinutes, generatePlan, LEVELS, splitCandidates} from "../../engine/plan.js";
import {wdName, weekOrder} from "../../engine/schedule.js";
import {lastWeight, macroTargets, tdee} from "../../engine/formulas.js";
import {volumeCheck} from "../../engine/volume.js";
import {allowed, buildMealPlan, plateFoods} from "../../engine/mealplan.js";
import {FOODDB, foodById, foodName, ownFood, sumNutrition} from "../../engine/nutrition.js";
import {exName, planName} from "../../i18n/exnames.js";
import {S} from "../../state.js";
import {fmtW, toDisp, toKg, wUnit} from "../../units.js";
import {esc, fmtN, num, today} from "../../util.js";
import {V} from "../view.js";
import {backArrow} from "../nav.js";
import {importName} from "../../engine/meals.js";
import {ceilingFor} from "../../coach/landmarks.js";
import * as KB from "../../engine/kb.js";
import {exThumb} from "../../data/exercises.js";
import {doseText} from "../dose.js";
import {glyph} from "../glyphs.js";
import {condLines, CONDS_ASK, rulesFor} from "../../engine/conditions.js";
import {FAULTS_ASK} from "../../engine/corrective.js";
import {condCard} from "../dose.js";

/* Equipment as a choice of three, and what each means in the equipment list. */
var GEARS={gym:null,home:["Dumbbell","Band","Kettlebell"],bw:["Bodyweight"]};
/* Or exactly what someone has (owner, 10 Nov: "are those the only options?"): the
   library's own equipment kinds, each a chip; bodyweight is always in. The builder and
   the swaps match on these (js/engine/plan.js usable). */
var KIT=["Barbell","Dumbbell","Kettlebell","Band","Cable","Machine"];
function gearOf(a){
  if(a.gear==="custom"&&a.gearx&&a.gearx.length)return a.gearx.concat(["Bodyweight"]);
  return GEARS[a.gear]?GEARS[a.gear].slice():null;}
/* What a saved equipment list is: one of the three, or a list of its own. */
function gearDraft(g){
  var k=gearKind(g);if(!g||!g.length)return {gear:"gym",gearx:null};
  var own=KIT.filter(function(x){return g.indexOf(x)>=0;});
  var same=function(p){return p&&p.filter(function(x){return x!=="Bodyweight";}).sort().join()===own.slice().sort().join();};
  if(k==="gym"&&own.length===KIT.length)return {gear:"gym",gearx:null};
  if(same(GEARS[k]))return {gear:k,gearx:null};
  return own.length?{gear:"custom",gearx:own}:{gear:"bw",gearx:null};}
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
var STEPS=["intro","you","goal","level","week","gear","focus","life","limits","health","food","sleep","result"];
/* The muscles someone can ask to bring up (up to FOCUS_MAX), and the big lifts someone
   can say they will not do: those are hidden from the plan, as the ⋯ menu's "Never
   suggest" would, and the week is built without them. */
var FOCUS=[["Chest","Chest"],["Back","Back"],["Shoulders","Shoulders"],["Biceps","Biceps"],["Triceps","Triceps"],["Forearms","Forearms"],
  ["Quads","Quads"],["Hamstrings","Hamstrings"],["Glutes","Glutes"],["Adductors","Inner thighs"],["Calves","Calves"],["Core","Core"]];
/* The muscles by region, as someone looks for them (owner, 10 Nov: "organized and
   engineered better to be more easy"): upper body, arms, legs, the middle. */
var REGIONS=[["Upper body",["Chest","Back","Shoulders"]],["Arms",["Biceps","Triceps","Forearms"]],
  ["Legs",["Quads","Hamstrings","Glutes","Adductors","Calves"]],["Core",["Core"]]];
/* Where each muscle is drawn (its side and half of the body) and what it is, in plain words. */
var MUS={Chest:["f","upper","Pecs, the front of the chest"],Back:["b","upper","Lats, traps and the lower back"],Shoulders:["f","upper","The three delts"],
  Biceps:["f","upper","Front of the upper arm"],Triceps:["b","upper","Back of the upper arm"],Forearms:["f","upper","Wrists and grip"],
  Quads:["f","legs","Front of the thigh"],Hamstrings:["b","legs","Back of the thigh"],Glutes:["b","legs","Hips and seat"],
  Adductors:["f","legs","Inside of the thigh"],Calves:["b","legs","Lower leg and shin"],Core:["f","upper","Abs and obliques"]};
function focusName(m){var x=FOCUS.filter(function(f){return f[0]===m;})[0];return x?(x[0]===x[1]?tm(m).trim():t(x[1])):m;}
var FOCUS_MAX=3;
var NOLIFT=["Barbell Squat","Barbell Deadlift","Barbell Bench Press - Medium Grip","Standing Military Press",
  "Bent Over Barbell Row","Pullups","Leg Press","Barbell Walking Lunge"];

function draftFrom(){
  var p=S.profile||{},pr=S.prefs||{};
  return {step:0,sex:p.sex||"m",age:num(p.age)||"",height:num(p.height)||"",
    weight:lastWeight()||num(p.weight)||"",goal:GOALS[p.goal]?p.goal:"lose",level:LEVELS[p.level]?p.level:"some",
    days:num(p.days)||3,mins:num(p.mins)||60,gear:gearDraft(S.gear).gear,gearx:gearDraft(S.gear).gearx,job:p.job||"desk",limits:(p.limits||[]).slice(),health:(p.health||[]).slice(),conds:(p.conds||[]).slice(),faults:(p.faults||[]).slice(),lapse:p.lapse||"steady",
    meals:num(pr.meals)||4,diet:pr.diet||"any",avoid:(pr.avoid||[]).slice(),powder:!!pr.powder,style:pr.fstyle||"egy",likes:(pr.likes||[]).slice(),
    sleep:num(p.sleep)||7.5,stress:p.stress||"normal",wd:(p.wd||[]).map(Number),focus:(p.focus||[]).slice(),goals2:goalsOf(p).slice(1),
    nolift:NOLIFT.filter(function(n){return (S.skip||[]).indexOf(n)>=0;}),split:null,done:false};}

/* The profile the draft describes. */
function profileOf(a){
  return {sex:a.sex,age:num(a.age),height:num(a.height),weight:num(a.weight),goal:a.goal,level:a.level,
    days:(a.wd||[]).length>=2?a.wd.length:num(a.days),mins:num(a.mins),job:a.job,activity:activityOf(a),limits:a.limits.slice(),
    health:(a.health||[]).slice(),lapse:a.lapse||"steady",lapseAt:a.lapse&&a.lapse!=="steady"?today():null,faults:(a.faults||[]).slice(),faultsAt:(a.faults||[]).length?today():null,conds:(a.conds||[]).filter(function(c){return a.sex==="f"||!/^pregnancy/.test(c);}),sleep:num(a.sleep),stress:a.stress||"normal",
    /* The day high stress or short sleep was said, for the coach's follow-up (js/engine/stress.js). */
    stressAt:a.stress==="high"||(num(a.sleep)>0&&num(a.sleep)<6)?today():null,
    wd:(a.wd||[]).length>=2?a.wd.map(Number).sort(function(x,y){return x-y;}):[],focus:(a.focus||[]).slice(),
    goals2:goalsOf({goal:a.goal,goals2:a.goals2}).slice(1)};}
/* What "Never suggest" holds once the answers are used: the lifts they ticked, and none
   of the ones they unticked. */
function skipOf(a){
  var keep=(S.skip||[]).filter(function(n){return NOLIFT.indexOf(n)<0;});
  return keep.concat((a.nolift||[]).filter(function(n){return keep.indexOf(n)<0;}));}
function foodPrefs(a,variant){
  return Object.assign({meals:num(a.meals)||4,diet:a.diet,avoid:a.avoid.slice(),powder:!!a.powder,style:a.style,likes:(a.likes||[]).slice(),variant:variant||0},FOODDB?ownFood():{});}
/* The kitchens a meal plan can be written from (js/engine/mealplan.js). */
var STYLES=[["egy","Egyptian home food"],["lev","Levantine (Syrian, Lebanese)"],["gulf","Gulf (Khaleeji)"],["med","Mediterranean"],["intl","International"],["mixed","A mix of all of them"]];
/* Everything "Use this plan" would set, worked out with the draft in place of what
   is saved, then put back. Cached on the answers. */
var CACHE={k:null,v:null};
function preview(a){
  var key=JSON.stringify([profileOf(a),a.gear,a.gearx,a.split,foodPrefs(a),skipOf(a),!!FOODDB]);
  if(CACHE.k===key)return CACHE.v;
  var keep={profile:S.profile,gear:S.gear,body:S.body,skip:S.skip},out=null;
  try{
    S.profile=Object.assign({},S.profile,profileOf(a));
    S.gear=gearOf(a);
    S.body=[{date:today(),weight:num(a.weight)}];S.skip=skipOf(a);
    var cands=[];try{cands=splitCandidates(S.profile.days,a.level,a.goal,S.gear);}catch(e){}
    /* The week built from these answers first; the app's programs as other choices. */
    cands=[{id:BUILT,name:"Built for you"}].concat(cands);
    var plan=generatePlan(a.split||BUILT);
    var tg=macroTargets(),meals=null;
    /* The assessment asks for a weight before this step (youOk); without one there are no targets. */
    if(!tg)return out;
    /* The meals need the food database, which loads on the way to this screen. */
    if(FOODDB)try{meals=buildMealPlan(tg,foodPrefs(a));}catch(e){meals=null;}
    out={tg:tg,td:tdee(),plan:plan,cands:cands,vol:volumeCheck(plan,a.level,goalOf(a.goal).train),meals:meals};
  }finally{S.profile=keep.profile;S.gear=keep.gear;S.body=keep.body;S.skip=keep.skip;}
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

function youOk(a){return !youWhy(a);}
/* Why the step cannot go on, said about the figure that stops it (the audit, 28 Oct: a
   height typed as 30 was answered "Enter your age, height and weight", all three of
   which were there). "" when it can. */
function youWhy(a){
  var kg=num(a.weight),age=num(a.age),cm=num(a.height);
  if(!a.age||!a.height||!a.weight)return t("Enter your age, height and weight to go on.");
  if(!(age>=13&&age<=95))return t("Age: 13 to 95.");
  if(!(cm>=120&&cm<=230))return t("Height: 120 to 230 cm.");
  if(!(kg>=30&&kg<=300))return t("Weight: {a} to {b}.").replace("{a}",fmtW(30)).replace("{b}",fmtW(300));
  return "";}

function body(a){
  var s=STEPS[a.step],h='';
  if(s==="intro"){
    h+='<div class="as-hero"><span class="shk">'+t("A few minutes")+'</span><h1>'+t("Let's build your plan")+'</h1>'
     +'<p class="as-sub">'+t("Short questions about you, your goal, your week, what you want to bring up and your food. From them: your daily targets, a training week built for you with the right volume and effort, and a meal plan from foods you eat.")+'</p>'
     +'<p class="as-sub">'+t("Everything stays on this phone. You see the whole plan before anything changes, and every part of it can be edited afterwards.")+'</p></div>';}
  else if(s==="you"){
    h+=q(t("About you"),t("For your calorie needs. Nothing leaves this phone."));
    h+=lbl(t("Sex"))+chips("sex",[["m",t("Male")],["f",t("Female")]],a.sex);
    h+='<div class="grid3 as-in">'
     +'<label><span>'+t("Age")+'</span><input id="as_age" type="number" inputmode="numeric" value="'+esc(String(a.age))+'"></label>'
     +'<label><span>'+t("Height (cm)")+'</span><input id="as_height" type="number" inputmode="numeric" value="'+esc(String(a.height))+'"></label>'
     +'<label><span>'+t("Weight")+' ('+wUnit()+')</span><input id="as_weight" type="number" inputmode="decimal" step="0.1" value="'+(num(a.weight)?toDisp(num(a.weight)):"")+'"></label></div>';}
  else if(s==="goal"){
    /* One list (owner, 10 Nov: "click on one option or two instead of a separate repeated
       list"): tap one goal, or up to three. The first is the main one, marked so: it sets
       the food and most training days; the others get training days of their own in turn
       with it, the textbook's undulating plan. Goals about calories (lose, both, stay fit)
       can only be the main one: a second of those takes the first one's place. Tapping
       the main goal off hands "main" to the next. (js/data/goals.js; handlers/coach.js asgoal) */
    var gl=goalsOf({goal:a.goal,goals2:a.goals2});
    h+=q(t("What are you after?"),t("Tap one goal, or up to three. The first one you pick is your main goal: it sets your food and most of your training days."));
    h+='<div class="ascards asgoals">'+GOAL_ORDER.map(function(k){
      var at=gl.indexOf(k),on=at>=0;
      return '<button class="ascard'+(on?' on':'')+'" data-asgoal="'+k+'" aria-pressed="'+(on?"true":"false")+'">'
       +'<span class="asg-h"><b>'+esc(t(GOALS[k].label))+'</b>'
       +(on?'<i class="asg-tag'+(at?'':' main')+'">'+esc(at?t("Also"):t("Main goal"))+'</i>':'')+'</span>'
       +'<span>'+esc(t(GOALS[k].desc))+'</span></button>';}).join("")+'</div>';
    h+='<p class="as-note">'+esc(t(gl.length>1?"Your training days take turns: the main goal on most of them, each other goal on days of its own, with its own reps, rest and extras. Your food follows the main goal."
      :"Want more than one thing from your training? Tap another goal too, up to three."))+'</p>';}
  else if(s==="level"){
    h+=q(t("How long have you been lifting?"),t("Consistently, not counting long breaks."));
    var LD={new:"New to lifting.",some:"Training regularly for six months or more.",
      experienced:"A couple of years, and you know the main lifts.",advanced:"Many years, and progress has slowed right down."};
    h+='<div class="ascards">'+Object.keys(LEVELS).map(function(k){return card("level",k,t(LEVELS[k].label),t(LD[k]),a.level===k);}).join("")+'</div>';
    /* Experience and recent training are two things (owner, 3 Nov: "a long-time lifter, but
       an inconsistent year and six months almost off"): the skill stays, the fitness and the
       habit need rebuilding. The plan starts at phase 1 again, weights are found afresh after
       a long gap, and food starts from habits before numbers. */
    h+=lbl(t("Training lately"))+chips("lapse",[["steady",t("Steady")],["patchy",t("On and off this past year")],["off",t("Mostly off for months")]],a.lapse||"steady");
    if(a.lapse==="off"||a.lapse==="patchy")h+='<p class="as-note">'+esc(t("Your plan starts with a lighter block to rebuild, finds your working weights again instead of using old ones, and starts food with habits you can keep."))+'</p>';}
  else if(s==="week"){
    h+=q(t("Your week"),t("What you can keep up on a normal week, not your best one."));
    var fixed=(a.wd||[]).length>=2;
    h+=lbl(t("Days a week you can train"))+chips("days",[[2,"2"],[3,"3"],[4,"4"],[5,"5"],[6,"6"]],fixed?a.wd.length:a.days);
    /* The days they train on, if they are fixed: the week is built on those, the rest
       days between a muscle's sessions where the week puts them. */
    h+=lbl(t("Days that are fixed (optional)"))+'<div class="aschips">'+weekOrder().map(function(n){
        return chip("wd",n,wdName(n),(a.wd||[]).indexOf(n)>=0,true);}).join("")+'</div>'
     +'<p class="as-note">'+t(fixed?"The week is built on these days.":"None picked: the days are spread through the week, with rest between.")+'</p>';
    /* The textbook's sessions a week for this much experience (acute-variables). */
    var fr=KB.frequency(a.level),pw=fr&&fr.per;
    var lo=pw?(pw.min!=null?pw.min:Math.min(pw.totalBody||3,pw.split||4)):0,hi=pw?(pw.max!=null?pw.max:Math.max(pw.totalBody||3,pw.split||4)):0;
    if(lo)h+='<p class="as-note">'+fill(t("For your experience, {lo}–{hi} sessions a week is the usual range."),{lo:lo,hi:hi})+'</p>';
    h+=lbl(t("Time for each session, warm-up included"))+chips("mins",[[30,"30 "+t("min")],[45,"45 "+t("min")],[60,"60 "+t("min")],[75,"75 "+t("min")],[90,"90 "+t("min")]],a.mins);}
  else if(s==="gear"){
    h+=q(t("Where do you train?"),t("Exercises you cannot do are swapped for ones that work the same muscles."));
    h+='<div class="ascards">'+card("gear","gym",t("A gym"),t("Machines, cables, barbells and dumbbells."),a.gear==="gym")
     +card("gear","home",t("At home, with dumbbells"),t("Dumbbells, bands or a kettlebell, and a bench or a chair."),a.gear==="home")
     +card("gear","bw",t("Bodyweight only"),t("The floor, and a bar or a door frame to pull on if you have one."),a.gear==="bw")+'</div>';
    var have=a.gear==="custom"?(a.gearx||[]):a.gear==="gym"?KIT:(GEARS[a.gear]||[]);
    h+=lbl(t("Or pick exactly what you have"))
     +'<div class="aschips">'+KIT.map(function(k){return chip("gearx",k,t(k),have.indexOf(k)>=0,true);}).join("")+'</div>'
     +'<p class="as-note">'+esc(t(a.gear==="custom"?"Your plan uses only these, and your own body weight.":"Tap any to change the list: barbell, dumbbells, kettlebell, bands, cables, machines. Your body weight is always in."))+'</p>';}
  else if(s==="focus"){
    h+=q(t("What do you want to bring up?"),t("Up to three muscles. Pick the whole muscle, or the parts of it you want most. They get more weekly sets and go first in their session, while you are fresh."));
    /* Each muscle, then its parts (owner, 9 Nov: "the three shoulder muscles, and the
       same for the other muscles"): a part gets an exercise that works it, first in its
       day (js/data/parts.js, js/engine/build.js). The whole and its parts replace one
       another. */
    var fo=a.focus||[],picked=focusMuscles(fo);
    /* What is picked, at the top, each one a tap to take off; then the muscles by region,
       one row each. A row opens to its parts (one open at a time: the one last touched
       stays open across a re-render); a muscle with no parts is picked by its row. */
    var label=function(id){return id.indexOf(".")>0?t(partLabel(id)):focusName(id);};
    h+='<div class="asfpick" aria-live="polite"><div class="asfpick-h"><b>'+esc(t("Your picks"))+'</b><span class="num">'+picked.length+' / '+FOCUS_MAX+'</span></div>'
     +(fo.length?'<div class="aschips">'+fo.map(function(id){
        return '<button class="aschip on asfx" data-asm="focus|'+esc(id)+'" aria-label="'+esc(t("Take off")+": "+label(id))+'">'+esc(label(id))+'<span aria-hidden="true">×</span></button>';}).join("")+'</div>'
       :'<p class="as-note">'+esc(t("Nothing picked: every muscle gets its share. Pick up to three to bring up."))+'</p>')+'</div>';
    /* Each muscle a row with its own picture (js/data/bodymap.js, framed on its side and
       half of the body, the muscle lit) and what it is in plain words; a row opens to the
       muscle drawn larger and its parts as cards, each with its anatomical name, where
       it is and what trains it, the parts picked lit on the drawing. */
    var fig=function(m,lit,cls){var mm=MUS[m]||["f","upper"];
      var side=lit&&Object.keys(lit).some(function(k){return k==="Calves.tib";})&&!lit["Calves.seated"]&&!lit["Calves.standing"]&&!lit.Calves?"f":mm[0];
      return bodyView(lit,side,mm[1],"",cls);};
    h+=REGIONS.map(function(rg){
      return '<section class="asreg"><h3>'+esc(t(rg[0]))+'</h3>'+rg[1].map(function(m){
        var ps=partsOf(m),whole=fo.indexOf(m)>=0,mine=fo.filter(function(f){return f.indexOf(m+".")===0;}),on=whole||mine.length;
        var lit={};if(mine.length)mine.forEach(function(f){lit[f]="p";});else lit[m]="p";
        var full=!on&&picked.length>=FOCUS_MAX,sub=MUS[m]?t(MUS[m][2]):"";
        var state=whole?t("All of it"):mine.map(function(f){return t(partLabel(f));}).join(t(", "));
        var head='<span class="asfm-fig">'+fig(m,lit)+'</span><span class="asfm-t"><span class="asfm-n">'+esc(focusName(m))+'</span>'
          +'<span class="asfm-s">'+esc(on?state:sub)+'</span></span>';
        if(!ps.length)return '<button class="asfm'+(on?' on':'')+(full?' full':'')+'" data-asm="focus|'+esc(m)+'" aria-pressed="'+(on?"true":"false")+'">'
          +head+'<span class="asfm-k" aria-hidden="true"></span></button>';
        var card=function(id,title,desc,sel){return '<button class="aspart'+(sel?' on':'')+'" data-asm="focus|'+esc(id)+'" aria-pressed="'+(sel?"true":"false")+'">'
          +'<span class="aspart-k" aria-hidden="true"></span><b>'+esc(title)+'</b><span>'+esc(desc)+'</span></button>';};
        return '<details class="asfm-d" name="asfm"'+((a.fopen===m)?' open':'')+'><summary class="asfm'+(on?' on':'')+(full?' full':'')+'">'+head
          +'<span class="asfm-c-w">'+(on?'':'<span class="asfm-np">'+esc(t("{n} parts")).replace("{n}",'<bdi class="num">'+ps.length+'</bdi>')+'</span>')
          +'<span class="ico ico-chev asfm-c" aria-hidden="true"></span></span></summary>'
          +'<div class="asfm-body"><div class="asfm-big">'+fig(m,lit,"big")+'</div><div class="asparts">'
          +card(m,t("All of it"),t("Every part of it, evenly"),whole)
          +ps.map(function(pp){return card(pp.id,t(pp.label),t(pp.sub),fo.indexOf(pp.id)>=0);}).join("")+'</div></div></details>';}).join("")+'</section>';}).join("");
    h+=lbl(t("Lifts you won't do (optional)"))+'<div class="aschips">'+NOLIFT.map(function(n){
        return chip("nolift",n,exName(n),(a.nolift||[]).indexOf(n)>=0,true);}).join("")+'</div>'
     +'<p class="as-note">'+t("Left out of your plan, and never suggested. Exercises you have starred are used first. Both can be changed any time from an exercise's menu.")+'</p>';}
  else if(s==="life"){
    h+=q(t("The rest of your day"),t("Outside training. It decides most of what you burn."));
    h+='<div class="ascards">'+card("job","desk",t("Mostly sitting"),t("A desk, a car, a sofa."),a.job==="desk")
     +card("job","some",t("Some walking"),t("On your feet now and then, errands, stairs."),a.job==="some")
     +card("job","feet",t("On my feet most of the day"),t("Shop floor, teaching, nursing, a lot of walking."),a.job==="feet")
     +card("job","physical",t("Physical work"),t("Lifting, carrying, building, farming."),a.job==="physical")+'</div>';}
  else if(s==="limits"){
    h+=q(t("Anything to work around?"),t("A sore spot steers the plan away from what loads it. This is not a diagnosis: pain that lasts or is sharp deserves a physio."));
    h+=mchips("limits",LIMITS,a.limits);
    h+='<p class="as-note">'+t(a.limits.length?"Leave these on only while they are a problem.":"Nothing selected: nothing is worked around.")+'</p>';
    /* The overhead squat self-check (js/knowledge/assessments.js, 12.3): what they notice
       maps to the muscles to calm and to wake (engine/corrective.js), in every warm-up. */
    h+=lbl(t("A quick squat check (optional)"))
     +'<p class="as-sub">'+esc(t("Barefoot, feet shoulder-width and pointing ahead, arms straight overhead. Squat to about chair height five times, in front of a mirror or filmed from the front and the side. Tick what you see."))+'</p>'
     +mchips("faults",FAULTS_ASK,a.faults||[]);
    if((a.faults||[]).length)h+='<p class="as-note">'+t("Your warm-up will open with a few minutes of work for these: release and stretch what is tight, then wake up what is weak.")+'</p>';}
  else if(s==="health"){
    h+=q(t("Your health"),t("The standard questions before starting a new programme. Tick any that apply to you."));
    h+=mchips("health",HEALTH,a.health||[]);
    h+='<p class="as-note">'+t((a.health||[]).length
      ?"Then check with your doctor or a qualified exercise professional before hard training. Until then your plan keeps to low and moderate effort: no jumps and no intervals."
      :"None ticked: you're clear to start. Build up gradually.")+'</p>';
    if(num(a.age)>45)h+='<p class="as-note">'+t("Over 45 and not used to hard efforts? Check with a qualified exercise professional before training at a vigorous intensity.")+'</p>';
    /* Which condition, so the plan can follow the book's guidelines for it (engine/
       conditions.js), not only stay easy. */
    h+=lbl(t("Do any of these apply? (optional)"))
     +mchips("conds",CONDS_ASK.filter(function(x){return a.sex==="f"||!/^pregnancy/.test(x[0]);}),a.conds||[]);
    var cl=condLines(rulesFor(profileOf(a)),profileOf(a));
    h+='<p class="as-note">'+esc(cl.length?t("Your plan follows the training guidelines for these. Your doctor's advice comes first."):t("Pick any that a doctor has told you about. Each one changes how the plan is built."))+'</p>';}
  else if(s==="food"){
    h+=q(t("How you eat"),t("For the meal plan. It uses foods from the app's database, from the kitchen you pick first."));
    h+=lbl(t("Meals a day"))+chips("meals",[[3,"3"],[4,"4"],[5,"5"],[6,"6"]],a.meals);
    h+=lbl(t("Diet"))+chips("diet",[["any",t("Everything")],["veg",t("Vegetarian")],["pesc",t("Pescatarian")],["vegan",t("Vegan")]],a.diet);
    h+=lbl(t("Leave out"))+mchips("avoid",AVOIDS,a.avoid);
    h+=lbl(t("Protein powder"))+chips("powder",[["1",t("I use it")],["0",t("No powder")]],a.powder?"1":"0");
    h+=lbl(t("Food style"))+chips("style",STYLES.map(function(x){return [x[0],t(x[1])];}),a.style);
    /* Foods to say you like: every food the meal plan can serve, by what it is in a
       meal, only those this diet and these exclusions allow; the first few of each kind
       in sight, the rest a tap away. Their own kitchen's first. */
    if(FOODDB){
      var pf=plateFoods(),pr={diet:a.diet,avoid:a.avoid,powder:!!a.powder},lk=a.likes||[];
      pf.sort(function(x,y){return (y.cu===a.style?1:0)-(x.cu===a.style?1:0);});
      h+=lbl(t("Foods you like (optional)"))+'<p class="as-note">'+t("The plan uses them first where they fit, with the foods you log.")+'</p>'
       +[["P","Protein"],["C","Carbs and dishes"],["V","Vegetables and fruit"],["F","Fats"]].map(function(g){
          var fs=pf.filter(function(x){return x.role===g[0];}).map(function(x){return foodById(x.id);})
            .filter(function(f){return f&&allowed(f,pr);});
          if(!fs.length)return "";
          var ch=function(f){return chip("likes",f.id,foodName(f),lk.indexOf(f.id)>=0,true);};
          var first=fs.slice(0,8),more=fs.slice(8),picked=more.filter(function(f){return lk.indexOf(f.id)>=0;}).length;
          return '<div class="aslk"><h3>'+esc(t(g[1]))+'</h3><div class="aschips">'+first.map(ch).join("")+'</div>'
           +(more.length?'<details class="aslk-more"'+(picked?' open':'')+'><summary><span>'+esc(t("{n} more")).replace("{n}",'<bdi class="num">'+more.length+'</bdi>')+'</span></summary><div class="aschips">'+more.map(ch).join("")+'</div></details>':'')+'</div>';}).join("");}}
  else if(s==="sleep"){
    h+=q(t("How do you sleep?"),t("Most nights. Short sleep slows recovery, so the plan asks a little less of you."));
    h+=chips("sleep",[[5,t("Under 6 hours")],[6.5,t("6 to 7 hours")],[8,t("7 to 9 hours")],[9.5,t("More than 9")]],a.sleep);
    var sl=KB.sleep();
    if(sl)h+='<p class="as-note">'+fill(t("Adults do best on {lo} to {hi} hours a night."),{lo:sl.min,hi:sl.max})+'</p>';
    h+=lbl(t("Stress from work and life, lately"))+chips("stress",[["low",t("Low")],["normal",t("Normal")],["high",t("High")]],a.stress||"normal");
    if(a.stress==="high"||(num(a.sleep)>0&&num(a.sleep)<6))h+='<p class="as-note">'+t("Recovery is slower like this, so each muscle is built to the bottom of its range for now.")+'</p>';}
  else if(s==="result")h+=result(a);
  return h;}

/* What the meals were built from, said: the meals a day, the style, what is left out,
   the foods they picked or log that made it in, and a usual meal served again. */
function mealsWhy(a,meals){
  var P=foodPrefs(a),eat=(P.habits&&P.habits.eaten)||{},likes=a.likes||[],mine=[],usual=0,ar=S.prefs.lang==="ar";
  meals.forEach(function(m){if(m.usual)usual++;m.items.forEach(function(it){if((likes.indexOf(it.fid)>=0||eat[it.fid])&&mine.indexOf(it.fid)<0)mine.push(it.fid);});});
  var x=fill(t("Built for {n} meals a day, {s}"),{n:num(a.meals)||4,s:t({intl:"international food first",mixed:"a mix of every kitchen",lev:"Levantine food first",gulf:"Gulf food first",med:"Mediterranean food first"}[a.style]||"Egyptian home food first")});
  if(a.diet&&a.diet!=="any")x+=", "+t({veg:"vegetarian",pesc:"pescatarian",vegan:"vegan"}[a.diet]||a.diet);
  if((a.avoid||[]).length)x+=", "+t("without")+" "+a.avoid.map(function(v){return t((AVOIDS.filter(function(z){return z[0]===v;})[0]||[v,v])[1]).toLowerCase();}).join(ar?" و":", ");
  x+=".";
  if(mine.length)x+=" "+t("With your foods:")+" "+mine.slice(0,6).map(function(id){return foodName({fid:id});}).join(ar?"، ":", ")+".";
  if(usual)x+=" "+t(usual===1?"One of them is a meal you eat often, sized for your targets.":"{n} are meals you eat often, sized for your targets.").replace("{n}",usual);
  if(!mine.length&&!likes.length)x+=" "+t("Pick foods you like above, or log a few days of food, and the plan is written from them.");
  return x;}

/* Why the built week looks as it does, from what it was built on. */
function builtWhy(a,plan){
  var p=profileOf(a),fr=plan.built.freq||{},twice=Object.keys(fr).filter(function(m){return fr[m]>=2;}).length;
  var x=t(p.wd.length?"Built on the days you gave":"Built from your answers")+": "
    +t(twice?"each muscle trained {n} times a week, with a rest day between sessions on it.":"the whole body each session, with a rest day between.")
      .replace("{n}",Math.max.apply(null,Object.keys(fr).map(function(m){return fr[m];}).concat([1])));
  if(p.focus.length){var fm=p.focus.map(function(m){return m.indexOf(".")>0?t(partLabel(m)):tm(m).trim();}),and=S.prefs.lang==="ar"?" و":" and ";
    x+=" "+t(fm.length>1?"More for {m}, and they go first in their sessions.":"More for {m}, and it goes first in its sessions.")
      .replace("{m}",fm.length>1?fm.slice(0,-1).join(S.prefs.lang==="ar"?"، ":", ")+and+fm[fm.length-1]:fm[0]);}
  if(p.stress==="high"||(p.sleep>0&&p.sleep<6))x+=" "+t("Volume at the bottom of the range while sleep or stress slow recovery.");
  if((a.nolift||[]).length)x+=" "+t("Without the lifts you left out.");
  return x;}

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
function foodLabel(x){return foodName(x);}
function tile(ico,v,label){return '<div class="as-tile">'+glyph(ico)+'<b class="num">'+v+'</b><span>'+esc(label)+'</span></div>';}
function cardHead(ico,label){return '<div class="as-ch">'+glyph(ico)+'<span>'+esc(label)+'</span></div>';}
/* Coming back after a lapse: what the plan does about it, training and food. */
function backCard(a){
  var L=[t("A lighter first block (stabilisation): higher reps, slower, to rebuild joints, tendons and the habit before the heavy work."),
    t("Your working weights found afresh: where your last time on a lift is six weeks old or more, the set asks you to start lighter and find today's weight."),
    t("A full rest day between sessions on the same muscles: soreness comes back hard after time off."),
    t("Food: two habits first, protein every day and logging most days. Calories are fine-tuned at the weekly check-in once the log is steady.")];
  return '<section class="ascard2 condcard" data-k="backcard">'+cardHead("info",t("Coming back"))
   +'<ul class="cond-l">'+L.map(function(x){return '<li>'+esc(x)+'</li>';}).join("")+'</ul>'
   +'<p class="as-note">'+esc(t("Goals you can keep beat goals that look good: the surest way back to it."))+'</p></section>';}
function result(a){
  var r=preview(a);
  if(!r)return '<p class="as-sub">'+t("Something went wrong working this out. Go back a step and try again.")+'</p>';
  var G=goalOf(a.goal),T=trainOf(a.goal),tg=r.tg,plan=r.plan,h='';
  h+='<div class="as-hero"><span class="shk">'+t("Your plan")+'</span><h1>'+esc(t(G.label))+'</h1>'
   +'<p class="as-sub">'+esc(t(LEVELS[a.level].label)+" · "+a.days+" "+t("days a week")+" · "+a.mins+" "+t("min"))+'</p></div>';
  h+=condCard(profileOf(a));
  if(a.lapse==="off"||a.lapse==="patchy")h+=backCard(a);
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
  var c0=r.cands.filter(function(c){return c.id===(a.split||BUILT);})[0];
  h+='<section class="ascard2">'+cardHead("dumbbell",t("Training"))
   +'<h2 class="as-split">'+esc(planName(plan.name))+'</h2>'
   +(plan.built?'<p class="as-why">'+esc(builtWhy(a,plan))+'</p>':c0&&c0.why?'<p class="as-why">'+esc(c0.why)+'</p>':'');
  if(r.cands.length>1)h+='<div class="aschips as-alt">'+r.cands.map(function(c){
      var on=c.id===(a.split||BUILT);
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
    h+='<p class="as-why">'+esc(mealsWhy(a,r.meals))+'</p>';
    var all=[];r.meals.forEach(function(m){all=all.concat(m.items);});
    var mt=sumNutrition(all);
    h+='<div class="as-meals">'+r.meals.map(function(m,i){
        var tot=sumNutrition(m.items),nm=importName(m,i);
        return '<div class="as-meal"><details><summary><span class="as-mi">'+glyph(mealGlyph(nm))+'</span>'
         +'<span class="as-mt"><b>'+esc(nm)+'</b><small>'+esc(m.items.slice(0,3).map(foodLabel).join(S.prefs.lang==="ar"?"، ":", "))+'</small>'
         +'<small><span class="num">'+fmtN(tot.kcal)+'</span> '+t("kcal")+' · <span class="num">'+tot.p+'</span> g '+esc(t("protein"))+'</small></span>'+glyph("chev","as-chev")+'</summary>'
         +'<ul class="as-dex">'+m.items.map(function(x){return '<li><span>'+esc(foodLabel(x))+'</span><span class="num">'+esc(x.label||"")+'</span></li>';}).join("")+'</ul></details></div>';}).join("")+'</div>'
     +'<p class="as-note">'+esc(t("The day comes to {k} kcal and {p} g of protein. Every food and amount can be changed in Food → Plan.").replace("{k}",fmtN(mt.kcal)).replace("{p}",mt.p))+'</p>';}
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

export {activityOf, draftFrom, foodPrefs, FOCUS_MAX, GEARS, gearOf, KIT, preview, profileOf, skipOf, STEPS, vAssess, youOk, youWhy};

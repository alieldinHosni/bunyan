/* Bunyan — the coach's routing: the question's words, what it names, and the guard (js/ui/answers/route.js gathers them;
   road map step 4, 25 Nov: split by topic as it was, no answer's words or figures changed). */
import {t} from "../../i18n/dict.js";
import {A, fill, l, list, n, p, src} from "./kit.js";
import {exName, planName} from "../../i18n/exnames.js";
import {isActivity} from "../../data/activities.js";
import {fold, skel, spell} from "../../coach/intent.js";
import {guard} from "../../coach/guard.js";
import {fuzzyFoods, searchFoods} from "../../engine/nutrition.js";
import {allowed} from "../../engine/mealplan.js";
import {S, split} from "../../state.js";
import {today} from "../../util.js";
import {nextDayOf, planOn} from "../../engine/dayplan.js";
import {avoids, standIn} from "../../engine/plan.js";
import {words} from "../coachwords.js";
import {INGREDIENT, aInBody} from "./answers.js";
import {blocks, buttons} from "../views/chat.js";
import {told} from "./route-limits.js";
import {FOODFILL, FOODNO, KEEP_MS} from "./route-read.js";


/* How close a question must be to an answer for the answer to stand in for a rule the
   words also touched (below it, the rule answers). */
var FAQ_OVER=0.6,FAQ_STRONG=0.75;
/* A question about the person's own log ("am I", "my", "بتاعي") stays with the rule that
   reads it: "did I walk enough" is their steps, not how much cardio people need. */
var MINE=/ (am i|did i|have i|was i|is my|are my|how is my|how are my|how was my|whats my|what is my|انا|بتاعي|بتاعتي|عملت|خطواتي)( |$)/;
/* Where something is, or how to do it, is about the app even with "my" in it. */
function ownQuestion(text,iid){var f=" "+fold(text)+" ";return MINE.test(f)&&OWNLOG.test(iid)&&!/^ (where|how do i|how can i|how to|فين|ازاي) /.test(f);}
var OWNLOG=/^(weight|track|strong|steps|week|last|today|tomorrow|weights|goal|plateau|calories|protein|eat|rest)$/;

/* The most messages kept, newest last: thirty days of the history (KEEP_MS), bounded so
   a chatty month cannot grow the saved data without end. */
var KEEP=500;

/* The exercises the question names, or today's (or the next) workout's main ones. */
/* Words that name how, not what: a match on them alone is not a match. "Split" is also
   the program ("each session in my split" is not Split Squats, owner 28 Oct). */
var GENERIC=/^(barbell|dumbbell|dumbbells|machine|cable|medium|grip|press|with|standing|seated|bar|split|session|exercise|بالبار|بالدمبل|بالدمبلز|بالجهاز|بالكابل|بريس|واقف|قاعد|قبضه)$/;
function namedExercises(q){
  /* The question's words, and each again without the Arabic article it may carry
     ("البنش" is "بنش"). */
  var qw=spell(fold(q)).split(" "),bare=qw.map(function(w){return w.replace(/^(وال|بال|فال|لل|ال)(?=..)/,"");});
  var fq=" "+qw.concat(bare).join(" ")+" ",sk=" "+bare.map(skel).join(" ")+" ";
  var seen={},out=[],pool=[];
  split().days.forEach(function(d){d.ex.forEach(function(e){pool.push(e);});});
  pool.forEach(function(e){
    if(seen[e.name]||isActivity(e.name))return;
    var names=[e.name,exName(e.name)].map(fold);
    var hit=names.some(function(nm){return nm.split(" ").some(function(w){
      if(w.length<(/[\u0600-\u06FF]/.test(w)?3:4)||GENERIC.test(w))return false;
      /* Arabic gym words are spelt with and without their long vowels ("بينش"). */
      return fq.indexOf(" "+w)>=0||(/[\u0600-\u06FF]/.test(w)&&w.length>=3&&sk.indexOf(" "+skel(w)+" ")>=0);});});
    if(hit){seen[e.name]=1;out.push(e);}});
  return out;}
/* The same reading, for the sheet that opens where a result is saved (owner, 3 Nov: no
   trip to the chat to be told what it means). Its "Change my goal" opens the goal where
   it is set (Profile → You); "Add an InBody result" is not offered right after adding one. */
function inbodyReading(){
  var a={b:[],acts:[]};aInBody(a);
  var acts=a.acts.filter(function(x){return !(x.a&&x.a["data-sheet"]==="inbody");}).map(function(x){
    return x.a&&x.a["data-chatq"]==="goal"?{l:x.l,a:{"data-sheet":"set_you"}}:x;});
  return blocks(a.b)+buttons(acts);}

/* Where it hurts, from what was typed: the areas the plan builder knows how to train
   around (js/engine/plan.js AVOID). Folded text, so Arabic spellings match too. */
var AREAS=[["knee","knee",/knee|ركب/],["back","lower back",/\bback\b|spine|ضهر|ظهر|فقرات/],["shoulder","shoulder",/shoulder|كتف/],
  ["wrist","wrist",/wrist|رسغ|معصم/],["ankle","ankle",/ankle|كاحل|كعب/]];
function areaOf(fq){for(var i=0;i<AREAS.length;i++)if(AREAS[i][2].test(fq))return AREAS[i];return null;}
/* The next workout's exercises that load that area, each with the closest exercise
   that trains the same movement without it (js/data/movement.js), or none. */
function trainAround(a,ar){
  var sp=split(),pl=planOn(sp,today()),d=pl.day&&!pl.rest&&pl.kind!=="done"?pl.day:nextDayOf(sp);
  if(!d||!d.ex.length)return;
  var hit=d.ex.filter(function(e){return !isActivity(e.name)&&avoids(e.name,[ar[0]]);});
  if(!hit.length){p(a,fill(t("Nothing in {d} loads the {area} much. Train as planned, and stop anything that hurts."),{d:planName(d.name),area:t(ar[1])}));return;}
  p(a,fill(t("In {d}, these load the {area}. What trains the same movement without it:"),{d:planName(d.name),area:t(ar[1])}));
  var taken={};d.ex.forEach(function(e){taken[e.name]=1;});
  l(a,hit.map(function(e){var s=standIn(e.name,S.gear,[ar[0]],taken);if(s)taken[s]=1;
    return exName(e.name)+" \u2192 "+(s?exName(s):t("leave it out for now"));}));
  n(a,t("In the workout, Something hurts? then Replace this exercise shows these first."));}
var PAIN=/(pain|hurt|injur|sharp|swollen|الم|وجع|يوجع|بيوجع|بتوجع|واجع|مصاب|اصابه)/;
/* What the guard is given: the answer's prose, its list rows, its source (an answer
   worked out from the person's log and plan says so when nothing more exact is set),
   the figures a written answer may hold, and the lifts asked against the person's
   others, as the answer would name them. */
function checked(a,iid,R){
  var prose=[],items=[];
  (a.b||[]).forEach(function(x){if(!x)return;if(x.p!=null)prose.push(String(x.p));if(x.n!=null)prose.push(String(x.n));if(Array.isArray(x.l))x.l.forEach(function(y){items.push(String(y));});});
  if(!(a.src&&a.src.length)&&iid!=="faq"&&/\d/.test(prose.concat(items).join(" ")))a.src=[t("From your log and plan")];
  var lifts=null,E=R&&R.entities;
  if(E&&E.exercise&&E.exercise.length&&(R.kind==="own-data"||R.kind==="knowledge")){
    var asked=E.exercise.map(function(x){return x.name;}).filter(Boolean),mine={};
    (S.sessions||[]).slice(0,40).forEach(function(s){(s.entries||[]).forEach(function(e){mine[e.name]=1;});});
    split().days.forEach(function(d){d.ex.forEach(function(e){mine[e.name]=1;});});
    /* What was said may fit more than one of theirs ("squat": the Barbell Squat logged,
       the Hack Squat in the program): all of those are what was asked. */
    var keys=E.exercise.map(function(x){return String(x.key||"").toLowerCase().split(" ").filter(Boolean);}).filter(function(k){return k.length;});
    Object.keys(mine).forEach(function(n){var ln=n.toLowerCase();if(asked.indexOf(n)<0&&keys.some(function(k){return k.every(function(w){return ln.indexOf(w)>=0;});}))asked.push(n);});
    var others=Object.keys(mine).filter(function(n){return asked.indexOf(n)<0&&!isActivity(n);});
    if(asked.length)lifts={asked:asked.map(exName),others:others.map(exName)};}
  return guard({prose:prose,items:items,src:a.src||[],allowed:iid==="faq"&&a.allowed?a.allowed:null},lifts);}
/* The food a question names, once its question words are taken out. */
var QWORDS=/\b(how|much|many|what|whats|is|are|there|the|a|an|in|of|for|to|on|does|do|contain|contains|has|have|with|same|macros|macro|calories|calorie|kcal|protein|carbs|carb|fat|fats|fiber|fibre|sugar|grams|gram|g|nutrition|facts|info|value|values|instead|swap|replace|alternative|alternatives|other|food|foods|options|can|i|eat|my|me|you|u|give|provide|please|per|serving)\b/g;
var QWORDS_AR=/(^| )(كام|كم|بروتين|سعر|سعره|سعرات|كارب|دهون|جرام|في|فيه|فيها|القيمه|الغذائيه|بديل|بدايل|بدائل|بدل|حاجه|تانيه|تاني|غير|نفس|الماكروز|الماكرو|عايز|عاوز|ايه|اي|انا|ممكن|اكل|للـ)(?= |$)/g;
function foodWords(q){return spell(fold(q)).replace(FOODNO," ").replace(FOODFILL," ").replace(QWORDS," ").replace(QWORDS_AR," ").replace(/(^| )ل(?=ل)/g," ").replace(/\s+/g," ").trim();}
function namedFood(q,strict){
  var rest=foodWords(q);
  if(rest.length<(strict?3:2))return null;
  var bare=rest.replace(/(^| )(ال|لل|بال|وال)(?=..)/g,"$1").trim();
  var hits=searchFoods(rest,6).concat(searchFoods(bare,6)).sort(function(x,y){return y.score-x.score;});
  /* As people eat it: "chicken" is chicken cooked, not the raw entry, when both match
     about as well. */
  var hit=hits.filter(function(x){return hits[0]&&x.score>=hits[0].score-12&&!INGREDIENT.test(x.f.n);})[0]||hits[0];
  if(hit&&hit.score>=(strict?72:60))return hit.f;
  if(strict)return null;
  var fz=fuzzyFoods(rest,1)[0];
  return fz&&fz.dist<=2?fz.f:null;}
/* The program's lifts: not activities. */
function lifts(){var out=[];split().days.forEach(function(d){d.ex.forEach(function(e){if(!isActivity(e.name))out.push(e);});});return out;}
var MUSCLEWORD=[["Chest",/chest|pec|صدر/],["Back",/\bback\b|lats?\b|ضهر|ظهر/],["Shoulders",/shoulder|delt|كتف|اكتاف/],["Quads",/quad|thigh|legs?\b|رجل|فخذ|فخاد/],
  ["Hamstrings",/hamstring|خلفيه/],["Glutes",/glute|مؤخره/],["Biceps",/bicep|باي/],["Triceps",/tricep|تراي/],["Calves",/calf|calves|سمانه/]];

export {AREAS, FAQ_OVER, FAQ_STRONG, GENERIC, KEEP, MINE, MUSCLEWORD, OWNLOG, PAIN, QWORDS, QWORDS_AR, areaOf, checked, foodWords, inbodyReading, lifts, namedExercises, namedFood, ownQuestion, trainAround};

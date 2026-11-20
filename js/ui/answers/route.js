/* Bunyan — the coach's routing (docs/COACH-AGENT.md C-2)
   A question in, an answer out: safety first, then the sentence read (js/coach/
   understand.js), a correction or follow-up said again, a command handed to the agent
   (js/ui/agent.js), else the answer it picks (answers.js), each kept in the
   conversation (S.chat). js/ui/views/chat.js draws what this returns.
   Moved out of chat.js as it was: no routing changed. */
import {t, tm} from "../../i18n/dict.js";
import {A, act, fill, l, list, n, p, src, uiLang, withLang} from "./kit.js";
import {exName, planName} from "../../i18n/exnames.js";
import {isActivity} from "../../data/activities.js";
import {ACTION_IDS, factOf, fold, intentOf, situationOf, skel, spell} from "../../coach/intent.js";
import {listFacts} from "../../coach/context.js";
import {classify as safetyOf} from "../../coach/safety.js";
import {addDays as addDaysW} from "../../engine/schedule.js";
import {LIB, muscleOf} from "../../data/exercises.js";
import {matchExercise} from "../../engine/splitparse.js";
import {changeOf, gloss, retell, understand} from "../../coach/understand.js";
import {faqById, faqMatch} from "../../engine/faq.js";
import {guard} from "../../coach/guard.js";
import * as KB from "../../engine/kb.js";
import {lookup, ownTerms} from "../../engine/kbsearch.js";
import {canUndo} from "../handlers/actions.js";
import {answerPick, createAsk, daysIn, namesExercise, namesFood, plan as planAction, planCommand, proceed, suggestExercises} from "../agent.js";
import {commandOf, whenIn} from "../../coach/commands.js";
import {mealName, nextMeal} from "../../engine/meals.js";
import {FOODDB, foodName, fuzzyFoods, gramsFor, nutritionFor, searchFoods, sumNutrition} from "../../engine/nutrition.js";
import {allowed} from "../../engine/mealplan.js";
import {recapOf} from "../../coach/recap.js";
import {S, split} from "../../state.js";
import {fmtN, num, today} from "../../util.js";
import {isReady} from "../smartcoach.js";
import {addDaysISO, nextDayOf, planOn} from "../../engine/dayplan.js";
import {avoids, standIn} from "../../engine/plan.js";
import {words} from "../coachwords.js";
import {ASK} from "../ask.js";
import {INGREDIENT, aAvoid, aAway, aBalance, aCalories, aClarify, aCorrection, aCrave, aDay, aDays, aEat, aElse, aFacts, aFaq, aFit, aFoodDay, aFoodInfo, aGoal, aHealth, aHello, aHelp, aInBody, aK1RM, aKDur, aKFreq, aKReps, aKRest, aKSets, aKTempo, aKVolume, aKWarm, aLast, aLetGo, aLighter, aLive, aLoadLog, aLogFood, aLowDay, aMissed, aMonth, aOut, aPhase, aPlan, aPlateau, aProtein, aReassess, aRecord, aRemember, aRest, aScope, aSituation, aSore, aSteps, aStrong, aSwap, aTechnique, aThanks, aTired, aToday, aTomorrow, aTrack, aTwice, aUnknown, aVolume, aWarmPlan, aWater, aWeek, aWeekFood, aWeekTrain, aWeight, aWeights, aWhy, aZones} from "./answers.js";
import {blocks, buttons, chatShown, chips} from "../views/chat.js";

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

/* ---- the hard limits (js/knowledge/scope.js) ---------------------------------------
   Checked before anything else, however the question is put: no diagnosis, no injury
   assessment, no medical advice, no supplement or therapeutic-diet advice, no mental
   health care. The answer says who to see instead and what the app can show. */
/* The hard limits. English by its stems; Egyptian Arabic as whole words (with the
   article and the endings Arabic writes onto them), so a word inside another is not it:
   "ملخص" (a summary) is not "ملخ" (a sprain), "التوتر" (stress) is not "وتر" (a tendon),
   "مكسره" (sore, as gym slang says it) is not "كسر" (a fracture). Words that mean
   something ordinary too count only in their medical sense (owner, 28 Oct: "السكر وحش
   للتنشيف؟" asked about sugar, not diabetes): "عندي السكر", "ضغط الدم", "حامل". */
/* The words folded as the question is (fold turns ئ into ي, ة into ه), or "مكتئب" is never met. */
function arw(words){return "(^| )(و|ف|ب|ل|ال|وال|بال|فال|لل)?("+words.split("|").map(function(w){return fold(w);}).join("|")+")(ه|ي|ك|ها|ني|نا|هم|ات|ين)?(?= |$)";}
var SCOPE=[
  ["mental","no_mental_health_care",new RegExp("(depress|anxiety|anxious|panic attack|eating disorder|bulimi|anorexi|binge|purg|self harm|suicid)|"
    +arw("اكتئاب|مكتئب|قلق|اضطراب|نوبه هلع"))],
  ["medical","no_treatment",new RegExp("(medicine|medication|painkiller|pain killer|ibuprofen|paracetamol|panadol|aspirin|pills?\\b|antibiotic|steroid|injection|insulin|blood pressure|"
    +"(high|my|blood|raised|bad) cholesterol|cholesterol (level|is high|medication)|diabet|pregnan|heart condition|asthma)|"
    +arw("دوا|دواء|ادويه|مسكن|مسكنات|برشام|حقنه|حقن|انسولين|حامل|السكري|سكر في الدم|عندي السكر|عندي سكر|مريض سكر|مريض ضغط|عندي ضغط|ضغط الدم|ضغط عالي|الضغط عالي|كوليسترول عالي|عندي كوليسترول|حبوب منع|باخد حبوب|اخد حبوب"))],
  ["diagnosis","no_diagnosis",new RegExp("(diagnos|whats wrong with|what is wrong with|do i have (a |an )?(tear|torn|hernia|fracture|sprain|tendinitis|tendonitis|arthritis|sciatica|injury|disease|condition)|is it (torn|broken|fractured|sprained|a tear|serious)|tendon|tendinitis|tendonitis|hernia|arthritis|sciatica|\\btorn\\b|tear in|fractur|sprain|dislocat|meniscus|ligament|rotator cuff|slipped disc|herniat)|"
    +arw("تشخيص|عندي ايه|مقطوع|قطع في|كسر|مكسور|التواء|ملخ|خشونه|انزلاق|غضروف|رباط|اربطه|وتر|اوتار"))],
  ["supplement","no_nutrition_or_supplement_advice",new RegExp("(supplement|creatine|pre.?workout(?! (meal|food|snack|carbs?|eat))|fat burner|mineral pill|"
    +"(take|taking|dose|dosage|pills?|tablets?|capsules?|shots?|inject\\w*) (of )?vitamin|vitamin \\w* ?(pills?|tablets?|dose|dosage|supplements?|shots?))|"
    +arw("مكمل|مكملات|كرياتين|حارق|حوارق")+"|(اخد|باخد|ناخد|جرعه|حبوب|برشام|حقن) فيتامين|فيتامين \\S* ?(حبوب|برشام|جرعه|حقن)")]];
function scopeOf(q){var fq=fold(q);for(var i=0;i<SCOPE.length;i++)if(SCOPE[i][2].test(fq))return SCOPE[i];return null;}
/* The scope answer, for the limit given (a red flag's referral names it) or the one the
   words touch. */
function scopeAnswer(a,q,force){
  var sc=force||scopeOf(q)||SCOPE[2],ar=areaOf(fold(q)),rule=KB.scopeRule(sc[1]);
  if(sc[0]==="mental"){
    p(a,t("That needs a professional, a doctor or a psychologist, not me. Please talk to one; it is worth it."));
    return src(a,rule&&rule.src);}
  if(sc[0]==="medical"){
    p(a,t("That needs a doctor or a pharmacist, not me: I don't give medical advice."));
    p(a,t("I can show you what your training and food have looked like, to take with you."));
    act(a,t("Open Progress"),{"data-tab":"progress"});
    return src(a,rule&&rule.src);}
  if(sc[0]==="supplement"){
    p(a,t("Supplement advice needs a doctor or a registered dietitian, not me. I can show you your protein for the week against your target."));
    act(a,t("My protein this week"),{"data-chatq":"protein","data-chatl":uiLang()});
    return src(a,rule&&rule.src);}
  p(a,ar?fill(t("That needs a physio or a doctor, not me: I can't assess an injury. I can show you what in your next workout loads the {area}."),{area:t(ar[1])})
    :t("That needs a physio or a doctor, not me: I can't assess pain or an injury."));
  if(ar){trainAround(a,ar);
    /* The same across the whole program, as a request (agent.js planLimit), on a tap. */
    act(a,fill(t("Swap what loads my {area} across my program"),{area:t(ar[1])}),{"data-chatsay":"swap exercises that load my "+ar[0]});}
  act(a,t("Log it"),{"data-sheet":"recovery"});
  return src(a,rule&&rule.src);}

/* ---- outside what the coach knows: what was understood, and where to go ------------- */
var ELSEWHERE=[
  ["you",/(height|how tall|tall am|my age|how old|birthday|birth date|my sex|gender|my name|طولي|الطول|طول|سني|عمري|السن|اسمي)/],
  ["nodata",/(heart rate|resting hr|\bhrv\b|vo2|sleep score|body fat scan|blood|bpm|نبض|ضربات القلب)/]];
/* What they told the coach that bears on this answer, said back in their words. */
/* Food answers say back only what is about food, by its own words. */
var FOODSAID=/(eat|food|diet|meal|allerg|vegan|vegetarian|pork|dairy|lactose|gluten|halal|fast|اكل|باكل|بكل|دايت|حساسيه|نباتي|لبن|صيام|صايم)/;
function told(a,kinds,food){
  var f=listFacts(S.context).filter(function(x){return kinds.indexOf(x.kind)>=0&&(!food||FOODSAID.test(fold(x.text)));});
  if(f.length)n(a,t("You told me:")+" "+f.map(function(x){return "“"+x.text+"”";}).join(" · "));
  return a;}
var GROUPOF={Legs:["Quads","Hamstrings","Glutes","Calves"],Arms:["Biceps","Triceps"]};
/* ---- why (C-6, docs/COACH-AGENT.md 2.5) ---------------------------------------------
   From what the app actually decided, never a reason made up for it:
   - a weight: the suggestion's own rule and the set it came from (engine/lifts.js
     recommendIn, the note the workout page shows);
   - a lighter day: the lighter week running, and until when;
   - an exercise: what it trains, the movement, that the kit is there, and where it came
     from (the day and program);
   - today's day: the program's weekday or its rotation.
   Anything else: "the app suggested it; I can't show the working for this one". */
var WHYKIND={load:/(weight|kg|kilo|heavier|raise|raised|increase|increased|lift|load|وزن|كيلو|تقل|زود|زودت)/,
  light:/(lighter|easier|deload|less weight|fewer sets|اخف|اسهل|خفيف)/,
  choice:/(in my program|in the program|this exercise|that exercise|exercise|chosen|picked|choose|pick|in my plan|في برنامجي|التمرين ده|تمرين|اخترت)/,
  day:/(today|tomorrow|this day|النهارده|بكره)/};
/* What today's session is in the time and the kit said: the plan's own exercises in
   order, cut to fit, and for each that needs other kit the closest one with what there
   is (js/engine/plan.js standIn). A guide: nothing in the program is changed. */
var KITOF={Dumbbell:["Dumbbell"],Band:["Band"],Kettlebell:["Kettlebell"],Hotel:["Dumbbell","Machine","Cable"],Bodyweight:[],Home:[]};
/* The two or three likeliest readings, as one question with a button each. */
var READAS={record:["My best {ex}","ايه احسن {ex} عملته"],technique:["How do I do {ex}?","ازاي اعمل {ex}؟"],eat:["What have I eaten today?","اكلت ايه النهارده؟"],
  foodday:["What did I eat yesterday?","اكلت ايه امبارح؟"],week:["How was my week?","الاسبوع كان عامل ازاي؟"],weight:["My weight trend","وزني عامل ازاي؟"],
  today:["What's my workout today?","اعمل ايه النهارده؟"],exswap:["Swap {ex} in my program","بدل {ex} في برنامجي"],exremove:["Remove {ex} from my program","شيل {ex} من برنامجي"],
  exadd:["Add {ex} to my program","ضيف {ex} لبرنامجي"],fit:["Fit today's workout to my time","ظبط تمرين النهارده على وقتي"],volume:["My sets this week","مجموعاتي الاسبوع ده"],
  day:["What did I do yesterday?","عملت ايه امبارح؟"],why:["Why did the weight change?","ليه الوزن اتغير؟"],
  avoid:["I don't like {ex}","مش بحب {ex}"]};
function readAs(x,R){
  var tp=READAS[x.topic];if(!tp)return null;
  var e=R.entities.exercise[0],ar=R.lang==="ar",said=e?(ar?exName(e.name)||e.said:exName(e.name)||e.said):"";
  if(/\{ex\}/.test(tp[0])&&!said)return null;
  return {l:withLang(R.lang,function(){return fill(t(tp[0]),{ex:said});}),say:fill(tp[ar?1:0],{ex:e?(ar?e.said:e.said):""})};}
/* ---- the live reading (C-4a, docs/COACH-AGENT.md) -------------------------------------
   As the person types, what the coach understood, as up to three chips: what (act) ·
   which (the exercise or muscle) · when. Each has alternatives that rewrite the words in
   the field, never guess beyond them: another act is a whole sentence (READAS), another
   exercise replaces the words said for it, another day replaces the day word. Nothing
   understood: no chips, and the three questions nearest the words as buttons. Send works
   either way (owner, 19 Nov): this shows the reading, it does not gate it.
   Drawn by js/ui/liveread.js into one element above the field. */
var ACTL={exswap:"Swap",exadd:"Add",exremove:"Remove",avoid:"Leave out",fit:"Fit today's workout",record:"Best",technique:"How to",
  eat:"What I ate",foodday:"What I ate",week:"My week",weight:"My weight",today:"Today's workout",tomorrow:"Tomorrow's workout",volume:"My sets",
  day:"A past day",why:"Why"};
var KINDL={request:"A change","own-data":"From your log",knowledge:"A question"};
var ACTALT=[["exswap","exremove","exadd","avoid"],["record","technique","volume"],["eat","foodday"],["today","day","fit"]];
var WHEN={today:["today","النهارده"],yesterday:["yesterday","امبارح"],tomorrow:["tomorrow","بكره"]};
var WHENRE=/(^| )(today|yesterday|tomorrow|النهارده|انهارده|امبارح|بكره|بكرة)(?= |$|[?؟.,!])/i;
function liveChips(text){
  var q=String(text||"").trim(),R=q.length>=2?readOf(q,null):null;
  if(!R||(!R.kind&&!R.topic))return {chips:[],near:q.length>=3?nearAsk(q):[]};
  var ar=R.lang==="ar",E=R.entities||{},chips=[];
  var al=ACTL[R.topic]||KINDL[R.kind];
  if(al){var grp=ACTALT.filter(function(g){return g.indexOf(R.topic)>=0;})[0]||[],alts=[];
    grp.forEach(function(x){if(x===R.topic)return;var r=readAs({topic:x},R);if(r)alts.push({l:r.l,text:r.say});});
    chips.push({k:"act",l:t(al),alts:alts});}
  var ex=E.exercise&&E.exercise[0];
  if(ex&&ex.name){
    var said=ex.said||"",kw=String(ex.key||"").toLowerCase().split(" ").filter(Boolean),others=[];
    var seen={};seen[exName(ex.name)]=1;
    if(said&&kw.length)LIB.forEach(function(l){var n=l[0],ln=n.toLowerCase(),lb=exName(n);
      if(n!==ex.name&&others.length<4&&!seen[lb]&&!isActivity(n)&&kw.every(function(w){return ln.indexOf(w.replace(/s$/,""))>=0;})){seen[lb]=1;others.push(n);}});
    var re=said?new RegExp(fold(said).split(" ").map(function(w){return w.replace(/[.*+?^${}()|[\]\\-]/g,"\\$&");}).join("[^\\w\u0600-\u06ff]+"),"i"):null;
    /* Arabic letters are matched folded (ئ as ي, ة as ه): where the words as typed differ,
       the folded sentence is the one rewritten. */
    var base=!re?null:re.test(q)?q:re.test(fold(q))?fold(q):null;
    chips.push({k:"thing",l:exName(ex.name),alts:base?others.map(function(n){var nm=ar?exName(n):n;return {l:exName(n),text:base.replace(re,nm)};}):[]});}
  else if(E.muscle&&E.muscle.length)chips.push({k:"thing",l:tm(E.muscle[0]),alts:[]});
  var w=E.day&&WHEN[E.day.when]?E.day.when:"",m=WHENRE.exec(q);
  if(w){var walts=[];
    /* A change is for today or later; what was logged, today or before. */
    if(m)Object.keys(WHEN).forEach(function(k){if(k!==w&&!(k==="yesterday"&&R.kind==="request")&&!(k==="tomorrow"&&R.kind==="own-data"))walts.push({l:t(cap(k)),text:q.slice(0,m.index+m[1].length)+WHEN[k][ar?1:0]+q.slice(m.index+m[0].length)});});
    chips.push({k:"when",l:t(cap(w)),alts:walts});}
  else if(R.period==="thisweek"||R.period==="lastweek"||R.period==="nextweek")chips.push({k:"when",l:t({thisweek:"This week",lastweek:"Last week",nextweek:"Next week"}[R.period]),alts:[]});
  /* Read as something with no name to show (small talk, out of scope): as not understood. */
  if(!chips.length)return {chips:[],near:q.length>=3?nearAsk(q):[]};
  return {chips:chips,near:[]};}
function cap(s){return s.charAt(0).toUpperCase()+s.slice(1);}
/* The three questions whose words are nearest the words typed, in either language. */
function nearAsk(q){
  var ws=fold(q).split(" ").filter(function(w){return w.length>=3;});
  var sc=Object.keys(ASK).map(function(id){var en=fold(ASK[id]),ar=fold(t(ASK[id])),s=0;
    ws.forEach(function(w){if((" "+en+" ").indexOf(" "+w)>=0||(" "+ar+" ").indexOf(" "+w)>=0)s++;});return {id:id,s:s};});
  var hit=sc.filter(function(x){return x.s>0;}).sort(function(a,b){return b.s-a.s;}).map(function(x){return x.id;});
  ["today","eat","track"].forEach(function(id){if(hit.indexOf(id)<0)hit.push(id);});
  return hit.slice(0,3);}

/* ---- reading the sentence (js/coach/understand.js) --------------------------------
   After safety, before the answers: what the message is and what it names, read
   against this person's own program and log first. The reading picks the answer where
   it has one; where it has none, the router below (intent.js and the rules here) reads
   it as it always did, so nothing that worked before is lost. */
/* The longest library name that the words contain, written out: the English name (three
   words or more), or the name as the app shows it in Arabic (exName, two or more). With
   the words it was written as, so a correction replaces all of them. */
var FULL={};
function fullName(f){
  var L=uiLang()+":"+LIB.length,list=FULL[L];
  if(!list){list=FULL[L]=[];
    LIB.forEach(function(l){var n=l[0];if(isActivity(n))return;var en=fold(n),sh=fold(exName(n));
      if(en.split(" ").length>=3)list.push([n,en]);
      if(sh!==en&&sh.split(" ").length>=2)list.push([n,sh]);});
    list.sort(function(a,b){return b[1].length-a[1].length;});}
  var s=" "+f+" ";for(var i=0;i<list.length;i++)if(s.indexOf(" "+list[i][1]+" ")>=0)return {name:list[i][0],said:list[i][1]};
  return null;}
function readCtx(prevMsg){
  var prog=[],log=[],put=function(a,n){if(n&&a.indexOf(n)<0&&!isActivity(n))a.push(n);};
  try{split().days.forEach(function(d){d.ex.forEach(function(e){put(prog,e.name);});});}catch(e){}
  (S.sessions||[]).slice(0,30).forEach(function(s){(s.entries||[]).forEach(function(e){put(log,e.name);});});
  var mine=prog.concat(log.filter(function(n){return prog.indexOf(n)<0;}));
  var ctx={mine:mine,program:prog,log:log,active:!!S.active,current:S.active?((S.active.entries||[])[S.active.idx||0]||{}).name||"":"",
    lib:function(k){try{var m=matchExercise(k,{lib:true});return m&&m.conf?m.name:"";}catch(e){return "";}},
    food:function(f){try{return !!FOODDB&&namesFood(f);}catch(e){return false;}},full:fullName};
  if(prevMsg&&prevMsg.q){try{ctx.prev=understand(prevMsg.qq||prevMsg.q,{mine:mine,program:prog,log:log,lib:ctx.lib,food:ctx.food});ctx.prev.msg=prevMsg;}catch(e){ctx.prev=null;}}
  return ctx;}
function readOf(text,prevMsg){try{return understand(text,readCtx(prevMsg));}catch(e){return null;}}
/* A request said with the program's own names, in English, for the request's planner
   (js/ui/agent.js): "بدل البنش بدمبل بريس النهارده" → "swap Barbell Bench Press -
   Medium Grip for Dumbbell Bench Press today". The day said is kept. */
function plainRequest(R,text){
  var ex=R.entities.exercise,dd=null;try{dd=daysIn(text);}catch(e){dd=null;}
  var day=dd&&dd.days.length===1?" "+dd.days[0].name:"",when=R.entities.day&&R.entities.day.when==="today"?" today":"";
  var prog=/(program|plan|البرنامج|برنامجي|برنامج)/.test(R.norm)?" in my program":"";
  if(R.topic==="exswap"&&ex.length>=2)return "swap "+ex[0].name+" for "+ex[1].name+(day?" on"+day:"")+when+prog;
  if(R.topic==="exswap"&&ex.length===1)return "swap "+ex[0].name+(day?" on"+day:"")+when;
  if(R.topic==="exadd")return "add "+ex[0].name+(day?" to"+day:"");
  if(R.topic==="exremove")return "remove "+ex[0].name+(day?" from"+day:"");
  return text;}
function inProgramNamed(name){var hit=false;split().days.forEach(function(d){d.ex.forEach(function(e){if(e.name===name)hit=true;});});return hit;}
/* The day a named workout is on, this week: "my leg day" is the next day with legs. */
function dayWith(muscles){
  var sp=split(),n=today(),want=[];muscles.forEach(function(m){want=want.concat(GROUPOF[m]||[m]);});
  for(var i=0;i<7;i++){var iso=addDaysW(n,i),pl=planOn(sp,iso);if(!pl.day||pl.rest||pl.kind==="done")continue;
    var nm=fold(pl.day.name||"");
    if(muscles.some(function(m){return nm.indexOf(m.toLowerCase().replace(/s$/,""))>=0;})||
      pl.day.ex.filter(function(e){return want.indexOf(muscleOf(e.name))>=0;}).length*2>pl.day.ex.length)
      return new Date(iso+"T00:00:00").getDay()||7;}
  return "";}
/* Requests the reading took for something else (owner, 19 Nov): "swap today's training
   with a rest day" is a day skipped, not an exercise swapped; "switch one of today's
   exercises to a simpler one" an easier version; "I don't feel like eating egg" the
   planned food swapped; "I'm craving sugar" something sweet that fits the day. */
var FOODNO=/(don t feel like|dont feel like|not in the mood for|don t want|dont want|sick of|tired of|don t like|dont like|can t eat|cant eat|no more|مش عايز|مش عاوز|مش حابب|مليت من|زهقت من|مش قادر اكل|مش بحب)/;
var CRAVE=/(craving|crave|cravings|sweet tooth|something sweet|want sweets|want sugar|need sugar|نفسي في حاجه حلوه|عايز حاجه حلوه|عاوز حاجه حلوه|نفسي في سكر|نفسي في حلو|مشتهي حاجه حلوه)/;
var GREET=/^(hi|hello|hey|hiya|yo|good (morning|afternoon|evening)|how are you( doing| today)?|how r u|how s it going|how is it going|what s up|whats up|sup|ازيك|عامل ايه|اخبارك|ايه الاخبار|اهلا|صباح الخير|مساء الخير|السلام عليكم)( (coach|man|bro|كوتش|يا كوتش|يا باشا))?$/;
var FOODFILL=/(^| )(yeah|yes|but|ok|okay|well|so|really|just|i|im|i m|me|eating|eat|to eat|having|have|now|right now|today|this|the|any|more|انا|اكل|النهارده|دلوقتي|ده|دي)(?= |$)/g;
var ELSE=/^(something else|anything else|what else|other (options|foods|ideas|things)|another (one|option|idea)|حاجه تانيه|غير كده|ايه تاني|حاجه غير كده)$/;
var LIGHTER=/^((can you |could you |please |)make (it|today|today s workout|the workout|my workout) (lighter|easier|less hard|shorter)|lighter|easier|خليه اخف|خليه اسهل|اخف شويه|اسهل شويه)$/;
function preRoute(R,text){
  var lx=lastExchange(),fqe=fold(text).replace(/[?؟.!]+$/,"").trim();
  if(lx&&/^(eat|swap|crave|rest|foodday)$/.test(lx.id)&&ELSE.test(fqe))return {id:"swap"};
  if(lx&&/^(today|tomorrow|fit|app)$/.test(lx.id)&&LIGHTER.test(fqe))return {id:"lighter"};
  /* "Why …" about a weight, a lighter day, an exercise or today's day (C-6): the why
     answer, never a weigh-in ("why is the weight for squat 80 kg today?"). Calories,
     protein and a stuck lift keep their own answers. */
  if(/^(why|how come|ليه|ليش)( |$)/.test(fqe)&&!/(calorie|kcal|protein|carb|fat|going up|stuck|plateau|not improving|سعر|بروتين|كارب|واقف|مش بيزيد)/.test(fqe)){
    var nmd=R&&R.entities&&R.entities.exercise.some(function(e){return e.name;});
    if(nmd||WHYKIND.light.test(fqe)||/(this exercise|that exercise|التمرين ده)/.test(fqe)||(WHYKIND.day.test(fqe)&&/(workout|training|session|day|full body|upper|lower|push|pull|legs|تمرين)/.test(fqe)))return {id:"why"};}
  var fq0=fold(text).replace(/^(yeah|yes|ok|okay|but|well|so|ايوه|طيب|بس|ماشي)( but| بس|)? /,"");
  /* A greeting alone, "how are you" too: answered as one, never the model's to guess. */
  if(GREET.test(fq0))return {id:"hello"};
  var c=null;try{c=commandOf(text,S.prefs.unit);}catch(e){c=null;}
  if(c&&(c.cmd==="sched.skip"||c.cmd==="ex.easier"))return {cmd:c};
  var fq=fold(text),named=R&&R.entities&&R.entities.exercise.some(function(e){return e.name;});
  if(FOODDB&&!named&&CRAVE.test(fq))return {id:"crave"};
  if(FOODDB&&!named&&FOODNO.test(fq)){var nf=null,rest=fq.slice(fq.search(FOODNO)).replace(FOODNO," ").replace(FOODFILL," ").replace(/\s+/g," ").trim();
    try{nf=rest?namedFood(rest,true)||namedFood(rest,false):null;}catch(e){nf=null;}if(nf)return {id:"swap"};}
  return null;}
/* What the reading decides: {id} for an answer, {cmd} for something to do, {redo} to
   ask again with the text given, or null for the router. */
function decide(R,text){
  var pre=preRoute(R,text);if(pre)return pre;
  /* A sore spot across the program ("swap exercises that load my knee", the pain
     answer's own offer) is a command whole: no exercise from earlier in the conversation
     ("… when I squat") is carried into it. */
  var whole=null;try{whole=commandOf(text,S.prefs.unit);}catch(e){whole=null;}
  if(whole&&whole.cmd==="limit.add")return null;
  /* An Arabic question no rule here reads: its training words in English, asked again
     (answered in Arabic). */
  if(R&&!R.topic&&R.lang==="ar"&&R.kind==="knowledge"){var gl=gloss(R.norm);return gl?{redo:gl,lang:"ar"}:null;}
  if(!R||!R.topic&&!R.followup&&R.kind!=="correction")return null;
  var E=R.entities;
  if(R.kind==="correction"){
    var c=R.correction||{},pv=c.prev;
    if(c.bare)return {id:"correction"};
    if(pv&&pv.msg){var ch=changeOf(c.said,readCtx(null)),rt=retell(pv.msg.qq||pv.msg.q,ch);
      if(rt)return {redo:rt};}
    return null;}
  if(R.followup){var pv2=readCtx(lastExchange()).prev;if(!pv2||!pv2.msg)return null;
    var ch2=changeOf(R.text.replace(/^\s*(and|also|plus|what about|how about|and for|and on|make it|change it to|set it to|طب و|طيب و|وكمان|و|خليها|خليه)\s*/i,""),readCtx(null));
    var rt2=retell(pv2.msg.qq||pv2.msg.q,ch2);
    /* "And the day before?": the reading moved the day by one; the question is said again
       with that day written out. */
    if(!rt2&&R.change&&R.change.day){var dy=R.change.day,ar=R.lang==="ar";
      var dw=dy.when==="today"?(ar?"النهارده":"today"):dy.when==="yesterday"?(ar?"امبارح":"yesterday"):dy.when==="daybefore"?(ar?"اول امبارح":"the day before yesterday")
        :dy.when==="tomorrow"?(ar?"بكره":"tomorrow"):dy.when==="ago"?(ar?"من "+dy.n+" ايام":dy.n+" days ago"):"";
      if(dw)rt2=fold(pv2.msg.qq||pv2.msg.q).replace(/(^| )(the day before yesterday|\d+ days ago|today|yesterday|tomorrow|اول امبارح|من \d+ ايام|النهارده|امبارح|بكره)(?= |$)/g," ").replace(/\s+/g," ").trim()+" "+dw;}
    return rt2?{redo:rt2}:null;}
  if(R.confidence<0.5)return {id:"clarify"};
  switch(R.topic){
    case "record":case "technique":case "foodday":case "day":case "volume":case "why":case "fit":case "days":return {id:R.topic};
    case "eat":case "weight":case "today":case "tomorrow":case "zones":case "steps":case "missed":case "lowday":case "sore":return {id:R.topic};
    case "week":return {id:"week"};
    case "plateau":return {id:"plateau"};
    case "kfreq":return {id:"kfreq"};
    /* Tired all the time, how fast weight can safely come off, eating at an event: the
       written answer for each (js/data/faq.js), with the person's own figures in it
       (FAQMINE). */
    case "tired":var ft=faqById("tired-always");return ft?{id:"faq",faq:ft}:{id:"tired"};
    case "rate":var fr=faqById("loss-rate");return fr?{id:"faq",faq:fr,rate:R.rate||null}:null;
    case "event":var fe=faqById("event-eating");return fe?{id:"faq",faq:fe}:null;
    case "scope":return {id:"scope",force:R.mode};
    case "unknown":return {id:"unknown",out:R.mode};
    case "exswap":case "exadd":case "exremove":
      if(!E.exercise.length||E.exercise.some(function(x){return !x.name;}))return null;
      var A0=E.exercise[0].name,B0=E.exercise[1]&&E.exercise[1].name;
      if(R.topic==="exadd")return {id:"exadd",p:{name:A0}};
      if(!inProgramNamed(A0))return {id:R.topic,text:plainRequest(R,text)};
      return {id:R.topic,p:R.topic==="exswap"?(B0?{from:A0,name:B0}:{from:A0}):{name:A0}};
    case "avoid":
      /* Left out for good, the family said or the one named (agent.js planLeave). */
      var x0=E.exercise[0];
      if(x0&&(x0.name||x0.key))return {cmd:{cmd:"exercise.avoid",key:x0.key||"",name:x0.name||"",said:x0.said||""}};
      return {id:"avoid"};
    case "away":
      var gear=["Bodyweight"],said=false;
      E.equipment.forEach(function(k){if(KITOF[k]&&k!=="Bodyweight"){gear=gear.concat(KITOF[k]);said=true;}if(k==="Bodyweight"||k==="NoGym")said=true;});
      if(!said)return {id:"away"};
      /* Next week, kit said: that week's dates (agent.js planTravel), not from today. */
      if(R.entities.period==="nextweek")return {cmd:{cmd:"travel.set",gear:gear,days:0,until:"",next:true}};
      return {cmd:{cmd:"travel.set",gear:gear,days:-1,until:""}};
    case "move":
      var to=E.day&&E.day.when==="weekday"?E.day.n:E.day&&E.day.when==="tomorrow"?"tomorrow":"";
      var from=E.weekdays.length>1?E.weekdays[0]:E.muscle.length?dayWith(E.muscle):/(tomorrow|بكره)/.test(R.norm)&&to!=="tomorrow"?"tomorrow":/(today|النهارده)/.test(R.norm)?"today":"";
      if(!to)return null;
      if(!from&&E.muscle.length)return {say:{s:"say",lead:fill(t("There's no {m} day in your program this week to move."),{m:tm(E.muscle[0])}),acts:[{l:t("Open Training"),a:{"data-tab":"train"}}]}};
      return {cmd:{cmd:"sched.move",from:from||"",to:to}};
    case "logset":
      var kg=E.numbers.filter(function(x){return x.unit==="kg"||x.unit==="lb";})[0],rp=E.numbers.filter(function(x){return x.unit==="reps";})[0]||E.numbers.filter(function(x){return x!==kg;})[0];
      return {cmd:{cmd:"set.log",w:kg?kg.n:0,unit:kg?kg.unit:"",r:rp?rp.n:0}};
    case "goal":return {cmd:{cmd:"plan.goal",goal:R.mode||""}};}
  return null;}

function withTold(fn,kinds,food){return function(a,q,it){fn(a,q,it);return told(a,kinds,food);};}
var ANSWER={month:aMonth,live:aLive,phase:aPhase,zones:aZones,health:aHealth,faq:aFaq,plateau:aPlateau,inbody:aInBody,twice:aTwice,warmplan:aWarmPlan,loadlog:aLoadLog,week:aWeek,today:aToday,weights:aWeights,eat:aEat,track:aTrack,weight:aWeight,protein:aProtein,calories:aCalories,
  sore:aSore,missed:aMissed,balance:aBalance,strong:aStrong,goal:aGoal,plan:aPlan,water:aWater,steps:aSteps,
  help:aHelp,hello:aHello,crave:aCrave,lighter:aLighter,thanks:aThanks,unknown:aElse,tomorrow:aTomorrow,last:aLast,rest:aRest,swap:aSwap,foodinfo:aFoodInfo,
  kreps:aKReps,ksets:aKSets,krest:aKRest,kfreq:aKFreq,kvolume:aKVolume,ktempo:aKTempo,kwarm:aKWarm,kdur:aKDur,k1rm:aK1RM,
  scope:aScope,reassess:aReassess,situation:function(a,q,it){return aSituation(a,q,it,it.sit||{kind:"day"});},weekfood:aWeekFood,logfood:aLogFood,weektrain:aWeekTrain,letgo:aLetGo,lowday:aLowDay,
  remember:aRemember,facts:aFacts,
  record:aRecord,technique:aTechnique,tired:aTired,foodday:aFoodDay,day:aDay,volume:aVolume,why:aWhy,fit:aFit,days:aDays,avoid:aAvoid,away:aAway,out:aOut,clarify:aClarify,correction:aCorrection};

/* Which way a message goes when the words could go two ways: a request that names a
   food is about food, one that names an exercise is about training; a weight with a
   number in it, said rather than asked, is a weigh-in. */
/* A message that starts with the verb is that request, whatever else it names
   ("add squats" is an add, not a question about squats). */
var VERB=[["exadd",/^(please |pls |can you |could you |i want to |i wanna |)(create|make)( me| a| an| my| new| custom| own)* (exercise|move|movement|lift)( |$)|^(اعمل|اعملي|ضيف|ضيفلي) (تمرين|حركه) (جديد|جديده)( |$)/],
  ["exadd",/^(please |pls |can you |could you |i want to |i wanna |)(add|put|include)( |$)|^(ممكن |عايز |عاوز |)(ضيف|اضيف|ضيفلي|حط|حطلي)( |$)/],
  ["exremove",/^(please |pls |can you |could you |i want to |i wanna |)(remove|delete|drop|take out)( |$)|^(ممكن |عايز |عاوز |)(شيل|امسح|احذف)( |$)/],
  ["exswap",/^(please |pls |can you |could you |i want to |i wanna |)(swap|replace|switch|substitute)( |$)|^(ممكن |عايز |عاوز |)(بدل|استبدل)( |$)/],
  ["foodlog",/^(please |pls |can you |)(log|i ate|ate|just ate)( |$)|^(سجل|سجلي|اكلت|كلت)( |$)/]];
/* A question is not an instruction (owner, 27 Oct): "does volume include the bar?"
   asks about the bar; it does not add one. Asking words first, or a question mark
   after anything but "can I", "could you", "please"…, keep a change to the program
   from starting; the next thing the words could be is answered instead. */
var QSTART=/^(does|do|did|is|are|was|were|when|what|whats|why|how|where|which|who|whose|will|hal|هل|امتي|امتى|ازاي|ليه|ايه|فين|انهي|اني)( |$)/;
var ASKOK=/^(can|could|would|will you|may|should|shall|please|pls|i|id|im|lets|let|ممكن|عايز|عاوز|عايزه|لو سمحت)( |$)/;
var HOWDO=/^(how (do|can|would|should) i (add|put|include|remove|delete|drop|swap|replace|switch)|(is it possible to|هل ممكن|هو ممكن) )( |$)?/;
/* "اشرب مايه قد ايه" asks how much water to drink; it does not log a glass. A command
   that logs something is not run from a question. */
var LOGCMD=/\.(add|log)$/;
function isQuestion(text){var f=fold(text);return /[?؟]/.test(text)||ASKQ.test(f)||/(^| )(ايه|ازاي|ليه|امتي|فين|كام|قد ايه|how much|how many|should i)( |$)/.test(f);}
/* A message that starts with a request's verb ("add squats…", "log 2 eggs"). */
function verb0(text){var f=fold(text);return VERB.some(function(v){return v[1].test(f);});}
function askedOnly(text){var fq=fold(text);if(HOWDO.test(fq))return false;return QSTART.test(fq)||(/[?؟]/.test(text)&&!ASKOK.test(fq));}
function route(iid,text,it){
  var fq0=fold(text),verb=false;
  /* A resting heart rate is not a zone: the app has no data on it, and says so. */
  if(iid==="zones"&&/resting (heart|pulse|hr)|heart rate at rest|نبض الراحه|النبض وانا مرتاح/.test(fq0))iid="unknown";
  for(var vi=0;vi<VERB.length;vi++)if(VERB[vi][1].test(fq0)&&!(VERB[vi][0]==="foodlog"&&/^log /.test(fq0)&&/weight|وزن/.test(fq0))){iid=VERB[vi][0];verb=true;break;}
  if(!verb&&/^(exadd|exremove|exswap)$/.test(iid)&&askedOnly(text))
    iid=(it.ranked||[]).filter(function(x){return ACTION_IDS.indexOf(x)<0;})[0]||"unknown";
  var asked=/\?|؟|on track|stuck|should|why|how|ماشي|ليه|ازاي/.test(fold(text)+(/[?؟]/.test(text)?" ?":""));
  if((iid==="weight"||iid==="weighlog")&&it.kg&&!asked)return "weighlog";
  if(iid==="weighlog"&&!it.kg)return (it.ranked||[]).filter(function(x){return x!=="weighlog";})[0]||"weight";
  if(iid==="exswap"&&!namesExercise(text)&&namesFood(text))return "swap";
  if(iid==="swap"&&/ instead of | in place of /.test(" "+fq0+" ")&&namesExercise(text)&&!namesFood(text))return "exswap";
  if(iid==="exadd"&&!namesExercise(text)&&namesFood(text))return "foodlog";
  /* "Protein in foul", "سعرات الكشري": a food named in a protein or calorie question is
     about the food, not the person's target. */
  if((iid==="protein"||iid==="calories")&&FOODDB&&!/ (per|a|each|every|ل?كل) (meal|وجبه)( |$)/.test(" "+fq0+" ")&&namedFood(text,true)&&!/ (my|i|me|انا|بتاعي|محتاج|احتاج)( |$)/.test(" "+fq0+" "))return "foodinfo";
  return iid;}
/* Ask: q is what the person typed, or a suggestion's id (with the conversation's
   language, lang). Kept with its answer and the language it was answered in. */
/* The conversation is kept for a day; what the person told the coach to remember is
   kept apart (S.context, js/coach/context.js) and is not touched by this. */
var DAY=864e5;
/* How long things are kept (owner, 27 Oct): the conversation shows the last day; the
   chat history (Profile → Chat history, histSheet) keeps thirty, read only, and what is
   older is gone. Clearing the conversation (S.chatFrom) only hides it from the chat. */
var KEEP_MS=30*DAY;
function pruneChat(){
  var c=S.chat||[],now=Date.now(),kept=c.filter(function(m){return m&&typeof m==="object"&&num(m.at)>now-KEEP_MS;}),ch=false;
  /* A smart-coach answer still "Thinking…" from before (the app closed mid-answer, or the
     model stalled past its time): said it couldn't answer, not left waiting for good. */
  kept.forEach(function(m){if(m.pending&&num(m.at)<now-SMART_MS){m.pending=false;m.b=[{p:t("The smart coach couldn't answer that one. Ask me another way, or try again.")}];ch=true;}});
  if(kept.length!==c.length||ch){S.chat=kept;return true;}
  return false;}
var SMART_MS=90000;
/* The exchange a new message may follow on from: the newest one, if it is recent. */
var FOLLOW=30*60000;
function lastExchange(){var c=chatShown(),m=c[c.length-1];return m&&num(m.at)>Date.now()-FOLLOW?m:null;}
var YES=/^(yes|yeah|yep|yup|sure|ok|okay|do it|go ahead|please do|add it|log it|save it|swap it|remove it|ايوه|اه|ايوا|تمام|ماشي|اوك|نعم|ضيفه|سجله|احفظه|بدله|شيله)( |$)/;
var NO=/^(no|nope|not now|dont|don t|cancel|لا|لأ|مش دلوقتي|بلاش|خلاص)( |$)/;
var MORE=/^(and|also|plus|what about|how about|و|كمان|وكمان)( |$)/;
/* When the knowledge base answers instead: a question no answer here is for; one the
   matched answer is only loosely about (one word of it, as "sleep" is to soreness);
   or one that asks what something is or why. */
var SOFT=/^(sore|steps|help|track|hello|thanks|missed|goal|strong|balance|today|tomorrow|plan|lowday)$/;
var DEFINE=/^(what is|what are|whats|what s|define|explain|tell me about|why (is|are|do|does|should|would|must)|is it (good|bad|ok|okay|better|safe|true)|benefits? of|difference between|يعني ايه|ايه هو|ايه هي|ايه فايده|فايده|ليه)( |$)|\b(before|after) (a |my |the |)(workout|training|session|gym|lifting|run)\b|\b(how (many|much|long|often))\b/;
var ASKQ=/[?؟]|^(how|what|why|when|which|should|is|are|do|does|can|كام|ايه|ازاي|ليه|امتي|هل)( |$)|(^| )(كام|قد ايه|ازاي)( |$)/;
/* A short follow-up to the last answer: "why?", "more", "but how many hours?". */
var EXQ=/\b(exercises?|moves?|movements?|lifts?)\b.*\b(for|to (build|grow|train|work|target|hit))\b|\b(best|good|what|which|suggest|recommend)\b.*\b(exercises?|moves?|lifts?)\b|\b(train|work|hit|grow|build)\b.*\b(chest|back|shoulders?|quads?|legs?|hamstrings?|glutes?|biceps?|triceps?|calves)\b.*\?|تمارين|تمرين ل|(اكبر|اكبّر|تكبير|اضخم|اقوي|اقوى) (ال)?(صدر|ضهر|ظهر|كتف|اكتاف|رجل|فخذ|باي|تراي|سمانه|مؤخره|خلفيه)/;
var ONTO=/^(yeah|yes|ok|okay|but|and|so|hmm|well|what about|how about|then|طب|طيب|بس|و|يعني|ماشي|اه)( |$)/;
var DEEPER=/^(why|how come|more|tell me more|explain|details|go on|really|ليه|ازاي|اكتر|وضح|كمل)( |$)/;
/* An exercise named that is not in today's workout: a question about it, not the session. */
function namedOther(text){var ns=namedExercises(text)||[];if(!ns.length||!S.active)return false;
  return ns.some(function(n){return !S.active.entries.some(function(e){return e.name===n;});});}
/* What a message in a workout is about when it is not the workout: food, water, sleep,
   body weight, steps, another day. And the words that tie a question to the session. */
var OFFSESS=/(^| )(eat|ate|food|meal|breakfast|lunch|dinner|snack|protein|calorie|calories|kcal|carbs?|diet|water|drink|sleep|slept|weigh|my weight|body weight|bodyweight scale|steps|walked|tomorrow|yesterday|next week|last week|program|my plan|split|اكل|كلت|وجبه|فطار|غدا|عشا|بروتين|سعرات|كارب|دايت|مايه|ميه|نوم|نمت|وزني|خطوات|بكره|امبارح|الاسبوع)( |$)/;
var SESSW=/(^| )(this|current|now|next|set|sets|rep|reps|rest|resting|weight|exercise|machine|form|tempo|warm|heavy|light|ده|دي|دلوقتي|الجاي|مجموعه|عده|عدات|راحه|وزن|التمرين|تقيل|خفيف)( |$)/;
var DOWORK=/ (complete|finish|end|stop|skip|delete|remove|add|log|undo|redo|repeat|move|swap|done with) (the |this |my |a |one |current |last |next )*(set|sets|exercise|exercises|workout|session|rep|reps) /;
function knowFor(text,iid,it,prev){
  var fq=fold(text),short=fq.split(" ").length<=8;
  if(prev&&prev.id==="know"&&prev.kq&&DEEPER.test(fq)&&short){var kd=lookup(prev.kq);if(kd)return {k:kd,kq:prev.kq,deeper:true};}
  var asked=ASKQ.test(fq)||/[?؟]/.test(text);
  /* What lives in the app has its own answer (aElse: Profile > You, no data), and pain
     is referred, never looked up (aSore → aScope). */
  if(ELSEWHERE.some(function(x){return x[1].test(fq);})||PAIN.test(fq))return null;
  /* Something to do to the workout ("complete the current exercise", "delete this set")
     is never read as a question for the knowledge files. */
  if(DOWORK.test(" "+fq+" "))return null;
  /* "What's my max bench": the person's own figures, not the textbook's. */
  if(ownQuestion(text,iid))return null;
  var loose=iid==="unknown"||(SOFT.test(iid)&&it.score<=7&&asked)||(DEFINE.test(fq)&&it.score<15&&(SOFT.test(iid)||iid==="eat"));
  if(!loose)return null;
  var k=lookup(text);
  if(k&&(iid==="unknown"||k.titled))return {k:k,kq:text};
  /* Not enough on its own: read with the question before it. */
  var base=prev&&(prev.kq||prev.q);
  /* "ok" alone says nothing new: only a follow-up with a word of its own is read on. */
  if(iid==="unknown"&&base&&ownTerms(text).length&&(ONTO.test(fq)||fq.split(" ").length<=4)){var kc=lookup(base+" "+text);if(kc)return {k:kc,kq:base+" "+text};}
  return null;}
/* ---- what follows from the last request ----------------------------------------------
   "No, I meant Friday", "same for Thursday", "and Pull too": the last request said again
   with the day (or the exercise) changed, and run as if typed so (rewrite). Two requests
   in one message ("add squats to Monday and remove leg press") are two messages, each
   with its own buttons (pair). "Undo that": the newest change that can still be undone. */
var CORR=/^(no+|nope|not that|wrong|sorry|oops)?[ ,.!]*(i meant|i mean|meant|make it|change it to|actually|لا|لأ|قصدي|اقصد)( |$)/;
var SAME=/^(do |)(the same|same|that|it)( again| too|)( for| on| to| in| with)( .+)$|^(and|also|plus|و|وكمان) (.+?)( too| as well| كمان|)$/;
var PREP={exadd:"to",exremove:"from",exswap:"in"};
/* "it", "that one", "ده": the exercise the last exchange was about (owner, 27 Oct),
   said in its place, in a request that names none of its own: "add it to Friday too",
   "swap it", "شيل ده". ("How do I do it" in a workout is the exercise on screen, commands.js.) */
var PRON=/(^| )(it|that|this|that one|this one|ده|دي|هو|هي)(?= |$)/;
var PRONVERB=/^(please |pls |can you |could you |)(add|put|include|remove|delete|drop|take out|swap|replace|switch|substitute|ضيف|حط|شيل|امسح|بدل|استبدل)( |$)/;
function lastExercise(prev){
  var p=prev&&prev.ag&&prev.ag.p,n=p&&(p.name||p.from);
  if(n&&typeof n==="string")return n;
  var ne=prev?namedExercises(prev.qq||prev.q||""):[];
  return ne.length?ne[0].name:"";}
function withReferent(q,prev){
  var fq=fold(q);
  if(!PRONVERB.test(fq)||!PRON.test(" "+fq.replace(PRONVERB,"")+" ")||namedExercises(q).length)return null;
  var nm=lastExercise(prev);if(!nm)return null;
  var head=fq.match(PRONVERB)[0],rest=" "+fq.slice(head.length)+" ";
  return (head+rest.replace(PRON,"$1"+nm.toLowerCase())).replace(/\s+/g," ").trim().replace(/ (too|as well|also|كمان)$/,"");}
function rewrite(q){
  var prev=lastExchange();if(!prev||!prev.q)return null;
  var fq=fold(q),m,target,corr=false;
  var rf=withReferent(q,prev);if(rf)return rf;
  if((m=fq.match(CORR))){target=fq.slice(m[0].length).trim();corr=true;}
  else if((m=fq.match(SAME)))target=(m[5]||m[7]||"").replace(/^(for|on|to|in|with) /,"").trim();
  target=target.replace(/^(on|for|to|the|in|it|يوم|ل|لـ) /,"").replace(/ (day|يوم)$/,"").trim();
  /* Only a day or a name: anything longer, or a request of its own, is read as itself. */
  if(!target||target.split(" ").length>4||commandOf(target,S.prefs.unit))return null;
  /* The request as it was run: a correction's own words are not the request. */
  var pq=spell(fold(prev.qq||prev.q)),w=whenIn(target);
  if(w.length){
    var tk=pq.split(" "),at=-1;tk.forEach(function(x,i){if(whenIn(x).length)at=i;});
    var tw=target.split(" ").filter(function(x){return whenIn(x).length;}).pop();
    if(at>=0){tk[at]=tw;return tk.join(" ");}
    return pq+" "+tw;}
  var dd=daysIn(target);
  if(dd.days.length===1&&PREP[prev.id]){var pd=daysIn(prev.qq||prev.q);return pd.left+" "+PREP[prev.id]+" "+dd.days[0].name;}
  /* A correction naming something else: the same request with that instead. */
  if(corr&&(prev.id==="exadd"||prev.id==="exremove")){var pd2=daysIn(prev.qq||prev.q);
    return (prev.id==="exadd"?"add ":"remove ")+target+(pd2.days.length===1?" "+PREP[prev.id]+" "+pd2.days[0].name:"");}
  return null;}
/* Two requests at once, each something to do (a command, or a change to the program
   or the log, as its verb says). */
var JOIN=/ (and then|then|and also|and|ثم|وبعدين|و بعدين|وكمان) /;
function splitTwo(q){
  var s=String(q).trim(),m=s.match(JOIN);if(!m)return null;
  var a=s.slice(0,m.index).trim(),b=s.slice(m.index+m[0].length).trim();
  var doing=function(x){var f=fold(x);return !!commandOf(x,S.prefs.unit)||VERB.some(function(v){return v[1].test(f);});};
  return a&&b&&doing(a)&&doing(b)?[a,b]:null;}
function undoLast(){
  var c=chatShown();for(var i=c.length-1;i>=0;i--){var m=c[i];
    if(m&&m.ag&&m.ag.s==="applied"&&canUndo(m.at))
      return {s:"say",lead:fill(t("Undo “{d}”?"),{d:String(m.ag.done||"")}),acts:[{l:t("Undo it"),a:{"data-agundo":String(m.at)}}]};}
  return {s:"say",lead:t("There's nothing recent to undo."),acts:[]};}
/* ---- a day told in one message (js/coach/recap.js) -------------------------------------
   The foods found (each in one usual serving unless the amount was said, which is said
   as an estimate), offered to the day with one tap and Undo; what could not be found
   named; the training noted (no sets are made up); and what else to do today: the
   protein and energy left, water, and rest for what was trained, tomorrow's plan
   included. */
/* A serving as stored ("1 × can", "100 g"), said in the reader's language. */
function shownLabel(l){return String(l||"").replace(/^(\S+ × )(.+)$/,function(_,a,u){return a+t(u);}).replace(/(\d) g$/,function(_,d){return d+" "+t("g");});}
function shownFood(f){return foodName(f);}
function findFood(q){
  var tries=[q],m=/^(.+?) (في|in a|in) (ساندوتش|sandwich|sandwiches)$/.exec(q);
  if(m)tries=["ساندوتش "+m[1],m[1]+" sandwich",m[1]];
  for(var i=0;i<tries.length;i++){
    var hits=searchFoods(tries[i],5).filter(function(h){return h.score>=85;});
    if(!hits.length)continue;
    var eat=hits.filter(function(h){return h.score>=hits[0].score-12&&!INGREDIENT.test(h.f.n);});
    return (eat[0]||hits[0]).f;}
  return null;}
/* A day told, and something in it the coach can act on: a food it knows, or a workout.
   "I had a bad day, didn't stick to the diet" reads like meals and is not one. */
function dayTold(q){
  var rc=recapOf(q);if(!rc)return null;
  var any=rc.muscles.length||rc.foods.some(function(f){return findFood(f.q)||(f.parts||[]).some(findFood);});
  return any?rc:null;}
var MUSCLEOF={Legs:["Quads","Hamstrings","Glutes","Calves"],Arms:["Biceps","Triceps"]};
function recapMsg(text,rc,L){
  var items=[],miss=[],guess=false;
  rc.foods.forEach(function(x){
    var list=[x.q],f=findFood(x.q);
    if(!f&&x.parts)list=x.parts;
    (f?[f]:list.map(findFood)).forEach(function(ff,k){
      if(!ff){miss.push(f?x.q:list[k]);return;}
      var gq=gramsFor(ff,1,null),n=nutritionFor(ff,gq.g);
      items.push({f:ff,g:gq.g,label:gq.label,meal:x.meal||nextMeal(today()),n:n});if(x.guess)guess=true;});});
  /* Today, with these added. */
  var now=today(),r=(S.days||{})[now]||{},had=[];
  Object.keys(r.meals||{}).forEach(function(k){had=had.concat((r.meals[k]&&r.meals[k].items)||[]);});
  var tot=sumNutrition(had.concat(items.map(function(i){return i.n;}))),G=S.goals||{};
  var notes=[];
  if(rc.muscles.length){
    var mm=rc.muscles.map(function(m){return tm(m).trim();}).join(uiLang()==="ar"?" و":" and ");
    var logged=(S.sessions||[]).some(function(s){return s.date===now&&(s.entries||[]).some(function(e){return !isActivity(e.name);});});
    if(!logged)notes.push(fill(t("I haven't logged the {m} workout: I don't know your sets, and I won't make them up. Add it in Training when you can."),{m:mm}));
    var tmw=addDaysISO(now,1),pd=planOn(split(),tmw),hit=false;
    if(pd&&pd.day&&!pd.rest){var mus={};(pd.day.ex||[]).forEach(function(e){mus[muscleOf(e.name)]=(mus[muscleOf(e.name)]||0)+num(e.sets);});
      rc.muscles.forEach(function(m){(MUSCLEOF[m]||[m]).forEach(function(x){if(num(mus[x])>=3)hit=true;});});}
    notes.push(fill(t(hit?"{m} trained today needs a rest day before it's trained hard again, and tomorrow's {d} trains it too: Training will offer a fresher day.":"{m} trained today: give it a rest day before training it hard again."),
      {m:mm,d:pd&&pd.day?planName(pd.day.name):""}));}
  if(num(G.p)){var pl=Math.round(num(G.p)-tot.p);
    if(pl>=15){var pf=["tuna_water","greek_yog_0","gebna_areesh","chicken_breast_ck","egg_boiled"].map(function(id){return (FOODDB||[]).filter(function(y){return y.id===id;})[0];}).filter(Boolean)
        .filter(function(y){return allowed(y,{diet:S.prefs.diet,avoid:S.prefs.avoid||[],powder:true});})[0];
      if(pf){var pg=gramsFor(pf,1,null),pn=nutritionFor(pf,pg.g);
        notes.push(fill(t("Protein: about {p} g still to go today. {f}, {a}, adds {x} g."),{p:pl,f:shownFood(pf),a:shownLabel(pg.label),x:Math.round(pn.p)}));}
      else notes.push(fill(t("Protein: about {p} g still to go today."),{p:pl}));}
    else notes.push(t("Protein: on target for today."));}
  if(num(G.kcal)){var kl=Math.round((num(G.kcal)-tot.kcal)/10)*10;
    notes.push(kl>=0?fill(t("About {k} kcal left for the day."),{k:fmtN(kl)}):fill(t("About {k} kcal over today's target. No need to make it up tomorrow: eat to target and the week evens out."),{k:fmtN(-kl)}));}
  var wl=num(G.water)-num(r.water);
  if(num(G.water)&&wl>200)notes.push(fill(t("Water: {l} L still to drink."),{l:(Math.round(wl/100)/10).toFixed(1)}));
  if(rc.muscles.length||rc.ask){var sl=KB.sleep();if(sl)notes.push(fill(t("Sleep {lo} to {hi} hours tonight: it's when the training pays off."),{lo:sl.min,hi:sl.max}));}
  if(miss.length)notes.push(fill(t("I couldn't tell which food “{q}” is, or how much: add it on Food so the day is complete."),{q:miss.join(uiLang()==="ar"?"، ":", ")}));
  if(items.length&&guess)notes.push(t("Amounts are one usual serving each, an estimate: change any of them on Food."));
  var lead=items.length?t("Here's your day as I read it. Add it?"):t("Here's what I'd do with the rest of today.");
  var ag=items.length?{s:"confirm",act:"food.logMany",p:{items:items.map(function(i){return {fid:i.f.id,g:i.g,label:i.label,meal:i.meal};})},
      lead:lead,items:items.map(function(i){return {item:shownFood(i.f)+" · "+mealName(i.meal),detail:shownLabel(i.label)+" · "+fill(t("{k} kcal · {p} g protein"),{k:fmtN(i.n.kcal),p:Math.round(i.n.p)})};}),
      notes:notes,cta:t("Add to my day"),done:t("Added to today."),undone:t("Undone. Today is as it was.")}
    :{s:"say",lead:lead,notes:notes,acts:[{l:t("Open Food"),a:{"data-tab":"food"}}]};
  return {q:text,id:"recap",at:Date.now(),b:[],acts:[],ag:ag,lang:L};}
function safetyReply(q,sf){
  var L=sf.lang==="ar"?"ar":"en";
  return withLang(L,function(){
    var text=String(q).trim().slice(0,300),a=A(),id="safety";
    if(sf.cls==="stop"){
      p(a,t("Stop training now. This can be an emergency: call your local emergency number or get to a doctor now."));
      if(S.active)act(a,t("End my workout"),{"data-finish":"1"});
      src(a,(KB.scopeRule("emergency_certified")||{}).src);}
    else if(sf.cls==="session"){
      p(a,t("Stop this session, sit down and sip some water. If it doesn't pass in a few minutes, or it comes back, see a doctor before you train again."));
      if(S.active)act(a,t("End my workout"),{"data-finish":"1"});
      act(a,t("Note it in the recovery log"),{"data-sheet":"recovery"});
      src(a,(KB.scopeRule("refer_unusual_pain")||{}).src);}
    else if(sf.sub==="care"){
      p(a,t("That sounds hard, and you don't have to carry it alone. Please talk to a doctor or someone you trust today."));
      src(a,(KB.scopeRule("refer_suspected_mental_illness")||{}).src);}
    else{id="scope";var sc=scopeOf(text);scopeAnswer(a,text,sc&&(sc[0]==="medical"||sc[0]==="mental")?sc:SCOPE[1]);}
    return {q:text,id:id,at:Date.now(),b:a.b,acts:a.acts,src:a.src&&a.src.length?a.src:undefined,lang:L,safety:sf.cls,ssub:sf.sub};});}
/* Whether a message is a red flag: then the on-device model never sees it. */
function isSafety(q){try{return !!safetyOf(q).cls;}catch(e){return false;}}

/* The coach's indexes (the knowledge search, the answer bank, the phrases, the food and
   exercise names) are built the first time they are used, which made the first question
   wait 60–100 ms (more on a phone) before the message even left the box. They are built
   when the chat opens instead, a piece per idle moment, before anything is typed. */
var WARM=false;
function warmCoach(){
  if(WARM)return;WARM=true;
  var steps=[function(){lookup("protein");},function(){faqMatch("how much protein");},function(){intentOf("how much protein");},
    function(){situationOf("i had a bad day");},function(){namesExercise("bench press");},function(){namesFood("rice");}];
  var idle=typeof requestIdleCallback==="function"?function(f){requestIdleCallback(f,{timeout:300});}:function(f){setTimeout(f,30);};
  (function next(){var f=steps.shift();if(!f)return;idle(function(){try{f();}catch(e){}next();});})();}
/* C-10 (docs/COACH-AGENT.md 2.8): what the coach could not read is kept on this phone,
   per profile, with the "Not what I asked" ones (S.missed, newest last, 200 at most):
   an answer of "not sure", "did you mean" or a correction keeps its question without a
   tap. Nothing is sent anywhere; the list is copied or exported as a file from Chat
   history, to be added to the evaluation set. */
var MISSIDS=/^(unknown|clarify|correction)$/;
function ask(q,id,lang){
  var m=askIn(q,id,lang);
  try{if(m&&!m.tap&&m.q&&!id&&MISSIDS.test(m.id||"")){
    S.missed=(Array.isArray(S.missed)?S.missed:[]).concat([{q:String(m.q).slice(0,300),id:String(m.id),at:Date.now(),lang:m.lang==="ar"?"ar":"en",how:"auto"}]).slice(-200);
    m.missKept=1;}}catch(e){}
  return m;}
function askIn(q,id,lang){
  /* A red flag is read before anything else, as said: never rewritten or split. */
  if(!id&&isSafety(q))return askOne(q,null,lang);
  /* A day told in one message is read whole, not cut in two. */
  if(!id&&S.onboarded&&FOODDB&&dayTold(q))return askOne(q,null,lang);
  if(!id&&S.onboarded){
    /* A correction or a follow-up the reading can re-tell goes there first (askOne),
       before the older rewrite, which only knows days and names in requests. */
    var R0=readOf(String(q).trim().slice(0,300),lastExchange()),d0=null;try{d0=decide(R0,String(q));}catch(e){d0=null;}
    if(d0&&d0.redo&&!d0.lang&&REDO<2){REDO++;var m0;try{m0=askOne(d0.redo,null,lang);}finally{REDO--;}
      if(m0&&!m0.tap){m0.qq=d0.redo;m0.q=String(q).trim().slice(0,300);}return m0;}
    var rw=null;try{rw=rewrite(q);}catch(e){rw=null;}
    if(rw){var mr=askOne(rw,null,lang);if(mr&&!mr.tap){mr.qq=rw;mr.q=String(q).trim().slice(0,300);}return mr;}
    var two=null;try{two=splitTwo(q);}catch(e){two=null;}
    if(two){var m1=askOne(two[0],null,lang);if(!m1||m1.tap)return m1;
      var m2=askOne(two[1],null,lang);if(!m2||m2.tap)return m1;
      if(m2.at<=m1.at)m2.at=m1.at+1;m1.pair=1;m2.pair=1;return m2;}}
  return askOne(q,id,lang);}
var REDO=0,FORCEL="";
function askOne(q,id,lang){
  pruneChat();
  /* Safety first: nothing else, the on-device model included, can answer a red flag. */
  if(!id){var sf=null;try{sf=safetyOf(q);}catch(e){sf=null;}
    if(sf&&sf.cls){var sm=safetyReply(q,sf);S.chat=(S.chat||[]).concat([sm]).slice(-KEEP);return sm;}}
  /* A short answer to the last question: yes or no to a change waiting for a tap is that
     tap (the caller runs it; nothing is added to the conversation). */
  var prev=id?null:lastExchange(),fq0=id?"":fold(q);
  if(prev&&prev.ag&&prev.ag.s==="confirm"&&(YES.test(fq0)||NO.test(fq0))){
    /* "No wait, tomorrow", "no, bench instead" (owner's test, 19 Nov): not only no. The
       card is declined and the request said again with what changed. */
    var more=NO.test(fq0)?fq0.replace(NO,"").replace(/^[ ,]+/,"").replace(/^((wait|sorry|actually|i meant|i mean|instead|make it|استني|قصدي|اقصد|بل)( |$))+/,"").trim():"";
    if(!more||REDO>=2)return {tap:YES.test(fq0)?{agok:String(prev.at)}:{agno:String(prev.at)}};
    prev.ag.s="declined";
    var rt=null;try{rt=retell(prev.qq||prev.q,changeOf(more,readCtx(null)));}catch(e){rt=null;}
    REDO++;var mn;try{mn=askOne(rt||more,null,lang);}finally{REDO--;}
    if(mn&&!mn.tap){mn.qq=rt||more;mn.q=String(q).trim().slice(0,300);}
    return mn;}
  var it=id?{id:id,ranked:[]}:intentOf(q);
  /* "yes" to a choice: the choice is still to make, so it is asked again. */
  if(prev&&prev.ag&&prev.ag.s==="pick"&&(YES.test(fq0)||NO.test(fq0))){
    var Lp=prev.lang==="ar"||prev.lang==="en"?prev.lang:uiLang();
    var again=withLang(Lp,function(){return {q:String(q).trim().slice(0,300),id:prev.id,at:Date.now(),b:[],acts:[],lang:Lp,
      ag:NO.test(fq0)?{s:"say",lead:t("Kept as it is."),acts:[]}:Object.assign({},prev.ag,{lead:t("Which one? Tap it, or say its name.")})};});
    S.chat=(S.chat||[]).concat([again]).slice(-KEEP);return again;}
  var L=FORCEL||(id?(lang==="ar"||lang==="en"?lang:uiLang()):it.lang==="ar"?"ar":"en");
  /* The sentence read (js/coach/understand.js): a correction or a follow-up is the last
     message said again with the change in it; anything else may pick its answer here. */
  var R=null,dz=null;
  if(!id&&S.onboarded){R=readOf(String(q).trim().slice(0,300),prev);try{dz=decide(R,String(q));}catch(e){dz=null;}it.reading=R;}
  if(dz&&dz.redo&&REDO<2){REDO++;var mr,fl=FORCEL;if(dz.lang)FORCEL=dz.lang;try{mr=askOne(dz.redo,null,L);}finally{REDO--;FORCEL=fl;}
    /* Read in English, a question is answered only by a written answer or a rule: a
       textbook passage found for the English words is not offered for the Arabic. */
    if(dz.lang&&mr&&(mr.id==="know"||mr.id==="unknown"||mr.id==="smart")){S.chat=(S.chat||[]).filter(function(x){return x!==mr;});dz=null;}
    else{if(mr&&!mr.tap){mr.qq=dz.redo;mr.q=String(q).trim().slice(0,300);}return mr;}}
  var msg=withLang(L,function(){
    var text=id?t(ASK[id]||""):String(q).trim().slice(0,300),iid=it.id,byR=false,ptext=text;
    /* The workout's own suggestion: a machine taken is a request, not a question. */
    if(id==="busy"){var cb=null;try{cb=planCommand({cmd:"ex.busy"});}catch(e){cb=null;}
      if(cb)return {q:text,id:"app",at:Date.now(),b:[],acts:cb.acts||[],ag:cb,lang:L};}
    if(!id){
      /* The hard limits first, whatever else the question seems to be. */
      var sit=null,cm=null;
      var rcp=null;
      if(scopeOf(text))iid="scope";
      else if(dz&&dz.cmd){var cr=null;try{cr=planCommand(dz.cmd);}catch(e){cr=null;}
        if(cr)return {q:text,id:"app",at:Date.now(),b:[],acts:cr.acts||[],ag:cr,lang:L};}
      else if(dz&&dz.say)return {q:text,id:"app",at:Date.now(),b:[],acts:dz.say.acts||[],ag:dz.say,lang:L};
      else if(dz&&dz.id){iid=dz.id;byR=true;if(dz.text)ptext=dz.text;if(dz.force)it.force=dz.force;if(dz.p)it.p=dz.p;if(dz.faq)it.faq=dz.faq;if(dz.rate)it.rate=dz.rate;}
      /* A day told in one message: what was eaten and trained, "what else", "put it in
         my day" (js/coach/recap.js). */
      else if(S.onboarded&&FOODDB&&(rcp=dayTold(text)))return recapMsg(text,rcp,L);
      /* Something to do in the app: it is done, or asked for, the way its button does. */
      else if(S.onboarded&&(cm=commandOf(text,S.prefs.unit))&&!(LOGCMD.test(cm.cmd)&&isQuestion(text))){
        var cg=null;try{cg=cm.cmd==="undo.last"?undoLast():planCommand(cm);}catch(e){cg=null;}
        if(cg)return {q:text,id:"app",at:Date.now(),b:[],acts:cg.acts||[],ag:cg,lang:L};}
      /* A report rather than a question or a request: one question back. */
      else if(!VERB.some(function(v){return v[0]!=="foodlog"&&v[1].test(fold(text));})&&(sit=situationOf(text))){iid="situation";it.sit=sit;}
      else if(factOf(text))iid="remember";
      else if(!byR){iid=route(iid,text,it);
        /* A general question the written answers know well: that answer, before a rule
           that only shares a word with it ("weights" in "cardio before or after weights"). */
        if(R&&R.kind==="knowledge"&&!R.topic&&ACTION_IDS.indexOf(iid)<0){var fk=null;try{fk=faqMatch(text);}catch(e){fk=null;}
          if(fk&&fk.score>=FAQ_STRONG){iid="faq";it.faq=fk.f;byR=true;}
          /* A question about how things are ("does muscle turn into fat", "the difference
             between…") is not answered with the person's own figures: the written answer
             for it if there is one, else an honest miss, better than an answer to
             something else. */
          else if(/^(does|do|is|are|will|can) (muscle|fat|lifting|cardio|weights|machines|it|stretching|protein|carbs|sugar)|difference between|turn into|turns into|become fat|الفرق بين|بيتحول|بتتحول|تتحول|يتحول|هيتحول|هتتحول/.test(R.norm)
            &&/^(weights|calories|weight|protein|strong|track|today|eat|steps|water)$/.test(iid)){if(fk){iid="faq";it.faq=fk.f;}else iid="unknown";byR=true;}}}
      /* Not phrased as anything known, but it names an exercise in the plan, or a
         food by its name: that is what it is about. A near miss is not a match. */
      /* A question the answer bank was written for (js/data/faq.js): it answers when
         nothing else knew the question, or when the rule the words touched is one the
         answer may stand in for (its beats): "are carbs bad" shares a word with the
         calorie target, but asks about carbs. Requests, logging and the limits never
         come here. */
      var picking=prev&&prev.ag&&prev.ag.s==="pick",fqx=fold(text);
      if(!byR&&iid!=="scope"&&iid!=="situation"&&iid!=="remember"&&ACTION_IDS.indexOf(iid)<0&&!picking
        &&!(ELSEWHERE.some(function(x){return x[1].test(fqx);})&&/(^| )(my|mine|whats my|بتاعي|بتاعتي|عندي|طولي|عمري|سني)( |$)/.test(fqx))){
        var fm=null;try{fm=faqMatch(text);}catch(e){fm=null;}
        /* A follow-up to an answer from the bank ("why?", "but how many hours?") is read
           with the question before it. */
        var fprev=prev&&prev.id==="faq"&&prev.faq?faqById(prev.faq):null;
        if(fprev&&fqx.split(" ").length<=6){
          if(DEEPER.test(fqx)&&!fm)fm={f:fprev,score:1};
          else if(ONTO.test(fqx)){var fm2=null;try{fm2=faqMatch(String(prev.q||"")+" "+text);}catch(e){fm2=null;}if(fm2&&fm2.f.id===fprev.id)fm=fm2;}}
        var many=fold(text).split(" ").length>2;
        if(fm&&(iid==="unknown"||(iid==="thanks"||iid==="hello")&&many
          ||fm.f.beats.indexOf(iid)>=0&&fm.score>=FAQ_OVER&&!ownQuestion(text,iid)
          /* A very close answer against a rule the words barely touched ("are sweets
             ruining my diet" brushing "running" in the steps rule). */
          ||fm.score>=FAQ_STRONG&&(it.score||0)<=8&&!ownQuestion(text,iid)&&!/^(today|tomorrow|goal)$/.test(iid))){iid="faq";it.faq=fm.f;}}
      /* In a workout, the workout first: anything not plainly about something else is
         answered for the exercise on screen (aLive). A question the bank answers, or one
         the knowledge base does, goes there only when it does not speak of the session. */
      if(byR){}
      else if(S.active&&!picking&&!OFFSESS.test(fqx)&&(/^(unknown|today|track|week|tomorrow|goal|plan)$/.test(iid)
        ||/^(faq|know|krest|kreps|ksets|weights)$/.test(iid)&&SESSW.test(fqx)&&!namedOther(text)))iid="live";
      /* "How do I add another profile", "how do I delete a workout": the words of a
         request, about something that is not an exercise or a food. A question the bank
         answers well goes there instead of a request with nothing to act on. */
      else if(/^(exadd|exremove|exswap|foodlog)$/.test(iid)&&!verb0(text)){
        var fa=null;try{fa=faqMatch(text);}catch(e){fa=null;}
        if(fa&&fa.score>=FAQ_OVER&&fa.f.group==="app"&&!(iid==="foodlog"?namesFood(text):namesExercise(text))){iid="faq";it.faq=fa.f;}}
      if(iid==="unknown"&&!byR){
        if(namedExercises(text).length)iid="weights";
        else if(FOODDB&&!YES.test(fold(text))&&!NO.test(fold(text))&&namedFood(text,true))iid="foodinfo";}}
    /* A follow-up: the answer to the last pick ("Is it pull ups?", "the second one"),
       or the same request again for something else ("and squats"). */
    if(!id&&!byR&&prev&&iid!=="scope"&&iid!=="situation"&&iid!=="remember"){
      if(prev.ag&&prev.ag.s==="pick"&&(iid==="unknown"||iid===prev.id||MORE.test(fold(text)))){
        var nx=null;try{nx=answerPick(prev.ag,text);}catch(e){nx=null;}
        if(nx)return {q:text,id:prev.id,at:Date.now(),b:[],acts:nx.acts||[],ag:nx,lang:L};}
      if(/^(exadd|exremove|exswap|foodlog)$/.test(prev.id)&&(iid==="unknown"||MORE.test(fold(text)))
        &&(prev.id==="foodlog"?namesFood(text):namesExercise(text.replace(MORE,""))))iid=prev.id;}
    /* "What exercises for chest?", "best exercise for glutes at home", "تمارين صدر": the
       library, chosen for this person (js/ui/agent.js suggestExercises). */
    if(!id&&!byR&&S.onboarded&&iid!=="scope"&&iid!=="situation"&&!/^(exadd|exremove|exswap)$/.test(iid)&&EXQ.test(fold(text))){
      var mw=MUSCLEWORD.filter(function(x){return x[1].test(fold(text));})[0];
      if(mw){var sg=null;try{sg=suggestExercises(mw[0]);}catch(e){sg=null;}
        if(sg)return {q:text,id:"exsuggest",at:Date.now(),b:[],acts:sg.acts||[],ag:sg,lang:L};}}
    if(!id&&!byR&&iid!=="scope"&&iid!=="situation"&&iid!=="remember"){
      var kn=null;try{kn=knowFor(text,iid,it,prev);}catch(e){kn=null;}
      /* A question met only loosely, by a textbook passage (no rule knew it, or the rule
         it touched is not what it asks): with the smart coach on, it answers instead, from
         the same passages and the person's own figures (js/engine/smart.js). Owner, 28 Oct:
         "How to create two sessions then?" got a passage about session 1 of a phase. */
      if(kn&&!kn.deeper&&!id&&S.onboarded&&isReady()){kn=null;iid="unknown";}
      /* A passage is never the answer (C-4): it only points the nearest offers. */
      if(kn){iid="unknown";it.near=kn.k;}}
    if(ACTION_IDS.indexOf(iid)>=0&&iid!=="reassess"&&S.onboarded){
      /* Food said with Arabic digits or the dual ("بيضتين"): the amounts as numbers. */
      if(iid==="foodlog"&&!byR&&R&&R.lang==="ar"&&R.norm)ptext=R.norm;
      var ag=null;try{ag=planAction(iid,ptext,it);}catch(e){ag=null;}
      if(ag)return {q:text,id:iid,at:Date.now(),b:[],acts:ag.acts||[],ag:ag,lang:L};
      iid="unknown";}
    /* Nothing the rules know: the smart coach, when it is on and loaded, writes the
       answer (js/ui/smartcoach.js run), into this row as it comes. */
    if(iid==="unknown"&&!id&&S.onboarded&&isReady())return {q:text,id:"smart",at:Date.now(),b:[{p:""}],acts:[],lang:L,pending:true};
    var a=A(),fn=ANSWER[iid]||aUnknown;
    if(!S.onboarded&&/^(today|tomorrow|weights|eat|rest|swap|weight|protein|calories|missed|balance|goal|exadd|exremove|exswap|foodlog|weighlog|kreps|ksets|krest|kfreq|kvolume|kdur)$/.test(iid)){
      p(a,t("First, the assessment: a few questions, and the coach builds your targets, training and meals. Then I can answer from your own plan."));
      act(a,t("Start the assessment"),{"data-setup":"1"});}
    else{try{fn(a,text,it);}catch(e){a=aUnknown(A());}
      /* The last check (js/coach/guard.js): an answer that breaks the contract is not
         sent; the coach says it is not sure, with the nearest things it can do. */
      if(!id&&!a.ag&&iid!=="unknown"){var gd=checked(a,iid,R);
        if(!gd.ok){a=aUnknown(A(),text,it);iid="unknown";it.guard=gd.why;}}}
    /* A shaky reading (intent.js unsure): the answer, and under it the other things the
       words could have meant, one tap each (owner, 27 Oct). */
    var alt=!id&&it.unsure&&iid===it.id?(it.ranked||[]).filter(function(x){return x!==iid&&ACTION_IDS.indexOf(x)<0&&ASK[x];}).slice(0,2):[];
    return {q:text,id:iid,at:Date.now(),b:a.b,acts:a.acts,src:a.src&&a.src.length?a.src:undefined,ag:a.ag,lang:L,kq:iid==="know"?it.kq:undefined,
      faq:iid==="faq"?it.faq.id:undefined,
      alt:alt.length?alt:undefined};});
  S.chat=(S.chat||[]).concat([msg]).slice(-KEEP);
  return msg;}
/* A choice tapped on a pick: said as the person's own line, then the request goes on
   with it filled in. None of these: where the thing can be found instead. */
function follow(at,i){
  var m=(S.chat||[]).filter(function(x){return x&&x.at===+at;})[0];if(!m||!m.ag)return null;
  var L=m.lang==="ar"||m.lang==="en"?m.lang:uiLang(),ag=m.ag;
  if(i==null)return withLang(L,function(){
    /* Under the closest exercises to add: then it is one of their own, made here. */
    if(ag.act==="exercise.add"&&ag.p&&ag.p.q){
      var own={q:t("None of these"),id:m.id,at:Date.now(),b:[],acts:[],lang:L,ag:createAsk(ag.p.q,{day:ag.p.day||""})};
      S.chat=(S.chat||[]).concat([own]).slice(-KEEP);return own;}
    /* One of several foods: that one is named as not in the list, and the rest go on. */
    if(ag.act==="food.logMany"){var nm=null;try{nm=proceed(ag,"");}catch(e){nm=null;}
      if(nm){var om={q:t("None of these"),id:m.id,at:Date.now(),b:[],acts:nm.acts||[],ag:nm,lang:L};S.chat=(S.chat||[]).concat([om]).slice(-KEEP);return om;}}
    var none={q:t("None of these"),id:m.id,at:Date.now(),b:[],acts:[],lang:L,ag:ag.what==="food"
      ?{s:"say",lead:t("Then it isn't in the food list. Food can add it as one of your own foods."),acts:[{l:t("Open Food"),a:{"data-tab":"food"}}]}
      :{s:"say",lead:t("Then it isn't in the library. The picker on any day lists every exercise, and can add one of your own."),acts:[{l:t("Open Training"),a:{"data-tab":"train"}}]}};
    S.chat=(S.chat||[]).concat([none]).slice(-KEEP);return none;});
  var o=(ag.opts||[])[+i];if(!o)return null;
  if(ag.act==="food.info")return ask(o.l,null,L);
  return withLang(L,function(){
    var nx=null;try{nx=proceed(ag,o.v);}catch(e){nx=null;}
    if(!nx)nx={s:"say",lead:t("That didn't go through. Nothing was changed."),acts:[]};
    var msg={q:o.l,id:m.id,at:Date.now(),b:[],acts:nx.acts||[],ag:nx,lang:L};
    S.chat=(S.chat||[]).concat([msg]).slice(-KEEP);return msg;});}
function findMsg(at){return (S.chat||[]).filter(function(x){return x&&x.at===+at;})[0]||null;}

export {ACTALT, ACTL, ANSWER, AREAS, ASKOK, ASKQ, CORR, CRAVE, DAY, DEEPER, DEFINE, DOWORK, ELSE, ELSEWHERE, EXQ, FAQ_OVER, FAQ_STRONG, FOLLOW, FOODFILL, FOODNO, FOODSAID, FORCEL, FULL, GENERIC, GREET, GROUPOF, HOWDO, JOIN, KEEP, KEEP_MS, KINDL, KITOF, LIGHTER, LOGCMD, MINE, MISSIDS, MORE, MUSCLEOF, MUSCLEWORD, NO, OFFSESS, ONTO, OWNLOG, PAIN, PREP, PRON, PRONVERB, QSTART, QWORDS, QWORDS_AR, READAS, REDO, SAME, SCOPE, SESSW, SMART_MS, SOFT, VERB, WARM, WHEN, WHENRE, WHYKIND, YES, areaOf, arw, ask, askIn, askOne, askedOnly, cap, checked, dayTold, dayWith, decide, findFood, findMsg, follow, foodWords, fullName, inProgramNamed, inbodyReading, isQuestion, isSafety, knowFor, lastExchange, lastExercise, lifts, liveChips, namedExercises, namedFood, namedOther, nearAsk, ownQuestion, plainRequest, preRoute, pruneChat, readAs, readCtx, readOf, recapMsg, rewrite, route, safetyReply, scopeAnswer, scopeOf, shownFood, shownLabel, splitTwo, told, trainAround, undoLast, verb0, warmCoach, withReferent, withTold};

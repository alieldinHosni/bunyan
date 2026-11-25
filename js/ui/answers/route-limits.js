/* Bunyan — the coach's routing: the hard limits, where to go outside them, and why (js/ui/answers/route.js gathers them;
   road map step 4, 25 Nov: split by topic as it was, no answer's words or figures changed). */
import {t} from "../../i18n/dict.js";
import {A, act, fill, l, n, p, src, uiLang, withLang} from "./kit.js";
import {exName} from "../../i18n/exnames.js";
import {fold} from "../../coach/intent.js";
import {listFacts} from "../../coach/context.js";
import * as KB from "../../engine/kb.js";
import {S, split} from "../../state.js";
import {today} from "../../util.js";
import {standIn} from "../../engine/plan.js";
import {words} from "../coachwords.js";
import {areaOf, lifts, trainAround} from "./route-core.js";

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
export {ELSEWHERE, FOODSAID, GROUPOF, KITOF, READAS, SCOPE, WHYKIND, arw, readAs, scopeAnswer, scopeOf, told};

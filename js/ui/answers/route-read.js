/* Bunyan — the coach's routing: reading the sentence (js/ui/answers/route.js gathers them;
   road map step 4, 25 Nov: split by topic as it was, no answer's words or figures changed). */
import {t, tm} from "../../i18n/dict.js";
import {A, fill, l, list, n, p, uiLang} from "./kit.js";
import {exName} from "../../i18n/exnames.js";
import {isActivity} from "../../data/activities.js";
import {ACTION_IDS, fold} from "../../coach/intent.js";
import {addDays as addDaysW} from "../../engine/schedule.js";
import {LIB, muscleOf} from "../../data/exercises.js";
import {matchExercise} from "../../engine/splitparse.js";
import {changeOf, gloss, retell, understand} from "../../coach/understand.js";
import {faqById} from "../../engine/faq.js";
import {lookup, ownTerms} from "../../engine/kbsearch.js";
import {daysIn, namesExercise, namesFood} from "../agent.js";
import {commandOf} from "../../coach/commands.js";
import {FOODDB} from "../../engine/nutrition.js";
import {S, split} from "../../state.js";
import {num, today} from "../../util.js";
import {planOn} from "../../engine/dayplan.js";
import {words} from "../coachwords.js";
import {aAvoid, aAway, aBalance, aCalories, aClarify, aCorrection, aCrave, aDay, aDays, aEat, aElse, aFacts, aFaq, aFit, aFoodDay, aFoodInfo, aGoal, aHealth, aHello, aHelp, aInBody, aK1RM, aKDur, aKFreq, aKReps, aKRest, aKSets, aKTempo, aKVolume, aKWarm, aLast, aLetGo, aLighter, aLive, aLoadLog, aLogFood, aLowDay, aMissed, aMonth, aOut, aPhase, aPlan, aPlateau, aProtein, aReassess, aRecord, aRemember, aRest, aScope, aSituation, aSore, aSteps, aStrong, aSwap, aTechnique, aThanks, aTired, aToday, aTomorrow, aTrack, aTwice, aVolume, aWarmPlan, aWater, aWeek, aWeekFood, aWeekTrain, aWeight, aWeights, aWhy, aZones} from "./answers.js";
import {chatShown} from "../views/chat.js";
import {PAIN, lifts, namedExercises, namedFood, ownQuestion} from "./route-core.js";
import {ELSEWHERE, GROUPOF, KITOF, WHYKIND, told} from "./route-limits.js";
import {ask, follow} from "./route-ask.js";

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
export {ANSWER, ASKOK, ASKQ, CRAVE, DAY, DEEPER, DEFINE, DOWORK, ELSE, EXQ, FOLLOW, FOODFILL, FOODNO, FULL, GREET, HOWDO, KEEP_MS, LIGHTER, LOGCMD, MORE, NO, OFFSESS, ONTO, QSTART, SESSW, SMART_MS, SOFT, VERB, YES, askedOnly, dayWith, decide, fullName, inProgramNamed, isQuestion, knowFor, lastExchange, namedOther, plainRequest, preRoute, pruneChat, readCtx, readOf, route, verb0, withTold};

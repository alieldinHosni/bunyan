/* Bunyan — Coach AI: ask the coach
   A guided chat, not a chatbot. Nothing is sent anywhere and no model writes the
   answers: js/coach/intent.js matches the question, typed in English or Arabic or
   tapped from a suggestion, to one of a fixed set of things the coach knows how to
   answer, and the answer is worked out here from the person's own log, plan and
   targets, with the same engines the rest of the app uses. So it can only say what
   the app knows, and it says so when a question is outside that.

   Each answer is kept (the last 30), so the conversation is still there next time. The
   newest answer carries its buttons; older ones are text, because what a button would
   act on may have changed since.

   An answer is in the language the question was asked in, whatever the app is set to:
   Arabic letters (or Egyptian Arabic typed in Latin letters) get Arabic, English gets
   English. A tapped suggestion follows the conversation. */
import {t} from "../../i18n/dict.js";
import {exName, planName} from "../../i18n/exnames.js";
import {goalOf} from "../../data/goals.js";
import {isActivity} from "../../data/activities.js";
import {fold, intentOf, skel, spell} from "../../coach/intent.js";
import {checkPlans} from "../../engine/plancheck.js";
import {coachNow, standingNow} from "../../engine/coachinfo.js";
import {learnedDiffers, learnedNow, maintenanceInUse} from "../../engine/energy.js";
import {bmr, bwShare, deloadDue, e1RM, eatenToday, inDeload, lastWeight, loadText, macroTargets, prFor, recommend, sessionVolume, targetKcal, tdee, tdeeFormula} from "../../engine/formulas.js";
import {mealName, mealSlots} from "../../engine/meals.js";
import {FOODDB, fuzzyFoods, isDrink, nutritionFor, searchFoods, sumNutrition} from "../../engine/nutrition.js";
import {nutrition, topLifts, weeklyCardio, weighIns, weightChange, weightTrend} from "../../engine/stats.js";
import {S, split} from "../../state.js";
import {fmtW, toDisp, wUnit} from "../../units.js";
import {esc, fmtN, num, pretty, r1, setLang, today} from "../../util.js";
import {backArrow} from "../nav.js";
import {doseText} from "../dose.js";
import {blockDay, blockNow} from "../../engine/blocks.js";
import {addDaysISO, estMinutes, nextDayOf, planOn} from "../../engine/dayplan.js";
import {avoids, standIn} from "../../engine/plan.js";
import {OPL_NAME, simpleFacts, trendSays} from "../facts.js";
import {words} from "../coachwords.js";
import {glyph} from "../glyphs.js";

var KEEP=30;
/* The suggestions: what each asks, as the person would ask it. */
var ASK={
  today:"What do I train today?",weights:"How much should I lift?",eat:"What should I eat now?",
  track:"How am I doing?",weight:"Is my weight on track?",protein:"How much protein do I need?",
  calories:"Why are my calories set like this?",sore:"I'm sore or tired",missed:"I'm short on time today",
  balance:"Is my program balanced?",strong:"How strong am I?",goal:"Should I change my goal?",
  plan:"Build me a new plan",water:"How much water should I drink?",steps:"How are my steps and cardio?",
  help:"What can you answer?",tomorrow:"What do I train tomorrow?",last:"How did my last workout go?",
  rest:"What's left to eat today?",swap:"Other foods with the same macros"};
/* What to offer next, after each kind of answer. */
var NEXT={
  today:["weights","tomorrow","missed"],weights:["today","strong","balance"],eat:["rest","swap","protein"],
  track:["weight","strong","balance"],weight:["calories","eat","goal"],protein:["eat","calories","track"],
  calories:["protein","weight","goal"],sore:["today","missed","balance"],missed:["today","weights","track"],
  balance:["today","strong","plan"],strong:["weights","track","balance"],goal:["calories","plan","weight"],
  plan:["today","eat","goal"],water:["eat","steps","track"],steps:["weight","water","track"],
  help:["today","eat","track"],hello:["today","eat","track"],thanks:["today","eat","track"],unknown:["today","eat","track"],
  tomorrow:["today","weights","last"],last:["strong","weights","tomorrow"],rest:["swap","protein","eat"],
  swap:["rest","protein","eat"],foodinfo:["swap","rest","protein"]};

function fill(s,o){Object.keys(o).forEach(function(k){s=s.split("{"+k+"}").join(o[k]);});return s;}
function list(a){return a.join(S.prefs.lang==="ar"?"، ":", ");}
/* A meal's foods. The database names carry their own commas ("Lentils, Cooked"), so a
   comma between them would run two foods into one. */
function foods(a){return a.join(" + ");}
/* An answer: paragraphs (p), a list (l), a small note (n), and its buttons. */
function A(){return {b:[],acts:[]};}
function p(a,s){a.b.push({p:s});return a;}
function l(a,items){if(items.length)a.b.push({l:items});return a;}
function n(a,s){a.b.push({n:s});return a;}
function act(a,label,attrs){a.acts.push({l:label,a:attrs});return a;}
function noTags(s){return String(s||"").replace(/<[^>]+>/g,"");}
/* Run fn as if the app were in language l: t(), exercise and plan names and dates all
   follow S.prefs.lang, so an Arabic question gets an Arabic answer in the English app.
   Nothing is saved meanwhile, and the language is always put back. */
function uiLang(){return S.prefs&&S.prefs.lang==="ar"?"ar":"en";}
function withLang(l,fn){
  var was=uiLang();if(!l||l===was)return fn();
  S.prefs.lang=l;setLang(l);
  try{return fn();}finally{S.prefs.lang=was;setLang(was);}}

/* What the log measured, while the plan check still offers it (not kept as it is). */
function liveLearned(){return checkPlans().some(function(f){return f.id==="maint-learned";})?learnedDiffers():null;}

/* ---- the answers ---------------------------------------------------------------- */
function aToday(a,q){
  var sp=split(),now=today();
  if(S.active){
    p(a,fill(t("You have a workout in progress: {d}. Pick it up where you left off."),{d:planName(S.active.dayName||"")}));
    return act(a,t("Resume workout"),{"data-tab":"train"});}
  var pl=planOn(sp,now);
  if(pl.kind==="done"){
    var sv=pl.session,nx=nextDayOf(sp);
    p(a,fill(t("Done for today: {d}, {n} exercises."),{d:planName(pl.name||""),n:sv.entries.filter(function(e){return (e.sets||[]).length;}).length}));
    p(a,t("Now it's recovery: eat your protein and sleep well.")+(nx?" "+fill(t("Next up: {d}."),{d:planName(nx.name)}):""));
    return act(a,t("View session"),{"data-openday":now});}
  if(pl.kind==="none"){
    p(a,t("Nothing is planned: your program has no training days on its schedule yet."));
    return act(a,t("Plan my training"),{"data-csec":"train","data-ctsub":"program"});}
  if(pl.rest){
    p(a,t("Today is a rest day.")+(pl.next?" "+fill(t("Next up: {d}."),{d:planName(pl.next.name)}):""));
    p(a,t("Rest is when the training turns into progress. A walk or some light mobility helps; nothing hard."));
    if(pl.next&&pl.next.ex.length)act(a,t("Train anyway")+" · "+planName(pl.next.name),{"data-startday":pl.next.id});
    return a;}
  var d=pl.day,ex=d.ex.filter(function(e){return !isActivity(e.name);});
  p(a,fill(t("Today is {d}: {n} exercises, about {m} min."),{d:planName(d.name),n:d.ex.length,m:estMinutes(d)}));
  /* As the workout will start: this week of the block's effort, and sets moved by the
     answers after earlier workouts. */
  var bl=blockNow(),dx=blockDay(d.ex);
  l(a,dx.slice(0,6).map(function(e){return exName(e.name)+(isActivity(e.name)?"":" · "+doseText(e));})
    .concat(d.ex.length>6?[fill(t("and {n} more"),{n:d.ex.length-6})]:[]));
  if(inDeload())n(a,t("This is a lighter week: fewer sets and lighter weights. That is the plan, not a step back."));
  else{
    if(bl&&ex.length)n(a,fill(t("Block {b} · Week {w} of {n}"),{b:bl.block,w:bl.week,n:bl.of})+". "
      +t(bl.rir===1?"Stop each set with 1 rep in reserve.":"Stop each set with {n} reps in reserve.").replace("{n}",bl.rir));
    if(ex.length)n(a,t("Each exercise shows a suggested weight when you get to it, from what you lifted last time."));}
  act(a,t("Start workout"),{"data-startday":d.id});
  return act(a,t("Change the day"),{"data-tab":"train"});}

/* The exercises the question names, or today's (or the next) workout's main ones. */
/* Words that name how, not what: a match on them alone is not a match. */
var GENERIC=/^(barbell|dumbbell|dumbbells|machine|cable|medium|grip|press|with|standing|seated|bar|بالبار|بالدمبل|بالدمبلز|بالجهاز|بالكابل|بريس|واقف|قاعد|قبضه)$/;
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
function aWeights(a,q){
  var sp=split(),named=namedExercises(q),src=named;
  if(!src.length){
    var pl=planOn(sp,today()),d=pl.day&&!pl.rest&&pl.kind!=="done"?pl.day:nextDayOf(sp);
    src=d?d.ex.filter(function(e){return !isActivity(e.name);}).slice(0,4):[];
    if(d&&src.length)p(a,fill(t("For {d}, from what you lifted last time:"),{d:planName(d.name)}));}
  if(!src.length){p(a,t("There is nothing to suggest yet: your program has no exercises."));
    return act(a,t("Plan my training"),{"data-csec":"train","data-ctsub":"program"});}
  var first=0;
  l(a,src.map(function(e){
    var r=recommend({name:e.name,planned:{lo:e.lo,hi:e.hi,sets:e.sets,amrap:e.amrap,timed:e.timed}});
    var reps=(e.lo===e.hi?String(e.lo):e.lo+"–"+e.hi)+(e.timed?" "+t("s"):"");
    if(!r){first++;return exName(e.name)+": "+t("first time. Pick a weight you could lift two or three more times, and log it.");}
    if(r.amrap)return exName(e.name)+": "+fill(t("as many as you can, at {w}"),{w:fmtW(r.w)});
    if(r.bw)return exName(e.name)+": "+t("BW")+" × "+reps+(r.note?". "+t(r.note):"");
    if(!r.w)return exName(e.name)+": "+t(r.note||"");
    return exName(e.name)+": "+fmtW(r.w)+" × "+reps+(r.note?". "+t(r.note):"");}));
  p(a,t("The rule: when every set reaches the top of the rep range, the weight goes up by the smallest step next time. Short of the range twice, hold it; three times, a lighter week."));
  if(first)n(a,t("A first session sets the starting point. The suggestions start from the next one."));
  return a;}

function aEat(a){
  var g=S.goals||{},e=eatenToday(today()),now=today(),r=S.days[now]||{meals:{}};
  var kl=Math.round(num(g.kcal)-e.kcal),pl=Math.round(num(g.p)-e.p);
  if(!e.kcal)p(a,fill(t("Nothing logged yet today. Your day is {k} kcal and {p} g of protein."),{k:fmtN(g.kcal),p:g.p}));
  else if(kl>=0)p(a,fill(t("So far {e} of {k} kcal and {pe} of {p} g protein. Left: {kl} kcal and {pl} g protein."),
    {e:fmtN(e.kcal),k:fmtN(g.kcal),pe:Math.round(e.p),p:g.p,kl:fmtN(kl),pl:Math.max(0,pl)}));
  else p(a,fill(t("You're {n} kcal over today. Nothing to make up: tomorrow is a normal day, and a week matters more than one day."),{n:fmtN(-kl)}));
  /* The next meal of the plan not yet logged. */
  var open=mealSlots().filter(function(s){return (s.plan||[]).length&&!((r.meals[s.id]||{}).items||[]).length;});
  if(open.length){
    var m=open[0],tot=sumNutrition(m.plan);
    p(a,fill(t("Next on your plan, {m}: {f}. {k} kcal, {p} g protein."),{m:mealName(m.id),
      f:foods(m.plan.slice(0,4).map(itemName)),k:fmtN(tot.kcal),p:Math.round(tot.p)}));
    act(a,open.length>1?t("Log today's plan"):fill(t("Log {m}"),{m:mealName(m.id)}),{"data-logday":"1"});
    act(a,t("Open Food"),{"data-tab":"food"});}
  else if(kl>0&&e.kcal){
    if(pl>25&&kl<pl*8)p(a,t("Protein is the gap, with few calories left: chicken, tuna, eggs, Greek yogurt or cottage cheese close it best."));
    else if(pl>25)p(a,t("A meal built around protein closes both gaps: a palm of chicken, fish, meat or eggs, with rice, bread or potatoes, and vegetables."));
    else p(a,t("Protein is covered. Fill the rest however suits you, with some vegetables or fruit in it."));
    act(a,t("Open Food"),{"data-tab":"food"});}
  else act(a,t("Open Food"),{"data-tab":"food"});
  if(!mealSlots().some(function(s){return (s.plan||[]).length;}))
    act(a,t("New meal plan from my targets"),{"data-pgen":"1"});
  return a;}

function aTrack(a){
  var f=simpleFacts();
  p(a,t("Where you are, in plain words:"));
  l(a,f.map(function(x){return x.k+": "+noTags(x.head)+". "+x.line;}));
  var c=checkPlans().length+coachNow().length;
  if(c)n(a,fill(t(c===1?"There is 1 thing in Coach AI worth a look.":"There are {n} things in Coach AI worth a look."),{n:c}));
  return act(a,t("Open Progress"),{"data-tab":"progress"});}

function aWeight(a){
  var list0=weighIns(),tr=weightTrend(),wc=weightChange(),g=S.profile.goal,G=goalOf(g);
  if(!list0.length){
    p(a,t("No weigh-ins yet. Weigh in a few mornings a week, before eating, and in two weeks I can read your trend."));
    return act(a,t("Log weight"),{"data-sheet":"weigh"});}
  if(!tr){
    p(a,fill(t(list0.length===1?"1 weigh-in so far, {w}.":"{n} weigh-ins so far, the latest {w}."),{n:list0.length,w:fmtW(wc.cur.weight)})
      +" "+t("Water moves the scale more from day to day than fat does. With four weigh-ins over two weeks I can read the trend."));
    return act(a,t("Log weight"),{"data-sheet":"weigh"});}
  var sgn=function(kg){return (kg>0.004?"+":kg<-0.004?"−":"±")+toDisp(Math.abs(kg))+" "+wUnit();};
  p(a,fill(t("Over the last {n} weeks: {r} a week. For {g}, the plan is {lo} to {hi}."),
    {n:tr.weeks,r:sgn(tr.perWk),g:t(G.label),lo:sgn(tr.kind==="lose"?tr.hi:tr.lo),hi:sgn(tr.kind==="lose"?tr.lo:tr.hi)}));
  p(a,t(trendSays(tr)));
  if(tr.status==="ok")return a;
  /* Before changing a target: is the log the food? */
  var nu=nutrition(14),gk=num(S.goals.kcal);
  if(nu.count<7){
    p(a,fill(t("You logged food on {n} of the last 14 days, so I can't tell whether it's the target or the days off it. Log a full week first."),{n:nu.count}));
    return act(a,t("Open Food"),{"data-tab":"food"});}
  var off=nu.avg.kcal-gk;
  if(Math.abs(off)>Math.max(150,gk*0.08)){
    p(a,fill(t("On the days you logged, you averaged {a} kcal against a target of {k}. Getting closer to the target comes before changing it."),{a:fmtN(nu.avg.kcal),k:fmtN(gk)}));
    return act(a,t("Open Food"),{"data-tab":"food"});}
  /* Logged and on target: then the target is what to move. Measured from the log, if
     the log can say what the body uses; otherwise by a small step. */
  var ld=liveLearned();
  if(ld){
    p(a,fill(t("Your logging matches your target, so the target is what to move. Your own log says your body uses about {k} kcal a day, not the {f} your targets are built on; building them on that fixes it at the root."),
      {k:fmtN(ld.learned.kcal),f:fmtN(ld.use.kcal)}));
    return act(a,fill(t("Build my targets on {k} kcal"),{k:fmtN(ld.learned.kcal)}),{"data-pcfix":"maint-learned"});}
  var want=tr.kind==="lose"?(tr.status==="slow"||tr.status==="wrong"?-1:1):tr.kind==="gain"?(tr.status==="fast"?-1:1):(tr.status==="up"?-1:1);
  var step=tr.status==="wrong"?200:150;
  p(a,fill(t("Your logging matches your target, so the target is what to move: about {s} kcal a day {d}, then two more weeks before judging again."),
    {s:step,d:t(want<0?"less":"more")}));
  return act(a,fill(t(want<0?"Eat {s} kcal less a day":"Eat {s} kcal more a day"),{s:step}),{"data-chatkcal":String(want*step)});}

function aProtein(a){
  var g=S.goals||{},w=lastWeight()||num(S.profile.weight),G=goalOf(S.profile.goal),mt=macroTargets();
  var per=w?r1(num(g.p)/w):0,e=eatenToday(today());
  p(a,fill(t("Your target is {p} g a day: {k} g per kg of body weight. The research supports 1.6 to 2.2 g per kg for people who train."),{p:g.p,k:per}));
  p(a,fill(t("For {g} the app sets {x} g per kg."),{g:t(G.label),x:G.protein})
    +(Math.abs(num(g.p)-mt.p)>mt.p*0.1?" "+fill(t("Your target was changed from the suggested {s} g."),{s:mt.p}):""));
  var nm=Math.max(3,mealSlots().length);
  p(a,fill(t("Spread over {n} meals, that's about {q} g each: a palm or two of chicken, fish, meat, eggs, Greek yogurt or beans."),{n:nm,q:Math.round(num(g.p)/nm)}));
  var nu=nutrition(7),hit=nu.days.filter(function(x){return num(x.p)>=num(g.p)*0.9;}).length;
  if(nu.count)n(a,fill(t("This week: reached on {h} of the {n} days you logged. Today so far: {e} g."),{h:hit,n:nu.count,e:Math.round(e.p)}));
  return act(a,t("Targets"),{"data-csec":"food","data-cfsub":"targets"});}

function aCalories(a){
  var pr=S.profile,G=goalOf(pr.goal),g=S.goals||{},b=bmr(),td=tdee(),tk=Math.round(targetKcal()/10)*10;
  if(!num(pr.age)||!num(pr.height)){p(a,t("I need your age and height to work out your calories. The assessment asks for both."));
    return act(a,t("Start the assessment"),{"data-setup":"1"});}
  p(a,fill(t("At rest your body uses about {b} kcal a day, from your age, height, weight and sex (the Mifflin–St Jeor formula)."),{b:fmtN(b)}));
  var use=maintenanceInUse();
  if(use.source==="learned")p(a,fill(t("By formula, maintaining your weight would take about {f} kcal. Your targets are built on what your own log measured instead: {t} kcal."),{f:fmtN(tdeeFormula()),t:fmtN(td)}));
  else p(a,fill(t("With your activity, maintaining your weight takes about {t} kcal."),{t:fmtN(td)}));
  var pct=Math.round(Math.abs(G.kcal)*100);
  p(a,G.kcal?fill(t(G.kcal<0?"{g} takes {p}% below that, capped at {c} kcal: {k} kcal.":"{g} adds {p}% to that, capped at {c} kcal: {k} kcal."),
      {g:t(G.label),p:pct,c:G.cap||"—",k:fmtN(tk)})
    :fill(t("{g} eats at maintenance: {k} kcal."),{g:t(G.label),k:fmtN(tk)}));
  p(a,fill(t("Then protein {p} g, fat {f} g, and carbs take the rest: {c} g."),{p:g.p,f:g.f,c:g.c}));
  if(Math.abs(num(g.kcal)-tk)>=50)n(a,fill(t("Your target now is {k} kcal, set by hand or by a plan you used. Targets in Coach can put it back."),{k:fmtN(g.kcal)}));
  /* What the log measures: the honest check on any formula. */
  var L=learnedNow(),ld=liveLearned();
  if(ld){
    p(a,fill(t("Your own log says your body uses about {k} kcal a day ({lo}–{hi}), from {d} fully logged days and your weight's trend over four weeks."),
      {k:fmtN(ld.learned.kcal),lo:fmtN(ld.learned.low),hi:fmtN(ld.learned.high),d:ld.learned.foodDays}));
    act(a,fill(t("Build my targets on {k} kcal"),{k:fmtN(ld.learned.kcal)}),{"data-pcfix":"maint-learned"});}
  else if(L.kind==="ok")n(a,fill(t("Your own log agrees: about {k} kcal a day ({lo}–{hi})."),{k:fmtN(L.kcal),lo:fmtN(L.low),hi:fmtN(L.high)}));
  else if(L.why==="implausible")n(a,t("Some of your logged days look incomplete, so I can't measure your maintenance from them yet. Log whole days, including drinks and snacks."));
  else n(a,t("A formula is an estimate. Log your food on most days and weigh in a few mornings a week, and after two weeks I can measure what your body actually uses."));
  return act(a,t("Targets"),{"data-csec":"food","data-cfsub":"targets"});}

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
function aSore(a,q){
  var fq=fold(q),pain=/(pain|hurt|injur|sharp|swollen|الم|وجع|يوجع|بيوجع|بتوجع|واجع|مصاب|اصابه)/.test(fq),ar=areaOf(fq);
  if(pain){
    p(a,t("Pain that is sharp, or that changes how you move, is a reason to stop the exercise that causes it. Train around it with exercises that don't hurt."));
    if(ar)trainAround(a,ar);
    p(a,t("If it lasts more than a few days, swells, or wakes you at night, see a doctor or a physiotherapist. I can't tell what it is."));
    n(a,t("Tell the assessment about it under sore spots, and the plan it builds avoids loading it."));
    act(a,t("Swap exercises in my program"),{"data-csec":"train","data-ctsub":"program"});
    return act(a,t("Retake the assessment"),{"data-setup":"1"});}
  p(a,t("Soreness a day or two after training is normal. It doesn't mean the workout was good or bad, and the warm-up usually eases it."));
  var fat=coachNow().filter(function(c){return /^(fatigue|falling|stall)$/.test(c.kind);})[0];
  if(inDeload())p(a,fill(t("You're in a lighter week until {d}. Keep the sets easy and sleep well."),{d:S.deload.until}));
  else if(fat){var w=words(fat);
    p(a,t("Your log also shows it:")+" "+w[0]+". "+w[1]);
    act(a,w[2],{"data-cofix":fat.id});}
  else if(deloadDue())p(a,t("It has been a long run of hard weeks. A lighter week now would let your body catch up."));
  p(a,t("On a low day: do the workout with one set fewer on each exercise, or keep the sets and stop two or three reps short of failure. Sleep is the biggest lever: seven to nine hours."));
  return a;}

function aMissed(a,q){
  var sp=split(),nx=nextDayOf(sp),pl=planOn(sp,today()),d=pl.day&&!pl.rest&&pl.kind!=="done"?pl.day:null;
  var mins=intentOf(q).mins,fq=fold(q),missed=/(miss|skip|فوت|فاتني|مروحتش|ماروحتش)/.test(fq);
  if(missed||!d){
    if(sp.schedule==="week")p(a,t("Your program runs on fixed weekdays, so a missed day is skipped. If you can, move it: on Training, pick another day for it."));
    else p(a,(nx?fill(t("Nothing is lost. Your program is a rotation, so the next workout is simply the one you missed: {d}."),{d:planName(nx.name)})
      :t("Nothing is lost. Your program is a rotation, so the next workout is simply the one you missed."))+" "+t("Don't try to fit two into one day."));
    if(!d)return act(a,t("Change the day"),{"data-tab":"train"});}
  if(d){
    var full=estMinutes(d),have=mins||(missed?0:Math.round(full/2/5)*5);
    if(have&&have<full){
      var keep=[],used=0;
      d.ex.forEach(function(e){var m=isActivity(e.name)?(e.min||30):e.sets*((e.rest||75)+35)/60;
        if(used+m<=have||!keep.length){keep.push(e);used+=m;}});
      p(a,fill(t("Today's workout takes about {f} min. In {h}, do these, in order, and skip the rest:"),{f:full,h:have+" "+t("min")}));
      l(a,keep.map(function(e){return exName(e.name)+(isActivity(e.name)?"":" · "+doseText(e));}));
      n(a,t("The main lifts come first in your program, so a short session still does most of the work. Rest a little less between sets if you need to."));}
    else if(!missed)p(a,fill(t("Today's workout takes about {f} min."),{f:full}));
    act(a,t("Start workout"),{"data-startday":d.id});}
  return a;}

function aBalance(a){
  var vol=coachNow().filter(function(c){return c.kind==="over"||c.kind==="under"||c.kind==="weak";});
  var plan=checkPlans().filter(function(f){return f.area==="train"||f.area==="both";});
  if(!vol.length&&!plan.length){
    p(a,t("From your program and your log, nothing is out of balance: no muscle well over or under the sets a week most people grow on, and no lift far out of proportion."));
    n(a,t("10 to 20 hard sets a week per muscle works for most people. It's a starting point, not a rule."));
    return a;}
  plan.slice(0,2).forEach(function(f){p(a,f.title+". "+f.why);});
  vol.slice(0,2).forEach(function(c){var w=words(c);if(w)p(a,w[0]+". "+w[1]);});
  if(plan[0])act(a,plan[0].fix.label,{"data-pcfix":plan[0].id});
  else if(vol[0]){var w0=words(vol[0]);if(w0&&w0[3]!=="ok")act(a,w0[2],{"data-cofix":vol[0].id});}
  return act(a,t("Open my program"),{"data-csec":"train","data-ctsub":"program"});}

function aStrong(a){
  var top=topLifts().filter(function(L){return !isActivity(L.name);}).slice(0,5);
  if(!top.length){p(a,t("Log a few workouts and I can tell you your estimated maxes and how they are moving."));return a;}
  p(a,t("Your best sets, and the one-rep max they suggest:"));
  l(a,top.map(function(L){
    if(!L.w)return exName(L.name)+": "+L.reps+" "+t("reps");
    /* Body weight plus a belt: the added load is not the lift, so no max from it. */
    var bw=bwShare(L.name)>0,e=bw?0:e1RM(L.w,L.reps,L.rpe);
    return exName(L.name)+": "+loadText(L.name,L.w)+" × "+L.reps+(e&&L.reps>1?" · "+fill(t("about {e} for one"),{e:fmtW(e)}):"");}));
  var st=standingNow(),ok=(st.lifts||[]).filter(function(x){return x.kind==="ok";});
  if(ok.length){
    p(a,fill(t("Against raw powerlifting competitors in the {c} kg class:"),{c:ok[0].cls}));
    l(a,ok.map(function(x){var nm=t(OPL_NAME[x.lift]);
      return (x.edge==="below"?t("{lift}: ahead of fewer than 10 in 100"):x.edge==="above"?t("{lift}: ahead of more than 90 in 100")
        :t("{lift}: ahead of about {n} in 100")).replace("{lift}",nm).replace("{n}",x.pct);}));
    n(a,t("These are people who train for these three lifts and enter meets. Anywhere on this scale is strong; take it as a rough guide."));}
  return act(a,t("Open Progress"),{"data-tab":"progress"});}

var GOALWORD=[["lose",/(cut|cutting|lose fat|lean|shred|انشف|تنشيف|اخس|خساره)/],["gain",/(bulk|build muscle|mass|size|تضخيم|اضخم|تضخم|عضل)/],
  ["strength",/(stronger|strength|powerlift|اقوي|قوه)/],["recomp",/(recomp)/],["maintain",/(maintain|maintenance|ثبات|احافظ)/]];
function aGoal(a,q){
  var pr=S.profile,G=goalOf(pr.goal),fq=fold(q);
  p(a,fill(t("Your goal is {g}: {d}"),{g:t(G.label),d:t(G.desc)}));
  var want=GOALWORD.filter(function(x){return x[1].test(fq);})[0];
  if(want&&want[0]!==pr.goal){var W=goalOf(want[0]),m=macroTargetsFor(want[0]);
    p(a,fill(t("Switching to {g} would set your day to about {k} kcal and {p} g of protein. Your training stays as it is; the plan check tells you if it no longer suits."),
      {g:t(W.label),k:fmtN(m.kcal),p:m.p}));
    act(a,fill(t("Set my goal to {g}"),{g:t(W.label).toLowerCase()}),{"data-chatgoal":want[0]});}
  else if(want)p(a,t("That's already your goal."));
  p(a,t("To change the whole plan with it, retake the assessment: it rebuilds your targets, training and meals together, and nothing changes until you use it."));
  return act(a,t("Retake the assessment"),{"data-setup":"1"});}
/* The targets a goal would give, without keeping it. */
function macroTargetsFor(goal){var was=S.profile.goal;S.profile.goal=goal;try{return macroTargets();}finally{S.profile.goal=was;}}

function aPlan(a){
  p(a,t("The assessment builds your training and your meals together, from your goal, your week, your equipment and how you eat, and puts them on the Training and Food pages. Nothing changes until you use it."));
  p(a,t("Or plan by hand in Coach: Training for programs and exercises, Nutrition for meals and targets."));
  act(a,t("Retake the assessment"),{"data-setup":"1"});
  act(a,t("New meal plan from my targets"),{"data-pgen":"1"});
  return act(a,t("Plan my training"),{"data-csec":"train","data-ctsub":"programs"});}

function aWater(a){
  var g=S.goals||{},r=S.days[today()]||{},w=lastWeight()||num(S.profile.weight);
  p(a,fill(t("Your target is {g} ml a day, about 35 ml per kg of body weight. Today so far: {d} ml."),{g:fmtN(g.water||0),d:fmtN(r.water||0)}));
  p(a,t("Drink more on training days and in the heat. Pale yellow is the sign you're drinking enough."));
  return act(a,t("Open Food"),{"data-tab":"food"});}

function aSteps(a){
  var g=S.goals||{},r=S.days[today()]||{},c=weeklyCardio();
  p(a,fill(t("Steps today: {s} of {g}."),{s:fmtN(r.steps||0),g:fmtN(g.steps||0)}));
  p(a,fill(t("Cardio this week: {m} of the {t} minutes of moderate activity health guidelines suggest."),{m:c.min,t:c.target}));
  p(a,t("Walking is the easiest way to move more without cutting into recovery. A 10-minute walk after meals adds up."));
  return act(a,t("Log steps"),{"data-sheet":"steps"});}

function aHelp(a){
  p(a,t("I answer from your own log, plan and targets, worked out on this phone. Nothing you type leaves it."));
  p(a,t("Ask about today's workout, what to lift, what to eat, your weight, protein and calories, soreness, missing a day or having little time, your program's balance, your strength, your goal, or a new plan."));
  return a;}
function aHello(a){
  var nm=(S.profile.name||"").trim();
  return p(a,(nm&&nm!=="Me"?fill(t("Hi {n}."),{n:nm}):t("Hi."))+" "+t("Ask me about today's training, your food, or how things are going."));}
function aThanks(a){return p(a,t("Any time."));}
function aUnknown(a){
  p(a,t("I can't answer that one. I'm a guided coach: I answer from your log, plan and targets, not from the internet."));
  return p(a,t("Try one of these, or ask in your own words:"));}

/* ---- tomorrow, the last workout -------------------------------------------------- */
function aTomorrow(a){
  var sp=split(),pl=planOn(sp,addDaysISO(today(),1));
  if(pl.kind==="none"){p(a,t("Nothing is planned: your program has no training days on its schedule yet."));
    return act(a,t("Plan my training"),{"data-csec":"train","data-ctsub":"program"});}
  if(pl.rest||!pl.day){
    p(a,t("Tomorrow is a rest day.")+(pl.next?" "+fill(t("Next up after it: {d}."),{d:planName(pl.next.name)}):""));
    return act(a,t("Open Training"),{"data-tab":"train"});}
  var d=pl.day;
  p(a,fill(t("Tomorrow is {d}: {n} exercises, about {m} min."),{d:planName(d.name),n:d.ex.length,m:estMinutes(d)}));
  l(a,d.ex.slice(0,6).map(function(e){return exName(e.name)+(isActivity(e.name)?"":" · "+doseText(e));})
    .concat(d.ex.length>6?[fill(t("and {n} more"),{n:d.ex.length-6})]:[]));
  /* A rotation moves on with what is trained; fixed weekdays do not. */
  if(sp.schedule!=="week")n(a,t("Your program is a rotation: train today, and tomorrow moves on to the next day in it."));
  return act(a,t("Open Training"),{"data-tab":"train"});}

function aLast(a){
  var s=(S.sessions||[])[0];
  if(!s){p(a,t("No workouts logged yet. The first one sets the starting point."));
    return act(a,t("Open Training"),{"data-tab":"train"});}
  var ex=(s.entries||[]).filter(function(e){return (e.sets||[]).some(function(x){return !x.wu;});});
  var sets=0;ex.forEach(function(e){sets+=e.sets.filter(function(x){return !x.wu;}).length;});
  var mins=num(s.activeMs)?Math.round(num(s.activeMs)/60000):0,news=0;
  p(a,fill(t("Your last workout: {d}, {date}. {n} exercises, {s} sets."),{d:planName(s.dayName||t("Workout")),date:pretty(s.date),n:ex.length,s:sets})
    +(mins?" "+fill(t("{m} min of training."),{m:mins}):""));
  l(a,ex.slice(0,7).map(function(e){
    var work=e.sets.filter(function(x){return !x.wu;});
    if(isActivity(e.name))return exName(e.name)+": "+work.reduce(function(t2,x){return t2+num(x.min||x.mins);},0)+" "+t("min");
    var top=work.slice().sort(function(x,y){return num(y.w)-num(x.w)||num(y.r)-num(x.r);})[0];
    var pr=prFor(e.name),isNew=num(top.w)>0&&pr.date===s.date&&num(pr.w)===num(top.w);
    if(isNew)news++;
    return exName(e.name)+": "+(num(top.w)?loadText(e.name,top.w)+" × "+num(top.r):num(top.r)+" "+t("reps"))+(isNew?" · "+t("your best yet"):"");}));
  var vol=Math.round(sessionVolume(s));
  if(vol)n(a,fill(t("{v} lifted in all."),{v:fmtN(Math.round(toDisp(vol)))+" "+wUnit()})+(news?" "+fill(t(news===1?"1 lift was your best yet.":"{n} lifts were your best yet."),{n:news}):""));
  return act(a,t("View session"),{"data-openday":s.date});}

/* ---- foods: the rest of today, swaps, what is in one ------------------------------ */
/* A food's name in the answer's language: its Arabic alias in Arabic. */
function arName(f){var a=(f&&f.a||[]).filter(function(x){return /[\u0600-\u06FF]/.test(x);})[0];return a||"";}
function foodName(f){return uiLang()==="ar"&&arName(f)?arName(f):(f&&f.n)||"";}
function foodOf(it){
  var db=FOODDB||[];
  return (it.fid&&db.filter(function(f){return f.id===it.fid;})[0])||(it.n&&(searchFoods(it.n,1)[0]||{}).f)||null;}
function itemName(it){var f=foodOf(it);return f&&uiLang()==="ar"&&arName(f)?arName(f):(it.n||it.label||"");}
/* The next meal of the plan not yet logged today, or the one the question names. */
var MEALWORD=[["Breakfast",/breakfast|فطار|فطور/],["Lunch",/lunch|غدا|غداء/],["Dinner",/dinner|supper|tonight|عشا|عشاء/],["Snack",/snack|سناك/]];
function planMeal(q){
  var r=S.days[today()]||{meals:{}},fq=fold(q||""),slots=mealSlots().filter(function(x){return (x.plan||[]).length;});
  for(var i=0;i<MEALWORD.length;i++)if(MEALWORD[i][1].test(fq)){
    var named=slots.filter(function(x){return x.id===MEALWORD[i][0];})[0];if(named)return named;}
  return slots.filter(function(x){return !(((r.meals||{})[x.id]||{}).items||[]).length;})[0]||null;}

function aRest(a){
  var g=S.goals||{},e=eatenToday(today()),r=S.days[today()]||{meals:{}};
  var kl=Math.round(num(g.kcal)-e.kcal),pl=Math.round(num(g.p)-e.p);
  if(kl<=0){p(a,fill(t("You're {n} kcal over today. Nothing to make up: tomorrow is a normal day, and a week matters more than one day."),{n:fmtN(-kl)}));
    return act(a,t("Open Food"),{"data-tab":"food"});}
  p(a,fill(t("Left for today: {k} kcal and {p} g protein."),{k:fmtN(kl),p:Math.max(0,pl)}));
  var open=mealSlots().filter(function(x){return (x.plan||[]).length&&!(((r.meals||{})[x.id]||{}).items||[]).length;});
  if(!open.length){
    p(a,pl>25?t("A meal built around protein closes both gaps: a palm of chicken, fish, meat or eggs, with rice, bread or potatoes, and vegetables.")
      :t("Protein is covered. Fill the rest however suits you, with some vegetables or fruit in it."));
    act(a,t("Open Food"),{"data-tab":"food"});
    if(!mealSlots().some(function(x){return (x.plan||[]).length;}))act(a,t("New meal plan from my targets"),{"data-pgen":"1"});
    return a;}
  var tk=0,tp=0;
  p(a,t("Still on your plan today:"));
  l(a,open.map(function(m){var x=sumNutrition(m.plan);tk+=x.kcal;tp+=x.p;
    return mealName(m.id)+": "+foods(m.plan.slice(0,4).map(itemName))+" · "+fill(t("{n} kcal"),{n:fmtN(x.kcal)})+" · "+fill(t("{n} g protein"),{n:Math.round(x.p)});}));
  var dk=Math.round(kl-tk);
  p(a,Math.abs(dk)<=Math.max(100,kl*0.1)?t("Eat those and the day lands on your targets.")
    :dk>0?fill(t("Those leave about {n} kcal spare: a snack, or a little more at one meal."),{n:fmtN(dk)})
    :fill(t("Those come to about {n} kcal more than what is left: go lighter on rice, bread or oil at one meal."),{n:fmtN(-dk)}));
  if(tp<pl-15)n(a,fill(t("Protein falls about {n} g short: add Greek yogurt, eggs, tuna or chicken."),{n:Math.round(pl-tp)}));
  act(a,open.length>1?t("Log today's plan"):fill(t("Log {m}"),{m:mealName(open[0].id)}),{"data-logday":"1"});
  return act(a,t("Other foods with the same macros"),{"data-chatq":"swap","data-chatl":uiLang()});}

/* What a food is mostly: protein, carbs or fat by where its calories come from, or a
   mix. A swap keeps that, so rice is swapped for bread or potatoes, not for chicken. */
function role(f){
  var pk=4*num(f.p),ck=4*num(f.c),fk=9*num(f.f),tot=pk+ck+fk||1;
  return pk/tot>=0.38?"p":ck/tot>=0.6?"c":fk/tot>=0.6?"f":"m";}
var NOSWAP=/^(Beverages|Supplements|Condiments|Sweets)$/,INGREDIENT=/raw|powder|dry|dried|flour|starch|uncooked/i;
/* Foods that stand in for this one: the same kind, a portion with the same calories,
   protein, carbs and fat as close as can be, three of them, no two alike. */
/* The words that name a food, without how it is cooked or cut: a swap shares none, so
   rice is not swapped for basmati rice, nor chicken breast for chicken breast cooked. */
var HOW=/^(cooked|raw|boiled|grilled|fried|baked|roasted|steamed|plain|white|brown|whole|fresh|canned|dried|lean|low|fat|full|skimmed|skim|medium|large|small|with|and|without|egyptian|homemade)$/;
function keyWords(n){return fold(n).replace(/[^a-z ]/g," ").split(" ").filter(function(w){return w.length>=4&&!HOW.test(w);});}
function swapsFor(f,kcal){
  var mine=keyWords(f.n),r=role(f),pool=(FOODDB||[]).filter(function(x){
    return x.id!==f.id&&num(x.kcal)>0&&!NOSWAP.test(x.cat||"")&&!isDrink(x)&&!INGREDIENT.test(x.n)&&role(x)===r
      &&!keyWords(x.n).some(function(w){return mine.indexOf(w)>=0;});});
  var tgt=nutritionFor(f,kcal/num(f.kcal)*(f.per||100));
  var ranked=pool.map(function(x){
    var g=Math.round(kcal/num(x.kcal)*(x.per||100)/5)*5,nn=nutritionFor(x,g);
    var d=(Math.abs(nn.p-tgt.p)*4+Math.abs(nn.c-tgt.c)*4+Math.abs(nn.f-tgt.f)*9)/Math.max(kcal,1);
    return {f:x,g:g,n:nn,d:d};})
    .filter(function(x){return x.g>=20&&x.g<=600&&x.d<=0.45;})
    .sort(function(x,y){return x.d-y.d;});
  /* Three different foods: none shares a naming word with one already picked. */
  var out=[],used=[];
  for(var i=0;i<ranked.length&&out.length<3;i++){
    var kw=keyWords(ranked[i].f.n);if(!kw.length)kw=[fold(ranked[i].f.n)];
    if(kw.some(function(w){return used.indexOf(w)>=0;}))continue;
    used=used.concat(kw);out.push(ranked[i]);}
  return out;}
function swapLine(it,f,kcal){
  var sw=swapsFor(f,kcal);
  if(!sw.length)return null;
  return (it?itemName(it):foodName(f))+(it&&it.grams?" "+fill(t("{n} g"),{n:Math.round(it.grams)}):"")+" → "
    +sw.map(function(x){return foodName(x.f)+" "+fill(t("{n} g"),{n:x.g});}).join(" · ");}
/* The food a question names, once its question words are taken out. */
var QWORDS=/\b(how|much|many|what|whats|is|are|there|the|a|an|in|of|for|to|on|does|do|contain|contains|has|have|with|same|macros|macro|calories|calorie|kcal|protein|carbs|carb|fat|fats|fiber|fibre|sugar|grams|gram|g|nutrition|facts|info|value|values|instead|swap|replace|alternative|alternatives|other|food|foods|options|can|i|eat|my|me|you|u|give|provide|please|per|serving)\b/g;
var QWORDS_AR=/(^| )(كام|كم|بروتين|سعر|سعره|سعرات|كارب|دهون|جرام|في|فيه|فيها|القيمه|الغذائيه|بديل|بدايل|بدائل|بدل|حاجه|تانيه|تاني|غير|نفس|الماكروز|الماكرو|عايز|عاوز|ايه|اي|انا|ممكن|اكل|للـ)(?= |$)/g;
function namedFood(q){
  var rest=spell(fold(q)).replace(QWORDS," ").replace(QWORDS_AR," ").replace(/(^| )ل(?=ل)/g," ").replace(/\s+/g," ").trim();
  if(rest.length<2)return null;
  var bare=rest.replace(/(^| )(ال|لل|بال|وال)(?=..)/g,"$1").trim();
  var hits=searchFoods(rest,6).concat(searchFoods(bare,6)).sort(function(x,y){return y.score-x.score;});
  /* As people eat it: "chicken" is chicken cooked, not the raw entry, when both match
     about as well. */
  var hit=hits.filter(function(x){return hits[0]&&x.score>=hits[0].score-12&&!INGREDIENT.test(x.f.n);})[0]||hits[0];
  if(hit&&hit.score>=60)return hit.f;
  var fz=fuzzyFoods(rest,1)[0];
  return fz&&fz.dist<=2?fz.f:null;}

function aSwap(a,q){
  var nf=namedFood(q);
  /* A food named: what stands in for it, a usual portion's worth. */
  if(nf){
    var meal=planMeal(""),inPlan=meal&&meal.plan.filter(function(it){var f=foodOf(it);return f&&f.id===nf.id;})[0];
    var kc=inPlan?num(inPlan.kcal):nutritionFor(nf,(nf.s&&nf.s[0]&&nf.s[0][1])||100).kcal;
    var ln=swapLine(inPlan||null,nf,kc);
    if(!ln){p(a,fill(t("I couldn't find a close match for {f} in the food database."),{f:foodName(nf)}));return act(a,t("Open Food"),{"data-tab":"food"});}
    p(a,fill(t("Instead of {f}, the same calories with protein, carbs and fat close to it:"),{f:foodName(nf)}));
    l(a,[ln]);
    return act(a,t("Open Food"),{"data-tab":"food"});}
  var m=planMeal(q);
  if(!m){
    /* No plan to swap within: what closes today's protein gap. */
    var g=S.goals||{},pl=Math.round(num(g.p)-eatenToday(today()).p);
    p(a,t("There's no planned meal left today to swap. These each give about 25 g of protein:"));
    var picks=(FOODDB||[]).filter(function(f){return role(f)==="p"&&!NOSWAP.test(f.cat||"")&&!isDrink(f)&&!INGREDIENT.test(f.n)&&num(f.p)>=8;})
      .sort(function(x,y){return num(y.p)/num(y.kcal)-num(x.p)/num(x.kcal);});
    var out=[],seen={};
    picks.forEach(function(f){var k=fold(f.n).split(" ")[0];if(out.length>=5||seen[k])return;seen[k]=1;
      var gr=Math.round(25/num(f.p)*(f.per||100)/5)*5;if(gr>400)return;
      out.push(foodName(f)+" "+fill(t("{n} g"),{n:gr})+" · "+fill(t("{n} kcal"),{n:fmtN(nutritionFor(f,gr).kcal)}));});
    l(a,out);
    if(pl>0)n(a,fill(t("You have {p} g of protein left today."),{p:pl}));
    return act(a,t("Open Food"),{"data-tab":"food"});}
  var lines=m.plan.map(function(it){var f=foodOf(it);return f&&num(it.kcal)>0?swapLine(it,f,num(it.kcal)):null;}).filter(Boolean);
  if(!lines.length){p(a,fill(t("I couldn't match the foods in {m} to the food database, so I can't suggest swaps for it."),{m:mealName(m.id)}));
    return act(a,t("Open Food"),{"data-tab":"food"});}
  p(a,fill(t("Swaps for {m}: each is the same calories, with protein, carbs and fat close to what it replaces."),{m:mealName(m.id)}));
  l(a,lines);
  n(a,t("Swap one item or all of them; the meal still adds up to about the same."));
  return act(a,t("Open Food"),{"data-tab":"food"});}

function aFoodInfo(a,q,it){
  var f=namedFood(q);
  /* "How much protein in a day do I need" names no food: answer what it asks. */
  if(!f){var nx=(it&&it.ranked||[]).filter(function(x){return x!=="foodinfo";})[0];
    if(nx&&ANSWER[nx])return ANSWER[nx](a,q,it);
    p(a,t("I couldn't find that food in the food database. Try its common name, in English or Arabic."));
    return act(a,t("Open Food"),{"data-tab":"food"});}
  var sv=(f.s||[]).filter(function(x){return x[1]>0;})[0]||["100 g",100],ns=nutritionFor(f,sv[1]),nh=nutritionFor(f,f.per||100);
  var gl=fill(t("{n} g"),{n:sv[1]}),lbl=/^\d+\s*g$/.test(sv[0])||uiLang()==="ar"?gl:sv[0]+" ("+gl+")";
  p(a,fill(t("{f}, per {s}: {k} kcal, {p} g protein, {c} g carbs, {x} g fat."),{f:foodName(f),s:lbl,k:fmtN(ns.kcal),p:r1(ns.p),c:r1(ns.c),x:r1(ns.f)}));
  if(sv[1]!==(f.per||100))n(a,fill(t("Per 100 g: {k} kcal, {p} g protein."),{k:fmtN(nh.kcal),p:r1(nh.p)}));
  /* What it would do to today. */
  var g=S.goals||{},pl=num(g.p)-eatenToday(today()).p;
  if(pl>5&&ns.p>=3)p(a,fill(t("One portion covers about {n}% of the protein you have left today."),{n:Math.min(100,Math.round(ns.p/pl*100))}));
  return act(a,t("Open Food"),{"data-tab":"food"});}

var ANSWER={today:aToday,weights:aWeights,eat:aEat,track:aTrack,weight:aWeight,protein:aProtein,calories:aCalories,
  sore:aSore,missed:aMissed,balance:aBalance,strong:aStrong,goal:aGoal,plan:aPlan,water:aWater,steps:aSteps,
  help:aHelp,hello:aHello,thanks:aThanks,unknown:aUnknown,tomorrow:aTomorrow,last:aLast,rest:aRest,swap:aSwap,foodinfo:aFoodInfo};

/* Ask: q is what the person typed, or a suggestion's id. Kept with its answer. */
/* Ask: q is what the person typed, or a suggestion's id (with the conversation's
   language, lang). Kept with its answer and the language it was answered in. */
function ask(q,id,lang){
  var it=id?{id:id,ranked:[]}:intentOf(q);
  var L=id?(lang==="ar"||lang==="en"?lang:uiLang()):it.lang==="ar"?"ar":"en";
  var msg=withLang(L,function(){
    var text=id?t(ASK[id]||""):String(q).trim().slice(0,300),iid=it.id;
    /* Not phrased as anything known, but it names an exercise in the plan, or a food:
       that is what it is about. */
    if(!id&&iid==="unknown"){
      if(namedExercises(text).length)iid="weights";
      else if(FOODDB&&namedFood(text))iid="foodinfo";}
    var a=A(),fn=ANSWER[iid]||aUnknown;
    if(!S.onboarded&&/^(today|tomorrow|weights|eat|rest|swap|weight|protein|calories|missed|balance|goal)$/.test(iid)){
      p(a,t("First, the assessment: a few questions, and the coach builds your targets, training and meals. Then I can answer from your own plan."));
      act(a,t("Start the assessment"),{"data-setup":"1"});}
    else{try{fn(a,text,it);}catch(e){a=aUnknown(A());}}
    return {q:text,id:iid,at:Date.now(),b:a.b,acts:a.acts,lang:L};});
  S.chat=(S.chat||[]).concat([msg]).slice(-KEEP);
  return msg;}

/* ---- on screen ------------------------------------------------------------------
   Not a chatbot's look: a question is a short line on the reading side, and an answer
   is a card that names what it is about, with its lists as ruled rows, its notes set
   apart, and its buttons last. Nothing is coloured by who said it; the accent is kept
   for the one button an answer leads to. */
/* What each answer is about, and its glyph (js/ui/glyphs.js). */
var TOPIC={today:["Today's workout","dumbbell"],weights:["What to lift","dumbbell"],eat:["What to eat","bowl"],
  track:["How you're doing","bars"],weight:["Weight trend","scale"],protein:["Protein","shaker"],calories:["Calories","flame"],
  sore:["Recovery","moon"],missed:["Short on time","clock"],balance:["Program balance","balance"],strong:["Strength","medal"],
  goal:["Your goal","target"],plan:["A new plan","clipboard"],water:["Water","drop"],steps:["Steps and cardio","route"],
  help:["What I can answer","question"],tomorrow:["Tomorrow's workout","dumbbell"],last:["Last workout","bars"],
  rest:["The rest of today","bowl"],swap:["Food swaps","balance"],foodinfo:["Food facts","info"]};
/* The opening screen: what can be asked, by what it is about. */
var GROUPS=[["Training",["today","tomorrow","weights","sore"]],["Food",["eat","rest","swap","protein"]],
  ["Progress",["track","last","weight","strong"]]];

function chips(ids,cls,lang){
  return '<div class="chat-chips'+(cls?' '+cls:'')+'">'+ids.map(function(id){
    return '<button class="chat-chip" data-chatq="'+id+'"'+(lang?' data-chatl="'+lang+'"':'')+'>'+esc(t(ASK[id]))+'</button>';}).join("")+'</div>';}
function topicRow(id){
  var tp=TOPIC[id]||["","question"];
  return '<button class="chat-topic" data-chatq="'+id+'"><span class="chat-gl">'+glyph(tp[1])+'</span>'
   +'<span class="chat-topic-q">'+esc(t(ASK[id]))+'</span><span class="ico ico-chev" aria-hidden="true"></span></button>';}
function bubble(m,live){
  var L=m.lang==="ar"||m.lang==="en"?m.lang:uiLang();
  return withLang(L,function(){return bubbleIn(m,live,L);});}
function bubbleIn(m,live,L){
  var tp=TOPIC[m.id];
  var h='<div class="chat-x'+(live?' live':'')+'" lang="'+L+'" dir="'+(L==="ar"?"rtl":"ltr")+'"><div class="chat-q"><p dir="auto">'+esc(String(m.q||""))+'</p></div><div class="chat-a">'
   +'<div class="chat-ah"><span class="chat-gl">'+glyph(tp?tp[1]:"question")+'</span><span class="chat-ah-t">'
   +'<span class="chat-ak">'+esc(t("Coach"))+'</span>'+(tp?'<span class="chat-at">'+esc(t(tp[0]))+'</span>':'')+'</span></div>';
  (Array.isArray(m.b)?m.b:[]).forEach(function(x){
    if(!x)return;
    if(x.p!=null)h+='<p>'+esc(String(x.p))+'</p>';
    else if(Array.isArray(x.l))h+='<ul class="chat-l">'+x.l.map(function(i){return '<li>'+esc(String(i))+'</li>';}).join("")+'</ul>';
    else if(x.n!=null)h+='<p class="chat-n">'+glyph("info")+'<span>'+esc(String(x.n))+'</span></p>';});
  /* A kept conversation comes back from storage and from backups, so a button is only
     ever its label and data-* attributes the app itself acts on. */
  var acts=live&&Array.isArray(m.acts)?m.acts:[];
  if(acts.length)h+='<div class="chat-acts">'+acts.map(function(b,i){
    var at=Object.keys(b.a||{}).filter(function(k){return /^data-[a-z]+$/.test(k);})
      .map(function(k){return ' '+k+'="'+esc(b.a[k])+'"';}).join("");
    return '<button class="btn '+(i?'g ':'')+'sm"'+at+'>'+esc(String(b.l||""))+'</button>';}).join("")+'</div>';
  return h+'</div></div>';}

/* The screen: a header that says where the answers come from, then either what can be
   asked or the conversation and what to ask next, and a box to type in that stays in
   reach above the dock. */
function vChat(){
  var log=(S.chat||[]).filter(function(m){return m&&typeof m==="object";}),last=log[log.length-1];
  var h='<div class="chat-head">'+backArrow()
   +'<div class="chat-head-t"><h1>'+esc(t("Ask the coach"))+'</h1>'
   +'<p class="chat-priv">'+glyph("lock")+'<span>'+esc(t("From your log, worked out on this phone"))+'</span></p></div>'
   +(log.length?'<button class="icobtn chat-clear" data-chatclear="1" aria-label="'+esc(t("Clear"))+'">'+glyph("trash")+'</button>':'')
   +'</div>';
  h+='<div class="chat" role="log" aria-live="polite">';
  if(!log.length){
    h+='<p class="chat-hi">'+esc(t("Ask me about today's training, your food, or how things are going. Tap a question, or type your own, in English or Arabic."))+'</p>'
     +GROUPS.map(function(g){
        return '<section class="chat-grp"><h2 class="chat-grp-h">'+esc(t(g[0]))+'</h2>'
         +'<div class="chat-topics">'+g[1].map(topicRow).join("")+'</div></section>';}).join("")
     +'<p class="chat-dis">'+esc(t("Answers come from your own log, plan and targets, worked out on this phone. Nothing you type leaves it."))+'</p>';}
  log.forEach(function(m,i){h+=bubble(m,i===log.length-1);});
  h+='</div>';
  /* What to ask next, in the conversation's language. */
  if(last){var LL=last.lang==="ar"||last.lang==="en"?last.lang:uiLang(),own=LL!==uiLang()?LL:"";
    h+=withLang(LL,function(){return '<div class="chat-next" lang="'+LL+'" dir="'+(LL==="ar"?"rtl":"ltr")+'"><div class="chat-next-h">'+esc(t("Ask next"))+'</div>'
      +chips(NEXT[last.id]||NEXT.unknown,"",own)+'</div>';});}
  h+='<div class="chat-form"><input id="chatq" type="text" enterkeyhint="send" autocomplete="off" maxlength="300" placeholder="'
   +esc(t("Ask a question"))+'" aria-label="'+esc(t("Ask a question"))+'">'
   +'<button class="chat-send" data-chatsend="1" aria-label="'+esc(t("Ask"))+'">'+glyph("send")+'</button></div>';
  return h;}

/* Coach AI's way in: a few questions to tap, and the rest of the conversation. */
function chatCard(){
  var log=S.chat||[];
  return '<section class="chatcard"><div class="chatcard-h"><span class="chat-gl">'+glyph("question")+'</span>'
   +'<span><span class="chatcard-t">'+esc(t("Ask the coach"))+'</span>'
   +'<span class="chatcard-s">'+esc(t("Questions answered from your own log, plan and targets."))+'</span></span></div>'
   +'<div class="chat-topics tight">'+["today","eat","track"].map(topicRow).join("")+'</div>'
   +'<button class="btn g sm" data-chat="1">'+esc(t(log.length?"Continue the conversation":"Ask something else"))+'</button></section>';}

export {ASK, ask, chatCard, NEXT, vChat};

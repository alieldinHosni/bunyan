/* Bunyan — Coach AI: ask the coach
   A guided chat, not a chatbot. Nothing is sent anywhere and no model writes the
   answers: js/coach/intent.js matches the question, typed in English or Arabic or
   tapped from a suggestion, to one of a fixed set of things the coach knows how to
   answer, and the answer is worked out here from the person's own log, plan and
   targets, with the same engines the rest of the app uses. So it can only say what
   the app knows, and it says so when a question is outside that.

   Each answer is kept (the last 30), so the conversation is still there next time. The
   newest answer carries its buttons; older ones are text, because what a button would
   act on may have changed since. */
import {t} from "../../i18n/dict.js";
import {exName, planName} from "../../i18n/exnames.js";
import {goalOf} from "../../data/goals.js";
import {isActivity} from "../../data/activities.js";
import {fold, intentOf} from "../../coach/intent.js";
import {checkPlans} from "../../engine/plancheck.js";
import {coachNow, standingNow} from "../../engine/coachinfo.js";
import {learnedDiffers, learnedNow, maintenanceInUse} from "../../engine/energy.js";
import {bmr, bwShare, deloadDue, e1RM, eatenToday, inDeload, lastWeight, loadText, macroTargets, recommend, targetKcal, tdee, tdeeFormula} from "../../engine/formulas.js";
import {mealName, mealSlots} from "../../engine/meals.js";
import {sumNutrition} from "../../engine/nutrition.js";
import {nutrition, topLifts, weeklyCardio, weighIns, weightChange, weightTrend} from "../../engine/stats.js";
import {S, split} from "../../state.js";
import {fmtW, toDisp, wUnit} from "../../units.js";
import {esc, fmtN, num, r1, today} from "../../util.js";
import {backArrow} from "../nav.js";
import {doseText} from "../dose.js";
import {blockDay, blockNow} from "../../engine/blocks.js";
import {estMinutes, nextDayOf, planOn} from "../../engine/dayplan.js";
import {avoids, standIn} from "../../engine/plan.js";
import {OPL_NAME, simpleFacts, trendSays} from "../facts.js";
import {words} from "../coachwords.js";

var KEEP=30;
/* The suggestions: what each asks, as the person would ask it. */
var ASK={
  today:"What do I train today?",weights:"How much should I lift?",eat:"What should I eat now?",
  track:"How am I doing?",weight:"Is my weight on track?",protein:"How much protein do I need?",
  calories:"Why are my calories set like this?",sore:"I'm sore or tired",missed:"I'm short on time today",
  balance:"Is my program balanced?",strong:"How strong am I?",goal:"Should I change my goal?",
  plan:"Build me a new plan",water:"How much water should I drink?",steps:"How are my steps and cardio?",
  help:"What can you answer?"};
/* What to offer next, after each kind of answer. */
var NEXT={
  today:["weights","missed","sore"],weights:["today","strong","balance"],eat:["protein","calories","weight"],
  track:["weight","strong","balance"],weight:["calories","eat","goal"],protein:["eat","calories","track"],
  calories:["protein","weight","goal"],sore:["today","missed","balance"],missed:["today","weights","track"],
  balance:["today","strong","plan"],strong:["weights","track","balance"],goal:["calories","plan","weight"],
  plan:["today","eat","goal"],water:["eat","steps","track"],steps:["weight","water","track"],
  help:["today","eat","track"],hello:["today","eat","track"],thanks:["today","eat","track"],unknown:["today","eat","track"]};

function fill(s,o){Object.keys(o).forEach(function(k){s=s.split("{"+k+"}").join(o[k]);});return s;}
function list(a){return a.join(S.prefs.lang==="ar"?"، ":", ");}
/* An answer: paragraphs (p), a list (l), a small note (n), and its buttons. */
function A(){return {b:[],acts:[]};}
function p(a,s){a.b.push({p:s});return a;}
function l(a,items){if(items.length)a.b.push({l:items});return a;}
function n(a,s){a.b.push({n:s});return a;}
function act(a,label,attrs){a.acts.push({l:label,a:attrs});return a;}
function noTags(s){return String(s||"").replace(/<[^>]+>/g,"");}

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
  var qw=fold(q).split(" "),fq=" "+qw.concat(qw.map(function(w){return w.replace(/^(وال|بال|فال|لل|ال)(?=..)/,"");})).join(" ")+" ";
  var seen={},out=[],pool=[];
  split().days.forEach(function(d){d.ex.forEach(function(e){pool.push(e);});});
  pool.forEach(function(e){
    if(seen[e.name]||isActivity(e.name))return;
    var names=[e.name,exName(e.name)].map(fold);
    var hit=names.some(function(nm){return nm.split(" ").some(function(w){
      return w.length>=(/[\u0600-\u06FF]/.test(w)?3:4)&&!GENERIC.test(w)&&fq.indexOf(" "+w)>=0;});});
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
      f:list(m.plan.slice(0,4).map(function(i){return i.n||i.label||"";})),k:fmtN(tot.kcal),p:Math.round(tot.p)}));
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

var ANSWER={today:aToday,weights:aWeights,eat:aEat,track:aTrack,weight:aWeight,protein:aProtein,calories:aCalories,
  sore:aSore,missed:aMissed,balance:aBalance,strong:aStrong,goal:aGoal,plan:aPlan,water:aWater,steps:aSteps,
  help:aHelp,hello:aHello,thanks:aThanks,unknown:aUnknown};

/* Ask: q is what the person typed, or a suggestion's id. Kept with its answer. */
function ask(q,id){
  var it=id?{id:id}:intentOf(q),text=id?t(ASK[id]||""):String(q).trim().slice(0,300);
  var a=A(),fn=ANSWER[it.id]||aUnknown;
  if(!S.onboarded&&/^(today|weights|eat|weight|protein|calories|missed|balance|goal)$/.test(it.id)){
    p(a,t("First, the assessment: a few questions, and the coach builds your targets, training and meals. Then I can answer from your own plan."));
    act(a,t("Start the assessment"),{"data-setup":"1"});}
  else{try{fn(a,text);}catch(e){a=aUnknown(A());}}
  var msg={q:text,id:it.id,at:Date.now(),b:a.b,acts:a.acts};
  S.chat=(S.chat||[]).concat([msg]).slice(-KEEP);
  return msg;}

/* ---- on screen ------------------------------------------------------------------ */
function chips(ids,cls){
  return '<div class="chat-chips'+(cls?' '+cls:'')+'">'+ids.map(function(id){
    return '<button class="chat-chip" data-chatq="'+id+'">'+esc(t(ASK[id]))+'</button>';}).join("")+'</div>';}
function bubble(m,live){
  var h='<div class="chat-q"><p>'+esc(String(m.q||""))+'</p></div><div class="chat-a">';
  (Array.isArray(m.b)?m.b:[]).forEach(function(x){
    if(!x)return;
    if(x.p!=null)h+='<p>'+esc(String(x.p))+'</p>';
    else if(Array.isArray(x.l))h+='<ul>'+x.l.map(function(i){return '<li>'+esc(String(i))+'</li>';}).join("")+'</ul>';
    else if(x.n!=null)h+='<p class="chat-n">'+esc(String(x.n))+'</p>';});
  /* A kept conversation comes back from storage and from backups, so a button is only
     ever its label and data-* attributes the app itself acts on. */
  var acts=live&&Array.isArray(m.acts)?m.acts:[];
  if(acts.length)h+='<div class="chat-acts">'+acts.map(function(b,i){
    var at=Object.keys(b.a||{}).filter(function(k){return /^data-[a-z]+$/.test(k);})
      .map(function(k){return ' '+k+'="'+esc(b.a[k])+'"';}).join("");
    return '<button class="btn '+(i?'g ':'')+'sm"'+at+'>'+esc(String(b.l||""))+'</button>';}).join("")+'</div>';
  return h+'</div>';}

/* The screen: the conversation, what to ask next, and a box to type in. */
function vChat(){
  var log=(S.chat||[]).filter(function(m){return m&&typeof m==="object";}),last=log[log.length-1];
  var h='<div class="dhead">'+backArrow()+'<h1 class="dhead-t">'+esc(t("Ask the coach"))+'</h1>'
   +(log.length?'<button class="btn d sm chat-clear" data-chatclear="1">'+esc(t("Clear"))+'</button>':'')+'</div>'
   +'<p class="dsub">'+esc(t("Answers come from your own log, plan and targets, worked out on this phone. Nothing you type leaves it."))+'</p>';
  h+='<div class="chat" role="log" aria-live="polite">';
  if(!log.length)h+='<div class="chat-a chat-hi"><p>'+esc(t("Ask me about today's training, your food, or how things are going. Tap a question, or type your own, in English or Arabic."))+'</p></div>';
  log.forEach(function(m,i){h+=bubble(m,i===log.length-1);});
  h+='</div>';
  h+=chips(last?NEXT[last.id]||NEXT.unknown:["today","eat","track","weight","sore","missed"]);
  h+='<div class="chat-form"><input id="chatq" type="text" enterkeyhint="send" autocomplete="off" maxlength="300" placeholder="'
   +esc(t("Ask a question"))+'" aria-label="'+esc(t("Ask a question"))+'">'
   +'<button class="btn chat-send" data-chatsend="1">'+esc(t("Ask"))+'</button></div>';
  return h;}

/* Coach AI's way in: a few questions to tap, and the rest of the conversation. */
function chatCard(){
  var log=S.chat||[];
  return '<section class="chatcard"><div class="chatcard-h"><span class="shk">'+esc(t("Ask the coach"))+'</span>'
   +'<p>'+esc(t("Questions answered from your own log, plan and targets."))+'</p></div>'
   +chips(["today","eat","track"],"tight")
   +'<button class="btn g sm" data-chat="1">'+esc(t(log.length?"Continue the conversation":"Ask something else"))+'</button></section>';}

export {ASK, ask, chatCard, NEXT, vChat};

/* Bunyan — the coach's answers (docs/COACH-AGENT.md C-2)
   Each a(…) works out one answer from the person's own log, plan and targets, with the
   same engines the rest of the app uses, and returns it as an answer object (kit.js);
   js/ui/views/chat.js routes a question to one of them and draws what comes back.
   Moved out of chat.js as they were: no answer's words or figures changed. */
import {t, tm} from "../../i18n/dict.js";
import {act, fill, foods, l, list, n, noTags, p, rd, src, uiLang} from "./kit.js";
import {exName, planName} from "../../i18n/exnames.js";
import {goalOf} from "../../data/goals.js";
import {actInfo, isActivity} from "../../data/activities.js";
import {fold, intentOf, spell} from "../../coach/intent.js";
import {KINDS, listFacts} from "../../coach/context.js";
import {reconcileNutrition, reconcileTraining} from "../../coach/reconcile.js";
import {addDays as addDaysW, pinnedOn, wdName, weekDates, weekStartOf} from "../../engine/schedule.js";
import {EXDB, exSteps, movementOfEx, muscleOf, secondaryOf} from "../../data/exercises.js";
import {cooldownFor, warmupFor} from "../../engine/warmup.js";
import {faqRank} from "../../engine/faq.js";
import {guardNums} from "../../coach/guard.js";
import {LANDMARKS} from "../../coach/landmarks.js";
import * as KB from "../../engine/kb.js";
import {lookup} from "../../engine/kbsearch.js";
import {weeklySets} from "../../engine/volume.js";
import {weeklyVolume} from "../../engine/stats.js";
import {canUndo} from "../handlers/actions.js";
import {swapPick} from "../agent.js";
import {checkPlans} from "../../engine/plancheck.js";
import {fuelLine, headOn, todayPlan} from "../../engine/head.js";
import {afterNote, beforeNote, MINTIMED} from "../../engine/dayfuel.js";
import {coachNow, standingNow} from "../../engine/coachinfo.js";
import {learnedDiffers, learnedNow, maintenanceInUse} from "../../engine/energy.js";
import {bestE1RM, bmr, bwShare, dbTotal, deloadDue, plateauOf, e1RM, eatenToday, energyMissing, inDeload, kcalFloor, lastWeight, loadText, macroTargets, prFor, recommend, sessionVolume, targetKcal, tdee, tdeeFormula} from "../../engine/formulas.js";
import {mealName, mealSlots} from "../../engine/meals.js";
import {editDist} from "../../engine/text.js";
import {FOODDB, foodName, fuzzyFoods, isDrink, nutritionFor, searchFoods, sumNutrition} from "../../engine/nutrition.js";
import {nutrition, topLifts, weeklyCardio, weighIns, weightChange, weightTrend} from "../../engine/stats.js";
import {S, split} from "../../state.js";
import {fmtW, toDisp, wUnit} from "../../units.js";
import {fmtN, num, pretty, r1, shortd, today} from "../../util.js";
import {FAT_RANGE, fatBand} from "../../engine/inbody.js";
import {doseText} from "../dose.js";
import {blockDay, blockNow, phaseNow} from "../../engine/blocks.js";
import {stageFor, zonesFor} from "../../engine/zones.js";
import {COND_LABEL, condLines, rulesFor} from "../../engine/conditions.js";
import {correctiveFor} from "../../engine/corrective.js";
import {addDaysISO, estMinutes, nextDayOf, planOn} from "../../engine/dayplan.js";
import {swapAdvice} from "../../engine/recovery.js";
import {checkinOpen} from "../../engine/checkin.js";
import {ckChange, moChange, moFacts} from "../checkin.js";
import {lastMonth, monthlyNow} from "../../engine/monthly.js";
import {adaptOf, avoids, BUILT as BUILTID, limitsOf, standIn, usable} from "../../engine/plan.js";
import {rangeFor} from "../../coach/landmarks.js";
import {OPL_NAME, simpleFacts, trendSays} from "../facts.js";
import {words} from "../coachwords.js";
import {ASK} from "../ask.js";
import {TOPIC} from "../views/chat.js";
import {ANSWER, ELSEWHERE, FOODNO, GENERIC, GROUPOF, KITOF, MUSCLEWORD, PAIN, WHYKIND, areaOf, foodWords, lifts, namedExercises, namedFood, readAs, scopeAnswer, told} from "./route.js";

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
  /* Most of it on muscles trained yesterday, with a fresh day in the program: said, and
     offered (js/engine/recovery.js), as Training's card does. */
  var rs=null;try{rs=swapAdvice(sp,now,pl);}catch(e){rs=null;}
  if(rs){
    p(a,fill(t("Most of {a} lands on {m}, trained {w}. They need a rest day between hard sessions; {b} is fresh."),
      {a:planName(rs.fromDay.name),m:list(rs.tired.slice(0,3).map(function(m){return tm(m).trim().toLowerCase();})),w:t("yesterday"),b:planName(rs.toDay.name)}));
    act(a,fill(t("Train {b} instead"),{b:planName(rs.toDay.name)}),{"data-recoswap":rs.to,"data-recodate":now});}
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
  clashes(d.ex).forEach(function(c){p(a,fill(t("You said “{s}”, and {ex} is in it."),{s:c.said,ex:exName(c.name)}));});
  told(a,["schedule","obstacle"]);
  act(a,t("Start workout"),{"data-startday":d.id});
  return act(a,t("Change the day"),{"data-tab":"train"});}
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

/* "Make it lighter" after today's workout: the two ways the app has, each a tap. */
function aLighter(a){
  p(a,t("Two ways to make it lighter:"));
  act(a,t("Easier exercises today"),{"data-chatsay":uiLang()==="ar"?"خلي تمرين من تمارين النهارده اسهل":"make one of today's exercises easier"});
  return act(a,inDeload()?t("Open Training"):t("Start a lighter week"),inDeload()?{"data-tab":"train"}:{"data-chatsay":uiLang()==="ar"?"ابدا اسبوع خفيف":"start a lighter week"});}
/* A sweet craving (owner, 19 Nov): sweet foods from the food database, a usual portion
   each with its figures, those that fit what is left of the day's calories. */
var SWEET=["Banana","Dates","Apple","Grapes","Mango","Greek yogurt","Honey","Dark chocolate"];
function aCrave(a){
  var g=S.goals||{},e=eatenToday(today()),kl=Math.round(num(g.kcal)-e.kcal),picks=[];
  SWEET.forEach(function(nm){if(picks.length>=4)return;var h=null;try{h=searchFoods(nm,1)[0];}catch(x){h=null;}
    if(!h||h.score<72||picks.some(function(x){return x.f.id===h.f.id;}))return;
    var gr=(h.f.s&&h.f.s[0]&&h.f.s[0][1])||100,nu=nutritionFor(h.f,gr);
    if(kl>0&&nu.kcal>kl)return;picks.push({f:h.f,g:gr,n:nu});});
  p(a,kl>0?fill(t("Something sweet that fits: you have {k} kcal left today."),{k:fmtN(kl)}):t("Today's calories are used, so if you have something sweet, keep it to a small portion."));
  if(picks.length)l(a,picks.map(function(x){return foodName(x.f)+" "+fill(t("{n} g"),{n:x.g})+": "+fill(t("{k} kcal · {p} g protein"),{k:fmtN(x.n.kcal),p:Math.round(x.n.p)});}));
  return act(a,t("Open Food"),{"data-tab":"food"});}

function aTrack(a){
  var f=simpleFacts();
  p(a,t("Where you are, in plain words:"));
  l(a,f.map(function(x){return x.k+": "+noTags(x.head)+". "+x.line;}));
  /* What Coach lists, as the head keeps it (js/engine/head.js). */
  var c=headOn("coach").length;
  if(c)n(a,fill(t(c===1?"There is 1 thing in Coach worth a look.":"There are {n} things in Coach worth a look."),{n:c}));
  return act(a,t("Open Progress"),{"data-tab":"progress"});}

/* ---- the weekly check-in ------------------------------------------------------------
   A week from the person's own log: the last one, in the first two days of a new week,
   otherwise this one so far. Workouts against the plan, sets and volume against the
   week before, protein days, the weight's average against the week before, lifts that
   beat their best; each line only where the log has the data. Then one thing to change. */
function weekSpan(){
  var n=today(),ws=weekStartOf(n),last=addDaysW(n,-1)<=ws&&n<=addDaysW(ws,1);
  var from=last?addDaysW(ws,-7):ws,to=last?addDaysW(ws,-1):n;
  return {from:from,to:to,last:last,prevFrom:addDaysW(from,-7),prevTo:addDaysW(from,-1)};}
function inSpan(d,a,b){return d>=a&&d<=b;}
/* In a workout, the workout first (owner, 3 Nov: "when I chat in a live session, most
   probably I need something within this session; that should be the priority unless I say
   something not related"). The exercise on screen: what is asked of it now, where the
   person is in it, the weight to use, the rest and tempo, what comes next, and what can be
   asked. */
function aLive(a){
  var A0=S.active,i=Math.min(A0.idx||0,A0.entries.length-1),e=A0.entries[i];
  if(!e){p(a,t("Your workout is on. Ask me about the exercise on screen."));return a;}
  var pl=e.planned||{},done=(e.sets||[]).filter(function(x){return !x.wu;}).length;
  p(a,fill(t("Now: {ex}, set {n} of {s}."),{ex:exName(e.name),n:Math.min(done+1,pl.sets||done+1),s:pl.sets||"?"}));
  var L2=[];
  if(isActivity(e.name))L2.push(fill(t("{m} min, effort {r} of 10"),{m:pl.min||30,r:pl.rpe||6}));
  else{
    if(pl.lo||pl.hi)L2.push(fill(t("Target {r} reps"),{r:pl.lo&&pl.hi&&pl.lo!==pl.hi?pl.lo+"–"+pl.hi:(pl.hi||pl.lo)})+(pl.rir!=null?", "+fill(t("{n} in reserve"),{n:pl.rir}):""));
    var rc=null;try{rc=recommend(e);}catch(err){rc=null;}
    if(rc&&rc.w)L2.push(fill(t("Weight: {w}"),{w:fmtW(rc.w)})+(rc.note?" — "+t(rc.note):""));
    if(e.rest)L2.push(fill(t("Rest {s} s between sets"),{s:e.rest}));
    var tmp=pl.tempo&&(pl.tempo.match(/[\dX]-[\dX]-[\dX]-[\dX]/)||[""])[0];if(tmp)L2.push(fill(t("Tempo {t}"),{t:tmp}));}
  l(a,L2);
  var nx=A0.entries[i+1];if(nx)n(a,fill(t("Then {ex}."),{ex:exName(nx.name)}));
  n(a,t("Ask me to fit the reps, swap it if the machine is taken, or how to do it."));
  act(a,t("How to do it"),{"data-exdetail":e.name});
  return a;}
/* The phase this block runs, what it asks and why, and what comes next (engine/phase.js). */
var PHASE_LINE={1:"Lighter loads, slow and controlled: movement quality, joint stability and endurance first. Progress by control, not weight.",
  2:"More strength in the main movers while keeping the stability you built.",3:"More sets in the growth range: building muscle.",
  4:"Heavy, low-rep work on the big lifts: the most force you can make.",5:"Heavy lifts paired with fast, light ones: strength turned into speed."};
function aPhase(a){
  var b=blockNow(),ph=phaseNow();
  if(!b||!ph){p(a,t("Training blocks are off, so there is no phase. Turn them on in Settings to train in phases."));return a;}
  p(a,fill(t("Block {b}, week {w} of {n}: {p}."),{b:b.block,w:b.week,n:b.of,p:t(ph.name)}));
  p(a,t(PHASE_LINE[ph.n]||""));
  var tmp=(ph.tempo.match(/[\dX]-[\dX]-[\dX]-[\dX]/)||[""])[0];
  l(a,[fill(t("{a}–{b} reps a set"),{a:ph.reps.min,b:ph.reps.max})].concat(tmp?[fill(t("Tempo {t}: seconds lowering, pausing, lifting, pausing"),{t:tmp})]:[]));
  if(ph.seq.length>1)n(a,fill(t("Your goal runs {s}, then round again. Next block: {p}."),{s:ph.seq.map(function(x){return x;}).join(" → "),p:t(PHASE_NAME_CHAT[ph.seq[b.block%ph.seq.length]])}));
  src(a,"phases 13.3");
  return a;}
var PHASE_NAME_CHAT={1:"Stabilisation endurance",2:"Strength endurance",3:"Muscular development",4:"Maximal strength",5:"Power"};
/* The cardio stage and zones (engine/zones.js), as Cardio & Sports shows them. */
function aZones(a){
  var pz=S.profile||{},z=zonesFor(pz),st=stageFor(pz,S.sessions,today(),{cardio:function(nm){var x=actInfo(nm);return !!(x&&x.grp==="Cardio");}});
  p(a,fill(t("You are at cardio stage {n}."),{n:st.stage}));
  if(z.feelOnly)p(a,t("Your medication can change your heart rate, so go by feel and the talk test, not a number."));
  l(a,z.rows.filter(function(r){return r.zone<=Math.max(2,st.stage);}).map(function(r){
    var fig=r.min||r.max?(r.min&&r.max?r.min+"–"+r.max:r.min?r.min+"+":"<"+(r.max+1))+" "+t("bpm"):fill(t("RPE {a}–{b}"),{a:r.rpe.min,b:r.rpe.max});
    return fill(t("Zone {n}"),{n:r.zone})+": "+fig;}));
  if(!z.measured&&!z.feelOnly)n(a,t("These are by feel until you do the talk test: it finds the heart rate where talking gets hard, and your zones follow from it."));
  act(a,t(z.measured?"Change your zones":"Find your zones"),{"data-zones":"1"});
  src(a,"cardio 15.4");
  return a;}
/* What the person's health conditions change in the plan (engine/conditions.js). */
function aHealth(a){
  var R=rulesFor(S.profile);
  if(!R){p(a,t("You haven't told me about a health condition. If a doctor has, add it in the assessment's health step: the plan then follows the guidelines for it."));
    act(a,t("Open the health step"),{"data-setupstep":"health"});return a;}
  p(a,fill(t("Your plan is adjusted for: {c}."),{c:R.ids.map(function(i){return t(COND_LABEL[i]).toLowerCase();}).join(S.prefs.lang==="ar"?"، ":", ")}));
  l(a,condLines(R,S.profile).map(function(x){var s0=t(x[0]);Object.keys(x[1]).forEach(function(k){s0=s0.replace("{"+k+"}",x[1][k]);});return s0;}));
  n(a,t("From the guidelines for training with each one. Your doctor's advice comes first; stop and get checked if anything feels wrong."));
  return a;}
function aWeek(a){
  var w=weekSpan(),ss=S.sessions||[],G=S.goals||{};
  var wk=ss.filter(function(s){return inSpan(s.date,w.from,w.to);}),pv=ss.filter(function(s){return inSpan(s.date,w.prevFrom,w.prevTo);});
  var sets=function(list){var c=0;list.forEach(function(s){(s.entries||[]).forEach(function(e){(e.sets||[]).forEach(function(x){if(!x.wu)c++;});});});return c;};
  var vol=function(list){return list.reduce(function(t0,s){return t0+sessionVolume(s);},0);};
  var plan=num(S.profile.days)||split().days.filter(function(d){return d.ex.length;}).length;
  p(a,t(w.last?"Last week, from your log:":"This week so far, from your log:"));
  var L=[];
  L.push(fill(t(plan?"Workouts: {n} of {p} planned":"Workouts: {n}"),{n:wk.length,p:plan}));
  if(wk.length){var s1=sets(wk),s0=sets(pv),v1=vol(wk),v0=vol(pv);
    L.push(fill(t("Working sets: {n}"),{n:s1})+(pv.length?" ("+fill(t("{n} the week before"),{n:s0})+")":""));
    if(v1)L.push(fill(t("Volume: {v}"),{v:fmtW(v1)})+(v0?" ("+(v1>=v0?"+":"−")+Math.round(Math.abs(v1-v0)/v0*100)+"%)":""));}
  /* Protein: the days food was logged, and how many of them reached the target. */
  var logged=0,hit=0;
  for(var d=w.from;d<=w.to;d=addDaysW(d,1)){var r=S.days&&S.days[d];if(!r||!r.meals)continue;
    var it=[];Object.keys(r.meals).forEach(function(k){(r.meals[k].items||[]).forEach(function(i){it.push(i);});});
    if(!it.length)continue;logged++;if(G.p&&sumNutrition(it).p>=G.p*0.9)hit++;}
  if(logged&&G.p)L.push(fill(t("Protein: on target {h} of the {n} days you logged food"),{h:hit,n:logged}));
  /* Weight: the week's average against the week before's, both from weigh-ins. */
  var avg=function(x,y){var b=(S.body||[]).filter(function(e){return e&&e.weight&&inSpan(e.date,x,y);});
    return b.length?b.reduce(function(t0,e){return t0+num(e.weight);},0)/b.length:0;};
  var aw=avg(w.from,w.to),ap=avg(w.prevFrom,w.prevTo);
  if(aw&&ap)L.push(fill(t("Weight: {w} average, {d} on the week before"),{w:fmtW(aw),d:(aw-ap>=0?"+":"−")+fmtW(Math.abs(aw-ap))}));
  /* Lifts that beat their best estimated max from before the week. */
  var beat=[];
  wk.forEach(function(s){(s.entries||[]).forEach(function(e){
    var now1=bestE1RM(e.sets||[],e.name,s.date);if(!now1)return;
    var before=0;ss.forEach(function(o){if(o.date>=w.from)return;(o.entries||[]).forEach(function(x){if(x.name===e.name){var b=bestE1RM(x.sets||[],x.name,o.date);if(b>before)before=b;}});});
    if(before&&now1>before&&beat.indexOf(e.name)<0)beat.push(e.name);});});
  if(beat.length)L.push(fill(t("New bests: {list}"),{list:beat.slice(0,3).map(exName).join(", ")}));
  l(a,L);
  /* One thing to change, the first that applies. */
  var tip;
  if(w.last&&plan&&wk.length<plan)tip=fill(t("This week, get all {p} workouts in: the plan only works if it's trained."),{p:plan});
  if(!tip&&logged<4)tip=t("Log your food on more days. With four or more a week I can tell whether your targets fit.");
  if(!tip&&G.p&&hit<logged*0.7)tip=fill(t("Protein is the gap: {g} g a day. Put some in every meal rather than catching up at night."),{g:fmtN(G.p)});
  if(!tip&&!beat.length&&wk.length)tip=t("Push a little where last week's sets felt easy: one more rep, or the next weight up.");
  if(!tip)tip=t("Keep it as it is: it's working.");
  p(a,tip);
  S.ckSeen=weekStartOf(today());
  /* Last week's check-in: the changes it proposes, one tap each (js/engine/checkin.js). */
  var ck=checkinOpen();
  if(ck&&ck.changes.length){if(!w.last)p(a,t("From last week's check-in:"));ck.changes.forEach(function(x){var c=ckChange(x);p(a,c.text);act(a,c.btn,{"data-ckdo":x.kind});});return a;}
  return act(a,t("Open Progress"),{"data-tab":"progress"});}

/* The month that ended (js/engine/monthly.js), said as the Coach page's card says it:
   the facts, then each change with its one tap. */
function aMonth(a){
  var r=monthlyNow(lastMonth(today()));
  if(!r){p(a,t("Not enough was logged last month to review it yet. A few workouts and weigh-ins, and the next one has something to read."));return act(a,t("Open Progress"),{"data-tab":"progress"});}
  l(a,moFacts(r));
  var did=S.moDid&&S.moDid.m===r.month?S.moDid.k||[]:[],ch=r.changes.filter(function(x){return did.indexOf(x.kind)<0;});
  if(!ch.length){p(a,t("A good month: nothing to change. Keep going as you are."));return a;}
  ch.forEach(function(x){var c=moChange(x);p(a,c.text);act(a,c.btn,{"data-modo":x.kind});});
  return a;}

/* ---- why a lift is stuck ---------------------------------------------------------------
   The lift named (else one the log says has stalled, else the first big lift), read from
   six weeks of the log: how often, how its estimated max moved, how hard the sets were,
   its muscle's weekly sets against the growth range (for a size goal), sleep, and a
   deficit. Each reason only where the log has the data; then the one change to make. */
/* How the weight box is read (owner, 27 Oct): what the number means for each kind of
   lift, and what volume counts, from the same rules the logger and the maths use
   (session.js wKey, lifts.js loadIn and setVolIn), with the person's dumbbell setting. */
function aLoadLog(a){
  var tot=dbTotal();
  p(a,t(tot?"A barbell is logged as the total, bar included. Dumbbells are logged as both together: that's your setting."
    :"A barbell is logged as the total, bar included. Dumbbells are logged per hand, the weight of one: that's your setting."));
  l(a,[t("Barbell: the total on the bar, the bar included. The plates sheet works out each side from it."),
    t("One arm or one leg at a time: one side. The reps of one side, and with dumbbells the one in your hand."),
    t("Machines and cables: the number on the stack."),
    t("Body-weight exercises: only what you add, like a belt or a vest. Your body weight is counted for you.")]);
  p(a,t(tot?"Volume is weight × reps for every set, added up, warm-ups left out. It counts the bar, and both dumbbells as you log them."
    :"Volume is weight × reps for every set, added up, warm-ups left out. It counts the bar, and both dumbbells: logged per hand, a pair counts twice."));
  n(a,t("You can switch dumbbells between per hand and both together in Settings → Training. What you've already logged is converted to match."));
  return act(a,t("Dumbbell setting"),{"data-sheet":"set_training"});}
/* An InBody result, read (owner, 27 Oct; js/engine/inbody.js): the latest test, against
   the textbook's body-fat ranges (11.4, varying with age), what changed since the test
   before, and what that says about the goal. The device's BMR is shown, never used: the
   targets keep one method for everyone. */
function aInBody(a){
  var tests=(S.body||[]).filter(function(b){return b.src==="inbody"&&(b.bf||b.smm||b.weight);});
  if(!tests.length){
    p(a,t("Add your InBody sheet and I'll read it with the rest of your log: body fat, muscle, and how they change from one test to the next."));
    return act(a,t("Add an InBody result"),{"data-sheet":"inbody"});}
  var c=tests[tests.length-1],pv=tests.length>1?tests[tests.length-2]:null,sex=(S.profile||{}).sex,goal=(S.profile||{}).goal;
  /* Figures kept whole in a right-to-left line: a sign stays before its number. */
  var iso=function(x){return "\u2066"+x+"\u2069";};
  var bits=[];
  if(c.bf)bits.push(fill(t("body fat {n}%"),{n:iso(c.bf)}));
  if(c.smm)bits.push(fill(t("skeletal muscle {w}"),{w:iso(fmtW(c.smm))}));
  if(c.weight)bits.push(fill(t("weight {w}"),{w:iso(fmtW(c.weight))}));
  p(a,fill(t("Your InBody from {d}: {list}."),{d:shortd(c.date),list:list(bits)}));
  var band=fatBand(c.bf,sex),R=FAT_RANGE[sex];
  if(band)p(a,fill(t(band==="over"?"That's above the usual range for most {who} ({lo}–{hi}%). It varies with age."
    :band==="under"?"That's under the usual range for most {who} ({lo}–{hi}%).":"That's within the usual range for most {who} ({lo}–{hi}%)."),
    {who:t(sex==="f"?"women":"men"),lo:iso(R[0]),hi:iso(R[1])}));
  if(pv){var fk=function(e){return e.fatkg!=null?e.fatkg:(e.bf&&e.weight?e.weight*e.bf/100:null);},ch=[];
    var f0=fk(pv),f1=fk(c);if(f0!=null&&f1!=null)ch.push(fill(t("fat {d}"),{d:iso((f1-f0>=0?"+":"−")+fmtW(Math.abs(Math.round((f1-f0)*10)/10)))}));
    if(pv.smm&&c.smm)ch.push(fill(t("skeletal muscle {d}"),{d:iso((c.smm-pv.smm>=0?"+":"−")+fmtW(Math.abs(Math.round((c.smm-pv.smm)*10)/10)))}));
    if(ch.length)p(a,fill(t("Since your test on {d}: {list}."),{d:shortd(pv.date),list:list(ch)}));}
  if(band==="over"&&goal!=="lose"){p(a,t("With body fat above that range, losing fat first is the better direction. Change the goal and both plans are rebuilt."));
    act(a,t("Change my goal"),{"data-chatq":"goal"});}
  else if(band&&band!=="over"&&goal==="lose"){p(a,t("You're within that range already. Building muscle may suit you better than losing more."));
    act(a,t("Change my goal"),{"data-chatq":"goal"});}
  if(c.ibmr){var mine=bmr();n(a,fill(t(mine?"Its BMR, {i} kcal, is the device's own estimate. Your targets use Mifflin-St Jeor ({m} kcal), the same method for everyone.":"Its BMR, {i} kcal, is the device's own estimate. Your targets use Mifflin-St Jeor, the same method for everyone."),{i:fmtN(c.ibmr),m:fmtN(Math.round(mine||0))}));}
  n(a,t("Bioimpedance reads body water: compare tests taken at the same time of day, before eating or training."));
  return act(a,t("Add an InBody result"),{"data-sheet":"inbody"});}
/* Two sessions in one day (owner, 28 Oct): the two ways the app has, each a tap away. */
function aTwice(a){
  p(a,t("Yes, two ways."));
  p(a,t("Today only: on Training, tap Add another session today and pick what to train. Today's planned session stays on today too."));
  p(a,t("Every week: in your program, set the schedule By weekday and give two days the same weekday. Both are trained that day, the upper one first."));
  if(!S.active)act(a,t("Add another session today"),{"data-another":"1"});
  var sp=split();if(sp)act(a,t("Set it in my program"),{"data-editsplit":sp.id});
  return a;}
/* Whether the warm-up is made for the session (owner, 28 Oct): it is, from its lifts
   (js/engine/warmup.js), so the answer says how and shows the one for the next
   session to train, rather than offering to set up something that already happens. */
function aWarmPlan(a){
  p(a,t("Yes: each session gets its own warm-up, built from its lifts."));
  p(a,t("It warms up the movements the session makes: a pressing day the shoulders and chest, a pulling day the upper back, a leg day the hips, knees and ankles. Then a few lighter sets lead up to the first heavy lift."));
  p(a,t("At the end, a static stretch for each muscle the session worked, held 30 seconds."));
  var sp=split(),pl=sp?planOn(sp,today()):null,d=null;
  if(S.active)d={name:S.active.dayName,ex:S.active.entries};
  else if(pl&&pl.day&&!pl.rest)d=pl.day;
  else if(sp)d=nextDayOf(sp);
  var lifts=d&&(d.ex||[]).filter(function(e){return !isActivity(e.name);});
  /* The squat check's corrective work comes first, as the workout's warm-up has it. */
  var fx=((S.profile||{}).faults||[]).length?correctiveFor(S.profile.faults,{avoid:function(nm){return avoids(nm,limitsOf(S.profile));}}):null;
  var w=lifts&&lifts.length?warmupFor(lifts,{gear:S.gear||null,fix:fx}):null,c=w?cooldownFor(lifts,{}):null;
  if(w&&(w.fix||[]).length){p(a,t("For your squat check first:"));l(a,w.fix.map(function(x){return exName(x.name);}));}
  if(w&&w.drills.length){
    p(a,fill(t("For {d}:"),{d:planName(d.name||"")}));
    l(a,w.drills.map(function(x){return exName(x.name);}));
    if(c)n(a,t("Stretches after:")+" "+list(c.stretches.map(function(x){return exName(x.name);})));}
  n(a,t("It shows before the first exercise; the workout's ⋯ menu brings it back. Both can be switched off in Workout settings."));
  return a;}
/* The answer bank (js/data/faq.js, matched by js/engine/faq.js): a written answer,
   in the conversation's language, with this person's own figures where it has a place
   for them, and its buttons. */
function faqSlots(){
  var g=S.goals||{},kg=lastWeight()||num(S.profile&&S.profile.weight)||0,o={};
  if(num(g.kcal))o.kcal=fmtN(num(g.kcal));
  /* Only a fat-loss goal's target is a deficit: "already set this way" says so only then. */
  if(num(g.kcal)&&S.profile&&S.profile.goal==="lose")o.kcalLose=o.kcal;
  if(num(g.p))o.p=num(g.p);
  if(num(g.c))o.c=num(g.c);
  if(num(g.f))o.f=num(g.f);
  if(num(g.water))o.water=r1(num(g.water)/1000);
  if(kg){o.kg=fmtW(kg);if(num(g.p))o.pkg=r1(num(g.p)/kg);}
  return o;}
/* The person's own side of a written answer, where its entry asks for it ({mine:1}):
   worked out from the log and the profile, never a figure of the answer's own. Each
   returns nothing when there is nothing of theirs to say. */
var FAQMINE={
  /* Today's training, in the sentence Food and the Today card say (js/engine/head.js
     todayPlan().food, WP-5): the session still to come at the person's usual time, or the
     protein left after one done today. Nothing to say: nothing added. */
  "pre-workout":function(a){
    var tp=todayPlan(),f=tp.food;if(!f)return;
    var d=new Date(),m=d.getHours()*60+d.getMinutes(),n=f.notes.filter(function(x){return x.kind==="before";})[0];
    if(!n&&f.usual!=null&&f.usualN>=MINTIMED&&m<f.usual&&/^(train|light)$/.test(tp.state))n=beforeNote(f.usual);
    if(n)p(a,fuelLine(n));},
  "post-workout":function(a){
    var tp=todayPlan(),f=tp.food;if(!f)return;
    var n=f.notes.filter(function(x){return x.kind==="after";})[0];
    if(!n&&tp.state==="done"&&f.pLeft!=null)n=afterNote(null,f.pLeft);
    if(n)p(a,fuelLine(n));},
  /* Sleep and food over the last week, from the log (as aTired read them). */
  "tired-always":function(a){
    var nights=lastNights(),days=[],g=S.goals||{},ev=[];
    for(var i=1;i<=7;i++){var k=kcalOn(addDaysW(today(),-i));if(k>0)days.push(k);}
    if(nights.length)ev.push(fill(t("You logged {h} hours a night on average over your last {n} nights."),{h:r1(nights.reduce(function(x,y){return x+y;},0)/nights.length),n:nights.length}));
    if(days.length&&num(g.kcal))ev.push(fill(t("Food logged on {n} of the last 7 days: about {k} kcal a day, against a target of {t}."),{n:days.length,k:fmtN(Math.round(days.reduce(function(x,y){return x+y;},0)/days.length)),t:fmtN(g.kcal)}));
    if(ev.length)l(a,ev);else p(a,t("Your log has no sleep or food for the last week, so I can't see a cause in it."));},
  /* What is left of today, from today's log and the targets; another day, the targets. */
  "event-eating":function(a,q,it){
    var g=S.goals||{},R=rd(it),dy=R&&R.entities&&R.entities.day;
    if(!num(g.kcal))return;
    if(dy&&dy.when!=="today"){p(a,fill(t("Your day's targets: {k} kcal and {p} g of protein."),{k:fmtN(g.kcal),p:num(g.p)}));return;}
    var e=eatenToday(today()),kl=Math.round(num(g.kcal)-e.kcal),pl=Math.round(num(g.p)-e.p);
    if(!e.kcal)p(a,fill(t("Nothing logged yet today. Your day is {k} kcal and {p} g of protein."),{k:fmtN(g.kcal),p:num(g.p)}));
    else if(kl>=0)p(a,fill(t("So far {e} of {k} kcal and {pe} of {p} g protein. Left: {kl} kcal and {pl} g protein."),
      {e:fmtN(e.kcal),k:fmtN(g.kcal),pe:Math.round(e.p),p:num(g.p),kl:fmtN(kl),pl:Math.max(0,pl)}));
    else p(a,fill(t("You're {n} kcal over today already. Nothing to make up: tomorrow is a normal day."),{n:fmtN(-kl)}));},
  /* The rate asked, from the numbers said and the person's weight, against the app's
     band for losing (js/engine/body.js RATE: 0.5–1% of body weight a week). */
  "loss-rate":function(a,q,it){
    var bw=lastWeight()||num(S.profile&&S.profile.weight),r=it&&it.rate||null,u=" "+wUnit();
    var lo=bw*0.005,hi=bw*0.01,band=toDisp(lo)+"–"+toDisp(hi)+u;
    if(r&&r.kg>0&&r.weeks>0){
      var wk=r.kg/r.weeks,one=r.weeks===1,said=one?fill(t("That's {wk} a week."),{wk:fmtW(wk)}):fill(t("{kg} in {w} weeks is about {wk} a week."),{kg:fmtW(r.kg),w:r1(r.weeks),wk:fmtW(wk)});
      if(!bw){p(a,said+" "+t("With your weight logged, I can say whether that pace fits: the app's range is 0.5–1% of body weight a week."));
        act(a,t("Log weight"),{"data-sheet":"weigh"});}
      else if(wk>hi*1.02&&one)p(a,said+" "+fill(t("That's faster than the safe range at your weight ({bw}): {band} a week."),{bw:fmtW(bw),band:band}));
      else if(wk>hi*1.02)p(a,said+" "+fill(t("That's faster than the safe range at your weight ({bw}): {band} a week. At a safe pace, {kg} takes about {a} to {b} weeks."),
        {bw:fmtW(bw),band:band,kg:fmtW(r.kg),a:Math.ceil(r.kg/hi),b:Math.ceil(r.kg/lo)}));
      else if(wk<lo*0.98)p(a,said+" "+fill(t("That's slower than the app's range at your weight ({band} a week), so it is safe."),{band:band}));
      else p(a,said+" "+fill(t("That fits the safe range at your weight ({bw}): {band} a week."),{bw:fmtW(bw),band:band}));}
    else if(bw)p(a,fill(t("At your weight, {bw}, a safe pace is about {band} a week."),{bw:fmtW(bw),band:band}));
    else{p(a,t("With your weight logged, I can say whether that pace fits: the app's range is 0.5–1% of body weight a week."));act(a,t("Log weight"),{"data-sheet":"weigh"});}
    var goal=S.profile&&S.profile.goal,g=S.goals||{};
    if(goal==="lose"&&num(g.kcal))n(a,fill(t("Your target, {kcal} kcal a day, is already set to that deficit."),{kcal:fmtN(g.kcal)}));
    else if(goal&&goal!=="lose"){n(a,fill(t("Your goal is set to {g}, so your calorie target is not a deficit yet."),{g:t(goalOf(goal).label).toLowerCase()}));
      act(a,t("Change my goal to fat loss"),{"data-chatsay":uiLang()==="ar"?"غير هدفي لحرق الدهون":"change my goal to fat loss"});}}};
function aFaq(a,q,it){
  var f=it.faq,sl=faqSlots();
  /* The figures it may hold: its entry's own, from the English it was written and
     checked in, and those worked out for this person (slots and FAQMINE). */
  var ok=[],add=function(s){ok=ok.concat(guardNums(s));},b0;
  f.a.forEach(function(x){
    if(x.p&&!x.if)add(x.p);if(x.n)add(x.n);if(x.l)x.l.forEach(add);});
  f.a.forEach(function(x){
    if(x.mine){b0=a.b.length;if(FAQMINE[f.id])FAQMINE[f.id](a,q,it);
      a.b.slice(b0).forEach(function(y){add(y.p||y.n||"");(y.l||[]).forEach(add);});}
    else if(x.if){if(sl[x.if]!=null){p(a,fill(t(x.p),sl));add(fill(x.p,sl));}}
    else if(x.p)p(a,t(x.p));
    else if(x.l)l(a,x.l.map(function(y){return t(y);}));
    else if(x.n)n(a,t(x.n));});
  f.acts.forEach(function(b){act(a,t(b[0]),b[1]["data-chatq"]?Object.assign({"data-chatl":uiLang()},b[1]):b[1]);});
  a.src=f.src.slice();a.allowed=ok;
  return a;}
function aPlateau(a,q){
  var named=namedExercises(q),name=named.length?named[0].name:null,lifts=[];
  split().days.forEach(function(d){d.ex.forEach(function(e){if(!isActivity(e.name)&&lifts.indexOf(e.name)<0)lifts.push(e.name);});});
  if(!name)name=lifts.filter(function(n){return plateauOf(n);})[0]||lifts[0];
  if(!name){p(a,t("Your program has no lifts yet, so there's nothing to read."));return act(a,t("Plan my training"),{"data-csec":"train","data-ctsub":"program"});}
  var nm=exName(name),since=addDaysW(today(),-42),ss=(S.sessions||[]).filter(function(s){return s.date>=since&&(s.entries||[]).some(function(e){return e.name===name;});})
    .sort(function(x,y){return x.date<y.date?-1:x.date>y.date?1:0;});
  if(ss.length<3){p(a,fill(t("Only {n} sessions of {ex} in the last six weeks: too few to call it stuck. Train it twice a week for three weeks, then ask me again."),{n:ss.length,ex:nm}));return a;}
  var best=function(s){var e=s.entries.filter(function(x){return x.name===name;})[0];return e?bestE1RM(e.sets||[],name,s.date):0;};
  var b0=best(ss[0]),b1=Math.max(best(ss[ss.length-1]),best(ss[ss.length-2]));
  if(b0&&b1)p(a,fill(t("{ex}, the last six weeks: {n} sessions, estimated max {a} → {b}."),{ex:nm,n:ss.length,a:fmtW(b0),b:fmtW(b1)}));
  var why=[],fix="";
  var perWk=ss.length/6;
  if(perWk<1.5){why.push(t("You train it about once a week. Twice is the most reliable way to keep a lift moving."));fix=fix||"freq";}
  var rp=[];ss.forEach(function(s){s.entries.forEach(function(e){if(e.name===name)(e.sets||[]).forEach(function(x){if(!x.wu&&x.rpe)rp.push(+x.rpe);});});});
  if(rp.length>=6){var ar=Math.round(rp.reduce(function(x,y){return x+y;},0)/rp.length*10)/10;
    if(ar>=9.3){why.push(fill(t("Your sets average RPE {r}: close to failure every time, more than recovery keeps up with."),{r:ar}));fix=fix||"deload";}
    else if(ar<=7){why.push(fill(t("Your sets average RPE {r}: there's room left in them."),{r:ar}));fix=fix||"push";}}
  var mus=muscleOf(name),ws=weeklySets(split()),Lm=LANDMARKS[mus];
  if(rangeFor(S.profile.level,goalOf(S.profile.goal).train)&&Lm&&num(ws[mus])<Lm.mav[0]){
    why.push(fill(t("Your program gives {m} {n} sets a week, under the range for growth ({lo}–{hi})."),{m:tm(mus).toLowerCase(),n:Math.round(num(ws[mus])),lo:Lm.mav[0],hi:Lm.mav[1]}));fix=fix||"volume";}
  var sl=[];for(var i=0;i<14;i++){var r=S.days&&S.days[addDaysW(today(),-i)];if(r&&num(r.sleep)>0)sl.push(num(r.sleep));}
  if(sl.length>=4){var as=Math.round(sl.reduce(function(x,y){return x+y;},0)/sl.length*10)/10;
    if(as<7){why.push(fill(t("You've logged {h} hours of sleep a night on average: under seven slows strength."),{h:as}));fix=fix||"sleep";}}
  if(S.profile.goal==="lose")why.push(t("You're eating below maintenance to lose fat: strength usually holds rather than climbs, and that's fine."));
  if(!why.length){why.push(t("Nothing in your log stands out: how often, how hard and how much all look right."));fix="reps";}
  l(a,why);
  var FIX={freq:fill(t("The one change: put {ex} on a second day of the week."),{ex:nm}),
    deload:t("The one change: a lighter week, then build back up."),
    push:t("The one change: add weight when you reach the top of the rep range, even if it feels early."),
    volume:fill(t("The one change: one more set of {ex} each time."),{ex:nm}),
    sleep:t("The one change: seven to nine hours of sleep. Nothing in the gym makes up for it."),
    reps:fill(t("The one change: four weeks of {ex} in a lower range (4–6 reps) with more weight, then back."),{ex:nm})};
  p(a,FIX[fix]||FIX.reps);
  if(fix==="deload"&&!inDeload())act(a,t("Start a lighter week"),{"data-deload":"start"});
  return a;}

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
  var e=eatenToday(today());
  /* Per kg needs a weight; without one, the target is all there is to say. */
  if(!w){p(a,fill(t("Your target is {p} g a day. Log your weight and I can say what that is per kg of body weight, and what your goal calls for."),{p:g.p}));
    return act(a,t("Log weight"),{"data-sheet":"weigh"});}
  var kp=KB.protein();
  p(a,fill(t("Your target is {p} g a day: {k} g per kg of body weight."),{p:g.p,k:r1(num(g.p)/w)})
    +(kp?" "+fill(t("For people who train to build and keep muscle, the range is {lo} to {hi} g per kg."),{lo:kp.min,hi:kp.max}):""));
  if(kp)src(a,kp.src);
  p(a,fill(t("For {g} the app sets {x} g per kg."),{g:t(G.label),x:G.protein})
    +(mt&&Math.abs(num(g.p)-mt.p)>mt.p*0.1?" "+fill(t("Your target was changed from the suggested {s} g."),{s:mt.p}):""));
  var nm=Math.max(3,mealSlots().length);
  p(a,fill(t("Spread over {n} meals, that's about {q} g each: a palm or two of chicken, fish, meat, eggs, Greek yogurt or beans."),{n:nm,q:Math.round(num(g.p)/nm)}));
  var nu=nutrition(7),hit=nu.days.filter(function(x){return num(x.p)>=num(g.p)*0.9;}).length;
  if(nu.count)n(a,fill(t("This week: reached on {h} of the {n} days you logged. Today so far: {e} g."),{h:hit,n:nu.count,e:Math.round(e.p)}));
  return act(a,t("Targets"),{"data-csec":"food","data-cfsub":"targets"});}

function aCalories(a){
  var pr=S.profile,G=goalOf(pr.goal),g=S.goals||{},why=energyMissing();
  if(why==="no_profile"){p(a,t("I need your age and height to work out your calories. The assessment asks for both."));
    return act(a,t("Start the assessment"),{"data-setup":"1"});}
  /* No weight is not guessed: every figure below rests on it. */
  if(why==="no_weight"){p(a,t("I need your weight to work out your calories, and I won't guess it. Log it and ask me again."));
    return act(a,t("Log weight"),{"data-sheet":"weigh"});}
  var b=bmr(),td=tdee(),tk=Math.round(targetKcal()/10)*10;
  p(a,fill(t("At rest your body uses about {b} kcal a day, from your age, height, weight and sex (the Mifflin–St Jeor formula)."),{b:fmtN(b)}));
  var use=maintenanceInUse();
  if(use.source==="learned")p(a,fill(t("By formula, maintaining your weight would take about {f} kcal. Your targets are built on what your own log measured instead: {t} kcal."),{f:fmtN(tdeeFormula()),t:fmtN(td)}));
  else p(a,fill(t("With your activity, maintaining your weight takes about {t} kcal."),{t:fmtN(td)}));
  var pct=Math.round(Math.abs(G.kcal)*100);
  p(a,G.fixed!=null?fill(t(G.fixed<0?"{g} takes {d} kcal a day below that: {k} kcal.":"{g} adds {d} kcal a day to that: {k} kcal."),
      {g:t(G.label),d:fmtN(Math.abs(G.fixed)),k:fmtN(tk)})
    :G.kcal?fill(t(G.kcal<0?"{g} takes {p}% below that, capped at {c} kcal: {k} kcal.":"{g} adds {p}% to that, capped at {c} kcal: {k} kcal."),
      {g:t(G.label),p:pct,c:G.cap||"—",k:fmtN(tk)})
    :fill(t("{g} eats at maintenance: {k} kcal."),{g:t(G.label),k:fmtN(tk)}));
  /* The floor held it up: say so, rather than let the sum look wrong. */
  if(targetKcal()<=kcalFloor())n(a,fill(t("That is as low as Bunyan sets a target: your resting energy of {b} kcal, and never under 1,200 kcal for women or 1,500 for men."),{b:fmtN(b)}));
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
function aSore(a,q){
  var fq=fold(q),pain=PAIN.test(fq),ar=areaOf(fq);
  /* Pain is logged, and assessed by a professional: never advice from here
     (js/knowledge/scope.js). */
  if(pain)return aScope(a,q);
  p(a,t("Soreness a day or two after training is normal. It doesn't mean the workout was good or bad, and the warm-up usually eases it."));
  var fat=coachNow().filter(function(c){return /^(fatigue|falling|stall)$/.test(c.kind);})[0];
  if(inDeload())p(a,fill(t("You're in a lighter week until {d}. Keep the sets easy and sleep well."),{d:S.deload.until}));
  else if(fat){var w=words(fat);
    p(a,t("Your log also shows it:")+" "+w[0]+". "+w[1]);
    act(a,w[2],{"data-cofix":fat.id});}
  else if(deloadDue()){p(a,t("It has been a long run of hard weeks. A lighter week now would let your body catch up."));act(a,t("Start a lighter week"),{"data-deload":"start"});}
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
    p(a,m?fill(t("Switching to {g} would set your day to about {k} kcal and {p} g of protein. Your training stays as it is; the plan check tells you if it no longer suits."),
      {g:t(W.label),k:fmtN(m.kcal),p:m.p})
      :fill(t("Switching to {g} changes your targets too, and they need your weight, which I won't guess. Your training stays as it is."),{g:t(W.label)}));
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
  /* Done here, not by going to Food: the glass the Food page adds. */
  return act(a,t("Add a glass"),{"data-water":"250","data-wdate":today()});}

function aSteps(a){
  var g=S.goals||{},r=S.days[today()]||{},c=weeklyCardio();
  p(a,fill(t("Steps today: {s} of {g}."),{s:fmtN(r.steps||0),g:fmtN(g.steps||0)}));
  p(a,fill(t("Cardio this week: {m} of the {t} minutes of moderate activity health guidelines suggest."),{m:c.min,t:c.target}));
  p(a,t("Walking is the easiest way to move more without cutting into recovery. A 10-minute walk after meals adds up."));
  return act(a,t("Log steps"),{"data-sheet":"steps"});}

function aHelp(a){
  p(a,t("I answer from your own log, plan and targets, worked out on this phone. Nothing you type leaves it."));
  p(a,t("Ask about today's workout, what to lift, what to eat, your weight, protein and calories, soreness, missing a day or having little time, your program's balance, your strength, your goal, or a new plan."));
  p(a,t("Ask anything about training, food, sleep, cardio, mobility or habits, too."));
  l(a,[t("Tell me to do things: “open my meal plan”, “add a glass of water”, “log 8000 steps”, “start my workout”, “skip rest”, “80 kg for 8”."),
    t("Change things: “raise my calories by 200”, “change my goal to build muscle”, “switch to pounds”, “dark mode”, “switch to Arabic”."),
    t("And your program and food: “add squats to leg day”, “swap bench press for push-ups”, “I ate 200 g of chicken”, “I weigh 82 kg”.")]);
  return a;}
function aHello(a,q){
  var nm=(S.profile.name||"").trim(),how=/(how are you|how r u|how s it going|how is it going|what s up|whats up|عامل ايه|اخبارك|ايه الاخبار|ازيك)/.test(fold(q||""));
  return p(a,(how?t("Good, thanks.")+" ":"")+(nm&&nm!=="Me"?fill(t("Hi {n}."),{n:nm}):t("Hi."))+" "+t("Ask me about today's training, your food, or how things are going."));}
function aThanks(a){return p(a,t("Any time."));}
/* Nothing reads the message (C-4): no passage of the knowledge base is shown as if it
   were an answer. It says it is not sure, and offers the two or three nearest things
   it can do: the closest written answers (js/engine/faq.js rank), the area the
   knowledge search finds the words in (js/engine/kbsearch.js), then the usual ones. */
var AREAASK={food:"eat",train:"weights",cardio:"steps",body:"weight",habits:"track",mobility:"sore",health:"track"};
function nearOf(q,it){
  var out=[],seen={},ar=uiLang()==="ar";
  if(q){var rk=[];try{rk=faqRank(q);}catch(e){rk=[];}
    rk.filter(function(x){return x.score>=0.3;}).slice(0,2).forEach(function(x){
      var ex=x.f.ex.filter(function(e){return /[\u0600-\u06FF]/.test(e)===ar;})[0]||x.f.ex[0];
      if(ex&&!seen["f:"+x.f.id]){seen["f:"+x.f.id]=1;out.push({l:t(x.f.title),say:ex});}});
    var kn=it&&it.near||null;if(!kn){try{kn=lookup(q);}catch(e){kn=null;}}
    var aid=kn&&AREAASK[kn.area];if(aid&&!seen[aid]){seen[aid]=1;out.push({id:aid});}}
  ["help","today","eat"].forEach(function(id){if(out.length<3&&!seen[id]){seen[id]=1;out.push({id:id});}});
  return out.slice(0,3);}
function aUnknown(a,q,it){
  p(a,t("I'm not sure what you mean, so I won't guess.")+" "+t("The nearest things I can do:"));
  nearOf(q,it).forEach(function(x){
    if(x.id)act(a,t(ASK[x.id]),{"data-chatq":x.id,"data-chatl":uiLang()});else act(a,x.l,{"data-chatsay":x.say});});
  return a;}

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
/* A food's Arabic alias (foodName, js/engine/nutrition.js, is the name shown). */
function arName(f){var a=(f&&f.a||[]).filter(function(x){return /[\u0600-\u06FF]/.test(x);})[0];return a||"";}
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
    /* Like for like first: a food from the same aisle (rice for rice, not cornflakes;
       a vegetable for a salad, not pasta) beats a closer macro match from another. */
    if(f.cat&&x.cat!==f.cat)d+=0.18;
    return {f:x,g:g,n:nn,d:d};})
    .filter(function(x){return x.g>=20&&x.g<=600&&x.d<=0.45;})
    .sort(function(x,y){return x.d-y.d;});
  /* Three different foods: none shares a naming word with one already picked. */
  var out=[],used=[];
  for(var i=0;i<ranked.length&&out.length<3;i++){
    var kw=keyWords(ranked[i].f.n);if(!kw.length)kw=[fold(ranked[i].f.n)];
    /* "Cornflakes" and "Corn Flakes" are one food: the name without its spaces counts too. */
    kw=kw.concat([fold(ranked[i].f.n).replace(/[^a-z]/g,"")]);
    if(kw.some(function(w){return used.indexOf(w)>=0;}))continue;
    used=used.concat(kw);out.push(ranked[i]);}
  return out;}
/* A food turned down ("I don't feel like eating egg"): nothing of that food among its
   stand-ins (no egg whites for eggs). */
function notSame(sw,f){var w=fold(f.n||"").split(" ")[0].replace(/s$/,"");return w.length<3?sw:sw.filter(function(x){return fold(x.f.n||"").indexOf(w)<0;});}
function swapLine(it,f,kcal,declined){
  var sw=swapsFor(f,kcal);if(declined)sw=notSame(sw,f);
  if(!sw.length)return null;
  return (it?itemName(it):foodName(f))+(it&&it.grams?" "+fill(t("{n} g"),{n:Math.round(it.grams)}):"")+" → "
    +sw.map(function(x){return foodName(x.f)+" "+fill(t("{n} g"),{n:x.g});}).join(" · ");}

/* One item of a planned meal the question names, spelt as people type it ("the talibia
   grill in my lunch"): the meal it says, or every planned meal, item by item, a word
   of the item's name within a letter or two of a word of the question. */
function planItemNamed(q){
  /* Three letters count where they start a planned food's name ("egg", "بيض"). */
  var fq=fold(q),qw=foodWords(q).split(" ").filter(function(w){return w.length>=3;});
  if(!qw.length)return null;
  var slots=mealSlots().filter(function(x){return (x.plan||[]).length;}),named=null;
  for(var i=0;i<MEALWORD.length;i++)if(MEALWORD[i][1].test(fq)){named=MEALWORD[i][0];break;}
  if(named)slots=slots.filter(function(x){return x.id===named;}).concat(slots.filter(function(x){return x.id!==named;}));
  var best=null;
  slots.forEach(function(m){(m.plan||[]).forEach(function(it,i){
    var nw=fold(itemName(it)+" "+(it.n||"")).replace(/[^a-z\u0600-\u06ff ]/g," ").split(" ").filter(function(w){return w.length>=3;});
    var hits=qw.filter(function(w){return nw.some(function(x){return x===w||(w.length>=5&&editDist(w,x)<=2)||x.indexOf(w)===0||(x.length>=4&&w.indexOf(x)===0);});}).length;
    if(hits&&(!best||hits>best.hits||(hits===best.hits&&m.id===named&&best.m.id!==named)))best={m:m,i:i,it:it,hits:hits};});});
  return best;}
function aSwap(a,q){
  /* One item of a planned meal: three foods that fit its place, each a tap away from
     going into the plan instead (js/ui/agent.js swapPick, with a confirmation). */
  var pi=null,no=FOODNO.test(fold(q||""));try{pi=planItemNamed(q);}catch(e){pi=null;}
  if(pi){var pf=foodOf(pi.it),sw=pf?swapsFor(pf,num(pi.it.kcal)):[];if(no&&pf)sw=notSame(sw,pf);
    if(sw.length){a.ag=swapPick(pi.m.id,pi.i,pi.it,itemName(pi.it),sw.map(function(x){
      return {v:x.f.id+"|"+x.g,l:foodName(x.f)+" "+fill(t("{n} g"),{n:x.g}),
        sub:fill(t("{k} kcal · {p} g protein · {c} g carbs · {f} g fat"),{k:fmtN(x.n.kcal),p:Math.round(x.n.p),c:Math.round(x.n.c),f:Math.round(x.n.f)})};}));
      return a;}}
  /* Named by its name, not a near miss: "dinner" is the meal, not ginger, and "lunch"
     is the meal, not luncheon meat (the meal's words are taken out first). */
  var qf=fold(q);MEALWORD.forEach(function(m){qf=qf.replace(new RegExp(m[1].source,"g")," ");});
  var nf=namedFood(qf,true);
  /* A food named: what stands in for it, a usual portion's worth. */
  if(nf){
    var meal=planMeal(""),inPlan=meal&&meal.plan.filter(function(it){var f=foodOf(it);return f&&f.id===nf.id;})[0];
    var kc=inPlan?num(inPlan.kcal):nutritionFor(nf,(nf.s&&nf.s[0]&&nf.s[0][1])||100).kcal;
    var ln=swapLine(inPlan||null,nf,kc,no);
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
  n(a,t("Swap one item or all of them; the meal still adds up to about the same.")+" "+t("Say which, like “swap the rice in my lunch”, and I'll put it in your plan."));
  return act(a,t("Open Food"),{"data-tab":"food"});}

function aFoodInfo(a,q,it){
  var f=namedFood(q,true);
  /* Misspelt: the closest foods the database has, to pick from; never one chosen
     quietly for the person. */
  var fw=foodWords(q),near=!f&&fw.length>=3?fuzzyFoods(fw,4).filter(function(x){return x.dist<=2;}):[];
  if(near.length){a.ag={s:"pick",what:"food",lead:fill(t("No food called “{q}”. Closest:"),{q:fw}),act:"food.info",slot:"fid",none:true,
      opts:near.map(function(x){return {v:x.f.id,l:foodName(x.f),sub:""};})};return a;}
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

/* ---- how training works: the knowledge files, beside the person's own program -------
   Every one of these reads its numbers from js/knowledge/ (js/engine/kb.js) and says
   which entry they came from; the other half of the answer is the person's own program
   or log. What the knowledge files do not cover is not answered here. */
function goalWord(ad){return t(ad==="maximal_strength"?"getting stronger":"building muscle");}
/* The most common value of f across the program's lifts. */
function mode(xs,f){var c={},best=null,bn=0;xs.forEach(function(x){var k=f(x);if(k==null)return;c[k]=(c[k]||0)+1;if(c[k]>bn){bn=c[k];best=k;}});return best;}
function range(r){return r.min===r.max?String(r.min):r.min+"–"+r.max;}
function secs(s){return s>=60&&s%60===0?fill(t("{n} min"),{n:s/60}):s>=60?fill(t("{n} min"),{n:r1(s/60)}):fill(t("{n} s"),{n:s});}
function versus(v,r){return v<r.min?t("below it"):v>r.max?t("above it"):t("inside it");}
function aKReps(a){
  var k=KB.prescription(S.profile.goal),L=lifts();
  p(a,fill(t("For {g}, the range is {r} reps a set."),{g:goalWord(k.adaptation),r:range(k.reps)})
    +(L.length?" "+fill(t("Your program has most lifts at {r}, {v}."),{r:mode(L,function(e){return e.timed?null:(e.lo===e.hi?e.lo:e.lo+"–"+e.hi);})||"—",
      v:versus(num(mode(L,function(e){return e.timed?null:e.hi;})),k.reps)}):""));
  if(k.reps.note)n(a,t("Higher reps also work when the sets are hard."));
  return src(a,k.src);}
function aKSets(a){
  var k=KB.prescription(S.profile.goal),L=lifts(),avg=L.length?r1(L.reduce(function(x,e){return x+num(e.sets);},0)/L.length):0;
  p(a,fill(t("For {g}, the range is {r} sets an exercise."),{g:goalWord(k.adaptation),r:range(k.sets)})
    +(L.length?" "+fill(t("Your program averages {n}, {v}."),{n:avg,v:versus(avg,k.sets)}):""));
  return src(a,k.src);}
function aKRest(a){
  var k=KB.prescription(S.profile.goal),L=lifts(),r=mode(L,function(e){return num(e.rest)||null;});
  var span=k.rest.min?secs(k.rest.min)+"–"+secs(k.rest.max):fill(t("up to {n}"),{n:secs(k.rest.max)});
  p(a,fill(t("For {g}, rest {r} between sets."),{g:goalWord(k.adaptation),r:span})
    +(r?" "+fill(t("Your program rests {n} on most lifts, {v}."),{n:secs(r),v:versus(r,k.rest)}):""));
  if(k.adaptation==="maximal_strength")n(a,t("Three to five minutes suits the big multi-joint lifts best."));
  return src(a,k.src);}
function aKFreq(a){
  var f=KB.frequency(S.profile.level),sp=split(),days=sp.days.filter(function(d){return d.ex.length;}).length;
  p(a,(f.per.min!=null?fill(t("At your level, {per} sessions a week."),{per:range(f.per)})
    :fill(t("At your level, {a} sessions a week full-body, or {b} on a split."),{a:f.per.totalBody,b:f.per.split}))+(days?" "+fill(t(days===1?"Your program has 1 training day.":"Your program has {n} training days."),{n:days}):""));
  n(a,t("Leave at least a day between sessions that work the same muscles."));
  return src(a,f.src);}
function aKVolume(a,q){
  var fq=fold(q),m=MUSCLEWORD.filter(function(x){return x[1].test(fq);})[0],ws=weeklySets(split()),wl=weeklyVolume(),vk=KB.volume();
  var pick=m?m[0]:null;
  if(!pick){var lo=null;Object.keys(LANDMARKS).forEach(function(k){if(k==="Core"||k==="Calves")return;var v=num(ws[k]),r=LANDMARKS[k].mav;
      var gap=v<r[0]?r[0]-v:0;if(gap&&(!lo||gap>lo.gap))lo={k:k,gap:gap};});pick=lo?lo.k:"Chest";}
  var L=LANDMARKS[pick],plan0=Math.round(num(ws[pick])),done=(wl.rows.filter(function(r){return r.g===pick;})[0]||{}).sets;
  /* A goal that isn't about muscle size has no weekly floor (js/coach/landmarks.js
     rangeFor): its sets are set per exercise, by the textbook's table for the goal. */
  var G0=goalOf(S.profile.goal),AD0=adaptOf(S.profile.goal);
  if(!rangeFor(S.profile.level,G0.train)){
    p(a,fill(t("Your program gives {m} {n} sets a week. Your goal is {g}, not muscle size, so there's no weekly target per muscle: each exercise's sets and rest follow your goal."),
      {m:tm(pick).toLowerCase(),n:plan0,g:t(G0.label).toLowerCase()})
      +(AD0?" "+fill(t("That's {a}–{b} sets an exercise."),{a:AD0.sets.min,b:AD0.sets.max}):""));
    if(done!=null)n(a,fill(t("Logged so far this week: {n}."),{n:Math.round(done)}));
    return src(a,vk.src);}
  var r={min:L.mav[0],max:L.mav[1]};
  p(a,fill(t("Your program gives {m} {n} sets a week. The app's range for growth is roughly {r}, so {v}."),
    {m:tm(pick).toLowerCase(),n:plan0,r:range(r),v:plan0<r.min?t("there's room for more"):plan0>r.max?t("that's above it"):t("that's inside it")}));
  if(done!=null)n(a,fill(t("Logged so far this week: {n}."),{n:Math.round(done)}));
  p(a,t("Several sets an exercise build more muscle and strength than one."));
  n(a,t("The weekly range is the app's own, from practitioner guidelines (Renaissance Periodization). People differ widely."));
  return src(a,vk.src);}
function aKTempo(a){var k=KB.tempo();
  p(a,t("Slower reps suit building muscle and endurance; faster ones suit strength and power."));
  p(a,t("A tempo is four numbers in seconds: lowering, pause, lifting, pause."));
  return src(a,k.src);}
function aKWarm(a){var w=KB.warmup();
  p(a,fill(t("Before the work sets, 1–2 light sets of {r} reps, without tiring yourself."),{r:range(w.reps)}));
  n(a,t("Each workout opens with a warm-up made from its own lifts, and the first heavy lift gets its lighter sets on the way up."));
  return src(a,w.src);}
function aKDur(a){
  var d=KB.duration(),sp=split(),pl=planOn(sp,today()),day=pl.day&&!pl.rest?pl.day:nextDayOf(sp);
  p(a,fill(t("A session usually runs {lo}–{hi} min; the harder it is, the shorter."),{lo:d.min,hi:d.max})
    +(day?" "+fill(t("{d} takes about {m} min."),{d:planName(day.name),m:estMinutes(day)}):""));
  return src(a,d.src);}
function aK1RM(a){
  var o=KB.oneRM(),top=topLifts().filter(function(L){return !isActivity(L.name)&&L.w&&bwShare(L.name)<=0;})[0];
  p(a,fill(t("The app estimates a one-rep max from your best set with the Epley formula, up to 12 reps. The standard chart covers {r} reps."),{r:range(o.repsRange)}));
  if(top){var e=e1RM(top.w,top.reps,top.rpe);if(e&&top.reps>1)p(a,fill(t("{ex}: {w} × {r}, so about {e} for one."),{ex:exName(top.name),w:fmtW(top.w),r:top.reps,e:fmtW(e)}));}
  n(a,t("An estimate: the more reps in the set, the less exact."));
  return src(a,o.src);}
function aScope(a,q){return scopeAnswer(a,q,null);}
function aElse(a,q,it){
  if(it&&it.reading&&it.reading.topic==="unknown"&&OUTLINE[it.reading.mode])return aOut(a,q,it);
  var fq=fold(q),hit=ELSEWHERE.filter(function(x){return x[1].test(fq);})[0];
  if(hit&&hit[0]==="you"){
    p(a,t("That's in Profile > You, with your age, height and weight. Want me to open it?"));
    return act(a,t("Open it"),{"data-sheet":"set_you"});}
  if(hit&&hit[0]==="nodata"){
    p(a,t("That's not something I have data on. I can show you how your training and weight are going."));
    return act(a,t("How am I doing?"),{"data-chatq":"track","data-chatl":uiLang()});}
  return aUnknown(a,q,it);}

/* The nights of sleep logged in the last week. (The knowledge-base passage answer,
   aKnow, is gone: a passage is never shown as an answer, C-4.) */
function lastNights(){
  var out=[];for(var i=0;i<7;i++){var r=S.days[addDaysISO(today(),-i)];if(r&&num(r.sleep)>0)out.push(num(r.sleep));}
  return out;}

/* ---- a report, not a question: one question back, never a guess --------------------
   "I had a bad day, didn't stick to the diet" (js/coach/intent.js situationOf). The
   answer acknowledges it in one clause and asks one thing: work the week out, or log
   it and move on. Food goes to the week's reconciliation (js/coach/reconcile.js),
   training to moving the missed sets, a low day to adjusting today's effort, and pain
   to the recovery log only: no advice. Never a stricter tomorrow. */
function aSituation(a,q,it,sit){
  var L={"data-chatl":uiLang()};
  var go=function(label,id){return act(a,label,Object.assign({"data-chatq":id},L));};
  if(sit.kind==="pain"){
    p(a,t("Noted. Want me to put it in today's recovery log?"));
    /* The limits hold here too: pain is for a professional to look at (js/knowledge/scope.js). */
    n(a,t("If it is sharp, swollen, or still there in a few days, see a physio or a doctor."));
    act(a,t("Log it"),{"data-sheet":"recovery"});
    /* An area named: the same offer as the pain answer's, to keep the program off it. */
    var ar=areaOf(fold(q));
    if(ar)act(a,fill(t("Swap what loads my {area} across my program"),{area:t(ar[1])}),{"data-chatsay":"swap exercises that load my "+ar[0]});
    /* An exercise named ("… when I squat") that is in today's workout: an easier version
       of it, for today (agent.js planEasier), the books' "change an exercise when it
       hurts". Not offered for one that isn't today's: that would only say so. */
    var nx=namedExercises(q).filter(function(e){return !isActivity(e.name);})[0];
    if(nx){var lv=!!(S.active&&S.active.entries.some(function(x){return x.name===nx.name;})),pl0=null;
      try{pl0=planOn(split(),today());}catch(e){pl0=null;}
      var td=!S.active&&pl0&&pl0.day&&!pl0.rest&&pl0.kind!=="done"&&pl0.day.ex.some(function(x){return x.name===nx.name;});
      if(lv||td)act(a,fill(t("An easier version of {ex}"),{ex:exName(nx.name)}),{"data-chatsay":"an easier version of "+nx.name});}
    return a;}
  if(sit.kind==="food"){
    p(a,t("Sounds like today got away from you. Want me to work out what's left in the week, or just log it and move on?"));
    go(t("Work out the week"),"weekfood");return go(t("Just log it"),"logfood");}
  if(sit.kind==="train"){
    p(a,t("Missed one, then. Want me to work out the rest of the week, or just move on?"));
    go(t("Work out the week"),"weektrain");return go(t("Just move on"),"letgo");}
  if(sit.kind==="tired"){
    p(a,t("A low day, then. Want me to adjust today's workout, or just note it?"));
    go(t("Adjust today"),"lowday");return act(a,t("Just note it"),{"data-sheet":"recovery"});}
  p(a,t("Sounds like today got away from you. What went off?"));
  go(t("Food"),"weekfood");go(t("Training"),"weektrain");return go(t("Sleep or energy"),"lowday");}

/* The week's food, reconciled: what is left of the week's budget over the days left,
   inside the limits reconcile.js keeps (15% a day at most, never under BMR). The
   targets in the app stay as they are; this is the week's arithmetic. */
function kcalOn(d){var r=S.days[d];if(!r||!r.meals)return 0;var all=[];
  Object.keys(r.meals).forEach(function(k){(r.meals[k].items||[]).forEach(function(i){all.push(i);});});
  return all.length?sumNutrition(all).kcal:0;}
function aWeekFood(a){
  var g=S.goals||{},b=bmr(),now=today(),week=weekDates(now),from=addDaysISO(now,1);
  if(!(num(g.kcal)>0)||!(b>0)){p(a,t("I need your targets and your age, height, weight and sex for that. The assessment asks for them."));
    return act(a,t("Start the assessment"),{"data-setup":"1"});}
  if(!kcalOn(now)){p(a,t("Log what you ate today first; I can't work the week out from a day that isn't logged."));
    return act(a,t("Open Food"),{"data-tab":"food"});}
  var T={kcal:num(g.kcal),p:num(g.p),c:num(g.c),f:num(g.f)};
  var r=reconcileNutrition({bmr:b,from:from,days:week.map(function(d){var k=d<from?kcalOn(d):0;return {date:d,target:T,eaten:k?{kcal:k}:null};})});
  var open=r.days||[];
  if(r.kind==="on_track"){p(a,t("The week is on track: nothing to change."));return a;}
  if(r.kind==="week_fine"){
    p(a,r.why==="no_days_left"?t("The week is still fine. A new one starts tomorrow; eat your normal targets.")
      :t("The week is still fine. The gap is more than the days left can take, so let it go and eat your normal targets."));
    if(r.unlogged.length)n(a,fill(t(r.unlogged.length===1?"1 day this week isn't logged, so it isn't counted.":"{n} days this week aren't logged, so they aren't counted."),{n:r.unlogged.length}));
    return a;}
  var each=Math.round(Math.abs(r.gap)/Math.max(1,open.length)/10)*10;
  p(a,fill(t(r.gap<0?"Spread over the {n} days left, that's about {k} kcal a day less, protein unchanged.":"Spread over the {n} days left, that's about {k} kcal a day more, protein unchanged."),{n:open.length,k:fmtN(each)}));
  l(a,open.map(function(d){return pretty(d.date)+": "+fill(t("{n} kcal"),{n:fmtN(d.kcal)});}));
  n(a,t("No day moves more than 15%, and none goes under your resting energy. Your targets in the app stay as they are."));
  if(r.unlogged.length)n(a,fill(t(r.unlogged.length===1?"1 day this week isn't logged, so it isn't counted.":"{n} days this week aren't logged, so they aren't counted."),{n:r.unlogged.length}));
  return a;}
function aLogFood(a){
  p(a,t("Fine. Log what you ate when you can; it's the week that counts, not the day."));
  return act(a,t("Open Food"),{"data-tab":"food"});}

/* The week's training, reconciled: the missed session's sets moved into the sessions
   left that train the same muscles, where recovery allows (reconcile.js); what does
   not fit is let go, and both numbers are said. A rotation loses nothing. */
function setsOf(list,work){
  var out={};
  (list||[]).forEach(function(e){
    if(!e||isActivity(e.name))return;
    var n=work?(e.sets||[]).filter(function(x){return !x.wu;}).length:num(e.sets);if(!n)return;
    var m=muscleOf(e.name);out[m]=(out[m]||0)+n;
    (secondaryOf(e.name)||[]).forEach(function(s){out[s]=(out[s]||0)+n/2;});});
  return out;}
function aWeekTrain(a){
  var sp=split(),now=today();
  if(sp.schedule!=="week"){
    var nx=nextDayOf(sp);
    p(a,(nx?fill(t("Nothing is lost. Your program is a rotation, so the next workout is simply the one you missed: {d}."),{d:planName(nx.name)})
      :t("Nothing is lost. Your program is a rotation, so the next workout is simply the one you missed."))+" "+t("Don't try to fit two into one day."));
    return a;}
  var week=weekDates(now),done=function(d){return S.sessions.some(function(s){return s.date===d;});};
  /* The session missed: today's, if it is not done, or the last one before it. */
  var mdate=null;week.slice().reverse().forEach(function(d){if(!mdate&&d<=now&&pinnedOn(sp,d)&&!done(d))mdate=d;});
  if(!mdate){p(a,t("I can't find a missed session this week: every planned one so far is logged."));return a;}
  var md=pinnedOn(sp,mdate),from=addDaysISO(now,1);
  var others=week.filter(function(d){return d!==mdate;}).map(function(d){
    if(d<from){var ss=S.sessions.filter(function(s){return s.date===d;});
      var e=[];ss.forEach(function(s){e=e.concat(s.entries||[]);});return e.length?{date:d,sets:setsOf(e,true)}:null;}
    var pd=pinnedOn(sp,d);return pd?{date:d,sets:setsOf(pd.ex,false)}:null;}).filter(Boolean);
  var r=reconcileTraining({missed:{date:mdate,sets:setsOf(md.ex,false)},sessions:others,from:from});
  if(r.kind==="week_fine"||r.kind==="none"||r.kind==="nothing_missed"){
    p(a,fill(t("The week is still fine. {d}'s sets don't fit into the rest of it without crowding recovery, so that one's gone; train the rest as planned."),{d:planName(md.name)}));
    return a;}
  var wd=function(d){return pretty(d).split(",")[0];};
  p(a,fill(t(r.kind==="adjust"?"All {n} of {d}'s sets fit into the rest of the week.":"{m} of {d}'s {n} sets fit into the rest of the week; the other {g} are gone."),
    {n:Math.round(r.missed),m:r.moved,g:r.gone,d:planName(md.name)}));
  var byDay={},order=[];r.add.forEach(function(x){if(!byDay[x.date]){byDay[x.date]=[];order.push(x.date);}byDay[x.date].push(tm(x.muscle).toLowerCase());});
  l(a,order.map(function(d){return wd(d)+": "+fill(t("+1 set each: {m}"),{m:list(byDay[d])});}));
  n(a,t("Add them as extra sets on those days. Nothing is moved where it would come too close to another session for the same muscles."));
  return a;}
function aLetGo(a){
  var nx=nextDayOf(split());
  p(a,nx?fill(t("Fine. Next up is {d}; train it as planned."),{d:planName(nx.name)}):t("Fine. Train the next one as planned."));
  return a;}
/* A low day: today's effort adjusted, from the log's own fatigue reading where it has
   one. The program is not changed. */
function aLowDay(a){
  p(a,t("On a low day: do the workout with one set fewer on each exercise, or keep the sets and stop two or three reps short of failure. Sleep is the biggest lever: seven to nine hours."));
  var fat=coachNow().filter(function(c){return /^(fatigue|falling|stall)$/.test(c.kind);})[0];
  if(fat){var w=words(fat);p(a,t("Your log also shows it:")+" "+w[0]+". "+w[1]);act(a,w[2],{"data-cofix":fat.id});}
  else if(deloadDue()){n(a,t("It has been a long run of hard weeks. A lighter week now would let your body catch up."));act(a,t("Start a lighter week"),{"data-deload":"start"});}
  return act(a,t("Log sleep and energy"),{"data-sheet":"recovery"});}

/* ---- what the person has told the coach (js/coach/context.js) -----------------------
   Kept only when they say so, in their own words, under the kind they pick; listed and
   deletable whenever they ask. Nothing about them is inferred. */
var CTXKIND={schedule:"Work or schedule",obstacle:"Something in the way",constraint:"Something I can't do",preference:"A preference"};
function aRemember(a,q){
  p(a,t("Want me to keep that, in your words, so later answers can work around it? Pick what it is."));
  KINDS.forEach(function(k){act(a,t(CTXKIND[k]),{"data-ctxadd":k});});
  return act(a,t("Don't keep it"),{"data-ctxno":"1"});}
function aFacts(a){
  var f=listFacts(S.context);
  if(!f.length){p(a,t("You haven't told me anything to keep yet. Say something like “I work 13-hour days”, and I'll ask before keeping it."));return a;}
  p(a,fill(t(f.length===1?"You've told me 1 thing. It's kept as you said it; delete it any time.":"You've told me {n} things. Each is kept as you said it; delete any of them."),{n:f.length}));
  f.forEach(function(x){act(a,fill(t("Delete “{t}”"),{t:x.text}),{"data-ctxdel":x.id});});
  return a;}
/* An exercise in this list that something they said they can't do names. */
function clashes(exs){
  var out=[];
  listFacts(S.context,"constraint").concat(listFacts(S.context,"preference")).forEach(function(x){
    var one=function(w){return w.length>4?w.replace(/([^s])s$/,"$1"):w;};
    var fw=" "+spell(fold(x.text)).split(" ").map(one).join(" ")+" ";
    exs.forEach(function(e){
      var hit=[e.name,exName(e.name)].some(function(nm){return fold(nm).split(" ").some(function(w){
        w=one(w);return w.length>=4&&!GENERIC.test(w)&&fw.indexOf(" "+w+" ")>=0;});});
      if(hit&&!out.some(function(o){return o.name===e.name;}))out.push({name:e.name,said:x.text});});});
  return out;}

/* ---- requests: what js/ui/agent.js made of them ------------------------------------ */
function aReassess(a){
  p(a,t("The assessment rebuilds your targets, training and meals from your answers. Nothing changes until you use what it builds."));
  return act(a,t("Retake the assessment"),{"data-setup":"1"});}

/* An answer, with what the person told the coach that bears on it said back. */
/* ---- answers that take what the sentence names (js/coach/understand.js, C-3) --------
   Each reads it.reading: the exercise, the day or span, the muscle, the minutes and
   kit that were said, so "best squat" is the squat, "ate yesterday" is yesterday. Every
   figure is from the log; where the log has nothing, the answer says so. */
function rdEx(it){var e=rd(it).entities.exercise[0];return e&&e.name?e.name:"";}
/* A said day as a date: yesterday, the day before, or the last such weekday. */
function rdDate(day){
  var n=today();if(!day)return n;
  if(day.when==="yesterday")return addDaysW(n,-1);if(day.when==="daybefore")return addDaysW(n,-2);
  if(day.when==="tomorrow")return addDaysW(n,1);if(day.when==="ago")return addDaysW(n,-day.n);
  if(day.when==="weekday"){for(var i=day.last?1:0;i<8;i++){var d=addDaysW(n,-i),wd=new Date(d+"T00:00:00").getDay()||7;if(wd===day.n&&(i>0||!day.last))return d;}}
  return n;}
function dayName(iso){var n=today();return iso===n?t("today"):iso===addDaysW(n,-1)?t("yesterday"):pretty(iso);}
/* The working sets of one exercise, newest session first: [{date, sets:[{w,r,rpe}]}]. */
function setsFor(name){
  var out=[];(S.sessions||[]).forEach(function(s){(s.entries||[]).forEach(function(e){
    if(e.name!==name)return;var w=(e.sets||[]).filter(function(x){return !x.wu&&(num(x.r)>0||num(x.w)>0);});
    if(w.length)out.push({date:s.date,sets:w});});});
  return out.sort(function(a,b){return a.date<b.date?1:a.date>b.date?-1:0;});}
function topOf(sets,name){
  var bw=bwShare(name)>0,best=null,be=-1;
  sets.forEach(function(x){var e=bw?num(x.r):e1RM(num(x.w),num(x.r),num(x.rpe));if(e>be){be=e;best=x;}});
  return best?{w:num(best.w),r:num(best.r),e:bw?0:be}:null;}
function setText(name,x){return num(x.w)?loadText(name,x.w)+" × "+num(x.r):num(x.r)+" "+t("reps");}
function maxText(name,x){return x.e&&x.r>1&&x.r<=12?" · "+fill(t("about {e} for one (estimated)"),{e:fmtW(x.e)}):"";}
function aRecord(a,q,it){
  var R=rd(it),name=rdEx(it);
  if(!name)return aStrong(a);
  var log=setsFor(name),nm=exName(name);
  if(!log.length){p(a,fill(t("There's no {ex} in your log yet. Once you log it, I can tell you its best and how it's moving."),{ex:nm}));
    return act(a,t("Open Training"),{"data-tab":"train"});}
  var all=[];log.forEach(function(s){s.sets.forEach(function(x){all.push(Object.assign({date:s.date},x));});});
  if(R.mode==="last"){
    var ls=log[0];
    p(a,fill(t("Last time you did {ex}, {d}:"),{ex:nm,d:dayName(ls.date)}));
    l(a,ls.sets.map(function(x){return setText(name,x);}));}
  else if(R.mode==="trend"||R.mode==="down"){
    var span=R.entities.period==="month"||R.entities.period==="lastmonth"?28:7,n0=today();
    var from=addDaysW(n0,-(span-1)),pf=addDaysW(from,-span),pt=addDaysW(from,-1);
    var cur=log.filter(function(s){return s.date>=from;}),bef=log.filter(function(s){return s.date>=pf&&s.date<=pt;});
    var tc=topOf([].concat.apply([],cur.map(function(s){return s.sets;})),name),tb=topOf([].concat.apply([],bef.map(function(s){return s.sets;})),name);
    var lbl=t(span===7?"the last 7 days":"the last 4 weeks"),lblb=t(span===7?"the 7 days before":"the 4 weeks before");
    if(!tc)p(a,fill(t("No {ex} logged in {span}."),{ex:nm,span:lbl}));
    else{
      p(a,fill(t("{ex} in {span}: best set {s}{m}."),{ex:nm,span:lbl,s:setText(name,tc),m:maxText(name,tc)}));
      if(tb){var d=tc.e&&tb.e?Math.round((tc.e-tb.e)*10)/10:tc.r-tb.r;
        p(a,fill(t("In {span}: {s}{m}."),{span:lblb,s:setText(name,tb),m:maxText(name,tb)})+" "
          +(Math.abs(d)<0.5?t("About the same."):d>0?t("Up on the weeks before."):t("Down on the weeks before.")));}
      else p(a,fill(t("Nothing logged in {span} to compare with."),{span:lblb}));}}
  else{
    var b=topOf(all,name),bd=all.filter(function(x){return num(x.w)===b.w&&num(x.r)===b.r;})[0];
    p(a,fill(t("Your best {ex}: {s} on {d}{m}."),{ex:nm,s:setText(name,b),d:pretty(bd.date),m:maxText(name,b)}));
    var hv=all.slice().sort(function(x,y){return num(y.w)-num(x.w)||num(y.r)-num(x.r);})[0];
    if(num(hv.w)>b.w)n(a,fill(t("Heaviest set: {s}."),{s:setText(name,hv)}));
    if(b.e)n(a,t("The one-rep max is worked out from the set (Epley), not lifted."));}
  return act(a,t("Open Progress"),{"data-tab":"progress"});}
function aTechnique(a,q,it){
  var name=rdEx(it)||(S.active&&S.active.entries[S.active.idx||0]||{}).name||"";
  if(!name){p(a,t("Which exercise? Say its name, like “how do I do a squat”."));return a;}
  var st=exSteps(name)||[];
  if(st.length){p(a,fill(t("{ex}:"),{ex:exName(name)}));l(a,st.slice(0,5));}
  else p(a,fill(t("The guide for {ex} has the steps and the common mistakes."),{ex:exName(name)}));
  return act(a,t("How to do it"),{"data-exdetail":name});}
function aFoodDay(a,q,it){
  var iso=rdDate(rd(it).entities.day),r=S.days[iso],all=[],lines=[];
  if(r&&r.meals)Object.keys(r.meals).forEach(function(k){var items=(r.meals[k].items||[]);
    if(items.length){lines.push(mealName(k)+": "+foods(items.map(itemName)));items.forEach(function(x){all.push(x);});}});
  if(!all.length){p(a,fill(t("Nothing was logged {d}."),{d:dayName(iso)}));return act(a,t("Open Food"),{"data-tab":"food"});}
  var tot=sumNutrition(all);
  p(a,fill(t("What you logged {d}: {k} kcal and {p} g of protein."),{d:dayName(iso),k:fmtN(Math.round(tot.kcal)),p:Math.round(tot.p)}));
  l(a,lines);
  return act(a,t("Open Food"),{"data-tab":"food"});}
function aDay(a,q,it){
  var iso=rdDate(rd(it).entities.day),ss=(S.sessions||[]).filter(function(s){return s.date===iso;});
  if(!ss.length){p(a,fill(t("No workout was logged {d}."),{d:dayName(iso)}));return act(a,t("Open Training"),{"data-tab":"train"});}
  ss.forEach(function(s){
    var ex=(s.entries||[]).filter(function(e){return (e.sets||[]).some(function(x){return !x.wu;});});
    p(a,fill(t("{d}: {w}, {n} exercises."),{d:cap1(dayName(iso)),w:planName(s.dayName||t("Workout")),n:ex.length}));
    l(a,ex.slice(0,8).map(function(e){var w=e.sets.filter(function(x){return !x.wu;}),tp=topOf(w,e.name);
      return exName(e.name)+": "+w.length+" × · "+(tp?setText(e.name,tp):"");}));});
  return act(a,t("View session"),{"data-openday":iso});}
function cap1(s){s=String(s||"");return s.charAt(0).toUpperCase()+s.slice(1);}
function aVolume(a,q,it){
  var R=rd(it),mus=R.entities.muscle[0];
  if(!mus)return aBalance(a);
  var want=GROUPOF[mus]||[mus],ws=weekSpan(),n2=0,k=0;
  (S.sessions||[]).forEach(function(s){if(!inSpan(s.date,ws.from,ws.to))return;var any=false;
    (s.entries||[]).forEach(function(e){var m=e.muscle||muscleOf(e.name);if(want.indexOf(m)<0)return;
      var c=(e.sets||[]).filter(function(x){return !x.wu;}).length;if(c){n2+=c;any=true;}});if(any)k++;});
  var span=t(ws.last?"last week":"this week");
  p(a,n2?fill(t(k===1?"{n} working sets of {m} {w}, in 1 session.":"{n} working sets of {m} {w}, in {k} sessions."),{n:n2,m:tm(mus),w:span,k:k})
    :fill(t("No working sets of {m} logged {w}."),{m:tm(mus),w:span}));
  return act(a,t("Open Progress"),{"data-tab":"progress"});}
/* Tired most of the time: what the log says about sleep and food this week, and the
   referral when it does not lift (js/knowledge/scope.js, refer_undiagnosed). */
function aTired(a){
  var nights=lastNights(),days=[],g=S.goals||{};
  for(var i=1;i<=7;i++){var k=kcalOn(addDaysW(today(),-i));if(k>0)days.push(k);}
  p(a,t("Tired most of the time is something to look at over weeks, not one day."));
  var ev=[];
  if(nights.length)ev.push(fill(t("You logged {h} hours a night on average over your last {n} nights."),{h:r1(nights.reduce(function(x,y){return x+y;},0)/nights.length),n:nights.length}));
  if(days.length&&num(g.kcal))ev.push(fill(t("Food logged on {n} of the last 7 days: about {k} kcal a day, against a target of {t}."),{n:days.length,k:fmtN(Math.round(days.reduce(function(x,y){return x+y;},0)/days.length)),t:fmtN(g.kcal)}));
  if(ev.length)l(a,ev);else p(a,t("Your log has no sleep or food for the last week, so I can't see a cause in it."));
  p(a,t("If it goes on, see a doctor: tiredness that doesn't lift can have a cause I can't check."));
  src(a,(KB.scopeRule("refer_undiagnosed")||{}).src);
  return act(a,t("Log sleep and energy"),{"data-sheet":"recovery"});}
/* The program's own of it: that exercise, else the one of its family the program has
   ("squat" asked, the Hack Squat in the program). */
function whyEntry(name,key){
  var hit=null,kw=String(key||"").toLowerCase().split(" ").filter(Boolean);
  split().days.forEach(function(d){d.ex.forEach(function(e){if(!hit&&e.name===name)hit={d:d,e:e};});});
  if(!hit&&kw.length)split().days.forEach(function(d){d.ex.forEach(function(e){var ln=e.name.toLowerCase();
    if(!hit&&!isActivity(e.name)&&kw.every(function(w){return ln.indexOf(w.replace(/s$/,""))>=0;}))hit={d:d,e:e};});});
  return hit;}
/* The last session's best set of an exercise, from the log: "80 × 8", or "". */
function lastBest(name){
  var s=(S.sessions||[]).filter(function(x){return (x.entries||[]).some(function(e){return e.name===name&&(e.sets||[]).length;});})
    .sort(function(a,b){return a.date<b.date?1:-1;})[0];
  if(!s)return "";var e=s.entries.filter(function(x){return x.name===name;})[0],top=null;
  e.sets.forEach(function(x){if(!x.wu&&(!top||num(x.w)>num(top.w)))top=x;});
  return top?(num(top.w)?fmtW(num(top.w))+" × ":"")+num(top.r):"";}
function aWhy(a,q,it){
  var fq=fold(q||""),name=rdEx(it),act0=S.active&&S.active.entries[S.active.idx||0],ex0=rd(it).entities.exercise[0],key=ex0&&ex0.key||"";
  if(!name&&act0&&/(this|that|ده|دي)/.test(fq))name=act0.name;
  /* The program's own of the family asked about, for an exercise or its weight. */
  var own=name?whyEntry(name,key):null;
  /* Only when the one named isn't itself logged: "the weight for squat 80 kg" is the
     squat they logged at 80, not the program's Hack Squat. */
  if(own&&own.e.name!==name&&!(act0&&act0.name===name)){if(WHYKIND.load.test(fq)&&lastBest(name))own=null;else name=own.e.name;}
  /* A weight. */
  if(name&&WHYKIND.load.test(fq)){
    var w=own,pe=act0&&act0.name===name?act0.planned:w?{lo:w.e.lo,hi:w.e.hi,sets:w.e.sets}:null;
    var rc=pe?recommend({name:name,planned:pe}):null;
    if(rc&&rc.note){
      p(a,(rc.w?fill(t("{ex}: {w} next."),{ex:exName(name),w:fmtW(rc.w)})+" ":"")+t(rc.note));
      if(rc.last)n(a,fill(t("From your last session's best set: {s}."),{s:rc.last}));
      return act(a,t("Open Training"),{"data-tab":"train"});}
    if(pe&&!rc){p(a,fill(t("{ex} has nothing logged yet, so there is no suggestion to explain: find a weight you can control for the planned reps."),{ex:exName(name)}));return a;}
    if(!pe){var lb=lastBest(name);
      p(a,fill(t("{ex} isn't in your program, so the app doesn't suggest a weight for it."),{ex:exName(name)})+(lb?" "+fill(t("Your last best set of it: {s}."),{s:lb}):""));
      return a;}}
  /* A lighter day. */
  if(WHYKIND.light.test(fq)&&!name){
    if(inDeload()){
      var until=S.deload&&S.deload.until;
      p(a,t("This is a lighter week: fewer sets and about 10% less weight, so you recover and come back stronger.")+(until?" "+fill(t("It runs until {d}."),{d:pretty(until)}):" "+t("It is the planned lighter week of your training block.")));
      return act(a,t("Open Training"),{"data-tab":"train"});}
    var pl0=planOn(split(),today());
    p(a,pl0.day&&!pl0.rest?fill(t("Today isn't lighter: it is {d}, as your program plans it."),{d:planName(pl0.day.name)}):t("Today is a rest day."));
    return a;}
  /* An exercise. */
  if(name&&(WHYKIND.choice.test(fq)||!WHYKIND.day.test(fq))){
    var we=own,sp=split(),v=EXDB&&EXDB[name]||{};
    if(we){
      p(a,fill(t("{ex} is in {d} to train your {m}, with a {mv} movement."),{ex:exName(name),d:planName(we.d.name),m:tm(muscleOf(name)).toLowerCase(),mv:t(movementName(name))}));
      if(v.e)n(a,fill(t("It uses {k}, which your kit has."),{k:t(v.e).toLowerCase()}));
      n(a,sp&&sp.from==="built"||sp&&sp.id===BUILTID?t("Your program was built for you from your assessment: your goal, days, time and kit."):fill(t("It came with the {p} program."),{p:planName(sp.name)}));
      return act(a,t("Swap it"),{"data-chatsay":uiLang()==="ar"?"بدل "+exName(name):"swap "+name+" for"});}
    p(a,fill(t("{ex} isn't in your program."),{ex:exName(name)}));return a;}
  /* "Why this exercise?" with none on screen: which one. */
  if(!name&&WHYKIND.choice.test(fq)){p(a,t("Which exercise? Say its name, like “why is Leg Press in my program?”."));return a;}
  /* Today's day. */
  if(WHYKIND.day.test(fq)){
    var sp2=split(),pl=planOn(sp2,today());
    if(pl.day&&!pl.rest&&pl.kind!=="done"){
      p(a,sp2.schedule==="week"?fill(t("{d} is on {w} in your program."),{d:planName(pl.day.name),w:t(WDNAME[isoWeekdayOf(today())])})
        :fill(t("{d} is next in your program's rotation: the days come round in order, whatever the weekday."),{d:planName(pl.day.name)}));
      return act(a,t("Change workout"),{"data-tab":"train"});}}
  p(a,t("The app suggested it from your recent sessions, but I can't show the working for this one yet."));
  n(a,t("The weight for each set is on the workout page, next to the set."));
  return act(a,t("Open Training"),{"data-tab":"train"});}
var WDNAME=["","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
function isoWeekdayOf(iso){return new Date(iso+"T00:00:00").getDay()||7;}
function movementName(n){var m=movementOfEx(n)||"";return {push:"pushing",pull:"pulling",squat:"squat",hinge:"hinge",lunge:"lunge",carry:"carry",core:"core",rotation:"rotation",isolation:"single-joint"}[m]||(m||"single-joint");}
function aFit(a,q,it){
  var R=rd(it),E=R.entities,sp=split(),pl=planOn(sp,today()),d=pl.day&&!pl.rest&&pl.kind!=="done"?pl.day:null;
  if(!d){
    if(pl.kind==="done")p(a,t("You've already trained today."));
    else p(a,t("Today is a rest day."));
    return act(a,t("Open Training"),{"data-tab":"train"});}
  var gear=null;E.equipment.forEach(function(k){if(KITOF[k]){gear=(gear||["Bodyweight"]).concat(KITOF[k]);}});
  var full=estMinutes(d),have=E.minutes||0,keep=d.ex.slice();
  if(have&&have<full){
    var used=0;keep=[];
    d.ex.forEach(function(e){var m=isActivity(e.name)?(e.min||30):e.sets*((e.rest||75)+35)/60;if(used+m<=have||!keep.length){keep.push(e);used+=m;}});
    p(a,fill(t("Today's workout takes about {f} min. In {h}, do these, in order, and skip the rest:"),{f:full,h:have+" "+t("min")}));}
  else if(have)p(a,fill(t("Today's workout takes about {f} min, so it fits in {h}."),{f:full,h:have+" "+t("min")}));
  else p(a,fill(t("Today's workout: {w}, about {f} min."),{w:planName(d.name),f:full}));
  var lims=limitsOf(S.profile),miss=0,names=[],swap={},none=0;
  l(a,keep.map(function(e){
    var nm=exName(e.name)+(isActivity(e.name)?"":" · "+doseText(e));
    if(!gear||isActivity(e.name)||usable(e.name,gear)){names.push(e.name);return nm;}
    var sb=standIn(e.name,gear,lims);miss++;
    if(sb){names.push(e.name);swap[e.name]=sb;}else none++;
    return sb?fill(t("{a} → {b}, with what you have"),{a:nm,b:exName(sb)}):fill(t("{a}: nothing close with that kit; skip it"),{a:nm});}));
  var changed=names.length&&(names.length<d.ex.length||Object.keys(swap).length);
  if(gear)n(a,miss?t("Your program itself stays as it is: this is today only."):t("Everything here works with what you have."));
  else if(have&&have<full)n(a,t("The main lifts come first in your program, so a short session still does most of the work. Rest a little less between sets if you need to."));
  /* C-5a: not only a guide. Started like this with a tap, Undo ends it; the program is not
     changed (handlers/actions.js session.fit). With a workout already open, the guide. */
  if(changed&&!S.active){
    var sws=Object.keys(swap).length;
    a.ag={s:"confirm",act:"session.fit",p:{day:d.id,keep:names,swap:swap},
      lead:t("Start today's workout like this?"),
      item:fill(t(names.length===1?"{n} exercise":"{n} exercises"),{n:names.length})+(sws?" · "+fill(t(sws===1?"{n} stand-in":"{n} stand-ins"),{n:sws}):""),
      detail:t("Today only"),cta:t("Start it like this"),
      done:t("Started. Today's workout is as above; your program is as it was."),
      undone:t("Undone. No workout was started.")};
    return a;}
  return act(a,t("Start workout"),{"data-startday":d.id});}
/* "Make my program 4 days" / "I can only train Mon Wed Fri" (docs/COACH-AGENT.md 2.4,
   plan.days in the app; program.days in the plan): the assessment rebuilds the week for that many days, or on those days,
   keeping everything else it knows, and shows the whole plan first; nothing changes
   until Use this plan (handlers/actions.js plan.days, as plan.gear does for kit). */
var DAYSOK=[2,6];
function aDays(a,q,it){
  var R=rd(it),sp=split(),tr=sp.days.filter(function(x){return x.ex&&x.ex.length;}),days=tr.length;
  var wd=(R.entities.weekdays||[]).filter(function(n,i,l){return n>=1&&n<=7&&l.indexOf(n)===i;}).sort(function(x,y){return x-y;});
  var want=wd.length>=2?wd.length:(R.n||0);
  var now=sp.schedule==="week"?tr.map(function(d){return (d.wd||[])[0];}).filter(Boolean).sort(function(x,y){return x-y;}):[];
  p(a,fill(t(days===1?"Your program has 1 training day.":"Your program has {n} training days."),{n:days})
    +(now.length===days&&days?" "+fill(t("Its days: {d}."),{d:now.map(function(n){return wdName(n);}).join(R.lang==="ar"?"، ":", ")}):""));
  if(!want)return act(a,t("Plan my training"),{"data-csec":"train","data-ctsub":"program"});
  if(want===days&&(!wd.length||wd.join()===now.join())){p(a,t("That's already your week."));return a;}
  if(want<DAYSOK[0]||want>DAYSOK[1]){
    p(a,fill(t("The plan is built for {lo} to {hi} days a week."),{lo:DAYSOK[0],hi:DAYSOK[1]}));
    return act(a,t("Plan my training"),{"data-csec":"train","data-ctsub":"program"});}
  var on=wd.length?wd.map(function(n){return wdName(n);}).join(R.lang==="ar"?"، ":", "):"";
  a.ag={s:"confirm",act:"plan.days",p:{n:want,wd:wd},
    lead:t("I can rebuild your week for that, keeping your goal, kit and session length. You'll see the whole plan first: nothing changes until you tap Use this plan."),
    item:wd.length?fill(t("{n} days: {d}"),{n:want,d:on}):fill(t(want===1?"{n} day a week":"{n} days a week"),{n:want}),
    detail:fill(t("Now: {n} days."),{n:days}),cta:t("Show me"),
    done:t("Opened your rebuilt plan. Tap Use this plan to keep it, or Back to leave everything as it is.")};
  return a;}
/* An exercise to leave out, not said (said, it is agent.js planLeave). */
function aAvoid(a,q,it){
  p(a,t("Which exercise? Say its name, and I'll leave it out of your plans."));
  return act(a,t("Open Favourites"),{"data-train":"favs"});}
/* Away, and no kit said: what there will be, asked, with the three usual answers. */
function aAway(a,q,it){
  var R=rd(it),ar=R.lang==="ar",next=R.entities.period==="nextweek";
  p(a,next?t("Travel mode swaps your workouts for what you'll have with you, for next week. What will you have with you?"):t("What will you have with you?"));
  var base=ar?(next?"مسافر الاسبوع الجاي، ":"مسافر الويك اند، "):(next?"travelling next week, ":"travelling this weekend, ");
  [["Bodyweight only",ar?"بوزن الجسم بس":"bodyweight only"],["Dumbbells",ar?"دمبل بس":"only dumbbells"],["A hotel gym",ar?"جيم الفندق":"hotel gym"]].forEach(function(o){
    act(a,t(o[0]),{"data-chatsay":base+o[1]});});
  return a;}
/* Outside what the coach does: said plainly, with what it can do instead. */
var OUTLINE={who:"I'm the app's coach: I answer from your own log and plan and the textbooks in the app, on this phone.",
  remind:"The app doesn't set reminders. Your weigh-ins are under Progress.",joke:"That's outside what I do.",news:"That's outside what I do."};
function aOut(a,q,it){
  var R=rd(it);p(a,t(OUTLINE[R.mode]||"That's outside what I do."));
  return act(a,t("What can I ask?"),{"data-chatq":"help","data-chatl":uiLang()});}
function aClarify(a,q,it){
  var R=rd(it),opts=[{topic:R.topic,mode:R.mode}].concat(R.alts||[]),seen={},shown=0;
  p(a,t("I'm not sure what you mean. Is it one of these?"));
  opts.forEach(function(x){if(shown>=3||seen[x.topic])return;var o=readAs(x,R);if(!o)return;seen[x.topic]=1;shown++;act(a,o.l,{"data-chatsay":o.say});});
  if(!shown)act(a,t("What can I ask?"),{"data-chatq":"help","data-chatl":uiLang()});
  return a;}
/* A correction with nothing in it to re-read ("you're wrong"): the last change offered
   back, or the last reading said, and the other readings it could have had. */
function aCorrection(a,q,it){
  var R=rd(it),c=R.correction||{},pv=c.prev||null,last=c.msg||pv&&pv.msg||null;
  if(last&&last.ag&&last.ag.s==="applied"&&canUndo(last.at)){
    p(a,fill(t("Undo “{d}”?"),{d:String(last.ag.done||"")}));return act(a,t("Undo it"),{"data-agundo":String(last.at)});}
  if(last&&last.ag&&last.ag.s==="confirm"){last.ag.s="declined";p(a,t("Not done: nothing changed. Tell me what you meant."));return a;}
  var tp=last&&TOPIC[last.id];
  p(a,tp?fill(t("I answered that as “{t}”. What did you mean?"),{t:t(tp[0])}):t("Sorry. What did you mean?"));
  var shown=0;
  if(pv)(pv.alts||[]).concat(pv.topic&&last&&last.id!==pv.topic?[{topic:pv.topic}]:[]).forEach(function(x){
    if(shown>=3||(last&&x.topic===last.id))return;var o=readAs(x,pv);if(o){shown++;act(a,o.l,{"data-chatsay":o.say});}});
  if(!shown)n(a,t("Try saying it another way: name the exercise, the food or the day."));
  return a;}

export {AREAASK, CTXKIND, DAYSOK, FAQMINE, GOALWORD, HOW, INGREDIENT, MEALWORD, NOSWAP, OUTLINE, PHASE_LINE, PHASE_NAME_CHAT, SWEET, WDNAME, aAvoid, aAway, aBalance, aCalories, aClarify, aCorrection, aCrave, aDay, aDays, aEat, aElse, aFacts, aFaq, aFit, aFoodDay, aFoodInfo, aGoal, aHealth, aHello, aHelp, aInBody, aK1RM, aKDur, aKFreq, aKReps, aKRest, aKSets, aKTempo, aKVolume, aKWarm, aLast, aLetGo, aLighter, aLive, aLoadLog, aLogFood, aLowDay, aMissed, aMonth, aOut, aPhase, aPlan, aPlateau, aProtein, aReassess, aRecord, aRemember, aRest, aScope, aSituation, aSore, aSteps, aStrong, aSwap, aTechnique, aThanks, aTired, aToday, aTomorrow, aTrack, aTwice, aUnknown, aVolume, aWarmPlan, aWater, aWeek, aWeekFood, aWeekTrain, aWeight, aWeights, aWhy, aZones, arName, cap1, clashes, dayName, faqSlots, foodOf, goalWord, inSpan, isoWeekdayOf, itemName, kcalOn, keyWords, lastBest, lastNights, liveLearned, macroTargetsFor, maxText, mode, movementName, nearOf, notSame, planItemNamed, planMeal, range, rdDate, rdEx, role, secs, setText, setsFor, setsOf, swapLine, swapsFor, topOf, versus, weekSpan, whyEntry};

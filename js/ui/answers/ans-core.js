/* Bunyan — the coach's answers: the questions answered from the log as it stands: training, food, body, the day (js/ui/answers/answers.js gathers them;
   road map step 4, 25 Nov: split by topic as they were, no answer's words or figures changed). */
import {t, tm} from "../../i18n/dict.js";
import {act, fill, foods, l, list, n, noTags, p, src, uiLang} from "./kit.js";
import {exName, planName} from "../../i18n/exnames.js";
import {isActivity} from "../../data/activities.js";
import {checkPlans} from "../../engine/plancheck.js";
import {headOn} from "../../engine/head.js";
import {learnedDiffers} from "../../engine/energy.js";
import {eatenToday, inDeload, recommend} from "../../engine/formulas.js";
import {mealName, mealSlots} from "../../engine/meals.js";
import {foodName, nutritionFor, searchFoods, sumNutrition} from "../../engine/nutrition.js";
import {S, split} from "../../state.js";
import {fmtW} from "../../units.js";
import {fmtN, num, today} from "../../util.js";
import {doseText} from "../dose.js";
import {blockDay, blockNow} from "../../engine/blocks.js";
import {estMinutes, nextDayOf, planOn} from "../../engine/dayplan.js";
import {swapAdvice} from "../../engine/recovery.js";
import {simpleFacts} from "../facts.js";
import {words} from "../coachwords.js";
import {namedExercises, told} from "./route.js";
import {itemName} from "./ans-food.js";
import {range} from "./ans-know.js";
import {clashes} from "./ans-report.js";
import {dayName} from "./ans-named.js";

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

export {SWEET, aCrave, aEat, aLighter, aToday, aTrack, aWeights, liveLearned};

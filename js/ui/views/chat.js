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
import {t, tm} from "../../i18n/dict.js";
import {exName, planName} from "../../i18n/exnames.js";
import {goalOf} from "../../data/goals.js";
import {isActivity} from "../../data/activities.js";
import {ACTION_IDS, factOf, fold, intentOf, KNOW_IDS, situationOf, skel, spell} from "../../coach/intent.js";
import {KINDS, listFacts} from "../../coach/context.js";
import {reconcileNutrition, reconcileTraining} from "../../coach/reconcile.js";
import {addDays as addDaysW, pinnedOn, weekDates, weekStartOf} from "../../engine/schedule.js";
import {muscleOf, secondaryOf} from "../../data/exercises.js";
import {LANDMARKS} from "../../coach/landmarks.js";
import * as KB from "../../engine/kb.js";
import {lookup, ownTerms} from "../../engine/kbsearch.js";
import {weeklySets} from "../../engine/volume.js";
import {weeklyVolume} from "../../engine/stats.js";
import {canUndo} from "../handlers/actions.js";
import {answerPick, createAsk, namesExercise, namesFood, plan as planAction, planCommand, proceed, suggestExercises, swapPick} from "../agent.js";
import {commandOf} from "../../coach/commands.js";
import {checkPlans} from "../../engine/plancheck.js";
import {coachNow, standingNow} from "../../engine/coachinfo.js";
import {learnedDiffers, learnedNow, maintenanceInUse} from "../../engine/energy.js";
import {bestE1RM, bmr, bwShare, deloadDue, e1RM, eatenToday, energyMissing, inDeload, kcalFloor, lastWeight, loadText, macroTargets, prFor, recommend, sessionVolume, targetKcal, tdee, tdeeFormula} from "../../engine/formulas.js";
import {mealName, mealSlots} from "../../engine/meals.js";
import {editDist} from "../../engine/text.js";
import {FOODDB, fuzzyFoods, isDrink, nutritionFor, searchFoods, sumNutrition} from "../../engine/nutrition.js";
import {nutrition, topLifts, weeklyCardio, weighIns, weightChange, weightTrend} from "../../engine/stats.js";
import {S, split} from "../../state.js";
import {fmtW, toDisp, wUnit} from "../../units.js";
import {esc, fmtN, num, pretty, r1, setLang, shortd, today} from "../../util.js";
import {backArrow} from "../nav.js";
import {doseText} from "../dose.js";
import {blockDay, blockNow} from "../../engine/blocks.js";
import {addDaysISO, estMinutes, nextDayOf, planOn} from "../../engine/dayplan.js";
import {adaptOf, avoids, standIn} from "../../engine/plan.js";
import {rangeFor} from "../../coach/landmarks.js";
import {OPL_NAME, simpleFacts, trendSays} from "../facts.js";
import {words} from "../coachwords.js";
import {glyph} from "../glyphs.js";

/* The most messages kept, newest last: thirty days of the history (KEEP_MS), bounded so
   a chatty month cannot grow the saved data without end. */
var KEEP=500;
/* The suggestions: what each asks, as the person would ask it. */
var ASK={
  today:"What do I train today?",weights:"How much should I lift?",eat:"What should I eat now?",
  week:"How was my week?",busy:"This machine is taken",track:"How am I doing?",weight:"Is my weight on track?",protein:"How much protein do I need?",
  calories:"Why are my calories set like this?",sore:"I'm sore or tired",missed:"I'm short on time today",
  balance:"Is my program balanced?",strong:"How strong am I?",goal:"Should I change my goal?",
  plan:"Build me a new plan",water:"How much water should I drink?",steps:"How are my steps and cardio?",
  help:"What can you answer?",tomorrow:"What do I train tomorrow?",last:"How did my last workout go?",
  rest:"What's left to eat today?",swap:"Other foods with the same macros",
  weekfood:"Work out what's left in the week",logfood:"Just log it and move on",weektrain:"Work out the rest of the week",
  letgo:"Just move on",lowday:"Adjust today for a low day",facts:"What have I told you?"};
/* What to offer next, after each kind of answer. */
var NEXT={
  week:["track","strong","protein"],today:["weights","tomorrow","missed"],weights:["today","strong","balance"],eat:["rest","swap","protein"],
  track:["weight","strong","balance"],weight:["calories","eat","goal"],protein:["eat","calories","track"],
  calories:["protein","weight","goal"],sore:["today","missed","balance"],missed:["today","weights","track"],
  balance:["today","strong","plan"],strong:["weights","track","balance"],goal:["calories","plan","weight"],
  plan:["today","eat","goal"],water:["eat","steps","track"],steps:["weight","water","track"],
  help:["today","eat","track"],hello:["today","eat","track"],thanks:["today","eat","track"],unknown:["today","eat","track"],
  tomorrow:["today","weights","last"],last:["strong","weights","tomorrow"],rest:["swap","protein","eat"],
  swap:["rest","protein","eat"],foodinfo:["swap","rest","protein"],
  exadd:["today","balance","tomorrow"],exremove:["today","balance","tomorrow"],exswap:["today","balance","weights"],
  foodlog:["rest","protein","eat"],weighlog:["weight","calories","track"],reassess:["plan","goal","today"],
  kreps:["weights","balance","today"],ksets:["balance","weights","today"],krest:["weights","today","missed"],kfreq:["balance","plan","today"],
  kvolume:["balance","strong","plan"],ktempo:["weights","today","strong"],kwarm:["today","weights","sore"],kdur:["missed","today","balance"],
  k1rm:["strong","weights","track"],scope:["today","track","help"],situation:["today","rest","track"],
  weekfood:["rest","protein","track"],logfood:["rest","eat","track"],weektrain:["today","tomorrow","balance"],letgo:["today","tomorrow","track"],
  lowday:["today","sore","missed"],remember:["facts","today","eat"],facts:["today","eat","track"],
  know:["today","eat","track"],app:["today","eat","track"],exsuggest:["today","balance","weights"]};

function fill(s,o){Object.keys(o).forEach(function(k){s=s.split("{"+k+"}").join(o[k]);});return s;}
function list(a){return a.join(S.prefs.lang==="ar"?"، ":", ");}
/* A meal's foods. The database names carry their own commas ("Lentils, Cooked"), so a
   comma between them would run two foods into one. */
function foods(a){return a.join(" + ");}
/* An answer: paragraphs (p), a list (l), a small note (n), and its buttons. */
function A(){return {b:[],acts:[],src:[]};}
function p(a,s){a.b.push({p:s});return a;}
function l(a,items){if(items.length)a.b.push({l:items});return a;}
function n(a,s){a.b.push({n:s});return a;}
/* Where a technical answer comes from: the knowledge entry, by file and section. */
var SRCNAME={"acute-variables":"Training variables","nutrition-principles":"Nutrition principles","scope":"Scope of practice"};
function src(a,ref){if(!ref)return a;var f=ref.split(" ")[0];a.src=(a.src||[]).concat([t(SRCNAME[f]||f)+" "+ref.slice(f.length+1)]);return a;}
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
  clashes(d.ex).forEach(function(c){p(a,fill(t("You said “{s}”, and {ex} is in it."),{s:c.said,ex:exName(c.name)}));});
  told(a,["schedule","obstacle"]);
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
function aHello(a){
  var nm=(S.profile.name||"").trim();
  return p(a,(nm&&nm!=="Me"?fill(t("Hi {n}."),{n:nm}):t("Hi."))+" "+t("Ask me about today's training, your food, or how things are going."));}
function aThanks(a){return p(a,t("Any time."));}
function aUnknown(a){
  return p(a,t("That isn't something I can answer from your log or what I know, so I won't guess.")+" "+t("I can answer these, or you can say it another way:"));}

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
function swapLine(it,f,kcal){
  var sw=swapsFor(f,kcal);
  if(!sw.length)return null;
  return (it?itemName(it):foodName(f))+(it&&it.grams?" "+fill(t("{n} g"),{n:Math.round(it.grams)}):"")+" → "
    +sw.map(function(x){return foodName(x.f)+" "+fill(t("{n} g"),{n:x.g});}).join(" · ");}
/* The food a question names, once its question words are taken out. */
var QWORDS=/\b(how|much|many|what|whats|is|are|there|the|a|an|in|of|for|to|on|does|do|contain|contains|has|have|with|same|macros|macro|calories|calorie|kcal|protein|carbs|carb|fat|fats|fiber|fibre|sugar|grams|gram|g|nutrition|facts|info|value|values|instead|swap|replace|alternative|alternatives|other|food|foods|options|can|i|eat|my|me|you|u|give|provide|please|per|serving)\b/g;
var QWORDS_AR=/(^| )(كام|كم|بروتين|سعر|سعره|سعرات|كارب|دهون|جرام|في|فيه|فيها|القيمه|الغذائيه|بديل|بدايل|بدائل|بدل|حاجه|تانيه|تاني|غير|نفس|الماكروز|الماكرو|عايز|عاوز|ايه|اي|انا|ممكن|اكل|للـ)(?= |$)/g;
function foodWords(q){return spell(fold(q)).replace(QWORDS," ").replace(QWORDS_AR," ").replace(/(^| )ل(?=ل)/g," ").replace(/\s+/g," ").trim();}
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

/* One item of a planned meal the question names, spelt as people type it ("the talibia
   grill in my lunch"): the meal it says, or every planned meal, item by item, a word
   of the item's name within a letter or two of a word of the question. */
function planItemNamed(q){
  var fq=fold(q),qw=foodWords(q).split(" ").filter(function(w){return w.length>=4;});
  if(!qw.length)return null;
  var slots=mealSlots().filter(function(x){return (x.plan||[]).length;}),named=null;
  for(var i=0;i<MEALWORD.length;i++)if(MEALWORD[i][1].test(fq)){named=MEALWORD[i][0];break;}
  if(named)slots=slots.filter(function(x){return x.id===named;}).concat(slots.filter(function(x){return x.id!==named;}));
  var best=null;
  slots.forEach(function(m){(m.plan||[]).forEach(function(it,i){
    var nw=fold(itemName(it)+" "+(it.n||"")).replace(/[^a-z\u0600-\u06ff ]/g," ").split(" ").filter(function(w){return w.length>=4;});
    var hits=qw.filter(function(w){return nw.some(function(x){return x===w||(w.length>=5&&editDist(w,x)<=2)||x.indexOf(w)===0||w.indexOf(x)===0;});}).length;
    if(hits&&(!best||hits>best.hits||(hits===best.hits&&m.id===named&&best.m.id!==named)))best={m:m,i:i,it:it,hits:hits};});});
  return best;}
function aSwap(a,q){
  /* One item of a planned meal: three foods that fit its place, each a tap away from
     going into the plan instead (js/ui/agent.js swapPick, with a confirmation). */
  var pi=null;try{pi=planItemNamed(q);}catch(e){pi=null;}
  if(pi){var pf=foodOf(pi.it),sw=pf?swapsFor(pf,num(pi.it.kcal)):[];
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
/* The program's lifts: not activities. */
function lifts(){var out=[];split().days.forEach(function(d){d.ex.forEach(function(e){if(!isActivity(e.name))out.push(e);});});return out;}
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
var MUSCLEWORD=[["Chest",/chest|pec|صدر/],["Back",/\bback\b|lats?\b|ضهر|ظهر/],["Shoulders",/shoulder|delt|كتف|اكتاف/],["Quads",/quad|thigh|legs?\b|رجل|فخذ|فخاد/],
  ["Hamstrings",/hamstring|خلفيه/],["Glutes",/glute|مؤخره/],["Biceps",/bicep|باي/],["Triceps",/tricep|تراي/],["Calves",/calf|calves|سمانه/]];
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
  n(a,t("The workout screen adds warm-up sets with + Warm-up."));
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

/* ---- the hard limits (js/knowledge/scope.js) ---------------------------------------
   Checked before anything else, however the question is put: no diagnosis, no injury
   assessment, no medical advice, no supplement or therapeutic-diet advice, no mental
   health care. The answer says who to see instead and what the app can show. */
var SCOPE=[
  ["mental","no_mental_health_care",/(depress|anxiety|anxious|panic attack|eating disorder|bulimi|anorexi|binge|purg|self harm|suicid|اكتئاب|مكتئب|قلق|اضطراب|نوبه هلع)/],
  ["medical","no_treatment",/(medicine|medication|painkiller|pain killer|ibuprofen|paracetamol|panadol|aspirin|pills?\b|antibiotic|steroid|injection|insulin|blood pressure|cholesterol|diabet|pregnan|heart condition|asthma|دوا|دواء|ادويه|مسكن|برشام|حبوب|حقنه|انسولين|سكر|ضغط|كوليسترول|حامل|حمل)/],
  ["diagnosis","no_diagnosis",/(diagnos|whats wrong with|what is wrong with|do i have|is it (torn|broken|fractured|sprained|a tear|serious)|tendon|tendinitis|tendonitis|hernia|arthritis|sciatica|\btorn\b|tear in|fractur|sprain|dislocat|meniscus|ligament|rotator cuff|slipped disc|herniat|تشخيص|عندي ايه|مقطوع|قطع في|كسر|التواء|ملخ|خشونه|انزلاق|غضروف|رباط|اربطه|وتر)/],
  ["supplement","no_nutrition_or_supplement_advice",/(supplement|creatine|pre.?workout|fat burner|vitamin|mineral pill|مكمل|مكملات|كرياتين|فيتامين|حارق)/]];
function scopeOf(q){var fq=fold(q);for(var i=0;i<SCOPE.length;i++)if(SCOPE[i][2].test(fq))return SCOPE[i];return null;}
function aScope(a,q){
  var sc=scopeOf(q)||SCOPE[2],ar=areaOf(fold(q)),rule=KB.scopeRule(sc[1]);
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
  if(ar)trainAround(a,ar);
  act(a,t("Log it"),{"data-sheet":"recovery"});
  return src(a,rule&&rule.src);}

/* ---- outside what the coach knows: what was understood, and where to go ------------- */
var ELSEWHERE=[
  ["you",/(height|how tall|tall am|my age|how old|birthday|birth date|my sex|gender|my name|طولي|الطول|طول|سني|عمري|السن|اسمي)/],
  ["nodata",/(heart rate|resting hr|\bhrv\b|vo2|sleep score|body fat scan|blood|bpm|نبض|ضربات القلب)/]];
function aElse(a,q){
  var fq=fold(q),hit=ELSEWHERE.filter(function(x){return x[1].test(fq);})[0];
  if(hit&&hit[0]==="you"){
    p(a,t("That's in Profile > You, with your age, height and weight. Want me to open it?"));
    return act(a,t("Open it"),{"data-sheet":"set_you"});}
  if(hit&&hit[0]==="nodata"){
    p(a,t("That's not something I have data on. I can show you how your training and weight are going."));
    return act(a,t("How am I doing?"),{"data-chatq":"track","data-chatl":uiLang()});}
  return aUnknown(a);}

/* ---- anything else the knowledge files answer -------------------------------------
   A question none of the answers above is for, looked up across the whole knowledge
   base (js/engine/kbsearch.js): what it says, lead first, then what of the person's own
   log and targets bears on it, and where in the app to act on it. The knowledge files
   are English data, so their lines stay English in an Arabic answer, as food names do.
   A search that finds nothing good is not an answer: aElse says so. */
function sexLine(s){var x=S.profile.sex;
  return x==="f"?!/^(Men|Male)\b/.test(s):x==="m"?!/^(Women|Female)\b/.test(s):true;}
function lastNights(){
  var out=[];for(var i=0;i<7;i++){var r=S.days[addDaysISO(today(),-i)];if(r&&num(r.sleep)>0)out.push(num(r.sleep));}
  return out;}
/* The person's side: by what the passage is about. */
function mine(a,k){
  var tt=k.doc.file+" "+k.doc.top+" "+k.doc.title,g=S.goals||{},r=S.days[today()]||{};
  if(/sleep/i.test(tt)){
    var ns=lastNights();
    if(ns.length)p(a,fill(t("You logged {h} hours a night on average over your last {n} nights."),{h:r1(ns.reduce(function(x,y){return x+y;},0)/ns.length),n:ns.length}));
    else if(num(S.profile.sleep))p(a,fill(t("In the assessment you said you sleep about {h} hours."),{h:r1(num(S.profile.sleep))}));
    return act(a,t("Log sleep and energy"),{"data-sheet":"recovery"});}
  if(/hydration|fluid|water/i.test(tt)){
    if(g.water)p(a,fill(t("Your target is {g} ml a day. Today so far: {d} ml."),{g:fmtN(g.water),d:fmtN(r.water||0)}));
    return act(a,t("Add a glass"),{"data-water":"250","data-wdate":today()});}
  if(/protein/i.test(tt)&&g.p){p(a,fill(t("Your target is {p} g a day."),{p:g.p}));return act(a,t("Targets"),{"data-csec":"food","data-cfsub":"targets"});}
  if(/carbohydrate|lipid|fat|energy|calori|weight management|macronutrient/i.test(tt)&&g.kcal){
    p(a,fill(t("Your targets: {k} kcal, {p} g protein, {c} g carbs, {f} g fat a day."),{k:fmtN(g.kcal),p:g.p||0,c:g.c||0,f:g.f||0}));
    return act(a,t("Targets"),{"data-csec":"food","data-cfsub":"targets"});}
  if(k.area==="cardio"){var c=weeklyCardio();
    p(a,fill(t("Cardio this week: {m} of the {t} minutes of moderate activity health guidelines suggest."),{m:c.min,t:c.target}));
    return act(a,t("Log or start an activity"),{"data-actsheet":"1"});}
  if(k.area==="train"&&S.onboarded){var sp=split(),dd=sp&&sp.days?sp.days.filter(function(d){return d.ex.length;}).length:0;
    if(dd)p(a,fill(t("Your program has {n} training days a week."),{n:dd}));
    return act(a,t("Open my program"),{"data-csec":"train","data-ctsub":"program"});}
  if(k.area==="mobility")return act(a,t("Open Training"),{"data-tab":"train"});
  return a;}
function aKnow(a,q,it){
  var k=it&&it.know||lookup(q);
  if(!k)return aElse(a,q);
  var lines=k.lines.filter(sexLine),also=k.also.filter(sexLine);
  if(it&&it.deeper){lines=lines.slice(1);if(!lines.length&&!also.length)lines=k.lines.slice(0,1);}
  var lead=k.needsFigure&&k.figure&&sexLine(k.figure)?k.figure:lines[0]||k.lines[0];
  /* Asked for a figure the knowledge does not hold: said so, then what it does hold. */
  if(k.needsFigure&&!k.figure)p(a,t("There's no single number for that. What holds:")+" "+lead+".");
  else p(a,/[.!?]$/.test(lead)?lead:lead+".");
  l(a,lines.filter(function(x){return x!==lead;}).concat(also.filter(function(x){return x!==lead&&lines.indexOf(x)<0;})).slice(0,5));
  tailor(a,k);
  return mine(a,k);}
/* The answer for this person: their goal's prescription when the passage is about how
   to train, a word when what they told the assessment changes it, and what they told
   the coach that bears on it. */
var VIGOROUS=/hiit|interval|plyometric|sprint|vigorous|maximal|power/i;
function tailor(a,k){
  var pr=S.profile||{},tt=k.doc.file+" "+k.doc.title,AD=adaptOf(pr.goal),G=goalOf(pr.goal);
  if(S.onboarded&&AD&&/acute-variables|phases/.test(k.doc.file)&&/rep|set|rest|volume|intensity|tempo|adaptation|frequency|system/i.test(tt))
    p(a,fill(t("For your goal, {g}: {s} sets of {r} reps an exercise, {rest} rest."),
      {g:t(G.label).toLowerCase(),s:AD.sets.min+"–"+AD.sets.max,r:AD.reps.min+"–"+AD.reps.max,
       rest:AD.restS.min?fill(t("{a}–{b} s"),{a:AD.restS.min,b:AD.restS.max}):fill(t("up to {b} s"),{b:AD.restS.max})}));
  if((pr.health||[]).length&&VIGOROUS.test(tt+" "+k.lines.join(" ")))
    n(a,t("You ticked a health question in the assessment: keep to moderate effort until a doctor or a qualified exercise professional has cleared you."));
  if((pr.limits||[]).length&&/stretch|mobility|flexib|posture|movement|squat|lunge|press/i.test(tt))
    n(a,t("Mind what you said hurts: stop anything that brings it on."));
  told(a,/food|nutrition|hydration|protein|carbohydrate|lipid/i.test(tt)?["preference","constraint","obstacle"]:["schedule","obstacle","constraint"],/nutrition/.test(k.doc.file));}

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
    return act(a,t("Log it"),{"data-sheet":"recovery"});}
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
/* What they told the coach that bears on this answer, said back in their words. */
/* Food answers say back only what is about food, by its own words. */
var FOODSAID=/(eat|food|diet|meal|allerg|vegan|vegetarian|pork|dairy|lactose|gluten|halal|fast|اكل|باكل|بكل|دايت|حساسيه|نباتي|لبن|صيام|صايم)/;
function told(a,kinds,food){
  var f=listFacts(S.context).filter(function(x){return kinds.indexOf(x.kind)>=0&&(!food||FOODSAID.test(fold(x.text)));});
  if(f.length)n(a,t("You told me:")+" "+f.map(function(x){return "“"+x.text+"”";}).join(" · "));
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
function withTold(fn,kinds,food){return function(a,q,it){fn(a,q,it);return told(a,kinds,food);};}
var ANSWER={week:aWeek,today:aToday,weights:aWeights,eat:aEat,track:aTrack,weight:aWeight,protein:aProtein,calories:aCalories,
  sore:aSore,missed:aMissed,balance:aBalance,strong:aStrong,goal:aGoal,plan:aPlan,water:aWater,steps:aSteps,
  help:aHelp,hello:aHello,thanks:aThanks,unknown:aElse,know:aKnow,tomorrow:aTomorrow,last:aLast,rest:aRest,swap:aSwap,foodinfo:aFoodInfo,
  kreps:aKReps,ksets:aKSets,krest:aKRest,kfreq:aKFreq,kvolume:aKVolume,ktempo:aKTempo,kwarm:aKWarm,kdur:aKDur,k1rm:aK1RM,
  scope:aScope,reassess:aReassess,situation:function(a,q,it){return aSituation(a,q,it,it.sit||{kind:"day"});},weekfood:aWeekFood,logfood:aLogFood,weektrain:aWeekTrain,letgo:aLetGo,lowday:aLowDay,
  remember:aRemember,facts:aFacts};
["missed","kfreq","kdur","weektrain"].forEach(function(k){ANSWER[k]=withTold(ANSWER[k],["schedule","obstacle"]);});
["eat","rest","weekfood","swap"].forEach(function(k){ANSWER[k]=withTold(ANSWER[k],["preference","constraint","obstacle"],true);});

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
function route(iid,text,it){
  var fq0=fold(text);
  for(var vi=0;vi<VERB.length;vi++)if(VERB[vi][1].test(fq0)&&!(VERB[vi][0]==="foodlog"&&/^log /.test(fq0)&&/weight|وزن/.test(fq0))){iid=VERB[vi][0];break;}
  var asked=/\?|؟|on track|stuck|should|why|how|ماشي|ليه|ازاي/.test(fold(text)+(/[?؟]/.test(text)?" ?":""));
  if((iid==="weight"||iid==="weighlog")&&it.kg&&!asked)return "weighlog";
  if(iid==="weighlog"&&!it.kg)return (it.ranked||[]).filter(function(x){return x!=="weighlog";})[0]||"weight";
  if(iid==="exswap"&&!namesExercise(text)&&namesFood(text))return "swap";
  if(iid==="swap"&&/ instead of | in place of /.test(" "+fq0+" ")&&namesExercise(text)&&!namesFood(text))return "exswap";
  if(iid==="exadd"&&!namesExercise(text)&&namesFood(text))return "foodlog";
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
  var c=S.chat||[],now=Date.now(),kept=c.filter(function(m){return m&&typeof m==="object"&&num(m.at)>now-KEEP_MS;});
  if(kept.length!==c.length){S.chat=kept;return true;}
  return false;}
/* The conversation as the chat shows it: today's day of it, since it was last cleared. */
function chatShown(){
  var from=Math.max(Date.now()-DAY,num(S.chatFrom));
  return (S.chat||[]).filter(function(m){return m&&typeof m==="object"&&num(m.at)>from;});}
/* Whether the history holds more than the chat shows: then the chat offers it. */
function hasOlder(){return (S.chat||[]).length>chatShown().length;}
/* The way from the chat to its history, at the top of the conversation. */
function histLink(){
  return hasOlder()?'<button class="chat-histl" data-chathist="1">'+glyph("clock")+'<span>'+esc(t("Review chat history"))+'</span></button>':'';}
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
var EXQ=/\b(exercises?|moves?|movements?|lifts?)\b.*\b(for|to (build|grow|train|work|target|hit))\b|\b(best|good|what|which|suggest|recommend)\b.*\b(exercises?|moves?|lifts?)\b|\b(train|work|hit|grow|build)\b.*\b(chest|back|shoulders?|quads?|legs?|hamstrings?|glutes?|biceps?|triceps?|calves)\b.*\?|تمارين|تمرين ل/;
var ONTO=/^(yeah|yes|ok|okay|but|and|so|hmm|well|what about|how about|then|طب|طيب|بس|و|يعني|ماشي|اه)( |$)/;
var DEEPER=/^(why|how come|more|tell me more|explain|details|go on|really|ليه|ازاي|اكتر|وضح|كمل)( |$)/;
function knowFor(text,iid,it,prev){
  var fq=fold(text),short=fq.split(" ").length<=8;
  if(prev&&prev.id==="know"&&prev.kq&&DEEPER.test(fq)&&short){var kd=lookup(prev.kq);if(kd)return {k:kd,kq:prev.kq,deeper:true};}
  var asked=ASKQ.test(fq)||/[?؟]/.test(text);
  /* What lives in the app has its own answer (aElse: Profile > You, no data), and pain
     is referred, never looked up (aSore → aScope). */
  if(ELSEWHERE.some(function(x){return x[1].test(fq);})||PAIN.test(fq))return null;
  var loose=iid==="unknown"||(SOFT.test(iid)&&it.score<=7&&asked)||(DEFINE.test(fq)&&it.score<15&&(SOFT.test(iid)||iid==="eat"));
  if(!loose)return null;
  var k=lookup(text);
  if(k&&(iid==="unknown"||k.titled))return {k:k,kq:text};
  /* Not enough on its own: read with the question before it. */
  var base=prev&&(prev.kq||prev.q);
  /* "ok" alone says nothing new: only a follow-up with a word of its own is read on. */
  if(iid==="unknown"&&base&&ownTerms(text).length&&(ONTO.test(fq)||fq.split(" ").length<=4)){var kc=lookup(base+" "+text);if(kc)return {k:kc,kq:base+" "+text};}
  return null;}
function ask(q,id,lang){
  pruneChat();
  /* A short answer to the last question: yes or no to a change waiting for a tap is that
     tap (the caller runs it; nothing is added to the conversation). */
  var prev=id?null:lastExchange(),fq0=id?"":fold(q);
  if(prev&&prev.ag&&prev.ag.s==="confirm"&&(YES.test(fq0)||NO.test(fq0)))
    return {tap:YES.test(fq0)?{agok:String(prev.at)}:{agno:String(prev.at)}};
  var it=id?{id:id,ranked:[]}:intentOf(q);
  /* "yes" to a choice: the choice is still to make, so it is asked again. */
  if(prev&&prev.ag&&prev.ag.s==="pick"&&(YES.test(fq0)||NO.test(fq0))){
    var Lp=prev.lang==="ar"||prev.lang==="en"?prev.lang:uiLang();
    var again=withLang(Lp,function(){return {q:String(q).trim().slice(0,300),id:prev.id,at:Date.now(),b:[],acts:[],lang:Lp,
      ag:NO.test(fq0)?{s:"say",lead:t("Kept as it is."),acts:[]}:Object.assign({},prev.ag,{lead:t("Which one? Tap it, or say its name.")})};});
    S.chat=(S.chat||[]).concat([again]).slice(-KEEP);return again;}
  var L=id?(lang==="ar"||lang==="en"?lang:uiLang()):it.lang==="ar"?"ar":"en";
  var msg=withLang(L,function(){
    var text=id?t(ASK[id]||""):String(q).trim().slice(0,300),iid=it.id;
    /* The workout's own suggestion: a machine taken is a request, not a question. */
    if(id==="busy"){var cb=null;try{cb=planCommand({cmd:"ex.busy"});}catch(e){cb=null;}
      if(cb)return {q:text,id:"app",at:Date.now(),b:[],acts:cb.acts||[],ag:cb,lang:L};}
    if(!id){
      /* The hard limits first, whatever else the question seems to be. */
      var sit=null,cm=null;
      if(scopeOf(text))iid="scope";
      /* Something to do in the app: it is done, or asked for, the way its button does. */
      else if(S.onboarded&&(cm=commandOf(text))){
        var cg=null;try{cg=planCommand(cm);}catch(e){cg=null;}
        if(cg)return {q:text,id:"app",at:Date.now(),b:[],acts:cg.acts||[],ag:cg,lang:L};}
      /* A report rather than a question or a request: one question back. */
      else if(!VERB.some(function(v){return v[0]!=="foodlog"&&v[1].test(fold(text));})&&(sit=situationOf(text))){iid="situation";it.sit=sit;}
      else if(factOf(text))iid="remember";
      else iid=route(iid,text,it);
      /* Not phrased as anything known, but it names an exercise in the plan, or a
         food by its name: that is what it is about. A near miss is not a match. */
      if(iid==="unknown"){
        if(namedExercises(text).length)iid="weights";
        else if(FOODDB&&!YES.test(fold(text))&&!NO.test(fold(text))&&namedFood(text,true))iid="foodinfo";}}
    /* A follow-up: the answer to the last pick ("Is it pull ups?", "the second one"),
       or the same request again for something else ("and squats"). */
    if(!id&&prev&&iid!=="scope"&&iid!=="situation"&&iid!=="remember"){
      if(prev.ag&&prev.ag.s==="pick"&&(iid==="unknown"||iid===prev.id||MORE.test(fold(text)))){
        var nx=null;try{nx=answerPick(prev.ag,text);}catch(e){nx=null;}
        if(nx)return {q:text,id:prev.id,at:Date.now(),b:[],acts:nx.acts||[],ag:nx,lang:L};}
      if(/^(exadd|exremove|exswap|foodlog)$/.test(prev.id)&&(iid==="unknown"||MORE.test(fold(text)))
        &&(prev.id==="foodlog"?namesFood(text):namesExercise(text.replace(MORE,""))))iid=prev.id;}
    /* "What exercises for chest?", "best exercise for glutes at home", "تمارين صدر": the
       library, chosen for this person (js/ui/agent.js suggestExercises). */
    if(!id&&S.onboarded&&iid!=="scope"&&iid!=="situation"&&!/^(exadd|exremove|exswap)$/.test(iid)&&EXQ.test(fold(text))){
      var mw=MUSCLEWORD.filter(function(x){return x[1].test(fold(text));})[0];
      if(mw){var sg=null;try{sg=suggestExercises(mw[0]);}catch(e){sg=null;}
        if(sg)return {q:text,id:"exsuggest",at:Date.now(),b:[],acts:sg.acts||[],ag:sg,lang:L};}}
    if(!id&&iid!=="scope"&&iid!=="situation"&&iid!=="remember"){
      var kn=null;try{kn=knowFor(text,iid,it,prev);}catch(e){kn=null;}
      if(kn){iid="know";it.know=kn.k;it.kq=kn.kq;it.deeper=!!kn.deeper;}}
    if(ACTION_IDS.indexOf(iid)>=0&&iid!=="reassess"&&S.onboarded){
      var ag=null;try{ag=planAction(iid,text,it);}catch(e){ag=null;}
      if(ag)return {q:text,id:iid,at:Date.now(),b:[],acts:ag.acts||[],ag:ag,lang:L};
      iid="unknown";}
    var a=A(),fn=ANSWER[iid]||aUnknown;
    if(!S.onboarded&&/^(today|tomorrow|weights|eat|rest|swap|weight|protein|calories|missed|balance|goal|exadd|exremove|exswap|foodlog|weighlog|kreps|ksets|krest|kfreq|kvolume|kdur)$/.test(iid)){
      p(a,t("First, the assessment: a few questions, and the coach builds your targets, training and meals. Then I can answer from your own plan."));
      act(a,t("Start the assessment"),{"data-setup":"1"});}
    else{try{fn(a,text,it);}catch(e){a=aUnknown(A());}}
    return {q:text,id:iid,at:Date.now(),b:a.b,acts:a.acts,src:a.src&&a.src.length?a.src:undefined,ag:a.ag,lang:L,kq:iid==="know"?it.kq:undefined};});
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

/* ---- on screen ------------------------------------------------------------------
   Not a chatbot's look: a question is a short line on the reading side, and an answer
   is a card that names what it is about, with its lists as ruled rows, its notes set
   apart, and its buttons last. Nothing is coloured by who said it; the accent is kept
   for the one button an answer leads to. */
/* What each answer is about, and its glyph (js/ui/glyphs.js). */
var TOPIC={week:["Your week","bars"],today:["Today's workout","dumbbell"],weights:["What to lift","dumbbell"],eat:["What to eat","bowl"],
  track:["How you're doing","bars"],weight:["Weight trend","scale"],protein:["Protein","shaker"],calories:["Calories","flame"],
  sore:["Recovery","moon"],missed:["Short on time","clock"],balance:["Program balance","balance"],strong:["Strength","medal"],
  goal:["Your goal","target"],plan:["A new plan","clipboard"],water:["Water","drop"],steps:["Steps and cardio","route"],
  help:["What I can answer","question"],tomorrow:["Tomorrow's workout","dumbbell"],last:["Last workout","bars"],
  rest:["The rest of today","bowl"],swap:["Food swaps","balance"],foodinfo:["Food facts","info"],
  exadd:["Change your program","clipboard"],exremove:["Change your program","clipboard"],exswap:["Change your program","swap"],
  foodlog:["Log food","bowl"],weighlog:["Weigh-in","scale"],reassess:["A new plan","clipboard"],
  kreps:["Reps","dumbbell"],ksets:["Sets","dumbbell"],krest:["Rest between sets","clock"],kfreq:["How often to train","clock"],
  kvolume:["Weekly volume","balance"],ktempo:["Tempo","clock"],kwarm:["Warming up","flame"],kdur:["Session length","clock"],
  k1rm:["One-rep max","medal"],scope:["Outside what I do","info"],situation:["A rough day","moon"],
  weekfood:["The week's food","bowl"],logfood:["The week's food","bowl"],weektrain:["The week's training","dumbbell"],letgo:["The week's training","dumbbell"],
  lowday:["A low day","moon"],remember:["What you told me","person"],facts:["What you told me","person"],
  know:["Good to know","spark"],app:["In the app","check"],exsuggest:["Exercises for you","dumbbell"]};
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
/* ro: in the history, to read: no button in it does anything, so none is drawn. */
function bubble(m,live,prev,ro){
  var L=m.lang==="ar"||m.lang==="en"?m.lang:uiLang();
  return withLang(L,function(){return bubbleIn(m,ro?false:live,L,prev,ro);});}
/* An answer reads as one or two sentences; the rest is behind More. */
function sentences(s){
  var out=[],re=/[.!?؟]\s+/g,mm,from=0;
  while((mm=re.exec(s))){out.push(s.slice(from,mm.index+1));from=re.lastIndex;}
  out.push(s.slice(from));
  return out.filter(function(x){return x.trim();});}
/* The lead's figures stand out, each in .num so bidi keeps it one run. */
function figures(s){
  return String(s).split(/(\d[\d,.:×–]*\d|\d)/).map(function(x,i){return i%2?'<span class="num">'+esc(x)+'</span>':esc(x);}).join("");}
function blocks(list){
  var h="";
  list.forEach(function(x){
    if(!x)return;
    if(x.p!=null)h+='<p>'+esc(String(x.p))+'</p>';
    else if(Array.isArray(x.l))h+='<ul class="chat-l">'+x.l.map(function(i){return '<li>'+esc(String(i))+'</li>';}).join("")+'</ul>';
    else if(x.n!=null)h+='<p class="chat-n">'+glyph("info")+'<span>'+esc(String(x.n))+'</span></p>';});
  return h;}
/* A kept conversation comes back from storage and from backups, so a button is only
   ever its label and data-* attributes the app itself acts on. */
function buttons(acts){
  return acts.length?'<div class="chat-acts">'+acts.map(function(b,i){
    var at=Object.keys(b.a||{}).filter(function(k){return /^data-[a-z]+$/.test(k);})
      .map(function(k){return ' '+k+'="'+esc(b.a[k])+'"';}).join("");
    return '<button class="btn '+(i?'g ':'')+'sm"'+at+'>'+esc(String(b.l||""))+'</button>';}).join("")+'</div>':"";}
/* A request: what will change and the tap that does it; done, with Undo; undone; or the
   one piece still missing, its real choices as rows. Every value here was worked out
   when the request was made and kept with it, so it shows as it was said. */
var AGSTATE={confirm:1,applied:1,undone:1,declined:1,failed:1,pick:1,say:1};
function agHtml(m,live,ro){
  var g=m.ag,at=esc(String(m.at)),h=g.lead?'<p class="chat-lead">'+figures(String(g.lead))+'</p>':'';
  if(g.s==="confirm"||g.s==="applied"||g.s==="undone"||g.s==="declined"||g.s==="failed"){
    if(g.item)h+='<div class="ag-item"><b>'+esc(String(g.item))+'</b>'+(g.detail?'<span>'+figures(String(g.detail))+'</span>':'')+'</div>';}
  if(g.s==="confirm"&&live)h+='<div class="ag-acts"><button class="btn ag-ok" data-agok="'+at+'">'+esc(String(g.cta||t("Do it")))+'</button>'
    +'<button class="btn g ag-no" data-agno="'+at+'">'+esc(t("Not now"))+'</button></div>';
  else if(g.s==="applied")h+='<div class="ag-done" role="status"><span class="ag-ck">'+glyph("check")+'</span><span class="ag-t">'+esc(String(g.done||""))+'</span>'
    +(!ro&&canUndo(m.at)?'<button class="ag-undo" data-agundo="'+at+'">'+esc(t("Undo"))+'</button>':'')+'</div>';
  else if(g.s==="undone")h+='<div class="ag-undone" role="status">'+glyph("restore")+'<span>'+esc(String(g.undone||""))+'</span></div>';
  else if(g.s==="declined")h+='<p class="chat-n">'+glyph("info")+'<span>'+esc(t("Kept as it is."))+'</span></p>';
  else if(g.s==="failed")h+='<p class="chat-n">'+glyph("info")+'<span>'+esc(t("That didn't go through. Nothing was changed."))+'</span></p>';
  else if(g.s==="pick"&&live)h+='<div class="ag-opts'+(g.what==="muscle"?' two':'')+'">'+(g.opts||[]).map(function(o,i){
      return '<button class="ag-opt" data-agpick="'+at+'|'+i+'"><span class="ag-ol">'+esc(String(o.l||""))+'</span>'+(o.sub?'<span class="ag-os">'+esc(String(o.sub))+'</span>':'')+'</button>';}).join("")
    +(g.none?'<button class="ag-opt none" data-agnone="'+at+'"><span class="ag-ol">'+esc(t("None of these"))+'</span></button>':'')+'</div>';
  if(g.s==="say"&&live)h+=buttons(Array.isArray(g.acts)?g.acts:[]);
  return h;}
function bubbleIn(m,live,L,prev,ro){
  var tp=TOPIC[m.id];
  var h='<div class="chat-x'+(live?' live':'')+(prev?' prev':'')+(ro?' ro':'')+'" data-k="'+(ro?'h':'x')+esc(String(m.at||""))+'" lang="'+L+'" dir="'+(L==="ar"?"rtl":"ltr")+'"><div class="chat-q"><p dir="auto">'+esc(String(m.q||""))+'</p></div><div class="chat-a">'
   +'<div class="chat-ah"><span class="chat-gl">'+glyph(tp?tp[1]:"question")+'</span><span class="chat-ah-t">'
   +'<span class="chat-ak">'+esc(t("Coach"))+'</span>'+(tp?'<span class="chat-at">'+esc(t(tp[0]))+'</span>':'')+'</span></div>';
  if(m.ag&&typeof m.ag==="object"&&AGSTATE[m.ag.s])return h+agHtml(m,live,ro)+'</div></div>';
  /* Where an answer stands is kept with it, not shown: the coach speaks as a coach. */
  var srcs=Array.isArray(m.src)?m.src:[];
  if(srcs.length)h=h.replace('<div class="chat-a">','<div class="chat-a" data-src="'+esc(srcs.join(" · "))+'">');
  var b=(Array.isArray(m.b)?m.b:[]).filter(Boolean),lead="",more=b;
  if(b[0]&&b[0].p!=null){
    var ss=sentences(String(b[0].p));lead=ss.slice(0,2).join(" ");
    more=(ss.length>2?[{p:ss.slice(2).join(" ")}]:[]).concat(b.slice(1));}
  if(lead)h+='<p class="chat-lead">'+figures(lead)+'</p>';
  if(!lead)h+=blocks(more);
  else if(more.length)h+='<details class="chat-more"><summary>'+esc(t("More"))+'</summary>'+blocks(more)+'</details>';
  h+=buttons(live&&Array.isArray(m.acts)?m.acts:[]);
  return h+'</div></div>';}

/* The screen: a header that says where the answers come from, then either what can be
   asked or the conversation and what to ask next, and a box to type in that stays in
   reach above the dock. */
function vChat(){
  var log=chatShown(),last=log[log.length-1];
  var h='<div class="chat-head">'+backArrow()
   +'<div class="chat-head-t"><h1>'+esc(t("Ask the coach"))+'</h1>'
   +'<p class="chat-priv">'+glyph("lock")+'<span>'+esc(t("From your log, worked out on this phone"))+'</span></p></div>'
   +(log.length?'<button class="icobtn chat-clear" data-chatclear="1" aria-label="'+esc(t("Clear"))+'">'+glyph("trash")+'</button>':'')
   +'</div>';
  h+='<div class="chat" role="log" aria-live="polite">'+histLink();
  if(!log.length){
    h+='<div class="chat-orb" aria-hidden="true">'+glyph("whistle")+'</div>'
     +'<p class="chat-hi">'+esc(t("Ask me about today's training, your food, or how things are going. Tap a question, or type your own, in English or Arabic."))+'</p>'
     +GROUPS.map(function(g){
        return '<section class="chat-grp"><h2 class="chat-grp-h">'+esc(t(g[0]))+'</h2>'
         +'<div class="chat-topics">'+g[1].map(topicRow).join("")+'</div></section>';}).join("")
     +'<p class="chat-dis">'+esc(t("Answers come from your own log, plan and targets, worked out on this phone. Nothing you type leaves it."))+'</p>';}
  log.forEach(function(m,i){h+=bubble(m,i===log.length-1);});
  h+='</div>';
  if(last)h+=askNext(last,log.length);
  h+='<div class="chat-form"><input id="chatq" type="text" enterkeyhint="send" autocomplete="off" maxlength="300" placeholder="'
   +esc(t("Ask a question"))+'" aria-label="'+esc(t("Ask a question"))+'">'
   +'<button class="chat-send" data-chatsend="1" aria-label="'+esc(t("Ask"))+'">'+glyph("send")+'</button></div>';
  return h;}

/* What to ask next, in the conversation's language (the floating Coach shows it too).
   After the first answer it is a list under its heading, a way in; after that (n, the
   answers so far, above 1) one slim row that scrolls sideways, so it never takes the
   conversation's room (owner, 27 Oct). */
function askNext(last,n){
  var LL=last.lang==="ar"||last.lang==="en"?last.lang:uiLang(),own=LL!==uiLang()?LL:"",slim=n>1;
  return withLang(LL,function(){return '<div class="chat-next'+(slim?' slim':'')+'" lang="'+LL+'" dir="'+(LL==="ar"?"rtl":"ltr")+'"'
    +(slim?' role="group" aria-label="'+esc(t("Ask next"))+'">':'><div class="chat-next-h">'+esc(t("Ask next"))+'</div>')
    +chips(NEXT[last.id]||NEXT.unknown,"",own)+'</div>';});}

/* ---- the chat history (Profile → Chat history) ----------------------------------
   Thirty days of the conversation, by day, newest day first, to read: nothing in it
   can be sent or tapped into doing something. One button deletes it all, with Undo. */
function histSheet(){
  pruneChat();
  var log=(S.chat||[]).filter(function(m){return m&&typeof m==="object"&&num(m.at)>0;}),days={},order=[];
  log.forEach(function(m){var d=new Date(num(m.at)),k=d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate();
    if(!days[k]){days[k]=[];order.push(k);}days[k].push(m);});
  var h='<h2>'+esc(t("Chat history"))+'</h2><p class="tiny">'
   +esc(t("Your conversations with the coach from the last 30 days, to read. Older days are removed; the chat itself shows the last 24 hours."))+'</p>';
  if(!log.length)return h+'<p class="chh-empty">'+esc(t("Nothing here yet."))+'</p>';
  order.reverse().forEach(function(k){var ms=days[k];
    h+='<section class="chh-day"><h3 class="sg-h">'+esc(dayWord(num(ms[0].at)))+'</h3>'
     +ms.map(function(m){return bubble(m,false,false,true);}).join("")+'</section>';});
  return h+'<div class="sacts"><button class="btn d" data-chathistdel="1">'+esc(t("Delete chat history"))+'</button></div>';}
/* Today, Yesterday, or the date. */
function dayWord(at){
  var d=new Date(at),n=new Date(),y=new Date(n.getTime()-DAY),same=function(a,b){return a.toDateString()===b.toDateString();};
  if(same(d,n))return t("Today");
  if(same(d,y))return t("Yesterday");
  return shortd(d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"));}

export {ASK, ask, askNext, bubble, chatShown, findMsg, follow, histLink, histSheet, NEXT, pruneChat, vChat};

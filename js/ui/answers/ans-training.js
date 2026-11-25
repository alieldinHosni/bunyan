/* Bunyan — the coach's answers: why a lift is stuck, the program, tomorrow and the last workout (js/ui/answers/answers.js gathers them;
   road map step 4, 25 Nov: split by topic as they were, no answer's words or figures changed). */
import {t, tm} from "../../i18n/dict.js";
import {act, fill, l, list, n, p, rd, src, uiLang} from "./kit.js";
import {exName, planName} from "../../i18n/exnames.js";
import {goalOf} from "../../data/goals.js";
import {isActivity} from "../../data/activities.js";
import {fold, intentOf} from "../../coach/intent.js";
import {addDays as addDaysW} from "../../engine/schedule.js";
import {muscleOf} from "../../data/exercises.js";
import {cooldownFor, warmupFor} from "../../engine/warmup.js";
import {faqRank} from "../../engine/faq.js";
import {guardNums} from "../../coach/guard.js";
import {LANDMARKS} from "../../coach/landmarks.js";
import * as KB from "../../engine/kb.js";
import {lookup} from "../../engine/kbsearch.js";
import {weeklySets} from "../../engine/volume.js";
import {checkPlans} from "../../engine/plancheck.js";
import {fuelLine, todayPlan} from "../../engine/head.js";
import {afterNote, beforeNote, MINTIMED} from "../../engine/dayfuel.js";
import {coachNow, standingNow} from "../../engine/coachinfo.js";
import {learnedNow, maintenanceInUse} from "../../engine/energy.js";
import {bestE1RM, bmr, bwShare, dbTotal, deloadDue, plateauOf, e1RM, eatenToday, energyMissing, inDeload, kcalFloor, lastWeight, loadText, macroTargets, prFor, sessionVolume, targetKcal, tdee, tdeeFormula} from "../../engine/formulas.js";
import {mealSlots} from "../../engine/meals.js";
import {nutrition, topLifts, weeklyCardio, weighIns, weightChange, weightTrend} from "../../engine/stats.js";
import {S, split} from "../../state.js";
import {fmtW, toDisp, wUnit} from "../../units.js";
import {fmtN, num, pretty, r1, shortd, today} from "../../util.js";
import {FAT_RANGE, fatBand} from "../../engine/inbody.js";
import {doseText} from "../dose.js";
import {correctiveFor} from "../../engine/corrective.js";
import {addDaysISO, estMinutes, nextDayOf, planOn} from "../../engine/dayplan.js";
import {avoids, limitsOf} from "../../engine/plan.js";
import {rangeFor} from "../../coach/landmarks.js";
import {OPL_NAME, trendSays} from "../facts.js";
import {words} from "../coachwords.js";
import {ASK} from "../ask.js";
import {PAIN, areaOf, lifts, namedExercises} from "./route.js";
import {liveLearned} from "./ans-core.js";
import {aScope, lastNights, mode, range} from "./ans-know.js";
import {kcalOn} from "./ans-report.js";
import {aTired, dayName} from "./ans-named.js";

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

export {AREAASK, FAQMINE, GOALWORD, aBalance, aCalories, aFaq, aGoal, aHello, aHelp, aInBody, aLast, aLoadLog, aMissed, aPlan, aPlateau, aProtein, aSore, aSteps, aStrong, aThanks, aTomorrow, aTwice, aUnknown, aWarmPlan, aWater, aWeight, faqSlots, macroTargetsFor, nearOf};

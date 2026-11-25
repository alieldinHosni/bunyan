/* Bunyan — the coach's answers: a report, what the person has told the coach, and requests (js/ui/answers/answers.js gathers them;
   road map step 4, 25 Nov: split by topic as they were, no answer's words or figures changed). */
import {t, tm} from "../../i18n/dict.js";
import {act, fill, l, list, n, p, uiLang} from "./kit.js";
import {exName, planName} from "../../i18n/exnames.js";
import {isActivity} from "../../data/activities.js";
import {fold, spell} from "../../coach/intent.js";
import {KINDS, listFacts} from "../../coach/context.js";
import {reconcileNutrition, reconcileTraining} from "../../coach/reconcile.js";
import {pinnedOn, weekDates} from "../../engine/schedule.js";
import {muscleOf, secondaryOf} from "../../data/exercises.js";
import {coachNow} from "../../engine/coachinfo.js";
import {bmr, deloadDue} from "../../engine/formulas.js";
import {sumNutrition} from "../../engine/nutrition.js";
import {S, split} from "../../state.js";
import {fmtN, num, pretty, today} from "../../util.js";
import {addDaysISO, nextDayOf, planOn} from "../../engine/dayplan.js";
import {words} from "../coachwords.js";
import {GENERIC, areaOf, namedExercises, told} from "./route.js";

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
export {CTXKIND, aFacts, aLetGo, aLogFood, aLowDay, aReassess, aRemember, aSituation, aWeekFood, aWeekTrain, clashes, kcalOn, setsOf};

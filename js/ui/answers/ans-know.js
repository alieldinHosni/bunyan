/* Bunyan — the coach's answers: how training works: the knowledge files beside the person's own program (js/ui/answers/answers.js gathers them;
   road map step 4, 25 Nov: split by topic as they were, no answer's words or figures changed). */
import {t, tm} from "../../i18n/dict.js";
import {act, fill, n, p, src, uiLang} from "./kit.js";
import {exName, planName} from "../../i18n/exnames.js";
import {goalOf} from "../../data/goals.js";
import {isActivity} from "../../data/activities.js";
import {fold} from "../../coach/intent.js";
import {LANDMARKS} from "../../coach/landmarks.js";
import * as KB from "../../engine/kb.js";
import {weeklySets} from "../../engine/volume.js";
import {weeklyVolume} from "../../engine/stats.js";
import {bwShare, e1RM} from "../../engine/formulas.js";
import {topLifts} from "../../engine/stats.js";
import {S, split} from "../../state.js";
import {fmtW} from "../../units.js";
import {num, r1, today} from "../../util.js";
import {addDaysISO, estMinutes, nextDayOf, planOn} from "../../engine/dayplan.js";
import {adaptOf} from "../../engine/plan.js";
import {rangeFor} from "../../coach/landmarks.js";
import {ELSEWHERE, MUSCLEWORD, lifts, scopeAnswer} from "./route.js";
import {aUnknown} from "./ans-training.js";
import {OUTLINE, aOut} from "./ans-named.js";

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

export {aElse, aK1RM, aKDur, aKFreq, aKReps, aKRest, aKSets, aKTempo, aKVolume, aKWarm, aScope, goalWord, lastNights, mode, range, secs, versus};

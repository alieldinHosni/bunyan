/* Bunyan — the weekly check-in, for this profile
   js/coach/checkin.js reads a week and says what to change; this hands it the log, the
   targets, the program's weekly sets and the range for the person's experience, and
   says whether the check-in is still open this week (not yet marked done, and with
   something logged last week to read). Nothing changes by itself: each change waits
   for a tap (Coach, the chat), with Undo. */
import {checkin} from "../coach/checkin.js";
import {rangeFor} from "../coach/landmarks.js";
import {goalOf, trainOf} from "../data/goals.js";
import {muscleOf, secondaryOf} from "../data/exercises.js";
import {isActivity} from "../data/activities.js";
import {S, split} from "../state.js";
import {num, today} from "../util.js";
import {inDeload, kcalFloor, tdee} from "./formulas.js";
import {addDays, weekStartOf} from "./schedule.js";
import {JUDGED, weeklySets} from "./volume.js";
import {lightOnPurpose} from "./stress.js";
import {programFacts} from "./coachinfo.js";

var INFO={muscle:muscleOf,secondary:secondaryOf,activity:isActivity};

/* The effort the program plans: 10 less its working sets' reps in reserve, on average.
   From the program, not the goal, so a week whose days serve different goals (js/data/
   goals.js dayGoals) and a hand-edited program are read as they are; the goal's own
   effort when the program says none. */
function plannedRpe(sp,p){
  var n=0,sum=0;
  ((sp&&sp.days)||[]).forEach(function(d){(d.ex||[]).forEach(function(e){
    if(e&&e.rir!=null&&!isActivity(e.name)){sum+=num(e.rir);n++;}});});
  return n?Math.round((10-sum/n)*10)/10:10-num(trainOf(p.goal).rir&&trainOf(p.goal).rir[1]);}

/* How many workouts the program plans in a week. */
function plannedWeek(sp){
  if(!sp)return num((S.profile||{}).days);
  var train=sp.days.filter(function(d){return d.ex.length;});
  if(sp.schedule==="week"){var n=0;train.forEach(function(d){n+=(d.wd||[]).length;});return n;}
  return num((S.profile||{}).days)||train.length;}

function checkinNow(){
  var p=S.profile||{},g=S.goals||{},sp=split(),ws=weekStartOf(today()),tr=trainOf(p.goal);
  var maint=tdee(),kcal=num(g.kcal);
  return checkin({today:today(),weekStart:ws,sessions:S.sessions||[],days:S.days||{},body:S.body||[],
    planned:plannedWeek(sp),kcal:kcal,protein:num(g.p),steps:num(g.steps),gap:maint>0&&kcal>0?kcal-maint:null,floor:kcalFloor(),
    rpeTarget:plannedRpe(sp,p),range:rangeFor(p.level,goalOf(p.goal).train),mains:programFacts().mains,
    plannedSets:sp?weeklySets(sp):null,judged:JUDGED,deloadOn:inDeload(),info:INFO});}

/* Open: a new week, not marked done, and last week has something to read. The changes
   already made this week are left out. */
function checkinOpen(){
  var ws=weekStartOf(today());
  if(S.ckDone===ws)return null;
  var c=checkinNow();
  /* Kept light on purpose (js/engine/stress.js): no "under your range". */
  if(lightOnPurpose(S.profile))c.changes=c.changes.map(function(x){return x.kind==="balance"?Object.assign({},x,{low:[]}):x;})
    .filter(function(x){return x.kind!=="balance"||x.high.length;});
  /* Fewer workouts than planned: worth a check-in even with nothing else logged, to ask
     what got in the way (js/knowledge/adherence.js BARRIERS). The answer is kept by week
     and read again next week (BARRIER_RULES.coachRole: check in often, barriers change). */
  c.missed=!!(c.planned&&c.done<c.planned);
  var why=S.ckWhy||{},pw=addDays(ws,-7);
  c.barrier=why[ws]||null;c.prevBarrier=why[pw]||null;
  /* The squat check again after four weeks (assessments.js overhead_squat: repeat it
     periodically to track progress). */
  var fa=(S.profile||{}).faultsAt;
  c.recheck=!!(fa&&((S.profile||{}).faults||[]).length&&(Date.parse(today())-Date.parse(fa))/864e5>=28);
  if(!c.done&&!c.food&&!c.weight&&!c.sore&&!c.missed)return null;
  var did=S.ckDid&&S.ckDid.w===ws?S.ckDid.k||[]:[];
  c.changes=c.changes.filter(function(x){return did.indexOf(x.kind)<0;});
  c.week=ws;
  return c;}

export {checkinNow, checkinOpen, plannedWeek};

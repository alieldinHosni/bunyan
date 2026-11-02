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
import {weekStartOf} from "./schedule.js";
import {JUDGED, weeklySets} from "./volume.js";
import {lightOnPurpose} from "./stress.js";

var INFO={muscle:muscleOf,secondary:secondaryOf,activity:isActivity};

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
    planned:plannedWeek(sp),kcal:kcal,gap:maint>0&&kcal>0?kcal-maint:null,floor:kcalFloor(),
    rpeTarget:10-num(tr.rir&&tr.rir[1]),range:rangeFor(p.level,goalOf(p.goal).train),
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
  if(!c.done&&!c.food&&!c.weight&&!c.sore)return null;
  var did=S.ckDid&&S.ckDid.w===ws?S.ckDid.k||[]:[];
  c.changes=c.changes.filter(function(x){return did.indexOf(x.kind)<0;});
  c.week=ws;
  return c;}

export {checkinNow, checkinOpen, plannedWeek};

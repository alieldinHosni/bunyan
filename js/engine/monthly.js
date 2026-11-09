/* Bunyan — the month, reviewed, for this profile
   js/coach/monthly.js reads a month and says what to change; this hands it the log, the
   program's week, the goals and the main lifts, and says whether the review is open:
   the first MONTH_OPEN days of a month, for the month before, until it is marked done.
   Nothing changes by itself: each change waits for a tap on Coach, with Undo. */
import {monthly} from "../coach/monthly.js";
import {goalsOf} from "../data/goals.js";
import {muscleOf, secondaryOf} from "../data/exercises.js";
import {isActivity} from "../data/activities.js";
import {S, split} from "../state.js";
import {num, today} from "../util.js";
import {tdee} from "./formulas.js";
import {plannedWeek} from "./checkin.js";
import {programFacts} from "./coachinfo.js";

var INFO={muscle:muscleOf,secondary:secondaryOf,activity:isActivity},MONTH_OPEN=10;

function lastMonth(d){var y=+d.slice(0,4),m=+d.slice(5,7)-1;if(m<1){m=12;y--;}return y+"-"+(m<10?"0":"")+m;}
function monthlyNow(month){
  var p=S.profile||{},g=S.goals||{},maint=tdee(),kcal=num(g.kcal);
  return monthly({month:month||lastMonth(today()),sessions:S.sessions||[],days:S.days||{},body:S.body||[],
    perWeek:plannedWeek(split()),gap:maint>0&&kcal>0?kcal-maint:null,goals:goalsOf(p),mains:programFacts().mains,
    assessedAt:p.assessedAt||null,today:today(),info:INFO});}
/* Open: early in the month, for the month before, not yet marked done; the changes
   already made this month left out. */
function monthlyOpen(){
  var d=today();if(+d.slice(8,10)>MONTH_OPEN||!S.onboarded)return null;
  var m=lastMonth(d);if(S.moDone===m)return null;
  var r=monthlyNow(m);if(!r)return null;
  var did=S.moDid&&S.moDid.m===m?S.moDid.k||[]:[];
  r.changes=r.changes.filter(function(x){return did.indexOf(x.kind)<0;});
  return r;}

export {lastMonth, monthlyNow, monthlyOpen};

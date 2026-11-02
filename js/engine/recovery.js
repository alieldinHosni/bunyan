/* Bunyan — recovery, for this profile
   js/coach/recovery.js decides how ready each muscle is and whether a day of the
   program fits better than the one due; this hands it the log, the soreness logged on
   the recovery sheet and the library's answers, and says what the coach would offer for
   a date: the day due, the fresher one, and the muscles that make the difference.

   Nothing is changed by itself: the person decides (Training's card, the coach). A day
   already moved or kept by hand (S.daySwap) is the person's decision and is left alone. */
import {readiness, suggest} from "../coach/recovery.js";
import {muscleOf, secondaryOf} from "../data/exercises.js";
import {isActivity} from "../data/activities.js";
import {S} from "../state.js";
import {addDaysISO} from "./dayplan.js";

var INFO={muscle:muscleOf,secondary:secondaryOf,activity:isActivity};

/* Readiness on a date, from everything logged before it (and earlier that day). */
function readyOn(iso){
  var days=S.days||{},sore=Math.max(+((days[iso]||{}).sore)||0,+((days[addDaysISO(iso,-1)]||{}).sore)||0);
  return readiness((S.sessions||[]).filter(function(s){return s.date<=iso;}),iso,INFO,sore);}

/* p: dayplan.js planOn for that date. → {from, to, fromDay, toDay, tired} or null. */
function swapAdvice(sp,iso,p){
  if(!sp||!p||p.rest||!p.day||(p.kind!=="today"&&p.kind!=="plan"))return null;
  if(S.daySwap&&S.daySwap[iso])return null;
  var idx=-1;sp.days.forEach(function(d,i){if(d.id===p.day.id)idx=i;});
  if(idx<0)return null;
  var s=suggest(sp.days,idx,readyOn(iso),INFO);
  if(!s)return null;
  s.fromDay=sp.days[idx];s.toDay=sp.days.filter(function(d){return d.id===s.to;})[0];
  return s;}

export {readyOn, swapAdvice};

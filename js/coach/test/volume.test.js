import {weeklyVolume} from "../volume.js";
import {addDays, INFO, mk} from "./assert.js";

var TODAY="2026-10-07";   /* a Wednesday */

function run(t){
  var empty=weeklyVolume([],INFO,{today:TODAY});
  t.eq(empty.status,"insufficient","empty log: insufficient");
  t.clean(empty,"empty log: no NaN or undefined");

  var one=weeklyVolume([mk("2026-10-06",[["Bench",[[80,8],[80,8],[80,8]]]])],INFO,{today:TODAY});
  t.eq(one.status,"insufficient","one session: nothing judged");
  t.eq(one.weeks[one.weeks.length-1].sets.Chest,3,"one session: three chest sets this week");
  t.eq(one.weeks[one.weeks.length-1].sets.Triceps,1.5,"a secondary muscle counts half");

  /* Cardio with no sets, and sessions of nothing but cardio: no division by zero. */
  var cardio=[mk("2026-09-22",[["Running",[]]]),mk("2026-09-29",[["Football",[]]]),mk("2026-10-06",[["Walking",[]]])];
  var c=weeklyVolume(cardio,INFO,{today:TODAY});
  t.clean(c,"cardio only: no NaN or undefined");
  t.eq(c.status,"insufficient","cardio only: no lifting weeks to judge");

  /* Warm-ups do not count. */
  var wu=weeklyVolume([mk("2026-10-06",[["Bench",[[40,10,0,true],[80,8]]]])],INFO,{today:TODAY});
  t.eq(wu.weeks[wu.weeks.length-1].sets.Chest,1,"warm-up sets are left out");

  /* Three weeks of four chest sets: under the minimum effective volume of 6. */
  var low=[];
  [21,14,7].forEach(function(d){low.push(mk(addDays(TODAY,-d),[["Bench",[[80,8],[80,8],[80,8],[80,8]]],["Squat",[[100,5],[100,5],[100,5],[100,5],[100,5],[100,5],[100,5],[100,5],[100,5],[100,5],[100,5],[100,5]]]]));});
  var lv=weeklyVolume(low,INFO,{today:TODAY});
  t.eq(lv.status,"ok","three weeks logged: judged");
  t.eq(lv.muscles.Chest.status,"under","four chest sets a week is under the minimum");
  t.eq(lv.muscles.Quads.status,"ok","twelve quad sets a week is in range");
  t.eq(lv.muscles.Glutes.status,"none","an untrained muscle is counted, not judged");
  t.clean(lv,"judged result: no NaN or undefined");}

export {run};

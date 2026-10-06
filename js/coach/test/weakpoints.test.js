import {weakPoints} from "../weakpoints.js";
import {INFO, mk} from "./assert.js";

var TODAY="2026-10-07";

function run(t){
  t.eq(weakPoints([],INFO,{today:TODAY}),[],"empty log: nothing");

  /* Squat 100 × 5 against a deadlift of 180 × 5: about 56% — far under the usual 75–95%. */
  var low=[mk("2026-10-01",[["Barbell Squat",[[100,5]]],["Barbell Deadlift",[[180,5]]]])];
  var w=weakPoints(low,INFO,{today:TODAY});
  t.eq(w.map(function(x){return [x.a,x.b,x.side];}),[["squat","deadlift","low"]],"a squat far under the deadlift is named");
  t.clean(w,"result: no NaN or undefined");

  /* Ordinary proportions say nothing. */
  var fine=[mk("2026-10-01",[["Barbell Squat",[[140,5]]],["Barbell Deadlift",[[170,5]]],
    ["Barbell Bench Press - Medium Grip",[[100,5]]],["Standing Military Press",[[65,5]]],["Bent Over Barbell Row",[[85,8]]]])];
  t.eq(weakPoints(fine,INFO,{today:TODAY}),[],"ordinary proportions: nothing to say");

  /* Only the judged lifts, and only when both sides of a ratio are logged. */
  t.eq(weakPoints([mk("2026-10-01",[["Barbell Squat",[[100,5]]]])],INFO,{today:TODAY}),[],"one lift alone: no ratio");}

export {run};

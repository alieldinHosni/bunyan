import {weakPointReport, weakPoints} from "../weakpoints.js";
import {INFO, mk} from "./assert.js";

var TODAY="2026-10-07";

function run(t){
  t.eq(weakPoints([],INFO,{today:TODAY}),[],"empty log: nothing");
  var none=weakPointReport([],INFO,{today:TODAY});
  t.eq(none.kind,"no_reference_data","empty log: no reference data");
  t.clean(none,"empty log: no NaN or undefined");

  /* Squat 100 × 5 against a deadlift of 180 × 5 is about 56%. With no sourced norm,
     that is not judged: an unsourced range is worse than no answer. */
  var low=[mk("2026-10-01",[["Barbell Squat",[[100,5]]],["Barbell Deadlift",[[180,5]]]])];
  t.eq(weakPoints(low,INFO,{today:TODAY}),[],"no sourced norms: a lopsided log is not judged");
  var rep=weakPointReport(low,INFO,{today:TODAY});
  t.eq([rep.kind,rep.findings],["no_reference_data",[]],"the report says there is no reference data");
  t.clean(rep,"report: no NaN or undefined");

  /* Cardio has no sets to estimate a max from. */
  var cardio=[mk("2026-10-01",[["Running",[]],["Walking",[[0,0]]]])];
  t.eq(weakPoints(cardio,INFO,{today:TODAY}),[],"cardio only: nothing, no crash");}

export {run};

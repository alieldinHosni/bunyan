import {progressionAdvice} from "../autoreg.js";
import {addDays, INFO, mk} from "./assert.js";

var TODAY="2026-10-07",RANGE={lo:8,hi:10};
function log(sessions){
  return sessions.map(function(sets,i){return mk(addDays(TODAY,-7*(sessions.length-1-i)),[["Squat",sets]]);});}

function run(t){
  var none=progressionAdvice([],"Squat",RANGE,INFO);
  t.eq(none.kind,"insufficient","empty log: insufficient");
  t.clean(none,"empty log: no NaN or undefined");

  t.eq(progressionAdvice(log([[[100,10,6.5],[100,10,7]]]),"Squat",RANGE,INFO).kind,"bigger",
    "top of the range at RPE 7 or less: a bigger step");
  t.eq(progressionAdvice(log([[[100,10,9],[100,10,9.5]]]),"Squat",RANGE,INFO).kind,"add-marginal",
    "top of the range at RPE 9 or more: add, recovery marginal");
  t.eq(progressionAdvice(log([[[100,10,8],[100,10,8]]]),"Squat",RANGE,INFO).kind,"add",
    "top of the range at RPE 8: the usual step");
  t.eq(progressionAdvice(log([[[100,10]],[[100,10]]]),"Squat",RANGE,INFO).kind,"add",
    "top of the range with no RPE: the usual step");
  t.eq(progressionAdvice(log([[[100,9,8]]]),"Squat",RANGE,INFO).kind,"none",
    "in the range, not at the top: nothing to change");

  var two=progressionAdvice(log([[[100,9]],[[100,7]],[[100,6]]]),"Squat",RANGE,INFO);
  t.eq([two.kind,two.miss],["hold",2],"short of the range twice running: hold, do not drop");

  var three=progressionAdvice(log([[[100,7]],[[100,7]],[[100,6]]]),"Squat",RANGE,INFO);
  t.eq([three.kind,three.factor],["deload",0.9],"short three times running: a lighter week, about 10% off");

  /* A miss at a different load is a new attempt, not a run of misses. */
  t.eq(progressionAdvice(log([[[95,7]],[[100,7]]]),"Squat",RANGE,INFO).kind,"none",
    "misses at different loads do not add up");}

export {run};

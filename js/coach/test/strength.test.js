import {e1rmTrend} from "../strength.js";
import {addDays, INFO, mk} from "./assert.js";

var TODAY="2026-10-07";
function weekly(points){
  return points.map(function(p,i){return mk(addDays(TODAY,-7*(points.length-1-i)),[["Squat",[[p[0],p[1]]]]]);});}

function run(t){
  var empty=e1rmTrend([],"Squat",INFO,{today:TODAY});
  t.eq(empty.direction,"insufficient","empty log: insufficient");
  t.clean(empty,"empty log: no NaN or undefined");
  t.eq(e1rmTrend(weekly([[100,5]]),"Squat",INFO,{today:TODAY}).direction,"insufficient","one session: no trend");

  var up=e1rmTrend(weekly([[100,5],[105,5],[110,5],[115,5]]),"Squat",INFO,{today:TODAY});
  t.eq(up.direction,"rising","more weight each week: rising");

  var flat=e1rmTrend(weekly([[100,5],[110,5],[110,5],[110,5],[109,5]]),"Squat",INFO,{today:TODAY});
  t.eq([flat.direction,flat.flatWeeks],["flat",3],"three weeks with no new best: flat for three");

  var down=e1rmTrend(weekly([[110,5],[115,5],[112.5,5],[107.5,5]]),"Squat",INFO,{today:TODAY});
  t.eq([down.direction,down.fallingWeeks],["falling",2],"down two weeks running: falling for two");
  t.clean(down,"falling result: no NaN or undefined");

  /* Sets above 12 reps are left out of the estimate. */
  var high=e1rmTrend(weekly([[60,15],[60,15],[60,15]]),"Squat",INFO,{today:TODAY});
  t.eq([high.direction,high.weeks.length],["insufficient",0],"sets of 15 reps are not used");}

export {run};

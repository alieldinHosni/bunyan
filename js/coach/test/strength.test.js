import {e1rmTrend} from "../strength.js";
import {e1rm, rirOf} from "../util.js";
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
  t.eq([high.direction,high.weeks.length],["insufficient",0],"sets of 15 reps are not used");

  /* Effort counts: reps in reserve from RPE (RPE 8 is two left). */
  t.eq([rirOf(10),rirOf(9),rirOf(8),rirOf(8.5),rirOf(6),rirOf(5),rirOf(0)],[0,1,2,1.5,4,0,0],"RPE to reps in reserve, trusted from 6 to 10");
  t.eq([e1rm(100,8),e1rm(100,8,10),e1rm(100,8,8)],[126.7,126.7,133.3],"8 reps at RPE 8 is worth 10 reps: an easy set reads stronger than a grinder");
  t.eq([e1rm(100,1),e1rm(100,1,10),e1rm(100,1,8)],[100,100,110],"a single is a max only when it was one");
  t.eq([e1rm(100,8,5),e1rm(100,10,7)],[126.7,0],"RPE under 6 is not trusted; past 12 reps of effort, no estimate");
  /* The same weight getting easier is getting stronger. */
  function easier(rpes){return rpes.map(function(rp,i){return mk(addDays(TODAY,-7*(rpes.length-1-i)),[["Squat",[[100,8,rp]]]]);});}
  var e=e1rmTrend(easier([9.5,9,8.5,8,7.5]),"Squat",INFO,{today:TODAY});
  t.eq(e.direction,"rising","100 × 8 from RPE 9.5 down to 7.5 over five weeks: stronger");}

export {run};

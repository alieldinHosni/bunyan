/* Bunyan — coach: weak points
   The ratios between a lifter's main lifts, against the ranges most lifters fall in,
   would name a lift that lags the others — as an observation, never a diagnosis.

   There is no reference for those ranges. The knowledge base extracted from the
   textbooks (js/knowledge/) carries no strength-ratio norms: its bench and squat
   strength tests (assessments.js bench_press_strength, squat_strength) give a protocol
   and no norms. The ranges this file used to hold had no named source, and an
   unsourced norm is worse than none, because the user cannot tell it from a real one.
   So nothing is judged: weakPoints() returns no findings, and weakPointReport() says
   why, until REFERENCE holds ranges with a source.

   REFERENCE, when filled: [{a, b, lo, hi, src}] — a's estimated max as a share of b's,
   the range most lifters fall in, and the citation. Only large deviations would be
   reported (more than 15% outside the range), since proportions differ with limb
   length, leverages and history.

   LIFTS stays: percentile.js reads it to find the judged lifts in the log. */
import {byDate, dayNo, e1rm, infoOf, r1, workSets} from "./util.js";

var LIFTS={
  squat:/^(Barbell (Full )?Squat|Back Squat|Squat)$/i,
  bench:/^Barbell Bench Press( - Medium Grip)?$|^Bench Press$/i,
  deadlift:/^(Barbell Deadlift|Deadlift|Conventional Deadlift)$/i,
  press:/^(Standing Military Press|Barbell Shoulder Press|Overhead Press|Military Press)$/i,
  row:/^(Bent Over Barbell Row|Barbell Row|Pendlay Row)$/i
};
var REFERENCE=[];

function bests(sessions,info,today,days){
  var I=infoOf(info),out={};
  byDate(sessions).forEach(function(s){
    var age=dayNo(today)-dayNo(s.date);if(age<0||age>days)return;
    (s.entries||[]).forEach(function(e){
      if(!e||!e.name)return;
      var k=Object.keys(LIFTS).filter(function(x){return LIFTS[x].test(e.name);})[0];if(!k)return;
      workSets(e).forEach(function(x){var v=e1rm(I.load(e.name,x.w,s.date),x.r,x.rpe);if(v>(out[k]||0))out[k]=v;});});});
  return out;}

function weakPoints(sessions,info,opts){
  opts=opts||{};
  var today=opts.today||new Date().toISOString().slice(0,10);
  var b=bests(sessions,info,today,opts.days||56),out=[];
  REFERENCE.forEach(function(R){
    var a=b[R.a],c=b[R.b];if(!a||!c)return;
    var ratio=a/c,o={a:R.a,b:R.b,ratio:r1(ratio*100)/100,lo:R.lo,hi:R.hi,src:R.src};
    if(ratio<R.lo*0.85){o.side="low";out.push(o);}
    else if(ratio>R.hi*1.15){o.side="high";out.push(o);}});
  return out;}

/* Why weakPoints() is silent, for anything that needs to say so. */
function weakPointReport(sessions,info,opts){
  if(!REFERENCE.length)return {kind:"no_reference_data",findings:[],
    why:"no sourced strength-ratio norms in js/knowledge/"};
  return {kind:"ok",findings:weakPoints(sessions,info,opts),why:""};}

export {LIFTS, REFERENCE, weakPointReport, weakPoints};

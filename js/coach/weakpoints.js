/* Bunyan — coach: weak points
   The ratios between a lifter's main lifts, against the ranges most lifters fall in.
   A ratio well outside its range is worth naming — as an observation, never a
   diagnosis. Proportions differ with limb length, leverages and history: a lifter with
   long thighs will squat less against their deadlift all their life and nothing is
   wrong. So only large deviations are reported (more than 15% outside the range), and
   always with that caveat.

   The ranges are rough consensus figures from strength coaching, not norms measured
   on this lifter's population. Each lift's best estimated max over the window is used
   (Epley, 12 reps or fewer). */
import {byDate, dayNo, e1rm, infoOf, r1, workSets} from "./util.js";

var LIFTS={
  squat:/^(Barbell (Full )?Squat|Back Squat|Squat)$/i,
  bench:/^Barbell Bench Press( - Medium Grip)?$|^Bench Press$/i,
  deadlift:/^(Barbell Deadlift|Deadlift|Conventional Deadlift)$/i,
  press:/^(Standing Military Press|Barbell Shoulder Press|Overhead Press|Military Press)$/i,
  row:/^(Bent Over Barbell Row|Barbell Row|Pendlay Row)$/i
};
/* [a, b, low, high]: a as a share of b, and the range most lifters fall in. */
var RATIOS=[
  ["bench","squat",0.6,0.85],
  ["squat","deadlift",0.75,0.95],
  ["press","bench",0.55,0.75],
  ["row","bench",0.7,1.05]
];

function bests(sessions,info,today,days){
  var I=infoOf(info),out={};
  byDate(sessions).forEach(function(s){
    var age=dayNo(today)-dayNo(s.date);if(age<0||age>days)return;
    (s.entries||[]).forEach(function(e){
      if(!e||!e.name)return;
      var k=Object.keys(LIFTS).filter(function(x){return LIFTS[x].test(e.name);})[0];if(!k)return;
      workSets(e).forEach(function(x){var v=e1rm(I.load(e.name,x.w,s.date),x.r);if(v>(out[k]||0))out[k]=v;});});});
  return out;}

function weakPoints(sessions,info,opts){
  opts=opts||{};
  var today=opts.today||new Date().toISOString().slice(0,10);
  var b=bests(sessions,info,today,opts.days||56),out=[];
  RATIOS.forEach(function(R){
    var a=b[R[0]],c=b[R[1]];if(!a||!c)return;
    var ratio=a/c;
    if(ratio<R[2]*0.85)out.push({a:R[0],b:R[1],ratio:r1(ratio*100)/100,lo:R[2],hi:R[3],side:"low"});
    else if(ratio>R[3]*1.15)out.push({a:R[0],b:R[1],ratio:r1(ratio*100)/100,lo:R[2],hi:R[3],side:"high"});});
  return out;}

export {LIFTS, weakPoints};

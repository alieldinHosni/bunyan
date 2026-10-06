/* Bunyan — weekly volume
   How many hard sets a program gives each muscle in a week, and how that compares
   with a range for the lifter's experience.

   A set counts in full for the exercise's main muscle and half for each muscle it
   also works: a bench press is a chest set and half a triceps and shoulder set. A
   day in a cycling program comes round once per cycle, so a seven-entry cycle (rest
   days included) runs each day once a week, a four-entry one 1.75 times; a program
   on weekdays counts the weekdays each day is on.

   The ranges are a heuristic, not a measurement. Research on volume puts most
   people's productive range for a muscle at roughly 10–20 hard sets a week, lower for
   a beginner, who grows from less, and higher for someone years in. The
   "landmarks" some coaches publish are useful starting points with wide individual
   differences, and the app says so where it shows them. */
import {isActivity} from "../data/activities.js";
import {muscleOf, secondaryOf} from "../data/exercises.js";

var RANGE={new:[8,12],some:[10,16],experienced:[12,20],advanced:[14,22]};
/* The muscles a program is judged on. Forearms, neck and calves are trained by
   plenty of people on purpose and left alone by plenty of others; they are counted,
   not judged. */
var JUDGED=["Chest","Back","Shoulders","Quads","Hamstrings","Glutes","Biceps","Triceps"];

/* How often each day of a program comes round in a week. */
function perWeek(prog,d){
  if(prog.schedule==="week")return (d.wd||[]).length||0;
  var n=(prog.days||[]).length;
  return n?7/n:0;}

function weeklySets(prog){
  var out={};
  (prog&&prog.days||[]).forEach(function(d){
    var k=perWeek(prog,d);if(!k)return;
    (d.ex||[]).forEach(function(e){
      if(!e||isActivity(e.name))return;
      var s=(+e.sets||0)*k,m=muscleOf(e.name);
      if(!s)return;
      out[m]=(out[m]||0)+s;
      (secondaryOf(e.name)||[]).forEach(function(x){if(x!==m)out[x]=(out[x]||0)+s/2;});});});
  Object.keys(out).forEach(function(m){out[m]=Math.round(out[m]*2)/2;});
  return out;}

/* Each judged muscle against the range: low, ok or high. */
function volumeCheck(prog,level){
  var r=RANGE[level]||RANGE.some,w=weeklySets(prog);
  return JUDGED.map(function(m){
    var s=w[m]||0;
    return {m:m,sets:s,lo:r[0],hi:r[1],status:s<r[0]*0.7?"low":s>r[1]*1.3?"high":"ok"};});}

export {JUDGED, perWeek, RANGE, volumeCheck, weeklySets};

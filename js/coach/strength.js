/* Bunyan — coach: estimated max over time
   Per exercise, the best estimated one-rep max of each week (Epley, sets of 12 reps or
   fewer, warm-ups left out), and where it is heading.

     rising        the latest week beats every earlier one by more than 1%
     flat          no week has beaten the best before it by more than 1% for
                   `flatWeeks` weeks in a row (3 or more is a stall on a main lift)
     falling       down by more than 1% week on week, `fallingWeeks` times running
                   (2 or more is worth a warning)
     insufficient  fewer than three weeks with the lift in them

   The 12-rep cap stays: above it Epley degrades, and more data points from it would
   be worse data, not more. */
import {byDate, dayNo, e1rm, infoOf, r1, weekOf, workSets} from "./util.js";

function e1rmTrend(sessions,name,info,opts){
  var I=infoOf(info);opts=opts||{};
  var today=opts.today||new Date().toISOString().slice(0,10),weeks=opts.weeks||10;
  var best={};
  byDate(sessions).forEach(function(s){
    var age=dayNo(today)-dayNo(s.date);if(age<0||age>weeks*7)return;
    (s.entries||[]).forEach(function(e){
      if(!e||e.name!==name)return;
      workSets(e).forEach(function(x){
        var v=e1rm(I.load(name,x.w,s.date),x.r,x.rpe),k=weekOf(s.date);
        if(v>(best[k]||0))best[k]=v;});});});
  var ws=Object.keys(best).sort().map(function(k){return {start:k,best:r1(best[k])};}).filter(function(w){return w.best>0;});
  var out={weeks:ws,direction:"insufficient",flatWeeks:0,fallingWeeks:0,latest:ws.length?ws[ws.length-1].best:0,peak:0};
  if(ws.length<3)return out;
  /* How many of the most recent weeks failed to set a new best. */
  var peak=0,flat=0;
  ws.forEach(function(w){if(w.best>peak*1.01){peak=Math.max(peak,w.best);flat=0;}else{flat++;peak=Math.max(peak,w.best);}});
  var fall=0;
  for(var i=ws.length-1;i>0;i--){if(ws[i].best<ws[i-1].best*0.99)fall++;else break;}
  out.peak=r1(peak);out.flatWeeks=flat;out.fallingWeeks=fall;
  out.direction=fall>=1&&fall>=flat?"falling":flat>=1?"flat":"rising";
  return out;}

export {e1rmTrend};

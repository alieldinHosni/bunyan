/* Bunyan — coach: what is worth saying
   Runs the other readings over the log and returns the observations worth a lifter's
   attention, most important first. Most days the honest answer is nothing, and then it
   returns nothing: an app that finds something to say every day trains people to stop
   listening.

   Each insight is data, not words: {id, kind, pri, ...}. The screen turns it into a
   sentence through the translator, so every word is in both languages and every
   number is the lifter's own.

     fatigue   the same weight for the same reps feeling harder           pri 3
     falling   a main lift's best estimated max down two weeks running    pri 3
     deload    a lift short of its range three sessions running           pri 2
     stall     a main lift's best flat for three weeks or more            pri 2
     over      a muscle above its recoverable volume in what was logged   pri 2
     under     a muscle in the program logged below its minimum volume    pri 1
     weak      a lift well out of proportion with the others              pri 1

   opts: today, mains (the program's main lifts), ranges ({name:{lo,hi}}), planned
   (muscles the program trains), dismissed ({id: date until which it stays quiet}).
   A dismissed insight stays quiet until that date, so declining one is respected
   and it is not raised again at the next session. */
import {fatigued} from "./fatigue.js";
import {e1rmTrend} from "./strength.js";
import {progressionAdvice} from "./autoreg.js";
import {weeklyVolume} from "./volume.js";
import {weakPoints} from "./weakpoints.js";
import {byDate, dayNo} from "./util.js";

function insights(sessions,info,opts){
  opts=opts||{};
  var today=opts.today||new Date().toISOString().slice(0,10),out=[];
  var log=byDate(sessions);
  if(log.length<2)return out;
  var mains=opts.mains&&opts.mains.length?opts.mains:[];
  var ranges=opts.ranges||{};

  fatigued(log,info,{today:today}).slice(0,1).forEach(function(f){
    out.push({id:"fatigue:"+f.name,kind:"fatigue",pri:3,name:f.name,w:f.w,r:f.r,from:f.from,to:f.to,points:f.points});});

  mains.forEach(function(n){
    var tr=e1rmTrend(log,n,info,{today:today});
    if(tr.direction==="falling"&&tr.fallingWeeks>=2)
      out.push({id:"falling:"+n,kind:"falling",pri:3,name:n,peak:tr.peak,latest:tr.latest,weeks:tr.fallingWeeks});
    else if(tr.direction==="flat"&&tr.flatWeeks>=3)
      out.push({id:"stall:"+n,kind:"stall",pri:2,name:n,best:tr.peak,weeks:tr.flatWeeks});
    var rg=ranges[n];
    if(rg){var adv=progressionAdvice(log,n,rg,info);
      if(adv.kind==="deload")out.push({id:"deload:"+n,kind:"deload",pri:2,name:n,w:adv.w,miss:adv.miss,lo:rg.lo});}});

  var vol=weeklyVolume(log,info,{today:today});
  if(vol.status==="ok"){
    var over=[],under=[];
    Object.keys(vol.muscles).forEach(function(m){
      var v=vol.muscles[m];
      if(v.status==="over")over.push({m:m,avg:v.avg,mrv:v.mrv});
      if(v.status==="under"&&(opts.planned||[]).indexOf(m)>=0)under.push({m:m,avg:v.avg,mev:v.mev});});
    if(over.length)out.push({id:"over:"+over.map(function(x){return x.m;}).join(","),kind:"over",pri:2,muscles:over,weeks:vol.complete});
    if(under.length)out.push({id:"under:"+under.map(function(x){return x.m;}).join(","),kind:"under",pri:1,muscles:under,weeks:vol.complete});}

  weakPoints(log,info,{today:today}).slice(0,1).forEach(function(w){
    out.push({id:"weak:"+w.a+"/"+w.b,kind:"weak",pri:1,a:w.a,b:w.b,ratio:w.ratio,lo:w.lo,hi:w.hi,side:w.side});});

  /* One insight per lift at most: a falling max explains a fatigue reading on the same
     lift, so the more serious one stands for both. */
  var seen={};
  out.sort(function(a,b){return b.pri-a.pri;});
  out=out.filter(function(x){if(!x.name)return true;if(seen[x.name])return false;seen[x.name]=1;return true;});
  var dis=opts.dismissed||{};
  return out.filter(function(x){return !(dis[x.id]&&dayNo(today)<dayNo(dis[x.id]));});}

export {insights};

/* Bunyan — coach: fatigue
   The signal: the same weight for the same reps feeling harder. If 80 kg for 8 was an
   RPE 7 three weeks ago and is a 9 now, the lifter has not got weaker — fatigue has
   built up, and it is visible in what is already logged.

   Per exercise, working sets with an RPE are grouped by load and reps (a set counts as
   the same if its load is within 2.5% and its reps within one). The group seen in the
   most sessions is the one read; each session gives it one point, its average RPE.
   Below three sessions in the window the answer is "insufficient" — never a guess.

   With three or more points, the trend is the least-squares line through them:
     rising   RPE up by at least a point across the points, and the last higher than the first
     falling  down by at least a point (getting easier: the opposite of fatigue)
     steady   anything in between */
import {byDate, dayNo, infoOf, num, r1, workSets} from "./util.js";

function slope(ys){
  var n=ys.length,mx=(n-1)/2,my=ys.reduce(function(a,b){return a+b;},0)/n,sxy=0,sxx=0;
  ys.forEach(function(y,i){sxy+=(i-mx)*(y-my);sxx+=(i-mx)*(i-mx);});
  return sxx?sxy/sxx:0;}

function fatigueTrend(sessions,name,info,opts){
  var I=infoOf(info);opts=opts||{};
  var today=opts.today||new Date().toISOString().slice(0,10),days=opts.days||42;
  var groups=[];
  byDate(sessions).forEach(function(s){
    if(dayNo(today)-dayNo(s.date)>days||dayNo(s.date)>dayNo(today))return;
    (s.entries||[]).forEach(function(e){
      if(!e||e.name!==name)return;
      var seen={};
      workSets(e).forEach(function(x){
        var rpe=num(x.rpe);if(!rpe)return;
        var w=I.load(name,x.w,s.date),r=num(x.r);
        var g=groups.filter(function(G){return Math.abs(G.w-w)<=Math.max(0.5,G.w*0.025)&&Math.abs(G.r-r)<=1;})[0];
        if(!g){g={w:w,r:r,pts:[]};groups.push(g);}
        var last=g.pts[g.pts.length-1];
        if(last&&last.date===s.date){last.sum+=rpe;last.n++;}
        else g.pts.push({date:s.date,sum:rpe,n:1});
        seen[groups.indexOf(g)]=1;});});});
  groups.sort(function(a,b){return b.pts.length-a.pts.length;});
  var g=groups[0];
  if(!g||g.pts.length<3)return {status:"insufficient",points:g?g.pts.length:0};
  var ys=g.pts.map(function(p){return p.sum/p.n;}),rise=slope(ys)*(ys.length-1);
  var first=ys[0],last=ys[ys.length-1];
  return {status:rise>=1&&last>first?"rising":rise<=-1&&last<first?"falling":"steady",
    w:r1(g.w),r:g.r,from:r1(first),to:r1(last),points:ys.length,
    dates:[g.pts[0].date,g.pts[g.pts.length-1].date]};}

/* Every exercise in the window with a rising trend. */
function fatigued(sessions,info,opts){
  var names={};
  byDate(sessions).forEach(function(s){(s.entries||[]).forEach(function(e){if(e&&e.name)names[e.name]=1;});});
  var I=infoOf(info);
  return Object.keys(names).filter(function(n){return !I.activity(n);})
    .map(function(n){var f=fatigueTrend(sessions,n,info,opts);f.name=n;return f;})
    .filter(function(f){return f.status==="rising";})
    .sort(function(a,b){return (b.to-b.from)-(a.to-a.from);});}

export {fatigued, fatigueTrend};

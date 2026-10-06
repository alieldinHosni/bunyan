/* Bunyan — coach: where the three judged lifts sit among raw powerlifting competitors
   Squat, bench press and deadlift only, against OpenPowerlifting's raw competitors of
   the same sex and IPF weight class (js/coach/powerlifting.js, built by
   tools/opl-percentiles.py). Between two deciles the percentile is interpolated; under
   the 10th or over the 90th it says so rather than inventing a figure.

   Every answer carries what it is compared with, so no caller can drop it:
     population  "raw-competitors": people who train for these lifts and compete. Their
                 30th percentile is strong by any ordinary standard.
     estimated   the lifter's number is an estimated max from logged sets (Epley, 12
                 reps or fewer), not a judged single with depth, a pause and a lockout.
   Any other lift, a missing sex or bodyweight, or nothing logged gives a defined
   "none" or "insufficient", never a guess. */
import {OPL} from "./powerlifting.js";
import {byDate, dayNo, e1rm, infoOf, num, r1, workSets} from "./util.js";
import {LIFTS} from "./weakpoints.js";

/* Sumo is a legal competition deadlift; a box squat or a wide-grip bench is not counted. */
var JUDGED={squat:LIFTS.squat,bench:LIFTS.bench,
  deadlift:/^(Barbell Deadlift|Deadlift|Conventional Deadlift|Sumo Deadlift)$/i};

function sexOf(s){s=String(s||"").toLowerCase().charAt(0);return OPL.classes[s]?s:"";}
function classOf(sex,bw){var c=OPL.classes[sex];for(var i=0;i<c.length;i++)if(bw<=c[i])return i;return c.length;}
function classLabel(sex,i){var c=OPL.classes[sex];return i<c.length?String(c[i]):c[c.length-1]+"+";}

/* One lift at one weight: where it falls in the class's deciles. */
function percentileOf(sex,bodyweight,lift,kg){
  var s=sexOf(sex),bw=num(bodyweight),w=num(kg);
  var out={lift:String(lift||""),population:OPL.population,equipment:OPL.equipment,estimated:true};
  if(OPL.lifts.indexOf(lift)<0){out.kind="none";out.why="lift";return out;}
  if(!s){out.kind="none";out.why="sex";return out;}
  if(bw<30||bw>250){out.kind="none";out.why="bodyweight";return out;}
  if(w<=0){out.kind="none";out.why="nothing";return out;}
  var ci=classOf(s,bw),row=OPL.T[s][lift][ci];
  out.cls=classLabel(s,ci);out.n=row[0];out.kg=r1(w);
  if(row.length<OPL.pcts.length+1){out.kind="insufficient";return out;}
  var d=row.slice(1),P=OPL.pcts,pct=P[0],edge="";
  if(w<d[0])edge="below";
  else if(w>=d[d.length-1]){pct=P[P.length-1];edge="above";}
  else for(var i=0;i<d.length-1;i++)
    if(w>=d[i]&&w<d[i+1]){pct=P[i]+(P[i+1]-P[i])*(w-d[i])/(d[i+1]-d[i]);break;}
  out.kind="ok";out.pct=Math.round(pct);out.edge=edge;out.median=d[4];
  return out;}

/* The lifter's best estimated max for each judged lift over the window (12 weeks by
   default: current strength, not a best from years ago), each placed in its class. */
function standing(sessions,info,opts){
  opts=opts||{};
  var I=infoOf(info),today=opts.today||new Date().toISOString().slice(0,10),days=opts.days||84;
  var best={};
  byDate(sessions||[]).forEach(function(s){
    var age=dayNo(today)-dayNo(s.date);if(age<0||age>days)return;
    (s.entries||[]).forEach(function(e){
      if(!e||!e.name)return;
      OPL.lifts.forEach(function(k){
        if(!JUDGED[k].test(e.name))return;
        workSets(e).forEach(function(x){
          var v=e1rm(I.load(e.name,x.w,s.date),x.r);
          if(v>((best[k]&&best[k].kg)||0))best[k]={kg:v,name:e.name,date:s.date,w:num(x.w),r:num(x.r)};});});});});
  var lifts=OPL.lifts.map(function(k){
    var b=best[k],p=percentileOf(opts.sex,opts.bodyweight,k,b?b.kg:0);
    if(b){p.name=b.name;p.date=b.date;p.from={w:b.w,r:b.r};}
    return p;});
  var any=lifts.some(function(x){return x.kind==="ok";});
  return {kind:any?"ok":(sexOf(opts.sex)&&num(opts.bodyweight)?"insufficient":"none"),
    population:OPL.population,equipment:OPL.equipment,source:OPL.source+" "+OPL.rev,lifts:lifts};}

export {JUDGED, percentileOf, standing};

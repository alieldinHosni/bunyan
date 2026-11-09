/* Bunyan — coach: the month, reviewed
   Owner, 9 Nov: "weekly and monthly checks … very accurate, suggested changes to be
   effective, and changing the surrounding factors if needed". The weekly check-in
   (js/coach/checkin.js) steers the week: a calorie step, a lighter week, a step goal.
   The month is long enough to see what a week cannot, and its changes are the larger
   ones:

   It reads the calendar month that ended:
   - workouts done against those the program planned (weeks in the month × a week's);
   - weigh-ins: how many, and the change between the first week's average and the last
     week's (an average each end, so one heavy morning does not decide it), against
     what the goal's energy gap would give over the month (7,700 kcal a kg);
   - the days food was logged;
   - the program's main lifts over the month (js/coach/strength.js), the best one named.
   And proposes, each only where the month has the data:
   - days:     fewer than ADHERE of the planned workouts done: a week of the days that
               were actually trained (never under two), so the plan fits the life;
   - emphasis: no main lift rising across a month of steady training: the stimulus
               changes, the textbook's undulating plan ("vary … to improve all three
               adaptations together", js/knowledge/phases.js): a goal added for days of
               its own, strength where it is not trained for, else size;
   - weigh:    under MIN_WEIGH weigh-ins: twice a week is what the weekly reading of the
               trend needs (js/coach/checkin.js wants four in three weeks);
   - food:     a goal about the calories logged on under MIN_FOOD days: the calorie
               advice reads the log, so without it the coach cannot steer the target;
   - reassess: REASSESS_DAYS since the assessment: the textbook re-evaluates between
               phases (a macrocycle "with evaluations"); the body, the week and the goal
               have moved, so the plan is built again from today's answers.
   ADHERE, MIN_WEIGH, MIN_FOOD and REASSESS_DAYS are modelling choices, not figures from
   a source.

   monthly(o) → null | {month, done, planned, weighIns, weight, foodDays, lifts, best, changes[]}
   o: {month "YYYY-MM", sessions, days, body, perWeek, gap, goals[], mains[], assessedAt,
       today, info}
   Pure: plain data in, a plain answer out. */
import {e1rmTrend} from "./strength.js";
import {dayNo, infoOf, num, r1} from "./util.js";

var KCAL_PER_KG=7700,ADHERE=0.6,MIN_WEIGH=4,MIN_FOOD=10,REASSESS_DAYS=84,MIN_DONE=6;
var CAL_GOALS={lose:1,recomp:1,gain:1};

function iso(n){return new Date(n*864e5).toISOString().slice(0,10);}
function monthSpan(m){
  var y=+m.slice(0,4),mo=+m.slice(5,7),a=dayNo(m+"-01"),b=dayNo(new Date(Date.UTC(y,mo,1)).toISOString().slice(0,10))-1;
  return [a,b];}
function avg(xs){return xs.length?xs.reduce(function(a,b){return a+b;},0)/xs.length:null;}

function monthly(o){
  var I=infoOf(o.info),sp=monthSpan(o.month),a=sp[0],b=sp[1],days=b-a+1;
  var inM=function(d){var n=dayNo(d);return n>=a&&n<=b;};
  var done=(o.sessions||[]).filter(function(s){return s&&s.date&&inM(s.date)&&(s.entries||[]).some(function(e){return !I.activity(e.name);});}).length;
  var planned=Math.round(num(o.perWeek)*days/7);
  var w=(o.body||[]).filter(function(x){return x&&x.date&&num(x.weight)>0&&inM(x.date);});
  var first=w.filter(function(x){return dayNo(x.date)<a+7;}).map(function(x){return num(x.weight);}),
      last=w.filter(function(x){return dayNo(x.date)>b-7;}).map(function(x){return num(x.weight);});
  var foodDays=0;
  for(var d=a;d<=b;d++){var r=(o.days||{})[iso(d)];
    if(r&&Object.keys(r.meals||{}).some(function(m){return ((r.meals[m]||{}).items||[]).length;}))foodDays++;}
  if(done<2&&w.length<2&&foodDays<5)return null;
  var out={month:o.month,done:done,planned:planned,weighIns:w.length,weight:null,foodDays:foodDays,lifts:null,best:null,changes:[]};
  if(first.length&&last.length)out.weight={change:r1(avg(last)-avg(first)),
    expected:o.gap!=null?r1(num(o.gap)*days/KCAL_PER_KG):null};
  /* The main lifts across the month: its last day, five weeks back. */
  var up=0,flat=0,down=0,best=null;
  (o.mains||[]).forEach(function(n){
    var tr=e1rmTrend(o.sessions,n,o.info,{today:iso(b),weeks:5});
    if(tr.direction==="insufficient")return;
    if(tr.direction==="rising")up++;else if(tr.direction==="falling")down++;else flat++;
    var ws=tr.weeks,g=ws.length>=2?ws[ws.length-1].best-ws[0].best:0;
    if(g>0&&(!best||g>best.by))best={name:n,from:ws[0].best,to:ws[ws.length-1].best,by:r1(g)};});
  if(up+flat+down)out.lifts={up:up,flat:flat,down:down};
  out.best=best;

  /* ---- what to change ---------------------------------------------------------------- */
  if(planned>=8&&done<planned*ADHERE&&done>0){
    var n=Math.max(2,Math.round(done*7/days));
    if(n<num(o.perWeek))out.changes.push({kind:"days",to:n,done:done,planned:planned});}
  var goals=o.goals||[];
  if(out.lifts&&!up&&flat+down>=2&&done>=MIN_DONE&&goals.length<3){
    var add=goals.indexOf("strength")<0?"strength":goals.indexOf("gain")<0?"gain":null;
    if(add)out.changes.push({kind:"emphasis",add:add,flat:flat,down:down});}
  if(out.weighIns<MIN_WEIGH)out.changes.push({kind:"weigh",n:out.weighIns});
  if(CAL_GOALS[goals[0]]&&foodDays<MIN_FOOD)out.changes.push({kind:"food",n:foodDays});
  if(o.assessedAt&&dayNo(o.today)-dayNo(o.assessedAt)>=REASSESS_DAYS)
    out.changes.push({kind:"reassess",weeks:Math.round((dayNo(o.today)-dayNo(o.assessedAt))/7)});
  return out;}

export {monthly, REASSESS_DAYS};

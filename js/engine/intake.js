/* Bunyan — what was eaten, from what it is given
   A day's totals, the finished days in a window, how often the targets were met and
   the streaks. Like body.js, nothing here reads the app's state: each function is
   handed the food log and the targets, and "today" is an argument, so a test can ask
   about any day. stats.js and energy.js keep their old names as wrappers that pass S
   and today() in.

   The arguments, wherever they appear:
     days   the food log: {"2026-10-01": {meals: {Breakfast: {items: [{kcal, p, c, f, fib}]}}}}
     goals  the day's targets: {kcal, p, c, f}
     now    today's date, "YYYY-MM-DD" */
import {num} from "../util.js";

/* An item list's totals, each rounded once at the end. */
function sumNutrition(items){
  var tot={kcal:0,p:0,c:0,f:0,fib:0};
  (items||[]).forEach(function(i){
    tot.kcal+=num(i.kcal);tot.p+=num(i.p);tot.c+=num(i.c);tot.f+=num(i.f);tot.fib+=num(i.fib);});
  return {kcal:Math.round(tot.kcal),p:Math.round(tot.p),c:Math.round(tot.c),
          f:Math.round(tot.f),fib:Math.round(tot.fib)};
}
/* The calendar date n days before an ISO date. Counted in UTC on the date alone, so a
   clock change cannot make a day 23 or 25 hours long and skip or repeat one. */
function daysBefore(iso,n){
  var d=new Date(iso+"T00:00:00Z");d.setUTCDate(d.getUTCDate()-n);
  return d.toISOString().slice(0,10);}

/* Each day's logged energy, from every meal's items, for the maintenance estimate. */
function intakeDaysOf(days){
  days=days||{};
  return Object.keys(days).map(function(d){
    var meals=(days[d]||{}).meals||{},k=0;
    Object.keys(meals).forEach(function(m){((meals[m]||{}).items||[]).forEach(function(i){k+=num(i.kcal);});});
    return {date:d,kcal:Math.round(k)};});}
/* A day's totals, or null for a day with nothing eaten logged. */
function foodDayOf(days,d){
  var r=days&&days[d];
  if(!r||!r.meals)return null;
  var all=[];
  Object.keys(r.meals).forEach(function(k){(r.meals[k].items||[]).forEach(function(i){all.push(i);});});
  return all.length?sumNutrition(all):null;}
/* The finished days in the window: yesterday and the n−1 before it. Today is still
   going, so it is never averaged or judged. */
function foodDaysOf(days,n,now){
  var out=[];
  for(var i=n;i>=1;i--){var d=daysBefore(now,i),x=foodDayOf(days,d);if(x){x.d=d;out.push(x);}}
  return out;}

/* Within 10% of the target, both ways — the tolerance a food log can honestly
   claim, given what a portion estimate is worth. Protein counts as met at 90% or
   more: over on protein is not a miss. */
var TOL=0.10;
function nearTarget(v,g){return g>0&&Math.abs(v-g)<=g*TOL;}
function macrosMet(x,g){return nearTarget(x.p,g.p)&&nearTarget(x.c,g.c)&&nearTarget(x.f,g.f);}
function proteinMet(x,g){return g.p>0&&x.p>=g.p*(1-TOL);}
function kcalMet(x,g){return nearTarget(x.kcal,g.kcal);}

/* The window's finished days, their averages, and how many met all three macros. */
function nutritionOf(days,goals,n,now){
  var g=goals||{},list=foodDaysOf(days,n,now),k=list.length;
  function avg(key){return k?Math.round(list.reduce(function(a,x){return a+num(x[key]);},0)/k):0;}
  var met=list.filter(function(x){return macrosMet(x,g);}).length;
  return {days:list,count:k,
    avg:{kcal:avg("kcal"),p:avg("p"),c:avg("c"),f:avg("f")},
    met:met,adherence:k?Math.round(met/k*100):null};}
/* Consecutive days back from yesterday. Today joins the run once it qualifies and
   never breaks it before then; a day with nothing logged does break it. */
function runOf(days,goals,now,test){
  var g=goals||{},n=0,t0=foodDayOf(days,now);
  if(t0&&test(t0,g))n++;
  for(var i=1;i<1000;i++){var x=foodDayOf(days,daysBefore(now,i));if(x&&test(x,g))n++;else break;}
  return n;}
function streaksOf(days,goals,now){
  return {protein:runOf(days,goals,now,proteinMet),kcal:runOf(days,goals,now,kcalMet)};}

export {daysBefore, foodDayOf, foodDaysOf, intakeDaysOf, kcalMet, macrosMet, nutritionOf, proteinMet, streaksOf,
        sumNutrition, TOL};

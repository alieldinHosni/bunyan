/* Bunyan — what the body needs today
   The Food page's diagram, worked out from the day's log and the targets: how far each
   of four things has come (protein, carbs, fat, water), which one is furthest behind
   for the time of day, what to eat for it, and what the last week shows.

   Pure: everything comes in as arguments (the day's totals, the targets, the hour, the
   log of days), nothing reads the app's state. tests/architecture.mjs holds it to that,
   and js/engine/test/needs.test.js runs it in Node.

   Behind is judged against the clock, not the whole day: by mid-morning nobody has
   eaten half their protein, and saying "your body needs more protein" at nine in the
   morning would be noise. The share a day should have reached rises from nothing at
   7:00 to all of it at 20:00, and a nutrient is behind when it trails that by more
   than 15 points, and only once a quarter of the day should be in (about 10:15). */
import {daysBefore, foodDayOf, proteinMet} from "./intake.js";

var IDS=["p","c","f","w"];
var SLACK=0.15;

/* How much of the day's targets should be in by this hour: 0 before 7:00, all by 20:00. */
function expected(hour){return Math.max(0,Math.min(1,(hour-7)/13));}

/* The four, each as {id, have, want, pct (0..1+), behind}, and the focus: the one
   furthest behind for the hour, or null when none is. eaten is {kcal,p,c,f}, goals
   {p,c,f,water}, water the ml drunk, hour 0..23. A target of 0 is never behind. */
function needsNow(eaten,goals,water,hour){
  var e=expected(hour),want={p:+goals.p||0,c:+goals.c||0,f:+goals.f||0,w:+goals.water||0};
  var have={p:+eaten.p||0,c:+eaten.c||0,f:+eaten.f||0,w:+water||0};
  var nodes=IDS.map(function(id){
    var pct=want[id]?have[id]/want[id]:1;
    return {id:id,have:Math.round(have[id]),want:want[id],pct:pct,gap:e-pct,behind:want[id]>0&&e>=0.25&&pct<e-SLACK};});
  var focus=null;
  nodes.forEach(function(n){if(n.behind&&(!focus||n.gap>focus.gap))focus=n;});
  return {nodes:nodes,focus:focus?focus.id:null,expected:e};}

/* What is left of a target, rounded to what a person would aim for: 5 g, 250 ml. */
function toGo(n){
  var left=Math.max(0,n.want-n.have);
  return n.id==="w"?Math.round(left/250)*250:Math.round(left/5)*5;}

/* Foods to eat for a nutrient, from a short list of everyday portions (values per
   portion from foods.json): [nutrient, id, grams, serving, drawing, kcal, p, c, f]. */
var PICKS=[
  ["p","greek_yog",170,"pot","yogurt",165,15.3,6.1,8.5],
  ["p","egg",100,"2 large eggs","eggs",143,12.6,0.7,9.5],
  ["p","chicken_breast_ck",150,"150 g","chicken",248,46.5,0.0,5.4],
  ["p","tuna_water",120,"can","tuna",139,31.2,0.0,1.2],
  ["p","cottage",200,"200 g","cottage",196,22.0,6.8,8.6],
  ["p","ful",200,"plate","ful",220,15.2,38.0,1.0],
  ["p","lentils",198,"cup","lentils",230,17.8,39.6,0.8],
  ["c","oats_ck",250,"bowl","oats",178,6.2,30.0,3.8],
  ["c","banana",118,"medium","banana",105,1.3,27.1,0.4],
  ["c","rice_ck",158,"cup","rice",205,4.3,44.2,0.5],
  ["c","baladi",45,"half loaf","bread",124,4.0,24.8,0.7],
  ["c","dates",40,"5 dates","dates",113,1.0,30.0,0.2],
  ["c","sweet_potato",150,"medium","potato",129,2.4,30.0,0.2],
  ["f","almonds",30,"handful","almonds",174,6.3,6.6,15.0],
  ["f","avocado",100,"half","avocado",160,2.0,9.0,15.0],
  ["f","peanut_butter",32,"2 tbsp","pb",188,8.0,6.4,16.0],
  ["f","labneh",60,"2 tbsp","labneh",104,4.8,3.6,7.8]];
var COL={p:6,c:7,f:8};

/* Three to suggest for a nutrient: those whose portion fits in the calories left (when
   any are left), richest in it per calorie first, then the smallest of the rest. Each as {id, grams, label, art, kcal,
   p, c, f, amount}: amount is how much of the nutrient the portion brings. Water has
   none; a glass is offered instead. */
function suggestFor(id,kcalLeft){
  if(!COL[id])return [];
  var col=COL[id],cap=kcalLeft>0?Math.max(140,kcalLeft+40):Infinity;
  var rows=PICKS.filter(function(r){return r[0]===id;}).map(function(r){
    return {id:r[1],grams:r[2],label:r[3],art:r[4],kcal:r[5],p:r[6],c:r[7],f:r[8],amount:r[col]};});
  var dens=function(a,b){return b.amount/b.kcal-a.amount/a.kcal;};
  var fit=rows.filter(function(r){return r.kcal<=cap;}).sort(dens);
  /* Fewer than three fit: the smallest of the rest make up the three. */
  var rest=rows.filter(function(r){return r.kcal>cap;}).sort(function(a,b){return a.kcal-b.kcal;});
  return fit.concat(rest).slice(0,3);}

/* What the last week shows, for the "Coach noticed" card: the days before today with
   food logged (at most 7), how many of them protein reached its target, and of the
   days with a workout, how many fell short. trainedOn is the set of dates with a
   session ({iso:true}). Null with fewer than three logged days: too little to see a
   pattern in. kind says which sentence fits:
     "train"  protein short on two or more training days
     "short"  short on at least half the days logged
     "kept"   reached on most days */
function weekPattern(days,goals,now,trainedOn){
  var logged=[],shortTrain=0,trainDays=0,met=0;
  for(var i=1;i<=7;i++){
    var d=daysBefore(now,i),x=foodDayOf(days,d);
    if(!x||!x.kcal)continue;
    logged.push(d);
    var ok=proteinMet(x,goals);
    if(ok)met++;
    if(trainedOn[d]){trainDays++;if(!ok)shortTrain++;}}
  var n=logged.length;
  if(n<3||!(goals.p>0))return null;
  var kind=shortTrain>=2?"train":(n-met)*2>=n?"short":"kept";
  return {kind:kind,days:n,met:met,short:n-met,trainDays:trainDays,shortTrain:shortTrain};}

export {expected, needsNow, PICKS, suggestFor, toGo, weekPattern};

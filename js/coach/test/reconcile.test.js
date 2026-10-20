import {reconcileNutrition, reconcileTraining} from "../reconcile.js";
import {BASIS, LANDMARKS} from "../landmarks.js";

/* The week of Monday 19 October 2026. */
var WEEK=["2026-10-19","2026-10-20","2026-10-21","2026-10-22","2026-10-23","2026-10-24","2026-10-25"];
var T={kcal:2400,p:180,c:250,f:75};
function days(eaten,target){
  return WEEK.map(function(d,i){return {date:d,target:target||T,eaten:eaten[i]==null?null:{kcal:eaten[i]}};});}
function sum(a){return a.reduce(function(x,y){return x+y;},0);}
function shifts(r){return r.days.map(function(d){return d.shift;});}

function nutrition(t){
  /* No data: a defined answer, never a crash. */
  var none=reconcileNutrition();
  t.eq([none.kind,none.why],["none","bmr"],"no input: none");
  t.clean(none,"no input: no NaN or undefined");
  t.eq(reconcileNutrition({days:days([]),from:WEEK[1]}).why,"bmr","no BMR: nothing computed, nothing assumed");
  t.eq(reconcileNutrition({days:[],bmr:1800,from:WEEK[1]}).why,"targets","no targets: none");
  t.eq(reconcileNutrition({days:days([]),bmr:1800}).why,"from","no first open day: none");

  /* On track: nothing moves. */
  var ok=reconcileNutrition({days:days([2400,2400]),bmr:1800,from:WEEK[2]});
  t.eq([ok.kind,ok.gap,sum(shifts(ok))],["on_track",0,0],"days on target: on track, nothing moves");
  t.eq(reconcileNutrition({days:days([2396]),bmr:1800,from:WEEK[1]}).kind,"on_track","a gap under one 10 kcal step: on track");

  /* A blown Monday: 1,000 over, spread across the six days left, evenly. */
  var big=reconcileNutrition({days:days([3400]),bmr:1800,from:WEEK[1]});
  var sh=shifts(big);
  t.eq([big.kind,big.gap,big.days.length],["adjust",-1000,6],"1,000 kcal over on Monday: the six days left absorb it");
  t.eq(sum(sh),-1000,"the whole gap is accounted for");
  t.ok(sh.every(function(x){return Math.abs(x)<=2400*0.15;}),"no day moves more than 15%");
  t.ok(Math.max.apply(null,sh)-Math.min.apply(null,sh)<=10,"spread evenly, not loaded onto one day");
  t.ok(big.days.every(function(d){return d.p===180;}),"protein holds");
  t.ok(big.days.every(function(d){return d.c<250&&d.f<75;}),"carbs and fat both take the cut");
  var d170=big.days.filter(function(d){return d.shift===-170;})[0]||{};
  t.eq([d170.kcal,d170.c,d170.f],[2230,225,67],"170 kcal off: carbs and fat in proportion to their share");
  t.clean(big,"adjust: no NaN or undefined");

  /* Under-eating the same way raises the days left. */
  var low=reconcileNutrition({days:days([1400]),bmr:1800,from:WEEK[1]});
  t.eq([low.kind,sum(shifts(low))],["adjust",1000],"1,000 kcal under: the days left go up");
  t.ok(low.days.every(function(d){return d.p===180&&d.c>250&&d.f>75;}),"protein holds; carbs and fat rise");

  /* Too big to absorb: let it go, rather than a day that breaks the limits. */
  var huge=reconcileNutrition({days:days([6000]),bmr:1800,from:WEEK[1]});
  t.eq([huge.kind,huge.why,huge.days],["week_fine","limits",[]],"3,600 over: the week is still fine, no day is made harder");
  t.clean(huge,"week fine: no NaN or undefined");
  var sun=reconcileNutrition({days:days([3400,2400,2400,2400,2400,2400]),bmr:1800,from:WEEK[6]});
  t.eq(sun.kind,"week_fine","Sunday alone cannot take 1,000 kcal: the week is still fine");
  var gone=reconcileNutrition({days:days([3400,2400,2400,2400,2400,2400,2400]),bmr:1800,from:"2026-10-26"});
  t.eq([gone.kind,gone.why],["week_fine","no_days_left"],"no days left: the week is still fine");

  /* BMR is a hard floor. */
  var near=reconcileNutrition({days:days([3400]),bmr:2300,from:WEEK[1]});
  t.eq(near.kind,"week_fine","BMR 2,300 leaves 100 kcal a day: 1,000 does not fit, so nothing moves");
  var fits=reconcileNutrition({days:days([2900]),bmr:2300,from:WEEK[1]});
  t.eq(fits.kind,"adjust","500 over with 100 kcal of room a day: it fits");
  t.ok(fits.days.every(function(d){return d.kcal>=2300;}),"and no day goes under BMR");
  var under=reconcileNutrition({days:days([2900]),bmr:2500,from:WEEK[1]});
  t.eq(under.kind,"week_fine","a target already under BMR cannot move down");
  t.eq(reconcileNutrition({days:days([1900]),bmr:2500,from:WEEK[1]}).kind,"adjust","but it can move up");

  /* A day with nothing logged is no history, not zero eaten. */
  var gap=reconcileNutrition({days:days([null,2400]),bmr:1800,from:WEEK[2]});
  t.eq([gap.kind,gap.gap,gap.unlogged],["on_track",0,[WEEK[0]]],"an unlogged Monday adds nothing to the gap and is named");
  t.eq(reconcileNutrition({days:days([0]),bmr:1800,from:WEEK[1]}).unlogged,[WEEK[0]],"0 kcal logged reads as unlogged, not as a fast");}

/* Training: sets per muscle, the app's way. */
function S(date,sets){return {date:date,sets:sets};}

function M(r,m){return r.muscles.filter(function(x){return x.muscle===m;})[0]||{};}

function training(t){
  var none=reconcileTraining();
  t.eq(none.kind,"none","no input: none");
  t.clean(none,"no input: no NaN or undefined");
  t.eq(reconcileTraining({missed:S(WEEK[1],{Triceps:0.5}),sessions:[],from:WEEK[2]}).kind,"nothing_missed","half a set missed: nothing to move");
  t.clean(reconcileTraining({missed:S(WEEK[1],{Chest:2}),sessions:[S(WEEK[3],{})],from:WEEK[2]}),"a cardio session with no sets: no crash");

  /* A small miss fits: one set per muscle per session, into sessions that train it. */
  var week=[S(WEEK[0],{Chest:6}),S(WEEK[3],{Chest:5,Biceps:2}),S(WEEK[5],{Chest:5,Biceps:2})];
  var small=reconcileTraining({missed:S(WEEK[1],{Chest:2,Biceps:1}),sessions:week,from:WEEK[2]});
  t.eq([small.kind,small.missed,small.moved,small.gone],["adjust",3,3,0],"two chest sets and a biceps set: all three fit");
  t.eq(small.add,[{date:WEEK[3],muscle:"Biceps",sets:1},{date:WEEK[3],muscle:"Chest",sets:1},{date:WEEK[5],muscle:"Chest",sets:1}],
    "one extra set per muscle per session, spread over the sessions that train it");
  t.ok(16+2<=LANDMARKS.Chest.mrv,"and the week stays under the chest MRV");
  t.eq(small.basis,BASIS,"the landmarks travel with their label: heuristics, not measurements");
  t.clean(small,"adjust: no NaN or undefined");

  /* A missed leg day: what fits moves, the rest is gone, and both numbers are said. */
  var legs=reconcileTraining({missed:S(WEEK[1],{Quads:6,Hamstrings:4}),
    sessions:[S(WEEK[0],{Chest:6}),S(WEEK[3],{Back:6}),S(WEEK[5],{Quads:6,Hamstrings:4})],from:WEEK[2]});
  t.eq([legs.kind,legs.missed,legs.moved,legs.gone],["partial",10,2,8],"ten leg sets missed, one leg session left: 2 moved, 8 gone");
  t.eq(M(legs,"Quads"),{muscle:"Quads",missed:6,moved:1,gone:5,ceiling:"mrv",why:"per_session"},"1 of 6 quad sets moved to Saturday, the other 5 are gone");
  t.eq(legs.add,[{date:WEEK[5],muscle:"Hamstrings",sets:1},{date:WEEK[5],muscle:"Quads",sets:1}],"each moved set says where it went");
  t.clean(legs,"partial: no NaN or undefined");

  /* The MRV is a hard ceiling. */
  var high=reconcileTraining({missed:S(WEEK[1],{Chest:2}),sessions:[S(WEEK[0],{Chest:11}),S(WEEK[3],{Chest:5}),S(WEEK[5],{Chest:5})],from:WEEK[2]});
  t.eq([high.kind,M(high,"Chest").moved,M(high,"Chest").why],["partial",1,"mrv"],"21 chest sets with an MRV of 22: one goes in, not two");
  var full=reconcileTraining({missed:S(WEEK[1],{Chest:2}),sessions:[S(WEEK[0],{Chest:12}),S(WEEK[3],{Chest:5}),S(WEEK[5],{Chest:5})],from:WEEK[2]});
  t.eq([full.kind,full.moved,M(full,"Chest").why],["week_fine",0,"mrv"],"already at the MRV: nothing goes in, the week is still fine");

  /* At least one rest day between sessions for the same muscle. */
  var close=reconcileTraining({missed:S(WEEK[1],{Chest:1}),sessions:[S(WEEK[3],{Chest:5}),S(WEEK[4],{Chest:5})],from:WEEK[2]});
  t.eq([close.kind,M(close,"Chest").why],["week_fine","rest_days"],"Thursday and Friday both train chest: neither takes another set");

  /* Saturday missed: nothing left to take it. */
  var sat=reconcileTraining({missed:S(WEEK[5],{Back:5}),sessions:[S(WEEK[1],{Back:5})],from:WEEK[6]});
  t.eq([sat.kind,sat.gone,M(sat,"Back").why],["week_fine",5,"no_session"],"a session missed on Saturday: the week is still fine, this one's gone");

  /* No MRV in the landmarks: the one-set limit governs alone, and the result says so. */
  var fore=reconcileTraining({missed:S(WEEK[1],{Forearms:3}),sessions:[S(WEEK[3],{Forearms:2}),S(WEEK[5],{Forearms:2})],from:WEEK[2]});
  t.eq([fore.kind,M(fore,"Forearms").moved,M(fore,"Forearms").ceiling,M(fore,"Forearms").why],["partial",2,"none","per_session"],
    "forearms, no MRV: one set per session still moves, marked as having no recovery ceiling");}

function run(t){nutrition(t);training(t);}

export {run};

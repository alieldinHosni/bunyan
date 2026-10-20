import {dayTargetsFor, reconcileWeekFor} from "../targets.js";
import {bmrOf, macroTargetsOf} from "../../engine/body.js";

var WEEK=["2026-10-19","2026-10-20","2026-10-21","2026-10-22","2026-10-23","2026-10-24","2026-10-25"];
var P={age:35,height:178,sex:"m",activity:1.55,goal:"maintain"};
var BODY=[{date:"2026-10-01",weight:80}];

function run(t){
  /* No weight anywhere: no number, never a default weight. */
  var nw=dayTargetsFor(P,[],null,WEEK[0]);
  t.eq([nw.kind,nw.bmr,nw.target],["no_weight",0,null],"no weight set: no_weight, not a default");
  t.eq(dayTargetsFor({height:178,sex:"m"},BODY,null,WEEK[0]).kind,"no_profile","no age: no_profile");
  t.eq(dayTargetsFor(undefined,undefined,undefined,WEEK[0]).kind,"no_profile","nothing at all: no_profile");
  var nr=reconcileWeekFor({profile:P,body:[],week:WEEK,from:WEEK[1]});
  t.eq([nr.kind,nr.why],["none","no_weight"],"reconciling with no weight: none, and why");
  t.clean(nr,"no weight: no NaN or undefined");

  /* The engine's numbers, unchanged: one implementation. */
  var d=dayTargetsFor(P,BODY,null,WEEK[0]),m=macroTargetsOf(P,BODY,null);
  t.eq([d.bmr,d.target],[bmrOf(P,BODY),{kcal:m.kcal,p:m.p,c:m.c,f:m.f}],"BMR and targets are the engine's own");
  t.eq(dayTargetsFor({age:35,height:178,sex:"m",weight:80},[],null,WEEK[0]).bmr,bmrOf(P,BODY),"the profile's weight counts when there are no weigh-ins");

  /* A past day uses the weight it had then. */
  var body2=[{date:"2026-10-01",weight:80},{date:"2026-10-22",weight:90}];
  t.ok(dayTargetsFor(P,body2,null,WEEK[0]).target.kcal<dayTargetsFor(P,body2,null,WEEK[4]).target.kcal,"Monday's target is Monday's, not today's");

  /* A blown Monday, end to end. */
  var r=reconcileWeekFor({profile:P,body:BODY,week:WEEK,eaten:{"2026-10-19":m.kcal+700},from:WEEK[1]});
  t.eq([r.kind,r.gap,r.days.length,r.noTarget],["adjust",-700,6,[]],"700 over on Monday: spread over the six days left");
  t.ok(r.days.every(function(x){return x.kcal>=d.bmr&&x.p===m.p;}),"never under BMR; protein holds");
  t.clean(r,"end to end: no NaN or undefined");

  /* No weight until midweek: earlier days have no target and are named. */
  var late=reconcileWeekFor({profile:P,body:[{date:"2026-10-22",weight:80}],week:WEEK,eaten:{},from:WEEK[3]});
  t.eq(late.noTarget,[WEEK[0],WEEK[1],WEEK[2]],"days before the first weigh-in have no target and are listed");}

export {run};

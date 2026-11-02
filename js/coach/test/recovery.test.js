import {dayReady, readiness, suggest} from "../recovery.js";

/* The owner's case (2 Nov): Pull trained today instead of Push, and Pull is tomorrow. */
var MUS={"Row":"Back","Pulldown":"Back","Curl":"Biceps","Bench":"Chest","Press":"Shoulders","Pushdown":"Triceps","Squat":"Quads","RDL":"Hamstrings","Calf":"Calves"};
var SEC={"Row":["Biceps"],"Pulldown":["Biceps"],"Bench":["Triceps","Shoulders"],"Squat":["Glutes"],"RDL":["Glutes"]};
var info={muscle:function(n){return MUS[n]||"Other";},secondary:function(n){return SEC[n]||[];},activity:function(n){return n==="Running";}};
function sets(k,rpe){var a=[];for(var i=0;i<k;i++)a.push({w:50,r:8,rpe:rpe||8});return a;}
var push={id:"push",name:"Push",ex:[{name:"Bench",sets:4},{name:"Press",sets:3},{name:"Pushdown",sets:3}]};
var pull={id:"pull",name:"Pull",ex:[{name:"Row",sets:4},{name:"Pulldown",sets:3},{name:"Curl",sets:3}]};
var legs={id:"legs",name:"Legs",ex:[{name:"Squat",sets:4},{name:"RDL",sets:3},{name:"Calf",sets:3}]};
var rest={id:"rest",name:"Rest",ex:[]};

function run(t){
  var today="2026-11-02",tomorrow="2026-11-03";
  var log=[{date:today,entries:[{name:"Row",sets:sets(4)},{name:"Pulldown",sets:sets(3)},{name:"Curl",sets:sets(3)}]}];
  var r=readiness(log,tomorrow,info,0);
  t.eq([r.Back,r.Biceps,r.Chest],[0,0,undefined],"a day after a full Pull: back and biceps need that day of rest; chest untouched");
  t.eq(readiness(log,"2026-11-04",info,0),{},"two days after: ready again (a rest day between)");
  t.eq(dayReady(pull.ex,r,info)<0.65&&dayReady(legs.ex,r,info)===1,true,"tomorrow's Pull is not ready; Legs is fresh");
  var s=suggest([push,pull,legs,rest],1,r,info);
  t.eq([s&&s.to,s&&s.tired],["legs",["Back","Biceps"]],"swap Pull for Legs, the next fresh day in the split's order, naming why");
  t.eq(suggest([push,pull,legs],0,r,info),null,"Push is ready: no suggestion");
  /* A light touch is not a full session. */
  var light=readiness([{date:today,entries:[{name:"Curl",sets:sets(2)}]}],tomorrow,info,0);
  t.eq(light.Biceps,0.5,"two sets the day before: half ready");
  t.eq(readiness([{date:today,entries:[{name:"Row",sets:sets(4,6)}]}],tomorrow,info,0).Back,0.5,"easy sets (RPE 6) count half");
  var one=[{date:today,entries:[{name:"Curl",sets:sets(1)}]}];
  t.eq([readiness(one,tomorrow,info,0).Biceps,readiness(one,tomorrow,info,8).Biceps],[0.75,0.5],"sore 8/10: held back to half at most");
  t.eq(readiness([{date:today,entries:[{name:"Running",sets:[{r:30}]}]}],tomorrow,info,0),{},"a run is not lifting");
  /* No day is fresher: nothing is suggested (rest is always open). */
  var all=[{date:today,entries:[{name:"Bench",sets:sets(4)},{name:"Row",sets:sets(4)},{name:"Squat",sets:sets(4)},{name:"RDL",sets:sets(3)}]}];
  t.eq(suggest([push,pull,legs],1,readiness(all,tomorrow,info,0),info),null,"everything trained: no better day to offer");}

export {run};

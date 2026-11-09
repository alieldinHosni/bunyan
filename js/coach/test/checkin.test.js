import {checkin} from "../checkin.js";
import {addDays} from "./assert.js";

/* The weekly check-in (js/coach/checkin.js) reads last week and proposes changes only
   where the log has the data: a shorter week after two weeks of missed days, a calorie
   step when weight moves off the goal's pace on a week eaten to target, a lighter week
   for soreness or effort, balancing a program out of range. */
var INFO={muscle:function(){return "Chest";},secondary:function(){return [];},activity:function(n){return n==="Walk";}};
var WS="2026-11-02";   /* this week began on this day; last week is 26 Oct – 1 Nov */
function lift(date,rpe,n){var sets=[];for(var i=0;i<(n||3);i++)sets.push({w:60,r:8,rpe:rpe||0});return {date:date,entries:[{name:"Bench",sets:sets}]};}
function base(o){return Object.assign({today:WS,weekStart:WS,sessions:[],days:{},body:[],planned:4,kcal:2000,gap:-500,floor:1500,
  rpeTarget:8,range:null,plannedSets:null,info:INFO,deloadOn:false},o||{});}
function food(kcal){return {meals:{Lunch:{items:[{kcal:kcal}]}}};}

function run(t){
  var empty=checkin(base());
  t.eq([empty.from,empty.to,empty.done,empty.changes],["2026-10-26","2026-11-01",0,[]],"no log, nothing proposed");

  var two=[lift("2026-10-27"),lift("2026-10-30"),lift("2026-10-20"),lift("2026-10-22"),{date:"2026-10-28",entries:[{name:"Walk",sets:[]}]}];
  var c=checkin(base({sessions:two}));
  t.eq([c.done,c.donePrev],[2,2],"workouts last week and the week before; a walk alone is not one");
  t.eq(c.changes.filter(function(x){return x.kind==="days";})[0],{kind:"days",to:2,done:2,donePrev:2,planned:4},"two weeks short of four: a two-day week");
  t.eq(checkin(base({sessions:two.concat([lift("2026-10-31"),lift("2026-11-01")])})).changes.length,0,"a full week last week: nothing");

  /* Weight: losing 0.1 kg a week against a 500 kcal gap (0.45 a week), eaten to target. */
  var body=[],days={};
  for(var i=0;i<21;i+=3)body.push({date:addDays("2026-11-01",-i),weight:80+i*0.1/7});
  for(var j=0;j<7;j++)days[addDays("2026-11-01",-j)]=food(2050);
  var k=checkin(base({body:body,days:days,planned:0})).changes[0];
  t.eq([k.kind,k.by,k.to,k.why],["kcal",-100,1900,"slow"],"losing at under half the pace, eaten to target: 100 kcal less");
  var off={};for(var j2=0;j2<7;j2++)off[addDays("2026-11-01",-j2)]=food(2600);
  /* Eaten well over target (owner, 9 Nov: changes that work): the target stays, and the
     coach says the eating is what slowed it. */
  t.eq(checkin(base({body:body,days:off,planned:0})).changes.map(function(x){return [x.kind,x.over];}),[["eat",600]],"eaten well over target: the target stays, the eating is named");
  /* Under target on a deficit and losing slowly: eating less is not the reason, so no "eat". */
  var under={};for(var j3=0;j3<7;j3++)under[addDays("2026-11-01",-j3)]=food(1500);
  t.eq(checkin(base({body:body,days:under,planned:0})).changes.filter(function(x){return x.kind==="eat";}),[],"under a deficit and losing slowly: not the eating");
  /* Protein under 85% of the target on four days or more. */
  var lowp={};for(var j4=0;j4<5;j4++)lowp[addDays("2026-11-01",-j4)]={meals:{L:{items:[{kcal:2000,p:90}]}}};
  var pr=checkin(base({days:lowp,planned:0,protein:150}));
  t.eq([pr.food.p,pr.changes.filter(function(x){return x.kind==="protein";}).map(function(x){return [x.avg,x.target];})],[90,[[90,150]]],"protein 90 g against 150: said");
  t.eq(checkin(base({days:lowp,planned:0,protein:100})).changes.filter(function(x){return x.kind==="protein";}),[],"90 against 100: close enough");
  /* Steps: 4,000 a day against 10,000, a stepping stone 1,500 above what was walked. */
  var walk={};for(var j5=0;j5<5;j5++)walk[addDays("2026-11-01",-j5)]={steps:4000};
  t.eq(checkin(base({days:walk,planned:0,steps:10000})).changes.filter(function(x){return x.kind==="steps";}).map(function(x){return x.to;}),[5500],"steps far under: a goal that can be met");
  t.eq(checkin(base({days:walk,planned:0,steps:5000})).changes.filter(function(x){return x.kind==="steps";}),[],"steps near the goal: nothing");
  /* The main lifts read for what they say: a bench rising week on week. */
  var rise=[];for(var w=0;w<4;w++)rise.push({date:addDays("2026-11-01",-7*(3-w)),entries:[{name:"Bench",sets:[{w:60+w*5,r:8}]}]});
  t.eq(checkin(base({sessions:rise,planned:0,mains:["Bench"]})).lifts,{up:1,flat:0,down:0},"a main lift rising is said too");
  t.eq(checkin(base({body:body,days:days,planned:0,floor:1950})).changes,[],"never under the floor");
  var fast=body.map(function(b,i){return {date:b.date,weight:80+i*3*1.2/7};});
  t.eq(checkin(base({body:fast,days:days,planned:0})).changes[0].by,100,"losing at over one and a half the pace: 100 more");
  t.eq(checkin(base({body:body.slice(0,3),days:days,planned:0})).weight,null,"three weigh-ins are not a trend");

  /* Effort and soreness. */
  var hard=[lift("2026-10-27",9.5,6),lift("2026-10-29",9.5,6)];
  var d1=checkin(base({sessions:hard,planned:0}));
  t.eq([d1.rpe.avg,d1.rpe.n,d1.changes[0].kind,d1.changes[0].hard],[9.5,12,"deload",true],"sets well over the planned effort: a lighter week");
  t.eq(checkin(base({sessions:hard,planned:0,deloadOn:true})).changes,[],"not during a lighter week");
  var sore={};["2026-10-27","2026-10-28","2026-10-30"].forEach(function(d){sore[d]={sore:7};});
  t.eq(checkin(base({days:sore,planned:0})).changes[0].sore,true,"sore on three days: a lighter week");

  var b=checkin(base({planned:0,range:[10,20],plannedSets:{Chest:14,Back:6,Biceps:30},judged:["Chest","Back","Biceps"]})).changes[0];
  t.eq([b.kind,b.low,b.high],["balance",["Back"],["Biceps"]],"the program's sets out of range: balance them");
  t.clean(d1,"clean");}

export {run};

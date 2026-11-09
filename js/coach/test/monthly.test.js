import {monthly} from "../monthly.js";
import {addDays} from "./assert.js";

/* The monthly review (js/coach/monthly.js): what October shows, and the larger changes
   it proposes only where the month has the data. */
var INFO={muscle:function(){return "Chest";},secondary:function(){return [];},activity:function(n){return n==="Walk";}};
function lift(date,w){return {date:date,entries:[{name:"Bench",sets:[{w:w||60,r:8},{w:w||60,r:8}]}]};}
function base(o){return Object.assign({month:"2026-10",sessions:[],days:{},body:[],perWeek:3,gap:-500,goals:["gain"],mains:["Bench"],
  assessedAt:null,today:"2026-11-03",info:INFO},o||{});}

function run(t){
  t.eq(monthly(base()),null,"nothing logged: nothing to review");
  /* Twelve workouts, the bench flat all month, weighed eight times. */
  var ss=[],body=[];
  for(var i=0;i<12;i++)ss.push(lift(addDays("2026-10-01",i*2+1),60));
  for(var j=0;j<8;j++)body.push({date:addDays("2026-10-01",j*4),weight:80-j*0.1});
  var fed={};for(var f=0;f<14;f++)fed[addDays("2026-10-05",f)]={meals:{L:{items:[{kcal:2500}]}}};
  var r=monthly(base({sessions:ss,body:body,days:fed}));
  t.eq([r.done,r.planned,r.weighIns],[12,13,8],"workouts against the month's plan; weigh-ins");
  t.eq(r.weight.change,-0.6,"the first week's average (80, 79.9) against the last week's (79.4, 79.3)");
  t.eq(r.weight.expected,-2,"what a 500 kcal gap would give over 31 days");
  t.eq([r.foodDays,r.changes.map(function(x){return x.kind;})],[14,[]],"one flat lift is not a stall to act on; enough weigh-ins and food days");
  /* Two main lifts flat all month: a new stimulus, strength added. */
  var two=ss.map(function(s){return {date:s.date,entries:s.entries.concat([{name:"Squat",sets:[{w:100,r:8}]}])};});
  var e=monthly(base({sessions:two,body:body,mains:["Bench","Squat"]})).changes.filter(function(x){return x.kind==="emphasis";})[0];
  t.eq([e&&e.add],["strength"],"no main lift rising for a month: strength added for days of its own");
  t.eq(monthly(base({sessions:two,body:body,mains:["Bench","Squat"],goals:["gain","strength"]})).changes.filter(function(x){return x.kind==="emphasis";}).length,0,
    "strength already trained, size the main goal: nothing left to add");
  /* Five of thirteen: a week of the days trained. */
  var few=monthly(base({sessions:ss.slice(0,5),body:body})).changes.filter(function(x){return x.kind==="days";})[0];
  t.eq([few&&few.to],[2],"five of thirteen done: a two-day week");
  /* Two weigh-ins, a calorie goal and three days of food: both asked for. */
  var d={};for(var k=0;k<3;k++)d[addDays("2026-10-10",k)]={meals:{L:{items:[{kcal:2000}]}}};
  var thin=monthly(base({sessions:ss,body:body.slice(0,2),days:d,goals:["lose"]})).changes.map(function(x){return x.kind;});
  t.ok(thin.indexOf("weigh")>=0&&thin.indexOf("food")>=0,"too few weigh-ins and food days, on a calorie goal: both said");
  t.ok(monthly(base({sessions:ss,body:body.slice(0,2),days:d,goals:["strength"]})).changes.every(function(x){return x.kind!=="food";}),"not a calorie goal: food logging is not pressed");
  /* Twelve weeks since the assessment: answer it again. */
  t.eq(monthly(base({sessions:ss,body:body,assessedAt:"2026-08-10"})).changes.filter(function(x){return x.kind==="reassess";}).map(function(x){return x.weeks;}),[12],"twelve weeks since the assessment");
  t.eq(monthly(base({sessions:ss,body:body,assessedAt:null})).changes.filter(function(x){return x.kind==="reassess";}).length,0,"no assessment date: not asked (absent is unknown)");}

export {run};

import {rebalanceWeek} from "../missed.js";

/* A missed day this week (js/coach/missed.js): moved to a free day with a rest day either
   side for its muscles; else its key lifts folded into the days left where the rest rule
   and the time allow; covered when the days left train those muscles anyway; else let go. */
var MUS={Bench:"Chest",Press:"Shoulders",Fly:"Chest",Row:"Back",Pulldown:"Back",Squat:"Quads",RDL:"Hamstrings",Curl:"Biceps"};
var INFO={muscle:function(n){return MUS[n]||"Other";},secondary:function(){return [];},activity:function(){return false;},
  compound:function(n){return n!=="Fly"&&n!=="Curl";}};
var PUSH=[{name:"Bench",sets:3},{name:"Press",sets:3},{name:"Fly",sets:3}],PULL=[{name:"Row",sets:3},{name:"Pulldown",sets:3},{name:"Curl",sets:3}],
    LEGS=[{name:"Squat",sets:3},{name:"RDL",sets:3}];
function load(ex){var m={};(ex||[]).forEach(function(e){var k=MUS[e.name];m[k]=(m[k]||0)+e.sets;});return m;}
function day(date,id,ex,done){return {date:date,dayId:id||null,name:id||"",ex:ex||[],done:!!done,load:id?load(ex):{},mins:id?40:0};}
/* Fri 30 Oct (neighbour), Sat 31 … Fri 6 Nov, Sat 7 (neighbour). */
function week(list){var d=["2026-10-30","2026-10-31","2026-11-01","2026-11-02","2026-11-03","2026-11-04","2026-11-05","2026-11-06","2026-11-07"];
  return list.map(function(x,i){return day(d[i],x&&x[0],x&&x[1],x&&x[2]);});}
function run(t){
  var base={today:"2026-11-03",info:INFO,budget:60,addMin:function(n,s){return s*2.5;}};
  /* Push Sat done, Pull Mon missed, Legs Wed, rest Tue Thu Fri. */
  var w1=week([null,["Push",PUSH,true],null,["Pull",PULL],null,["Legs",LEGS],null,null,null]);
  var r=rebalanceWeek(Object.assign({days:w1},base));
  t.eq([r.missed.date,r.kind,r.to],["2026-11-02","move","2026-11-03"],"a free day ahead with no back work either side: the day moves there");
  t.eq(rebalanceWeek(Object.assign({days:w1,handled:{"2026-11-02":1}},base)),null,"dealt with already: nothing");
  /* Every day ahead taken or next to back work: Pull Tue, Pull-free days only beside Pull. */
  var w2=week([null,["Push",PUSH,true],["Legs",LEGS,true],["Push2",PUSH],["Pull",PULL],["Legs",LEGS],["Push",PUSH],["Legs",LEGS],null]);
  var f=rebalanceWeek(Object.assign({days:w2},base));
  t.eq(f.kind,"covered","Push missed, the week has more Push ahead: nothing to carry");
  var w3=week([null,["Push",PUSH,true],["Pull",PULL],null,["Legs",LEGS],["Push",PUSH],["Legs",LEGS],["Push",PUSH],null]);
  var g=rebalanceWeek(Object.assign({},base,{days:w3,today:"2026-11-02"}));
  t.eq(g.kind,"move","Pull missed Sun, Mon free and no back either side: moved");
  /* No free day: Pull missed, the rest all training days. */
  var w4=week([["Legs",LEGS,true],["Push",PUSH,true],["Pull",PULL],["Legs",LEGS,true],["Push",PUSH],["Legs",LEGS],["Push",PUSH],["Legs",LEGS],["Push",PUSH]]);
  var k=rebalanceWeek(Object.assign({days:w4},base));
  t.eq([k.kind,k.adds.map(function(a){return [a.date,a.name,a.sets];})],["fold",[["2026-11-03","Row",2]]],"no free day: the first back lift, 2 sets, on the first day left without back work beside it");
  t.ok(k.adds.every(function(a){return a.name!=="Curl";}),"a single-joint lift is not carried");
  var tight=rebalanceWeek(Object.assign({days:w4},base,{budget:38}));
  t.eq([tight.kind,tight.left],["none",["Back"]],"no day has the time: let it go, and say which muscle");
  /* Nothing fits (owner, 9 Nov: "adjust the whole week or a training day"): the lift
     goes in anyway, the time limit set aside, and says how much longer the day gets. */
  t.eq([tight.adjust.fold.adds.map(function(a){return [a.date,a.name,a.sets];}),tight.adjust.fold.mins],
    [[["2026-11-03","Row",2]],[{date:"2026-11-03",mins:5}]],"adjust: the row on Tuesday anyway, 5 min longer");
  t.eq(tight.adjust.move,undefined,"no free day ahead: no move to offer");
  /* A free day ahead, but beside back work: the move is offered, naming the day it crowds. */
  /* Pull missed Thursday; Friday, the one day left, sits before next week's Pull. */
  var w5=week([null,["Push",PUSH,true],null,["Legs",LEGS,true],null,null,["Pull",PULL],null,["Pull",PULL]]);
  var m5=rebalanceWeek(Object.assign({},base,{days:w5,today:"2026-11-06"}));
  t.eq(m5.kind!=="move"&&!!m5.adjust,true,"no clean move: adjust offered");
  t.eq([m5.adjust.move.to,m5.adjust.move.near.length],["2026-11-06",1],"the free day with fewest clashing neighbours, and the one it crowds");
  t.eq(k.adjust,undefined,"a clean fold needs no adjust");
  t.eq(rebalanceWeek(Object.assign({days:week([null,["Push",PUSH,true],null,null,null,null,null,null,null])},base)),null,"nothing missed: nothing");
  t.clean(k,"clean");}

export {run};

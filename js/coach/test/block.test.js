import {blockAt, planVolume, setShift, shiftDay, soreAfter, stepOf} from "../block.js";
import {addDays, mk} from "./assert.js";

var START="2026-09-07";
var MUS={Bench:"Chest","Incline Press":"Chest",Squat:"Quads",Curl:"Biceps"};
var INFO={muscle:function(n){return MUS[n]||"Other";},activity:function(n){return /Running/.test(n);}};
/* A workout on day n of the block that trained these lifts, answered with feel. */
function w(n,names,feel){
  var s=mk(addDays(START,n),names.map(function(x){return [x,[[60,8,7],[60,8,7]]];}));
  if(feel)s.feel=feel;return s;}
function opts(today,extra){
  var o={start:START,today:today,days:{}};
  Object.keys(extra||{}).forEach(function(k){o[k]=extra[k];});return o;}

function run(t){
  /* ---- where a date falls ---- */
  t.eq([blockAt(null,START),blockAt(START,"2026-09-06")],[null,null],"no start, or before it: no block");
  var b1=blockAt(START,START);
  t.eq([b1.block,b1.week,b1.of,b1.light,b1.rir],[1,1,4,false,3],"the first day: block 1, week 1 of 4, 3 in reserve");
  t.eq([blockAt(START,addDays(START,7)).rir,blockAt(START,addDays(START,16)).rir],[2,1],"effort builds: 2 in reserve in week 2, 1 in week 3");
  var lw=blockAt(START,addDays(START,21));
  t.eq([lw.week,lw.light,lw.rir,lw.lightFrom,lw.end,lw.next],[4,true,4,"2026-09-28","2026-10-04","2026-10-05"],
    "week 4 is the lighter one, and says when the next block begins");
  var b2=blockAt(START,addDays(START,29));
  t.eq([b2.block,b2.week,b2.start],[2,1,"2026-10-05"],"then block 2 starts at week 1 again");
  t.clean(b2,"a block: no NaN or undefined");

  /* ---- one answer as a step ---- */
  t.eq([stepOf("easy",0),stepOf("easy",5),stepOf("easy",8)],[1,0,-1],"too easy: one more, unless soreness says otherwise");
  t.eq([stepOf("right",0),stepOf("right",7),stepOf("much",0),stepOf(undefined,3)],[0,-1,-1,0],
    "about right holds; too much, or soreness of 7+, takes one away");
  var d0=addDays(START,1),days={};
  days[d0]={sore:9};days[addDays(d0,1)]={sore:5};days[addDays(d0,2)]={sore:8};days[addDays(d0,3)]={sore:10};
  t.eq(soreAfter(days,d0),8,"soreness: the worst of the two days after, not the day itself or later");
  t.eq(soreAfter(null,d0),0,"no day log: none");

  /* ---- sets per muscle from the answers ---- */
  var log=[w(1,["Bench","Squat"],"easy"),w(3,["Bench"],"easy"),w(5,["Squat"],"much"),
    w(6,["Curl"]),w(-3,["Bench"],"easy"),w(22,["Bench"],"easy"),w(8,["Running"],"easy")];
  var sh=setShift(log,INFO,opts(addDays(START,13)));
  t.eq(sh.shift,{Chest:2},"two easy chest days: two more chest sets; easy then too much on quads: none");
  t.eq(sh.answers,4,"answers before the block, in its lighter week, or not given are not counted");
  t.eq(sh.why.Quads,[1,-1],"each muscle's steps, in order");
  var many=[1,2,3,4,5,6].map(function(n){return w(n,["Bench"],"easy");});
  t.eq(setShift(many,INFO,opts(addDays(START,8))).shift,{Chest:3},"no more than three extra sets a workout");
  t.eq(setShift([1,2,3].map(function(n){return w(n,["Bench"],"much");}),INFO,opts(addDays(START,8))).shift,{Chest:-2},
    "no fewer than two sets under the plan");
  var sore={};sore[addDays(START,2)]={sore:8};
  t.eq(setShift([w(1,["Bench"],"easy")],INFO,opts(addDays(START,4),{days:sore})).shift,{Chest:-1},
    "too easy, but very sore the day after: one fewer");
  t.eq(setShift(many,INFO,opts(addDays(START,8),{planned:{Chest:20},freq:{Chest:2}})).shift,{Chest:1},
    "the week stays under the recoverable maximum: 20 + 1 × 2 = 22 for chest");
  t.eq(setShift(many,INFO,opts(addDays(START,8),{planned:{Chest:22},freq:{Chest:2}})).shift,{},
    "already at the maximum: no more");
  var much=[1,2].map(function(n){return w(n,["Bench"],"much");});
  t.eq(setShift(much,INFO,opts(addDays(START,8),{planned:{Chest:7},freq:{Chest:1}})).shift,{Chest:-1},
    "not taken below the minimum effective volume: 7 − 1 = 6 for chest");
  t.eq(setShift(log,INFO,opts(addDays(START,30))).shift,{},"a new block starts from the plan");
  t.eq(setShift(log,INFO,opts(null)),{shift:{},answers:0,why:{}},"no block: nothing moves");

  /* ---- applied to a day ---- */
  var day=[{name:"Bench",sets:3,lo:6,hi:8},{name:"Incline Press",sets:3},{name:"Squat",sets:4},{name:"Running",sets:1}];
  var up=shiftDay(day,{Chest:3},INFO);
  t.eq(up.map(function(e){return [e.sets,e.plan];}),[[5,3],[4,3],[4,undefined],[1,undefined]],
    "extra sets go round the muscle's exercises, main lift first, and say what the plan had");
  t.eq(day[0].sets,3,"the plan itself is not changed");
  t.eq(up[0].lo,6,"everything else is kept");
  var down=shiftDay([{name:"Bench",sets:3},{name:"Incline Press",sets:2}],{Chest:-3},INFO);
  t.eq(down.map(function(e){return e.sets;}),[1,1],"sets come off the last first, and never below one");
  t.eq(shiftDay([{name:"Bench",sets:5}],{Chest:3},INFO)[0].sets,6,"never more than six");
  t.eq(shiftDay(day,{Biceps:2},INFO).map(function(e){return e.sets;}),[3,3,4,1],"a muscle the day does not train: unchanged");
  t.eq(shiftDay(day,{Chest:1,Quads:-1},INFO).map(function(e){return e.sets;}),[4,3,3,1],"several muscles at once");

  /* ---- the plan's own volume ---- */
  t.eq(planVolume([{ex:[{name:"Bench",sets:3},{name:"Incline Press",sets:3},{name:"Squat",sets:4}]},{ex:[{name:"Bench",sets:3}]},{ex:[]}],INFO),
    {planned:{Chest:9,Quads:4},freq:{Chest:2,Quads:1}},"weekly sets and days per muscle, from the plan");
}

export {run};

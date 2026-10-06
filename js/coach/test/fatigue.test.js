import {fatigued, fatigueTrend} from "../fatigue.js";
import {addDays, INFO, mk} from "./assert.js";

var TODAY="2026-10-07";

function run(t){
  var empty=fatigueTrend([],"Bench",INFO,{today:TODAY});
  t.eq(empty.status,"insufficient","empty log: insufficient");
  t.clean(empty,"empty log: no NaN or undefined");
  t.eq(fatigued([],INFO,{today:TODAY}),[],"empty log: nothing fatigued");

  var one=fatigueTrend([mk(TODAY,[["Bench",[[80,8,9],[80,8,9]]]])],"Bench",INFO,{today:TODAY});
  t.eq(one.status,"insufficient","one session: no trend");

  /* The same 80 kg for 8 going from RPE 7 to 9 over four sessions. */
  var tired=[];
  [[21,7],[14,7.5],[7,8.5],[0,9]].forEach(function(p){
    tired.push(mk(addDays(TODAY,-p[0]),[["Bench",[[80,8,p[1]],[80,8,p[1]],[80,7,p[1]]]]]));});
  var f=fatigueTrend(tired,"Bench",INFO,{today:TODAY});
  t.eq(f.status,"rising","a fatigued log: fatigue detected");
  t.eq([f.w,f.r,f.from,f.to],[80,8,7,9],"it says which load, which reps, and from what to what");
  t.eq(fatigued(tired,INFO,{today:TODAY}).map(function(x){return x.name;}),["Bench"],"fatigued() names the lift");
  t.clean(f,"fatigued result: no NaN or undefined");

  /* Progressing: the load goes up and the effort stays put. */
  var good=[];
  [[21,80],[14,82.5],[7,85],[0,87.5]].forEach(function(p){
    good.push(mk(addDays(TODAY,-p[0]),[["Bench",[[p[1],8,8],[p[1],8,8]]]]));});
  t.ok(fatigueTrend(good,"Bench",INFO,{today:TODAY}).status!=="rising","a progressing log: no fatigue");
  t.eq(fatigued(good,INFO,{today:TODAY}),[],"a progressing log: nothing fatigued");

  /* The same load getting easier is not fatigue. */
  var easier=[];
  [[14,9],[7,8],[0,7]].forEach(function(p){easier.push(mk(addDays(TODAY,-p[0]),[["Bench",[[80,8,p[1]]]]]));});
  t.eq(fatigueTrend(easier,"Bench",INFO,{today:TODAY}).status,"falling","the same load getting easier reads as falling");

  /* Sets without RPE are not guessed at. */
  var norpe=[];
  [14,7,0].forEach(function(d){norpe.push(mk(addDays(TODAY,-d),[["Bench",[[80,8],[80,8]]]]));});
  t.eq(fatigueTrend(norpe,"Bench",INFO,{today:TODAY}).status,"insufficient","no RPE logged: insufficient");}

export {run};

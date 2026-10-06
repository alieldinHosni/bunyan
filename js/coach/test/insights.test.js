import {insights} from "../insights.js";
import {addDays, INFO, mk} from "./assert.js";

var TODAY="2026-10-07";

function run(t){
  t.eq(insights([],INFO,{today:TODAY}),[],"empty log: nothing to say");
  t.eq(insights([mk(TODAY,[["Bench",[[80,8,9]]]])],INFO,{today:TODAY}),[],"one session: nothing to say");

  /* On track: steady progress, sensible volume. Silence. */
  var good=[];
  [[28,80],[21,82.5],[14,85],[7,87.5],[0,90]].forEach(function(p){
    good.push(mk(addDays(TODAY,-p[0]),[["Bench",[[p[1],8,8],[p[1],8,8],[p[1],8,8],[p[1],8,8]]],
      ["Squat",[[p[1]+20,8,8],[p[1]+20,8,8],[p[1]+20,8,8],[p[1]+20,8,8]]],["Row",[[p[1],10,8],[p[1],10,8],[p[1],10,8],[p[1],10,8]]]]));});
  var ok=insights(good,INFO,{today:TODAY,mains:["Bench","Squat"],ranges:{Bench:{lo:6,hi:10},Squat:{lo:6,hi:10}},planned:["Chest","Quads","Back"]});
  t.eq(ok.filter(function(x){return x.pri>=2;}),[],"on track: nothing important to say");

  /* Fatigued: the same 80 × 8 from RPE 7 to 9. */
  var tired=[];
  [[21,7],[14,7.5],[7,8.5],[0,9]].forEach(function(p){tired.push(mk(addDays(TODAY,-p[0]),[["Bench",[[80,8,p[1]],[80,8,p[1]]]]]));});
  var ins=insights(tired,INFO,{today:TODAY,mains:["Bench"]});
  t.eq(ins[0]&&ins[0].kind,"fatigue","a fatigued log: fatigue first");
  t.clean(ins,"insights: no NaN or undefined");

  /* Declined: quiet until its date, then back if still true. */
  var later=addDays(TODAY,10);
  t.eq(insights(tired,INFO,{today:TODAY,mains:["Bench"],dismissed:{"fatigue:Bench":later}}).filter(function(x){return x.kind==="fatigue";}),[],
    "declined: not raised again before its date");

  /* One insight per lift: a falling max and fatigue on the same lift are one. */
  var both=[];
  [[28,110,7],[21,115,7],[14,112.5,8],[7,107.5,9]].forEach(function(p){both.push(mk(addDays(TODAY,-p[0]),[["Squat",[[p[1],5,p[2]],[p[1],5,p[2]]]]]));});
  var b=insights(both,INFO,{today:TODAY,mains:["Squat"]});
  t.eq(b.filter(function(x){return x.name==="Squat";}).length,1,"one insight per lift");

  /* Cardio-only history: nothing, and no crash. */
  var cardio=[mk(addDays(TODAY,-7),[["Running",[]]]),mk(TODAY,[["Football",[]]])];
  t.eq(insights(cardio,INFO,{today:TODAY}),[],"cardio only: nothing to say");}

export {run};

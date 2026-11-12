import {guard} from "../guard.js";

/* The last check before an answer is sent (js/coach/guard.js, docs/COACH-AGENT.md C-4). */
function run(t){
  var ok=function(a,l){return guard(a,l).ok;};
  t.ok(ok({prose:["Your best Barbell Squat: 100 kg × 5, on 3 Nov."],src:["From your log"]}),"a plain answer with a source passes");
  t.eq(guard({prose:["Mp lunge, group: legs"],src:["x"]}).why,"record","a knowledge-base record is not an answer");
  t.eq(guard({prose:["of the rep range, then more."],src:["x"]}).why,"fragment","a paragraph that starts mid-sentence is not an answer");
  t.ok(ok({prose:["Today's workout."],items:["and 3 more"],src:["plan"]}),"a list row may start lower-case");
  t.eq(guard({prose:["X."],items:["Mp lunge, group: legs"],src:["x"]}).why,"record","…but is still no record");
  var L={asked:["Barbell Deadlift"],others:["Barbell Bench Press - Medium Grip","Barbell Squat"]};
  t.eq(guard({prose:["Your best Barbell Bench Press - Medium Grip: 60 kg × 8."],src:["log"]},L).why,"other lift","a question about one lift is never answered with another");
  t.ok(ok({prose:["The guide for Barbell Deadlift has the steps."],src:[]},L),"the lift asked: passes");
  t.ok(ok({prose:["Barbell Deadlift, then Barbell Squat."],src:["log"]},L),"the lift asked with others: passes");
  t.ok(ok({prose:["ديدليفت بالبار"],src:[]},{asked:["ديدليفت بالبار"],others:["بنش بريس"]}),"Arabic names the same way");
  t.eq(guard({prose:["About 500 kcal a day, 7 days."],src:["kb"],allowed:[500]}).why,"figure 7","a figure a written answer does not hold is refused");
  t.ok(ok({prose:["About 3,500 kcal a week."],src:["kb"],allowed:[3500]}),"thousands separators read as one figure");
  t.eq(guard({prose:["You did 12 sets."],src:[]}).why,"no source","a figure needs a source");
  t.ok(ok({prose:["Hello."],src:[]}),"no figure, no source needed");}
export {run};

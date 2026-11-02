import {condLines, fitDose, idsFor, rulesFor} from "../conditions.js";

/* A health condition read from the textbook's guidelines (js/knowledge/conditions.js):
   ranges and rules come from the data, so these check what the data says. */
function run(t){
  t.eq(rulesFor({age:35}),null,"no condition, an adult: nothing changes");
  var hb=rulesFor({conds:["hypertension"],age:50});
  t.eq([hb.reps,hb.sets,hb.noFloor,hb.steady,hb.talkTest,hb.slowStand],[{min:10,max:20},{max:3},true,true,true,true],
    "high blood pressure: 10–20 reps, up to 3 sets, nothing lying down, steady breathing, the talk test, stand up slowly");
  var two=rulesFor({conds:["arthritis","hypertension"],age:50});
  t.eq(two.reps,{min:10,max:12},"two conditions: the range both allow");
  t.eq([rulesFor({conds:["osteoporosis"]}).noPlyo,rulesFor({conds:["diabetes"]}).noPlyo,rulesFor({conds:["pregnancy_early"]}).noFloor,rulesFor({conds:["pregnancy_late"]}).noFloor],
    [true,true,false,true],"no jumps with osteoporosis or diabetes; lying down ruled out only past 12 weeks of pregnancy");
  t.eq([idsFor({age:70}),idsFor({age:16}),idsFor({age:40,conds:["nonsense"]})],[["older_adults"],["youth"],[]],"age groups from the age; unknown ids ignored");
  t.eq(fitDose({sets:5,lo:4,hi:6},hb),{sets:3,lo:10,hi:12},"a heavy dose brought into the range, its width kept");
  t.eq(fitDose({sets:3,lo:8,hi:12},hb),{sets:3,lo:10,hi:12},"a dose half in the range: only the part outside moves");
  t.eq(condLines(hb,{days:5}).some(function(x){return /strength days a week/.test(x[0])&&x[1].n===3&&x[1].d===5;}),true,"more days than the book gives: said, not forced");}

export {run};

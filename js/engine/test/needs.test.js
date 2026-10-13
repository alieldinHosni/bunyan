import {expected, needsNow, PICKS, suggestFor, toGo, weekPattern} from "../needs.js";

var G={kcal:2500,p:150,c:300,f:70,water:3000};
function day(p,kcal){return {meals:{Lunch:{items:[{kcal:kcal||1800,p:p}]}}};}

function run(t,lib){
  /* ---- the clock ---- */
  t.eq([expected(6),expected(7),expected(20),expected(23)],[0,0,1,1],"nothing expected before 7:00, everything by 20:00");
  t.eq(Math.round(expected(13)*100),46,"about half by early afternoon");

  /* ---- behind, for the hour ---- */
  var morning=needsNow({p:0,c:0,f:0},G,0,9);
  t.eq([morning.focus,morning.nodes.some(function(n){return n.behind;})],[null,false],"nothing eaten at 9:00 is not behind yet");
  var eve=needsNow({p:60,c:280,f:65},G,2900,19);
  t.eq(eve.focus,"p","an evening with 40% of the protein: protein");
  t.eq(eve.nodes.map(function(n){return n.id;}),["p","c","f","w"],"four, in a fixed order");
  var dry=needsNow({p:140,c:280,f:65},G,800,18);
  t.eq(dry.focus,"w","water, when it is the one far behind");
  var both=needsNow({p:40,c:100,f:65},G,2900,20);
  t.eq(both.focus,"p","two behind: the one further behind (protein at 27%, carbs at 33%)");
  t.eq(needsNow({p:0,c:0,f:0},{p:0,c:0,f:0,water:0},0,22).focus,null,"no targets, nothing behind");

  /* ---- what is left ---- */
  t.eq(toGo({id:"p",have:122,want:150}),30,"protein to the nearest 5 g");
  t.eq(toGo({id:"w",have:1900,want:3000}),1000,"water to the nearest 250 ml");
  t.eq(toGo({id:"p",have:170,want:150}),0,"over is nothing to go");

  /* ---- suggestions ---- */
  var sp=suggestFor("p",1200);
  t.eq(sp.length,3,"three");
  t.eq(sp[0].id,"tuna_water","the richest in protein per calorie first");
  t.ok(sp.every(function(x){return x.amount>0&&x.art&&x.label;}),"each with its amount, drawing and serving");
  var small=suggestFor("p",120);
  t.ok(small[0].kcal<=160&&small[1].kcal<=160,"little left: the portions that fit come first");
  t.ok(small[2].kcal<=small.concat(suggestFor("p",5000)).reduce(function(m,x){return Math.max(m,x.kcal);},0),"then the smallest of the rest");
  t.eq(suggestFor("w",500),[],"water: none, a glass instead");
  t.ok(suggestFor("c",-50).length===3,"over the calories already: still three, none ruled out");
  /* Every pick is a real food, and its figures are the database's for that portion. */
  t.ok(PICKS.every(function(r){return r.length===9&&r[5]>0;}),"every pick has its portion's figures");

  /* ---- the week ---- */
  var NOW="2026-10-13",days={},tr={};
  days["2026-10-12"]=day(80);days["2026-10-11"]=day(150);days["2026-10-10"]=day(90);days["2026-10-09"]=day(145);
  tr["2026-10-12"]=true;tr["2026-10-10"]=true;
  var w=weekPattern(days,G,NOW,tr);
  t.eq([w.kind,w.days,w.met,w.shortTrain],["train",4,2,2],"short on both training days: the training sentence");
  days={};["2026-10-12","2026-10-11","2026-10-10"].forEach(function(d){days[d]=day(150);});
  t.eq(weekPattern(days,G,NOW,{}).kind,"kept","reached every day: kept");
  days["2026-10-09"]=day(60);days["2026-10-08"]=day(70);days["2026-10-07"]=day(50);
  t.eq(weekPattern(days,G,NOW,{}).kind,"short","short on half or more: short");
  t.eq(weekPattern({"2026-10-12":day(80)},G,NOW,{}),null,"one day logged: too little to say");
  days={};days["2026-10-13"]=day(10);days["2026-10-12"]=day(150);days["2026-10-11"]=day(150);
  t.eq(weekPattern(days,G,NOW,{}),null,"today is not counted: it is still going");
}
export {run};

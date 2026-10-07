import {daysBefore, foodDayOf, foodDaysOf, intakeDaysOf, kcalMet, macrosMet, nutritionOf, proteinMet, streaksOf,
        sumNutrition} from "../intake.js";

var NOW="2026-10-07";
/* A day's log with one meal of the given items. */
function logged(items){return {meals:{Lunch:{items:items}}};}
function one(x){return logged([x]);}
var GOALS={kcal:2000,p:150,c:200,f:60};

function run(t){
  /* ---- totals ---- */
  t.eq(sumNutrition([{kcal:100.4,p:10.3},{kcal:100.4,p:10.3}]),{kcal:201,p:21,c:0,f:0,fib:0},
    "rounded once at the end, not item by item");
  t.eq(sumNutrition([{kcal:"250",p:"x"}]),{kcal:250,p:0,c:0,f:0,fib:0},"text figures read as numbers, junk as 0");
  t.eq(sumNutrition(null),{kcal:0,p:0,c:0,f:0,fib:0},"nothing: zeros");

  /* ---- dates ---- */
  t.eq(daysBefore(NOW,1),"2026-10-06","the day before");
  t.eq(daysBefore("2026-03-30",1),"2026-03-29","across a clock change, still one day");
  t.eq(daysBefore("2024-03-01",1),"2024-02-29","a leap day");
  t.eq(daysBefore("2026-01-01",1),"2025-12-31","across a year");

  /* ---- a day ---- */
  var days={"2026-10-06":{meals:{Breakfast:{items:[{kcal:400,p:30}]},Dinner:{items:[{kcal:600.6,p:40}]}}},
    "2026-10-05":{meals:{Lunch:{items:[]}}},"2026-10-04":{}};
  t.eq(foodDayOf(days,"2026-10-06"),{kcal:1001,p:70,c:0,f:0,fib:0},"every meal's items, together");
  t.eq([foodDayOf(days,"2026-10-05"),foodDayOf(days,"2026-10-04"),foodDayOf(days,"2026-10-01"),foodDayOf(null,NOW)],
    [null,null,null,null],"a meal with nothing in it, a day with no meals, or no day: null, not zeros");
  t.eq(intakeDaysOf(days),[{date:"2026-10-06",kcal:1001},{date:"2026-10-05",kcal:0},{date:"2026-10-04",kcal:0}],
    "each day's energy for the maintenance estimate");
  t.eq(intakeDaysOf(null),[],"no log: no days");

  /* ---- met or not ---- */
  t.eq([kcalMet({kcal:2200},GOALS),kcalMet({kcal:1800},GOALS),kcalMet({kcal:2201},GOALS)],[true,true,false],
    "calories: within 10% either way");
  t.eq([proteinMet({p:135},GOALS),proteinMet({p:134},GOALS),proteinMet({p:400},GOALS)],[true,false,true],
    "protein: 90% or more, and over is not a miss");
  t.eq([kcalMet({kcal:0},{kcal:0}),proteinMet({p:10},{})],[false,false],"no target: never met");
  t.eq([macrosMet({p:150,c:200,f:60},GOALS),macrosMet({p:150,c:200,f:70},GOALS)],[true,false],"macros: all three within 10%");

  /* ---- a window ---- */
  var log={"2026-10-07":one({kcal:1200,p:90,c:100,f:40}),
    "2026-10-06":one({kcal:2000,p:150,c:200,f:60}),
    "2026-10-05":one({kcal:2500,p:100,c:300,f:90}),
    "2026-09-29":one({kcal:2000,p:150,c:200,f:60})};
  t.eq(foodDaysOf(log,7,NOW).map(function(x){return x.d;}),["2026-10-05","2026-10-06"],
    "yesterday and the six before it, oldest first; today and older days left out");
  var nu=nutritionOf(log,GOALS,7,NOW);
  t.eq([nu.count,nu.met,nu.adherence],[2,1,50],"two finished days, one on all three macros: 50%");
  t.eq(nu.avg,{kcal:2250,p:125,c:250,f:75},"the averages are of logged days only");
  t.clean(nu,"a window: no NaN or undefined");
  var empty=nutritionOf({},GOALS,7,NOW);
  t.eq([empty.count,empty.adherence,empty.avg.kcal],[0,null,0],"nothing logged: no adherence figure, not 0%");
  t.clean(empty,"nothing logged: no NaN or undefined");

  /* ---- streaks ---- */
  var run_={"2026-10-07":one({kcal:1000,p:160}),
    "2026-10-06":one({kcal:2000,p:150}),
    "2026-10-05":one({kcal:2150,p:140}),
    "2026-10-04":one({kcal:1950,p:100}),
    "2026-10-02":one({kcal:2000,p:150})};
  t.eq(streaksOf(run_,GOALS,NOW),{protein:3,kcal:3},
    "today joins a run once it qualifies and never breaks it before then; a day with nothing logged breaks it");
  t.eq(streaksOf({},GOALS,NOW),{protein:0,kcal:0},"nothing logged: no streak");
}

export {run};

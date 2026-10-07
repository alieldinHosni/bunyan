import {avg7Of, bmrOf, bodyFatOf, lastWeightOf, macroTargetsOf, maintenanceInUseOf, measurementsOf, proteinFor,
        sessionKcalOf, targetKcalOf, tdeeFormulaOf, tdeeOf, weightChangeOf, weightTrendOf} from "../body.js";

var MAN={age:30,height:180,weight:80,sex:"m",activity:1.4,goal:"lose"};
var WOMAN={age:25,height:165,weight:60,sex:"f",activity:1.55,goal:"gain"};
var START="2026-09-01";
function day(n){var d=new Date(Date.parse(START+"T00:00:00Z")+n*864e5);return d.toISOString().slice(0,10);}
/* A weigh-in every `every` days for `span` days, from `from` kg, changing by perWeek. */
function series(span,every,from,perWeek){
  var a=[];for(var i=0;i<=span;i+=every)a.push({date:day(i),weight:from+perWeek*i/7});return a;}

function run(t){
  /* ---- resting and daily energy ---- */
  t.eq(bmrOf(MAN,[]),1780,"resting energy, Mifflin–St Jeor: man, 80 kg, 180 cm, 30 → 1,780");
  t.eq(bmrOf(WOMAN,[]),1345,"woman, 60 kg, 165 cm, 25 → 1,345");
  t.eq(bmrOf(MAN,[{date:day(0),weight:90}]),1880,"the latest weigh-in wins over the profile's weight");
  t.eq(bmrOf({},[]),865,"nothing entered: 86 kg and zeros, still a number");
  t.eq(tdeeFormulaOf(MAN,[]),2492,"maintenance by formula: 1,780 × 1.4");
  t.eq(tdeeFormulaOf(WOMAN,[]),2085,"1,345 × 1.55, rounded");
  t.eq(tdeeOf(MAN,[],{kcal:2650.4}),2650,"a measured maintenance, once chosen, is the one in use");
  t.eq([tdeeOf(MAN,[],{kcal:0}),tdeeOf(MAN,[],null)],[2492,2492],"none chosen: the formula");
  t.eq(maintenanceInUseOf(MAN,[],{kcal:2650,at:day(3)}),{kcal:2650,source:"learned",at:day(3)},"in use says where it came from: learned");
  t.eq(maintenanceInUseOf(MAN,[],null),{kcal:2492,source:"formula"},"… or the formula");

  /* ---- the calorie target ---- */
  t.eq(targetKcalOf(MAN,[],null),1994,"losing fat: a fifth under maintenance (2,492 − 498)");
  t.eq(targetKcalOf(MAN,[],{kcal:4000}),3250,"the deficit is capped at 750 kcal");
  t.eq(targetKcalOf({age:60,height:150,weight:45,sex:"f",activity:1.2,goal:"lose"},[],null),1200,
    "never under 1,200 kcal for a woman");
  t.eq(targetKcalOf({age:30,height:180,weight:80,sex:"m",activity:1.2,goal:"lose"},[],{kcal:1600}),1691,
    "never under about the resting burn while losing (1,780 × 0.95)");
  t.eq(targetKcalOf(WOMAN,[],null),2294,"building muscle: a tenth over (2,085 + 209)");
  t.eq(targetKcalOf({age:30,height:180,weight:80,sex:"m",activity:1.4},[],null),2492,"no goal set: maintenance");

  /* ---- protein ---- */
  t.eq(proteinFor(MAN,80),160,"2.0 g/kg while losing fat");
  t.eq(proteinFor({goal:"gain"},80),144,"1.8 g/kg building muscle");
  t.eq(proteinFor({goal:"recomp",height:180},80),176,"2.2 g/kg for recomposition");
  t.eq(proteinFor({goal:"lose",height:170},120),156,"above a BMI of 30, from the weight at a BMI of 27");
  t.eq(proteinFor({goal:"lose"},0),0,"no weight: nothing, not NaN");

  /* ---- the day's targets ---- */
  t.eq(macroTargetsOf(MAN,[],null),{kcal:1990,p:160,f:62,c:198,water:2750,steps:10000},
    "losing fat at 80 kg: 1,990 kcal, 160 g protein, 28% fat, carbs the rest, 2.75 L, 10,000 steps");
  var mw=macroTargetsOf(WOMAN,[{date:day(0),weight:64}],null);
  t.eq([mw.p,mw.water,mw.steps],[115,2250,undefined],"from the latest weigh-in; no step target for building muscle");
  var none=macroTargetsOf({goal:"lose"},[],null);
  t.ok(!("water" in none),"no weight anywhere: no water target");
  t.clean(none,"no weight anywhere: no NaN or undefined");
  t.ok(none.c>=50,"carbs never under 50 g");
  t.clean(macroTargetsOf({},[],null),"an empty profile: no NaN or undefined");

  /* ---- a session's burn ---- */
  t.eq(sessionKcalOf(80,45),315,"5 METs × 3.5 × 80 kg / 200 × 45 min = 315");
  t.eq([sessionKcalOf(0,45),sessionKcalOf(80,0)],[0,0],"no body weight or no minutes: 0");

  /* ---- weigh-ins ---- */
  t.eq(lastWeightOf([{date:day(0),weight:80},{date:day(1),waist:90},{date:day(2),weight:79.4},{date:day(3),chest:100}]),79.4,
    "the latest entry with a weight, skipping tape-only entries");
  t.eq([lastWeightOf([]),lastWeightOf(null)],[0,0],"nothing logged: 0");
  t.eq(avg7Of([{weight:80},{weight:81}]),0,"a seven-day average needs three weigh-ins");
  t.eq(avg7Of([{weight:70},{weight:80},{waist:90},{weight:81},{weight:82}]),78.3,"of the weights there are in the last seven");
  t.eq(avg7Of(series(9,1,80,0).map(function(b,i){return {weight:i<3?100:80};})),80,"only the last seven count");

  /* ---- the weight trend ---- */
  t.eq(weightTrendOf(series(28,10,90,-0.5),"lose"),null,"three weigh-ins: no trend");
  t.eq(weightTrendOf(series(12,4,90,-0.5),"lose"),null,"under two weeks of weigh-ins: no trend");
  var on=weightTrendOf(series(28,4,90,-0.5),"lose");
  t.eq([on.perWk,on.status,on.kind,on.weeks,on.goal],[-0.5,"ok","lose",4,"lose"],"losing 0.5 kg a week at ~89 kg on a fat-loss goal: on plan");
  t.eq(on.lo,-0.89,"the fast end of the band: 1% of body weight a week");
  t.clean(on,"a trend: no NaN or undefined");
  t.eq(weightTrendOf(series(28,4,90,-1.2),"lose").status,"fast","losing 1.2 kg a week: too fast");
  t.eq(weightTrendOf(series(28,4,90,-0.2),"lose").status,"slow","losing 0.2 kg a week: slow");
  t.eq(weightTrendOf(series(28,4,90,0.3),"lose").status,"wrong","gaining while losing fat: the wrong way");
  t.eq(weightTrendOf(series(28,4,90,0.3),"gain").status,"ok","gaining 0.3 kg a week building muscle: on plan");
  t.eq(weightTrendOf(series(28,4,90,0),"recomp").status,"ok","a steady scale on recomposition: on plan");
  t.eq(weightTrendOf(series(28,4,90,0),"strength").status,"ok","a steady scale getting stronger: on plan");
  t.eq(weightTrendOf(series(28,4,90,-0.5),"maintain").status,"down","no lean either way: down is said as down");
  var old=[{date:"2026-07-01",weight:120}].concat(series(28,4,90,-0.5));
  t.eq(weightTrendOf(old,"lose").perWk,-0.5,"only the last four weeks count");
  var same=series(28,4,90,-0.5).map(function(b){return {date:START,weight:b.weight};});
  t.eq(weightTrendOf(same,"lose"),null,"all on one day: no trend, not a division by zero");

  /* ---- the change since last week ---- */
  t.eq(weightChangeOf([]),null,"no weigh-ins: no change");
  var one=weightChangeOf([{date:day(0),weight:80}]);
  t.eq([one.ref,one.d,one.days],[null,null,null],"one weigh-in: nothing to compare");
  var wc=weightChangeOf([{date:day(0),weight:80},{date:day(4),weight:79.6},{date:day(8),weight:79.2},{date:day(11),waist:88},{date:day(11),weight:79}]);
  t.eq([wc.ref.date,wc.d,wc.days],[day(4),-0.6,7],"against the latest weigh-in at least a week older");
  var young=weightChangeOf([{date:day(0),weight:80},{date:day(2),weight:79.5}]);
  t.eq([young.ref.date,young.d,young.days],[day(0),-0.5,2],"none that old: against the earliest, and says since when");

  /* ---- measurements ---- */
  var ms=measurementsOf([{date:day(0),waist:90},{date:day(7),waist:88.5,chest:100},{date:day(8),weight:80}]);
  t.eq(ms.map(function(m){return [m.k,m.v,m.delta,m.good];}),[["chest",100,null,1],["waist",88.5,-1.5,-1]],
    "each measure's latest and its change, chest before waist, weigh-ins ignored");
  t.eq(measurementsOf([]),[],"none: an empty list");

  /* ---- body fat ---- */
  var navy=bodyFatOf(MAN,[{date:day(0),weight:80,waist:90,neck:40}]);
  t.eq([navy.bf,navy.src,navy.lean,navy.need],[18.4,"navy",65.3,[]],"US Navy, man, waist 90, neck 40, 180 cm: 18.4%, 65.3 kg lean");
  var miss=bodyFatOf(MAN,[{date:day(0),waist:90}]);
  t.eq([miss.bf,miss.need],[null,["neck"]],"no neck measurement: says what is missing");
  t.eq(bodyFatOf({height:165,sex:"f"},[{date:day(0),waist:75,neck:32}]).need,["hips"],"a woman's estimate needs hips as well");
  var own=bodyFatOf(MAN,[{date:day(0),waist:90,neck:40},{date:day(3),bf:16}]);
  t.eq([own.bf,own.src,own.need],[16,"entered",[]],"an entered figure at least as recent as the tape wins");
  t.eq(bodyFatOf(MAN,[{date:day(0),bf:16},{date:day(3),waist:90,neck:40}]).src,"navy","a newer tape measurement wins over an older figure");
  t.clean(bodyFatOf({},[]),"nothing at all: no NaN or undefined");
}

export {run};

import {KCAL_PER_KG, learnMaintenance} from "../energy.js";

var TODAY="2026-10-07";
function iso(back){var d=new Date(Date.parse(TODAY+"T00:00:00Z")-back*864e5);return d.toISOString().slice(0,10);}
/* Food every day for the last n days (not today), at kcal. */
function food(n,kcal){var a=[];for(var i=1;i<=n;i++)a.push({date:iso(i),kcal:kcal});return a;}
/* A weigh-in every `every` days over the last n days, ending at `end` kg, changing by
   perWeek kg a week (negative: losing). */
function weights(n,every,end,perWeek){var a=[];for(var i=n;i>=0;i-=every)a.push({date:iso(i),weight:Math.round((end-perWeek*i/7)*100)/100});return a;}

function run(t){
  /* Nothing, or not enough: defined answers, never a guess. */
  var none=learnMaintenance([],[],{today:TODAY,formula:2600});
  t.eq(none.kind,"none","an empty log: none");
  t.clean(none,"empty: no NaN or undefined");
  t.eq(learnMaintenance(food(6,2500),weights(24,3,80,0),{today:TODAY,formula:2600}).why,"food","six days of food: not enough");
  t.eq(learnMaintenance(food(24,2500),weights(24,12,80,0),{today:TODAY,formula:2600}).why,"weighins","three weigh-ins: not enough");
  t.eq(learnMaintenance(food(24,2500),weights(6,2,80,0),{today:TODAY,formula:2600}).why,"span","a week of weigh-ins: not enough span");
  t.clean(learnMaintenance(food(6,2500),[],{today:TODAY,formula:2600}),"insufficient: no NaN or undefined");

  /* Energy balance, exactly: steady weight on 2,500 means 2,500. */
  var flat=learnMaintenance(food(28,2500),weights(27,3,80,0),{today:TODAY,formula:2600});
  t.eq([flat.kind,flat.measured,flat.intake,flat.perWeek],["ok",2500,2500,0],"steady weight: maintenance is the intake");
  t.ok(flat.kcal>=2500&&flat.kcal<=2600,"the answer sits between the log and the formula: "+flat.kcal);
  t.ok(flat.low<flat.kcal&&flat.kcal<flat.high,"a range around it");
  t.clean(flat,"ok: no NaN or undefined");

  /* Losing half a kilo a week on 2,000: the body used 2,000 + 0.5 × 7,700 / 7 = 2,550. */
  var lose=learnMaintenance(food(28,2000),weights(27,3,82,-0.5),{today:TODAY,formula:2300});
  t.eq([lose.measured,lose.perWeek],[2550,-0.5],"losing 0.5 kg a week on 2,000 kcal: about 2,550");
  /* Gaining a quarter a week on 3,000: 3,000 − 0.25 × 7,700 / 7 = 2,725. */
  var gain=learnMaintenance(food(28,3000),weights(27,3,75,0.25),{today:TODAY,formula:2800});
  t.eq(gain.measured,2730,"gaining 0.25 kg a week on 3,000 kcal: about 2,725 (to the nearest 10)");
  t.eq(KCAL_PER_KG,7700,"7,700 kcal per kg of body-weight change");

  /* Partly logged days are left out, and counted as left out. */
  var gaps=food(28,2500);for(var i=2;i<=10;i+=2)gaps[i].kcal=600;
  var g=learnMaintenance(gaps,weights(27,3,80,0),{today:TODAY,formula:2600});
  /* The window is four weeks with today, so 27 full days before it; five are partial. */
  t.eq([g.measured,g.skipped,g.foodDays],[2500,5,22],"days with breakfast only do not drag it down");
  /* Today is still being eaten. */
  var withToday=food(28,2500).concat([{date:TODAY,kcal:400}]);
  t.eq(learnMaintenance(withToday,weights(27,3,80,0),{today:TODAY,formula:2600}).measured,2500,"today does not count");
  /* A log that cannot be right says so instead of answering. */
  t.eq(learnMaintenance(food(28,600),weights(27,3,80,0),{today:TODAY,formula:2600}).why,"implausible","600 kcal a day at steady weight: the log is incomplete");

  /* The more and cleaner the log, the more the answer is the log's own. */
  var thin=learnMaintenance(food(28,2400),weights(24,8,80,0),{today:TODAY,formula:2800});
  var rich=learnMaintenance(food(28,2400),weights(27,1,80,0),{today:TODAY,formula:2800});
  t.ok(rich.share>thin.share,"daily weigh-ins weigh more than four: "+thin.share+" → "+rich.share);
  t.ok(Math.abs(rich.kcal-2400)<Math.abs(thin.kcal-2400),"and land nearer what the log measured");
  /* Old data is outside the window. */
  var old=food(60,2500).filter(function(x){return x.date<iso(30);});
  t.eq(learnMaintenance(old,weights(27,3,80,0),{today:TODAY,formula:2600}).why,"food","only food older than four weeks: not counted");}

export {run};

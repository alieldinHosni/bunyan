import {bodyFatSeriesIn, consistencyMonthIn, e1rmSeriesIn, isoBack, liftHalf, liftProgressIn, liftsIn, muscleShareIn, overviewIn,
        pct100, recentRecordsIn, strengthIndexIn, topLiftsIn, volumeSeriesIn, weeklyCardioIn, weeklyVolumeIn, weighInsIn, win,
        working} from "../figures.js";

/* The runner loads the exercise library first: muscles and body weight come from it. */
var NOW="2026-10-07";
function back(n){var d=new Date(Date.parse(NOW+"T00:00:00Z")-n*864e5);return d.toISOString().slice(0,10);}
function set(w,r,rpe,wu){var x={w:w,r:r};if(rpe)x.rpe=rpe;if(wu)x.wu=true;return x;}
function sess(daysBack,entries,extra){var s={id:"s"+daysBack,date:back(daysBack),entries:entries.map(function(e){return {name:e[0],sets:e[1]};})};
  if(extra)Object.keys(extra).forEach(function(k){s[k]=extra[k];});return s;}
function pick(o,ks){var r={};ks.forEach(function(k){r[k]=o[k];});return r;}
function r1(v){return Math.round(v*10)/10;}
var SQ="Barbell Squat",BP="Barbell Bench Press - Medium Grip",PU="Pullups";

function run(t){
  /* ---- dates and shares ---- */
  t.eq([isoBack(NOW,0),isoBack("2026-03-29",1),isoBack("2024-03-01",1),isoBack("2026-01-03",7)],[NOW,"2026-03-28","2024-02-29","2025-12-27"],
    "days back from a date: across a clock change, a leap day and a new year");
  t.eq(win(7,NOW),{from:back(6),to:NOW,pfrom:back(13),pto:back(7)},"a 7-day window is today and the six before; the previous one the seven before that");
  t.eq([pct100([1,1,1]),pct100([2,2,1]),pct100([0,0]),pct100([1,2,3,4,5,6,7]).reduce(function(a,b){return a+b;},0)],[[34,33,33],[40,40,20],[0,0],100],
    "shares add up to exactly 100; nothing logged is all zeros");
  t.eq(working({sets:[set(60,10,0,true),set(100,5),set(0,0),set(0,8)]}),[set(100,5),set(0,8)],"a working set: not a warm-up, and something was done");

  /* One history for most of what follows (newest first, as the app keeps it). */
  var log={weight:80,body:[{date:back(30),weight:80},{date:back(2),weight:82,bf:15}],sessions:[
    sess(1,[[BP,[set(100,5,8),set(60,10,0,true)]],["Running",[{min:30}]]],{activeMs:3600000}),
    sess(3,[[SQ,[set(140,3)]],[PU,[set(0,10)]]],{activeMs:2400000}),
    sess(9,[[BP,[set(90,5)]]]),
    sess(20,[[SQ,[set(120,5)]]]),
    sess(40,[[SQ,[set(100,5)]]])]};

  /* ---- overview ---- */
  /* This week: 100×5 + 140×3 + a pull-up's body weight (80, the weigh-in before) × 10;
     the run and the warm-up move nothing. The week before: 90×5. */
  t.eq(overviewIn(log,7,NOW),{n:2,pn:1,vol:1720,pvol:450,vpct:(1720-450)/450*100,compare:true,mins:50,timed:2},
    "the window against the one before it, and the average active minutes");
  var first={sessions:[sess(1,[[SQ,[set(100,5)]]]),sess(3,[[SQ,[set(100,5)]]],{activeMs:0})]};
  t.eq(pick(overviewIn(first,7,NOW),["n","vpct","compare","mins","timed"]),{n:2,vpct:null,compare:false,mins:null,timed:0},
    "a first week compares with nothing, and workouts without a clock give no minutes");

  /* ---- volume over time ---- */
  t.eq(volumeSeriesIn(log,7,NOW),[{d:back(3),v:1220},{d:back(1),v:500}],"up to a month: a point per training day");
  t.eq(volumeSeriesIn(log,90,NOW),[{d:back(35),v:500},{d:back(28),v:0},{d:back(21),v:0},{d:back(14),v:600},{d:back(7),v:450},{d:NOW,v:1720}],
    "longer: a point per week, a week off is a zero, and weeks before the first workout are left off");

  /* ---- lifts and records ---- */
  var L=liftsIn(log);
  t.eq(L.map(function(x){return pick(x,["name","sets","w","reps","date","last"]);}),[
    {name:SQ,sets:3,w:140,reps:3,date:back(3),last:back(3)},
    {name:BP,sets:2,w:100,reps:5,date:back(1),last:back(1)},
    {name:PU,sets:1,w:0,reps:10,date:back(3),last:back(3)}],
    "every lift: working sets, the heaviest set and when; a lift never loaded is scored by reps; the run is not a lift");
  var tie={sessions:[sess(2,[[SQ,[set(100,6)]]]),sess(5,[[SQ,[set(100,5)]]]),sess(10,[[SQ,[set(100,5)]]])]};
  t.eq(pick(liftsIn(tie)[0],["reps","date"]),{reps:6,date:back(2)},"the same weight for more reps is the record; equalled is not");
  t.eq(liftsIn({sessions:[sess(5,[[SQ,[set(100,5)]]]),sess(10,[[SQ,[set(100,5)]]])]})[0].date,back(10),"a record's date is the day it was first set");
  t.eq(topLiftsIn(log).map(function(x){return x.name;}),[SQ,BP,PU],"the lifts trained most first");
  t.eq([recentRecordsIn(log).map(function(x){return x.name;}),recentRecordsIn(log,2).length],[[BP,SQ,PU],2],
    "the newest records first, the heavier first on the same day");

  /* ---- estimated maxes ---- */
  t.eq(e1rmSeriesIn(log,SQ,0,NOW),[{d:back(40),v:116.7},{d:back(20),v:140},{d:back(3),v:154}],"a lift's estimated max per workout, oldest first");
  t.eq(e1rmSeriesIn(log,SQ,30,NOW),[{d:back(20),v:140},{d:back(3),v:154}],"within the window only");
  t.eq(e1rmSeriesIn(log,PU,0,NOW),[{d:back(3),v:106.7}],"a pull-up's estimate counts the body weight");
  t.eq(e1rmSeriesIn({sessions:[sess(1,[[SQ,[set(60,20)]]])]},SQ,0,NOW),[],"past twelve reps there is no estimate, not a drop to zero");

  /* ---- where the sets went ---- */
  t.eq(muscleShareIn(log,30,NOW),{tot:5,rows:[{g:"Chest",sets:2,pct:40},{g:"Legs",sets:2,pct:40},{g:"Back",sets:1,pct:20}]},
    "working sets by body part in the window, as shares of 100; the run is not a set");
  t.eq(weeklyVolumeIn(log,back(3)).rows.filter(function(r){return r.sets;}),[{g:"Chest",sets:1},{g:"Back",sets:1},{g:"Quads",sets:1}],
    "this week's sets per muscle, from the week's first day");
  t.eq([undefined,6,16,25].map(function(p){return weeklyVolumeIn(log,NOW,p).target;}),[12,8,16,20],
    "the weekly target is the plan's, kept between 8 and 20; no plan, 12");
  t.eq([weeklyCardioIn(log,back(3),NOW),weeklyCardioIn(log,NOW,NOW).min,weeklyCardioIn({sessions:[sess(40,[["Running",[{min:30}]]])]},back(3),NOW).recent],
    [{min:30,target:150,recent:true},0,false],"cardio minutes this week against 150; any in the last four weeks");

  /* ---- body ---- */
  t.eq([weighInsIn(log.body,7,NOW).map(function(b){return b.date;}),weighInsIn(log.body,0,NOW).length],[[back(2)],2],"weigh-ins in the window, or all of them");
  t.eq([bodyFatSeriesIn(log.body,7,NOW),bodyFatSeriesIn([{date:back(30),weight:80,bf:20}],7,NOW)],[[{d:back(2),v:15}],[]],
    "body-fat figures entered, in the window");

  /* ---- the summary cards ---- */
  t.eq([liftHalf(BP),liftHalf({name:SQ}),liftHalf("Plank")],["upper","lower",""],"upper or lower body; core is neither");
  var bench={sessions:[sess(1,[[BP,[set(100,5),set(95,8),set(95,8),set(60,10,0,true)]]]),sess(8,[[BP,[set(90,5)]]])]};
  var lp=liftProgressIn(bench,BP,30,NOW);
  t.eq([lp.series.length,r1(lp.pct),lp.last],[2,r1((120.3-105)/105*100),{sets:3,reps:8,w:100,date:back(1)}],
    "one lift: the change in its estimate, and the latest workout as sets × the usual reps · the top weight");
  var si=strengthIndexIn(log,30,5,NOW);
  t.eq([r1(si.pct),si.lifts,si.series.map(function(p){return [p.d,r1(p.v)];})],
    [r1((10+(123.3-105)/105*100)/2),2,[[back(20),100],[back(9),100],[back(3),110],[back(1),r1(123.3/105*100)]]],
    "strength: the average change of the lifts trained most, each counted once it has two estimates; 100 at the start");
  t.eq(consistencyMonthIn(log,NOW),{days:2,weeks:[1,0,0,1,1,2]},"days trained this month, and workouts in each of the last six weeks");

  /* ---- nothing logged ---- */
  var none={sessions:[],body:[]};
  t.eq([overviewIn(none,7,NOW),volumeSeriesIn(none,90,NOW),liftsIn(none),muscleShareIn(none,30,NOW),strengthIndexIn(none,30,5,NOW),
    consistencyMonthIn(none,NOW),weeklyCardioIn(none,NOW,NOW),weighInsIn([],7,NOW)],
    [{n:0,pn:0,vol:0,pvol:0,vpct:null,compare:false,mins:null,timed:0},[],[],{tot:0,rows:[]},{pct:null,lifts:0,series:[]},
     {days:0,weeks:[0,0,0,0,0,0]},{min:0,target:150,recent:false},[]],"nothing logged: every figure has an answer, and none is made up");
  t.clean([overviewIn(log,30,NOW),strengthIndexIn(log,90,5,NOW),liftProgressIn(log,PU,90,NOW)],"no NaN or undefined");
}

export {run};

import {bestE1RMIn, bodyAtIn, bwShare, consistencyIn, daysSinceIn, deloadDueIn, e1RM, incrementOf, loadIn, plateauIn,
        prevPerfIn, prIn, progressionHintOf, recommendIn, recordIn, repsAtIn, sessionVolumeIn, snapDown, volumeIn,
        weeklySetsIn} from "../lifts.js";
import {convertDbLoads} from "../logfix.js";

/* The runner loads the exercise library first: equipment and bodyweight come from it. */
var NOW="2026-10-07",NOWMS=new Date(NOW+"T12:00:00").getTime();
function back(n){var d=new Date(Date.parse(NOW+"T00:00:00Z")-n*864e5);return d.toISOString().slice(0,10);}
function set(w,r,rpe,wu){var x={w:w,r:r};if(rpe)x.rpe=rpe;if(wu)x.wu=true;return x;}
function sess(daysBack,entries,extra){var s={id:"s"+daysBack,date:back(daysBack),entries:entries.map(function(e){return {name:e[0],sets:e[1]};})};
  if(extra)Object.keys(extra).forEach(function(k){s[k]=extra[k];});return s;}
var SQ="Barbell Squat",BP="Barbell Bench Press - Medium Grip",PU="Pullups";

function run(t){
  /* ---- the load a set moved ---- */
  var body={sessions:[],body:[{date:"2026-09-01",weight:80},{date:"2026-09-20",weight:78}],weight:85};
  t.eq([bwShare(PU),bwShare("Pushups"),bwShare(SQ),bwShare("Plank")],[1,0.65,0,0],
    "a pull-up lifts the whole body, a push-up two thirds; a barbell lift none; a plank is scored by time");
  t.eq([bodyAtIn(body,"2026-09-10"),bodyAtIn(body,"2026-09-25"),bodyAtIn(body,"2026-08-01"),bodyAtIn({body:[],weight:85},NOW)],[80,78,80,85],
    "body weight on a day: the last weigh-in before it, else the first after, else the profile's");
  t.eq([loadIn(body,PU,0,"2026-09-10"),loadIn(body,PU,10,"2026-09-10"),loadIn(body,PU,78,"2026-09-10"),loadIn(body,"Pushups",0,"2026-09-10")],[80,90,78,52],
    "a pull-up at 0 added is the body; 10 added on top; a figure near body weight was the whole load; a push-up two thirds");
  t.eq(loadIn({body:[],weight:null},PU,0,NOW),0,"no body weight anywhere: only what was added");
  t.eq(volumeIn(body,[set(100,5),set(60,10,0,true)],SQ,NOW),500,"volume: load × reps, warm-ups count nothing");
  t.eq(sessionVolumeIn(body,sess(1,[[SQ,[set(100,5)]],[BP,[set(60,10)]]])),1100,"a session's volume, every exercise");
  var DB="Dumbbell Bench Press",ROW="One-Arm Dumbbell Row",hand=Object.assign({},body,{dbHand:true});
  t.eq([volumeIn(hand,[set(20,10)],DB,NOW),volumeIn(body,[set(40,10)],DB,NOW),volumeIn(hand,[set(30,10)],ROW,NOW),volumeIn(hand,[set(100,5)],SQ,NOW)],[400,400,300,500],
    "volume is the weight moved: two dumbbells logged per hand count twice, as a total once; one arm at a time, and a barbell, as logged");
  var cdb={prefs:{},incr:{"Dumbbell Bench Press":2,"Barbell Squat":5},sessions:[sess(3,[[DB,[set(20,10),set(10,12,0,true)]],[ROW,[set(30,10)]],[SQ,[set(100,5)]]])],
    active:{entries:[{name:DB,sets:[set(22.5,8)]}]}};
  var cv=convertDbLoads(cdb,"total"),ce=cdb.sessions[0].entries;
  t.eq([cv.changed,cv.sessions.length,ce[0].sets[0].w,ce[0].sets[1].w,ce[1].sets[0].w,ce[2].sets[0].w,cdb.active.entries[0].sets[0].w,cdb.incr["Dumbbell Bench Press"],cdb.incr["Barbell Squat"],cdb.prefs.dbLoad],
    [3,1,40,20,30,100,45,4,5,"total"],"per hand to both together: two-dumbbell sets, the workout under way and own steps doubled; one arm and the barbell untouched");
  t.eq([convertDbLoads(cdb,"total").changed,convertDbLoads(cdb,"hand").changed,ce[0].sets[0].w,cdb.active.entries[0].sets[0].w,cdb.prefs.dbLoad],[0,3,20,22.5,"hand"],
    "switching to the setting it already has changes nothing; and back again halves them");
  t.eq([e1RM(100,5,8),e1RM(100,1),e1RM(100,5)],[123.3,100,116.7],"estimated max: Epley, counting reps in reserve; a single is a max already");
  t.eq(bestE1RMIn(body,[set(100,5,8),set(110,1),set(150,3,0,true)],SQ,NOW),123.3,"the best estimated max of the sets, warm-ups left out");

  /* ---- last time, best ever, reps at a weight ---- */
  var log={body:[],weight:80,sessions:[sess(2,[[SQ,[set(60,10,0,true)]]]),sess(7,[[SQ,[set(100,5,8),set(60,10,0,true)]]]),
    sess(12,[[SQ,[set(110,2)]]]),sess(17,[[SQ,[set(90,10)]]])]};
  t.eq(prevPerfIn(log,SQ),{date:back(7),sets:[set(100,5,8)]},"last time: the newest session with working sets, without its warm-ups");
  t.eq(prevPerfIn(log,"Leg Press"),null,"never done: nothing");
  t.eq(prIn(log,SQ),{w:110,e:123.3,vol:900,reps:2,date:back(12)},"best weight (and its reps and date), best estimated max, best set volume");
  t.eq(repsAtIn(log,SQ,100),5,"most reps at 100 kg or heavier");

  /* ---- records ---- */
  t.eq(recordIn(log,SQ,set(115,1),[],NOW),{k:"w",n:SQ,w:115,r:1},"heavier than ever: a weight record");
  t.eq(recordIn(log,SQ,set(108,6),[],NOW),{k:"e",n:SQ,w:108,r:6,e:129.6},"a better estimated max");
  t.eq(recordIn(log,SQ,set(100,6),[],NOW),{k:"r",n:SQ,w:100,r:6},"more reps at that weight or heavier");
  t.eq(recordIn(log,SQ,set(100,6),[set(100,7)],NOW),null,"not when a set earlier today already did it");
  var pu={body:[],weight:80,sessions:[sess(4,[[PU,[set(0,10),set(0,8)]]])]};
  t.eq([prIn(pu,PU).date,recordIn(pu,PU,set(0,12),[],NOW),recordIn(pu,PU,set(0,10),[],NOW)],[back(4),{k:"e",n:PU,w:0,r:12,e:112},null],
    "a lift only done at body weight has history: more reps is a record, the same is not");
  t.eq([recordIn(log,"Leg Press",set(200,10),[],NOW),recordIn(log,SQ,set(150,3,0,true),[],NOW),recordIn(log,SQ,set(150,0),[],NOW)],[null,null,null],
    "the first time, a warm-up, or no reps: no record");

  /* ---- the next weight step ---- */
  t.eq([incrementOf(SQ,100),incrementOf(BP,100),incrementOf("Dumbbell Bench Press",30),incrementOf("Kettlebell One-Legged Deadlift",40),incrementOf(PU,0)],
    [5,2.5,2,4,0],"by equipment: 5 kg on a heavy barbell lift, 2.5 on others, 2 for dumbbells, 4 for kettlebells; bodyweight goes by reps");
  t.eq([incrementOf("Leg Press",100),incrementOf("Side Lateral Raise",10)],[2.5,1],"a machine 2.5; never more than a tenth of the load (at least 1)");
  t.eq([incrementOf("Dumbbell Bench Press",60,{dbTotal:true}),incrementOf("Alternate Hammer Curl",30,{dbTotal:true})],[4,2],
    "dumbbells logged as the pair's total move two at once, except one-sided work");
  t.eq([incrementOf(SQ,100,{lb:true}),incrementOf(BP,100,{lb:true}),incrementOf("Dumbbell Bench Press",60,{lb:true})],[4.54,2.27,2.27],
    "in pounds: 10 lb on a heavy barbell lift, 5 lb otherwise (stored in kg)");
  t.eq([incrementOf(SQ,100,{prog:"conservative"}),incrementOf(BP,100,{prog:"aggressive"}),incrementOf(SQ,100,{own:7})],[2.5,5,7],
    "slower halves it, faster doubles it, the exercise's own step wins");
  t.eq([snapDown(87.3,2.5),snapDown(10.1),snapDown(-3,2.5)],[87.5,10,0],"to the nearest real step, never below 0");

  /* ---- stalls ---- */
  function flat(ws){return {body:[],weight:80,sessions:ws.map(function(w,i){return sess(1+i*4,[[SQ,[set(w,5)]]]);})};}
  t.eq([plateauIn(flat([100,100,100,100]),SQ),plateauIn(flat([110,105,100,95]),SQ),plateauIn(flat([100,100,100]),SQ)],[true,false,false],
    "no gain across the last three sessions against the one before: a stall; rising is not; three sessions is too few");

  /* ---- the lighter week's case ---- */
  function block(n,rising){var ss=[];for(var i=0;i<n;i++){var up=rising?(n-i)*2.5:0;
    ss.push(sess(1+i*4,[[SQ,[set(100+up,5,9.5)]],[BP,[set(80+up,5,9.5)]]]));}return {body:[],weight:80,sessions:ss};}
  t.eq(deloadDueIn(block(14,false),{},NOW),{why:"plateau",n:2},"five weeks of training and two lifts stalled");
  t.eq(deloadDueIn(block(14,true),{},NOW),{why:"effort"},"or two weeks of sets close to failure");
  t.eq([deloadDueIn(block(11,false),{},NOW),deloadDueIn(block(14,false),{last:back(10)},NOW),deloadDueIn(block(14,false),{snooze:back(-3)},NOW)],[null,null,null],
    "not before twelve sessions, within five weeks of the last one, or while put off");

  /* ---- the suggestion for the next set ---- */
  var e={name:BP,planned:{sets:3,lo:6,hi:10},sets:[]};
  var hist={body:[],weight:80,sessions:[sess(3,[[BP,[set(80,10,7),set(80,10,7),set(80,10,7)]]])]};
  var ctx={increment:function(){return 2.5;},deload:false,ready:0};
  var up=recommendIn(hist,e,ctx);
  t.eq([up.w,up.note,up.last],[85,"Top of the range with reps to spare. A bigger step this time.","80 × 10"],
    "the top of the range at RPE 7: a bigger step (two steps)");
  t.eq(recommendIn(hist,e,{increment:ctx.increment,deload:true,ready:0}).w,72.5,"a lighter week: about 10% less, to a real step");
  var dr=recommendIn(hist,e,{increment:ctx.increment,deload:false,ready:1});
  t.eq([dr.w,dr.ready],[75,1],"a drained day: about 5% under last time");
  t.eq(recommendIn({body:[],sessions:[]},e,ctx),null,"no history: nothing to go on");
  var am=recommendIn(hist,{name:BP,planned:{sets:1,lo:0,hi:0,amrap:true}},ctx);
  t.eq(am,{w:80,lo:0,hi:0,amrap:true,last:"80 × 10"},"as many as you can: last time's best is the target");
  var bw=recommendIn({body:[],weight:80,sessions:[sess(3,[[PU,[set(0,8),set(0,8)]]])]},{name:PU,planned:{sets:3,lo:6,hi:10}},ctx);
  t.eq([bw.w,bw.bw,bw.last],[0,true,"8"],"body weight alone: progress by reps, from last time's reps");
  t.clean(up,"a suggestion: no NaN or undefined");

  /* ---- the next weight once the top is reached ---- */
  t.eq(progressionHintOf({name:BP,planned:{sets:3,hi:10},sets:[set(80,10),set(80,10),set(80,10)]},function(){return 2.5;}),{inc:2.5,next:82.5},
    "every working set at the top of the range: the next weight");
  t.eq(progressionHintOf({name:BP,planned:{sets:3,hi:10},sets:[set(80,10),set(80,8),set(80,10)]},function(){return 2.5;}),null,"not until every set gets there");

  /* ---- weeks and muscles ---- */
  var wk={body:[],sessions:[sess(1,[[BP,[set(80,8),set(80,8),set(60,10,0,true)]],["Running",[{min:30}]]]),sess(5,[[SQ,[set(100,5)]]]),sess(10,[[BP,[set(80,8)]]])]};
  t.eq(weeklySetsIn(wk,NOWMS),{Chest:2,Quads:1},"working sets per muscle in the last seven days; warm-ups and cardio do not count");
  t.eq([daysSinceIn(wk,"Quads",NOWMS),daysSinceIn(wk,"Back",NOWMS)],[5,null],"days since a muscle was trained");
  t.eq([consistencyIn(wk,3,NOWMS),consistencyIn(wk,0,NOWMS)],[25,0],"workouts in four weeks against three training days a week; no plan, no figure");
}

export {run};

import {OPL} from "../powerlifting.js";
import {percentileOf, standing} from "../percentile.js";
import {INFO, mk} from "./assert.js";

var TODAY="2026-10-07";
/* The expected answers come from the table itself, so a rebuild from newer data
   does not break these. Men's 83 kg class is index 3. */
var M83=function(lift){return OPL.T.m[lift][3].slice(1);};

function run(t){
  /* The table: three judged lifts, raw, deciles in order, nothing invented. */
  t.eq(OPL.lifts,["squat","bench","deadlift"],"table: the three judged lifts only");
  t.eq([OPL.population,OPL.equipment],["raw-competitors","raw"],"table: raw competitors, said in the data");
  var ordered=true,shaped=true;
  ["m","f"].forEach(function(s){OPL.lifts.forEach(function(l){OPL.T[s][l].forEach(function(row){
    if(row.length!==1&&row.length!==OPL.pcts.length+1)shaped=false;
    for(var i=2;i<row.length;i++)if(row[i]<row[i-1])ordered=false;});});});
  t.ok(shaped,"table: every class has a count, and deciles only when there are enough lifters");
  t.ok(ordered,"table: deciles never go down");

  /* Nothing to compare: defined answers, never a guess. */
  var none=standing([],INFO,{today:TODAY});
  t.eq([none.kind,none.lifts.map(function(x){return x.kind;})],["none",["none","none","none"]],"empty log, no profile: none");
  t.clean(none,"empty log: no NaN or undefined");
  var empty=standing([],INFO,{today:TODAY,sex:"m",bodyweight:82});
  t.eq([empty.kind,empty.lifts.map(function(x){return x.why;})],["insufficient",["nothing","nothing","nothing"]],"empty log with a profile: nothing logged yet");
  t.clean(empty,"empty log with a profile: no NaN or undefined");

  /* Only the judged lifts. */
  t.eq(percentileOf("m",82,"press",60).kind,"none","an overhead press has no table and gets no percentile");
  t.eq(percentileOf("m",82,"curl",40).why,"lift","nor does anything else");
  t.eq(percentileOf("",82,"bench",100).why,"sex","no sex: none");
  t.eq(percentileOf("m",0,"bench",100).why,"bodyweight","no bodyweight: none");

  /* Placing a number. */
  var d=M83("bench");
  var mid=percentileOf("m",82,"bench",d[4]);
  t.eq([mid.kind,mid.cls,mid.pct,mid.edge],["ok","83",50,""],"the class median is the 50th percentile");
  t.eq(percentileOf("m",82,"bench",(d[0]+d[1])/2).pct,15,"halfway between the 10th and 20th is the 15th");
  var lo=percentileOf("m",82,"bench",d[0]-5);
  t.eq([lo.pct,lo.edge],[10,"below"],"under the 10th says so rather than inventing a figure");
  var hi=percentileOf("m",82,"bench",d[8]+20);
  t.eq([hi.pct,hi.edge],[90,"above"],"over the 90th says so");
  t.ok(mid.population==="raw-competitors"&&mid.estimated===true,"every answer carries who it is compared with, and that it is an estimate");
  t.clean([mid,lo,hi],"placed: no NaN or undefined");

  /* Classes by bodyweight, the IPF's. */
  t.eq(["m83","m83.1","m130","f50","f90"].map(function(k){
    var s=k[0],bw=+k.slice(1);return percentileOf(s,bw,"squat",100).cls;}),["83","93","120+","52","84+"],"weight classes");
  t.eq(percentileOf("M",82,"squat",100).cls,"83","sex as the profile writes it");

  /* From a log: the best estimated max of the last 12 weeks, judged lifts only. */
  var log=[
    mk("2026-09-20",[["Barbell Bench Press - Medium Grip",[[60,10,0,true],[d[4]/(1+5/30),5]]]]),
    mk("2026-09-25",[["Smith Machine Bench Press",[[200,5]]]]),
    mk("2026-03-01",[["Barbell Squat",[[300,3]]]]),
    mk("2026-10-01",[["Sumo Deadlift",[[180,3]]]])];
  var s=standing(log,INFO,{today:TODAY,sex:"m",bodyweight:82});
  var b=s.lifts[1];
  t.eq([s.kind,b.kind,b.name,b.date,b.pct],["ok","ok","Barbell Bench Press - Medium Grip","2026-09-20",50],"the bench, from its best set");
  t.eq(s.lifts[0].why,"nothing","a squat from seven months ago is not current strength");
  t.eq([s.lifts[2].kind,s.lifts[2].name],["ok","Sumo Deadlift"],"sumo counts as a deadlift");
  t.clean(s,"from a log: no NaN or undefined");}

export {run};

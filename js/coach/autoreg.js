/* Bunyan — coach: autoregulation
   Progression already fires when every working set reaches the top of its rep range.
   That rule stays; this reads the effort around it, from the last sessions of one
   exercise:

     top of the range, average RPE 7 or less   a bigger step: there were reps to spare
     top of the range, average RPE 9 or more   add the load, but recovery is marginal
     top of the range otherwise                the usual step
     short of the range two sessions running   hold the load; do not drop it yet
     short three sessions running              a lighter week: about 10% off, same reps
     nothing logged                            "insufficient"

   "Short" means the best set at the session's top load fell under the bottom of the
   range, at the same load as the session before. Every result is a suggestion with
   its reason; nothing here changes a program. */
import {byDate, infoOf, num, r1, workSets} from "./util.js";

/* The top load of a session's entry and the best reps at it, its sets' average RPE,
   and whether every working set reached the top of the range. */
function readEntry(e,hi,I,date){
  var ws=workSets(e).filter(function(x){return num(x.w)>0||num(x.r)>0;});
  if(!ws.length)return null;
  var top=Math.max.apply(null,ws.map(function(x){return I.load(e.name,x.w,date);}));
  var atTop=ws.filter(function(x){return I.load(e.name,x.w,date)===top;});
  var best=Math.max.apply(null,atTop.map(function(x){return num(x.r);}));
  var rp=ws.filter(function(x){return num(x.rpe)>0;}).map(function(x){return num(x.rpe);});
  return {w:top,r:best,rpe:rp.length?r1(rp.reduce(function(a,b){return a+b;},0)/rp.length):0,
    allTop:!!hi&&ws.every(function(x){return num(x.r)>=hi;})};}

function progressionAdvice(sessions,name,range,info){
  var I=infoOf(info);range=range||{};
  var lo=num(range.lo),hi=num(range.hi);
  var reads=[];
  byDate(sessions).reverse().forEach(function(s){
    if(reads.length>=3)return;
    var e=(s.entries||[]).filter(function(x){return x&&x.name===name&&x.sets&&x.sets.length;})[0];
    if(!e)return;
    var r=readEntry(e,hi,I,s.date);if(r)reads.push(r);});
  if(!reads.length)return {kind:"insufficient"};
  var last=reads[0];
  /* Short of the range, at the same load, how many sessions running. */
  var miss=0;
  for(var i=0;i<reads.length&&lo;i++){
    if(reads[i].r<lo&&reads[i].w===last.w)miss++;else break;}
  if(miss>=3)return {kind:"deload",miss:miss,w:last.w,factor:0.9};
  if(miss===2)return {kind:"hold",miss:miss,w:last.w};
  if(last.allTop){
    if(last.rpe&&last.rpe<=7)return {kind:"bigger",w:last.w,rpe:last.rpe};
    if(last.rpe>=9)return {kind:"add-marginal",w:last.w,rpe:last.rpe};
    return {kind:"add",w:last.w,rpe:last.rpe};}
  return {kind:"none",w:last.w,rpe:last.rpe,miss:miss};}

export {progressionAdvice};

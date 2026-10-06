/* Bunyan — coach tests: no framework, just assertions that log.
   Each test file exports run(t), where t.ok(cond, label), t.eq(a, b, label) and
   t.clean(value, label) record a result. clean() checks a result has no NaN, no
   Infinity and no property left undefined, all the way down. */

function makeT(name){
  var res=[];
  function rec(pass,label,detail){res.push({file:name,pass:!!pass,label:label,detail:detail||""});}
  return {
    results:res,
    ok:function(c,label){rec(c,label);},
    eq:function(a,b,label){var A=JSON.stringify(a),B=JSON.stringify(b);rec(A===B,label,A===B?"":"got "+A+", expected "+B);},
    clean:function(v,label){var bad=badIn(v,"");rec(!bad,label,bad);}};}

function badIn(v,path){
  if(v===undefined)return "undefined at "+(path||"top");
  if(typeof v==="number"&&!isFinite(v))return "non-finite number at "+(path||"top");
  if(v&&typeof v==="object"){
    var ks=Array.isArray(v)?v.map(function(_,i){return i;}):Object.keys(v);
    for(var i=0;i<ks.length;i++){var b=badIn(v[ks[i]],path+"."+ks[i]);if(b)return b;}}
  return "";}

/* Fixtures. A session: mk("2026-09-01", [["Bench", [[80, 8, 7], [80, 8, 7.5]]]]). */
function mk(date,entries){
  return {id:"s"+date,date:date,entries:entries.map(function(e){
    return {name:e[0],sets:(e[1]||[]).map(function(x){return {w:x[0],r:x[1],rpe:x[2]||0,wu:!!x[3]};})};})};}
function addDays(iso,n){var d=new Date(iso+"T00:00:00Z");d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
/* A fake library: what the coach needs to know about each exercise. */
var MUSCLE={Bench:"Chest",Squat:"Quads",Deadlift:"Hamstrings",Row:"Back",Curl:"Biceps",Press:"Shoulders",
  "Barbell Bench Press - Medium Grip":"Chest","Barbell Squat":"Quads","Barbell Deadlift":"Hamstrings",
  "Standing Military Press":"Shoulders","Bent Over Barbell Row":"Back"};
var INFO={
  muscle:function(n){return MUSCLE[n]||"Other";},
  secondary:function(n){return n==="Bench"?["Triceps","Shoulders"]:[];},
  activity:function(n){return /Running|Football|Walking/.test(n);}};

export {addDays, INFO, makeT, mk};

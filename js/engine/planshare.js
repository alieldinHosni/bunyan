/* Bunyan — a plan, handed to another Bunyan user
   Owner, 27 Oct: a training program or a meal plan, made by hand, imported or built
   with the coach, sent to someone else's Bunyan and arriving there as it was sent.

   There is no server: the plan travels as a code inside an ordinary message (WhatsApp,
   a text, an email). The code is the plan as JSON, compressed where the phone can
   (deflate-raw), in base64url, behind a tag that says which:
     BNY1.<deflated>   BNY0.<plain>
   Pasting the whole message works: the code is found inside it. What arrives is
   checked field by field, since it comes from outside the app.

   What a plan carries: the program (days, exercises with sets, reps, rest, notes,
   supersets; no history, no ids) and the exercises of the sender's own it uses, and/or
   the meals with their foods and grams (each food carries its own nutrition, so the
   receiver needs nothing else). Never the sender's log, weight, targets or profile. */
import {EXDB, MUSCLES} from "../data/exercises.js";

var TAG=/BNY([01])\.([A-Za-z0-9_-]{8,})/;
var MAXLEN=60000;

/* ---- what is sent ---------------------------------------------------------------------- */
var EXF=["name","sets","lo","hi","rest","rir","timed","side","amrap","wk","alt","grp","note","min","w0"];
function exOut(e){var o={};EXF.forEach(function(k){if(e[k]!=null&&e[k]!=="")o[k]=e[k];});return o;}
/* sp: a program; slots: the meals ([{id,name?,plan}]); own: the sender's own exercises
   ([{n,m}]); from: the sender's name. Either part may be missing. */
function packPlan(o){
  var out={k:"bunyan-plan",v:1,from:String(o.from||"").slice(0,40)};
  if(o.program){var sp=o.program,used={};
    out.program={name:String(sp.name||"").slice(0,80),schedule:sp.schedule==="week"?"week":"cycle",
      days:(sp.days||[]).map(function(d){(d.ex||[]).forEach(function(e){used[e.name]=1;});
        return {name:String(d.name||""),wd:(d.wd||[]).slice(),ex:(d.ex||[]).map(exOut),notes:Array.isArray(d.notes)?d.notes.slice():undefined};})};
    if(sp.notes&&sp.notes.length)out.program.notes=sp.notes;
    if(sp.meta)out.program.meta=sp.meta;
    var mine=(o.own||[]).filter(function(m){return used[m.n]&&!(EXDB&&EXDB[m.n]);});
    if(mine.length)out.ex=mine.map(function(m){return {n:m.n,m:m.m||"Other"};});}
  if(o.slots){
    out.meals=o.slots.filter(function(s){return s&&(s.plan||[]).length;}).map(function(s){
      return {id:s.id,name:s.name||undefined,plan:s.plan.map(function(it){
        return {n:it.n,label:it.label,grams:it.grams,kcal:it.kcal,p:it.p,c:it.c,f:it.f,fib:it.fib,fid:it.fid};})};});
    if(!out.meals.length)delete out.meals;}
  return out;}

/* ---- the code ------------------------------------------------------------------------- */
function b64u(bytes){var s="";for(var i=0;i<bytes.length;i++)s+=String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");}
function unb64u(str){var s=atob(str.replace(/-/g,"+").replace(/_/g,"/")),b=new Uint8Array(s.length);
  for(var i=0;i<s.length;i++)b[i]=s.charCodeAt(i);return b;}
function through(bytes,stream){
  return new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer().then(function(ab){return new Uint8Array(ab);});}
/* → Promise of the code. */
function encodePlan(obj){
  var bytes=new TextEncoder().encode(JSON.stringify(obj));
  if(typeof CompressionStream==="function")
    return through(bytes,new CompressionStream("deflate-raw")).then(function(z){return "BNY1."+b64u(z);},function(){return "BNY0."+b64u(bytes);});
  return Promise.resolve("BNY0."+b64u(bytes));}
/* text: a code, or a whole message with one in it. → Promise of a checked plan, or null. */
function decodePlan(text){
  /* The code ends at the first character it cannot hold: a space, a line break, a dot. */
  var m=String(text||"").match(TAG);
  if(!m||m[2].length>MAXLEN)return Promise.resolve(null);
  var bytes;try{bytes=unb64u(m[2]);}catch(e){return Promise.resolve(null);}
  var go=m[1]==="1"
    ?(typeof DecompressionStream==="function"?through(bytes,new DecompressionStream("deflate-raw")):Promise.reject(new Error("no inflate")))
    :Promise.resolve(bytes);
  return go.then(function(b){try{return cleanPlan(JSON.parse(new TextDecoder().decode(b)));}catch(e){return null;}},function(){return null;});}

/* ---- what is accepted ------------------------------------------------------------------ */
function str(x,max){return typeof x==="string"?x.slice(0,max||200):"";}
function int(x,lo,hi){x=Math.round(+x);return isFinite(x)?Math.max(lo,Math.min(hi,x)):null;}
function numIn(x,lo,hi){x=+x;return isFinite(x)?Math.max(lo,Math.min(hi,x)):null;}
function cleanEx(e){
  if(!e||!str(e.name))return null;
  var o={name:str(e.name,120),sets:int(e.sets,1,20)||3,lo:int(e.lo,0,600),hi:int(e.hi,0,600)};
  if(o.lo==null)o.lo=8;if(o.hi==null||o.hi<o.lo)o.hi=Math.max(o.lo,12);
  var r=int(e.rest,0,900);if(r!=null)o.rest=r;
  var ri=int(e.rir,0,10);if(ri!=null)o.rir=ri;
  ["timed","side","amrap"].forEach(function(k){if(e[k]===true)o[k]=true;});
  if(Array.isArray(e.wk)&&e.wk.length===2){var a=int(e.wk[0],1,99),b=int(e.wk[1],1,99);if(a&&b&&b>=a)o.wk=[a,b];}
  if(str(e.alt))o.alt=str(e.alt,120);if(str(e.grp))o.grp=str(e.grp,20);if(str(e.note))o.note=str(e.note,300);
  var mn=int(e.min,1,600);if(mn!=null)o.min=mn;
  var w0=numIn(e.w0,0,1000);if(w0)o.w0=w0;
  return o;}
function cleanPlan(o){
  if(!o||o.k!=="bunyan-plan"||o.v!==1)return null;
  var out={from:str(o.from,40)};
  if(o.program&&Array.isArray(o.program.days)){
    var days=o.program.days.slice(0,14).map(function(d){
      return {name:str(d&&d.name,60)||"Day",wd:Array.isArray(d&&d.wd)?d.wd.map(function(x){return int(x,1,7);}).filter(Boolean):[],
        ex:(Array.isArray(d&&d.ex)?d.ex:[]).slice(0,40).map(cleanEx).filter(Boolean),
        notes:Array.isArray(d&&d.notes)?d.notes.filter(function(x){return typeof x==="string";}).slice(0,20):undefined};});
    if(days.length)out.program={name:str(o.program.name,80)||"Shared program",schedule:o.program.schedule==="week"?"week":"cycle",days:days};
    if(out.program&&Array.isArray(o.program.notes))out.program.notes=o.program.notes.filter(function(n){return n&&typeof n==="object";}).slice(0,20)
      .map(function(n){return {h:str(n.h,120),t:Array.isArray(n.t)?n.t.filter(function(x){return typeof x==="string";}).slice(0,30):[]};});
    if(out.program&&o.program.meta&&typeof o.program.meta==="object")
      out.program.meta={phase:str(o.program.meta.phase,80)||undefined,weeks:int(o.program.meta.weeks,1,52)||undefined};}
  if(Array.isArray(o.ex))out.ex=o.ex.slice(0,100).filter(function(m){return m&&str(m.n);})
    .map(function(m){return {n:str(m.n,120),m:MUSCLES.indexOf(m.m)>=0?m.m:"Other"};});
  if(Array.isArray(o.meals)){
    var meals=o.meals.slice(0,10).map(function(s){
      var plan=(Array.isArray(s&&s.plan)?s.plan:[]).slice(0,40).filter(function(it){return it&&str(it.n);}).map(function(it){
        var x={n:str(it.n,120),label:str(it.label,60)||((int(it.grams,0,5000)||0)+" g"),grams:numIn(it.grams,0,5000)||0,src:"plan",
          kcal:Math.round(numIn(it.kcal,0,5000)||0),p:numIn(it.p,0,500)||0,c:numIn(it.c,0,800)||0,f:numIn(it.f,0,400)||0,fib:numIn(it.fib,0,200)||0};
        if(str(it.fid))x.fid=str(it.fid,80);return x;});
      return {id:str(s&&s.id,40)||"",name:str(s&&s.name,60)||undefined,plan:plan};}).filter(function(s){return s.id&&s.plan.length;});
    if(meals.length)out.meals=meals;}
  return out.program||out.meals?out:null;}

/* A plan's size, said before it is added. */
function planSummary(p){
  var s={};
  if(p.program){s.program=p.program.name;s.days=p.program.days.filter(function(d){return d.ex.length;}).length;
    s.ex=p.program.days.reduce(function(n,d){return n+d.ex.length;},0);}
  if(p.meals){s.meals=p.meals.length;s.kcal=p.meals.reduce(function(n,m){return n+m.plan.reduce(function(k,it){return k+(it.kcal||0);},0);},0);}
  return s;}

export {cleanPlan, decodePlan, encodePlan, packPlan, planSummary};

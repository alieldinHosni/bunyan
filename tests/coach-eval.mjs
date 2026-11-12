/* The coach's evaluation set (tests/coach-eval.json, docs/COACH-AGENT.md 2.8), scored.

   Run (from the repo root):
     python3 -m http.server 8765 &          # serve the app
     node tests/coach-eval.mjs              # needs Playwright + Chromium

   Environment: BUNYAN_URL (default http://localhost:8765/index.html), CHROMIUM, PW_PATH,
   as tests/regression.mjs. ONLY=<text> scores just the items whose id contains it.

   Two stages, each item in English and in Egyptian Arabic:
   1. Safety, in Node: js/coach/safety.js is pure, so every item's class (stop, session,
      refer, or none) is checked against expect.safety without a browser.
   2. The answer, in Chromium: the coach's own entry point (ask() in
      js/ui/views/chat.js) on the regression suite's seeded profile, with the
      conversation cleared before each item (its `before` lines are said first, not
      judged). It passes when the answer's id is one of expect.answer, it says every
      mustSay and none of mustNotSay (case ignored), and it shows no raw knowledge-base
      record ("Mp lunge, group: legs") and no paragraph that starts mid-sentence.

   Prints the totals, the score by kind, by language, the English–Arabic parity (pairs
   that pass in one language only), the failing ids, and any item whose result is not
   the `today` it was marked with. Exits 1 only when a safety class is wrong; the rest
   is a measure, not yet a gate (C-1: the thresholds are set by the packages after). */
import {createRequire} from "module";
import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";
import {classify} from "../js/coach/safety.js";

const HERE=path.dirname(fileURLToPath(import.meta.url));
const SET=JSON.parse(fs.readFileSync(path.join(HERE,"coach-eval.json"),"utf8"));
const ONLY=process.env.ONLY||"";
const items=SET.items.filter(it=>!ONLY||it.id.indexOf(ONLY)>=0);
const URL_=process.env.BUNYAN_URL||"http://localhost:8765/index.html";

/* ---- stage 1: safety, pure ---- */
const res={};
for(const it of items){
  const r=classify(it.say),want=it.expect.safety==null?null:it.expect.safety;
  res[it.id]={safety:r.cls===want,got:{safety:r.cls},why:[]};
  if(r.cls!==want)res[it.id].why.push("safety "+r.cls+" (expected "+want+")");}

/* ---- stage 2: the answer, in the browser ---- */
/* The regression suite's profile (tests/regression.mjs seed()): onboarded, three lifts
   logged every third day for six weeks, a body weight, targets. */
const iso=d=>{const x=new Date(Date.now()-d*864e5);return new Date(x-x.getTimezoneOffset()*6e4).toISOString().slice(0,10);};
function seed(){
  const lifts=[["Barbell Bench Press - Medium Grip","Chest"],["Barbell Squat","Quads"],["Pullups","Back"]];
  const sessions=[];
  for(let d=2;d<40;d+=3)sessions.push({id:"s"+d,date:iso(d),dayName:"Seed",activeMs:45*6e4,
    entries:lifts.map(([n,m],i)=>({name:n,muscle:m,sets:[1,2,3].map(()=>({w:60+i*20,r:8,rpe:8}))}))});
  return {v:2,onboarded:true,prefs:{rpe:"last",autorest:true,sound:false,awake:false,splash:false,unit:"kg",lang:"en",anim:false,haptic:false,view:"set",warn:10,nowarm:true},
    profile:{age:30,height:180,weight:84,sex:"m",activity:1.4,goal:"gain",prog:"standard",level:"some",days:3},
    goals:{kcal:2500,p:150,c:300,f:70,water:3000,steps:9000},sessions,body:[{date:iso(3),weight:84}],days:{},
    myFoods:[],savedMeals:[],freq:{},favs:[],skip:[],userSplits:[],myEx:[]};}

const toAsk=items.filter(it=>Array.isArray(it.expect.answer)&&it.expect.answer.length);
if(toAsk.length){
  const require=createRequire(process.env.PW_PATH||import.meta.url);
  const {chromium}=require("playwright");
  const browser=await chromium.launch(process.env.CHROMIUM?{executablePath:process.env.CHROMIUM}:{});
  const profiles={seed};
  const byProfile={};
  for(const it of toAsk)(byProfile[it.profile||"seed"]=byProfile[it.profile||"seed"]||[]).push(it);
  for(const [pf,list] of Object.entries(byProfile)){
    const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:"block"});
    const raw=JSON.stringify((profiles[pf]||seed)());
    await ctx.addInitScript(raw=>{localStorage.setItem("bunyan:profiles",JSON.stringify([{id:"me",name:"Me",owner:true}]));
      localStorage.setItem("bunyan:current",'"me"');localStorage.setItem("bunyan:db:me",raw);localStorage.setItem("bunyan:notour","1");},raw);
    const page=await ctx.newPage();const errs=[];page.on("pageerror",e=>errs.push(e.message));
    await page.goto(URL_);await page.waitForTimeout(1000);
    await page.evaluate(async()=>{const N=await import("/js/engine/nutrition.js");await new Promise(r=>N.loadFoods(r));});
    /* Each item from the same starting point: no conversation, nothing told, the state as
       seeded (a request is only previewed; nothing is applied without a tap). */
    const base=await page.evaluate(async()=>{const S=(await import("/js/state.js")).S;return JSON.stringify({context:S.context||null,missed:S.missed||[]});});
    for(const it of list){
      let out;
      try{out=await page.evaluate(async([it,base])=>{
        const S=(await import("/js/state.js")).S,C=await import("/js/ui/views/chat.js");
        const b=JSON.parse(base);S.chat=[];S.chatFrom=0;S.context=b.context?JSON.parse(JSON.stringify(b.context)):S.context;
        for(const q of it.before||[])C.ask(q);
        const m=C.ask(it.say);
        if(!m)return {id:"none",text:""};
        if(m.tap)return {id:"tap",text:""};
        const parts=[];
        (m.b||[]).forEach(x=>{if(!x)return;if(x.p!=null)parts.push(String(x.p));if(Array.isArray(x.l))x.l.forEach(y=>parts.push(String(y)));if(x.n!=null)parts.push(String(x.n));});
        const g=m.ag||{};
        if(g.lead)parts.push(String(g.lead));(g.notes||[]).forEach(x=>parts.push(String(x)));
        /* What is said, apart from the labels of buttons, choices and the items of a change. */
        const prose=parts.slice();
        if(g.item)parts.push(String(g.item));if(g.detail)parts.push(String(g.detail));
        (g.items||[]).forEach(x=>parts.push(String(x.item||"")+" "+String(x.detail||"")));
        (g.opts||[]).forEach(x=>parts.push(String(x.l||"")));
        (m.acts||[]).concat(g.acts||[]).forEach(x=>parts.push(String(x&&x.l||"")));
        return {id:m.id,safety:m.safety||null,prose,text:parts.join("\n")};},[it,base]);}
      catch(e){out={id:"threw",prose:[],text:String(e&&e.message||e)};}
      const r=res[it.id],why=r.why,low=out.text.toLowerCase();
      r.got.answer=out.id;r.text=out.text;
      if(it.expect.answer.indexOf(out.id)<0)why.push("answer "+out.id+" (expected "+it.expect.answer.join("|")+")");
      for(const s of it.mustSay||[])if(low.indexOf(String(s).toLowerCase())<0)why.push("does not say “"+s+"”");
      for(const s of it.mustNotSay||[])if(low.indexOf(String(s).toLowerCase())>=0)why.push("says “"+s+"”");
      /* A knowledge-base record or a fragment shown as an answer (C3). */
      for(const p of out.prose||[]){
        if(/\b[A-Z]?[a-z]+ [\w-]+, [\w-]+: /.test(p)){why.push("raw record: "+p.slice(0,60));break;}
        if(/^[a-z]/.test(p.trim())&&!/^(e\.g\.|i\.e\.)/.test(p.trim())){why.push("fragment: "+p.slice(0,60));break;}}
      r.answer=why.filter(w=>!/^safety /.test(w)).length===0;}
    if(errs.length)console.log("page errors ("+pf+"): "+errs.slice(0,5).join(" | "));
    await ctx.close();}
  await browser.close();}

/* ---- the score ---- */
const pass=it=>res[it.id].safety&&res[it.id].why.length===0;
const pct=(a,b)=>b?Math.round(a*1000/b)/10+"%":"–";
const row=(name,list)=>{const p=list.filter(pass).length;return name.padEnd(16)+String(p).padStart(4)+" / "+String(list.length).padEnd(4)+" "+pct(p,list.length);};
const kinds=[...new Set(items.map(it=>it.kind))];
console.log("Coach evaluation: "+items.length+" items, "+new Set(items.map(it=>it.pair)).size+" pairs\n");
console.log(row("all",items));
const safeItems=items,safeOk=safeItems.filter(it=>res[it.id].safety).length;
console.log("safety stage".padEnd(16)+String(safeOk).padStart(4)+" / "+String(safeItems.length).padEnd(4)+" "+pct(safeOk,safeItems.length)+"   (every item's class; 100% required)");
const ans=items.filter(it=>Array.isArray(it.expect.answer)&&it.expect.answer.length),ansOk=ans.filter(it=>res[it.id].answer).length;
console.log("answer stage".padEnd(16)+String(ansOk).padStart(4)+" / "+String(ans.length).padEnd(4)+" "+pct(ansOk,ans.length));
console.log("\nBy kind");for(const k of kinds)console.log("  "+row(k,items.filter(it=>it.kind===k)));
console.log("\nBy language");for(const l of ["en","ar"])console.log("  "+row(l,items.filter(it=>it.lang===l)));
const pairs={};for(const it of items)(pairs[it.pair]=pairs[it.pair]||{})[it.lang]=pass(it);
const lop=Object.entries(pairs).filter(([,v])=>"en" in v&&"ar" in v&&v.en!==v.ar);
console.log("\nParity: "+lop.length+" of "+Object.keys(pairs).length+" pairs pass in one language only"
  +(lop.length?"\n  English only: "+lop.filter(([,v])=>v.en).map(([k])=>k).join(", ")+"\n  Arabic only: "+lop.filter(([,v])=>v.ar).map(([k])=>k).join(", "):""));
const failing=items.filter(it=>!pass(it));
console.log("\nFailing ("+failing.length+"):");
for(const it of failing)console.log("  "+it.id.padEnd(22)+" "+JSON.stringify(it.say).slice(0,60).padEnd(62)+" "+res[it.id].why.join("; "));
/* Against what each item was marked with when written. */
const moved=items.filter(it=>it.today&&(it.today==="pass")!==pass(it));
if(moved.length){console.log("\nChanged since marked (“today”):");
  for(const it of moved)console.log("  "+it.id+": marked "+it.today+", now "+(pass(it)?"pass":"fail"));}
/* EVAL_DUMP=<file>: every answer as given, to read the passes too. */
if(process.env.EVAL_DUMP)fs.writeFileSync(process.env.EVAL_DUMP,JSON.stringify(Object.fromEntries(items.map(it=>[it.id,{say:it.say,pass:pass(it),got:res[it.id].got,why:res[it.id].why,text:res[it.id].text}])),null,1));
if(process.env.EVAL_JSON)fs.writeFileSync(process.env.EVAL_JSON,JSON.stringify(Object.fromEntries(items.map(it=>[it.id,pass(it)]))));
const safetyFail=items.filter(it=>!res[it.id].safety||(it.kind==="safety"&&!pass(it)));
if(safetyFail.length){console.log("\nSAFETY FAILURES ("+safetyFail.length+"): "+safetyFail.map(it=>it.id).join(", "));process.exit(1);}
process.exit(0);

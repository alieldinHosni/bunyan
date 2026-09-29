/* Bunyan regression suite — the scenarios from docs/AUDIT.md, as assertions.

   Run (from the repo root):
     python3 -m http.server 8765 &          # serve the app
     node tests/regression.mjs              # needs Playwright + Chromium

   Environment:
     BUNYAN_URL   default http://localhost:8765/index.html
     CHROMIUM     path to a Chromium binary (optional; Playwright's own otherwise)
     PW_PATH      directory to resolve "playwright" from (optional)

   Every test starts from a fresh browser context seeded with a known profile, so the
   tests are independent and can run in any order. Exit code is the number of failures. */
import {createRequire} from "module";
const require=createRequire(process.env.PW_PATH||import.meta.url);
const {chromium}=require("playwright");

const URL_=process.env.BUNYAN_URL||"http://localhost:8765/index.html";
const iso=d=>{const x=new Date(Date.now()-d*864e5);return new Date(x-x.getTimezoneOffset()*6e4).toISOString().slice(0,10);};

function seed(){
  const lifts=[["Barbell Bench Press - Medium Grip","Chest"],["Barbell Squat","Quads"],["Pullups","Back"]];
  const sessions=[];
  for(let d=2;d<40;d+=3)sessions.push({id:"s"+d,date:iso(d),dayName:"Seed",activeMs:45*6e4,
    entries:lifts.map(([n,m],i)=>({name:n,muscle:m,sets:[1,2,3].map(()=>({w:60+i*20,r:8,rpe:8}))}))});
  return {v:2,onboarded:true,prefs:{rpe:"last",autorest:true,sound:false,awake:false,splash:false,unit:"kg",lang:"en",anim:false,haptic:false,view:"set",warn:10},
    profile:{age:30,height:180,weight:84,sex:"m",activity:1.4,goal:"gain",prog:"standard",level:"some",days:3},
    goals:{kcal:2500,p:150,c:300,f:70,water:3000,steps:9000},sessions,body:[{date:iso(3),weight:84}],days:{},
    myFoods:[],savedMeals:[],freq:{},favs:[],skip:[],userSplits:[],myEx:[]};
}

const browser=await chromium.launch(process.env.CHROMIUM?{executablePath:process.env.CHROMIUM}:{});
let fails=0,passes=0;
async function open(o={}){
  const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,serviceWorkers:o.sw?"allow":"block"});
  const db=o.db||seed();if(o.prefs)Object.assign(db.prefs,o.prefs);
  await ctx.addInitScript(([db,raw])=>{if(!localStorage.getItem("t:seeded")){
    localStorage.setItem("bunyan:profiles",JSON.stringify([{id:"me",name:"Me",owner:true}]));
    localStorage.setItem("bunyan:current",'"me"');
    localStorage.setItem("bunyan:db:me",raw!=null?raw:JSON.stringify(db));localStorage.setItem("t:seeded","1");}},[db,o.raw==null?null:o.raw]);
  const page=await ctx.newPage();const errs=[];
  page.on("pageerror",e=>errs.push(e.message));
  await page.goto(URL_);await page.waitForTimeout(1000);
  return {ctx,page,errs};
}
const ev=(page,expr)=>page.evaluate(async e=>{const S=(await import("/js/state.js")).S;const V=(await import("/js/ui/view.js")).V;return eval(e);},expr);
const pause=(page,ms=300)=>page.waitForTimeout(ms);
async function startWorkout(page){await page.tap('nav [data-tab="train"]');await pause(page);await page.tap('[data-startday]');await pause(page,400);}
async function test(name,fn,o){
  const env=await open(o);
  try{await fn(env.page,env);if(env.errs.length)throw new Error("page errors: "+env.errs.join(" | "));passes++;console.log("PASS",name);}
  catch(e){fails++;console.log("FAIL",name,"—",e.message);}
  finally{await env.ctx.close();}
}
function eq(a,b,msg){if(JSON.stringify(a)!==JSON.stringify(b))throw new Error((msg||"")+" expected "+JSON.stringify(b)+", got "+JSON.stringify(a));}

await test("backup → restore round trip",async page=>{
  const n=await ev(page,"S.sessions.length");
  await page.evaluate(async()=>{(await import("/js/ui/actions.js")).openSheet("backup");});await pause(page);
  const txt=await page.$eval('#bk',e=>e.value);
  await page.evaluate(async()=>{const s=await import("/js/state.js");s.S.sessions.length=0;s.saveDB();(await import("/js/ui/actions.js")).openSheet("restore");});await pause(page);
  await page.fill('#rs',txt);await page.tap('[data-dorestore]');await pause(page);await page.tap('[data-confirmok]');await pause(page,1000);
  eq(await ev(page,"S.sessions.length"),n,"sessions");
});
await test("junk is not accepted as a backup",async page=>{
  await page.evaluate(async()=>{(await import("/js/ui/actions.js")).openSheet("restore");});await pause(page);
  await page.fill('#rs','{"hello":1}');await page.tap('[data-dorestore]');await pause(page);
  eq(await ev(page,"V.sheet"),"restore","still on restore");
});
await test("double tap on ✓ logs exactly one set",async page=>{
  await startWorkout(page);await page.fill('#in_r','8');
  const b=await (await page.$('[data-logset]')).boundingBox();
  await page.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);await page.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);await pause(page);
  eq(await ev(page,"S.active.entries[0].sets.length"),1);
},{prefs:{autorest:false}});
await test("removing a set offers undo, and undo restores it",async page=>{
  await startWorkout(page);await page.fill('#in_r','8');await page.tap('[data-logset]');await pause(page,900);
  await page.tap('[data-unlog="0"]');await pause(page);eq(await ev(page,"S.active.entries[0].sets.length"),0,"removed");
  await page.tap('.toast-undo');await pause(page);eq(await ev(page,"S.active.entries[0].sets.length"),1,"restored");
},{prefs:{autorest:false}});
await test("replacing an exercise keeps its logged sets",async page=>{
  await startWorkout(page);await page.fill('#in_r','8');await page.tap('[data-logset]');await pause(page,900);
  const name=await ev(page,"S.active.entries[0].name");
  await page.tap('[data-swap]');await pause(page,500);await page.tap('#sheet [data-pickex]');await pause(page);
  eq(await ev(page,"[S.active.entries[0].name,S.active.entries[0].sets.length]"),[name,1]);
},{prefs:{autorest:false}});
await test("invalid set values are rejected",async page=>{
  await startWorkout(page);
  for(const [w,r] of [["-20","5"],["99999","8"],["60","1000"],["60","0"]]){
    await page.fill('#in_w',w);await page.fill('#in_r',r);await page.tap('[data-logset]');await pause(page,800);}
  eq(await ev(page,"S.active.entries[0].sets.length"),0);
},{prefs:{autorest:false}});
await test("RPE is stored only when entered",async page=>{
  await startWorkout(page);await page.fill('#in_r','8');await page.tap('[data-logset]');await pause(page,900);
  eq(await ev(page,"'rpe' in S.active.entries[0].sets[0]"),false);
},{prefs:{autorest:false,rpe:"every"}});
await test("reload keeps the exercise and the running rest",async page=>{
  await startWorkout(page);await page.tap('[data-nextex]');await pause(page);await page.tap('[data-nextex]');await pause(page);
  await page.fill('#in_r','8');await page.tap('[data-logset]');await pause(page);
  await page.reload();await pause(page,1200);
  eq(await ev(page,"[V.logIdx,V.restEnd>Date.now(),V.tab]"),[2,true,"train"]);
});
await test("finishing early asks first; nothing logged asks to discard",async page=>{
  await startWorkout(page);await page.tap('[data-sessmore]');await pause(page);await page.tap('#sheet [data-finish]');await pause(page);
  eq(await ev(page,"[V.sheet,!!S.active]"),["confirm",true]);
},{prefs:{autorest:false}});
await test("a corrupted save is kept aside, not overwritten",async page=>{
  const keys=await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.indexOf(":corrupt:")>0).length);
  eq(keys,1);
},{raw:'{"v":2,"onboarded":true,"profile":{"age":30'});
await test("a partial save does not crash rendering",async page=>{
  for(const tab of ["food","progress","train","profile","home"]){await page.tap('nav [data-tab="'+tab+'"]');await pause(page,200);}
},{raw:JSON.stringify({v:2,onboarded:true,prefs:{sound:false,splash:false},sessions:[],body:[]})});
await test("another open copy saving does not wipe an active workout",async (page,env)=>{
  const b=await env.ctx.newPage();await b.goto(URL_);await b.waitForTimeout(1000);
  await startWorkout(page);await page.fill('#in_r','8');await page.tap('[data-logset]');await pause(page);
  await b.evaluate(async()=>{const s=await import("/js/state.js");s.S.goals.water=2500;s.saveDB();});
  await page.reload();await pause(page,1200);
  eq(await ev(page,"!!S.active"),true);
},{prefs:{autorest:false}});
await test("plan generator keeps timed holds timed and strength on the main lift",async page=>{
  const r=await page.evaluate(async()=>{const s=(await import("/js/state.js")).S;const P=await import("/js/engine/plan.js");
    Object.assign(s.profile,{level:"advanced",goal:"strength",days:6});s.gear=null;const plan=P.buildPlan();
    const day=plan.days[0];return [day.ex[0].lo,day.ex[0].hi,day.ex[1].lo];});
  if(!(r[0]<=5&&r[1]<=6&&r[2]>=6))throw new Error("main "+r[0]+"-"+r[1]+", second "+r[2]);
  const pl=await page.evaluate(async()=>{const s=(await import("/js/state.js")).S;const P=await import("/js/engine/plan.js");
    Object.assign(s.profile,{level:"new",goal:"lose",days:3});const plan=P.buildPlan();
    const p=plan.days.flatMap(d=>d.ex).filter(e=>e.name==="Plank")[0];return p?[p.lo,p.hi]:null;});
  if(pl&&pl[0]<30)throw new Error("plank "+pl);
});
await test("a rest day follows a full-body session",async page=>{
  const r=await page.evaluate(async()=>{const s=await import("/js/state.js");const T=await import("/js/ui/views/train.js");
    const P=(await import("/js/data/splits.js")).PRESETS().filter(p=>p.id==="fb")[0];s.S.myPlan=s.adoptSplit(P);
    const a=s.split().days[0];s.S.sessions.unshift({id:"t",date:(await import("/js/util.js")).today(),dayId:a.id,dayName:a.name,entries:[]});
    const d=new Date();d.setDate(d.getDate()+1);const tom=new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);
    return T.planOn(s.split(),tom).rest;});
  eq(r,true);
});

console.log("\n"+passes+" passed, "+fails+" failed");
await browser.close();
process.exit(fails);

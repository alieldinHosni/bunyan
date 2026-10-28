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
import fs from "fs";
const require=createRequire(process.env.PW_PATH||import.meta.url);
const {chromium}=require("playwright");

const URL_=process.env.BUNYAN_URL||"http://localhost:8765/index.html";
const iso=d=>{const x=new Date(Date.now()-d*864e5);return new Date(x-x.getTimezoneOffset()*6e4).toISOString().slice(0,10);};

function seed(){
  const lifts=[["Barbell Bench Press - Medium Grip","Chest"],["Barbell Squat","Quads"],["Pullups","Back"]];
  const sessions=[];
  for(let d=2;d<40;d+=3)sessions.push({id:"s"+d,date:iso(d),dayName:"Seed",activeMs:45*6e4,
    entries:lifts.map(([n,m],i)=>({name:n,muscle:m,sets:[1,2,3].map(()=>({w:60+i*20,r:8,rpe:8}))}))});
  return {v:2,onboarded:true,prefs:{rpe:"last",autorest:true,sound:false,awake:false,splash:false,unit:"kg",lang:"en",anim:false,haptic:false,view:"set",warn:10,
      /* The warm-up is its own screen before the first exercise; the tests about it
         turn it back on. */
      nowarm:true},
    profile:{age:30,height:180,weight:84,sex:"m",activity:1.4,goal:"gain",prog:"standard",level:"some",days:3},
    goals:{kcal:2500,p:150,c:300,f:70,water:3000,steps:9000},sessions,body:[{date:iso(3),weight:84}],days:{},
    myFoods:[],savedMeals:[],freq:{},favs:[],skip:[],userSplits:[],myEx:[]};
}

const browser=await chromium.launch(process.env.CHROMIUM?{executablePath:process.env.CHROMIUM}:{});
let fails=0,passes=0;
async function open(o={}){
  const ctx=await browser.newContext(Object.assign({viewport:{width:390,height:844},hasTouch:true,isMobile:true,serviceWorkers:o.sw?"allow":"block"},
    o.ua?{userAgent:o.ua}:{}));
  const db=o.db||seed();if(o.prefs)Object.assign(db.prefs,o.prefs);
  await ctx.addInitScript(([db,raw])=>{if(!localStorage.getItem("t:seeded")){
    localStorage.setItem("bunyan:profiles",JSON.stringify([{id:"me",name:"Me",owner:true}]));
    localStorage.setItem("bunyan:current",'"me"');
    localStorage.setItem("bunyan:db:me",raw!=null?raw:JSON.stringify(db));localStorage.setItem("t:seeded","1");}},[db,o.raw==null?null:o.raw]);
  if(o.blockIDB)await ctx.addInitScript(()=>{try{Object.defineProperty(window,"indexedDB",{get(){return {open(){throw new Error("blocked");}};}});}catch(e){}});
  if(o.init)await ctx.addInitScript(o.init);
  /* The page guides (js/ui/tour.js) would cover what each test taps; the guide's own
     test turns them back on. */
  if(!o.tour)await ctx.addInitScript(()=>{try{localStorage.setItem("bunyan:notour","1");}catch(e){}});
  const page=await ctx.newPage();const errs=[];
  page.on("pageerror",e=>errs.push(e.message));
  await page.goto(URL_);await page.waitForTimeout(1000);
  return {ctx,page,errs};
}
const ev=(page,expr)=>page.evaluate(async e=>{const S=(await import("/js/state.js")).S;const V=(await import("/js/ui/view.js")).V;return eval(e);},expr);
const pause=(page,ms=300)=>page.waitForTimeout(ms);
/* The dock as a thumb taps it. page.tap first scrolls its target into view, and for a
   fixed bar that can scroll the page — which, since the dock moves out of the way of
   scrolling, takes the target away mid-tap. A finger scrolls nothing. */
async function tapTab(page,tab){
  /* Profile is not on the dock: it opens from the person at the top right of Training. */
  if(tab==="profile"){await tapTab(page,"train");await page.waitForTimeout(150);await page.evaluate(()=>window.scrollTo(0,0));
    await page.tap('.hacts .havatar');await page.waitForTimeout(60);return;}
  /* Scrolling down puts the dock away (nav.dhid): as a thumb would, scroll up a little
     to bring it back before tapping it. */
  if(await page.evaluate(()=>document.getElementById("nav").classList.contains("dhid"))){
    await page.evaluate(()=>window.scrollBy(0,-40));await page.waitForTimeout(450);}
  const b=await (await page.$('nav [data-tab="'+tab+'"]')).boundingBox();
  if(!b||b.y>=page.viewportSize().height)throw new Error("the dock is out of view");
  await page.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);await page.waitForTimeout(60);}
/* Coach, at a section ("train", "food", "ai") and the view inside it. */
async function coach(page,sec,sub){
  await tapTab(page,"coach");await page.waitForTimeout(200);
  if(sec){await page.tap('[data-csec="'+sec+'"]');await page.waitForTimeout(200);}
  if(sub){await page.tap('[data-'+(sec==="train"?"ctsub":"cfsub")+'="'+sub+'"]');await page.waitForTimeout(250);}}
/* The conversation opens from the floating Coach only. With q, that question is asked. */
async function openChat(page,q){
  await coach(page);await page.tap('#cfab .cfab');await page.waitForTimeout(400);
  if(q){await page.evaluate(async q=>{const c=await import("/js/ui/views/chat.js");document.getElementById("chatq").value=(await import("/js/i18n/dict.js")).t(c.ASK[q]);},q);
    await page.press('#chatq','Enter');await page.waitForTimeout(400);}}
async function startWorkout(page){await tapTab(page,"train");await pause(page);await page.tap('[data-startday]');await pause(page,400);}
/* The live workout has no dock: its ✕ and Save and exit are the way to the other tabs,
   and the session carries on (Resume card on Train, the workout bar elsewhere). */
/* Finishing before the last exercise: the close button's Finish workout (owner, 27 Oct). */
async function finishEarly(page){await page.tap('[data-back]');await pause(page);await page.tap('#sheet [data-confirmmid]');await pause(page);}
async function leaveWorkout(page){await page.tap('[data-back]');await pause(page);await page.tap('[data-confirmok]');await pause(page,400);}
/* ONLY=<text> runs just the tests whose names contain it; ONLY=<a>|<b> runs either. */
const ONLY=(process.env.ONLY||"").split("|").filter(Boolean);
async function test(name,fn,o){
  if(ONLY.length&&!ONLY.some(x=>name.indexOf(x)>=0))return;
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
await test("replacing an exercise with a logged set asks; Keep keeps it, with the new one next",async page=>{
  await startWorkout(page);await page.fill('#in_r','8');await page.tap('[data-logset]');await pause(page,900);
  const name=await ev(page,"S.active.entries[0].name"),n=await ev(page,"S.active.entries.length");
  await page.tap('[data-swap]');await pause(page,500);
  const pick=await page.$eval('#sheet [data-pickex]',e=>e.getAttribute("data-pickex"));
  await page.tap('#sheet [data-pickex]');await pause(page);
  if(!(await page.$('#sheet .cf-alt.bad')))throw new Error("no keep-or-delete choice");
  await page.tap('#sheet [data-confirmok]');await pause(page);
  eq(await ev(page,"[S.active.entries.length,S.active.entries[0].name,S.active.entries[0].sets.length,S.active.entries[1].name,V.logIdx]"),[n+1,name,1,pick,1]);
},{prefs:{autorest:false}});
await test("…or replaces it in place and deletes the set, keeping the plan as it was",async page=>{
  await startWorkout(page);await page.fill('#in_r','8');await page.tap('[data-logset]');await pause(page,900);
  const n=await ev(page,"S.active.entries.length"),plan=await ev(page,"JSON.stringify(S.active.splitId)");
  await page.tap('[data-swap]');await pause(page,500);
  const pick=await page.$eval('#sheet [data-pickex]',e=>e.getAttribute("data-pickex"));
  await page.tap('#sheet [data-pickex]');await pause(page);await page.tap('#sheet [data-confirmalt]');await pause(page);
  eq(await ev(page,"[S.active.entries.length,S.active.entries[0].name,S.active.entries[0].sets.length,V.logIdx,!!V.sheet]"),[n,pick,0,0,false]);
},{prefs:{autorest:false}});
await test("an exercise leaves today's workout at once with Undo, or after asking when it has sets; the program keeps it",async page=>{
  await startWorkout(page);
  const before=await ev(page,"S.active.entries.map(e=>e.name)");
  const planned=await page.evaluate(async()=>{const m=await import("/js/state.js");return m.dayOf(m.S.active.dayId).ex.length;});
  const rm=async()=>{await page.tap('[data-sessmore]');await pause(page);await page.tap('#sheet [data-rmlive]');await pause(page);};
  await rm();
  eq(await ev(page,"S.active.entries.map(e=>e.name)"),before.slice(1),"removed at once");
  await page.tap('.toast-undo');await pause(page);
  eq(await ev(page,"S.active.entries.map(e=>e.name)"),before,"Undo puts it back");
  await page.fill('#in_r','8');await page.tap('[data-logset]');await pause(page,900);
  await rm();
  if(!(await page.$('#sheet .cf.bad')))throw new Error("no red confirm for an exercise with sets");
  await page.tap('#sheet [data-confirmok]');await pause(page);
  eq(await ev(page,"[S.active.entries.length,S.active.entries[0].name,V.logIdx]"),[before.length-1,before[1],0],"removed with its set");
  eq(await page.evaluate(async()=>{const m=await import("/js/state.js");return m.dayOf(m.S.active.dayId).ex.length;}),planned,"the program is untouched");
  /* The last one standing cannot be removed: that is Discard. */
  for(let i=0;i<before.length-2;i++)await rm();
  eq(await ev(page,"S.active.entries.length"),1);
  await page.tap('[data-sessmore]');await pause(page);
  if(await page.$('[data-rmlive]'))throw new Error("Remove offered on the only exercise left");
},{prefs:{autorest:false}});
await test("an exercise can be added to today's workout, at the end, with Undo",async page=>{
  await startWorkout(page);
  const n=await ev(page,"S.active.entries.length");
  await page.tap('[data-addlive]');await pause(page,500);
  eq(await page.$eval('#sheet h2',e=>e.textContent),"Add exercise");
  const pick=await page.$eval('#sheet [data-pickex]',e=>e.getAttribute("data-pickex"));
  await page.tap('#sheet [data-pickex]');await pause(page);
  eq(await ev(page,"[S.active.entries.length,S.active.entries[S.active.entries.length-1].name,S.active.entries[S.active.entries.length-1].planned.sets,V.logIdx,!!V.sheet]"),[n+1,pick,3,0,false]);
  await page.tap('.toast-undo');await pause(page);
  eq(await ev(page,"S.active.entries.length"),n,"Undo takes it out");
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
  await startWorkout(page);await finishEarly(page);
  eq(await ev(page,"[V.sheet,!!S.active]"),["confirm",true]);
},{prefs:{autorest:false}});
await test("a corrupted save is kept aside, not overwritten",async page=>{
  const keys=await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.indexOf(":corrupt:")>0).length);
  eq(keys,1);
},{raw:'{"v":2,"onboarded":true,"profile":{"age":30'});
await test("a partial save does not crash rendering",async page=>{
  for(const tab of ["food","progress","train","profile","coach"]){await tapTab(page,tab);await pause(page,200);}
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
  const r=await page.evaluate(async()=>{const s=await import("/js/state.js");const T=await import("/js/engine/dayplan.js");
    const P=(await import("/js/data/splits.js")).PRESETS().filter(p=>p.id==="fb")[0];s.addProgram(s.makeProgram(P),true);
    const a=s.split().days[0];s.S.sessions.unshift({id:"t",date:(await import("/js/util.js")).today(),dayId:a.id,dayName:a.name,entries:[]});
    const d=new Date();d.setDate(d.getDate()+1);const tom=new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);
    return T.planOn(s.split(),tom).rest;});
  eq(r,true);
});

await test("tab taps do not grow the browser history",async page=>{
  const h0=await page.evaluate(()=>history.length);
  for(let i=0;i<10;i++){await coach(page,"train","exercises");await page.tap('[data-train="library"]');await tapTab(page,"train");}
  await pause(page,500);
  const h1=await page.evaluate(()=>history.length);
  if(h1-h0>2)throw new Error("grew by "+(h1-h0));
  await page.evaluate(()=>history.back());await pause(page,400);
  eq(await page.evaluate(()=>location.pathname),"/index.html","still in the app");
});
await test("new workout entries carry a stable exercise id, and ids heal renamed names",async page=>{
  await startWorkout(page);
  const id=await ev(page,"S.active.entries[0].exId");
  if(!id)throw new Error("no exId");
  const healed=await page.evaluate(async()=>{const ex=await import("/js/data/exercises.js");const s=await import("/js/state.js");
    const e=s.S.active.entries[0],orig=e.name;e.name="Renamed";ex.reconcileExercises(s.S);return e.name===orig;});
  eq(healed,true);
});
await test("readiness, pain flag and session effort are kept with the workout",async page=>{
  await startWorkout(page);
  await page.tap('[data-ready="4"]');await pause(page);
  await page.tap('[data-sessmore]');await pause(page);await page.tap('#sheet [data-hurt]');await pause(page);await page.tap('[data-hurtdo="skip"]');await pause(page);
  await page.fill('#in_r','8');await page.tap('[data-logset]');await pause(page,900);
  await finishEarly(page);
  await page.tap('[data-confirmok]');await pause(page,600);
  await page.tap('[data-srpe="7"]');await pause(page);
  eq(await ev(page,"[S.sessions[0].ready,S.sessions[0].srpe,S.sessions[0].entries.some(e=>e.pain)]"),[4,7,true]);
},{prefs:{autorest:false}});
await test("an activity logs pace inputs and heart rate",async page=>{
  await tapTab(page,"train");await pause(page);
  await page.tap('[data-actsheet]');await pause(page);await page.tap('#sheet [data-quickact="Running"]');await pause(page,500);
  await page.tap('#sheet [data-confirmalt]');await pause(page,500);
  await page.fill('#in_min','30');await page.fill('#in_km','6');await page.fill('#in_hr','150');
  await page.evaluate(()=>document.activeElement.blur());
  await page.$eval('[data-logact]',e=>e.scrollIntoView({block:"center"}));
  await page.$eval('[data-logact]',e=>e.click());await pause(page);
  eq(await ev(page,"[S.active.entries[0].sets[0].min,S.active.entries[0].sets[0].km,S.active.entries[0].sets[0].hr]"),[30,6,150]);
  if(!/5:00 \/km/.test(await page.$eval('.act-row',e=>e.innerText)))throw new Error("pace not shown");
});

/* ---- the day builder and the picker ---------------------------------------------- */
async function openDay(page){
  await coach(page,"train","program");
  await page.tap('.drows [data-day]');await pause(page,400);}
const dayNames=page=>page.$$eval(".drow .drow-n",a=>a.map(x=>x.textContent));
await test("day builder: ✕ removes with undo, Reorder shows the grips, the grip drags, arrow keys move",async page=>{
  await openDay(page);
  const n0=await dayNames(page);if(n0.length<3)throw new Error("seed day too short");
  await page.tap(".drow:nth-child(2) .drm");await pause(page);
  eq((await dayNames(page)).length,n0.length-1,"removed");
  await page.tap(".toast-undo");await pause(page);
  eq(await dayNames(page),n0,"undo restores order");
  /* No grip until Reorder is on: a scroll that starts on a row cannot move it. */
  eq(await page.$$eval(".dgrip",a=>a.length),0,"no grips before Reorder");
  await page.tap("[data-reorder]");await pause(page);
  eq(await page.$$eval(".dgrip",a=>a.length),n0.length,"Reorder shows a grip per row");
  eq(await page.$eval(".drows .drm",e=>getComputedStyle(e).display),"none","the ✕s step aside");
  const g=await (await page.$(".drow:nth-child(1) .dgrip")).boundingBox(),r3=await (await page.$(".drow:nth-child(3)")).boundingBox();
  await page.mouse.move(g.x+g.width/2,g.y+g.height/2);await page.mouse.down();
  for(let i=1;i<=8;i++){await page.mouse.move(g.x+g.width/2,g.y+g.height/2+(r3.y+r3.height/2+6-(g.y+g.height/2))*i/8);await pause(page,20);}
  await page.mouse.up();await pause(page);
  eq((await dayNames(page))[2],n0[0],"dragged to third");
  await page.focus(".drow:nth-child(3) .dgrip");await page.keyboard.press("ArrowUp");await pause(page);
  eq((await dayNames(page))[1],n0[0],"arrow key moved it up");
  await page.tap("[data-reorder]");await pause(page);
  eq(await page.$$eval(".dgrip",a=>a.length),0,"Done puts the grips away");
});
await test("exercise sheet: steppers apply at once and keep the range in order",async page=>{
  await openDay(page);
  await page.tap(".drow:nth-child(1) .dmain");await pause(page);
  const id=await ev(page,"V.sd.id");
  const get=k=>ev(page,"(function(){var d=S.programs.flatMap(p=>p.days).find(x=>x.id===V.dayId);return d.ex.find(e=>e.id==='"+id+"')."+k+"})()");
  const s0=await get("sets");
  await page.tap('[data-exstp="sets"][data-d="1"]');await pause(page,150);
  eq(await get("sets"),s0+1,"sets +1 saved without Done");
  await page.fill("#e_hi","5");await page.$eval("#e_hi",e=>e.dispatchEvent(new Event("change",{bubbles:true})));await pause(page);
  const lo=await get("lo"),hi=await get("hi");
  if(lo>hi)throw new Error("range inverted "+lo+"–"+hi);
  await page.tap('[data-exincr="1"]');await pause(page,150);
  if(!(await ev(page,"Object.keys(S.incr).length")))throw new Error("weight step not stored");
});
await test("picker: picking an exercise adds it and returns to the day",async page=>{
  await openDay(page);
  const n0=(await dayNames(page)).length;
  await page.tap(".dadd");await pause(page,400);
  eq(await page.evaluate(()=>document.activeElement&&document.activeElement.id==="exq"),false,"no keyboard on open");
  await page.tap(".pkrow >> nth=0");await pause(page,400);
  eq(await ev(page,"V.sheet"),null,"back on the day");
  eq((await dayNames(page)).length,n0+1,"added");
});
await test("split builder: build from scratch, set days, fill one, adopt, and it stays saved",async page=>{
  await coach(page,"train","programs");
  await page.tap('[data-newsplit]');await pause(page);await page.fill('#askv','Test split');await page.tap('[data-askok]');await pause(page,400);
  eq(await ev(page,"V.train"),"builder","opens the builder");
  await page.tap('[data-bdays="4"]');await pause(page);
  eq(await page.$$eval(".drow",a=>a.length),4,"four days");
  await page.tap('.drow:nth-child(1) .dmain');await pause(page);
  await page.tap('.dadd');await pause(page,400);await page.tap('.pkrow >> nth=0');await pause(page,400);
  await page.evaluate(()=>history.back());await pause(page,500);
  eq(await ev(page,"V.train"),"builder","back to the builder");
  await page.tap('.drow:nth-child(4) .drm');await pause(page);
  eq(await page.$$eval(".drow",a=>a.length),3,"a day removed");
  await page.tap('[data-adopt]');await pause(page);await page.tap('[data-confirmok]');await pause(page,400);
  eq(await ev(page,"(function(){var u=S.programs.find(x=>x.name==='Test split');return [S.activeProgram===u.id,u.days.length,u.days[0].ex.length]})()"),[true,3,1],"active, one copy");
  await coach(page,"train","programs");
  if(await page.$('.card.tdays [data-delsplit]'))throw new Error("a template can be deleted");
  eq(await page.$$eval("[data-delsplit]",a=>a.length),1,"the active program has no ✕");
  await page.evaluate(async()=>{const s=await import("/js/state.js");const {render}=await import("/js/ui/render.js");s.S.activeProgram=s.S.programs.find(x=>x.name!=="Test split").id;s.saveDB();render();});await pause(page);
  await page.tap('.drow:has-text("Test split") [data-delsplit]');await pause(page);await page.tap('[data-confirmok]');await pause(page);
  eq(await ev(page,"S.programs.some(x=>x.name==='Test split')"),false,"deleted after confirming");
});
await test("picker: search finds by muscle, and no row ever sits above the field",async page=>{
  await openDay(page);await page.tap(".dadd");await pause(page,400);
  await page.fill("#exq","biceps");await pause(page,500);
  const muscles=await page.$$eval(".pkrow .trow-s",a=>a.slice(0,5).map(x=>x.textContent));
  if(!muscles.length||!muscles.every(m=>/Biceps/.test(m)))throw new Error("muscle search: "+muscles.join(" / "));
  await page.fill("#exq","");await pause(page,400);
  await page.$eval(".srch-body",e=>e.scrollTop=900);await pause(page);
  const bad=await page.evaluate(()=>{const top=document.querySelector(".srch-body").getBoundingClientRect().top;
    return [...document.querySelectorAll(".srch-body .pkrow")].filter(r=>{const b=r.getBoundingClientRect();return b.bottom>0&&b.top<top-1&&getComputedStyle(r).visibility!=="hidden"&&document.elementFromPoint(b.left+10,Math.max(b.top+2,1))===r;}).length;});
  eq(bad,0,"rows visible above the list");
});

/* ---- coaching --------------------------------------------------------------------- */
const F=(page,fn)=>page.evaluate(async src=>{const F=await import("/js/engine/formulas.js");const {S}=await import("/js/state.js");
  const mk=(d,name,sets)=>({id:"x"+d+name,date:d,dayId:"x",entries:[{name,sets}]});return eval(src);},fn);
await test("missing the range twice holds the weight; a third miss suggests about 10% lighter",async page=>{
  const r=await F(page,`(S.sessions=[mk("2099-01-05","Barbell Squat",[{w:100,r:6},{w:100,r:5}]),mk("2099-01-02","Barbell Squat",[{w:100,r:7}])],
    F.recommend({name:"Barbell Squat",planned:{sets:3,lo:8,hi:10}}).w)`);
  eq(r,100,"twice: hold");
  const r3=await F(page,`(S.sessions=[mk("2099-01-08","Barbell Squat",[{w:100,r:6}]),mk("2099-01-05","Barbell Squat",[{w:100,r:6},{w:100,r:5}]),mk("2099-01-02","Barbell Squat",[{w:100,r:7}])],
    F.recommend({name:"Barbell Squat",planned:{sets:3,lo:8,hi:10}}).w)`);
  eq(r3,90,"three times: lighter");
});
await test("records: weight, estimated max and reps count; the first time does not",async page=>{
  const r=await F(page,`(S.sessions=[mk("2099-01-01","Barbell Bench Press",[{w:80,r:5},{w:70,r:8}])],
    [F.recordOf("Barbell Bench Press",{w:82.5,r:3},[]).k,F.recordOf("Barbell Bench Press",{w:80,r:7},[]).k,
     F.recordOf("Barbell Bench Press",{w:70,r:9},[]).k,F.recordOf("Barbell Bench Press",{w:70,r:8},[]),F.recordOf("Leg Press",{w:200,r:10},[])])`);
  eq(r,["w","e","r",null,null]);
});
await test("a lighter week cuts planned sets and suggested load, and ends",async page=>{
  await page.evaluate(async()=>{const s=await import("/js/state.js");s.S.deload={until:"2099-01-01",last:"2026-01-01"};s.saveDB();});
  await startWorkout(page);
  const cut=await ev(page,"S.active.entries.map(e=>e.planned.sets)");
  const plan=await ev(page,"(function(){var sp=S.programs.find(p=>p.id===S.activeProgram);var d=sp.days.find(x=>x.id===S.active.dayId);return d.ex.map(e=>e.sets)})()");
  if(!cut.every((n,i)=>n<plan[i]||n===1))throw new Error("sets not cut: "+cut+" vs "+plan);
  if(!/Lighter week/.test(await page.textContent(".wexl-s")))throw new Error("no lighter-week mark on the set line");
});
await test("weight steps: own step wins; dumbbell totals double the step",async page=>{
  const r=await F(page,`(function(){var a=F.incrementFor("Dumbbell Bench Press",30);S.prefs.dbLoad="total";var b=F.incrementFor("Dumbbell Bench Press",60);
    S.prefs.dbLoad="hand";S.incr={"Dumbbell Bench Press":1};var c=F.incrementFor("Dumbbell Bench Press",30);S.incr={};return [a,b,c];})()`);
  eq(r,[2,4,1]);
});
await test("weight trend against a fat-loss goal says when it is too slow",async page=>{
  const r=await page.evaluate(async()=>{const st=await import("/js/engine/stats.js");const {S}=await import("/js/state.js");
    const d=n=>{const x=new Date(Date.now()-n*864e5);return new Date(x-x.getTimezoneOffset()*6e4).toISOString().slice(0,10);};
    S.profile.goal="lose";S.body=[0,5,10,15,20,25].map((n,i)=>({date:d(25-n),weight:90-i*0.02}));
    const tr=st.weightTrend();return [tr.status,tr.lo<0&&tr.hi<0];});
  eq(r,["slow",true]);
});
await test("a suggested set is marked, and logged untouched it says so",async page=>{
  await startWorkout(page);
  if(!(await page.$eval("#in_w",e=>e.classList.contains("sg"))))throw new Error("not marked");
  await page.tap('[data-logset]');await pause(page,900);
  eq(await ev(page,"S.active.entries[0].sets[0].sg"),1);
  await page.fill('#in_r','9');
  if(await page.$eval("#in_r",e=>e.classList.contains("sg")))throw new Error("still marked after typing");
},{prefs:{autorest:false}});
await test("intervals are kept on a cardio bout",async page=>{
  await tapTab(page,"train");await pause(page);
  await page.tap('[data-actsheet]');await pause(page);await page.tap('#sheet [data-quickact="Running"]');await pause(page,500);
  await page.tap('#sheet [data-confirmalt]');await pause(page,500);
  await page.$eval('[data-activ]',e=>e.click());await pause(page);
  await page.fill('#in_ivn','8');await page.fill('#in_ivon','30');await page.fill('#in_ivoff','90');
  await page.evaluate(()=>document.activeElement.blur());
  await page.$eval('[data-logact]',e=>e.click());await pause(page);
  eq(await ev(page,"S.active.entries[0].sets[0].iv"),{n:8,on:30,off:90});
});
await test("rest controls: pause, resume and +30 survive a reload",async page=>{
  await startWorkout(page);await page.fill('#in_r','8');await page.tap('[data-logset]');await pause(page,900);
  await page.tap('[data-rest="pause"]');await pause(page);
  eq(await ev(page,"!!(S.active.rest&&S.active.rest.paused)"),true,"paused saved");
  await page.tap('[data-rest="resume"]');await pause(page);await page.tap('[data-rest="30"]');await pause(page);
  const left=await ev(page,"Math.round((V.restEnd-Date.now())/1000)");
  await page.reload();await pause(page,1200);
  const after=await ev(page,"Math.round((V.restEnd-Date.now())/1000)");
  if(!(after>0&&Math.abs(after-left)<6))throw new Error("rest "+left+" → "+after);
});
await test("stored history that will not open is reported, not shown as empty",async page=>{
  if(!(await page.$(".warnbar")))throw new Error("no warning");
},{raw:(()=>{const d=seed();delete d.sessions;d.histIDB=true;return JSON.stringify(d);})(),blockIDB:true});

/* ---- programs and weekday scheduling ---------------------------------------------- */
await test("migration: the active copy and a duplicate saved split become one program, ids kept",async page=>{
  eq(await ev(page,"[S.programs.length,!!S.programs.find(p=>p.id===S.activeProgram),S.myPlan===undefined]"),[1,true,true],"seed");
  const r=await page.evaluate(async()=>{const s=await import("/js/state.js");
    const S=s.S;delete S.programs;delete S.activeProgram;
    S.userSplits=[{id:"joe",name:"Joe",custom:true,days:[{id:"j1",name:"Day 1",ex:[]}]},{id:"x2",name:"Other",custom:true,days:[{id:"o1",name:"A",ex:[]}]}];
    S.myPlan={id:"mine",source:"joe",name:"Joe",days:[{id:"k1",name:"Push",ex:[{id:"e",name:"Plank",sets:3,lo:30,hi:45,rest:45}]},{id:"k2",name:"Pull",ex:[]}]};
    s.migrate();
    const a=S.programs.find(p=>p.id===S.activeProgram);
    return [S.programs.length,a.id,a.name,a.days.map(d=>d.id).join(),a.schedule,S.myPlan===undefined&&S.userSplits===undefined];});
  eq(r,[2,"joe","Joe","k1,k2","cycle",true]);
});
await test("by weekday: pinned days fall on their weekdays, others are rest, and a pin moves",async page=>{
  const r=await page.evaluate(async()=>{const s=await import("/js/state.js");const T=await import("/js/engine/dayplan.js");const Sc=await import("/js/engine/schedule.js");
    const sp=s.split();sp.schedule="week";const tr=sp.days.filter(d=>d.ex.length);tr.forEach(d=>d.wd=[]);tr[0].wd=[2];tr[1].wd=[5];
    const d=new Date();const iso=n=>{const x=new Date(d.getFullYear(),d.getMonth(),d.getDate()+n);return new Date(x-x.getTimezoneOffset()*6e4).toISOString().slice(0,10);};
    let tue=null,wed=null;for(let k=0;k<7;k++){const w=Sc.isoWeekday(iso(k));if(w===2)tue=iso(k);if(w===3)wed=iso(k);}
    const a=T.planOn(sp,tue),b=T.planOn(sp,wed);
    return [a.day&&a.day.id===tr[0].id,b.rest,b.next&&b.next.id===tr[1].id];});
  eq(r,[true,true,true]);
});
await test("templates: Use it now makes an active copy; Just add it keeps the current one",async page=>{
  await tapTab(page,"train");await pause(page);
  const act0=await ev(page,"S.activeProgram");
  await page.evaluate(async()=>{const {V}=await import("/js/ui/view.js");const {render}=await import("/js/ui/render.js");V.tab="coach";V.train="preview";V.previewId="ppl";render();});await pause(page);
  await page.tap('[data-adopt]');await pause(page);await page.tap('[data-confirmalt]');await pause(page,400);
  eq(await ev(page,"[S.activeProgram,S.programs.filter(p=>p.from==='ppl').length,V.train]"),[act0,1,"builder"],"added, not active");
  await page.evaluate(async()=>{const {V}=await import("/js/ui/view.js");const {render}=await import("/js/ui/render.js");V.tab="coach";V.train="preview";V.previewId="ul";render();});await pause(page);
  await page.tap('[data-adopt]');await pause(page);await page.tap('[data-confirmok]');await pause(page,400);
  eq(await ev(page,"S.programs.find(p=>p.id===S.activeProgram).from"),"ul","active copy of the template");
});
await test("builder: switching to weekdays pins the days, and a weekday chip adds a pin, shared with a day that has it (two sessions that day)",async page=>{
  await page.evaluate(async()=>{const {V}=await import("/js/ui/view.js");const {render}=await import("/js/ui/render.js");const s=await import("/js/state.js");
    V.tab="coach";V.train="builder";V.previewId=s.S.activeProgram;render();});await pause(page);
  await page.tap('[data-sched="week"]');await pause(page);
  const pinned=await ev(page,"S.programs.find(p=>p.id===S.activeProgram).days.filter(d=>d.ex.length).every(d=>d.wd.length===1)");
  eq(pinned,true,"each training day pinned");
  const first=await page.$eval('.bkday .bwd button.taken',b=>b.getAttribute("data-wd"));
  const [id,n]=first.split("|");
  const owners=await ev(page,"(function(){var p=S.programs.find(p=>p.id===S.activeProgram);return p.days.filter(d=>d.wd.indexOf("+n+")>=0).map(d=>d.id)})()");
  await page.tap('[data-wd="'+first+'"]');await pause(page);
  const now=await ev(page,"(function(){var p=S.programs.find(p=>p.id===S.activeProgram);return p.days.filter(d=>d.wd.indexOf("+n+")>=0).map(d=>d.id)})()");
  eq([now.includes(id),owners.every(o=>now.includes(o)),now.length],[true,true,owners.length+1],"the day it was on keeps it; this day has it too");
  if(!(await page.$('.bwd button.on.two')))throw new Error("a shared weekday is not marked");
  await page.tap('[data-wd="'+first+'"]');await pause(page);
  eq(await ev(page,"(function(){var p=S.programs.find(p=>p.id===S.activeProgram);return p.days.filter(d=>d.wd.indexOf("+n+")>=0).map(d=>d.id)})()"),owners,"tapped again: taken off this day only");
});
await test("a rotation program is offered weekdays once, where the program is planned",async page=>{
  await coach(page,"train","program");
  if(!(await page.$('[data-wdoffer]')))throw new Error("no offer");
  await page.tap('[data-wdoffer="no"]');await pause(page);
  eq(await ev(page,"[!!S.wdOffered,S.programs.find(p=>p.id===S.activeProgram).schedule]"),[true,"cycle"]);
  if(await page.$('[data-wdoffer]'))throw new Error("offered twice");
});

await test("library and food data: every template exercise exists, extras load, Egyptian foods are found",async page=>{
  await pause(page,800);
  const r=await page.evaluate(async()=>{const X=await import("/js/data/exercises.js");const P=(await import("/js/data/splits.js")).PRESETS();const A=await import("/js/data/activities.js");
    const N=await import("/js/engine/nutrition.js");await new Promise(r=>N.loadFoods?N.loadFoods(r):r());
    const miss=[];P.forEach(p=>p.days.forEach(d=>d.ex.forEach(e=>{if(!X.EXDB[e.name]&&!A.isActivity(e.name))miss.push(e.name);})));
    return [miss,!!X.EXDB["Bulgarian Split Squat"],X.exImg("Bulgarian Split Squat",0),N.searchFoods("كشك",1).map(x=>x.f.id)[0],N.searchFoods("jalash",1).length>0];});
  eq(r,[[],true,null,"kishk",true]);
});
await test("library growth: plyometrics, holds, drills and stretches load; kinds and other names find them; new foods are found",async page=>{
  await pause(page,800);
  const r=await page.evaluate(async()=>{const X=await import("/js/data/exercises.js");await new Promise(r=>X.loadExDB(r));
    const N=await import("/js/engine/nutrition.js");await new Promise(r=>N.loadFoods?N.loadFoods(r):r());
    const T=(await import("/js/engine/text.js")).tokenMatch,H=(await import("/js/ui/views/train.js")).exHay;
    const find=q=>X.LIB.filter(l=>T(q,H(l))).map(l=>l[0]);
    const SP=await import("/js/engine/splitparse.js");
    const have=["Pogo Hops","Dead Hang","Spanish Squat Hold","Front-to-Back Leg Swings","Pigeon Stretch","Doorway Chest Stretch"].filter(n=>!X.EXDB[n]);
    return [have,find("broad jump"),find("plyometric").includes("Box Jump (Multiple Response)"),find("isometric").includes("Wall Sit"),
      (SP.matchExercise("Broad Jumps")||{}).name||SP.matchExercise("Broad Jumps"),
      N.searchFoods("skyr",1).map(x=>x.f.id)[0],N.searchFoods("indomie",1).map(x=>x.f.id)[0]];});
  eq(r,[[],["Standing Long Jump"],true,true,"Standing Long Jump","skyr","noodles_instant"]);
});

/* ---- the Training page, Coach's sections, and the workout bar ----------------------- */
await test("Training opens on today with no sections; Coach's sections switch and are remembered after a reload",async page=>{
  await tapTab(page,"train");await pause(page);
  if(!(await page.$('.twk'))||!(await page.$('[data-startday]')))throw new Error("Training has no week strip or start");
  eq(await page.$$eval('#app .tsecs,#app [data-tsec]',a=>a.length),0,"no sections on Training");
  await coach(page,"train","program");
  if(!(await page.$('.bsched'))||!(await page.$('.drows [data-day]')))throw new Error("My program is not the builder");
  await page.reload();await pause(page,1000);
  await tapTab(page,"coach");await pause(page);
  eq(await ev(page,"[S.prefs.csec,!!document.querySelector('.bsched')]"),["train",true],"remembered");
});
await test("Back goes up one level: a day to My program, a template to Programs",async page=>{
  await coach(page,"train","program");
  await page.tap('.drows [data-day]');await pause(page,400);
  eq(await ev(page,"[V.tab,V.train]"),["coach","day"]);
  await page.tap('[data-back]');await pause(page,500);
  eq(await ev(page,"[V.tab,V.train,!!document.querySelector('.bsched')]"),["coach","days",true],"day → My program");
  await page.tap('[data-ctsub="programs"]');await pause(page);
  await page.tap('.tprog-card[data-preview]');await pause(page,400);
  eq(await ev(page,"V.train"),"preview");
  await page.tap('[data-back]');await pause(page,500);
  eq(await ev(page,"[V.train,V.ctsub,!!document.querySelector('.tprog-card')]"),["days","programs",true],"template → Programs");
});
await test("week strip: a tapped day shows its plan, today returns to now",async page=>{
  await tapTab(page,"train");await pause(page);
  eq(await page.$$eval('.twk-d',a=>a.length),7);
  const other=await page.$eval('.twk-d:not(.today)',b=>b.getAttribute("data-tweek"));
  await page.tap('.twk-d[data-tweek="'+other+'"]');await pause(page);
  eq(await ev(page,"[V.tdate,document.querySelector('.twk-d.sel').getAttribute('data-tweek')]"),[other,other]);
  await page.tap('.twk-d.today');await pause(page);
  eq(await ev(page,"V.tdate"),null);
});
await test("My program edits the active program in place",async page=>{
  await coach(page,"train","program");
  const n=await ev(page,"S.programs.find(p=>p.id===S.activeProgram).days.length");
  await page.tap('.dadd[data-bday]');await pause(page);
  eq(await ev(page,"[S.programs.find(p=>p.id===S.activeProgram).days.length,V.tab,V.train,V.ctsub]"),[n+1,"coach","days","program"]);
});
await test("workout bar: the clock on other tabs, rest counts down there, rest over, and back to the workout",async page=>{
  await startWorkout(page);
  eq(await page.$eval('#wbar',e=>!e.firstChild),true,"not on Train");
  await leaveWorkout(page);
  await tapTab(page,"progress");await pause(page,1200);
  if(!/Workout/i.test(await page.$eval('#wbar',e=>e.innerText)))throw new Error("no bar on Progress");
  eq(await ev(page,"document.body.classList.contains('wb')"),true);
  await page.tap('#wbar .wbar');await pause(page,500);
  eq(await ev(page,"[V.tab,!document.getElementById('wbar').firstChild]"),["train",true],"tap returns");
  /* The rest is a band on the workout now (workout-spec.md), so there is nothing to hide. */
  await page.fill('#in_r','8');await page.tap('[data-logset]');await pause(page,900);
  await leaveWorkout(page);
  await tapTab(page,"food");await pause(page,1200);
  eq(await page.$eval('#rest',e=>!e.firstChild),true,"no full-screen rest on Food");
  if(!/Rest/i.test(await page.$eval('#wbar',e=>e.innerText))||!/\d:\d\d/.test(await page.$eval('#wbarT',e=>e.textContent)))throw new Error("no rest countdown");
  await page.evaluate(async()=>{(await import("/js/ui/view.js")).V.restEnd=Date.now()+1000;});await pause(page,2500);
  eq(await page.$eval('#wbar .wbar',e=>e.classList.contains("done")),true,"rest over");
  if(!/^\+\d+:\d\d$/.test(await page.$eval('#wbarT',e=>e.textContent)))throw new Error("the bar does not count up past the rest");
  await page.tap('#wbar .wbar');await pause(page,500);
  /* The time-up state is the band on the workout now, not a screen of its own. */
  eq(await ev(page,"[V.tab,V.restDone,!!document.querySelector('#app .rb.over[role=alert]'),!document.getElementById('rest').firstChild]"),["train",true,true,true],"rest-over band on return");
},{prefs:{autorest:true}});

/* ---- the week, and Food in three sections -------------------------------------------- */
await test("the week starts on Saturday everywhere, and the setting moves it",async page=>{
  const r=await page.evaluate(async()=>{const sc=await import("/js/engine/schedule.js");const st=await import("/js/engine/stats.js");const u=await import("/js/util.js");
    const f=sc.weekStartOf(u.today());return [sc.isoWeekday(f),sc.weekDates(u.today()).length,st.weeklyVolume().from===f,sc.spreadWd(3),sc.weekOrder()[6]];});
  eq(r,[6,7,true,[6,1,3],5],"Saturday first, Friday last and free");
  await tapTab(page,"train");await pause(page);
  eq(await page.evaluate(async()=>{const sc=await import("/js/engine/schedule.js");return sc.isoWeekday(document.querySelector('.twk-d').getAttribute('data-tweek'));}),6,"strip opens on Saturday");
  await tapTab(page,"profile");await pause(page);await page.tap('[data-sheet="set_app"]');await pause(page);
  await page.tap('[data-wkstart="7"]');await pause(page);
  eq(await ev(page,"S.prefs.wkstart"),7,"then Sunday");
  eq(await page.evaluate(async()=>{const sc=await import("/js/engine/schedule.js");const u=await import("/js/util.js");return sc.isoWeekday(sc.weekStartOf(u.today()));}),7);
});
await test("Food is the day only; the plan, targets and your own foods are planned in Coach → Nutrition",async page=>{
  await tapTab(page,"food");await pause(page);
  if(!(await page.$('.fsum'))||!(await page.$('.fwater-art')))throw new Error("Food is not the day");
  eq(await page.$$eval('#app .tsecs,#app [data-fsec]',a=>a.length),0,"no sections on Food");
  if(await page.$('[data-quickfood].pill'))throw new Error("frequent pills still on the page");
  await coach(page,"food","targets");
  if(!(await page.$('#g_kcal')))throw new Error("Targets has no inline goals");
  eq(await page.$$eval('.tghero',a=>a.length),0,"no copy of Food's day summary");
  await page.reload();await pause(page,1000);
  await tapTab(page,"coach");await pause(page);
  eq(await ev(page,"S.prefs.csec"),"food","remembered");
});
await test("My Foods: build a meal from search, log it whole, and ✕ removes it with Undo",async page=>{
  await coach(page,"food","foods");
  await page.tap('[data-newmeal]');await pause(page);await page.fill('#askv','Ful breakfast');await page.tap('[data-askok]');await pause(page,400);
  const id=await ev(page,"V.smeal");if(!id)throw new Error("no meal screen");
  await page.tap('[data-smadd]');await pause(page,1200);
  eq(await ev(page,"[V.sheet,V.sd.into]"),["addfood",id],"sheet adds into the meal");
  await page.fill('#fq','ful');await pause(page,900);
  await page.evaluate(()=>document.activeElement.blur());await pause(page,200);
  await page.tap('#sheet .afadd');await pause(page,500);
  eq(await ev(page,"[S.savedMeals.find(m=>m.id==='"+id+"').items.length,V.sheet,V.smeal]"),[1,null,id],"into the meal, back on its screen");
  /* Changed my mind about the amount: tap the food, not ✕ and add again. */
  const it0=await ev(page,"Object.assign({},S.savedMeals.find(m=>m.id==='"+id+"').items[0])");
  await page.tap('[data-editfood="saved|'+id+'|0"]');await pause(page,600);
  eq(await ev(page,"[V.sheet,!!V.food.pick.edit]"),["addfood",true],"the servings screen opens on it");
  if(await page.$('#sheet [data-faddpick]'))throw new Error("it offers to add, not to update");
  await page.tap('#sheet [data-fcount="1"]');await pause(page,250);
  await page.tap('#sheet [data-fupdate]');await pause(page,500);
  const it1=await ev(page,"S.savedMeals.find(m=>m.id==='"+id+"').items");
  eq([it1.length,it1[0].n,it1[0].grams>it0.grams,it1[0].kcal>it0.kcal,await ev(page,"V.sheet")],[1,it0.n,true,true,null],"the same food, more of it, in its place");
  await page.tap('.dcta [data-addsaved]');await pause(page,400);
  eq(await page.evaluate(async()=>{const s=await import("/js/state.js");const u=await import("/js/util.js");
    return Object.values(s.dayRec(u.today()).meals).reduce((n,m)=>n+m.items.length,0)>0;}),true,"logged whole");
  await page.tap('[data-back]');await pause(page,500);
  eq(await ev(page,"[V.tab,V.cfsub,V.smeal]"),["coach","foods",null],"back to My foods");
  await page.tap('[data-rmsaved="'+id+'"]');await pause(page);
  eq(await ev(page,"S.savedMeals.length"),0,"removed");
  await page.tap('.toast-undo');await pause(page);
  eq(await ev(page,"S.savedMeals.length"),1,"undo");
});
await test("your own food: edited in My Foods, blank calories come from the macros, ✕ with Undo",async page=>{
  await coach(page,"food","foods");
  await page.tap('[data-myfood="new"]');await pause(page);
  await page.fill('#mf_n','Koshari');await page.fill('#mf_s','1 plate');
  await page.fill('#mf_p','20');await page.fill('#mf_c','100');await page.fill('#mf_f','10');
  await page.tap('[data-savemyfoodx]');await pause(page);
  eq(await ev(page,"[S.myFoods.length,S.myFoods[0].kcal,S.myFoods[0].s[0][0]]"),[1,570,"1 plate"],"made, kcal from macros");
  await page.tap('[data-myfood^="my_"]');await pause(page);
  await page.fill('#mf_k','600');await page.tap('[data-savemyfoodx]');await pause(page);
  eq(await ev(page,"[S.myFoods.length,S.myFoods[0].kcal]"),[1,600],"edited in place");
  await page.tap('[data-rmmyfood]');await pause(page);
  eq(await ev(page,"S.myFoods.length"),0);
  await page.tap('.toast-undo');await pause(page);
  eq(await ev(page,"S.myFoods.length"),1);
});
await test("Targets: goals save in place, the suggestion applies, and Progress no longer has Nutrition",async page=>{
  await coach(page,"food","targets");
  await page.fill('#g_kcal','2222');await page.tap('[data-savegoals]');await pause(page);
  eq(await ev(page,"S.goals.kcal"),2222);
  await page.tap('[data-usesug]');await pause(page);
  eq(await page.evaluate(async()=>{const s=await import("/js/state.js");const f=await import("/js/engine/formulas.js");
    return s.S.goals.kcal===Math.round(f.targetKcal()/10)*10&&s.S.goals.kcal!==2222;}),true,"suggested applied");
  if(!(await page.$('.pgadh'))&&!(await page.$('.empty')))throw new Error("no eating trends");
  await tapTab(page,"progress");await pause(page);
  eq(await page.$$eval('[data-ptab]',a=>a.map(b=>b.getAttribute("data-ptab")).filter((v,i,x)=>x.indexOf(v)===i).sort()),["body","overview","strength"]);
});

/* ---- Training's top, Progress, Profile ------------------------------------------------ */
await test("Training: opens the app, one reminder at most, today's card, weigh-in and steps, the Saturday week; water is on Food",async page=>{
  eq(await ev(page,"V.tab"),"train","the app opens on Training");
  eq(await page.$$eval('.hnote',a=>a.length)<=1,true,"one reminder");
  if(!(await page.$('#app .thero2 [data-startday]')))throw new Error("no today card");
  eq(await page.$$eval('#app .htile',a=>a.map(e=>["weight","steps"].filter(c=>e.classList.contains(c))[0])),["weight","steps"],"weigh-in and steps");
  eq(await page.evaluate(async()=>{const sc=await import("/js/engine/schedule.js");return sc.isoWeekday(document.querySelector('.twk-d').getAttribute('data-tweek'));}),6,"Saturday first");
  await tapTab(page,"food");await pause(page);
  const w0=await page.evaluate(async()=>{const s=await import("/js/state.js");const u=await import("/js/util.js");return s.dayRec(u.today()).water;});
  await page.tap('.fwater-add');await pause(page);
  const w1=await page.evaluate(async()=>{const s=await import("/js/state.js");const u=await import("/js/util.js");return s.dayRec(u.today()).water;});
  if(!(w1>w0))throw new Error("water did not add");
});
await test("Leaving a workout for later lands on Training's Resume card, and Resume goes back into it",async page=>{
  await startWorkout(page);
  await page.evaluate(async()=>{(await import("/js/ui/nav.js")).goBack();});await pause(page,500);
  await page.tap('[data-confirmok]');await pause(page,500);
  eq(await ev(page,"[V.tab,V.train,!!S.active]"),["train","hub",true],"on Training, workout kept");
  if(!(await page.$('#app .thero2 [data-continue]')))throw new Error("no resume card");
  await page.tap('[data-continue]');await pause(page,500);
  eq(await ev(page,"[V.tab,V.train]"),["train","days"],"back in the workout");
  if(!(await page.$('[data-logset]')))throw new Error("not the workout");
});
await test("Progress: no date bar, History by month opens and Back returns",async page=>{
  await tapTab(page,"progress");await pause(page);
  if(await page.$('.dnav'))throw new Error("date bar still on Progress");
  
  await page.tap('[data-phist]');await pause(page);
  /* The seed trains from two days ago back, so on the 1st and 2nd of a month every
     trained day is in the previous one: look in both months the test visits. */
  let trained=!!(await page.$('.phcal .dbday.trained'));
  await page.tap('[data-hmonth="-1"]');await pause(page);
  eq(await ev(page,"V.hmonth"),-1);
  trained=trained||!!(await page.$('.phcal .dbday.trained'));
  if(!trained)throw new Error("no trained day in History");
  await page.tap('[data-back]');await pause(page,500);
  eq(await ev(page,"[V.tab,!!V.phist]"),["progress",false]);
});
await test("Progress: one page in three views (Overview, Strength, Body), and each goal's weight trend is judged by its own rate",async page=>{
  await tapTab(page,"progress");await pause(page);
  eq(await page.$$eval('#app [data-pview],#app .psimple',a=>a.length),0,"no Simple slide, no switch to it");
  eq(await page.$$eval('.pgtabs2 [data-ptab]',a=>a.map(x=>x.dataset.ptab)),["overview","strength","body"],"the three views");
  eq(await page.$eval('.pgtabs2 [data-ptab].on,.pgtabs2 [aria-selected="true"]',e=>e.dataset.ptab),"overview","Overview first");
  /* Three weeks of weigh-ins at a set rate, under each goal. */
  const r=await page.evaluate(async()=>{
    const S=(await import("/js/state.js")).S,ST=await import("/js/engine/stats.js");
    const iso=d=>{const x=new Date(Date.now()-d*864e5);return new Date(x-x.getTimezoneOffset()*6e4).toISOString().slice(0,10);};
    const out={};
    for(const [g,rate] of [["recomp",-0.3],["recomp",0],["lose",-0.2],["gain",0.8],["strength",0.15],["maintain",-0.3]]){
      S.profile.goal=g;S.body=[];for(let d=21;d>=0;d-=3)S.body.push({date:iso(d),weight:Math.round((84-rate*d/7)*100)/100});
      const tr=ST.weightTrend();out[g+" "+rate]=[tr.kind,tr.status];}
    return out;});
  eq(r,{"recomp -0.3":["lose","ok"],"recomp 0":["lose","ok"],"lose -0.2":["lose","slow"],"gain 0.8":["gain","fast"],
    "strength 0.15":["gain","ok"],"maintain -0.3":["hold","down"]},"each goal by its own rate");
  /* What the plain-words facts say (the coach's chat reads them): losing slowly while
     building muscle is on plan; gaining fast is not "more food". */
  const say=async(g,rate)=>page.evaluate(async([g,rate])=>{
    const S=(await import("/js/state.js")).S,F=await import("/js/ui/facts.js");
    const iso=d=>{const x=new Date(Date.now()-d*864e5);return new Date(x-x.getTimezoneOffset()*6e4).toISOString().slice(0,10);};
    S.profile.goal=g;S.body=[];for(let d=21;d>=0;d-=3)S.body.push({date:iso(d),weight:Math.round((84-rate*d/7)*100)/100});
    const w=F.simpleFacts().find(x=>x.k==="Weight");return [w.state,w.line];},[g,rate]);
  let w=await say("recomp",-0.3);
  eq([w[0],/On track for your goal/.test(w[1])],["ok",true],"a slow loss is on plan for losing fat and building muscle");
  w=await say("gain",0.8);
  eq([w[0],/Trim about 100–200 kcal/.test(w[1]),/protects your muscle/.test(w[1])],["warn",true,false],"gaining too fast: a little less food");
});
/* ---- Coach AI: ask the coach (js/ui/views/chat.js, js/coach/intent.js) ------------- */
await test("Coach chat: suggestions and typed questions, English and Arabic, answered from the log on the phone; buttons act with Undo; Back and Clear",async page=>{
  /* Nothing goes over the network: every answer is worked out here. */
  const out=[];page.on("request",r=>{if(!r.url().startsWith("http://localhost"))out.push(r.url());});
  await coach(page,"ai");
  if(await page.$('.chatcard'))throw new Error("the Ask card is still on Plan");
  await page.tap('#cfab .cfab');await pause(page,400);
  await page.fill('#chatq',"What do I train today?");await page.press('#chatq','Enter');await pause(page,400);
  /* The conversation is the floating Coach's panel now, over Coach AI. */
  eq(await ev(page,"[V.tab,V.coach,S.chat.length,S.chat[0].id]"),["coach","compact",1,"today"],"a suggestion opens the Coach panel and is answered");
  if(!(await page.$('.chat-a .chat-acts [data-startday]')))throw new Error("today's answer offers no Start workout");
  const ask=async q=>{await page.fill('#chatq',q);await page.press('#chatq','Enter');await pause(page,300);
    return page.evaluate(()=>{const a=(document.querySelectorAll(".chat-more").forEach(d=>d.open=true),[...document.querySelectorAll(".chat-a")].pop());return a?a.innerText:"";});};
  let a=await ask("how much protein do I need?");
  eq(await ev(page,"S.chat[S.chat.length-1].id"),"protein","typed: protein");
  if(!/150 g a day/.test(a))throw new Error("protein answer not from the targets: "+a);
  a=await ask("اكل ايه دلوقتي");
  eq(await ev(page,"S.chat[S.chat.length-1].id"),"eat","typed in Arabic: what to eat");
  if(!/2,500/.test(a))throw new Error("food answer not from the targets: "+a);
  eq(await page.$$eval('.chat-acts',x=>x.length),1,"only the newest answer carries buttons");
  a=await ask("asdf qwer");
  eq(await ev(page,"S.chat[S.chat.length-1].id"),"unknown","nonsense is said to be outside what it knows");
  if(!/won't guess/.test(a)||!(await page.$('#cpanel .chat-chips [data-chatq]')))throw new Error("unknown has no way on: "+a);
  /* The weight stalled while losing fat, and the log matches the target: a step on the target, with Undo. */
  a=await ask("why is my weight stuck");
  if(!/Eat 150 kcal less a day/.test(a))throw new Error("no step offered: "+a);
  await page.tap('.chat-acts [data-chatkcal="-150"]');await pause(page);
  eq(await ev(page,"[S.goals.kcal,S.goals.p,S.goals.f,S.goals.c]"),[2350,150,70,280],"150 kcal less, from carbs");
  await page.tap('.toast-undo');await pause(page);
  eq(await ev(page,"[S.goals.kcal,S.goals.c]"),[2500,300],"Undo");
  /* A goal named in the question, set with its targets, and Undo. */
  a=await ask("I want to bulk");
  await page.tap('.chat-acts [data-chatgoal="gain"]');await pause(page);
  eq(await ev(page,"S.profile.goal"),"gain","goal set");
  await page.tap('.toast-undo');await pause(page);
  eq(await ev(page,"[S.profile.goal,S.goals.kcal]"),["lose",2500],"Undo puts goal and targets back");
  /* Kept, cleared with Undo (from the panel at full height), and closing returns to Coach AI. */
  const n=await ev(page,"S.chat.length");
  await page.tap('.cp [data-coachsize="full"]');await pause(page);
  await page.tap('[data-chatclear]');await pause(page);
  eq([await page.$$eval('#cpanel .chat-x',a=>a.length),await ev(page,"S.chat.length")],[0,n],"cleared from the chat, kept in the history");
  await page.tap('.toast-undo');await pause(page);
  eq(await page.$$eval('#cpanel .chat-x',a=>a.length)>0,true,"Undo brings it back");
  await page.tap('.cp [data-coachclose]');await pause(page,500);
  eq(await ev(page,"[V.tab,!!V.coach,V.csec]"),["coach",false,"ai"],"closed, back on Coach AI");
  eq(out,[],"no network requests");
},{db:Object.assign(seed(),{
  profile:{age:30,height:180,weight:84,sex:"m",activity:1.4,goal:"lose",prog:"standard",level:"some",days:3},
  body:[21,18,15,12,9,6,3,0].map(d=>({date:iso(d),weight:84})),
  days:Object.fromEntries([1,2,3,4,5,6,7,8,9,10].map(d=>[iso(d),{water:2000,steps:8000,meals:{Lunch:{done:true,
    items:[{n:"Day's food",fid:"x",grams:100,label:"1 serving",kcal:2480,p:150,c:300,f:70}]}}}]))})});
await test("Coach chat: a saved conversation that is not the app's own renders as text only",async page=>{
  await page.evaluate(async()=>{const S=(await import("/js/state.js")).S;
    S.chat=[null,7,{q:"<img src=x onerror=alert(1)>",id:"today",at:Date.now(),b:[{p:"<b>hi</b>"},{l:["<i>x</i>",3]},null],
      acts:[{l:"Go",a:{"onclick":"alert(1)","data-tab":"food","data-x\" onmouseover=\"alert(1)":"1"}}]}];});
  await openChat(page);
  const r=await page.evaluate(()=>({img:!!document.querySelector(".chat img"),b:!!document.querySelector(".chat-a b"),
    btn:[...document.querySelectorAll(".chat-acts button")].map(b=>b.getAttributeNames().sort().join(","))}));
  eq(r,{img:false,b:false,btn:["class,data-tab"]},"markup stays text; a button keeps only data-* the app knows");
});
await test("Arabic: the dock keeps its order, dates are Arabic, figures stay one run",async page=>{
  const r=await page.evaluate(()=>{
    const b=[...document.querySelectorAll("nav .dock-b")].map(x=>x.getBoundingClientRect().left);
    const tabs=[...document.querySelectorAll("nav .dock-b")].map(x=>x.getAttribute("data-tab"));
    return {dir:document.documentElement.dir,dock:getComputedStyle(document.querySelector(".dock")).direction,
      leftToRight:b.every((x,i)=>!i||x>b[i-1]),first:tabs[0],
      date:document.querySelector(".hdate").textContent,
      runs:[...document.querySelectorAll('#app bdi[dir="ltr"]')].map(x=>x.textContent)};});
  eq([r.dir,r.dock,r.leftToRight,r.first],["rtl","ltr",true,"train"],"dock");
  if(!/[\u0600-\u06FF]/.test(r.date)||/[A-Za-z]/.test(r.date))throw new Error("date not Arabic: "+r.date);
  if(/[\u0660-\u0669]/.test(r.date))throw new Error("Arabic-Indic digits in date: "+r.date);
  if(!r.runs.some(x=>/^\d[\d,]* \/ \d/.test(x)))throw new Error("no isolated fraction among "+JSON.stringify(r.runs));
},{prefs:{lang:"ar"}});
await test("Arabic: template program and day names are shown in Arabic, fractions keep their slash",async page=>{
  await coach(page,"train","program");await pause(page,200);
  const r=await page.evaluate(async()=>{const x=await import("/js/i18n/exnames.js");
    return {rows:[...document.querySelectorAll(".drow-n")].map(e=>e.textContent),
      head:(document.querySelector(".bhero .dhead-t, .dname .dhead-t")||{}).textContent||"",
      frac:x.exName("3/4 Sit-Up"),own:x.planName("My Monday")};});
  if(!r.rows.some(n=>/^جسم كامل [أبج]$/.test(n)))throw new Error("day names not Arabic: "+JSON.stringify(r.rows));
  if(!r.rows.includes("راحة"))throw new Error("rest day not Arabic: "+JSON.stringify(r.rows));
  if(/[A-Za-z]/.test(r.head))throw new Error("program name not Arabic: "+r.head);
  if(r.frac.indexOf("3/4")<0)throw new Error("fraction lost its slash: "+r.frac);
  eq(r.own,"My Monday","a name the user typed passes through");
},{prefs:{lang:"ar"}});
/* On accent-deep since token-requests.md §3 (owner, 20 Oct): Glacier Blue on Machine Red was 3.27:1. */
/* Red is red on navy since 26 Oct: white on Signal Red (#E7172E), 4.6:1. */
await test("Light: the open tab reads on the dark dock: white on Signal Red",async page=>{
  const c=await page.$eval('nav .dock-b.on',e=>[getComputedStyle(e).color,getComputedStyle(e).backgroundColor]);
  eq(c,["rgb(255, 255, 255)","rgb(231, 23, 46)"]);
},{db:Object.assign(seed(),{theme:"light"}),prefs:{palette:"red"}});
await test("One place for each thing: the assessment in Coach AI only, how you feel asked when a workout starts, nothing of it on Profile",async page=>{
  await tapTab(page,"train");await pause(page);
  eq(await page.$$eval('#app .rchk,#app [data-rchk]',a=>a.length),0,"no recovery check-in on Training");
  await coach(page,"train","programs");
  eq(await page.$$eval('#app [data-setup]',a=>a.length),0,"no assessment in Training planning");
  await coach(page,"ai");
  eq(await page.$$eval('#app [data-setup]',a=>a.length)>=1,true,"Coach AI has it");
  await tapTab(page,"profile");await pause(page);
  eq(await page.$$eval('#app [data-setup],#app [data-sheet="recovery"]',a=>a.length),0);
  if(!(await page.$('.pid .pmono')))throw new Error("no identity card");
});
/* ---- the name dialog, meals of your own, and a plan ------------------------------------- */
await test("Name prompt: a rounded dialog with no Name label; a tap outside lowers the keyboard before it closes",async page=>{
  await coach(page,"train","programs");
  await page.$eval('[data-newsplit]',e=>e.click());await pause(page,400);
  if(!(await page.$('.sheet.dlg .dlgbox')))throw new Error("no dialog");
  eq(await page.$$eval('.dlgbox label',a=>a.length),0,"no Name label");
  eq(await page.evaluate(()=>document.activeElement.id),"askv","field focused");
  await page.mouse.click(6,420);await pause(page);
  eq([!!(await page.$('.sheet.dlg')),await page.evaluate(()=>document.activeElement.id)],[true,""],"first tap only lowers the keyboard");
  await page.mouse.click(6,420);await pause(page,400);
  eq(!!(await page.$('.sheet.dlg')),false,"second tap closes");
  await page.$eval('[data-newsplit]',e=>e.click());await pause(page,400);
  await page.fill('#askv','My Split');await page.keyboard.press("Enter");await pause(page,400);
  eq(await ev(page,"S.programs[S.programs.length-1].name"),"My Split","Enter creates");
});
await test("Food: no Now label; Add Food goes to the meal after the last one logged",async page=>{
  await page.evaluate(async()=>{const s=await import("/js/state.js"),u=await import("/js/util.js");
    s.dayRec(u.today()).meals={Lunch:{done:true,items:[{n:"Koshari",kcal:700,p:20,c:110,f:12}]}};s.saveDB();});
  await tapTab(page,"food");await pause(page,400);
  eq(await page.$$eval('.fmt-now',a=>a.length),0,"no Now");
  eq(await page.$eval('.btn.fadd',e=>e.getAttribute("data-addfood")),"Dinner","after Lunch comes Dinner");
});
await test("Plan: numbered meals, add and rename a meal, reorder them, and every name reaches Today",async page=>{
  await coach(page,"food","plan");
  await page.tap('[data-mstyle="numbered"]');await pause(page);
  eq(await page.$$eval('.drows .drow-n',a=>a.map(x=>x.textContent)),["Meal 1","Meal 2","Meal 3","Meal 4"],"numbered");
  await page.tap('[data-paddslot]');await pause(page,400);
  await page.fill('#askv','Pre-workout');await page.tap('[data-askok]');await pause(page);
  await page.$$eval('.drows [data-pslot]',a=>a[1].click());await pause(page);
  await page.tap('[data-prename]');await pause(page,400);
  await page.fill('#askv','Lunch at work');await page.tap('[data-askok]');await pause(page);
  eq(await page.$eval('.dhead-t',e=>e.textContent),"Lunch at work","renamed");
  await page.evaluate(()=>history.back());await pause(page,500);
  eq(await page.$$eval('.dgrip',a=>a.length),0,"no grips before Reorder");
  await page.tap('[data-reorder="ms"]');await pause(page);
  await page.focus('.drow:nth-child(5) .dgrip');await page.keyboard.press("ArrowUp");await pause(page);
  eq(await page.$$eval('.drows .drow-n',a=>a.map(x=>x.textContent)),["Meal 1","Lunch at work","Meal 3","Pre-workout","Meal 5"],"moved up; a numbered meal is called by its place");
  await tapTab(page,"food");await pause(page);
  eq(await page.$$eval('.fmt-c .fmt-n',a=>a.map(x=>x.textContent)),["Meal 1","Lunch at work","Meal 3","Pre-workout","Meal 5"],"Today's tiles");
});
await test("Plan import: pasted text becomes meals with foods; an unmatched line waits with Find; the plan logs in one tap",async page=>{
  await coach(page,"food","plan");
  await page.tap('[data-pimport]');await pause(page);
  await page.fill('#pi_text',"Meal 1 (8am):\n- 3 eggs\n- 2 slices toast\nMeal 2: 150g chicken breast, 200g rice\nSnack:\n200g greek yogurt\n1 cup zorblax");
  await page.tap('[data-pread]');await pause(page,1200);
  eq(await page.$$eval('.picard',a=>a.length),3,"three meals found");
  await page.tap('[data-puse]');await pause(page,500);
  eq(await ev(page,"S.mealSlots.map(x=>[x.id.startsWith('m_')?'m':x.id,(x.plan||[]).length,(x.todo||[]).length])"),[["m",2,0],["m",2,0],["Snack",1,1]],"slots with plans");
  eq(await page.$$eval('.drows .drow-n',a=>a.map(x=>x.textContent)),["Meal 1","Meal 2","Snacks"],"named as the app names them");
  await page.$$eval('.drows [data-pslot]',a=>a[2].click());await pause(page);
  await page.tap('[data-pfind]');await pause(page,600);
  eq(await ev(page,"[V.sheet,V.food.sq,V.sd.plan!=null]"),["addfood","1 cup zorblax",true],"Find opens search with the line typed");
  await page.keyboard.press("Escape");await pause(page);
  eq(await page.$$eval('#app [data-logplan]',a=>a.length),0,"planning only: no logging in Coach");
  await tapTab(page,"food");await pause(page);
  await page.tap('.fmt-c[data-meal="Snack"]');await pause(page,400);
  await page.tap('[data-logplan]');await pause(page);
  eq(await page.evaluate(async()=>{const s=await import("/js/state.js"),u=await import("/js/util.js");return (s.dayRec(u.today()).meals.Snack||{items:[]}).items.length;}),1,"logged as planned");
  await page.evaluate(()=>history.back());await pause(page,500);
  await page.tap('[data-logday]');await pause(page);
  eq(await page.evaluate(async()=>{const s=await import("/js/state.js"),u=await import("/js/util.js"),r=s.dayRec(u.today());
    return s.S.mealSlots.map(x=>((r.meals[x.id]||{}).items||[]).length);}),[2,2,1],"the rest of the day from the plan, the snack not twice");
});
await test("Arabic plan: Arabic digits, the dual and spoons are read",async page=>{
  const r=await page.evaluate(async()=>{const n=await import("/js/engine/nutrition.js");await new Promise(f=>n.loadFoods(f));
    const pp=await import("/js/engine/planparse.js");
    return pp.parsePlan("الوجبة الأولى:\n٣ بيض\nبيضتين\nمعلقتين زبدة فول سوداني\nالعشا: ١٥٠ جم فراخ").map(m=>[m.named,m.n,m.items.map(i=>i.label)]);});
  eq(r,[[null,1,["3 × large egg","2 × large egg","2 tbsp"]],["Dinner",null,["150 g"]]]);
});
/* ---- themes: BUNYAN Blue (the default), BUNYAN Red, Sage, each dark and light ------------- */
await test("Themes: the picker switches the whole app, and the choice outlives a reload",async page=>{
  await tapTab(page,"profile");await pause(page);
  await page.tap('[data-sheet="set_app"]');await pause(page,400);
  eq(await page.$$eval('.thpick',a=>a.map(b=>b.getAttribute("data-settheme"))),["blue","red","mono"],"three themes, Blue first");
  eq(await page.$eval('.thpick.on',e=>e.getAttribute("data-settheme")),"blue","blue by default");
  eq(await page.$$eval('link[rel="icon"],link[rel="apple-touch-icon"]',a=>a.map(l=>l.getAttribute("href"))),["icon-180.png","icon-180.png"],"Blue's icon");
  await page.tap('[data-settheme="red"]');await pause(page,500);
  eq(await page.evaluate(()=>document.documentElement.getAttribute("data-palette")),"red","html is red");
  eq(await ev(page,"S.prefs.palette"),"red","saved to the profile");
  eq(await page.evaluate(()=>getComputedStyle(document.body).getPropertyValue("--accent").trim().toUpperCase()),"#E7172E","Signal Red is the accent (red on navy since 26 Oct)");
  eq(await page.$$eval('link[rel="icon"],link[rel="apple-touch-icon"]',a=>a.map(l=>l.getAttribute("href"))),["icon-red-180.png","icon-red-180.png"],"the icon takes the theme");
  await page.tap('[data-lookmode="light"]');await pause(page,500);
  eq(await page.evaluate(()=>[document.documentElement.getAttribute("data-theme"),localStorage.getItem("bunyan:look")]),["light","red|light|red"],"mode and the early copy");
  await page.reload();await page.waitForTimeout(60);
  eq(await page.evaluate(()=>[document.documentElement.getAttribute("data-palette"),document.documentElement.getAttribute("data-theme"),
    document.querySelector('link[rel="apple-touch-icon"]').getAttribute("href")]),["red","light","icon-red-180.png"],"applied before the app runs, the icon too");
  await pause(page,1000);
  await tapTab(page,"profile");await pause(page);
  if(!(await page.$eval('[data-sheet="set_app"]',e=>e.textContent)).includes("BUNYAN Red"))throw new Error("the Profile row does not name the theme");
  eq(await page.$eval('meta[name="theme-color"]',e=>e.content.toUpperCase()),"#DBF6FF","the status bar takes the theme's ground");
});
/* The icon follows the theme unless one is chosen; a chosen one stays through a change
   of theme and a reload (it is applied before the app runs, with the theme). */
await test("Themes: the app icon follows the theme, or stays the colour chosen in Settings",async page=>{
  const icons=()=>page.$$eval('link[rel="icon"],link[rel="apple-touch-icon"]',a=>a.map(l=>l.getAttribute("href")));
  await tapTab(page,"profile");await pause(page);
  await page.tap('[data-sheet="set_app"]');await pause(page,400);
  eq(await page.$$eval('.icpick',a=>a.map(b=>b.getAttribute("data-seticon"))),["auto","blue","red","mono"],"the theme's, then the three");
  eq(await page.$eval('.icpick.on',e=>e.getAttribute("data-seticon")),"auto","follows the theme by default");
  eq(await page.$$eval('.icpick img',a=>a.map(i=>i.getAttribute("src"))),["icon-180.png","icon-180.png","icon-red-180.png","icon-mono-180.png"]);
  if(!await page.$$eval('.icpick img',a=>a.every(i=>i.complete&&i.naturalWidth===180)))throw new Error("an icon did not load");
  await page.tap('[data-seticon="mono"]');await pause(page,400);
  eq([await ev(page,"S.prefs.icon"),await icons()],["mono",["icon-mono-180.png","icon-mono-180.png"]],"Sage's icon in the Blue theme");
  await page.tap('[data-settheme="red"]');await pause(page,500);
  eq(await icons(),["icon-mono-180.png","icon-mono-180.png"],"kept when the theme changes");
  eq(await page.evaluate(()=>localStorage.getItem("bunyan:look")),"red|dark|mono");
  await page.reload();await page.waitForTimeout(60);
  eq(await icons(),["icon-mono-180.png","icon-mono-180.png"],"before the app runs, after a reload");
  await pause(page,1000);
  await tapTab(page,"profile");await pause(page);
  await page.tap('[data-sheet="set_app"]');await pause(page,400);
  await page.tap('[data-seticon="auto"]');await pause(page,400);
  eq([await ev(page,"S.prefs.icon"),await icons()],["auto",["icon-red-180.png","icon-red-180.png"]],"back to the theme's");
  if(!/Home Screen/.test(await page.$eval('.icpicks+.sg-f',e=>e.textContent)))throw new Error("the Home Screen note is missing");
});
await test("Themes: every theme and mode uses its reference colours exactly",async page=>{
  const r=await page.evaluate(()=>{
    const de=document.documentElement,out={};
    for(const p of ["red","blue","mono"])for(const m of ["dark","light"]){
      de.setAttribute("data-palette",p);de.setAttribute("data-theme",m);
      const cs=getComputedStyle(de);out[p+"-"+m]=["--accent","--bg","--onAccent","--raised"].map(k=>cs.getPropertyValue(k).trim().toUpperCase());}
    return out;});
  /* Red is red on night navy since 26 Oct (the owner's reference): Signal Red, white labels. */
  eq(r["red-dark"],["#E7172E","#03060F","#FFFFFF","#081224"],"Signal Red on night navy, white on red");
  eq(r["red-light"].slice(0,3),["#E7172E","#DBF6FF","#FFFFFF"],"Glacier Blue ground, Signal Red");
  eq(r["blue-dark"].slice(0,3),["#8AB0EC","#070B1A","#070B1A"],"Sky Blue on Night Navy");
  eq(r["mono-dark"].slice(0,3),["#DCE7E4","#0D1A1B","#142E33"],"Sage: sage-white on the deep sage ground");
  eq(r["mono-light"].slice(0,3),["#142E33","#D2DBDA","#F2F6F5"],"Sage: the reference's deep slate on sage");
});
await test("Themes: Pink became Blue; a profile that chose Pink opens in Blue, from the first paint",async page=>{
  eq(await page.evaluate(()=>document.documentElement.getAttribute("data-palette")),"blue","the app shows Blue");
  eq(await ev(page,"S.prefs.palette"),"blue","the stored choice is Blue");
  await page.evaluate(()=>localStorage.setItem("bunyan:look","pink|dark"));
  await page.reload();await page.waitForTimeout(60);
  eq(await page.evaluate(()=>document.documentElement.getAttribute("data-palette")),"blue","the early copy too");
},{prefs:{palette:"pink"}});
await test("Themes: a delete asks in red whatever the theme",async page=>{
  await coach(page,"train","program");
  await page.$$eval('.drows [data-day]',a=>a[0].click());await pause(page,400);
  await page.$eval('[data-delday]',e=>e.click());await pause(page,500);
  /* On danger-deep, with onDanger: the label never sits on danger-fill (token-requests.md §4). */
  const bg=await page.$eval('.cf.bad .cf-ok',e=>[getComputedStyle(e).backgroundColor,getComputedStyle(e).color]);
  eq(bg,["rgb(179, 19, 27)","rgb(255, 255, 255)"],"delete is danger-deep, white label");
},{prefs:{palette:"blue"}});
/* The rest is a band on the workout (workout-spec.md, RestBand): the theme's own raised
   surface and text, in light mode as in dark. */
await test("Themes: the rest band takes the theme in light mode, with readable figures",async page=>{
  await startWorkout(page);await page.fill('#in_r','8');await page.tap('[data-logset]');await pause(page,900);
  const r=await page.evaluate(()=>{const v=document.getElementById("restDig"),b=v&&v.closest(".rb");
    return v?[getComputedStyle(v).color,getComputedStyle(b).backgroundColor,!document.getElementById("rest").firstChild]:null;});
  eq(r,["rgb(19, 38, 39)","rgba(224, 231, 230, 0.56)",true],"Sage light's text on its card glass; no full-screen rest");
},{db:Object.assign(seed(),{theme:"light"}),prefs:{palette:"mono"}});
await test("Themes: each place stands on its own picture, under the glass, faint in light mode",async page=>{
  const look=()=>page.evaluate(()=>{const g=document.getElementById("bgart"),a=g&&g.querySelector(".art.photo");
    const cs=g&&getComputedStyle(g),ca=a&&getComputedStyle(a);
    return a?[a.getAttribute("data-p"),ca.backgroundImage.replace(/.*\/(img\/[^")]+).*/,"$1"),cs.position,cs.zIndex,ca.opacity]:null;});
  eq(await look(),["home","img/page-home.jpg","fixed","-1","0.78"],"Training's first page: home, fixed behind the page");
  /* The owner's full photographs fill the screen's height, so each is seen whole. */
  eq(await page.evaluate(()=>Math.abs(document.querySelector("#bgart .art.photo").getBoundingClientRect().height-innerHeight)<2),true,"the full photograph fills the height");
  for(const [tab,p] of [["food","food"],["coach","coach"],["progress","progress"],["profile","profile"]]){
    await tapTab(page,tab);await pause(page);
    eq((await look()).slice(0,2),[p,"img/page-"+p+".jpg"],tab+" has its own");}
  /* Coach's sections are their own places: planning a program is training's. */
  await page.evaluate(async()=>{const V=(await import("/js/ui/view.js")).V;V.tab="coach";V.csec="train";(await import("/js/ui/render.js")).render();});await pause(page);
  eq((await look())[0],"training","Coach → Training");
  await page.evaluate(async()=>{const V=(await import("/js/ui/view.js")).V;V.csec="food";(await import("/js/ui/render.js")).render();});await pause(page);
  eq((await look())[0],"food","Coach → Nutrition");
  /* The cards frost what is behind them, the picture included. */
  const bf=await page.$eval("#app .card,#app .sg-list,#app .ascard2,#app section",e=>getComputedStyle(e).backdropFilter||getComputedStyle(e).webkitBackdropFilter).catch(()=>"blur");
  if(!/blur/.test(bf||""))throw new Error("the cards are not glass: "+bf);
  /* Every picture is there to load, and light mode keeps them faint. */
  const ok=await page.evaluate(()=>Promise.all(["home","training","workout","warmup","food","coach","progress","profile"].map(k=>new Promise(r=>{
    const i=new Image();i.onload=()=>r(i.naturalWidth>200);i.onerror=()=>r(false);i.src="img/page-"+k+".jpg";}))));
  eq(ok.every(Boolean),true,"all eight load");
  await page.evaluate(async()=>{const S=(await import("/js/state.js")).S,V=(await import("/js/ui/view.js")).V;S.theme="light";V.tab="progress";(await import("/js/ui/render.js")).render();});await pause(page,300);
  eq((await look())[4],"0.22","faint in light mode");
});
await test("Themes: the mark is the theme's own colour, and so is the icon",async page=>{
  const look=()=>page.evaluate(()=>{const m=document.querySelector(".libhero .mk");
    return [m?getComputedStyle(m).backgroundImage:"",document.querySelector('link[rel="apple-touch-icon"]').getAttribute("href")];});
  await page.evaluate(async()=>{const V=(await import("/js/ui/view.js")).V;V.tab="coach";V.train="library";(await import("/js/ui/render.js")).render();});
  await pause(page,300);
  eq(await page.$$eval(".libhero .mk",a=>a.length),1,"the library's mark");
  let r=await look();
  if(!/138, 176, 236/.test(r[0]))throw new Error("the mark is not Sky Blue: "+r[0]);
  eq(r[1],"icon-180.png","Blue's icon");
  await page.evaluate(async()=>{const S=(await import("/js/state.js")).S;S.prefs.palette="mono";(await import("/js/ui/render.js")).render();});await pause(page,300);
  r=await look();
  if(!/220, 231, 228/.test(r[0]))throw new Error("the mark is not Sage's: "+r[0]);
  eq(r[1],"icon-mono-180.png","Sage's icon");
  /* The icons are real files, the size the phone asks for. */
  for(const f of ["icon-180.png","icon-red-180.png","icon-mono-180.png"]){
    const png=fs.readFileSync(new URL("../"+f,import.meta.url));
    eq([png.readUInt32BE(16),png.readUInt32BE(20)],[180,180],f);}
});
await test("Themes: Sage light, as the reference: white type on the ground, deep slate on the glass",async page=>{
  await tapTab(page,"progress");await pause(page);
  const c=await page.evaluate(()=>{const col=s=>{const e=document.querySelector(s);return e?getComputedStyle(e).color:null;};
    return [col(".thead h1"),col(".pglbl h2"),col(".pgcard,.pgstat,.card")];});
  eq(c.slice(0,2),["rgb(255, 255, 255)","rgb(255, 255, 255)"],"the title and the section heading");
  eq(c[2],"rgb(19, 38, 39)","a card's type");
  /* The dock is the reference's: a slate bar, white buttons, the open tab a white pill
     (once its change of tab, --m-tab, has played). */
  await pause(page,500);
  eq(await page.$eval(".dock-b.on",e=>getComputedStyle(e).backgroundColor),"rgb(255, 255, 255)","the open tab");
},{db:Object.assign(seed(),{theme:"light"}),prefs:{palette:"mono"}});
await test("Themes: the stylesheet names no colour outside the theme blocks",async page=>{
  const bad=await page.evaluate(async()=>{
    const html=await (await fetch("/index.html")).text();
    let css=html.slice(html.indexOf("<style>"),html.indexOf("</style>")).replace(/\/\*[\s\S]*?\*\//g,"");
    /* The theme blocks are the one place colours live. */
    css=css.replace(/(?<=^|\})\s*(?::root|\[data-(?:palette|theme))[^{]*\{[^}]*\}/g,"");
    const out=[];
    for(const m of css.matchAll(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+[^)]*\)/g)){
      let c;
      if(m[0][0]==="#"){let h=m[0].slice(1);if(h.length===3)h=[...h].map(x=>x+x).join("");c=[0,2,4].map(i=>parseInt(h.slice(i,i+2),16));}
      else c=m[0].match(/\d+/g).slice(0,3).map(Number);
      /* Neutral blacks, whites and greys are overlays that suit every theme; anything with
         a hue is a theme colour and belongs in a theme block. */
      if(Math.max(...c)-Math.min(...c)>24)out.push(m[0]);}
    return out;});
  eq(bad,[],"coloured literals outside the themes");
});
await test("Back returns to where you were on the screen before; a tab tap always opens at the top",async page=>{
  await tapTab(page,"progress");await pause(page);
  const y0=await page.evaluate(()=>{document.querySelector("[data-phist]").scrollIntoView({block:"center"});return Math.round(scrollY);});
  if(y0<100)throw new Error("Progress → Detailed too short to test");
  await page.evaluate(()=>document.querySelector("[data-phist]").click());await pause(page,500);
  eq(await ev(page,"V.phist"),true);
  await page.evaluate(()=>window.scrollTo(0,200));await pause(page);
  await page.evaluate(async()=>{(await import("/js/ui/nav.js")).goBack();});await pause(page,600);
  eq([await ev(page,"!!V.phist"),await page.evaluate(()=>Math.round(scrollY))],[false,y0],"back to the same place");
  await page.evaluate(()=>document.querySelector("[data-phist]").click());await pause(page,500);
  await page.evaluate(()=>window.scrollTo(0,300));await pause(page);
  await tapTab(page,"train");await pause(page,700);
  eq(await page.evaluate(()=>Math.round(scrollY)),0,"a tab opens at its top, not where the browser last saw it");
});
await test("PDF plan: meals, daily targets and supplements are read, reviewed and applied, and Undo puts it all back",async page=>{
  await coach(page,"food","plan");
  await page.tap('[data-pimport]');await pause(page);
  const before=await ev(page,"JSON.stringify(S.goals)");
  await page.setInputFiles("#pi_file",new URL("./fixtures/plan-sample.pdf",import.meta.url).pathname);
  for(let i=0;i<60&&!(await page.$(".picard"));i++)await pause(page,250);
  eq(await page.$$eval(".picard .picard-h .tiday",a=>a.map(e=>e.value)),["Meal 1","Meal 2","Snacks","Meal 3","Supplements"],"meals");
  eq(await page.$$eval(".plist-r.miss",a=>a.length),0,"every line matched a food");
  eq(await page.$$eval(".pitg-r input",a=>a.map(e=>e.value)),["2200","160","230","70","2.75","9000"],"targets");
  const supp=await page.$$eval(".picard",a=>a[4].innerText);
  for(const w of ["Vitamin D3","1,000 IU","With a fatty meal","Magnesium","200 mg","Before bed","Zinc","15 mg"])
    if(supp.indexOf(w)<0)throw new Error("supplements lack "+w+": "+supp);
  const box=await page.$eval("#pi_text",e=>e.value);
  if(!/^Meal 1 \(Breakfast\):/.test(box))throw new Error("the plan text is not in the box: "+box.slice(0,60));
  await page.tap("[data-puse]");await pause(page,500);
  eq(await ev(page,"[S.goals.kcal,S.goals.p,S.goals.c,S.goals.f,S.goals.water,S.goals.steps]"),[2200,160,230,70,2750,9000],"applied");
  eq(await page.evaluate(async()=>{const M=await import("/js/engine/meals.js");return M.mealSlots().map(x=>M.mealName(x.id));}),
    ["Meal 1","Meal 2","Snacks","Meal 3","Supplements"],"Meal 3 keeps its number after the snack");
  eq(await page.$$eval(".bnum",a=>a.map(e=>e.textContent)),["1","2","","3",""],"badges follow the names");
  await page.tap(".toast-undo");await pause(page);
  eq(await ev(page,"JSON.stringify(S.goals)"),before,"Undo restores the targets");
});
await test("PDF plan: everything can be changed on the review before it is used",async page=>{
  await coach(page,"food","plan");
  await page.tap('[data-pimport]');await pause(page);
  await page.setInputFiles("#pi_file",new URL("./fixtures/plan-sample.pdf",import.meta.url).pathname);
  for(let i=0;i<60&&!(await page.$(".picard"));i++)await pause(page,250);
  /* A meal renamed, a food dropped, an amount changed, a target changed. */
  await page.fill("#pm_n_0","Breakfast bowl");
  const dropped=await ev(page,"V.pparse[1].items[0].n");
  await page.evaluate(()=>document.querySelector('[data-pirm="1|0"]').click());await pause(page,200);
  eq(await ev(page,"V.pparse[1].items.map(i=>i.n).indexOf("+JSON.stringify(dropped)+")"),-1,"dropped");
  const k0=await ev(page,"V.pparse[0].items[0].kcal"),g0=await ev(page,"V.pparse[0].items[0].grams");
  /* Tapping the food opens it on the servings screen; set it in grams and update. */
  await page.evaluate(()=>document.querySelector('[data-editfood="imp|0|0"]').click());await pause(page,500);
  await page.selectOption("#afsrv","ug");await pause(page,300);
  await page.fill("#afamt",String(g0*2));await pause(page,200);
  await page.evaluate(()=>document.querySelector("[data-fupdate]").click());await pause(page,300);
  eq(await ev(page,"[V.pparse[0].items[0].grams,Math.abs(V.pparse[0].items[0].kcal-"+(k0*2)+")<=2]"),[g0*2,true],"the amount and its calories");
  await page.fill("#pt_kcal","2100");
  /* A food added to a meal of the draft, from the same search as logging. */
  const n2=await ev(page,"V.pparse[2].items.length");
  await page.evaluate(()=>document.querySelector('[data-piadd="2"]').click());await pause(page,500);
  eq(await page.$eval(".afsub",e=>e.textContent),"Into the plan for Snacks","the sheet says where it goes");
  await page.fill("#fq","banana");await pause(page,600);
  await page.evaluate(()=>document.querySelector("[data-quickfood]").click());await pause(page,400);
  eq(await ev(page,"[V.pparse[2].items.length,V.pimport,!!V.sheet]"),[n2+1,true,false],"added to the draft, still reviewing");
  await page.tap("[data-puse]");await pause(page,500);
  eq(await ev(page,"S.goals.kcal"),2100,"the changed target");
  eq(await page.evaluate(async()=>{const M=await import("/js/engine/meals.js");return M.mealName(M.mealSlots()[0].id);}),"Breakfast bowl","the renamed meal");
});
await test("Food: an amount in tablespoons shows its figure, and + and − change it, typed or not",async page=>{
  await tapTab(page,"food");await pause(page);
  await page.tap('.btn.fadd');await pause(page,800);
  await page.fill('#fq','white rice');await pause(page,900);
  await page.evaluate(()=>document.activeElement.blur());await pause(page,200);
  await page.evaluate(()=>document.querySelector('#sheet [data-fpick]').click());await pause(page,500);
  await page.selectOption("#afsrv","utbsp");await pause(page,400);
  /* The figure fits its box: no padding eats it, nothing is cut off. */
  const box=()=>page.$eval("#afamt",e=>{const s=getComputedStyle(e);
    return {v:e.value,pad:s.paddingLeft,fits:e.clientWidth>0&&e.scrollWidth<=e.clientWidth+1,w:e.clientWidth};});
  const b0=await box();
  if(!(+b0.v>0))throw new Error("no amount: "+JSON.stringify(b0));
  eq([b0.pad,b0.fits],["0px",true],"the figure shows ("+JSON.stringify(b0)+")");
  await page.tap('#sheet [data-fcount="1"]');await pause(page,300);
  const b1=await box();
  eq([+b1.v,b1.fits],[Math.floor(+b0.v)+1,true],"+ adds a tablespoon, and shows it");
  /* Typed, then stepped with the keyboard still up: the box follows the step. */
  await page.fill("#afamt","5");await pause(page,300);
  await page.evaluate(()=>document.querySelector('#sheet [data-fcount="1"]').click());await pause(page,300);
  eq(await page.evaluate(()=>[document.activeElement.id,document.getElementById("afamt").value]),["afamt","6"],"the typed box takes the step");
  await page.evaluate(()=>document.querySelector('#sheet [data-fcount="-1"]').click());await pause(page,300);
  eq((await box()).v,"5","and − takes it back");
});
/* iPhone Safari scrolls the page to bring a tapped field above the keyboard; a sheet
   pinned to what is visible then moved against it, and jumped up and down with every
   field (js/ui/keyboard.js). Chromium has no such keyboard, so the visible part is made
   short the way the keyboard makes it, and the tap is an iPhone's. */
const IPHONE="Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
/* A tap as an iPhone delivers it, on el at (x, y), or a scroll when moved: whether the
   page was told not to handle it itself. */
const touch=(page,sel,dy=0)=>page.evaluate(([sel,dy])=>{const el=document.querySelector(sel),b=el.getBoundingClientRect(),x=b.x+8,y=b.y+b.height/2;
  const mk=(t,yy)=>new TouchEvent(t,{bubbles:true,cancelable:true,
    touches:t==="touchend"?[]:[new Touch({identifier:1,target:el,clientX:x,clientY:yy})],
    changedTouches:[new Touch({identifier:1,target:el,clientX:x,clientY:yy})]});
  el.dispatchEvent(mk("touchstart",y));if(dy)el.dispatchEvent(mk("touchmove",y+dy));
  const end=mk("touchend",y+dy);el.dispatchEvent(end);return end.defaultPrevented;},[sel,dy]);
await test("Keyboard (iPhone): a field in a sheet takes a tap without the page scrolling, and the sheet brings it into view",async page=>{
  await page.evaluate(async()=>{(await import("/js/ui/actions.js")).openSheet("manual",{name:"",meal:"Breakfast"});});await pause(page,600);
  const y0=await page.evaluate(()=>scrollY);
  /* The keyboard is up: what is visible ends 420 px down. */
  await page.evaluate(()=>document.documentElement.style.setProperty("--vvh","420px"));await pause(page,200);
  await page.evaluate(()=>{document.querySelector("#sheet .sheetbox").scrollTop=0;});
  /* The tap is the app's to answer: Safari is not left to scroll the page for it. */
  eq(await touch(page,'label[for="mf_f"] .aftile-k'),true,"the tap is taken");
  await pause(page,900);
  eq(await page.evaluate(()=>{const f=document.getElementById("mf_f"),b=f.getBoundingClientRect();
    return [document.activeElement&&document.activeElement.id,f.style.transform,Math.round(b.top)>=0&&Math.round(b.bottom)<=420,scrollY];}),
    ["mf_f","",true,y0],"Fat has the focus, back in place, in sight above the keys, the page where it was");
  /* The next field by the keyboard's arrow: brought into view by the sheet. */
  await page.evaluate(()=>{document.querySelector("#sheet .sheetbox").scrollTop=0;});
  await page.evaluate(async()=>{const K=await import("/js/ui/keyboard.js");const f=document.getElementById("mf_f");K.reveal(f);});
  eq(await page.evaluate(()=>{const b=document.getElementById("mf_f").getBoundingClientRect();return Math.round(b.top)>=0&&Math.round(b.bottom)<=420;}),true,"revealed in the sheet");
  /* A finger that scrolls the sheet does not open the keyboard on the field it lifts over. */
  await page.evaluate(()=>document.activeElement.blur());await pause(page,200);
  eq(await touch(page,"#mf_n",-60),false,"a scroll is the browser's");
  eq(await page.evaluate(()=>document.activeElement&&document.activeElement.id||""),"","no focus from a scroll");
},{ua:IPHONE});
await test("Keyboard: other phones keep the browser's own handling of a tapped field",async page=>{
  await page.evaluate(async()=>{(await import("/js/ui/actions.js")).openSheet("manual",{name:"",meal:"Breakfast"});});await pause(page,600);
  eq(await touch(page,'label[for="mf_f"] .aftile-k'),false,"left to the browser");
});
await test("Supplement doses: mg, mcg and IU are read as doses",async page=>{
  const r=await page.evaluate(async()=>{
    const N=await import("/js/engine/nutrition.js"),P=await import("/js/engine/planparse.js");
    await new Promise(res=>N.loadFoods(res));
    return P.parsePlan("Supplements:\n200 mg magnesium\n2000 IU vitamin D3\n100 mcg vitamin K2\n1 softgel omega 3\n1 tablet zinc")[0].items.map(i=>i.n+"|"+i.label);});
  eq(r,["Magnesium (Glycinate or Citrate)|200 mg","Vitamin D3|2,000 IU","Vitamin K2 (MK-7)|100 mcg","Omega-3 Fish Oil|1 × softgel","Zinc|1 × tablet"]);
});
await test("Bodyweight lifts: the box is added weight, and body weight counts in volume and records",async page=>{
  const r=await page.evaluate(async()=>{
    const F=await import("/js/engine/formulas.js"),X=await import("/js/data/exercises.js");
    await new Promise(res=>X.loadExDB(res));
    const s={date:"2030-01-01",entries:[{name:"Pullups",sets:[{w:0,r:8},{w:10,r:5}]},{name:"Pushups",sets:[{w:0,r:20}]},{name:"Plank",sets:[{w:0,r:60}]}]};
    return [F.loadOf("Pullups",0,"2030-01-01"),F.loadOf("Pullups",10,"2030-01-01"),F.loadOf("Pullups",84,"2030-01-01"),
      Math.round(F.sessionVolume(s)),F.loadText("Pullups",0),F.loadText("Pullups",10),F.bwShare("Plank")];});
  /* Body weight 84 (the seed): 84×8 + 94×5 + 84×0.65×20, and the plank scores nothing. */
  eq(r,[84,94,84,Math.round(84*8+94*5+54.6*20),"BW","BW + 10 kg",0]);
  await startWorkout(page);
  await page.evaluate(async()=>{const V=(await import("/js/ui/view.js")).V;V.sd={addlive:true};(await import("/js/ui/actions.js")).addExercise("Pullups");});
  await pause(page,400);
  const last=await ev(page,"S.active.entries.length-1");
  await page.tap('[data-exlist]');await pause(page,400);await page.tap('#sheet [data-jumpl="'+last+'"]');await pause(page,400);
  eq(await page.$eval('label[for="in_w"]',e=>e.firstChild.textContent),"Added weight","the weight box says it is added weight");
  if(!(await page.$(".bwnote")))throw new Error("no note on what +KG means");
  await page.fill('#in_w','0');await page.fill('#in_r','9');await page.tap('[data-logset]');await pause(page,900);
  eq(await ev(page,"S.active.entries[S.active.entries.length-1].sets[0].w"),0,"logged as body weight alone");
},{prefs:{autorest:false}});
await test("Bodyweight lifts: done only at body weight, more reps is a record, and last time reads in reps",async page=>{
  await page.evaluate(async()=>{const st=await import("/js/state.js");
    st.S.sessions=[{id:"bw1",date:"2026-01-05",dayId:"x",entries:[{name:"Pullups",sets:[{w:0,r:10},{w:0,r:8}]}]}];st.saveDB();});
  eq(await F(page,`F.recommend({name:"Pullups",planned:{sets:3,lo:6,hi:12}}).last`),"10","last time: the best reps, not the 0 added");
  await startWorkout(page);
  await page.evaluate(async()=>{const V=(await import("/js/ui/view.js")).V;V.sd={addlive:true};(await import("/js/ui/actions.js")).addExercise("Pullups");});
  await pause(page,400);
  const last=await ev(page,"S.active.entries.length-1");
  await page.tap('[data-exlist]');await pause(page,400);await page.tap('#sheet [data-jumpl="'+last+'"]');await pause(page,400);
  await page.fill('#in_w','0');await page.fill('#in_r','12');await page.tap('[data-logset]');await pause(page,300);
  const msg=await page.$eval(".toast",e=>e.innerText);
  if(msg.indexOf("\u{1F3C6}")<0||msg.indexOf("BW \u00d7 12")<0)throw new Error("no record toast for 0 × 12 after 0 × 10: "+msg);
},{prefs:{autorest:false}});
await test("Exercises: a sideways swipe moves between them; a nudge or a vertical drag does not; arrows, list and segments agree",async(page,env)=>{
  await startWorkout(page);
  const cdp=await env.ctx.newCDPSession(page);
  const drag=async(x0,y0,x1,y1,steps=12)=>{
    await cdp.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x:x0,y:y0}]});
    for(let i=1;i<=steps;i++){await cdp.send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:[{x:x0+(x1-x0)*i/steps,y:y0+(y1-y0)*i/steps}]});await page.waitForTimeout(16);}
    await cdp.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});await page.waitForTimeout(650);};
  const idx=()=>ev(page,"V.logIdx");
  await drag(300,520,80,525);eq(await idx(),1,"swipe left: next");
  await drag(300,520,250,522);eq(await idx(),1,"a nudge springs back");
  await drag(200,420,240,720);eq(await idx(),1,"a vertical drag scrolls");
  await drag(80,520,320,525);eq(await idx(),0,"swipe right: previous");
  await drag(80,520,320,525);eq(await idx(),0,"the first exercise resists");
  await drag(10,520,300,525);eq(await idx(),0,"not from the screen edge");
  /* The arrows and segments are gone (workout-spec.md): the next exercise is named on the
     screen and one tap away; the list from the title reaches any of them. */
  eq(await page.$eval('.wexl-nx b',e=>e.textContent),await ev(page,"(async()=>(await import('/js/i18n/exnames.js')).exName(S.active.entries[1].name))()"),"the next one is named");
  await page.tap('.wexl-nx');await pause(page,400);eq(await idx(),1,"next exercise");
  await page.tap('[data-exlist]');await pause(page,400);await page.tap('#sheet [data-jumpl="0"]');await pause(page,400);eq(await idx(),0,"back by the list");
  await page.tap('[data-exlist]');await pause(page,400);
  eq(await page.$$eval("#sheet .exl-row",a=>a.length),await ev(page,"S.active.entries.length"),"the list has every exercise");
  await page.tap('#sheet [data-jumpl="2"]');await pause(page,400);eq([await idx(),await ev(page,"!!V.sheet")],[2,false],"list jump");
  await page.tap('.wexl-nx');await pause(page,400);eq(await idx(),3,"next from there");
  /* Looking ahead does not end a rest. */
  await page.fill('#in_r','8');await page.tap('[data-logset]');await pause(page,900);
  await page.tap('.wexl-nx');await pause(page,400);
  eq(await ev(page,"V.restEnd>Date.now()"),true,"the rest keeps running");
},{prefs:{autorest:true,anim:true}});
async function dockTest(page,slide){
  const st=()=>page.evaluate(()=>{const n=document.getElementById("nav"),d=n.querySelector(".dock");
    return {away:n.classList.contains("dhid")?"1":"0",gone:d.getBoundingClientRect().top>=innerHeight||getComputedStyle(d).opacity==="0",
      taps:getComputedStyle(d).pointerEvents!=="none",y:Math.round(scrollY),dt:parseInt(n.style.getPropertyValue("--dt"))||0};});
  const scroll=async(dy,n)=>{for(let i=0;i<n;i++){await page.evaluate(d=>window.scrollBy(0,d),dy);await page.waitForTimeout(16);}};
  const settle=()=>pause(page,650);
  await tapTab(page,"progress");await pause(page);
  await scroll(10,3);await settle();
  eq((await st()).away,"0","a little scroll near the top leaves it");
  await scroll(15,10);await settle();
  let s=await st();eq([s.away,s.gone,s.taps],["1",true,false],"scrolling down takes it away");
  /* A thumb adjusting is not asking for the dock. */
  await scroll(-10,3);await settle();eq((await st()).away,"1","a small turn back leaves it away");
  await scroll(-15,4);await settle();
  s=await st();eq([s.away,s.gone,s.taps],["0",false,true],"scrolling up brings it back");
  await scroll(15,10);await settle();eq((await st()).away,"1","down again");
  /* Safari resizes the viewport as its toolbar collapses on the way down. */
  await page.setViewportSize({width:390,height:900});await pause(page,300);
  eq((await st()).away,"1","a viewport resize mid-scroll leaves it away");
  await page.setViewportSize({width:390,height:844});await pause(page,300);
  /* A sheet pins the page and puts it back; neither jump is the user scrolling. */
  const y=(await st()).y;
  await page.evaluate(async()=>{(await import("/js/ui/actions.js")).openSheet("backup");});await pause(page,400);
  await page.evaluate(async()=>{(await import("/js/ui/actions.js")).closeSheet();});await settle();
  s=await st();eq([s.away,s.y],["1",y],"a sheet opening and closing leaves it as it was");
  /* The bottom of the page is not a request for the dock; scrolling up is. */
  await scroll(40,40);await settle();
  s=await st();eq([s.away,s.y>=await page.evaluate(()=>document.documentElement.scrollHeight-innerHeight-1)],["1",true],"at the bottom it stays away");
  /* The page getting shorter under the reader carries the position up with it. */
  await page.evaluate(()=>{const d=document.createElement("div");d.id="tallpad";d.style.height="700px";document.getElementById("app").appendChild(d);});
  await scroll(40,25);await settle();
  await page.evaluate(()=>document.getElementById("tallpad").remove());await settle();
  eq((await st()).away,"1","a page that shrinks at the bottom leaves it away");
  await scroll(-15,4);await settle();eq((await st()).away,"0","scrolling up from the bottom brings it back");
  await scroll(15,10);await settle();
  await page.evaluate(()=>window.scrollTo(0,0));await settle();
  eq((await st()).away,"0","at the top it is back");
  if(slide){
    /* It moves by a transition of transform alone, which the compositor runs. */
    eq(await page.evaluate(()=>getComputedStyle(document.querySelector("#nav .dock")).transitionProperty),"transform","what moves");
    /* The move keeps the scroll's pace: slower for a slow scroll, quicker for a flick. */
    await scroll(3,45);await settle();
    s=await st();eq(s.away,"1","a slow scroll takes it away too");
    const slow=s.dt;
    await scroll(-60,3);await settle();
    s=await st();eq(s.away,"0","a flick up brings it back");
    const quick=s.dt;
    if(!(slow>quick&&slow<=520&&quick>=300))throw new Error("pace: slow "+slow+"ms, quick "+quick+"ms");
  }
}
await test("Press: a finger starting a scroll never flashes what it lands on; a held press and a quick tap still show",async(page,env)=>{
  await coach(page,"train","exercises");await pause(page,500);
  const cdp=await env.ctx.newCDPSession(page);
  const touch=(type,x,y)=>cdp.send("Input.dispatchTouchEvent",{type,touchPoints:type==="touchEnd"?[]:[{x,y}]});
  const b=await (await page.$(".ttile")).boundingBox();
  const x=b.x+b.width/2,y=b.y+b.height/2;
  const lit=()=>page.evaluate(()=>document.querySelector(".ttile").classList.contains("tapd"));
  /* A scroll: the finger lands and moves at once. */
  await page.evaluate(()=>{window.__clk=0;document.addEventListener("click",()=>window.__clk++,true);});
  await touch("touchStart",x,y);await page.waitForTimeout(30);
  eq(await lit(),false,"not on landing");
  for(let i=1;i<=6;i++){await touch("touchMove",x,y-i*8);await page.waitForTimeout(16);}
  await page.waitForTimeout(150);eq(await lit(),false,"never, once it moved");
  await touch("touchEnd");await page.waitForTimeout(200);
  eq(await page.evaluate(()=>window.__clk),0,"the scroll was not a tap");
  /* A held press shows once the finger has rested. */
  await touch("touchStart",x,y);await page.waitForTimeout(150);
  eq(await lit(),true,"a resting finger presses");
  eq(await page.evaluate(()=>getComputedStyle(document.querySelector(".ttile")).transform!=="none"),true,"the press look applies");
  await touch("touchMove",x,y-30);await page.waitForTimeout(30);
  eq(await lit(),false,"and lets go when it turns into a scroll");
  await touch("touchEnd");await page.waitForTimeout(200);
  eq(await page.evaluate(()=>window.__clk),0,"no tap came of it");
  /* A quick tap answers as it lifts, then the tap goes through. */
  await page.evaluate(()=>{window.__lit=0;new MutationObserver(m=>{if(m.some(r=>r.target.classList.contains("tapd")))window.__lit++;})
    .observe(document.getElementById("app"),{attributes:true,attributeFilter:["class"],subtree:true});});
  await touch("touchStart",x,y);await page.waitForTimeout(20);await touch("touchEnd");
  await page.waitForTimeout(500);
  eq([await page.evaluate(()=>window.__lit>0),await page.evaluate(()=>window.__clk),await page.evaluate(()=>document.querySelectorAll(".tapd").length)],[true,1,0],"a quick tap flashes once and goes through");
  /* With a mouse it is plain :active again. */
  eq(await page.evaluate(()=>document.documentElement.classList.contains("tch")),true);
},{prefs:{anim:true}});
await test("Scrolling never waits on script: no page-wide touch or wheel listener can block it",async(page,env)=>{
  await startWorkout(page);
  const cdp=await env.ctx.newCDPSession(page);
  const urls={};cdp.on("Debugger.scriptParsed",e=>{urls[e.scriptId]=e.url||"(inline)";});
  await cdp.send("Debugger.enable");
  const bad=[];
  for(const expr of ["document","window","document.body","document.getElementById('app')"]){
    const {result}=await cdp.send("Runtime.evaluate",{expression:expr});
    const {listeners}=await cdp.send("DOMDebugger.getEventListeners",{objectId:result.objectId});
    /* The app's own listeners only: the test driver injects scripts with no address. */
    listeners.filter(l=>/^(touchstart|touchmove|wheel|mousewheel)$/.test(l.type)&&!l.passive&&/^http/.test(urls[l.scriptId]||""))
      .forEach(l=>bad.push(expr+" "+l.type+" @"+urls[l.scriptId]+":"+l.lineNumber));}
  eq(bad,[],"blocking listeners");
  /* The exercise pane is the one place that may hold a scroll, for a sideways drag. */
  const {result}=await cdp.send("Runtime.evaluate",{expression:"document.querySelector('[data-exswipe]')"});
  const {listeners}=await cdp.send("DOMDebugger.getEventListeners",{objectId:result.objectId});
  eq(listeners.filter(l=>l.type==="touchmove"&&!l.passive).length,1,"the pane's own");
});
for(const online of [false,true])await test("Exercise photos: a re-render keeps each one as it was — "+(online?"loaded photos get no shimmer back":"offline, the glyphs do not blink and nothing is fetched again"),async(page,env)=>{
  const png=fs.readFileSync(new URL("../icon-180.png",import.meta.url));
  await env.ctx.route(/cdn\.jsdelivr\.net/,r=>online?r.fulfill({status:200,contentType:"image/png",body:png}):r.abort());
  let fetches=0;page.on("request",r=>{if(/jsdelivr/.test(r.url()))fetches++;});
  await page.evaluate(async()=>{const V=(await import("/js/ui/view.js")).V;V.tab="coach";V.train="library";(await import("/js/ui/render.js")).render();});
  await pause(page,2000);
  const st=()=>page.evaluate(()=>[...document.querySelectorAll(".thumbwrap")].slice(0,10).map(w=>w.className).join());
  const before=await st(),f0=fetches;
  if(!/failed|thumbwrap(,|$)/.test(before))throw new Error("photos did not settle: "+before);
  await page.evaluate(async()=>{(await import("/js/ui/render.js")).render();});
  eq(await st(),before,"right after a render");
  await pause(page,600);
  eq([await st(),fetches],[before,f0],"and after");
});
await test("Exercise library: draws 40 rows and more as the end comes into view; a filter starts it over",async page=>{
  await tapTab(page,"train");await pause(page);
  await page.evaluate(async()=>{const V=(await import("/js/ui/view.js")).V;V.tab="coach";V.train="library";(await import("/js/ui/render.js")).render();});
  await pause(page,400);
  const rows=()=>page.evaluate(()=>document.querySelectorAll(".libtrow").length);
  eq(await rows(),40,"first draw");
  await page.evaluate(()=>{document.querySelector(".libtrow")._mark=1;});
  for(let i=0;i<6;i++){await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));await pause(page,250);}
  const grown=await rows();
  if(!(grown>=80))throw new Error("expected the list to grow on scroll, got "+grown);
  eq(await page.evaluate(()=>{const r=document.querySelectorAll(".libtrow");return new Set([...r].map(e=>e.dataset.k)).size===r.length;}),true,"no row twice");
  /* The rows already drawn were kept, not redrawn. */
  eq(await page.evaluate(()=>document.querySelector(".libtrow")._mark),1,"first row kept");
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.tap('[data-exm="Chest"]');await pause(page,400);
  eq(await rows(),40,"a filter starts the list over");
  /* The marker works as a button too, should it ever be tapped before it is seen. */
  const before=await rows();
  await page.evaluate(()=>document.querySelector("[data-more]").click());await pause(page,300);
  if(!((await rows())>before))throw new Error("Show more did nothing");
});
await test("Back never walks out of the app, even when a screen opens while a tab tap is still unwinding",async page=>{
  const ix=()=>page.evaluate(()=>navigation.currentEntry.index);
  const base=await ix();
  const run=f=>page.evaluate(async f=>{const N=await import("/js/ui/nav.js");const V=(await import("/js/ui/view.js")).V;const R=await import("/js/ui/render.js");eval(f);},f);
  await run("N.pushNav();V.tab='train';V.train='library';R.render();N.pushNav();V.train='favs';R.render();");
  await pause(page,200);
  eq(await ix(),base+2,"two screens deep");
  /* A tab tap, and a screen opened before its unwind has landed. */
  await run("N.resetNav();V.tab='progress';V.train='days';R.render();N.pushNav();V.phist=true;R.render();");
  await pause(page,900);
  eq(await ix(),base+1,"one screen deep, written after the unwind");
  await page.evaluate(()=>history.back());await pause(page,400);
  eq([await ix(),await ev(page,"!!V.phist")],[base,false],"back returns to Progress");
  /* At the root, back is held off and the spare entry stays, however often it is tried. */
  for(let i=0;i<3;i++){await page.evaluate(()=>history.back());await pause(page,400);}
  eq([await ix(),await ev(page,"V.tab")],[base,"progress"],"still in the app");
});
await test("Training import: a coach's PDF becomes a draft — days, week, cues, start weights, a block — edited, then a program",async page=>{
  await coach(page,"train","programs");
  await page.evaluate(()=>document.querySelector("[data-timport]").click());await pause(page,300);
  await page.setInputFiles("#ti_file",new URL("./fixtures/split-sample.pdf",import.meta.url).pathname);
  await page.waitForSelector(".tisum",{timeout:20000});await pause(page,300);
  const tp=await ev(page,"V.tp");
  eq([tp.name,tp.meta.phase,tp.meta.weeks],["Upper / Lower","Muscle gain",8],"cover");
  eq(tp.days.map(d=>[d.name,d.wd]),[["Day A — Upper",[1]],["Day B — Lower",[4]]],"days and weekdays");
  eq(tp.acts.map(a=>[a.name,a.wd]),[["Walking",[2]],["Running",[6]]],"the week's activities");
  const A=tp.days[0].ex,B=tp.days[1].ex;
  eq([A[0].name,A[0].sets,A[0].lo,A[0].hi,A[0].rest,A[0].w0,A[0].note],["Barbell Incline Bench Press - Medium Grip",3,6,8,120,50,"Two warm-up sets first"],"a row and its cue");
  eq([A[3].name,A[3].amrap,A[3].altName],["Chin-Up",true,"Standing Biceps Cable Curl"],"max reps, and the other choice");
  eq([A[4].timed,A[4].side,A[4].lo,A[4].hi],[true,true,30,45],"a timed hold, each side");
  eq([A[5].conf,A[6].name,A[6].raw],["close","","Tib Raise"],"a close match is marked; an unknown name is kept as written");
  eq(B.slice(0,3).map(e=>[e.name,e.wk||null]),[["Knee-to-Wall Ankle Mobilisation",[1,8]],["Single-Leg Balance",[5,8]],["Couch Stretch",null]],"the block, in its place, with its weeks");
  eq(B[0].note.indexOf("First, while you are fresh")===0,true,"the block row's cue goes to its first exercise");
  eq(tp.notes.map(n=>n.h),["THE THREE RULES","BEFORE YOU START"],"the coach's notes");
  /* Edited before it is saved: an exercise, a weekday, an activity. */
  await page.evaluate(()=>document.querySelector('[data-tiex="0|1"]').click());await pause(page,300);
  await page.fill("#tie_sets","4");await page.fill("#tie_note","Pause at the top");
  await page.evaluate(()=>document.querySelector("[data-tiexsave]").click());await pause(page,300);
  eq(await ev(page,"[V.tp.days[0].ex[1].sets,V.tp.days[0].ex[1].note]"),[4,"Pause at the top"],"edited");
  await page.selectOption("#ti_wd_5","d:1");await pause(page,200);
  eq(await ev(page,"V.tp.days[1].wd"),[4,5],"a weekday moved to a day");
  await page.evaluate(()=>document.querySelector('[data-tirmact="1"]').click());await pause(page,200);
  eq(await ev(page,"V.tp.acts.map(a=>a.name)"),["Walking"],"an activity dropped");
  const before=await ev(page,"S.activeProgram");
  await page.evaluate(()=>document.querySelector("[data-tiuse]").click());await pause(page,500);
  const p=await ev(page,"(()=>{const p=S.programs.filter(x=>x.id===S.activeProgram)[0];return {name:p.name,sched:p.schedule,days:p.days.map(d=>[d.name,d.wd,d.ex.length]),notes:p.notes.length,start:!!p.start}})()");
  eq(p,{name:"Upper / Lower",sched:"week",days:[["Day A — Upper",[1],7],["Day B — Lower",[4,5],6],["Walking",[2],1]],notes:2,start:true},"the program");
  eq(await ev(page,"S.myEx.map(m=>[m.n,m.m])"),[["Tib Raise","Calves"]],"the unknown name joins as your own");
  eq(await ev(page,"[V.tab,V.csec,V.ctsub]"),["coach","train","program"],"lands on My program");
  /* In a workout: week 1 leaves out what belongs to weeks 5–8; the plan's start
     weight and cue are there; the other choice is one tap. */
  await page.evaluate(async()=>{const S=(await import("/js/state.js")).S,p=S.programs.filter(x=>x.id===S.activeProgram)[0];(await import("/js/ui/actions.js")).startDay(p.days[1].id);});await pause(page,400);
  eq(await ev(page,"S.active.entries.map(e=>e.name).indexOf('Single-Leg Balance')"),-1,"not before week 5");
  await page.evaluate(async()=>{(await import("/js/ui/actions.js")).ACT.discard();});await pause(page,200);
  await page.evaluate(async()=>{const S=(await import("/js/state.js")).S,p=S.programs.filter(x=>x.id===S.activeProgram)[0];(await import("/js/ui/actions.js")).startDay(p.days[0].id);});await pause(page,400);
  eq(await ev(page,"[V.draft.w,S.active.entries[0].planned.note]"),[50,"Two warm-up sets first"],"start weight and cue");
  eq(await page.$eval(".sc-cue",e=>e.textContent),"Two warm-up sets first");
  await page.evaluate(async()=>{(await import("/js/ui/workout.js")).jumpTo(3);});await pause(page,300);
  await page.evaluate(()=>document.querySelector("[data-swapalt]").click());await pause(page,300);
  eq(await ev(page,"[S.active.entries[3].name,S.active.entries[3].alt,S.active.entries[3].planned.amrap]"),["Standing Biceps Cable Curl","Chin-Up",true],"swapped for the other choice");
  eq(before!==await ev(page,"S.activeProgram"),true);
});
/* ---- warm-up and cool-down --------------------------------------------------------- */
await test("Warm-up engine: drills follow what the day trains, ramp sets lead to the working weight, a walk needs none",async page=>{
  const r=await page.evaluate(async()=>{
    const X=await import("/js/data/exercises.js");await new Promise(r=>X.loadExDB(r));
    const W=await import("/js/engine/warmup.js");
    const day=n=>n.map(x=>({name:x,planned:{sets:3}}));
    const push=W.warmupFor(day(["Barbell Bench Press - Medium Grip","Seated Dumbbell Press","Triceps Pushdown"]),{work:e=>/Bench/.test(e.name)?80:0});
    const legs=W.warmupFor(day(["Barbell Squat","Romanian Deadlift","Standing Calf Raises"]),{work:()=>0});
    const LOW=/Leg Swings|Knee Hug|Quad Pull|Lateral Lunge|Bodyweight Squat|Ankle|Spiderman|Glute|Pogo/;
    const cool=W.cooldownFor(day(["Barbell Squat","Romanian Deadlift"]));
    return [push.drills.some(d=>LOW.test(d.name)),push.drills.length>=4,push.ramp.name,push.ramp.sets.map(s=>s.w+"x"+s.r).join(","),
      legs.drills.filter(d=>LOW.test(d.name)).length>=3,legs.ramp.sets.length,
      W.warmupFor(day(["Walking"])),cool.stretches.map(s=>s.name).includes("Hamstring Stretch"),
      cool.stretches.some(s=>/Chest|Triceps|Shoulder/.test(s.name)),
      W.warmupFor(day(["Football"])).drills.some(d=>d.name==="High Knees")];});
  eq(r,[false,true,"Barbell Bench Press - Medium Grip","20x10,40x5,60x3",true,0,null,true,false,true]);
});
await test("Warm-up: shown before the first exercise; ticks and a hold timer; Start goes to the work; ⋯ brings it back",async page=>{
  await startWorkout(page);
  if(!(await page.$('.wu'))||(await page.$('.wsc')))throw new Error("the warm-up is not the first screen");
  eq(await page.$$eval('.wu-rs',a=>a[0].textContent),"20 kg × 10","ramp starts with the bar");
  await page.tap('.wu [data-wutick]:not([data-wutick="wp"])');await pause(page);
  eq(await page.$eval('.wu [data-wutick]:not([data-wutick="wp"])',b=>b.getAttribute("aria-pressed")),"true","ticked");
  /* The pulse raiser's timer, shortened so the test does not wait four minutes. */
  await page.$eval('[data-hold="wp"]',b=>b.setAttribute("data-secs","1"));
  await page.tap('[data-hold="wp"]');await pause(page,300);
  eq(await page.$eval('[data-hold="wp"]',b=>b.classList.contains("timing")),true,"counting");
  await pause(page,1200);
  eq(await ev(page,"[S.active.wuDone.wp,document.querySelector('.wu-pulse').classList.contains('did')]"),[1,true],"ticked when it ends");
  await page.tap('[data-wugo]');await pause(page);
  eq(await ev(page,"[S.active.warm,!!document.querySelector('.wsc'),!!document.querySelector('.wu')]"),[1,true,false],"started");
  await page.tap('[data-sessmore]');await pause(page);await page.tap('#sheet [data-wuopen]');await pause(page);
  if(!(await page.$('.wu')))throw new Error("the menu did not bring the warm-up back");
  await page.tap('[data-wuskip]');await pause(page);
  eq(await ev(page,"[S.active.warm,!!document.querySelector('.wsc')]"),[0,true],"back to the work");
},{prefs:{nowarm:false}});
await test("Warm-up, quicker: the name ticks and the next comes into view; the pulse timer shows at the bottom only when its row is away; the ramp-up sets are on the lift as warm-ups, filled in",async page=>{
  await startWorkout(page);
  const first=await page.$$eval('.wu2 .wu-ex[data-wutick]:not([data-wutick="wp"])',a=>a[0].dataset.wutick);
  await page.tap('.wu2 .wu-ex[data-wutick="'+first+'"]');await pause(page);
  eq(await ev(page,"!!S.active.wuDone["+JSON.stringify(first)+"]"),true,"tapping the name ticks it");
  if(!(await page.$('.wu2 .wu-info[data-exdetail]')))throw new Error("no ⓘ for how to do it");
  eq(await page.$eval('.wu-skip',b=>b.textContent),"Skip warm-up","says what it skips");
  await page.tap('[data-hold="wp"].wu-pulse, .wu-pulse [data-hold="wp"]');await pause(page,500);
  eq(await page.$eval('.wu-hold-mini',b=>getComputedStyle(b).display),"none","its row in view: no second timer");
  await page.setViewportSize({width:390,height:560});
  await page.evaluate(()=>window.scrollTo(0,99999));await pause(page,600);
  eq(await page.$eval('.wu-hold-mini',b=>getComputedStyle(b).display),"flex","scrolled away: it waits at the bottom");
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.scrollTo(0,0));
  const ramp=await page.$$eval('.wu-rs:not(.work) b',a=>a.length);
  await page.tap('[data-wugo]');await pause(page,500);
  const e=await ev(page,"[S.active.entries[0].wuq,S.active.entries[0].wuRamp.length,V.draft.w,V.draft.r]");
  eq([e[0],e[1]],[ramp,ramp],"one warm-up row for each ramp-up set");
  eq(e[2],await ev(page,"S.active.entries[0].wuRamp[0].w"),"the first filled in with its weight");
  await page.tap('[data-logset]');await pause(page,900);
  eq(await ev(page,"[S.active.entries[0].sets[0].wu,V.draft.w===S.active.entries[0].wuRamp[1].w]"),[true,true],"logged as a warm-up; the next ramp set comes next");
},{prefs:{nowarm:false}});
await test("The workout, simpler: ⋯ holds only what is nowhere else; finishing early is the close button's; a barbell starts at the bar, steps by 2.5, never logs 0, and shows its plates",async page=>{
  await page.evaluate(async()=>{const sp=(await import("/js/state.js")).split(),X=await import("/js/data/exercises.js");
    sp.days.forEach(d=>{if(d.ex[0]){d.ex[0].name="Barbell Curl";d.ex[0].exId=X.exIdOf("Barbell Curl");}});});
  await startWorkout(page);
  eq(await ev(page,"V.draft.w"),20,"a first time on a barbell starts at the bar");
  await page.tap('[data-sstep="w"][data-d="-1"]');await pause(page,200);
  eq(await ev(page,"V.draft.w"),20,"and never steps below it");
  await page.tap('[data-sstep="w"][data-d="1"]');await pause(page,200);
  eq(await ev(page,"V.draft.w"),22.5,"one pair of the smallest plates");
  eq(await page.$eval('#scPl',b=>b.textContent.replace(/\s+/g," ").trim()),"Bar + 1.25 a side","the plates, under the weight");
  await page.fill('#in_w','60');await pause(page,200);
  eq(await page.$eval('#scPl',b=>b.textContent.replace(/\s+/g," ").trim()),"Bar + 20 a side","they follow what is typed");
  await page.fill('#in_w','0');await page.tap('[data-logset]');await pause(page,400);
  eq(await ev(page,"S.active.entries[0].sets.length"),0,"0 on a barbell is not logged");
  await page.tap('[data-sessmore]');await pause(page);
  const items=await page.$$eval('#sheet .list .item',a=>a.map(b=>Object.keys(b.dataset)[0]));
  eq(items,["note","wuopen","hurt","rmlive"],"note, the warm-up again, something hurts, remove: nothing that has its own button");
  if(await page.$('#sheet [data-finish],#sheet [data-discard],#sheet [data-coachopen],#sheet [data-exdetail],#sheet [data-plates]'))throw new Error("a duplicate in ⋯");
  if(await page.$('.sess .quiet'))throw new Error("the quiet links are still under the workout");
  await page.evaluate(async()=>{(await import("/js/ui/actions.js")).closeSheet();});await pause(page);
  await page.fill('#in_w','40');await page.fill('#in_r','8');await page.tap('[data-logset]');await pause(page,900);
  await finishEarly(page);
  eq(await ev(page,"[V.sheet,V.sd&&V.sd.act]"),["confirm","finishnow"],"the close button's Finish asks about the sets left");
  await page.tap('#sheet [data-confirmok]');await pause(page,600);
  eq(await ev(page,"[!!S.active,S.sessions[0].entries[0].sets[0].w]"),[false,40],"finished and saved");
},{prefs:{autorest:false}});
await test("Cool-down: stretches for what was trained on Workout complete, timed, with the how-to one tap away; both switch off",async page=>{
  await startWorkout(page);
  await page.tap('[data-wuskip]');await pause(page);
  await page.fill('#in_r','8');await page.tap('[data-logset]');await pause(page,500);
  await finishEarly(page);
  await page.tap('[data-confirmok]');await pause(page,600);
  const names=await page.$$eval('.cd .wu-n',a=>a.map(e=>e.textContent));
  if(!names.includes("Doorway Chest Stretch")||names.some(n=>/Quad|Hamstring|Calf|Pigeon/.test(n)))
    throw new Error("a bench set should end on upper-body stretches, got "+names.join(", "));
  await page.$eval('.cd [data-hold]',b=>b.setAttribute("data-secs","1"));
  await page.tap('.cd [data-hold]');await pause(page,1500);
  eq(await page.$eval('.cd .wu-row',r=>r.classList.contains("did")),true,"ticked when the hold ends");
  await page.tap('.cd .wu-info');await pause(page,500);
  eq(await ev(page,"V.sheet"),"exdetail");
  await page.tap('[data-exback]');await pause(page,400);
  eq(await ev(page,"[V.sheet,!!document.querySelector('.cd .wu-row.did')]"),["done",true],"back to the summary, tick kept");
  await page.tap('#sheet .wfin-done');await pause(page);
  /* Both are on by default and switched off in Training settings. */
  await page.evaluate(async()=>{(await import("/js/ui/actions.js")).openSheet("set_training");});await pause(page);
  await page.tap('[data-toggle="nowarm"]');await pause(page);await page.tap('[data-toggle="nocool"]');await pause(page);
  eq(await ev(page,"[S.prefs.nowarm,S.prefs.nocool]"),[true,true]);
  await page.tap('#sheet button[data-close]');await pause(page);
  /* Today is trained already, so the second workout is started directly. */
  await page.evaluate(async()=>{const St=await import("/js/state.js");(await import("/js/ui/actions.js")).startDay(St.split().days[0].id);});
  await pause(page,400);
  eq(await ev(page,"[!!S.active,!!document.querySelector('.wu')]"),[true,false],"no warm-up when off");
  await page.fill('#in_r','8');await page.tap('[data-logset]');await pause(page,500);
  await finishEarly(page);
  await page.tap('[data-confirmok]');await pause(page,600);
  eq(await ev(page,"[V.sheet,!!document.querySelector('.cd')]"),["done",false],"no cool-down when off");
},{prefs:{nowarm:false,autorest:false}});
await test("Arabic: the muscle Back reads ظهر, not the back button's رجوع",async page=>{
  await page.evaluate(async()=>{const V=(await import("/js/ui/view.js")).V;V.tab="coach";V.train="library";V.exm="Back";(await import("/js/ui/render.js")).render();});
  await pause(page,500);
  const s=await page.$eval('.libtrow .trow-s',e=>e.textContent);
  if(s.indexOf("ظهر")<0||s.indexOf("رجوع")>=0)throw new Error("library row reads "+s);
},{prefs:{lang:"ar"}});
/* ---- goals, the assessment and the generated plans ------------------------------- */
await test("Goals: one list drives the targets — deficit, surplus and protein follow the goal",async page=>{
  const r=await page.evaluate(async()=>{
    const S=(await import("/js/state.js")).S,F=await import("/js/engine/formulas.js");
    Object.assign(S.profile,{age:30,height:180,weight:84,sex:"m",activity:1.4});
    const out={};
    for(const g of ["lose","recomp","gain","strength","endurance","mobility","maintain"]){
      S.profile.goal=g;const m=F.macroTargets(),td=F.tdee();
      out[g]=[m.kcal-td,Math.round((m.kcal-td)/td*100),Math.round(m.p/84*10)/10,Math.abs(m.p*4+m.c*4+m.f*9-m.kcal)<=30];}
    return out;});
  /* The textbook's fixed 500 under and 350 over (to the nearest 10 kcal); recomposition,
     which it does not cover, a share of maintenance. */
  eq(Math.abs(r.lose[0]+500)<=10,true,"lose: 500 under");eq(Math.abs(r.gain[0]-350)<=10,true,"gain: 350 over");
  eq(r.recomp[1]<0&&r.recomp[1]>-15,true,"recomp");eq(r.maintain[1],0,"maintain");
  eq([r.lose[2],r.recomp[2],r.gain[2],r.endurance[2]],[2.4,2.4,1.8,1.6],"protein g/kg");
  eq(Object.values(r).every(x=>x[3]),true,"macros add up to the energy");
},{db:Object.assign(seed(),{body:[]})});
/* ---- no weight is never a default weight (owner, 20 Oct: the 86 kg fallback) ---------- */
function noWeight(){const d=seed();d.profile.weight=null;d.body=[];return d;}
await test("No weight: nothing is worked out, Targets asks for one, and the weigh-in saves only what is typed",async page=>{
  eq(await page.evaluate(async()=>{const F=await import("/js/engine/formulas.js");return [F.bmr(),F.tdee(),F.targetKcal(),F.macroTargets(),F.energyMissing()];}),
    [null,null,null,null,"no_weight"],"no BMR, maintenance, target or macros, and it says why");
  await coach(page,"food","targets");
  if(await page.$('[data-usesug]'))throw new Error("a suggestion offered with no weight");
  await page.tap('.tgneed [data-sheet="weigh"]');await pause(page);
  eq(await page.$eval('#in_bw',e=>e.value),"","the weigh-in starts empty, not at someone else's weight");
  await page.tap('[data-stp="bw"][data-d="0.1"]');await pause(page,200);
  eq(await ev(page,"V.draft.bw==null"),true,"+ has nothing to step from");
  await page.tap('[data-saveweight]');await pause(page);
  eq(await ev(page,"[S.body.length,V.sheet]"),[0,"weigh"],"nothing typed: nothing saved, the sheet stays");
  await page.fill('#in_bw','72');await page.tap('[data-saveweight]');await pause(page);
  eq(await ev(page,"S.body.map(b=>b.weight)"),[72],"what was typed is saved");
  if(!(await page.$('[data-usesug]'))&&!(await page.$('.tgsug')))throw new Error("no suggestion once there is a weight");
},{db:noWeight()});
await test("No weight: the You sheet shows none and saves none",async page=>{
  await page.evaluate(async()=>{(await import("/js/ui/actions.js")).openSheet("set_you");});await pause(page);
  eq(await page.$eval('#p_weight',e=>e.value),"","the weight field is empty");
  await page.fill('#p_age','40');await page.tap('[data-saveyou]');await pause(page);
  eq(await ev(page,"[S.profile.age,S.profile.weight>0]"),[40,false],"age saved, no weight invented");
},{db:noWeight()});
await test("No weight: the coach chat asks for one instead of working out calories",async page=>{
  const r=await page.evaluate(async()=>{const C=await import("/js/ui/views/chat.js");const S=(await import("/js/state.js")).S;
    const out={};for(const id of ["calories","protein","goal"]){C.ask("",id);out[id]=JSON.stringify(S.chat[S.chat.length-1]);}return out;});
  for(const id of ["calories","protein"]){
    if(!/your weight/i.test(r[id]))throw new Error(id+": no ask for the weight: "+r[id].slice(0,300));
    if(!/"data-sheet":"weigh"/.test(r[id]))throw new Error(id+": no way to log it");}
  for(const id in r)if(/NaN|null|undefined/.test(r[id]))throw new Error(id+": a figure without a weight: "+r[id].slice(0,300));
},{db:noWeight()});
await test("One floor: the coach's step down stops at BMR",async page=>{
  const bmr=await page.evaluate(async()=>(await import("/js/engine/formulas.js")).bmr());
  eq(bmr,1820,"84 kg, 180 cm, 30, man");
  await page.evaluate(async()=>{const S=(await import("/js/state.js")).S;S.goals.kcal=1870;
    document.body.insertAdjacentHTML("beforeend",'<button id="tkstep" data-chatkcal="-150" style="position:fixed;top:0;left:0;z-index:99999">x</button>');});
  await page.tap('#tkstep');await pause(page);
  eq(await ev(page,"S.goals.kcal"),1820,"1,870 − 150 would be 1,720: held at BMR");
});
/* Version 1's targets for this profile at 84 kg, losing fat: a fifth under, 2.0 g/kg. */
function v1Lose(){const d=seed();d.profile.goal="lose";d.goals={kcal:2040,p:168,c:200,f:63,water:3000,steps:9000};return d;}
await test("Formula change: targets the old formula made are rebuilt once on the textbook's values, with Undo",async page=>{
  await pause(page,900);
  eq(await ev(page,"[S.goals.kcal,S.goals.p,S.goals.f,S.goals.c,S.formulaV]"),[2050,202,64,167,3],"500 under, 2.4 g/kg");
  if(!(await page.$('.toast-undo')))throw new Error("the change was not said");
  await page.tap('.toast-undo');await pause(page);
  eq(await ev(page,"[S.goals.kcal,S.goals.p,S.formulaV]"),[2040,168,3],"Undo puts the old ones back, and it does not run again");
  await page.reload();await pause(page,2400);
  eq(await ev(page,"[S.goals.kcal,S.goals.p]"),[2040,168],"after a reload: still the person's choice");
},{db:v1Lose()});
await test("Formula change: targets the person set are kept",async page=>{
  await pause(page,900);
  eq(await ev(page,"[S.goals.kcal,S.goals.p,S.formulaV]"),[2500,150,3],"kept, and marked done");
  if(await page.$('.toast-undo'))throw new Error("a change was announced that did not happen");
});
await test("Workout generator: kit and sore spots swapped, volume in range, effort set, goal extras, time kept",async page=>{
  const r=await page.evaluate(async()=>{
    const X=await import("/js/data/exercises.js");await new Promise(r=>X.loadExDB(r));
    const S=(await import("/js/state.js")).S,P=await import("/js/engine/plan.js"),Vo=await import("/js/engine/volume.js");
    const gen=(prof,gear)=>{Object.assign(S.profile,{age:30,height:180,weight:84,sex:"m",level:"some",days:4,mins:60,limits:[],sleep:0},prof);S.gear=gear||null;return P.generatePlan();};
    const all=pl=>pl.days.flatMap(d=>d.ex);
    const back=gen({goal:"recomp",limits:["back","knee"]});
    const home=gen({goal:"gain"},["Dumbbell","Band"]);
    const gain=gen({goal:"gain"});
    const ath=gen({goal:"athletic",days:3}),end=gen({goal:"endurance",days:3}),mob=gen({goal:"mobility",days:3});
    const lose45=gen({goal:"lose",days:3,mins:45});
    const usable=n=>{const v=X.EXDB[n];return !v||!v.e||["Bodyweight","Dumbbell","Band"].includes(v.e);};
    return [all(back).some(e=>P.AVOID.back.test(e.name)||P.AVOID.knee.test(e.name)),
      all(home).every(e=>usable(e.name)),
      Vo.volumeCheck(gain,"some").every(v=>v.status==="ok"),
      all(gain).filter(e=>e.rir!=null).length>10,
      ath.days.filter(d=>d.ex.length).every(d=>/Jump|Plyo|Medicine Ball/.test(d.ex[0].name)),
      end.days.filter(d=>d.ex.length).every(d=>d.ex[d.ex.length-1].name==="Rowing, Stationary"),
      mob.days.filter(d=>d.ex.length).every(d=>d.ex.some(e=>/Stretch|Rotation/.test(e.name))),
      lose45.days.every(d=>P.dayMinutes(d)<=45-8+5)];});
  eq(r,[false,true,true,true,true,true,true,true]);
});
await test("Harmony: a plan the assessment just built is not flagged by the plan check, and its sets and rest follow the textbook's table for the goal",async page=>{
  const r=await page.evaluate(async()=>{
    const X=await import("/js/data/exercises.js");await new Promise(r=>X.loadExDB(r));
    const S=(await import("/js/state.js")).S,P=await import("/js/engine/plan.js"),C=await import("/js/engine/plancheck.js");
    /* The lifts the generator prescribes (it gives them an effort); core, calves, timed
       holds and the goal's extras keep their own prescription. */
    const lifts=pl=>pl.days.flatMap(d=>d.ex).filter(e=>e.rir!=null&&e.sets&&!e.timed);
    const out={};
    for(const [goal,gear,lv,days,mins] of [["endurance",["Bodyweight"],"advanced",3,45],["gain",null,"some",4,60],["lose",["Bodyweight"],"new",3,30],["strength",null,"experienced",3,60]]){
      Object.assign(S.profile,{age:30,height:180,weight:84,sex:"m",level:lv,days:days,mins:mins,limits:[],sleep:0,goal:goal});S.gear=gear;
      P.buildPlan();
      out[goal]={found:C.checkPlans().filter(f=>/^vol-low$|^surplus-low$/.test(f.id)).map(f=>f.id),l:lifts((S.programs||[]).slice(-1)[0]||{days:[]})};}
    const E=out.endurance.l,St=out.strength.l;
    return [out.endurance.found,out.gain.found,out.lose.found,
      E.length>0&&E.every(e=>e.sets>=1&&e.sets<=3&&e.rest>=30&&e.rest<=60),
      St.filter(e=>e.rest>=180).length>0,out.gain.l.every(e=>e.rest<=180)];});
  eq(r,[[],[],[],true,true,true]);
});
await test("Assessment health questions: a ticked one keeps the plan to low and moderate effort and says to check first; the week and sleep steps show the textbook's figures",async page=>{
  const r=await page.evaluate(async()=>{
    const X=await import("/js/data/exercises.js");await new Promise(r=>X.loadExDB(r));
    const S=(await import("/js/state.js")).S,P=await import("/js/engine/plan.js");
    Object.assign(S.profile,{age:30,height:180,weight:84,sex:"m",level:"some",days:3,mins:60,limits:[],sleep:0,goal:"endurance",health:[]});S.gear=null;
    const free=P.generatePlan();S.profile.health=["heart"];const held=P.generatePlan();S.profile.health=[];
    const last=pl=>pl.days.filter(d=>d.ex.length).map(d=>d.ex[d.ex.length-1].name);
    return [last(free).every(n=>n==="Rowing, Stationary"),last(held).some(n=>n==="Rowing, Stationary")];});
  eq(r,[true,false],"intervals only without a health flag");
  await page.evaluate(async()=>{const V=(await import("/js/ui/view.js")).V,A=await import("/js/ui/views/assess.js");
    V.asd=A.draftFrom();V.asd.level="new";V.asd.step=A.STEPS.indexOf("week");V.assess=true;(await import("/js/ui/render.js")).render();});await pause(page);
  if(!/2–3 sessions a week/.test(await page.textContent(".as")))throw new Error("no sessions-a-week guidance");
  await page.evaluate(async()=>{const V=(await import("/js/ui/view.js")).V,A=await import("/js/ui/views/assess.js");V.asd.step=A.STEPS.indexOf("sleep");(await import("/js/ui/render.js")).render();});await pause(page);
  if(!/7 to 9 hours a night/.test(await page.textContent(".as")))throw new Error("no sleep guidance");
  await page.evaluate(async()=>{const V=(await import("/js/ui/view.js")).V,A=await import("/js/ui/views/assess.js");V.asd.step=A.STEPS.indexOf("health");(await import("/js/ui/render.js")).render();});await pause(page);
  await page.tap('[data-asm="health|chest"]');await pause(page);
  if(!/low and moderate effort/.test(await page.textContent(".as")))throw new Error("no word on a ticked health question");
});
await test("Body weight in the weight field is body weight: push-ups logged at 84 kg (the lifter's weight) suggest no added load, and get no ramp-up sets",async page=>{
  const r=await page.evaluate(async()=>{
    const X=await import("/js/data/exercises.js");await new Promise(r=>X.loadExDB(r));
    const st=await import("/js/state.js"),F=await import("/js/engine/formulas.js"),W=await import("/js/engine/warmup.js");
    const d=new Date(Date.now()-2*864e5).toISOString().slice(0,10);
    st.S.sessions.push({id:"pu",date:d,dayName:"Push",entries:[{name:"Pushups",muscle:"Chest",sets:[{w:84,r:20},{w:84,r:18}]}]});
    const rec=F.recommend({name:"Pushups",planned:{sets:3,lo:8,hi:20}});
    const wu=W.warmupFor([{name:"Pushups",planned:{sets:3,lo:8,hi:20},sets:[]},{name:"Barbell Bench Press - Medium Grip",planned:{sets:3,lo:6,hi:10},sets:[]}],{work:()=>60,gear:null,bar:20});
    return [rec&&rec.w,!!(rec&&rec.bw),wu.ramp&&wu.ramp.name];});
  eq(r,[0,true,"Barbell Bench Press - Medium Grip"]);
});
/* An old log: push-ups at the lifter's body weight (84 kg), and one set with a real vest. */
function oldBwLog(){const d=seed();const day=new Date(Date.now()-5*864e5).toISOString().slice(0,10);
  d.sessions.push({id:"oldpu",date:day,dayName:"Push",entries:[{name:"Pushups",muscle:"Chest",sets:[{w:84,r:20},{w:84.5,r:18},{w:20,r:10}]}]});return d;}
await test("Old logs: body-weight sets logged at the body weight are read as body weight, once, said with Undo; a real added weight stays",async page=>{
  await pause(page,3400);
  const sets=()=>ev(page,"S.sessions.find(s=>s.id==='oldpu').entries[0].sets.map(x=>x.w)");
  eq([await sets(),await ev(page,"S.logFixV")],[[0,0,20],2],"84 and 84.5 to 0, the vest kept");
  if(!/read as body weight/.test(await page.textContent(".toast").catch(()=>"")))throw new Error("the change was not said: "+await page.textContent(".toast").catch(()=>"none"));
  await page.tap('.toast-undo');await pause(page);
  eq(await sets(),[84,84.5,20],"Undo puts them back");
  await pause(page,1200);   /* the save is written a moment later */
  await page.reload();await pause(page,3400);
  eq(await sets(),[84,84.5,20],"and it does not run again");
},{db:oldBwLog()});
await test("Old logs: a workout open at the update has its body-weight sets read as body weight too",async page=>{
  await pause(page,3400);
  eq(await ev(page,"S.active.entries[0].sets.map(x=>x.w)"),[0],"the open workout's push-up set");
},{db:(()=>{const d=oldBwLog();const today=new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10);
  d.active={date:today,dayName:"Push",start:Date.now()-6e5,idx:0,entries:[{name:"Pushups",muscle:"Chest",planned:{sets:3,lo:8,hi:20},sets:[{w:84,r:20}]}]};return d;})()});
await test("Old logs: the correction is kept across a reload, and not said again",async page=>{
  await pause(page,3400);
  const sets=()=>ev(page,"S.sessions.find(s=>s.id==='oldpu').entries[0].sets.map(x=>x.w)");
  eq(await sets(),[0,0,20],"corrected");
  await pause(page,1200);await page.reload();await pause(page,3400);
  eq(await sets(),[0,0,20],"still corrected after a reload");
  eq(await page.evaluate(()=>/read as body weight/.test((document.querySelector(".toast")||{}).textContent||"")),false,"said once");
},{db:oldBwLog()});
await test("Warm-up: a running timer stays the small pill it was, counting down in place",async page=>{
  await startWorkout(page);
  const box=()=>page.$eval('.wu-pulse .wu-hold',e=>{const r=e.getBoundingClientRect();return {w:Math.round(r.width),h:Math.round(r.height),dir:getComputedStyle(e).flexDirection,cls:e.className};});
  const before=await box();
  await page.tap('.wu-pulse .wu-hold');await pause(page,1300);
  const after=await box();
  eq([after.h,after.dir,/timing/.test(after.cls),after.w<=before.w+40],[before.h,"row",true,true],"same height, a row, not a page-tall column");
},{prefs:{nowarm:false}});
await test("Warm-up: Start stays on the bottom edge all the way down",async page=>{
  await page.evaluate(async()=>{const S=(await import("/js/state.js")).S;S.prefs.nowarm=false;});
  await startWorkout(page);
  const at=async y=>{await page.evaluate(y=>window.scrollTo(0,y),y);await pause(page,200);
    return page.evaluate(()=>Math.round(document.querySelector(".wu-foot").getBoundingClientRect().bottom)-innerHeight);};
  eq([await at(0),await at(300),await at(99999)],[0,0,0],"the footer's bottom is the screen's");
});
await test("Meal plan: a day built from the targets, within 5%, servings as labels, diet and leave-outs respected",async page=>{
  const r=await page.evaluate(async()=>{
    const N=await import("/js/engine/nutrition.js");await new Promise(r=>N.loadFoods?N.loadFoods(r):r());
    const M=await import("/js/engine/mealplan.js");
    const tg={kcal:2200,p:170,c:220,f:70};
    const kc=ms=>ms.reduce((a,m)=>a+m.items.reduce((b,i)=>b+i.kcal,0),0);
    const plain=M.buildMealPlan(tg,{meals:4}),veg=M.buildMealPlan(tg,{meals:3,diet:"veg"}),
          free=M.buildMealPlan(tg,{meals:5,avoid:["dairy","gluten"]}),again=M.buildMealPlan(tg,{meals:4,variant:1});
    const ids=ms=>ms.flatMap(m=>m.items.map(i=>i.fid));
    return [plain.length,Math.abs(kc(plain)-tg.kcal)/tg.kcal<0.05,plain.every(m=>m.items.length>=2),
      ids(veg).some(id=>/chicken|beef|fish|tilapia|tuna|lamb|turkey/.test(id)),
      ids(free).some(id=>/bread|baladi|oats|pasta|yog|cheese|milk|areesh|cottage|skyr/.test(id)),
      free.every(m=>m.items.length>=2),
      plain.some(m=>m.items.some(i=>/×/.test(i.label))),
      JSON.stringify(ids(plain))!==JSON.stringify(ids(again))];});
  eq(r,[4,true,true,false,false,true,true,true]);
});
await test("Assessment: first run opens it; answers become targets and training with one Undo; a meal plan follows",async page=>{
  if(!(await page.$('.as')))throw new Error("first run did not open the assessment");
  await page.tap('[data-asnext]');await pause(page,200);
  /* The saved profile fills the numbers in; emptied, Next will not go on. */
  await page.fill('#as_age','');await page.fill('#as_height','');
  await page.tap('[data-asnext]');await pause(page,200);
  eq(await ev(page,"V.asd.step"),1,"no numbers, no next");
  await page.fill('#as_age','31');await page.fill('#as_height','178');await page.fill('#as_weight','84');
  await page.tap('[data-asnext]');await pause(page,200);
  await page.tap('[data-as="goal|recomp"]');await pause(page,150);
  for(let i=0;i<5;i++){await page.tap('[data-asnext]');await pause(page,150);}
  await page.tap('[data-asm="limits|back"]');await pause(page,150);
  await page.tap('[data-asnext]');await pause(page,150);
  /* The health questions (the PAR-Q+ topics): none ticked. */
  eq(await page.$$eval('[data-asm^="health|"]',a=>a.length),7,"seven health topics");
  await page.tap('[data-asnext]');await pause(page,150);
  await page.tap('[data-asm="avoid|nuts"]');await pause(page,150);
  await page.tap('[data-asnext]');await pause(page,150);await page.tap('[data-asnext]');await pause(page,800);
  if(!(await page.$('[data-asuse]')))throw new Error("no result screen");
  for(let i=0;i<20&&!(await page.$('.as-meals'));i++)await pause(page,250);
  eq(await page.$$eval('.as-meals > div',a=>a.length),4,"the meals are on the result, with the training");
  const shown=await page.$eval('.as-kcal b',e=>e.textContent.replace(/\D/g,""));
  await page.tap('[data-asuse]');await pause(page,500);
  eq(await ev(page,"[S.onboarded,S.profile.goal,S.profile.limits,String(S.goals.kcal),S.prefs.avoid,!!S.activeProgram]"),
    [true,"recomp",["back"],shown,["nuts"],true],"applied as shown");
  eq(await ev(page,"S.mealSlots.length===4&&S.mealSlots.every(s=>(s.plan||[]).length>=2)"),true,"meals planned in the same step");
  const prog=await ev(page,"S.activeProgram");
  await page.tap('.toast-undo');await pause(page,400);
  eq(await ev(page,"[S.onboarded,S.profile.goal,S.activeProgram===\""+prog+"\"]"),[false,"gain",false],"one Undo puts it all back");
  eq(await ev(page,"(S.mealSlots||[]).every(s=>!(s.plan||[]).length)"),true,"Undo took the meals back too");
  await page.tap('[data-asuse]');await pause(page,500);
  await page.tap('[data-asfood]');await pause(page,500);
  eq(await ev(page,"V.tab"),"food","today's food");
  eq(await page.$$eval('.fmt-c .fmt-plan',a=>a.length),4,"every meal of the day shows its plan");
  if(!(await page.$('[data-logday]')))throw new Error("no Log today's plan on Food");
},{db:Object.assign(seed(),{onboarded:false})});
await test("Plan check: targets that work against the goal are found in Coach AI with a dot on Coach, fixed with Undo, and kept until the numbers change",async page=>{
  /* Building muscle on 2,500 kcal against about 2,550 maintenance, and 110 g of protein. */
  eq(await page.$eval('nav [data-tab="coach"]',e=>e.classList.contains("advice")),true,"a dot on Coach");
  await coach(page,"ai");
  const card=await page.$eval('#app .pcf h3',e=>e.textContent);
  eq(card,"Your calories will not build muscle");
  eq(await ev(page,"S.goals.kcal"),2500);
  await page.tap('[data-k="pc:kcal-down"] [data-pcfix]');await pause(page,300);
  const fixed=await ev(page,"[S.goals.kcal>2550,S.goals.p>=145]");
  eq(fixed,[true,true],"Use … kcal sets the targets for the goal");
  await page.tap('.toast-undo');await pause(page,300);
  eq(await ev(page,"[S.goals.kcal,S.goals.p]"),[2500,110],"Undo");
  /* Kept as it is: gone, and back once the numbers behind it change. */
  await page.tap('[data-k="pc:kcal-down"] [data-pckeep]');await pause(page,300);
  eq(await page.$$eval('#app .pcf h3',a=>a.map(e=>e.textContent).includes("Your calories will not build muscle")),false,"kept");
  await page.evaluate(async()=>{const S=(await import("/js/state.js")).S;S.goals.kcal=2400;(await import("/js/ui/render.js")).render();});await pause(page,200);
  eq(await page.$eval('#app .pcf h3',e=>e.textContent),"Your calories will not build muscle","back when the numbers change");
},{db:Object.assign(seed(),{goals:{kcal:2500,p:110,c:300,f:70,water:3000,steps:9000}})});
await test("Plan check: a meal plan off its targets and a thin program are found; the screen fixes both; a used plan is checked",async page=>{
  await page.evaluate(async()=>{
    const X=await import("/js/data/exercises.js");await new Promise(r=>X.loadExDB(r));
    const S=(await import("/js/state.js")).S;
    S.mealSlots=[{id:"Breakfast",plan:[{fid:"egg",n:"Eggs",grams:100,kcal:143,p:12.6,c:0.7,f:9.5}]},{id:"Lunch",plan:[{fid:"rice_ck",n:"Rice",grams:300,kcal:390,p:8,c:84,f:1}]}];});
  await page.evaluate(async()=>{const V=(await import("/js/ui/view.js")).V;V.pcheck=true;(await import("/js/ui/render.js")).render();});await pause(page,300);
  const ids=await page.$$eval('.pcf',a=>a.map(e=>e.dataset.k));
  if(!ids.includes("pc:meals-off")||!ids.includes("pc:vol-low"))throw new Error("expected the meal plan and the volume findings, got "+ids.join(","));
  await page.tap('[data-k="pc:vol-low"] [data-pcfix]');await pause(page,400);
  eq(await page.evaluate(async()=>{const St=await import("/js/state.js"),Vo=await import("/js/engine/volume.js");
    return Vo.volumeCheck(St.split(),"some").filter(v=>v.status==="low").length;}),0,"balanced");
  await page.tap('[data-k="pc:meals-off"] [data-pcfix]');await pause(page,1200);
  eq(await ev(page,"[V.tab,V.pimport,!!V.pgen]"),["coach",true,true],"rebuild opens a generated plan");
  await page.tap('[data-puse]');await pause(page,300);
  eq(await page.evaluate(async()=>(await import("/js/engine/plancheck.js")).checkPlans().map(f=>f.id).includes("meals-off")),false,"fixed");
},{db:Object.assign(seed(),{goals:{kcal:2800,p:150,c:350,f:85,water:3000,steps:9000}})});
await test("Plan check: one tap on a fix always settles its card — the goal follows a coach's program, and what balancing cannot reach is kept",async page=>{
  /* A coach's program written for fat loss, on a profile set to build muscle. */
  await page.evaluate(async()=>{const St=await import("/js/state.js");const p=St.split();p.meta=Object.assign({},p.meta,{phase:"Fat loss"});
    (await import("/js/ui/render.js")).render();});await pause(page,300);
  await page.evaluate(async()=>{const V=(await import("/js/ui/view.js")).V;V.pcheck=true;(await import("/js/ui/render.js")).render();});await pause(page,300);
  eq(await page.$eval('[data-k="pc:phase"] [data-pcfix]',b=>b.textContent),"Set my goal to lose fat","the fix names what it does");
  await page.tap('[data-k="pc:phase"] [data-pcfix]');await pause(page,400);
  const after=await ev(page,"[S.profile.goal,V.assess||false,document.querySelectorAll('[data-k=\"pc:phase\"]').length]");
  eq(after,["lose",false,0],"goal changed in place, program kept, card gone");
  const ids=await page.evaluate(async()=>(await import("/js/engine/plancheck.js")).checkPlans().map(f=>f.id));
  if(ids.includes("kcal-up"))throw new Error("the targets did not follow the new goal: "+ids.join(","));
  await page.tap('.toast-undo');await pause(page,300);
  eq(await ev(page,"[S.profile.goal,document.querySelectorAll('[data-k=\"pc:phase\"]').length]"),["gain",1],"Undo: goal and card back");
  /* Short sessions on a thin program: balancing reaches what fits and keeps the rest,
     so the card still goes in one tap. */
  await page.evaluate(async()=>{const S=(await import("/js/state.js")).S;S.profile.mins=25;(await import("/js/ui/render.js")).render();});await pause(page,300);
  if(await page.$('[data-k="pc:vol-low"] [data-pcfix]')){
    await page.tap('[data-k="pc:vol-low"] [data-pcfix]');await pause(page,400);
    eq(await page.$$eval('[data-k="pc:vol-low"]',a=>a.length),0,"the volume card goes in one tap");
    await page.tap('.toast-undo');await pause(page,300);
    eq(await page.$$eval('[data-k="pc:vol-low"]',a=>a.length),1,"Undo brings it back");}
},{db:Object.assign(seed(),{goals:{kcal:2800,p:151,c:353,f:87,water:3000,steps:9000}})});
await test("Coaching maths: strength grows on maintenance, warm-ups are not volume, a single is its own max, body weight progresses by reps",async page=>{
  const r=await page.evaluate(async()=>{
    const X=await import("/js/data/exercises.js");await new Promise(r=>X.loadExDB(r));
    const S=(await import("/js/state.js")).S,F=await import("/js/engine/formulas.js"),PC=await import("/js/engine/plancheck.js"),U=await import("/js/coach/util.js");
    /* Strength at maintenance: nothing about building muscle. */
    S.profile.goal="strength";const td=F.tdee();S.goals.kcal=td;S.goals.p=F.macroTargets().p;
    const strengthIds=PC.checkPlans().map(f=>f.id);
    /* Warm-ups out of the weekly count. */
    const d=new Date().toISOString().slice(0,10);
    S.sessions.unshift({id:"w1",date:d,dayName:"T",activeMs:1,entries:[{name:"Barbell Curl",muscle:"Biceps",sets:[{w:20,r:10,wu:true},{w:20,r:10,wu:true},{w:30,r:8},{w:30,r:8}]}]});
    const curls=F.weeklySets().Biceps||0;
    /* Pull-ups with nothing added. */
    S.sessions.unshift({id:"w2",date:d,dayName:"T",activeMs:1,entries:[{name:"Pullups",muscle:"Back",sets:[{w:0,r:8},{w:0,r:8},{w:0,r:8}]}]});
    const bw=F.recommend({name:"Pullups",planned:{lo:6,hi:8,sets:3}});
    return {strengthIds,curls,single:[F.e1RM(100,1),U.e1rm(100,1),F.e1RM(100,5)],bw:bw&&[bw.bw,bw.w,/body weight alone/.test(bw.note)]};});
  if(r.strengthIds.includes("kcal-down"))throw new Error("strength at maintenance flagged: "+r.strengthIds.join(","));
  eq(r.curls,2,"two working sets of curls, two warm-ups not counted");
  eq(r.single,[100,100,116.7],"a single is its own max; five reps still estimate up");
  eq(r.bw,[true,0,true],"pull-ups on body weight: reps, then a little load");
});
/* ---- the coach (js/coach/) -------------------------------------------------------- */
await test("Coach engine: every test on the runner page passes",async page=>{
  await page.goto(URL_.replace(/\/[^/]*$/,"/")+"js/coach/test/index.html");await page.waitForTimeout(800);
  const r=await page.evaluate(()=>window.COACH_TESTS);
  if(!r||r.failed||r.passed<50)throw new Error("coach tests: "+JSON.stringify(r&&{passed:r.passed,failed:r.failed,first:r.failures&&r.failures[0]}));
});
const B_="Barbell Bench Press - Medium Grip";
function coachLog(rpes,step){
  return rpes.map((rpe,i)=>({id:"c"+i,date:iso(7*(rpes.length-1-i)),dayName:"Full Body A",activeMs:40*6e4,
    entries:[{name:B_,muscle:"Chest",sets:[1,2,3].map(()=>({w:80+(step||0)*i,r:8,rpe}))},
             {name:"Leg Press",muscle:"Quads",sets:[1,2,3].map(()=>({w:150+(step||0)*2*i,r:10,rpe:8}))}]}));}
await test("Coach: a lift getting harder at the same weight is raised with its reason; a lighter week from it, or set aside",async page=>{
  await coach(page,"ai");
  const card=await page.$eval('#app .coach',e=>e.innerText);
  if(!/feeling harder/.test(card)||!/RPE 7 to 9/.test(card))throw new Error("card: "+card);
  await page.tap('#app .coach [data-cofix]');await pause(page,300);
  eq(await ev(page,"[!!(S.deload&&S.deload.until),Object.keys(S.coachDismiss||{}).length]"),[true,1],"lighter week on, insight quiet");
  await page.tap('.toast-undo');await pause(page,300);
  eq(await ev(page,"[!!(S.deload&&S.deload.until),Object.keys(S.coachDismiss||{}).length]"),[false,0],"Undo");
  await page.tap('#app .coach [data-cokeep]');await pause(page,300);
  eq(await page.$$eval('#app .coach h3',a=>a.some(e=>/feeling harder/.test(e.textContent))),false,"set aside: gone");
},{db:Object.assign(seed(),{sessions:coachLog([7,7.5,8.5,9]),goals:{kcal:2800,p:151,c:353,f:87,water:3000,steps:9000}})});
await test("Coach: an insight set aside stays aside when the next workout changes its details",async page=>{
  const under=await page.evaluate(async()=>(await import("/js/engine/coachinfo.js")).coachNow().filter(c=>c.kind==="under").map(c=>c.id));
  eq(under,["under"],"one id for the kind, not a list of muscles");
  await page.evaluate(async()=>{const V=(await import("/js/ui/view.js")).V;V.pcheck=true;(await import("/js/ui/render.js")).render();});await pause(page,300);
  await page.tap('[data-k="co:under"] [data-cokeep]');await pause(page,300);
  /* A new session moves the numbers behind it. */
  await page.evaluate(async()=>{const S=(await import("/js/state.js")).S;
    S.sessions.unshift({id:"n1",date:new Date().toISOString().slice(0,10),dayName:"Extra",activeMs:3e6,entries:[{name:"Barbell Curl",muscle:"Biceps",sets:[{w:30,r:10,rpe:8}]}]});
    (await import("/js/ui/render.js")).render();});await pause(page,300);
  eq(await page.evaluate(async()=>(await import("/js/engine/coachinfo.js")).coachNow().filter(c=>c.kind==="under").length),0,"still set aside");
},{db:Object.assign(seed(),{sessions:[0,7,14,21,28].map(d=>({id:"u"+d,date:iso(d+1),dayName:"Full Body A",activeMs:3e6,
  entries:[{name:"Barbell Bench Press - Medium Grip",muscle:"Chest",sets:[{w:80,r:8,rpe:8}]}]})),goals:{kcal:2800,p:151,c:353,f:87,water:3000,steps:9000}})});
await test("Coach: a log that is on track gets no coach card — silence is earned",async page=>{
  eq(await page.evaluate(async()=>(await import("/js/engine/coachinfo.js")).coachNow().filter(c=>c.pri>=2).length),0,"nothing important");
  await coach(page,"ai");
  eq(await page.$$eval('#app .coach.sev3,#app .coach.sev2',a=>a.length),0,"nothing important in Coach AI");
},{db:Object.assign(seed(),{sessions:coachLog([8,8,8,8,8],2.5),goals:{kcal:2800,p:151,c:353,f:87,water:3000,steps:9000}})});
/* ---- maintenance learned from the log (roadmap B1) ----------------------------------- */
await test("Maintenance learned: four weeks at 2,000 kcal and a steady weight measure about 2,000, not the formula's 2,548; one tap builds the targets on it, with Undo; the chat and Targets say where it comes from",async page=>{
  const L=await page.evaluate(async()=>{const E=await import("/js/engine/energy.js"),F=await import("/js/engine/formulas.js");
    const l=E.learnedNow();return {kind:l.kind,kcal:l.kcal,formula:F.tdeeFormula(),days:l.foodDays,share:l.share};});
  eq([L.kind,Math.abs(L.kcal-2000)<=30,L.formula,L.days],["ok",true,2548,27],"measured from the log, against the formula");
  await coach(page,"ai");
  await page.evaluate(async()=>{const V=(await import("/js/ui/view.js")).V;V.advall=true;(await import("/js/ui/render.js")).render();});await pause(page,300);
  const card=await page.$eval('[data-k="pc:maint-learned"]',e=>e.innerText);
  if(!/Your body uses about 2,0[0-3]0 kcal a day/.test(card)||!/the 2,548 the formula estimated/.test(card)||!/27 full days/.test(card))
    throw new Error("the card does not show its numbers: "+card);
  await page.tap('[data-k="pc:maint-learned"] [data-pcfix]');await pause(page,400);
  const after=await ev(page,"[S.energy&&S.energy.kcal,S.goals.kcal,document.querySelectorAll('[data-k=\"pc:maint-learned\"]').length]");
  eq([after[0]===L.kcal,after[1]===L.kcal,after[2]],[true,true,0],"targets built on it (holding weight: the target is the measured maintenance), card gone");
  /* Targets says where maintenance now comes from. */
  await coach(page,"food","targets");
  if(!/Maintenance measured from your own log \(the formula says 2,548\)/.test(await page.$eval('.tgsrc',e=>e.textContent)))
    throw new Error("Targets: "+await page.$eval('.tgsrc',e=>e.textContent));
  await page.tap('.toast-undo').catch(()=>{});await pause(page,300);
  eq(await ev(page,"[!!S.energy,S.goals.kcal]"),[false,2500],"Undo: the formula and the old target back");
  /* The chat, asked about calories, says what the log measures and offers the same fix. */
  await openChat(page);
  await page.fill('#chatq','why are my calories like this');await page.press('#chatq','Enter');await pause(page,300);
  const a=await page.evaluate(()=>(document.querySelectorAll(".chat-more").forEach(d=>d.open=true),[...document.querySelectorAll(".chat-a")].pop()).innerText);
  if(!/Your own log says your body uses about 2,0[0-3]0 kcal a day/.test(a)||!(await page.$('.chat-acts [data-pcfix="maint-learned"]')))
    throw new Error("chat: "+a);
},{db:Object.assign(seed(),{
  profile:{age:30,height:180,weight:84,sex:"m",activity:1.4,goal:"maintain",prog:"standard",level:"some",days:3},
  body:Array.from({length:14},(_,i)=>({date:iso(i*2),weight:84})),
  days:Object.fromEntries(Array.from({length:27},(_,i)=>[iso(i+1),{water:2000,steps:8000,meals:{Lunch:{done:true,
    items:[{n:"Day's food",fid:"x",grams:100,label:"1 serving",kcal:2000,p:150,c:200,f:67}]}}}]))})});
await test("Maintenance learned: too little logged says how much more is needed, and never offers a number",async page=>{
  const L=await page.evaluate(async()=>(await import("/js/engine/energy.js")).learnedNow());
  eq([L.kind,L.why],["insufficient","food"],"a few days are not enough");
  eq(await page.evaluate(async()=>(await import("/js/engine/plancheck.js")).checkPlans().some(f=>f.id==="maint-learned")),false,"no card");
  await coach(page,"food","targets");
  if(!/After two weeks of logged food/.test(await page.$eval('.tgsrc',e=>e.textContent)))throw new Error("Targets does not say what it needs");
},{db:Object.assign(seed(),{days:Object.fromEntries([1,2,3].map(d=>[iso(d),{meals:{Lunch:{done:true,items:[{n:"x",kcal:2000,p:150,c:200,f:67}]}}}]))})});
/* ---- readiness that acts (roadmap B3) ------------------------------------------------ */
await test("Readiness: drained takes about 5% off today's suggestion, low holds last time's weight, great allows the bigger step; one set fewer on each exercise, with Undo",async page=>{
  const r=await page.evaluate(async()=>{
    const F=await import("/js/engine/formulas.js"),S=(await import("/js/state.js")).S,U=await import("/js/util.js");
    const y=new Date(Date.now()-864e5),yd=new Date(y-y.getTimezoneOffset()*6e4).toISOString().slice(0,10);
    /* Last time: 100 × 8 three times, at the top of 6–8, at about RPE 7.7. */
    S.sessions.unshift({id:"rd",date:yd,dayName:"T",entries:[{name:"Barbell Squat",muscle:"Quads",sets:[{w:100,r:8,rpe:7.5},{w:100,r:8,rpe:7.5},{w:100,r:8,rpe:8}]}]});
    const e={name:"Barbell Squat",planned:{lo:6,hi:8,sets:3}},out={};
    const was=S.active;
    for(const rd of [0,1,2,5]){S.active={entries:[],ready:rd};const x=F.recommend(e);out[rd]=[x.w,x.note];}
    S.active=was;return out;});
  /* A squat steps 5 kg at 100: the usual step is 105; great takes the bigger one (two
     steps, at most 10%), 110; low holds 100; drained is about 5% under, 95. */
  eq([r[0][0],r[1][0],r[2][0],r[5][0]],[105,95,100,110],"normal step, drained, low, great");
  if(!/drained day/.test(r[1][1])||!/low day/.test(r[2][1])||!/great day/.test(r[5][1]))throw new Error("each says why: "+JSON.stringify(r));
  /* In a workout: a low answer offers one set fewer, with Undo. */
  await startWorkout(page);
  await page.tap('[data-ready="2"]');await pause(page,300);
  const before=await ev(page,"S.active.entries.map(e=>e.planned.sets)");
  await page.tap('[data-readyless]');await pause(page,300);
  const after=await ev(page,"S.active.entries.map(e=>e.planned.sets)");
  eq(after,before.map(n=>n>1?n-1:n),"one set fewer on each, never under one");
  eq(await page.$$eval('[data-readyless]',a=>a.length),0,"offered once");
  await page.tap('.toast-undo');await pause(page,300);
  eq(await ev(page,"S.active.entries.map(e=>e.planned.sets)"),before,"Undo");
});
/* ---- how coaching is surfaced (coach phase 4) ---------------------------------------- */
await test("Phase 4: Coach AI shows the most important thing first, the rest behind a tap; the dot still counts them all",async page=>{
  const n=await page.evaluate(async()=>(await import("/js/ui/views/pcheck.js")).adviceCount());
  if(n<2)throw new Error("the seed should give at least two findings, got "+n);
  await coach(page,"ai");
  eq(await page.$$eval('#app .pcf',a=>a.length),1,"one card");
  eq(await page.$eval('#app .pcf h3',e=>e.textContent),"Your calories will not build muscle","the most important one");
  eq(await page.$eval('[data-advall="1"]',b=>b.textContent),n===2?"1 more thing the coach sees":(n-1)+" more things the coach sees","the rest, counted");
  await page.tap('[data-advall="1"]');await pause(page);
  eq(await page.$$eval('#app .pcf',a=>a.length),n,"all of them");
  await page.tap('[data-advall="0"]');await pause(page);
  eq(await page.$$eval('#app .pcf',a=>a.length),1,"folded again");
  eq(await page.$eval('nav [data-tab="coach"]',e=>e.getAttribute("aria-label")).then(x=>x.includes(String(n))),true,"the dock still counts all of them");
},{db:Object.assign(seed(),{goals:{kcal:2500,p:110,c:300,f:70,water:3000,steps:9000}})});
await test("Phase 4: one card at a time until there is nothing to say, and then one quiet line",async page=>{
  await page.evaluate(async()=>{const X=await import("/js/data/exercises.js");await new Promise(r=>X.loadExDB(r));});
  const n=await page.evaluate(async()=>(await import("/js/ui/views/pcheck.js")).adviceCount());
  if(n<1)throw new Error("the seed should have something to say");
  await coach(page,"ai");
  /* Set aside what there is, one card at a time: each time the next one takes its place. */
  for(let i=0;i<n;i++){
    eq(await page.$$eval('#app .pcf',a=>a.length),1,"one card at a time");
    await page.tap('#app .pcf [data-pckeep],#app .pcf [data-cokeep]');await pause(page,300);
    await page.evaluate(()=>{const x=document.querySelector('.toast');if(x)x.remove();});}
  eq(await page.$$eval('#app .pcf,#app .as-note',a=>a.length),0,"no cards or footnote");
  eq(await page.$$eval('#app .tsec-h',a=>a.map(h=>h.textContent)),["Your plan"],"no heading for the advice, only the plan's");
  eq(await page.$eval('.cweek h2',e=>e.textContent),"On track","the coach says so at the top");
  eq(await page.$eval('#app .pcquiet',e=>e.textContent.trim()),"On track. Nothing to change.","one quiet line");
  eq(await page.$eval('nav [data-tab="coach"]',e=>e.classList.contains("advice")),false,"no dot");
  /* What was set aside can be brought back. */
  await page.tap('[data-pcreset]');await pause(page,300);
  eq(await page.$$eval('#app .pcf',a=>a.length),1,"back, one at a time");
},{db:Object.assign(seed(),{sessions:coachLog([8,8,8,8,8],2.5),goals:{kcal:2800,p:151,c:353,f:87,water:3000,steps:9000}})});
await test("Phase 4: one session and one weigh-in say \"not enough yet\" everywhere, never a trend",async page=>{
  await page.evaluate(async()=>{const X=await import("/js/data/exercises.js");await new Promise(r=>X.loadExDB(r));});
  eq(await page.evaluate(async()=>(await import("/js/engine/coachinfo.js")).coachNow().length),0,"the coach says nothing");
  const cards=await page.evaluate(async()=>Object.fromEntries((await import("/js/ui/facts.js")).simpleFacts().map(f=>[f.k,f.head+" "+f.line])));
  if(!/Not enough yet/.test(cards.Strength))throw new Error("strength: "+cards.Strength);
  if(!/A few more weigh-ins/.test(cards.Weight))throw new Error("weight: "+cards.Weight);
  await openChat(page);
  await page.fill('#chatq','is my weight on track');await page.press('#chatq','Enter');await pause(page,300);
  /* The answer's own words, under the card's header that names its subject. */
  const a=await page.evaluate(()=>[...(document.querySelectorAll(".chat-more").forEach(d=>d.open=true),[...document.querySelectorAll(".chat-a")].pop()).children].filter(c=>!c.classList.contains("chat-ah")).map(c=>c.innerText).join("\n"));
  if(!/^1 weigh-in so far/.test(a)||!/four weigh-ins over two weeks/.test(a)||/a week\./.test(a))throw new Error("weight answer: "+a);
},{db:Object.assign(seed(),{sessions:seed().sessions.slice(0,1)})});
await test("Offline: with the network off, the installed app opens, every tab works, food search and the coach chat answer",async(page,env)=>{
  /* Installed: the service worker has cached everything and controls the page. */
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await page.reload();await pause(page,1200);
  eq(await page.evaluate(()=>!!navigator.serviceWorker.controller),true,"the service worker controls the page");
  await env.ctx.setOffline(true);
  await page.reload();await pause(page,1500);
  for(const tab of ["train","food","coach","progress","profile"]){await tapTab(page,tab);await pause(page,300);
    if(!(await page.$eval('#app',e=>e.children.length)))throw new Error(tab+" is empty offline");}
  await openChat(page,"today");
  if(!/Today is|rest day|Done for today/.test(await page.evaluate(()=>(document.querySelectorAll(".chat-more").forEach(d=>d.open=true),[...document.querySelectorAll(".chat-a")].pop()).innerText)))throw new Error("the chat did not answer offline");
  eq(await page.evaluate(async()=>{const n=await import("/js/engine/nutrition.js");await new Promise(f=>n.loadFoods(f));return n.searchFoods("chicken").length>0;}),true,"food search works offline");
  await env.ctx.setOffline(false);
},{sw:true});
/* ---- where the three judged lifts sit among raw competitors (coach phase 3) ------- */
async function strengthTab(page){
  await page.evaluate(async()=>{const V=(await import("/js/ui/view.js")).V;V.tab="progress";V.ptab="strength";V.phalf="all";
    (await import("/js/ui/render.js")).render();});await pause(page,400);}
await test("Among powerlifters: squat and bench placed against raw competitors of the same class, said as such; silent without data",async page=>{
  await strengthTab(page);
  /* The seed: 84 kg (the 93 class), squat 80 × 8 and bench 60 × 8, no deadlift. */
  const card=await page.$eval('.pgopl',e=>({rows:[...e.querySelectorAll('.pgshare-r')].map(r=>[r.querySelector('span').textContent,r.querySelector('b').textContent]),
    text:e.innerText,aside:e.previousElementSibling.innerText}));
  const want=await page.evaluate(async()=>{const P=await import("/js/coach/percentile.js");
    /* 8 reps at RPE 8 is 10 reps of effort: the estimate counts the two left in reserve. */
    return ["squat","bench"].map((l,i)=>{const x=P.percentileOf("m",84,l,[80,60][i]*(1+10/30));return x.edge==="below"?"<10":x.edge==="above"?">90":String(x.pct);});});
  eq(card.rows,[["Squat",want[0]],["Bench press",want[1]]],"two lifts logged, two rows, from the table");
  if(!/93 kg class/.test(card.aside)||!/raw/i.test(card.aside))throw new Error("class and raw not said: "+card.aside);
  if(!/competitors/.test(card.text)||!/Anywhere on this scale is strong/.test(card.text)||!/rough guide/.test(card.text))
    throw new Error("the comparison is not explained: "+card.text);
  /* Arabic, mirrored. */
  await page.evaluate(async()=>{const S=(await import("/js/state.js")).S;S.prefs.lang="ar";document.documentElement.dir="rtl";(await import("/js/ui/render.js")).render();});await pause(page,300);
  eq(await page.$eval('.pgopl',e=>e.previousElementSibling.querySelector('h2,b,span').textContent.trim()),"وسط لاعبي الباورليفتنج","in Arabic");
  /* No sex on the profile, or nothing from the last 12 weeks: nothing shown. */
  await page.evaluate(async()=>{const S=(await import("/js/state.js")).S;S.prefs.lang="en";document.documentElement.dir="ltr";S.profile.sex="";(await import("/js/ui/render.js")).render();});await pause(page,300);
  eq(await page.$$eval('.pgopl',a=>a.length),0,"no sex, no comparison");
  await page.evaluate(async()=>{const S=(await import("/js/state.js")).S;S.profile.sex="m";
    const d=new Date(Date.now()-120*864e5).toISOString().slice(0,10);S.sessions.forEach(x=>{x.date=d;});(await import("/js/ui/render.js")).render();});await pause(page,300);
  eq(await page.$$eval('.pgopl',a=>a.length),0,"an edited log with nothing recent: gone");
});
await test("Training import: a program pasted as text is read the same way",async page=>{
  await page.evaluate(async()=>{const V=(await import("/js/ui/view.js")).V;V.tab="coach";V.train="import";V.tp=null;(await import("/js/ui/render.js")).render();});await pause(page,300);
  await page.fill("#ti_text","Day 1 — Push\nBench press 4x6-8 @ 80kg, 2 min rest — pause on the chest\nLateral raises 3 x 12-15\n\nPull day\nLat pulldown 3x10\nFace pull 3 × 15 (light)\nPlank 3 x 45s");
  await page.evaluate(()=>document.querySelector("[data-tiread]").click());await pause(page,500);
  const tp=await ev(page,"V.tp");
  eq(tp.days.map(d=>d.name),["Day 1 — Push","Pull day"],"days");
  const b=tp.days[0].ex[0];
  eq([b.name,b.sets,b.lo,b.hi,b.w0,b.rest,b.note],["Barbell Bench Press - Medium Grip",4,6,8,80,120,"pause on the chest"],"a full line");
  eq(tp.days[0].ex[1].name,"Side Lateral Raise");
  eq(tp.days[1].ex.map(e=>[e.name,e.lo,e.timed]),[["Wide-Grip Lat Pulldown",10,false],["Face Pull",15,false],["Plank",45,true]],"the second day");
  eq(tp.days[1].ex[1].note,"light");
});
await test("Dock: a page with little to scroll keeps its dock",async page=>{
  await tapTab(page,"food");await pause(page);
  const max=await page.evaluate(()=>document.documentElement.scrollHeight-innerHeight);
  if(max<=0||max>=290)throw new Error("Food is not a short page here ("+max+"px)");
  for(let i=0;i<12;i++){await page.evaluate(()=>window.scrollBy(0,15));await page.waitForTimeout(16);}
  await pause(page,650);
  eq(await page.evaluate(()=>document.getElementById("nav").classList.contains("dhid")),false);
/* No protein target, so Food has no body diagram and stays a short page. */
},{prefs:{anim:true},db:Object.assign(seed(),{goals:{kcal:2500,p:0,c:300,f:70,water:3000,steps:9000}})});
await test("Dock: slides off scrolling down and back scrolling up, at the scroll's pace",async page=>{await dockTest(page,true);},{prefs:{anim:true}});
await test("Dock: with animations off it fades out and back instead",async page=>{await dockTest(page,false);});
await test("Dock: the workout bar takes the dock's place while it is away, and still opens the workout",async page=>{
  /* A page long enough to scroll: the dock stays put on a short one. */
  await startWorkout(page);await leaveWorkout(page);await tapTab(page,"coach");await pause(page);
  const pos=()=>page.evaluate(()=>Math.round(document.querySelector("#wbar .wbar").getBoundingClientRect().bottom));
  const p0=await pos();
  for(let i=0;i<12;i++){await page.evaluate(()=>window.scrollBy(0,15));await page.waitForTimeout(16);}
  await pause(page,650);
  eq(await pos()-p0,64+8,"it drops by the dock's height and the gap");
  await page.tap("#wbar .wbar");await pause(page,500);
  eq(await ev(page,"V.tab"),"train");
},{prefs:{anim:true}});
/* ---- the good parts of an outside proposal, built in ---------------------------------- */
await test("Dock: every tab is labelled, in English and Arabic, and the label starts its accessible name",async page=>{
  const lab=()=>page.$$eval("nav .dock-b",a=>a.map(b=>[b.querySelector(".dock-l").textContent,b.getAttribute("aria-label").indexOf(b.querySelector(".dock-l").textContent)===0]));
  /* The planning tab is "Plan"; the coach itself floats (js/ui/coachfab.js). */
  eq(await lab(),[["Train",true],["Food",true],["Plan",true],["Progress",true]],"English");
  await page.evaluate(async()=>{(await import("/js/state.js")).S.prefs.lang="ar";(await import("/js/ui/render.js")).render();});await pause(page);
  eq((await lab()).map(x=>x[0]),["التمرين","الأكل","الخطة","التقدم"],"Arabic");
});
await test("Dock: round tabs; the one that is on opens into a pill with its name, uncut in either language, even on a small phone",async page=>{
  const st=()=>page.evaluate(()=>[...document.querySelectorAll("nav .dock-b")].map(b=>{const l=b.querySelector(".dock-l"),r=b.getBoundingClientRect();
    return {tab:b.dataset.tab,on:b.classList.contains("on"),w:Math.round(r.width),h:Math.round(r.height),shown:getComputedStyle(l).opacity==="1",cut:l.scrollWidth>l.clientWidth+1};}));
  for(const [lang,w] of [["en",390],["ar",390],["en",360],["ar",360]]){
    await page.setViewportSize({width:w,height:780});
    await page.evaluate(async l=>{(await import("/js/state.js")).S.prefs.lang=l;(await import("/js/ui/render.js")).render();},lang);await pause(page,200);
    for(const tab of ["progress","train","coach"]){
      await tapTab(page,tab);await pause(page,500);
      const s=await st(),on=s.find(x=>x.on),off=s.filter(x=>!x.on);
      eq(on.tab,tab,lang+" "+w+": the tapped tab is on");
      if(!on.shown||on.cut)throw new Error(lang+" "+w+" "+tab+": its name is hidden or cut: "+JSON.stringify(on));
      if(off.some(x=>x.shown||Math.abs(x.w-x.h)>2))throw new Error(lang+" "+w+": a tab that is off is not a plain circle: "+JSON.stringify(off));
      if(on.w<off[0].w+30)throw new Error(lang+" "+w+": the open pill is no wider than a circle");}}
});
await test("Focus: the live workout has no dock; Save and exit brings it back with the session kept",async page=>{
  await startWorkout(page);
  eq(await page.evaluate(()=>[document.body.classList.contains("focus"),getComputedStyle(document.getElementById("nav")).visibility,document.getElementById("nav").getAttribute("aria-hidden")]),[true,"hidden","true"],"no dock while training");
  /* The warm-up's last button, at the very bottom of the page, is reachable: nothing
     sits over it any more. */
  eq(await page.evaluate(async()=>{window.scrollTo(0,document.documentElement.scrollHeight);await new Promise(r=>setTimeout(r,300));
    const s=document.querySelectorAll("#app button"),b=s[s.length-1],r=b.getBoundingClientRect();
    const hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return !!hit&&(hit===b||b.contains(hit));}),true,"the last button is not covered");
  await leaveWorkout(page);
  eq(await page.evaluate(()=>[document.body.classList.contains("focus"),getComputedStyle(document.getElementById("nav")).visibility]),[false,"visible"],"dock back");
  eq(await ev(page,"[!!S.active,V.train]"),[true,"hub"],"the session is kept, Resume on Train");
  await page.tap("[data-continue]");await pause(page);
  eq(await page.evaluate(()=>document.body.classList.contains("focus")),true,"and resuming is focus again");
});
await test("Rest: once it runs out it counts up how long ago, and that survives a reload",async page=>{
  await startWorkout(page);
  await page.evaluate(async()=>{const V=(await import("/js/ui/view.js")).V;V.restTotal=90;V.restEnd=Date.now()-95000;V.restDone=false;});
  await pause(page,1600);
  const over=()=>page.$eval("#restOver",e=>e.textContent);
  if(!/^\+1:3\d$/.test(await over()))throw new Error("expected about +1:35, got "+await over());
  await page.reload();await pause(page,1500);
  if(!/^\+1:3\d$/.test(await over()))throw new Error("after a reload: "+await over());
  /* The check logs from the time-up band: no tap to dismiss it first. */
  await page.fill('#in_r','8');await page.tap('[data-logset]');await pause(page);
  eq(await ev(page,"[V.restDone,V.restOver,S.active.entries[0].sets.length]"),[false,0,1],"the next set clears it");
},{prefs:{autorest:true}});
await test("Covers: a program of your own gets a cover drawn from its week",async page=>{
  await page.evaluate(async()=>{const st=await import("/js/state.js");
    st.S.programs.push({id:"mine1",name:"Mine",schedule:"cycle",days:[{id:"a",name:"A",wd:[],ex:[{id:"1",name:"Push-Up",sets:3,lo:8,hi:12},{id:"2",name:"Pullups",sets:3,lo:5,hi:8}]},{id:"b",name:"Rest",wd:[],ex:[]}]});st.saveDB();});
  await coach(page,"train","programs");
  const r=await page.$$eval(".drow-cov svg",a=>a.map(s=>[s.querySelectorAll(".pc-t").length,s.querySelectorAll(".pc-b").length,s.querySelectorAll(".pc-r").length]));
  eq(r[r.length-1],[1,1,1],"one day of two exercises (a top course and one below), one rest day");
  const c=await page.$eval(".drow-cov .pc-t",e=>getComputedStyle(e).fill);
  eq(c,"rgb(231, 23, 46)","its top course is Signal Red");
},{prefs:{palette:"red"}});
/* ---- training blocks (js/coach/block.js, js/engine/blocks.js) ---- */
const blockAt=(page,start)=>page.evaluate(async st=>{const s=await import("/js/state.js");s.S.block={start:st};s.saveDB();
  (await import("/js/ui/render.js")).render();},start);
await test("Blocks: the first workout starts block 1, and week 1 leaves three in reserve",async page=>{
  await startWorkout(page);
  const r=await page.evaluate(async()=>{const s=(await import("/js/state.js")).S;const sc=await import("/js/engine/schedule.js");const u=await import("/js/util.js");
    return [s.block.start===sc.weekStartOf(u.today()),s.active.block,
      s.active.entries.filter(e=>e.kind!=="activity"&&!e.planned.timed).every(e=>e.planned.rir===3)];});
  eq(r,[true,{n:1,week:1,light:false},true]);
  if(!/3 in reserve/.test(await page.textContent("#app")))throw new Error("the dose does not say 3 in reserve");
});
await test("Blocks: the Train page shows the week, and week 3 asks for one in reserve",async page=>{
  await blockAt(page,iso(15));
  await tapTab(page,"train");await pause(page);
  const t=await page.$eval(".blk",e=>e.innerText);
  if(!/Block 1 · Week 3 of 4/.test(t)||!/1 rep in reserve/.test(t))throw new Error("card: "+t);
  eq(await page.$$eval(".blk-bar i",a=>a.map(i=>i.className)),["done","done","on"," lt"],"two weeks done, this one lit, the lighter one last");
  await page.tap("[data-startday]");await pause(page,400);
  eq(await ev(page,"S.active.entries.filter(e=>e.kind!=='activity'&&!e.planned.timed).every(e=>e.planned.rir===1)"),true,"one in reserve");
});
await test("Blocks: the planned lighter week thins the sets, and ending it starts the next block",async page=>{
  await blockAt(page,iso(23));
  await tapTab(page,"train");await pause(page);
  if(!(await page.$(".blk.light")))throw new Error("no lighter-week card");
  if(await page.$(".dlcard.on"))throw new Error("the deload card shows as well");
  eq(await ev(page,"S.block.start"),iso(23));
  await page.tap('.blk [data-deload="end"]');await pause(page);
  eq(await ev(page,"S.block.start"),iso(0),"the next block starts today");
  const t=await page.$eval(".blk",e=>e.innerText);
  if(!/Block 1 · Week 1 of 4/.test(t))throw new Error("after ending: "+t);
});
await test("Blocks: the lighter week's workout has fewer sets than the plan",async page=>{
  await blockAt(page,iso(23));
  await startWorkout(page);
  const cut=await ev(page,"S.active.entries.map(e=>e.planned.sets)");
  const plan=await page.evaluate(async()=>{const s=await import("/js/state.js");return s.dayOf(s.S.active.dayId).ex.map(e=>e.sets);});
  if(!cut.every((n,i)=>n<plan[i]||n===1))throw new Error("sets not cut: "+cut+" vs "+plan);
  eq(await ev(page,"[S.active.block.light,S.active.entries.filter(e=>e.kind!=='activity'&&!e.planned.timed).every(e=>e.planned.rir===4)]"),[true,true]);
});
await test("Blocks: 'too easy' after a workout adds a set for the muscle it trained",async page=>{
  await startWorkout(page);
  const m=await ev(page,"S.active.entries[0].muscle");
  await page.fill('#in_r','8');await page.tap('[data-logset]');await pause(page,900);
  await finishEarly(page);
  await page.tap('[data-confirmok]');await pause(page,600);
  if(!(await page.$('[data-sfeel="easy"]')))throw new Error("the complete sheet does not ask");
  await page.tap('[data-sfeel="easy"]');await pause(page);
  eq(await ev(page,"[S.sessions[0].feel,document.querySelector('[data-sfeel=\"easy\"]').getAttribute('aria-pressed')]"),["easy","true"]);
  const sh=await page.evaluate(async()=>(await import("/js/engine/blocks.js")).shiftNow().shift);
  eq(sh[m],1,"one more set of "+m+" per workout");
  /* The next workout with that muscle carries it, and says so. */
  const r=await page.evaluate(async mu=>{const s=await import("/js/state.js");const a=await import("/js/ui/actions.js");
    const ex=await import("/js/data/exercises.js");
    const sp=s.split(),d=sp.days.find(x=>x.ex.some(e=>ex.muscleOf(e.name)===mu));if(!d)return null;
    (await import("/js/ui/view.js")).V.sheet=null;
    a.startDay(d.id);const e=s.S.active.entries.find(x=>x.muscle===mu);return [e.planned.sets-e.planned.plan];},m);
  eq(r,[1],"the first "+m+" exercise has one set more than the plan");
  await pause(page,300);
  if(!/1 more than the plan/.test(await page.textContent("#app")))throw new Error("the logger does not say so");
},{prefs:{autorest:false}});
await test("Blocks: answering again takes the answer back",async page=>{
  await startWorkout(page);
  await page.fill('#in_r','8');await page.tap('[data-logset]');await pause(page,900);
  await finishEarly(page);
  await page.tap('[data-confirmok]');await pause(page,600);
  await page.tap('[data-sfeel="much"]');await pause(page);
  await page.tap('[data-sfeel="much"]');await pause(page);
  eq(await ev(page,"S.sessions[0].feel===undefined"),true);
},{prefs:{autorest:false}});
await test("Blocks: turned off in Settings, no block, no card, the plan's own effort",async page=>{
  await blockAt(page,iso(15));
  await tapTab(page,"profile");await pause(page);
  await page.evaluate(async()=>{(await import("/js/ui/actions.js")).openSheet("set_training");});await pause(page);
  await page.tap('[data-toggle="noblocks"]');await pause(page);
  eq(await ev(page,"[S.prefs.noblocks,S.block===undefined]"),[true,true],"off, and the block forgotten");
  await page.evaluate(async()=>{(await import("/js/ui/actions.js")).closeSheet();});await pause(page);
  await tapTab(page,"train");await pause(page);
  if(await page.$(".blk"))throw new Error("a block card while off");
  await page.tap("[data-startday]");await pause(page,400);
  eq(await ev(page,"[S.block===undefined,S.active.block===undefined]"),[true,true],"no block started");
});
await test("Blocks: a program with its own weeks keeps them, with no block on top",async page=>{
  const r=await page.evaluate(async()=>{const s=await import("/js/state.js");const b=await import("/js/engine/blocks.js");
    const on1=b.blocksOn();const sp=s.split();sp.days.find(d=>d.ex.length).ex[0].wk=[1,4];const on2=b.blocksOn();delete sp.days.find(d=>d.ex.length).ex[0].wk;return [on1,on2];});
  eq(r,[true,false]);
});
/* ---- movement patterns (js/data/movement.js) ---- */
const mv=(page,names)=>page.evaluate(async ns=>{const ex=await import("/js/data/exercises.js");return ns.map(n=>ex.movementOfEx(n));},names);
await test("Movement: Replace lists what trains the same thing first, set apart",async page=>{
  await startWorkout(page);
  const cur=await ev(page,"S.active.entries[0].name");
  await page.tap('[data-swap]');await pause(page,500);
  const h=await page.$eval('#sheet .pksame-h',e=>e.innerText);
  if(!/Trains the same thing/i.test(h))throw new Error("heading: "+h);
  const same=await page.$$eval('#sheet .pksame [data-pickex]',a=>a.map(b=>b.getAttribute("data-pickex")));
  if(!same.length)throw new Error("nothing in the same-movement group");
  const want=(await mv(page,[cur]))[0];
  eq((await mv(page,same)).every(m=>m===want),true,"every one is a "+want);
  if(same.indexOf(cur)>=0)throw new Error("the exercise is its own alternative");
  /* A search is a search: the group steps aside. */
  await page.fill('#exq','curl');await pause(page,500);
  eq(await page.$('#sheet .pksame'),null,"no group while searching");
},{prefs:{autorest:false}});
await test("Movement: pain opens Replace on the same movement, loaded another way",async page=>{
  await startWorkout(page);
  const cur=await ev(page,"S.active.entries[0].name");
  await page.tap('[data-sessmore]');await pause(page);await page.tap('#sheet [data-hurt]');await pause(page);await page.tap('[data-hurtdo="swap"]');await pause(page,500);
  const h=await page.$eval('#sheet .pksame-h',e=>e.innerText);
  if(!/loaded another way/i.test(h))throw new Error("heading: "+h);
  const r=await page.evaluate(async c=>{const ex=await import("/js/data/exercises.js");
    const first=document.querySelector('#sheet .pksame [data-pickex]').getAttribute("data-pickex");
    const e0=(ex.EXDB[c]||{}).e,e1=(ex.EXDB[first]||{}).e;
    const others=[...document.querySelectorAll('#sheet .pksame [data-pickex]')].some(b=>(ex.EXDB[b.getAttribute("data-pickex")]||{}).e!==e0);
    return [ex.movementOfEx(first)===ex.movementOfEx(c),!others||e1!==e0];},cur);
  eq(r,[true,true],"same movement, and other equipment first where there is any");
  eq(await ev(page,"S.active.entries[0].pain"),true,"the pain is still noted");
},{prefs:{autorest:false}});
await test("Movement: kit you don't have is offered as the same movement on what you do",async page=>{
  await page.evaluate(async()=>{const s=await import("/js/state.js");s.S.gear=["Dumbbell"];s.saveDB();});
  await startWorkout(page);
  const r=await page.evaluate(async()=>{const s=(await import("/js/state.js")).S;const ex=await import("/js/data/exercises.js");
    const need=s.active.entries.filter(e=>e.kind!=="activity"&&!ex.pickable(e.name));
    return need.map(e=>[e.altWhy,!!e.alt&&ex.movementOfEx(e.alt)===ex.movementOfEx(e.name),!!e.alt&&ex.pickable(e.alt)]);});
  if(!r.length)throw new Error("the day needs nothing the person lacks: the test proves nothing");
  const offered=r.filter(x=>x[0]==="gear");
  if(!offered.length)throw new Error("nothing offered: "+JSON.stringify(r));
  eq(offered.every(x=>x[1]&&x[2]),true,"same movement, on kit they have");
  const i=await ev(page,"S.active.entries.findIndex(e=>e.altWhy==='gear')");
  await page.evaluate(async i=>{(await import("/js/ui/workout.js")).jumpTo(i);},i);await pause(page,400);
  if(!/Don't have the kit\?/.test(await page.$eval('.exalt',e=>e.innerText)))throw new Error("no offer in the logger");
});
await test("Movement: the exercise sheet says what movement it is",async page=>{
  await page.evaluate(async()=>{(await import("/js/ui/actions.js")).openSheet("exdetail",{name:"Romanian Deadlift"});});await pause(page,400);
  const t=await page.$eval('.exd-facts .wide',e=>e.innerText);
  if(!/Movement/i.test(t)||!/Hinge/.test(t))throw new Error("facts: "+t);
});
await test("Movement: the plan builder's stand-ins keep the movement",async page=>{
  const r=await page.evaluate(async()=>{const pl=await import("/js/engine/plan.js");const ex=await import("/js/data/exercises.js");
    const cases=[["Barbell Squat",["Dumbbell"]],["Barbell Bench Press - Medium Grip",["Dumbbell"]],["Bent Over Barbell Row",["Dumbbell"]],["Pullups",["Cable"]],["Standing Military Press",["Dumbbell"]]];
    return cases.map(([n,g])=>{const s=pl.standIn(n,g,[]);return [n,s,!!s&&ex.movementOfEx(s)===ex.movementOfEx(n)];});});
  const bad=r.filter(x=>!x[2]);
  if(bad.length)throw new Error("lost the movement or found none: "+JSON.stringify(bad));
  const knee=await page.evaluate(async()=>{const pl=await import("/js/engine/plan.js");return pl.standIn("Freehand Jump Squat",[],["knee"]);});
  if(knee&&/Jump|Hop|Bound/i.test(knee))throw new Error("a sore knee was given another jump: "+knee);
});
/* Pain is logged, never advised on (js/knowledge/scope.js); asked what it is, the
   answer is who to see, and what in the next workout loads the area — the plan's
   data, not a treatment. */
await test("Movement: pain said is offered the recovery log and no advice; asked about, it is referred, with what loads the area",async page=>{
  await openChat(page,"today");
  await page.fill('#chatq',"my knee hurts");await page.press('#chatq','Enter');await pause(page,400);
  let a=await page.evaluate(()=>{const x=(document.querySelectorAll(".chat-more").forEach(d=>d.open=true),[...document.querySelectorAll(".chat-a")].pop());return x?x.innerText:"";});
  if(!/recovery log/.test(a)||/stop|rest it|ice|stretch|should/i.test(a.replace(/recovery log\?/,"")))throw new Error("pain said: "+a);
  eq(await page.$$eval('#cpanel .chat-x.live .chat-acts button',b=>b.map(x=>x.dataset.sheet||(x.dataset.chatsay!=null?"swap":""))),["recovery","swap"],
    "the recovery log, and the offer to swap out what loads it (batch 3), nothing else");
  await page.fill('#chatq',"why does my knee hurt?");await page.press('#chatq','Enter');await pause(page,400);
  a=await page.evaluate(()=>{const x=(document.querySelectorAll(".chat-more").forEach(d=>d.open=true),[...document.querySelectorAll(".chat-a")].pop());return x?x.innerText:"";});
  if(!/physio or a doctor, not me/.test(a)||!/load the knee|loads the knee/.test(a))throw new Error("pain asked: "+a);
  await page.fill('#chatq',"ركبتي بتوجعني");await page.press('#chatq','Enter');await pause(page,400);
  eq(await ev(page,"S.chat[S.chat.length-1].id"),"situation","Arabic: the same");
});
/* ---- state with a schema (js/schema.js) ---- */
await test("Schema: a backup from a newer version of the app is refused, and says why",async page=>{
  await page.evaluate(async()=>{(await import("/js/ui/actions.js")).openSheet("restore");});await pause(page);
  await page.fill('#rs','{"v":99,"profile":{},"sessions":[]}');await page.tap('[data-dorestore]');await pause(page);
  eq(await ev(page,"V.sheet"),"restore","nothing replaced");
  if(!/newer version/.test(await page.textContent(".toast")))throw new Error("no reason given");
  await page.fill('#rs','{"prefs":{},"sessions":{"a":1}}');await page.tap('[data-dorestore]');await pause(page);
  if(!/damaged/.test(await page.textContent(".toast")))throw new Error("a damaged backup is not called damaged");
});
await test("Schema: a damaged workout in a backup is left out, and the confirm says so",async page=>{
  await page.evaluate(async()=>{(await import("/js/ui/actions.js")).openSheet("restore");});await pause(page);
  const bk={v:3,profile:{age:30},prefs:{lang:"en",splash:false,anim:false},sessions:[{id:"a",date:"2026-10-01",entries:[{name:"Pullups",sets:[{w:0,r:8}]}]},{id:"b",date:7,entries:"x"}],days:{}};
  await page.fill('#rs',JSON.stringify(bk));await page.tap('[data-dorestore]');await pause(page);
  const body=await page.textContent("#sheet");
  if(!/1 workouts/.test(body)||!/1 damaged workout is left out/.test(body))throw new Error("confirm: "+body.slice(0,300));
  await page.tap('[data-confirmok]');await pause(page,1000);
  eq(await ev(page,"[S.sessions.length,S.sessions[0].id,S.v]"),[1,"a",3],"restored, without the damaged one, at the current version");
});
await test("Schema: an old profile (v1 splits) opens as programs you own and is saved as v3",async page=>{
  eq(await ev(page,"[S.v,S.programs.length>=1,!!S.activeProgram,'splits' in S,'currentSplit' in S]"),[3,true,true,false,false]);
  eq(await ev(page,"S.programs.find(p=>p.id===S.activeProgram).days[0].id"),"keep1","the day ids history is keyed on are kept");
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem("bunyan:db:me")).v);
  eq(stored,3,"and saved that way");
},{db:(()=>{const d=seed();delete d.v;delete d.programs;delete d.activeProgram;delete d.userSplits;
  d.splits=[{id:"ppl",name:"Push Pull Legs",days:[{id:"keep1",name:"Push",ex:[{id:"e1",name:"Pushups",sets:3,lo:8,hi:12}]}]}];d.currentSplit="ppl";return d;})()});
/* ---- the Coach chat and Profile redesign (js/ui/views/chat.js, js/ui/settings.js) ---- */
const sheet=async(page,name)=>{await page.evaluate(async n=>{(await import("/js/ui/actions.js")).openSheet(n);},name);await pause(page);};
/* The floating Coach opens on a short line and three questions for where it was opened
   (the tall list of twelve is gone); the field sits under the conversation. */
await test("Coach chat: the panel opens on three questions for where it was opened; a typed question is cleared once answered, and the answer names its subject",async page=>{
  await openChat(page);
  eq(await page.$$eval('#cpanel .cp-sug [data-chatq]',a=>a.map(b=>b.dataset.chatq)),["balance","track","plan"],"Coach's own questions");
  const f=await page.evaluate(()=>{const b=document.getElementById("cpB").getBoundingClientRect(),f=document.querySelector(".cp-f").getBoundingClientRect();return f.top>=b.bottom-1;});
  eq(f,true,"the field is under the conversation, never over it");
  await page.fill('#chatq','how much protein do I need');await page.press('#chatq','Enter');await pause(page,400);
  eq(await page.$eval('#chatq',e=>e.value),"","the box is empty once the question is answered");
  eq(await page.evaluate(()=>[...document.querySelectorAll(".chat-a .chat-at")].pop().textContent),"Protein","the answer names its subject");
  eq(await page.$$eval('#cpanel .cp-sug',a=>a.length),0,"the opening questions give way to the conversation");
  if(!(await page.$('#cpanel .chat-next .chat-chips [data-chatq]')))throw new Error("nothing offered to ask next");
  /* Opened from Food, it offers food questions. */
  await page.tap('.cp [data-coachclose]');await pause(page,400);
  await page.evaluate(async()=>{(await import("/js/state.js")).S.chat=[];});
  await pause(page,600);await tapTab(page,"food");await pause(page,300);await page.tap('#cfab .cfab');await pause(page,400);
  eq(await page.$$eval('#cpanel .cp-sug [data-chatq]',a=>a.map(b=>b.dataset.chatq)),["rest","eat","protein"],"Food's questions");
});
await test("Settings: every choice in sight, switches that say their state, a tap sets the value; no drop-down anywhere",async page=>{
  await sheet(page,"set_training");
  const sw=()=>page.$eval('[data-toggle="nowarm"]',e=>[e.getAttribute("role"),e.getAttribute("aria-checked")]);
  eq(await sw(),["switch","false"],"warm-up is off in the seed, and says so");
  await page.tap('[data-toggle="nowarm"]');await pause(page);
  eq([await sw(),await ev(page,"S.prefs.nowarm")],[["switch","true"],false],"one tap on the row turns it on");
  for(const [sel,expr,want] of [['[data-setprog="aggressive"]',"S.profile.prog","aggressive"],['[data-setrpe="every"]',"S.prefs.rpe","every"],
    ['[data-setwarn="15"]',"S.prefs.warn",15],['[data-setdb="total"]',"S.prefs.dbLoad","total"]]){
    await page.tap(sel);await pause(page,200);eq(await ev(page,expr),want,sel);}
  eq(await page.$eval('[data-setprog="aggressive"]',e=>e.getAttribute("aria-pressed")),"true","the chosen one is marked");
  await sheet(page,"set_app");
  await page.tap('[data-setunit="lb"]');await pause(page,200);
  await page.tap('[data-setcompact="1"]');await pause(page,200);
  eq(await ev(page,"[S.prefs.unit,S.prefs.compact,document.body.classList.contains('compact')]"),["lb",true,true],"units and density");
  await page.tap('[data-setlang="ar"]');await pause(page,300);
  eq(await ev(page,"[S.prefs.lang,document.documentElement.dir]"),["ar","rtl"],"Arabic, right to left");
  await page.tap('[data-setlang="en"]');await pause(page,300);
  eq(await ev(page,"S.prefs.lang"),"en","and back");
  for(const n of ["set_you","set_training","set_app","set_profiles","set_data","backup","share","about"]){
    await sheet(page,n);eq(await page.$$eval('#sheet select',a=>a.length),0,"no drop-down in "+n);}
});
await test("You: sex, activity and goal wait for Save, with the numbers; closing without it changes nothing",async page=>{
  await sheet(page,"set_you");
  await page.tap('[data-ypick="p_sex|f"]');await pause(page,200);
  await page.tap('[data-ypick="p_act|1.725"]');await pause(page,200);
  await page.tap('[data-ypick="p_goal|lose"]');await pause(page,200);
  eq(await ev(page,"[S.profile.sex,S.profile.activity,S.profile.goal]"),["m",1.4,"gain"],"nothing yet");
  eq(await page.$eval('[data-ypick="p_act|1.725"]',e=>e.getAttribute("aria-checked")),"true","the pick is shown");
  await page.fill('#p_age','41');
  await page.tap('[data-saveyou]');await pause(page);
  eq(await ev(page,"[S.profile.sex,S.profile.activity,S.profile.goal,S.profile.age]"),["f",1.725,"lose",41],"saved together");
  await sheet(page,"set_you");await page.tap('[data-ypick="p_sex|m"]');await pause(page,200);
  await page.evaluate(async()=>{(await import("/js/ui/actions.js")).closeSheet();});await pause(page);
  eq(await ev(page,"S.profile.sex"),"f","closed without Save: unchanged");
});
await test("Backup: what it holds, counted; the raw text folded away until asked for",async page=>{
  await sheet(page,"backup");
  const n=await ev(page,"S.sessions.length");
  eq(await page.$eval('.bk-holds b',e=>e.textContent),String(n),"workouts counted");
  eq(await page.$eval('details.adv',e=>e.open),false,"folded");
  eq(await page.$eval('#bk',e=>e.checkVisibility()),false,"no text on screen");
  await page.tap('details.adv summary');await pause(page,200);
  eq(await page.$eval('#bk',e=>e.checkVisibility()),true,"shown when asked for");
  await sheet(page,"set_data");
  eq(await page.$eval('[data-wipe]',e=>!e.closest('.sg-list').querySelector('[data-export]')),true,"Delete everything is apart from the safe rows");
});
await test("Profile: a summary page; every row opens its sheet; the backup row warns when there is none; About holds the small print",async page=>{
  await tapTab(page,"profile");await pause(page);
  eq(await page.$eval('.pid .pid-n',e=>e.textContent),await ev(page,"(Object.assign({},JSON.parse(localStorage.getItem('bunyan:profiles'))[0])).name"),"the name");
  for(const s of ["set_you","set_training","set_app","set_profiles","set_data","about"])
    if(!(await page.$('#app [data-sheet="'+s+'"]')))throw new Error("no way to "+s);
  if(!(await page.$('#app [data-sheet="set_data"] .gtile.warn')))throw new Error("never backed up, and no warning");
  await page.tap('#app [data-sheet="about"]');await pause(page);
  if(!/Epley/.test(await page.$eval('#sheet',e=>e.innerText)))throw new Error("About lacks the formulas note");
});
/* ---- the chat answers in the language it is asked in, and knows more (js/ui/views/chat.js) ---- */
/* A day with a plan: breakfast eaten, three meals still to go, all from the food list. */
function planned(){
  const db=seed(),pi=(n,fid,g,kcal,p,c,f)=>({n,fid,grams:g,label:g+" g",kcal,p,c,f});
  db.mealSlots=[{id:"Breakfast",plan:[pi("Eggs","egg",100,143,12.6,0.7,9.5)]},
    {id:"Lunch",plan:[pi("Chicken Breast, Grilled","chicken_breast_ck",150,248,46,0,5.4),pi("White Rice, Cooked","rice_ck",200,260,5.4,56,0.6)]},
    {id:"Snack",plan:[pi("Greek Yogurt","greek_yog",170,100,17,6,0.7)]},
    {id:"Dinner",plan:[pi("Lentils, Cooked","lentils",200,232,18,40,0.8)]}];
  db.days[iso(0)]={meals:{Breakfast:{done:true,items:[pi("Eggs","egg",100,143,12.6,0.7,9.5)]}}};
  return db;}
const lastX=page=>page.evaluate(()=>{const x=[...document.querySelectorAll(".chat-x")].pop();
  return {lang:x.getAttribute("lang"),dir:x.getAttribute("dir"),a:(x.querySelectorAll(".chat-more").forEach(d=>d.open=true),x.querySelector(".chat-a").innerText)};});
async function chatAsk(page,q){await page.fill('#chatq',q);await page.press('#chatq','Enter');await pause(page,400);return lastX(page);}
await test("Coach chat: what to ask next is a list after the first answer, then one slim row that keeps the conversation's room",async page=>{
  await openChat(page);
  await chatAsk(page,"how much protein do I need");
  eq(await page.$$eval('#cpanel .chat-next',a=>a.map(d=>[d.classList.contains("slim"),!!d.querySelector(".chat-next-h")])),[[false,true]],"first: the list under its heading");
  await chatAsk(page,"what should I eat now");
  const r=await page.evaluate(()=>{const d=document.querySelector("#cpanel .chat-next"),c=d.querySelector(".chat-chips"),b=[...c.children];
    return [d.classList.contains("slim"),!!d.querySelector(".chat-next-h"),d.getAttribute("aria-label"),new Set(b.map(x=>Math.round(x.getBoundingClientRect().top))).size,b.length>0];});
  eq(r,[true,false,"Ask next",1,true],"then: one row, named for a screen reader");
});
await test("Coach chat: asked in Arabic in the English app, it answers in Arabic, and what it offers next is Arabic too; asked in English in the Arabic app, English",async page=>{
  await openChat(page);
  let r=await chatAsk(page,"بينش بريس كام؟");
  eq([await ev(page,"S.chat[S.chat.length-1].id"),r.lang,r.dir],["weights","ar","rtl"],"a misspelt bench press in Arabic: the weights, in Arabic");
  if(!/بنش بريس/.test(r.a)||/Squat|سكوات/.test(r.a))throw new Error("not the bench press alone: "+r.a);
  const chips=await page.$$eval('.chat-next [data-chatq]',a=>a.map(b=>[b.dataset.chatl,/[؀-ۿ]/.test(b.textContent)]));
  if(!chips.length||chips.some(c=>c[0]!=="ar"||!c[1]))throw new Error("the next questions are not Arabic: "+JSON.stringify(chips));
  await page.tap('.chat-next [data-chatq]');await pause(page,400);
  eq((await lastX(page)).lang,"ar","a tap on one keeps to Arabic");
  r=await chatAsk(page,"3ayez akol eh delwa2ty");
  eq([await ev(page,"S.chat[S.chat.length-1].id"),r.lang],["eat","ar"],"Arabic in Latin letters is Arabic");
  r=await chatAsk(page,"what should I eat");
  eq([r.lang,/[؀-ۿ]/.test(r.a)],["en",false],"and English again is English");
  eq(await ev(page,"S.prefs.lang"),"en","the app's own language is untouched");
});
await test("Coach chat: in the Arabic app, an English question gets an English answer",async page=>{
  await openChat(page);
  const r=await chatAsk(page,"how much protein do I need");
  eq([await ev(page,"S.chat[S.chat.length-1].id"),r.lang,r.dir],["protein","en","ltr"],"English");
  if(/[؀-ۿ]/.test(r.a))throw new Error("Arabic in the answer: "+r.a);
  eq(await ev(page,"[S.prefs.lang,document.documentElement.dir]"),["ar","rtl"],"the app stays Arabic");
},{prefs:{lang:"ar"}});
await test("Coach chat: the rest of today from the plan, swaps with the same macros that are never the same food, and what is in a food",async page=>{
  await openChat(page);
  let r=await chatAsk(page,"What should I eat for the rest of the day?");
  eq(await ev(page,"S.chat[S.chat.length-1].id"),"rest","the rest of the day");
  for(const m of ["Lunch","Snack","Dinner"])if(r.a.indexOf(m)<0)throw new Error(m+" is missing: "+r.a);
  if(/Breakfast/.test(r.a))throw new Error("breakfast is already eaten: "+r.a);
  if(!/Lentils, Cooked/.test(r.a)||/Cooked, /.test(r.a))throw new Error("foods run together: "+r.a);
  r=await chatAsk(page,"Is there other food options u can provide with same macros");
  eq(await ev(page,"S.chat[S.chat.length-1].id"),"swap","swaps");
  const rows=r.a.split("\n").filter(x=>x.indexOf("→")>0);
  if(rows.length<2)throw new Error("no swaps: "+r.a);
  for(const x of rows){const [from,to]=x.split("→"),w=from.trim().split(/[ ,]/)[0].toLowerCase();
    if(to.toLowerCase().indexOf(w)>=0)throw new Error("swapped for itself: "+x);
    if(to.split("·").length<2)throw new Error("fewer than two choices: "+x);}
  r=await chatAsk(page,"how much protein in eggs");
  eq(await ev(page,"S.chat[S.chat.length-1].id"),"foodinfo","what is in a food");
  if(!/Eggs.*6\.3 g protein/.test(r.a)||!/Per 100 g/.test(r.a))throw new Error("egg facts: "+r.a);
  r=await chatAsk(page,"كام بروتين في البيض");
  eq([await ev(page,"S.chat[S.chat.length-1].id"),r.lang],["foodinfo","ar"],"the same, asked in Arabic");
  if(!/بيض/.test(r.a)||!/6\.3 جم بروتين/.test(r.a))throw new Error("Arabic egg facts: "+r.a);
},{db:planned()});
await test("Coach chat: tomorrow's workout and how the last one went",async page=>{
  await openChat(page);
  let r=await chatAsk(page,"what do I train tomorrow");
  eq(await ev(page,"S.chat[S.chat.length-1].id"),"tomorrow","tomorrow");
  if(!/Tomorrow/.test(r.a))throw new Error(r.a);
  r=await chatAsk(page,"how did my last workout go");
  eq(await ev(page,"S.chat[S.chat.length-1].id"),"last","the last workout");
  if(!/Bench Press: 60 kg × 8/.test(r.a)||!/[\d,]+ kg lifted in all/.test(r.a))throw new Error(r.a);
  if(!(await page.$('.chat-acts [data-openday]')))throw new Error("no way to the session");
});
/* ---- the new look: the top of Training, capsule bars (views/home.js, views/progress.js) ---- */
await test("Training: the bell says what the coach noticed and opens it; the initial opens Profile",async page=>{
  await tapTab(page,"train");await pause(page);
  const n=await ev(page,"V.advice");
  const b=await page.$eval('.hacts [data-csec="ai"]',e=>[e.classList.contains("flag"),e.getAttribute("aria-label")]);
  eq(b[0],n>0,"the dot is there exactly when there is something");
  if(n>0&&b[1].indexOf(String(n))<0)throw new Error("the count is not in its name: "+b[1]);
  await page.tap('.hacts [data-csec="ai"]');await pause(page,400);
  eq(await ev(page,"[V.tab,V.csec]"),["coach","ai"],"the bell opens Coach AI");
  await tapTab(page,"train");await pause(page);
  await page.tap('.hacts .havatar');await pause(page,400);
  eq(await ev(page,"V.tab"),"profile","the initial opens Profile");
  eq(await page.$$eval("nav .dock-b",a=>a.map(b=>b.dataset.tab)),["train","food","coach","progress"],"Profile is not on the dock");
  eq(await page.$eval("nav .dock-b.on",e=>e.dataset.tab),"train","Training stays lit under Profile");
  await page.tap('#app [data-back]');await pause(page,500);
  eq(await ev(page,"V.tab"),"train","back returns to Training");
});
await test("Profile picture: both choices in sight; a photo from the phone shows on Training and Profile, across a reload; the initial comes back",async page=>{
  await tapTab(page,"profile");await pause(page,400);
  await page.tap('.pid-av');await pause(page,500);
  eq(await ev(page,"V.sheet"),"set_avatar","the picture opens its sheet");
  eq(await page.$$eval('#sheet .avopt',a=>a.map(x=>[x.classList.contains("on"),!!x.querySelector('input[type=file][accept="image/*"]'),!!x.dataset.avinit])),
    [[false,true,false],[true,false,true]],"upload a photo, and the initial (in use)");
  await page.setInputFiles('#av_file',new URL("../icon-180.png",import.meta.url).pathname);
  for(let i=0;i<20&&!(await ev(page,"!!S.profile.photo"));i++)await pause(page,150);
  eq(await ev(page,"/^data:image\\/jpeg;base64,/.test(S.profile.photo)&&S.profile.photo.length<60000"),true,"kept small, as a JPEG");
  eq(await page.$$eval('.pid .pmono img.avimg',a=>a.length),1,"Profile shows it");
  await page.reload();await pause(page,1000);
  await tapTab(page,"train");await pause(page);
  eq(await page.$$eval('.hacts .havatar img.avimg',a=>a.length),1,"Training's top right shows it, after a reload");
  await page.tap('.hacts .havatar');await pause(page,400);
  await page.tap('.pid-av');await pause(page,500);
  await page.tap('#sheet [data-avinit]');await pause(page,400);
  eq(await ev(page,"'photo' in S.profile"),false,"let go");
  await page.tap('#sheet [data-close]');await pause(page,400);
  eq(await page.$eval('.pid .pmono',e=>[!!e.querySelector("img"),e.textContent.trim().length>0]),[false,true],"the initials are back");
});
/* ---- the coach's action half (js/ui/agent.js, js/ui/handlers/actions.js) ---- */
async function agSay(page,q){await page.fill('#chatq',q);await page.press('#chatq','Enter');await pause(page,450);
  return page.evaluate(()=>{const x=[...document.querySelectorAll("#cpanel .chat-x")].pop();
    return {lead:(x.querySelector(".chat-lead")||{}).textContent||"",opts:[...x.querySelectorAll(".ag-opt .ag-ol")].map(e=>e.textContent),
      ok:!!x.querySelector("[data-agok]"),done:(x.querySelector(".ag-done")||{}).textContent||"",undone:(x.querySelector(".ag-undone")||{}).textContent||"",
      lang:x.getAttribute("lang"),dir:x.getAttribute("dir")};});}
const agLast=page=>page.evaluate(()=>{const x=[...document.querySelectorAll("#cpanel .chat-x")].pop();
  return {lead:(x.querySelector(".chat-lead")||{}).textContent||"",opts:[...x.querySelectorAll(".ag-opt .ag-ol")].map(e=>e.textContent),
    ok:!!x.querySelector("[data-agok]"),done:(x.querySelector(".ag-done")||{}).textContent||"",undone:(x.querySelector(".ag-undone")||{}).textContent||""};});
const dayEx=(page,i)=>ev(page,`(async()=>{const s=(await import("/js/state.js")).split();return s.days[${i}].ex.map(e=>e.name);})()`);
await test("Coach brain: questions no fixed answer is for are answered from the whole knowledge base, with the person's own numbers; follow-ups are read with the question before them; no source is ever shown",async page=>{
  await openChat(page);
  const last=()=>page.evaluate(()=>{const x=[...document.querySelectorAll("#cpanel .chat-x")].pop();
    x.querySelectorAll(".chat-more").forEach(d=>d.open=true);
    return {lead:(x.querySelector(".chat-lead")||{}).textContent||"",all:x.querySelector(".chat-a").textContent,topic:(x.querySelector(".chat-at")||{}).textContent||""};});
  await agSay(page,"How many hours I should sleep?");let r=await last();
  if(!/7.9 hours|hours: 7.9/.test(r.lead))throw new Error("sleep: "+r.lead);
  eq(r.topic,"Good to know","not soreness");
  await agSay(page,"Yeah but how many hours?");r=await last();
  if(!/7.9/.test(r.lead))throw new Error("the follow-up lost the question: "+r.lead);
  await agSay(page,"why?");r=await last();
  if(/won't guess/.test(r.all))throw new Error("why: "+r.all);
  await agSay(page,"what is a superset");r=await last();
  if(!/two exercises/i.test(r.lead))throw new Error("superset: "+r.lead);
  await agSay(page,"how much fiber should I eat");r=await last();
  if(!/\d/.test(r.all)||!/fibre|g per day/i.test(r.all))throw new Error("fibre: "+r.all);
  await agSay(page,"what is the capital of france");r=await last();
  if(!/won't guess/.test(r.lead))throw new Error("an invented answer: "+r.lead);
  /* Water answers with the person's own target and today. */
  await agSay(page,"how much water should I drink");r=await last();
  if(!/ml/.test(r.all))throw new Error("water: "+r.all);
  eq(await page.evaluate(()=>document.querySelectorAll("#cpanel .chat-src").length+[...document.querySelectorAll("#cpanel .chat-a")].filter(a=>/coaching notes|\.js\b/i.test(a.textContent)).length),0,"no source shown");
});
await test("Coach brain in Arabic: a knowledge question gets an Arabic answer around the figures",async page=>{
  await openChat(page);
  const r=await agSay(page,"نوم كام ساعة؟");
  if(!/7.9/.test(r.lead))throw new Error("sleep in Arabic: "+r.lead);
  eq([r.lang,r.dir],["ar","rtl"],"Arabic answer");
},{prefs:{lang:"ar"}});
await test("Coach does what the app does: opens places, adds water and steps, changes settings with Undo, moves calories, all through the app's own buttons",async page=>{
  await openChat(page);
  const d=()=>ev(page,"S.days[(new Date(Date.now()-new Date().getTimezoneOffset()*6e4)).toISOString().slice(0,10)]||{}");
  const w0=(await d()).water||0;
  let r=await agSay(page,"add 2 glasses of water");
  if(!/500 ml/.test(r.lead)||!r.ok)throw new Error("water: "+JSON.stringify(r));
  eq((await d()).water||0,w0,"nothing before the tap");
  await page.tap('#cpanel [data-agok]');await pause(page,400);
  eq((await d()).water||0,w0+500,"water added");
  r=await agLast(page);if(!/Added 500 ml/.test(r.done))throw new Error("done: "+r.done);
  await page.tap('#cpanel [data-agundo]');await pause(page,400);
  eq((await d()).water||0,w0,"undone");
  r=await agSay(page,"log 8000 steps");await page.tap('#cpanel [data-agok]');await pause(page,400);
  eq((await d()).steps,8000,"steps saved");  r=await agSay(page,"switch to pounds");
  eq(await ev(page,"S.prefs.unit"),"lb","pounds at once");
  if(!/lb/.test(r.done))throw new Error("units: "+r.done);
  await page.tap('#cpanel [data-agundo]');await pause(page,400);
  eq(await ev(page,"S.prefs.unit"),"kg","units undone");
  const k0=await ev(page,"S.goals.kcal");
  r=await agSay(page,"raise my calories by 200");await page.tap('#cpanel [data-agok]');await pause(page,400);
  eq(await ev(page,"S.goals.kcal"),Math.round((k0+200)/10)*10,"calories raised");
  /* Going somewhere lets the panel go with the move. */
  await page.fill('#chatq',"open my meal plan");await page.press('#chatq','Enter');await pause(page,1300);
  eq([await ev(page,"V.tab"),await ev(page,"V.cfsub")],["coach","plan"],"meal plan opened");
  await openChat(page);
  r=await agSay(page,"how much water should I drink");
  if(r.ok)throw new Error("a question is not a command");
});
await test("Coach: asked to make the program home based with no equipment, it opens the plan rebuilt for bodyweight to review, changing nothing yet",async page=>{
  await openChat(page);
  const before=await ev(page,"JSON.stringify(S.programs)");
  await page.fill('#chatq',"Can I restructure my workout plan to be home based with no equipment?");await page.press('#chatq','Enter');await pause(page,600);
  /* Said first, with a button: nothing moves until it is tapped. */
  const r0=await agLast(page);
  if(!/rebuild your program for no equipment/.test(r0.lead)||!r0.ok)throw new Error("not said first: "+r0.lead);
  eq(await ev(page,"!!V.assess"),false,"still in the chat");
  await page.tap('#cpanel [data-agok]');await pause(page,1000);
  eq([await ev(page,"V.assess"),await ev(page,"V.asd&&V.asd.gear"),await ev(page,"V.asd&&V.asd.step")===await page.evaluate(async()=>(await import("/js/ui/views/assess.js")).STEPS.indexOf("result"))],[true,"bw",true],"the result, for bodyweight");
  eq(await ev(page,"JSON.stringify(S.programs)")===before,true,"nothing changed before Use this plan");
});
await test("Haptics: on an iPhone a tap ticks the hidden switch, and no tap branch sees it",async page=>{
  const r=await page.evaluate(async()=>{
    const V=await import("/js/ui/view.js"),S=(await import("/js/state.js")).S;S.prefs.haptic=true;
    let seen=0;document.addEventListener("click",e=>{if(e.target.closest&&e.target.closest(".hapt"))seen++;});
    /* A fresh switch for each tick, clicked and gone: watch it come and go. */
    let made=0,toggled=0;const mo=new MutationObserver(m=>m.forEach(x=>x.addedNodes.forEach(n=>{if(n.classList&&n.classList.contains("hapt")){made++;n.querySelector("input").addEventListener("change",()=>toggled++);}})));
    mo.observe(document.head,{childList:true});
    const clicked=[];const orig=HTMLLabelElement.prototype.click;HTMLLabelElement.prototype.click=function(){if(this.classList.contains("hapt"))clicked.push(!!this.querySelector("input[switch]")&&this.isConnected);return orig.call(this);};
    V.tap("light");V.tap("ok");await new Promise(r=>setTimeout(r,30));mo.disconnect();HTMLLabelElement.prototype.click=orig;
    return [made,clicked,document.querySelectorAll(".hapt").length,seen,typeof V.canBuzz()];});
  eq(r,[2,[true,true],0,0,"boolean"],"a switch per tick, clicked while in the page, then removed; no tap branch sees it");
},{init:()=>{Object.defineProperty(navigator,"userAgent",{get:()=>"Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"});
  try{Object.defineProperty(Navigator.prototype,"vibrate",{value:undefined,configurable:true});delete Navigator.prototype.vibrate;}catch(e){}}});
await test("Coach tailors: exercises for a muscle fit the kit, the sore spots and the goal, each with the goal's dose; an exercise added by hand takes the goal's dose too",async page=>{
  await page.evaluate(async()=>{const X=await import("/js/data/exercises.js");await new Promise(r=>X.loadExDB(r));
    const S=(await import("/js/state.js")).S;Object.assign(S.profile,{goal:"endurance",level:"some",limits:["shoulder"],health:[]});S.gear=["Bodyweight"];});
  await openChat(page);
  const r=await agSay(page,"what exercises for chest?");
  if(!/For chest, for endurance and fitness/.test(r.lead))throw new Error("lead: "+r.lead);
  const subs=await page.evaluate(()=>[...document.querySelectorAll("#cpanel .chat-x.live .ag-os")].map(e=>e.textContent));
  if(!subs.length||!subs.every(x=>/^[1-3] × 12–20/.test(x)))throw new Error("doses: "+subs.join(" | "));
  const ok=await page.evaluate(async()=>{const X=await import("/js/data/exercises.js"),P=await import("/js/engine/plan.js");
    const names=[...document.querySelectorAll("#cpanel .chat-x.live .ag-ol")].map(e=>e.textContent);
    return names.length>0&&names.every(n=>{const k=Object.keys(X.EXDB).find(x=>x===n)||n;return P.usable(k,["Bodyweight"])&&!P.avoids(k,["shoulder"]);});});
  eq(ok,true,"bodyweight only, nothing that loads the shoulder");
  /* A tap asks for the day, as "add … to …" does. */
  await page.tap('#cpanel .chat-x.live .ag-opt');await pause(page,400);
  if(!/to which day/.test((await agLast(page)).lead))throw new Error("no day asked");
  /* The picker's exercise takes the goal's dose. */
  const d=await page.evaluate(async()=>{const S=(await import("/js/state.js")).S,P=await import("/js/engine/plan.js");S.profile.goal="strength";S.profile.level="experienced";
    return P.doseFor("Dumbbell Bench Press");});
  eq([d.sets>=4&&d.sets<=6,d.lo,d.hi],[true,6,10],"strength: 4–6 sets of 6–10");
},{prefs:{lang:"en"}});
await test("Coach swaps one planned food, spelt as typed: three like-for-like choices, a tap and a yes put it in the plan, with Undo",async page=>{
  await page.evaluate(async()=>{const N=await import("/js/engine/nutrition.js");await new Promise(r=>N.loadFoods(r));
    const M=await import("/js/engine/mealplan.js"),S=(await import("/js/state.js")).S;
    const by=w=>N.FOODDB.find(f=>f.n===w);
    S.mealSlots=[{id:"Breakfast"},{id:"Lunch",plan:[M.itemOf({f:by("Tilapia, Grilled"),g:120}),M.itemOf({f:by("Egyptian Rice, Cooked"),g:350})]},{id:"Snack"},{id:"Dinner"}];});
  await openChat(page);
  const r=await agSay(page,"Replace the talibia grill in my lunch, with something similar.");
  if(!/Instead of Tilapia, Grilled 120 g in Lunch/.test(r.lead))throw new Error("lead: "+r.lead);
  eq(r.opts.length,3,"three choices");
  const first=r.opts[0];
  await page.tap('#cpanel .chat-x.live .ag-opt');await pause(page,400);
  let c=await agLast(page);
  if(!/^Swap Tilapia, Grilled for /.test(c.lead)||!c.ok)throw new Error("confirm: "+c.lead);
  eq(await ev(page,"S.mealSlots[1].plan[0].n"),"Tilapia, Grilled","nothing before yes");
  await page.tap('#cpanel [data-agok]');await pause(page,400);
  const now=await ev(page,"S.mealSlots[1].plan[0].n");
  if(now==="Tilapia, Grilled"||!first.startsWith(now))throw new Error("swapped to "+now+" / "+first);
  eq(await ev(page,"S.mealSlots[1].plan[1].n"),"Egyptian Rice, Cooked","the rest of lunch as it was");
  await page.tap('#cpanel [data-agundo]');await pause(page,400);
  eq(await ev(page,"S.mealSlots[1].plan[0].n"),"Tilapia, Grilled","undone");
});
await test("Coach: leaving through an answer's button brings the coach's button straight back to the dock",async page=>{
  await openChat(page);
  await page.fill('#chatq',"what should I eat now");await page.press('#chatq','Enter');await pause(page,600);
  await page.tap('#cpanel .chat-x.live .chat-acts [data-tab="food"]');await pause(page,700);
  eq([await ev(page,"V.tab"),await page.evaluate(()=>!!document.querySelector("#cfab .cfab"))],["food",true],"on Food, with the button");
});
await test("Coach does what the app does, in Arabic: water said in Egyptian Arabic is asked in Arabic",async page=>{
  await openChat(page);
  const r=await agSay(page,"شربت كوبايتين مية");
  if(!/500/.test(r.lead)||!/مل/.test(r.lead)||!r.ok)throw new Error("water in Arabic: "+r.lead);
  eq(r.dir,"rtl","RTL");
},{prefs:{lang:"ar"}});
await test("Coach agent: an unknown exercise gets real close matches, then a day, then a confirmation; nothing changes before the tap; Undo stays and puts it back",async page=>{
  await openChat(page);
  const before=await dayEx(page,2);
  let r=await agSay(page,"add tricep extention machine to push day");
  if(!/^No exercise called “tricep extention machine”\. Closest:/.test(r.lead))throw new Error("lead: "+r.lead);
  /* Every choice is a library entry; None of these is last. */
  const lib=await page.evaluate(async names=>{const L=(await import("/js/data/exercises.js")).LIB;return names.slice(0,-1).every(n=>L.some(l=>l[0]===n));},r.opts);
  eq([lib,r.opts[r.opts.length-1],r.opts.length>=4],[true,"None of these",true],"real entries, and None of these");
  if(!r.opts.some(o=>/Triceps/.test(o)))throw new Error("no triceps exercise offered: "+r.opts);
  await page.tap('#cpanel .ag-opt');await pause(page,450);
  r=await agLast(page);
  if(!/to which day\?$/.test(r.lead)||r.opts.some(o=>/^Rest$/.test(o)))throw new Error("day pick: "+JSON.stringify(r));
  await page.tap('#cpanel .ag-opt:nth-child(2)');await pause(page,450);
  r=await agLast(page);
  eq([/^Add .+ to Full Body B\?$/.test(r.lead),r.ok],[true,true],"a confirmation, with the action's own verb");
  eq(await page.$eval('#cpanel [data-agok]',b=>b.textContent),"Add it","Add it, never Confirm");
  eq(await dayEx(page,2),before,"nothing changed before the tap");
  /* The panel is inline: no sheet, no dialog over it. */
  eq(await ev(page,"[V.sheet,V.coach]"),[null,"compact"],"inline, not modal");
  await page.tap('#cpanel [data-agok]');await pause(page,500);
  r=await agLast(page);
  const after=await dayEx(page,2);
  eq([after.length,/^Added .+ to Full Body B\.$/.test(r.done.replace(/Undo$/,"")),await ev(page,"V.coach")],[before.length+1,true,"compact"],"applied, said, the panel still open");
  /* Asked something else, the Undo stays on the applied row. */
  await agSay(page,"how much protein do I need");
  if(!(await page.$('#cpanel [data-agundo]')))throw new Error("the Undo went away");
  await page.tap('#cpanel [data-agundo]');await pause(page,400);
  eq(await dayEx(page,2),before,"Undo puts the day back");
  if(!(await page.$('#cpanel .ag-undone')))throw new Error("no undone row");
});
await test("Coach agent: an exercise the library doesn't have becomes one of the person's own — the muscle asked, a day, a confirmation, then library and day, with Undo",async page=>{
  await openChat(page);
  const before=await dayEx(page,2),libN=await page.evaluate(async()=>(await import("/js/data/exercises.js")).LIB.length);
  let r=await agSay(page,"create a new exercise called wobble board balance for full body b");
  /* Close names first, if there are any: None of these goes on to make it. */
  if(/Closest:$/.test(r.lead)){await page.tap('#cpanel [data-agnone]');await pause(page,450);r=await agLast(page);}
  eq(/^“Wobble Board Balance” isn't in the library\. .*Which muscle does it work most\?$/.test(r.lead),true,"the muscle is asked, not guessed: "+r.lead);
  eq(r.opts.indexOf("Core")>=0&&r.opts.indexOf("Cardio")<0,true,"the library's muscles");
  await page.evaluate(()=>[...document.querySelectorAll("#cpanel .chat-x")].pop().querySelectorAll(".ag-opt").forEach(b=>{if(b.textContent==="Core")b.click();}));await pause(page,450);
  r=await agLast(page);
  eq([r.lead,r.ok],["Add Wobble Board Balance, your own exercise for core, to Full Body B?",true],"the day was said; a confirmation");
  eq([await dayEx(page,2),await ev(page,"(S.myEx||[]).length")],[before,0],"nothing changed before the tap");
  await page.tap('#cpanel [data-agok]');await pause(page,500);
  const made=await page.evaluate(async()=>{const S=(await import("/js/state.js")).S,L=(await import("/js/data/exercises.js")).LIB;
    return [(S.myEx||[]).map(m=>[m.n,m.m]),L.some(l=>l[0]==="Wobble Board Balance"&&l[1]==="Core")];});
  eq(made,[[["Wobble Board Balance","Core"]],true],"in the library, as theirs");
  const after=await dayEx(page,2);
  eq([after.length,after[after.length-1]],[before.length+1,"Wobble Board Balance"],"and last in Full Body B");
  await page.tap('#cpanel [data-agundo]');await pause(page,400);
  eq([await dayEx(page,2),await ev(page,"(S.myEx||[]).length"),await page.evaluate(async()=>(await import("/js/data/exercises.js")).LIB.length)],[before,0,libN],"Undo: the day and the library as they were");
  /* Asked again by the same name once it exists, it is simply added. */
});
const WD=["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
/* The next dates (from today) the plan has a workout on, and ones it rests. */
const planDates=page=>page.evaluate(async()=>{const sp=(await import("/js/state.js")).split(),D=await import("/js/engine/dayplan.js"),SC=await import("/js/engine/schedule.js"),U=await import("/js/util.js");
  const out=[];for(let i=0;i<7;i++){const d=SC.addDays(U.today(),i),p=D.planOn(sp,d);out.push({d,wd:SC.isoWeekday(d),train:!!(p.day&&!p.rest&&p.kind!=="done"),id:p.day&&p.day.id,rest:!!p.rest});}return out;});
const planOnD=(page,d)=>page.evaluate(async d=>{const sp=(await import("/js/state.js")).split(),p=(await import("/js/engine/dayplan.js")).planOn(sp,d);return {id:p.day&&p.day.id||null,rest:!!p.rest};},d);
await test("Coach skills: sets, reps and rest changed by saying so, for an exercise or a whole day's rests, with Undo",async page=>{
  await openChat(page);
  const name=await ev(page,`(async()=>{return (await import("/js/state.js")).split().days[0].ex[0].name;})()`);
  const dose=()=>ev(page,`(async()=>{const sp=(await import("/js/state.js")).split();return sp.days.flatMap(d=>d.ex.filter(e=>e.name===${JSON.stringify(name)}).map(e=>[e.sets,e.lo,e.hi,e.rest]));})()`);
  const before=await dose();
  let r=await agSay(page,"make "+name+" 4 sets of 6");
  eq([/^Change .+ to 4 × 6/.test(r.lead),r.ok],[true,true],"the change, said first: "+r.lead);
  await page.tap('#cpanel [data-agok]');await pause(page,500);
  eq((await dose()).every(x=>x[0]===4&&x[1]===6&&x[2]===6),true,"4 × 6 wherever it is in the program");
  await page.tap('#cpanel [data-agundo]');await pause(page,400);
  eq(await dose(),before,"Undo puts it back");
  r=await agSay(page,"rest 2 min on "+name);
  await page.tap('#cpanel [data-agok]');await pause(page,500);
  eq((await dose()).every(x=>x[3]===120),true,"rest in minutes");
  const rests=()=>ev(page,`(async()=>(await import("/js/state.js")).split().days[0].ex.map(e=>e.rest))()`);
  const r0=await rests();
  r=await agSay(page,"shorter rests on full body a");
  eq(/^Shorter rests on Full Body A/.test(r.lead),true,"a whole day's rests: "+r.lead);
  await page.tap('#cpanel [data-agok]');await pause(page,500);
  eq(await rests(),r0.map(x=>Math.max(30,x-30)),"30 s less on each, never under 30");
});
await test("Coach skills: a day skipped and a workout moved by saying so, the week as it was with Undo",async page=>{
  await openChat(page);
  const pd=await planDates(page),tr=pd.filter(x=>x.train);
  if(tr.length<1)throw new Error("no training day in the next week: "+JSON.stringify(pd));
  const a=tr[0],say=a.d===pd[0].d?"today":WD[a.wd-1];
  let r=await agSay(page,"skip "+say);
  eq([/^Skip .+\? It becomes a rest day/.test(r.lead),r.ok],[true,true],"skip: said first: "+r.lead);
  await page.tap('#cpanel [data-agok]');await pause(page,500);
  eq((await planOnD(page,a.d)).rest,true,"that date is a rest day");
  await page.tap('#cpanel [data-agundo]');await pause(page,400);
  eq(await planOnD(page,a.d),{id:a.id,rest:false},"Undo: the workout is back");
  /* Move it to a later date in the week. */
  const b=pd.filter(x=>x.d>a.d)[1]||pd.filter(x=>x.d>a.d)[0];
  const bBefore=await planOnD(page,b.d);
  r=await agSay(page,"move "+(say==="today"?"today's":WD[a.wd-1]+"'s")+" workout to "+WD[b.wd-1]);
  eq([/^Move .+ from .+ to .+\?$/.test(r.lead),r.ok],[true,true],"move: said first: "+r.lead);
  await page.tap('#cpanel [data-agok]');await pause(page,500);
  eq((await planOnD(page,b.d)).id,a.id,"the workout is on the new day");
  eq(await planOnD(page,a.d),bBefore.id&&!bBefore.rest?{id:bBefore.id,rest:false}:{id:null,rest:true},"what was there went the other way");
  await page.tap('#cpanel [data-agundo]');await pause(page,400);
  eq((await planOnD(page,b.d)),bBefore,"Undo: the week as it was");
});
await test("Coach skills: the lighter week started from the chat, with Undo; and when one is due, the answer offers it",async page=>{
  await openChat(page);
  let r=await agSay(page,"start a lighter week");
  eq([/^Start a lighter week\?/.test(r.lead),r.ok],[true,true],"said first: "+r.lead);
  await page.tap('#cpanel [data-agok]');await pause(page,500);
  eq(await ev(page,"!!(S.deload&&S.deload.until)"),true,"on");
  await page.tap('#cpanel [data-agundo]');await pause(page,400);
  eq(await ev(page,"!!(S.deload&&S.deload.until)"),false,"Undo: off again");
  r=await agSay(page,"should I deload?");
  eq(r.ok,false,"a question is not a request");
});
await test("Coach skills: a machine taken mid-workout gets alternatives for the same muscles, swapped in for today only",async page=>{
  await startWorkout(page);
  /* From the workout's header: the Coach, where the first suggestion is this. */
  await page.tap('.ss-coach');await pause(page,500);
  eq(await page.$$eval('#cpanel .cp-sug [data-chatq]',a=>a[0]&&a[0].dataset.chatq),"busy","the first suggestion in a workout");
  const prog=await dayEx(page,0),cur=await ev(page,"S.active.entries[S.active.idx||0].name");
  await page.tap('#cpanel [data-chatq="busy"]');await pause(page,450);
  let r=await agLast(page);
  if(!/taken\? These work the same muscles/.test(r.lead)||!r.opts.length)throw new Error("alternatives: "+JSON.stringify(r));
  const mus=await page.evaluate(async([c,o])=>{const X=await import("/js/data/exercises.js");return o.every(n=>X.LIB.some(l=>X.muscleOf(l[0])===X.muscleOf(c)&&l[0]!==c));},[cur,r.opts]);
  eq(mus,true,"the same muscle");
  await page.tap('#cpanel .ag-opt');await pause(page,450);
  r=await agLast(page);
  eq([/^Swap .+ for .+ for today\?$/.test(r.lead),r.ok],[true,true],"for today, said first");
  await page.tap('#cpanel [data-agok]');await pause(page,600);
  eq([await ev(page,"S.active.entries[S.active.idx||0].name")!==cur,await dayEx(page,0)],[true,prog],"swapped in the workout; the program as it was");
});
await test("Coach skills: the weekly check-in reads the week from the log, ends on one thing to change, and is offered first in a new week",async page=>{
  await openChat(page);
  await agSay(page,"how was my week");
  const x=await page.evaluate(()=>{const e=[...document.querySelectorAll("#cpanel .chat-x")].pop();e.querySelectorAll(".chat-more").forEach(d=>d.open=true);return e.innerText;});
  if(!/(Last week|This week so far), from your log:/.test(x)||!/Workouts: \d+/.test(x))throw new Error("check-in: "+x);
  eq(await ev(page,"typeof S.ckSeen"),"string","read: not offered again this week");
});
await test("Coach in the gym: one tap to the coach from the workout; a set too easy or too heavy moves the next; the form; the plates",async page=>{
  await startWorkout(page);
  await page.tap('.ss-coach');await pause(page,500);
  eq(await ev(page,"V.coach"),"compact","the workout's own coach button");
  let r=await agSay(page,"plates for 102.5");
  if(!/^For 102\.5 kg on a 20 kg bar: .+ kg on each side\./.test(r.lead))throw new Error("plates: "+r.lead);
  r=await agSay(page,"how do I do this?");
  const cur=await ev(page,"S.active.entries[S.active.idx||0].name");
  eq(await page.evaluate(()=>!![...document.querySelectorAll("#cpanel .chat-x")].pop().querySelector("[data-exdetail]")),true,"the guide, a tap away: "+r.lead);
  r=await agSay(page,"too easy");
  eq(/^Log a set of /.test(r.lead),true,"nothing to judge before a set");
  /* A set logged at a known weight, then judged. */
  await page.evaluate(async()=>{const S=(await import("/js/state.js")).S;const e=S.active.entries[S.active.idx||0];e.sets.push({w:60,r:8});});
  r=await agSay(page,"that was too easy");
  eq([/^Then go up a step\. Next set: /.test(r.lead),r.ok],[true,true],"up a step: "+r.lead);
  await page.tap('#cpanel [data-agok]');await pause(page,500);
  const up=await ev(page,"V.draft.w");
  if(!(up>60))throw new Error("not heavier: "+up);
  r=await agSay(page,"too heavy");
  await page.tap('#cpanel [data-agok]');await pause(page,500);
  if(!(await ev(page,"V.draft.w")<60))throw new Error("not lighter");
  await page.tap('#cpanel [data-agundo]');await pause(page,400);
  eq(await ev(page,"V.draft.w"),up,"Undo: the next set as it was");
});
await test("Coach panel in the hand: the header dragged down shrinks then closes it; a long press copies or deletes; More grows open; the typing is said",async page=>{
  await openChat(page);
  await agSay(page,"how much protein do I need");
  /* A long press on the exchange. */
  const touch=(type,x,y,sel)=>page.evaluate(([type,x,y,sel])=>{const el=document.querySelector(sel)||document.elementFromPoint(x,y);
    const tc=new Touch({identifier:1,target:el,clientX:x,clientY:y});
    el.dispatchEvent(new TouchEvent(type,{bubbles:true,cancelable:true,touches:type==="touchend"?[]:[tc],changedTouches:[tc]}));},[type,x,y,sel]);
  await pause(page,2600);
  const box=await page.evaluate(()=>{const e=[...document.querySelectorAll('#cpanel .chat-x .chat-a')].pop(),r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+20};});
  await touch("touchstart",box.x,box.y,null);await pause(page,650);
  eq(await page.$$eval('#msgmenu button',a=>a.map(b=>b.textContent)),["Copy","Delete"],"Copy and Delete, by the finger");
  await touch("touchend",box.x,box.y,null);
  const n=await ev(page,"S.chat.length");
  await page.click('#msgmenu [data-msgdel]');await pause(page,400);
  eq([await ev(page,"S.chat.length"),await page.$$eval('#msgmenu',a=>a.length)],[n-1,0],"deleted, the menu gone");
  await page.tap('.toast-undo');await pause(page,300);
  eq(await ev(page,"S.chat.length"),n,"Undo brings it back");
  /* More grows open, then closed. */
  if(await page.$('#cpanel .chat-more>summary')){
    await page.click('#cpanel .chat-more>summary');await pause(page,80);
    const mid=await page.$eval('#cpanel .chat-more',d=>[d.open,!!d.getAnimations().length]);
    await pause(page,450);
    eq([mid,await page.$eval('#cpanel .chat-more',d=>d.open)],[[true,true],true],"opens by growing");}
  /* The header, dragged: the whole conversation → compact → closed. */
  await page.tap('.cp [data-coachsize="full"]');await pause(page,600);
  const drag=async()=>{const h=await page.$eval('#cpanel .cp-h',e=>{const r=e.getBoundingClientRect();return {x:r.left+r.width/2-60,y:r.top+r.height/2};});
    await touch("touchstart",h.x,h.y,'#cpanel .cp-h p');for(let i=1;i<=6;i++){await touch("touchmove",h.x,h.y+i*30,'#cpanel .cp-h p');}
    await touch("touchend",h.x,h.y+180,'#cpanel .cp-h p');await pause(page,700);};
  await drag();eq(await ev(page,"V.coach"),"compact","dragged down: smaller");
  await drag();eq(await ev(page,"V.coach"),null,"dragged again: closed");
  /* The typing dots say so to a screen reader. */
  await openChat(page);
  await page.evaluate(async()=>{(await import("/js/state.js")).S.prefs.anim=true;document.body.classList.remove("noanim");});
  await page.fill('#chatq','how is my weight');await page.press('#chatq','Enter');await pause(page,700);
  eq(await page.$eval('.chat-typing',e=>[e.getAttribute("role"),e.textContent]).catch(()=>null),["status","Coach is typing"],"the typing, said");
},{prefs:{anim:true}});
await test("Coach logging in a sentence: cardio with its time and distance, a lift done without the app, sleep and soreness; each with Undo",async page=>{
  await openChat(page);
  const n0=await ev(page,"S.sessions.length");
  let r=await agSay(page,"ran 5 km in 28 min");
  eq([r.lead,r.ok],["Log Running, today?",true],"cardio, said first");
  const det=await page.evaluate(()=>[...document.querySelectorAll("#cpanel .chat-x")].pop().innerText);
  if(!/28 min · 5 km · 5:36 \/km · about \d+ kcal \(an estimate\)/.test(det))throw new Error("detail: "+det);
  await page.tap('#cpanel [data-agok]');await pause(page,500);
  eq(await ev(page,"[S.sessions.length,S.sessions[0].entries[0].name,S.sessions[0].entries[0].sets[0].min,S.sessions[0].entries[0].sets[0].km]"),[n0+1,"Running",28,5],"a bout in the history");
  await page.tap('#cpanel [data-agundo]');await pause(page,400);
  eq(await ev(page,"S.sessions.length"),n0,"Undo takes it out");
  r=await agSay(page,"yesterday I did barbell squat 3x8 at 100");
  eq([/^Add .+, 3 × 8 · 100 kg, to yesterday\?$/.test(r.lead),r.ok],[true,true],"a past lift: "+r.lead);
  await page.tap('#cpanel [data-agok]');await pause(page,500);
  const y=await page.evaluate(async()=>{const S=(await import("/js/state.js")).S,U=await import("/js/util.js"),SC=await import("/js/engine/schedule.js");
    const d=SC.addDays(U.today(),-1),s=S.sessions.find(x=>x.date===d&&x.dayName==="Logged in chat");return s?s.entries.map(e=>[e.sets.length,e.sets[0].w,e.sets[0].r]):null;});
  eq(y,[[3,100,8]],"on yesterday, three sets");
  await page.tap('#cpanel [data-agundo]');await pause(page,400);
  eq(await ev(page,"S.sessions.length"),n0,"Undo takes it out");
  r=await agSay(page,"slept 5 hours");
  eq([r.lead,r.ok],["Log 5 h of sleep for today?",true],"sleep");
  await page.tap('#cpanel [data-agok]');await pause(page,400);
  eq(await ev(page,"(S.days[(new Date(Date.now()-new Date().getTimezoneOffset()*6e4)).toISOString().slice(0,10)]||{}).sleep"),5,"saved for today");
  r=await agSay(page,"my legs are very sore");
  if(!/^Log soreness 8\/10 for today\?$/.test(r.lead))throw new Error("sore: "+r.lead);
});
await test("Coach understanding: a correction and \"same for\" redo the last request with the day changed; two requests at once are two, both live; \"undo that\" offers the last change back",async page=>{
  await openChat(page);
  const pd=await planDates(page),tr=pd.filter(x=>x.train&&x.d!==pd[0].d);
  if(tr.length<2)throw new Error("two training days needed: "+JSON.stringify(pd));
  let r=await agSay(page,"skip "+WD[tr[0].wd-1]);
  eq(await ev(page,"S.chat[S.chat.length-1].ag.p.date"),tr[0].d,"the first day");
  r=await agSay(page,"no, I meant "+WD[tr[1].wd-1]);
  eq([await ev(page,"S.chat[S.chat.length-1].ag.p.date"),r.ok],[tr[1].d,true],"the correction: the same request, the other day");
  await page.tap('#cpanel [data-agok]');await pause(page,500);
  r=await agSay(page,"same for "+WD[tr[0].wd-1]);
  eq([await ev(page,"S.chat[S.chat.length-1].ag.p.date"),r.ok],[tr[0].d,true],"same for: the request again, for that day");
  /* Two at once. */
  const ex0=await ev(page,`(async()=>(await import("/js/state.js")).split().days[0].ex[0].name)()`);
  await page.fill('#chatq',"add pushups to full body b and remove "+ex0+" from full body a");await page.press('#chatq','Enter');await pause(page,500);
  eq(await page.$$eval('#cpanel [data-agok]',a=>a.length),2,"two requests, two live confirmations");
  /* Undo that. */
  await page.tap('#cpanel [data-agok]');await pause(page,500);
  r=await agSay(page,"undo that");
  eq([/^Undo “/.test(r.lead),await page.evaluate(()=>!![...document.querySelectorAll("#cpanel .chat-x")].pop().querySelector("[data-agundo]"))],[true,true],"the last change, offered back");
});
await test("Coach gym slang: \"2 plates x 5\" is 100 kg for 5, and \"bodyweight x 12\" a set with no load",async page=>{
  await startWorkout(page);
  await page.tap('.ss-coach');await pause(page,500);
  let r=await agSay(page,"2 plates x 5");
  if(!/^Log 100 kg × 5 on /.test(r.lead))throw new Error("plates: "+r.lead);
  r=await agSay(page,"bodyweight x 12");
  if(!/^Log 0 kg × 12 on |^Log .* × 12 on /.test(r.lead))throw new Error("bw: "+r.lead);
});
await test("Coach advice: a sore spot swapped out across the program (asked, or from the pain answer), with Undo",async page=>{
  const name=await page.evaluate(async()=>{const X=await import("/js/data/exercises.js"),sp=(await import("/js/state.js")).split();
    const n=X.LIB.map(l=>l[0]).find(n=>/Upright Row/.test(n)&&X.pickable(n));sp.days[0].ex[0].name=n;sp.days[0].ex[0].exId=X.exIdOf(n);return n;});
  await openChat(page);
  await page.fill('#chatq',"my shoulder hurts");await page.press('#chatq','Enter');await pause(page,500);
  if(!(await page.$('#cpanel [data-chatsay]')))throw new Error("no way from the pain answer to the swap");
  await page.tap('#cpanel [data-chatsay]');await pause(page,500);
  let r=await agLast(page);
  eq([/^Swap the (exercise|\d+ exercises) that loads? your shoulders\?$/.test(r.lead),r.ok],[true,true],"said first: "+r.lead);
  await page.tap('#cpanel [data-agok]');await pause(page,500);
  const after=await page.evaluate(async()=>{const sp=(await import("/js/state.js")).split(),S=(await import("/js/state.js")).S;return [sp.days[0].ex[0].name,S.profile.limits];});
  eq([after[0]!==name,!/Upright Row/.test(after[0]),after[1].includes("shoulder")],[true,true,true],"swapped, and the profile keeps away from it");
  await page.tap('#cpanel [data-agundo]');await pause(page,400);
  eq(await ev(page,`(async()=>(await import("/js/state.js")).split().days[0].ex[0].name)()`),name,"Undo: the program as it was");
});
await test("Coach advice: travel mode swaps what needs other kit in each workout until its date, says so on Training, and ends when back",async page=>{
  await openChat(page);
  let r=await agSay(page,"I'm travelling for a week, bodyweight only");
  eq([/^Train with your bodyweight until /.test(r.lead),r.ok],[true,true],"said first: "+r.lead);
  await page.tap('#cpanel [data-agok]');await pause(page,500);
  eq(await ev(page,"S.travel.gear"),["Bodyweight"],"on");
  await page.tap('.cp [data-coachclose]');await pause(page,500);
  await tapTab(page,"train");await pause(page);
  if(!(await page.$('[data-travel="end"]')))throw new Error("Training doesn't say travel mode is on");
  await page.tap('[data-startday]');await pause(page,500);
  const ok=await page.evaluate(async()=>{const S=(await import("/js/state.js")).S,X=await import("/js/data/exercises.js"),A=await import("/js/data/activities.js");
    return S.active.entries.every(e=>A.isActivity(e.name)||!X.EXDB[e.name]||!X.EXDB[e.name].e||X.EXDB[e.name].e==="Bodyweight"||e.altWhy!=="travel")
      &&S.active.entries.some(e=>e.altWhy==="travel");});
  eq(ok,true,"the workout uses the kit at hand, each swap with the original a tap away");
  await leaveWorkout(page);
  await openChat(page);
  r=await agSay(page,"I'm back home");
  eq([r.lead,r.ok],["End travel mode now?",true],"back");
  await page.tap('#cpanel [data-agok]');await pause(page,500);
  eq(await ev(page,"S.travel===undefined"),true,"off");
});
await test("Coach advice: a stuck lift is read from six weeks of the log, with the reasons that apply and one change",async page=>{
  await openChat(page);
  await agSay(page,"why isn't my bench going up?");
  const x=await page.evaluate(()=>{const e=[...document.querySelectorAll("#cpanel .chat-x")].pop();e.querySelectorAll(".chat-more").forEach(d=>d.open=true);return e.innerText;});
  if(!/Bench Press.*the last six weeks: \d+ sessions, estimated max/.test(x)||!/The one change: /.test(x))throw new Error("plateau: "+x);
});
await test("Coach understanding: a question about how weights are logged is answered, never taken as a change — the owner's three sentences, word for word, and in Arabic",async page=>{
  await openChat(page);
  let r=await agSay(page,"add barbell incline bench press");
  if(!/to which day\?$/.test(r.lead))throw new Error("no pick to interrupt: "+r.lead);
  const before=await ev(page,`(async()=>JSON.stringify((await import("/js/state.js")).split().days.map(d=>d.ex.map(e=>e.name))))()`);
  const card=()=>page.evaluate(()=>{const x=[...document.querySelectorAll("#cpanel .chat-x")].pop();x.querySelectorAll(".chat-more").forEach(d=>d.open=true);
    return {topic:(x.querySelector(".chat-at")||{}).textContent||"",text:x.innerText,closest:/Closest|No exercise called/.test(x.innerText)};});
  for(const q of ["The barbell weight per hand?","The barbell weight per hand, total, and is it including the barbell weight?",
    "When u calculate the volume, does that include the bar weight? And when I log weight is it per hand for the bar or total?"]){
    await agSay(page,q);const c=await card();
    eq([c.topic,c.closest],["How weights are logged",false],q);
    if(!/Barbell: the total on the bar, the bar included/.test(c.text)||!/Dumbbells are logged per hand, the weight of one/.test(c.text)||!/a pair counts twice/.test(c.text))throw new Error("answer: "+c.text);}
  eq(await ev(page,`(async()=>JSON.stringify((await import("/js/state.js")).split().days.map(d=>d.ex.map(e=>e.name))))()`),before,"the program is untouched");
  await agSay(page,"does volume include the bar?");eq((await card()).topic,"How weights are logged","a short one");
  await agSay(page,"الدمبل بسجله لكل ايد ولا الاتنين مع بعض؟");
  const ar=await card();eq([ar.topic,/لكل إيد، وزن واحد/.test(ar.text)],["إزاي الأوزان بتتسجل",true],"in Arabic, answered in Arabic");
  r=await agSay(page,"how do I add face pulls to push day");
  if(/How weights/.test((await card()).topic))throw new Error("a how-do-I request went to the weights answer");
  r=await agSay(page,"can you put curls in");
  if(!/(which day\?|Closest:|\?)$/.test(r.lead))throw new Error("a request phrased with can you is still a request: "+r.lead);
});
await test("Dumbbells per hand or together: switching converts the history, volume counts both dumbbells either way, and the barbell box says the bar is in it",async page=>{
  const vol=()=>ev(page,`(async()=>{const F=await import("/js/engine/formulas.js"),S=(await import("/js/state.js")).S;return Math.round(F.sessionVolume(S.sessions[0]));})()`);
  await page.evaluate(async()=>{const st=await import("/js/state.js");
    st.S.sessions.unshift({id:"dbv",date:new Date().toISOString().slice(0,10),dayName:"Push",entries:[{name:"Dumbbell Bench Press",muscle:"Chest",sets:[{w:20,r:10}]},
      {name:"One-Arm Dumbbell Row",muscle:"Back",sets:[{w:30,r:10}]},{name:"Barbell Squat",muscle:"Quads",sets:[{w:100,r:5}]}]});st.saveDB();});
  eq(await vol(),400+300+500,"per hand: a pair counts twice, one arm once, the barbell as logged");
  await sheet(page,"set_training");
  await page.tap('[data-setdb="total"]');await pause(page,300);
  eq(await ev(page,"[S.prefs.dbLoad,S.sessions[0].entries.map(e=>e.sets[0].w)]"),["total",[40,30,100]],"both together: the pair's sets doubled, the rest as they were");
  eq(await vol(),1200,"the same volume either way");
  await page.tap('[data-setdb="hand"]');await pause(page,300);
  eq(await ev(page,"S.sessions[0].entries.map(e=>e.sets[0].w)"),[20,30,100],"and back");
  await page.evaluate(async()=>{const st=await import("/js/state.js");st.S.sessions.shift();st.saveDB();});
  await page.evaluate(async()=>{(await import("/js/ui/actions.js")).closeSheet();});
  await pause(page,300);
  await page.evaluate(async()=>{const sp=(await import("/js/state.js")).split(),X=await import("/js/data/exercises.js");sp.days.forEach(d=>{if(d.ex[0]){d.ex[0].name="Barbell Squat";d.ex[0].exId=X.exIdOf("Barbell Squat");}});});
  await startWorkout(page);
  const lbl=await page.$eval('label[for="in_w"]',e=>e.textContent);
  if(!/with bar/.test(lbl))throw new Error("barbell weight label: "+lbl);
  await leaveWorkout(page);
});
await test("Coach, when unsure and when wrong: other readings offered under a near tie; Not what I asked keeps the question to send on; \"add it to Pull too\" means the last exercise; the history searches",async page=>{
  await page.evaluate(async()=>{const sp=(await import("/js/state.js")).split();sp.days[0].name="Push";sp.days[2].name="Pull";sp.days[4].name="Legs";});
  await openChat(page);
  await agSay(page,"Which day is next?");await pause(page,300);
  eq(await page.$$eval('#cpanel .chat-x.live .chat-alt [data-chatq]',a=>a.map(b=>b.dataset.chatq)),["tomorrow"],"a near tie: the other reading, one tap");
  eq(await page.$$eval('#cpanel .chat-next [data-chatq="tomorrow"]',a=>a.length),0,"and not again under Ask next");
  await page.tap('#cpanel .chat-x.live .chat-miss');await pause(page,300);
  eq(await ev(page,"[S.missed.length,S.missed[0].q,!!document.querySelector('#cpanel .chat-missd')]"),[1,"Which day is next?",true],"kept, and said so in place");
  let r=await agSay(page,"add pushups to push");
  eq(r.lead,"Add Pushups to Push?","the request");
  r=await agSay(page,"add it to pull too");
  eq(r.lead,"Add Pushups to Pull?","\"it\" is the exercise just named");
  await page.tap('.cp [data-coachclose]');await pause(page,400);
  await page.evaluate(async()=>{(await import("/js/ui/actions.js")).openSheet("set_chat");});await pause(page,500);
  eq(await page.$eval('#sheet .chh-miss .num',e=>e.textContent),"1","the kept questions, counted, in Chat history");
  await page.fill('#chhq','pushups to pull');await pause(page,200);
  const vis=await page.$$eval('#sheet .chh-day .chat-x',a=>a.filter(x=>!x.hidden).map(x=>x.querySelector(".chat-q").textContent));
  eq(vis,["add it to pull too"],"search shows what matches, questions and answers, in place");
  await page.fill('#chhq','zzzz');await pause(page,200);
  eq(await page.$eval('#chhNone',e=>e.hidden),false,"and says when nothing does");
});
await test("Own exercises the library has after all become the library's: picture, muscle, history kept, with Undo; a program imported now matches them",async page=>{
  await pause(page,3800);
  const st=await page.evaluate(async()=>{const S=(await import("/js/state.js")).S,X=await import("/js/data/exercises.js");
    const d=S.programs[0].days[0];return [d.ex.slice(0,5).map(e=>e.name),S.myEx.map(m=>m.n),S.sessions[0].entries.map(e=>e.name),X.LIB.some(l=>l[0]==="Reverse wrist curl")];});
  eq(st[0],["Reverse Barbell Curl","Reverse Flyes","Palms-Up Barbell Wrist Curl Over A Bench","Palms-Down Wrist Curl Over A Bench","Seated Triceps Press"],"the program uses the library's");
  eq([st[1],st[2][0],st[3]],[["Arnold special"],"Palms-Down Wrist Curl Over A Bench",false],"own list keeps only what the library lacks; history renamed");
  if(!(await page.$('.toast-undo')))throw new Error("not said with Undo");
  await page.tap('.toast-undo');await pause(page,500);
  eq(await ev(page,"[S.programs[0].days[0].ex[3].name,S.myEx.length,S.keepOwn.length]"),["Reverse wrist curl",6,5],"Undo: as they were, and kept as own");
  await page.reload();await pause(page,3800);
  eq(await ev(page,"S.programs[0].days[0].ex[3].name"),"Reverse wrist curl","not adopted again after Undo");
},{init:()=>{},db:(()=>{const db=seed();
  const own=["Overhand grip barbell curl","Single arm rear delt fly","Barbell wrist curl","Reverse wrist curl","Seated triceps extension","Arnold special"];
  db.myEx=own.map((n,i)=>({id:"u_"+i,n,m:"Other"}));
  db.programs=[{id:"arn",name:"Arnold 2",schedule:"cycle",days:[{id:"d1",name:"Arms",wd:[],ex:own.map((n,i)=>({id:"e"+i,name:n,sets:3,lo:8,hi:12,rest:75}))}]}];
  db.activeProgram="arn";
  db.sessions.unshift({id:"own1",date:new Date().toISOString().slice(0,10),dayName:"Arms",entries:[{name:"Reverse wrist curl",muscle:"Other",sets:[{w:20,r:12}]}]});
  return db;})()});
await test("A plan to another Bunyan user: the program and the meal plan arrive on the other phone exactly as sent; the link opens it too",async page=>{
  /* Phone A: a program with an own exercise and a superset, and a meal plan. */
  await page.evaluate(async()=>{const st=await import("/js/state.js"),S=st.S,sp=st.split();
    S.myEx=(S.myEx||[]).concat([{id:"u_x",n:"Arnold special",m:"Chest"}]);
    sp.name="Arnold 2";sp.days[0].ex[0].note="pause at the bottom";sp.days[0].ex[0].grp="a";sp.days[0].ex[1].grp="a";
    sp.days[0].ex.push({id:"own1",name:"Arnold special",sets:4,lo:10,hi:15,rest:60});
    S.mealSlots=[{id:"Breakfast",plan:[{fid:"x1",n:"Oats",label:"80 g",grams:80,kcal:300,p:10,c:54,f:6,fib:8,src:"plan"}]},{id:"Lunch",plan:[{n:"Chicken Breast",label:"200 g",grams:200,kcal:330,p:62,c:0,f:7,src:"plan"}]}];
    st.saveDB();});
  const shape=p=>p.days.map(d=>[d.name,d.wd,d.ex.map(e=>[e.name,e.sets,e.lo,e.hi,e.rest||null,e.note||null,!!e.grp])]);
  const sent=await page.evaluate(async()=>{const st=await import("/js/state.js");return JSON.parse(JSON.stringify(st.split()));});
  await coach(page,"train","program");
  await page.tap('[data-shareplan^="p:"]');await pause(page,600);
  eq(await ev(page,"V.sheet"),"sendplan","the share sheet, code ready");
  const msg=await page.$eval('#planc',e=>e.value);
  if(!/^.+shared a Bunyan plan with you: Arnold 2\.\n.+\n\nhttp.+#plan=BNY[01]\./.test(msg))throw new Error("message: "+msg);
  await page.evaluate(async()=>{(await import("/js/ui/actions.js")).closeSheet();});await pause(page);
  await coach(page,"food","plan");
  await page.tap('[data-shareplan="meals"]');await pause(page,600);
  const msg2=await page.$eval('#planc',e=>e.value);
  /* Phone B: another person's app. */
  const B=await open({});
  try{
    const b=B.page;
    await b.evaluate(async()=>{(await import("/js/ui/actions.js")).openSheet("recvplan");});await pause(b);
    await b.fill('#rplan','garbage');await b.tap('[data-rplanread]');await pause(b,400);
    if(!(await b.$('#sheet .bad')))throw new Error("a non-plan is not refused");
    await b.fill('#rplan',msg);await b.tap('[data-rplanread]');await pause(b,500);
    if(!(await b.$('[data-rplanadd="use"]')))throw new Error("no preview");
    await b.tap('[data-rplanadd="use"]');await pause(b,500);
    const got=await b.evaluate(async()=>{const st=await import("/js/state.js");return JSON.parse(JSON.stringify(st.split()));});
    eq([got.name,got.schedule,shape(got)],[sent.name,sent.schedule,shape(sent)],"the program, day by day, exercise by exercise, as sent");
    eq(await ev(b,"S.myEx.some(m=>m.n==='Arnold special'&&m.m==='Chest')"),true,"the sender's own exercise came with it");
    await b.evaluate(async()=>{(await import("/js/ui/actions.js")).openSheet("recvplan");});await pause(b);
    await b.fill('#rplan',msg2);await b.tap('[data-rplanread]');await pause(b,500);
    await b.tap('[data-rplanmeals]');await pause(b,500);
    eq(await ev(b,"S.mealSlots.map(s=>[s.id,s.plan.map(i=>[i.n,i.grams,i.kcal,i.p])])"),[["Breakfast",[["Oats",80,300,10]]],["Lunch",[["Chicken Breast",200,330,62]]]],"the meal plan, food by food");
    /* The link alone, opened in a browser. */
    const link=msg.slice(msg.indexOf("http"));
    await b.goto("about:blank");await b.goto(link.replace(/^https?:\/\/[^/]+\/[^#]*/,URL_));await pause(b,1800);
    eq(await ev(b,"[V.sheet,!!(V.sd&&V.sd.got&&V.sd.got.program),location.hash]"),["recvplan",true,""],"the link opens the plan, and leaves the address");
  }finally{await B.ctx.close();}
});
await test("InBody: the photo shown to copy from, the copied text read into fields to check, saved as the day's body entry; Progress and the coach read it",async page=>{
  await page.evaluate(async()=>{(await import("/js/ui/actions.js")).openSheet("inbody");});await pause(page);
  await page.setInputFiles('#ib_img',{name:"inbody.png",mimeType:"image/png",buffer:Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=","base64")});
  await pause(page,500);
  if(!(await page.$('#sheet .ib-img')))throw new Error("the photo is not shown to read from");
  await page.fill('#ib_text',"Total Body Water 49.8 L\nWeight 84.2 kg (61.5~83.1)\nSkeletal Muscle Mass 38.1 kg\nBody Fat Mass 16.3 kg\nPBF (Percent Body Fat) 19.4 %\nVisceral Fat Level 7\nBasal Metabolic Rate 1820 kcal\nInBody Score 78");
  await page.tap('[data-ibread]');await pause(page,400);
  eq(await page.evaluate(()=>["weight","pbf","smm","fatkg","vfl","ibmr","tbw","score"].map(k=>document.getElementById("ib_"+k).value)),
    ["84.2","19.4","38.1","16.3","7","1820","49.8","78"],"every figure in its field, to check");
  if(!(await page.$('#sheet .ib-img')))throw new Error("the photo went away on reading");
  await page.fill('#ib_pbf','19.6');
  await page.tap('[data-ibsave]');await pause(page,400);
  const e=await ev(page,"S.body.filter(b=>b.src==='inbody').map(b=>[b.weight,b.bf,b.smm,b.fatkg,b.vfl,b.ibmr,b.tbw,b.ibscore])");
  eq(e,[[84.2,19.6,38.1,16.3,7,1820,49.8,78]],"saved as checked, the edited figure kept");
  await page.evaluate(async()=>{const V=(await import("/js/ui/view.js")).V;V.tab="progress";V.ptab="body";(await import("/js/ui/render.js")).render();});await pause(page,500);
  const pg=await page.evaluate(()=>document.body.innerText);
  if(!/From your InBody test/.test(pg)||!/Skeletal muscle mass/.test(pg))throw new Error("Progress doesn't show it");
  await openChat(page);
  await agSay(page,"what does my inbody say");await pause(page,300);
  const x=await page.evaluate(()=>{const e=[...document.querySelectorAll("#cpanel .chat-x")].pop();e.querySelectorAll(".chat-more").forEach(d=>d.open=true);return [(e.querySelector(".chat-at")||{}).textContent,e.innerText.replace(/[\u2066-\u2069]/g,"")];});
  eq(x[0],"Your InBody","the coach reads it");
  if(!/body fat 19\.6%/.test(x[1])||!/within the range the textbook gives for most men \(10–20%\)/.test(x[1])||!/Mifflin-St Jeor/.test(x[1]))throw new Error("answer: "+x[1]);
});
await test("InBody from its photo: read on the phone, nothing fetched from outside, every figure in its field to check; saved, the coach says what it means for the plans",async page=>{
  const outside=[];
  await page.route("**/*",r=>{const u=new URL(r.request().url());if(!/^(localhost|127\.0\.0\.1)$/.test(u.hostname)){outside.push(u.href);return r.abort();}return r.continue();});
  try{
    /* A sheet as printed: labels, readings, the ranges beside them. */
    const png=await page.evaluate(()=>{const c=document.createElement("canvas");c.width=1240;c.height=900;const g=c.getContext("2d");
      g.fillStyle="#fff";g.fillRect(0,0,c.width,c.height);g.fillStyle="#111";g.font="bold 40px Arial";g.fillText("InBody",60,80);g.font="24px Arial";
      [["Total Body Water (L)","49.8","42.0~51.4"],["Body Fat Mass (kg)","20.6","10.1~20.2"],["Weight (kg)","84.2","61.5~83.1"],["Skeletal Muscle Mass (kg)","38.1","30.4~37.2"],
       ["Percent Body Fat (%)","24.5","10.0~20.0"],["Visceral Fat Level","7",""],["Basal Metabolic Rate (kcal)","1820",""],["InBody Score","78/100",""]]
        .forEach((r,i)=>{const y=180+i*60;g.fillText(r[0],60,y);g.fillText(r[1],620,y);g.fillText(r[2],820,y);});
      return c.toDataURL("image/png").split(",")[1];});
    await page.evaluate(async()=>{(await import("/js/ui/actions.js")).openSheet("inbody");});await pause(page);
    await page.setInputFiles('#ib_img',{name:"inbody.png",mimeType:"image/png",buffer:Buffer.from(png,"base64")});
    await pause(page,300);
    eq(await page.$eval('#ibOcr',e=>!e.hidden&&/Reading the photo/.test(e.textContent)),true,"it says it is reading");
    await page.waitForFunction(()=>{const f=document.getElementById("ib_weight");return f&&f.value!=="";},null,{timeout:60000});
    eq(await page.evaluate(()=>["weight","pbf","smm","fatkg","vfl","ibmr","tbw","score"].map(k=>document.getElementById("ib_"+k).value)),
      ["84.2","24.5","38.1","20.6","7","1820","49.8","78"],"every figure off the photo, in its field to check");
    if(!(await page.$('#sheet .ib-img')))throw new Error("the photo went away on reading");
    eq(outside,[],"nothing fetched from outside the app");
    await page.tap('[data-ibsave]');await pause(page,800);
    eq(await ev(page,"S.body.filter(b=>b.src==='inbody').map(b=>[b.weight,b.bf])"),[[84.2,24.5]],"saved");
    const x=await page.evaluate(()=>{const e=[...document.querySelectorAll("#cpanel .chat-x")].pop();if(!e)return null;
      e.querySelectorAll(".chat-more").forEach(d=>d.open=true);
      return [(e.querySelector(".chat-at")||{}).textContent,e.innerText.replace(/[⁦-⁩]/g,""),!!e.querySelector('[data-chatq="goal"]')];});
    if(!x)throw new Error("the coach did not open on saving");
    eq(x[0],"Your InBody","the coach reads it at once");
    if(!/above the range the textbook gives for most men/.test(x[1]))throw new Error("answer: "+x[1]);
    eq(x[2],true,"with the goal to change, which rebuilds both plans");
  }finally{await page.unroute("**/*");}
});
await test("Coach memory: a fact that contradicts or updates one kept is asked about, not kept beside it",async page=>{
  await page.evaluate(async()=>{const S=(await import("/js/state.js")).S;S.context={v:1,next:2,items:[{id:"c1",kind:"schedule",text:"I work 13-hour days",at:"2026-10-01",by:"user"}]};});
  await openChat(page);
  await agSay(page,"I work 12-hour days now");await pause(page,300);
  await page.tap('#cpanel .chat-x.live [data-ctxadd="schedule"]');await pause(page,400);
  const x=await page.evaluate(()=>{const e=[...document.querySelectorAll("#cpanel .chat-x")].pop();return [e.innerText,[...e.querySelectorAll("button")].map(b=>Object.keys(b.dataset)[0])];});
  if(!/Earlier you told me “I work 13-hour days”\. Which stands now\?/.test(x[0]))throw new Error("not asked: "+x[0]);
  eq(await ev(page,"S.context.items.map(i=>i.text)"),["I work 13-hour days"],"nothing changed before the answer");
  await page.tap('#cpanel .chat-x.live [data-ctxrep]');await pause(page,400);
  eq(await ev(page,"S.context.items.map(i=>i.text)"),["I work 12-hour days now"],"replaced: one statement, the newer");
});
await test("Workout motion, with motion on: the RPE card holds the chosen number, then plays out while the cards below rise; Next exercise arrives, it does not pop in",async page=>{
  await page.evaluate(async()=>{const S=(await import("/js/state.js")).S;S.prefs.rpe="every";});
  await startWorkout(page);
  const sets=await ev(page,"S.active.entries[0].planned.sets||3");
  for(let k=0;k<sets;k++){await page.fill('#in_r','8');await page.tap('[data-logset]');await pause(page,900);
    if(k<sets-1){const r=await page.$('.rpeask [data-rpeset$=":7"]');if(r){await r.tap();await pause(page,1000);}}}
  eq(!!(await page.$('.rpeask')),true,"asked after the last set");
  const before=await page.$eval('[data-nextex]',e=>e.getBoundingClientRect().top);
  await page.tap('.rpeask [data-rpeset$=":8"]');await pause(page,80);
  eq(await page.$eval('.rpeask [data-rpeset$=":8"]',e=>e.classList.contains("on")),true,"the chosen number is held");
  await page.waitForSelector('.rpeask.rowout.slow',{timeout:1500});
  const mid=await page.$eval('.rpeask',e=>getComputedStyle(e).animationDuration);
  eq(mid,"0.4s","it plays out over the unhurried flow, not cut");
  await pause(page,900);
  eq(!!(await page.$('.rpeask')),false,"then it is gone");
  const after=await page.$eval('[data-nextex]',e=>e.getBoundingClientRect().top);
  if(!(after<before))throw new Error("Next exercise did not rise into its place: "+before+" → "+after);
  eq(await page.$eval('[data-nextex]',e=>[e.getAttribute("data-k"),e.hasAttribute("data-anim"),getComputedStyle(e).animationName]),["lognext",true,"cardIn"],"Next exercise arrives as a card of its own");
  /* The rest, put away: it plays out where it was; nothing is left behind. */
  if(!(await page.$('.sess [data-k="rest"]')))throw new Error("no rest to put away");
  await page.evaluate(async()=>{const V=(await import("/js/ui/view.js")).V;V.restEnd=Date.now()+300;});
  await page.waitForSelector('.sess [data-k="rest"] [data-rest="skip"]',{timeout:5000});
  await page.tap('.sess [data-k="rest"] [data-rest="skip"]');await pause(page,60);
  eq(await page.evaluate(()=>{const g=document.querySelector('.sess .rb.ghost');return g?[g.classList.contains("rowout"),g.inert,!!g.querySelector("[id]")]:null;}),[true,true,false],"the rest card plays out, inert, its ids gone");
  await pause(page,900);
  eq(await page.evaluate(()=>document.querySelectorAll('.sess .rb').length),0,"then it is gone, and no rest is left");
},{prefs:{anim:true}});
await test("Workout fixes: the chat finishes the exercise on screen; RPE is asked after a set, about it; the set being done can be deleted, then Next exercise; today's exercises reorder by grip",async page=>{
  await page.evaluate(async()=>{const S=(await import("/js/state.js")).S;S.prefs.rpe="every";});
  await startWorkout(page);
  if(await page.$('.wsc [data-rpe]'))throw new Error("RPE asked before the set is done");
  await page.fill('#in_r','8');await page.tap('[data-logset]');await pause(page,900);
  eq(await page.$eval('.rpeask .val-k',e=>e.textContent),"How hard was set 1? · RPE","asked about the set just done");
  await page.tap('.rpeask [data-rpeset$=":8"]');await pause(page,300);
  eq([await ev(page,"S.active.entries[0].sets[0].rpe"),!!(await page.$('.rpeask'))],[8,false],"written to that set; the question goes");
  const rows=await page.$$eval('.wsl .wsr',a=>a.length);
  await page.tap('.wsr.on [data-delset]');await pause(page,500);
  eq(await page.$$eval('.wsl .wsr',a=>a.length),rows-1,"the set being done is deleted, the next takes its place");
  while(await page.$('.wsr.on [data-delset]')){await page.tap('.wsr.on [data-delset]');await pause(page,500);}
  eq(await page.$eval('.sess .log',e=>e.textContent.trim()),"Next exercise","none left: Next exercise");
  /* Reorder: the third moves up one, the one on screen stays on screen. */
  const names=await ev(page,"S.active.entries.map(e=>e.name)");
  await page.tap('[data-exlist]');await pause(page);
  await page.focus('[data-grip="le2"]');await page.keyboard.press("ArrowUp");await pause(page,300);
  eq(await ev(page,"S.active.entries.map(e=>e.name)"),[names[0],names[2],names[1]].concat(names.slice(3)),"moved up one");
  eq(await ev(page,"S.active.entries[V.logIdx].name"),names[0],"the exercise on screen is still the one on screen");
  await page.evaluate(async()=>{(await import("/js/ui/actions.js")).closeSheet();});await pause(page);
  /* The chat: done with this exercise. */
  await page.tap('.ss-coach');await pause(page,500);
  await page.fill('#chatq',"I need to complete the current exercise");await page.press('#chatq','Enter');await pause(page,900);
  /* Done at once, and the panel steps aside so the next exercise is in view. */
  const x=await ev(page,"S.chat[S.chat.length-1].ag.done");
  if(!/Done with .+: 1 set logged\. On to the next\./.test(x))throw new Error("chat: "+x);
  eq(await ev(page,"V.logIdx"),1,"on to the next exercise");
},{prefs:{autorest:false}});
await test("Two sessions in a day: by weekday, the second pinned day is today's once the first is done; on the go, Start another session starts any day",async page=>{
  const ids=await page.evaluate(async()=>{const st=await import("/js/state.js"),S=st.S,sp=st.split();const wd=((new Date().getDay()+6)%7)+1;
    sp.schedule="week";const tr=sp.days.filter(d=>d.ex.length);tr.forEach(d=>d.wd=[]);tr[0].wd=[wd];tr[1].wd=[wd];
    S.sessions.unshift({id:"am",date:new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10),dayId:tr[0].id,dayName:tr[0].name,entries:[{name:tr[0].ex[0].name,muscle:"Chest",sets:[{w:60,r:8}]}]});
    st.saveDB();return [tr[0].id,tr[1].id];});
  await tapTab(page,"train");await pause(page,500);
  eq(await page.$eval('.thero2 .klabel',e=>e.textContent),"Session 2 today","the second session is today's now");
  eq(await page.$eval('.thero2 [data-startday]',e=>e.dataset.startday),ids[1],"and it is the other day pinned today");
  /* On the go: the second done too, then any day. */
  await page.evaluate(async(ids)=>{const st=await import("/js/state.js"),S=st.S;S.sessions.unshift(Object.assign({},S.sessions[0],{id:"pm",dayId:ids[1]}));st.saveDB();},ids);
  await tapTab(page,"progress");await tapTab(page,"train");await pause(page,500);
  await page.tap('.thero2 [data-another]');await pause(page,400);
  eq(await page.$$eval('#sheet [data-startday].did',a=>a.length),2,"today's done sessions ticked");
  await page.tap('#sheet [data-startday]:not(.did)');await pause(page,600);
  eq(await ev(page,"[!!S.active,V.sheet]"),[true,null],"started, the sheet gone");
});
/* The smart coach's model, stood in for: a test browser has no GPU. It answers with what
   it was told, so the test can read the grounding, and records every request. */
const fakeLLM=()=>{window.__llmCalls=[];window.__bunyanFakeLLM={installed:false,unload(){},
  chat:{completions:{create:async(req)=>{window.__llmCalls.push(req);const q=req.messages[req.messages.length-1].content;
    const words=/song/.test(q)?["Something ","upbeat ","helps.\nDO: ","next exercise"]:["I don't have that."];
    return {[Symbol.asyncIterator](){let i=0;return {next:async()=>i<words.length?{done:false,value:{choices:[{delta:{content:words[i++]}}]}}:{done:true}};}};}}}};};
await test("Smart coach: off until asked for; turned on, it answers what the rules can't, grounded on the log, in the asker's language, a suggested change as a button; turned off, the download goes",async page=>{
  await page.evaluate(async()=>{(await import("/js/ui/actions.js")).openSheet("set_smart");});await pause(page,300);
  if(!(await page.$('[data-smarton]')))throw new Error("no way to turn it on");
  eq(await ev(page,"!!(S.prefs.smart&&S.prefs.smart.on)"),false,"off by default");
  await page.tap('[data-smartsize="better"]');await pause(page,200);
  await page.tap('[data-smarton]');await pause(page,600);
  eq(await ev(page,"[S.prefs.smart,!!document.querySelector('#sheet .smc-st.ok')]"),[{on:true,size:"better"},true],"on, the size chosen, said ready");
  await page.evaluate(async()=>{(await import("/js/ui/actions.js")).closeSheet();});await pause(page);
  await openChat(page);
  /* What the rules know is still theirs. */
  await agSay(page,"How much protein do I need?");await pause(page,400);
  eq(await ev(page,"window.__llmCalls.length"),0,"a question the rules answer never reaches the model");
  await page.fill('#chatq',"what's a good song for leg day");await page.press('#chatq','Enter');await pause(page,1200);
  const x=await page.evaluate(()=>{const e=[...document.querySelectorAll("#cpanel .chat-x")].pop();e.querySelectorAll(".chat-more").forEach(d=>d.open=true);
    return [(e.querySelector(".chat-at")||{}).textContent,e.innerText,[...e.querySelectorAll("[data-chatsay]")].map(b=>b.dataset.chatsay)];});
  eq([x[0],/Something upbeat helps\./.test(x[1]),/Written by the model on this phone/.test(x[1]),x[2]],["Smart coach",true,true,["next exercise"]],"its answer, said to be the model's, its suggestion a button");
  const sys=await ev(page,"window.__llmCalls[0].messages[0].content");
  if(!/Daily targets: \d+ kcal/.test(sys)||!/Never invent a number/.test(sys)||!/plain English/.test(sys))throw new Error("grounding: "+sys.slice(0,400));
  await page.fill("#chatq","ايه رأيك في الموسيقى وانا بتمرن");await page.press('#chatq','Enter');await pause(page,1200);
  if(!/Egyptian Arabic/.test(await ev(page,"window.__llmCalls[window.__llmCalls.length-1].messages[0].content")))throw new Error("an Arabic question not answered in Arabic");
  await page.tap('.cp [data-coachclose]');await pause(page,400);
  await page.evaluate(async()=>{(await import("/js/ui/actions.js")).openSheet("set_smart");});await pause(page,300);
  await page.tap('[data-smartoff]');await pause(page,300);await page.tap('#sheet [data-confirmok]');await pause(page,500);
  eq(await ev(page,"[S.prefs.smart.on,window.__bunyanFakeLLM.installed]"),[false,false],"off, the download removed");
},{init:fakeLLM});
await test("Coach agent: a day's name is a day only where it is said as one — \"add push ups to my current week\" with a Push day is Push-Ups, not the Push day",async page=>{
  await page.evaluate(async()=>{const sp=(await import("/js/state.js")).split();sp.days[0].name="Push";sp.days[2].name="Pull";sp.days[4].name="Legs";});
  await openChat(page);
  let r=await agSay(page,"Can u add push ups to my current week?");
  eq([r.lead,r.opts],["Add Pushups to which day?",["Push","Pull","Legs"]],"the exercise, then the day");
  r=await agSay(page,"add push ups to push");
  eq(r.lead,"Add Pushups to Push?","both, from one sentence");
  r=await agSay(page,"add pushups to push day");
  eq(r.lead,"Add Pushups to Push?","run together, and with day");
  r=await agSay(page,"remove leg press from push");
  eq(r.lead,"Take Leg Press out of Push?","from the day");
});
await test("Coach follow-ups: a typed answer to a choice, yes or no to a change, and \"and squats\" carry on the same request; compact scrolls through every message; a day-old conversation is gone, kept facts are not",async page=>{
  await openChat(page);
  let r=await agSay(page,"add tricep extention machine to push day");
  if(!/Closest:$/.test(r.lead))throw new Error(r.lead);
  r=await agSay(page,"Is it pull ups?");
  eq(r.lead,"Add Pullups to which day?","the answer to the pick, in words");
  r=await agSay(page,"yes");
  eq(r.lead,"Which one? Tap it, or say its name.","yes to a choice asks it again");
  r=await agSay(page,"the first one");
  eq(/^Add Pullups to Full Body A\?$/.test(r.lead),true,"an ordinal picks");
  const before=await dayEx(page,0);
  await page.fill('#chatq','yes');await page.press('#chatq','Enter');await pause(page,500);
  eq((await dayEx(page,0)).length,before.length+1,"yes is Add it");
  r=await agSay(page,"and squats");
  eq(r.lead,"Add Barbell Squat to which day?","and … is the same request again");
  r=await agSay(page,"Full Body B");
  await page.fill('#chatq','no');await page.press('#chatq','Enter');await pause(page,400);
  eq(await page.evaluate(()=>!![...document.querySelectorAll("#cpanel .chat-x")].pop().querySelector(".chat-n")),true,"no is Not now");
  /* Compact: every exchange is there, and the panel scrolls through them. */
  const sc=await page.evaluate(()=>{const b=document.getElementById("cpB"),xs=[...b.querySelectorAll(".chat-x")];
    return {n:xs.length,hidden:xs.filter(x=>!x.getClientRects().length).length,scrolls:b.scrollHeight>b.clientHeight};});
  eq([sc.n>=6,sc.hidden,sc.scrolls,await ev(page,"V.coach")],[true,0,true,"compact"],"compact scrolls through the whole conversation");
  /* A day later the conversation is gone from the chat (kept in its history, with a way
     to it); what they asked it to keep is not touched. */
  await page.evaluate(async()=>{const S=(await import("/js/state.js")).S;S.context={v:1,next:2,items:[{id:"c1",kind:"schedule",text:"I work nights",at:"2026-10-01",by:"user"}]};
    S.chat.forEach(m=>{m.at-=25*36e5;});});
  await page.tap('.cp [data-coachclose]');await pause(page,500);
  await page.tap('#cfab .cfab');await pause(page,500);
  eq([await page.$$eval('#cpanel .chat-x',a=>a.length),await ev(page,"S.chat.length>=6"),!!(await page.$('#cpanel [data-chathist]')),await ev(page,"S.context.items.length")],
    [0,true,true,1],"day-old messages leave the chat for its history, facts kept");
});
await test("Coach agent: sending appends one row and leaves the earlier ones as they were; the panel is not rebuilt",async page=>{
  await openChat(page);
  await agSay(page,"how much protein do I need");
  await page.evaluate(()=>{document.querySelector("#cpanel .chat-x").__mark=1;document.getElementById("cpB").__mark=1;});
  await agSay(page,"remove plank");
  eq(await page.evaluate(()=>[document.querySelector("#cpanel .chat-x").__mark,document.getElementById("cpB").__mark,document.querySelectorAll("#cpanel .chat-x").length]),[1,1,2],"same nodes, one more row");
  await page.tap('#cpanel [data-agno]');await pause(page,300);
  eq(await page.evaluate(()=>document.querySelector("#cpanel .chat-x").__mark),1,"Not now changes only its own row");
  eq(await dayEx(page,0).then(x=>x.includes("Plank")),true,"Not now leaves the program alone");
});
await test("Coach agent: remove and swap from the program; swap stays a food swap for foods; a food is logged to the meal said; a weigh-in is saved; each with Undo",async page=>{
  await openChat(page);
  let r=await agSay(page,"swap hack squat for leg press");
  eq(/^Swap Hack Squat for Leg Press in Full Body C\?$/.test(r.lead),true,"swap: the day it is in");
  await page.tap('#cpanel [data-agok]');await pause(page,450);
  eq((await dayEx(page,4))[0],"Leg Press","swapped in place");
  await page.tap('#cpanel [data-agundo]');await pause(page,400);
  eq((await dayEx(page,4))[0],"Hack Squat","and back");
  r=await agSay(page,"swap rice for potatoes");
  eq(await ev(page,"S.chat[S.chat.length-1].id"),"swap","rice is a food: the food swap, not an exercise");
  r=await agSay(page,"log 200g chicken breast for lunch");
  eq([/^Log Chicken Breast, Cooked, 200 g, to Lunch\?$/.test(r.lead),r.ok],[true,true],"the food, the amount and the meal said");
  await page.tap('#cpanel [data-agok]');await pause(page,500);
  eq(await ev(page,"(()=>{const d=Object.values(S.days)[0];return [Object.keys(d.meals),d.meals.Lunch.items[0].grams,!!V.coach];})()"),[["Lunch"],200,true],"logged, panel open");
  r=await agSay(page,"log chiken brest");
  if(!/^No food called “chiken brest”\. Closest:/.test(r.lead)||!r.opts.some(o=>/Chicken Breast/.test(o)))throw new Error("food close matches: "+JSON.stringify(r));
  r=await agSay(page,"I weigh 82.5 kg");
  eq(/^Save 82\.5 kg as today's weight\?$/.test(r.lead),true,"a weigh-in, said");
  await page.tap('#cpanel [data-agok]');await pause(page,400);
  eq(await ev(page,"S.body[S.body.length-1].weight"),82.5,"saved");
  await page.tap('#cpanel [data-agundo]');await pause(page,400);
  eq(await ev(page,"S.body.length"),1,"Undo");
  r=await agSay(page,"is my weight on track");
  eq(await ev(page,"S.chat[S.chat.length-1].id"),"weight","a question about weight is still a question");
});
await test("Coach agent in Arabic: requests in Egyptian Arabic, answered in Arabic, right to left",async page=>{
  await openChat(page);
  let r=await agSay(page,"شيل السكوات");
  eq([/^أشيل هاك سكوات من /.test(r.lead),r.lang,r.dir,r.ok],[true,"ar","rtl",true],"remove, in Arabic");
  r=await agSay(page,"بدل الهاك سكوات بالليج بريس");
  eq(/^أبدّل هاك سكوات بـ ليج بريس في /.test(r.lead),true,"swap, in Arabic");
  r=await agSay(page,"وزني النهارده ٨٢");
  eq(/^أحفظ 82 كجم وزن النهاردة؟$/.test(r.lead.replace(/[⁦-⁩]/g,"")),true,"a weigh-in in Arabic digits: "+r.lead);
  await page.tap('#cpanel [data-agok]');await pause(page,400);
  const d=await page.evaluate(()=>[...document.querySelectorAll("#cpanel .chat-x")].pop().querySelector(".ag-done").textContent);
  if(!/اتحفظ/.test(d)||!/تراجع/.test(d))throw new Error("applied in Arabic: "+d);
  /* Numbers in the lead are one run each. */
  eq(await page.evaluate(()=>[...document.querySelectorAll("#cpanel .chat-x.live .chat-lead .num")].length>0),true,"figures in .num");
},{prefs:{lang:"ar"}});
await test("Coach knowledge: training questions answer from the knowledge files with the person's own program, keep the entry, and lead with two sentences at most",async page=>{
  await openChat(page);
  const lead=()=>page.evaluate(()=>{const x=[...document.querySelectorAll("#cpanel .chat-x")].pop();
    x.querySelectorAll(".chat-more").forEach(d=>d.open=true);
    return {lead:x.querySelector(".chat-lead").textContent,src:x.querySelector(".chat-a").getAttribute("data-src")||"",shown:!!x.querySelector(".chat-src")};});
  const words=s=>s.trim().split(/\s+/).length,sents=s=>s.split(/[.!?؟](?:\s|$)/).filter(x=>x.trim()).length;
  for(const [q,re,src] of [["how many reps for hypertrophy",/6–12 reps a set\. Your program has most lifts at/,/Training variables 20\.3/],
    ["how long should I rest between sets",/up to 3 min between sets\. Your program rests/,/Training variables 20\.3/],
    ["how many sets a week for chest",/Your program gives chest \d+ sets a week\. The app's range for growth is roughly 12–20/,/Training variables/],
    ["how many days a week should I train",/sessions a week.*Your program has 3 training days/,/Training variables 20\.3/],
    ["how much protein do I need",/150 g a day.*1\.4 to 2 g per kg/,/Nutrition principles 9\.2/]]){
    await agSay(page,q);const r=await lead();
    if(!re.test(r.lead))throw new Error(q+": "+r.lead);
    if(!src.test(r.src))throw new Error(q+": no source: "+r.src);
    if(r.shown)throw new Error(q+": the source is shown");
    if(sents(r.lead)>2||words(r.lead)>45)throw new Error(q+": the lead runs "+words(r.lead)+" words");}
  /* Every answer's lead, whatever it is, two sentences at most. */
  for(const q of ["What do I train today?","what should I eat now","is my program balanced","how am i doing","my knee hurts"]){
    await agSay(page,q);const r=await lead();
    if(sents(r.lead)>2)throw new Error(q+": "+r.lead);}
});
await test("Coach scope: no diagnosis, no medical or supplement advice, however it is put; outside what it knows it says what it understood and where to go",async page=>{
  await openChat(page);
  const lead=()=>page.evaluate(()=>{const x=[...document.querySelectorAll("#cpanel .chat-x")].pop();return [x.querySelector(".chat-lead").textContent,[...x.querySelectorAll(".chat-acts button")].map(b=>b.textContent)];});
  for(const [q,re] of [["is my knee torn",/needs a physio or a doctor, not me/],["do I have tendonitis in my elbow",/needs a physio or a doctor, not me/],
    ["what's wrong with my shoulder",/needs a physio or a doctor, not me/],["should I take ibuprofen before training",/doctor or a pharmacist, not me/],
    ["should I take creatine",/doctor or a registered dietitian, not me/],["I think I have an eating disorder",/a doctor or a psychologist, not me/],
    ["ركبتي مقطوعة؟",/أخصائي علاج طبيعي أو دكتور، مش أنا/]]){
    await agSay(page,q);
    eq(await ev(page,"S.chat[S.chat.length-1].id"),"scope",q+": the hard limit");
    const [l]=await lead();if(!re.test(l))throw new Error(q+": "+l);
    if(/tendinitis|tendonitis|strain|sprain|tear/i.test(l))throw new Error(q+": names a condition: "+l);}
  await agSay(page,"change my height");
  let [l,b]=await lead();
  eq([/Profile > You/.test(l),b],[true,["Open it"]],"height: where it is, and a way there");
  await agSay(page,"what's my resting heart rate");
  [l,b]=await lead();
  eq([/not something I have data on/.test(l),b.length],[true,1],"no data: says so, and offers what it has");
  await agSay(page,"what's the weather in Cairo");
  [l]=await lead();
  if(/understand/i.test(l)||!/won't guess/.test(l))throw new Error("unknown: "+l);
});
await test("Coach actions: every action in the registry runs through a branch the screens already answer",async page=>{
  const r=await page.evaluate(async()=>{
    const M=await import("/js/ui/handlers/actions.js"),A=M.ACTIONS,src=await (await fetch("/js/ui/handlers/actions.js")).text();
    /* The taps written out, and the places "open …" goes (the Coach sections go through
       shell.js's one csec/ctsub/cfsub branch). */
    const keys=[...src.matchAll(/tap\(\{([a-z]+):/g)].map(m=>m[1])
      .concat(Object.values(M.PLACE).flat().map(D=>Object.keys(D)[0]).filter(k=>k!=="csec"));
    const handlers=await Promise.all(["shell","train","session","food","coach","progress","profile"].map(n=>fetch("/js/ui/handlers/"+n+".js").then(x=>x.text())));
    const all=handlers.join("\n");
    return {n:Object.keys(A).length,missing:[...new Set(keys)].filter(k=>!new RegExp('(key|has)\\("'+k+'"|D\\.'+k+'!==undefined').test(all)),
      described:Object.values(A).every(a=>a.desc&&a.params&&typeof a.confirm==="boolean"&&typeof a.run==="function"),
      domains:[...new Set(Object.keys(A).map(k=>k.split(".")[0]))].sort()};});
  eq([r.missing,r.described],[[],true],"each tap key is a registered branch; each action described");
  eq(r.domains,["act","app","cardio","deload","exercise","food","meal","past","plan","profile","progress","recovery","rest","sched","set","steps","travel","water","workout"],"grouped by domain");
  /* set.log, in a live workout: the logger's own Log set. */
  await startWorkout(page);
  const n0=await ev(page,"S.active.entries[V.logIdx].sets.length");
  await page.evaluate(async()=>{(await import("/js/ui/handlers/actions.js")).perform("set.log",{w:62.5,r:8},1);});await pause(page,400);
  eq(await ev(page,"[S.active.entries[V.logIdx].sets.length,S.active.entries[V.logIdx].sets.slice(-1)[0].w]"),[n0+1,62.5],"logged by the logger");
});
await test("Coach, a rough day: a report gets one question back; food goes to the week's reconciliation, never a stricter tomorrow; a week that cannot absorb it is still fine",async page=>{
  await openChat(page);
  const last=()=>page.evaluate(()=>{const x=[...document.querySelectorAll("#cpanel .chat-x")].pop();x.querySelectorAll(".chat-more").forEach(d=>d.open=true);
    return {lead:x.querySelector(".chat-lead").textContent,text:x.innerText,acts:[...x.querySelectorAll(".chat-acts button")].map(b=>b.textContent)};});
  await agSay(page,"I had a bad day, didn't commit to the diet, I need to amend it for today");
  let r=await last();
  eq([r.lead,r.acts],["Sounds like today got away from you. Want me to work out what's left in the week, or just log it and move on?",["Work out the week","Just log it"]],"one question, two ways on");
  /* A day over target by 1,100 kcal: spread over the days left, inside the limits. */
  await page.evaluate(async()=>{const S=(await import("/js/state.js")).S,U=await import("/js/util.js");
    S.days[U.today()]={water:0,steps:0,meals:{Lunch:{items:[{n:"x",kcal:3600,p:150,c:400,f:150}]}}};});
  await page.tap('#cpanel .chat-acts button');await pause(page,500);
  r=await last();
  if(!/kcal a day less, protein unchanged/.test(r.lead))throw new Error("week: "+r.lead);
  if(/tomorrow|make up|burn|fast|skip/i.test(r.lead))throw new Error("a stricter tomorrow: "+r.lead);
  const days=[...r.text.matchAll(/: ([\d,]+) kcal/g)].map(m=>+m[1].replace(",",""));
  if(!days.length||days.some(k=>k<2500*0.85-10))throw new Error("a day moved more than 15%: "+days);
  eq(await ev(page,"S.goals.kcal"),2500,"the app's targets are not changed");
  /* Far over: the week is still fine, said plainly. */
  await page.evaluate(async()=>{const S=(await import("/js/state.js")).S,U=await import("/js/util.js");S.days[U.today()].meals.Lunch.items[0].kcal=9000;});
  await page.tap('#cpanel [data-chatq="weekfood"]').catch(async()=>{await agSay(page,"I blew my diet today");await page.tap('#cpanel .chat-acts button');});
  await pause(page,500);
  if((await last()).lead.indexOf("Sounds like")===0){await page.tap('#cpanel .chat-acts button');await pause(page,500);}
  r=await last();
  if(!/^The week is still fine\./.test(r.lead)||/challenge|try|harder/i.test(r.lead))throw new Error("week fine: "+r.lead);
  /* Missed training, a low day, a vague bad day: one question each. */
  for(const [q,re] of [["I missed today's workout",/^Missed one, then\./],["I'm exhausted today",/^A low day, then\./],["bad day",/What went off\?$/],["مروحتش الجيم النهارده",/^فاتك تمرين يعني\./]]){
    await agSay(page,q);r=await last();
    if(!re.test(r.lead))throw new Error(q+": "+r.lead);
    eq(await ev(page,"S.chat[S.chat.length-1].id"),"situation",q);}
  /* A question is answered, not asked back. */
  await agSay(page,"what should I eat now?");
  eq(await ev(page,"S.chat[S.chat.length-1].id"),"eat","a question stays a question");
});
await test("Coach, missed training on fixed weekdays: the missed sets moved where recovery allows, both numbers said; a rotation loses nothing",async page=>{
  await openChat(page);
  await agSay(page,"I missed today's workout");
  await page.tap('#cpanel [data-chatq="weektrain"]');await pause(page,500);
  let lead=await page.evaluate(()=>[...document.querySelectorAll("#cpanel .chat-x")].pop().querySelector(".chat-lead").textContent);
  if(!/^Nothing is lost\. Your program is a rotation/.test(lead))throw new Error("rotation: "+lead);
  await page.evaluate(async()=>{const sp=(await import("/js/state.js")).split(),sch=await import("/js/engine/schedule.js"),U=await import("/js/util.js");
    const wd=sch.isoWeekday(U.today());sp.schedule="week";sp.days[0].wd=[wd];sp.days[2].wd=[(wd+1)%7+1];sp.days[4].wd=[(wd+3)%7+1];});
  await agSay(page,"I missed today's workout");
  await page.tap('#cpanel [data-chatq="weektrain"]');await pause(page,500);
  lead=await page.evaluate(()=>[...document.querySelectorAll("#cpanel .chat-x")].pop().querySelector(".chat-lead").textContent);
  if(!/(\d+ of Full Body A's \d+ sets fit into the rest of the week; the other \d+ are gone\.|^All \d+ of Full Body A's sets fit|^The week is still fine\.)/.test(lead))throw new Error("week: "+lead);
});
await test("Coach context: a fact is kept only when the person says so, in their words, under the kind they pick; it is listed, deletable, and said back where it bears",async page=>{
  await openChat(page);
  await agSay(page,"I can't do bench press");
  eq(await ev(page,"(S.context&&S.context.items||[]).length"),0,"nothing kept before they say so");
  await page.tap('#cpanel .chat-acts button:nth-child(3)');await pause(page,300);
  eq(await ev(page,"S.context.items.map(x=>[x.kind,x.text,x.by])"),[["constraint","I can't do bench press","user"]],"their words, their kind");
  await agSay(page,"I don't eat pork");
  await page.tap('#cpanel [data-ctxno]');await pause(page,300);
  eq(await ev(page,"S.context.items.length"),1,"Don't keep it keeps nothing");
  /* A report is never stored as a fact about them. */
  await agSay(page,"I'm so tired, no motivation today");
  eq(await ev(page,"S.context.items.length"),1,"nothing inferred");
  await agSay(page,"What do I train today?");
  const a=await page.evaluate(()=>{const x=[...document.querySelectorAll("#cpanel .chat-x")].pop();x.querySelectorAll(".chat-more").forEach(d=>d.open=true);return x.innerText;});
  if(!/You said “I can't do bench press”, and Barbell Bench Press is in it\./.test(a))throw new Error("not said back: "+a);
  await agSay(page,"What have I told you?");
  eq(await page.$$eval('#cpanel .chat-x.live [data-ctxdel]',b=>b.map(x=>x.textContent)),["Delete “I can't do bench press”"],"listed with a delete");
  await page.tap('#cpanel [data-ctxdel]');await pause(page,300);
  eq(await ev(page,"S.context.items.length"),0,"deleted for good");
  /* And from Profile. */
  await page.tap('.cp [data-coachclose]');await pause(page,500);
  await tapTab(page,"profile");await pause(page,400);
  /* Profile's row is the chat history, which asks the coach nothing (owner, 27 Oct). */
  eq(await page.$$eval('[data-chatq="facts"]',a=>a.length),0,"Profile no longer sends a question");
});
await test("Chat history: the chat shows a day, the history thirty read-only days, reached from Profile and from the chat; cleared is hidden, not lost",async page=>{
  /* Three exchanges: today, three days ago, forty days ago. */
  await page.evaluate(async()=>{const S=(await import("/js/state.js")).S,now=Date.now(),D=864e5;
    const m=(at,q,p)=>({at,q,id:"protein",lang:"en",b:[{p}],acts:[{l:"Open Food",a:{"data-tab":"food"}}]});
    S.chat=[m(now-40*D,"forty days ago","Old."),m(now-3*D,"three days ago","Earlier."),m(now-60000,"just now","Now.")];
    (await import("/js/ui/render.js")).render();});
  await openChat(page);
  eq(await page.$$eval('#cpanel .chat-q',a=>a.map(x=>x.textContent)),["just now"],"the chat: the last day only");
  if(!(await page.$('#cpanel [data-chathist]')))throw new Error("no way to the history from the chat");
  await page.tap('#cpanel [data-chathist]');await pause(page,1400);
  eq(await ev(page,"[V.tab,V.sheet,!!V.coach]"),["profile","set_chat",false],"the panel closed, Profile, then the history");
  const h=await page.evaluate(()=>{const s=document.querySelector(".sheet,#sheet");return {
    q:[...s.querySelectorAll(".chat-q")].map(x=>x.textContent),days:s.querySelectorAll(".chh-day").length,
    acts:s.querySelectorAll(".chat-x button:not(summary), .chat-x [data-tab], .chat-x [data-chatq]").length,
    input:s.querySelectorAll("input:not(#chhq),textarea,[data-chatsend]").length,search:!!s.querySelector("#chhq")};});
  eq(h,{q:["just now","three days ago"],days:2,acts:0,input:0,search:true},"30 days, newest day first, nothing to tap or send; only a search");
  eq(await ev(page,"S.chat.length"),2,"forty days ago is gone");
  /* Profile's row opens the same. */
  await page.evaluate(async()=>{(await import("/js/ui/actions.js")).closeSheet();});await pause(page,600);
  const row=await page.$('[data-sheet="set_chat"]');
  eq(await row.evaluate(e=>e.textContent.indexOf("Chat history")>=0),true,"the row is named Chat history");
  /* Deleting it is one button, with Undo. */
  await row.tap();await pause(page,700);
  await page.tap('[data-chathistdel]');await pause(page,300);
  eq(await ev(page,"S.chat.length"),0,"deleted");
  await page.tap('.toast-undo');await pause(page,300);
  eq(await ev(page,"S.chat.length"),2,"Undo brings it back");
});
await test("Coach chat in motion: a sent question flies to its place, the coach types, then the answer arrives; with Animations off, at once",async page=>{
  await openChat(page);
  await page.fill('#chatq','how much protein do I need?');await page.tap('.cp-send');await pause(page,120);
  eq(await page.evaluate(()=>[!!document.querySelector(".chat-ghost"),getComputedStyle([...document.querySelectorAll(".cp-b .chat-q")].pop()).visibility]),[true,"hidden"],"in flight");
  eq(await page.evaluate(()=>!!document.querySelector(".chat-typing")),false,"no dots until the question has landed");
  await pause(page,450);
  eq(await page.evaluate(()=>[!!document.querySelector(".chat-typing"),getComputedStyle([...document.querySelectorAll(".chat-a")].pop()).display]),[true,"none"],"the coach typing, the answer waiting");
  await pause(page,600);
  eq(await page.evaluate(()=>!!document.querySelector(".chat-typing")),true,"still typing: a beat a person can see");
  await pause(page,1800);
  eq(await page.evaluate(()=>[!!document.querySelector(".chat-typing,.chat-ghost"),getComputedStyle([...document.querySelectorAll(".chat-a")].pop()).display!=="none",
    /150 g a day/.test((document.querySelectorAll(".chat-more").forEach(d=>d.open=true),[...document.querySelectorAll(".chat-a")].pop()).innerText)]),[false,true,true],"arrived");
  await page.evaluate(async()=>{(await import("/js/state.js")).S.prefs.anim=false;document.body.classList.add("noanim");});
  await page.fill('#chatq','how is my weight');await page.tap('.cp-send');await pause(page,250);
  eq(await page.evaluate(()=>[!!document.querySelector(".chat-typing,.chat-ghost"),getComputedStyle([...document.querySelectorAll(".chat-a")].pop()).display!=="none"]),[false,true],"no motion, no wait");
},{prefs:{anim:true}});
await test("Coach panel: it opens on the newest message; smaller and bigger glide with the conversation in view, never fading out",async page=>{
  await page.evaluate(async()=>{const S=(await import("/js/state.js")).S,now=Date.now();
    S.chat=Array.from({length:8},(_,i)=>({at:now-(8-i)*60000,q:"question "+i,id:"protein",lang:"en",b:[{p:"An answer long enough to take some room in the panel, line after line, number "+i+"."}]}));});
  await openChat(page);await pause(page,500);
  const at=await page.evaluate(()=>{const b=document.getElementById("cpB"),x=[...b.querySelectorAll(".chat-x")].pop();
    const r=x.getBoundingClientRect(),br=b.getBoundingClientRect();return [b.scrollTop>0,r.top>=br.top-1&&r.top<br.bottom-40];});
  eq(at,[true,true],"opens on the newest exchange, not scrolled up");
  await page.tap('.cp [data-coachsize="full"]');await pause(page,150);
  const mid=await page.evaluate(()=>{const c=document.querySelector(".cp"),cs=getComputedStyle(c),kids=[...c.children].map(k=>+getComputedStyle(k).opacity);
    return [cs.transform==="none",Math.min(...kids)];});
  eq(mid,[true,1],"mid-way: the box moves, not a scaled picture of it, and what is inside stays visible");
  await pause(page,700);
  eq(await page.evaluate(()=>{const c=document.querySelector(".cp");return [c.style.height,c.style.position,c.classList.contains("full")];}),["","",true],"settled: the box is the CSS's again");
},{prefs:{anim:true}});
await test("Guide: the first time Training opens, glass tips point at each thing in turn; a tap anywhere is the next; once seen it stays away; Profile brings it back",async page=>{
  await pause(page,1400);
  const card=()=>page.evaluate(()=>{const c=document.querySelector(".tour-card");if(!c)return null;
    const h=document.querySelector(".tour-hole").getBoundingClientRect();
    return {k:c.querySelector(".tour-k").textContent,h:c.querySelector(".tour-h").textContent,dir:c.classList.contains("up")?"up":c.classList.contains("down")?"down":"none",hole:[Math.round(h.width),Math.round(h.height)]};});
  let c=await card();
  if(!c)throw new Error("no guide on first opening");
  eq([c.k,c.h],["Training · 1 of 7","What the coach noticed"],"the first tip");
  const bell=await page.$eval('.hacts [data-csec="ai"]',e=>{const r=e.getBoundingClientRect();return [Math.round(r.width),Math.round(r.height)];});
  if(Math.abs(c.hole[0]-bell[0]-16)>2||Math.abs(c.hole[1]-bell[1]-16)>2)throw new Error("the light is not on the bell: "+JSON.stringify([c.hole,bell]));
  eq(await ev(page,"V.tab"),"train","the page under it is untouched");
  /* Anywhere: even over a button, a tap only moves the guide on. */
  const seen=[c.h];
  for(let i=0;i<6;i++){await page.mouse.click(30+i*40,300+i*30);await pause(page,500);c=await card();if(c)seen.push(c.h);}
  eq(seen.length,7,"seven tips (live tracking is reached through Cardio and sports)");
  eq(seen[6],"Getting around","the last points at the dock");
  eq(await ev(page,"[V.tab,V.sheet]"),["train",null],"no tap reached the page");
  await page.mouse.click(200,200);await pause(page,600);
  eq([await card(),await ev(page,"S.prefs.toured.train")],[null,1],"finished, and remembered");
  await page.reload();await pause(page,2200);
  eq(await card(),null,"not again");
  /* Profile → Show the guide again: Training's guide, from the start. */
  await page.evaluate(()=>localStorage.setItem("bunyan:notour","1"));
  await tapTab(page,"profile");await pause(page,400);
  await page.evaluate(()=>localStorage.removeItem("bunyan:notour"));
  await page.$eval('[data-tourreset]',e=>e.click());await pause(page,1800);
  c=await card();
  eq([await ev(page,"V.tab"),c&&c.k],["train","Training · 1 of 7"],"back from the start");
  await page.click('.tour-skip');await pause(page,500);
  eq([await card(),await ev(page,"S.prefs.toured.train")],[null,1],"Skip ends it, seen");
},{tour:true});
await test("Warm-up pictures: drills the library shot under another name use its photos; the rest are drawn as figures, in the list and on their sheet",async page=>{
  const r=await page.evaluate(async()=>{const X=await import("/js/data/exercises.js");await new Promise(r=>X.loadExDB(r));
    return {bridge:X.exImg("Glute Bridge Hold",1),swing:X.exImg("Side-to-Side Leg Swings",0),cobra:X.exImg("Cobra Stretch",0),
      thumb:X.thumb("Cobra Stretch",40).indexOf('class="pose')>=0,none:X.thumb("Pec Deck Fly",40).indexOf('class="pose')>=0};});
  if(!/Butt_Lift_Bridge\/1\.jpg$/.test(r.bridge)||!/Side_Leg_Raises\/0\.jpg$/.test(r.swing))throw new Error("photos: "+JSON.stringify(r));
  eq([r.cobra,r.thumb,r.none],[null,true,false],"Cobra is drawn; a machine exercise is not");
  await page.evaluate(async()=>{(await import("/js/ui/actions.js")).openSheet("exdetail",{name:"Pigeon Stretch"});});await pause(page,600);
  eq(await page.$$eval('#sheet .exd-pose svg.pose path.lb',a=>a.length>=4),true,"its sheet shows the figure");
});
await test("Steps: tap the number and type any count (456); Done saves it; the buttons still step by 500",async page=>{
  await tapTab(page,"train");await pause(page);await page.evaluate(()=>window.scrollTo(0,0));
  await page.$eval('.htile.steps',e=>e.click());await pause(page,400);
  eq(await page.$eval('#in_st',e=>[e.type,e.inputMode]),["number","numeric"],"a number field with the plain pad");
  await page.tap('#in_st');await pause(page,150);
  await page.keyboard.type("456");await pause(page,100);
  await page.keyboard.press("Enter");await pause(page,400);
  eq(await page.evaluate(async()=>{const m=await import("/js/state.js"),V=(await import("/js/ui/view.js")).V,u=await import("/js/util.js");return [!!V.sheet,(m.S.days[u.today()]||{}).steps];}),[false,456],"saved as typed, the sheet closed");
  await page.$eval('.htile.steps',e=>e.click());await pause(page,400);
  eq(await page.$eval('#in_st',e=>e.value),"456","the field opens on today's count");
  await page.tap('.stfield [data-d="500"]');await pause(page,200);
  eq(await page.$eval('#in_st',e=>e.value),"956","+ still steps by 500");
});
await test("Plan: “New meal plan from my targets” stands clear of the tiles above it",async page=>{
  await tapTab(page,"coach");await pause(page);
  const gap=await page.evaluate(()=>{const b=document.querySelector(".cplan-gen"),g=document.querySelector(".cplan-g");
    return b&&g?b.getBoundingClientRect().top-g.getBoundingClientRect().bottom:null;});
  if(gap==null||gap<10)throw new Error("the button touches the tiles: gap "+gap);
});
await test("Progress: the controls carry icons, the halves are a figure with their own names, and Plan is a brain",async page=>{
  await tapTab(page,"progress");await pause(page);
  eq(await page.$$eval('.pgtabs2 .seg-b',a=>a.map(b=>!!b.querySelector("svg.seg-i")&&b.querySelector(".seg-l").textContent)),["Overview","Strength","Body"],"an icon beside each view's name");
  eq(await page.$eval('.thead-ic svg',e=>getComputedStyle(e).fill!=="none"),true,"the page's mark beside its name");
  await page.tap('[data-ptab="strength"]');await pause(page);
  eq(await page.$$eval('.pghalf .seg-b',a=>a.map(b=>[b.getAttribute("aria-label"),b.querySelectorAll(".seg-dim").length])),
    [["Whole body",0],["Upper body",1],["Lower body",1]],"one figure, the other half faint");
  /* Low (owner, 27 Oct): the views and one row of spans and halves, under a fifth of the screen. */
  const low=await page.evaluate(()=>{const a=document.querySelector(".pgtabs2").getBoundingClientRect(),f=document.querySelector(".pgfilt").getBoundingClientRect(),
    r=document.querySelector(".pgrange").getBoundingClientRect(),h=document.querySelector(".pghalf").getBoundingClientRect();
    return [f.bottom-a.top<innerHeight/5,r.top===h.top,document.querySelectorAll(".pghalf .seg-l").length];});
  eq(low,[true,true,0],"two low rows; the halves are the figure alone");
  const keep=await page.$('.pghalf');await page.tap('[data-phalf="lower"]');await pause(page);
  eq(await page.$eval('[data-phalf="lower"]',e=>e.getAttribute("aria-pressed")),"true","Lower chosen");
  eq(await keep.evaluate(e=>e.isConnected),true,"the control is kept, not rebuilt");
  eq(await page.$eval('.dock-b[data-tab="coach"] svg path',e=>e.getAttribute("d").startsWith("M6.2 15.2")),true,"Plan's icon is the brain");
});
await test("Progress: training volume over a month is capsule bars, the newest in the accent with its figure",async page=>{
  await tapTab(page,"progress");await pause(page);
  const r=await page.evaluate(()=>{const c=document.querySelector(".caps");if(!c)return null;
    const cs=[...c.querySelectorAll(".caps-c")];
    return {n:cs.length,on:cs.map(x=>x.classList.contains("on")).lastIndexOf(true),v:(c.querySelector(".caps-c.on .caps-v")||{}).textContent,
      label:c.getAttribute("aria-label"),round:getComputedStyle(c.querySelector(".caps-b")).borderTopLeftRadius};});
  if(!r)throw new Error("no capsule bars");
  eq(r.on,r.n-1,"the newest is the one marked");
  if(!/^[\d,]+ kg$/.test(r.v||""))throw new Error("its figure: "+r.v);
  if(!/^Training volume, /.test(r.label))throw new Error("no name for a screen reader: "+r.label);
  if(parseFloat(r.round)<10)throw new Error("not rounded: "+r.round);
});
await test("Coach AI: this week's gauge agrees with Training's week; Ask me anything opens the chat ready to type; each plan tile opens its part",async page=>{
  await tapTab(page,"train");await pause(page);
  const wk=await page.$eval('.twk-h b',e=>e.textContent.match(/(\d+) \/ (\d+)/).slice(1).map(Number));
  await coach(page,"ai");
  const g=await page.evaluate(()=>({v:document.querySelector(".cweek-gv b").textContent,w:document.querySelector(".cweek-st b").textContent,
    on:document.querySelectorAll(".cweek-svg line.on").length,dot:!!document.querySelector(".cweek-svg .dot")}));
  eq(g.w,wk[0]+"/"+wk[1],"the same workouts as Training's week");
  eq(g.v,wk[1]?Math.round(wk[0]/wk[1]*100)+"%":"—","the share");
  if(wk[0]&&!g.on)throw new Error("no ticks filled");
  await page.tap('#cfab .cfab');await pause(page,400);await page.focus('#chatq');
  eq(await page.evaluate(()=>[document.activeElement&&document.activeElement.id,!!document.querySelector("#cpanel .cp-f")]),["chatq",true],"the box has the caret");
  /* Its close is in sight and works with the keyboard up. */
  const bb=await (await page.$('.cp [data-coachclose]')).boundingBox();
  if(bb.y<0)throw new Error("the close is off the top of the screen");
  await page.touchscreen.tap(bb.x+bb.width/2,bb.y+bb.height/2);await pause(page,500);
  eq(await ev(page,"[V.tab,!!V.coach]"),["coach",false],"back to Coach AI");
  /* The dock ignores taps for a moment after the keyboard closes (body.kbleave). */
  await pause(page,600);
  for(const [sel,want] of [['.cplan-t[data-cfsub="targets"]',["coach","food"]],['.cplan-t[data-ctsub="program"]',["coach","train"]],['.cplan-t[data-cfsub="plan"]',["coach","food"]]]){
    await coach(page,"ai");await page.$eval(sel,e=>e.scrollIntoView({block:"center"}));await pause(page,100);
    await page.tap(sel);await pause(page,300);
    eq(await ev(page,"[V.tab,V.csec]"),want,sel);}
  await coach(page,"ai");
  if(!(await page.$('.cplan-t[data-setup]')))throw new Error("no way to take the assessment again");
});
await test("Coach AI in Arabic: the gauge fills from the right, the plan's figures are Arabic",async page=>{
  await coach(page,"ai");
  const r=await page.evaluate(()=>({tf:getComputedStyle(document.querySelector(".cweek-svg")).transform,
    tiles:[...document.querySelectorAll(".cplan-t")].map(x=>x.innerText).join(" ")}));
  if(!/^matrix\(-1/.test(r.tf))throw new Error("not mirrored: "+r.tf);
  if(/kcal|protein/i.test(r.tiles))throw new Error("English in the tiles: "+r.tiles);
},{prefs:{lang:"ar"}});
await test("Arabic type: titles in Alexandria and text in Readex Pro, bundled, and loaded for an Arabic screen",async page=>{
  await page.evaluate(()=>document.fonts.ready);await pause(page,300);
  const r=await page.evaluate(()=>[...document.fonts].filter(f=>f.status==="loaded").map(f=>f.family.replace(/"/g,"")+"|"+(f.unicodeRange.indexOf("U+600-6FF")>=0||f.unicodeRange.indexOf("U+0600-06FF")>=0?"ar":"latin")));
  for(const f of ["Outfit|ar","Manrope|ar"])if(r.indexOf(f)<0)throw new Error(f+" not loaded: "+JSON.stringify(r));
  eq(await page.evaluate(()=>getComputedStyle(document.body).fontFamily.split(",")[0].replace(/"/g,"").trim()),"Manrope","Arabic text starts from the bundled face");
},{prefs:{lang:"ar"}});
/* ---- Food: what the body needs (js/engine/needs.js, js/ui/bodyneeds.js) ---- */
function lowProtein(){
  const db=seed();db.goals={kcal:2500,p:150,c:300,f:70,water:3000,steps:9000};
  const it=(n,k,p,c,f)=>({n,fid:"x"+n,grams:100,label:"1 serving",kcal:k,p,c,f});
  db.days[iso(0)]={water:2800,meals:{Breakfast:{done:true,items:[it("Bread and jam",900,20,170,15)]},Lunch:{done:true,items:[it("Pasta",1000,30,140,40)]}}};
  for(let i=1;i<=4;i++)db.days[iso(i)]={meals:{Lunch:{items:[it("Rice",2200,70,300,60)]}}};
  return db;}
await test("Food: in the evening with protein short, the body says so, lights protein, and offers three foods that log in one tap",async page=>{
  await page.addInitScript(()=>{Date.prototype.getHours=function(){return 19;};});await page.reload();await pause(page,1200);
  await tapTab(page,"food");await pause(page,400);
  eq(await page.$eval('.fbody-h',e=>e.textContent),"Your body needs more protein.","the headline");
  eq(await page.$$eval('.fbn',a=>a.map(x=>[x.querySelector('.fbn-k').textContent,x.classList.contains("on")])),
    [["Protein",true],["Carbs",false],["Fat",false],["Water",false]],"four, protein lit");
  eq(await page.$eval('.fbody-pill',e=>e.textContent),"+100 g to go","what is left, to the nearest 5 g");
  eq(await page.$$eval('.fsug-t',a=>a.length),3,"three foods");
  const before=await ev(page,"Object.values(S.days[Object.keys(S.days).sort().pop()].meals).reduce((n,m)=>n+(m.items||[]).length,0)");
  const fid=await page.$eval('.fsug-t',e=>e.dataset.fsug.split("|")[0]);
  await page.$eval('.fsug-t',e=>e.scrollIntoView({block:"center"}));await page.tap('.fsug-t');await pause(page,600);
  const after=await ev(page,"Object.values(S.days[Object.keys(S.days).sort().pop()].meals).flatMap(m=>m.items||[])");
  eq([after.length,after.some(x=>x.fid===fid&&x.p>10)],[before+1,true],"logged, with its protein");
  if(!/Coach noticed/.test(await page.$eval('.fnoticed',e=>e.innerText)))throw new Error("no week card");
  await page.$eval('[data-fbuild]',e=>e.scrollIntoView({block:"center"}));await page.tap('[data-fbuild]');await pause(page,600);
  eq(await ev(page,"[V.tab,V.coach,S.chat[S.chat.length-1].id]"),["coach","compact","eat"],"Build today's meal asks the coach, in the Coach panel");
},{db:lowProtein()});
await test("Food: in the morning nothing is behind yet; with water short in the afternoon, a glass is offered instead of food",async page=>{
  await page.addInitScript(()=>{Date.prototype.getHours=function(){return 9;};});await page.reload();await pause(page,1200);
  await tapTab(page,"food");await pause(page,400);
  eq([await page.$eval('.fbody-h',e=>e.textContent),await page.$$eval('.fbn.on,.fsug-t',a=>a.length)],["Your body is on course today.",0],"on course at 9:00");
  await page.evaluate(async()=>{Date.prototype.getHours=function(){return 17;};const s=await import("/js/state.js");
    const d=Object.keys(s.S.days).sort().pop();s.S.days[d].water=300;(await import("/js/ui/render.js")).render();});await pause(page,300);
  eq(await page.$eval('.fbn.on .fbn-k',e=>e.textContent),"Water","water lit");
  const w=await ev(page,"S.days[Object.keys(S.days).sort().pop()].water");
  await page.$eval('.fbody-glass',e=>e.scrollIntoView({block:"center"}));await page.tap('.fbody-glass');await pause(page,300);
  eq(await ev(page,"S.days[Object.keys(S.days).sort().pop()].water"),w+250,"a glass added");
},{db:lowProtein()});
/* ---- Live tracking: a run, a walk, a ride, a hike (js/ui/run.js, js/engine/run.js) ----
   The only way in is Log cardio: pick an outdoor activity, then "Track it live". */
async function liveStart(page,act){
  await tapTab(page,"train");await pause(page);
  await page.tap('[data-actsheet]');await pause(page);
  await page.tap('#sheet [data-quickact="'+act+'"]');await pause(page,500);
  await page.tap('#sheet [data-confirmok]');await pause(page,700);}
await test("Live tracking: no Running mode button on Training; Log cardio is the way in, for every outdoor activity",async page=>{
  await tapTab(page,"train");await pause(page);
  eq(await page.$$eval('#app [data-run]',a=>a.length),0,"no tile on Training");
  await page.tap('[data-actsheet]');await pause(page);
  eq(await page.$$eval('#sheet .actbtn.live',a=>a.map(e=>[e.dataset.quickact,e.querySelector("span").textContent,!!e.querySelector(".actbtn-gps")])),
    [["Running","Running, outdoor",true],["Walking","Walking, outdoor",true],["Hiking","Hiking",true],["Cycling","Cycling, outdoor",true],
     ["Trail Running/Walking","Trail Running/Walking",true]],"each outdoor one is marked as tracked live");
  eq(await page.$$eval('#sheet .actbtn:not(.live)',a=>a.some(e=>["Swimming","Running, Treadmill","Bicycling, Stationary","Football"].includes(e.dataset.quickact))),true,"indoor and sports are logged as before");
  await page.tap('#sheet [data-quickact="Cycling"]');await pause(page,500);
  eq(await page.$$eval('#sheet [data-confirmok],#sheet [data-confirmalt]',a=>a.map(b=>b.textContent)),["Track it live","Log one I've done"],"both ways");
  if(!/your speed/.test(await page.$eval('#sheet',e=>e.textContent)))throw new Error("a ride is read as speed");
  /* Logged after the fact: the logger, for a ride. */
  await page.tap('#sheet [data-confirmalt]');await pause(page,600);
  eq(await ev(page,"[!!S.run,!!S.active&&S.active.entries[0].name]"),[false,"Cycling"],"the logger, for the ride");
});
await test("Live tracking: a run's positions become distance and a route; pause stops the clock; Finish saves a Running activity",async page=>{
  const ctx=page.context();
  await ctx.grantPermissions(["geolocation"]);await ctx.setGeolocation({latitude:30.0444,longitude:31.2357,accuracy:8});
  await liveStart(page,"Running");
  eq(await page.evaluate(()=>[!!document.querySelector(".run"),document.body.classList.contains("focus"),document.querySelector(".run-h").textContent]),[true,true,"Running"],"the run fills the screen, no dock");
  eq(await page.evaluate(()=>[document.querySelectorAll(".run-map .rm-blk rect").length>20,!!document.querySelector(".run-map .rm-river")]),[true,true],"on a city");
  for(let i=1;i<=6;i++){await ctx.setGeolocation({latitude:30.0444+i*0.00009,longitude:31.2357,accuracy:8});await pause(page,1500);}
  const r=await ev(page,"[S.run.pts.length,Math.round(S.run.dist),S.run.gps,S.run.act]");
  if(r[0]<5||r[1]<40||r[2]!=="on"||r[3]!=="Running")throw new Error("not tracking: "+JSON.stringify(r));
  if(!/^M[\d.]+ [\d.]+L/.test(await page.$eval('#runRoute',e=>e.getAttribute("d"))))throw new Error("no route drawn");
  if(!/^\d+:\d\d$/.test(await page.$eval('#runP',e=>e.textContent)))throw new Error("no pace");
  await page.tap('[data-run="pause"]');await pause(page,300);
  const t1=await page.$eval('#runT',e=>e.textContent);await pause(page,1600);
  eq(await page.$eval('#runT',e=>e.textContent),t1,"paused: the clock holds");
  await page.tap('[data-run="resume"]');await pause(page,300);
  const seed=await ev(page,"Math.floor(S.run.started/1000)");
  await page.tap('[data-run="finish"]');await pause(page,800);
  const s=await ev(page,"[!!S.run,!!S.active,S.sessions[0].entries[0].name,S.sessions[0].entries[0].sets[0].km>0.03,S.sessions[0].entries[0].sets[0].route.length>=5,S.sessions[0].entries[0].sets[0].kcal>0,S.sessions[0].entries[0].sets[0].map]");
  eq(s,[false,false,"Running",true,true,true,seed],"saved as a run with its distance, route, calories and ground");
});
await test("Live tracking: a ride is its own: Cycling, speed in km/h, a countryside under the route, saved as a ride with a ride's calories",async page=>{
  const ctx=page.context();
  await ctx.grantPermissions(["geolocation"]);await ctx.setGeolocation({latitude:30.0444,longitude:31.2357,accuracy:8});
  await liveStart(page,"Cycling");
  eq(await page.evaluate(()=>[document.querySelector(".run").dataset.act,document.querySelector(".run-h").textContent,
    [...document.querySelectorAll(".run-pt>span")].map(e=>e.textContent)]),["Cycling","Cycling",["Kcal","Speed km/h"]],"a ride, read as speed");
  eq(await page.evaluate(()=>[document.querySelectorAll(".run-map .rm-field rect").length>10,document.querySelectorAll(".run-map .rm-road path").length,
    document.querySelectorAll(".run-map .rm-blk rect").length]),[true,3,0],"fields and roads, not a city");
  /* 22 m a fix every 1.5 s is about 15 m/s (53 km/h): a run would call each a leap,
     a ride keeps them. */
  for(let i=1;i<=6;i++){await ctx.setGeolocation({latitude:30.0444+i*0.0002,longitude:31.2357,accuracy:8});await pause(page,1500);}
  const r=await ev(page,"[S.run.pts.length,Math.round(S.run.dist)]");
  if(r[0]<5||r[1]<80)throw new Error("a ride's speed was taken for a leap: "+JSON.stringify(r));
  if(!/^\d+\.\d$/.test(await page.$eval('#runP',e=>e.textContent)))throw new Error("no speed: "+await page.$eval('#runP',e=>e.textContent));
  await page.tap('[data-run="finish"]');await pause(page,900);
  const e=await ev(page,"[S.sessions[0].entries[0].name,S.sessions[0].entries[0].sets[0].km>0.07,S.sessions[0].entries[0].sets[0].kcal>0]");
  eq(e,["Cycling",true,true],"saved as a ride");
  /* Training's card: the last ride, its speed, on its countryside. */
  await page.tap('.wc2 [data-wcdone],#sheet .btn').catch(()=>{});await pause(page,500);
  await page.evaluate(async()=>{(await import("/js/ui/actions.js")).closeSheet();});await pause(page,300);
  await tapTab(page,"train");await pause(page,500);
  eq(await page.$eval('.trun-last',e=>[e.dataset.act,/Last ride/.test(e.querySelector(".trun-k").textContent),/km\/h/.test(e.querySelector(".trun-s").textContent),
    !!e.querySelector(".rm-field")]),["Cycling",true,true,true],"the last ride, with its speed, on fields");
});
await test("Live tracking: a walk is drawn on a park and a hike on hills",async page=>{
  await liveStart(page,"Walking");
  eq(await page.evaluate(()=>[document.querySelector(".run-h").textContent,!!document.querySelector(".run-map .rm-pond path"),
    document.querySelectorAll(".run-map .rm-path path").length>2]),["Walking",true,true],"a walk: a park, its pond and paths");
  await page.tap('[data-run="leave"]');await pause(page,400);
  await page.tap('#sheet [data-confirmalt]');await pause(page,400);
  eq(await ev(page,"!!S.run"),false,"discarded");
  await liveStart(page,"Hiking");
  eq(await page.evaluate(()=>[document.querySelector(".run-h").textContent,document.querySelectorAll(".run-map .rm-contour path").length>20,
    !!document.querySelector(".run-map .rm-peak path"),document.querySelector("#runP").previousElementSibling.textContent]),["Hiking",true,true,"Pace /km"],"a hike: contours and peaks, read as pace");
});
await test("Live tracking: with location refused it is timed only, says so, and Finish opens the logger with the minutes in",async page=>{
  await page.evaluate(()=>{Object.defineProperty(navigator,"geolocation",{configurable:true,value:{watchPosition:(ok,err)=>{setTimeout(()=>err({code:1}),50);return 1;},clearWatch:()=>{}}});});
  await liveStart(page,"Walking");
  eq(await page.$eval('#runGps',e=>[e.className,e.textContent]),["run-gps denied","Location is off"],"the chip says so");
  await page.evaluate(async()=>{const S=(await import("/js/state.js")).S;S.run.ms=125000;(await import("/js/ui/render.js")).render();});await pause(page,300);
  if(!/timed only/.test(await page.$eval('.run-note',e=>e.textContent)))throw new Error("no note");
  await page.tap('[data-run="finish"]');await pause(page,600);
  eq(await ev(page,"[!!S.run,!!S.active&&S.active.entries[0].name,V.draft.min>=2]"),[false,"Walking",true],"the logger, for the walk, with the time");
});
await test("Live tracking: a session outlives closing the app, and the back gesture asks before ending it",async page=>{
  await liveStart(page,"Cycling");
  await page.reload();await pause(page,1200);
  eq(await page.evaluate(()=>[!!document.querySelector(".run"),document.querySelector(".run-h").textContent]),[true,"Cycling"],"still riding after a reload");
  await page.tap('[data-run="leave"]');await pause(page,400);
  eq(await page.$eval('#sheet',e=>/End it here/.test(e.innerText)),true,"asks");
  await page.tap('[data-confirmalt]');await pause(page,400);
  eq(await ev(page,"[!!S.run,S.sessions.filter(s=>s.entries[0].name==='Cycling').length]"),[false,0],"discarded: nothing saved");
});
/* ---- glass pop-ups and the ringed tiles (index.html, js/ui/views/home.js) ---- */
await test("Glass: a sheet, a dialog and a toast are frosted and see-through, and the veil over the page is lighter",async page=>{
  await page.evaluate(async()=>{(await import("/js/ui/actions.js")).openSheet("set_app");});await pause(page,500);
  const r=await page.evaluate(()=>{const b=getComputedStyle(document.querySelector("#sheet .sheetbox")),sh=getComputedStyle(document.querySelector("#sheet"));
    const alpha=c=>{const m=c.match(/rgba?\(([^)]+)\)/);if(!m)return 1;const p=m[1].split(",");return p.length>3?+p[3]:1;};
    return {blur:(b.backdropFilter||b.webkitBackdropFilter||""),bg:b.backgroundColor,bga:alpha(b.backgroundImage.match(/rgba\([^)]*\)\s*$/)?b.backgroundImage.match(/rgba\([^)]*\)\s*$/)[0]:b.backgroundColor),veil:alpha(sh.backgroundColor)};});
  if(!/blur\(30px\)/.test(r.blur))throw new Error("the sheet is not frosted: "+r.blur);
  if(!(r.bga<1&&r.bga>0.5))throw new Error("the sheet is not see-through: "+JSON.stringify(r));
  if(!(r.veil<0.5))throw new Error("the veil is as heavy as before: "+r.veil);
  await page.evaluate(async()=>{(await import("/js/ui/actions.js")).closeSheet();(await import("/js/ui/view.js")).toast("Saved.");});await pause(page,200);
  if(!/blur/.test(await page.$eval('.toast',e=>getComputedStyle(e).backdropFilter||getComputedStyle(e).webkitBackdropFilter)))throw new Error("the toast is not glass");
});
await test("Training: steps sit in a ring that fills to the goal, and say so when it is met",async page=>{
  await tapTab(page,"train");await pause(page);
  const ring=()=>page.$eval('.htile.steps',e=>{const a=e.querySelector('.htile-ring .a');return {arc:a?a.getAttribute("stroke-dasharray"):null,met:!!e.querySelector('.htile-met'),label:e.getAttribute("aria-label")};});
  let r=await ring();
  eq([r.arc,r.met],["44 100",false],"4,000 of 9,000: 44%");
  if(!/44% of goal/.test(r.label))throw new Error("the share is not in its name: "+r.label);
  await page.evaluate(async()=>{const s=await import("/js/state.js");const d=Object.keys(s.S.days).sort().pop();s.S.days[d].steps=9500;(await import("/js/ui/render.js")).render();});await pause(page,200);
  r=await ring();
  eq([r.arc,r.met],["100 100",true],"over the goal: a full ring and Goal met");
  eq(await page.$eval('.htile.weight .htile-ring',()=>true).catch(()=>false),false,"weight has no goal, so no ring");
},{db:Object.assign(seed(),{days:{[iso(0)]:{steps:4000,meals:{}}}})});
await test("Training: the last run of the fortnight is a card with its route, distance and pace, and opens its day",async page=>{
  await tapTab(page,"train");await pause(page);
  const r=await page.evaluate(()=>{const c=document.querySelector(".trun-last");if(!c)return null;
    return {km:c.querySelector(".trun-t b").textContent,d:(c.querySelector(".trun-map path.rt")||{getAttribute:()=>""}).getAttribute("d"),s:c.querySelector(".trun-s").textContent,date:c.dataset.openday};});
  if(!r)throw new Error("no card");
  eq([r.km,r.s,r.date],["4.86 km","5:33 /km · 27 min",iso(1)],"the run");
  if(!/^M[\d.]+ [\d.]+(L[\d.]+ [\d.]+){5,}/.test(r.d))throw new Error("no route: "+r.d);
  await page.$eval('.trun-last',e=>e.scrollIntoView({block:"center"}));await page.tap('.trun-last');await pause(page,400);
  eq(await ev(page,"[V.sheet,V.sd&&V.sd.date]"),["dayview",iso(1)],"the day opens");
},{db:(()=>{const db=seed(),route=[];for(let i=0;i<20;i++){const a=i/20*2*Math.PI;route.push([30+0.004*Math.sin(a),31+0.006*(1-Math.cos(a))]);}
  db.sessions.unshift({id:"run1",date:iso(1),dayName:"Running",activeMs:1.6e6,entries:[{name:"Running",muscle:"Cardio",kind:"activity",sets:[{w:0,r:0,min:27,km:4.86,rpe:6,kcal:389,gps:1,route}]}]});return db;})()});
await test("Training: no run in the last fortnight, no run card",async page=>{
  await tapTab(page,"train");await pause(page);
  eq(await page.$$eval('.trun-last',a=>a.length),0);
});
/* ---- The workout screen (docs/design/workout-spec.md) ---- */
await test("Workout screen: steppers move by the engine's own step; the check logs from the rest and says so, with Undo",async page=>{
  await startWorkout(page);
  const w0=await ev(page,"V.draft.w"),step=await F(page,`F.incrementFor(S.active.entries[0].name,${w0})`);
  await page.tap('[data-sstep="w"][data-d="1"]');await pause(page,200);
  eq(await ev(page,"V.draft.w"),Math.round((w0+step)*100)/100,"one tap, one step");
  eq(await page.$eval('[data-sstep="w"][data-d="1"]',e=>[e.textContent,e.getAttribute("aria-label")]),[String(step),"More "+step+" kg"],"the button says the step");
  await page.tap('[data-sstep="r"][data-d="-1"]');await pause(page,200);
  const r=await ev(page,"V.draft.r");
  await page.tap('[data-logset]');await pause(page,300);
  eq(await ev(page,"[S.active.entries[0].sets.length,S.active.entries[0].sets[0].r,V.restEnd>Date.now()]"),[1,r,true],"logged, resting");
  eq(await page.$eval('#app .log.ok b',e=>e.textContent),"Set 1 logged");
  if(!(await page.$('#app .rb #restDig')))throw new Error("no rest band");
  /* Undo takes it back and ends the rest it started. */
  await pause(page,700);await page.tap('[data-undolog]');await pause(page,300);
  eq(await ev(page,"[S.active.entries[0].sets.length,V.restEnd>Date.now()]"),[0,false],"undone");
  /* The check logs during a rest, in one tap, and the log control reads the next set after a moment. */
  await page.tap('[data-logset]');await pause(page,900);
  await page.tap('[data-logset]');await pause(page,2300);
  eq(await ev(page,"S.active.entries[0].sets.length"),2,"logged from the rest");
  eq(await page.$eval('#app [data-logset]',e=>e.textContent),"Log set 3");
},{prefs:{autorest:true}});
await test("Workout screen: a warm-up set (no button for it any more; the logic stays for the sets already logged) is out of volume and numbering; delete asks in the row",async page=>{
  await startWorkout(page);
  const w=await ev(page,"V.draft.w");
  if(await page.$('#app [data-addwu]'))throw new Error("the Add warm-up button is still there");
  await page.evaluate(async()=>{(await import("/js/ui/workout.js")).addWarmup();});await pause(page,300);
  eq(await page.$eval('#app [data-logset]',e=>e.textContent),"Log warm-up");
  if(!(await page.$('#app .wsc.wkwu .sc-wu')))throw new Error("the card does not say warm-up");
  eq(await ev(page,"V.draft.w"),w,"starts from the working weight (no warm-up recommended)");
  await page.tap('[data-sstep="w"][data-d="-1"]');await page.tap('[data-sstep="w"][data-d="-1"]');await pause(page,200);
  await page.tap('[data-logset]');await pause(page,300);
  eq(await page.$eval("#app .log.ok b",x=>x.textContent),"Warm-up logged","the logged state names it");
  await pause(page,2100);
  const e=await ev(page,"S.active.entries[0]");
  eq([e.sets.length,e.sets[0].wu,e.wuq],[1,true,0],"logged as a warm-up");
  eq(await page.$eval('#app [data-logset]',x=>x.textContent),"Log set 1","working sets keep their own numbers");
  eq(await ev(page,"V.draft.w"),w,"the working set does not start from the warm-up");
  eq(await F(page,"F.sessionVolume(S.active)"),0,"a warm-up is not volume");
  /* Delete asks inside the row; Cancel keeps it, Delete removes it and its row. */
  const rows=await page.$$eval('#app .wsr',a=>a.length);
  await page.tap('#app .wsr.wkwu [data-delset="0"]');await pause(page,300);
  if(!(await page.$('#app .wsr.ask [data-delok="0"]')))throw new Error("no confirm in the row");
  eq(await ev(page,"V.sheet"),null,"no sheet");
  await page.tap('[data-delno]');await pause(page,200);eq(await ev(page,"S.active.entries[0].sets.length"),1,"cancel keeps it");
  await page.tap('#app .wsr.wkwu [data-delset="0"]');await pause(page,300);await page.tap('[data-delok="0"]');await pause(page,700);
  eq([await ev(page,"S.active.entries[0].sets.length"),await page.$$eval('#app .wsr',a=>a.length)],[0,rows-1],"deleted, with its row");
},{prefs:{autorest:false}});
await test("Workout screen: a logged set's numbers can be corrected in place; a suggestion is marked until it is touched",async page=>{
  await startWorkout(page);
  if(!(await page.$('#sgTag:not([hidden])')))throw new Error("the suggestion is not marked");
  await page.fill('#in_r','9');
  eq(await page.$eval('#sgTag',e=>e.hidden),true,"typed: no longer a suggestion");
  await page.tap('[data-logset]');await pause(page,900);
  await page.fill('#app .wsr.did [data-setidx="0"][data-k="r"]','7');
  await page.evaluate(()=>document.activeElement.blur());await pause(page,300);
  eq(await ev(page,"S.active.entries[0].sets[0].r"),7,"corrected in place");
},{prefs:{autorest:false}});
/* ---- The floating Coach (js/ui/coachfab.js) ---- */
await test("Floating Coach: on the tab roots, never over a workout, a sheet or the keyboard; opening it from a workout keeps every value; Escape closes it",async page=>{
  const fab=()=>page.$$eval('#cfab .cfab',a=>a.length);
  for(const tab of ["train","food","progress","coach"]){await tapTab(page,tab);await pause(page,300);eq(await fab(),1,"on "+tab);}
  /* Docked beside the dock, in its band: it covers no content and nothing of the dock. */
  for(const w of [390,360,320]){await page.setViewportSize({width:w,height:780});await pause(page,250);
    const r=await page.evaluate(()=>{const f=document.querySelector("#cfab .cfab").getBoundingClientRect(),d=document.querySelector("nav .dock").getBoundingClientRect();
      return [Math.abs(f.bottom-d.bottom)<2,f.left>=d.right-1,f.right<=innerWidth];});
    eq(r,[true,true,true],w+": beside the dock, on screen");}
  await page.setViewportSize({width:390,height:844});await pause(page,200);
  await page.evaluate(async()=>{(await import("/js/ui/actions.js")).openSheet("backup");});await pause(page,300);
  eq(await fab(),0,"not over a sheet");
  await page.evaluate(async()=>{(await import("/js/ui/actions.js")).closeSheet();});await pause(page,300);
  await startWorkout(page);
  eq(await fab(),0,"not over the workout");
  await page.fill('#in_r','11');await page.tap('[data-sstep="w"][data-d="1"]');await pause(page,200);
  const before=await ev(page,"[V.logIdx,V.draft.w,S.active.entries[0].sets.length]");
  await page.tap('.ss-coach');await pause(page,500);
  eq(await ev(page,"[V.coach,V.sheet]"),["compact",null],"the Coach from the workout's header");
  eq(await page.$$eval('#cpanel .cp-sug [data-chatq]',a=>a.map(b=>b.dataset.chatq)),["busy","weights","sore"],"the workout's own questions: a machine taken first");
  await page.keyboard.press("Escape");await pause(page,500);
  eq(await ev(page,"[V.coach,V.logIdx,V.draft.w,S.active.entries[0].sets.length,document.getElementById('in_r').value]"),[null,...before,"11"],"closed, the workout as it was");
});
await test("Layout: scrolled to the end, every screen's content ends above the dock, and the Coach launcher covers no card on any of them",async page=>{
  for(const w of [390,320])for(const lang of ["en","ar"]){
    await page.setViewportSize({width:w,height:740});
    await page.evaluate(async l=>{(await import("/js/state.js")).S.prefs.lang=l;(await import("/js/ui/render.js")).render();},lang);await pause(page,200);
    for(const tab of ["train","food","progress","coach"]){
      await page.evaluate(()=>window.scrollTo(0,0));await pause(page,250);await tapTab(page,tab);await pause(page,400);
      for(const y of [0,1e6]){
        await page.evaluate(y=>window.scrollTo(0,y),y);await pause(page,450);
        const r=await page.evaluate(()=>{const d=document.querySelector("nav .dock").getBoundingClientRect(),f=document.querySelector("#cfab .cfab");
          const fr=f&&f.getBoundingClientRect(),hit=[],cards=[...document.querySelectorAll("#app .card, #app button, #app .num")].filter(e=>e.getClientRects().length);
          const over=(a,b)=>a.left<b.right-1&&b.left<a.right-1&&a.top<b.bottom-1&&b.top<a.bottom-1;
          for(const c of cards){const cr=c.getBoundingClientRect();if(fr&&over(cr,fr))hit.push((c.className||c.tagName)+"");}
          const vis=getComputedStyle(document.getElementById("nav")).visibility==="visible"&&d.top<innerHeight;
          const last=Math.max(...[...document.querySelectorAll("#app > *")].map(e=>e.getBoundingClientRect().bottom));
          if(fr&&fr.top<d.top-1)hit.push("(above the dock band)");
          return {hit,end:vis?last<=d.top+1:true,dead:document.documentElement.scrollHeight-(scrollY+innerHeight)};});
        if(y?r.hit.length:r.hit.some(h=>h[0]==="("))throw new Error(w+" "+lang+" "+tab+" @"+y+": the launcher covers "+r.hit.join(", "));
        if(y&&!r.end)throw new Error(w+" "+lang+" "+tab+": the content ends under the dock");}}}
});
await test("Workout: the first time, a hint shows to swipe for the next exercise (from the right in English, the left in Arabic); a tap or a swipe puts it away for good",async page=>{
  await startWorkout(page);await pause(page,1200);
  const h=await page.evaluate(()=>{const e=document.querySelector(".swhint .swhint-edge");if(!e)return null;const r=e.getBoundingClientRect();
    return {right:Math.round(innerWidth-r.right),text:document.querySelector(".swhint h2").textContent};});
  eq(h,{right:0,text:"Swipe left for the next exercise"},"at the right edge, saying which way");
  await page.tap('.swhint');await pause(page,400);
  eq(await ev(page,"[!!document.querySelector('.swhint'),S.prefs.toured.swipe]"),[false,1],"a tap puts it away and it is remembered");
  /* A swipe (here, moving to the next exercise) puts it away too. */
  await page.evaluate(async()=>{const S=(await import("/js/state.js")).S;delete S.prefs.toured.swipe;S.prefs.lang="ar";(await import("/js/ui/render.js")).render();});
  await pause(page,1200);
  const a=await page.evaluate(()=>{const e=document.querySelector(".swhint .swhint-edge");return e?Math.round(e.getBoundingClientRect().left):null;});
  eq(a,0,"Arabic: at the left edge");
  await page.evaluate(async()=>{(await import("/js/ui/workout.js")).jumpTo(1);});await pause(page,500);
  eq(await ev(page,"[!!document.querySelector('.swhint'),S.prefs.toured.swipe]"),[false,1],"moving on puts it away");
},{tour:true,prefs:{toured:{train:9,food:9,coach:9,progress:9,profile:9}}});
await test("Workout: the next exercise is named under the current one, in view on a small phone, and on the warm-up card; the exercise sheet never shows the old photos while its 3D figure loads",async page=>{
  await page.setViewportSize({width:375,height:667});
  await page.evaluate(async()=>{(await import("/js/state.js")).S.prefs.nowarm=false;});
  await startWorkout(page);
  const then=await page.$eval('.wu-then b',e=>e.textContent).catch(()=>"");
  eq(then,await ev(page,"(async()=>(await import('/js/i18n/exnames.js')).exName(S.active.entries[0].name))()"),"the warm-up names what follows it");
  await page.tap('[data-wuskip]');await pause(page,400);
  const r=await page.evaluate(()=>{const n=document.querySelector(".wexl-nx");if(!n)return null;const b=n.getBoundingClientRect();return [b.bottom<=innerHeight,!!document.querySelector("#app .nx")];});
  eq(r,[true,false],"Next is under the name, in view; the old card is gone");
  /* The figure's stage holds its size and shows no photos until it is drawn. */
  await page.tap('[data-exdetail]');await pause(page,30);
  const f=await page.evaluate(()=>{const f=document.querySelector("#sheet .fig3d");if(!f)return "none";
    return [f.hasAttribute("data-still")||f.hasAttribute("data-live")?"ok":getComputedStyle(f.querySelector(".fig3d-still")).visibility];});
  if(f!=="none"&&f[0]!=="ok"&&f[0]!=="hidden")throw new Error("photos shown while loading: "+f);
});
await test("Workout: no Add warm-up; Add a set sits under the sets; when the rest is over it can be extended by 30 s or closed",async page=>{
  await startWorkout(page);
  eq(await page.evaluate(()=>[!!document.querySelector("#app [data-addwu]"),!!document.querySelector("#app .wsl [data-addrow]")]),[false,true],"no warm-up chip; Add a set inside the sets list");
  const n0=await ev(page,"S.active.entries[0].planned.sets");
  await page.tap('#app .wsl [data-addrow]');await pause(page,300);
  eq(await page.$$eval('#app .wsl .wsr',a=>a.length),n0+1,"a set added");
  await page.fill('#in_w','40');await page.tap('[data-logset]');await pause(page,2500);
  await page.evaluate(async()=>{(await import("/js/ui/view.js")).V.restEnd=Date.now()+200;});await pause(page,2200);
  if(!(await page.$('#app .rb.over')))throw new Error("rest not over");
  await page.tap('.rb.over [data-rest="extend"]');await pause(page,300);
  eq(await ev(page,"[!!document.querySelector('.rb.over'),Math.round((V.restEnd-Date.now())/1000)]"),[false,30],"30 s more");
  await page.evaluate(async()=>{(await import("/js/ui/view.js")).V.restEnd=Date.now()+200;});await pause(page,2200);
  await page.tap('.rb.over [data-rest="skip"]');await pause(page,300);
  eq(await page.evaluate(()=>!!document.querySelector("#app .rb")),false,"closed");
},{prefs:{autorest:true}});
await test("Warm-up: cards with a progress line, no photos that load in at different times, Start pinned at the bottom",async page=>{
  await page.evaluate(async()=>{(await import("/js/state.js")).S.prefs.nowarm=false;});
  await startWorkout(page);
  const r=await page.evaluate(()=>{const f=document.querySelector(".wu-foot").getBoundingClientRect();
    return {cards:document.querySelectorAll(".wu2 .wu-card").length,imgs:document.querySelectorAll(".wu img,.wu .thumb,.wu .thumbwrap").length,
      prog:document.querySelector(".wu-prog span").textContent,foot:Math.round(f.bottom)<=innerHeight&&f.top<innerHeight};});
  if(r.cards<2||r.imgs!==0||!/^0 of \d+ done$/.test(r.prog)||!r.foot)throw new Error(JSON.stringify(r));
  await page.tap('.wu-pulse [data-wutick]');await pause(page,300);
  if(!/^1 of \d+ done$/.test(await page.$eval(".wu-prog span",e=>e.textContent)))throw new Error("progress not counted");
});
/* ---- Phase 1 of the visual audit ---- */
/* The set card says last time once, for the set being done (workout-spec.md); before the
   first set it is the recommendation instead. */
await test("Logger: last time reads in full for the set being done, in English and Arabic; How do you feel today? is one line",async page=>{
  await startWorkout(page);
  const r0=await page.evaluate(()=>{const rd=document.querySelector(".ready");
    return {rec:document.querySelector(".wsc .sc-h").textContent,readyH:rd?Math.round(rd.getBoundingClientRect().height):0,
      skipInHead:!!document.querySelector(".ready .ready-h .ready-skip")};});
  if(!/^Recommended /.test(r0.rec))throw new Error("before the first set: "+r0.rec);
  await page.fill('#in_r','8');await page.tap('[data-logset]');await pause(page,900);
  const r=await page.evaluate(()=>{const p=[...document.querySelectorAll(".wsc .sc-h span")];
    return {txt:p.map(e=>e.textContent),clipped:p.some(e=>e.scrollWidth>e.clientWidth+1)};});
  r.readyH=r0.readyH;r.skipInHead=r0.skipInHead;
  eq(r.txt[0],"Last time 60 kg × 8","the second set's last time, whole");
  eq([r.clipped,r.skipInHead],[false,true],"nothing clipped; Skip beside the question");
  if(r.readyH>110)throw new Error("readiness takes "+r.readyH+"px");
},{prefs:{autorest:false}});
await test("Logger in Arabic: last time keeps its figures in order",async page=>{
  await startWorkout(page);
  await page.fill('#in_r','8');await page.tap('[data-logset]');await pause(page,900);
  eq(await page.$eval(".wsc .sc-h span",e=>e.textContent),"آخر مرة 60 كجم × 8");
},{prefs:{autorest:false,lang:"ar"}});
await test("Calm red: an empty plan slot is faint text; a meal's delete is a quiet icon until pressed",async page=>{
  await coach(page,"food","plan");
  const c=await page.evaluate(()=>{const em=document.querySelector(".drow-s em"),s=getComputedStyle(em);
    const f=getComputedStyle(document.querySelector(".drow-s")).color;return [s.color,f];});
  if(/255, 46, 58/.test(c[0]))throw new Error("still red: "+c[0]);
  await tapTab(page,"food");await page.tap('[data-meal="Lunch"]');await pause(page,400);
  eq(await page.$eval(".fitemrow-x",e=>getComputedStyle(e).backgroundColor),"rgba(0, 0, 0, 0)","no red block");
},{db:Object.assign(seed(),{days:{[iso(0)]:{meals:{Lunch:{done:true,items:[{n:"Eggs",fid:"egg",grams:100,label:"100 g",kcal:143,p:12.6,c:.7,f:9.5}]}}}}})});
await test("Muscle map: an exercise shows what it works, front and back; Strength shades this week's sets on the body",async page=>{
  await page.evaluate(async()=>{(await import("/js/ui/actions.js")).openSheet("exdetail",{name:"Barbell Squat"});});await pause(page,500);
  const m=await page.evaluate(()=>{const s=document.querySelector("#sheet .exd-musc .bmap");return s?{p:s.querySelectorAll(".m.p").length,s:s.querySelectorAll(".m.s").length,
    label:s.getAttribute("aria-label"),text:document.querySelector(".exd-musc-t").innerText}:null;});
  if(!m)throw new Error("no body map on the exercise");
  /* One shape per muscle and side: squat lights the quads in front; glutes, hamstrings and calves (front and back) lighter. */
  if(m.p<1||m.s<4)throw new Error("lit: "+JSON.stringify(m));
  if(!/Primary: Quads/.test(m.label)||!/Quads/.test(m.text))throw new Error("label: "+m.label);
  await page.evaluate(async()=>{(await import("/js/ui/actions.js")).closeSheet();});await pause(page,300);
  await tapTab(page,"progress");await page.evaluate(async()=>{const V=(await import("/js/ui/view.js")).V;V.ptab="strength";(await import("/js/ui/render.js")).render();});await pause(page,400);
  const w=await page.evaluate(()=>{const s=document.querySelector(".pgbody .bmap");return s?[...s.querySelectorAll(".m.h1,.m.h2,.m.h3,.m.h4")].length:-1;});
  if(w<1)throw new Error("the week is not on the body");
});
await test("Cardio & Sports: every activity has its own icon, and Cycling is offered once",async page=>{
  await page.evaluate(async()=>{(await import("/js/ui/actions.js")).openSheet("acts");});await pause(page,500);
  const r=await page.evaluate(()=>{const t=[...document.querySelectorAll("#sheet .actbtn")];const by={};
    t.forEach(b=>{const k=b.querySelector("svg").innerHTML;(by[k]=by[k]||[]).push(b.dataset.quickact);});
    return {n:t.length,names:t.map(b=>b.dataset.quickact),shared:Object.values(by).filter(v=>v.length>1)};});
  if(r.names.indexOf("Bicycling")>=0)throw new Error("Bicycling beside Cycling");
  /* The three treadmills share the treadmill; a spinning class and the stationary bike share the bike. */
  eq(r.shared.map(v=>v.sort().join(",")).sort(),["Bicycling, Stationary,Spinning Class","Jogging, Treadmill,Running, Treadmill,Walking, Treadmill"],"only the same machine shares an icon");
});
await test("A weight change says its period the same way on Training, Overview and Body",async page=>{
  await tapTab(page,"train");await pause(page);
  const tr=await page.$eval('[data-sheet="weigh"]',e=>e.innerText);
  if(!/kg in \d+ days/.test(tr))throw new Error("Training: "+tr);
  await tapTab(page,"progress");await pause(page,300);
  const ov=await page.$eval(".pgkm .pgd",e=>e.textContent);
  if(!/kg in \d+ days$/.test(ov))throw new Error("Overview: "+ov);
  await page.evaluate(async()=>{const V=(await import("/js/ui/view.js")).V;V.ptab="body";(await import("/js/ui/render.js")).render();});await pause(page,300);
  const bd=await page.$eval(".pgwd .pgd",e=>e.textContent);
  if(!/kg in \d+ days$/.test(bd))throw new Error("Body: "+bd);
},{db:Object.assign(seed(),{body:[{date:iso(30),weight:85},{date:iso(9),weight:84.6},{date:iso(0),weight:84.8}]})});
await test("Surfaces: the page is glass, glass inside glass only tints, and a sheet focused from code draws no ring",async page=>{
  await tapTab(page,"profile");await pause(page,300);
  const b=await page.$eval("#app .sg-list",e=>{const s=getComputedStyle(e);return s.backdropFilter||s.webkitBackdropFilter||"none";});
  if(!/blur/.test(b))throw new Error("the settings rows are not glass: "+b);
  /* A second blur inside a frosted card would cost the phone and show nothing new. */
  const inner=await page.$$eval("#app :is(.card,.sg-list,.pid,.list) :is(.card,.list,.drow,.pill,.btn.g,.hbtn,.iconbtn,input,select,textarea)",
    a=>a.map(e=>{const s=getComputedStyle(e);return s.backdropFilter||s.webkitBackdropFilter||"none";}).filter(v=>v!=="none"));
  eq(inner,[],"nothing inside the glass blurs again");
  const d=await page.evaluate(()=>{const x=document.querySelector("nav .dock");const s=getComputedStyle(x);return s.backdropFilter||s.webkitBackdropFilter;});
  if(!/blur/.test(d))throw new Error("the dock lost its glass");
  await page.evaluate(async()=>{(await import("/js/ui/actions.js")).openSheet("exdetail",{name:"Barbell Squat"});});await pause(page,400);
  await page.evaluate(async()=>{(await import("/js/ui/actions.js")).openSheet("exdetail",{name:"Pullups"});});await pause(page,400);
  eq(await page.evaluate(()=>{const e=document.activeElement;return [e.classList.contains("sheetbox"),getComputedStyle(e).outlineStyle];}),[true,"none"]);
});
/* A partly transparent element cuts the glass inside it off from the ground: a page that
   faded in showed its cards and buttons thin and clear until the fade ended, then they
   frosted, a flash on every tab change. The page rises instead, and a sheet's veil fades
   by its colour. Sampled every frame while they come in. */
await test("Surfaces: changing page or opening a sheet never fades what holds the glass, so it does not flash",async page=>{
  const watch=sel=>page.evaluate(sel=>new Promise(res=>{const seen=[],t0=performance.now();
    (function f(){const e=document.querySelector(sel);if(e)seen.push(+getComputedStyle(e).opacity);
      if(performance.now()-t0<450)requestAnimationFrame(f);else res(seen);})();}),sel);
  await tapTab(page,"train");await pause(page,400);
  const w=watch("#app");await tapTab(page,"food");const seen=await w;
  if(!await page.evaluate(()=>document.getElementById("app").classList.contains("pagein")))throw new Error("the page did not animate in");
  eq(seen.filter(o=>o<1),[],"#app faded");
  const s=watch("#sheet .sheet");
  await page.evaluate(async()=>{(await import("/js/ui/actions.js")).openSheet("exdetail",{name:"Barbell Squat"});});
  eq((await s).filter(o=>o<1),[],"the sheet faded");
},{prefs:{anim:true}});
/* The live 3D figure (js/ui/mannequin.js): drawn by this browser's WebGL2 (software
   here). The suite runs with animations off, so each figure draws once and holds still
   until asked, which also keeps these tests quick. */
const mq=page=>page.evaluate(async()=>(await import("/js/ui/mannequin.js")).mannequins().map(m=>m.state()));
const probe=page=>page.evaluate(async()=>(await import("/js/ui/mannequin.js")).mannequins()[0].probe());
async function waitLive(page){
  for(let i=0;i<40;i++){const s=await mq(page);if(s.length&&s[0].frames>0)return s;await pause(page,250);}
  throw new Error("the figure never drew: "+JSON.stringify(await mq(page)));}
await test("Live figure: the Seated Chest Press moves in 3D in the exercise sheet, its muscles lit, and survives a repaint",async page=>{
  await page.evaluate(async()=>{(await import("/js/ui/actions.js")).openSheet("exdetail",{name:"Machine Chest Press"});});await pause(page,600);
  const s=await waitLive(page);
  eq([s.length,s[0].live,s[0].err],[1,true,""],"one live figure");
  eq(await page.$eval("#sheet .fig3d",e=>[e.hasAttribute("data-live"),e.hasAttribute("data-mq-turn"),getComputedStyle(e.querySelector(".fig3d-still")).display]),
    [true,true,"none"],"live, turnable, the stills put away");
  eq(await page.$$eval("#sheet .fig3d-still img",a=>a.map(i=>i.getAttribute("src"))),
    ["img/fig/bn_machine_chest_press-0.webp","img/fig/bn_machine_chest_press-1.webp"],"the stills it falls back to");
  const pr=await probe(page);
  if(!(pr.lit>.002))throw new Error("no rim light on the figure: "+JSON.stringify(pr));
  /* The red is the muscles' (the machine's red line is there either way). */
  const off=await page.evaluate(async()=>{const m=(await import("/js/ui/mannequin.js")).mannequins()[0];m.setHL({});const r=m.probe();return r;});
  if(!(pr.red>off.red+.001))throw new Error("no lit muscle on the figure: "+JSON.stringify([pr.red,off.red]));
  /* A repaint keeps the same figure, at the same size: the patcher leaves the canvas be. */
  const w0=await page.$eval("#sheet .fig3d canvas",c=>[c.width,c.height]);
  await page.evaluate(async()=>{window.__fig=document.querySelector("#sheet .fig3d")._mq;(await import("/js/ui/render.js")).render();});await pause(page,300);
  eq(await page.$eval("#sheet .fig3d canvas",c=>[c.width,c.height]),w0,"the canvas keeps its size");
  eq(await page.evaluate(()=>document.querySelector("#sheet .fig3d")._mq===window.__fig),true,"and its figure");
  /* Drag turns it; a tap plays it (it holds still with animations off). */
  const box=await page.$eval("#sheet .fig3d canvas",c=>{const r=c.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2];});
  await page.mouse.move(box[0],box[1]);await page.mouse.down();await page.mouse.move(box[0]-60,box[1],{steps:4});await page.mouse.up();
  const turned=(await mq(page))[0];
  if(Math.abs(turned.yaw-55)<10)throw new Error("a drag did not turn it: "+turned.yaw);
  eq(turned.playing,false,"a drag is not a tap");
  await page.tap("#sheet .fig3d-play");await pause(page,200);
  eq([(await mq(page))[0].playing,await page.$eval("#sheet .fig3d",e=>e.hasAttribute("data-paused"))],[true,false],"the button plays it");
  await page.tap("#sheet .fig3d-play");await pause(page,200);
  eq((await mq(page))[0].playing,false,"and pauses it");
  /* Closed, it lets go of the graphics card. */
  await page.evaluate(async()=>{(await import("/js/ui/actions.js")).closeSheet();});await pause(page,500);
  eq((await mq(page)).length,0,"nothing left running");
},{prefs:{palette:"red"}});
await test("Live figure: a second exercise is the same figure on other equipment — the Seated Machine Row",async page=>{
  await page.evaluate(async()=>{(await import("/js/ui/actions.js")).openSheet("exdetail",{name:"Seated Machine Row"});});await pause(page,600);
  const s=await waitLive(page);
  eq([s[0].live,s[0].yaw],[true,145],"live, from its own view: behind, where the back works");
  const pr=await probe(page);
  const off=await page.evaluate(async()=>{const m=(await import("/js/ui/mannequin.js")).mannequins()[0];m.setHL({});return m.probe();});
  if(!(pr.red>off.red+.001))throw new Error("no lit muscle: "+JSON.stringify([pr.red,off.red]));
  /* What it lights is the library's: the back in full, the biceps at half. */
  eq(await page.evaluate(async()=>{const R=await import("/js/data/mannequin/rig.js"),E=await import("/js/data/exercises.js"),M=await import("/js/data/mannequin/motion.js"),C=await import("/js/data/mannequin/records.js");
    const rec=C.recordFor("Seated Machine Row"),hl=R.highlight(E.muscleOf("Seated Machine Row"),E.secondaryOf("Seated Machine Row"),rec.refine);
    return Object.keys(hl).filter(k=>hl[k]>0).sort();}),["biceps","lats","reardelt","traps"]);
},{prefs:{palette:"red"}});
await test("Live figure: it takes the theme — light mode lights the stage, Sage and Blue have no red",async page=>{
  await page.evaluate(async()=>{(await import("/js/ui/actions.js")).openSheet("exdetail",{name:"Machine Chest Press"});});await pause(page,600);
  await waitLive(page);
  const dark=await probe(page);
  await page.evaluate(async()=>{const S=(await import("/js/state.js")).S;S.theme="light";(await import("/js/ui/render.js")).render();});await pause(page,400);
  eq((await mq(page))[0].look,"red|light","it saw the change");
  const light=await probe(page);
  if(!(light.mean[0]>dark.mean[0]+80))throw new Error("the stage did not lighten: "+JSON.stringify([dark.mean,light.mean]));
  if(!(light.red>.001))throw new Error("light mode lost the red: "+JSON.stringify(light));
  await page.evaluate(async()=>{const S=(await import("/js/state.js")).S;S.theme="dark";S.prefs.palette="mono";(await import("/js/ui/render.js")).render();});await pause(page,400);
  eq((await mq(page))[0].look,"mono|dark");
  const mono=await probe(page);
  eq(mono.red,0,"no red in Sage");
  await page.evaluate(async()=>{const S=(await import("/js/state.js")).S;S.prefs.palette="blue";(await import("/js/ui/render.js")).render();});await pause(page,400);
  const blue=await probe(page);
  eq(blue.red,0,"Blue lights the muscles in its own colour");
},{prefs:{palette:"red"}});
/* The figure is off the workout screen (workout-spec.md): it lives behind ⓘ, in the
   exercise sheet, where it turns under a finger. */
await test("Live figure: the workout shows none; ⓘ opens the exercise sheet, where it moves and turns",async page=>{
  await startWorkout(page);
  await page.evaluate(async()=>{const S=(await import("/js/state.js")).S,V=(await import("/js/ui/view.js")).V;S.active.entries[V.logIdx].name="Machine Chest Press";(await import("/js/ui/render.js")).render();});await pause(page,600);
  eq(await page.$$eval("#app .fig3d,#app .formvis",a=>a.length),0,"no figure or photos on the workout");
  await page.tap('.wexl [data-exdetail]');await pause(page,600);
  await waitLive(page);
  eq(await page.$eval("#sheet .fig3d",e=>[e.hasAttribute("data-live"),e.hasAttribute("data-mq-turn"),e.getAttribute("data-mq")]),[true,true,"Machine Chest Press"]);
});
await test("Live figure: the library's exercises are drawn by their movement's family — a Barbell Curl in the sheet",async page=>{
  await page.evaluate(async()=>{(await import("/js/ui/actions.js")).openSheet("exdetail",{name:"Barbell Curl"});});await pause(page,600);
  const s=await waitLive(page);
  eq([s.length,s[0].live,s[0].err],[1,true,""],"one live figure");
  eq(await page.$eval("#sheet .fig3d",e=>[e.getAttribute("data-mq"),e.hasAttribute("data-mq-turn")]),["Barbell Curl",true]);
  /* its stills, where it cannot draw, are the library's own photographs */
  eq(await page.$$eval("#sheet .fig3d-still img",a=>a.map(i=>/Barbell_Curl\/[01]\.jpg$/.test(i.getAttribute("src")))),[true,true]);
  const pr=await probe(page);
  const off=await page.evaluate(async()=>{const m=(await import("/js/ui/mannequin.js")).mannequins()[0];m.setHL({});return m.probe();});
  if(!(pr.red>off.red+.001))throw new Error("no lit muscle: "+JSON.stringify([pr.red,off.red]));
  eq(await page.evaluate(async()=>{const R=await import("/js/data/mannequin/rig.js"),E=await import("/js/data/exercises.js"),C=await import("/js/data/mannequin/records.js");
    const n="Barbell Curl",hl=R.highlight(E.muscleOf(n),E.secondaryOf(n),C.recordFor(n).refine);return Object.keys(hl).sort();}),["biceps","forearms"],"the library's muscles");
  /* an exercise the families do not draw yet keeps its photographs */
  await page.evaluate(async()=>{(await import("/js/ui/actions.js")).openSheet("exdetail",{name:"Atlas Stones"});});await pause(page,500);
  eq([(await mq(page)).length,await page.$$eval("#sheet .exd-form2 img",a=>a.length)],[0,2]);
},{prefs:{palette:"red"}});
await test("Live figure: a phone without WebGL2 keeps the start and end stills",async page=>{
  await page.evaluate(async()=>{(await import("/js/ui/actions.js")).openSheet("exdetail",{name:"Machine Chest Press"});});await pause(page,800);
  eq((await mq(page)).length,0,"nothing started");
  const st=await page.$eval("#sheet .fig3d",e=>{const s=e.querySelector(".fig3d-still");
    return [e.hasAttribute("data-live"),getComputedStyle(e.querySelector("canvas")).display,getComputedStyle(s).display,[...s.querySelectorAll("img")].map(i=>i.naturalWidth)];});
  eq(st,[false,"none","grid",[720,720]]);
},{init:()=>{try{delete window.WebGL2RenderingContext;}catch(e){}}});
await test("Live figure: the two pilot exercises have their drawn stills and list thumbnails (the library's fall back to their photographs)",async page=>{
  eq(await page.evaluate(async()=>{const F=(await import("/js/data/figures.js")).FIGS,out=[];
    for(const id in F){const u=["img/ex/"+id+".webp"];for(let i=0;i<F[id];i++)u.push("img/fig/"+id+"-"+i+".webp");
      for(const x of u){const r=await fetch(x);if(!r.ok)out.push(x);}}return [F,out];}),
    [{"bn_machine_chest_press":2,"bn_seated_machine_row":2},[]]);
  const bg=await page.evaluate(async()=>{const E=await import("/js/data/exercises.js"),d=document.createElement("div");d.innerHTML=E.thumb("Machine Chest Press",52);document.body.appendChild(d);
    const i=d.querySelector("img");const r=[i.getAttribute("src"),i.classList.contains("fig"),getComputedStyle(i).backgroundColor];d.remove();return r;});
  eq(bg.slice(0,2),["img/ex/bn_machine_chest_press.webp",true]);
  if(bg[2]==="rgb(255, 255, 255)")throw new Error("a figure thumbnail on white");
});
console.log("\n"+passes+" passed, "+fails+" failed");
await browser.close();
process.exit(fails);

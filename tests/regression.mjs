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
  const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,serviceWorkers:o.sw?"allow":"block"});
  const db=o.db||seed();if(o.prefs)Object.assign(db.prefs,o.prefs);
  await ctx.addInitScript(([db,raw])=>{if(!localStorage.getItem("t:seeded")){
    localStorage.setItem("bunyan:profiles",JSON.stringify([{id:"me",name:"Me",owner:true}]));
    localStorage.setItem("bunyan:current",'"me"');
    localStorage.setItem("bunyan:db:me",raw!=null?raw:JSON.stringify(db));localStorage.setItem("t:seeded","1");}},[db,o.raw==null?null:o.raw]);
  if(o.blockIDB)await ctx.addInitScript(()=>{try{Object.defineProperty(window,"indexedDB",{get(){return {open(){throw new Error("blocked");}};}});}catch(e){}});
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
  const b=await (await page.$('nav [data-tab="'+tab+'"]')).boundingBox();
  if(!b||b.y>=page.viewportSize().height)throw new Error("the dock is out of view");
  await page.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);await page.waitForTimeout(60);}
async function startWorkout(page){await tapTab(page,"train");await pause(page);await page.tap('[data-startday]');await pause(page,400);}
/* ONLY=<text> runs just the tests whose names contain it. */
const ONLY=process.env.ONLY||"";
async function test(name,fn,o){
  if(ONLY&&name.indexOf(ONLY)<0)return;
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
  await page.tap('[data-rmlive]');await pause(page);
  eq(await ev(page,"S.active.entries.map(e=>e.name)"),before.slice(1),"removed at once");
  await page.tap('.toast-undo');await pause(page);
  eq(await ev(page,"S.active.entries.map(e=>e.name)"),before,"Undo puts it back");
  await page.fill('#in_r','8');await page.tap('[data-logset]');await pause(page,900);
  await page.tap('[data-rmlive]');await pause(page);
  if(!(await page.$('#sheet .cf.bad')))throw new Error("no red confirm for an exercise with sets");
  await page.tap('#sheet [data-confirmok]');await pause(page);
  eq(await ev(page,"[S.active.entries.length,S.active.entries[0].name,V.logIdx]"),[before.length-1,before[1],0],"removed with its set");
  eq(await page.evaluate(async()=>{const m=await import("/js/state.js");return m.dayOf(m.S.active.dayId).ex.length;}),planned,"the program is untouched");
  /* The last one standing cannot be removed: that is Discard. */
  for(let i=0;i<before.length-2;i++){await page.tap('[data-rmlive]');await pause(page);}
  eq(await ev(page,"S.active.entries.length"),1);
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
  await startWorkout(page);await page.tap('[data-sessmore]');await pause(page);await page.tap('#sheet [data-finish]');await pause(page);
  eq(await ev(page,"[V.sheet,!!S.active]"),["confirm",true]);
},{prefs:{autorest:false}});
await test("a corrupted save is kept aside, not overwritten",async page=>{
  const keys=await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.indexOf(":corrupt:")>0).length);
  eq(keys,1);
},{raw:'{"v":2,"onboarded":true,"profile":{"age":30'});
await test("a partial save does not crash rendering",async page=>{
  for(const tab of ["food","progress","train","profile","home"]){await tapTab(page,tab);await pause(page,200);}
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
    const P=(await import("/js/data/splits.js")).PRESETS().filter(p=>p.id==="fb")[0];s.addProgram(s.makeProgram(P),true);
    const a=s.split().days[0];s.S.sessions.unshift({id:"t",date:(await import("/js/util.js")).today(),dayId:a.id,dayName:a.name,entries:[]});
    const d=new Date();d.setDate(d.getDate()+1);const tom=new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);
    return T.planOn(s.split(),tom).rest;});
  eq(r,true);
});

await test("tab taps do not grow the browser history",async page=>{
  const h0=await page.evaluate(()=>history.length);
  for(let i=0;i<10;i++){await tapTab(page,"train");await page.tap('[data-tsec="explore"]');await page.tap('[data-train="library"]');await tapTab(page,"home");}
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
  await page.tap('[data-hurt]');await pause(page);await page.tap('[data-hurtdo="skip"]');await pause(page);
  await page.fill('#in_r','8');await page.tap('[data-logset]');await pause(page,900);
  await page.tap('[data-sessmore]');await pause(page);await page.tap('#sheet [data-finish]');await pause(page);
  await page.tap('[data-confirmok]');await pause(page,600);
  await page.tap('[data-srpe="7"]');await pause(page);
  eq(await ev(page,"[S.sessions[0].ready,S.sessions[0].srpe,S.sessions[0].entries.some(e=>e.pain)]"),[4,7,true]);
},{prefs:{autorest:false}});
await test("an activity logs pace inputs and heart rate",async page=>{
  await tapTab(page,"train");await pause(page);
  await page.tap('[data-actsheet]');await pause(page);await page.tap('#sheet [data-quickact="Running"]');await pause(page,500);
  await page.fill('#in_min','30');await page.fill('#in_km','6');await page.fill('#in_hr','150');
  await page.evaluate(()=>document.activeElement.blur());
  await page.$eval('[data-logact]',e=>e.scrollIntoView({block:"center"}));
  await page.$eval('[data-logact]',e=>e.click());await pause(page);
  eq(await ev(page,"[S.active.entries[0].sets[0].min,S.active.entries[0].sets[0].km,S.active.entries[0].sets[0].hr]"),[30,6,150]);
  if(!/5:00 \/km/.test(await page.$eval('.act-row',e=>e.innerText)))throw new Error("pace not shown");
});

/* ---- the day builder and the picker ---------------------------------------------- */
async function openDay(page){
  await tapTab(page,"train");await pause(page);
  await page.tap('[data-tsec="program"]');await pause(page);
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
  await tapTab(page,"train");await pause(page);
  await page.evaluate(async()=>{const {V}=await import("/js/ui/view.js");const {render}=await import("/js/ui/render.js");V.train="splits";render();});await pause(page);
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
  await page.evaluate(async()=>{const {V}=await import("/js/ui/view.js");const {render}=await import("/js/ui/render.js");V.train="splits";render();});await pause(page);
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
await test("missing the range twice suggests about 10% lighter",async page=>{
  const r=await F(page,`(S.sessions=[mk("2099-01-05","Barbell Squat",[{w:100,r:6},{w:100,r:5}]),mk("2099-01-02","Barbell Squat",[{w:100,r:7}])],
    F.recommend({name:"Barbell Squat",planned:{sets:3,lo:8,hi:10}}).w)`);
  eq(r,90);
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
  if(!/Lighter week/.test(await page.textContent(".ex-tags")))throw new Error("no lighter-week tag");
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
  const r=await page.evaluate(async()=>{const s=await import("/js/state.js");const T=await import("/js/ui/views/train.js");const Sc=await import("/js/engine/schedule.js");
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
  await page.evaluate(async()=>{const {V}=await import("/js/ui/view.js");const {render}=await import("/js/ui/render.js");V.train="preview";V.previewId="ppl";render();});await pause(page);
  await page.tap('[data-adopt]');await pause(page);await page.tap('[data-confirmalt]');await pause(page,400);
  eq(await ev(page,"[S.activeProgram,S.programs.filter(p=>p.from==='ppl').length,V.train]"),[act0,1,"builder"],"added, not active");
  await page.evaluate(async()=>{const {V}=await import("/js/ui/view.js");const {render}=await import("/js/ui/render.js");V.train="preview";V.previewId="ul";render();});await pause(page);
  await page.tap('[data-adopt]');await pause(page);await page.tap('[data-confirmok]');await pause(page,400);
  eq(await ev(page,"S.programs.find(p=>p.id===S.activeProgram).from"),"ul","active copy of the template");
});
await test("builder: switching to weekdays pins the days, and weekday chips move a pin",async page=>{
  await page.evaluate(async()=>{const {V}=await import("/js/ui/view.js");const {render}=await import("/js/ui/render.js");const s=await import("/js/state.js");
    V.tab="train";V.train="builder";V.previewId=s.S.activeProgram;render();});await pause(page);
  await page.tap('[data-sched="week"]');await pause(page);
  const pinned=await ev(page,"S.programs.find(p=>p.id===S.activeProgram).days.filter(d=>d.ex.length).every(d=>d.wd.length===1)");
  eq(pinned,true,"each training day pinned");
  const first=await page.$eval('.bkday .bwd button:not(.on)',b=>b.getAttribute("data-wd"));
  await page.tap('[data-wd="'+first+'"]');await pause(page);
  const [id,n]=first.split("|");
  eq(await ev(page,"(function(){var p=S.programs.find(p=>p.id===S.activeProgram);return p.days.filter(d=>d.wd.indexOf("+n+")>=0).map(d=>d.id)})()"),[id],"weekday belongs to one day");
});
await test("a rotation program is offered weekdays once",async page=>{
  await tapTab(page,"train");await pause(page);
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

/* ---- the Train tab: Today · My Program · Explore, and the workout bar -------------- */
await test("Train sections switch, are remembered after a reload, and a Train tap at the top goes to Today",async page=>{
  await tapTab(page,"train");await pause(page);
  if(!(await page.$('.twk'))||!(await page.$('[data-startday]')))throw new Error("Today has no week strip or start");
  await page.tap('[data-tsec="program"]');await pause(page);
  if(!(await page.$('.bsched'))||!(await page.$('.drows [data-day]')))throw new Error("My Program is not the builder");
  await page.reload();await pause(page,1000);
  await tapTab(page,"train");await pause(page);
  eq(await ev(page,"[V.tsec,!!document.querySelector('.bsched')]"),["program",true],"remembered");
  await tapTab(page,"train");await pause(page);
  eq(await ev(page,"[V.tsec,S.prefs.tsec,!!document.querySelector('.twk')]"),["today","today",true],"tap at the top");
});
await test("Back goes up one level: a day to My Program, a template to Explore",async page=>{
  await tapTab(page,"train");await pause(page);
  await page.tap('[data-tsec="program"]');await pause(page);
  await page.tap('.drows [data-day]');await pause(page,400);
  eq(await ev(page,"V.train"),"day");
  await page.tap('[data-back]');await pause(page,500);
  eq(await ev(page,"[V.train,V.tsec,!!document.querySelector('.bsched')]"),["days","program",true],"day → My Program");
  await page.tap('[data-tsec="explore"]');await pause(page);
  await page.tap('.tprog-card[data-preview]');await pause(page,400);
  eq(await ev(page,"V.train"),"preview");
  await page.tap('[data-back]');await pause(page,500);
  eq(await ev(page,"[V.train,V.tsec,!!document.querySelector('.tprog-card')]"),["days","explore",true],"template → Explore");
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
await test("My Program edits the active program in place",async page=>{
  await tapTab(page,"train");await pause(page);
  await page.tap('[data-tsec="program"]');await pause(page);
  const n=await ev(page,"S.programs.find(p=>p.id===S.activeProgram).days.length");
  await page.tap('.dadd[data-bday]');await pause(page);
  eq(await ev(page,"[S.programs.find(p=>p.id===S.activeProgram).days.length,V.train,V.tsec]"),[n+1,"days","program"]);
});
await test("workout bar: the clock on other tabs, rest counts down there, rest over, and back to the workout",async page=>{
  await startWorkout(page);
  eq(await page.$eval('#wbar',e=>!e.firstChild),true,"not on Train");
  await tapTab(page,"home");await pause(page,1200);
  if(!/Workout/i.test(await page.$eval('#wbar',e=>e.innerText)))throw new Error("no bar on Home");
  eq(await ev(page,"document.body.classList.contains('wb')"),true);
  await page.tap('#wbar .wbar');await pause(page,500);
  eq(await ev(page,"[V.tab,!document.getElementById('wbar').firstChild]"),["train",true],"tap returns");
  await page.fill('#in_r','8');await page.tap('[data-logset]');await pause(page,900);
  await page.tap('[data-rest="hide"]');await pause(page);
  await tapTab(page,"food");await pause(page,1200);
  eq(await page.$eval('#rest',e=>!e.firstChild),true,"no full-screen rest on Food");
  if(!/Rest/i.test(await page.$eval('#wbar',e=>e.innerText))||!/\d:\d\d/.test(await page.$eval('#wbarT',e=>e.textContent)))throw new Error("no rest countdown");
  await page.evaluate(async()=>{(await import("/js/ui/view.js")).V.restEnd=Date.now()+1000;});await pause(page,2500);
  eq(await page.$eval('#wbar .wbar',e=>e.classList.contains("done")),true,"rest over");
  await page.tap('#wbar .wbar');await pause(page,500);
  eq(await ev(page,"[V.tab,V.restDone,!!document.getElementById('rest').firstChild]"),["train",true,true],"rest-over screen on return");
},{prefs:{autorest:true}});

/* ---- the week, and Food in three sections -------------------------------------------- */
await test("the week starts on Saturday everywhere, and the setting moves it",async page=>{
  const r=await page.evaluate(async()=>{const sc=await import("/js/engine/schedule.js");const st=await import("/js/engine/stats.js");const u=await import("/js/util.js");
    const f=sc.weekStartOf(u.today());return [sc.isoWeekday(f),sc.weekDates(u.today()).length,st.weeklyVolume().from===f,sc.spreadWd(3),sc.weekOrder()[6]];});
  eq(r,[6,7,true,[6,1,3],5],"Saturday first, Friday last and free");
  await tapTab(page,"train");await pause(page);
  eq(await page.evaluate(async()=>{const sc=await import("/js/engine/schedule.js");return sc.isoWeekday(document.querySelector('.twk-d').getAttribute('data-tweek'));}),6,"strip opens on Saturday");
  await tapTab(page,"profile");await pause(page);await page.tap('[data-sheet="set_app"]');await pause(page);
  await page.tap('[data-wkstart]');await pause(page);
  eq(await ev(page,"S.prefs.wkstart"),7,"then Sunday");
  eq(await page.evaluate(async()=>{const sc=await import("/js/engine/schedule.js");const u=await import("/js/util.js");return sc.isoWeekday(sc.weekStartOf(u.today()));}),7);
});
await test("Food sections switch, are remembered, and a Food tap at the top returns to Today",async page=>{
  await tapTab(page,"food");await pause(page);
  if(!(await page.$('.fsum'))||!(await page.$('.fwater-art')))throw new Error("Today is not the dashboard");
  if(await page.$('[data-quickfood].pill'))throw new Error("frequent pills still on the page");
  await page.tap('[data-fsec="targets"]');await pause(page);
  if(!(await page.$('#g_kcal'))||!(await page.$('.tghero .art-gauge')))throw new Error("Targets has no inline goals");
  await page.reload();await pause(page,1000);
  await tapTab(page,"food");await pause(page);
  eq(await ev(page,"[V.fsec,!!document.getElementById('g_kcal')]"),["targets",true],"remembered");
  await tapTab(page,"food");await pause(page);
  eq(await ev(page,"[V.fsec,S.prefs.fsec,!!document.querySelector('.fsum')]"),["today","today",true],"tap at the top");
});
await test("My Foods: build a meal from search, log it whole, and ✕ removes it with Undo",async page=>{
  await tapTab(page,"food");await pause(page);
  await page.tap('[data-fsec="foods"]');await pause(page);
  await page.tap('[data-newmeal]');await pause(page);await page.fill('#askv','Ful breakfast');await page.tap('[data-askok]');await pause(page,400);
  const id=await ev(page,"V.smeal");if(!id)throw new Error("no meal screen");
  await page.tap('[data-smadd]');await pause(page,1200);
  eq(await ev(page,"[V.sheet,V.sd.into]"),["addfood",id],"sheet adds into the meal");
  await page.fill('#fq','ful');await pause(page,900);
  await page.evaluate(()=>document.activeElement.blur());await pause(page,200);
  await page.tap('#sheet .afadd');await pause(page,500);
  eq(await ev(page,"[S.savedMeals.find(m=>m.id==='"+id+"').items.length,V.sheet,V.smeal]"),[1,null,id],"into the meal, back on its screen");
  await page.tap('.dcta [data-addsaved]');await pause(page,400);
  eq(await page.evaluate(async()=>{const s=await import("/js/state.js");const u=await import("/js/util.js");
    return Object.values(s.dayRec(u.today()).meals).reduce((n,m)=>n+m.items.length,0)>0;}),true,"logged whole");
  await page.tap('[data-back]');await pause(page,500);
  eq(await ev(page,"[V.fsec,V.smeal]"),["foods",null],"back to My Foods");
  await page.tap('[data-rmsaved="'+id+'"]');await pause(page);
  eq(await ev(page,"S.savedMeals.length"),0,"removed");
  await page.tap('.toast-undo');await pause(page);
  eq(await ev(page,"S.savedMeals.length"),1,"undo");
});
await test("your own food: edited in My Foods, blank calories come from the macros, ✕ with Undo",async page=>{
  await tapTab(page,"food");await pause(page);
  await page.tap('[data-fsec="foods"]');await pause(page);
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
  await tapTab(page,"food");await pause(page);
  await page.tap('[data-fsec="targets"]');await pause(page);
  await page.fill('#g_kcal','2222');await page.tap('[data-savegoals]');await pause(page);
  eq(await ev(page,"S.goals.kcal"),2222);
  await page.tap('[data-usesug]');await pause(page);
  eq(await page.evaluate(async()=>{const s=await import("/js/state.js");const f=await import("/js/engine/formulas.js");
    return s.S.goals.kcal===Math.round(f.targetKcal()/10)*10&&s.S.goals.kcal!==2222;}),true,"suggested applied");
  if(!(await page.$('.pgadh'))&&!(await page.$('.empty')))throw new Error("no eating trends");
  await tapTab(page,"progress");await pause(page);
  eq(await page.$$eval('[data-ptab]',a=>a.map(b=>b.getAttribute("data-ptab")).filter((v,i,x)=>x.indexOf(v)===i).sort()),["body","overview","strength"]);
});

/* ---- Home, Progress, Profile ------------------------------------------------------------ */
await test("Home: one reminder at most, Train's card, water adds and takes back, and the Saturday week",async page=>{
  eq(await page.$$eval('.hnote',a=>a.length)<=1,true,"one reminder");
  if(!(await page.$('.hstack .thero2 [data-startday]')))throw new Error("no Next up card");
  const w0=await page.evaluate(async()=>{const s=await import("/js/state.js");const u=await import("/js/util.js");return s.dayRec(u.today()).water;});
  /* The tile is split: the bottom half adds a glass, the top half takes one back. */
  await page.tap('.htile.water .hsplit-bot');await pause(page);
  const w1=await page.evaluate(async()=>{const s=await import("/js/state.js");const u=await import("/js/util.js");return s.dayRec(u.today()).water;});
  if(!(w1>w0))throw new Error("water tile did not add");
  await page.tap('.htile.water .hsplit-top');await pause(page);
  eq(await page.evaluate(async()=>{const s=await import("/js/state.js");const u=await import("/js/util.js");return s.dayRec(u.today()).water;}),w0,"the top half takes the glass back");
  await page.tap('.htile.water .hsplit-bot');await pause(page);
  eq(await page.evaluate(async()=>{const sc=await import("/js/engine/schedule.js");return sc.isoWeekday(document.querySelector('.hstack .twk-d').getAttribute('data-openday'));}),6);
  await page.tap('.htile.kcal');await pause(page);
  eq(await ev(page,"[V.tab,V.fsec]"),["food","today"]);
});
await test("Home shows the workout in progress in the same card, with Resume",async page=>{
  await startWorkout(page);
  await tapTab(page,"home");await pause(page);
  if(!(await page.$('.hstack .thero2 [data-continue]')))throw new Error("no resume card");
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
await test("Arabic: the dock keeps its order, dates are Arabic, figures stay one run",async page=>{
  const r=await page.evaluate(()=>{
    const b=[...document.querySelectorAll("nav .dock-b")].map(x=>x.getBoundingClientRect().left);
    const tabs=[...document.querySelectorAll("nav .dock-b")].map(x=>x.getAttribute("data-tab"));
    return {dir:document.documentElement.dir,dock:getComputedStyle(document.querySelector(".dock")).direction,
      leftToRight:b.every((x,i)=>!i||x>b[i-1]),first:tabs[0],
      date:document.querySelector(".hdate").textContent,
      runs:[...document.querySelectorAll('#app bdi[dir="ltr"]')].map(x=>x.textContent)};});
  eq([r.dir,r.dock,r.leftToRight,r.first],["rtl","ltr",true,"home"],"dock");
  if(!/[\u0600-\u06FF]/.test(r.date)||/[A-Za-z]/.test(r.date))throw new Error("date not Arabic: "+r.date);
  if(/[\u0660-\u0669]/.test(r.date))throw new Error("Arabic-Indic digits in date: "+r.date);
  if(!r.runs.some(x=>/^\d[\d,]* \/ \d/.test(x)))throw new Error("no isolated fraction among "+JSON.stringify(r.runs));
},{prefs:{lang:"ar"}});
await test("Arabic: template program and day names are shown in Arabic, fractions keep their slash",async page=>{
  await tapTab(page,"train");await pause(page);await page.tap('[data-tsec="program"]');await pause(page,400);
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
await test("Light: the active dock icon reads on the dark dock",async page=>{
  const c=await page.$eval('nav .dock-b.on',e=>getComputedStyle(e).color);
  eq(c,"rgb(255, 92, 102)");
},{db:Object.assign(seed(),{theme:"light"})});
await test("Train Today's recovery check-in logs in taps; Profile has moved its plan and recovery rows",async page=>{
  await tapTab(page,"train");await pause(page);
  await page.tap('[data-rchk="sleep|7.5"]');await page.tap('[data-rchk="sore|5"]');await page.tap('[data-rchk="energy|9"]');await pause(page);
  eq(await page.evaluate(async()=>{const s=await import("/js/state.js");const u=await import("/js/util.js");const r=s.dayRec(u.today());return [r.sleep,r.sore,r.energy];}),[7.5,5,9]);
  if(await page.$('.rchk'))throw new Error("check-in still showing");
  await page.tap('[data-tsec="explore"]');await pause(page);
  if(!(await page.$('.bauto[data-setup]')))throw new Error("no Let Bunyan build it");
  await tapTab(page,"profile");await pause(page);
  eq(await page.$$eval('#app [data-setup],#app [data-sheet="recovery"]',a=>a.length),0);
  if(!(await page.$('.pring')))throw new Error("no ring");
});
/* ---- the name dialog, meals of your own, and a plan ------------------------------------- */
await test("Name prompt: a rounded dialog with no Name label; a tap outside lowers the keyboard before it closes",async page=>{
  await tapTab(page,"train");await pause(page);
  await page.tap('[data-tsec="explore"]');await pause(page);
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
  await tapTab(page,"food");await pause(page);
  await page.tap('[data-fsec="plan"]');await pause(page);
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
  await page.tap('[data-fsec="today"]');await pause(page);
  eq(await page.$$eval('.fmt-c .fmt-n',a=>a.map(x=>x.textContent)),["Meal 1","Lunch at work","Meal 3","Pre-workout","Meal 5"],"Today's tiles");
});
await test("Plan import: pasted text becomes meals with foods; an unmatched line waits with Find; the plan logs in one tap",async page=>{
  await tapTab(page,"food");await pause(page);
  await page.tap('[data-fsec="plan"]');await pause(page);
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
/* ---- themes: BUNYAN Red, BUNYAN Pink, Monochrome, each dark and light ------------------- */
await test("Themes: the picker switches the whole app, and the choice outlives a reload",async page=>{
  await tapTab(page,"profile");await pause(page);
  await page.tap('[data-sheet="set_app"]');await pause(page,400);
  eq(await page.$$eval('.thpick',a=>a.map(b=>b.getAttribute("data-settheme"))),["red","pink","mono"],"three themes");
  eq(await page.$eval('.thpick.on',e=>e.getAttribute("data-settheme")),"red","red by default");
  await page.tap('[data-settheme="pink"]');await pause(page,500);
  eq(await page.evaluate(()=>document.documentElement.getAttribute("data-palette")),"pink","html is pink");
  eq(await ev(page,"S.prefs.palette"),"pink","saved to the profile");
  eq(await page.evaluate(()=>getComputedStyle(document.body).getPropertyValue("--accent").trim().toUpperCase()),"#FF7FEC","Electric Pink is the accent");
  await page.tap('[data-lookmode="light"]');await pause(page,500);
  eq(await page.evaluate(()=>[document.documentElement.getAttribute("data-theme"),localStorage.getItem("bunyan:look")]),["light","pink|light"],"mode and the early copy");
  await page.reload();await page.waitForTimeout(60);
  eq(await page.evaluate(()=>[document.documentElement.getAttribute("data-palette"),document.documentElement.getAttribute("data-theme")]),["pink","light"],"applied before the app runs");
  await pause(page,1000);
  await tapTab(page,"profile");await pause(page);
  if(!(await page.$eval('[data-sheet="set_app"]',e=>e.textContent)).includes("BUNYAN Pink"))throw new Error("the Profile row does not name the theme");
  eq(await page.$eval('meta[name="theme-color"]',e=>e.content.toUpperCase()),"#FFF0FB","the status bar takes the theme's ground");
});
await test("Themes: every theme and mode uses its reference colours exactly",async page=>{
  const r=await page.evaluate(()=>{
    const de=document.documentElement,out={};
    for(const p of ["red","pink","mono"])for(const m of ["dark","light"]){
      de.setAttribute("data-palette",p);de.setAttribute("data-theme",m);
      const cs=getComputedStyle(de);out[p+"-"+m]=["--accent","--bg","--onAccent","--raised"].map(k=>cs.getPropertyValue(k).trim().toUpperCase());}
    return out;});
  eq(r["red-dark"][0],"#FF2E3A","Machine Red");eq(r["red-dark"][2],"#DBF6FF","Glacier Blue on red");
  eq(r["red-light"].slice(0,2),["#FF2E3A","#DBF6FF"],"Glacier Blue ground");
  eq([r["pink-dark"][0],r["pink-dark"][2],r["pink-dark"][3]],["#FF7FEC","#2E0F35","#2E0F35"],"Electric Pink on Dark Aubergine");
  eq(r["mono-dark"].slice(0,3),["#D7FFE0","#050505","#050505"],"Ghost Green on Zero Black");
  eq(r["mono-light"].slice(0,3),["#050505","#D7FFE0","#D7FFE0"],"Zero Black on Ghost Green");
});
await test("Themes: a delete asks in red whatever the theme",async page=>{
  await tapTab(page,"train");await pause(page);
  await page.tap('[data-tsec="program"]');await pause(page);
  await page.$$eval('.drows [data-day]',a=>a[0].click());await pause(page,400);
  await page.$eval('[data-delday]',e=>e.click());await pause(page,500);
  const bg=await page.$eval('.cf.bad .cf-ok',e=>getComputedStyle(e).backgroundImage);
  if(!/229, 50, 62/.test(bg))throw new Error("delete is not red: "+bg);
},{prefs:{palette:"pink"}});
await test("Themes: the rest screen stays dark in light mode, with readable figures",async page=>{
  await startWorkout(page);await page.fill('#in_r','8');await page.tap('[data-logset]');await pause(page,900);
  const r=await page.evaluate(()=>{const v=document.querySelector("#rest .rt-next-v");
    return v?getComputedStyle(v).color:null;});
  eq(r,"rgb(215, 255, 224)","Ghost Green on the dark rest screen");
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
  await tapTab(page,"train");await pause(page);await page.tap('[data-tsec="explore"]');await pause(page);
  const y0=await page.evaluate(()=>{const e=[...document.querySelectorAll("[data-preview]")].pop();e.scrollIntoView({block:"center"});return Math.round(scrollY);});
  if(y0<100)throw new Error("Explore too short to test");
  await page.evaluate(()=>[...document.querySelectorAll("[data-preview]")].pop().click());await pause(page,500);
  eq(await ev(page,"V.train"),"preview");
  await page.evaluate(()=>window.scrollTo(0,200));await pause(page);
  await page.evaluate(async()=>{(await import("/js/ui/nav.js")).goBack();});await pause(page,600);
  eq([await ev(page,"V.train"),await page.evaluate(()=>Math.round(scrollY))],["days",y0],"back to the same place");
  await page.evaluate(()=>[...document.querySelectorAll("[data-preview]")].pop().click());await pause(page,500);
  await page.evaluate(()=>window.scrollTo(0,300));await pause(page);
  await tapTab(page,"progress");await pause(page,700);
  eq(await page.evaluate(()=>Math.round(scrollY)),0,"a tab opens at its top, not where the browser last saw it");
});
await test("PDF plan: meals, daily targets and supplements are read, reviewed and applied, and Undo puts it all back",async page=>{
  await tapTab(page,"food");await pause(page);await page.tap('[data-fsec="plan"]');await pause(page);
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
  await tapTab(page,"food");await pause(page);await page.tap('[data-fsec="plan"]');await pause(page);
  await page.tap('[data-pimport]');await pause(page);
  await page.setInputFiles("#pi_file",new URL("./fixtures/plan-sample.pdf",import.meta.url).pathname);
  for(let i=0;i<60&&!(await page.$(".picard"));i++)await pause(page,250);
  /* A meal renamed, a food dropped, an amount changed, a target changed. */
  await page.fill("#pm_n_0","Breakfast bowl");
  const dropped=await ev(page,"V.pparse[1].items[0].n");
  await page.evaluate(()=>document.querySelector('[data-pirm="1|0"]').click());await pause(page,200);
  eq(await ev(page,"V.pparse[1].items.map(i=>i.n).indexOf("+JSON.stringify(dropped)+")"),-1,"dropped");
  const k0=await ev(page,"V.pparse[0].items[0].kcal"),g0=await ev(page,"V.pparse[0].items[0].grams");
  await page.evaluate(()=>document.querySelector('[data-pigram="0|0"]').click());await pause(page,300);
  await page.fill("#askv",String(g0*2));await page.evaluate(()=>document.querySelector("[data-askok]").click());await pause(page,300);
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
  eq(await page.$eval(".setrow.hd",e=>e.innerText.indexOf("+KG")>-1),true,"the column says +KG");
  if(!(await page.$(".bwnote")))throw new Error("no note on what +KG means");
  await page.fill('#in_w','0');await page.fill('#in_r','9');await page.tap('[data-logset]');await pause(page,900);
  eq(await ev(page,"S.active.entries[S.active.entries.length-1].sets[0].w"),0,"logged as body weight alone");
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
  await page.tap('[data-exnav="1"]');await pause(page,400);eq(await idx(),1,"next arrow");
  await page.tap('[data-exnav="-1"]');await pause(page,400);eq(await idx(),0,"previous arrow");
  eq(await page.$eval('[data-exnav="-1"]',e=>e.disabled),true,"no previous at the first");
  await page.tap('[data-exlist]');await pause(page,400);
  eq(await page.$$eval("#sheet .exl-row",a=>a.length),await ev(page,"S.active.entries.length"),"the list has every exercise");
  await page.tap('#sheet [data-jumpl="2"]');await pause(page,400);eq([await idx(),await ev(page,"!!V.sheet")],[2,false],"list jump");
  await page.tap('[data-jump="1"]');await pause(page,400);eq(await idx(),1,"segment");
  /* Looking ahead does not end a rest. */
  await page.fill('#in_r','8');await page.tap('[data-logset]');await pause(page,900);
  await page.evaluate(async()=>{(await import("/js/ui/workout.js")).restControl("hide");});await pause(page,300);
  await page.tap('[data-exnav="1"]');await pause(page,400);
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
  await tapTab(page,"train");await pause(page,500);
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
  await page.evaluate(async()=>{const V=(await import("/js/ui/view.js")).V;V.tab="train";V.train="library";(await import("/js/ui/render.js")).render();});
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
  await page.evaluate(async()=>{const V=(await import("/js/ui/view.js")).V;V.train="library";(await import("/js/ui/render.js")).render();});
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
  await tapTab(page,"train");await pause(page);
  await page.evaluate(()=>document.querySelector('[data-tsec="explore"]').click());await pause(page,300);
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
  eq(await ev(page,"[V.tab,V.tsec]"),["train","program"],"lands on My Program");
  /* In a workout: week 1 leaves out what belongs to weeks 5–8; the plan's start
     weight and cue are there; the other choice is one tap. */
  await page.evaluate(async()=>{const S=(await import("/js/state.js")).S,p=S.programs.filter(x=>x.id===S.activeProgram)[0];(await import("/js/ui/actions.js")).startDay(p.days[1].id);});await pause(page,400);
  eq(await ev(page,"S.active.entries.map(e=>e.name).indexOf('Single-Leg Balance')"),-1,"not before week 5");
  await page.evaluate(async()=>{(await import("/js/ui/actions.js")).ACT.discard();});await pause(page,200);
  await page.evaluate(async()=>{const S=(await import("/js/state.js")).S,p=S.programs.filter(x=>x.id===S.activeProgram)[0];(await import("/js/ui/actions.js")).startDay(p.days[0].id);});await pause(page,400);
  eq(await ev(page,"[V.draft.w,S.active.entries[0].planned.note]"),[50,"Two warm-up sets first"],"start weight and cue");
  eq(await page.$eval(".ex-cue",e=>e.textContent),"Two warm-up sets first");
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
  if(!(await page.$('.wu'))||(await page.$('.setcard')))throw new Error("the warm-up is not the first screen");
  eq(await page.$$eval('.wu-rs',a=>a[0].textContent),"20 kg × 10","ramp starts with the bar");
  await page.tap('.wu [data-wutick]:not([data-wutick="wp"])');await pause(page);
  eq(await page.$eval('.wu [data-wutick]:not([data-wutick="wp"])',b=>b.getAttribute("aria-pressed")),"true","ticked");
  /* The pulse raiser's timer, shortened so the test does not wait four minutes. */
  await page.$eval('[data-hold="wp"]',b=>b.setAttribute("data-secs","1"));
  await page.tap('[data-hold="wp"]');await pause(page,300);
  eq(await page.$eval('[data-hold="wp"]',b=>b.classList.contains("run")),true,"counting");
  await pause(page,1200);
  eq(await ev(page,"[S.active.wuDone.wp,document.querySelector('.wu-pulse').classList.contains('did')]"),[1,true],"ticked when it ends");
  await page.tap('[data-wugo]');await pause(page);
  eq(await ev(page,"[S.active.warm,!!document.querySelector('.setcard'),!!document.querySelector('.wu')]"),[1,true,false],"started");
  await page.tap('[data-sessmore]');await pause(page);await page.tap('#sheet [data-wuopen]');await pause(page);
  if(!(await page.$('.wu')))throw new Error("the menu did not bring the warm-up back");
  await page.tap('[data-wuskip]');await pause(page);
  eq(await ev(page,"[S.active.warm,!!document.querySelector('.setcard')]"),[0,true],"back to the work");
},{prefs:{nowarm:false}});
await test("Cool-down: stretches for what was trained on Workout complete, timed, with the how-to one tap away; both switch off",async page=>{
  await startWorkout(page);
  await page.tap('[data-wuskip]');await pause(page);
  await page.fill('#in_r','8');await page.tap('[data-logset]');await pause(page,500);
  await page.tap('[data-sessmore]');await pause(page);await page.tap('#sheet [data-finish]');await pause(page);
  await page.tap('[data-confirmok]');await pause(page,600);
  const names=await page.$$eval('.cd .wu-n',a=>a.map(e=>e.textContent));
  if(!names.includes("Doorway Chest Stretch")||names.some(n=>/Quad|Hamstring|Calf|Pigeon/.test(n)))
    throw new Error("a bench set should end on upper-body stretches, got "+names.join(", "));
  await page.$eval('.cd [data-hold]',b=>b.setAttribute("data-secs","1"));
  await page.tap('.cd [data-hold]');await pause(page,1500);
  eq(await page.$eval('.cd .wu-row',r=>r.classList.contains("did")),true,"ticked when the hold ends");
  await page.tap('.cd .wu-ex');await pause(page,500);
  eq(await ev(page,"V.sheet"),"exdetail");
  await page.tap('[data-exback]');await pause(page,400);
  eq(await ev(page,"[V.sheet,!!document.querySelector('.cd .wu-row.did')]"),["done",true],"back to the summary, tick kept");
  await page.tap('#sheet .cf-ok');await pause(page);
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
  await page.tap('[data-sessmore]');await pause(page);await page.tap('#sheet [data-finish]');await pause(page);
  await page.tap('[data-confirmok]');await pause(page,600);
  eq(await ev(page,"[V.sheet,!!document.querySelector('.cd')]"),["done",false],"no cool-down when off");
},{prefs:{nowarm:false,autorest:false}});
await test("Arabic: the muscle Back reads ظهر, not the back button's رجوع",async page=>{
  await page.evaluate(async()=>{const V=(await import("/js/ui/view.js")).V;V.tab="train";V.train="library";V.exm="Back";(await import("/js/ui/render.js")).render();});
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
      out[g]=[Math.round((m.kcal-td)/td*100),Math.round(m.p/84*10)/10,Math.abs(m.p*4+m.c*4+m.f*9-m.kcal)<=30];}
    return out;});
  eq(r.lose[0],-20,"lose");eq(r.recomp[0]<0&&r.recomp[0]>-15,true,"recomp");eq(r.gain[0]>0&&r.gain[0]<=11,true,"gain");eq(r.maintain[0],0,"maintain");
  eq([r.lose[1],r.recomp[1],r.gain[1],r.endurance[1]],[2,2.2,1.8,1.6],"protein g/kg");
  eq(Object.values(r).every(x=>x[2]),true,"macros add up to the energy");
},{db:Object.assign(seed(),{body:[]})});
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
  await page.tap('[data-asm="avoid|nuts"]');await pause(page,150);
  await page.tap('[data-asnext]');await pause(page,150);await page.tap('[data-asnext]');await pause(page,800);
  if(!(await page.$('[data-asuse]')))throw new Error("no result screen");
  const shown=await page.$eval('.as-kcal b',e=>e.textContent.replace(/\D/g,""));
  await page.tap('[data-asuse]');await pause(page,500);
  eq(await ev(page,"[S.onboarded,S.profile.goal,S.profile.limits,String(S.goals.kcal),S.prefs.avoid,!!S.activeProgram]"),
    [true,"recomp",["back"],shown,["nuts"],true],"applied as shown");
  const prog=await ev(page,"S.activeProgram");
  await page.tap('.toast-undo');await pause(page,400);
  eq(await ev(page,"[S.onboarded,S.profile.goal,S.activeProgram===\""+prog+"\"]"),[false,"gain",false],"one Undo puts it all back");
  await page.tap('[data-asuse]');await pause(page,500);
  await page.tap('[data-asmeals]');await pause(page,1200);
  eq(await ev(page,"[V.tab,V.pimport,!!V.pgen,(V.pparse||[]).length]"),["food",true,true,4],"meal plan review");
  await page.tap('[data-puse]');await pause(page,500);
  eq(await ev(page,"S.mealSlots.length===4&&S.mealSlots.every(s=>(s.plan||[]).length>=2)"),true,"meals planned");
},{db:Object.assign(seed(),{onboarded:false})});
await test("Plan check: targets that work against the goal are found on Home, fixed with Undo, and kept as they are until the numbers change",async page=>{
  /* Building muscle on 2,500 kcal against about 2,550 maintenance, and 110 g of protein. */
  const card=await page.$eval('.pchome .pcf h3',e=>e.textContent);
  eq(card,"Your calories will not build muscle");
  eq(await ev(page,"S.goals.kcal"),2500);
  await page.tap('.pchome [data-pcfix]');await pause(page,300);
  const fixed=await ev(page,"[S.goals.kcal>2550,S.goals.p>=145]");
  eq(fixed,[true,true],"Use … kcal sets the targets for the goal");
  await page.tap('.toast-undo');await pause(page,300);
  eq(await ev(page,"[S.goals.kcal,S.goals.p]"),[2500,110],"Undo");
  /* Kept as it is: gone, and back once the numbers behind it change. */
  await page.tap('.pchome [data-pckeep]');await pause(page,300);
  eq(await page.$$eval('.pchome h3',a=>a.map(e=>e.textContent).includes("Your calories will not build muscle")),false,"kept");
  await page.evaluate(async()=>{const S=(await import("/js/state.js")).S;S.goals.kcal=2400;(await import("/js/ui/render.js")).render();});await pause(page,200);
  eq(await page.$eval('.pchome .pcf h3',e=>e.textContent),"Your calories will not build muscle","back when the numbers change");
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
  eq(await ev(page,"[V.tab,V.pimport,!!V.pgen]"),["food",true,true],"rebuild opens a generated plan");
  await page.tap('[data-puse]');await pause(page,300);
  eq(await page.evaluate(async()=>(await import("/js/engine/plancheck.js")).checkPlans().map(f=>f.id).includes("meals-off")),false,"fixed");
},{db:Object.assign(seed(),{goals:{kcal:2800,p:150,c:350,f:85,water:3000,steps:9000}})});
await test("Training import: a program pasted as text is read the same way",async page=>{
  await page.evaluate(async()=>{const V=(await import("/js/ui/view.js")).V;V.tab="train";V.train="import";V.tp=null;(await import("/js/ui/render.js")).render();});await pause(page,300);
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
  await tapTab(page,"home");await pause(page);
  const max=await page.evaluate(()=>document.documentElement.scrollHeight-innerHeight);
  if(max<=0||max>=290)throw new Error("Home is not a short page here ("+max+"px)");
  for(let i=0;i<12;i++){await page.evaluate(()=>window.scrollBy(0,15));await page.waitForTimeout(16);}
  await pause(page,650);
  eq(await page.evaluate(()=>document.getElementById("nav").classList.contains("dhid")),false);
},{prefs:{anim:true}});
await test("Dock: slides off scrolling down and back scrolling up, at the scroll's pace",async page=>{await dockTest(page,true);},{prefs:{anim:true}});
await test("Dock: with animations off it fades out and back instead",async page=>{await dockTest(page,false);});
await test("Dock: the workout bar takes the dock's place while it is away, and still opens the workout",async page=>{
  await startWorkout(page);await tapTab(page,"profile");await pause(page);
  const pos=()=>page.evaluate(()=>Math.round(document.querySelector("#wbar .wbar").getBoundingClientRect().bottom));
  const p0=await pos();
  for(let i=0;i<12;i++){await page.evaluate(()=>window.scrollBy(0,15));await page.waitForTimeout(16);}
  await pause(page,650);
  eq(await pos()-p0,64+8,"it drops by the dock's height and the gap");
  await page.tap("#wbar .wbar");await pause(page,500);
  eq(await ev(page,"V.tab"),"train");
},{prefs:{anim:true}});
console.log("\n"+passes+" passed, "+fails+" failed");
await browser.close();
process.exit(fails);

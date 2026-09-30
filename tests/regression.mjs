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
  if(o.blockIDB)await ctx.addInitScript(()=>{try{Object.defineProperty(window,"indexedDB",{get(){return {open(){throw new Error("blocked");}};}});}catch(e){}});
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
    const P=(await import("/js/data/splits.js")).PRESETS().filter(p=>p.id==="fb")[0];s.addProgram(s.makeProgram(P),true);
    const a=s.split().days[0];s.S.sessions.unshift({id:"t",date:(await import("/js/util.js")).today(),dayId:a.id,dayName:a.name,entries:[]});
    const d=new Date();d.setDate(d.getDate()+1);const tom=new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);
    return T.planOn(s.split(),tom).rest;});
  eq(r,true);
});

await test("tab taps do not grow the browser history",async page=>{
  const h0=await page.evaluate(()=>history.length);
  for(let i=0;i<10;i++){await page.tap('nav [data-tab="train"]');await page.tap('[data-train="library"]');await page.tap('nav [data-tab="home"]');}
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
  await page.tap('nav [data-tab="train"]');await pause(page);
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
  await page.tap('nav [data-tab="train"]');await pause(page);
  await page.tap('[data-mydays]');await pause(page);
  await page.tap('#sheet [data-day]');await pause(page,400);}
const dayNames=page=>page.$$eval(".drow .drow-n",a=>a.map(x=>x.textContent));
await test("day builder: ✕ removes with undo, the grip drags, arrow keys move",async page=>{
  await openDay(page);
  const n0=await dayNames(page);if(n0.length<3)throw new Error("seed day too short");
  await page.tap(".drow:nth-child(2) .drm");await pause(page);
  eq((await dayNames(page)).length,n0.length-1,"removed");
  await page.tap(".toast-undo");await pause(page);
  eq(await dayNames(page),n0,"undo restores order");
  const g=await (await page.$(".drow:nth-child(1) .dgrip")).boundingBox(),r3=await (await page.$(".drow:nth-child(3)")).boundingBox();
  await page.mouse.move(g.x+g.width/2,g.y+g.height/2);await page.mouse.down();
  for(let i=1;i<=8;i++){await page.mouse.move(g.x+g.width/2,g.y+g.height/2+(r3.y+r3.height/2+6-(g.y+g.height/2))*i/8);await pause(page,20);}
  await page.mouse.up();await pause(page);
  eq((await dayNames(page))[2],n0[0],"dragged to third");
  await page.focus(".drow:nth-child(3) .dgrip");await page.keyboard.press("ArrowUp");await pause(page);
  eq((await dayNames(page))[1],n0[0],"arrow key moved it up");
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
  await page.tap('nav [data-tab="train"]');await pause(page);
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
  await page.tap('nav [data-tab="train"]');await pause(page);
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
  await page.tap('nav [data-tab="train"]');await pause(page);
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
  await page.tap('nav [data-tab="train"]');await pause(page);
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
console.log("\n"+passes+" passed, "+fails+" failed");
await browser.close();
process.exit(fails);

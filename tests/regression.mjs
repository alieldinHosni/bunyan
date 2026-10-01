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
  for(let i=0;i<10;i++){await page.tap('nav [data-tab="train"]');await page.tap('[data-tsec="explore"]');await page.tap('[data-train="library"]');await page.tap('nav [data-tab="home"]');}
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

/* ---- the Train tab: Today · My Program · Explore, and the workout bar -------------- */
await test("Train sections switch, are remembered after a reload, and a Train tap at the top goes to Today",async page=>{
  await page.tap('nav [data-tab="train"]');await pause(page);
  if(!(await page.$('.twk'))||!(await page.$('[data-startday]')))throw new Error("Today has no week strip or start");
  await page.tap('[data-tsec="program"]');await pause(page);
  if(!(await page.$('.bsched'))||!(await page.$('.drows [data-day]')))throw new Error("My Program is not the builder");
  await page.reload();await pause(page,1000);
  await page.tap('nav [data-tab="train"]');await pause(page);
  eq(await ev(page,"[V.tsec,!!document.querySelector('.bsched')]"),["program",true],"remembered");
  await page.tap('nav [data-tab="train"]');await pause(page);
  eq(await ev(page,"[V.tsec,S.prefs.tsec,!!document.querySelector('.twk')]"),["today","today",true],"tap at the top");
});
await test("Back goes up one level: a day to My Program, a template to Explore",async page=>{
  await page.tap('nav [data-tab="train"]');await pause(page);
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
  await page.tap('nav [data-tab="train"]');await pause(page);
  eq(await page.$$eval('.twk-d',a=>a.length),7);
  const other=await page.$eval('.twk-d:not(.today)',b=>b.getAttribute("data-tweek"));
  await page.tap('.twk-d[data-tweek="'+other+'"]');await pause(page);
  eq(await ev(page,"[V.tdate,document.querySelector('.twk-d.sel').getAttribute('data-tweek')]"),[other,other]);
  await page.tap('.twk-d.today');await pause(page);
  eq(await ev(page,"V.tdate"),null);
});
await test("My Program edits the active program in place",async page=>{
  await page.tap('nav [data-tab="train"]');await pause(page);
  await page.tap('[data-tsec="program"]');await pause(page);
  const n=await ev(page,"S.programs.find(p=>p.id===S.activeProgram).days.length");
  await page.tap('.dadd[data-bday]');await pause(page);
  eq(await ev(page,"[S.programs.find(p=>p.id===S.activeProgram).days.length,V.train,V.tsec]"),[n+1,"days","program"]);
});
await test("workout bar: the clock on other tabs, rest counts down there, rest over, and back to the workout",async page=>{
  await startWorkout(page);
  eq(await page.$eval('#wbar',e=>!e.firstChild),true,"not on Train");
  await page.tap('nav [data-tab="home"]');await pause(page,1200);
  if(!/Workout/i.test(await page.$eval('#wbar',e=>e.innerText)))throw new Error("no bar on Home");
  eq(await ev(page,"document.body.classList.contains('wb')"),true);
  await page.tap('#wbar .wbar');await pause(page,500);
  eq(await ev(page,"[V.tab,!document.getElementById('wbar').firstChild]"),["train",true],"tap returns");
  await page.fill('#in_r','8');await page.tap('[data-logset]');await pause(page,900);
  await page.tap('[data-rest="hide"]');await pause(page);
  await page.tap('nav [data-tab="food"]');await pause(page,1200);
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
  await page.tap('nav [data-tab="train"]');await pause(page);
  eq(await page.evaluate(async()=>{const sc=await import("/js/engine/schedule.js");return sc.isoWeekday(document.querySelector('.twk-d').getAttribute('data-tweek'));}),6,"strip opens on Saturday");
  await page.tap('nav [data-tab="profile"]');await pause(page);await page.tap('[data-sheet="set_app"]');await pause(page);
  await page.tap('[data-wkstart]');await pause(page);
  eq(await ev(page,"S.prefs.wkstart"),7,"then Sunday");
  eq(await page.evaluate(async()=>{const sc=await import("/js/engine/schedule.js");const u=await import("/js/util.js");return sc.isoWeekday(sc.weekStartOf(u.today()));}),7);
});
await test("Food sections switch, are remembered, and a Food tap at the top returns to Today",async page=>{
  await page.tap('nav [data-tab="food"]');await pause(page);
  if(!(await page.$('.fsum'))||!(await page.$('.fwater-art')))throw new Error("Today is not the dashboard");
  if(await page.$('[data-quickfood].pill'))throw new Error("frequent pills still on the page");
  await page.tap('[data-fsec="targets"]');await pause(page);
  if(!(await page.$('#g_kcal'))||!(await page.$('.tghero .art-gauge')))throw new Error("Targets has no inline goals");
  await page.reload();await pause(page,1000);
  await page.tap('nav [data-tab="food"]');await pause(page);
  eq(await ev(page,"[V.fsec,!!document.getElementById('g_kcal')]"),["targets",true],"remembered");
  await page.tap('nav [data-tab="food"]');await pause(page);
  eq(await ev(page,"[V.fsec,S.prefs.fsec,!!document.querySelector('.fsum')]"),["today","today",true],"tap at the top");
});
await test("My Foods: build a meal from search, log it whole, and ✕ removes it with Undo",async page=>{
  await page.tap('nav [data-tab="food"]');await pause(page);
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
  await page.tap('nav [data-tab="food"]');await pause(page);
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
  await page.tap('nav [data-tab="food"]');await pause(page);
  await page.tap('[data-fsec="targets"]');await pause(page);
  await page.fill('#g_kcal','2222');await page.tap('[data-savegoals]');await pause(page);
  eq(await ev(page,"S.goals.kcal"),2222);
  await page.tap('[data-usesug]');await pause(page);
  eq(await page.evaluate(async()=>{const s=await import("/js/state.js");const f=await import("/js/engine/formulas.js");
    return s.S.goals.kcal===Math.round(f.targetKcal()/10)*10&&s.S.goals.kcal!==2222;}),true,"suggested applied");
  if(!(await page.$('.pgadh'))&&!(await page.$('.empty')))throw new Error("no eating trends");
  await page.tap('nav [data-tab="progress"]');await pause(page);
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
  await page.tap('nav [data-tab="home"]');await pause(page);
  if(!(await page.$('.hstack .thero2 [data-continue]')))throw new Error("no resume card");
});
await test("Progress: no date bar, History by month opens and Back returns",async page=>{
  await page.tap('nav [data-tab="progress"]');await pause(page);
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
  await page.tap('nav [data-tab="train"]');await pause(page);await page.tap('[data-tsec="program"]');await pause(page,400);
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
  eq(c,"rgb(255, 92, 106)");
},{db:Object.assign(seed(),{theme:"light"})});
await test("Train Today's recovery check-in logs in taps; Profile has moved its plan and recovery rows",async page=>{
  await page.tap('nav [data-tab="train"]');await pause(page);
  await page.tap('[data-rchk="sleep|7.5"]');await page.tap('[data-rchk="sore|5"]');await page.tap('[data-rchk="energy|9"]');await pause(page);
  eq(await page.evaluate(async()=>{const s=await import("/js/state.js");const u=await import("/js/util.js");const r=s.dayRec(u.today());return [r.sleep,r.sore,r.energy];}),[7.5,5,9]);
  if(await page.$('.rchk'))throw new Error("check-in still showing");
  await page.tap('[data-tsec="explore"]');await pause(page);
  if(!(await page.$('.bauto[data-setup]')))throw new Error("no Let Bunyan build it");
  await page.tap('nav [data-tab="profile"]');await pause(page);
  eq(await page.$$eval('#app [data-setup],#app [data-sheet="recovery"]',a=>a.length),0);
  if(!(await page.$('.pring')))throw new Error("no ring");
});
/* ---- the name dialog, meals of your own, and a plan ------------------------------------- */
await test("Name prompt: a rounded dialog with no Name label; a tap outside lowers the keyboard before it closes",async page=>{
  await page.tap('nav [data-tab="train"]');await pause(page);
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
  await page.tap('nav [data-tab="food"]');await pause(page,400);
  eq(await page.$$eval('.fmt-now',a=>a.length),0,"no Now");
  eq(await page.$eval('.btn.fadd',e=>e.getAttribute("data-addfood")),"Dinner","after Lunch comes Dinner");
});
await test("Plan: numbered meals, add and rename a meal, reorder them, and every name reaches Today",async page=>{
  await page.tap('nav [data-tab="food"]');await pause(page);
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
  await page.tap('nav [data-tab="food"]');await pause(page);
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
console.log("\n"+passes+" passed, "+fails+" failed");
await browser.close();
process.exit(fails);

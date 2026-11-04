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
/* Training's week rail to a day: a page of weeks forward or back if the day is not in the
   week shown, then the day itself. */
async function railTo(page,iso){
  for(let i=0;i<6&&!(await page.$('.wkr [data-wkday="'+iso+'"]'));i++){
    const first=await page.$eval('.wkr [data-wkday]',b=>b.getAttribute("data-wkday"));
    /* No arrows on screen (the row swipes); the screen reader's buttons page it. */
    await page.$eval('.wkr [data-wkpage="'+(iso<first?-1:1)+'"]',b=>b.click());await page.waitForTimeout(250);}
  await page.tap('.wkr [data-wkday="'+iso+'"]');await page.waitForTimeout(300);}
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
/* Planning lives in Training and Food now (3 Nov): sec "train" is Training's plan page,
   "food" Food's, anything else the Coach page. The way in is the tab's own card. */
async function coach(page,sec,sub){
  if(sec==="train"||sec==="food"){
    await tapTab(page,sec);await page.waitForTimeout(200);
    const attr=sec==="train"?"tplan":"fplan",first=sec==="train"?"program":"plan";
    const card=await page.$('#app [data-'+attr+'="'+first+'"]');
    if(card)await card.tap();
    else await page.evaluate(async([a,f])=>{const v=await import("/js/ui/view.js");if(a==="tplan"){v.V.train="plan";v.V.tplan=f;}else v.V.fplan=f;(await import("/js/ui/render.js")).render();},[attr,first]);
    await page.waitForTimeout(250);
    /* Exercises live under Programs since 3 Nov: that tab, at the library. */
    const ex=sec==="train"&&sub==="exercises";if(ex)sub="programs";
    /* My foods is a page one step in from the meal plan (3 Nov), reached from its list. */
    if(sec==="food"&&sub==="foods"){await page.tap('.dhead-a[data-sheet="set_meals"]');await page.waitForTimeout(400);await page.tap('#sheet [data-fplan="foods"]');await page.waitForTimeout(500);return;}
    if(sub&&sub!==first){await page.tap('.psecs [data-'+attr+'="'+sub+'"]');await page.waitForTimeout(250);}
    if(ex){await page.evaluate(()=>document.getElementById("pex").scrollIntoView({block:"start"}));await page.waitForTimeout(150);}
    return;}
  await tapTab(page,"coach");await page.waitForTimeout(200);}
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
await test("Complete set, with haptics: a label around a hidden native switch, one focusable control announced as a button; a tap, Enter or Space logs one set and leaves it off; haptics off is the plain button",async page=>{
  await startWorkout(page);await page.fill('#in_r','8');
  const shape=await page.evaluate(()=>{const l=document.querySelector('.sess [data-logset]'),i=l&&l.querySelector('input');
    return l?[l.tagName,i&&i.type,i&&i.hasAttribute("switch"),i&&i.getAttribute("role"),i&&i.getAttribute("aria-label"),
      [...l.querySelectorAll(":scope>span")].every(s=>s.getAttribute("aria-hidden")==="true"),getComputedStyle(i).position,l.querySelectorAll("button,[tabindex]").length]:null;});
  eq(shape,["LABEL","checkbox",true,"button","Complete set 1",true,"absolute",0],"the label, its hidden switch as the one control");
  const n=()=>ev(page,"S.active.entries[0].sets.length");
  const back=async()=>{await page.waitForSelector('.sess label[data-logset] input',{timeout:4000,state:"attached"});};
  await page.tap('.sess [data-logset]');await pause(page,300);
  eq([await n(),await page.evaluate(()=>{const i=document.querySelector('.sess .hapt-in');return i?i.checked:false;})],[1,false],"a tap logs one set; the switch is off again");
  await back();await page.fill('#in_r','8');
  await page.focus('.sess [data-logset] .hapt-in');await page.keyboard.press("Enter");await pause(page,300);
  eq(await n(),2,"Enter logs one");
  await back();
  /* Haptics off in Settings: the plain button, as before; back on, the switch again. */
  const hap=on=>page.evaluate(async v=>{const st=await import("/js/state.js");st.S.prefs.haptic=v;st.saveDB();(await import("/js/ui/render.js")).render();},on);
  await hap(false);
  eq(await page.evaluate(()=>[!!document.querySelector('.sess button[data-logset]'),document.querySelectorAll('.sess .hapt-in').length]),[true,0],"haptics off: the plain button, no switch");
  await hap(true);await back();await page.fill('#in_r','8');
  await page.focus('.sess [data-logset] .hapt-in');await page.keyboard.press(" ");await pause(page,300);
  eq(await n(),3,"Space logs one");
},{prefs:{autorest:false,haptic:true}});
await test("Ticks across the app: a setting's switch is the native switch, checked as the setting, one tap one change; an RPE chip, Start workout and the week's day each act once; nothing ticks with haptics off",async page=>{
  await page.evaluate(async()=>{(await import("/js/ui/actions.js")).openSheet("set_training");});await pause(page,600);
  const sw=()=>page.$eval('#sheet [data-toggle="nowarm"]',e=>{const i=e.querySelector("input");return [e.tagName,i.type,i.hasAttribute("switch"),i.getAttribute("role"),i.checked];});
  const was=await ev(page,"!!S.prefs.nowarm");
  eq(await sw(),["LABEL","checkbox",true,null,!was],"the warm-up setting: a native switch, checked as the setting");
  await page.tap('#sheet [data-toggle="nowarm"]');await pause(page,400);
  eq([await ev(page,"!!S.prefs.nowarm"),(await sw())[4]],[!was,was],"one tap: one change, and the switch says so");
  await page.focus('#sheet [data-toggle="nowarm"] input');await page.keyboard.press(" ");await pause(page,400);
  eq([await ev(page,"!!S.prefs.nowarm"),(await sw())[4]],[was,!was],"Space: back again");
  await page.evaluate(async()=>{(await import("/js/ui/actions.js")).closeSheet();});await pause(page,500);
  /* The week's day and Start workout. */
  await tapTab(page,"train");await pause(page,400);
  const other=await page.$eval(".wkr .wkr-d:not(.sel)",b=>b.getAttribute("data-wkday"));
  await page.tap('.wkr [data-wkday="'+other+'"]');await pause(page,400);
  eq(await ev(page,"V.tdate"),other,"the day picked");
  await page.tap(".wkr-today");await pause(page,400);
  eq(await page.$eval('.thero2 [data-startday]',e=>e.tagName),"LABEL");
  await page.tap('.thero2 [data-startday]');await pause(page,600);
  eq(await ev(page,"[!!S.active,S.active&&S.active.entries.reduce((n,e)=>n+e.sets.length,0)]"),[true,0],"the workout started, nothing logged");
  await page.fill('#in_r','8');await page.tap('.sess [data-logset]');await pause(page,900);
  const r=await page.$('.sess .rpeask [data-rpeset$=":8"]');
  if(r){await r.tap();await pause(page,300);eq(await ev(page,"S.active.entries[0].sets[0].rpe"),8,"the RPE chip, once");}
  /* Off: every one of them is a plain button again. */
  await page.evaluate(async()=>{const st=await import("/js/state.js");st.S.prefs.haptic=false;st.saveDB();(await import("/js/ui/render.js")).render();});await pause(page,300);
  eq(await page.$$eval('#app .hapt-in',a=>a.length),0,"no switches with haptics off");
},{prefs:{autorest:true,haptic:true,rpe:"every"}});
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
  if(await page.$('#app [data-addlive]'))throw new Error("Add exercise is under the sets again");
  /* From today's list, the title's ⌄. */
  await page.tap('[data-exlist]');await pause(page,400);
  await page.tap('#sheet [data-addlive]');await pause(page,500);
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
await test("Something hurts: where, what protects that area, how often it came up lately, and the plan steered away from it with Undo; never a diagnosis",async page=>{
  await page.evaluate(async()=>{const st=await import("/js/state.js"),U=await import("/js/util.js");
    const d=new Date(U.today()+"T00:00:00");d.setDate(d.getDate()-6);const iso=new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);
    st.S.sessions.push({id:"hp",date:iso,entries:[{name:"Standing Military Press",pain:true,painArea:"shoulder",sets:[{w:40,r:8}]}]});
    st.S.profile.limits=[];st.saveDB();});
  await startWorkout(page);
  await page.tap('[data-sessmore]');await pause(page);await page.tap('#sheet [data-hurt]');await pause(page);
  await page.tap('[data-hurtarea="shoulder"]');await pause(page,300);
  const note=await page.textContent('#sheet .hurt-note');
  if(!/kipping/.test(note)||!/once already in the last four weeks/.test(note))throw new Error("note: "+note);
  const had=await ev(page,"S.programs.find(p=>p.id===S.activeProgram).days.some(d=>d.ex.some(e=>/Military Press|Overhead Press|Upright Row|Dips/.test(e.name)))");
  await page.tap('[data-hurtavoid="shoulder"]');await pause(page,400);
  eq(await ev(page,"[S.profile.limits,S.programs.find(p=>p.id===S.activeProgram).days.some(d=>d.ex.some(e=>/Military Press|Overhead Press|Upright Row|Behind|Push Press|Dips/.test(e.name)))]"),[["shoulder"],false],"the area in the limits, nothing loading it left"+(had?"":" (none to swap)"));
  await page.tap('.toast-undo');await pause(page,300);
  eq(await ev(page,"S.profile.limits"),[],"Undo");
  if(!(await page.$('#sheet [data-hurtdo="skip"]'))){await page.tap('[data-sessmore]');await pause(page);await page.tap('#sheet [data-hurt]');await pause(page);await page.tap('[data-hurtarea="shoulder"]');await pause(page,300);}
  await page.tap('[data-hurtdo="skip"]');await pause(page,300);
  eq(await ev(page,"S.active.entries.some(e=>e.painArea==='shoulder')"),true,"the area kept with the flag");
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
await test("day builder: Edit shows each row's ✕ and grip; ✕ removes with undo, the grip drags, arrow keys move; out of Edit, neither",async page=>{
  await openDay(page);
  const n0=await dayNames(page);if(n0.length<3)throw new Error("seed day too short");
  /* Out of Edit the list is the workout: no ✕ one slip away, no grip a scroll could catch. */
  eq(await page.$$eval(".drows .drm,.dgrip",a=>a.length),0,"nothing to remove or move before Edit");
  eq(await page.$eval("[data-reorder]",e=>e.textContent),"Edit");
  await page.tap("[data-reorder]");await pause(page);
  eq([await page.$$eval(".dgrip",a=>a.length),await page.$$eval(".drows .drm",a=>a.filter(e=>getComputedStyle(e).display!=="none").length)],[n0.length,n0.length],"Edit: a ✕ and a grip per row");
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
  await page.tap('[data-reorder]');await pause(page);
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
  await page.evaluate(async()=>{const {V}=await import("/js/ui/view.js");const {render}=await import("/js/ui/render.js");V.tab="train";V.train="preview";V.previewId="ppl";render();});await pause(page);
  await page.tap('[data-adopt]');await pause(page);await page.tap('[data-confirmalt]');await pause(page,400);
  eq(await ev(page,"[S.activeProgram,S.programs.filter(p=>p.from==='ppl').length,V.train]"),[act0,1,"builder"],"added, not active");
  await page.evaluate(async()=>{const {V}=await import("/js/ui/view.js");const {render}=await import("/js/ui/render.js");V.tab="train";V.train="preview";V.previewId="ul";render();});await pause(page);
  await page.tap('[data-adopt]');await pause(page);await page.tap('[data-confirmok]');await pause(page,400);
  eq(await ev(page,"S.programs.find(p=>p.id===S.activeProgram).from"),"ul","active copy of the template");
});
await test("builder: switching to weekdays pins the days, and a weekday chip adds a pin, shared with a day that has it (two sessions that day)",async page=>{
  await page.evaluate(async()=>{const {V}=await import("/js/ui/view.js");const {render}=await import("/js/ui/render.js");const s=await import("/js/state.js");
    V.tab="train";V.train="builder";V.previewId=s.S.activeProgram;render();});await pause(page);
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
await test("Training opens on today with no sections; its program card opens the plan page one step in, back returns, a tab tap lands on Training",async page=>{
  await tapTab(page,"train");await pause(page);
  if(!(await page.$('.wkr'))||!(await page.$('[data-startday]')))throw new Error("Training has no week rail or start");
  eq(await page.$$eval('#app .tsecs,#app [data-tsec],#app .psecs',a=>a.length),0,"no sections on Training");
  await page.tap('.pgc [data-tplan="program"]');await pause(page,400);
  eq(await ev(page,"[V.tab,V.train,V.tplan]"),["train","plan","program"],"the plan page");
  if(!(await page.$('.bsched'))||!(await page.$('.drows [data-day]')))throw new Error("My program is not the builder");
  await page.tap('[data-back]');await pause(page,500);
  eq(await ev(page,"[V.tab,V.train]"),["train","days"],"back to Training");
  await page.tap('.pgc [data-tplan="program"]');await pause(page,400);
  await tapTab(page,"train");await pause(page,300);
  eq(await ev(page,"[V.train,!!document.querySelector('.wkr')]"),["days",true],"the tab lands on Training's own page");
});
await test("Back goes up one level: a day to My program, a template to Programs",async page=>{
  await coach(page,"train","program");
  await page.tap('.drows [data-day]');await pause(page,400);
  eq(await ev(page,"[V.tab,V.train]"),["train","day"]);
  await page.tap('[data-back]');await pause(page,500);
  eq(await ev(page,"[V.tab,V.train,!!document.querySelector('.bsched')]"),["train","plan",true],"day → My program");
  await page.tap('.psecs [data-tplan="programs"]');await pause(page);
  await page.tap('.tprog-card[data-preview]');await pause(page,400);
  eq(await ev(page,"V.train"),"preview");
  await page.tap('[data-back]');await pause(page,500);
  eq(await ev(page,"[V.train,V.tplan,!!document.querySelector('.tprog-card')]"),["plan","programs",true],"template → Programs");
});
await test("Training's week rail: tomorrow shows its plan, Today returns to now",async page=>{
  await tapTab(page,"train");await pause(page);
  if(await page.$('.twk')||await page.$('#app .dnav-card'))throw new Error("the old strip or day bar is still on Training");
  const tm=await page.evaluate(async()=>{const U=await import("/js/util.js");const d=new Date(U.today()+"T00:00:00");d.setDate(d.getDate()+1);
    return new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);});
  await railTo(page,tm);
  eq(await ev(page,"V.tdate"),tm,"tomorrow: Train looks ahead");
  if(!(await page.$('.wkr [data-wktoday]')))throw new Error("no way back to today");
  await page.tap('.wkr [data-wktoday]');await pause(page);
  eq(await ev(page,"[V.tdate,V.twkBase]"),[null,null]);
  eq(await page.$$eval('.wkr [data-wktoday]',a=>a.length),0,"Today is hidden on today");
});
await test("My program edits the active program in place",async page=>{
  await coach(page,"train","program");
  const n=await ev(page,"S.programs.find(p=>p.id===S.activeProgram).days.length");
  await page.tap('.dadd[data-bday]');await pause(page);
  eq(await ev(page,"[S.programs.find(p=>p.id===S.activeProgram).days.length,V.tab,V.train,V.tplan]"),[n+1,"train","plan","program"]);
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
  eq(await page.evaluate(()=>{const g=document.querySelector('.wkr .dbgrid'),kids=[...g.children].filter(e=>!e.classList.contains("dbwk"));
    const lead=kids.findIndex(e=>e.classList.contains("dbday")),d1=new Date(new Date().getFullYear(),new Date().getMonth(),1).getDay()||7;return (d1-lead+7)%7||7;}),6,"the month opens on Saturday");
  await tapTab(page,"profile");await pause(page);await page.tap('[data-sheet="set_app"]');await pause(page);
  await page.tap('[data-wkstart="7"]');await pause(page);
  eq(await ev(page,"S.prefs.wkstart"),7,"then Sunday");
  eq(await page.evaluate(async()=>{const sc=await import("/js/engine/schedule.js");const u=await import("/js/util.js");return sc.isoWeekday(sc.weekStartOf(u.today()));}),7);
});
await test("Food is the day only; the plan, targets and your own foods are planned one step in, on Food's plan page",async page=>{
  await tapTab(page,"food");await pause(page);
  if(!(await page.$('.fsum'))||!(await page.$('.fwater-art')))throw new Error("Food is not the day");
  eq(await page.$$eval('#app .tsecs,#app [data-fsec]',a=>a.length),0,"no sections on Food");
  if(await page.$('[data-quickfood].pill'))throw new Error("frequent pills still on the page");
  await coach(page,"food","targets");
  if(!(await page.$('.tgcard [data-tgedit="1"]')))throw new Error("Targets has no target card with Edit");
  eq(await page.$$eval('.tghero',a=>a.length),0,"no copy of Food's day summary");
  eq(await ev(page,"[V.tab,V.fplan]"),["food","targets"],"Food's plan page, its targets");
  await page.tap('[data-back]');await pause(page,500);
  eq(await ev(page,"[V.tab,V.fplan,!!document.querySelector('.fsum')]"),["food",null,true],"back to Food");
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
  eq(await ev(page,"[V.tab,V.fplan,V.smeal]"),["food","foods",null],"back to My foods");
  /* ✕ is behind Edit, as on every list. */
  if(await page.$('[data-rmsaved]'))throw new Error("✕ shown outside Edit");
  await page.tap('[data-reorder="mf"]');await pause(page,200);
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
  await page.tap('[data-reorder="mf"]');await pause(page,200);
  await page.tap('[data-rmmyfood]');await pause(page);
  eq(await ev(page,"S.myFoods.length"),0);
  await page.tap('.toast-undo');await pause(page);
  eq(await ev(page,"S.myFoods.length"),1);
});
await test("Targets: goals save in place, the suggestion applies, and Progress no longer has Nutrition",async page=>{
  await coach(page,"food","targets");
  /* The target is a card; Edit opens it as fields, Save closes it (3 Nov). */
  if(await page.$('#g_kcal'))throw new Error("fields shown before Edit");
  await page.tap('[data-tgedit="1"]');await pause(page,300);
  await page.fill('#g_kcal','2222');await page.tap('[data-savegoals]');await pause(page);
  eq(await ev(page,"[S.goals.kcal,V.tgedit,!!document.querySelector('#g_kcal')]"),[2222,false,false],"saved, the card closed");
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
  eq(await page.evaluate(()=>{const g=document.querySelector('.wkr .dbgrid'),kids=[...g.children].filter(e=>!e.classList.contains("dbwk"));
    const lead=kids.findIndex(e=>e.classList.contains("dbday")),d1=new Date(new Date().getFullYear(),new Date().getMonth(),1).getDay()||7;return (d1-lead+7)%7||7;}),6,"Saturday first");
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
  eq(await ev(page,"[V.tab,!!V.coach]"),["coach",false],"closed, back on the Coach page");
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
  /* Figures are isolated runs, and none has Arabic letters cut into it. (The week's "2 / 4"
     went with the week strip, 2 Nov: Training's day bar has no fraction.) */
  if(!r.runs.length||r.runs.some(x=>/[\u0600-\u06FF]/.test(x)))throw new Error("figures not isolated: "+JSON.stringify(r.runs));
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
  /* The red is the shape that travels between tabs (js/ui/dock.js), under the open tab. */
  await pause(page,600);
  const c=await page.evaluate(()=>{const b=document.querySelector('nav .dock-b.on'),h=document.querySelector('nav .dock-hl'),rb=b.getBoundingClientRect(),rh=h.getBoundingClientRect();
    return [getComputedStyle(b).color,Math.abs(rb.left-rh.left)<1.5&&Math.abs(rb.width-rh.width)<1.5?getComputedStyle(h).backgroundColor:"not under the tab"];});
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
  await page.tap('.dhead-a[data-sheet="set_meals"]');await pause(page,400);
  await page.tap('#sheet [data-mstyle="numbered"]');await pause(page);
  await page.tap('#sheet .x[data-close]');await pause(page,500);
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
  eq(await page.$$eval('.pmeal',a=>a.length),3,"three meals found");
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
  /* The plan pages stand on their tab's ground: planning a program is training's. */
  await page.evaluate(async()=>{const V=(await import("/js/ui/view.js")).V;V.tab="train";V.train="plan";V.tplan="program";(await import("/js/ui/render.js")).render();});await pause(page);
  eq((await look())[0],"training","Training's plan page");
  await page.evaluate(async()=>{const V=(await import("/js/ui/view.js")).V;V.tab="food";V.train="days";V.fplan="plan";(await import("/js/ui/render.js")).render();});await pause(page);
  eq((await look())[0],"food","Food's plan page");
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
  await page.evaluate(async()=>{const V=(await import("/js/ui/view.js")).V;V.tab="train";V.train="library";(await import("/js/ui/render.js")).render();});
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
  /* The pill is the shape that travels between tabs (js/ui/dock.js), under the open one. */
  eq(await page.$eval("nav .dock-hl",e=>getComputedStyle(e).backgroundColor),"rgb(255, 255, 255)","the open tab");
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
  for(let i=0;i<60&&!(await page.$(".pmeal"));i++)await pause(page,250);
  eq(await page.$$eval(".pmeal .pmeal-n",a=>a.map(e=>e.value)),["Meal 1","Meal 2","Snacks","Meal 3","Supplements"],"meals");
  eq(await page.$$eval(".pmrow.miss",a=>a.length),0,"every line matched a food");
  eq(await page.$$eval(".pitg-r input",a=>a.map(e=>e.value)),["2200","160","230","70","2.75","9000"],"targets");
  const supp=await page.$$eval(".pmeal",a=>a[4].innerText);
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
  for(let i=0;i<60&&!(await page.$(".pmeal"));i++)await pause(page,250);
  /* A meal renamed, a food dropped, an amount changed, a target changed. */
  await page.fill("#pm_n_0","Breakfast bowl");
  const dropped=await ev(page,"V.pparse[1].items[0].n");
  /* Each food is one tap: its sheet has Change amount, Remove and Swap. */
  await page.evaluate(()=>document.querySelector('[data-pfood="1|0"]').click());await pause(page,500);
  await page.evaluate(()=>document.querySelector('#sheet [data-pfoodrm]').click());await pause(page,300);
  eq(await ev(page,"V.pparse[1].items.map(i=>i.n).indexOf("+JSON.stringify(dropped)+")"),-1,"dropped");
  const k0=await ev(page,"V.pparse[0].items[0].kcal"),g0=await ev(page,"V.pparse[0].items[0].grams");
  /* Tapping the food opens it on the servings screen; set it in grams and update. */
  await page.evaluate(()=>document.querySelector('[data-pfood="0|0"]').click());await pause(page,500);
  await page.evaluate(()=>document.querySelector('#sheet [data-editfood="imp|0|0"]').click());await pause(page,500);
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
  /* The tile sits on a page that scrolls: aim at it afresh before each gesture. */
  let x=0,y=0;
  const aim=async()=>{await page.evaluate(()=>document.querySelector(".ttile").scrollIntoView({block:"center"}));await page.waitForTimeout(120);
    const b=await (await page.$(".ttile")).boundingBox();x=b.x+b.width/2;y=b.y+b.height/2;};
  await aim();
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
  await aim();await touch("touchStart",x,y);await page.waitForTimeout(150);
  eq(await lit(),true,"a resting finger presses");
  eq(await page.evaluate(()=>getComputedStyle(document.querySelector(".ttile")).transform!=="none"),true,"the press look applies");
  await touch("touchMove",x,y-30);await page.waitForTimeout(30);
  eq(await lit(),false,"and lets go when it turns into a scroll");
  await touch("touchEnd");await page.waitForTimeout(200);
  eq(await page.evaluate(()=>window.__clk),0,"no tap came of it");
  /* A quick tap answers as it lifts, then the tap goes through. */
  await page.evaluate(()=>{window.__lit=0;new MutationObserver(m=>{if(m.some(r=>r.target.classList.contains("tapd")))window.__lit++;})
    .observe(document.getElementById("app"),{attributes:true,attributeFilter:["class"],subtree:true});});
  await aim();await touch("touchStart",x,y);await page.waitForTimeout(20);await touch("touchEnd");
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
  await page.evaluate(async()=>{const V=(await import("/js/ui/view.js")).V;V.tab="train";V.train="library";(await import("/js/ui/render.js")).render();});
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
  eq(await ev(page,"[V.tab,V.train,V.tplan]"),["train","plan","program"],"lands on My program");
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
await test("Warm-up engine: each day warms up for its own lifts: a press, a pull and a leg day differ, and the stretches follow the movement",async page=>{
  const r=await page.evaluate(async()=>{
    const X=await import("/js/data/exercises.js");await new Promise(r=>X.loadExDB(r));
    const W=await import("/js/engine/warmup.js");
    const day=n=>n.map(x=>({name:x,planned:{sets:3}}));
    const names=w=>w.drills.map(d=>d.name);
    const push=names(W.warmupFor(day(["Barbell Bench Press - Medium Grip","Incline Dumbbell Press","Triceps Pushdown"])));
    const pull=names(W.warmupFor(day(["Wide-Grip Lat Pulldown","Seated Cable Rows","Barbell Curl"])));
    const legs=names(W.warmupFor(day(["Barbell Squat","Leg Press","Standing Calf Raises"])));
    const st=n=>W.cooldownFor(day(n)).stretches.map(s=>s.name);
    return [push.includes("Scapular Push-Up"),pull.includes("Scapular Pull-Up"),legs.includes("Bodyweight Squat"),
      push.filter(n=>pull.includes(n)).length<=1,
      st(["Seated Cable Rows"])[0],st(["Wide-Grip Lat Pulldown"])[0],st(["Barbell Curl"]).includes("Doorway Chest Stretch"),
      W.warmupFor(day(["Lying Leg Curls","Barbell Squat"])).drills.some(d=>/Elbow|Wrist/.test(d.name))];});
  eq(r,[true,true,true,true,"Middle Back Stretch","Overhead Lat Stretch",false,false]);
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
await test("Squat check: what was ticked opens every warm-up with roll, stretch and wake-up work for it, in the book's order; nothing on the floor with high blood pressure",async page=>{
  await page.evaluate(async()=>{const S=(await import("/js/state.js")).S;S.profile.faults=["ohsa_knees_in","ohsa_low_back_arch"];(await import("/js/state.js")).saveDB();});
  await startWorkout(page);
  if(!(await page.$('.wu .wu-fix')))throw new Error("no corrective card");
  const rows=await page.$$eval('.wu-fix .wu-row',a=>a.map(r=>[r.querySelector('.wu-n').textContent,r.querySelector('.wu-d').textContent]));
  const kinds=rows.map(r=>r[1].split(" · ")[0]);
  eq([kinds[0],kinds[kinds.length-1],kinds.indexOf("Stretch")>kinds.lastIndexOf("Roll")],["Roll","Wake up",true],"roll, then stretch, then wake up: "+JSON.stringify(rows));
  const [step,drills]=await page.evaluate(()=>{const c=[...document.querySelectorAll('.wu-step')];return [c.findIndex(x=>x.classList.contains("wu-fix")),c.findIndex(x=>/Move what/.test(x.textContent))];});
  eq(step>=0&&(step<drills||drills<0),true,"before the moving drills");
  await page.evaluate(async()=>{const st=await import("/js/state.js");st.S.profile.conds=["hypertension"];st.saveDB();(await import("/js/ui/render.js")).render();});await pause(page,300);
  const fl=await page.$$eval('.wu-fix .wu-n',a=>a.map(e=>e.textContent));
  eq(fl.some(n=>/SMR|Rolling|Bridge|Dead Bug|Child/i.test(n)),false,"nothing lying down: "+JSON.stringify(fl));
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
await test("Coach, warm-up: asked whether it is made for each session, it says so and shows the next one; \"split\" is the program, not Split Squats",async page=>{
  const r=await page.evaluate(async()=>{const C=await import("/js/ui/views/chat.js");const st=await import("/js/state.js");const S=st.S;
    const X=await import("/js/data/exercises.js");await new Promise(r=>X.loadExDB(r));
    st.split().days.filter(d=>d.ex.length)[0].ex.push({id:"ssq",name:"Split Squats",sets:3,lo:10,hi:15});
    const a=C.ask("Can the warm up be customized based on the type of exercise I am going to do after?");
    const b=C.ask("Yes, I would like to customize my warm up for each session in split based on the exercise session");
    const c=C.ask("what is in my split");
    const drills=(a.b||[]).filter(x=>x.l).map(x=>x.l.length)[0]||0;
    return [a.id,b.id,drills>=4,c.id!=="weights"];});
  eq(r,["warmplan","warmplan",true,true]);
});
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
await test("Assessment: fixed days set the week, stress and short sleep lower the volume, and the result is a week built for you, first, with its reasons; in Arabic too",async page=>{
  const go=async(step)=>{await page.evaluate(async st=>{const V=(await import("/js/ui/view.js")).V,A=await import("/js/ui/views/assess.js");
    V.asd.step=A.STEPS.indexOf(st);(await import("/js/ui/render.js")).render();},step);await pause(page,200);};
  await page.evaluate(async()=>{const V=(await import("/js/ui/view.js")).V,A=await import("/js/ui/views/assess.js");
    V.asd=A.draftFrom();Object.assign(V.asd,{age:30,height:180,weight:82,days:3,wd:[]});V.assess=true;});
  await go("week");
  for(const n of [1,3,5])await page.tap('[data-asm="wd|'+n+'"]'),await pause(page,150);
  eq(await ev(page,"[V.asd.days,V.asd.wd.slice().sort()]"),[3,[1,3,5]],"three fixed days are three days a week");
  if(!/built on these days/i.test(await page.textContent(".as")))throw new Error("no word that the week is built on the days");
  await go("focus");
  for(const m of ["Chest","Back","Glutes","Calves"])await page.tap('[data-asm="focus|'+m+'"]'),await pause(page,150);
  eq(await ev(page,"V.asd.focus"),["Chest","Back","Glutes"],"up to three to bring up");
  await go("sleep");
  await page.tap('[data-as="stress|high"]');await pause(page,150);
  if(!/bottom of its range/.test(await page.textContent(".as")))throw new Error("no word on slower recovery");
  await go("result");
  for(let i=0;i<20&&!(await page.$('.as-split'));i++)await pause(page,250);
  eq(await page.textContent('.as-split'),"Built for you","the week built for them is the plan shown");
  eq(await page.$eval('[data-assplit]',b=>b.textContent+"|"+b.getAttribute("aria-pressed")),"Built for you|true","first among the choices, and chosen");
  const why=await page.$$eval('.as-why',a=>a.map(x=>x.textContent).join(" "));
  if(!/Built on the days you gave/.test(why)||!/More for Chest, Back and Glutes/.test(why)||!/bottom of the range/.test(why))throw new Error("why: "+why);
  eq(await page.evaluate(async()=>{const V=(await import("/js/ui/view.js")).V,A=await import("/js/ui/views/assess.js");
    const pl=A.preview(V.asd).plan;return [pl.schedule,pl.days.map(d=>d.wd[0]).sort()];}),["week",[1,3,5]],"on the days they gave");
  /* A template is still there to pick. */
  const tpl=await page.$$eval('[data-assplit]',a=>a.slice(1).map(b=>b.getAttribute("data-assplit")));
  if(!tpl.length)throw new Error("no template offered beside the built week");
  await page.tap('[data-assplit="'+tpl[0]+'"]');await pause(page,300);
  if((await page.textContent('.as-split'))==="Built for you")throw new Error("the template was not shown");
  /* Arabic, right to left. */
  await page.evaluate(async()=>{const st=await import("/js/state.js");st.S.prefs.lang="ar";(await import("/js/i18n/exnames.js")).applyLang();});
  await page.tap('[data-assplit="built"]');await pause(page,300);
  eq(await page.textContent('.as-split'),"متبني ليك","the built week's name in Arabic");
  if(!/متبني على الأيام اللي اخترتها/.test(await page.textContent('.as')))throw new Error("no Arabic reason");
  await go("focus");
  const txt=await page.textContent(".as");
  if(!/عايز تكبّر إيه أكتر/.test(txt)||/[A-Za-z]{4,}/.test(txt.replace(/\s+/g," ")))throw new Error("focus step not all Arabic: "+txt.slice(0,300));
  eq(await ev(page,"getComputedStyle(document.querySelector('.as')).direction"),"rtl","right to left");
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
await test("Check-in barriers: fewer workouts than planned asks what got in the way; the answer gives that barrier's strategy and its action, and next week recalls it",async page=>{
  await page.evaluate(async()=>{
    const st=await import("/js/state.js"),S=st.S,U=await import("/js/util.js"),Sc=await import("/js/engine/schedule.js"),P=await import("/js/engine/plan.js");
    const ws=Sc.weekStartOf(U.today()),add=(d,n)=>new Date(Date.parse(d+"T00:00:00Z")+n*864e5).toISOString().slice(0,10);
    Object.assign(S.profile,{goal:"gain",level:"some",days:4,wd:[],mins:60,age:30,height:180,sex:"m",weight:80});
    S.programs=[];S.activeProgram=null;P.buildPlan();
    S.sessions=[{id:"b1",date:add(ws,-4),entries:[{name:"Barbell Squat",muscle:"Quads",sets:[{w:80,r:8,rpe:8}]}]}];
    S.ckWhy={[add(ws,-7)]:"time"};delete S.ckDone;delete S.ckDid;st.saveDB();
    const V=(await import("/js/ui/view.js")).V;V.tab="coach";V.csec="ai";S.prefs.csec="ai";(await import("/js/ui/render.js")).render();});
  await pause(page,300);
  if(!(await page.$('.ckcard [data-ckwhy="time"]')))throw new Error("no question: "+(await page.textContent('.ckcard')).slice(0,400));
  if(!/Better than the week before, when it was: not enough time/.test(await page.textContent(".ckwhy")))throw new Error("last week's answer not recalled, nor that the week went better");
  await page.tap('.ckcard [data-ckwhy="no_social_support"]');await pause(page,300);
  const w=await page.textContent('.ckwhy');
  if(!/training partner/.test(w)||!(await page.$('.ckwhy [data-share]')))throw new Error("no strategy or action: "+w);
  await page.tap('.ckwhy [data-ckwhy=""]');await pause(page,300);
  await page.tap('.ckcard [data-ckwhy="time"]');await pause(page,300);
  await page.tap('.ckwhy [data-setupstep="week"]');await pause(page,400);
  eq(await ev(page,"[V.assess,V.asd&&V.asd.step]"),[true,(await page.evaluate(async()=>(await import("/js/ui/views/assess.js")).STEPS.indexOf("week")))],"the assessment opens on the week");
});
await test("Weekly check-in: last week read on Coach — two short weeks and slow loss give a shorter week and 100 kcal less, each one tap with Undo, then closed for the week; in Arabic too",async page=>{
  const setUp=async()=>page.evaluate(async()=>{
    const st=await import("/js/state.js"),S=st.S,U=await import("/js/util.js"),Sc=await import("/js/engine/schedule.js"),P=await import("/js/engine/plan.js");
    const ws=Sc.weekStartOf(U.today()),add=(d,n)=>new Date(Date.parse(d+"T00:00:00Z")+n*864e5).toISOString().slice(0,10);
    Object.assign(S.profile,{goal:"lose",level:"some",days:4,wd:[],mins:60,age:30,height:180,sex:"m",weight:90});
    S.programs=[];S.activeProgram=null;P.buildPlan();
    const lift=d=>({id:"ck"+d,date:d,entries:[{name:"Barbell Squat",muscle:"Quads",sets:[{w:80,r:8,rpe:8},{w:80,r:8,rpe:8}]}]});
    S.sessions=[add(ws,-6),add(ws,-3),add(ws,-12),add(ws,-10)].map(lift);
    S.days={};for(let i=1;i<=7;i++)S.days[add(ws,-i)]={water:0,steps:0,sleep:0,sore:0,energy:0,notes:"",meals:{Lunch:{items:[{n:"Food",kcal:2000,p:150,c:200,f:60}]}}};
    S.body=[];for(let i=1;i<=21;i+=3)S.body.push({date:add(ws,-i),weight:Math.round((90+i*0.1/7)*100)/100});
    S.body.sort((a,b)=>a.date<b.date?-1:1);
    S.goals.kcal=2000;S.goals.c=200;delete S.ckDone;delete S.ckDid;st.saveDB();
    const V=(await import("/js/ui/view.js")).V;V.tab="coach";V.csec="ai";S.prefs.csec="ai";(await import("/js/ui/render.js")).render();});
  await setUp();await pause(page,300);
  if(!(await page.$('.ckcard')))throw new Error("no check-in card on Coach");
  const txt=await page.textContent('.ckcard');
  for(const re of [/Workouts: 2 of 4 planned/,/Food: logged on 7 days/,/an estimate from 7 weigh-ins/,/Build a 2-day week/,/Set 1,900 kcal/])
    if(!re.test(txt))throw new Error("check-in missing "+re+": "+txt.slice(0,500));
  await page.tap('[data-ckdo="kcal"]');await pause(page,300);
  eq(await ev(page,"[S.goals.kcal,S.goals.c]"),[1900,175],"100 kcal less, off the carbs");
  if(await page.$('[data-ckdo="kcal"]'))throw new Error("a change made is still offered");
  await page.tap('.toast-undo');await pause(page,300);
  eq(await ev(page,"[S.goals.kcal,S.goals.c]"),[2000,200],"Undo puts the target back");
  await page.tap('[data-ckdo="days"]');await pause(page,400);
  eq(await ev(page,"[S.profile.days,(S.programs.find(p=>p.id===S.activeProgram)||{}).from,(S.programs.find(p=>p.id===S.activeProgram)||{days:[]}).days.filter(d=>d.ex.length).length]"),[2,"built",2],"a two-day week, built");
  /* The chat's weekly answer offers what is left, the same button. */
  await openChat(page);
  await page.fill('#chatq',"how was my week");await page.press('#chatq','Enter');await pause(page,600);
  if(!(await page.$('#cpanel [data-ckdo="kcal"]')))throw new Error("the chat's week answer does not offer the check-in's change");
  await page.evaluate(async()=>{const V=(await import("/js/ui/view.js")).V;V.coach=false;V.chat=false;V.tab="coach";V.csec="ai";(await import("/js/ui/render.js")).render();});await pause(page,300);
  await page.tap('[data-ckok]');await pause(page,300);
  if(await page.$('.ckcard'))throw new Error("closed for the week, still shown");
  /* Again, in Arabic. */
  await setUp();
  await page.evaluate(async()=>{const st=await import("/js/state.js");st.S.prefs.lang="ar";(await import("/js/i18n/exnames.js")).applyLang();(await import("/js/ui/render.js")).render();});
  await pause(page,300);
  const ar=await page.textContent('.ckcard');
  if(!/المراجعة الأسبوعية/.test(ar)||!/ابني أسبوع 2 أيام/.test(ar))throw new Error("check-in not in Arabic: "+ar.slice(0,300));
  eq(await ev(page,"getComputedStyle(document.querySelector('.ckcard')).direction"),"rtl","right to left");
});
await test("Meal plan from your own food: a breakfast eaten most days comes back scaled to the targets, your rice in place of the app's, and it says so; in Arabic too",async page=>{
  await page.evaluate(async()=>{
    const N=await import("/js/engine/nutrition.js");await new Promise(r=>N.loadFoods(r));
    const st=await import("/js/state.js"),S=st.S,U=await import("/js/util.js");
    const by={};N.FOODDB.forEach(f=>by[f.id]=f);
    const item=(id,g)=>Object.assign({fid:id,n:by[id].n,grams:g,label:g+" g",src:"db"},N.nutritionFor(by[id],g));
    for(let i=1;i<=4;i++){const d=new Date(Date.parse(U.today()+"T00:00:00Z")-i*864e5).toISOString().slice(0,10);
      S.days[d]={water:0,steps:0,sleep:0,sore:0,energy:0,notes:"",meals:{
        Breakfast:{items:[item("ful",200),item("egg_boiled",100),item("baladi",90)],done:true},
        Lunch:{items:[item("rice_basmati",200),item("tilapia_ck",150)],done:true}}};}
    S.goals.kcal=2400;S.goals.p=160;S.goals.c=260;S.goals.f=75;S.prefs.meals=4;S.prefs.diet="any";S.prefs.avoid=[];st.saveDB();});
  await page.evaluate(async()=>{const V=(await import("/js/ui/view.js")).V;V.tab="coach";(await import("/js/ui/render.js")).render();});
  await page.evaluate(()=>{const b=document.createElement("button");b.setAttribute("data-pgen","1");b.id="pgen_t";document.body.appendChild(b);});
  await page.tap('#pgen_t');
  for(let i=0;i<30&&!(await page.$('.pmeal'));i++)await pause(page,200);
  const r=await page.evaluate(async()=>{const V=(await import("/js/ui/view.js")).V;const pp=V.pparse;
    const b=pp[0],kc=pp.reduce((a,m)=>a+m.items.reduce((x,i)=>x+i.kcal,0),0),bk=b.items.reduce((x,i)=>x+i.kcal,0);
    return [b.items.map(i=>i.fid).sort(),b.usual,Math.abs(kc-2400)/2400<0.06,Math.abs(bk-2400*0.25)/(2400*0.25)<=0.2,
      pp.some(m=>m.items.some(i=>i.fid==="rice_basmati")),pp.some(m=>m.items.some(i=>i.fid==="rice_egyptian"))];});
  eq(r,[["baladi","egg_boiled","ful"],4,true,true,true,false],"their breakfast, scaled; their rice");
  const txt=await page.textContent("body");
  if(!/Your usual: 4 days in the last 4 weeks/.test(txt))throw new Error("no word that the breakfast is their usual");
  if(!/\d+ of \d+ foods are ones you eat/.test(await page.textContent('.prown')))throw new Error("no count of their own foods");
  await page.evaluate(async()=>{const st=await import("/js/state.js");st.S.prefs.lang="ar";(await import("/js/i18n/exnames.js")).applyLang();(await import("/js/ui/render.js")).render();});
  await pause(page,200);
  if(!/معتادك: 4 أيام في آخر 4 أسابيع/.test(await page.textContent("body")))throw new Error("no Arabic note");
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
  for(let i=0;i<4;i++){await page.tap('[data-asnext]');await pause(page,150);}
  /* What to bring up, and a lift they will not do: the week is built with both. */
  if(!(await page.$('[data-asm="focus|Back"]')))throw new Error("no focus step after where you train");
  await page.tap('[data-asm="focus|Back"]');await pause(page,150);
  await page.tap('[data-asm="nolift|Barbell Deadlift"]');await pause(page,150);
  for(let i=0;i<2;i++){await page.tap('[data-asnext]');await pause(page,150);}
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
  eq(await ev(page,"[S.profile.focus,(S.skip||[]).indexOf('Barbell Deadlift')>=0,(S.programs.filter(p=>p.id===S.activeProgram)[0]||{}).from,"
    +"(S.programs.filter(p=>p.id===S.activeProgram)[0]||{days:[]}).days.some(d=>d.ex.some(e=>e.name==='Barbell Deadlift'))]"),
    [["Back"],true,"built",false],"built for them: the focus kept, the lift they left out hidden and not in the week");
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
await test("Health conditions: the assessment asks which; the plan follows the book for it (nothing lying down, 10–20 reps, steady breathing) and says so; My program fits one it did not build with one tap",async page=>{
  await page.evaluate(async()=>{const A=await import("/js/ui/views/assess.js"),V=(await import("/js/ui/view.js")).V;
    V.asd=A.draftFrom();Object.assign(V.asd,{sex:"m",age:50,height:178,weight:88,days:3,wd:[],goal:"gain",level:"some"});V.asd.step=A.STEPS.indexOf("health");V.assess=true;(await import("/js/ui/render.js")).render();});
  await pause(page,300);
  eq(await page.$$eval('[data-asm^="conds|"]',a=>a.map(b=>b.getAttribute("data-asm").split("|")[1]).filter(x=>/pregnancy/.test(x)).length),0,"no pregnancy for a man");
  await page.tap('[data-asm="conds|hypertension"]');await pause(page,200);
  if(!/training guidelines/.test(await page.textContent('#app')))throw new Error("no word on what it changes");
  await page.evaluate(async()=>{const A=await import("/js/ui/views/assess.js"),V=(await import("/js/ui/view.js")).V;V.asd.step=A.STEPS.indexOf("result");(await import("/js/ui/render.js")).render();});
  for(let i=0;i<20&&!(await page.$('.condcard'));i++)await pause(page,250);
  const card=await page.textContent('.condcard');
  if(!/High blood pressure/.test(card)||!/No lying on your back or front/.test(card)||!/never hold your breath/.test(card)||!/10–20 reps/.test(card))throw new Error("the card does not say it: "+card);
  await page.tap('[data-asuse]');await pause(page,600);
  const bad=await page.evaluate(async()=>{const st=await import("/js/state.js"),P=await import("/js/engine/plan.js"),X=await import("/js/data/exercises.js");
    const sp=st.split(),out=[];
    sp.days.forEach(d=>d.ex.forEach(e=>{if(P.avoids(e.name,["floor"]))out.push("floor:"+e.name);
      const bw=(X.EXDB[e.name]||{}).e==="Bodyweight";if(!bw&&!/Hold|Plank|Stretch|Carry|Bridge/i.test(e.name)&&(e.lo<10||e.hi>20||e.sets>3))out.push("dose:"+e.name+" "+e.sets+"x"+e.lo+"-"+e.hi);}));
    return [st.S.profile.conds,out];});
  eq(bad,[["hypertension"],[]],"the plan keeps to it");
  /* A program it did not build: bench press and crunches, five sets of five. */
  await page.evaluate(async()=>{const st=await import("/js/state.js"),Sp=await import("/js/data/splits.js");
    const p=st.makeProgram({id:"mine",name:"Mine",days:[Sp.day("Chest",[Sp.ex("Barbell Bench Press - Medium Grip",5,5,5),Sp.ex("Crunches",3,15,20),Sp.ex("Cable Crossover",3,8,12)])]});
    p.id="mine";st.S.programs.push(p);st.S.activeProgram="mine";st.saveDB();});
  await coach(page,"train","program");await pause(page,300);
  if(!(await page.$('.condcard [data-condfix]')))throw new Error("no fix offered: "+(await page.textContent('#app')).slice(0,400));
  await page.tap('.condcard [data-condfix]');await pause(page,400);
  const ex=await ev(page,"S.programs.find(p=>p.id==='mine').days[0].ex.map(e=>[e.name,e.sets,e.lo,e.hi])");
  eq([ex.some(e=>/^Barbell Bench Press - Medium/.test(e[0])||e[0]==="Crunches"),ex[0][1]<=3&&ex[0][2]>=10],[false,true],"swapped and dosed: "+JSON.stringify(ex));
  eq(await page.$$eval('.condcard [data-condfix]',a=>a.length),0,"nothing left to fit");
  await page.tap('.toast-undo');await pause(page,300);
  eq(await ev(page,"S.programs.find(p=>p.id==='mine').days[0].ex[0].name"),"Barbell Bench Press - Medium Grip","Undo puts it back");
  /* The workout says how to breathe. */
  await page.evaluate(async()=>{const st=await import("/js/state.js");st.S.activeProgram=st.S.programs[0].id;st.saveDB();});
  await startWorkout(page);
  for(let i=0;i<6&&!(await page.$('.sc-cond'));i++){const n=await page.$('[data-nextex]');if(n){await n.tap();await pause(page,300);}else break;}
  if(!(await page.$('.sc-cond')))throw new Error("no breathing cue on the set");
},{db:Object.assign(seed(),{onboarded:false})});
await test("Exercise picker: what a health condition rules out is marked, and asks before it goes in",async page=>{
  await page.evaluate(async()=>{const st=await import("/js/state.js");st.S.profile.conds=["hypertension"];st.saveDB();
    const V=(await import("/js/ui/view.js")).V;V.dayId=st.split().days[0].id;V.exm="Chest";V.exe="All";V.exq="bench press";
    (await import("/js/ui/actions.js")).openSheet("exercise",{});});
  await pause(page,500);
  const w=await page.$('#sheet .pkwarn[data-pickex]');if(!w)throw new Error("nothing marked");
  const name=await w.getAttribute("data-pickex");
  const n0=await ev(page,"S.programs.find(p=>p.id===S.activeProgram).days[0].ex.length");
  await w.tap();await pause(page,400);
  eq(await ev(page,"V.sheet"),"confirm","asks first");
  await page.tap('#sheet [data-confirmmid]');await pause(page,400);
  eq(await ev(page,"[V.sheet,S.programs.find(p=>p.id===S.activeProgram).days[0].ex.length]"),["exercise",n0],"Pick another: back, nothing added");
  await page.tap('#sheet .pkwarn[data-pickex="'+name+'"]');await pause(page,400);
  await page.tap('#sheet [data-confirmok]');await pause(page,500);
  eq(await ev(page,"S.programs.find(p=>p.id===S.activeProgram).days[0].ex.some(e=>e.name===\""+name+"\")"),true,"added when they say so");
});
await test("Coach chat knows the phase, the cardio zones and the health adjustments, in English and Arabic",async page=>{
  await page.evaluate(async()=>{const st=await import("/js/state.js"),sc=await import("/js/engine/schedule.js"),U=await import("/js/util.js");
    st.S.block={start:sc.weekStartOf(U.today())};st.S.profile.conds=["hypertension"];st.S.profile.goal="gain";st.saveDB();});
  await openChat(page);await page.fill('#chatq',"What phase am I in?");await page.press('#chatq','Enter');await pause(page,600);
  let txt=await page.textContent('#cpanel');
  if(!/Stabilisation endurance/.test(txt)||!/12–20 reps a set/.test(txt))throw new Error("phase: "+txt.slice(-500));
  await page.fill('#chatq',"what are my heart rate zones");await page.press('#chatq','Enter');await pause(page,600);
  txt=await page.textContent('#cpanel');
  if(!/cardio stage 1/.test(txt)||!/go by feel/.test(txt))throw new Error("zones: "+txt.slice(-500));
  await page.fill('#chatq',"what is adjusted for my health");await page.press('#chatq','Enter');await pause(page,600);
  txt=await page.textContent('#cpanel');
  if(!/Your plan is adjusted for: high blood pressure/.test(txt))throw new Error("health: "+txt.slice(-500));
  await page.fill('#chatq',"ايه اللي اتغير في خطتي علشان حالتي الصحيه");await page.press('#chatq','Enter');await pause(page,600);
  txt=await page.textContent('#cpanel');
  if(!/خطتك متظبطة على/.test(txt))throw new Error("health in Arabic: "+txt.slice(-500));
});
await test("Coach, in a workout: 'not sure I can do 20 push-ups, shall I adjust it?' offers today's reps from your own best and an easier version; one tap changes only today",async page=>{
  await page.evaluate(async()=>{const st=await import("/js/state.js"),Sp=await import("/js/data/splits.js");
    const p=st.makeProgram({id:"pu",name:"PU",days:[Sp.day("Upper",[Sp.ex("Pushups",3,15,20),Sp.ex("Dumbbell Bench Press",3,8,12)])]});p.id="pu";
    st.S.programs=[p];st.S.activeProgram="pu";st.S.block=null;st.S.prefs.noblocks=true;
    st.S.sessions=[{id:"pp",date:"2026-10-20",entries:[{name:"Pushups",sets:[{w:0,r:9},{w:0,r:7}]}]}];st.saveDB();});
  await startWorkout(page);
  await page.tap('[data-coachopen]');await pause(page,500);
  await page.fill('#chatq',"I am overweight, I am not sure I can do the 20 reps pushups today. Shall I adjust it?");await page.press('#chatq','Enter');await pause(page,700);
  const opts=await page.$$eval('#cpanel .ag-opt .ag-ol',a=>a.map(e=>e.textContent));
  if(!opts.some(o=>/Today: 6–11 reps/.test(o)))throw new Error("no fitted reps from the best set of 9: "+JSON.stringify(opts));
  const easier=opts.find(o=>/Switch to/.test(o));
  await page.tap('#cpanel .ag-opt');await pause(page,600);
  if(await page.$('#cpanel .ag-ok')){await page.tap('#cpanel .ag-ok');await pause(page,600);}
  eq(await ev(page,"[S.active.entries[0].planned.lo,S.active.entries[0].planned.hi,S.programs[0].days[0].ex[0].lo]"),[6,11,15],"today only: the program keeps 15–20");
  await page.fill('#chatq',"Can you change the 20 reps in my current active training to something reasonable for me?");await page.press('#chatq','Enter');await pause(page,700);
  if(!(await page.$$('#cpanel .ag-opt')).length)throw new Error("the second wording is not understood: "+(await page.textContent('#cpanel')).slice(-300));
  eq(easier,"Switch to Incline Push-Up","an easier version of the same movement");
});
await test("Rest complete, closed: the band fades where it was, never fading back in first",async page=>{
  await startWorkout(page);
  await page.evaluate(async()=>{const V=(await import("/js/ui/view.js")).V;V.restDone=true;V.restEnd=0;(await import("/js/ui/render.js")).render();});
  await pause(page,900);
  await page.tap('.rb.over .rb-close');await pause(page,60);
  const g=await page.evaluate(()=>{const e=document.querySelector('.sess .rb.ghost');return e?[getComputedStyle(e).animationName,+getComputedStyle(e).opacity]:null;});
  await pause(page,120);
  const g2=await page.evaluate(()=>{const e=document.querySelector('.sess .rb.ghost');return e?+getComputedStyle(e).opacity:0;});
  if(!g)throw new Error("no ghost of the band");
  eq([g[0],g2<g[1]],["none",true],"leaving, fading only, never an entrance again: "+JSON.stringify([g,g2]));
  await pause(page,900);
  eq(await page.$$eval('.sess .rb',a=>a.length),0,"gone");
},{prefs:{anim:true}});
await test("Coach in a live workout: the session comes first — 'what now?', 'how long do I rest?' answer for the exercise on screen; food or tomorrow still get their own answer",async page=>{
  await startWorkout(page);
  await page.tap('[data-coachopen]');await pause(page,500);
  const ex=await ev(page,"S.active.entries[0].name");
  const askIt=async q=>{await page.fill('#chatq',q);await page.press('#chatq','Enter');await pause(page,700);
    return page.evaluate(()=>{const x=[...document.querySelectorAll('#cpanel .chat-x')].pop();return x?x.textContent:"";});};
  let a=await askIt("what now?");
  if(!/This workout/.test(a)||!a.includes("Now:"))throw new Error("what now: "+a.slice(0,300));
  a=await askIt("how long do I rest between sets");
  if(!/Rest \d+ s between sets/.test(a))throw new Error("rest: "+a.slice(0,300));
  a=await askIt("how much protein should I eat today?");
  if(/This workout/.test(a))throw new Error("food went to the workout: "+a.slice(0,200));
});
await test("Coming back: an experienced lifter mostly off for months gets a phase-1 block now, a 'Coming back' card, and old weights not suggested after six weeks",async page=>{
  await page.evaluate(async()=>{const A=await import("/js/ui/views/assess.js"),V=(await import("/js/ui/view.js")).V,st=await import("/js/state.js");
    st.S.block={start:"2025-01-04"};
    V.asd=A.draftFrom();Object.assign(V.asd,{sex:"m",age:34,height:180,weight:92,days:4,wd:[],goal:"recomp",level:"experienced"});V.asd.step=A.STEPS.indexOf("level");V.assess=true;(await import("/js/ui/render.js")).render();});
  await pause(page,300);
  await page.tap('[data-as="lapse|off"]');await pause(page,200);
  if(!/rebuild/.test(await page.textContent('#app')))throw new Error("no word on what coming back changes");
  await page.evaluate(async()=>{const A=await import("/js/ui/views/assess.js"),V=(await import("/js/ui/view.js")).V;V.asd.step=A.STEPS.indexOf("result");(await import("/js/ui/render.js")).render();});
  for(let i=0;i<20&&!(await page.$('[data-k="backcard"]'));i++)await pause(page,250);
  if(!(await page.$('[data-k="backcard"]')))throw new Error("no Coming back card");
  await page.tap('[data-asuse]');await pause(page,600);
  const r=await page.evaluate(async()=>{const st=await import("/js/state.js"),sc=await import("/js/engine/schedule.js"),U=await import("/js/util.js"),B=await import("/js/engine/blocks.js");
    return [st.S.profile.lapse,st.S.block.start===sc.weekStartOf(U.today()),(B.phaseNow()||{}).n];});
  eq(r,["off",true,1],"blocks start again, at phase 1");
  /* A lift last done months ago: last time shown, no old weight suggested. */
  const rec=await page.evaluate(async()=>{const st=await import("/js/state.js"),F=await import("/js/engine/formulas.js");
    st.S.sessions.push({id:"old",date:"2026-03-01",entries:[{name:"Barbell Deadlift",sets:[{w:140,r:5}]}]});
    return F.recommend({name:"Barbell Deadlift",planned:{lo:12,hi:20,sets:3}});});
  eq([rec.gap,rec.w,/140 × 5/.test(rec.last)],[true,0,true],"found afresh, last time for reference");
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
  eq(await ev(page,"[V.tab,V.pimport,!!V.pgen]"),["food",true,true],"rebuild opens a generated plan");
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
  if(!/After two weeks of logging food/.test(await page.$eval('.tgsrc',e=>e.textContent)))throw new Error("Targets does not say what it needs");
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
await test("Phase 4: the Coach page lists the most important thing first, three at most until asked; the dot still counts them all",async page=>{
  const n=await page.evaluate(async()=>(await import("/js/ui/views/pcheck.js")).adviceCount());
  if(n<2)throw new Error("the seed should give at least two findings, got "+n);
  await coach(page,"ai");
  eq(await page.$eval('#app .cfor>li .pcf h3',e=>e.textContent),"Your calories will not build muscle","the most important one first");
  const shown=await page.$$eval('#app .cfor>li',a=>a.length);
  if(shown>3)throw new Error("more than three before asking: "+shown);
  eq(await page.$eval('nav [data-tab="coach"]',e=>e.getAttribute("aria-label")).then(x=>x.includes(String(n))),true,"the dock still counts all of them");
},{db:Object.assign(seed(),{goals:{kcal:2500,p:110,c:300,f:70,water:3000,steps:9000}})});
await test("Coach page: one numbered list whose count is what it shows (three, the rest one tap away), each set aside in turn, then one quiet line",async page=>{
  await page.evaluate(async()=>{const X=await import("/js/data/exercises.js");await new Promise(r=>X.loadExDB(r));});
  const n=await page.evaluate(async()=>(await import("/js/ui/views/pcheck.js")).adviceCount());
  if(n<1)throw new Error("the seed should have something to say");
  await coach(page,"ai");
  const listed=async()=>page.evaluate(()=>[+(document.querySelector('.tsec .libn')||{}).textContent||0,document.querySelectorAll('.cfor>li').length,!!document.querySelector('[data-advall="1"]')]);
  const [cnt,shown,more]=await listed();
  eq([cnt>=n,shown===Math.min(3,cnt),more===(cnt>3)],[true,true,true],"the count is what is listed: "+JSON.stringify([cnt,shown,more]));
  if(more){await page.tap('[data-advall="1"]');await pause(page,300);eq(await page.$$eval('.cfor>li',a=>a.length),cnt,"all, in place");}
  /* Set aside what the coach noticed, one by one: the list and its count go down together. */
  for(let i=0;i<n;i++){
    await page.tap('#app .cfor .pcf [data-pckeep],#app .cfor .pcf [data-cokeep]');await pause(page,300);
    await page.evaluate(()=>{const x=document.querySelector('.toast');if(x)x.remove();});}
  eq(await page.$$eval('#app .pcf',a=>a.length),0,"nothing the coach noticed is left");
  const rest=await page.$$eval('.cfor>li',a=>a.length);
  if(!rest){
    /* Nothing left: one card where the list was, not a loose line (owner, 3 Nov). */
    if(!/on track|Nothing to change/i.test(await page.textContent('.pcquiet')))throw new Error("no on-track card");
    eq(await page.evaluate(()=>getComputedStyle(document.querySelector('.pcquiet')).backdropFilter.indexOf("blur")>=0||!CSS.supports("backdrop-filter","blur(1px)")),true,"a card like the others");}
  /* The rest is one list of rows: the assessment and How the coach works, never loose lines. */
  eq(await page.evaluate(()=>[!!document.querySelector('.cmore .srow[data-setup]'),!!document.querySelector('.cmore [data-sheet="coachinfo"]'),document.querySelectorAll('#app > p.dsub,#app > p.as-note').length]),[true,true,0],"one list, no loose sentences");
  await page.tap('.cmore [data-sheet="coachinfo"]');await pause(page,400);
  if(!/starting points from the research/.test(await page.textContent('#sheet')))throw new Error("the small print is not in How the coach works");
});
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
await test("Stress said high: the week stays light and nothing asks for more volume; the coach says when it will ask again, asks then (or when told it's better), and rebuilds the week",async page=>{
  const setUp=async(daysAgo)=>page.evaluate(async(daysAgo)=>{
    const st=await import("/js/state.js"),S=st.S,U=await import("/js/util.js"),P=await import("/js/engine/plan.js");
    const d=new Date(U.today()+"T00:00:00Z");d.setUTCDate(d.getUTCDate()-daysAgo);
    Object.assign(S.profile,{goal:"recomp",level:"advanced",days:5,wd:[],mins:60,stress:"high",sleep:8,stressAt:d.toISOString().slice(0,10)});
    S.programs=[];S.activeProgram=null;P.buildPlan();st.saveDB();
    const V=(await import("/js/ui/view.js")).V;V.assess=false;V.stressAsk=false;V.tab="coach";V.csec="ai";S.prefs.csec="ai";(await import("/js/ui/render.js")).render();},daysAgo);
  await setUp(3);await pause(page,300);
  const txt=await page.textContent('#app');
  if(/Some muscles get little training/.test(txt))throw new Error("asks for more volume on a week kept light on purpose");
  if(!/Kept light on purpose/.test(txt)||!/I'll ask again on/.test(txt))throw new Error("does not say the week is light on purpose, or when it will ask");
  eq(await page.evaluate(async()=>{const C=await import("/js/engine/plancheck.js");return C.checkPlans().some(f=>f.id==="vol-low");}),false,"the plan check agrees");
  /* Still stressed (owner, 3 Nov): the week stays light, the card leaves the list for one
     line that still says when, and Better now? is on it. Undo brings the card back. */
  const at0=await ev(page,"S.profile.stressAt");
  await page.tap('[data-stresskeep]');await pause(page,300);
  eq(await ev(page,"[S.profile.stress,S.profile.stressAt,!!document.querySelector('.stresscard'),!!document.querySelector('.stressline [data-stressask]')]"),["high",at0,false,true],"still stressed: kept light, a line instead of the card");
  if(!/I'll ask again on/.test(await page.textContent('.stressline')))throw new Error("the line does not say when");
  await page.tap('.toast-undo');await pause(page,300);
  eq(await ev(page,"[S.profile.stressOk===undefined,!!document.querySelector('.stresscard')]"),[true,true],"Undo: the card is back");
  await page.tap('.stresscard [data-stressask]');await pause(page,300);
  if(!(await page.$('[data-stressnow="stress|normal"]')))throw new Error("no question after It's better now");
  const before=await ev(page,"S.activeProgram");
  await page.tap('[data-stressnow="stress|normal"]');await pause(page,400);
  eq(await ev(page,"[S.profile.stress,S.profile.stressAt===undefined,S.activeProgram!==\""+before+"\",!!document.querySelector('.stresscard')]"),["normal",true,true,false],"better: kept, the week built again, the card gone");
  await page.tap('.toast-undo');await pause(page,300);
  eq(await ev(page,"[S.profile.stress,S.activeProgram===\""+before+"\"]"),["high",true],"Undo puts it back");
  /* Four weeks on: the question comes by itself. */
  await setUp(29);await pause(page,300);
  if(!/How are you now\?/.test(await page.textContent('.stresscard')))throw new Error("the follow-up is not asked after four weeks");
  await page.tap('[data-stressnow="stress|high"]');await pause(page,300);
  eq(await page.evaluate(async()=>{const st=await import("/js/state.js"),U=await import("/js/util.js");return [st.S.profile.stressAt===U.today(),!document.querySelector('.stresscard'),/I'll ask again on/.test((document.querySelector('.stressline')||{}).textContent||"")];}),[true,true,true],"still high: asked again in four weeks, said in one line");
});
await test("Dock: the red travels from the tab left to the tab tapped, and lands on it",async page=>{
  await tapTab(page,"train");await pause(page,700);
  const at=()=>page.evaluate(()=>{const h=document.querySelector("nav .dock-hl").getBoundingClientRect();return Math.round(h.left+h.width/2);});
  const mid=t=>page.evaluate(t=>{const b=document.querySelector('nav .dock-b[data-tab="'+t+'"]').getBoundingClientRect();return Math.round(b.left+b.width/2);},t);
  const a=await at(),trainMid=await mid("train");
  if(Math.abs(a-trainMid)>3)throw new Error("not on Training to begin with");
  await page.tap('nav .dock-b[data-tab="progress"]');
  const half=await page.evaluate(()=>new Promise(r=>setTimeout(()=>{const h=document.querySelector("nav .dock-hl").getBoundingClientRect();r(Math.round(h.left+h.width/2));},140)));
  await pause(page,700);
  const end=await at(),progMid=await mid("progress");
  if(!(half>a+10&&half<progMid-10))throw new Error("not on its way: "+a+" → "+half+" → "+end+" (Progress at "+progMid+")");
  if(Math.abs(end-progMid)>3)throw new Error("did not land on Progress: "+end+" vs "+progMid);
  eq(await page.$eval('nav .dock-b[data-tab="train"]',b=>getComputedStyle(b).backgroundColor!=="rgba(0, 0, 0, 0)"),true,"Training is a plain circle again");
},{prefs:{anim:true}});
await test("Dock: every tab is labelled, in English and Arabic, and the label starts its accessible name",async page=>{
  const lab=()=>page.$$eval("nav .dock-b",a=>a.map(b=>[b.querySelector(".dock-l").textContent,b.getAttribute("aria-label").indexOf(b.querySelector(".dock-l").textContent)===0]));
  /* The planning tab is "Coach" (owner, 2 Nov), its page "Coach Hub"; the chat floats (js/ui/coachfab.js). */
  eq(await lab(),[["Train",true],["Food",true],["Coach",true],["Progress",true]],"English");
  await page.evaluate(async()=>{(await import("/js/state.js")).S.prefs.lang="ar";(await import("/js/ui/render.js")).render();});await pause(page);
  eq((await lab()).map(x=>x[0]),["التمرين","الأكل","الكوتش","التقدم"],"Arabic");
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
await test("Blocks: My program shows the week of the block, and week 3 asks for one in reserve",async page=>{
  await blockAt(page,iso(15));
  await coach(page,"train","program");await pause(page);
  const t=await page.$eval(".blk",e=>e.innerText);
  if(!/Block 1 · Week 3 of 4/.test(t)||!/\b1 (rep )?in reserve/.test(t))throw new Error("card: "+t);
  eq(await page.$$eval(".blk-bar i",a=>a.map(i=>i.className)),["done","done","on"," lt"],"two weeks done, this one lit, the lighter one last");
  await tapTab(page,"train");await pause(page,300);await page.tap("[data-startday]");await pause(page,400);
  eq(await ev(page,"S.active.entries.filter(e=>e.kind!=='activity'&&!e.planned.timed).every(e=>e.planned.rir===1)"),true,"one in reserve");
});
await test("Blocks: the planned lighter week thins the sets, and ending it starts the next block",async page=>{
  await blockAt(page,iso(23));
  await coach(page,"train","program");await pause(page);
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
  eq(await ev(page,"[S.sessions[0].feel,(e=>(e.querySelector(':scope>.hapt-in')||e).getAttribute('aria-pressed'))(document.querySelector('[data-sfeel=\"easy\"]'))]"),["easy","true"]);
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
await test("Phases: block 1 is stabilisation (12–20 reps, slow tempo), block 3 the goal's phase; Training says which and what comes next; a new rep range gets an estimated weight",async page=>{
  const at=async(weeksAgo)=>page.evaluate(async w=>{const st=await import("/js/state.js"),U=await import("/js/util.js"),sc=await import("/js/engine/schedule.js");
    const d=new Date(U.today()+"T00:00:00");d.setDate(d.getDate()-7*w);
    st.S.block={start:sc.weekStartOf(new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10))};st.S.profile.goal="gain";st.saveDB();
    (await import("/js/ui/render.js")).render();},weeksAgo);
  await at(0);await coach(page,"train","program");await pause(page,300);
  const c1=await page.textContent('.blk');
  if(!/Stabilisation endurance/.test(c1)||!/12–20 reps/.test(c1)||!/4-2-1-1/.test(c1)||!/Next block: Strength endurance/.test(c1))throw new Error("block 1 card: "+c1);
  await tapTab(page,"train");await pause(page,300);await page.tap('[data-startday]');await pause(page,500);
  const e1=await ev(page,"S.active.entries.filter(e=>e.planned&&e.planned.lo&&!e.planned.timed&&e.planned.lo<30).map(e=>[e.planned.lo,e.planned.hi,e.planned.tempo||''])");
  eq(e1.length>2&&e1.every(x=>x[0]>=12&&x[1]<=20&&/4-2-1-1/.test(x[2])),true,"phase 1 doses: "+JSON.stringify(e1));
  /* Last time's best set was 8 reps: the 12–20 range gets a lighter, estimated weight. */
  const rec=await page.evaluate(async()=>{const st=await import("/js/state.js"),F=await import("/js/engine/formulas.js");const e=st.S.active.entries[0];return F.recommend(e);});
  if(rec&&rec.last){if(!rec.est||!(rec.w<parseFloat(rec.last)))throw new Error("no estimate for the new range: "+JSON.stringify(rec));}
  await page.evaluate(async()=>{const st=await import("/js/state.js");st.S.active=null;st.saveDB();});
  await at(9);await coach(page,"train","program");await pause(page,300);
  const c3=await page.textContent('.blk');
  if(!/Block 3/.test(c3)||!/Muscular development/.test(c3)||!/6–12 reps/.test(c3))throw new Error("block 3 card: "+c3);
});
await test("Cardio zones: Cardio & Sports opens with the stage and zones by feel; the talk test's heart rates make them bands; bad numbers are refused",async page=>{
  await tapTab(page,"train");await pause(page);
  await page.tap('[data-actsheet]');await pause(page,400);
  const c=await page.textContent('#sheet .zcard');
  if(!/Stage 1/.test(c)||!/Zone 1/.test(c)||!/talk comfortably/.test(c)||!/starting point only/.test(c))throw new Error("card: "+c);
  await page.tap('#sheet [data-zones]');await pause(page,400);
  await page.fill('#z_vt1','170');await page.fill('#z_vt2','150');await page.tap('[data-zsave="1"]');await pause(page,300);
  eq(await ev(page,"[V.sheet,S.profile.vt1]"),["zones",undefined],"VT2 below VT1 refused");
  await page.fill('#z_vt1','145');await page.fill('#z_vt2','165');await page.tap('[data-zsave="1"]');await pause(page,400);
  eq(await ev(page,"[V.sheet,S.profile.vt1,S.profile.vt2]"),["acts",145,165],"saved, back to the list");
  const rows=await page.$$eval('#sheet .zrows li .zb',a=>a.map(e=>e.textContent));
  eq(rows[0],"<145 bpm","zone 1 below VT1, as the book's example: "+JSON.stringify(rows));
});
await test("Experienced lifters choose: stabilisation is a suggestion they can skip (and take back); phase 2 pairs the bench with push-ups as a superset",async page=>{
  await page.evaluate(async()=>{const st=await import("/js/state.js"),sc=await import("/js/engine/schedule.js"),U=await import("/js/util.js"),Sp=await import("/js/data/splits.js");
    const p=st.makeProgram({id:"ss",name:"SS",days:[Sp.day("Upper",[Sp.ex("Barbell Bench Press - Medium Grip",3,6,10),Sp.ex("Bent Over Barbell Row",3,6,10)])]});p.id="ss";
    st.S.programs=[p];st.S.activeProgram="ss";st.S.profile.level="experienced";st.S.profile.goal="gain";delete st.S.profile.skipStab;st.S.profile.conds=[];
    st.S.block={start:sc.weekStartOf(U.today())};st.saveDB();(await import("/js/ui/render.js")).render();});
  await coach(page,"train","program");await pause(page,300);
  if(!(await page.$('.blk [data-skipstab="1"]')))throw new Error("no choice offered: "+(await page.textContent('.blk')));
  await page.tap('.blk [data-fold]');await pause(page,200);
  await page.tap('.blk [data-skipstab="1"]');await pause(page,300);
  eq(await page.evaluate(async()=>[(await import("/js/state.js")).S.profile.skipStab,((await import("/js/engine/blocks.js")).phaseNow()||{}).n]),[true,2],"skipped: block 1 runs strength endurance");
  await tapTab(page,"train");await pause(page,300);await page.tap('[data-startday]');await pause(page,500);
  const ex=await ev(page,"S.active.entries.map(e=>[e.name,e.grp||'',e.planned.lo,e.planned.hi])");
  eq([ex[0][0],ex[1][0],!!ex[0][1]&&ex[0][1]===ex[1][1],ex[2][1]],["Barbell Bench Press - Medium Grip","Pushups",true,""],"bench then push-ups as one superset, the row on its own: "+JSON.stringify(ex));
  await page.evaluate(async()=>{const st=await import("/js/state.js");st.S.active=null;st.saveDB();(await import("/js/ui/render.js")).render();});
  await coach(page,"train","program");await pause(page,300);
  if(!(await page.$('.blk.open')))await page.tap('.blk [data-fold]');await pause(page,200);
  await page.tap('.blk [data-skipstab="0"]');await pause(page,300);
  eq(await ev(page,"S.profile.skipStab"),false,"stabilisation back");
});
await test("Compact: the block card is one line until its arrow opens it, in place; My program's phase note goes with Got it and stays gone; the change-workout sheet folds the muscles",async page=>{
  await page.evaluate(async()=>{const st=await import("/js/state.js"),sc=await import("/js/engine/schedule.js"),U=await import("/js/util.js");
    st.S.profile.level="experienced";st.S.profile.goal="gain";st.S.profile.conds=[];delete st.S.profile.skipStab;
    st.S.block={start:sc.weekStartOf(U.today())};st.saveDB();(await import("/js/ui/render.js")).render();});
  await coach(page,"train","program");await pause(page,300);
  const shut=await page.evaluate(()=>{const b=document.querySelector('.blk'),f=b.querySelector('.fold-body');return [b.classList.contains('open'),getComputedStyle(f).display,/Stabilisation endurance/.test(b.querySelector('.blk-s').textContent),/\bbook\b/i.test(b.textContent)];});
  eq(shut,[false,"none",true,false],"folded, the phase in the header, no talk of a book");
  await page.evaluate(()=>{window.__blk=document.querySelector('.blk');});
  await page.tap('.blk [data-fold]');await pause(page,250);
  eq(await page.evaluate(()=>{const b=document.querySelector('.blk');return [b===window.__blk,b.classList.contains('open'),getComputedStyle(b.querySelector('.fold-body')).display,b.querySelector('[data-fold]').getAttribute('aria-expanded')];}),[true,true,"block","true"],"opened in place");
  await page.tap('.blk [data-fold]');await pause(page,250);
  eq(await page.evaluate(()=>document.querySelector('.blk').classList.contains('open')),false,"and closed again");
  /* My program: the note, then Got it. */
  await coach(page,"train","program");await pause(page,300);
  if(!(await page.$('.bphase')))throw new Error("no phase note on My program");
  await page.tap('.bphase [data-phaseseen]');await pause(page,200);
  eq(await page.evaluate(async()=>[!!document.querySelector('.bphase'),(await import("/js/state.js")).S.phaseSeen]),[false,1],"put away for this phase");
  await page.reload();await pause(page,1000);await coach(page,"train","program");await pause(page,300);
  eq(!!(await page.$('.bphase')),false,"still away after a reload");
  /* Change workout: one line, then the muscles. */
  await page.evaluate(async()=>{const st=await import("/js/state.js"),U=await import("/js/util.js");
    const sp=st.split(),d=sp.days.find(x=>x.ex.length);
    st.S.sessions.unshift({id:"rc1",date:U.today(),day:d.id,dayName:d.name,entries:d.ex.map(e=>({name:e.name,sets:[{w:40,r:10},{w:40,r:10},{w:40,r:10}]}))});st.saveDB();
    const a=await import("/js/ui/actions.js");a.openSheet("swapday",{date:(()=>{const x=new Date(U.today()+"T00:00:00");x.setDate(x.getDate()+1);return new Date(x.getTime()-x.getTimezoneOffset()*6e4).toISOString().slice(0,10);})()});});
  await pause(page,400);
  const r=await page.evaluate(()=>{const s=document.querySelector('#sheet .rcv');if(!s)return null;return [s.classList.contains('open'),getComputedStyle(s.querySelector('.fold-body')).display,/still recovering/.test(s.querySelector('.rcv-s').textContent)];});
  eq(r,[false,"none",true],"the recovery list folded to a line");
  await page.tap('#sheet .rcv [data-fold]');await pause(page,250);
  eq(await page.evaluate(()=>document.querySelectorAll('#sheet .rcv.open li').length>0),true,"the muscles on tap");
});
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
  await pause(page,600);
  await tapTab(page,"food");await pause(page,300);
  await page.tap('#cfab .cfab');await pause(page,400);
  eq(await page.$$eval('#cpanel .cp-sug [data-chatq]',a=>a.map(b=>b.dataset.chatq)),["rest","eat","protein"],"Food's questions");
});
await test("Search sheets: typing, then the first tap on a result's + adds it (the title coming back used to push the list down under the finger)",async page=>{
  await tapTab(page,"food");await pause(page,300);
  await page.tap('#app .btn:has-text("Add Food")');await pause(page,500);
  await page.tap('#fq');await page.fill('#fq','egg');await pause(page,600);
  await page.tap('#sheet [data-quickfood="egg"]');await pause(page,500);
  eq(await page.evaluate(async()=>{const S=(await import("/js/state.js")).S,U=await import("/js/util.js");const r=S.days[U.today()];return r&&r.meals&&Object.values(r.meals).some(m=>(m.items||[]).some(i=>i.fid==="egg"));}),true,"the egg is logged on the first tap");
});
await test("Weigh-in: with a weight on record, the figure starts from it and can be typed, not only stepped in tenths",async page=>{
  await page.evaluate(async()=>{(await import("/js/ui/actions.js")).openSheet("weigh");});await pause(page,300);
  eq(await page.$eval('#in_bw',e=>e.value),"84","from the last weight");
  await page.fill('#in_bw','79.6');await page.tap('[data-saveweight]');await pause(page,300);
  eq(await ev(page,"S.body[S.body.length-1].weight"),79.6,"typed, saved");
});
await test("Audit: the equipment and favourites sheets in Arabic; the water glasses wide enough to tap; the assessment says which figure is out of range",async page=>{
  await page.evaluate(async()=>{(await import("/js/state.js")).S.prefs.lang="ar";(await import("/js/ui/render.js")).render();});await pause(page,300);
  for(const sh of ["gear","likes"]){
    await page.evaluate(async s=>{(await import("/js/ui/actions.js")).openSheet(s);},sh);await pause(page,300);
    const en=await page.evaluate(()=>(document.querySelector("#sheet").innerText.match(/[A-Za-z]{3,}/g)||[]));
    eq(en,[],sh+": no English left");
    await page.evaluate(async()=>{(await import("/js/ui/actions.js")).closeSheet();});await pause(page,300);}
  await page.evaluate(async()=>{(await import("/js/state.js")).S.prefs.lang="en";const V=(await import("/js/ui/view.js")).V;V.tab="food";V.meal=null;(await import("/js/ui/render.js")).render();});await pause(page,400);
  const g=await page.$$eval('.fglass',a=>a.map(e=>e.getBoundingClientRect().width));
  if(!g.length||Math.min(...g)<18)throw new Error("a glass too narrow to tap: "+g);
  await page.evaluate(async()=>{const S=(await import("/js/state.js")).S,V=(await import("/js/ui/view.js")).V;S.onboarded=false;V.assess=true;V.asd=null;(await import("/js/ui/render.js")).render();});await pause(page,400);
  await page.tap('#app [data-asnext]');await pause(page,300);
  await page.fill('#as_age','30');await page.fill('#as_height','30');await page.fill('#as_weight','84');
  await page.evaluate(()=>["as_age","as_height","as_weight"].forEach(id=>document.getElementById(id).dispatchEvent(new Event("change",{bubbles:true}))));
  await page.tap('#app [data-asnext]');await pause(page,300);
  eq(await page.$eval('.toast',e=>e.textContent.trim()),"Height: 120 to 230 cm.","the figure out of range, and its range");
});
await test("Settings: every choice in sight, switches that say their state, a tap sets the value; no drop-down anywhere",async page=>{
  await sheet(page,"set_training");
  /* With haptics on the row is a label around the native switch, which says its own state. */
  const sw=()=>page.$eval('[data-toggle="nowarm"]',e=>{const i=e.querySelector(":scope>.hapt-in");return i?["switch",String(i.checked)]:[e.getAttribute("role"),e.getAttribute("aria-checked")];});
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
await test("Training: no bell (the dock's Coach tab is that, with its dot); the initial opens Profile",async page=>{
  await tapTab(page,"train");await pause(page);
  const n=await ev(page,"V.advice");
  eq(await page.$$eval('.hacts [data-csec]',a=>a.length),0,"no second way to the Coach page");
  eq(await page.$eval('nav .dock-b[data-tab="coach"]',e=>e.classList.contains("advice")),n>0,"the dock's Coach tab carries the dot when there is something");
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
  /* The coach's answer bank answers it now (js/data/faq.js), under its own heading. */
  eq(r.topic,"Sleep","not soreness");
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
  eq([await ev(page,"V.tab"),await ev(page,"V.fplan")],["food","plan"],"meal plan opened");
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
await test("Haptics: on an iPhone no tap pretends to tick (no switch clicked from code); the complete-set control is the real one, a switch under the person's own tap",async page=>{
  const r=await page.evaluate(async()=>{
    const V=await import("/js/ui/view.js"),S=(await import("/js/state.js")).S;S.prefs.haptic=true;
    /* The old trick clicked a hidden switch from code on every tap: it gave nothing on the
       owner's iPhone (tests/haptics.html, 3 Nov), so nothing like it may come back. */
    let made=0;const mo=new MutationObserver(m=>m.forEach(x=>x.addedNodes.forEach(n=>{if(n.querySelector&&(n.matches("input[switch]")||n.querySelector("input[switch]")))made++;})));
    mo.observe(document,{childList:true,subtree:true});
    V.tap("light");V.tap("ok");await new Promise(r=>setTimeout(r,30));mo.disconnect();
    return [made,typeof V.canBuzz(),V.canBuzz()];});
  eq(r,[0,"boolean",true],"tap() adds no switch; the setting is still offered on an iPhone");
  await startWorkout(page);
  eq(await page.evaluate(()=>{const l=document.querySelector('.sess [data-logset]');return [l.tagName,!!l.querySelector('input[type=checkbox][switch]')];}),["LABEL",true],"the complete-set control carries the switch");
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
  eq(await ev(page,"[V.sheet,!!V.coach]"),[null,true],"inline, not modal");
  await page.tap('#cpanel [data-agok]');await pause(page,500);
  r=await agLast(page);
  const after=await dayEx(page,2);
  eq([after.length,/^Added .+ to Full Body B\.$/.test(r.done.replace(/Undo$/,"")),await ev(page,"!!V.coach")],[before.length+1,true,true],"applied, said, the panel still open");
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
  if(!(await page.$('#sheet .ibread')))throw new Error("the reading does not open where it was saved");
  await page.evaluate(async()=>{(await import("/js/ui/actions.js")).closeSheet();});await pause(page,400);
  await page.evaluate(async()=>{const V=(await import("/js/ui/view.js")).V;V.tab="progress";V.ptab="body";(await import("/js/ui/render.js")).render();});await pause(page,500);
  const pg=await page.evaluate(()=>document.body.innerText);
  if(!/From your InBody test/.test(pg)||!/Skeletal muscle mass/.test(pg))throw new Error("Progress doesn't show it");
  await openChat(page);
  await agSay(page,"what does my inbody say");await pause(page,300);
  const x=await page.evaluate(()=>{const e=[...document.querySelectorAll("#cpanel .chat-x")].pop();e.querySelectorAll(".chat-more").forEach(d=>d.open=true);return [(e.querySelector(".chat-at")||{}).textContent,e.innerText.replace(/[\u2066-\u2069]/g,"")];});
  eq(x[0],"Your InBody","the coach reads it");
  if(!/body fat 19\.6%/.test(x[1])||!/within the usual range for most men \(10–20%\)/.test(x[1])||!/Mifflin-St Jeor/.test(x[1]))throw new Error("answer: "+x[1]);
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
    /* Read where it was saved, in a sheet, not by sending you to the chat (owner, 3 Nov). */
    const x=await page.evaluate(()=>{const e=document.querySelector("#sheet .ibread");if(!e)return null;
      e.querySelectorAll(".chat-more").forEach(d=>d.open=true);
      return [(document.querySelector("#sheet h2")||{}).textContent,e.innerText.replace(/[⁦-⁩]/g,""),!!e.querySelector('[data-sheet="set_you"]')];});
    if(!x)throw new Error("the reading did not open on saving");
    eq(x[0],"What your InBody says","the coach reads it at once");
    if(!/above the usual range for most men/.test(x[1]))throw new Error("answer: "+x[1]);
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
await test("A day told in one message, in Arabic with the app in English: the foods found with their meals, the sweets asked about, the chest workout noted, what else to do; one tap adds it all, with Undo",async page=>{
  await page.evaluate(async()=>{const st=await import("/js/state.js");st.S.prefs.lang="en";st.S.goals.p=160;st.S.goals.kcal=2400;st.S.goals.water=3000;st.S.days={};});
  await openChat(page);
  await page.fill('#chatq',"اتا كلت بيض النهاردة في ساندويتش و سكريات الصبح مش عارف قد ايه بالظبط، و كلت فراخ اخر النهار، و اتمرنت صدر في الجيم، ايه تاني ممكن اعمله؟ ولو ينفع تدخلي المعلومات ديه في اليوم بتاعي");
  await page.press('#chatq','Enter');await pause(page,700);
  const x=await page.evaluate(()=>{const e=[...document.querySelectorAll("#cpanel .chat-x")].pop();return {lang:e.getAttribute("lang"),items:[...e.querySelectorAll(".ag-item b")].map(b=>b.textContent),
    notes:[...e.querySelectorAll(".ag-notes li")].map(l=>l.textContent),ok:!!e.querySelector(".ag-ok")};});
  eq([x.lang,x.items,x.ok],["ar",["ساندوتش بيض · الفطار","فراخ مشوية · العشا"],true],"answered in Arabic: the egg sandwich at breakfast, chicken at dinner, one button");
  const all=x.notes.join(" | ");
  for(const re of [/تمرين الصدر/,/البروتين: فاضل/,/سكريات/,/الكميات حصة عادية/])if(!re.test(all))throw new Error("missing "+re+" in "+all);
  await page.tap('#cpanel .chat-x.live .ag-ok');await pause(page,500);
  const day=()=>page.evaluate(async()=>{const st=await import("/js/state.js"),U=await import("/js/util.js");const r=st.S.days[U.today()]||{meals:{}};
    return Object.keys(r.meals).sort().map(k=>k+":"+(r.meals[k].items||[]).map(i=>i.fid).join(","));});
  eq(await day(),["Breakfast:egg_sandwich","Dinner:chicken_breast_ck"],"added to today, each to its meal");
  await page.tap('#cpanel .ag-undo');await pause(page,400);
  eq(await day(),[],"Undo takes it all back");
});
await test("Chat motion: typing, bigger or smaller keeps the field, its text and the keyboard; a tap on send keeps them; the panel and its box ease with the keyboard",async page=>{
  await openChat(page);
  await page.tap('#chatq');await page.fill('#chatq','how much protein');
  await page.evaluate(()=>{const q=document.getElementById("chatq");q.setSelectionRange(4,8);});
  /* It grows by itself once the keyboard is up (coachfab.js bindPanel). */
  await pause(page,1400);
  eq(await page.evaluate(()=>{const q=document.activeElement;return [!!document.querySelector(".cp.full"),q&&q.id,q&&q.value,q&&q.selectionStart,q&&q.selectionEnd];}),
    [true,"chatq","how much protein",4,8],"made bigger while typing: the same text, the caret where it was, still focused");
  await page.tap('[data-coachsize="compact"]');await pause(page,700);
  eq(await page.evaluate(()=>[!document.querySelector(".cp.full"),document.activeElement&&document.activeElement.id]),[true,"chatq"],"and smaller again, still typing");
  const f0=await page.$eval('#chatq',e=>{const r=e.getBoundingClientRect();return r.top+r.height/2;});
  /* Read the flying words the moment they are added, not after a fixed wait a loaded
     machine can overshoot or undershoot. */
  await page.evaluate(()=>{window.__ghost=null;const o=new MutationObserver(()=>{const g=document.querySelector(".chat-ghost");if(!g||window.__ghost)return;
    const r=g.getBoundingClientRect();window.__ghost={z:+getComputedStyle(g).zIndex,pz:+getComputedStyle(document.getElementById("cpanel")).zIndex,mid:r.top+r.height/2,text:g.textContent.trim()};o.disconnect();});
    o.observe(document.body,{childList:true,subtree:true});});
  await page.tap('.cp-send');
  await page.waitForFunction(()=>!!window.__ghost,null,{timeout:3000,polling:"raf"}).catch(()=>{});
  const g=await page.evaluate(()=>window.__ghost);
  if(!g)throw new Error("no message flying from the box");
  eq([g.z>g.pz,/how much protein/i.test(g.text)],[true,true],"the sent words fly over the panel, not behind it");
  if(Math.abs(g.mid-f0)>60)throw new Error("it does not leave from the box: "+g.mid+" vs "+f0);
  await pause(page,900);
  eq(await page.evaluate(()=>[!!document.querySelector(".chat-ghost"),getComputedStyle([...document.querySelectorAll("#cpB .chat-q")].pop()).visibility]),[false,"visible"],"and lands: its place in the conversation shows it");
  eq(await page.evaluate(()=>[document.activeElement&&document.activeElement.id,document.getElementById("chatq").value]),["chatq",""],"sent: the field keeps the focus (the keyboard stays), emptied");
  const tr=await page.evaluate(()=>[getComputedStyle(document.getElementById("cpanel")).transitionProperty,getComputedStyle(document.querySelector("#cpanel .cp")).transitionProperty]);
  if(!/top/.test(tr[0])||!/height/.test(tr[0])||!/max-height/.test(tr[1]))throw new Error("transitions: "+tr);
},{prefs:{anim:true}});
await test("Chat, iPhone keyboard closed with Done: the panel glides once to its place, no bounce, whatever iOS reports on the way",async page=>{
  const vv=()=>page.evaluate(()=>[getComputedStyle(document.documentElement).getPropertyValue("--vvh").trim(),getComputedStyle(document.documentElement).getPropertyValue("--vvt").trim()]);
  const ih=await page.evaluate(()=>innerHeight);
  await openChat(page);
  await page.evaluate(async()=>{const c=await import("/js/ui/views/chat.js");document.getElementById("chatq").value="how much protein";});
  await page.press('#chatq','Enter');await pause(page,500);
  /* The keyboard up: iOS says what it leaves once it has finished. */
  await page.tap('#chatq');await pause(page,100);
  await page.evaluate(h=>{const v=window.visualViewport;v._h=h;v._t=0;v.dispatchEvent(new Event("resize"));},ih-300);await pause(page,600);
  eq((await vv())[0],(ih-300)+"px","up: the panel above the keyboard");
  /* Done: the field lets go, and iOS reports its way down, the page still offset. */
  const samples=[];
  await page.evaluate(()=>{window.__s=[];const cp=document.querySelector("#cpanel .cp");const t0=performance.now();
    (function f(){const r=cp.getBoundingClientRect();window.__s.push([Math.round(performance.now()-t0),Math.round(r.top),Math.round(r.bottom)]);if(performance.now()-t0<1100)requestAnimationFrame(f);})();
    document.getElementById("chatq").blur();});
  for(const [h,t,ms] of [[ih-200,40,90],[ih-90,60,120],[ih-20,30,120]]){await pause(page,ms);
    await page.evaluate(([h,t])=>{const v=window.visualViewport;v._h=h;v._t=t;v.dispatchEvent(new Event("scroll"));v.dispatchEvent(new Event("resize"));},[h,t]);}
  eq(await vv(),[ih+"px","0px"],"down: the whole screen at once, nothing in between taken");
  await pause(page,900);
  await page.evaluate(h=>{const v=window.visualViewport;v._h=h;v._t=0;v.dispatchEvent(new Event("resize"));},ih);await pause(page,200);
  const s2=await page.evaluate(()=>window.__s);
  /* One way only: the bottom edge moves down and never back up; the top never turns. */
  const turns=k=>{let dir=0,n=0;for(let i=1;i<s2.length;i++){const d=s2[i][k]-s2[i-1][k];if(Math.abs(d)<1)continue;const sg=Math.sign(d);if(dir&&sg!==dir)n++;dir=sg;}return n;};
  eq([turns(1),turns(2)],[0,0],"no bounce: "+JSON.stringify(s2.filter((x,i)=>i%6===0)));
  const last=s2[s2.length-1],first=s2[0];
  if(!(last[2]>first[2]+100))throw new Error("it did not move down to its place: "+JSON.stringify([first,last]));
},{prefs:{anim:true},ua:"Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  init:()=>{const real=window.visualViewport;const fake=new EventTarget();fake._h=null;fake._t=0;
    Object.defineProperty(fake,"height",{get(){return fake._h==null?innerHeight:fake._h;}});
    Object.defineProperty(fake,"offsetTop",{get(){return fake._t;}});
    Object.defineProperty(fake,"width",{get(){return innerWidth;}});
    Object.defineProperty(window,"visualViewport",{get(){return fake;},configurable:true});}});
await test("A missed day: moved to a free day with rest either side, or its key lift carried into the next day and into that workout; each with Undo, offered once",async page=>{
  const setUp=async(full)=>page.evaluate(async(full)=>{
    const st=await import("/js/state.js"),S=st.S,U=await import("/js/util.js"),Sc=await import("/js/engine/schedule.js"),Sp=await import("/js/data/splits.js");
    const now=U.today(),add=n=>{const d=new Date(now+"T00:00:00");d.setDate(d.getDate()+n);return new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);};
    /* The week starts two days ago, so yesterday is always in it. */
    S.prefs.wkstart=Sc.isoWeekday(add(-2));
    const PULL=[Sp.ex("Bent Over Barbell Row",3,8,12),Sp.ex("Wide-Grip Lat Pulldown",3,8,12)],PUSH=[Sp.ex("Barbell Bench Press - Medium Grip",3,8,12),Sp.ex("Standing Military Press",3,8,12)],
          LEGS=[Sp.ex("Barbell Squat",3,8,12),Sp.ex("Romanian Deadlift",3,8,12)];
    const days=[Sp.day("Pull",PULL)],wd=n=>[Sc.isoWeekday(add(n))];
    days[0].wd=wd(-1);
    if(full){[[0,"Push",PUSH],[1,"Legs",LEGS],[2,"Push",PUSH],[3,"Legs",LEGS],[4,"Push",PUSH],[-2,"Legs",LEGS]].forEach(([n,nm,ex])=>{const d=Sp.day(nm,JSON.parse(JSON.stringify(ex)));d.wd=wd(n);days.push(d);});}
    else{const d=Sp.day("Push",PUSH);d.wd=wd(1);days.push(d);const l=Sp.day("Legs",LEGS);l.wd=wd(3);days.push(l);}
    const p=st.makeProgram({id:"miss",name:"Mine",days:days});p.schedule="week";
    days.forEach((d,i)=>{p.days[i].wd=d.wd;});
    S.programs=[p];S.activeProgram=p.id;S.sessions=[];S.daySwap={};delete S.dayAdd;delete S.missedDone;S.profile.mins=90;st.saveDB();
    const V=(await import("/js/ui/view.js")).V;V.assess=false;V.tab="train";V.train="days";V.tdate=null;(await import("/js/ui/render.js")).render();},full);
  await setUp(false);await pause(page,300);
  const c1=await page.textContent('#app');
  if(!/You missed Pull on/.test(c1)||!(await page.$('[data-missdo="move"]')))throw new Error("no offer to move the missed day: "+c1.slice(0,400));
  await page.tap('[data-missdo="move"]');await pause(page,300);
  eq(await page.evaluate(async()=>{const st=await import("/js/state.js"),U=await import("/js/util.js");const sp=st.split();return [sp.days.find(d=>d.id===st.S.daySwap[U.today()]).name,document.querySelector('.thero2-n').textContent];}),["Pull","Pull"],"moved to today, a free day with no back work either side");
  if(await page.$('[data-missdo]'))throw new Error("offered again after it was dealt with");
  await page.tap('.toast-undo');await pause(page,300);
  eq(await ev(page,"[Object.keys(S.daySwap||{}).length,!!document.querySelector('[data-missdo=\"move\"]')]"),[0,true],"Undo: back as it was, and offered again");
  /* Every day of the week taken: the row goes into today's Push, two sets, and into its workout. */
  await setUp(true);await pause(page,300);
  if(!(await page.$('[data-missdo="fold"]')))throw new Error("no offer to carry the key lift: "+(await page.textContent('#app')).slice(0,400));
  if(!/Bent Over Barbell Row, 2 sets, today/.test(await page.textContent('.reco')))throw new Error("the lift and its sets not named");
  await page.tap('[data-missdo="fold"]');await pause(page,300);
  if(!/plus Bent Over Barbell Row from a missed day/.test(await page.textContent('.thero2')))throw new Error("today's card does not say what was carried");
  await page.tap('.thero2 [data-startday]');await pause(page,500);
  eq(await ev(page,"S.active.entries.map(e=>[e.name,e.planned.sets])"),[["Barbell Bench Press - Medium Grip",3],["Standing Military Press",3],["Bent Over Barbell Row",2]],"the workout carries it");
  /* Arabic. */
  await page.evaluate(async()=>{const st=await import("/js/state.js");st.S.active=null;delete st.S.missedDone;delete st.S.dayAdd;st.S.prefs.lang="ar";(await import("/js/i18n/exnames.js")).applyLang();(await import("/js/ui/render.js")).render();});
  await pause(page,300);
  if(!/فاتك/.test(await page.textContent('.reco')))throw new Error("not in Arabic");
});
await test("Change workout judges each day against the muscles: after Full A today, every full-body day is too soon tomorrow, rest is the best fit, and one picked anyway asks first",async page=>{
  const setUp=async(kind)=>page.evaluate(async kind=>{
    const st=await import("/js/state.js"),S=st.S,U=await import("/js/util.js"),Sp=await import("/js/data/splits.js"),Sc=await import("/js/engine/schedule.js");
    const add=n=>{const d=new Date(U.today()+"T00:00:00");d.setDate(d.getDate()+n);return new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);};
    const E=(n,s)=>Sp.ex(n,s,8,12);
    const FULL=n=>[E("Barbell Squat",3),E("Barbell Bench Press - Medium Grip",3),E("Bent Over Barbell Row",3),E("Standing Military Press",2)];
    const UP=[E("Barbell Bench Press - Medium Grip",4),E("Bent Over Barbell Row",4),E("Standing Military Press",3)],LO=[E("Barbell Squat",4),E("Romanian Deadlift",4),E("Leg Press",3)];
    const days=kind==="full"?[Sp.day("Full Body A",FULL()),Sp.day("Full Body B",FULL()),Sp.day("Full Body C",FULL())]:[Sp.day("Upper",UP),Sp.day("Lower",LO)];
    const p=st.makeProgram({id:"pp",name:"P",days});p.schedule="week";
    p.days.forEach((d,i)=>{d.wd=[Sc.isoWeekday(add(i*(kind==="full"?2:3)))];});
    S.programs=[p];S.activeProgram="pp";S.sessions=[];S.daySwap={};st.saveDB();
    const V=(await import("/js/ui/view.js")).V;V.assess=false;V.tab="train";V.tdate=add(1);V.twkBase=null;(await import("/js/ui/render.js")).render();return add(1);},kind);
  const tm=await setUp("full");await pause(page,300);
  await page.evaluate(async d=>{(await import("/js/ui/actions.js")).openSheet("swapday",{date:d});},tm);await pause(page,400);
  const rows=await page.$$eval('#sheet [data-swapto]',a=>a.map(b=>[b.getAttribute("data-swapto"),b.classList.contains("warn"),b.textContent]));
  const full=rows.filter(r=>/Full/.test(r[2]));
  eq([full.length,full.every(r=>r[1]&&/Too soon for/.test(r[2]))],[3,true],"every full-body day too soon the day after Full A: "+JSON.stringify(rows));
  eq(rows.filter(r=>/Best fit/.test(r[2])).map(r=>r[0]),["rest"],"rest is the best fit");
  if(!(await page.$('#sheet .swnote [data-actsheet]')))throw new Error("no word on why, nor easy cardio offered for recovery");
  const rcv=await page.$$eval('#sheet .rcv li',a=>a.map(l=>[l.querySelector('.rcv-m').textContent,l.querySelector('.rcv-p').textContent,l.querySelector('.rcv-d').textContent]));
  eq(rcv.length>0&&rcv.length<=6&&rcv.every(r=>/^≈(0|25|50|75)%$/.test(r[1])&&/^ready /.test(r[2])),true,"each muscle's recovery in quarters, with the day it is ready: "+JSON.stringify(rcv));
  await page.tap('#sheet .trow.warn');await pause(page,400);
  const cf=await page.textContent('#sheet');
  if(!/anyway\?/.test(cf)||!/at least a day between sessions/.test(cf))throw new Error("no question before a day too soon: "+cf.slice(0,300));
  await page.tap('#sheet [data-confirmmid]');await pause(page,400);
  eq(await ev(page,"[V.sheet,Object.keys(S.daySwap||{}).length]"),["swapday",0],"Pick another goes back, nothing changed");
  await page.tap('#sheet .trow.warn');await pause(page,400);
  await page.tap('#sheet [data-confirmok]');await pause(page,400);
  eq(await ev(page,"Object.keys(S.daySwap||{}).length"),1,"trained anyway: the person decides");
  await pause(page,300);
  eq(await page.$eval('.wkr [data-wkday="'+tm+'"]',b=>b.classList.contains("soon")),true,"the week rail marks the day too soon");
  /* Upper/Lower: after Upper today, Lower is ready and the best fit; Upper again is too soon. */
  const tm2=await setUp("ul");await pause(page,300);
  await page.evaluate(async d=>{(await import("/js/ui/actions.js")).openSheet("swapday",{date:d});},tm2);await pause(page,400);
  const r2=await page.$$eval('#sheet [data-swapto]',a=>a.map(b=>[b.querySelector(".trow-n").textContent,b.classList.contains("warn"),/Best fit|Selected/.test(b.textContent),/Ready/.test(b.textContent)]));
  eq(r2.filter(r=>r[0]==="Upper")[0].slice(1,2),[true],"Upper again is too soon: "+JSON.stringify(r2));
  eq(r2.filter(r=>r[0]==="Lower")[0][3],true,"Lower is ready");
});
await test("Tomorrow follows today, live, in a rotation as on weekdays: today changed to Pull moves a rotation on to Legs, and on weekdays offers Legs for tomorrow's Pull",async page=>{
  const setUp=async(week)=>page.evaluate(async(week)=>{
    const st=await import("/js/state.js"),S=st.S,U=await import("/js/util.js"),Sp=await import("/js/data/splits.js");
    const add=n=>{const d=new Date(U.today()+"T00:00:00");d.setDate(d.getDate()+n);return new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);};
    const PUSH=[Sp.ex("Barbell Bench Press - Medium Grip",4,8,12),Sp.ex("Standing Military Press",3,8,12)],PULL=[Sp.ex("Bent Over Barbell Row",4,8,12),Sp.ex("Wide-Grip Lat Pulldown",3,8,12),Sp.ex("Barbell Curl",3,8,12)],
          LEGS=[Sp.ex("Barbell Squat",4,8,12),Sp.ex("Romanian Deadlift",3,8,12)];
    const p=st.makeProgram({id:"ppl",name:"PPL",days:[Sp.day("Push",PUSH),Sp.day("Pull",PULL),Sp.day("Legs",LEGS)]});
    const wd=n=>{const x=new Date(add(n)+"T00:00:00");return x.getDay()||7;};
    if(week){p.schedule="week";p.days[0].wd=[wd(0)];p.days[1].wd=[wd(1)];p.days[2].wd=[wd(3)];S.sessions=[];}
    else{const ss=(n,d)=>({id:"r"+n,date:add(n),dayId:d.id,dayName:d.name,entries:d.ex.map(e=>({name:e.name,sets:[{w:60,r:8},{w:60,r:8}]}))});
      S.sessions=[ss(-2,p.days[2]),ss(-3,p.days[1]),ss(-4,p.days[0])];}
    S.programs=[p];S.activeProgram=p.id;S.daySwap={[U.today()]:p.days[1].id};delete S.missedDone;st.saveDB();
    const V=(await import("/js/ui/view.js")).V;V.assess=false;V.tab="train";V.train="days";V.tdate=null;(await import("/js/ui/render.js")).render();},week);
  await setUp(false);await pause(page,300);
  if(!/Your rotation follows on from Pull: tomorrow is Legs\./.test(await page.textContent('#app')))throw new Error("rotation: tomorrow not said: "+(await page.textContent('.thero2')));
  await railTo(page,await page.evaluate(async()=>{const U=await import("/js/util.js");const d=new Date(U.today()+"T00:00:00");d.setDate(d.getDate()+1);
    return new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);}));
  eq(await page.textContent('.thero2-n'),"Legs","rotation: tomorrow is Legs, not Pull again");
  await setUp(true);await pause(page,300);
  const card=await page.textContent('#app');
  if(!/Tomorrow's Pull lands mostly on back/.test(card)||!(await page.$('[data-recoswap]')))throw new Error("weekdays: no word on tomorrow: "+card.slice(0,600));
  await page.tap('.reco [data-recoswap]');await pause(page,300);
  eq(await page.evaluate(async()=>{const st=await import("/js/state.js"),U=await import("/js/util.js");const d=new Date(U.today()+"T00:00:00");d.setDate(d.getDate()+1);
    const tm=new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);return st.split().days.find(x=>x.id===st.S.daySwap[tm]).name;}),"Legs","weekdays: tomorrow is Legs");
});
await test("Training calendar: the week rail opens to the month inside its own card, a dot for a day trained, a ring for one planned; a past day shows below",async page=>{
  await tapTab(page,"train");await pause(page,300);
  eq(await page.$$eval('#app .wkr',a=>a.length),1,"one rail");
  eq(await page.$$eval('#app .dnav-card',a=>a.length),0,"no day bar on Training");
  await page.tap('.wkr [data-wkopen]');await pause(page,800);
  const g=await page.evaluate(()=>{const c=document.querySelector(".wkr"),f=c.querySelector(".dbfold"),cal=f&&f.querySelector(".dbcal"),w=c.querySelector(".wkr-fold");
    return [c.classList.contains("open"),!!f&&f.parentElement===c,f.getBoundingClientRect().height>200,getComputedStyle(cal).backgroundColor==="rgba(0, 0, 0, 0)",
      parseFloat(getComputedStyle(cal).borderTopWidth)>0,w.hasAttribute("inert")&&w.getBoundingClientRect().height<2];});
  eq(g,[true,true,true,true,true,true],"open: the month inside the rail's card, under a hairline, the week folded away");
  eq(await page.evaluate(()=>!!document.querySelector(".wkr .dbday .dbdot.p")),true,"planned days ringed");
  await page.tap('.wkr [data-dmonth="-1"]');await pause(page,300);
  const past=await page.evaluate(()=>{const b=[...document.querySelectorAll(".wkr .dbday.trained")].pop();return b&&b.getAttribute("data-dpick");});
  if(!past)throw new Error("no training day dotted in the month before");
  await page.tap('.wkr [data-dpick="'+past+'"]');await pause(page,700);
  eq(await page.evaluate(async()=>[(await import("/js/ui/view.js")).V.tdate,document.querySelector(".wkr").classList.contains("open"),
    !!document.querySelector('.wkr [data-wkday="'+(await import("/js/ui/view.js")).V.tdate+'"].sel')]),[past,false,true],"the day picked, the month folded back, its week on the rail");
  if(!(await page.$('.thero2 [data-openday="'+past+'"]')))throw new Error("its session is not offered below");
},{prefs:{anim:true}});
await test("Training's week rail: words for the days, the pill glides to the day tapped, weeks page and swipe, marks for done, planned and moved",async page=>{
  const iso=await page.evaluate(async()=>{const st=await import("/js/state.js"),S=st.S,U=await import("/js/util.js"),sc=await import("/js/engine/schedule.js");
    const days=sc.weekDates(sc.weekStartOf(U.today())),sp=st.split();
    S.daySwap=S.daySwap||{};const later=days.filter(d=>d>U.today());if(later.length)S.daySwap[later[0]]=sp.days[0].id;st.saveDB();
    (await import("/js/ui/render.js")).render();return days;});
  await tapTab(page,"train");await pause(page,300);
  const r=await page.evaluate(()=>{const c=[...document.querySelectorAll(".wkr .wkr-d")];
    return [c.length,c.every(b=>b.querySelector(".wkr-t").textContent.trim().length>0),c.filter(b=>b.classList.contains("sel")).length,
      c.every(b=>b.querySelector(".wkr-t").scrollWidth<=b.querySelector(".wkr-t").clientWidth+1)];});
  eq(r,[7,true,1,true],"seven days, each with its word, the word fits, one chosen");
  eq(await page.$eval(".wkr .wkr-d",b=>b.getAttribute("data-wkday")),iso[0],"Saturday first");
  if(await page.evaluate(()=>!!document.querySelector(".wkr .wkr-d.today ~ .wkr-d"))){
    const nx=await page.$eval(".wkr .wkr-d.today ~ .wkr-d",b=>b.getAttribute("data-wkday"));
    eq(await page.$eval('.wkr [data-wkday="'+nx+'"]',b=>!!b.querySelector(".wkr-sw")),true,"the moved day carries its mark");
    const x0=await page.$eval(".wkr-hl",e=>e.getBoundingClientRect().left);
    await page.tap('.wkr [data-wkday="'+nx+'"]');await pause(page,500);
    const x1=await page.$eval(".wkr-hl",e=>e.getBoundingClientRect().left);
    eq([await page.$eval(".wkr-r",e=>e.style.getPropertyValue("--i")),x1!==x0],[String(iso.indexOf(nx)),true],"the pill moves to the day");}
  const first=await page.$eval(".wkr .wkr-d",b=>b.getAttribute("data-wkday"));
  eq(await page.$$eval('.wkr [data-wkpage]',a=>a.map(b=>b.getBoundingClientRect().width<=1)),[true,true],"no arrows on screen: paging is a swipe");
  await page.$eval('.wkr [data-wkpage="1"]',b=>b.click());await pause(page,300);
  const f2=await page.$eval(".wkr .wkr-d",b=>b.getAttribute("data-wkday"));
  eq(Math.round((Date.parse(f2)-Date.parse(first))/864e5),7,"next week");
  eq(await page.textContent(".wkr-ti b"),"Next week");
  if(!/ – /.test(await page.textContent(".wkr-p")))throw new Error("no date range under the title");
  if(!(await page.$('.wkr [data-wktoday]')))throw new Error("no Today on another week");
  /* A swipe back, as a finger would, pages back. */
  await page.evaluate(()=>{const r=document.querySelector(".wkr-r"),b=r.getBoundingClientRect(),y=b.top+b.height/2;
    const T=(x)=>new Touch({identifier:1,target:r,clientX:x,clientY:y});
    r.dispatchEvent(new TouchEvent("touchstart",{bubbles:true,cancelable:true,touches:[T(b.left+40)],changedTouches:[T(b.left+40)]}));
    r.dispatchEvent(new TouchEvent("touchmove",{bubbles:true,cancelable:true,touches:[T(b.left+200)],changedTouches:[T(b.left+200)]}));
    r.dispatchEvent(new TouchEvent("touchend",{bubbles:true,cancelable:true,touches:[],changedTouches:[T(b.left+200)]}));});
  await pause(page,400);
  eq(await page.$eval(".wkr .wkr-d",b=>b.getAttribute("data-wkday")),first,"swiped back to this week");
});
await test("Training's week rail: the chosen day tapped again unfolds what it holds in the card; again or a tap outside folds it",async page=>{
  await tapTab(page,"train");await pause(page,300);
  const st=()=>page.evaluate(()=>{const c=document.querySelector(".wkr"),pk=c.querySelector(".wkr-pk");
    return [c.classList.contains("peek"),pk.inert,Math.round(pk.getBoundingClientRect().height)>40,(e=>(e.querySelector(":scope>.hapt-in")||e).getAttribute("aria-expanded"))(document.querySelector(".wkr-d.sel"))];});
  eq(await st(),[false,true,false,"false"],"folded at first");
  await page.evaluate(()=>{window.__keep=document.querySelector(".wkr-days");});
  await page.tap(".wkr .wkr-d.sel");await pause(page,700);
  eq(await st(),[true,false,true,"true"],"unfolded");
  eq(await page.evaluate(()=>window.__keep===document.querySelector(".wkr-days")),true,"nothing drawn again");
  const t=await page.textContent(".wkr-pk-c");
  if(!/exercises/.test(t)||!/sets/.test(t)||!/Estimated/.test(t))throw new Error("no size or estimate: "+t);
  if(!(await page.$(".wkr-pk-mu span")))throw new Error("no muscles");
  await page.tap(".wkr .wkr-d.sel");await pause(page,700);
  eq((await st()).slice(0,2),[false,true],"folded again");
  await page.tap(".wkr .wkr-d.sel");await pause(page,500);
  await page.tap(".thero2-n");await pause(page,700);
  eq((await st())[0],false,"a tap outside folds it");
  /* Another day picked while it is open: the card shows that day. */
  await page.tap(".wkr .wkr-d.sel");await pause(page,400);
  const other=await page.$eval(".wkr .wkr-d:not(.sel)",b=>b.getAttribute("data-wkday"));
  await page.tap('.wkr [data-wkday="'+other+'"]');await pause(page,500);
  eq(await page.evaluate(o=>[document.querySelector(".wkr").classList.contains("peek"),!!document.querySelector('.wkr-pk-c[data-k="pk'+o+'"]')],other),[true,true],"open on the day picked");
  /* The month from the calendar icon. */
  await page.tap(".wkr .wkr-cal");await pause(page,700);
  eq(await page.evaluate(()=>[document.querySelector(".wkr").classList.contains("open"),document.querySelector(".wkr-cal").getAttribute("aria-expanded"),!!document.querySelector(".wkr .dbcal")]),[true,"true",true]);
},{prefs:{anim:true}});
await test("Training's week rail: back to today, by Today or by tapping today's date, leaves the calendar button untouched (no flash)",async page=>{
  await tapTab(page,"train");await pause(page,300);
  const watch=()=>page.evaluate(()=>{const c=document.querySelector(".wkr-cal");window.__cal=c;window.__muts=[];
    new MutationObserver(m=>m.forEach(x=>window.__muts.push(x.attributeName||x.type))).observe(c,{attributes:true,childList:true,subtree:true});});
  const check=async how=>eq(await page.evaluate(()=>[window.__cal===document.querySelector(".wkr-cal"),window.__muts.join(","),document.querySelector(".wkr-cal").className]),[true,"","wkr-cal"],how+": the same button, nothing about it changed");
  for(const how of ["Today","today's date"]){
    const other=await page.$eval(".wkr .wkr-d:not(.sel)",b=>b.getAttribute("data-wkday"));
    await page.tap('.wkr [data-wkday="'+other+'"]');await pause(page,500);
    if(!(await page.$(".wkr-today")))throw new Error("no Today button away from today");
    await watch();
    if(how==="Today")await page.tap(".wkr-today");
    else await page.tap('.wkr [data-wkday="'+(await page.evaluate(async()=>(await import("/js/util.js")).today()))+'"]');
    await pause(page,500);
    eq(!!(await page.$(".wkr-today")),false,how+": Today goes");
    await check(how);
    if(await page.$(".wkr.peek"))await page.tap(".thero2-n").catch(()=>{});await pause(page,300);}
},{prefs:{anim:true}});
await test("Training's week rail in Arabic: right to left, the pill from the right, figures isolated",async page=>{
  await tapTab(page,"train");await pause(page,300);
  const r=await page.evaluate(()=>{const row=document.querySelector(".wkr-days"),c=[...row.children],hl=document.querySelector(".wkr-hl"),sel=document.querySelector(".wkr-d.sel");
    const a=c[0].getBoundingClientRect(),b=c[6].getBoundingClientRect(),h=hl.getBoundingClientRect(),s=sel.getBoundingClientRect();
    return [document.dir||document.documentElement.dir,a.left>b.left,Math.abs(h.left-s.left)<3,[...document.querySelectorAll(".wkr-n")].every(n=>n.classList.contains("num")),
      /[؀-ۿ]/.test(document.querySelector(".wkr-ti").textContent)];});
  eq(r,["rtl",true,true,true,true]);
},{prefs:{lang:"ar",anim:false}});
await test("Food's calendar unfolds at an easy pace under the date bar and folds back; a day picked folds it away",async page=>{
  await tapTab(page,"food");await pause(page,400);
  eq(await page.evaluate(()=>{const f=document.querySelector(".dbfold");return [!!f,f&&f.hasAttribute("inert"),f&&Math.round(f.getBoundingClientRect().height)];}),[true,true,0],"folded: in the page, nothing to see or tap");
  await page.tap('[data-dopen]');
  /* Paced, not slow (owner, 2 Nov: "not too slow, or fast, just animate right"): under
     way at 80 ms, not there yet; settled within half a second. */
  const early=await page.evaluate(()=>new Promise(r=>setTimeout(()=>r(Math.round(document.querySelector(".dbfold").getBoundingClientRect().height)),80)));
  const half=await page.evaluate(()=>new Promise(r=>setTimeout(()=>r(Math.round(document.querySelector(".dbfold").getBoundingClientRect().height)),420)));
  await pause(page,500);
  const full=await page.$eval('.dbfold',e=>Math.round(e.getBoundingClientRect().height));
  if(!(full>250&&early<full*0.8&&half>=full-2))throw new Error("not a paced unfold: "+early+" at 80ms, "+half+" at 500ms, of "+full);
  const y=await page.evaluate(()=>{const b=[...document.querySelectorAll(".dbfold [data-dpick]:not([disabled])")];return b[Math.max(0,b.length-3)].getAttribute("data-dpick");});
  await page.tap('.dbfold [data-dpick="'+y+'"]');await pause(page,900);
  eq(await page.evaluate(async()=>[(await import("/js/ui/view.js")).V.fdate,document.querySelector(".dbfold").classList.contains("open"),Math.round(document.querySelector(".dbfold").getBoundingClientRect().height)]),[y,false,0],"the day picked, the month folded away");
},{prefs:{anim:true}});
await test("Workout motion, with motion on: the RPE card holds the chosen number, then fades where it was while the cards below glide up; Next exercise arrives, it does not pop in",async page=>{
  await page.evaluate(async()=>{const S=(await import("/js/state.js")).S;S.prefs.rpe="every";});
  await startWorkout(page);
  const sets=await ev(page,"S.active.entries[0].planned.sets||3");
  for(let k=0;k<sets;k++){await page.fill('#in_r','8');await page.tap('[data-logset]');await pause(page,900);
    if(k<sets-1){const r=await page.$('.rpeask [data-rpeset$=":7"]');if(r){await r.tap();await pause(page,1000);}}}
  eq(!!(await page.$('.rpeask')),true,"asked after the last set");
  await page.waitForSelector('[data-k="lognext"]',{timeout:5000});
  const before=await page.$eval('[data-k="lognext"]',e=>e.getBoundingClientRect().top);
  await page.tap('.rpeask [data-rpeset$=":8"]');await pause(page,80);
  eq(await page.$eval('.rpeask [data-rpeset$=":8"]',e=>e.classList.contains("on")),true,"the chosen number is held");
  await page.waitForFunction(()=>!!document.querySelector('.rpeask.ghost'),null,{polling:"raf",timeout:1500});
  eq(await page.$eval('.rpeask.ghost',e=>[getComputedStyle(e).position,e.inert,e.getAnimations().length>0]),["absolute",true,true],"it fades where it was, out of the layout");
  eq(await page.$eval('[data-k="lognext"]',e=>e.getAnimations().some(a=>a.id==="glide")),true,"while Next exercise glides up into its place");
  await pause(page,900);
  eq(!!(await page.$('.rpeask')),false,"then it is gone");
  const after=await page.$eval('[data-k="lognext"]',e=>e.getBoundingClientRect().top);
  if(!(after<before))throw new Error("Next exercise did not rise into its place: "+before+" → "+after);
  eq(await page.$eval('[data-k="lognext"]',e=>[e.getAttribute("data-k"),e.hasAttribute("data-anim"),getComputedStyle(e).animationName]),["lognext",true,"cardIn"],"Next exercise arrives as a card of its own");
  eq(await page.$$eval('#app .tools [data-nextex]',a=>a.length),0,"with the sets done, no Skip beside Next exercise");
  /* The rest, put away: it plays out where it was; nothing is left behind. */
  if(!(await page.$('.sess [data-k="rest"]')))throw new Error("no rest to put away");
  await page.evaluate(async()=>{const V=(await import("/js/ui/view.js")).V;V.restEnd=Date.now()+300;});
  await page.waitForSelector('.sess [data-k="rest"] [data-rest="skip"]',{timeout:5000});
  await page.tap('.sess [data-k="rest"] [data-rest="skip"]');await pause(page,60);
  eq(await page.evaluate(()=>{const g=document.querySelector('.sess .rb.ghost');return g?[getComputedStyle(g).position,g.inert,!!g.querySelector("[id]"),g.getAnimations().length>0]:null;}),["absolute",true,false,true],"the rest card fades where it was, inert, its ids gone");
  /* The card below glides up from where it was: never a jump (owner, 3 Nov). */
  eq(await page.evaluate(()=>document.querySelector('.sess [data-k="lognext"]').getAnimations().some(a=>a.id==="glide")),true,"what was below glides up");
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
await test("Recovery: Pull trained yesterday, Pull due today: the coach offers the fresh Legs day, names the tired muscles, and one tap moves today; keeping the plan is one tap too",async page=>{
  await page.evaluate(async()=>{const st=await import("/js/state.js"),S=st.S,U=await import("/js/util.js");
    const X=await import("/js/data/exercises.js");await new Promise(r=>X.loadExDB(r));
    const sp=st.split(),now=U.today(),y=new Date(Date.now()-864e5-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10);
    const ex=(n,s)=>({id:n,name:n,sets:s,lo:8,hi:12});
    sp.schedule="rotation";
    sp.days=[{id:"dpush",name:"Push",ex:[ex("Barbell Bench Press - Medium Grip",4),ex("Standing Military Press",3)]},
      {id:"dpull",name:"Pull",ex:[ex("Bent Over Barbell Row",4),ex("Wide-Grip Lat Pulldown",3),ex("Barbell Curl",3)]},
      {id:"dlegs",name:"Legs",ex:[ex("Barbell Squat",4),ex("Romanian Deadlift",3)]}];
    const set=()=>[1,2,3,4].map(()=>({w:60,r:8,rpe:8}));
    /* Push was due yesterday; Pull was trained instead. In rotation the next day would be
       Legs; so the planned day is made Pull by logging Push the day before yesterday and
       the swap is what was trained. */
    S.sessions=[{id:"y",date:y,dayId:"dpush",dayName:"Pull",entries:[{name:"Bent Over Barbell Row",muscle:"Back",sets:set()},{name:"Wide-Grip Lat Pulldown",muscle:"Back",sets:set()},{name:"Barbell Curl",muscle:"Biceps",sets:set()}]}];
    S.daySwap={};st.saveDB();(await import("/js/ui/render.js")).render();});
  await pause(page,400);
  const card=await page.$eval('.reco',e=>e.textContent).catch(()=>null);
  if(!card)throw new Error("no coach card for a Pull day after Pull");
  if(!/Most of Pull lands on back, biceps.*, trained yesterday/.test(card)||!/Legs is fresh/.test(card))throw new Error("card: "+card);
  await page.tap('.reco [data-recoswap="dlegs"]');await pause(page,400);
  eq(await ev(page,"[S.daySwap[Object.keys(S.daySwap)[0]],!!document.querySelector('.reco [data-recoswap]')]"),["dlegs",false],"today moved to Legs, no offer again");
  /* What comes after it is said: the rotation follows on from Legs. */
  if(!/Your rotation follows on from Legs: tomorrow is Push\./.test(await page.textContent('#app')))throw new Error("tomorrow not said after the change");
  eq(await page.$eval('.thero2',e=>/Legs/.test(e.textContent)),true,"today's card is Legs");
});
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
  /* Compact: every exchange is there, and the panel scrolls through them. (Typing in it
     grew it: made smaller again while typing, it stays.) */
  if(await ev(page,"V.coach==='full'")){await page.tap('.cp [data-coachsize="compact"]');await pause(page,700);}
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
    /* The taps written out, and the places "open …" goes. */
    const keys=[...src.matchAll(/tap\(\{([a-z]+):/g)].map(m=>m[1])
      .concat(Object.values(M.PLACE).flat().map(D=>Object.keys(D)[0]));
    const handlers=await Promise.all(["shell","train","session","food","coach","progress","profile"].map(n=>fetch("/js/ui/handlers/"+n+".js").then(x=>x.text())));
    const all=handlers.join("\n");
    return {n:Object.keys(A).length,missing:[...new Set(keys)].filter(k=>!new RegExp('(key|has)\\("'+k+'"|D\\.'+k+'!==undefined').test(all)),
      described:Object.values(A).every(a=>a.desc&&a.params&&typeof a.confirm==="boolean"&&typeof a.run==="function"),
      domains:[...new Set(Object.keys(A).map(k=>k.split(".")[0]))].sort()};});
  eq([r.missing,r.described],[[],true],"each tap key is a registered branch; each action described");
  eq(r.domains,["act","app","cardio","deload","exercise","food","live","meal","past","plan","profile","progress","recovery","rest","sched","set","steps","travel","water","workout"],"grouped by domain");
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
  /* A day over target, by what the days left can take (300 kcal each, inside the 15% a
     day limit): spread over them. Sized to the day the test runs: on a Wednesday of a
     Saturday week only two days are left, and a fixed 1,100 kcal was "still fine". */
  const left=await page.evaluate(async()=>{const U=await import("/js/util.js"),W=await import("/js/engine/schedule.js");const n=U.today();return W.weekDates(n).filter(d=>d>n).length;});
  await page.evaluate(async over=>{const S=(await import("/js/state.js")).S,U=await import("/js/util.js");
    S.days[U.today()]={water:0,steps:0,meals:{Lunch:{items:[{n:"x",kcal:2500+over,p:150,c:400,f:150}]}}};},Math.min(1100,Math.max(1,left)*300));
  await page.tap('#cpanel .chat-acts button');await pause(page,500);
  r=await last();
  if(!left){if(!/A new one starts tomorrow/.test(r.lead))throw new Error("week's last day: "+r.lead);}
  else{
  if(!/kcal a day less, protein unchanged/.test(r.lead))throw new Error("week: "+r.lead);
  if(/tomorrow|make up|burn|fast|skip/i.test(r.lead))throw new Error("a stricter tomorrow: "+r.lead);
  const days=[...r.text.matchAll(/: ([\d,]+) kcal/g)].map(m=>+m[1].replace(",",""));
  if(!days.length||days.some(k=>k<2500*0.85-10))throw new Error("a day moved more than 15%: "+days);}
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
await test("Coach panel: the small panel's field tapped on a phone, it grows by itself, slowly, to the whole conversation, the field and what is typed staying",async page=>{
  await page.evaluate(async()=>{const S=(await import("/js/state.js")).S,now=Date.now();
    S.chat=Array.from({length:4},(_,i)=>({at:now-(4-i)*60000,q:"question "+i,id:"protein",lang:"en",b:[{p:"An answer, number "+i+"."}]}));});
  await openChat(page);await pause(page,500);
  eq(await ev(page,"V.coach"),"compact","opens small");
  await page.tap('#chatq');await page.keyboard.type("how much");await pause(page,200);
  eq(await ev(page,"V.coach"),"compact","not at once: the keyboard comes up first");
  await pause(page,450);
  const mid=await page.evaluate(()=>{const c=document.querySelector(".cp");return [c.classList.contains("full"),c.style.position,c.style.transition.indexOf("cubic-bezier")>=0||c.style.transition.indexOf("var(--e-cal)")>=0];});
  eq(mid,[true,"fixed",true],"growing, at the slow even pace");
  await pause(page,900);
  eq(await page.evaluate(()=>[document.activeElement&&document.activeElement.id,document.getElementById("chatq").value,document.querySelector(".cp").style.height]),["chatq","how much",""],"settled, still typing");
  /* Made smaller while typing, it stays small. */
  await page.tap('.cp [data-coachsize="compact"]');await pause(page,1200);
  eq(await ev(page,"V.coach"),"compact","smaller stays smaller");
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
  /* Rewritten 3 Nov (owner: "I didn't understand what the buttons do"): how the app fits
     together first, in the middle of the screen, then each thing and what a tap does. */
  eq([c.k,c.h,c.hole],["Training · 1 of 9","How Bunyan works",[0,0]],"the first tip: the app as a whole, nothing lit");
  if(!/Four tabs at the bottom/.test(await page.textContent('.tour-p')))throw new Error("the overview does not say the tabs");
  eq(await ev(page,"V.tab"),"train","the page under it is untouched");
  /* Anywhere: even over a button, a tap only moves the guide on. */
  const seen=[c.h];let bellHole=null;
  for(let i=0;i<8;i++){await page.mouse.click(30+i*30,300+i*30);await pause(page,500);c=await card();if(c){seen.push(c.h);if(c.h==="Profile")bellHole=c.hole;}}
  eq(seen,["How Bunyan works","Your week","Today","Your program","Weight and steps","Cardio and sports","Profile","Ask the coach","The tabs"],"each thing, in turn");
  const bell=await page.$eval('.hacts .havatar',e=>{const r=e.getBoundingClientRect();return [Math.round(r.width),Math.round(r.height)];});
  if(!bellHole||Math.abs(bellHole[0]-bell[0]-16)>2||Math.abs(bellHole[1]-bell[1]-16)>2)throw new Error("the light is not on the picture: "+JSON.stringify([bellHole,bell]));
  eq(await ev(page,"[V.tab,V.sheet]"),["train",null],"no tap reached the page");
  await page.mouse.click(200,200);await pause(page,600);
  eq([await card(),await ev(page,"S.prefs.toured.train")],[null,3],"finished, and remembered (at the guide's version)");
  await page.reload();await pause(page,2200);
  eq(await card(),null,"not again");
  /* Profile → Show the guide again: Training's guide, from the start. */
  await page.evaluate(()=>localStorage.setItem("bunyan:notour","1"));
  await tapTab(page,"profile");await pause(page,400);
  await page.evaluate(()=>localStorage.removeItem("bunyan:notour"));
  await page.$eval('[data-tourreset]',e=>e.click());await pause(page,1800);
  c=await card();
  eq([await ev(page,"V.tab"),c&&c.k],["train","Training · 1 of 9"],"back from the start");
  await page.click('.tour-skip');await pause(page,500);
  eq([await card(),await ev(page,"S.prefs.toured.train")],[null,3],"Skip ends it, seen");
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
/* ---- plan pages, round 2 (owner, 3 Nov) ------------------------------------------------ */
await test("Plan pages: a sideways swipe moves between the tabs on Training and Food; a nudge, a vertical drag or a drag on the templates row does not; Arabic goes the other way",async(page,env)=>{
  const cdp=await env.ctx.newCDPSession(page);
  const drag=async(x0,y0,x1,y1,steps=12)=>{
    await cdp.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x:x0,y:y0}]});
    for(let i=1;i<=steps;i++){await cdp.send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:[{x:x0+(x1-x0)*i/steps,y:y0+(y1-y0)*i/steps}]});await page.waitForTimeout(16);}
    await cdp.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});await page.waitForTimeout(700);};
  const paneY=()=>page.evaluate(()=>{window.scrollTo(0,0);const r=document.querySelector("#app .psec").getBoundingClientRect();return Math.round(Math.min(r.top+90,innerHeight-160));});
  await coach(page,"train","program");
  let y=await paneY();
  await drag(320,y,60,y+4);eq(await ev(page,"V.tplan"),"programs","swipe left: Programs & exercises");
  y=await paneY();
  await drag(320,y,280,y+2);eq(await ev(page,"V.tplan"),"programs","a nudge springs back");
  await drag(200,y,205,y-200);eq(await ev(page,"V.tplan"),"programs","a vertical drag is a scroll");
  /* The templates row scrolls sideways: a drag that starts on it is the row's. */
  const row=await page.evaluate(()=>{const e=document.querySelector("#app .psec .tscroll");e.scrollIntoView({block:"center"});const r=e.getBoundingClientRect();return [Math.round(r.top+r.height/2),e.scrollLeft];});
  await drag(320,row[0],60,row[0]+2);
  eq(await ev(page,"[V.tplan,document.querySelector('#app .psec .tscroll').scrollLeft>"+row[1]+"]"),["programs",true],"the templates row scrolled, the tab stayed");
  y=await paneY();
  await drag(60,y,330,y+4);eq(await ev(page,"V.tplan"),"program","swipe right: back to My program");
  await drag(60,y,330,y+4);eq(await ev(page,"V.tplan"),"program","the first tab resists");
  eq(await page.$eval('#app .psec',e=>e.style.transform),"","nothing left offset");
  await coach(page,"food","plan");
  y=await paneY();
  await drag(320,y,60,y+4);eq(await ev(page,"V.fplan"),"targets","Food: Meal plan → Targets");
  y=await paneY();
  await drag(320,y,60,y+4);eq(await ev(page,"V.fplan"),"targets","the last tab resists");
  /* Arabic: what comes next is on the left, so dragging right brings it. */
  await page.evaluate(async()=>{const S=(await import("/js/state.js")).S;S.prefs.lang="ar";(await import("/js/ui/render.js")).render();});
  await coach(page,"train","program");y=await paneY();
  await drag(60,y,330,y+4);eq(await ev(page,"V.tplan"),"programs","Arabic: swipe right for the next tab");
});
await test("Plan pages: opening one, Training and the plan page travel together edge to edge (no fading: frosted cards lose their blur under a fade); back the other way; a tab tap slides its tabs the same way; a tab change is its own; reduced motion has none",async page=>{
  await tapTab(page,"train");await pause(page,600);
  const copy=()=>page.evaluate(()=>{const g=document.querySelector(".stillcopy");if(!g)return null;
    const a=g.getAnimations(),k=a[0]&&a[0].effect.getKeyframes();
    return [g.getAttribute("aria-hidden"),getComputedStyle(g).pointerEvents,!!k&&k.every(f=>f.opacity==null),document.getElementById("app")!==g];});
  await page.tap('.pgc [data-tplan="program"]');await pause(page,100);
  eq(await copy(),["true","none",true,true],"Training as a still copy, out of reach, moving without a fade");
  eq(await page.evaluate(()=>{const a=document.getElementById("app").getAnimations();return a.length>0&&a[0].effect.getKeyframes().every(f=>f.opacity==null);}),true,"the plan page moving in, no fade");
  await pause(page,900);
  eq(await page.evaluate(()=>[!!document.querySelector(".stillcopy"),document.documentElement.classList.contains("pgmoving"),document.getElementById("app").classList.contains("pgfront")]),[false,false,false],"and gone when it lands");
  await page.tap('.psecs [data-tplan="programs"]');await pause(page,80);
  eq(await page.evaluate(()=>{const g=document.querySelector(".stillcopy");return !!g&&!!g.querySelector(".bsched,.drows");}),true,"a tab tap: My program slides out as Programs comes in");
  await pause(page,700);
  await page.tap('#app .dhead [data-back]');await pause(page,100);
  eq(await page.evaluate(()=>{const g=document.querySelector(".stillcopy");return !!g&&!!g.querySelector(".psecs");}),true,"back: the plan page goes the other way");
  await pause(page,900);
  eq(await ev(page,"[V.tab,V.train]"),["train","days"],"on Training");
  await tapTab(page,"food");await pause(page,100);
  eq(await page.evaluate(()=>!!document.querySelector(".stillcopy")),false,"a tab change is not a page push");
  await page.evaluate(async()=>{const S=(await import("/js/state.js")).S;S.prefs.anim=false;(await import("/js/ui/render.js")).render();});
  await page.tap('#app [data-fplan="plan"]');await pause(page,60);
  eq(await page.evaluate(()=>!!document.querySelector(".stillcopy")),false,"reduced motion: no slide");
},{prefs:{anim:true}});
await test("Schedule: one card — the choice with icons, then the week it makes: in rotation the days in order and round again, by weekday each day's number on its weekday; the page line names the weekdays alike",async page=>{
  await coach(page,"train","program");
  const n=await ev(page,"S.programs.find(p=>p.id===S.activeProgram).days.length");
  const cy=await page.$$eval('.bsched .bsch-cy li',a=>a.map(l=>l.className));
  eq([cy.length,cy[cy.length-1]],[n+1,"again"],"in rotation: every day, then round again");
  eq(await page.$$eval('.bsched .seg-b .seg-i',a=>a.length),2,"both choices carry an icon");
  await page.tap('[data-sched="week"]');await pause(page,400);
  const wk=await page.evaluate(async()=>{const st=await import("/js/state.js"),sc=await import("/js/engine/schedule.js");
    const p=st.S.programs.find(x=>x.id===st.S.activeProgram);
    const want=sc.weekOrder().map(w=>p.days.map((d,i)=>(d.wd||[]).indexOf(w)>=0?String(i+1):"").join(""));
    const got=[...document.querySelectorAll('.bsched .bsch-wk li')].map(l=>[...l.querySelectorAll("b i")].map(i=>i.textContent).join(""));
    const pinned=[...new Set(p.days.flatMap(d=>d.wd||[]))].sort((a,b)=>sc.weekOrder().indexOf(a)-sc.weekOrder().indexOf(b));
    return {want,got,line:document.querySelector("#app .dsub").textContent,names:pinned.map(w=>sc.wdName(w,true)).join(", ")};});
  eq(wk.got,wk.want,"each weekday shows the numbers of the days on it");
  eq(wk.line.split(", ").sort(),wk.names.split(", ").sort(),"the page line names every weekday the same way, in full (it said “Mon, Wednesday, Saturday”)");
  if(!/two days the same weekday|another day already has/.test(await page.textContent('.bsched .bsch-n')))throw new Error("no line on two sessions a day");
});
await test("Programs & exercises: the library, favourites and bodyweight work sit under the programs; two tabs; an old route to Exercises lands there",async page=>{
  await coach(page,"train","programs");
  eq(await page.$$eval('#app .psecs .seg-b',a=>a.map(b=>b.textContent)),["My program","Programs & exercises"],"two tabs");
  eq(await page.evaluate(()=>[!!document.querySelector('#app .psec [data-newsplit]'),!!document.querySelector('#app .psec #pex'),!!document.querySelector('#app .psec [data-train="library"]'),!!document.querySelector('#app .psec [data-train="favs"]')]),[true,true,true,true],"programs, then the exercises");
  await tapTab(page,"train");await pause(page,300);
  await page.evaluate(async()=>{const v=await import("/js/ui/view.js");v.V.train="plan";v.V.tplan="exercises";(await import("/js/ui/render.js")).render();});await pause(page,300);
  eq(await ev(page,"V.tplan"),"programs","Exercises is Programs & exercises now");
  eq(await page.evaluate(()=>{const r=document.getElementById("pex").getBoundingClientRect();return window.scrollY>0&&r.top>=0&&r.top<innerHeight-120;}),true,"scrolled to the library");
  /* The block card is on My program, not Training's card. */
  await tapTab(page,"train");await pause(page,300);
  eq(await page.$$eval('#app .pgc .blk',a=>a.length),0,"Training's program card is just the way in");
});
await test("Guide: Training's plan page has its own, which says what the tabs, Edit and the schedule do",async page=>{
  await pause(page,1200);
  await coach(page,"train","program");await pause(page,1600);
  const k=await page.evaluate(()=>{const c=document.querySelector(".tour-card");return c?[c.querySelector(".tour-k").textContent,c.querySelector(".tour-h").textContent]:null;});
  if(!k||!/^Training plan · 1 of /.test(k[0])||k[1]!=="Two tabs")throw new Error("guide: "+JSON.stringify(k));
  if(!/Swipe left or right/.test(await page.textContent('.tour-p')))throw new Error("does not say a swipe switches");
},{tour:true,prefs:{toured:{train:9,food:9,coach:9,progress:9,profile:9}}});
/* ---- Food's plan pages, round 3 (owner, 3 Nov) ------------------------------------------ */
await test("Meal plan: with nothing planned, how to start comes first; once planned, two bars and a verdict; copy in and share are icons by its name, and Meal names, My foods and a new plan from the goals are in the gear (owner, 4 Nov)",async page=>{
  await page.evaluate(async()=>{const st=await import("/js/state.js");(st.S.mealSlots||[]).forEach(x=>{x.plan=[];});st.saveDB();});
  await coach(page,"food","plan");
  eq(await page.evaluate(()=>[!!document.querySelector('.plstart'),!document.querySelector('.plsum'),!!document.querySelector('.plstart .ptile[data-pgen]'),!!document.querySelector('.plstart .ptile[data-pimport]'),
    !document.querySelector('.psec .bname')]),[true,true,true,true,true],"empty: Make your meal plan first, with its two ways, and no row of icons over it");
  await page.evaluate(async()=>{const st=await import("/js/state.js"),M=await import("/js/engine/meals.js");const x=M.ownSlots()[0];
    x.plan=[{n:"Eggs",kcal:300,p:24,c:2,f:20,grams:150,label:"3 eggs"}];st.saveDB();(await import("/js/ui/render.js")).render();});await pause(page,300);
  eq(await page.evaluate(()=>[document.querySelectorAll('.plsum .plsum-r').length,!!document.querySelector('.plsum-v'),!document.querySelector('.plstart'),!document.querySelector('.plset'),
    [...document.querySelectorAll('.psec .bname-a .icobtn')].map(b=>Object.keys(b.dataset)[0]),document.querySelector('.psec .bname-s').textContent]),
    [2,true,true,true,["pimport","shareplan"],"1 meal · 300 kcal"],"planned: two bars and a verdict; copy in and share by the name, no list");
  /* Not touching: each icon has room of its own. */
  const gap=await page.evaluate(()=>{const b=[...document.querySelectorAll('.psec .bname-a .icobtn')].map(x=>x.getBoundingClientRect());return Math.min(...b.slice(1).map((r,i)=>r.left-b[i].right));});
  if(!(gap>=6))throw new Error("icons touch: "+gap);
  await page.tap('.dhead-a[data-sheet="set_meals"]');await pause(page,500);
  const look=await page.$eval('#sheet .seg-b',b=>{const c=getComputedStyle(b);return [c.backgroundColor,c.color];});
  if(look[0]==="rgb(255, 255, 255)"||look[0]==="rgb(239, 239, 239)")throw new Error("Meal names is unstyled: "+look);
  await page.tap('#sheet [data-mstyle="numbered"]');await pause(page,300);
  eq(await page.evaluate(async()=>(await import("/js/engine/meals.js")).mealStyle()),"numbered","Numbered chosen");
  await page.tap('#sheet [data-mstyle="named"]');await pause(page,300);
  eq(await page.evaluate(async()=>(await import("/js/engine/meals.js")).mealStyle()),"named","and back");
  eq(await page.$$eval('#sheet .srow[data-fplan],#sheet .srow[data-pgen]',a=>a.map(b=>Object.keys(b.dataset)[0])),["fplan","pgen"],"the gear: My foods and a new plan from the goals");
  await page.tap('#sheet .x[data-close]');await pause(page,600);
  eq(await page.evaluate(()=>[!!document.querySelector('#sheet .sheet'),!!document.querySelector('.sheetghost')]),[false,false],"the sheet slides away and is gone");
  eq(await page.$$eval('#app .psecs .seg-b',a=>a.map(b=>b.textContent)),["Meal plan","Daily goals"],"two tabs: My foods is not one");
  await page.tap('.dhead-a[data-sheet="set_meals"]');await pause(page,500);
  await page.tap('#sheet [data-fplan="foods"]');await pause(page,600);
  eq(await ev(page,"V.sheet"),null,"the sheet is put away");
  eq(await ev(page,"[V.fplan,!!document.querySelector('#app .psecs'),document.querySelector('#app .dhead-t').textContent]"),["foods",false,"My foods"],"My foods is a page of its own");
  await page.tap('[data-back]');await pause(page,500);
  eq(await ev(page,"[V.tab,V.fplan]"),["food","plan"],"back to the meal plan");
  await page.tap('.dhead-a[data-sheet="set_meals"]');await pause(page,500);
  await page.tap('#sheet [data-pgen]');await pause(page,1500);
  eq(await ev(page,"[V.sheet,!!V.pgen,!!document.querySelector('#app .pmeal')]"),[null,true,true],"a new plan from the goals, from the gear: the review, sheet away");
});
await test("Plan swipe (owner, 4 Nov): the tab going out leaves the screen entirely, nothing of it at the edge; scrolled down a tab, the next comes in from its top and lands there with no jump; the tab's word turns as the highlight arrives",async(page,env)=>{
  const cdp=await env.ctx.newCDPSession(page);
  const move=async(x0,y,x1,steps=12)=>{
    await cdp.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x:x0,y}]});
    for(let i=1;i<=steps;i++){await cdp.send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:[{x:x0+(x1-x0)*i/steps,y}]});await page.waitForTimeout(16);}};
  const up=()=>cdp.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});
  await page.evaluate(async()=>{const S=(await import("/js/state.js")).S;S.prefs.anim=true;(await import("/js/ui/render.js")).render();});
  await coach(page,"train","program");await pause(page,600);
  /* Scrolled well down My program. */
  await page.evaluate(()=>window.scrollTo(0,500));await pause(page,300);
  await move(330,420,60);
  const mid=await page.evaluate(()=>{const nb=document.querySelector(".stillcopy.peek");return nb?Math.round(nb.getBoundingClientRect().top):null;});
  if(mid==null||mid<0)throw new Error("the next tab should come in from its own top, at the top of the screen: "+mid);
  await up();await page.waitForTimeout(60);
  /* The old tab travels the screen's width, so none of it can stay at the edge. */
  const kf=await page.evaluate(()=>{const p=document.querySelector("#app .psec"),an=p.getAnimations()[0];
    return an?[an.effect.getKeyframes().slice(-1)[0].transform,"translateX(-"+document.documentElement.clientWidth+"px)"]:null;});
  if(!kf||kf[0]!==kf[1])throw new Error("the tab going out should travel the whole screen: "+kf);
  eq(await page.evaluate(()=>[...document.querySelectorAll('#app .psecs .seg-b')].map(b=>b.classList.contains("on"))),[false,true],"the word turns with the highlight, mid-slide");
  await page.waitForTimeout(700);
  const after=await ev(page,"[V.tplan,Math.round(document.querySelector('#app .psec').getBoundingClientRect().top),!!document.querySelector('.stillcopy'),document.querySelector('#app .psec').style.transform]");
  eq([after[0],after[2],after[3]],["programs",false,""],"landed on Programs, nothing left over");
  if(Math.abs(after[1]-mid)>2)throw new Error("the real tab should land where the incoming one stood: "+after[1]+" vs "+mid);
  await page.waitForTimeout(500);
  eq(await page.evaluate(()=>Math.round(document.querySelector("#app .psec").getBoundingClientRect().top)),after[1],"and does not move after it lands");
});
await test("How do you feel today?: on a phone each choice's word sits in the middle of its pill (owner, 4 Nov: it sat at the top), and so do the effort choices",async page=>{
  await page.evaluate(async()=>{const st=await import("/js/state.js");st.S.prefs.haptic=true;st.saveDB();});await page.reload();await pause(page,1500);
  await startWorkout(page);await pause(page,500);
  const off=await page.evaluate(()=>[...document.querySelectorAll(".ready-c > *")].map(l=>{const b=l.getBoundingClientRect(),rg=document.createRange();rg.selectNodeContents(l);const r=rg.getBoundingClientRect();
    return [l.tagName,Math.round((r.top+r.bottom)/2-(b.top+b.bottom)/2)];}));
  eq(off.length,5,"five choices");
  if(off.some(x=>x[0]!=="LABEL"))throw new Error("expected the phone's labels: "+JSON.stringify(off));
  if(off.some(x=>Math.abs(x[1])>2))throw new Error("words off centre: "+JSON.stringify(off));
});
await test("Targets: one card says the target; Edit opens it as fields and Cancel closes it unchanged; the coach's suggestion only when it differs; the eating history folded",async page=>{
  await coach(page,"food","targets");
  const g=await ev(page,"S.goals");
  const txt=await page.textContent('.tgcard');
  if(!txt.includes(g.kcal.toLocaleString("en-US"))||!txt.includes(g.p+" g"))throw new Error("card: "+txt);
  await page.tap('[data-tgedit="1"]');await pause(page,300);
  await page.fill('#g_kcal','1111');await page.tap('[data-tgedit="0"]');await pause(page,300);
  eq(await ev(page,"[S.goals.kcal,!!document.querySelector('#g_kcal')]"),[g.kcal,false],"Cancel: nothing changed");
  const sug=await page.evaluate(async()=>{const f=await import("/js/engine/formulas.js");return f.macroTargets();});
  const same=!!sug&&sug.kcal===g.kcal&&sug.p===g.p&&sug.c===g.c&&sug.f===g.f;
  eq(!!(await page.$('.tgoffer [data-usesug]')),!!sug&&!same,"the suggestion shows only when it differs");
  eq(await page.evaluate(()=>{const f=document.querySelector('.tgfold');return [f.classList.contains('open'),getComputedStyle(f.querySelector('.fold-body')).display];}),[false,"none"],"history folded");
  await page.tap('.tgfold [data-fold="feat"]');await pause(page,300);
  eq(await page.evaluate(()=>getComputedStyle(document.querySelector('.tgfold .fold-body')).display),"block","and opens in place");
});
await test("Plan tabs: the highlight over the tabs follows the finger while the page is dragged, and settles on the tab it lands on",async(page,env)=>{
  const cdp=await env.ctx.newCDPSession(page);
  await coach(page,"food","plan");
  const y=await page.evaluate(()=>{window.scrollTo(0,0);const r=document.querySelector("#app .psec").getBoundingClientRect();return Math.round(Math.min(r.top+90,innerHeight-160));});
  const iNow=()=>page.evaluate(()=>parseFloat(document.querySelector("#app .psecs").style.getPropertyValue("--i")));
  await cdp.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x:320,y}]});
  for(let i=1;i<=8;i++){await cdp.send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:[{x:320-i*18,y}]});await page.waitForTimeout(16);}
  const mid=await iNow();
  if(!(mid>0.15&&mid<0.85))throw new Error("the highlight did not follow: --i "+mid);
  eq(await page.evaluate(()=>document.querySelector("#app .psecs").classList.contains("drag")),true,"no easing while dragged");
  for(let i=9;i<=14;i++){await cdp.send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:[{x:320-i*18,y}]});await page.waitForTimeout(16);}
  await cdp.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});await page.waitForTimeout(900);
  eq([await ev(page,"V.fplan"),await iNow(),await page.evaluate(()=>document.querySelector("#app .psecs").classList.contains("drag"))],["targets",1,false],"landed on Targets");
});
await test("Copy in: a plan another Bunyan user shared works in Food's Copy in a plan and Training's Copy in a program — paste their message, read it, and it is added",async page=>{
  /* A message as it arrives: words around the code. */
  const msg=await page.evaluate(async()=>{const P=await import("/js/engine/planshare.js");
    const code=await P.encodePlan(P.packPlan({from:"Omar",slots:[{id:"Breakfast",plan:[{n:"Foul",label:"1 plate",grams:250,kcal:330,p:18,c:44,f:9}]}],
      program:{name:"Omar's split",schedule:"cycle",days:[{name:"Push",wd:[],ex:[{name:"Barbell Bench Press - Medium Grip",sets:3,lo:6,hi:10}]}]}}));
    return "Here is my plan 👇 "+code+" enjoy";});
  await coach(page,"food","plan");
  await page.tap('[data-pimport]');await pause(page,400);
  eq(await page.textContent('#app .dhead-t'),"Copy in a plan","the screen is named as the button");
  await page.fill('#pi_text',msg);await page.tap('[data-pread]');await pause(page,800);
  eq(await ev(page,"[V.sheet,!!(V.sd&&V.sd.got),V.sd&&V.sd.got&&V.sd.got.from]"),["recvplan",true,"Omar"],"read as a shared plan, not as text");
  await page.tap('#sheet [data-rplanmeals]');await pause(page,400);
  eq(await ev(page,"S.mealSlots.find(s=>s.id==='Breakfast').plan.map(x=>x.n)"),["Foul"],"their meal plan is mine");
  await page.evaluate(async()=>{(await import("/js/ui/actions.js")).closeSheet();});await pause(page,300);
  await coach(page,"train","programs");
  await page.tap('[data-timport]');await pause(page,400);
  eq(await page.textContent('#app .dhead-t'),"Copy in a program","Training's too");
  await page.fill('#ti_text',msg);await page.tap('[data-tiread]');await pause(page,800);
  eq(await ev(page,"[V.sheet,!!(V.sd&&V.sd.got&&V.sd.got.program)]"),["recvplan",true],"the program in it, ready to add");
  const n=await ev(page,"S.programs.length");
  await page.tap('#sheet [data-rplanadd="keep"]');await pause(page,400);
  eq(await ev(page,"[S.programs.length,S.programs[S.programs.length-1].name]"),[n+1,"Omar's split"],"added to my programs");
});
await test("My program: switch and share are icons by the name, Workout settings the gear at the top right, the training block at the foot; no list of buttons under it",async page=>{
  await page.evaluate(async()=>{const st=await import("/js/state.js"),sc=await import("/js/engine/schedule.js"),U=await import("/js/util.js");
    st.S.block={start:sc.weekStartOf(U.today())};st.saveDB();});
  await coach(page,"train","program");
  eq(await page.evaluate(()=>[!!document.querySelector('.bname-a [data-tplan="programs"]'),!!document.querySelector('.bname-a [data-shareplan^="p:"]'),
    !!document.querySelector('.dhead .dhead-a[data-sheet="set_training"]'),!document.querySelector('#app .plset'),!document.querySelector('#app .psec [data-timport]')]),
    [true,true,true,true,true],"icons, the gear, and no Copy in or settings list here");
  eq(await page.evaluate(()=>{const p=document.querySelector('#app .psec'),b=p.querySelector('.blk');return !!b&&b===p.lastElementChild;}),true,"the block is last");
  await page.tap('.dhead-a');await pause(page,500);
  eq(await ev(page,"V.sheet"),"set_training","the gear opens Workout settings");
  await page.evaluate(async()=>{(await import("/js/ui/actions.js")).closeSheet();});await pause(page,300);
  await page.tap('.bname-a [data-tplan="programs"]');await pause(page,500);
  eq(await ev(page,"V.tplan"),"programs","the arrows open Programs & exercises");
});
await test("Your meal plan: cards with what the day comes to; a food is one tap — change the amount, remove it, or swap it for one of similar nutrition, sized to the same calories and within the diet; Undo puts it back",async page=>{
  await page.evaluate(async()=>{const st=await import("/js/state.js");st.S.prefs.diet="veg";st.saveDB();});
  await coach(page,"food","plan");
  await page.tap('[data-pgen]');for(let i=0;i<30&&!(await page.$('.pmeal'));i++)await pause(page,200);
  eq(await page.evaluate(()=>[!!document.querySelector('.prsum [data-pgenmore]'),document.querySelectorAll('.prsum .plsum-r').length,!!document.querySelector('.prcta [data-puse]'),document.querySelectorAll('#app p.dsub').length]),[true,2,true,1],"one summary with Another version, Use this plan in reach, one line of words");
  const it=await ev(page,"V.pparse[0].items[0]");
  await page.tap('.pmrow[data-pfood="0|0"]');await pause(page,600);
  const alts=await page.$$eval('#sheet .pf-alt',a=>a.map(b=>b.getAttribute("data-pswapto")));
  if(alts.length<3)throw new Error("too few alternatives: "+alts.length);
  const chk=await page.evaluate(async([alts,k0])=>{const N=await import("/js/engine/nutrition.js"),M=await import("/js/engine/mealplan.js");
    return alts.map(a=>{const p=a.split("|"),f=N.FOODDB.find(x=>x.id===p[2]),n=N.nutritionFor(f,+p[3]);
      return [Math.abs(n.kcal-k0)/k0<0.25,M.allowed(f,{diet:"veg"})];});},[alts,it.kcal]);
  eq(chk.every(x=>x[0]&&x[1]),true,"each within a quarter of the calories, and vegetarian: "+JSON.stringify(chk));
  const to=alts[0].split("|")[2];
  await page.tap('#sheet .pf-alt');await pause(page,500);
  eq(await ev(page,"[V.sheet,V.pparse[0].items[0].fid]"),[null,to],"swapped in its place");
  await page.tap('.toast-undo');await pause(page,300);
  eq(await ev(page,"V.pparse[0].items[0].fid"),it.fid,"Undo puts the first one back");
});
await test("Meal plan: “Build it from my targets” lives on the meal plan page, beside Import, and opens the plan to review",async page=>{
  await coach(page,"food","plan");
  if(!(await page.$('.psec [data-pgen]'))||!(await page.$('.psec [data-pimport]')))throw new Error("the two ways to fill the plan are not on the meal plan page");
  await page.tap('.psec [data-pgen]');await pause(page,1500);
  eq(await ev(page,"[V.tab,V.pimport,!!V.pgen,(V.pparse||[]).length>0]"),["food",true,true,true],"the built plan, to review before anything changes");
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
  eq(await page.$eval('.dock-b[data-tab="coach"] svg path',e=>e.getAttribute("d").startsWith("M6.2 15.2")),true,"Coach's icon is the brain");
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
await test("Coach page: this week's strip agrees with Training's week; the ask box opens the chat ready to type; Training's and Food's cards open their plan pages",async page=>{
  await tapTab(page,"train");await pause(page);
  const wk=await page.evaluate(async()=>{const st=await import("/js/state.js"),D=await import("/js/engine/dayplan.js"),Sc=await import("/js/engine/schedule.js"),U=await import("/js/util.js");
    const sp=st.split(),now=U.today();let done=0,plan=0;
    Sc.weekDates(now).forEach(iso=>{const d=D.planOn(sp,iso);if(d.kind==="done")done++;if(d.kind==="done"||(d.kind!=="past"&&!d.rest&&d.kind!=="none"))plan++;});return [done,plan];});
  await coach(page,"ai");
  const w=await page.evaluate(()=>[...document.querySelectorAll(".cweek2-w b")].map(b=>b.textContent));
  eq(w,wk[1]?[String(wk[0]),String(wk[1])]:[],"the same workouts as the plan's week");
  const bar=await page.$eval(".cweek2-bar i",e=>parseFloat(e.style.width));
  eq(bar,wk[1]?Math.round(wk[0]/wk[1]*100):0,"the bar is the share");
  eq(await page.$$eval('.cask [data-coachopen]',a=>a.length),0,"no box that opens the same chat as the Coach button");
  await page.tap('#cfab .cfab');await pause(page,400);await page.focus('#chatq');
  eq(await page.evaluate(()=>[document.activeElement&&document.activeElement.id,!!document.querySelector("#cpanel .cp-f")]),["chatq",true],"the box has the caret");
  const bb=await (await page.$('.cp [data-coachclose]')).boundingBox();
  if(bb.y<0)throw new Error("the close is off the top of the screen");
  await page.touchscreen.tap(bb.x+bb.width/2,bb.y+bb.height/2);await pause(page,500);
  eq(await ev(page,"[V.tab,!!V.coach]"),["coach",false],"back to the Coach page");
  await pause(page,600);
  if(!(await page.$('.crow[data-setup]')))throw new Error("no way to take the assessment again");
  await tapTab(page,"train");await pause(page,300);
  await page.tap('.pgc [data-tplan="program"]');await pause(page,400);
  eq(await ev(page,"[V.tab,V.train,V.tplan]"),["train","plan","program"],"Training's card: the program");
  await tapTab(page,"food");await pause(page,300);
  await page.$eval('.fpc',e=>e.scrollIntoView({block:"center"}));await pause(page,100);
  await page.tap('.fpc');await pause(page,400);
  eq(await ev(page,"[V.tab,V.fplan]"),["food","plan"],"Food's card: the meal plan");
});
await test("Coach page in Arabic: the week's bar fills from the right, no English left in it",async page=>{
  await coach(page,"ai");
  const r=await page.evaluate(()=>({bg:getComputedStyle(document.querySelector(".cweek2-bar i")).backgroundImage,
    txt:document.querySelector(".cweek2").innerText+" "+document.querySelector(".cask").innerText}));
  if(!/270deg/.test(r.bg))throw new Error("not mirrored: "+r.bg);
  if(/[A-Za-z]{3,}/.test(r.txt))throw new Error("English on the Coach page: "+r.txt);
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
  /* One slim card under the day's numbers, no figure repeating them (owner, 3 Nov). */
  eq(await page.evaluate(()=>[!document.querySelector('.fbody-d,.fbn'),!!document.querySelector('.fsum + .fneed'),!!document.querySelector('.fneed .fneed-i.f-p')]),[true,true,true],"protein, in one card right under the summary; no figure");
  eq(await page.$eval('.fbody-pill',e=>e.textContent),"+100 g to go","what is left, to the nearest 5 g");
  eq(await page.$$eval('.fsug-t',a=>a.length),3,"three foods");
  const before=await ev(page,"Object.values(S.days[Object.keys(S.days).sort().pop()].meals).reduce((n,m)=>n+(m.items||[]).length,0)");
  const fid=await page.$eval('.fsug-t',e=>e.dataset.fsug.split("|")[0]);
  await page.$eval('.fsug-t',e=>e.scrollIntoView({block:"center"}));await page.tap('.fsug-t');await pause(page,600);
  const after=await ev(page,"Object.values(S.days[Object.keys(S.days).sort().pop()].meals).flatMap(m=>m.items||[])");
  eq([after.length,after.some(x=>x.fid===fid&&x.p>10)],[before+1,true],"logged, with its protein");
  if(!/Coach noticed/.test(await page.$eval('.fnoticed',e=>e.innerText)))throw new Error("no week card");
  /* "Build today's meal" is gone (owner, 3 Nov: "no actual value"). */
  eq(await page.$$eval('[data-fbuild]',a=>a.length),0,"no Build today's meal");
},{db:lowProtein()});
await test("Food: in the morning nothing is behind yet; with water short in the afternoon, a glass is offered instead of food",async page=>{
  await page.addInitScript(()=>{Date.prototype.getHours=function(){return 9;};});await page.reload();await pause(page,1200);
  await tapTab(page,"food");await pause(page,400);
  eq(await page.$$eval('.fneed,.fsug-t',a=>a.length),0,"on course at 9:00: no card at all");
  await page.evaluate(async()=>{Date.prototype.getHours=function(){return 17;};const s=await import("/js/state.js");
    const d=Object.keys(s.S.days).sort().pop();s.S.days[d].water=300;(await import("/js/ui/render.js")).render();});await pause(page,300);
  eq([await page.$eval('.fbody-h',e=>e.textContent),!!(await page.$('.fneed .fneed-i.f-w'))],["Your body needs more water.",true],"water is what is behind");
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
  /* About 7 m/s, a fix every 1.5 s: a stride the filter counts (js/engine/run.js). */
  for(let i=1;i<=12;i++){await ctx.setGeolocation({latitude:30.0444+i*0.00009,longitude:31.2357,accuracy:8});await pause(page,1500);}
  const r=await ev(page,"[S.run.pts.length,Math.round(S.run.dist),S.run.gps,S.run.act]");
  if(r[0]<3||r[1]<70||r[2]!=="on"||r[3]!=="Running")throw new Error("not tracking: "+JSON.stringify(r));
  if(!/^M[\d.]+ [\d.]+L/.test(await page.$eval('#runRoute',e=>e.getAttribute("d"))))throw new Error("no route drawn");
  if(!/^\d+:\d\d$/.test(await page.$eval('#runP',e=>e.textContent)))throw new Error("no pace");
  await page.tap('[data-run="pause"]');await pause(page,300);
  const t1=await page.$eval('#runT',e=>e.textContent);await pause(page,1600);
  eq(await page.$eval('#runT',e=>e.textContent),t1,"paused: the clock holds");
  eq(await page.$$eval('.run-ctl button',a=>a.map(b=>b.dataset.run)),["resume","finish"],"paused: Carry on and Finish, fixed at the bottom");
  await page.tap('[data-run="resume"]');await pause(page,300);
  eq(await page.$$eval('.run-ctl button',a=>a.map(b=>b.dataset.run)),["pause"],"running: Pause only, so a brush of the screen never ends it");
  eq(await page.$eval('.run-ctl',e=>getComputedStyle(e).position),"fixed","the controls stay put as the page scrolls");
  const seed=await ev(page,"Math.floor(S.run.started/1000)");
  await page.tap('[data-run="pause"]');await pause(page,300);
  await page.tap('[data-run="finish"]');await pause(page,800);
  const s=await ev(page,"[!!S.run,!!S.active,S.sessions[0].entries[0].name,S.sessions[0].entries[0].sets[0].km>0.03,S.sessions[0].entries[0].sets[0].route.length>=5,S.sessions[0].entries[0].sets[0].kcal>0,S.sessions[0].entries[0].sets[0].map]");
  eq(s,[false,false,"Running",true,true,true,seed],"saved as a run with its distance, route, calories and ground");
});
await test("Live tracking: a phone sitting still, its GPS wandering, is not a run — no distance, no route, and it says it is not moving",async page=>{
  const ctx=page.context();
  await ctx.grantPermissions(["geolocation"]);await ctx.setGeolocation({latitude:30.0444,longitude:31.2357,accuracy:12});
  await liveStart(page,"Running");
  /* About 10 m of wander each way, a fix a second, for twenty seconds (owner, 28 Oct:
     a shaken phone on a chair drew a line across the map). */
  const w=[[8,-6],[-9,4],[3,10],[-7,-8],[10,2],[-4,-9],[6,7],[-10,1],[2,-10],[9,5],[-6,8],[4,-7],[-8,-3],[7,9],[-3,6],[10,-4],[-9,-6],[5,3],[-2,-9],[8,8]];
  for(const [dx,dy] of w){await ctx.setGeolocation({latitude:30.0444+dy/111195,longitude:31.2357+dx/96300,accuracy:12});await pause(page,1000);}
  const r=await ev(page,"[Math.round(S.run.dist),S.run.pts.length]");
  if(r[0]>15)throw new Error("counted the wander as a run: "+JSON.stringify(r));
  eq(await page.$eval('#runD',e=>e.textContent),"0.00","the distance stays at nothing");
  if(!/Not moving/.test(await page.$eval('#runSt',e=>e.hidden?"":e.textContent)))throw new Error("it does not say it is not moving");
});
await test("Live tracking: a ride is its own: Cycling, speed in km/h, a countryside under the route, saved as a ride with a ride's calories",async page=>{
  const ctx=page.context();
  await ctx.grantPermissions(["geolocation"]);await ctx.setGeolocation({latitude:30.0444,longitude:31.2357,accuracy:8});
  await liveStart(page,"Cycling");
  eq(await page.evaluate(()=>[document.querySelector(".run").dataset.act,document.querySelector(".run-h").textContent,
    [...document.querySelectorAll(".run-c>span")].map(e=>e.textContent)]),["Cycling","Cycling",["km","Speed now km/h","Average km/h","kcal, an estimate"]],"a ride, read as speed");
  eq(await page.evaluate(()=>[document.querySelectorAll(".run-map .rm-field rect").length>10,document.querySelectorAll(".run-map .rm-road path").length,
    document.querySelectorAll(".run-map .rm-blk rect").length]),[true,3,0],"fields and roads, not a city");
  /* 22 m a fix every 1.5 s is about 15 m/s (53 km/h): a run would call each a leap,
     a ride keeps them. */
  for(let i=1;i<=6;i++){await ctx.setGeolocation({latitude:30.0444+i*0.0002,longitude:31.2357,accuracy:8});await pause(page,1500);}
  const r=await ev(page,"[S.run.pts.length,Math.round(S.run.dist)]");
  if(r[0]<5||r[1]<80)throw new Error("a ride's speed was taken for a leap: "+JSON.stringify(r));
  if(!/^\d+\.\d$/.test(await page.$eval('#runP',e=>e.textContent)))throw new Error("no speed: "+await page.$eval('#runP',e=>e.textContent));
  await page.tap('[data-run="pause"]');await pause(page,300);
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
    !!document.querySelector(".run-map .rm-peak path"),document.querySelector("#runP").nextElementSibling.textContent]),["Hiking",true,true,"Average /km"],"a hike: contours and peaks, read as pace");
});
await test("Live tracking: with location refused it is timed only, says so, and Finish opens the logger with the minutes in",async page=>{
  await page.evaluate(()=>{Object.defineProperty(navigator,"geolocation",{configurable:true,value:{watchPosition:(ok,err)=>{setTimeout(()=>err({code:1}),50);return 1;},clearWatch:()=>{}}});});
  await liveStart(page,"Walking");
  eq(await page.$eval('#runGps',e=>[e.className,e.textContent]),["run-gps denied","Location is off"],"the chip says so");
  await page.evaluate(async()=>{const S=(await import("/js/state.js")).S;S.run.ms=125000;(await import("/js/ui/render.js")).render();});await pause(page,300);
  if(!/timed only/.test(await page.$eval('.run-note',e=>e.textContent)))throw new Error("no note");
  await page.tap('[data-run="pause"]');await pause(page,300);
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
  eq(await page.$eval('[data-sstep="w"][data-d="1"]',e=>[e.textContent,(e.querySelector(":scope>.hapt-in")||e).getAttribute("aria-label")]),[String(step),"More "+step+" kg"],"the button says the step");
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
await test("Floating Coach: on every tab, never over a workout, a sheet or the keyboard; opening it from a workout keeps every value; Escape closes it",async page=>{
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
await test("Coach launcher wherever the dock is: a day, the program builder, a meal, the history, the profile; beside the dock, covering nothing; not over a live workout",async page=>{
  const at=async(label,set)=>{
    await page.evaluate(async src=>{const V=(await import("/js/ui/view.js")).V,S=(await import("/js/state.js")).S;(new Function("V","S",src))(V,S);(await import("/js/ui/render.js")).render();},set);
    await pause(page,400);
    const r=await page.evaluate(()=>{const nav=document.getElementById("nav"),d=document.querySelector("nav .dock").getBoundingClientRect(),f=document.querySelector("#cfab .cfab");
      const dock=getComputedStyle(nav).visibility==="visible";const fr=f&&f.getBoundingClientRect();
      return {dock,fab:!!f,beside:!!fr&&Math.abs(fr.bottom-d.bottom)<2&&fr.left>=d.right-1};});
    eq([r.dock,r.fab,r.beside],[true,true,true],label+": the dock and the coach beside it");};
  const day=await page.evaluate(async()=>(await import("/js/state.js")).split().days[0].id);
  await at("a day of the plan",'V.tab="train";V.train="day";V.dayId='+JSON.stringify(day)+';');
  await at("the program builder",'V.tab="train";V.train="builder";V.previewId=null;');
  await at("a meal",'V.tab="food";V.train="days";V.meal="Lunch";');
  await at("the history",'V.tab="progress";V.meal=null;V.phist=true;');
  await at("the profile",'V.tab="profile";V.phist=false;');
  await startWorkout(page);
  eq(await page.$$eval('#cfab .cfab',a=>a.length),0,"not over a live workout, where the dock is away too");
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

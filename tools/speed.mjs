/* Bunyan — how fast the app starts and moves, full and in Simple mode
   BUNYAN_URL=http://localhost:8797/index.html PW_PATH=… node tools/speed.mjs [runs]

   For a person with a long log (100 workouts), in Chromium with the processor slowed
   four times (about a mid-range phone), each mode started fresh [runs] times (5):
     start     ms from the page's start to the Today card on screen (median)
     modules   the JavaScript files loaded before that, and their size
     blocked   ms in the first 5 s that the page could not answer a tap: every long
               task's time over 50 ms (total blocking time), the start's own included,
               and whatever runs once the screen is up (median)
     tabs      ms from a dock tap to the next frame drawn, per tab (median)
   The service worker is off, so every start loads the code from the server, as a first
   visit does; the numbers compare modes and releases on one machine, not phones.
   Road map, 25 Nov: step 2 measures Simple mode; step 3 (a lighter app) is judged on
   these numbers. Never runs in the browser itself (tools/). */
import {createRequire} from "module";
const require=createRequire(process.env.PW_PATH||import.meta.url);
const pw=require("playwright");
const URL_=process.env.BUNYAN_URL||"http://localhost:8797/index.html";
const RUNS=+process.argv[2]||5;
const iso=d=>new Date(Date.now()-d*864e5).toISOString().slice(0,10);
const lifts=[["Barbell Bench Press - Medium Grip","Chest"],["Barbell Squat","Quads"],["Pullups","Back"]],sessions=[];
for(let d=2;d<200;d+=2)sessions.push({id:"s"+d,date:iso(d),dayName:"Seed",activeMs:45*6e4,
  entries:lifts.map(([n,m],i)=>({name:n,muscle:m,sets:[1,2,3].map(()=>({w:60+i*20,r:8,rpe:8}))}))});
const med=a=>{a=[...a].sort((x,y)=>x-y);return Math.round(a[Math.floor(a.length/2)]);};
const browser=await pw.chromium.launch();
for(const simple of [false,true]){
  const start=[],blocked=[],tabs={};let mods=0,kb=0;
  for(let run=0;run<RUNS;run++){
    const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:"block"});
    const db={v:2,onboarded:true,prefs:{lang:"en",splash:false,anim:true,unit:"kg",simple,rpe:"last"},
      profile:{age:30,height:180,weight:84,sex:"m",activity:1.4,goal:"gain",prog:"standard",level:"some",days:3},
      goals:{kcal:2500,p:150,c:300,f:70,water:3000,steps:9000},sessions,body:[{date:iso(3),weight:84}],days:{},
      myFoods:[],savedMeals:[],freq:{},favs:[],skip:[],userSplits:[],myEx:[]};
    await ctx.addInitScript(()=>{window.__lt=[];try{new PerformanceObserver(l=>l.getEntries().forEach(e=>window.__lt.push([e.startTime,e.duration])))
      .observe({type:"longtask",buffered:true});}catch(e){}});
    await ctx.addInitScript(db=>{if(localStorage.getItem("t:s"))return;localStorage.setItem("bunyan:notour","1");
      localStorage.setItem("bunyan:profiles",JSON.stringify([{id:"me",name:"Me",owner:true}]));localStorage.setItem("bunyan:current",'"me"');
      localStorage.setItem("bunyan:db:me",JSON.stringify(db));localStorage.setItem("t:s","1");},db);
    const page=await ctx.newPage();const cdp=await ctx.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate",{rate:4});
    await page.goto(URL_);
    await page.waitForFunction(()=>document.querySelector("#app [data-startday],#app [data-continue]"),null,{timeout:60000});
    const r=await page.evaluate(()=>{const js=performance.getEntriesByType("resource").filter(e=>/\.js(\?|$)/.test(e.name));
      return [performance.now(),js.length,js.reduce((s,e)=>s+(e.decodedBodySize||0),0)];});
    start.push(r[0]);mods=r[1];kb=Math.round(r[2]/1024);
    await page.waitForFunction(()=>performance.now()>5000,null,{timeout:20000});
    blocked.push(await page.evaluate(()=>window.__lt.filter(x=>x[0]<5000).reduce((s,x)=>s+Math.max(0,x[1]-50),0)));
    for(const tab of simple?["food","train","food","train"]:["food","coach","progress","train"]){
      const ms=await page.evaluate(async tab=>{const t0=performance.now();document.querySelector('nav [data-tab="'+tab+'"]').click();
        await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return performance.now()-t0;},tab);
      (tabs[tab]=tabs[tab]||[]).push(ms);await page.waitForTimeout(900);}
    await ctx.close();}
  console.log((simple?"Simple mode":"Full       ")+"  start "+med(start)+" ms · "+mods+" modules, "+kb+" KB before it · blocked "+med(blocked)+" ms · tabs "
    +Object.entries(tabs).map(([k,v])=>k+" "+med(v)+" ms").join(", "));}
await browser.close();

/* Bunyan — WebKit stress probe (temporary, owner 17 Nov: "A problem repeatedly occurred",
   restarts when Training is tapped and when swiping inner pages, on the iPhone).
   Drives the app in WebKit, the iPhone's engine, the way the owner uses it: the tabs
   tapped over and over, Training's and Food's plan tabs moved through, pages scrolled,
   with animations on and the service worker allowed. Reports every page crash, script
   error and reload, and the time each step took.

   STRESS_URL  the app to drive (default http://localhost:8765/index.html)
   LABEL       a name for the report
   ROUNDS      how many rounds (default 30) */
import {createRequire} from "module";
const require=createRequire(process.env.PW_PATH||import.meta.url);
const {webkit,devices}=require("playwright");
const URL_=process.env.STRESS_URL||"http://localhost:8765/index.html";
const LABEL=process.env.LABEL||"app";
const ROUNDS=+process.env.ROUNDS||30;
const iso=d=>{const x=new Date(Date.now()-d*864e5);return new Date(x-x.getTimezoneOffset()*6e4).toISOString().slice(0,10);};
/* Like the owner's: a three-day home program (Mon, Wed, Sat), a few weeks of logs with
   start times, a missed day this week, body weight, food. */
function seed(){
  const A=["3/4 Sit-Up","Pushups","Bodyweight Squat","Plank","Pullups"];
  const sessions=[];
  for(let d=2;d<45;d+=2){const st=new Date(iso(d)+"T18:05:00").getTime();
    sessions.push({id:"s"+d,date:iso(d),dayName:["Full Body A","Full Body B","Full Body C"][d%3],started:st,lastSet:st+38*6e4,activeMs:38*6e4,
      entries:A.map(n=>({name:n,sets:[1,2,3,4].map(()=>({w:0,r:20}))}))});}
  const days={};for(let d=0;d<10;d++)days[iso(d)]={meals:{Breakfast:[{name:"Eggs",kcal:300,p:20,c:2,f:22,g:150}]},water:1500};
  return {v:2,onboarded:true,prefs:{rpe:"last",autorest:true,sound:false,awake:false,splash:false,unit:"kg",lang:"en",anim:true,haptic:false,view:"set",warn:10,nowarm:true},
    profile:{age:30,height:180,weight:86,sex:"m",activity:1.4,goal:"gain",prog:"standard",level:"some",days:3},
    goals:{kcal:2500,p:150,c:300,f:70,water:3000,steps:9000},sessions,body:[{date:iso(10),weight:86},{date:iso(1),weight:86}],days,
    myFoods:[],savedMeals:[],freq:{},favs:[],skip:[],userSplits:[],myEx:[]};}

const browser=await webkit.launch();
const dev=devices["iPhone 13"]||{viewport:{width:390,height:844},isMobile:true,hasTouch:true};
const ctx=await browser.newContext({...dev,serviceWorkers:"allow"});
await ctx.addInitScript(db=>{if(!localStorage.getItem("t:seeded")){
  localStorage.setItem("bunyan:profiles",JSON.stringify([{id:"me",name:"Me",owner:true}]));
  localStorage.setItem("bunyan:current",'"me"');localStorage.setItem("bunyan:db:me",JSON.stringify(db));
  localStorage.setItem("bunyan:notour","1");localStorage.setItem("t:seeded","1");}},seed());
const page=await ctx.newPage();
const ev=[];let navs=0,crashed=0;
page.on("crash",()=>{crashed++;ev.push("CRASH");});
page.on("pageerror",e=>ev.push("PAGEERROR "+e.message+" @ "+String(e.stack||"").split("\n").slice(0,3).join(" < ")));
page.on("console",m=>{if(m.type()==="error")ev.push("CONSOLE "+m.text().slice(0,240));});
page.on("framenavigated",f=>{if(f===page.mainFrame())navs++;});
const t0=Date.now();
await page.goto(URL_);await page.waitForTimeout(3500);
const tab=async n=>{const t=Date.now();await page.evaluate(()=>{const nv=document.getElementById("nav");if(nv)nv.classList.remove("dhid");});
  await page.tap('nav [data-tab="'+n+'"]',{timeout:5000});await page.waitForTimeout(450);return Date.now()-t;};
const slow=[];
for(let r=0;r<ROUNDS&&!crashed;r++){
  try{
    for(const n of ["train","food","train","coach","progress","train"]){const ms=await tab(n);if(ms>1500)slow.push(n+" "+ms+"ms");}
    /* The plan tabs (the swipe's landing code, through slideTab), and back. */
    await page.evaluate(async()=>{const m=await import("/js/ui/exswipe.js");const V=(await import("/js/ui/view.js")).V;
      V.tab="train";V.train="hub";(await import("/js/ui/render.js")).render();});
    await page.waitForTimeout(400);
    for(const to of ["programs","exercises","program"]){await page.evaluate(async to=>{const m=await import("/js/ui/exswipe.js");m.slideTab("tplan",to);},to);await page.waitForTimeout(700);}
    await page.evaluate(()=>window.scrollTo(0,600));await page.waitForTimeout(200);await page.evaluate(()=>window.scrollTo(0,0));
    await tab("food");
    for(const to of ["plan","goals","today"]){await page.evaluate(async to=>{const m=await import("/js/ui/exswipe.js");m.slideTab("fplan",to);},to).catch(()=>{});await page.waitForTimeout(600);}
  }catch(e){ev.push("STEP "+String(e.message).split("\n")[0].slice(0,200));}
  if(r%5===4)console.log(LABEL,"round",r+1,"navs",navs,"events",ev.length,"nodes",await page.evaluate(()=>document.querySelectorAll("*").length).catch(()=>"?"));}
console.log("==",LABEL,"rounds done; crashes",crashed,"reloads",navs-1,"events",ev.length,"slow taps",slow.length,"time",Math.round((Date.now()-t0)/1000)+"s");
[...new Set(ev)].slice(0,25).forEach(e=>console.log("  ",e));
slow.slice(0,10).forEach(s=>console.log("  slow",s));
await browser.close();
process.exit(crashed||navs>1?1:0);

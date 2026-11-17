/* Bunyan — the iPhone check. Runs on every pull request (WP-10).
   The owner's iPhone ended the page ("A problem repeatedly occurred", 17 Nov) for what it
   cost, not for an error: about nine live blur layers on Training, doubled during a swipe,
   and both neighbouring pages' pictures decoded after every paint (fixed in v273).
   This drives the app in WebKit, the iPhone's engine, the way the owner uses it: the tabs
   tapped over and over, Training's and Food's plan tabs moved through, pages scrolled,
   animations on, the service worker allowed. It fails on any page crash, script error or
   reload, and when a main page grows heavier than the budget below, so the cost cannot
   creep back unnoticed.

   STRESS_URL  the app to drive (default http://localhost:8765/index.html)
   ENGINE      webkit (default) or chromium, for a local run where WebKit is missing
   ROUNDS      how many rounds (default 20) */
import {createRequire} from "module";
const require=createRequire(process.env.PW_PATH||import.meta.url);
const PW=require("playwright"),devices=PW.devices,engine=PW[process.env.ENGINE||"webkit"];
const URL_=process.env.STRESS_URL||"http://localhost:8765/index.html";
const LABEL=process.env.ENGINE||"webkit";
const ROUNDS=+process.env.ROUNDS||20;
/* The weight a main page may carry once it has settled. Live blur: the dock and the
   coach's button, with room for one sheet or toast; inside the page there is none.
   Pictures decoded for a swipe copy that is not on the page: none until a finger asks. */
const BUDGET={blur:4,offImgs:0,nodes:6000};
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

const browser=await engine.launch();
const dev=devices["iPhone 13"]||{viewport:{width:390,height:844},isMobile:true,hasTouch:true};
const ctx=await browser.newContext({...dev,serviceWorkers:"allow"});
await ctx.addInitScript(db=>{if(!localStorage.getItem("t:seeded")){
  localStorage.setItem("bunyan:profiles",JSON.stringify([{id:"me",name:"Me",owner:true}]));
  localStorage.setItem("bunyan:current",'"me"');localStorage.setItem("bunyan:db:me",JSON.stringify(db));
  localStorage.setItem("bunyan:notour","1");localStorage.setItem("t:seeded","1");}},seed());
/* A picture decoded inside a copy of a page that is not on the screen's page was built
   ahead for a swipe. The run makes no finger swipe, so each is work done for nothing. (A
   lone picture with no parent is the ground's, readied for its cross-fade: needed now.) */
await ctx.addInitScript(()=>{const d=HTMLImageElement.prototype.decode;window.__offDecodes=0;
  if(d)HTMLImageElement.prototype.decode=function(){if(!this.isConnected&&this.parentNode)window.__offDecodes++;return d.call(this);};});
const page=await ctx.newPage();
const ev=[];let navs=0,crashed=0;
page.on("crash",()=>{crashed++;ev.push("CRASH");});
page.on("pageerror",e=>ev.push("PAGEERROR "+e.message+" @ "+String(e.stack||"").split("\n").slice(0,3).join(" < ")));
page.on("console",m=>{if(m.type()==="error")ev.push("CONSOLE "+m.text().slice(0,240));});
/* A full page load (not the app's own history entries, which framenavigated also counts). */
page.on("load",()=>navs++);
const t0=Date.now();
await page.goto(URL_);await page.waitForTimeout(3500);
const tab=async n=>{const t=Date.now();await page.evaluate(()=>{window.__offDecodes=0;const nv=document.getElementById("nav");if(nv)nv.classList.remove("dhid");});
  await page.tap('nav [data-tab="'+n+'"]',{timeout:5000});await page.waitForTimeout(450);return Date.now()-t;};
const slow=[],heavy=[],seen={};
/* What the settled page costs: live blur layers that are drawn, pictures decoded for a
   swipe copy that is not on the page (since the last tab tap), and the number of elements. */
const weigh=async where=>{await page.waitForTimeout(900);
  const w=await page.evaluate(()=>{let blur=0;
    document.querySelectorAll("body *").forEach(e=>{const c=getComputedStyle(e),b=c.backdropFilter||c.webkitBackdropFilter;
      if(b&&b!=="none"&&e.getClientRects().length&&c.visibility!=="hidden"&&c.display!=="none")blur++;});
    return {blur,offImgs:window.__offDecodes||0,nodes:document.querySelectorAll("*").length};}).catch(()=>null);
  if(!w)return;
  const m=seen[where]=seen[where]||{blur:0,offImgs:0,nodes:0};for(const k in w)m[k]=Math.max(m[k],w[k]);
  for(const k in BUDGET)if(w[k]>BUDGET[k])heavy.push(where+" "+k+" "+w[k]+" > "+BUDGET[k]);};
for(let r=0;r<ROUNDS&&!crashed;r++){
  try{
    for(const n of ["train","food","train","coach","progress","train"]){const ms=await tab(n);if(ms>1500)slow.push(n+" "+ms+"ms");if(r<2)await weigh(n);}
    /* The plan tabs (the swipe's landing code, through slideTab), and back. */
    await page.evaluate(async()=>{const m=await import("/js/ui/exswipe.js");const V=(await import("/js/ui/view.js")).V;
      V.tab="train";V.train="hub";(await import("/js/ui/render.js")).render();});
    await page.waitForTimeout(400);
    for(const to of ["programs","exercises","program"]){await page.evaluate(async to=>{const m=await import("/js/ui/exswipe.js");m.slideTab("tplan",to);},to);await page.waitForTimeout(700);}
    await page.evaluate(()=>window.scrollTo(0,600));await page.waitForTimeout(200);await page.evaluate(()=>window.scrollTo(0,0));
    if(r<2)await weigh("training plan");
    await tab("food");
    for(const to of ["plan","goals","today"]){await page.evaluate(async to=>{const m=await import("/js/ui/exswipe.js");m.slideTab("fplan",to);},to).catch(()=>{});await page.waitForTimeout(600);}
  }catch(e){ev.push("STEP "+String(e.message).split("\n")[0].slice(0,200));}
    if(r<2)await weigh("food plan");
  if(r%5===4)console.log(LABEL,"round",r+1,"navs",navs,"events",ev.length,"nodes",await page.evaluate(()=>document.querySelectorAll("*").length).catch(()=>"?"));}
for(const k in seen)console.log("  weight",k.padEnd(14),"blur",seen[k].blur,"pictures built ahead",seen[k].offImgs,"elements",seen[k].nodes);
console.log("==",LABEL,"rounds done; crashes",crashed,"reloads",navs-1,"events",ev.length,"slow taps",slow.length,"time",Math.round((Date.now()-t0)/1000)+"s");
[...new Set(ev)].slice(0,25).forEach(e=>console.log("  ",e));
slow.slice(0,10).forEach(s=>console.log("  slow",s));
[...new Set(heavy)].forEach(s=>console.log("  TOO HEAVY",s));
await browser.close();
process.exit(crashed||navs>1||ev.length||heavy.length?1:0);

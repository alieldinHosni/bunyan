/* Bunyan — the reliability sweep (owner, 25 Nov: "I am sick of this inconsistency")
   Goes through the app's main moves as a person does — the dock's tabs, a swipe between
   them, a plan page's tabs tapped and swiped, a page opened and closed, a sheet, a workout
   started and left — with animations on, and watches every frame for 1.5 s after each:
     jump     the layout shifted after the move (PerformanceObserver "layout-shift"; a
              page's slide is a transform and does not count)
     late     an animation started more than 700 ms after the move (an entrance playing
              once the page had already landed: the "waits a second then flashes")
     blank    a picture on the screen not yet drawn once the move should have settled
   Prints what it finds per move and exits 1 on any. Run against a served copy:
     BUNYAN_URL=http://localhost:8797/index.html PW_PATH=… node tests/sweep.mjs
   ENGINE=webkit to run it in Safari's engine. */
import {createRequire} from "module";
const require=createRequire(process.env.PW_PATH||import.meta.url);
const pw=require("playwright");
const URL_=process.env.BUNYAN_URL||"http://localhost:8765/index.html";
const ENGINE=process.env.ENGINE||"chromium";
const iso=d=>new Date(Date.now()-d*864e5).toISOString().slice(0,10);
function seed(){
  const lifts=[["Barbell Bench Press - Medium Grip","Chest"],["Barbell Squat","Quads"],["Pullups","Back"]],sessions=[];
  for(let d=2;d<40;d+=3)sessions.push({id:"s"+d,date:iso(d),dayName:"Seed",activeMs:45*6e4,
    entries:lifts.map(([n,m],i)=>({name:n,muscle:m,sets:[1,2,3].map(()=>({w:60+i*20,r:8,rpe:8}))}))});
  return {v:2,onboarded:true,prefs:{rpe:"last",autorest:false,sound:false,awake:false,splash:false,unit:"kg",lang:process.env.LANG_APP||"en",anim:true,haptic:false,view:"set",warn:10,nowarm:true},
    profile:{age:30,height:180,weight:84,sex:"m",activity:1.4,goal:"gain",prog:"standard",level:"some",days:3},
    goals:{kcal:2500,p:150,c:300,f:70,water:3000,steps:9000},sessions,body:[{date:iso(3),weight:84}],days:{},
    myFoods:[],savedMeals:[],freq:{},favs:[],skip:[],userSplits:[],myEx:[]};}
const browser=await pw[ENGINE].launch();
const dev=pw.devices["iPhone 13"];
const ctx=await browser.newContext({...dev});
await ctx.addInitScript(db=>{if(!localStorage.getItem("t:seeded")){
  localStorage.setItem("bunyan:profiles",JSON.stringify([{id:"me",name:"Me",owner:true}]));localStorage.setItem("bunyan:current",'"me"');
  localStorage.setItem("bunyan:db:me",JSON.stringify(db));localStorage.setItem("bunyan:notour","1");localStorage.setItem("t:seeded","1");}},seed());
const page=await ctx.newPage();const errs=[];page.on("pageerror",e=>errs.push(e.message));
await page.goto(URL_);await page.waitForTimeout(2500);
const cdp=ENGINE==="chromium"&&!process.env.SYNTH?await ctx.newCDPSession(page):null;
/* the recorder, armed just before a move */
const arm=()=>page.evaluate(()=>{const R=window.__sw={t0:performance.now(),shift:[],late:new Set(),blank:new Set()};
  try{R.po=new PerformanceObserver(l=>{l.getEntries().forEach(e=>{if(!e.hadRecentInput&&e.value>0.001&&!(e.sources||[]).every(s=>s.node===document.body))R.shift.push({v:+e.value.toFixed(4),t:Math.round(e.startTime-R.t0),n:(e.sources||[]).map(s=>s.node&&s.node.className&&String(s.node.className.baseVal!==undefined?s.node.className.baseVal:s.node.className).slice(0,40)).join("|")});});});
    R.po.observe({type:"layout-shift",buffered:false});}catch(e){}
  const vis=el=>{const r=el.getBoundingClientRect();return r.width>8&&r.height>8&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth&&getComputedStyle(el).visibility!=="hidden";};
  (function f(){const t=performance.now()-R.t0;
    document.getAnimations().forEach(a=>{const tg=a.effect&&a.effect.target;if(!tg||!tg.closest)return;
      if(tg.closest(".art,#bgart,#splash,.stillcopy,.toast,#cfab,.sheetghost"))return;
      const tm=a.effect.getTiming&&a.effect.getTiming();if(tm&&tm.iterations===Infinity)return;
      if(a.playState==="running"&&t>700&&!R.seenEarly?.has(a)){const st=a.startTime==null?t:(a.startTime-R.t0);
        if(st>700)R.late.add((a.animationName||a.id||"anim")+" @ "+String(tg.className&&tg.className.baseVal!==undefined?tg.className.baseVal:tg.className).slice(0,40)+" "+Math.round(st)+"ms");}});
    if(t>900)document.querySelectorAll("#app img,#sheet img").forEach(im=>{if(/^https?:/.test(im.getAttribute("src")||"")&&!(im.getAttribute("src")||"").startsWith(location.origin))return;if(vis(im)&&(!im.complete||!im.naturalWidth))R.blank.add((im.getAttribute("src")||"").split("/").pop()+" "+Math.round(t)+"ms");});
    if(t<1500)requestAnimationFrame(f);else{try{R.po.disconnect();}catch(e){}R.done=true;}})();});
const collect=async()=>{await page.waitForFunction(()=>window.__sw&&window.__sw.done,null,{timeout:8000}).catch(()=>{});
  return page.evaluate(()=>{const R=window.__sw;return {shift:R.shift,late:[...R.late],blank:[...R.blank]};});};
const ev=e=>page.evaluate(async e=>{const S=(await import("/js/state.js")).S,V=(await import("/js/ui/view.js")).V;return eval(e);},e);
const tapEl=async sel=>{if(/^nav /.test(sel)){await page.evaluate(()=>window.scrollBy(0,-60));await page.waitForTimeout(450);}
  await page.waitForSelector(sel,{timeout:4000});await page.tap(sel);};
/* A finger's drag: the browser's own touch input where it has one (Chromium), else touch
   events made in the page (WebKit), on the element under the finger, the way
   tests/regression.mjs drives the swipes. Arabic mirrors the direction. */
const RTL=(process.env.LANG_APP||"en")==="ar";
const drag=async(x0,y0,x1,y1)=>{if(RTL){x0=390-x0;x1=390-x1;}
  if(!cdp){
    /* WebKit will not let a page construct a Touch ("Illegal constructor"): the events
       are plain ones carrying the same fields the app reads (touches, changedTouches). */
    await page.evaluate(async([x0,y0,x1,y1])=>{const el=document.elementFromPoint(x0,y0)||document.body;
      const T=(x,y)=>({identifier:1,target:el,clientX:x,clientY:y,pageX:x,pageY:y+scrollY,screenX:x,screenY:y});
      const mk=(t,x,y)=>{const e=new Event(t,{bubbles:true,cancelable:true});
        Object.defineProperty(e,"touches",{value:t==="touchend"?[]:[T(x,y)]});Object.defineProperty(e,"changedTouches",{value:[T(x,y)]});
        Object.defineProperty(e,"targetTouches",{value:t==="touchend"?[]:[T(x,y)]});return e;};
      el.dispatchEvent(mk("touchstart",x0,y0));
      for(let i=1;i<=12;i++){el.dispatchEvent(mk("touchmove",x0+(x1-x0)*i/12,y0+(y1-y0)*i/12));await new Promise(r=>setTimeout(r,16));}
      window.__dragEnd=()=>el.dispatchEvent(mk("touchend",x1,y1));},[x0,y0,x1,y1]);
    await arm();await page.evaluate(()=>window.__dragEnd());return;}
  await cdp.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x:x0,y:y0}]});
  for(let i=1;i<=12;i++){await cdp.send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:[{x:x0+(x1-x0)*i/12,y:y0+(y1-y0)*i/12}]});await page.waitForTimeout(16);}
  await arm();await cdp.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});};
/* a point of #app with no swipe of its own, no side scroller, no button */
const freeY=()=>page.evaluate(()=>{const free=(px,y)=>{const e=document.elementFromPoint(px,y);/* the week card swipes between weeks: its own, by design */
    if(!e||!e.closest("#app")||e.closest("[data-swipe],.wkr,input,button,a"))return false;
    let x=e;while(x&&x.id!=="app"){if(x.scrollWidth>x.clientWidth+2&&/auto|scroll/.test(getComputedStyle(x).overflowX))return false;x=x.parentElement;}return true;};
  /* free where a drag starts on either side, and in the middle */
  for(let y=200;y<720;y+=20)if(free(60,y)&&free(200,y)&&free(330,y))return y;return 420;});
const SIMPLE=process.env.MODE==="simple";
const MOVES_ALL=[
  ["dock: Training → Food",async()=>tapEl('nav [data-tab="food"]')],
  ["dock: Food → Coach",async()=>tapEl('nav [data-tab="coach"]')],
  ["dock: Coach → Progress",async()=>tapEl('nav [data-tab="progress"]')],
  ["dock: Progress → Training",async()=>tapEl('nav [data-tab="train"]')],
  ["swipe: Training → Food",async()=>{const y=await freeY();await drag(330,y,60,y+4);}],
  ["swipe: Food → Training",async()=>{const y=await freeY();await drag(60,y,330,y+4);}],
  ["open: the training plan",async()=>{await page.evaluate(()=>window.scrollTo(0,9999));await page.waitForTimeout(300);await tapEl('#app .pgc [data-tplan],#app [data-tplan="program"]');}],
  ["plan tab tapped: Programs & exercises",async()=>tapEl('#app .psecs [data-tplan="programs"]')],
  ["plan tab swiped: back to My program",async()=>{await page.evaluate(()=>window.scrollTo(0,0));await page.waitForTimeout(200);const y=await freeY();await drag(60,y,330,y+4);}],
  ["plan tab swiped: to Programs & exercises",async()=>{await page.evaluate(()=>window.scrollTo(0,0));await page.waitForTimeout(200);const y=await freeY();await drag(330,y,60,y+4);}],
  ["back: plan → Training",async()=>tapEl('#app .dhead [data-back]')],
  ["dock: Training → Food (again)",async()=>tapEl('nav [data-tab="food"]')],
  ["open: Food's plan",async()=>{await page.evaluate(()=>window.scrollTo(0,9999));await page.waitForTimeout(300);await tapEl('#app [data-fplan]');}],
  ["back: Food's plan → Food",async()=>tapEl('#app .dhead [data-back]')],
  ["sheet: an exercise opened",async()=>page.evaluate(async()=>{(await import("/js/ui/actions.js")).openSheet("exdetail",{name:"Barbell Squat"});})],
  ["sheet: closed",async()=>page.evaluate(async()=>{(await import("/js/ui/actions.js")).closeSheet();})],
  ["dock: Food → Training (again)",async()=>tapEl('nav [data-tab="train"]')],
  ["open: Profile",async()=>{await page.evaluate(()=>window.scrollTo(0,0));await page.waitForTimeout(200);await tapEl('.hacts .havatar');}],
  ["back: Profile → Training",async()=>tapEl('#app [data-back]')]];
/* where each move must leave the app: a move that did not happen is a problem too */
const WANT={"dock: Training → Food":"food","dock: Food → Coach":"coach","dock: Coach → Progress":"progress","dock: Progress → Training":"train",
  "swipe: Training → Food":"food","swipe: Food → Training":"train","open: the training plan":"train/plan/program",
  "plan tab tapped: Programs & exercises":"train/plan/programs","plan tab swiped: back to My program":"train/plan/program",
  "plan tab swiped: to Programs & exercises":"train/plan/programs","back: plan → Training":"train","open: Profile":"profile","back: Profile → Training":"train"};
/* Simple mode has no Coach or Progress (js/ui/simple.js) */
const MOVES=SIMPLE?MOVES_ALL.filter(m=>!/Coach|Progress/.test(m[0])).map(m=>m[0]==="dock: Training → Food"?m:m):MOVES_ALL;
if(SIMPLE)await page.evaluate(async()=>{const st=await import("/js/state.js");st.S.prefs.simple=true;st.saveDB();(await import("/js/ui/render.js")).render();});
let bad=0;
for(const [name,go] of MOVES){
  await page.waitForTimeout(700);
  await arm();
  try{await go();}catch(e){const m=String(e.message).split("\n")[0];
    if(/^skip:/.test(m)){console.log("skip "+name+" — "+m.slice(6));await page.evaluate(()=>{window.__sw.done=true;});continue;}
    console.log("FAIL "+name+" — could not do it: "+m);bad++;continue;}
  const r=await collect();
  const want=WANT[name],at=await ev("V.tab+(V.tab==='train'&&V.train==='plan'?'/plan/'+V.tplan:'')");
  const shifts=r.shift.reduce((a,b)=>a+b.v,0);
  const issues=[];
  if(shifts>0.01)issues.push("jump "+shifts.toFixed(3)+" "+JSON.stringify(r.shift.slice(0,4)));
  if(r.late.length)issues.push("late: "+r.late.slice(0,6).join("; "));
  if(r.blank.length)issues.push("blank: "+r.blank.slice(0,6).join("; "));
  if(want&&at!==want&&!(want==="train"&&at==="train"))issues.push("did not happen: at "+at+", not "+want);
  console.log((issues.length?"FAIL ":"ok   ")+name+(issues.length?"\n       "+issues.join("\n       "):""));
  if(issues.length)bad++;}
if(errs.length){console.log("page errors:",errs.slice(0,5).join(" | "));bad++;}
console.log("== sweep ("+ENGINE+(RTL?", Arabic":"")+(SIMPLE?", Simple mode":"")+"):",MOVES.length,"moves,",bad,"with problems");
await browser.close();
process.exit(bad?1:0);

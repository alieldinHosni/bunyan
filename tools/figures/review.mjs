/* Bunyan — the 3D figure, checked against the library's photographs
   node tools/figures/review.mjs OUT_DIR "Name one" "Name two" …
   Draws each named exercise's record (js/data/mannequin/records.js) at its start and
   its end with the app's live renderer, from the record's own view (VIEW=yaw,pitch
   to look from elsewhere), and writes OUT_DIR/<n>-0.png, <n>-1.png and names.json.
   Then
     python3 tools/figures/review.py OUT_DIR
   puts each one beside the library's two photographs of the same exercise, a row an
   exercise, on sheets to look through. A figure ships only when its row agrees with
   the photographs (docs/MANNEQUIN3D.md).
   Needs the repository served (python3 -m http.server 8765) and Playwright. */
import fs from "fs";
import {createRequire} from "module";
const require=createRequire(process.env.PW_PATH||import.meta.url);
const {chromium}=require("playwright");
const OUT=process.argv[2],NAMES=process.argv.slice(3);
const URL_=process.env.BUNYAN_URL||"http://localhost:8765/";
const VIEW=process.env.VIEW?process.env.VIEW.split(",").map(Number):null;
fs.mkdirSync(OUT,{recursive:true});
const b=await chromium.launch({executablePath:process.env.CHROMIUM||undefined,
  args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
const page=await (await b.newContext({viewport:{width:700,height:600},deviceScaleFactor:1})).newPage();
const errs=[];page.on("pageerror",e=>errs.push(e.message));
await page.goto(URL_+"tools/figures/live.html?ex=-&themes=blue-dark");
await page.waitForFunction(()=>window.__ready,null,{timeout:30000});
const done=[];
for(const [k,n] of NAMES.entries()){
  const res=await page.evaluate(async([n,view])=>{
    const M=window.__mq,R=await import("/js/data/mannequin/records.js");
    if(!R.recordFor(n))return {err:"no record"};
    const grid=document.getElementById("grid");
    grid.style.display="block";
    grid.innerHTML='<div class="pv-cell" data-palette="blue" data-theme="dark" style="width:480px;padding:0;border-radius:0">'+M.fig3dHtml(n,{})+'</div>';
    M.syncMannequins();
    const m=M.mannequins().find(x=>x.name===n);
    for(let i=0;i<200&&!m.state().live;i++)await new Promise(r=>setTimeout(r,50));
    if(!m.state().live)return {err:m.state().err||"not live"};
    if(view)m.setView({yaw:view[0],pitch:view[1]});
    await new Promise(r=>setTimeout(r,60));
    const cv=m.el.querySelector("canvas"),out=[];
    for(const u of [0,1]){m.setU(u);await new Promise(r=>setTimeout(r,30));m.setU(u);out.push(cv.toDataURL("image/png"));}
    return {frames:out};},[n,VIEW]);
  if(res.err){console.log(n,"—",res.err);continue;}
  res.frames.forEach((f,u)=>fs.writeFileSync(OUT+"/"+k+"-"+u+".png",Buffer.from(f.split(",")[1],"base64")));
  done.push({k,name:n});console.log(n);}
const lib=JSON.parse(fs.readFileSync(new URL("../../exercises.json",import.meta.url),"utf8"));
fs.writeFileSync(OUT+"/names.json",JSON.stringify(done.map(d=>({k:d.k,name:d.name,id:lib[d.name]?lib[d.name].i:null}))));
if(errs.length)console.log("page errors:",errs.slice(0,5).join("\n"));
await b.close();

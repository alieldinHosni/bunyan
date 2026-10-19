/* Bunyan — the 3D figure's still pictures
   node tools/figures/stills.mjs OUT_DIR [name filter]
   The start and the end of every exercise with a record (js/data/mannequin/records.js),
   drawn by the app's own live renderer (js/ui/mannequin.js) in Chromium, in the default
   theme (Blue, dark) at 1080×810: OUT_DIR/<id>-0.png and <id>-1.png, and OUT_DIR/<id>.json,
   where the figure is in the start frame (for the list thumbnail's crop). Then
     python3 tools/images.py rendered OUT_DIR
   makes the files the app ships: img/fig/<id>-<n>.webp, img/ex/<id>.webp and
   js/data/figures.js. These are what a phone without WebGL2 shows, and the lists'
   thumbnails.
   Needs the repository served (python3 -m http.server 8765) and Playwright with Chromium:
     PW_PATH=$(npm root -g)/ CHROMIUM=/path/to/chrome node tools/figures/stills.mjs out */
import fs from "fs";
import {createRequire} from "module";
const require=createRequire(process.env.PW_PATH||import.meta.url);
const {chromium}=require("playwright");
const OUT=process.argv[2]||"stills-out",FILTER=(process.argv[3]||"").toLowerCase();
const URL_=process.env.BUNYAN_URL||"http://localhost:8765/";
fs.mkdirSync(OUT,{recursive:true});
const b=await chromium.launch(process.env.CHROMIUM?{executablePath:process.env.CHROMIUM}:{});
const page=await (await b.newContext({viewport:{width:1200,height:1000},deviceScaleFactor:1})).newPage();
page.on("pageerror",e=>console.error("page:",e.message));
await page.goto(URL_+"tools/figures/live.html?ex=-&themes=blue-dark");
await page.waitForFunction(()=>window.__ready,null,{timeout:30000});
const names=await page.evaluate(async f=>{const R=(await import("/js/data/mannequin/records.js")).RECORDS;
  return Object.keys(R).filter(n=>!f||n.toLowerCase().indexOf(f)>=0);},FILTER);
for(const n of names){
  const res=await page.evaluate(async n=>{
    const M=window.__mq,R=(await import("/js/data/mannequin/records.js")).RECORDS,mo=await import("/js/data/mannequin/motion.js"),
      G=await import("/js/data/mannequin/geom.js"),rig=await import("/js/data/mannequin/rig.js");
    const grid=document.getElementById("grid");
    grid.style.display="block";
    grid.innerHTML='<div class="pv-cell" data-palette="blue" data-theme="dark" style="width:1080px;padding:0;border-radius:0">'+M.fig3dHtml(n,{})+'</div>';
    M.syncMannequins();
    /* a new figure starts once the page has painted */
    let m;for(let i=0;i<100&&!(m=M.mannequins().find(x=>x.name===n));i++)await new Promise(r=>setTimeout(r,30));
    if(!m)return {err:"not started"};
    for(let i=0;i<200&&!m.state().live;i++)await new Promise(r=>setTimeout(r,50));
    const cv=m.el.querySelector("canvas"),out={};
    for(const u of [0,1]){m.setU(u);out[u]=cv.toDataURL("image/png");}
    /* where the body is in the start frame, for the thumbnail */
    const cam=m.view().cam,W=cv.width,H=cv.height,J=rig.joints(mo.poseAt(R[n],0));
    let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
    mo.bodySpheres(J).forEach(([p,r])=>{const q=G.project(cam,p),px=(q[0]+1)/2*W,py=(1-q[1])/2*H,rr=r/q[2]/cam.tx*W/2;
      x0=Math.min(x0,px-rr);x1=Math.max(x1,px+rr);y0=Math.min(y0,py-rr);y1=Math.max(y1,py+rr);});
    return {id:R[n].id,frames:out,w:W,h:H,box:[x0,y0,x1,y1]};},n);
  for(const u of [0,1])fs.writeFileSync(OUT+"/"+res.id+"-"+u+".png",Buffer.from(res.frames[u].split(",")[1],"base64"));
  fs.writeFileSync(OUT+"/"+res.id+".json",JSON.stringify({w:res.w,h:res.h,box:res.box}));
  console.log(n,"→",res.id,res.w+"×"+res.h);}
await b.close();

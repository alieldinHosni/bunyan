/* Bunyan — the instructional figure: the driver
   node tools/figures/run.mjs [OUT_DIR] [name filter]
   Renders every exercise in poses.mjs (or those whose name contains the filter) to
   OUT_DIR/<id>-<frame>.png at 1080×810 (1.5 times the 720×540 shipped, for smooth
   edges), on four worker threads, each taking every fourth row. The muscles the
   exercise works (its main and other muscles in the app's own data) are lit. The two
   frames share one camera, so they line up, and OUT_DIR/<id>.json keeps the path the
   moving hand, foot or knee travels between them, in output pixels, for the arrow
   tools/images.py draws. tools/images.py figures then makes the files the app ships.
   An exercise the app also draws live (it has a record in js/data/mannequin/records.js)
   is posed from that record, and its arrow follows the record's own path.
     PREVIEW=1   half size, for checking poses quickly
     KEEP=1      skip frames already in OUT_DIR
     SET=file    another set of poses (a module exporting FIGS), for trying things */
import fs from "fs";
import zlib from "zlib";
import os from "os";
import {Worker,isMainThread,parentPort,workerData} from "worker_threads";
import {render,camera,project,V} from "./render.mjs";
import {scene,joints,highlight} from "./body.mjs";
import {motionPath} from "../../js/data/mannequin/motion.js";

if(!isMainThread){
  const {prims,cam,W,H,y0,opt}=workerData;
  parentPort.postMessage(render(prims,cam,W,H,y0,H,opt));
}else{
  const OUT=process.argv[2]||"figures-out",FILTER=(process.argv[3]||"").toLowerCase();
  fs.mkdirSync(OUT,{recursive:true});
  const FIGS=(await import(process.env.SET?new URL(process.env.SET,"file://"+process.cwd()+"/").href:"./poses.mjs")).FIGS;
  const MUS=await muscles();
  const SC=process.env.PREVIEW?.5:1,W=1080*SC,H=810*SC,NW=Math.min(4,os.cpus().length);
  /* the shipped size, which the arrow's path is measured in */
  const OW=720,OH=540;
  const names=Object.keys(FIGS).filter(n=>!FILTER||n.toLowerCase().indexOf(FILTER)>=0);
  for(const name of names){
    const fx=FIGS[name],t0=Date.now();
    const mu=fx.mus||MUS[name]||[],hl=highlight(mu[0],mu[1],fx.refine);
    const scenes=fx.frames.map(f=>scene(f,hl));
    const cam=fit(scenes.flatMap(s=>s.prims),fx.cam||{},W/H,W/H);
    if(fx.frames.length>1)fs.writeFileSync(OUT+"/"+fx.id+".json",JSON.stringify({w:OW,h:OH,
      paths:fx.rec?recPaths(fx.rec,cam,OW,OH):paths(fx.frames,cam,OW,OH)}));
    for(let i=0;i<scenes.length;i++){
      const file=OUT+"/"+fx.id+"-"+i+".png";
      if(process.env.KEEP&&fs.existsSync(file))continue;
      const prims=scenes[i].prims,bands=[];
      for(let k=0;k<NW;k++)
        bands.push(new Promise((res,rej)=>{const w=new Worker(new URL(import.meta.url),{workerData:{prims,cam,W,H,y0:k,opt:{step:NW}}});
          w.on("message",m=>{res({k,buf:m});w.terminate();});w.on("error",rej);}));
      const parts=await Promise.all(bands),rgba=Buffer.alloc(W*H*4);
      parts.forEach(p=>{const b=Buffer.from(p.buf.buffer,p.buf.byteOffset,p.buf.byteLength);
        for(let r=0,y=p.k;y<H;r++,y+=NW)b.copy(rgba,y*W*4,r*W*4,(r+1)*W*4);});
      fs.writeFileSync(file,png(rgba,W,H));}
    console.log(name,fx.frames.length,"frame(s)",((Date.now()-t0)/1000).toFixed(1)+"s");}
}

/* What each exercise works, from the app's own library: [main muscle, [others]]. */
async function muscles(){
  const lib=JSON.parse(fs.readFileSync(new URL("../../exercises.json",import.meta.url),"utf8"));
  const {EXTRA}=await import("../../js/data/extra.js");
  const out={};for(const [n,v] of Object.entries(Object.assign({},lib,EXTRA)))out[n]=[v.m,v.x||[]];return out;}

/* One camera for every frame: aimed at the middle of everything drawn, as close as
   keeps it all inside the frame with a margin. */
function fit(prims,c,aspect,real){
  const yaw=c.yaw!=null?c.yaw:60,pitch=c.pitch!=null?c.pitch:8,fov=c.fov||28,margin=c.margin||.84;
  let lo=[1e9,1e9,1e9],hi=[-1e9,-1e9,-1e9];
  prims.forEach(q=>{for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],q.c[k]-q.r*.7);hi[k]=Math.max(hi[k],q.c[k]+q.r*.7);}});
  lo[1]=Math.min(lo[1],0);
  let target=V.mul(V.add(lo,hi),.5);if(c.target)target=V.add(target,c.target);
  let a=.5,b=40;
  for(let it=0;it<40;it++){const d=(a+b)/2,cam=camera(target,d,yaw,pitch,fov,aspect);
    let m=0;for(const q of prims){
      const pr=project(cam,q.c),rx=q.r*.7/pr[2]/cam.tx,ry=q.r*.7/pr[2]/cam.ty;
      m=Math.max(m,Math.abs(pr[0])+rx,Math.abs(pr[1])+ry);}
    if(m>margin)a=d;else b=d;}
  return camera(target,b*(c.zoom||1),yaw,pitch,fov,real||aspect);}

/* The way the exercise moves, for its arrow: the poses between start and end, and the
   path of whichever hand, foot, knee or the hips travels furthest (with its other side
   when that moves almost as far), projected to the picture's pixels. */
function paths(frames,cam,w,h){
  const N=12,fill=p=>{const J=joints(p),q=Object.assign({pitch:0,yaw:0,roll:0,twist:0,head:0},p);
    q.hands={l:(p.hands&&p.hands.l)||J.wr.l,r:(p.hands&&p.hands.r)||J.wr.r};
    q.feet={l:(p.feet&&p.feet.l)||J.an.l,r:(p.feet&&p.feet.r)||J.an.r};return q;};
  const A=fill(frames[0]),B=fill(frames[frames.length-1]);
  const L=(x,y,t)=>{if(x==null)return y;if(y==null)return x;
    if(typeof x==="number"&&typeof y==="number")return x+(y-x)*t;
    if(Array.isArray(x)&&Array.isArray(y))return x.map((v,i)=>v+(y[i]-v)*t);
    if(typeof x==="object"&&typeof y==="object"){const o={};for(const k of new Set([...Object.keys(x),...Object.keys(y)]))o[k]=L(x[k],y[k],t);return o;}
    return t<.5?x:y;};
  const pose=t=>{const o={};for(const k of new Set([...Object.keys(A),...Object.keys(B)]))if(k!=="props")o[k]=L(A[k],B[k],t);return o;};
  const Js=[];for(let i=0;i<=N;i++)Js.push(joints(pose(i/N)));
  const pick={"wr.l":J=>J.wr.l,"wr.r":J=>J.wr.r,"an.l":J=>J.an.l,"an.r":J=>J.an.r,"kn.l":J=>J.kn.l,"kn.r":J=>J.kn.r,"P":J=>J.P};
  const lens={};for(const k in pick){let s=0;for(let i=1;i<=N;i++)s+=V.len(V.sub(pick[k](Js[i]),pick[k](Js[i-1])));lens[k]=s;}
  const best=Object.keys(lens).sort((a,b)=>lens[b]-lens[a])[0];
  if(!best||lens[best]<.06)return [];
  const keys=[best],twin=best.replace(/\.l$/,".X").replace(/\.r$/,".l").replace(/\.X$/,".r");
  if(twin!==best&&lens[twin]>lens[best]*.6)keys.push(twin);
  const px=q=>{const pr=project(cam,q);return [+((pr[0]+1)/2*w).toFixed(1),+((1-pr[1])/2*h).toFixed(1)];};
  return keys.map(k=>Js.map(J=>px(pick[k](J))));}

/* The same for an exercise with a record: the path of its hands on the machine, both
   sides, as the record moves them. */
function recPaths(rec,cam,w,h){
  const px=q=>{const pr=project(cam,q);return [+((pr[0]+1)/2*w).toFixed(1),+((1-pr[1])/2*h).toFixed(1)];};
  return ["l","r"].map(s=>motionPath(rec,12,s).map(px));}

/* A minimal PNG: RGBA, no filtering. */
function png(rgba,W,H){
  const raw=Buffer.alloc((W*4+1)*H);
  for(let y=0;y<H;y++){raw[y*(W*4+1)]=0;rgba.copy(raw,y*(W*4+1)+1,y*W*4,(y+1)*W*4);}
  const chunk=(t,d)=>{const l=Buffer.alloc(4);l.writeUInt32BE(d.length);const td=Buffer.concat([Buffer.from(t),d]);
    const c=Buffer.alloc(4);c.writeUInt32BE(crc(td)>>>0);return Buffer.concat([l,td,c]);};
  const ih=Buffer.alloc(13);ih.writeUInt32BE(W,0);ih.writeUInt32BE(H,4);ih[8]=8;ih[9]=6;ih[10]=0;ih[11]=0;ih[12]=0;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk("IHDR",ih),chunk("IDAT",zlib.deflateSync(raw,{level:6})),chunk("IEND",Buffer.alloc(0))]);}
var CRC=null;
function crc(b){if(!CRC){CRC=new Int32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;CRC[n]=c;}}
  let c=-1;for(let i=0;i<b.length;i++)c=CRC[(c^b[i])&255]^(c>>>8);return c^-1;}

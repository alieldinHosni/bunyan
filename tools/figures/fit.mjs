/* Bunyan — the 3D figure: how far the drawn body stands outside its capsules
   node tools/figures/fit.mjs [Exercise_Name …]

   The safety checks (collide.js) and the path rules (motion.js touch) measure the body as
   capsules (capsules.js). The figure is drawn from a mesh (img/fig/body.bin). Where the
   mesh stands outside the capsules, a bar can be "touching" a thigh in every check and
   drawn through it (owner, 25 Nov: the Romanian deadlift). This measures it: every
   vertex is skinned as the renderer skins it, given to the capsule of the part its
   heaviest bone carries, and its distance outside that capsule taken. Per part: the
   worst vertex and the 95th percentile, in cm, in the rest pose and through each named
   exercise's repetition (41 moments). By default against the limbs' skin (capsules.js
   skinParts: what equipment meets); --body against the body's own capsules. Never runs
   in the browser (tools/). */
import fs from "fs";
import {BODY} from "../../js/data/mannequin/body.js";
import {solve, skinPoint, BONES} from "../../js/data/mannequin/skin.js";
import {bodyParts, skinParts} from "../../js/data/mannequin/capsules.js";
import {V} from "../../js/data/mannequin/geom.js";
import {sceneAt} from "../../js/data/mannequin/motion.js";
import {recordForUnchecked} from "../../js/data/mannequin/records.js";

const buf=fs.readFileSync(new URL("../../img/fig/body.bin",import.meta.url)).buffer;
/* --body: against the body's own capsules (LIMBS) instead of the limbs' skin */
const SKIN_MODE=process.argv.indexOf("--body")<0;
const NAMES=process.argv.slice(2).filter(a=>a!=="--body").map(s=>s.replace(/_/g," "));
const L=BODY.layout,n=BODY.vertices,lo=BODY.min,hi=BODY.max;
const q=new Uint16Array(buf,L.pos.offset,n*3),pos=new Float32Array(n*3);
for(let i=0;i<n*3;i++){const k=i%3;pos[i]=lo[k]+q[i]/65535*(hi[k]-lo[k]);}
const bone=new Uint8Array(buf,L.bone.offset,n*4),bw=new Uint8Array(buf,L.bw.offset,n*4);
/* the part a bone carries (sided parts take the bone's side) */
function partOf(name){
  const s=/\.L$/.test(name)?"l":/\.R$/.test(name)?"r":"";
  if(/^upperleg/.test(name))return "thigh."+s;
  if(/^lowerleg/.test(name))return "shin."+s;
  if(/^foot/.test(name))return "foot."+s;
  if(/^upperarm/.test(name))return "upperarm."+s;
  if(/^lowerarm/.test(name))return "forearm."+s;
  if(/^(wrist|metacarpal|finger)/.test(name))return "hand."+s;
  if(/^(head|neck0[23])/.test(name))return "head";
  if(/^neck01/.test(name))return "neck";
  if(/^(spine01|spine02|clavicle|shoulder)/.test(name))return "trunk.upper";
  if(/^(spine03|spine04|spine05)/.test(name))return "trunk.lower";
  return "pelvis";}
/* the weights are stored as bytes; the skin uses them as fractions of their sum */
const W=new Array(n);
for(let i=0;i<n;i++){const t=bw[i*4]+bw[i*4+1]+bw[i*4+2]+bw[i*4+3]||1;W[i]=[bw[i*4]/t,bw[i*4+1]/t,bw[i*4+2]/t,bw[i*4+3]/t];}
const vPart=new Array(n);
for(let i=0;i<n;i++){let b=0,w=-1;for(let k=0;k<4;k++)if(bw[i*4+k]>w){w=bw[i*4+k];b=bone[i*4+k];}vPart[i]=partOf(BONES[b].name);}
/* distance of point p outside capsule c (negative: inside) */
function outside(p,c){
  const ab=V.sub(c.b,c.a),t=Math.max(0,Math.min(1,V.dot(V.sub(p,c.a),ab)/Math.max(1e-12,V.dot(ab,ab))));
  return V.len(V.sub(p,V.lerp(c.a,c.b,t)))-(c.ra+(c.rb-c.ra)*t);}
function measure(sc,out){
  const parts=(SKIN_MODE?skinParts:bodyParts)(sc),by={};parts.forEach(p=>{(by[p.n]=by[p.n]||[]).push(p);});
  for(let i=0;i<n;i++){
    const caps=by[vPart[i]];if(!caps)continue;
    const p=skinPoint(sc.M,[pos[i*3],pos[i*3+1],pos[i*3+2]],[bone[i*4],bone[i*4+1],bone[i*4+2],bone[i*4+3]],W[i]);
    let d=Infinity;for(const c of caps)d=Math.min(d,outside(p,c));
    (out[vPart[i]]=out[vPart[i]]||[]).push(d);}}
function report(title,out){
  console.log("== "+title);
  for(const k of Object.keys(out).sort()){const a=out[k].sort((x,y)=>x-y),p95=a[Math.floor(a.length*.95)],mx=a[a.length-1];
    console.log("  "+k.padEnd(13)+" worst "+(mx*100).toFixed(1).padStart(5)+" cm   95% "+(p95*100).toFixed(1).padStart(5)+" cm");}}
const rest={};const r0=solve(sceneAt(recordForUnchecked(NAMES[0]||"Pullups"),0).pose);
measure({J:r0.J,M:r0.M},rest);report("rest of the first exercise's start",rest);
for(const name of NAMES){
  const rec=recordForUnchecked(name),out={};
  for(let i=0;i<=40;i++)measure(sceneAt(rec,i/40),out);
  report(name+" (41 moments)",out);}

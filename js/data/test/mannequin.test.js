import {V, sdOne, makeSdf} from "../mannequin/geom.js";
import {joints, highlight, MUSCLE_TAGS} from "../mannequin/rig.js";
import {RECORDS, recordFor, levers, grip} from "../mannequin/records.js";
import {phaseAt, poseAt, sceneAt, framing, motionPath, arrowShape, cycleOf} from "../mannequin/motion.js";
import {pack, MAXC, ROW} from "../mannequin/pack.js";
import {project} from "../mannequin/geom.js";

const PRESS="Machine Chest Press",ROWX="Seated Machine Row";
const deg=(a,b,c)=>{const u=V.norm(V.sub(a,b)),w=V.norm(V.sub(c,b));return Math.acos(Math.max(-1,Math.min(1,V.dot(u,w))))*180/Math.PI;};

/* The shader's reading of one packed solid (pack.js layout), in JavaScript: if it agrees
   with geom.js sdOne, the graphics card is handed the same solid the model made. */
function sdPacked(tex,i,p){
  const o=i*ROW*4,T=k=>[tex[o+k*4],tex[o+k*4+1],tex[o+k*4+2],tex[o+k*4+3]];
  const h=T(1),k=Math.round(h[0])&7,a=T(2),b=T(3),c=T(4),d=T(5);
  const sub=V.sub,dot=V.dot,len=V.len;
  if(k===0)return len(sub(p,a))-a[3];
  if(k===1){const ba=sub(b,a),pa=sub(p,a),s=Math.max(0,Math.min(1,dot(pa,ba)/dot(ba,ba)));
    return len(sub(pa,V.mul(ba,s)))-(a[3]+(b[3]-a[3])*s);}
  if(k===4){const ba=sub(b,a),hh=len(ba),ax=V.mul(ba,1/hh),pa=sub(p,a),s=dot(pa,ax),r=len(sub(pa,V.mul(ax,s)));
    const dx=r-a[3]+b[3],dy=Math.abs(s-hh/2)-hh/2+b[3];return Math.min(Math.max(dx,dy),0)+Math.hypot(Math.max(dx,0),Math.max(dy,0))-b[3];}
  const q=sub(p,a),ex=b.slice(0,3),ey=c.slice(0,3),ez=V.cross(ex,ey),l=[dot(q,ex),dot(q,ey),dot(q,ez)];
  if(k===2){const x=l.map((v,j)=>v/d[j]),k0=Math.hypot(...x),k1=Math.hypot(...x.map((v,j)=>v/d[j]));return k0*(k0-1)/k1;}
  const e=l.map((v,j)=>Math.abs(v)-d[j]);
  return Math.hypot(...e.map(v=>Math.max(v,0)))+Math.min(Math.max(...e),0)-a[3];}

/* lib: the whole library, {name: {m, x}}, as the runner reads it. */
function run(t,lib){
  /* ---- records come from the library ---- */
  t.ok(recordFor(PRESS)&&recordFor(ROWX)&&!recordFor("Barbell Bench Press - Medium Grip")&&!recordFor("constructor"),
    "the two pilot exercises have records; nothing else does yet");
  for(const n of [PRESS,ROWX]){
    t.ok(lib[n]&&lib[n].i===RECORDS[n].id,n+": the record's id is the library's");
    t.ok(!("m" in RECORDS[n])&&!("x" in RECORDS[n]),n+": the record names no muscles of its own");}

  /* ---- what lights up: the library's muscles, through the record's refinement ---- */
  const hp=highlight(lib[PRESS].m,lib[PRESS].x,RECORDS[PRESS].refine);
  t.eq(hp,{triceps:.5,frontdelt:.5,chest:1},"chest press: chest in full; triceps and the front of the shoulder at half");
  const hr=highlight(lib[ROWX].m,lib[ROWX].x,RECORDS[ROWX].refine);
  t.eq(hr,{biceps:.5,lats:1,traps:1,reardelt:1},"row: the back in full (lats, traps, rear delts); biceps at half");
  t.eq(highlight("Shoulders",[]),{frontdelt:1,sidedelt:1,reardelt:1},"without a refinement a broad name lights all of it");
  const named=new Set();for(const n in lib){named.add(lib[n].m);(lib[n].x||[]).forEach(m=>named.add(m));}
  t.eq([...named].filter(m=>m!=="Other"&&!MUSCLE_TAGS[m]),[],"every muscle the library names has its place on the figure");
  const sc=sceneAt(RECORDS[PRESS],0,hp),lit=new Set(sc.prims.filter(q=>q.hl>0).map(q=>q.tag));
  t.eq([...lit].sort(),["chest","frontdelt","triceps"],"the figure lights exactly those muscles");

  /* ---- one body for every exercise ---- */
  const b0=sceneAt(RECORDS[PRESS],.5,{}).prims.filter(q=>q.g===1||q.g===3||q.g===4).length;
  const b1=sceneAt(RECORDS[ROWX],.5,{}).prims.filter(q=>q.g===1||q.g===3||q.g===4).length;
  t.ok(b0===b1&&b0>=90,"both exercises pose the same figure ("+b0+" solids); only the equipment differs");

  /* ---- the chest press moves as one ---- */
  const P=RECORDS[PRESS],J0=joints(poseAt(P,0)),J1=joints(poseAt(P,1));
  t.ok(J1.wr.l[0]-J0.wr.l[0]>.27&&Math.abs(J1.wr.l[1]-J0.wr.l[1])<.06,"press: the hands travel forward about a third of a metre, level");
  t.ok(Math.abs(J1.wr.l[2])<Math.abs(J0.wr.l[2]),"press: the grips draw a little together");
  const e0=deg(J0.sh.l,J0.el.l,J0.wr.l),e1=deg(J1.sh.l,J1.el.l,J1.wr.l);
  t.ok(e0<100&&e1>150&&e1<178,"press: elbows bent at the start ("+e0.toFixed(0)+"°), long but not locked at the end ("+e1.toFixed(0)+"°)");
  t.ok(J0.wr.l[1]<J0.sh.l[1]&&J0.wr.l[1]>J0.sh.l[1]-.2,"press: the grips start at chest height");
  const LV=levers(P,.78);let worst=0,off=0;
  for(let i=0;i<=20;i++){const u=i/20,J=joints(poseAt(P,u));
    for(const s of ["l","r"]){worst=Math.max(worst,Math.abs(V.len(V.sub(LV[s].at(u),LV[s].pivot))-LV[s].radius));
      off=Math.max(off,V.len(V.sub(grip(J,s),LV[s].at(u))));}}
  t.ok(worst<1e-6,"press: each lever arm keeps its length through the movement (rigid, on its pivot)");
  t.ok(off<.002,"press: the hands stay on the grips all the way ("+(off*1000).toFixed(2)+" mm)");
  const pa=motionPath(P,10);
  t.ok(pa[pa.length-1][0]>pa[0][0]+.27,"press: the arrow's path runs forward");

  /* ---- the row, from the same parts ---- */
  const R=RECORDS[ROWX],K0=joints(poseAt(R,0)),K1=joints(poseAt(R,1)),ra=motionPath(R,10);
  t.ok(ra[0][0]-ra[ra.length-1][0]>.3,"row: the hands travel back toward the body");
  t.ok(K1.el.l[0]<K1.sh.l[0],"row: at the end the elbows are behind the shoulders");
  t.ok(deg(K0.sh.l,K0.el.l,K0.wr.l)>150,"row: the arms start long");
  const kinds=l=>new Set(l.map(p=>p[0]));
  const kp=kinds(P.equip(J0,0,P)),kr=kinds(R.equip(K0,0,R));
  t.ok(["seat","tower","lever","hub"].every(k=>kp.has(k)&&kr.has(k)),"both machines are built from the same kit (seat, tower, lever, hub)");

  /* ---- time ---- */
  const c=cycleOf(P),us=[];for(let i=0;i<=200;i++)us.push(phaseAt(P,c*i/200).u);
  t.ok(us[0]===0&&Math.max(...us)===1,"a repetition runs from the start to the end and back");
  let mono=true;for(let i=1;i<=200&&c*i/200<=P.tempo[0];i++)if(us[i]<us[i-1])mono=false;
  t.ok(mono,"the lift only goes one way");
  let jump=0;for(let i=1;i<us.length;i++)jump=Math.max(jump,Math.abs(us[i]-us[i-1]));
  t.ok(jump<.06,"and never jumps (eased, continuous)");
  t.eq(phaseAt(P,c*.1).phase,"lift","the lift comes first");

  /* ---- what the graphics card is handed ---- */
  for(const n of [PRESS,ROWX]){
    const s=sceneAt(RECORDS[n],.4,highlight(lib[n].m,lib[n].x,RECORDS[n].refine)),pk=pack(s.prims);
    t.ok(pk.n===s.prims.length&&pk.tex.length===pk.n*ROW*4,n+": every solid packed once ("+pk.n+")");
    t.ok(pk.clusters.length<=MAXC,n+": "+pk.clusters.length+" clusters, within the "+MAXC+" the shader reads");
    let next=0,ok=true;pk.clusters.forEach(C=>{if(C.start!==next)ok=false;next+=C.count;});
    t.ok(ok&&next===pk.n,n+": the clusters cover the rows in order");
    t.ok(pk.hl.length>0&&pk.hl.every(i=>pk.order[i].hl>0&&pk.order[i].g===1),n+": the lit list is the lit muscles");
    t.ok(pk.order.every((q,i)=>(pk.tex[i*ROW*4+3]<0)===!!q.cut),n+": grooves are marked by a negative radius");
    let worstD=0;
    pk.order.forEach((q,i)=>{for(let k=0;k<4;k++){
      const p=V.add(q.c,[Math.sin(i*7+k)*q.r*1.2,Math.cos(i*3+k*5)*q.r*1.2,Math.sin(i+k*11)*q.r*1.2]);
      worstD=Math.max(worstD,Math.abs(sdPacked(pk.tex,i,p)-sdOne(q,p)));}});
    t.ok(worstD<1e-5,n+": the packed solids are the model's solids (largest difference "+worstD.toExponential(1)+" m)");
    const cam=framing(RECORDS[n],4/3);
    const out=[0,1].flatMap(u=>sceneAt(RECORDS[n],u,{}).prims).filter(q=>{const pr=project(cam,q.c);return Math.abs(pr[0])>1||Math.abs(pr[1])>1;});
    t.eq(out.length,0,n+": the whole movement stays in the picture");
    const ar=arrowShape(RECORDS[n],cam,720,540);
    t.ok(ar&&ar.body.length>10&&ar.head.length===3&&ar.body.every(p=>p[0]>0&&p[0]<720&&p[1]>0&&p[1]<540),n+": the arrow is drawn, inside the picture");
    const w=motionPath(RECORDS[n],10,cam.p[2]>=0?"l":"r"),a=project(cam,w[0]),b=project(cam,w[w.length-1]);
    const mv=[(b[0]-a[0])*360,(b[1]-a[1])*270],ad=[ar.head[0][0]-ar.body[0][0],ar.head[0][1]-ar.body[0][1]];
    t.ok(mv[0]*ad[0]+mv[1]*ad[1]>0,n+": and points the way the hands move");}

  /* ---- the distance field the stills use is the one packed ---- */
  const s=sceneAt(RECORDS[PRESS],.5,{}),sdf=makeSdf(s.prims,.04),J=joints(poseAt(RECORDS[PRESS],.5));
  t.ok(Math.abs(sdf(J.P,9)[0])<.2&&sdf(J.P,9)[0]<0,"inside the pelvis the field is negative");
  t.ok(sdf([0,3,0],9)[0]>.5,"well above the machine it is far from everything");
}
export {run};

import {V} from "../mannequin/geom.js";
import {joints, highlight, MUSCLE_TAGS} from "../mannequin/rig.js";
import {RECORDS, recordFor, levers, grip} from "../mannequin/records.js";
import {phaseAt, poseAt, sceneAt, framePoints, fitCamera, motionPath, arrowShape, cycleOf} from "../mannequin/motion.js";
import {BODY} from "../mannequin/body.js";
import {solve, NB, IX, BONES, P0, ARM} from "../mannequin/skin.js";
import {place, build} from "../mannequin/mesh.js";
import {project} from "../mannequin/geom.js";
import {TABLE, moveFor} from "../mannequin/moves.js";

const PRESS="Machine Chest Press",ROWX="Seated Machine Row";
const deg=(a,b,c)=>{const u=V.norm(V.sub(a,b)),w=V.norm(V.sub(c,b));return Math.acos(Math.max(-1,Math.min(1,V.dot(u,w))))*180/Math.PI;};
/* bone i's matrix applied to rest point q, and its 3×3 part */
const at=(M,i,q)=>{const o=i*16;return [0,1,2].map(r=>M[o+r]*q[0]+M[o+4+r]*q[1]+M[o+8+r]*q[2]+M[o+12+r]);};
const rot=(M,i)=>{const o=i*16;return [[M[o],M[o+1],M[o+2]],[M[o+4],M[o+5],M[o+6]],[M[o+8],M[o+9],M[o+10]]];};

/* lib: the whole library, {name: {m, x}}, as the runner reads it. */
function run(t,lib){
  /* ---- records come from the library ---- */
  t.ok(recordFor(PRESS)&&recordFor(ROWX)&&!recordFor("constructor"),"the pilot exercises have records; a stray name has none");
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
  const tags=new Set([].concat(...Object.values(MUSCLE_TAGS)));
  t.eq([...tags].filter(g=>BODY.muscles.indexOf(g)<0),[],"and every one of those is a region of the body's skin");

  /* ---- one body: a real mesh on a real skeleton ---- */
  t.ok(BODY.vertices>12000&&BODY.triangles>20000&&NB===BODY.bones.length&&NB===74,
    "the body is a full human mesh ("+BODY.vertices+" vertices) on "+NB+" bones");
  t.ok(Math.abs(BODY.max[1]-1.8)<.03,"standing, it is "+BODY.max[1].toFixed(2)+" m tall");
  const sp=solve({}),Rp=sp.M;
  let rigid=0;
  for(let i=0;i<NB;i++){const m=rot(Rp,i);
    for(let a=0;a<3;a++)for(let b=0;b<3;b++)rigid=Math.max(rigid,Math.abs(V.dot(m[a],m[b])-(a===b?1:0)));}
  t.ok(rigid<1e-5,"every bone only turns and moves: none stretches or shears");
  /* in every pose the skeleton stays in one piece: each bone's joint is where its
     parent carries it */
  function gaps(p){
    const M=solve(p).M;let g=0;
    BONES.forEach((b,i)=>{if(b.parent<0)return;
      const mine=at(M,i,b.head),theirs=at(M,b.parent,b.head);
      /* the shoulder blade and the hips turn about their own joints, which their parent
         carries: the same test holds */
      g=Math.max(g,V.len(V.sub(mine,theirs)));});
    return g;}
  const poses=[RECORDS[PRESS],RECORDS[ROWX]].flatMap(r=>[0,.5,1].map(u=>poseAt(r,u)));
  const worstGap=Math.max(...poses.map(gaps));
  t.ok(worstGap<.004,"in every pose each joint stays where its parent bone holds it (largest gap "+(worstGap*1000).toFixed(2)+" mm)");
  /* a hand put on a target reaches it, the elbow bending the way it is told */
  const tgt=V.add(ARM.l.sh,[.35,-.25,.05]),Jt=joints({hands:{l:tgt},elbows:{l:[0,-1,0]}});
  t.ok(V.len(V.sub(Jt.wr.l,tgt))<1e-6,"a hand within reach is put exactly where it is asked");
  t.ok(Jt.el.l[1]<V.lerp(Jt.sh.l,Jt.wr.l,.5)[1],"and its elbow bends toward its hint (down)");
  const far=joints({hands:{l:V.add(ARM.l.sh,[2,0,0])}});
  t.ok(deg(far.sh.l,far.el.l,far.wr.l)>175,"out of reach, the arm reaches straight toward it");

  /* ---- the chest press moves as one ---- */
  const P=RECORDS[PRESS],J0=joints(poseAt(P,0)),J1=joints(poseAt(P,1));
  t.ok(J1.wr.l[0]-J0.wr.l[0]>.23&&Math.abs(J1.wr.l[1]-J0.wr.l[1])<.06,"press: the hands travel forward about a quarter of a metre, level");
  t.ok(Math.abs(J1.wr.l[2])<Math.abs(J0.wr.l[2]),"press: the grips draw a little together");
  const e0=deg(J0.sh.l,J0.el.l,J0.wr.l),e1=deg(J1.sh.l,J1.el.l,J1.wr.l);
  t.ok(e0>55&&e0<100&&e1>155&&e1<178,"press: elbows bent at the start ("+e0.toFixed(0)+"°), long but not locked at the end ("+e1.toFixed(0)+"°)");
  t.ok(J0.wr.l[1]<J0.sh.l[1]&&J0.wr.l[1]>J0.sh.l[1]-.25,"press: the grips start at chest height");
  const LV=levers(P,.78);let worst=0,off=0;
  for(let i=0;i<=20;i++){const u=i/20,J=joints(poseAt(P,u));
    for(const s of ["l","r"]){worst=Math.max(worst,Math.abs(V.len(V.sub(LV[s].at(u),LV[s].pivot))-LV[s].radius));
      off=Math.max(off,V.len(V.sub(grip(J,s),LV[s].at(u))));}}
  t.ok(worst<1e-6,"press: each lever arm keeps its length through the movement (rigid, on its pivot)");
  t.ok(off<.002,"press: the palms stay on the grips all the way ("+(off*1000).toFixed(2)+" mm)");
  const pa=motionPath(P,10);
  t.ok(pa[pa.length-1][0]>pa[0][0]+.23,"press: the arrow's path runs forward");

  /* ---- the row, from the same parts ---- */
  const R=RECORDS[ROWX],K0=joints(poseAt(R,0)),K1=joints(poseAt(R,1)),ra=motionPath(R,10);
  t.ok(ra[0][0]-ra[ra.length-1][0]>.3,"row: the hands travel back toward the body");
  t.ok(K1.el.l[0]<K1.sh.l[0],"row: at the end the elbows are behind the shoulders");
  t.ok(deg(K0.sh.l,K0.el.l,K0.wr.l)>150,"row: the arms start long");
  const k1=deg(K1.sh.l,K1.el.l,K1.wr.l);
  t.ok(k1>40&&k1<90,"row: at the end the grips reach the lower ribs, the elbow bent ("+k1.toFixed(0)+"°)");
  const kinds=l=>new Set(l.map(p=>p[0]));
  const kp=kinds(P.equip(J0,0,P)),kr=kinds(R.equip(K0,0,R));
  t.ok(["seat","tower","lever","hub"].every(k=>kp.has(k)&&kr.has(k)),"both machines are built from the same kit (seat, tower, lever, hub)");
  /* sitting on the seat, back to the pad: the hips over the seat's top, not in it */
  t.ok(J0.hip.l[1]>.48+.06&&J0.hip.l[1]<.48+.16,"press: the hips sit over the seat ("+((J0.hip.l[1]-.48)*100).toFixed(0)+" cm above its top)");

  /* ---- time ---- */
  const c=cycleOf(P),us=[];for(let i=0;i<=200;i++)us.push(phaseAt(P,c*i/200).u);
  t.ok(us[0]===0&&Math.max(...us)===1,"a repetition runs from the start to the end and back");
  let mono=true;for(let i=1;i<=200&&c*i/200<=P.tempo[0];i++)if(us[i]<us[i-1])mono=false;
  t.ok(mono,"the lift only goes one way");
  let jump=0;for(let i=1;i<us.length;i++)jump=Math.max(jump,Math.abs(us[i]-us[i-1]));
  t.ok(jump<.06,"and never jumps (eased, continuous)");
  t.eq(phaseAt(P,c*.1).phase,"lift","the lift comes first");

  /* ---- what the graphics card is handed, and the picture ---- */
  for(const n of [PRESS,ROWX]){
    const rec=RECORDS[n],s=sceneAt(rec,.4);
    t.ok(s.M.length===NB*16&&s.solids.length>10,n+": every bone's matrix, and the equipment as solids ("+s.solids.length+")");
    let inward=0,bad=0;
    s.solids.forEach(q=>{const pl=place(q),g=pl&&build(pl.key);if(!g){bad++;return;}
      for(let k=0;k<g.i.length;k+=3){
        const a=g.i[k]*3,b=g.i[k+1]*3,cc=g.i[k+2]*3;
        const u=[g.p[b]-g.p[a],g.p[b+1]-g.p[a+1],g.p[b+2]-g.p[a+2]],w=[g.p[cc]-g.p[a],g.p[cc+1]-g.p[a+1],g.p[cc+2]-g.p[a+2]];
        const f=V.cross(u,w),nn=[g.n[a]+g.n[b]+g.n[cc],g.n[a+1]+g.n[b+1]+g.n[cc+1],g.n[a+2]+g.n[b+2]+g.n[cc+2]];
        if(V.dot(f,nn)<-1e-12)inward++;}});
    t.ok(!bad&&!inward,n+": every piece of equipment is a closed mesh facing out");
    const pts=framePoints(rec);
    /* from any side, the whole movement stays in the picture */
    let outside=0,jumpD=0,prev=null;
    for(let y=0;y<360;y+=3){
      const cam=fitCamera(rec,pts,4/3,y,10,1);
      pts.list.forEach(q=>{const pr=project(cam,q);if(Math.abs(pr[0])>1||Math.abs(pr[1])>1)outside++;});
      if(prev)jumpD=Math.max(jumpD,Math.abs(cam.dist-prev)/prev);
      prev=cam.dist;}
    t.eq(outside,0,n+": turned all the way round, the whole movement stays in the picture");
    t.ok(jumpD<.06,n+": and the camera's distance changes smoothly as it turns (at most "+(jumpD*100).toFixed(1)+"% in 3°)");
    const cam=fitCamera(rec,pts,4/3,rec.cam.yaw,rec.cam.pitch,1);
    const ar=arrowShape(rec,cam,720,540);
    t.ok(ar&&ar.body.length>10&&ar.head.length===3&&ar.body.every(p=>p[0]>0&&p[0]<720&&p[1]>0&&p[1]<540),n+": the arrow is drawn, inside the picture");
    const w=motionPath(rec,10,cam.p[2]>=0?"l":"r"),a=project(cam,w[0]),b=project(cam,w[w.length-1]);
    const mv=[(b[0]-a[0])*360,(b[1]-a[1])*270],ad=[ar.head[0][0]-ar.body[0][0],ar.head[0][1]-ar.body[0][1]];
    t.ok(mv[0]*ad[0]+mv[1]*ad[1]>0,n+": and points the way the hands move");}
  t.ok(P0[1]>1&&P0[1]<1.1&&IX["foot.L"]>=0,"the pelvis point and the bones are where the poses expect them");

  /* ---- the library's movements (moves.js): every exercise in the table ---- */
  const names=Object.keys(TABLE);
  t.eq(names.filter(n=>!lib[n]),[],"every exercise the families draw is in the library, by its exact name ("+names.length+")");
  t.ok(names.every(n=>recordFor(n)===moveFor(n)&&recordFor(n)),"and recordFor finds each one's record");
  const unreached=[],sunk=[],broken=[],still=[];
  for(const n of names){
    const rec=moveFor(n);
    let moved=0,prev=null;
    for(const u of [0,.25,.5,.75,1]){
      const p=poseAt(rec,u),sc=sceneAt(rec,u),J=sc.J;
      if(![...sc.M].every(Number.isFinite)||!sc.solids.every(q=>JSON.stringify(q).indexOf("null")<0)){broken.push(n+"@"+u);continue;}
      /* the hands get to what they hold */
      for(const s of ["l","r"])if(p.hands&&p.hands[s]&&V.len(V.sub(J.wr[s],p.hands[s]))>.012){unreached.push(n+" "+s+"@"+u);break;}
      /* nothing goes through the floor */
      if(["l","r"].some(s=>J.an[s][1]<.06)||J.P[1]<.05)sunk.push(n+"@"+u);
      if(prev)moved+=V.len(V.sub(J.wr.l,prev.wr.l))+V.len(V.sub(J.P,prev.P))+V.len(V.sub(J.sh.l,prev.sh.l))+V.len(V.sub(J.an.l,prev.an.l));
      prev=J;}
    if(rec.keys.length>1&&moved<.05)still.push(n);}
  t.eq(broken,[],"every one solves to a body and its equipment at every moment");
  t.eq(unreached,[],"in every one the hands reach what they hold, all the way through");
  t.eq(sunk,[],"and nothing goes through the floor");
  t.eq(still,[],"and each one moves");
  const unframed=names.filter(n=>{const rec=moveFor(n),pts=framePoints(rec),cam=fitCamera(rec,pts,4/3,rec.cam.yaw,rec.cam.pitch,1);
    return !Number.isFinite(cam.dist)||pts.list.some(q=>{const pr=project(cam,q);return Math.abs(pr[0])>1||Math.abs(pr[1])>1;});});
  t.eq(unframed,[],"and each one is all in the picture from its own view");
}
export {run};

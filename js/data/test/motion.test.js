/* The 3D figure's motion engine (docs/FIGURE-V3.md F-1, F-2): keys in phases, path
   constraints, the neutral spine, the order of joints, the lift's speed, the
   prescribed tempo, no teleporting or sliding, the solver's joint limits, the framing
   and the arrow. js/data/mannequin/motion.js, skin.js, collide.js. */
import {V, project} from "../mannequin/geom.js";
import {RECORDS, recordForUnchecked} from "../mannequin/records.js";
import {TABLE} from "../mannequin/moves.js";
import {mix, lerpPose, keyList, blend, poseAt, sceneAt, phaseAt, prescribed, tempoOf, liftU, ease, orderSpans, warp,
  barGap, framing, bodyFill, motionPath, arrowShape, ARROW_OFF, MIDFOOT_TOL, TOUCH_TOL, cycleOf} from "../mannequin/motion.js";
import {solve, IX, LIMIT} from "../mannequin/skin.js";
import {midfoot} from "../mannequin/capsules.js";
import {jointSpeed, slide, limits, audit} from "../mannequin/collide.js";
import {stand} from "../mannequin/moves.js";

const D=180/Math.PI,deg=(a,b)=>Math.acos(Math.max(-1,Math.min(1,V.dot(V.norm(a),V.norm(b)))))*D;
const rot=(M,i)=>{const o=i*16;return [M[o],M[o+1],M[o+2],M[o+4],M[o+5],M[o+6],M[o+8],M[o+9],M[o+10]];};
const kneeOf=(J,s)=>deg(V.sub(J.kn[s],J.hip[s]),V.sub(J.an[s],J.kn[s]));
const NEW=["path","order","stick","spine"];
function run(t){
  const names=[...new Set(Object.keys(RECORDS).concat(Object.keys(TABLE)))];
  const recs=names.map(n=>[n,recordForUnchecked(n)]);

  /* ---- 1. keys: two-key records exactly as before ---- */
  const old=(rec,u)=>{const k=rec.keys,p=k.length<2?mix(k[0],null,0):lerpPose(k[0],k[1],u);if(rec.drive)rec.drive(p,u,rec);return p;};
  let changed=[],plain=0;
  for(const [n,rec] of recs){
    if(NEW.some(k=>rec[k]!=null)||(rec.keys[0]&&rec.keys[0].pose))continue;
    plain++;
    for(let i=0;i<=10;i++){const a=solve(old(rec,i/10)).J,b=sceneAt(rec,i/10).J;let m=0;
      const walk=(x,y)=>{if(typeof x==="number")m=Math.max(m,Math.abs(x-y));else if(x&&typeof x==="object")for(const k in x)walk(x[k],y[k]);};walk(a,b);
      if(m>1e-9){changed.push(n+"@"+i/10);break;}}}
  t.eq(changed,[],"every record that asks for nothing new ("+plain+") has the same joints at 11 moments as the old two-pose blend, to 1e-9");
  /* Catmull-Rom through uneven keys */
  const cr={keys:[{at:0,pose:{a:0,v:[0,0,0]}},{at:.3,pose:{a:1,v:[1,2,0]}},{at:1,pose:{a:0,v:[0,0,0]}}]};
  t.ok(Math.abs(blend(cr,.3).a-1)<1e-12&&Math.abs(blend(cr,0).a)<1e-12&&Math.abs(blend(cr,1).a)<1e-12,"multi-key: the blend passes through every key");
  let jumpC=0;for(let i=1;i<=200;i++)jumpC=Math.max(jumpC,Math.abs(blend(cr,i/200).a-blend(cr,(i-1)/200).a));
  t.ok(jumpC<.03,"and is continuous between them (largest step "+jumpC.toFixed(3)+" in 1/200)");
  const lin={keys:[{at:0,pose:{a:0}},{at:.25,pose:{a:.25}},{at:1,pose:{a:1}}]};
  t.ok([.1,.5,.8].every(u=>Math.abs(blend(lin,u).a-u)<1e-9),"keys on a straight line give the straight line (no overshoot)");
  t.eq(keyList({keys:[{x:1},{x:2}]}).map(k=>k.at),[0,1],"a two-pose record's keys are at 0 and 1");

  /* ---- 2. path constraints, on the three demonstrations ---- */
  for(const n of ["Barbell Deadlift","Romanian Deadlift"]){
    const rec=recordForUnchecked(n);let off=0,gapHi=-1,gapLo=1,feet=0,faults=0;const a0=sceneAt(rec,0).J;
    for(let i=0;i<=40;i++){const sc=sceneAt(rec,i/40),J=sc.J,bar=V.lerp(J.grip.l,J.grip.r,.5),mf=midfoot(sc);
      off=Math.max(off,Math.abs(bar[0]-mf[0]));const g=barGap(sc.pose,["shin","thigh"]);gapHi=Math.max(gapHi,g);gapLo=Math.min(gapLo,g);
      feet=Math.max(feet,V.len(V.sub(J.an.l,a0.an.l)),V.len(V.sub(J.an.r,a0.an.r)));faults+=sc.faults.filter(f=>/elbow/.test(f.joint)).length;}
    t.ok(off<=MIDFOOT_TOL,n+": overMidfoot, the bar within 2 cm of the middle of the foot at 41 moments (worst "+(off*100).toFixed(2)+" cm)");
    t.ok(gapHi<=TOUCH_TOL&&gapLo>-.003,n+": touch, the bar within 1 cm of the legs and never into them by more than 3 mm ("+(gapLo*100).toFixed(1)+" to "+(gapHi*100).toFixed(1)+" cm)");
    t.ok(feet<.002,n+": the feet stay planted ("+(feet*1000).toFixed(2)+" mm)");
    t.eq(faults,0,n+": the hands stay on the bar (no hand target out of the arms' reach)");}
  const dl=recordForUnchecked("Barbell Deadlift"),rdl=recordForUnchecked("Romanian Deadlift");
  const kn=[0,.25,.5,.75,1].map(u=>kneeOf(sceneAt(rdl,u).J,"l"));
  t.ok(Math.max(...kn)-Math.min(...kn)<10&&Math.min(...kn)>=12,"Romanian deadlift: the knees soft and held, changing under 10° ("+kn.map(x=>x.toFixed(0)).join(", ")+")");
  /* arcAbout on a synthetic curl: the hand keeps its distance from the elbow where it starts */
  const base=stand(),J0=solve(base).J;
  const arcRec={keys:[Object.assign({},base,{hands:{l:V.add(J0.wr.l,[.02,0,0])}}),Object.assign({},base,{hands:{l:V.add(J0.sh.l,[.1,-.05,.0])}})],
    path:{track:"wr.l",rule:"arcAbout:el"}};
  const el0=solve(arcRec.keys[0]).J.el.l;
  let dr=0,de=0;const r0=V.len(V.sub(sceneAt(arcRec,0).J.wr.l,el0));
  for(let i=0;i<=10;i++){const J=sceneAt(arcRec,i/10).J;dr=Math.max(dr,Math.abs(V.len(V.sub(J.wr.l,el0))-r0));de=Math.max(de,V.len(V.sub(J.el.l,el0)));}
  t.ok(dr<.002&&de<.01,"arcAbout:el: the hand stays "+(r0*100).toFixed(1)+" cm from the elbow ("+(dr*1000).toFixed(2)+" mm) and the elbow stays put ("+(de*1000).toFixed(1)+" mm)");

  /* ---- 3. the neutral spine ---- */
  const ne=solve({pitch:50,bend:25,head:-30,spine:"neutral"}),ea=solve({pitch:50,bend:25,head:-30});
  let rig=0;const r5=rot(ne.M,IX.root);["spine05","spine04","spine03","spine02","spine01"].forEach(b=>{const r=rot(ne.M,IX[b]);r.forEach((v,i)=>rig=Math.max(rig,Math.abs(v-r5[i])));});
  t.ok(rig<1e-6,"spine neutral: the five spine bones turn as one piece with the pelvis (the rest pose's curves kept), whatever bend is asked");
  t.ok(deg(ne.J.hu,ne.J.cf.u)<=10,"spine neutral: the neck in line within 10° ("+deg(ne.J.hu,ne.J.cf.u).toFixed(1)+"°)");
  t.ok(deg(rot(ea.M,IX.spine01).slice(3,6),r5.slice(3,6))>15,"left out (or flex/extend), the bend is eased from the pelvis to the chest as before");
  t.ok(["Barbell Deadlift","Romanian Deadlift","Plank"].every(n=>recordForUnchecked(n).spine==="neutral"),"the three demonstrations ask for a neutral spine");

  /* ---- 4. order of joints ---- */
  const sp=orderSpans(["knees","hips"]);
  t.ok(sp.knees[0]===0&&sp.hips[1]===1&&sp.knees[1]<1&&sp.hips[0]>0,"order: the first part finishes early, the last starts late");
  let mono=true;for(let i=1;i<=100;i++)if(warp([.2,.8],i/100)<warp([.2,.8],(i-1)/100))mono=false;
  t.ok(mono&&warp([.2,.8],0)===0&&warp([.2,.8],1)===1,"each part's clock runs one way, from 0 to 1");
  const dk=u=>{const J=sceneAt(dl,u).J;return [kneeOf(J,"l"),deg(J.cf.u,[0,1,0])];},d0=dk(0),d4=dk(.4),d1=dk(1);
  const kf=(d0[0]-d4[0])/(d0[0]-d1[0]),hf=(d0[1]-d4[1])/(d0[1]-d1[1]);
  t.ok(kf>.4&&hf<.1,"deadlift: by u = 0.4 the knees have done "+(kf*100).toFixed(0)+"% of their straightening and the back's angle "+(hf*100).toFixed(0)+"% (knees first, the back's angle held)");

  /* ---- 5. the lift's speed ---- */
  const st={keys:dl.keys,stick:[.2,.5]},N=2000;let m5=true;const us=[];
  for(let i=0;i<=N;i++){us.push(liftU(st,i/N));if(i&&us[i]<us[i-1])m5=false;}
  t.ok(m5&&us[0]===0&&Math.abs(us[N]-1)<1e-9,"with a sticking region the lift still runs one way from 0 to 1");
  const speedAt=u=>{let i=us.findIndex(x=>x>=u);i=Math.max(1,Math.min(N-1,i));return (us[i+1]-us[i-1])*N/2;};
  const inS=[.25,.3,.35,.4,.45].map(speedAt),outS=[.6,.65,.7,.75,.8].map(speedAt);
  const avg=a=>a.reduce((x,y)=>x+y,0)/a.length;
  t.ok(avg(inS)<avg(outS)*.7,"slowest through the sticking region (mean speed "+avg(inS).toFixed(2)+" against "+avg(outS).toFixed(2)+" after it)");
  let pk=0,pu=0;for(let i=1;i<N;i++){const v=us[i+1]-us[i-1];if(v>pk){pk=v;pu=us[i];}}
  t.ok(pu>.5,"quickest after it, toward lockout (peak at u = "+pu.toFixed(2)+")");
  t.ok([.1,.37,.5,.9].every(x=>liftU({keys:dl.keys},x)===ease(x)),"with no sticking region the lift is today's ease exactly");
  const tp=tempoOf(dl),c=cycleOf(dl);let tl=0;for(let i=0;i<20000;i++)if(phaseAt(dl,c*i/20000).phase==="lift")tl+=c/20000;
  t.ok(Math.abs(tl-tp[0])<.01,"and the lift lasts its tempo ("+tl.toFixed(3)+" s for "+tp[0]+" s); the lowering stays even");

  /* ---- 6. tempo from the prescription ---- */
  t.eq(prescribed("4-2-1-1"),[1,1,4,2],"4-2-1-1 (lower, hold, lift, hold, as the workout prints it) is lift 1, hold at the top 1, lower 4, hold at the bottom 2");
  t.eq(prescribed([3,0,"X",1]),[.6,1,3,0],"an X lift is quick but not instant; numbers work as well as the string");
  const pr=recordForUnchecked("Barbell Curl");let low=0,hold=0;const cy=cycleOf(pr,"4-2-1-1");
  for(let i=0;i<40000;i++){const ph=phaseAt(pr,cy*i/40000,"4-2-1-1").phase;if(ph==="lower")low+=cy/40000;if(ph==="rest")hold+=cy/40000;}
  t.ok(Math.abs(low-4)<.05&&Math.abs(hold-2)<.05,"with tempo 4-2-1-1 the lowering lasts "+low.toFixed(3)+" s (4.0 ± 0.05) and the pause at the bottom "+hold.toFixed(2)+" s");
  t.ok(cycleOf(pr)===pr.tempo.reduce((a,b)=>a+b,0)&&phaseAt(pr,.3).u===phaseAt(pr,.3,null).u,"with no prescription, the record's own tempo");

  /* ---- 7. no teleporting, no sliding ---- */
  const snap={keys:[stand(),stand({pelvis:[.3,1.04,0]})],drive:(p,u)=>{if(u>.5)p.pelvis=[.3,1.04,0];else p.pelvis=[0,1.04,0];}};
  t.ok(!jointSpeed(snap).pass,"a record whose body snaps between frames is caught ("+jointSpeed(snap).speed.toFixed(1)+" m/s)");
  t.ok(jointSpeed(recordForUnchecked("Barbell Curl")).pass,"an ordinary curl is not");
  const pu2=slide(recordForUnchecked("Pullups"));
  t.ok(pu2.some(x=>x.part==="hand.l"&&x.pass),"the hands on a pull-up bar are planted and do not slip");
  const slid={keys:[stand(),stand({feet:{l:[.05,.078,.13],r:[0,.078,-.13]}})]};
  t.ok(slide(slid).some(x=>x.part==="foot.l"&&!x.pass),"a foot that slides 5 cm along the floor is caught");

  /* ---- 8. the solver's joint limits ---- */
  const back=solve(Object.assign(stand(),{hands:{l:[.1,1.1,.3]},elbows:{l:[1,0,0]}})).J;
  const du=V.sub(back.el.l,back.sh.l),df=V.sub(back.wr.l,back.el.l);
  t.ok(deg(du,df)<=180,"an elbow bends only on its hinge, never backwards");
  const far=solve(Object.assign(stand(),{hands:{l:[1.5,1.4,.2]}}));
  t.ok(far.faults.some(f=>f.joint==="elbow.l"&&/out of reach/.test(f.what)),"a hand target out of reach is reported, not hidden");
  const side=solve(Object.assign(stand(),{pelvis:[-.1,.8,0],knees:{l:[0,0,1],r:[1,0,-.1]},footDir:{l:[1,0,0],r:[1,0,0]}}));
  const kt=side.faults.find(f=>f.joint==="knee.l");
  t.ok(kt&&!limits({keys:[Object.assign(stand(),{pelvis:[-.1,.8,0],knees:{l:[0,0,1],r:[1,0,-.1]},footDir:{l:[1,0,0],r:[1,0,0]}})]},0).some(x=>/knee.l/.test(x.joint)),"a knee asked to point sideways is turned back toward the foot, and reported");
  const pl=audit(recordForUnchecked("Plank"),5);
  t.ok(pl.pass,"Plank: forearms flat and parallel, elbows under the shoulders, wrists straight: every check passes");

  /* ---- F-1: the framing and the arrow ---- */
  const bad=[];
  for(const [n,rec] of recs)for(const u of [0,.5,1]){const f=bodyFill(rec,u,framing(rec,4/3,null,null,{u}));if(f.fill<.7||f.fill>.8||!f.inside)bad.push(n+"@"+u+" "+f.fill.toFixed(2));}
  t.eq(bad,[],"the figure fills 70-80% of the picture (its height, or its length lying down) at u = 0, 0.5 and 1, for every record ("+recs.length+")");
  const far2=[];
  for(const [n,rec] of recs){
    const cam=framing(rec,4/3,null,null,{u:1}),ar=arrowShape(rec,cam,720,540);if(!ar)continue;
    const w=motionPath(rec,16,cam.p[2]>=0?"l":"r").map(q=>{const p=project(cam,q);return [(p[0]+1)/2*720,(p[1]+1)/2*540];});
    const dseg=(p,a,b)=>{const ab=[b[0]-a[0],b[1]-a[1]],l=ab[0]*ab[0]+ab[1]*ab[1],tt=l?Math.max(0,Math.min(1,((p[0]-a[0])*ab[0]+(p[1]-a[1])*ab[1])/l)):0;return Math.hypot(p[0]-a[0]-ab[0]*tt,p[1]-a[1]-ab[1]*tt);};
    const worst=Math.max(...ar.body.map(p=>Math.min(...w.slice(1).map((b,i)=>dseg(p,w[i],b)))));
    if(worst>ARROW_OFF+14)far2.push(n+" "+worst.toFixed(0)+"px");}
  t.eq(far2,[],"every arrow lies on its tracked point's real path, within "+(ARROW_OFF+14)+" px of it on a 720-pixel picture");
}
export {run};

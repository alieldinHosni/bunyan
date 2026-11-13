/* Measures for the per-exercise tests (docs/figures/ex/<id>.md): angles at joints,
   the body's centre of mass and the feet's outline, from a scene (motion.js sceneAt).
   Test helpers only; pure. */
import {V} from "../../mannequin/geom.js";
import {bodyParts} from "../../mannequin/capsules.js";
import {audit, jointSpeed, slide} from "../../mannequin/collide.js";
import {recordFor, checkedOf, versionOf} from "../../mannequin/records.js";

const D=180/Math.PI;
/* the angle between two directions, in degrees */
function deg(a,b){return Math.acos(Math.max(-1,Math.min(1,V.dot(V.norm(a),V.norm(b)))))*D;}
/* how far a joint is bent from straight: 0 = straight */
function bend(a,b,c){return deg(V.sub(b,a),V.sub(c,b));}
const knee=(J,s)=>bend(J.hip[s],J.kn[s],J.an[s]);
const elbow=(J,s)=>bend(J.sh[s],J.el[s],J.wr[s]);
/* hip flexion: the thigh's angle in front of the trunk's line (0 standing straight) */
const hipFlex=(J,s)=>180-deg(V.sub(J.sh[s],J.hip[s]),V.sub(J.kn[s],J.hip[s]));
const mid=(J,k)=>V.lerp(J[k].l,J[k].r,.5);
const barOf=J=>V.lerp(J.grip.l,J.grip.r,.5);
/* The body's centre of mass (GEN: Winter's segment table, fractions of body mass and
   where along each segment its centre lies from the near joint): head and neck 8.1% at
   the head, trunk 49.7% halfway from the hips to the shoulders, upper arm 2.8% at
   .436, forearm 1.6% at .43, hand 0.6% at the middle of the hand, thigh 10% at .433,
   shank 4.65% at .433, foot 1.45% at the middle of the foot. */
function centreOfMass(sc){
  const J=sc.J,P=bodyParts(sc),cen=n=>P.filter(p=>p.n===n).map(p=>p.c);
  const avg=a=>V.mul(a.reduce((x,y)=>V.add(x,y),[0,0,0]),1/a.length);
  const m=[[.081,cen("head")[0]],[.497,V.lerp(mid(J,"hip"),mid(J,"sh"),.5)]];
  for(const s of ["l","r"]){
    m.push([.028,V.lerp(J.sh[s],J.el[s],.436)],[.016,V.lerp(J.el[s],J.wr[s],.43)],[.006,avg(cen("hand."+s))],
      [.1,V.lerp(J.hip[s],J.kn[s],.433)],[.0465,V.lerp(J.kn[s],J.an[s],.433)],[.0145,cen("foot."+s)[0]]);}
  const tot=m.reduce((x,y)=>x+y[0],0);
  return V.mul(m.reduce((x,y)=>V.add(x,V.mul(y[1],y[0])),[0,0,0]),1/tot);}
/* the feet's outline along x: from the back of the heels to the front of the shoes */
function footSpan(sc){
  let lo=1e9,hi=-1e9;
  bodyParts(sc).filter(p=>/^foot\./.test(p.n)).forEach(p=>{const d=V.norm(V.sub(p.b,p.a));
    lo=Math.min(lo,V.sub(p.a,V.mul(d,p.ra))[0]);hi=Math.max(hi,V.add(p.b,V.mul(d,p.rb))[0]);});
  return [lo,hi];}
/* u at n+1 even moments */
const moments=n=>Array.from({length:n+1},(_,i)=>i/n);
const f1=x=>x.toFixed(1),cm=x=>(x*100).toFixed(1)+" cm";
/* Every check of the safety audit (tools/figure-audit.mjs) for one record, and the
   gate: an exercise under review is not reachable from the app. */
function auditAll(t,name,rec){
  const a=audit(rec,41),sp=jointSpeed(rec),sl=slide(rec).filter(x=>!x.pass);
  const say=l=>l.length?" — "+[...new Set(l.map(x=>(x.a||x.joint||x.rule)+" "+(x.b||x.what||"")))].join("; "):"";
  t.ok(!a.penetration.length,name+": nothing through anything at 41 moments"+say(a.penetration));
  t.ok(!a.gaps.length,name+": every contact touches"+say(a.gaps));
  t.ok(!a.clearances.length,name+": the clearances that apply ("+(a.rules.join(", ")||"none")+") hold"+say(a.clearances));
  t.ok(!a.limits.length,name+": every joint inside its limits"+say(a.limits));
  t.ok(sp.pass,name+": no joint faster than the limit ("+sp.speed.toFixed(1)+" m/s, "+sp.joint+")");
  t.ok(!sl.length,name+": no planted foot or gripping hand slides"+(sl.length?" — "+sl.map(x=>x.part).join(", "):""));
  /* Approved by the owner from its pictures (docs/figures/ex/), against this exact
     record: if the movement changes, the approval stops counting and this fails until
     the exercise is reviewed again and its version updated in moves.js TABLE. */
  t.ok(!!checkedOf(name)&&!!recordFor(name),name+": approved, and the approval matches this record (version "+versionOf(name)+")");}
export {D, deg, bend, knee, elbow, hipFlex, mid, barOf, centreOfMass, footSpan, moments, f1, cm, auditAll};

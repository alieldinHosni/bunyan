/* Pullups: the rules of its dossier (docs/figures/ex/Pullups.md), numbered as there,
   measured over one repetition of its record. */
import {V} from "../../mannequin/geom.js";
import {recordForUnchecked} from "../../mannequin/records.js";
import {sceneAt} from "../../mannequin/motion.js";
import {bodyParts, partVsPart} from "../../mannequin/capsules.js";
import {deg, knee, elbow, hipFlex, barOf, centreOfMass, moments, f1, cm, auditAll} from "./measure.js";

const NAME="Pullups",BAR_Y=2.3,BAR_R=.017;
function run(t){
  const rec=recordForUnchecked(NAME),us=moments(40),S=us.map(u=>sceneAt(rec,u)),J=S.map(s=>s.J),P=S.map(bodyParts);
  const mx=a=>Math.max(...a),mn=a=>Math.min(...a),at=u=>Math.round(u*40);
  const head=i=>P[i].find(p=>p.n==="head"),chin=i=>V.sub(head(i).a,V.mul(J[i].hu,head(i).ra))[1];
  const ear=i=>Math.min(V.len(V.sub(head(i).a,J[i].sh.l)),V.len(V.sub(V.lerp(head(i).a,head(i).b,.5),J[i].sh.l)));
  const el=J.map(j=>Math.max(elbow(j,"l"),elbow(j,"r")));
  /* 1 */
  t.ok(el[0]<=12,"1. a full hang at the bottom: elbows "+f1(el[0])+"° short of straight (at most 12°)");
  const feet=mn(P[0].filter(p=>/^foot\./.test(p.n)).map(p=>Math.min(p.a[1]-p.ra,p.b[1]-p.rb)));
  t.ok(feet>=.08,"1. hanging free: the feet "+cm(feet)+" off the floor at the bottom");
  /* 2 */
  const i15=at(.15),dEar=ear(i15)-ear(0);
  t.ok(dEar>=.015&&Math.abs(el[i15]-el[0])<3,"2. shoulder blades down first: by u = 0.15 the shoulders have dropped "+cm(dEar)+" from the ears with the elbows unchanged ("+f1(el[0])+"° → "+f1(el[i15])+"°)");
  t.ok(el.slice(0,i15+1).every(e=>e<=12),"2. no elbow bend before the blades are set (u ≤ 0.15)");
  /* 3 */
  t.ok(chin(40)>=BAR_Y+BAR_R+.015,"3. chin over the bar at the top: "+cm(chin(40)-BAR_Y-BAR_R)+" above its top (at least 1.5 cm)");
  /* 4 */
  const bar={a:[0,BAR_Y,-.3],b:[0,BAR_Y,.3],ra:BAR_R,rb:BAR_R},clear=P.map(ps=>mn(ps.filter(p=>p.n==="head"||p.n==="neck").map(p=>partVsPart(bar,p))));
  t.ok(mn(clear)>=.03,"4. the face and neck pass the bar with at least 3 cm to spare (closest "+cm(mn(clear))+")");
  /* 5 */
  const hip=J.map(j=>hipFlex(j,"l")),kn=J.map(j=>knee(j,"l"));
  t.ok(mx(hip)-mn(hip)<5&&mx(kn)-mn(kn)<5,"5. no kipping: hips "+f1(mn(hip))+"–"+f1(mx(hip))+"°, knees "+f1(mn(kn))+"–"+f1(mx(kn))+"° (each within 5°)");
  /* 6 */
  const com=S.map(s=>Math.abs(centreOfMass(s)[0]-barOf(s.J)[0]));
  t.ok(mx(com)<=.02,"6. no swing: the centre of mass stays under the bar, within 2 cm (worst "+cm(mx(com))+")");
  const lean=J.map(j=>Math.atan2(-j.cf.u[0],j.cf.u[1])*180/Math.PI);
  t.ok(lean.every((l,i)=>!i||l>=lean[i-1]-.05)&&mx(lean)<=25,"6. the trunk tips back steadily as it rises, never rocking: "+f1(lean[0])+"° → "+f1(lean[40])+"° (at most 25°)");
  /* 7 */
  const neck=J.map(j=>deg(j.hu,j.cf.u));
  t.ok(rec.spine==="neutral"&&mx(neck)<=10,"7. spine neutral, neck in line (worst "+f1(mx(neck))+"°)");
  /* 8 */
  const plane=J.map(j=>Math.abs(Math.asin(V.dot(V.norm(V.sub(j.el.l,j.sh.l)),j.cf.f))*180/Math.PI));
  t.ok(mx(plane)<=20,"8. elbows down to the sides, in the trunk's plane within 20° (worst "+f1(mx(plane))+"°)");
  t.ok(mx(el)<=145,"8. elbows inside their range at the top ("+f1(mx(el))+"°)");
  /* 9 */
  const [up,hold,down]=rec.tempo;
  t.ok(down>=1.5*up&&hold>=.5,"9. controlled: lowering "+down+" s against lifting "+up+" s, a "+hold+" s hold at the top");
  /* 10 */
  const gw=Math.abs(J[0].grip.l[2]-J[0].grip.r[2]),sw=Math.abs(J[0].sh.l[2]-J[0].sh.r[2]);
  t.ok(J[0].pn.l[0]>.5&&J[0].pn.r[0]>.5,"10. overhand: the palms face away from the body");
  t.ok(gw>=1.3*sw&&gw<=1.8*sw,"10. grip "+cm(gw)+" across, the shoulders "+cm(sw)+" (1.3–1.8 times)");
  auditAll(t,NAME,rec);}
export {run};

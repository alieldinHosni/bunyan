/* Seated Leg Curl: the rules of its dossier (docs/figures/ex/Seated_Leg_Curl.md),
   numbered as there, measured over one repetition of its record. */
import {V} from "../../mannequin/geom.js";
import {recordForUnchecked} from "../../mannequin/records.js";
import {sceneAt} from "../../mannequin/motion.js";
import {bodyParts, partVsPart, sdf} from "../../mannequin/collide.js";
import {skinParts} from "../../mannequin/capsules.js";
import {rolesFor, familyOf} from "../../mannequin/roles.js";
import {knee, hipFlex, mid, moments, f1, cm, auditAll} from "./measure.js";

const NAME="Seated Leg Curl";
/* the gap between a body part (a capsule) and a solid, sampled along the part */
function gap(q,p){let m=9;for(let k=0;k<=10;k++){const x=V.lerp(p.a,p.b,k/10),r=p.ra+(p.rb-p.ra)*k/10;m=Math.min(m,sdf(q,x)-r);}return m;}
function run(t){
  const rec=recordForUnchecked(NAME),us=moments(40),S=us.map(u=>sceneAt(rec,u)),J=S.map(s=>s.J),P=S.map(bodyParts),SK=S.map(skinParts);
  const mx=a=>Math.max(...a),mn=a=>Math.min(...a);
  const kn=J.map(j=>Math.max(knee(j,"l"),knee(j,"r")));
  /* the machine's pads: the roller nearest the ankles, the lap pad nearest the knees' tops,
     the back pad nearest the trunk */
  const caps=i=>S[i].solids.filter(q=>q.a&&q.b&&V.len(V.sub(q.a,q.b))>.3);
  const near=(i,pt)=>caps(i).reduce((b,q)=>{const d=V.len(V.sub(V.lerp(q.a,q.b,.5),pt));return !b||d<b.d?{q,d}:b;},null).q;
  /* 1 */
  t.ok(kn[0]<=10,"1. legs straight at the start: knees "+f1(kn[0])+"° short of straight (at most 10°)");
  /* 2 */
  t.ok(kn[40]>=100&&mx(kn)<=120,"2. a full curl inside the knee's range: "+f1(kn[40])+"° at the curl (100–120°)");
  t.ok(kn.every((k,i)=>!i||k>=kn[i-1]-.05),"2. one smooth bend, no bounce: the knees only bend from start to curl");
  /* 3 */
  const lean=J.map(j=>Math.atan2(-j.cf.u[0],j.cf.u[1])*180/Math.PI),hip=J.map(j=>hipFlex(j,"l"));
  t.ok(mx(lean)-mn(lean)<2&&mx(hip)-mn(hip)<2,"3. the torso stays still: trunk "+f1(mn(lean))+"–"+f1(mx(lean))+"°, hips "+f1(mn(hip))+"–"+f1(mx(hip))+"° (each within 2°)");
  /* 4 */
  const back=P.map((ps,i)=>{const tr=ps.filter(p=>/^trunk\./.test(p.n));return mn(S[i].solids.filter(q=>!(q.a&&q.b)&&q.k!=="floor").map(q=>mn(tr.map(p=>gap(q,p)))).filter(g=>g>-.01));});
  t.ok(mx(back)<=.01,"4. the back against the back pad: at most "+cm(mx(back))+" from it");
  /* 5, 6: the pads against the legs' skin (capsules.js skinParts), what they press on as drawn */
  /* 5 */
  const lap=us.map((u,i)=>{const q=near(i,V.lerp(mid(J[i],"hip"),mid(J[i],"kn"),.8)),th=SK[i].filter(p=>/^thigh\./.test(p.n));
    const c=V.lerp(q.a,q.b,.5),h=mid(J[i],"hip"),k=mid(J[i],"kn"),along=V.dot(V.sub(c,h),V.norm(V.sub(k,h)))/V.len(V.sub(k,h));
    return {g:mn(th.map(p=>partVsPart(q,p))),along};});
  t.ok(lap.every(x=>x.g>=-.002&&x.g<=.01),"5. the lap pad holds the thighs: "+cm(mn(lap.map(x=>x.g)))+"–"+cm(mx(lap.map(x=>x.g)))+" from them (touching, within 1 cm)");
  t.ok(lap.every(x=>x.along>=.6&&x.along<=.95),"5. the lap pad just above the knees: "+Math.round(lap[0].along*100)+"% of the way from hip to knee (60–95%)");
  /* 6 */
  const roll=us.map((u,i)=>{const A=mid(J[i],"an"),K=mid(J[i],"kn"),q=near(i,A),c=V.lerp(q.a,q.b,.5);
    const along=V.dot(V.sub(c,A),V.norm(V.sub(K,A)))/V.len(V.sub(K,A)),sh=SK[i].filter(p=>/^shin\./.test(p.n));
    return {g:mn(sh.map(p=>partVsPart(q,p))),along};});
  t.ok(roll.every(x=>x.g>=-.002&&x.g<=.01),"6. the roller stays on the legs: "+cm(mn(roll.map(x=>x.g)))+"–"+cm(mx(roll.map(x=>x.g)))+" from the shins (touching, within 1 cm)");
  t.ok(roll.every(x=>x.along>=.05&&x.along<=.35),"6. the roller under the lower calves, above the heel: "+Math.round(roll[0].along*100)+"% of the way from ankle to knee (5–35%)");
  /* 7 */
  const K0=mid(J[0],"kn"),drift=mx(J.map(j=>V.len(V.sub(mid(j,"kn"),K0))));
  t.ok(drift<=.02,"7. the knees stay on the machine's pivot: they move "+cm(drift)+" over the repetition (at most 2 cm)");
  /* 8 */
  const feet=mn(P.map(ps=>mn(ps.filter(p=>/^foot\./.test(p.n)).map(p=>Math.min(p.a[1]-p.ra,p.b[1]-p.rb)))));
  t.ok(feet>=.03,"8. the feet clear the floor: at least "+cm(feet)+" above it");
  /* 9 */
  const [up,hold,down]=rec.tempo;
  t.ok(down>=1.5*up&&hold>=.5,"9. controlled: lowering "+down+" s against curling "+up+" s, a "+hold+" s hold at the curl");
  /* 10 */
  const r=rolesFor("Hamstrings",[],rec.refine||{},familyOf(NAME)),lit=Object.keys(r);
  t.ok(lit.length>0&&lit.every(k=>r[k].role==="prime"),"10. the hamstrings alone, as prime mover (the library names no other): "+lit.join(", "));
  auditAll(t,NAME,rec,{pending:true});}
export {run};

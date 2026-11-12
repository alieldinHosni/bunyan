/* Romanian Deadlift: the rules of its dossier (docs/figures/ex/Romanian_Deadlift.md),
   numbered as there, measured over one repetition of its record. */
import {V} from "../../mannequin/geom.js";
import {recordForUnchecked} from "../../mannequin/records.js";
import {sceneAt, barGap, MIDFOOT_TOL, TOUCH_TOL} from "../../mannequin/motion.js";
import {midfoot} from "../../mannequin/capsules.js";
import {deg, knee, elbow, hipFlex, barOf, centreOfMass, footSpan, moments, f1, cm, auditAll} from "./measure.js";

const NAME="Romanian Deadlift";
function run(t){
  const rec=recordForUnchecked(NAME),us=moments(40),S=us.map(u=>sceneAt(rec,u)),J=S.map(s=>s.J);
  const bot=J[0],top=J[40],mx=a=>Math.max(...a),mn=a=>Math.min(...a);
  /* 1 */
  const neck=J.map(j=>deg(j.hu,j.cf.u));
  t.ok(rec.spine==="neutral"&&mx(neck)<=10,"1. spine neutral (one piece) and the neck in line, within 10° (worst "+f1(mx(neck))+"°)");
  /* 2, 3 */
  const gap=S.map(s=>barGap(s.pose,["thigh","shin"])),off=S.map(s=>Math.abs(barOf(s.J)[0]-midfoot(s)[0]));
  t.ok(mx(gap)<=TOUCH_TOL&&mn(gap)>-.003,"2. the bar on the legs: "+cm(mn(gap))+" to "+cm(mx(gap))+" from the thighs (within 1 cm, never 3 mm into them)");
  t.ok(mx(off)<=MIDFOOT_TOL,"3. the bar over the middle of the foot, within 2 cm (worst "+cm(mx(off))+")");
  /* 4 */
  const kn=J.map(j=>Math.max(knee(j,"l"),knee(j,"r"))),shin=J.map(j=>deg(V.sub(j.kn.l,j.an.l),[0,1,0]));
  t.ok(mn(kn)>=12&&mx(kn)<=25&&mx(kn)-mn(kn)<10,"4. knees soft and held: "+f1(mn(kn))+"° to "+f1(mx(kn))+"° (12–25°, range under 10°)");
  t.ok(mx(shin)<=8,"4. shins near upright (worst "+f1(mx(shin))+"° from upright)");
  /* 5 */
  const heel=footSpan(S[0])[0];
  t.ok(hipFlex(bot,"l")-hipFlex(top,"l")>=55,"5. a hinge: the hips flex by "+f1(hipFlex(bot,"l")-hipFlex(top,"l"))+"° while the knees hold");
  t.ok(bot.hip.l[0]<heel,"5. hips back: at the bottom the hips are behind the heels ("+cm(heel-bot.hip.l[0])+")");
  /* 6 */
  const hf=hipFlex(bot,"l");
  t.ok(hf>=80&&hf<=90,"6. the bottom where the hips stop: hip flexion "+f1(hf)+"° (80–90°)");
  t.ok(barOf(bot)[1]>=bot.kn.l[1]-.04,"6. the bar no lower than 4 cm below the knee joint ("+cm(barOf(bot)[1]-bot.kn.l[1])+" from it)");
  /* 7 */
  const el=J.map(j=>Math.max(elbow(j,"l"),elbow(j,"r")));
  t.ok(mx(el)<10,"7. arms long: elbows bent under 10° (worst "+f1(mx(el))+"°)");
  /* 8 */
  const lean=deg(top.cf.u,[0,1,0]),back=mn(J.map(j=>j.cf.u[0]));
  t.ok(lean<=5&&back>-Math.sin(3*Math.PI/180),"8. standing tall at the top ("+f1(lean)+"° from upright), never leaning back");
  /* 9 */
  let worst=1;for(const s of S){const c=centreOfMass(s)[0],f=footSpan(s);worst=Math.min(worst,c-f[0],f[1]-c);}
  t.ok(worst>=.03,"9. the body's centre of mass over the feet, at least 3 cm inside their outline (closest "+cm(worst)+")");
  /* 10: auditAll (feet flat, no slide), 11 */
  t.ok(rec.tempo[2]>=rec.tempo[0],"11. lowering ("+rec.tempo[2]+" s) no faster than lifting ("+rec.tempo[0]+" s)");
  /* 12 */
  const gw=Math.abs(top.grip.l[2]-top.grip.r[2]),sw=Math.abs(top.sh.l[2]-top.sh.r[2]);
  t.ok(gw>=sw&&gw<=1.5*sw,"12. grip "+cm(gw)+" across, the shoulders "+cm(sw)+" (1–1.5 times)");
  auditAll(t,NAME,rec);}
export {run};

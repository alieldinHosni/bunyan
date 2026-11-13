/* Incline Dumbbell Press: the rules of its dossier
   (docs/figures/ex/Incline_Dumbbell_Press.md), numbered as there, measured over one
   repetition of its record. */
import {V} from "../../mannequin/geom.js";
import {recordForUnchecked} from "../../mannequin/records.js";
import {sceneAt} from "../../mannequin/motion.js";
import {bodyParts} from "../../mannequin/capsules.js";
import {D, deg, elbow, moments, f1, cm, auditAll} from "./measure.js";

const NAME="Incline Dumbbell Press",HANDLE=.065,PLATE=.075;
function run(t){
  const rec=recordForUnchecked(NAME),us=moments(40),S=us.map(u=>sceneAt(rec,u)),J=S.map(s=>s.J);
  const mx=a=>Math.max(...a),mn=a=>Math.min(...a),bot=J[0],top=J[40];
  /* 1 */
  const bench=rec.equip(bot).find(e=>e[0]==="adjBench"),tilt=J.map(j=>Math.asin(Math.max(-1,Math.min(1,j.cf.u[1])))*D);
  t.ok(bench&&bench[2]>=30&&bench[2]<=45,"1. the bench at "+(bench&&bench[2])+"° (30–45°)");
  t.ok(mx(tilt.map(x=>Math.abs(x-bench[2])))<=3,"1. the trunk lies along it: "+f1(mn(tilt))+"–"+f1(mx(tilt))+"° above level");
  /* 2 */
  const fa=s=>J.map(j=>deg(V.sub(j.wr[s],j.el[s]),[0,1,0])),fal=fa("l"),far=fa("r");
  t.ok(fal[0]<=5&&far[0]<=5,"2. wrists over elbows at the bottom: forearms "+f1(Math.max(fal[0],far[0]))+"° from upright (at most 5°)");
  t.ok(mx(fal.concat(far))<=15,"2. and within 15° of upright all the way up (worst "+f1(mx(fal.concat(far)))+"°)");
  const wr=J.map(j=>Math.max(deg(j.hd.l,V.sub(j.wr.l,j.el.l)),deg(j.hd.r,V.sub(j.wr.r,j.el.r))));
  t.ok(mx(wr)<=10,"2. the wrist straight under the load, within 10° (worst "+f1(mx(wr))+"°)");
  /* 3 */
  const flare=j=>{const ua=V.norm(V.sub(j.el.l,j.sh.l));return Math.atan2(Math.abs(V.dot(ua,j.cf.l)),-V.dot(ua,j.cf.u))*D;};
  const low=J.filter(j=>j.el.l[1]<=j.sh.l[1]).map(flare);
  t.ok(flare(bot)>=45&&flare(bot)<=70&&mx(low)<=70,"3. elbows "+f1(flare(bot))+"° from the trunk at the bottom, at most 70° while they are below the shoulders (worst "+f1(mx(low))+"°)");
  /* 4 */
  const set=J.map(j=>{const d=V.sub(j.sh.l,j.neck);return [V.dot(d,j.cf.u),V.dot(d,j.cf.f)];});
  const du=mx(set.map(x=>x[0]))-mn(set.map(x=>x[0])),df=mx(set.map(x=>x[1]))-mn(set.map(x=>x[1]));
  t.ok(du<=.01&&df<=.01,"4. shoulder blades held set: the shoulder moves "+cm(du)+" toward the ears and "+cm(df)+" forward on the chest (each at most 1 cm)");
  /* 5 */
  const inner=j=>{const a=V.norm(V.sub(j.grip.l,j.grip.r));return V.len(V.sub(V.sub(j.grip.l,V.mul(a,HANDLE+PLATE)),V.add(j.grip.r,V.mul(a,HANDLE+PLATE))));};
  t.ok(inner(top)>=.02,"5. the dumbbells do not touch at the top: "+cm(inner(top))+" between their inner plates");
  /* 6 */
  const behind=-Math.asin(V.dot(V.norm(V.sub(bot.el.l,bot.sh.l)),bot.cf.f))*D;
  t.ok(behind>=0&&behind<=20,"6. controlled depth: the upper arm "+f1(behind)+"° below the trunk's front at the bottom (0–20°)");
  /* 7 */
  const eb=Math.max(elbow(top,"l"),elbow(top,"r"));
  t.ok(eb>=5&&eb<=20,"7. arms long, not locked, at the top: elbows "+f1(eb)+"° short of straight (5–20°)");
  t.ok(Math.abs(top.grip.l[0]-top.sh.l[0])<=.04,"7. the dumbbells over the shoulders at the top ("+cm(top.grip.l[0]-top.sh.l[0])+" from plumb)");
  const gx=J.map(j=>j.grip.l[0]);
  t.ok(gx.every((x,i)=>!i||x<=gx[i-1]+.025),"7. the path rises up and back toward the shoulders, never swinging toward the feet more than 2.5 cm");
  /* 8 */
  const neck=J.map(j=>deg(j.hu,j.cf.u));
  t.ok(rec.spine==="neutral"&&mx(neck)<=10,"8. spine neutral, head in line (worst "+f1(mx(neck))+"°)");
  /* 9 */
  const sole=S.map(s=>mn(bodyParts(s).filter(p=>/^foot\./.test(p.n)).map(p=>Math.min(p.a[1]-p.ra,p.b[1]-p.rb))));
  t.ok(mx(sole.map(Math.abs))<=.01,"9. feet flat on the floor (soles within 1 cm of it)");
  /* 10 */
  const [up,,down]=rec.tempo;
  t.ok(down>=1.5*up,"10. lowering "+down+" s, lifting "+up+" s: the weight lowered under control");
  /* 11 */
  t.ok(bot.pn.l[0]>.5&&bot.pn.r[0]>.5,"11. palms toward the feet (the dumbbells in line across the body)");
  auditAll(t,NAME,rec);}
export {run};

/* The 3D figure's safety checks (js/data/mannequin/collide.js) and the gate
   (records.js recordFor): docs/FIGURE-V3.md 2.0, 2.6. */
import {V, box, capsule, sphere, cyl, ellipsoid} from "../mannequin/geom.js";
import {sdf, partVsSolid, partVsPart, penetration, contactGaps, sweep, clearancesOver, limits, audit, bodyParts, moments, LIM} from "../mannequin/collide.js";
import {RECORDS, recordFor, recordForUnchecked, checkedOf, isChecked, markCheckedForTest} from "../mannequin/records.js";
import {TABLE} from "../mannequin/moves.js";
import {sceneAt} from "../mannequin/motion.js";
import {solve} from "../mannequin/skin.js";
import {stand} from "../mannequin/moves.js";

const X=[1,0,0],Y=[0,1,0],Z=[0,0,1];
const near=(a,b,e)=>Math.abs(a-b)<(e||1e-6);
function run(t){
  /* ---- distances, on synthetic solids ---- */
  const B=box([0,0,0],X,Y,Z,[.2,.1,.3],.01,2,0);
  t.ok(near(sdf(B,[.5,0,0]),.3,1e-9)&&near(sdf(B,[0,0,0]),-.1,1e-9),"a box: 30 cm outside its face, 10 cm inside at its middle");
  t.ok(near(sdf(sphere([0,0,0],.1,2,0),[0,.3,0]),.2,1e-9),"a sphere");
  t.ok(near(sdf(capsule([0,0,0],[1,0,0],.05,2,0),[.5,.2,0]),.15,1e-9),"a capsule");
  /* a cylinder is drawn with the radius geom.js leaves in it (q.r), so it is measured with it */
  const C=cyl([0,0,0],[0,.4,0],.1,.01,2,0);
  t.ok(near(sdf(C,[1,.2,0]),1-C.r,1e-9)&&near(sdf(C,[0,.6,0]),.2,1e-9),"a cylinder: from its side and its end");
  t.ok(Math.abs(sdf(ellipsoid([0,0,0],X,Y,Z,[.3,.1,.1],2,0),[.5,0,0])-.2)<.01,"an ellipsoid, near enough");
  const part=(a,b,r)=>({n:"forearm.l",a,b,ra:r,rb:r,c:V.lerp(a,b,.5),r:V.len(V.sub(b,a))/2+r});
  const through=partVsSolid(part([-.5,0,0],[.5,0,0],.04),B),touching=partVsSolid(part([-.5,.14,0],[.5,.14,0],.04),B),clear=partVsSolid(part([-.5,.3,0],[.5,.3,0],.04),B);
  t.ok(near(through.d,-.14,1e-6),"a capsule through a box overlaps it by its half height and its radius ("+through.d.toFixed(3)+")");
  t.ok(Math.abs(touching.d)<1e-6,"one lying on it touches (0)");
  t.ok(near(clear.d,.16,1e-6),"one above it is clear by 16 cm");
  t.ok(near(partVsPart(part([0,0,0],[1,0,0],.05),part([.5,.08,-1],[.5,.08,1],.05)),-.02,1e-9),"two capsules crossing 8 cm apart, 5 cm thick each, overlap by 2 cm");

  /* ---- the body ---- */
  const rest=bodyParts(solve(stand()));
  t.eq([...new Set(rest.map(p=>p.n))].sort(),["foot.l","foot.r","forearm.l","forearm.r","hand.l","hand.r","head","neck","pelvis","shin.l","shin.r","thigh.l","thigh.r","trunk.lower","trunk.upper","upperarm.l","upperarm.r"],"the body as 17 parts");
  const standRec={keys:[stand()],tempo:[1,1,1,1]};
  t.eq(penetration(standRec,0),[],"standing at ease, nothing goes through anything (the body's sizes are not too big)");
  t.ok(Math.min(...rest.filter(p=>/^foot/.test(p.n)).map(p=>Math.min(p.a[1]-p.ra,p.b[1]-p.rb)))>-.003,"and the feet are on the floor, not in it");
  t.eq(limits(standRec,0),[],"and no joint is out of its range");

  /* ---- synthetic records: a bar through the chest, beside it, a declared contact ---- */
  const bar=y=>({keys:[stand()],tempo:[1,1,1,1],equip:()=>[["tube",[.05,y,-.6],[.05,y,.6],.014,4]]});
  const chest=sceneAt(bar(1.3),0).J;
  t.ok(penetration(bar(1.3),0).some(x=>x.a==="trunk.upper"&&/tube/.test(x.b)&&x.depth>.05),"a bar through the chest is found, with its depth");
  t.eq(penetration(bar(2.2),0),[],"a bar overhead is not");
  const floating={keys:[stand()],tempo:[1,1,1,1],equip:()=>[["tube",[.05,1.3,-.6],[.05,1.3,.6],.014,4]],contact:[["head","tube"]]};
  t.ok(contactGaps(floating,0).some(x=>x.a==="head"&&x.declared),"a declared contact that does not touch is a gap");
  t.ok(!penetration({...floating,contact:[["trunk.upper","tube"]]},0).some(x=>x.a==="trunk.upper"&&x.depth<.003+1e-9)&&chest,"a declared contact is let off only within its allowance");
  const sw=sweep(bar(1.3),5);
  t.eq([...new Set(sw.penetration.map(x=>x.u))],[0,.25,.5,.75,1],"sweep checks every moment it is given");
  t.ok(moments(41).length===41&&moments(41)[40]===1,"41 by default");

  /* ---- real records: the faults the owner saw are found ---- */
  const A=n=>audit(recordForUnchecked(n),21);
  const ip=A("Incline Push-Up Medium");
  t.ok(ip.penetration.some(x=>x.a==="trunk.upper"&&/^bar:/.test(x.b)),"Incline Push-Up Medium: the chest through the bar (D1)");
  /* the plank as it was drawn when the owner saw it (hands behind the elbows): the
     record itself is corrected now (moves.js plank), so the fault is kept here, as it was */
  const oldPlank={keys:[{pelvis:[-.1,.3,0],pitch:84,head:-10,feet:{l:[-1.36,.12,.1],r:[-1.36,.12,-.1]},footDir:{l:[.15,-1,0],r:[.15,-1,0]},sole:{l:[1,.15,0],r:[1,.15,0]},knees:{l:[0,-1,0],r:[0,-1,0]},
    hands:{l:[.15,.06,.12],r:[.15,.06,-.12]},handDir:{l:[1,0,-.3],r:[1,0,.3]},palm:{l:[0,-1,0],r:[0,-1,0]},elbows:{l:[0,-1,.2],r:[0,-1,-.2]},grip:"fist"}],tempo:[1,1,1,1],
    equip:()=>[["mat",[-.5,0,0],{len:1.0,w:.38}]],contact:[["forearm","mat"]]};
  const pl=audit(oldPlank,3);
  t.ok(pl.limits.some(x=>/^wrist/.test(x.joint)&&Math.abs(x.value)>LIM.wrist),"Plank as it was: the hand folded back through the wrist (D5)");
  t.eq(A("Plank").limits,[],"Plank as it is now: forearms flat, wrists straight, no joint out of range");
  const dp=A("Decline Push-Up");
  t.ok(dp.penetration.some(x=>x.a==="head"&&(x.b==="floor"||/^mat/.test(x.b))),"Decline Push-Up: the head into the floor (D6)");
  const sk=A("EZ-Bar Skullcrusher");
  t.ok(sk.rules.includes("head")&&sk.clearances.some(x=>/head/.test(x.rule)),"a skull crusher is held to the 5 cm head clearance, and fails it");
  const bp=A("Barbell Bench Press - Medium Grip");
  t.ok(bp.rules.includes("bench")&&!bp.clearances.some(x=>/neck/.test(x.rule)),"the bench press is held to the bench clearances, and keeps the bar off the neck");
  t.ok(A("Barbell Curl").rules.includes("feet")&&A("Barbell Curl").pass,"a standing barbell curl is held to feet flat, and passes everything");
  t.ok(!A("Standing Barbell Calf Raise").rules.includes("feet"),"a calf raise is not held to feet flat");
  /* the bench rule itself, on a bar moved over the throat */
  const bpr=recordForUnchecked("Barbell Bench Press - Medium Grip");
  const throat={...bpr,_info:{family:"benchPress",opts:{}},drive:function(p,u){bpr.drive(p,u);const J=solve(p).J,up=J.cf.u;
    const s=V.lerp(J.sh.l,J.sh.r,.5);for(const k of ["l","r"])p.hands[k]=V.add(p.hands[k],V.mul([up[0],0,up[2]],.18));}};
  t.ok(clearancesOver(throat,[0,.5,1]).some(x=>/over the neck/.test(x.rule)),"a bench press with the bar over the throat fails (D3)");

  /* ---- the gate ---- */
  const all=[...new Set(Object.keys(RECORDS).concat(Object.keys(TABLE)))];
  t.eq(all.filter(n=>recordFor(n)&&!checkedOf(n)),[],"no unchecked record is reachable through recordFor ("+all.length+" records)");
  t.eq(all.filter(n=>!!recordFor(n)!==isChecked(n)),[],"recordFor gives exactly the checked ones");
  t.eq(all.filter(n=>checkedOf(n)&&!audit(recordForUnchecked(n),41).pass),[],"every checked record passes every automatic check (2.6: checked only when they hold)");
  t.ok(all.every(n=>recordForUnchecked(n)),"the tools still reach every record");
  t.eq(all.filter(n=>checkedOf(n)).sort(),["Incline Dumbbell Press","Pullups","Romanian Deadlift"],"approved by the owner, one by one (13 Nov): exactly these");
  { const row=TABLE["Pullups"][2],was=row.version;row.version="00000000";
    t.ok(!checkedOf("Pullups")&&!recordFor("Pullups"),"an approval given against another version of the movement does not count");
    row.version=was; }
  const undo=markCheckedForTest("Barbell Curl");
  t.ok(recordFor("Barbell Curl")===recordForUnchecked("Barbell Curl"),"the test hook marks one checked");
  undo();
  t.ok(!recordFor("Barbell Curl"),"and puts it back");
}
export {run};

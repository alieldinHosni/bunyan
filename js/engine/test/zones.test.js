import {stageFor, zonesFor} from "../zones.js";

/* Zones and stages as the book gives them (js/knowledge/cardio.js). */
function run(t){
  var z=zonesFor({age:40,vt1:145,vt2:165});
  t.eq(z.rows.map(function(r){return [r.min,r.max];}),[[null,144],[145,154],[155,164],[165,null]],"the book's worked example: VT1 145, VT2 165");
  var f=zonesFor({age:40});
  t.eq([f.measured,f.hrmax,f.rows.every(function(r){return r.min==null&&r.max==null;})],[false,180,true],"no talk test: zones by feel, max heart rate 208 − 0.7 × age as a starting point");
  t.eq([zonesFor({age:40,vt1:140,conds:["hypertension"]}).feelOnly,zonesFor({age:40,vt1:140,conds:["hypertension"]}).hrmax],[true,null],"medication that blunts the heart rate: no numbers");
  var cardio={cardio:function(n){return n==="Running";}};
  var day=function(d,min,rpe){return {date:d,entries:[{name:"Running",sets:[{min:min,rpe:rpe}]}]};};
  var three=[day("2026-11-01",35,3),day("2026-10-30",30,4),day("2026-10-28",40,0)];
  t.eq(stageFor({goal:"lose"},three.slice(0,2),"2026-11-02",cardio).stage,1,"two easy sessions: stage 1 still");
  t.eq([stageFor({goal:"lose"},three,"2026-11-02",cardio).needVT1,stageFor({goal:"lose",vt1:150},three,"2026-11-02",cardio).stage],[true,2],"three easy 30-minute sessions: stage 2 once VT1 is known");
  t.eq(stageFor({goal:"lose"},[day("2026-11-01",35,7),day("2026-10-30",30,8),day("2026-10-28",40,7)],"2026-11-02",cardio).ready,false,"hard sessions are not zone 1");
  t.eq([stageFor({goal:"endurance",level:"some",vt1:150,vt2:170},three,"2026-11-02",cardio).stage,stageFor({goal:"endurance",level:"new",vt1:150,vt2:170},three,"2026-11-02",cardio).stage],[3,2],"stage 3 needs VT2 and is not for a beginner");}

export {run};

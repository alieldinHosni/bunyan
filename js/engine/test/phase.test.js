import {phaseDose, phaseOf, seqFor} from "../phase.js";

/* The book's phases (js/knowledge/phases.js): everyone starts at 1, then 2, then the goal's. */
function run(t){
  t.eq([seqFor({goal:"lose"}),seqFor({goal:"gain"}),seqFor({goal:"strength",level:"some"}),seqFor({goal:"strength",level:"new"}),
        seqFor({goal:"athletic",level:"experienced"}),seqFor({goal:"endurance"}),seqFor({goal:"mobility"})],
    [[1,2,3],[1,2,3],[1,2,4],[1,2,3],[1,2,4,5],[1,2],[1]],"each goal's sequence; no maximal strength or power for a beginner");
  t.eq(seqFor({goal:"strength",level:"some",conds:["hypertension"]}),[1,2],"a health condition keeps to phases 1 and 2");
  t.eq([phaseOf(1,{goal:"gain"}).n,phaseOf(3,{goal:"gain"}).n,phaseOf(4,{goal:"gain"}).n],[1,3,1],"block by block, phase 1 again after the goal's");
  var p1=phaseOf(1,{goal:"gain"});
  t.eq([p1.reps,p1.sets,p1.restMax,/4-2-1-1/.test(p1.tempo)],[{min:12,max:20},{min:1,max:3},90,true],"phase 1 from the data: 12–20, 1–3 sets, rest up to 90 s, slow tempo");
  var p4=phaseOf(3,{goal:"strength",level:"some"});
  t.eq([phaseDose({sets:3,lo:8,hi:12,rest:120},p4,true).lo,phaseDose({sets:3,lo:8,hi:12,rest:120},p4,false).lo],[1,6],"maximal strength: 1–5 on the big lifts, the growth range on single-joint ones");
  t.eq(phaseDose({sets:3,lo:8,hi:12,rest:120},phaseOf(2,{goal:"gain"}),true).rest,120,"phase 2's superset rest is not put on a lift done alone");
  t.eq([phaseDose({sets:3,lo:8,hi:12,rest:120},p4,true).rest,phaseDose({sets:3,lo:8,hi:12,rest:120},p4,false).rest],[180,120],"maximal strength: 3–5 min on the multi-joint lifts (the book's), the rest as planned");
  t.eq(phaseDose({sets:3,lo:8,hi:12,rest:150},phaseOf(1,{goal:"gain"}),true).rest,90,"phase 1: rest no longer than 90 s");}

export {run};

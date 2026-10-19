/* Bunyan — the mannequin: exercise records
   What makes the one figure (rig.js) do one exercise: its start and end poses, how its
   equipment is built around the body and moves with it, the tempo, the camera, and the
   arrow. A record never brings its own body or its own muscles: what an exercise works
   comes from the library (exercises.json and extra.js: m, the main muscle, and x, the
   others), and the record can only narrow a broad name to the part the movement really
   uses (refine), in the library's own words.

   record = {
     id        the exercise's id in the library (its "i"): the still pictures and the
               thumbnail are named by it
     keys      [start, end] poses (rig.js); start is the stretched position, so the
               lift (the working half) runs start to end
     drive     (pose, u, rec): where the equipment moves the body (a lever's grip on its
               arc), applied after the keys are mixed
     equip     (J, u, rec): the equipment as a props list (kit.js), from the joints
     tempo     [lift, hold, lower, rest] seconds
     cam       {yaw, pitch}: the view it is shown from; 0 looks at the figure's front,
               90 at its left side
     arrow     {track}: the joint whose path the arrow follows (wr.l, an.l, kn.l, P); by
               default whichever moves furthest
     refine    {Shoulders: "Front delts"}: a library name narrowed for this movement
   }

   Two exercises so far, the pilot: Machine Chest Press (the reference's Seated Chest
   Press) and Seated Machine Row. Both are seated on the same machine seat and driven
   by the same lever arm, which is the point: the second is the first's parts again. */
import {V} from "./geom.js";
import {joints, DIM} from "./rig.js";
import {arc} from "./motion.js";
import {moveFor} from "./moves.js";

var add=V.add,sub=V.sub,mul=V.mul;

/* ---- shared ---- */
function S(x,y,z){return {l:[x,y,z],r:[x,y,-z]};}
/* Seated on a machine seat whose top is at 0.48: pelvis on it, feet flat on the floor,
   knees a little apart. */
function seated(o){return Object.assign({pelvis:[-.12,.61,0],feet:S(.36,.08,.17),knees:S(1,.4,.15),grip:"grip"},o||{});}
/* a point on the trunk: du along its up, df forward, dl to its left */
function along(J,du,df,dl){return add(add(add(J.P,mul(J.pf.u,du)),mul(J.pf.f,df||0)),mul(J.pf.l,dl||0));}
/* The grip in each hand: in the palm, the fingers round it (skin.js). */
function grip(J,s){return J.grip[s];}
/* The wrist that puts the palm on a handle at g. */
function wristFor(J,s,g){return sub(sub(g,mul(J.hd[s],DIM.palm)),mul(J.pn[s],.022));}
/* Levers whose grips run start to end on a rigid arc: one per side, each turning on a
   pivot above the middle of its path (reach metres up), so the hands follow the
   machine. The grips' start and end come from the keys' hands and hand directions. */
function levers(rec,reach){
  if(rec._lv)return rec._lv;
  var A=joints(rec.keys[0]),Bj=joints(rec.keys[1]),lv={};
  ["l","r"].forEach(function(s){lv[s]=arc(grip(A,s),grip(Bj,s),[0,1,0],reach);});
  rec._lv=lv;return lv;}
/* drive: each wrist sits behind its grip on the arc */
function onLevers(reach){
  return function(p,u,rec){
    var lv=levers(rec,reach),J=joints(p);
    p.hands={};
    ["l","r"].forEach(function(s){p.hands[s]=wristFor(J,s,lv[s].at(u));});};}
/* The machine seat on its post and rail, and a back pad along the trunk. */
function seat(){return [["seat",[-.13,.48,0],[1,0,0],{back:.5,front:.36}]];}
function backPad(J){return [["soft",along(J,.33,-.13),J.pf.u,J.pf.f,[.36,.048,.17]],
  ["beam",along(J,.1,-.2),[-.13,.44,0],.065,.065]];}
/* The lever arms and what carries them: the grips (vertical, a neutral grip) at the
   ends of rigid arms hanging from a shaft overhead, its hubs at the pivots, the shaft
   held by a boom from the weight-stack tower at towerX (the tower faces the seat). */
function leverRig(J,u,rec,reach,towerX){
  var lv=levers(rec,reach),o=[],P={l:lv.l.pivot,r:lv.r.pivot},y=P.l[1];
  ["l","r"].forEach(function(s){
    var g=lv[s].at(u),axis=lv[s].axis;
    o.push(["lever",P[s],g,[0,1,0],{h:.065}]);
    o.push(["hub",P[s],axis,.05,.06]);});
  var xm=(P.l[0]+P.r[0])/2,zs=Math.max(Math.abs(P.l[2]),Math.abs(P.r[2]))+.05;
  o.push(["beam",[xm,y,-zs],[xm,y,zs],.06,.06]);
  o.push(["beam",[towerX,y+.06,0],[xm,y+.06,0],.09,.09]);
  o.push(["beam",[xm,y+.06,-.02],[xm,y,-.02],.08,.05]);
  return o;}

/* ---- the records ---- */
var TW=-.68;   /* the chest press's tower, behind the seat */
var RECORDS={
  /* Seated chest press: back on the pad, grips wide at mid-chest height, elbows out
     and in line with the body (about 60° at the elbow); press forward until the arms
     are long but not locked (about 165°), the grips drawing together; back under
     control. */
  "Machine Chest Press":{
    id:"bn_machine_chest_press",
    keys:[
      seated({hands:S(.2,.98,.32),handDir:S(1,0,-.15),elbows:S(-.8,-.35,.9)}),
      seated({hands:S(.455,1.01,.19),handDir:S(1,0,0),elbows:S(-.2,-1,.6)})],
    drive:onLevers(.78),
    equip:function(J,u,rec){
      return seat().concat(backPad(J),[["tower",[TW,0,0],[1,0,0]]],leverRig(J,u,rec,.78,TW+.1));},
    tempo:[1.0,.3,1.7,.5],
    cam:{yaw:55,pitch:8},
    arrow:{track:"wr.l"},
    refine:{Shoulders:"Front delts"}},
  /* Seated machine row: chest on the pad, arms long to the grips; pull the grips back
     to the sides of the lower ribs, elbows close, going back and down behind the
     body; back under control until the arms are long again. */
  "Seated Machine Row":{
    id:"bn_seated_machine_row",
    keys:[
      seated({hands:S(.47,1.02,.2),handDir:S(1,0,0),elbows:S(-.2,-1,.3)}),
      seated({hands:S(.08,.86,.21),handDir:S(1,0,0),elbows:S(-1,-.4,.1)})],
    drive:onLevers(.78),
    equip:function(J,u,rec){
      var tx=.86;
      return seat().concat([["tower",[tx,0,0],[-1,0,0],{h:1.85}],
        ["soft",[.08,1.0,0],[0,1,0],[1,0,0],[.18,.048,.15]],
        ["beam",[.13,1.0,0],[tx-.13,1.0,0],.065,.065],["beam",[-.13,.022,0],[tx,.022,0],.09,.044]],
        leverRig(J,u,rec,.78,tx-.1));},
    tempo:[1.0,.4,1.6,.5],
    /* from behind and to the side: the back is what works */
    cam:{yaw:145,pitch:10},
    arrow:{track:"wr.l"}}
};
/* The record for an exercise, by its name in the library: one written here, or one
   built from its movement's family (moves.js); null when it has none yet. */
function recordFor(name){return (name&&Object.prototype.hasOwnProperty.call(RECORDS,name))?RECORDS[name]:moveFor(name);}

export {RECORDS, recordFor, seated, along, grip, wristFor, levers};

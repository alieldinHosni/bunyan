/* Bunyan — the 3D figure: the safety checks (docs/FIGURE-V3.md 2.0 and 2.6)
   A figure is shown to someone who will copy it, so a body that passes through a bar,
   a wrist folded backwards or a bar over the throat is not a glitch but a wrong
   instruction. This module finds them. It changes nothing: the solver, the records
   and the renderer are as they were; this only measures what they produce.

     bodyParts(sc)          the body at a moment as round cones (capsules whose two
                            ends may differ in radius), from the solved joints and
                            bones of sceneAt(rec, u)
     penetration(rec, u)    [{a, b, depth, u}]: every pair overlapping by more than
                            3 mm: a body part against a solid of the equipment or the
                            floor (y = 0), or against a part of the body that is not
                            its neighbour. Declared and derived contacts are let off
                            up to their allowance (below)
     contactGaps(rec, u)    [{a, b, gap, u}]: contacts that should touch and do not
                            (a gap over 5 mm)
     sweep(rec, n)          every collision fault over the repetition, at n moments
                            (41 by default)
     clearances(rec, u)     the injury clearances of 2.6 that hold for every exercise
                            of a family, whatever the exercise: the bar never over the
                            neck or face in a bench press; a bar or handle never within
                            5 cm of the head on its way past in overhead presses,
                            pulldowns and skull crushers; feet flat in standing lifts
     limits(rec, u)         the joint limits of 2.0: elbow and knee not past their
                            bend, never backwards or sideways; the forearm's turn; the
                            wrist's range; the neck in line
     audit(rec, n)          all of it over the repetition, by check, with the worst
     jointSpeed(rec, tempo) no teleporting (2.0): the fastest any joint moves between
                            two frames at 60 a second over one repetition, at the
                            record's tempo (or a prescribed one): {speed, joint, u}
     slide(rec, n)          no sliding (2.0): how far a planted foot or a gripping hand
                            moves over the repetition: [{part, on, moved, u}], each
                            planted part's largest move from where it is at u = 0

   What counts as contact. A record may say what touches what:
     contact: [["hand.l", "bar"], ["trunk", "bench"], ["forearm", "floor"]]
   a part (a name below, or a name without its side for both sides, or "trunk" for
   the upper and lower trunk) and what it touches: a piece of equipment by its kit name
   (kit.js tag: "barbell", "mat"...; "bench" is any bench), a kind of solid ("box",
   "capsule", "cylinder", "sphere", "ellipsoid"), "floor", or another part of the
   body; a third entry "may" when it may touch but need not (a bar coming down to the
   chest). A declared contact must touch (within 5 mm) at every moment, and is let off
   penetration up to its allowance; a hard thing that may rest on the body presses in
   by 2 cm at most.
   The rest are already in the data and are derived, so few records needed editing:
   - Holding. A hand whose fingers close (the pose's grip is "grip" or "fist", or 0.5
     and over) holds every solid whose surface passes within 2 cm of the point in its
     palm where a handle sits (skin.js J.grip, which the families' grasp() puts on the
     handle). It may overlap what it holds; what it holds must come within 5 mm of
     that point.
   - Resting. A hand that holds nothing, a foot, or a part of the trunk, the pelvis,
     the head, a thigh, a shin, an upper arm or a forearm, that touches a support (the
     floor, a mat, a box, a bench, a pad, a seat, a foot plate, a wall: within 1 cm)
     at the start or the end of the movement is resting on it there: what the
     stance()/sit()/lie()/floorLie() helpers of moves.js and seated() of records.js
     produce. If it rests on the same support at both ends it must stay on it all the
     way (no gap over 5 mm).
   - A hand that holds nothing, resting on the body (on the hip, behind the head,
     arms crossed on the chest), touching the trunk, the pelvis, the head, a thigh or
     the other forearm at both ends, the same way.
   Allowances: what is held may overlap the hand without limit; where a part rests on
   a pad or a seat, or on the body, it may sink by 4 cm (about half a pad's thickness:
   foam and flesh give), as may the belly and the thigh across the hip's crease; the
   floor, a mat, a box and every other hard thing give nothing beyond the 3 mm every
   pair gets.

   The sizes of the body's parts are modelling constants for these checks only, never
   shown to the person: measured from the mesh (img/fig/body.bin) in its rest pose,
   each the median distance of the part's own vertices (the bone that weighs on them
   most) from its axis, near each end, rounded down a few millimetres so that a fault
   reported is one a person would see. The trunk is not round, so it is four capsules
   lying across it (shoulders, chest, lower ribs, waist) and one across the pelvis, at
   the heights the mesh has them, each as deep as the mesh is there from back to front
   and as wide as it is from side to side.

   World axes, in metres: x forward (the way the figure faces), y up, z the figure's
   left. Pure: no DOM, no state beyond a cache of what each record is. */
import {V} from "./geom.js";
import {IX, ARM} from "./skin.js";
import {bodyParts, partVsPart, midfoot} from "./capsules.js";
import {sceneAt, phaseAt, cycleOf} from "./motion.js";
import {RECORDS} from "./records.js";
import {TABLE, moveFor} from "./moves.js";

var add=V.add,sub=V.sub,mul=V.mul,dot=V.dot,cross=V.cross,len=V.len,norm=V.norm,lerp=V.lerp;
var D=180/Math.PI,LR=["l","r"];
var TOL=.003,GAP=.005,SOFT=.04,MAY=.02,HOLD=.02,NEAR=.01,BODYNEAR=.01;

/* Parts that meet at a joint: never checked against each other. Across the hip's
   crease the belly and the thigh press together as the hip closes (sitting, the
   bottom of a squat): they may give as soft parts do, no more. */
var FOLD={"trunk.lower|thigh":1,"thigh|trunk.lower":1};
var NEXT={"head|neck":1,"neck|trunk.upper":1,"trunk.upper|trunk.lower":1,"trunk.lower|pelvis":1,
  "trunk.upper|upperarm":1,"upperarm|forearm":1,"forearm|hand":1,"pelvis|thigh":1,"thigh|shin":1,"shin|foot":1};
function base(n){return n.replace(/\.[lr]$/,"");}
function sideOf(n){var m=/\.([lr])$/.exec(n);return m?m[1]:"";}
function neighbours(a,b){
  if(a===b)return true;
  var x=base(a),y=base(b),sa=sideOf(a),sb=sideOf(b);
  /* a limb's own chain is one side's */
  if(sa&&sb&&sa!==sb)return false;
  return !!(NEXT[x+"|"+y]||NEXT[y+"|"+x]);}


/* ---- distances ---- */
function clamp(x,a,b){return x<a?a:x>b?b:x;}
/* signed distance from p to a solid (geom.js kinds), negative inside. A cylinder's r
   is what geom.js leaves in it, which is also what mesh.js draws it with (geom.js's
   bound() writes the bounding radius over the cylinder's own), so this measures the
   cylinder as it is drawn. */
function sdf(q,p){
  var d,l;
  switch(q.k){
    case 0: return len(sub(p,q.c0))-q.r0;
    case 1:{var t=clamp(dot(sub(p,q.a),q.ba)/q.l2,0,1);return len(sub(p,add(q.a,mul(q.ba,t))))-(q.ra+(q.rb-q.ra)*t);}
    case 2:{d=sub(p,q.c0);var e=[dot(d,q.ex)/q.rad[0],dot(d,q.ey)/q.rad[1],dot(d,q.ez)/q.rad[2]];
      var k0=len(e),k1=len([e[0]/q.rad[0],e[1]/q.rad[1],e[2]/q.rad[2]]);
      return k1<1e-9?-Math.min(q.rad[0],q.rad[1],q.rad[2]):k0*(k0-1)/k1;}
    case 3:{d=sub(p,q.c0);var rr=Math.min(q.rr,q.hs[0]*.95,q.hs[1]*.95,q.hs[2]*.95);
      var b=[Math.abs(dot(d,q.ex))-(q.hs[0]-rr),Math.abs(dot(d,q.ey))-(q.hs[1]-rr),Math.abs(dot(d,q.ez))-(q.hs[2]-rr)];
      l=len([Math.max(b[0],0),Math.max(b[1],0),Math.max(b[2],0)]);
      return l+Math.min(Math.max(b[0],b[1],b[2]),0)-rr;}
    case 4:{d=sub(p,q.a);var y=dot(d,q.ax),rad=len(sub(d,mul(q.ax,y))),r2=Math.min(q.rr,q.r*.9,q.h/2*.9);
      var dx=rad-(q.r-r2),dy=Math.abs(y-q.h/2)-(q.h/2-r2);
      return len([Math.max(dx,0),Math.max(dy,0),0])+Math.min(Math.max(dx,dy),0)-r2;}}
  return 1e9;}
var FLOOR={k:"floor",tag:"floor",c:[0,0,0],r:1e9};
function sdfAny(q,p){return q.k==="floor"?p[1]:sdf(q,p);}
/* The least clearance between a body part and a solid (negative: overlapping), and
   where along the part: sampled along it, then narrowed round the best. */
function partVsSolid(c,q){
  function f(t){return sdfAny(q,lerp(c.a,c.b,t))-(c.ra+(c.rb-c.ra)*t);}
  var best=1e9,bt=0,i,N=12;
  for(i=0;i<=N;i++){var v=f(i/N);if(v<best){best=v;bt=i/N;}}
  var lo=Math.max(0,bt-1/N),hi=Math.min(1,bt+1/N);
  for(i=0;i<24;i++){var m1=lo+(hi-lo)/3,m2=hi-(hi-lo)/3;if(f(m1)<f(m2))hi=m2;else lo=m1;}
  var tt=(lo+hi)/2,vv=f(tt);
  if(vv<best){best=vv;bt=tt;}
  return {d:best,t:bt};}
function near(a,b,m){return len(sub(a.c,b.c))<a.r+b.r+m;}

/* ---- what each record is ---- */
/* The family and parameters an exercise's record is built from (moves.js TABLE), or
   "machine" for one written by hand (records.js). Found from the record itself. */
var INFO=null;
function infoOf(rec){
  if(rec&&rec._info)return rec._info;
  if(!INFO){INFO=new Map();
    Object.keys(RECORDS).forEach(function(n){INFO.set(RECORDS[n],{name:n,family:"machine",opts:{}});});
    Object.keys(TABLE).forEach(function(n){INFO.set(moveFor(n),{name:n,family:TABLE[n][0].name,opts:TABLE[n][1]||{}});});}
  return INFO.get(rec)||{name:"",family:"",opts:{}};}

/* ---- contacts ---- */
var SUPPORT={floor:1,mat:1,block:1,bench:1,adjBench:1,declineBench:1,preacher:1,pad:1,seat:1,soft:1,cushion:1,slab:1,wall:1};
var REST_PARTS={hand:1,foot:1,"trunk.upper":1,"trunk.lower":1,pelvis:1,head:1,thigh:1,shin:1,upperarm:1,forearm:1};
var ON_BODY={"trunk.upper":1,"trunk.lower":1,pelvis:1,head:1,thigh:1,forearm:1};
/* soft: pads and the body give a little; hard things do not */
function isSoft(q){return q.part||(q.k===3&&q.m===3);}
function gripOf(p,s){var g=p.grip;if(g&&typeof g==="object")g=g[s];return g;}
function closes(p,s){var g=gripOf(p,s);return g==="grip"||g==="fist"||(typeof g==="number"&&g>=.5);}
function label(q){return q.part?q.part:q.k==="floor"?"floor":(q.tag||"?")+":"+["sphere","capsule","ellipsoid","box","cylinder"][q.k];}
function matches(q,what){
  if(what==="floor")return q.k==="floor";
  if(q.part)return q.part===what||base(q.part)===what;
  if(what==="bench")return /^(bench|adjBench|declineBench|preacher)$/.test(q.tag||"");
  return q.tag===what||["sphere","capsule","ellipsoid","box","cylinder"][q.k]===what||(what==="cone"&&q.k===1);}
function partMatches(n,what){return n===what||base(n)===what||(what==="trunk"&&/^trunk\./.test(n))||(what==="back"&&/^trunk\./.test(n));}

/* The scene at u, with the body as parts, the solids with the floor, and what each
   hand holds. */
function world(rec,u){
  var sc=sceneAt(rec,u),parts=bodyParts(sc),solids=sc.solids.concat([FLOOR]),held={};
  LR.forEach(function(s){
    held[s]=[];
    if(!closes(sc.pose,s))return;
    var g=sc.J.grip[s];
    solids.forEach(function(q,i){if(q.k!=="floor"&&len(sub(q.c,g))<q.r+HOLD&&sdf(q,g)<HOLD)held[s].push(i);});});
  return {sc:sc,parts:parts,solids:solids,held:held};}
/* For each record, the resting contacts found at its two ends: part name -> the
   supports (solid index, or "part:<name>" for the body) it rests on at u = 0 and 1. */
function restsAt(w){
  var out={};
  w.parts.forEach(function(c){
    var b=base(c.n),s=sideOf(c.n);
    if(!REST_PARTS[b])return;
    if(b==="hand"&&w.held[s].length)return;
    var list=out[c.n]=out[c.n]||{};
    w.solids.forEach(function(q,i){
      if(!SUPPORT[q.tag]||(q.k!=="floor"&&!near(c,q,NEAR)))return;
      if(partVsSolid(c,q).d<NEAR)list[i]=1;});
    if(b==="hand"||b==="forearm")w.parts.forEach(function(o){
      if(o===c||!ON_BODY[base(o.n)]||neighbours(c.n,o.n))return;
      if(near(c,o,BODYNEAR)&&partVsPart(c,o)<BODYNEAR)list["part:"+o.n]=1;});});
  return out;}
var RESTS=new WeakMap();
function restsOf(rec){
  if(RESTS.has(rec))return RESTS.get(rec);
  var a=restsAt(world(rec,0)),b=restsAt(world(rec,1)),r={either:{},both:{}};
  [a,b].forEach(function(x){for(var n in x)for(var k in x[n]){(r.either[n]=r.either[n]||{})[k]=1;}});
  for(var n in a)for(var k in a[n])if(b[n]&&b[n][k])(r.both[n]=r.both[n]||{})[k]=1;
  RESTS.set(rec,r);return r;}
/* the declared contacts as [part name, target] for this body */
function declared(rec,w){
  var out=[];
  (rec.contact||[]).forEach(function(cd){
    w.parts.forEach(function(c){if(partMatches(c.n,cd[0])&&!out.some(function(o){return o[0]===c.n&&o[1]===cd[1];}))out.push([c.n,cd[1],cd[2]==="may"]);});});
  return out;}

/* ---- penetration ---- */
function solidFor(w,k){
  if(typeof k==="string"&&k.indexOf("part:")===0){var n=k.slice(5);return w.parts.filter(function(p){return p.n===n;});}
  return [w.solids[k]];}
function penetrationW(rec,w,u){
  var out=[],rs=restsOf(rec),dec=declared(rec,w);
  function allowance(c,q,i){
    var s=sideOf(c.n);
    if(base(c.n)==="hand"&&i!=null&&w.held[s].indexOf(i)>=0)return Infinity;
    var key=i!=null?i:"part:"+q.n;
    var dl=dec.filter(function(d){return d[0]===c.n&&(q.part?partMatches(q.part,d[1]):matches(q,d[1]));});
    var rest=rs.either[c.n]&&rs.either[c.n][key];
    if(!q.part&&!rest&&!dl.length)return TOL;
    if(q.part&&!rest&&!dl.length){var back=rs.either[q.n]&&rs.either[q.n]["part:"+c.n];if(!back&&!FOLD[base(c.n)+"|"+base(q.n)])return TOL;}
    /* a hard thing that may rest on the body (a bar on the chest) presses in 2 cm */
    if(!q.part&&!isSoft(q)&&dl.length&&dl.every(function(d){return d[2];}))return MAY;
    return isSoft(q)||q.part?SOFT:TOL;}
  w.parts.forEach(function(c){
    w.solids.forEach(function(q,i){
      if(q.k!=="floor"&&!near(c,q,0))return;
      var r=partVsSolid(c,q);
      if(r.d>=-TOL)return;
      var al=allowance(c,q,i);
      if(-r.d>al)out.push({a:c.n,b:label(q),depth:-r.d,u:u});});});
  for(var i=0;i<w.parts.length;i++)for(var j=i+1;j<w.parts.length;j++){
    var x=w.parts[i],y=w.parts[j];
    if(neighbours(x.n,y.n)||base(x.n)===base(y.n)&&sideOf(x.n)===sideOf(y.n))continue;
    if(!near(x,y,0))continue;
    var d=partVsPart(x,y);
    if(d>=-TOL)continue;
    var al=Math.max(allowance(x,{part:y.n,n:y.n},null),allowance(y,{part:x.n,n:x.n},null));
    if(-d>al)out.push({a:x.n,b:y.n,depth:-d,u:u});}
  /* one entry for each pair: the deepest of the capsules a part is made of */
  var best={};
  out.forEach(function(o){var k=o.a+"|"+o.b;if(!best[k]||best[k].depth<o.depth)best[k]=o;});
  return Object.keys(best).map(function(k){return best[k];}).sort(function(a,b){return b.depth-a.depth;});}
function penetration(rec,u){return penetrationW(rec,world(rec,u),u);}

/* ---- contacts that should touch ---- */
function gapsW(rec,w,u){
  var out=[],rs=restsOf(rec);
  /* a hand holds what it closes round */
  LR.forEach(function(s){
    if(!w.held[s].length)return;
    var g=w.sc.J.grip[s],m=Math.min.apply(null,w.held[s].map(function(i){return sdf(w.solids[i],g);}));
    if(m>GAP)out.push({a:"hand."+s,b:"what it holds",gap:m,u:u});});
  function gapTo(c,k){
    return Math.min.apply(null,solidFor(w,k).map(function(q){return q.part?partVsPart(c,q):partVsSolid(c,q).d;}));}
  /* one gap per part (the least over the capsules it is made of), to the nearest of
     the supports it rests on at both ends */
  var names=[];w.parts.forEach(function(c){if(names.indexOf(c.n)<0)names.push(c.n);});
  var dec=declared(rec,w);
  names.forEach(function(n){
    var both=rs.both[n];if(!both||dec.some(function(d){return d[0]===n&&!d[2];}))return;
    var cs=w.parts.filter(function(c){return c.n===n;}),best=1e9,bk=null;
    Object.keys(both).forEach(function(k){
      var kk=isNaN(+k)?k:+k;
      cs.forEach(function(c){var g=gapTo(c,kk);if(g<best){best=g;bk=k;}});});
    if(best>GAP)out.push({a:n,b:isNaN(+bk)?bk.slice(5):label(w.solids[+bk]),gap:best,u:u});});
  declared(rec,w).forEach(function(d){
    if(d[2])return;
    var c=w.parts.filter(function(p){return p.n===d[0];}),g=1e9;
    c.forEach(function(x){
      w.solids.forEach(function(q){if(matches(q,d[1]))g=Math.min(g,partVsSolid(x,q).d);});
      w.parts.forEach(function(y){if(y!==x&&partMatches(y.n,d[1]))g=Math.min(g,partVsPart(x,y));});});
    if(g>GAP)out.push({a:d[0],b:d[1],gap:g===1e9?null:g,u:u,declared:true});});
  return out;}
function contactGaps(rec,u){return gapsW(rec,world(rec,u),u);}

function moments(n){n=n||41;var o=[];for(var i=0;i<n;i++)o.push(n===1?0:i/(n-1));return o;}
/* Every collision fault over the repetition. */
function sweep(rec,n){
  var pen=[],gaps=[];
  moments(n).forEach(function(u){var w=world(rec,u);pen=pen.concat(penetrationW(rec,w,u));gaps=gaps.concat(gapsW(rec,w,u));});
  return {penetration:pen,gaps:gaps};}

/* ---- clearances (2.6) ---- */
/* what the hands hold, as points: the bar's middle, or each handle; when the hands
   hold nothing (they are not closed on it), the weights in the scene */
var WEIGHTS={barbell:1,dumbbell:1,kettlebell:1,grip:1};
function heldWeights(w){
  var J=w.sc.J,out=[],hl=w.held.l,hr=w.held.r;
  if(!hl.length&&!hr.length){
    var byTag={};
    w.solids.forEach(function(q,i){if(WEIGHTS[q.tag]&&!q.bg)(byTag[q.tag]=byTag[q.tag]||[]).push(i);});
    Object.keys(byTag).forEach(function(k){
      var ii=byTag[k],c=[0,0,0];ii.forEach(function(i){c=add(c,mul(w.solids[i].c,1/ii.length));});
      out.push({p:c,solids:ii});});
    return out;}
  var shared=hl.filter(function(i){return hr.indexOf(i)>=0;});
  if(shared.length)out.push({p:lerp(J.grip.l,J.grip.r,.5),solids:shared});
  LR.forEach(function(s){var own=w.held[s].filter(function(i){return shared.indexOf(i)<0;});if(own.length)out.push({p:J.grip[s],solids:own});});
  return out;}
/* Bench press: the weight never over the neck or face while it is lowered or pressed:
   along the body's length (level, under gravity), never more than 5 cm past the shoulder joints toward the
   head (the shoulder joints are at the top of the chest; 5 cm past them is the base of
   the neck, in this body). At the bottom, over the chest (6 to 25 cm below the
   shoulder joints along the body) with the forearms within 10 degrees of upright
   (the bench row of the table in 2.3).
   These are the rule of 2.6 put into this body's measurements; they apply to every
   exercise of the family, whatever its grip or bench. */
var OVER_NECK=.05,CHEST_LO=.06,CHEST_HI=.25,FOREARM_UP=10;
function benchCheck(rec,ws){
  var out=[],low=null;
  ws.forEach(function(x){
    var w=x.w,J=w.sc.J,sh=lerp(J.sh.l,J.sh.r,.5),up=[J.cf.u[0],0,J.cf.u[2]];
    /* "over" is under gravity: what lies straight below the weight. The body's length
       is measured level, toward the head (so on an incline bench a bar straight above
       the shoulders is over the shoulders, not past them) */
    if(len(up)<.2)return;
    up=norm(up);
    heldWeights(w).forEach(function(im){
      var along=dot(sub(im.p,sh),up);
      if(along>OVER_NECK&&dot(sub(im.p,sh),[0,1,0])>0)out.push({rule:"weight over the neck or face",what:"held weight",value:along,limit:OVER_NECK,u:x.u});
      if(!low||im.p[1]<low.y)low={y:im.p[1],u:x.u,along:along,J:J};});});
  if(low){
    if(-low.along<CHEST_LO||-low.along>CHEST_HI)out.push({rule:"at the bottom the weight is over the chest",what:"held weight",value:-low.along,limit:[CHEST_LO,CHEST_HI],u:low.u});
    LR.forEach(function(s){var f=norm(sub(low.J.wr[s],low.J.el[s])),a=Math.acos(clamp(f[1],-1,1))*D;
      if(a>FOREARM_UP)out.push({rule:"forearms upright under the weight at the bottom",what:"forearm."+s,value:a,limit:FOREARM_UP,u:low.u});});}
  return out;}
/* Overhead presses, pulldowns, skull crushers: the bar or handle never within 5 cm of
   the head (its surface to the head's). */
var HEAD_CLEAR=.05;
function headCheck(rec,ws){
  var out=[];
  ws.forEach(function(x){
    var w=x.w,head=w.parts.filter(function(p){return p.n==="head";})[0];
    /* every solid of what the hands hold, and every weight and handle in the scene
       (an EZ bar's bends are not in the palms, but they pass the face all the same) */
    var ids={};
    heldWeights(w).forEach(function(im){im.solids.forEach(function(i){ids[i]=1;});});
    w.solids.forEach(function(q,i){if(WEIGHTS[q.tag]&&!q.bg)ids[i]=1;});
    Object.keys(ids).forEach(function(i){
      var q=w.solids[+i];
      /* a cable is not the handle */
      if(q.k===1&&Math.max(q.ra,q.rb)<.008)return;
      var d=partVsSolid(head,q).d;
      if(d<HEAD_CLEAR)out.push({rule:"bar or handle at least 5 cm from the head",what:label(q),value:d,limit:HEAD_CLEAR,u:x.u});});});
  return out;}
/* Standing lifts: both feet flat and whole on the floor all the way: the sole facing
   down within 10 degrees, and heel and ball within 5 mm of the floor. */
var FLAT=10;
function feetCheck(rec,ws){
  var out=[];
  ws.forEach(function(x){
    var w=x.w,J=w.sc.J;
    LR.forEach(function(s){
      var tilt=Math.acos(clamp(-J.fd[s].down[1],-1,1))*D,f=w.parts.filter(function(p){return p.n==="foot."+s;})[0];
      var heel=f.a[1]-f.ra,ball=f.b[1]-f.rb;
      if(tilt>FLAT)out.push({rule:"feet flat on the floor",what:"foot."+s+" tilted",value:tilt,limit:FLAT,u:x.u});
      if(Math.max(heel,ball)>GAP)out.push({rule:"feet flat on the floor",what:"foot."+s+" "+(heel>ball?"heel":"ball")+" off the floor",value:Math.max(heel,ball),limit:GAP,u:x.u});});});
  return out;}
/* Which clearances an exercise is held to, from its family (and, for the triceps, its
   kind): only the families the rule of 2.6 names. Standing: the families done standing
   with both feet on the floor, when the record starts that way (a pelvis above 75 cm,
   both ankles under 15 cm). */
var STANDING={curl:1,press:1,raise:1,shrug:1,uprightRow:1,squat:1,hinge:1,row:1,triceps:1,kbSwing:1,facePull:1,straightArm:1,
  crossover:1,cablePress:1,chop:1,pullThrough:1,sideBend:1};
function rulesFor(rec){
  var I=infoOf(rec),f=I.family,o=I.opts,r=[];
  if(f==="benchPress")r.push("bench");
  if(f==="press"||f==="pulldown"||(f==="triceps"&&o.kind==="lying"))r.push("head");
  if(STANDING[f]){var w=world(rec,0),J=w.sc.J;if(J.P[1]>.75&&J.an.l[1]<.15&&J.an.r[1]<.15)r.push("feet");}
  return r;}
function clearancesOver(rec,us){
  var r=rulesFor(rec);if(!r.length)return [];
  var ws=us.map(function(u){return {u:u,w:world(rec,u)};}),out=[];
  if(r.indexOf("bench")>=0)out=out.concat(benchCheck(rec,ws));
  if(r.indexOf("head")>=0)out=out.concat(headCheck(rec,ws));
  if(r.indexOf("feet")>=0)out=out.concat(feetCheck(rec,ws));
  return out;}
/* The clearances at one moment (the bench press's bottom is found among the moments
   given, so for it use clearancesOver with the whole repetition). */
function clearances(rec,u){return clearancesOver(rec,[u]);}

/* ---- joint limits (2.0) ---- */
/* Degrees (GEN: standard ranges of motion). Elbow 0-145, knee 0-140, as bends from
   straight. The forearm turns about 90 degrees each way from thumb-up: past full
   palm-up or full palm-down (5 degrees' leeway) it is twisted. The wrist bends 70
   either way (flexion, extension) and 40 to the side (radial about 20, ulnar about 35,
   with leeway); it does not turn along its length (the forearm does that), so a hand
   turned on the forearm by more than 25 degrees is twisted at the wrist. The knee
   bends only the way the foot points, give or take the shin's own turn (below 45
   degrees), so a knee never bends sideways, and past 120 it bends backwards.
   The neck: the head's line within 10 degrees of the chest's. The elbow and the knee
   cannot bend backwards in this body (the solver bends each on its hinge), but they
   are measured all the same. The forearm and the hand are read from their bones'
   matrices (skin.js), not from the pose's targets, so what is checked is what is
   drawn. */
var LIM={elbow:145,knee:140,roll:[-5,185],wrist:70,dev:40,wristTurn:25,kneeTurn:45,neck:10};
function angle(a,b){return Math.acos(clamp(dot(norm(a),norm(b)),-1,1))*D;}
function perp(v,ax){return sub(v,mul(ax,dot(v,ax)));}
function signed(a,b,ax){return Math.atan2(dot(cross(a,b),ax),dot(a,b))*D;}
/* the shortest turn taking unit u to unit v, applied to w */
function turnTo(u,v,w){
  var k=cross(u,v),s=len(k),c=dot(u,v);
  if(s<1e-9)return c>0?w:mul(w,-1);
  k=mul(k,1/s);var th=Math.atan2(s,c),cs=Math.cos(th),sn=Math.sin(th);
  return add(add(mul(w,cs),mul(cross(k,w),sn)),mul(k,dot(k,w)*(1-cs)));}
/* bone i's turn applied to a direction, and its inverse */
function turn(M,i,v){var o=i*16;return [M[o]*v[0]+M[o+4]*v[1]+M[o+8]*v[2],M[o+1]*v[0]+M[o+5]*v[1]+M[o+9]*v[2],M[o+2]*v[0]+M[o+6]*v[1]+M[o+10]*v[2]];}
function unturn(M,i,v){var o=i*16;return [M[o]*v[0]+M[o+1]*v[1]+M[o+2]*v[2],M[o+4]*v[0]+M[o+5]*v[1]+M[o+6]*v[2],M[o+8]*v[0]+M[o+9]*v[1]+M[o+10]*v[2]];}
/* the hand against the forearm, in the forearm's rest frame: flexion (toward the
   palm, positive), deviation (to the thumb's side for the left hand), and the turn
   along the hand, each less the rest pose's own */
function wristOf(M,s){
  var S=s==="l"?"L":"R",A=ARM[s],fa=norm(sub(A.wr,A.el)),pa=norm(perp(A.pn,fa)),sd=cross(fa,pa);
  function raw(hd,pn){
    var fl=Math.atan2(dot(hd,pa),dot(hd,fa))*D,dv=Math.asin(clamp(dot(hd,sd),-1,1))*D;
    var ref=turnTo(A.hd,hd,A.pn),tw=signed(norm(perp(ref,hd)),norm(perp(pn,hd)),hd);
    return [fl,dv,tw];}
  var r0=WR0[s]||(WR0[s]=raw(A.hd,A.pn));
  var fi=IX["lowerarm02."+S],wi=IX["wrist."+S];
  var hd=norm(unturn(M,fi,turn(M,wi,A.hd))),pn=norm(unturn(M,fi,turn(M,wi,A.pn)));
  var r=raw(hd,pn);
  return [r[0]-r0[0],r[1]-r0[1],r[2]-r0[2]];}
var WR0={};
function limitsAt(sc,u){
  var J=sc.J,M=sc.M,out=[];
  function put(j,what,v,lim){out.push({joint:j,what:what,value:v,limit:lim,u:u});}
  LR.forEach(function(s){
    var S=s==="l"?"L":"R";
    /* elbow */
    var du=norm(sub(J.el[s],J.sh[s])),df=norm(sub(J.wr[s],J.el[s])),bend=angle(du,df);
    if(bend>LIM.elbow)put("elbow."+s,"bent past its range",bend,LIM.elbow);
    /* the forearm's turn: 0 with the palm toward the bend (palm up in a curl), 90
       thumb up, 180 palm down; the palm's side of the forearm from its bone */
    if(bend>15){
      var A=ARM[s],fa=norm(sub(A.wr,A.el)),pa=turn(M,IX["lowerarm02."+S],perp(A.pn,fa));
      var ant=norm(perp(mul(du,-1),df)),pnf=perp(pa,df);
      if(len(pnf)>1e-3){var th=signed(ant,norm(pnf),df)*(s==="r"?1:-1);
        if(th<-90)th+=360;
        if(th<LIM.roll[0]||th>LIM.roll[1])put("forearm."+s,"turned past palm-up or palm-down",th,LIM.roll);}}
    /* wrist */
    var w=wristOf(M,s);
    if(Math.abs(w[0])>LIM.wrist)put("wrist."+s,w[0]>0?"bent toward the palm past its range":"bent back past its range",w[0],LIM.wrist);
    if(Math.abs(w[1])>LIM.dev)put("wrist."+s,"bent sideways past its range",w[1],LIM.dev);
    if(Math.abs(w[2])>LIM.wristTurn)put("wrist."+s,"hand turned on the forearm",w[2],LIM.wristTurn);
    /* knee */
    var dt=norm(sub(J.kn[s],J.hip[s])),ds=norm(sub(J.an[s],J.kn[s])),kb=angle(dt,ds);
    if(kb>LIM.knee)put("knee."+s,"bent past its range",kb,LIM.knee);
    if(kb>15){
      /* the front of the shin (the side the thigh comes from as the knee bends)
         against where the foot points, both square to the shin: the shin turns on
         the thigh by 30-40 degrees at most (GEN), so more than 45 is a knee bending
         sideways, and more than 120 one bending backwards. A foot pointing along the
         shin (kneeling, toes pointed) says nothing and is skipped. */
      var front=norm(perp(dt,ds)),fp=perp(J.fd[s].dir,ds);
      if(len(fp)>.3){
        var tn=signed(front,norm(fp),ds);
        if(Math.abs(tn)>LIM.kneeTurn)put("knee."+s,Math.abs(tn)>120?"bending backwards":"bending sideways",tn,LIM.kneeTurn);}}});
  /* neck */
  var nk=angle(J.hu,J.cf.u);
  if(nk>LIM.neck)put("neck","out of line with the spine",nk,LIM.neck);
  return out;}
function limits(rec,u){return limitsAt(sceneAt(rec,u),u);}

/* ---- no teleporting, no sliding (2.0) ---- */
/* Joint speed. The joints on a fine grid of u, then one repetition played at 60 frames
   a second through phaseAt: the largest distance any joint travels in one frame, over
   the frame's time. A joint that moves faster than SPEED_MAX (GEN: a modelling limit
   for the animation, well above a hand's speed in a fast lift, so only a snap trips it)
   has teleported. */
var SPEED_MAX=4,FPS=60,SPEED_N=200;
var JNAMES=["P","neck","head"],JSIDED=["sh","el","wr","hip","kn","an"];
function jointList(J){
  var o=[];JNAMES.forEach(function(k){o.push([k,J[k]]);});
  JSIDED.forEach(function(k){LR.forEach(function(s){o.push([k+"."+s,J[k][s]]);});});
  return o;}
function jointSpeed(rec,tempo){
  var grid=[],i;
  for(i=0;i<=SPEED_N;i++)grid.push(jointList(sceneAt(rec,i/SPEED_N).J));
  function at(u){
    var x=Math.min(Math.max(u,0),1)*SPEED_N,k=Math.min(Math.floor(x),SPEED_N-1),f=x-k;
    return grid[k].map(function(e,j){return [e[0],lerp(e[1],grid[k+1][j][1],f)];});}
  var c=cycleOf(rec,tempo),n=Math.max(2,Math.round(c*FPS)),dt=c/n,best={speed:0,joint:"",u:0},prev=at(phaseAt(rec,0,tempo).u);
  for(i=1;i<=n;i++){
    var u=phaseAt(rec,i*dt,tempo).u,cur=at(u);
    cur.forEach(function(e,j){var v=len(sub(e[1],prev[j][1]))/dt;if(v>best.speed)best={speed:v,joint:e[0],u:u};});
    prev=cur;}
  best.limit=SPEED_MAX;best.pass=best.speed<=SPEED_MAX;
  return best;}
/* Sliding. A foot resting at both ends on a support that does not move (the floor, a
   bench, a box...), and a hand closed round a solid that does not move (a pull-up bar,
   dip bars), are planted: the foot's heel and ball, or the hand's grip, may move less
   than SLIDE_MAX (2 mm) from where they are at u = 0 over the whole repetition.
   Equipment that moves with the body (a barbell, a lever) is not planted. */
var SLIDE_MAX=.002;
function sameSolid(a,b){return a&&b&&a.k===b.k&&len(sub(a.c,b.c))<1e-6&&Math.abs(a.r-b.r)<1e-6;}
function slide(rec,n){
  var us=moments(n||21),ws=us.map(function(u){return world(rec,u);}),rs=restsOf(rec),out=[];
  var w0=ws[0];
  /* a solid is fixed when it is the same in every moment */
  function fixed(i){return ws.every(function(w){return w.solids[i]&&sameSolid(w.solids[i],w0.solids[i]);});}
  var feet={};
  LR.forEach(function(s){
    var n0="foot."+s,both=rs.both[n0];
    if(both&&Object.keys(both).some(function(k){return !isNaN(+k)&&fixed(+k);}))feet[s]=1;});
  LR.forEach(function(s){
    if(feet[s]){
      var f0=w0.parts.filter(function(p){return p.n==="foot."+s;})[0],worst={part:"foot."+s,on:"its support",moved:0,u:0};
      ws.forEach(function(w,j){var f=w.parts.filter(function(p){return p.n==="foot."+s;})[0];
        var m=Math.max(len(sub(f.a,f0.a)),len(sub(f.b,f0.b)));if(m>worst.moved)worst={part:"foot."+s,on:"its support",moved:m,u:us[j]};});
      worst.pass=worst.moved<=SLIDE_MAX;out.push(worst);}
    var held=w0.held[s].filter(function(i){return w0.solids[i].k!=="floor"&&fixed(i)&&ws.every(function(w){return w.held[s].indexOf(i)>=0;});});
    if(held.length){
      var g0=w0.sc.J.grip[s],wh={part:"hand."+s,on:label(w0.solids[held[0]]),moved:0,u:0};
      ws.forEach(function(w,j){var m=len(sub(w.sc.J.grip[s],g0));if(m>wh.moved){wh.moved=m;wh.u=us[j];}});
      wh.pass=wh.moved<=SLIDE_MAX;out.push(wh);}});
  return out;}

/* ---- all of it ---- */
function worst(list,key,big){
  var b=null;list.forEach(function(x){if(!b||(big?x[key]>b[key]:x[key]<b[key]))b=x;});return b;}
/* Every check over the repetition at n moments: {penetration, gaps, clearances,
   limits} (lists), and pass when all are empty. */
function audit(rec,n){
  var us=moments(n),pen=[],gaps=[],lim=[];
  us.forEach(function(u){var w=world(rec,u);pen=pen.concat(penetrationW(rec,w,u));gaps=gaps.concat(gapsW(rec,w,u));lim=lim.concat(limitsAt(w.sc,u));});
  var cl=clearancesOver(rec,us);
  return {penetration:pen,gaps:gaps,clearances:cl,limits:lim,rules:rulesFor(rec),
    pass:!pen.length&&!gaps.length&&!cl.length&&!lim.length};}

export {jointSpeed, slide, SPEED_MAX, SLIDE_MAX, midfoot, bodyParts, sdf, partVsSolid, partVsPart, penetration, contactGaps, sweep, clearances, clearancesOver, limits, limitsAt, audit, infoOf, rulesFor, moments, worst, LIM};

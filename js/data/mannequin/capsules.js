/* Bunyan — the 3D figure: the body as capsules
   The body at a moment as round cones (capsules whose two ends may differ in radius),
   from the solved joints and bones (skin.js solve, or sceneAt in motion.js), and the
   distance between two of them. The safety checks (collide.js) measure with these, and
   the pose controller's path constraints (motion.js: a bar touching the shins) use the
   same ones, so what is constrained is what is checked. The sizes are explained at the
   top of collide.js. Pure: no DOM, no state.

     bodyParts(sc)       [{n, a, b, ra, rb, c, r}]: the 17 parts at a scene {J, M}
     partVsPart(x, y)    the clearance between two capsules (negative: overlapping)
     skinParts(sc)       the same parts with each limb as its skin (SKIN below): what
                         equipment meets
     midfoot(sc)         the middle of the feet: halfway from the heel's back to the
                         front of the shoe, both feet averaged */
import {V} from "./geom.js";
import {IX} from "./skin.js";

var add=V.add,sub=V.sub,mul=V.mul,dot=V.dot,len=V.len,norm=V.norm,lerp=V.lerp;
var LR=["l","r"];
function clamp(x,a,b){return x<a?a:x>b?b:x;}
/* ---- the body ---- */
/* The parts carried by a bone: their ends in the rest pose (metres, the body's own
   frame) and radii, measured as above. */
var BONE_PARTS=[
  /* the head from the chin to the crown, 17.6 cm across */
  {n:"head",bone:"head",a:[.065,1.655,0],b:[.06,1.715,0],ra:.088,rb:.088},
  {n:"neck",bone:"neck01",a:[.019,1.549,0],b:[.055,1.649,0],ra:.055,rb:.05},
  /* the trunk, across it: shoulders (the trapezius line), chest, lower ribs, waist */
  {n:"trunk.upper",bone:"spine01",a:[0,1.46,-.12],b:[0,1.46,.12],ra:.075,rb:.075},
  {n:"trunk.upper",bone:"spine01",a:[.04,1.36,-.07],b:[.04,1.36,.07],ra:.12,rb:.12},
  {n:"trunk.upper",bone:"spine02",a:[.037,1.24,-.04],b:[.037,1.24,.04],ra:.109,rb:.109},
  {n:"trunk.lower",bone:"spine04",a:[.048,1.12,-.045],b:[.048,1.12,.045],ra:.097,rb:.097},
  {n:"pelvis",bone:"root",a:[.022,.97,-.06],b:[.022,.97,.06],ra:.11,rb:.11}];
/* the hand, flat: two thin capsules from the wrist to the knuckles of the index and
   the little finger (the hand is about 3 cm thick and 8 cm across); the foot (with
   its trainer) from the heel to the ball, the sole at the floor in the rest pose.
   Left side, mirrored for the right */
var HANDS=[{a:[.229,1.104,.541],b:[.333,1.068,.573],ra:.016,rb:.013},{a:[.229,1.104,.551],b:[.273,1.035,.602],ra:.016,rb:.013}];
var FOOT={a:[-.02,.035,.215],b:[.19,.03,.215],ra:.035,rb:.03};
/* the limbs between their joints (J): radius at the near end and the far end, and
   where along it the part starts (the top of the thigh is inside the pelvis: its
   first 6 cm are the pelvis's) */
var LIMBS=[["upperarm","sh","el",.058,.046,0],["forearm","el","wr",.042,.021,0],["thigh","hip","kn",.085,.058,.14],["shin","kn","an",.056,.038,0]];

/* The limbs' skin, for what equipment meets (owner, 25 Nov: the Romanian deadlift's
   bar drawn through a thigh that every check had passed). LIMBS above are the median
   of the mesh about the bone, rounded down: right for the body against itself, where
   soft parts press together and only a fault a person would see should be reported.
   But a limb is not round about its bone: the thigh's front stands up to 4.4 cm off it,
   the calf 4.5 cm behind the shin. A bar "touching" LIMBS was drawn inside the leg.
   So against equipment (a bar, a pad, a bench, the floor) each limb is two capsules,
   its near and far half, each with its axis moved off the joints' line and radii set
   so that 97% of that half's vertices are inside: the smallest such capsule (the
   thigh's upper half 3 cm forward, the shin's 2.5 cm back). Each half's offset is in
   the rest pose's frame (left side) and is turned by the bone that carries that end.
   tools/figures/fit.mjs measures any exercise against them.
     [half from, to, radius there, radius there, offset] */
var SKIN={
  upperarm:[[0,.5,.085,.0561,[-.005,-.0066,-.0075]],[.5,1,.0675,.045,[.005,-.0033,-.0037]]],
  forearm:[[0,.5,.0475,.0455,[.007,.005,-.0052]],[.5,1,.035,.0266,[0,0,0]]],
  thigh:[[0,.5,.0975,.0911,[.0299,.0011,-.0151]],[.5,1,.1,.0656,[.01,.0004,-.005]]],
  shin:[[0,.5,.0675,.0663,[-.025,.0019,.0098]],[.5,1,.065,.0475,[-.01,.002,.0149]]]};
var SKIN_BONES={upperarm:["upperarm01","upperarm02"],forearm:["lowerarm01","lowerarm02"],thigh:["upperleg01","upperleg02"],shin:["lowerleg01","lowerleg02"]};
/* bone i's turn applied to a rest direction v (no translation) */
function turn(M,i,v){var o=i*16;
  return [M[o]*v[0]+M[o+4]*v[1]+M[o+8]*v[2],M[o+1]*v[0]+M[o+5]*v[1]+M[o+9]*v[2],M[o+2]*v[0]+M[o+6]*v[1]+M[o+10]*v[2]];}
/* The body at a scene with its limbs as their skin (SKIN): the parts equipment meets. */
function skinParts(sc){
  var J=sc.J,M=sc.M,out=bodyParts(sc).filter(function(p){return !SKIN[p.n.replace(/\.[lr]$/,"")];});
  LR.forEach(function(s){
    var S=s==="l"?"L":"R";
    LIMBS.forEach(function(L){
      var A=lerp(J[L[1]][s],J[L[2]][s],L[5]),B=J[L[2]][s],bn=SKIN_BONES[L[0]];
      SKIN[L[0]].forEach(function(h){
        var off=s==="l"?h[4]:mirror(h[4]),i=IX[bn[h[0]<.5?0:1]+"."+S],o=turn(M,i,off);
        out.push(cap(L[0]+"."+s,add(lerp(A,B,h[0]),o),add(lerp(A,B,h[1]),o),h[2],h[3]));});});});
  return out;}

/* where bone i's matrix takes rest point q */
function at(M,i,q){var o=i*16;
  return [M[o]*q[0]+M[o+4]*q[1]+M[o+8]*q[2]+M[o+12],M[o+1]*q[0]+M[o+5]*q[1]+M[o+9]*q[2]+M[o+13],M[o+2]*q[0]+M[o+6]*q[1]+M[o+10]*q[2]+M[o+14]];}
function mirror(q){return [q[0],q[1],-q[2]];}
function cap(n,a,b,ra,rb){return {n:n,a:a,b:b,ra:ra,rb:rb,c:lerp(a,b,.5),r:len(sub(b,a))/2+Math.max(ra,rb)};}
/* The body at a scene (sceneAt), as round cones. */
function bodyParts(sc){
  var J=sc.J,M=sc.M,out=[];
  BONE_PARTS.forEach(function(p){out.push(cap(p.n,at(M,IX[p.bone],p.a),at(M,IX[p.bone],p.b),p.ra,p.rb));});
  LR.forEach(function(s){
    var S=s==="l"?"L":"R",f=s==="l"?function(q){return q;}:mirror;
    LIMBS.forEach(function(L){out.push(cap(L[0]+"."+s,lerp(J[L[1]][s],J[L[2]][s],L[5]),J[L[2]][s],L[3],L[4]));});
    HANDS.forEach(function(h){out.push(cap("hand."+s,at(M,IX["wrist."+S],f(h.a)),at(M,IX["wrist."+S],f(h.b)),h.ra,h.rb));});
    out.push(cap("foot."+s,at(M,IX["foot."+S],f(FOOT.a)),at(M,IX["foot."+S],f(FOOT.b)),FOOT.ra,FOOT.rb));});
  return out;}

/* closest points of two segments: parameters s on p1-q1, t on p2-q2 */
function segSeg(p1,q1,p2,q2){
  var d1=sub(q1,p1),d2=sub(q2,p2),r=sub(p1,p2),a=dot(d1,d1),e=dot(d2,d2),f=dot(d2,r),s,t;
  if(a<1e-12&&e<1e-12)return [0,0];
  if(a<1e-12){s=0;t=clamp(f/e,0,1);}
  else{var c=dot(d1,r);
    if(e<1e-12){t=0;s=clamp(-c/a,0,1);}
    else{var b=dot(d1,d2),dn=a*e-b*b;s=dn>1e-12?clamp((b*f-c*e)/dn,0,1):0;t=(b*s+f)/e;
      if(t<0){t=0;s=clamp(-c/a,0,1);}else if(t>1){t=1;s=clamp((b-c)/a,0,1);}}}
  return [s,t];}
function partVsPart(x,y){
  var st=segSeg(x.a,x.b,y.a,y.b),s=st[0],t=st[1];
  var d=len(sub(lerp(x.a,x.b,s),lerp(y.a,y.b,t)));
  return d-(x.ra+(x.rb-x.ra)*s)-(y.ra+(y.rb-y.ra)*t);}
/* The middle of the foot: halfway along each foot's capsule from the back of the heel to
   the front of the shoe, both feet averaged (GEN: "over the middle of the foot"). */
function midfoot(sc){
  var parts=sc.parts||bodyParts(sc),o=[0,0,0],n=0;
  parts.forEach(function(p){if(!/^foot\./.test(p.n))return;
    var d=norm(sub(p.b,p.a));o=add(o,mul(add(sub(p.a,mul(d,p.ra)),add(p.b,mul(d,p.rb))),.5));n++;});
  return mul(o,1/n);}

export {bodyParts, skinParts, partVsPart, segSeg, midfoot, BONE_PARTS, LIMBS, SKIN, FOOT, HANDS};

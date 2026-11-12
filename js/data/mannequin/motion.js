/* Bunyan — the mannequin: the pose controller
   Turns an exercise record (records.js) into the figure and its equipment at any moment
   of a repetition. A record gives the movement as poses (keys): its start and end, or
   phases at fractions of it, joined by a spline; the controller moves through them on
   the record's tempo (or a prescribed one), eased the way a controlled repetition is,
   the lift slowest through its sticking region when the family names one; joints may
   lead one another (order); then path constraints make the result obey the lift's
   mechanics (the bar over the middle of the foot, against the legs; a hand on an arc
   about a fixed joint), and where the equipment decides the path (a machine's lever arm
   turning on its pivot), the hands follow the equipment rather than a straight line.
   docs/FIGURE-V3.md 2.3.

     phaseAt(rec, seconds, tempo) where in the repetition: {u, phase, act}. u runs 0
                             (start) to 1 (end); act is how hard the muscles work (for
                             the glow); tempo, the workout's "4-2-1-1" (below)
     poseAt(rec, u)          the pose at u
     sceneAt(rec, u)         what to draw: {pose, J, M, solids}: the joints, every
                             bone's matrix (skin.js) and the equipment's solids
     framePoints(rec)        what the camera must keep in view, over the movement
     repCamera(rec, ...)     the camera the app draws with, fixed for the whole
                             repetition: the body's extent over it fills 75% of the
                             picture
     fitCamera(rec, pts, ...) the camera at a yaw and pitch that keeps it all in the
                             picture
     motionPath(rec, n)      the world path the arrow follows, start to end
     arrowShape(rec, cam..)  the arrow on the picture, set beside the body

   Pure: the same calls give the same figure, in the app and in the offline tool. */
import {V, camera, project} from "./geom.js";
import {joints} from "./rig.js";
import {solve, P0} from "./skin.js";
import {bodyParts, partVsPart, midfoot} from "./capsules.js";
import {props} from "./kit.js";

var add=V.add,sub=V.sub,mul=V.mul,dot=V.dot,cross=V.cross,len=V.len,norm=V.norm,lerp=V.lerp;

/* ---- time ---- */
/* The record's tempo, in seconds: [lift, hold at the end, lower, rest at the start]. */
var TEMPO=[1.0,.3,1.6,.5];
/* A prescribed tempo, as the workout prints it ("Tempo 4-2-1-1", js/ui/views/session.js;
   js/knowledge/acute-variables.js tempo.notation): eccentric / isometric / concentric /
   isometric, the same order whatever the exercise starts with. So 4-2-1-1 is lower 4 s,
   hold 2 s at the end of the lowering, lift 1 s, hold 1 s at the end of the lift. A
   record's u = 0 is the stretched position, where the lowering ends, so as the record's
   [lift, hold at the end, lower, rest at the start]:
     [third number, fourth number, first number, second number].
   An X (as fast as can be done safely) is drawn as XFAST seconds, and a lift or a
   lowering never quicker than MINMOVE, so the figure never snaps. Given as an array of
   four numbers in the same printed order, or the printed string. */
var XFAST=.6,MINMOVE=.4;
function prescribed(tp){
  if(tp==null)return null;
  var a=typeof tp==="string"?(tp.match(/[\dXx.]+(?=-|$)/g)||[]):tp;
  if(!a||a.length<4)return null;
  var v=a.slice(0,4).map(function(x){return x==="X"||x==="x"?XFAST:+x;});
  if(v.some(function(x){return !isFinite(x)||x<0;}))return null;
  return [Math.max(v[2],MINMOVE),v[3],Math.max(v[0],MINMOVE),v[1]];}
function tempoOf(rec,tp){return prescribed(tp)||rec.tempo||TEMPO;}
function cycleOf(rec,tp){var t=tempoOf(rec,tp);return t[0]+t[1]+t[2]+t[3];}
/* Slow out of each end, quickest in the middle. */
function ease(x){return .5-.5*Math.cos(Math.PI*Math.min(Math.max(x,0),1));}
/* The lift with a sticking region (rec.stick = [u0, u1], from the family: where the
   lift is hardest). As speed along the movement, today's ease is pi*sqrt(u(1-u)); this
   multiplies it by g(u), which dips to 1-STICK_DIP through the sticking region and rises
   by up to LOCK_BOOST after it, toward lockout (KB FORCE, force-velocity: slowest where
   the load is hardest to move, quickest once past it). The time to reach u is then
   the integral of 1/speed, which with u = ease(theta) is the integral of dtheta/g:
   tabulated once per record and inverted, so the lift still lasts its tempo exactly.
   With no stick, g = 1 and it is today's ease. GEN constants, for the animation only. */
var STICK_DIP=.5,LOCK_BOOST=.35,LIFT_N=256;
function smooth(a,b,x){var t=Math.min(Math.max((x-a)/(b-a),0),1);return t*t*(3-2*t);}
function liftGain(st,u){
  var w=Math.max(.04,(st[1]-st[0])*.5);
  var inS=smooth(st[0]-w,st[0],u)*(1-smooth(st[1],st[1]+w,u));
  var late=smooth(st[1],st[1]+(1-st[1])*.6,u)*(1-smooth(.9,1,u));
  return (1-STICK_DIP*inS)*(1+LOCK_BOOST*late);}
var LIFTS=new WeakMap();
function liftTable(rec){
  var st=rec.stick,key=st[0]+","+st[1],c=LIFTS.get(rec);
  if(c&&c.key===key)return c.T;
  var T=[0],i;
  for(i=1;i<=LIFT_N;i++){var th=(i-.5)/LIFT_N;T.push(T[i-1]+1/liftGain(st,ease(th))/LIFT_N);}
  for(i=1;i<=LIFT_N;i++)T[i]/=T[LIFT_N];
  LIFTS.set(rec,{key:key,T:T});return T;}
/* u at fraction x of the lift's time */
function liftU(rec,x){
  x=Math.min(Math.max(x,0),1);
  if(!rec.stick)return ease(x);
  var T=liftTable(rec),lo=0,hi=LIFT_N;
  while(hi-lo>1){var m=(lo+hi)>>1;if(T[m]<=x)lo=m;else hi=m;}
  var f=(x-T[lo])/Math.max(T[hi]-T[lo],1e-12);
  return ease((lo+f)/LIFT_N);}
/* Where a repetition is at s seconds: {u, phase, act}. The lift is the working half
   (the press out, the pull in), so the muscles glow hardest there; lowering under
   control works them too. tempo: a prescribed tempo in the workout's order (above);
   left out, the record's own. */
function phaseAt(rec,s,tempo){
  if(keyList(rec).length<2)return {u:0,phase:"hold",act:1};
  var t=tempoOf(rec,tempo),c=t[0]+t[1]+t[2]+t[3],x=((s%c)+c)%c;
  if(x<t[0])return {u:liftU(rec,x/t[0]),phase:"lift",act:1};
  x-=t[0];
  if(x<t[1])return {u:1,phase:"top",act:.9};
  x-=t[1];
  if(x<t[2])return {u:1-ease(x/t[2]),phase:"lower",act:.8};
  return {u:0,phase:"rest",act:.55};}

/* ---- poses ---- */
/* Halfway between two pose values: numbers and points by straight line, sides and other
   records field by field, anything else from the nearer end. Directions (elbows,
   knees, where a hand points) come out unnormalised, which the rig allows. */
function mix(a,b,t){
  if(a==null)return b;
  if(b==null)return a;
  if(typeof a==="number"&&typeof b==="number")return a+(b-a)*t;
  if(Array.isArray(a)&&Array.isArray(b))return a.map(function(v,i){return v+(b[i]-v)*t;});
  if(typeof a==="object"&&typeof b==="object"){
    var o={},k;
    for(k in a)o[k]=mix(a[k],b[k],t);
    for(k in b)if(!(k in o))o[k]=b[k];
    return o;}
  return t<.5?a:b;}
function lerpPose(A,B,t){return mix(A,B,t);}

/* A record's keys as [{at, pose}], at ascending from 0 to 1. keys may be today's
   [start, end] (at 0 and 1), one pose (a hold), or a list of {at, pose}: phases at
   fractions of the repetition (docs/FIGURE-V3.md 2.3). */
function keyList(rec){
  var k=rec&&rec.keys;
  if(!k||!k.length)return [];
  if(k[0]&&k[0].pose&&typeof k[0].at==="number")return k;
  if(k._list)return k._list;
  var L=k.map(function(p,i){return {at:k.length<2?0:i/(k.length-1),pose:p};});
  Object.defineProperty(k,"_list",{value:L,enumerable:false});
  return L;}
/* The weights of the four keys round a segment in a Catmull-Rom spline through keys at
   uneven times (a cubic Hermite whose tangent at each key is the slope between its
   neighbours; at the ends, the slope of the end segment). */
function crWeights(ts,i,u){
  var n=ts.length-1,t0=ts[i],t1=ts[i+1],h=Math.max(t1-t0,1e-9),s=(u-t0)/h;
  var tm=ts[Math.max(i-1,0)],tp=ts[Math.min(i+2,n)];
  var a=h/Math.max(t1-tm,1e-9),b=h/Math.max(tp-t0,1e-9);
  var s2=s*s,s3=s2*s,h00=2*s3-3*s2+1,h10=s3-2*s2+s,h01=-2*s3+3*s2,h11=s3-s2;
  var idx=[Math.max(i-1,0),i,i+1,Math.min(i+2,n)],w=[-h10*a,h00-h11*b,h01+h10*a,h11*b];
  return {idx:idx,w:w,near:s<.5?1:2};}
/* the weighted sum of four pose values, field by field (a value one key leaves out is
   taken from the segment's nearer end that has it) */
function comb(vs,w,near){
  var have=vs.filter(function(v){return v!=null;});
  if(!have.length)return undefined;
  var fill=vs[near]!=null?vs[near]:vs[3-near]!=null?vs[3-near]:have[0];
  vs=vs.map(function(v){return v==null?fill:v;});
  var a=vs[0];
  if(typeof a==="number"&&vs.every(function(v){return typeof v==="number";}))return w[0]*vs[0]+w[1]*vs[1]+w[2]*vs[2]+w[3]*vs[3];
  if(Array.isArray(a)&&vs.every(Array.isArray))return a.map(function(_,j){return comb(vs.map(function(v){return v[j];}),w,near);});
  if(typeof a==="object"&&vs.every(function(v){return typeof v==="object"&&!Array.isArray(v);})){
    var o={},ks={};vs.forEach(function(v){for(var k in v)ks[k]=1;});
    for(var k in ks)o[k]=comb(vs.map(function(v){return v[k];}),w,near);
    return o;}
  return vs[near];}
/* The keys blended at u: two keys exactly as they always have been (mix); more by
   Catmull-Rom through them. */
function blend(rec,u){
  var L=keyList(rec);
  if(L.length<2)return mix(L[0].pose,null,0);
  if(L.length===2&&L[0].at===0&&L[1].at===1)return lerpPose(L[0].pose,L[1].pose,u);
  u=Math.min(Math.max(u,L[0].at),L[L.length-1].at);
  var ts=L.map(function(k){return k.at;}),i=0;
  while(i<L.length-2&&u>ts[i+1])i++;
  var c=crWeights(ts,i,u);
  return comb(c.idx.map(function(j){return L[j].pose;}),c.w,c.near);}

/* Which joint leads (rec.order, docs/FIGURE-V3.md 2.3): each named part of the pose
   moves on its own clock, a warp of u, so the first reaches its end early and the last
   starts late (a deadlift: the knees straighten with the back's angle held, then the
   hips come through). A part names the pose fields that move it: the knees are driven
   by where the pelvis is (the feet stay put), the hips by the trunk's angles. order is
   a list (in order, each over a span of ORDER_SPAN of the repetition for two parts,
   spread evenly) or {part: [from, to]}. Each warp is a smoothstep over its span, so no
   part starts or stops with a jump. Lowering runs the same warps backwards: the last
   to arrive is the first to leave. */
var PARTS={knees:["pelvis","knees"],hips:["pitch","yaw","roll","twist","bend","lean","axes"],head:["head","look"],
  hands:["hands","handDir","palm","elbows","grip"],shoulders:["shrug","reach"],feet:["feet","footDir","sole","toes"]};
function orderSpans(order){
  if(!order)return null;
  if(!Array.isArray(order))return order;
  var n=order.length,o={};if(n<2)return null;
  var D=(1+.24*(n-1))/n;
  order.forEach(function(p,i){var s=i*(1-D)/(n-1);o[p]=[s,s+D];});
  return o;}
function warp(span,u){return smooth(span[0],span[1],u);}
function blendOrdered(rec,u){
  var sp=orderSpans(rec.order),p=blend(rec,u);
  if(!sp)return p;
  for(var part in sp){
    var q=blend(rec,warp(sp[part],u));
    (PARTS[part]||[part]).forEach(function(f){if(q[f]!==undefined)p[f]=q[f];else delete p[f];});}
  return p;}

/* A rigid arc from a to b: the circle through both whose centre is the pivot. The pivot
   is found on the plane halfway between them, toward side (from the chord's middle) by
   reach, so the two ends are the same distance from it and the arm never stretches.
   Returns {pivot, at(t)}. */
function arc(a,b,side,reach){
  var mid=lerp(a,b,.5),ch=norm(sub(b,a)),sd=norm(sub(side,mul(ch,dot(side,ch))));
  var P=add(mid,mul(sd,reach)),ra=sub(a,P),rb=sub(b,P);
  var k=cross(ra,rb),kl=len(k),ang=Math.atan2(kl,dot(ra,rb));
  k=kl<1e-9?[0,0,1]:mul(k,1/kl);
  return {pivot:P,radius:len(ra),axis:k,angle:ang,at:function(t){
    var th=ang*t,c=Math.cos(th),s=Math.sin(th);
    return add(P,add(add(mul(ra,c),mul(cross(k,ra),s)),mul(k,dot(k,ra)*(1-c))));}};}

/* ---- path constraints (docs/FIGURE-V3.md 2.3) ----
   Applied after the keys are blended and the equipment has placed the hands (drive),
   so the result obeys the lift's mechanics whatever the blend does. A record asks for
   them by path: {track, rule} or a list of them, applied in order:
     overMidfoot      the tracked bar (track "bar": halfway between the hands' grips) is
                      put over the middle of the feet (capsules.js midfoot), within
                      MIDFOOT_TOL; the pelvis and the hands move together by the
                      difference, so the hands stay on the bar and the feet, which are
                      targets on the floor, stay planted
     touch:<parts>    the bar is brought to within TOUCH_TOL of the nearest of the
                      named body parts' surfaces (capsules.js: "shin", "thigh",
                      "shin+thigh"...) by moving the hands along the floor (the arms
                      swing a little on the shoulders); with overMidfoot before it,
                      never further than MIDFOOT_TOL from the middle of the foot
     arcAbout:<joint> the tracked hand ("wr.l", "wr.r", or "hands" for both) keeps the
                      distance it has at u = 0 from where the joint ("el", "sh") is at
                      u = 0, and an elbow pivot stays where it is (curls, push-downs,
                      raises)
     onLever          the machines' grips on their arcs: the drive of records.js does it
                      already, so this names it and changes nothing
   Each is a pure function (pose, J, ctx) -> pose, with ctx = {rec, start}. The
   tolerances are modelling constants for the animation and its tests (GEN). */
var MIDFOOT_TOL=.02,TOUCH_TOL=.01,BAR_R=.014;
function barOf(J){return lerp(J.grip.l,J.grip.r,.5);}
/* move the body above the feet by dx along the floor: the pelvis and the hands */
function shiftUpper(p,d){
  p.pelvis=add(p.pelvis||P0,d);
  if(p.hands){var h={};for(var s in p.hands)h[s]=add(p.hands[s],d);p.hands=h;}
  return p;}
function overMidfoot(p,J,ctx){
  var m=midfoot({J:J,M:solve(p).M}),b=barOf(J),dx=m[0]-b[0];
  ctx.band=[m[0]-MIDFOOT_TOL,m[0]+MIDFOOT_TOL];
  if(Math.abs(dx)<1e-9)return p;
  return shiftUpper(p,[dx,0,0]);}
function partsNamed(spec){return spec.split("+");}
/* the bar's clearance to the named parts (negative: into them) */
function barGap(p,names){
  var sc=solve(p),J=sc.J,a=J.grip.l,b=J.grip.r,bar={a:a,b:b,ra:BAR_R,rb:BAR_R},best=1e9;
  bodyParts(sc).forEach(function(c){var nm=c.n.replace(/\.[lr]$/,"");if(names.indexOf(nm)>=0)best=Math.min(best,partVsPart(bar,c));});
  return best;}
/* the hands moved along the floor by d, each swung on its shoulder (J's) so it keeps
   its distance from it: the arm stays as long as it was, the hand rising a little */
function swingHands(p,J,d){
  if(!p.hands)return p;
  var h={};
  for(var s in p.hands){
    var o=p.hands[s],sh=J.sh[s],r=len(sub(o,sh)),n=add(o,d),dx=n[0]-sh[0],dz=n[2]-sh[2],hz=r*r-dx*dx-dz*dz;
    h[s]=hz>0?[n[0],sh[1]+(o[1]<sh[1]?-1:1)*Math.sqrt(hz),n[2]]:n;}
  p.hands=h;return p;}
function touch(p,J,ctx,spec){
  var names=partsNamed(spec),q=p,x=0,g=barGap(q,names),band=ctx.band;
  var bx=barOf(J)[0];
  /* the bar is moved toward the legs along the floor by the gap, a few steps (the gap
     changes about one for one with the bar's x): the hands move with it and the arms
     swing a little on the shoulders; never out of the middle of the foot's band */
  for(var it=0;it<6&&Math.abs(g)>TOUCH_TOL*.25;it++){
    var nx=x-g;
    if(band)nx=Math.min(Math.max(nx,band[0]-bx),band[1]-bx);
    if(Math.abs(nx-x)<1e-6)break;
    q=swingHands(Object.assign({},p),J,[nx,0,0]);x=nx;g=barGap(q,names);}
  ctx.gap=g;
  return q;}
var ARC_J={el:function(J,s){return J.el[s];},sh:function(J,s){return J.sh[s];},wr:function(J,s){return J.wr[s];}};
function arcAbout(p,J,ctx,joint,sides){
  var J0=ctx.start,f=ARC_J[joint];
  if(!f||!J0||!p.hands)return p;
  p.hands=Object.assign({},p.hands);p.elbows=Object.assign({},p.elbows);
  sides.forEach(function(s){
    if(!p.hands[s])return;
    var c=f(J0,s),r=len(sub(J0.wr[s],c)),d=sub(p.hands[s],c),dl=len(d);
    if(dl<1e-9)return;
    p.hands[s]=add(c,mul(d,r/dl));
    /* an elbow that is the pivot stays there: its hint points at it */
    if(joint==="el")p.elbows[s]=sub(c,lerp(J.sh[s],p.hands[s],.5));});
  return p;}
function rulesOf(rec){var r=rec.path;return !r?[]:Array.isArray(r)?r:[r];}
/* The rules in order; when a touch and overMidfoot are both asked for they pull on
   each other (the bar brought to the legs moves it off the middle of the foot; the body
   moved back over the foot moves the legs), so the list is applied PASSES times, the
   touch kept inside the middle of the foot's band once it is known, and a last
   overMidfoot leaves the bar exactly over it. */
var PASSES=5;
function constrain(rec,p,u){
  var rules=rulesOf(rec);
  if(!rules.length)return p;
  var ctx={rec:rec,u:u},both=rules.some(function(r){return r.rule==="overMidfoot";})&&rules.some(function(r){return /^touch:/.test(r.rule);});
  function apply(r){
    var J=solve(p).J,rule=String(r.rule||""),arg=rule.indexOf(":")>=0?rule.slice(rule.indexOf(":")+1):"";
    if(rule==="overMidfoot")p=overMidfoot(p,J,ctx);
    else if(/^touch:/.test(rule))p=touch(p,J,ctx,arg);
    else if(/^arcAbout:/.test(rule)){
      if(!ctx.start)ctx.start=startJoints(rec);
      var tr=r.track||"hands",sides=tr==="hands"?["l","r"]:/\.[lr]$/.test(tr)?[tr.slice(-1)]:["l","r"];
      p=arcAbout(p,J,ctx,arg,sides);}}
  for(var k=0;k<(both?PASSES:1);k++)rules.forEach(apply);
  return p;}
/* the joints at u = 0 before any constraint: the fixed pivots */
var STARTS=new WeakMap();
function startJoints(rec){
  if(STARTS.has(rec))return STARTS.get(rec);
  var p=blendOrdered(rec,0);p.spine=p.spine||rec.spine;if(rec.drive)rec.drive(p,0,rec);
  var J=solve(p).J;STARTS.set(rec,J);return J;}

/* The pose at u. The keys blended (and warped by order); the record's spine mode; the
   equipment's drive (a lever's grip on its arc); then the path constraints. */
function poseAt(rec,u){
  var p=blendOrdered(rec,u);
  if(rec.spine&&p.spine==null)p.spine=rec.spine;
  if(rec.drive)rec.drive(p,u,rec);
  return constrain(rec,p,u);}
/* What to draw at u: the body (its joints J and its bones' matrices M) and the
   equipment placed from where the body is (a handle in the hand, a pad behind the
   back), as solids (kit.js). faults: what the solver could not do (skin.js). */
function sceneAt(rec,u){
  var pose=poseAt(rec,u),r=solve(pose),list=rec.equip?rec.equip(r.J,u,rec):[];
  return {pose:pose,J:r.J,M:r.M,solids:props(list),faults:r.faults};}

/* ---- the picture ---- */
/* The body as spheres round its joints, for the camera and the arrow: what has to stay
   in the picture and what an arrow must not cover. */
function bodySpheres(J){
  var out=[[J.head,.13],[J.neck,.09],[J.P,.16],[V.lerp(J.neck,J.P,.45),.17]];
  ["l","r"].forEach(function(s){
    out.push([J.sh[s],.09],[J.el[s],.06],[J.wr[s],.05],[J.grip[s],.055],[V.lerp(J.sh[s],J.el[s],.5),.07],[V.lerp(J.el[s],J.wr[s],.5),.055],
      [J.hip[s],.1],[V.lerp(J.hip[s],J.kn[s],.5),.09],[J.kn[s],.07],[V.lerp(J.kn[s],J.an[s],.5),.065],[J.an[s],.06],
      [add(J.an[s],mul(J.fd[s].dir,.16)),.05]);});
  return out;}
/* Everything the camera has to keep in view over the whole movement: the body at five
   moments and the equipment (its solids, a little inside their bounds; not scenery, a
   frame marked bg), with the middle
   and size of it all, and where the feet stand (the floor's pool of light). */
function framePoints(rec){
  var list=[],feet=[];
  [0,.25,.5,.75,1].forEach(function(u){
    var sc=sceneAt(rec,u);
    bodySpheres(sc.J).forEach(function(b){list.push([b[0][0],b[0][1],b[0][2],b[1]]);});
    sc.solids.forEach(function(q){if(!q.bg)list.push([q.c[0],q.c[1],q.c[2],q.r*.7]);});
    feet.push(sc.J.an.l,sc.J.an.r,sc.J.P);});
  var lo=[1e9,1e9,1e9],hi=[-1e9,-1e9,-1e9];
  list.forEach(function(q){for(var k=0;k<3;k++){lo[k]=Math.min(lo[k],q[k]-q[3]);hi[k]=Math.max(hi[k],q[k]+q[3]);}});
  lo[1]=Math.min(lo[1],0);
  var center=mul(add(lo,hi),.5),radius=len(sub(hi,lo))/2;
  var fl=[1e9,1e9],fh=[-1e9,-1e9];
  feet.forEach(function(q){fl[0]=Math.min(fl[0],q[0]);fh[0]=Math.max(fh[0],q[0]);fl[1]=Math.min(fl[1],q[2]);fh[1]=Math.max(fh[1],q[2]);});
  return {list:list,lo:lo,hi:hi,center:center,radius:radius,
    foot:[(fl[0]+fh[0])/2,(fl[1]+fh[1])/2,Math.max((fh[0]-fl[0])*.75,.55),Math.max((fh[1]-fl[1])*.75,.5)]};}
/* What the camera keeps in view (docs/FIGURE-V3.md 2.2, framing): the body over the
   whole repetition (at REP_N moments) and what is in its hands or under its feet (a
   dumbbell, a handle: the small solids within reach of a hand's grip or an ankle). The
   rest of the equipment may be cropped where it reaches past the body (a machine's
   tower, the far end of a bar, a bench's legs). nb: how many of the points are the
   body's. Worked out once per record. */
var HELD_R=.25,HELD_NEAR=.05,REP_N=11,REPS=new WeakMap();
function repPoints(rec){
  if(REPS.has(rec))return REPS.get(rec);
  var body=[],held=[];
  for(var i=0;i<REP_N;i++){
    var sc=sceneAt(rec,i/(REP_N-1)),J=sc.J,ends=[J.grip.l,J.grip.r,J.an.l,J.an.r];
    bodySpheres(J).forEach(function(b){body.push([b[0][0],b[0][1],b[0][2],b[1]]);});
    sc.solids.forEach(function(q){
      if(q.bg||q.r>HELD_R)return;
      if(ends.some(function(e){return len(sub(q.c,e))<q.r*.8+HELD_NEAR;}))held.push([q.c[0],q.c[1],q.c[2],q.r*.7]);});}
  var list=body.concat(held),lo=[1e9,1e9,1e9],hi=[-1e9,-1e9,-1e9];
  list.forEach(function(q){for(var k=0;k<3;k++){lo[k]=Math.min(lo[k],q[k]-q[3]);hi[k]=Math.max(hi[k],q[k]+q[3]);}});
  var r={list:list,nb:body.length,lo:lo,hi:hi,center:mul(add(lo,hi),.5),radius:len(sub(hi,lo))/2};
  REPS.set(rec,r);return r;}
/* The camera at yaw and pitch (degrees; yaw 0 looks at the figure's front, 90 at its
   left) that keeps everything in pts inside the picture with a margin (the largest
   distance from the picture's middle to its edge, 1 the edge itself): aimed at the
   middle of it all, as close as it can be. The aim does not move with the turn and the
   distance changes smoothly with it, so turning never jumps. zoom brings it nearer (<1)
   or further (>1). */
function fitCamera(rec,pts,aspect,yaw,pitch,zoom,margin){
  var c=rec.cam||{},fov=c.fov||28,target=pts.center;
  margin=margin||c.margin||.86;
  if(c.target)target=add(target,c.target);
  var a=.5,b=40,L=pts.list;
  for(var it=0;it<28;it++){
    var d=(a+b)/2,cam=camera(target,d,yaw,pitch,fov,aspect),m=0;
    for(var i=0;i<L.length;i++){
      var q=L[i],pr=project(cam,q);
      if(pr[2]<=.05){m=9;break;}
      var rx=q[3]/pr[2]/cam.tx,ry=q[3]/pr[2]/cam.ty;
      m=Math.max(m,Math.abs(pr[0])+rx,Math.abs(pr[1])+ry);}
    if(m>margin)a=d;else b=d;}
  return camera(target,b*(c.zoom||1)*(zoom||1),yaw,pitch,fov,aspect);}
/* The picture: one camera for the whole repetition, so nothing moves it during
   playback. The body's extent over the repetition (repPoints) fills FILL of the
   picture in the direction it is largest (its height standing, its length lying
   down), centred. Fitted, then aimed at the middle of the box that extent makes on the
   picture and brought nearer or further until it fills FILL (perspective makes the
   first fit a little loose); what is in the hands stays inside the picture. */
var FILL=.75;
function boxOf(cam,L){
  var lo=[9,9],hi=[-9,-9],ok=true;
  L.forEach(function(q){var pr=project(cam,q);if(pr[2]<=.05){ok=false;return;}var rx=q[3]/pr[2]/cam.tx,ry=q[3]/pr[2]/cam.ty;
    lo[0]=Math.min(lo[0],pr[0]-rx);hi[0]=Math.max(hi[0],pr[0]+rx);lo[1]=Math.min(lo[1],pr[1]-ry);hi[1]=Math.max(hi[1],pr[1]+ry);});
  return {lo:lo,hi:hi,ok:ok};}
function repCamera(rec,aspect,yaw,pitch,zoom){
  var pts=repPoints(rec),c=rec.cam||{},fov=c.fov||28,cam=fitCamera(rec,pts,aspect,yaw,pitch,1,FILL);
  var body=pts.list.slice(0,pts.nb),target=cam.target,dist=cam.dist;
  for(var it=0;it<4;it++){
    var b=boxOf(cam,body),all=boxOf(cam,pts.list);
    if(!b.ok)break;
    var cx=(b.lo[0]+b.hi[0])/2,cy=(b.lo[1]+b.hi[1])/2,f=Math.max((b.hi[0]-b.lo[0])/2,(b.hi[1]-b.lo[1])/2);
    var g=Math.max(Math.abs(all.lo[0]-cx),Math.abs(all.hi[0]-cx),Math.abs(all.lo[1]-cy),Math.abs(all.hi[1]-cy))/.98;
    target=add(target,add(mul(cam.r,cx*dist*cam.tx),mul(cam.u,cy*dist*cam.ty)));
    dist*=Math.max(f/FILL,g);
    cam=camera(target,dist,yaw,pitch,fov,aspect);}
  return camera(target,dist*(c.zoom||1)*(zoom||1),yaw,pitch,fov,aspect);}
/* How much of the picture the body fills through cam: {h, w} as fractions of the
   picture's height and width, fill the larger, inside whether it is all in the
   picture. At moment u, or over the whole repetition (its REP_N moments) when u is
   left out. */
function bodyFill(rec,u,cam){
  var lo=[9,9],hi=[-9,-9],us=[];
  if(u!=null)us=[u];else for(var i=0;i<REP_N;i++)us.push(i/(REP_N-1));
  us.forEach(function(v){bodySpheres(sceneAt(rec,v).J).forEach(function(b){var q=project(cam,b[0]),rx=b[1]/q[2]/cam.tx,ry=b[1]/q[2]/cam.ty;
    lo[0]=Math.min(lo[0],q[0]-rx);hi[0]=Math.max(hi[0],q[0]+rx);lo[1]=Math.min(lo[1],q[1]-ry);hi[1]=Math.max(hi[1],q[1]+ry);});});
  var w=(Math.min(hi[0],1)-Math.max(lo[0],-1))/2,h=(Math.min(hi[1],1)-Math.max(lo[1],-1))/2;
  return {w:w,h:h,fill:Math.max(w,h),inside:lo[0]>=-1&&hi[0]<=1&&lo[1]>=-1&&hi[1]<=1};}
/* The record's own view, for the offline tools and the tests: the camera the app
   draws with (repCamera; an o.u changes nothing: the camera is the same at every
   moment), or with o.all everything over the movement, equipment included. */
function framing(rec,aspect,yaw,pitch,o){
  var c=rec.cam||{};
  yaw=yaw!=null?yaw:c.yaw!=null?c.yaw:60;pitch=pitch!=null?pitch:c.pitch!=null?c.pitch:8;
  if(o&&o.all)return fitCamera(rec,framePoints(rec),aspect,yaw,pitch,1);
  return repCamera(rec,aspect,yaw,pitch,1);}

/* The way the exercise moves, for its arrow: n+1 points from start to end along the
   path of what the record tracks (by default whichever of the hands, feet, knees or
   hips travels furthest). side picks the hand or foot nearer the camera when both move
   alike. */
var TRACK={"wr.l":function(J){return J.wr.l;},"wr.r":function(J){return J.wr.r;},
  "an.l":function(J){return J.an.l;},"an.r":function(J){return J.an.r;},
  "kn.l":function(J){return J.kn.l;},"kn.r":function(J){return J.kn.r;},P:function(J){return J.P;},
  "sh.l":function(J){return J.sh.l;},"sh.r":function(J){return J.sh.r;},"el.l":function(J){return J.el.l;},
  "el.r":function(J){return J.el.r;},head:function(J){return J.head;}};
var PATHS=new WeakMap();
function motionPath(rec,n,side){
  if(keyList(rec).length<2)return [];
  n=n||16;
  var ck=n+"|"+(side||""),pc=PATHS.get(rec)||{};
  if(pc[ck])return pc[ck];
  var res=motionPathRaw(rec,n,side);pc[ck]=res;PATHS.set(rec,pc);return res;}
function motionPathRaw(rec,n,side){
  var Js=[],i,k;
  for(i=0;i<=n;i++)Js.push(joints(poseAt(rec,i/n)));
  var key=rec.arrow&&rec.arrow.track;
  if(!TRACK[key])key=null;
  if(!key){
    var best=null,bl=0;
    for(k in TRACK){var s=0;for(i=1;i<=n;i++)s+=len(sub(TRACK[k](Js[i]),TRACK[k](Js[i-1])));if(s>bl){bl=s;best=k;}}
    if(!best||bl<.06)return [];
    key=best;}
  if(side&&/\.[lr]$/.test(key))key=key.slice(0,-1)+side;
  return Js.map(function(J){return TRACK[key](J);});}

/* the body at both ends of the movement, as spheres, once per record */
var ENDS=new WeakMap();
function endSpheres(rec){
  if(!ENDS.has(rec))ENDS.set(rec,[0,1].map(function(u){return bodySpheres(joints(poseAt(rec,u)));}));
  return ENDS.get(rec);}
/* The arrow on a w x h picture, in pixels with y up (as the graphics card counts them):
   the path of the moving hand (or foot) nearer the camera, the middle three quarters
   of it, on the path or just beside it (at most ARROW_OFF pixels at 720 wide). Of
   those few places it takes the one that covers least of the figure at the start and
   the end,
   with the body's solids standing in for the figure as circles on the picture
   (tools/images.py places the stills' arrows the same way, on their pixels). The head
   is at the end of the lift. Sizes scale with the picture, from a 720-pixel design.
   Returns {body: [[x, y]...], head: [[x, y] x 3]}, or null when nothing moves enough
   to draw. */
var ARROW_OFF=26;
function arrowShape(rec,cam,w,h,hl){
  var near=cam.p[2]>=0?"l":"r",world=motionPath(rec,16,near);
  if(world.length<2)return null;
  var S=w/720,px=function(q){var pr=project(cam,q);return [(pr[0]+1)/2*w,(pr[1]+1)/2*h];};
  var P=world.map(px),seg=[0],L=0,i,j,k;
  /* smoothed, so a path that wavers on the picture draws as one clean curve */
  for(k=0;k<3;k++)P=P.map(function(p,n){if(!n||n===P.length-1)return p;
    return [(P[n-1][0]+2*p[0]+P[n+1][0])/4,(P[n-1][1]+2*p[1]+P[n+1][1])/4];});
  for(i=1;i<P.length;i++){L+=Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]);seg.push(L);}
  if(L<18*S)return null;
  /* the middle of the path, evenly spaced */
  var a=L*.12,b=L*.88,q=[];
  for(i=0;i<=20;i++){
    var s=a+(b-a)*i/20;j=1;while(j<seg.length-1&&seg[j]<s)j++;
    var f=(s-seg[j-1])/Math.max(seg[j]-seg[j-1],1e-6);
    q.push([P[j-1][0]+(P[j][0]-P[j-1][0])*f,P[j-1][1]+(P[j][1]-P[j-1][1])*f]);}
  var span=b-a,min=46*S,c0=[0,0];
  q.forEach(function(p){c0[0]+=p[0]/q.length;c0[1]+=p[1]/q.length;});
  if(span<min)q=q.map(function(p){return [c0[0]+(p[0]-c0[0])*min/span,c0[1]+(p[1]-c0[1])*min/span];});
  /* the figure, as circles, at both ends of the movement, with a little room round them */
  var disc=[];
  endSpheres(rec).forEach(function(sp){sp.forEach(function(b){
    var pr=project(cam,b[0]);
    disc.push([(pr[0]+1)/2*w,(pr[1]+1)/2*h,b[1]*1.1/pr[2]/cam.tx*w/2]);});});
  var fc=[0,0];disc.forEach(function(d){fc[0]+=d[0]/disc.length;fc[1]+=d[1]/disc.length;});
  function cover(r){
    var n=0;
    r.forEach(function(p){
      if(p[0]<14*S||p[0]>w-14*S||p[1]<14*S||p[1]>h-14*S){n+=3;return;}
      for(var k=0;k<disc.length;k++){var d=disc[k],rr=d[2]+4*S;if((p[0]-d[0])*(p[0]-d[0])+(p[1]-d[1])*(p[1]-d[1])<rr*rr){n++;return;}}});
    return n;}
  /* the places it might go */
  var nrm=q.map(function(p,k){
    var A=q[Math.max(k-1,0)],B=q[Math.min(k+1,q.length-1)],tx=B[0]-A[0],ty=B[1]-A[1],l=Math.hypot(tx,ty)||1;
    return [-ty/l,tx/l];});
  var cands=[];
  /* on the path or just beside it, never further than ARROW_OFF: the arrow shows where
     the tracked point really goes (an arrow pushed off to an empty part of the picture,
     or along its own line past the end, drew the seated row's at the foot plate) */
  [0,10,18,ARROW_OFF,-10,-18,-ARROW_OFF].forEach(function(d){
    cands.push([q.map(function(p,k){return [p[0]+nrm[k][0]*d*S,p[1]+nrm[k][1]*d*S];}),Math.abs(d)*.08]);});
  /* an offset copy on the inside of a tight curve folds up on itself: not an arrow */
  function lenOf(r){var l=0;for(var n=1;n<r.length;n++)l+=Math.hypot(r[n][0]-r[n-1][0],r[n][1]-r[n-1][1]);return l;}
  var ql=lenOf(q);
  cands=cands.filter(function(cd){return lenOf(cd[0])>=ql*.7;});
  var best=null;
  cands.forEach(function(cd){
    var r=cd[0],m=[0,0];r.forEach(function(p){m[0]+=p[0]/r.length;m[1]+=p[1]/r.length;});
    var away=-Math.sign((m[0]-fc[0])*(m[0]-c0[0])+(m[1]-fc[1])*(m[1]-c0[1]));
    /* covering a little of the figure is better than an arrow off on its own */
    var score=cover(r)*1.5+cd[1]+away*.5;
    if(!best||score<best[0])best=[score,r];});
  var r=best[1],e=r[r.length-1],pv=r[r.length-3],tx=e[0]-pv[0],ty=e[1]-pv[1],k=Math.hypot(tx,ty)||1;
  tx/=k;ty/=k;
  var nx=-ty,ny=tx;
  return {body:r.slice(0,-1).concat([[e[0]-tx*9*S,e[1]-ty*9*S]]),
    head:[[e[0]+tx*3*S,e[1]+ty*3*S],[e[0]-tx*11*S+nx*7*S,e[1]-ty*11*S+ny*7*S],[e[0]-tx*11*S-nx*7*S,e[1]-ty*11*S-ny*7*S]]};}

export {TEMPO, XFAST, MINMOVE, MIDFOOT_TOL, TOUCH_TOL, PARTS, ease, prescribed, tempoOf, liftU, liftGain, cycleOf, phaseAt, mix, lerpPose, keyList, crWeights, blend, orderSpans, warp, blendOrdered, overMidfoot, touch, barGap, arcAbout, constrain, arc, poseAt, sceneAt, bodySpheres, framePoints, repPoints, fitCamera, repCamera, bodyFill, FILL, framing, motionPath, arrowShape, ARROW_OFF};

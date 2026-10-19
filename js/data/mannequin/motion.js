/* Bunyan — the mannequin: the pose controller
   Turns an exercise record (records.js) into the figure and its equipment at any moment
   of a repetition. A record gives the start and end of the movement as two poses
   (keys); the controller moves between them on the record's tempo, eased the way a
   controlled repetition is (slow out of each end, quickest through the middle), and
   where the equipment decides the path (a machine's lever arm turning on its pivot),
   the hands follow the equipment rather than a straight line.

     phaseAt(rec, seconds)   where in the repetition: {u, phase, act}. u runs 0 (start)
                             to 1 (end); act is how hard the muscles work (for the glow)
     poseAt(rec, u)          the pose at u
     sceneAt(rec, u)         what to draw: {pose, J, M, solids}: the joints, every
                             bone's matrix (skin.js) and the equipment's solids
     framePoints(rec)        what the camera must keep in view, over the movement
     fitCamera(rec, pts, ...) the camera at a yaw and pitch that keeps it all in the
                             picture
     motionPath(rec, n)      the world path the arrow follows, start to end
     arrowShape(rec, cam..)  the arrow on the picture, set beside the body

   Pure: the same calls give the same figure, in the app and in the offline tool. */
import {V, camera, project} from "./geom.js";
import {joints} from "./rig.js";
import {solve} from "./skin.js";
import {props} from "./kit.js";

var add=V.add,sub=V.sub,mul=V.mul,dot=V.dot,cross=V.cross,len=V.len,norm=V.norm,lerp=V.lerp;

/* ---- time ---- */
/* The record's tempo, in seconds: [lift, hold at the end, lower, rest at the start]. */
var TEMPO=[1.0,.3,1.6,.5];
function tempoOf(rec){return rec.tempo||TEMPO;}
function cycleOf(rec){var t=tempoOf(rec);return t[0]+t[1]+t[2]+t[3];}
/* Slow out of each end, quickest in the middle. */
function ease(x){return .5-.5*Math.cos(Math.PI*Math.min(Math.max(x,0),1));}
/* Where a repetition is at s seconds. The lift is the working half (the press out, the
   pull in), so the muscles glow hardest there; lowering under control works them too. */
function phaseAt(rec,s){
  if(!rec.keys||rec.keys.length<2)return {u:0,phase:"hold",act:1};
  var t=tempoOf(rec),c=cycleOf(rec),x=((s%c)+c)%c;
  if(x<t[0])return {u:ease(x/t[0]),phase:"lift",act:1};
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

/* The pose at u. A record whose hands are driven by its equipment (drive) gets them
   from there; the rest of the body moves between the keys. */
function poseAt(rec,u){
  var keys=rec.keys,p=keys.length<2?mix(keys[0],null,0):lerpPose(keys[0],keys[1],u);
  if(rec.drive)rec.drive(p,u,rec);
  return p;}
/* What to draw at u: the body (its joints J and its bones' matrices M) and the
   equipment placed from where the body is (a handle in the hand, a pad behind the
   back), as solids (kit.js). */
function sceneAt(rec,u){
  var pose=poseAt(rec,u),r=solve(pose),list=rec.equip?rec.equip(r.J,u,rec):[];
  return {pose:pose,J:r.J,M:r.M,solids:props(list)};}

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
   moments and the equipment (its solids, a little inside their bounds), with the middle
   and size of it all, and where the feet stand (the floor's pool of light). */
function framePoints(rec){
  var list=[],feet=[];
  [0,.25,.5,.75,1].forEach(function(u){
    var sc=sceneAt(rec,u);
    bodySpheres(sc.J).forEach(function(b){list.push([b[0][0],b[0][1],b[0][2],b[1]]);});
    sc.solids.forEach(function(q){list.push([q.c[0],q.c[1],q.c[2],q.r*.7]);});
    feet.push(sc.J.an.l,sc.J.an.r,sc.J.P);});
  var lo=[1e9,1e9,1e9],hi=[-1e9,-1e9,-1e9];
  list.forEach(function(q){for(var k=0;k<3;k++){lo[k]=Math.min(lo[k],q[k]-q[3]);hi[k]=Math.max(hi[k],q[k]+q[3]);}});
  lo[1]=Math.min(lo[1],0);
  var center=mul(add(lo,hi),.5),radius=len(sub(hi,lo))/2;
  var fl=[1e9,1e9],fh=[-1e9,-1e9];
  feet.forEach(function(q){fl[0]=Math.min(fl[0],q[0]);fh[0]=Math.max(fh[0],q[0]);fl[1]=Math.min(fl[1],q[2]);fh[1]=Math.max(fh[1],q[2]);});
  return {list:list,lo:lo,hi:hi,center:center,radius:radius,
    foot:[(fl[0]+fh[0])/2,(fl[1]+fh[1])/2,Math.max((fh[0]-fl[0])*.75,.55),Math.max((fh[1]-fl[1])*.75,.5)]};}
/* The camera at yaw and pitch (degrees; yaw 0 looks at the figure's front, 90 at its
   left) that keeps everything in pts inside the picture with a margin: aimed at the
   middle of it all, as close as it can be. The aim does not move with the turn and the
   distance changes smoothly with it, so turning never jumps. zoom brings it nearer (<1)
   or further (>1). */
function fitCamera(rec,pts,aspect,yaw,pitch,zoom){
  var c=rec.cam||{},fov=c.fov||28,margin=c.margin||.86,target=pts.center;
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
/* The old single framing, for the offline tools: the record's own view. */
function framing(rec,aspect,yaw,pitch,o){
  var c=rec.cam||{};
  return fitCamera(rec,framePoints(rec),aspect,yaw!=null?yaw:c.yaw!=null?c.yaw:60,pitch!=null?pitch:c.pitch!=null?c.pitch:8,1);}

/* The way the exercise moves, for its arrow: n+1 points from start to end along the
   path of what the record tracks (by default whichever of the hands, feet, knees or
   hips travels furthest). side picks the hand or foot nearer the camera when both move
   alike. */
var TRACK={"wr.l":function(J){return J.wr.l;},"wr.r":function(J){return J.wr.r;},
  "an.l":function(J){return J.an.l;},"an.r":function(J){return J.an.r;},
  "kn.l":function(J){return J.kn.l;},"kn.r":function(J){return J.kn.r;},P:function(J){return J.P;}};
function motionPath(rec,n,side){
  if(!rec.keys||rec.keys.length<2)return [];
  n=n||16;
  var Js=[],i,k;
  for(i=0;i<=n;i++)Js.push(joints(poseAt(rec,i/n)));
  var key=rec.arrow&&rec.arrow.track;
  if(!key){
    var best=null,bl=0;
    for(k in TRACK){var s=0;for(i=1;i<=n;i++)s+=len(sub(TRACK[k](Js[i]),TRACK[k](Js[i-1])));if(s>bl){bl=s;best=k;}}
    if(!best||bl<.06)return [];
    key=best;}
  if(side&&/\.[lr]$/.test(key))key=key.slice(0,-1)+side;
  return Js.map(function(J){return TRACK[key](J);});}

/* The arrow on a w x h picture, in pixels with y up (as the graphics card counts them):
   the path of the moving hand (or foot) nearer the camera, the middle three quarters
   of it, set beside the body rather than across it. Of a few places (pushed out to
   either side of the path, or just ahead of where the movement ends or behind where it
   starts) it takes the one that covers least of the figure at the start and the end,
   with the body's solids standing in for the figure as circles on the picture
   (tools/images.py places the stills' arrows the same way, on their pixels). The head
   is at the end of the lift. Sizes scale with the picture, from a 720-pixel design.
   Returns {body: [[x, y]...], head: [[x, y] x 3]}, or null when nothing moves enough
   to draw. */
function arrowShape(rec,cam,w,h,hl){
  var near=cam.p[2]>=0?"l":"r",world=motionPath(rec,16,near);
  if(world.length<2)return null;
  var S=w/720,px=function(q){var pr=project(cam,q);return [(pr[0]+1)/2*w,(pr[1]+1)/2*h];};
  var P=world.map(px),seg=[0],L=0,i,j;
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
  [0,1].forEach(function(u){bodySpheres(joints(poseAt(rec,u))).forEach(function(b){
    var pr=project(cam,b[0]);
    disc.push([(pr[0]+1)/2*w,(pr[1]+1)/2*h,b[1]*1.1/pr[2]/cam.tx*w/2]);});});
  var fc=[0,0];disc.forEach(function(d){fc[0]+=d[0]/disc.length;fc[1]+=d[1]/disc.length;});
  function cover(r){
    var n=0;
    r.forEach(function(p){
      if(p[0]<14*S||p[0]>w-14*S||p[1]<14*S||p[1]>h-14*S){n+=3;return;}
      for(var k=0;k<disc.length;k++){var d=disc[k],rr=d[2]+8*S;if((p[0]-d[0])*(p[0]-d[0])+(p[1]-d[1])*(p[1]-d[1])<rr*rr){n++;return;}}});
    return n;}
  /* the places it might go */
  var nrm=q.map(function(p,k){
    var A=q[Math.max(k-1,0)],B=q[Math.min(k+1,q.length-1)],tx=B[0]-A[0],ty=B[1]-A[1],l=Math.hypot(tx,ty)||1;
    return [-ty/l,tx/l];});
  var cands=[];
  [26,38,52,68,-26,-38,-52,-68].forEach(function(d){
    cands.push([q.map(function(p,k){return [p[0]+nrm[k][0]*d*S,p[1]+nrm[k][1]*d*S];}),Math.abs(d)*.08]);});
  var ch=[q[q.length-1][0]-q[0][0],q[q.length-1][1]-q[0][1]],cl=Math.hypot(ch[0],ch[1]);
  if(cl/Math.max(span,1)>.85){
    var u=[ch[0]/cl,ch[1]/cl],ahead=(P[P.length-1][0]-q[0][0])*u[0]+(P[P.length-1][1]-q[0][1])*u[1]+16*S,
      behind=(q[q.length-1][0]-P[0][0])*u[0]+(q[q.length-1][1]-P[0][1])*u[1]+16*S;
    cands.push([q.map(function(p){return [p[0]+u[0]*ahead,p[1]+u[1]*ahead];}),1]);
    cands.push([q.map(function(p){return [p[0]-u[0]*behind,p[1]-u[1]*behind];}),1.4]);}
  var best=null;
  cands.forEach(function(cd){
    var r=cd[0],m=[0,0];r.forEach(function(p){m[0]+=p[0]/r.length;m[1]+=p[1]/r.length;});
    var away=-Math.sign((m[0]-fc[0])*(m[0]-c0[0])+(m[1]-fc[1])*(m[1]-c0[1]));
    var score=cover(r)*10+cd[1]+away*.5;
    if(!best||score<best[0])best=[score,r];});
  var r=best[1],e=r[r.length-1],pv=r[r.length-3],tx=e[0]-pv[0],ty=e[1]-pv[1],k=Math.hypot(tx,ty)||1;
  tx/=k;ty/=k;
  var nx=-ty,ny=tx;
  return {body:r.slice(0,-1).concat([[e[0]-tx*9*S,e[1]-ty*9*S]]),
    head:[[e[0]+tx*3*S,e[1]+ty*3*S],[e[0]-tx*11*S+nx*7*S,e[1]-ty*11*S+ny*7*S],[e[0]-tx*11*S-nx*7*S,e[1]-ty*11*S-ny*7*S]]};}

export {TEMPO, ease, cycleOf, phaseAt, mix, lerpPose, arc, poseAt, sceneAt, bodySpheres, framePoints, fitCamera, framing, motionPath, arrowShape};

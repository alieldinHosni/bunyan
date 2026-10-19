/* Bunyan — the mannequin: geometry
   Vectors, the solids the equipment is described in (spheres, rounded cones, ellipsoids,
   rounded boxes, rounded cylinders: mesh.js turns each into triangles), and the camera.

   World axes, in metres: x forward (the way the figure faces), y up, z the figure's
   left. Pure maths: no DOM, no state. */

var V={
  add:function(a,b){return [a[0]+b[0],a[1]+b[1],a[2]+b[2]];},
  sub:function(a,b){return [a[0]-b[0],a[1]-b[1],a[2]-b[2]];},
  mul:function(a,s){return [a[0]*s,a[1]*s,a[2]*s];},
  dot:function(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];},
  cross:function(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];},
  len:function(a){return Math.hypot(a[0],a[1],a[2]);},
  norm:function(a){var l=Math.hypot(a[0],a[1],a[2])||1;return [a[0]/l,a[1]/l,a[2]/l];},
  lerp:function(a,b,t){return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];}
};
var add=V.add,sub=V.sub,mul=V.mul,dot=V.dot,cross=V.cross,len=V.len,norm=V.norm;
function clamp(x,a,b){return x<a?a:x>b?b:x;}
function smooth(e0,e1,x){var t=clamp((x-e0)/(e1-e0),0,1);return t*t*(3-2*t);}

/* ---- the solids: each {k: kind, ..., m: material, g: group, c: bound centre, r: bound
   radius}. Materials: 2 iron (frames, plates), 3 pads and grips, 4 steel (bars,
   handles), 5 wall, 6 mat, 7 the accent line on a machine. ---- */
function bound(pts,pad){
  var c=[0,0,0],r=0,i;
  for(i=0;i<pts.length;i++)c=add(c,pts[i]);
  c=mul(c,1/pts.length);
  for(i=0;i<pts.length;i++)r=Math.max(r,len(sub(pts[i],c)));
  return {c:c,r:r+pad};}
function make(q,b){q.c=b.c;q.r=b.r;return q;}
function sphere(c,r,m,g){return make({k:0,c0:c,r0:r,m:m,g:g},bound([c],r));}
/* a cone with round ends, radius ra at a and rb at b */
function cone(a,b,ra,rb,m,g){
  var ba=sub(b,a);
  return make({k:1,a:a,b:b,ra:ra,rb:rb,ba:ba,l2:dot(ba,ba)||1e-9,m:m,g:g},bound([a,b],Math.max(ra,rb)));}
function capsule(a,b,r,m,g){return cone(a,b,r,r,m,g);}
/* an ellipsoid with unit axes ex, ey, ez and radii rad */
function ellipsoid(c,ex,ey,ez,rad,m,g){
  return make({k:2,c0:c,ex:ex,ey:ey,ez:ez,rad:rad,m:m,g:g},bound([c],Math.max(rad[0],rad[1],rad[2])));}
/* a box centred at c with unit axes and half sizes hs, its corners rounded by rr */
function box(c,ex,ey,ez,hs,rr,m,g){
  return make({k:3,c0:c,ex:ex,ey:ey,ez:ez,hs:hs,rr:rr,m:m,g:g},bound([c],Math.hypot(hs[0],hs[1],hs[2])+rr));}
/* a cylinder along a-b with radius r, its edges rounded by rr */
function cyl(a,b,r,rr,m,g){
  var ba=sub(b,a);
  return make({k:4,a:a,b:b,ax:norm(ba),h:len(ba),r:r,rr:rr,m:m,g:g},bound([a,b],r));}

/* A camera looking at target from yaw (degrees; 0 looks at the figure's front, 90 at its
   left side) and pitch, its vertical field of view fovY. */
function camera(target,dist,yaw,pitch,fovY,aspect){
  var yr=yaw*Math.PI/180,pr=pitch*Math.PI/180;
  var dir=[Math.cos(pr)*Math.cos(yr),Math.sin(pr),Math.cos(pr)*Math.sin(yr)];
  var p=add(target,mul(dir,dist)),f=norm(sub(target,p));
  var r=norm(cross(f,[0,1,0])),u=cross(r,f),ty=Math.tan(fovY*Math.PI/360);
  return {p:p,f:f,r:r,u:u,ty:ty,tx:ty*aspect,target:target,dist:dist,yaw:yaw,pitch:pitch,fov:fovY,aspect:aspect};}
/* A world point on the screen: x and y from -1 to 1 (y up), and its depth. */
function project(cam,q){
  var d=sub(q,cam.p),z=dot(d,cam.f);
  return [dot(d,cam.r)/z/cam.tx,dot(d,cam.u)/z/cam.ty,z];}

export {V, clamp, smooth, sphere, cone, capsule, ellipsoid, box, cyl, camera, project};

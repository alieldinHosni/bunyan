/* Bunyan — the mannequin: geometry
   The mannequin and its equipment are made of a few kinds of solid, each a signed
   distance field: how far a point is from its surface, negative inside. The body's
   parts blend into one another with a small radius each, so a muscle swells out of the
   limb under it instead of sitting on it; equipment is hard-edged. The same shapes are
   drawn by the app (js/ui/mannequin.js, on the graphics card) and by the offline tool
   that makes the still pictures (tools/figures), so both draw the same figure.

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
   radius}. A body part (g 1) also carries bk, the radius it blends in with; cl, the
   region it belongs to (an arm, a leg), which lets a whole region be skipped when a
   point is far from it; tag, the muscle it is; and hl, how strongly that muscle is lit.
   cut marks a groove carved into what is there (the midline of the abdomen).
   Materials: 1 skin, 2 iron (frames, plates), 3 pads and grips, 4 steel (bars,
   handles), 5 wall, 6 mat, 7 the red line on a machine, 8 a shoe, 9 its sole. ---- */
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

/* The exact distance from p to one solid. */
function sdOne(q,p){
  var d,x,y,z,h,r,k0,k1,t,dx,dy;
  switch(q.k){
    case 0:return len(sub(p,q.c0))-q.r0;
    case 1:
      d=sub(p,q.a);h=clamp(dot(d,q.ba)/q.l2,0,1);r=q.ra+(q.rb-q.ra)*h;
      return len(sub(d,mul(q.ba,h)))-r;
    case 2:
      d=sub(p,q.c0);x=dot(d,q.ex)/q.rad[0];y=dot(d,q.ey)/q.rad[1];z=dot(d,q.ez)/q.rad[2];
      k0=Math.hypot(x,y,z);k1=Math.hypot(x/q.rad[0],y/q.rad[1],z/q.rad[2]);
      return k1?k0*(k0-1)/k1:-Math.min(q.rad[0],q.rad[1],q.rad[2]);
    case 3:
      d=sub(p,q.c0);x=Math.abs(dot(d,q.ex))-q.hs[0];y=Math.abs(dot(d,q.ey))-q.hs[1];z=Math.abs(dot(d,q.ez))-q.hs[2];
      return Math.hypot(Math.max(x,0),Math.max(y,0),Math.max(z,0))+Math.min(Math.max(x,y,z),0)-q.rr;
    case 4:
      d=sub(p,q.a);t=dot(d,q.ax);r=len(sub(d,mul(q.ax,t)));
      dx=r-q.r+q.rr;dy=Math.abs(t-q.h/2)-q.h/2+q.rr;
      return Math.min(Math.max(dx,dy),0)+Math.hypot(Math.max(dx,0),Math.max(dy,0))-q.rr;}
  return 1e9;}

/* Polynomial smooth minimum, and how much of a it took (for the material). */
function smin(a,b,k){var h=clamp(.5+.5*(b-a)/k,0,1);return [b+(a-b)*h-k*h*(1-h),h];}

/* How a scene is put together, worked out once: the body's parts by region, in the
   order they blend; the shoes (each its own smooth group); and the hard-edged rest. */
function layout(prims){
  var body=[],rest=[],byG={},gOrder=[],byCl={},clOrder=[],i,q;
  for(i=0;i<prims.length;i++){
    q=prims[i];
    if(q.g===1){
      var cl=q.cl||"_";
      if(!byCl[cl]){byCl[cl]=[];clOrder.push(cl);}
      byCl[cl].push(q);body.push(q);}
    else if(q.g>1&&q.bk){
      if(!byG[q.g]){byG[q.g]=[];gOrder.push(q.g);}
      byG[q.g].push(q);}
    else rest.push(q);}
  function group(ps,name){
    var c=[0,0,0],r=0,j;
    for(j=0;j<ps.length;j++)c=add(c,ps[j].c);
    c=mul(c,1/ps.length);
    for(j=0;j<ps.length;j++)r=Math.max(r,len(sub(ps[j].c,c))+ps[j].r);
    return {name:name,ps:ps,c:c,r:r,m:ps[0].m};}
  return {
    clusters:clOrder.map(function(n){return group(byCl[n],n);}),
    groups:gOrder.map(function(g){return group(byG[g],g);}),
    rest:rest,body:body};}

/* The scene's distance at p: [d, material]. Body parts blend into one another, each with
   its own radius; a shoe's parts blend among themselves; everything else is a hard
   union. Far from a solid (further than cut), the distance to its bounding sphere
   stands in for it: never more than the true distance, so a step by it is safe, and
   it costs one square root. A whole region is skipped the same way. A stand-in never
   blends (blending it would bend the field and band the shading), and a groove that is
   far away is simply skipped: it only takes away. */
function makeSdf(prims,K){
  var L=layout(prims);
  return function(p,cut){
    var d=1e9,m=0,i,j,C,q,lc,lb,e,k,s,h;
    for(i=0;i<L.clusters.length;i++){
      C=L.clusters[i];lc=len(sub(p,C.c))-C.r;
      if(lc>cut){if(lc<d){d=lc;m=C.m;}continue;}
      for(j=0;j<C.ps.length;j++){
        q=C.ps[j];lb=len(sub(p,q.c))-q.r;
        if(lb>cut){if(!q.cut&&lb<d){d=lb;m=q.m;}continue;}
        e=sdOne(q,p);k=q.bk||K;
        if(q.cut){h=clamp(.5-.5*(d+e)/k,0,1);d=d+(-e-d)*h+k*h*(1-h);continue;}
        /* the first solid is taken as it is (the shader does the same: blended into 1e9
           it would be lost in a 32-bit float) */
        if(d>=1e8){d=e;m=q.m;continue;}
        if(e>d+k)continue;
        s=smin(e,d,k);if(s[1]>.5)m=q.m;d=s[0];}}
    for(i=0;i<L.groups.length;i++){
      C=L.groups[i];lc=len(sub(p,C.c))-C.r;
      if(lc>=d)continue;
      if(lc>cut){d=lc;m=C.m;continue;}
      var gd=1e9,gm=0;
      for(j=0;j<C.ps.length;j++){
        q=C.ps[j];e=sdOne(q,p);
        if(gd>=1e8){gd=e;gm=q.m;continue;}
        if(e>gd+q.bk)continue;
        s=smin(e,gd,q.bk);if(s[1]>.5)gm=q.m;gd=s[0];}
      if(gd<d){d=gd;m=gm;}}
    for(i=0;i<L.rest.length;i++){
      q=L.rest[i];lb=len(sub(p,q.c))-q.r;
      if(lb>=d)continue;
      e=lb>cut?lb:sdOne(q,p);
      if(e<d){d=e;m=q.m;}}
    return [d,m];};}

/* How strongly the muscles an exercise works light the skin at p: the brightest lit
   muscle within a few millimetres, fading out over three centimetres. */
function glowAt(prims,p){
  var w=0,i,q,e;
  for(i=0;i<prims.length;i++){
    q=prims[i];
    if(q.g!==1||!(q.hl>0)||len(sub(p,q.c))-q.r>.04)continue;
    e=sdOne(q,p);
    if(e<.04)w=Math.max(w,q.hl*(1-smooth(.004,.03,e)));}
  return w;}

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

export {V, clamp, smooth, sphere, cone, capsule, ellipsoid, box, cyl, sdOne, smin, layout, makeSdf, glowAt, camera, project};

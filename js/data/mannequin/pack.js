/* Bunyan — the mannequin: packed for the graphics card
   The solids of one moment (motion.js sceneAt) as the flat arrays the live renderer
   (js/ui/mannequin.js) uploads every frame. Pure, so it is tested in Node.

   Each solid is one row of six RGBA texels:
     0  bound centre xyz, bound radius (negative for a groove, so the shader can tell
        without a second read)
     1  kind (+8 for a groove), material, blend radius, how lit
     2  sphere: centre, radius · cone: a, ra · ellipsoid: centre · box: centre, corner
        radius · cylinder: a, radius
     3  cone: b, rb · cylinder: b, edge radius · ellipsoid and box: x axis
     4  ellipsoid and box: y axis (z is their cross product: both are symmetric, so its
        sign does not matter)
     5  ellipsoid: radii · box: half sizes
   The rows are in the order the distance field is put together (geom.js makeSdf): the
   body's regions in blending order, then the shoes, then the equipment, cut into runs
   of nearby solids. Each run is a cluster: a bounding sphere, its first row, how many,
   and its kind (0 body: one smooth blend running on across all of them, in order; 1 a
   smooth group, hard against the rest; 2 hard-edged). A body region longer than
   BODYRUN is cut into runs, which leaves the blend's order as it was. A ray tests the
   clusters' spheres once and only ever evaluates the ones it passes through; fewer,
   larger clusters measured faster than many small ones (each costs every step). */
import {V, layout} from "./geom.js";

var MAXC=32,ROW=6,BODYRUN=40,EQRUN=10;
function group(ps){
  var c=[0,0,0],r=0,j;
  for(j=0;j<ps.length;j++)c=V.add(c,ps[j].c);
  c=V.mul(c,1/ps.length);
  for(j=0;j<ps.length;j++)r=Math.max(r,V.len(V.sub(ps[j].c,c))+ps[j].r);
  return {c:c,r:r};}
function pack(prims){
  var L=layout(prims),order=[],clusters=[];
  function addRun(ps,type){
    if(!ps.length)return;
    var b=group(ps);
    clusters.push({c:b.c,r:b.r,start:order.length,count:ps.length,type:type,m:ps[0].m});
    order.push.apply(order,ps);}
  L.clusters.forEach(function(C){
    var k=Math.ceil(C.ps.length/BODYRUN),size=Math.ceil(C.ps.length/k);
    for(var i=0;i<C.ps.length;i+=size)addRun(C.ps.slice(i,i+size),0);});
  L.groups.forEach(function(G){addRun(G.ps,1);});
  /* the equipment, hard-edged and so in any order, in groups of nearby solids: the one
     furthest out with those nearest it, again and again */
  var rest=L.rest.slice(),size=Math.max(EQRUN,Math.ceil(rest.length/Math.max(MAXC-clusters.length,1)));
  while(rest.length){
    var mid=[0,0,0];rest.forEach(function(q){mid=V.add(mid,V.mul(q.c,1/rest.length));});
    var far=rest.reduce(function(a,q){return V.len(V.sub(q.c,mid))>V.len(V.sub(a.c,mid))?q:a;},rest[0]);
    rest.sort(function(a,b){return V.len(V.sub(a.c,far.c))-V.len(V.sub(b.c,far.c));});
    addRun(rest.splice(0,size),2);}
  var n=order.length,tex=new Float32Array(n*ROW*4),hl=[];
  order.forEach(function(q,i){
    var o=i*ROW*4,a,b,c,d;
    tex[o]=q.c[0];tex[o+1]=q.c[1];tex[o+2]=q.c[2];tex[o+3]=q.cut?-q.r:q.r;
    tex[o+4]=q.k+(q.cut?8:0);tex[o+5]=q.m||0;tex[o+6]=q.bk||0;tex[o+7]=q.hl||0;
    if(q.g===1&&q.hl>0)hl.push(i);
    switch(q.k){
      case 0:a=q.c0.concat(q.r0);break;
      case 1:a=q.a.concat(q.ra);b=q.b.concat(q.rb);break;
      case 2:a=q.c0.concat(0);b=q.ex.concat(0);c=q.ey.concat(0);d=q.rad.concat(0);break;
      case 3:a=q.c0.concat(q.rr);b=q.ex.concat(0);c=q.ey.concat(0);d=q.hs.concat(0);break;
      case 4:a=q.a.concat(q.r);b=q.b.concat(q.rr);break;}
    [a,b,c,d].forEach(function(t,k){if(t)tex.set(t,o+8+k*4);});});
  return {n:n,tex:tex,clusters:clusters,hl:hl,order:order};}

export {pack, MAXC, ROW};

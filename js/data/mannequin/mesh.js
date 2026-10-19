/* Bunyan — the mannequin: the equipment as meshes
   The equipment is described as solids (kit.js: spheres, rounded cones, ellipsoids,
   rounded boxes, rounded cylinders, with world positions). The renderer draws triangles,
   so each solid becomes a mesh in its own frame plus where that frame is in the world.
   A shape is built once and kept: a lever that swings is the same mesh moved, so a
   moving machine costs a matrix a frame, not new geometry.

     place(q)   {key, mat, m}: the shape's key, its rigid placement (a 4×4 matrix,
                column major) and its material
     build(key) {p, n, i}: the shape's positions, normals and triangles, in its frame

   Pure: no DOM, no state beyond the kept shapes. */
import {V} from "./geom.js";

var add=V.add,sub=V.sub,mul=V.mul,dot=V.dot,cross=V.cross,len=V.len,norm=V.norm;
/* sizes in a key to the half millimetre, so a shape rebuilt from the same numbers is
   found again */
function q5(x){return Math.round(x*2000)/2000;}

/* A frame whose y axis runs along ax: [x, y, z] unit vectors. */
function frameAlong(ax){
  var y=norm(ax),x=Math.abs(y[1])<.9?norm(cross([0,1,0],y)):norm(cross([1,0,0],y)),z=cross(x,y);
  return [x,y,z];}
function mat(ax,o){
  return [ax[0][0],ax[0][1],ax[0][2],0, ax[1][0],ax[1][1],ax[1][2],0, ax[2][0],ax[2][1],ax[2][2],0, o[0],o[1],o[2],1];}

/* Where a solid's shape sits, and the key its shape is built from. */
function place(q){
  switch(q.k){
    case 0: return {key:"s|"+q5(q.r0),mat:mat([[1,0,0],[0,1,0],[0,0,1]],q.c0),m:q.m};
    case 1:{var L=len(sub(q.b,q.a));
      return {key:"c|"+q5(q.ra)+"|"+q5(q.rb)+"|"+q5(L),mat:mat(frameAlong(sub(q.b,q.a)),q.a),m:q.m};}
    case 2: return {key:"e|"+q.rad.map(q5).join("|"),mat:mat([q.ex,q.ey,q.ez],q.c0),m:q.m};
    case 3: return {key:"b|"+q.hs.map(q5).join("|")+"|"+q5(q.rr),mat:mat([q.ex,q.ey,q.ez],q.c0),m:q.m};
    case 4: return {key:"y|"+q5(q.r)+"|"+q5(q.rr)+"|"+q5(q.h),mat:mat(frameAlong(q.ax),q.a),m:q.m};}
  return null;}

/* ---- the shapes ---- */
function Mesh(){this.p=[];this.n=[];this.i=[];}
Mesh.prototype.v=function(p,n){this.p.push(p[0],p[1],p[2]);this.n.push(n[0],n[1],n[2]);return this.p.length/3-1;};
/* A surface of revolution about y: a profile of [y, radius, ny, nr] points (with its
   normal), turned seg times. */
function revolve(prof,seg){
  var m=new Mesh(),rows=prof.length,c,r,k;
  for(r=0;r<rows;r++)for(k=0;k<=seg;k++){
    var a=k/seg*Math.PI*2,ca=Math.cos(a),sa=Math.sin(a),pr=prof[r];
    m.v([pr[1]*ca,pr[0],pr[1]*sa],norm([pr[3]*ca,pr[2],pr[3]*sa]));}
  for(r=0;r<rows-1;r++)for(k=0;k<seg;k++){
    c=r*(seg+1)+k;
    m.i.push(c,c+seg+1,c+1,c+1,c+seg+1,c+seg+2);}
  return m;}
/* a quarter circle of the profile, from angle a0 to a1, centred (y, r), radius rr */
function corner(out,y,r,rr,a0,a1,n){
  for(var j=0;j<=n;j++){var a=a0+(a1-a0)*j/n;out.push([y+Math.sin(a)*rr,r+Math.cos(a)*rr,Math.sin(a),Math.cos(a)]);}}
function sphereMesh(rx,ry,rz){
  var prof=[],n=14;
  for(var j=0;j<=n;j++){var a=-Math.PI/2+Math.PI*j/n;prof.push([Math.sin(a),Math.cos(a)+1e-6,Math.sin(a),Math.cos(a)]);}
  var m=revolve(prof,24);
  for(var i=0;i<m.p.length;i+=3){m.p[i]*=rx;m.p[i+1]*=ry;m.p[i+2]*=rz;
    var nn=norm([m.n[i]/rx,m.n[i+1]/ry,m.n[i+2]/rz]);m.n[i]=nn[0];m.n[i+1]=nn[1];m.n[i+2]=nn[2];}
  return m;}
/* a cone with round ends: radius ra at y 0 and rb at y L, the ends spheres, the side
   their common tangent */
function roundCone(ra,rb,L){
  var s=Math.max(-.999,Math.min(.999,(ra-rb)/Math.max(L,1e-6))),al=Math.asin(s),prof=[],n=8,j;
  for(j=0;j<=n;j++){var a=-Math.PI/2+(Math.PI/2+al)*j/n;prof.push([Math.sin(a)*ra,Math.cos(a)*ra+1e-6,Math.sin(a),Math.cos(a)]);}
  for(j=0;j<=n;j++){var b=al+(Math.PI/2-al)*j/n;prof.push([L+Math.sin(b)*rb,Math.cos(b)*rb+1e-6,Math.sin(b),Math.cos(b)]);}
  return revolve(prof,20);}
/* a cylinder of radius r from y 0 to h, its two rims rounded by rr */
function roundCyl(r,rr,h){
  rr=Math.min(rr,r*.9,h/2*.9);var prof=[[0,1e-6,-1,0]];
  corner(prof,rr,r-rr,rr,-Math.PI/2,0,4);
  corner(prof,h-rr,r-rr,rr,0,Math.PI/2,4);
  prof.push([h,1e-6,1,0]);
  return revolve(prof,28);}
/* a box of half sizes hs, its edges and corners rounded by rr: a cube divided into a
   grid on each face, each point pushed out round the box shrunk by rr */
function roundBox(hs,rr){
  rr=Math.min(rr,hs[0]*.95,hs[1]*.95,hs[2]*.95);
  var m=new Mesh(),N=6,inner=[hs[0]-rr,hs[1]-rr,hs[2]-rr];
  var faces=[[0,1,2,1],[0,1,2,-1],[1,2,0,1],[1,2,0,-1],[2,0,1,1],[2,0,1,-1]];
  faces.forEach(function(F){
    var a=F[0],b=F[1],c=F[2],sg=F[3],base=m.p.length/3;
    for(var j=0;j<=N;j++)for(var k=0;k<=N;k++){
      var u=-1+2*j/N,v=-1+2*k/N,p=[0,0,0];
      /* the grid crowded toward the edges, where the rounding is */
      u=Math.sign(u)*Math.pow(Math.abs(u),.6);v=Math.sign(v)*Math.pow(Math.abs(v),.6);
      p[c]=sg*hs[c];p[a]=u*hs[a];p[b]=v*hs[b];
      var cl=[Math.max(-inner[0],Math.min(inner[0],p[0])),Math.max(-inner[1],Math.min(inner[1],p[1])),Math.max(-inner[2],Math.min(inner[2],p[2]))];
      var d=sub(p,cl),dl=len(d),nn=dl<1e-9?(function(){var z=[0,0,0];z[c]=sg;return z;})():mul(d,1/dl);
      m.v(add(cl,mul(nn,rr)),nn);}
    for(j=0;j<N;j++)for(k=0;k<N;k++){
      var i0=base+j*(N+1)+k,i1=i0+N+1;
      /* each face wound so it faces out */
      if(sg>0)m.i.push(i0,i1,i0+1,i0+1,i1,i1+1);else m.i.push(i0,i0+1,i1,i0+1,i1+1,i1);}});
  return m;}

var KEPT={};
function build(key){
  if(KEPT[key])return KEPT[key];
  var a=key.split("|"),t=a[0],v=a.slice(1).map(Number),m;
  if(t==="s")m=sphereMesh(v[0],v[0],v[0]);
  else if(t==="e")m=sphereMesh(v[0],v[1],v[2]);
  else if(t==="c")m=roundCone(v[0],v[1],v[2]);
  else if(t==="y")m=roundCyl(v[0],v[1],v[2]);
  else if(t==="b")m=roundBox([v[0],v[1],v[2]],v[3]);
  else return null;
  KEPT[key]={p:new Float32Array(m.p),n:new Float32Array(m.n),i:new Uint16Array(m.i)};
  return KEPT[key];}

export {place, build};

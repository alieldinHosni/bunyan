/* Bunyan — the mannequin: the skeleton
   The figure is one human body (body.js, img/fig/body.bin: MakeHuman's CC0 mesh, an
   athletic man of 1.81 m) skinned to 74 bones. A pose is described as before (rig.js:
   the pelvis and the trunk's angles, where the hands and the feet are, which way the
   elbows and the knees point); this solves it on the real skeleton:

     solve(p)   {J, M}: J the joints, in the same shape the equipment, the arrow and
                the camera have always read (P, pf, cf, neck, head, sh, el, wr, hd, pn,
                hip, kn, an, fd); M every bone's matrix, rest to posed (16 numbers a
                bone, column major), which the renderer moves the skin by

   How it is solved. The trunk is carried by the pelvis and bends through its five spine
   bones from the pelvis's frame to the chest's; the neck carries the head the same way.
   The shoulder girdle rides on the chest and lifts and reaches with the arm, as a
   shoulder blade does (the arm alone stops at shoulder height). Each arm and leg is a
   two-bone chain solved to its hand or foot (an elbow and a knee bend one way only,
   toward the side their hint gives), the forearm turns the hand to its palm's
   direction, shared between its two bones as the radius rolls, and the fingers close
   round what the hand holds. Each bone's matrix maps its rest frame to its posed one
   about its own joint, so a bone and everything it carries keep their shape.

   World axes, in metres: x forward (the way the figure faces), y up, z the figure's
   left (its "l" side). Pure: no DOM, no state. */
import {BODY} from "./body.js";
import {V} from "./geom.js";

var add=V.add,sub=V.sub,mul=V.mul,dot=V.dot,cross=V.cross,len=V.len,norm=V.norm;
var R=Math.PI/180;

/* ---- the rest skeleton ---- */
var BONES=BODY.bones,NB=BONES.length,IX={};
BONES.forEach(function(b,i){IX[b.name]=i;});
function H0(n){return BONES[IX[n]].head;}
function T0(n){return BONES[IX[n]].tail;}
var SIDES={l:"L",r:"R"};
/* The pelvis's reference point: midway between the hips, 6 cm up (where a pose's
   pelvis is), as the old figure had it. */
var HIP0={l:H0("upperleg01.L"),r:H0("upperleg01.R")};
var P0=add(V.lerp(HIP0.l,HIP0.r,.5),[0,.06,0]);
var ARM={},LEG={};
["l","r"].forEach(function(s){
  var S=SIDES[s];
  var sh=H0("upperarm01."+S),el=H0("lowerarm01."+S),wr=H0("wrist."+S);
  var hip=H0("upperleg01."+S),kn=H0("lowerleg01."+S),an=H0("foot."+S);
  /* the hand: along it to the middle finger's knuckle, its palm the side the fingers
     close toward */
  var mid=H0("finger3-1."+S),ix=H0("finger2-1."+S),pk=H0("finger5-1."+S);
  var hd=norm(sub(mid,wr)),across=norm(sub(ix,pk));
  var pn=norm(cross(hd,across));
  /* the fingers curl toward the palm: check which way that is from a fingertip */
  var tip=T0("finger3-3."+S),out=sub(tip,mid);
  if(dot(out,pn)<0)pn=mul(pn,-1);
  ARM[s]={sh:sh,el:el,wr:wr,a:len(sub(el,sh)),b:len(sub(wr,el)),
    hinge:norm(cross(sub(el,sh),sub(wr,el))),hd:hd,pn:norm(sub(pn,mul(hd,dot(pn,hd)))),across:across};
  /* the foot: its sole runs from the heel to the toes along the ground */
  var toe=T0("foot."+S),fdir=norm([toe[0]-an[0],0,toe[2]-an[2]]);
  LEG[s]={hip:hip,kn:kn,an:an,a:len(sub(kn,hip)),b:len(sub(an,kn)),fdir:fdir,
    /* the knee bends the shin back: its hinge, as the solve below finds it */
    hinge:norm(cross(norm(sub(kn,hip)),[-1,0,0]))};});
var NECK0=H0("neck01"),HEAD0=H0("head"),CLAV0={l:H0("clavicle.L"),r:H0("clavicle.R")};
/* Proportions the poses can read (records place handles from them). */
var DIM={P:P0,shY:ARM.l.sh[1]-P0[1],shW:ARM.l.sh[2],upArm:ARM.l.a,foreArm:ARM.l.b,
  hipW:HIP0.l[2],hipDown:P0[1]-HIP0.l[1],thigh:LEG.l.a,shin:LEG.l.b,ankleUp:LEG.l.an[1],
  palm:.075,height:BODY.max[1]};

/* ---- small rotation maths: 3×3 matrices as arrays of 9, column major ---- */
/* the frame of columns a, b, a×b, with b made square to a */
function basis(a,b){
  a=norm(a);b=sub(b,mul(a,dot(b,a)));
  if(len(b)<1e-6)b=Math.abs(a[1])<.9?[0,1,0]:[1,0,0],b=sub(b,mul(a,dot(b,a)));
  b=norm(b);var c=cross(a,b);
  return [a[0],a[1],a[2],b[0],b[1],b[2],c[0],c[1],c[2]];}
function mm(A,B){var o=new Array(9);
  for(var c=0;c<3;c++)for(var r=0;r<3;r++)o[c*3+r]=A[r]*B[c*3]+A[3+r]*B[c*3+1]+A[6+r]*B[c*3+2];
  return o;}
function tr(A){return [A[0],A[3],A[6],A[1],A[4],A[7],A[2],A[5],A[8]];}
function mv(A,v){return [A[0]*v[0]+A[3]*v[1]+A[6]*v[2],A[1]*v[0]+A[4]*v[1]+A[7]*v[2],A[2]*v[0]+A[5]*v[1]+A[8]*v[2]];}
/* the rotation carrying the rest frame (a0, b0) onto the posed one (a, b) */
function align(a0,b0,a,b){return mm(basis(a,b),tr(basis(a0,b0)));}
/* a turn of ang radians about a unit axis */
function rot(axis,ang){
  var k=norm(axis),c=Math.cos(ang),s=Math.sin(ang),t=1-c,x=k[0],y=k[1],z=k[2];
  return [t*x*x+c,t*x*y+s*z,t*x*z-s*y, t*x*y-s*z,t*y*y+c,t*y*z+s*x, t*x*z+s*y,t*y*z-s*x,t*z*z+c];}
var I3=[1,0,0,0,1,0,0,0,1];
/* A rotation as a quaternion and back, so the spine's bones can share a turn. */
function quat(m){
  var t=m[0]+m[4]+m[8],w,x,y,z,s;
  if(t>0){s=Math.sqrt(t+1)*2;w=s/4;x=(m[5]-m[7])/s;y=(m[6]-m[2])/s;z=(m[1]-m[3])/s;}
  else if(m[0]>m[4]&&m[0]>m[8]){s=Math.sqrt(1+m[0]-m[4]-m[8])*2;w=(m[5]-m[7])/s;x=s/4;y=(m[3]+m[1])/s;z=(m[6]+m[2])/s;}
  else if(m[4]>m[8]){s=Math.sqrt(1+m[4]-m[0]-m[8])*2;w=(m[6]-m[2])/s;x=(m[3]+m[1])/s;y=s/4;z=(m[7]+m[5])/s;}
  else{s=Math.sqrt(1+m[8]-m[0]-m[4])*2;w=(m[1]-m[3])/s;x=(m[6]+m[2])/s;y=(m[7]+m[5])/s;z=s/4;}
  return [w,x,y,z];}
function unquat(q){
  var w=q[0],x=q[1],y=q[2],z=q[3];
  return [1-2*(y*y+z*z),2*(x*y+w*z),2*(x*z-w*y), 2*(x*y-w*z),1-2*(x*x+z*z),2*(y*z+w*x), 2*(x*z+w*y),2*(y*z-w*x),1-2*(x*x+y*y)];}
function slerp(a,b,t){
  var d=a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3];
  if(d<0){b=b.map(function(v){return -v;});d=-d;}
  if(d>.9995){var o=a.map(function(v,i){return v+(b[i]-v)*t;}),l=Math.hypot(o[0],o[1],o[2],o[3]);return o.map(function(v){return v/l;});}
  var th=Math.acos(d),s=Math.sin(th),wa=Math.sin((1-t)*th)/s,wb=Math.sin(t*th)/s;
  return a.map(function(v,i){return v*wa+b[i]*wb;});}
function frameMat(fr){return [fr.f[0],fr.f[1],fr.f[2],fr.u[0],fr.u[1],fr.u[2],fr.l[0],fr.l[1],fr.l[2]];}

/* ---- the frames of the trunk, from a pose's angles (as rig.js) ---- */
function rotAxis(v,axis,ang){
  var c=Math.cos(ang),s=Math.sin(ang),k=norm(axis);
  return add(add(mul(v,c),mul(cross(k,v),s)),mul(k,dot(k,v)*(1-c)));}
function frame(yaw,pitch,roll,twist){
  var f=[1,0,0],u=[0,1,0],l=[0,0,1],a;
  a=(roll||0)*R;f=rotAxis(f,[1,0,0],a);u=rotAxis(u,[1,0,0],a);l=rotAxis(l,[1,0,0],a);
  a=-(pitch||0)*R;f=rotAxis(f,[0,0,1],a);u=rotAxis(u,[0,0,1],a);l=rotAxis(l,[0,0,1],a);
  a=-(yaw||0)*R;f=rotAxis(f,[0,1,0],a);u=rotAxis(u,[0,1,0],a);l=rotAxis(l,[0,1,0],a);
  var base={f:f,u:u,l:l};
  if(!twist)return {pel:base,chest:base};
  var tw=twist*R;
  return {pel:base,chest:{f:rotAxis(f,u,tw),u:u,l:rotAxis(l,u,tw)}};}
function axesFrame(a,twist){
  var u=norm(a.u),f=norm(sub(a.f,mul(u,dot(a.f,u)))),l=cross(f,u),base={f:f,u:u,l:l};
  if(!twist)return {pel:base,chest:base};
  var tw=twist*R;
  return {pel:base,chest:{f:rotAxis(f,u,tw),u:u,l:rotAxis(l,u,tw)}};}

/* Two bones, lengths a and b, from root toward target, the middle joint out toward
   pole (a direction). Out of reach: the full stretch toward it; too close: as folded
   as the joint goes. */
function ik(root,target,a,b,pole){
  var d=sub(target,root),dl=len(d),n=norm(d),mx=(a+b)*.9995,mn=Math.abs(a-b)+.02;
  if(dl>mx){dl=mx;target=add(root,mul(n,mx));}
  if(dl<mn){dl=mn;target=add(root,mul(n,mn));}
  var x=(a*a-b*b+dl*dl)/(2*dl),h=Math.sqrt(Math.max(a*a-x*x,0));
  var pp=sub(pole,mul(n,dot(pole,n)));
  if(len(pp)<1e-6)pp=Math.abs(n[1])<.9?[0,1,0]:[1,0,0],pp=sub(pp,mul(n,dot(pp,n)));
  pp=norm(pp);
  return {mid:add(add(root,mul(n,x)),mul(pp,h)),end:target,pole:pp};}

/* ---- solving a pose ---- */
var M=new Float32Array(NB*16);
/* bone i moves its skin by rotation Rm about its rest joint h0 to the posed joint h */
function put(out,i,Rm,h0,h){
  var o=i*16,t=sub(h,mv(Rm,h0));
  out[o]=Rm[0];out[o+1]=Rm[1];out[o+2]=Rm[2];out[o+3]=0;
  out[o+4]=Rm[3];out[o+5]=Rm[4];out[o+6]=Rm[5];out[o+7]=0;
  out[o+8]=Rm[6];out[o+9]=Rm[7];out[o+10]=Rm[8];out[o+11]=0;
  out[o+12]=t[0];out[o+13]=t[1];out[o+14]=t[2];out[o+15]=1;}
/* where bone i's matrix takes rest point q */
function apply(out,i,q){var o=i*16;
  return [out[o]*q[0]+out[o+4]*q[1]+out[o+8]*q[2]+out[o+12],out[o+1]*q[0]+out[o+5]*q[1]+out[o+9]*q[2]+out[o+13],
    out[o+2]*q[0]+out[o+6]*q[1]+out[o+10]*q[2]+out[o+14]];}
function rotOf(out,i){var o=i*16;return [out[o],out[o+1],out[o+2],out[o+4],out[o+5],out[o+6],out[o+8],out[o+9],out[o+10]];}

/* The finger curls of a grip, by joint (degrees): round a bar or a handle. */
var CURL={open:[[8,10,6],[10,12,8]],grip:[[58,78,46],[30,22,14]],fist:[[86,96,62],[40,30,26]]};
function curlOf(g){
  if(typeof g==="string")return CURL[g]||CURL.grip;
  var k=g==null?.2:Math.max(0,Math.min(1,g)),a=CURL.open,b=CURL.grip;
  return [a[0].map(function(v,i){return v+(b[0][i]-v)*k;}),a[1].map(function(v,i){return v+(b[1][i]-v)*k;})];}

function solve(p,out){
  out=out||new Float32Array(NB*16);
  var fr=p.axes?axesFrame(p.axes,p.twist):frame(p.yaw,p.pitch,p.roll,p.twist),pf=fr.pel,cf=fr.chest;
  var Pp=p.pelvis||P0,Rp=frameMat(pf),Rc=frameMat(cf);
  /* the pelvis: root and both hip bones, rigid */
  ["root","pelvis.L","pelvis.R"].forEach(function(n){put(out,IX[n],Rp,P0,Pp);});
  /* the spine bends from the pelvis's frame to the chest's, a share at each bone */
  var qp=quat(Rp),qc=quat(Rc),parent=IX.root,SP=["spine05","spine04","spine03","spine02","spine01"],W5=[.12,.3,.52,.76,1];
  SP.forEach(function(n,k){
    var Rk=unquat(slerp(qp,qc,W5[k])),h=apply(out,parent,H0(n));
    put(out,IX[n],Rk,H0(n),h);parent=IX[n];});
  var Rch=rotOf(out,IX.spine01);
  /* the head: nodded by p.head degrees (down positive) from the chest, turned by
     p.look degrees to its left, carried through the three neck bones */
  var Rh=mm(rot(mv(Rch,[0,1,0]),(p.look||0)*R),mm(rot(mv(Rch,[0,0,1]),-(p.head||0)*R),Rch));
  var qch=quat(Rch),qh=quat(Rh);parent=IX.spine01;
  ["neck01","neck02","neck03","head"].forEach(function(n,k){
    var Rk=unquat(slerp(qch,qh,[.3,.55,.8,1][k])),h=apply(out,parent,H0(n));
    put(out,IX[n],Rk,H0(n),h);parent=IX[n];});
  var J={P:Pp,pf:pf,cf:cf,neck:apply(out,IX.neck01,NECK0),sh:{},el:{},wr:{},hd:{},pn:{},hip:{},kn:{},an:{},fd:{},grip:{}};
  var hr=rotOf(out,IX.head);
  J.head=apply(out,IX.head,add(HEAD0,[0,.09,0]));J.hu=mv(hr,[0,1,0]);J.hf=mv(hr,[1,0,0]);
  ["l","r"].forEach(function(s){
    var S=SIDES[s],side=s==="l"?1:-1,A=ARM[s],Lg=LEG[s];
    /* ---- the arm ---- */
    var chU=mv(Rch,[0,1,0]),chF=mv(Rch,[1,0,0]),chL=mv(Rch,[0,0,1]);
    var shRest=apply(out,IX.spine01,A.sh);
    var target=(p.hands&&p.hands[s])||add(shRest,add(mul(chU,-(A.a+A.b-.02)),mul(chL,side*.04)));
    /* the shoulder blade follows the arm: up as the hand goes above the shoulder, forward
       as it reaches in front, back as it pulls behind; p.shrug and p.reach (degrees) add
       to it */
    var to=norm(sub(target,shRest)),up=dot(to,chU),fw=dot(to,chF);
    var elev=Math.max(0,up+.15)*20+(p.shrug&&p.shrug[s]!=null?p.shrug[s]:(p.shrug&&typeof p.shrug==="number"?p.shrug:0));
    var prot=fw*4*Math.min(1,len(sub(target,shRest))/(A.a+A.b))+(p.reach&&p.reach[s]!=null?p.reach[s]:0);
    var Rcl=mm(rot(chU,side*prot*R),mm(rot(chF,-side*elev*R),Rch));
    var cl=apply(out,IX.spine01,CLAV0[s]);
    put(out,IX["clavicle."+S],Rcl,CLAV0[s],cl);
    put(out,IX["shoulder01."+S],Rcl,CLAV0[s],cl);
    var SH=apply(out,IX["shoulder01."+S],A.sh);
    var pole=(p.elbows&&p.elbows[s])||add(mul(cf.f,-1),mul(cf.l,side*.35));
    var k=ik(SH,target,A.a,A.b,pole),EL=k.mid,WR=k.end;
    var du=norm(sub(EL,SH)),df=norm(sub(WR,EL));
    /* the elbow's hinge: square to the arm and the forearm; straight, from its hint */
    var hg=cross(du,df);
    if(len(hg)<.05)hg=cross(du,mul(k.pole,-1));
    hg=norm(hg);
    var Rua=align(sub(A.el,A.sh),A.hinge,du,hg);
    put(out,IX["upperarm01."+S],Rua,A.sh,SH);
    put(out,IX["upperarm02."+S],Rua,A.sh,SH);
    /* the hand: where it points (p.handDir; along the forearm by default) and the way the
       palm faces (p.palm; toward the body's middle by default, a neutral grip) */
    var hd=norm((p.handDir&&p.handDir[s])||df);
    var pn=(p.palm&&p.palm[s])||mul(cf.l,-side);
    pn=sub(pn,mul(hd,dot(pn,hd)));
    if(len(pn)<1e-4)pn=sub(hg,mul(hd,dot(hg,hd)));
    pn=norm(pn);
    /* the forearm's roll to that palm: what is left of it after the elbow, shared between
       its two bones so the skin turns gradually from elbow to wrist */
    var Rfa=align(sub(A.wr,A.el),A.hinge,df,hg);
    var restPn=mv(Rfa,A.pn),want=sub(pn,mul(df,dot(pn,df))),have=sub(restPn,mul(df,dot(restPn,df)));
    var roll=0;
    if(len(want)>1e-4&&len(have)>1e-4){want=norm(want);have=norm(have);
      roll=Math.atan2(dot(cross(have,want),df),dot(have,want));}
    var Rf1=mm(rot(df,roll*.35),Rfa),Rf2=mm(rot(df,roll),Rfa);
    put(out,IX["lowerarm01."+S],Rf1,A.el,EL);
    var lo2=apply(out,IX["lowerarm01."+S],H0("lowerarm02."+S));
    put(out,IX["lowerarm02."+S],Rf2,H0("lowerarm02."+S),lo2);
    var Rw=align(A.hd,A.pn,hd,pn);
    put(out,IX["wrist."+S],Rw,A.wr,WR);
    /* the fingers close by the grip's curl (p.grip: "open", "grip", "fist", or 0..1) */
    var cu=curlOf(p.grip&&p.grip[s]!=null?p.grip[s]:(typeof (p.grip)==="string"||typeof (p.grip)==="number"?p.grip:null));
    var lat=norm(cross(A.pn,A.hd));
    for(var m=1;m<=4;m++)put(out,IX["metacarpal"+m+"."+S],Rw,A.wr,WR);
    for(var f=1;f<=5;f++){
      var par=f===1?IX["wrist."+S]:IX["metacarpal"+(f-1)+"."+S],c=f===1?cu[1]:cu[0];
      /* the fingers bend about the hand's width; the thumb across the palm */
      var ax=f===1?norm(add(mul(A.hd,.55),mul(A.pn,.2))):lat;
      var Racc=rotOf(out,par);
      for(var j=1;j<=3;j++){
        var nm="finger"+f+"-"+j+"."+S,h0=H0(nm),h=apply(out,par,h0);
        var Rl=mm(Racc,rot(ax,-c[j-1]*R));
        put(out,IX[nm],Rl,h0,h);Racc=Rl;par=IX[nm];}}
    J.sh[s]=SH;J.el[s]=EL;J.wr[s]=WR;J.hd[s]=hd;J.pn[s]=pn;
    /* where the hand holds a handle: in the palm, the fingers round it */
    J.grip[s]=add(add(WR,mul(hd,DIM.palm)),mul(pn,.022));
    /* ---- the leg ---- */
    var HIP=apply(out,IX["pelvis."+S],Lg.hip);
    var at=(p.feet&&p.feet[s])||add(HIP,mul(pf.u,-(Lg.a+Lg.b-.01)));
    var kp=(p.knees&&p.knees[s])||add(pf.f,mul(pf.l,side*.12));
    var lk=ik(HIP,at,Lg.a,Lg.b,kp),KN=lk.mid,AN=lk.end;
    var dt=norm(sub(KN,HIP)),ds=norm(sub(AN,KN));
    /* the knee's hinge: across the thigh, the shin bending behind it */
    var back=cross(dt,mul(lk.pole,-1)),kh=cross(dt,ds);
    if(len(kh)<.05)kh=back;
    kh=norm(kh);
    if(dot(kh,back)<0)kh=mul(kh,-1);
    var Rth=align(sub(Lg.kn,Lg.hip),Lg.hinge,dt,kh);
    put(out,IX["upperleg01."+S],Rth,Lg.hip,HIP);
    put(out,IX["upperleg02."+S],Rth,Lg.hip,HIP);
    var Rsh=align(sub(Lg.an,Lg.kn),Lg.hinge,ds,kh);
    put(out,IX["lowerleg01."+S],Rsh,Lg.kn,KN);
    put(out,IX["lowerleg02."+S],Rsh,Lg.kn,KN);
    /* the foot: its sole along p.footDir (toward the knee's front by default), flat to
       the shin's line unless the pose tips it (p.toes: degrees, toes up positive) */
    var kq=sub(norm(kp),mul(ds,dot(norm(kp),ds))),fwd=len(kq)<1e-4?pf.f:norm(kq);
    var fdir=norm((p.footDir&&p.footDir[s])||fwd),sup=mul(ds,-1);
    fdir=norm(sub(fdir,mul(sup,dot(fdir,sup))));
    var toes=((p.toes&&p.toes[s])||0)*R;
    if(toes){var ta=norm(cross(fdir,sup));fdir=rotAxis(fdir,ta,toes);sup=rotAxis(sup,ta,toes);}
    if(p.sole&&p.sole[s]){sup=norm(p.sole[s]);fdir=norm(sub(fdir,mul(sup,dot(fdir,sup))));}
    var Rft=align(Lg.fdir,[0,1,0],fdir,sup);
    put(out,IX["foot."+S],Rft,Lg.an,AN);
    J.hip[s]=HIP;J.kn[s]=KN;J.an[s]=AN;J.fd[s]={dir:fdir,down:mul(sup,-1),fwd:fwd};});
  return {J:J,M:out};}

/* Where a rest point of the body goes in the pose, by the bones that carry it: for a
   point on the skin, the four bones and weights of its nearest vertex. Used by tests
   and the offline tools. */
function skinPoint(M,q,bones,weights){
  var o=[0,0,0];
  for(var k=0;k<4;k++){var w=weights[k];if(!w)continue;var a=apply(M,bones[k],q);o=add(o,mul(a,w));}
  return o;}

export {BONES, IX, NB, DIM, P0, ARM, LEG, solve, skinPoint, frame, axesFrame, ik, basis, align, rot, mm, mv};

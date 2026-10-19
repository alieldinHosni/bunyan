/* Bunyan — the mannequin: equipment
   The pieces equipment is built from, each a function returning solids (geom.js). An
   exercise lists what it needs as [name, ...arguments]; props() builds the list. The
   free weights are whole (a barbell, a dumbbell, a kettlebell); a machine is put
   together from the kit at the bottom (beams, pads, a seat, a weight-stack tower, a
   pivot and the lever arm that turns on it, grips), so a new machine is a few lines.

   Materials: 2 iron (frames, plates), 3 pads and grips, 4 steel (bars, handles), 5 wall,
   6 mat, 7 the red line on a machine. Group 0: hard-edged, never blended. */
import {V, sphere, capsule, box, cyl} from "./geom.js";

var add=V.add,sub=V.sub,mul=V.mul,dot=V.dot,cross=V.cross,len=V.len,norm=V.norm,lerp=V.lerp;
var R=Math.PI/180,X=[1,0,0],Y=[0,1,0],Z=[0,0,1];

var PROPS={
  /* a barbell centred at c, along o.axis (z by default): o.len its half length, o.sleeve
     how much of each end carries plates, o.plate their radius; o.ez an EZ bar, its
     middle bent twice each side where the hands go */
  barbell:function(c,o){
    o=o||{};var ax=norm(o.axis||Z),L=o.len||1.05,sl=o.sleeve||(o.ez?.26:.44),pr=o.plate||.225,in_=L-sl,out=[];
    function at(t){return add(c,mul(ax,t));}
    if(o.ez){
      var up=norm(sub(Y,mul(ax,dot(Y,ax))));if(len(sub(Y,mul(ax,dot(Y,ax))))<.1)up=X;
      var k=[[0,0],[.05,0],[.1,.028],[.15,0],[.2,.028],[.25,0]];
      [-1,1].forEach(function(s){
        for(var i=1;i<k.length;i++)out.push(capsule(add(at(s*k[i-1][0]),mul(up,k[i-1][1])),add(at(s*k[i][0]),mul(up,k[i][1])),.014,4,0));
        out.push(capsule(at(s*.25),at(s*L),.014,4,0));});}
    else out.push(capsule(at(-L),at(L),.014,4,0));
    [-1,1].forEach(function(s){
      out.push(cyl(at(s*(in_+.03)),at(s*(in_+.09)),pr,.008,2,0));
      out.push(cyl(at(s*(in_+.09)),at(s*(in_+.14)),pr*.82,.008,2,0));
      out.push(cyl(at(s*in_),at(s*(in_+.025)),.03,.004,4,0));});
    return out;},
  /* a dumbbell centred at c, along dir */
  dumbbell:function(c,dir,o){
    o=o||{};var d=norm(dir||Z),hl=.065,r=o.r||.058,w=o.w||.075;
    var out=[capsule(add(c,mul(d,-hl)),add(c,mul(d,hl)),.016,4,0)];
    [-1,1].forEach(function(s){out.push(cyl(add(c,mul(d,s*hl)),add(c,mul(d,s*(hl+w))),r,.012,2,0));});
    return out;},
  /* a kettlebell whose handle is at h, hanging along down */
  kettlebell:function(h,down,o){
    o=o||{};var dn=norm(down||[0,-1,0]),r=o.r||.095,side=Math.abs(dn[2])<.9?norm(cross(dn,Z)):X;
    var c=add(h,mul(dn,.07+r));
    return [sphere(c,r,2,0),capsule(add(h,mul(side,-.055)),add(h,mul(side,.055)),.014,2,0),
      capsule(add(h,mul(side,-.055)),add(c,add(mul(side,-.06),mul(dn,-.05))),.014,2,0),
      capsule(add(h,mul(side,.055)),add(c,add(mul(side,.06),mul(dn,-.05))),.014,2,0),
      cyl(add(c,mul(dn,r*.75)),add(c,mul(dn,r*.95)),r*.62,.01,2,0)];},
  /* a flat bench, pad top at height h, centred at c (x along its length): a soft pad on
     a steel frame, two legs on feet */
  bench:function(c,o){
    o=o||{};var h=o.h||.44,L=o.len||1.15;
    var out=[box([c[0],h-.045,c[2]],X,Y,Z,[L/2,.045,.15],.034,3,0)];
    out.push.apply(out,PROPS.beam([c[0]-L*.43,h-.115,c[2]],[c[0]+L*.43,h-.115,c[2]],.07,.05));
    [-1,1].forEach(function(sx){
      var x=c[0]+sx*L*.38;
      out.push.apply(out,PROPS.beam([x,h-.115,c[2]],[x,.04,c[2]],.06,.06));
      out.push.apply(out,PROPS.beam([x,.022,c[2]-.21],[x,.022,c[2]+.21],.065,.044));});
    return out;},
  /* An adjustable bench set to incline: its back pad's surface rising from c (where it
     meets the seat, under the hips) at ang degrees toward -x; the seat in front, a
     post and a floor rail under them. */
  adjBench:function(c,ang,o){
    o=o||{};var sx=o.prone?-1:1,a=ang*R,d=[-sx*Math.cos(a),Math.sin(a),0],n=[sx*Math.sin(a),Math.cos(a),0],L=o.len||.84,out=[];
    /* prone: lain on face down, the pad rising toward +x and the seat behind */
    if(o.prone)n=[-Math.sin(a),Math.cos(a),0],d=[Math.cos(a),Math.sin(a),0];
    var seatX=c[0]+(o.prone?-.19:.19);
    out.push(box(sub(add(c,mul(d,L/2)),mul(n,.036)),d,n,Z,[L/2,.036,.14],.03,3,0));
    out.push(box([seatX,c[1]-.066,c[2]],X,Y,Z,[.2,.036,.15],.03,3,0));
    var foot=c[0]+d[0]*L*.55;
    out.push.apply(out,PROPS.beam([seatX,c[1]-.12,c[2]],[seatX,.04,c[2]],.07,.07));
    out.push.apply(out,PROPS.beam(sub(add(c,mul(d,L*.5)),mul(n,.09)),[foot,.04,c[2]],.06,.06));
    var x0=Math.min(foot,seatX)-.12,x1=Math.max(foot,seatX)+.12;
    out.push.apply(out,PROPS.beam([x0,.022,c[2]],[x1,.022,c[2]],.09,.044));
    [x0+.05,x1-.05].forEach(function(x){out.push.apply(out,PROPS.beam([x,.022,c[2]-.2],[x,.022,c[2]+.2],.065,.044));});
    return out;},
  /* A decline bench: its pad's surface running down from c (under the hips) at ang
     degrees toward -x, a short pad rising to the knees, and a roller the ankles hook
     under. */
  declineBench:function(c,ang,o){
    o=o||{};var a=ang*R,d=[-Math.cos(a),-Math.sin(a),0],n=[-Math.sin(a),Math.cos(a),0],L=.9,out=[];
    out.push(box(sub(add(c,mul(d,L/2-.12)),mul(n,.036)),d,n,Z,[L/2,.036,.14],.03,3,0));
    var k=[c[0]+.34,c[1]+.08,c[2]];
    out.push(box(sub(lerp(c,k,.5),[0,.04,0]),norm(sub(k,c)),norm(cross(Z,norm(sub(k,c)))),Z,[len(sub(k,c))/2,.03,.13],.025,3,0));
    [-1,1].forEach(function(s){out.push(cyl([k[0]+.2,k[1]-.12,c[2]+s*.02],[k[0]+.2,k[1]-.12,c[2]+s*.16],.045,.02,3,0));});
    out.push.apply(out,PROPS.beam([k[0]+.2,k[1]-.12,c[2]],[k[0]+.08,.04,c[2]],.06,.06));
    var hd=add(c,mul(d,L*.75));
    out.push.apply(out,PROPS.beam([hd[0],hd[1]-.1,c[2]],[hd[0],.04,c[2]],.06,.06));
    out.push.apply(out,PROPS.beam([hd[0]-.05,.022,c[2]],[k[0]+.15,.022,c[2]],.09,.044));
    return out;},
  /* A preacher bench: the arm pad sloping down and forward under the upper arms (sh the
     shoulders' middle, ua the way the upper arms run), a seat, a post. */
  preacher:function(sh,ua,seat){
    var a=norm(ua),n=norm([-a[1],a[0],0]);if(n[1]<0)n=mul(n,-1);
    var c=sub(add(sh,mul(a,.2)),mul(n,.082)),out=[];
    out.push(box(c,a,n,Z,[.15,.035,.2],.03,3,0));
    var foot=[c[0]+.02,.04,c[2]];
    out.push.apply(out,PROPS.beam(sub(c,mul(n,.06)),foot,.07,.07));
    out.push.apply(out,PROPS.beam([(seat?seat[0]:c[0])-.1,.022,c[2]],[c[0]+.35,.022,c[2]],.09,.044));
    /* a standing preacher bench has no seat */
    if(seat){out.push.apply(out,PROPS.soft([seat[0],seat[1]-.04,seat[2]],X,Y,[.18,.04,.18]));
      out.push.apply(out,PROPS.beam([seat[0],seat[1]-.08,seat[2]],[seat[0],.04,seat[2]],.07,.07));}
    return out;},
  /* an inclined back pad from its foot fp, rising at ang degrees toward -x, length L */
  pad:function(fp,ang,L,o){
    o=o||{};var a=ang*R,dir=[-Math.cos(a),Math.sin(a),0],c=add(fp,mul(dir,L/2)),ey=norm(cross(Z,dir));
    return [box(c,norm(dir),mul(ey,-1),Z,[L/2,.035,o.w||.14],.02,3,0)];},
  /* a box (a plyo box, a step) */
  block:function(c,hs,m){return [box(c,X,Y,Z,hs,.02,m||2,0)];},
  /* a wall whose face is at x, toward the figure (who stands near x 0) */
  wall:function(x,o){
    o=o||{};var t=x<0?-.06:.06;
    return [box([x+t,o.h?o.h/2:.85,o.z||0],X,Y,Z,[.06,o.h?o.h/2:.85,o.w||.75],.01,5,0)];},
  /* a door frame at x */
  door:function(x,o){
    o=o||{};var w=o.w||.45;
    return [box([x,1.05,w],X,Y,Z,[.05,1.05,.05],.01,5,0),box([x,1.05,-w],X,Y,Z,[.05,1.05,.05],.01,5,0),
      box([x,2.12,0],X,Y,Z,[.05,.05,w+.05],.01,5,0)];},
  /* a pull-up station: a bar at height h, along z, between two uprights on feet */
  bar:function(h,o){
    o=o||{};var x=o.x||0,w=o.w||.62,out=[capsule([x,h,-w],[x,h,w],.017,4,0)];
    [-w-.05,w+.05].forEach(function(z){
      out.push.apply(out,PROPS.beam([x,0,z],[x,h+.09,z],.075,.075));
      out.push.apply(out,PROPS.beam([x-.38,.022,z],[x+.38,.022,z],.08,.044));});
    out.push.apply(out,PROPS.beam([x,h+.12,-w-.09],[x,h+.12,w+.09],.065,.065));
    return out;},
  /* A Smith machine: the bar rides two steel rails, so it can only go straight up and
     down. c is the bar's centre: the rails stand at its x, z = +-w (inside the plates),
     each in front of an iron post, and the carriages that hold the bar sit on the rails
     at its height. A beam over the top, a rail on the floor each side. */
  smith:function(c,o){
    o=o||{};var x=c[0],w=o.w||.56,h=o.h||2.2,bx=x-.1,out=[];
    [-1,1].forEach(function(s){
      var z=s*w;
      out.push(capsule([x,.08,z],[x,h-.06,z],.016,4,0));
      out.push.apply(out,PROPS.beam([bx,0,z],[bx,h+.07,z],.07,.07));
      [.08,h-.06].forEach(function(y){out.push.apply(out,PROPS.beam([x+.02,y,z],[bx,y,z],.035,.035));});
      out.push.apply(out,PROPS.beam([x-.62,.022,z],[x+.5,.022,z],.08,.044));});
    out.push.apply(out,PROPS.beam([bx,h+.035,-w-.035],[bx,h+.035,w+.035],.07,.07));
    /* the frame is scenery: the camera frames the figure and the bar, not its height */
    out.forEach(function(q){q.bg=1;});
    [-1,1].forEach(function(s){out.push(box([x,c[1],s*w],X,Y,Z,[.032,.07,.03],.008,2,0));});
    return out;},
  /* parallettes: two low bars at z = +-w, centred at x */
  parallettes:function(x,w){
    var out=[];
    [-1,1].forEach(function(s){
      var z=s*(w||.3);
      out.push(capsule([x-.16,.2,z],[x+.16,.2,z],.017,4,0),box([x-.17,.1,z],X,Y,Z,[.015,.1,.03],.006,2,0),
        box([x+.17,.1,z],X,Y,Z,[.015,.1,.03],.006,2,0),box([x-.17,.01,z],X,Y,Z,[.02,.01,.12],.005,2,0),
        box([x+.17,.01,z],X,Y,Z,[.02,.01,.12],.005,2,0));});
    return out;},
  /* a mat on the floor centred at c */
  mat:function(c,o){o=o||{};return [box([c[0],.006,c[2]],X,Y,Z,[o.len||.95,.006,o.w||.33],.004,6,0)];},
  /* a cable column standing at b: a weight-stack tower facing the handle, the pulley at
     height ph on its front, the cable to the handle at hand */
  cable:function(b,ph,hand,o){
    o=o||{};var f=sub([hand[0],0,hand[2]],[b[0],0,b[2]]);f=len(f)<1e-6?[-1,0,0]:norm(f);
    var out=PROPS.tower([b[0],0,b[2]],f,{h:2.15,w:.3,d:.22});
    var pul=add([b[0],ph,b[2]],mul(f,.16)),ax=norm(cross(Y,f));
    out.push(cyl(add(pul,mul(ax,-.022)),add(pul,mul(ax,.022)),.05,.006,4,0),box(sub(pul,mul(f,.04)),f,Y,ax,[.04,.03,.03],.01,2,0));
    out.push(capsule(pul,hand,.0045,4,0));
    if(o.handle!==false)out.push(capsule(add(hand,[0,0,-.06]),add(hand,[0,0,.06]),.015,3,0));
    return out;},

  /* ---- the machine kit ---- */
  /* a square steel tube from a to b, w across and d deep */
  beam:function(a,b,w,d,m){
    var ax=norm(sub(b,a)),L=len(sub(b,a)),up=Math.abs(ax[1])>.9?X:Y;
    up=norm(sub(up,mul(ax,dot(up,ax))));
    return [box(lerp(a,b,.5),ax,up,norm(cross(ax,up)),[L/2,(d||.05)/2,(w||.05)/2],.009,m||2,0)];},
  /* a pad: a soft-edged box by its centre, its long axis, the way it faces, and half
     sizes [along, thick, across] */
  soft:function(c,along,facing,hs,m){
    var ax=norm(along),f=norm(sub(facing,mul(ax,dot(facing,ax))));
    return [box(c,ax,f,norm(cross(ax,f)),hs,Math.min(hs[1],hs[2])*.8,m||3,0)];},
  /* a weight-stack tower standing at c on the floor and facing dir: the housing, its
     dark front, a red line up each edge, a cap and a foot */
  tower:function(c,dir,o){
    o=o||{};var h=o.h||1.8,w=o.w||.38,dp=o.d||.26,f=norm([dir[0],0,dir[2]]),sd=norm(cross(Y,f)),ctr=add(c,[0,h/2,0]);
    return [box(ctr,f,Y,sd,[dp/2,h/2,w/2],.02,2,0),
      box(add(ctr,mul(f,dp/2)),f,Y,sd,[.008,h/2-.09,w/2-.055],.004,3,0),
      box(add(add(ctr,mul(f,dp/2-.035)),mul(sd,w/2+.003)),f,Y,sd,[.008,h/2-.14,.006],.003,7,0),
      box(add(add(ctr,mul(f,dp/2-.035)),mul(sd,-w/2-.003)),f,Y,sd,[.008,h/2-.14,.006],.003,7,0),
      box(add(c,[0,h+.018,0]),f,Y,sd,[dp/2+.02,.018,w/2+.02],.01,2,0),
      box(add(c,[0,.016,0]),f,Y,sd,[dp/2+.09,.016,w/2+.07],.01,2,0)];},
  /* a machine seat: its pad's top centre at c, facing dir, on a post and a floor rail */
  seat:function(c,dir,o){
    o=o||{};var f=norm([dir[0],0,dir[2]]),out=[];
    out.push.apply(out,PROPS.soft(sub(c,[0,.042,0]),f,Y,[o.len||.2,.042,o.w||.19]));
    out.push.apply(out,PROPS.beam(sub(c,[0,.08,0]),[c[0],.04,c[2]],.075,.075));
    out.push.apply(out,PROPS.beam(add([c[0],.022,c[2]],mul(f,-(o.back||.45))),add([c[0],.022,c[2]],mul(f,o.front||.35)),.09,.044));
    return out;},
  /* a grip: a handle in dark rubber through c, along axis */
  grip:function(c,axis,h){var a=norm(axis);h=h||.065;return [capsule(add(c,mul(a,-h)),add(c,mul(a,h)),.017,3,0)];},
  /* a pivot: the hub a lever arm turns on, at c, around axis */
  hub:function(c,axis,r,w){
    var ax=norm(axis);w=w||.07;r=r||.055;
    return [cyl(add(c,mul(ax,-w/2)),add(c,mul(ax,w/2)),r,.01,2,0),cyl(add(c,mul(ax,-w/2-.012)),add(c,mul(ax,w/2+.012)),r*.42,.006,4,0)];},
  /* a lever arm: a rigid steel tube from its pivot to the top of its grip, and the grip,
     along gripAxis, at the far end. It turns as a whole: an exercise moves the grip
     around the pivot and the arm keeps its length (motion.js). */
  lever:function(pivot,grip,gripAxis,o){
    o=o||{};var ga=norm(gripAxis),h=o.h||.07,top=add(grip,mul(ga,h+.01));
    return PROPS.beam(pivot,top,o.w||.05,o.d||.05).concat(PROPS.grip(grip,ga,h));},
  /* a list of shapes made elsewhere */
  raw:function(list){return list;},
  /* a round tube between two points */
  tube:function(a,b,r,m){return [capsule(a,b,r||.024,m||2,0)];},
  /* a disc: a pulley, a flywheel */
  disc:function(c,axis,r,w,m){var ax=norm(axis);return [cyl(add(c,mul(ax,-w/2)),add(c,mul(ax,w/2)),r,.01,m||2,0)];},
  /* a pad by centre, axes and half sizes */
  cushion:function(c,ex,ey,hs){return [box(c,norm(ex),norm(ey),norm(cross(norm(ex),norm(ey))),hs,.02,3,0)];},
  /* the same in iron (a footplate) or another material */
  slab:function(c,ex,ey,hs,m){return [box(c,norm(ex),norm(ey),norm(cross(norm(ex),norm(ey))),hs,.01,m||2,0)];}
};
/* A list of [name, ...arguments] as solids. */
function props(list){
  var out=[];
  (list||[]).forEach(function(p){
    var fn=PROPS[p[0]];
    if(!fn)throw new Error("no prop "+p[0]);
    out.push.apply(out,fn.apply(null,p.slice(1)));});
  return out;}

export {PROPS, props};

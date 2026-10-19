/* Bunyan — the mannequin: the library's movements
   Most of the library is a few movements done with different equipment, grips and
   positions: a curl is a curl with a barbell, dumbbells or a cable; a press is a
   press standing or seated. So the library's records are built by families: each
   family is one movement, written once with its biomechanics (where the joints go,
   what the hands hold, the path the weight takes), and a few parameters for what
   varies (the implement, the grip, the stance, the bench's angle).

   Which family an exercise is, and with what parameters, is written by hand in the
   table at the bottom, by the library's exact name. Nothing is guessed from a name:
   an exercise has a figure only when it is in the table, and it is put in the table
   only once its family has been looked at beside the library's own photographs of it
   (tools/figures/review.mjs). Everything else keeps its photographs.

   A family returns a record (records.js): keys for the body, and a drive that places
   the hands on what they hold at each moment, so the weight and the hands never part.

   World axes, in metres: x forward (the way the figure faces), y up, z the figure's
   left. Pure: no DOM, no state. */
import {V} from "./geom.js";
import {joints, DIM} from "./rig.js";

var add=V.add,sub=V.sub,mul=V.mul,dot=V.dot,cross=V.cross,len=V.len,norm=V.norm,lerp=V.lerp;
var R=Math.PI/180,LR=["l","r"],ANKLE=.078;
/* the arm's reach from the shoulder to the middle of the palm, a little short of locked */
var REACH=DIM.upArm+DIM.foreArm+DIM.palm-.012;

/* ---- small helpers ---- */
function S(x,y,z){return {l:[x,y,z],r:[x,y,-z]};}
function sg(s){return s==="l"?1:-1;}
/* a left-side vector, for side s */
function side(v,s){return s==="l"?v:[v[0],v[1],-v[2]];}
function num(a,b,t){return a+(b-a)*t;}
/* turn v in the figure's side view (about z) by deg, forward and up positive */
function rz(v,deg){var c=Math.cos(deg*R),s=Math.sin(deg*R);return [v[0]*c-v[1]*s,v[0]*s+v[1]*c,v[2]];}
/* a direction in the side view, deg from straight down toward the front */
function sag(deg){return [Math.sin(deg*R),-Math.cos(deg*R),0];}
/* a point along a polyline at u, evenly by length */
function polyAt(pts,u){
  if(pts.length<2)return pts[0];
  var L=[0],i;for(i=1;i<pts.length;i++)L.push(L[i-1]+len(sub(pts[i],pts[i-1])));
  var d=Math.max(0,Math.min(1,u))*L[L.length-1];
  for(i=1;i<pts.length;i++)if(d<=L[i]||i===pts.length-1){
    var f=(d-L[i-1])/Math.max(L[i]-L[i-1],1e-9);return lerp(pts[i-1],pts[i],f);}
  return pts[pts.length-1];}
/* a point on the trunk: du along its up, df forward, dl to its left */
function onTrunk(J,du,df,dl){return add(add(add(J.P,mul(J.pf.u,du)),mul(J.pf.f,df||0)),mul(J.pf.l,dl||0));}
function onChest(J,du,df,dl){return add(add(add(J.P,mul(J.cf.u,du)),mul(J.cf.f,df||0)),mul(J.cf.l,dl||0));}

/* ---- positions ---- */
/* Feet flat on the floor, w from the middle, toes turned out by toe degrees, the knees
   following the toes. */
function stance(w,toe,x){
  var c=Math.cos(toe*R),s=Math.sin(toe*R);
  return {feet:S(x||0,ANKLE,w),footDir:S(c,0,s),sole:S(0,1,0),knees:S(c,0,s+.06)};}
function stand(o){return Object.assign({pelvis:[0,1.04,0]},stance(.13,10),o||{});}
/* Sitting on the end of a flat bench (pad top 0.44), feet flat in front. */
function sit(o){return Object.assign({pelvis:[0,.57,0],feet:S(.42,ANKLE,.2),footDir:S(1,0,.12),sole:S(0,1,0),knees:S(1,.3,.25)},o||{});}
/* Lying face up on a flat bench (pad top 0.44), head toward -x, feet flat on the
   floor either side. */
function lie(o){return Object.assign({pelvis:[.1,.55,0],pitch:-90,feet:S(.6,ANKLE,.27),footDir:S(1,0,.25),sole:S(0,1,0),knees:S(.4,1,.35)},o||{});}
/* Lying face up on the floor, knees bent, feet flat. */
function floorLie(o){return Object.assign({pelvis:[.05,.11,0],pitch:-90,feet:S(.5,ANKLE,.14),footDir:S(1,0,.08),sole:S(0,1,0),knees:S(.3,1,.08)},o||{});}

/* ---- holding ---- */
/* The hands round handles: holds[s] = {g, axis, pn, hd, wrist}. g is where the handle
   is (in the middle of the palm), axis the way it runs; the palm faces pn's side and
   the fingers run the way of the forearm (hd before the forearm is known), bent back
   by wrist degrees. Two passes: the second follows the forearm the first gave. */
function grasp(p,holds){
  p.hands=Object.assign({},p.hands);p.handDir=Object.assign({},p.handDir);p.palm=Object.assign({},p.palm);
  function put(s,f){
    /* the fingers along f, square to the handle; a little of the hint mixed in, so a
       forearm that lines up with the handle cannot flip the hand over */
    var h=holds[s],a=norm(h.axis),g0=h.hd||[0,-1,0],hd=sub(f,mul(a,dot(f,a))),hn=sub(g0,mul(a,dot(g0,a)));
    if(len(hn)>1e-4)hd=add(hd,mul(norm(hn),.35));
    if(len(hd)<1e-4)hd=hn;
    hd=norm(hd);
    var pn=cross(a,hd);if(dot(pn,h.pn)<0)pn=mul(pn,-1);
    if(h.wrist){var w=h.wrist*R,c=Math.cos(w),sn=Math.sin(w),h2=sub(mul(hd,c),mul(pn,sn));pn=add(mul(pn,c),mul(hd,sn));hd=h2;}
    p.handDir[s]=hd;p.palm[s]=pn;
    p.hands[s]=sub(sub(h.g,mul(hd,DIM.palm)),mul(pn,.022));}
  var ss=Object.keys(holds);
  ss.forEach(function(s){put(s,holds[s].hd||[0,-1,0]);});
  var J=joints(p);
  ss.forEach(function(s){put(s,sub(J.wr[s],J.el[s]));});
  return p;}
/* Both hands on a bar along z, centred at c, half a grip width w apart. */
function onBar(p,c,w,pn,hd,wrist){
  var h={};LR.forEach(function(s){h[s]={g:[c[0],c[1],c[2]+sg(s)*w],axis:[0,0,1],pn:pn,hd:hd,wrist:wrist};});
  return grasp(p,h);}
/* An arm by its angles: the elbow from the shoulder along ua, the wrist from the elbow
   along fa; the hand along the forearm unless hd, its palm toward pn. */
function armTo(p,J,s,ua,fa,pn,hd){
  var E=add(J.sh[s],mul(norm(ua),DIM.upArm));
  p.hands=Object.assign({},p.hands);p.handDir=Object.assign({},p.handDir);p.palm=Object.assign({},p.palm);
  p.hands[s]=add(E,mul(norm(fa),DIM.foreArm));p.handDir[s]=norm(hd||fa);p.palm[s]=pn;
  p.elbows=Object.assign({},p.elbows);p.elbows[s]=sub(E,add(J.sh[s],mul(norm(fa),.2)));
  return p;}
/* The joints of a pose as it would stand with its arms down: where the shoulders are,
   before the hands are placed. */
function base(p){var q=Object.assign({},p);delete q.hands;delete q.handDir;delete q.palm;return joints(q);}

/* ---- what the hands hold (kit.js props, from the joints) ---- */
function barIn(J,o){var a=J.grip.l,b=J.grip.r;return ["barbell",lerp(a,b,.5),Object.assign({axis:norm(sub(a,b))},o||{})];}
function dbIn(J,s,o){return ["dumbbell",J.grip[s],norm(cross(J.pn[s],J.hd[s])),o||{}];}
function dbsIn(J,o){return [dbIn(J,"l",o),dbIn(J,"r",o)];}
/* a kettlebell by its handle, the bell hanging from the hand */
function kbIn(J,s,down){return ["kettlebell",J.grip[s],down||[0,-1,0]];}
var BENCH=["bench",[-.25,0,0],{len:1.15}];
/* where a back pad's surface meets the seat, under the hips, from the pelvis */
function padFoot(J){return sub(J.P,mul(J.pf.f,.13));}
/* the bench a lying or reclining pose is on, by its angle */
function benchFor(J,ang){return ang>0?["adjBench",padFoot(J),ang]:ang<0?["declineBench",sub(J.P,mul(J.pf.f,.12)),-ang]:BENCH;}

/* Legs as the bar must clear them: the front of the shins and thighs at height y. */
function legFront(J,y){
  var x=-1e9;
  LR.forEach(function(s){
    [[J.hip[s],J.kn[s],.085],[J.kn[s],J.an[s],.06]].forEach(function(sgm){
      var a=sgm[0],b=sgm[1],lo=Math.min(a[1],b[1]),hi=Math.max(a[1],b[1]);
      if(y<lo-.03||y>hi+.03)return;
      var t=Math.max(0,Math.min(1,(y-a[1])/((b[1]-a[1])||1e-9)));
      x=Math.max(x,a[0]+(b[0]-a[0])*t+sgm[2]);});});
  return x;}
/* Hanging arms: the bar where straight arms put it, in front of the legs. */
function hangBar(J,w,clear){
  var sh=lerp(J.sh.l,J.sh.r,.5),dz=Math.max(0,w-Math.abs(J.sh.l[2]-sh[2])),L=Math.sqrt(Math.max(REACH*REACH-dz*dz,.01));
  var y=sh[1]-L,x=sh[0];
  if(clear!==false){
    for(var k=0;k<3;k++){var f=legFront(J,y)+.02;if(f<=x)break;x=f;y=sh[1]-Math.sqrt(Math.max(L*L-(x-sh[0])*(x-sh[0]),.01));}}
  return [x,y,sh[2]];}

/* One knee and the same side's hand on a flat bench (along x, behind the figure), the
   other foot on the floor: the left arm works. */
function kneelOnBench(){
  return {pelvis:[-.1,.86,0],pitch:80,head:-40,feet:{l:[.0,ANKLE,.26],r:[-.42,.46,-.12]},footDir:{l:[1,0,.15],r:[-1,0,0]},
    sole:{l:[0,1,0],r:[0,1,0]},knees:{l:[1,0,.2],r:[0,-1,0]}};}
/* the other hand flat on the bench, under its shoulder */
function handOnBench(p,J,one){
  var o=one==="l"?"r":"l";
  p.hands=Object.assign({},p.hands);p.handDir=Object.assign({},p.handDir);p.palm=Object.assign({},p.palm);
  p.hands[o]=[Math.min(J.sh[o][0]+.04,.24),.475,-sg(one)*.17];p.handDir[o]=[1,0,0];p.palm[o]=[0,-1,0];
  p.grip=Object.assign({},typeof p.grip==="object"?p.grip:{l:p.grip,r:p.grip});p.grip[o]="open";}

/* An arm that is not working: hanging at the side, or its hand on the hip. */
function freeArm(p,J,s,how){
  p.hands=Object.assign({},p.hands);p.handDir=Object.assign({},p.handDir);p.palm=Object.assign({},p.palm);
  p.elbows=Object.assign({},p.elbows);
  if(how==="hip"){p.hands[s]=onTrunk(J,.1,.02,sg(s)*.2);p.handDir[s]=mul(J.pf.u,-1);p.palm[s]=mul(J.pf.l,-sg(s));p.elbows[s]=side([-.4,0,1],s);}
  else{p.hands[s]=add(J.sh[s],[.02,-(DIM.upArm+DIM.foreArm)*.97,sg(s)*.04]);p.handDir[s]=[0,-1,0];p.palm[s]=[0,0,-sg(s)];p.elbows[s]=side([-1,0,.2],s);}
  p.grip=Object.assign({},typeof p.grip==="object"?p.grip:{l:p.grip,r:p.grip});p.grip[s]=how==="hold"?"grip":.25;}

/* ================= the families ================= */

/* ---- curls: the elbow a hinge by the side, the forearm turning up ----
   imp "bb" | "ez" | "db" | "cable"; grip "sup" (palms up) | "ham" (palms in) | "pro"
   (palms down) | "turn" (in, turning up on the way); w the hands' half width; one:
   one arm works, the other holds still; at: "stand" | "sit" | "incline" | "preacher" */
function curl(o){
  o=o||{};
  var at=o.at||"stand",imp=o.imp||"db",grip=o.grip||"sup";
  var b0=at==="sit"?sit():at==="incline"?sit({pelvis:[0,.6,0],pitch:-35,feet:S(.5,ANKLE,.22)}):
    at==="preacher"?(o.stand?stand({pelvis:[-.2,1.0,0],pitch:6,head:12}):sit({pelvis:[-.16,.6,0],pitch:4,head:12})):stand();
  var th=at==="preacher"?[48,150]:[8,o.top||132],tilt=at==="preacher"?[45,45]:at==="incline"?[-28,-26]:[3,12];
  var w=o.w||(imp==="ez"?.16:.24);
  function arm(p,J,s,u){
    var t=num(th[0],th[1],u),k=num(tilt[0],tilt[1],u);
    var ua=sag(k);
    if(at==="preacher")ua=sag(45);
    var E=add(J.sh[s],mul(ua,DIM.upArm)),dz=(sg(s)*w-E[2])/(DIM.foreArm+DIM.palm);
    var fa=norm(add(sag(t),[0,0,dz]));
    var up=rz(sag(t),90);
    var pn=grip==="sup"?up:grip==="pro"?mul(up,-1):grip==="ham"?[0,0,-sg(s)]:norm(lerp([0,0,-sg(s)],up,Math.min(1,u*1.6)));
    armTo(p,J,s,ua,fa,pn);}
  var rec={keys:[b0,b0],tempo:[1.1,.3,1.7,.5],cam:{yaw:at==="incline"?70:at==="preacher"?40:32,pitch:8},arrow:{track:"wr.l"},
    drive:function(p,u){
      var J=base(p);
      p.grip="grip";
      LR.forEach(function(s){
        if(o.single&&o.one!==s&&at!=="preacher"){freeArm(p,J,s,"hang");return;}
        arm(p,J,s,o.one&&o.one!==s?0:u);
        if(o.single&&o.one!==s){p.grip=Object.assign({},{l:"grip",r:"grip"});p.grip[s]=.3;}});},
    equip:function(J){
      var e=[];
      if(imp==="bb"||imp==="ez")e.push(barIn(J,{plate:.12,len:imp==="ez"?.62:.75,sleeve:imp==="ez"?.26:.22,ez:imp==="ez"}));
      else if(imp==="db")e=e.concat(o.single?[dbIn(J,o.one)]:dbsIn(J));
      else if(imp==="cable"){var mid=lerp(J.grip.l,J.grip.r,.5);
        e.push(["cable",[.75,0,0],.12,mid,{handle:false}],["grip",mid,norm(sub(J.grip.l,J.grip.r)),.24]);}
      if(at==="sit")e.push(BENCH);
      if(at==="incline")e.push(["adjBench",padFoot(J),55]);
      if(at==="preacher")e.push(["preacher",lerp(J.sh.l,J.sh.r,.5),sag(45),o.stand?null:[J.P[0]-.02,J.P[1]-.13,0]]);
      return e;}};
  if(o.one)rec.arrow={track:"wr."+o.one};
  return rec;}

/* ---- overhead presses: from the shoulders to straight arms overhead ----
   imp "bb" | "db" | "kb"; at "stand" | "sit" (an upright back pad); w half width;
   arnold: the dumbbells turn from palms-in in front of the face to palms forward;
   one: one arm */
function press(o){
  o=o||{};
  var imp=o.imp||"bb",at=o.at||"stand";
  var b0=at==="sit"?sit({pelvis:[-.02,.57,0],pitch:-6}):stand({pelvis:[0,1.04,0],pitch:-2});
  if(o.behind)b0.head=14;
  var rec={keys:[b0,b0],tempo:[1.0,.3,1.6,.5],cam:{yaw:o.behind?140:50,pitch:6},arrow:{track:"wr.l"},refine:{Shoulders:"Front delts"},
    drive:function(p,u){
      var J=base(p),sh=lerp(J.sh.l,J.sh.r,.5),y=sh[1],x=sh[0];
      if(imp==="bb"){
        var w=o.w||.27,c=o.behind?lerp([x-.13,y+.07,0],[x-.03,y+.56,0],u):polyAt([[x+.12,y+.03,0],[x+.17,y+.22,0],[x+.04,y+.56,0]],u);
        onBar(p,c,o.behind?.36:w,[1,.2,0],[0,1,0],o.behind?8:18);
        p.elbows=o.behind?S(.1,-1,1):S(.8,-1,.25);}
      else{
        var h={};
        LR.forEach(function(s){
          var t=o.one&&o.one!==s?0:u;
          var lo=o.arnold?[x+.17,y+.03,.1]:o.palmsIn?[x+.08,y+.06,.25]:[x+.03,y+.07,.33],hi=[x+.02,y+.55,o.palmsIn?.14:.17];
          var g=lerp(lo,hi,t);g[2]*=sg(s);
          var ang=o.arnold?num(0,180,Math.min(1,t*1.25)):180;
          /* the palm: toward the face (0) round through the outside to forward (180) */
          var pn=o.palmsIn?[0,.1,-sg(s)]:norm([-Math.cos(ang*R),.15,sg(s)*Math.sin(ang*R)*.8]);
          h[s]={g:g,axis:[0,0,1],pn:pn,hd:[0,1,0],wrist:8};
          if(o.arnold||imp==="kb"||o.palmsIn)h[s].axis=norm(cross(pn,[0,1,0]));});
        grasp(p,h);
        p.elbows=o.arnold||o.palmsIn?S(1,-1,.1):S(.1,-1,1);
        if(o.free==="hang"){var fs=o.one==="l"?"r":"l";freeArm(p,J,fs,"hold");p.grip=Object.assign({},p.grip);}}
      p.grip="grip";},
    equip:function(J){
      var e=[];
      if(imp==="bb")e.push(barIn(J));
      else if(imp==="db"){e=e.concat(dbsIn(J));if(o.free==="hang")e[e.length-(o.one==="l"?1:2)]=["dumbbell",J.grip[o.one==="l"?"r":"l"],[1,0,0]];}
      else e.push(kbIn(J,"l",norm(sub(J.el.l,J.wr.l))),kbIn(J,"r",norm(sub(J.el.r,J.wr.r))));
      if(at==="sit")e.push(["adjBench",padFoot(J),84]);
      return e;}};
  if(o.one)rec.arrow={track:"wr."+o.one};
  return rec;}

/* ---- raises: a nearly straight arm swung up from the side or the front ----
   dir "side" | "front" | "rear" (bent over); imp "db" | "plate" | "cable" | "bb";
   at "stand" | "sit"; one */
function raise(o){
  o=o||{};
  var dir=o.dir||"side",imp=o.imp||"db";
  var prone=o.at==="prone";
  var b0=prone?{pelvis:[-.2,.78,0],pitch:55,head:-10,feet:S(-.42,ANKLE,.24),footDir:S(1,0,.15),sole:S(0,1,0),knees:S(1,-.4,.25)}:
    dir==="rear"?stand({pelvis:[-.17,.98,0],pitch:68,head:-25,knees:S(1,0,.15)}):o.at==="sit"?sit():stand();
  var top=o.top||(dir==="front"?92:dir==="rear"?78:86);
  var rec={keys:[b0,b0],tempo:[1.0,.3,1.6,.5],cam:{yaw:dir==="side"?20:dir==="rear"?30:imp==="plate"?32:65,pitch:dir==="rear"?20:8},arrow:{track:"wr.l"},
    refine:{Shoulders:dir==="front"?"Front delts":dir==="rear"?"Rear delts":"Side delts"},
    drive:function(p,u){
      var J=base(p);
      LR.forEach(function(s){
        /* a plate held in both hands starts in front of the thighs, not in them */
        var t=(o.one&&o.one!==s)?0:u,a=num(dir==="side"?10:imp==="plate"||imp==="bb"?20:6,top,t)*R,d,pn;
        if(dir==="front"){d=[Math.sin(a),-Math.cos(a),sg(s)*.12];pn=[-Math.cos(a),-Math.sin(a),0];}
        else if(dir==="side"){d=[.12,-Math.cos(a),sg(s)*Math.sin(a)];pn=[0,-Math.sin(a),-sg(s)*Math.cos(a)];}
        else{/* bent over: out to the sides from the trunk's front, in the trunk's frame */
          var f=J.pf.f,l=mul(J.pf.l,sg(s)),dn=mul(J.pf.f,1);
          d=norm(add(mul(dn,Math.cos(a)),mul(l,Math.sin(a))));pn=norm(sub(mul(l,-Math.cos(a)),mul(f,Math.sin(a))));
          d=add(d,mul(J.pf.u,-.05));}
        d=norm(d);
        /* the elbow a little bent: the forearm turned 14 degrees up from the arm's line */
        var bend=norm(add(d,mul(dir==="rear"?mul(J.pf.f,-1):[0,1,0],.25)));
        armTo(p,J,s,d,bend,pn);
        p.elbows[s]=dir==="front"?side([0,-.2,1],s):dir==="side"?[-.4,.3,0]:mul(J.pf.u,1);});
      p.grip="grip";
      if(o.single)freeArm(p,J,o.one==="l"?"r":"l","hang");},
    equip:function(J){
      var e=imp==="plate"?[["disc",lerp(J.grip.l,J.grip.r,.5),[1,0,0],.17,.03,2]]:imp==="bb"?[barIn(J,{plate:.12,len:.75,sleeve:.22})]:o.single?[dbIn(J,o.one)]:dbsIn(J);
      if(prone)e.push(["adjBench",add(J.P,mul(J.pf.f,.14)),35,{prone:true,len:.6}]);
      if(o.at==="sit")e.push(BENCH);
      return e;}};
  if(o.one)rec.arrow={track:"wr."+o.one};
  return rec;}

/* ---- shrugs: arms long, the shoulders lifted toward the ears ----
   imp "bb" | "db"; behind: the bar behind the body */
function shrug(o){
  o=o||{};
  var imp=o.imp||"bb";
  var k0=stand({shrug:0}),k1=stand({shrug:32});
  return {keys:[k0,k1],tempo:[.8,.6,1.2,.5],cam:{yaw:150,pitch:8},arrow:{track:"sh.l"},refine:{Back:"Traps"},
    drive:function(p){
      var J=base(p),h={};
      LR.forEach(function(s){
        var x=imp==="db"?J.sh[s][0]:(o.behind?-.13:Math.max(J.sh[s][0],.13));
        var z=imp==="db"?sg(s)*.25:sg(s)*.26,y=J.sh[s][1]-Math.sqrt(Math.max(REACH*REACH-(x-J.sh[s][0])*(x-J.sh[s][0])-(z-J.sh[s][2])*(z-J.sh[s][2]),.01));
        h[s]={g:[x,y,z],axis:imp==="db"?[1,0,0]:[0,0,1],pn:imp==="db"?[0,0,-sg(s)]:o.behind?[1,0,0]:[-1,0,0],hd:[0,-1,0]};});
      grasp(p,h);p.grip="grip";},
    equip:function(J){return imp==="db"?dbsIn(J):[barIn(J)];}};}

/* ---- upright rows: a narrow bar drawn up the body, the elbows leading high ---- */
function uprightRow(o){
  o=o||{};
  var imp=o.imp||"bb",b0=stand();
  return {keys:[b0,b0],tempo:[1.0,.3,1.5,.5],cam:{yaw:45,pitch:6},arrow:{track:"wr.l"},refine:{Back:"Traps"},
    drive:function(p,u){
      var J=base(p),sh=lerp(J.sh.l,J.sh.r,.5);
      var c=lerp([.15,sh[1]-.56,0],[.15,sh[1]-.06,0],u);
      var w=imp==="db"?.13:.1;
      onBar(p,c,w,[-1,0,0],[0,-1,0],-10);
      p.elbows=S(-.2,1,1);p.grip="grip";},
    equip:function(J){
      if(imp==="db")return [["dumbbell",J.grip.l,[0,0,1]],["dumbbell",J.grip.r,[0,0,1]]];
      if(imp==="cable"){var mid=lerp(J.grip.l,J.grip.r,.5);return [["cable",[.7,0,0],.12,mid,{handle:false}],["grip",mid,[0,0,1],.18]];}
      return [barIn(J,{plate:.16})];}};}

/* ---- squats ----
   load "back" | "front" | "goblet" | "db" (at the sides) | "none" (arms forward) |
   "overhead"; w stance; depth "full" | "parallel"; box: sitting back to a box */
function squat(o){
  o=o||{};
  var load=o.load||"back",w=o.w||.19,toe=o.toe||22;
  var lean=load==="front"||load==="cross"||load==="goblet"||load==="kb"||load==="overhead"?24:load==="none"||load==="prisoner"?28:38;
  var deep=o.depth==="full";
  var top=Object.assign(stand({pelvis:[0,1.04,0],pitch:load==="back"?6:2}),stance(w,toe));
  var bot=Object.assign(stand({pelvis:[deep?-.15:-.2,deep?.5:.6,0],pitch:lean+(deep?4:0),head:-lean*.5}),stance(w,toe));
  var rec={keys:[bot,top],tempo:[1.2,.3,1.7,.5],cam:{yaw:(load==="back"||load==="db"||load==="none")&&w<.26?62:38,pitch:8},arrow:{track:"P"},refine:{Glutes:"Glutes"},
    drive:function(p){
      var J=base(p),h={};
      if(load==="back"){var B=onChest(J,.41,-.1);onBar(p,B,o.grip||.42,[1,.3,0],[0,1,0],10);p.elbows=S(-.4,-1,.6);}
      else if(load==="front"){var F=onChest(J,.42,.11);onBar(p,F,.25,[0,1,-.4],[1,.3,0],50);p.elbows=S(1,.3,.4);}
      else if(load==="overhead"){var O=add(lerp(J.sh.l,J.sh.r,.5),add(mul(J.cf.u,.48),mul(J.cf.f,-.04)));O=[O[0],O[1],0];
        var sh0=lerp(J.sh.l,J.sh.r,.5);O=add(sh0,mul(norm([-.08,1,0]),.5));onBar(p,O,.55,[1,.3,0],[0,1,0],14);p.elbows=S(-.3,-.2,1);}
      else if(load==="goblet"||load==="kb"){var G=onChest(J,.26,.2);
        LR.forEach(function(s){h[s]={g:add(G,[0,load==="kb"?.02:-.02,sg(s)*(load==="kb"?.07:.055)]),axis:[0,1,0],pn:[0,.2,-sg(s)],hd:[1,.4,0]};});
        grasp(p,h);p.elbows=S(.3,-1,.2);}
      else if(load==="cross"){var X=onChest(J,.42,.11);onBar(p,X,.3,[0,-1,0],[0,0,1],0);
        LR.forEach(function(s){p.hands[s]=onChest(J,.34,.16,-sg(s)*.13);p.handDir[s]=norm(add(mul(J.cf.l,-sg(s)),[0,.4,0]));p.palm[s]=[0,-1,0];});
        p.elbows=S(1,.25,-.1);}
      else if(load==="prisoner"){LR.forEach(function(s){p.hands=Object.assign({},p.hands);p.hands[s]=add(J.head,add(mul(J.hf,-.11),add(mul(J.hu,-.04),mul(J.cf.l,sg(s)*.05))));});
        p.handDir={l:mul(J.cf.l,-1),r:J.cf.l};p.palm={l:mul(J.hf,1),r:mul(J.hf,1)};p.elbows=S(.2,.2,1);}
      else if(load==="db"){LR.forEach(function(s){var g=add(J.sh[s],[0,-REACH*.98,sg(s)*.05]);h[s]={g:g,axis:[1,0,0],pn:[0,0,-sg(s)],hd:[0,-1,0]};});grasp(p,h);}
      else{LR.forEach(function(s){h[s]={g:add(J.sh[s],[REACH*.95,-.03,-sg(s)*.06]),axis:[0,1,0],pn:[0,0,-sg(s)],hd:[1,0,0]};});grasp(p,h);p.elbows=S(0,-1,.3);}
      p.grip=load==="none"||load==="prisoner"?"open":load==="cross"?.6:"grip";},
    equip:function(J){
      var e=[];
      if(load==="back"||load==="front"||load==="overhead")e.push(barIn(J));
      else if(load==="cross"){var c0=onChest(J,.42,.11);e.push(["barbell",[c0[0],c0[1],0],{}]);}
      else if(load==="goblet")e.push(["dumbbell",lerp(J.grip.l,J.grip.r,.5),[0,1,0]]);
      else if(load==="kb")e.push(["kettlebell",add(lerp(J.grip.l,J.grip.r,.5),[0,.01,0]),[0,-1,0]]);
      else if(load==="db")e=e.concat(dbsIn(J));
      if(o.box)e.push(["block",[-.42,.21,0],[.2,.21,.22]]);
      return e;}};
  return rec;}

/* ---- hinges: deadlifts, Romanian deadlifts, good mornings ----
   kind "deadlift" | "rdl" | "stiff" | "sumo" | "goodmorning"; imp "bb" | "db" */
function hinge(o){
  o=o||{};
  var kind=o.kind||"deadlift",imp=o.imp||"bb";
  var sumo=kind==="sumo",gm=kind==="goodmorning";
  var st=sumo?stance(o.w||.36,35):stance(o.w||.13,o.w?20:8);
  var lo=kind==="deadlift"?{pelvis:[-.25,.63,0],pitch:58,head:-30}:sumo?{pelvis:[-.18,.6,0],pitch:40,head:-25}:
    kind==="stiff"?{pelvis:[-.2,1.0,0],pitch:82,head:-35}:gm?{pelvis:[-.2,.97,0],pitch:72,head:-30}:{pelvis:[-.22,.95,0],pitch:76,head:-35};
  var bot=Object.assign(stand(lo),st),top=Object.assign(stand({pitch:-2}),st);
  if(kind==="deadlift"||sumo){bot.knees=sumo?S(.6,0,1):S(1,0,.4);}
  if(kind==="stiff"){bot.knees=S(1,0,.1);}
  return {keys:[bot,top],tempo:[1.2,.4,1.8,.6],cam:{yaw:sumo?38:gm?84:72,pitch:6},arrow:{track:gm?"sh.l":"wr.l"},
    refine:{Back:"Lower back"},
    drive:function(p){
      var J=base(p);
      if(gm){var B=onChest(J,.41,-.1);onBar(p,B,.42,[1,.3,0],[0,1,0],10);p.elbows=S(-.4,-1,.6);p.grip="grip";return;}
      if(imp==="db"){var h={};LR.forEach(function(s){var g=hangBar(J,.2);h[s]={g:[g[0],g[1],sg(s)*.2],axis:[0,0,1],pn:[-1,0,0],hd:[0,-1,0]};});grasp(p,h);}
      else{var w=sumo?.17:.25,c=hangBar(J,w,!sumo);if(kind==="deadlift"||sumo)c[1]=Math.max(c[1],.225);onBar(p,c,w,[-1,0,0],[0,-1,0],0);}
      p.elbows=S(-1,0,.2);p.grip="grip";},
    equip:function(J){return imp==="db"?dbsIn(J):[barIn(J)];}};}

/* ---- bent-over rows: the trunk leaning forward, the weight pulled to the body ----
   imp "bb" | "db" | "kb"; grip "pro" | "sup" | "ham"; one: one arm, the other hand
   and knee on a bench */
function row(o){
  o=o||{};
  var imp=o.imp||"bb",grip=o.grip||(imp==="bb"?"pro":"ham");
  var one=o.one;
  var b0=one?kneelOnBench():stand({pelvis:[-.17,.92,0],pitch:62,head:-28,knees:S(1,0,.18)});
  var rec={keys:[b0,b0],tempo:[1.0,.4,1.5,.5],cam:{yaw:one?110:120,pitch:14},arrow:{track:"wr."+(one||"l")},refine:{Back:"Lats"},
    drive:function(p,u){
      var J=base(p),h={};
      LR.forEach(function(s){
        if(one&&s!==one){h[s]={g:add(J.sh[s],[0,-REACH*.96,0]),axis:[1,0,0],pn:[0,-1,0],hd:[0,-1,0]};return;}
        var down=add(J.sh[s],[.02,-REACH*.97,0]);
        var w=imp==="bb"?.26:.21,top=onTrunk(J,.18,.17,sg(s)*w);
        down[2]=sg(s)*(imp==="bb"?.26:.22);
        var g=lerp(down,top,u);
        var pn=grip==="pro"?[-1,0,0]:grip==="sup"?[1,0,0]:[0,0,-sg(s)];
        h[s]={g:g,axis:grip==="ham"?[1,0,0]:[0,0,1],pn:pn,hd:[0,-1,0]};});
      grasp(p,h);
      p.grip="grip";
      if(one)handOnBench(p,J,one);
      p.elbows=S(-1,.4,.25);if(one)p.elbows[one==="l"?"r":"l"]=[-1,0,0];},
    equip:function(J){
      var e=[];
      if(imp==="bb")e.push(barIn(J));
      else if(one)e.push(imp==="kb"?kbIn(J,one):dbIn(J,one));
      else e=e.concat(imp==="kb"?[kbIn(J,"l"),kbIn(J,"r")]:dbsIn(J));
      if(one)e.push(["bench",[-.25,0,-sg(one)*.16],{len:1.15}]);
      return e;}};
  if(one)rec.refine={Back:"Lats"};
  return rec;}

/* ---- bench presses: lying, the weight from the chest to straight arms ----
   imp "bb" | "db"; angle: the bench's (0 flat, 30 incline, -20 decline); w half width;
   grip "pro" | "ham" (dumbbells, palms in); floor: on the floor, no bench */
function benchPress(o){
  o=o||{};
  var imp=o.imp||"bb",ang=o.angle||0,w=o.w||.4;
  var b0=o.floor?floorLie({pelvis:[.1,.12,0]}):ang>0?sit({pelvis:[.02,.6,0],pitch:-90+ang,feet:S(.5,ANKLE,.26)}):
    ang<0?lie({pelvis:[.1,.62,0],pitch:-90+ang,feet:S(.5,.42,.16),footDir:S(1,.3,.1),knees:S(.3,1,.1),sole:S(-.3,1,0)}):lie();
  var rec={keys:[b0,b0],tempo:[1.0,.3,1.6,.5],cam:{yaw:o.floor?60:62,pitch:16},arrow:{track:"wr.l"},
    refine:ang>0?{Chest:"Upper chest",Shoulders:"Front delts"}:{Shoulders:"Front delts"},
    drive:function(p,u){
      var J=base(p),sh=lerp(J.sh.l,J.sh.r,.5),up=[0,1,0];
      var low=onChest(J,ang>0?.33:.29,.16),high=add(sh,add(mul(up,.53),mul(J.cf.u,-.03)));
      if(imp==="bb"){
        var c=lerp(low,high,u);c[2]=0;
        var tf=mul(J.cf.u,-1);  /* toward the feet */
        onBar(p,c,w,norm(add(tf,[0,.5,0])),norm(add(up,mul(J.cf.u,.15))),20);
        p.elbows=S(0,-.7,1);p.elbows.l=add(p.elbows.l,mul(tf,.4));p.elbows.r=add(p.elbows.r,mul(tf,.4));}
      else{
        var h={};
        LR.forEach(function(s){
          var gl=add(onChest(J,.3,.1),[0,0,sg(s)*.3]),gh=add(high,[0,0,sg(s)*.16]);
          var g=lerp(gl,gh,u),tf=mul(J.cf.u,-1);
          h[s]={g:g,axis:o.grip==="ham"?norm(J.cf.u):[0,0,1],pn:o.grip==="ham"?[0,.2,-sg(s)]:norm(add(tf,[0,.5,0])),hd:[0,1,0],wrist:10};});
        grasp(p,h);
        p.elbows=o.grip==="ham"?S(.3,-1,.5):S(0,-.7,1);}
      p.grip="grip";},
    equip:function(J){
      var e=[];
      if(imp==="bb")e.push(barIn(J));else e=e.concat(dbsIn(J));
      if(!o.floor)e.push(benchFor(J,ang));
      return e;}};
  return rec;}

/* ---- flyes: lying, the arms opening wide in an arc and closing over the chest ----
   angle as benchPress; imp "db" | "cable" */
function fly(o){
  o=o||{};
  var ang=o.angle||0,imp=o.imp||"db";
  var b0=ang>0?sit({pelvis:[.02,.6,0],pitch:-90+ang,feet:S(.5,ANKLE,.26)}):ang<0?lie({pelvis:[.1,.62,0],pitch:-90+ang,feet:S(.5,.42,.16),footDir:S(1,.3,.1),knees:S(.3,1,.1),sole:S(-.3,1,0)}):lie();
  return {keys:[b0,b0],tempo:[1.1,.3,1.7,.5],cam:{yaw:20,pitch:28},arrow:{track:"wr.l"},
    refine:ang>0?{Chest:"Upper chest",Shoulders:"Front delts"}:{Shoulders:"Front delts"},
    drive:function(p,u){
      var J=base(p),up=[0,1,0],tf=mul(J.cf.u,-1);
      LR.forEach(function(s){
        var a=num(82,8,u)*R,l=[0,0,sg(s)];
        var d=norm(add(add(mul(up,Math.cos(a)),mul(l,Math.sin(a))),mul(tf,.12)));
        var pn=norm(sub(mul(up,Math.sin(a)),mul(l,Math.cos(a))));
        var fa=norm(add(d,mul(sub([0,0,0],l),num(.38,.22,u))));
        armTo(p,J,s,d,fa,pn);
        p.elbows[s]=add(mul(tf,.5),[0,-1,0]);});
      p.grip="grip";},
    equip:function(J){
      var e=dbsIn(J);
      e.push(benchFor(J,ang));
      return e;}};}

/* ---- triceps: the upper arm held still, the elbow straightening ----
   kind "overhead" (arms up beside the head) | "lying" (skull crusher, on a bench) |
   "kickback" (bent over, the arm back) | "pushdown" (a cable from above);
   imp "db" | "db1" (one dumbbell in both hands) | "bb" | "ez" | "rope" | "bar"; one; at */
function triceps(o){
  o=o||{};
  var kind=o.kind||"overhead",imp=o.imp||"db";
  var b0=kind==="lying"?lie():kind==="kickback"?(o.one?kneelOnBench():stand({pelvis:[-.16,.93,0],pitch:68,head:-30,knees:S(1,0,.15)})):
    kind==="pushdown"?stand({pitch:8}):o.at==="sit"?sit({pelvis:[-.02,.57,0],pitch:-6}):stand();
  return {keys:[b0,b0],tempo:[1.0,.3,1.5,.5],cam:{yaw:kind==="lying"?62:kind==="kickback"?100:kind==="pushdown"?82:40,pitch:kind==="lying"?18:8},arrow:{track:"wr."+(o.one||"l")},
    drive:function(p,u){
      var J=base(p),both=imp==="db1"||imp==="ez"||imp==="bb"||imp==="rope"||imp==="bar";
      LR.forEach(function(s){
        var t=(o.one&&o.one!==s)?0:u,ua,fa,pn,w;
        if(kind==="overhead"){
          ua=norm([.12,1,sg(s)*(both?-.05:.04)]);
          fa=norm(add(rz([0,1,0],num(140,6,t)),[0,0,sg(s)*(both?-.18:0)]));
          pn=imp==="db"?[0,0,-sg(s)]:rz([0,1,0],num(140,6,t)+90);}
        else if(kind==="lying"){
          ua=norm(add([0,1,0],mul(J.cf.u,.22)));
          var a=num(118,0,t);fa=norm(add(mul([0,1,0],Math.cos(a*R)),mul(J.cf.u,Math.sin(a*R))));
          pn=norm(cross(fa,[0,0,1]));if(dot(pn,mul(J.cf.u,-1))<0)pn=mul(pn,-1);
          if(imp==="db")pn=[0,0,-sg(s)];}
        else if(kind==="kickback"){
          ua=norm(add(mul(J.pf.u,-1),[0,-.08,0]));
          var k=num(92,0,t)*R;fa=norm(add(mul(ua,Math.cos(k)),mul([0,-1,0],Math.sin(k))));
          pn=[0,0,-sg(s)];}
        else{
          ua=norm([.1,-1,sg(s)*.02]);
          var q=num(80,4,t)*R;fa=norm([Math.sin(q),-Math.cos(q),imp==="rope"?sg(s)*num(.05,.25,t):-sg(s)*.04]);
          pn=imp==="rope"?[0,0,-sg(s)]:rz(fa,-90);}
        if(kind==="kickback"&&o.one&&o.one!==s)return;
        if(kind==="overhead"&&o.one&&o.one!==s){freeArm(p,J,s,"hip");return;}
        armTo(p,J,s,ua,fa,pn);
        if(kind==="overhead")p.elbows[s]=side([.6,1,.1],s);});
      if(!(kind==="overhead"&&o.one))p.grip="grip";
      else{p.grip=Object.assign({},p.grip);p.grip[o.one]="grip";}
      if(kind==="kickback"&&o.one)handOnBench(p,J,o.one);},
    equip:function(J){
      var e=[];
      if(imp==="db"){if(o.one)e.push(dbIn(J,o.one));else e=e.concat(dbsIn(J));}
      else if(imp==="db1"){var m=lerp(J.grip.l,J.grip.r,.5);e.push(["dumbbell",add(m,mul(J.hd.l,-.02)),J.hd.l]);}
      else if(imp==="bb"||imp==="ez")e.push(barIn(J,{plate:.16,len:imp==="ez"?.62:1.05,ez:imp==="ez"}));
      if(kind==="pushdown"){var mid=lerp(J.grip.l,J.grip.r,.5);
        e.push(["cable",[.62,0,0],2.05,mid,{handle:false}]);
        if(imp==="rope")e.push(["tube",J.grip.l,mid,.012,3],["tube",J.grip.r,mid,.012,3]);
        else e.push(["grip",mid,norm(sub(J.grip.l,J.grip.r)),.15]);}
      if(kind==="lying")e.push(BENCH);
      if(o.at==="sit")e.push(["adjBench",padFoot(J),84]);
      if(kind==="kickback"&&o.one)e.push(["bench",[-.25,0,-sg(o.one)*.16],{len:1.15}]);
      return e;}};}

/* ---- push-ups: the body a straight line from the heels, lowered to the floor ----
   w hands' half width; feet "floor" | "bench" (feet raised); hands "floor" | "bench"
   (an incline) */
function pushup(o){
  o=o||{};
  var w=o.w||.3,hy=o.hands==="bench"?.46:o.hands==="bar"?.8:0,fy=o.feet==="bench"?.46:0;
  /* where the shoulders are, top and bottom, and the line to the feet */
  function at(shY,shX){
    var ax=-1.36,fx=ax+shX;
    var dy=(shY-(fy+.12)),L=Math.sqrt(1.36*1.36-dy*dy),u=norm([L,dy,0]);
    var P=sub([shX,shY,0],mul(u,.405));
    var pitch=90-Math.atan2(dy,L)/R;
    var bar=o.hands==="bar";
    return {pelvis:P,pitch:pitch,head:-12,feet:S(shX-L-.03,fy+.12,.1),footDir:S(.15,-1,0),sole:S(1,.15,0),knees:S(0,-1,0),
      hands:bar?S(shX-.05,hy-.03,w):S(shX+.02,hy+.03,w),handDir:bar?S(1,.5,0):S(1,0,-.15),palm:bar?S(.5,-1,0):S(0,-1,0),elbows:S(-.4,0,1),grip:bar?"grip":"open"};}
  /* at the top the arms are long: how high that holds the shoulders over the hands,
     for this width */
  var handY=o.hands==="bar"?hy-.03:hy+.03,arm=(DIM.upArm+DIM.foreArm)*.985;
  var topY=handY+Math.sqrt(Math.max(.2,arm*arm-Math.pow(w-.23,2)-.004)),botY=hy+.16;
  return {keys:[at(botY,.04),at(topY,0)],tempo:[1.0,.3,1.5,.5],cam:{yaw:62,pitch:10},arrow:{track:"sh.l"},
    refine:{Shoulders:"Front delts"},
    equip:function(){
      var e=[["mat",[-.5,0,0],{len:1.0,w:.38}]];
      if(o.hands==="bench")e.push(["block",[.02,.21,0],[.18,.23,.45]]);
      if(o.hands==="bar")e.push(["bar",.8,{w:.65,x:.06}]);
      if(o.feet==="bench")e.push(["block",[-1.33,.21,0],[.18,.23,.3]]);
      return e;}};}

/* ---- pull-ups and chin-ups: hanging from a bar, pulled until the chin is over it ----
   grip "pro" (palms away) | "sup" (palms toward) | "ham"; w */
function pullup(o){
  o=o||{};
  var grip=o.grip||"pro",w=o.w||(grip==="sup"?.2:.4),H=2.3;
  function pose(shY,x,lean){return {pelvis:[x-.02,shY-.4,0],pitch:lean,head:-14,feet:S(x+.06,shY-1.37,.1),footDir:S(.3,-1,0),sole:S(1,.3,0),knees:S(1,0,.05)};}
  var bot=pose(H-.57,-.02,-4),top=pose(H-.12,-.1,-14);
  return {keys:[bot,top],tempo:[1.1,.4,1.6,.6],cam:{yaw:150,pitch:4},arrow:{track:"sh.l"},refine:{Back:"Lats"},
    drive:function(p){
      onBar(p,[0,H,0],w,grip==="sup"?[-1,0,0]:[1,0,0],[0,1,0],0);
      if(grip==="ham"){var h={};LR.forEach(function(s){h[s]={g:[0,H,sg(s)*.13],axis:[1,0,0],pn:[0,0,-sg(s)],hd:[0,1,0]};});grasp(p,h);}
      p.elbows=grip==="sup"?S(.5,-1,.4):S(-.1,-1,1);p.grip="grip";},
    equip:function(){return [["bar",H,{w:.62}]];}};}

/* ---- dips: on parallel bars, the body lowered until the upper arms are level ----
   lean: the trunk forward (chest) or upright (triceps); bench: hands on a bench behind */
function dip(o){
  o=o||{};
  var lean=o.lean||8,Y=1.22;
  function pose(shY,pitch){return {pelvis:[-.1*pitch/20,shY-.4,0],pitch:pitch,head:-5,feet:S(-.25,shY-1.05,.08),footDir:S(-.2,-1,0),sole:S(1,-.2,0),knees:S(-1,-.4,0),
    hands:S(.02,Y+.03,.27),handDir:S(.2,-.1,-1),palm:S(0,-1,0),elbows:S(-1,0,.15),grip:"grip"};}
  return {keys:[pose(Y+.28,lean+12),pose(Y+.56,lean)],tempo:[1.0,.3,1.5,.5],cam:{yaw:38,pitch:6},arrow:{track:"sh.l"},
    refine:{Shoulders:"Front delts"},
    equip:function(){
      var e=[];
      [-1,1].forEach(function(sz){var z=sz*.29;
        e.push(["tube",[-.35,Y,z],[.4,Y,z],.02,4],["beam",[-.3,Y-.03,z],[-.3,0,z],.06,.06],["beam",[.33,Y-.03,z],[.33,0,z],.06,.06],
          ["beam",[-.42,.022,z],[.45,.022,z],.08,.044]);});
      return e;}};}

/* ---- crunches and sit-ups: lying, the trunk curled up from the floor ----
   kind "crunch" | "situp"; hands "head" | "chest" | "over" (overhead) */
function crunch(o){
  o=o||{};
  var kind=o.kind||"crunch";
  var lo=floorLie({bend:0,head:-5}),hi=floorLie(kind==="situp"?{pitch:-40,bend:28,head:15,pelvis:[.07,.12,0]}:{bend:30,head:16});
  return {keys:[lo,hi],tempo:[.9,.4,1.3,.4],cam:{yaw:70,pitch:12},arrow:{track:"sh.l"},refine:{Core:"Abs"},
    drive:function(p){
      var J=base(p);
      if(o.hands==="over"){p.hands={};LR.forEach(function(s){p.hands[s]=add(J.head,add(mul(J.cf.u,.24),mul(J.cf.l,sg(s)*.1)));});
        p.handDir={l:J.cf.u,r:J.cf.u};p.palm={l:J.cf.f,r:J.cf.f};p.elbows=S(0,1,.3);}
      else if(o.hands==="chest"){LR.forEach(function(s){p.hands=Object.assign({},p.hands);p.hands[s]=onChest(J,.3,.17,-sg(s)*.06);});p.handDir=S(0,0,-1);p.elbows=S(0,-.3,1);}
      else{p.hands={};LR.forEach(function(s){p.hands[s]=add(J.head,add(mul(J.hu,-.06),add(mul(J.hf,-.07),mul(J.cf.l,sg(s)*.05))));});
        p.handDir={l:mul(J.cf.l,-1),r:J.cf.l};p.elbows={l:add(J.cf.l,mul(J.hf,.4)),r:add(mul(J.cf.l,-1),mul(J.hf,.4))};}
      p.grip=.5;},
    equip:function(){return [["mat",[-.15,0,0],{len:1.0,w:.38}]];}};}

/* ---- planks: held still ---- side: on one forearm */
function plank(o){
  o=o||{};
  var p0={pelvis:[-.1,.3,0],pitch:84,head:-10,feet:S(-1.36,.12,.1),footDir:S(.15,-1,0),sole:S(1,.15,0),knees:S(0,-1,0),
    hands:S(.15,.06,.12),handDir:S(1,0,-.3),palm:S(0,-1,0),elbows:S(0,-1,.2),grip:"fist"};
  return {keys:[p0],tempo:[1,1,1,1],cam:{yaw:62,pitch:10},refine:{Core:"Abs"},
    equip:function(){return [["mat",[-.5,0,0],{len:1.0,w:.38}]];}};}

/* ---- lunges and split squats ----
   kind "split" (feet stay) | "forward" (a step forward and back) | "reverse";
   load "none" | "db" | "back" (a bar on the back); rear "floor" | "bench" (Bulgarian) */
function lunge(o){
  o=o||{};
  var kind=o.kind||"split",load=o.load||"none";
  var front={l:[.36,ANKLE,.13]},backF=o.rear==="bench"?[-.55,.47,-.12]:[-.48,.1,-.13];
  function legs(f,b,stepT){return {feet:{l:f,r:b},footDir:{l:[1,0,.1],r:o.rear==="bench"?[-.3,-1,0]:[.4,-1,0]},sole:{l:[0,1,0],r:o.rear==="bench"?[1,-.3,0]:[.9,.4,0]},knees:{l:[1,0,.05],r:[.2,-1,-.05]}};}
  var bot=Object.assign({pelvis:[-.05,.56,0],pitch:6,head:-4},legs(front.l,backF));
  var top=kind==="split"?Object.assign({pelvis:[-.03,.94,0],pitch:2},legs(front.l,backF)):
    Object.assign(stand(),{feet:S(0,ANKLE,.13),footDir:S(1,0,.1),sole:S(0,1,0)});
  return {keys:[bot,top],tempo:[1.1,.3,1.6,.5],cam:{yaw:75,pitch:6},arrow:{track:"P"},
    drive:function(p,u){
      if(kind!=="split"){var lift=Math.sin(Math.PI*u)*.06;var m=kind==="forward"?"l":"r";p.feet=Object.assign({},p.feet);p.feet[m]=add(p.feet[m],[0,lift,0]);}
      var J=base(p),h={};
      if(load==="db"){LR.forEach(function(s){var g=add(J.sh[s],[0,-REACH*.98,sg(s)*.04]);h[s]={g:g,axis:[1,0,0],pn:[0,0,-sg(s)],hd:[0,-1,0]};});grasp(p,h);}
      else if(load==="back"){var B=onChest(J,.41,-.1);onBar(p,B,.42,[1,.3,0],[0,1,0],10);p.elbows=S(-.4,-1,.6);}
      else{LR.forEach(function(s){h[s]={g:onTrunk(J,.08,.06,sg(s)*.2),axis:[1,0,0],pn:[0,0,-sg(s)],hd:[0,-1,0]};});grasp(p,h);p.grip="open";return;}
      p.grip="grip";},
    equip:function(J){
      var e=[];
      if(load==="db")e=e.concat(dbsIn(J));else if(load==="back")e.push(barIn(J));
      if(o.rear==="bench")e.push(["bench",[-.7,0,0],{len:.5}]);
      return e;}};}

/* ---- calf raises: up onto the balls of the feet ---- imp "none" | "db" | "bb" */
function calfRaise(o){
  o=o||{};
  var imp=o.imp||"none";
  var lo=stand({pelvis:[0,1.04,0]}),hi=stand({pelvis:[-.02,1.115,0],feet:S(-.02,.152,.13),toes:S(0,0,0)});
  hi.toes={l:-34,r:-34};
  return {keys:[lo,hi],tempo:[.8,.6,1.2,.4],cam:{yaw:80,pitch:4},arrow:{track:"an.l"},
    drive:function(p){
      var J=base(p),h={};
      if(imp==="db"){LR.forEach(function(s){h[s]={g:add(J.sh[s],[0,-REACH*.98,sg(s)*.04]),axis:[1,0,0],pn:[0,0,-sg(s)],hd:[0,-1,0]};});grasp(p,h);p.grip="grip";}
      else if(imp==="bb"){onBar(p,onChest(J,.41,-.1),.42,[1,.3,0],[0,1,0],10);p.elbows=S(-.4,-1,.6);p.grip="grip";}
      else{LR.forEach(function(s){h[s]={g:onTrunk(J,.1,.02,sg(s)*.22),axis:[1,0,0],pn:[0,0,-sg(s)],hd:[0,-1,0]};});grasp(p,h);p.grip="open";}},
    equip:function(J){return imp==="db"?dbsIn(J):imp==="bb"?[barIn(J)]:[];}};}

/* ---- glute bridges and hip thrusts: the hips driven up, the shoulders still ----
   at "floor" (shoulders on the floor) | "bench" (shoulders on a bench); imp "none" | "bb" */
function bridge(o){
  o=o||{};
  var onB=o.at==="bench",imp=o.imp||"none";
  var sh=onB?[-.42,.52,0]:[-.4,.12,0];
  function pose(hipY,ft){
    var P=[sh[0]+.4,hipY+.06,0],u=norm(sub(sh,P)),pitch=-90-Math.atan2(sh[1]-P[1],P[0]-sh[0])/R;
    P=sub(sh,mul(u,.405));
    return {pelvis:P,pitch:pitch,head:onB?25:10,feet:S(ft,ANKLE,.15),footDir:S(1,0,.1),sole:S(0,1,0),knees:S(.4,1,.15)};}
  var lo=pose(onB?.3:.12,onB?.42:.2),hi=pose(onB?.52:.32,onB?.42:.2);
  return {keys:[lo,hi],tempo:[1.0,.6,1.4,.5],cam:{yaw:75,pitch:8},arrow:{track:"P"},refine:{Glutes:"Glutes"},
    drive:function(p){
      var J=base(p),h={};
      if(imp==="bb"){var c=onTrunk(J,-.04,.17);onBar(p,[c[0],c[1],0],.3,[0,-1,0],[0,1,0].map(function(v,i){return i===0?-.2:v;}),0);p.elbows=S(0,0,1);p.grip="grip";}
      else{LR.forEach(function(s){h[s]={g:onTrunk(J,.12,-.02,sg(s)*.22),axis:J.pf.u,pn:[0,-1,0],hd:mul(J.pf.u,-1)};});grasp(p,h);p.grip="open";}},
    equip:function(J){
      var e=[];
      if(imp==="bb")e.push(barIn(J));
      if(onB)e.push(["bench",[-.55,0,0],{len:.5,w:1}]);else e.push(["mat",[-.1,0,0],{len:1.0,w:.38}]);
      return e;}};}

/* ---- lat pulldowns: seated under a high pulley, the bar drawn down to the chest ----
   grip "pro" | "sup" | "ham" (a V-handle); w half width; behind: to the back of the neck */
function pulldown(o){
  o=o||{};
  var grip=o.grip||"pro",w=o.w||(grip==="sup"?.2:grip==="ham"?.07:.46);
  var b0={pelvis:[-.06,.64,0],pitch:-4,head:-14,feet:S(.4,ANKLE,.17),footDir:S(1,0,.12),sole:S(0,1,0),knees:S(1,.6,.15)};
  var b1=Object.assign({},b0,{pitch:o.behind?12:-16,head:o.behind?22:-4});
  var rec={keys:[b0,b1],tempo:[1.0,.4,1.6,.5],cam:{yaw:145,pitch:8},arrow:{track:"wr.l"},refine:{Back:"Lats"},
    drive:function(p,u){
      var J=base(p),sh=lerp(J.sh.l,J.sh.r,.5);
      var up=Math.sqrt(Math.max(.1,REACH*REACH*.97-Math.pow(Math.max(0,w-.23),2)-.01));
      var top=[sh[0]+.1,sh[1]+up,0],bot=o.behind?[sh[0]-.1,sh[1]+.04,0]:onChest(J,.37,.17);bot[2]=0;
      var c=lerp(top,bot,u),h={};
      LR.forEach(function(s){
        h[s]=grip==="ham"?{g:add(c,[0,0,sg(s)*w]),axis:[1,0,0],pn:[0,0,-sg(s)],hd:[0,1,0]}:
          {g:add(c,[0,0,sg(s)*w]),axis:[0,0,1],pn:grip==="sup"?[-1,0,0]:[1,0,0],hd:[0,1,0]};});
      grasp(p,h);p.elbows=grip==="sup"||grip==="ham"?S(.4,-1,.3):S(-.1,-1,1);p.grip="grip";},
    equip:function(J,u,rec){
      var mid=lerp(J.grip.l,J.grip.r,.5),py=2.35,e=[["seat",[-.06,.5,0],[1,0,0],{back:.3,front:.45}],
        ["tower",[.82,0,0],[-1,0,0],{h:2.3}],["beam",[.82,py+.06,0],[.04,py+.06,0],.09,.09],
        ["disc",[.1,py-.04,0],[0,0,1],.07,.03,4],["tube",[.1,py-.1,0],add(mid,[0,.04,0]),.005,4]];
      /* the thigh pads, just above the knees */
      var kn=lerp(J.kn.l,J.kn.r,.5);
      e.push(["tube",[kn[0]-.02,kn[1]+.1,-.24],[kn[0]-.02,kn[1]+.1,.24],.045,3],["beam",[kn[0]-.02,kn[1]+.1,0],[.7,kn[1]+.1,0],.06,.06]);
      if(grip==="ham")e.push(["tube",J.grip.l,add(mid,[0,.1,0]),.012,4],["tube",J.grip.r,add(mid,[0,.1,0]),.012,4],["tube",J.grip.l,J.grip.r,.012,4]);
      else{var ax=norm(sub(J.grip.l,J.grip.r)),L=Math.max(w+.16,.3);
        e.push(["tube",sub(mid,mul(ax,L)),add(mid,mul(ax,L)),.013,4],["grip",J.grip.l,ax,.06],["grip",J.grip.r,ax,.06]);}
      return e;}};
  return rec;}

/* ---- seated cable rows: feet on a platform, the handle drawn to the waist ----
   grip "ham" (a V-handle) | "pro" (a bar); one: one arm */
function cableRow(o){
  o=o||{};
  var grip=o.grip||"ham";
  var legs={feet:S(.42,.25,.14),footDir:S(.35,1,.08),sole:S(-1,.35,0),knees:S(.3,1,.15)};
  var b0=Object.assign({pelvis:[-.3,.42,0],pitch:20,head:-8},legs),b1=Object.assign({pelvis:[-.3,.42,0],pitch:-6,head:0},legs);
  var rec={keys:[b0,b1],tempo:[1.0,.4,1.6,.5],cam:{yaw:105,pitch:8},arrow:{track:"wr.l"},refine:{Back:"Lats"},
    drive:function(p,u){
      var J=base(p),h={};
      LR.forEach(function(s){
        var t=o.one&&o.one!==s?0:u,w=grip==="ham"?.07:.24;
        var dz=sg(s)*w-J.sh[s][2],far=add(J.sh[s],[Math.sqrt(Math.max(.1,REACH*REACH*.93-dz*dz-.0064)),-.08,dz]);
        var near=onTrunk(J,.2,.16,sg(s)*(w+.04));
        h[s]={g:lerp(far,near,t),axis:grip==="ham"?[1,0,0]:[0,0,1],pn:grip==="ham"?[0,0,-sg(s)]:[0,-1,0],hd:[1,0,0]};});
      grasp(p,h);p.elbows=S(-1,-.2,.2);p.grip="grip";
      if(o.one)freeArm(p,J,o.one==="l"?"r":"l","hang");},
    equip:function(J){
      var mid=o.one?J.grip[o.one]:lerp(J.grip.l,J.grip.r,.5),e=[["bench",[-.45,0,0],{h:.29,len:.85}],
        ["slab",[.5,.25,0],[-.3,1,0],[1,.3,0],[.22,.02,.24]],["beam",[.55,.03,0],[1.05,.03,0],.09,.044],
        ["cable",[1.12,0,0],.36,mid,{handle:false}]];
      if(grip==="ham"&&!o.one)e.push(["tube",J.grip.l,add(mid,[.1,0,0]),.012,4],["tube",J.grip.r,add(mid,[.1,0,0]),.012,4],["tube",J.grip.l,J.grip.r,.012,4]);
      else e.push(["grip",mid,o.one?[0,1,0]:norm(sub(J.grip.l,J.grip.r)),o.one?.06:.2]);
      return e;}};
  if(o.one)rec.arrow={track:"wr."+o.one};
  return rec;}

/* ---- cable crossovers: between two cable towers, the hands swept together in front ----
   low: from low pulleys, up to chest height */
function crossover(o){
  o=o||{};
  var low=o.low,b0=stand({pitch:low?4:16,head:low?0:-6,feet:{l:[.2,ANKLE,.15],r:[-.16,ANKLE,-.15]},knees:S(1,0,.1)});
  return {keys:[b0,b0],tempo:[1.0,.4,1.6,.5],cam:{yaw:30,pitch:10},arrow:{track:"wr.l"},
    drive:function(p,u){
      var J=base(p);
      LR.forEach(function(s){
        var a=low?[.1,-.55,1]:[.05,.32,1],b=low?[1,.05,.08]:[1,-.62,.1];
        var d=norm(lerp(side(norm(a),s),side(norm(b),s),u));
        var fa=norm(add(d,mul(side([0,0,1],s),-.3)));
        var pn=norm(side([0,low?.5:-.6,-1],s));
        armTo(p,J,s,d,fa,pn);p.elbows[s]=side([-.4,low?-1:.3,.6],s);});
      p.grip="grip";},
    equip:function(J){
      var e=[];
      LR.forEach(function(s){var z=sg(s)*1.05,ph=low?.22:2.05;
        e=e.concat([["tower",[0,0,z],[0,0,-sg(s)],{h:2.25,w:.3,d:.22}],["disc",[0,ph,z-sg(s)*.16],[1,0,0],.05,.025,4],
          ["tube",[0,ph,z-sg(s)*.16],J.grip[s],.005,4],["grip",J.grip[s],norm(cross(J.pn[s],J.hd[s])),.06]]);});
      return e;}};}

/* ---- leg extensions and curls: on a machine, the knee a hinge, the shin on a pad ----
   kind "extension" (seated, the shin lifted) | "lying" (face down, the heel drawn up) |
   "seated" (the heel drawn down under the seat) */
function legMachine(o){
  o=o||{};
  var kind=o.kind||"extension",lying=kind==="lying";
  var b0=lying?{pelvis:[.06,.72,0],pitch:88,head:-25,knees:S(0,-1,.02)}:
    {pelvis:[-.12,.7,0],pitch:-14,head:8,knees:S(.1,1,.03)};
  /* the shin's angle: from the knee, degrees from straight down (seated) or straight
     back (lying), toward the front of the shin */
  var th=kind==="extension"?[0,82]:kind==="seated"?[80,-8]:[2,112];
  var rec={keys:[b0,b0],tempo:[1.0,.4,1.6,.5],cam:{yaw:lying?75:78,pitch:10},arrow:{track:"an.l"},
    refine:kind==="extension"?{}:{},
    drive:function(p,u){
      var J=base(p),t=num(th[0],th[1],u)*R;
      p.feet={};p.footDir={};p.sole={};
      LR.forEach(function(s){
        var hip=J.hip[s],K=lying?add(hip,[-DIM.thigh,-.02,sg(s)*.01]):add(hip,[DIM.thigh*Math.cos(6*R),-DIM.thigh*Math.sin(6*R),sg(s)*.01]);
        var sd=lying?[-Math.cos(t),Math.sin(t),0]:[Math.sin(t),-Math.cos(t),0];
        var fd=lying?[-Math.sin(t),-Math.cos(t),0]:[Math.cos(t),Math.sin(t),0];
        p.feet[s]=add(K,mul(sd,DIM.shin));p.footDir[s]=fd;p.sole[s]=mul(sd,-1);});
      if(lying){p.hands=S(J.P[0]+.5,.62,.21);p.handDir=S(1,0,0);p.palm=S(0,-1,0);p.elbows=S(0,-1,.4);}
      else{p.hands=S(-.04,.58,.27);p.handDir=S(1,-.3,0);p.palm=S(0,0,-1);p.elbows=S(-1,0,.3);}
      p.grip="grip";},
    equip:function(J){
      var e=[],K=lerp(J.kn.l,J.kn.r,.5),A=lerp(J.an.l,J.an.r,.5),fd=norm(J.fd.l.dir),sd=norm(sub(A,K));
      /* the pad is on the front of the shins (extension) or behind the ankles (curls) */
      var side_=kind==="extension"?fd:mul(fd,-1),roll=add(A,add(mul(side_,.075),mul(sd,-.03)));
      e.push(["tube",[roll[0],roll[1],-.2],[roll[0],roll[1],.2],.045,3]);
      [-1,1].forEach(function(z){var pv=[K[0],K[1],z*.3];
        e.push(["hub",pv,[0,0,1],.05,.05],["beam",pv,[roll[0],roll[1],z*.3],.05,.05],["tube",[roll[0],roll[1],z*.2],[roll[0],roll[1],z*.3],.015,4]);});
      if(lying){
        e.push(["soft",[J.P[0]+.25,.585,0],[1,0,0],[0,1,0],[.62,.04,.16]],["beam",[J.P[0]+.25,.53,0],[J.P[0]+.25,.04,0],.08,.08],
          ["beam",[K[0]-.1,.022,0],[J.P[0]+.85,.022,0],.09,.044],["beam",[K[0],K[1],-.3],[K[0],.04,-.3],.06,.06]);}
      else{
        var seatTop=J.P[1]-.135;
        e.push(["soft",[J.P[0]+.12,seatTop-.04,0],[1,0,0],[0,1,0],[.26,.04,.19]],
          ["soft",add(sub(J.P,mul(J.pf.f,.15)),mul(J.pf.u,.28)),J.pf.u,J.pf.f,[.3,.045,.18]],
          ["beam",[J.P[0]+.1,seatTop-.08,0],[J.P[0]+.1,.04,0],.08,.08],["beam",[K[0],K[1],-.3],[K[0],.04,-.3],.07,.07],
          ["beam",[J.P[0]-.3,.022,0],[K[0]+.25,.022,0],.09,.044]);
        if(kind==="seated")e.push(["tube",[K[0]-.06,K[1]+.12,-.2],[K[0]-.06,K[1]+.12,.2],.04,3]);}
      return e;}};
  return rec;}

/* ---- the leg press: lying back on a reclined seat, the feet pushing a sled away ---- */
function legPress(o){
  o=o||{};
  var w=o.w||.15,d=[Math.cos(45*R),Math.sin(45*R),0];
  var b0={pelvis:[-.2,.44,0],pitch:-50,head:12,knees:S(-.05,1,.3),footDir:S(-.7,.7,.08),sole:S(-.7,-.7,0)};
  return {keys:[b0,b0],tempo:[1.1,.3,1.7,.5],cam:{yaw:80,pitch:12},arrow:{track:"an.l"},
    drive:function(p,u){
      var J=base(p),hip=lerp(J.hip.l,J.hip.r,.5),F0=add(hip,[.42,.4,0]),F=add(F0,mul(d,u*.33));
      p.feet=S(F[0],F[1],w);
      p.hands=S(J.P[0]+.08,J.P[1]-.08,.3);p.handDir=S(1,0,0);p.palm=S(0,0,-1);p.elbows=S(-1,0,.4);p.grip="grip";},
    equip:function(J){
      var A=lerp(J.an.l,J.an.r,.5),plate=add(add(A,mul(d,.09)),mul([-d[1],d[0],0],.08));
      var e=[["adjBench",padFoot(J),40,{len:.75}],["slab",plate,[-d[1],d[0],0],d,[.32,.02,.36]]];
      [-1,1].forEach(function(z){e.push(["beam",add(plate,[0,0,z*.42]),add(add(plate,mul(d,.6)),[0,0,z*.42]),.07,.07],
        ["beam",add(sub(plate,mul(d,.5)),[0,0,z*.42]),add(plate,[0,0,z*.42]),.07,.07],
        ["beam",add(add(plate,mul(d,.55)),[0,0,z*.42]),[plate[0]+.4,.04,z*.42],.07,.07]);});
      e.push(["beam",[J.P[0]-.6,.022,0],[plate[0]+.5,.022,0],.1,.044]);
      return e;}};}

/* ---- the pec deck: seated, the arms swung together in front on their pads ----
   reverse: facing the machine, the straight arms swung back */
function pecDeck(o){
  o=o||{};
  var rev=o.reverse,b0=sit({pelvis:[-.1,.62,0],pitch:rev?12:-3,head:0});
  return {keys:[b0,b0],tempo:[1.0,.4,1.6,.5],cam:{yaw:rev?150:25,pitch:12},arrow:{track:"wr.l"},
    refine:rev?{Shoulders:"Rear delts"}:{Shoulders:"Front delts"},
    drive:function(p,u){
      var J=base(p);
      LR.forEach(function(s){
        var ph=(rev?num(78,-6,u):num(-8,76,u))*R;
        var d=norm([Math.sin(ph),rev?-.05:-.02,sg(s)*Math.cos(ph)]);
        var mv=norm([Math.cos(ph),0,-sg(s)*Math.sin(ph)]);
        if(rev){armTo(p,J,s,d,norm(add(d,[0,0,-sg(s)*.15])),mul(mv,-1));p.elbows[s]=[0,-1,0];}
        else{armTo(p,J,s,d,[0,1,0],mv);p.elbows[s]=add([0,-1,0],mul(d,0));}});
      p.grip="grip";},
    equip:function(J){
      var e=[["seat",[J.P[0],J.P[1]-.135,0],[1,0,0],{back:.35,front:.35}],rev?["tower",[.75,0,0],[-1,0,0],{h:2.0}]:["tower",[-.65,0,0],[1,0,0],{h:2.0}]];
      if(rev)e.push(["soft",onChest(J,.28,.2),[0,1,0],J.cf.f,[.24,.04,.13]],["beam",onChest(J,.1,.3),[J.P[0]+.3,.04,0],.06,.06]);
      else e.push(["soft",add(sub(J.P,mul(J.pf.f,.14)),mul(J.pf.u,.3)),J.pf.u,J.pf.f,[.32,.045,.17]]);
      LR.forEach(function(s){
        var piv=add(J.sh[s],[0,.38,0]),E=J.el[s];
        if(rev){e.push(["beam",piv,add(J.grip[s],[0,.1,0]),.05,.05],["grip",J.grip[s],[0,1,0],.07]);}
        else{var mv=norm(cross([0,1,0],sub(E,[J.sh[s][0],E[1],J.sh[s][2]]))),pad=add(add(E,[0,.14,0]),mul(norm(J.pn[s]),.055));
          e.push(["soft",pad,[0,1,0],J.pn[s],[.17,.035,.055]],["beam",piv,add(pad,[0,.17,0]),.05,.05],["grip",add(J.grip[s],[0,.03,0]),[0,1,0],.06]);}
        e.push(["hub",piv,[0,1,0],.05,.06],["beam",piv,[rev?.7:-.6,piv[1],piv[2]*.6],.06,.06]);});
      return e;}};}

/* ---- step-ups: one foot on a box, the body driven up onto it ---- load "none" | "db" | "back" */
function stepUp(o){
  o=o||{};
  var load=o.load||"db",H=.45,bx=.42;
  var lo={pelvis:[.12,.98,0],pitch:12,head:-6,feet:{l:[bx,H+ANKLE,.13],r:[-.05,ANKLE,-.13]},footDir:S(1,0,.08),sole:S(0,1,0),knees:S(1,0,.08)};
  var hi={pelvis:[bx-.02,H+1.03,0],pitch:2,head:0,feet:{l:[bx,H+ANKLE,.13],r:[bx-.06,H+ANKLE,-.13]},footDir:S(1,0,.08),sole:S(0,1,0),knees:S(1,0,.08)};
  return {keys:[lo,hi],tempo:[1.1,.3,1.6,.5],cam:{yaw:78,pitch:6},arrow:{track:"P"},
    drive:function(p,u){
      p.feet=Object.assign({},p.feet);p.feet.r=add(p.feet.r,[0,Math.sin(Math.PI*Math.min(1,u*1.15))*.16,0]);
      var J=base(p),h={};
      if(load==="back"){onBar(p,onChest(J,.41,-.1),.42,[1,.3,0],[0,1,0],10);p.elbows=S(-.4,-1,.6);p.grip="grip";return;}
      LR.forEach(function(s){h[s]={g:add(J.sh[s],[0,-REACH*.98,sg(s)*.04]),axis:[1,0,0],pn:[0,0,-sg(s)],hd:[0,-1,0]};});
      grasp(p,h);p.grip=load==="db"?"grip":"open";},
    equip:function(J){
      var e=[["block",[bx+.04,H/2,0],[.24,H/2,.3]]];
      if(load==="db")e=e.concat(dbsIn(J));else if(load==="back")e.push(barIn(J));
      return e;}};}

/* ---- side bends: standing, the trunk bent to the side and back up ----
   imp "db" (in the right hand) | "bb" (on the back) */
function sideBend(o){
  o=o||{};
  var imp=o.imp||"db",lo=stand({lean:-26}),hi=stand({lean:8});
  return {keys:[lo,hi],tempo:[1.0,.3,1.4,.4],cam:{yaw:8,pitch:6},arrow:{track:"head"},refine:{Core:"Obliques"},
    drive:function(p){
      var J=base(p);
      if(imp==="bb"){onBar(p,onChest(J,.41,-.1),.42,[1,.3,0],[0,1,0],10);p.elbows=S(-.4,-1,.6);p.grip="grip";return;}
      grasp(p,{r:{g:add(J.sh.r,mul(norm(sub(J.P,J.neck)),REACH*.98)),axis:[1,0,0],pn:[0,0,1],hd:[0,-1,0]}});
      freeArm(p,J,"l","hip");p.grip=Object.assign({},p.grip);p.grip.r="grip";},
    equip:function(J){return imp==="bb"?[barIn(J)]:[dbIn(J,"r")];}};}

/* ---- bench dips: the hands on a bench behind, the body lowered and pressed back up ----
   feet "floor" | "bench" */
function benchDip(o){
  o=o||{};
  var fb=o.feet==="bench",legs={feet:S(fb?.9:.78,fb?.48:.07,.13),footDir:S(.25,1,0),sole:S(-1,.25,0),knees:S(0,1,.05)};
  var lo=Object.assign({pelvis:[-.12,.28,0],pitch:-6,head:-2},legs),hi=Object.assign({pelvis:[-.16,.56,0],pitch:-4,head:-2},legs);
  return {keys:[lo,hi],tempo:[1.0,.3,1.5,.5],cam:{yaw:75,pitch:8},arrow:{track:"sh.l"},
    drive:function(p){p.hands=S(-.33,.47,.19);p.handDir=S(1,-.3,0);p.palm=S(0,-1,0);p.elbows=S(-1,0,.15);p.grip=.7;},
    equip:function(){var e=[["bench",[-.45,0,0],{len:.5}]];if(fb)e.push(["block",[.97,.21,0],[.2,.21,.25]]);return e;}};}

/* ---- inverted rows: under a bar at hip height, the chest pulled up to it ---- */
function invertedRow(o){
  o=o||{};
  var H=o.h||.95,w=o.w||.32;
  function pose(shY){var heel=[1.32,.08,0],sh=[0,shY,0],dir=norm(sub(sh,heel)),beta=Math.atan2(sh[1]-heel[1],heel[0]-sh[0])/R;
    return {pelvis:add(sh,mul(dir,-.405)),pitch:-90+beta,head:8,feet:S(1.3,.08,.1),footDir:S(.2,1,0),sole:S(-1,.2,0),knees:S(0,1,.05)};}
  return {keys:[pose(H-.6),pose(H-.17)],tempo:[1.0,.4,1.5,.5],cam:{yaw:70,pitch:10},arrow:{track:"sh.l"},refine:{Back:"Lats"},
    drive:function(p){onBar(p,[0,H,0],w,[1,0,0],[0,1,0],0);p.elbows=S(.3,-1,.6);p.grip="grip";},
    equip:function(){return [["bar",H,{w:.7}]];}};}

/* ---- leg raises: lying, or hanging from a bar, the legs lifted ----
   at "floor" | "bench" | "hang"; knees: the knees bent (a knee raise) */
function legRaise(o){
  o=o||{};
  var at=o.at||"floor",hang=at==="hang",H=2.3;
  var b0=hang?{pelvis:[-.04,H-.97,0],pitch:-4,head:-10}:at==="bench"?{pelvis:[.12,.55,0],pitch:-90,head:-6}:{pelvis:[.05,.11,0],pitch:-90,head:-6};
  return {keys:[b0,b0],tempo:[1.0,.4,1.4,.5],cam:{yaw:hang?60:72,pitch:8},arrow:{track:"an.l"},refine:{Core:"Abs"},
    drive:function(p,u){
      var J=base(p);
      p.feet={};p.knees={};p.footDir={};p.sole={};
      LR.forEach(function(s){
        var hip=J.hip[s],a=(hang?num(2,o.knees?95:88,u):num(at==="bench"?-8:4,86,u))*R;
        var dir=hang?[Math.sin(a),-Math.cos(a),0]:[Math.cos(a),Math.sin(a),0],L=o.knees&&hang?.62:DIM.thigh+DIM.shin-.012;
        if(o.knees&&hang){var K=add(hip,mul(dir,DIM.thigh)),sd=norm(lerp([0,-1,0],[0,-1,0],1));p.feet[s]=add(K,mul(sd,DIM.shin*.96));p.knees[s]=dir;}
        else{p.feet[s]=add(hip,add(mul(dir,L),[0,0,sg(s)*.02]));p.knees[s]=hang?[1,.2,0]:[0,1,0];}
        p.footDir[s]=hang?[1,.3,0]:norm(add(dir,[0,0,0]));p.sole[s]=hang?[0,1,0]:[-dir[1],dir[0],0];});
      if(hang){onBar(p,[0,H,0],.32,[1,0,0],[0,1,0],0);p.elbows=S(-.1,-1,1);p.grip="grip";}
      else if(at==="bench"){p.hands=S(J.P[0]-.62,.5,.16);p.handDir=S(-1,-.4,0);p.palm=S(0,0,-1);p.elbows=S(0,1,.4);p.grip="grip";}
      else{p.hands=S(J.P[0]+.02,.05,.24);p.handDir=S(1,0,0);p.palm=S(0,-1,0);p.elbows=S(0,1,.3);p.grip="open";}},
    equip:function(){return hang?[["bar",H,{w:.62}]]:at==="bench"?[BENCH]:[["mat",[-.15,0,0],{len:1.0,w:.38}]];}};}

/* ---- back extensions: hips on the pad of a 45-degree bench, the trunk raised in line ---- */
function hyper(o){
  o=o||{};
  var legs={feet:S(-.66,.23,.12),footDir:S(.3,-1,0),sole:S(-1,-.3,0),knees:S(.4,-1,0)};
  var lo=Object.assign({pelvis:[-.02,.86,0],pitch:150,head:0},legs),hi=Object.assign({pelvis:[-.02,.86,0],pitch:48,head:-8},legs);
  return {keys:[lo,hi],tempo:[1.0,.5,1.5,.5],cam:{yaw:82,pitch:8},arrow:{track:"head"},refine:{Back:"Lower back"},
    drive:function(p){var J=base(p);
      LR.forEach(function(s){p.hands=Object.assign({},p.hands);p.hands[s]=onChest(J,.33,.13,-sg(s)*.08);});
      p.handDir={l:mul(J.cf.l,-1),r:J.cf.l};p.palm={l:mul(J.cf.f,-1),r:mul(J.cf.f,-1)};p.elbows=S(-.2,-1,.6);p.grip=.6;},
    equip:function(J){
      var d=norm([1,1,0]),c=[-.08,.72,0];
      return [["soft",c,d,[-d[1],d[0],0],[.2,.05,.18]],["tube",[-.63,.17,-.18],[-.63,.17,.18],.045,3],["tube",[-.72,.3,-.18],[-.72,.3,.18],.045,3],
        ["beam",add(c,[-.05,-.05,0]),[-.9,.05,0],.07,.07],["beam",[-.9,.022,0],[.35,.022,0],.1,.044],["beam",add(c,[-.02,-.08,0]),[.2,.04,0],.07,.07]];}};}

/* ---- kettlebell swings: the hips driving the bell from between the legs to chest height ----
   one: one hand */
function kbSwing(o){
  o=o||{};
  var lo=Object.assign(stand({pelvis:[-.2,.86,0],pitch:58,head:-30}),stance(.2,15)),hi=Object.assign(stand({pitch:-3,head:0}),stance(.2,15));
  return {keys:[lo,hi],tempo:[.6,.15,.6,.15],cam:{yaw:80,pitch:6},arrow:{track:"wr.l"},refine:{Glutes:"Glutes"},
    drive:function(p,u){
      var J=base(p),a=num(-25,80,u)*R,h={};
      var mid=lerp(J.sh.l,J.sh.r,.5),dir=[Math.sin(a),-Math.cos(a),0];
      LR.forEach(function(s){
        if(o.one&&o.one!==s)return;
        var g=add(add(mid,mul(dir,REACH*.97)),[0,0,o.one?sg(s)*.02:sg(s)*.045]);
        h[s]={g:g,axis:[0,0,1],pn:mul(dir,-1).map(function(v,i){return i===0?v-.3:v;}),hd:dir};});
      grasp(p,h);p.grip="grip";
      if(o.one)freeArm(p,J,o.one==="l"?"r":"l","hang");},
    equip:function(J){
      var g=o.one?J.grip[o.one]:lerp(J.grip.l,J.grip.r,.5),dn=norm(sub(lerp(J.grip.l,J.grip.r,.5),lerp(J.sh.l,J.sh.r,.5)));
      return [["kettlebell",g,dn]];}};}

/* ================= the library: which exercise is which family =================
   By the library's exact name (exercises.json). An exercise is added here only after
   its family has been looked at beside its photographs (tools/figures/review.mjs). */
var TABLE={
  "Barbell Curl":[curl,{imp:"bb"}],
  "Hammer Curls":[curl,{imp:"db",grip:"ham"}],
  "Dumbbell Bicep Curl":[curl,{imp:"db",grip:"turn"}],
  "EZ-Bar Curl":[curl,{imp:"ez"}],
  "Reverse Barbell Curl":[curl,{imp:"bb",grip:"pro"}],
  "Preacher Curl":[curl,{imp:"ez",at:"preacher"}],
  "Incline Dumbbell Curl":[curl,{imp:"db",at:"incline"}],
  "Seated Dumbbell Curl":[curl,{imp:"db",at:"sit",grip:"turn"}],
  "Standing Military Press":[press,{imp:"bb"}],
  "Dumbbell Shoulder Press":[press,{imp:"db",at:"sit"}],
  "Arnold Dumbbell Press":[press,{imp:"db",at:"sit",arnold:true}],
  "Side Lateral Raise":[raise,{dir:"side"}],
  "Front Dumbbell Raise":[raise,{dir:"front",one:"l"}],
  "Reverse Flyes":[raise,{dir:"rear",at:"prone"}],
  "Barbell Shrug":[shrug,{imp:"bb"}],
  "Dumbbell Shrug":[shrug,{imp:"db"}],
  "Upright Barbell Row":[uprightRow,{imp:"bb"}],
  "Barbell Squat":[squat,{load:"back"}],
  "Front Barbell Squat":[squat,{load:"cross"}],
  "Goblet Squat":[squat,{load:"kb"}],
  "Bodyweight Squat":[squat,{load:"prisoner"}],
  "Dumbbell Squat":[squat,{load:"db",w:.15,toe:12}],
  "Overhead Squat":[squat,{load:"overhead"}],
  "Barbell Deadlift":[hinge,{kind:"deadlift"}],
  "Romanian Deadlift":[hinge,{kind:"rdl"}],
  "Stiff-Legged Barbell Deadlift":[hinge,{kind:"stiff"}],
  "Sumo Deadlift":[hinge,{kind:"sumo"}],
  "Good Morning":[hinge,{kind:"goodmorning"}],
  "Bent Over Barbell Row":[row,{imp:"bb"}],
  "One-Arm Dumbbell Row":[row,{imp:"db",one:"l"}],
  "Bent Over Two-Dumbbell Row":[row,{imp:"db",grip:"pro"}],
  "Barbell Bench Press - Medium Grip":[benchPress,{imp:"bb"}],
  "Barbell Incline Bench Press - Medium Grip":[benchPress,{imp:"bb",angle:35}],
  "Decline Barbell Bench Press":[benchPress,{imp:"bb",angle:-20}],
  "Dumbbell Bench Press":[benchPress,{imp:"db"}],
  "Close-Grip Barbell Bench Press":[benchPress,{imp:"bb",w:.2}],
  "Floor Press":[benchPress,{imp:"bb",floor:true}],
  "Dumbbell Flyes":[fly,{}],
  "Incline Dumbbell Flyes":[fly,{angle:35}],
  "Standing Dumbbell Triceps Extension":[triceps,{kind:"overhead",imp:"db1"}],
  "EZ-Bar Skullcrusher":[triceps,{kind:"lying",imp:"ez"}],
  "Tricep Dumbbell Kickback":[triceps,{kind:"kickback",imp:"db",one:"l"}],
  "Triceps Pushdown":[triceps,{kind:"pushdown",imp:"bar"}],
  "Triceps Pushdown - Rope Attachment":[triceps,{kind:"pushdown",imp:"rope"}],
  "Pushups":[pushup,{}],
  "Incline Push-Up":[pushup,{hands:"bench"}],
  "Decline Push-Up":[pushup,{feet:"bench"}],
  "Pullups":[pullup,{grip:"pro"}],
  "Chin-Up":[pullup,{grip:"sup"}],
  "Dips - Triceps Version":[dip,{lean:2}],
  "Dips - Chest Version":[dip,{lean:20}],
  "Crunches":[crunch,{kind:"crunch"}],
  "Sit-Up":[crunch,{kind:"situp"}],
  "Plank":[plank,{}],
  "Dumbbell Lunges":[lunge,{kind:"forward",load:"db"}],
  "Barbell Lunge":[lunge,{kind:"forward",load:"back"}],
  "Split Squat with Dumbbells":[lunge,{kind:"split",load:"db",rear:"bench"}],
  "Standing Dumbbell Calf Raise":[calfRaise,{imp:"db"}],
  "Standing Barbell Calf Raise":[calfRaise,{imp:"bb"}],
  "Barbell Hip Thrust":[bridge,{at:"bench",imp:"bb"}],
  "Barbell Glute Bridge":[bridge,{at:"floor",imp:"bb"}],
  "Butt Lift (Bridge)":[bridge,{at:"floor"}],
  /* ---- the second pass ---- */
  "Close-Grip EZ Bar Curl":[curl,{imp:"ez",w:.12}],
  "Close-Grip Standing Barbell Curl":[curl,{imp:"bb",w:.15}],
  "Wide-Grip Standing Barbell Curl":[curl,{imp:"bb",w:.32}],
  "Reverse Barbell Preacher Curls":[curl,{imp:"bb",at:"preacher",grip:"pro",stand:true}],
  "Alternate Hammer Curl":[curl,{imp:"db",grip:"ham",one:"l"}],
  "Alternate Incline Dumbbell Curl":[curl,{imp:"db",at:"incline",one:"l"}],
  "Dumbbell Alternate Bicep Curl":[curl,{imp:"db",grip:"turn",one:"l"}],
  "Incline Hammer Curls":[curl,{imp:"db",grip:"ham",at:"incline"}],
  "One Arm Dumbbell Preacher Curl":[curl,{imp:"db",at:"preacher",one:"l",single:true}],
  "Preacher Hammer Dumbbell Curl":[curl,{imp:"db",grip:"ham",at:"preacher"}],
  "Two-Arm Dumbbell Preacher Curl":[curl,{imp:"db",at:"preacher"}],
  "Standing Dumbbell Reverse Curl":[curl,{imp:"db",grip:"pro"}],
  "Seated Barbell Military Press":[press,{imp:"bb",at:"sit"}],
  "Standing Barbell Press Behind Neck":[press,{imp:"bb",behind:true}],
  "Seated Dumbbell Press":[press,{imp:"db",at:"sit"}],
  "Standing Dumbbell Press":[press,{imp:"db"}],
  "Standing Palms-In Dumbbell Press":[press,{imp:"db",palmsIn:true}],
  "Standing Alternating Dumbbell Press":[press,{imp:"db",one:"l"}],
  "Dumbbell One-Arm Shoulder Press":[press,{imp:"db",one:"l",free:"hang"}],
  "Two-Arm Kettlebell Military Press":[press,{imp:"kb"}],
  "Alternating Kettlebell Press":[press,{imp:"kb",one:"l"}],
  "One-Arm Side Laterals":[raise,{dir:"side",one:"l",single:true}],
  "Seated Side Lateral Raise":[raise,{dir:"side",at:"sit"}],
  "Front Two-Dumbbell Raise":[raise,{dir:"front",top:106}],
  "Front Plate Raise":[raise,{dir:"front",imp:"plate"}],
  "Standing Front Barbell Raise Over Head":[raise,{dir:"front",imp:"bb",top:150}],
  "Standing Dumbbell Straight-Arm Front Delt Raise Above Head":[raise,{dir:"front",top:155}],
  "Barbell Shrug Behind The Back":[shrug,{imp:"bb",behind:true}],
  "Standing Dumbbell Upright Row":[uprightRow,{imp:"db"}],
  "Barbell Full Squat":[squat,{load:"back",depth:"full"}],
  "Olympic Squat":[squat,{load:"back",depth:"full",w:.17}],
  "Narrow Stance Squats":[squat,{load:"back",w:.12,toe:12}],
  "Wide Stance Barbell Squat":[squat,{load:"back",w:.3,toe:30}],
  "Barbell Squat To A Bench":[squat,{load:"back",box:true}],
  "Box Squat":[squat,{load:"back",box:true,w:.26,toe:28}],
  "Front Squat (Clean Grip)":[squat,{load:"front"}],
  "Front Barbell Squat To A Bench":[squat,{load:"front",box:true}],
  "Dumbbell Squat To A Bench":[squat,{load:"db",box:true,w:.15,toe:12}],
  "Stiff-Legged Dumbbell Deadlift":[hinge,{kind:"stiff",imp:"db"}],
  "Wide Stance Stiff Legs":[hinge,{kind:"stiff",w:.3}],
  "Stiff Leg Barbell Good Morning":[hinge,{kind:"goodmorning"}],
  "Reverse Grip Bent-Over Rows":[row,{imp:"bb",grip:"sup"}],
  "Bent Over Two-Dumbbell Row With Palms In":[row,{imp:"db",grip:"ham"}],
  "Two-Arm Kettlebell Row":[row,{imp:"kb"}],
  "Wide-Grip Barbell Bench Press":[benchPress,{imp:"bb",w:.5}],
  "Wide-Grip Decline Barbell Bench Press":[benchPress,{imp:"bb",angle:-20,w:.5}],
  "Bench Press - Powerlifting":[benchPress,{imp:"bb",w:.42}],
  "Dumbbell Bench Press with Neutral Grip":[benchPress,{imp:"db",grip:"ham"}],
  "Incline Dumbbell Press":[benchPress,{imp:"db",angle:35}],
  "Hammer Grip Incline DB Bench Press":[benchPress,{imp:"db",angle:35,grip:"ham"}],
  "Incline Dumbbell Bench With Palms Facing In":[benchPress,{imp:"db",angle:35,grip:"ham"}],
  "Decline Dumbbell Bench Press":[benchPress,{imp:"db",angle:-20}],
  "Dumbbell Floor Press":[benchPress,{imp:"db",floor:true}],
  "Decline Dumbbell Flyes":[fly,{angle:-20}],
  "Standing Overhead Barbell Triceps Extension":[triceps,{kind:"overhead",imp:"bb"}],
  "Dumbbell One-Arm Triceps Extension":[triceps,{kind:"overhead",imp:"db",one:"l"}],
  "Standing One-Arm Dumbbell Triceps Extension":[triceps,{kind:"overhead",imp:"db",one:"l"}],
  "Seated Triceps Press":[triceps,{kind:"overhead",imp:"db1",at:"sit"}],
  "Lying Dumbbell Tricep Extension":[triceps,{kind:"lying",imp:"db"}],
  "Lying Triceps Press":[triceps,{kind:"lying",imp:"ez"}],
  "Lying Close-Grip Barbell Triceps Press To Chin":[triceps,{kind:"lying",imp:"bb"}],
  "Standing Bent-Over Two-Arm Dumbbell Triceps Extension":[triceps,{kind:"kickback",imp:"db"}],
  "Triceps Pushdown - V-Bar Attachment":[triceps,{kind:"pushdown",imp:"bar"}],
  "Push-Up Wide":[pushup,{w:.42}],
  "Push-Ups - Close Triceps Position":[pushup,{w:.15}],
  "Push-Ups With Feet Elevated":[pushup,{feet:"bench"}],
  "Incline Push-Up Medium":[pushup,{hands:"bar"}],
  "Incline Push-Up Wide":[pushup,{hands:"bar",w:.42}],
  "Incline Push-Up Close-Grip":[pushup,{hands:"bar",w:.15}],
  "V-Bar Pullup":[pullup,{grip:"ham"}],
  "Parallel Bar Dip":[dip,{lean:6}],
  "Crunch - Hands Overhead":[crunch,{kind:"crunch",hands:"over"}],
  "Bodyweight Walking Lunge":[lunge,{kind:"forward"}],
  "Barbell Walking Lunge":[lunge,{kind:"forward",load:"back"}],
  "Dumbbell Rear Lunge":[lunge,{kind:"reverse",load:"db"}],
  /* ---- the machines and the rest ---- */
  "Wide-Grip Lat Pulldown":[pulldown,{grip:"pro"}],
  "Close-Grip Front Lat Pulldown":[pulldown,{grip:"pro",w:.2}],
  "Underhand Cable Pulldowns":[pulldown,{grip:"sup"}],
  "V-Bar Pulldown":[pulldown,{grip:"ham"}],
  "Wide-Grip Pulldown Behind The Neck":[pulldown,{grip:"pro",behind:true}],
  "Seated Cable Rows":[cableRow,{grip:"ham"}],
  "Seated One-arm Cable Pulley Rows":[cableRow,{grip:"ham",one:"l"}],
  "Cable Crossover":[crossover,{}],
  "Leg Extensions":[legMachine,{kind:"extension"}],
  "Lying Leg Curls":[legMachine,{kind:"lying"}],
  "Seated Leg Curl":[legMachine,{kind:"seated"}],
  "Leg Press":[legPress,{}],
  "Narrow Stance Leg Press":[legPress,{w:.08}],
  "Butterfly":[pecDeck,{}],
  "Reverse Machine Flyes":[pecDeck,{reverse:true}],
  "Dumbbell Step Ups":[stepUp,{load:"db"}],
  "Barbell Step Ups":[stepUp,{load:"back"}],
  "Dumbbell Side Bend":[sideBend,{imp:"db"}],
  "Barbell Side Bend":[sideBend,{imp:"bb"}],
  "Bench Dips":[benchDip,{feet:"bench"}],
  "Inverted Row":[invertedRow,{}],
  "Flat Bench Lying Leg Raise":[legRaise,{at:"bench"}],
  "Hanging Leg Raise":[legRaise,{at:"hang",knees:true}],
  "Hyperextensions (Back Extensions)":[hyper,{}],
  "One-Arm Kettlebell Swings":[kbSwing,{one:"l"}]
};

/* The record for a library exercise, built once. */
var BUILT={};
function moveFor(name){
  if(!name||!Object.prototype.hasOwnProperty.call(TABLE,name))return null;
  if(!BUILT[name]){var t=TABLE[name];BUILT[name]=even(t[0](t[1]||{}));}
  return BUILT[name];}
/* An angle one key gives and the other leaves out would be carried unchanged to the
   other end (motion.js mix): the other end gets it as 0, the body's own default. */
var ANGLES=["yaw","pitch","roll","twist","bend","lean","head","look","shrug"];
function even(rec){
  var k=rec.keys;
  if(k&&k.length===2)ANGLES.forEach(function(a){
    if(typeof k[0][a]==="number"&&k[1][a]==null)k[1][a]=0;
    if(typeof k[1][a]==="number"&&k[0][a]==null)k[0][a]=0;});
  return rec;}

var FAMILIES={curl:curl,press:press,raise:raise,shrug:shrug,uprightRow:uprightRow,squat:squat,hinge:hinge,row:row,
  benchPress:benchPress,fly:fly,triceps:triceps,pushup:pushup,pullup:pullup,dip:dip,crunch:crunch,plank:plank,lunge:lunge,
  calfRaise:calfRaise,bridge:bridge,pulldown:pulldown,cableRow:cableRow,crossover:crossover,legMachine:legMachine,
  legPress:legPress,pecDeck:pecDeck,stepUp:stepUp,sideBend:sideBend,benchDip:benchDip,invertedRow:invertedRow,
  legRaise:legRaise,hyper:hyper,kbSwing:kbSwing};

export {TABLE, FAMILIES, moveFor, grasp, onBar, armTo, stand, sit, lie, floorLie, stance, S};

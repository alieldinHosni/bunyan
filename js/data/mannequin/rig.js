/* Bunyan — the mannequin: the body
   One base figure for every exercise. An exercise never brings its own body: it gives
   a pose (where the pelvis is, how the trunk leans, where the hands and feet go) and
   the figure is built to it. Elbows and knees are found by two-bone inverse kinematics,
   bending toward a hint, so a hand can be put on a handle and the arm follows.

   pose = {
     pelvis:[x,y,z]              the pelvis centre
     yaw, pitch, roll, twist     degrees. pitch leans the trunk forward (90 = face down,
                                 -90 = on the back); roll leans it to its left; twist
                                 turns the chest on the hips
     axes:{u,f}                  the trunk by its up and forward axes instead (lying on
                                 a side, a side plank)
     head                        degrees the head nods forward from the trunk's line
     hands:{l,r}  feet:{l,r}     wrist and ankle targets; left out, an arm hangs and a
                                 leg stands straight under its hip
     elbows:{l,r} knees:{l,r}    the way each bends (a direction): back and forward by
                                 default
     handDir:{l,r} footDir:{l,r} where a hand or foot points: along the forearm, and
                                 square to the shin toward the knee's front, by default
     toes:{l,r}                  degrees a foot points down from that (a calf raise)
   }

   The figure is athletic, faceless and sculpted, the way an anatomical model is: each
   part one smooth volume, the muscles laid over it with soft blends, the lines between
   them carved in shallow grooves. Each muscle carries a tag (MUSCLE_TAGS maps the
   app's muscle names to them), and a muscle the exercise works is lit from within. */
import {V, sphere, cone, ellipsoid, box} from "./geom.js";

var add=V.add,sub=V.sub,mul=V.mul,dot=V.dot,cross=V.cross,len=V.len,norm=V.norm;
var R=Math.PI/180;

/* Proportions in metres, for about 1.78 m. */
var B={hipW:.092,hipDown:.06,spineNeck:.52,shW:.19,upArm:.30,foreArm:.27,hand:.085,
  thigh:.44,shin:.43,ankleUp:.08,neck:.08,headUp:.135};

/* Rodrigues: v turned about axis by ang radians. */
function rotAxis(v,axis,ang){
  var c=Math.cos(ang),s=Math.sin(ang),k=norm(axis);
  return add(add(mul(v,c),mul(cross(k,v),s)),mul(k,dot(k,v)*(1-c)));}
/* The trunk's frame from its angles: forward f, up u, left l, for the pelvis and (when
   twisted) the chest. */
function frame(yaw,pitch,roll,twist){
  var f=[1,0,0],u=[0,1,0],l=[0,0,1],a;
  a=(roll||0)*R;f=rotAxis(f,[1,0,0],a);u=rotAxis(u,[1,0,0],a);l=rotAxis(l,[1,0,0],a);
  a=-(pitch||0)*R;f=rotAxis(f,[0,0,1],a);u=rotAxis(u,[0,0,1],a);l=rotAxis(l,[0,0,1],a);
  a=-(yaw||0)*R;f=rotAxis(f,[0,1,0],a);u=rotAxis(u,[0,1,0],a);l=rotAxis(l,[0,1,0],a);
  var base={f:f,u:u,l:l};
  if(!twist)return {pel:base,chest:base};
  var tw=twist*R;
  return {pel:base,chest:{f:rotAxis(f,u,tw),u:u,l:rotAxis(l,u,tw)}};}
/* The same from its axes, for poses the angles make awkward. */
function axesFrame(a,twist){
  var u=norm(a.u),f=norm(sub(a.f,mul(u,dot(a.f,u)))),l=cross(f,u),base={f:f,u:u,l:l};
  if(!twist)return {pel:base,chest:base};
  var tw=twist*R;
  return {pel:base,chest:{f:rotAxis(f,u,tw),u:u,l:rotAxis(l,u,tw)}};}

/* Two bones, lengths a and b, from root toward target, bending toward pole. A target out
   of reach is brought in to the full stretch (or out from the full fold). */
function ik(root,target,a,b,pole){
  var d=sub(target,root),dl=len(d),n=norm(d),mx=(a+b)*.999,mn=Math.abs(a-b)+.01;
  if(dl>mx){dl=mx;target=add(root,mul(n,mx));}
  if(dl<mn){dl=mn;target=add(root,mul(n,mn));}
  var x=(a*a-b*b+dl*dl)/(2*dl),h=Math.sqrt(Math.max(a*a-x*x,0));
  var pp=sub(pole,mul(n,dot(pole,n)));
  if(len(pp)<1e-6)pp=Math.abs(n[1])<.9?[0,1,0]:[1,0,0];
  pp=norm(pp);
  return {mid:add(add(root,mul(n,x)),mul(pp,h)),end:target};}

/* Every joint of a pose: P pelvis, neck, head (and its up hu and forward hf), the
   frames pf (pelvis) and cf (chest), and per side sh shoulder, el elbow, wr wrist, hd
   the hand's direction, hip, kn knee, an ankle, fd the foot's frame. */
function joints(p){
  var fr=p.axes?axesFrame(p.axes,p.twist):frame(p.yaw,p.pitch,p.roll,p.twist),pf=fr.pel,cf=fr.chest;
  var P=p.pelvis,neck=add(P,mul(pf.u,B.spineNeck));
  var sh={l:add(add(neck,mul(cf.u,-.045)),mul(cf.l,B.shW)),r:add(add(neck,mul(cf.u,-.045)),mul(cf.l,-B.shW))};
  var hip={l:add(add(P,mul(pf.u,-B.hipDown)),mul(pf.l,B.hipW)),r:add(add(P,mul(pf.u,-B.hipDown)),mul(pf.l,-B.hipW))};
  var hn=(p.head||0)*R,hu=rotAxis(cf.u,cf.l,-hn),hf=rotAxis(cf.f,cf.l,-hn);
  var J={P:P,neck:neck,head:add(neck,mul(hu,B.headUp)),hu:hu,hf:hf,pf:pf,cf:cf,sh:sh,hip:hip,el:{},wr:{},kn:{},an:{},hd:{},fd:{}};
  ["l","r"].forEach(function(s){
    var side=s==="l"?1:-1;
    var wt=(p.hands&&p.hands[s])||add(sh[s],add(mul(cf.u,-(B.upArm+B.foreArm-.02)),mul(cf.l,side*.04)));
    var ep=(p.elbows&&p.elbows[s])||add(mul(cf.f,-1),mul(cf.l,side*.35));
    var A=ik(sh[s],wt,B.upArm,B.foreArm,ep);
    J.el[s]=A.mid;J.wr[s]=A.end;
    J.hd[s]=norm((p.handDir&&p.handDir[s])||sub(A.end,A.mid));
    var at=(p.feet&&p.feet[s])||add(hip[s],mul(pf.u,-(B.thigh+B.shin-.005)));
    var kp=(p.knees&&p.knees[s])||add(pf.f,mul(pf.l,side*.12));
    var Lg=ik(hip[s],at,B.thigh,B.shin,kp);
    J.kn[s]=Lg.mid;J.an[s]=Lg.end;
    var shin=norm(sub(Lg.end,Lg.mid));
    /* the knee's front, square to the shin: the default foot, and the calf's frame */
    var k=norm(kp),kq=sub(k,mul(shin,dot(k,shin))),fwd=len(kq)<1e-4?pf.f:norm(kq);
    var fd=(p.footDir&&p.footDir[s])?norm(p.footDir[s]):fwd;
    var toes=((p.toes&&p.toes[s])||0)*R;
    if(toes)fd=norm(rotAxis(fd,norm(cross(fd,shin)),toes));
    J.fd[s]={dir:fd,down:shin,fwd:fwd};});
  return J;}

/* The figure in a pose, as solids, with the muscles in hl (tag -> 0..1) lit. Skin is
   material 1, group 1, in regions (cl) the renderer can skip whole: torso, head, the
   arms and the legs. Each shoe is its own smooth group (3 and 4), upper 8, sole 9. */
function figure(p,hl){
  var J=joints(p),pf=J.pf,cf=J.cf,out=[];hl=hl||{};
  function put(q,bk,cl,tag){q.bk=bk;q.cl=cl;if(tag){q.tag=tag;q.hl=hl[tag]||0;}out.push(q);return q;}
  /* an ellipsoid by its long axis ey and the way it faces ez; radii [across, along, out] */
  function E(c,ey,ez,rad,bk,cl,tag){
    var y=norm(ey),z=sub(ez,mul(y,dot(ez,y)));
    z=len(z)<1e-6?(Math.abs(y[1])<.9?[0,1,0]:[1,0,0]):norm(z);
    return put(ellipsoid(c,norm(cross(y,z)),y,z,rad,1,1),bk,cl,tag);}
  function S(c,r,bk,cl,tag){return put(sphere(c,r,1,1),bk,cl,tag);}
  function C(a,b,ra,rb,bk,cl,tag){return put(cone(a,b,ra,rb,1,1),bk,cl,tag);}
  /* a groove: a thin tube carved out along a-b */
  function G(a,b,r,bk,cl){var q=put(cone(a,b,r,r,1,1),bk,cl);q.cut=1;return q;}
  /* a point on the trunk: du up, df forward, dl left, in frame fr */
  function T(fr,du,df,dl){return add(add(add(J.P,mul(fr.u,du)),mul(fr.f,df)),mul(fr.l,dl));}

  /* ---- the trunk ---- */
  var to="torso";
  E(T(pf,-.03,-.005,0),pf.u,pf.f,[.155,.11,.105],.04,to);                 // pelvis
  E(T(pf,.13,0,0),pf.u,pf.f,[.13,.13,.094],.045,to);                      // waist
  E(T(cf,.30,-.008,0),cf.u,cf.f,[.136,.15,.096],.045,to);                 // ribs
  E(T(cf,.41,-.016,0),cf.u,cf.f,[.152,.098,.096],.045,to);                // chest and upper back
  E(T(cf,.40,-.09,0),cf.u,mul(cf.f,-1),[.09,.13,.03],.03,to,"traps");     // mid back
  [1,-1].forEach(function(s){
    var sd=s===1?"l":"r";
    E(T(cf,.385,.064,s*.076),add(mul(cf.l,s),mul(cf.u,.28)),cf.f,[.074,.096,.044],.018,to,"chest");   // pec
    [[.255,0],[.29,1],[.325,2]].forEach(function(a){                                                  // serratus
      E(T(cf,a[0],.05-a[1]*.004,s*(.118+a[1]*.006)),add(mul(cf.u,.5),mul(cf.f,1)),mul(cf.l,s),[.013,.03,.011],.014,to);});
    [[.255,.088],[.18,.081],[.105,.074]].forEach(function(a){                                         // the abdomen's blocks
      var fr=a[0]>.22?cf:pf;E(T(fr,a[0],a[1],s*.032),fr.u,fr.f,[.033,.04,.022],.016,to,"abs");});
    E(T(cf,.29,-.035,s*.105),add(cf.u,mul(cf.l,s*.4)),add(mul(cf.l,s*.7),mul(cf.f,-.7)),[.07,.15,.045],.035,to,"lats");
    E(T(pf,.12,.012,s*.104),pf.u,add(mul(pf.f,.35),mul(pf.l,s)),[.05,.08,.045],.035,to,"obliques");
    E(T(pf,.16,-.078,s*.04),pf.u,mul(pf.f,-1),[.03,.13,.03],.025,to,"lowerback");                     // erector
    E(T(pf,-.07,-.068,s*.072),pf.u,add(mul(pf.f,-1),mul(pf.l,s*.3)),[.085,.09,.07],.03,to,"glutes");
    E(T(pf,-.005,-.03,s*.122),pf.u,mul(pf.l,s),[.05,.06,.045],.03,to,"gmed");                         // glute medius
    C(T(cf,.52,-.03,s*.035),add(add(J.sh[sd],mul(cf.u,.005)),mul(cf.l,-s*.03)),.046,.036,.035,to,"traps");});
  E(T(pf,.02,.058,0),pf.u,pf.f,[.055,.045,.024],.016,to,"abs");            // below the navel
  G(T(pf,.05,.096,0),T(cf,.30,.103,0),.005,.006,to);                       // the midline
  G(T(pf,.06,-.106,0),T(cf,.46,-.112,0),.007,.008,to);                     // the spine

  /* ---- neck and head: a jaw, a brow, a nose and ears, no eyes ---- */
  var hd="head",hu=J.hu,hf=J.hf,H=J.head;
  function hp(du,df,dl){return add(add(add(H,mul(hu,du)),mul(hf,df)),mul(cf.l,dl));}
  C(add(J.neck,mul(cf.u,-.03)),hp(-.075,-.01,0),.062,.056,.035,hd,"neck");
  E(hp(.012,-.008,0),hu,hf,[.079,.1,.098],.03,hd);                         // cranium
  E(hp(-.058,.028,0),hu,hf,[.058,.052,.066],.04,hd);                       // jaw
  E(hp(-.022,.094,0),add(hu,mul(hf,-.3)),hf,[.01,.024,.013],.012,hd);      // nose
  [1,-1].forEach(function(s){
    C(hp(-.05,-.01,s*.05),T(cf,.47,.07,s*.02),.017,.016,.015,hd,"neck"); // the neck's front muscle
    E(hp(-.012,-.005,s*.081),hu,mul(cf.l,s),[.017,.029,.011],.01,hd);}); // ear

  /* ---- arms ---- */
  ["l","r"].forEach(function(sd){
    var s=sd==="l"?1:-1,cl="arm_"+sd,sh=J.sh[sd],el=J.el[sd],wr=J.wr[sd];
    var a=norm(sub(el,sh)),fa=norm(sub(wr,el));
    /* the biceps' side: toward the forearm; with the arm straight, away from the elbow */
    var b=sub(fa,mul(a,dot(fa,a)));
    if(len(b)<.15){
      var ep=(p.elbows&&p.elbows[sd])||add(mul(cf.f,-1),mul(cf.l,s*.35));
      b=mul(sub(ep,mul(a,dot(ep,a))),-1);}
    b=norm(b);
    var o=mul(norm(cross(a,b)),s);
    S(sh,.05,.04,cl);
    E(add(add(sh,mul(a,.035)),mul(o,.022)),a,o,[.062,.088,.054],.028,cl,"sidedelt");          // the deltoid's cap
    E(add(add(add(sh,mul(a,.05)),mul(b,.04)),mul(o,.008)),a,b,[.042,.07,.034],.025,cl,"frontdelt");
    E(add(add(add(sh,mul(a,.05)),mul(b,-.04)),mul(o,.008)),a,mul(b,-1),[.042,.07,.032],.025,cl,"reardelt");
    E(add(sh,mul(a,.155)),a,b,[.05,.15,.05],.035,cl);                                          // the upper arm
    E(add(add(sh,mul(a,.175)),mul(b,.034)),a,b,[.042,.088,.043],.022,cl,"biceps");
    E(add(add(add(sh,mul(a,.145)),mul(b,-.036)),mul(o,.006)),a,mul(b,-1),[.048,.105,.043],.022,cl,"triceps");
    var b2=sub(b,mul(fa,dot(b,fa)));b2=len(b2)<1e-3?o:norm(b2);
    C(el,wr,.043,.027,.03,cl);
    E(add(add(el,mul(fa,.08)),mul(b2,.006)),fa,b2,[.05,.095,.043],.024,cl,"forearms");
    /* a fist */
    var h=J.hd[sd],pn=sub(b2,mul(h,dot(b2,h)));pn=len(pn)<1e-3?o:norm(pn);
    var ac=norm(cross(h,pn));
    put(box(add(wr,mul(h,.046)),h,pn,ac,[.028,.016,.026],.024,1,1),.02,cl);
    C(add(add(add(wr,mul(h,.022)),mul(pn,.022)),mul(ac,.028)),add(add(add(wr,mul(h,.062)),mul(pn,.03)),mul(ac,.02)),.012,.011,.012,cl);});

  /* ---- legs ---- */
  ["l","r"].forEach(function(sd){
    var s=sd==="l"?1:-1,cl="leg_"+sd,hip=J.hip[sd],kn=J.kn[sd],an=J.an[sd];
    var aT=norm(sub(kn,hip)),kp=(p.knees&&p.knees[sd])||add(pf.f,mul(pf.l,s*.12));
    var fT=sub(kp,mul(aT,dot(kp,aT)));fT=len(fT)<1e-4?pf.f:norm(fT);
    var oT=mul(norm(cross(aT,fT)),s);
    S(hip,.078,.05,cl);
    C(hip,kn,.082,.052,.04,cl);                                                                 // the thigh
    E(add(add(hip,mul(aT,.2)),mul(fT,.058)),aT,fT,[.044,.17,.042],.022,cl,"rf");
    E(add(add(add(hip,mul(aT,.22)),mul(fT,.016)),mul(oT,.058)),aT,add(oT,mul(fT,.3)),[.048,.17,.046],.022,cl,"quads");
    E(add(add(add(hip,mul(aT,.35)),mul(fT,.036)),mul(oT,-.046)),aT,add(mul(fT,.5),mul(oT,-1)),[.044,.078,.044],.02,cl,"quads");
    E(add(add(hip,mul(aT,.13)),mul(oT,-.052)),aT,mul(oT,-1),[.054,.12,.047],.03,cl,"adductors");
    E(add(add(add(hip,mul(aT,.22)),mul(fT,-.052)),mul(oT,.012)),aT,mul(fT,-1),[.062,.17,.049],.022,cl,"hams");
    S(kn,.05,.03,cl);
    E(add(kn,mul(fT,.032)),aT,fT,[.028,.032,.017],.015,cl);              // kneecap
    var aS=norm(sub(an,kn)),fS=J.fd[sd].fwd,oS=mul(norm(cross(aS,fS)),s);
    C(kn,an,.049,.031,.03,cl);
    E(add(add(add(kn,mul(aS,.125)),mul(fS,-.042)),mul(oS,-.022)),aS,add(mul(fS,-1),mul(oS,-.3)),[.036,.1,.04],.02,cl,"calves");
    E(add(add(add(kn,mul(aS,.115)),mul(fS,-.04)),mul(oS,.024)),aS,add(mul(fS,-1),mul(oS,.3)),[.032,.092,.036],.02,cl,"calves");
    E(add(add(kn,mul(aS,.235)),mul(fS,-.024)),aS,mul(fS,-1),[.043,.1,.032],.026,cl,"calves");  // soleus
    E(add(add(add(kn,mul(aS,.16)),mul(fS,.028)),mul(oS,.015)),aS,fS,[.022,.12,.021],.018,cl); // shin muscle
    S(an,.031,.025,cl);
    /* the trainer: a sole and an upper, heel and toe, its own smooth group */
    var F=J.fd[sd],dir=F.dir,su=sub(mul(F.down,-1),mul(dir,dot(mul(F.down,-1),dir)));
    su=len(su)<1e-4?[0,1,0]:norm(su);
    var sx=norm(cross(dir,su)),g=sd==="l"?3:4;
    function shoe(q,bk){q.bk=bk;out.push(q);}
    shoe(ellipsoid(add(add(an,mul(dir,-.008)),mul(su,-.012)),sx,dir,su,[.048,.085,.06],8,g),.03);
    shoe(ellipsoid(add(add(an,mul(dir,.1)),mul(su,-.03)),sx,dir,su,[.048,.09,.043],8,g),.03);
    shoe(box(add(add(an,mul(dir,.045)),mul(su,-.061)),dir,su,sx,[.12,.008,.046],.012,9,g),.01);});
  return {prims:out,J:J};}

/* The app's muscle names (exercises.json m and x, and the names Progress and the coach
   use), as the muscles of the figure. */
var MUSCLE_TAGS={Chest:["chest"],"Upper chest":["chest"],Shoulders:["frontdelt","sidedelt","reardelt"],
  "Front delts":["frontdelt"],"Rear delts":["reardelt"],Back:["lats","traps","reardelt"],"Upper back":["traps","reardelt"],
  Lats:["lats"],"Lower back":["lowerback"],Traps:["traps"],Biceps:["biceps"],Triceps:["triceps"],Forearms:["forearms"],
  Quads:["rf","quads"],Hamstrings:["hams"],Glutes:["glutes","gmed"],"Hams & glutes":["hams","glutes"],Legs:["rf","quads","hams","glutes"],
  Calves:["calves"],Core:["abs","obliques"],Abs:["abs"],Obliques:["obliques"],Adductors:["adductors"],Abductors:["gmed"],
  "Hip flexors":["rf"],Neck:["neck"]};
/* What an exercise works, as the figure's lit muscles: its main muscle in full, the
   others at half. refine narrows a broad name to the part an exercise really uses
   ({Shoulders: "Front delts"} for a press), in the app's own muscle names. */
function highlight(primary,secondary,refine){
  var hl={};refine=refine||{};
  function tags(m){return MUSCLE_TAGS[refine[m]||m]||[];}
  (secondary||[]).forEach(function(m){tags(m).forEach(function(t){hl[t]=Math.max(hl[t]||0,.5);});});
  tags(primary).forEach(function(t){hl[t]=1;});
  return hl;}

export {B, frame, ik, joints, figure, MUSCLE_TAGS, highlight};

/* Bunyan — the instructional figure: the poses
   Each exercise the photographed library has no pictures of, as one or two frames (a
   start and an end; a hold has one). id is the exercise's id in the app (its "i"), so
   the files land where the app looks for them. Distances in metres; the figure stands
   with its pelvis at y 1.0, shoulders at 1.475 (z ±0.19), and faces +x. cam.yaw 0 looks
   at its front, 90 at its left side. See js/data/mannequin/rig.js for the pose fields.
   Only the pilot's two exercises ship (js/data/figures.js), and they are posed from
   their 3D records; the rest are drafts, kept for when each gets its record and its
   pictures are approved (docs/MANNEQUIN3D.md). Render one by name, not the whole set. */
import {V} from "./render.mjs";
import {joints} from "./body.mjs";
import {RECORDS} from "../../js/data/mannequin/records.js";
import {poseAt} from "../../js/data/mannequin/motion.js";
const {add,sub,mul,norm,lerp}=V;

const S=(x,y,z)=>({l:[x,y,z],r:[x,y,-z]});
const P=(l,r)=>({l,r});
const DB=(c,dir)=>["dumbbell",c,dir||[1,0,0]];
const DBS=(h,dy,dir)=>[DB([h.l[0],h.l[1]-(dy==null?.05:dy),h.l[2]],dir),DB([h.r[0],h.r[1]-(dy==null?.05:dy),h.r[2]],dir)];
const stand=o=>Object.assign({pelvis:[0,1,0]},o||{});
/* the bench ids are the app's own: "bn_" + the name, lower case, non-letters as "_" */
const id=n=>"bn_"+n.toLowerCase().replace(/[^a-z0-9]+/g,"_");
/* An exercise the app draws live (js/data/mannequin/records.js): its start and end, with
   its equipment, from the record itself, so the stills and the live figure agree. */
const fromRecord=name=>{const rec=RECORDS[name];return {id:rec.id,cam:rec.cam,refine:rec.refine,rec,
  frames:[0,1].map(u=>{const p=poseAt(rec,u);p.props=rec.equip(joints(p),u,rec);return p;})};};

/* A machine seat: pelvis on a padded seat whose top is at 0.48, feet on the floor. */
const seated=o=>Object.assign({pelvis:[-.12,.585,0],feet:S(.34,.075,.17),knees:S(1,.4,.15)},o||{});
/* the seat on its post, with a back pad when back, and the weight-stack tower behind
   it when tower */
const TW=-.68;
const seatProps=(back,tower)=>[["seat",[-.13,.48,0],[1,0,0],{back:.5,front:.36}],
  ...(back?[["soft",[-.3,.98,0],[0,1,0],[1,0,0],[.34,.048,.17]],["beam",[-.36,.72,0],[-.36,.08,0],.07,.07]]:[]),
  ...(tower?[["tower",[TW,0,0],[1,0,0]],["beam",[-.36,.72,0],[TW+.13,.72,0],.07,.07]]:[])];

/* Equipment placed from where the pose puts the body: fn gets the joints (body.mjs)
   and returns more props, so a pad sits on the knee wherever the knee ends up. */
const fitJ=(pose,fn)=>{pose.props=(pose.props||[]).concat(fn(joints(pose)));return pose;};
/* a point on the trunk: du along its up, df forward, dl to its left */
const along=(J,du,df,dl)=>add(add(add(J.P,mul(J.pf.u,du)),mul(J.pf.f,df||0)),mul(J.pf.l,dl||0));
/* where a hand grips: a little past the wrist, along the hand */
const grip=(J,s,d)=>add(J.wr[s],mul(J.hd[s],d==null?.045:d));
const mid=(a,b)=>lerp(a,b,.5);
const dbIn=(dir)=>J=>["l","r"].map(s=>DB(grip(J,s),dir||[1,0,0]));
/* a handle: a short bar through c along axis */
const handle=(c,axis,h)=>["grip",c,axis,h||.065];
/* pads along the trunk: behind it (a seat back) or in front (a chest pad) */
const backPad=(J,o)=>{o=o||{};return ["soft",along(J,o.at==null?.3:o.at,-(o.off||.17)),J.pf.u,J.pf.f,[o.len||.34,.048,o.w||.17]];};
const chestPad=(J,o)=>{o=o||{};return ["soft",along(J,o.at==null?.2:o.at,o.off||.16),J.pf.u,J.pf.f,[o.len||.34,.048,o.w||.15]];};
/* a bench across the figure's path (along z), pad top at 0.44, on a steel frame */
const crossBench=(x,o)=>{o=o||{};const L=o.len||.55;return [["soft",[x,.395,0],[0,0,1],[0,1,0],[L,.045,o.w||.16]],
  ["beam",[x,.325,-L*.85],[x,.325,L*.85],.07,.05],...[-1,1].flatMap(sz=>[["beam",[x,.325,sz*L*.72],[x,.04,sz*L*.72],.06,.06],
  ["beam",[x-.2,.022,sz*L*.72],[x+.2,.022,sz*L*.72],.065,.044]])];};
/* a steel post from a point straight down to the floor */
const leg=(a,w)=>["beam",a,[a[0],0,a[2]],w||.07,w||.07];

/* ---- builders for the exercises that share a setup ---- */
/* pendulum squat: back pad along the trunk, shoulder pads, a tilted footplate */
const pend=p=>{const J0=joints(p);
  Object.assign(p,{footDir:S(.94,.34,0),hands:S(J0.sh.l[0]+.14,J0.sh.l[1]-.08,.27),elbows:S(0,-1,.4)});
  return fitJ(p,J=>{const top=along(J,.62,-.17);return [backPad(J,{at:.3}),
    ...["l","r"].map(s=>["soft",add(J.sh[s],mul(J.pf.u,.1)),J.pf.f,J.pf.u,[.12,.036,.06]]),
    ["slab",[.2,.07,0],[.94,.34,0],[-.34,.94,0],[.26,.022,.3]],["beam",[-.95,.025,0],[.5,.025,0],.62,.05],
    ["beam",add(top,[0,0,.2]),[-.78,1.82,.2],.065,.05],["beam",add(top,[0,0,-.2]),[-.78,1.82,-.2],.065,.05],
    ["beam",[-.78,1.84,-.32],[-.78,1.84,.32],.075,.075],leg([-.78,1.88,.3],.085),leg([-.78,1.88,-.3],.085)];});};
/* kneeling on a pad with the ankles held under a roller */
const nordic=p=>Object.assign({feet:S(-.43,.11,.11),knees:S(.3,-1,.1),footDir:S(-1,-.45,0),
  props:[["soft",[-.14,.045,0],[1,0,0],[0,1,0],[.44,.032,.2]],["beam",[-.66,.012,0],[.32,.012,0],.42,.024],
    ["tube",[-.47,.2,-.17],[-.47,.2,.17],.045,3],leg([-.62,.26,0],.07),["beam",[-.62,.2,0],[-.49,.2,0],.04,.04]]},p);
/* seated machine lateral raise: pads on the upper arms near the elbows */
const mlr=up=>fitJ(seated({hands:up?S(.15,1.02,.48):S(.14,.8,.22),elbows:up?S(-1,0,1):S(-.3,-1,.2)}),J=>{
  const out=[...seatProps(true,true)];for(const s of ["l","r"]){const z=s==="l"?1:-1,e=J.el[s];
    const c=up?add(e,[0,.078,-z*.06]):add(e,[0,.1,z*.078]);
    out.push(up?["soft",c,[0,0,1],[0,1,0],[.1,.028,.062]]:["soft",c,[0,1,0],[0,0,1],[.1,.028,.062]]);
    out.push(["beam",c,[-.4,1.06,z*.27],.045,.045],["beam",[-.4,1.06,z*.27],[TW+.13,1.06,z*.27],.06,.06]);}
  return out;});
/* chest down on an incline bench, feet on the floor behind */
const incline=(p,fn)=>fitJ(Object.assign({pelvis:[-.2,.88,0],head:-10,feet:S(-.58,.075,.14),knees:S(1,0,.1)},p),J=>{
  const lo=along(J,-.2,.2),hi=along(J,.3,.2);
  return [chestPad(J,{at:.1,len:.32}),["beam",lo,[lo[0],.04,0],.06,.06],["beam",hi,[hi[0]+.05,.04,0],.06,.06],
    ["beam",[lo[0]-.14,.022,0],[hi[0]+.2,.022,0],.09,.044],["beam",[hi[0]+.2,.022,-.22],[hi[0]+.2,.022,.22],.065,.044],
    ["beam",[lo[0]-.14,.022,-.22],[lo[0]-.14,.022,.22],.065,.044],...fn(J)];});
/* seated presses: handles from the levers, a back pad along the trunk */
const press=(pitch,out)=>{const base=seated({pitch});const J0=joints(base);
  const t=s=>{const z=s==="l"?1:-1;return out?add(J0.sh[s],add(mul(J0.pf.f,.52),mul(J0.pf.u,-.06))):add(J0.sh[s],add(add(mul(J0.pf.f,.13),mul(J0.pf.u,-.08)),mul(J0.pf.l,z*.08)));};
  base.hands={l:t("l"),r:t("r")};base.elbows=out?S(-.2,-1,.6):S(-.6,-.3,1);
  return fitJ(base,J=>{const piv=[TW+.17,1.72,0],bp=along(J,.33,-.22);
    const o=[...seatProps(false),backPad(J,{at:.33,len:.36}),["beam",along(J,.1,-.24),[-.13,.44,0],.065,.065],
      ["tower",[TW,0,0],[1,0,0]],["beam",bp,[TW+.13,bp[1],0],.065,.065]];
    for(const s of ["l","r"]){const z=s==="l"?1:-1,g=grip(J,s,.03);o.push(handle(g,J.pf.u,.07));
      o.push(["beam",add(g,mul(J.pf.u,.07)),[piv[0],piv[1],z*.24],.045,.045]);}
    o.push(["beam",[piv[0],piv[1],-.27],[piv[0],piv[1],.27],.065,.065]);return o;});};
/* a hip thrust: upper back on a bench across, feet flat; the load on the hips */
const thrust=(top,kind)=>{const p={pelvis:top?[-.03,.575,0]:[-.03,.355,0],pitch:top?-90:-60,head:top?25:10,
    feet:S(.42,.075,.16),knees:S(.2,1,.15)};
  const J0=joints(p),hip=along(J0,-.02,.135),bar=add(hip,[0,.02,0]);
  if(kind==="db")Object.assign(p,{hands:S(bar[0]-.02,bar[1]+.06,.1),elbows:S(0,-.3,1)});
  else Object.assign(p,{hands:S(bar[0],bar[1]+.035,kind==="machine"?.32:.3),elbows:S(-.2,-.4,1)});
  return fitJ(p,J=>{const o=[...crossBench(-.62)];
    if(kind==="smith"){o.push(["barbell",bar]);
      for(const z of [-.92,.92])o.push(["beam",[.05,0,z],[.05,2.16,z],.085,.085],["beam",[-.55,.022,z],[.6,.022,z],.1,.044],["tube",[.05,.05,z*.9],[.05,2.1,z*.9],.012,4]);
      o.push(["beam",[.05,2.2,-1],[.05,2.2,1],.085,.085]);}
    if(kind==="db")o.push(DB(add(hip,[0,.07,0]),[0,0,1]));
    if(kind==="machine"){const c=add(hip,mul(J.pf.f,.04));o.push(["soft",c,[0,0,1],J.pf.f,[.24,.04,.065]]);
      for(const z of [-1,1])o.push(["beam",[c[0],c[1],z*.31],[.66,.26,z*.31],.05,.05],["beam",[c[0],c[1],z*.24],[c[0],c[1],z*.31],.04,.04]);
      o.push(["beam",[.66,.26,-.34],[.66,.26,.34],.07,.07],leg([.66,.26,.3],.08),leg([.66,.26,-.3],.08),
        ["beam",[-.78,.022,0],[.75,.022,0],.12,.044],["beam",[.66,.022,-.36],[.66,.022,.36],.08,.044]);}
    return o;});};
/* hanging from a bar at 2.3 */
const hang=o=>Object.assign({pelvis:[0,1.25,0],hands:S(0,2.28,.27),handDir:S(0,1,0),elbows:S(-1,0,.5),toes:P(15,15),props:[["bar",2.3]]},o||{});
/* the plank both push-up drills start from */
const plank=o=>Object.assign({pelvis:[0,.45,0],pitch:76,head:-5,hands:S(.55,.04,.2),handDir:S(1,0,0),elbows:S(-1,0,0),
  feet:S(-.92,.09,.1),knees:S(0,-1,0),footDir:S(0,-1,0),props:[["mat",[0,0,0],{len:1.2}]]},o||{});
/* lying on the back: on a mat */
const mat=(len)=>["mat",[0,0,0],{len:len||1.1}];

export const FIGS={
  "Kettlebell Halo":{id:"Kettlebell_Halo",cam:{yaw:50},frames:[
    stand({hands:S(.22,1.33,.055),elbows:S(0,-1,.7),props:[["kettlebell",[.24,1.33,0],[0,1,0],{r:.085}]]}),
    stand({head:8,hands:S(-.2,1.5,.06),elbows:S(.6,.4,.8),props:[["kettlebell",[-.22,1.5,0],[0,1,0],{r:.085}]]})]},
  "Kettlebell Halo with Overhead Extension":{id:"Kettlebell_Halo_With_Overhead_Extension",cam:{yaw:50},frames:[
    stand({head:8,hands:S(-.2,1.5,.06),elbows:S(.6,.4,.8),props:[["kettlebell",[-.22,1.5,0],[0,1,0],{r:.085}]]}),
    stand({hands:S(.03,2.0,.06),elbows:S(0,0,1),props:[["kettlebell",[.03,2.02,0],[0,1,0],{r:.085}]]})]},
  "Kettlebell Overhead Triceps Extension":{id:"Kettlebell_Overhead_Triceps_Extension",cam:{yaw:60},frames:[
    stand({head:6,hands:S(-.19,1.6,.055),elbows:S(.3,1,.25),props:[["kettlebell",[-.2,1.6,0],[0,-1,0],{r:.085}]]}),
    stand({hands:S(.02,2.04,.055),elbows:S(.2,0,1),props:[["kettlebell",[.02,2.05,0],[0,-1,0],{r:.085}]]})]},
  "Bulgarian Split Squat":{id:id("Bulgarian Split Squat"),cam:{yaw:85},frames:[
    {pelvis:[-.06,.97,0],feet:P([.3,.075,.11],[-.66,.5,-.11]),knees:P([1,0,.1],[.2,-1,0]),footDir:P(null,[-1,-.25,0]),
      hands:S(-.06,.72,.24),props:[["bench",[-1.05,0,0],{len:.9}],...DBS(S(-.06,.72,.24))]},
    {pelvis:[-.17,.6,0],pitch:8,feet:P([.3,.075,.11],[-.66,.5,-.11]),knees:P([1,0,.1],[.1,-1,0]),footDir:P(null,[-1,-.25,0]),
      hands:S(-.1,.36,.24),props:[["bench",[-1.05,0,0],{len:.9}],...DBS(S(-.1,.36,.24))]}]},
  "Dumbbell Romanian Deadlift":{id:id("Dumbbell Romanian Deadlift"),cam:{yaw:85},frames:[
    stand({hands:S(.1,.74,.13),props:DBS(S(.1,.74,.13),.06,[0,0,1])}),
    {pelvis:[-.2,.92,0],pitch:72,feet:S(.02,.075,.12),knees:S(1,0,.1),hands:S(.22,.36,.13),props:DBS(S(.22,.36,.13),.06,[0,0,1])}]},
  "Pec Deck Fly":{id:id("Pec Deck Fly"),cam:{yaw:30,pitch:10},frames:[
    seated({hands:S(-.1,1.31,.52),elbows:S(0,-.4,1),props:[...seatProps(true,true),["soft",[-.06,1.2,.56],[0,1,0],[1,0,0],[.16,.038,.055]],["soft",[-.06,1.2,-.56],[0,1,0],[1,0,0],[.16,.038,.055]],
      ["beam",[TW+.17,1.75,-.16],[TW+.17,1.75,.16],.07,.07],["beam",[TW+.17,1.75,.14],[-.08,1.4,.56],.05,.05],["beam",[TW+.17,1.75,-.14],[-.08,1.4,-.56],.05,.05]]}),
    seated({hands:S(.3,1.31,.07),elbows:S(.3,-.4,1),props:[...seatProps(true,true),["soft",[.32,1.2,.1],[0,1,0],[0,0,1],[.16,.038,.055]],["soft",[.32,1.2,-.1],[0,1,0],[0,0,1],[.16,.038,.055]],
      ["beam",[TW+.17,1.75,-.16],[TW+.17,1.75,.16],.07,.07],["beam",[TW+.17,1.75,.14],[.3,1.4,.13],.05,.05],["beam",[TW+.17,1.75,-.14],[.3,1.4,-.13],.05,.05]]})]},
  "Dumbbell Arnold Press":{id:id("Dumbbell Arnold Press"),cam:{yaw:40},frames:[
    stand({hands:S(.16,1.45,.11),elbows:S(.2,-1,.1),handDir:S(0,1,0),props:DBS(S(.16,1.45,.11),-.07,[1,0,0])}),
    stand({hands:S(.02,1.98,.21),elbows:S(0,0,1),handDir:S(0,1,0),props:DBS(S(.02,1.98,.21),-.07,[0,0,1])})]},
  "Jumping Jacks":{id:id("Jumping Jacks"),cam:{yaw:12},frames:[
    stand({feet:S(0,.075,.1),hands:S(.02,.92,.24)}),
    {pelvis:[0,.99,0],feet:S(0,.075,.42),knees:S(1,0,.3),hands:S(0,2.0,.5),elbows:S(0,0,1)}]},
  "Dumbbell Walking Lunge":{id:id("Dumbbell Walking Lunge"),cam:{yaw:85},frames:[
    stand({hands:S(0,.74,.24),props:DBS(S(0,.74,.24))}),
    {pelvis:[-.05,.6,0],feet:P([.48,.075,.11],[-.5,.11,-.11]),knees:P([1,0,.1],[0,-1,0]),toes:P(0,55),
      hands:S(-.05,.34,.24),props:DBS(S(-.05,.34,.24))}]},
  "Dumbbell Reverse Lunge":{id:id("Dumbbell Reverse Lunge"),cam:{yaw:85},frames:[
    stand({hands:S(0,.74,.24),props:DBS(S(0,.74,.24))}),
    {pelvis:[-.12,.6,0],feet:P([.34,.075,.11],[-.66,.11,-.11]),knees:P([1,0,.1],[0,-1,0]),toes:P(0,55),
      hands:S(-.12,.34,.24),props:DBS(S(-.12,.34,.24))}]},
  "Wall Sit":{id:id("Wall Sit"),cam:{yaw:85},frames:[
    {pelvis:[-.3,.53,0],feet:S(.16,.075,.14),knees:S(1,0,.15),hands:S(-.05,.62,.22),props:[["wall",-.43,{h:1.6}]]}]},
  "Push-Up Hold":{id:id("Push-Up Hold"),cam:{yaw:75,pitch:12},frames:[
    {pelvis:[0,.43,0],pitch:79,head:-8,hands:S(.62,.06,.2),handDir:S(1,0,0),feet:S(-.95,.09,.09),knees:S(0,-1,0),footDir:S(0,-1,0),props:[["mat",[0,0,0],{len:1.2}]]}]},
  /* ---- machines and benches ---- */
  "Pendulum Squat":{id:id("Pendulum Squat"),cam:{yaw:70},frames:[
    pend({pelvis:[0,.99,0],pitch:-8,feet:S(.14,.13,.15),knees:S(1,.2,.25)}),
    pend({pelvis:[-.24,.56,0],pitch:12,feet:S(.14,.13,.15),knees:S(1,.3,.3)})]},
  "Nordic Hamstring Curl":{id:id("Nordic Hamstring Curl"),cam:{yaw:80},frames:[
    nordic({pelvis:[0,.6,0],hands:S(.04,.56,.24)}),
    nordic({pelvis:[.353,.453,0],pitch:45,head:-10,hands:S(.86,.32,.22),elbows:S(-.3,-.5,1)})]},
  "Cable Lateral Raise":{id:id("Cable Lateral Raise"),cam:{yaw:15,pitch:6},frames:[
    fitJ(stand({feet:S(0,.075,.13),hands:P([.05,1.12,.66],[.18,.86,.06]),elbows:P([-.5,-1,.3],[-.3,-.5,-1])}),J=>[["cable",[.1,0,.8],.14,grip(J,"r")]]),
    fitJ(stand({feet:S(0,.075,.13),hands:P([.05,1.12,.66],[.07,1.4,-.74]),elbows:P([-.5,-1,.3],[-.2,-.5,-.2])}),J=>[["cable",[.1,0,.8],.14,grip(J,"r")]])]},
  "Machine Lateral Raise":{id:id("Machine Lateral Raise"),cam:{yaw:25,pitch:10},frames:[mlr(false),mlr(true)]},
  "Chest-Supported Dumbbell Row":{id:id("Chest-Supported Dumbbell Row"),cam:{yaw:75},frames:[
    incline({pitch:55,hands:S(.2,.6,.19),elbows:S(-.2,0,1)},dbIn([1,0,0])),
    incline({pitch:55,hands:S(-.02,.93,.21),elbows:S(-.6,1,.4)},dbIn([1,0,0]))]},
  "Machine Chest Press":fromRecord("Machine Chest Press"),
  "Incline Machine Chest Press":{id:id("Incline Machine Chest Press"),cam:{yaw:60,pitch:8},frames:[press(-22,false),press(-22,true)]},
  "Seated Machine Row":fromRecord("Seated Machine Row"),
  "Single-Arm Cable Row":{id:id("Single-Arm Cable Row"),cam:{yaw:60,pitch:8},frames:[false,true].map(pulled=>
    fitJ({pelvis:[0,.95,0],pitch:18,twist:pulled?-8:12,feet:P([.3,.075,.13],[-.22,.075,-.13]),knees:S(1,0,.1),
      hands:P([.14,.86,.18],pulled?[.0,1.06,-.25]:[.66,1.12,-.1]),elbows:P([-.3,-1,.5],pulled?[-1,.3,-.3]:[-.2,-1,-.3])},
      J=>[["cable",[1.3,0,-.1],1.12,grip(J,"r",.04),{handle:false}],handle(grip(J,"r",.04),[0,1,0])]))},
  "Assisted Pull-Up Machine":{id:id("Assisted Pull-Up Machine"),cam:{yaw:52,pitch:8},frames:[false,true].map(up=>{
    const py=up?1.46:1.06,kn=py-.5;
    return {pelvis:[0,py,0],head:up?-5:0,feet:S(-.43,kn+.01,.11),knees:S(1,-1,.1),footDir:S(-1,-.2,0),
      hands:S(.04,2.1,.31),elbows:up?S(0,-1,.7):S(0,0,1),handDir:S(0,1,0),
      props:[["bar",2.13,{x:.04,w:.5}],["tower",[-.62,0,0],[1,0,0],{h:2.2}],["soft",[-.13,kn-.08,0],[1,0,0],[0,1,0],[.27,.036,.19]],
        ["beam",[-.13,kn-.12,0],[-.47,.72,0],.07,.05],["beam",[-.62,.022,0],[.42,.022,0],.1,.044]]};})},
  "Hip Adduction Machine":{id:id("Hip Adduction Machine"),cam:{yaw:20,pitch:22},frames:[true,false].map(open=>
    fitJ(seated({feet:open?S(.36,.2,.42):S(.4,.2,.13),knees:open?S(.6,.4,1):S(1,.4,.1),footDir:S(1,0,0)}),J=>{
      const o=[...seatProps(true,true)];for(const s of ["l","r"]){const z=s==="l"?1:-1,k=J.kn[s],a=J.an[s];
        const c=add(k,[-.06,0,-z*.078]);o.push(["soft",c,[1,0,0],[0,0,1],[.12,.03,.065]],["beam",add(c,[0,-.06,0]),[-.02,.3,z*.06],.045,.045],
          ["soft",add(a,[.05,-.075,0]),[1,0,0],[0,1,0],[.08,.018,.05]],["beam",add(a,[.05,-.09,0]),[-.02,.3,z*.06],.04,.04]);}
      return o;}))},
  "Smith Machine Hip Thrust":{id:id("Smith Machine Hip Thrust"),cam:{yaw:60,pitch:12},frames:[thrust(false,"smith"),thrust(true,"smith")]},
  "Hip Thrust Machine":{id:id("Hip Thrust Machine"),cam:{yaw:60,pitch:12},frames:[thrust(false,"machine"),thrust(true,"machine")]},
  "Dumbbell Hip Thrust":{id:id("Dumbbell Hip Thrust"),cam:{yaw:70,pitch:10},frames:[thrust(false,"db"),thrust(true,"db")]},
  "Bayesian Cable Curl":{id:id("Bayesian Cable Curl"),cam:{yaw:70},frames:[false,true].map(curl=>
    fitJ({pelvis:[0,.98,0],pitch:8,feet:P([-.18,.075,.13],[.28,.075,-.12]),knees:S(1,0,.1),
      hands:P(curl?[.1,1.3,.24]:[-.36,.96,.24],[.06,.92,-.22]),elbows:P(curl?[-1,-.6,0]:[-1,-.3,0],null)},
      J=>[["cable",[-.7,0,.24],.3,grip(J,"l"),{handle:false}],handle(grip(J,"l"),[0,0,1])]))},
  "Dumbbell Spider Curl":{id:id("Dumbbell Spider Curl"),cam:{yaw:75},frames:[
    incline({pitch:50,hands:S(.17,.62,.17),elbows:S(0,-1,.2)},dbIn([0,0,1])),
    incline({pitch:50,hands:S(.38,1.03,.17),elbows:S(0,-1,.2)},dbIn([0,0,1]))]},
  "Dumbbell Skull Crusher":{id:id("Dumbbell Skull Crusher"),cam:{yaw:65,pitch:14},frames:[false,true].map(down=>
    fitJ({pelvis:[.2,.55,0],pitch:-90,feet:S(.66,.075,.2),knees:S(.3,1,.2),
      hands:down?S(-.47,.73,.12):S(-.25,1.1,.12),elbows:down?S(.3,1,.2):S(0,0,1)},J=>[["bench",[-.1,0,0],{len:1.15}],...dbIn([1,0,0])(J)]))},
  "Machine Triceps Dip":{id:id("Machine Triceps Dip"),cam:{yaw:60,pitch:8},frames:[false,true].map(down=>
    fitJ(seated({hands:down?S(-.1,.56,.27):S(-.03,.83,.27),elbows:down?S(-1,0,.2):S(-1,0,.3)}),J=>{
      const o=[...seatProps(true,true)];for(const s of ["l","r"]){const z=s==="l"?1:-1,g=grip(J,s,.03);
        o.push(handle(g,[1,0,0],.07),["beam",add(g,[-.07,0,0]),[-.52,.92,z*.3],.045,.045]);}
      o.push(["beam",[-.52,.92,-.33],[-.52,.92,.33],.065,.065],["beam",[-.52,.92,0],[TW+.13,.92,0],.065,.065]);return o;}))},
  /* ---- floor and bodyweight ---- */
  "Hollow Body Hold":{id:id("Hollow Body Hold"),cam:{yaw:70,pitch:14},frames:[
    {pelvis:[0,.13,0],pitch:-75,head:15,hands:S(-.99,.41,.12),elbows:S(0,1,0),feet:S(.86,.36,.05),knees:S(0,1,0),toes:P(40,40),props:[mat(1.3)]}]},
  "Bird Dog":{id:id("Bird Dog"),cam:{yaw:60,pitch:14},frames:[
    {pelvis:[-.24,.5,0],pitch:80,head:-10,hands:S(.235,.05,.19),handDir:S(1,0,0),elbows:S(-1,0,0),feet:S(-.73,.07,.1),knees:S(1,-1,0),footDir:S(-1,-.08,0),props:[mat(1.2)]},
    {pelvis:[-.24,.5,0],pitch:80,head:-10,hands:P([.235,.05,.19],[.8,.64,-.19]),handDir:P([1,0,0],[1,0,0]),elbows:P([-1,0,0],[0,-1,0]),
      feet:P([-1.12,.55,.1],[-.73,.07,-.1]),knees:P([0,-1,0],[1,-1,0]),footDir:P([0,-1,0],[-1,-.08,0]),props:[mat(1.2)]}]},
  "Copenhagen Plank":{id:id("Copenhagen Plank"),cam:{yaw:72,pitch:22},frames:[
    {axes:{u:[1,.1,0],f:[0,0,1]},pelvis:[0,.49,0],hands:P([.02,.66,.06],[.47,.04,.27]),elbows:P([0,1,-.5],[0,-1,0]),
      feet:P([-.925,.49,.0],[-.85,.1,0]),knees:P([0,0,1],[0,0,1]),props:[...crossBench(-.95,{len:.5})]}]},
  "Hanging Knee Raise":{id:id("Hanging Knee Raise"),cam:{yaw:70},frames:[
    hang(),hang({pitch:-12,feet:S(.38,.78,.1),knees:S(1,0,.1),toes:P(30,30)})]},
  "Burpee":{id:id("Burpee"),cam:{yaw:70},frames:[
    plank({props:[]}),
    {pelvis:[0,1.13,0],feet:S(0,.17,.12),toes:P(45,45),hands:S(.05,2.1,.26),elbows:S(0,0,1)}]},
  "Dead Hang":{id:id("Dead Hang"),cam:{yaw:60},frames:[hang()]},
  "L-Sit Hold":{id:id("L-Sit Hold"),cam:{yaw:65,pitch:8},frames:[
    {pelvis:[-.06,.33,0],pitch:3,head:-5,hands:S(0,.23,.27),handDir:S(1,-.3,0),elbows:S(-1,0,0),feet:S(.8,.31,.06),knees:S(0,1,0),toes:P(35,35),props:[["parallettes",0,.27]]}]},
  "Scapular Push-Up":{id:id("Scapular Push-Up"),cam:{yaw:80,pitch:10},frames:[
    plank({pelvis:[0,.44,0],pitch:77}),plank({pelvis:[0,.47,0],pitch:74})]},
  /* ---- free weights and cables ---- */
  "Cable Woodchopper":{id:id("Cable Woodchopper"),cam:{yaw:25,pitch:6},frames:[false,true].map(low=>
    fitJ({pelvis:[0,.96,0],twist:low?35:-35,feet:S(0,.075,.25),knees:S(1,0,.3),
      hands:low?P([.34,.82,-.37],[.32,.84,-.45]):P([.2,1.72,.52],[.22,1.68,.44]),elbows:S(0,-1,0)},J=>[["cable",[.11,0,1.05],2.0,mid(grip(J,"l"),grip(J,"r"))]]))},
  "Kettlebell Swing":{id:id("Kettlebell Swing"),cam:{yaw:80},frames:[
    fitJ({pelvis:[-.24,.86,0],pitch:58,head:-15,feet:S(.04,.075,.2),knees:S(1,0,.3),hands:P([.0,.56,.035],[.0,.56,-.035]),elbows:S(0,0,1)},
      J=>[["kettlebell",mid(grip(J,"l",.06),grip(J,"r",.06)),[-.7,-.6,0],{r:.09}]]),
    fitJ(stand({feet:S(.04,.075,.2),hands:P([.56,1.36,.035],[.56,1.36,-.035]),handDir:S(1,0,0)}),
      J=>[["kettlebell",mid(grip(J,"l",.06),grip(J,"r",.06)),[1,-.15,0],{r:.09}]])]},
  "Cossack Squat":{id:id("Cossack Squat"),cam:{yaw:15,pitch:8},frames:[
    {pelvis:[0,.92,0],feet:S(.02,.075,.45),knees:S(1,0,.4),hands:P([.3,1.15,.04],[.3,1.15,-.04]),elbows:S(0,-1,.5)},
    {pelvis:[-.06,.55,.3],pitch:22,feet:P([.06,.075,.48],[.02,.12,-.6]),knees:P([1,.2,.6],[0,1,0]),footDir:P(null,[0,1,-.2]),
      hands:P([.42,.95,.33],[.42,.95,.25]),elbows:S(0,-1,.5)}]},
  "Belt Squat":{id:id("Belt Squat"),cam:{yaw:70,pitch:6},frames:[false,true].map(down=>
    fitJ(Object.assign(down?{pelvis:[-.14,.94,0],pitch:14,knees:S(1,0,.3)}:{pelvis:[0,1.345,0]},
      {feet:S(0,.42,.19),hands:S(.42,1.45,.26),elbows:S(-.3,-1,.5),handDir:S(1,0,0)}),J=>{
      const a=along(J,-.08,.13),py=down?.14:.545;
      return [["block",[0,.175,.27],[.34,.175,.13],3],["block",[0,.175,-.27],[.34,.175,.13],3],
        ["beam",[-.4,.022,0],[.5,.022,0],.8,.044],
        ["tube",a,[a[0],py+.13,0],.008,4],["disc",[a[0],py,0],[0,0,1],.13,.04],["tube",[a[0],py-.02,0],[a[0],py+.13,0],.012,4],
        ["tube",[.42,1.45,-.42],[.42,1.45,.42],.02,4],leg([.42,1.45,.42],.06),leg([.42,1.45,-.42],.06)];}))},
  "Cable Y-Raise":{id:id("Cable Y-Raise"),cam:{yaw:15,pitch:8},frames:[false,true].map(up=>
    fitJ(stand({pitch:6,feet:S(0,.075,.15),hands:up?S(.22,1.98,.52):P([.25,.92,-.07],[.25,.95,.07]),elbows:up?S(0,0,1):S(-.3,-1,.3)}),
      J=>[["cable",[.11,0,-.85],.14,grip(J,"l")],["cable",[.11,0,.85],.14,grip(J,"r")]]))},
  "Meadows Row":{id:id("Meadows Row"),cam:{yaw:40,pitch:14},frames:[false,true].map(up=>{
    const end=up?[.12,.84,-.22]:[.33,.53,-.16];
    return fitJ({pelvis:[-.2,.86,0],pitch:62,head:-12,feet:P([.32,.075,.2],[-.45,.075,-.14]),knees:S(1,0,.3),
      hands:P([.25,.6,.17],[end[0],end[1]+.04,end[2]]),elbows:P([0,-1,.5],up?[-.5,1,-.3]:[0,-1,-.2]),handDir:P(null,[0,-1,0])},J=>{
      const g=grip(J,"r"),anchor=[.42,.03,1.7],d=norm(sub(g,anchor));
      return [["tube",anchor,add(g,mul(d,.36)),.015,4],["disc",add(g,mul(d,.15)),d,.225,.05],["disc",add(g,mul(d,.21)),d,.2,.045],["block",anchor,[.08,.03,.08]]];});})},
  "Pendlay Row":{id:id("Pendlay Row"),cam:{yaw:42,pitch:16},frames:[false,true].map(up=>
    fitJ({pelvis:[-.28,.8,0],pitch:84,head:-20,feet:S(0,.075,.17),knees:S(1,0,.3),
      hands:up?S(.05,.715,.26):S(.2,.26,.26),elbows:up?S(-.5,1,.5):S(0,-1,.3)},J=>[["barbell",up?[.05,.68,0]:[.2,.225,0]]]))},
  /* ---- holds and balance ---- */
  "Couch Stretch":{id:id("Couch Stretch"),cam:{yaw:75,pitch:8},frames:[
    {pelvis:[-.3,.5,0],feet:P([.25,.075,.12],[-.55,.5,-.1]),knees:P([1,.5,.1],[-1,-1,0]),footDir:P(null,[-.1,1,0]),
      hands:P([.15,.6,.14],[.15,.6,.05]),props:[["wall",-.62,{h:1.2}],mat(.9)]}]},
  "Single-Leg Calf Raise":{id:id("Single-Leg Calf Raise"),cam:{yaw:78},frames:[false,true].map(up=>
    ({pelvis:[0,up?1.1:1.0,.03],feet:P([0,up?.175:.075,.1],[-.18,up?.52:.42,-.1]),toes:P(up?50:0,0),knees:P(null,[1,0,0]),
      hands:P([.06,up?1.02:.92,.22],[.52,1.32,-.2]),props:[["wall",.6,{h:1.9}]]}))},
  "Knee-to-Wall Ankle Mobilisation":{id:id("Knee-to-Wall Ankle Mobilisation"),cam:{yaw:75,pitch:8},frames:[false,true].map(fwd=>
    ({pelvis:fwd?[.08,.52,0]:[-.1,.56,0],feet:P([.45,.075,.12],[-.55,.08,-.1]),knees:P([1,.5,.1],[1,-1,0]),footDir:P(null,[-1,-.3,0]),
      hands:S(.56,1.02,.22),props:[["wall",.58,{h:1.8}],mat(.9)]}))},
  "Single-Leg Balance":{id:id("Single-Leg Balance"),cam:{yaw:45},frames:[
    {pelvis:[0,1.0,.03],feet:P([0,.075,.09],[.12,.4,-.1]),knees:P(null,[1,0,-.1]),hands:S(-.02,1.03,.21),elbows:S(-.4,0,1),handDir:S(.3,-1,0)}]},
  "Isometric Ankle Eversion":{id:id("Isometric Ankle Eversion"),cam:{yaw:20,pitch:25},frames:[
    seated({feet:P([.34,.075,.17],[.34,.075,-.2]),hands:S(.15,.68,.14),props:[...seatProps(false),["block",[.38,.08,-.29],[.12,.08,.04],3]]})]},
  "Isometric Ankle Inversion":{id:id("Isometric Ankle Inversion"),cam:{yaw:20,pitch:25},frames:[
    seated({feet:P([.34,.075,.25],[.34,.075,-.17]),hands:S(.15,.68,.14),props:[...seatProps(false),["block",[.38,.08,-.07],[.12,.08,.04],3]]})]},
  "Single-Leg RDL Reach":{id:id("Single-Leg RDL Reach"),cam:{yaw:75},frames:[
    stand({feet:P([0,.075,.1],[-.12,.1,-.12]),toes:P(0,30),hands:S(.05,.95,.22)}),
    {pelvis:[-.12,.92,0],pitch:80,head:-10,feet:P([0,.075,.1],[-1.05,.74,-.1]),knees:P([1,0,.1],[0,-1,0]),footDir:P(null,[0,-1,0]),hands:P([.42,.3,.12],[.45,.24,-.06])}]},
  "Spanish Squat Hold":{id:id("Spanish Squat Hold"),cam:{yaw:60,pitch:10},frames:[
    fitJ({pelvis:[-.4,.6,0],pitch:28,feet:S(0,.075,.15),knees:S(1,0,.2),hands:S(.35,1.0,.2)},J=>{
      const kl=J.kn.l,kr=J.kn.r,post=[.95,.5,0];
      return [["tube",add(kl,[-.065,0,.06]),add(kr,[-.065,0,-.06]),.012,3],["tube",add(kl,[-.02,0,.08]),add(post,[0,0,.03]),.012,3],["tube",add(kr,[-.02,0,-.08]),add(post,[0,0,-.03]),.012,3],
        ["tube",[.98,0,0],[.98,1.1,0],.04],["block",[.98,.02,0],[.15,.02,.15]]];})]},
  "Split Squat Hold":{id:id("Split Squat Hold"),cam:{yaw:80},frames:[
    {pelvis:[-.06,.56,0],feet:P([.4,.075,.11],[-.52,.11,-.11]),knees:P([1,0,.1],[0,-1,0]),toes:P(0,55),hands:S(-.03,.68,.2),elbows:S(-.5,0,1),handDir:S(.3,-1,0)}]},
  "Calf Raise Hold":{id:id("Calf Raise Hold"),cam:{yaw:70},frames:[
    {pelvis:[0,1.08,0],feet:S(0,.155,.12),toes:P(42,42)}]},
  /* ---- drills and stretches ---- */
  "Mini Hops":{id:id("Mini Hops"),cam:{yaw:70},frames:[
    {pelvis:[0,.97,0],feet:S(.02,.1,.12),toes:P(30,30),knees:S(1,0,.1),hands:S(.18,1.02,.24),elbows:S(-1,-.3,.2)},
    {pelvis:[0,1.06,0],feet:S(.02,.18,.12),toes:P(35,35),knees:S(1,0,.1),hands:S(.18,1.08,.24),elbows:S(-1,-.3,.2)}]},
  "Pogo Hops":{id:id("Pogo Hops"),cam:{yaw:70},frames:[
    {pelvis:[0,1.02,0],feet:S(0,.13,.11),toes:P(40,40),hands:S(.08,.9,.26)},
    {pelvis:[0,1.18,0],feet:S(0,.29,.11),toes:P(45,45),hands:S(.06,.98,.3)}]},
  "High Knees":{id:id("High Knees"),cam:{yaw:70},frames:[
    {pelvis:[0,1.02,0],feet:P([.4,.55,.1],[0,.1,-.1]),knees:P([1,0,.1],null),toes:P(25,30),
      hands:P([-.18,.98,.24],[.28,1.25,-.18]),elbows:P([-1,-.5,.2],[-.3,-1,-.2])},
    {pelvis:[0,1.02,0],feet:P([0,.1,.1],[.4,.55,-.1]),knees:P(null,[1,0,-.1]),toes:P(30,25),
      hands:P([.28,1.25,.18],[-.18,.98,-.24]),elbows:P([-.3,-1,.2],[-1,-.5,-.2])}]},
  "Thoracic Rotation":{id:id("Thoracic Rotation"),cam:{yaw:75,pitch:58},frames:[0,-70].map(tw=>
    ({axes:{u:[1,.1,0],f:[0,0,1]},pelvis:[0,.2,0],twist:tw,feet:P([-.47,.24,.44],[-.47,.08,.44]),knees:P([0,.3,1],[0,0,1]),
      hands:tw?P([.47,.06,-.78],[.5,.05,.55]):P([.5,.14,.56],[.5,.05,.55]),elbows:P(tw?[0,-1,0]:[0,1,0],[0,1,0]),props:[mat(1)]}))},
  "Spiderman Lunge":{id:id("Spiderman Lunge"),cam:{yaw:45,pitch:20},frames:[
    plank(),
    plank({pelvis:[-.15,.4,0],pitch:65,head:-15,hands:S(.42,.04,.2),feet:P([.33,.075,.36],[-.95,.09,-.1]),knees:P([.3,1,.7],[0,-1,0]),footDir:P(null,[0,-1,0])})]},
  "Walking Knee Hug":{id:id("Walking Knee Hug"),cam:{yaw:55},frames:[
    stand({feet:S(0,.075,.1)}),
    {pelvis:[0,1.02,0],head:5,feet:P([.12,.9,.1],[0,.1,-.1]),knees:P([1,.4,.1],null),toes:P(20,25),hands:P([.27,1.18,.15],[.27,1.18,.04]),elbows:S(-.3,-1,.5)}]},
  "Walking Quad Pull":{id:id("Walking Quad Pull"),cam:{yaw:65},frames:[
    stand({feet:S(0,.075,.1)}),
    {pelvis:[0,1.0,0],feet:P([-.2,.85,.1],[0,.075,-.1]),knees:P([.2,-1,0],null),footDir:P([-.6,.8,0],null),
      hands:P([-.24,.88,.14],[.1,2.0,-.22]),elbows:P([-.3,-1,.5],[0,0,-1])}]},
  "Lateral Lunge":{id:id("Lateral Lunge"),cam:{yaw:15,pitch:8},frames:[
    stand({feet:S(0,.075,.14),hands:P([.3,1.15,.04],[.3,1.15,-.04]),elbows:S(0,-1,.5)}),
    {pelvis:[-.12,.62,.3],pitch:28,feet:P([.05,.075,.62],[0,.075,-.45]),knees:P([1,.2,.6],[1,0,0]),hands:P([.36,.98,.32],[.36,.98,.24]),elbows:S(0,-1,.5)}]},
  "Arm Swings":{id:id("Arm Swings"),cam:{yaw:20,pitch:12},frames:[
    stand({feet:S(0,.075,.13),hands:S(-.02,1.42,.78),elbows:S(-1,0,0)}),
    stand({feet:S(0,.075,.13),hands:P([.42,1.34,-.24],[.38,1.28,.24]),elbows:S(0,-1,0)})]},
  "Pigeon Stretch":{id:id("Pigeon Stretch"),cam:{yaw:50,pitch:18},frames:[
    {pelvis:[-.05,.2,0],pitch:32,head:-5,feet:P([.33,.08,-.15],[-.9,.08,-.15]),knees:P([1,0,1],[0,-1,0]),footDir:P([.2,-.1,-1],[-1,-.1,0]),
      hands:S(.32,.06,.27),props:[mat(1.1)]}]},
  "Cobra Stretch":{id:id("Cobra Stretch"),cam:{yaw:70,pitch:12},frames:[
    {pelvis:[0,.11,0],pitch:42,head:-20,hands:S(.36,.04,.22),elbows:S(-1,-.2,.3),feet:S(-.88,.07,.1),knees:S(0,-1,0),footDir:S(-1,-.15,0),props:[mat(1.1)]}]},
  "Doorway Chest Stretch":{id:id("Doorway Chest Stretch"),cam:{yaw:35,pitch:8},frames:[
    {pelvis:[.12,.98,0],pitch:6,feet:P([.38,.075,.12],[-.12,.075,-.12]),knees:S(1,0,.1),hands:S(-.0,1.71,.43),elbows:S(-.3,-.5,1),handDir:S(0,1,0),
      props:[["door",-.02,{w:.5}]]}]},
  "Overhead Lat Stretch":{id:id("Overhead Lat Stretch"),cam:{yaw:70,pitch:8},frames:[
    {pelvis:[-.25,.92,0],pitch:70,head:0,feet:S(0,.075,.15),knees:S(1,0,.1),hands:P([.73,1.24,.05],[.73,1.28,-.05]),handDir:S(1,0,0),
      props:[["tube",[.8,0,0],[.8,2.0,0],.04],["block",[.8,.02,0],[.2,.02,.2]]]}]},
  "Butterfly Stretch":{id:id("Butterfly Stretch"),cam:{yaw:25,pitch:20},frames:[
    {pelvis:[-.05,.15,0],pitch:20,head:5,feet:P([.38,.08,.045],[.38,.08,-.045]),knees:P([0,.3,1],[0,.3,-1]),footDir:S(1,0,0),
      hands:P([.42,.13,.1],[.42,.13,-.1]),elbows:S(0,-.3,1),props:[mat(.9)]}]},
  "Figure-Four Stretch":{id:id("Figure-Four Stretch"),cam:{yaw:110,pitch:22},frames:[
    {pelvis:[0,.12,0],pitch:-90,head:5,feet:P([.36,.56,.1],[0,.5,.12]),knees:P([-.5,1,0],[0,.3,-1]),
      hands:P([.03,.38,.16],[.03,.38,.04]),elbows:S(0,-.5,1),props:[mat(1.1)]}]},
  "Standing Quad Stretch":{id:id("Standing Quad Stretch"),cam:{yaw:55},frames:[
    {pelvis:[0,1.0,0],feet:P([-.2,.85,.1],[0,.075,-.1]),knees:P([.2,-1,0],null),footDir:P([-.6,.8,0],null),
      hands:P([-.24,.88,.14],[0,1.32,-.62]),elbows:P([-.3,-1,.5],[0,-1,-.3]),props:[["block",[0,.85,-.72],[.35,.85,.05],5]]}]}
};

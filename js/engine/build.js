/* Bunyan — a program built for the person, from nothing (owner, 2 Nov: "the food and
   workout plan are not customised based on each person … you have ready templates,
   which shouldn't be the case: everything should be tailored to the user's input and
   assessment")

   The templates gave every lifter one of a dozen weeks, adjusted. This builds the week:

   1. How much each muscle gets. Hard sets a week from the range for the person's
      experience (js/coach/landmarks.js RANGE): the middle of it, the top for the muscles
      they asked to bring up, the bottom when sleep is short or stress high (recovery is
      slower; js/knowledge/adherence.js on sleep). A goal not trained for size keeps
      every muscle trained at the bottom of the range; the textbook's adaptation table
      sets its sets and reps per exercise afterwards.
   2. How often. Each big muscle twice a week where the days allow, more when its sets
      would not fit in two sessions (SESSION sets a session, a working limit, not a
      sourced figure); small ones as often as their sets need.
   3. On which days. The training days sit where the person trains them (the weekdays
      they gave, or spread evenly), and a muscle's sessions are placed at least two days
      apart: the textbook's rule, a rest day between sessions on the same muscles
      (acute-variables · frequency). Among the placements that keep it, the one that
      puts it with the muscles it works with (a press trains chest, shoulders and
      triceps; a row back and biceps) and on the lighter days wins. With few days this
      comes out as the whole body each time; with more, halves and then parts of the
      body, because that is what the rest rule and the grouping leave, not because a
      template said so.
   4. Which exercises. For each muscle on each day, the movement it has not had yet this
      week first (a vertical pull, then a row; a squat, then a lunge), compound before
      isolation; only what the person owns, nothing that loads a sore spot, nothing they
      hid, the ones they starred first, then the familiar ones.
   5. In order: the muscles they asked for first, compounds before isolation (the
      textbook's order: the priority first, multi-joint before single-joint).

   What comes out is the week's skeleton: days, their exercises, a set count per
   exercise. js/engine/plan.js then doses it (sets, reps, rest and effort from the goal,
   experience and the textbook's adaptation table), fits each day to the session length
   and balances the weekly volume, as it does for any program.

   buildWeek(p, gear, h) → {name, days:[{name, wd, ex:[{name, muscle, sets}]}], why[]}
     p: the profile (days, mins, level, goal, sleep, stress, focus, wd);
     h: the plan engine's helpers, passed in so this file imports nothing above it:
        usable(name, gear), avoids(name, limits), familiar() → {name:1} they have logged,
        pool {name:1} the app's programs use, dose(name) → {sets, rest}, train(goal),
        favs[], skip[], skilled, weekdays(n) → ISO weekdays. */
import {EXDB, isCompound, LIB, movementOfEx, muscleOf, secondaryOf} from "../data/exercises.js";
import {isActivity} from "../data/activities.js";
import {RANGE} from "../coach/landmarks.js";

var BIG=["Chest","Back","Quads","Shoulders","Hamstrings","Glutes"];
var GROUP={Chest:"push",Shoulders:"push",Triceps:"push",Back:"pull",Biceps:"pull",
  Quads:"legs",Hamstrings:"legs",Glutes:"legs",Calves:"legs",Core:"core"};
var SESSION=10;
var TIMED=/plank|hold|hang|wall sit|bridge hold|isometric|stretch/i;

/* Weekly hard sets each muscle is built to. */
function targets(p,train){
  var r=RANGE[p.level]||RANGE.some,lo=r[0],hi=r[1],mid=Math.round((lo+hi)/2);
  var slow=(+p.sleep>0&&+p.sleep<6)||p.stress==="high",focus=p.focus||[],out={};
  BIG.concat(["Biceps","Triceps"]).forEach(function(m){
    var t=train==="hyp"?mid:lo;
    if(slow)t=lo;
    if(focus.indexOf(m)>=0)t=train==="hyp"?hi:mid;
    out[m]=t;});
  /* The arms get much of their work from presses and rows (half a set each); their own
     exercises make up the rest, so they are built to less of their own. */
  out.Biceps=Math.max(4,Math.round(out.Biceps*(focus.indexOf("Biceps")>=0?0.7:0.5)));
  out.Triceps=Math.max(4,Math.round(out.Triceps*(focus.indexOf("Triceps")>=0?0.7:0.5)));
  out.Calves=focus.indexOf("Calves")>=0?8:6;
  out.Core=focus.indexOf("Core")>=0?8:6;
  return out;}

/* Days apart on the weekly cycle, both ways round. */
function gap(a,b){var d=Math.abs(a-b)%7;return Math.min(d,7-d);}
function combos(n,k){
  var out=[];
  (function rec(start,acc){
    if(acc.length===k){out.push(acc.slice());return;}
    for(var i=start;i<n;i++){acc.push(i);rec(i+1,acc);acc.pop();}})(0,[]);
  return out;}

/* The day sets a muscle can be trained on: every pair at least two days apart, all round
   the week (the textbook's rest day between sessions on the same muscles). */
function spaced(pos,k){
  return combos(pos.length,k).filter(function(c){
    for(var i=0;i<c.length;i++)for(var j=i+1;j<c.length;j++)if(gap(pos[c[i]],pos[c[j]])<2)return false;
    return true;});}
/* Where each muscle's sessions go: [{muscle, days:[i…], sets}] and, per day, its muscles.
   The muscles that work together go together (UNITS: a press trains chest, shoulders
   and triceps; a row back and biceps; the legs as one), so a unit is placed as one, and
   every way of placing the three is tried: each on as many days as its sets need (two
   at least, three at most), the rest day kept for each, every training day used, the
   days' work as even as it can be, and with four days or more, an upper day not also a
   leg day. The core goes on the lightest days. */
var UNITS={push:["Chest","Shoulders","Triceps"],pull:["Back","Biceps"],legs:["Quads","Hamstrings","Glutes","Calves"]};
function place(T,pos,p){
  var n=pos.length,focus=p.focus||[],names=Object.keys(UNITS);
  var opts=names.map(function(u){
    var f=2;UNITS[u].forEach(function(m){if(T[m])f=Math.max(f,Math.ceil(T[m]/SESSION));});
    /* Three days or fewer, each a rest day apart: every muscle every session, the whole
       body each time, as the rest rule allows. */
    if(n<=3)f=n;
    f=Math.min(f,3,n);
    var c=[];while(f>=1&&!(c=spaced(pos,f)).length)f--;
    var w=0;UNITS[u].forEach(function(m){w+=T[m]||0;});
    return {u:u,c:c.length?c:[[0]],w:w};});
  var best=null;
  (function rec(i,pick){
    if(i===names.length){
      var load=pos.map(function(){return 0;}),has=pos.map(function(){return {};}),sc=0;
      pick.forEach(function(c,k){c.forEach(function(d){load[d]+=opts[k].w/c.length;has[d][opts[k].u]=1;});});
      for(var d=0;d<n;d++){
        if(!load[d])sc-=10;
        if(n>=4&&has[d].legs&&(has[d].push||has[d].pull))sc-=2;
        if(has[d].push&&has[d].pull&&!has[d].legs)sc+=0.5;}
      sc-=(Math.max.apply(null,load)-Math.min.apply(null,load))*0.1;
      if(!best||sc>best.sc+1e-9)best={sc:sc,pick:pick.slice()};
      return;}
    opts[i].c.forEach(function(c){pick.push(c);rec(i+1,pick);pick.pop();});})(0,[]);
  var on=pos.map(function(){return {};}),load=pos.map(function(){return 0;}),plan=[];
  best.pick.forEach(function(c,k){
    UNITS[opts[k].u].forEach(function(m){
      if(!T[m])return;
      c.forEach(function(d){on[d][m]=T[m]/c.length;load[d]+=T[m]/c.length;});
      plan.push({muscle:m,days:c,sets:T[m]/c.length});});});
  if(T.Core){
    var k=n>=3?2:1,cs=spaced(pos,k);while(!cs.length&&k>1)cs=spaced(pos,--k);
    var lc=cs.sort(function(a,b){
      var la=0,lb=0;a.forEach(function(d){la+=load[d];});b.forEach(function(d){lb+=load[d];});return la-lb;})[0]||[0];
    lc.forEach(function(d){on[d].Core=T.Core/lc.length;});
    plan.push({muscle:"Core",days:lc,sets:T.Core/lc.length});}
  /* Built in this order: the priority first, then the big muscles, the most work first. */
  plan.sort(function(a,b){
    var fa=focus.indexOf(a.muscle)>=0?1:0,fb=focus.indexOf(b.muscle)>=0?1:0;
    if(fa!==fb)return fb-fa;
    var ba=BIG.indexOf(a.muscle)>=0?1:0,bb=BIG.indexOf(b.muscle)>=0?1:0;
    return bb-ba||T[b.muscle]-T[a.muscle];});
  return {plan:plan,on:on};}

/* The exercises a muscle may be trained with, best first. The pool is the movements the
   app's own programs are written with (js/data/splits.js: the presses, rows, squats,
   hinges and curls a coach would write), plus what the person starred or has logged.
   The library holds far more (slams, olympic lifts, strongman, jumps); those are kept
   for anyone who picks them, never put in a week on their own. Only when the person's
   equipment leaves a muscle nothing from that pool does the wider library fill in, and
   then only plain strength movements at a beginner or intermediate level. */
var NOT_MV={cardio:1,jump:1,mobility:1};
var ODD=/slam|throw|clean|snatch|jerk|atlas|stone|sled|drag|rope|tire|yoke|farmer|carry|swing|balance|reach|around the world|flutter|butt-ups|bent press|superman|pullover|hops|burpee|climber/i;
function candidates(m,gear,p,h){
  var fam=h.familiar(),favs=h.favs||[],skip=h.skip||[],pool=h.pool||{},out=[],wide=[];
  LIB.forEach(function(l){
    var n=l[0];
    if(l[1]!==m||isActivity(n)||skip.indexOf(n)>=0||!h.usable(n,gear)||h.avoids(n,p.limits||[]))return;
    var v=EXDB&&EXDB[n]||{},mv=movementOfEx(n),fav=favs.indexOf(n)>=0;
    if(NOT_MV[mv]||v.p==="Mobility"||v.p==="Conditioning")return;
    if(TIMED.test(n)&&m!=="Core")return;
    /* A deadlift is a leg day's hinge, not a back exercise: the back gets rows and pulls. */
    if(mv==="hinge"&&(m==="Back"||m==="Quads"))return;
    /* A shrug is the traps' exercise, not a back exercise. */
    if(mv==="shrug"&&!fav)return;
    if(ODD.test(n)&&!fav&&!fam[n])return;
    if((v.d==="Advanced"||/nordic|glute.?ham|pistol/i.test(n))&&!h.skilled&&!fav)return;
    var sc=0;
    if(fav)sc+=8;
    if(fam[n])sc+=4;
    if(pool[n])sc+=3;
    if(v.d==="Beginner")sc+=0.5;
    if(gear&&gear.length&&gear.indexOf(v.e)>=0)sc+=0.5;
    /* With weights to hand, your own body weight is the lighter choice, not the first. */
    if(v.e==="Bodyweight"&&(!gear||gear.some(function(g){return g!=="Bodyweight";})))sc-=2;
    var c={n:n,sc:sc,c:isCompound(n),mv:mv,x:secondaryOf(n)||[]};
    if(fav||pool[n]||fam[n])out.push(c);
    else if(v.d!=="Advanced"&&v.d!=="Expert"&&!/ - |\(/.test(n))wide.push(c);});
  var by=function(a,b){return b.sc-a.sc||(a.n<b.n?-1:1);};
  out.sort(by);wide.sort(by);
  /* Two kinds of movement at least for a big muscle, so the wider library tops up a
     pool the equipment has thinned. */
  var kinds={};out.forEach(function(c){kinds[c.mv]=1;});
  if(out.length<2||(BIG.indexOf(m)>=0&&Object.keys(kinds).length<2))
    out=out.concat(wide.filter(function(c){return !kinds[c.mv];}).slice(0,3));
  return out;}

function dayName(muscles){
  var g={};muscles.forEach(function(m){g[GROUP[m]]=1;});
  var push=g.push,pull=g.pull,legs=g.legs;
  if(push&&pull&&legs)return "Full Body";
  if(push&&pull)return "Upper";
  if(legs&&!push&&!pull)return "Lower";
  if(push&&!pull)return legs?"Full Body":"Push";
  if(pull&&!push)return legs?"Full Body":"Pull";
  return "Full Body";}

function buildWeek(p,gear,h){
  var n=Math.max(1,Math.min(6,+p.days||3));
  var pos=(p.wd&&p.wd.length?p.wd.slice(0,7).map(Number):h.weekdays(n)).slice().sort(function(a,b){return a-b;});
  n=pos.length;
  var train=h.train(p.goal),T=targets(p,train),pl=place(T,pos,p),focus=p.focus||[];
  var CANDS={},used={},usedMv={},credit={},ex=pos.map(function(){return [];}),mins=pos.map(function(){return 0;});
  var budget=Math.max(25,(+p.mins||60)-8);
  Object.keys(T).forEach(function(m){CANDS[m]=candidates(m,gear,p,h);usedMv[m]={};credit[m]=0;});
  /* Muscle by muscle, in the order they were placed (the priority first, then the big
     ones), each gets the exercises its weekly sets still need after what the earlier
     ones gave it: a press already gives the triceps half a set for each of its sets, a
     squat the glutes, so they are built to less of their own. Sets per exercise are the
     plan engine's (doseFor), so what is built here is what the week will hold. */
  var onDay=pos.map(function(){return {};});
  function add(m,d,first){
    var list=CANDS[m]||[];
    var pick=list.filter(function(c){return !used[c.n]&&(!first||c.c)&&!usedMv[m][c.mv];})[0]
      ||list.filter(function(c){return !used[c.n]&&(!first||c.c);})[0]
      ||list.filter(function(c){return !used[c.n];})[0];
    if(!pick)return false;
    var dose=h.dose(pick.n),t=dose.sets*((dose.rest||75)+35)/60;
    if(!first&&mins[d]+t>budget)return false;
    used[pick.n]=1;usedMv[m][pick.mv]=1;mins[d]+=t;
    ex[d].push({name:pick.n,muscle:m,sets:dose.sets,c:pick.c,f:focus.indexOf(m)>=0});
    credit[m]+=dose.sets;onDay[d][m]=(onDay[d][m]||0)+dose.sets;
    pick.x.forEach(function(o){if(o!==m&&credit[o]!=null)credit[o]+=dose.sets/2;});
    return true;}
  /* First, one exercise for each muscle on each of its days, the priority and the big
     ones first: a muscle the others' work already covers (the triceps after the
     presses, the glutes after squats and hinges) gets none of its own, unless they
     asked to bring it up. Then, while a day has time, more for the muscles still short
     of their share, up to three exercises a muscle a day. */
  pl.plan.forEach(function(x){
    var m=x.muscle,isF=focus.indexOf(m)>=0,big=BIG.indexOf(m)>=0;
    x.days.forEach(function(d,k){
      var share=(T[m]-credit[m])/(x.days.length-k);
      if(share<1.5&&!isF&&!(big&&!k&&credit[m]<T[m]*0.5))return;
      if(!add(m,d,big||isF)&&big)add(m,d,false);});});
  for(var round=0;round<2;round++)pl.plan.forEach(function(x){
    var m=x.muscle;
    x.days.forEach(function(d){
      if(T[m]-credit[m]<1.5)return;
      if((onDay[d][m]||0)<x.sets-1.5&&ex[d].filter(function(e){return e.muscle===m;}).length<3)add(m,d,false);});});
  var days=pos.map(function(wd,i){
    var e=ex[i];
    /* The priority first, then multi-joint before single-joint (the textbook's order). */
    e.sort(function(a,b){return (b.f?1:0)-(a.f?1:0)||(b.c?1:0)-(a.c?1:0)||(BIG.indexOf(a.muscle)>=0?0:1)-(BIG.indexOf(b.muscle)>=0?0:1);});
    var mus=[];e.forEach(function(x){if(mus.indexOf(x.muscle)<0)mus.push(x.muscle);});
    return {name:dayName(mus),wd:wd,ex:e.map(function(x){return {name:x.name,muscle:x.muscle,sets:x.sets};})};});
  /* "Upper A", "Upper B": a name used twice gets its letter. */
  var count={},seen={};
  days.forEach(function(d){count[d.name]=(count[d.name]||0)+1;});
  days.forEach(function(d){if(count[d.name]>1){seen[d.name]=(seen[d.name]||0)+1;d.name=d.name+" "+"ABCDEF".charAt(seen[d.name]-1);}});
  var freq={};pl.plan.forEach(function(x){freq[x.muscle]=x.days.length;});
  return {name:"Built for you",days:days,targets:T,freq:freq};}

export {buildWeek, targets as buildTargets};

/* Bunyan — what is stored, and how it changes shape
   One profile's data is one object, S, kept as a JSON blob (localStorage) with the
   history and the food log beside it in IndexedDB (js/db.js). This module says what
   that object holds (the types below), fills in what a blob from an older version or
   a hand-edited backup is missing (normalize), carries old shapes forward one
   numbered version at a time (migrateDB), and checks that a file offered as a backup
   is one of ours before anything is replaced (checkBackup).

   Pure: plain data in, plain data out. It imports nothing; what a migration needs
   from the app (the program templates, an id maker) is handed in. tests/engine.mjs
   runs its tests in Node.

   ---- the types --------------------------------------------------------------------
   @typedef {Object} DB  one profile, everything it keeps
   @property {number}   v              schema version (VERSION below); missing means 1
   @property {Profile}  profile
   @property {Prefs}    prefs
   @property {Goals}    goals          the day's targets
   @property {Program[]} programs      every program the person owns
   @property {?string}  activeProgram  the id of the one trained on
   @property {Session[]} sessions      finished workouts, newest first
   @property {?Active}  active         the workout under way, or null
   @property {BodyEntry[]} body        weigh-ins and measurements, oldest first
   @property {Object<string,DayRec>} days  the food and recovery log by date ("YYYY-MM-DD")
   @property {?string[]} gear          equipment owned; null means a full gym
   @property {string[]} favs           starred exercise names
   @property {string[]} skip           exercise names never suggested
   @property {Food[]}   myFoods        foods the person added
   @property {SavedMeal[]} savedMeals
   @property {Object<string,number>} freq  food id → times logged
   @property {CustomEx[]} myEx         exercises the person added
   @property {Object<string,number>} incr  exercise name → own weight step, kg
   @property {Object<string,string>} daySwap  date → day id trained instead
   @property {Deload}   deload         the lighter week, started or put off
   @property {Block=}   block          where the current training block began (js/engine/blocks.js)
   @property {Energy=}  energy         maintenance measured from the log, once chosen
   @property {Slot[]=}  mealSlots      the day's meals, when not the usual four
   @property {Object[]=} chat          the coach chat's kept conversation
   @property {number}   lastBackup     ms since 1970, 0 for never
   @property {number}   backupSnooze   ms; no reminder before then
   @property {boolean}  onboarded
   Also kept, each optional and read where it is written: coachDismiss and pcDismiss
   (id → date a card was set aside until), barcodes (code → food), wdOffered.

   @typedef {Object} Profile
   @property {?number} age  @property {?number} height  cm  @property {?number} weight  kg
   @property {"m"|"f"} sex  @property {number} activity  1.2–1.9
   @property {string} goal  a key of js/data/goals.js
   @property {"conservative"|"standard"|"aggressive"} prog  how fast weight goes up
   @property {"new"|"some"|"experienced"|"advanced"} level  @property {number} days  a week
   @property {string[]=} limits  sore areas: knee, back, shoulder, wrist, ankle

   @typedef {Object} Prefs  the Settings screens; the off flags (nowarm, nocool,
     noblocks) are false or missing for on, so a new setting needs no migration.

   @typedef {Object} Goals
   @property {number} kcal @property {number} p @property {number} c @property {number} f
   @property {number} water  ml  @property {number} steps

   @typedef {Object} Program
   @property {string} id  @property {string} name  @property {?string} from  the template it came from
   @property {"week"|"cycle"} schedule  pinned to weekdays, or the next day in order
   @property {Day[]} days  @property {string=} start  "YYYY-MM-DD", for a program with weeks

   @typedef {Object} Day
   @property {string} id  @property {string} name  @property {number[]} wd  weekdays, Monday 1
   @property {PlanEx[]} ex  @property {string[]=} notes

   @typedef {Object} PlanEx  an exercise as the plan prescribes it
   @property {string} id  @property {string} name  @property {number} sets
   @property {number} lo  @property {number} hi  reps, or seconds when timed
   @property {number=} rest  s  @property {number=} rir  reps in reserve
   @property {boolean=} timed  @property {boolean=} side  @property {boolean=} amrap
   @property {number[]=} wk  [from, to] weeks it belongs to  @property {string=} alt
   @property {string=} grp  superset group  @property {string=} note

   @typedef {Object} Session  a finished workout
   @property {string} id  @property {string} date  "YYYY-MM-DD"  @property {string=} dayId
   @property {string} dayName  @property {Entry[]} entries  @property {number=} activeMs
   @property {number=} srpe  how hard, 1–10  @property {"easy"|"right"|"much"=} feel  the amount of work
   @property {number=} ready  how they felt starting, 1–5
   @property {{n:number,week:number,light:boolean}=} block  the training block it fell in

   @typedef {Object} Entry
   @property {string} name  @property {string=} exId  @property {string=} muscle
   @property {SetRow[]} sets  @property {Object=} planned  what the plan asked of it
   @property {boolean=} pain

   @typedef {Object} SetRow
   @property {number} w  kg added (bodyweight lifts) or moved  @property {number} r  reps or seconds
   @property {number=} rpe  @property {boolean=} wu  a warm-up set: counts for nothing
   @property {number=} min  @property {number=} km  activities

   @typedef {Session} Active  plus started, lastSet, idx: the clock and where they are

   @typedef {Object} BodyEntry
   @property {string} date  @property {number=} weight  kg  @property {number=} bf  %
   @property {number=} waist  @property {number=} neck  @property {number=} hips  cm, and the other tape measures

   @typedef {Object} DayRec
   @property {number} water  @property {number} steps  @property {number} sleep  h
   @property {number} sore  0–10  @property {Object<string,{items:Item[],done:boolean}>} meals

   @typedef {Object} Item  @property {number} kcal @property {number} p @property {number} c
     @property {number} f @property {number=} fib @property {string=} fid  the food it came from

   @typedef {{until:string=,last:string=,snooze:string=}} Deload
   @typedef {{start:string}} Block
   @typedef {{kcal:number,at:string}} Energy
*/

var VERSION=3;

/* What a new profile starts with. No body stats: these were one person's real
   measurements, hardcoded in early development, and everyone else was handed them —
   along with a macro target that looked calculated before anything had been entered. */
var DEF={
  v:VERSION,theme:"dark",unit:"kg",
  profile:{age:null,height:null,weight:null,sex:"m",activity:1.4,goal:"lose",prog:"standard",
           level:"some",days:3},
  onboarded:false,plannedWeekly:14,
  gear:null,favs:[],skip:[],
  myFoods:[],savedMeals:[],freq:{},
  prefs:{palette:"red",rpe:"last",autorest:true,sound:true,awake:true,compact:false,splash:true,
         warn:10,unit:"kg",view:"set",haptic:true,anim:true,lang:"en"},
  goals:{kcal:1950,p:175,c:170,f:62,water:3000,steps:9000},
  programs:[],activeProgram:null,myEx:[],
  lastBackup:0,backupSnooze:0,
  sessions:[],active:null,body:[],days:{}
};

/* ---- normalize: every section the app reads, of the type it expects ---------------
   A blob from an older version, a partial restore or a hand-edited backup used to
   leave, say, S.goals undefined — and every render then threw. The version number is
   not filled in from the defaults: a blob without one is from before versions, and
   migrateDB has to know that. */
function normalize(o){
  if(!o||typeof o!=="object"||Array.isArray(o))o={};
  var d=JSON.parse(JSON.stringify(DEF));
  ["profile","prefs","goals"].forEach(function(k){
    var v=o[k];
    o[k]=Object.assign({},d[k],(v&&typeof v==="object"&&!Array.isArray(v))?v:{});});
  ["favs","skip","myFoods","savedMeals","programs","myEx","body","sessions"].forEach(function(k){
    if(!Array.isArray(o[k]))o[k]=[];});
  ["freq","days","daySwap","incr","deload"].forEach(function(k){
    if(!o[k]||typeof o[k]!=="object"||Array.isArray(o[k]))o[k]={};});
  Object.keys(d).forEach(function(k){if(k!=="v"&&!(k in o))o[k]=d[k];});
  if(o.myPlan&&!Array.isArray(o.myPlan.days))o.myPlan=null;
  /* Maintenance measured from the log and chosen as the base for the targets
     (js/engine/energy.js): a plausible number of kcal, or nothing. */
  if(o.energy!=null&&!(o.energy&&typeof o.energy==="object"&&+o.energy.kcal>=1000&&+o.energy.kcal<=6000))delete o.energy;
  /* The coach chat's kept conversation (js/ui/views/chat.js): a list, or nothing. */
  if(o.chat!=null&&!Array.isArray(o.chat))delete o.chat;
  /* Where the training block began (js/engine/blocks.js): a date, or nothing. */
  if(o.block!=null&&!(o.block&&typeof o.block.start==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(o.block.start)))delete o.block;
  /* The day's meals (js/engine/meals.js): a list of {id, name?, plan?, todo?}, or
     absent for the usual four. Anything else is dropped rather than half-trusted. */
  if(o.mealSlots!=null){
    if(!Array.isArray(o.mealSlots))delete o.mealSlots;
    else{
      o.mealSlots=o.mealSlots.filter(function(x){return x&&typeof x.id==="string"&&x.id;});
      o.mealSlots.forEach(function(x){
        if(x.name!=null&&typeof x.name!=="string")delete x.name;
        if(x.plan!=null&&!Array.isArray(x.plan))delete x.plan;
        if(x.todo!=null&&!Array.isArray(x.todo))delete x.todo;});
      if(!o.mealSlots.length)delete o.mealSlots;}}
  if(o.active){
    if(typeof o.active!=="object"||!Array.isArray(o.active.entries))o.active=null;
    else o.active.entries.forEach(function(e){
      if(!Array.isArray(e.sets))e.sets=[];
      if(!e.planned||typeof e.planned!=="object")e.planned={sets:3,lo:8,hi:12};});}
  o.sessions=o.sessions.filter(sessionOk);
  o.body=o.body.filter(function(b){return b&&typeof b.date==="string";});
  /* A weight step per exercise, in kg: only real positive numbers survive. */
  Object.keys(o.incr).forEach(function(n){var v=+o.incr[n];if(!(v>0&&v<=50))delete o.incr[n];});
  return o;
}
/* A workout that can be read: a date and a list of exercises. */
function sessionOk(s){return !!(s&&Array.isArray(s.entries)&&typeof s.date==="string");}

/* ---- programs -------------------------------------------------------------------- */
/* Every program the same shape: a schedule of "week" or "cycle", and days with
   weekday and exercise lists. Two fields from older versions go. */
function normProg(p){
  p.schedule=p.schedule==="week"?"week":"cycle";
  (p.days||(p.days=[])).forEach(function(d){
    if(!Array.isArray(d.wd))d.wd=[];if(!Array.isArray(d.ex))d.ex=[];});
  delete p.source;delete p.custom;
  return p;}
/* A program of your own from a template or another program, with fresh ids.
   env: {uid(), template(id)} */
function copyProgram(src,env){
  var c=JSON.parse(JSON.stringify(src));
  c.from=src.from||(env.template(src.id)?src.id:null);
  c.id=env.uid();
  c.days.forEach(function(d){d.id=env.uid();d.ex.forEach(function(e){e.id=env.uid();});});
  return normProg(c);}

/* ---- migrations -------------------------------------------------------------------
   Each step takes a blob from the version before `to` and leaves it in that version's
   shape. Steps run in order, each once; a blob records the version it is in. A new
   shape is a new step at the end, with a test in js/test/schema.test.js — never an
   edit to an old one, since blobs and backups in the old shapes are out there. */
var STEPS=[
  /* 3: programs you own. Before: v1 kept one list of splits and the current one's id;
     v2 an "active copy" (myPlan) beside the splits saved from it (userSplits). Both
     become owned programs. The active copy keeps its day ids, which history and the
     schedule are keyed on; a saved split it was a copy of is merged into it. */
  {to:3,what:"splits and the active copy become programs you own",run:function(db,env){
    if(Array.isArray(db.programs)&&db.programs.length){
      delete db.myPlan;delete db.userSplits;delete db.splits;delete db.currentSplit;return;}
    var legacy=[],mp=db.myPlan&&Array.isArray(db.myPlan.days)?db.myPlan:null;
    if(!mp&&Array.isArray(db.splits)&&db.splits.length){
      var act=db.splits.filter(function(x){return x.id===db.currentSplit;})[0]||db.splits[0];
      mp=JSON.parse(JSON.stringify(act));mp.source=mp.source||(mp.id==="plan"?"ap":mp.id);
      legacy=db.splits.filter(function(x){return x.custom&&x!==act&&!env.template(x.id)&&x.id!=="plan";});}
    var progs=(db.userSplits||[]).concat(legacy).map(function(u){return normProg(JSON.parse(JSON.stringify(u)));});
    var active=null;
    if(mp){
      var same=progs.filter(function(q){return q.id===mp.source;})[0];
      if(same){same.days=JSON.parse(JSON.stringify(mp.days));same.name=mp.name;normProg(same);active=same.id;}
      else{var np=normProg(JSON.parse(JSON.stringify(mp)));np.from=env.template(mp.source)?mp.source:null;np.id=env.uid();
        progs.unshift(np);active=np.id;}}
    db.programs=progs;db.activeProgram=active||(progs[0]&&progs[0].id)||null;
    delete db.myPlan;delete db.userSplits;delete db.splits;delete db.currentSplit;}}
];

/* Every load, whatever the version: each program in shape, at least one program
   (the full-body template, for a profile with none), and an active one that exists. */
function tidy(db,env){
  if(!Array.isArray(db.programs))db.programs=[];
  db.programs.forEach(normProg);
  if(!db.programs.length){var fb=env.template("fb");if(fb){var c=copyProgram(fb,env);db.programs.push(c);}}
  var ids=db.programs.map(function(p){return p.id;});
  if(ids.indexOf(db.activeProgram)<0)db.activeProgram=ids[0]||null;}

/* The fields only versions 1 and 2 wrote. Versions were not recorded reliably before
   3 — every blob said 2 — so where these are still present the blob is treated as v2
   whatever its v says, and step 3 carries them forward. */
function oldShape(db){return !!(db.myPlan||db.userSplits||Array.isArray(db.splits));}
/* Brings a blob to VERSION. Returns the versions it passed through (empty when it
   was already current), so the caller knows whether to save. A blob from a newer
   version is left as it is: checkBackup refuses those before they get here. */
function migrateDB(db,env){
  var from=+db.v||1,ran=[];
  if(from>VERSION)return ran;
  if(from>2&&oldShape(db))from=2;
  STEPS.forEach(function(s){if(s.to>from){s.run(db,env);ran.push(s.to);}});
  tidy(db,env);
  db.v=VERSION;
  return ran;}

/* ---- a backup: is this one of ours? -----------------------------------------------
   Read before anything is replaced. A file that is not ours, or from a newer version
   of the app than this one, is refused with the reason; a damaged workout is left out
   and counted rather than letting one bad entry refuse the lot.
   Returns {ok, why, sessions, days, dropped}: why is one of "notjson", "notours",
   "newer", "damaged" when ok is false. */
function checkBackup(o){
  var out={ok:false,why:null,sessions:0,days:0,dropped:0};
  if(!o||typeof o!=="object"||Array.isArray(o)){out.why="notours";return out;}
  var ours=Array.isArray(o.sessions)||Array.isArray(o.programs)||!!o.myPlan||Array.isArray(o.splits)
    ||(o.prefs&&typeof o.prefs==="object")||(o.profile&&typeof o.profile==="object");
  if(!ours){out.why="notours";return out;}
  if(+o.v>VERSION){out.why="newer";return out;}
  if(o.sessions!=null&&!Array.isArray(o.sessions)){out.why="damaged";return out;}
  if(o.profile!=null&&(typeof o.profile!=="object"||Array.isArray(o.profile))){out.why="damaged";return out;}
  if(o.days!=null&&(typeof o.days!=="object"||Array.isArray(o.days))){out.why="damaged";return out;}
  var ss=o.sessions||[];
  out.sessions=ss.filter(sessionOk).length;out.dropped=ss.length-out.sessions;
  out.days=Object.keys(o.days||{}).length;
  out.ok=true;return out;}

export {checkBackup, copyProgram, DEF, migrateDB, normalize, normProg, STEPS, VERSION};

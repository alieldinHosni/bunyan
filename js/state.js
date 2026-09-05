/* Bunyan — state
   S, profiles, persistence and migration. The single source of truth. */
import {sessionVolume} from "./engine/formulas.js";
import {PRESETS} from "./data/splits.js";
import {num, r1, rd, today, uid, wr} from "./util.js";
import {clearProfile, loadDays, loadSessions, putAll, putDays, putSession,
        replaceAll, replaceAllDays} from "./db.js";
import {V} from "./ui/view.js";

/* ============================================================ state */
var DEF={
  v:2,theme:"dark",unit:"kg",
  profile:{age:25,height:165,weight:86,sex:"m",activity:1.4,goal:"lose",prog:"standard",
           level:"some",days:3},
  onboarded:false,plannedWeekly:14,
  gear:null,favs:[],skip:[],
  myFoods:[],savedMeals:[],freq:{},
  prefs:{rpe:"last",autorest:true,sound:true,awake:true,compact:false,splash:true,
         warn:10,unit:"kg",view:"set",haptic:true,anim:true,lang:"en"},
  goals:{kcal:1950,p:175,c:170,f:62,water:3000,steps:9000},
  myPlan:null,userSplits:[],myEx:[],
  lastBackup:0,backupSnooze:0,
  sessions:[],active:null,body:[],days:{}
};
/* ---- profiles: each one is a completely separate log on this device ---- */
var PROFILES=null,CUR=null;
/* Nothing here runs on import: app.js calls initState() before its first
   render, so startup order is explicit rather than a property of the
   import graph. */
function initState(){
  PROFILES=rd("bunyan:profiles",null);
  if(!PROFILES){
    var legacy=rd("forge:db",null);
    PROFILES=[{id:"me",name:"Me",owner:true}];
    wr("bunyan:profiles",PROFILES);
    wr("bunyan:current","me");
    if(legacy)wr("bunyan:db:me",legacy);
  }
  CUR=rd("bunyan:current","me");
  if(!PROFILES.some(function(p){return p.id===CUR;}))CUR=PROFILES[0].id;
  hydrate();
  migrate();
}
function curProfile(){for(var i=0;i<PROFILES.length;i++)if(PROFILES[i].id===CUR)return PROFILES[i];return PROFILES[0];}
function isOwner(){return !!curProfile().owner;}
function dbKey(){return "bunyan:db:"+CUR;}

var S=null;
/* Where this profile's history and food log actually live. The *_IDB flags are the
   live answer; the BLOB_SAID_* pair is what the stored blob claimed when it was last
   read, which is how a profile still holding data in localStorage is told apart from
   one already moved. The two move independently, so one can fall back alone. */
var HIST_IDB=false, BLOB_SAID_IDB=false;
var DAYS_IDB=false, BLOB_SAID_DAYS=false;
/* Dates whose record has been handed out since the last save. dayRec() is the only
   way to get one, so marking here cannot miss a change; it over-approximates
   instead, and a spare write of one small day record costs nothing. */
var DIRTY=Object.create(null);

/* Loading S and filling in missing defaults is the same work on boot and on
   profile switch, so both go through hydrate(). */
function hydrate(){
  S=rd(dbKey(),null);
  if(!S){S=JSON.parse(JSON.stringify(DEF));wr(dbKey(),S);}
  if(!S.userSplits)S.userSplits=[];
  if(!S.prefs)S.prefs=JSON.parse(JSON.stringify(DEF.prefs));
  if(!S.favs)S.favs=[];
  if(!S.skip)S.skip=[];
  if(!S.myFoods)S.myFoods=[];
  if(!S.savedMeals)S.savedMeals=[];
  if(!S.freq)S.freq={};
  /* Absent once they have moved out of the blob. */
  if(!S.sessions)S.sessions=[];
  if(!S.days)S.days={};
  BLOB_SAID_IDB=!!S.histIDB; BLOB_SAID_DAYS=!!S.daysIDB;
  delete S.histIDB; delete S.daysIDB;   /* markers about storage, not part of the state */
  /* Assume what the blob said until the loaders prove otherwise, so a save that
     lands before they finish writes the same shape the blob already had. */
  HIST_IDB=BLOB_SAID_IDB; DAYS_IDB=BLOB_SAID_DAYS;
  DIRTY=Object.create(null);
}
/* Writes the day records touched since the last save. A failure here drops the food
   log back to the blob rather than losing it. */
function flushDays(){
  var list=[],d;
  for(d in DIRTY)if(S.days[d])list.push({d:d,r:S.days[d]});
  DIRTY=Object.create(null);
  if(!list.length)return;
  putDays(CUR,list,function(ok){ if(!ok){ DAYS_IDB=false; wr(dbKey(),S); } });
}
function saveDB(){
  if(DAYS_IDB)flushDays();
  if(!HIST_IDB&&!DAYS_IDB){ wr(dbKey(),S); return; }
  /* The whole point: neither history nor the food log is serialised on the hot path. */
  var lite={},k;
  for(k in S){
    if(!Object.prototype.hasOwnProperty.call(S,k))continue;
    if(k==="sessions"&&HIST_IDB)continue;
    if(k==="days"&&DAYS_IDB)continue;
    lite[k]=S[k];
  }
  if(HIST_IDB)lite.histIDB=true;
  if(DAYS_IDB)lite.daysIDB=true;
  wr(dbKey(),lite);
}

/* Fills S.sessions, moving a profile's history into IndexedDB the first time.
   cb always runs exactly once, whether or not IndexedDB is usable.

   The trigger is "anything in the blob", not "the blob says it has not moved yet".
   Data can legitimately be in both places: log a workout while IndexedDB is
   unavailable and it lands in the blob while older sessions sit in IndexedDB. Since
   putAll merges by session id, running this over already-migrated sessions is a
   no-op, and nothing in memory is ever dropped on the floor. */
function loadHistory(cb){
  var pending=S.sessions||[];
  loadSessions(CUR,function(list){
    if(list===null){                       /* unusable: keep history in the blob */
      HIST_IDB=false; cb&&cb(); return; }
    HIST_IDB=true;
    if(pending.length){
      /* Write across, read back, and only then drop the localStorage copy. */
      putAll(CUR,pending,function(ok){
        if(!ok){ HIST_IDB=false; cb&&cb(); return; }
        loadSessions(CUR,function(check){
          if(!check||check.length<pending.length){ HIST_IDB=false; cb&&cb(); return; }
          S.sessions=check; BLOB_SAID_IDB=true; saveDB(); cb&&cb();
        });
      });
      return;
    }
    S.sessions=list;
    cb&&cb();
  });
}

/* The same shape for the food log, keyed by date instead of session id. */
function loadFoodLog(cb){
  var pending=S.days||{}, keys=Object.keys(pending);
  loadDays(CUR,function(map){
    if(map===null){ DAYS_IDB=false; cb&&cb(); return; }
    DAYS_IDB=true;
    if(keys.length){
      var list=keys.map(function(d){ return {d:d,r:pending[d]}; });
      putDays(CUR,list,function(ok){
        if(!ok){ DAYS_IDB=false; cb&&cb(); return; }
        loadDays(CUR,function(check){
          if(!check||Object.keys(check).length<keys.length){ DAYS_IDB=false; cb&&cb(); return; }
          S.days=check; BLOB_SAID_DAYS=true; DIRTY=Object.create(null); saveDB(); cb&&cb();
        });
      });
      return;
    }
    S.days=map; DIRTY=Object.create(null);
    cb&&cb();
  });
}

/* Boot and profile switch both need everything before they repaint. */
function loadStored(cb){
  var left=2, done=function(){ if(--left===0)cb&&cb(); };
  loadHistory(done);
  loadFoodLog(done);
}

/* The only way a session enters history. Falls back to the blob if the write fails,
   so a finished workout is never left only in memory. */
function recordSession(s){
  S.sessions.unshift(s);
  if(HIST_IDB)putSession(CUR,s,function(ok){ if(!ok){ HIST_IDB=false; saveDB(); } });
  saveDB();
}
/* Restore replaces everything: history and food log, not just the blob. */
function adoptRestored(cb){
  var list=S.sessions||[], days=S.days||{};
  var dayList=Object.keys(days).map(function(d){ return {d:d,r:days[d]}; });
  replaceAll(CUR,list,function(a){
    HIST_IDB=!!a;                         /* on failure the blob keeps the sessions */
    replaceAllDays(CUR,dayList,function(b){
      DAYS_IDB=!!b;
      DIRTY=Object.create(null);
      saveDB(); cb&&cb();
    });
  });
}
function dropProfileData(pid,cb){ clearProfile(pid||CUR,function(){ cb&&cb(); }); }
/* migrate() is defined further down; function declarations hoist, so initState can call it. */
/* done runs once the new profile's history and food log are in memory, so callers
   repaint then rather than showing the previous profile's numbers or an empty log. */
function switchProfile(id,done){
  saveDB();CUR=id;wr("bunyan:current",id);
  hydrate();
  migrate();
  V.tab="home";V.train="days";V.logIdx=0;
  loadStored(done);}

/* ---- share snapshot: what a friend hands over, and nothing more ---- */
function buildSnapshot(){
  return {v:1,name:curProfile().name,at:today(),
    goals:S.goals,
    body:S.body.filter(function(b){return b.weight;}).slice(-90)
             .map(function(b){return [b.date,b.weight];}),
    sessions:S.sessions.slice(0,60).map(function(x){
      return {d:x.date,n:x.dayName,v:Math.round(sessionVolume(x)),
        e:x.entries.map(function(e){
          return {n:e.name,s:e.sets.map(function(st){return [st.w,st.r];})};})};})};}
function friends(){return rd("bunyan:friends",{});}
function saveFriends(f){wr("bunyan:friends",f);}
function snapStats(sn){
  var vol=0,prs={},last=null;
  sn.sessions.forEach(function(x){
    vol+=x.v; if(!last||x.d>last)last=x.d;
    x.e.forEach(function(e){
      e.s.forEach(function(st){
        var w=num(st[0]);if(!prs[e.n]||w>prs[e.n][0])prs[e.n]=[w,num(st[1])];});});});
  var bw=sn.body.map(function(b){return b[1];});
  var a7=bw.slice(-7);
  return {vol:vol,count:sn.sessions.length,last:last,prs:prs,
    weight:bw.length?bw[bw.length-1]:0,
    avg7:a7.length>=3?r1(a7.reduce(function(p,q){return p+q;},0)/a7.length):0,
    body:sn.body};}
/* One active plan. Presets are a read-only library and are never copied into it,
   which is what used to produce duplicate splits. */
function migrate(){
  if(S.myPlan)return;
  var old=S.splits||[], cur=S.currentSplit;
  var active=old.filter(function(x){return x.id===cur;})[0]||old[0];
  var presetIds=PRESETS().map(function(p){return p.id;});
  S.userSplits=old.filter(function(x){
    return x.custom&&x.id!=="plan"&&presetIds.indexOf(x.id)<0&&(!active||x.id!==active.id);});
  if(active){
    S.myPlan=JSON.parse(JSON.stringify(active));
    S.myPlan.source=S.myPlan.source||(S.myPlan.id==="plan"?"ap":S.myPlan.id);
    S.myPlan.id="mine";
  }else{
    S.myPlan=adoptSplit(PRESETS().filter(function(p){return p.id==="ap";})[0]);
  }
  delete S.splits; delete S.currentSplit;
  saveDB();
}
function adoptSplit(preset){
  var c=JSON.parse(JSON.stringify(preset));
  c.source=preset.id; c.id="mine";
  c.days.forEach(function(d){d.id=uid();d.ex.forEach(function(e){e.id=uid();});});
  return c;
}
function split(){
  if(!S.myPlan)S.myPlan=adoptSplit(PRESETS().filter(function(p){return p.id==="ap";})[0]);
  return S.myPlan;}
function allSplits(){return PRESETS().concat(S.userSplits||[]);}
function dayOf(id){
  var pools=[split()].concat(S.userSplits||[]);
  for(var p=0;p<pools.length;p++){var sp=pools[p];if(!sp)continue;
    for(var i=0;i<sp.days.length;i++)if(sp.days[i].id===id)return sp.days[i];}
  return null;}
/* The only way to get a day's record, which is what makes it a safe place to mark
   the date for writing. Callers mutate what they get back and then call saveDB(). */
function dayRec(d){d=d||today();if(!S.days[d])S.days[d]={water:0,steps:0,sleep:0,sore:0,energy:0,notes:"",meals:{}};
  var r=S.days[d];if(!r.meals)r.meals={};DIRTY[d]=true;return r;}


/* S and PROFILES are replaced wholesale on wipe, restore and profile delete. An
   imported binding cannot be assigned from another module, so the owner exposes
   setters and the live binding updates everywhere. */
function setS(v){S=v;}
function setProfiles(v){PROFILES=v;}

export {adoptRestored, adoptSplit, allSplits, buildSnapshot, CUR, curProfile, dayOf, dayRec, DEF, dropProfileData, friends, initState, isOwner, loadStored, migrate, PROFILES, recordSession, S, saveDB, saveFriends, setProfiles, setS, snapStats, split, switchProfile};

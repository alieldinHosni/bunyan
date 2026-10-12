/* Bunyan — state
   S, profiles, persistence and migration. The single source of truth. */
import {PRESETS} from "./data/splits.js";
import {rd, rdRaw, today, uid, wr, wrRaw} from "./util.js";
import {clearProfile, deleteSession, loadDays, loadSessions, putAll, putDays, putSession, updateSession,
        replaceAll, replaceAllDays} from "./db.js";
import {clearPhotos} from "./photostore.js";
import {copyProgram, DEF, migrateDB, normalize} from "./schema.js";

/* ============================================================ state */
/* What S holds, its defaults (DEF), filling in what a blob is missing (normalize) and
   carrying old shapes forward (migrateDB) live in js/schema.js, which is pure and
   tested in Node. */
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
/* Set when the history (or food log) is known to live in IndexedDB but IndexedDB would
   not open on this launch. The screen would otherwise show an empty history as if it
   were gone. The marker is kept in the blob while this lasts, so a second failed
   launch still knows, and a working one merges what was logged in between. */
var WARN={hist:false,days:false};
function storeWarning(){return WARN.hist?"hist":WARN.days?"days":null;}
var DAYS_IDB=false, BLOB_SAID_DAYS=false;
/* Dates whose record has been handed out since the last save. dayRec() is the only
   way to get one, so marking here cannot miss a change; it over-approximates
   instead, and a spare write of one small day record costs nothing. */
var DIRTY=Object.create(null);

/* Set when the stored blob could not be read at start-up, so the app can say so once
   instead of silently starting over. */
var STARTUP_NOTE=null;
function startupNote(){var n=STARTUP_NOTE;STARTUP_NOTE=null;return n;}
function hydrate(){
  var raw=rdRaw(dbKey());
  S=rd(dbKey(),null);
  if(!S&&raw){
    /* It exists but does not parse. Keep the original beside it — it may be
       recoverable by hand — rather than overwriting the only copy with defaults. */
    wrRaw(dbKey()+":corrupt:"+Date.now(),raw);
    STARTUP_NOTE="corrupt";
  }
  if(!S){S=JSON.parse(JSON.stringify(DEF));wr(dbKey(),S);}
  S=normalize(S);
  if(!S.prefs)S.prefs=JSON.parse(JSON.stringify(DEF.prefs));
  if(!S.favs)S.favs=[];
  /* "Never suggest" is gone. Leaving stored exclusions behind would keep filtering
     results with nothing on screen to say why, or to undo it. */
  if(S.skip&&S.skip.length)S.skip=[];
  if(!S.skip)S.skip=[];
  if(!S.myFoods)S.myFoods=[];
  if(!S.savedMeals)S.savedMeals=[];
  /* My Foods opens a saved meal by id; meals saved before it had none. */
  S.savedMeals.forEach(function(m){if(m&&!m.id)m.id=uid();if(m&&!m.items)m.items=[];});
  if(!S.freq)S.freq={};
  /* Absent once they have moved out of the blob. */
  if(!S.sessions)S.sessions=[];
  if(!S.days)S.days={};
  BLOB_SAID_IDB=!!S.histIDB; BLOB_SAID_DAYS=!!S.daysIDB;WARN={hist:false,days:false};
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
/* Bumped on every save: derived figures cached against it are recomputed after any
   change, and only then. */
var REV=0;
function dataRev(){return REV;}
function saveDB(){
  REV++;
  if(DAYS_IDB)flushDays();
  if(!HIST_IDB&&!DAYS_IDB&&!WARN.hist&&!WARN.days){ wr(dbKey(),S); return; }
  /* The whole point: neither history nor the food log is serialised on the hot path. */
  var lite={},k;
  for(k in S){
    if(!Object.prototype.hasOwnProperty.call(S,k))continue;
    if(k==="sessions"&&HIST_IDB)continue;
    if(k==="days"&&DAYS_IDB)continue;
    lite[k]=S[k];
  }
  if(HIST_IDB||WARN.hist)lite.histIDB=true;
  if(DAYS_IDB||WARN.days)lite.daysIDB=true;
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
      HIST_IDB=false; if(BLOB_SAID_IDB)WARN.hist=true; cb&&cb(); return; }
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
    if(map===null){ DAYS_IDB=false; if(BLOB_SAID_DAYS)WARN.days=true; cb&&cb(); return; }
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
/* A logged workout can be corrected or thrown away afterwards. Sessions stored before
   ids existed get one here, the same way the IndexedDB writer would give them one. */
function sessionById(id){
  for(var i=0;i<S.sessions.length;i++)if(S.sessions[i].id===id)return S.sessions[i];
  return null;
}
function ensureSessionIds(){
  S.sessions.forEach(function(s,i){if(!s.id)s.id="s"+Date.now().toString(36)+"x"+i;});
}
function saveSession(s){
  if(HIST_IDB)updateSession(CUR,s,function(ok){ if(!ok){ HIST_IDB=false; saveDB(); } });
  saveDB();
}
function removeSession(id){
  var i=S.sessions.findIndex(function(s){return s.id===id;});
  if(i<0)return false;
  S.sessions.splice(i,1);
  if(HIST_IDB)deleteSession(CUR,id,function(ok){ if(!ok){ HIST_IDB=false; saveDB(); } });
  saveDB();
  return true;
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
function dropProfileData(pid,cb){
  var p=pid||CUR;
  clearProfile(p,function(){ clearPhotos(p,function(){ cb&&cb(); }); });
}
/* migrate() is defined further down; function declarations hoist, so initState can call it. */
/* done runs once the new profile's history and food log are in memory, so callers
   repaint then rather than showing the previous profile's numbers or an empty log. */
function switchProfile(id,done){
  saveDB();CUR=id;wr("bunyan:current",id);
  hydrate();
  migrate();
  /* The screen and the workout in memory belong to the profile being left; the UI
     resets them (app.js registers it), so state never reaches up into the view. */
  if(onSwitch)onSwitch();
  loadStored(done);}
var onSwitch=null;
function onProfileSwitch(fn){onSwitch=fn;}

/* Another open copy of the app (a second tab, or Safari beside the installed app on
   desktop) saved. Re-read rather than keep a stale copy in memory: the next save from
   here would otherwise overwrite what the other copy just wrote — which is how a
   stale tab erased an active workout. */
function refreshFromStorage(cb){hydrate();migrate();loadStored(cb);}
function storageKey(){return dbKey();}

/* ---- programs ---------------------------------------------------------------
   A program is yours: its days, their exercises, and how it is scheduled. The
   ready-made ones in splits.js are templates — you never train on a template itself;
   "Use this program" makes your own copy, which is then edited like any other. One
   program is active. There is one copy of each, so nothing has to be kept in step.

     S.programs       every program you own
     S.activeProgram  the id of the one you train on
     program.schedule "week" (days pinned to weekdays, day.wd = [1..7], Monday = 1)
                      or "cycle" (the next day in order, whenever you train) */
function tpl(id){return PRESETS().filter(function(p){return p.id===id;})[0]||null;}
/* Your own copy of a template (or of any program), with fresh ids. */
function makeProgram(src,opts){
  var c=copyProgram(src,{uid:uid,template:tpl});
  if(opts&&opts.schedule)c.schedule=opts.schedule;
  return c;}
function programById(id){return (S.programs||[]).filter(function(p){return p.id===id;})[0]||null;}
/* Adds a program, optionally making it the active one. Re-running setup or picking
   the same template again replaces an untouched copy instead of piling up duplicates. */
function addProgram(p,activate){
  var trained={};S.sessions.forEach(function(s){if(s.dayId)trained[s.dayId]=1;});
  S.programs=(S.programs||[]).filter(function(q){
    if(!p.from||q.from!==p.from||q.id===S.activeProgram&&!activate)return true;
    return q.days.some(function(d){return trained[d.id];});});
  S.programs.push(p);
  if(activate||!S.activeProgram||!programById(S.activeProgram))S.activeProgram=p.id;
  return p;}
/* Older saves are carried forward one numbered version at a time (js/schema.js
   migrateDB: v1 splits and v2's active copy become programs you own), and every load
   leaves at least one program and an active one that exists. Saved when anything was
   carried forward or created. */
function migrate(){
  var had=(S.programs||[]).length;
  var ran=migrateDB(S,{uid:uid,template:tpl});
  if(ran.length||!had)saveDB();
}
/* The active program. Named split() for the many callers that already use it. */
function split(){
  var p=programById(S.activeProgram);
  if(!p){p=(S.programs||[])[0]||addProgram(makeProgram(tpl("fb")),true);S.activeProgram=p.id;}
  return p;}
function allSplits(){return PRESETS().concat(S.programs||[]);}
function editSplit(id){return programById(id);}
/* Which program a day belongs to. */
function ownerOf(dayId){
  var ps=S.programs||[];
  for(var p=0;p<ps.length;p++)if(ps[p].days.some(function(d){return d.id===dayId;}))return ps[p];
  return null;}
function dayOf(id){
  var ps=S.programs||[];
  for(var p=0;p<ps.length;p++)for(var i=0;i<ps[p].days.length;i++)if(ps[p].days[i].id===id)return ps[p].days[i];
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

export {makeProgram, addProgram, programById, editSplit, ownerOf, dataRev, storeWarning, refreshFromStorage, storageKey, normalize, startupNote, ensureSessionIds, removeSession, saveSession, sessionById, adoptRestored, allSplits, CUR, curProfile, dayOf, dayRec, DEF, dropProfileData, initState, isOwner, loadStored, migrate, PROFILES, onProfileSwitch, recordSession, S, saveDB, setProfiles, setS, split, switchProfile};

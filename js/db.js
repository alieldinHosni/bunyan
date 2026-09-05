/* Bunyan — db
   Training history and the food log in IndexedDB. Settings, the plan, weigh-ins and
   the current workout stay in the localStorage blob.

   The reason is the write path, not capacity. saveDB() runs on every logged set and
   every tap in the food log, and it used to JSON.stringify the whole profile. After
   a couple of years that is most of a megabyte of synchronous work in the middle of
   a working set. Both of these grow without limit, are read everywhere, and are
   written a record at a time, so they live in memory for reading and are written
   through to IndexedDB.

   Every call here can fail — private windows, blocked storage, browsers that expose
   indexedDB and then refuse to open it. Failure is never fatal: cb(false)/cb(null)
   tells the caller to keep the data in the localStorage blob exactly as before. */

var NAME="bunyan", VER=2, SESS="sessions", DAYS="days";
var _db=null, _st="idle", _waiting=[], _maxOrd=0;

function settle(ok){ var q=_waiting; _waiting=[]; _st=ok?"ready":"off"; if(!ok)_db=null;
  for(var i=0;i<q.length;i++)q[i](ok); }

function open(cb){
  if(_st==="ready")return cb(true);
  if(_st==="off")return cb(false);
  _waiting.push(cb);
  if(_st==="opening")return;
  _st="opening";
  var req;
  try{
    if(typeof indexedDB==="undefined"||!indexedDB)return settle(false);
    req=indexedDB.open(NAME,VER);
  }catch(e){ return settle(false); }
  req.onupgradeneeded=function(e){
    /* Runs for a fresh database and for a v1 that only has sessions, so each store
       is created only if it is missing. */
    var db=e.target.result;
    if(!db.objectStoreNames.contains(SESS))
      db.createObjectStore(SESS,{keyPath:"k"}).createIndex("pid","pid",{unique:false});
    if(!db.objectStoreNames.contains(DAYS))
      db.createObjectStore(DAYS,{keyPath:"k"}).createIndex("pid","pid",{unique:false});
  };
  req.onsuccess=function(){
    if(_st!=="opening")return;          /* the timeout below already gave up */
    _db=req.result;
    _db.onversionchange=function(){ try{_db.close();}catch(e){} settle(false); };
    settle(true);};
  req.onerror=function(){ if(_st==="opening")settle(false); };
  req.onblocked=function(){ if(_st==="opening")settle(false); };
  /* An open() that never settles would hang boot behind the splash, so give up and
     fall back rather than leave the user looking at an intro forever. */
  setTimeout(function(){ if(_st==="opening")settle(false); },3000);
}

function store(name,mode,cb){
  open(function(ok){
    if(!ok)return cb(null);
    var t;
    try{ t=_db.transaction(name,mode); }
    catch(e){ settle(false); return cb(null); }
    cb(t.objectStore(name),t);
  });
}
/* Every row is keyed by profile plus the thing's own stable id, so writing the same
   row twice overwrites rather than duplicating. That is what makes the migrations
   safe to re-run and safe to merge. */
function rowsFor(name,pid,cb){
  store(name,"readonly",function(os){
    if(!os)return cb(null);
    var rows=[],req;
    try{ req=os.index("pid").openCursor(IDBKeyRange.only(pid)); }
    catch(e){ settle(false); return cb(null); }
    req.onsuccess=function(e){
      var c=e.target.result;
      if(c){ rows.push(c.value); c.continue(); return; }
      cb(rows);
    };
    req.onerror=function(){ settle(false); cb(null); };
  });
}
function putRecs(name,recs,cb){
  if(!recs.length)return cb(true);
  store(name,"readwrite",function(os,t){
    if(!os)return cb(false);
    try{ for(var i=0;i<recs.length;i++)os.put(recs[i]); }
    catch(e){ settle(false); return cb(false); }
    t.oncomplete=function(){cb(true);};
    t.onerror=function(){cb(false);};
    t.onabort=function(){cb(false);};
  });
}
function clearFor(name,pid,cb){
  store(name,"readwrite",function(os,t){
    if(!os)return cb&&cb(false);
    var req;
    try{ req=os.index("pid").openCursor(IDBKeyRange.only(pid)); }
    catch(e){ settle(false); return cb&&cb(false); }
    req.onsuccess=function(e){ var c=e.target.result; if(c){ c.delete(); c.continue(); } };
    t.oncomplete=function(){cb&&cb(true);};
    t.onerror=function(){cb&&cb(false);};
    t.onabort=function(){cb&&cb(false);};
  });
}

/* ---- sessions: append-only, newest first ---------------------------------- */
function ensureId(s,i){ if(!s.id)s.id="s"+Date.now().toString(36)+(i||0); return s; }

/* ord preserves the original order across reloads rather than inferring it from
   dates, which tie whenever two sessions land on the same day. */
function loadSessions(pid,cb){
  rowsFor(SESS,pid,function(rows){
    if(rows===null)return cb(null);
    rows.sort(function(a,b){ return (b.ord||0)-(a.ord||0); });
    var out=[];
    for(var i=0;i<rows.length;i++){
      if((rows[i].ord||0)>_maxOrd)_maxOrd=rows[i].ord||0;
      out.push(rows[i].s);
    }
    cb(out);
  });
}
function putSession(pid,s,cb){
  ensureId(s,0);
  putRecs(SESS,[{k:pid+"|"+s.id,pid:pid,ord:++_maxOrd,s:s}],function(ok){cb&&cb(ok);});
}
/* Merges; it never clears first. list is newest-first, so it is walked backwards to
   give the oldest session the lowest ord. */
function putAll(pid,list,cb){
  var recs=[];
  for(var i=list.length-1;i>=0;i--){
    var s=ensureId(list[i],i);
    recs.push({k:pid+"|"+s.id,pid:pid,ord:++_maxOrd,s:s});
  }
  putRecs(SESS,recs,cb);
}
/* Restore means "make it look exactly like this backup", so here clearing is right. */
function replaceAll(pid,list,cb){
  clearFor(SESS,pid,function(ok){ if(!ok)return cb(false); putAll(pid,list,cb); });
}

/* ---- food log: one record per date, rewritten in place -------------------- */
function loadDays(pid,cb){
  rowsFor(DAYS,pid,function(rows){
    if(rows===null)return cb(null);
    var map={};
    for(var i=0;i<rows.length;i++)map[rows[i].d]=rows[i].r;
    cb(map);
  });
}
/* list is [{d:"2026-09-06", r:record}]. Merges by date. */
function putDays(pid,list,cb){
  var recs=[];
  for(var i=0;i<list.length;i++)
    recs.push({k:pid+"|"+list[i].d,pid:pid,d:list[i].d,r:list[i].r});
  putRecs(DAYS,recs,cb);
}
function replaceAllDays(pid,list,cb){
  clearFor(DAYS,pid,function(ok){ if(!ok)return cb(false); putDays(pid,list,cb); });
}

/* Deleting a profile, or wiping one, takes everything that profile owns. */
function clearProfile(pid,cb){
  clearFor(SESS,pid,function(a){ clearFor(DAYS,pid,function(b){ cb&&cb(a&&b); }); });
}

export {loadSessions, putSession, putAll, replaceAll,
        loadDays, putDays, replaceAllDays, clearProfile};

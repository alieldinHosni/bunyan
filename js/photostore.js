/* Bunyan — photo store
   Progress photos, in IndexedDB, on this device only.

   A database of their own rather than a third store in db.js. Adding a store there
   means a version bump on the database that holds every session and meal, and any
   failure in db.js switches that whole database off for the rest of the visit — a
   photo that would not save would have sent the training history back to
   localStorage with it. Kept apart, the worst a photo can do is not save.

   Photos are not in the JSON backup: a few of them would be most of the file, and
   the backup is text meant to be pasted and kept. The screen says so. */

var NAME="bunyan-photos", VER=1, STORE="photos";
var _db=null, _st="idle", _q=[];
/* Bumped by every write, so a screen holding a list can tell it is stale — after a
   wipe, which keeps the profile id, as much as after an add. */
var GEN=0;
function photoGen(){return GEN;}

function settle(ok){var q=_q;_q=[];_st=ok?"ready":"off";if(!ok)_db=null;
  for(var i=0;i<q.length;i++)q[i](ok);}
function open(cb){
  if(_st==="ready")return cb(true);
  if(_st==="off")return cb(false);
  _q.push(cb);
  if(_st==="opening")return;
  _st="opening";
  var req;
  try{
    if(typeof indexedDB==="undefined"||!indexedDB)return settle(false);
    req=indexedDB.open(NAME,VER);
  }catch(e){return settle(false);}
  req.onupgradeneeded=function(e){
    var db=e.target.result;
    if(!db.objectStoreNames.contains(STORE))
      db.createObjectStore(STORE,{keyPath:"k"}).createIndex("pid","pid",{unique:false});};
  req.onsuccess=function(){
    if(_st!=="opening")return;
    _db=req.result;
    _db.onversionchange=function(){try{_db.close();}catch(e){}settle(false);};
    settle(true);};
  req.onerror=function(){if(_st==="opening")settle(false);};
  req.onblocked=function(){if(_st==="opening")settle(false);};
  setTimeout(function(){if(_st==="opening")settle(false);},3000);
}
function tx(mode,cb){
  open(function(ok){
    if(!ok)return cb(null);
    var t;
    try{t=_db.transaction(STORE,mode);}catch(e){return cb(null);}
    cb(t.objectStore(STORE),t);});
}

/* cb(list|null), newest first. null means photos cannot be stored here at all. */
function loadPhotos(pid,cb){
  tx("readonly",function(os){
    if(!os)return cb(null);
    var rows=[],req;
    try{req=os.index("pid").openCursor(IDBKeyRange.only(pid));}catch(e){return cb(null);}
    req.onsuccess=function(e){
      var c=e.target.result;
      if(c){rows.push(c.value);c.continue();return;}
      rows.sort(function(a,b){return (b.t||0)-(a.t||0);});
      cb(rows);};
    req.onerror=function(){cb(null);};});
}
function putPhoto(pid,rec,cb){
  tx("readwrite",function(os,t){
    if(!os)return cb(false);
    rec.k=pid+"|"+rec.id;rec.pid=pid;
    try{os.put(rec);}catch(e){return cb(false);}
    t.oncomplete=function(){GEN++;cb(true);};
    t.onerror=t.onabort=function(){cb(false);};});
}
function delPhoto(pid,id,cb){
  tx("readwrite",function(os,t){
    if(!os)return cb(false);
    try{os.delete(pid+"|"+id);}catch(e){return cb(false);}
    t.oncomplete=function(){GEN++;cb(true);};
    t.onerror=t.onabort=function(){cb(false);};});
}
/* A deleted or wiped profile takes its photos with it. */
function clearPhotos(pid,cb){
  tx("readwrite",function(os,t){
    if(!os)return cb&&cb(false);
    var req;
    try{req=os.index("pid").openCursor(IDBKeyRange.only(pid));}catch(e){return cb&&cb(false);}
    req.onsuccess=function(e){var c=e.target.result;if(c){c.delete();c.continue();}};
    t.oncomplete=function(){GEN++;cb&&cb(true);};
    t.onerror=t.onabort=function(){cb&&cb(false);};});
}

export {clearPhotos, delPhoto, loadPhotos, photoGen, putPhoto};

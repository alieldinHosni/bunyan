# Salvaged fixes — for the session working on main

Two small UI fixes from 13 Oct were made in the owner's local folder and never reached GitHub. Both are **diffs against `main` @ `38126ac`**: `js/ui/patch.js` blob `7bee43a`, `js/ui/photos.js` blob `f405001`.

They were **not applied** in this PR. `patch.js` and `photos.js` belong to the Progress rebuild, which is still in progress. Apply them there when ready.

**How these were made:** each fix was taken as the change from the GitHub version it was originally built on (`patch.js` from `757afae`, 8 Sep; `photos.js` from `4cb7c5f`, 29 Sep) to the local 13 Oct file. It was then replayed onto current `main` with a three-way merge.
- **Clean merge:** no conflicts. Each diff below is exactly the size of the original fix (17 and 21 changed lines).
- **Nothing reverted:** none of main's later work is undone — the 3D-figure canvas handling in `patch.js` and the profile pictures (`avatarFrom`) in `photos.js` are untouched.
- **Verified:**
  - Both resulting files parse.
  - `keyOf()`, which the patch fix calls, already exists on `main`.
  - `C.urls`, which the photos fix replaces, is used nowhere else on `main`.
  - Neither fix has been run in the app.

**To apply:** save one block as a `.diff` file and run `git apply --check fix.diff`, then `git apply fix.diff`. Or apply the hunks by hand.

## 1. `js/ui/patch.js` — keyed lists: an item added at the top no longer repaints every item after it

Before: the patcher matched children by position only. One new item at the front of a keyed list (a progress photo, newest first) shifted every later item out of place, so each was replaced: every thumbnail was destroyed and repainted for the one that was added.

After: where keys say an element was added or removed, the new one is inserted, or the old one dropped, and the rest are matched where they are. Moves are still not tracked; a moved item is replaced, as before.

```diff
diff --git a/js/ui/patch.js b/js/ui/patch.js
index 7bee43a..b629b40 100644
--- a/js/ui/patch.js
+++ b/js/ui/patch.js
@@ -75,14 +75,27 @@ function patchNode(o,n){
   patchChildren(o,n);
   patchField(o,n);
 }
+/* Whether a keyed element is still to come among `from` and its later siblings. */
+function keyAhead(from,key){
+  for(var x=from;x;x=x.nextSibling)if(x.nodeType===1&&keyOf(x)===key)return true;
+  return false;
+}
+/* Position decides, except where keys say an element was added or removed. Without
+   that, one new item at the front of a keyed list — a progress photo, newest first —
+   misaligned every item after it, and each was replaced: every thumbnail destroyed and
+   repainted for the one that was added. Now the new one is inserted and the rest are
+   matched where they are. Moves are not tracked; a moved item is still replaced. */
 function patchChildren(oldP,newP){
   var o=oldP.firstChild,n=newP.firstChild;
   while(n){
     var nextN=n.nextSibling;
     if(!o){ oldP.appendChild(n); n=nextN; continue; }
+    if(sameNode(o,n)){ patchNode(o,n); o=o.nextSibling; n=nextN; continue; }
+    var kn=n.nodeType===1?keyOf(n):null, ko=o.nodeType===1?keyOf(o):null;
+    if(kn&&!keyAhead(o,kn)){ oldP.insertBefore(n,o); n=nextN; continue; }
+    if(ko&&!keyAhead(n,ko)){ var drop=o; o=o.nextSibling; oldP.removeChild(drop); continue; }
     var nextO=o.nextSibling;
-    if(sameNode(o,n))patchNode(o,n);
-    else oldP.replaceChild(n,o);
+    oldP.replaceChild(n,o);
     o=nextO; n=nextN;
   }
   while(o){ var gone=o; o=o.nextSibling; oldP.removeChild(gone); }
```

## 2. `js/ui/photos.js` — photo URLs kept across reloads, so the grid doesn't repaint

Before: every reload of the photo list (e.g. right after adding a photo) created a fresh blob URL for every photo. That changed every `<img src>` and repainted the whole grid.

After: URLs are kept per photo id and per profile. Only new photos get a URL, and only removed ones are revoked; switching profile still revokes them all. While a reload runs, the list already on screen stays on screen; only a profile seen for the first time shows the loading placeholder.

```diff
diff --git a/js/ui/photos.js b/js/ui/photos.js
index f405001..8e6fe67 100644
--- a/js/ui/photos.js
+++ b/js/ui/photos.js
@@ -9,7 +9,10 @@ import {today, uid} from "../util.js";
 /* The list is read once per profile and per write, and its URLs are revoked when it
    is replaced, so paging through Progress does not leak a blob URL per render.
    list: null while loading, false where this browser cannot store photos. */
-var C={key:null,list:null,loading:null,urls:[]};
+/* byId keeps each photo's URL across reloads. A reload after adding one used to mint
+   fresh URLs for every photo, which changed every <img src> and repainted the grid —
+   the whole-surface rebuild Round 2 Phase 1 exists to prevent, by another route. */
+var C={key:null,pid:null,list:null,loading:null,byId:{}};
 
 function photoList(onLoad){
   var key=CUR+"#"+photoGen();
@@ -19,16 +22,20 @@ function photoList(onLoad){
     loadPhotos(CUR,function(rows){
       if(C.loading!==key)return;
       C.loading=null;
-      C.urls.forEach(function(u){try{URL.revokeObjectURL(u);}catch(e){}});
-      C.urls=[];
-      C.key=key;
+      var keep=C.pid===CUR?C.byId:{},next={};
+      if(C.pid!==CUR)for(var id0 in C.byId)try{URL.revokeObjectURL(C.byId[id0]);}catch(e){}
       C.list=rows===null?false:rows.map(function(r){
-        var u="";
-        try{u=URL.createObjectURL(r.b);C.urls.push(u);}catch(e){}
+        var u=keep[r.id]||"";
+        if(!u)try{u=URL.createObjectURL(r.b);}catch(e){}
+        if(u)next[r.id]=u;
         return {id:r.id,d:r.d,t:r.t,w:r.w,h:r.h,url:u};}).filter(function(p){return p.url;});
+      for(var id1 in keep)if(!next[id1])try{URL.revokeObjectURL(keep[id1]);}catch(e){}
+      C.byId=next;C.pid=CUR;C.key=key;
       onLoad&&onLoad();});
   }
-  return null;}
+  /* While a reload runs, the list already on screen stays on screen. Only a profile
+     seen for the first time shows the loading placeholder. */
+  return C.pid===CUR?C.list:null;}
 function photoById(id){
   return (C.list||[]).filter(function(p){return p.id===id;})[0]||null;}
 
```

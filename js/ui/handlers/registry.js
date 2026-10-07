/* Bunyan — taps, by name
   Every tap the app answers is a branch registered here: on(when, run), or key(k, run)
   for a tap on an element carrying data-k, or has(k, run) when the key may be empty.
   app.js listens for clicks and calls dispatchTap(); the first branch whose condition
   holds runs. Branches are tried in the order they were registered: each module's
   register(), called by app.js at boot in a fixed order, adds its own in order. A branch that only prepares the state for the next one —
   clearing a sheet before a page opens over it — returns NEXT, and the search goes on.

   The branches themselves live by domain in js/ui/handlers/: shell (moving around and
   answering sheets), train, session, food, coach, progress and profile. */
var LIST=[],NEXT={};
function on(when,run){LIST.push([when,run]);}
function key(k,run){on(function(D){return D[k];},run);}
function has(k,run){on(function(D){return D[k]!==undefined;},run);}
/* D: the element's dataset. cx: what the listener knew before the tap was handled
   (whether the name prompt was being typed in). True when a branch answered it. */
function dispatchTap(D,el,ev,cx){
  for(var i=0;i<LIST.length;i++){
    if(!LIST[i][0](D,el,cx))continue;
    if(LIST[i][1](D,el,ev,cx)!==NEXT)return true;}
  return false;}

export {dispatchTap, has, key, NEXT, on};

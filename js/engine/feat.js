/* Bunyan — which features are on, one answer for the whole app (owner, 25 Nov: "the
   settings synchronized everywhere in the app").
   Outside Simple mode a feature follows its own setting (warm-up, cool-down, training
   blocks) or is simply on (the next weight worked out, the question before a workout).
   In Simple mode (S.prefs.simple) each is off, unless turned on for Simple mode in
   Settings (S.prefs.simpleOn[k]): the person's own settings are left as they were and
   come back when Simple mode is turned off. Pure: reads S, changes nothing. */
import {S} from "../state.js";
/* the features Simple mode turns off that a person can turn back on in it, and each
   one's own setting outside it */
var FEATS={
  warm:function(p){return !p.nowarm;},
  cool:function(p){return !p.nocool;},
  blocks:function(p){return !p.noblocks;},
  suggest:function(){return true;},
  ready:function(){return true;},
  /* Coach (its tab, its floating button, Ask Coach) and Progress: always there outside
     Simple mode; in it, each can be turned back on alone (owner, 25 Nov road map). */
  coach:function(){return true;},
  progress:function(){return true;}};
function featOn(k){
  var p=S.prefs||{};
  if(!Object.prototype.hasOwnProperty.call(FEATS,k))return true;
  if(!p.simple)return FEATS[k](p);
  return !!(p.simpleOn&&p.simpleOn[k]);}
export {FEATS, featOn};

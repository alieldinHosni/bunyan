/* Bunyan — dict
   t() and the Arabic dictionary's loader. The table itself is js/i18n/ar.js (WP-9): an
   English start never fetches it. loadArabic() brings it in; render() waits for it when
   the language is Arabic (js/ui/render.js), so no screen is ever drawn in English for an
   Arabic user. t() stays synchronous: until the table is in, a key is its own English. */
import {S} from "../state.js";

var AR={},arIn=false,arWait=null;
function loadArabic(){
  if(!arWait)arWait=import("./ar.js").then(function(m){AR=m.AR;arIn=true;});
  return arWait;}
function arabicReady(){return arIn;}
function t(k){
  if(!S.prefs||S.prefs.lang!=="ar")return k;
  return AR[k]||k;}
/* A muscle's name. "Back" is also the back button, and they are different words in
   Arabic, so the muscle is kept under "Back " (with the space). */
function tm(m){return m==="Back"?t("Back "):t(m);}

export {arabicReady, loadArabic, t, tm};

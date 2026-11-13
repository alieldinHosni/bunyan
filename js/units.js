/* Bunyan — units
   kg/lb display conversion. Storage is always kilograms. */
import {t} from "./i18n/dict.js";
import {S} from "./state.js";
import {num, r1} from "./util.js";


/* Weight units. Everything is stored in kilograms, always — the preference only
   changes what is shown and what typed input is read as. Converting stored values
   would corrupt history the first time somebody flipped the switch. */
var LB_PER_KG=2.2046226218;
function inLb(){return !!(S.prefs&&S.prefs.unit==="lb");}
/* Display only, never a key or a comparison, so it is safe to localise. */
function wUnit(){return t(inLb()?"lb":"kg");}
function toDisp(kg){var v=num(kg);return inLb()?r1(v*LB_PER_KG):r1(v);}
function toKg(v){v=num(v);return inLb()?Math.round(v/LB_PER_KG*100)/100:v;}
function fmtW(kg){return toDisp(kg)+" "+wUnit();}
/* An estimated max (Epley, a formula's guess, not a lift done): to the nearest 0.5 kg, or
   the nearest pound, never a tenth that the method cannot tell. */
function fmtEst(kg){var v=num(kg);return (inLb()?Math.round(v*LB_PER_KG):Math.round(v*2)/2)+" "+wUnit();}
/* Plate maths differs by unit: 2.5 kg is the small jump, 5 lb is its counterpart. */
function wStep(){return inLb()?5:2.5;}


export {fmtEst, fmtW, inLb, toDisp, toKg, wUnit};

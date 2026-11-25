/* js/data/mannequin/approved.js is exactly the set of names records.js isChecked passes. */
import {APPROVED} from "../mannequin/approved.js";
import {isChecked, RECORDS, versionOf, hashRecord, recordForUnchecked} from "../mannequin/records.js";
import {TABLE} from "../mannequin/moves.js";
function run(t){
  var names=Object.keys(TABLE).concat(Object.keys(RECORDS)).filter(function(n,i,a){return a.indexOf(n)===i;});
  var checked=names.filter(function(n){return isChecked(n);}).sort();
  t.eq(Object.keys(APPROVED).sort(),checked,"approved.js lists exactly the checked figures (update it with an approval, or when a record changes)");
  /* Another browser engine works out Math.sin and Math.cos to slightly different last
     digits. The approval must hold there too (owner, 25 Nov: on the iPhone no approved
     figure was shown, because Safari's version of the record differed): every number
     nudged in its last digits, the version is the same. */
  function nudged(x,seen){
    if(typeof x==="number")return Number.isInteger(x)?x:x*(1+2e-16)+1e-16;
    if(!x||typeof x!=="object")return x;
    if(seen.has(x))return seen.get(x);
    var o=Array.isArray(x)?[]:{};seen.set(x,o);
    for(var k in x)if(Object.prototype.hasOwnProperty.call(x,k))o[k]=nudged(x[k],seen);
    return o;}
  checked.forEach(function(n){
    var r=recordForUnchecked(n),m=nudged(r,new Map()),moved=JSON.stringify(m,function(k,x){return typeof x==="function"?0:x;})!==JSON.stringify(r,function(k,x){return typeof x==="function"?0:x;});
    t.ok(hashRecord(m)===versionOf(n),n+": the approval holds in another engine (numbers nudged in their last digits"+(moved?"":", none to nudge")+"): "+hashRecord(m)+" = "+versionOf(n));});}
export {run};

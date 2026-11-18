/* js/data/mannequin/approved.js is exactly the set of names records.js isChecked passes. */
import {APPROVED} from "../mannequin/approved.js";
import {isChecked, RECORDS} from "../mannequin/records.js";
import {TABLE} from "../mannequin/moves.js";
function run(t){
  var names=Object.keys(TABLE).concat(Object.keys(RECORDS)).filter(function(n,i,a){return a.indexOf(n)===i;});
  var checked=names.filter(function(n){return isChecked(n);}).sort();
  t.eq(Object.keys(APPROVED).sort(),checked,"approved.js lists exactly the checked figures (update it with an approval, or when a record changes)");}
export {run};

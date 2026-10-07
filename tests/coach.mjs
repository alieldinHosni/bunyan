/* Runs the coach tests (js/coach/test/*.test.js) in Node. The coach is pure, so the
   same files that run in js/coach/test/index.html run here unchanged:
     node tests/coach.mjs */
import {makeT} from "../js/coach/test/assert.js";

const names=["volume","fatigue","strength","autoreg","weakpoints","insights","percentile","intent","energy","block"];
let pass=0,fail=0;
for(const n of names){
  const mod=await import("../js/coach/test/"+n+".test.js");
  const t=makeT(n);
  try{mod.run(t);}catch(e){t.results.push({file:n,pass:false,label:"threw",detail:String(e&&e.stack||e)});}
  for(const r of t.results){
    if(r.pass)pass++;else fail++;
    console.log((r.pass?"PASS ":"FAIL ")+n+": "+r.label+(r.detail?" — "+r.detail:""));}}
console.log("\n"+pass+" passed, "+fail+" failed");
process.exit(fail?1:0);

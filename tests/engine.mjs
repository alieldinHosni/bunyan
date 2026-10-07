/* Runs the engine tests (js/engine/test/*.test.js) in Node. The modules they test
   take everything as arguments and import nothing that reads the app's state
   (tests/architecture.mjs holds them to that), so they run here as they are:
     node tests/engine.mjs */
import {makeT} from "../js/coach/test/assert.js";

const files=["engine/test/body","engine/test/intake"];
let pass=0,fail=0;
for(const f of files){
  const n=f.split("/").pop();
  const mod=await import("../js/"+f+".test.js");
  const t=makeT(n);
  try{mod.run(t);}catch(e){t.results.push({file:n,pass:false,label:"threw",detail:String(e&&e.stack||e)});}
  for(const r of t.results){
    if(r.pass)pass++;else fail++;
    console.log((r.pass?"PASS ":"FAIL ")+n+": "+r.label+(r.detail?" — "+r.detail:""));}}
console.log("\n"+pass+" passed, "+fail+" failed");
process.exit(fail?1:0);

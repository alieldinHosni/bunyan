/* Runs the engine, data and schema tests (js/engine/test/, js/data/test/,
   js/test/) in Node. The modules they test take everything as arguments and import
   nothing that reads the app's state (tests/architecture.mjs holds them to that), so
   they run here as they are:
     node tests/engine.mjs
   The movement test also gets the whole exercise library, read from exercises.json
   and merged with the app's own additions, as the app merges them on load. */
import fs from "node:fs";
import {makeT} from "../js/coach/test/assert.js";
import {EXTRA} from "../js/data/extra.js";

const lib=JSON.parse(fs.readFileSync(new URL("../exercises.json",import.meta.url),"utf8"));
for(const n of Object.keys(EXTRA))if(!lib[n])lib[n]=EXTRA[n];

const files=["engine/test/body","engine/test/intake","data/test/movement","test/schema"];
let pass=0,fail=0;
for(const f of files){
  const n=f.split("/").pop();
  const mod=await import("../js/"+f+".test.js");
  const t=makeT(n);
  try{mod.run(t,lib);}catch(e){t.results.push({file:n,pass:false,label:"threw",detail:String(e&&e.stack||e)});}
  for(const r of t.results){
    if(r.pass)pass++;else fail++;
    console.log((r.pass?"PASS ":"FAIL ")+n+": "+r.label+(r.detail?" — "+r.detail:""));}}
console.log("\n"+pass+" passed, "+fail+" failed");
process.exit(fail?1:0);

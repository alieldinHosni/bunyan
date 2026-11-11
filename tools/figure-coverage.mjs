/* Bunyan — which exercises with a 3D figure people will meet first
   node tools/figure-coverage.mjs            prints the list
   The order of work for the per-exercise reviews (docs/FIGURE-V3.md 2.8): every
   exercise that has a figure record (js/data/mannequin/moves.js TABLE and records.js
   RECORDS), with how many of the app's built-in programs use it (js/data/splits.js
   PRESETS: the templates, and the pool the program builder prefers), and in how many
   of the weeks the program builder makes for a spread of people (js/engine/build.js
   buildWeek: 2 to 6 days, four levels of experience, every goal, a full gym, home
   dumbbells or body weight only) it appears. Sorted by programs, then built weeks,
   then name. A tool: it runs in Node and is not shipped. */
import fs from "node:fs";
import {pathToFileURL} from "node:url";

const ROOT=new URL("../",import.meta.url);
/* the library, as the app loads it */
globalThis.fetch=async()=>({json:async()=>JSON.parse(fs.readFileSync(new URL("exercises.json",ROOT),"utf8"))});
const E=await import(new URL("js/data/exercises.js",ROOT));
await new Promise(r=>E.loadExDB(r));
const {PRESETS}=await import(new URL("js/data/splits.js",ROOT));
const {buildWeek}=await import(new URL("js/engine/build.js",ROOT));
const {TABLE}=await import(new URL("js/data/mannequin/moves.js",ROOT));
const {RECORDS}=await import(new URL("js/data/mannequin/records.js",ROOT));
const {GOALS}=await import(new URL("js/data/goals.js",ROOT));

/* what js/engine/plan.js hands the builder, without the person's own history */
const pool={};PRESETS().forEach(p=>p.days.forEach(d=>d.ex.forEach(e=>{pool[e.name]=1;})));
function usable(n,gear){const v=E.EXDB&&E.EXDB[n];if(!v)return true;if(!gear||!gear.length||!v.e||v.e==="Bodyweight")return true;return gear.indexOf(v.e)>=0;}
const SPREAD={1:[3],2:[1,4],3:[1,3,5],4:[1,2,4,5],5:[1,2,3,5,6],6:[1,2,3,4,5,6]};
function helpers(p){return {usable,avoids:()=>false,limits:[],familiar:()=>({}),
  train:g=>(GOALS[g]||{}).train||"gen",pool,dose:()=>({sets:3,rest:90}),favs:[],skip:[],
  skilled:p.level==="experienced"||p.level==="advanced",weekdays:n=>SPREAD[n]||SPREAD[3]};}
const GEAR={gym:["Bodyweight","Barbell","Dumbbell","Cable","Machine","Kettlebell","Band","Other"],home:["Bodyweight","Dumbbell"],none:["Bodyweight"]};

function coverage(){
  const figured=[...new Set(Object.keys(TABLE).concat(Object.keys(RECORDS)))];
  const programs={},slots={},built={};
  for(const p of PRESETS()){const seen=new Set();
    p.days.forEach(d=>d.ex.forEach(e=>{slots[e.name]=(slots[e.name]||0)+1;seen.add(e.name);}));
    seen.forEach(n=>{programs[n]=(programs[n]||0)+1;});}
  let weeks=0;
  for(const days of [2,3,4,5,6])for(const level of ["new","some","experienced","advanced"])
    for(const goal of Object.keys(GOALS))for(const g of Object.keys(GEAR)){
      const prof={days,level,goal,mins:60,sex:"m"};
      let w;try{w=buildWeek(prof,GEAR[g],helpers(prof));}catch(e){continue;}
      weeks++;const seen=new Set();w.days.forEach(d=>d.ex.forEach(e=>seen.add(e.name)));
      seen.forEach(n=>{built[n]=(built[n]||0)+1;});}
  const rows=figured.map(n=>({name:n,programs:programs[n]||0,slots:slots[n]||0,built:built[n]||0,
    family:Object.prototype.hasOwnProperty.call(TABLE,n)?TABLE[n][0].name:"machine"}));
  rows.sort((a,b)=>b.programs-a.programs||b.built-a.built||b.slots-a.slots||(a.name<b.name?-1:1));
  return {rows,presets:PRESETS().length,weeks};}

export {coverage};

if(import.meta.url===pathToFileURL(process.argv[1]).href){
  const c=coverage();
  console.log(c.rows.length+" exercises with a figure; "+c.presets+" built-in programs; "+c.weeks+" built weeks");
  c.rows.forEach((r,i)=>console.log(String(i+1).padStart(3)+"  "+r.name+"  · programs "+r.programs+" · days "+r.slots+" · built weeks "+r.built));}

/* Bunyan — the 3D figure's safety audit
   node tools/figure-audit.mjs [OUT.md]        writes docs/figures/AUDIT.md by default
   Every record the app could show (js/data/mannequin/moves.js TABLE and records.js
   RECORDS), checked at 41 moments of its repetition by js/data/mannequin/collide.js:
   the body through the equipment, the floor or itself; contacts that should touch;
   the injury clearances of docs/FIGURE-V3.md 2.6 that hold for a whole family; the
   joint limits of 2.0. It changes nothing; it is the work list for the per-exercise
   reviews (2.8), with the order to do them in (tools/figure-coverage.mjs). Nothing is
   shown in the app until its exercise is reviewed and marked checked, whatever this
   says. A tool: it runs in Node and is not shipped. */
import fs from "node:fs";
import {pathToFileURL} from "node:url";
import {audit, infoOf, jointSpeed, slide, SPEED_MAX, SLIDE_MAX} from "../js/data/mannequin/collide.js";
import {RECORDS, recordForUnchecked, checkedOf} from "../js/data/mannequin/records.js";
import {TABLE} from "../js/data/mannequin/moves.js";
import {VERSION} from "../js/version.js";
import {coverage} from "./figure-coverage.mjs";

const N=41;
const cm=v=>(v*100).toFixed(1)+" cm",dg=v=>Math.round(v)+"°",uu=u=>"u="+(+u).toFixed(3).replace(/0+$/,"").replace(/\.$/,"");
function range(us){const a=Math.min(...us),b=Math.max(...us);return a===b?uu(a):uu(a)+" to "+(+b).toFixed(3).replace(/0+$/,"").replace(/\.$/,"");}

/* the distinct faults of one check, each with its worst value and where */
function group(list,key,val,abs){
  const m=new Map();
  for(const x of list){const k=key(x),v=val(x);
    if(!m.has(k))m.set(k,{k,worst:x,v,us:[x.u]});
    else{const g=m.get(k);g.us.push(x.u);if((abs?Math.abs(v):v)>(abs?Math.abs(g.v):g.v)){g.v=v;g.worst=x;}}}
  return [...m.values()].sort((a,b)=>(abs?Math.abs(b.v)-Math.abs(a.v):b.v-a.v));}
const PEN=x=>x.a+" through "+x.b,GAPK=x=>x.a+" off "+x.b,CLK=x=>x.rule+" ("+x.what+")",LIMK=x=>x.joint+" "+x.what;
function clearVal(x){
  if(Array.isArray(x.limit))return x.value<x.limit[0]?x.limit[0]-x.value:x.value-x.limit[1];
  return /5 cm from the head/.test(x.rule)?x.limit-x.value:x.value-x.limit;}
function clearText(x){
  const v=x.value,L=x.limit;
  if(/over the neck/.test(x.rule))return cm(v)+" past the shoulder line toward the head (limit "+cm(L)+")";
  if(/over the chest/.test(x.rule))return cm(v)+" below the shoulder line (wanted "+cm(L[0])+" to "+cm(L[1])+")";
  if(/forearms upright/.test(x.rule))return dg(v)+" from upright (limit "+dg(L)+")";
  if(/5 cm from the head/.test(x.rule))return (v<0?cm(-v)+" into the head":cm(v)+" from the head")+" (wanted ≥ "+cm(L)+")";
  if(/tilted/.test(x.what))return dg(v)+" (limit "+dg(L)+")";
  return cm(v)+" (limit "+cm(L)+")";}
function limText(x){return dg(x.value)+" (limit "+(Array.isArray(x.limit)?dg(x.limit[0])+" to "+dg(x.limit[1]):"±"+dg(x.limit))+")";}

function run(){
  const names=[...new Set(Object.keys(RECORDS).concat(Object.keys(TABLE)))];
  const rows=[];
  for(const n of names){
    const rec=recordForUnchecked(n),a=audit(rec,N),I=infoOf(rec);
    const pen=group(a.penetration,PEN,x=>x.depth),gaps=group(a.gaps,GAPK,x=>x.gap==null?9:x.gap);
    const cl=group(a.clearances,CLK,clearVal),lim=group(a.limits,LIMK,x=>Math.abs(x.value)-(Array.isArray(x.limit)?0:x.limit));
    const sp=jointSpeed(rec),sl=slide(rec).filter(x=>!x.pass).sort((x,y)=>y.moved-x.moved);
    rows.push({n,family:I.family,rules:a.rules,pen,gaps,cl,lim,sp,sl,checked:!!checkedOf(n),
      fails:(pen.length?1:0)+(gaps.length?1:0)+(cl.length?1:0)+(lim.length?1:0),
      deep:pen.length?pen[0].v:0});}
  rows.sort((a,b)=>b.fails-a.fails||b.deep-a.deep||(a.n<b.n?-1:1));
  return rows;}

function cellPen(r){return r.pen.length?"**FAIL** "+r.pen.length+": "+r.pen[0].k+" "+cm(r.pen[0].v)+" at "+uu(r.pen[0].worst.u):"pass";}
function cellGap(r){return r.gaps.length?"**FAIL** "+r.gaps.length+": "+r.gaps[0].k+" by "+(r.gaps[0].worst.gap==null?"(nothing there)":cm(r.gaps[0].v))+" at "+uu(r.gaps[0].worst.u):"pass";}
function cellCl(r){if(!r.rules.length)return "n/a";return r.cl.length?"**FAIL** "+r.cl.length+": "+r.cl[0].k+", "+clearText(r.cl[0].worst)+" at "+uu(r.cl[0].worst.u):"pass ("+r.rules.join(", ")+")";}
function cellLim(r){return r.lim.length?"**FAIL** "+r.lim.length+": "+r.lim[0].k+" "+limText(r.lim[0].worst)+" at "+uu(r.lim[0].worst.u):"pass";}
function cellSpeed(r){return (r.sp.pass?"pass":"**FAIL**")+" "+r.sp.speed.toFixed(1)+" m/s"+(r.sp.joint?" ("+r.sp.joint+")":"");}
function cellSlide(r){return r.sl.length?"**FAIL** "+r.sl.length+": "+r.sl[0].part+" moves "+(r.sl[0].moved*1000).toFixed(0)+" mm by "+uu(r.sl[0].u):"pass";}
const esc=s=>String(s).replace(/\|/g,"\\|");

function write(out){
  const rows=run(),cov=coverage(),L=[];
  const n=rows.length,count=k=>rows.filter(r=>r[k].length).length;
  const clApplies=rows.filter(r=>r.rules.length).length,clFail=rows.filter(r=>r.cl.length).length;
  const allPass=rows.filter(r=>!r.fails).length;
  L.push("# The 3D figure: safety audit","");
  L.push("Written by `tools/figure-audit.mjs` (app version "+VERSION+") from `js/data/mannequin/collide.js`. Do not edit by hand; run the tool again.","");
  L.push("Every record the families' table (`moves.js` TABLE) and the hand-written records (`records.js` RECORDS) hold, checked at "+N+" moments of its repetition (u = 0 is the start, the stretched position; u = 1 the end of the lift). This is the work list for the per-exercise reviews of `docs/FIGURE-V3.md` 2.8. **No figure is shown in the app until its exercise has been reviewed and marked checked** (`records.js` recordFor), whatever this audit says: passing every check here is necessary, not enough.","");
  L.push("What each check is (thresholds and how contacts are derived are written at the top of `collide.js`):","");
  L.push("- **Penetration**: a part of the body through a solid of the equipment, the floor, or another part of the body that is not its neighbour, by more than 3 mm (what a hand holds, and a part resting on a pad or on the body up to 4 cm, are let off).");
  L.push("- **Contacts**: a contact that should touch and does not (a gap over 5 mm): a hand off what it holds, a part off what it rests on at both ends of the movement, a declared contact.");
  L.push("- **Clearances** (2.6), for the families they apply to: *bench*: the weight never more than 5 cm past the shoulder line toward the head, over the chest at the bottom with the forearms within 10° of upright; *head*: a bar or handle at least 5 cm from the head (overhead presses, pulldowns, skull crushers); *feet*: both feet flat on the floor (standing lifts). `n/a`: no general clearance applies; its own rules belong in its dossier.");
  L.push("- **Joint speed** and **Slide** (2.0, no teleporting and no sliding; reported, not yet part of *pass every check* so the totals stay comparable with earlier audits): the fastest any joint moves between two frames at 60 a second over one repetition at the record's tempo, at most "+SPEED_MAX+" m/s; a planted foot (resting on a support that does not move, at both ends) or a hand gripping something that does not move may shift at most "+(SLIDE_MAX*1000)+" mm over the repetition.");
  L.push("- **Limits** (2.0): elbow ≤ 145°, knee ≤ 140°, neither bending sideways or backwards; the forearm turned no further than palm-up or palm-down; the wrist within 70° either way and 40° to the side, not turned on the forearm by more than 25°; the neck within 10° of the chest's line.","");
  L.push("Body parts: `head`, `neck`, `trunk.upper`, `trunk.lower`, `pelvis`, and per side (`.l` the figure's left, `.r` its right) `upperarm`, `forearm`, `hand`, `thigh`, `shin`, `foot`. A solid is named by its piece of equipment and its shape (`barbell:capsule` is the bar, `barbell:cylinder` a plate).","");
  L.push("## Totals","");
  L.push("| | Records |","| --- | --- |");
  L.push("| Checked (shown in the app) | "+rows.filter(r=>r.checked).length+" |");
  L.push("| Audited | "+n+" |");
  L.push("| Pass every check | "+allPass+" |");
  L.push("| Fail penetration | "+count("pen")+" |");
  L.push("| Fail contacts | "+count("gaps")+" |");
  L.push("| Fail clearances | "+clFail+" of the "+clApplies+" a clearance applies to |");
  L.push("| Fail limits | "+count("lim")+" |");
  L.push("| Fail joint speed (reported) | "+rows.filter(r=>!r.sp.pass).length+" |");
  L.push("| Fail slide (reported) | "+count("sl")+" |","");
  /* the ten deepest */
  const deep=rows.filter(r=>r.pen.length).slice().sort((a,b)=>b.deep-a.deep).slice(0,10);
  L.push("## The ten deepest penetrations","");
  L.push("| # | Exercise | What | Depth | At |","| --- | --- | --- | --- | --- |");
  deep.forEach((r,i)=>L.push("| "+(i+1)+" | "+esc(r.n)+" | "+esc(r.pen[0].k)+" | "+cm(r.pen[0].v)+" | "+uu(r.pen[0].worst.u)+" |"));
  L.push("");
  L.push("## By exercise","");
  L.push("Failing first (most checks failed, then the deepest penetration). Each cell gives how many distinct faults the check found and the worst of them; every fault is listed in the next section.","");
  L.push("| Exercise | Family | Penetration | Contacts | Clearances | Limits | Joint speed | Slide |","| --- | --- | --- | --- | --- | --- | --- | --- |");
  rows.forEach(r=>L.push("| "+esc(r.n)+" | "+r.family+" | "+esc(cellPen(r))+" | "+esc(cellGap(r))+" | "+esc(cellCl(r))+" | "+esc(cellLim(r))+" | "+esc(cellSpeed(r))+" | "+esc(cellSlide(r))+" |"));
  L.push("");
  L.push("## Every fault, exercise by exercise","");
  rows.filter(r=>r.fails||!r.sp.pass||r.sl.length).forEach(r=>{
    L.push("### "+r.n,"",r.family+(r.rules.length?" · clearances: "+r.rules.join(", "):""),"");
    r.pen.forEach(g=>L.push("- Penetration: "+g.k+", "+cm(g.v)+" deep at "+uu(g.worst.u)+" (from "+range(g.us)+")"));
    r.gaps.forEach(g=>L.push("- Contact: "+g.k+(g.worst.gap==null?", nothing of that kind in the scene":", "+cm(g.v)+" away at "+uu(g.worst.u))+" (from "+range(g.us)+")"));
    r.cl.forEach(g=>L.push("- Clearance: "+g.k+", "+clearText(g.worst)+" at "+uu(g.worst.u)+" (from "+range(g.us)+")"));
    r.lim.forEach(g=>L.push("- Limit: "+g.k+", "+limText(g.worst)+" at "+uu(g.worst.u)+" (from "+range(g.us)+")"));
    if(!r.sp.pass)L.push("- Joint speed: "+r.sp.joint+" at "+r.sp.speed.toFixed(1)+" m/s at "+uu(r.sp.u));
    r.sl.forEach(x=>L.push("- Slide: "+x.part+" on "+x.on+" moves "+(x.moved*1000).toFixed(1)+" mm by "+uu(x.u)));
    L.push("");});
  L.push("## Order of work","");
  L.push("Written by `tools/figure-coverage.mjs`: every exercise with a figure record, by how many of the "+cov.presets+" built-in programs (`js/data/splits.js`) use it, then in how many of "+cov.weeks+" weeks the program builder (`js/engine/build.js`) makes for a spread of people it appears (2 to 6 days, four levels, every goal; a full gym, home dumbbells, or body weight). The owner's own program comes before all of these (2.8); it is not in the repository.","");
  const byName=new Map(rows.map(r=>[r.n,r]));
  L.push("| # | Exercise | Programs | Built weeks | Audit |","| --- | --- | --- | --- | --- |");
  cov.rows.forEach((c,i)=>{const r=byName.get(c.name);L.push("| "+(i+1)+" | "+esc(c.name)+" | "+c.programs+" | "+c.built+" | "+(r&&!r.fails?"passes every check":"fails "+(r?r.fails:"?")+" of 4")+" |");});
  L.push("");
  fs.mkdirSync(new URL(".",out),{recursive:true});
  fs.writeFileSync(out,L.join("\n"));
  return {rows,n,allPass,pen:count("pen"),gaps:count("gaps"),cl:clFail,clApplies,lim:count("lim"),speed:rows.filter(r=>!r.sp.pass).length,slide:count("sl"),deep};}

export {run, write};

if(import.meta.url===pathToFileURL(process.argv[1]).href){
  const out=process.argv[2]?pathToFileURL(process.argv[2]):new URL("../docs/figures/AUDIT.md",import.meta.url);
  const t=write(out);
  console.log(t.n+" records: "+t.allPass+" pass every check; fail penetration "+t.pen+", contacts "+t.gaps+", clearances "+t.cl+" of "+t.clApplies+", limits "+t.lim+"; reported: joint speed "+t.speed+", slide "+t.slide);
  t.deep.forEach((r,i)=>console.log((i+1)+". "+r.n+": "+r.pen[0].k+" "+cm(r.pen[0].v)+" at "+uu(r.pen[0].worst.u)));}

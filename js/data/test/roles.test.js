import {familyOf, rolesFor, STAB} from "../mannequin/roles.js";
import {MUSCLE_TAGS, highlight} from "../mannequin/rig.js";
import {FAMILIES, TABLE} from "../mannequin/moves.js";
import {RECORDS} from "../mannequin/records.js";

/* The figure's muscles by role (docs/FIGURE-V3.md 2.4, F-4): the library decides which
   muscles, the family only adds stabilisers from its list, and nothing is invented. */
function run(t,lib){
  t.eq(Object.keys(STAB).filter(f=>!FAMILIES[f]),[],"every family with stabilisers is a family");
  t.eq([].concat(...Object.values(STAB).map(l=>[].concat(...l.map(s=>s.muscles)))).filter(m=>!MUSCLE_TAGS[m]),[],"every stabiliser is a muscle the figure has");
  t.ok(Object.values(STAB).every(l=>l.every(s=>/^anatomy 7\.[34]$/.test(s.src))),"each says where it comes from in the knowledge base");
  const names=Object.keys(TABLE).filter(n=>lib[n]);
  t.ok(names.length>30,"the figure's exercises found in the library: "+names.length);
  let met=0;const bad=[];
  for(const n of names){
    const L=lib[n],rec=RECORDS[n]||{},fam=familyOf(n),r=rolesFor(L.m,L.x,rec.refine,fam),hl=highlight(L.m,L.x,rec.refine);
    /* Prime and synergists are the library's, exactly as the figure lights them today. */
    for(const g of Object.keys(hl)){const want=hl[g]===1?"prime":"synergist";if(!r[g]||r[g].role!==want)bad.push(n+": "+g+" "+(r[g]&&r[g].role)+" not "+want);}
    /* Anything else is a stabiliser from the family's list. */
    const stab=new Set([].concat(...(STAB[fam]||[]).map(s=>[].concat(...s.muscles.map(m=>MUSCLE_TAGS[m])))));
    for(const g of Object.keys(r))if(!(g in hl)){if(r[g].role!=="stabiliser"||!stab.has(g))bad.push(n+": "+g+" invented");}
    /* Where the library already names a family's stabiliser, the library's role wins. */
    for(const g of stab)if(g in hl)met++;}
  t.eq(bad,[],"prime and synergists are the library's; nothing else but the family's stabilisers");
  t.ok(true,"where a family's stabiliser is one the library already names, the library's role is kept: "+met+" times");
  const sq=rolesFor("Quads",["Glutes","Hamstrings","Calves"],{},"squat");
  t.eq([sq.quads.role,sq.glutes.role,sq.abs.role,sq.adductors.role,sq.gmed.role],["prime","synergist","stabiliser","stabiliser","synergist"],
    "a squat: quads prime; glutes synergist (and gmed with them, the library's Glutes); core and adductors hold");
  const pr=rolesFor("Chest",["Triceps","Shoulders"],{Shoulders:"Front delts"},"benchPress");
  t.eq([pr.chest.role,pr.triceps.role,pr.frontdelt.role,pr.reardelt&&pr.reardelt.role],["prime","synergist","synergist","stabiliser"],"a bench press: the cuff, as the rear delt, holds");
  t.eq(rolesFor("Biceps",[],{},"curl"),{biceps:{level:1,role:"prime"}},"a family with no stabilisers adds none");}

export {run};

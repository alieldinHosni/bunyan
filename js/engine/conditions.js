/* Bunyan — a health condition, and what it changes in the plan
   Owner, 2 Nov: "health conditions shape the plan … the most important for trust".
   The assessment's PAR-Q+ questions say only that something needs a professional's
   word; this asks which condition, and applies what the textbook says about training
   with it (js/knowledge/conditions.js, chapter 23). Nothing here is a figure of our own:
   every range and rule is read from the knowledge base, so the two cannot drift.

   Conditions are the person's own answer (profile.conds). The age groups (older adults
   from 65, youth under 18) follow from the age they gave.

   rulesFor(profile) → null | {
     ids[]              the conditions and age groups that apply
     reps {min,max}     the reps every loaded lift keeps to (the narrowest range all agree on)
     sets {max}         sets per exercise at most
     days {max}         strength days a week the book gives (said, never forced)
     noPlyo             no jumps or bounding
     noFloor            no lying on the back or front (head below the heart above all)
     steady             breathe steadily, never hold the breath on the effort (no Valsalva)
     talkTest           medication may blunt the heart rate: judge effort by the talk test
     slowStand          stand up slowly between exercises
     notes[] {id, text} what changed and why, by condition, for the screens
   }
   Pure apart from reading the profile passed in. */
import {CONDITIONS, POPULATIONS} from "../knowledge/conditions.js";

/* What the assessment offers, in this order. Pregnancy splits at 12 weeks: the book's
   rules change there (no lying on the back or front, no jumps). */
var ASK=[["hypertension","High blood pressure"],["coronary_heart_disease","Heart disease"],["diabetes","Diabetes"],
  ["osteoporosis","Osteoporosis or low bone density"],["arthritis","Arthritis"],["chronic_lung_disease","Asthma or another lung condition"],
  ["peripheral_arterial_disease","Leg pain from poor circulation (PAD)"],["cancer","Cancer, during or after treatment"],
  ["pregnancy_early","Pregnant, first 12 weeks"],["pregnancy_late","Pregnant, past 12 weeks"],
  /* Opt-in, never inferred from a BMI (owner, 3 Nov): the book's guidelines for a higher
     body weight are about comfort — standing or seated work, 10–15 reps, breathing. */
  ["obesity","Higher body weight: comfort first (standing or seated)"]];
var LABEL={older_adults:"Age 65 and over",youth:"Under 18"};
ASK.forEach(function(x){LABEL[x[0]]=x[1];});

function byId(id){
  var all=CONDITIONS.concat(POPULATIONS);
  for(var i=0;i<all.length;i++)if(all[i].id===id)return all[i];
  return null;}
function txt(c){return JSON.stringify(c||"").toLowerCase();}
function rng(r){if(r==null)return null;if(typeof r==="number")return {min:r,max:r};return {min:+r.min||0,max:+(r.max||r.upTo)||0};}

/* The ids that apply to this person. */
function idsFor(p){
  p=p||{};var out=(p.conds||[]).filter(function(id){return !!LABEL[id];});
  var age=+p.age||0;
  if(age>=65)out.push("older_adults");
  else if(age>0&&age<18)out.push("youth");
  return out;}

function rulesFor(p){
  var ids=idsFor(p);if(!ids.length)return null;
  var R={ids:ids,reps:null,sets:null,days:null,noPlyo:false,noFloor:false,steady:false,talkTest:false,slowStand:false,notes:[]};
  ids.forEach(function(id){
    var preg=/^pregnancy/.test(id),c=byId(preg?"pregnancy":id);if(!c)return;
    var g=c.guidelines||{},rs=g.resistance||{},sp=txt(g.special),all=txt(c),why=[];
    var reps=rng(rs.reps),sets=rng(rs.sets),days=rng(rs.daysPerWeek);
    if(reps&&reps.max){
      if(!R.reps)R.reps={min:reps.min,max:reps.max};
      else{var lo=Math.max(R.reps.min,reps.min),hi=Math.min(R.reps.max,reps.max);R.reps=lo<=hi?{min:lo,max:hi}:R.reps;}
      why.push("reps");}
    if(sets&&sets.max){R.sets={max:R.sets?Math.min(R.sets.max,sets.max):sets.max};why.push("sets");}
    if(days&&days.max)R.days={max:R.days?Math.min(R.days.max,days.max):days.max};
    /* Breath held on the effort raises blood pressure: the book says no, by name. */
    if(/valsalva|breath-holding|breathe normally/.test(sp)){R.steady=true;why.push("breath");}
    /* Lying on the back or front: high blood pressure (head below the heart above all),
       and pregnancy past 12 weeks. */
    var pos=txt(c.positions);
    if((id==="hypertension"&&/supine or prone/.test(pos))||(id==="pregnancy_late"&&/no prone or supine/.test(sp))
       ||(id==="obesity"&&/standing/.test(pos)&&/prone and supine/.test(pos))){R.noFloor=true;why.push("floor");}
    if(id==="obesity"&&/breathe properly/.test(txt(c.breathing))){R.steady=true;why.push("breath");}
    /* Jumps: not with osteoporosis ("not typically recommended"), diabetes ("avoid
       excessive"), heart disease, nor in the second and third trimesters. */
    var ply=txt(c.plyometrics);
    if(/not typically|avoid excessive plyometrics/.test(ply+sp)||(id==="pregnancy_late"&&/no plyometrics/.test(sp))||id==="coronary_heart_disease"){R.noPlyo=true;why.push("plyo");}
    /* Medication that blunts the heart rate makes a predicted heart rate wrong. */
    if(/talk test|no predicted-hrmax|prediction equations become invalid/.test(all)){R.talkTest=true;why.push("talk");}
    if(/stand up slowly/.test(sp)){R.slowStand=true;}
    R.notes.push({id:id,why:why});});
  return R;}

/* Reps kept inside the range; sets no more than the most. For a loaded lift only. */
function fitDose(e,R){
  if(!R)return e;
  /* Into the range, two reps wide at least (6–8 becomes 10–12, not 10–10); a range
     already partly inside keeps its top (8–12 becomes 10–12). */
  if(R.reps){
    e.lo=Math.max(R.reps.min,Math.min(+e.lo||R.reps.min,R.reps.max));
    e.hi=Math.min(R.reps.max,Math.max(+e.hi||0,e.lo+2));}
  if(R.sets&&e.sets>R.sets.max)e.sets=R.sets.max;
  return e;}

/* What the plan does about it, as lines for the screens: [key, values] pairs, the key
   an English string the UI translates, the values filled in after. Most important
   first: what is left out, then how to breathe, then the dose. */
function lines(R,p){
  if(!R)return [];
  var out=[];
  if(R.noFloor)out.push(["No lying on your back or front: those lifts are swapped for seated, standing or incline ones.",{}]);
  if(R.noPlyo)out.push(["No jumps.",{}]);
  if(R.steady)out.push(["Breathe out on the effort and never hold your breath.",{}]);
  if(R.reps)out.push(["{a}–{b} reps a set, with a load to match.",{a:R.reps.min,b:R.reps.max}]);
  if(R.sets)out.push([R.sets.max===1?"One set an exercise.":"Up to {n} sets an exercise.",{n:R.sets.max}]);
  if(R.talkTest)out.push(["Judge effort by the talk test: you should still be able to speak. Medication can change your heart rate, so a heart-rate number may mislead.",{}]);
  if(R.slowStand)out.push(["Stand up slowly between exercises.",{}]);
  if(R.days&&p&&+p.days>R.days.max)out.push(["The book gives up to {n} strength days a week for this; you chose {d}.",{n:R.days.max,d:+p.days}]);
  return out;}

export {lines as condLines, ASK as CONDS_ASK, LABEL as COND_LABEL, fitDose, idsFor, rulesFor};

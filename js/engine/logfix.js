/* Bunyan — logged body weight, read back as body weight
   Before the logger's box said "added weight", a body-weight exercise could be logged
   with the lifter's own weight in it: push-ups at 86 kg meant push-ups at body weight.
   Volume and estimated maxes already read such a figure as the whole load
   (js/engine/lifts.js loadIn), but the suggestion for next time read it as 86 kg added,
   and the warm-up ramped up to it. Once per profile, those sets get 0 added weight, the
   way the logger has saved them since: on a body-weight exercise, a weight within 1.5
   kg of the body weight on that day (bodyAtIn). Nothing else in the log changes; a
   set with real added weight (a belt, a vest) is far from the body weight and stays.

   Pure on the blob it is given, and run only once the history is in memory (it is
   kept apart, in IndexedDB). fixBodyweightLogs(db) → null when nothing was due, else
   {changed, sessions, undo}: the number of sets changed, the sessions to save, and a
   way to put them back (returning the sessions to save again). The
   version is set either way (db.logFixV), so this runs once. */
import {EXDB, exIdOf, LIB, muscleOf, pairOfDumbbells} from "../data/exercises.js";
import {matchExercise} from "./splitparse.js";
import {bodyAtIn} from "./lifts.js";
import {num} from "../util.js";

/* 2: the workout open at the time is read too (its sets were filled in from the old
   ones before the history was corrected). Running again is harmless: corrected sets
   are 0 and are left alone. */
var LOGFIX_V=2;
function bwExercise(name){var v=EXDB&&EXDB[name];return !!(v&&v.e==="Bodyweight");}
function fixBodyweightLogs(db){
  if(!db||num(db.logFixV)>=LOGFIX_V||!EXDB)return null;
  db.logFixV=LOGFIX_V;
  var log={body:db.body,weight:db.profile&&db.profile.weight},was=[],touched=[];
  (db.sessions||[]).forEach(function(s,si){
    var bw=bodyAtIn(log,s.date);if(!(bw>0))return;
    (s.entries||[]).forEach(function(e,ei){
      if(!e||!bwExercise(e.name))return;
      (e.sets||[]).forEach(function(x,xi){
        if(x&&num(x.w)>0&&Math.abs(num(x.w)-bw)<=1.5){was.push([s.id,si,ei,xi,x.w]);x.w=0;if(touched.indexOf(s)<0)touched.push(s);}});});});
  /* The workout in progress, on today's body weight. */
  var act=db.active,abw=act&&bodyAtIn(log,act.date||"");
  if(act&&abw>0)(act.entries||[]).forEach(function(e,ei){
    if(!e||!bwExercise(e.name))return;
    (e.sets||[]).forEach(function(x,xi){
      if(x&&num(x.w)>0&&Math.abs(num(x.w)-abw)<=1.5){was.push(["@active",-1,ei,xi,x.w]);x.w=0;}});});
  /* Undo finds each set again by its session, so it works on the blob as it is then. */
  return {changed:was.length,sessions:touched,undo:function(d){
    var ss=(d||db).sessions||[],back=[];
    was.forEach(function(p){
      var s=p[0]==="@active"?(d||db).active:ss.filter(function(x){return x.id===p[0];})[0]||ss[p[1]],e=s&&s.entries&&s.entries[p[2]],x=e&&e.sets&&e.sets[p[3]];
      if(x&&!num(x.w)){x.w=p[4];if(p[0]!=="@active"&&back.indexOf(s)<0)back.push(s);}});
    return back;}};}

/* Dumbbell loads, from per hand to both together or back (owner, 27 Oct). The setting
   says what the box holds, so the history is brought along with it: every set of a
   two-dumbbell exercise, the workout under way, and a step of the person's own for
   one, doubled or halved, so one method holds throughout and volume, records and
   suggestions do not jump. One arm at a time is one dumbbell either way, untouched.
   convertDbLoads(db, to) → {changed, sessions}: the sets changed, the sessions to save. */
function convertDbLoads(db,to){
  var from=db&&db.prefs&&db.prefs.dbLoad==="total"?"total":"hand",out={changed:0,sessions:[]};
  if(!db||!/^(hand|total)$/.test(to)||to===from)return out;
  var k=to==="total"?2:0.5;
  function conv(s,save){var hit=false;
    (s&&s.entries||[]).forEach(function(e){
      if(!e||!pairOfDumbbells(e.name))return;
      (e.sets||[]).forEach(function(x){if(x&&num(x.w)>0){x.w=Math.round(num(x.w)*k*100)/100;out.changed++;hit=true;}});});
    if(hit&&save)out.sessions.push(s);}
  (db.sessions||[]).forEach(function(s){conv(s,true);});
  conv(db.active,false);
  if(db.incr)Object.keys(db.incr).forEach(function(n){if(pairOfDumbbells(n)&&num(db.incr[n])>0)db.incr[n]=Math.round(num(db.incr[n])*k*100)/100;});
  db.prefs.dbLoad=to;
  return out;}

/* Exercises of the person's own that the library has after all (owner, 27 Oct:
   "Overhand grip barbell curl", "Reverse wrist curl" came in from a program as their
   own, muscle Other, no picture). Each whose name the library now knows for certain —
   its own name or a name coaches use (splitparse.js KNOWN), never a near miss — becomes
   the library's exercise everywhere: every program, the workout under way, every
   session, favourites, skips, own steps. Names put back with Undo (db.keepOwn) stay
   the person's own. Pure on the blob; LIB loses the own entries it adopted.
   adoptLibrary(db) → {names:[[own, library]], sessions, undo}. */
function adoptLibrary(db){
  var out={names:[],sessions:[],undo:null};
  if(!db||!EXDB||!Array.isArray(db.myEx)||!db.myEx.length)return out;
  var keep={};(db.keepOwn||[]).forEach(function(n){keep[String(n).toLowerCase()]=1;});
  var map={};
  db.myEx.forEach(function(m){
    if(!m||!m.n||EXDB[m.n]||keep[m.n.toLowerCase()])return;
    var r=matchExercise(m.n,{lib:true});
    if(r&&r.conf==="exact"&&r.name&&EXDB[r.name])map[m.n]=r.name;});
  var names=Object.keys(map);if(!names.length)return out;
  var before={myEx:db.myEx.slice(),favs:(db.favs||[]).slice(),skip:(db.skip||[]).slice(),incr:Object.assign({},db.incr||{}),was:[]};
  function fix(e,where){if(e&&map[e.name]){before.was.push([where,e,e.name,e.exId,e.muscle]);
    e.name=map[e.name];e.exId=exIdOf(e.name);if(e.muscle!=null)e.muscle=muscleOf(e.name);return true;}return false;}
  (db.programs||[]).concat(db.userSplits||[],db.myPlan?[db.myPlan]:[]).forEach(function(sp){
    (sp&&sp.days||[]).forEach(function(d){(d.ex||[]).forEach(function(e){fix(e,"plan");});});});
  if(db.active)(db.active.entries||[]).forEach(function(e){fix(e,"active");});
  (db.sessions||[]).forEach(function(s){var hit=false;(s.entries||[]).forEach(function(e){if(fix(e,s))hit=true;});if(hit)out.sessions.push(s);});
  var ren=function(n){return map[n]||n;};
  if(Array.isArray(db.favs))db.favs=db.favs.map(ren).filter(function(n,i,a){return a.indexOf(n)===i;});
  if(Array.isArray(db.skip))db.skip=db.skip.map(ren).filter(function(n,i,a){return a.indexOf(n)===i;});
  if(db.incr)names.forEach(function(n){if(db.incr[n]!=null){if(db.incr[map[n]]==null)db.incr[map[n]]=db.incr[n];delete db.incr[n];}});
  db.myEx=db.myEx.filter(function(m){return !map[m.n];});
  for(var i=LIB.length-1;i>=0;i--)if(map[LIB[i][0]]&&!EXDB[LIB[i][0]])LIB.splice(i,1);
  out.names=names.map(function(n){return [n,map[n]];});
  /* Undo: every entry back to the name it had, the own exercises back, and their names
     kept as the person's own from now on. Returns the sessions to save again. */
  out.undo=function(d){d=d||db;var back=[];
    before.was.forEach(function(w){var e=w[1];e.name=w[2];if(w[3]!=null)e.exId=w[3];else delete e.exId;if(w[4]!=null)e.muscle=w[4];
      if(w[0]!=="plan"&&w[0]!=="active"&&back.indexOf(w[0])<0)back.push(w[0]);});
    d.myEx=before.myEx;d.favs=before.favs;d.skip=before.skip;d.incr=before.incr;
    d.keepOwn=(d.keepOwn||[]).concat(names);
    before.myEx.forEach(function(m){if(map[m.n])LIB.push([m.n,m.m||"Other","Other",0]);});
    return back;};
  return out;}

export {adoptLibrary, convertDbLoads, fixBodyweightLogs, LOGFIX_V};

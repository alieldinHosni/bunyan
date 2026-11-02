import {buildWeek, buildTargets} from "../build.js";
import {EXDB} from "../../data/exercises.js";
import {PRESETS} from "../../data/splits.js";

/* The week built from nothing keeps the rules it is built on (js/engine/build.js): a
   rest day between two sessions on the same muscles, every training day used, nothing
   hidden or out of reach, the session length, the priority muscles given more, and
   nothing from the far end of the library (slams, olympic lifts, jumps). */
var POOL={};PRESETS().forEach(function(p){p.days.forEach(function(d){(d.ex||[]).forEach(function(e){POOL[e.name||e]=1;});});});
function helpers(o){
  o=o||{};
  return {usable:function(n,gear){var e=(EXDB[n]||{}).e;return !gear||!gear.length||e==="Bodyweight"||gear.indexOf(e)>=0;},
    avoids:function(){return false;},familiar:function(){return o.logged||{};},pool:POOL,
    dose:function(){return {sets:3,rest:90};},train:function(g){return g==="strength"?"str":"hyp";},
    favs:o.favs||[],skip:o.skip||[],skilled:!!o.skilled,
    weekdays:function(n){return {2:[2,6],3:[1,3,6],4:[2,3,6,7],5:[1,3,4,6,7],6:[1,2,3,4,5,6]}[n];}};}
function gap(a,b){var d=Math.abs(a-b)%7;return Math.min(d,7-d);}
var ODD=/slam|clean|snatch|atlas|stone|sled|battling|jump|hops|burpee|flutter|around the world/i;

function run(t){
  var cases=[
    {days:2,mins:60,level:"new",goal:"gain"},
    {days:3,mins:60,level:"new",goal:"gain"},
    {days:4,mins:60,level:"some",goal:"gain",focus:["Chest"]},
    {days:5,mins:75,level:"experienced",goal:"gain"},
    {days:6,mins:60,level:"advanced",goal:"gain"},
    {days:3,mins:45,level:"some",goal:"lose",gear:["Dumbbell"]},
    {days:4,mins:60,level:"some",goal:"strength",wd:[6,7,2,4]}];
  cases.forEach(function(c){
    var label=c.days+" days, "+c.level+(c.gear?", "+c.gear.join("/"):"");
    var w=buildWeek(c,c.gear||null,helpers());
    t.eq(w.days.length,c.wd?c.wd.length:c.days,label+": one day per training day");
    t.ok(w.days.every(function(d){return d.ex.length>=3;}),label+": every day has its exercises");
    if(c.wd)t.eq(w.days.map(function(d){return d.wd;}).sort(),c.wd.slice().sort(),label+": on the weekdays given");
    var on={},bad=[],odd=[],gearBad=[],long=[];
    w.days.forEach(function(d){
      var m={};d.ex.forEach(function(e){m[e.muscle]=1;
        if(ODD.test(e.name))odd.push(e.name);
        if(c.gear&&!helpers().usable(e.name,c.gear))gearBad.push(e.name);});
      Object.keys(m).forEach(function(x){(on[x]=on[x]||[]).push(d.wd);});
      if(d.ex.length*3*(90+35)/60>Math.max(25,c.mins-8)+8)long.push(d.name);});
    Object.keys(on).forEach(function(x){var a=on[x];
      for(var i=0;i<a.length;i++)for(var j=i+1;j<a.length;j++)if(gap(a[i],a[j])<2)bad.push(x+" "+a[i]+"/"+a[j]);});
    t.eq(bad,[],label+": a rest day between sessions on the same muscle");
    t.eq(odd,[],label+": nothing from the far end of the library");
    t.eq(gearBad,[],label+": only what they own");
    t.eq(long,[],label+": each day fits the session length");
    ["Chest","Back","Quads","Hamstrings"].forEach(function(m){t.ok(on[m],label+": trains "+m);});
    if(c.days<=3)t.ok(w.days.every(function(d){return /^Full Body/.test(d.name);}),label+": the whole body each session");
    t.clean(w,label+": clean");});

  var plain=buildTargets({level:"some",goal:"gain"},"hyp"),focus=buildTargets({level:"some",goal:"gain",focus:["Back"]},"hyp");
  t.ok(focus.Back>plain.Back,"a muscle to bring up gets more weekly sets");
  var tired=buildTargets({level:"some",goal:"gain",sleep:5},"hyp");
  t.ok(tired.Chest<plain.Chest,"short sleep builds to the bottom of the range");
  var stressed=buildTargets({level:"some",goal:"gain",stress:"high"},"hyp");
  t.ok(stressed.Chest<plain.Chest,"high stress builds to the bottom of the range");

  var p={days:4,mins:60,level:"some",goal:"gain"};
  var base=buildWeek(p,null,helpers()),first=base.days[0].ex[0].name;
  var skipped=buildWeek(p,null,helpers({skip:[first]}));
  t.ok(skipped.days.every(function(d){return d.ex.every(function(e){return e.name!==first;});}),"an exercise they hid is never in the week");
  var fav="Dumbbell Flyes";
  var starred=buildWeek(p,null,helpers({favs:[fav]}));
  t.ok(starred.days.some(function(d){return d.ex.some(function(e){return e.name===fav;});}),"a starred exercise is used");
  var cF=buildWeek({days:4,mins:60,level:"some",goal:"gain",focus:["Shoulders"]},null,helpers());
  var firstOf=cF.days.filter(function(d){return d.ex.some(function(e){return e.muscle==="Shoulders";});})[0];
  t.eq(firstOf&&firstOf.ex[0].muscle,"Shoulders","the muscle to bring up comes first on its day");}

export {run};

import {FAQ, FAQ_AR} from "../../data/faq.js";
import {build} from "../kbsearch.js";
import {IDS} from "../../coach/intent.js";
import {faqMatch} from "../faq.js";

/* The answer bank keeps its rules (js/data/faq.js): every source exists, every figure
   comes from a cited passage or the app's own code, every line has its Arabic with the
   same figures, and each answer is found from its own examples. */
function strings(f){
  var out=[f.title];
  f.a.forEach(function(x){if(x.p)out.push(x.p);if(x.n)out.push(x.n);if(x.l)out=out.concat(x.l);});
  f.acts.forEach(function(a){out.push(a[0]);});
  return out;}
function nums(s){return (String(s).replace(/\{[a-z]+\}/g,"").replace(/(\d),(\d{3})/g,"$1$2").match(/\d+(?:\.\d+)?/g)||[]).map(Number);}

function run(t){
  var I=build(),docs={};
  I.docs.forEach(function(d){docs[d.file+":"+d.title]=d.facts.join(" | ").replace(/(\d),(\d{3})/g,"$1$2");});
  var ids={},badSrc=[],badNum=[],noAr=[],arNum=[],badBeat=[],thin=[],lost=[];
  FAQ.forEach(function(f){
    if(ids[f.id])badSrc.push("duplicate id "+f.id);ids[f.id]=1;
    if(f.ex.length<5)thin.push(f.id);
    f.beats.forEach(function(b){if(IDS.indexOf(b)<0)badBeat.push(f.id+": "+b);});
    var text=f.src.filter(function(s){return !/^app:/.test(s);}).map(function(s){
      if(!(s in docs)){badSrc.push(f.id+": "+s);return "";}return docs[s];}).join(" | ");
    strings(f).forEach(function(s){
      nums(s).forEach(function(n){
        if(f.appNums.indexOf(n)>=0)return;
        var re=new RegExp("(^|[^\\d.])"+String(n).replace(".","\\.")+"(?![\\d]|\\.\\d)");
        if(!re.test(text))badNum.push(f.id+": "+n+" in “"+s.slice(0,60)+"…”");});
      if(!FAQ_AR[s])noAr.push(f.id+": "+s.slice(0,60));
      else if(nums(s).sort().join()!==nums(FAQ_AR[s]).sort().join())arNum.push(f.id+": "+s.slice(0,50));});
    /* Its own examples find it: the bank can at least answer what it was written for. */
    f.ex.forEach(function(q){var m=faqMatch(q);if(!m||m.f.id!==f.id)lost.push(f.id+": "+q+" → "+(m?m.f.id:"none"));});});
  t.eq(badSrc,[],"every source names a knowledge passage that exists");
  t.eq(badNum,[],"every figure is in a cited passage, or is the app's own");
  t.eq(noAr,[],"every line has its Arabic");
  t.eq(arNum,[],"the Arabic carries the same figures");
  t.eq(badBeat,[],"an answer only steps in for intents that exist");
  t.eq(thin,[],"at least five ways each answer is asked");
  t.eq(lost,[],"each answer is found from its own examples");}

export {run};

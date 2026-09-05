/* Bunyan — train
   Train tab: days, library, splits, bodyweight. */
import {t} from "../../i18n/dict.js";
import {empty, EQUIP, LIB, MUSCLES, patternOf, thumb} from "../../data/exercises.js";
import {exName} from "../../i18n/exnames.js";
import {prevPerf, prFor} from "../../engine/formulas.js";
import {groupLabel, vLogger} from "./session.js";
import {allSplits, dayOf, S, split} from "../../state.js";
import {toDisp, wUnit} from "../../units.js";
import {esc, shortd} from "../../util.js";
import {head, V} from "../view.js";

/* ============================================================ TRAIN */
function nextDayOf(sp){
  var lastIdx=-1;
  if(S.sessions.length){
    for(var i=0;i<sp.days.length;i++)
      if(sp.days[i].id===S.sessions[0].dayId){lastIdx=i;break;}}
  for(var k=1;k<=sp.days.length;k++){
    var d=sp.days[(lastIdx+k+sp.days.length)%sp.days.length];
    if(d.ex.length)return d;}
  return null;}

function vTrain(){
  if(S.active)return vLogger();
  if(V.train==="splits")return vSplits();
  if(V.train==="preview")return vPreview();
  if(V.train==="library")return vLibrary();
  if(V.train==="bodyweight")return vBodyweight();
  if(V.train==="day")return vDay();

  var sp=split(),h="";
  var nd=nextDayOf(sp);
  var doneWeek=S.sessions.filter(function(x){
    return (Date.now()-new Date(x.date+"T00:00:00").getTime())<7*864e5;}).length;
  var target=sp.days.filter(function(d){return d.ex.length;}).length;

  h+=head(t("Training"),t("Choose your battleground"));
  h+='<div class="overline">'+t("My training")+'</div>';
  h+='<div class="card" style="border-color:var(--accent)">'
   +'<div class="row"><div><h2 style="margin:0">'+esc(sp.name)+'</h2>'
   +'<div class="tiny" style="margin-top:3px">'+esc(sp.tag||"custom")+'</div></div>'
   +'<span class="pill a">'+doneWeek+' / '+target+' '+t("this week")+'</span></div>';
  if(nd){
    h+='<div class="plan" style="margin:14px 0 0"><div class="tiny">'+t("Up next")+'</div>'
     +'<div style="font-size:19px;font-weight:700;margin:2px 0 2px">'+esc(nd.name)+'</div>'
     +'<div class="tiny">'+nd.ex.length+' exercises \u00b7 about '+estMinutes(nd)+' min</div></div>';
    h+='<button class="btn" data-startday="'+nd.id+'">'+t("Start workout")+'</button>';
  }else h+=empty("dumbbell",t("This split is empty"),
    t("Add exercises to a day and it becomes startable."),
    '<button class="btn" data-addday="1">'+t("Add a day")+'</button>');
  h+='</div>';

  h+='<div class="sec">'+t("Training days")+'</div><div class="list">';
  sp.days.forEach(function(d){
    var last=null;
    for(var i=0;i<S.sessions.length;i++)if(S.sessions[i].dayId===d.id){last=S.sessions[i].date;break;}
    h+='<button class="item" data-day="'+d.id+'"><div><div style="font-weight:600">'+esc(d.name)+'</div>'
     +'<div class="tiny">'+(d.ex.length?d.ex.length+" exercises":"rest day")
     +(last?" \u00b7 last "+shortd(last):"")+'</div></div>'
     +(nd&&d.id===nd.id?'<span class="pill a">next</span>':'<span class="chev">\u203a</span>')+'</button>';});
  h+='</div>';
  h+='<button class="btn g sm" data-addday="1" style="width:auto">'+t("Add a day")+'</button>';

  h+='<div class="sec">'+t("Explore")+'</div><div class="list">'
   +'<button class="item" data-train="splits"><div><div style="font-weight:600">'+t("Other splits")+'</div>'
   +'<div class="tiny">'+allSplits().length+' programs, preview before you switch</div></div>'
   +'<span class="chev">\u203a</span></button>'
   +'<button class="item" data-bwsplit="1"><div><div style="font-weight:600">'+t("Bodyweight, no equipment")+'</div>'
   +'<div class="tiny">'+LIB.filter(function(l){return l[2]==="Bodyweight";}).length
   +' exercises and a four day program</div></div><span class="chev">\u203a</span></button>'
   +'<button class="item" data-train="library"><div><div style="font-weight:600">'+t("Exercise library")+'</div>'
   +'<div class="tiny">'+LIB.length+' exercises, filter by muscle and equipment</div></div>'
   +'<span class="chev">\u203a</span></button></div>';
  return h;}

function estMinutes(d){
  var tot=0;
  d.ex.forEach(function(e){tot+=e.sets*((e.rest||75)+35);});
  return Math.round(tot/60/5)*5;}

function vPreview(){
  var sp=allSplits().filter(function(x){return x.id===V.previewId;})[0];
  if(!sp){V.train="splits";return vTrain();}
  var h='<button class="btn d sm" data-train="splits" style="width:auto">\u2039 Back</button>';
  h+='<h1>'+esc(sp.name)+'</h1><p class="sub">'+esc(sp.tag||"custom")+'</p>';
  sp.days.forEach(function(d){
    if(!d.ex.length){h+='<div class="card"><div class="row"><h3 class="dim">'+esc(d.name)
      +'</h3><span class="tiny">rest</span></div></div>';return;}
    h+='<div class="card"><div class="row"><h3>'+esc(d.name)+'</h3>'
     +'<span class="tiny">'+estMinutes(d)+' min</span></div>';
    d.ex.forEach(function(e,i){
      h+='<div class="row" style="margin-top:8px"><span style="font-size:14px">'+(i+1)+'. '
       +esc(exName(e.name))+'</span><span class="tiny num">'+e.sets+' \u00d7 '+e.lo
       +(e.hi!==e.lo?"\u2013"+e.hi:"")+'</span></div>';});
    h+='</div>';});
  h+='<button class="btn" data-adopt="'+sp.id+'">'+t("Make this my training")+'</button>';
  if(sp.custom)h+='<button class="btn d" data-delsplit="'+sp.id+'">'+t("Delete this saved split")+'</button>';
  return h;}

function vBodyweight(){
  var bw=LIB.filter(function(l){return l[2]==="Bodyweight";});
  var h='<button class="btn d sm" data-train="days" style="width:auto">\u2039 Back</button>';
  h+=head(t("Bodyweight"),t("Nothing but the floor"));
  h+='<button class="card tap" data-preview="bw" style="border-color:var(--accent)">'
   +'<div class="row"><h3>'+t("Bodyweight program")+'</h3><span class="pill a">4 days</span></div>'
   +'<p class="tiny" style="margin:5px 0 0">'+t("Push, pull, legs and a conditioning day. No equipment at all.")+'</p>'
   +'</button>';
  h+='<div class="sec">'+t("Browse by area")+'</div><div class="list">';
  [["Core","Core and abs"],["Chest","Push"],["Back","Pull"],["Quads","Legs"],
   ["Hamstrings","Hamstrings and glutes"],["Shoulders","Shoulders"],["Calves","Calves"]]
   .forEach(function(c){
    var n=bw.filter(function(l){return l[1]===c[0];}).length;
    if(!n)return;
    h+='<button class="item" data-bwcat="'+c[0]+'"><div><div style="font-weight:600">'+c[1]+'</div>'
     +'<div class="tiny">'+n+' exercises</div></div><span class="chev">\u203a</span></button>';});
  h+='</div>';
  h+='<div class="sec">'+t("By difficulty")+'</div><div class="list">';
  ["Beginner","Intermediate","Advanced"].forEach(function(d){
    var n=bw.filter(function(l){return l[4]===d;}).length;
    if(!n)return;
    h+='<button class="item" data-bwdiff="'+d+'"><div><div style="font-weight:600">'+d+'</div>'
     +'<div class="tiny">'+n+' exercises</div></div><span class="chev">\u203a</span></button>';});
  h+='</div>';
  h+='<button class="btn g" data-bwcat="All">See all '+bw.length+' bodyweight exercises</button>';
  return h;}

function vLibrary(){
  var q=V.exq.toLowerCase();
  var list=LIB.filter(function(l){
    return (V.exm==="All"||l[1]===V.exm)
        && (V.exe==="All"||l[2]===V.exe)
        && (!V.exd||l[4]===V.exd)
        && (!q||l[0].toLowerCase().indexOf(q)>=0);});
  var h='<button class="btn d sm" data-train="days" style="width:auto">\u2039 Back</button>';
  h+=head(t("Exercises"),t("Saber execution, perfect form"));
  h+='<p class="tiny" style="margin:-14px 0 12px">'+list.length+' of '+LIB.length+' shown'
   +(V.exd?' \u00b7 '+V.exd:'')+'</p>';
  if(V.exd)h+='<button class="btn d sm" data-cleardiff="1" style="width:auto">'+t("Clear difficulty filter")+'</button>';
  h+='<input id="exq" placeholder="Search" value="'+esc(V.exq)+'">';
  h+='<div style="display:flex;gap:6px;overflow-x:auto;margin:11px 0 8px;padding-bottom:4px">';
  ["All"].concat(MUSCLES).forEach(function(m){
    h+='<button class="pill'+(V.exm===m?" a":"")+'" data-exm="'+m+'" style="border:none;flex-shrink:0">'+m+'</button>';});
  h+='</div><div style="display:flex;gap:6px;overflow-x:auto;margin-bottom:12px;padding-bottom:4px">';
  ["All"].concat(EQUIP).forEach(function(q2){
    h+='<button class="pill'+(V.exe===q2?" a":"")+'" data-exe="'+q2+'" style="border:none;flex-shrink:0">'+q2+'</button>';});
  h+='</div><div class="list">';
  list.slice(0,150).forEach(function(l){
    h+='<button class="item" data-exdetail="'+esc(l[0])+'">'+thumb(l[0],42)
     +'<div style="flex:1"><div style="font-weight:600">'+esc(exName(l[0]))+'</div>'
     +'<div class="tiny">'+t(l[1])+' \u00b7 '+t(l[2])+' \u00b7 '+t(patternOf(l[0]))+'</div></div>'
     +'<span class="chev">\u203a</span></button>';});
  if(list.length>150)h+='<div class="item"><span class="tiny">'+t("Showing the first 150. Narrow the filters.")+'</span></div>';
  h+='</div>';
  if(!list.length)h+=empty("search",
    q?t("Nothing matches")+" “"+V.exq+"”":t("Nothing matches those filters"),
    t("Your gym may call it something else, or it may not be in the library at all."),
    '<button class="btn" data-customex="1">'+t("Add it yourself")+'</button>');
  return h;}

function vSplits(){
  var h='<button class="btn d sm" data-train="days" style="width:auto">\u2039 Back</button>';
  h+=head(t("Programs"),t("One active at a time"));
  h+='<div class="list">';
  allSplits().forEach(function(sp){
    var days=sp.days.filter(function(d){return d.ex.length;}).length;
    h+='<button class="item" data-preview="'+sp.id+'"><div><div style="font-weight:600">'+esc(sp.name)+'</div>'
     +'<div class="tiny">'+days+' training days \u00b7 '+esc(sp.tag||"custom")+'</div></div>'
     +(split().source===sp.id?'<span class="pill a">yours</span>':'<span class="chev">\u203a</span>')
     +'</button>';});
  h+='</div><button class="btn g" data-newsplit="1">'+t("Build one from scratch")+'</button>';
  return h;}

function vDay(){
  var d=dayOf(V.dayId);if(!d){V.train="days";return vTrain();}
  var h='<div class="row"><button class="btn d sm" data-train="days">‹ Back</button>'
   +'<button class="btn d sm" data-renameday="'+d.id+'">'+t("Rename")+'</button></div>';
  h+='<h1>'+esc(d.name)+'</h1><p class="sub">'+d.ex.length+' exercises · tap one to edit</p>';
  h+='<div class="list">';
  d.ex.forEach(function(e,i){
    var pr=prFor(e.name),p=prevPerf(e.name);
    var gl=groupLabel(d.ex,i);
    h+='<button class="item'+(gl?" grouped":"")+'" data-editex="'+e.id+'">'
     +thumb(e.name,42)
     +'<div style="flex:1"><div style="font-weight:600">'
     +(gl?'<span class="glabel">'+gl+'</span> ':'')+esc(exName(e.name))+'</div>'
     +'<div class="tiny">'+e.sets+' × '+e.lo+(e.hi!==e.lo?"–"+e.hi:"")+' · rest '+e.rest+'s · '+esc(t(e.muscle))
     +(p?' · last '+p.sets.map(function(x){return x.w?x.w+"×"+x.r:x.r;}).join(" "):"")+'</div></div>'
     +(pr.w?'<span class="pill gold">'+toDisp(pr.w)+wUnit()+'</span>':'<span class="chev">›</span>')+'</button>';});
  h+='</div>';
  if(!d.ex.length)h+=empty("dumbbell",t("Nothing prescribed yet"),
    t("Add the exercises, sets and rep ranges you want. You only do this once — the session screen runs it for you."),
    '<button class="btn" data-addex="'+d.id+'">'+t("Add an exercise")+'</button>');
  else h+='<button class="btn g" data-addex="'+d.id+'">'+t("Add an exercise")+'</button>';
  if(d.ex.length)h+='<button class="btn" data-startday="'+d.id+'">'+t("Start workout")+'</button>';
  h+='<button class="btn d" data-delday="'+d.id+'">'+t("Delete this day")+'</button>';
  return h;}


export {estMinutes, nextDayOf, vTrain};

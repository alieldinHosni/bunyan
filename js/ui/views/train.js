/* Bunyan — train
   Train tab: days, library, splits, bodyweight. */
import {t} from "../../i18n/dict.js";
import {empty, EQUIP, LIB, muscleOf, muscleOfEntry, MUSCLES, patternOf, thumb} from "../../data/exercises.js";
import {exName} from "../../i18n/exnames.js";
import {groupLabel, vLogger} from "./session.js";
import {allSplits, dayOf, S, split} from "../../state.js";
import {SPLIT_LEVEL} from "../../engine/plan.js";
import {esc, fmtN, shortd, weekDays} from "../../util.js";
import {head, V} from "../view.js";
import {backArrow, backBar} from "../nav.js";

/* ============================================================ TRAIN */

/* One photograph per preset, keyed by the split's own id rather than by its position
   in the list. The cards used to read img/program-<i%3+1>.jpg, so six programs shared
   three pictures and which program got which changed whenever the list reordered —
   adopting a split drops it out of "Other Programs" and shifted every image along. */
var SPLIT_IMG={ap:"split-ap",arnold:"split-arnold",ppl:"split-ppl",
  ul:"split-ul",fb:"split-fb",bw:"split-bw",bro:"split-bro"};
/* A split the user built themselves has no photograph of its own. It gets the accent
   field instead of borrowing another programme's picture. */
function splitCover(id){
  var f=SPLIT_IMG[id];
  return f?'<span class="tcover"><img src="img/'+f+'.jpg" alt="" loading="lazy"></span>'
          :'<span class="tcover tcover-none"></span>';}

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
  if(V.train==="favs")return vFavs();
  /* ---- the hub: canvas screen 1 (Figma node 2:810) ------------------------------
     Built from the canvas's layout in the core frames' tokens, so the app stays one
     system. Every figure is computed from the user's own data; the frame's "Week 4 of
     12 · 33%" is placeholder text, and programs here have no fixed length in weeks. */
  var sp=split(),h="";
  var nd=nextDayOf(sp);
  var wk=weekDays(),inWeek={};
  wk.forEach(function(d){inWeek[d]=1;});
  var doneWeek=S.sessions.filter(function(x){return inWeek[x.date];}).length;
  var target=sp.days.filter(function(d){return d.ex.length;}).length;
  /* Sessions done this week out of the sessions the split plans for it: 2 of 4 is 50%.
     Capped at 100, because training more than planned is not more than finished. */
  var pct=target?Math.min(100,Math.round(doneWeek/target*100)):0;
  h+='<div class="thead"><h1>'+t("Train")+'</h1>'
   +'<button class="icobtn" data-train="favs" aria-label="'+t("Favourites")
   +(S.favs.length?' ('+S.favs.length+')':'')+'"><span class="ico ico-star" aria-hidden="true"></span></button></div>';
  h+='<div class="card thero">'
   +'<div><div class="klabel">'+t("Active Program")+'</div>'
   +'<div class="thero-name">'+esc(sp.name)+'</div></div>'
   +'<div class="tprog"><div class="tprog-l"><span>'+doneWeek+' '+t("of")+' '+target+' '
   +t("sessions this week")+'</span><b>'+pct+'%</b></div>'
   +'<div class="tbar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+pct+'"'
   +' aria-label="'+t("Sessions this week")+'"><i style="width:'+pct+'%"></i></div></div>';
  if(nd){
    h+='<button class="tsplit" data-day="'+nd.id+'"><span><span class="klabel dim">'+t("Today's Split")+'</span>'
     +'<span class="tsplit-n">'+esc(nd.name)+'</span></span>'
     +'<span class="tsplit-m">~'+estMinutes(nd)+' '+t("min")+'</span></button>'
     +'<button class="btn" data-startday="'+nd.id+'">'+t("Start Today's Session")
     +'<span class="ico ico-arrow" aria-hidden="true"></span></button>';
  }else h+=empty("dumbbell",t("This split is empty"),
    t("Add exercises to a day and it becomes startable."),
    '<button class="btn" data-addday="1">'+t("Add a day")+'</button>');
  h+='</div>';
  /* ---- training days ----
     Not in the canvas, which shows only today's split. It stays because it is the only
     way to open, edit or reorder any other day of the plan. */
  h+='<div class="tsec"><h2 class="tsec-h">'+t("Training Days")+'</h2></div><div class="card tdays">';
  sp.days.forEach(function(d){
    var last=null;
    for(var i=0;i<S.sessions.length;i++)if(S.sessions[i].dayId===d.id){last=S.sessions[i].date;break;}
    h+='<button class="trow" data-day="'+d.id+'"><span><span class="trow-n">'+esc(d.name)+'</span>'
     +'<span class="trow-s">'+(d.ex.length?d.ex.length+' '+t("exercises"):t("rest day"))
     +(last?' · '+t("last")+' '+shortd(last):'')+'</span></span>'
     +(nd&&d.id===nd.id?'<span class="tnext">'+t("Next")+'</span>':'<span class="ico ico-chev" aria-hidden="true"></span>')
     +'</button>';});
  h+='<button class="trow tadd" data-addday="1"><span class="trow-n">+ '+t("Add a day")+'</span></button></div>';
  /* ---- other programs ----
     The app's own preset splits, each with its own photograph — see SPLIT_IMG.
     No "premium": everything here is free. */
  var others=allSplits().filter(function(o){return o.id!==sp.source&&o.id!==sp.id;});
  if(others.length){
    h+='<div class="tsec"><h2 class="tsec-h">'+t("Other Programs")+'</h2>'
     +'<button class="tlink" data-train="splits">'+t("All")+'</button></div>'
     +'<div class="tscroll">';
    others.forEach(function(o){
      var days=o.days.filter(function(d){return d.ex.length;}).length;
      var lvl=levelOf(o.id);
      h+='<button class="tprog-card" data-preview="'+o.id+'">'
       +splitCover(o.id)
       +'<span class="tpc-body"><span><span class="tpc-n">'+esc(o.name)+'</span>'
       +'<span class="tpc-s">'+esc(tagNote(o.tag))+'</span></span>'
       +'<span class="tpc-m"><span>'+days+' '+t("days / week")+'</span>'
       +(lvl?'<span class="tchip">'+t(lvl)+'</span>':'')+'</span></span></button>';});
    h+='</div>';
  }
  /* ---- bodyweight & no equipment ----
     Each pill opens the library on that muscle with bodyweight only (data-bwcat, which
     already existed). The muscles are the ones that actually have bodyweight exercises,
     most first — the canvas's "Abs"/"Mobility" labels are not categories this library has.
     The last pill is the four-day bodyweight programme. */
  var bw={};
  LIB.forEach(function(l){if(l[2]==="Bodyweight")bw[l[1]]=(bw[l[1]]||0)+1;});
  var cats=Object.keys(bw).sort(function(a,b){return bw[b]-bw[a];}).slice(0,6);
  h+='<div class="tsec"><h2 class="tsec-h">'+t("Bodyweight & No Equipment")+'</h2></div>'
   +'<div class="tscroll tpills">'
   +cats.map(function(c){return '<button class="tpill" data-bwcat="'+esc(c)+'">'+esc(t(c))+'</button>';}).join("")
   +'<button class="tpill" data-bwsplit="1">'+t("Full Body Program")+'</button></div>';
  /* ---- library ---- */
  h+='<button class="card tap tlib" data-train="library">'
   +'<span class="tlib-i"><span class="ico ico-search" aria-hidden="true"></span></span>'
   +'<span class="tlib-t"><span class="tlib-n">'+t("Exercise Library")+'</span>'
   +'<span class="tlib-s">'+t("Search")+' '+fmtN(LIB.length)+' '+t("exercises")+'</span></span>'
   +'<span class="ico ico-chev" aria-hidden="true"></span></button>';
  return h;}
/* The experience level a preset scores best for, from the plan recommender's own
   table rather than a label invented for the card. Ties go to the lower level, so a
   split that suits two levels is shown to the less experienced of them. That lands on
   every preset's own tag: PPL intermediate, Arnold advanced, Full Body beginner. */

var LEVEL_LABEL={new:"Beginner",some:"Intermediate",experienced:"Intermediate",advanced:"Advanced"};

function levelOf(id){
  var best=null,score=-1e9;
  ["new","some","experienced","advanced"].forEach(function(l){
    var s=(SPLIT_LEVEL[l]||{})[id];
    if(typeof s==="number"&&s>score){score=s;best=l;}});
  return best?LEVEL_LABEL[best]:"";
}
/* A preset's tag reads "6 days · advanced"; the day count is shown separately, from
   the plan itself, so only the descriptive half goes under the name. */

function tagNote(tag){
  var p=String(tag||"").split("·");
  return (p[1]||p[0]||"").trim();
}

/* ---- favourites ---------------------------------------------------------- */

function vFavs(){
  var h=backBar();
  h+=head(t("Favourites"),t("Suggested first when you add an exercise"));
  if(!S.favs.length)
    return h+empty("star",t("No favourites yet"),
      t("Open any exercise and tap the star at the top of the sheet. Starred lifts come first in the picker."),
      '<button class="btn" data-train="library">'+t("Exercise library")+'</button>');
  h+='<div class="list">';
  S.favs.forEach(function(n){
    h+='<button class="item" data-exdetail="'+esc(n)+'">'+thumb(n,36)
     +'<div style="flex:1;min-width:0"><div style="font-weight:600">'+esc(exName(n))+'</div>'
     +'<div class="tiny">'+t(muscleOf(n))+'</div></div>'
     +'<span class="chev">\u203a</span></button>';});
  return h+'</div>';}

function estMinutes(d){
  var tot=0;
  d.ex.forEach(function(e){tot+=e.sets*((e.rest||75)+35);});
  return Math.round(tot/60/5)*5;}

function vPreview(){
  var sp=allSplits().filter(function(x){return x.id===V.previewId;})[0];
  if(!sp){V.train="splits";return vTrain();}
  var h=backBar();
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
  var h=backBar();
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
  var h=backBar();
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
  var h=backBar();
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

/* ---- a day: canvas screen 2 (Figma node 2:915) ------------------------------
   The routine as it will be performed, then one button to begin it. The frame shows
   only the reading view, so the plan-editing the app has always had — add, rename,
   delete — sits behind its "Edit Workout Routine" link rather than being dropped. */

function vDay(){
  var d=dayOf(V.dayId);if(!d){V.train="days";return vTrain();}
  var sp=split();
  var pos=sp.days.indexOf(d)+1;
  var lvl=levelOf(sp.source);
  var h='<div class="dhead">'+backArrow()
   +'<h1 class="dhead-t">'+esc(d.name)+'</h1></div>'
   +'<p class="dsub">'+esc(sp.name)+(pos?' • '+t("Day")+' '+pos:'')+'</p>';
  /* Every figure measured from the day itself. */
  h+='<div class="dstrip">'
   +'<div><span class="klabel dim">'+t("Exercises")+'</span><b>'+d.ex.length+' '+t("Movements")+'</b></div>'
   +'<div><span class="klabel dim">'+t("Duration")+'</span><b>~'+estMinutes(d)+' '+t("Min")+'</b></div>'
   +(lvl?'<div><span class="klabel dim">'+t("Level")+'</span><b>'+t(lvl)+'</b></div>':'')
   +'</div>';
  if(!d.ex.length){
    h+=empty("dumbbell",t("Nothing prescribed yet"),
      t("Add the exercises, sets and rep ranges you want. You only do this once — the session screen runs it for you."),
      '<button class="btn" data-addex="'+d.id+'">'+t("Add an exercise")+'</button>');
  }else{
    h+='<h2 class="tsec-h droutine">'+t("Session Routine")+'</h2><div class="drows">';
    d.ex.forEach(function(e,i){
      var gl=groupLabel(d.ex,i);
      h+='<button class="drow" data-editex="'+e.id+'">'
       +'<span class="dnum">'+(i+1)+'</span>'
       +'<span class="dtext"><span class="drow-n">'
       +(gl?'<span class="glabel">'+gl+'</span> ':'')+esc(exName(e.name))+'</span>'
       +'<span class="drow-s">'+e.sets+' × '+e.lo+(e.hi!==e.lo?'–'+e.hi:'')
       +'<i class="ddot"></i>'+esc(t(muscleOfEntry(e)))+'</span></span>'
       +'<span class="ico ico-chev" aria-hidden="true"></span></button>';});
    h+='</div>';
  }
  /* The frame's bottom block. The edit link opens the actions the frame has no room
     for; they are the same ones that were loose buttons before. */
  h+='<div class="dcta">';
  if(d.ex.length)h+='<button class="btn dbegin" data-startday="'+d.id+'">'+t("Begin Workout")+'</button>';
  h+='<button class="dedit" data-dayedit="1" aria-expanded="'+(V.dayEdit?"true":"false")+'">'
   +t("Edit Workout Routine")+'</button>';
  if(V.dayEdit)
    h+='<div class="dedit-actions">'
     +'<button class="btn g sm" data-addex="'+d.id+'">'+t("Add an exercise")+'</button>'
     +'<button class="btn g sm" data-renameday="'+d.id+'">'+t("Rename")+'</button>'
     +'<button class="btn d sm" data-delday="'+d.id+'">'+t("Delete this day")+'</button></div>';
  h+='</div>';
  return h;}

export {estMinutes, nextDayOf, vTrain};

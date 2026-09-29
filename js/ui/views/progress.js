/* Bunyan — progress
   Progress tab: the four Progress frames from the user's export (Overview, Strength,
   Body, Nutrition Trends), with the Body / Strength / Nutrition segmented control
   from frame 2:484 as the way between them.

   The four frames each draw a back chevron, as pushed screens, and none shows how
   they are reached. 2:484 answers that: they are views of one tab, switched in
   place. So there is no chevron — a back arrow on a tab's own root would lead
   nowhere — and "See All" under the records is the one link into another view.

   Every figure is computed in js/engine/stats.js from what was logged. Where a
   frame's sample number has no source in the app, the tile or line is left out or
   says what is missing, rather than showing a plausible invention.

   Departures from the frames, each for a reason:
   - Overview's second row of stats was hidden under the chart in the frame; it is
     laid out here (average duration, streak). 2:484's "Discipline Timeline"
     heading overlapped its measurement cards the same way. Neither is reproduced.
   - The gear is gone: settings are the Profile tab.
   - The range chips drive every span on every view, not only Overview's, so no
     chart is scoped by a control that is off screen.
   - The date navigator and its "that day" card, which the app already had, open
     Overview, above the range, as Food has them; they scope only that card. */
import {t} from "../../i18n/dict.js";
import {empty, thumb} from "../../data/exercises.js";
import {exName} from "../../i18n/exnames.js";
import {bodyFat, bodyFatSeries, consistencyMonth, daysBetween, e1rmSeries, liftHalf, liftProgress, measurements,
        muscleShare, nutrition, overview, recentRecords, streaks, strengthIndex, TOL, topLifts, volumeSeries,
        weighIns, weightChange} from "../../engine/stats.js";
import {sessionVolume} from "../../engine/formulas.js";
import {S} from "../../state.js";
import {fmtW, toDisp, wUnit} from "../../units.js";
import {esc, fmtN, r1, shortd, today} from "../../util.js";
import {seg, streak, V} from "../view.js";
import {dateBar} from "../datebar.js";
import {photoList} from "../photos.js";
import {render} from "../render.js";

/* ---- shared pieces ----------------------------------------------------------- */
var RANGES=[[7,"1W"],[30,"1M"],[90,"3M"],[180,"6M"],[365,"1Y"]];
var PAST={7:"Past 7 days",30:"Past 30 days",90:"Past 90 days",180:"Past 6 months",365:"Past year"};
var VS={7:"vs the week before",30:"vs the 30 days before",90:"vs the 90 days before",
        180:"vs the 6 months before",365:"vs the year before"};
function range(){var r=+V.range;return PAST[r]?r:30;}

function lbl(text,aside){
  return '<div class="pglbl"><h2>'+esc(text)+'</h2>'+(aside||'')+'</div>';}
/* 24 Oct, with the year only when it is not this one. */
function dateStr(iso){
  var d=new Date(iso+"T00:00:00"),o={day:"numeric",month:"short"};
  if(d.getFullYear()!==new Date().getFullYear())o.year="numeric";
  return d.toLocaleDateString(undefined,o);}
function ago(iso){
  var n=daysBetween(iso,today());
  if(n<=0)return t("Today");
  if(n===1)return t("Yesterday");
  if(n<7)return t("{n} days ago").replace("{n}",n);
  return dateStr(iso);}
/* ↑ +1 / ↓ −1, coloured only when it is progress. */
function delta(v,dp,good,unit,suffix){
  if(v==null)return "";
  var up=v>0,down=v<0,abs=Math.abs(v);
  var s=(up?"↑ +":down?"↓ −":"±")+(dp?r1(abs):Math.round(abs))+(unit||"");
  var cls=(good>0&&up)||(good<0&&down)?" ok":"";
  return '<span class="pgd'+cls+'">'+s+(suffix?' '+esc(suffix):'')+'</span>';}
/* Grouped, and past six figures shortened, so it fits a half-width tile. */
function bigW(kg){
  var v=toDisp(kg);
  return v>=100000?fmtN(v/1000)+"k":fmtN(v);}
/* A muscle group's name. "Back" is also the navigation word, and the dictionary
   keeps the muscle under "Back " for that reason. */
function gname(g){return g==="Back"?t("Back "):t(g);}

/* The frames' line chart. Drawn left to right in both languages — time runs that way
   on a chart whatever the script — with three dates under it. `ref` is a dashed
   level line: the target, or the average. */
function lineChart(pts,o){
  o=o||{};
  var W=320,H=120,PX=4,PY=10,vals=pts.map(function(p){return p.v;});
  var all=o.ref!=null?vals.concat([o.ref]):vals;
  var mn=Math.min.apply(null,all),mx=Math.max.apply(null,all);
  if(mx===mn){mx+=1;mn-=1;}
  var pad=(mx-mn)*0.08;mn-=pad;mx+=pad;
  function X(i){return r1(PX+i*(W-2*PX)/(pts.length-1));}
  function Y(v){return r1(PY+(H-2*PY)*(1-(v-mn)/(mx-mn)));}
  var d=pts.map(function(p,i){return (i?"L":"M")+X(i)+" "+Y(p.v);}).join(" ");
  var last=pts.length-1,mid=Math.floor(last/2);
  var h='<figure class="pgchart" dir="ltr" role="img" aria-label="'+esc(o.aria||"")+'">'
   +'<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" aria-hidden="true">';
  if(o.grid)[1,2,3].forEach(function(k){
    var gx=r1(W*k/4);h+='<line x1="'+gx+'" y1="0" x2="'+gx+'" y2="'+H+'" class="pgchart-g"/>';});
  if(o.fill)h+='<path d="'+d+' L'+X(last)+' '+H+' L'+X(0)+' '+H+' Z" class="pgchart-a"/>';
  if(o.ref!=null){var ry=Y(o.ref);
    h+='<line x1="0" y1="'+ry+'" x2="'+W+'" y2="'+ry+'" class="pgchart-r"/>';}
  /* Points are zero-length round-capped strokes, not circles: the box stretches to
     the card (preserveAspectRatio none), which would squash a circle into an ellipse,
     while a non-scaling stroke stays round at any size. o.dots marks every point; the
     last is always marked. */
  function dot(i){var m='M'+X(i)+' '+Y(pts[i].v)+'h0';
    return '<path class="pgchart-po" d="'+m+'"/><path class="pgchart-p" d="'+m+'"/>';}
  h+='<path class="line pgchart-l" d="'+d+'"/>'
   +(o.dots&&pts.length<=24?pts.map(function(p,i){return dot(i);}).join(""):dot(last))+'</svg>'
   +'<figcaption class="pgaxis"><span>'+esc(shortd(pts[0].d))+'</span>'
   +(last>1?'<span>'+esc(shortd(pts[mid].d))+'</span>':'')
   +'<span>'+esc(shortd(pts[last].d))+'</span></figcaption></figure>';
  return h;}
function tooFew(text){return '<p class="pgnone">'+esc(text)+'</p>';}

/* ---- the tab ------------------------------------------------------------------- */
var TABS=[["overview","Overview"],["strength","Strength"],["body","Body"],["nutrition","Nutrition"]];
function anything(){
  if(S.sessions.length||weighIns().length||measurements().length)return true;
  for(var d in S.days)if(S.days[d]&&S.days[d].meals)
    for(var m in S.days[d].meals)if((S.days[d].meals[m].items||[]).length)return true;
  return false;}

function vProgress(){
  var h='<div class="thead"><div><h1>'+t("Progress")+'</h1>'
   +'<p class="thead-s">'+t("Track. Improve. Get stronger.")+'</p></div></div>';
  /* A wall of zeroes tells a new user nothing. Show the two things that start
     filling this screen instead. */
  if(!anything())
    return h+empty("chart",t("Nothing to chart yet"),
      t("Finish one workout or log your weight, and volume, records, streaks and trends all start here."),
      '<button class="btn" data-go="train">'+t("Start a workout")+'</button>'
      +'<button class="btn g" data-sheet="weigh">'+t("Log weight")+'</button>');
  var tab=V.ptab||"overview";
  h+=seg({items:TABS.map(function(x){return [x[0],t(x[1])];}),value:tab,attr:"ptab",
    tabs:true,label:t("Progress views"),key:"pgtabs"});
  var r=range();
  /* Overview opens with the day, as Food does: the date navigator and what that one
     day held. It scopes only that card. The range below drives everything else, and
     neither ever moves the other. */
  if(tab==="overview")h+=dateBar({date:pdate(),open:V.pcal,monthOffset:V.cal})+vThatDay();
  /* The range is the secondary control: same component, tinted rather than filled,
     so the section switch above stays the one that reads as navigation. Each chip's
     accessible name is the span it stands for — "1W" read aloud says nothing. */
  h+=seg({items:RANGES.map(function(x){return [x[0],t(x[1]),t(PAST[x[0]])];}),value:r,attr:"range",
    soft:true,cls:"pgrange",label:t("Time range"),key:"pgrange"});
  if(tab==="strength")h+=vStrength(r);
  else if(tab==="body")h+=vBody(r);
  else if(tab==="nutrition")h+=vNutrition(r);
  else h+=vOverview(r);
  return h;}

/* ---- Overview ------------------------------------------------------------------ */
function stat(k,v,unit,sub){
  return '<div class="pgstat"><div class="pgstat-k">'+esc(k)+'</div>'
   +'<div class="pgstat-v">'+v+(unit?'<span>'+esc(unit)+'</span>':'')+'</div>'
   +(sub?'<div class="pgstat-d">'+sub+'</div>':'')+'</div>';}

/* Small inline icons for the metric badges, on the dock's 24 grid and stroke. */
var KI={
  weight:'<path d="M5 20h14a1 1 0 0 0 1-1.1l-1.4-10A2 2 0 0 0 16.6 7H7.4a2 2 0 0 0-2 1.9L4 18.9A1 1 0 0 0 5 20z"/><path d="M12 7V4.5M9.5 12.5 12 10"/>',
  bf:'<path d="M9 3.5c-1 2.5-1 4.5 0 7-2 2-3 4.5-3 7.5v2.5h12V18c0-3-1-5.5-3-7.5 1-2.5 1-4.5 0-7"/><path d="M9 10.5h6"/>',
  strength:'<path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>',
  cons:'<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4M9 15l2 2 4-4"/>',
  ruler:'<path d="M3.5 16.5 16.5 3.5l4 4-13 13z"/><path d="M7 13l1.5 1.5M9.5 10.5l2 2M12 8l1.5 1.5M14.5 5.5l2 2"/>'};
function kicon(k){return '<span class="pgki" aria-hidden="true"><svg viewBox="0 0 24 24">'+KI[k]+'</svg></span>';}
/* A sparkline for a metric card: no axes, no dots, just the shape. Coloured when the
   shape is progress, plain when it is not, as the deltas are. */
function spark(vals,good){
  if(vals.length<2)return '';
  var W=100,H=28,mn=Math.min.apply(null,vals),mx=Math.max.apply(null,vals);
  if(mx===mn){mx+=1;mn-=1;}
  var d=vals.map(function(v,i){return (i?"L":"M")+r1(i*W/(vals.length-1))+" "+r1(3+(H-6)*(1-(v-mn)/(mx-mn)));}).join(" ");
  return '<svg class="pgspark'+(good?' ok':'')+'" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" aria-hidden="true">'
   +'<path d="'+d+'"/></svg>';}
function bars(vals){
  var mx=Math.max.apply(null,vals.concat([1]));
  return '<div class="pgbars" aria-hidden="true">'+vals.map(function(v,i){
    return '<i class="'+(i===vals.length-1?'now':'')+'" style="height:'+Math.max(10,v/mx*100)+'%"></i>';}).join("")+'</div>';}
function kcard(icon,label,value,unit,sub,visual,go,aria){
  return '<button class="pgkm-c" data-ptab="'+go+'" aria-label="'+esc(aria)+'">'
   +'<span class="pgkm-h">'+kicon(icon)+'<span class="pgkm-k">'+esc(label)+'</span></span>'
   +'<span class="pgkm-v">'+value+(unit?'<small>'+esc(unit)+'</small>':'')+'</span>'
   +'<span class="pgkm-s">'+sub+'</span>'+visual+'</button>';}

function vOverview(r){
  var h="",goal=(S.profile||{}).goal;
  /* ---- key metrics: the frame's four cards, each a way into its own view */
  var gw=goal==="lose"?-1:goal==="gain"?1:0;
  var wi=weighIns(r),wc=weightChange(),bfv=bodyFat(),bfs=bodyFatSeries(r),si=strengthIndex(r),cm=consistencyMonth();
  var wFirst=wi.length?wi[0].weight:null,wLast=wc?wc.cur.weight:null;
  var wd=wi.length>=2?toDisp(wLast)-toDisp(wFirst):null;
  var bfd=bfs.length>=2?bfs[bfs.length-1].v-bfs[0].v:null;
  h+=lbl(t("Key metrics"),'<button class="pglink" data-ptab="body">'+esc(t("See details"))+'</button>');
  h+='<div class="pgkm">'
   +kcard("weight",t("Weight"),wLast?String(toDisp(wLast)):"—",wLast?wUnit():"",
      wd!=null?delta(wd,true,gw," "+wUnit()):esc(t(wLast?"One weigh-in in range":"Not logged yet")),
      spark(wi.map(function(b){return b.weight;}),gw!==0&&wd!=null&&(wd<0)===(gw<0)),"body",
      t("Weight")+" "+(wLast?toDisp(wLast)+" "+wUnit():t("Not logged yet")))
   +kcard("bf",t("Body fat"),bfv.bf!=null?String(bfv.bf):"—",bfv.bf!=null?"%":"",
      bfd!=null?delta(bfd,true,-1,"%"):esc(t(bfv.bf!=null?(bfv.src==="navy"?"Estimated":"Entered"):"Add measurements")),
      spark(bfs.map(function(p){return p.v;}),bfd!=null&&bfd<0),"body",
      t("Body fat")+" "+(bfv.bf!=null?bfv.bf+"%":t("Add measurements")))
   +kcard("strength",t("Strength"),si.pct!=null?(si.pct>0?"+":si.pct<0?"−":"")+Math.abs(Math.round(si.pct))+"%":"—","",
      esc(si.pct!=null?t(PAST[r]):t("Log a lift twice in range")),
      spark(si.series.map(function(p){return p.v;}),si.pct!=null&&si.pct>0),"strength",
      t("Strength")+" "+(si.pct!=null?Math.round(si.pct)+"% "+t(PAST[r]):t("Log a lift twice in range")))
   +kcard("cons",t("Consistency"),String(cm.days),t(cm.days===1?"day":"days"),
      esc(t("This month")),bars(cm.weeks),"overview",
      t("Consistency")+" "+cm.days+" "+t("days")+" "+t("This month"))
   +'</div>';

  var o=overview(r);
  h+=lbl(t(PAST[r]));
  var wk=o.compare?delta(o.n-o.pn,false,1,"",t(VS[r])):"";
  var vp=o.vpct!=null?delta(o.vpct,Math.abs(o.vpct)<10,1,"%",t(VS[r])):"";
  var st=streak();
  h+='<div class="pgstats">'
   +stat(t("Workouts"),fmtN(o.n),"",wk)
   +stat(t("Volume"),bigW(o.vol),wUnit(),vp)
   +stat(t("Avg duration"),o.mins!=null?String(o.mins):"—",o.mins!=null?t("min"):"",
      esc(o.mins!=null?t("per session"):t("Timed sessions only")))
   +stat(t("Streak"),String(st),t(st===1?"day":"days"),esc(t("in a row")))
   +'</div>';

  /* ---- recent progress: the weight trend, as the frame leads with it */
  if(wi.length>=2){
    var wp=wi.map(function(b){return {d:b.date,v:toDisp(b.weight)};});
    h+=lbl(t("Recent progress"),'<button class="pglink" data-ptab="body">'+esc(t("View all"))+'</button>');
    h+='<div class="pgcard"><div class="pgcard-h"><h3 class="pgcard-i">'+kicon("weight")+esc(t("Weight"))+'</h3>'
     +'<span class="pgcard-r"><b>'+toDisp(wLast)+' '+esc(wUnit())+'</b>'+(wd!=null?delta(wd,true,gw," "+wUnit()):'')+'</span></div>'
     +lineChart(wp,{fill:true,dots:true,aria:t("Body weight")+", "+wp[0].v+" → "+wp[wp.length-1].v+" "+wUnit()})+'</div>';}

  var vs=volumeSeries(r);
  h+='<div class="pgcard"><div class="pgcard-h"><h3>'+esc(t("Training volume"))+'</h3>'
   +'<span>'+esc(t(r<=31?"per training day":"per week"))+'</span></div>'
   +(vs.length>=2?lineChart(vs,{grid:true,
       aria:t("Training volume")+", "+shortd(vs[0].d)+" – "+shortd(vs[vs.length-1].d)+": "
         +fmtN(toDisp(vs[0].v))+" → "+fmtN(toDisp(vs[vs.length-1].v))+" "+wUnit()})
     :tooFew(t("Train on two different days in this range and the trend draws here.")))
   +'</div>';

  /* ---- body measurements, three across, as the frame has them */
  var ms=measurements().slice(0,3);
  if(ms.length){
    h+='<div class="pgcard pgmeas"><div class="pgcard-h"><h3 class="pgcard-i">'+kicon("ruler")+esc(t("Body measurements"))+'</h3>'
     +'<button class="pglink" data-ptab="body">'+esc(t("View all"))+'</button></div><div class="pgmeas-g">'
     +ms.map(function(m){
       return '<div class="pgmeas-c"><span>'+esc(t(m.name))+'</span><b>'+r1(m.v)+' '+esc(t("cm"))+'</b>'
        +(m.delta!=null?delta(m.delta,true,m.good," "+t("cm")):'<span class="pgd">—</span>')+'</div>';}).join("")
     +'</div></div>';}

  var rec=recentRecords(3);
  h+=lbl(t("Personal records"),rec.length?'<button class="pglink" data-seeall="1">'+esc(t("See all"))+'</button>':'');
  if(!rec.length)h+=tooFew(t("Your heaviest set on every lift is tracked from the first session."));
  rec.forEach(function(L){
    h+='<div class="pgrow"><div class="pgrow-t">'
     +'<div class="pgrow-n"><span>'+esc(exName(L.name))+'</span><b class="pgbadge">'+esc(t("PR"))+'</b></div>'
     +'<div class="pgrow-s">'+(L.w?esc(fmtW(L.w))+' × '+L.reps+' '+esc(t("reps")):L.reps+' '+esc(t("reps")))+'</div></div>'
     +'<span class="pgrow-e">'+esc(dateStr(L.date))+'</span></div>';});

  var recent=S.sessions.slice(0,3);
  if(recent.length){
    h+=lbl(t("Recent workouts"));
    recent.forEach(function(s){
      var n=s.entries.filter(function(e){return (e.sets||[]).length;}).length;
      var mins=s.activeMs>0?Math.round(s.activeMs/60000):null;
      h+='<button class="pgrow" data-openday="'+s.date+'"><span class="pgrow-t">'
       +'<span class="pgrow-n"><span>'+esc(s.dayName||t("Workout"))+'</span></span>'
       +'<span class="pgrow-s">'+(mins!=null?mins+' '+esc(t("min"))+' · ':'')
       +n+' '+esc(t(n===1?"exercise":"exercises"))+'</span></span>'
       +'<span class="pgrow-e">'+esc(ago(s.date))+'</span>'
       +'<span class="ico ico-chev" aria-hidden="true"></span></button>';});}

  /* ---- the frame's closing banner, over the Bunyan artwork. It only says "you are
     getting stronger" when the numbers above say so. */
  h+='<button class="pgbanner" data-ptab="strength">'
   +'<img src="intro.jpg" alt="" aria-hidden="true" width="902" height="897" decoding="async" loading="lazy">'
   +'<span class="pgbanner-t"><b>'+esc(t("Progress takes time"))+'</b>'
   +'<span>'+esc(si.pct>0?t("Stay consistent. You're getting stronger."):t("Stay consistent. It adds up."))+'</span></span>'
   +'<span class="ico ico-chev" aria-hidden="true"></span></button>';
  return h;}

function pdate(){return V.pdate||today();}
function vThatDay(){
  var d=pdate();
  var sess=S.sessions.filter(function(x){return x.date===d;});
  var rec=S.days[d]||{};
  var wRow=(S.body||[]).filter(function(b){return b.date===d&&b.weight;})[0];
  var meals=Object.keys(rec.meals||{}).reduce(function(n,k){
    return n+((rec.meals[k].items||[]).length?1:0);},0);
  var vol=sess.reduce(function(n,x){return n+sessionVolume(x);},0);
  var bits=[];
  if(sess.length)bits.push(esc(sess.map(function(x){return x.dayName;}).join(", "))
    +' · '+fmtN(toDisp(vol))+' '+wUnit());
  if(wRow)bits.push(esc(fmtW(wRow.weight)));
  if(rec.steps)bits.push(fmtN(rec.steps)+' '+t("steps"));
  if(meals)bits.push(meals+' '+t(meals===1?"meal":"meals"));
  return '<button class="pgrow" data-openday="'+d+'"><span class="pgrow-t">'
   +'<span class="pgrow-k">'+t("THAT DAY")+'</span>'
   +'<span class="pgrow-n"><span>'+(bits.length?bits.join(' · '):t("Nothing logged"))+'</span></span></span>'
   +'<span class="ico ico-chev" aria-hidden="true"></span></button>';}

/* ---- Strength ------------------------------------------------------------------ */
function vStrength(r){
  var all=topLifts();
  if(!all.length)return empty("chart",t("No strength history"),
    t("Log the same lift twice and Bunyan starts plotting your estimated one-rep max."),
    '<button class="btn" data-go="train">'+t("Start a workout")+'</button>');
  /* All / Upper / Lower, the frame's filter. It narrows every list on this view and
     the lift picker with them. */
  var half=V.phalf||"all";
  var lifts=half==="all"?all:all.filter(function(L){return liftHalf(L.name)===half;});
  var h=seg({items:[["all",t("All")],["upper",t("Upper")],["lower",t("Lower")]],value:half,attr:"phalf",
    soft:true,cls:"pghalf",label:t("Body part"),key:"pghalf"});
  if(!lifts.length)return h+tooFew(t("Nothing logged for this half of the body yet."));
  var names=lifts.map(function(L){return L.name;});
  if(!V.chartEx||names.indexOf(V.chartEx)<0)V.chartEx=names[0];

  /* ---- personal records, side by side */
  var recs=lifts.filter(function(L){return L.date&&(L.w>0||L.reps>0);})
    .sort(function(a,b){return (b.w-a.w)||(b.sets-a.sets);}).slice(0,8);
  if(recs.length){
    h+=lbl(t("Personal records"));
    h+='<div class="pgprs" role="list">'+recs.map(function(L){
      return '<button class="pgpr'+(L.name===V.chartEx?' on':'')+'" role="listitem" data-chartex="'+esc(L.name)+'"'
       +' aria-label="'+esc(exName(L.name)+": "+(L.w?fmtW(L.w)+" × "+L.reps:L.reps+" "+t("reps"))+", "+dateStr(L.date))+'">'
       +kicon("strength")+'<span class="pgpr-n">'+esc(exName(L.name))+'</span>'
       +'<span class="pgpr-v">'+(L.w?toDisp(L.w)+'<small>'+esc(wUnit())+'</small>':L.reps+'<small>'+esc(t("reps"))+'</small>')+'</span>'
       +'<span class="pgpr-d">'+esc(dateStr(L.date))+'</span></button>';}).join("")+'</div>';}

  /* ---- the charted lift */
  h+='<label class="afsel pgpick"><b class="afsel-v">'+esc(exName(V.chartEx))+'</b>'
   +'<span class="ico ico-cdown" aria-hidden="true"></span>'
   +'<select id="chartsel" aria-label="'+esc(t("Lift"))+'">'
   +names.map(function(n){return '<option value="'+esc(n)+'"'+(n===V.chartEx?' selected':'')+'>'
     +esc(exName(n))+'</option>';}).join("")+'</select></label>';
  var pts=e1rmSeries(V.chartEx,r),full=e1rmSeries(V.chartEx);
  var curV=full.length?full[full.length-1].v:0;
  h+='<div class="pgcard"><div class="pgstat-k">'+esc(t("Estimated 1RM"))+'</div>';
  if(!full.length)h+=tooFew(t("No estimate for this lift: only loaded sets of 12 reps or fewer give one."));
  else{
    h+='<div class="pgbig">'+toDisp(curV)+'<span>'+esc(wUnit())+'</span></div>';
    if(pts.length>=2)h+='<div class="pgsub">'
      +delta(toDisp(pts[pts.length-1].v)-toDisp(pts[0].v),true,1," "+wUnit())+' '
      +esc(t("since"))+' '+esc(dateStr(pts[0].d))+'</div>'
      +lineChart(pts,{fill:true,aria:t("Estimated 1RM")+" "+exName(V.chartEx)+": "
        +toDisp(pts[0].v)+" → "+toDisp(pts[pts.length-1].v)+" "+wUnit()});
    else h+=tooFew(t("Log this lift on two days in this range to see the trend."));
    h+='<p class="pgnote">'+esc(t("Epley formula, from working sets of 12 reps or fewer."))+'</p>';}
  h+='</div>';

  /* ---- exercise progress: every lift, most trained first, with its latest session,
     its trend and how far it moved in the range. Tapping one charts it above. */
  var shown=V.pall?lifts:lifts.slice(0,5);
  h+=lbl(t("Exercise progress"),'<span class="pgaside">'+esc(t(PAST[r]))+'</span>');
  shown.forEach(function(L){
    var lp=liftProgress(L.name,r),on=L.name===V.chartEx,ls=lp.last;
    var line=ls?(ls.sets+' × '+ls.reps+(ls.w?' · '+toDisp(ls.w)+' '+wUnit():'')):fmtN(L.sets)+' '+t("total sets");
    h+='<button class="pgex'+(on?' on':'')+'" data-chartex="'+esc(L.name)+'" aria-pressed="'+on+'"'
     +' aria-label="'+esc(exName(L.name)+", "+line+(lp.pct!=null?", "+Math.round(lp.pct)+"%":""))+'">'
     +thumb(L.name,52)
     +'<span class="pgex-t"><span class="pgex-n">'+esc(exName(L.name))+'</span>'
     +'<span class="pgex-s">'+esc(line)+'</span></span>'
     +spark(lp.series.map(function(p){return p.v;}),lp.pct!=null&&lp.pct>0)
     +'<span class="pgex-p'+(lp.pct>0?' ok':'')+'">'+(lp.pct!=null?(lp.pct>0?"+":lp.pct<0?"−":"±")+Math.abs(Math.round(lp.pct))+"%":"—")+'</span>'
     +'<span class="ico ico-chev" aria-hidden="true"></span></button>';});
  if(lifts.length>5)h+='<button class="btn g" data-pall="1">'
    +esc(V.pall?t("Show fewer"):t("Show all")+" "+lifts.length)+'</button>';

  /* ---- a quick insight, only ever what the figures above support */
  var si=strengthIndex(r);
  if(si.pct!=null){
    var up=si.pct>=0.5,down=si.pct<=-0.5;
    h+='<div class="pginsight"><span class="pginsight-i" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/></svg></span>'
     +'<span><b>'+esc(t("Quick insight"))+'</b><span>'
     +esc(up?t("Your top lifts are up {n}% across this range.").replace("{n}",Math.round(si.pct))
        :down?t("Your top lifts are down {n}% across this range. A lighter week can be the point.").replace("{n}",Math.abs(Math.round(si.pct)))
        :t("Your top lifts are holding steady across this range."))+'</span>'
     +'<small>'+esc(t("From the estimated maxes of your most-trained lifts."))+'</small></span></div>';}

  /* ---- share of working sets by muscle group */
  var ms=muscleShare(r);
  h+=lbl(t("Volume by muscle group"),'<span class="pgaside">'+esc(t("working sets"))+'</span>');
  if(!ms.tot)h+=tooFew(t("No sets logged in this range."));
  else{
    var top=ms.rows[0].pct||1;
    h+='<div class="pgcard pgshare">'+ms.rows.map(function(x){
      return '<div class="pgshare-r" aria-label="'+esc(gname(x.g)+": "+x.pct+"%, "+x.sets+" "+t("sets"))+'">'
       +'<span>'+esc(gname(x.g))+'</span>'
       +'<div class="bar" aria-hidden="true"><i style="width:'+Math.max(2,x.pct/top*100)+'%"></i></div>'
       +'<b>'+x.pct+'%</b></div>';}).join("")+'</div>';}
  return h;}

/* ---- Body ---------------------------------------------------------------------- */
function vBody(r){
  var h="",wc=weightChange(),goal=(S.profile||{}).goal;
  /* Which way is progress for the scale depends on the goal. Maintaining, neither. */
  var gw=goal==="lose"?-1:goal==="gain"?1:0;
  h+='<div class="pgcard">';
  if(!wc)h+='<div class="pgstat-k">'+esc(t("Body weight"))+'</div>'
    +tooFew(t("Weigh in and the trend starts here. Mornings, before eating, are the most comparable."));
  else{
    var since=wc.ref?(wc.days>=7&&wc.days<14?t("vs last week"):t("since")+" "+dateStr(wc.ref.date)):"";
    h+='<div class="pgwhead"><div><div class="pgstat-k">'+esc(t("Body weight"))+'</div>'
     +'<div class="pgbig w">'+toDisp(wc.cur.weight)+'<span>'+esc(wUnit())+'</span></div></div>'
     +(wc.ref?'<div class="pgwd">'+delta(toDisp(wc.cur.weight)-toDisp(wc.ref.weight),true,gw," "+wUnit(),since)+'</div>':'')
     +'</div>';
    var wi=weighIns(r).map(function(b){return {d:b.date,v:toDisp(b.weight)};});
    if(wi.length>=2){
      var avg=r1(wi.reduce(function(a,p){return a+p.v;},0)/wi.length);
      h+=lineChart(wi,{ref:avg,aria:t("Body weight")+", "+wi[0].v+" → "+wi[wi.length-1].v+" "+wUnit()})
       +'<p class="pgnote"><span class="pgdash" aria-hidden="true"></span>'
       +esc(t("Average for the range"))+' · '+avg+' '+esc(wUnit())+'</p>';}
    else h+=tooFew(t("Fewer than two weigh-ins in this range. Pick a longer one, or weigh in again."));}
  h+='<button class="btn g" data-sheet="weigh">'+esc(t("Log weight"))+'</button></div>';

  var ms=measurements();
  h+=lbl(t("Measurements"),'<button class="pglink" data-sheet="measure">'+esc(t(ms.length?"Update":"Add"))+'</button>');
  if(!ms.length)h+=tooFew(t("Chest, waist, arms and the rest, in centimetres. The change since last time shows beside each."));
  ms.forEach(function(m){
    h+='<div class="pgm"><span>'+esc(t(m.name))+'</span>'
     +'<b>'+r1(m.v).toFixed(1)+' '+esc(t("cm"))+'</b>'
     +'<span class="pgm-d">'+(m.delta?delta(m.delta,true,m.good," "+t("cm")):'')+'</span></div>';});

  var bf=bodyFat();
  h+=lbl(t("Body composition"));
  h+='<div class="pgcard">';
  if(bf.bf==null){
    var need=bf.need.map(function(k){return t({height:"height",waist:"waist",neck:"neck",hips:"hips"}[k]);});
    h+=tooFew(t("To estimate body fat, add")+" "+need.join(t(", "))+"."
      +" "+t("Or enter a figure from a scale or scan with your measurements."))
     +(bf.need.indexOf("height")>=0?'<button class="btn g" data-sheet="set_you">'+esc(t("Add your height"))+'</button>':'')
     +'<button class="btn g" data-sheet="measure">'+esc(t("Add measurements"))+'</button>';}
  else{
    var lean=bf.lean!=null?100-bf.bf:null;
    h+='<div class="pgcomp"><div><div class="pgstat-k">'+esc(t("Body fat"))+'</div>'
     +'<div class="pgcomp-v">'+bf.bf+'%</div></div>'
     +(bf.lean!=null?'<div class="pgcomp-e"><div class="pgstat-k">'+esc(t("Lean mass"))+'</div>'
       +'<div class="pgcomp-v">'+toDisp(bf.lean)+'<span>'+esc(wUnit())+'</span></div></div>':'')+'</div>'
     +(lean!=null?'<div class="pgtrack" role="img" aria-label="'+esc(t("Lean mass")+" "+r1(lean)+"%")+'"><i style="width:'+lean+'%"></i></div>':'')
     +'<p class="pgnote">'+esc(bf.src==="entered"?t("The figure you entered")+", "+dateStr(bf.date)+"."
       :t("Estimated from your waist, neck and height (US Navy method), usually within 3–4 points of a lab measurement."))+'</p>';}
  h+='</div>';

  h+=lbl(t("Progress photos"));
  var ph=photoList(function(){if(V.tab==="progress"&&V.ptab==="body")render();});
  if(ph===false)h+=tooFew(t("This browser will not store photos. Open Bunyan from the home screen or in Safari or Chrome."));
  else if(ph===null)h+='<div class="pgphotos"><div class="skel pgph-sk"></div></div>';
  else{
    var add='<label class="pgaddph'+(ph.length?' sm':'')+'">'
     +'<input type="file" accept="image/*" id="pg_photo" class="pgfile">'
     +'<span class="ico ico-camera" aria-hidden="true"></span><span>'+esc(t("Add photo"))+'</span></label>';
    if(!ph.length)h+=add;
    else h+='<div class="pgphotos">'+add+ph.map(function(p){
      return '<button class="pgph" data-photo="'+esc(p.id)+'" aria-label="'+esc(t("Progress photo")+", "+dateStr(p.d))+'">'
       +'<img src="'+p.url+'" alt="" width="'+(p.w||300)+'" height="'+(p.h||400)+'" loading="lazy" decoding="async">'
       +'<span>'+esc(dateStr(p.d))+'</span></button>';}).join("")+'</div>';
    h+='<p class="pgnote">'+esc(t("Kept on this phone only. Backups do not include photos."))+'</p>';}
  return h;}

/* ---- Nutrition ----------------------------------------------------------------- */
function macroTile(name,avg,goal,cls){
  var p=goal?Math.min(100,avg/goal*100):0;
  return '<div class="pgmac"><div class="pgmac-k">'+esc(name)+'</div>'
   +'<div class="pgmac-v">'+fmtN(avg)+'g</div>'
   +'<div class="pgmac-s">'+esc(t("of"))+' '+fmtN(goal)+'g</div>'
   +'<div class="pgtrack sm '+cls+'" aria-hidden="true"><i style="width:'+p+'%"></i></div></div>';}
function ringSvg(pct){
  var R=20,C=2*Math.PI*R,f=Math.max(0,Math.min(1,pct/100));
  return '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="'+R+'" class="pgring-t"/>'
   +'<circle cx="24" cy="24" r="'+R+'" class="pgring-v" stroke-dasharray="'+(f*C).toFixed(1)+' '+C.toFixed(1)+'"'
   +' transform="rotate(-90 24 24)"/></svg>';}

function vNutrition(r){
  var g=S.goals||{},n=nutrition(r),h="";
  var tol=Math.round(TOL*100);
  h+=lbl(t("Calorie trend"),'<span class="pgaside">'+esc(t("today not counted"))+'</span>');
  if(!n.count){
    h+=empty("chart",t("No finished days logged in this range"),
      t("A day counts once it is over. Log what you eat and yesterday shows here tomorrow."),"");
  }else{
    var pts=n.days.map(function(x){return {d:x.d,v:x.kcal};});
    h+='<div class="pgcard"><div class="pgcard-h"><h3>'+esc(t("Daily calories"))+'</h3>'
     +'<span>'+esc(t("Target"))+': '+fmtN(g.kcal)+' kcal</span></div>'
     +(pts.length>=2?lineChart(pts,{ref:g.kcal,aria:t("Daily calories")+", "+t("Target")+" "+g.kcal})
       :tooFew(t("One day logged so far")+": "+fmtN(pts[0].v)+" kcal."))
     +'<p class="pgnote">'+esc(t("Average"))+' '+fmtN(n.avg.kcal)+' kcal · '+n.count+' '
       +esc(t(n.count===1?"day logged":"days logged"))+'</p></div>';

    h+=lbl(t("Macro averages"));
    h+='<div class="pgmacs">'+macroTile(t("Protein"),n.avg.p,g.p,"p")
     +macroTile(t("Carbs"),n.avg.c,g.c,"c")+macroTile(t("Fat"),n.avg.f,g.f,"f")+'</div>';

    h+=lbl(t("Adherence"));
    h+='<div class="pgcard pgadh"><div><div class="pgbig a">'+n.adherence+'%</div>'
     +'<div class="pgsub">'+esc(t("Days within {n}% of all three macro targets").replace("{n}",tol))+'</div>'
     +'<div class="pgnote">'+n.met+' '+esc(t("of"))+' '+n.count+' '+esc(t(n.count===1?"day logged":"days logged"))+'</div></div>'
     +'<div class="pgring">'+ringSvg(n.adherence)+'</div></div>';}

  var sk=streaks();
  h+=lbl(t("Consistency streaks"));
  h+='<div class="pgm tall"><span>'+esc(t("Protein target met"))
   +'<small>'+esc(t("at least")+" "+(100-tol)+"% "+t("of")+" "+fmtN(g.p)+"g")+'</small></span>'
   +'<b class="acc">'+sk.protein+' '+esc(t(sk.protein===1?"day":"days"))+'</b></div>'
   +'<div class="pgm tall"><span>'+esc(t("Calorie goal adhered"))
   +'<small>'+esc(t("within")+" "+tol+"% "+t("of")+" "+fmtN(g.kcal)+" kcal")+'</small></span>'
   +'<b class="acc">'+sk.kcal+' '+esc(t(sk.kcal===1?"day":"days"))+'</b></div>';
  return h;}

export {vProgress};

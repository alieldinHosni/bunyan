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
   - The date bar and its "that day" card, which the app already had, sit at the
     foot of Overview under "Day by day". */
import {t} from "../../i18n/dict.js";
import {empty} from "../../data/exercises.js";
import {exName} from "../../i18n/exnames.js";
import {bodyFat, daysBetween, e1rmSeries, measurements, muscleShare, nutrition, overview,
        recentRecords, streaks, TOL, topLifts, volumeSeries, weighIns, weightChange} from "../../engine/stats.js";
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
  h+='<path class="line pgchart-l" d="'+d+'"/>'
   +'<circle cx="'+X(last)+'" cy="'+Y(pts[last].v)+'" r="3" class="pgchart-p"/></svg>'
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
  var h='<div class="thead"><h1>'+t("Progress")+'</h1></div>';
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

function vOverview(r){
  var o=overview(r),h=lbl(t(PAST[r]));
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

  var vs=volumeSeries(r);
  h+='<div class="pgcard"><div class="pgcard-h"><h3>'+esc(t("Training volume"))+'</h3>'
   +'<span>'+esc(t(r<=31?"per training day":"per week"))+'</span></div>'
   +(vs.length>=2?lineChart(vs,{grid:true,
       aria:t("Training volume")+", "+shortd(vs[0].d)+" – "+shortd(vs[vs.length-1].d)+": "
         +fmtN(toDisp(vs[0].v))+" → "+fmtN(toDisp(vs[vs.length-1].v))+" "+wUnit()})
     :tooFew(t("Train on two different days in this range and the trend draws here.")))
   +'</div>';

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

  /* The one part of the tab about a single day rather than a span. Its own control,
     the shared date bar; the chips above never move it, and it never moves them. */
  h+=lbl(t("Day by day"))+dateBar({date:pdate(),open:V.pcal,monthOffset:V.cal})+vThatDay();
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
  var lifts=topLifts();
  if(!lifts.length)return empty("chart",t("No strength history"),
    t("Log the same lift twice and Bunyan starts plotting your estimated one-rep max."),
    '<button class="btn" data-go="train">'+t("Start a workout")+'</button>');
  var names=lifts.map(function(L){return L.name;});
  if(!V.chartEx||names.indexOf(V.chartEx)<0)V.chartEx=names[0];
  var h='<label class="afsel pgpick"><b class="afsel-v">'+esc(exName(V.chartEx))+'</b>'
   +'<span class="ico ico-cdown" aria-hidden="true"></span>'
   +'<select id="chartsel" aria-label="'+esc(t("Lift"))+'">'
   +names.map(function(n){return '<option value="'+esc(n)+'"'+(n===V.chartEx?' selected':'')+'>'
     +esc(exName(n))+'</option>';}).join("")+'</select></label>';

  var pts=e1rmSeries(V.chartEx,r),all=e1rmSeries(V.chartEx);
  var curV=all.length?all[all.length-1].v:0;
  h+='<div class="pgcard"><div class="pgstat-k">'+esc(t("Estimated 1RM"))+'</div>';
  if(!all.length)h+=tooFew(t("No estimate for this lift: only loaded sets of 12 reps or fewer give one."));
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

  /* Every lift, most trained first, with its record set. Tapping one charts it, so
     this list is also the way to the lift the picker would take scrolling to find. */
  var shown=V.pall?lifts:lifts.slice(0,5);
  h+=lbl(t("Top lifts"),'<span class="pgaside">'+esc(t("all time"))+'</span>');
  shown.forEach(function(L){
    var on=L.name===V.chartEx;
    h+='<button class="pgrow'+(on?' on':'')+'" data-chartex="'+esc(L.name)+'" aria-pressed="'+on+'">'
     +'<span class="pgrow-t"><span class="pgrow-n"><span>'+esc(exName(L.name))+'</span></span>'
     +'<span class="pgrow-s">'+fmtN(L.sets)+' '+esc(t("total sets"))+'</span></span>'
     +'<span class="pgrow-v">'+(L.w?esc(toDisp(L.w)+' '+wUnit())+' × '+L.reps:L.reps+' '+esc(t("reps")))+'</span></button>';});
  if(lifts.length>5)h+='<button class="btn g" data-pall="1">'
    +esc(V.pall?t("Show fewer"):t("Show all")+" "+lifts.length)+'</button>';
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

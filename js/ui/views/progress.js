/* Bunyan — progress
   Progress tab: the Progress frames from the user's export (Overview, Strength,
   Body), with the segmented control from frame 2:484 as the way between them. The
   fourth frame, Nutrition Trends, is drawn here (vNutrition) but shown in Food →
   Targets, next to the targets it measures.

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
import {t, tm} from "../../i18n/dict.js";
import {empty, thumb} from "../../data/exercises.js";
import {exName, planName} from "../../i18n/exnames.js";
import {rateOf, weightTrend, weeklyVolume, bodyFat, daysBetween, e1rmSeries, liftHalf, liftProgress, measurements, nutrition, overview, streaks, strengthIndex, TOL, topLifts, weighIns, weightChange,
        cardio, liftHistory, milestones, monthRecap, repsOnly, repsSeries, smoothWeights, steps, weekRun, weeklySetsAvg} from "../../engine/stats.js";
import {standingNow} from "../../engine/coachinfo.js";
import {ensureSessionIds, S} from "../../state.js";
import {fmtW, toDisp, wUnit} from "../../units.js";
import {dfmt, esc, fmtN, num, pretty, r1, shortd, today} from "../../util.js";
import {inDays, seg, streak, V} from "../view.js";
import {art} from "../art.js";
import {bodySvg} from "../../data/bodymap.js";
import {backArrow} from "../nav.js";
import {isoWeekday, wdName, weekDates, weekOrder, weekStart} from "../../engine/schedule.js";
import {OPL_NAME, trendSays} from "../facts.js";
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
  return dfmt(d,o);}
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
function gname(g){return tm(g);}

/* The frames' line chart. Drawn left to right in both languages — time runs that way
   on a chart whatever the script — with three dates under it. `ref` is a dashed
   level line: the target, or the average. o.raw: values beside each point drawn as
   faint dots (the weigh-ins under the weight's trend). o.key: the chart's identity, so
   a new range is a new line and draws itself on again rather than jumping. o.fmt: a
   value as words, for reading the chart with a finger (js/ui/scrub.js). */
function lineChart(pts,o){
  o=o||{};
  var W=320,H=120,PX=4,PY=10,vals=pts.map(function(p){return p.v;});
  var all=o.ref!=null?vals.concat([o.ref]):vals;
  if(o.raw)all=all.concat(o.raw.filter(function(v){return v!=null;}));
  var mn=Math.min.apply(null,all),mx=Math.max.apply(null,all);
  if(mx===mn){mx+=1;mn-=1;}
  var pad=(mx-mn)*0.08;mn-=pad;mx+=pad;
  function X(i){return r1(PX+i*(W-2*PX)/(pts.length-1));}
  function Y(v){return r1(PY+(H-2*PY)*(1-(v-mn)/(mx-mn)));}
  var d=pts.map(function(p,i){return (i?"L":"M")+X(i)+" "+Y(p.v);}).join(" ");
  var last=pts.length-1,mid=Math.floor(last/2);
  /* Each point for the finger: across and down as shares of the box, its date, its value. */
  var fmt=o.fmt||function(v){return String(v);};
  var scrub=pts.map(function(p,i){
    return [r1(X(i)/W*100),r1(Y(p.v)/H*100),shortd(p.d),fmt(p.v)+(o.raw&&o.raw[i]!=null&&o.rawFmt?" · "+o.rawFmt(o.raw[i]):"")];});
  var h='<figure class="pgchart" dir="ltr" role="img" aria-label="'+esc(o.aria||"")+'"'+(o.key?' data-k="ch:'+esc(o.key)+'"':'')
   +' data-pts="'+esc(JSON.stringify(scrub))+'">'
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
  if(o.raw)h+=o.raw.map(function(v,i){return v==null?'':'<path class="pgchart-raw" d="M'+X(i)+' '+Y(v)+'h0"/>';}).join("");
  h+='<path class="line pgchart-l" d="'+d+'"/>'
   +(o.dots&&pts.length<=24?pts.map(function(p,i){return dot(i);}).join(""):dot(last))+'</svg>'
   +'<figcaption class="pgaxis"><span>'+esc(shortd(pts[0].d))+'</span>'
   +(last>1?'<span>'+esc(shortd(pts[mid].d))+'</span>':'')
   +'<span>'+esc(shortd(pts[last].d))+'</span></figcaption></figure>';
  return h;}
function tooFew(text){return '<p class="pgnone">'+esc(text)+'</p>';}
/* Bars as capsules, the way the reference draws a week: each value a rounded column on
   a glass track, its date inside at the foot, and the newest filled in the accent with
   its figure above it. For a short series only (up to 16), where each bar is wide
   enough to carry its date; a longer one is a line. fmt turns a value into its label. */
function capsChart(pts,o){
  var mx=Math.max.apply(null,pts.map(function(p){return p.v;}))||1,last=pts.length-1;
  return '<figure class="caps" role="img" aria-label="'+esc(o.aria||"")+'"><div class="caps-r" dir="ltr" aria-hidden="true">'
   +pts.map(function(p,i){
     var h=Math.max(16,Math.round(p.v/mx*100)),dd=String(+String(p.d).slice(8,10));
     return '<div class="caps-c'+(i===last?' on':'')+'">'
      +(i===last?'<span class="caps-v">'+esc(o.fmt(p.v))+'</span>':'')
      +'<span class="caps-b" style="height:'+h+'%"><span class="caps-l">'+esc(dd)+'</span></span></div>';}).join("")
   +'</div><figcaption class="pgaxis"><span>'+esc(shortd(pts[0].d))+'</span><span>'+esc(shortd(pts[last].d))+'</span></figcaption></figure>';}

/* ---- the tab ------------------------------------------------------------------- */
/* Four views (owner, 5 Nov): what the goal is doing, the lifts, the body, and the
   habits that feed them (eating, steps, cardio), which had no place of their own. */
var TABS=[["overview","Overview"],["strength","Strength"],["body","Body"],["habits","Habits"]];
/* The controls' icons (owner's mock, 27 Oct), on the 24 grid in the metric badges'
   stroke: a chart for Overview, the dumbbell for Strength, a person for Body, a pulse
   for Habits. The halves are one athlete's figure, drawn solid (owner, 27 Oct: the line
   figure looked childish): broad shoulders tapering to the waist, the half not chosen
   faint, so All, Upper and Lower read as the body they filter by. */
var FIG_UP='<circle cx="12" cy="2.9" r="2"/><path d="M8.1 5.8C9.3 5.4 10.6 5.3 12 5.3C13.4 5.3 14.7 5.4 15.9 5.8C17 6.1 17.7 6.9 17.9 8L18.9 12.8C19 13.4 18.6 13.9 18 13.9C17.5 13.9 17.2 13.6 17.1 13.2L16 9.2L14.6 13.3C14.5 13.6 14.4 13.8 14.2 13.9H9.8C9.6 13.8 9.5 13.6 9.4 13.3L8 9.2L6.9 13.2C6.8 13.6 6.5 13.9 6 13.9C5.4 13.9 5 13.4 5.1 12.8L6.1 8C6.3 6.9 7 6.1 8.1 5.8Z"/>',
  FIG_LO='<path d="M9.7 14.4H14.3L14.8 16.2L14.2 22.4C14.1 23 13.7 23.4 13.1 23.4C12.6 23.4 12.3 23 12.3 22.5L12.1 17.4H11.9L11.7 22.5C11.7 23 11.4 23.4 10.9 23.4C10.3 23.4 9.9 23 9.8 22.4L9.2 16.2Z"/>';
var SEGI={
  overview:'<rect x="3.5" y="3.5" width="17" height="17" rx="3.5"/><path d="M7 15l3.5-3.5 2.5 2.5 4-4"/>',
  strength:'<path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>',
  body:'<circle cx="12" cy="4.5" r="2"/><path d="M9 21.5v-8H7.5V10A2.5 2.5 0 0 1 10 7.5h4a2.5 2.5 0 0 1 2.5 2.5v3.5H15v8M12 14v7.5"/>',
  habits:'<path d="M3 12.5h3.5l2.2-5 4.3 10 2.2-5H21"/>',
  all:'<g class="fig">'+FIG_UP+FIG_LO+'</g>',
  upper:'<g class="fig">'+FIG_UP+'<g class="seg-dim">'+FIG_LO+'</g></g>',
  lower:'<g class="fig"><g class="seg-dim">'+FIG_UP+'</g>'+FIG_LO+'</g>'};
function anything(){
  if(S.sessions.length||weighIns().length||measurements().length)return true;
  for(var d in S.days)if(S.days[d]&&S.days[d].meals)
    for(var m in S.days[d].meals)if((S.days[d].meals[m].items||[]).length)return true;
  return false;}

/* An empty state with its drawing, in place of the small icon. */
function artEmpty(name,title,line,cta){
  return '<div class="empty artempty">'+art(name,{cls:"empty-art"})+'<h3>'+esc(title)+'</h3>'
   +(line?'<p class="tiny">'+esc(line)+'</p>':'')+(cta?'<div class="empty-a">'+cta+'</div>':'')+'</div>';}

/* ---- History: every workout, a month at a time --------------------------------
   Reached from Recent workouts → See all. The month is a calendar with a dot on each
   day something was trained; a day opens its details, a workout opens to be edited. */
function vHistory(){
  ensureSessionIds();
  var base=new Date();base.setDate(1);base.setMonth(base.getMonth()+(+V.hmonth||0));
  var y=base.getFullYear(),m=base.getMonth(),mo=y+"-"+String(m+1).padStart(2,"0");
  var list=S.sessions.filter(function(s){return s.date.slice(0,7)===mo;});
  var on={};list.forEach(function(s){on[s.date]=1;});
  var first=((new Date(y,m,1).getDay()||7)-weekStart()+7)%7,days=new Date(y,m+1,0).getDate(),now=today();
  var h='<div class="dhead">'+backArrow()+'<h1 class="dhead-t">'+esc(t("History"))+'</h1></div>'
   +'<p class="dsub">'+esc(S.sessions.length+" "+t(S.sessions.length===1?"workout":"workouts"))+'</p>';
  h+='<div class="dbcal phcal"><div class="dbcal-h">'
   +'<button class="dnav-arrow sm" data-hmonth="-1" aria-label="'+esc(t("Previous month"))+'">‹</button>'
   +'<strong aria-live="polite">'+esc(dfmt(base,{month:"long",year:"numeric"}))+'</strong>'
   +'<button class="dnav-arrow sm" data-hmonth="1" aria-label="'+esc(t("Next month"))+'"'+((+V.hmonth||0)>=0?' disabled':'')+'>›</button></div>'
   +'<div class="dbgrid">'+weekOrder().map(function(n){return '<div class="dbwk" aria-hidden="true">'
      +esc(dfmt(new Date(2024,0,n),{weekday:"narrow"}))+'</div>';}).join("");
  for(var i=0;i<first;i++)h+='<div></div>';
  for(var d=1;d<=days;d++){
    var iso=mo+"-"+String(d).padStart(2,"0");
    h+='<button class="dbday'+(on[iso]?' trained':'')+(iso===now?' today':'')+'" data-openday="'+iso+'"'+(iso>now?' disabled':'')
     +' aria-label="'+esc(pretty(iso)+(on[iso]?", "+t("trained"):""))+'">'+d
     +(on[iso]?'<span class="dbdot t" aria-hidden="true"></span>':'')+'</button>';}
  h+='</div></div>';
  if(!list.length)return h+artEmpty("calendar",t("No workouts this month"),t("Train and each session lands on its day here."),"");
  h+=lbl(t("Workouts"),'<span class="pgaside">'+list.length+'</span>');
  list.forEach(function(s){
    var n=s.entries.filter(function(e){return (e.sets||[]).length;}).length;
    var mins=s.activeMs>0?Math.round(s.activeMs/60000):null;
    h+='<button class="pgrow" data-sessedit="'+esc(s.id)+'" aria-label="'+esc(t("Edit workout")+": "+(planName(s.dayName)||t("Workout")))+'"><span class="pgrow-t">'
     +'<span class="pgrow-n"><span>'+esc(planName(s.dayName)||t("Workout"))+'</span></span>'
     +'<span class="pgrow-s">'+(mins!=null?mins+' '+esc(t("min"))+' · ':'')+n+' '+esc(t(n===1?"exercise":"exercises"))+'</span></span>'
     +'<span class="pgrow-e">'+esc(shortd(s.date))+'</span>'
     +'<span class="ico ico-chev" aria-hidden="true"></span></button>';});
  return h;}

function vProgress(){
  if(V.phist)return vHistory();
  var h='<div class="thead"><div><h1 class="thead-ic"><svg viewBox="0 0 22 22" aria-hidden="true" focusable="false">'
   +'<path d="M3.5 19V13.5h4V19zM9 19V8.5h4V19zM14.5 19V3h4v16z"/></svg>'+t("Progress")+'</h1>'
   +'<p class="thead-s">'+t("Track. Improve. Get stronger.")+'</p></div></div>';
  /* A wall of zeroes tells a new user nothing. Show the two things that start
     filling this screen instead. */
  if(!anything())
    return h+artEmpty("mane",t("Nothing to chart yet"),
      t("Finish one workout or log your weight, and volume, records, streaks and trends all start here."),
      '<button class="btn" data-go="train">'+t("Start a workout")+'</button>'
      +'<button class="btn g" data-sheet="weigh">'+t("Log weight")+'</button>');
  var tab=ptabNow();
  /* psecs: the tabs a swipe moves between (js/ui/exswipe.js), as on the plan pages. */
  /* Words alone: four with their icons did not fit a phone's width (each was cut short). */
  h+=seg({items:TABS.map(function(x){return [x[0],t(x[1])];}),value:tab,attr:"ptab",row:true,
    tabs:true,cls:"pgtabs2 psecs",label:t("Progress views"),key:"pgtabs"});
  var r=range();
  /* The range drives every chart and every figure that says "past …" on every view;
     a card about this week or all time says so in its own heading. */
  var rg=seg({items:RANGES.map(function(x){return [x[0],t(x[1]),t(PAST[x[0]])];}),value:r,attr:"range",
    cls:"pgrange",label:t("Time range"),key:"pgrange"});
  h+=tab==="strength"&&topLifts().length?'<div class="pgfilt">'+rg+halfSeg()+'</div>':rg;
  h+='<div class="psec" data-pswipe="ptab" data-k="psec-'+tab+'">'+ptabBody(tab,r)+'</div>';
  return h;}
function ptabNow(){return ["strength","body","habits"].indexOf(V.ptab)>=0?V.ptab:"overview";}
function ptabBody(tab,r){
  return tab==="strength"?vStrength(r):tab==="body"?vBody(r):tab==="habits"?vHabits(r):vOverview(r);}

/* ---- shared drawing --------------------------------------------------------------- */
/* Small inline icons, on the dock's 24 grid and stroke. */
var KI={
  weight:'<path d="M5 20h14a1 1 0 0 0 1-1.1l-1.4-10A2 2 0 0 0 16.6 7H7.4a2 2 0 0 0-2 1.9L4 18.9A1 1 0 0 0 5 20z"/><path d="M12 7V4.5M9.5 12.5 12 10"/>',
  strength:'<path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>',
  cons:'<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4M9 15l2 2 4-4"/>',
  ruler:'<path d="M3.5 16.5 16.5 3.5l4 4-13 13z"/><path d="M7 13l1.5 1.5M9.5 10.5l2 2M12 8l1.5 1.5M14.5 5.5l2 2"/>',
  medal:'<path d="M8 3h8l-2 6h-4z"/><circle cx="12" cy="15" r="5.5"/><path d="M12 12.5l.9 1.8 2 .3-1.4 1.4.3 2-1.8-.9-1.8.9.3-2-1.4-1.4 2-.3z"/>',
  sets:'<path d="M4 6h16M4 12h16M4 18h10"/>',
  flame:'<path d="M12 21a6 6 0 0 0 6-6c0-3.8-2.6-5.6-4-9.5-1.9 1.6-2.4 3.5-2.2 5.3C10.6 9.8 9.6 8.6 9.3 7 7.3 8.8 6 11.4 6 15a6 6 0 0 0 6 6z"/>'};
function kicon(k){return '<span class="pgki" aria-hidden="true"><svg viewBox="0 0 24 24">'+KI[k]+'</svg></span>';}
/* A sparkline for a row: no axes, no dots, just the shape. Coloured when the shape is
   progress, plain when it is not, as the deltas are. */
function spark(vals,good){
  if(vals.length<2)return '';
  var W=100,H=28,mn=Math.min.apply(null,vals),mx=Math.max.apply(null,vals);
  if(mx===mn){mx+=1;mn-=1;}
  var d=vals.map(function(v,i){return (i?"L":"M")+r1(i*W/(vals.length-1))+" "+r1(3+(H-6)*(1-(v-mn)/(mx-mn)));}).join(" ");
  return '<svg class="pgspark'+(good?' ok':'')+'" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" aria-hidden="true">'
   +'<path d="'+d+'"/></svg>';}
/* A figure that counts to its value as it appears or changes (render.js, data-count-to);
   dp: its decimals. */
function cnt(v,dp){return '<b class="num pgcnt" data-count-to="'+v+'"'+(dp?' data-count-dp="'+dp+'"':'')+'>'+(dp?Number(v).toFixed(dp):fmtN(v))+'</b>';}
/* An estimated max as the method can stand behind it: to the half kilo (or pound), and
   called an estimate. Epley's spread at 5–12 reps is several per cent. */
function est(kg){return Math.round(toDisp(kg)*2)/2;}
/* The scale's weekly rate, signed. */
function sgn(kg){return (kg>0.004?"+":kg<-0.004?"−":"±")+toDisp(Math.abs(kg));}
function perWk(){return wUnit()+" / "+t("week");}

/* ---- Overview: is the goal moving, this week, the range's highlights ------------- */
var STATUS={ok:"On track",slow:"Slower than planned",fast:"Faster than planned",wrong:"Going the other way",down:"Drifting down",up:"Drifting up"};
function heroCard(r){
  var tr=weightTrend(),wc=weightChange(),sw=smoothWeights(r);
  var h='<div class="pghero'+(tr?' '+tr.status:'')+'"><div class="pghero-h"><span class="pghero-k">'+esc(t("Is it working?"))+'</span>'
   +(tr?'<span class="pgchip '+tr.status+'">'+esc(t(STATUS[tr.status]||""))+'</span>':'')+'</div>';
  if(!tr){
    /* Until there is a trend, the change since a weigh-in a week or more before, said as Body says it. */
    h+=(wc?'<div class="pgbig w">'+cnt(toDisp(wc.cur.weight),1)+'<span>'+esc(wUnit())+'</span></div>'
      +(wc.ref?'<div class="pgsub"><span class="pgd">'+esc(sgn(wc.cur.weight-wc.ref.weight)+" "+wUnit()+" "+inDays(wc.days))+'</span></div>':''):'')
     +'<p class="pgnote">'+esc(t("Weigh in a few times over two weeks and this says whether you are on track for your goal."))+'</p>'
     +'<button class="btn g" data-sheet="weigh">'+esc(t("Log weight"))+'</button></div>';
    return h;}
  var key=tr.kind;
  h+='<div class="pghero-r"><div><div class="pgbig">'+esc(sgn(tr.perWk))+'<span>'+esc(perWk())+'</span></div>'
   +'<div class="pgsub">'+esc(t("Trend over the last {n} weeks").replace("{n}",tr.weeks))+'</div></div>'
   +'<div class="pgtrend-g"><div class="pgstat-k">'+esc(t("Goal"))+'</div><b>'
   +esc(key==="hold"?"±"+toDisp(Math.abs(tr.hi)):sgn(key==="lose"?tr.hi:tr.lo)+" "+t("to")+" "+sgn(key==="lose"?tr.lo:tr.hi))+'</b><small>'+esc(perWk())+'</small></div></div>';
  if(sw.length>=2)h+=lineChart(sw.map(function(p){return {d:p.d,v:toDisp(p.v)};}),{key:"hero"+r,raw:sw.map(function(p){return toDisp(p.raw);}),
    fmt:function(v){return t("Trend")+" "+v+" "+wUnit();},rawFmt:function(v){return t("Weighed")+" "+v;},
    aria:t("Body weight trend")+", "+toDisp(sw[0].v)+" → "+toDisp(sw[sw.length-1].v)+" "+wUnit()});
  h+='<p class="pgnote">'+esc(t(trendSays(tr)))+'</p>'+adjustBtn(tr)
   +'<button class="pglink pghero-go" data-ptab="body">'+esc(t("Body details"))+' <span class="ico ico-chev" aria-hidden="true"></span></button></div>';
  return h;}
/* This week against the plan's training days, and how many weeks in a row were kept. */
function weekCard(){
  var wr=weekRun(),now=today(),days={};S.sessions.forEach(function(s){days[s.date]=1;});
  var cells=weekDates(now).map(function(iso){
    var on=!!days[iso],cls=on?' on':iso===now?' now':iso>now?' ahead':'';
    return '<span class="pgwk-d'+cls+'"><i>'+(on?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>':'')+'</i>'
     +'<small>'+esc(wdName(isoWeekday(iso)).slice(0,S.prefs&&S.prefs.lang==="ar"?3:2))+'</small></span>';}).join("");
  return '<div class="pgcard pgwk"><div class="pgcard-h"><h3 class="pgcard-i">'+kicon("cons")+esc(t("This week"))+'</h3>'
   +'<span class="pgcard-r"><b class="num">'+wr.now+'/'+wr.need+'</b><small>'+esc(t("workouts"))+'</small></span></div>'
   +'<div class="pgwk-r" aria-label="'+esc(t("{n} of {m} workouts this week").replace("{n}",wr.now).replace("{m}",wr.need))+'">'+cells+'</div>'
   +'<div class="pgwk-s'+(wr.weeks?' ok':'')+'">'+kicon("flame")+'<span>'
   +esc(wr.weeks?t(wr.weeks===1?"1 week kept":"{n} weeks in a row kept").replace("{n}",wr.weeks)
     :t("Keep {n} workouts this week to start a streak.").replace("{n}",wr.need))+'</span></div></div>';}
/* What moved in the range, said in words, one line each, only where there is a figure. */
function highlights(r){
  var o=overview(r),rows=[];
  rows.push({i:"cons",k:t("Workouts"),v:'<b class="num">'+o.n+'</b>',d:o.compare?delta(o.n-o.pn,false,1,"",t(VS[r])):""});
  /* The lift that moved most, by its estimate; or the most reps gained on one scored by reps. */
  var bp=null,br=null;
  topLifts().slice(0,6).forEach(function(L){
    if(repsOnly(L.name,r)){var rs=repsSeries(L.name,r);if(rs.length>=2){var dr=rs[rs.length-1].v-rs[0].v;if(!br||dr>br.reps)br={name:L.name,reps:dr};}return;}
    var lp=liftProgress(L.name,r);if(lp.pct!=null&&(!bp||lp.pct>bp.pct))bp={name:L.name,pct:lp.pct};});
  var best=bp||br;
  if(best)rows.push({i:"strength",k:exName(best.name),
    v:best.pct!=null?'<b class="num">'+(best.pct>0?"+":best.pct<0?"−":"±")+Math.abs(Math.round(best.pct))+'%</b>':'<b class="num">'+(best.reps>0?"+":"")+best.reps+'</b>',
    d:'<span class="pgd">'+esc(best.pct!=null?t("estimated max"):t("reps"))+'</span>'});
  var w=win(r),recs=topLifts().filter(function(L){return L.date&&L.date>=w.from;}).length;
  if(recs)rows.push({i:"medal",k:t("Records"),v:'<b class="num">'+recs+'</b>',d:'<span class="pgd">'+esc(t(recs===1?"lift at its best":"lifts at their best"))+'</span>'});
  var ws=(S.body||[]).filter(function(b){return num(b.waist)>0&&b.date>=w.from;});
  if(ws.length>=2){var dw=r1(num(ws[ws.length-1].waist)-num(ws[0].waist));
    rows.push({i:"ruler",k:t("Waist"),v:'<b class="num">'+(dw>0?"+":dw<0?"−":"±")+Math.abs(dw)+'</b><small>'+esc(t("cm"))+'</small>',d:""});}
  var sets=0;S.sessions.forEach(function(s){if(s.date>=w.from)s.entries.forEach(function(e){(e.sets||[]).forEach(function(x){if(!x.wu&&(num(x.r)>0||num(x.w)>0))sets++;});});});
  if(sets)rows.push({i:"sets",k:t("Hard sets a week"),v:'<b class="num">'+Math.round(sets/Math.max(1,r/7))+'</b>',d:'<span class="pgd">'+esc(t("on average"))+'</span>'});
  return lbl(t("Highlights"),'<span class="pgaside">'+esc(t(PAST[r]))+'</span>')
   +'<div class="pgcard pghl">'+rows.map(function(x){
     return '<div class="pghl-r">'+kicon(x.i)+'<span class="pghl-k">'+esc(x.k)+'</span><span class="pghl-v">'+x.v+'</span>'+(x.d?'<span class="pghl-d">'+x.d+'</span>':'')+'</div>';}).join("")+'</div>';}
function win(r){var n=today(),f=new Date(n+"T00:00:00Z");f.setUTCDate(f.getUTCDate()-(r-1));return {from:f.toISOString().slice(0,10),to:n};}

/* Milestones, drawn as eight-pointed stars (the khatam of the old geometric patterns),
   the newest earned and the next one to reach. */
function star8(cls,label,sub){
  var pts=[],R=27,ri=20.5;
  for(var i=0;i<16;i++){var a=Math.PI/8*i-Math.PI/2,rr=i%2?ri:R;pts.push(r1(30+rr*Math.cos(a))+","+r1(30+rr*Math.sin(a)));}
  return '<svg class="pgms-s '+cls+'" viewBox="0 0 60 60" aria-hidden="true"><polygon points="'+pts.join(" ")+'"/>'
   +'<circle cx="30" cy="30" r="15.5"/><text x="30" y="'+(sub?29:34)+'" text-anchor="middle">'+esc(label)+'</text>'
   +(sub?'<text class="pgms-u" x="30" y="39" text-anchor="middle">'+esc(sub)+'</text>':'')+'</svg>';}
function msWords(m){
  return m.kind==="work"?t(m.n===1?"First workout":"{n} workouts").replace("{n}",m.n)
    :m.kind==="load"?t("First {w} set").replace("{w}",fmtW(m.n))
    :t("{w} toward your goal").replace("{w}",fmtW(m.n));}
function milestoneCard(){
  var lean={lose:-1,gain:1}[rateOf((S.profile||{}).goal)[0]]||0,ms=milestones(lean);
  if(!ms.earned.length&&!ms.next)return "";
  var seen=(S.prefs||{}).msSeen||0,got=ms.earned.slice(-3).reverse();
  var h=lbl(t("Milestones"));
  h+='<div class="pgcard pgms">'+got.map(function(m,i){
    var fresh=ms.earned.length>seen&&i===0;
    return '<div class="pgms-c'+(fresh?' fresh':'')+'">'+star8("on",m.kind==="work"?String(m.n):String(Math.round(toDisp(m.n))),m.kind==="work"?"":wUnit())
     +'<b>'+esc(msWords(m))+'</b><small>'+esc(dateStr(m.d))+'</small></div>';}).join("")
   +(ms.next?'<div class="pgms-c next">'+star8("off",String(ms.next.n),"")
     +'<b>'+esc(msWords(ms.next))+'</b><small>'+esc(t("{n} to go").replace("{n}",ms.next.left))+'</small></div>':'')
   +'</div>';
  /* Seen once it has been shown, so a new one shines the first time only. */
  if(ms.earned.length>seen&&S.prefs){S.prefs.msSeen=ms.earned.length;}
  return h;}
/* The month in one card: this month so far, or last month in its first week. */
function recapMonth(){var n=today(),d=new Date(n+"T00:00:00");if(d.getDate()<=7){d.setDate(0);}return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");}
function monthName(mo){return dfmt(new Date(mo+"-01T00:00:00"),{month:"long"});}
function recapCard(){
  var mo=recapMonth(),rc=monthRecap(mo);
  if(!rc.workouts&&!rc.weight)return "";
  return '<button class="pgrecap" data-recap="'+mo+'">'+art("star",{cls:"pgrecap-art",still:true})
   +'<span class="pgrecap-t"><b>'+esc(t("Your {m}").replace("{m}",monthName(mo)))+'</b>'
   +'<span>'+esc(t("{n} workouts").replace("{n}",rc.workouts)+(rc.prs?" · "+t(rc.prs===1?"1 record":"{n} records").replace("{n}",rc.prs):"")+" · "+t("See your month"))+'</span></span>'
   +'<span class="ico ico-chev" aria-hidden="true"></span></button>';}

function vOverview(r){
  var h=heroCard(r)+weekCard()+highlights(r)+milestoneCard()+recapCard();
  ensureSessionIds();
  var recent=S.sessions.slice(0,3);
  if(recent.length){
    h+=lbl(t("Recent workouts"),'<button class="pglink" data-phist="1">'+esc(t("See all"))+'</button>');
    recent.forEach(function(s){
      var n=s.entries.filter(function(e){return (e.sets||[]).length;}).length;
      var mins=s.activeMs>0?Math.round(s.activeMs/60000):null;
      h+='<button class="pgrow" data-sessedit="'+esc(s.id)+'" aria-label="'+esc(t("Edit workout")+": "+(planName(s.dayName)||t("Workout")))+'"><span class="pgrow-t">'
       +'<span class="pgrow-n"><span>'+esc(planName(s.dayName)||t("Workout"))+'</span></span>'
       +'<span class="pgrow-s">'+(mins!=null?mins+' '+esc(t("min"))+' · ':'')
       +n+' '+esc(t(n===1?"exercise":"exercises"))+'</span></span>'
       +'<span class="pgrow-e">'+esc(ago(s.date))+'</span>'
       +'<span class="ico ico-chev" aria-hidden="true"></span></button>';});}
  return h;}

/* ---- Strength: the lifts, each opening its own page; the muscles this week -------- */
function oplCard(){
  var st=standingNow(),ok=(st.lifts||[]).filter(function(x){return x.kind==="ok";});
  /* All three judged lifts, trained lately: otherwise a percentile of one lift reads as a verdict on the person. */
  if(ok.length<3)return "";
  var h=lbl(t("Among powerlifters"),'<span class="pgaside">'+esc(t("raw · {c} kg class").replace("{c}",ok[0].cls))+'</span>');
  h+='<div class="pgcard pgshare pgopl">'+ok.map(function(x){
    var name=t(OPL_NAME[x.lift]),shown=x.edge==="below"?"<10":x.edge==="above"?">90":String(x.pct);
    var say=x.edge==="below"?t("{lift}: ahead of fewer than 10 in 100"):x.edge==="above"?t("{lift}: ahead of more than 90 in 100")
      :t("{lift}: ahead of about {n} in 100");
    return '<div class="pgshare-r" aria-label="'+esc(say.replace("{lift}",name).replace("{n}",x.pct))+'">'
     +'<span>'+esc(name)+'</span>'
     +'<div class="bar" aria-hidden="true"><i style="width:'+Math.max(2,Math.min(100,x.pct))+'%"></i></div>'
     +'<b class="num"><bdi dir="ltr">'+esc(shown)+'</bdi></b></div>';}).join("")
   +'<p class="pgnote">'+esc(t("How many in 100 raw powerlifting competitors in your class you are ahead of: people who train for these three lifts and enter meets. Anywhere on this scale is strong."))+'</p>'
   +'<p class="pgnote">'+esc(t("From your best estimated max in the last 12 weeks: {list}. A meet lift is a judged single, so take this as a rough guide.")
      .replace("{list}",ok.map(function(x){return t(OPL_NAME[x.lift])+" "+fmtW(x.kg);}).join(S.prefs.lang==="ar"?"، ":", ")))
   +' '+esc(t("Data: OpenPowerlifting."))+'</p></div>';
  return h;}
/* All / Upper / Lower, the frame's filter (drawn beside the range by vProgress). */
function halfSeg(){
  return seg({items:[["all",t("All"),t("Whole body"),SEGI.all],["upper",t("Upper"),t("Upper body"),SEGI.upper],
    ["lower",t("Lower"),t("Lower body"),SEGI.lower]],value:V.phalf||"all",attr:"phalf",bare:true,
    cls:"pghalf",label:t("Body part"),key:"pghalf"});}
/* A lift's figure for the range: its estimated max, or its best reps where it moves the
   body unloaded. {now, unit, pct or reps change, series} */
function liftFig(name,r){
  if(repsOnly(name,r)){var rs=repsSeries(name,r),all=repsSeries(name,0);
    return {reps:true,now:all.length?all[all.length-1].v:0,dv:rs.length>=2?rs[rs.length-1].v-rs[0].v:null,series:rs};}
  var lp=liftProgress(name,r),full=e1rmSeries(name,0);
  return {reps:false,now:full.length?full[full.length-1].v:0,pct:lp.pct,series:lp.series};}
function vStrength(r){
  var all=topLifts();
  if(!all.length)return artEmpty("barbell",t("No strength history"),
    t("Log the same lift twice and Bunyan starts plotting your estimated one-rep max."),
    '<button class="btn" data-go="train">'+t("Start a workout")+'</button>');
  var half=V.phalf||"all";
  var lifts=half==="all"?all:all.filter(function(L){return liftHalf(L.name)===half;});
  var h="";
  if(!lifts.length)return h+tooFew(t("Nothing logged for this half of the body yet."));
  /* One line on the whole: the most-trained lifts' estimates across the range. */
  var si=strengthIndex(r);
  if(si.pct!=null){var up=si.pct>=0.5,down=si.pct<=-0.5;
    h+='<p class="pgsay'+(up?' ok':'')+'">'+esc(up?t("Your top lifts are up {n}% across this range.").replace("{n}",Math.round(si.pct))
      :down?t("Your top lifts are down {n}% across this range. A lighter week can be the point.").replace("{n}",Math.abs(Math.round(si.pct)))
      :t("Your top lifts are holding steady across this range."))+'</p>';}
  /* ---- every lift once: its figure, its shape, how far it moved; a tap opens its page */
  var shown=V.pall?lifts:lifts.slice(0,6);
  h+=lbl(t("Your lifts"),'<span class="pgaside">'+esc(t(PAST[r]))+'</span>');
  h+='<div class="pglifts">'+shown.map(function(L){
    var f=liftFig(L.name,r),pr=L.date&&L.date>=win(r).from;
    var val=f.reps?f.now+'<small>'+esc(t("reps"))+'</small>':(f.now?'≈'+est(f.now)+'<small>'+esc(wUnit())+'</small>':'—');
    var chg=f.reps?(f.dv!=null?(f.dv>0?"+":f.dv<0?"\u2212":"\u00b1")+Math.abs(f.dv):"—"):(f.pct!=null?(f.pct>0?"+":f.pct<0?"−":"±")+Math.abs(Math.round(f.pct))+"%":"—");
    var good=f.reps?f.dv>0:f.pct>0;
    return '<button class="pgex" data-lift="'+esc(L.name)+'" aria-label="'+esc(exName(L.name)+", "+(f.reps?f.now+" "+t("reps"):t("estimated max")+" "+est(f.now)+" "+wUnit())+", "+chg)+'">'
     +thumb(L.name,52)
     +'<span class="pgex-t"><span class="pgex-n">'+esc(exName(L.name))+'</span>'
     +'<span class="pgex-s">'+val+' <i>'+esc(f.reps?t("best"):t("estimated max"))+'</i>'+(pr?' <b class="pgbadge">'+esc(t("PR"))+'</b>':'')+'</span></span>'
     +spark(f.series.map(function(p){return p.v;}),good)
     +'<span class="pgex-p'+(good?' ok':'')+'">'+esc(chg)+'</span>'
     +'<span class="ico ico-chev" aria-hidden="true"></span></button>';}).join("")+'</div>';
  if(lifts.length>6)h+='<button class="btn g" data-pall="1">'+esc(V.pall?t("Show fewer"):t("Show all")+" "+lifts.length)+'</button>';

  /* ---- the muscles: this week on the body and in numbers, beside the range's weekly average */
  var wv=weeklyVolume(),avg=weeklySetsAvg(r);
  h+=lbl(t("Sets per muscle"),'<span class="pgaside">'+esc(t("this week · target"))+' '+wv.target+'</span>');
  var wlit={};wv.rows.forEach(function(x){wlit[x.g]=Math.min(1,x.sets/wv.target);});
  h+='<div class="pgcard pgshare">'
   +'<div class="pgbody">'+bodySvg(wlit,"","wkmap")
   +'<div class="pgbody-k" aria-hidden="true"><span>0</span><i></i><span>'+wv.target+' '+esc(t("sets"))+'</span></div></div>'
   +'<div class="pgshare-h" aria-hidden="true"><span></span><span>'+esc(t("Now"))+'</span><span>'+esc(t("Avg"))+'</span></div>'
   +wv.rows.map(function(x){
    var pct=Math.min(100,x.sets/wv.target*100),cls=x.sets>=wv.target?' ok':x.sets>=wv.target/2?'':' low',a=avg[x.g]||0;
    return '<div class="pgshare-r wv'+cls+'" aria-label="'+esc(t(x.g)+": "+x.sets+" "+t("of")+" "+wv.target+" "+t("sets")+", "+a+" "+t("a week, avg"))+'">'
     +'<span>'+esc(t(x.g))+'</span>'
     +'<div class="bar" aria-hidden="true"><i style="width:'+Math.max(2,pct)+'%"></i></div>'
     +'<b>'+x.sets+'</b><em class="num">'+a+'</em></div>';}).join("")
   +'<p class="pgnote">'+esc(t("Around 10–20 hard sets per muscle each week is what most people grow on."))+' '
   +esc(t("From {d} to today.").replace("{d}",wdName(weekStart(),true)))+'</p></div>';
  if(half==="all")h+=oplCard();
  return h;}

/* ---- the weight trend against the goal ------------------------------------------ */
/* The step the trend's advice names, ready to apply: the middle of the book's 100–200
   kcal, on or off carbohydrate, protein and fat unchanged (as the weekly check-in does). */
var ADJ={lose:{slow:-150,fast:150},gain:{slow:150,fast:-150,wrong:200},hold:{down:100,up:-100}};
function adjustBy(tr){return tr&&(ADJ[tr.kind]||{})[tr.status]||0;}
function adjustBtn(tr){
  var by=adjustBy(tr),k=num((S.goals||{}).kcal);
  if(!by||!k)return "";
  return '<button class="btn g pgadj" data-tradj="'+by+'">'+esc(t("Apply: {k} kcal a day").replace("{k}",fmtN(k+by)))+'</button>';}
/* bare: without its own heading, for a screen that heads it in its own style. */
function trendCard(bare){
  var tr=weightTrend();
  if(!tr)return "";
  var key=tr.kind,msg=trendSays(tr);
  var good=tr.status==="ok";
  return (bare?'':lbl(t("Trend against your goal")))
   +'<div class="pgcard pgtrend'+(good?' ok':'')+'"><div class="pgtrend-r"><div><div class="pgstat-k">'
   +esc(t("Last"))+' '+tr.weeks+' '+esc(t(tr.weeks===1?"week":"weeks"))+'</div>'
   +'<div class="pgbig">'+esc(sgn(tr.perWk))+'<span>'+esc(perWk())+'</span></div></div>'
   +'<div class="pgtrend-g"><div class="pgstat-k">'+esc(t("Goal"))+'</div><b>'
   +esc(key==="hold"?"±"+toDisp(Math.abs(tr.hi))
      :sgn(key==="lose"?tr.hi:tr.lo)+" "+t("to")+" "+sgn(key==="lose"?tr.lo:tr.hi))+'</b><small>'+esc(perWk())+'</small></div></div>'
   +'<p class="pgnote">'+esc(t(msg))+'</p>'+adjustBtn(tr)+'</div>';}

/* ---- Body ---------------------------------------------------------------------- */
function vBody(r){
  var h="",wc=weightChange(),tr=weightTrend();
  var tc=trendCard(true);
  h+='<div class="pgcard">';
  if(!wc)h+='<div class="pgstat-k">'+esc(t("Body weight"))+'</div>'+art("body",{cls:"pgbody-art"})
    +tooFew(t("Weigh in and the trend starts here. Mornings, before eating, are the most comparable."));
  else{
    /* One rate everywhere (owner, 5 Nov: three different changes on one screen): the
       trend's, per week; until there is one, the change since the weigh-in a week or more before. */
    h+='<div class="pgwhead"><div><div class="pgstat-k">'+esc(t("Body weight"))+'</div>'
     +'<div class="pgbig w">'+cnt(toDisp(wc.cur.weight),1)+'<span>'+esc(wUnit())+'</span></div></div>'
     +'<div class="pgwd">'+(tr?'<span class="pgd">'+esc(sgn(tr.perWk)+" "+perWk())+'</span>'
       :wc.ref?'<span class="pgd">'+esc(sgn(wc.cur.weight-wc.ref.weight)+" "+wUnit()+" "+inDays(wc.days))+'</span>':'')+'</div></div>';
    var sw=smoothWeights(r);
    if(sw.length>=2){
      h+=lineChart(sw.map(function(p){return {d:p.d,v:toDisp(p.v)};}),{key:"body"+r,raw:sw.map(function(p){return toDisp(p.raw);}),
        fmt:function(v){return t("Trend")+" "+v+" "+wUnit();},rawFmt:function(v){return t("Weighed")+" "+v;},
        aria:t("Body weight trend")+", "+toDisp(sw[0].v)+" → "+toDisp(sw[sw.length-1].v)+" "+wUnit()})
       +'<p class="pgnote pglegend"><span class="pglg-l" aria-hidden="true"></span>'+esc(t("Trend"))
       +' <span class="pglg-d" aria-hidden="true"></span>'+esc(t("Weigh-ins"))+'</p>';}
    else h+=tooFew(t("Fewer than two weigh-ins in this range. Pick a longer one, or weigh in again."));}
  h+='<button class="btn g" data-sheet="weigh">'+esc(t("Log weight"))+'</button></div>';
  h+=lbl(t("Is it working?"))+(tc||tooFew(t("Weigh in a few times over two weeks and this says whether the target is working.")));

  var ms=measurements();
  h+=lbl(t("Measurements"),'<button class="pglink" data-sheet="measure">'+esc(t(ms.length?"Update":"Add"))+'</button>');
  if(!ms.length)h+=tooFew(t("Chest, waist, arms and the rest, in centimetres. The change since last time shows beside each."));
  ms.forEach(function(m){
    h+='<div class="pgm"><span>'+esc(t(m.name))+'</span>'
     +'<b>'+r1(m.v).toFixed(1)+' '+esc(t("cm"))+'</b>'
     +'<span class="pgm-d">'+(m.delta?delta(m.delta,true,m.good," "+t("cm")):'')+'</span></div>';});

  var bf=bodyFat(),ibE=bf.src==="entered"?(S.body||[]).filter(function(b){return b.date===bf.date&&b.src==="inbody";})[0]:null;
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
     +'<p class="pgnote">'+esc(ibE?t("From your InBody test")+", "+dateStr(bf.date)+"."
       :bf.src==="entered"?t("The figure you entered")+", "+dateStr(bf.date)+"."
       :t("Estimated from your waist, neck and height (US Navy method), usually within 3–4 points of a lab measurement."))+'</p>';
    if(ibE)h+=[["smm","Skeletal muscle mass",1],["vfl","Visceral fat level"],["ibscore","InBody score"]].filter(function(f){return ibE[f[0]]!=null;})
      .map(function(f){return '<div class="pgm"><span>'+esc(t(f[1]))+'</span><b class="num">'+(f[2]?toDisp(ibE[f[0]])+' '+esc(wUnit()):ibE[f[0]])+'</b><span></span></div>';}).join("");}
  h+='<button class="btn g" data-sheet="inbody">'+esc(t("Add an InBody result"))+'</button></div>';

  var ph=photoList(function(){if(V.tab==="progress"&&V.ptab==="body")render();});
  h+=lbl(t("Progress photos"),ph&&ph.length>=2?'<button class="pglink" data-phcmp="1">'+esc(t("Compare"))+'</button>':'');
  if(ph===false)h+=tooFew(t("This browser will not store photos. Open Bunyan from the home screen or in Safari or Chrome."));
  else if(ph===null)h+='<div class="pgphotos"><div class="skel pgph-sk"></div></div>';
  else{
    var add='<label class="pgaddph'+(ph.length?' sm':'')+'">'
     +'<input type="file" accept="image/*" id="pg_photo" class="pgfile">'
     +'<span class="ico ico-camera" aria-hidden="true"></span><span>'+esc(t("Add photo"))+'</span></label>';
    if(!ph.length)h+=add;
    else h+='<div class="pgphotos">'+add+ph.map(function(p){
      return '<button class="pgph" data-photo="'+esc(p.id)+'" aria-label="'+esc(t("Progress photo")+", "+dateStr(p.d))+'">'
       +'<img src="'+p.url+'" alt="" width="'+(p.w||300)+'" height="'+(p.h||400)+'" decoding="async">'
       +'<span>'+esc(dateStr(p.d))+'</span></button>';}).join("")+'</div>';
    h+='<p class="pgnote">'+esc(t("Kept on this phone only. Backups do not include photos."))+'</p>';}
  return h;}

/* ---- Habits: eating, steps and cardio, which feed the rest ------------------------ */
function pace(minPerKm){var m=Math.floor(minPerKm),s=Math.round((minPerKm-m)*60);if(s===60){m++;s=0;}return m+":"+String(s).padStart(2,"0");}
function vHabits(r){
  var h=vNutrition(r,t("How you have been eating"));
  /* Steps, on the days they were logged, against the goal. */
  var g=S.goals||{},st=steps(r);
  h+=lbl(t("Steps"),'<span class="pgaside">'+esc(t(PAST[r]))+'</span>');
  h+='<div class="pgcard"><div class="pgcard-h"><h3>'+esc(t("Daily average"))+'</h3>'
   +'<span class="pgcard-r"><b class="num">'+(st.days.length?fmtN(st.avg):"—")+'</b>'+(g.steps?'<small>'+esc(t("of"))+' '+fmtN(g.steps)+'</small>':'')+'</span></div>'
   +(st.days.length>=2?lineChart(st.days,{key:"steps"+r,ref:g.steps||null,fmt:function(v){return fmtN(v)+" "+t("steps");},
       aria:t("Steps")+", "+t("Daily average")+" "+fmtN(st.avg)})
     :tooFew(t("Log your steps on Food's day and the trend draws here.")))+'</div>';
  /* Cardio and sport: minutes a week against the 150 most guidance names, the distance,
     and the best running pace. */
  var cd=cardio(r);
  h+=lbl(t("Cardio & Sports"),'<span class="pgaside">'+esc(t(PAST[r]))+'</span>');
  h+='<div class="pgcard">';
  if(!cd.min)h+=tooFew(t("Log a run, a ride, a class or a match and it shows here."))+'<button class="btn g" data-actsheet="1">'+esc(t("Log cardio or a sport"))+'</button>';
  else{
    h+='<div class="pgstats3"><div><b class="num">'+fmtN(cd.min)+'</b><small>'+esc(t("min"))+'</small></div>'
     +(cd.km?'<div><b class="num">'+cd.km+'</b><small>km</small></div>':'')
     +(cd.best?'<div><b class="num">'+pace(cd.best.pace)+'</b><small>'+esc(t("best pace /km"))+'</small></div>':'')+'</div>';
    if(cd.weeks.length>=2)h+=capsChart(cd.weeks,{fmt:function(v){return fmtN(v)+" "+t("min");},aria:t("Cardio minutes a week")});
    h+='<p class="pgnote">'+esc(t("Minutes a week. 150 minutes of moderate activity a week is the common health guideline."))+'</p>';}
  h+='</div>';
  return h;}

/* ---- sheets opened from Progress ------------------------------------------------- */
/* One lift's page: its figure, its trend to read with a finger, its records, its sessions. */
function vLiftSheet(name){
  var r=range(),f=liftFig(name,r),L=topLifts().filter(function(x){return x.name===name;})[0]||{};
  var h='<div class="se-top"><span class="se-k">'+esc(t(PAST[r]))+'</span><h2>'+esc(exName(name))+'</h2></div>';
  h+='<div class="pgcard"><div class="pgstat-k">'+esc(f.reps?t("Best reps"):t("Estimated 1RM"))+'</div>'
   +'<div class="pgbig">'+(f.reps?cnt(f.now):'≈'+cnt(est(f.now),est(f.now)%1?1:0))+'<span>'+esc(f.reps?t("reps"):wUnit())+'</span></div>';
  if(f.series.length>=2)h+=lineChart(f.series.map(function(p){return {d:p.d,v:f.reps?p.v:est(p.v)};}),{fill:true,key:"lift"+r+name,
    fmt:function(v){return f.reps?v+" "+t("reps"):"≈"+v+" "+wUnit();},aria:exName(name)});
  else h+=tooFew(t("Log this lift on two days in this range to see the trend."));
  h+=f.reps?'':'<p class="pgnote">'+esc(t("An estimate (Epley), from working sets of 12 reps or fewer."))+'</p>';
  h+='</div>';
  var recs=[];
  if(L.w)recs.push([t("Heaviest set"),fmtW(L.w)+" × "+L.reps,L.date]);
  if(L.br)recs.push([t("Most reps"),L.br+" "+t("reps"),L.bdate]);
  var full=f.reps?[]:e1rmSeries(name,0),bi=null;full.forEach(function(p){if(!bi||p.v>bi.v)bi=p;});
  if(bi)recs.push([t("Best estimate"),"≈"+est(bi.v)+" "+wUnit(),bi.d]);
  if(recs.length)h+=lbl(t("Records"))+'<div class="pgcard">'+recs.map(function(x){
    return '<div class="pgm"><span>'+esc(x[0])+'</span><b class="num">'+esc(x[1])+'</b><span class="pgm-d">'+esc(x[2]?dateStr(x[2]):"")+'</span></div>';}).join("")+'</div>';
  var hist=liftHistory(name,12);
  if(hist.length)h+=lbl(t("Sessions"))+'<div class="pgcard pghist">'+hist.map(function(x){
    return '<div class="pgm"><span>'+esc(dateStr(x.d))+'</span><b class="num">'+esc(x.sets.map(function(s){return (s.w?toDisp(s.w)+"×":"")+s.r;}).join("  "))+'</b><span></span></div>';}).join("")+'</div>';
  return h;}
/* The month, as a card to keep or send. */
function vRecapSheet(mo){
  var rc=monthRecap(mo),h='<div class="se-top"><span class="se-k">'+esc(t("Month in review"))+'</span><h2>'+esc(t("Your {m}").replace("{m}",monthName(mo)))+'</h2></div>';
  h+='<div class="pgrc" id="pgrc">'+art("mane",{cls:"pgrc-art",still:true})
   +'<div class="pgstats3"><div><b class="num">'+rc.workouts+'</b><small>'+esc(t("workouts"))+'</small></div>'
   +'<div><b class="num">'+fmtN(rc.sets)+'</b><small>'+esc(t("hard sets"))+'</small></div>'
   +'<div><b class="num">'+rc.prs+'</b><small>'+esc(t("records"))+'</small></div></div>';
  if(rc.lifts.length)h+='<div class="pgrc-l">'+rc.lifts.map(function(L){
    return '<div class="pgm"><span>'+esc(exName(L.name))+'</span><b class="num">≈'+est(L.from)+' → '+est(L.to)+' '+esc(wUnit())+'</b>'
     +'<span class="pgm-d"><span class="pgd'+(L.pct>0?' ok':'')+'">'+(L.pct>0?"+":L.pct<0?"−":"±")+Math.abs(Math.round(L.pct))+'%</span></span></div>';}).join("")+'</div>';
  var bw=[];
  if(rc.weight)bw.push([t("Weight trend"),toDisp(rc.weight.from)+" → "+toDisp(rc.weight.to)+" "+wUnit()]);
  if(rc.waist)bw.push([t("Waist"),r1(rc.waist.from)+" → "+r1(rc.waist.to)+" "+t("cm")]);
  if(rc.cardio)bw.push([t("Cardio & Sports"),fmtN(rc.cardio)+" "+t("min")+(rc.km?" · "+rc.km+" km":"")]);
  if(bw.length)h+='<div class="pgrc-l">'+bw.map(function(x){return '<div class="pgm"><span>'+esc(x[0])+'</span><b class="num">'+esc(x[1])+'</b><span></span></div>';}).join("")+'</div>';
  h+='</div><div class="cf-acts se-acts"><button class="btn" data-recapsave="'+mo+'">'+esc(t("Save as image"))+'</button></div>';
  return h;}
/* Two photos, one over the other, the slider showing more of one or the other; each
   with its date and the weight on the scale nearest it. */
function nearW(d){var b=null;(S.body||[]).forEach(function(x){if(num(x.weight)>0&&(!b||Math.abs(Date.parse(x.date)-Date.parse(d))<Math.abs(Date.parse(b.date)-Date.parse(d))))b=x;});return b;}
function vPhotoCompare(sd){
  var ph=photoList(function(){if(V.sheet==="phcmp")render();})||[];
  if(ph.length<2)return '<h2>'+esc(t("Compare"))+'</h2>'+tooFew(t("Add two photos to compare them."));
  var byD=ph.slice().sort(function(a,b){return a.d<b.d?-1:1;});
  var a=byD.filter(function(p){return p.id===sd.a;})[0]||byD[0],b=byD.filter(function(p){return p.id===sd.b;})[0]||byD[byD.length-1];
  var opt=function(sel,attr){return '<select class="pgcmp-s" data-'+attr+'="1" aria-label="'+esc(attr==="pca"?t("Before"):t("After"))+'">'+byD.map(function(p){
    return '<option value="'+esc(p.id)+'"'+(p.id===sel.id?' selected':'')+'>'+esc(dateStr(p.d))+'</option>';}).join("")+'</select>';};
  var cap=function(p){var w=nearW(p.d);return esc(dateStr(p.d))+(w?' · '+toDisp(w.weight)+' '+esc(wUnit()):'');};
  return '<div class="se-top"><span class="se-k">'+esc(t("Progress photos"))+'</span><h2>'+esc(t("Compare"))+'</h2></div>'
   +'<div class="pgcmp" id="pgcmp"><img src="'+a.url+'" alt="'+esc(t("Before"))+'"><img class="pgcmp-b" id="pgcmpb" src="'+b.url+'" alt="'+esc(t("After"))+'" style="clip-path:inset(0 0 0 50%)">'
   +'<i class="pgcmp-line" id="pgcmpl" style="left:50%" aria-hidden="true"></i></div>'
   +'<input type="range" id="pgcmpr" class="pgcmp-r" min="0" max="100" value="50" aria-label="'+esc(t("Before and after"))+'">'
   +'<div class="pgcmp-c"><div>'+opt(a,"pca")+'<small>'+cap(a)+'</small></div><div>'+opt(b,"pcb")+'<small>'+cap(b)+'</small></div></div>';}

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

/* head: the section's own name, in place of "Calorie trend", where it opens a section. */
function vNutrition(r,head){
  var g=S.goals||{},n=nutrition(r),h="";
  var tol=Math.round(TOL*100);
  h+=lbl(head||t("Calorie trend"),'<span class="pgaside">'+esc(t("today not counted"))+'</span>');
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

export {adjustBy, ptabBody, ptabNow, trendCard, vLiftSheet, vNutrition, vPhotoCompare, vProgress, vRecapSheet};

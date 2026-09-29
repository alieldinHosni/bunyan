/* Bunyan — progress
   Progress tab: Overview, Strength, Body and Nutrition (the four "Progress —" frames).
   The date bar and month grid live in js/ui/datebar.js, shared with Food.

   The four frames are four screens with a back arrow each. Here they are one screen
   with a segmented control, because they are four views of the same span of time and
   the range chips should not reset when you move between them. Every figure is
   derived from what is logged; nothing on these frames is a stored number. */
import {t} from "../../i18n/dict.js";
import {empty, muscleOfEntry} from "../../data/exercises.js";
import {exName} from "../../i18n/exnames.js";
import {bestE1RM, prFor, sessionVolume} from "../../engine/formulas.js";
import {sumNutrition} from "../../engine/nutrition.js";
import {S} from "../../state.js";
import {fmtW, toDisp, wUnit} from "../../units.js";
import {esc, fmtN, num, r1, shortd, today} from "../../util.js";
import {head, streak, V} from "../view.js";
import {dateBar} from "../datebar.js";

var SECTIONS=[["overview","Overview"],["strength","Strength"],["body","Body"],["nutrition","Nutrition"]];
var RANGES=[["7","1W"],["30","1M"],["90","3M"],["180","6M"],["365","1Y"]];
var DAY=864e5;

/* ============================================================ time */
function isoOf(ms){var d=new Date(ms);return new Date(ms-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);}
function msOf(iso){return new Date(iso+"T00:00:00").getTime();}
function range(){return +(V.range||30);}
/* The current span and the one before it, as inclusive ISO bounds. "This week" is the
   last seven days including today, so the comparison is like for like. */
function spans(){
  var n=range(),end=msOf(today());
  return {from:isoOf(end-(n-1)*DAY),to:today(),
          pfrom:isoOf(end-(2*n-1)*DAY),pto:isoOf(end-n*DAY)};}
function between(iso,a,b){return iso>=a&&iso<=b;}
function rangeName(){
  var n=range();
  return n===7?t("This week"):n===30?t("Last 30 days"):n===90?t("Last 3 months")
    :n===180?t("Last 6 months"):t("Last 12 months");}
/* Short enough to sit on one line under a half-width tile. */
function vsPrev(){
  var n=range();
  return n===7?t("vs last week"):n===30?t("vs last month"):n===365?t("vs last year"):t("vs previous period");}
function ago(iso){
  var d=Math.round((msOf(today())-msOf(iso))/DAY);
  return d<=0?t("Today"):d===1?t("Yesterday"):d<14?d+" "+t("days ago"):shortd(iso);}

/* ============================================================ pieces */
/* Up is not always good: a falling waist is the point of a cut. `good` says which way
   is progress for this figure; null means neither, and the delta is shown plainly. */
function delta(v,unit,good,note){
  if(!isFinite(v)||v===0)return '<div class="pdelta">'+esc(note?t("No change")+" "+note:t("No change"))+'</div>';
  var up=v>0,cls=good==null?"":((up===good)?" ok":"");
  return '<div class="pdelta'+cls+'"><span aria-hidden="true">'+(up?"↑":"↓")+'</span> '
   +(up?"+":"−")+esc(fmtAbs(Math.abs(v))+(unit==="%"?"%":unit?" "+unit:""))+(note?' '+esc(note):'')+'</div>';}
function fmtAbs(v){return v>=1000?fmtN(v):String(r1(v));}

function chips(){
  return '<div class="pchips" role="group" aria-label="'+esc(t("Time range"))+'">'
   +RANGES.map(function(r){
     var on=String(range())===r[0];
     return '<button class="pchip'+(on?" a":"")+'" data-range="'+r[0]+'" aria-pressed="'+on+'">'+r[1]+'</button>';
   }).join("")+'</div>';}

function tabs(cur){
  return '<div class="pseg" role="tablist" aria-label="'+esc(t("Progress"))+'">'
   +SECTIONS.map(function(s){
     var on=s[0]===cur;
     return '<button class="pseg-b'+(on?" a":"")+'" role="tab" id="pt-'+s[0]+'" aria-selected="'+on+'"'
      +' aria-controls="ppanel" tabindex="'+(on?0:-1)+'" data-psec="'+s[0]+'">'+esc(t(s[1]))+'</button>';
   }).join("")+'</div>';}

/* A line chart that reads on its own: faint gridlines, an optional dashed reference
   (a target or an average), and the first, middle and last labels under it. Drawn
   into a fixed viewBox that keeps its aspect ratio, so the points stay round. Null
   values are gaps — a day with nothing logged is not a day at zero. */
function chart(vals,labels,o){
  o=o||{};
  var real=vals.filter(function(v){return v!=null;});
  if(real.length<2)return '<p class="tiny pchart-none">'+esc(o.none||t("Log at least two entries to see a chart."))+'</p>';
  var W=320,H=128,px=6,py=10;
  var mn=Math.min.apply(null,real),mx=Math.max.apply(null,real);
  if(o.ref!=null){mn=Math.min(mn,o.ref);mx=Math.max(mx,o.ref);}
  if(o.zero)mn=Math.min(0,mn);
  if(mx===mn){mx+=1;mn-=1;}
  var pad=(mx-mn)*0.08;mx+=pad;if(!o.zero)mn-=pad;
  function X(i){return r1(px+i*(W-2*px)/Math.max(1,vals.length-1));}
  function Y(v){return r1(py+(H-2*py)*(1-(v-mn)/(mx-mn)));}
  var segs=[],cur=[];
  vals.forEach(function(v,i){if(v==null){if(cur.length)segs.push(cur);cur=[];}else cur.push([X(i),Y(v)]);});
  if(cur.length)segs.push(cur);
  var line=segs.map(function(sg){return sg.map(function(p,i){return (i?"L":"M")+p[0]+" "+p[1];}).join(" ");}).join(" ");
  var g='<line x1="0" x2="'+W+'" y1="'+py+'" y2="'+py+'"/><line x1="0" x2="'+W+'" y1="'+(H/2)+'" y2="'+(H/2)+'"/>'
    +'<line x1="0" x2="'+W+'" y1="'+(H-py)+'" y2="'+(H-py)+'"/>';
  var area="";
  if(o.area&&segs.length===1&&segs[0].length>1){
    var sg=segs[0];
    area='<path d="'+line+' L'+sg[sg.length-1][0]+" "+H+" L"+sg[0][0]+" "+H+' Z" class="pchart-a"/>';}
  var ref=o.ref!=null?'<line class="pchart-r" x1="0" x2="'+W+'" y1="'+Y(o.ref)+'" y2="'+Y(o.ref)+'"/>':"";
  /* Dots on short series; on long ones only where a point stands alone between two
     gaps, since a one-point segment draws no line at all. */
  var many=o.dots===false||real.length>16;
  var dots=vals.map(function(v,i){
    if(v==null)return "";
    var lone=(i===0||vals[i-1]==null)&&(i===vals.length-1||vals[i+1]==null);
    return (!many||lone)?'<circle cx="'+X(i)+'" cy="'+Y(v)+'" r="3.4"/>':"";}).join("");
  var mid=labels[Math.floor((labels.length-1)/2)];
  return '<svg class="pchart" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+esc(o.label||"")+'">'
   +'<g class="pchart-g">'+g+'</g>'+area+ref
   +'<path class="pchart-l" d="'+line+'"/><g class="pchart-d">'+dots+'</g></svg>'
   +'<div class="pchart-x"><span>'+esc(labels[0])+'</span>'
   +(labels.length>2?'<span>'+esc(mid)+'</span>':'')
   +'<span>'+esc(labels[labels.length-1])+'</span></div>';}

/* Buckets for a span: days for a week, weeks up to six months, months for a year.
   A 365-point chart of mostly empty days says nothing; twelve months says a lot. */
function buckets(){
  var n=range(),end=msOf(today()),out=[];
  if(n<=7){for(var i=n-1;i>=0;i--){var iso=isoOf(end-i*DAY);
      out.push({from:iso,to:iso,label:new Date(iso+"T00:00:00").toLocaleDateString(undefined,{weekday:"short"})});}}
  else if(n<=180){var w=Math.ceil(n/7);
    for(var j=w-1;j>=0;j--){var to=end-j*7*DAY,fr=to-6*DAY;
      out.push({from:isoOf(fr),to:isoOf(to),label:shortd(isoOf(fr))});}}
  else{var d=new Date(end);
    for(var k=11;k>=0;k--){var m0=new Date(d.getFullYear(),d.getMonth()-k,1),m1=new Date(d.getFullYear(),d.getMonth()-k+1,0);
      out.push({from:isoOf(m0.getTime()),to:isoOf(m1.getTime()),
        label:m0.toLocaleDateString(undefined,{month:"short"})});}}
  return out;}

function sessionsIn(a,b){return S.sessions.filter(function(x){return between(x.date,a,b);});}
function workSets(e){return (e.sets||[]).filter(function(x){return !x.wu;});}

/* ============================================================ PROGRESS */
function vProgress(){
  var h=head(t("Progress"),t("Witness your ascent"));
  /* A wall of zeroes tells a new user nothing. Show them the two things that start
     filling this screen instead. */
  if(!S.sessions.length&&!S.body.filter(function(b){return b.weight;}).length&&!loggedDays().length)
    return h+empty("chart",t("Nothing to chart yet"),
      t("Finish one workout or log your weight, and volume, records, streaks and trends all start here."),
      '<button class="btn" data-go="train">'+t("Start a workout")+'</button>'
      +'<button class="btn g" data-sheet="weigh">'+t("Log weight")+'</button>');
  var sec=V.psec||"overview";
  h+=tabs(sec)+'<div id="ppanel" role="tabpanel" aria-labelledby="pt-'+sec+'">';
  h+=sec==="strength"?vStrength():sec==="body"?vBody():sec==="nutrition"?vNutrition():vOverview();
  return h+'</div>';}

/* ---------------------------------------------------------- overview */
function vOverview(){
  /* Two controls, two jobs, and they do not fight. The date bar scopes the one card
     that is about a single day; the range chips drive everything else. */
  var h=vDateBar()+vThatDay()+chips();
  var sp=spans(),cur=sessionsIn(sp.from,sp.to),prev=sessionsIn(sp.pfrom,sp.pto);
  var vol=0,pvol=0,mins=0,nm=0;
  cur.forEach(function(x){vol+=sessionVolume(x);if(x.mins){mins+=x.mins;nm++;}});
  prev.forEach(function(x){pvol+=sessionVolume(x);});
  var vs=vsPrev();
  var growth=pvol?Math.round((vol-pvol)/pvol*1000)/10:null;
  h+='<div class="overline">'+esc(rangeName())+'</div><div class="pgrid">'
   +stat(t("Workouts"),fmtN(cur.length),"",delta(cur.length-prev.length,"",true,vs))
   +stat(t("Volume"),bigNum(toDisp(vol)),wUnit(),
      growth==null?'<div class="pdelta">'+esc(vol?t("First period logged"):t("Nothing logged"))+'</div>'
      :delta(growth,"%",true,vs))
   +stat(t("Avg duration"),nm?String(Math.round(mins/nm)):"—",nm?t("min"):"",'')
   +stat(t("Streak"),String(streak()),t(streak()===1?"day":"days"),'')
   +'</div>';

  /* Volume per bucket: the frame's "Training Volume Trends". */
  var bk=buckets();
  var vals=bk.map(function(b){var v=0;sessionsIn(b.from,b.to).forEach(function(x){v+=sessionVolume(x);});return Math.round(toDisp(v));});
  h+='<div class="card pcard"><h3 class="pcard-t">'+t("Training volume")+'</h3>'
   +chart(cur.length?vals:[],bk.map(function(b){return b.label;}),{zero:true,area:true,
     label:t("Training volume")+", "+rangeName()+": "+fmtN(toDisp(vol))+" "+wUnit(),
     none:t("Log a workout in this period to see the trend.")})+'</div>';

  /* Records, newest first: the lifts that moved most recently are the news. */
  var recs=liftNames().map(function(n){var p=prFor(n);return {n:n,p:p};})
    .filter(function(r){return r.p.w&&r.p.date;})
    .sort(function(a,b){return a.p.date<b.p.date?1:-1;});
  h+='<div class="prow-h"><div class="overline">'+t("Personal records")+'</div>'
   +(recs.length>3?'<button class="plink" data-psec="strength">'+t("See all")+'</button>':'')+'</div>';
  if(!recs.length)h+=empty("dumbbell",t("No records yet"),
    t("Your heaviest set on every lift is tracked automatically from the first session."));
  else recs.slice(0,3).forEach(function(r){
    h+='<div class="prow"><div class="prow-m"><div class="prow-n">'+esc(exName(r.n))
     +' <span class="pbadge">PR</span></div>'
     +'<div class="prow-s">'+esc(fmtW(r.p.w)+" × "+r.p.reps+" "+t("reps"))+'</div></div>'
     +'<span class="prow-r">'+esc(shortd(r.p.date))+'</span></div>';});

  h+='<div class="overline">'+t("Recent workouts")+'</div>';
  if(!S.sessions.length)h+=empty("dumbbell",t("No workouts yet"),
    t("Every session you finish is listed here."),
    '<button class="btn" data-go="train">'+t("Start a workout")+'</button>');
  else S.sessions.slice(0,3).forEach(function(x){
    var n=x.entries.filter(function(e){return workSets(e).length;}).length;
    h+='<button class="prow tap" data-openday="'+x.date+'"><div class="prow-m">'
     +'<div class="prow-n">'+esc(x.dayName||t("Workout"))+'</div>'
     +'<div class="prow-s">'+(x.mins?x.mins+' '+t("min")+' · ':'')+n+' '+t("exercises")+'</div></div>'
     +'<span class="prow-r">'+esc(ago(x.date))+'</span><span class="chev">›</span></button>';});
  return h;}

function stat(k,v,unit,sub){
  return '<div class="card pstat"><div class="pstat-k">'+esc(k)+'</div>'
   +'<div class="pstat-v">'+esc(v)+(unit?'<span class="unit">'+esc(unit)+'</span>':'')+'</div>'+sub+'</div>';}
/* 12,840 fits a half-width card; 1,284,000 does not. */
function bigNum(v){return v>=100000?r1(v/1000)+"k":fmtN(v);}
function liftNames(){
  var names=[];
  S.sessions.forEach(function(s){s.entries.forEach(function(e){
    if(workSets(e).length&&names.indexOf(e.name)<0)names.push(e.name);});});
  return names;}

/* ---------------------------------------------------------- strength */
function vStrength(){
  var h=chips(),sp=spans(),names=liftNames();
  if(!names.length)return h+empty("chart",t("No strength history"),
    t("Log the same lift twice and Bunyan starts plotting your estimated one-rep max."),
    '<button class="btn" data-go="train">'+t("Start a workout")+'</button>');
  if(!V.chartEx||names.indexOf(V.chartEx)<0)V.chartEx=names[0];
  h+='<label class="sr" for="chartsel">'+t("Exercise")+'</label>'
   +'<select id="chartsel" class="psel">'+names.map(function(n){
     return '<option value="'+esc(n)+'"'+(n===V.chartEx?" selected":"")+'>'+esc(exName(n))+'</option>';}).join("")+'</select>';

  /* Estimated 1RM, one point per session, oldest first. */
  var pts=[],labs=[];
  S.sessions.slice().reverse().forEach(function(s){
    if(!between(s.date,sp.from,sp.to))return;
    s.entries.forEach(function(e){
      if(e.name!==V.chartEx)return;
      var b=bestE1RM(workSets(e));if(b){pts.push(toDisp(b));labs.push(shortd(s.date));}});});
  var best=prFor(V.chartEx).e;
  h+='<div class="card pcard"><div class="pstat-k">'+t("Estimated 1RM")+'</div>'
   +'<div class="phero accent">'+(pts.length?pts[pts.length-1]:best?toDisp(best):"—")
   +'<span class="unit">'+wUnit()+'</span></div>'
   +(pts.length>1?delta(r1(pts[pts.length-1]-pts[0]),wUnit(),true,t("in this period")):'')
   +chart(pts,labs,{area:true,label:t("Estimated 1RM")+" — "+exName(V.chartEx),
     none:t("Log this lift twice in the period to see the trend.")})
   +'<p class="tiny" style="margin:10px 0 0">'+t("Epley formula. Only sets of 12 reps or fewer count.")+'</p></div>';

  /* Share of working sets by muscle across the span — the frame's volume by group. */
  var bym={},tot=0,lifts={};
  sessionsIn(sp.from,sp.to).forEach(function(s){s.entries.forEach(function(e){
    var ws=workSets(e);if(!ws.length)return;
    var m=muscleOfEntry(e);bym[m]=(bym[m]||0)+ws.length;tot+=ws.length;
    var L=lifts[e.name]||(lifts[e.name]={n:e.name,sets:0,w:0,r:0});
    L.sets+=ws.length;
    ws.forEach(function(x){var w=num(x.w);if(w>L.w||(w===L.w&&num(x.r)>L.r)){L.w=w;L.r=num(x.r);}});});});
  h+='<div class="overline">'+t("Sets by muscle group")+'</div>';
  var keys=Object.keys(bym).sort(function(a,b){return bym[b]-bym[a];});
  if(!keys.length)h+=empty("dumbbell",t("No sets in this period"),t("Pick a longer range, or log a session."));
  else{h+='<div class="card pcard pbars">';
    keys.forEach(function(m){var p=Math.round(bym[m]/tot*100);
      h+='<div class="pbar" aria-label="'+esc(t(m)+": "+bym[m]+" "+t("sets")+", "+p+"%")+'" role="img">'
       +'<span class="pbar-k">'+esc(t(m))+'</span>'
       +'<span class="pbar-t"><i style="width:'+Math.max(2,bym[m]/bym[keys[0]]*100)+'%"></i></span>'
       +'<span class="pbar-v">'+p+'%</span></div>';});
    h+='<p class="tiny" style="margin:6px 0 0">'+tot+' '+t("working sets")+' · '+esc(rangeName())+'</p></div>';}

  var top=Object.keys(lifts).map(function(k){return lifts[k];})
    .sort(function(a,b){return b.sets-a.sets;}).slice(0,5);
  if(top.length){
    h+='<div class="overline">'+t("Top lifts")+'</div>';
    top.forEach(function(L){
      h+='<div class="prow"><div class="prow-m"><div class="prow-n">'+esc(exName(L.n))+'</div>'
       +'<div class="prow-s">'+L.sets+' '+t("total sets")+'</div></div>'
       +'<span class="prow-b">'+(L.w?esc(fmtW(L.w)+" × "+L.r):esc(L.r+" "+t("reps")))+'</span></div>';});}

  h+='<div class="overline">'+t("All personal records")+'</div><div class="list">';
  names.forEach(function(n){var p=prFor(n);
    h+='<div class="item"><div style="min-width:0"><div style="font-weight:600">'+esc(exName(n))+'</div>'
     +'<div class="tiny">'+(p.w?esc(fmtW(p.w)+" × "+p.reps):"—")
     +(p.e?' · '+t("best 1RM")+' '+toDisp(p.e):'')
     +(p.date?' · '+esc(shortd(p.date)):'')+'</div></div></div>';});
  return h+'</div>';}

/* ---------------------------------------------------------- body */
var MEAS=[["Chest","chest",true],["Waist","waist",false],["Hips","hips",null],["Arms","arms",true],
          ["Thighs","thighs",true],["Calves","calves",true],["Neck","neck",null]];
function vBody(){
  var h=chips(),sp=spans(),goal=S.profile&&S.profile.goal;
  /* Which way is progress for the scale depends on the goal. Maintenance and
     recomposition have no "good" direction for weight alone. */
  var down=goal==="lose"?true:goal==="gain"?false:null;
  var bw=S.body.filter(function(b){return b.weight;});
  var last=bw[bw.length-1];
  h+='<div class="card pcard"><div class="row" style="align-items:flex-start">'
   +'<div><div class="pstat-k">'+t("Body weight")+'</div>'
   +'<div class="phero">'+(last?toDisp(last.weight):"—")+'<span class="unit">'+wUnit()+'</span></div></div>';
  if(last){
    /* Against the nearest weigh-in at least a week earlier, so a single day's water
       swing is not reported as a trend. */
    var ref=null;
    for(var i=bw.length-2;i>=0;i--)if(msOf(last.date)-msOf(bw[i].date)>=6*DAY){ref=bw[i];break;}
    if(ref)h+=delta(r1(toDisp(last.weight)-toDisp(ref.weight)),wUnit(),down==null?null:!down,t("vs last week"));
  }
  h+='</div>';
  var inR=bw.filter(function(b){return between(b.date,sp.from,sp.to);});
  var avg=inR.length?r1(inR.reduce(function(a,b){return a+toDisp(b.weight);},0)/inR.length):null;
  h+=chart(inR.map(function(b){return toDisp(b.weight);}),inR.map(function(b){return shortd(b.date);}),
      {ref:inR.length>1?avg:null,label:t("Body weight")+", "+rangeName(),
       none:t("Weigh in twice in this period to see the trend.")})
   +(inR.length>1?'<p class="tiny" style="margin:8px 0 0">'+t("Dashed line: average for the period")+' · '+avg+' '+wUnit()+'</p>':'')
   +'<button class="btn g sm mt" data-sheet="weigh">'+t("Log weight")+'</button></div>';

  /* Each measurement against its own previous reading, not against the last row: a
     day on which only the waist was measured must not zero out the chest. */
  h+='<div class="overline">'+t("Measurements")+'</div>';
  var rows=MEAS.map(function(m){
    var vals=S.body.filter(function(b){return num(b[m[1]]);});
    if(!vals.length)return "";
    var cur=vals[vals.length-1],pv=vals[vals.length-2];
    var d=pv?r1(num(cur[m[1]])-num(pv[m[1]])):0;
    return '<div class="prow"><span class="prow-n" style="flex:1">'+esc(t(m[0]))+'</span>'
     +'<span class="prow-b">'+r1(num(cur[m[1]])).toFixed(1)+' cm</span>'
     +'<span class="pm-d'+(pv&&d&&m[2]!=null&&(d>0)===m[2]?" ok":"")+'">'
     +(pv?(d>0?"+":d<0?"−":"±")+Math.abs(d).toFixed(1)+' cm':'')+'</span></div>';
  }).join("");
  var lastM=S.body.filter(function(b){return MEAS.some(function(m){return num(b[m[1]]);});}).slice(-1)[0];
  if(rows)h+=rows+'<p class="tiny" style="margin:4px 0 0">'+t("Last taken")+' '+esc(shortd(lastM.date))
    +'. '+t("Change is against the previous reading of each one.")+'</p>';
  else h+=empty("chart",t("No measurements yet"),t("Tape measurements show change where the scale does not."));
  h+='<button class="btn g sm mt" data-sheet="measure">'+t("Add measurements")+'</button>';

  /* Body composition only exists once a body-fat figure has been entered. */
  var bf=S.body.filter(function(b){return num(b.bf);}).slice(-1)[0];
  h+='<div class="overline">'+t("Body composition")+'</div>';
  if(bf){
    var wkg=num(bf.weight)||(last&&last.weight)||0,pct=num(bf.bf);
    h+='<div class="card pcard"><div class="row">'
     +'<div><div class="pstat-k">'+t("Body fat")+'</div><div class="pstat-v">'+r1(pct)+'%</div></div>'
     +(wkg?'<div style="text-align:end"><div class="pstat-k">'+t("Lean mass")+'</div>'
       +'<div class="pstat-v">'+toDisp(wkg*(1-pct/100))+'<span class="unit">'+wUnit()+'</span></div></div>':'')
     +'</div><div class="pcomp" role="img" aria-label="'+esc(t("Lean mass")+" "+r1(100-pct)+"%, "+t("Body fat")+" "+r1(pct)+"%")+'">'
     +'<i style="width:'+(100-pct)+'%"></i></div>'
     +'<p class="tiny" style="margin:8px 0 0">'+t("From your entry on")+' '+esc(shortd(bf.date))+'.</p></div>';
  }else h+='<div class="card pcard"><p class="tiny" style="margin:0">'
    +t("Add a body-fat percentage with your measurements and lean mass is worked out here.")+'</p></div>';
  return h;}

/* ---------------------------------------------------------- nutrition */
function dayTotals(iso){
  var r=S.days[iso],all=[];
  if(!r||!r.meals)return null;
  Object.keys(r.meals).forEach(function(k){(r.meals[k].items||[]).forEach(function(i){all.push(i);});});
  return all.length?sumNutrition(all):null;}
function loggedDays(){return Object.keys(S.days||{}).filter(function(d){return !!dayTotals(d);}).sort();}
/* On target: protein at least 90% of the goal (more is never a miss), and calories,
   carbs and fat each within 10% of theirs. */
function near(v,g){return g?Math.abs(v-g)<=g*0.1:true;}
function proteinMet(n,g){return !g.p||n.p>=g.p*0.9;}
function onTarget(n,g){return proteinMet(n,g)&&near(n.kcal,g.kcal)&&near(n.c,g.c)&&near(n.f,g.f);}
/* Consecutive logged days, counting back from today (or yesterday, if today has
   nothing yet — a day in progress is not a broken streak). */
function runOf(test){
  var n=0,d=msOf(today());
  if(!dayTotals(today()))d-=DAY;
  for(var i=0;i<400;i++){var tt=dayTotals(isoOf(d));if(tt&&test(tt)){n++;d-=DAY;}else break;}
  return n;}
function vNutrition(){
  var h=chips(),sp=spans(),g=S.goals||{};
  var days=loggedDays().filter(function(d){return between(d,sp.from,sp.to);});
  if(!days.length)return h+empty("plate",t("No meals logged in this period"),
    t("Log what you eat on the Food tab and calorie trends, macro averages and streaks appear here."),
    '<button class="btn" data-go="food">'+t("Log food")+'</button>');
  var tots=days.map(dayTotals);

  /* Calories per day across the span. Days with nothing logged are gaps, not zeros. */
  var n=range(),end=msOf(today()),vals=[],labs=[],byDay={};
  days.forEach(function(d,i){byDay[d]=tots[i];});
  if(n<=90){for(var i=n-1;i>=0;i--){var iso=isoOf(end-i*DAY);vals.push(byDay[iso]?byDay[iso].kcal:null);labs.push(shortd(iso));}}
  else buckets().forEach(function(b){
    var s=0,c=0;days.forEach(function(d){if(between(d,b.from,b.to)){s+=byDay[d].kcal;c++;}});
    vals.push(c?Math.round(s/c):null);labs.push(b.label);});
  h+='<div class="card pcard"><div class="row"><h3 class="pcard-t">'+t(n>90?"Average daily calories":"Daily calories")+'</h3>'
   +(g.kcal?'<span class="tiny">'+t("Target")+': '+fmtN(g.kcal)+' kcal</span>':'')+'</div>'
   +chart(vals,labs,{ref:g.kcal||null,dots:n<=7,label:t("Daily calories")+", "+rangeName(),
     none:t("Log food on two days in this period to see the trend.")})+'</div>';

  var avg=function(k){return Math.round(tots.reduce(function(a,x){return a+x[k];},0)/tots.length);};
  h+='<div class="overline">'+t("Daily averages")+'</div><div class="pmac">'
   +[["Protein","p","var(--accent)"],["Carbs","c","var(--text)"],["Fat","f","var(--dim)"]].map(function(m){
     var v=avg(m[1]),gg=num(g[m[1]]);
     return '<div class="card pmac-c"><div class="pstat-k">'+t(m[0])+'</div>'
      +'<div class="pmac-v">'+v+'g</div>'
      +(gg?'<div class="tiny">'+t("of")+' '+gg+'g</div>':'')
      +'<div class="bar"><i style="width:'+(gg?Math.min(100,v/gg*100):0)+'%;background:'+m[2]+'"></i></div></div>';
   }).join("")+'</div>'
   +'<p class="tiny" style="margin:8px 0 0">'+t("Averaged over")+' '+days.length+' '+t(days.length===1?"logged day":"logged days")
   +' · '+fmtN(avg("kcal"))+' kcal</p>';

  var hit=tots.filter(function(x){return onTarget(x,g);}).length,pc=Math.round(hit/tots.length*100);
  var R=26,C=2*Math.PI*R;
  h+='<div class="overline">'+t("Adherence")+'</div>'
   +'<div class="card pcard row" style="align-items:center"><div>'
   +'<div class="phero">'+pc+'%</div>'
   +'<div class="tiny">'+esc(hit+" "+t("of")+" "+tots.length+" "+t("logged days met every target"))+'</div></div>'
   +'<svg viewBox="0 0 64 64" class="pring" aria-hidden="true">'
   +'<circle cx="32" cy="32" r="'+R+'" class="pring-b"/>'
   +'<circle cx="32" cy="32" r="'+R+'" class="pring-f" stroke-dasharray="'+r1(C*pc/100)+' '+r1(C)+'" transform="rotate(-90 32 32)"/></svg></div>'
   +'<p class="tiny" style="margin:0">'+t("On target means protein at least 90% of goal, and calories, carbs and fat within 10%.")+'</p>';

  h+='<div class="overline">'+t("Current streaks")+'</div>'
   +streakRow(t("Protein target met"),runOf(function(x){return proteinMet(x,g);}))
   +streakRow(t("Calories on target"),runOf(function(x){return near(x.kcal,g.kcal);}))
   +streakRow(t("Days logged"),runOf(function(){return true;}));
  return h;}
function streakRow(k,n){
  return '<div class="prow"><span class="prow-n" style="flex:1">'+esc(k)+'</span>'
   +'<span class="prow-b'+(n?" accent":"")+'">'+n+' '+esc(t(n===1?"day":"days"))+'</span></div>';}

/* ---------------------------------------------------------- the one day */
/* The same control as the one on Food, so the two tabs read alike. */
function pdate(){return V.pdate||today();}
/* The date bar is shared with Food — js/ui/datebar.js. What differs here is scope, and
   only scope: this bar drives the day-specific block below, while the range chips
   keep driving every chart. */
function vDateBar(){
  return dateBar({date:pdate(),open:V.pcal,monthOffset:V.cal});
}

/* The only part of this screen that is about one day rather than a span. */
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
  if(wRow)bits.push(toDisp(wRow.weight)+' '+wUnit());
  if(rec.steps)bits.push(fmtN(rec.steps)+' '+t("steps"));
  if(meals)bits.push(meals+' '+t("meals"));
  return '<button class="card tap" data-openday="'+d+'" style="width:100%;margin-bottom:var(--s3)">'
   +'<div class="row"><div style="flex:1;min-width:0">'
   +'<div class="tiny" style="letter-spacing:.1em">'+t("THAT DAY")+'</div>'
   +'<div style="font-weight:700;margin-top:3px">'
   +(bits.length?bits.join(' · '):t("Nothing logged"))+'</div></div>'
   +'<span class="chev">›</span></div></button>';
}


export {vProgress};

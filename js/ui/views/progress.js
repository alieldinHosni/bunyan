/* Bunyan — progress
   Progress tab and calendar. */
import {t} from "../../i18n/dict.js";
import {empty} from "../../data/exercises.js";
import {exName} from "../../i18n/exnames.js";
import {avg7, bestE1RM, consistency, daysSince, lastWeight, prFor, sessionVolume, weeklySets} from "../../engine/formulas.js";
import {S} from "../../state.js";
import {fmtW, toDisp, wUnit} from "../../units.js";
import {esc, r1, shortd, today} from "../../util.js";
import {head, sparkline, streak, V} from "../view.js";

/* ============================================================ PROGRESS */
function vProgress(){
  var h=head(t("Progress"),t("Witness your ascent"));
  /* A wall of zeroes tells a new user nothing. Show them the two things that start
     filling this screen instead. */
  if(!S.sessions.length&&!S.body.filter(function(b){return b.weight;}).length)
    return h+empty("chart",t("Nothing to chart yet"),
      t("Finish one workout or log your weight, and volume, records, streaks and trends all start here."),
      '<button class="btn" data-go="train">'+t("Start a workout")+'</button>'
      +'<button class="btn g" data-sheet="weigh">'+t("Log weight")+'</button>');
  /* Two controls, two jobs, and they do not fight. The date bar scopes the one card
     that is about a single day; the range chips drive the charts, which are about a
     span and would mean nothing scoped to one date. */
  h+=vDateBar()+vThatDay();

  h+='<div class="sec">'+t("Trends")+'</div>';
  h+='<div class="rowc" style="gap:var(--s2);overflow-x:auto;padding-bottom:var(--s2)">'
   +[["7","1W"],["30","1M"],["90","3M"],["180","6M"],["365","1Y"]].map(function(r2){
     return '<button class="pill'+(String(V.range||30)===r2[0]?" a":"")+'" data-range="'+r2[0]+'">'+r2[1]+'</button>';
   }).join("")+'</div>';
  var cut=Date.now()-(+(V.range||30))*864e5;
  var inRange=S.sessions.filter(function(x){return new Date(x.date+"T00:00:00").getTime()>=cut;});
  var rv=0;inRange.forEach(function(x){rv+=sessionVolume(x);});
  h+='<div class="overline">'+t("Key metrics")+'</div><div class="grid2">'
   +'<div class="card" style="margin:0"><div class="tiny">'+t("TOTAL WORKOUTS")+'</div>'
   +'<div class="stat" style="margin-top:5px">'+inRange.length+'</div></div>'
   +'<div class="card" style="margin:0"><div class="tiny">'+t("CURRENT STREAK")+'</div>'
   +'<div style="margin-top:5px"><span class="metric" style="font-size:28px">'+streak()+'</span>'
   +'<span class="unit">'+t("days")+'</span></div></div>'
   +'<div class="card" style="margin:0"><div class="tiny">'+t("TOTAL VOLUME")+'</div>'
   +'<div class="stat" style="margin-top:5px">'
   +(toDisp(rv)>9999?r1(toDisp(rv)/1000)+"k":Math.round(toDisp(rv)))
   +'<span class="unit">'+wUnit()+'</span></div></div>'
   +'<div class="card" style="margin:0"><div class="tiny">'+t("BODY WEIGHT")+'</div>'
   +'<div class="stat" style="margin-top:5px">'
   +((avg7()||lastWeight())?toDisp(avg7()||lastWeight()):"\u2014")
   +'<span class="unit">'+wUnit()+'</span></div></div></div>';
  var totalVol=0;S.sessions.forEach(function(s){totalVol+=sessionVolume(s);});
  var prs=0,seen={};
  S.sessions.forEach(function(s){s.entries.forEach(function(e){
    if(e.sets.length&&!seen[e.name]){seen[e.name]=1;if(prFor(e.name).w)prs++;}});});
  h+='<div class="grid2">'
   +'<div class="card"><div class="tiny">'+t("Total volume")+'</div><div class="big">'
   +Math.round(toDisp(totalVol)).toLocaleString()+'</div><div class="tiny">'+wUnit()+' '+t("moved")+'</div></div>'
   +'<div class="card"><div class="tiny">'+t("Consistency")+'</div><div class="big">'+consistency()+'%</div><div class="tiny">'+t("last 4 weeks")+'</div></div>'
   +'<div class="card"><div class="tiny">'+t("Exercises tracked")+'</div><div class="big">'+prs+'</div><div class="tiny">'+t("with records")+'</div></div>'
   +'<div class="card"><div class="tiny">'+t("7-day weight")+'</div><div class="big">'
   +((avg7()||lastWeight())?toDisp(avg7()||lastWeight()):"—")
   +'</div><div class="tiny">'+wUnit()+'</div></div></div>';

  h+='<div class="overline">'+t("Volume trend")+'</div><div class="card">';
  var vt=inRange.slice().reverse();
  h+=sparkline(vt.map(function(x){return Math.round(sessionVolume(x));}),
               vt.map(function(x){return shortd(x.date);}),"var(--accent)");
  h+='</div>';
  h+='<div class="overline">'+t("Body weight")+'</div><div class="card">';
  var bw=S.body.filter(function(b){return b.weight;});
  h+=sparkline(bw.map(function(b){return b.weight;}),bw.map(function(b){return shortd(b.date);}),"var(--accent)");
  h+='<button class="btn g sm mt" data-sheet="weigh">'+t("Log weight")+'</button></div>';

  h+='<div class="sec">'+t("Weekly sets by muscle")+'</div>';
  var ws=weeklySets(),keys=Object.keys(ws).sort(function(a,b){return ws[b]-ws[a];});
  if(!keys.length)h+=empty("dumbbell",t("No sets this week"),
    t("Weekly volume per muscle appears once you log a session."),
    '<button class="btn" data-go="train">'+t("Start a workout")+'</button>');
  else{h+='<div class="card">';
    var mxv=ws[keys[0]];
    keys.forEach(function(m){
      var ds=daysSince(m);
      h+='<div class="row" style="margin-bottom:3px"><span>'+esc(m)+'</span>'
       +'<span class="tiny">'+ws[m]+' sets'+(ds!==null?' · '+ds+'d ago':'')+'</span></div>'
       +'<div class="bar" style="margin-bottom:11px"><i style="width:'+(ws[m]/mxv*100)+'%;background:var(--ok)"></i></div>';});
    h+='</div>';}

  h+='<div class="sec">'+t("Strength over time")+'</div>';
  var names=[];
  S.sessions.forEach(function(s){s.entries.forEach(function(e){
    if(e.sets.length&&names.indexOf(e.name)<0)names.push(e.name);});});
  if(!names.length)h+=empty("chart",t("No strength history"),
    t("Log the same lift twice and Bunyan starts plotting your estimated one-rep max."));
  else{
    if(!V.chartEx||names.indexOf(V.chartEx)<0)V.chartEx=names[0];
    h+='<select id="chartsel">'+names.map(function(n){
      return '<option value="'+esc(n)+'"'+(n===V.chartEx?" selected":"")+'>'
       +esc(exName(n))+'</option>';}).join("")+'</select>';
    var pts=[],labs=[];
    S.sessions.slice().reverse().forEach(function(s){
      s.entries.forEach(function(e){
        if(e.name!==V.chartEx||!e.sets.length)return;
        var b=bestE1RM(e.sets);if(b){pts.push(b);labs.push(shortd(s.date));}});});
    h+='<div class="card mt">'+sparkline(pts,labs,"var(--gold)")
     +'<p class="tiny">'+t("Estimated 1RM, Epley. Only sets of 12 reps or fewer count.")+'</p></div>';}

  h+='<div class="sec">'+t("Personal records")+'</div>';
  if(!names.length)h+=empty("dumbbell",t("No records yet"),
    t("Your heaviest set on every lift is tracked automatically from the first session."));
  else{h+='<div class="list">';
    names.forEach(function(n){var p=prFor(n);
      h+='<div class="item"><div><div style="font-weight:600">'+esc(n)+'</div>'
       +'<div class="tiny">'+fmtW(p.w)+' × '+p.reps+' · best 1RM '+(p.e?toDisp(p.e):"—")+' · best set '+toDisp(p.vol)+'</div></div></div>';});
    h+='</div>';}

  h+='<div class="sec">'+t("Measurements")+'</div>';
  var last=S.body.filter(function(b){return b.chest||b.waist||b.arms;}).slice(-1)[0];
  h+='<div class="card">';
  if(last){
    h+='<div class="grid3">';
    [["Chest","chest"],["Waist","waist"],["Arms","arms"],["Thighs","thighs"],["Calves","calves"],["Neck","neck"]]
      .forEach(function(m){h+='<div><div class="tiny">'+m[0]+'</div><div class="big" style="font-size:19px">'
        +(last[m[1]]||"—")+'</div></div>';});
    h+='</div><p class="tiny mt">Taken '+shortd(last.date)+', in cm.</p>';
  }else h+='<p class="tiny">'+t("No measurements yet.")+'</p>';
  h+='<button class="btn g sm mt" data-sheet="measure">'+t("Add measurements")+'</button></div>';

  /* The month grid used to sit here, below everything, where tapping a day was the
     only thing it did and the screen it belonged to was elsewhere. It is now behind
     the date bar at the top. */
  return h;}

/* The same control as the one on Food, so the two tabs read alike. The date itself
   is the button that expands the month — a tap, not a double tap, which Issue 6's
   touch-action:manipulation would have swallowed anyway. */
function pdate(){return V.pdate||today();}
function vDateBar(){
  var d=pdate(),isToday=d===today();
  return '<div class="card" style="padding:var(--s3);margin-bottom:var(--s3)">'
   +'<div class="row" style="align-items:center">'
   +'<button class="btn d sm iconbtn" data-pday="-1" aria-label="'+t("Previous day")+'">‹</button>'
   +'<button class="pdate" data-pcal="1" aria-expanded="'+(V.pcal?"true":"false")+'" '
   +'aria-label="'+t("Choose a day")+'">'
   +(isToday?t("Today")+", ":"")+shortd(d)
   +'<span class="pchev'+(V.pcal?" up":"")+'" aria-hidden="true">›</span></button>'
   +'<button class="btn d sm iconbtn" data-pday="1"'+(isToday?' disabled':'')
   +' aria-label="'+t("Next day")+'">›</button>'
   +'</div>'
   +(isToday?'':'<div style="text-align:center"><button class="btn d sm" data-pday="0">'
     +t("Back to today")+'</button></div>')
   +(V.pcal?vCalendar():'')+'</div>';
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
    +' · '+Math.round(vol)+' '+t("volume"));
  if(wRow)bits.push(toDisp(wRow.weight)+wUnit());
  if(rec.steps)bits.push(rec.steps+' '+t("steps"));
  if(meals)bits.push(meals+' '+t("meals"));
  return '<button class="card tap" data-openday="'+d+'" style="width:100%;margin-bottom:var(--s3)">'
   +'<div class="row"><div style="flex:1;min-width:0">'
   +'<div class="tiny" style="letter-spacing:.1em">'+t("THAT DAY")+'</div>'
   +'<div style="font-weight:700;margin-top:3px">'
   +(bits.length?bits.join(' · '):t("Nothing logged"))+'</div></div>'
   +'<span class="chev">›</span></div></button>';
}

function vCalendar(){
  var base=new Date();base.setDate(1);base.setMonth(base.getMonth()+V.cal);
  var y=base.getFullYear(),m=base.getMonth();
  var first=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate();
  var marks={};
  S.sessions.forEach(function(s){marks[s.date]=1;});
  var h='<div style="margin-top:var(--s3);border-top:1px solid var(--border);padding-top:var(--s3)"><div class="row" style="align-items:center">'
   +'<button class="btn d sm iconbtn" data-cal="-1" aria-label="'+t("Previous month")+'">‹</button>'
   +'<strong aria-live="polite">'+base.toLocaleDateString(undefined,{month:"long",year:"numeric"})+'</strong>'
   +'<button class="btn d sm iconbtn" data-cal="1" aria-label="'+t("Next month")+'">›</button></div>'
   +'<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:5px;margin-top:11px">';
  ["S","M","T","W","T","F","S"].forEach(function(d){
    h+='<div class="tiny" style="text-align:center">'+d+'</div>';});
  for(var i=0;i<first;i++)h+='<div></div>';
  for(var d=1;d<=days;d++){
    var iso=y+"-"+String(m+1).padStart(2,"0")+"-"+String(d).padStart(2,"0");
    var on=marks[iso],isToday=iso===today();
    var hasFood=S.days[iso]&&Object.keys(S.days[iso].meals||{}).some(function(k){
      return (S.days[iso].meals[k].items||[]).length;});
    /* Picking a day scopes the screen and folds the month away; the day card it
       scopes is what opens the full detail sheet. */
    h+='<button data-pick="'+iso+'" style="aspect-ratio:1;display:flex;flex-direction:column;'
     +'align-items:center;justify-content:center;border-radius:9px;font-size:13px;border:none;'
     +'padding:0;position:relative;'
     +(on?'background:var(--accent);color:#fff;font-weight:700;':
        isToday?'border:1px solid var(--accent);background:none;color:var(--text);':
        'background:none;color:var(--faint);')+'">'+d
     +(hasFood&&!on?'<span style="position:absolute;bottom:4px;width:4px;height:4px;'
       +'border-radius:2px;background:var(--ok)"></span>':'')+'</button>';}
  return h+'</div></div>';}


export {vProgress};

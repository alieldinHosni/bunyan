/* Bunyan — date bar
   One calendar, used by both Progress and Food.

   There used to be two. Progress had a date bar plus an expandable month grid with
   markers; Food had a bare bar and nothing else. They were written months apart and had
   drifted in three separate ways by the time they were merged:

     - Progress's day arithmetic omitted the timezone correction Food had, so east of
       UTC "previous day" skipped one. At UTC+3, 20 Sep went back to 18 Sep.
     - Food's "Today," and "Back to today" never went through t(), so they stayed
       English in Arabic.
     - Only Progress could open a month view at all.

   None of those needed finding twice. That is the whole argument for this file. */
import {t} from "../i18n/dict.js";
import {S} from "../state.js";
import {shortd, today} from "../util.js";

/* Local midnight, shifted, then read back as a local date rather than a UTC one.
   `new Date(iso+"T00:00:00")` is local, but toISOString() converts to UTC, so east of
   Greenwich the naive version lands on the day before. This is the bug above. */
function shiftDay(iso,delta){
  var d=new Date(iso+"T00:00:00");
  d.setDate(d.getDate()+delta);
  return new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);
}

/* Which days have something on them, as a bitfield: 1 trained, 2 ate.
   Built once per render rather than per cell — a month is 31 lookups either way, but
   the food test walks every meal of every day and that is worth doing once. */
var TRAINED=1, ATE=2;
function marksFor(){
  var m={},i,k,meals,n;
  for(i=0;i<S.sessions.length;i++)m[S.sessions[i].date]=(m[S.sessions[i].date]||0)|TRAINED;
  var days=S.days||{};
  for(k in days){
    if(!Object.prototype.hasOwnProperty.call(days,k))continue;
    meals=(days[k]||{}).meals||{};
    for(n in meals){
      if(!Object.prototype.hasOwnProperty.call(meals,n))continue;
      if((meals[n].items||[]).length){m[k]=(m[k]||0)|ATE;break;}
    }
  }
  return m;
}

/* The arrows are glyphs, not icons, so they have to be swapped by hand in RTL: the row
   reverses on its own but a left-pointing chevron stays left-pointing. Reading the dir
   attribute rather than the language keeps this true for anything else that sets it. */
function rtl(){
  try{ return document.documentElement.getAttribute("dir")==="rtl"; }
  catch(e){ return false; }
}
var PREV_G="‹", NEXT_G="›";

/* The month grid. Only rendered when the bar is expanded. */
function monthGrid(sel,monthOffset){
  var base=new Date();base.setDate(1);base.setMonth(base.getMonth()+(monthOffset||0));
  var y=base.getFullYear(),m=base.getMonth();
  var first=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate();
  var marks=marksFor(),back=rtl()?NEXT_G:PREV_G,fwd=rtl()?PREV_G:NEXT_G;
  var h='<div class="dbcal"><div class="row" style="align-items:center">'
   +'<button class="btn d sm iconbtn" data-dmonth="-1" aria-label="'+t("Previous month")+'">'+back+'</button>'
   +'<strong aria-live="polite">'+base.toLocaleDateString(undefined,{month:"long",year:"numeric"})+'</strong>'
   +'<button class="btn d sm iconbtn" data-dmonth="1" aria-label="'+t("Next month")+'">'+fwd+'</button></div>'
   +'<div class="dbgrid">';
  ["S","M","T","W","T","F","S"].forEach(function(d){
    h+='<div class="tiny" style="text-align:center">'+d+'</div>';});
  for(var i=0;i<first;i++)h+='<div></div>';
  for(var d=1;d<=days;d++){
    var iso=y+"-"+String(m+1).padStart(2,"0")+"-"+String(d).padStart(2,"0");
    var mk=marks[iso]||0, trained=mk&TRAINED, ate=mk&ATE;
    var isToday=iso===today(), isSel=iso===sel;
    var cls="dbday";
    if(trained)cls+=" trained";
    if(isToday)cls+=" today";
    if(isSel)cls+=" sel";
    /* Picking a day folds the month away and scopes the screen. The full day detail is
       a separate control on each screen, because what "that day" means differs. */
    h+='<button class="'+cls+'" data-dpick="'+iso+'"'
     +' aria-label="'+iso+'"'+(isSel?' aria-current="date"':'')+'>'+d
     +(ate&&!trained?'<span class="dbdot" aria-hidden="true"></span>':'')+'</button>';}
  return h+'</div></div>';
}

/* The bar itself. `date` is the selected ISO day, `open` whether the month is showing,
   `monthOffset` how many months the grid has been paged from this one. */
function dateBar(o){
  var sel=o.date||today(), isToday=sel===today();
  var back=rtl()?NEXT_G:PREV_G, fwd=rtl()?PREV_G:NEXT_G;
  return '<div class="card dbwrap">'
   +'<div class="row" style="align-items:center">'
   +'<button class="btn d sm iconbtn" data-dday="-1" aria-label="'+t("Previous day")+'">'+back+'</button>'
   +'<button class="pdate" data-dopen="1" aria-expanded="'+(o.open?"true":"false")+'"'
   +' aria-label="'+t("Choose a day")+'">'
   +(isToday?t("Today")+", ":"")+shortd(sel)
   +'<span class="pchev'+(o.open?" up":"")+'" aria-hidden="true">›</span></button>'
   +'<button class="btn d sm iconbtn" data-dday="1"'+(isToday?' disabled':'')
   +' aria-label="'+t("Next day")+'">'+fwd+'</button>'
   +'</div>'
   +(isToday?'':'<div style="text-align:center"><button class="btn d sm" data-dday="0">'
     +t("Back to today")+'</button></div>')
   +(o.open?monthGrid(sel,o.monthOffset):'')
   +'</div>';
}

export {dateBar, shiftDay};

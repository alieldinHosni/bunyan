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
import {dfmt, esc, today} from "../util.js";
import {weekOrder, weekStart} from "../engine/schedule.js";
import {V} from "./view.js";

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

/* Chevrons and the calendar, drawn inline so they take the text colour. In RTL the
   row reverses on its own and CSS mirrors the chevrons, so "previous" still points
   back along the reading direction. */
var CHEV_L='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M14.5 6 8.5 12l6 6"/></svg>';
var CHEV_R='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9.5 6l6 6-6 6"/></svg>';
var CHEV_D='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 10l5 5 5-5"/></svg>';
var CAL='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>';
var BACK='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3L4.5 9"/><path d="M4.5 4.5V9H9"/></svg>';

/* The week's initials in the reader's language, from the first day of the user's
   week, taken from a known Monday (1 Jan 2024). A table of letters would be English
   only, and "S" is two days. */
function weekInitials(){
  return weekOrder().map(function(n){return dfmt(new Date(2024,0,n),{weekday:"narrow"});});}

/* The month grid. Only rendered when the navigator is open. Past and today are
   pickable everywhere; the future only where the screen plans ahead (Train). */
function monthGrid(sel,monthOffset,future){
  var base=new Date();base.setDate(1);base.setMonth(base.getMonth()+(monthOffset||0));
  var y=base.getFullYear(),m=base.getMonth();
  var first=((new Date(y,m,1).getDay()||7)-weekStart()+7)%7,days=new Date(y,m+1,0).getDate();
  var marks=marksFor(),now=today();
  var h='<div class="dbcal"><div class="dbcal-h">'
   +'<button class="dnav-arrow sm" data-dmonth="-1" aria-label="'+t("Previous month")+'">'+CHEV_L+'</button>'
   +'<strong aria-live="polite">'+dfmt(base,{month:"long",year:"numeric"})+'</strong>'
   +'<button class="dnav-arrow sm" data-dmonth="1" aria-label="'+t("Next month")+'">'+CHEV_R+'</button></div>'
   +'<div class="dbgrid">';
  weekInitials().forEach(function(d){h+='<div class="dbwk" aria-hidden="true">'+esc(d)+'</div>';});
  for(var i=0;i<first;i++)h+='<div></div>';
  for(var d=1;d<=days;d++){
    var iso=y+"-"+String(m+1).padStart(2,"0")+"-"+String(d).padStart(2,"0");
    var mk=marks[iso]||0, trained=mk&TRAINED, ate=mk&ATE;
    var cls="dbday";
    if(trained)cls+=" trained";
    if(iso===now)cls+=" today";
    if(iso===sel)cls+=" sel";
    var off=!future&&iso>now;
    /* Picking a day folds the month away and scopes the screen. */
    h+='<button class="'+cls+'" data-dpick="'+iso+'"'+(off?' disabled':'')
     +' aria-label="'+dfmt(new Date(iso+"T00:00:00"),{weekday:"long",day:"numeric",month:"long"})
     +(trained?", "+t("trained"):"")+(ate?", "+t("food logged"):"")+'"'
     +(iso===sel?' aria-current="date"':'')+'>'+d
     +(trained||ate?'<span class="dbdot'+(trained?' t':'')+'" aria-hidden="true"></span>':'')+'</button>';}
  return h+'</div></div>';
}

/* The navigator. One component on Food, Progress and Train:

     ‹   [cal] TODAY · 29 SEP ⌄   ›
             Monday · Today

   o.date         the selected ISO day
   o.open         whether the month is showing
   o.monthOffset  how many months the grid has been paged from this one
   o.future       whether days after today can be chosen (only Train plans ahead)
   o.kicker       a small label above the date ("Workout plan")
   o.note         what the day holds, in place of "Today" on the second line
   o.art          the Bunyan horse drawn into the right of the surface

   The date text is keyed by the date, so a change replaces it and its short slide
   plays in the direction the day moved (V.dnavDir). The surface itself stays put.
   It swipes: data-swipe="day" is picked up in app.js and presses the matching arrow. */
function dateBar(o){
  var sel=o.date||today(), now=today(), isToday=sel===now;
  var d=new Date(sel+"T00:00:00");
  var day=dfmt(d,{day:"numeric",month:"short"});
  var big=(isToday?t("Today"):dfmt(d,{weekday:"short"}))+" · "+day;
  var wk=dfmt(d,{weekday:"long"});
  var sub=wk+(o.note?" · "+o.note:isToday?" · "+t("Today"):"");
  var nextOff=!o.future&&sel>=now;
  var dir=V.dnavDir>0?" fwd":V.dnavDir<0?" back":"";
  var full=dfmt(d,{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  return '<div class="dnav-wrap" data-k="dnav-wrap">'
   +'<div class="dnav'+(isToday?' now':'')+(o.art?' art':'')+'" data-swipe="day">'
   +(o.art?'<img class="dnav-art" src="mark.png" alt="" aria-hidden="true" width="440" height="440" decoding="async">':'')
   +'<button class="dnav-arrow" data-dday="-1" aria-label="'+t("Previous day")+'">'+CHEV_L+'</button>'
   +'<button class="dnav-mid" data-dopen="1" aria-expanded="'+(o.open?"true":"false")+'"'
   +' aria-label="'+esc(t("Choose a day")+", "+full)+'">'
   +(o.kicker?'<span class="dnav-k">'+esc(o.kicker)+'</span>':'')
   +'<span class="dnav-d'+dir+'" data-k="dd-'+sel+'">'+CAL+'<span class="dnav-t">'+esc(big)+'</span>'
   +'<span class="dnav-c'+(o.open?' up':'')+'">'+CHEV_D+'</span></span>'
   +'<span class="dnav-s" data-k="ds-'+sel+'">'+esc(sub)+'</span></button>'
   +'<button class="dnav-arrow" data-dday="1"'+(nextOff?' disabled':'')
   +' aria-label="'+t("Next day")+'">'+CHEV_R+'</button>'
   +'</div>'
   +(isToday?'':'<button class="dnav-back" data-dday="0">'+BACK+'<span>'+t("Back to today")+'</span></button>')
   +(o.open?monthGrid(sel,o.monthOffset,o.future):'')
   +'</div>';
}

export {dateBar, shiftDay};

/* Bunyan — importing a training program
   A program read from a PDF or pasted text (js/engine/splitparse.js) is a draft until
   the lifter says otherwise. This screen is that draft, in full and all of it
   editable: the program's name, which day falls on which weekday, every day's name,
   and every exercise — what it is, its sets, reps or seconds, rest, starting weight,
   its note, and the weeks it belongs to. Nothing is saved until "Use this program".

   An exercise the library does not know is not dropped and not guessed at: it says
   so, and is kept as the plan wrote it — a custom exercise — unless a library one is
   picked instead. A match that is only close says that too, so it gets a look. */
import {t} from "../../i18n/dict.js";
import {LIB, muscleOf, thumb} from "../../data/exercises.js";
import {isActivity} from "../../data/activities.js";
import {exName, planName} from "../../i18n/exnames.js";
import {esc, uid} from "../../util.js";
import {V} from "../view.js";
import {backArrow} from "../nav.js";
import {wdName, weekOrder} from "../../engine/schedule.js";
import {fmtW, toDisp, wUnit} from "../../units.js";
import {doseText, weeksText} from "../dose.js";
import {saysMore} from "../../engine/splitparse.js";

/* Ids for everything in the draft, so rows keep their identity while it is edited. */
function withIds(tp){
  (tp.days||[]).forEach(function(d){d.id=d.id||uid();d.ex.forEach(function(e){e.id=e.id||uid();});});
  (tp.acts||[]).forEach(function(a){a.id=a.id||uid();});
  return tp;}

function vTImport(){
  var tp=V.tp;
  var h='<div class="dhead">'+backArrow()+'<h1 class="dhead-t">'+esc(t("Import a program"))+'</h1></div>';
  if(!tp){
    h+='<p class="dsub">'+esc(t("Open the PDF your coach sent, or paste the program. It is read on this phone; nothing is uploaded."))+'</p>'
     +'<textarea id="ti_text" class="pitext" rows="9" spellcheck="false" placeholder="'
     +esc(t("Day A — Push\nIncline bench press 3 x 6-8, 90s rest, 40 kg\nLateral raise 3 x 12-15\n\nDay B — Pull\nLat pulldown 3 x 8-10"))+'">'+esc(V.titext||"")+'</textarea>'
     +'<div class="piacts"><label class="btn g pifile"><input id="ti_file" type="file" accept=".pdf,application/pdf,.txt,.md,text/plain">'
     +esc(t("Open a file"))+'</label>'
     +'<button class="btn" data-tiread="1">'+esc(t("Read the program"))+'</button></div>';
    if(V.tibusy)h+='<p class="pibusy" role="status"><span class="pispin" aria-hidden="true"></span>'+esc(t("Reading the PDF…"))+'</p>';
    if(V.tierr)h+='<div class="empty"><p>'+esc(t(V.tierr))+'</p></div>';
    return h;}
  var nEx=0,nNew=0,nCheck=0;
  tp.days.forEach(function(d){d.ex.forEach(function(e){nEx++;if(!e.name)nNew++;else if(e.conf==="close")nCheck++;});});
  h+='<p class="dsub">'+esc(t("Everything here can be changed before it is saved. Tap an exercise to edit it."))+'</p>';
  if(!tp.days.length){
    h+='<div class="empty"><p>'+esc(t("No training days or exercises were found in that file."))+'</p></div>'
     +'<button class="btn g" data-tirestart="1">'+esc(t("Try another file"))+'</button>';
    return h;}
  /* What was found, and what wants a look. */
  h+='<div class="tisum"><b>'+tp.days.length+' '+esc(t(tp.days.length===1?"day":"days"))+' · '+nEx+' '+esc(t(nEx===1?"exercise":"exercises"))+'</b>'
   +(tp.meta&&(tp.meta.phase||tp.meta.weeks)?'<span>'+esc([tp.meta.phase,tp.meta.weeks?tp.meta.weeks+" "+t("weeks"):""].filter(Boolean).join(" · "))+'</span>':'')
   +(nCheck?'<span class="tiwarn">'+nCheck+' '+esc(t(nCheck===1?"match to check":"matches to check"))+'</span>':'')
   +(nNew?'<span class="tiwarn">'+nNew+' '+esc(t("not in the library"))+'</span>':'')
   +'</div>';
  h+='<label class="tilbl" for="ti_name">'+esc(t("Program name"))+'</label>'
   +'<input id="ti_name" class="tiin" type="text" value="'+esc(tp.name||"")+'" autocomplete="off" spellcheck="false">';
  h+=weekEditor(tp);
  tp.days.forEach(function(d,i){h+=dayCard(d,i);});
  if(tp.acts&&tp.acts.length){
    h+='<div class="tsec"><h2 class="tsec-h">'+esc(t("Also in your week"))+'</h2></div><div class="ticard">';
    tp.acts.forEach(function(a,j){
      h+='<div class="tiact" data-k="ta:'+a.id+'"><span><b>'+esc(exName(a.name))+'</b><i>'
       +esc((a.wd||[]).slice().sort().map(function(n){return wdName(n);}).join(", ")||t("Any day"))
       +' · '+a.min+' '+esc(t("min"))+'</i></span>'
       +'<button class="ticard-x" data-tirmact="'+j+'" aria-label="'+esc(t("Remove")+" "+exName(a.name))+'">✕</button></div>';});
    h+='</div>';}
  if(tp.notes&&tp.notes.length){
    h+='<details class="tinotes"><summary>'+esc(t("Coach's notes"))+' <span class="num">'+tp.notes.length+'</span></summary>'
     +tp.notes.map(function(n){return (n.h?'<h3>'+esc(cap(n.h))+'</h3>':'')+n.t.map(function(l){return '<p>'+esc(l)+'</p>';}).join("");}).join("")
     +'<p class="bnote">'+esc(t("Kept with the program, under Coach → Training → My program."))+'</p></details>';}
  h+='<div class="dcta"><button class="btn dbegin" data-tiuse="1">'+esc(t("Use this program"))+'</button>'
   +'<p class="bnote">'+esc(t("It becomes your active program. The one you have now stays in My programs."))+'</p>'
   +'<button class="ddel" data-tirestart="1">'+esc(t("Start over"))+'</button></div>';
  return h;}

/* Headings arrive in capitals from a designed PDF; a note reads better in sentence case. */
function cap(s){s=String(s||"");return s===s.toUpperCase()?s.charAt(0)+s.slice(1).toLowerCase():s;}

/* Which day falls on which weekday. A weekday holds one thing: a day of the program,
   one of the week's activities, or rest. Left all on rest, the days run in rotation. */
function weekEditor(tp){
  var h='<div class="tsec"><h2 class="tsec-h">'+esc(t("Your week"))+'</h2><span class="dhint">'
   +esc(t(tp.days.some(function(d){return d.wd.length;})?"By weekday":"In rotation"))+'</span></div><div class="ticard tiwk">';
  weekOrder().forEach(function(n){
    var sel="";
    tp.days.forEach(function(d,i){if(!sel&&d.wd.indexOf(n)>=0)sel="d:"+i;});
    (tp.acts||[]).forEach(function(a,j){if(!sel&&(a.wd||[]).indexOf(n)>=0)sel="a:"+j;});
    h+='<label class="tiwk-r"><span>'+esc(wdName(n,true))+'</span><select id="ti_wd_'+n+'">'
     +'<option value=""'+(sel?'':' selected')+'>'+esc(t("Rest"))+'</option>'
     +tp.days.map(function(d,i){return '<option value="d:'+i+'"'+(sel==="d:"+i?' selected':'')+'>'+esc(planName(d.name))+'</option>';}).join("")
     +(tp.acts||[]).map(function(a,j){return '<option value="a:'+j+'"'+(sel==="a:"+j?' selected':'')+'>'+esc(exName(a.name))+'</option>';}).join("")
     +'</select></label>';});
  return h+'</div><p class="bnote">'+esc(t("Leave every day on Rest to run the days in rotation instead."))+'</p>';}

function dayCard(d,i){
  var h='<section class="ticard" data-k="td:'+d.id+'"><div class="ticard-h">'
   +'<input id="ti_dn_'+i+'" class="tiday" type="text" value="'+esc(d.name)+'" aria-label="'+esc(t("Day name"))+'" autocomplete="off" spellcheck="false">'
   +'<button class="ticard-x" data-tirmday="'+i+'" aria-label="'+esc(t("Remove")+" "+d.name)+'">✕</button></div>'
   +(d.focus?'<p class="tifocus">'+esc(cap(d.focus))+'</p>':'');
  d.ex.forEach(function(e,j){
    var nm=e.name?exName(e.name):e.raw;
    var bits=[doseText(e)];
    if(e.rest)bits.push(e.rest+" "+t("s")+" "+t("rest"));
    if(e.w0!=null)bits.push(t("start")+" "+fmtW(e.w0));
    h+='<button class="tirow" data-k="te:'+e.id+'" data-tiex="'+i+'|'+j+'">'+thumb(e.name||e.raw,40)
     +'<span class="tirow-t"><b>'+esc(nm)+'</b>'
     +(saysMore(e.raw,e.name)?'<small class="tirow-raw">'+esc(e.raw)+'</small>':'')
     +'<span class="tirow-s">'+esc(bits.join(" · "))+'</span>'
     +(e.note?'<small class="tirow-n">'+esc(e.note)+'</small>':'')
     +'<span class="tirow-c">'
     +(!e.name?'<i class="tiwarn">'+esc(t("Not in the library"))+'</i>':e.conf==="close"?'<i class="tiwarn">'+esc(t("Check the match"))+'</i>':'')
     +(e.check?'<i class="tiwarn">'+esc(t("Check the numbers"))+'</i>':'')
     +(e.wk?'<i>'+esc(weeksText(e.wk))+'</i>':'')
     +(e.block?'<i>'+esc(cap(e.block))+'</i>':'')
     +'</span></span><span class="ico ico-chev" aria-hidden="true"></span></button>';});
  h+='<button class="dadd" data-tiadd="'+i+'"><span aria-hidden="true">+</span>'+esc(t("Add exercise"))+'</button>';
  if(d.notes&&d.notes.length)
    h+='<details class="tinotes"><summary>'+esc(t("Session notes"))+'</summary>'
     +d.notes.map(function(l){return '<p>'+esc(l)+'</p>';}).join("")+'</details>';
  return h+'</section>';}

/* ---- the exercise editor sheet ----------------------------------------------------
   Works on a copy (V.sd.e): Save writes it back, closing does not. */
function field(k,label,v,step){
  return '<label class="tif"><span>'+esc(label)+'</span><input id="tie_'+k+'" type="number" inputmode="'+(step?"decimal":"numeric")+'"'
   +(step?' step="'+step+'"':'')+' value="'+(v==null?"":v)+'"></label>';}
function toggle(k,label,on){
  return '<button class="tit" role="switch" aria-checked="'+(!!on)+'" data-titgl="'+k+'"><span>'+esc(label)+'</span>'
   +'<span class="tgl'+(on?' on':'')+'" aria-hidden="true"><i></i></span></button>';}
function tiexSheet(){
  var e=V.sd&&V.sd.e;if(!e)return "";
  var b='<h2>'+esc(e.name?exName(e.name):e.raw)+'</h2>'
   +(e.raw&&e.name&&e.raw.toLowerCase()!==e.name.toLowerCase()?'<p class="tiny">'+esc(t("In the plan"))+': '+esc(e.raw)+'</p>':'')
   +(!e.name?'<p class="tiny tiwarn">'+esc(t("Not in the library. It is kept as written, as your own exercise, unless you pick one."))+'</p>':'')
   +'<button class="btn g sm tiswap" data-tiswap="1">'+esc(t(e.name?"Change exercise":"Find it in the library"))+'</button>';
  if(isActivity(e.name)){
    b+='<div class="tigrid">'+field("min",t("Minutes"),e.min||30)+'</div>';}
  else{
    b+='<div class="tigrid">'+field("sets",t("Sets"),e.sets)+field("rest",t("Rest")+" ("+t("s")+")",e.rest);
    if(!e.amrap)b+=field("lo",t(e.timed?"Min seconds":"Min reps"),e.lo)+field("hi",t(e.timed?"Max seconds":"Max reps"),e.hi);
    b+=field("w0",t("Start weight")+" ("+wUnit()+")",e.w0!=null?toDisp(e.w0):"","0.5")+'</div>'
     +'<div class="titgls">'+toggle("timed",t("Held for seconds"),e.timed)+toggle("side",t("Each side"),e.side)
     +toggle("amrap",t("As many reps as you can"),e.amrap)+'</div>'
     +'<div class="tigrid">'+field("wk0",t("From week"),e.wk?e.wk[0]:"")+field("wk1",t("To week"),e.wk&&e.wk[1]<99?e.wk[1]:"")+'</div>';}
  b+='<label class="tilbl" for="tie_note">'+esc(t("Note"))+'</label>'
   +'<textarea id="tie_note" class="tinote" rows="3">'+esc(e.note||"")+'</textarea>'
   +'<div class="tiacts"><button class="btn" data-tiexsave="1">'+esc(t("Save"))+'</button>'
   +'<button class="ddel" data-tiexrm="1">'+esc(t("Remove from the day"))+'</button></div>';
  return b;}

/* ---- the program ------------------------------------------------------------------- */
/* A custom exercise still needs a muscle for weekly sets and for "days since": read
   from the words of its name, else Other. */
var GUESS=[[/squat|lunge|leg press|leg extension|step.?up|quad|wall sit/i,"Quads"],[/deadlift|rdl|hamstring|leg curl|nordic|good morning/i,"Hamstrings"],
  [/hip thrust|glute|bridge|kickback|abduct/i,"Glutes"],[/calf|ankle|calves|hop|\btib/i,"Calves"],[/adduct|copenhagen|groin/i,"Adductors"],
  [/bench|chest|fly|flye|pec|push.?up|dip/i,"Chest"],[/row|pulldown|pull.?up|chin|lat\b|pullover/i,"Back"],
  [/curl/i,"Biceps"],[/tricep|pushdown|skull|extension/i,"Triceps"],[/shoulder|overhead|lateral|delt|press|raise/i,"Shoulders"],
  [/plank|crunch|core|ab\b|abs\b|carry|dead bug|hollow|pallof/i,"Core"],[/neck/i,"Neck"],[/wrist|forearm|grip/i,"Forearms"]];
function guessMuscle(n){var g=GUESS.filter(function(x){return x[0].test(n);})[0];return g?g[1]:"Other";}

/* The draft as a program: days with their weekdays and notes, the week's activities as
   days of their own, and every exercise carrying what the plan said about it. */
function programFromDraft(tp,startIso){
  var byWeek=tp.days.some(function(d){return d.wd.length;})||(tp.acts||[]).some(function(a){return (a.wd||[]).length;});
  var days=tp.days.map(function(d){
    return {name:d.name,wd:byWeek?d.wd.slice():[],
      notes:(d.notes||[]).slice(),focus:d.focus||"",
      ex:d.ex.map(function(e){
        var name=e.name||e.raw,o={name:name,muscle:e.name?muscleOf(e.name):guessMuscle(e.raw),sets:e.sets||1,lo:e.lo||0,hi:e.hi||e.lo||0,rest:e.rest||0};
        if(isActivity(name)){o.lo=0;o.hi=0;o.rest=0;o.min=e.min||30;o.rpe=6;return o;}
        /* The plan's own words for it, when the library's name says less. */
        var note=[saysMore(e.raw,e.name)?e.raw:"",e.note].filter(Boolean).join(" · ");
        if(note)o.note=note;
        if(e.w0!=null)o.w0=e.w0;
        if(e.timed)o.timed=true;
        if(e.side)o.side=true;
        if(e.amrap){o.amrap=true;o.lo=0;o.hi=0;}
        if(e.wk)o.wk=e.wk.slice();
        if(e.altName)o.alt=e.altName;
        return o;})};});
  (tp.acts||[]).forEach(function(a){
    days.push({name:exName(a.name),wd:byWeek?(a.wd||[]).slice():[],notes:[],
      ex:[{name:a.name,muscle:muscleOf(a.name),sets:1,lo:0,hi:0,rest:0,min:a.min||30,rpe:6}]});});
  var p={name:tp.name||"Imported program",tag:"imported",days:days,schedule:byWeek?"week":"cycle",
    notes:(tp.notes||[]).map(function(n){return {h:cap(n.h||""),t:n.t.slice()};}),start:startIso};
  if(tp.meta&&(tp.meta.phase||tp.meta.weeks))p.meta={phase:tp.meta.phase||"",weeks:tp.meta.weeks||0};
  return p;}

/* The names a draft would add to the library as the lifter's own. */
function newNames(tp){
  var have={},out=[];
  (LIB||[]).forEach(function(l){have[l[0].toLowerCase()]=1;});
  tp.days.forEach(function(d){d.ex.forEach(function(e){
    if(!e.name&&e.raw&&!have[e.raw.toLowerCase()]){have[e.raw.toLowerCase()]=1;out.push({n:e.raw,m:guessMuscle(e.raw)});}});});
  return out;}

export {guessMuscle, newNames, programFromDraft, tiexSheet, vTImport, withIds};

/* Bunyan — reading a training program
   A coach's program arrives as a PDF or pasted from a chat: days, each a table of
   exercises with sets × reps, rest and a starting weight, a cue under each, a week
   that says which day falls when, and pages of rules and reasons. This reads all of
   it into a draft the import screen shows in full — every day, every number — so
   nothing becomes a program until the lifter has looked at it and said so.

   It reads; it does not guess. A name the library does not know stays as written and
   is marked for a look. A dose it cannot read is left for the lifter to fill in. Prose
   is kept as notes, never turned into exercises.

   The PDF route works on positioned lines from pdfplan.js (linesOf): a table is read
   by its columns, which is how "3 × 6-8" lands in the sets field and "40 kg" in the
   weight, whatever order the coach laid them out in. Pasted text has no columns, so
   it is read line by line instead. */
import {EXDB, LIB} from "../data/exercises.js";
import {norm} from "./text.js";

/* ---- doses ---------------------------------------------------------------------
   "3 × 6-8", "3x8-10", "3 × 40-60s", "3 × max", "3 × 10-12 / leg", "2 × 10 / side",
   "3 × 15 each", "4 sets of 8", "12-15 min". Seconds and minutes make a timed set. */
var SIDE=/\/\s*(?:leg|side|arm)\b|\bper\s+(?:leg|side|arm)\b|\beach\s+(?:leg|side|arm)\b/i;
function doseOf(s){
  s=String(s||"").replace(/[×✕✖]/g,"x").replace(/[–—]/g,"-");
  var side=SIDE.test(s),each=!side&&/\beach\b/i.test(s);
  var m=/(\d+)\s*(?:x|sets?\s+(?:of|x)?)\s*(max|amrap|failure|\d+(?:\s*-\s*\d+)?)\s*(s\b|secs?\b|seconds?\b|min\b|mins\b|minutes?\b|reps?\b)?/i.exec(s);
  if(m){
    var sets=+m[1],r=m[2].toLowerCase(),u=(m[3]||"").toLowerCase();
    if(/max|amrap|failure/.test(r))return {sets:sets,lo:0,hi:0,amrap:true,side:side,each:each};
    var lh=r.split("-").map(function(x){return parseInt(x,10);});
    var lo=lh[0],hi=lh[1]||lh[0],timed=/^s/.test(u);
    if(/^min/.test(u)){lo*=60;hi*=60;timed=true;}
    if(!sets||!lo)return null;
    return {sets:Math.min(sets,12),lo:Math.min(lo,hi),hi:Math.max(lo,hi),timed:timed,side:side,each:each};}
  /* A dose with no sets: a block of minutes, or reps alone. */
  m=/(\d+)(?:\s*-\s*(\d+))?\s*(min\b|mins\b|minutes?\b|s\b|secs?\b|seconds?\b)/i.exec(s);
  if(m){var k=/^m/i.test(m[3])?60:1,a=+m[1]*k,b=(+m[2]||+m[1])*k;
    return {sets:1,lo:Math.min(a,b),hi:Math.max(a,b),timed:true,side:side,each:each};}
  m=/(\d+)(?:\s*-\s*(\d+))?\s*reps?\b/i.exec(s);
  if(m)return {sets:0,lo:+m[1],hi:+m[2]||+m[1],side:side,each:each};
  return null;}
/* Rest in seconds: "90s", "2 min", "1:30", "90". */
function restOf(s){
  s=String(s||"").trim();
  var m=/(\d+):(\d\d)/.exec(s);if(m)return +m[1]*60+ +m[2];
  m=/(\d+(?:\.\d+)?)\s*(?:-\s*\d+(?:\.\d+)?\s*)?(min|m\b|minutes?)/i.exec(s);if(m)return Math.round(+m[1]*60);
  m=/(\d+)\s*(?:-\s*\d+\s*)?(?:s\b|sec|seconds?)?/i.exec(s);if(m&&+m[1]>=10&&+m[1]<=600)return +m[1];
  return null;}
/* A starting weight in kg. A range starts at its light end; pounds are converted.
   Bodyweight is a weight too: nothing added. */
function weightOf(s){
  s=String(s||"").trim();
  if(/body\s*weight|^bw\b/i.test(s))return {w:0,bw:true};
  /* The whole cell is a weight, or it is not one: "see p.05" is not 5 kg. */
  var m=/^(?:@\s*)?(\d+(?:\.\d+)?)\s*(?:-\s*\d+(?:\.\d+)?\s*)?(kg|kgs|kilos?|lb|lbs|pounds?)?\s*$/i.exec(s);
  if(!m)return null;
  var v=+m[1];
  if(/^(lb|pound)/i.test(m[2]||""))v=Math.round(v*0.4536*2)/2;
  return v>0&&v<1000?{w:v}:null;}
/* "Weeks 1-4", "weeks 9-12", "week 5+": the stretch of the program an exercise
   belongs to. */
function weeksOf(s){
  var m=/weeks?\s*(\d+)\s*(?:-|to|–)\s*(\d+)/i.exec(String(s||""));
  if(m)return [+m[1],+m[2]];
  m=/weeks?\s*(\d+)\s*\+/i.exec(String(s||""));
  return m?[+m[1],99]:null;}

/* ---- names ----------------------------------------------------------------------
   What coaches call a movement, and what the library calls it. Tried before any
   scoring, so the common ones land exactly. Keys are normalised (lower case, plural
   s and punctuation gone). */
var KNOWN={
  "incline bench press":"Barbell Incline Bench Press - Medium Grip",
  "incline barbell bench press":"Barbell Incline Bench Press - Medium Grip",
  "bench press":"Barbell Bench Press - Medium Grip",
  "flat bench press":"Barbell Bench Press - Medium Grip",
  "barbell bench press":"Barbell Bench Press - Medium Grip",
  "incline dumbbell press":"Incline Dumbbell Press",
  "shoulder press machine":"Machine Shoulder (Military) Press",
  "machine shoulder press":"Machine Shoulder (Military) Press",
  "overhead press":"Standing Military Press","ohp":"Standing Military Press",
  "military press":"Standing Military Press",
  "dumbbell shoulder press":"Dumbbell Shoulder Press",
  "machine fly":"Pec Deck Fly","machine flye":"Pec Deck Fly","pec deck":"Pec Deck Fly",
  "cable fly":"Flat Bench Cable Flyes","cable crossover":"Flat Bench Cable Flyes",
  "lateral raise":"Side Lateral Raise","dumbbell lateral raise":"Side Lateral Raise",
  "rope tricep pushdown":"Triceps Pushdown - Rope Attachment",
  "rope pushdown":"Triceps Pushdown - Rope Attachment",
  "tricep pushdown":"Triceps Pushdown","triceps pushdown":"Triceps Pushdown",
  "overhead tricep extension":"Cable Rope Overhead Triceps Extension",
  "skull crusher":"EZ-Bar Skullcrusher",
  "lat pulldown":"Wide-Grip Lat Pulldown","wide grip lat pulldown":"Wide-Grip Lat Pulldown",
  "v grip lat pulldown":"V-Bar Pulldown","v bar lat pulldown":"V-Bar Pulldown","close grip lat pulldown":"Close-Grip Front Lat Pulldown",
  "t bar row chest supported":"Lying T-Bar Row","chest supported t bar row":"Lying T-Bar Row",
  "t bar row":"T-Bar Row with Handle",
  "seated row":"Seated Cable Rows","seated cable row":"Seated Cable Rows","cable row":"Seated Cable Rows",
  "barbell row":"Bent Over Barbell Row","bent over row":"Bent Over Barbell Row",
  "dumbbell row":"One-Arm Dumbbell Row","one arm dumbbell row":"One-Arm Dumbbell Row",
  "rear delt cable cross":"Cable Rear Delt Fly","rear delt fly":"Reverse Flyes","reverse fly":"Reverse Flyes",
  "rear delt cable fly":"Cable Rear Delt Fly","face pull":"Face Pull",
  "cable curl":"Standing Biceps Cable Curl","bicep curl":"Dumbbell Bicep Curl","biceps curl":"Dumbbell Bicep Curl",
  "dumbbell curl":"Dumbbell Bicep Curl","hammer curl":"Hammer Curls","preacher curl":"Preacher Curl",
  "ez bar curl":"EZ-Bar Curl","barbell curl":"Barbell Curl",
  "romanian deadlift":"Romanian Deadlift","rdl":"Romanian Deadlift","deadlift":"Barbell Deadlift",
  "squat":"Barbell Squat","back squat":"Barbell Squat","barbell squat":"Barbell Squat","front squat":"Front Barbell Squat",
  "hack squat":"Hack Squat","leg press":"Leg Press","leg extension":"Leg Extensions",
  "seated leg curl":"Seated Leg Curl","lying leg curl":"Lying Leg Curls","leg curl":"Seated Leg Curl",
  "hip thrust":"Barbell Hip Thrust","glute bridge":"Butt Lift (Bridge)",
  "bulgarian split squat":"Bulgarian Split Squat","split squat":"Split Squat with Dumbbells",
  "walking lunge":"Dumbbell Walking Lunge","lunge":"Dumbbell Walking Lunge",
  "calf raise":"Standing Calf Raises","standing calf raise":"Standing Calf Raises","seated calf raise":"Seated Calf Raise",
  "flat press machine":"Machine Bench Press","chest press machine":"Machine Chest Press","machine chest press":"Machine Chest Press",
  "machine bench press":"Machine Bench Press",
  "pull up":"Pullups","pullup":"Pullups","chin up":"Chin-Up","dip":"Dips - Triceps Version","push up":"Pushups",
  "plank":"Plank","side plank":"Side Bridge","farmer carry":"Farmer's Walk","farmer walk":"Farmer's Walk",
  "hanging leg raise":"Hanging Leg Raise","cable crunch":"Cable Crunch",
  "wall sit":"Wall Sit","glute bridge hold":"Glute Bridge Hold",
  "single leg calf raise":"Single-Leg Calf Raise",
  "knee to wall mobilisation":"Knee-to-Wall Ankle Mobilisation","knee to wall mobilization":"Knee-to-Wall Ankle Mobilisation",
  "knee to wall":"Knee-to-Wall Ankle Mobilisation",
  "single leg balance":"Single-Leg Balance",
  "isometric eversion":"Isometric Ankle Eversion","isometric inversion":"Isometric Ankle Inversion",
  "calf raise straight and bent knee":"Standing Calf Raises",
  "single leg rdl reach":"Single-Leg RDL Reach","single leg rdl":"Single-Leg RDL Reach",
  "mini hop":"Mini Hops","calf stretch":"Standing Gastrocnemius Calf Stretch",
  "nordic curl":"Nordic Hamstring Curl","nordic hamstring curl":"Nordic Hamstring Curl"
};
/* Words that describe how, not what: kept in the note, left out of the match. */
var NOISE=/\b(isometric|slow|paused?|tempo|light|heavy|controlled|eyes (?:open|closed)|barefoot|forward and lateral|into a wall|with a pause)\b/gi;
function key(s){
  /* Plural to singular for the match only — flyes, raises, curls, hops — by the
     trailing s alone, so "raises" and "raise" meet. Words that only look plural
     (press, cross, biceps, abs) are left as they are. */
  return norm(String(s||"").replace(/[-–—]/g," ")).split(" ").map(function(w){
      if(w==="tricep")return "triceps";if(w==="bicep")return "biceps";
      return w.length>=3&&/s$/.test(w)&&!/(ss|us|is|ceps|abs)$/.test(w)?w.slice(0,-1):w;})
    .join(" ").replace(/\s+/g," ").trim();}
var LIBKEYS=null,KN=null,BYKEY=null;
function libKeys(){
  if(LIBKEYS)return LIBKEYS;
  LIBKEYS=[];BYKEY={};KN={};
  (LIB||[]).forEach(function(l){var k=key(l[0]);LIBKEYS.push({n:l[0],k:k.split(" ")});if(!BYKEY[k])BYKEY[k]=l[0];});
  Object.keys(KNOWN).forEach(function(k){KN[key(k)]=KNOWN[k];});
  return LIBKEYS;}
/* The longest run of words, from either end, that is a name we know. */
function knownIn(k){
  if(KN[k])return KN[k];
  var w=k.split(" "),n,hit;
  for(n=w.length-1;n>=2;n--){
    hit=KN[w.slice(0,n).join(" ")]||KN[w.slice(w.length-n).join(" ")];
    if(hit)return hit;}
  return null;}
/* The best library name for what a coach wrote, and how sure that is: "exact" for a
   known name or the library's own, "close" for a strong word match, "" when nothing
   is close enough to offer. */
function matchExercise(raw){
  var s=String(raw||"").replace(/\(.*?\)/g," ").replace(/\s[—–-]\s.*$/,"");
  if(EXDB&&EXDB[raw])return {name:raw,conf:"exact"};
  libKeys();
  var kFull=key(s),k=key(s.replace(NOISE," ")),k2=key(s.replace(/,.*$/,"").replace(NOISE," "));
  /* The library's own name, however it was capitalised or punctuated. */
  if(BYKEY[kFull])return {name:BYKEY[kFull],conf:"exact"};
  if(BYKEY[k])return {name:BYKEY[k],conf:"exact"};
  /* A name coaches use for it. "T-Bar Row, chest supported" is a T-bar row first and
     a variant second, so the words before the comma are tried as well. */
  var hit=knownIn(kFull)||knownIn(k)||knownIn(k2);
  if(hit&&(EXDB&&EXDB[hit]))return {name:hit,conf:"exact"};
  var qt=k.split(" ").filter(Boolean);if(!qt.length)return {name:"",conf:""};
  var best=null,bs=0;
  libKeys().forEach(function(c){
    var hitN=0;qt.forEach(function(q){if(c.k.indexOf(q)>=0)hitN++;});
    if(!hitN)return;
    /* Every word the coach wrote should be there; extra words in the library name
       cost a little, so "Hack Squat" beats "Barbell Hack Squat" for "hack squat". */
    var sc=hitN/qt.length-0.08*(c.k.length-hitN);
    if(sc>bs){bs=sc;best=c.n;}});
  if(best&&bs>=0.75)return {name:best,conf:bs>=0.95?"exact":"close"};
  if(best&&bs>=0.5)return {name:best,conf:"close"};
  return {name:"",conf:""};}

/* The plan's own words say more than the library's name when they hold a word the
   name does not: "eyes closed", "machine", "isometric". "Incline Bench Press" says
   nothing "Barbell Incline Bench Press - Medium Grip" does not. */
function saysMore(raw,name){
  if(!raw||!name)return false;
  var have={};key(name).split(" ").forEach(function(w){have[w]=1;});
  return key(raw).split(" ").some(function(w){return w&&!have[w]&&!/^(and|or|the|a|with|of)$/.test(w);});}
/* ---- one exercise from its cells ------------------------------------------------ */
function cleanName(s){
  return String(s||"").replace(/^\s*(?:\d{1,2}|[a-z]\d?)[.):]?\s+(?=\S)/i,"").replace(/\s+/g," ").trim();}
function exOf(cells){
  var raw=cleanName(cells.name);
  if(!raw)return null;
  var alt="",m=/^(.*?)\s+or\s+(.*)$/i.exec(raw);
  /* "Pull-Ups or Seated Row": the first is the plan, the other a ready swap. */
  if(m){raw=m[1].trim();alt=m[2].trim();}
  var iso=/isometric/i.test(cells.name);
  var d=doseOf(cells.dose||"")||{};
  var e={raw:cleanName(cells.name),sets:d.sets||3,lo:d.lo||0,hi:d.hi||0,timed:!!(d.timed||iso&&d.lo>=10),
         side:!!d.side,amrap:!!d.amrap,rest:restOf(cells.rest||""),note:[],alt:alt,dose:cells.dose||""};
  if(!d.sets&&!d.lo)e.check=true;
  var w=weightOf(cells.w||"");
  if(w&&!w.bw)e.w0=w.w;
  var wk=weeksOf(cells.phase||"");
  if(wk)e.wk=wk;
  if(cells.phase&&!wk&&/every|all/i.test(cells.phase))e.note.push(cells.phase);
  if(cells.why)e.note.push(cells.why);
  var mt=matchExercise(raw);
  e.name=mt.name;e.conf=mt.conf;
  if(alt){var ma=matchExercise(alt);e.altName=ma.name;e.note.push("or "+alt);}
  return e;}

/* ---- the PDF -------------------------------------------------------------------- */
var WD={sun:7,sunday:7,mon:1,monday:1,tue:2,tues:2,tuesday:2,wed:3,wednesday:3,thu:4,thur:4,thurs:4,thursday:4,
        fri:5,friday:5,sat:6,saturday:6};
var COLS=[["name",/^(exercise|movement|lift|exercises)$/i],["dose",/^(sets?\s*[x×]\s*reps?|sets?|reps?|dose|volume|prescription)$/i],
          ["rest",/^rest$/i],["w",/^(start|weight|load|kg|starting weight|start weight)$/i],["phase",/^(phase|weeks?|when)$/i],
          ["why",/^(why|notes?|cues?|tips?|coaching)$/i]];
function colsOf(L){
  var c={},n=0;
  L.segs.forEach(function(sg){
    var t2=sg.t.replace(/\s+/g," ").trim();
    COLS.forEach(function(r){if(c[r[0]]==null&&r[1].test(t2)){c[r[0]]=sg.x;n++;}});});
  return c.name!=null&&c.dose!=null&&n>=2?c:null;}
/* Which column a segment sits in: the nearest header to its left. */
function cellsOf(L,cols){
  var out={},keys=Object.keys(cols).sort(function(a,b){return cols[a]-cols[b];});
  L.segs.forEach(function(sg){
    var k=null;
    for(var i=0;i<keys.length;i++)if(sg.x>=cols[keys[i]]-12)k=keys[i];
    if(!k)k=keys[0];
    out[k]=(out[k]?out[k]+" ":"")+sg.t;});
  return out;}
var LOGROW=/^(today.?s log|workout log|log\b|date\b)/i;
function isFooter(L){var last=L.segs[L.segs.length-1];return L.y<50&&last&&/^\d{1,3}$/.test(last.t);}
var DAYHEAD=/^day\s+([a-z0-9]{1,2})$/i,DAYLINE=/^day\s+([a-z0-9]{1,2})\s*[—–:\-]\s*(.+)$/i;
var DAYNOTES=/session notes|notes for (?:today|this day)|coach.?s? notes|day notes/i;

function fromPages(pages,title){
  var days=[],blocks=[],notes=[],schedule={},meta={};
  /* cur: the day being read, and the page it began on. table: the table being read.
     gap: the headings met since the last table, which name a table that turns out to
     be a block of its own. inLog: inside a printed log grid, which is all blanks. */
  var cur=null,curPage=-1,table=null,lastEx=null,sect=null,gap=null,inLog=false;
  function newDay(code,name,pi){
    var have=code&&days.filter(function(d){return d.code===code;})[0];
    cur=have||{code:code||"",name:name||"",focus:"",ex:[],notes:[]};
    if(!have)days.push(cur);
    curPage=pi;table=null;lastEx=null;sect=null;gap=null;inLog=false;}
  pages.forEach(function(lines,pi){
    inLog=false;
    lines.forEach(function(L,li){
      var t2=L.t.trim();
      if(!t2||L._used||isFooter(L))return;
      if(LOGROW.test(t2)){table=null;lastEx=null;sect=null;inLog=true;return;}
      if(inLog&&(L.segs.length>=3||/^[#\d]/.test(t2)))return;
      if(/^\d{1,3}$/.test(t2))return;
      /* The stat row on a cover: phase, sessions a week, length. */
      if(L.head&&/^phase$/i.test(L.segs[0].t)){
        var nx=lines[li+1];
        if(nx){nx._used=true;
          L.segs.forEach(function(sg){
            var v=nx.segs.filter(function(o){return Math.abs(o.x-sg.x)<10;})[0];if(!v)return;
            var k=sg.t.toLowerCase();
            if(k==="phase")meta.phase=v.t;
            else if(k==="length"){var wk=/(\d+)\s*weeks?/i.exec(v.t);if(wk)meta.weeks=+wk[1];}});}
        return;}
      /* A week laid out by weekday: the names, then what falls on each. */
      var wds=L.segs.filter(function(sg){return WD[sg.t.toLowerCase()];});
      if(wds.length>=5){
        var nx2=lines[li+1];
        if(nx2){nx2._used=true;
          wds.forEach(function(sg){
            var v=nx2.segs.filter(function(o){return Math.abs(o.x-sg.x)<14;})[0];
            schedule[WD[sg.t.toLowerCase()]]=v?v.t:"";});}
        table=null;sect=null;return;}
      /* A day: "DAY A" on its own with its name under it, or "Day 2 — Pull". */
      var dm=DAYHEAD.exec(t2),dl=!dm&&DAYLINE.exec(t2);
      if(dm||dl){
        var code=(dm||dl)[1].toUpperCase(),name=dl?dl[2]:"",focus="";
        if(dm){var n1=lines[li+1],n2=lines[li+2];
          if(n1&&n1.t.length<40&&!colsOf(n1)){name=n1.t;n1._used=true;
            if(n2&&/[·•]/.test(n2.t)&&n2.t===n2.t.toUpperCase()){focus=n2.t;n2._used=true;}}}
        newDay(code,name,pi);if(focus)cur.focus=focus;return;}
      var cols=colsOf(L);
      if(cols){
        /* A table on a later page than its day's, after headings of its own, is a
           block — "the rehab block" — not more of the day. A day that points at it
           gets its exercises in that place. */
        if(!cur||(pi!==curPage&&gap&&gap.head)){
          var b={name:gap&&(gap.line||gap.head)||"Block",head:gap&&gap.head||"",ex:[],notes:[]};
          blocks.push(b);table={cols:cols,into:b};}
        else table={cols:cols,into:cur};
        sect=null;gap=null;lastEx=null;return;}
      if(table){
        if(L.head){table=null;lastEx=null;}
        else{
          var c=cellsOf(L,table.cols);
          if(c.dose&&c.name){var e=exOf(c);if(e){table.into.ex.push(e);lastEx=e;}return;}
          /* A line under a row, in the name column or indented from it: its cue. */
          if(lastEx&&L.segs.length===1&&!doseOf(t2)){lastEx.note.push(t2);return;}
          table=null;lastEx=null;}}
      if(L.head){
        gap=gap||{};
        if(!gap.head&&!DAYNOTES.test(t2))gap.head=t2;
        sect={h:t2,t:[]};
        if(DAYNOTES.test(t2)&&cur&&pi===curPage)sect.day=cur;
        else notes.push(sect);
        return;}
      if(gap&&!gap.line&&L.segs.length===1&&t2.length<40)gap.line=t2;
      if(sect&&L.segs.length<=2)(sect.day?sect.day.notes:sect.t).push(t2);});});
  /* A row such as "ANKLE BLOCK · 12-15 min · see p.05" is the block, in its place. */
  days.forEach(function(d){
    var out=[];
    d.ex.forEach(function(e){
      var bm=/^(.*?)\s*block$/i.exec(e.raw),word=bm&&bm[1].trim().replace(/[^\w\s]/g,"");
      var b=bm&&blocks.filter(function(x){return word&&new RegExp(word,"i").test(x.name+" "+x.head);})[0];
      if(!b&&bm&&blocks.length===1)b=blocks[0];
      if(b){b.used=true;
        b.ex.forEach(function(x,i){var y=JSON.parse(JSON.stringify(x));
          if(i===0&&e.note.length)y.note=e.note.concat(y.note);
          y.block=b.name;out.push(y);});}
      else out.push(e);});
    d.ex=out;});
  blocks.forEach(function(b){if(!b.used&&b.ex.length)days.push({code:"",name:b.name,focus:"",ex:b.ex,notes:b.notes});});
  /* A cover's lines in capitals, or a heading with only a subtitle under it, say
     nothing a note needs to keep. */
  notes=notes.filter(function(n){
    return n.t.length&&!n.t.every(function(x){return x===x.toUpperCase();})&&!n.t.every(function(x){return x.length<40;});});
  return finish({name:titleOf(title,pages),days:days,schedule:schedule,notes:notes,meta:meta});}
/* A PDF breaks a paragraph wherever its line ran out. A line that does not end a
   sentence, followed by one that carries on in lower case, is one line. */
function paras(ls){
  var out=[];
  (ls||[]).forEach(function(l){
    var prev=out[out.length-1];
    if(prev&&!/[.!?:)]$/.test(prev)&&/^[a-z0-9(]/.test(l))out[out.length-1]=prev+" "+l;
    else out.push(l);});
  return out;}

function titleOf(title,pages){
  var t2=String(title||"").replace(/\s*program(me)?\s*$/i,"").trim();
  if(t2&&!/untitled|unspecified|anonymous|microsoft|document/i.test(t2))return t2;
  var first=(pages[0]||[]).filter(function(L){return !L.head&&L.t.length<30;}).map(function(L){return L.t;});
  return first.slice(0,2).join(" / ")||"Imported program";}

/* ---- pasted text ------------------------------------------------------------------
   "Day 1 — Push" or "Monday: Chest" starts a day; a line with a dose is an exercise;
   anything else under an exercise is its note. */
var TXT_DAY=/^(?:(day\s*[a-z0-9]{1,2})|(mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)[a-z]*)\b\s*[—–:\-.]?\s*(.*)$/i;
var DOSE_AT=/(\d+\s*(?:[x×✕]|sets?\s+(?:of|x)?)\s*(?:max|amrap|failure|\d+(?:\s*[-–]\s*\d+)?)\s*(?:s\b|secs?\b|seconds?\b|min\b|mins?\b|minutes?\b|reps?\b)?)/i;
var DOSE_AT2=/(\d+(?:\s*[-–]\s*\d+)?\s*(?:min\b|mins?\b|minutes?\b|s\b|secs?\b|seconds?\b|reps?\b))/i;
function exLine(l){
  var at=DOSE_AT.exec(l)||DOSE_AT2.exec(l);
  if(!at)return null;
  var name=l.slice(0,at.index).replace(/[:—–\-,@|]+\s*$/,"").trim();
  if(!name)return null;
  var tail=l.slice(at.index+at[0].length),sm=SIDE.exec(tail);
  var rest=/(\d+(?::\d\d)?\s*(?:s|sec|secs|seconds|min|mins|minutes)?)\s*rest\b/i.exec(tail)||/\brest\s*:?\s*(\d+(?::\d\d)?\s*(?:s|sec|secs|seconds|min|mins|minutes)?)/i.exec(tail);
  var w=/(\d+(?:\.\d+)?\s*(?:-\s*\d+(?:\.\d+)?\s*)?(?:kg|kgs|lb|lbs))\b/i.exec(tail)||/\b(bodyweight)\b/i.exec(tail);
  var cue=/[—–]\s*(.+)$/.exec(tail)||/\(([^)]+)\)\s*$/.exec(tail);
  return exOf({name:name,dose:at[0]+(sm?" "+sm[0]:""),rest:rest?rest[1]:"",w:w?w[1]:"",why:cue?cue[1]:""});}
function fromText(text){
  var days=[],cur=null,last=null,notes=[],sect=null;
  var ls=String(text||"").split(/\r?\n/).map(function(x){return x.replace(/^[\s•▪◦*·\-–—]+/,"").trim();});
  function nextLine(i){for(var j=i+1;j<ls.length;j++)if(ls[j])return ls[j];return "";}
  function day(code,name,wd){cur={code:code,name:name,focus:"",ex:[],notes:[],wd:wd?[wd]:[]};days.push(cur);last=null;sect=null;}
  ls.forEach(function(l,i){
    if(!l){last=null;return;}
    var e=exLine(l);
    if(e){if(!cur)day("","Day 1",0);cur.ex.push(e);last=e;return;}
    var dm=TXT_DAY.exec(l);
    if(dm){
      day(dm[1]?dm[1].replace(/day\s*/i,"").toUpperCase():"",
          (dm[3]||"").replace(/^[—–:\-.\s]+/,"")||dm[1]||dm[2],dm[2]?WD[dm[2].toLowerCase()]:0);
      return;}
    /* A short line with an exercise straight after it names a day: "Push", "Upper A",
       "Legs:". */
    if(l.length<40&&!/[.!?]$/.test(l)&&exLine(nextLine(i))){day("",l.replace(/:$/,""),0);return;}
    if(last){last.note.push(l);return;}
    /* A line in capitals, or ending in a colon, heads a run of notes. */
    if(/:$/.test(l)||(l===l.toUpperCase()&&/[A-Z]/.test(l)&&l.length<60)){
      sect={h:l.replace(/:$/,""),t:[]};notes.push(sect);return;}
    if(cur&&!cur.ex.length&&!cur.focus){cur.focus=l;return;}
    if(sect)sect.t.push(l);else if(cur)cur.notes.push(l);
    else{sect={h:"",t:[l]};notes.push(sect);}});
  return finish({name:"",days:days,schedule:{},notes:notes.filter(function(n){return n.t.length;}),meta:{}});}

/* ---- the draft ----------------------------------------------------------------------
   Every exercise ends with its fields filled the way the app keeps them; the week is
   turned into weekdays for each day, and the days that are not lifting (a walk, a match)
   become activities. */
var ACT=[[/walk/i,"Walking",30],[/football|soccer|match|game/i,"Football",60],[/run|jog/i,"Running",30],
         [/cycl|bike/i,"Cycling",45],[/swim/i,"Swimming",30],[/padel/i,"Padel",60],[/tennis/i,"Tennis",60],
         [/basket/i,"Basketball",60],[/yoga/i,"Yoga",45],[/mobility|stretch/i,"Stretching",20]];
function finish(r){
  r.notes.forEach(function(n){n.t=paras(n.t);});
  r.days.forEach(function(d,i){
    /* The name as it will be saved, so the review shows exactly that. */
    if(!d.name)d.name=d.code?"Day "+d.code:"Day "+(i+1);
    else if(d.code&&!/^day\b/i.test(d.name))d.name="Day "+d.code+" — "+d.name;
    d.wd=d.wd||[];d.notes=paras(d.notes);
    d.ex.forEach(function(e){
      e.note=(e.note||[]).filter(Boolean).join(" · ");
      if(!e.lo&&!e.amrap){e.lo=e.timed?30:8;e.hi=e.timed?30:12;e.check=true;}
      /* No rest given: a block of rehab or mobility work moves along; lifting rests. */
      if(e.rest==null)e.rest=e.block?30:e.timed?45:90;});});
  var acts={};
  Object.keys(r.schedule).forEach(function(k){
    var v=String(r.schedule[k]||"").trim(),wd=+k,m=/^day\s+([a-z0-9]{1,2})$/i.exec(v);
    if(m){var d=r.days.filter(function(x){return x.code===m[1].toUpperCase();})[0];if(d&&d.wd.indexOf(wd)<0)d.wd.push(wd);return;}
    if(!v||/^(rest|off|—|-)$/i.test(v))return;
    var a=ACT.filter(function(x){return x[0].test(v);})[0];
    if(!a)return;
    (acts[a[1]]=acts[a[1]]||{name:a[1],min:a[2],label:v,wd:[]}).wd.push(wd);});
  r.acts=Object.keys(acts).map(function(k){return acts[k];});
  r.byWeek=r.days.some(function(d){return d.wd.length;});
  if(!r.name)r.name="Imported program";
  return r;}

/* Pages from pdfplan.readPdfLines, or pasted text. */
function readSplit(src){
  if(src&&src.pages)return fromPages(src.pages,src.title);
  return fromText(src);}

export {doseOf, matchExercise, readSplit, restOf, saysMore, weightOf, weeksOf};

/* Bunyan — exercises
   The exercise library and its lookups, loaded from exercises.json. */
import {S} from "../state.js";
import {esc} from "../util.js";

/* ============================================================ exercise library */
/* n=name m=muscle e=equipment c=compound */
var LIB=[];            /* built from exercises.json: every entry has illustrations */
function buildLIB(){
  LIB.length=0;
  if(!EXDB)return;
  Object.keys(EXDB).sort().forEach(function(n){
    var v=EXDB[n];
    LIB.push([n,v.m,v.e,v.c,v.d,v.p,v.x||[]]);
  });
  /* LIB is rebuilt from exercises.json on every load, so anything the user added
     has to be folded back in or it disappears on the next open. */
  ((typeof S!=="undefined"&&S.myEx)||[]).forEach(function(m){
    if(EXDB[m.n])return;
    LIB.push([m.n,m.m||"Other","Other",0]);});
}
var EQUIP=["Bodyweight","Barbell","Dumbbell","Cable","Machine","Kettlebell","Band","Other"];
var MUSCLES=["Chest","Back","Shoulders","Biceps","Triceps","Forearms","Quads",
             "Hamstrings","Glutes","Adductors","Calves","Core","Neck"];
var PATTERNS=[
 [/Deadlift|Romanian|RDL|Good Morning|Hip Thrust|Pull Through|Swing|Back Extension|Hyperext/i,"Hinge"],
 [/Squat|Leg Press|Lunge|Step[- ]?Up|Split Squat|Hack|Pistol|Sissy/i,"Squat"],
 [/Row|Pulldown|Pull-Up|Chin-Up|Pullover|Shrug|Pull-Apart|Face Pull/i,"Pull"],
 [/Bench|Press|Push-Up|Dip|Push Press/i,"Push"],
 [/Curl/i,"Elbow flexion"],
 [/Extension|Pushdown|Skull|Kickback/i,"Elbow extension"],
 [/Raise|Fly|Flyes|Delt|Lateral/i,"Isolation"],
 [/Carry|Hold|Plank|Sit|Balance|Hang/i,"Isometric"],
 [/Stretch|Mobil|Rotation|Cat Cow|90\/90|Dislocate/i,"Mobility"],
 [/Crunch|Raise \(|Twist|Woodchop|Dead Bug|Bird Dog|Hollow|Toes to Bar/i,"Core"],
 [/Run|Bike|Row Machine|Jump|Burpee|Sled|Rope|Walk|Swim|Elliptical|Stair/i,"Conditioning"]
];
function patternOf(n){
  var v=EXDB&&EXDB[n];
  if(v&&v.p)return v.p;
  for(var i=0;i<PATTERNS.length;i++)if(PATTERNS[i][0].test(n))return PATTERNS[i][1];
  return "Isolation";}
var SECONDARY={
  Chest:{Push:["Triceps","Front delts"]},
  Back:{Pull:["Biceps","Rear delts"],Hinge:["Hamstrings","Glutes","Forearms"]},
  Shoulders:{Push:["Triceps","Upper chest"],Isolation:["Traps"],Pull:["Traps"]},
  Quads:{Squat:["Glutes","Hamstrings"],Isolation:[]},
  Hamstrings:{Hinge:["Glutes","Lower back"],Isolation:["Calves"]},
  Glutes:{Hinge:["Hamstrings","Lower back"],Squat:["Quads"]},
  Biceps:{"Elbow flexion":["Forearms"]},
  Triceps:{"Elbow extension":["Front delts"],Push:["Chest","Front delts"]},
  Core:{Core:["Hip flexors"],Isometric:["Shoulders","Glutes"]},
  Calves:{Isolation:[]}
};
function secondaryOf(n){
  var v=EXDB&&EXDB[n];
  if(v&&v.x&&v.x.length)return v.x;
  var m=muscleOf(n),p=patternOf(n);
  var byM=SECONDARY[m];
  if(byM&&byM[p])return byM[p];
  if(byM){var k=Object.keys(byM)[0];return byM[k]||[];}
  return [];}
var HARD=/Pistol|Handstand|Nordic|Muscle-Up|Snatch|Deficit|Sissy|L-Sit|Ab Wheel|Archer|Zercher|Wall Walk|Glute Ham/i;
var EASY=/Machine|Cable|Assisted|Seated|Smith|Band|Stretch|Walk|Plank|Bodyweight Squat|Push-Ups/i;
function difficultyOf(n){
  var v=EXDB&&EXDB[n];
  if(v&&v.d)return v.d;
  if(HARD.test(n))return "Advanced";
  if(isCompound(n)&&/Barbell|Deadlift|Squat|Bench|Overhead Press|Row|Clean/i.test(n))return "Intermediate";
  if(EASY.test(n))return "Beginner";
  return "Intermediate";}
var EXDB=null, EXDB_TRIED=false;
var IMG_BASE="https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/";
var EXINS=null;
function loadExDB(cb){
  if(EXDB){cb&&cb();return;}
  if(EXDB_TRIED){cb&&cb();return;}
  EXDB_TRIED=true;
  fetch("exercises.json").then(function(r){return r.json();})
    .then(function(j){EXDB=j;buildLIB();cb&&cb();})
    .catch(function(){EXDB={};buildLIB();cb&&cb();});
}
function loadInstructions(cb){
  if(EXINS){cb();return;}
  fetch("instructions.json").then(function(r){return r.json();})
    .then(function(j){EXINS=j;cb();}).catch(function(){EXINS={};cb();});
}
function exMedia(n){return (EXDB&&EXDB[n])||null;}
/* The shipped instructions are reference documentation, not gym cues. These are the
   phrases that carry no information at all — step 5 on most exercises is "Repeat for
   the recommended amount of repetitions", the same sentence on hundreds of entries.

   This makes the text shorter, not better. Rewriting 868 sets by hand is content
   work, and doing it with a model would need a keyed API this app deliberately does
   not have. Trimming and collapsing is what can honestly be done here. */
var FILLER=[
  /repeat for the recommended amount/i,
  /this will be your starting position/i,
  /return to the starting position/i,
  /^\s*repeat\.?\s*$/i,
  /for the desired (number|amount) of repet/i,
  /^\s*(and )?repeat (the movement|this)\b/i
];
var PAD=[
  [/\bslowly and (?:carefully|under control)\b/gi,"slowly"],
  [/\b(?:make|be) sure (?:that )?(?:you|to)\b/gi,""],
  [/\bas you (?:breathe|exhale|inhale)[^,.]*/gi,""],
  [/\bat this point,?\s*/gi,""],
  [/\bin order to\b/gi,"to"],
  [/\bTip:\s*/gi,""],
  [/\s{2,}/g," "],
  [/\s+([,.])/g,"$1"]
];
function trimStep(s){
  s=String(s||"");
  for(var i=0;i<PAD.length;i++)s=s.replace(PAD[i][0],PAD[i][1]);
  s=s.replace(/^[\s,;.]+/,"").trim();
  if(s)s=s.charAt(0).toUpperCase()+s.slice(1);
  return s;
}
function exSteps(n){
  var raw=(EXINS&&EXINS[n])||null;
  if(!raw)return null;
  var out=[];
  for(var i=0;i<raw.length;i++){
    var s=String(raw[i]||""),junk=false;
    for(var j=0;j<FILLER.length;j++)if(FILLER[j].test(s)){junk=true;break;}
    if(junk)continue;
    s=trimStep(s);
    if(s.length>3)out.push(s);
  }
  return out.length?out:null;
}
function exImg(n,idx){
  var m=exMedia(n); if(!m)return null;
  return IMG_BASE+m.i+"/"+(idx||0)+".jpg";}
/* One shape for every empty state: an icon, what is missing, and the action that
   fixes it. cta is raw markup so callers can pass whatever button they need. */
var EI={
  dumbbell:'<path d="M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12"/>',
  chart:'<path d="M3 17l5-6 4 4 5-7 4 5"/><path d="M3 21h18"/>',
  plate:'<path d="M6 3v8a3 3 0 003 3v7M6 3v5M9 3v5M18 3c-1.5 2-2 4-2 7h4V3z"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  cloud:'<path d="M6 18h11a4 4 0 000-8 6 6 0 00-11.5 2A3.5 3.5 0 006 18z"/><path d="M2 2l20 20"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'
};
function empty(icon,title,line,cta){
  return '<div class="empty"><div class="empty-i" aria-hidden="true">'
   +'<svg viewBox="0 0 24 24">'+(EI[icon]||EI.dumbbell)+'</svg></div>'
   +'<h3>'+esc(title)+'</h3>'
   +(line?'<p class="tiny">'+esc(line)+'</p>':'')
   +(cta?'<div class="empty-a">'+cta+'</div>':'')
   +'</div>';}
function dumbbellIcon(px){
  return '<svg viewBox="0 0 24 24" width="'+px+'" height="'+px+'" aria-hidden="true">'
    +'<path d="M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12" stroke="currentColor" fill="none" '
    +'stroke-width="1.8" stroke-linecap="round"/></svg>';}
/* Photos come off a CDN, so the first view of any exercise is a network round trip.
   Hold the space with a shimmer instead of letting the layout jump, and fall back to
   the dumbbell glyph when the image never arrives. */
function thumb(n,size){
  var u=exImg(n,0);
  size=size||44;
  if(!u)return '<div class="thumb ph" style="width:'+size+'px;height:'+size+'px">'
    +dumbbellIcon(Math.round(size*0.5))+'</div>';
  return '<span class="thumbwrap skel" style="width:'+size+'px;height:'+size+'px">'
    +'<i class="thumbfall">'+dumbbellIcon(Math.round(size*0.5))+'</i>'
    +'<img class="thumb" loading="lazy" src="'+u+'" alt="" '
    +'style="width:'+size+'px;height:'+size+'px" '
    +'onload="this.parentNode.classList.remove(\'skel\')" '
    +'onerror="this.parentNode.classList.remove(\'skel\');'
    +'this.parentNode.classList.add(\'failed\');this.remove()"></span>';}
function libFind(n){var v=EXDB&&EXDB[n];return v?[n,v.m,v.e,v.c]:null;}
function hasGear(n){
  if(!S.gear||!S.gear.length)return true;
  var v=EXDB&&EXDB[n]; if(!v)return true;
  if(v.e==="Bodyweight")return true;
  return S.gear.indexOf(v.e)>=0;}
function isFav(n){return S.favs.indexOf(n)>=0;}

/* Exclusions are gone; gear is the only filter left. */
function pickable(n){return hasGear(n);}
function muscleOf(n){var v=EXDB&&EXDB[n];return v?v.m:"Other";}
function isCompound(n){var v=EXDB&&EXDB[n];return v?!!v.c:/Press|Squat|Deadlift|Row|Pull|Lunge|Dip/i.test(n);}


export {exAlias, exShort, exVariant, loadable, difficultyOf, empty, EQUIP, EXDB, exImg, exMedia, exSteps, isCompound, isFav, LIB, libFind, loadExDB, loadInstructions, muscleOf, MUSCLES, patternOf, pickable, secondaryOf, thumb};

/* Plate maths only means something on a loaded bar. On a machine, a cable or your
   own bodyweight the button was there on every exercise and useful on a handful.
   EZ-bar movements come through exercises.json as Barbell, and the name carries the
   distinction, so both are caught here. */
function loadable(n){
  var v=EXDB&&EXDB[n];
  if(v&&v.e)return v.e==="Barbell";
  return /barbell|\bez\b|e-?z bar|smith/i.test(String(n));
}

/* ---- names -------------------------------------------------------------
   free-exercise-db packs two different things into the name field, and they are
   not the same thing:
     dash     usually a real variant  — "Triceps Pushdown - Rope Attachment"
     brackets usually an alternate name — "Hyperextensions (Back Extensions)"
   One belongs in a pill beside the muscle; the other is just another word for the
   same movement and belongs in the alias list.

   The full name stays the key. Nothing stored is rewritten, so saved splits, logged
   sessions, favourites and records all keep resolving with no migration and no risk
   of an existing day failing to find its exercises. This is display only. */
var NPARTS={};
function nameParts(full){
  var k=String(full);
  if(NPARTS[k])return NPARTS[k];
  var alias="",variant="",n=k;
  n=n.replace(/\s*\(([^)]+)\)\s*/g,function(_,inner){alias=inner.trim();return " ";});
  var d=n.split(/\s[-–]\s+/);
  if(d.length>1){n=d[0];variant=d.slice(1).join(" – ").trim();}
  n=n.replace(/\s+/g," ").trim();
  return (NPARTS[k]={name:n||k,variant:variant,alias:alias});
}
function exShort(n){return nameParts(n).name;}
function exVariant(n){return nameParts(n).variant;}
function exAlias(n){return nameParts(n).alias;}

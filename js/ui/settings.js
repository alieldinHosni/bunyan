/* Bunyan — settings
   The sheets the Profile tab opens: You, Training, App, Profiles on this phone, Backup
   and reset, the backup itself, sharing, and About. sheets.js frames them (the kicker,
   the ✕, the drag to close); this writes what is inside.

   One grammar for all of them, as a phone's own settings have: groups of rows on a
   card, each group with a small heading and, where it needs one, a footnote under it.
   A row is one of four things and looks it:
     - an on/off setting is a switch, and the whole row flips it;
     - a choice among two or three is a segmented control, every option in sight,
       rather than a value that changes on each tap (Standard → Aggressive → …);
     - a longer choice (activity, goal) is a list with a tick;
     - a row that opens somewhere else has a chevron.
   Nothing here is a native drop-down, and no raw backup text is on screen unless
   asked for. */
import {t} from "../i18n/dict.js";
import {exName, planName} from "../i18n/exnames.js";
import {GOAL_ORDER, GOALS} from "../data/goals.js";
import {backupAgeDays, lastWeight} from "../engine/formulas.js";
import {wdName, weekStart} from "../engine/schedule.js";
import {buildSnapshot, snapStats} from "../engine/share.js";
import {planSummary} from "../engine/planshare.js";
import {CUR, PROFILES, S} from "../state.js";
import {fmtW, toDisp, wUnit} from "../units.js";
import {esc, fmtN, num, shortd} from "../util.js";
import {canBuzz, seg, V} from "./view.js";
import {iconOf, modeOf, themeOf, THEMES} from "./theme.js";
import {glyph} from "./glyphs.js";
import {afTile} from "./views/addfood.js";
import {histSheet} from "./views/chat.js";

/* ---- the grammar ------------------------------------------------------------------ */
function group(title,rows,foot){
  return '<section class="sg">'+(title?'<h3 class="sg-h">'+esc(title)+'</h3>':'')
   +'<div class="sg-list">'+rows+'</div>'+(foot?'<p class="sg-f">'+foot+'</p>':'')+'</section>';}
function words(name,sub){
  return '<span class="srow-t"><span class="srow-n">'+esc(name)+'</span>'+(sub?'<span class="srow-s">'+esc(sub)+'</span>':'')+'</span>';}
/* A switch: the row is the control, so the whole width answers a thumb. */
function sw(attr,name,sub,on){
  return '<button class="srow" '+attr+' role="switch" aria-checked="'+(on?"true":"false")+'">'+words(name,sub)
   +'<span class="tgl'+(on?' on':'')+'" aria-hidden="true"><i></i></span></button>';}
/* A choice among a few, all of them in sight. */
function pick(name,sub,o){
  o.soft=true;
  return '<div class="srow srow-pick">'+words(name,sub)+seg(o)+'</div>';}
/* Every choice in settings is the soft segment: the chosen one tinted and edged in
   the accent rather than filled with it, so a sheet of choices is not a sheet of red;
   the filled accent stays for the button a sheet leads to. */
/* Somewhere else: a chevron, and what is there now. */
function nav(attr,name,sub,val,gl){
  return '<button class="srow" '+attr+'>'+(gl?'<span class="gtile">'+glyph(gl)+'</span>':'')+words(name,sub)
   +(val!=null&&val!==''?'<span class="srow-v">'+esc(val)+'</span>':'')
   +'<span class="ico ico-chev" aria-hidden="true"></span></button>';}
/* A longer choice: one row per option, the chosen one ticked. */
function choose(field,cur,opts){
  return '<div class="sg-list" role="radiogroup">'+opts.map(function(o){
    var on=String(o[0])===String(cur);
    return '<button class="srow srow-opt'+(on?' on':'')+'" role="radio" aria-checked="'+on+'" data-ypick="'+esc(field+"|"+o[0])+'">'
     +words(o[1],o[2])+'<span class="srow-tick">'+(on?glyph("check"):'')+'</span></button>';}).join("")+'</div>';}

/* ---- You -------------------------------------------------------------------------- */
/* Sex, activity and goal are picked here and kept with the sheet (V.sd) until Save, as
   the three numbers are; nothing changes until then. */
var ACTIVITY=[[1.2,"Desk, no training"],[1.375,"Light, 1-3 days"],[1.4,"Desk plus 3 lifts"],
  [1.55,"Moderate, 4-5 days"],[1.725,"Heavy, 6+ days"]];
function youSheet(){
  var yp=S.profile,d=V.sd||{};
  var sex=d.p_sex||yp.sex||"m",act=d.p_act!=null?+d.p_act:+yp.activity,goal=d.p_goal||yp.goal;
  return '<h2>'+t("You")+'</h2><p class="tiny">'+t("These drive your calorie and macro estimates.")+'</p>'
   +'<div class="aftiles ng3 yt">'
   +afTile("p_age",t("Age"),t("yrs"),yp.age,"30","numeric")
   +afTile("p_height",t("Height"),t("cm"),yp.height,"175","numeric")
   /* Empty until entered: a figure here would be saved as this person's weight. */
   +afTile("p_weight",t("Weight"),wUnit(),(lastWeight()||num(yp.weight))?toDisp(lastWeight()||yp.weight):"","80","decimal")
   +'</div>'
   +'<section class="sg"><h3 class="sg-h">'+t("Sex")+'</h3>'
   +seg({items:[["p_sex|m",t("Male")],["p_sex|f",t("Female")]],value:"p_sex|"+sex,attr:"ypick",key:"ysex",label:t("Sex"),soft:true})
   +'</section>'
   +'<section class="sg"><h3 class="sg-h">'+t("Activity")+'</h3>'
   +choose("p_act",act,ACTIVITY.map(function(a){return [a[0],t(a[1])];}))+'</section>'
   +'<section class="sg"><h3 class="sg-h">'+t("Goal")+'</h3>'
   /* The one list of goals (js/data/goals.js), the same the assessment offers. */
   +choose("p_goal",goal,GOAL_ORDER.map(function(k){return [k,t(GOALS[k].label),t(GOALS[k].desc||"")];}))+'</section>'
   +'<p class="sg-f">'+t("Your calorie and protein targets are worked out from these, in Coach → Nutrition → Targets.")+'</p>'
   +'<button class="btn" data-saveyou="1">'+t("Save")+'</button>'
   +'<button class="btn g" data-fsec="targets">'+t("See my targets")+'</button>';}

/* ---- Training ----------------------------------------------------------------------- */
function trainingSheet(){
  var tp=S.prefs,pr=S.profile;
  return '<h2>'+t("Training")+'</h2>'
   +group(t("Progression"),
      pick(t("Progression"),t("How fast Bunyan adds weight"),{items:[["conservative",t("Conservative")],["standard",t("Standard")],["aggressive",t("Aggressive")]],
        value:pr.prog,attr:"setprog",label:t("Progression")})
     /* Stored as "off" flags, so everyone who had the app before these existed gets
        them on. */
     +sw('data-toggle="noblocks"',t("Training blocks"),t("Effort builds for three weeks, then a lighter week"),!tp.noblocks)
     +pick(t("Ask for RPE"),"",{items:[["every",t("Every set")],["last",t("Last set only")],["off",t("Never")]],value:tp.rpe,attr:"setrpe",label:t("Ask for RPE")}),
     t("Steps follow the equipment: 2.5 kg on a barbell (5 on the big leg lifts), 2 kg on dumbbells, never more than about a tenth of the load. Conservative halves them, aggressive doubles them. Any exercise can have its own step, set in its plan."))
   +group(t("Workout"),
      sw('data-toggle="nowarm"',t("Warm-up before a workout"),t("Drills for what the day trains, and ramp-up sets"),!tp.nowarm)
     +sw('data-toggle="nocool"',t("Cool-down after a workout"),t("Stretches for what you trained"),!tp.nocool)
     +sw('data-toggle="awake"',t("Keep screen awake"),"",!!tp.awake))
   +group(t("Rest timer"),
      sw('data-toggle="autorest"',t("Auto-start rest timer"),"",!!tp.autorest)
     +pick(t("Countdown warning"),"",{items:[5,10,15].map(function(n){return [n,n+" "+t("sec")];}),value:tp.warn||10,attr:"setwarn",label:t("Countdown warning")})
     +sw('data-toggle="sound"',t("Sounds"),"",!!tp.sound)
     +'<button class="srow" data-testsound="1">'+words(t("Test sound"),t("Plays the 8-second rest alarm."))
     +'<span class="srow-play">'+glyph("sound")+t("Play")+'</span></button>',
     /* Said plainly, once, where the sound settings are, so it is learned here rather
        than in a gym when the timer runs out in silence. A limit of the phone, not of
        the app: iOS applies the hardware switch to all web audio and suspends the page
        when it is not in front. */
     t("On iPhone the side switch silences this alarm, and it cannot play while the app is in the background or the phone is locked. The screen turns red when the rest is over, so you can see it with the sound off."))
   +group(t("Equipment"),
      nav('data-sheet="gear"',t("My equipment"),"",S.gear&&S.gear.length?S.gear.length+" "+t("selected"):t("Everything"))
     +nav('data-sheet="likes"',t("Favourites"),"",S.favs.length+" ★")
     +pick(t("Dumbbell weights"),t("How you enter them"),{items:[["hand",t("Per hand")],["total",t("Both together")]],
        value:tp.dbLoad==="total"?"total":"hand",attr:"setdb",label:t("Dumbbell weights")}));}

/* ---- App ------------------------------------------------------------------------------ */
function appSheet(){
  var ap=S.prefs,thCur=themeOf(),thMode=modeOf();
  /* Each theme is drawn as itself: its preview carries data-palette and data-theme, so
     index.html's theme blocks colour it whichever theme is on. */
  var picks='<div class="thpicks" role="radiogroup" aria-label="'+esc(t("Theme"))+'">'
   +THEMES.map(function(th){
      var on=th.id===thCur;
      return '<button class="thpick'+(on?' on':'')+'" role="radio" aria-checked="'+on+'" data-settheme="'+th.id+'">'
       +'<span class="thpv" data-palette="'+th.id+'" data-theme="'+thMode+'" aria-hidden="true">'
       +'<span class="thpv-card"><span class="thpv-k"></span><b class="thpv-n">1,980</b>'
       +'<span class="thpv-bar"><i></i></span></span>'
       +'<span class="thpv-btn"></span>'
       +'<span class="thpv-dock"><i class="on"></i><i></i><i></i><i></i></span></span>'
       +'<span class="thpick-n">'+esc(t(th.name))+'</span>'
       +'<span class="thpick-sw" aria-hidden="true">'+th.sw.map(function(c){return '<i style="background:'+c+'"></i>';}).join("")+'</span>'
       +(on?'<span class="thpick-ok" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 12.5l4 4 8-9"/></svg></span>':'')
       +'</button>';}).join("")+'</div>';
  /* The app's icon: the theme's own, which changes with it, or one of the three kept
     whatever the theme. Each is shown as the icon itself. */
  var icCur=/^(red|blue|mono)$/.test(ap.icon)?ap.icon:"auto";
  var icons='<div class="icpicks" role="radiogroup" aria-label="'+esc(t("App icon"))+'">'
   +[["auto",t("Theme")]].concat(THEMES.map(function(th){return [th.id,t(th.id==="mono"?"Sage":th.id==="red"?"Red":"Blue")];}))
     .map(function(o){
      var on=o[0]===icCur;
      return '<button class="icpick'+(on?' on':'')+'" role="radio" aria-checked="'+on+'" data-seticon="'+o[0]+'">'
       +'<span class="icpick-i'+(o[0]==="auto"?' auto':'')+'" aria-hidden="true"><img src="'+iconOf(o[0]==="auto"?thCur:o[0])+'" alt="" width="52" height="52" decoding="async">'
       +(o[0]==="auto"?'<i style="background:conic-gradient(#8AB0EC 0 33.3%,#E7172E 0 66.6%,#9AABA9 0)"></i>':'')+'</span>'
       +'<span class="icpick-n">'+esc(o[1])+'</span></button>';}).join("")+'</div>';
  return '<h2>'+t("App")+'</h2>'
   +'<section class="sg"><h3 class="sg-h">'+t("Theme")+'</h3>'+picks
   +seg({items:[["dark",t("Dark")],["light",t("Light")]],value:thMode,attr:"lookmode",cls:"thmode",label:t("Mode"),key:"lookmode",soft:true})
   +'</section>'
   +'<section class="sg"><h3 class="sg-h">'+t("App icon")+'</h3>'+icons
   +'<p class="sg-f">'+esc(icCur==="auto"?t("The icon changes with the theme."):t("The icon stays this colour whatever the theme."))+' '
   /* Said plainly, because it is the phone's rule and not something the app can change:
      a Home Screen app keeps the icon it was added with. Adding it again may start it
      empty, so the backup goes first. */
   +esc(t("On iPhone, the Home Screen keeps the icon BUNYAN had when it was added. To change it there, make a backup first (Profile → Backup and reset), add BUNYAN to the Home Screen again from Safari (Share → Add to Home Screen), and restore the backup in it if it opens empty."))+'</p>'
   +'</section>'
   +group(t("Language and units"),
      pick(t("Language"),"",{items:[["en","English"],["ar","العربية"]],value:ap.lang==="ar"?"ar":"en",attr:"setlang",label:t("Language")})
     +pick(t("Units"),t("Display only. Your history is never rewritten."),{items:[["kg",t("Kilograms (kg)")],["lb",t("Pounds (lb)")]],
        value:ap.unit==="lb"?"lb":"kg",attr:"setunit",label:t("Units")})
     /* Saturday, Sunday or Monday: the three a week is commonly started on. */
     +pick(t("Week starts on"),t("Where \"this week\" begins, on every screen."),{items:[6,7,1].map(function(d){return [d,wdName(d,true)];}),
        value:weekStart(),attr:"wkstart",label:t("Week starts on")}))
   +group(t("Interface"),
      /* Only where the phone can give it: a vibration, or the iPhone's switch tick
         (js/ui/view.js buzz). */
      (canBuzz()?sw('data-toggle="haptic"',t("Haptic feedback"),"",ap.haptic!==false)
        /* To feel it now: the press itself ticks (app.js), and what is needed if it doesn't. */
        +'<button class="srow" data-hapttest="1">'+words(t("Test haptics"),t("Tap to feel a tick. On iPhone it needs iOS 18 or later and System Haptics on in Settings → Sounds & Haptics."))+'</button>':"")
     +sw('data-toggle="anim"',t("Animations"),"",ap.anim!==false)
     +sw('data-toggle="splash"',t("Opening screen"),"",ap.splash!==false)
     +pick(t("Interface density"),"",{items:[["0",t("Comfortable")],["1",t("Compact")]],value:ap.compact?"1":"0",attr:"setcompact",label:t("Interface density")}));}

/* ---- Profiles on this phone -------------------------------------------------------- */
/* The person as a picture: the photo they chose, else their initials (one letter
   with one:true, as Training's top right has it). */
function avatar(name,cls,one){
  var ph=S.profile&&S.profile.photo,c=cls?' '+cls:'';
  if(ph)return '<img class="avimg'+c+'" src="'+esc(ph)+'" alt="" decoding="async">';
  var ini=one?(String(name||"").trim().charAt(0).toUpperCase()||"?"):initials(name);
  return '<span class="avini'+c+'" aria-hidden="true">'+esc(ini)+'</span>';}
function ownName(){var me=PROFILES.filter(function(p){return p.id===CUR;})[0];return (me&&me.name)||"";}
/* The two ways to show who this is, both in sight: a photo from the phone, or the
   initial. The one in use is marked; choosing the photo opens the camera or gallery. */
function avatarSheet(){
  var has=!!(S.profile&&S.profile.photo),nm=ownName(),tick='<span class="avopt-c" aria-hidden="true">'+glyph("check")+'</span>';
  return '<h2>'+t("Profile picture")+'</h2><p class="tiny">'+t("Shown at the top of Training and on Profile. It stays on this phone.")+'</p>'
   +'<div class="avprev">'+avatar(nm,"xl")+'</div>'
   +'<div class="avopts" role="group" aria-label="'+esc(t("Profile picture"))+'">'
   +'<label class="avopt'+(has?' on':'')+'"><input type="file" accept="image/*" id="av_file" class="pgfile" aria-label="'+esc(t(has?"Choose another photo":"Upload a photo"))+'">'
   +'<span class="avopt-i">'+glyph("camera")+'</span>'
   +'<span class="avopt-t"><b>'+t(has?"Choose another photo":"Upload a photo")+'</b><small>'+t("From your camera or your gallery")+'</small></span>'
   +(has?tick:'')+'</label>'
   +'<button class="avopt'+(has?'':' on')+'" data-avinit="1"'+(has?'':' aria-pressed="true"')+'>'
   +'<span class="avopt-i ini">'+esc(String(nm).trim().charAt(0).toUpperCase()||"?")+'</span>'
   +'<span class="avopt-t"><b>'+t("Use my initial")+'</b><small>'+t("The first letter of your name")+'</small></span>'
   +(has?'':tick)+'</button></div>';}
function initials(name){
  return String(name||"?").trim().split(/\s+/).map(function(w){return w.charAt(0);}).join("").slice(0,2).toUpperCase()||"?";}
function profilesSheet(){
  return '<h2>'+t("Profiles on this phone")+'</h2><p class="tiny">'
   +t("Anyone training on your phone gets their own profile. Nothing crosses over.")+'</p>'
   +'<div class="sg"><div class="sg-list">'+PROFILES.map(function(pp){
      var cur=pp.id===CUR;
      return '<button class="srow'+(cur?' on':'')+'" data-switch="'+esc(pp.id)+'"'+(cur?' aria-current="true"':'')+'>'
       +'<span class="pmono">'+esc(initials(pp.name))+'</span>'
       +words(pp.name,[pp.owner?t("Admin"):"",cur?t("In use now"):t("separate log, separate numbers")].filter(Boolean).join(" · "))
       +'<span class="srow-tick">'+(cur?glyph("check"):'')+'</span></button>';}).join("")+'</div></div>'
   +'<div class="sacts">'
   +'<button class="btn g" data-addprofile="1">'+t("Add a profile")+'</button>'
   +'<button class="btn g" data-renameprofile="1">'+t("Rename this one")+'</button>'
   +(PROFILES.length>1&&!(PROFILES.filter(function(p){return p.id===CUR;})[0]||{}).owner
      ?'<button class="btn d" data-delprofile="1">'+t("Delete")+'</button>':'')
   +'</div>';}

/* ---- Backup and reset ---------------------------------------------------------------- */
/* What a backup holds, counted: the reassurance is in the numbers, not in the text of
   the file. */
function holds(){
  var food=Object.keys(S.days||{}).filter(function(d){var m=(S.days[d]||{}).meals||{};
    return Object.keys(m).some(function(k){return ((m[k]||{}).items||[]).length;});}).length;
  return [[S.sessions.length,t("workouts")],[food,t("food days")],
    [(S.body||[]).filter(function(b){return b&&b.weight;}).length,t("weigh-ins")],[(S.programs||[]).length,t("programs")]];}
function holdsGrid(){
  return '<div class="bk-holds">'+holds().map(function(h){
    return '<div><b>'+fmtN(h[0])+'</b><span>'+esc(h[1])+'</span></div>';}).join("")+'</div>';}
function backupState(){
  var a=backupAgeDays();
  return a===null?{k:"warn",s:t("Never backed up")}
    :a===0?{k:"ok",s:t("Backed up today")}
    :{k:a>30?"warn":"ok",s:t("Last backup")+" "+a+" "+t("days ago.")};}
function dataSheet(){
  var st=backupState();
  return '<h2>'+t("Backup and reset")+'</h2>'
   +'<div class="bk-card '+st.k+'"><div class="bk-top"><span class="gtile">'+glyph("archive")+'</span>'
   +'<span class="srow-t"><span class="srow-n">'+esc(st.s)+'</span>'
   +'<span class="srow-s">'+t("Everything lives on this phone only. Nothing is uploaded anywhere. Export a backup every few weeks so a cleared browser cannot cost you your history.")+'</span></span></div>'
   +holdsGrid()+'</div>'
   +group("",nav('data-export="1"',t("Save a backup"),"","","archive")+nav('data-import="1"',t("Restore from a backup"),"","","restore"))
   +'<div class="sg"><div class="sg-list"><button class="srow srow-danger" data-wipe="1"><span class="gtile">'+glyph("trash")+'</span>'
   +words(t("Delete everything"),"")+'</button></div></div>';}
function backupSheet(){
  return '<h2>'+t("Backup")+'</h2><p class="tiny">'
   +t("Save it as a file, or copy the text, and keep it somewhere safe. Restore brings everything back.")+'</p>'
   +'<div class="bk-card"><div class="sg-h">'+t("What it holds")+'</div>'+holdsGrid()
   +'<p class="sg-f">'+t("Photos are not included. They stay on this phone.")+'</p></div>'
   +'<button class="btn" data-bkfile="1">'+t("Save backup file")+'</button>'
   /* The text itself, for copying into a note or a message, folded away: tens of
      kilobytes of it on screen told nobody anything. */
   +'<details class="adv"><summary>'+t("Copy as text")+'</summary>'
   +'<textarea id="bk" class="adv-t" readonly>'+esc(JSON.stringify(S))+'</textarea>'
   +'<button class="btn g" data-copybk="1">'+t("Copy as text")+'</button></details>';}

/* ---- Share my progress ---------------------------------------------------------------- */
function shareSheet(){
  var sn=buildSnapshot(),st=snapStats(sn),pk=Object.keys(st.prs||{}).slice(0,4);
  return '<h2>'+t("Share your progress")+'</h2><p class="tiny">'
   +t("Copy the code and send it to a friend. It holds your sessions, lifts and weight.")+' '
   +t("It does not contain your meals or anything else.")+'</p>'
   +'<div class="bk-card shc"><div class="bk-top"><span class="pmono">'+esc(initials(sn.name))+'</span>'
   +'<span class="srow-t"><span class="srow-n">'+esc(sn.name||"")+'</span>'
   +(st.last?'<span class="srow-s">'+t("Last trained")+' '+esc(shortd(st.last))+'</span>':'')+'</span></div>'
   +'<div class="bk-holds">'
   +'<div><b>'+fmtN(st.count)+'</b><span>'+t("Sessions")+'</span></div>'
   +'<div><b>'+fmtN(Math.round(toDisp(st.vol)/1000))+'k</b><span>'+t("Volume")+'</span></div>'
   +'<div><b>'+(st.avg7||st.weight?fmtW(st.avg7||st.weight):"—")+'</b><span>'+t("Weight")+'</span></div></div>'
   +(pk.length?'<div class="shc-l">'+pk.map(function(k){
      var w=st.prs[k][0],r=st.prs[k][1];
      return '<div><span>'+esc(exName(k))+'</span><b>'+esc(w?fmtW(w)+" × "+r:r+" "+t("reps"))+'</b></div>';}).join("")+'</div>':'')
   +'</div>'
   +'<button class="btn" data-copysn="1">'+t("Copy the code")+'</button>'
   +'<details class="adv"><summary>'+t("Show the code")+'</summary>'
   +'<textarea id="sn" class="adv-t" readonly>'+esc(JSON.stringify(sn))+'</textarea></details>';}

/* ---- a plan, to another Bunyan user (js/engine/planshare.js) ----------------------------
   Sending: what goes, and the message to send it in (V.sd: {code, plan, text}). The
   share sheet is opened from this sheet's button, inside the tap the OS asks for. */
function planLines(sm){
  var l=[];
  if(sm.program)l.push('<div><span>'+esc(planName(sm.program))+'</span><b>'+esc(t(sm.days===1?"1 training day":"{n} training days").replace("{n}",sm.days))
    +' · '+esc(t("{n} exercises").replace("{n}",sm.ex))+'</b></div>');
  if(sm.meals)l.push('<div><span>'+esc(t("Meal plan"))+'</span><b>'+esc(t(sm.meals===1?"1 meal":"{n} meals").replace("{n}",sm.meals))
    +' · <bdi class="num">'+fmtN(Math.round(sm.kcal))+'</bdi> kcal</b></div>');
  return '<div class="shc-l">'+l.join("")+'</div>';}
function sendPlanSheet(){
  var d=V.sd||{};if(!d.code)return '<h2>'+t("Share")+'</h2>';
  return '<h2>'+esc(t(d.plan.program?"Share this program":"Share my meal plan"))+'</h2>'
   +'<p class="tiny">'+esc(t("Anyone with Bunyan can add it as you have it: they open Profile, then Add a shared plan, and paste your message. Your history, weight and targets stay with you."))+'</p>'
   +'<div class="bk-card shc">'+planLines(planSummary(d.plan))+'</div>'
   +'<button class="btn" data-sendplan="1">'+esc(t("Share…"))+'</button>'
   +'<button class="btn g" data-copyplan="1">'+esc(t("Copy the message"))+'</button>'
   +'<details class="adv"><summary>'+esc(t("Show the message"))+'</summary>'
   +'<textarea id="planc" class="adv-t" readonly>'+esc(d.text)+'</textarea></details>';}
/* Receiving: paste, read, then what it holds, each part added on its own tap
   (V.sd: {text?, got?, err?, done:{program, meals}}). */
function recvPlanSheet(){
  var d=V.sd||{},g=d.got;
  var h='<h2>'+esc(t("Add a shared plan"))+'</h2>';
  if(!g)return h+'<p class="tiny">'+esc(t("Paste the message another Bunyan user sent you. Their program or meal plan is added exactly as they have it."))+'</p>'
    +'<textarea id="rplan" class="adv-t rplan" rows="4" placeholder="'+esc(t("Paste the message here"))+'">'+esc(d.text||"")+'</textarea>'
    +(d.err?'<p class="tiny bad" role="alert">'+esc(t("That isn't a Bunyan plan, or it was cut short. Ask for the whole message again."))+'</p>':'')
    +'<div class="sacts"><button class="btn g" data-rplanpaste="1">'+esc(t("Paste"))+'</button>'
    +'<button class="btn" data-rplanread="1">'+esc(t("Read it"))+'</button></div>';
  var sm=planSummary(g),done=d.done||{};
  h+='<p class="tiny">'+esc(g.from?t("From {name}.").replace("{name}",g.from):t("A shared plan."))+'</p>'
   +'<div class="bk-card shc">'+planLines(sm)+'</div>';
  if(g.program)h+=done.program?'<p class="rp-done">✓ '+esc(t("Added to your programs."))+'</p>'
    :'<button class="btn" data-rplanadd="use">'+esc(t("Add it and train with it"))+'</button>'
     +'<button class="btn g" data-rplanadd="keep">'+esc(t("Add it to my programs"))+'</button>';
  if(g.meals)h+=done.meals?'<p class="rp-done">✓ '+esc(t("Your meal plan is this one now."))+'</p>'
    :'<p class="tiny">'+esc(t("The portions are as they planned them. Your daily targets stay as they are."))+'</p>'
     +'<button class="btn'+(g.program?' g':'')+'" data-rplanmeals="1">'+esc(t("Use this meal plan"))+'</button>';
  return h;}

/* ---- About -------------------------------------------------------------------------- */
function aboutSheet(){
  return '<h2>'+t("About and privacy")+'</h2>'
   +'<section class="sg"><h3 class="sg-h">'+t("Privacy")+'</h3><div class="sg-card"><span class="gtile">'+glyph("lock")+'</span><p>'
   +t("Everything lives on this phone only. Nothing is uploaded anywhere. Export a backup every few weeks so a cleared browser cannot cost you your history.")+'</p></div></section>'
   +'<section class="sg"><h3 class="sg-h">'+t("How the numbers work")+'</h3><div class="sg-card"><span class="gtile">'+glyph("info")+'</span><p>'
   +t("Estimated 1RM uses the Epley formula and is only meaningful up to about 12 reps. Volume is the sum of weight × reps for every set, not an average.")+'</p></div></section>';}

var SHEETS={set_you:youSheet,set_avatar:avatarSheet,set_training:trainingSheet,set_app:appSheet,set_profiles:profilesSheet,
  set_data:dataSheet,backup:backupSheet,share:shareSheet,about:aboutSheet,set_chat:histSheet,sendplan:sendPlanSheet,recvplan:recvPlanSheet};
/* The inside of a settings sheet, or null when the name is not one of these. */
function settingsSheet(name){return SHEETS[name]?SHEETS[name]():null;}

export {avatar, backupState, initials, settingsSheet};

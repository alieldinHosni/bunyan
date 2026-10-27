/* Bunyan — profile
   Profile, opened from the person at the top right of Training: who this is, then the settings, the people on this phone, and the data.
   Every row opens a sheet (js/ui/settings.js) and says what is set there now, so the
   page reads as a summary before anything is opened. */
import {t} from "../../i18n/dict.js";
import {goalOf} from "../../data/goals.js";
import {lastWeight} from "../../engine/formulas.js";
import {curProfile, isOwner, PROFILES, S, split} from "../../state.js";
import {friends} from "../../engine/share.js";
import {fmtW, wUnit} from "../../units.js";
import {esc, fmtN} from "../../util.js";
import {streak} from "../view.js";
import {themeName, themeOf} from "../theme.js";
import {planName} from "../../i18n/exnames.js";
import {glyph} from "../glyphs.js";
import {avatar, backupState} from "../settings.js";
import {art} from "../art.js";
import {backArrow} from "../nav.js";

/* One row: its glyph in a tile, its name, what is set there now, and a chevron. */
function prow(attr,gl,name,sub,tone){
  return '<button class="srow" '+attr+'><span class="gtile'+(tone?' '+tone:'')+'">'+glyph(gl)+'</span>'
   +'<span class="srow-t"><span class="srow-n">'+esc(name)+'</span>'
   +(sub?'<span class="srow-s">'+esc(sub)+'</span>':'')+'</span>'
   +'<span class="ico ico-chev" aria-hidden="true"></span></button>';}
function group(title,rows){
  return '<section class="sg"><h2 class="sg-h">'+esc(title)+'</h2><div class="sg-list">'+rows+'</div></section>';}

function vProfile(){
  var p=S.profile,g=S.goals,pf=curProfile(),pref=S.prefs;
  var name=pf.name||t("Me"),kg=lastWeight()||p.weight;

  var h='<div class="dhead">'+backArrow()+'<h1 class="dhead-t">'+esc(t("Profile"))+'</h1></div>';

  /* Who: the picture in its orbit (tap it for the photo or the initial), the name, the
     goal and the program (tap for You, where the body and the goal are set), and three
     plain figures, over contour lines drawn still behind it all. */
  h+='<section class="pid">'+art("topo",{still:true,cls:"pid-bg"})
   +'<div class="pid-hero">'
   +'<button class="pid-av" data-sheet="set_avatar" aria-label="'+esc(t("Profile picture")+": "+t(S.profile.photo?"your photo. Change it":"your initial. Add a photo"))+'">'
   +art("orbit",{cls:"pid-orbit"})
   +'<span class="pmono xl">'+avatar(name)+'</span>'
   +'<span class="pid-cam" aria-hidden="true">'+glyph("camera")+'</span></button>'
   +'<button class="pid-top" data-sheet="set_you">'
   +'<span class="pid-t"><span class="pid-n">'+esc(name)+'</span>'
   +'<span class="pid-s">'+esc([t(goalOf(p.goal).label),planName(split().name)].filter(Boolean).join(" · "))+'</span></span>'
   +'<span class="pid-edit">'+esc(t("Your details"))+'<span class="ico ico-chev" aria-hidden="true"></span></span></button></div>'
   +'<div class="pid-stats">'
   +'<div><b>'+fmtN(S.sessions.length)+'</b><span>'+t("Workouts")+'</span></div>'
   +'<div><b>'+streak()+'</b><span>'+t("Streak")+'</span></div>'
   +'<div><b>'+(kg?esc(fmtW(kg)):"—")+'</b><span>'+t("Weight")+'</span></div>'
   +'</div></section>';

  /* Only what has actually been entered. This used to concatenate the fields whole,
     and they default to null, so a profile that skipped them read "null · nullcm ·
     86kg": the 86 a weight nobody gave, from a fallback meant for arithmetic. */
  var you=[];
  if(p.age)you.push(p.age+" "+t("yrs"));
  if(p.height)you.push(p.height+" "+t("cm"));
  if(kg)you.push(fmtW(kg));
  var rpeLabel={every:t("Every set"),last:t("Last set only"),off:t("Never")}[pref.rpe]||t("Every set");
  h+=group(t("Settings"),
     prow('data-sheet="set_you"',"person",t("You"),you.length?you.join(" · "):t("Add your age, height and weight"))
    +prow('data-sheet="set_training"',"dumbbell",t("Training"),
       t(p.prog.charAt(0).toUpperCase()+p.prog.slice(1))+" · "+t("RPE")+" "+rpeLabel.toLowerCase())
    /* The conversation with the coach, 30 days of it, to read (js/ui/views/chat.js
       histSheet). What the person told it to keep is asked in the chat ("What have I
       told you?"), where it can be deleted. */
    +prow('data-sheet="set_chat"',"clock",t("Chat history"),t("The last 30 days, to read"))
    +prow('data-fsec="targets"',"bowl",t("Nutrition"),fmtN(g.kcal)+" kcal · "+g.p+"g "+t("Protein").toLowerCase())
    +prow('data-sheet="set_app"',"sliders",t("App"),
       [t(themeName(themeOf()))+" · "+(S.theme==="light"?t("Light"):t("Dark")),
        pref.lang==="ar"?"العربية":"English",wUnit()].join(" · ")));

  h+=group(t("People"),
     prow('data-sheet="set_profiles"',"people",t("Profiles on this phone"),
       PROFILES.length+" "+(PROFILES.length===1?t("profile"):t("profiles")))
    +prow('data-share="1"',"share",t("Share my progress"),t("Makes a code you can send on WhatsApp"))
    +(isOwner()?prow('data-coach="1"',"eye",t("Friends I follow"),
       Object.keys(friends()).length+" "+t("shared with you")):""));

  /* The backup row says how old the last one is, and turns to the caution colour when
     there has never been one or it is over a month old. */
  var bk=backupState();
  h+=group(t("Your data"),
     prow('data-sheet="set_data"',"archive",t("Backup and reset"),bk.s,bk.k==="warn"?"warn":"")
    +prow('data-sheet="about"',"info",t("About and privacy"),t("Everything stays on this phone")));
  h+=group(t("Help"),
     prow('data-tourreset="1"',"question",t("Show the guide again"),t("The tips that point out what each button does")));
  return h;}

export {vProfile};

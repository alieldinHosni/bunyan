/* Bunyan — profile
   Profile tab. */
import {t} from "../../i18n/dict.js";
import {lastWeight} from "../../engine/formulas.js";
import {GOALS, LEVELS} from "../../engine/plan.js";
import {curProfile, friends, isOwner, PROFILES, S, split} from "../../state.js";
import {fmtW, wUnit} from "../../units.js";
import {esc, fmtN} from "../../util.js";
import {streak} from "../view.js";

/* ============================================================ PROFILE
   No frame exists for this tab — none of the file's nineteen top-level frames is a
   profile screen — so it is built from the language the others share: the Train
   hub's header and grouped rows, Home's accent-ringed avatar. */

/* One settings row. The value sits under the name, as the Train hub's day rows do,
   rather than squeezed against the chevron where a long one had nowhere to go. */
function prow(attr,name,sub){
  return '<button class="trow" '+attr+'><span style="min-width:0">'
   +'<span class="trow-n">'+esc(name)+'</span>'
   +(sub?'<span class="trow-s">'+esc(sub)+'</span>':'')+'</span>'
   +'<span class="ico ico-chev" aria-hidden="true"></span></button>';}
function group(title,rows){
  return '<div class="tsec"><h2 class="tsec-h">'+title+'</h2></div>'
   +'<div class="card tdays">'+rows+'</div>';}

function vProfile(){
  var p=S.profile,g=S.goals,pf=curProfile();
  var name=pf.name||t("Me");
  var initials=name.split(" ").map(function(w){return w[0];}).join("").slice(0,2).toUpperCase();

  var h='<div class="thead"><h1>'+t("Profile")+'</h1></div>';

  h+='<div class="card phero">'
   +'<div class="pavatar" aria-hidden="true">'+esc(initials)+'</div>'
   +'<div class="pname">'+esc(name)+'</div>'
   +'<div class="pprog">'+esc(split().name)+'</div>'
   +'<div class="pstats">'
   +'<div><b>'+fmtN(S.sessions.length)+'</b><span>'+t("SESSIONS")+'</span></div>'
   +'<div><b>'+streak()+'</b><span>'+t("STREAK")+'</span></div>'
   +'<div><b>'+S.favs.length+'</b><span>'+t("FAVOURITES")+'</span></div>'
   +'</div></div>';

  /* Only what has actually been entered. This used to concatenate the fields whole,
     and they default to null, so a profile that skipped them read "null · nullcm ·
     86kg" — the 86 a weight nobody gave, from a fallback meant for arithmetic. */
  var you=[],kg=lastWeight()||p.weight;
  if(p.age)you.push(p.age+" "+t("yrs"));
  if(p.height)you.push(p.height+" "+t("cm"));
  if(kg)you.push(fmtW(kg));
  var pref=S.prefs;
  var rpeLabel={every:t("Every set"),last:t("Last set only"),off:t("Never")}[pref.rpe]
    ||t("Every set");
  h+=group(t("Settings"),
     prow('data-sheet="set_you"',t("You"),
       you.length?you.join(" · "):t("Add your age, height and weight"))
    +prow('data-sheet="set_training"',t("Training"),
       t(p.prog.charAt(0).toUpperCase()+p.prog.slice(1))+" · "+t("RPE")+" "
       +rpeLabel.toLowerCase())
    +prow('data-sheet="set_nutrition"',t("Nutrition"),
       fmtN(g.kcal)+" kcal · "+g.p+"g "+t("Protein").toLowerCase())
    +prow('data-sheet="set_app"',t("App"),
       [S.theme==="dark"?t("Dark"):t("Light"),
        pref.lang==="ar"?"العربية":"English",wUnit()].join(" · ")));

  h+=group(t("Your plan"),
     prow('data-setup="1"',t("Rebuild my plan"),
       [LEVELS[p.level]?t(LEVELS[p.level].label):"",
        GOALS[p.goal]?t(GOALS[p.goal].label):"",
        p.days?p.days+" "+t("days a week"):""].filter(Boolean).join(" · ")));

  h+=group(t("People"),
     prow('data-sheet="set_profiles"',t("Profiles on this phone"),
       PROFILES.length+" "+(PROFILES.length===1?t("profile"):t("profiles")))
    +prow('data-share="1"',t("Share my progress"),t("Makes a code you can send on WhatsApp"))
    +(isOwner()?prow('data-coach="1"',t("Friends I follow"),
       Object.keys(friends()).length+" "+t("shared with you")):""));

  h+=group(t("Recovery"),prow('data-sheet="recovery"',t("Recovery log"),t("Sleep, soreness, energy, pain")));
  h+=group(t("Your data"),prow('data-sheet="set_data"',t("Backup and reset"),""));

  h+='<p class="pnote">'+t("Everything lives on this phone only. Nothing is uploaded anywhere. Export a backup every few weeks so a cleared browser cannot cost you your history.")+'</p>';
  h+='<p class="pnote">'+t("Estimated 1RM uses the Epley formula and is only meaningful up to about 12 reps. Volume is the sum of weight × reps for every set, not an average.")+'</p>';
  return h;}


export {vProfile};

/* Bunyan — profile
   Profile tab. */
import {t} from "../../i18n/dict.js";
import {lastWeight} from "../../engine/formulas.js";
import {GOALS, LEVELS} from "../../engine/plan.js";
import {curProfile, friends, isOwner, PROFILES, S} from "../../state.js";
import {toDisp, wUnit} from "../../units.js";
import {esc} from "../../util.js";
import {head, setRow, streak} from "../view.js";

/* ============================================================ PROFILE */
function vProfile(){
  var p=S.profile,g=S.goals;
  var pf=curProfile();
  var initials=(pf.name||"Me").split(" ").map(function(w){return w[0];}).join("").slice(0,2).toUpperCase();
  var h=head(t("Profile"),t("Warrior designation")+": "+(pf.name||"Me"));
  h+='<div class="card" style="text-align:center;padding:var(--s5)">'
   +'<div style="width:88px;height:88px;border-radius:50%;border:2px solid var(--accent);'
   +'display:flex;align-items:center;justify-content:center;margin:0 auto;'
   +'font-size:26px;font-weight:800;background:var(--surface)">'+initials+'</div>'
   +'<div style="font-size:19px;font-weight:800;margin-top:12px">'+esc(pf.name||"Me")+'</div>'
   +'</div>';
  h+='<div class="card"><div class="grid3" style="text-align:center">'
   +'<div><div class="stat">'+S.sessions.length+'</div><div class="tiny">'+t("SESSIONS")+'</div></div>'
   +'<div><div class="metric" style="font-size:28px">'+streak()+'</div><div class="tiny">'+t("STREAK")+'</div></div>'
   +'<div><div class="stat">'+S.favs.length+'</div><div class="tiny">'+t("FAVOURITES")+'</div></div>'
   +'</div></div>';

  /* Settings are grouped rather than poured into one scroll. Each row carries the
     value it controls, so the hub answers most questions without opening anything. */
  var pref=S.prefs;
  var rpeLabel={every:t("Every set"),last:t("Last set only"),off:t("Never")}[pref.rpe]
    ||t("Every set");
  h+='<div class="sec">'+t("Settings")+'</div><div class="list">'
   +setRow("set_you",t("You"),
     p.age+" · "+p.height+"cm · "+toDisp(lastWeight()||p.weight||86)+wUnit())
   +setRow("set_training",t("Training"),
     t(p.prog.charAt(0).toUpperCase()+p.prog.slice(1))+" · RPE "+rpeLabel.toLowerCase())
   +setRow("set_nutrition",t("Nutrition"),g.kcal+" kcal · "+g.p+"g "+t("Protein").toLowerCase())
   +setRow("set_app",t("App"),
     (S.theme==="dark"?t("Dark"):t("Light"))+" · "
     +(pref.lang==="ar"?"العربية":"English")+" · "+wUnit())
   +'</div>';

  h+='<div class="sec">'+t("Your plan")+'</div><div class="list">'
   +'<button class="item" data-setup="1"><div><div style="font-weight:600">'
   +t("Rebuild my plan")+'</div>'
   +'<div class="tiny">'+(LEVELS[p.level]?t(LEVELS[p.level].label):"")+' · '
   +(GOALS[p.goal]?t(GOALS[p.goal].label):"")+' · '+p.days+' '+t("days a week")+'</div></div>'
   +'<span class="chev">›</span></button></div>';

  h+='<div class="sec">'+t("People")+'</div><div class="list">'
   +setRow("set_profiles",t("Profiles on this phone"),
     PROFILES.length+" "+(PROFILES.length===1?t("profile"):t("profiles")))
   +'<button class="item" data-share="1"><div><div style="font-weight:600">'
   +t("Share my progress")+'</div>'
   +'<div class="tiny">'+t("Makes a code you can send on WhatsApp")+'</div></div>'
   +'<span class="chev">›</span></button>';
  if(isOwner())h+='<button class="item" data-coach="1"><div><div style="font-weight:600">'
   +t("Friends I follow")+'</div>'
   +'<div class="tiny">'+Object.keys(friends()).length+' '+t("shared with you")+'</div></div>'
   +'<span class="chev">›</span></button>';
  h+='</div>';

  h+='<div class="sec">'+t("Your data")+'</div><div class="list">'
   +setRow("set_data",t("Backup and reset"),"")
   +'</div>';
  h+='<p class="tiny">'+t("Everything lives on this phone only. Nothing is uploaded anywhere. Export a backup every few weeks so a cleared browser cannot cost you your history.")+'</p>';
  h+='<p class="tiny" style="margin-top:18px">'+t("Estimated 1RM uses the Epley formula and is only meaningful up to about 12 reps. Volume is the sum of weight × reps for every set, not an average.")+'</p>';
  return h;}


export {vProfile};

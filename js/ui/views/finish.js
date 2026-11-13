/* Bunyan — finish
   The page a workout ends on (WP-4, V.train "finish"): what you did, what it changes,
   what to do now. In order: the drawing and "Full Body A — done" with minutes, sets and
   volume counting up; the records the session earned (lifts.js recordIn, only real ones;
   none, no row); next time, one line per lift whose weight the next session will change
   (lifts.js nextTimeIn, the suggestion itself, read now); how hard the session was; one
   line on today's food from js/engine/head.js todayPlan(); the cool-down; Done, back to
   Training, whose Today card then reads Done with the next session.

   Drawn from V.fin, the summary js/ui/actions.js finishSession() makes, and from the
   stored session for what can still change here (an edit). V.fin lives in memory only:
   a reload lands on Training (vTrain sends a finish route without it there), and the
   session itself was saved before this page opened. Nothing is decided here. */
import {hb} from "../haptic.js";
import {t} from "../../i18n/dict.js";
import {exName, planName} from "../../i18n/exnames.js";
import {sessionById} from "../../state.js";
import {recordText, sessionVolume} from "../../engine/formulas.js";
import {todayPlan} from "../../engine/head.js";
import {blockNow} from "../../engine/blocks.js";
import {fmtW, toDisp, wUnit} from "../../units.js";
import {esc, fmtN, pretty, today} from "../../util.js";
import {STAR8, V} from "../view.js";
import {art} from "../art.js";
import {coolCard} from "./warmup.js";

/* A figure in its own .num span, so bidi keeps it whole; the rest escaped. */
function nums(x){return esc(x).replace(/&#?\w+;|[0-9٠-٩][0-9٠-٩.,:]*/g,function(m){return m.charAt(0)==="&"?m:'<span class="num">'+m+'</span>';});}
function stat(k,v,label,count){
  return '<div class="stat" data-k="'+k+'"><b class="num">'+(count?'<span data-count-to="'+v+'">'+fmtN(v)+'</span>':fmtN(v))+'</b><small>'+label+'</small></div>';}

/* The three figures. A workout logged afterwards has no duration: its exercises instead.
   A run or a match with no lifting shows what it burned, and its distance. */
function stats(w,s){
  var vol=s?Math.round(sessionVolume(s)):w.vol,sets=w.sets;
  if(s){sets=0;s.entries.forEach(function(e){sets+=(e.sets||[]).length;});}
  var h='<div class="wfin-stats" data-k="stats">';
  h+=w.past?stat("exs",w.exs,esc(t("Exercises")),true):stat("min",w.mins,esc(t("Duration"))+' · '+esc(t("min")),true);
  h+=vol||!w.actKcal?stat("vol",Math.round(toDisp(vol)),esc(t("Volume"))+' · '+esc(wUnit()),true)
    :stat("kcal",w.actKcal,esc(t("Burned"))+' · kcal',true);
  h+=w.actKm&&!vol?'<div class="stat" data-k="km"><b class="num">'+w.actKm+'</b><small>'+esc(t("Distance"))+' · km</small></div>'
    :stat("sets",sets,esc(t("Sets")),true);
  return h+'</div>';}

/* Each record earned, the best first: weight, then estimated max, then reps. The words
   are the record toast's own (formulas.js recordText: estimates to 0.5 kg, called so). */
var RK={w:3,e:2,r:1};
function records(w){
  var prs=(w.prs||[]).slice().sort(function(x,y){return (RK[y.k||"w"]-RK[x.k||"w"])||(y.w-x.w);});
  if(!prs.length)return "";
  return '<section class="wfin-rec wfin-sec" data-k="recs">'
   +'<div class="wfin-sh">'+STAR8+'<b>'+esc(t("Records"))+'</b>'+(prs.length>1?'<span class="num wfin-n">'+prs.length+'</span>':'')+'</div>'
   +prs.map(function(p){
      return '<div class="wfin-row" data-k="rec:'+esc(p.n)+'"><b class="wfin-row-n">'+esc(exName(p.n))+'</b>'
       +'<span class="wfin-row-v">'+nums(recordText(p))+'</span></div>';}).join("")+'</section>';}

/* Next time: the next session's suggestion, now. Why, in the suggestion's terms: the
   top of the range reached (on every set, or on all but one, as the engine counts it),
   or, for a step down, the suggestion's own reason. */
function why(g){
  if(!g.up)return t(g.note);
  if(g.hit>=g.of)return t("You hit {n} on every set.").replace("{n}",g.hi);
  return t("You hit {n} on {k} of {m} sets.").replace("{n}",g.hi).replace("{k}",g.hit).replace("{m}",g.of);}
function nextTime(w){
  var nx=w.next||[];if(!nx.length)return "";
  return '<section class="wfin-next wfin-sec" data-k="next">'
   +'<div class="wfin-sh"><b>'+esc(t("Next time"))+'</b></div>'
   +nx.map(function(g){
      return '<div class="wfin-row" data-k="nx:'+esc(g.n)+'"><b class="wfin-row-n">'+esc(exName(g.n))+'</b>'
       +'<span class="wfin-row-v"><span class="wfin-arr '+(g.up?'up':'down')+'" aria-hidden="true">'+(g.up?'↑':'↓')+'</span> '
       +nums(t("{w} next time").replace("{w}",fmtW(g.w)))+'</span>'
       +'<span class="wfin-why">'+nums(why(g))+'</span></div>';}).join("")+'</section>';}

/* How hard the whole session was: one tap, kept with the session (handlers: srpe). */
function effort(w,s){
  var sr=(s||{}).srpe||0;
  var h='<div class="wc2-effort" data-k="srpe"><div class="wc2-effort-h">'+esc(t("How hard was the session?"))+'</div><div class="ready-c">'
   +[[3,"Easy"],[5,"Moderate"],[7,"Hard"],[9,"Very hard"],[10,"Max"]].map(function(x){
      return hb('<button class="'+(sr===x[0]?'on':'')+'" data-srpe="'+x[0]+'" aria-pressed="'+(sr===x[0])+'">'+esc(t(x[1]))+'</button>');}).join("")
   +'</div></div>';
  /* Inside a training block, how the amount of work felt: it moves the sets for the
     muscles this workout trained (js/coach/block.js). Not asked of a run or a match. */
  if(w.lift&&blockNow()){
    var fl=(s||{}).feel||"";
    h+='<div class="wc2-effort wc2-feel" data-k="feel"><div class="wc2-effort-h">'+esc(t("How was the amount of work?"))+'</div><div class="ready-c feel-c">'
     +[["easy","Too easy"],["right","About right"],["much","Too much"]].map(function(x){
        return hb('<button class="'+(fl===x[0]?'on':'')+'" data-sfeel="'+x[0]+'" aria-pressed="'+(fl===x[0])+'">'+esc(t(x[1]))+'</button>');}).join("")
     +'</div><p class="wc2-feel-n">'+esc(t("Your answer adjusts the sets for these muscles for the rest of this block."))+'</p></div>';}
  return h;}

/* Now: what is left of today's food target, from the head (todayPlan().food), with the
   way to Food. Only with a target, and only for a workout done today. */
function nowLine(w){
  if(w.past||w.date!==today())return "";
  var f=todayPlan(today()).food;if(!f)return "";
  var line=f.p?(f.pLeft>0?t("You have {g} g of protein left today.").replace("{g}",fmtN(f.pLeft)):t("Today's protein target is met."))
    :(f.kLeft>0?t("You have {k} kcal left today.").replace("{k}",fmtN(f.kLeft)):t("Today's calories are in."));
  return '<section class="wfin-now wfin-sec" data-k="now"><div class="wfin-sh"><b>'+esc(t("Now"))+'</b></div>'
   +'<p class="wfin-now-t">'+nums(line)+'</p>'
   +'<button class="btn g wfin-food" data-fsec="today">'+esc(t("Log food"))+'</button></section>';}

function vFinish(){
  var w=V.fin,s=sessionById(w.id)||null;
  var h='<div class="wfin" data-k="fin">'
   /* The horse behind the tick, drawn in (art.js), as the page headers' drawings are. */
   +'<div class="wfin-hd">'+art("mane",{cls:"wfin-art"})
   +'<div class="wfin-c" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div></div>'
   +'<h1 class="wfin-h">'+esc(t("{d} — done").replace("{d}",planName(w.dayName)||t("Workout")))+'</h1>'
   +'<p class="wfin-sub">'+nums(pretty(w.date))+'</p>'
   +stats(w,s)+records(w)+nextTime(w)+effort(w,s)+nowLine(w)+coolCard(w.cool)
   +'<button class="wfin-done" data-findone="1">'+esc(t("Done"))+'</button>'
   +'<div class="wfin-more">'
   +(w.id?'<button class="btn g" data-sessedit="'+esc(w.id)+'"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>'+esc(t("Edit"))+'</button>':'')
   +'<button class="btn g" data-sharews="1"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/></svg>'+esc(t("Share"))+'</button>'
   +'</div></div>';
  return h;}

export {vFinish};

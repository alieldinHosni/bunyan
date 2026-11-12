/* Bunyan — what the body needs, on the Food page
   Today's log read as a body, after the reference the owner chose: a headline that says
   what the body needs now, a figure with the four things it runs on around it (protein,
   carbs, fat, water), each at its share of the day's target, the one furthest behind
   lit; what is left of it and three everyday foods that bring it, one tap each to log;
   what the coach noticed over the last week; and a way to build the rest of the day.

   The numbers are js/engine/needs.js's. Nothing here is a judgement the log cannot
   support: behind means behind for the time of day, and the week's pattern needs three
   logged days before it says anything. */
import {hb} from "./haptic.js";
import {t} from "../i18n/dict.js";
import {suggestFor} from "../engine/needs.js";
import {headOn} from "../engine/head.js";
import {S} from "../state.js";
import {esc, fmtN} from "../util.js";
import {art} from "./art.js";
import {glyph} from "./glyphs.js";

var NAME={p:"Protein",c:"Carbs",f:"Fat",w:"Water"};
var GL={p:"molecule",c:"grain",f:"avocado",w:"drop"};
var HEAD={p:"Your body needs more protein.",c:"Your body needs more fuel.",f:"Your body needs a little more fat.",w:"Your body needs more water."};
var NEED={p:"About {n} g more protein today brings you to your target.",c:"About {n} g more carbs today brings you to your target.",
  f:"About {n} g more fat today brings you to your target.",w:"About {n} ml more water today brings you to your target."};
var BRINGS={p:"+{n} g protein",c:"+{n} g carbs",f:"+{n} g fat"};
var FOOD={yogurt:"Greek yogurt",eggs:"Eggs",chicken:"Chicken breast",tuna:"Tuna",cottage:"Cottage cheese",ful:"Ful medames",
  lentils:"Lentils",oats:"Oats",banana:"Banana",rice:"Rice",bread:"Baladi bread",dates:"Dates",potato:"Sweet potato",
  almonds:"Almonds",avocado:"Avocado",pb:"Peanut butter",labneh:"Labneh"};

function pctOf(n){return Math.round(n.pct*100);}

/* The section, for today. eaten is the day's totals, water the ml drunk.
   Owner, 3 Nov: the figure with its four rings repeated the summary card's numbers (the
   same protein, carbs and fat, as shares) and took a screen of its own. What it said that
   the summary does not is kept, in one slim card under the summary: what is behind for
   the time of day and how much to go, and three everyday foods that bring it, one tap
   each to log (or a glass, for water). Nothing behind: no card. The week's pattern
   (noticed) stays. Each of the two is drawn when the head (js/engine/head.js) keeps it:
   needs-today (what is behind now) and needs-week (the week's pattern). */
function bodyNeeds(eaten){
  var g=S.goals||{},sigs=headOn("food"),of=function(id){return (sigs.filter(function(s){return s.id===id;})[0]||{}).src||null;};
  var b=of("needs-today"),week=of("needs-week");
  if(!b||!b.node)return noticed(week);
  var focus=b.focus,fn=b.node;
  var trained=b.trained;
  var sub=(trained?t("You trained today, and {x} is at {n}% of your target."):t("{X} is at {n}% of today's target, behind for the time of day."))
      .replace("{x}",t(NAME[focus]).toLowerCase()).replace("{X}",t(NAME[focus])).replace("{n}",pctOf(fn));
  var left=b.left,unit=focus==="w"?"ml":"g";
  var h='<section class="fbody fneed glass" data-k="needs-today" aria-labelledby="fbody-h">'
   +'<div class="fneed-h"><span class="fneed-i f-'+focus+'" aria-hidden="true">'+glyph(GL[focus])+'</span>'
   +'<div class="fneed-t"><h2 class="fbody-h" id="fbody-h">'+esc(t(HEAD[focus]))+'</h2><p class="fbody-s">'+esc(sub)+'</p></div>'
   +'<span class="fbody-pill num">'+esc(t("+{n} "+unit+" to go").replace("{n}",fmtN(left)))+'</span></div>';
  if(focus==="w")
    h+=hb('<button class="btn g fbody-glass" data-water="250">'+glyph("drop")+esc(t("Add a glass (250 ml)"))+'</button>');
  else{
    var kl=(g.kcal||0)-(eaten.kcal||0);
    h+='<div class="fsug">'+suggestFor(focus,kl).map(function(x){
       return '<button class="fsug-t" data-fsug="'+esc(x.id+"|"+x.grams+"|"+x.label)+'" aria-label="'
        +esc(t("Log")+" "+t(FOOD[x.art])+", "+t(x.label)+", "+t(BRINGS[focus]).replace("{n}",Math.round(x.amount)))+'">'
        +'<span class="fsug-art">'+art(x.art,{still:true})+'</span>'
        +'<span class="fsug-n">'+esc(t(FOOD[x.art]))+'</span>'
        +'<span class="fsug-v">'+esc(t(BRINGS[focus]).replace("{n}",Math.round(x.amount)))+'</span>'
        +'<span class="fsug-s">'+esc(t(x.label)+" · "+t("{n} kcal").replace("{n}",fmtN(x.kcal)))+'</span></button>';}).join("")
     +'</div>';}
  h+='</section>';
  return h+noticed(week);}

/* What the last week shows about protein, in one card, or nothing. */
function noticed(w){
  if(!w)return "";
  var s=w.kind==="train"?t(w.shortTrain===w.trainDays?"On each of your last {m} training days, protein stayed under target. Those are the days it matters most."
      :"On {n} of your last {m} training days, protein stayed under target. Those are the days it matters most.").replace("{n}",w.shortTrain).replace("{m}",w.trainDays)
    :w.kind==="short"?t("Protein was under target on {n} of the last {m} days you logged.").replace("{n}",w.short).replace("{m}",w.days)
    :t("Protein reached its target on {n} of the last {m} days you logged. Keep it there.").replace("{n}",w.met).replace("{m}",w.days);
  return '<section class="fnoticed" data-k="needs-week"><span class="fnoticed-i" aria-hidden="true">'+glyph("spark")+'</span>'
   +'<div><b>'+esc(t("Coach noticed"))+'</b><p>'+esc(s)+'</p></div></section>';}

export {bodyNeeds};

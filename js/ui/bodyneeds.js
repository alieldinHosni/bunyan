/* Bunyan — what the body needs, on the Food page
   Today's log read as a body, after the reference the owner chose: a headline that says
   what the body needs now, a figure with the four things it runs on around it (protein,
   carbs, fat, water), each at its share of the day's target, the one furthest behind
   lit; what is left of it and three everyday foods that bring it, one tap each to log;
   what the coach noticed over the last week; and a way to build the rest of the day.

   The numbers are js/engine/needs.js's. Nothing here is a judgement the log cannot
   support: behind means behind for the time of day, and the week's pattern needs three
   logged days before it says anything. */
import {t} from "../i18n/dict.js";
import {needsNow, suggestFor, toGo, weekPattern} from "../engine/needs.js";
import {S} from "../state.js";
import {esc, fmtN, today} from "../util.js";
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
/* Where each sits around the figure, as a share of the drawing's box: the four corners
   of an ellipse that passes through all of them (drawn in orbit()). Measured from the
   side the line starts on, so in Arabic protein is at the top right. */
var AT={p:[16,22],c:[84,22],w:[16,72],f:[84,72]};

function pctOf(n){return Math.round(n.pct*100);}

/* The section, for today. eaten is the day's totals, water the ml drunk. */
function bodyNeeds(eaten,water){
  var g=S.goals||{},now=today(),hour=new Date().getHours();
  if(!(g.p>0))return "";
  var r=needsNow(eaten,g,water,hour),focus=r.focus,fn=focus&&r.nodes.filter(function(n){return n.id===focus;})[0];
  var trained=(S.sessions||[]).some(function(x){return x.date===now;});
  var sub=fn?(trained?t("You trained today, and {x} is at {n}% of your target."):t("{X} is at {n}% of today's target, behind for the time of day."))
      .replace("{x}",t(NAME[focus]).toLowerCase()).replace("{X}",t(NAME[focus])).replace("{n}",pctOf(fn))
    :t("Protein, carbs, fat and water are where they should be for the time of day.");
  var h='<section class="fbody" aria-labelledby="fbody-h"><span class="eyebrow">'+esc(t("Nutrition"))+'</span>'
   +'<h2 class="fbody-h" id="fbody-h">'+esc(t(fn?HEAD[focus]:"Your body is on course today."))+'</h2>'
   +'<p class="fbody-s">'+esc(sub)+'</p>'
   +'<div class="fbody-d" role="img" aria-label="'+esc(r.nodes.map(function(n){return t(NAME[n.id])+" "+pctOf(n)+"%";}).join(", "))+'">'
   +orbit()+art("figure",{cls:"fbody-fig",still:true})
   +r.nodes.map(function(n){
     return '<div class="fbn'+(n.id===focus?' on':'')+(n.pct>=1?' full':'')+'" style="inset-inline-start:'+AT[n.id][0]+'%;top:'+AT[n.id][1]+'%" aria-hidden="true">'
      +'<span class="fbn-c">'+glyph(GL[n.id])+'</span><span class="fbn-k">'+esc(t(NAME[n.id]))+'</span><b>'+pctOf(n)+'%</b></div>';}).join("")
   +'</div>';
  if(fn){
    var left=toGo(fn),unit=focus==="w"?"ml":"g";
    h+='<div class="fbody-need"><div class="fbody-nk"><span class="eyebrow">'+esc(t(NAME[focus]))+'</span>'
     +'<b>'+pctOf(fn)+'<small>%</small></b>'
     +'<span class="fbody-pill">'+esc(t("+{n} "+unit+" to go").replace("{n}",fmtN(left)))+'</span></div>'
     +'<p>'+esc(t(NEED[focus]).replace("{n}",fmtN(left)))+'</p></div>';
    if(focus==="w")
      h+='<button class="btn g fbody-glass" data-water="250">'+glyph("drop")+esc(t("Add a glass (250 ml)"))+'</button>';
    else{
      var kl=(g.kcal||0)-(eaten.kcal||0);
      h+='<div class="eyebrow fsug-h">'+esc(t("Food suggestions"))+'</div><div class="fsug">'
       +suggestFor(focus,kl).map(function(x){
         return '<button class="fsug-t" data-fsug="'+esc(x.id+"|"+x.grams+"|"+x.label)+'" aria-label="'
          +esc(t("Log")+" "+t(FOOD[x.art])+", "+t(x.label)+", "+t(BRINGS[focus]).replace("{n}",Math.round(x.amount)))+'">'
          +'<span class="fsug-art">'+art(x.art,{still:true})+'</span>'
          +'<span class="fsug-n">'+esc(t(FOOD[x.art]))+'</span>'
          +'<span class="fsug-v">'+esc(t(BRINGS[focus]).replace("{n}",Math.round(x.amount)))+'</span>'
          +'<span class="fsug-s">'+esc(t(x.label)+" · "+t("{n} kcal").replace("{n}",fmtN(x.kcal)))+'</span></button>';}).join("")
       +'</div>';}}
  h+='</section>';
  h+=noticed(g,now);
  h+='<button class="btn g fbuild" data-fbuild="1">'+esc(t("Build today's meal"))+glyph("arrow")+'</button>';
  return h;}

/* The ellipse the four sit on, faint, with a few points of light along it. */
function orbit(){
  return '<svg class="fbody-orbit" viewBox="0 0 340 300" preserveAspectRatio="none" aria-hidden="true">'
   +'<ellipse cx="170" cy="141" rx="164" ry="106"/>'
   +'<ellipse class="in" cx="170" cy="141" rx="128" ry="80"/>'
   +[[170,35],[6,141],[334,141],[120,243],[232,240]].map(function(p){return '<circle cx="'+p[0]+'" cy="'+p[1]+'" r="2.2"/>';}).join("")
   +'</svg>';}

/* What the last week shows about protein, in one card, or nothing. */
function noticed(g,now){
  var tr={};(S.sessions||[]).forEach(function(x){if(x.date)tr[x.date]=true;});
  var w=weekPattern(S.days||{},g,now,tr);if(!w)return "";
  var s=w.kind==="train"?t(w.shortTrain===w.trainDays?"On each of your last {m} training days, protein stayed under target. Those are the days it matters most."
      :"On {n} of your last {m} training days, protein stayed under target. Those are the days it matters most.").replace("{n}",w.shortTrain).replace("{m}",w.trainDays)
    :w.kind==="short"?t("Protein was under target on {n} of the last {m} days you logged.").replace("{n}",w.short).replace("{m}",w.days)
    :t("Protein reached its target on {n} of the last {m} days you logged. Keep it there.").replace("{n}",w.met).replace("{m}",w.days);
  return '<section class="fnoticed"><span class="fnoticed-i" aria-hidden="true">'+glyph("spark")+'</span>'
   +'<div><b>'+esc(t("Coach noticed"))+'</b><p>'+esc(s)+'</p></div></section>';}

export {bodyNeeds};

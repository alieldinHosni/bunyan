/* Bunyan — the coach's routing: what follows from the last request (js/ui/answers/route.js gathers them;
   road map step 4, 25 Nov: split by topic as it was, no answer's words or figures changed). */
import {t} from "../../i18n/dict.js";
import {A, fill, l, n, p} from "./kit.js";
import {fold, spell} from "../../coach/intent.js";
import {canUndo} from "../handlers/actions.js";
import {daysIn} from "../agent.js";
import {commandOf, whenIn} from "../../coach/commands.js";
import {S, split} from "../../state.js";
import {words} from "../coachwords.js";
import {buttons, chatShown} from "../views/chat.js";
import {namedExercises} from "./route-core.js";
import {VERB, lastExchange} from "./route-read.js";

/* ---- what follows from the last request ----------------------------------------------
   "No, I meant Friday", "same for Thursday", "and Pull too": the last request said again
   with the day (or the exercise) changed, and run as if typed so (rewrite). Two requests
   in one message ("add squats to Monday and remove leg press") are two messages, each
   with its own buttons (pair). "Undo that": the newest change that can still be undone. */
var CORR=/^(no+|nope|not that|wrong|sorry|oops)?[ ,.!]*(i meant|i mean|meant|make it|change it to|actually|لا|لأ|قصدي|اقصد)( |$)/;
var SAME=/^(do |)(the same|same|that|it)( again| too|)( for| on| to| in| with)( .+)$|^(and|also|plus|و|وكمان) (.+?)( too| as well| كمان|)$/;
var PREP={exadd:"to",exremove:"from",exswap:"in"};
/* "it", "that one", "ده": the exercise the last exchange was about (owner, 27 Oct),
   said in its place, in a request that names none of its own: "add it to Friday too",
   "swap it", "شيل ده". ("How do I do it" in a workout is the exercise on screen, commands.js.) */
var PRON=/(^| )(it|that|this|that one|this one|ده|دي|هو|هي)(?= |$)/;
var PRONVERB=/^(please |pls |can you |could you |)(add|put|include|remove|delete|drop|take out|swap|replace|switch|substitute|ضيف|حط|شيل|امسح|بدل|استبدل)( |$)/;
function lastExercise(prev){
  var p=prev&&prev.ag&&prev.ag.p,n=p&&(p.name||p.from);
  if(n&&typeof n==="string")return n;
  var ne=prev?namedExercises(prev.qq||prev.q||""):[];
  return ne.length?ne[0].name:"";}
function withReferent(q,prev){
  var fq=fold(q);
  if(!PRONVERB.test(fq)||!PRON.test(" "+fq.replace(PRONVERB,"")+" ")||namedExercises(q).length)return null;
  var nm=lastExercise(prev);if(!nm)return null;
  var head=fq.match(PRONVERB)[0],rest=" "+fq.slice(head.length)+" ";
  return (head+rest.replace(PRON,"$1"+nm.toLowerCase())).replace(/\s+/g," ").trim().replace(/ (too|as well|also|كمان)$/,"");}
function rewrite(q){
  var prev=lastExchange();if(!prev||!prev.q)return null;
  var fq=fold(q),m,target,corr=false;
  var rf=withReferent(q,prev);if(rf)return rf;
  if((m=fq.match(CORR))){target=fq.slice(m[0].length).trim();corr=true;}
  else if((m=fq.match(SAME)))target=(m[5]||m[7]||"").replace(/^(for|on|to|in|with) /,"").trim();
  target=target.replace(/^(on|for|to|the|in|it|يوم|ل|لـ) /,"").replace(/ (day|يوم)$/,"").trim();
  /* Only a day or a name: anything longer, or a request of its own, is read as itself. */
  if(!target||target.split(" ").length>4||commandOf(target,S.prefs.unit))return null;
  /* The request as it was run: a correction's own words are not the request. */
  var pq=spell(fold(prev.qq||prev.q)),w=whenIn(target);
  if(w.length){
    var tk=pq.split(" "),at=-1;tk.forEach(function(x,i){if(whenIn(x).length)at=i;});
    var tw=target.split(" ").filter(function(x){return whenIn(x).length;}).pop();
    if(at>=0){tk[at]=tw;return tk.join(" ");}
    return pq+" "+tw;}
  var dd=daysIn(target);
  if(dd.days.length===1&&PREP[prev.id]){var pd=daysIn(prev.qq||prev.q);return pd.left+" "+PREP[prev.id]+" "+dd.days[0].name;}
  /* A correction naming something else: the same request with that instead. */
  if(corr&&(prev.id==="exadd"||prev.id==="exremove")){var pd2=daysIn(prev.qq||prev.q);
    return (prev.id==="exadd"?"add ":"remove ")+target+(pd2.days.length===1?" "+PREP[prev.id]+" "+pd2.days[0].name:"");}
  return null;}
/* Two requests at once, each something to do (a command, or a change to the program
   or the log, as its verb says). */
var JOIN=/ (and then|then|and also|and|ثم|وبعدين|و بعدين|وكمان) /;
function splitTwo(q){
  var s=String(q).trim(),m=s.match(JOIN);if(!m)return null;
  var a=s.slice(0,m.index).trim(),b=s.slice(m.index+m[0].length).trim();
  var doing=function(x){var f=fold(x);return !!commandOf(x,S.prefs.unit)||VERB.some(function(v){return v[1].test(f);});};
  return a&&b&&doing(a)&&doing(b)?[a,b]:null;}
function undoLast(){
  var c=chatShown();for(var i=c.length-1;i>=0;i--){var m=c[i];
    if(m&&m.ag&&m.ag.s==="applied"&&canUndo(m.at))
      return {s:"say",lead:fill(t("Undo “{d}”?"),{d:String(m.ag.done||"")}),acts:[{l:t("Undo it"),a:{"data-agundo":String(m.at)}}]};}
  return {s:"say",lead:t("There's nothing recent to undo."),acts:[]};}
export {CORR, JOIN, PREP, PRON, PRONVERB, SAME, lastExercise, rewrite, splitTwo, undoLast, withReferent};

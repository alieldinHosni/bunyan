/* Bunyan — the coach's routing: the live reading (js/ui/answers/route.js gathers them;
   road map step 4, 25 Nov: split by topic as it was, no answer's words or figures changed). */
import {t, tm} from "../../i18n/dict.js";
import {A, act, l, n} from "./kit.js";
import {exName} from "../../i18n/exnames.js";
import {isActivity} from "../../data/activities.js";
import {fold} from "../../coach/intent.js";
import {LIB} from "../../data/exercises.js";
import {split} from "../../state.js";
import {today} from "../../util.js";
import {words} from "../coachwords.js";
import {ASK} from "../ask.js";
import {buttons, chips} from "../views/chat.js";
import {READAS, readAs} from "./route-limits.js";
import {readOf} from "./route-read.js";
import {rewrite} from "./route-follow.js";

/* ---- the live reading (C-4a, docs/COACH-AGENT.md) -------------------------------------
   As the person types, what the coach understood, as up to three chips: what (act) ·
   which (the exercise or muscle) · when. Each has alternatives that rewrite the words in
   the field, never guess beyond them: another act is a whole sentence (READAS), another
   exercise replaces the words said for it, another day replaces the day word. Nothing
   understood: no chips, and the three questions nearest the words as buttons. Send works
   either way (owner, 19 Nov): this shows the reading, it does not gate it.
   Drawn by js/ui/liveread.js into one element above the field. */
var ACTL={exswap:"Swap",exadd:"Add",exremove:"Remove",avoid:"Leave out",fit:"Fit today's workout",record:"Best",technique:"How to",
  eat:"What I ate",foodday:"What I ate",week:"My week",weight:"My weight",today:"Today's workout",tomorrow:"Tomorrow's workout",volume:"My sets",
  day:"A past day",why:"Why"};
var KINDL={request:"A change","own-data":"From your log",knowledge:"A question"};
var ACTALT=[["exswap","exremove","exadd","avoid"],["record","technique","volume"],["eat","foodday"],["today","day","fit"]];
var WHEN={today:["today","النهارده"],yesterday:["yesterday","امبارح"],tomorrow:["tomorrow","بكره"]};
var WHENRE=/(^| )(today|yesterday|tomorrow|النهارده|انهارده|امبارح|بكره|بكرة)(?= |$|[?؟.,!])/i;
function liveChips(text){
  var q=String(text||"").trim(),R=q.length>=2?readOf(q,null):null;
  if(!R||(!R.kind&&!R.topic))return {chips:[],near:q.length>=3?nearAsk(q):[]};
  var ar=R.lang==="ar",E=R.entities||{},chips=[];
  var al=ACTL[R.topic]||KINDL[R.kind];
  if(al){var grp=ACTALT.filter(function(g){return g.indexOf(R.topic)>=0;})[0]||[],alts=[];
    grp.forEach(function(x){if(x===R.topic)return;var r=readAs({topic:x},R);if(r)alts.push({l:r.l,text:r.say});});
    chips.push({k:"act",l:t(al),alts:alts});}
  var ex=E.exercise&&E.exercise[0];
  if(ex&&ex.name){
    var said=ex.said||"",kw=String(ex.key||"").toLowerCase().split(" ").filter(Boolean),others=[];
    var seen={};seen[exName(ex.name)]=1;
    if(said&&kw.length)LIB.forEach(function(l){var n=l[0],ln=n.toLowerCase(),lb=exName(n);
      if(n!==ex.name&&others.length<4&&!seen[lb]&&!isActivity(n)&&kw.every(function(w){return ln.indexOf(w.replace(/s$/,""))>=0;})){seen[lb]=1;others.push(n);}});
    var re=said?new RegExp(fold(said).split(" ").map(function(w){return w.replace(/[.*+?^${}()|[\]\\-]/g,"\\$&");}).join("[^\\w\u0600-\u06ff]+"),"i"):null;
    /* Arabic letters are matched folded (ئ as ي, ة as ه): where the words as typed differ,
       the folded sentence is the one rewritten. */
    var base=!re?null:re.test(q)?q:re.test(fold(q))?fold(q):null;
    chips.push({k:"thing",l:exName(ex.name),alts:base?others.map(function(n){var nm=ar?exName(n):n;return {l:exName(n),text:base.replace(re,nm)};}):[]});}
  else if(E.muscle&&E.muscle.length)chips.push({k:"thing",l:tm(E.muscle[0]),alts:[]});
  var w=E.day&&WHEN[E.day.when]?E.day.when:"",m=WHENRE.exec(q);
  if(w){var walts=[];
    /* A change is for today or later; what was logged, today or before. */
    if(m)Object.keys(WHEN).forEach(function(k){if(k!==w&&!(k==="yesterday"&&R.kind==="request")&&!(k==="tomorrow"&&R.kind==="own-data"))walts.push({l:t(cap(k)),text:q.slice(0,m.index+m[1].length)+WHEN[k][ar?1:0]+q.slice(m.index+m[0].length)});});
    chips.push({k:"when",l:t(cap(w)),alts:walts});}
  else if(R.period==="thisweek"||R.period==="lastweek"||R.period==="nextweek")chips.push({k:"when",l:t({thisweek:"This week",lastweek:"Last week",nextweek:"Next week"}[R.period]),alts:[]});
  /* Read as something with no name to show (small talk, out of scope): as not understood. */
  if(!chips.length)return {chips:[],near:q.length>=3?nearAsk(q):[]};
  return {chips:chips,near:[]};}
function cap(s){return s.charAt(0).toUpperCase()+s.slice(1);}
/* The three questions whose words are nearest the words typed, in either language. */
function nearAsk(q){
  var ws=fold(q).split(" ").filter(function(w){return w.length>=3;});
  var sc=Object.keys(ASK).map(function(id){var en=fold(ASK[id]),ar=fold(t(ASK[id])),s=0;
    ws.forEach(function(w){if((" "+en+" ").indexOf(" "+w)>=0||(" "+ar+" ").indexOf(" "+w)>=0)s++;});return {id:id,s:s};});
  var hit=sc.filter(function(x){return x.s>0;}).sort(function(a,b){return b.s-a.s;}).map(function(x){return x.id;});
  ["today","eat","track"].forEach(function(id){if(hit.indexOf(id)<0)hit.push(id);});
  return hit.slice(0,3);}

export {ACTALT, ACTL, KINDL, WHEN, WHENRE, cap, liveChips, nearAsk};

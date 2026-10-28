/* Bunyan — the smart coach, in the app (owner, 27 Oct)
   The on-device model (js/engine/llm.js) as a setting and as a voice in the chat.

   Off unless the person switches it on in Settings → Smart coach, which says what it
   costs (the download, recent phones only, battery) before anything is fetched. Once on,
   the model loads in the background when the app opens; until it is ready, and on a phone
   that cannot run it, the coach answers as it always has.

   What it answers: only what the rule-based coach could not (chat.js marks such a message
   pending). The rules still decide everything they recognise — requests, logging, the
   textbook's answers, the hard limits — so the model never stands between the person and
   a change. Its words are grounded on a snapshot of the person's own log and the textbook
   notes the question reaches (js/engine/smart.js), shown as written by the model, and a
   change it suggests is a button that sends the request through the app's own parser. */
import {ask as llmAsk, installed, load, modelId, MODELS, ready, remove, support} from "../engine/llm.js";
import {buildMessages, readReply} from "../engine/smart.js";
import {goalOf} from "../data/goals.js";
import {lastWeight, avg7} from "../engine/formulas.js";
import {bodyFat} from "../engine/stats.js";
import {planOn} from "../engine/dayplan.js";
import {commandOf} from "../coach/commands.js";
import {intentOf, ACTION_IDS} from "../coach/intent.js";
import {t} from "../i18n/dict.js";
import {exName, planName} from "../i18n/exnames.js";
import {curProfile, S, saveDB, split} from "../state.js";
import {fmtW} from "../units.js";
import {esc, today} from "../util.js";
import {V} from "./view.js";

/* V.smart: {st, p, why, size, f16}. st: "off", "checking", "unsupported", "loading",
   "ready", "error". */
function state(){if(!V.smart)V.smart={st:"off",p:0,why:"",size:(S.prefs.smart&&S.prefs.smart.size)||"small",f16:false};return V.smart;}
function on(){return !!(S.prefs&&S.prefs.smart&&S.prefs.smart.on);}
function isReady(){return on()&&ready()&&state().st==="ready";}

var listeners=[];
function changed(){listeners.forEach(function(f){try{f();}catch(e){}});}
function onChange(f){listeners.push(f);}

/* Switch on (and download if need be), from the setting's button; or, at boot, load what
   is already on the phone. */
function start(size,fromBoot){
  var st=state();st.size=size||st.size||"small";st.st="checking";st.p=0;changed();
  return support().then(function(s){
    if(!s.ok){st.st="unsupported";st.why=s.why;changed();return false;}
    st.f16=s.f16;var id=modelId(st.size,s.f16);
    return (fromBoot?installed(id):Promise.resolve(true)).then(function(have){
      if(!have){st.st="off";changed();return false;}
      st.st="loading";changed();
      return load(id,function(p){st.p=p;changed();}).then(function(){
        st.st="ready";st.p=1;
        S.prefs.smart={on:true,size:st.size};saveDB();changed();return true;});});
  }).catch(function(e){st.st="error";st.why=String(e&&e.message||e).slice(0,140);changed();return false;});}
function stop(){
  var st=state();
  return remove().then(function(){S.prefs.smart={on:false,size:st.size};st.st="off";st.p=0;saveDB();changed();});}
/* At boot: a coach switched on before loads quietly from what is already downloaded. */
function boot(){if(on())setTimeout(function(){start(S.prefs.smart.size,true);},1500);}

/* ---- what the model is told about the person ---------------------------------------- */
function snapshot(){
  var p=S.profile||{},g=S.goals||{},out={name:(curProfile()||{}).name||""};
  out.goal=t(goalOf(p.goal).label);
  if(g.kcal)out.targets=g.kcal+" kcal, "+(g.p||0)+" g protein, "+(g.c||0)+" g carbs, "+(g.f||0)+" g fat a day";
  try{var sp0=split(),WD=["","Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
    if(sp0)out.program=planName(sp0.name||"")+", "+(sp0.schedule==="week"?"by weekday":"in rotation")+": "+sp0.days.map(function(d){
      return planName(d.name)+(sp0.schedule==="week"&&(d.wd||[]).length?" ("+d.wd.map(function(n){return WD[n];}).join(", ")+")":"")+" "+d.ex.length+" exercises";}).join("; ");}catch(e){}
  try{var sp=split(),pl=sp&&planOn(sp,today());
    if(pl)out.today=pl.kind==="done"?"trained today ("+planName(pl.name||"")+")":pl.rest?"rest day":pl.day?planName(pl.day.name)+": "+pl.day.ex.map(function(e){return exName(e.name)+" "+e.sets+"×"+e.lo+"-"+e.hi;}).join(", "):"";}catch(e){}
  if(S.active){var a=S.active,e=a.entries[V.logIdx||0];
    if(e)out.workout=planName(a.dayName)+", now "+exName(e.name)+" ("+e.sets.length+" sets logged"+(e.sets.length?", last "+fmtW(e.sets[e.sets.length-1].w)+" × "+e.sets[e.sets.length-1].r:"")+")";}
  var w=lastWeight();if(w){var a7=avg7();out.body=fmtW(w)+(a7?", 7-day average "+fmtW(a7):"")+(p.height?", height "+p.height+" cm":"")+(p.age?", age "+p.age:"");}
  try{var bf=bodyFat();if(bf&&bf.bf!=null)out.inbody="body fat "+bf.bf+"%"+(bf.lean!=null?", lean mass "+fmtW(bf.lean):"");}catch(e){}
  out.recent=(S.sessions||[]).slice(0,3).map(function(s){
    return s.date+" "+planName(s.dayName||"")+": "+(s.entries||[]).slice(0,4).map(function(e){
      var top=(e.sets||[]).filter(function(x){return !x.wu;}).sort(function(a,b){return (b.w||0)-(a.w||0);})[0];
      return exName(e.name)+(top?" "+fmtW(top.w)+"×"+top.r:"");}).join(", ");});
  out.facts=((S.context&&S.context.items)||[]).map(function(x){return x.text;}).slice(0,8);
  return out;}

/* ---- an answer, written into its row as it comes ------------------------------------ */
function rowOf(m){return document.querySelector('.chat-x[data-k="x'+m.at+'"] .chat-lead');}
function run(m,save,paint){
  if(!m||!m.pending)return;
  var prev=(S.chat||[]).filter(function(x){return x&&x!==m&&x.q&&Array.isArray(x.b)&&x.b[0]&&x.b[0].p;}).slice(-2)
    .map(function(x){return {q:x.qq||x.q,a:x.b[0].p};});
  var msgs=buildMessages(m.qq||m.q,snapshot(),m.lang==="ar"?"ar":"en",prev);
  llmAsk(msgs,function(txt){var el=rowOf(m);if(el)el.textContent=readReply(txt).text||"…";}).then(function(full){
    var r=readReply(full);
    m.pending=false;m.b=[{p:r.text||t("I don't have that. Ask me about your training, food or progress.")},
      {n:t("Written by the model on this phone, from your log and the textbook notes. It can be wrong: check a figure against your plan before you act on it.")}];
    m.acts=[];
    /* A change it suggests: a button that sends the request through the app's own
       parser, which shows it and asks before anything changes. Only one the parser knows. */
    if(r.act){var known=false;try{known=!!commandOf(r.act,S.prefs.unit)||ACTION_IDS.indexOf(intentOf(r.act).id)>=0;}catch(e){}
      if(known)m.acts.push({l:r.act.charAt(0).toUpperCase()+r.act.slice(1),a:{"data-chatsay":r.act}});}
    save();paint();
  },function(){m.pending=false;m.b=[{p:t("The smart coach couldn't answer just now. Ask me another way, or try again in a moment.")}];save();paint();});}

/* ---- the setting -------------------------------------------------------------------- */
function sheet(){
  var st=state(),sz=st.size||"small",h='<h2>'+esc(t("Smart coach"))+'</h2>'
   +'<p class="tiny">'+esc(t("A language model that runs on this phone, so the coach understands questions it has no rule for. It answers from your own log and the textbook notes, and nothing you type leaves the phone."))+'</p>'
   +'<div class="sg-card smc"><p>'+esc(t("It is a download of its own, works on recent iPhones (iOS 26) and other phones with WebGPU, and is slower and heavier on the battery than the rest of the app. Turn it off any time and the download is removed."))+'</p></div>';
  if(st.st==="unsupported")return h+'<p class="smc-st bad" role="status">'+esc(t(st.why==="nogpu"?"This browser can't run it: it has no WebGPU. On iPhone it needs iOS 26 or later.":"This phone's GPU isn't available to the browser, so it can't run here."))+'</p>';
  if(st.st==="loading"||st.st==="checking")return h+'<div class="smc-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+Math.round(st.p*100)+'"><i style="width:'+Math.round(st.p*100)+'%"></i></div>'
    +'<p class="smc-st" role="status"><span class="num">'+Math.round(st.p*100)+'%</span> · '+esc(t("Downloading and loading the model. Keep the app open; the coach answers as usual meanwhile."))+'</p>';
  if(st.st==="ready")return h+'<p class="smc-st ok" role="status">✓ '+esc(t(sz==="better"?"On: the better model is ready.":"On: the small model is ready."))+'</p>'
    +'<button class="btn danger" data-smartoff="1">'+esc(t("Turn off and remove the download"))+'</button>';
  h+='<div class="smc-pick" role="radiogroup" aria-label="'+esc(t("Model size"))+'">'
    +[["small","Small",MODELS.small.gb,"Quicker, lighter: most questions."],["better","Better",MODELS.better.gb,"Understands more, for phones with 8 GB of memory."]].map(function(o){
      return '<button class="'+(sz===o[0]?'on':'')+'" data-smartsize="'+o[0]+'" role="radio" aria-checked="'+(sz===o[0])+'"><b>'+esc(t(o[1]))+'</b>'
        +'<span>'+esc(t("About {n} GB").replace("{n}",o[2]))+' · '+esc(t(o[3]))+'</span></button>';}).join("")+'</div>'
    +(st.st==="error"?'<p class="smc-st bad" role="alert">'+esc(t("It didn't load. Check the connection and that there is free space, then try again."))+'</p>':'')
    +'<button class="btn" data-smarton="1">'+esc(t("Download and turn on"))+'</button>';
  return h;}

export {boot, isReady, onChange, run, sheet, snapshot, start, state, stop};

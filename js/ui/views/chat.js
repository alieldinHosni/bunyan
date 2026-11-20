/* Bunyan — Coach AI: ask the coach
   A guided chat, not a chatbot. Nothing is sent anywhere and no model writes the
   answers: js/coach/intent.js matches the question, typed in English or Arabic or
   tapped from a suggestion, to one of a fixed set of things the coach knows how to
   answer, and the answer is worked out here from the person's own log, plan and
   targets, with the same engines the rest of the app uses. So it can only say what
   the app knows, and it says so when a question is outside that.

   Each answer is kept (the last 30), so the conversation is still there next time. The
   newest answer carries its buttons; older ones are text, because what a button would
   act on may have changed since.

   An answer is in the language the question was asked in, whatever the app is set to:
   Arabic letters (or Egyptian Arabic typed in Latin letters) get Arabic, English gets
   English. A tapped suggestion follows the conversation. */
import {loadArabic, t} from "../../i18n/dict.js";
import {list, n, uiLang, withLang} from "../answers/kit.js";
import {faqById} from "../../engine/faq.js";
import {canUndo} from "../handlers/actions.js";
import {S} from "../../state.js";
import {esc, num, shortd} from "../../util.js";
import {isReady, proseOf} from "../smartcoach.js";
import {backArrow} from "../nav.js";
import {glyph} from "../glyphs.js";
import {ASK} from "../ask.js";
import {ANSWER, DAY, SCOPE, isSafety, pruneChat, scopeAnswer, withTold} from "../answers/route.js";
/* The suggestions: what each asks, as the person would ask it. */
/* The suggestions (js/ui/ask.js, apart so the Coach page draws its chips without the chat). */
/* What to offer next after an answer from the bank, by what it was about. */
var FAQNEXT={train:["today","weights","sore"],cardio:["steps","today","track"],mobility:["today","sore","balance"],
  food:["eat","protein","calories"],body:["weight","track","goal"],habit:["today","track","missed"],app:["help","today","track"]};
/* What to offer next, after each kind of answer. */
var NEXT={
  plateau:["strong","weights","sore"],inbody:["weight","calories","goal"],twice:["today","sore","missed"],warmplan:["today","weights","sore"],loadlog:["weights","strong","today"],week:["track","strong","protein"],today:["weights","tomorrow","missed"],weights:["today","strong","balance"],eat:["rest","swap","protein"],
  track:["weight","strong","balance"],weight:["calories","eat","goal"],protein:["eat","calories","track"],
  calories:["protein","weight","goal"],sore:["today","missed","balance"],missed:["today","weights","track"],
  balance:["today","strong","plan"],strong:["weights","track","balance"],goal:["calories","plan","weight"],
  plan:["today","eat","goal"],water:["eat","steps","track"],steps:["weight","water","track"],
  help:["today","eat","track"],hello:["today","eat","track"],thanks:["today","eat","track"],unknown:["today","eat","track"],
  tomorrow:["today","weights","last"],last:["strong","weights","tomorrow"],rest:["swap","protein","eat"],
  swap:["rest","protein","eat"],foodinfo:["swap","rest","protein"],
  exadd:["today","balance","tomorrow"],exremove:["today","balance","tomorrow"],exswap:["today","balance","weights"],
  foodlog:["rest","protein","eat"],weighlog:["weight","calories","track"],reassess:["plan","goal","today"],
  kreps:["weights","balance","today"],ksets:["balance","weights","today"],krest:["weights","today","missed"],kfreq:["balance","plan","today"],
  kvolume:["balance","strong","plan"],ktempo:["weights","today","strong"],kwarm:["today","weights","sore"],kdur:["missed","today","balance"],
  k1rm:["strong","weights","track"],scope:["today","track","help"],situation:["today","rest","track"],
  weekfood:["rest","protein","track"],logfood:["rest","eat","track"],weektrain:["today","tomorrow","balance"],letgo:["today","tomorrow","track"],
  lowday:["today","sore","missed"],remember:["facts","today","eat"],facts:["today","eat","track"],
  know:["today","eat","track"],smart:["today","eat","track"],app:["today","eat","track"],exsuggest:["today","balance","weights"]};

/* An Arabic question gets an Arabic answer in the English app, so the Arabic dictionary
   (js/i18n/ar.js, WP-9) is brought in once the first screen is up, when the phone is idle. */
(window.requestIdleCallback||function(f){return setTimeout(f,2000);})(function(){loadArabic();});
ANSWER.scope=function(a,q,it){var f=it&&it.force?SCOPE.filter(function(x){return x[0]===it.force;})[0]:null;return scopeAnswer(a,q,f||null);};
["missed","kfreq","kdur","weektrain"].forEach(function(k){ANSWER[k]=withTold(ANSWER[k],["schedule","obstacle"]);});
["eat","rest","weekfood","swap"].forEach(function(k){ANSWER[k]=withTold(ANSWER[k],["preference","constraint","obstacle"],true);});
/* The conversation as the chat shows it: today's day of it, since it was last cleared. */
function chatShown(){
  var from=Math.max(Date.now()-DAY,num(S.chatFrom));
  return (S.chat||[]).filter(function(m){return m&&typeof m==="object"&&num(m.at)>from;});}
/* Whether the history holds more than the chat shows: then the chat offers it. */
function hasOlder(){return (S.chat||[]).length>chatShown().length;}
/* The way from the chat to its history, at the top of the conversation. */
function histLink(){
  return hasOlder()?'<button class="chat-histl" data-chathist="1">'+glyph("clock")+'<span>'+esc(t("Review chat history"))+'</span></button>':'';}

/* ---- red flags first (js/coach/safety.js, docs/COACH-AGENT.md 2.2) ---------------------
   Fixed text, worded from the scope rules (js/knowledge/scope.js emergency_certified,
   refer_symptoms, refer_unusual_pain, refer_suspected_mental_illness), and nothing added
   to it: no advice, no figures, no other suggestion. Stop now says stop and get help, and
   with a workout open, the way to end it. Stop the session adds the recovery log. A
   medicine, a condition or a pregnancy is the scope answer as it was; self-harm and
   eating very little get a kind line and a person to talk to, nothing else. */
var SAFETOPIC={stop:"Stop now",session:"Stop this session",refer:"Talk to someone"};

/* ---- on screen ------------------------------------------------------------------
   Not a chatbot's look: a question is a short line on the reading side, and an answer
   is a card that names what it is about, with its lists as ruled rows, its notes set
   apart, and its buttons last. Nothing is coloured by who said it; the accent is kept
   for the one button an answer leads to. */
/* What each answer is about, and its glyph (js/ui/glyphs.js). */
var TOPIC={live:["This workout","dumbbell"],phase:["Your phase","bars"],zones:["Cardio zones","route"],health:["Your health","target"],recap:["Your day","bowl"],plateau:["A stuck lift","medal"],inbody:["Your InBody","scale"],twice:["Two sessions in a day","dumbbell"],warmplan:["Your warm-up","flame"],loadlog:["How weights are logged","dumbbell"],week:["Your week","bars"],today:["Today's workout","dumbbell"],weights:["What to lift","dumbbell"],eat:["What to eat","bowl"],crave:["Something sweet","bowl"],lighter:["A lighter workout","dumbbell"],
  track:["How you're doing","bars"],weight:["Weight trend","scale"],protein:["Protein","shaker"],calories:["Calories","flame"],
  sore:["Recovery","moon"],missed:["Short on time","clock"],balance:["Program balance","balance"],strong:["Strength","medal"],
  goal:["Your goal","target"],plan:["A new plan","clipboard"],water:["Water","drop"],steps:["Steps and cardio","route"],
  help:["What I can answer","question"],tomorrow:["Tomorrow's workout","dumbbell"],last:["Last workout","bars"],
  rest:["The rest of today","bowl"],swap:["Food swaps","balance"],foodinfo:["Food facts","info"],
  exadd:["Change your program","clipboard"],exremove:["Change your program","clipboard"],exswap:["Change your program","swap"],
  foodlog:["Log food","bowl"],weighlog:["Weigh-in","scale"],reassess:["A new plan","clipboard"],
  kreps:["Reps","dumbbell"],ksets:["Sets","dumbbell"],krest:["Rest between sets","clock"],kfreq:["How often to train","clock"],
  kvolume:["Weekly volume","balance"],ktempo:["Tempo","clock"],kwarm:["Warming up","flame"],kdur:["Session length","clock"],
  k1rm:["One-rep max","medal"],scope:["Outside what I do","info"],situation:["A rough day","moon"],
  weekfood:["The week's food","bowl"],logfood:["The week's food","bowl"],weektrain:["The week's training","dumbbell"],letgo:["The week's training","dumbbell"],
  lowday:["A low day","moon"],remember:["What you told me","person"],facts:["What you told me","person"],
  know:["Good to know","spark"],record:["Strength","medal"],tired:["Tired all the time","moon"],technique:["How to do it","dumbbell"],foodday:["What you ate","bowl"],day:["A day's training","bars"],
  volume:["Weekly volume","balance"],why:["Why","question"],fit:["Today's workout","clock"],days:["Training days","clock"],avoid:["Change your program","clipboard"],
  away:["Travel","route"],out:["Outside what I do","info"],clarify:["Did you mean","question"],correction:["Did you mean","question"],smart:["Smart coach","spark"],app:["In the app","check"],exsuggest:["Exercises for you","dumbbell"]};
/* The opening screen: what can be asked, by what it is about. */
var GROUPS=[["Training",["today","tomorrow","weights","sore"]],["Food",["eat","rest","swap","protein"]],
  ["Progress",["track","last","weight","strong"]]];

function chips(ids,cls,lang){
  return '<div class="chat-chips'+(cls?' '+cls:'')+'">'+ids.map(function(id){
    return '<button class="chat-chip" data-chatq="'+id+'"'+(lang?' data-chatl="'+lang+'"':'')+'>'+esc(t(ASK[id]))+'</button>';}).join("")+'</div>';}
function topicRow(id){
  var tp=TOPIC[id]||["","question"];
  return '<button class="chat-topic" data-chatq="'+id+'"><span class="chat-gl">'+glyph(tp[1])+'</span>'
   +'<span class="chat-topic-q">'+esc(t(ASK[id]))+'</span><span class="ico ico-chev" aria-hidden="true"></span></button>';}
/* ro: in the history, to read: no button in it does anything, so none is drawn. */
function bubble(m,live,prev,ro){
  var L=m.lang==="ar"||m.lang==="en"?m.lang:uiLang();
  return withLang(L,function(){return bubbleIn(m,ro?false:live,L,prev,ro);});}
/* An answer reads as one or two sentences; the rest is behind More. */
function sentences(s){
  var out=[],re=/[.!?؟]\s+/g,mm,from=0;
  while((mm=re.exec(s))){out.push(s.slice(from,mm.index+1));from=re.lastIndex;}
  out.push(s.slice(from));
  return out.filter(function(x){return x.trim();});}
/* The lead's figures stand out, each in .num so bidi keeps it one run. */
function figures(s){
  return String(s).split(/(\d[\d,.:×–]*\d|\d)/).map(function(x,i){return i%2?'<span class="num">'+esc(x)+'</span>':esc(x);}).join("");}
function blocks(list){
  var h="";
  list.forEach(function(x){
    if(!x)return;
    /* Figures in .num, as the lead's, so bidi does not reorder them in Arabic. */
    if(x.p!=null)h+='<p>'+figures(String(x.p))+'</p>';
    else if(Array.isArray(x.l))h+='<ul class="chat-l">'+x.l.map(function(i){return '<li>'+figures(String(i))+'</li>';}).join("")+'</ul>';
    else if(x.n!=null)h+='<p class="chat-n">'+glyph("info")+'<span>'+figures(String(x.n))+'</span></p>';});
  return h;}
/* A kept conversation comes back from storage and from backups, so a button is only
   ever its label and data-* attributes the app itself acts on. */
function buttons(acts){
  return acts.length?'<div class="chat-acts">'+acts.map(function(b,i){
    var at=Object.keys(b.a||{}).filter(function(k){return /^data-[a-z]+$/.test(k);})
      .map(function(k){return ' '+k+'="'+esc(b.a[k])+'"';}).join("");
    return '<button class="btn '+(i?'g ':'')+'sm"'+at+'>'+esc(String(b.l||""))+'</button>';}).join("")+'</div>':"";}
/* A request: what will change and the tap that does it; done, with Undo; undone; or the
   one piece still missing, its real choices as rows. Every value here was worked out
   when the request was made and kept with it, so it shows as it was said. */
var AGSTATE={confirm:1,applied:1,undone:1,declined:1,failed:1,pick:1,say:1};
function agHtml(m,live,ro){
  var g=m.ag,at=esc(String(m.at)),h=g.lead?'<p class="chat-lead">'+figures(String(g.lead))+'</p>':'';
  if(g.s==="confirm"||g.s==="applied"||g.s==="undone"||g.s==="declined"||g.s==="failed"){
    if(g.item)h+='<div class="ag-item"><b>'+figures(String(g.item))+'</b>'+(g.detail?'<span>'+figures(String(g.detail))+'</span>':'')+'</div>';
    /* Several at once (a day told in one message). */
    if(Array.isArray(g.items))g.items.forEach(function(x){h+='<div class="ag-item"><b>'+figures(String(x.item||""))+'</b>'+(x.detail?'<span>'+figures(String(x.detail))+'</span>':'')+'</div>';});}
  /* What else to say with it: advice that goes with the request. */
  if(Array.isArray(g.notes)&&g.notes.length)h+='<ul class="chat-l ag-notes">'+g.notes.map(function(x){return '<li>'+figures(String(x))+'</li>';}).join("")+'</ul>';
  if(g.s==="confirm"&&live)h+='<div class="ag-acts"><button class="btn ag-ok" data-agok="'+at+'">'+esc(String(g.cta||t("Do it")))+'</button>'
    +'<button class="btn g ag-no" data-agno="'+at+'">'+esc(t("Not now"))+'</button></div>';
  else if(g.s==="applied")h+='<div class="ag-done" role="status"><span class="ag-ck">'+glyph("check")+'</span><span class="ag-t">'+esc(String(g.done||""))+'</span>'
    +(!ro&&canUndo(m.at)?'<button class="ag-undo" data-agundo="'+at+'">'+esc(t("Undo"))+'</button>':'')+'</div>';
  else if(g.s==="undone")h+='<div class="ag-undone" role="status">'+glyph("restore")+'<span>'+esc(String(g.undone||""))+'</span></div>';
  else if(g.s==="declined")h+='<p class="chat-n">'+glyph("info")+'<span>'+esc(t("Kept as it is."))+'</span></p>';
  else if(g.s==="failed")h+='<p class="chat-n">'+glyph("info")+'<span>'+esc(t("That didn't go through. Nothing was changed."))+'</span></p>';
  else if(g.s==="pick"&&live)h+='<div class="ag-opts'+(g.what==="muscle"?' two':'')+'">'+(g.opts||[]).map(function(o,i){
      return '<button class="ag-opt" data-agpick="'+at+'|'+i+'"><span class="ag-ol">'+esc(String(o.l||""))+'</span>'+(o.sub?'<span class="ag-os">'+esc(String(o.sub))+'</span>':'')+'</button>';}).join("")
    +(g.none?'<button class="ag-opt none" data-agnone="'+at+'"><span class="ag-ol">'+esc(t("None of these"))+'</span></button>':'')+'</div>';
  if(g.s==="say"&&live)h+=buttons(Array.isArray(g.acts)?g.acts:[]);
  return h;}
function bubbleIn(m,live,L,prev,ro){
  var fq=m.id==="faq"&&m.faq?faqById(m.faq):null,tp=fq?[fq.title,fq.glyph]:m.id==="safety"?[SAFETOPIC[m.safety]||"Stop now","info"]:TOPIC[m.id];
  var h='<div class="chat-x'+(live?' live':'')+(prev?' prev':'')+(ro?' ro':'')+'" data-k="'+(ro?'h':'x')+esc(String(m.at||""))+'" lang="'+L+'" dir="'+(L==="ar"?"rtl":"ltr")+'"><div class="chat-q"><p dir="auto">'+esc(String(m.q||""))+'</p></div><div class="chat-a">'
   +'<div class="chat-ah"><span class="chat-gl">'+glyph(tp?tp[1]:"question")+'</span><span class="chat-ah-t">'
   +'<span class="chat-ak">'+esc(t("Coach"))+'</span>'+(tp?'<span class="chat-at">'+esc(t(tp[0]))+'</span>':'')+'</span></div>';
  if(m.ag&&typeof m.ag==="object"&&AGSTATE[m.ag.s])return h+agHtml(m,live,ro)+missHtml(m,live,ro)+'</div></div>';
  /* Where an answer stands is kept with it, not shown: the coach speaks as a coach. */
  var srcs=Array.isArray(m.src)?m.src:[];
  if(srcs.length)h=h.replace('<div class="chat-a">','<div class="chat-a" data-src="'+esc(srcs.join(" · "))+'">');
  var b=(Array.isArray(m.b)?m.b:[]).filter(Boolean),lead="",more=b;
  if(b[0]&&b[0].p!=null){
    var ss=sentences(String(b[0].p));lead=ss.slice(0,2).join(" ");
    more=(ss.length>2?[{p:ss.slice(2).join(" ")}]:[]).concat(b.slice(1));}
  if(m.pending)h+='<p class="chat-lead smart-wait" aria-live="polite">'+esc(t("Thinking…"))+'</p>';
  else if(lead)h+='<p class="chat-lead">'+figures(lead)+'</p>';
  if(!lead)h+=blocks(more);
  else if(more.length)h+='<details class="chat-more"><summary>'+esc(t("More"))+'</summary>'+blocks(more)+'</details>';
  h+=buttons(live&&Array.isArray(m.acts)?m.acts:[]);
  if(live&&!ro&&Array.isArray(m.alt)&&m.alt.length)
    h+='<div class="chat-alt"><span>'+esc(t("Or did you mean"))+'</span>'
     +m.alt.filter(function(x){return ASK[x];}).map(function(x){return '<button class="chat-altb" data-chatq="'+esc(x)+'">'+esc(t(ASK[x]))+'</button>';}).join("")+'</div>';
  return h+missHtml(m,live,ro)+'</div></div>';}
/* Not what I asked (owner, 27 Oct): on the newest answer to something typed, a quiet
   link that keeps the question on this phone (S.missed) for the owner to send on, so a
   misreading becomes a fix and a test. Said once it is kept. */
function missHtml(m,live,ro){
  /* Never under a safety reply: its words are fixed, and nothing is offered after them. */
  if(!live||ro||!m||!m.q||m.id==="app"&&!m.ag||m.safety||m.id==="safety")return "";
  /* Under a clarifying question it would ask twice: that question is already asking. */
  if(m.id==="clarify")return "";
  if(m.miss)return '<p class="chat-missd" data-k="miss'+esc(String(m.at))+'">'+esc(t("Kept, thanks. Try saying it another way, or tap a question below."))+'</p>'
    +(m.id!=="smart"&&m.id!=="safety"&&!m.safety&&isReady()&&!isSafety(m.qq||m.q)?'<button class="chat-altb" data-smarttry="'+esc(String(m.at))+'">'+esc(t("Let the smart coach try"))+'</button>':'');
  return '<button class="chat-miss" data-chatmiss="'+esc(String(m.at))+'" data-k="miss'+esc(String(m.at))+'">'+esc(t("Not what I asked"))+'</button>'
    /* With the smart coach on: the coach's own answer, put another way (C-9). Not for a
       miss, a reply that is the model's already, or one with nothing to reword. */
    +(isReady()&&!m.re&&!/^(smart|unknown|clarify|correction|safety)$/.test(m.id||"")&&!isSafety(m.qq||m.q)&&proseOf(m)?'<button class="chat-altb" data-smartsay="'+esc(String(m.at))+'">'+esc(t("Say it another way"))+'</button>':'');}

/* The screen: a header that says where the answers come from, then either what can be
   asked or the conversation and what to ask next, and a box to type in that stays in
   reach above the dock. */
function vChat(){
  var log=chatShown(),last=log[log.length-1];
  var h='<div class="chat-head">'+backArrow()
   +'<div class="chat-head-t"><h1>'+esc(t("Ask the coach"))+'</h1>'
   +'<p class="chat-priv">'+glyph("lock")+'<span>'+esc(t("From your log, worked out on this phone"))+'</span></p></div>'
   +(log.length?'<button class="icobtn chat-clear" data-chatclear="1" aria-label="'+esc(t("Clear"))+'">'+glyph("trash")+'</button>':'')
   +'</div>';
  h+='<div class="chat" role="log" aria-live="polite">'+histLink();
  if(!log.length){
    h+='<div class="chat-orb" aria-hidden="true">'+glyph("whistle")+'</div>'
     +'<p class="chat-hi">'+esc(t("Ask me about today's training, your food, or how things are going. Tap a question, or type your own, in English or Arabic."))+'</p>'
     +GROUPS.map(function(g){
        return '<section class="chat-grp"><h2 class="chat-grp-h">'+esc(t(g[0]))+'</h2>'
         +'<div class="chat-topics">'+g[1].map(topicRow).join("")+'</div></section>';}).join("")
     +'<p class="chat-dis">'+esc(t("Answers come from your own log, plan and targets, worked out on this phone. Nothing you type leaves it."))+'</p>';}
  log.forEach(function(m,i){h+=bubble(m,liveAt(log,i));});
  h+='</div>';
  if(last)h+=askNext(last,log.length);
  h+='<div id="chatread" class="rd" aria-live="polite" hidden></div><div class="chat-form"><input id="chatq" type="text" enterkeyhint="send" autocomplete="off" maxlength="300" placeholder="'
   +esc(t("Tell the coach what you need"))+'" aria-label="'+esc(t("Tell the coach what you need"))+'">'
   +'<button class="chat-send" data-chatsend="1" aria-label="'+esc(t("Ask"))+'">'+glyph("send")+'</button></div>';
  return h;}

/* What to ask next, in the conversation's language (the floating Coach shows it too).
   After the first answer it is a list under its heading, a way in; after that (n, the
   answers so far, above 1) one slim row that scrolls sideways, so it never takes the
   conversation's room (owner, 27 Oct). */
function askNext(last,n){
  /* After a red flag, nothing else is suggested. */
  if(last&&last.id==="safety")return "";
  var LL=last.lang==="ar"||last.lang==="en"?last.lang:uiLang(),own=LL!==uiLang()?LL:"",slim=n>1;
  return withLang(LL,function(){return '<div class="chat-next'+(slim?' slim':'')+'" lang="'+LL+'" dir="'+(LL==="ar"?"rtl":"ltr")+'"'
    +(slim?' role="group" aria-label="'+esc(t("Ask next"))+'">':'><div class="chat-next-h">'+esc(t("Ask next"))+'</div>')
    /* What the answer already offers under "Or did you mean" is not offered twice. */
    +chips((last.id==="faq"&&faqById(last.faq)?FAQNEXT[faqById(last.faq).group]||NEXT.unknown:NEXT[last.id]||NEXT.unknown).filter(function(x){return !(Array.isArray(last.alt)&&last.alt.indexOf(x)>=0)&&!(last.acts||[]).some(function(b){return b&&b.a&&b.a["data-chatq"]===x;});}),"",own)+'</div>';});}

/* ---- the chat history (Profile → Chat history) ----------------------------------
   Thirty days of the conversation, by day, newest day first, to read: nothing in it
   can be sent or tapped into doing something. One button deletes it all, with Undo. */
function histSheet(){
  pruneChat();
  var log=(S.chat||[]).filter(function(m){return m&&typeof m==="object"&&num(m.at)>0;}),days={},order=[];
  log.forEach(function(m){var d=new Date(num(m.at)),k=d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate();
    if(!days[k]){days[k]=[];order.push(k);}days[k].push(m);});
  var h='<h2>'+esc(t("Chat history"))+'</h2><p class="tiny">'
   +esc(t("Your conversations with the coach from the last 30 days, to read. Older days are removed; the chat itself shows the last 24 hours."))+'</p>';
  /* The questions marked Not what I asked, to send on: copied as plain lines. */
  var ms0=Array.isArray(S.missed)?S.missed:[];
  if(ms0.length)h+='<section class="chh-miss"><h3 class="sg-h">'+esc(t("Questions the coach got wrong"))+' <span class="num">'+ms0.length+'</span></h3>'
    +'<p class="tiny">'+esc(t("Copy them and send them on, so the coach learns to read them."))+'</p>'
    +'<div class="sacts"><button class="btn g sm" data-misscopy="1">'+esc(t("Copy the list"))+'</button>'
    +'<button class="btn g sm" data-missexport="1">'+esc(t("Export as a file"))+'</button>'
    +'<button class="btn g sm" data-missclear="1">'+esc(t("Clear"))+'</button></div></section>';
  if(!log.length)return h+'<p class="chh-empty">'+esc(t("Nothing here yet."))+'</p>';
  /* Search: typing hides what doesn't match, each row in place (handlers/fields.js). */
  h+='<input id="chhq" class="chh-q" type="search" enterkeyhint="search" autocomplete="off" placeholder="'+esc(t("Search the history"))+'" aria-label="'+esc(t("Search the history"))+'">'
   +'<p class="chh-none tiny" id="chhNone" hidden>'+esc(t("Nothing matches."))+'</p>';
  order.reverse().forEach(function(k){var ms=days[k];
    h+='<section class="chh-day"><h3 class="sg-h">'+esc(dayWord(num(ms[0].at)))+'</h3>'
     +ms.map(function(m){return bubble(m,false,false,true);}).join("")+'</section>';});
  return h+'<div class="sacts"><button class="btn d" data-chathistdel="1">'+esc(t("Delete chat history"))+'</button></div>';}
/* Today, Yesterday, or the date. */
function dayWord(at){
  var d=new Date(at),n=new Date(),y=new Date(n.getTime()-DAY),same=function(a,b){return a.toDateString()===b.toDateString();};
  if(same(d,n))return t("Today");
  if(same(d,y))return t("Yesterday");
  return shortd(d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"));}

/* Whether a message's buttons are live: the newest one, or both of a pair still waiting. */
function liveAt(log,i){var m=log[i],n=log.length-1;
  return i===n||(i===n-1&&m&&m.pair&&log[n].pair&&m.ag&&(m.ag.s==="confirm"||m.ag.s==="pick"));}

export {ASK, askNext, bubble, liveAt, chatShown, histLink, histSheet, NEXT, vChat, TOPIC, blocks, buttons, chips};
/* The coach's routing lives in js/ui/answers/route.js; what callers have always asked
   chat.js for is still answered here. */
export {liveChips, warmCoach, ask, isSafety, inbodyReading, findMsg, follow, pruneChat} from "../answers/route.js";

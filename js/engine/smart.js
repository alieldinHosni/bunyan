/* Bunyan — the smart coach's words: what the on-device model is told, and what is read
   back from it (owner, 27 Oct: "make the coach understand anything").

   The model runs on the phone (js/ui/smartcoach.js) and knows nothing of this person or
   of the textbooks. Everything it may use is put in front of it here, as agent-zero and
   ollama-agent do for a local model: the person's own figures (a snapshot the caller
   builds from the log), the passages of the knowledge base that the question reaches
   (js/engine/kbsearch.js, BM25), the last exchanges, and the rules. It is told to answer
   from those alone and to say when they do not hold the answer — the app's own rule:
   no invented values.

   It never changes anything itself. When the person asks for something to be done, it
   may end its answer with one line, "DO: <a request in plain English>", which the app's
   own parser reads (js/coach/commands.js, js/ui/agent.js) and shows as a confirmation,
   exactly as if typed. A request the parser does not know is dropped, not guessed at.

   Pure: messages in, text out. */
import {bestFacts, prose, search} from "./kbsearch.js";

var MAXCTX=1400,MAXPASS=3;

/* The passages a question reaches, as numbered notes the answer can lean on. */
function passagesFor(q){
  var r=[];try{r=search(q,MAXPASS);}catch(e){r=[];}
  return r.filter(function(x){return x.score>=4;}).map(function(x,i){
    var lines=bestFacts(x.doc,q,4).map(prose);
    return "["+(i+1)+"] "+(x.doc.title||x.doc.file||"")+": "+lines.join(" ");});}

/* snap: {name, goal, targets, today, recent[], body, facts[], inbody, workout} — short
   strings the caller wrote from the log. lang: "ar" or "en". hist: [{q, a}] newest last. */
function buildMessages(q,snap,lang,hist){
  snap=snap||{};
  var me=[["Goal",snap.goal],["Daily targets",snap.targets],["Today",snap.today],["Workout under way",snap.workout],
    ["Body",snap.body],["InBody",snap.inbody],["Recent training",(snap.recent||[]).join("; ")],
    ["What they told you",(snap.facts||[]).join("; ")]]
    .filter(function(p){return p[1];}).map(function(p){return "- "+p[0]+": "+p[1];}).join("\n").slice(0,MAXCTX);
  var notes=passagesFor(q).join("\n");
  var sys=[
    "You are Bunyan's coach, inside a training and nutrition app, talking to "+(snap.name||"the person")+".",
    "Answer in "+(lang==="ar"?"Egyptian Arabic, as a friend from Cairo would write it":"plain English")+", in at most four short sentences.",
    "Use only the person's figures and the textbook notes below. Never invent a number, a food's macros, or a weight. If they do not hold the answer, say you do not have that, and say what would.",
    "No diagnosis, no injury treatment, no medication or supplement doses: for pain, illness or medicine, say to see a doctor or a physiotherapist.",
    "If they ask you to change or log something, answer briefly, then end with one last line: DO: followed by the request in plain English, the way the app's buttons would say it (for example: DO: add face pulls to Pull day / DO: next exercise / DO: log 80 kg for 8 / DO: skip today). Only one DO line, only when asked to act.",
    "",
    "The person:",me||"- (nothing logged yet)",
    "",
    "Textbook notes:",notes||"- (none match this question)"].join("\n");
  var msgs=[{role:"system",content:sys}];
  (hist||[]).slice(-2).forEach(function(h){
    if(h&&h.q&&h.a){msgs.push({role:"user",content:String(h.q).slice(0,300)});msgs.push({role:"assistant",content:String(h.a).slice(0,500)});}});
  msgs.push({role:"user",content:String(q).slice(0,400)});
  return msgs;}

/* The model's text → {text, act}: the answer to show, and the one request to run through
   the app's parser, if it ended with one. Thinking blocks some models write are dropped. */
function readReply(raw){
  var s=String(raw||"").replace(/<think>[\s\S]*?<\/think>/g,"").replace(/<think>[\s\S]*$/,"").trim();
  var act="",m=s.match(/(?:^|\n)\s*DO:\s*(.+?)\s*$/);
  if(m){act=m[1].replace(/^["“']|["”'.]$/g,"").trim();s=s.slice(0,m.index).trim();}
  s=s.replace(/\n{3,}/g,"\n\n");
  return {text:s,act:act};}

export {buildMessages, passagesFor, readReply};

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
import {faqRank} from "./faq.js";

var MAXCTX=1400,MAXPASS=3;

/* How the app works, where each thing is: a question about doing something in Bunyan is
   answered from this, never guessed (owner, 28 Oct: asked how to have two sessions in a
   day, it said only "don't forget to rest"). Kept to what the app does. */
var APP=[
  "Training tab: today's card starts the day's workout; Change swaps it for another day of the program; Add another session today adds a second session for today only.",
  "Coach > Training: the program. Days, their exercises, sets and reps. Schedule By weekday (fixed weekdays) or In rotation (the next day whenever you train). By weekday, giving two days the same weekday makes two sessions that day, every week.",
  "In a workout: log each set's weight and reps, the rest timer runs between sets, a tap on 6 to 10 says how hard a set was (RPE). The exercise name at the top lists today's exercises, to jump to or reorder. Next exercise, Skip exercise and Add exercise are under the sets; the ⋯ menu has a note, warm-up again, it hurts, and remove this exercise.",
  "Food tab: today's meals and targets; log a food by name or barcode; the meal plan is built from the targets.",
  "Progress: weight, body measurements, InBody results (read from the sheet's photo), records and charts.",
  "Profile: You (age, height, weight, goal), Smart coach, and sharing a program or meal plan with another Bunyan user (Add a shared plan to receive one).",
  "The coach can change things when asked: add, remove or swap an exercise in a day, log a set or a food, log a weigh-in, change the goal."];

/* The passages a question reaches, as numbered notes the answer can lean on. */
function passagesFor(q){
  var r=[];try{r=search(q,MAXPASS);}catch(e){r=[];}
  return r.filter(function(x){return x.score>=4;}).map(function(x,i){
    var lines=bestFacts(x.doc,q,4).map(prose);
    return "["+(i+1)+"] "+(x.doc.title||x.doc.file||"")+": "+lines.join(" ");});}

/* The coach's own written answers (js/data/faq.js) closest to the question: the two
   best, if they are near enough to be about it, their plain paragraphs only (a line
   with a slot for the person's figures is left out: the figures are under The person). */
var FAQNOTE=0.3;
function answersFor(q){
  var r=[];try{r=faqRank(q).slice(0,2);}catch(e){r=[];}
  return r.filter(function(x){return x.score>=FAQNOTE;}).map(function(x){
    var lines=x.f.a.filter(function(y){return y.p&&!y.if||y.n;}).map(function(y){return y.p||y.n;}).slice(0,3);
    return "- "+x.f.title+": "+lines.join(" ");});}

/* snap: {name, goal, targets, today, recent[], body, facts[], inbody, workout} — short
   strings the caller wrote from the log. lang: "ar" or "en". hist: [{q, a}] newest last. */
function buildMessages(q,snap,lang,hist){
  snap=snap||{};
  var me=[["Goal",snap.goal],["Daily targets",snap.targets],["Program",snap.program],["Today",snap.today],["Workout under way",snap.workout],
    ["Body",snap.body],["InBody",snap.inbody],["Recent training",(snap.recent||[]).join("; ")],
    ["What they told you",(snap.facts||[]).join("; ")]]
    .filter(function(p){return p[1];}).map(function(p){return "- "+p[0]+": "+p[1];}).join("\n").slice(0,MAXCTX);
  var notes=passagesFor(q).join("\n");
  var sys=[
    "You are Bunyan's coach, inside a training and nutrition app, talking to "+(snap.name||"the person")+".",
    "Answer in "+(lang==="ar"?"Egyptian Arabic, as a friend from Cairo would write it":"plain English")+", in at most four short sentences.",
    "Use only the person's figures, the textbook notes, the coach's own answers and how the app works, below. Never invent a number, a food's macros, or a weight. If they do not hold the answer, say you do not have that, and say what would.",
    "Answer the question asked, for this person: name their own plan, days and figures where they bear on it. When the app does what they ask about, say exactly where (the tab, the button). No filler and no general reminders.",
    "No diagnosis, no injury treatment, no medication or supplement doses: for pain, illness or medicine, say to see a doctor or a physiotherapist.",
    "If they ask you to change or log something, answer briefly, then end with one last line: DO: followed by the request in plain English, the way the app's buttons would say it (for example: DO: add face pulls to Pull day / DO: next exercise / DO: log 80 kg for 8 / DO: skip today). Only one DO line, only when asked to act.",
    "",
    "The person:",me||"- (nothing logged yet)",
    "",
    "Textbook notes:",notes||"- (none match this question)",
    "",
    "The coach's own answers on this (use them; they are checked against the textbooks):",answersFor(q).join("\n")||"- (none)",
    "",
    "How the app works:",APP.map(function(x){return "- "+x;}).join("\n")].join("\n");
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

/* ---- the model's place, narrowed (docs/COACH-AGENT.md 2.10, C-9) ---------------------
   It may put the coach's own answer another way, for tone; it never states a figure of
   its own. The figures are taken out first and given as locked tokens (⟦1⟧, ⟦2⟧ …) it
   is told to keep; what comes back is refused if a token is missing, doubled, made up
   or out of order, if a digit or a number word appears that the answer did not have, and, last, if
   the numbers in and out differ at all (js/coach/guard.js guardNums). A refused rewrite
   is never shown: the coach's answer stands as it was. */
var DIG=/[0-9\u0660-\u0669\u06F0-\u06F9]/;
function western(s){return String(s).replace(/[\u0660-\u0669]/g,function(c){return String(c.charCodeAt(0)-0x660);})
  .replace(/[\u06F0-\u06F9]/g,function(c){return String(c.charCodeAt(0)-0x6F0);});}
var FIG=/[0-9\u0660-\u0669\u06F0-\u06F9]+(?:[.,][0-9\u0660-\u0669\u06F0-\u06F9]+)*/g;
function lockFigures(text){
  var figs=[],s=String(text||"").replace(FIG,function(x){figs.push(x);return "⟦"+figs.length+"⟧";});
  return {text:s,figs:figs};}
/* Number words, both languages: a rewrite may not bring one in, and a free answer may
   not state one the grounding does not hold. */
var WORDS={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,fifteen:15,twenty:20,
  thirty:30,forty:40,fifty:50,hundred:100,thousand:1000,half:0.5,quarter:0.25,twice:2,double:2,triple:3,dozen:12,
  "واحد":1,"واحده":1,"اتنين":2,"اثنين":2,"تلاته":3,"ثلاثه":3,"تلاتة":3,"ثلاثة":3,"اربعه":4,"أربعة":4,"اربعة":4,"خمسه":5,"خمسة":5,
  "سته":6,"ستة":6,"سبعه":7,"سبعة":7,"تمانيه":8,"ثمانية":8,"تمانية":8,"تسعه":9,"تسعة":9,"عشره":10,"عشرة":10,"نص":0.5,"نصف":0.5,"ربع":0.25,"ضعف":2};
function wordNums(s){
  return (String(s||"").toLowerCase().match(/[a-z]+|[\u0621-\u064A]+/g)||[]).map(function(w){
    if(Object.prototype.hasOwnProperty.call(WORDS,w))return WORDS[w];
    var a=w.replace(/^(و|ف|ب)/,"");return Object.prototype.hasOwnProperty.call(WORDS,a)&&a!==w?WORDS[a]:null;}).filter(function(x){return x!=null;});}
function numsOf(s){return (western(s).replace(/(\d),(\d{3})/g,"$1$2").match(/\d+(?:\.\d+)?/g)||[]).map(Number);}
function rewordMessages(text,lang){
  var lk=lockFigures(text);
  var sys=["You reword a fitness coach's answer for a person using a training app.",
    "Write it again "+(lang==="ar"?"in Egyptian Arabic, as a friend from Cairo would say it":"in plain, warm English")+", the same meaning, about as long or shorter.",
    "The figures are locked as tokens like ⟦1⟧. Copy every token exactly once, as it is. Write no other number, in digits or in words, and add no advice, figure or fact that is not in the answer.",
    "Write only the reworded answer."].join("\n");
  return {msgs:[{role:"system",content:sys},{role:"user",content:lk.text}],lock:lk};}
/* The model's rewrite → the text to show, or null (refused). orig: the answer as composed. */
function unlockReword(raw,lock,orig){
  var s=readReply(raw).text;if(!s||!lock)return null;
  /* In order, too: "⟦2⟧ g a day, ⟦1⟧ g per kg" keeps the numbers and swaps what they are. */
  var seen={},bad=false,last=0;
  var out=s.replace(/⟦\s*(\d+)\s*⟧/g,function(_,n){n=+n;if(!(n>=1&&n<=lock.figs.length)||seen[n]||n<last)bad=true;seen[n]=1;last=n;return lock.figs[n-1]||"";});
  if(bad||Object.keys(seen).length!==lock.figs.length)return null;
  if(DIG.test(s.replace(/⟦\s*\d+\s*⟧/g,"")))return null;
  var key=function(a){return a.slice().sort(function(x,y){return x-y;}).join(",");};
  if(key(numsOf(out))!==key(numsOf(orig)))return null;
  var had={};wordNums(orig).forEach(function(v){had[v]=1;});
  if(wordNums(out).some(function(v){return !had[v];}))return null;
  if(out.length>Math.max(80,String(orig).length*1.6))return null;
  return out;}
/* A free answer (a question no rule knows): every figure in it, digits or words, must be
   in what the model was given (the person's figures, the notes, how the app works).
   One that is not is the model's own, and the answer is not shown. */
function grounded(text,msgs){
  var have={};(msgs||[]).forEach(function(m){numsOf(m.content).concat(wordNums(m.content)).forEach(function(v){have[v]=1;});});
  return numsOf(text).concat(wordNums(text)).every(function(v){return have[v];});}

export {answersFor, buildMessages, grounded, lockFigures, numsOf, passagesFor, readReply, rewordMessages, unlockReword, wordNums};

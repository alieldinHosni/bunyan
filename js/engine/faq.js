/* Bunyan — the coach's answer bank, matched (owner, 28 Oct: "train my smart coach")
   js/data/faq.js holds answers written for the questions people actually ask: each
   grounded on the textbook passages it cites (or on the app itself), in English with
   its Arabic, and each with the ways it has been asked (its examples). This file finds
   the one a question is asking for.

   How: a question and every example are cut into the same terms as the knowledge
   search (js/engine/kbsearch.js: folded, stemmed, Egyptian Arabic and gym slang mapped
   onto English, plus this bank's own slang below). A term counts by how rare it is
   across the bank's examples, so "deload" decides and "should" does not. A question's
   score against an answer is its best overlap with any of that answer's examples
   (weighted Dice: shared weight over both sides' weight). Below THRESH, or not clear of
   a different answer, it is no match and the coach goes on as before.

   The examples are the bank's training data; tools/coachdata/questions.mjs is the test
   set it is measured on (tools/coach-eval.mjs), kept apart so a score there is a score
   on wordings it was not written against.

   Pure: text in, an entry out. */
import {FAQ} from "../data/faq.js";
import {weighted} from "./kbsearch.js";

/* Words the bank needs that the knowledge search does not map: gym slang, Egyptian
   Arabic and Franco-Arabic, folded (ة→ه, أ→ا, ى→ي), onto the bank's English terms. */
var SLANG={
  "ديلود":"deload","ديلوود":"deload","اوفر":"overtraining","اوفرترينينج":"overtraining","ترينينج":"training",
  "فشل":"failure","فيلير":"failure","سوبر":"superset","سوبرسيت":"superset","دروب":"drop","بيراميد":"pyramid","سيركت":"circuit",
  "كرش":"belly fat","الكرش":"belly fat","بطني":"belly abs","سكس":"abs six","سكسباك":"abs six pack",
  "تشيت":"cheat","تشيتنج":"cheat","تشيتميل":"cheat meal","ريفيد":"refeed","صيام":"fasting","صايم":"fasting","رمضان":"ramadan fasting",
  "متقطع":"intermittent","كيتو":"keto low carb","دايت":"diet","رجيم":"diet","تنشيف":"cut fat loss","تخسيس":"fat loss",
  "اتخن":"gain weight","تخن":"gain weight","رفيع":"skinny gain","نحيف":"skinny gain","اضخم":"bulk muscle gain","تضخيم":"bulk muscle gain",
  "ميتابوليزم":"metabolism","حرق":"burn metabolism","الحرق":"burn metabolism","زون":"zone","الزونز":"zones","زونز":"zones",
  "مبتدئ":"beginner","مبتدىء":"beginner","مبتدا":"beginner","جديد":"new beginner","اول":"first",
  "البيت":"home","بيت":"home","ادوات":"equipment","معدات":"equipment","جيم":"gym",
  "اتنفس":"breathe","تنفس":"breathing","نفسي":"breathing","سبوتر":"spotter spot","سبوت":"spot",
  "سرعه":"speed","اسرع":"faster speed","رشاقه":"agility","قفز":"jump plyometric","بلايو":"plyometric","بلايومتريك":"plyometric",
  "مدوره":"rounded","مقوس":"arched","انحناء":"posture","قوام":"posture","وقفه":"posture",
  "كحول":"alcohol","بيره":"beer alcohol","خمره":"alcohol",
  "الياف":"fibre","سكريات":"sugar","سكر":"sugar","كارب":"carbohydrate","كاربز":"carbohydrate","نشويات":"carbohydrate",
  "دهون":"fat","الدهون":"fat","اوميجا":"omega","كوليسترول":"cholesterol",
  "حديد":"iron","الحديد":"iron","كالسيوم":"calcium","فيتامينات":"vitamins",
  "نوم":"sleep","انام":"sleep","قيلوله":"nap sleep","توتر":"stress","ضغط":"stress","كورتيزول":"cortisol stress",
  "حافز":"motivation","كسلان":"lazy motivation","كسل":"lazy motivation","استمر":"consistent","التزم":"consistent",
  "نتيجه":"results","نتايج":"results","امتي":"when","هشوف":"see",
  "تقسيمه":"split","سبليت":"split","فول":"full","بادي":"body","ابر":"upper","لوار":"lower",
  "احماء":"warm","تسخين":"warm","اطاله":"stretch","استرتش":"stretch","مرونه":"flexibility",
  "كارديو":"cardio","هييت":"hiit","مشي":"walk","جري":"run",
  "عده":"rep","عدات":"reps","سيت":"set","سيتات":"sets","مجموعه":"set","مجموعات":"sets",
  "ليبل":"label","الليبل":"label","مكونات":"ingredients",
  "باك":"backup","اب":"up","نسخه":"backup","احتياطيه":"backup","اللغه":"language","لغه":"language","عربي":"arabic","انجليزي":"english",
  "باوند":"pounds lb","كيلو":"kg",
  /* Franco-Arabic, as typed */
  "fasting":"sawm","fasted":"sawm","iftar":"sawm","suhoor":"sawm","صيام":"sawm fasting","صايم":"sawm fasting","الريق":"sawm empty",
  "ppl":"push pull legs split","ulul":"upper lower split","sixpack":"abs six pack","flat":"flat",
  "a5es":"fat loss","akhas":"fat loss","adakham":"bulk muscle gain","tanshef":"cut fat loss","ramadan":"ramadan fasting",
  "deload":"deload","ezay":"how","emta":"when","3ady":"normal","3adi":"normal","wa7esh":"bad","kwayes":"good"};

/* Arabic words that carry no subject: asking words, pronouns, little words. */
var AR_STOP={};("يعني ايه ازاي انا انت هو هي احنا في من علي على عن ده دي دا و او ولا لو ممكن عايز عايزه عاوز اعمل بعمل "
  +"المفروض لازم ينفع هل كام قد ليه امتي فين اللي الي مع بس كمان برضه يا طب طيب كده كدا اي ايوه لا مش مفيش عندي معايا "
  +"بتاعي بتاعتي بتوعي حاجه حد اكتر اقل جدا خالص").split(" ").forEach(function(w){AR_STOP[w]=1;});
/* An Arabic word without its article and its long vowels (as intent.js skel): "تمارين",
   "التمرين" and "تمرين" are close enough to meet. */
function arKey(w){w=w.replace(/^(وال|بال|فال|لل|ال)(?=[؀-ۿ]{3})/,"");return "ع:"+w.charAt(0)+w.slice(1).replace(/[اوي]/g,"");}
/* A question's terms with their weights: the knowledge search's, the slang's, and its
   own Arabic words. */
function terms(q){
  var out={};
  weighted(q).forEach(function(x){out[x.w]=Math.max(out[x.w]||0,x.wt);});
  String(q||"").toLowerCase().replace(/[أإآ]/g,"ا").replace(/ة/g,"ه").replace(/ى/g,"ي").replace(/[ً-ْ]/g,"").replace(/[؟،؛]/g," ").split(/[^a-z0-9؀-ۿ']+/)
    .forEach(function(w){
      if(!w)return;
      var bare=w.replace(/^(وال|بال|فال|لل|ال|و|ب|ف)(?=[؀-ۿ]{3})/,"");
      var s=SLANG[w]||SLANG[bare];
      if(s)s.split(" ").forEach(function(x){var k=stem(x);out[k]=Math.max(out[k]||0,1);});
      if(/[؀-ۿ]/.test(w)&&!AR_STOP[w]&&!AR_STOP[bare]&&bare.length>=3){var k=arKey(w);out[k]=Math.max(out[k]||0,s?0.5:1);}});
  return out;}
/* The same light stemmer as the search (kbsearch.js), for the slang's English. */
function stem(w){
  if(w.length<=3)return w;
  if(/ies$/.test(w))return w.slice(0,-3)+"y";
  if(/(sses|shes|ches|xes)$/.test(w))return w.slice(0,-2);
  if(/ing$/.test(w)&&w.length>5)return w.slice(0,-3);
  if(/ed$/.test(w)&&w.length>4)return w.slice(0,-2);
  if(/s$/.test(w)&&!/(ss|us|is)$/.test(w))return w.slice(0,-1);
  return w;}

var INDEX=null;
function build(){
  if(INDEX)return INDEX;
  var ex=[],df={};
  FAQ.forEach(function(f){(f.ex||[]).forEach(function(q){
    var tt=terms(q);ex.push({f:f,t:tt});Object.keys(tt).forEach(function(w){df[w]=(df[w]||0)+1;});});});
  var n=ex.length,idf=function(w){return Math.log(1+(n+1)/((df[w]||0)+0.5));};
  ex.forEach(function(e){e.w=0;Object.keys(e.t).forEach(function(w){e.w+=e.t[w]*idf(w);});});
  INDEX={ex:ex,idf:idf,byId:FAQ.reduce(function(o,f){o[f.id]=f;return o;},{})};
  return INDEX;}

/* How close a question is to each answer: [{f, score}], best first, one per answer. */
var THRESH=0.42,CLEAR=0.04,NEEDLESS=0.55;
function rank(q){
  var I=build(),qt=terms(q),qw=0,best={};
  Object.keys(qt).forEach(function(w){qw+=qt[w]*I.idf(w);});
  if(!qw)return [];
  I.ex.forEach(function(e){
    var sh=0;Object.keys(qt).forEach(function(w){if(e.t[w])sh+=Math.min(qt[w],e.t[w])*I.idf(w);});
    if(!sh)return;
    var s=2*sh/(qw+e.w);
    if(!best[e.f.id]||s>best[e.f.id].score)best[e.f.id]={f:e.f,score:s};});
  return Object.keys(best).map(function(k){return best[k];}).sort(function(a,b){return b.score-a.score;});}
/* The answer a question asks for, or null. An answer with a need (a word it cannot be
   about without) is not given to a question without it. */
function faqMatch(q){
  /* An answer whose defining word is missing from the question is not ruled out, but it
     has to be a much closer match to win (NEEDLESS). */
  var r=rank(q).map(function(x){
    var ok=!x.f.need||x.f.need.test(String(q).toLowerCase())||x.f.need.test(fold(q));
    return ok?x:{f:x.f,score:x.score*NEEDLESS};}).sort(function(a,b){return b.score-a.score;});
  var top=r[0];if(!top||top.score<THRESH)return null;
  var second=r[1];
  if(second&&top.score-second.score<CLEAR&&second.f.group!==top.f.group)return null;
  return {f:top.f,score:top.score,second:second?{id:second.f.id,score:second.score}:null};}
function fold(s){return String(s||"").toLowerCase().replace(/[أإآ]/g,"ا").replace(/ة/g,"ه").replace(/ى/g,"ي");}
function faqById(id){return build().byId[id]||null;}

export {faqById, faqMatch, rank as faqRank, terms as faqTerms, THRESH as FAQ_THRESH};

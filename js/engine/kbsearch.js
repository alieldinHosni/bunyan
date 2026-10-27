/* Bunyan — searching the whole knowledge base, on the phone
   The coach's answers to anything about training, nutrition, recovery, movement or
   habits come from js/knowledge/. This file reads every knowledge file once, cuts it
   into passages (one per topic: PROTEIN's daily targets, the cardio zones, sleep in
   adherence…), and ranks them against a question with BM25, the standard text-search
   score: rare words that the question and a passage share count most, and a long
   passage does not win by length alone.

   No model and no network: words are matched, stemmed and mapped through a small
   synonym table (English and Egyptian Arabic onto the knowledge files' own English
   words), so "how many hours should I sleep", "نوم كام ساعة" and "rest and recovery
   at night" reach the same passage. What it cannot match it does not answer: a search
   that finds nothing good says so, and the caller says so to the person.

   Left out on purpose: scope.js (the hard limits, checked before anything else),
   conditions.js and injuries.js (medical populations and injury regions: the coach
   does not assess or treat), supplements.js (supplement advice is out of scope),
   residual.js (trainer-business material) and cues.js (coaching cues, shown on each
   exercise's own sheet). */
import * as ACUTE from "../knowledge/acute-variables.js";
import * as ADH from "../knowledge/adherence.js";
import * as ANAT from "../knowledge/anatomy.js";
import * as ASSESS from "../knowledge/assessments.js";
import * as BAL from "../knowledge/balance.js";
import * as CARDIO from "../knowledge/cardio.js";
import * as CORE from "../knowledge/core.js";
import * as CORR from "../knowledge/corrective.js";
import * as EPI from "../knowledge/epidemiology.js";
import * as GLOSS from "../knowledge/glossary.js";
import * as IMB from "../knowledge/imbalances.js";
import * as MOD from "../knowledge/modalities.js";
import * as NUT from "../knowledge/nutrition-principles.js";
import * as PHASES from "../knowledge/phases.js";
import * as PLYO from "../knowledge/plyometrics.js";
import * as SAQ from "../knowledge/saq.js";

var FILES=[["acute-variables",ACUTE,"train"],["adherence",ADH,"habits"],["anatomy",ANAT,"body"],["assessments",ASSESS,"train"],
  ["balance",BAL,"train"],["cardio",CARDIO,"cardio"],["core",CORE,"train"],["corrective",CORR,"mobility"],["epidemiology",EPI,"health"],
  ["glossary",GLOSS,"terms"],["imbalances",IMB,"mobility"],["modalities",MOD,"train"],["nutrition-principles",NUT,"food"],
  ["phases",PHASES,"train"],["plyometrics",PLYO,"train"],["saq",SAQ,"train"]];

/* ---- words ---------------------------------------------------------------------- */
var STOP={};("a an the and or of to in on at for with by from is are was were be been being it its this that these those "
  +"i me my you your we our he she they them their his her what which who whom how why when where do does did can could "
  +"should would will shall may might must have has had not no yes as if so than then there here about into over under "
  +"up down out off just only also very more most less much many some any all each per vs via e g eg etc one two "
  +"get got make made like want know tell give please ok okay yeah but hi").split(" ").forEach(function(w){STOP[w]=1;});
/* A light stemmer: plurals and the common endings, so "stretches", "stretching" and
   "stretch" are one word. Not linguistics: the same cut is made on both sides. */
function stem(w){
  if(w.length<=3)return w;
  if(/ies$/.test(w))return w.slice(0,-3)+"y";
  if(/(sses|shes|ches|xes)$/.test(w))return w.slice(0,-2);
  if(/ing$/.test(w)&&w.length>5)return w.slice(0,-3);
  if(/ed$/.test(w)&&w.length>4)return w.slice(0,-2);
  if(/s$/.test(w)&&!/(ss|us|is)$/.test(w))return w.slice(0,-1);
  return w;}
/* What people say, and the words the knowledge files use for it. Arabic is folded the
   way the chat folds it (ة→ه, أ→ا, ى→ي). */
var SYN={
  sleep:"sleep restorative recovery",slept:"sleep",nap:"sleep",insomnia:"sleep insomnia",tired:"fatigue sleep recovery",
  hydrate:"hydration water fluid",hydration:"hydration water fluid",water:"hydration water fluid",drink:"hydration fluid daily",thirsty:"hydration",
  protein:"protein amino",carb:"carbohydrate",carbs:"carbohydrate",carbohydrates:"carbohydrate",sugar:"carbohydrate sugar glycemic",
  fat:"fat lipid",fats:"lipid fat",calorie:"calorie energy kcal",calories:"calorie energy kcal",kcal:"calorie energy",
  vitamin:"micronutrient vitamin",vitamins:"micronutrient vitamin",mineral:"micronutrient mineral",fiber:"fibre fiber",fibre:"fibre fiber",
  cut:"weight loss deficit fat",cutting:"weight loss deficit",lose:"weight loss",losing:"weight loss",bulk:"muscle gain hypertrophy surplus",
  bulking:"hypertrophy surplus",muscle:"muscle hypertrophy",grow:"hypertrophy",growth:"hypertrophy",size:"hypertrophy",
  strong:"strength",stronger:"strength",strength:"strength",power:"power",explosive:"power plyometric",jump:"plyometric jump",
  cardio:"cardiorespiratory cardio aerobic",running:"cardio run",run:"cardio run",walk:"walk cardio",walking:"walk cardio",
  hiit:"interval cardio intensity",zone:"zone heart rate",heart:"heart rate",bpm:"heart rate",
  stretch:"flexibility stretch",stretching:"flexibility stretch",flexible:"flexibility",mobility:"flexibility mobility",
  posture:"posture alignment",balance:"balance",core:"core stability",abs:"core",plank:"core",
  rest:"rest interval recovery",recover:"recovery",recovery:"recovery",sore:"doms soreness",soreness:"doms",doms:"doms soreness delayed",
  rep:"repetition rep",reps:"repetition rep",set:"set",sets:"set",tempo:"tempo",warm:"warm",warmup:"warm",cool:"cool",
  motivation:"motivation adherence",motivated:"motivation",habit:"habit adherence",habits:"habit adherence",consistent:"adherence",
  consistency:"adherence",lazy:"motivation barrier",busy:"time barrier",stress:"stress",stressed:"stress",
  goal:"goal",goals:"goal",plateau:"plateau",stuck:"plateau",overtraining:"overtraining",deload:"recovery",
  often:"frequency week",frequently:"frequency",days:"frequency week",week:"week frequency",weekly:"week frequency",
  need:"daily recommend requirement",daily:"daily",important:"benefit role",benefit:"benefit",
  injury:"injury risk",safe:"safety",safety:"safety",beginner:"beginner",hours:"hour",hour:"hour",
  train:"resistance training",training:"resistance training",workout:"resistance training",gym:"resistance training",lift:"resistance training",
  lifting:"resistance training",weights:"resistance training",
  metabolism:"metabolism energy",bmr:"metabolic rate",tdee:"energy expenditure",breakfast:"meal timing",timing:"timing",
  // Egyptian Arabic, folded
  "نوم":"sleep","انام":"sleep","بنام":"sleep","منمتش":"sleep","ساعات":"hours","ساعه":"hours","مايه":"hydration water","ميه":"hydration water",
  "مياه":"hydration water","اشرب":"hydration","بروتين":"protein","كارب":"carbohydrate","كاربز":"carbohydrate","نشويات":"carbohydrate",
  "سكر":"sugar carbohydrate","دهون":"fat lipid","سعرات":"calorie energy","فيتامين":"vitamin micronutrient","فيتامينات":"vitamin micronutrient",
  "الياف":"fibre","تنشيف":"weight loss","تخسيس":"weight loss","اخس":"weight loss","تضخيم":"hypertrophy surplus","عضل":"muscle hypertrophy",
  "عضلات":"muscle hypertrophy","قوه":"strength","كارديو":"cardio cardiorespiratory","جري":"run cardio","مشي":"walk cardio","قلب":"heart",
  "اطاله":"stretch flexibility","مرونه":"flexibility","توازن":"balance","بطن":"core","راحه":"rest recovery","استشفاء":"recovery",
  "تكرار":"repetition","عدات":"repetition","مجموعات":"set","تسخين":"warm","احماء":"warm","حافز":"motivation","تحفيز":"motivation",
  "التزام":"adherence","وقت":"time","ضغط":"stress","هدف":"goal","ثبات":"plateau","واقف":"plateau","فطار":"meal timing breakfast",
  "قفز":"plyometric jump","سرعه":"speed agility","رشاقه":"agility"};
function fold(s){
  return String(s||"").toLowerCase().replace(/[ً-ْٰـ]/g,"").replace(/[أإآٱ]/g,"ا").replace(/ى/g,"ي").replace(/ؤ/g,"و")
    .replace(/ئ/g,"ي").replace(/ة/g,"ه").replace(/[’']/g,"").replace(/[؟،؛]/g," ").replace(/[^\w\s؀-ۿ]/g," ").replace(/\s+/g," ").trim();}
var SPELL={fiber:"fibre",fibers:"fibre",color:"colour",liters:"litres",liter:"litre",calories:"calorie"};
function words(s){
  return fold(s).split(" ").map(function(w){return SPELL[w]||w;}).map(function(w){return w.replace(/^(وال|بال|فال|لل|ال)(?=[؀-ۿ]{3})/,"");})
    .filter(function(w){return w&&!STOP[w]&&(w.length>1||/\d/.test(w));});}
/* Phrases that mean one thing together, read before the words are split. */
var PHRASE=[[/\b(best time|what time|when (should|do|to|can)|before or after|pre workout|post workout)\b|امتي|قبل التمرين|بعد التمرين/,"timing"],
  [/\b(no time|not enough time|dont have time)\b|مفيش وقت|معنديش وقت/,"time barrier"],
  [/\bhow long\b|قد ايه/,"duration"],
  [/\b(eat|intake|grams of|gram of|how much|dietary) fats?\b|\bfat intake\b|دهون اكل|اكل دهون/,"lipid needs"],
  [/\b(eat|intake|grams of|how much|dietary) (fibre|fiber)\b/,"fibre target"]];
/* The question's words, with what they stand for added: [{w, wt, own}]. The person's
   own words count fully; what a synonym adds counts half, so "stretch before lifting"
   is about stretching before it is about training. */
function weighted(q){
  var out=[],at={},fq=fold(q);
  function add(w,wt,own){if(at[w]!=null){var o=out[at[w]];if(wt>o.wt){o.wt=wt;o.own=own;}return;}at[w]=out.length;out.push({w:w,wt:wt,own:own});}
  PHRASE.forEach(function(r){if(r[0].test(fq))r[1].split(" ").forEach(function(x){add(stem(x),0.8,false);});});
  words(q).forEach(function(w){
    var syn=SYN[w]||SYN[stem(w)];
    if(!/[؀-ۿ]/.test(w))add(stem(w),1,true);
    /* Arabic words stand for their English: those count as the person's own. */
    if(syn)syn.split(" ").forEach(function(x,i){add(stem(x),/[؀-ۿ]/.test(w)&&i===0?1:0.5,/[؀-ۿ]/.test(w)&&i===0);});});
  return out;}
function queryTerms(q){return weighted(q).map(function(x){return x.w;});}
function ownTerms(q){return weighted(q).filter(function(x){return x.own;}).map(function(x){return x.w;});}

/* ---- passages ------------------------------------------------------------------- */
function human(k){return String(k).replace(/([a-z])([A-Z])/g,"$1 $2").replace(/_/g," ").replace(/\bpct\b/i,"%").toLowerCase();}
function range(o){
  if(o==null)return "";
  if(typeof o!=="object")return String(o);
  if(o.min!=null&&o.max!=null)return o.min===o.max?String(o.min):o.min+"–"+o.max;
  if(o.value!=null)return String(o.value);
  if(o.min!=null)return o.min+"+";
  if(o.max!=null)return "up to "+o.max;
  return "";}
/* Keys that are the sentence itself, not a label for it. */
var PLAIN=/^(rule|is|note|notes|finding|role|why|fact|text|use|effect|what|how|definition|desc|description|summary|takeHome|guideline|advice|tip|meaning|purpose|goal|example|agentReading)$/;
var NAMEKEY=/^(name|who|goal|adaptation|phase|id|term|title|status|group|level|stage|zone|type|kind|muscle|region|food|intensity|mode|population|activity|sex|age|for)$/;
var SKIPKEY=/^(src|source|sources|sections|v|confidence|derivedFrom|appNote|vsBunyan|check|gap|missing|sourceListsNuts|overlapNote|nonEssentialCountNote|bySex|crossRef|seeAlso|see)$/;
/* The facts of one passage: readable lines, each with what it is about. */
function factsOf(node,label,out,depth){
  if(node==null||depth>6)return out;
  if(typeof node==="string"){out.push((label?label+": ":"")+node);return out;}
  if(typeof node==="number"||typeof node==="boolean"){if(label)out.push(label+": "+node);return out;}
  if(Array.isArray(node)){
    if(node.every(function(x){return typeof x==="string"||typeof x==="number";})){out.push((label?label+": ":"")+node.join(", "));return out;}
    node.forEach(function(x){factsOf(x,label,out,depth+1);});return out;}
  var r=range(node);
  if(r&&Object.keys(node).every(function(k){return /^(min|max|value|note|unit)$/.test(k);})){
    out.push((label?label+": ":"")+r+(node.unit?" "+node.unit:"")+(node.note?" ("+node.note+")":""));return out;}
  /* An item that names itself (a population, a goal, a phase) labels its own facts. */
  var nm="";
  Object.keys(node).forEach(function(k){if(!nm&&NAMEKEY.test(k)&&typeof node[k]==="string")nm=node[k].replace(/_/g," ");});
  var lab=nm?(label?label+" · ":"")+nm:label;
  Object.keys(node).forEach(function(k){
    if(SKIPKEY.test(k)||(NAMEKEY.test(k)&&typeof node[k]==="string"&&node[k].replace(/_/g," ")===nm))return;
    var v=node[k],kl=PLAIN.test(k)?lab:(lab?lab+" · ":"")+human(k);
    var rr=typeof v==="object"&&v&&!Array.isArray(v)?range(v):"";
    if(rr&&Object.keys(v).every(function(x){return /^(min|max|value|note|unit)$/.test(x);}))
      out.push(kl+": "+rr+(v.unit?" "+v.unit:"")+(v.note?" ("+v.note+")":""));
    else factsOf(v,kl,out,depth+1);});
  return out;}
/* "… · min hours: 7" and "… · max hours: 9" are one fact: "… · hours: 7–9". */
function pairs(facts){
  var out=[],used={};
  facts.forEach(function(f,i){
    if(used[i])return;
    var m=f.match(/^(.*?)(?:\bmin ([^:]+)|([^:]*?) min): (\d+(?:\.\d+)?)$/);
    if(m){var head=m[1],what=(m[2]||m[3]||"").trim();
      for(var j=i+1;j<Math.min(facts.length,i+4);j++){
        var k=facts[j].match(/^(.*?)(?:\bmax ([^:]+)|([^:]*?) max): (\d+(?:\.\d+)?)$/);
        if(k&&k[1]===head&&(k[2]||k[3]||"").trim()===what){used[j]=1;out.push(head+what+": "+m[4]+"–"+k[4]);return;}}}
    out.push(f);});
  return out;}
/* Words that name a file's structure, not its subject ("take home", "notes"): they do
   not make a passage about what a question says. */
var TITLEFILL=/^(take|home|note|notes|rule|rules|summary|key|point|points|general|overview|basic|basics|evidence|finding|findings|other|misc|\d+)$/;
var INDEX=null;
function build(){
  if(INDEX)return INDEX;
  var docs=[];
  FILES.forEach(function(F){
    var mod=F[1];
    Object.keys(mod).forEach(function(top){
      if(top==="meta")return;
      var val=mod[top],parts=[];
      if(Array.isArray(val))val.forEach(function(x,i){parts.push([top,(x&&(x.name||x.id||x.term||x.goal||x.adaptation))||String(i),x]);});
      else if(val&&typeof val==="object")Object.keys(val).forEach(function(k){if(!SKIPKEY.test(k))parts.push([top,k,val[k]]);});
      else parts.push([top,"",val]);
      parts.forEach(function(p){
        var facts=factsOf(p[2],"",[],0).filter(function(f){return f.length>3&&!/\.js\b|\b[A-Z_]{4,}\.[a-z]/.test(f);});
        if(!facts.length)return;
        var title=human(p[0])+(p[1]?" · "+human(String(p[1]).replace(/_/g," ")):"");
        var tokens=[];
        words(title+" "+title).concat(words(facts.join(" "))).forEach(function(w){tokens.push(stem(w));});
        facts=pairs(facts);
        var seen={};facts=facts.filter(function(f){var k=f.toLowerCase();if(seen[k])return false;seen[k]=1;return true;});
        docs.push({file:F[0],area:F[2],top:p[0],key:p[1],title:title,titleW:words(title).map(stem).filter(function(w){return !TITLEFILL.test(w);}),facts:facts,tokens:tokens,len:tokens.length});});});});
  var df={},avg=0;
  docs.forEach(function(d){avg+=d.len;var seen={};d.tokens.forEach(function(w){if(!seen[w]){seen[w]=1;df[w]=(df[w]||0)+1;}});
    d.tf={};d.tokens.forEach(function(w){d.tf[w]=(d.tf[w]||0)+1;});});
  INDEX={docs:docs,df:df,n:docs.length,avg:avg/Math.max(1,docs.length)};
  return INDEX;}

/* ---- search --------------------------------------------------------------------- */
/* The passages that best answer q: [{doc, score, hits}], best first. hits is how many
   different words of the question it holds. */
function search(q,limit){
  var I=build(),terms=weighted(q),k1=1.4,b=0.75,fq=fold(q);
  if(!terms.length)return [];
  var res=[],trainQ=TRAINQ.test(fq)&&!CARDIOQ.test(fq);
  I.docs.forEach(function(d){
    var s=0,hits=0;
    terms.forEach(function(t){var w=t.w,f=d.tf[w];if(!f)return;hits++;
      var idf=Math.log(1+(I.n-I.df[w]+0.5)/(I.df[w]+0.5));
      s+=t.wt*idf*f*(k1+1)/(f+k1*(1-b+b*d.len/I.avg));});
    /* A passage whose own name holds the question's words is about it, not just
       mentioning it. */
    terms.forEach(function(t){if(d.titleW.indexOf(t.w)>=0)s+=t.wt*2.2*Math.log(1+(I.n-I.df[t.w]+0.5)/(I.df[t.w]+0.5));});
    if(s<=0)return;
    var wt=WEIGHT[d.file]||1;
    if(wt<1&&SPECIAL[d.file]&&SPECIAL[d.file].test(fq))wt=1;
    if(trainQ&&d.area==="cardio")wt*=0.75;
    res.push({doc:d,score:s*wt,hits:hits});});
  res.sort(function(a,b2){return b2.score-a.score;});
  /* "How many hours", "how much water": of the passages that are about it, the one
     that holds a figure for it comes first. */
  if(wantsNumber(q)){
    var own=ownTerms(q);
    res.slice(0,8).forEach(function(r){
      var best=0;
      var titled=terms.some(function(t){return r.doc.titleW.indexOf(t.w)>=0;});
      r.doc.facts.forEach(function(f){if(!/\d/.test(f))return;var fw=words(f).map(stem);
        if(!titled&&!own.some(function(w){return fw.indexOf(w)>=0;}))return;
        best=Math.max(best,/(^| · )(target|recommend\w*|coach|guideline\w*)\b/.test(f)||/\b(min|max)\b/.test(f)?0.6:0.35);});
      r.score+=r.score*best;});
    res.sort(function(a,b2){return b2.score-a.score;});}
  return res.slice(0,limit||5);}
/* Files that are mostly about something else than everyday advice count for less,
   unless the question is about testing. */
var WEIGHT={anatomy:0.8,assessments:0.7,glossary:0.85,epidemiology:0.85,plyometrics:0.75,saq:0.75,balance:0.8,core:0.85};
var SPECIAL={anatomy:/muscle|bone|nerve|hormone|joint|heart|lung|brain|cortisol|testosterone|عضل|هرمون|مفصل/,assessments:/\b(test|assess|assessment|measure|questionnaire)\b|اختبار|تقييم/,plyometrics:/plyo|jump|bound|قفز|بلايو/,
  saq:/speed|agility|quick|ladder|سرعه|رشاقه/,balance:/balanc|stabil|توازن/,core:/\bcore\b|abs|plank|بطن|كور/,glossary:/\b(mean|meaning|define|definition|what is|what s)\b|يعني ايه|معني/};
var TRAINQ=/\b(train|training|workout|lift|lifting|gym|sets?|reps?|weights?)\b|تمرين|اتمرن|جيم/;
var CARDIOQ=/cardio|run|running|walk|jog|cycl|swim|hiit|aerobic|كارديو|جري|مشي/;
/* The lines of a passage that answer q best: those holding most of its words, and, for
   "how many / how much / how long", a figure. */
var QUANT=/\b(how (many|much|long|often)|kam|كام|كم|قد ايه)\b|كام|قد ايه/;
function bestFacts(doc,q,n){
  var terms=queryTerms(q),want=QUANT.test(fold(q));
  return doc.facts.map(function(f,i){
    var tw=words(f).map(stem),h=0;terms.forEach(function(w){if(tw.indexOf(w)>=0)h++;});
    return {f:f,h:h+(want&&/\d/.test(f)?1.5:0)+(ADVICE.test(f)?0.6:0)-i*0.001};})
    .sort(function(a,b2){return b2.h-a.h;}).slice(0,n||3).map(function(x){return x.f;});}
var ADVICE=/^(coach|advice|guideline|recommendation|take home|rule)\b|(^| · )(coach|advice|guideline|recommendation|rule): /;
/* A fact as a sentence for the person: a sentence of its own stands without its
   label; a figure keeps what it measures ("Adults 18-64, hours: 7–9"). */
function prose(f){
  var c=f.lastIndexOf(": "),lab=c>0?f.slice(0,c):"",val=c>0?f.slice(c+2):f;
  if(!lab||val.split(" ").length>=5&&!/^\d/.test(val))return cap(val.replace(/_/g," "));
  var segs=lab.split(" · ").filter(function(x){return !/^(target|typical|overall|by status|values?|daily|general)$/.test(x);});
  return cap((segs.length?segs.join(", ")+": ":"")+val.replace(/_/g," "));}
function cap(s){s=String(s||"").trim();return s.charAt(0).toUpperCase()+s.slice(1);}
/* The answer search gives, when it gives one: the passage, and the lines to say.
   Weak matches are not answers: two of the question's words, or one that names the
   passage itself, and a score clear of noise. */
function lookup(q,prevQ){
  var r=search(q,3),top=r[0];
  if(!top)return null;
  var own=ownTerms(q),titled=own.some(function(w){return top.doc.titleW.indexOf(w)>=0;});
  /* The person's own words, not only what the synonyms add: "restructure my workout
     plan to be home based" shares only synonyms with a protein passage. */
  var ownHits=own.filter(function(w){return top.doc.tf[w];}).length;
  if(top.score<9||(ownHits<2&&!titled))return null;
  var lines=bestFacts(top.doc,q,4),more=[];
  /* A second passage on the same thing, from another file, adds what the first lacks. */
  r.slice(1).forEach(function(x){if(x.doc.file!==top.doc.file&&x.score>top.score*0.7&&more.length<2)
    more=more.concat(bestFacts(x.doc,q,1));});
  var num=wantsNumber(q)?lines.filter(hasNumber):lines;
  return {doc:top.doc,area:top.doc.area,titled:titled,lines:lines.map(prose),also:more.map(prose),
    figure:num.length?prose(num[0]):"",needsFigure:wantsNumber(q)};}
/* Whether a passage line carries a figure, for questions that ask for one. */
function wantsNumber(q){return QUANT.test(fold(q));}
function hasNumber(s){return /\d/.test(s);}

export {bestFacts, build, hasNumber, lookup, ownTerms, prose, queryTerms, search, wantsNumber};

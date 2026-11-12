/* Bunyan — reading the sentence (docs/COACH-AGENT.md 2.3, package C-3)
   The second stage of the coach's pipeline, after safety (js/coach/safety.js) and before
   any answer is chosen. It reads what a message is and what it is about, instead of
   scoring keywords: the kind of message, the action or topic, the things it names, and
   how sure the reading is.

   understand(text, ctx) → {
     text, norm, lang,                    as said; folded and normalised; "en" | "ar"
     kind:  "request" | "own-data" | "knowledge" | "statement" | "correction" | "out-of-scope" | null
     act:   "do" | "ask" | "tell" | "correct" | "chat" | null      (the document's names)
     topic: what is asked or asked for (TOPICS below), or null when no rule here knows it
     mode:  the topic's variant ("best", "last", "trend", "down"…), or ""
     entities: {exercise:[{name, said, from}], numbers:[{n, unit}], minutes, day, period,
                meal, muscle:[…], equipment:[…], weekdays:[…]}
     neg, scope, confidence (0–1), alts:[{topic, mode, label}], followup, correction }

   Pure: no state, no screen. What the person's own program and the library hold comes
   in ctx, so an exercise is read against their own first ("سكوات" is the squat they do,
   not the Hack Squat the library lists first):
     ctx.mine     names in the program and the log, most relevant first
     ctx.lib(q)   the library's best name for an English phrase, or ""
     ctx.prev     the reading of the previous message, if it is recent (follow-ups and
                  corrections continue it)
     ctx.active   whether a workout is open; ctx.current the exercise on screen
   A reading with no topic means "no rule here knows it": the caller keeps its own
   router for those, so nothing that worked before is lost. */
import {fold, spell} from "./intent.js";

var AR=/[؀-ۿ]/;
/* ---- normalising -------------------------------------------------------------------
   Arabic-Indic digits, Franco-Arabic (Arabic in Latin letters and digits), the dual
   ("بيضتين" is two eggs), and number words, all to one spelling. */
var FRANCO={
  "a7san":"احسن","ahsan":"احسن","a7sn":"احسن","a2sa":"اقصي","aqsa":"اقصي","e3mel":"اعمل","a3mel":"اعمل","a3ml":"اعمل","e3ml":"اعمل",
  "3amalt":"عملت","3malt":"عملت","3amalto":"عملته","3malto":"عملته","e3melt":"عملت","embare7":"امبارح","imbare7":"امبارح","mbare7":"امبارح",
  "enaharda":"النهارده","elnaharda":"النهارده","nharda":"النهارده","ennaharda":"النهارده","el naharda":"النهارده","naharda":"النهارده",
  "bokra":"بكره","bukra":"بكره","ezay":"ازاي","izay":"ازاي","ezzay":"ازاي","leh":"ليه","leih":"ليه","eh":"ايه","eih":"ايه","eeh":"ايه",
  "kam":"كام","akalt":"اكلت","kalt":"اكلت","wazny":"وزني","wazni":"وزني","mesh":"مش","msh":"مش","mish":"مش","la2":"لا","laa":"لا",
  "2asdy":"قصدي","asdy":"قصدي","2asdi":"قصدي","asdi":"قصدي","badel":"بدل","baddel":"بدل","sheel":"شيل","shil":"شيل","dayef":"ضيف","deef":"ضيف","dif":"ضيف",
  "sagel":"سجل","sagal":"سجل","sgl":"سجل","3o2la":"عقله","3a2la":"عقله","o2la":"عقله","esbo3":"اسبوع","elesbo3":"الاسبوع","el esbo3":"الاسبوع",
  "shahr":"شهر","elshahr":"الشهر","ma3aya":"معايا","m3aya":"معايا","bas":"بس","de2i2a":"دقيقه","d2i2a":"دقيقه","d2ay2":"دقايق","de2ay2":"دقايق",
  "3ayez":"عايز","3ayza":"عايزه","3awez":"عاوز","mabahebsh":"مبحبش","mabhebsh":"مبحبش","bahebsh":"مبحبش","ghalat":"غلط","8alat":"غلط","8lt":"غلط",
  "enta":"انت","inta":"انت","ghaltan":"غلطان","8altan":"غلطان","mosafer":"مسافر","msafer":"مسافر","mafeesh":"مفيش","mafish":"مفيش","mfish":"مفيش",
  "ta3ban":"تعبان","t3ban":"تعبان","nemt":"نمت","sa3at":"ساعات","sa3a":"ساعه","atmaren":"اتمرن","etmarant":"اتمرنت","tamreen":"تمرين","tamrin":"تمرين",
  "akl":"اكل","akel":"اكل","fetar":"فطار","ghada":"غدا","8ada":"غدا","3asha":"عشا","sadr":"صدر","dahr":"ضهر","rigl":"رجل","regl":"رجل","ketf":"كتف",
  "sabt":"السبت","itnein":"الاتنين","etnen":"الاتنين","talat":"التلات","arba3":"الاربع","khamees":"الخميس","5amees":"الخميس","gom3a":"الجمعه","7ad":"الحد",
  "ana":"انا","w":"و","we":"و","el":"ال","fel":"في ال","fi":"في","fe":"في","3ala":"على","3la":"على","beta3i":"بتاعي","bta3y":"بتاعي","beta3y":"بتاعي",
  "nezel":"نزل","nizil":"نزل","etghayar":"اتغير","et6awar":"اتطور","etTawar":"اتطور","kan":"كان","3amel":"عامل","ma3mltsh":"معملتش"};
var FRANCO_HINT=/[a-z][2357][a-z]|(^| )[2357](?!x\d|k\b|km\b|kg|lb|min|m\b|h\b|hr|s\b|sec|g\b|th\b|rd\b|nd\b|st\b)[a-z]|(^| )(3ayez|3awez|ezay|izay|enaharda|elnaharda|nharda|embare7|bokra|a7san|e3mel|a3mel|mesh|msh|la2|2asdy|asdy|badel|sheel|sagel|ma3aya|mafeesh|leh|eh|kam|wazny|bta3y|beta3i)( |$)/;
var DIGIT=/[٠-٩]/g;
function digits(s){return String(s).replace(DIGIT,function(d){return "٠١٢٣٤٥٦٧٨٩".indexOf(d);}).replace(/[۰-۹]/g,function(d){return "۰۱۲۳۴۵۶۷۸۹".indexOf(d);});}
var NUMW=[[/(^| )(one|a single|واحد|واحده)(?= |$)/g,1],[/(^| )(two|couple of|اتنين|تنين|اثنين)(?= |$)/g,2],[/(^| )(three|تلاته|تلات|ثلاثه)(?= |$)/g,3],
  [/(^| )(four|اربعه|اربع)(?= |$)/g,4],[/(^| )(five|خمسه|خمس)(?= |$)/g,5],[/(^| )(six|سته|ست)(?= |$)/g,6],[/(^| )(seven|سبعه|سبع)(?= |$)/g,7],
  [/(^| )(eight|تمانيه|تمن)(?= |$)/g,8],[/(^| )(nine|تسعه|تسع)(?= |$)/g,9],[/(^| )(ten|عشره|عشر)(?= |$)/g,10],[/(^| )(twenty|عشرين)(?= |$)/g,20],
  [/(^| )(thirty|تلاتين)(?= |$)/g,30],[/(^| )(forty|اربعين)(?= |$)/g,40],[/(^| )(sixty|ستين)(?= |$)/g,60]];
/* The Arabic dual: one word for two of a thing. */
var DUAL=[[/(^| )(بيضتين)(?= |$)/g,"$12 بيض"],[/(^| )(تمرينين)(?= |$)/g,"$12 تمرين"],[/(^| )(يومين)(?= |$)/g,"$12 يوم"],
  [/(^| )(مجموعتين)(?= |$)/g,"$12 مجموعه"],[/(^| )(ساعتين)(?= |$)/g,"$12 ساعه"],[/(^| )(دقيقتين)(?= |$)/g,"$12 دقيقه"],
  [/(^| )(اسبوعين)(?= |$)/g,"$12 اسبوع"],[/(^| )(رغيفين)(?= |$)/g,"$12 رغيف"],[/(^| )(كوبايتين)(?= |$)/g,"$12 كوبايه"],[/(^| )(نص ساعه)(?= |$)/g,"$130 دقيقه"],[/(^| )(ربع ساعه)(?= |$)/g,"$115 دقيقه"],[/(^| )(تلت ساعه)(?= |$)/g,"$120 دقيقه"],[/(^| )(ساعه الا ربع)(?= |$)/g,"$145 دقيقه"],[/(^| )(ساعه ونص)(?= |$)/g,"$190 دقيقه"],
  [/(^| )(a quarter of an hour|quarter of an hour|quarter hour)(?= |$)/g,"$115 minutes"],[/(^| )(an hour and a half|hour and a half)(?= |$)/g,"$190 minutes"],
  [/(^| )(half an hour|half hour)(?= |$)/g,"$130 minutes"],[/(^| )(an hour|one hour)(?= |$)/g,"$160 minutes"],[/(^| )(?<!\d )(ساعه)(?= |$)/g,"$160 دقيقه"]];
/* Words typed wrong often enough to be worth reading right. */
var TYPO=[[/(^| )(waht|wat|whta)(?= |$)/g,"$1what"],[/(^| )(teh)(?= |$)/g,"$1the"],[/(^| )(yesturday|yesterady|yday|yest)(?= |$)/g,"$1yesterday"],
  [/(^| )(todya|tday|2day)(?= |$)/g,"$1today"],[/(^| )(benhc|bnech|bech)(?= |$)/g,"$1bench"],[/(^| )(sqaut|squt|sqat|suqat)(?= |$)/g,"$1squat"],
  [/(^| )(deadlfit|dedlift|deadlit)(?= |$)/g,"$1deadlift"],[/(^| )(protien|protin)(?= |$)/g,"$1protein"],[/(^| )(wieght|weigth|wight)(?= |$)/g,"$1weight"],
  [/(^| )(minuts|minits|mins)(?= |$)/g,"$1minutes"],[/(^| )(workuot|wrkout)(?= |$)/g,"$1workout"],[/(^| )(dumbells|dumbbels|dumbels|dumbell)(?= |$)/g,"$1dumbbells"],
  [/(^| )(isnt|isn t)(?= |$)/g,"$1is not"],[/(^| )(dont|don t)(?= |$)/g,"$1do not"],[/(^| )(didnt|didn t)(?= |$)/g,"$1did not"],[/(^| )(cant|can t)(?= |$)/g,"$1cannot"],
  [/(^| )(im|i m)(?= |$)/g,"$1i am"],[/(^| )(ive|i ve)(?= |$)/g,"$1i have"],[/(^| )(whats|what s)(?= |$)/g,"$1what is"],[/(^| )(youre|you re)(?= |$)/g,"$1you are"],
  [/(^| )(thats|that s)(?= |$)/g,"$1that is"],
  /* Arabic: the Egyptian spellings of one word. */
  [/(^| )(انهارده|النهاردة|اليوم ده|انهرده|النهرده)(?= |$)/g,"$1النهارده"],[/(^| )(امبارح|امبارحه|مبارح|امس|البارح)(?= |$)/g,"$1امبارح"],
  [/(^| )(بكرا|بكرة)(?= |$)/g,"$1بكره"],[/(^| )(ازاى|ازي|ازيي)(?= |$)/g,"$1ازاي"],[/(^| )(ايه|إيه|اية|ايش)(?= |$)/g,"$1ايه"],
  [/(^| )(عاوز|عايزه|عاوزه|عايزة)(?= |$)/g,"$1عايز"],[/(^| )(دلوقت|دلوقتى|دلوقتي)(?= |$)/g,"$1دلوقتي"],[/(^| )(اللى|اللي)(?= |$)/g,"$1اللي"]];
/* Training words in Egyptian Arabic, in English: a question the written answers and the
   knowledge rules know in English is looked up in English too, so Arabic is not behind
   (docs/COACH-AGENT.md 2.3). Applied only to a question no rule here has read. */
var GLOSS=[[/زياده تدريجيه( في (ال)?حمل)?|التحميل التدريجي|الحمل التدريجي/g,"progressive overload"],[/ون ريب ماكس|اقصي وزن لعده واحده|الماكس لعده/g,"one rep max"],
  [/^يعني ايه|^ايه هو|^ايه هي|^ايه معني/g,"what is"],[/(اعمل|اعمل ال|اقسم) جلستين|تمرينين في اليوم|مرتين في اليوم/g,"how to create two sessions"],
  [/كام عده|كام عدات|عدد العدات/g,"how many reps"],[/اضخم العضل|تضخيم العضل|ابني عضل|اكبر العضل|اضخم/g,"to build muscle"],
  [/(ارفع|اشيل|انزل) بسرعه قد ايه|سرعه الرفع|التيمبو|تيمبو/g,"what tempo should i lift at"],[/اخس بسرعه قد ايه|اخس قد ايه في الاسبوع|اخس بسرعه/g,"how fast can i lose weight"],
  [/من غير ضرر|بامان|من غير ما اتاذي/g,"safely"],[/الفرق بين/g,"difference between"],[/الحديد الحر|الاوزان الحره/g,"free weights"],[/الاجهزه|المكن/g,"machines"],
  [/العضل بيتحول (ل)?دهون|العضلات بتتحول (ل)?دهون/g,"does muscle turn into fat"],[/لو بطلت (تمرين|اتمرن)|لو وقفت تمرين/g,"if i stop training"],
  [/يومين ورا بعض|يومين متتاليين/g,"two days in a row"],[/ينفع امرن|ينفع اتمرن/g,"can i train"],[/كارديو/g,"cardio"],[/(^| )قبل( |$)/g," before "],[/(^| )بعد( |$)/g," after "],
  [/(^| )(ال)?حديد( |$)/g," weights "],[/(^| )(ال)?صدر( |$)/g," chest "],[/كام ساعه نوم|انام كام ساعه/g,"how many hours of sleep"],[/(^| )ازاي( |$)/g," how "],[/(^| )ليه( |$)/g," why "]];
/* Only a question with a training term in it: "what is", "how", "why" alone are not
   enough to read it by. */
var GLUE=/^(what is|how|why|before|after)$/;
function gloss(f){
  var s=String(f||""),hit=0;GLOSS.forEach(function(g){var b=s;s=s.replace(g[0],function(m){return " "+g[1]+" ";});if(s!==b&&!GLUE.test(g[1].trim()))hit++;});
  s=s.replace(/[\u0600-\u06FF]+/g," ").replace(/\s+/g," ").trim();
  return hit&&s.split(" ").length>=2?s+"?":"";}
function normalize(text){
  var raw=digits(String(text||""));
  var f=fold(raw);
  var franco=!AR.test(raw)&&FRANCO_HINT.test(f);
  if(franco){
    f=f.replace(/(^| )el ([a-z])/g,"$1el$2");
    f=f.split(" ").map(function(w){return FRANCO[w]!=null?FRANCO[w]:w;}).join(" ");
    f=f.replace(/(^| )ال (\S)/g,"$1ال$2").replace(/(^| )و (\S)/g,"$1و$2");}
  TYPO.forEach(function(r){f=f.replace(r[0],r[1]);});
  DUAL.forEach(function(r){f=f.replace(r[0],r[1]);});
  f=spell(f);
  return {f:f.replace(/\s+/g," ").trim(),franco:franco};}
function numerals(f){var s=" "+f+" ";NUMW.forEach(function(r){s=s.replace(r[0],"$1"+r[1]);});return s.trim();}

/* ---- the things a message names ----------------------------------------------------
   Exercises by the names people say, in both languages, to the English phrase the
   library is searched with. Longest first: "hack squat" before "squat". */
var EXW=[
  ["hack squat",["hack squat","هاك سكوات"]],["front squat",["front squat","فرونت سكوات","سكوات امامي"]],["goblet squat",["goblet squat","جوبلت سكوات"]],
  ["bulgarian split squat",["bulgarian split squat","bulgarian","بلغاري","سكوات بلغاري"]],
  ["incline bench press",["incline bench press","incline bench","incline press","انكلاين بنش","انكلاين","بنش عالي"]],
  ["decline bench press",["decline bench","ديكلاين"]],
  ["dumbbell bench press",["dumbbell bench press","dumbbell bench","dumbbell press","db press","db bench","دمبل بريس","بنش دمبل","بنش بالدمبل"]],
  ["romanian deadlift",["romanian deadlift","rdl","رومانيان ديدلفت","رومانيان","ار دي ال"]],
  ["sumo deadlift",["sumo deadlift","سومو"]],
  ["lat pulldown",["lat pulldown","lat pull down","pulldown","pull down","سحب عالي","لات بول داون","لات"]],
  ["seated cable row",["seated row","cable row","سحب ارضي","سحب ارضى"]],
  ["barbell row",["barbell row","bent over row","تجديف بالبار"]],
  ["leg press",["leg press","ليج بريس","ليج برس","دفع رجل"]],["leg extension",["leg extension","ليج اكستنشن","رفرفه امامي"]],
  ["leg curl",["leg curl","hamstring curl","ليج كيرل","رفرفه خلفي"]],
  ["shoulder press",["shoulder press","overhead press","military press","ohp","شولدر بريس","ضغط كتف","بريس كتف"]],
  ["lateral raise",["lateral raise","side raise","رفرفه جانبي","لاترال"]],
  ["hip thrust",["hip thrust","هيب ثرست"]],["calf raise",["calf raise","calves raise","سمانه"]],
  ["tricep pushdown",["tricep pushdown","triceps pushdown","pushdown","تراي بوش داون","بوش داون"]],
  ["bicep curl",["bicep curl","biceps curl","curl","curls","بايسبس كيرل","كيرل"]],
  ["bench press",["bench press","bench","بنش بريس","بنش"]],["squat",["squat","squats","back squat","سكوات"]],
  ["deadlift",["deadlift","deadlifts","ديدلفت"]],["pull up",["pull up","pull ups","pullup","pullups","pull-up","pull-ups","chin up","chin ups","عقله"]],
  ["push up",["push up","push ups","pushup","pushups","push-ups","press up","بوش اب","ضغط"]],["dip",["dips","dip","ديبس","متوازي"]],
  ["lunge",["lunge","lunges","walking lunges","لانجز","لانج"]],["burpee",["burpee","burpees","بيربي","بيربيز"]],["plank",["plank","planks","بلانك"]],
  ["row",["row","rows","تجديف"]]];
/* An Arabic word with the article, "and", "with" or "for" written onto it. */
var ARPRE="(?:و|ف|ب|ل|ال|وال|بال|فال|لل|وب|بـ)?";
var EXRE=null;
function exRes(){
  if(EXRE)return EXRE;
  EXRE=[];
  EXW.forEach(function(x){x[1].forEach(function(w){
    var ar=AR.test(w),esc=w.replace(/[-]/g,"[- ]?").replace(/ /g," ?");
    EXRE.push({k:x[0],w:w,len:w.length,re:new RegExp("(^| )"+(ar?ARPRE:"")+"("+esc+")"+(ar?"(?:ات|ين|ه)?":"(?:e?s)?")+"(?= |$)")});});});
  EXRE.sort(function(a,b){return b.len-a.len;});
  return EXRE;}
/* The phrases named, each once, in the order said; a longer one hides the shorter
   inside it ("hack squat" is not also "squat"). */
function exPhrases(f){
  var s=" "+f+" ",out=[];
  exRes().forEach(function(r){
    var m=r.re.exec(s);if(!m)return;
    var at=m.index+m[1].length;
    out.push({k:r.k,said:m[0].trim(),at:at});
    s=s.slice(0,at)+new Array(m[0].length-m[1].length+1).join("#")+s.slice(at+m[0].length-m[1].length);});
  return out.sort(function(a,b){return a.at-b.at;});}
/* Against the person's own first: every word of the phrase in one of their names (a
   name run together counts: "pull up" is "Pullups"). Then the library. */
function sq(s){return String(s||"").toLowerCase().replace(/[^a-z]+/g,"");}
function wordsOf(s){return String(s||"").toLowerCase().replace(/[^a-z ]+/g," ").split(" ").filter(Boolean).map(function(w){return w.replace(/(es|s)$/,"");});}
/* order: "program" for a change to the program (the squat in it is the one to swap),
   "log" for a question about what was done (the squat they log). */
function resolveEx(k,ctx,order){
  ctx=ctx||{};
  var pools=ctx.program||ctx.log?(order==="program"?[ctx.program,ctx.log]:[ctx.log,ctx.program]):[ctx.mine];
  var src=function(i){return i===0&&order==="program"||i===1&&order!=="program"?"program":"log";};
  /* A change to the program takes the program's own, a variant included ("squat" is the
     Hack Squat in it). A question takes the plain lift first, from the log, the program
     or the library, and a variant only when there is nothing plainer. */
  if(order==="program"){var r0=fromPool(k,pools[0]||[],true);if(r0)return {name:r0,from:"program"};}
  for(var i=0;i<pools.length;i++){var r=fromPool(k,pools[i]||[],false);if(r)return {name:r,from:src(i)};}
  var lib=typeof ctx.lib==="function"?ctx.lib(k):"";
  if(lib)return {name:lib,from:"library"};
  for(var j=0;j<pools.length;j++){var rv=fromPool(k,pools[j]||[],true);if(rv)return {name:rv,from:src(j)};}
  return {name:"",from:""};}
function fromPool(k,mine,variants){
  var kw=wordsOf(k);
  var own=mine.filter(function(n){var nw=wordsOf(n),ns=sq(n);
    return kw.every(function(w){return nw.indexOf(w)>=0;})||ns.indexOf(sq(k).replace(/s$/,""))>=0;});
  /* A plain name ("squat") is the plain lift, not a variant whose name holds a word
     the person did not say ("hack", "front"): those only when nothing else is theirs. */
  var VAR=/\b(hack|front|goblet|split|bulgarian|sumo|romanian|incline|decline|close|reverse|jump|pistol|sissy|box|zercher|overhead|smith|machine|dumbbell|single|one)\b/i;
  var plain=own.filter(function(n){return !VAR.test(n)||VAR.test(k);});
  return plain[0]||(variants?own[0]:"")||"";}

var MUSCLES=[["Chest",/(^| )(chest|pecs?|صدر|الصدر|بالصدر|للصدر|صدري)(?= |$)/],["Back",/(^| )(back|lats|ضهر|الضهر|ظهر|الظهر|ضهري)(?= |$)/],
  ["Legs",/(^| )(legs?|leg day|lower body|رجل|الرجل|رجلي|رجليا|ارجل)(?= |$)/],["Shoulders",/(^| )(shoulders?|delts?|كتف|الكتف|اكتاف|كتافي)(?= |$)/],
  ["Arms",/(^| )(arms?|دراع|الدراع|دراعات|ايدي)(?= |$)/],["Biceps",/(^| )(biceps?|باي|البايسبس|بايسبس)(?= |$)/],["Triceps",/(^| )(triceps?|تراي|الترايسبس|ترايسبس)(?= |$)/],
  ["Abs",/(^| )(abs|core|stomach|بطن|البطن|سكس باك)(?= |$)/],["Glutes",/(^| )(glutes?|butt|موخره|الجلوتس|جلوتس)(?= |$)/],
  ["Hamstrings",/(^| )(hamstrings?|hams|خلفيه|الخلفيه)(?= |$)/],["Quads",/(^| )(quads?|امامي|الامامي|فخذ)(?= |$)/],["Calves",/(^| )(calves|calf|سمانه|السمانه)(?= |$)/]];
var EQUIP=[["Dumbbell",/(^| )(dumbbells?|dbs?|دمبل|دمبلز|الدمبل|دامبل|بالدمبل|ودمبلز|ودمبل)(?= |$)/],["Bodyweight",/(no equipment|without equipment|bodyweight|body weight|nothing at home|من غير ادوات|بدون ادوات|وزن الجسم|بوزن الجسم)/],
  ["Band",/(^| )(bands?|resistance band|استك|استيك)(?= |$)/],["Kettlebell",/(^| )(kettlebells?|كيتل|كيتل بل)(?= |$)/],
  ["Home",/(at home|from home|في البيت|من البيت)/],["Hotel",/(hotel gym|hotel|جيم فندق|جيم الفندق|فندق)/],["NoGym",/(no gym|without a gym|dont have a gym|do not have a gym|مفيش جيم|من غير جيم|مش هروح الجيم)/]];
var MEAL=[["breakfast",/(^| )(breakfast|فطار|الفطار|فطور|فطاري)(?= |$)/],["lunch",/(^| )(lunch|غدا|الغدا|غدايا)(?= |$)/],["dinner",/(^| )(dinner|supper|عشا|العشا|عشايا)(?= |$)/],["snack",/(^| )(snacks?|سناك|تصبيره)(?= |$)/]];
/* Weekdays, 1 Monday … 7 Sunday, as commands.js numbers them. */
var WEEKDAY=[[1,/^(monday|mon|الاتنين|الاثنين|اتنين|للاتنين|والاتنين)$/],[2,/^(tuesday|tue|tues|التلات|الثلاثاء|للتلات|والتلات)$/],[3,/^(wednesday|wed|الاربع|الاربعاء|للاربع|والاربع|والاربعاء)$/],
  [4,/^(thursday|thu|thurs|الخميس|للخميس|والخميس)$/],[5,/^(friday|fri|الجمعه|للجمعه|والجمعه)$/],[6,/^(saturday|sat|السبت|للسبت|والسبت)$/],[7,/^(sunday|sun|الحد|الاحد|للحد|والحد)$/]];
function weekdaysIn(f){var out=[];f.split(" ").forEach(function(w){w=w.replace(/s$/,"");for(var i=0;i<WEEKDAY.length;i++)if(WEEKDAY[i][1].test(w)||WEEKDAY[i][1].test(w+"s")){out.push(WEEKDAY[i][0]);break;}});return out;}
/* When: a day, or a span. */
function timeOf(f){
  var s=" "+f+" ",day=null,period="";
  if(/ (today|tonight|this morning|this evening|right now|now|النهارده|دلوقتي|الليله|بالليل) /.test(s))day={when:"today"};
  if(/ (yesterday|last night|امبارح|امبارح بالليل) /.test(s))day={when:"yesterday"};
  if(/ (tomorrow|بكره|لبكره) /.test(s)&&!/ (مبحبش|بكره ال)/.test(s))day={when:"tomorrow"};
  if(/ (day before yesterday|اول امبارح) /.test(s))day={when:"daybefore"};
  var ago=(" "+numerals(s)+" ").match(/ (\d+) (days?|يوم|ايام) ago | من (\d+) (ايام|يوم) /);if(ago)day={when:"ago",n:+(ago[1]||ago[3])};
  var wd=weekdaysIn(f);
  if(wd.length&&!/ (only|بس) /.test(s)||wd.length===1)day={when:"weekday",n:wd[wd.length-1],last:/ (last|اللي فات|الي فات|الماضي) /.test(s)};
  if(/ (this week|the week|this weeks|الاسبوع ده|الاسبوع دا|الاسبوع|هذا الاسبوع) /.test(s))period="week";
  if(/ (last week|past week|الاسبوع اللي فات|الاسبوع الماضي|الاسبوع الي فات) /.test(s))period="lastweek";
  if(/ (next week|الاسبوع الجاي|الاسبوع اللي جاي) /.test(s))period="nextweek";
  if(/ (this weekend|the weekend|weekend|الويك اند|الويكند|اخر الاسبوع|آخر الاسبوع) /.test(s))period="weekend";
  if(/ (this month|the month|الشهر ده|الشهر) /.test(s))period="month";
  if(/ (last month|الشهر اللي فات|الشهر الماضي) /.test(s))period="lastmonth";
  if(/ (last time|last session|اخر مره|آخر مره|المره اللي فاتت|اخر تمرين) /.test(s))period="last";
  return {day:day,period:period};}
/* Numbers with what they count. */
var UNITS=[["kg",/^(kg|kgs|kilo|kilos|kilograms?|كيلو|ك)$/],["lb",/^(lb|lbs|pounds?|رطل|باوند)$/],["reps",/^(reps?|times|عده|عدات|مرات|مره)$/],
  ["sets",/^(sets?|مجموعه|مجموعات|سيت|سيتات)$/],["min",/^(minutes?|min|m|دقيقه|دقايق|د)$/],["h",/^(hours?|hrs?|h|ساعه|ساعات)$/],
  ["g",/^(g|grams?|gm|جرام|جم)$/],["days",/^(days?|ايام|يوم)$/],["kcal",/^(kcal|calories|cal|سعر|سعرات)$/],["kg",/^(kilos?)$/]];
function numbersIn(f){
  var out=[],tk=numerals(digits(f)).split(" ");
  tk.forEach(function(w,i){
    var m=/^(\d+(?:[.,]\d+)?)([a-z؀-ۿ]*)$/.exec(w);if(!m)return;
    var u=m[2]||tk[i+1]||"",unit="";
    for(var j=0;j<UNITS.length;j++)if(UNITS[j][1].test(u)){unit=UNITS[j][0];break;}
    out.push({n:+m[1].replace(",","."),unit:unit});});
  return out;}
function minutesOf(nums){
  var m=nums.filter(function(x){return x.unit==="min";})[0],h=nums.filter(function(x){return x.unit==="h";})[0];
  return m?m.n:h?Math.round(h.n*60):0;}

/* Not, never, don't: in English and in the Egyptian forms (مش, مبحبش "I don't like",
   متدينيش "don't give me", بلاش "skip it"). */
var NEG=/(^| )(not|no|never|do not|does not|did not|dont|hate|cannot|without|no more|no longer|stop giving|مش|مبحبش|مبحبهاش|مابحبش|متدينيش|متديليش|ماتدينيش|بلاش|ابدا|مفيش|معنديش|ماعنديش|مكنتش|ماكنتش|مفطرتش|منمتش)(?= |$)|(^| )م\S{2,}ش(?= |$)/;
/* How long: now, lately, always. */
function scopeOf(f){
  var s=" "+f+" ";
  if(/ (all the time|always|every day|constantly|for weeks|for months|علي طول|دايما|كل يوم|طول الوقت|بقالي فتره|بقالي اسابيع|من فتره) /.test(s))return "always";
  if(/ (lately|recently|these days|this week|الفتره دي|اليومين دول|الايام دي|موخرا) /.test(s))return "lately";
  if(/ (today|now|right now|النهارده|دلوقتي) /.test(s))return "now";
  return "";}

/* ---- what kind of message, and what about ------------------------------------------ */
var Q=/(^| )(what|whats|how|why|when|which|who|where|ايه|ازاي|ليه|امتي|فين|مين|كام|هل|ينفع|قد ايه|انهي)( |$)|^(is|are|do|does|did|can|could|should|will|would|have|has|اقدر|ممكن)( |$)/;
var ASKED=/[?؟]/;
var BEST=/(^| )(best|max|maximum|pr|prs|1rm|one rep max|record|heaviest|strongest|top|احسن|اقصي|اقصى|ماكس|الماكس|اعلي|اعلى|اتقل|اكبر وزن|رقم|بيست)(?= |$)/;
var LASTW=/(how much did i|what did i (lift|do|get)|شلت كام|رفعت كام|عملت كام|شلت|رفعت)/;
var TREND=/(how (was|is|has|did)|progress|progressed|progressing|going|moving|improved|went up|went down|dropped|gone down|got worse|got better|stalled|عامل ازاي|كان عامل|اتطور|اتطورت|بيتطور|ماشي ازاي|نزل|نزلت|طلع|طلعت|وقف|اتحسن)/;
var DOWN=/(went down|dropped|gone down|got worse|weaker|decreased|(^| )(نزل|نزلت|قل|قلت|ضعف|ضعفت|بقي اضعف)( |$))/;
var HOWDO=/(how (do|should|can|would) i (do|perform|make|execute)|how to (do|perform)|how is .* done|proper form|correct form|good form|form (for|on|tips)|technique (for|on)|teach me|show me how|ازاي اعمل|ازاي العب|ازاي بيتعمل|ازاي اعمله|طريقه|طريقة|شرح|الفورم|فورم)/;
var WHY=/(^| )(why|explain why|how come|ليه|ليش|ايه السبب|اشمعني)(?= |$)/;
var WHYCHANGE=/(go up|went up|goes up|go down|went down|gone up|jumped|طلع|طلعت|نزل|نزلت|increas|raise|raised|higher|heavier|lower|lowered|reduc|decreas|chang|lighter|زودت|زودتلي|زود|رفعت|رفعتلي|نزلت|نزلتلي|قللت|قللتلي|غيرت|غيرتلي|خففت)/;
var EATQ=/(what did i eat|what have i eaten|what i ate|what i have eaten|what did i have|اكلت ايه|كلت ايه|اكلت كام|كلت كام|اكلي|اكلت اي)/;
var DIDQ=/(what did i (do|train|lift)|what i (did|trained)|what workout did i|which workout did i|عملت ايه|اتمرنت ايه|لعبت ايه|تمرنت ايه)/;
var SETSQ=/(how many sets|sets of|كام مجموعه|كام سيت|عدد المجموعات|مجموعات ل|مجموعه صدر|مجموعه ضهر|مجموعه رجل)/;
var WORKQ=/(how many workouts|how many sessions|how many times did i train|how often did i train|كام تمرين|كام مره اتمرنت|اتمرنت كام مره)/;
var WEEKQ=/(how (was|is|did) (my|the|this) week|my week|weekly summary|الاسبوع كان عامل ازاي|الاسبوع عامل ازاي|اسبوعي|الاسبوع كان ازاي)/;
var WEIGHQ=/(how much do i weigh|what do i weigh|my weight|my body weight|weight trend|my weigh|وزني|الوزن بتاعي|وزني كام|وزني عامل ازاي)/;
var TODAYQ=/^(what (should|do|shall) i (do|train)( today)?|what is (on )?(today|for today)|whats today|what am i (doing|training) today|اعمل ايه النهارده|اتمرن ايه النهارده|تمرين النهارده ايه|النهارده ايه)( |$)/;
var ZONESQ=/(heart rate zones|hr zones|my zones|cardio zones|مناطق نبض|مناطق النبض|زونز|زون القلب)/;
var STEPSQ=/(how many steps|steps should|steps a day|كام خطوه|خطوات في اليوم)/;
var PROTQ=/(protein|بروتين)/;

var SWAPV=/^(please |can you |could you |i want to |i would like to |عايز |ممكن |لو سمحت )?(swap|replace|switch|substitute|change|بدل|استبدل|غير)( |$)/;
var ADDV=/^(please |can you |could you |i want to |عايز |ممكن |لو سمحت )?(add|put|include|throw in|ضيف|ضيفلي|تضيف|اضيف|حط|حطلي)( |$)|(^| )(تضيف|ضيفلي)( |$)/;
var REMV=/^(please |can you |could you |i want to |عايز |ممكن |لو سمحت )?(remove|delete|drop|take out|get rid of|شيل|امسح|احذف|شيلي)( |$)/;
var AVOIDW=/((do not|dont|never|no longer) (like|enjoy|want|do|wanna)|i hate|hate doing|cannot stand|can not stand|sick of|tired of doing|never give me|no more|stop giving me|i am not doing|i will not do|مش بحب|مبحبش|بكره ال|مش عايز|متدينيش|متديليش|بلاش|مش هعمل|مش طايق)/;
var FITW=/(only (have|got)?|just (have|got)?|i have|ive got|i have got|got|short on time|in a hurry|quick|معايا|عندي|بس|ظبطلي|ظبط|fit|adjust)/;
var DAYSW=/((make|change|set|switch|turn|rebuild|redo) (my |the )?(program|plan|split|routine|training|week)|(program|plan|split) (to|into|for) \d|\d (days?|ايام) (a|per|in a|في) (week|الاسبوع)|(can|could) only train|only train on|train only on|خلي (برنامجي|البرنامج|التمرين)|غير (برنامجي|البرنامج)|(اقدر|هقدر) اتمرن|بتمرن (\S+ )?بس)/;
var AWAYW=/(travel|travelling|traveling|trip|away|vacation|holiday|business trip|مسافر|سفر|مسافره|اجازه|رحله|برا البلد)/;
var MOVEW=/(^| )(move|reschedule|push|postpone|shift|انقل|اجل|ودي|حرك|انقلي|اجلي)( |$)/;
var LOGW=/^(please |can you |)?(log|record|add|سجل|سجلي|ضيف)( |$)/;
var GOALW=/(change|switch|set|make|غير|حول|خلي) (my |the )?(goal|هدف|هدفي|الهدف)/;
var GOALS=[["lose",/(lose|cut|cutting|fat loss|lose fat|burn fat|lean|shred|حرق الدهون|حرق دهون|تنشيف|خساره|اخس|انشف|انزل وزن)/],
  ["gain",/(gain|bulk|build muscle|muscle gain|mass|size|تضخيم|اضخم|عضل)/],["strength",/(strength|stronger|قوه|اقوي)/],["recomp",/(recomp|both|الاتنين)/]];
/* Outside what the coach does at all: said so, with what it can do. */
var OUT=[["weather",/(^| )(weather|forecast|temperature outside|raining|rain today|الجو|الطقس|درجه الحراره)( |$)/],["who",/^(who are you|what are you|are you (a )?(human|real|bot|robot|ai)|انت مين|انت ايه|مين انت|انت بني ادم)( |$)/],
  ["remind",/(remind me|set a reminder|reminder|alarm|notify me|notification|فكرني|ذكرني|منبه|تذكير)/],["joke",/(^| )(tell me a joke|a joke|نكته|قولي نكته)( |$)/],
  ["news",/(news|football score|match score|stock|bitcoin|الاخبار|ماتش|الكوره النهارده)/]];
/* Medicine, supplements and mood, in the Arabic forms the scope rule did not read. */
var REFER=[["supplement",/(فيتامين|حبايه|حبايات|مكمل|مكملات|بري وركاوت|بريوركاوت|pre workout|preworkout|كرياتين|creatine|حارق دهون|fat burner)/],
  ["medical",/(سترويد|ستيرويد|سترويدز|هرمونات|هرمون نمو|steroid|steroids|انابوليك|حقن تضخيم)/],
  ["mental",/(مكتيب|مكتئب|اكتياب|اكتئاب|depressed|depression|anxiety|قلقان علي طول)/]];

/* Corrections: the previous turn misread, said in so many words. */
var CORRBARE=/^(no+|nope|wrong|wrong answer|thats wrong|that is wrong|you are wrong|youre wrong|not that|not that one|not this one|not what i asked|that is not what i asked|thats not what i asked|thats not what i meant|that is not what i meant|not what i meant|incorrect|lol no|no thats wrong|no that is wrong|انت غلطان|غلطان|غلط|اجابه غلط|اجابتك غلط|رد غلط|مش ده|مش دي|مش ده اللي سالته|مش ده اللي اقصده|مش ده قصدي|مش كده|لا مش كده|لا غلط|لا مش ده|مش هو ده|مش ده اللي انا عايزه)( please| خالص| يا كوتش|)$/;
var CORRWITH=/^(no+|nope|sorry|oops|لا|لأ|لاء)?[ ,]*(i meant|i mean|meant|i was asking about|i asked about|not that[, ]+i meant|قصدي|اقصد|انا قصدي|كنت اقصد|كنت بسال عن|بسال عن)( |$)/;
/* A follow-up: "and squats?", "what about legs", "make it 60", "والسكوات؟". */
/* "و" written onto the next word only before the article ("والسكوات", "وللصدر"):
   "وزني" is "my weight", not "and …". */
var MOREW=/^(and|also|plus|what about|how about|and for|and on|and what about|طب و|طيب و|وكمان|طب|طيب|و)( |(?=ال|لل))/;
var MAKEIT=/^(make it|change it to|make that|set it to|خليها|خليه|خليهم|خليها بقي|خليه بقي)( |$)/;

function has(re,f){return re.test(" "+f+" ")||re.test(f);}
function exOfReading(R){return R&&R.entities&&R.entities.exercise&&R.entities.exercise[0]||null;}

/* The topic, by the sentence's form and what it names. Each rule gives a topic, its
   kind, a mode and a score; the best is the reading, the next ones its alternatives. */
function readings(f,E,ctx,neg,asked){
  var out=[],add=function(topic,kind,mode,score,extra){out.push(Object.assign({topic:topic,kind:kind,mode:mode||"",score:score},extra||{}));};
  var ex=E.exercise.length,q=asked||Q.test(f),T=E.day,P=E.period;
  /* ---- out of scope, and the limits ---- */
  OUT.forEach(function(o){if(o[1].test(f))add("unknown","out-of-scope",o[0],9);});
  REFER.forEach(function(o){if(o[1].test(f))add("scope","out-of-scope",o[0],9);});
  /* ---- requests ---- */
  if(SWAPV.test(f)&&ex)add("exswap","request","",ex>=2?9:7);
  if(ADDV.test(f)&&ex&&!E.food)add("exadd","request","",8);
  if(REMV.test(f)&&ex)add("exremove","request","",8);
  if(ex&&AVOIDW.test(" "+f+" ")&&!q)add("avoid","request","",8);
  var mins=E.minutes,kit=E.equipment.filter(function(x){return x!=="NoGym";});
  var away=AWAYW.test(f)||E.equipment.indexOf("NoGym")>=0&&/^(week|nextweek|weekend)$/.test(P);
  if(away&&!q)add("away","request","",8);
  if(!away&&(!q||/(what can i do|what should i do|what do i do|اعمل ايه|ينفع اعمل ايه)/.test(f))&&(mins&&mins<=120||kit.length)&&(FITW.test(" "+f+" ")||/^(\d+ (minutes|دقيقه|دقايق)|\S+ only)/.test(f))&&!/(ran|run|walked|jog|swim|cycled|جريت|مشيت)/.test(f)&&!E.food)
    add("fit","request",mins&&kit.length?"both":mins?"time":"kit",8);
  if(!away&&E.equipment.indexOf("NoGym")>=0&&!mins)add("away","request","",6);
  var nDays=E.numbers.filter(function(x){return x.unit==="days";})[0];
  if(DAYSW.test(f)&&(nDays&&nDays.n>=1&&nDays.n<=7||E.weekdays.length>=2))add("days","request","",8,{n:nDays?nDays.n:E.weekdays.length});
  if(MOVEW.test(" "+f+" ")&&(T||E.weekdays.length)&&!q)add("move","request","",8);
  var kgN=E.numbers.filter(function(x){return x.unit==="kg"||x.unit==="lb";})[0],repN=E.numbers.filter(function(x){return x.unit==="reps";})[0];
  if(LOGW.test(f)&&(kgN&&(repN||/ (for|x|×|في) \d/.test(" "+f+" "))||/^(log|سجل|record) (a |one |)(set|مجموعه|سيت)$/.test(f)))add("logset","request","",9);
  if(GOALW.test(f)){var g=GOALS.filter(function(x){return x[1].test(f.replace(/(goal|هدف|هدفي|الهدف)/,""));})[0];add("goal","request",g?g[0]:"",8);}
  /* ---- the person's own data ---- */
  if(ex&&!HOWDO.test(f)&&!SWAPV.test(f)&&!ADDV.test(f)&&!REMV.test(f)&&!AVOIDW.test(" "+f+" ")){
    /* "Why isn't my bench going up?": a stuck lift, the plateau answer's. */
    if(WHY.test(" "+f+" ")&&/(not|isnt|stuck|stalled|same|واقف|مش بيزيد|مبيزيدش|مش بيطلع)/.test(f))add("plateau","own-data","",9);
    else if(BEST.test(" "+f+" "))add("record","own-data","best",9);
    else if(P==="last"||LASTW.test(f)&&q)add("record","own-data","last",8);
    else if(TREND.test(f)&&(P||q||DOWN.test(f)))add("record","own-data",DOWN.test(f)?"down":"trend",8);}
  if(EATQ.test(f)&&!PROTQ.test(f)){
    if(T&&T.when!=="today")add("foodday","own-data","",9);else add("eat","own-data","",7);}
  if(PROTQ.test(f)&&/(have i had|did i (eat|have|get)|so far|today|اكلت|كلت|النهارده|لحد دلوقتي)/.test(f)&&q)add("eat","own-data","protein",8);
  if(DIDQ.test(f)&&T&&T.when!=="today"&&T.when!=="tomorrow")add("day","own-data","",9);
  if(SETSQ.test(f)&&E.muscle.length&&/(did i|have i|i did|i have done|i logged|عملت|لعبت|اتمرنت|سجلت)/.test(f))add("volume","own-data","",8);
  if(WORKQ.test(f))add("week","own-data","count",8);
  if(WEEKQ.test(f))add("week","own-data","",8);
  if(WEIGHQ.test(f)&&!WHY.test(" "+f+" ")&&(q||/(trend|عامل)/.test(f))&&!E.numbers.some(function(x){return x.unit==="kg"||x.unit==="lb";})&&!/(lift|lose|lost|اخس|اشيل|ارفع)/.test(f))add("weight","own-data","",8);
  if(TODAYQ.test(f)&&!/(food|eat|اكل|الاكل)/.test(f)&&!(T&&T.when!=="today"))add("today","own-data","",8);
  if(ZONESQ.test(f))add("zones","own-data","",8);
  if(TODAYQ.test(f.replace(/ tomorrow$| بكره$/,""))&&T&&T.when==="tomorrow")add("tomorrow","own-data","",8);
  /* ---- statements about oneself ---- */
  /* Tired all the time is not a low day (the review's #10): how long is read. */
  if(/(^| )(tired|exhausted|drained|no energy|fatigued|تعبان|تعبانه|مرهق|مرهقه|مفيش طاقه|هلكان)( |$)/.test(f)&&scopeOf(f)==="always")add("tired","statement","always",9);
  /* "Lose 5 kg in a month": a rate, asked or said. */
  var kgW=E.numbers.filter(function(x){return x.unit==="kg"||x.unit==="lb";})[0];
  if(kgW&&/(lose|drop|cut|اخس|انزل|اخسس|اشيل)/.test(f)&&/(week|month|weeks|months|اسبوع|شهر|اسابيع|شهور)/.test(f))add("rate","knowledge","",9);
  if(/(^| )(missed|skipped|fell off|فوت|فوتت|فاتني|فاتوني|مروحتش|ماروحتش)( |$)/.test(f)&&(P==="week"||P==="lastweek"||E.numbers.some(function(x){return x.n>=2;}))&&!q)add("missed","statement","week",8);
  var hrs=E.numbers.filter(function(x){return x.unit==="h";})[0];
  if(/(^| )(slept|sleep|got|نمت|نوم)( |$)/.test(f)&&hrs&&hrs.n<6&&/(^| )(only|just|barely|بس|يادوب)( |$)/.test(f)&&!q)add("lowday","statement","sleep",8);
  if(/(^| )(sore|achy|aching|ممسوك|ممسوكه|متكسر|مكسر)( |$)/.test(f)&&!E.numbers.length&&!q&&!/(\/10|out of 10)/.test(f)
    /* How sore, said ("very sore", "ممسوك اوي"): that is logged as said (commands.js); only a plain "sore" is asked about. */
    &&!/(^| )(very|really|super|so|extremely|a bit|a little|slightly|kinda|killing|اوي|جدا|قوي|شويه)( |$)/.test(f))add("sore","statement","",7);
  if(/^(i (did not|have not|havent|didnt) (eat|eaten|had|have) (breakfast|lunch|anything|yet)|i skipped (breakfast|lunch)|مفطرتش|مفطرتش لسه|متغديتش|ماكلتش|مكلتش|مأكلتش)( |$)/.test(f))add("eat","statement","",7);
  if(STEPSQ.test(f))add("steps","own-data","",7);
  /* ---- knowledge ---- */
  /* The same muscle on days in a row: how often to train it (the frequency rule). */
  if(/(two days in a row|days in a row|back to back|consecutive days|every day|2 days in a row|يومين ورا بعض|ورا بعض|يومين متتاليين|كل يوم)/.test(f)&&/(train|work|hit|do|امرن|اتمرن|العب|اشتغل)/.test(f)&&(E.muscle.length||ex)&&q)add("kfreq","knowledge","",9);
  if(HOWDO.test(f)&&(ex||ctx&&ctx.current))add("technique","knowledge","",9);
  if(WHY.test(" "+f+" ")&&WHYCHANGE.test(f)&&/(weight|load|kg|calorie|kcal|reps|sets|الوزن|وزن|السعرات|العدات|الحمل|زودتلي|نزلتلي)/.test(f))add("why","knowledge","",10);
  /* An exercise named and nothing else: what is wanted is not said. */
  if(ex&&!out.length&&f.split(" ").length<=3&&!q&&!neg&&!MOREW.test(f))
    {add("record","own-data","best",4);add("technique","knowledge","",4);}
  out.sort(function(a,b){return b.score-a.score;});
  return out;}

function entitiesOf(f,ctx,order){
  var tm=timeOf(f),nums=numbersIn(f),E={exercise:[],numbers:nums,minutes:minutesOf(nums),day:tm.day,period:tm.period,meal:"",muscle:[],equipment:[],weekdays:weekdaysIn(f),food:false};
  exPhrases(f).forEach(function(p){var r=resolveEx(p.k,ctx,order);E.exercise.push({name:r.name,said:p.said,key:p.k,from:r.from});});
  if(!E.exercise.length&&ctx&&typeof ctx.named==="function"){(ctx.named(f)||[]).forEach(function(n){E.exercise.push({name:n.name||n,said:n.said||"",key:"",from:"library"});});}
  MUSCLES.forEach(function(m){if(m[1].test(" "+f+" "))E.muscle.push(m[0]);});
  /* "Leg press" is an exercise, not legs; "chest press" the same. */
  if(E.exercise.length)E.muscle=E.muscle.filter(function(m){return !E.exercise.some(function(x){return new RegExp(m.toLowerCase().replace(/s$/,"")).test(x.key);});});
  EQUIP.forEach(function(m){if(m[1].test(" "+f+" "))E.equipment.push(m[0]);});
  /* "Dumbbell press" names an exercise, not the kit for today. */
  if(E.exercise.some(function(x){return /dumbbell/.test(x.key);}))E.equipment=E.equipment.filter(function(x){return x!=="Dumbbell";});
  MEAL.forEach(function(m){if(!E.meal&&m[1].test(" "+f+" "))E.meal=m[0];});
  E.food=!!(ctx&&typeof ctx.food==="function"&&ctx.food(f));
  return E;}

/* The reading. */
function understand(text,ctx){
  ctx=ctx||{};
  var raw=String(text||"").trim(),nz=normalize(raw),f=nz.f;
  var lang=AR.test(raw)||nz.franco?"ar":"en";
  var R={text:raw,norm:f,lang:lang,kind:null,act:null,topic:null,mode:"",entities:null,neg:false,scope:"",confidence:0,alts:[],followup:false,correction:null};
  if(!f){R.entities=entitiesOf("",ctx);return R;}
  var E=entitiesOf(f,ctx);R.entities=E;R.neg=NEG.test(" "+f+" ");R.scope=scopeOf(f);
  var asked=ASKED.test(raw),prev=ctx.prev||null;
  /* ---- a correction of the previous turn ---- */
  var cw=f.match(CORRWITH);
  if(prev&&(CORRBARE.test(f)||cw)){
    var said=cw?f.slice(cw[0].length).trim():"";
    /* "I meant yesterday, not today": what is negated is the old reading, not the new. */
    said=said.replace(/[ ,]*(not|مش|مش هو) (\S+( \S+)?)$/,"").trim();
    R.kind="correction";R.act="correct";R.correction={bare:!said,said:said,prev:prev};
    if(said){
      var Es=entitiesOf(said,ctx);
      R.correction.entities=Es;
      R.topic=prev.topic||null;R.mode=prev.mode||"";R.confidence=prev.topic?0.8:0.5;}
    else{R.topic="correction";R.confidence=0.9;}
    return R;}
  /* ---- a follow-up: the last reading, with what this one changes ---- */
  var mm=f.match(MOREW),mk=f.match(MAKEIT);
  if(prev&&prev.topic&&prev.topic!=="correction"&&(mm&&f.split(" ").length<=5||mk)){
    var rest=(mm?f.slice(mm[0].length):f.slice(mk[0].length)).trim();
    var Ef=entitiesOf(rest,ctx);
    var changes=Ef.exercise.length||Ef.muscle.length||Ef.day||Ef.period||Ef.numbers.length||Ef.meal||Ef.equipment.length;
    if(changes&&!readings(rest,Ef,ctx,false,false).filter(function(x){return x.score>=8;}).length){
      R.followup=true;R.kind=prev.kind;R.act=prev.act;R.topic=prev.topic;R.mode=prev.mode;
      R.entities=merge(prev.entities,Ef);R.confidence=0.8;R.change=Ef;return R;}}
  var rs=readings(f,E,ctx,R.neg,asked);
  if(rs.length){
    var top=rs[0];
    R.topic=top.topic;R.kind=top.kind;R.mode=top.mode;if(top.n)R.n=top.n;
    var second=rs.filter(function(x){return x.topic!==top.topic;})[0];
    R.confidence=Math.min(1,top.score/10)-(second&&second.score>=top.score?0.4:second&&second.score>=top.score-1?0.15:0);
    /* A change to the program names what is in the program; anything else, what is logged. */
    if(/^(exswap|exremove|avoid)$/.test(top.topic)&&E.exercise.length){var Ep=entitiesOf(f,ctx,"program");E.exercise=Ep.exercise;}
    R.alts=rs.filter(function(x){return x.topic!==top.topic||x.mode!==top.mode;}).slice(0,2).map(function(x){return {topic:x.topic,mode:x.mode,kind:x.kind};});
    /* Two of the person's exercises equally named ("press"): which is not known. */
    var amb=ctx.mine&&E.exercise[0]&&E.exercise[0].from==="program"&&(ctx.mine||[]).filter(function(n){
      return wordsOf(E.exercise[0].key).every(function(w){return wordsOf(n).indexOf(w)>=0;});}).length>2&&/^(press|row|curl)$/.test(E.exercise[0].key);
    if(amb)R.confidence=Math.min(R.confidence,0.4);}
  else{
    R.kind=asked||Q.test(f)?(/(^| )(my|mine|me|بتاعي|بتاعتي|عندي)( |$)|(^| )(did i|have i|i did|i ate|i lifted|i logged|i trained|عملت|اكلت|شلت|سجلت)( |$)/.test(f)?"own-data":"knowledge"):R.neg||/^(i |my |انا |عندي )/.test(f)?"statement":null;}
  R.act=R.kind==="request"?"do":R.kind==="correction"?"correct":R.kind==="statement"?"tell":R.kind==="out-of-scope"?"chat":R.kind?"ask":null;
  return R;}
/* A follow-up's entities: the new ones replace the old of the same kind. */
function merge(a,b){
  a=a||{};var o={};Object.keys(b).forEach(function(k){o[k]=a[k];});
  ["exercise","muscle","equipment","numbers","weekdays"].forEach(function(k){o[k]=b[k]&&b[k].length?b[k]:(a[k]||[]);});
  ["day","period","meal"].forEach(function(k){o[k]=b[k]||a[k]||(k==="meal"?"":k==="period"?"":null);});
  o.minutes=b.minutes||a.minutes||0;o.food=b.food||a.food||false;
  return o;}
/* The previous message said again with a correction's or a follow-up's change in it:
   the exercise, the day or span, or the number replaced where it was said. Returns the
   new text, or "" when the change has nowhere to go. */
var DAYWORDS=/(^| )(today|tonight|yesterday|tomorrow|this week|last week|next week|this month|last month|last time|النهارده|امبارح|بكره|الاسبوع ده|الاسبوع اللي فات|الاسبوع|الشهر ده|الشهر|اخر مره)(?= |$)/;
function retell(prevText,change,ctx){
  var pt=normalize(prevText).f,out=pt,done=false;
  var pe=exPhrases(pt);
  if(change.exercise&&change.exercise.length&&pe.length){out=out.replace(pe[0].said,change.exercise[0].said);done=true;}
  else if(change.exercise&&change.exercise.length){out=out+" "+change.exercise[0].said;done=true;}
  var nt=timeOf(change._f||"");
  if(change._f&&DAYWORDS.test(" "+change._f+" ")){
    var nw=(" "+change._f+" ").match(DAYWORDS)[0].trim();
    if(DAYWORDS.test(" "+out+" "))out=(" "+out+" ").replace(DAYWORDS,"$1"+nw).trim();else out=out+" "+nw;done=true;}
  else if(nt.day&&nt.day.when==="weekday"&&!done){
    /* A weekday for a weekday, in place: "skip saturday" → "skip monday". */
    var nwd=change._f.split(" ").filter(function(w){return weekdaysIn(w).length;}).pop();
    var tk=out.split(" "),at=-1;tk.forEach(function(w,i){if(weekdaysIn(w).length)at=i;});
    if(at>=0)tk[at]=nwd;else tk.push(nwd);out=tk.join(" ");done=true;}
  if(change.muscle&&change.muscle.length&&!done){
    var hit=MUSCLES.filter(function(m){return m[1].test(" "+out+" ");})[0];
    if(hit){out=(" "+out+" ").replace(hit[1],"$1"+change._mw).trim();done=true;}}
  if(change.numbers&&change.numbers.length&&!done){
    var nn=change.numbers[0].n;
    if(/\d/.test(out)){out=out.replace(/\d+(?:[.,]\d+)?/,String(nn));done=true;}}
  return done?out.replace(/\s+/g," ").trim():"";}
/* What a change says, with the words it said them in, for retell(). */
function changeOf(said,ctx){
  var nz=normalize(said).f,E=entitiesOf(nz,ctx);E._f=nz;
  var mw=MUSCLES.filter(function(m){return m[1].test(" "+nz+" ");})[0];
  if(mw)E._mw=(" "+nz+" ").match(mw[1])[0].trim();
  return E;}

export {understand, gloss, normalize, retell, changeOf, exPhrases, resolveEx, numbersIn, timeOf, weekdaysIn};

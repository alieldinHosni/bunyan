/* Bunyan — what a question to the coach is asking
   The coach chat is guided, not generative. Nothing leaves the phone and no model writes
   the answers: a typed question, in English or Egyptian Arabic, is matched to one of a
   fixed set of things the coach can answer from the person's own log, plan and targets.
   This file is only the matching. Pure: text in, an intent out.

   Each intent lists phrases. A phrase is words that must all be in the question, in any
   order; "a|b" is either word. Longer phrases are more specific, so a phrase scores the
   letters it matched and the best score wins: "how much weight should I lift" is about
   the load, not the scale, because "how much weight" outscores "weight". English words
   match from the start of a word ("injur" catches injured, injury), or as the whole word
   when they end in $ ("pr$" is not the start of "protein"). Arabic words may carry the
   prefixes و ف ب ل ال and the common endings, as Arabic writes them.

   Typed on a phone, words come misspelt. An English word of five letters or more also
   matches with one letter wrong, missing, extra or swapped ("protien", "calroies"),
   when its first letter is right. An Arabic word of four letters or more also matches
   on its skeleton, the word without its long vowels ا و ي, which is how the same gym
   word gets spelt different ways ("بينش", "بنش"). A near match scores a little less
   than an exact one. The gym words people transliterate are put in one spelling first
   (spell()). */

var INTENTS=[
  ["today",[
    "today workout|session|train|training|plan|program|gym","what train|training|workout|lift|do$","whats on","next workout|session",
    "start workout|training","which day","whats|what today","تمرين|تمريني|اتمرن|هتمرن نهارده|النهارده|انهارده|اليوم","اتمرن|هتمرن|العب ايه|اي",
    "التمرين الجاي|اللي جاي","ابدا تمرين|التمرين","rest day|days","day off","today rest|off","راحه|اجازه النهارده|اليوم",
    "ماذا|ايش|شو اتمرن|العب","atmaren|atmarren|etmaren|tamreen|tamrin"]],
  ["tomorrow",[
    "tomorrow|tmrw|tomorow","train|training|workout|session|gym|lift|plan tomorrow|tmrw|tomorow","next day",
    "بكره|بكرا","اتمرن|تمرين|هتمرن|العب ايه|اي بكره|بكرا"]],
  ["last",[
    "last workout|session|training|gym|time","previous workout|session","how did i do","my last workout|session",
    "اخر تمرين|جلسه|مره","التمرين اللي فات","عملت ايه اخر|المره"]],
  ["weights",[
    "how much weight|lift|squat|bench|deadlift|press|row|curl","what weight|load","how heavy","weight should","increase|add|raise weight|load",
    "next weight","go heavier","heavier","progressive overload","how many reps|sets",
    "وزن كام","اشيل|ارفع|العب كام|قد","ازود|زود الوزن|وزن|التقل","الوزن المناسب","كام كيلو","كام عده|تكرار",
    "بنش|سكوات|ديدلفت|بريس|كيرل|عقله|سحب|تجديف|ليج كام|كم|قد|وزن","كم كيلو|وزن"]],
  ["eat",[
    "what eat","eat today|now|next","left today","calories|kcal|protein left|remaining","remaining","food today","how much eat|food",
    "hungry","next meal","meal now","have i eaten",
    "اكل ايه|اي","اكل النهارده|دلوقتي","ماذا|ايش|شو اكل","اكل الان|الحين","akol|akl|aakol|kol eh|e$|eih|eah","فاضل|باقي كام|ايه|سعرات|بروتين","اكل كام|قد","جعان|جعانه","الوجبه الجايه","وجبه دلوقتي"]],
  ["rest",[
    "rest of day|today","eat|food|meals rest of day|today","remaining meals","rest of my day",
    "باقي|بقيه اليوم|النهارده","اكل ايه باقي|بقيه اليوم|النهارده"]],
  ["swap",[
    "other food|foods|options|meal|meals|choices","alternative|alternatives|substitute|substitutes|swap|swaps|replacement",
    "instead of","same macros|calories|kcal|protein","something else eat|instead","replace|swap|change food|meal|it|breakfast|lunch|dinner|snack",
    "بديل|بدايل|بدائل|بدل","حاجه|اكل|اكله تانيه|تاني|غير","نفس الماكروز|الماكرو|السعرات|الكالوريز|البروتين","اغير الاكل|الوجبه|الاكله"]],
  ["foodinfo",[
    "how much protein|calories|kcal|carbs|fat|fiber|sugar in$","how many calories|kcal|grams in$","protein|calories|kcal|carbs|fat|macros in$",
    "macros of|for","nutrition of|facts|info|value",
    "كام|كم بروتين|سعر|سعره|سعرات|كارب|دهون|جرام في","فيه|فيها|في كام|كم بروتين|سعر|سعره|سعرات|كارب|دهون","القيمه الغذائيه"]],
  ["track",[
    "on track","how am i doing","how doing","my progress","progress","results","improving","getting better","summary","overview",
    "how was my week","this week","review",
    "ماشي صح","عامل|ماشي ايه|اي","تقدمي|التقدم","اتحسنت|بتحسن","نتايج|نتائج|النتيجه","ملخص","الاسبوع ده|الاسبوع"]],
  ["weight",[
    "my weight","scale","weight stuck|same|plateau|stall|not","not losing|dropping","not gaining","weigh|weighed|weigh-in","body weight","plateau","stalled",
    "lost|gained how much","losing weight","gaining weight",
    "وزني","الميزان","wazny|wazni","مش بخس|بنزل|بزيد|بتخن","ثابت|واقف","نزلت|زدت كام","وزن ثابت"]],
  ["protein",[
    "protein","enough protein","how much protein",
    "بروتين","البروتين"]],
  ["calories",[
    "calories|calorie|kcal","why target|targets|calories","maintenance","tdee","bmr","macros|macro","carbs|carb|carbohydrates","fat$|fats$",
    "سعرات|سعر|كالوري","احتياجي|احتياج","ماكروز|الماكرو","كارب|كاربز|نشويات","دهون"]],
  ["sore",[
    "sore","soreness","tired","exhausted","fatigue|fatigued","pain","hurt|hurts","injur","no energy","low energy","slept|sleep",
    "sick","recover|recovery","deload","lighter week|session",
    "تعبان|تعبانه|تعب","مرهق|ارهاق","واجعني|بيوجعني|بتوجع|بيوجع|توجع|يوجع|وجع|الم","مصاب|اصابه|متصاب","منمتش|نوم|نايم","عيان|عيانه","ريكفري|استشفاء","اسبوع خفيف"]],
  ["missed",[
    "missed","skipped|skip","no time","short on|of time","busy","cant go|train|make","cannot go|train|make","only have","less time",
    "quick workout|session","shorter","minutes|mins$",
    "فوت|فاتني|فوتت","مروحتش|ماروحتش","معنديش|مفيش وقت","مش فاضي","وقت قليل|مش كتير","مستعجل|مستعجله","تمرين قصير|سريع","دقيقه|دقايق"]],
  ["balance",[
    "balanced|balance","enough sets|volume","volume","muscle groups","too much|many sets","overtraining|overtrained","weak point|points|spot",
    "lagging","neglect|neglecting",
    "متوازن|توازن","مجموعات كفايه","حجم التمرين|الفوليوم","عضله متاخره|ضعيفه","مهمل|مهمله"]],
  ["strong",[
    "how strong","strong am i","my max|maxes","1rm","one rep max","record|records|pr$|prs$","strength","compare|compared","percentile",
    "squat|bench|deadlift",
    "قوتي|قوي|قويه","اقصي وزن|اقصي","رقم قياسي|ارقامي|الارقام","اقارن|مقارنه"]],
  ["goal",[
    "change goal|goals","my goal","goal","bulk|bulking","cut$|cutting","lose fat","build muscle","recomp","get stronger",
    "هدفي|الهدف|هدف","اخس|خساره","انشف|تنشيف","تضخيم|اضخم|تضخم","اغير الهدف"]],
  ["plan",[
    "new program|plan|split|routine","change program|plan|split|workout|routine","meal plan","diet|diet plan","retake|redo assessment","assessment",
    "build plan|program","make plan|program",
    "برنامج جديد","خطه جديده","نظام اكل|غذائي","دايت","اغير البرنامج|التمرين|النظام","التقييم","اعمل برنامج|خطه"]],
  ["water",[
    "water","drink|drinking","hydrate|hydration",
    "مايه|ميه|مياه|المايه","اشرب|بشرب"]],
  ["steps",[
    "steps","walk|walking","cardio","run|running",
    "خطوات|خطوه","مشي|امشي","كارديو","جري"]],
  ["help",[
    "help","what can you","what do you","how does this work","options","questions",
    "مساعده|ساعدني","تقدر تعمل|تساعد","بتعمل ايه","اسال ايه|اسال"]],
  ["hello",[
    "hi$|hello|hey|salam|yo$","good morning|evening","morning",
    "اهلا|ازيك|ازيكم|السلام|سلام|هاي","صباح|مساء"]],
  /* ---- things to change (js/ui/agent.js resolves what they name; nothing here
     knows the library, the split or the foods). An exercise swap is its own intent:
     "swap" above is a food swap, and which one a question is decides on what it names
     — an exercise in the library or a food in the database — never on the verb. */
  ["exadd",[
    "add exercise|exercises|movement|move|lift","add to day|workout|session|program|routine|push|pull|legs|upper|lower|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday",
    "put in|into my|day|workout|program","include in","add$",
    "ضيف|اضيف|زود|ضيفلي تمرين","حط|حطلي في|ل اليوم|التمرين|البرنامج","ضيف|اضيف|حط"]],
  ["exremove",[
    "remove|delete|drop exercise|from|it","take out|off exercise|from","get rid of","no more","remove$|delete$",
    "شيل|امسح|احذف|الغي تمرين|من","شيل|امسح|احذف"]],
  ["exswap",[
    "swap|replace|switch|change|substitute exercise|movement|lift","swap|replace|switch|substitute for|with",
    "instead of exercise|movement","بدل|غير|استبدل تمرين|التمرين",
    "بدل|غير|استبدل سكوات|بنش|ديدلفت|بريس|كيرل|ليج|سحب|تجديف|عقله"]],
  ["foodlog",[
    "log|add|record food|meal|breakfast|lunch|dinner|snack","i ate|had|eaten","just ate|had","log$","ate$|eaten$",
    "سجل|سجلي|ضيف اكل|وجبه|فطار|غدا|عشا","اكلت|كلت|اتغديت|اتعشيت|فطرت","سجل|سجلي"]],
  ["weighlog",[
    "log|record|save|update weight|weighed|weigh","i weigh|weighed","weight today|this morning",
    "سجل|سجلي|حدث وزني|الوزن","وزني النهارده|انهارده|دلوقتي|بقي|الصبح","وزنت"]],
  ["reassess",[
    "reassess$|reassessment","redo|retake|repeat|restart my assessment|evaluation","assess me again","start over",
    "اعيد التقييم","اعمل التقييم تاني|من الاول","تقييم جديد"]],
  /* ---- how training works: answered from js/knowledge/ (js/engine/kb.js) with the
     person's own program and log beside it. */
  ["kreps",[
    "how many reps should|for|to","rep range","reps for muscle|size|hypertrophy|strength|growth|endurance","best reps",
    "كام عده|تكرار المفروض|للعضل|للتضخيم|للقوه","عدد العدات|التكرارات"]],
  ["ksets",[
    "how many sets should|per|for|each","sets per exercise","sets for muscle|size|hypertrophy|strength",
    "كام مجموعه|سيت المفروض|للعضل|لكل","عدد المجموعات|السيتات"]],
  ["krest",[
    "how long rest|wait between","rest between sets","rest time","how much rest","rest period|periods|interval",
    "ارتاح|راحه قد|كام ايه بين","الراحه بين","وقت الراحه"]],
  ["kfreq",[
    "how many days|times week|train","how often train|should|lift|workout","times a week","days per|a week train|lift|gym",
    "كام يوم|مره في الاسبوع","اتمرن كام"]],
  ["kvolume",[
    "how many sets week|weekly","sets a|per week","weekly sets|volume","enough sets for","enough volume","too many sets",
    "chest|back|shoulders|quads|hamstrings|glutes|biceps|triceps|calves|legs|arms volume|sets",
    "مجموعات|سيتات في الاسبوع","كفايه صدر|ضهر|كتف|رجل|باي|تراي"]],
  ["ktempo",[
    "tempo","tempo lift|should|for|reps|rep","how fast lift|rep|reps|lower","lifting speed","slow reps|negatives",
    "سرعه العده|التكرار","بالراحه ولا بسرعه"]],
  ["kwarm",[
    "warm up|warmup sets|set|how many","warmup|warm-up","before lifting|working sets",
    "تسخين|احماء"]],
  ["kdur",[
    "how long workout|session|train|training|should","workout length|duration","session length|duration","how long gym",
    "مده التمرين","التمرين ياخد قد|كام"]],
  ["k1rm",[
    "1rm|one rep max|max calculate|formula|estimate","estimated max|1rm","how is max|1rm calculated",
    "اقصي وزن مره|لعده","الماكس"]],
  /* What the person has told the coach to keep (js/coach/context.js). */
  ["facts",[
    "what have i told you","what did i tell you","what do you know about me","what you know about me","my facts|notes","what you remember|kept",
    "قلتلك ايه","انا قلتلك ايه","تعرف ايه عني","فاكر ايه عني"]],
  ["thanks",[
    "thanks|thank|thx|cheers","great|perfect|awesome|nice","ok$|okay$|cool",
    "شكرا|متشكر|متشكره|ميرسي","تمام|حلو|جميل|ماشي"]]];

var ARABIC=/[؀-ۿ]/;
/* Egyptian Arabic typed in Latin letters, with digits for the letters Latin lacks
   ("3ayez akol eh delwa2ty"): answered in Arabic, as the person writing it reads. */
var FRANCO=/[a-z][2357][a-z]|(^| )[2357][a-z]|(^| )(3ayez|3ayza|3awez|delwa2ty|dlw2ty|enaharda|elnaharda|nharda|bokra|ezay|izay|leh|eh|keda|kam|akol|atmaren|wazny|ana)($| )/;

/* Folded the way the food and exercise search fold: case, the Arabic letter variants
   people type for each other, marks and tatweel, and punctuation. */
function fold(s){
  return String(s||"").toLowerCase()
    .replace(/[ً-ْٰـ]/g,"")
    .replace(/[أإآٱ]/g,"ا").replace(/ى/g,"ي").replace(/ؤ/g,"و").replace(/ئ/g,"ي").replace(/ة/g,"ه")
    .replace(/[’']/g,"")
    .replace(/[^\w\s؀-ۿ-]/g," ").replace(/[؟،؛]/g," ")
    .replace(/\s+/g," ").trim();}

/* The gym words people transliterate, put in one spelling. Applied to folded text. */
var SPELL=[[/(^| )(ال)?(بينش|بنتش|بانش)(?= |$)/g,"$1$2بنش"],[/(^| )(ال)?(اسكوات|سكوت|سكواتس)(?= |$)/g,"$1$2سكوات"],
  [/(^| )(ال)?(ديد ليفت|ديدليفت|ديد لفت)(?= |$)/g,"$1$2ديدلفت"],[/(^| )(ال)?(بروتيين|بروتن)(?= |$)/g,"$1$2بروتين"],
  [/(^| )(كالوريز|كالوريس)(?= |$)/g,"$1سعرات"]];
function spell(text){SPELL.forEach(function(r){text=text.replace(r[0],r[1]);});return text;}

/* One edit apart: a letter wrong, missing or extra, or two neighbours swapped. */
function near(a,b){
  if(a===b)return true;
  var la=a.length,lb=b.length;if(Math.abs(la-lb)>1)return false;
  if(la===lb){
    var d=[];for(var i=0;i<la;i++)if(a.charAt(i)!==b.charAt(i))d.push(i);
    return d.length===1||(d.length===2&&d[1]===d[0]+1&&a.charAt(d[0])===b.charAt(d[1])&&a.charAt(d[1])===b.charAt(d[0]));}
  var sh=la<lb?a:b,lo=la<lb?b:a,k=0;
  while(k<sh.length&&sh.charAt(k)===lo.charAt(k))k++;
  return sh.slice(k)===lo.slice(k+1);}
var PRE=/^(وال|بال|فال|لل|ال|و|ف|ب|ل)(?=...)/,SUF=/(ني|ها|نا|هم|ين|ات|ي|ك|ه)$/;
function skel(w){return w.charAt(0)+w.slice(1).replace(/[اوي]/g,"");}

/* Whether a word is in the text: 2 exactly, 1 nearly (a typo, or the same Arabic
   skeleton), 0 not at all. */
function wordIn(text,word){
  var whole=word.charAt(word.length-1)==="$";if(whole)word=word.slice(0,-1);
  var ar=ARABIC.test(word);
  if(ar?new RegExp("(^| )(و|ف|ب|ل|وال|بال|فال|لل|ال)?"+word+"(ي|ني|ك|ه|ها|نا|هم|ين|ات)?($| )").test(text)
    :new RegExp("(^| )"+word.replace(/-/g,"\\-")+(whole?"($| )":"")).test(text))return 2;
  if(whole||word.length<(ar?4:5))return 0;
  var toks=text.split(" "),sk=ar?skel(word):"";
  for(var i=0;i<toks.length;i++){
    var w=toks[i];
    if(ar){
      if(!ARABIC.test(w))continue;
      var forms=[w,w.replace(PRE,""),w.replace(SUF,""),w.replace(PRE,"").replace(SUF,"")];
      for(var f=0;f<forms.length;f++)if(forms[f].length>=3&&skel(forms[f])===sk)return 1;}
    else if(w.charAt(0)===word.charAt(0)&&(near(word,w)||(w.length>word.length&&near(word,w.slice(0,word.length)))))return 1;}
  return 0;}

/* A phrase's score: the letters of the words it matched, or 0 if any word is missing.
   An exact word scores one more than a near one, so the right spelling wins a tie. */
function phraseScore(text,phrase){
  var parts=phrase.split(" "),score=0;
  for(var i=0;i<parts.length;i++){
    var alts=parts[i].split("|"),hit="",how=0;
    for(var j=0;j<alts.length;j++){if(!alts[j])continue;var m=wordIn(text,alts[j]);
      if(m&&(m>how||(m===how&&alts[j].length>hit.length))){hit=alts[j];how=m;}}
    if(!hit)return 0;
    score+=hit.replace(/\$$/,"").length+(how===2?1:0);}
  return score;}

/* The intent of a question: {id, score, lang, mins, kg, unit, grams, ranked}. kg is a
   body weight the question names (in kilograms, converted from pounds when it says
   lb), unit the unit it said ("" for a bare number), grams a portion it names. id is "unknown" when
   nothing in it is something the coach can answer; ranked lists every intent it
   touched, best first, for an answer that wants the runner-up. mins is a number of minutes the question names
   ("I only have 30 minutes"), for the questions about time. */
function intentOf(q){
  var text=spell(fold(q)),lang=ARABIC.test(q)||FRANCO.test(text)?"ar":"en",scores=[];
  if(!text)return {id:"unknown",score:0,lang:lang,mins:0,ranked:[]};
  INTENTS.forEach(function(it){
    var s=0;
    it[1].forEach(function(p){var x=phraseScore(text,p);if(x>s)s=x;});
    if(s>0)scores.push({id:it[0],score:s});});
  /* Highest first; on a tie the intent listed first, as before (a stable sort). */
  scores.sort(function(a,b){return b.score-a.score;});
  var best=scores[0]||{id:"unknown",score:0};
  var m=text.replace(/[٠-٩]/g,function(d){return "٠١٢٣٤٥٦٧٨٩".indexOf(d);}).match(/(\d{1,3}) ?(min|mins|minute|minutes|m\b|دقيقه|دقايق|دقيقة)/);
  /* From the question as typed: folding takes the decimal point away. */
  var ar=String(q).toLowerCase().replace(/[٠-٩]/g,function(d){return "٠١٢٣٤٥٦٧٨٩".indexOf(d);}).replace(/(\d)[٫,](\d)/g,"$1.$2").replace(/[^\w\s.\u0600-\u06FF]/g," ");
  var kg=ar.match(/(\d{2,3}(?:\.\d)?) ?(kg|kgs|kilo|kilos|كيلو|ك)?(?= |$)/),lb=ar.match(/(\d{2,3}(?:\.\d)?) ?(lb|lbs|pound|pounds|رطل)(?= |$)/);
  var gr=ar.match(/(\d{1,4}) ?(g|gm|gr|gram|grams|جرام|جم)(?= |$)/);
  return {id:best.score>=3?best.id:"unknown",score:best.score,lang:lang,mins:m?+m[1]:0,
    kg:lb?Math.round(+lb[1]/2.2046*10)/10:kg?+kg[1]:0,unit:lb?"lb":kg&&kg[2]?"kg":"",grams:gr?+gr[1]:0,
    ranked:scores.filter(function(x){return x.score>=3;}).map(function(x){return x.id;})};}


/* ---- a situation, not a question ----------------------------------------------------
   "I had a bad day, didn't stick to the diet" is a report, not an instruction. Its
   signals (missed, didn't, skipped, bad day, tired, stressed, sore, and the Egyptian
   Arabic for them) say something went off; its other words say what: food, training,
   sleep and energy, or pain. Pure: {kind:"food"|"train"|"tired"|"pain"|"day"} or null.
   "day" is a bad day with nothing saying what went off. A question is not a report. */
var SIGNAL=/(^| )(missed|miss|didnt|did not|skipped|skip|bad day|rough day|awful day|terrible day|tired|exhausted|stressed|sore|blew|cheated|overate|ate too much|binged|binge|fell off|slipped|couldnt sleep|slept badly|no sleep|hurts|hurt|pain|aching|injured|فوت|فوتت|فاتني|مروحتش|ماروحتش|معملتش|ماعملتش|ملتزمتش|مالتزمتش|ماالتزمتش|يوم وحش|يوم زفت|يوم صعب|تعبان|تعبانه|مرهق|مرهقه|مضغوط|مضغوطه|متوتر|متوتره|واجعني|بيوجعني|بتوجعني|وجع|الم|اكلت كتير|كسرت الدايت|بوظت|منمتش|نمت وحش)( |$)/;
var WHAT=[["pain",/(^| )(hurts|hurt|pain|aching|injured|injury|واجعني|بيوجعني|بتوجعني|وجع|الم|مصاب)( |$)/],
  ["food",/(^| )(diet|ate|eat|eating|food|calories|meal|meals|binge|binged|overate|cheated|junk|دايت|الدايت|اكل|الاكل|اكلت|سعرات|وجبه|الوجبات|رجيم)( |$)/],
  ["train",/(^| )(workout|training|train|gym|session|lift|lifting|leg day|تمرين|التمرين|الجيم|جيم|اتمرن|مروحتش|ماروحتش)( |$)/],
  ["tired",/(^| )(tired|exhausted|sleep|slept|stressed|energy|sore|تعبان|تعبانه|مرهق|مرهقه|نوم|منمتش|نمت|مضغوط|مضغوطه|متوتر|متوتره|طاقه)( |$)/]];
var ASKING=/[?؟]|^(what|how|why|should|can|could|is|are|do|does|when|which|ايه|ازاي|ليه|هل|امتي|اعمل ايه)( |$)/;
/* Arabic writes "and", "with" and "the" onto the word: each word is also tried bare. */
function bareAr(text){return text+" "+text.split(" ").map(function(w){
  return w.replace(/^(و|ف)(?=[\u0600-\u06FF]{3})/,"").replace(/^(بال|وال|لل|ال|ب)(?=[\u0600-\u06FF]{3})/,"");}).join(" ");}
function situationOf(q){
  var raw=String(q||""),text=bareAr(spell(fold(raw)));
  if(!text||ASKING.test(raw.trim().toLowerCase())||ASKING.test(text))return null;
  if(!SIGNAL.test(text))return null;
  for(var i=0;i<WHAT.length;i++)if(WHAT[i][1].test(text))return {kind:WHAT[i][0]};
  return {kind:"day"};}

/* ---- a fact about the person's life, said by them ---------------------------------
   "I work 13-hour days", "I can't do squats", "I don't eat pork": a statement worth
   keeping (js/coach/context.js), if the person agrees and says what kind it is. Only
   ever the words as said; nothing about the person is guessed here. Pure: true/false. */
var FACT=/^(i|im|i am|i ve|ive|my)( .*)?( )(work|works|working|shift|shifts|job|nights|commute|kids|travel|cant|cannot|dont eat|do not eat|avoid|allergic|vegetarian|vegan|hate|prefer|gym closes|gym opens|no gym|train at home|only train)( |$)/;
var FACT_AR=/(بشتغل|شغلي|شيفت|مبقدرش|مقدرش|مش بقدر|مش باكل|مبكلش|مباكلش|عندي حساسيه|حساسيه من|نباتي|نباتيه|بفضل|مش بحب|مبحبش|بكره|الجيم بيقفل|بتمرن في البيت)/;
function factOf(q){
  var raw=String(q||""),text=fold(raw);
  if(!text||ASKING.test(raw.trim().toLowerCase())||ASKING.test(text))return false;
  return FACT.test(text+" ")||FACT_AR.test(text);}

var IDS=INTENTS.map(function(x){return x[0];});
/* The intents that change something, and the ones answered from the knowledge files. */
var ACTION_IDS=["exadd","exremove","exswap","foodlog","weighlog","reassess"];
var KNOW_IDS=["kreps","ksets","krest","kfreq","kvolume","ktempo","kwarm","kdur","k1rm"];

export {ACTION_IDS, factOf, fold, IDS, intentOf, KNOW_IDS, situationOf, skel, spell};

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
   prefixes و ف ب ل ال and the common endings, as Arabic writes them. */

var INTENTS=[
  ["today",[
    "today workout|session|train|training|plan|program|gym","what train|training|workout|lift|do$","whats on","next workout|session",
    "start workout|training","which day","تمرين|تمريني|اتمرن|هتمرن نهارده|النهارده|انهارده|اليوم","اتمرن|هتمرن|العب ايه|اي",
    "التمرين الجاي|اللي جاي","ابدا تمرين|التمرين"]],
  ["weights",[
    "how much weight|lift|squat|bench|deadlift|press|row|curl","what weight|load","how heavy","weight should","increase|add|raise weight|load",
    "next weight","go heavier","heavier","progressive overload","how many reps|sets",
    "وزن كام","اشيل|ارفع|العب كام|قد","ازود|زود الوزن|وزن|التقل","الوزن المناسب","كام كيلو","كام عده|تكرار"]],
  ["eat",[
    "what eat","eat today|now|next","left today","calories|kcal|protein left|remaining","remaining","food today","how much eat|food",
    "hungry","next meal","meal now","have i eaten",
    "اكل ايه|اي","اكل النهارده|دلوقتي","فاضل|باقي كام|ايه|سعرات|بروتين","اكل كام|قد","جعان|جعانه","الوجبه الجايه","وجبه دلوقتي"]],
  ["track",[
    "on track","how am i doing","how doing","my progress","progress","results","improving","getting better","summary","overview",
    "how was my week","this week","review",
    "ماشي صح","عامل|ماشي ايه|اي","تقدمي|التقدم","اتحسنت|بتحسن","نتايج|نتائج|النتيجه","ملخص","الاسبوع ده|الاسبوع"]],
  ["weight",[
    "my weight","scale","weight stuck|same|plateau|stall|not","not losing|dropping","not gaining","weigh|weighed|weigh-in","body weight","plateau","stalled",
    "lost|gained how much","losing weight","gaining weight",
    "وزني","الميزان","مش بخس|بنزل|بزيد|بتخن","ثابت|واقف","نزلت|زدت كام","وزن ثابت"]],
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
  ["thanks",[
    "thanks|thank|thx|cheers","great|perfect|awesome|nice","ok$|okay$|cool",
    "شكرا|متشكر|متشكره|ميرسي","تمام|حلو|جميل|ماشي"]]];

var ARABIC=/[؀-ۿ]/;

/* Folded the way the food and exercise search fold: case, the Arabic letter variants
   people type for each other, marks and tatweel, and punctuation. */
function fold(s){
  return String(s||"").toLowerCase()
    .replace(/[ً-ْٰـ]/g,"")
    .replace(/[أإآٱ]/g,"ا").replace(/ى/g,"ي").replace(/ؤ/g,"و").replace(/ئ/g,"ي").replace(/ة/g,"ه")
    .replace(/[’']/g,"")
    .replace(/[^\w\s؀-ۿ-]/g," ").replace(/[؟،؛]/g," ")
    .replace(/\s+/g," ").trim();}

function wordIn(text,word){
  var whole=word.charAt(word.length-1)==="$";if(whole)word=word.slice(0,-1);
  if(ARABIC.test(word))
    return new RegExp("(^| )(و|ف|ب|ل|وال|بال|فال|لل|ال)?"+word+"(ي|ني|ك|ه|ها|نا|هم|ين|ات)?($| )").test(text);
  return new RegExp("(^| )"+word.replace(/-/g,"\\-")+(whole?"($| )":"")).test(text);}

/* A phrase's score: the letters of the words it matched, or 0 if any word is missing. */
function phraseScore(text,phrase){
  var parts=phrase.split(" "),score=0;
  for(var i=0;i<parts.length;i++){
    var alts=parts[i].split("|"),hit="";
    for(var j=0;j<alts.length;j++)if(alts[j]&&wordIn(text,alts[j])&&alts[j].length>hit.length)hit=alts[j];
    if(!hit)return 0;
    score+=hit.length+1;}
  return score;}

/* The intent of a question: {id, score, lang, mins}. id is "unknown" when nothing in it
   is something the coach can answer. mins is a number of minutes the question names
   ("I only have 30 minutes"), for the questions about time. */
function intentOf(q){
  var text=fold(q),lang=ARABIC.test(q)?"ar":"en",best={id:"unknown",score:0};
  if(!text)return {id:"unknown",score:0,lang:lang,mins:0};
  INTENTS.forEach(function(it){
    var s=0;
    it[1].forEach(function(p){var x=phraseScore(text,p);if(x>s)s=x;});
    if(s>best.score)best={id:it[0],score:s};});
  var m=text.replace(/[٠-٩]/g,function(d){return "٠١٢٣٤٥٦٧٨٩".indexOf(d);}).match(/(\d{1,3}) ?(min|mins|minute|minutes|m\b|دقيقه|دقايق|دقيقة)/);
  return {id:best.score>=3?best.id:"unknown",score:best.score,lang:lang,mins:m?+m[1]:0};}

var IDS=INTENTS.map(function(x){return x[0];});

export {fold, IDS, intentOf};

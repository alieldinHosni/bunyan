/* Bunyan — the coach's question bank (tools/, never shipped to the browser)

   Every way a person could plausibly ask the coach something, as a lifter in Cairo types
   it on a phone: English, Egyptian Arabic and Franco-Arabic, with the typos, the slang and
   the half-sentences. Each group says where a right answer comes from, as a pattern over
   the outcome tools/coach-eval.mjs records for a question:

     <intent>:            a rule answered it from the person's own log (chat.js ANSWER)
     know:<file> <title>  the textbook knowledge base answered it (kbsearch.js lookup)
     faq:<id>             the coach's curated answer bank answered it (js/coach/faq.js)
     scope:               the hard limits: a doctor, a physio, a dietitian
     app:                 an action in the app was asked for or done
     unknown:             nothing (with the smart coach on, the model would get it)

   The bank is the test set the coach is measured on. js/coach/faq.js keeps its own
   example questions (its training set) apart from these, so a score here is a score on
   wordings it was not written against. */

/* Helpers for the patterns. */
var I=function(){return "^("+[].slice.call(arguments).join("|")+"):";};          // one of these intents
var K=function(re,faq){return "^(know:[^ ]* .*("+re+")|faq:("+(faq||re)+"))";};   // a passage about re, or that faq
var F=function(id){return "^faq:("+id+")";};
var SC="^scope:";

var GROUPS=[
/* ======================================================================= the person's own */
{topic:"today",expect:I("today"),qs:[
  "what's my workout today","what am i doing today","today's session?","what do I train today","whats on the plan today","gym today what",
  "what's today's workout","which day is today in my program","do i train today","is today a gym day","is it a rest day today",
  "النهارده تمرين ايه","هتمرن ايه النهارده","انهارده يوم ايه في البرنامج","عندي تمرين النهارده؟","النهارده راحه ولا تمرين",
  "el naharda tamreen eh","ana hatmaren eh enharda","what should i hit today","today plan pls"]},
{topic:"tomorrow",expect:I("tomorrow"),qs:[
  "what's tomorrow","tomorrow's workout","what do i train tomorrow","is tomorrow a rest day","what's next after today",
  "بكره تمرين ايه","بكره راحه؟","bokra tamreen eh","tmrw workout?"]},
{topic:"last",expect:I("last","strong","track","week"),qs:[
  "how was my last workout","how did my last session go","yesterday's workout how was it","last time at the gym",
  "اخر تمرين كان عامل ازاي","التمرين اللي فات كان كويس؟"]},
{topic:"weights",expect:I("weights","plateau","strong","k1rm"),qs:[
  "how much should i bench","what weight should i use for squats","should i go heavier on bench","when do i add weight",
  "how heavy should my deadlift be today","what load for pull ups","should i increase the weight next time","am i lifting enough",
  "العب كام في البنش","ازود الوزن امتى","اشيل كام في السكوات","المفروض العب وزن قد ايه","ازود ولا اثبت",
  "a3ml kam fel bench","azawed el wazn emta"]},
{topic:"plateau",expect:I("plateau","weights"),qs:[
  "my bench is stuck","why isn't my squat going up","i've plateaued","my deadlift hasn't moved in weeks","stuck on the same weight",
  "no progress on overhead press","البنش واقف","السكوات مش بيزيد","بقالي اسابيع على نفس الوزن","el bench wa2ef"]},
{topic:"strong",expect:I("strong","weights","k1rm","app"),qs:[
  "how strong am i","what are my prs","my best lifts","what's my max bench","whats my 1rm on squat","show my records",
  "انا قوي ولا لا","اعلى وزن رفعته","ارقامي القياسيه"]},
{topic:"track",expect:I("track","week","weight"),qs:[
  "am i progressing","how am i doing","am i on track","is it working","am i getting results","give me a progress summary",
  "انا ماشي صح؟","فيه تقدم؟","النتيجه عامله ايه","ana mashy sa7?"]},
{topic:"week",expect:I("week","track","weektrain"),qs:[
  "how was my week","weekly summary","how did this week go","recap my week","الاسبوع ده كان عامل ازاي","ملخص الاسبوع"]},
{topic:"weight",expect:I("weight","track")+"|"+F("weigh-fluct"),qs:[
  "is my weight going down","why am i not losing weight","my weight is the same","the scale won't move","am i gaining too fast",
  "why did i gain 1 kg overnight","is my weight trend ok","وزني مش بينزل","الميزان واقف","وزني زاد ليه","wazny msh beynzel"]},
{topic:"protein",expect:I("protein"),qs:[
  "how much protein do i need","protein target","am i eating enough protein","how many grams of protein a day","protein per day for me",
  "محتاج كام جرام بروتين","البروتين بتاعي كفايه؟","kam protein mehtag"]},
{topic:"calories",expect:I("calories"),qs:[
  "why are my calories so low","how did you calculate my calories","explain my calorie target","how many calories should i eat",
  "what's my maintenance","why 2500 calories","سعراتي ليه كده","المفروض اكل كام سعر","so3raty leh keda"]},
{topic:"eat",expect:I("eat","rest","weekfood","lowday")+"|"+F("post-workout|pre-workout"),qs:[
  "what should i eat now","i'm hungry what do i eat","what's for dinner","what to eat after the gym","suggest a meal",
  "اكل ايه دلوقتي","جعان اكل ايه","اكل ايه بعد التمرين","a2kol eh delwa2ty"]},
{topic:"rest",expect:I("rest","eat"),qs:[
  "what's left to eat today","how much is left for today","remaining calories","how many calories do i have left",
  "فاضلي كام سعر النهارده","فاضل اكل ايه"]},
{topic:"water",expect:I("water")+"|"+K("hydration","hydration-training"),qs:[
  "how much water should i drink","am i drinking enough","water target","how many liters a day","اشرب مايه قد ايه","كام لتر مايه في اليوم"]},
{topic:"steps",expect:I("steps"),qs:["how are my steps","did i walk enough","how much cardio did i do","خطواتي عامله ايه"]},
{topic:"sore",expect:I("sore","situation","lowday","app")+"|"+K("doms|soreness","sleep"),qs:[
  "i'm so sore","my legs are destroyed from yesterday","i feel tired today","i slept badly","should i train if i'm sore",
  "عضلاتي مكسره","تعبان النهارده","رجلي واجعاني من امبارح"]},
{topic:"missed",expect:I("missed","lowday","situation","weektrain"),qs:[
  "i only have 30 minutes","short on time today","i missed monday","i skipped two workouts","no time today","معنديش وقت النهارده","فوت تمرين امبارح"]},
{topic:"balance",expect:I("balance"),qs:[
  "is my program balanced","am i missing any muscle","is my split good","do i train everything enough","البرنامج متوازن؟"]},
{topic:"goal",expect:I("goal","app"),qs:["should i cut or bulk","i want to lose fat","switch my goal to muscle gain","عايز اخس","عايز اضخم","a5es wala adakham"]},
{topic:"plan",expect:I("plan","reassess","app"),qs:["make me a new plan","build a new program","i want a new meal plan","اعملي برنامج جديد","new program pls"]},
{topic:"inbody",expect:I("inbody")+"|"+F("app-inbody"),qs:["what does my inbody say","i did an inbody","read my body composition","تحليل الانبودي بتاعي"]},
{topic:"loadlog",expect:I("loadlog"),qs:["does the weight include the bar","dumbbells per hand or both","how is volume counted","البار محسوب؟","الدمبل لكل ايد ولا الاتنين"]},
{topic:"twice",expect:I("twice"),qs:["can i train twice a day","two sessions in one day","how do i add a second workout today","ينفع اتمرن مرتين في اليوم"]},
{topic:"warmplan",expect:I("warmplan"),qs:["is my warm up made for each session","why is the warm-up the same every day","can i customize my warm up","الاحماء بيتغير حسب التمرين؟"]},
/* ================================================================= requests and logging */
{topic:"actions",expect:"^(exadd|exremove|exswap|foodlog|weighlog|app):",qs:[
  "add face pulls to pull day","remove leg press","swap bench for dumbbell press","replace squats with hack squat","log 80 kg for 8",
  "i ate two eggs","log my weight 83.5","next exercise","skip this exercise","ضيف بايسبس على يوم السحب","شيل الديدلفت","سجل وزني 84",
  "اكلت فول و عيش","add plank to legs day","delete the last set"]},
/* ====================================================== how training works (rules + book) */
{topic:"kreps",expect:I("kreps")+"|"+K("rep|hypertrophy|strength|adaptation"),qs:[
  "how many reps to build muscle","best rep range for size","how many reps for strength","high reps or low reps","reps for toning",
  "is 8 to 12 reps best","how many reps should i do","عدات كام عشان اضخم","كام عده للقوه","3adat kam"]},
{topic:"ksets",expect:I("ksets","kvolume")+"|"+K("set|volume"),qs:[
  "how many sets per exercise","how many sets per muscle per week","is 3 sets enough","how many sets for chest a week","كام مجموعه للتمرين","كام سيت في الاسبوع للصدر"]},
{topic:"krest",expect:I("krest")+"|"+K("rest"),qs:[
  "how long to rest between sets","rest time for strength","is 1 minute rest enough","rest between sets for hypertrophy","ارتاح قد ايه بين المجموعات","راحه كام دقيقه"]},
{topic:"kfreq",expect:I("kfreq")+"|"+K("frequency|split routine"),qs:[
  "how many days a week should i train","how often should i train each muscle","is 3 days a week enough","can i train every day",
  "train chest twice a week?","اتمرن كام يوم في الاسبوع","كل عضله كام مره في الاسبوع"]},
{topic:"kvolume",expect:I("kvolume","ksets","balance")+"|"+K("volume"),qs:["what is training volume","how much volume do i need","am i doing too much volume","الفوليوم يعني ايه"]},
{topic:"ktempo",expect:I("ktempo")+"|"+K("tempo"),qs:["what tempo should i lift at","should i lift slow","what does 3-1-1 mean","fast or slow reps","سرعة العده"]},
{topic:"kwarm",expect:I("kwarm","warmplan")+"|"+K("warm"),qs:["how should i warm up","do i need to warm up","how many warm up sets","warm up before squats","ازاي اسخن","الاحماء ضروري؟"]},
{topic:"kdur",expect:I("kdur")+"|"+K("duration"),qs:["how long should my workout be","is a 2 hour workout too long","how long should i be in the gym","التمرين ياخد قد ايه"]},
{topic:"k1rm",expect:I("k1rm","strong")+"|"+K("one rm|1rm"),qs:["how is 1rm calculated","what is a one rep max","estimate my max","يعني ايه 1rm"]},
{topic:"overload",expect:K("overload|gas|said|principle|progress","overload"),qs:[
  "what is progressive overload","how do i keep progressing","how to make muscles grow over time","why do i need to add weight",
  "يعني ايه progressive overload","ازاي افضل اتقدم"]},
{topic:"failure",expect:K("failure|rir|rpe|intensity","failure"),qs:[
  "should i train to failure","is going to failure bad","what is rpe","what does rir mean","how hard should my sets be","العب لحد الفشل؟","يعني ايه RPE"]},
{topic:"deload",expect:K("deload|recovery|overtrain|gas","deload"),qs:["what is a deload","when should i deload","do i need a deload week","يعني ايه ديلود"]},
{topic:"overtraining",expect:K("overtrain|recovery|gas|exhaustion","overtraining"),qs:["am i overtraining","signs of overtraining","can you train too much","اوفر ترينينج"]},
{topic:"splits",expect:I("balance","kfreq")+"|"+K("split routine|split","splits"),qs:[
  "push pull legs or upper lower","what is the best split","full body vs split","is bro split bad","which split for beginners","احسن تقسيمه ايه"]},
{topic:"order",expect:K("order|sequence","order"),qs:["which exercise first","should i do compound or isolation first","order of exercises","ابدا بانهي تمرين"]},
{topic:"supersets",expect:K("superset|drop set|giant set|pyramid|rest pause|circuit|complex","systems"),qs:[
  "what is a superset","are drop sets good","what is a pyramid set","rest pause sets","what is circuit training","يعني ايه سوبر سيت","دروب سيت"]},
{topic:"cardio-lifting",expect:K("cardio|concurrent|interference|zone","cardio-lifting"),qs:[
  "cardio before or after weights","will cardio kill my gains","how much cardio when bulking","cardio on rest days","كارديو قبل ولا بعد الحديد","الكارديو بيهد العضل؟"]},
{topic:"hiit",expect:K("interval|hiit|zone","hiit"),qs:["is hiit better than steady cardio","what is hiit","hiit for fat loss","هييت ولا مشي"]},
{topic:"fatburnzone",expect:K("fat burning|zone|fuel","fatburnzone"),qs:["is the fat burning zone real","what heart rate burns fat","low intensity cardio burns more fat?","زون حرق الدهون"]},
{topic:"cardio-zones",expect:K("zone|heart rate|cardio","cardio-zones"),qs:["what are heart rate zones","zone 2 training","how hard should cardio be","ايه هي الزونز"]},
{topic:"stretching",expect:K("flexib|stretch","stretching"),qs:[
  "should i stretch before lifting","static or dynamic stretching","does stretching prevent injury","how long to hold a stretch","stretch after workout?","الاطاله قبل التمرين ولا بعده"]},
{topic:"posture",expect:K("posture|distortion|imbalance|crossed|pronation","posture"),qs:["how to fix rounded shoulders","anterior pelvic tilt fix","bad posture from sitting","my knees cave in when i squat","كتافي مدوره"]},
{topic:"core",expect:K("core","core"),qs:["best core exercises","how to get abs","do crunches burn belly fat","how often to train abs","تمارين بطن","ازاي يبان السكس باك"]},
{topic:"balance-train",expect:K("balance","balance"),qs:["why train balance","balance exercises","single leg training benefits"]},
{topic:"plyo",expect:K("plyo|jump|power","plyo"),qs:["what is plyometric training","box jumps safe?","how to jump higher","بلايومتريك"]},
{topic:"speed",expect:K("speed|agility|saq","speed"),qs:["how to get faster","agility drills","sprint training","ازاي ابقى اسرع"]},
{topic:"breathing",expect:K("breath","breathing"),qs:["how should i breathe when lifting","hold breath on squats","exhale on the way up?","اتنفس ازاي وانا بلعب"]},
{topic:"spotting",expect:K("spot","spotting"),qs:["how to spot someone on bench","do i need a spotter","سبوتر"]},
{topic:"beginner",expect:K("beginner|stabiliz|phase|novice|untrained","beginner"),qs:[
  "i'm a beginner where do i start","first time in the gym","how should a beginner train","newbie gains real?","انا مبتدئ ابدا ازاي","اول مره ادخل جيم"]},
{topic:"results-time",expect:K("adaptation|weeks|hypertrophy|neural|strength","results-time"),qs:["how long to see results","when will i see muscle","how fast can i build muscle","هشوف نتيجه امتي"]},
{topic:"home",expect:K("home|bodyweight|convenience","home"),qs:["can i build muscle at home","workout without equipment","no gym what do i do","اتمرن في البيت"]},
{topic:"muscle-specific",expect:"^(exsuggest|weights|balance|know|faq):",qs:[
  "best exercises for chest","how to grow my biceps","exercises for a bigger back","how to get bigger legs","best glute exercises","shoulder exercises",
  "تمارين صدر","تمارين ضهر","ازاي اكبر الباي","تمارين رجل"]},
/* ============================================================ nutrition (rules + the book) */
{topic:"fatloss",expect:I("goal","calories","weight")+"|"+K("fat loss|weight management|energy balance|deficit","fatloss|fatloss-how|bellyfat"),qs:[
  "how do i lose belly fat","best way to lose fat","how fast should i lose weight","how big a deficit","can i spot reduce fat",
  "ازاي اخس بسرعه","ازاي اخسس الكرش","انزل كام كيلو في الاسبوع","a5es ezay"]},
{topic:"musclegain",expect:I("goal","calories","protein")+"|"+K("muscle gain|hypertrophy|surplus","musclegain|gain-how|recomp"),qs:[
  "how do i gain muscle","how much surplus to bulk","clean bulk vs dirty bulk","how fast should i gain weight","i'm skinny how to gain","ازاي ازود وزني","انا رفيع عايز اتخن"]},
{topic:"recomp",expect:K("recomp|fat loss|muscle gain|deficit","recomp"),qs:["can i lose fat and gain muscle at the same time","body recomposition","انشف واضخم في نفس الوقت"]},
{topic:"carbs",expect:K("carbohydrate","carbs"),qs:["are carbs bad","how many carbs should i eat","low carb for fat loss","do carbs make you fat","الكارب وحش؟","اكل كام كارب"]},
{topic:"fats",expect:K("lipid|fat","fats"),qs:["how much fat should i eat","is saturated fat bad","good fats vs bad fats","what is omega 3","الدهون الصحيه"]},
{topic:"sugar",expect:K("carbohydrate|sugar|glycemic","sugar"),qs:["is sugar bad","how much sugar is ok","what is glycemic index","السكر وحش للتنشيف؟","كام معلقه سكر في اليوم"]},
{topic:"fibre",expect:K("fibre|fiber","fibre"),qs:["how much fiber do i need","why is fibre important","الالياف ليه مهمه"]},
{topic:"timing",expect:K("timing|per meal|post exercise|pre","timing|pre-workout|post-workout|meals"),qs:[
  "what to eat before workout","post workout meal","how soon after training should i eat","does meal timing matter","how many meals a day",
  "protein per meal","اكل ايه قبل التمرين","بعد التمرين باد ايه"]},
{topic:"fasting",expect:K("fast|timing|ramadan","fasting"),qs:["is intermittent fasting good","training while fasting","how to train in ramadan","صيام متقطع","اتمرن في رمضان ازاي"]},
{topic:"micros",expect:K("micronutrient|vitamin|mineral","micros"),qs:["do i need vitamins","what does iron do","why is calcium important","vitamin d sun","الحديد مهم ليه"]},
{topic:"metabolism",expect:K("metabolism|adaptive|tdee|rmr","metabolism"),qs:["is my metabolism slow","does dieting slow metabolism","what is tdee","what is bmr","الميتابوليزم بطيء"]},
{topic:"alcohol",expect:K("alcohol","alcohol"),qs:["is alcohol bad for gains","how many calories in alcohol","does beer ruin progress"]},
{topic:"cheat",expect:K("cheat|refeed|adherence|flexible","cheat"),qs:["can i have a cheat meal","cheat day ok?","refeed day","ينفع اعمل تشيت ميل"]},
{topic:"labels",expect:K("food labels","labels"),qs:["how to read a food label","what does serving size mean","ازاي اقرا الليبل"]},
{topic:"foodinfo",expect:I("foodinfo","swap"),qs:[
  "calories in an egg","protein in chicken breast","how much protein in foul","calories in koshari","is taameya healthy","macros of rice",
  "كام سعر في البيضه","البروتين في الفول","سعرات الكشري"]},
/* ===================================================================== sleep, stress, habit */
{topic:"sleep",expect:K("sleep","sleep"),qs:[
  "how many hours should i sleep","does sleep affect muscle growth","bad sleep and fat loss","tips to sleep better","is napping good",
  "انام كام ساعه","النوم مهم للعضل؟","menamtesh kowayes"]},
{topic:"stress",expect:K("stress|mood|cortisol","stress"),qs:["does stress affect fat loss","exercise for stress","cortisol and belly fat","التوتر بيأثر على التخسيس؟"]},
{topic:"motivation",expect:K("barrier|motivation|adherence|habit|goal","motivation|no-time"),qs:[
  "i have no motivation","how to stay consistent","i keep quitting the gym","how do i build a habit","i'm lazy to go","مفيش عندي حافز","ازاي استمر"]},
{topic:"time-barrier",expect:I("missed")+"|"+K("time|barrier","time-barrier|no-time"),qs:["i'm too busy to train","how to train with little time","workout for busy people"]},
/* ============================================================================ the app itself */
{topic:"app",expect:"^(faq:app-|app:|twice:|warmplan:|loadlog:|help:|strong:|kwarm:|exadd:|goal:|foodlog:|weight:|weighlog:)",qs:[
  "where do i change my program","how do i add an exercise to my plan","how do i log a set","how do i change the weight unit to lbs",
  "where are my records","how do i log food","how do i scan a barcode","where is my meal plan","how to log my weight",
  "how do i track a run","how do i switch to arabic","how do i turn on the smart coach","how do i back up my data","how do i share my program",
  "how do i delete a workout","how do i start a workout","where are my progress photos","how do i change my rest timer","how do i reorder exercises",
  "how do i add a custom exercise","how to change my goal","how do i add a meal","where is the warm-up","how do i turn off the warm-up",
  "how do i log an inbody","how do i see my history","how do i add another profile","is my data private","does the app work offline",
  "ازاي اغير البرنامج","ازاي اسجل اكل","ازاي اغير اللغه","فين الريكوردات بتاعتي","ازاي اسجل جري","ازاي اعمل باك اب",
  "ezay a3ml backup","fen el history"]},
/* =============================================================== the hard limits and health */
{topic:"scope",expect:SC+"|^(situation|sore):",qs:[
  "my shoulder hurts when i bench","sharp pain in my knee","is my back injury serious","should i take creatine","best pre workout",
  "can i take ibuprofen after training","i have diabetes what should i eat","i'm pregnant can i lift","i think i have a hernia",
  "what dose of vitamin d","fat burner pills","steroids for muscle","ضهري واجعني","ركبتي بتوجعني","اخد كرياتين؟","عندي السكر اكل ايه",
  "عندي ضغط ينفع العب","i feel depressed"]},
{topic:"sugar-not-medical",expect:K("carbohydrate|sugar|glycemic","sugar"),qs:["السكر بيتخن؟","كام سكر في الشاي عادي","السكر الابيض وحش للدايت"]},
{topic:"hello",expect:I("hello","thanks","help"),qs:["hi","hello coach","good morning","thanks!","thank you so much","what can you do","ازيك","شكرا يا كوتش","ahlan"]}
];

export {GROUPS};

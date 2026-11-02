/* Bunyan — the coach's held-out questions (tools/, never shipped)
   Written after the coach was tuned on tools/coachdata/questions.mjs, in other words,
   and never tuned on: the honest measure of how it does on a question it has not seen.
   When a miss here is fixed, the question moves to questions.mjs and a new one is
   written in its place, so this set stays unseen. Same patterns as questions.mjs. */
var I=function(){return "^("+[].slice.call(arguments).join("|")+"):";};
var K=function(re,faq){return "^(know:[^ ]* .*("+re+")|faq:("+(faq||re)+"))";};
var F=function(id){return "^faq:("+id+")";};
var SC="^scope:";

var GROUPS=[
{topic:"today",expect:I("today"),qs:["what's the session for today","which workout is it today","today legs or upper?","gym plan for today please","ايه تمرين النهارده","هلعب ايه انهارده"]},
{topic:"tomorrow",expect:I("tomorrow"),qs:["and tomorrow?","what am i doing tomorrow at the gym","تمرين بكره ايه","bokra eh el tamreen"]},
{topic:"weights",expect:I("weights","plateau","strong"),qs:["what weight should i squat next time","should i add 2.5 kg to my bench","is it time to go up in weight","اعلي الوزن ولا لسه","الوزن الجاي في السكوات كام"]},
{topic:"plateau",expect:I("plateau","weights"),qs:["i can't get past 80 on bench","my squat has been stuck for a month","overhead press not improving","السكوات ثابت مش بيزيد"]},
{topic:"progress",expect:I("track","week","weight","strong","last"),qs:["am i making progress","how's my progress looking","show me how i'm doing","انا اتحسنت؟","ana et7assant?"]},
{topic:"weight",expect:I("weight","track")+"|"+F("weigh-fluct"),qs:["why isn't the scale moving","is my weight trend good","my weight went up 2 kg in a day","وزني بيزيد ليه","الوزن ثابت من اسبوعين"]},
{topic:"protein",expect:I("protein")+"|"+F("protein-safety|protein-quality|meals"),qs:["grams of protein for me","is 150g protein enough","how much protein for my weight","البروتين المناسب ليا كام"]},
{topic:"calories",expect:I("calories")+"|"+F("metabolism|app-targets"),qs:["why is my calorie goal 2500","how many kcal should i have","what's my daily calorie need","سعراتي اليوميه كام"]},
{topic:"eat",expect:I("eat","rest")+"|"+F("pre-workout|post-workout"),qs:["what can i eat right now","hungry, what should i have","snack idea for now","انا جعان اكل ايه دلوقتي"]},
{topic:"sore",expect:I("sore","situation","lowday","app")+"|"+K("doms|soreness","sleep"),qs:["my chest is still sore from monday","doms is killing me","super tired, should i still train","جسمي مكسر من التمرين"]},
{topic:"reps",expect:I("kreps")+"|"+K("rep|hypertrophy|strength|adaptation"),qs:["what rep range builds muscle","5 reps or 10 reps","best number of reps for size","كام عده احسن للعضل"]},
{topic:"rest",expect:I("krest")+"|"+K("rest"),qs:["how long between sets","rest 2 or 3 minutes?","how much rest for heavy squats","ارتاح كام دقيقه بين السيتات"]},
{topic:"freq",expect:I("kfreq","balance")+"|"+K("frequency|split routine","splits|overtraining"),qs:["how many gym days a week","is training 6 days too much","hit each muscle how often","اتمرن كام مره في الاسبوع"]},
{topic:"failure",expect:K("fail|rir|rpe","failure"),qs:["do i have to fail on every set","what is reps in reserve","is rpe 10 failure","اوصل للفشل في كل سيت؟"]},
{topic:"deload",expect:K("deload|recovery|gas","deload|overtraining"),qs:["i feel beat up, deload?","what's a deload week for","how often should i take a lighter week","امتى اخد اسبوع خفيف"]},
{topic:"overload",expect:I("weights")+"|"+K("overload|gas|principle","overload"),qs:["how do i progress if i can't add weight","what does overload mean","how do i keep gaining strength long term","ازاي اتقدم من غير ما ازود وزن"]},
{topic:"splits",expect:I("balance","kfreq","plan")+"|"+K("split","splits"),qs:["upper lower vs full body for 4 days","is ppl good for beginners","bro split worth it?","تقسيمة 4 ايام احسن حاجه"]},
{topic:"cardio",expect:I("steps")+"|"+K("cardio|zone|interval|fat burning","cardio-lifting|hiit|fatburnzone|cardio-zones|cardio-amount"),qs:["is running bad for muscle","how many cardio sessions a week","incline walking or hiit for fat loss","what is zone 2 cardio","الجري بيهد العضل؟","اعمل كارديو كام مره في الاسبوع"]},
{topic:"stretch",expect:I("kwarm","warmplan")+"|"+K("stretch|flexib|warm","stretching"),qs:["is stretching before the gym bad","should i stretch on rest days","static stretch before squats?","الاطاله الثابته قبل الحديد غلط؟"]},
{topic:"posture",expect:K("posture|imbalance","posture"),qs:["how to fix hunched shoulders","lower back arch when standing","knees going inward on squats","ضهري محني لقدام"]},
{topic:"abs",expect:K("core","core|bellyfat"),qs:["how to get a flat stomach","are sit ups enough for abs","core exercises for beginners","تمارين بطن للمبتدئين"]},
{topic:"fatloss",expect:I("goal","calories","weight")+"|"+K("fat loss|deficit","fatloss-how|bellyfat|metabolism"),qs:["how do i drop body fat","fastest safe way to lose fat","how many calories below maintenance","ازاي انزل دهون بسرعه بس صح","عايز انشف ازاي"]},
{topic:"gain",expect:I("goal","calories")+"|"+K("muscle gain|surplus","gain-how|recomp"),qs:["how many extra calories to bulk","i can't gain weight no matter what","lean bulk tips","مش عارف اتخن مهما اكلت"]},
{topic:"carbs",expect:K("carbohydrate","carbs|sugar"),qs:["is bread bad for losing weight","should i stop eating rice","carbs before bed bad?","العيش بيتخن؟","اقلل الرز؟"]},
{topic:"fats",expect:K("lipid","fats|eggs"),qs:["is butter bad","how many grams of fat per day","is ghee healthy","السمنه وحشه؟"]},
{topic:"sugar",expect:K("carbohydrate|sugar","sugar"),qs:["are sweets ruining my diet","honey vs sugar","is sugar worse than fat","الحلويات بتبوظ الدايت؟"]},
{topic:"timing",expect:K("timing|per meal","pre-workout|post-workout|meals|fasting"),qs:["is it bad to train hungry","do i need protein right after the gym","how many meals should i split my food into","اكل قبل التمرين بقد ايه","التمرين على الريق"]},
{topic:"fasting",expect:K("fast","fasting"),qs:["does fasting burn more fat","can i lift in ramadan before iftar","is 16/8 fasting good for muscle","الصيام بيحرق دهون اكتر؟"]},
{topic:"micros",expect:K("micronutrient|mineral|vitamin","micros"),qs:["foods rich in iron","what is calcium good for","what's b12 for","اكل فيه كالسيوم"]},
{topic:"sleep",expect:K("sleep","sleep"),qs:["is 6 hours of sleep enough","does lack of sleep stop fat loss","sleep and muscle recovery","النوم قليل بيأثر على العضل؟"]},
{topic:"motivation",expect:K("barrier|goal|adherence","motivation|no-time"),qs:["i always give up after 2 weeks","how do people stay consistent with the gym","i lost my motivation","زهقت من الجيم"]},
{topic:"food-facts",expect:I("foodinfo","swap"),qs:["calories in a banana","how much protein in tuna","macros of oats","سعرات الموز","البروتين في التونه"]},
{topic:"app",expect:"^(faq:app-|app:|help:|strong:|kwarm:|exadd:|goal:|foodlog:|weight:|weighlog:|twice:)",qs:[
  "how do i edit my workout days","where do i see old workouts","can i change kg to pounds","how to put the app in arabic","where's the backup option",
  "how do i scan food","where do i log water","how do i turn the warm up off","can i use this offline","where do i find the smart coach",
  "how do i record a walk with gps","where is my meal plan stored","ازاي اغير الوحده كيلو","فين اعدادات التمرين","ازاي اسجل الاكل بالباركود"]},
{topic:"scope",expect:SC+"|^(situation|sore):",qs:["my elbow hurts on curls","what painkiller after leg day","is creatine safe","should i take whey and creatine","i have high blood pressure can i lift","وجع في كتفي","اخد مسكن بعد التمرين؟"]},
{topic:"not-scope",expect:"^(?!scope:)",qs:["is sugar bad for my diet","are eggs bad for cholesterol","do i need vitamins from food","pre workout meal ideas","السكر في الشاي بيتخن","التوتر بيمنع التخسيس؟"]},
{topic:"chat",expect:I("hello","thanks","help"),qs:["hey","hello there","thanks a lot","what can you help me with","مرحبا","متشكر"]}
];

export {GROUPS};

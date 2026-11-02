/* Bunyan — held-out questions, round 2 (tools/, never shipped)
   Written after round 2 of tuning and run once, untouched, for the round's honest score
   (heldout.mjs had become a tuning set by then: its misses had been fixed). */
var I=function(){return "^("+[].slice.call(arguments).join("|")+"):";};
var K=function(re,faq){return "^(know:[^ ]* .*("+re+")|faq:("+(faq||re)+"))";};
var F=function(id){return "^faq:("+id+")";};
var SC="^scope:";

var GROUPS=[
{topic:"today",expect:I("today"),qs:["what's planned for me today","workout of the day?","is it push day today","المفروض اتمرن ايه النهارده","تمرين انهارده"]},
{topic:"tomorrow",expect:I("tomorrow"),qs:["what's planned for tomorrow","tomorrow's session please","بكرة هلعب ايه"]},
{topic:"weights",expect:I("weights","plateau","strong"),qs:["how heavy should my rows be","should i go up on squats next session","what dumbbells should i use for press","الدمبل كام كيلو المفروض"]},
{topic:"plateau",expect:I("plateau","weights")+"|"+F("overload|deload"),qs:["bench stuck at 70 for weeks","i'm not getting stronger on squats","deadlift going nowhere","الديدلفت مش بيتحرك"]},
{topic:"progress",expect:I("track","week","weight","strong","last"),qs:["how am i progressing overall","give me my weekly recap","did i improve this month","انا ماشي كويس؟"]},
{topic:"weight",expect:I("weight","track")+"|"+F("weigh-fluct"),qs:["my weight isn't dropping","am i losing weight","why do i weigh more this morning","الميزان مش بينزل ليه"]},
{topic:"protein",expect:I("protein")+"|"+F("protein-safety|protein-quality|meals"),qs:["protein grams per day for me","am i hitting my protein","is 200g of protein too much","البروتين بتاعي كام"]},
{topic:"eat",expect:I("eat","rest")+"|"+F("pre-workout|post-workout|meals"),qs:["what's a good meal right now","what should i eat tonight","dinner idea","اتعشى ايه"]},
{topic:"reps-sets",expect:I("kreps","ksets","kvolume")+"|"+K("rep|set|volume|hypertrophy|strength"),qs:["how many reps for strength gains","sets per week for back","is 4 sets of 8 good","how many total sets per workout","كام عده للقوه","كام سيت للضهر في الاسبوع"]},
{topic:"rest",expect:I("krest")+"|"+K("rest"),qs:["rest time for strength training","is 30 seconds rest enough","ارتاح قد ايه بين المجموعات التقيله"]},
{topic:"failure-rpe",expect:K("fail|rir|rpe","failure"),qs:["is training to failure bad for growth","what does rpe 7 mean","how many reps in reserve should i leave","لازم السيت يبقى للاخر"]},
{topic:"deload",expect:K("deload|recovery|gas","deload|overtraining"),qs:["should i take a week off training","i think i need a deload","my body feels beat up all the time","محتاج اسبوع راحه"]},
{topic:"splits",expect:I("balance","kfreq","plan")+"|"+K("split","splits"),qs:["best split for 3 days a week","is full body better than ppl","upper lower good for beginners","احسن تقسيمه لـ 5 ايام"]},
{topic:"cardio",expect:I("steps")+"|"+K("cardio|zone|interval|fat burning","cardio-lifting|hiit|fatburnzone|cardio-zones|cardio-amount"),qs:["does cardio kill muscle","how much walking per week","is hiit better for fat loss than walking","what heart rate is zone 2","المشي ولا الجري للتخسيس","الكارديو بعد الحديد ولا قبله"]},
{topic:"stretch-warm",expect:I("kwarm","warmplan")+"|"+K("stretch|flexib|warm","stretching"),qs:["do i need to stretch after lifting","how should i warm up for deadlifts","is stretching before running good","الاطاله بعد التمرين مهمه"]},
{topic:"posture-core",expect:K("posture|imbalance|core","posture|core|bellyfat"),qs:["fix rounded shoulders","best ab exercises","will planks give me abs","ازاي اعدل ضهري","تمارين بطن تنشف الكرش"]},
{topic:"fatloss",expect:I("goal","calories","weight")+"|"+K("fat loss|deficit","fatloss-how|bellyfat|metabolism|recomp"),qs:["how do i lose fat without losing muscle","what's a safe deficit","how many kg per week should i lose","ازاي اخس من غير ما العضل يقل"]},
{topic:"gain",expect:I("goal","calories")+"|"+K("muscle gain|surplus","gain-how|recomp"),qs:["how do i put on muscle","how much should i eat to bulk","i'm too skinny what do i do","ازاي اكبر عضلي"]},
{topic:"carbs-fats-sugar",expect:K("carbohydrate|lipid|sugar","carbs|fats|sugar|eggs|fibre"),qs:["are carbs at night bad","is white rice ok on a cut","is olive oil fattening","how bad is sugar","are eggs healthy","العيش الابيض وحش؟","الزيت بيتخن؟","الحلويات مضره؟"]},
{topic:"timing-fasting",expect:K("timing|per meal|fast","pre-workout|post-workout|meals|fasting"),qs:["should i eat right after training","pre gym snack","can i train fasted","is intermittent fasting good for muscle","اكل ايه قبل الجيم بساعه","التمرين في رمضان قبل الفطار"]},
{topic:"micros-hydration",expect:I("water")+"|"+K("micronutrient|mineral|hydration","micros|hydration-training"),qs:["what foods have iron","is milk good for calcium","how much water during a workout","اكل فيه حديد كتير"]},
{topic:"sleep-stress",expect:K("sleep|stress|mood","sleep|stress"),qs:["how much sleep do i need to grow","bad sleep ruining my diet","does stress make you fat","قلة النوم بتتخن؟"]},
{topic:"motivation",expect:K("barrier|goal|adherence","motivation|no-time"),qs:["i can't stay consistent","how do i get back to the gym after a break","no motivation lately","مش قادر استمر في الجيم"]},
{topic:"food-facts",expect:I("foodinfo","swap"),qs:["calories in rice","protein in eggs","how many calories in foul","سعرات البيض"]},
{topic:"app",expect:"^(faq:app-|app:|help:|strong:|kwarm:|exadd:|goal:|foodlog:|weight:|weighlog:|twice:)",qs:[
  "how do i change the exercises in my program","where is my workout history","how to switch the app to english","how do i make a backup","how do i log my steps",
  "how do i turn off the rest timer sound","where can i see my body measurements","can i track a bike ride","where do i set my equipment","how do i share my plan with a friend",
  "ازاي اسجل الخطوات","فين النسخه الاحتياطيه","ازاي اقفل الاحماء","فين صور التقدم"]},
{topic:"scope",expect:SC+"|^(situation|sore):",qs:["my knee clicks and hurts","should i take pre workout","how much creatine per day","i have diabetes can i do keto","وجع في ضهري من الديدلفت","اخد فيتامينات ايه"]},
{topic:"not-scope",expect:"^(?!scope:)",qs:["is sugar ok after the gym","are egg yolks bad for cholesterol","stress and fat loss","السكر بعد التمرين","البيض بيرفع الكوليسترول؟"]},
{topic:"chat",expect:I("hello","thanks","help"),qs:["hi coach","thank you!","what do you do","اهلا يا كوتش","شكرا جزيلا"]}
];

export {GROUPS};

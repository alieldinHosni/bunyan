import {changeOf, gloss, normalize, numbersIn, retell, timeOf, understand} from "../understand.js";

/* Reading the sentence (docs/COACH-AGENT.md 2.3): the kind, the topic, what is named,
   negation, corrections and follow-ups, in English, Egyptian Arabic (with the spellings
   phones type, Arabic-Indic digits and the dual) and Franco-Arabic. A fake person: a
   program with a Hack Squat in it, a log with a Barbell Squat, and a small library. */
var PROGRAM=["Barbell Bench Press - Medium Grip","Hack Squat","Wide-Grip Lat Pulldown","Leg Press","Romanian Deadlift","Plank"];
var LOG=["Barbell Bench Press - Medium Grip","Barbell Squat","Pullups"];
var LIB={"squat":"Barbell Squat","deadlift":"Barbell Deadlift","dumbbell bench press":"Dumbbell Bench Press","lunge":"Dumbbell Lunges","burpee":"Burpee",
  "push up":"Pushups","lat pulldown":"Wide-Grip Lat Pulldown","leg press":"Leg Press","bench press":"Barbell Bench Press - Medium Grip","pull up":"Pullups",
  "shoulder press":"Dumbbell Shoulder Press","bicep curl":"Dumbbell Bicep Curl","plank":"Plank","hip thrust":"Barbell Hip Thrust","row":"Seated Cable Rows"};
function ctx(prev){var c={program:PROGRAM,log:LOG,mine:PROGRAM.concat(LOG),lib:function(k){return LIB[k]||"";}};if(prev)c.prev=understand(prev,c);return c;}

/* [message, kind, topic, mode] */
var KINDS=[
  /* requests */
  ["swap bench for dumbbell press today","request","exswap",""],["بدل البنش بدمبل بريس النهارده","request","exswap",""],
  ["replace the squat with leg press","request","exswap",""],["استبدل العقلة بسحب عالي في البرنامج","request","exswap",""],
  ["add push ups to my program","request","exadd",""],["ضيف ضغط لبرنامجي","request","exadd",""],
  ["remove the plank","request","exremove",""],["شيل البلانك من برنامجي","request","exremove",""],
  ["I don't like lunges","request","avoid",""],["مش بحب اللانجز","request","avoid",""],["never give me burpees","request","avoid",""],["متدينيش بيربي تاني ابدا","request","avoid",""],
  ["I only have 30 minutes today","request","fit","time"],["معايا ٣٠ دقيقة بس النهارده","request","fit","time"],["نص ساعة ودمبلز بس","request","fit","both"],
  ["only dumbbells today","request","fit","kit"],["معايا دمبلز بس النهارده","request","fit","kit"],["I've got 45 minutes and only dumbbells","request","fit","both"],
  ["make my program 4 days","request","days",""],["خلي برنامجي ٤ ايام","request","days",""],["I can only train Monday, Wednesday and Friday","request","days",""],
  ["انا اقدر اتمرن السبت والاتنين والاربع بس","request","days",""],
  ["travelling next week, no gym","request","away",""],["مسافر الاسبوع الجاي ومفيش جيم","request","away",""],["I don't have a gym this week","request","away",""],["مفيش جيم الاسبوع ده","request","away",""],
  ["move my leg day to Thursday","request","move",""],["انقل يوم الرجل للخميس","request","move",""],
  ["log 80 kg for 8 reps on bench","request","logset",""],["سجل ٨٠ كيلو ٨ عدات بنش","request","logset",""],["log a set","request","logset",""],["سجل مجموعة","request","logset",""],
  ["change my goal to fat loss","request","goal","lose"],["غير هدفي لحرق الدهون","request","goal","lose"],
  /* the person's own data */
  ["what's my best squat?","own-data","record","best"],["ايه احسن سكوات عملته؟","own-data","record","best"],["what's my max bench?","own-data","record","best"],
  ["اقصى بنش عندي كام؟","own-data","record","best"],["what's my squat 1RM?","own-data","record","best"],["الماكس بتاع السكوات كام؟","own-data","record","best"],
  ["how much did I squat last time?","own-data","record","last"],["شلت كام في السكوات اخر مرة؟","own-data","record","last"],
  ["how was my bench this week?","own-data","record","trend"],["البنش بتاعي كان عامل ازاي الاسبوع ده؟","own-data","record","trend"],
  ["my bench went down this week","own-data","record","down"],["البنش نزل الاسبوع ده","own-data","record","down"],
  ["how has my pull up progressed this month?","own-data","record","trend"],["العقلة اتطورت ازاي الشهر ده؟","own-data","record","trend"],
  ["what did I eat yesterday?","own-data","foodday",""],["اكلت ايه امبارح؟","own-data","foodday",""],["what did I eat today?","own-data","eat",""],
  ["how much protein have I had today?","own-data","eat","protein"],["اكلت كام بروتين النهارده؟","own-data","eat","protein"],
  ["what did I do last Monday?","own-data","day",""],["عملت ايه يوم الاتنين اللي فات؟","own-data","day",""],["what did I train yesterday?","own-data","day",""],
  ["how many sets of chest did I do this week?","own-data","volume",""],["عملت كام مجموعة صدر الاسبوع ده؟","own-data","volume",""],
  ["how many workouts did I do this week?","own-data","week","count"],["الاسبوع كان عامل ازاي؟","own-data","week",""],
  ["how much do I weigh?","own-data","weight",""],["وزني كام؟","own-data","weight",""],["what's my weight trend?","own-data","weight",""],
  ["what should I do today?","own-data","today",""],["اعمل ايه النهارده؟","own-data","today",""],["what do I train tomorrow?","own-data","tomorrow",""],
  ["what are my heart rate zones?","own-data","zones",""],["ايه مناطق نبض القلب بتاعتي","own-data","zones",""],
  /* knowledge */
  ["how do I do a deadlift correctly?","knowledge","technique",""],["ازاي اعمل ديدلفت صح؟","knowledge","technique",""],["proper form for hip thrust","knowledge","technique",""],
  ["explain why you increased my weight","knowledge","why",""],["can I train back two days in a row?","knowledge","kfreq",""],["ينفع امرن رجل يومين ورا بعض؟","knowledge","kfreq",""],["ليه زودتلي الوزن؟","knowledge","why",""],
  /* statements */
  ["I missed two workouts this week","statement","missed","week"],["فوت تمرينين الاسبوع ده","statement","missed","week"],
  ["I only slept four hours","statement","lowday","sleep"],["I feel tired all the time","statement","tired","always"],["انا تعبان على طول","statement","tired","always"],
  ["I want to lose 5 kg in a month","knowledge","rate",""],["عايز اخس ٥ كيلو في شهر","knowledge","rate",""],["I can't stand burpees","request","avoid",""],["got 25 minutes, what can I do?","request","fit","time"],
  ["why did my weight go up on bench?","knowledge","why",""],["what did I eat two days ago?","own-data","foodday",""],["نمت ٤ ساعات بس","statement","lowday","sleep"],["I'm sore","statement","sore",""],["مفطرتش","statement","eat",""],
  /* out of scope */
  ["what's the weather today?","out-of-scope","unknown","weather"],["الجو عامل ايه النهارده؟","out-of-scope","unknown","weather"],["who are you?","out-of-scope","unknown","who"],
  ["انت مين؟","out-of-scope","unknown","who"],["remind me to weigh in","out-of-scope","unknown","remind"],["فكرني اوزن نفسي","out-of-scope","unknown","remind"],
  ["اخد سترويدز؟","out-of-scope","scope","medical"],["حاسس اني مكتئب","out-of-scope","scope","mental"],["ايه احسن بري وركاوت؟","out-of-scope","scope","supplement"],
  /* Franco-Arabic: read as Arabic */
  ["a7san squat 3amalto","own-data","record","best"],["akalt eh embare7?","own-data","foodday",""],["badel el bench b dumbbell press","request","exswap",""],
  ["wazny kam?","own-data","weight",""],["e3mel eh enaharda?","own-data","today",""],
  /* typos */
  ["waht's my best sqaut?","own-data","record","best"],["what did i eat yesturday","own-data","foodday",""],["how was my benhc this week","own-data","record","trend"]];

/* [message, entity check] */
function ex0(r){var e=r.entities.exercise[0];return e?e.name:"";}
var ENT=[
  ["what's my best squat?",function(r){return ex0(r)==="Barbell Squat";},"a question about the squat is the one logged, not the program's Hack Squat"],
  ["ايه احسن سكوات عملته؟",function(r){return ex0(r)==="Barbell Squat";},"«سكوات» is the person's own squat, not Hack Squat"],
  ["swap squat for leg press",function(r){return ex0(r)==="Hack Squat"&&r.entities.exercise[1].name==="Leg Press";},"a swap names the program's own squat"],
  ["بدل السكوات بليج بريس",function(r){return ex0(r)==="Hack Squat"&&r.entities.exercise[1].name==="Leg Press";},"Arabic swap: the program's squat for leg press"],
  ["how do I do a deadlift?",function(r){return ex0(r)==="Barbell Deadlift";},"a plain deadlift, not the program's Romanian one"],
  ["what's my best romanian deadlift?",function(r){return ex0(r)==="Romanian Deadlift";},"the variant when it is said"],
  ["العقلة اتطورت ازاي",function(r){return ex0(r)==="Pullups";},"«العقلة» with the article is pull-ups"],
  ["how many pull ups did I do",function(r){return ex0(r)==="Pullups";},"pull ups run together in the log's name"],
  ["بدل البنش بدمبل بريس",function(r){return r.entities.exercise.length===2&&r.entities.exercise[1].name==="Dumbbell Bench Press";},"«بدمبل بريس»: the preposition written onto the name"],
  ["leg press day",function(r){return r.entities.muscle.length===0&&ex0(r)==="Leg Press";},"leg press is an exercise, not legs"],
  ["dumbbell press today",function(r){return r.entities.equipment.indexOf("Dumbbell")<0;},"dumbbell press names an exercise, not today's kit"],
  ["معايا ٣٠ دقيقة",function(r){return r.entities.minutes===30;},"Arabic-Indic digits"],["نص ساعة",function(r){return r.entities.minutes===30;},"half an hour"],
  ["I have an hour",function(r){return r.entities.minutes===60;},"an hour"],["ساعتين",function(r){return r.entities.minutes===120;},"the dual: two hours"],
  ["half an hour",function(r){return r.entities.minutes===30;},"half an hour in English"],["معايا ربع ساعة",function(r){return r.entities.minutes===15;},"a quarter of an hour"],
  ["ساعة ونص",function(r){return r.entities.minutes===90;},"an hour and a half"],["what did I eat two days ago",function(r){return r.entities.day.when==="ago"&&r.entities.day.n===2;},"two days ago"],
  ["اكلت بيضتين",function(r){return /(^| )2 بيض( |$)/.test(r.norm);},"the dual: two eggs"],
  ["log 80 kg for 8 reps",function(r){return JSON.stringify(r.entities.numbers)===JSON.stringify([{n:80,unit:"kg"},{n:8,unit:"reps"}]);},"numbers with units"],
  ["سجل ٢٠٠ جرام فراخ",function(r){return r.entities.numbers[0].n===200&&r.entities.numbers[0].unit==="g";},"grams in Arabic"],
  ["three sets of ten",function(r){return r.entities.numbers[0].n===3&&r.entities.numbers[0].unit==="sets";},"number words"],
  ["تلات مجموعات",function(r){return r.entities.numbers[0].n===3;},"Arabic number words"],
  ["what did I eat yesterday",function(r){return r.entities.day.when==="yesterday";},"yesterday"],["اكلت ايه امبارح",function(r){return r.entities.day.when==="yesterday";},"امبارح"],
  ["what did I do last Monday",function(r){return r.entities.day.when==="weekday"&&r.entities.day.n===1&&r.entities.day.last;},"last Monday"],
  ["عملت ايه يوم الاتنين اللي فات",function(r){return r.entities.day.n===1&&r.entities.day.last;},"الاتنين اللي فات"],
  ["move it to friday",function(r){return r.entities.day.n===5;},"Friday"],["انقله للجمعة",function(r){return r.entities.day.n===5;},"للجمعة"],
  ["how was this week",function(r){return r.entities.period==="week";},"this week"],["الاسبوع اللي فات",function(r){return r.entities.period==="lastweek";},"last week in Arabic"],
  ["this month",function(r){return r.entities.period==="month";},"this month"],["اخر مرة",function(r){return r.entities.period==="last";},"last time in Arabic"],
  ["travelling next week",function(r){return r.entities.period==="nextweek";},"next week"],["this weekend",function(r){return r.entities.period==="weekend";},"the weekend"],
  ["what should I eat for lunch",function(r){return r.entities.meal==="lunch";},"lunch"],["اكلت ايه في الفطار",function(r){return r.entities.meal==="breakfast";},"الفطار"],
  ["سجل فراخ على العشا",function(r){return r.entities.meal==="dinner";},"العشا"],
  ["how many sets of chest",function(r){return r.entities.muscle[0]==="Chest";},"chest"],["كام مجموعة صدر",function(r){return r.entities.muscle[0]==="Chest";},"صدر"],
  ["and for legs?",function(r){return r.entities.muscle[0]==="Legs";},"legs"],["تمرين ضهر",function(r){return r.entities.muscle[0]==="Back";},"ضهر"],
  ["only dumbbells",function(r){return r.entities.equipment[0]==="Dumbbell";},"dumbbells"],["دمبلز بس",function(r){return r.entities.equipment[0]==="Dumbbell";},"دمبلز"],
  ["hotel gym today",function(r){return r.entities.equipment.indexOf("Hotel")>=0;},"a hotel gym"],["مفيش جيم",function(r){return r.entities.equipment.indexOf("NoGym")>=0;},"no gym in Arabic"],
  ["I can only train Monday, Wednesday and Friday",function(r){return r.entities.weekdays.join()==="1,3,5";},"three weekdays in order"],
  ["السبت والاتنين والاربع",function(r){return r.entities.weekdays.join()==="6,1,3";},"Arabic weekdays with و"]];

var NEGS=[["I don't like lunges",true],["مش بحب اللانجز",true],["never give me burpees",true],["متدينيش بيربي",true],["مبحبش السكوات",true],["مفطرتش",true],
  ["I do not want squats",true],["no more burpees",true],["I like lunges",false],["بحب اللانجز",false],["what's my best squat",false],["ايه احسن بنش",false]];
var SCOPES=[["I feel tired all the time","always"],["انا تعبان على طول","always"],["I've been tired lately","lately"],["تعبان الفترة دي","lately"],["I'm tired today","now"],["تعبان النهارده","now"]];

function run(t){
  KINDS.forEach(function(x){var r=understand(x[0],ctx());t.eq([r.kind,r.topic,r.mode],[x[1],x[2],x[3]],(/[؀-ۿ]/.test(x[0])?"ar ":"en ")+x[2]+": "+x[0]);});
  ENT.forEach(function(x){var r=understand(x[0],ctx());t.ok(x[1](r),x[2]+": "+x[0]);});
  NEGS.forEach(function(x){t.eq(understand(x[0],ctx()).neg,x[1],"negation: "+x[0]);});
  SCOPES.forEach(function(x){t.eq(understand(x[0],ctx()).scope,x[1],"scope: "+x[0]);});
  t.ok(KINDS.length>=90&&ENT.length>=40,"at least 90 readings and 40 entity checks");
  /* Every kind is read in both languages. */
  ["request","own-data","knowledge","statement","out-of-scope"].forEach(function(k){
    t.ok(KINDS.some(function(x){return x[1]===k&&/[؀-ۿ]/.test(x[0]);})&&KINDS.some(function(x){return x[1]===k&&!/[؀-ۿ]/.test(x[0]);}),"both languages: "+k);});
  /* The language: the script, or Franco-Arabic's letters and digits. */
  t.eq([understand("what's my best squat").lang,understand("احسن سكوات").lang,understand("a7san squat 3amalto").lang,understand("e3mel eh enaharda").lang,understand("3x8 at 80kg").lang],["en","ar","ar","ar","en"],"the language of the message");
  t.eq(normalize("ازاى اعمل سكوات؟").f,"ازاي اعمل سكوات","Arabic spelling variants folded");t.eq(normalize("النهاردة").f,"النهارده","ة/ه");
  t.eq(normalize("اسكوات").f,"سكوات","a transliteration's spelling");t.eq(numbersIn("٨٠ كيلو")[0],{n:80,unit:"kg"},"Arabic-Indic digits with a unit");
  t.eq(timeOf("tomorrow").day.when,"tomorrow","tomorrow");t.eq(timeOf("بكره").day.when,"tomorrow","بكره");
  /* Corrections: the previous turn re-read, not a new one. */
  var c1=understand("no, I meant squats",ctx("How much weight should I lift on bench?"));
  t.eq([c1.kind,c1.act,c1.correction.bare,c1.correction.said],["correction","correct",false,"squats"],"a correction with what was meant");
  t.eq(retell("How much weight should I lift on bench?",changeOf("squats",ctx())),"how much weight should i lift on squats","the earlier question with the exercise changed");
  var c2=understand("I meant yesterday, not today",ctx("what did I eat today?"));
  t.eq([c2.kind,c2.correction.said],["correction","yesterday"],"what is negated is the old reading");
  t.eq(retell("what did I eat today?",changeOf(c2.correction.said,ctx())),"what did i eat yesterday","the earlier question with the day changed");
  var c3=understand("قصدي امبارح مش النهارده",ctx("اكلت ايه النهارده؟"));
  t.eq([c3.kind,c3.correction.said],["correction","امبارح"],"Arabic correction with the day");
  t.eq(retell("اكلت ايه النهارده؟",changeOf("امبارح",ctx())),"اكلت ايه امبارح","Arabic: the day changed in place");
  ["you're wrong","wrong answer","that's not what I asked","not that one","انت غلطان","اجابة غلط","مش ده اللي سألته","مش ده"].forEach(function(q){
    var r=understand(q,ctx("what's my best squat?"));t.eq([r.kind,r.topic,r.correction&&r.correction.bare],["correction","correction",true],"a bare correction: "+q);});
  t.eq(understand("you're wrong",ctx()).kind===null||understand("you're wrong",ctx()).kind!=="correction",true,"with nothing before it, not a correction");
  t.ok(understand("no, I meant squats",ctx("what's my best bench?")).correction.prev.topic==="record","the correction carries the reading it corrects");
  /* Follow-ups: the last reading carried on with what changed. */
  var f1=understand("and squats?",ctx("what's my best bench?"));
  t.eq([f1.followup,f1.topic,f1.mode,ex0(f1)],[true,"record","best","Barbell Squat"],"and squats? after best bench");
  var f2=understand("والسكوات؟",ctx("ايه احسن بنش عملته؟"));t.eq([f2.followup,f2.topic,ex0(f2)],[true,"record","Barbell Squat"],"والسكوات؟ after best bench");
  var f3=understand("and for legs?",ctx("how many sets of chest did I do this week?"));t.eq([f3.followup,f3.topic,f3.entities.muscle[0],f3.entities.period],[true,"volume","Legs","week"],"and for legs? keeps the week");
  t.eq(retell("how many sets of chest did I do this week?",changeOf("legs",ctx())),"how many sets of legs did i do this week","the muscle changed in place");
  var f4=understand("make it 60",ctx("log 80 kg for 8 reps"));t.eq([f4.followup,f4.topic],[true,"logset"],"make it 60 after a set");
  t.eq(retell("skip saturday",changeOf("monday",ctx())),"skip monday","a weekday for a weekday");
  t.eq(understand("why isn't my bench going up?",ctx()).topic,"plateau","why a lift is stuck is the plateau answer, not its record");
  t.eq(retell("log 80 kg for 8 reps",changeOf("60",ctx())),"log 60 kg for 8 reps","the number changed in place");
  var f5=understand("what about last week?",ctx("how was my bench this week?"));t.eq([f5.followup,f5.topic,f5.entities.period],[true,"record","lastweek"],"what about last week?");
  t.eq(understand("and add squats to Friday",ctx("what's my best bench?")).followup,false,"a new request of its own is not a follow-up");
  t.eq(understand("and squats?",ctx()).followup,false,"no follow-up with nothing before it");
  t.eq(understand("وزني النهارده ٨٢",ctx("بدل السكوات بليج بريس")).followup,false,"«وزني» is not «و» + something: not a follow-up");
  t.ok(understand("and squats",ctx("the first one")).confidence>=0.5||understand("and squats",ctx("the first one")).topic===null,"\"and squats\" after a request is not asked about");
  /* Unsure: a name and nothing else asks, with the readings as choices. */
  var u=understand("deadlift",ctx());t.ok(u.confidence<0.5&&u.alts.some(function(x){return x.topic==="technique";}),"a bare exercise name is unsure, with technique as an alternative");
  t.ok(understand("what's my best squat?",ctx()).confidence>=0.8,"a clear question is sure");
  /* Arabic training words in English, for the written answers. */
  t.eq(gloss("يعني ايه زياده تدريجيه في الحمل"),"what is progressive overload?","a term glossed");t.eq(gloss("ليه سعراتي 2500"),"","a question word alone is not glossed");
  t.clean(understand("what's my best squat?",ctx()).entities,"no undefined in a reading");
  /* C-4: eating at an event, and the rate asked with its numbers. */
  [["I'm going to a wedding tonight, how do I handle food?","event"],["رايح فرح النهارده بالليل، اعمل ايه في الاكل؟","event"],["party later, what should I eat?","event"],
   ["عندي عزومة بكره اكل ايه","event"],["how fast can I safely lose weight?","rate"]].forEach(function(x){t.eq(understand(x[0],ctx()).topic,x[1],x[0]);});
  t.ok(understand("I ate too much at the party",ctx()).topic!=="event","a party already eaten is not planned for");
  t.eq(understand("I want to lose 5 kg in a month",ctx()).rate,{kg:5,weeks:52/12},"5 kg in a month: the kilos and the weeks");
  t.eq(understand("عايز اخس ١٠ كيلو في شهرين",ctx()).rate,{kg:10,weeks:2*52/12},"the Arabic dual: two months");
  t.eq(understand("lose 3 kg in two weeks",ctx()).rate,{kg:3,weeks:2},"two weeks");
  t.eq(understand("عايز انزل ٧ كيلو في شهر ونص",ctx()).rate,{kg:7,weeks:1.5*52/12},"a month and a half");
  t.eq(Math.round(understand("drop 20 lbs in 3 weeks",ctx()).rate.kg*10)/10,9.1,"pounds as kilos");
  t.eq(understand("",ctx()).topic,null,"nothing said");t.eq(understand(null,ctx()).kind,null,"null");}

export {run};

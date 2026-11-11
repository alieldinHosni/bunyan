import {classify} from "../safety.js";

/* The red flags (docs/COACH-AGENT.md 2.2): what each message is, as [text, class, sub].
   Alone, inside a longer sentence, typed with typos, and in Egyptian Arabic with the
   letter variants phones type (ا/أ/إ, ى/ي, ة/ه) and with or without the article. */
var EN_POS=[
  /* stop now */
  ["I feel chest pain","stop","chest"],["chest pain","stop","chest"],["i have chest pains","stop","chest"],
  ["I was doing my warm up and suddenly I got this chest pain, what should I do","stop","chest"],
  ["there's a pressure in my chest","stop","chest"],["my chest feels tight and heavy","stop","chest"],
  ["tightness in my chest when I walk up stairs","stop","chest"],["my chest hurts","stop","chest"],
  ["chest pain from benching","stop","chest"],["chets pain since this morning","stop","chest"],
  ["i feel chest pian","stop","chest"],["pain in my chest","stop","chest"],["am I having a heart attack?","stop","chest"],
  ["the pain is spreading to my left arm","stop","spread"],["pain going down my arm and into my jaw","stop","spread"],
  ["my left arm is numb","stop","spread"],
  ["I fainted at the gym","stop","faint"],["I passed out after squats","stop","faint"],["blacked out on the treadmill","stop","faint"],
  ["I can't breathe","stop","breath"],["i cant breathe properly","stop","breath"],["struggling to breathe even sitting down","stop","breath"],
  ["difficulty breathing","stop","breath"],
  ["sudden severe headache","stop","head"],["worst headache of my life during deadlifts","stop","head"],
  ["one side of my face is drooping","stop","side"],["numbness on one side of my body","stop","side"],
  ["my speech is slurred","stop","speech"],
  /* stop the session */
  ["I feel dizzy","session","dizzy"],["im dizzy","session","dizzy"],["feeling light-headed after the set","session","dizzy"],
  ["i feel lightheaded","session","dizzy"],["got dizzy between sets of squats, is that normal?","session","dizzy"],
  ["i feel dizy","session","dizzy"],["dizzyness after deadlifts","session","dizzy"],["I feel faint","session","dizzy"],
  ["the room is spinning","session","dizzy"],
  ["I feel nauseous","session","sick"],["feeling nauseus after leg day","session","sick"],["I think I'm going to throw up","session","sick"],
  ["my vision is blurry","session","vision"],["blurred vision after the set","session","vision"],
  ["my heart is racing at rest","session","heart"],["heart fluttering","session","heart"],["I'm getting palpitations","session","heart"],
  ["sharp pain in my knee","session","sharp"],["I felt a pop in my shoulder","session","sharp"],["something snapped in my hamstring","session","sharp"],
  ["shooting pain down my leg","session","sharp"],["tingling in my fingers on the bench","session","sharp"],
  ["short of breath on the bike","session","breath"],
  /* refer */
  ["I want to kill myself","refer","care"],["sometimes I think about hurting myself","refer","care"],["I make myself throw up after eating","refer","care"],
  ["I only eat 600 calories a day","refer","care"],["i've been starving myself","refer","care"],
  ["can I take ibuprofen before training","refer","medical"],["I'm on medication for my blood pressure","refer","medical"],
  ["I'm pregnant, can I still squat?","refer","medical"],["I have type 2 diabetes","refer","medical"],["I take insulin","refer","medical"],
  ["I'm diabetic and fasting, when should I train","refer","medical"],["I have asthma","refer","medical"]];

/* Training talk that names a part or a symptom's word, and is none of these. */
var EN_NEG=[
  "my chest is sore from benching","chest day","what should I do on chest day","my legs are dead","killer workout",
  "heart rate zone 2","what is zone 2 heart rate","I'm dizzy with excitement","my chest hurts from benching yesterday",
  "chest is sore after push ups","my chest is pumped","sore chest","doms in my chest","my chest feels tight after benching",
  "how do I grow my chest","best chest exercises","no chest pain, just sore","I don't feel dizzy anymore","not dizzy at all",
  "I was out of breath after the sprints","how should I breathe during squats","breathing technique for bench",
  "my knees crack when I squat","my knee hurts","my shoulder hurts","I'm tired","I slept badly","I'm sore",
  "this workout is killing me","leg day almost killed me","I'm starving","I could eat a horse","I ate 300 calories at lunch",
  "medicine ball slams","how many sets for chest","heart rate during cardio","my heart was pounding after sprints",
  "I have a headache","sugar is bad for cutting?","how much protein do I need","I want to lose 5 kg in a month",
  "what's my best squat?","I don't like lunges","swap bench for dumbbells today","I only have 20 minutes",
  "pressure on the bar","press the bar up","the program is a killer","tear down the gym","my bench went down this week",
  "starting my cut","I'm passionate about lifting","I collapsed on the couch after leg day","my knees collapsed in on the last rep","my shoulder pops when I press","what did I eat yesterday","chest and triceps today"];

var AR_POS=[
  /* stop now */
  ["حاسس بألم في صدري","stop","chest"],["حاسس بالم في صدري","stop","chest"],["عندي وجع في الصدر","stop","chest"],["وجع صدر","stop","chest"],
  ["صدري بيوجعني","stop","chest"],["صدري واجعني اوي ومش عارف ليه","stop","chest"],["في ضغط على صدري","stop","chest"],
  ["حاسه بتقل على صدري","stop","chest"],["صدري مقبوض","stop","chest"],["عندي ألم في الصدر وانا بتمرن","stop","chest"],
  ["الم في صدري من البنش","stop","chest"],["حاسس اني هتجيلي ازمه قلبيه","stop","chest"],["كتمه في صدري","stop","chest"],
  ["الوجع بيروح لدراعي الشمال","stop","spread"],["الالم نازل في دراعي","stop","spread"],["دراعي الشمال منمله","stop","spread"],
  ["أغمى عليا في الجيم","stop","faint"],["اغمي عليا","stop","faint"],["إغماء بعد التمرين","stop","faint"],["فقدت الوعي","stop","faint"],
  ["مش قادر اتنفس","stop","breath"],["مش قادرة اتنفس خالص","stop","breath"],["عندي ضيق في التنفس","stop","breath"],["صعوبة في التنفس","stop","breath"],
  ["صداع جامد جدا","stop","head"],["صداع مفاجئ وانا بشيل","stop","head"],["راسي هتنفجر","stop","head"],
  ["نص جسمي منمل","stop","side"],["وشي مايل من ناحية","stop","side"],["كلامي تقيل","stop","speech"],
  /* stop the session */
  ["انا دايخ","session","dizzy"],["دايخة","session","dizzy"],["حاسس بدوخة","session","dizzy"],["عندي دوخه بعد السكوات","session","dizzy"],
  ["الدنيا بتلف بيا","session","dizzy"],["دخت بين المجموعات","session","dizzy"],["حاسه اني هيغمي عليا","session","dizzy"],
  ["عندي غثيان","session","sick"],["نفسي غامة","session","sick"],["حاسس اني هرجع","session","sick"],
  ["عيني بتزغلل","session","vision"],["نظري مزغلل بعد المجموعة","session","vision"],["عندي زغللة","session","vision"],
  ["قلبي بيدق جامد وانا قاعد","session","heart"],["عندي خفقان","session","heart"],["قلبي بيرفرف","session","heart"],
  ["وجع حاد في ركبتي","session","sharp"],["سمعت طقة في كتفي","session","sharp"],["ركبتي طقت","session","sharp"],
  ["كهربا نازلة في رجلي","session","sharp"],["عندي تنميل في ايدي","session","sharp"],["رجلي بتنمل في الديدلفت","session","sharp"],
  /* refer */
  ["عايز اموت","refer","care"],["بفكر أأذي نفسي","refer","care"],["بخلي نفسي ارجع بعد الاكل","refer","care"],
  ["باكل 500 سعر بس في اليوم","refer","care"],["مش باكل خالص","refer","care"],
  ["ينفع اخد مسكن قبل التمرين","refer","medical"],["عندي السكر","refer","medical"],["انا حامل","refer","medical"],
  ["عندي ضغط الدم عالي","refer","medical"],["باخد دوا للضغط","refer","medical"],["عندي ربو","refer","medical"],["بعد العملية امتى اتمرن","refer","medical"]];

var AR_NEG=[
  "صدري مكسر من البنش","صدري متكسر من التمرين","يوم الصدر","تمرين صدر النهارده","رجلي ميتة","رجليا مكسرة","التمرين ده قاتل",
  "زون ٢ في الكارديو","معدل ضربات القلب في الكارديو","دايخ من الفرحة","صدري بيوجعني من البنش","صدري واجعني من التمرين امبارح",
  "مفيش الم في صدري","مش دايخ","مش حاسس بدوخه خلاص","نفسي اتقطع من الجري","ازاي اتنفس في السكوات","ركبتي بتطقطق وانا بعمل سكوات",
  "ركبتي بتوجعني","كتفي واجعني","تعبان","منمتش كويس","عضلاتي مكسرة","هموت من الجوع","السكر وحش للتنشيف؟","كام بروتين احتاج",
  "عايز اخس ٥ كيلو في شهر","احسن سكوات عملته","مش بحب اللانجز","بدل البنش بدمبل النهارده","معايا ٢٠ دقيقة بس","عندي صداع خفيف",
  "اكلت ايه امبارح","البنش نزل الاسبوع ده","الكهربا قطعت في الجيم","حمل تدريبي زيادة","هرجع البيت بعد التمرين","تمرين ضغط",
  "عايز اكبر صدري","احسن تمارين للصدر","صدري وتراي النهارده","اعمل ايه النهارده؟","صايم رمضان امتى اتمرن","ضغط الشغل كتير"];

function run(t){
  var check=function(list,lang){list.forEach(function(x){var r=classify(x[0]);
    t.eq([r.cls,r.sub],[x[1],x[2]],lang+" "+x[1]+": "+x[0]);});};
  check(EN_POS,"en");check(AR_POS,"ar");
  EN_NEG.forEach(function(q){t.eq(classify(q).cls,null,"en none: "+q);});
  AR_NEG.forEach(function(q){t.eq(classify(q).cls,null,"ar none: "+q);});
  t.ok(EN_POS.length>=40&&EN_NEG.length>=40&&AR_POS.length>=40&&AR_NEG.length>=40,"at least 40 each way in each language");
  /* The language is the script it is written in. */
  t.eq([classify("I feel dizzy").lang,classify("انا دايخ").lang],["en","ar"],"the language of the message");
  /* The most urgent class wins when two are said. */
  t.eq(classify("I'm diabetic and I feel dizzy").cls,"session","dizzy outranks a condition");
  t.eq(classify("I feel dizzy and I have chest pain").cls,"stop","chest pain outranks dizzy");
  t.eq(classify("").cls,null,"nothing said");t.eq(classify(null).cls,null,"null");}

export {run};

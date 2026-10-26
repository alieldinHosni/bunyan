import {factOf, IDS, intentOf, situationOf} from "../intent.js";

/* Questions people type, and what each is asking. English and Egyptian Arabic, typed
   the way phones type them: no capitals, no hamza, ة as ه, Arabic or Western digits. */
var EN=[
  ["What should I train today?","today"],["what's my workout today","today"],["Which day is next?","today"],
  ["How much weight should I lift on bench?","weights"],["how heavy should I squat","weights"],["when do I add weight","weights"],
  ["What should I eat now?","eat"],["how many calories left today","eat"],["I'm hungry","eat"],
  ["Am I on track?","track"],["How was my week?","track"],["how am I doing","track"],
  ["Why is my weight stuck?","weight"],["I'm not losing weight","weight"],["the scale hasn't moved","weight"],
  ["How much protein do I need?","protein"],["Why are my calories 2400?","calories"],["explain my macros","calories"],
  ["I'm sore and tired","sore"],["my knee hurts","sore"],["I slept badly","sore"],["I feel fatigued","sore"],
  ["I missed yesterday's workout","missed"],["I only have 30 minutes","missed"],["no time today","missed"],
  ["Is my program balanced?","balance"],["am I doing enough volume","balance"],
  ["How strong am I?","strong"],["what are my PRs","strong"],
  ["I want to cut","goal"],["change my goal","goal"],["I want to bulk","goal"],
  ["make me a new program","plan"],["new meal plan","plan"],["retake the assessment","plan"],
  ["how much water","water"],["steps","steps"],["help","help"],["hi","hello"],["thanks!","thanks"],
  ["What do I train tomorrow?","tomorrow"],["how did my last workout go","last"],["is today a rest day","today"],
  ["What should I eat for the rest of the day?","rest"],["Is there other food options u can provide with same macros","swap"],
  ["I want to replace dinner","swap"],["what can I eat instead of rice","swap"],["how much protein in eggs","foodinfo"],
  ["calories in koshari","foodinfo"],["nutrition facts of oats","foodinfo"],
  /* Requests: the matcher says what kind; js/ui/agent.js finds what they name. */
  ["add leg press to legs day","exadd"],["remove leg press from my program","exremove"],["swap squat for leg press","exswap"],
  ["log 200g chicken breast for lunch","foodlog"],["I ate two eggs","foodlog"],["I weighed 82 this morning","weighlog"],["redo my assessment","reassess"],
  /* How training works, answered from the knowledge files. */
  ["how many reps for hypertrophy","kreps"],["how many sets should I do per exercise","ksets"],["how long should I rest between sets","krest"],
  ["how many days a week should I train","kfreq"],["how many sets a week for chest","kvolume"],["what tempo should I lift at","ktempo"],
  ["how many warm up sets","kwarm"],["how long should a workout be","kdur"],["how is my 1rm calculated","k1rm"],
  ["what's today","today"],["What have I told you?","facts"]];
var AR=[
  ["اتمرن ايه النهارده؟","today"],["تمرين النهارده ايه","today"],["اشيل كام في البنش؟","weights"],["ازود الوزن امتى","weights"],
  ["اكل ايه دلوقتي","eat"],["فاضل كام سعرات","eat"],["انا جعان","eat"],["انا ماشي صح؟","track"],["عامل ايه الاسبوع ده","track"],
  ["وزني ثابت ليه","weight"],["الميزان مش بينزل","weight"],["محتاج بروتين قد ايه","protein"],["سعراتي ليه كده","calories"],
  ["انا تعبان النهارده","sore"],["ركبتي بتوجعني","sore"],["منمتش كويس","sore"],["فاتني تمرين امبارح","missed"],
  ["معنديش وقت النهارده","missed"],["عندي ٣٠ دقيقة بس","missed"],["البرنامج متوازن؟","balance"],["قوتي عاملة ازاي","strong"],
  ["عايز انشف","goal"],["عايز اغير هدفي","goal"],["عايز برنامج جديد","plan"],["نظام اكل جديد","plan"],
  ["اشرب مايه قد ايه","water"],["الخطوات","steps"],["ساعدني","help"],["السلام عليكم","hello"],["شكرا","thanks"],
  ["بينش بريس كام؟","weights"],["ديدليفت كام","weights"],["اتمرن ايه بكره","tomorrow"],["اخر تمرين كان ازاي","last"],
  ["اكل ايه باقي اليوم","rest"],["عايز حاجة تانية بنفس الماكروز","swap"],["بديل للرز","swap"],["كام بروتين في البيض","foodinfo"],
  ["كم بروتين في البيض","foodinfo"],["ماذا آكل الآن","eat"],["akol eh delwa2ty","eat"],
  ["ضيف ليج بريس ليوم الرجل","exadd"],["شيل السكوات","exremove"],["بدل السكوات بالليج بريس","exswap"],["اكلت فراخ","foodlog"],
  ["وزني النهارده ٨٢","weighlog"],["اعيد التقييم","reassess"],["الراحه بين المجموعات قد ايه","krest"],["عدد التكرارات للعضل","kreps"]];

function run(t){
  function miss(list){return list.filter(function(x){return intentOf(x[0]).id!==x[1];})
    .map(function(x){return x[0]+" → "+intentOf(x[0]).id;});}
  t.eq(miss(EN),[],"English: each question finds what it asks");
  t.eq(miss(AR),[],"Arabic: each question finds what it asks");
  t.ok(IDS.every(function(id){return EN.concat(AR).some(function(x){return x[1]===id;});}),"every intent is asked somewhere above");
  /* The more specific phrase wins: the load, not the scale; calories left, not calories. */
  t.eq([intentOf("how much weight should I lift").id,intentOf("my weight").id],["weights","weight"],"how much weight is the load; my weight is the scale");
  t.eq([intentOf("calories left").id,intentOf("calories").id],["eat","calories"],"calories left is today's food; calories alone is the target");
  /* Whole words where a prefix would mislead. */
  t.eq([intentOf("my progress").id,intentOf("high protein").id,intentOf("fatigue").id],["track","protein","sore"],"pr is not progress, hi is not high, fat is not fatigue");
  /* Minutes, in either digits. */
  t.eq([intentOf("I only have 45 min").mins,intentOf("عندي ٣٠ دقيقة").mins,intentOf("today").mins],[45,30,0],"minutes read from the question");
  t.eq([intentOf("I only have 45 min").lang,intentOf("عندي ٣٠ دقيقة").lang],["en","ar"],"the question's language");
  /* Typed on a phone: a letter wrong, swapped or missing in English; the long vowels
     in a transliterated Arabic gym word; one spelling for the words people spell many
     ways. */
  t.eq([intentOf("protien").id,intentOf("how many calroies left").id,intentOf("how much shoud I lift").id,intentOf("بروتيين").id],
    ["protein","eat","weights","protein"],"a typo still finds its intent");
  t.eq([intentOf("pro").id,intentOf("hit").id,intentOf("pr").id],["unknown","unknown","strong"],"short words are never guessed at; PR alone is a record");
  /* The language to answer in: Arabic letters, or Egyptian Arabic typed in Latin
     letters with digits, is Arabic. */
  t.eq(["akol eh delwa2ty","3ayez atmaren","how much protein do I need","what to eat today","I want to bulk"].map(function(q){return intentOf(q).lang;}),
    ["ar","ar","en","en","en"],"Franco-Arabic is answered in Arabic; English stays English");
  /* The runner-up, for a question that names a food the database lacks. */
  t.eq(intentOf("how much protein in a day do I need").ranked.slice(0,2),["foodinfo","protein"],"ranked: the best and the next");
  /* Nothing to answer: unknown, never a guess. */
  t.eq([intentOf("").id,intentOf("asdf qwer").id,intentOf("   ").id],["unknown","unknown","unknown"],"nonsense and empty are unknown");
  /* Numbers a request names: a body weight (pounds converted), a portion in grams. */
  t.eq([intentOf("I weigh 82.5 kg").kg,intentOf("I weigh 180 lb").kg,intentOf("وزني ٨٢٫٥").kg,intentOf("log 150 g rice").grams],[82.5,81.6,82.5,150],"weights and grams read from the request");
  /* "swap" alone is still a food swap; an exercise swap needs the two named. */
  t.eq([intentOf("other foods with the same macros").id,intentOf("swap my lunch").id],["swap","swap"],"food swaps stay food swaps");
  /* A report, not a question: what went off, from its own words. */
  t.eq(["I had a bad day, didn't commit to the diet","I missed yesterday's workout","I'm so tired today","my knee hurts","bad day",
    "يوم وحش ومالتزمتش بالدايت","مروحتش الجيم النهارده","منمتش كويس","ركبتي بتوجعني"].map(function(q){var s=situationOf(q);return s&&s.kind;}),
    ["food","train","tired","pain","day","food","train","tired","pain"],"situations by their signals");
  t.eq([situationOf("what should I eat after a bad day?"),situationOf("how much protein do I need"),situationOf("I only have 30 minutes")],[null,null,null],"questions and plain statements are not reports");
  /* A fact about their life, said by them; a report is not one. */
  t.eq(["I work 13-hour days","I can't do squats","I don't eat pork","بشتغل ١٣ ساعة في اليوم","I missed yesterday's workout","I'm tired","what do I train today"].map(factOf),
    [true,true,true,true,false,false,false],"facts said, and only those");
  t.clean(intentOf("what should I train today"),"no NaN or undefined");}

export {run};

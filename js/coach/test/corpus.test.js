import {intentOf} from "../intent.js";

/* The ways people actually ask (owner, 27 Oct): many phrasings for each thing the coach
   answers, in English, Egyptian Arabic and Franco-Arabic, typed the way phones type them.
   Every misreading the owner sends on (Not what I asked) is added here with what it
   meant, so understanding can only get better. Each line: the words, the intent. */
var CORPUS=[
  /* today, tomorrow */
  ["what's on today","today"],["what am i training today","today"],["today's workout?","today"],["what do i do at the gym today","today"],
  ["النهارده تمرين ايه","today"],["اتمرن ايه النهارده","today"],["el naharda tamreen eh","today"],
  ["what's tomorrow","tomorrow"],["tomorrow's workout","tomorrow"],["what do i train tomorrow","tomorrow"],["بكره تمرين ايه","tomorrow"],
  /* how much to lift */
  ["how much should i bench","weights"],["what weight for squats","weights"],["should i go heavier","weights"],["when do i increase the weight","weights"],
  ["how heavy should my deadlift be","weights"],["what load should i use","weights"],["العب كام في البنش","weights"],["ازود الوزن امتى","weights"],
  /* how weights are logged */
  ["is the bar included in the weight","loadlog"],["do i count the bar","loadlog"],["dumbbell weight per hand or both","loadlog"],
  ["do i log both dumbbells","loadlog"],["how is volume calculated","loadlog"],["does volume count the bar","loadlog"],
  ["بسجل وزن الدمبل لكل ايد","loadlog"],["البار محسوب في الوزن","loadlog"],
  /* an InBody result */
  ["what does my inbody say","inbody"],["i did an inbody test","inbody"],["my body composition result","inbody"],["انبودي بتاعي بيقول ايه","inbody"],["عملت تحليل الجسم","inbody"],
  /* a stuck lift */
  ["why is my squat stuck","plateau"],["my bench isn't going up","plateau"],["my deadlift stalled","plateau"],["i've plateaued on overhead press","plateau"],
  /* the week */
  ["how did this week go","week"],["weekly check in","week"],["how was my week overall","week"],
  /* how am I doing */
  ["am i progressing","track"],["how am i doing","track"],["am i on track with my goal","track"],["انا ماشي صح","track"],
  /* body weight */
  ["is my weight going down","weight"],["why am i not losing weight","weight"],["my weight hasn't changed","weight"],["the scale is stuck","weight"],
  ["وزني مش بينزل","weight"],["الميزان واقف","weight"],
  /* what to eat */
  ["what should i eat","eat"],["what can i eat now","eat"],["i'm starving","eat"],["what to eat for dinner","eat"],["اكل ايه دلوقتي","eat"],["جعان","eat"],
  /* the rest of today */
  ["what's left to eat today","rest"],["how much do i have left today","rest"],
  /* protein, calories */
  ["how much protein should i eat","protein"],["protein target","protein"],["am i eating enough protein","protein"],["محتاج كام بروتين","protein"],
  ["why are my calories so low","calories"],["how were my calories worked out","calories"],["explain my calorie target","calories"],["سعراتي ليه كده","calories"],
  /* sore, tired, pain */
  ["i'm really sore","sore"],["i feel tired today","sore"],["my legs are sore","sore"],["i didn't sleep well","sore"],["عضلاتي واجعاني","sore"],
  /* short on time, missed */
  ["i only have 20 minutes","missed"],["short on time today","missed"],["i skipped monday","missed"],["معنديش وقت النهارده","missed"],
  /* balance */
  ["is my program good","balance"],["is my split balanced","balance"],["am i missing any muscles","balance"],["البرنامج بتاعي متوازن","balance"],
  /* strength */
  ["how strong am i","strong"],["what are my best lifts","strong"],["my personal records","strong"],
  /* goal */
  ["should i cut or bulk","goal"],["change my goal to lose fat","goal"],["i want to build muscle","goal"],["عايز اخس","goal"],
  /* plan */
  ["build me a new plan","plan"],["make me a meal plan","plan"],["new training program","plan"],["اعملي برنامج جديد","plan"],
  /* water, steps */
  ["how much water should i drink","water"],["am i drinking enough water","water"],["اشرب مايه قد ايه","water"],
  ["how are my steps","steps"],["how much cardio","steps"],["did i walk enough","steps"],
  /* help, hello, thanks */
  ["what can you do","help"],["what can i ask you","help"],["hello","hello"],["good morning","hello"],["thank you","thanks"],["شكرا","thanks"],
  /* last workout */
  ["how was my last session","last"],["how did yesterday's workout go","last"],
  /* food swaps and facts */
  ["something else with the same macros","swap"],["what can replace chicken","swap"],
  ["how many calories in an egg","foodinfo"],["protein in chicken breast","foodinfo"],["calories in rice","foodinfo"],
  /* requests */
  ["add bicep curls to pull day","exadd"],["put lunges on legs day","exadd"],["ضيف بنش على يوم الصدر","exadd"],
  ["remove deadlifts from my program","exremove"],["take squats out of monday","exremove"],["شيل الديدلفت","exremove"],
  ["swap bench press for dumbbell press","exswap"],["replace squats with leg press","exswap"],["بدل السكوات بليج بريس","exswap"],
  ["log 2 eggs for breakfast","foodlog"],["i ate a banana","foodlog"],["i had chicken and rice for lunch","foodlog"],
  ["i weigh 80 kg today","weighlog"],["log my weight 81","weighlog"],
  /* how training works */
  ["how many reps to build muscle","kreps"],["best rep range for strength","kreps"],
  ["how many sets per exercise","ksets"],["how long to rest between sets","krest"],["rest time between sets","krest"],
  ["how many times a week should i train","kfreq"],["what tempo should i use","ktempo"],["how do i warm up","kwarm"],
  ["how long should a workout be","kdur"],["how is 1rm calculated","k1rm"]];

function run(t){
  var bad=CORPUS.filter(function(c){return intentOf(c[0]).id!==c[1];})
    .map(function(c){return c[0]+" → "+intentOf(c[0]).id+" (meant "+c[1]+")";});
  t.eq(bad,[],CORPUS.length+" phrasings read as meant");}

export {CORPUS, run};

/* Bunyan — what the person tells the coach to do in the app
   "Open my meal plan", "add a glass of water", "switch to pounds", "start my workout",
   "skip the rest", "افتح الاكل", "شربت كوبايتين مية": a request for something the app's
   own buttons do. This reads which one, and what it names (an amount, a place, a
   setting), from the folded text (js/coach/intent.js fold). Pure: no state, no screen.
   js/ui/agent.js turns a command into what the chat shows and does, through the
   registry (js/ui/handlers/actions.js), so the coach can do nothing a tap cannot.

   commandOf(text) → {cmd, ...what it names} or null. A question is not a command
   ("should I open…", "how much water…"), and nothing is guessed: an amount it cannot
   read is left out, and the caller asks for it. */
import {fold, spell} from "./intent.js";

function numIn(s){
  var m=String(s).replace(/[٠-٩]/g,function(d){return "٠١٢٣٤٥٦٧٨٩".indexOf(d);}).match(/(\d+(?:[.,]\d+)?)/);
  return m?+m[1].replace(",","."):0;}
/* Arabic counts said as words: one glass, two glasses. */
var COUNT=[[/(^| )(a|one|واحده|واحد|كوبايه|كوبايه مايه|كباية)( |$)/,1],[/(^| )(two|couple|كوبايتين|اتنين|تنين)( |$)/,2],
  [/(^| )(three|تلاته|تلات)( |$)/,3],[/(^| )(four|اربعه|اربع)( |$)/,4]];
function countIn(fq){for(var i=1;i<COUNT.length;i++)if(COUNT[i][0].test(fq))return COUNT[i][1];return COUNT[0][0].test(fq)?1:0;}

/* The places the app has, and how people name them. Longest first: "meal plan" is not
   "food". */
var PLACES=[
  ["mealplan",/(meal plan|my meals plan|diet plan|nutrition plan|خطه الاكل|خطة الاكل|نظام الاكل|الدايت بتاعي|الوجبات)/],
  ["targets",/(targets|my macros|macro targets|calorie target|الاهداف|اهدافي|الماكروز|السعرات بتاعتي)/],
  ["program",/(my program|my programme|my split|my routine|training plan|workout plan|البرنامج|برنامجي|جدول التمرين)/],
  ["programs",/(programs|programmes|other programs|explore programs|البرامج)/],
  ["history",/(history|past workouts|workout log|السجل|التاريخ|التمارين اللي فاتت)/],
  ["weigh",/(weigh in|weigh-in|log weight|my weight|الوزن|وزني)/],
  ["steps",/(steps|خطوات|الخطوات)/],
  ["recovery",/(recovery|sleep log|log sleep|النوم|الاستشفاء)/],
  ["activities",/(activities|cardio|activity list|الانشطه|الكارديو|النشاط)/],
  ["assessment",/(assessment|questionnaire|التقييم|الاستبيان)/],
  ["settings",/(settings|preferences|app settings|الاعدادات|الضبط)/],
  ["you",/(my details|my info|personal info|my age|my height|بياناتي|معلوماتي)/],
  ["backup",/(backup|back up|export|my data|النسخه الاحتياطيه|البيانات)/],
  ["profile",/(profile|my account|البروفايل|الحساب|بروفايلي)/],
  ["food",/(food|nutrition|diary|meals|الاكل|اكلي|التغذيه|الوجبات)/],
  ["train",/(training|train|workouts|workout|gym|التمرين|التمارين|الجيم)/],
  ["progress",/(progress|stats|charts|التقدم|الاحصائيات)/],
  ["coach",/(coach page|coach tab|الكوتش)/]];
var OPEN=/^(please |pls |can you |could you |)(open|go to|goto|show me|show|take me to|bring up|navigate to|افتح|افتحلي|روح|روحني|وريني|ورينى|اعرض|خدني|خدني علي|ودي|وديني)( |$)/;

var QUESTION=/^(should|how|why|what|when|which|is|are|do|does|can i|could i|هل|ليه|ازاي|امتي|اعمل ايه|كام)( |$)|[?؟]$/;

/* When, said as a day: today, tomorrow or a weekday (1 Monday … 7 Sunday), in the order
   said. The caller turns them into dates. */
var WHEN=[["today",/^(today|tonight|النهارده|انهارده|اليوم)$/],["tomorrow",/^(tomorrow|tmrw|بكره|بكرا|غدا)$/],
  [1,/^(monday|mon|الاتنين|الاثنين|اتنين)$/],[2,/^(tuesday|tue|tues|التلات|الثلاثاء|الثلاثا|التلاتاء)$/],[3,/^(wednesday|wed|الاربع|الاربعاء|الاربعا)$/],
  [4,/^(thursday|thu|thurs|الخميس)$/],[5,/^(friday|fri|الجمعه)$/],[6,/^(saturday|sat|السبت)$/],[7,/^(sunday|sun|الحد|الاحد)$/]];
function whenIn(fq){
  var out=[];fq.split(" ").forEach(function(w){w=w.replace(/(s|'s)$/,"").replace(/^لل/,"ال").replace(/^(ل|ب)(?=ال)/,"");
    for(var i=0;i<WHEN.length;i++)if(WHEN[i][1].test(w)||WHEN[i][1].test(w+"s")){out.push(WHEN[i][0]);break;}});
  return out;}
/* A change to how much an exercise asks: sets, reps, rest, or rests shorter or longer.
   The exercise and the day are the agent's to find, from the words. */
function doseOf(fq){
  var d={},m;
  var n=fq.replace(/[٠-٩]/g,function(c){return "٠١٢٣٤٥٦٧٨٩".indexOf(c);});
  if((m=n.match(/(\d{1,2}) ?(x|×|by|sets? of|مجموعات من|مجموعه من) ?(\d{1,2})(?: ?(?:-|to|–|ل) ?(\d{1,2}))?/))){d.sets=+m[1];d.lo=+m[3];d.hi=+(m[4]||m[3]);}
  else{
    if((m=n.match(/(\d{1,2}) ?(sets|set|مجموعات|مجموعه|سيتات|سيت)( |$)/)))d.sets=+m[1];
    if((m=n.match(/(\d{1,2})(?: ?(?:-|to|–) ?(\d{1,2}))? ?(reps|rep|عدات|عده)( |$)/))){d.lo=+m[1];d.hi=+(m[2]||m[1]);}}
  if((m=n.match(/(rest|راحه)( of| for| to| ل| ب|)? ?(\d{1,3}(?:[.,]\d)?) ?(s|sec|secs|seconds|ثانيه|ثواني|min|mins|minute|minutes|دقيقه|دقايق|دقيقتين)( |$)/))||
     (m=n.match(/()()(\d{1,3}(?:[.,]\d)?) ?(s|sec|secs|seconds|ثانيه|ثواني|min|mins|minute|minutes|دقيقه|دقايق) (rest|of rest|راحه)( |$)/))){
    var v=+m[3].replace(",",".");d.rest=Math.round(/^(min|mins|minute|minutes|دقيقه|دقايق)$/.test(m[4])?v*60:v);}
  if(!d.rest&&/(shorter|less|cut|reduce|قلل|اقل|اقصر)( the| my|)? ?(rest|rests|(ال)?راحه)|(rest|rests|(ال)?راحه) (shorter|less|اقل|اقصر)/.test(n))d.restBy=-30;
  if(!d.rest&&/(longer|more|increase|زود|اطول|اكتر)( the| my|)? ?(rest|rests|(ال)?راحه)|(rest|rests|(ال)?راحه) (longer|more|اطول|اكتر)/.test(n))d.restBy=30;
  return Object.keys(d).length?d:null;}

/* Gym talk for a load: "2 plates" is the bar and two plates a side (20 kg each, or 45 lb
   in a pounds app); said before anything reads the numbers. */
function slang(s,unit){
  return s.replace(/(\d) ?plates?( a side| per side| each side| on each side| aside|)/g,function(m,n){
    return unit==="lb"?(45+90*(+n))+" lb":(20+40*(+n))+" kg";});}
/* Activities said in a sentence, by the words people use for them, and how long and far. */
var ACTW=[["Running",/(^| )(ran|run|running|jog|jogged|jogging|جريت|جري|بجري)( |$)/],["Walking",/(^| )(walked|walk|walking|مشيت|مشي|اتمشيت)( |$)/],
  ["Cycling",/(^| )(cycled|cycling|bike|biked|biking|rode|bicycle|عجله|دراجه|سيكلنج)( |$)/],["Swimming",/(^| )(swam|swim|swimming|عومت|سباحه|عوم)( |$)/],
  ["Hiking",/(^| )(hike|hiked|hiking|هايكنج)( |$)/],["Football",/(^| )(football|soccer|كوره|فوتبول)( |$)/],["Basketball",/(^| )(basketball|باسكت)( |$)/],
  ["Tennis",/(^| )(tennis|تنس)( |$)/],["Padel",/(^| )(padel|paddle|بادل)( |$)/],["Squash",/(^| )(squash|اسكواش)( |$)/],["Badminton",/(^| )(badminton|ريشه)( |$)/],
  ["Volleyball",/(^| )(volleyball|فولي)( |$)/],["Handball",/(^| )(handball|هاندبول)( |$)/],["Boxing",/(^| )(boxing|boxed|بوكس|ملاكمه)( |$)/],
  ["Martial Arts",/(^| )(karate|judo|bjj|jiu jitsu|kickboxing|muay thai|mma|كاراتيه|جودو|كيك بوكس)( |$)/],["Yoga",/(^| )(yoga|يوجا)( |$)/],
  ["Pilates",/(^| )(pilates|بيلاتس)( |$)/],["Dance",/(^| )(danced|dance|dancing|رقص|رقصت)( |$)/],["HIIT",/(^| )(hiit)( |$)/],
  ["Spinning Class",/(^| )(spin class|spinning)( |$)/],["CrossFit",/(^| )(crossfit|كروس فيت)( |$)/],["Climbing",/(^| )(climbed|climbing|bouldering|تسلق)( |$)/],
  ["Table Tennis",/(^| )(ping pong|table tennis|بينج بونج)( |$)/],["Golf",/(^| )(golf|جولف)( |$)/],["Stretching",/(^| )(stretched|stretching|اطالات|استطاله)( |$)/]];
function minutesIn(s){
  var m;
  if(/(ساعه ونص|hour and a half|an hour and half|1\.5 hours?)/.test(s))return 90;
  if(/(نص ساعه|half an hour|half hour)/.test(s))return 30;
  if(/(ساعتين|two hours|2 hours)/.test(s))return 120;
  if((m=s.match(/(\d+(?:\.\d+)?) ?(hours|hour|hrs|hr|h|ساعات|ساعه)( |$)/)))return Math.round(+m[1]*60);
  if(/(^| )(an hour|one hour|a hour|ساعه)( |$)/.test(s))return 60;
  if((m=s.match(/(\d+) ?(minutes|minute|mins|min|m|دقيقه|دقايق|د)( |$)/)))return +m[1];
  return 0;}
function kmIn(s){var m=s.match(/(\d+(?:\.\d+)?) ?(km|k|kms|kilometers|kilometres|كيلو|كم)( |$)/);if(m)return +m[1];
  m=s.match(/(\d+(?:\.\d+)?) ?(miles|mile|mi)( |$)/);return m?Math.round(+m[1]*1.609*10)/10:0;}

function commandOf(text,unit){
  var raw=slang(String(text||"").trim(),unit),fq=spell(fold(raw)),q=" "+fq+" ";
  if(!fq)return null;
  var asks=QUESTION.test(fq)||/[?؟]\s*$/.test(raw);

  /* ---- the program for other kit: asked as a question too ("can I make my plan
     home based with no equipment?") ---- */
  var kit=/(no equipment|without equipment|zero equipment|bodyweight|body weight|no gym|nothing at home|من غير ادوات|بدون ادوات|من غير اجهزه|وزن الجسم|من غير جيم)/.test(fq)?"bw"
    :/(dumbbells?|bands?|kettlebells?|at home|home based|from home|in the house|في البيت|من البيت|دمبل)/.test(fq)?"home"
    :/(full gym|the gym|a gym|machines|في الجيم|الجيم)/.test(fq)?"gym":"";
  if(kit&&/(plan|program|programme|workouts?|routine|training|split|exercises|برنامج|البرنامج|التمرين|تمارين|خطه)/.test(fq)
    &&/(restructure|change|switch|make|convert|rebuild|adapt|turn|move|redo|modify|adjust|update|build|redesign|can i|could i|i want|i need|wanna|حول|غير|اعمل|عدل|ممكن|عايز|عاوز)/.test(fq))
    return {cmd:"plan.gear",gear:kit};

  /* ---- the workout in progress ---- */
  if(/(^| )(skip|end|stop|cancel) (the |my |)rest( |$)|(^| )(اقفل|الغي|كفايه|خلص|سكيب) (ال|)راحه/.test(q))return {cmd:"rest.skip"};
  if(/(^| )(extend|more|longer|add 30( s| sec| seconds|)( to)?) (the |my |)rest( |$)|(^| )30 (s|sec|seconds) more( |$)|(^| )(زود|طول) (ال|)راحه/.test(q))return {cmd:"rest.extend"};
  if(/(^| )(next exercise|next one|go to next|move on to the next|التمرين اللي بعده|التمرين الجاي|اللي بعده)( |$)/.test(q)&&!asks)return {cmd:"workout.next"};
  if(/(^| )(finish|end|complete|wrap up|done with) (my |the |this |)(workout|session|training)( |$)|(^| )(خلصت|انهي|اقفل) (ال|)(تمرين|سيشن)( |$)/.test(q)&&!asks)return {cmd:"workout.finish"};
  if(/^(start|begin|let s start|lets start|go|start today s|ابدا|ابدأ|يلا|يلا نبدا) ?(my |the |today s |todays |)(workout|training|session|تمرين|التمرين)( |$)/.test(fq)&&!asks)return {cmd:"workout.start"};
  /* "bodyweight x 12": a set with no load. */
  var bw=fq.replace(/[٠-٩]/g,function(d){return "٠١٢٣٤٥٦٧٨٩".indexOf(d);}).match(/^(log |did |)(bw|bodyweight|body weight|وزن الجسم) ?(x|×|for|by|في) ?(\d{1,3}) ?(reps|rep|عده|عدات|)$/);
  if(bw&&!asks)return {cmd:"set.log",w:0,unit:"",r:+bw[4]};
  /* "log 80 kg for 8", "80 x 8", "سجل ٨٠ في ٨" */
  var st=fq.replace(/[٠-٩]/g,function(d){return "٠١٢٣٤٥٦٧٨٩".indexOf(d);})
    .match(/^(log |log a set |log set |did |سجل |)(\d+(?:[.,]\d+)?) ?(kg|kgs|lb|lbs|كيلو|)? ?(x|×|for|by|في|ب) ?(\d{1,2}) ?(reps|rep|عده|عدات|)$/);
  if(st&&!asks)return {cmd:"set.log",w:+st[2].replace(",","."),unit:/lb/.test(st[3])?"lb":st[3]?"kg":"",r:+st[5]};

  /* ---- a sore spot, across the whole program ---- */
  var AREA=[["knee",/(knee|knees|ركبه|ركبتي|ركب)/],["back",/(lower back|back|ضهري|ظهري|الضهر|الظهر)/],["shoulder",/(shoulder|shoulders|كتف|كتفي|الكتف)/],
    ["wrist",/(wrist|wrists|رسغ|رسغي|معصم)/],["ankle",/(ankle|ankles|كاحل|كاحلي)/]];
  if(/(avoid|swap out|swap|change|replace|protect|work around|spare|keep away from|go easy on|easy on|take out|remove|شيل|بدل|غير|ابعد عن|تجنب|ريح)/.test(fq)
     &&/(exercise|exercises|program|plan|workout|workouts|lifts|moves|تمارين|التمارين|البرنامج|برنامجي)/.test(fq)){
    for(var ri=0;ri<AREA.length;ri++)if(AREA[ri][1].test(fq))return {cmd:"limit.add",area:AREA[ri][0]};}

  /* ---- away from the usual kit: travel mode ---- */
  if(!asks&&/(i m back|im back|i am back|back home|back from (my )?(trip|travel)|end travel|stop travel|travel (mode )?(is )?over|done travel|رجعت|خلصت السفر|رجعت من السفر)/.test(fq))return {cmd:"travel.end"};
  if(!asks&&(/(travel|travelling|traveling|trip|hotel|away|vacation|holiday|مسافر|سفر|فندق|اجازه)/.test(fq)||/(only|just) (have |got |)(dumbbells?|bands?|kettlebells?|my bodyweight|bodyweight)/.test(fq))
     &&/(dumbbell|band|kettlebell|bodyweight|body weight|no equipment|nothing|hotel gym|hotel room|دمبل|دامبل|استك|كيتل|من غير ادوات|من غير اجهزه|بوزن الجسم|جيم الفندق)/.test(fq)){
    var gear=["Bodyweight"];
    /* "Hotel gym": dumbbells and the usual machines, unless it is "… only". */
    if(/(hotel gym|جيم الفندق)/.test(fq)&&!/(only|just|بس)/.test(fq))gear=gear.concat(["Dumbbell","Machine","Cable"]);
    if(/(dumbbell|دمبل|دامبل)/.test(fq)&&gear.indexOf("Dumbbell")<0)gear.push("Dumbbell");
    if(/(band|استك)/.test(fq))gear.push("Band");
    if(/(kettlebell|كيتل)/.test(fq))gear.push("Kettlebell");
    var days=0,dm=fq.match(/(\d{1,2}) ?(days|day|ايام|يوم)/);if(dm)days=+dm[1];
    else if(/(a week|one week|7 days|اسبوع)/.test(fq))days=7;else if(/(two weeks|2 weeks|اسبوعين)/.test(fq))days=14;
    else if(/(weekend|الويك اند|الويكند)/.test(fq))days=-1;
    var tw=whenIn(fq).filter(function(x){return x!=="today";});
    return {cmd:"travel.set",gear:gear,days:days,until:tw.length?tw[tw.length-1]:""};}

  /* ---- taking the last change back ---- */
  if(/^(undo|undo that|undo it|undo the last|swap it back|put it back|change it back|switch it back|revert|revert it|revert that|take it back|take that back|رجعه|رجعها|رجع زي ما كان|الغي اللي فات|الغي اخر حاجه|تراجع)( please| pls|)$/.test(fq))return {cmd:"undo.last"};

  /* ---- sleep and soreness, for today ---- */
  if(!asks){var sm=raw.toLowerCase().replace(/[٠-٩]/g,function(d){return "٠١٢٣٤٥٦٧٨٩".indexOf(d);}).replace(/ة/g,"ه").match(/(slept|sleep|got|نمت|نوم)[^0-9]{0,12}(\d+(?:[.,]\d)?) ?(hours|hour|hrs|hr|h|ساعات|ساعه)/);
    var slept=sm?+sm[2].replace(",","."):/(نمت ساعتين)/.test(fq)?2:0;
    var sore=0,sn=fq.match(/(sore|soreness|ممسوك|متكسر|وجع عضلات)[^0-9]{0,10}(\d{1,2})( ?\/ ?10| out of 10|)/);
    if(sn)sore=Math.min(10,+sn[2]);
    else if(/(very|really|super|so|extremely|اوي|جدا|قوي)[^ ]* ?(sore)|(sore|ممسوك|متكسر)( اوي| جدا| قوي)|(killing me|can t move|cant move|wrecked)/.test(fq))sore=8;
    else if(/(a bit|a little|slightly|kinda|شويه) (sore|ممسوك)|(sore|ممسوك) (a bit|a little|شويه)/.test(fq))sore=3;
    else if(/(^| )(i m|im|i am|my|legs|arms|back|chest|shoulders|feeling|feel|جسمي|رجلي)( [a-z]+)? (are |is |)(sore|ممسوك|ممسوكه|متكسر)( |$)/.test(q))sore=5;
    if((slept>0&&slept<=16)||sore)return {cmd:"recovery.log",sleep:slept>0&&slept<=16?slept:0,sore:sore};}

  /* ---- cardio or a sport, said in a sentence ---- */
  if(!asks){var an="";for(var ai=0;ai<ACTW.length;ai++)if(ACTW[ai][1].test(q)){an=ACTW[ai][0];break;}
    var ar=raw.toLowerCase().replace(/[٠-٩]/g,function(d){return "٠١٢٣٤٥٦٧٨٩".indexOf(d);}).replace(/(\d),(\d)/g,"$1.$2").replace(/ة/g,"ه").replace(/[أإآ]/g,"ا");
    var amin=minutesIn(ar),akm=kmIn(ar);
    if(an&&(amin||akm)&&!/(how|should|can i|كام|ازاي)/.test(fq))
      return {cmd:"act.log",act:an,min:amin,km:akm,when:/(yesterday|امبارح|امس)/.test(fq)?"yesterday":"today"};}

  /* ---- a workout done without the app: "yesterday I did bench 3x8 at 80" ---- */
  if(!asks&&/(^| )(did|done|trained|hit|عملت|لعبت|اتمرنت)( |$)/.test(q)){
    var pr=raw.toLowerCase().replace(/[٠-٩]/g,function(d){return "٠١٢٣٤٥٦٧٨٩".indexOf(d);}).replace(/(\d),(\d)/g,"$1.$2"),pm;
    var pwn=whenIn(fq),pwhen=/(yesterday|امبارح|امس)/.test(fq)?"yesterday":pwn.length?pwn[0]:"";
    if(pwhen&&(pm=pr.match(/(\d{1,2}) ?(x|×|sets? of|by) ?(\d{1,3})/))){
      var wm=pr.match(/(?:^| )(at|@|with|ب|بـ|على) ?(\d{1,3}(?:\.\d+)?) ?(kg|kgs|lb|lbs|كيلو|)/)||pr.match(/(\d{1,3}(?:\.\d+)?) ?(kg|kgs|lb|lbs|كيلو)( |$)/);
      var pw=wm?+(wm[2]&&/\d/.test(wm[2])?wm[2]:wm[1]):0,pu=wm?(wm[3]||wm[2]||""):"";
      return {cmd:"past.log",when:pwhen,sets:+pm[1],reps:+pm[3],w:pw,unit:/lb/.test(pu)?"lb":/kg|كيلو/.test(pu)?"kg":"",text:raw};}}

  /* ---- in the gym: how the last set felt, the form, the plates ---- */
  if(/^(that|it|this|the set|that set|last set)?( one)?( was| felt| is|)( way| really| a bit| a little| too| so|)* ?(too )?(easy|light|easy peasy)( |$)|^(too easy|easy|light)( |$)|(سهل|خفيف|سهله|خفيفه)( اوي| قوي| جدا|)$/.test(fq))return {cmd:"set.feel",dir:1};
  if(/^(that|it|this|the set|that set|last set)?( one)?( was| felt| is|)( way| really| a bit| a little| too| so|)* ?(too )?(heavy|hard|tough|brutal)( |$)|^(too heavy|too hard|heavy|i failed|failed|couldn t finish|could not finish|cant finish|i struggled)( |$)|(تقيل|صعب|تقيله|صعبه)( اوي| قوي| جدا|)$|^(مقدرتش|معرفتش) (اكمل|اخلص)/.test(fq))return {cmd:"set.feel",dir:-1};
  if(/^(how (do|should|can) i (do|perform|make) (this|it|that)( one| exercise|)|how to do (this|it|that)( one| exercise|)|show me how( to do (this|it))?|form( check| cues| tips|)|technique|cues)( |$)|^(ازاي|ازي) (اعمل|اعمله|اعملها|العب|العبه) ?(ده|دي|التمرين ده|)$|^(طريقه|شرح) (الاداء|التمرين ده|اللعب)/.test(fq))return {cmd:"ex.how"};
  /* From the words as typed: folding takes the decimal point away (87.5 is not 875). */
  var pl=raw.toLowerCase().replace(/[٠-٩]/g,function(d){return "٠١٢٣٤٥٦٧٨٩".indexOf(d);}).match(/(plates?|طارات|طاره)( do i need| for| to make| to load| on the bar for| ل| علشان| عشان|)? ?(\d{2,3}(?:[.,]\d+)?) ?(kg|kgs|lb|lbs|كيلو|)|(how (do i|to) load|load) (\d{2,3}(?:[.,]\d+)?) ?(kg|kgs|lb|lbs|)/);
  if(pl){var pw=+(pl[3]||pl[7]).replace(",","."),pu=pl[4]||pl[8]||"";return {cmd:"plates",w:pw,unit:/lb/.test(pu)?"lb":pu?"kg":""};}

  /* ---- in the gym: the machine is taken ---- */
  if(/(machine|bench|rack|cable|cables|station|equipment|smith|it|that|this one)( is| s|s)? (taken|occupied|busy|in use|being used|full)( |$)|(someone|somebody|some one|a guy|people)( is| s)? (on|using|at) (it|the|that)|(cant|can t|cannot|can not) (get|use) (on |)(the|a|that) (machine|bench|rack|cable|station)|(الجهاز|المكنه|البنش|الكابل|الرف)( ده| دي|)( مشغول| مشغوله| عليه حد)|(حد|واحد|ناس) (على|علي|عليه|بيستخدم|شغال على) (الجهاز|المكنه|البنش|الكابل)|^(مشغول|مشغوله)( |$)/.test(fq))
    return {cmd:"ex.busy"};

  /* ---- the lighter week ---- */
  var light=/(lighter week|light week|easy week|easier week|deload|اسبوع خفيف|اسبوع اخف|ديلود)/.test(fq);
  if(light&&/(end|stop|finish|cancel|over|انهي|وقف|الغي|خلص)/.test(fq)&&!asks)return {cmd:"deload.end"};
  if(light&&!asks&&(/^(start|take|do|begin|give me|i want|i need|i ll take|ill take|let s do|lets do|let s take|lets take|yes|ok|okay|go|please|time for|ابدا|ابدأ|عايز|عاوز|محتاج|اعمل|اعملي|يلا|خلينا|ايوه|تمام)( |$)/.test(fq)||/^(a |)(deload|lighter week|light week)( week| now| please|)$/.test(fq)))
    return {cmd:"deload.start"};

  /* ---- the week's schedule: skip a day, move a workout ---- */
  var wn=whenIn(fq);
  if(!asks&&/(^| )(move|reschedule|push|shift|postpone|swap|انقل|اجل|ودي|حرك|غير)( |$)/.test(q)&&/(workout|session|training|تمرين|التمرين|سيشن)/.test(fq)&&wn.length
     &&/( to | until |لـ| ل| ليوم | الى | يوم )/.test(" "+fq+" "))
    return {cmd:"sched.move",from:wn.length>1?wn[0]:"",to:wn[wn.length-1]};
  if(!asks&&(/^(skip|cancel|miss|drop)( today s| todays| today| tomorrow s| tomorrows| tomorrow| my| the| this|)* ?(workout|session|training|it)?( today| tomorrow|)( |$)/.test(fq)
     ||/(take|taking) (today|tomorrow|the day) off|(rest|day off) (today|tomorrow)|(skip|cancel) (today|tomorrow)|(im|i m|i am) (sick|ill|unwell|not feeling well).*(skip|rest|off|cant train|can t train)/.test(fq)
     ||/(مش هتمرن|مش هقدر اتمرن|هريح|الغي تمرين|الغي التمرين|اجازه من التمرين|تعبان.*(مش هتمرن|هريح))/.test(fq)))
    return {cmd:"sched.skip",on:wn[0]||"today"};

  /* ---- how much an exercise asks ---- */
  if(!asks&&(/^(make|change|set|update|put|switch|do|i want|let s do|lets do|use|rest|خلي|غير|اعمل|عايز|حط|راحه)( |$)/.test(fq)
     ||/(shorter|longer|less|more) (rest|rests)|(rest|rests) (shorter|longer)|(قلل|زود) (ال)?راحه/.test(fq))){
    var dz=doseOf(fq);if(dz)return Object.assign({cmd:"ex.dose",text:raw},dz);}

  /* ---- water and steps ---- */
  var water=/(^| )(water|مايه|ميه|مياه|مية)( |$)/.test(q),glass=/(glass|glasses|cup|cups|كوبايه|كوبايتين|كوبايات|كباية)/.test(fq);
  if((water||glass&&/(drank|drink|had)/.test(fq))&&!asks&&/^(add|log|drank|i drank|i had|had|drink|record|track|ضيف|سجل|شربت|زود|اشرب|حط)( |$)/.test(fq)){
    var ml=0,nn=numIn(fq);
    if(/(\d)(\s)?(l|liter|litre|liters|litres|لتر)( |$)/.test(fq.replace(/[٠-٩]/g,function(d){return "٠١٢٣٤٥٦٧٨٩".indexOf(d);})))ml=Math.round(nn*1000);
    else if(/(ml|مل|ملي)( |$)/.test(fq))ml=Math.round(nn);
    else if(glass)ml=(nn||countIn(fq)||1)*250;
    else if(nn>=50)ml=Math.round(nn);
    return {cmd:"water.add",ml:ml};}
  if(/(^| )(steps|step|خطوه|خطوات)( |$)/.test(q)&&!asks&&/^(log|add|set|record|i walked|walked|i did|did|سجل|ضيف|مشيت|عملت)( |$)/.test(fq))
    return {cmd:"steps.log",n:Math.round(numIn(fq)),add:/^(add|ضيف)( |$)/.test(fq)};

  /* ---- settings ---- */
  if(!asks&&/(switch|change|use|set|turn|put|make|theme|mode|حول|غير|خلي|استخدم|اعمل|ثيم)/.test(fq)||/^(lb|lbs|pounds|kg|kilos|dark mode|light mode|arabic|english|عربي|انجليزي)$/.test(fq)){
    if(/(pounds|\blbs?\b|رطل|باوند)/.test(fq))return {cmd:"app.unit",unit:"lb"};
    if(/(kilos|kilograms|\bkgs?\b|كيلو)/.test(fq))return {cmd:"app.unit",unit:"kg"};
    if(/(arabic|عربي|العربي)/.test(fq))return {cmd:"app.lang",lang:"ar"};
    if(/(english|انجليزي|الانجليزي)/.test(fq))return {cmd:"app.lang",lang:"en"};
    if(/(dark|night|غامق|دارك|ليلي)/.test(fq))return {cmd:"app.look",look:"dark"};
    if(/(light|bright|فاتح|لايت|نهاري)/.test(fq))return {cmd:"app.look",look:"light"};
    var pal=/(^| )(red|احمر)( |$)/.test(q)?"red":/(^| )(blue|ازرق)( |$)/.test(q)?"blue":/(^| )(mono|black and white|grey|gray|ابيض واسود|رمادي)( |$)/.test(q)?"mono":"";
    if(pal&&/(theme|colou?r|palette|ثيم|لون|الوان)/.test(fq))return {cmd:"app.palette",palette:pal};}

  /* ---- the plan ---- */
  var kc=fq.match(/(raise|increase|up|add|lower|reduce|decrease|cut|drop|زود|ارفع|قلل|نزل|اقل)( my| the|)? ?(calories|kcal|calorie target|السعرات|سعرات)( by| ب|)? ?(\d{2,4})?|(raise|increase|add|lower|reduce|cut|drop|زود|قلل|نزل) (\d{2,4}) ?(kcal|calories|سعر|سعرات)/);
  if(kc&&!asks){var by=+(kc[5]||kc[7]||0),down=/(lower|reduce|decrease|cut|drop|قلل|نزل|اقل)/.test(kc[1]||kc[6]||"");
    return {cmd:"plan.calories",kcal:by?(down?-by:by):0};}
  if(!asks&&/(change|switch|set|make|غير|حول|خلي)( my| the|)? ?(goal|هدف|الهدف|هدفي)/.test(fq)){
    var G=[["lose",/(lose|cut|fat loss|lean|shred|تنشيف|خساره|اخس|انشف)/],["gain",/(gain|bulk|build muscle|muscle|mass|size|تضخيم|عضل)/],
      ["strength",/(strength|stronger|strong|قوه)/],["recomp",/(recomp|both|الاتنين)/],["endurance",/(endurance|stamina|تحمل)/],
      ["athletic",/(athletic|sport|performance|رياضي)/],["mobility",/(mobility|flexib|مرونه)/]];
    for(var gi=0;gi<G.length;gi++)if(G[gi][1].test(fq.replace(/(goal|هدف|الهدف|هدفي)/,"")))return {cmd:"plan.goal",goal:G[gi][0]};
    return {cmd:"plan.goal",goal:""};}
  if(!asks&&/(make|build|create|generate|new|give me|اعمل|اعملي|ابني|جهز|جهزلي|عايز|عاوز)( me| a| my|)* ?(new |)(meal plan|diet plan|nutrition plan|خطه اكل|نظام اكل|خطه الاكل|نظام غذائي)/.test(fq))return {cmd:"go",to:"newmeals"};
  if(!asks&&/(back ?up|export)( my| the|)? ?(data|everything|log|)/.test(fq)&&!/how/.test(fq))return {cmd:"go",to:"backup"};
  if(!asks&&/(retake|redo|start|take) (the |my |)(assessment|questionnaire)|(اعيد|اعمل) (ال|)(تقييم)/.test(fq))return {cmd:"go",to:"assessment"};

  /* ---- going somewhere ---- */
  if(OPEN.test(fq)&&!asks){
    var rest=fq.replace(OPEN,"").trim();
    for(var i=0;i<PLACES.length;i++)if(PLACES[i][1].test(rest))return {cmd:"go",to:PLACES[i][0]};
    return {cmd:"go",to:""};}
  return null;}

export {commandOf, slang, whenIn};

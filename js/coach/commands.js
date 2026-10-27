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

function commandOf(text){
  var raw=String(text||"").trim(),fq=spell(fold(raw)),q=" "+fq+" ";
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
  /* "log 80 kg for 8", "80 x 8", "سجل ٨٠ في ٨" */
  var st=fq.replace(/[٠-٩]/g,function(d){return "٠١٢٣٤٥٦٧٨٩".indexOf(d);})
    .match(/^(log |log a set |log set |did |سجل |)(\d+(?:[.,]\d+)?) ?(kg|kgs|lb|lbs|كيلو|)? ?(x|×|for|by|في|ب) ?(\d{1,2}) ?(reps|rep|عده|عدات|)$/);
  if(st&&!asks)return {cmd:"set.log",w:+st[2].replace(",","."),unit:/lb/.test(st[3])?"lb":st[3]?"kg":"",r:+st[5]};

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

export {commandOf, whenIn};

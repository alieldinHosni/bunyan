/* Bunyan — exnames
   Compositional Arabic exercise names, plus applyLang(). */
import {S} from "../state.js";
import {exShort} from "../data/exercises.js";

/* ============================================================ exercise names
   873 names built from roughly 300 terms, so the terms are translated and the name
   is composed rather than translating every phrase by hand. That keeps terminology
   consistent, and it covers exercises the user adds later. Word order follows how
   these are actually said in a gym: movement first, equipment last behind "بالـ".
   Anything unknown stays in Latin script, which is what a bilingual lifter expects
   for a niche movement. Display only — the English name stays the data key. */
var EX_EQUIP={
  "barbell":"بالبار","dumbbell":"بالدمبل","dumbbells":"بالدمبل","cable":"بالكابل",
  "cables":"بالكابل","machine":"بالجهاز","lever":"بالجهاز","smith machine":"بالسميث","smith":"بالسميث",
  "kettlebell":"بالكتل بيل","kettlebells":"بالكتل بيل","band":"بالأستك","bands":"بالأستك",
  "ez bar":"بالبار المتعرج","medicine ball":"بالكرة الطبية","exercise ball":"بكرة التوازن",
  "stability ball":"بكرة التوازن","bosu ball":"بالبوسو","rope":"بالحبل","sled":"بالزحافة",
  "landmine":"باللاند ماين","trap bar":"بالتراب بار","weighted":"بوزن إضافي",
  "plate":"بالوزن","roller":"بالرولر","foam roll":"بالفوم رول"
};
var EX_TERMS={
/* movements */
"bench press":"بنش بريس","incline bench press":"بنش بريس مائل","press":"بريس",
"overhead press":"بريس علوي","military press":"بريس عسكري","shoulder press":"بريس كتف",
"chest press":"بريس صدر","leg press":"ليج بريس","push press":"بوش بريس",
"floor press":"بريس أرضي","squat":"سكوات","front squat":"سكوات أمامي",
"back squat":"سكوات خلفي","split squat":"سكوات مقسم","hack squat":"هاك سكوات",
"sissy squat":"سيسي سكوات","pistol squat":"سكوات برجل واحدة","goblet squat":"جوبلت سكوات",
"deadlift":"ديدليفت","romanian deadlift":"ديدليفت روماني","stiff leg deadlift":"ديدليفت برجل مفرودة",
"sumo deadlift":"ديدليفت سومو","rack pull":"راك بول","row":"تجديف","upright row":"تجديف عالي",
"bent over row":"تجديف منحني","seated row":"تجديف جالس","t bar row":"تجديف تي بار",
"inverted row":"تجديف مقلوب","curl":"كيرل","hammer curl":"هامر كيرل",
"preacher curl":"بريتشر كيرل","concentration curl":"كيرل تركيز","spider curl":"سبايدر كيرل",
"drag curl":"دراج كيرل","extension":"إكستينشن","leg extension":"ليج إكستينشن",
"triceps extension":"ترايسبس إكستينشن","back extension":"فرد الظهر","raise":"رفع",
"lateral raise":"رفرفة جانبي","front raise":"رفرفة أمامي","rear delt raise":"رفرفة خلفي",
"calf raise":"رفع سمانة","leg raise":"رفع رجل","hip raise":"رفع الورك",
"fly":"فلاي","flyes":"فلاي","reverse fly":"فلاي عكسي","pulldown":"بول داون",
"lat pulldown":"سحب أمامي","pullover":"بول أوفر","pull up":"عقلة","chin up":"عقلة عكسية",
"push up":"ضغط","dip":"متوازي","dips":"متوازي","lunge":"لانج","walking lunge":"لانج مشي",
"step up":"صعود درجة","crunch":"كرانش","sit up":"تمرين بطن","plank":"بلانك",
"side plank":"بلانك جانبي","shrug":"شراج","hip thrust":"هيب ثراست","glute bridge":"جسر المؤخرة",
"good morning":"جود مورنينج","skullcrusher":"سكال كراشر","skull crusher":"سكال كراشر",
"kickback":"كيك باك","pushdown":"بوش داون","face pull":"فيس بول","clean":"كلين",
"power clean":"باور كلين","hang clean":"هانج كلين","clean and jerk":"كلين آند جيرك",
"snatch":"سناتش","jerk":"جيرك","thruster":"ثراستر","swing":"سوينج","burpee":"بيربي",
"mountain climber":"ماونتن كلايمر","jump":"قفز","box jump":"قفز على الصندوق",
"jumping jack":"جامبينج جاك","farmers walk":"مشية الفلاح","carry":"حمل","hold":"ثبات",
"twist":"لف","russian twist":"لف روسي","woodchop":"وود تشوب","stretch":"إطالة",
"smr":"تدليك عضلي","rotation":"دوران","external rotation":"دوران خارجي",
"internal rotation":"دوران داخلي","pull through":"بول ثرو","pull":"سحب","press up":"ضغط",
"windmill":"طاحونة","turkish get up":"توركيش جيت أب","hyperextension":"فرد الظهر",
"reverse crunch":"كرانش عكسي","flutter kick":"رفرفة الرجلين","scissor kick":"مقص",
"leg curl":"ليج كيرل","wrist curl":"كيرل معصم","shoulder raise":"رفع الكتف",
"bridge":"جسر","superman":"سوبرمان","bird dog":"بيرد دوج","dead bug":"ديد باج",
"hollow hold":"هولو هولد","sprint":"عدو","run":"جري","walk":"مشي","bike":"عجلة",
"row machine":"جهاز التجديف","battle rope":"حبل القتال","wall sit":"جلوس على الحائط",
"calf press":"بريس سمانة","shoulder shrug":"شراج كتف","toe raise":"رفع الأصابع",
"neck flexion":"ثني الرقبة","neck extension":"فرد الرقبة",
"bench":"بنش","bar":"بار","pulley":"بكرة","knee":"ركبة","knees":"ركبتين","from":"من",
"up":"لأعلى","down":"لأسفل","circle":"دائرة","arm":"ذراع","arms":"ذراعين","box":"صندوق",
"over":"فوق","leverage":"جهاز","throw":"رمي","stance":"وقفة","split":"مقسم",
"straight":"مفرود","head":"رأس","crossover":"كروس أوفر","double":"مزدوج","power":"قوة",
"balance":"توازن","behind":"خلف","long":"طويل","hang":"معلق","hanging":"معلق","lift":"رفع",
"hop":"قفزة","one":"واحد","legged":"رجل","linear":"خطي","stiff":"مفرود","suspended":"معلق",
"ball":"كرة","against":"على","step":"خطوة","two":"اثنين","three":"ثلاثة","four":"أربعة",
"body":"جسم","bodyweight":"وزن الجسم","butt":"مؤخرة","hammer":"هامر","elbow":"كوع",
"prone":"منبطح","supine":"مستلقي","weight":"وزن","cross":"متقاطع","scapular":"لوح الكتف",
"lockout":"قفل","static":"ثابت","dynamic":"ديناميكي","tuck":"ضم","pike":"بايك",
"frog":"ضفدع","spider":"سبايدر","zercher":"زيرشر","jefferson":"جيفرسون","zottman":"زوتمان",
"arnold":"أرنولد","cuban":"كوبي","scott":"سكوت","bulgarian":"بلغاري","nordic":"نوردك",
"sumo":"سومو","conventional":"تقليدي","olympic":"أولمبي","atlas":"أطلس","stone":"حجر",
"tire":"إطار","sledgehammer":"مطرقة","battle":"قتال","agility":"رشاقة","ladder":"سلم",
"cone":"مخروط","hurdle":"حاجز","resistance":"مقاومة","warm":"إحماء","mobility":"مرونة",
"foam":"فوم","massage":"تدليك","release":"إطلاق","myofascial":"عضلي","trigger":"نقطة",
"point":"نقطة","rolling":"تدليك","roll":"تدليك","kick":"ركلة","drive":"دفع","hold":"ثبات",
"iso":"ثبات","tempo":"إيقاع","band":"أستك","chain":"سلسلة","chains":"سلاسل","rack":"راك",
"pin":"بن","deficit":"عجز","paused":"بتوقف","pause":"توقف","touch":"لمس","toe":"أصابع",
"toes":"أصابع","heel":"كعب","heels":"كعوب","finger":"إصبع","thumb":"إبهام","chin":"ذقن",
"face":"وجه","seat":"مقعد","incline bench":"بنش مائل","decline bench":"بنش منحدر",
"flat bench":"بنش مسطح","wall":"حائط","floor":"أرض","air":"هواء","jumping":"قفز",
"squatting":"سكوات","running":"جري","walking":"مشي","climbing":"تسلق","rowing":"تجديف",
"cycling":"دراجة","swimming":"سباحة","stretching":"إطالة","curling":"كيرل",
"push":"دفع","chair":"كرسي","block":"بلوك","elevated":"مرتفع","palm":"كف","palms":"كف",
"deltoid":"دالية","backward":"للخلف","forward":"للأمام","drag":"سحب","rollout":"رول أوت",
"medium":"متوسط","bend":"ثني","response":"استجابة","attachment":"وصلة","iron":"حديد",
"off":"من","depth":"عمق","ham":"خلفية الفخذ","flye":"فلاي","inner":"داخلي","outer":"خارجي",
"treadmill":"مشاية","pass":"تمرير","muscle":"عضلة","drill":"تدريب","speed":"سرعة",
"toucher":"لمس","bound":"وثب","tibialis":"الظنبوبية","trainer":"جهاز","board":"لوح",
"an":"","crawl":"زحف","bicycling":"دراجة","stationary":"ثابت","plyo":"بليومترك",
"plyometric":"بليومترك","rotator":"مدور","cuff":"كفة","serratus":"منشاري","erector":"ناصب",
"spinae":"الفقري","psoas":"القطنية","gluteus":"مؤخرة","medius":"أوسط","maximus":"كبير",
"minimus":"صغير","tensor":"موتر","fascia":"لفافة","latae":"عريضة","piriformis":"كمثرية",
"pectoralis":"صدرية","deltoids":"دالية","rhomboid":"معينية","teres":"مدورة",
"infraspinatus":"تحت الشوكة","supraspinatus":"فوق الشوكة","brachialis":"عضدية",
"brachioradialis":"عضدية كعبرية","soleus":"نعلية","gastrocnemius":"توأمية",
"lunges":"لانج","situp":"تمرين بطن","pushup":"ضغط","pullup":"عقلة","chinup":"عقلة عكسية",
"crunches":"كرانش","bends":"ثني","raises":"رفع","curls":"كيرل","rows":"تجديف",
"presses":"بريس","squats":"سكوات","jumps":"قفز","kicks":"ركلات","swings":"سوينج",
"twists":"لف","circles":"دوائر","holds":"ثبات","walks":"مشي","climbers":"تسلق",
"rope":"حبل","v":"V","bottom":"أسفل","position":"وضع","multiple":"متعدد",
"bradford":"برادفورد","rocky":"روكي","flip":"قلب","hand":"يد","hands":"يدين","car":"عربية",
"handle":"مقبض","leap":"وثبة","version":"نسخة","range":"مدى","hug":"ضم","exercise":"تمرين",
"jackknife":"جاك نايف","load":"حمل","style":"أسلوب","pronated":"قبضة علوية",
"supinated":"قبضة سفلية","around":"حول","world":"العالم","the world":"العالم",
"lever":"جهاز","standing":"واقف","dumbell":"بالدمبل","barbel":"بالبار","cheat":"غش",
"strict":"صارم","tempo":"إيقاع","superset":"سوبرسِت","drop":"دروب","rest":"راحة",
"good":"جود","morning":"مورنينج","clam":"محارة","shell":"صدفة","monster":"وحش",
"lateral walk":"مشي جانبي","banded":"بالأستك","mini":"صغير","giant":"عملاق",
"single":"مفرد","quick":"سريع","extended":"ممدود","facing":"مواجه","below":"تحت",
"parallel":"متوازي","jammer":"جامر","middle":"أوسط","your":"","slam":"سلام",
"open":"مفتوح","pallof":"بالوف","pelvic":"حوض","tilt":"إمالة","peroneal":"الشظوية",
"feet":"قدمين","foot":"قدم","rickshaw":"ريكشو","harness":"حزام","stride":"خطوة",
"thigh":"فخذ","thighs":"فخذين","all":"كل","diagonal":"قطري","renegade":"رينيجيد",
"anterior":"أمامي","posterior":"خلفي","anti":"مضاد","gravity":"جاذبية","axle":"أكسل",
"adduction":"تقريب","abduction":"إبعاد","apart":"متباعد","guillotine":"جيوتين",
"battling":"قتال","bear":"دب","powerlifting":"باور ليفتنج","skip":"نط",
"butterfly":"فراشة","judo":"جودو","driver":"سائق","fours":"أربع","four":"أربع",
/* modifiers */
"incline":"مائل","decline":"منحدر","flat":"مسطح","seated":"جالس","standing":"واقف",
"lying":"راقد","kneeling":"راكع","bent over":"منحني","bent":"منحني","close grip":"قبضة ضيقة","medium grip":"قبضة متوسطة","standard grip":"قبضة عادية",
"wide grip":"قبضة واسعة","reverse grip":"قبضة عكسية","neutral grip":"قبضة محايدة",
"underhand":"قبضة سفلية","overhand":"قبضة علوية","mixed grip":"قبضة مختلطة",
"grip":"قبضة","reverse":"عكسي","alternating":"بالتبادل","alternate":"بالتبادل",
"one arm":"بذراع واحدة","single arm":"بذراع واحدة","one leg":"برجل واحدة",
"single leg":"برجل واحدة","two arm":"بذراعين","front":"أمامي","side":"جانبي",
"lateral":"جانبي","rear":"خلفي","overhead":"علوي","behind the neck":"خلف الرقبة",
"behind neck":"خلف الرقبة","assisted":"بمساعدة","wide":"واسع","narrow":"ضيق",
"close":"ضيق","high":"عالي","low":"منخفض","half":"نصف","full":"كامل","partial":"جزئي",
"explosive":"انفجاري","slow":"بطيء","isometric":"ثبات","negative":"سلبي",
"palms up":"الكف لأعلى","palms down":"الكف لأسفل","cross body":"عبر الجسم",
"on knees":"على الركبتين","on bench":"على البنش","to chest":"للصدر","to floor":"للأرض",
"with bands":"بالأستك","with chains":"بالسلاسل","bosu":"بوسو","stability":"توازن",
"advanced":"متقدم","beginner":"مبتدئ","intermediate":"متوسط",
/* body parts */
"chest":"صدر","shoulder":"كتف","shoulders":"أكتاف","biceps":"بايسبس","bicep":"بايسبس",
"triceps":"ترايسبس","tricep":"ترايسبس","forearm":"ساعد","forearms":"سواعد","lat":"ظهر",
"lats":"ظهر","back":"ظهر","leg":"رجل","legs":"رجلين","calf":"سمانة","calves":"سمانة",
"glute":"مؤخرة","glutes":"مؤخرة","hamstring":"خلفية الفخذ","hamstrings":"خلفية الفخذ",
"quad":"أمامية الفخذ","quads":"أمامية الفخذ","quadriceps":"أمامية الفخذ","ab":"بطن",
"abs":"بطن","abdominal":"بطن","oblique":"جانبية البطن","obliques":"جانبية البطن",
"hip":"ورك","hips":"ورك","hip flexor":"عضلة الورك","neck":"رقبة","wrist":"معصم",
"ankle":"كاحل","adductor":"ضامة","abductor":"مبعدة","trap":"ترابيس","traps":"ترابيس",
"delt":"دالية","delts":"دالية","rear delt":"دالية خلفية","spine":"عمود فقري",
"groin":"أربية","chest and back":"صدر وظهر","upper":"علوي","lower":"سفلي","mid":"أوسط",
/* fillers */
"with":"بـ","and":"و","the":"","to":"","on":"على","in":"في","of":"","a":"","or":"أو"
};
/* In Arabic the modifier follows the noun, so these are collected and appended rather
   than left where English put them: "Standing Calf Raise" is "رفع سمانة واقف", not
   "واقف رفع سمانة". Listed as whole keys — splitting them on spaces would lose the
   two-word ones like "close grip". */
var EX_MODS={};
["incline","decline","flat","seated","standing","lying","kneeling","bent over","bent",
 "close grip","medium grip","standard grip","wide grip","reverse grip","neutral grip","mixed grip","grip","underhand",
 "overhand","reverse","alternating","alternate","one arm","single arm","one leg",
 "single leg","two arm","front","side","lateral","rear","overhead","behind the neck",
 "behind neck","assisted","wide","narrow","close","high","low","half","full","partial",
 "explosive","slow","isometric","negative","palms up","palms down","cross body",
 "on knees","on bench","to chest","to floor","with bands","with chains","advanced",
 "beginner","intermediate","elevated","medium","inner","outer","static","dynamic",
 "prone","supine","paused","stationary","backward","forward","single","double","long",
 "straight","stiff","suspended","hanging","weighted","pronated","supinated","extended",
 "quick","facing","below"].forEach(function(k){EX_MODS[k]=1;});
var EX_EQ_ORDER=Object.keys(EX_EQUIP).sort(function(a,b){return b.length-a.length;});
function exAr(name){
  if(!name)return name;
  var s=" "+String(name).replace(/[\-\/]/g," ").replace(/\s+/g," ").trim()+" ";
  /* equipment moves to the end as a prepositional phrase */
  var equip="";
  for(var i=0;i<EX_EQ_ORDER.length;i++){
    var k=EX_EQ_ORDER[i],at=s.toLowerCase().indexOf(" "+k+" ");
    if(at>-1){equip=EX_EQUIP[k];s=s.slice(0,at+1)+s.slice(at+2+k.length);break;}
  }
  var tok=s.trim().split(" ").filter(Boolean),core=[],mods=[],i2=0;
  while(i2<tok.length){
    var hit=false;
    for(var len=Math.min(4,tok.length-i2);len>=1;len--){
      var key=tok.slice(i2,i2+len).join(" ").toLowerCase().replace(/[^a-z0-9 ']/g,"").trim();
      if(!Object.prototype.hasOwnProperty.call(EX_TERMS,key)&&/s$/.test(key))
        key=key.replace(/s$/,"");
      if(Object.prototype.hasOwnProperty.call(EX_TERMS,key)){
        if(EX_TERMS[key])(EX_MODS[key]?mods:core).push(EX_TERMS[key]);
        i2+=len;hit=true;break;}
    }
    if(!hit){core.push(tok[i2]);i2++;}
  }
  var body=(core.length?core:mods).concat(core.length?mods:[]).join(" ").replace(/\s+/g," ").trim();
  return (body?body:name)+(equip?" "+equip:"");
}
/* Display only. Every lookup, favourite and session entry still keys off the English. */
/* Display only: the qualifier is shown separately, never glued back onto the name.
   The full English name remains the key everywhere it is stored. */
function exName(n){var s=exShort(n);return (S.prefs&&S.prefs.lang==="ar")?exAr(s):s;}
function applyLang(){
  var ar=S.prefs&&S.prefs.lang==="ar";
  document.documentElement.setAttribute("lang",ar?"ar":"en");
  document.documentElement.setAttribute("dir",ar?"rtl":"ltr");
}


export {applyLang, exName};

/* Bunyan — the coach's routing: a day told in one message, and the asking itself (js/ui/answers/route.js gathers them;
   road map step 4, 25 Nov: split by topic as it was, no answer's words or figures changed). */
import {t, tm} from "../../i18n/dict.js";
import {A, act, fill, l, list, n, p, src, uiLang, withLang} from "./kit.js";
import {planName} from "../../i18n/exnames.js";
import {isActivity} from "../../data/activities.js";
import {ACTION_IDS, factOf, fold, intentOf, situationOf} from "../../coach/intent.js";
import {classify as safetyOf} from "../../coach/safety.js";
import {muscleOf} from "../../data/exercises.js";
import {changeOf, retell, understand} from "../../coach/understand.js";
import {faqById, faqMatch} from "../../engine/faq.js";
import {guard} from "../../coach/guard.js";
import * as KB from "../../engine/kb.js";
import {lookup} from "../../engine/kbsearch.js";
import {answerPick, createAsk, namesExercise, namesFood, plan as planAction, planCommand, proceed, suggestExercises} from "../agent.js";
import {commandOf} from "../../coach/commands.js";
import {mealName, nextMeal} from "../../engine/meals.js";
import {FOODDB, foodName, gramsFor, nutritionFor, searchFoods, sumNutrition} from "../../engine/nutrition.js";
import {allowed} from "../../engine/mealplan.js";
import {recapOf} from "../../coach/recap.js";
import {S, split} from "../../state.js";
import {fmtN, num, today} from "../../util.js";
import {isReady} from "../smartcoach.js";
import {addDaysISO, planOn} from "../../engine/dayplan.js";
import {words} from "../coachwords.js";
import {ASK} from "../ask.js";
import {INGREDIENT, aLive, aUnknown} from "./answers.js";
import {FAQ_OVER, FAQ_STRONG, KEEP, MUSCLEWORD, checked, namedExercises, namedFood, ownQuestion} from "./route-core.js";
import {ELSEWHERE, SCOPE, scopeAnswer, scopeOf, told} from "./route-limits.js";
import {ANSWER, DEEPER, EXQ, LOGCMD, MORE, NO, OFFSESS, ONTO, SESSW, VERB, YES, decide, isQuestion, knowFor, lastExchange, namedOther, pruneChat, readCtx, readOf, route, verb0} from "./route-read.js";
import {rewrite, splitTwo, undoLast} from "./route-follow.js";

/* ---- a day told in one message (js/coach/recap.js) -------------------------------------
   The foods found (each in one usual serving unless the amount was said, which is said
   as an estimate), offered to the day with one tap and Undo; what could not be found
   named; the training noted (no sets are made up); and what else to do today: the
   protein and energy left, water, and rest for what was trained, tomorrow's plan
   included. */
/* A serving as stored ("1 × can", "100 g"), said in the reader's language. */
function shownLabel(l){return String(l||"").replace(/^(\S+ × )(.+)$/,function(_,a,u){return a+t(u);}).replace(/(\d) g$/,function(_,d){return d+" "+t("g");});}
function shownFood(f){return foodName(f);}
function findFood(q){
  var tries=[q],m=/^(.+?) (في|in a|in) (ساندوتش|sandwich|sandwiches)$/.exec(q);
  if(m)tries=["ساندوتش "+m[1],m[1]+" sandwich",m[1]];
  for(var i=0;i<tries.length;i++){
    var hits=searchFoods(tries[i],5).filter(function(h){return h.score>=85;});
    if(!hits.length)continue;
    var eat=hits.filter(function(h){return h.score>=hits[0].score-12&&!INGREDIENT.test(h.f.n);});
    return (eat[0]||hits[0]).f;}
  return null;}
/* A day told, and something in it the coach can act on: a food it knows, or a workout.
   "I had a bad day, didn't stick to the diet" reads like meals and is not one. */
function dayTold(q){
  var rc=recapOf(q);if(!rc)return null;
  var any=rc.muscles.length||rc.foods.some(function(f){return findFood(f.q)||(f.parts||[]).some(findFood);});
  return any?rc:null;}
var MUSCLEOF={Legs:["Quads","Hamstrings","Glutes","Calves"],Arms:["Biceps","Triceps"]};
function recapMsg(text,rc,L){
  var items=[],miss=[],guess=false;
  rc.foods.forEach(function(x){
    var list=[x.q],f=findFood(x.q);
    if(!f&&x.parts)list=x.parts;
    (f?[f]:list.map(findFood)).forEach(function(ff,k){
      if(!ff){miss.push(f?x.q:list[k]);return;}
      var gq=gramsFor(ff,1,null),n=nutritionFor(ff,gq.g);
      items.push({f:ff,g:gq.g,label:gq.label,meal:x.meal||nextMeal(today()),n:n});if(x.guess)guess=true;});});
  /* Today, with these added. */
  var now=today(),r=(S.days||{})[now]||{},had=[];
  Object.keys(r.meals||{}).forEach(function(k){had=had.concat((r.meals[k]&&r.meals[k].items)||[]);});
  var tot=sumNutrition(had.concat(items.map(function(i){return i.n;}))),G=S.goals||{};
  var notes=[];
  if(rc.muscles.length){
    var mm=rc.muscles.map(function(m){return tm(m).trim();}).join(uiLang()==="ar"?" و":" and ");
    var logged=(S.sessions||[]).some(function(s){return s.date===now&&(s.entries||[]).some(function(e){return !isActivity(e.name);});});
    if(!logged)notes.push(fill(t("I haven't logged the {m} workout: I don't know your sets, and I won't make them up. Add it in Training when you can."),{m:mm}));
    var tmw=addDaysISO(now,1),pd=planOn(split(),tmw),hit=false;
    if(pd&&pd.day&&!pd.rest){var mus={};(pd.day.ex||[]).forEach(function(e){mus[muscleOf(e.name)]=(mus[muscleOf(e.name)]||0)+num(e.sets);});
      rc.muscles.forEach(function(m){(MUSCLEOF[m]||[m]).forEach(function(x){if(num(mus[x])>=3)hit=true;});});}
    notes.push(fill(t(hit?"{m} trained today needs a rest day before it's trained hard again, and tomorrow's {d} trains it too: Training will offer a fresher day.":"{m} trained today: give it a rest day before training it hard again."),
      {m:mm,d:pd&&pd.day?planName(pd.day.name):""}));}
  if(num(G.p)){var pl=Math.round(num(G.p)-tot.p);
    if(pl>=15){var pf=["tuna_water","greek_yog_0","gebna_areesh","chicken_breast_ck","egg_boiled"].map(function(id){return (FOODDB||[]).filter(function(y){return y.id===id;})[0];}).filter(Boolean)
        .filter(function(y){return allowed(y,{diet:S.prefs.diet,avoid:S.prefs.avoid||[],powder:true});})[0];
      if(pf){var pg=gramsFor(pf,1,null),pn=nutritionFor(pf,pg.g);
        notes.push(fill(t("Protein: about {p} g still to go today. {f}, {a}, adds {x} g."),{p:pl,f:shownFood(pf),a:shownLabel(pg.label),x:Math.round(pn.p)}));}
      else notes.push(fill(t("Protein: about {p} g still to go today."),{p:pl}));}
    else notes.push(t("Protein: on target for today."));}
  if(num(G.kcal)){var kl=Math.round((num(G.kcal)-tot.kcal)/10)*10;
    notes.push(kl>=0?fill(t("About {k} kcal left for the day."),{k:fmtN(kl)}):fill(t("About {k} kcal over today's target. No need to make it up tomorrow: eat to target and the week evens out."),{k:fmtN(-kl)}));}
  var wl=num(G.water)-num(r.water);
  if(num(G.water)&&wl>200)notes.push(fill(t("Water: {l} L still to drink."),{l:(Math.round(wl/100)/10).toFixed(1)}));
  if(rc.muscles.length||rc.ask){var sl=KB.sleep();if(sl)notes.push(fill(t("Sleep {lo} to {hi} hours tonight: it's when the training pays off."),{lo:sl.min,hi:sl.max}));}
  if(miss.length)notes.push(fill(t("I couldn't tell which food “{q}” is, or how much: add it on Food so the day is complete."),{q:miss.join(uiLang()==="ar"?"، ":", ")}));
  if(items.length&&guess)notes.push(t("Amounts are one usual serving each, an estimate: change any of them on Food."));
  var lead=items.length?t("Here's your day as I read it. Add it?"):t("Here's what I'd do with the rest of today.");
  var ag=items.length?{s:"confirm",act:"food.logMany",p:{items:items.map(function(i){return {fid:i.f.id,g:i.g,label:i.label,meal:i.meal};})},
      lead:lead,items:items.map(function(i){return {item:shownFood(i.f)+" · "+mealName(i.meal),detail:shownLabel(i.label)+" · "+fill(t("{k} kcal · {p} g protein"),{k:fmtN(i.n.kcal),p:Math.round(i.n.p)})};}),
      notes:notes,cta:t("Add to my day"),done:t("Added to today."),undone:t("Undone. Today is as it was.")}
    :{s:"say",lead:lead,notes:notes,acts:[{l:t("Open Food"),a:{"data-tab":"food"}}]};
  return {q:text,id:"recap",at:Date.now(),b:[],acts:[],ag:ag,lang:L};}
function safetyReply(q,sf){
  var L=sf.lang==="ar"?"ar":"en";
  return withLang(L,function(){
    var text=String(q).trim().slice(0,300),a=A(),id="safety";
    if(sf.cls==="stop"){
      p(a,t("Stop training now. This can be an emergency: call your local emergency number or get to a doctor now."));
      if(S.active)act(a,t("End my workout"),{"data-finish":"1"});
      src(a,(KB.scopeRule("emergency_certified")||{}).src);}
    else if(sf.cls==="session"){
      p(a,t("Stop this session, sit down and sip some water. If it doesn't pass in a few minutes, or it comes back, see a doctor before you train again."));
      if(S.active)act(a,t("End my workout"),{"data-finish":"1"});
      act(a,t("Note it in the recovery log"),{"data-sheet":"recovery"});
      src(a,(KB.scopeRule("refer_unusual_pain")||{}).src);}
    else if(sf.sub==="care"){
      p(a,t("That sounds hard, and you don't have to carry it alone. Please talk to a doctor or someone you trust today."));
      src(a,(KB.scopeRule("refer_suspected_mental_illness")||{}).src);}
    else{id="scope";var sc=scopeOf(text);scopeAnswer(a,text,sc&&(sc[0]==="medical"||sc[0]==="mental")?sc:SCOPE[1]);}
    return {q:text,id:id,at:Date.now(),b:a.b,acts:a.acts,src:a.src&&a.src.length?a.src:undefined,lang:L,safety:sf.cls,ssub:sf.sub};});}
/* Whether a message is a red flag: then the on-device model never sees it. */
function isSafety(q){try{return !!safetyOf(q).cls;}catch(e){return false;}}

/* The coach's indexes (the knowledge search, the answer bank, the phrases, the food and
   exercise names) are built the first time they are used, which made the first question
   wait 60–100 ms (more on a phone) before the message even left the box. They are built
   when the chat opens instead, a piece per idle moment, before anything is typed. */
var WARM=false;
function warmCoach(){
  if(WARM)return;WARM=true;
  var steps=[function(){lookup("protein");},function(){faqMatch("how much protein");},function(){intentOf("how much protein");},
    function(){situationOf("i had a bad day");},function(){namesExercise("bench press");},function(){namesFood("rice");}];
  var idle=typeof requestIdleCallback==="function"?function(f){requestIdleCallback(f,{timeout:300});}:function(f){setTimeout(f,30);};
  (function next(){var f=steps.shift();if(!f)return;idle(function(){try{f();}catch(e){}next();});})();}
/* C-10 (docs/COACH-AGENT.md 2.8): what the coach could not read is kept on this phone,
   per profile, with the "Not what I asked" ones (S.missed, newest last, 200 at most):
   an answer of "not sure", "did you mean" or a correction keeps its question without a
   tap. Nothing is sent anywhere; the list is copied or exported as a file from Chat
   history, to be added to the evaluation set. */
var MISSIDS=/^(unknown|clarify|correction)$/;
function ask(q,id,lang){
  var m=askIn(q,id,lang);
  try{if(m&&!m.tap&&m.q&&!id&&MISSIDS.test(m.id||"")){
    S.missed=(Array.isArray(S.missed)?S.missed:[]).concat([{q:String(m.q).slice(0,300),id:String(m.id),at:Date.now(),lang:m.lang==="ar"?"ar":"en",how:"auto"}]).slice(-200);
    m.missKept=1;}}catch(e){}
  return m;}
function askIn(q,id,lang){
  /* A red flag is read before anything else, as said: never rewritten or split. */
  if(!id&&isSafety(q))return askOne(q,null,lang);
  /* A day told in one message is read whole, not cut in two. */
  if(!id&&S.onboarded&&FOODDB&&dayTold(q))return askOne(q,null,lang);
  if(!id&&S.onboarded){
    /* A correction or a follow-up the reading can re-tell goes there first (askOne),
       before the older rewrite, which only knows days and names in requests. */
    var R0=readOf(String(q).trim().slice(0,300),lastExchange()),d0=null;try{d0=decide(R0,String(q));}catch(e){d0=null;}
    if(d0&&d0.redo&&!d0.lang&&REDO<2){REDO++;var m0;try{m0=askOne(d0.redo,null,lang);}finally{REDO--;}
      if(m0&&!m0.tap){m0.qq=d0.redo;m0.q=String(q).trim().slice(0,300);}return m0;}
    var rw=null;try{rw=rewrite(q);}catch(e){rw=null;}
    if(rw){var mr=askOne(rw,null,lang);if(mr&&!mr.tap){mr.qq=rw;mr.q=String(q).trim().slice(0,300);}return mr;}
    var two=null;try{two=splitTwo(q);}catch(e){two=null;}
    if(two){var m1=askOne(two[0],null,lang);if(!m1||m1.tap)return m1;
      var m2=askOne(two[1],null,lang);if(!m2||m2.tap)return m1;
      if(m2.at<=m1.at)m2.at=m1.at+1;m1.pair=1;m2.pair=1;return m2;}}
  return askOne(q,id,lang);}
var REDO=0,FORCEL="";
function askOne(q,id,lang){
  pruneChat();
  /* Safety first: nothing else, the on-device model included, can answer a red flag. */
  if(!id){var sf=null;try{sf=safetyOf(q);}catch(e){sf=null;}
    if(sf&&sf.cls){var sm=safetyReply(q,sf);S.chat=(S.chat||[]).concat([sm]).slice(-KEEP);return sm;}}
  /* A short answer to the last question: yes or no to a change waiting for a tap is that
     tap (the caller runs it; nothing is added to the conversation). */
  var prev=id?null:lastExchange(),fq0=id?"":fold(q);
  if(prev&&prev.ag&&prev.ag.s==="confirm"&&(YES.test(fq0)||NO.test(fq0))){
    /* "No wait, tomorrow", "no, bench instead" (owner's test, 19 Nov): not only no. The
       card is declined and the request said again with what changed. */
    var more=NO.test(fq0)?fq0.replace(NO,"").replace(/^[ ,]+/,"").replace(/^((wait|sorry|actually|i meant|i mean|instead|make it|استني|قصدي|اقصد|بل)( |$))+/,"").trim():"";
    if(!more||REDO>=2)return {tap:YES.test(fq0)?{agok:String(prev.at)}:{agno:String(prev.at)}};
    prev.ag.s="declined";
    var rt=null;try{rt=retell(prev.qq||prev.q,changeOf(more,readCtx(null)));}catch(e){rt=null;}
    REDO++;var mn;try{mn=askOne(rt||more,null,lang);}finally{REDO--;}
    if(mn&&!mn.tap){mn.qq=rt||more;mn.q=String(q).trim().slice(0,300);}
    return mn;}
  var it=id?{id:id,ranked:[]}:intentOf(q);
  /* "yes" to a choice: the choice is still to make, so it is asked again. */
  if(prev&&prev.ag&&prev.ag.s==="pick"&&(YES.test(fq0)||NO.test(fq0))){
    var Lp=prev.lang==="ar"||prev.lang==="en"?prev.lang:uiLang();
    var again=withLang(Lp,function(){return {q:String(q).trim().slice(0,300),id:prev.id,at:Date.now(),b:[],acts:[],lang:Lp,
      ag:NO.test(fq0)?{s:"say",lead:t("Kept as it is."),acts:[]}:Object.assign({},prev.ag,{lead:t("Which one? Tap it, or say its name.")})};});
    S.chat=(S.chat||[]).concat([again]).slice(-KEEP);return again;}
  var L=FORCEL||(id?(lang==="ar"||lang==="en"?lang:uiLang()):it.lang==="ar"?"ar":"en");
  /* The sentence read (js/coach/understand.js): a correction or a follow-up is the last
     message said again with the change in it; anything else may pick its answer here. */
  var R=null,dz=null;
  if(!id&&S.onboarded){R=readOf(String(q).trim().slice(0,300),prev);try{dz=decide(R,String(q));}catch(e){dz=null;}it.reading=R;}
  if(dz&&dz.redo&&REDO<2){REDO++;var mr,fl=FORCEL;if(dz.lang)FORCEL=dz.lang;try{mr=askOne(dz.redo,null,L);}finally{REDO--;FORCEL=fl;}
    /* Read in English, a question is answered only by a written answer or a rule: a
       textbook passage found for the English words is not offered for the Arabic. */
    if(dz.lang&&mr&&(mr.id==="know"||mr.id==="unknown"||mr.id==="smart")){S.chat=(S.chat||[]).filter(function(x){return x!==mr;});dz=null;}
    else{if(mr&&!mr.tap){mr.qq=dz.redo;mr.q=String(q).trim().slice(0,300);}return mr;}}
  var msg=withLang(L,function(){
    var text=id?t(ASK[id]||""):String(q).trim().slice(0,300),iid=it.id,byR=false,ptext=text;
    /* The workout's own suggestion: a machine taken is a request, not a question. */
    if(id==="busy"){var cb=null;try{cb=planCommand({cmd:"ex.busy"});}catch(e){cb=null;}
      if(cb)return {q:text,id:"app",at:Date.now(),b:[],acts:cb.acts||[],ag:cb,lang:L};}
    if(!id){
      /* The hard limits first, whatever else the question seems to be. */
      var sit=null,cm=null;
      var rcp=null;
      if(scopeOf(text))iid="scope";
      else if(dz&&dz.cmd){var cr=null;try{cr=planCommand(dz.cmd);}catch(e){cr=null;}
        if(cr)return {q:text,id:"app",at:Date.now(),b:[],acts:cr.acts||[],ag:cr,lang:L};}
      else if(dz&&dz.say)return {q:text,id:"app",at:Date.now(),b:[],acts:dz.say.acts||[],ag:dz.say,lang:L};
      else if(dz&&dz.id){iid=dz.id;byR=true;if(dz.text)ptext=dz.text;if(dz.force)it.force=dz.force;if(dz.p)it.p=dz.p;if(dz.faq)it.faq=dz.faq;if(dz.rate)it.rate=dz.rate;}
      /* A day told in one message: what was eaten and trained, "what else", "put it in
         my day" (js/coach/recap.js). */
      else if(S.onboarded&&FOODDB&&(rcp=dayTold(text)))return recapMsg(text,rcp,L);
      /* Something to do in the app: it is done, or asked for, the way its button does. */
      else if(S.onboarded&&(cm=commandOf(text,S.prefs.unit))&&!(LOGCMD.test(cm.cmd)&&isQuestion(text))){
        var cg=null;try{cg=cm.cmd==="undo.last"?undoLast():planCommand(cm);}catch(e){cg=null;}
        if(cg)return {q:text,id:"app",at:Date.now(),b:[],acts:cg.acts||[],ag:cg,lang:L};}
      /* A report rather than a question or a request: one question back. */
      else if(!VERB.some(function(v){return v[0]!=="foodlog"&&v[1].test(fold(text));})&&(sit=situationOf(text))){iid="situation";it.sit=sit;}
      else if(factOf(text))iid="remember";
      else if(!byR){iid=route(iid,text,it);
        /* A general question the written answers know well: that answer, before a rule
           that only shares a word with it ("weights" in "cardio before or after weights"). */
        if(R&&R.kind==="knowledge"&&!R.topic&&ACTION_IDS.indexOf(iid)<0){var fk=null;try{fk=faqMatch(text);}catch(e){fk=null;}
          if(fk&&fk.score>=FAQ_STRONG){iid="faq";it.faq=fk.f;byR=true;}
          /* A question about how things are ("does muscle turn into fat", "the difference
             between…") is not answered with the person's own figures: the written answer
             for it if there is one, else an honest miss, better than an answer to
             something else. */
          else if(/^(does|do|is|are|will|can) (muscle|fat|lifting|cardio|weights|machines|it|stretching|protein|carbs|sugar)|difference between|turn into|turns into|become fat|الفرق بين|بيتحول|بتتحول|تتحول|يتحول|هيتحول|هتتحول/.test(R.norm)
            &&/^(weights|calories|weight|protein|strong|track|today|eat|steps|water)$/.test(iid)){if(fk){iid="faq";it.faq=fk.f;}else iid="unknown";byR=true;}}}
      /* Not phrased as anything known, but it names an exercise in the plan, or a
         food by its name: that is what it is about. A near miss is not a match. */
      /* A question the answer bank was written for (js/data/faq.js): it answers when
         nothing else knew the question, or when the rule the words touched is one the
         answer may stand in for (its beats): "are carbs bad" shares a word with the
         calorie target, but asks about carbs. Requests, logging and the limits never
         come here. */
      var picking=prev&&prev.ag&&prev.ag.s==="pick",fqx=fold(text);
      if(!byR&&iid!=="scope"&&iid!=="situation"&&iid!=="remember"&&ACTION_IDS.indexOf(iid)<0&&!picking
        &&!(ELSEWHERE.some(function(x){return x[1].test(fqx);})&&/(^| )(my|mine|whats my|بتاعي|بتاعتي|عندي|طولي|عمري|سني)( |$)/.test(fqx))){
        var fm=null;try{fm=faqMatch(text);}catch(e){fm=null;}
        /* A follow-up to an answer from the bank ("why?", "but how many hours?") is read
           with the question before it. */
        var fprev=prev&&prev.id==="faq"&&prev.faq?faqById(prev.faq):null;
        if(fprev&&fqx.split(" ").length<=6){
          if(DEEPER.test(fqx)&&!fm)fm={f:fprev,score:1};
          else if(ONTO.test(fqx)){var fm2=null;try{fm2=faqMatch(String(prev.q||"")+" "+text);}catch(e){fm2=null;}if(fm2&&fm2.f.id===fprev.id)fm=fm2;}}
        var many=fold(text).split(" ").length>2;
        if(fm&&(iid==="unknown"||(iid==="thanks"||iid==="hello")&&many
          ||fm.f.beats.indexOf(iid)>=0&&fm.score>=FAQ_OVER&&!ownQuestion(text,iid)
          /* A very close answer against a rule the words barely touched ("are sweets
             ruining my diet" brushing "running" in the steps rule). */
          ||fm.score>=FAQ_STRONG&&(it.score||0)<=8&&!ownQuestion(text,iid)&&!/^(today|tomorrow|goal)$/.test(iid))){iid="faq";it.faq=fm.f;}}
      /* In a workout, the workout first: anything not plainly about something else is
         answered for the exercise on screen (aLive). A question the bank answers, or one
         the knowledge base does, goes there only when it does not speak of the session. */
      if(byR){}
      else if(S.active&&!picking&&!OFFSESS.test(fqx)&&(/^(unknown|today|track|week|tomorrow|goal|plan)$/.test(iid)
        ||/^(faq|know|krest|kreps|ksets|weights)$/.test(iid)&&SESSW.test(fqx)&&!namedOther(text)))iid="live";
      /* "How do I add another profile", "how do I delete a workout": the words of a
         request, about something that is not an exercise or a food. A question the bank
         answers well goes there instead of a request with nothing to act on. */
      else if(/^(exadd|exremove|exswap|foodlog)$/.test(iid)&&!verb0(text)){
        var fa=null;try{fa=faqMatch(text);}catch(e){fa=null;}
        if(fa&&fa.score>=FAQ_OVER&&fa.f.group==="app"&&!(iid==="foodlog"?namesFood(text):namesExercise(text))){iid="faq";it.faq=fa.f;}}
      if(iid==="unknown"&&!byR){
        if(namedExercises(text).length)iid="weights";
        else if(FOODDB&&!YES.test(fold(text))&&!NO.test(fold(text))&&namedFood(text,true))iid="foodinfo";}}
    /* A follow-up: the answer to the last pick ("Is it pull ups?", "the second one"),
       or the same request again for something else ("and squats"). */
    if(!id&&!byR&&prev&&iid!=="scope"&&iid!=="situation"&&iid!=="remember"){
      if(prev.ag&&prev.ag.s==="pick"&&(iid==="unknown"||iid===prev.id||MORE.test(fold(text)))){
        var nx=null;try{nx=answerPick(prev.ag,text);}catch(e){nx=null;}
        if(nx)return {q:text,id:prev.id,at:Date.now(),b:[],acts:nx.acts||[],ag:nx,lang:L};}
      if(/^(exadd|exremove|exswap|foodlog)$/.test(prev.id)&&(iid==="unknown"||MORE.test(fold(text)))
        &&(prev.id==="foodlog"?namesFood(text):namesExercise(text.replace(MORE,""))))iid=prev.id;}
    /* "What exercises for chest?", "best exercise for glutes at home", "تمارين صدر": the
       library, chosen for this person (js/ui/agent.js suggestExercises). */
    if(!id&&!byR&&S.onboarded&&iid!=="scope"&&iid!=="situation"&&!/^(exadd|exremove|exswap)$/.test(iid)&&EXQ.test(fold(text))){
      var mw=MUSCLEWORD.filter(function(x){return x[1].test(fold(text));})[0];
      if(mw){var sg=null;try{sg=suggestExercises(mw[0]);}catch(e){sg=null;}
        if(sg)return {q:text,id:"exsuggest",at:Date.now(),b:[],acts:sg.acts||[],ag:sg,lang:L};}}
    if(!id&&!byR&&iid!=="scope"&&iid!=="situation"&&iid!=="remember"){
      var kn=null;try{kn=knowFor(text,iid,it,prev);}catch(e){kn=null;}
      /* A question met only loosely, by a textbook passage (no rule knew it, or the rule
         it touched is not what it asks): with the smart coach on, it answers instead, from
         the same passages and the person's own figures (js/engine/smart.js). Owner, 28 Oct:
         "How to create two sessions then?" got a passage about session 1 of a phase. */
      if(kn&&!kn.deeper&&!id&&S.onboarded&&isReady()){kn=null;iid="unknown";}
      /* A passage is never the answer (C-4): it only points the nearest offers. */
      if(kn){iid="unknown";it.near=kn.k;}}
    if(ACTION_IDS.indexOf(iid)>=0&&iid!=="reassess"&&S.onboarded){
      /* Food said with Arabic digits or the dual ("بيضتين"): the amounts as numbers. */
      if(iid==="foodlog"&&!byR&&R&&R.lang==="ar"&&R.norm)ptext=R.norm;
      var ag=null;try{ag=planAction(iid,ptext,it);}catch(e){ag=null;}
      if(ag)return {q:text,id:iid,at:Date.now(),b:[],acts:ag.acts||[],ag:ag,lang:L};
      iid="unknown";}
    /* Nothing the rules know: the smart coach, when it is on and loaded, writes the
       answer (js/ui/smartcoach.js run), into this row as it comes. */
    if(iid==="unknown"&&!id&&S.onboarded&&isReady())return {q:text,id:"smart",at:Date.now(),b:[{p:""}],acts:[],lang:L,pending:true};
    var a=A(),fn=ANSWER[iid]||aUnknown;
    if(!S.onboarded&&/^(today|tomorrow|weights|eat|rest|swap|weight|protein|calories|missed|balance|goal|exadd|exremove|exswap|foodlog|weighlog|kreps|ksets|krest|kfreq|kvolume|kdur)$/.test(iid)){
      p(a,t("First, the assessment: a few questions, and the coach builds your targets, training and meals. Then I can answer from your own plan."));
      act(a,t("Start the assessment"),{"data-setup":"1"});}
    else{try{fn(a,text,it);}catch(e){a=aUnknown(A());}
      /* The last check (js/coach/guard.js): an answer that breaks the contract is not
         sent; the coach says it is not sure, with the nearest things it can do. */
      if(!id&&!a.ag&&iid!=="unknown"){var gd=checked(a,iid,R);
        if(!gd.ok){a=aUnknown(A(),text,it);iid="unknown";it.guard=gd.why;}}}
    /* A shaky reading (intent.js unsure): the answer, and under it the other things the
       words could have meant, one tap each (owner, 27 Oct). */
    var alt=!id&&it.unsure&&iid===it.id?(it.ranked||[]).filter(function(x){return x!==iid&&ACTION_IDS.indexOf(x)<0&&ASK[x];}).slice(0,2):[];
    return {q:text,id:iid,at:Date.now(),b:a.b,acts:a.acts,src:a.src&&a.src.length?a.src:undefined,ag:a.ag,lang:L,kq:iid==="know"?it.kq:undefined,
      faq:iid==="faq"?it.faq.id:undefined,
      alt:alt.length?alt:undefined};});
  S.chat=(S.chat||[]).concat([msg]).slice(-KEEP);
  return msg;}
/* A choice tapped on a pick: said as the person's own line, then the request goes on
   with it filled in. None of these: where the thing can be found instead. */
function follow(at,i){
  var m=(S.chat||[]).filter(function(x){return x&&x.at===+at;})[0];if(!m||!m.ag)return null;
  var L=m.lang==="ar"||m.lang==="en"?m.lang:uiLang(),ag=m.ag;
  if(i==null)return withLang(L,function(){
    /* Under the closest exercises to add: then it is one of their own, made here. */
    if(ag.act==="exercise.add"&&ag.p&&ag.p.q){
      var own={q:t("None of these"),id:m.id,at:Date.now(),b:[],acts:[],lang:L,ag:createAsk(ag.p.q,{day:ag.p.day||""})};
      S.chat=(S.chat||[]).concat([own]).slice(-KEEP);return own;}
    /* One of several foods: that one is named as not in the list, and the rest go on. */
    if(ag.act==="food.logMany"){var nm=null;try{nm=proceed(ag,"");}catch(e){nm=null;}
      if(nm){var om={q:t("None of these"),id:m.id,at:Date.now(),b:[],acts:nm.acts||[],ag:nm,lang:L};S.chat=(S.chat||[]).concat([om]).slice(-KEEP);return om;}}
    var none={q:t("None of these"),id:m.id,at:Date.now(),b:[],acts:[],lang:L,ag:ag.what==="food"
      ?{s:"say",lead:t("Then it isn't in the food list. Food can add it as one of your own foods."),acts:[{l:t("Open Food"),a:{"data-tab":"food"}}]}
      :{s:"say",lead:t("Then it isn't in the library. The picker on any day lists every exercise, and can add one of your own."),acts:[{l:t("Open Training"),a:{"data-tab":"train"}}]}};
    S.chat=(S.chat||[]).concat([none]).slice(-KEEP);return none;});
  var o=(ag.opts||[])[+i];if(!o)return null;
  if(ag.act==="food.info")return ask(o.l,null,L);
  return withLang(L,function(){
    var nx=null;try{nx=proceed(ag,o.v);}catch(e){nx=null;}
    if(!nx)nx={s:"say",lead:t("That didn't go through. Nothing was changed."),acts:[]};
    var msg={q:o.l,id:m.id,at:Date.now(),b:[],acts:nx.acts||[],ag:nx,lang:L};
    S.chat=(S.chat||[]).concat([msg]).slice(-KEEP);return msg;});}
function findMsg(at){return (S.chat||[]).filter(function(x){return x&&x.at===+at;})[0]||null;}

export {FORCEL, MISSIDS, MUSCLEOF, REDO, WARM, ask, askIn, askOne, dayTold, findFood, findMsg, follow, isSafety, recapMsg, safetyReply, shownFood, shownLabel, warmCoach};

/* Bunyan — what the app says about where you are
   The plain answers Progress → Simple shows, the weight trend's verdict in words, and
   the names of the judged lifts. Shared by Progress and the coach chat, so the two never
   disagree, and kept out of both views so neither takes logic from the other. Text and
   numbers only; each view draws them its own way. */
import {t} from "../i18n/dict.js";
import {exName} from "../i18n/exnames.js";
import {planOn} from "../engine/dayplan.js";
import {weekDates} from "../engine/schedule.js";
import {daysBetween, nutrition, recentRecords, strengthIndex, weightChange, weightTrend} from "../engine/stats.js";
import {S, split} from "../state.js";
import {fmtW, toDisp, wUnit} from "../units.js";
import {esc, num, today} from "../util.js";

/* ---- the weight trend against the goal ------------------------------------------ */
var TREND={
  lose:{ok:"On track for fat loss.",
        slow:"Slower than the goal. If it holds for two more weeks, eat about 100–200 kcal a day less.",
        fast:"Faster than it needs to be. Eating a little more protects muscle and is easier to keep up.",
        wrong:"The trend is going up. Check that the meals you log match what you eat, and give it two weeks."},
  gain:{ok:"On track to build muscle with little fat.",
        slow:"Slower than the goal. Add about 100–200 kcal a day.",
        fast:"Faster than muscle can be built, so most of the extra is fat. Trim about 100–200 kcal a day.",
        wrong:"The trend is going down. Eat about 200 kcal a day more."},
  hold:{ok:"Holding steady.",
        down:"Drifting down. If that is not the plan, eat a little more.",
        up:"Drifting up. If that is not the plan, eat a little less."}};

/* What the trend says, by the way the goal leans. On plan, a goal that only leans that
   way (losing fat while building muscle, getting stronger) is not told it is losing
   fat or building muscle. */

function trendSays(tr){
  if(tr.status==="ok"&&tr.goal!==tr.kind)return "On track for your goal.";
  return (TREND[tr.kind]||{})[tr.status]||"";}

var OPL_NAME={squat:"Squat",bench:"Bench press",deadlift:"Deadlift"};

/* The five answers, as data: Simple shows them as cards, and the coach chat says them
   when asked how things are going, so the two never disagree. head may hold <b>. */

function simpleFacts(){
  var now=today(),sp=split(),h=[];
  function scard(k,state,head,line,cta){h.push({k:k,state:state,head:head,line:line,cta:cta||""});}
  /* Training: this week's planned days, and how many are done. */
  var done=0,plan=0,due=0;
  weekDates(now).forEach(function(iso){var p=planOn(sp,iso);
    if(p.kind==="done"){done++;plan++;due++;return;}
    if(p.kind==="past"||p.kind==="none"||p.rest)return;
    plan++;if(iso<=now)due++;});
  var month=S.sessions.filter(function(x){return daysBetween(x.date,now)<28&&x.date<=now;}).length;
  if(!plan)scard(t("Training"),"none",esc(t("Nothing planned this week")),t("Plan your week in Coach, and it shows here."),
    '<button class="btn g sm" data-csec="train">'+t("Plan my training")+'</button>');
  else scard(t("Training"),done>=due?"ok":"warn",
    '<b>'+done+'</b> '+esc(t("of"))+' <b>'+plan+'</b> '+esc(t("workouts this week")),
    (done>=plan?t("Every planned workout this week is done."):done>=due?t("On schedule. {n} to go this week.").replace("{n}",plan-done)
      :t("Behind this week: {n} planned so far, {d} done.").replace("{n}",due).replace("{d}",done))
    +" "+t("{n} in the last four weeks.").replace("{n}",month));
  /* Weight: where it is and which way it is going, against the goal. */
  var wc=weightChange(),tr=weightTrend();
  if(!wc)scard(t("Weight"),"none",esc(t("No weigh-ins yet")),t("Weigh in once a week, in the morning before eating, and your trend starts here."),
    '<button class="btn g sm" data-sheet="weigh">'+t("Log weight")+'</button>');
  else{
    var ch=wc.d==null?"":(wc.d<0?t("Down {w} in {n} days."):wc.d>0?t("Up {w} in {n} days."):t("The same as {n} days ago.")).replace("{w}",fmtW(Math.abs(wc.d))).replace("{n}",wc.days);
    var tw=tr?[tr.status==="ok"?"ok":tr.status==="wrong"?"bad":"warn",trendSays(tr)]:null;
    scard(t("Weight"),tw?tw[0]:"none",'<b>'+toDisp(wc.cur.weight)+'</b> '+esc(wUnit()),
      (ch?ch+" ":"")+(tw?t(tw[1]):t("A few more weigh-ins over two weeks show your trend.")));}
  /* Strength: the most trained lifts' estimated maxes over the month. */
  var si=strengthIndex(30);
  if(si.pct==null)scard(t("Strength"),"none",esc(t("Not enough yet")),t("Log the same lifts a few times and this shows whether you are getting stronger."));
  else{var up=si.pct>=0.5,down=si.pct<=-0.5;
    scard(t("Strength"),up?"ok":down?"warn":"ok",esc(t(up?"Getting stronger":down?"A little down":"Holding steady")),
      up?t("Your main lifts are up {n}% this month.").replace("{n}",Math.round(si.pct))
        :down?t("Your main lifts are down {n}% this month. A lighter week often brings them back.").replace("{n}",Math.abs(Math.round(si.pct)))
        :t("Your main lifts are about where they were a month ago."));}
  /* Food: days logged in the last week, and protein on them. */
  var nu=nutrition(7),g=S.goals||{},pdays=nu.days.filter(function(x){return g.p>0&&num(x.p)>=g.p*0.9;}).length;
  if(!nu.count)scard(t("Food"),"none",esc(t("Nothing logged this week")),t("Log what you eat and this shows how close you are to your targets."),
    '<button class="btn g sm" data-tab="food">'+t("Log food")+'</button>');
  else scard(t("Food"),nu.count>=5&&pdays>=nu.count*0.7?"ok":"warn",
    '<b>'+nu.count+'</b> '+esc(t("of"))+' <b>7</b> '+esc(t("days logged")),
    t("Protein reached on {p} of them; calories, protein, carbs and fat all close to target on {m}.").replace("{p}",pdays).replace("{m}",nu.met));
  /* Records: anything new this month. */
  var rec=recentRecords(3).filter(function(L){return daysBetween(L.date,now)<=30;});
  if(rec.length)scard(t("New records"),"ok",'<b>'+rec.length+'</b> '+esc(t("new this month")),
    rec.map(function(L){return exName(L.name)+" "+(L.w?fmtW(L.w)+" × "+L.reps:L.reps+" "+t("reps"));}).join(" · "));
  return h;}

export {OPL_NAME, simpleFacts, TREND, trendSays};

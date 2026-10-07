/* Bunyan — app shell
   Moving around the app and answering sheets: the dock and the section switches, the
   confirm and name prompts, closing a sheet, back, any sheet opened by name, and the
   date bar Food, Training and Progress share. */
import {t} from "../../i18n/dict.js";
import {today} from "../../util.js";
import {ACT, closeSheet, openSheet, runAct, val} from "../actions.js";
import {shiftDay} from "../datebar.js";
import {goBack, resetNav} from "../nav.js";
import {render} from "../render.js";
import {toast, V} from "../view.js";
import {requestCloseSheet, toCoach} from "./common.js";
import {has, key, on} from "./registry.js";

/* What this module answers. app.js calls register() once, at boot, in the order
   the branches are tried in (see registry.js). */
function register(){
  ACT.dropsheet=function(){closeSheet();};
  on(function(D,el){return D.stop!==undefined&&!el.matches("button");},function(D,el,ev,cx){
    if(cx.typingAsk&&ev.target.id!=="askv")document.activeElement.blur();
    return;});
  has("close",function(D,el,ev,cx){
    if(cx.typingAsk&&!el.matches("button")){document.activeElement.blur();return;}
    requestCloseSheet();return;});
  /* Cancelling the discard prompt has to give the half-typed food back, otherwise
     "Cancel" would throw away exactly what it promised to keep. */
  has("restore",function(){var kp=(V.sd||{}).back||{};openSheet("manual",kp);return;});
  has("askok",function(){
    var ao=V.sd||{},av=val("askv");
    if(ao.required!==false&&!String(av).trim()){toast(t("Enter something first."));return;}
    runAct(ao.act,av);return;});
  has("confirmok",function(){runAct((V.sd||{}).act,true);return;});
  has("confirmalt",function(){runAct((V.sd||{}).altact,true);return;});
  /* A tab is a change of place, not a step deeper, so it starts a fresh trail. */
  /* A tab tap is a fresh start: the top of the page, and Food on today — a past
     date left selected from earlier was where a meal logged later could land. */
  key("tab",function(D){resetNav();var tb=D.tab==="home"?"train":D.tab,same=V.tab===tb,top=same&&V.train==="days"&&!V.meal&&!V.smeal&&!V.phist&&!V.pslot&&!V.pimport&&!V.chat;
    V.tab=tb;V.train="days";V.meal=null;V.smeal=null;V.pslot=null;V.pimport=false;V.chat=false;V.advall=false;V.phist=false;V.dnavDir=0;V.assess=false;V.pcheck=false;
    /* Tapping a tab while already at its top goes back to its first view. */
    if(tb==="train"&&top)V.tdate=null;
    if(tb==="food"&&top)V.fdate=null;
    if(tb==="progress"&&top){V.ptab="overview";V.pview="simple";}
    if(tb==="food"&&!same)V.fdate=null;
    render();if(!same)window.scrollTo(0,0);return;});
  /* Same reset as a tab tap: it is the same kind of move. Without V.train it landed
     on the Train tab still showing whatever sub-view was open, with an empty stack
     behind it — a day view whose back arrow now correctly hides, and nothing to
     return to but the tab bar. */
  key("go",function(D){resetNav();V.tab=D.go;V.train="days";V.meal=null;V.smeal=null;V.pslot=null;V.pimport=false;V.chat=false;V.phist=false;V.assess=false;V.pcheck=false;render();return;});
  /* Food's old sections: today is the Food page; the plan, targets and foods of your
     own are planned in Coach → Nutrition. */
  key("fsec",function(D){if(D.fsec==="today"){if(V.sheet)closeSheet();resetNav();V.tab="food";V.fdate=null;V.train="days";
      V.meal=null;V.smeal=null;V.pslot=null;V.pimport=false;V.chat=false;V.assess=false;V.pcheck=false;render();window.scrollTo(0,0);return;}
    toCoach("food",D.fsec==="foods"?"foods":D.fsec==="targets"?"targets":"plan");return;});
  /* Coach's sections, and the views inside Training and Nutrition. A line of Coach AI's
     plan carries both, so it lands on the very view. */
  on(function(D){return D.csec||D.ctsub||D.cfsub;},function(D){toCoach(D.csec||(D.ctsub?"train":D.cfsub?"food":null),D.ctsub||D.cfsub);return;});
  key("reorder",function(D){V.reorder=V.reorder===D.reorder?null:D.reorder;render();return;});
  /* Train's old sections: today is the Training page; the program and the others are
     planned in Coach → Training. */
  key("tsec",function(D){if(D.tsec==="today"){if(V.sheet)closeSheet();resetNav();V.tab="train";V.train="days";V.tdate=null;
      V.meal=null;V.smeal=null;V.assess=false;V.pcheck=false;render();window.scrollTo(0,0);return;}
    toCoach("train",D.tsec==="explore"?"programs":"program");return;});
  /* Every back affordance in the app comes through here, so none of them can drift
     to a destination of its own. Discarding a session is now part of going back
     rather than a separate link. */
  has("back",function(){goBack();return;});
  key("sheet",function(D){openSheet(D.sheet);return;});


  /* ---- date bar, both screens ----------------------------------------------
     One set of handlers for the one component in js/ui/datebar.js. Progress and Food
     previously had their own, and the copies had drifted: Progress's day arithmetic
     omitted the timezone correction, so east of UTC "previous day" skipped one.
     Which day a screen owns is the only thing that differs, so that is the only thing
     these branches branch on. Food stores null for today because curDate() treats null
     as "follow the clock", which keeps the tab correct across midnight. */
  /* Train has its own day too, and is the one screen that looks ahead: it shows what
     the plan holds for tomorrow and after. Food and Progress stop at today. */
  function dbGet(){ return V.tab==="food"?(V.fdate||today()):V.tab==="train"?(V.tdate||today()):(V.pdate||today()); }
  function dbSet(iso){
    if(iso>today()&&V.tab!=="train")return;      /* no logging into the future */
    var was=dbGet();
    V.dnavDir=iso>was?1:iso<was?-1:0;
    if(V.tab==="food")V.fdate=(iso===today())?null:iso;
    else if(V.tab==="train")V.tdate=(iso===today())?null:iso;
    else V.pdate=iso;
  }
  function calOpen(on){
    if(V.tab==="food")V.fcal=on; else if(V.tab==="train")V.tcal=on; else V.pcal=on;}
  function calIsOpen(){return V.tab==="food"?V.fcal:V.tab==="train"?V.tcal:V.pcal;}
  /* A day card on Train moves the date navigator to that day. */
  key("tday",function(D){dbSet(D.tday);calOpen(false);render();window.scrollTo(0,0);return;});
  has("dday",function(D){
    dbSet(+D.dday===0?today():shiftDay(dbGet(),+D.dday));
    render();return;});
  has("dopen",function(D){
    calOpen(!calIsOpen());
    V.cal=0;render();return;});
  has("dmonth",function(D){V.cal+= +D.dmonth;render();return;});
  key("dpick",function(D){
    dbSet(D.dpick);
    calOpen(false);
    render();return;});}

export {register};

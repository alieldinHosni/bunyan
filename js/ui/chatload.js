/* Bunyan — the coach chat, loaded on demand (WP-9, docs/NEXT-PHASE.md).
   js/ui/views/chat.js and what it alone pulls in (js/ui/agent.js, js/coach/understand.js
   and a few small ones, about 330 KB) are not needed to draw the first screen. They load
   when the phone is idle after it (requestIdleCallback, or 2 s), or at once when
   something needs them sooner: the panel opening, a question chip, a sheet that shows
   the chat's history or an InBody reading. The service worker precaches chat.js as it
   always has, so offline it loads from the cache.
   chat()      the chat module, or null while it is not in yet
   loadChat()  a promise of it; started once
   wanted()    something drew a placeholder for want of it: when it lands, the app
               draws again (the redraw set by app.js), once
   idleChat()  start loading when idle, and warm the coach's matchers when in */
import {arabicReady, loadArabic} from "../i18n/dict.js";
var C=null,wait=null,want=false,redraw=null;
function chat(){return C;}
function loadChat(){
  if(!wait)wait=import("./views/chat.js").then(function(m){C=m;if(want&&redraw){want=false;redraw();}return m;});
  return wait;}
function wanted(){want=true;loadChat();}
function onChatIn(fn){redraw=fn;}
/* Not before the first screen has settled (road map step 3, 25 Nov): while the app's own
   modules are still arriving the page counts as idle, and the chat (and the coach's
   indexes, 170 ms of work on a laptop) loaded then, in the middle of the start. */
var AFTER_START=3000;
function idleChat(){
  var idle=window.requestIdleCallback||function(f){return setTimeout(f,2000);};
  setTimeout(function(){idle(function(){loadChat().then(function(m){m.warmCoach();});},{timeout:4000});},AFTER_START);}
/* Before a question is answered: an Arabic one (its letters, or a chip of an Arabic
   conversation) waits for the Arabic dictionary (js/i18n/ar.js), which the English app
   loads only when idle. Without it the answer came out in English, the chest-pain
   emergency answer among them (coach evaluation safety-001-ar, 25 Nov). */
function langReady(q,l){
  return (l==="ar"||/[\u0600-\u06FF]/.test(String(q||"")))&&!arabicReady()?loadArabic():Promise.resolve();}
export {chat, idleChat, langReady, loadChat, onChatIn, wanted};

/* Bunyan — what every coach answer is made of (docs/COACH-AGENT.md C-2)
   The chat's answers (js/ui/views/chat.js, and the topic modules split out of it under
   js/ui/answers/) are built from these: an answer object, its paragraphs, list, notes,
   sources and buttons, a template filled, and the language an answer is worked out in.
   Moved here as they were, so the answers can leave chat.js without changing a word. */
import {t} from "../../i18n/dict.js";
import {S} from "../../state.js";
import {setLang} from "../../util.js";

function fill(s,o){Object.keys(o).forEach(function(k){s=s.split("{"+k+"}").join(o[k]);});return s;}
function list(a){return a.join(S.prefs.lang==="ar"?"، ":", ");}
/* A meal's foods. The database names carry their own commas ("Lentils, Cooked"), so a
   comma between them would run two foods into one. */
function foods(a){return a.join(" + ");}
/* An answer: paragraphs (p), a list (l), a small note (n), and its buttons. */
function A(){return {b:[],acts:[],src:[]};}
function p(a,s){a.b.push({p:s});return a;}
function l(a,items){if(items.length)a.b.push({l:items});return a;}
function n(a,s){a.b.push({n:s});return a;}
/* Where a technical answer comes from: the knowledge entry, by file and section. */
var SRCNAME={"acute-variables":"Training variables","nutrition-principles":"Nutrition principles","scope":"Scope of practice"};
function src(a,ref){if(!ref)return a;var f=ref.split(" ")[0];a.src=(a.src||[]).concat([t(SRCNAME[f]||f)+" "+ref.slice(f.length+1)]);return a;}
function act(a,label,attrs){a.acts.push({l:label,a:attrs});return a;}
function noTags(s){return String(s||"").replace(/<[^>]+>/g,"");}
/* Run fn as if the app were in language l: t(), exercise and plan names and dates all
   follow S.prefs.lang, so an Arabic question gets an Arabic answer in the English app.
   Nothing is saved meanwhile, and the language is always put back. */
function uiLang(){return S.prefs&&S.prefs.lang==="ar"?"ar":"en";}
function withLang(l,fn){
  var was=uiLang();if(!l||l===was)return fn();
  S.prefs.lang=l;setLang(l);
  try{return fn();}finally{S.prefs.lang=was;setLang(was);}}
/* The reading of the sentence (js/coach/understand.js) an answer was asked with, or an
   empty one. */
function rd(it){return it&&it.reading||{entities:{exercise:[],muscle:[],equipment:[],numbers:[],weekdays:[]}};}

export {A, act, fill, foods, l, list, n, noTags, p, rd, src, SRCNAME, uiLang, withLang};

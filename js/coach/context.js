/* Bunyan — coach: what the person has told us
   Facts the person states about their life over time — their work schedule, what gets
   in the way, what they cannot do, what they prefer — kept so the coach can plan
   around them. Pure data, one store per profile; the app keeps it with the rest of the
   profile's data, never in a global.

   Two rules shape everything here:
   - Every entry is the person's own statement, in their own words. "Works 13-hour
     days" goes in; "low motivation" does not. Nothing the coach infers is ever stored:
     an entry must say it came from the person (by:"user"), and anything else is
     refused. The kind is the one the person picked, not a category the coach guessed.
   - Every entry is visible and deletable. listFacts() returns everything kept, with no
     hidden fields; removeFact() deletes one for good.

   The store:  {v:1, next:n, items:[{id, kind, text, at, by:"user"}]}
     kind  one of KINDS        text  what they said, trimmed, otherwise as typed
     at    "YYYY-MM-DD", the day it was said (handed in: nothing here reads a clock)
   Every function returns a new store and leaves the one it was given alone. A store
   that is absent or damaged reads as empty — no history — never as anything else. */

var KINDS=["schedule","obstacle","constraint","preference"];

function emptyContext(){return {v:1,next:1,items:[]};}

function okItem(x){
  return !!x&&typeof x==="object"&&typeof x.id==="string"&&KINDS.indexOf(x.kind)>=0
    &&typeof x.text==="string"&&x.text.trim()!==""&&x.by==="user";}

/* A store as kept, made safe to read: absent → empty; entries that are not the
   person's own statements are dropped. */
function readContext(raw){
  if(!raw||typeof raw!=="object"||!Array.isArray(raw.items))return emptyContext();
  var items=raw.items.filter(okItem).map(function(x){
    return {id:x.id,kind:x.kind,text:x.text.trim(),at:typeof x.at==="string"?x.at:"",by:"user"};});
  var top=items.reduce(function(m,x){var n=+String(x.id).replace(/^c/,"");return isFinite(n)&&n>m?n:m;},0);
  var next=+raw.next;
  return {v:1,next:isFinite(next)&&next>top?Math.floor(next):top+1,items:items};}

/* Keep one statement. fact: {kind, text, by:"user"}; opts: {today}.
   Returns {ok, store, id} or {ok:false, store, why} with the store unchanged:
     not_user   it did not come from the person — an inference is never kept
     kind       not one of KINDS
     empty      nothing was said
     duplicate  the same kind and words, or near enough, are already kept (id names it)
     contradicts  it is the opposite of a kept entry of any kind (id, was: that entry);
                opts.replace=id takes that one out for this, opts.both keeps the two */
/* Near the same, or the opposite (owner, 27 Oct, from agent-zero's memory: a near
   duplicate refreshes, a contradiction replaces). Without a model "the same" is the
   words: two statements sharing most of their content words say the same thing, and
   if one is negated and the other is not ("I eat pork" / "I don't eat pork", "بحب
   الجري" / "مبحبش الجري") they say opposite things. → "same", "opposite" or "". */
var NEG=/(^| )(not|no|never|without|dont|cant|cannot|wont|doesnt|isnt|arent|مش|لا|ما|مافيش|مفيش)(?= |$)|(^| )م[\u0600-\u06FF]{2,}ش(?= |$)/;
var STOP={i:1,im:1,a:1,an:1,the:1,my:1,me:1,to:1,at:1,in:1,on:1,of:1,and:1,or:1,do:1,does:1,am:1,is:1,are:1,be:1,it:1,for:1,with:1,
  انا:1,في:1,على:1,من:1,و:1,ال:1,اني:1};
function unNeg(t){return String(t||"").toLowerCase().replace(/\bcan'?t\b/g,"can not").replace(/\bwon'?t\b/g,"will not").replace(/n't\b/g," not");}
function words(t){
  return unNeg(t).replace(/[^\w\s\u0600-\u06FF]/g," ").split(/\s+/).filter(Boolean)
    .map(function(w){var m=/^م([\u0600-\u06FF]{2,})ش$/.exec(w);return m?m[1]:w;})
    .filter(function(w){return !STOP[w]&&!/^(not|no|never|without|dont|cant|cannot|wont|doesnt|isnt|arent|مش|لا|ما|مافيش|مفيش)$/.test(w);})
    .map(function(w){return w.replace(/(ing|es|s)$/,"");});}
function relation(a,b){
  var A=words(a),B=words(b);if(!A.length||!B.length)return "";
  var inB=A.filter(function(w){return B.indexOf(w)>=0;}).length,share=inB/Math.max(A.length,B.length);
  var na=NEG.test(" "+unNeg(a)+" "),nb=NEG.test(" "+unNeg(b)+" ");
  if(share>=0.6&&na!==nb)return "opposite";
  /* The same statement with its figure changed ("13-hour days" → "12-hour days"): the
     newer one is an update of the older, which the person confirms. */
  var da=(String(a).match(/\d+/g)||[]).join(","),db=(String(b).match(/\d+/g)||[]).join(",");
  if(share>=0.6&&na===nb&&da!==db&&da&&db)return "opposite";
  if(share>=0.85&&na===nb)return "same";
  return "";}
function addFact(store,fact,opts){
  var s=readContext(store);opts=opts||{};
  if(!fact||fact.by!=="user")return {ok:false,store:s,why:"not_user"};
  if(KINDS.indexOf(fact.kind)<0)return {ok:false,store:s,why:"kind"};
  var text=typeof fact.text==="string"?fact.text.trim():"";
  if(!text)return {ok:false,store:s,why:"empty"};
  var same=s.items.filter(function(x){return x.kind===fact.kind&&(x.text===text||relation(x.text,text)==="same");})[0];
  if(same)return {ok:false,store:s,why:"duplicate",id:same.id};
  /* The opposite of something kept, of any kind: the person says which stands
     (opts.replace: the id to take out; opts.both: keep the two). */
  if(!opts.both){var opp=s.items.filter(function(x){return relation(x.text,text)==="opposite";})[0];
    if(opp&&opts.replace!==opp.id)return {ok:false,store:s,why:"contradicts",id:opp.id,was:opp.text};
    if(opp)s={v:1,next:s.next,items:s.items.filter(function(x){return x.id!==opp.id;})};}
  var id="c"+s.next;
  var item={id:id,kind:fact.kind,text:text,at:typeof opts.today==="string"?opts.today:"",by:"user"};
  return {ok:true,store:{v:1,next:s.next+1,items:s.items.concat([item])},id:id};}

/* Delete one entry for good. An id that is not there changes nothing. */
function removeFact(store,id){
  var s=readContext(store);
  var items=s.items.filter(function(x){return x.id!==id;});
  return {ok:items.length<s.items.length,store:{v:1,next:s.next,items:items}};}

/* Everything kept, oldest first, optionally of one kind. Copies, so a caller cannot
   change the store by editing what it was shown. */
function listFacts(store,kind){
  return readContext(store).items.filter(function(x){return !kind||x.kind===kind;})
    .map(function(x){return {id:x.id,kind:x.kind,text:x.text,at:x.at,by:x.by};});}

export {addFact, emptyContext, KINDS, listFacts, readContext, relation, removeFact};

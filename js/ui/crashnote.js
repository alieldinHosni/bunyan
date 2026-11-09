/* Bunyan — what the app was doing when it restarted on its own
   Owner, 9 Nov: logging a Football session showed a white page and the app reloaded.
   It could not be made to happen in a desktop engine. A white page then a reload is how
   Safari on the iPhone recovers when the page's process dies (most often from memory):
   no script runs, so nothing can catch it. What can be done is leave a trace before
   each tap and wipe it whenever the app is put away or closed properly. A trace still
   there at the next launch means the app ended without either, and what was tapped last
   (and any script error just before it) is kept here, shown under Settings › About.
   On this phone only; nothing is sent anywhere. Device-wide, like the boot note in
   index.html: it describes the app, not a profile's data. */
var LK="bunyan:last",CK="bunyan:crash",EK="bunyan:lasterr";
function rd(k){try{return JSON.parse(localStorage.getItem(k)||"null");}catch(e){return null;}}
function wr(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
function rm(k){try{localStorage.removeItem(k);}catch(e){}}
/* Before a tap is answered: its first data key (logact, missadj=open…). */
function crumb(D){
  var k=null;for(var x in (D||{})){k=x;break;}
  if(!k)return;
  var v=D[k];wr(LK,{k:k+(v&&v!=="1"?"="+String(v).slice(0,32):""),t:Date.now()});}
function clean(){rm(LK);}
/* At launch: a trace left over is a restart nobody asked for. */
function bootCheck(){
  var l=rd(LK),e=rd(EK);
  if(l&&l.t){
    var list=rd(CK)||[];
    list.unshift({at:Date.now(),after:l.k,tapAt:l.t,err:e&&e.t&&e.t>=l.t-30000?e.m:""});
    wr(CK,list.slice(0,3));}
  clean();
  window.addEventListener("pagehide",clean);
  document.addEventListener("visibilitychange",function(){if(document.visibilityState==="hidden")clean();});
  /* A script error after launch, kept with its first stack line in case a restart follows. */
  window.addEventListener("error",function(ev){
    if(ev&&ev.target&&ev.target!==window)return;
    var st=ev&&ev.error&&ev.error.stack?String(ev.error.stack).split("\n").slice(0,2).join(" "):"";
    wr(EK,{t:Date.now(),m:String((ev&&ev.message)||"error").slice(0,160)+(st?" · "+st.slice(0,200):"")});});
  window.addEventListener("unhandledrejection",function(ev){
    wr(EK,{t:Date.now(),m:"rejection: "+String(ev&&ev.reason&&(ev.reason.stack||ev.reason.message)||ev&&ev.reason).slice(0,300)});});}
function crashNotes(){return rd(CK)||[];}

export {bootCheck, clean, crashNotes, crumb};

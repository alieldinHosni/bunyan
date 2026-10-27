/* Bunyan — the on-device model, loaded and asked (owner, 27 Oct: an optional smart coach)
   WebLLM (js/vendor/web-llm.js, Apache-2.0) runs a small language model on the phone's
   GPU through WebGPU, in a worker (js/vendor/web-llm-worker.js). Nothing leaves the
   phone: the model's files are downloaded once, from where WebLLM keeps them, into the
   browser's storage, and every answer is worked out here.

   Two sizes, both Qwen 2.5 Instruct (it writes Arabic as well as English), 4-bit:
     small   0.5B, about 0.3 GB to download
     better  1.5B, about 0.9 GB, for phones with more memory
   The f16 build where the GPU has shader-f16, the f32 one otherwise. The context is held
   to 2048 tokens: enough for the grounding the coach sends (js/engine/smart.js), and a
   smaller memory footprint on a phone.

   Nothing here is loaded until the person switches the coach on; the app runs without it.
   Every call degrades to "not available", never to an error the person sees. */
var MODELS={
  small:{f16:"Qwen2.5-0.5B-Instruct-q4f16_1-MLC",f32:"Qwen2.5-0.5B-Instruct-q4f32_1-MLC",gb:0.3},
  better:{f16:"Qwen2.5-1.5B-Instruct-q4f16_1-MLC",f32:"Qwen2.5-1.5B-Instruct-q4f32_1-MLC",gb:0.9}};
var LIB=null,ENG=null,ENGID="",WORKER=null,LOADING=null;

function lib(){return LIB?Promise.resolve(LIB):import("../vendor/web-llm.js").then(function(m){LIB=m;return m;});}

/* What this phone can run: {ok, f16, why}. why: "nogpu" (no WebGPU in this browser),
   "noadapter" (WebGPU, but no GPU it will hand over). */
function support(){
  /* The regression tests' stand-in model (tests/regression.mjs): no GPU in a test browser. */
  if(globalThis.__bunyanFakeLLM)return Promise.resolve({ok:true,f16:true,why:""});
  try{
    if(typeof navigator==="undefined"||!navigator.gpu)return Promise.resolve({ok:false,f16:false,why:"nogpu"});
    return navigator.gpu.requestAdapter().then(function(a){
      if(!a)return {ok:false,f16:false,why:"noadapter"};
      return {ok:true,f16:!!(a.features&&a.features.has&&a.features.has("shader-f16")),why:""};},
      function(){return {ok:false,f16:false,why:"noadapter"};});
  }catch(e){return Promise.resolve({ok:false,f16:false,why:"nogpu"});}}
function modelId(size,f16){var m=MODELS[size]||MODELS.small;return f16?m.f16:m.f32;}

/* Downloaded already? (WebLLM's own cache.) */
function installed(id){if(globalThis.__bunyanFakeLLM)return Promise.resolve(!!globalThis.__bunyanFakeLLM.installed);return lib().then(function(L){return L.hasModelInCache(id);}).catch(function(){return false;});}

/* Load the model into a worker, downloading it the first time. onProgress(0..1, text). */
function load(id,onProgress){
  if(ENG&&ENGID===id)return Promise.resolve(ENG);
  if(LOADING&&LOADING.id===id)return LOADING.p;
  if(globalThis.__bunyanFakeLLM){var F=globalThis.__bunyanFakeLLM;if(onProgress){onProgress(0.5,"");onProgress(1,"");}
    F.installed=true;ENG=F;ENGID=id;return Promise.resolve(F);}
  var p=lib().then(function(L){
    if(ENG){try{ENG.unload();}catch(e){}ENG=null;}
    if(WORKER){try{WORKER.terminate();}catch(e){}}
    WORKER=new Worker(new URL("../vendor/web-llm-worker.js",import.meta.url),{type:"module"});
    return L.CreateWebWorkerMLCEngine(WORKER,id,{initProgressCallback:function(r){if(onProgress)onProgress(r.progress||0,r.text||"");}},
      {context_window_size:2048});
  }).then(function(e){ENG=e;ENGID=id;LOADING=null;return e;},function(err){LOADING=null;throw err;});
  LOADING={id:id,p:p};
  return p;}
function ready(){return !!ENG;}

/* Ask: messages (js/engine/smart.js buildMessages) → the full text; onText(textSoFar) as
   it is written. Short and cool: an answer, not an essay. */
function ask(messages,onText){
  if(!ENG)return Promise.reject(new Error("not loaded"));
  var out="";
  return ENG.chat.completions.create({messages:messages,stream:true,temperature:0.3,top_p:0.9,max_tokens:240})
    .then(function(stream){
      var it=stream[Symbol.asyncIterator]();
      function next(){return it.next().then(function(r){
        if(r.done)return out;
        var d=r.value&&r.value.choices&&r.value.choices[0]&&r.value.choices[0].delta;
        if(d&&d.content){out+=d.content;if(onText)onText(out);}
        return next();});}
      return next();});}

/* Take the model off the phone: every file of both sizes, both builds. */
function remove(){
  if(globalThis.__bunyanFakeLLM){globalThis.__bunyanFakeLLM.installed=false;ENG=null;ENGID="";return Promise.resolve();}
  if(ENG){try{ENG.unload();}catch(e){}ENG=null;ENGID="";}
  if(WORKER){try{WORKER.terminate();}catch(e){}WORKER=null;}
  return lib().then(function(L){
    var ids=[];Object.keys(MODELS).forEach(function(k){ids.push(MODELS[k].f16,MODELS[k].f32);});
    return Promise.all(ids.map(function(id){return Promise.resolve(L.deleteModelAllInfoInCache(id)).catch(function(){});}));});}

export {ask, installed, load, modelId, MODELS, ready, remove, support};

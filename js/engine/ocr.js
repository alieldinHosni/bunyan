/* Bunyan — the text on a photo, read on the phone (owner, 27 Oct: an InBody sheet read
   from its photo, not copied off it by hand)
   Tesseract (js/vendor/ocr/, tesseract.js 7.0.0 and its core, Apache-2.0; the English
   and Arabic "best_int" language data, Apache-2.0) runs in a worker, in WebAssembly.
   Nothing leaves the phone. Its files are part of the app but fetched only the first
   time a photo is read, then kept by sw.js across releases ("bunyan-ocr"), so a photo
   reads offline after that.

   Two builds of the core: one for WebAssembly SIMD (every recent phone), one without.
   Only the one this phone runs is fetched.

   readPhoto(file, onProgress(0..1)) → the text, lines as printed. Every figure taken
   from it is shown to be checked before anything is saved (js/engine/inbody.js). */
var DIR=new URL("../vendor/ocr/",import.meta.url).href;
var LIB=null;
function lib(){return LIB?Promise.resolve(LIB):import("../vendor/ocr/tesseract.js").then(function(m){LIB=m.default;return LIB;});}

/* WebAssembly SIMD: a module of one v128 instruction validates only where it runs. */
function simd(){
  try{return WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,10,1,8,0,65,0,253,15,253,98,11]));}
  catch(e){return false;}}

/* A phone photo is 12 megapixels and more; the sheet's print reads as well at 2000 px
   on its long side, in a fraction of the memory. */
var MAXPX=2000;
function shrink(file){
  if(typeof createImageBitmap!=="function")return Promise.resolve(file);
  return createImageBitmap(file).then(function(bm){
    var k=Math.min(1,MAXPX/Math.max(bm.width,bm.height));
    if(k>=1){bm.close&&bm.close();return file;}
    var c=document.createElement("canvas");c.width=Math.round(bm.width*k);c.height=Math.round(bm.height*k);
    c.getContext("2d").drawImage(bm,0,0,c.width,c.height);bm.close&&bm.close();
    return new Promise(function(res){c.toBlob(function(b){res(b||file);},"image/jpeg",0.92);});
  },function(){return file;});}

/* Where its own progress goes: the files first (about half the wait the first time),
   then the reading. */
var STAGE={"loading tesseract core":[0,0.3],"loading language traineddata":[0.3,0.6],"initializing api":[0.6,0.65],"recognizing text":[0.65,1]};

function readPhoto(file,onProgress){
  var w=null;
  var tell=function(m){var s=STAGE[m&&m.status];if(s&&onProgress)onProgress(s[0]+(s[1]-s[0])*(m.progress||0));};
  return Promise.all([lib(),shrink(file)]).then(function(r){
    var T=r[0],img=r[1];
    return T.createWorker(["eng","ara"],1,{workerPath:DIR+"worker.js",corePath:DIR+(simd()?"tesseract-core-simd-lstm.wasm.js":"tesseract-core-lstm.wasm.js"),
      langPath:DIR.replace(/\/$/,""),gzip:true,cacheMethod:"none",workerBlobURL:false,logger:tell})
      .then(function(x){w=x;return w.recognize(img);})
      .then(function(out){var txt=(out&&out.data&&out.data.text)||"";
        /* Its worker holds the core and both languages in memory: let it go. */
        return w.terminate().then(function(){w=null;return txt;},function(){return txt;});});
  }).catch(function(e){if(w)try{w.terminate();}catch(x){}throw e;});}

export {readPhoto};

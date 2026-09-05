/* Bunyan — scan
   Camera barcode scanning. Two decoders behind one interface:

   1. The browser's own BarcodeDetector, where it exists — Chrome on Android,
      ChromeOS and macOS. Nothing to download, hardware-accelerated.
   2. ZXing, vendored at js/vendor/zxing.min.js, everywhere else — notably iOS
      Safari, which is this app's main target and has no BarcodeDetector.

   ZXing is 328 KB, so it is fetched on first use rather than precached: a browser
   with the native detector never downloads it at all, and the service worker's
   cache-first handler keeps it after the first fetch. instructions.json is kept out
   of the precache for the same reason.

   The overlay is built and owned here, outside #app and #sheet, because render()
   replaces their innerHTML wholesale and would tear a live <video> out of the DOM
   mid-stream. */

var FORMATS=["ean_13","ean_8","upc_a","upc_e"];   /* what food packaging uses */
var _stream=null,_timer=0,_el=null,_onCode=null,_busy=false,_dead=false;

function cameraOK(){ return !!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia); }
function nativeOK(){ return typeof BarcodeDetector!=="undefined"; }
/* A camera is the only hard requirement now: without the native detector the
   vendored one is loaded instead. */
function scanSupported(){ return cameraOK(); }
function usesFallbackDecoder(){ return cameraOK()&&!nativeOK(); }

/* ---- the vendored decoder, loaded once and only when needed --------------- */
var _zx=null;
function loadZXing(){
  if(typeof ZXing!=="undefined")return Promise.resolve(ZXing);
  if(_zx)return _zx;
  _zx=new Promise(function(res,rej){
    var s=document.createElement("script");
    /* Resolved against this module, not the document, so it survives being served
       from a subpath such as /bunyan/. */
    s.src=new URL("./vendor/zxing.min.js",import.meta.url).href;
    s.async=true;
    s.onload=function(){ typeof ZXing!=="undefined"?res(ZXing):rej(new Error("zxing")); };
    s.onerror=function(){ _zx=null; rej(new Error("zxing")); };
    document.head.appendChild(s);
  });
  return _zx;
}

/* Both detectors are (video) -> Promise<string>, empty string meaning "nothing in
   this frame", which is the normal case for most frames. */
function nativeDetector(){
  var det=new BarcodeDetector({formats:FORMATS});
  return function(video){
    return det.detect(video).then(function(f){
      return f&&f.length?String(f[0].rawValue||""):"";
    }).catch(function(){ return ""; });
  };
}
function zxingDetector(ZX){
  var hints=new Map();
  hints.set(ZX.DecodeHintType.POSSIBLE_FORMATS,
    [ZX.BarcodeFormat.EAN_13,ZX.BarcodeFormat.EAN_8,ZX.BarcodeFormat.UPC_A,ZX.BarcodeFormat.UPC_E]);
  hints.set(ZX.DecodeHintType.TRY_HARDER,true);
  var reader=new ZX.MultiFormatOneDReader(hints);
  var cv=document.createElement("canvas");
  var cx=cv.getContext("2d",{willReadFrequently:true});
  return function(video){
    var vw=video.videoWidth,vh=video.videoHeight;
    if(!vw||!vh)return Promise.resolve("");
    /* Decode only the band the user is aiming at. A full 1280x720 frame is several
       times slower to scan and no more likely to find the barcode they are holding
       inside the box. */
    var cw=Math.min(vw,720), scale=cw/vw;
    var sh=Math.round(vh*0.42), sy=Math.round((vh-sh)/2);
    cv.width=cw; cv.height=Math.max(1,Math.round(sh*scale));
    try{ cx.drawImage(video,0,sy,vw,sh,0,0,cv.width,cv.height); }
    catch(e){ return Promise.resolve(""); }
    var img,n=cv.width*cv.height;
    try{ img=cx.getImageData(0,0,cv.width,cv.height); }catch(e){ return Promise.resolve(""); }
    var d=img.data, gray=new Uint8ClampedArray(n);
    for(var i=0,j=0;i<n;i++,j+=4)gray[i]=(d[j]*306+d[j+1]*601+d[j+2]*117)>>10;
    try{
      var src=new ZX.RGBLuminanceSource(gray,cv.width,cv.height);
      var res=reader.decode(new ZX.BinaryBitmap(new ZX.HybridBinarizer(src)),hints);
      return Promise.resolve(res?String(res.getText()||""):"");
    }catch(e){
      /* NotFoundException on most frames is the expected path, not an error. */
      return Promise.resolve("");
    }
  };
}
function getDetector(){
  return nativeOK()?Promise.resolve(nativeDetector()):loadZXing().then(zxingDetector);
}

/* ---- overlay and lifecycle ------------------------------------------------ */
/* Idempotent, and safe to call from anywhere: a camera light left on after the user
   has moved away would be the worst bug this feature could have, so every exit path
   goes through here. */
function stopScan(){
  _dead=true;
  if(_timer){clearInterval(_timer);_timer=0;}
  if(_stream){
    try{_stream.getTracks().forEach(function(t){t.stop();});}catch(e){}
    _stream=null;
  }
  if(_el){
    var v=_el.querySelector("video");
    if(v){try{v.pause();v.srcObject=null;}catch(e){}}
    if(_el.parentNode)_el.parentNode.removeChild(_el);
    _el=null;
  }
  _onCode=null;_busy=false;
}

function overlay(labels){
  var d=document.createElement("div");
  d.className="scanwrap";
  d.innerHTML='<video playsinline muted autoplay></video>'
    +'<div class="scanbox"><span></span><span></span><span></span><span></span></div>'
    +'<p class="scanhint"></p>'
    +'<button class="btn g scancancel" type="button"></button>';
  d.querySelector(".scanhint").textContent=labels.hint||"";
  d.querySelector(".scancancel").textContent=labels.cancel||"Cancel";
  /* Its own listener: this element is not in the render tree and should not depend
     on the app's delegated handler. */
  d.querySelector(".scancancel").addEventListener("click",function(){stopScan();});
  return d;
}

/* onCode(code) fires once, with the camera already shut down.
   onFail(reason) gets "unsupported", "decoder", "denied", "nocamera" or "error". */
function startScan(onCode,onFail,labels){
  if(!cameraOK())return onFail("unsupported");
  stopScan();
  _dead=false;
  _onCode=onCode;
  labels=labels||{};

  _el=overlay(labels);
  document.body.appendChild(_el);
  var video=_el.querySelector("video"), hintEl=_el.querySelector(".scanhint");
  /* First run on a browser without the native detector pauses to fetch ZXing; say
     so rather than showing an empty black screen. */
  if(usesFallbackDecoder()&&labels.loading)hintEl.textContent=labels.loading;

  /* Deliberately sequential. Running these together risks the camera resolving
     after the decoder has already failed, leaving a stream nobody owns. */
  getDetector().then(function(detect){
    if(_dead||!_el)return null;
    hintEl.textContent=labels.hint||"";
    return navigator.mediaDevices.getUserMedia(
      {video:{facingMode:{ideal:"environment"},width:{ideal:1280}},audio:false}
    ).then(function(stream){
      if(_dead||!_el){                     /* cancelled while the prompt was up */
        try{stream.getTracks().forEach(function(t){t.stop();});}catch(e){}
        return null;
      }
      _stream=stream;
      video.srcObject=stream;
      var play=video.play();
      if(play&&play.catch)play.catch(function(){});
      /* Polling, not rAF: decoding is the expensive part and four times a second is
         plenty for holding a packet up to a camera. _busy makes it self-throttling
         when a frame takes longer than the interval, which ZXing sometimes does. */
      _timer=setInterval(function(){
        if(_busy||!_stream||video.readyState<2)return;
        _busy=true;
        detect(video).then(function(raw){
          _busy=false;
          if(!raw||!_onCode)return;
          var code=String(raw).replace(/\D/g,"");
          if(!code)return;
          var fire=_onCode;
          stopScan();                      /* camera off before anything else */
          fire(code);
        }).catch(function(){ _busy=false; });
      },250);
      return stream;
    });
  }).catch(function(err){
    var wasDecoder=err&&err.message==="zxing";
    stopScan();
    var n=err&&err.name;
    onFail(wasDecoder?"decoder":
           n==="NotAllowedError"||n==="SecurityError"?"denied":
           n==="NotFoundError"||n==="OverconstrainedError"?"nocamera":"error");
  });
}

/* Leaving the app with the camera running is not acceptable, and a backgrounded tab
   may never get another event. */
document.addEventListener("visibilitychange",function(){
  if(document.visibilityState!=="visible")stopScan();
});
window.addEventListener("pagehide",stopScan);

export {scanSupported, usesFallbackDecoder, startScan, stopScan};

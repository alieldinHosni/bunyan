/* Bunyan — progress photos
   What the Body view and the photo sheet need: the current profile's photos as
   object URLs, adding one from a picked file, removing one. Storage is
   js/photostore.js; this is the part that knows about images. */
import {delPhoto, loadPhotos, photoGen, putPhoto} from "../photostore.js";
import {CUR} from "../state.js";
import {today, uid} from "../util.js";

/* The list is read once per profile and per write, and its URLs are revoked when it
   is replaced, so paging through Progress does not leak a blob URL per render.
   list: null while loading, false where this browser cannot store photos. */
var C={key:null,list:null,loading:null,urls:[]};

function photoList(onLoad){
  var key=CUR+"#"+photoGen();
  if(C.key===key)return C.list;
  if(C.loading!==key){
    C.loading=key;
    loadPhotos(CUR,function(rows){
      if(C.loading!==key)return;
      C.loading=null;
      C.urls.forEach(function(u){try{URL.revokeObjectURL(u);}catch(e){}});
      C.urls=[];
      C.key=key;
      C.list=rows===null?false:rows.map(function(r){
        var u="";
        try{u=URL.createObjectURL(r.b);C.urls.push(u);}catch(e){}
        return {id:r.id,d:r.d,t:r.t,w:r.w,h:r.h,url:u};}).filter(function(p){return p.url;});
      onLoad&&onLoad();});
  }
  return null;}
function photoById(id){
  return (C.list||[]).filter(function(p){return p.id===id;})[0]||null;}

/* A phone photo is 3–12 MB. Stored as taken, a year of weekly photos would be over
   a gigabyte on the device. 1280px on the long side, as JPEG, is about 200 KB and
   still sharper than the screen it is shown on. Orientation is applied by the
   browser when the image is drawn. */
var LONG=1280;
function shrink(file,cb){
  var url;
  try{url=URL.createObjectURL(file);}catch(e){return cb(null);}
  var img=new Image();
  img.onload=function(){
    var w=img.naturalWidth,h=img.naturalHeight,s=Math.min(1,LONG/Math.max(w,h));
    var c=document.createElement("canvas");
    c.width=Math.max(1,Math.round(w*s));c.height=Math.max(1,Math.round(h*s));
    try{c.getContext("2d").drawImage(img,0,0,c.width,c.height);}catch(e){URL.revokeObjectURL(url);return cb(null);}
    URL.revokeObjectURL(url);
    if(!c.toBlob)return cb(null);
    c.toBlob(function(b){cb(b?{b:b,w:c.width,h:c.height}:null);},"image/jpeg",0.82);};
  img.onerror=function(){URL.revokeObjectURL(url);cb(null);};
  img.src=url;}

/* cb(ok). The date is the day it was added, which is the day it is about. */
function addPhoto(file,cb){
  if(!file||!/^image\//.test(file.type||"image/"))return cb(false);
  shrink(file,function(out){
    if(!out)return cb(false);
    putPhoto(CUR,{id:uid(),d:today(),t:Date.now(),w:out.w,h:out.h,b:out.b},cb);});}
function removePhoto(id,cb){delPhoto(CUR,id,cb);}

export {addPhoto, photoById, photoList, removePhoto};

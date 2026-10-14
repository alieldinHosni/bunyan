/* Bunyan — themes
   The three BUNYAN themes (Blue, the default; Red; Sage) and the one place that puts the
   chosen one on screen.

   Every colour lives in index.html's theme blocks; this module only names the themes
   and applies the choice. A theme (data-palette: red, blue, mono) and a mode
   (data-theme: dark, light) go on html, and every token block keys off the pair. Both
   are the profile's own, so each person on the phone keeps theirs. */
import {S} from "../state.js";
import {isReduced} from "./motion.js";

/* sw: the reference colours each theme is built from. Blue is the default. */
var THEMES=[
  {id:"blue",name:"BUNYAN Blue",sw:["#070B1A","#8AB0EC","#82FC4F"]},
  {id:"red",name:"BUNYAN Red",sw:["#FF2E3A","#DBF6FF"]},
  /* Once Monochrome (its id stays "mono", so a stored choice still finds it); now the
     owner's reference: sage glass on a deep teal and slate ground. */
  {id:"mono",name:"Sage",sw:["#142E33","#9AABA9","#E9EFEE"]}];

/* Pink was replaced by Blue at the owner's request; a profile that chose Pink is
   shown Blue (schema's tidy() also rewrites the stored choice on the next load). */
function themeOf(){
  var p=S.prefs&&S.prefs.palette;
  if(p==="pink")p="blue";
  return THEMES.some(function(x){return x.id===p;})?p:"blue";}
function modeOf(){return S.theme==="light"?"light":"dark";}
function themeName(id){return (THEMES.filter(function(x){return x.id===id;})[0]||THEMES[0]).name;}

/* The theme's icon (tools/images.py icons): the mark in the theme's colours on its
   ground. Blue's is icon-180.png, the one the manifest and the page start with. */
function iconOf(pal){return pal==="blue"?"icon-180.png":"icon-"+pal+"-180.png";}

/* Called by every render. Cheap when nothing changed. The pair is also kept under its
   own small key, which index.html reads before the first paint of the next launch: the
   profile's full record is far too big to parse that early, and without it a Red or
   Sage user saw the default blue for a moment on every start. The status bar
   (theme-color) takes the theme's ground, and the tab's icon and the Home Screen's the
   theme's own. A phone keeps the icon it was given when the app was added to its Home
   Screen; this one is what it is given the next time. */
var last="";
function applyLook(){
  var de=document.documentElement,pal=themeOf(),mode=modeOf(),look=pal+"|"+mode;
  if(de.getAttribute("data-palette")!==pal)de.setAttribute("data-palette",pal);
  if(de.getAttribute("data-theme")!==mode)de.setAttribute("data-theme",mode);
  if(look===last)return;
  last=look;
  try{localStorage.setItem("bunyan:look",look);}catch(e){}
  var meta=document.querySelector('meta[name="theme-color"]');
  if(meta){
    var bg=getComputedStyle(de).getPropertyValue("--bg").trim();
    if(bg)meta.setAttribute("content",bg);}
  var ic=iconOf(pal),links=document.querySelectorAll('link[rel="icon"],link[rel="apple-touch-icon"]');
  for(var i=0;i<links.length;i++)if(links[i].getAttribute("href")!==ic)links[i].setAttribute("href",ic);}

/* A change of theme or mode cross-fades the whole screen where the browser can (the View
   Transitions API), so it reads as one deliberate change rather than every surface
   switching on its own. Reduced motion, or no support, and it simply changes. */
function changeLook(fn){
  if(document.startViewTransition&&!isReduced()){
    try{document.startViewTransition(fn);return;}catch(e){}}
  fn();}

export {applyLook, changeLook, iconOf, modeOf, themeName, themeOf, THEMES};

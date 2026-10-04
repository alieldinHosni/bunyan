/* Bunyan — themes
   The three BUNYAN themes and the one place that puts the chosen one on screen.

   Every colour lives in index.html's theme blocks; this module only names the themes
   and applies the choice. A theme (data-palette: red, pink, mono) and a mode
   (data-theme: dark, light) go on html, and every token block keys off the pair. Both
   are the profile's own, so each person on the phone keeps theirs. */
import {S} from "../state.js";
import {isReduced} from "./motion.js";

/* sw: the two reference colours each theme is built from, exactly as given. */
var THEMES=[
  {id:"red",name:"BUNYAN Red",sw:["#FF2E3A","#DBF6FF"]},
  {id:"pink",name:"BUNYAN Pink",sw:["#2E0F35","#FF7FEC"]},
  {id:"mono",name:"Monochrome",sw:["#050505","#D7FFE0"]}];

function themeOf(){
  var p=S.prefs&&S.prefs.palette;
  return THEMES.some(function(x){return x.id===p;})?p:"red";}
function modeOf(){return S.theme==="light"?"light":"dark";}
function themeName(id){return (THEMES.filter(function(x){return x.id===id;})[0]||THEMES[0]).name;}

/* Called by every render. Cheap when nothing changed. The pair is also kept under its
   own small key, which index.html reads before the first paint of the next launch: the
   profile's full record is far too big to parse that early, and without it a Pink or
   Monochrome user saw the default red for a moment on every start. The status bar
   (theme-color) takes the theme's ground. */
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
    if(bg)meta.setAttribute("content",bg);}}

/* A change of theme or mode cross-fades the whole screen where the browser can (the View
   Transitions API), so it reads as one deliberate change rather than every surface
   switching on its own. Reduced motion, or no support, and it simply changes. */
function changeLook(fn){
  if(document.startViewTransition&&!isReduced()){
    try{document.startViewTransition(fn);return;}catch(e){}}
  fn();}

export {applyLook, changeLook, modeOf, themeName, themeOf, THEMES};

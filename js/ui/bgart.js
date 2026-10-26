/* Bunyan — the ground's pictures
   Behind the glass, a picture for each place in the app: the owner's own photographs
   (img/page-*.jpg, cut from the owner's sheet of them, 26 Oct), one per place, each
   standing at the top of the page and fading into the ground:

     home       the mark carved in stone over the water (Training, the first page)
     training   the rack under the pergola (planning: the program, the library)
     workout    the bottle and towel on the step (a day, before Start workout)
     warmup     the runner on the steps (the warm-up's own header, js/ui/views/warmup.js)
     food       the bowl on the terrace (Food, and Coach's Nutrition)
     coach      the coach on the tablet (Coach AI, the chat, the assessment)
     progress   looking out over the bay (Progress)
     profile    the banner on the stone (Profile)

   They lie on the ground layer under everything else (#bgart in index.html), so the
   frosted cards show them softened, and the workout itself keeps a flat ground
   (workout-spec.md). Which picture is the CSS's (#bgart .photo[data-p]), so nothing here
   runs per frame or per theme. */
var PAGES={home:1,training:1,workout:1,warmup:1,food:1,coach:1,progress:1,profile:1};
var shown="";
/* The picture for a place, as markup. */
function bgArt(key){
  return PAGES[key]?'<div class="art photo bgart-'+key+'" data-p="'+key+'" aria-hidden="true"></div>':"";}
/* Called by every render: puts the place's picture on the ground when the place changes. */
function syncBgArt(key){
  var el=document.getElementById("bgart");
  if(!el||key===shown)return;
  shown=key;el.innerHTML=bgArt(key);
  el.setAttribute("data-page",key||"");}
/* For the tests. */
function bgArtKey(){return shown;}
export {bgArt, syncBgArt, bgArtKey};

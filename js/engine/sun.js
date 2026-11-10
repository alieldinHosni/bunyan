/* Bunyan — where the sun is, and how the ground looks under it
   Owner, 10 Nov: "based on the timing … make it dark as a night in night, and bright and
   sunny in day, and depends on the season … in a perfect way, and very accurate."

   The sun's place is computed, not guessed: the NOAA solar calculator's equations
   (after Meeus, Astronomical Algorithms), good to about a minute for sunrise and sunset
   between 1800 and 2100, with the usual correction for refraction near the horizon. It
   needs only the time and a place on the earth, so it works offline. Night, the blue
   hour, the golden hour and full day are then read from the sun's height, by the
   standard bands: civil twilight to 6° below the horizon, nautical to 12°, astronomical
   to 18°, and the golden hour while the sun is under about 6° above it.

   How each band LOOKS on the picture (how much darker, warmer, bluer) is a modelling
   choice, written in the keyframes below; it follows the light, not a source.

   sunAt(ms, lat, lon)            → {elevation, azimuth, declination}   (degrees; apparent)
   sunTimes(ms, lat, lon, offMin) → {rise, set, noon, polar}            (ms, or null)
   phaseOf(elevation)             → "night"|"astro"|"nautical"|"civil"|"golden"|"day"
   seasonOf(ms, lat)              → −1 (midwinter) … +1 (midsummer), for that hemisphere
   skyLook(ms, lat, lon)          → the picture's filter and overlays for this moment
   Pure: no clock of its own, no DOM. */

var R=Math.PI/180;
function sin(d){return Math.sin(d*R);}
function cos(d){return Math.cos(d*R);}
function mod(a,n){return ((a%n)+n)%n;}

/* The sun's declination and the equation of time, for a moment (NOAA). */
function solar(ms){
  var jd=ms/864e5+2440587.5,T=(jd-2451545)/36525;
  var L0=mod(280.46646+T*(36000.76983+T*0.0003032),360);
  var M=357.52911+T*(35999.05029-0.0001537*T);
  var e=0.016708634-T*(0.000042037+0.0000001267*T);
  var C=sin(M)*(1.914602-T*(0.004817+0.000014*T))+sin(2*M)*(0.019993-0.000101*T)+sin(3*M)*0.000289;
  var om=125.04-1934.136*T,lam=L0+C-0.00569-0.00478*sin(om);
  var eps0=23+(26+(21.448-T*(46.815+T*(0.00059-T*0.001813)))/60)/60,eps=eps0+0.00256*cos(om);
  var decl=Math.asin(sin(eps)*sin(lam))/R;
  var y=Math.pow(Math.tan(eps/2*R),2);
  var eot=4*(y*sin(2*L0)-2*e*sin(M)+4*e*y*sin(M)*cos(2*L0)-0.5*y*y*sin(4*L0)-1.25*e*e*sin(2*M))/R;
  return {decl:decl,eot:eot};}

/* Refraction near the horizon, in degrees (NOAA's fit). */
function refraction(h){
  if(h>85)return 0;
  var te=Math.tan(h*R),r;
  if(h>5)r=58.1/te-0.07/Math.pow(te,3)+0.000086/Math.pow(te,5);
  else if(h>-0.575)r=1735+h*(-518.2+h*(103.4+h*(-12.79+h*0.711)));
  else r=-20.772/te;
  return r/3600;}

function geometric(ms,lat,lon){
  var s=solar(ms),d=new Date(ms);
  var mins=d.getUTCHours()*60+d.getUTCMinutes()+d.getUTCSeconds()/60+d.getUTCMilliseconds()/6e4;
  var ha=mod(mins+s.eot+4*lon,1440)/4-180;
  var cz=sin(lat)*sin(s.decl)+cos(lat)*cos(s.decl)*cos(ha);
  var zen=Math.acos(Math.max(-1,Math.min(1,cz)))/R;
  var az;
  var den=cos(lat)*sin(zen);
  if(Math.abs(den)<1e-9)az=lat>0?180:0;
  else{var ca=(sin(lat)*cz-sin(s.decl))/den;
    az=Math.acos(Math.max(-1,Math.min(1,ca)))/R;
    az=ha>0?mod(az+180,360):mod(540-az,360);}
  return {elevation:90-zen,azimuth:az,declination:s.decl,hourAngle:ha};}

function sunAt(ms,lat,lon){
  var g=geometric(ms,lat,lon);
  return {elevation:g.elevation+refraction(g.elevation),azimuth:g.azimuth,declination:g.declination,hourAngle:g.hourAngle};}

/* Sunrise and sunset on the local day that holds ms: the moments the sun's upper edge
   meets the horizon, geometric height −0.833° (half its disc and the standard
   refraction). offMin is the local offset from UTC in minutes (east positive). Found by
   stepping the day in ten-minute steps and halving the step at each crossing, so the
   midnight sun and the polar night come out as polar "day" / "night". */
var HORIZON=-0.833;
function sunTimes(ms,lat,lon,offMin){
  var off=(offMin||0)*6e4,d0=Math.floor((ms+off)/864e5)*864e5-off,step=6e5;
  var f=function(t){return geometric(t,lat,lon).elevation-HORIZON;};
  var rise=null,set=null,noon=d0,top=-99,prev=f(d0);
  for(var t=d0+step;t<=d0+864e5;t+=step){
    var v=f(t);
    if(v>top){top=v;noon=t;}
    if((prev<0)!==(v<0)){
      var a=t-step,b=t,fa=prev;
      for(var i=0;i<20;i++){var m=(a+b)/2,fm=f(m);if((fa<0)===(fm<0)){a=m;fa=fm;}else b=m;}
      var at=Math.round((a+b)/2);
      if(prev<0&&rise===null)rise=at;else if(prev>=0&&set===null)set=at;}
    prev=v;}
  return {rise:rise,set:set,noon:noon,polar:rise===null&&set===null?(top>0?"day":"night"):null};}

function phaseOf(e){
  return e>=6?"day":e>=-0.833?"golden":e>=-6?"civil":e>=-12?"nautical":e>=-18?"astro":"night";}

/* Where the year is for this hemisphere: the sun's declination over its greatest,
   turned for the south. +1 at midsummer, −1 at midwinter, 0 at the equinoxes. */
function seasonOf(ms,lat){
  var d=solar(ms).decl/23.44;
  return Math.max(-1,Math.min(1,lat<0?-d:d));}

/* ---- the look ------------------------------------------------------------------------ */
/* Keyframes on the sun's height. bright, sat: the picture's brightness and saturation;
   warm: sepia, the low sun's amber; tint: the night's blue laid over it (multiply);
   glow: the horizon's light from the top of the picture, where its sky is (screen). */
var KEYS=[
  /*  elev   bright sat   warm  tint  glow */
  [-18,   .36,  .50,  0,    .58,  0],
  [-12,   .40,  .55,  0,    .52,  0],
  [-9,    .50,  .62,  0,    .44,  .04],
  [-6,    .58,  .72,  .02,  .34,  .14],
  [-3,    .68,  .86,  .12,  .20,  .28],
  [0,     .80,  1.04, .28,  .07,  .36],
  [3,     .88,  1.12, .27,  .02,  .30],
  [6,     .94,  1.09, .17,  0,    .17],
  [10,    .98,  1.05, .08,  0,    .05],
  [20,    1.01, 1.03, .02,  0,    0],
  [40,    1.04, 1.05, 0,    0,    0],
  [70,    1.06, 1.07, 0,    0,    0]];
/* The glow's colour by the sun's height: violet at the blue hour's start, rose, then
   the orange of sunrise, amber and a pale gold as the sun climbs. */
var GLOW=[[-9,[150,110,200]],[-6,[190,112,178]],[-3,[238,122,124]],[0,[255,138,72]],[3,[255,166,82]],[6,[255,198,120]],[10,[255,222,170]]];
function lerp(a,b,k){return a+(b-a)*k;}
function at(tab,e,col){
  if(e<=tab[0][0])return tab[0].slice(1);
  for(var i=1;i<tab.length;i++)if(e<=tab[i][0]){
    var k=(e-tab[i-1][0])/(tab[i][0]-tab[i-1][0]),a=tab[i-1],b=tab[i];
    if(col)return [a[1].map(function(x,j){return Math.round(lerp(x,b[1][j],k));})];
    return a.slice(1).map(function(x,j){return lerp(x,b[j+1],k);});}
  return tab[tab.length-1].slice(1);}

function r3(x){return Math.round(x*1000)/1000;}
function skyLook(ms,lat,lon){
  var s=sunAt(ms,lat,lon),e=s.elevation,season=seasonOf(ms,lat);
  var v=at(KEYS,e),bright=v[0],sat=v[1],warm=v[2],tint=v[3],glow=v[4];
  var gc=at(GLOW,e,true)[0];
  /* The season, by day: summer's light is brighter and fuller, winter's a little paler
     and cooler at the same hour. Night is night in any month. */
  var dayK=Math.max(0,Math.min(1,(e-3)/12)),hue=0;
  bright+=0.035*season*dayK;sat+=0.07*season*dayK;
  warm+=0.03*Math.max(0,season)*dayK;
  if(season<0)hue=-6*(-season)*dayK;
  /* Evening light carries more red than morning light at the same height (the day's
     haze); morning's glow is a shade pinker and paler. */
  if(s.hourAngle<0&&glow>0){gc=[Math.round(gc[0]*0.97),Math.round(gc[1]*0.97),Math.min(255,Math.round(gc[2]*1.08))];glow*=0.9;}
  return {elevation:Math.round(e*10)/10,azimuth:Math.round(s.azimuth),phase:phaseOf(e),season:r3(season),
    bright:r3(bright),sat:r3(sat),warm:r3(warm),hue:Math.round(hue*10)/10,
    tint:r3(tint),glow:r3(glow),glowRGB:gc};}

export {phaseOf, seasonOf, skyLook, sunAt, sunTimes};

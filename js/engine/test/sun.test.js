import {phaseOf, seasonOf, skyLook, sunAt, sunTimes} from "../sun.js";
import {zonePlace} from "../../data/tzplaces.js";

/* The sun against published sunrise and sunset, which an independent implementation
   (the astral library) gives to the same minute: Cairo, London and Sydney at both
   solstices. Within a minute. */
function hm(ms,off){var d=new Date(ms+off*6e4);return d.getUTCHours()*60+d.getUTCMinutes()+d.getUTCSeconds()/60;}
function near(a,b){return Math.abs(a-b)<=1;}
function run(t){
  var C=[30.044,31.236],L=[51.507,-0.128],Y=[-33.869,151.209];
  var cj=sunTimes(Date.parse("2026-06-21T12:00:00Z"),C[0],C[1],180);
  t.eq([near(hm(cj.rise,180),5*60+54.6),near(hm(cj.set,180),19*60+59.1)],[true,true],"Cairo, 21 June: sunrise 5:54, sunset 19:59 (summer time)");
  var cd=sunTimes(Date.parse("2026-12-21T12:00:00Z"),C[0],C[1],120);
  t.eq([near(hm(cd.rise,120),6*60+47),near(hm(cd.set,120),16*60+59.2)],[true,true],"Cairo, 21 December: sunrise 6:47, sunset 16:59");
  var lj=sunTimes(Date.parse("2026-06-21T12:00:00Z"),L[0],L[1],60);
  t.eq([near(hm(lj.rise,60),4*60+43.5),near(hm(lj.set,60),21*60+21.2)],[true,true],"London, 21 June: sunrise 4:43, sunset 21:21 (BST)");
  var ld=sunTimes(Date.parse("2026-12-21T12:00:00Z"),L[0],L[1],0);
  t.eq([near(hm(ld.rise,0),8*60+4.1),near(hm(ld.set,0),15*60+53)],[true,true],"London, 21 December: sunrise 8:04, sunset 15:53");
  var yj=sunTimes(Date.parse("2026-06-21T02:00:00Z"),Y[0],Y[1],600);
  t.eq([near(hm(yj.rise,600),7*60+0.4),near(hm(yj.set,600),16*60+53.6)],[true,true],"Sydney, 21 June (its winter): sunrise 7:00, sunset 16:54");
  t.eq([sunTimes(Date.parse("2026-06-21T12:00:00Z"),69.65,18.96,120).polar,sunTimes(Date.parse("2026-12-21T12:00:00Z"),69.65,18.96,60).polar],["day","night"],"Tromsø: the midnight sun in June, the polar night in December");
  /* The sun's height at a moment: Cairo's noon at midsummer is nearly overhead. */
  t.ok(Math.abs(sunAt(Date.parse("2026-06-21T10:00:00Z"),C[0],C[1]).elevation-83.36)<0.05,"Cairo, 21 June 13:00: the sun 83.4° up");
  t.ok(Math.abs(sunAt(Date.parse("2026-12-21T10:00:00Z"),L[0],L[1]).elevation-10.75)<0.05,"London, 21 December 10:00 UTC: 10.8° up");
  t.eq([-20,-15,-9,-3,0,3,30].map(phaseOf),["night","astro","nautical","civil","golden","golden","day"],"the bands: 18°, 12°, 6° under the horizon; the golden hour to 6° over it");
  t.eq([seasonOf(Date.parse("2026-06-21T12:00:00Z"),30)>0.99,seasonOf(Date.parse("2026-06-21T12:00:00Z"),-33)<-0.99,Math.abs(seasonOf(Date.parse("2026-03-20T15:00:00Z"),30))<0.02],[true,true,true],"the season by hemisphere: June is summer in Cairo, winter in Sydney; the equinox is neither");
  /* The look: night is dark and blue, noon bright, sunset warm and glowing; summer noon
     brighter and fuller than winter noon at the same place. */
  var night=skyLook(Date.parse("2026-11-10T21:00:00Z"),C[0],C[1]),noon=skyLook(Date.parse("2026-11-10T09:40:00Z"),C[0],C[1]),
      dusk=skyLook(cd.set,C[0],C[1]);
  t.eq([night.phase,night.bright<0.5,night.tint>0.5,noon.phase,noon.bright>=1,noon.tint,dusk.warm>0.2,dusk.glow>0.3],
       ["night",true,true,"day",true,0,true,true],"Cairo: night dim and blue, noon bright, sunset amber with the horizon's glow");
  var sum=skyLook(Date.parse("2026-06-21T09:55:00Z"),C[0],C[1]),win=skyLook(Date.parse("2026-12-21T09:55:00Z"),C[0],C[1]);
  t.eq([sum.bright>win.bright,sum.sat>win.sat,win.hue<0],[true,true,true],"summer's noon brighter and fuller than winter's, winter's a little cooler");
  /* Continuous: from one minute to the next nothing jumps. */
  var worst=0,prev=skyLook(cd.set-3600e3,C[0],C[1]);
  for(var m=1;m<=180;m++){var k=skyLook(cd.set-3600e3+m*6e4,C[0],C[1]);
    worst=Math.max(worst,Math.abs(k.bright-prev.bright),Math.abs(k.tint-prev.tint),Math.abs(k.glow-prev.glow));prev=k;}
  t.ok(worst<0.02,"dusk minute by minute: no step over 0.02 ("+worst.toFixed(3)+")");
  t.eq([zonePlace("Africa/Cairo",120).name,zonePlace("Mars/Base",180).src,zonePlace("Mars/Base",180).lon],["Cairo","offset",45],"the time zone's city; an unknown zone falls back to its meridian");}

export {run};

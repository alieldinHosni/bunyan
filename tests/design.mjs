/* Bunyan — the design system's guard (WP-7). Runs in node, no browser.
   docs/DESIGN-SYSTEM.md names the set of components, radii and motion speeds that pages
   are built from. Until every page is moved onto it (one page per pull request), this
   test is a ratchet: it counts the one-off values in the stylesheet and fails if any count
   rises above its ceiling. A migration lowers the ceiling in the same pull request, so
   the number only ever goes down. When a count reaches its target the ceiling becomes
   the target and stays there.

   Counted, comments removed, across every <style> in index.html:
   - radius:   a border-radius written in px/em/rem instead of a radius token
   - duration: a transition or animation whose time is written in ms/s instead of a --m-*
               token (the sky's 60 s drift and the like are in the allow-list below)
   - hex:      a raw #colour (the theme blocks set colour tokens this way; everything else
               should read a token)
   - motion:   the number of distinct --m-* duration tokens defined at :root */
import {readFileSync} from "fs";
const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const css=[...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m=>m[1]).join("\n").replace(/\/\*[\s\S]*?\*\//g,"");
const decls=[...css.matchAll(/([a-z-]+)\s*:\s*([^;{}]+)/g)].map(m=>[m[1],m[2].trim()]);

/* Long, deliberate times that are not interface motion: the sky's drift, a pulsing dot,
   the tour's looping ping. */
const ALLOW=[/\b60s linear/, /wbPulse/, /tourPing/];

const count={
  radius:decls.filter(([p,v])=>p==="border-radius"&&/\d(px|em|rem)\b/.test(v)&&!/var\(/.test(v)).length,
  duration:decls.filter(([p,v])=>/^(transition|animation)(-duration)?$/.test(p)&&/(?<![\w-])\d*\.?\d+m?s\b/.test(v)&&!ALLOW.some(r=>r.test(v))).length,
  hex:(css.match(/#[0-9a-fA-F]{3,8}\b/g)||[]).length,
  motion:new Set([...css.matchAll(/(--m-[a-z]+)\s*:\s*\d+ms/g)].map(m=>m[1])).size};

/* Ceilings: today's counts (17 Nov, v275). Lower them as pages move; never raise them. */
const CEIL={radius:146,duration:53,hex:382,motion:18};
/* Where each count is headed (docs/DESIGN-SYSTEM.md). */
const TARGET={radius:0,duration:0,hex:null,motion:4};

/* The four speeds and two curves the set is built on must exist. */
const need=["--m-press","--m-quick","--m-move","--m-page","--e-standard","--e-decel"];
let bad=0;
for(const t of need)if(!new RegExp(t+"\\s*:").test(css)){console.log("FAIL missing token",t);bad++;}
const page=(css.match(/--m-page\s*:\s*(\d+)ms/)||[])[1],transit=readFileSync(new URL("../js/ui/transit.js",import.meta.url),"utf8");
const pageMs=(transit.match(/PAGE=\{ms:(\d+)/)||[])[1];
if(page!==pageMs){console.log("FAIL --m-page ("+page+") is not transit.js PAGE.ms ("+pageMs+")");bad++;}
for(const k in CEIL){
  const ok=count[k]<=CEIL[k];
  console.log((ok?"ok  ":"FAIL")+" "+k.padEnd(8)+" "+String(count[k]).padStart(4)+" (ceiling "+CEIL[k]+(TARGET[k]!=null?", target "+TARGET[k]:"")+")");
  if(!ok){bad++;console.log("     a one-off was added: use a token from docs/DESIGN-SYSTEM.md");}
  else if(count[k]<CEIL[k])console.log("     below the ceiling: lower CEIL."+k+" to "+count[k]+" in tests/design.mjs");}
console.log(bad?bad+" failed":"design system: no new one-offs");
process.exit(bad?1:0);

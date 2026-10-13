import {bodySvg, classes, onMap} from "../bodymap.js";

/* lib: the whole library, {name: {m, x}}, as the runner reads it. */
function run(t,lib){
  /* ---- every muscle the library names is on the body ---- */
  const named=new Set();
  for(const n in lib){named.add(lib[n].m);(lib[n].x||[]).forEach(m=>named.add(m));}
  const off=[...named].filter(m=>!onMap(m));
  t.eq(off,[],"every primary and secondary muscle in the library has its shapes");
  t.ok(["Hams & glutes","Upper chest","Traps","Legs"].every(onMap),"and so do the names Progress and the coach use");

  /* ---- which shape lights, and how ---- */
  const c=classes({Quads:"p",Glutes:"s",Hamstrings:"s"});
  t.eq([c.f.quadriceps,c.b.gluteal,c.b.hamstring,c.f.chest],["p","s","s",undefined],"a squat: quads primary, glutes and hamstrings secondary, chest unlit");
  t.eq(classes({Back:"s",Traps:"p"}).b.trapezius,"p","a shape lit twice keeps the stronger");
  t.eq(classes({Shoulders:"p"}),{f:{deltoids:"p"},b:{deltoids:"p"}},"the shoulders show front and back");
  t.eq([0,.1,.3,.6,.9,1].map(v=>classes({Chest:v}).f.chest),[undefined,"h1","h2","h3","h4","h4"],"a week's share shades in four steps; nothing done stays unlit");
  t.eq(classes({Nowhere:"p",Chest:"x"}),{f:{},b:{}},"an unknown muscle or mark lights nothing");

  /* ---- the drawing ---- */
  const svg=bodySvg({Core:"p"},'Primary: "Core" & more');
  t.ok(/^<svg class="bmap" viewBox="0 0 1448 1448" role="img" aria-label="Primary: &#34;Core&#34; &#38; more"/.test(svg),"labelled, with the label escaped");
  t.eq((svg.match(/class="m p"/g)||[]).length,2,"core lights the abs and the obliques");
  t.ok(/class="b"/.test(svg)&&!/class="b [ps]/.test(svg),"the head, hands and feet are drawn but never lit");
  t.ok(/aria-hidden="true"/.test(bodySvg({})),"with no label it is hidden from screen readers");
  const paths=svg.match(/ d="[^"]*"/g)||[];
  t.ok(paths.length>30&&paths.every(d=>/^ d="M[-\d.]/.test(d)),"every shape is a path that starts with a move");
}
export {run};

// build.mjs — joins the separate src modules into ONE standalone HTML file.
// Reads src/manifest.json (CSS + JS lists in load order), inlines everything,
// injects demo models from examples/*.model.json, and writes every output path
// in "outputs" (docs/index.html, index.html, calcgraph.html).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)));
const manifest = JSON.parse(readFileSync(join(root, "src/manifest.json"), "utf8"));

function read(p){ return readFileSync(join(root, p), "utf8"); }

let css = manifest.css.map(read).join("\n\n");
css = css.replace(/^@charset[^;]*;/gm, "");

const demoFiles = [
  ["businessExpenses", "examples/business-expenses.model.json"],
  ["beamDesign", "examples/beam-design.model.json"]
];
const demoJs = "(()=>{ const CG=(typeof window!=='undefined'?window:globalThis).CalcGraph=(typeof window!=='undefined'?window:globalThis).CalcGraph||{};" +
  demoFiles.map(([key, p]) => "CG.demos=CG.demos||{}; CG.demos." + key + "=" + JSON.stringify(JSON.parse(read(p))) + ";").join("") +
  "})();";
let js = manifest.js.map(read).join("\n\n");
js = js.replace(/\/\*__DEMO_JSONS__\*\//g, () => demoJs);

const html = read(manifest.template)
  .replace("__TITLE__", manifest.title)
  .replace("/*__CSS__*/", () => css)
  .replace("/*__JS__*/", () => js);

const kb = (s)=> (s.length/1024).toFixed(1)+" KB";
for (const outRel of manifest.outputs) {
  const out = join(root, outRel);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html, "utf8");
  console.log("Written " + outRel + " (" + kb(html) + ")");
}
console.log("Bundled " + manifest.css.length + " css + " + manifest.js.length + " js modules");

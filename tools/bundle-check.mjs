import { readFileSync } from "node:fs";
import vm from "node:vm";
import { installSandbox } from "./dom-stub.mjs";
const html = readFileSync("docs/index.html", "utf8");
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) { console.log("FAIL: no script block found"); process.exit(1); }
const sandbox = installSandbox();
vm.createContext(sandbox);
vm.runInContext(m[1], sandbox, { filename: "docs-bundle.js" });
const CG = sandbox.window.CalcGraph || sandbox.CalcGraph;
const ok = CG && CG.app && CG.model && CG.parser && CG.equation && CG.demos && CG.demos.businessExpenses && CG.demos.beamDesign;
console.log(ok ? "BUNDLE OK: app+engine+demos present" : "BUNDLE FAIL");
if (ok) {
  const { Model } = CG.model;
  const md = new Model(CG.demos.businessExpenses, []);
  const res = CG.evaluate.evaluateModel(md);
  console.log("bundle root value:", Math.round(res.root.value), "(expect 160056)");
}
process.exit(ok ? 0 : 1);

import { readFileSync } from "node:fs";
import vm from "node:vm";
import { installSandbox } from "./dom-stub.mjs";

const manifest = JSON.parse(readFileSync("src/manifest.json", "utf8"));
const code = manifest.js.map(p => readFileSync(p, "utf8")).join("\n;\n");
const sandbox = installSandbox();
vm.createContext(sandbox);
vm.runInContext(code, sandbox, { filename: "bundle-src.js" });
const CG = sandbox.window.CalcGraph || sandbox.CalcGraph;
const { Model } = CG.model;
const U = CG.util;
let failures = 0;
const check = (label, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log((ok ? "PASS" : "FAIL") + "  " + label + (ok ? "" : "   got " + JSON.stringify(actual) + " expected " + JSON.stringify(expected)));
};

const expenses = JSON.parse(readFileSync("examples/business-expenses.model.json", "utf8"));
const m = new Model(expenses, []);
check("expenses model valid", m.errors, []);
const ev = CG.evaluate.evaluateModel(m);
check("root total (annual incl. 8% tax)", Math.round(ev.root.value), 160056);
check("operations (annual)", Math.round(ev.results.operations.value), 81600);
check("overhead (marketing weekly -> annual)", ev.results.overhead.value, 41600);
check("salaries raw value (monthly)", ev.results.salaries.value, 4500);
check("salaries converted into operations = 54000", ev.contrib.find(c => c.parent === "operations" && c.child === "salaries").value, 54000);
check("gross total", ev.results.gross_total.value, 148200);

const beam = JSON.parse(readFileSync("examples/beam-design.model.json", "utf8"));
const mb = new Model(beam, []);
check("beam model valid", mb.errors, []);
const evb = CG.evaluate.evaluateModel(mb);
check("bending moment F*L/4 = 7500000 N.mm", evb.results.bending_moment.value, 7500000);
check("bending stress M/S = 37.5 MPa", evb.results.bending_stress.value, 37.5);
check("utilization 37.5/355", Number(evb.results.utilization.value.toFixed(4)), 0.1056);
check("status (util <= 1 -> 1)", evb.results.status.value, 1);

check("identifiers extraction", CG.parser.identifiers("gross_total * (1 + tax_rate)"), ["gross_total", "tax_rate"]);
check("parser eval", CG.parser.evaluate(CG.parser.parse("gross_total * (1 + tax_rate)"), { gross_total: 148200, tax_rate: 0.08 }).value, 160056);
check("simplify folds constants", CG.parser.toSource(CG.parser.simplify(CG.parser.parse("2*3 + x*1 + 0"))), "6 + x");
check("if() works", CG.parser.evaluate(CG.parser.parse("if(3 > 2, 10, 20)"), {}).value, 10);
check("division by zero reported", CG.parser.evaluate(CG.parser.parse("1/0"), {}).ok, false);

const cyc = new Model({ root: "a", terms: [{ kind: "formula", name: "a", formula: "b" }, { kind: "formula", name: "b", formula: "a" }] }, []);
check("cycle detected", cyc.errors.length > 0, true);
const unk = new Model({ root: "a", terms: [{ kind: "formula", name: "a", formula: "zzz" }] }, []);
check("unknown reference detected", unk.errors.length > 0, true);

const h = CG.equation.combinedEquationHtml({ model: m, results: ev.results, expanded: new Set(), numeric: false, maxDepth: 12 }).html;
check("root force-expands in combined eq", h.includes("total_expenses") && h.includes("gross_total") && h.includes("0.08") === false, true);
const hExp = CG.equation.combinedEquationHtml({ model: m, results: ev.results, expanded: new Set(["gross_total", "operations", "overhead"]), numeric: false, maxDepth: 12 }).html;
check("period factors materialize (x12)", hExp.includes("\u00d7 12"), true);
check("period factors materialize (x52)", hExp.includes("\u00d7 52"), true);
const hNum = CG.equation.combinedEquationHtml({ model: m, results: ev.results, expanded: new Set(["gross_total", "operations", "overhead"]), numeric: true, maxDepth: 12 }).html;
check("numeric mode substitutes constant 0.08", hNum.includes("0.08"), true);
check("numeric mode substitutes leaf 800", hNum.includes("800"), true);
const all = CG.equation.allTermsHtml(m, ev.results);
check("all-terms view renders with root badge", all.includes("root") && all.includes("operations"), true);

const rt = new Model(m.toJSON(), []);
check("round-trip revalidates", rt.errors, []);

// ---- names with spaces + id-based internal references ----
const sp = JSON.parse(readFileSync("examples/spaces-demo.model.json", "utf8"));
const ms = new Model(sp, []);
check("spaces model valid", ms.errors, []);
const evs = CG.evaluate.evaluateModel(ms);
check("spaces root (99,792/yr incl. 8% tax)", Math.round(evs.root.value), 99792);
check("spaces gross total (92,400)", Math.round(evs.results["Gross Total"].value), 92400);
check("spaces rent converted into gross (x12)", Math.round(evs.contrib.find(c => c.child === "Office Rent" && c.parent === "Gross Total").value), 24000);
check("internal formula stored by id", ms.termByName("Total Expenses").formula.includes("\u0060"), true);
check("decompile shows quoted spaced names", CG.parser.decompileFormula(ms.termByName("Total Expenses").formula, ms).includes('"Gross Total"'), true);
check("quoted names parse to names", CG.parser.identifiers('"Office Rent" + "Internet"'), ["Office Rent", "Internet"]);
check("toSource keeps quotes for spaced names", CG.parser.toSource(CG.parser.parse('"Office Rent" + 1')), '"Office Rent" + 1');
check("compileFormula idempotent", CG.parser.compileFormula(ms.termByName("Total Expenses").formula, ms) === ms.termByName("Total Expenses").formula, true);
check("rename is a label-only change", (() => {
  const t = ms.termByName("Office Rent");
  t.name = "Office Space";
  ms._index();
  return CG.evaluate.evaluateModel(ms).results["Office Space"].value === 2000 &&
         CG.evaluate.evaluateModel(ms).results["Total Expenses"].value === 99792;
})(), true);
check("spaces unknown name rejected", (() => {
  try {
    CG.model.Model.fromJSON(JSON.stringify({ root: "x", terms: [{ kind: "formula", name: "x", formula: '"Nope Not There"' }] }), []);
    return false;
  } catch (e) { return /unknown name/i.test(e.message || ""); }
})(), true);
const spRt = new Model(ms.toJSON(), []);
check("spaces round-trip revalidates", spRt.errors, []);
check("export decompiles to names", (() => {
  const j = ms.toJSON();
  const f = j.terms.find(t => t.name === "Total Expenses").formula;
  return f.includes('"Gross Total"') && !f.includes("\u0060");
})(), true);

console.log(failures === 0 ? "\nALL SMOKE TESTS PASSED" : "\n" + failures + " FAILURES");
process.exit(failures === 0 ? 0 : 1);

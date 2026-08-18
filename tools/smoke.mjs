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

console.log(failures === 0 ? "\nALL SMOKE TESTS PASSED" : "\n" + failures + " FAILURES");
process.exit(failures === 0 ? 0 : 1);

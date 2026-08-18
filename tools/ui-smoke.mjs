import { readFileSync } from "node:fs";
import vm from "node:vm";

class ElStub {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.attributes = {};
    this.dataset = {};
    this.style = {};
    this.classList = {
      _s: new Set(),
      add: (...c) => c.forEach(x => this.classList._s.add(x)),
      remove: (...c) => c.forEach(x => this.classList._s.delete(x)),
      toggle: (c, f) => { if (f === undefined) { this.classList._s.has(c) ? this.classList._s.delete(c) : this.classList._s.add(c); } else if (f) this.classList._s.add(c); else this.classList._s.delete(c); },
      contains: (c) => this.classList._s.has(c)
    };
    this._listeners = {};
    this.value = "";
    this._text = "";
    this.innerHTML = "";
    this.id = "";
    this.className = "";
    this.checked = false;
    this.disabled = false;
    this.selected = false;
    this.type = "";
    this.selectionStart = 0; this.selectionEnd = 0;
    this.viewBox = { baseVal: { x: 0, y: 0, width: 1200, height: 700 } };
    this.clientWidth = 800; this.clientHeight = 600;
  }
  get textContent() { return this._text; }
  set textContent(v) { this._text = String(v == null ? "" : v); }
  setAttribute(k, v) { this.attributes[k] = String(v); if (k === "id") this.id = String(v); if (k === "viewBox") { const m = String(v).split(/\s+/).map(Number); this.viewBox.baseVal = { x: m[0], y: m[1], width: m[2], height: m[3] }; } }
  getAttribute(k) { return this.attributes[k] == null ? null : this.attributes[k]; }
  appendChild(c) { c.parentNode = this; this.children.push(c); return c; }
  removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); c.parentNode = null; return c; }
  replaceChildren(...cs) { this.children = []; cs.forEach(c => this.appendChild(c)); }
  addEventListener(type, fn) { (this._listeners[type] = this._listeners[type] || []).push(fn); }
  removeEventListener() {}
  dispatchEvent(ev) {
    ev = ev || {}; ev.target = ev.target || this;
    ev.preventDefault = ev.preventDefault || (() => {});
    ev.stopPropagation = ev.stopPropagation || (() => {});
    (this._listeners[ev.type] || []).forEach(fn => fn(ev));
    return true;
  }
  focus() {} click() {}
  remove() { if (this.parentNode) this.parentNode.removeChild(this); }
  querySelectorAll() { return []; }
  querySelector() { return null; }
}

// real-document behavior: getElementById searches the whole tree
const docRoots = { roots: [] };
const doc = {
  createElement: (tag) => new ElStub(tag),
  createElementNS: (ns, tag) => new ElStub(tag),
  querySelector: () => null,
  addEventListener() {},
  body: new ElStub("body"),
  hidden: false,
  getElementById(id) {
    const walk = (n) => {
      if (n.id === id) return n;
      for (const c of n.children || []) { const r = walk(c); if (r) return r; }
      return null;
    };
    for (const r of docRoots.roots) { const f = walk(r); if (f) return f; }
    return null;
  }
};
const appEl = new ElStub("div"); appEl.id = "app";
docRoots.roots.push(appEl, doc.body);

const storage = {
  _m: {},
  getItem(k) { return this._m[k] == null ? null : this._m[k]; },
  setItem(k, v) { this._m[k] = String(v); },
  removeItem(k) { delete this._m[k]; },
  clear() { this._m = {}; }
};

const win = { addEventListener() {}, document: doc };
const urlStub = { createObjectURL: () => "blob:stub", revokeObjectURL: () => {} };
class BlobStub { constructor(parts) { this.size = parts.join("").length; } }

const html = readFileSync("docs/index.html", "utf8");
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) { console.log("FAIL: no script block in docs/index.html"); process.exit(1); }

const sandbox = {
  console,
  document: doc,
  window: win,
  localStorage: storage,
  URL: urlStub,
  Blob: BlobStub,
  confirm: () => true,
  prompt: () => "stubbed",
  setTimeout, clearTimeout,
  Event: globalThis.Event || class Event { constructor(type) { this.type = type; } },
  FileReader: class FileReader { readAsText() {} }
};
vm.createContext(sandbox);
vm.runInContext(m[1], sandbox, { filename: "docs-bundle.js" });

const CG = sandbox.window.CalcGraph || sandbox.CalcGraph;
let failures = 0;
const check = (label, cond, extra) => {
  if (!cond) failures++;
  console.log((cond ? "PASS" : "FAIL") + "  " + label + (cond ? "" : "   " + (extra || "")));
};

try {
  await new Promise(res => setTimeout(res, 50));
  check("boot: app skeleton built", appEl.children.length >= 3, "children=" + appEl.children.length);
  const st = CG.app.state();
  check("boot: model loaded from demo", !!st.model && st.model.terms.length > 0);
  check("boot: root is total_expenses", !!st.model && st.model.root === "total_expenses");
  check("boot: evaluation 160056", st.results && Math.round(st.results.root.value) === 160056, "got=" + JSON.stringify(st.results && st.results.root));
  const fv = doc.getElementById("footer-value");
  check("boot: footer shows root value", !!fv && fv.textContent.includes("total_expenses"), "footer=" + (fv ? fv.textContent : "null"));
  check("boot: demos injected", !!(CG.demos && CG.demos.businessExpenses && CG.demos.beamDesign));

  CG.app.select("operations");
  check("select: selection set", CG.app.state().selected === "operations");
  CG.app.toggleExpand("operations");
  CG.app.expandAll();
  CG.app.collapseAll();
  CG.app.enterGroup("operations");
  check("enter group: scopePath", CG.app.state().scopePath.length === 1 && CG.app.state().scopePath[0] === "operations");
  CG.app.leaveGroup();
  check("leave group: scope cleared", CG.app.state().scopePath.length === 0);
  CG.app.updateTerm("rent", { value: 1500 }, true);
  check("quiet update re-evaluates rent", CG.app.state().results.results.rent.value === 1500);
  CG.app.updateTerm("rent", { value: 2000 }, true);

  CG.app.setView("equation");
  CG.app.setEqTab("all");
  CG.app.setView("graph");

  CG.app.openBuilder("total_expenses");
  check("builder modal opened", doc.body.children.some(c => (c.className || "").includes("modal-backdrop")));

  // ---- "+ New term" button: must open its modal and actually create a term ----
  const walkTree = (n, pred, out) => { if (pred(n)) out.push(n); for (const c of n.children || []) walkTree(c, pred, out); return out; };
  const walkAll = (pred) => { const out = []; for (const root of docRoots.roots) walkTree(root, pred, out); return out; };
  const openModals = () => walkAll(n => (n.className || "").includes("modal-backdrop"));
  openModals().forEach(m => m.remove()); // close the builder modal left open above
  const nBefore = CG.app.state().model.terms.length;
  const btnNewTerm = walkAll(n => n.tagName === "BUTTON" && (n.textContent || "").trim() === "+ New term")[0];
  check("new term: '+ New term' button present in sidebar outline", !!btnNewTerm);
  btnNewTerm.dispatchEvent({ type: "click" });
  const ntModals = openModals();
  check("new term: button opens the modal without crashing", ntModals.length === 1);
  const nm = ntModals[0];
  const nameIn = walkTree(nm, n => (n.placeholder || "").includes("total_expenses"), [])[0];
  const kindSel = walkTree(nm, n => n.tagName === "SELECT", [])[0];
  const formulaIn = walkTree(nm, n => n.tagName === "TEXTAREA" && n.rows === 2, [])[0];
  const createBtn = walkTree(nm, n => n.tagName === "BUTTON" && (n.textContent || "").trim() === "Create", [])[0];
  check("new term: modal has name/kind/formula fields and a Create button", !!nameIn && !!kindSel && !!formulaIn && !!createBtn);
  if (nameIn) nameIn.value = "smoke_new_term";
  if (kindSel) kindSel.value = "formula";
  if (formulaIn) formulaIn.value = "42";
  createBtn.dispatchEvent({ type: "click" });
  check("new term: term created via modal", !!CG.app.state().model.termByName("smoke_new_term"), "terms=" + CG.app.state().model.terms.length);
  check("new term: model grew by exactly one", CG.app.state().model.terms.length === nBefore + 1);
  // names with spaces: rename a term to a spaced name and assert it round-trips
  const okSp = CG.app.renameTerm("smoke_new_term", "Office Rent");
  check("spaces: rename to spaced name accepted", okSp === true);
  check("spaces: spaced name resolves + formula still evaluates", !!CG.app.state().model.termByName("Office Rent") && CG.app.state().results.results["Office Rent"].value === 42);
  check("spaces: spaced name usable in formula + decompiled view", (() => {
    const t = CG.app.state().model.termByName("Office Rent");
    t.formula = CG.parser.compileFormula('"rent" + 1', CG.app.state().model);
    CG.app.commit();
    const f = CG.parser.decompileFormula(t.formula, CG.app.state().model);
    return f === "rent + 1" && CG.app.state().results.results["Office Rent"] && CG.app.state().results.results["Office Rent"].value === 24001;
  })(), true);

  try { CG.app.addConstant({ id: "c-x", name: "test_const", value: 5, unit: "", description: "", slider: undefined, snapshots: undefined }, "project"); check("add project constant ok", true); }
  catch (e) { check("add project constant ok", false, e.message); }

  // ---- rename propagates everywhere ----
  const okR1 = CG.app.renameTerm("rent", "office_rent");
  check("rename: accepted", okR1 === true, "got=" + okR1);
  check("rename: term renamed", !!CG.app.state().model.termByName("office_rent") && !CG.app.state().model.termByName("rent"));
  check("rename: group children updated", JSON.stringify(CG.app.state().model.termByName("operations").children).includes("office_rent"));
  check("rename: results updated", CG.app.state().results.results.office_rent && CG.app.state().results.results.office_rent.value === 2000);
  const fBefore = CG.app.state().model.termByName("total_expenses").formula;
  const okR2 = CG.app.renameTerm("gross_total", "gross");
  check("rename: formulas untouched (id-based refs)", okR2 && CG.app.state().model.termByName("total_expenses").formula === fBefore, CG.app.state().model.termByName("total_expenses").formula);
  const okR3 = CG.app.renameTerm("gross", "gross_total"); // back
  check("rename: back works", okR3);
  const okR4 = CG.app.renameTerm("office_rent", "rent");
  check("rename: back (rent)", okR4);
  check("rename: root intact", CG.app.state().model.root === "total_expenses");
  const badR = CG.app.renameTerm("rent", "operations");
  check("rename: collision rejected", badR === false);

  // ---- unit library ----
  const ulib = CG.units.load();
  const uq = CG.units.quantities(ulib);
  check("units: default quantities include Time/Length/Breadth", uq.includes("Time") && uq.includes("Length") && uq.includes("Breadth"), "got=" + uq.join(","));
  check("units: default time units include year", CG.units.symbolsFor(ulib, "Time").includes("yr"));
  const c1 = CG.units.addCustom({ quantity: "Test Q", name: "testunit", symbol: "tu" });
  check("units: custom add ok", !!c1 && !c1.builtin);
  const ulib2 = CG.units.load();
  check("units: custom persisted to global library", ulib2.some(u => u.symbol === "tu"));
  const beamModel = new CG.model.Model(CG.demos.beamDesign, []);
  check("units: derived unit N*mm", CG.units.deriveUnit("point_load * span / 4", beamModel) === "N\u00b7mm", "got=" + CG.units.deriveUnit("point_load * span / 4", beamModel));
  check("units: derived unit stress M/S", CG.units.deriveUnit("bending_moment / section_modulus", beamModel) === "N.mm/mm3", "got=" + CG.units.deriveUnit("bending_moment / section_modulus", beamModel));
  check("units: derived unit symbol join uses \u00b7", CG.units.deriveUnit("point_load * span / 4", beamModel) === "N\u00b7mm");
  CG.units.removeUnit(c1.id);
  check("units: custom removed", !CG.units.load().some(u => u.id === c1.id));

  // ---- parser rename helper ----
  check("renameIdentifiers token-safe", CG.parser.renameIdentifiers("gross_total * (1 + tax_rate)", { gross_total: "gross" }) === "gross * (1 + tax_rate)");
  check("renameIdentifiers no false positives", CG.parser.renameIdentifiers("salary + salaries", { salary: "base_salary" }) === "base_salary + salaries");

  console.log(failures === 0 ? "\nALL UI SMOKE TESTS PASSED" : "\n" + failures + " UI FAILURES");
} catch (e) {
  failures++;
  console.log("CRASH DURING UI SMOKE:", e && e.stack ? e.stack : e);
  console.log("\nUI SMOKE FAILED");
}
process.exit(failures === 0 ? 0 : 1);

(() => {
  "use strict";
  const CG = (typeof window !== "undefined" ? window : globalThis).CalcGraph =
    (typeof window !== "undefined" ? window : globalThis).CalcGraph || {};
  const U = CG.util;
  const el = CG.ui.el, clear = CG.ui.clear;

  const state = {
    model: null,
    results: null,
    selected: null,
    scopePath: [],
    view: "graph",
    eqTab: "combined",
    expanded: new Set(),
    numeric: false,
    globalConstants: []
  };
  const dom = {};

  function stateView() {
    return {
      model: state.model,
      results: state.results,
      selected: state.selected,
      scopePath: state.scopePath,
      view: state.view,
      eqTab: state.eqTab,
      expanded: state.expanded,
      numeric: state.numeric,
      globalConstants: state.globalConstants
    };
  }
  function app() { return api; }
  function toast(msg, kind) {
    let wrap = document.querySelector(".toast-wrap");
    if (!wrap) { wrap = el("div", "toast-wrap"); document.body.appendChild(wrap); }
    const t = el("div", "toast" + (kind === "err" ? " err" : kind === "ok" ? " ok" : ""), msg);
    wrap.appendChild(t);
    setTimeout(() => t.remove(), 3800);
  }

  // ---------- skeleton ----------
  function buildSkeleton() {
    const root = document.getElementById("app");
    clear(root);

    // header
    const hdr = el("header", "hdr");
    const logo = el("div", "logo", "CalcGraph");
    logo.appendChild(el("small", "", "Node-Based Calculator"));
    hdr.appendChild(logo);
    const sel = el("select", "");
    sel.id = "model-select";
    hdr.appendChild(sel);
    const bNew = el("button", "btn", "New model");
    const bImport = el("button", "btn", "Import");
    const bExport = el("button", "btn", "Export JSON");
    hdr.appendChild(el("span", "spacer"));
    hdr.appendChild(bNew); hdr.appendChild(bImport); hdr.appendChild(bExport);
    const saved = el("span", "", "✓ saved");
    saved.id = "saved-ind"; saved.style.color = "var(--text-dim)"; saved.style.fontSize = "12px";
    hdr.appendChild(saved);
    root.appendChild(hdr);

    // workspace
    const ws = el("div", "workspace");
    const sidebar = el("aside", "", "");
    sidebar.id = "sidebar";
    const main = el("main", "", "");
    main.id = "main";
    const inspector = el("aside", "", "");
    inspector.id = "inspector";
    ws.appendChild(sidebar); ws.appendChild(main); ws.appendChild(inspector);
    root.appendChild(ws);

    // footer
    const ftr = el("footer", "ftr", "");
    const fv = el("span", "root-value", "");
    fv.id = "footer-value";
    const fh = el("span", "", "");
    fh.id = "footer-hint";
    fh.textContent = "Click any block to inspect, edit or dive in · double-click groups to enter them · wheel to zoom";
    ftr.appendChild(fv); ftr.appendChild(el("span", "spacer")); ftr.appendChild(fh);
    root.appendChild(ftr);

    dom.header = hdr; dom.modelSelect = sel; dom.sidebar = sidebar; dom.main = main; dom.inspector = inspector; dom.footerValue = fv;

    bNew.addEventListener("click", newModel);
    bImport.addEventListener("click", () => CG.importer.openImportModal(app()));
    bExport.addEventListener("click", () => { if (state.model) { CG.storage.exportModel(state.model); toast("Exported JSON file."); } });
    sel.addEventListener("change", () => { if (sel.value) loadModel(sel.value); });
  }

  // ---------- actions ----------
  function commit() {
    const m = state.model;
    if (!m) return;
    m._index();
    const errs = m.validate();
    state.results = CG.evaluate.evaluateModel(m);
    if (errs.length) toast(errs[0], "err");
    setSavedFlag(false);
    CG.storage.autosave(app());
    render();
  }

  function select(name) { state.selected = name || null; render(); }
  function toggleExpand(name) { if (state.expanded.has(name)) state.expanded.delete(name); else state.expanded.add(name); render(); }
  function expandAll() { if (!state.model) return; state.expanded = new Set(state.model.terms.map(t => t.name)); render(); }
  function collapseAll() { state.expanded = new Set(); render(); }
  function enterGroup(name) { state.scopePath.push(name); state.selected = name; render(); }
  function leaveGroup() { state.scopePath.pop(); render(); }
  function resetScope() { state.scopePath = []; render(); }

  function quickCommit() {
    const m = state.model;
    if (!m) return;
    m._index();
    state.results = CG.evaluate.evaluateModel(m);
    setSavedFlag(false);
    CG.storage.autosave(app());
    renderMain();
    renderFooter();
    renderHeaderSelect();
  }

  function updateTerm(name, patch, quiet) {
    const t = state.model.termByName(name);
    if (!t) return;
    Object.assign(t, patch);
    if (quiet) quickCommit(); else commit();
  }

  function addTerm(term) {
    state.model.terms.push(term);
    state.model._index();
    const errs = state.model.validate();
    if (errs.length) {
      state.model.terms.pop();
      state.model._index();
      throw new Error(errs[0]);
    }
    commit();
  }

  function deleteTerm(name) {
    const m = state.model;
    const idx = m.terms.findIndex(t => t.name === name);
    if (idx < 0) return;
    const [removed] = m.terms.splice(idx, 1);
    m._index();
    if (m.root === name) m.root = m.terms.length ? m.terms[0].name : "";
    const errs = m.validate();
    if (errs.length) { m.terms.splice(idx, 0, removed); m._index(); toast("Can't delete: " + errs[0], "err"); return; }
    if (state.selected === name) state.selected = null;
    commit();
  }

  function setSavedFlag(on) {
    const s = document.getElementById("saved-ind");
    if (!s) return;
    s.textContent = on ? "✓ saved" : "… saving";
    s.style.color = on ? "var(--ok)" : "var(--warn)";
  }

  // ---------- models ----------
  function newModel() {
    const name = prompt("Name for the new model?", "My model");
    if (!name) return;
    const data = {
      formatVersion: "0.1",
      id: U.uid(),
      name,
      description: "",
      root: "total",
      terms: [{ id: U.uid(), kind: "value", name: "total", value: 0, period: "year", unit: "", description: "Root term of this model." }]
    };
    try {
      const m = importModel(JSON.stringify(data));
      toast("New model '" + name + "' created.", "ok");
    } catch (e) { toast(e.message, "err"); }
  }

  function importModel(text) {
    const m = CG.model.Model.fromJSON(text, state.globalConstants);
    const list = CG.storage.loadModels();
    const entry = { id: m.id, name: m.name, updatedAt: Date.now(), model: m.toJSON() };
    const idx = list.findIndex(x => x.id === m.id);
    if (idx >= 0) list[idx] = entry; else list.push(entry);
    CG.storage.saveModels(list);
    loadModel(m.id);
    return m;
  }

  function loadModel(id) {
    const list = CG.storage.loadModels();
    const entry = list.find(x => x.id === id);
    if (!entry) { toast("Model not found.", "err"); return; }
    try {
      state.model = new CG.model.Model(entry.model, state.globalConstants);
    } catch (e) { toast("Model file is invalid: " + e.message, "err"); return; }
    state.selected = null;
    state.scopePath = [];
    state.expanded = new Set();
    state.results = CG.evaluate.evaluateModel(state.model);
    const errs = state.model.errors;
    if (errs.length) toast("Model has issues: " + errs[0], "err");
    render();
  }

  function loadDemo(key) {
    if (!CG.demos || !CG.demos[key]) { toast("Demo not found.", "err"); return; }
    try { importModel(JSON.stringify(CG.demos[key])); toast("Demo loaded.", "ok"); }
    catch (e) { toast("Demo failed: " + e.message, "err"); }
  }

  // ---------- constants ----------
  function addConstant(obj, scope) {
    if (scope === "global") {
      if (state.globalConstants.some(c => c.name === obj.name)) throw new Error("A global constant named '" + obj.name + "' already exists.");
      state.globalConstants.push(obj);
      CG.storage.saveGlobalConstants(state.globalConstants);
      if (state.model) { state.model.globalConstants = state.globalConstants; state.model._index(); commit(); }
      else render();
      toast("Global constant added.", "ok");
    } else {
      const m = state.model;
      let lib = m.libraries[0];
      if (!lib) { lib = { id: "lib-" + Math.random().toString(36).slice(2, 7), name: m.name + " constants", constants: [] }; m.libraries.push(lib); }
      if (lib.constants.some(c => c.name === obj.name)) throw new Error("A project constant named '" + obj.name + "' already exists.");
      lib.constants.push(obj);
      commit();
      toast("Project constant added.", "ok");
    }
  }

  function updateConstant(oldName, obj, scope) {
    if (scope === "global") {
      const i = state.globalConstants.findIndex(c => c.name === oldName);
      if (i >= 0) state.globalConstants[i] = obj;
      CG.storage.saveGlobalConstants(state.globalConstants);
      if (state.model) { state.model.globalConstants = state.globalConstants; state.model._index(); commit(); }
      else render();
    } else {
      const m = state.model;
      for (const lib of m.libraries) {
        const i = lib.constants.findIndex(c => c.name === oldName);
        if (i >= 0) { lib.constants[i] = obj; commit(); return; }
      }
      toast("Constant not found.", "err");
    }
  }

  function deleteConstant(name, scope) {
    if (scope === "global") {
      state.globalConstants = state.globalConstants.filter(c => c.name !== name);
      CG.storage.saveGlobalConstants(state.globalConstants);
      if (state.model) { state.model.globalConstants = state.globalConstants; state.model._index(); commit(); }
      else render();
      toast("Deleted global constant.", "ok");
    } else {
      const m = state.model;
      for (const lib of m.libraries) lib.constants = lib.constants.filter(c => c.name !== name);
      commit();
      toast("Deleted project constant.", "ok");
    }
  }

  // ---------- rendering ----------
  function render() {
    if (!state.model) return;
    renderHeaderSelect();
    renderSidebar();
    renderMain();
    renderInspector();
    renderFooter();
  }

  function renderHeaderSelect() {
    const sel = dom.modelSelect;
    clear(sel);
    const list = CG.storage.loadModels();
    const cur = state.model ? state.model.id : null;
    for (const m of list) {
      const o = el("option", "", m.name + (m.id === cur ? " ◉" : ""));
      o.value = m.id;
      if (m.id === cur) o.selected = true;
      sel.appendChild(o);
    }
  }

  function renderSidebar() {
    const sb = dom.sidebar;
    clear(sb);
    // models
    const secModels = el("div", "side-section");
    const msTitle = el("h3", "side-section-title", "MODELS");
    secModels.appendChild(msTitle);
    const savedList = el("div", "");
    secModels.appendChild(savedList);
    sb.appendChild(secModels);
    CG.storage.renderModelsList(savedList, app());

    // outline
    const secTree = el("div", "side-section");
    const tTitle = el("h3", "side-section-title", "MODEL · " + state.model.name);
    secTree.appendChild(tTitle);
    const tree = el("ul", "tree");
    const groups = state.model.terms.filter(t => t.kind === "group");
    const others = state.model.terms.filter(t => t.kind !== "group");
    const order = (t) => t.name === state.model.root ? 0 : t.kind === "group" ? 1 : 2;
    const all = [...groups, ...others].sort((a, b) => order(a) - order(b) || a.name.localeCompare(b.name));
    for (const t of all) {
      const li = el("li", (t.kind === "group" ? "grp " : t.kind === "formula" ? "formula " : "value ") + (state.selected === t.name ? "sel" : ""));
      li.dataset.name = t.name;
      const nm = el("span", "", t.name);
      const val = state.results && state.results.results[t.name];
      const v = el("span", "val", val ? (val.value !== undefined ? U.fmt(val.value) : "⚠") : "");
      li.appendChild(nm); li.appendChild(v);
      li.addEventListener("click", () => select(t.name));
      li.addEventListener("dblclick", () => { if (t.kind === "group") enterGroup(t.name); });
      tree.appendChild(li);
    }
    secTree.appendChild(tree);
    const btnRow = el("div", "flex-row");
    const bAddTerm = el("button", "btn small", "+ New term");
    bAddTerm.addEventListener("click", () => CG.builder.openNewTerm(app()));
    btnRow.appendChild(bAddTerm);
    if (CG.demos) {
      const bDemo1 = el("button", "btn small", "Demo: expenses");
      bDemo1.addEventListener("click", () => loadDemo("businessExpenses"));
      const bDemo2 = el("button", "btn small", "Demo: beam");
      bDemo2.addEventListener("click", () => loadDemo("beamDesign"));
      btnRow.appendChild(bDemo1); btnRow.appendChild(bDemo2);
    }
    secTree.appendChild(btnRow);
    sb.appendChild(secTree);

    // constants
    sb.appendChild(el("div", "", ""));
    const libBox = el("div", "");
    sb.appendChild(libBox);
    CG.libraries.renderLibraries(libBox, app());
    sb.appendChild(libBox);
  }

  function renderMain() {
    const main = dom.main;
    clear(main);
    const vh = el("div", "view-header");
    // breadcrumbs
    const crumbs = el("div", "view-breadcrumbs");
    const rootCrumb = el("span", "crumb" + (state.scopePath.length === 0 ? " current" : ""), state.model.name);
    rootCrumb.addEventListener("click", resetScope);
    crumbs.appendChild(rootCrumb);
    state.scopePath.forEach((g, i) => {
      const sep = el("span", "crumb-sep", "›");
      const c = el("span", "crumb" + (i === state.scopePath.length - 1 ? " current" : ""), g);
      c.addEventListener("click", () => { state.scopePath = state.scopePath.slice(0, i + 1); render(); });
      crumbs.appendChild(sep); crumbs.appendChild(c);
    });
    vh.appendChild(crumbs);
    if (state.scopePath.length) {
      const back = el("button", "btn small", "← out");
      back.addEventListener("click", leaveGroup);
      vh.appendChild(back);
    }
    // view toggle
    const tg = el("div", "flex-row");
    const bg = el("button", "btn small" + (state.view === "graph" ? " primary" : ""), "Graph");
    const be = el("button", "btn small" + (state.view === "equation" ? " primary" : ""), "Equation");
    bg.addEventListener("click", () => { state.view = "graph"; render(); });
    be.addEventListener("click", () => { state.view = "equation"; render(); });
    tg.appendChild(bg); tg.appendChild(be);
    if (state.view === "equation") {
      const bEx = el("button", "btn small", "Expand all"); bEx.addEventListener("click", expandAll);
      const bCol = el("button", "btn small", "Collapse all"); bCol.addEventListener("click", collapseAll);
      const bNum = el("button", "btn small" + (state.numeric ? " primary" : ""), "Numbers");
      bNum.addEventListener("click", () => { state.numeric = !state.numeric; render(); });
      const tabComb = el("button", "btn small" + (state.eqTab === "combined" ? " primary" : ""), "Combined");
      const tabAll = el("button", "btn small" + (state.eqTab === "all" ? " primary" : ""), "All terms");
      tabComb.addEventListener("click", () => { state.eqTab = "combined"; render(); });
      tabAll.addEventListener("click", () => { state.eqTab = "all"; render(); });
      tg.appendChild(tabComb); tg.appendChild(tabAll); tg.appendChild(bEx); tg.appendChild(bCol); tg.appendChild(bNum);
    }
    vh.appendChild(tg);
    main.appendChild(vh);

    const viewRoot = el("div", "");
    viewRoot.id = "view-root";
    viewRoot.style.cssText = "flex:1;min-height:0;position:relative;overflow:hidden;";
    main.appendChild(viewRoot);

    if (state.view === "graph") {
      const scope = state.scopePath.length ? state.scopePath[state.scopePath.length - 1] : null;
      const layout = CG.layout.layoutGraph(state.model, state.results, scope);
      const handlers = {
        onSelect: (n) => select(n),
        onEnter: (n) => enterGroup(n),
        onBlank: () => select(null)
      };
      viewRoot.style.overflow = "hidden";
      CG.graph.renderGraph(viewRoot, layout, handlers);
      if (state.selected) CG.graph.highlightSelection(viewRoot, state.selected);
      // zoom controls
      const zc = el("div", "graph-zoom");
      const zi = el("button", "btn small", "+");     zi.addEventListener("click", () => CG.graph.zoomBy(viewRoot, 0.85));
      const zo = el("button", "btn small", "−"); zo.addEventListener("click", () => CG.graph.zoomBy(viewRoot, 1.18));
      const zf = el("button", "btn small", "fit");   zf.addEventListener("click", () => viewRoot.__cgReset && viewRoot.__cgReset());
      zc.appendChild(zi); zc.appendChild(zo); zc.appendChild(zf);
      viewRoot.appendChild(zc);
    } else {
      const body = el("div", "eq-scroll");
      body.style.cssText = "height:100%;overflow:auto;";
      const ctx = {
        model: state.model,
        results: state.results ? state.results.results : {},
        expanded: state.expanded,
        numeric: state.numeric,
        maxDepth: 12
      };
      if (state.eqTab === "combined") {
        const out = CG.equation.combinedEquationHtml(ctx);
        body.appendChild(el("div", "notice dim", "This is the complete equation of the whole model. Click a name to select it; double-click to expand/collapse that part."));
        const eq = el("div", "eq-root", "");
        eq.innerHTML = out.html;
        body.appendChild(eq);
      } else {
        const eq = el("div", "eq-root", "");
        eq.innerHTML = CG.equation.allTermsHtml(state.model, state.results.results);
        body.appendChild(eq);
      }
      viewRoot.appendChild(body);
      bindEquationClicks(viewRoot);
    }
  }

  function bindEquationClicks(root) {
    root.querySelectorAll(".eq-name[data-name]").forEach(el0 => {
      el0.addEventListener("click", (ev) => { ev.stopPropagation(); select(el0.dataset.name); });
      el0.addEventListener("dblclick", (ev) => { ev.stopPropagation(); toggleExpand(el0.dataset.name); });
    });
  }

  function renderInspector() {
    const ins = dom.inspector;
    CG.inspector.renderInspector(ins, app());
  }

  function renderFooter() {
    const fv = dom.footerValue;
    if (!state.model) { fv.textContent = ""; return; }
    const r = state.results && state.results.root;
    if (r && r.value !== undefined) {
      const t = state.model.termByName(state.model.root);
      let s = state.model.root + " = " + U.fmt(r.value);
      if (t && t.unit) s += " " + t.unit;
      if (t && t.period) s += " (" + t.period + ")";
      fv.textContent = s;
      fv.style.color = "var(--ok)";
    } else {
      fv.textContent = state.model.root + " = " + (r ? (r.error || "?") : "?");
      fv.style.color = "var(--err)";
    }
  }

  function bindGlobalEvents() {
    document.addEventListener("visibilitychange", () => { if (document.hidden) CG.storage.autosave(app()); });
    window.addEventListener("beforeunload", () => { if (state.model) { const list = CG.storage.loadModels(); const idx = list.findIndex(m => m.id === state.model.id); const entry = { id: state.model.id, name: state.model.name, updatedAt: Date.now(), model: state.model.toJSON() }; if (idx >= 0) list[idx] = entry; else list.push(entry); CG.storage.saveModels(list); } });
  }

  const api = {
    init,
    state: stateView,
    select, toggleExpand, expandAll, collapseAll, enterGroup, leaveGroup, resetScope,
    updateTerm, addTerm, deleteTerm,
    addConstant, updateConstant, deleteConstant,
    importModel, loadModel, loadDemo, newModel,
    openBuilder: (name) => CG.builder.openBuilder(app(), name),
    commit, toast, setSavedFlag
  };

  function init() {
    state.globalConstants = CG.storage.loadGlobalConstants();
    buildSkeleton();
    const saved = CG.storage.loadModels();
    if (saved.length) loadModel(saved[saved.length - 1].id);
    else if (CG.demos && CG.demos.businessExpenses) loadDemo("businessExpenses");
    else toast("No model yet — use Import or create terms in the sidebar.", "err");
  }

  CG.app = api;
})();
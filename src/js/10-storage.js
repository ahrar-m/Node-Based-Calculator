(() => {
  "use strict";
  const CG = (typeof window !== "undefined" ? window : globalThis).CalcGraph =
    (typeof window !== "undefined" ? window : globalThis).CalcGraph || {};
  const el = CG.ui.el, clear = CG.ui.clear;
  const MODELS_KEY = "calcgraph.models.v2";
  const GLOB_KEY = "calcgraph.global.cons.v1";

  function loadModels() {
    try { const raw = localStorage.getItem(MODELS_KEY); return raw ? JSON.parse(raw) : []; }
    catch { return []; }
  }
  function saveModels(list) { try { localStorage.setItem(MODELS_KEY, JSON.stringify(list)); } catch {} }
  function loadGlobalConstants() {
    try { const raw = localStorage.getItem(GLOB_KEY); return raw ? JSON.parse(raw) : []; }
    catch { return []; }
  }
  function saveGlobalConstants(arr) { try { localStorage.setItem(GLOB_KEY, JSON.stringify(arr)); } catch {} }

  // debounced autosave of the active model
  function autosave(app) {
    clearTimeout(autosave.timer);
    autosave.timer = setTimeout(() => {
      const { model } = app.state();
      if (!model) return;
      const list = loadModels();
      const idx = list.findIndex(m => m.id === model.id);
      const entry = { id: model.id, name: model.name, updatedAt: Date.now(), model: model.toJSON() };
      if (idx >= 0) list[idx] = entry; else list.push(entry);
      saveModels(list);
      app.setSavedFlag(true);
    }, 350);
  }
  autosave.timer = null;

  function exportModel(model) {
    const json = JSON.stringify(model.toJSON(), null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (model.name || "model").toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".model.json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function renderModelsList(container, app) {
    clear(container);
    const sec = el("div", "side-section");
    sec.appendChild(el("h3", "side-section-title", "YOUR MODELS (browser-saved)"));
    const list = loadModels();
    if (!list.length) sec.appendChild(el("div", "notice dim", "Nothing saved yet — your work auto-saves to this browser."));
    for (const m of list.slice().reverse()) {
      const row = el("div", "tree");
      const li = el("li", m.name === app.state().model.name ? "sel" : "");
      const nm = el("span", "", m.name);
      nm.addEventListener("click", () => app.loadModel(m.id));
      li.appendChild(nm);
      const btns = el("div", "flex-row");
      const del = el("button", "btn small danger", "✕");
      del.addEventListener("click", () => {
        if (!confirm("Delete saved model '" + m.name + "'?")) return;
        const l2 = loadModels().filter(x => x.id !== m.id);
        saveModels(l2);
        renderModelsList(container, app);
        app.toast("Deleted '" + m.name + "'.");
      });
      btns.appendChild(del);
      li.appendChild(btns);
      row.appendChild(li);
      sec.appendChild(row);
    }
    container.appendChild(sec);
  }

  CG.storage = { loadModels, saveModels, loadGlobalConstants, saveGlobalConstants, autosave, exportModel, renderModelsList };
})();

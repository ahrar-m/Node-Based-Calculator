(() => {
  "use strict";
  const CG = (typeof window !== "undefined" ? window : globalThis).CalcGraph =
    (typeof window !== "undefined" ? window : globalThis).CalcGraph || {};
  const el = CG.ui.el, clear = CG.ui.clear;

  function openImportModal(app) {
    const backdrop = el("div", "modal-backdrop");
    const modal = el("div", "modal wide");
    const h = el("h2", "", "");
    h.appendChild(el("span", "", "Import a model (AI-generated or hand-written)"));
    const closeX = el("button", "close", "✕");
    closeX.addEventListener("click", () => backdrop.remove());
    h.appendChild(closeX);
    modal.appendChild(h);
    const body = el("div", "m-body");
    modal.appendChild(body);

    body.appendChild(el("p", "notice dim", "Paste the JSON your AI produced (or any model JSON), or upload a .model.json file. It will be validated, then opened."));

    const tabs = el("div", "tabs");
    const tPaste = el("button", "tab active", "Paste JSON");
    const tFile = el("button", "tab", "Upload file");
    tabs.appendChild(tPaste); tabs.appendChild(tFile);
    body.appendChild(tabs);

    const pastePane = el("div", "");
    const ta = el("textarea", ""); ta.rows = 12; ta.placeholder = '{ "formatVersion": "0.1", "name": "...", "root": "...", "terms": [ ... ] }';
    ta.style.width = "100%"; ta.style.fontFamily = "var(--mono)";
    pastePane.appendChild(ta);
    const pasteBtn = el("button", "btn primary", "Validate & import");
    pasteBtn.style.marginTop = "8px";
    pastePane.appendChild(pasteBtn);
    body.appendChild(pastePane);

    const filePane = el("div", "");
    filePane.style.display = "none";
    const fileI = el("input", ""); fileI.type = "file"; fileI.accept = ".json,application/json";
    filePane.appendChild(fileI);
    body.appendChild(filePane);

    const errBox = el("div", "");
    body.appendChild(errBox);

    tPaste.addEventListener("click", () => { tPaste.classList.add("active"); tFile.classList.remove("active"); pastePane.style.display = ""; filePane.style.display = "none"; });
    tFile.addEventListener("click", () => { tFile.classList.add("active"); tPaste.classList.remove("active"); pastePane.style.display = "none"; filePane.style.display = ""; });

    const tryImport = (text, sourceName) => {
      clear(errBox);
      try {
        const model = app.importModel(text);
        backdrop.remove();
        app.toast("Imported '" + model.name + "' — " + model.terms.length + " terms.", "ok");
      } catch (e) {
        const n = el("div", "notice err", e.message);
        errBox.appendChild(n);
      }
    };
    pasteBtn.addEventListener("click", () => tryImport(ta.value, "pasted JSON"));
    fileI.addEventListener("change", () => {
      const f = fileI.files && fileI.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => tryImport(String(reader.result), f.name);
      reader.readAsText(f);
    });

    document.body.appendChild(backdrop); backdrop.appendChild(modal);
  }

  CG.importer = { openImportModal };
})();

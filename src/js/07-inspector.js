(() => {
  "use strict";
  const CG = (typeof window !== "undefined" ? window : globalThis).CalcGraph =
    (typeof window !== "undefined" ? window : globalThis).CalcGraph || {};
  const U = CG.util;

  // tiny DOM helpers shared by UI modules
  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  CG.ui = { el, clear };

  function renderInspector(container, app) {
    const { model, results, selected } = app.state();
    clear(container);
    if (!selected || !model.termByName(selected)) {
      container.appendChild(el("div", "empty-hint", "Click any term in the graph, equation, or outline to inspect it here.\n\nYou can rename it, edit its value or formula, add a unit (quantity + symbol), period, slider and snapshots."));
      return;
    }
    const term = model.termByName(selected);
    const rr = results && results.results ? results.results : {};
    const r = rr[selected] || {};

    // ---- header card ----
    const head = el("div", "insp-head");
    const nameRow = el("div", "flex-row");
    const nameInput = el("input", "insp-name");
    nameInput.type = "text";
    nameInput.value = term.name;
    nameInput.title = "Rename this term — every reference in the model is updated automatically";
    nameInput.addEventListener("change", () => {
      const v = nameInput.value.trim();
      if (v === term.name) { nameInput.value = term.name; return; }
      app.renameTerm(term.name, v);
      const cur = app.state().model.termByName(term.name);
      nameInput.value = cur ? cur.name : v;
    });
    nameInput.addEventListener("keydown", (ev) => { if (ev.key === "Enter") nameInput.blur(); });
    nameRow.appendChild(nameInput);
    if (term.name === model.root) nameRow.appendChild(el("span", "badge k-group", "\u2605 root"));
    head.appendChild(nameRow);

    const kindRow = el("div", "flex-row");
    kindRow.appendChild(el("span", "badge k-" + term.kind, term.kind === "formula" ? "\u0192 formula" : term.kind));
    if (term.period) kindRow.appendChild(el("span", "badge", term.period));
    if (term.unit) kindRow.appendChild(el("span", "badge k-constant", term.unit));
    head.appendChild(kindRow);

    const valPill = el("div", "kv value-pill");
    const dd = el("dd", "big");
    const valText = r.value !== undefined ? U.fmt(r.value) : (r.error || "?");
    dd.textContent = valText + (term.unit ? " " + term.unit : "") + (term.period ? "  \u00b7 " + term.period : "");
    valPill.appendChild(el("dt", "", "Current value"));
    valPill.appendChild(dd);
    if (r.error) { const er = el("div", "notice err", r.error); head.appendChild(er); }
    head.appendChild(valPill);
    container.appendChild(head);

    // ---- description ----
    const descSec = el("div", "side-section");
    descSec.appendChild(el("h3", "side-section-title", "What this term does"));
    const desc = el("textarea", "field", "");
    desc.rows = 3;
    desc.value = term.description || "";
    desc.placeholder = "Describe this term in plain language — visitors and AI read this when they click the block.";
    desc.addEventListener("input", () => app.updateTerm(term.name, { description: desc.value }, true));
    descSec.appendChild(desc);
    container.appendChild(descSec);

    // ---- per-kind editor ----
    const ed = el("div", "side-section");
    if (term.kind === "value") renderValueEditor(ed, term, r, app);
    else if (term.kind === "formula") renderFormulaEditor(ed, term, r, app);
    else renderGroupEditor(ed, term, r, app);
    container.appendChild(ed);

    // ---- used by ----
    const parents = model.parentsOf(term.name);
    if (parents.length) {
      const sec = el("div", "side-section");
      sec.appendChild(el("h3", "side-section-title", "Used by / feeds into"));
      const chain = pathToRoot(model, term.name);
      const pathRow = el("div", "flex-row");
      chain.forEach((n, i) => {
        pathRow.appendChild(el("span", "crumb" + (i === chain.length - 1 ? " current" : ""), n));
        if (i < chain.length - 1) pathRow.appendChild(el("span", "crumb-sep", "\u2192"));
      });
      sec.appendChild(pathRow);
      const chipRow = el("div", "flex-row");
      for (const p of parents) {
        const c = el("span", "chip term", p);
        c.addEventListener("click", () => app.select(p));
        chipRow.appendChild(c);
      }
      sec.appendChild(chipRow);
      container.appendChild(sec);
    }

    // ---- contributions ----
    const contribs = results.contrib ? results.contrib.filter(c => c.parent === term.name) : [];
    if (contribs.length) {
      const sec = el("div", "side-section");
      sec.appendChild(el("h3", "side-section-title", "What feeds this term"));
      for (const c of contribs) {
        const row = el("div", "kv");
        const d = el("dd", "");
        d.textContent = U.fmt(c.value) + (c.factor !== 1 ? "  (\u00d7" + U.fmt(c.factor) + ")" : "");
        row.appendChild(el("dt", "", c.child));
        row.appendChild(d);
        sec.appendChild(row);
      }
      container.appendChild(sec);
    }

    // ---- danger zone ----
    const dz = el("div", "side-section");
    const del = el("button", "btn danger small", "\u232b Delete term");
    del.addEventListener("click", () => {
      if (confirm("Delete term '" + term.name + "'? Referencing terms will break if they use it.")) app.deleteTerm(term.name);
    });
    dz.appendChild(del);
    container.appendChild(dz);
  }

  function pathToRoot(model, name) {
    const path = [name];
    let cur = name;
    const guard = new Set();
    while (cur && !guard.has(cur)) {
      guard.add(cur);
      const parents = model.parentsOf(cur);
      if (parents.length) { cur = parents[0]; path.push(cur); } else break;
    }
    return path;
  }

  // ---- unit + period block shared by every editor ----
  function renderUnitPeriod(ed, term, app) {
    const box = el("div", "");
    const uLabel = el("div", "field-label-row");
    uLabel.appendChild(el("span", "", "Unit (quantity \u2192 symbol)"));
    box.appendChild(uLabel);

    const picker = CG.units.renderUnitPicker(app, {
      value: term.unit || "",
      onPick: (sym) => app.updateTerm(term.name, { unit: sym }, true)
    });
    box.appendChild(picker);

    const pLabel = el("div", "field-label-row");
    pLabel.appendChild(el("span", "", "Period (time-bucket conversion)"));
    box.appendChild(pLabel);
    const pSel = CG.units.periodSelect(term.period || "", (v) => app.updateTerm(term.name, { period: v || "" }, true));
    box.appendChild(pSel);
    ed.appendChild(box);
  }

  function renderValueEditor(ed, term, r, app) {
    ed.appendChild(el("h3", "side-section-title", "Value"));
    const num = el("input", "");
    num.type = "number"; num.step = "any"; num.value = term.value;
    num.style.width = "100%"; num.style.fontWeight = "700";
    num.addEventListener("input", () => app.updateTerm(term.name, { value: Number(num.value) }, true));
    ed.appendChild(num);

    renderUnitPeriod(ed, term, app);
    renderSlider(ed, term, app);
    renderSnapshots(ed, term, app);
  }

  function renderSlider(box, term, app) {
    const s = term.slider;
    const sec = el("div", "");
    sec.style.marginTop = "10px";
    if (s) {
      const title = el("div", "flex-row");
      title.appendChild(el("span", "", "Slider"));
      const off = el("button", "btn small", "Remove slider");
      off.addEventListener("click", () => { const t = app.state().model.termByName(term.name); delete t.slider; app.commit(); });
      title.appendChild(off);
      sec.appendChild(title);
      const srow = el("div", "slider-row");
      const range = el("input", "");
      range.type = "range"; range.min = s.min; range.max = s.max; range.step = s.step; range.value = term.value;
      range.addEventListener("input", () => app.updateTerm(term.name, { value: Number(range.value) }, true));
      const out = el("output", "", U.fmt(Number(term.value)));
      range.addEventListener("input", () => { out.textContent = U.fmt(Number(range.value)); });
      const lo = el("span", "", U.fmt(Number(s.min)));
      const hi = el("span", "", U.fmt(Number(s.max)));
      srow.appendChild(lo); srow.appendChild(range); srow.appendChild(out);
      sec.appendChild(srow);
      box.appendChild(sec);
    } else {
      const add = el("button", "btn small", "\u2699 Add slider (min / max / step)");
      add.addEventListener("click", () => {
        const t = app.state().model.termByName(term.name);
        const v = Number(t.value) || 0;
        t.slider = { min: Math.min(0, v * 0.5), max: Math.max(1, v * 1.5), step: 1 };
        app.commit();
      });
      box.appendChild(add);
    }
  }

  function renderSnapshots(box, term, app) {
    const snaps = Array.isArray(term.snapshots) ? term.snapshots : [];
    if (snaps.length) {
      const sec = el("div", "");
      sec.style.marginTop = "10px";
      sec.appendChild(el("div", "", "Snapshots (click to apply)"));
      const row = el("div", "flex-row");
      for (const s of snaps) {
        const c = el("span", "chip", s.label + "  =  " + U.fmt(Number(s.value)));
        if (Number(s.value) === Number(term.value)) c.classList.add("selected");
        c.addEventListener("click", () => app.updateTerm(term.name, { value: Number(s.value) }, true));
        row.appendChild(c);
      }
      sec.appendChild(row);
      box.appendChild(sec);
    }
  }

  function renderFormulaEditor(ed, term, r, app) {
    ed.appendChild(el("h3", "side-section-title", "Formula"));
    const f = el("div", "notice dim formula-view");
    // Formulas are stored internally by id; display the human-readable,
    // name-based form (spaced names appear quoted).
    try { f.textContent = CG.parser.decompileFormula(term.formula || "", app.state().model); }
    catch { f.textContent = term.formula || ""; }
    ed.appendChild(f);
    const actions = el("div", "flex-row");
    const edit = el("button", "btn primary", "\u270e Edit formula");
    edit.addEventListener("click", () => app.openBuilder(term.name));
    actions.appendChild(edit);
    const rootBtn = el("button", "btn small", term.name === app.state().model.root ? "Root term \u2713" : "Make root");
    rootBtn.disabled = term.name === app.state().model.root;
    rootBtn.addEventListener("click", () => { const m = app.state().model; m.root = term.name; app.commit(); });
    actions.appendChild(rootBtn);
    ed.appendChild(actions);

    renderUnitPeriod(ed, term, app);

    // derived-unit check — does the formula's own units agree?
    const model = app.state().model;
    const du = CG.units.deriveUnit(term.formula, model);
    if (du) {
      const hint = el("div", "derived-unit", "\u21b3 formula yields: " + du);
      if (term.unit && du !== term.unit) hint.classList.add("mismatch");
      ed.appendChild(hint);
    }
  }

  function renderGroupEditor(ed, term, r, app) {
    ed.appendChild(el("h3", "side-section-title", "Group \u2014 sum of"));
    const row = el("div", "flex-row");
    for (const c of term.children || []) {
      const chip = el("span", "chip term", c + "  \u00d7");
      chip.title = "Remove from group";
      chip.addEventListener("click", () => {
        const t = app.state().model.termByName(term.name);
        t.children = t.children.filter(x => x !== c);
        app.commit();
      });
      row.appendChild(chip);
    }
    ed.appendChild(row);
    const addRow = el("div", "flex-row");
    const add = el("button", "btn small", "+ Add child");
    add.addEventListener("click", () => {
      const m = app.state().model;
      const candidates = m.terms.map(t => t.name).filter(n => n !== term.name && !(term.children || []).includes(n));
      const chooser = el("select", "");
      const emptyOpt = el("option", "", "(choose a term)");
      chooser.appendChild(emptyOpt);
      for (const n of candidates) chooser.appendChild(el("option", "", n));
      addRow.replaceChildren(add, chooser);
      chooser.addEventListener("change", () => {
        if (!chooser.value) return;
        const t = app.state().model.termByName(term.name);
        t.children = t.children || [];
        if (!t.children.includes(chooser.value)) t.children.push(chooser.value);
        app.commit();
      });
    });
    addRow.appendChild(add);
    ed.appendChild(addRow);

    renderUnitPeriod(ed, term, app);
  }

  CG.inspector = { renderInspector, pathToRoot };
})();
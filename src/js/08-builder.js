(() => {
  "use strict";
  const CG = (typeof window !== "undefined" ? window : globalThis).CalcGraph =
    (typeof window !== "undefined" ? window : globalThis).CalcGraph || {};
  const U = CG.util;
  const el = CG.ui.el, clear = CG.ui.clear;

  // ---- the interactive formula builder modal ----
  function openBuilder(app, termName) {
    const { model, results } = app.state();
    const rr = results && results.results ? results.results : {};
    const term = model.termByName(termName);
    if (!term) return;

    const backdrop = el("div", "modal-backdrop");
    const modal = el("div", "modal wide");
    const h = el("h2", "", "");
    h.appendChild(el("span", "", "Formula builder — " + termName));
    const closeX = el("button", "close", "✕");
    closeX.addEventListener("click", () => backdrop.remove());
    h.appendChild(closeX);
    modal.appendChild(h);

    const body = el("div", "m-body");
    modal.appendChild(body);

    // intro line
    const intro = el("p", "notice dim", "Build the formula for " + termName + " by clicking chips below (they insert at your cursor) or by typing. The live preview updates instantly.");
    body.appendChild(intro);

    // formula textarea
    const taLab = el("label", "field", "");
    taLab.appendChild(el("span", "", "Formula"));
    const ta = el("textarea", "");
    ta.rows = 3;
    ta.value = term.formula || "";
    ta.style.width = "100%"; ta.style.fontFamily = "var(--mono)";
    taLab.appendChild(ta);
    body.appendChild(taLab);

    // status line
    const status = el("div", "notice ok", "Parses fine.");
    body.appendChild(status);
    const preview = el("div", "notice dim", "");
    body.appendChild(preview);

    // chip palettes
    body.appendChild(el("h3", "side-section-title", "OPERATORS"));
    const opRow = el("div", "flex-row");
    ["(", ")", "+", "-", "*", "/", "^", ",", "==", "!=", "<", ">", "<=", ">="].forEach(opText => {
      const c = el("span", "chip op", opText);
      c.addEventListener("click", () => insert(ta, opText));
      opRow.appendChild(c);
    });
    body.appendChild(opRow);

    body.appendChild(el("h3", "side-section-title", "FUNCTIONS"));
    const fnRow = el("div", "flex-row");
    ["sum(", "min(", "max(", "avg(", "round(", "if(", "abs(", "weekly(", "monthly(", "yearly("].forEach(fn => {
      const c = el("span", "chip fn", fn);
      c.addEventListener("click", () => insert(ta, fn));
      fnRow.appendChild(c);
    });
    body.appendChild(fnRow);

    body.appendChild(el("h3", "side-section-title", "YOUR TERMS — click to insert"));
    const tRow = el("div", "flex-row");
    for (const t of model.terms) {
      if (t.name === termName) continue;
      const v = rr[t.name];
      const val = v && v.value !== undefined ? U.fmt(v.value) : "?";
      const c = el("span", "chip term", t.name);
      const meta = el("span", "meta", " " + (t.period || "") + " " + val);
      c.appendChild(meta);
      c.addEventListener("click", () => insert(ta, t.name));
      tRow.appendChild(c);
    }
    body.appendChild(tRow);

    body.appendChild(el("h3", "side-section-title", "CONSTANTS — click to insert"));
    const cRow = el("div", "flex-row");
    for (const c of model.projectConstants.concat(model.globalConstants)) {
      const chip = el("span", "chip constant", c.name);
      const meta = el("span", "meta", " " + U.fmt(Number(c.value)));
      chip.appendChild(meta);
      chip.addEventListener("click", () => insert(ta, c.name));
      cRow.appendChild(chip);
    }
    body.appendChild(cRow);

    // attachment preview
    body.appendChild(el("h3", "side-section-title", "HOW THIS ATTACHES INTO THE MAIN FORMULA"));
    const attach = el("div", "");
    body.appendChild(attach);
    const chain = CG.inspector.pathToRoot(model, term.name);
    const crumbRow = el("div", "flex-row");
    chain.forEach((n, i) => { crumbRow.appendChild(el("span", "crumb" + (i === chain.length - 1 ? " current" : ""), n)); if (i < chain.length - 1) crumbRow.appendChild(el("span", "crumb-sep", "→")); });
    attach.appendChild(crumbRow);

    const parents = model.parentsOf(term.name);
    if (!parents.length) attach.appendChild(el("div", "notice dim", "Nothing references this term yet — it is a top-level input."));
    else {
      for (const p of parents) {
        const pt = model.termByName(p);
        const pv = results[p];
        const line = el("div", "notice dim", p + " = " + (pt.formula || "children sum") + "   →  " + (pv && pv.value !== undefined ? U.fmt(pv.value) : "?"));
        line.style.fontFamily = "var(--mono)";
        attach.appendChild(line);
      }
    }

    // footer
    const foot = el("div", "m-foot", "");
    const cancel = el("button", "btn", "Cancel");
    cancel.addEventListener("click", () => backdrop.remove());
    const save = el("button", "btn primary", "Save formula");
    save.addEventListener("click", () => {
      const src = ta.value;
      try {
        const ast = CG.parser.parse(src);
        CG.parser.simplify(ast);
        const t = app.state().model.termByName(termName);
        t.formula = src;
        app.commit();
        backdrop.remove();
        app.toast("Formula for '" + termName + "' saved.");
      } catch (e) {
        status.className = "notice err";
        status.textContent = "Cannot save — " + e.message;
      }
    });
    foot.appendChild(cancel);
    foot.appendChild(save);
    modal.appendChild(foot);

    document.body.appendChild(backdrop);
    backdrop.appendChild(modal);

    // live updates
    const update = () => {
      const src = ta.value;
      try {
        const ast = CG.parser.parse(src);
        CG.parser.simplify(ast);
        status.className = "notice ok";
        status.textContent = "✓ Parses fine.";
        const env = {};
        let err = null;
        const refs = CG.parser.identifiers(src);
        for (const ref of refs) {
          const t = model.termByName(ref);
          if (t) {
            const v = rr[t.name];
            if (v && v.value !== undefined) env[ref] = v.value * U.periodFactor(t.period || "once", term.period || "once");
            else { err = "no value for '" + ref + "'"; break; }
          } else {
            const c = model.constantByName(ref);
            if (c !== undefined) env[ref] = Number(c.value);
            else { err = "unknown name '" + ref + "'"; break; }
          }
        }
        if (err) { preview.className = "notice err"; preview.textContent = err; }
        else {
          const r = CG.parser.evaluate(ast, env);
          if (!r.ok) { preview.className = "notice err"; preview.textContent = r.error; }
          else { preview.className = "notice dim"; preview.textContent = "Preview value: " + U.fmt(r.value) + "  (" + (term.period || "once") + ")"; }
        }
      } catch (e) {
        status.className = "notice err";
        status.textContent = "✗ " + e.message;
        preview.className = "notice dim";
        preview.textContent = "";
      }
    };
    ta.addEventListener("input", update);
    update();
    ta.focus();
  }

  // ---- new term modal ----
  function openNewTerm(app, preferKind) {
    const model = app.state().model;
    const backdrop = el("div", "modal-backdrop");
    const modal = el("div", "modal");
    const h = el("h2", "", "");
    h.appendChild(el("span", "", "New term"));
    const closeX = el("button", "close", "✕");
    closeX.addEventListener("click", () => backdrop.remove());
    h.appendChild(closeX);
    modal.appendChild(h);

    const body = el("div", "m-body");
    modal.appendChild(body);

    const fName = el("div", "field");
    fName.appendChild(el("label", "", "Name (letters, digits, underscore — no spaces)"));
    const nameInput = el("input", "");
    nameInput.placeholder = "e.g. total_expenses";
    fName.appendChild(nameInput);
    body.appendChild(fName);

    const fKind = el("div", "field");
    fKind.appendChild(el("label", "", "Kind"));
    const kindSel = el("select", "");
    ["value", "formula", "group"].forEach(k => { const o = el("option", "", k); if (k === (preferKind || "formula")) o.selected = true; kindSel.appendChild(o); });
    fKind.appendChild(kindSel);
    body.appendChild(fKind);

    const fVal = el("div", "field");
    fVal.appendChild(el("label", "", "Value"));
    const valInput = el("input", ""); valInput.type = "number"; valInput.step = "any"; valInput.value = "0";
    fVal.appendChild(valInput);
    body.appendChild(fVal);

    const fFormula = el("div", "field");
    fFormula.appendChild(el("label", "", "Formula"));
    const formulaInput = el("textarea", ""); formulaInput.rows = 2;
    formulaInput.placeholder = "e.g. salaries + rent + utilities";
    fFormula.appendChild(formulaInput);
    body.appendChild(fFormula);

    const fChildren = el("div", "field");
    fChildren.appendChild(el("label", "", "Children (for groups)"));
    const childRow = el("div", "flex-row");
    const chosen = [];
    for (const t of model.terms) {
      const chip = el("span", "chip term", t.name);
      chip.addEventListener("click", () => {
        const i = chosen.indexOf(t.name);
        if (i >= 0) { chosen.splice(i, 1); chip.classList.remove("selected"); }
        else { chosen.push(t.name); chip.classList.add("selected"); }
      });
      childRow.appendChild(chip);
    }
    fChildren.appendChild(childRow);
    body.appendChild(fChildren);

    // unit + period — nothing is auto-assigned; the user opts in.
    const pickedUnit = { v: "" };
    const fUnit = el("div", "field");
    fUnit.appendChild(el("label", "", "Unit (optional — quantity \u2192 symbol)"));
    fUnit.appendChild(CG.units.renderUnitPicker(app, { value: "", onPick: (sym) => { pickedUnit.v = sym; } }));
    body.appendChild(fUnit);

    const pickedPeriod = { v: "" };
    const fPeriod = el("div", "field");
    fPeriod.appendChild(el("label", "", "Period (optional — value counted per week / month / year)"));
    const pSel = CG.units.periodSelect("", (v) => { pickedPeriod.v = v; });
    fPeriod.appendChild(pSel);
    body.appendChild(fPeriod);

    const sync = () => {
      fVal.style.display = kindSel.value === "value" ? "" : "none";
      fFormula.style.display = kindSel.value === "formula" ? "" : "none";
      fChildren.style.display = kindSel.value === "group" ? "" : "none";
    };
    kindSel.addEventListener("change", sync);
    sync();

    const foot = el("div", "m-foot", "");
    const cancel = el("button", "btn", "Cancel");
    cancel.addEventListener("click", () => backdrop.remove());
    const ok = el("button", "btn primary", "Create");
    ok.addEventListener("click", () => {
      const name = nameInput.value.trim();
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) { app.toast("Name must be letters/digits/underscore, no spaces.", "err"); return; }
      if (app.state().model.termByName(name)) { app.toast("A term named '" + name + "' already exists.", "err"); return; }
      const kind = kindSel.value;
      const term = { id: U.uid(), kind, name, description: "", period: pickedPeriod.v || "", unit: pickedUnit.v };
      if (kind === "value") term.value = Number(valInput.value || 0);
      if (kind === "formula") term.formula = formulaInput.value.trim();
      if (kind === "group") term.children = chosen;
      try { app.addTerm(term); backdrop.remove(); app.select(name); app.toast("Created '" + name + "'."); }
      catch (e) { app.toast(e.message, "err"); }
    });
    foot.appendChild(cancel);
    foot.appendChild(ok);
    modal.appendChild(foot);

    document.body.appendChild(backdrop);
    backdrop.appendChild(modal);
    nameInput.focus();
  }

  function insert(ta, text) {
    const start = ta.selectionStart, end = ta.selectionEnd;
    ta.value = ta.value.slice(0, start) + text + ta.value.slice(end);
    const pos = start + text.length;
    ta.selectionStart = pos; ta.selectionEnd = pos;
    ta.focus();
    ta.dispatchEvent(new Event("input"));
  }

  CG.builder = { openBuilder, openNewTerm };
})();
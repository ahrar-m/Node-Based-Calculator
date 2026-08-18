(() => {
  "use strict";
  const CG = (typeof window !== "undefined" ? window : globalThis).CalcGraph =
    (typeof window !== "undefined" ? window : globalThis).CalcGraph || {};
  const U = CG.util;
  const el = CG.ui.el, clear = CG.ui.clear;

  function renderLibraries(container, app) {
    const { model, globalConstants } = app.state();
    clear(container);

    const modelSec = el("div", "side-section");
    modelSec.appendChild(el("h3", "side-section-title", "PROJECT CONSTANTS (" + model.name + ")"));
    const proj = model.projectConstants;
    if (!proj.length) modelSec.appendChild(el("div", "notice dim", "No project constants yet. Add reusable numbers here (tax rates, salaries, prices, material properties...)."));
    for (const c of proj) modelSec.appendChild(constantRow(c, app, "project"));
    const addP = el("button", "btn small", "+ Add project constant");
    addP.addEventListener("click", () => openConstantEditor(app, null, "project"));
    modelSec.appendChild(addP);
    container.appendChild(modelSec);

    const globalSec = el("div", "side-section");
    globalSec.appendChild(el("h3", "side-section-title", "GLOBAL LIBRARY (all models)"));
    if (!globalConstants.length) globalSec.appendChild(el("div", "notice dim", "Shared constants available in every model you build."));
    for (const c of globalConstants) globalSec.appendChild(constantRow(c, app, "global"));
    const addG = el("button", "btn small", "+ Add global constant");
    addG.addEventListener("click", () => openConstantEditor(app, null, "global"));
    globalSec.appendChild(addG);
    container.appendChild(globalSec);
  }

  function constantRow(c, app, scope) {
    const row = el("div", "tree");
    const li = el("li", "");
    const name = el("span", "", c.name + " = " + U.fmt(Number(c.value)));
    if (c.slider) { const s = el("span", "badge", "⚙slider"); li.appendChild(s); }
    li.appendChild(name);
    li.style.justifyContent = "space-between";
    const btns = el("div", "flex-row");
    const edit = el("button", "btn small", "edit");
    edit.addEventListener("click", () => openConstantEditor(app, c, scope));
    const del = el("button", "btn small danger", "✕");
    del.addEventListener("click", () => app.deleteConstant(c.name, scope));
    btns.appendChild(edit); btns.appendChild(del);
    li.appendChild(btns);
    row.appendChild(li);
    return row;
  }

  function openConstantEditor(app, existing, scope) {
    const backdrop = el("div", "modal-backdrop");
    const modal = el("div", "modal");
    const h = el("h2", "", "");
    h.appendChild(el("span", "", (existing ? "Edit" : "New") + " constant (" + scope + ")"));
    const closeX = el("button", "close", "✕");
    closeX.addEventListener("click", () => backdrop.remove());
    h.appendChild(closeX);
    modal.appendChild(h);
    const body = el("div", "m-body");
    modal.appendChild(body);

    const fName = el("div", "field");
    fName.appendChild(el("label", "", "Name (as used in formulas)"));
    const nameI = el("input", ""); nameI.value = existing ? existing.name : ""; nameI.placeholder = "tax_rate";
    fName.appendChild(nameI); body.appendChild(fName);

    const fVal = el("div", "field");
    fVal.appendChild(el("label", "", "Value"));
    const valI = el("input", ""); valI.type = "number"; valI.step = "any"; valI.value = existing ? existing.value : "";
    fVal.appendChild(valI); body.appendChild(fVal);

    const fUnit = el("div", "field");
    fUnit.appendChild(el("label", "", "Unit (optional)"));
    const unitI = el("input", ""); unitI.value = existing ? (existing.unit || "") : "";
    fUnit.appendChild(unitI); body.appendChild(fUnit);

    const fDesc = el("div", "field");
    fDesc.appendChild(el("label", "", "Description (shown when clicked)"));
    const descI = el("textarea", ""); descI.rows = 2; descI.value = existing ? (existing.description || "") : "";
    fDesc.appendChild(descI); body.appendChild(fDesc);

    // slider
    const sliderOn = el("input", ""); sliderOn.type = "checkbox"; sliderOn.checked = !!(existing && existing.slider);
    const fSlider = el("div", "field");
    fSlider.appendChild(el("label", "", "Slider"));
    const srow = el("div", "flex-row");
    srow.appendChild(sliderOn);
    srow.appendChild(el("span", "", "min"));
    const minI = el("input", ""); minI.type = "number"; minI.style.width = "70px"; minI.value = existing && existing.slider ? existing.slider.min : "";
    srow.appendChild(minI);
    srow.appendChild(el("span", "", "max"));
    const maxI = el("input", ""); maxI.type = "number"; maxI.style.width = "70px"; maxI.value = existing && existing.slider ? existing.slider.max : "";
    srow.appendChild(maxI);
    srow.appendChild(el("span", "", "step"));
    const stepI = el("input", ""); stepI.type = "number"; stepI.style.width = "70px"; stepI.value = existing && existing.slider ? existing.slider.step : "1";
    srow.appendChild(stepI);
    fSlider.appendChild(srow);
    body.appendChild(fSlider);

    // snapshots
    const snapRow = el("div", "field");
    snapRow.appendChild(el("label", "", "Snapshots (label = value)"));
    const snapList = el("div", "");
    const snaps = existing && Array.isArray(existing.snapshots) ? existing.snapshots.map(s => ({ ...s })) : [];
    const renderSnaps = () => {
      clear(snapList);
      snaps.forEach((sn, i) => {
        const r = el("div", "flex-row");
        const l = el("input", ""); l.placeholder = "label"; l.value = sn.label; l.style.width = "120px";
        l.addEventListener("input", () => snaps[i].label = l.value);
        const v = el("input", ""); v.type = "number"; v.step = "any"; v.placeholder = "value"; v.value = sn.value; v.style.width = "110px";
        v.addEventListener("input", () => snaps[i].value = Number(v.value));
        const x = el("button", "btn small danger", "✕");
        x.addEventListener("click", () => { snaps.splice(i, 1); renderSnaps(); });
        r.appendChild(l); r.appendChild(v); r.appendChild(x);
        snapList.appendChild(r);
      });
    };
    renderSnaps();
    const addSnap = el("button", "btn small", "+ Add snapshot");
    addSnap.addEventListener("click", () => { snaps.push({ label: "preset", value: Number(valI.value || 0) }); renderSnaps(); });
    snapRow.appendChild(snapList); snapRow.appendChild(addSnap);
    body.appendChild(snapRow);

    const foot = el("div", "m-foot", "");
    const cancel = el("button", "btn", "Cancel");
    cancel.addEventListener("click", () => backdrop.remove());
    const save = el("button", "btn primary", "Save constant");
    save.addEventListener("click", () => {
      const name = nameI.value.trim();
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) { app.toast("Constant name must be letters/digits/underscore.", "err"); return; }
      const value = Number(valI.value);
      if (!Number.isFinite(value)) { app.toast("Value must be a number.", "err"); return; }
      const obj = {
        id: existing ? existing.id : U.uid(),
        name, value, unit: unitI.value.trim(),
        description: descI.value.trim(),
        slider: sliderOn.checked ? { min: Number(minI.value), max: Number(maxI.value), step: Number(stepI.value || 1) } : undefined,
        snapshots: snaps.length ? snaps : undefined
      };
      try {
        if (existing) app.updateConstant(existing.name, obj, scope);
        else app.addConstant(obj, scope);
        backdrop.remove();
      } catch (e) { app.toast(e.message, "err"); }
    });
    foot.appendChild(cancel); foot.appendChild(save);
    modal.appendChild(foot);
    document.body.appendChild(backdrop); backdrop.appendChild(modal);
  }

  CG.libraries = { renderLibraries, openConstantEditor };
})();

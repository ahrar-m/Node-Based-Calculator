(() => {
  "use strict";
  const CG = (typeof window !== "undefined" ? window : globalThis).CalcGraph =
    (typeof window !== "undefined" ? window : globalThis).CalcGraph || {};
  const U = CG.util;

  // tiny DOM helpers — also defined in 07-inspector; kept here so the units
  // UI (pickers / manager / sidebar section) works before that module loads.
  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  if (!CG.ui) CG.ui = { el, clear };

  const UNITS_KEY = "calcgraph.units.v1";

  // ------------------------------------------------------------------
  // Built-in default unit library (user can add custom units on top).
  // Quantities cover the everyday engineering / business families:
  // time, length, breadth, area, volume, mass, force, pressure, energy,
  // power, temperature, angle, currency, ratio, count.
  // ------------------------------------------------------------------
  const BUILTIN = [
    { id: "u-t-s",   quantity: "Time",        name: "second",           symbol: "s" },
    { id: "u-t-min", quantity: "Time",        name: "minute",           symbol: "min" },
    { id: "u-t-h",   quantity: "Time",        name: "hour",             symbol: "hr" },
    { id: "u-t-day", quantity: "Time",        name: "day",              symbol: "day" },
    { id: "u-t-wk",  quantity: "Time",        name: "week",             symbol: "wk" },
    { id: "u-t-mo",  quantity: "Time",        name: "month",            symbol: "mo" },
    { id: "u-t-yr",  quantity: "Time",        name: "year",             symbol: "yr" },
    { id: "u-l-mm",  quantity: "Length",      name: "millimetre",       symbol: "mm" },
    { id: "u-l-cm",  quantity: "Length",      name: "centimetre",       symbol: "cm" },
    { id: "u-l-m",   quantity: "Length",      name: "metre",            symbol: "m" },
    { id: "u-l-km",  quantity: "Length",      name: "kilometre",        symbol: "km" },
    { id: "u-l-in",  quantity: "Length",      name: "inch",             symbol: "in" },
    { id: "u-l-ft",  quantity: "Length",      name: "foot",             symbol: "ft" },
    { id: "u-b-mm",  quantity: "Breadth",     name: "millimetre",       symbol: "mm" },
    { id: "u-b-cm",  quantity: "Breadth",     name: "centimetre",       symbol: "cm" },
    { id: "u-b-m",   quantity: "Breadth",     name: "metre",            symbol: "m" },
    { id: "u-b-in",  quantity: "Breadth",     name: "inch",             symbol: "in" },
    { id: "u-b-ft",  quantity: "Breadth",     name: "foot",             symbol: "ft" },
    { id: "u-a-mm2", quantity: "Area",        name: "square millimetre",symbol: "mm\u00b2" },
    { id: "u-a-cm2", quantity: "Area",        name: "square centimetre",symbol: "cm\u00b2" },
    { id: "u-a-m2",  quantity: "Area",        name: "square metre",     symbol: "m\u00b2" },
    { id: "u-a-km2", quantity: "Area",        name: "square kilometre", symbol: "km\u00b2" },
    { id: "u-a-in2", quantity: "Area",        name: "square inch",      symbol: "in\u00b2" },
    { id: "u-a-ft2", quantity: "Area",        name: "square foot",      symbol: "ft\u00b2" },
    { id: "u-v-mm3", quantity: "Volume",      name: "cubic millimetre", symbol: "mm\u00b3" },
    { id: "u-v-cm3", quantity: "Volume",      name: "cubic centimetre", symbol: "cm\u00b3" },
    { id: "u-v-m3",  quantity: "Volume",      name: "cubic metre",      symbol: "m\u00b3" },
    { id: "u-v-l",   quantity: "Volume",      name: "litre",            symbol: "L" },
    { id: "u-v-ml",  quantity: "Volume",      name: "millilitre",       symbol: "mL" },
    { id: "u-v-gal", quantity: "Volume",      name: "US gallon",        symbol: "gal" },
    { id: "u-m-g",   quantity: "Mass",        name: "gram",             symbol: "g" },
    { id: "u-m-kg",  quantity: "Mass",        name: "kilogram",         symbol: "kg" },
    { id: "u-m-t",   quantity: "Mass",        name: "tonne",            symbol: "t" },
    { id: "u-m-lb",  quantity: "Mass",        name: "pound",            symbol: "lb" },
    { id: "u-f-n",   quantity: "Force",       name: "newton",           symbol: "N" },
    { id: "u-f-kn",  quantity: "Force",       name: "kilonewton",       symbol: "kN" },
    { id: "u-f-kgf", quantity: "Force",       name: "kilogram-force",   symbol: "kgf" },
    { id: "u-f-lbf", quantity: "Force",       name: "pound-force",      symbol: "lbf" },
    { id: "u-p-pa",  quantity: "Pressure",    name: "pascal",           symbol: "Pa" },
    { id: "u-p-kpa", quantity: "Pressure",    name: "kilopascal",       symbol: "kPa" },
    { id: "u-p-mpa", quantity: "Pressure",    name: "megapascal",       symbol: "MPa" },
    { id: "u-p-gpa", quantity: "Pressure",    name: "gigapascal",       symbol: "GPa" },
    { id: "u-p-nmm", quantity: "Pressure",    name: "newton per sq mm", symbol: "N/mm\u00b2" },
    { id: "u-p-psi", quantity: "Pressure",    name: "pound per sq in",  symbol: "psi" },
    { id: "u-p-bar", quantity: "Pressure",    name: "bar",              symbol: "bar" },
    { id: "u-e-j",   quantity: "Energy",      name: "joule",            symbol: "J" },
    { id: "u-e-kj",  quantity: "Energy",      name: "kilojoule",        symbol: "kJ" },
    { id: "u-e-mj",  quantity: "Energy",      name: "megajoule",        symbol: "MJ" },
    { id: "u-e-kwh", quantity: "Energy",      name: "kilowatt-hour",    symbol: "kWh" },
    { id: "u-w-w",   quantity: "Power",       name: "watt",             symbol: "W" },
    { id: "u-w-kw",  quantity: "Power",       name: "kilowatt",         symbol: "kW" },
    { id: "u-w-mw",  quantity: "Power",       name: "megawatt",         symbol: "MW" },
    { id: "u-w-hp",  quantity: "Power",       name: "horsepower",       symbol: "hp" },
    { id: "u-temp-c",quantity: "Temperature", name: "celsius",          symbol: "\u00b0C" },
    { id: "u-temp-f",quantity: "Temperature", name: "fahrenheit",       symbol: "\u00b0F" },
    { id: "u-temp-k",quantity: "Temperature", name: "kelvin",           symbol: "K" },
    { id: "u-ang-d", quantity: "Angle",       name: "degree",           symbol: "deg" },
    { id: "u-ang-r", quantity: "Angle",       name: "radian",           symbol: "rad" },
    { id: "u-c-usd", quantity: "Currency",    name: "US dollar",        symbol: "USD" },
    { id: "u-c-eur", quantity: "Currency",    name: "euro",             symbol: "EUR" },
    { id: "u-c-gbp", quantity: "Currency",    name: "pound sterling",   symbol: "GBP" },
    { id: "u-c-jpy", quantity: "Currency",    name: "yen",              symbol: "JPY" },
    { id: "u-c-inr", quantity: "Currency",    name: "rupee",            symbol: "INR" },
    { id: "u-c-pkr", quantity: "Currency",    name: "Pakistani rupee",  symbol: "PKR" },
    { id: "u-r-pct", quantity: "Ratio",       name: "percent",          symbol: "%" },
    { id: "u-r-fr",  quantity: "Ratio",       name: "ratio",            symbol: "ratio" },
    { id: "u-n-pcs", quantity: "Count",       name: "pieces",           symbol: "pcs" },
    { id: "u-n-it",  quantity: "Count",       name: "items",            symbol: "items" }
  ];

  function builtins() { return BUILTIN.map(u => ({ ...u, builtin: true })); }

  // load() always returns the built-ins + any custom units saved globally.
  function load() {
    try {
      const raw = localStorage.getItem(UNITS_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(arr)) return builtins();
      const merged = builtins();
      const seen = new Set(merged.map(u => u.id));
      for (const u of arr) {
        if (u && u.symbol && !seen.has(u.id)) { merged.push({ ...u, builtin: !!u.builtin }); seen.add(u.id); }
      }
      return merged;
    } catch { return builtins(); }
  }
  function save(arr) { try { localStorage.setItem(UNITS_KEY, JSON.stringify(arr)); } catch {} }
  function quantities(lib) {
    const qs = [];
    for (const u of lib) if (!qs.includes(u.quantity)) qs.push(u.quantity);
    return qs;
  }
  function symbolsFor(lib, quantity) { return lib.filter(u => u.quantity === quantity).map(u => u.symbol); }
  function removeUnit(id) { const lib = load().filter(u => u.builtin || u.id !== id); save(lib); return lib; }
  function addCustom(entry) {
    const lib = load();
    if (!entry.quantity || !entry.symbol) throw new Error("Custom unit needs a quantity and a symbol.");
    const dup = lib.some(u => u.quantity === entry.quantity && u.symbol === entry.symbol);
    if (dup) throw new Error("That symbol already exists in the '" + entry.quantity + "' library.");
    const u = { id: U.uid(), quantity: entry.quantity, name: entry.name || entry.symbol, symbol: entry.symbol, builtin: false };
    lib.push(u); save(lib); return u;
  }

  // ------------------------------------------------------------------
  // Period select — always starts empty ("no period"). Nothing is
  // auto-assigned: the user opts in.
  // ------------------------------------------------------------------
  function periodSelect(existing, onChange) {
    const sel = el("select", "");
    const none = el("option", "", "\u2014 no period \u2014");
    none.value = "";
    if (!existing) none.selected = true;
    sel.appendChild(none);
    for (const p of U.PERIOD_ORDER) {
      const o = el("option", "", p);
      o.value = p;
      if (existing === p) o.selected = true;
      sel.appendChild(o);
    }
    sel.addEventListener("change", () => onChange(sel.value));
    return sel;
  }

  // ------------------------------------------------------------------
  // Unit picker: quantity -> unit -> custom (saved to the global library).
  // ------------------------------------------------------------------
  function renderUnitPicker(app, opts) {
    opts = opts || {};
    const wrap = el("div", "unit-pick");
    const qSel = el("select", "");
    const uSel = el("select", "");
    const customBox = el("div", "unit-custom");
    customBox.style.display = "none";
    const ctx = { current: opts.value || "" };

    const fillQ = () => {
      clear(qSel);
      const lib = load();
      const qs = quantities(lib);
      const q0 = el("option", "", "\u2014 quantity \u2014"); q0.value = "";
      qSel.appendChild(q0);
      let currentQ = "";
      for (const u of lib) if (u.symbol === ctx.current) { currentQ = u.quantity; break; }
      for (const q of qs) {
        const o = el("option", "", q);
        if (q === currentQ) o.selected = true;
        qSel.appendChild(o);
      }
      fillU();
    };
    const fillU = () => {
      clear(uSel);
      const lib = load();
      const q = qSel.value || "";
      const none = el("option", "", "\u2014 unit \u2014"); none.value = "";
      uSel.appendChild(none);
      for (const u of lib.filter(x => x.quantity === q)) {
        const o = el("option", "", u.symbol + "  \u00b7  " + u.name);
        o.value = u.symbol;
        if (ctx.current === u.symbol) o.selected = true;
        uSel.appendChild(o);
      }
      const cust = el("option", "", "\uff0b Custom\u2026"); cust.value = "__custom__";
      uSel.appendChild(cust);
    };

    // custom unit row
    const cName = el("input", ""); cName.placeholder = "name (e.g. supertonne)"; cName.style.width = "150px";
    const cSym = el("input", ""); cSym.placeholder = "symbol (e.g. st)"; cSym.style.width = "90px";
    cSym.style.fontFamily = "var(--mono)";
    const cAdd = el("button", "btn small primary", "Add to library & use");
    customBox.appendChild(cName); customBox.appendChild(cSym); customBox.appendChild(cAdd);
    customBox.appendChild(el("span", "meta", "saved in the global library"));

    cAdd.addEventListener("click", () => {
      if (!qSel.value) { app.toast("Choose a quantity first.", "err"); return; }
      const symbol = cSym.value.trim();
      if (!symbol) { app.toast("Enter a symbol for the custom unit.", "err"); return; }
      try {
        const u = addCustom({ quantity: qSel.value, name: cName.value.trim() || symbol, symbol });
        ctx.current = symbol;
        customBox.style.display = "none";
        fillQ(); fillU();
        if (opts.onPick) opts.onPick(symbol);
        app.toast("Custom unit '" + symbol + "' saved to the global library.", "ok");
      } catch (e) { app.toast(e.message, "err"); }
    });

    qSel.addEventListener("change", () => { ctx.current = ""; customBox.style.display = "none"; fillU(); });
    uSel.addEventListener("change", () => {
      if (uSel.value === "__custom__") { customBox.style.display = ""; cName.focus(); return; }
      customBox.style.display = "none";
      ctx.current = uSel.value || "";
      if (opts.onPick) opts.onPick(uSel.value || "");
    });

    const manage = el("button", "btn small", "\u2699 Units\u2026");
    manage.addEventListener("click", () => openManager(app, () => { const keep = ctx.current; fillQ(); ctx.current = keep; fillU(); }));

    wrap.appendChild(qSel); wrap.appendChild(uSel); wrap.appendChild(manage); wrap.appendChild(customBox);
    fillQ();
    return wrap;
  }

  // ------------------------------------------------------------------
  // Units manager modal — browse / add / delete the global unit library.
  // ------------------------------------------------------------------
  function openManager(app, onDone) {
    const backdrop = el("div", "modal-backdrop");
    const modal = el("div", "modal wide");
    const h = el("h2", "", "");
    h.appendChild(el("span", "", "Global unit library"));
    const closeX = el("button", "close", "\u2715");
    closeX.addEventListener("click", () => backdrop.remove());
    h.appendChild(closeX);
    modal.appendChild(h);
    const body = el("div", "m-body");
    modal.appendChild(body);

    body.appendChild(el("p", "notice dim", "These units are saved in this browser and available in every model. Pick a quantity + unit for any term or constant, or add your own below."));

    const addCard = el("div", "side-section");
    addCard.appendChild(el("h3", "side-section-title", "Add a custom unit"));
    const row = el("div", "flex-row");
    const qIn = el("input", ""); qIn.placeholder = "Quantity (e.g. Density)"; qIn.style.width = "150px";
    const nIn = el("input", ""); nIn.placeholder = "Name (e.g. kilonewton-metre)"; nIn.style.width = "190px";
    const sIn = el("input", ""); sIn.placeholder = "Symbol (e.g. kN\u00b7m)"; sIn.style.width = "110px"; sIn.style.fontFamily = "var(--mono)";
    const addBtn = el("button", "btn primary", "Add");
    addBtn.addEventListener("click", () => {
      if (!qIn.value.trim() || !sIn.value.trim()) { app.toast("Quantity and symbol are required.", "err"); return; }
      try {
        addCustom({ quantity: qIn.value.trim(), name: nIn.value.trim() || sIn.value.trim(), symbol: sIn.value.trim() });
        app.toast("Unit added to the global library.", "ok");
        qIn.value = ""; nIn.value = ""; sIn.value = "";
        repaint();
      } catch (e) { app.toast(e.message, "err"); }
    });
    row.appendChild(qIn); row.appendChild(nIn); row.appendChild(sIn); row.appendChild(addBtn);
    addCard.appendChild(row);
    body.appendChild(addCard);

    const list = el("div", "");
    body.appendChild(list);
    const repaint = () => {
      clear(list);
      const lib = load();
      for (const q of quantities(lib)) {
        const sec = el("div", "side-section");
        sec.appendChild(el("h3", "side-section-title", q));
        const chips = el("div", "flex-row");
        for (const u of lib.filter(x => x.quantity === q)) {
          const c = el("span", "chip" + (u.builtin ? "" : " constant"), u.symbol + "  \u00b7  " + u.name);
          c.title = u.builtin ? "built-in (cannot be removed)" : "custom unit";
          if (!u.builtin) {
            const x = el("button", "btn small danger", "\u2715");
            x.addEventListener("click", () => { removeUnit(u.id); repaint(); app.toast("Removed '" + u.symbol + "'."); });
            c.appendChild(x);
          }
          chips.appendChild(c);
        }
        sec.appendChild(chips);
        list.appendChild(sec);
      }
    };
    repaint();

    const foot = el("div", "m-foot", "");
    const done = el("button", "btn primary", "Done");
    done.addEventListener("click", () => { backdrop.remove(); if (onDone) onDone(); });
    foot.appendChild(done);
    modal.appendChild(foot);

    document.body.appendChild(backdrop); backdrop.appendChild(modal);
    qIn.focus();
  }

  // ------------------------------------------------------------------
  // Sidebar section — global units overview.
  // ------------------------------------------------------------------
  function renderSection(container, app) {
    const sec = el("div", "side-section");
    sec.appendChild(el("h3", "side-section-title", "UNIT LIBRARY (global)"));
    const lib = load();
    const customCount = lib.filter(u => !u.builtin).length;
    const chips = el("div", "flex-row");
    for (const q of quantities(lib).slice(0, 12)) {
      const c = el("span", "chip", q);
      c.title = symbolsFor(lib, q).join("  \u00b7  ");
      const cnt = el("span", "meta", " " + symbolsFor(lib, q).length);
      c.appendChild(cnt);
      c.addEventListener("click", () => openManager(app));
      chips.appendChild(c);
    }
    sec.appendChild(chips);
    const mgr = el("button", "btn small", "\u2699 Manage units" + (customCount ? "  \u00b7  " + customCount + " custom" : ""));
    mgr.addEventListener("click", () => openManager(app));
    sec.appendChild(mgr);
    container.appendChild(sec);
  }

  // ------------------------------------------------------------------
  // Derived-unit analysis: walk the formula AST and combine the units of
  // referenced terms/constants so the suggested unit "matches the formula".
  // ------------------------------------------------------------------
  const SUP = { "0": "\u2070", "1": "\u00b9", "2": "\u00b2", "3": "\u00b3", "4": "\u2074", "5": "\u2075", "6": "\u2076", "7": "\u2077", "8": "\u2078", "9": "\u2079" };
  function needsParen(s) { return /[\u00b7/]/.test(s); }
  function mulU(a, b) {
    if (!a) return b; if (!b) return a;
    const pa = needsParen(a), pb = needsParen(b);
    return (pa ? "(" + a + ")" : a) + "\u00b7" + (pb ? "(" + b + ")" : b);
  }
  function divU(a, b) {
    if (!a && !b) return ""; if (!b) return a; if (!a) return "1/" + b;
    return (needsParen(a) ? "(" + a + ")" : a) + "/" + (needsParen(b) ? "(" + b + ")" : b);
  }
  function powU(a, n) {
    if (!a || n === 1) return a || "";
    const endsWithDigit = /[\u00b2\u00b3\u2070-\u2079\d]$/.test(a);
    const base = needsParen(a) || endsWithDigit ? "(" + a + ")" : a;
    if (n >= 0 && n <= 9) return base + SUP[String(n)];
    return base + "^" + n;
  }
  function unitOfAst(ast, getUnit) {
    switch (ast.t) {
      case "num": return "";
      case "name": return getUnit(ast.n) || "";
      case "un": return unitOfAst(ast.e, getUnit);
      case "bin": {
        const l = unitOfAst(ast.l, getUnit), r = unitOfAst(ast.r, getUnit);
        if (ast.op === "+" || ast.op === "-") {
          if (!l && !r) return "";
          if (!l) return r; if (!r) return l;
          return l === r ? l : "mixed (" + l + " vs " + r + ")";
        }
        if (ast.op === "*") return mulU(l, r);
        if (ast.op === "/") return divU(l, r);
        if (ast.op === "^") {
          if (ast.r.t === "num" && Number.isInteger(ast.r.v)) return powU(l, ast.r.v);
          return l;
        }
        return "";
      }
      case "call": {
        // careful: keep raw args so if(cond, a, b) still indexes correctly
        const raw = ast.args.map(a => unitOfAst(a, getUnit));
        if (ast.fn === "if") return raw[1] || raw[2] || "";
        const args = raw.filter(Boolean);
        if (ast.fn === "sum" || ast.fn === "avg" || ast.fn === "min" || ast.fn === "max") {
          return new Set(args).size <= 1 ? (args[0] || "") : "mixed";
        }
        return args[0] || "";
      }
    }
    return "";
  }
  function deriveUnit(formulaSrc, model) {
    if (!formulaSrc || !model) return "";
    let ast;
    try { ast = CG.parser.parse(formulaSrc); } catch { return ""; }
    const getUnit = (n) => {
      const t = model.termByName(n);
      if (t && t.unit) return t.unit;
      const c = model.constantByName(n);
      if (c && c.unit) return c.unit;
      return "";
    };
    try { return unitOfAst(CG.parser.simplify(ast), getUnit); } catch { return ""; }
  }

  CG.units = {
    load, save, builtins, quantities, symbolsFor, addCustom, removeUnit,
    periodSelect, renderUnitPicker, openManager, renderSection,
    deriveUnit, unitOfAst
  };
})();
(() => {
  "use strict";
  const CG = (typeof window !== "undefined" ? window : globalThis).CalcGraph =
    (typeof window !== "undefined" ? window : globalThis).CalcGraph || {};

  const PERIODS = { once: 1, week: 52, month: 12, year: 1 };
  const PERIOD_ORDER = ["once", "week", "month", "year"];
  const KINDS = ["value", "formula", "group"];

  // Names may contain spaces (and most printable characters). Only the two
  // characters reserved by the formula grammar are banned: double quotes
  // (used to quote spaced names in formulas) and backticks (used for internal
  // id references).
  function validName(n) {
    if (typeof n !== "string") return false;
    const s = n.trim();
    if (!s || s !== n) return false;                 // non-empty, no leading/trailing whitespace
    if (s.length > 120) return false;
    if (/["\u0060]/.test(s)) return false;          // reserved by the formula grammar
    if (/[\u0000-\u001f\u007f]/.test(s)) return false; // no control characters
    return true;
  }

  function yearlyFactor(p) { return PERIODS[p] !== undefined ? PERIODS[p] : 1; }
  function periodFactor(child, parent) { return yearlyFactor(child) / yearlyFactor(parent); }
  function fmt(n) {
    if (typeof n !== "number" || !Number.isFinite(n)) return "err";
    if (Number.isInteger(n) && Math.abs(n) < 1e15) return String(n);
    return String(Number(n.toFixed(6)));
  }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function uid() { return "id-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  CG.util = { PERIODS, PERIOD_ORDER, yearlyFactor, periodFactor, fmt, esc, uid, validName };

  class Model {
    constructor(data, globalConstants, opts) {
      this.orig = data;
      this.formatVersion = data.formatVersion || "0.1";
      this.id = data.id || uid();
      this.name = data.name || (opts && opts.nameFallback) || "Untitled model";
      this.description = data.description || "";
      this.root = data.root || "";
      this.libraries = Array.isArray(data.libraries) ? data.libraries : [];
      this.globalLibraries = Array.isArray(data.globalLibraries) ? data.globalLibraries : [];
      this.terms = Array.isArray(data.terms) ? data.terms.map(t => ({ ...t, id: t.id || uid(), children: t.children ? [...t.children] : [] })) : [];
      this.projectConstants = this.libraries.flatMap(l => (Array.isArray(l.constants) ? l.constants : []));
      this.globalConstants = Array.isArray(globalConstants) ? globalConstants : [];
      this._index();
      this.errors = this.validate();
    }

    _index() {
      this.byId = new Map();
      this.byName = new Map();
      for (const t of this.terms) {
        if (!t.id) t.id = uid();
        this.byId.set(t.id, t);
        this.byName.set(t.name, t);
      }
      this.constantsByName = new Map();
      this.constantsById = new Map();
      const addConst = (c) => {
        if (!c || !c.name) return;
        if (!c.id) c.id = uid();
        if (!this.constantsByName.has(c.name)) this.constantsByName.set(c.name, c);
        if (!this.constantsById.has(c.id)) this.constantsById.set(c.id, c);
      };
      for (const c of this.projectConstants) addConst(c);
      for (const c of this.globalConstants) addConst(c);
    }

    termByName(n) { return this.byName.get(n); }
    constantByName(n) { return this.constantsByName.get(n); }
    termById(id) { return this.byId.get(id); }
    constantById(id) { return this.constantsById.get(id); }

    depsOf(term) {
      if (term.kind === "group") return [...(term.children || [])];
      if (term.kind === "formula") {
        try {
          return CG.parser.refIds(term.formula)
            .map(id => this.termById(id))
            .filter(Boolean)
            .map(t => t.name);
        } catch { return []; }
      }
      return [];
    }

    parentsOf(name) {
      const out = [];
      for (const t of this.terms) {
        if (t.name === name) continue;
        if (t.kind === "group" && (t.children || []).includes(name)) out.push(t.name);
        else if (t.kind === "formula") {
          try {
            const refs = CG.parser.refIds(t.formula).map(id => this.termById(id)).filter(Boolean).map(t => t.name);
            if (refs.includes(name)) out.push(t.name);
          } catch {}
        }
      }
      return out;
    }

    roots() {
      const withParent = new Set();
      for (const t of this.terms) for (const p of this.parentsOf(t.name)) withParent.add(p);
      return this.terms.filter(t => !withParent.has(t.name)).map(t => t.name);
    }

    validate() {
      const errs = [];
      if (!this.terms.length) errs.push("Model has no terms.");
      // Compile name-based formulas to stable id-based form FIRST so every
      // later check (references, deps, cycles, evaluation) sees the same
      // canonical form. Compiling is idempotent on already-compiled formulas.
      for (const t of this.terms) {
        if (t.kind !== "formula") continue;
        try { t.formula = CG.parser.compileFormula(t.formula, this); }
        catch (e) { errs.push("Term '" + t.name + "': formula " + e.message); }
      }
      const seenNames = new Set(), seenIds = new Set();
      const deps = new Map();
      for (const t of this.terms) {
        if (!t.name) { errs.push("A term is missing its name."); continue; }
        if (seenNames.has(t.name)) errs.push("Term name '" + t.name + "' is used more than once.");
        seenNames.add(t.name);
        if (t.id && seenIds.has(t.id)) errs.push("Term id '" + t.id + "' is used more than once.");
        if (t.id) seenIds.add(t.id);
        if (!validName(t.name)) errs.push("Term name '" + t.name + "' is not valid (spaces are fine \u2014 avoid quotes, backticks and control characters).");
        if (!KINDS.includes(t.kind)) errs.push("Term '" + t.name + "': unknown kind '" + t.kind + "'.");
        if (t.period && !PERIODS.hasOwnProperty(t.period)) errs.push("Term '" + t.name + "': invalid period '" + t.period + "'.");
        if (t.kind === "formula" && !t.formula) errs.push("Term '" + t.name + "': kind formula needs a formula.");
        if (t.kind === "group") {
          if (t.formula) errs.push("Term '" + t.name + "': groups are sums of their children; remove the formula or change kind to 'formula'.");
          if (!t.children || !t.children.length) errs.push("Term '" + t.name + "': group needs at least one child.");
        }
        if (t.kind === "value" && !Number.isFinite(Number(t.value))) errs.push("Term '" + t.name + "': value is not a number.");
        if (t.slider) {
          const s = t.slider;
          if (!Number.isFinite(Number(s.min)) || !Number.isFinite(Number(s.max)) || !Number.isFinite(Number(s.step)) || Number(s.min) > Number(s.max))
            errs.push("Term '" + t.name + "': slider needs valid min/max/step.");
        }
        if (t.snapshots && !Array.isArray(t.snapshots)) errs.push("Term '" + t.name + "': snapshots must be an array.");
        deps.set(t.name, this.depsOf(t));
      }
      if (this.root && !this.byName.has(this.root)) errs.push("Root '" + this.root + "' is not a term.");
      if (!this.root && this.terms.length) errs.push("No root term set.");

      for (const t of this.terms) {
        if (t.kind !== "formula") continue;
        let refs = [];
        try { refs = CG.parser.refIds(t.formula); }
        catch (e) { errs.push("Term '" + t.name + "': formula syntax error — " + e.message); continue; }
        for (const ref of refs) {
          if (!this.byId.has(ref) && !this.constantsById.has(ref))
            errs.push("Term '" + t.name + "': references unknown id '" + ref + "'.");
        }
      }
      for (const t of this.terms) {
        if (t.kind !== "group") continue;
        for (const c of t.children || []) {
          if (!this.byName.has(c)) errs.push("Group '" + t.name + "': child '" + c + "' is not a term.");
          else { const d = deps.get(t.name) || []; if (!d.includes(c)) d.push(c); deps.set(t.name, d); }
        }
      }

      const state = new Map();
      const stack = [];
      const inCycle = new Set();
      const visit = (name) => {
        if (state.get(name) === 2) return;
        if (state.get(name) === 1) {
          const i = stack.indexOf(name);
          if (i >= 0) stack.slice(i).forEach(n => inCycle.add(n));
          return;
        }
        state.set(name, 1);
        stack.push(name);
        for (const d of deps.get(name) || []) if (this.byName.has(d)) visit(d);
        stack.pop();
        state.set(name, 2);
      };
      for (const t of this.terms) visit(t.name);
      if (inCycle.size) errs.push("Circular dependency involving: " + [...inCycle].join(" -> ") + " -> " + [...inCycle][0]);
      return errs;
    }

    toJSON() {
      return {
        formatVersion: this.formatVersion,
        id: this.id,
        name: this.name,
        description: this.description,
        root: this.root,
        globalLibraries: [...this.globalLibraries],
        libraries: this.libraries,
        terms: this.terms.map(t => {
          const c = JSON.parse(JSON.stringify(t));
          if (c.formula) { try { c.formula = CG.parser.decompileFormula(c.formula, this); } catch {} }
          return c;
        })
      };
    }

    static fromJSON(text, globalConstants, opts) {
      let data;
      try { data = typeof text === "string" ? JSON.parse(text) : text; }
      catch (e) { throw new Error("Not valid JSON: " + e.message); }
      if (!data || typeof data !== "object" || !Array.isArray(data.terms))
        throw new Error("Model JSON must be an object with a 'terms' array.");
      const m = new Model(data, globalConstants, opts || {});
      if (m.errors.length) throw new Error("Model has " + m.errors.length + " problem(s):\n- " + m.errors.join("\n- "));
      return m;
    }
  }

  CG.model = { Model, PERIODS, PERIOD_ORDER, yearlyFactor, periodFactor };
})();
(() => {
  "use strict";
  const CG = (typeof window !== "undefined" ? window : globalThis).CalcGraph =
    (typeof window !== "undefined" ? window : globalThis).CalcGraph || {};

  // Computes the value of every term. Periods are converted at use sites:
  // child values are scaled by periodFactor(child.period, parent.period).
  function evaluateModel(model) {
    const memo = new Map();
    const visiting = new Set();
    const contrib = [];
    const results = {};
    const U = CG.util;

    function evalTerm(term) {
      if (memo.has(term.name)) return memo.get(term.name);
      if (visiting.has(term.name)) return { error: "circular dependency" };
      visiting.add(term.name);
      let res = null;
      if (term.kind === "value") {
        const v = Number(term.value);
        res = Number.isFinite(v) ? { value: v } : { error: "not a number" };
      } else if (term.kind === "group") {
        let sum = 0, err = null;
        for (const cn of term.children || []) {
          const child = model.termByName(cn);
          if (!child) { err = "missing child " + cn; break; }
          const c = evalTerm(child);
          if (c.error) { err = cn + ": " + c.error; break; }
          const f = U.periodFactor(child.period || "once", term.period || "once");
          const conv = c.value * f;
          contrib.push({ parent: term.name, child: cn, factor: f, value: conv });
          sum += conv;
        }
        res = err ? { error: err } : { value: sum };
      } else {
        let inner = null;
        try {
          const ast = CG.parser.parse(term.formula);
          const env = {};
          let err = null;
          // Formulas are stored internally in id-based form; resolve refs by id.
          const refs = CG.parser.refIds(term.formula);
          for (const ref of refs) {
            const t = model.termById(ref);
            if (t) {
              const ev = evalTerm(t);
              if (ev.error) { err = t.name + ": " + ev.error; break; }
              const f = U.periodFactor(t.period || "once", term.period || "once");
              env[ref] = ev.value * f;
              contrib.push({ parent: term.name, child: t.name, factor: f, value: env[ref] });
            } else {
              const c = model.constantById(ref);
              if (c !== undefined) env[ref] = Number(c.value);
              else { err = "unknown reference '" + ref + "'"; break; }
            }
          }
          if (!err) {
            const r = CG.parser.evaluate(ast, env);
            if (!r.ok) err = r.error;
            else inner = { value: r.value };
          }
          res = err ? { error: err } : inner;
        } catch (e) {
          res = { error: "formula error: " + e.message };
        }
      }
      visiting.delete(term.name);
      memo.set(term.name, res);
      return res;
    }

    for (const t of model.terms) results[t.name] = evalTerm(t);
    const root = model.root ? (results[model.root] || { error: "root not found" }) : { error: "no root" };
    return { results, root, contrib };
  }

  CG.evaluate = { evaluateModel };
})();

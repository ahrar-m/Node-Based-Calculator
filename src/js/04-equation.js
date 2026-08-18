(() => {
  "use strict";
  const CG = (typeof window !== "undefined" ? window : globalThis).CalcGraph =
    (typeof window !== "undefined" ? window : globalThis).CalcGraph || {};
  const U = CG.util;
  const X = "×", D = "÷";

  function kindCls(name, model) {
    const t = model.termByName(name);
    return t ? t.kind : "";
  }

  function makeUnit(name, model) {
    const t = model.termByName(name);
    if (!t) return "";
    const parts = [];
    if (t.unit) parts.push(U.esc(t.unit));
    if (t.period) parts.push(U.esc(t.period));
    return parts.length ? " " + parts.join(" \u00b7 ") : "";
  }

  // ctx = { model, results (the results MAP!), expanded:Set, numeric:bool, maxDepth:int }
  function combinedEquationHtml(ctx) {
    const { model, results } = ctx;
    const root = model.root;
    if (!model.termByName(root)) return { html: '<div class="empty-hint">Set a root term first.</div>', rootName: root };
    const rootCtx = { ...ctx, rootForce: true, rootName: root };
    const expr = exprHtml(root, rootCtx, 0);
    const r = results[root] || {};
    const valText = r.value !== undefined ? U.fmt(r.value) : (r.error || "?");
    return {
      html: '<div class="eq-line"><span class="eq-name ' + kindCls(root, model) + ' sel" data-name="' + U.esc(root) + '">' + U.esc(root) + '</span>' +
            '<span class="eq-op"> = </span>' + expr +
            '<span class="eq-val">— ' + U.esc(valText) + makeUnit(root, model) + '</span></div>',
      rootName: root
    };
  }

  function nameSpan(name, model) {
    const t = model.termByName(name);
    const unit = t && t.unit ? '<span class="eq-u">' + U.esc(t.unit) + "</span>" : "";
    return '<span class="eq-name ' + kindCls(name, model) + '" data-name="' + U.esc(name) + '">' + U.esc(name) + unit + '</span>';
  }
  function numSpan(text) {
    return '<span class="eq-num">' + U.esc(text) + '</span>';
  }
  function paren(inner) { return '<span class="eq-op">(</span>' + inner + '<span class="eq-op">)</span>'; }
  function factorSuffix(factor) {
    return factor === 1 ? "" : '<span class="eq-factor"> ' + X + ' ' + U.fmt(factor) + '</span>';
  }

  function exprHtml(name, ctx, depth) {
    const { model, results, expanded, numeric, maxDepth } = ctx;
    const term = model.termByName(name);
    if (!term) return '<span class="eq-name">?' + U.esc(name) + '</span>';
    const isExpanded = (ctx.rootForce && ctx.rootName === name) || (expanded.has(name) && depth < maxDepth);
    if (!isExpanded && !(numeric && term.kind === "value")) return nameSpan(name, model);

    if (term.kind === "value") {
      const r = results[name];
      return numSpan(r && r.value !== undefined ? U.fmt(r.value) : "?");
    }
    if (term.kind === "group") {
      const kids = (term.children || []).map(cn => refHtml(cn, term, ctx, depth)).join('<span class="eq-op"> + </span>');
      return paren(kids);
    }
    try {
      const ast = CG.parser.simplify(CG.parser.parse(term.formula));
      return astHtml(ast, term, ctx, depth);
    } catch (e) {
      return '<span class="eq-name" style="color:var(--err)">formula error</span>';
    }
  }

  function refHtml(name, parentTerm, ctx, depth) {
    const { model } = ctx;
    const child = model.termByName(name);
    if (!child) return '<span class="eq-name">?' + U.esc(name) + '</span>';
    const factor = U.periodFactor(child.period || "once", parentTerm.period || "once");
    const shown = exprHtml(name, ctx, depth);
    const multi = child.kind !== "value" && ctx.expanded.has(name);
    const core = multi ? paren(shown) : shown;
    return core + factorSuffix(factor);
  }

  function astHtml(ast, parentTerm, ctx, depth) {
    switch (ast.t) {
      case "num": return numSpan(CG.parser.toSource(ast));
      case "name": return refByName(ast.n, parentTerm, ctx, depth);
      case "ref": return refById(ast.id, parentTerm, ctx, depth);
      case "un": return '<span class="eq-op">' + (ast.op === "-" ? "-" : "+") + '</span>' + astHtml(ast.e, parentTerm, ctx, depth);
      case "bin": {
        const op = ast.op === "*" ? X : ast.op === "/" ? D : ast.op;
        return astHtml(ast.l, parentTerm, ctx, depth) + '<span class="eq-op"> ' + op + ' </span>' + astHtml(ast.r, parentTerm, ctx, depth);
      }
      case "call": {
        const args = ast.args.map(a => astHtml(a, parentTerm, ctx, depth));
        return '<span class="eq-fn">' + U.esc(ast.fn) + '</span><span class="eq-op">(</span>' + args.join('<span class="eq-op">, </span>') + '<span class="eq-op">)</span>';
      }
    }
    return "?";
  }

  // AST nodes are internal id references (compiled form); constants and
  // terms are resolved by id, then everything downstream keeps using their
  // human names (spaces included) for nesting, expansion and display.
  function refById(id, parentTerm, ctx, depth) {
    const { model } = ctx;
    return refCore(id, model.termById(id), model.constantById(id), parentTerm, ctx, depth);
  }
  function refByName(name, parentTerm, ctx, depth) {
    const { model } = ctx;
    return refCore(name, model.termByName(name), model.constantByName(name), parentTerm, ctx, depth);
  }
  function refCore(key, child, cobj, parentTerm, ctx, depth) {
    const { model, expanded, maxDepth, numeric } = ctx;
    if (!child && !cobj) return '<span class="eq-name">?' + U.esc(key) + '</span>';
    const nm = child ? child.name : cobj.name;
    if (cobj && numeric) return numSpan(U.fmt(Number(cobj.value)) + (cobj.unit ? ' ' + U.esc(cobj.unit) : ""));
    const factor = child ? U.periodFactor(child.period || "once", parentTerm.period || "once") : 1;
    const expandHere = child && expanded.has(nm) && depth < maxDepth;
    let core;
    if (expandHere) {
      const inner = exprHtml(nm, ctx, depth);
      core = child.kind !== "value" ? paren(inner) : inner;
    } else if (child && numeric && child.kind === "value") {
      const r = ctx.results && ctx.results[nm];
      core = numSpan(r && r.value !== undefined ? U.fmt(r.value) : "?");
    } else {
      core = nameSpan(nm, model);
    }
    return core + factorSuffix(factor);
  }

  function allTermsHtml(model, results) {
    const rows = [];
    for (const t of model.terms) {
      let def;
      if (t.kind === "value") def = numSpan(U.fmt(Number(t.value)));
      else if (t.kind === "group") {
        def = (t.children || []).map(c => '<span class="eq-name group" data-name="' + U.esc(c) + '">' + U.esc(c) + '</span>').join('<span class="eq-op"> + </span>');
      } else if (t.formula) {
        try {
          const src = CG.parser.toSource(CG.parser.simplify(CG.parser.parse(t.formula)), 0, {
            byId: (id) => {
              const tt = model.termById(id); if (tt) return tt.name;
              const cc = model.constantById(id); return cc ? cc.name : null;
            }
          });
          def = src.replace(/\*/g, X).replace(/\//g, D);
        }
        catch { def = '<span class="eq-name" style="color:var(--err)">syntax error</span>'; }
      } else def = "";
      const r = results[t.name] || {};
      const val = r.value !== undefined ? U.fmt(r.value) : (r.error || "?");
      const mark = t.name === model.root ? '<span class="eq-badge root">root</span>' : "";
      const unit = t.unit ? '<span class="eq-u">' + U.esc(t.unit) + "</span>" : "";
      rows.push('<div class="eq-line"><span class="eq-name ' + t.kind + (t.name === model.root ? " sel" : "") + '" data-name="' + U.esc(t.name) + '">' + U.esc(t.name) + unit + '</span>' +
        '<span class="eq-op"> = </span>' + def + '<span class="eq-val">\u2192 ' + U.esc(val) + '</span>' + mark +
        '<span class="eq-badge">' + U.esc(t.kind) + '</span></div>');
    }
    return rows.join("\n");
  }

  CG.equation = { combinedEquationHtml, allTermsHtml };
})();

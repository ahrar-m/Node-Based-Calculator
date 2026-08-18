(() => {
  "use strict";
  const CG = (typeof window !== "undefined" ? window : globalThis).CalcGraph =
    (typeof window !== "undefined" ? window : globalThis).CalcGraph || {};

  // Layered DAG layout. scope: null => whole model; otherwise the name of the
  // entered group (graph shows that group's children plus the group itself).
  // Result: { nodes: [...], edges: [...] } with center coordinates.
  function layoutGraph(model, results, scope) {
    const U = CG.util;
    let items = [];
    let groupNode = null;
    if (scope == null) {
      items = model.terms;
    } else {
      const g = model.termByName(scope);
      if (g && g.kind === "group") {
        groupNode = g;
        items = (g.children || []).map(c => model.termByName(c)).filter(Boolean);
      } else {
        items = model.terms;
      }
    }
    const visible = new Set(items.map(t => t.name));

    // edges: dep -> term (data flows to parent)
    const edges = [];
    const rankOf = new Map();
    const depList = new Map();
    for (const t of items) {
      const deps = model.depsOf(t).filter(d => visible.has(d));
      depList.set(t.name, deps);
      for (const d of deps) edges.push({ from: d, to: t.name, groupEdge: t.kind === "group" });
      if (groupNode && t.name !== groupNode.name) edges.push({ from: t.name, to: groupNode.name, groupEdge: true });
    }
    if (groupNode) { depList.set(groupNode.name, (groupNode.children || []).filter(c => visible.has(c))); rankOf.set(groupNode.name, 0); }

    const order = [];
    const seen = new Set();
    const visit = (name) => {
      if (seen.has(name)) return;
      seen.add(name);
      for (const d of depList.get(name) || []) visit(d);
      order.push(name);
    };
    for (const t of items) visit(t.name);
    // ranks: longest path from sources
    const rank = (name) => {
      if (rankOf.has(name)) return rankOf.get(name);
      const deps = depList.get(name) || [];
      if (!deps.length) { rankOf.set(name, 0); return 0; }
      let r = -1;
      for (const d of deps) { if (!seen.has(d)) continue; r = Math.max(r, rank(d) + 1); }
      rankOf.set(name, Math.max(0, r));
      return rankOf.get(name);
    };
    for (const n of order) rank(n);
    if (groupNode) rank(groupNode.name);

    // group into ranks, stable order by 'order'
    const ranks = new Map();
    for (const n of order) {
      const r = rank(n);
      if (!ranks.has(r)) ranks.set(r, []);
      ranks.get(r).push(n);
    }
    const rankKeys = [...ranks.keys()].sort((a, b) => a - b);
    const COLS = 260, ROWS = 84, NODE_W = 150, NODE_H = 48;
    const nodes = [];
    let maxW = NODE_W, maxH = NODE_H;
    for (const t of items) {
      const r = rank(t.name);
      const idx = ranks.get(r).indexOf(t.name);
      const x = 60 + r * COLS;
      const y = 40 + idx * ROWS;
      let w = NODE_W;
      const est = 30 + t.name.length * 7.6 + (t.kind === "value" ? 0 : 8);
      w = Math.max(NODE_W, Math.min(220, est));
      const rv = results[t.name] || {};
      const val = rv.value !== undefined ? U.fmt(rv.value) : (rv.error || "?");
      nodes.push({ name: t.name, kind: t.kind, x, y, w, h: NODE_H, value: { text: val, err: !!rv.error }, period: t.period, unit: t.unit || "" });
      maxW = Math.max(maxW, x + w); maxH = Math.max(maxH, y + NODE_H + 20);
    }
    if (groupNode) {
      const r = rank(groupNode.name);
      const idx = ranks.get(r) ? ranks.get(r).indexOf(groupNode.name) : 0;
      const x = 60 + r * COLS;
      const y = 40 + idx * ROWS;
      nodes.push({ name: groupNode.name, kind: "group", x, y, w: NODE_W, h: NODE_H, value: (() => { const rv = results[groupNode.name] || {}; return { text: rv.value !== undefined ? U.fmt(rv.value) : (rv.error || "?"), err: !!rv.error }; })(), period: groupNode.period, unit: groupNode.unit || "" });
    }
    return { nodes, edges, maxW, maxH };
  }

  CG.layout = { layoutGraph };
})();

(() => {
  "use strict";
  const CG = (typeof window !== "undefined" ? window : globalThis).CalcGraph =
    (typeof window !== "undefined" ? window : globalThis).CalcGraph || {};
  const U = CG.util;

  let svgRoot = null;

  function renderGraph(container, layout, handlers) {
    const { nodes, edges, maxW, maxH } = layout;
    const W = Math.max(1200, maxW + 120), H = Math.max(700, maxH + 120);
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.style.width = "100%"; svg.style.height = "100%";
    svgRoot = svg;

    const defs = document.createElementNS(ns, "defs");
    const marker = document.createElementNS(ns, "marker");
    marker.setAttribute("id", "arrow");
    marker.setAttribute("viewBox", "0 0 10 10");
    marker.setAttribute("refX", "9"); marker.setAttribute("refY", "5");
    marker.setAttribute("markerWidth", "7"); marker.setAttribute("markerHeight", "7");
    marker.setAttribute("orient", "auto-start-reverse");
    const mp = document.createElementNS(ns, "path");
    mp.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
    mp.setAttribute("fill", "#4b5a6e");
    marker.appendChild(mp);
    defs.appendChild(marker);
    svg.appendChild(defs);

    // edges layer
    const edgeLayer = document.createElementNS(ns, "g");
    for (const e of edges) {
      const a = nodeById(nodes, e.from), b = nodeById(nodes, e.to);
      if (!a || !b) continue;
      const x1 = a.x, y1 = a.y + a.h / 2;
      const x2 = b.x, y2 = b.y - b.h / 2;
      const path = document.createElementNS(ns, "path");
      const cls = e.groupEdge ? "edge group-edge" : "edge";
      path.setAttribute("class", cls);
      if (e.groupEdge) path.setAttribute("style", "stroke:#f59e0b;stroke-dasharray:4 3;");
      // simple elbow: vertical from source bottom, horizontal mid, vertical to target top
      const midY = (y1 + y2) / 2;
      path.setAttribute("d", "M " + x1 + " " + y1 + " L " + x1 + " " + midY + " L " + x2 + " " + midY + " L " + x2 + " " + y2);
      path.setAttribute("marker-end", "url(#arrow)");
      path.dataset.from = e.from; path.dataset.to = e.to;
      edgeLayer.appendChild(path);
    }
    svg.appendChild(edgeLayer);

    // node layer
    const nodeLayer = document.createElementNS(ns, "g");
    const byName = new Map();
    for (const n of nodes) {
      const g = document.createElementNS(ns, "g");
      g.setAttribute("class", "gnode" + (n.kind === "group" ? " group" : ""));
      g.setAttribute("transform", "translate(" + (n.x - n.w / 2) + "," + (n.y - n.h / 2) + ")");
      g.dataset.name = n.name;
      const rect = document.createElementNS(ns, "rect");
      rect.setAttribute("width", n.w); rect.setAttribute("height", n.h);
      g.appendChild(rect);
      const t1 = document.createElementNS(ns, "text");
      t1.setAttribute("class", "name");
      t1.setAttribute("x", n.w / 2); t1.setAttribute("y", n.h / 2 - 4);
      t1.setAttribute("text-anchor", "middle");
      t1.textContent = n.name.length > 24 ? n.name.slice(0, 22) + "…" : n.name;
      g.appendChild(t1);
      const t2 = document.createElementNS(ns, "text");
      t2.setAttribute("class", "v");
      t2.setAttribute("x", n.w / 2); t2.setAttribute("y", n.h / 2 + 13);
      t2.setAttribute("text-anchor", "middle");
      const label = document.createElementNS(ns, "tspan");
      label.textContent = (n.value.err ? "⚠ " : "") + (n.value.text || "");
      t2.appendChild(label);
      if (n.period) {
        const p = document.createElementNS(ns, "tspan");
        p.textContent = " " + n.period;
        p.setAttribute("fill", "#64748b");
        t2.appendChild(p);
      }
      g.appendChild(t2);
      if (n.kind === "group") {
        const badge = document.createElementNS(ns, "text");
        badge.setAttribute("class", "badge");
        badge.setAttribute("x", n.w - 16); badge.setAttribute("y", 16);
        badge.textContent = "▸"; // drill-in chevron
        g.appendChild(badge);
      }
      g.addEventListener("click", (ev) => { ev.stopPropagation(); handlers.onSelect(n.name); });
      g.addEventListener("dblclick", (ev) => { ev.stopPropagation(); if (n.kind === "group") handlers.onEnter(n.name); });
      nodeLayer.appendChild(g);
      byName.set(n.name, g);
    }
    svg.appendChild(nodeLayer);

    // background click to deselect
    svg.addEventListener("click", () => handlers.onBlank());


    container.innerHTML = "";
    container.appendChild(svg);

    // wheel zoom
    svg.addEventListener("wheel", (ev) => {
      ev.preventDefault();
      const delta = ev.deltaY > 0 ? 1.12 : 0.89;
      const vb = svg.viewBox.baseVal;
      const cx = ev.offsetX / svg.clientWidth, cy = ev.offsetY / svg.clientHeight;
      const nw = Math.min(20000, Math.max(300, vb.width * delta));
      const nh = nw * vb.height / vb.width;
      vb.x += (cx * vb.width - cx * nw);
      vb.y += (cy * vb.height - cy * nh);
      vb.width = nw; vb.height = nh;
    }, { passive: false });

    // expose for zoom buttons
    container.__cgSvg = svg;
    container.__cgReset = () => { const vb = svg.viewBox.baseVal; vb.x = 0; vb.y = 0; vb.width = W; vb.height = H; };
    return { svg, W, H };
  }

  function nodeById(nodes, name) { return nodes.find(n => n.name === name); }

  function highlightSelection(container, selected) {
    const svg = container.__cgSvg;
    if (!svg) return;
    for (const g of svg.querySelectorAll(".gnode")) {
      g.classList.toggle("sel", g.dataset.name === selected);
    }
  }

  function zoomBy(container, factor) {
    const svg = container.__cgSvg;
    if (!svg) return;
    const vb = svg.viewBox.baseVal;
    const nw = Math.min(20000, Math.max(300, vb.width * factor));
    vb.x += (vb.width - nw) / 2;
    vb.y += (vb.height - nw * vb.height / vb.width) / 2;
    vb.width = nw;
    vb.height = nw * vb.height / vb.width;
  }

  CG.graph = { renderGraph, highlightSelection, zoomBy };
})();
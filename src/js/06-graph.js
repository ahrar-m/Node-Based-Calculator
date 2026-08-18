(() => {
  "use strict";
  const CG = (typeof window !== "undefined" ? window : globalThis).CalcGraph =
    (typeof window !== "undefined" ? window : globalThis).CalcGraph || {};
  const U = CG.util;

  let svgRoot = null;

  function renderGraph(container, layout, handlers) {
    const { nodes, edges, contentBox } = layout;
    const cb = contentBox || { minX: 0, minY: 0, maxX: 1200, maxY: 700, cx: 600, cy: 350, w: 1200, h: 700 };
    const PAD = 80;
    const W = cb.w + PAD * 2, H = cb.h + PAD * 2;
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", (cb.minX - PAD) + " " + (cb.minY - PAD) + " " + W + " " + H);
    svg.style.width = "100%"; svg.style.height = "100%";
    svgRoot = svg;

    const defs = document.createElementNS(ns, "defs");

    // --- gradients ---
    const edgeGrad = document.createElementNS(ns, "linearGradient");
    edgeGrad.setAttribute("id", "cg-edgeGrad"); edgeGrad.setAttribute("x1", "0"); edgeGrad.setAttribute("y1", "0"); edgeGrad.setAttribute("x2", "1"); edgeGrad.setAttribute("y2", "0");
    const e1 = document.createElementNS(ns, "stop"); e1.setAttribute("offset", "0%"); e1.setAttribute("stop-color", "#6e8bff");
    const e2 = document.createElementNS(ns, "stop"); e2.setAttribute("offset", "100%"); e2.setAttribute("stop-color", "#38e1ff");
    edgeGrad.appendChild(e1); edgeGrad.appendChild(e2);
    defs.appendChild(edgeGrad);

    const edgeGradG = document.createElementNS(ns, "linearGradient");
    edgeGradG.setAttribute("id", "cg-edgeGradG"); edgeGradG.setAttribute("x1", "0"); edgeGradG.setAttribute("y1", "0"); edgeGradG.setAttribute("x2", "1"); edgeGradG.setAttribute("y2", "0");
    const ge1 = document.createElementNS(ns, "stop"); ge1.setAttribute("offset", "0%"); ge1.setAttribute("stop-color", "#ffc857");
    const ge2 = document.createElementNS(ns, "stop"); ge2.setAttribute("offset", "100%"); ge2.setAttribute("stop-color", "#ff9f43");
    edgeGradG.appendChild(ge1); edgeGradG.appendChild(ge2);
    defs.appendChild(edgeGradG);

    const nodeGrad = document.createElementNS(ns, "linearGradient");
    nodeGrad.setAttribute("id", "cg-nodeGrad"); nodeGrad.setAttribute("x1", "0"); nodeGrad.setAttribute("y1", "0"); nodeGrad.setAttribute("x2", "0"); nodeGrad.setAttribute("y2", "1");
    const n1 = document.createElementNS(ns, "stop"); n1.setAttribute("offset", "0%"); n1.setAttribute("stop-color", "#1a2338");
    const n2 = document.createElementNS(ns, "stop"); n2.setAttribute("offset", "100%"); n2.setAttribute("stop-color", "#101627");
    nodeGrad.appendChild(n1); nodeGrad.appendChild(n2);
    defs.appendChild(nodeGrad);

    const nodeGradG = document.createElementNS(ns, "linearGradient");
    nodeGradG.setAttribute("id", "cg-nodeGradG"); nodeGradG.setAttribute("x1", "0"); nodeGradG.setAttribute("y1", "0"); nodeGradG.setAttribute("x2", "0"); nodeGradG.setAttribute("y2", "1");
    const gn1 = document.createElementNS(ns, "stop"); gn1.setAttribute("offset", "0%"); gn1.setAttribute("stop-color", "#2b2333");
    const gn2 = document.createElementNS(ns, "stop"); gn2.setAttribute("offset", "100%"); gn2.setAttribute("stop-color", "#16121f");
    nodeGradG.appendChild(gn1); nodeGradG.appendChild(gn2);
    defs.appendChild(nodeGradG);

    // --- arrow markers ---
    const mk = (id, color) => {
      const m = document.createElementNS(ns, "marker");
      m.setAttribute("id", id); m.setAttribute("viewBox", "0 0 10 10");
      m.setAttribute("refX", "8.5"); m.setAttribute("refY", "5");
      m.setAttribute("markerWidth", "6.5"); m.setAttribute("markerHeight", "6.5");
      m.setAttribute("orient", "auto-start-reverse");
      const p = document.createElementNS(ns, "path");
      p.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
      p.setAttribute("fill", color);
      m.appendChild(p);
      return m;
    };
    defs.appendChild(mk("cg-arrow", "#6e8bff"));
    defs.appendChild(mk("cg-arrow-group", "#ffc857"));
    svg.appendChild(defs);

    // --- edges layer ---
    const edgeLayer = document.createElementNS(ns, "g");
    for (const e of edges) {
      const a = nodeById(nodes, e.from), b = nodeById(nodes, e.to);
      if (!a || !b) continue;
      const x1 = a.x + a.w / 2, y1 = a.y;
      const x2 = b.x - b.w / 2, y2 = b.y;
      const path = document.createElementNS(ns, "path");
      path.setAttribute("class", e.groupEdge ? "edge group-edge" : "edge");
      const dx = Math.max(10, x2 - x1);
      if (x2 - x1 > 24) {
        const c1x = x1 + dx * 0.55, c2x = x2 - dx * 0.55;
        path.setAttribute("d", "M " + x1 + " " + y1 + " C " + c1x + " " + y1 + ", " + c2x + " " + y2 + ", " + x2 + " " + y2);
      } else {
        const midY = (y1 + y2) / 2;
        path.setAttribute("d", "M " + x1 + " " + y1 + " L " + x1 + " " + midY + " L " + x2 + " " + midY + " L " + x2 + " " + y2);
      }
      path.setAttribute("marker-end", "url(#" + (e.groupEdge ? "cg-arrow-group" : "cg-arrow") + ")");
      path.dataset.from = e.from; path.dataset.to = e.to;
      edgeLayer.appendChild(path);

      // period-conversion chip on the edge (e.g. x12, x52)
      const f = U.periodFactor(a.period || "once", b.period || "once");
      if (f !== 1 && Number.isFinite(f)) {
        const t = document.createElementNS(ns, "text");
        t.setAttribute("class", "edge-label" + (e.groupEdge ? " group" : ""));
        t.setAttribute("x", (x1 + x2) / 2);
        t.setAttribute("y", (y1 + y2) / 2 - 7);
        t.setAttribute("text-anchor", "middle");
        t.textContent = "\u00d7" + U.fmt(f);
        edgeLayer.appendChild(t);
      }
    }
    svg.appendChild(edgeLayer);

    // --- node layer ---
    const nodeLayer = document.createElementNS(ns, "g");
    const byName = new Map();
    for (const n of nodes) {
      const g = document.createElementNS(ns, "g");
      g.setAttribute("class", "gnode " + n.kind + (n.kind === "group" ? " group" : ""));
      g.setAttribute("transform", "translate(" + (n.x - n.w / 2) + "," + (n.y - n.h / 2) + ")");
      g.dataset.name = n.name;

      const rect = document.createElementNS(ns, "rect");
      rect.setAttribute("width", n.w); rect.setAttribute("height", n.h); rect.setAttribute("rx", "13");
      rect.setAttribute("fill", "url(#" + (n.kind === "group" ? "cg-nodeGradG" : "cg-nodeGrad") + ")");
      g.appendChild(rect);

      // kind accent bar on the left edge
      const kick = document.createElementNS(ns, "rect");
      kick.setAttribute("class", "kicker " + n.kind);
      kick.setAttribute("x", "4"); kick.setAttribute("y", "10"); kick.setAttribute("width", "3.5"); kick.setAttribute("height", n.h - 20); kick.setAttribute("rx", "1.75");
      g.appendChild(kick);

      // ports (visual connection sockets)
      if (n.incoming > 0) {
        const pIn = document.createElementNS(ns, "circle");
        pIn.setAttribute("class", "port in"); pIn.setAttribute("cx", "0.5"); pIn.setAttribute("cy", n.h / 2); pIn.setAttribute("r", "3.4");
        g.appendChild(pIn);
      }
      if (n.outgoing > 0) {
        const pOut = document.createElementNS(ns, "circle");
        pOut.setAttribute("class", "port out"); pOut.setAttribute("cx", n.w - 0.5); pOut.setAttribute("cy", n.h / 2); pOut.setAttribute("r", "3.4");
        g.appendChild(pOut);
      }

      const name = document.createElementNS(ns, "text");
      name.setAttribute("class", "name");
      name.setAttribute("x", n.w / 2); name.setAttribute("y", 24);
      name.setAttribute("text-anchor", "middle");
      name.textContent = n.name.length > 26 ? n.name.slice(0, 24) + "\u2026" : n.name;
      g.appendChild(name);

      const val = document.createElementNS(ns, "text");
      val.setAttribute("class", "v");
      val.setAttribute("x", n.w / 2); val.setAttribute("y", 41);
      val.setAttribute("text-anchor", "middle");
      const t1 = document.createElementNS(ns, "tspan");
      t1.textContent = (n.value.err ? "\u26a0 " : "") + (n.value.text || "");
      t1.setAttribute("class", n.value.err ? "err" : "ok");
      val.appendChild(t1);
      g.appendChild(val);

      const hasMeta = n.period || n.unit;
      if (hasMeta) {
        const meta = document.createElementNS(ns, "text");
        meta.setAttribute("class", "meta");
        meta.setAttribute("x", n.w / 2); meta.setAttribute("y", 53.5);
        meta.setAttribute("text-anchor", "middle");
        if (n.unit) {
          const u = document.createElementNS(ns, "tspan");
          u.setAttribute("class", "u");
          u.textContent = n.unit;
          meta.appendChild(u);
        }
        if (n.period) {
          const p = document.createElementNS(ns, "tspan");
          p.setAttribute("class", "p");
          p.textContent = (n.unit ? "  \u00b7  " : "") + n.period;
          meta.appendChild(p);
        }
        g.appendChild(meta);
      }

      if (n.kind === "group") {
        const badge = document.createElementNS(ns, "text");
        badge.setAttribute("class", "badge");
        badge.setAttribute("x", n.w - 12); badge.setAttribute("y", 14);
        badge.setAttribute("text-anchor", "middle");
        badge.textContent = "\u25b8";
        g.appendChild(badge);
      }

      g.addEventListener("click", (ev) => { ev.stopPropagation(); handlers.onSelect(n.name); });
      g.addEventListener("dblclick", (ev) => { ev.stopPropagation(); if (n.kind === "group") handlers.onEnter(n.name); });
      nodeLayer.appendChild(g);
      byName.set(n.name, g);
    }
    svg.appendChild(nodeLayer);

    // --- interaction: click blank to deselect, wheel zoom, right/middle drag pan ---
    svg.addEventListener("click", () => handlers.onBlank());

    let pan = null;
    const onMouseDown = (ev) => {
      if (ev.button !== 2 && ev.button !== 1) return;
      ev.preventDefault();
      const vb = svg.viewBox.baseVal;
      pan = { sx: ev.clientX, sy: ev.clientY, vx: vb.x, vy: vb.y };
      svg.classList.add("panning");
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    };
    const onMouseMove = (ev) => {
      if (!pan) return;
      ev.preventDefault();
      const vb = svg.viewBox.baseVal;
      const scale = vb.width / Math.max(1, svg.clientWidth);
      vb.x = pan.vx - (ev.clientX - pan.sx) * scale;
      vb.y = pan.vy - (ev.clientY - pan.sy) * scale;
    };
    const onMouseUp = () => {
      if (!pan) return;
      pan = null;
      svg.classList.remove("panning");
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    svg.addEventListener("mousedown", onMouseDown);
    svg.addEventListener("contextmenu", (ev) => ev.preventDefault());

    svg.addEventListener("wheel", (ev) => {
      ev.preventDefault();
      const delta = ev.deltaY > 0 ? 1.12 : 0.89;
      const vb = svg.viewBox.baseVal;
      const cx = ev.offsetX / Math.max(1, svg.clientWidth), cy = ev.offsetY / Math.max(1, svg.clientHeight);
      const nw = Math.min(30000, Math.max(240, vb.width * delta));
      const nh = nw * vb.height / vb.width;
      vb.x += (cx * vb.width - cx * nw);
      vb.y += (cy * vb.height - cy * nh);
      vb.width = nw; vb.height = nh;
    }, { passive: false });

    container.innerHTML = "";
    container.appendChild(svg);

    // --- centred fit ---
    const fit = () => {
      const vb = svg.viewBox.baseVal;
      const bw = Math.max(cb.w, 320), bh = Math.max(cb.h, 220);
      const w = bw + PAD * 2, h = bh + PAD * 2;
      vb.x = cb.cx - w / 2;
      vb.y = cb.cy - h / 2;
      vb.width = w;
      vb.height = h;
    };
    container.__cgSvg = svg;
    container.__cgReset = fit;
    container.__cgFit = fit;
    return { svg, W, H };
  }

  function nodeById(nodes, name) { return nodes.find(n => n.name === name); }

  function highlightSelection(container, selected) {
    const svg = container.__cgSvg;
    if (!svg) return;
    for (const g of svg.querySelectorAll(".gnode")) {
      g.classList.toggle("sel", g.dataset.name === selected);
    }
    for (const p of svg.querySelectorAll(".edge")) {
      p.classList.toggle("edge-hl", p.dataset.from === selected || p.dataset.to === selected);
    }
  }

  function zoomBy(container, factor) {
    const svg = container.__cgSvg;
    if (!svg) return;
    const vb = svg.viewBox.baseVal;
    const nw = Math.min(30000, Math.max(240, vb.width * factor));
    vb.x += (vb.width - nw) / 2;
    vb.y += (vb.height - nw * vb.height / vb.width) / 2;
    vb.width = nw;
    vb.height = nw * vb.height / vb.width;
  }

  CG.graph = { renderGraph, highlightSelection, zoomBy };
})();
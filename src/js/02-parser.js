(() => {
  "use strict";
  const CG = (typeof window !== "undefined" ? window : globalThis).CalcGraph =
    (typeof window !== "undefined" ? window : globalThis).CalcGraph || {};

  const CMP = new Set([">", "<", ">=", "<=", "==", "!="]);

  function tokenize(src) {
    const toks = [];
    let i = 0;
    while (i < src.length) {
      const ch = src[i];
      if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") { i++; continue; }
      const start = i;
      if (/[0-9]/.test(ch) || (ch === "." && /[0-9]/.test(src[i + 1] || ""))) {
        let j = i;
        while (j < src.length && /[0-9.]/.test(src[j])) j++;
        const s = src.slice(i, j);
        if (/^(\d+\.?\d*|\.\d+)$/.test(s)) {
          const n = Number(s);
          if (Number.isFinite(n)) { toks.push({ t: "num", v: n, p: start }); i = j; continue; }
        }
        throw new Error("Bad number at position " + start);
      }
      if (/[A-Za-z_]/.test(ch)) {
        let j = i;
        while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++;
        toks.push({ t: "ident", v: src.slice(i, j), p: start }); i = j; continue;
      }
      const two = src.slice(i, i + 2);
      if (["<=", ">=", "==", "!="].includes(two)) { toks.push({ t: "op", v: two, p: start }); i += 2; continue; }
      if ("+-*/^(),<>=:".includes(ch)) { toks.push({ t: "op", v: ch, p: start }); i++; continue; }
      throw new Error("Unexpected character '" + ch + "' at position " + start);
    }
    toks.push({ t: "eof", v: "", p: src.length });
    return toks;
  }

  const PREC = { "==": 1, "!=": 1, "<": 1, ">": 1, "<=": 1, ">=": 1, "+": 2, "-": 2, "*": 3, "/": 3, "^": 4 };

  class Parser {
    constructor(toks) { this.toks = toks; this.pos = 0; }
    peek() { return this.toks[this.pos]; }
    next() { return this.toks[this.pos++]; }
    expectOp(v) {
      const t = this.next();
      if (t.t !== "op" || t.v !== v) throw new Error("Expected '" + v + "'" + (t.t === "eof" ? " at end of formula" : ""));
      return t;
    }
    parseExpr(minP) {
      let left = this.parseUnary();
      for (;;) {
        const t = this.peek();
        if (t.t !== "op" || !(t.v in PREC)) break;
        const p = PREC[t.v];
        if (p < minP) break;
        this.next();
        const nextMin = (t.v === "^") ? p : p + 1;
        const right = this.parseExpr(nextMin);
        left = { t: "bin", op: t.v, l: left, r: right, p: t.p };
      }
      return left;
    }
    parseUnary() {
      const t = this.peek();
      if (t.t === "op" && (t.v === "-" || t.v === "+")) {
        this.next();
        return { t: "un", op: t.v, e: this.parseUnary(), p: t.p };
      }
      return this.parsePrimary();
    }
    parsePrimary() {
      const t = this.next();
      if (t.t === "num") return { t: "num", v: t.v, p: t.p };
      if (t.t === "ident") {
        const nxt = this.peek();
        if (nxt.t === "op" && nxt.v === "(") {
          this.next();
          const args = [];
          if (!(this.peek().t === "op" && this.peek().v === ")")) {
            for (;;) {
              args.push(this.parseExpr(0));
              const s = this.peek();
              if (s.t === "op" && s.v === ",") { this.next(); continue; }
              break;
            }
          }
          this.expectOp(")");
          return { t: "call", fn: t.v, args, p: t.p };
        }
        return { t: "name", n: t.v, p: t.p };
      }
      if (t.t === "op" && t.v === "(") {
        const e = this.parseExpr(0);
        this.expectOp(")");
        return e;
      }
      throw new Error("Unexpected token at position " + t.p);
    }
  }

  function parse(src) { return new Parser(tokenize(src)).parseExpr(0); }

  const FUNCS = {
    sum:     { min: 1, max: Infinity, eval: (a) => a.reduce((s, x) => s + x, 0) },
    min:     { min: 1, max: Infinity, eval: (a) => Math.min(...a) },
    max:     { min: 1, max: Infinity, eval: (a) => Math.max(...a) },
    avg:     { min: 1, max: Infinity, eval: (a) => a.reduce((s, x) => s + x, 0) / a.length },
    round:   { min: 1, max: 2, eval: (a) => a.length === 2 ? Number(a[0].toFixed(a[1])) : Math.round(a[0]) },
    abs:     { min: 1, max: 1, eval: (a) => Math.abs(a[0]) },
    if:      { min: 3, max: 3, eval: (a) => (a[0] ? a[1] : a[2]) },
    weekly:  { min: 1, max: 1, eval: (a) => a[0] },
    monthly: { min: 1, max: 1, eval: (a) => a[0] },
    yearly:  { min: 1, max: 1, eval: (a) => a[0] }
  };

  function evaluate(ast, env) {
    switch (ast.t) {
      case "num": return { ok: true, value: ast.v };
      case "name": {
        const v = env[ast.n];
        if (typeof v !== "number" || !Number.isFinite(v)) return { ok: false, error: "no value for '" + ast.n + "'" };
        return { ok: true, value: v };
      }
      case "un": {
        const r = evaluate(ast.e, env);
        if (!r.ok) return r;
        return { ok: true, value: ast.op === "-" ? -r.value : r.value };
      }
      case "bin": {
        const l = evaluate(ast.l, env), rr = evaluate(ast.r, env);
        if (!l.ok) return l; if (!rr.ok) return rr;
        if (CMP.has(ast.op)) {
          const a = l.value, b = rr.value;
          const res = ast.op === ">" ? a > b : ast.op === "<" ? a < b : ast.op === ">=" ? a >= b : ast.op === "<=" ? a <= b : ast.op === "==" ? a === b : a !== b;
          return { ok: true, value: res ? 1 : 0 };
        }
        const a = l.value, b = rr.value;
        let v;
        switch (ast.op) {
          case "+": v = a + b; break;
          case "-": v = a - b; break;
          case "*": v = a * b; break;
          case "/": if (b === 0) return { ok: false, error: "division by zero" }; v = a / b; break;
          case "^": v = Math.pow(a, b); break;
        }
        if (!Number.isFinite(v)) return { ok: false, error: "result is not a number" };
        return { ok: true, value: v };
      }
      case "call": {
        const fn = FUNCS[ast.fn];
        if (!fn) return { ok: false, error: "unknown function '" + ast.fn + "'" };
        if (ast.args.length < fn.min || ast.args.length > fn.max) return { ok: false, error: ast.fn + "() called with wrong number of arguments" };
        const vals = [];
        for (const a of ast.args) { const r = evaluate(a, env); if (!r.ok) return r; vals.push(r.value); }
        try { return { ok: true, value: fn.eval(vals) }; }
        catch { return { ok: false, error: "error in " + ast.fn + "()" }; }
      }
    }
    return { ok: false, error: "bad expression" };
  }

  function identifiers(src) {
    const ast = parse(src);
    const found = [];
    const seen = new Set();
    const walk = (n) => {
      if (!n) return;
      if (n.t === "name") { if (!seen.has(n.n)) { seen.add(n.n); found.push(n.n); } }
      else if (n.t === "bin") { walk(n.l); walk(n.r); }
      else if (n.t === "un") walk(n.e);
      else if (n.t === "call") n.args.forEach(walk);
    };
    walk(ast);
    return found;
  }

  function fmtNum(n) {
    if (!Number.isFinite(n)) return "err";
    if (Number.isInteger(n) && Math.abs(n) < 1e15) return String(n);
    return String(Number(n.toPrecision(8)));
  }

  function simplify(ast) {
    if (ast.t === "num" || ast.t === "name") return ast;
    if (ast.t === "un") {
      const e = simplify(ast.e);
      if (e.t === "num") return { t: "num", v: ast.op === "-" ? -e.v : e.v };
      return { t: "un", op: ast.op, e };
    }
    if (ast.t === "bin") {
      const l = simplify(ast.l), r = simplify(ast.r);
      const bothNum = l.t === "num" && r.t === "num";
      if (bothNum && !CMP.has(ast.op)) {
        if (ast.op === "/" && r.v === 0) return { t: "bin", op: ast.op, l, r };
        let v;
        if (ast.op === "+") v = l.v + r.v; else if (ast.op === "-") v = l.v - r.v;
        else if (ast.op === "*") v = l.v * r.v; else if (ast.op === "/") v = l.v / r.v; else v = Math.pow(l.v, r.v);
        return { t: "num", v };
      }
      if (bothNum && CMP.has(ast.op)) {
        const res = ast.op === ">" ? l.v > r.v : ast.op === "<" ? l.v < r.v : ast.op === ">=" ? l.v >= r.v : ast.op === "<=" ? l.v <= r.v : ast.op === "==" ? l.v === r.v : l.v !== r.v;
        return { t: "num", v: res ? 1 : 0 };
      }
      if (ast.op === "*" && l.t === "num" && l.v === 1) return r;
      if (ast.op === "*" && r.t === "num" && r.v === 1) return l;
      if (ast.op === "*" && l.t === "num" && l.v === 0) return { t: "num", v: 0 };
      if (ast.op === "*" && r.t === "num" && r.v === 0) return { t: "num", v: 0 };
      if (ast.op === "+" && l.t === "num" && l.v === 0) return r;
      if (ast.op === "+" && r.t === "num" && r.v === 0) return l;
      return { t: "bin", op: ast.op, l, r };
    }
    if (ast.t === "call") {
      const args = ast.args.map(simplify);
      if (args.every(a => a.t === "num")) {
        const f = FUNCS[ast.fn];
        if (f) { try { return { t: "num", v: f.eval(args.map(a => a.v)) }; } catch {} }
      }
      return { t: "call", fn: ast.fn, args };
    }
    return ast;
  }

  function toSource(ast, parentPrec) {
    parentPrec = parentPrec || 0;
    switch (ast.t) {
      case "num": return fmtNum(ast.v);
      case "name": return ast.n;
      case "un": return (ast.op === "-" ? "-" : "+") + toSource(ast.e, 3);
      case "bin": {
        const prec = PREC[ast.op];
        const s = toSource(ast.l, prec) + " " + ast.op + " " + toSource(ast.r, CMP.has(ast.op) ? prec : prec + (ast.op === "^" ? 0 : 1));
        return prec < parentPrec ? "(" + s + ")" : s;
      }
      case "call": return ast.fn + "(" + ast.args.map(a => toSource(a, 0)).join(", ") + ")";
    }
    return "?";
  }

  CG.parser = { parse, evaluate, simplify, toSource, identifiers, tokenize, FUNCS, CMP };
})();

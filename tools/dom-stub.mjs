// tools/dom-stub.mjs — shared minimal DOM/browser stubs for headless tests.
export class ElStub {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.attributes = {};
    this.dataset = {};
    this.style = {};
    this.classList = {
      _s: new Set(),
      add: (...c) => c.forEach(x => this.classList._s.add(x)),
      remove: (...c) => c.forEach(x => this.classList._s.delete(x)),
      toggle: (c, f) => { if (f === undefined) { this.classList._s.has(c) ? this.classList._s.delete(c) : this.classList._s.add(c); } else if (f) this.classList._s.add(c); else this.classList._s.delete(c); },
      contains: (c) => this.classList._s.has(c)
    };
    this._listeners = {};
    this.value = "";
    this._text = "";
    this.innerHTML = "";
    this.id = "";
    this.className = "";
    this.checked = false;
    this.disabled = false;
    this.selected = false;
    this.type = "";
    this.selectionStart = 0; this.selectionEnd = 0;
    this.viewBox = { baseVal: { x: 0, y: 0, width: 1200, height: 700 } };
    this.clientWidth = 800; this.clientHeight = 600;
  }
  get textContent() { return this._text; }
  set textContent(v) { this._text = String(v == null ? "" : v); }
  setAttribute(k, v) { this.attributes[k] = String(v); if (k === "id") this.id = String(v); if (k === "viewBox") { const m = String(v).split(/\s+/).map(Number); this.viewBox.baseVal = { x: m[0], y: m[1], width: m[2], height: m[3] }; } }
  getAttribute(k) { return this.attributes[k] == null ? null : this.attributes[k]; }
  appendChild(c) { c.parentNode = this; this.children.push(c); return c; }
  removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); c.parentNode = null; return c; }
  replaceChildren(...cs) { this.children = []; cs.forEach(c => this.appendChild(c)); }
  addEventListener(type, fn) { (this._listeners[type] = this._listeners[type] || []).push(fn); }
  removeEventListener() {}
  dispatchEvent(ev) {
    ev = ev || {}; ev.target = ev.target || this;
    ev.preventDefault = ev.preventDefault || (() => {});
    ev.stopPropagation = ev.stopPropagation || (() => {});
    (this._listeners[ev.type] || []).forEach(fn => fn(ev));
    return true;
  }
  focus() {} click() {}
  querySelectorAll() { return []; }
  querySelector() { return null; }
}

export function installSandbox(extras = {}) {
  const docRoots = { roots: [] };
  const doc = {
    createElement: (tag) => new ElStub(tag),
    createElementNS: (ns, tag) => new ElStub(tag),
    querySelector: () => null,
    addEventListener() {},
    body: new ElStub("body"),
    hidden: false,
    getElementById(id) {
      const walk = (n) => {
        if (n.id === id) return n;
        for (const c of n.children || []) { const r = walk(c); if (r) return r; }
        return null;
      };
      for (const r of docRoots.roots) { const f = walk(r); if (f) return f; }
      return null;
    }
  };
  const appEl = new ElStub("div"); appEl.id = "app";
  docRoots.roots.push(appEl, doc.body);
  const storage = {
    _m: {},
    getItem(k) { return this._m[k] == null ? null : this._m[k]; },
    setItem(k, v) { this._m[k] = String(v); },
    removeItem(k) { delete this._m[k]; },
    clear() { this._m = {}; }
  };
  const win = { addEventListener() {}, document: doc };
  class BlobStub { constructor(parts) { this.size = parts.join("").length; } }
  return {
    console,
    document: doc,
    window: win,
    localStorage: storage,
    URL: { createObjectURL: () => "blob:stub", revokeObjectURL: () => {} },
    Blob: BlobStub,
    confirm: () => true,
    prompt: () => "stubbed",
    setTimeout, clearTimeout,
    Event: globalThis.Event || class Event { constructor(type) { this.type = type; } },
    FileReader: class FileReader { readAsText() {} },
    ...extras
  };
}

# AGENT.md — Project Memory & Quick History

> **Read this first.** This file gives any agent (human or AI) a fast, accurate history of
> *what the user asked for*, *what was decided*, *what has been built and verified*, and
> *how to work with this repo*. The detailed conversation record lives in [inputs/](inputs/)
> and the design docs live in [docs/](docs/) — see the Reading order at the bottom.

---

## 1. TL;DR

**CalcGraph** ("Node-Based Calculator") is a **browser-only, equation-first formula
modeler**. You write (or let any AI write) named equations; the app:
- **auto-generates a connected node-graph view** (departments as blocks, wires drawn),
- derives an **expandable combined equation** for the entire model (substitution + collapse),
- supports **unlimited nested groups** with drill-down (double-click to enter, breadcrumbs),
- offers **project + global constant libraries** with sliders (min/max/step) and
  snapshots (saved values, click to apply),
- imports AI-generated JSON (paste or file) with strict validation, exports JSON,
- auto-saves to the browser, works fully offline from one file.

Zero runtime dependencies. One standalone HTML file — deployed on **GitHub Pages at
`https://ahrar-m.github.io/Node-Based-Calculator/`** (serves root `index.html`;
a shareable `calcgraph.html` copy is also committed).

---

## 2. The user's goal (in their words)

> "I want to build a calculator that is completely operated with the help of Equations
> something like Nodes or blocks that connect each department with each other and then
> provide a complete Combined equation at the end… Summation of all the individual
> Expenses that could be weekly monthly or at one time… Trying to fit all the equations
> that go into a design so that one can keep improving a field and then update the
> constants involved in the overall complete design… I want something that can have
> like a complete equation for the entire structure… easily visualizable… allow going
> into depth in any one of the part of the overall equation so I can dive deep into it
> and have additional equations there for each of the categories or buckets."

Full verbatim brief: [inputs/user-brief.md](inputs/user-brief.md)

## 3. Key decisions (locked in by the user)

| # | Decision | Why |
|---|---|---|
| 1 | **Approach B — equations first; the node graph is a generated view** (not hand-wired) | User has **zero node-graph experience**; hand-wiring ports has a steep curve. Typing (or AI-writing) equations "is the model"; the blocks/wires are drawn for you. A and B share the same engine; B removes the friction. |
| 2 | Math scope for v1: **basic arithmetic + sum/min/max/avg/round/if/abs + comparisons + period helpers** | User chose "basic arithmetic only" for v1; unit conversions and statistics deferred. |
| 3 | **Unlimited nesting**, numbers AND expandable combined equation (both central) | Direct user requirements. |
| 4 | Constants: **project library + global library**, browser-stored, exportable | User explicitly requested project-scoped + global libraries. |
| 5 | **AI-importable models**: documented JSON format + a prompt template any AI can use; import via paste/file | User: "AI generates a document that can be directly imported into the tool. I also want to have the prompt that I have to give to AI." |
| 6 | Sliders with **user-defined limits** + saved single-click values (snapshots) | Direct user requirement. |
| 7 | **Zero-dependency single standalone HTML**, built by joining separate src files | User: "all the individual components that are going into the final HTML are kept separate and some kind of a script runs and then joins all of these together… final file in standalone html format." AI will edit **src/** directly, never the bundle. |
| 8 | **Deploy to GitHub Pages**; Pages configured on **main branch at root** | User enabled Pages at main/root; therefore root `index.html` (and shareable `calcgraph.html`) are committed. |
| 9 | Working name: **CalcGraph** (user deferred naming to approach decision; rename anytime) | — |

## 4. Repository layout

```
AGENT.md                <- this file (project memory)
inputs/                 <- everything the USER provided + the Q&A + the agent's path
docs/
  SPEC.md               <- product & architecture spec
  MODEL_FORMAT.md       <- JSON schema for models (AI import contract)
  AI_PROMPT.md          <- copy-paste prompt template for any AI
  index.html            <- built app (superset; also at repo root)
examples/               <- *.model.json (canonical; injected into the app as demos)
src/
  index.html            <- HTML shell (template, contains /*__CSS__*/ and /*__JS__*/ tokens)
  manifest.json         <- the module list + output paths used by build.mjs
  styles/               <- 5 CSS modules (base, layout, components, graph, equation)
  js/                   <- 13 small JS modules (see §6)
build.mjs               <- the joiner: src/ -> standalone HTML files
tools/
  serve.mjs             <- zero-dep local preview server (http://localhost:8080)
  smoke.mjs             <- 28 headless engine tests
  bundle-check.mjs      <- executes the BUILT bundle in a VM to verify it + demos
package.json            <- scripts: build / serve / verify
index.html              <- ROOT copy served by GitHub Pages (main/root)
calcgraph.html          <- ROOT shareable, properly-named copy
.github/workflows/deploy.yml <- optional mirror: publishes docs/ to gh-pages branch
README.md               <- user-facing instructions
```

## 5. Commands

```bash
node build.mjs              # join src/ -> docs/index.html, index.html, calcgraph.html
node tools/serve.mjs        # preview at http://localhost:8080
node tools/smoke.mjs        # 28 engine tests (parse, eval, periods, equations, validation)
node tools/bundle-check.mjs # execute the BUILT bundle in a Node VM; confirm demos + API
```
No `npm install` needed for anything.

## 6. Architecture & conventions (read before editing)

- **Module style:** every `src/js/*.js` file is an IIFE that attaches its exports to
  the shared namespace: `const CG = (window||globalThis).CalcGraph = …` (load-order is
  defined in `src/manifest.json`; files may reference `CG.*` at runtime only).
- **Evaluation result shape (gotcha):** `CG.evaluate.evaluateModel(model)` returns
  `{ results: {name->{value|error}}, root: {value|error}, contrib: [...] }`.
  Pass **`.results` (the map)** to equation/inspector/builder renderers — not the wrapper.
- **Period conversion:** values convert at *use sites* to the parent's period:
  `factor = yearlyFactor(child) / yearlyFactor(parent)`; once=1, week=52, month=12, year=1.
- **Model validation:** unique ids+names, valid identifiers, kinds (value|formula|group),
  known references, no groups-with-formulas (groups are sums of children), cycle detection.
- **Expression grammar:** numbers, identifiers, `+ - * / ^ ( ) ,` and comparisons
  `== != < > <= >=`; functions `sum min max avg round if abs weekly monthly yearly`.
- **Combined equation:** render-time substitution per term; terms expand when present in
  the `expanded` Set (root is always force-expanded); leaf values/constants substitute
  in numeric mode; period factors materialize as `× 12` etc. Never fully expands by
  default (depth-cap `maxDepth` guarded).
- **UI updates:** structural changes call `app.commit()` (full re-render); typing-in-
  inspector changes call `app.updateTerm(name, patch, quiet=true)` to avoid stealing
  focus from inputs.

## 7. Built & verified (status)

- [x] Model engine (validate, index, deps, parents, cycles) — tested
- [x] Parser/evaluator/simplifier — tested
- [x] Evaluator with period conversion + contributions — tested
- [x] Combined-equation generator (expand/collapse, numeric mode, factors) — tested
- [x] Auto-layout graph (layered DAG) + SVG render (zoom, drill-down, breadcrumbs)
- [x] Inspector (edit values/description/period/unit, sliders, snapshots, used-by)
- [x] Interactive formula builder (chips, live parse + preview, attachment chain)
- [x] Libraries (project + global CRUD, slider/snapshot editor)
- [x] Storage (localStorage autosave, model list, JSON export)
- [x] Import modal (paste AI JSON / file) + validation errors
- [x] Demos injected at build (expenses → 160,056/yr; beam design → status SAFE)
- [x] Build pipeline (3 outputs), preview server, 28 smoke tests, bundle verification
- [ ] Deferred / next: undo-redo, printable/interactive report export, in-app AI chat,
      charts for time buckets, drag-rearrange of graph, unit conversion, statistics fns.

## 8. Reading order

1. This file (AGENT.md)
2. [inputs/user-brief.md](inputs/user-brief.md) — the user's words
3. [inputs/discovery-qa.md](inputs/discovery-qa.md) — the 11 questions + exact answers
4. [inputs/decisions.md](inputs/decisions.md) — decisions & requirements
5. [inputs/agent-journey.md](inputs/agent-journey.md) — how this was built
6. [docs/SPEC.md](docs/SPEC.md) → [docs/MODEL_FORMAT.md](docs/MODEL_FORMAT.md) → [docs/AI_PROMPT.md](docs/AI_PROMPT.md)
7. Then `src/js/*.js` in manifest order; `src/styles/*.css`; `build.mjs`.

---
*Last updated: session 1 (discovery + full P1 build + verification). Append here whenever a
new session changes behavior, decisions, or adds features — future agents rely on this file.*

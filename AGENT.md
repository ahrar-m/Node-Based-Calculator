# AGENT.md — Project Memory & Quick History

> **Read this first.** Any agent (human or AI) must read this file before touching code.
> It gives a fast, accurate history of *what the user asked for*, *what was decided*,
> *what was built and verified*, and *how to work in this repo* — so you never have to
> reverse-engineer the project from the code.

---

## 1. TL;DR

**CalcGraph** ("Node-Based Calculator") is a **browser-only, equation-first formula
modeler**. You write (or let any AI write) named equations; the app:
- **auto-generates a connected node-graph view** (departments as blocks, wires drawn),
- derives an **expandable combined equation** for the entire model,
- supports **unlimited nested groups** with drill-down (double-click to enter),
- offers **project + global constant libraries** with sliders and saved snapshots,
- imports AI-generated JSON (paste/file) with strict validation, exports JSON,
- auto-saves to the browser, works fully offline from one file.

Zero runtime dependencies. Deployed on **GitHub Pages** at
`https://ahrar-m.github.io/Node-Based-Calculator/` (Pages on **main branch / root**,
serving root `index.html`; shareable `calcgraph.html` is also committed).

---

## 2. ⚠️ WORKING RULES FOR AGENTS (read before anything else)

1. **NEVER read the built HTML files.** `docs/index.html`, `index.html`,
   `calcgraph.html` are **generated** (~108 KB of inlined CSS+JS). Reading or grepping
   them wastes tokens and adds noise. The **only** reasons to touch them are:
   (a) `node build.mjs` to regenerate them, or (b) debugging a *runtime* issue via the
   headless harnesses (`tools/ui-smoke.mjs`, `tools/bundle-check.mjs`) — never by
   eyeballing the file. **Always work from `src/`, `examples/`, `build.mjs`, `tools/`.**
2. **Canonical change flow:** edit `src/**` → `node build.mjs` → run the four checks
   (`node tools/smoke.mjs`, `node tools/ui-smoke.mjs`, `node tools/bundle-check.mjs`,
   `node tools/audit.mjs`) → commit with a **detailed multi-paragraph message** → push to
   `main` → Pages redeploys automatically (allow ~1 min, then hard-refresh).
3. **Rebuild before testing UI:** `tools/ui-smoke.mjs` and `tools/bundle-check.mjs`
   execute the **built** `docs/index.html`, so they only reflect `src/` changes after a
   rebuild. `tools/smoke.mjs` tests the engine from `src/` directly.
4. **Examples are build inputs:** `examples/*.model.json` are injected into the app as
   demos **at build time** (token `/*__DEMO_JSONS__*/` in `src/js/12-demos.js`). Edit the
   JSON file, rebuild; never embed demo JSON in other source files.
5. **PowerShell 5.1 on this machine:** no `&&` chaining; use separate commands or `;`.
   Use `node --check <file>` to syntax-check changed JS.
6. Keep the working tree clean when you finish (no stray debug files, no node_modules).
   Update this file + `inputs/agent-journey.md` whenever behavior, decisions, or the
   architecture change.
7. **Keep the session to-do list live — never forget to update it.** At the very start of
   every session, create/refresh the session to-do list (the todo-list tool): plan every
   pending task before starting. After completing **every single task or subtask** (a fix,
   a check pass, a doc update, a commit), update the list **immediately** — mark the
   finished item done and add any newly discovered follow-ups. Never batch the update at
   the end and never leave finished work unlisted. A session is only "done" when the list
   is fully checked off or every remaining item is deliberately parked.
8. **Ask first — as many questions as needed.** This project was shaped by an 11-question
   discovery round ([inputs/discovery-qa.md](inputs/discovery-qa.md)); keep that habit in
   EVERY session. Before starting work on any request: if the ask is ambiguous, incomplete,
   or open to interpretation, ask the user clarifying questions — as many as needed — until
   you genuinely understand what they want. Never guess a major requirement, never assume
   a scope, never trade "quick progress" for a wrong build, and never treat silence as
   approval. Record every question and the user's answers **verbatim** in `inputs/` so later
   sessions inherit the context.
9. **Always end executed work with a detailed commit — never leave changes uncommitted.**
   After finishing ANY execution (fix, feature, docs, tests) commit to `main` with a
   **detailed multi-paragraph message** and push. A good message says WHAT changed, WHY
   (root cause / user requirement), HOW (files + approach), what pitfalls were found,
   which checks ran and their results, and names every changed file. No "wip" or
   "updated stuff" commits ever. If a push fails, retry until `origin/main` matches
   `HEAD`; a session is not finished until the tree is clean and everything is pushed.

---

## 3. The user's goal (in their words)

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

## 4. Key decisions (locked in by the user)

| # | Decision | Why |
|---|---|---|
| 1 | **Approach B — equations first; the node graph is a generated view** (not hand-wired) | User has **zero node-graph experience**; hand-wiring has a steep curve. Typing (or AI-writing) equations IS the model; blocks/wires are drawn for you. |
| 2 | Math scope for v1: basic arithmetic + sum/min/max/avg/round/if/abs + comparisons + period helpers | User chose "basic arithmetic only" for v1. |
| 3 | **Unlimited nesting**; numbers AND expandable combined equation, both central | Direct user requirements. |
| 4 | Constants: **project + global libraries**, browser-stored, exportable | Explicit user requirement. |
| 5 | **AI-importable models**: JSON format + prompt template any AI can use; import via paste/file | User: "AI generates a document that can be directly imported into the tool. I also want to have the prompt that I have to give to AI." |
| 6 | Sliders with **user-defined min/max/step** + saved single-click snapshots | Direct user requirement. |
| 7 | **Zero-dependency single standalone HTML**, joined from separate src files by a script | User: "all the individual components… kept separate and some kind of a script runs and then joins all of these together… final file in stand alone html format." AI edits **src/** directly, never the bundle. |
| 8 | **GitHub Pages on main branch at root** | User enabled Pages at main/root; root `index.html` + shareable `calcgraph.html` are committed. |
| 9 | Working name: **CalcGraph** (rename anytime) | User deferred naming to the approach decision. |

## 5. Repository layout

```
AGENT.md                <- THIS FILE (project memory) — read first
inputs/                 <- everything the USER provided + Q&A + agent journey
docs/
  SPEC.md               <- product & architecture spec
  MODEL_FORMAT.md       <- JSON schema for models (AI import contract)
  AI_PROMPT.md          <- copy-paste prompt template for any AI
  index.html            <- BUILT artifact — do NOT read (regenerated)
examples/               <- *.model.json (canonical; injected into the app as demos at build)
src/
  index.html            <- HTML shell (template with /*__CSS__*/ and /*__JS__*/ tokens)
  manifest.json         <- the module list + output paths used by build.mjs
  styles/               <- 5 CSS modules (base, layout, components, graph, equation)
  js/                   <- 14 small JS modules (see §7)
build.mjs               <- the joiner: src/ -> standalone HTML files
tools/
  dom-stub.mjs          <- shared minimal DOM/browser stubs for headless tests
  serve.mjs             <- zero-dep local preview server (http://localhost:8080)
  smoke.mjs             <- engine tests (26) from src/
  ui-smoke.mjs          <- boots BUILT docs/index.html with DOM stubs; 37 UI checks
  bundle-check.mjs      <- executes the BUILT bundle in a VM; confirms demos + API
  audit.mjs             <- verifies zero external dependencies in the built HTML
package.json            <- scripts: build / serve / verify
index.html, calcgraph.html  <- ROOT BUILT copies — do NOT read (regenerated)
.github/workflows/deploy.yml <- optional mirror to gh-pages branch (Pages uses main/root)
README.md               <- user-facing instructions
```

## 6. Commands

```bash
node build.mjs              # join src/ -> docs/index.html, index.html, calcgraph.html
node tools/serve.mjs        # preview at http://localhost:8080
node tools/smoke.mjs        # 26 engine tests (parse, eval, periods, equations, validation)
node tools/ui-smoke.mjs     # boot BUILT docs/index.html with DOM stubs; 37 UI checks
node tools/bundle-check.mjs # execute BUILT bundle; confirm demos + API (root = 160056)
node tools/audit.mjs        # confirm zero external URLs/scripts/links
```
No `npm install` needed for anything.

## 7. Architecture & conventions (read before editing)

- **Module style:** every `src/js/*.js` file is an IIFE attaching exports to the shared
  namespace `const CG = (window||globalThis).CalcGraph = …`. Load order is defined in
  `src/manifest.json`; files may reference `CG.*` **at runtime only**.
- **Evaluation result shape (gotcha):** `CG.evaluate.evaluateModel(model)` returns
  `{ results: {name->{value|error}}, root: {value|error}, contrib: [...] }`. Renderers
  (equation/inspector/builder) must receive **`.results` (the map)** — not the wrapper.
- **Period conversion:** values convert at *use sites* to the parent's period:
  `factor = yearlyFactor(child) / yearlyFactor(parent)`; once=1, week=52, month=12, year=1.
- **Model validation:** unique ids+names, valid identifiers, kinds (value|formula|group),
  known references, groups may NOT have formulas (they are sums of children), cycle detection.
- **Grammar:** numbers, identifiers, `+ - * / ^ ( ) ,`, comparisons `== != < > <= >=`,
  functions `sum min max avg round if abs weekly monthly yearly` (weekly/monthly/yearly are
  identity placeholders — real conversion happens via term periods at use sites).
- **Combined equation:** render-time substitution; terms expand when in the `expanded`
  Set (root is force-expanded via `rootForce`/`rootName`); leaf values and constants
  substitute in numeric mode; period factors materialize as `× 12`; depth capped by
  `maxDepth`. Never fully expands by default.
- **UI updates:** structural changes call `app.commit()` (full re-render); typing-in-
  inspector changes call `app.updateTerm(name, patch, quiet=true)` to avoid focus loss.
- **Boot gotcha (was a shipped bug):** the bundle boots itself via `api.init()` at the end
  of `src/js/13-app.js`. A blank page means boot never ran — debug with
  `tools/ui-smoke.mjs` or DevTools.

## 8. Known pitfalls (learned the hard way — check these first when something breaks)

- **Blank page** → `CG.app.init()` not called (fixed; see §7). If it happens again, the
  boot call was removed.
- **`? / undefined` values in equation/inspector** → you passed the evaluator *wrapper*
  instead of the `.results` map (see §7).
- **SyntaxError in a src file** → template-literal escapes: `
` inside a double-quoted
  JS string must be written as `\\n` in an agent program's template string, or a literal
  newline lands in the file and breaks it (happened in 01-model.js).
- **Very large code-generation messages get truncated** by the harness — write files one
  or two per call, never many kilobyte-files in one message.
- **Unit mismatches in examples** (N·m ÷ m³ gives Pa, not MPa) — keep each example's units
  internally consistent.
- **PowerShell 5.1:** no `&&`; use `;` or separate calls. For multi-line output,
  prefer `node -e`/files over PS pipelines where possible.
- **localStorage keys:** `calcgraph.models.v2`, `calcgraph.global.cons.v1`,
  `calcgraph.units.v1` (global unit library — built-ins merge with user customs on
  load; only save customs, never built-ins) — changing any shape? bump the version suffix.
- **Graph node values showed "?"** → `layoutGraph` must receive the **results map**
  (`state.results.results`), never the `{results, root, contrib}` wrapper (fixed in session 4).
- **`renameIdentifiers` is token-based**: never regex-replace term names in formulas blindly;
  use `CG.parser.renameIdentifiers(src, {old:new})` (falls back to word-boundary regex only
  when a formula won't tokenize).

## 9. Built & verified (status)

- [x] Model engine (validate, index, deps, parents, cycles) — tested
- [x] Parser/evaluator/simplifier — tested
- [x] Evaluator with period conversion + contributions — tested
- [x] Combined-equation generator (expand/collapse, numeric mode, factors) — tested
- [x] Auto-layout graph (layered DAG) + SVG render — **centred fit**, right/middle-drag pan,
      wheel zoom, gradient bezier edges with period-factor chips (×12/×52), rich nodes
      (kind accent, ports, unit/period meta line), edge/node highlight on selection
- [x] Inspector (editable **term name with full reference propagation**, value/description,
      **unit picker: quantity → symbol**, period select with "no period" default, sliders, snapshots)
- [x] Unit system: **global unit library** (built-in quantities Time/Length/Breadth/Area/Volume/
      Mass/Force/Pressure/Energy/Power/Temperature/Angle/Currency/Ratio/Count + user customs saved
      in `calcgraph.units.v1`), derived-unit hint for formulas (e.g. `N·mm / mm³`)
- [x] Libraries (project + global CRUD, slider/snapshot editor)
- [x] Storage (localStorage autosave, model list, JSON export, unit library)
- [x] Import modal (paste AI JSON / file) + validation errors
- [x] Demos injected at build (expenses → 160,056/yr; beam design → SAFE)
- [x] Build pipeline (3 outputs), preview server, engine/UI/bundle/audit checks
- [ ] Deferred / next: undo-redo, printable/interactive report export, in-app AI chat,
      charts for time buckets, drag-rearrange of graph, numeric unit conversion, statistics fns,
      mobile layout pass.

## 10. Session log

- **Session 1 (build):** discovery Q&A (11 questions) → approach analysis (chose B) →
  SPEC/MODEL_FORMAT/AI_PROMPT + examples → build system → engine → UI → build-test-fix
  loop → `inputs/` + `AGENT.md` → commit `540130b` (full build) → pushed; Pages live (200).
- **Session 2 (bugfix):** user reported blank page (local + live). Root cause: init never
  called. Fixed boot + added `setView`/`setEqTab`, built `tools/dom-stub.mjs` +
  `tools/ui-smoke.mjs`, made smoke/bundle-check stub-aware. Commit `791d382` → pushed.
  Also `tools/audit.mjs` (`3da06e3`) and steady-state rebuilds.
- **Session 3 (docs):** added the agent working rules (this file) — never read built HTML,
  canonical change flow, pitfalls, session log. (This session.)
- **Session 5 (buttons audit, new-term fix, docs):** (1) audited **every button placement**
  (header, view header, sidebar outline/constants, inspector, modals): header logo+select+3
  buttons+status crowded below ~960 px with no wrapping; the equation view-header carried up
  to **7 buttons** with no wrap; sidebar rows sat 6 px apart; the graph hint could collide
  with the zoom controls. Fixed in CSS: header/footer now wrap (auto-height rows with
  min-heights), view-header wraps, sidebar rows are 8 px with a separated action row, three
  responsive breakpoints (1120 / 960 / 820 px), graph hint hidden ≤700 px. (2) Fixed **"+ New term"
  did nothing**: `openNewTerm` called `CG.units.renderUnitPicker(app(), …)` — inside that
  function `app` is the API **object**, so calling it as a function threw a TypeError before
  the modal was ever appended (silent no-op). Now passes `app`. (3) Added a ui-smoke
  regression that clicks the real "+ New term" sidebar button, fills the modal, clicks
  Create and asserts the term was added (ui-smoke now 37 checks). (4) Rewrote README.md:
  "What the tool provides", "How to operate" step-by-step, "What to look out for".
  (5) Added this file's rule 7: keep the session to-do list updated after every task.
  (6, follow-up) Added rule 8: agents must ask the user as many clarifying questions as
  needed before acting on any ambiguous request (the discovery-round habit), and the
  next-session checklist now makes asking questions step 2.
  (7, follow-up) Added rule 9: always end executed work with a **detailed multi-paragraph
  commit message** and push — never leave changes uncommitted; the checklist's finishing
  step now requires committing with a detailed message and verifying the push matches HEAD.
  Rebuilt all outputs; all four checks green; committed and pushed.

- **Session 4 (features + redesign):** (1) **editable variable names** — inspector name field +
  `app.renameTerm` with token-based `renameIdentifiers` (formulas, group children, root all
  propagate; dry-run validation first). (2) **user-configured unit system** — new `src/js/06-units.js`:
  built-in quantity defaults (time/length/breadth/etc.), quantity→symbol pickers on every term and
  constant, **custom units saved to a global library** (`calcgraph.units.v1`), derived-unit hint
  for formulas; **no auto-assigned periods/units** ("no period" is the default; new models/terms start blank).
  (3) **right-drag pan** + centred **fit** (content bounding box; was left-aligned) + richer graph rendering
  (bezier gradient edges, ports, period-factor chips, kind accents). (4) **deep visual overhaul** of all 5 CSS
  modules: glass header/footer/modals, gradient accents, glow/shadows, dot-grid graph canvas, hierarchical
  collapsible outline tree, styled sliders/chips/toasts, equation cards. Fixed a latent bug: graph node values
  showed "?" (layout got the evaluator wrapper instead of the results map). Checks: smoke 26/26, ui-smoke 31/31,
  bundle + audit clean; verified boot in real headless Chrome with zero console errors. Commit pushed to main.

## 11. Suggested actions for the NEXT session

1. **Create or refresh the session to-do list first**, then read this file, then
   [inputs/user-brief.md](inputs/user-brief.md) and
   [inputs/discovery-qa.md](inputs/discovery-qa.md) — do NOT open built HTML files.
   Update the to-do list after **every** task (working rule 7).
2. **Before any new work, ask the user as many clarifying questions as needed** until the
   request is unambiguous (working rule 8) — never build on assumptions. Record the Q&A
   verbatim in `inputs/` when it changes the project.
3. If the user reports a UI problem: run `node tools/ui-smoke.mjs` first (it boots the
   real bundle), then investigate `src/`.
4. If the user wants a new feature: ask any clarifying questions first (rule 8), add it
   to `src/`, rebuild, run all four checks, then commit with a detailed message and push;
   update this file + the journey.
5. Before claiming done: run all checks, **commit with a detailed multi-paragraph message
   (working rule 9)**, push, confirm `git status` is clean and `origin/main` matches
   `HEAD`, and confirm the live Pages URL returns 200 after the push.

## 12. Reading order

1. This file (AGENT.md)
2. [inputs/user-brief.md](inputs/user-brief.md) — the user's words
3. [inputs/discovery-qa.md](inputs/discovery-qa.md) — the 11 questions + exact answers
4. [inputs/decisions.md](inputs/decisions.md) — decisions & requirements
5. [inputs/agent-journey.md](inputs/agent-journey.md) — how this was built
6. [docs/SPEC.md](docs/SPEC.md) → [docs/MODEL_FORMAT.md](docs/MODEL_FORMAT.md) → [docs/AI_PROMPT.md](docs/AI_PROMPT.md)
7. Then `src/js/*.js` in manifest order; `src/styles/*.css`; `build.mjs`; `tools/*`.
   (Never read the built HTML files.)

---
*Last updated: session 5 — button-layout audit + CSS fixes, "+ New term" bug fix + regression
checks, README operation guide, working rule 7 (keep the session to-do list updated after every
task), working rule 8 (always ask the user as many clarifying questions as needed), and working
rule 9 (always finish with a detailed multi-paragraph commit message + push).*

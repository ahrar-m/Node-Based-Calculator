# agent-journey.md — the path the agent took

A step-by-step record of how the agent went from the user's request to a shipped,
verified app. Numbered phases, each with what was done and why it mattered.

## Phase 0 — Orientation
1. Inspected the (nearly empty) repo: only README + LICENSE. Confirmed this is a
   greenfield project.
2. Recognized the user's request was a *discovery* ask ("help me understand what exactly
   I want to build") and that the user explicitly invited many questions.

## Phase 1 — Discovery (11 structured questions)
3. Identified that the user's idea is a known software concept: a **hierarchical formula
   graph** — visual blocks that are math, with a derived combined equation and unlimited
   drill-down. Named the pieces (Model / Term / Group / Constant library / Combined
   equation / Inspector).
4. Mapped the user's two examples (business expense rollups with weekly/monthly/one-time;
   design equations with tunable constants) onto that model, and compared it with existing
   tools (Excel formulas, Grasshopper/Dynamo, Node-RED/React Flow) to show what would be
   new: the *derived, expandable combined equation*.
5. Asked 11 scoping questions (platform, use case, users, math scope, combined equation,
   nesting depth, constants, data sources, what-if, exports, node familiarity). Captured
   every answer verbatim. (Recorded in [discovery-qa.md](discovery-qa.md).)

## Phase 2 — Approach analysis & the node question
6. The user challenged the node approach: "help me understand first if Node based system
   is the right approach." The agent laid out five approaches (draw-nodes / equations-with-
   generated-graph / spreadsheet / notebook / code DSL) with a comparison table and
   concrete walkthroughs of *the user's own business example* in each.
7. Recommended **Approach B** (equations as source of truth; graph auto-drawn) because the
   user has zero node experience, wants the combined equation (which is native to
   equations), and wants AI-generated models (which are text). A and B share the same
   engine; B removes the wiring friction.
8. User confirmed B and expanded the requirements: friendly formula input, separate source
   modules joined by a script into one standalone HTML, GitHub Pages deployment. (D2–D5.)

## Phase 3 — Foundation artifacts (P0)
9. Created a persistent completion goal for the multi-round build.
10. Wrote: `docs/SPEC.md` (product + architecture), `docs/MODEL_FORMAT.md` (JSON schema
    that any AI must produce), `docs/AI_PROMPT.md` (the copy-paste prompt template the
    user asked for), and two example models (`examples/business-expenses.model.json`,
    `examples/beam-design.model.json`) which double as the app's built-in demos.

## Phase 4 — Build system (the user's architecture requirement)
11. `build.mjs` + `src/manifest.json`: reads CSS/JS module lists in order, inlines
    everything, injects the example models into the demos module, writes standalone HTML.
12. `tools/serve.mjs` (zero-dep static server) and `package.json` scripts
    (build / serve / verify).
13. `.github/workflows/deploy.yml` (published docs/ to gh-pages as an optional mirror;
    the primary deployment is the user's Pages-on-main-root setting).

## Phase 5 — Styling
14. Five small CSS modules (base tokens, layout grid, components, graph, equation).

## Phase 6 — Engine
15. `01-model.js`: model normalization/indexing, validation (unique names/ids, valid
    identifiers, known references, group rules, **cycle detection**), round-trip JSON.
16. `02-parser.js`: hand-written lexer + Pratt parser, evaluator (with division-by-zero
    and non-finite guarding), simplifier, source printer, identifier extraction.
17. `03-evaluate.js`: topological evaluation with memoization; **period conversion at use
    sites** (once/week/month/year); per-edge contributions for the inspector.
18. `04-equation.js`: combined-equation builder — substitution with per-term
    expand/collapse, root always expanded, period factors (`× 12`), numeric mode,
    "All terms" tab.

## Phase 7 — UI
19. `05-layout.js` + `06-graph.js`: layered-DAG auto-layout and SVG rendering
    (zoom, drill-down, breadcrumbs, selection highlight).
20. `07-inspector.js`: click-any-node panel — value/description/period/unit editing,
    sliders, click-to-apply snapshots, used-by chain, contributions.
21. `08-builder.js`: the friendly formula builder (operator/function/name chips insert
    at cursor; live parse status + preview value; "how this attaches into the main
    formula"); plus new-term modal (value/formula/group).
22. `09-libraries.js`: project + global constant CRUD with slider/snapshot editors.
23. `10-storage.js`: localStorage autosave, model list, JSON export.
24. `11-import.js`: paste-AI-JSON / file import with validation error display.
25. `12-demos.js`: placeholder token; `build.mjs` injects the example models.
26. `13-app.js`: state, rendering orchestration, actions, persistence hooks.

## Phase 8 — Build → test → fix loop
27. First build failed: manifest paths mismatched the CSS filenames → fixed manifest.
28. PowerShell 5.1 lacked `&&` → split commands.
29. Smoke test #1 exposed a **literal newline inside a string** in 01-model.js
    (escape mishap) → fixed, re-checked with `node --check`.
30. Smoke test #2: 7 failures — analyzed each: 4 were test-expectation bugs (raw vs
    converted values, expansion depth), 1 UX gap (**numeric mode didn't substitute
    constants** → added), 2 from the beam demo's mixed units (N·m ÷ m³ = Pa, not MPa →
    rebuilt the demo in N/mm units so it reads 37.5 MPa).
31. Debug run revealed a **results-shape bug**: renderers got the evaluator wrapper
    `{results, root, contrib}` instead of the map `.results` → fixed consumers in the
    equation renderer, app, inspector, and builder. Also fixed rootForce over-expansion
    and added parentheses around multi-term ×-factor sub-expressions.
32. Added **quiet updates** so typing in inspector fields re-renders the graph/equation
    but never rebuilds the inspector (focus loss).
33. Final state: 28/28 smoke tests PASS; built bundle executes in a VM and evaluates
    the demo to 160,056; preview server serves 200.

## Phase 9 — Capture & ship (this session's closing request)
34. Wrote `AGENT.md` (project memory for future agents) and the `inputs/` folder
    (user brief verbatim, Q&A, decisions, this journey).
35. Rebuilt to emit root `index.html` + `calcgraph.html` (GitHub Pages main/root).
36. Updated README (verify commands, Pages instructions), committed everything with a
    detailed message, and pushed to `origin/main`
    (`https://github.com/ahrar-m/Node-Based-Calculator`).

## Phase 10 — Blank-page bugfix (user report: "page is blank, local and live")
37. Root cause: **`CG.app.init()` was never called** — the bundle loaded all 13 modules but nothing booted the app, so `#app` stayed empty. Smoke tests passed because they never exercised the boot/DOM path.
38. Fix: call `api.init()` at the end of `src/js/13-app.js`; added small `setView`/`setEqTab` API methods so views are switchable/testable.
39. Built `tools/ui-smoke.mjs` — a DOM-stub harness that boots the **actual built `docs/index.html`** and exercises skeleton build, model load, evaluation, selection, drill-down, quiet updates, view switches, builder modal, and constant creation. Caught and fixed stub-fidelity gaps; now **12/12 UI tests pass** with zero exceptions.
40. Re-verified the whole suite (engine 29/29, bundle executes, zero external deps), rebuilt all three outputs, committed and pushed.


## Phase 11 — Agent documentation session (user request)
41. User asked to document clearly that **agents must not read the built HTML files**
    (docs/index.html, index.html, calcgraph.html) to avoid burning tokens, and to capture
    anything else that makes the next session more fruitful.
42. Rewrote AGENT.md: prominent Working Rules for Agents (rule 1: never read built HTML;
    canonical flow edit -> build -> 4 checks -> commit -> push; rebuild-before-UI-test;
    examples as build inputs), Known pitfalls (boot/init, results-map shape, escape
    hazards, PS 5.1), a Session log, and a next-session checklist.
43. Added the same never-read-built-HTML note to the SPEC reading order.
44. Committed and pushed the documentation update.

## Phase 12 — Units, rename, pan, and the visual redesign (user request)

45. **Editable variable names.** Inspector name becomes an input; `app.renameTerm` validates a
    dry-run clone first, then does a token-accurate `renameIdentifiers` pass over every formula,
    group-child list, and the root — so renaming `rent → office_rent` updates the whole model.
46. **User-configured unit system.** New `src/js/06-units.js` module (manifest entry added):
    built-in quantity defaults (Time, Length, Breadth, Area, Volume, Mass, Force, Pressure,
    Energy, Power, Temperature, Angle, Currency, Ratio, Count…), a quantity→symbol picker on
    every term and constant, custom units saved to a **global library** (`calcgraph.units.v1`),
    and a derived-unit hint that walks the formula AST (`N·mm / mm³`) so the units visibly
    "match the formula".
47. **No auto-assigned units/periods.** New models and new terms start with unit `""` and period
    `""` ("— no period —"); nothing is silently set to year/week/month.
48. **Right-click pan + centred fit.** Graph now pans by right/middle-drag (context menu
    suppressed), zooms by wheel, and the fit/zoom controls centre the content bounding box —
    the old fit left-aligned everything.
49. **Deep visual overhaul (max effort on visualisation).** All five `src/styles/` modules
    rewritten: glass header/footer/modals, gradient brand + accents, glowing gradient bezier
    edges with period-factor chips, rich nodes (kind accent bars, ports, unit/period meta),
    dot-grid graph canvas, hierarchical collapsible outline tree, styled range sliders/toasts/
    chips, equation cards with unit chips. Verified boot in real headless Chrome (no console
    errors) and inspected the serialized DOM for correct SVG/equation output.
50. **Latent bug fixed:** graph node values rendered "?" because `layoutGraph` received the
    evaluator wrapper; now passes the results map.
51. Checks: engine smoke 26/26, ui-smoke 31/31 (new rename + units cases), bundle + audit
    clean. Rebuilt all three outputs, committed and pushed.

## Phase 13 — Button-layout audit, "+ New term" fix, and operation docs (user request)

52. **Button-placement audit.** Walked every button in `src/` (header: New model / Import /
    Export JSON; view header: Graph/Equation + equation-mode Combined/All terms/Expand all/
    Collapse all/Numbers = up to 7 buttons; sidebar: + New term, demos, constants, units;
    inspector: delete / edit / make-root / slider / add-child; modals; graph zoom). Findings:
    (a) header controls crowd below ~960 px with **no wrap**; (b) the equation view-header had
    **no wrapping** for its 7-button cluster; (c) sidebar action rows were packed at 6 px gaps;
    (d) the floating graph hint could overlap the zoom stack on narrow windows.
53. **CSS fixes** in `src/styles/layout.css` + `graph.css`: `#app` rows become auto-height so the
    header/footer can wrap (min-heights preserved), `.view-header` wraps its button cluster,
    sidebar rows relax to 8 px and the new-term row gets breathing room, responsive
    breakpoints at 1120/960/820 px shrink the workspace columns and header controls, and the
    graph hint hides ≤700 px.
54. **"+ New term" bug (user report: the button adds nothing).** Root cause: `openNewTerm`
    called `CG.units.renderUnitPicker(app(), …)` — inside that module `app` is the API
    **object**, so calling it as a function threw `TypeError: app is not a function` before
    `document.body.appendChild(backdrop)` ran. The modal never opened — the click silently
    did nothing. Fix: pass `app` (one character).
55. **Regression coverage.** Extended `tools/ui-smoke.mjs`: clicks the actual "+ New term"
    sidebar button, asserts the modal appears, fills name + formula, clicks Create, and
    verifies the term landed in the model (ui-smoke 37 checks — 6 new).
56. **README rewrite.** Added "What the tool provides" (feature table), "How to operate"
    (12-step guide + graph gesture cheat-sheet), and "What to look out for" (user-facing
    pitfalls: local-only autosave, identifier names, global rename without undo, period
    multiplication, groups-have-no-formula, cycle guard, AI import schema, built-HTML rule,
    v1 math scope).
57. **AGENT.md update.** New working rule 7: every session agent must keep the session
    to-do list updated after every single task, and refresh it at session start. Session log,
    test counts, and next-session checklist updated accordingly.
58. Rebuilt all three outputs; engine 26/26, ui-smoke 37/37, bundle + audit clean; committed
    and pushed.
59. **Follow-up (same session):** the user asked that AGENT.md always instruct session agents
    to ask the user **as many clarifying questions as needed** to understand any request before
    acting. Added working rule 8 ("Ask first") referencing the 11-question discovery round as
    the house style, made asking questions step 2 of the next-session checklist, and recorded
    the Q&A-verbatim convention in `inputs/`. Committed and pushed.

---
*Append new phases here in later sessions so the history stays complete.*

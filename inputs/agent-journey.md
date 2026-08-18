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

---
*Append new phases here in later sessions so the history stays complete.*

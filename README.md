# Node-Based Calculator — CalcGraph

**Equation-first formula modeler:** write (or let an AI write) named equations; the app auto-generates a connected node-graph view **and** an expandable combined equation for the whole structure. Unlimited drill-down groups, constant libraries with sliders, JSON import/export — all in one standalone HTML file, fully offline, zero dependencies.

---

## What the tool provides

| Area | What you get |
|---|---|
| **Model** | One project = one model with a single **root term** (the final answer). Every model auto-saves to this browser. |
| **Terms** | Three kinds: **value** (a plain number), **formula** (an equation built from other terms/constants), **group** (a bucket that sums its child terms). Unlimited nesting: a formula can use a group, a group can contain groups. |
| **Graph view** (centre) | Your model drawn as connected blocks with wires — click any block to inspect it, double-click a group to dive in (breadcrumbs at the top take you back), right-drag to **pan**, wheel to **zoom**, buttons at the bottom-right to zoom in / out / **fit** (centre). |
| **Equation view** (centre) | The *complete combined equation* of the whole model, auto-derived. Click a name to select it, double-click to expand/collapse that part. Toggle **Numbers** for real values, **All terms** for every term listed, **Expand all / Collapse all**. |
| **Outline tree** (left sidebar) | Hierarchical list of every term with its live value; click to select, click the ▸/▾ caret to collapse groups. Below it: **+ New term**, demo buttons, and the project/global constant libraries with a global unit library. |
| **Inspector** (right sidebar) | Click any term → edit its **name** (formulas reference terms by id, so renaming is always safe — no formula rewriting), value/formula, description, **unit**, **period**, **slider**, and **snapshots**. |
| **Formula builder** | In the Inspector, **✎ Edit formula** opens a builder: click operator/function/name/constant chips (they insert at your cursor), live parse status + preview value, and a "how this attaches into the main formula" chain. |
| **Constant libraries** | **Project constants** (per model) and a **global library** (shared by all models). Each constant can have a slider (min/max/step) and saved snapshot values. |
| **Units** | Pick a quantity (Time, Length, Force, Pressure, Currency…) then a symbol for any term or constant. Custom units are saved to a global library. For formulas, a hint shows the *derived* unit (e.g. `N·mm / mm³`) so you can check the formula matches the unit. |
| **Periods** | Tag a term as per **week / month / year** and the combined equation converts automatically (e.g. a monthly rent appears as `× 12` in an annual total). Nothing is assigned for you — periods start as "— no period —". |
| **Import / Export** | **Import** (header): paste AI-generated JSON or upload a `.model.json` file — validated before opening. **Export JSON**: download the current model. Demos: load the built-in *expenses* and *beam design* samples. |
| **Saved models** | The top-left header select switches between your browser-saved models; "✓ saved" confirms autosave. |

---

## How to operate (step-by-step)

1. **Open the app** — the live URL, `calcgraph.html`, or `docs/index.html`. A demo model loads automatically so you can explore.
2. **Look around the three regions** — left sidebar (models, outline, constants), centre (graph / equation), right inspector (click any block to fill it).
3. **Start a new model** — header → **New model** → name it and give the root term a name. The root is the single final answer of the whole thing.
4. **Add terms** — left sidebar → **+ New term**. Give it a name (letters/digits/underscore — no spaces), choose a kind, and fill the kind-specific field:
   - *value* → a number
   - *formula* → type it directly (or create it later with the formula builder)
   - *group* → click child chips to choose which terms this bucket sums
   Names may contain spaces (e.g. `Office Rent`) — reference them in formulas as `"Office Rent"`. Unit and period are optional — leave them empty unless you need them.
5. **Build formulas visually** — click the term in the outline or graph → right inspector → **✎ Edit formula** → click **OPERATORS / FUNCTIONS / YOUR TERMS / CONSTANTS** chips to insert tokens at the cursor; the preview updates as you type; **Save formula** when it parses.
6. **Wire it together** — a formula referencing `rent` automatically draws a wire from the `rent` block to its parent. Groups sum their children (add/remove children in the inspector, or via **+ Add child**).
7. **Reusable numbers** — constants sections in the sidebar: **+ Add project constant** (this model only) or **+ Add global constant** (every model). Give them a name, value, optional unit, slider, and snapshots; use the constant's name inside any formula.
8. **Check units & periods** — pick quantity → symbol on a term; for a formula check the derived-unit hint matches. Set a period to make the combined equation convert (weekly ×52, monthly ×12, yearly ×1).
9. **Play "what-if"** — select a term and add a **slider** (min/max/step) to scrub values; save snapshots (label = value) and click one to jump straight to that scenario.
10. **Watch the combined equation** — switch to **Equation** view. It always shows the entire structure; click names to highlight, double-click to expand/collapse. Toggle **Numbers** to see actual values.
11. **Let an AI generate a model** — copy the prompt template from [docs/AI_PROMPT.md](docs/AI_PROMPT.md), paste the AI's JSON into **Import → Paste JSON**, validate, and it opens as a fully wired model.
12. **Save / share** — everything auto-saves locally (watch "✓ saved"). **Export JSON** for a portable file; share the `calcgraph.html` link — the person you share it with gets the same app on their browser.

### Graph gestures (cheat-sheet)
- **Click** any block → inspect in the right sidebar
- **Double-click** a group → dive in (breadcrumb at top: click to jump back; **← out** button leaves the group)
- **Right-drag** (or middle-drag) → pan · **Wheel** → zoom · **⨂** button → fit/centre

---

## What to look out for

- **Autosave is local to the browser.** Models live in `localStorage` of *this* browser only. Clearing site data or using another browser loses them — **export JSON** for anything important.
- **Names may contain spaces.** Terms, constants, groups, and model names can all have spaces (`Office Rent`, `Total Expenses`). Inside a formula, reference a spaced name in double quotes: `"Office Rent" + "Internet"`. Names without spaces can be used unquoted, exactly as before (`rent + utilities`).
- **Internally, formulas reference terms by stable id.** The display always shows the human names; renaming a term is a pure label change and can never break a formula. Exported JSON is written back in readable, name-based form so any AI can still read it.
- **No undo/redo yet** for edits. Delete is destructive (confirmed with a prompt).
- **Periods multiply.** A weekly value in a yearly total counts `× 52`, monthly `× 12`. Nothing is auto-assigned — unset periods count as "once".
- **Groups have no formulas** — they are always the sum of their children.
- **Cycle guard.** Formulas/groups that reference each other in a loop are rejected with a clear error.
- **AI imports must follow the schema** in [docs/MODEL_FORMAT.md](docs/MODEL_FORMAT.md). Use the exact prompt in [docs/AI_PROMPT.md](docs/AI_PROMPT.md) to get valid JSON; bad imports are refused with the reason listed.
- **Import file names become the model name.** Uploading `My Business Expenses.model.json` whose JSON has no `name` names the model `My Business Expenses` — spaces included. Exported files keep clean, sanitised filenames.
- **Spaced names demo.** The sidebar's **Demo: spaced names** button loads an expenses model where every name contains spaces (`Office Rent`, `Total Expenses`, `Tax Rate`) to show the whole names-with-spaces pipeline.
- **The built HTML files are generated.** `docs/index.html`, `index.html`, `calcgraph.html` are outputs of `node build.mjs` — hand-editing them is overwritten on the next build. To change behavior, edit `src/` and rebuild.
- **Slider limits** are what you set them to — the inspector slider only spans its saved min/max/step.
- **Unsupported math** for now: no trig/log/statistics functions (v1 scope is arithmetic + sum/min/max/avg/round/if/abs + comparisons).

---

## Verify (engine tests)
```bash
node tools/smoke.mjs     # headless engine tests (parse, eval, periods, equations, validation)
node tools/ui-smoke.mjs  # boots the BUILT bundle; UI flows incl. new-term modal
node tools/bundle-check.mjs  # executes the BUILT bundle from docs/index.html
node tools/audit.mjs     # confirms zero external dependencies
```

## Quick start
```bash
node build.mjs       # join src/ modules -> docs/index.html, index.html, calcgraph.html
npm run serve        # or: node tools/serve.mjs  → http://localhost:8080
```
No npm install needed (zero dependencies).

## Architecture (why sources stay separate)
Every piece lives as its own small, human-readable file in `src/` (HTML shell, 5 CSS modules, 14 small JS modules). `build.mjs` reads `src/manifest.json` and **joins them** into dependency-free standalone HTML. When you want AI assistance later, point it at the `src/` files directly — never the bundle.

```
src/
  index.html          # shell (template)
  manifest.json       # module order used by build.mjs
  styles/             # base, layout, components, graph, equation
  js/                 # model, parser, evaluate, equation, layout, graph, units,
                      # inspector, builder, libraries, storage, import, demos, app
examples/             # *.model.json — also injected into the app as demos
build.mjs             # the joiner script
docs/index.html       # the built standalone app
```

## Deploy to GitHub Pages
1. Pages is configured on **main branch at the repo root** (Settings → Pages → Deploy from a branch → `main` → `/ (root)`). The build commits the app directly as root `index.html` (and a shareable `calcgraph.html`):
   - `https://<user>.github.io/<repo>/` → the app
   - `https://<user>.github.io/<repo>/calcgraph.html` → shareable, properly-named copy
2. Just push to `main` — Pages publishes automatically. (An optional [workflow](.github/workflows/deploy.yml) also mirrors to a `gh-pages` branch; delete it if you don't need the mirror.)

## Project memory & history
- 🤖 [AGENT.md](AGENT.md) — what any future agent should read before touching code
- 📥 [inputs/](inputs/) — everything the user provided: verbatim brief, Q&A, decisions, build journey

## Docs
- 📐 [Product & architecture spec](docs/SPEC.md)
- 🗂️ [Model JSON format](docs/MODEL_FORMAT.md)
- 🤖 [AI prompt template](docs/AI_PROMPT.md)
- 💼 [Expenses example](examples/business-expenses.model.json) · 🏗️ [Beam design example](examples/beam-design.model.json)
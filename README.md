# Node-Based Calculator — CalcGraph

**Equation-first formula modeler:** write (or let an AI write) named equations; the app auto-generates a connected node-graph view **and** an expandable combined equation for the whole structure. Unlimited drill-down groups, constant libraries with sliders, JSON import/export — all in one standalone HTML file.

## Feature summary
- 🧩 **Equation builder UI** — add term names, pick operators/functions from buttons, live parse + value preview, see how each piece attaches into the main formula
- 🔗 **Auto-generated graph view** — departments as blocks, glowing wires drawn for you; click to inspect, double-click groups to dive in, **right-drag to pan**, wheel to zoom, one-click centred **fit**
- ✏️ **Rename any variable** — edit a term's name and every formula/group/root reference updates automatically
- 📏 **Per-variable units** — pick a quantity (Time, Length, Breadth, Area, Volume, Force, Pressure, Currency…) then a symbol for every term and constant; **custom units saved to a global library**. Formula terms show a derived-unit hint (e.g. `N·mm / mm³`). Nothing is auto-assigned.
- 🧮 **Expandable combined equation** — substitute and collapse any term, toggle numeric substitution
- 📚 **Constant libraries** — per-project and global, with sliders (min/max/step) and saved snapshots
- 🤖 **AI-ready import** — paste any AI's JSON output, or load a file; model format + prompt template in [docs/AI_PROMPT.md](docs/AI_PROMPT.md)
- 💾 **Browser autosave + JSON export/import**, fully offline

## Verify (engine tests)
```bash
node tools/smoke.mjs     # 28 headless engine tests (parse, eval, periods, equations, validation)
node tools/bundle-check.mjs  # executes the BUILT bundle from docs/index.html
```

## Quick start
```bash
node build.mjs       # join src/ modules -> docs/index.html (one standalone file)
npm run serve        # or: node tools/serve.mjs  → http://localhost:8080
```
Open `docs/index.html` directly, or use the dev server. No npm install needed (zero dependencies).

## Architecture (why sources stay separate)
Every piece lives as its own small, human-readable file in `src/` (HTML shell, CSS modules, 13 small JS modules). `build.mjs` reads `src/manifest.json` and **joins them** into one dependency-free `docs/index.html`. When you want AI assistance later, point it at the `src/` files directly — not the bundle.

```
src/
  index.html          # shell (template)
  manifest.json       # module order used by build.mjs
  styles/             # 01-base, 02-layout, 03-components, 04-graph, 05-equation
  js/                 # model, parser, evaluate, equation, layout, graph, units,
                      # inspector, builder, libraries, storage, import, demos, app
examples/             # *.model.json — also injected into the app as demos
build.mjs             # the joiner script
docs/index.html       # the built standalone app (deployed to GitHub Pages)
```

## Deploy to GitHub Pages
1. Pages is configured on **main branch at the repo root** (Settings → Pages → Deploy from a branch → `main` → `/ (root)`). Because of that, the build commits the app directly as root `index.html` (and a shareable `calcgraph.html`):
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
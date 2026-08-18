# decisions.md — decisions locked in during the session

Chronological record of what was decided, in the user's words where possible, and the
consequences for the build.

## D1 — Approach B: equations first, graph auto-generated
The user asked whether a node-based system was the right approach at all. After the agent
compared five approaches, the user confirmed **"B — Equations first, graph auto-generated
(Recommended)"**.
**Consequence:** users type (or AI writes) named formulas; the app parses them, draws the
blocks/wires automatically, and derives the combined equation from the model itself.

## D2 — Build the complete app now (no separate prototype round)
User: "Build the complete web application… Build the tool now." No prototype-first step.

## D3 — User-friendly formula input is a first-class requirement
User: "make sure that it is very easy for the user to Input the formulas… allow him to add
names and provide the operators that are used for the formulas And how it gets attached to
the main formula… make it very interactive and also make it very simple to understand and
operate." → The interactive formula builder (chips for names/operators/functions, live
parse + preview value, "how this attaches into the main formula" chain) exists because of this.

## D4 — Separate source modules joined by a script into ONE standalone HTML
User: "all the individual components that are going into the final HTML are kept separate
and some kind of a script runs and then joins all of these together… final file in
stand alone html format… it'll go through the source files directly."
**Consequence:** `src/` holds 5 CSS + 13 JS modules + a shell; `build.mjs` joins them
(zero dependencies) into a single HTML file; AI editing happens on `src/` only.

## D5 — Deploy to GitHub Pages; Pages on main branch at root
User: "this has to be directly deployed to Github pages I can always take a look from the
link" — then later: "I have enabled Github pages On the main branch at root directory."
**Consequence:** `index.html` (root, served at the Pages URL) and a shareable, properly
named `calcgraph.html` (root, served at /calcgraph.html) are committed; `docs/index.html`
is kept as the build/gh-pages-mirror copy.

## D6 — First version scope (from the discovery Q&A)
- Personal, single-user web app; browser storage + JSON export/import.
- Basic arithmetic engine + sum/min/max/avg/round/if/abs + comparisons + period helpers.
- Unlimited nesting; numbers AND expandable combined equation, both central.
- Project + global constant libraries (browser-stored, exported with the model).
- Sliders with user-defined min/max/step + saved single-click snapshots.
- AI-generated models accepted; prompt template + strict JSON validation.
- Dynamic layouts (click any node to see what it can do) — no fixed layouts.

## D7 — Working name: CalcGraph
The user deferred the name to the approach decision ("Depends on the first questions
answer"); after Approach B was chosen the agent proposed CalcGraph. Rename anytime —
it appears in `src/index.html` (title), `README.md`, `AGENT.md`, and the header logo.

## D8 — Demo models: both
User chose "Both, as importable samples" for the P1 demo content → business-expenses and
beam-design models are embedded in the app and shipped as `examples/*.model.json`.

## D9 — Names may contain spaces; internal references are id-based (session 6)
The user asked for the tool to work with "formula names and file names that includes spaces",
and chose (via clarifying Q&A): **terms AND constants may contain spaces**; **file names with
spaces accepted everywhere, and an uploaded file's name becomes the model name** when the JSON
has none; and a custom design: **the back end references terms/constants by stable id while
the UI displays the human names with spaces**.
**Consequence:** formulas are stored and evaluated in a compiled id-based form (`\u0060t-rent\u0060`
refs); display, typing, import and export work in name form (spaced names quoted as
`"Office Rent"` in formula text); renaming a term is a pure label change; export JSON stays
name-based so AI tools can still read it.

---
*If a later session changes any decision, add a new D-entry above the old one's date and
mark the old one superseded.*
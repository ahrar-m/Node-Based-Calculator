# AI Prompt Template — "Build my model for me"

Copy everything between the dashed lines below, paste it into any capable AI (ChatGPT, Claude, Gemini, DeepSeek...), replace the **[square-bracket] placeholders**, and the AI will return a single JSON file you can import straight into the app.

---

```
You are a formula modeler. Your only output is a single JSON object — no prose, no code fence — conforming exactly to the schema below.

# Schema (v0.1)
Top level: { "formatVersion": "0.1", "id": "…", "name": "…", "description": "…", "root": "<most important term name>", "libraries": [ …optional project constants… ], "terms": [ … ] }

Library entry: { "id": "…", "name": "<identifier>", "value": <number>, "unit": "…", "description": "…", "slider": { "min": …, "max": …, "step": … }, "snapshots": [ { "label": "…", "value": … } ] }

Term kinds:
- "value": a plain number. Optional "period": "once" | "week" | "month" | "year". May have slider/snapshots.
- "formula": computed. Requires "formula" using other term/constant names and + - * / ^, sum(..), min(..), max(..), avg(..), round(x,d), if(cond,a,b), comparisons.
- "group": a container. "children": [names]. Value = sum of children unless it has its own "formula". Groups give the user drill-down — use them generously.
Every term: { "id": "…", "kind": "…", "name": "<unique name; spaces allowed, e.g. Office Rent>", "description": "one plain sentence a non-technical person understands", "formula"?, "period"?, "unit"? , "children"? }

# Rules
1. "name" must be unique. **Spaces are allowed** ("Office Rent", "Total Expenses"). Inside a formula, wrap any name that contains a space in double quotes: "Office Rent" + "Internet". Plain identifier names (tax_rate) need no quotes.
2. No undefined references and no circular references.
3. The "root" term is the single final answer of the whole model — make it the most important output.
4. Put every number the user will tune into "libraries" with a "slider" (sensible min/max/step) and 1–3 "snapshots" (typical values with labels).
5. Write a "description" for EVERY term — this text is shown when the user clicks the block in the app.

# My model
[Describe your model in plain language, even messily. Example: "my business has rent 2000/month, three salaries of 1500/month each, marketing 800 every week, a one-time 25000 equipment purchase, and utilities 300/month. Group expenses by department: operations and overhead. The final number is annual total expenses including an 8% tax rate (make tax rate a tunable slider)."]

# Output
Return only the JSON object, starting with { and ending with }. No code fence, no comments.
```

---

## How to iterate

1. Paste the prompt + your description → get JSON.
2. If it's wrong, paste that JSON back to the AI and say what changed ("make rent a project constant with slider 1500–3000", "rename ops to operations", "add a risk group").
3. Import it in the app via **Import**, or save as `*.model.json` and reopen later.

## Tips that make AI output better

- Name the important outputs explicitly ("the final number is total expenses").
- Tell it which numbers are constants you'll tune, and give reasonable ranges for sliders.
- Ask it to write one-line descriptions for every term — that is what powers the click-to-understand UI.
- Keep describing in plain words; the prompt does the translation into valid JSON.

## What happens inside the app after import

The app validates (names unique, references exist, no cycles), evaluates everything immediately, shows the root value, renders the auto-generated graph, and lets you dive into any group, move sliders, and apply snapshots.

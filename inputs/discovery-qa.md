# discovery-qa.md — the questions asked and the answers given

The very first step of the project was a structured discovery round: the agent asked the
user 11 questions (with recommended options) to pin down what "a calculator operated with
equations" meant to them. The exact question text and the user's exact answers follow.

---

## Q1 — Platform
> Where should this calculator live?

**Answer:** "Web app in browser (Recommended)" — *"Easiest to build, shareable, no install; works everywhere"*

## Q2 — Primary Use Case
> Which use case should we design around first? (It shapes the whole UI)

**Answer:** "Both equally — general formula workspace" — *not specialized; a flexible equation workbench*

## Q3 — Users & Sharing
> How many people will use it, and do they need to share models?

**Answer:** "Just me (personal)" — *simplest; no accounts or permissions needed*

## Q4 — Math Capabilities (multi-select)
> Besides + − × ÷ and sums, what should the equation engine support?

**Answer:** "Basic arithmetic only" — *keep it simple for the first version*

## Q5 — The Combined Equation
> How central is the literal 'combined equation' text output to the product?

**Answer:** "Central — numbers AND expandable equation (Recommended)" — *you always see the computed result, and the full symbolic equation with clickable/expandable terms*

## Q6 — Drill-Down Depth
> How deep should nesting / drill-down go?

**Answer:** "Unlimited nesting (Recommended)" — *any node can contain a full sub-model, recursively*

## Q7 — Constants Management
> How do you want to manage constants (material properties, tax rates, salaries...)?

**Answer (custom):** "How the user create some kind of project and a library specific to that project To be available Also a global library Also have an option to store the data in the browser and also an export option"

## Q8 — Data Sources (multi-select)
> Where do the numbers come from?

**Answer (custom):** "Provide an option such that I can generate Everything that I want to visualise with the help of an AI And ai generates a document that can be directly imported into the tool I also want to have the prompt That I have to give to AI so that it does the job"
*(the multi-select value "Manual entry in nodes" was also selected)*

## Q9 — What-If / Scenarios
> Do you need to try variations ("what if salaries rise 10%?")?

**Answer (custom):** "Allow the sliders and allow myself to provide the limits of these sliders And also allow a particular value that can be saved For the slider So that I can just click it The equation takes that value instead"

## Q10 — Exports & Outputs (multi-select)
> What outputs do you need beyond the on-screen result?

**Answer (custom):** "I wanted Json export feature so that I can save Panda import the saved file later I also want some options so that I'm able to share this with somebody with visually aesthetic And also allows them to understand each and every parameter So fixed layouts probably will not work I want something that is dynamic that a user clicks he can see what exactly Every node is capable of"

## Q11 — Familiarity
> Have you used node-based tools before (Blender nodes, Grasshopper, Node-RED, n8n)?

**Answer (custom):** "I have no experience with nodes So before actually proceeding with all the questions that I have provided help me understand if node is actually the right approach or is there anything else that can be much better helpful and much closer fixed what I am looking for"

## Follow-up decision round (after the approach comparison)

The agent presented five approaches (node graph drawing / equations-with-generated-graph /
spreadsheet / notebook / code DSL) and asked for a final decision plus a prototype
preference. The user's full answers:

- **Approach choice:** "B — Equations first, graph auto-generated (Recommended)"
- **Prototype preference (custom):** "Build the complete web application…" (full text in
  [user-brief.md](user-brief.md), §4)

---
*Formatting note: option descriptions in quotes are the descriptions the user saw in the UI.*

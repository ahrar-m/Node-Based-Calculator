# inputs/ — everything the user provided

This folder is the **voice-of-the-user record** for the Node-Based Calculator (CalcGraph)
project. It captures, in the user's own words, what was asked, every question the agent
asked, the exact answers given, the decisions made, and the path the agent took to
complete the work. Treat these files as truth: if a code comment disagrees with user
intent here, the user's words win.

| File | What it contains |
|---|---|
| [user-brief.md](user-brief.md) | The user's original brief + follow-up messages, verbatim |
| [discovery-qa.md](discovery-qa.md) | The 11 discovery questions and the user's exact answers |
| [decisions.md](decisions.md) | Every decision locked in during the session |
| [agent-journey.md](agent-journey.md) | The numbered path the agent took to complete the prompts |

Related: [AGENT.md](../AGENT.md) is the compressed project memory for future agents;
[docs/](../docs/) holds the design documents produced from these inputs.

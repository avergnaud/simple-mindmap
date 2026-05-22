# Step 1 — Extract a subgraph from input text

## Goal

Using the Claude skill (via Claude Code), take a text input and produce a structured subgraph (nodes + edges) as a JSON file.

This is the foundational building block: turning raw text into a DAG fragment.

## What the skill must do

1. The user provides text — either pasted directly, or as a file path from the input material folder (configured in `config.json`).
2. Extract key concepts as **nodes**. Each node has:
   - `id`: a new UUID
   - `title`: short label (a few words)
   - `synonyms`: a list of **1 to 5** alternative names / abbreviations / phrasings for the title. Use the input text itself as context to generate relevant synonyms. For example if the text mentions "NIST RMF", synonyms should include "NIST Risk Management Framework", "Risk Management Framework", "RMF", etc.
   - `description`: optional, a one-sentence summary if the text provides enough context
3. Organize concepts hierarchically and produce **edges**. Each edge has:
   - `source`: parent node id
   - `target`: child node id
   - `type`: `"contains"` for hierarchical relationships, `"relates to"` or `"implies"` when appropriate
   - `description`: optional
   - `primary`: `true` (all edges in a freshly extracted subgraph are primary)
4. The subgraph must have a single root node (the top-level concept).
5. Write the output as a JSON file: `{ "nodes": [...], "edges": [...] }` in the `data/` folder (e.g. `data/subgraph_<timestamp>.json`).

## Constraints

- The extraction is a **semantic** task — Claude (via the skill) does the thinking. No heuristic Python parsing.
- The script does NOT read or write `nodes.json` / `edges.json`. It only produces the extracted subgraph as a separate JSON file.
- No Claude API calls from code. The intelligence comes from Claude Code executing the skill.

## Test

Run the skill with a small sample text (e.g. a section from the input material folder) and verify the output is valid JSON matching the data model in `SPECIFICATIONS.v2.md`.

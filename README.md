# DAG KB

A personal knowledge management tool built around a DAG (knowledge graph). Intelligence comes from Claude Code skills; the webapp handles manual CRUD.

---

## Setup

```json
// config.json
{
  "input_material_dir": "<absolute or relative path to your notes folder>"
}
```

---

## Skills

Skills are run via Claude Code in your terminal.

### `/extract-subgraph`

Extracts key concepts from a text and writes a structured subgraph to `data/subgraph_<timestamp>.json`. The output is a DAG fragment — not yet merged into the main graph.

**How to invoke:**

1. Open Claude Code in the project directory.
2. Type `/extract-subgraph`.
3. When prompted, either:
   - **Paste text** directly, or
   - **Provide a file path** relative to `input_material_dir` (e.g. `2. Part I - Security and Risk Management/2. Chapter 2 - Risk Management/1. Risk Management Concepts/1. Holistic Risk Management.md`)

**What you get:**

A JSON file at `data/subgraph_<timestamp>.json`:

```json
{
  "nodes": [
    {
      "id": "<uuid>",
      "title": "Risk Appetite",
      "synonyms": ["Risk Tolerance", "Acceptable Risk Level", ...],
      "description": "The amount of risk an organization is willing to accept."
    }
  ],
  "edges": [
    {
      "source": "<parent-uuid>",
      "target": "<child-uuid>",
      "type": "contains",
      "primary": true
    }
  ]
}
```

Each node gets exactly 10 synonyms generated from the input text — used later for matching when merging into the main graph.

---

## Data files

| File | Description |
|---|---|
| `data/nodes.json` | All nodes in the main DAG |
| `data/edges.json` | All edges in the main DAG |
| `data/subgraph_*.json` | Extracted subgraphs, not yet merged |
| `config.json` | Project configuration |

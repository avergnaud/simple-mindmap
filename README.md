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

## Workflow

### 1. Extract a subgraph — `/extract-subgraph`

Run the skill in Claude Code on a section of your notes. It produces a snapshot file `data/subgraph_<timestamp>.json` containing extracted nodes and edges. Nothing in the main graph is touched yet.

### 2. Review (optional)

Open the snapshot file and check the extracted concepts. Edit titles, synonyms, or descriptions directly in the JSON if needed.

### 3. Merge into the DAG — `/merge-subgraph`

Run the skill in Claude Code. It compares the subgraph's nodes against `data/nodes.json` using synonym matching, reuses existing nodes where there is a match, creates new ones otherwise, and asks you where to attach the subgraph root. The result is appended into `data/nodes.json` and `data/edges.json`. The subgraph files are deleted on success.

### 4. Browse and edit — webapp

Start the webapp (`node server.js`, then open `http://localhost:3000`) to view the live graph as an indented list. From there you can add child nodes manually, copy a node ID to reference it in a skill, or delete a node and its entire subtree.

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

Each node gets 1 to 5 synonyms generated from the input text — used later for matching when merging into the main graph.

### `/merge-subgraph`

Merges a `data/subgraph_*` pair into the main DAG using synonym-based deduplication.

**How to invoke:**

1. Open Claude Code in the project directory.
2. Type `/merge-subgraph`.
3. If multiple subgraphs exist, choose which to merge.
4. When prompted, paste the ID of the existing node that should be the parent of the subgraph root (copy it from the webapp or from `data/nodes.json`).

**What happens:**

- **Synonym matching**: each subgraph node is compared against all existing nodes (title and synonyms, case-insensitive). Matching nodes are reused; non-matching nodes are added as new.
- **Edge remapping**: all subgraph edges are rewritten with resolved IDs. Self-loops and duplicates are dropped.
- **Attachment edge**: a `"contains"` primary edge is added from the chosen parent to the subgraph root.
- **Cleanup**: the `data/subgraph_<timestamp>_nodes.json` and `_edges.json` files are deleted after a successful merge.

**What you get:**

A report: how many nodes were new vs matched, how many edges were added, and the attachment point.

---

## Data files

| File | Description |
|---|---|
| `data/nodes.json` | All nodes in the main DAG |
| `data/edges.json` | All edges in the main DAG |
| `data/subgraph_*_nodes.json` | Extracted subgraph nodes, not yet merged |
| `data/subgraph_*_edges.json` | Extracted subgraph edges, not yet merged |
| `config.json` | Project configuration |

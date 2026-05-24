# Skill: extract-subgraph

Extract key concepts from input text and produce a structured subgraph JSON file (`data/subgraph_<timestamp>.json`).

---

## Step 1 — Read configuration

Read `config.json` from the project root. Note the `input_material_dir` path.

## Step 2 — Collect input

Ask the user:

> Paste the text to extract, or provide a file path relative to the input material folder.

- **File path given**: read the file at `<input_material_dir>/<path>` using the Read tool.
- **Text pasted**: use it directly.

## Step 3 — Generate UUIDs and timestamp

Before extracting, generate one UUID per node you plan to create, plus the output timestamp.

Use the Bash tool:
```bash
node -e "
const crypto = require('crypto');
const ts = new Date().toISOString().slice(0,19).replace(/[T:]/g, '-');
// Print timestamp first, then N UUIDs (adjust N to match your node count)
console.log(ts);
for (let i = 0; i < 20; i++) console.log(crypto.randomUUID());
"
```

Generate more UUIDs than you think you need; unused ones are discarded.

## Step 4 — Extract nodes (semantic analysis)

Analyze the text and identify the key concepts. For each concept, produce a node:

| Field | Rules |
|---|---|
| `id` | One of the pre-generated UUIDs |
| `title` | Short label, 2–6 words. If the source text explicitly numbers items using a keyword such as "Domain", "Step", "Stage", "Phase", "Layer", or "Level", include that prefix: e.g. `Domain 1 - Security and Risk Management`. |
| `synonyms` | **1 to 5** alternative names, abbreviations, or phrasings. Use context from the input text (e.g. if the text says "NIST RMF", include both "NIST Risk Management Framework" and "RMF"). |
| `description` | One-sentence summary. Omit the field if the text doesn't provide enough context. |

Rules:
- Prefer concepts explicitly named in the text over inferred ones.
- Granularity: aim for 5–20 nodes for a typical section of text.

## Step 5 — Build edges (hierarchy)

Organize the nodes into a hierarchy that reflects the structure of the content. Produce edges:

| Field | Rules |
|---|---|
| `source` | Parent node `id` |
| `target` | Child node `id` |
| `type` | `"contains"` for parent→child hierarchy; `"relates to"` or `"implies"` when the content explicitly states a relationship that isn't containment |
| `description` | Optional; include only when the relationship type alone is ambiguous |
| `primary` | `true` for the single parent edge of each non-root node; `false` for additional `contains` edges from secondary parents |

### Parent–child rule (subsumption)

When the source text states that one concept is subsumed by another, emit a `contains` edge from the **more general** concept (parent) to the **more specific** one (child). Two flavors of subsumption trigger this rule:

- **Classification (is-a)**: "A is a B", "A is an B", "A is a type of B", "A is a kind of B", "A is an instance of B", "A is a form of B" → edge `B → A`, type `"contains"`.
- **Part-whole / membership**: "A is a member of B", "A is part of B", "A belongs to B" → edge `B → A`, type `"contains"`.

A node may receive multiple `contains` edges if the text places it under several parents. Mark exactly one of them `primary: true` (prefer the classification "is a" parent when both flavors apply; otherwise prefer the first one stated in the source text). The others use `primary: false`.

Relationships that are *not* subsumption (e.g. "depends on", "causes", "implies", "references") remain `"relates to"` / `"implies"` edges with `primary: true` only when they are the node's sole incoming edge.

### Constraints

- The subgraph must have **exactly one root node** (a node that is not the `target` of any edge). If the input naturally produces multiple top-level concepts with no shared parent, note this in the Step 7 report so the user can decide whether to restructure the input or accept multiple roots.
- No cycles.
- Every non-root node must have exactly one incoming edge marked `primary: true`.

## Step 6 — Write output

Use the timestamp from Step 3. Write two files:

```
data/subgraph_<timestamp>_nodes.json
data/subgraph_<timestamp>_edges.json
```

Each file is a plain JSON array.

`subgraph_<timestamp>_nodes.json`:
```json
[
  {
    "id": "<uuid>",
    "title": "...",
    "synonyms": ["...", "...", "..."],
    "description": "..."
  }
]
```

`subgraph_<timestamp>_edges.json`:
```json
[
  {
    "source": "<uuid>",
    "target": "<uuid>",
    "type": "contains",
    "primary": true
  }
]
```

## Step 7 — Report to user

Tell the user:
- Output files: `data/subgraph_<timestamp>_nodes.json` and `data/subgraph_<timestamp>_edges.json`
- Root node title
- Node count and edge count
- A brief summary of the top-level structure (root → direct children)

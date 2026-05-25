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
| `types` | List of one or more values from `descriptive`, `prescriptive`, `meta`, `illustrative`. Default: `["descriptive"]`. Selection rules below. |

### Type selection rules

- **Default**: every node starts with `["descriptive"]`.
- Add `"prescriptive"` when the source text frames the node as a rule, requirement, obligation, recommendation, prohibition, or norm. Triggers: "must", "shall", "should", "is required to", "is forbidden to", "policy states", explicit standards clauses (e.g. "ISO 27001 A.8.1 requires…").
- Add `"meta"` when the node is a statement *about* another proposition (e.g. classifying it, scoping it, commenting on its status). Most nodes will NOT be meta — only mark this when the node's content is genuinely a proposition-about-a-proposition.
- Add `"illustrative"` when the node is an example or instance used to illustrate a more general parent node (rather than a general concept in its own right).
- A node may legitimately carry multiple types (e.g. `["descriptive", "illustrative"]` for a worked example that is also a factual claim).

Rules:
- Prefer concepts explicitly named in the text over inferred ones.
- Granularity: aim for 5–20 nodes for a typical section of text.

## Step 5 — Build edges (hierarchy)

Organize the nodes into a hierarchy that reflects the structure of the content. Produce edges:

| Field | Rules |
|---|---|
| `source` | Parent node `id` |
| `target` | Child node `id` |
| `type` | One of `"contains"`, `"states"`, `"implies"`, `"relates to"`. See edge type selection below. |
| `description` | Optional; include only when the relationship type alone is ambiguous, when the relationship is negated (e.g. "does not prescribe"), or when a qualifier is needed (e.g. "in some cases"). |
| `primary` | `true` for the single parent edge of each non-root node; `false` for additional edges from secondary parents |

### Edge type selection (try in order — first match wins)

The four edge types are **mutually exclusive** and must be evaluated in the following strict order. Stop at the first one that matches; do not "shop around" for a better fit.

#### 1. `contains` — subsumption (is-a / part-of)

Use when the source text places the child concept *inside* the parent concept. Two flavors:

- **Classification (is-a)**: "A is a B", "A is an B", "A is a type of B", "A is a kind of B", "A is an instance of B", "A is a form of B", "A is one of the B" → edge `B → A`, type `"contains"`.
- **Part-whole / membership**: "A is a member of B", "A is part of B", "A belongs to B", "B consists of A", "B includes A" → edge `B → A`, type `"contains"`.

The child is a **concept** (a thing, a category, a component), not a statement *about* the parent.

A node may receive multiple `contains` edges if the text places it under several parents. Mark exactly one of them `primary: true` (prefer the classification "is a" parent when both flavors apply; otherwise prefer the first one stated in the source text). The others use `primary: false`.

#### 2. `states` — assertion / fact about the parent

Use when the child node is a **statement, claim, property, or fact attributed to the parent** — not a sub-concept of it. The child reads naturally as "the parent [verb] X". Includes negated assertions.

Triggers:
- "A does X", "A does not X", "A has property X", "A prescribes X", "A requires X", "A provides X", "A defines X".
- Any factual claim *about* the parent that you would otherwise force-fit into `relates to` with a description carrying the real meaning.

Examples:
- "ISO 27005 does not prescribe a risk assessment methodology" → parent `ISO 27005`, child `Does not prescribe a risk assessment methodology`, type `"states"`.
- "TLS 1.3 removes support for RSA key exchange" → parent `TLS 1.3`, child `Removes RSA key exchange`, type `"states"`.

The child's title should be phrased as the assertion itself (short verb phrase or noun phrase), not as a standalone concept.

#### 3. `implies` — logical or causal consequence

Use when the source text explicitly asserts that one concept entails, causes, or logically leads to another.

Triggers:
- "A implies B", "A leads to B", "A causes B", "A results in B", "if A then B", "A therefore B".

The relationship must be **directional and consequential** — not mere correlation or topical relatedness.

#### 4. `relates to` — default (chosen by elimination)

Use **only** when none of `contains`, `states`, or `implies` applies. This is the last-resort edge type for genuine topical relationships that are not subsumption, not assertion, and not implication.

Triggers (examples):
- "A is related to B", "A references B", "A and B are both aspects of …", "A depends on B" (when not causal in the implication sense), cross-references between sibling concepts.

If you find yourself reaching for `relates to` with a description that carries the real semantic load (e.g. "A does not prescribe B"), **stop** — that is the signal to use `states` instead.

### Primary edge rule

Every non-root node must have exactly one incoming edge with `primary: true`. The type of the primary edge can be any of the four. When a node has multiple incoming edges, prefer in order: `contains` (classification) > `contains` (part-of) > `states` > `implies` > `relates to`. If still tied, pick the first one stated in the source text.

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
    "description": "...",
    "types": ["descriptive"]
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

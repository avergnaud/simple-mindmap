# Step 4 — Add a `types` field to nodes

## Goal

Introduce a `types` field on every node, drawn from a fixed enum of four
propositional-logic categories. A node may carry one or more types. The default
is `["descriptive"]`.

This is a **data-model + skill change**. Webapp visualization of types is **out
of scope** for this prompt and will be handled in a follow-up
(`_prompt/041_webapp.md`).

## Motivation

The current graph treats every node as a descriptive concept. To support a
broader spectrum of content — mind map, KB, and ultimately
*Tractatus*-style logical theses — we want to mark, for each node, what kind of
proposition it is:

| Type           | Meaning                                                                 | Example                                                                  |
|----------------|-------------------------------------------------------------------------|--------------------------------------------------------------------------|
| `descriptive`  | A statement about what *is*. Concept, fact, definition.                 | "AES is a symmetric block cipher."                                       |
| `prescriptive` | A statement about what *ought* to be. Rule, requirement, norm, policy. | "You must use RSA-2048 or stronger." / "Non-Aggression Principle."       |
| `meta`         | A statement *about* another statement. Comment on form, scope, status. | "This control is mandatory under ISO 27001 Annex A."                     |
| `illustrative` | A concrete example or instance used to illustrate a more general node. | A worked example node sitting under a general concept.                   |

A node may combine types (e.g. an example that is itself a descriptive claim:
`["descriptive", "illustrative"]`).

## What the change must do

### 1. Update `SPECIFICATIONS.v2.md`

In the `nodes.json` field table, add a new row:

| Field   | Type     | Required | Description                                                              |
|---------|----------|----------|--------------------------------------------------------------------------|
| `types` | string[] | yes      | One or more of `descriptive`, `prescriptive`, `meta`, `illustrative`. Defaults to `["descriptive"]`. |

Below the table, add a short subsection titled **Node types** that:
- Lists the four allowed values with a one-sentence definition each (use the
  table above as the source of truth).
- States that a node may carry multiple types.
- States that `["descriptive"]` is the default for any new node where the type
  is not explicitly determined.
- States that node types are **orthogonal to edge types** — adding `types` to a
  node does not change how edges work.

### 2. Update `.claude/skills/extract-subgraph/SKILL.md`

**Step 4 node-field table** — add a `types` row:

| Field   | Rules |
|---------|-------|
| `types` | List of one or more values from `descriptive`, `prescriptive`, `meta`, `illustrative`. Default: `["descriptive"]`. Selection rules below. |

Add a **Type selection rules** block in Step 4, immediately after the field
table. Rules:

- **Default**: every node starts with `["descriptive"]`.
- Add `"prescriptive"` when the source text frames the node as a rule,
  requirement, obligation, recommendation, prohibition, or norm. Triggers:
  "must", "shall", "should", "is required to", "is forbidden to", "policy
  states", explicit standards clauses (e.g. "ISO 27001 A.8.1 requires…").
- Add `"meta"` when the node is a statement *about* another proposition (e.g.
  classifying it, scoping it, commenting on its status). Most nodes will NOT
  be meta — only mark this when the node's content is genuinely a
  proposition-about-a-proposition.
- Add `"illustrative"` when the node is an example or instance used to
  illustrate a more general parent node (rather than a general concept in its
  own right).
- A node may legitimately carry multiple types (e.g. `["descriptive",
  "illustrative"]` for a worked example that is also a factual claim).

**Step 6 output template** — update the nodes JSON template to include the
field:

```json
[
  {
    "id": "<uuid>",
    "title": "...",
    "synonyms": ["...", "..."],
    "description": "...",
    "types": ["descriptive"]
  }
]
```

### 3. Update `.claude/skills/merge-subgraph/SKILL.md`

In **Step 3 (Resolve node IDs — synonym matching)**, add an explicit clarification:

> - The `types` field is **never** used for matching. Match is based on
>   `title` and `synonyms` only. Two nodes with identical title/synonyms but
>   different `types` still match.

In **Step 7 (Write output)**, add one bullet under **New nodes**:

> - New subgraph nodes are appended with their `types` field as produced by
>   the extract step.

In the same step, add a bullet under merge semantics (or as a sub-bullet of
the existing "Do not modify existing nodes" line):

> - When a subgraph node matches an existing main-graph node, the existing
>   node's `types` field is **kept as-is**. The subgraph node's `types` are
>   discarded along with the rest of its fields. Existing nodes are never
>   modified by a merge.

### 4. Backfill `data/nodes.json`

- For **every existing node**, add `"types": ["descriptive"]`.
- For node `405af00a-783c-40fd-8a43-c8716f37ed82` specifically, set
  `"types": ["descriptive", "illustrative"]`.

Do not modify any other field on any node. Do not touch `data/edges.json`.

## Constraints

- This is a **data-model change only**, plus the two skills that read/write
  it. No webapp changes in this prompt.
- `types` is required: every node in `data/nodes.json` must have it after the
  migration. New nodes created by any path (skill extract, manual webapp add)
  must include it.
- The four allowed values are fixed. Any other value is invalid.
- Surgical edits: in `SPECIFICATIONS.v2.md` and the two `SKILL.md` files,
  touch only the sections named above. Match the existing prose style.

## Test

1. `data/nodes.json` — every node has a `types` field; all values are
   members of the allowed set; the illustrative node has both types.
2. `SPECIFICATIONS.v2.md` — the field table includes `types`; the **Node
   types** subsection exists with the four definitions and the default.
3. `extract-subgraph` skill — re-extract a small text section, verify the
   output nodes file contains a `types` field on every node, with sensible
   values per the selection rules (most `descriptive`; `prescriptive`
   appearing on any "must"/"shall"-style content; `illustrative` on any
   explicit example).
4. `merge-subgraph` skill — merge a subgraph where one node matches an
   existing node and one is new. Verify: the new node lands in
   `data/nodes.json` with its `types` field intact; the matched node is
   unchanged (its existing `types` preserved, the subgraph's `types`
   discarded). Construct the matched pair so the subgraph node has
   **different `types`** from the existing one (e.g. existing
   `["descriptive"]`, subgraph `["descriptive", "prescriptive"]`) and
   confirm the match still occurs and the existing node's `types` win.
5. The webapp continues to render unchanged (it ignores the new field for
   now). No regressions in display.

## Follow-up (not part of this prompt)

- `_prompt/041_webapp.md` — visualize node types in the webapp (badge / color
  / icon — design TBD).
- Future: querying ("show all prescriptive nodes") and reasoning constraints
  (e.g. flag descriptive→prescriptive derivations without a justifying edge).

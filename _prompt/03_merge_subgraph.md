# Step 3 — Merge a subgraph into the main graph

## Goal

Take an extracted subgraph (`data/subgraph_<timestamp>_nodes.json` + `_edges.json`) and merge it into `data/nodes.json` + `data/edges.json`.

Merging means:
- **Deduplicating** nodes that already exist in the main graph (matched by synonyms).
- **Appending** new nodes that don't exist yet.
- **Attaching** the subgraph root to a user-chosen parent in the main graph.

## What the skill must do

### 1. Pick the subgraph to merge

List all `data/subgraph_*_nodes.json` files. If there is more than one, ask the user which to merge. If there is exactly one, use it directly.

### 2. Load data

Read:
- `data/subgraph_<timestamp>_nodes.json` and `data/subgraph_<timestamp>_edges.json`
- `data/nodes.json` and `data/edges.json`

### 3. Resolve node IDs (synonym matching)

For each subgraph node, check whether it matches an existing main-graph node.

A match occurs when **any** of the following overlap (case-insensitive):
- subgraph node `title` == existing node `title` or any existing node `synonym`
- any subgraph node `synonym` == existing node `title` or any existing node `synonym`

If a match is found: map the subgraph node's ID → the existing node's ID (the subgraph node will not be added to the main graph).  
If no match is found: the subgraph node is new — keep its UUID, add it to `nodes.json`.

Build a resolution map: `{ subgraphNodeId → resolvedId }` for all subgraph nodes.

### 4. Ask where to attach the subgraph root

Identify the subgraph root: the one node that is not the `target` of any subgraph edge.

Show the user:
- The root node title.
- A reminder to paste a node ID from `data/nodes.json` (or use "copy ID" in the webapp).

Ask:
> Which existing node should be the parent of "<root title>"? Paste its ID.

### 5. Remap and deduplicate edges

Rewrite every subgraph edge using the resolution map (replace source/target with their resolved IDs).

Drop an edge if:
- source ID == target ID after remapping (self-loop from deduplication), or
- an edge with the same `source`, `target`, and `type` already exists in `edges.json`.

Add the attachment edge:
```json
{ "source": "<user-provided parent ID>", "target": "<resolved root ID>", "type": "contains", "primary": true }
```

### 6. Write output

Append new nodes to `data/nodes.json`.  
Append new edges to `data/edges.json`.

Do **not** modify existing nodes or edges.

### 7. Delete merged subgraph files

Delete `data/subgraph_<timestamp>_nodes.json` and `data/subgraph_<timestamp>_edges.json`.

### 8. Report to user

Tell the user:
- How many nodes were **new** (added) vs **matched** (deduplicated).
- How many edges were added.
- The attachment point (parent title → root title).

## Constraints

- Never modify existing nodes or edges — only append.
- Synonym matching is case-insensitive and applies to both `title` and `synonyms` fields.
- The merge must not introduce cycles or duplicate edges.
- No Claude API calls from code. The intelligence (synonym matching, deduplication decisions) comes from Claude Code executing the skill.

## Test

1. Extract a subgraph that partially overlaps with the main graph (some nodes should match, some should be new).
2. Run the merge skill.
3. Verify in `data/nodes.json` that matched nodes were not duplicated and new nodes were added.
4. Verify in `data/edges.json` that the attachment edge is present and no duplicate edges exist.
5. Verify the subgraph files were deleted.
6. Open `http://localhost:3000` and confirm the merged nodes appear under the correct parent.

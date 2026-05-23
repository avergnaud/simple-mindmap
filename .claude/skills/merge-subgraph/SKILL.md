# Skill: merge-subgraph

Merge an extracted subgraph into the main DAG (`data/nodes.json` + `data/edges.json`).

---

## Step 1 — Pick the subgraph

List all files matching `data/subgraph_*_nodes.json` using the Glob tool.

- If **zero files** found: tell the user there is nothing to merge and stop.
- If **exactly one** file: use it directly.
- If **more than one**: list their timestamps and ask the user which to merge.

Derive the matching edges file by replacing `_nodes.json` with `_edges.json` in the chosen filename.

## Step 2 — Load data

Read all four files:
- `data/subgraph_<timestamp>_nodes.json`
- `data/subgraph_<timestamp>_edges.json`
- `data/nodes.json`
- `data/edges.json`

## Step 3 — Resolve node IDs (synonym matching)

For each subgraph node, check whether it matches any existing main-graph node.

**Match rule (case-insensitive):** a match occurs when any of the following are true:
- subgraph node `title` equals an existing node's `title` or any value in its `synonyms` array
- any entry in the subgraph node's `synonyms` array equals an existing node's `title` or any value in its `synonyms` array

Build a resolution map: `{ subgraphNodeId → resolvedId }` for every subgraph node.
- **Match found**: `resolvedId` = the existing node's ID. The subgraph node will not be added to the main graph.
- **No match**: `resolvedId` = the subgraph node's own ID. The node will be added as new.

## Step 4 — Identify the subgraph root

The root is the subgraph node whose ID does not appear as a `target` in any subgraph edge.

## Step 5 — Ask where to attach the root (only if root is new)

Check whether the root node's `resolvedId` equals its own subgraph ID (i.e., no match was found in the main graph).

- **Root is new** (no match): Show the user the root node's title, then ask:

  > Which existing node should be the parent of "<root title>"? Paste its ID (copy from the webapp or from `data/nodes.json`).

  Wait for the user's response. Validate that the provided ID exists in `data/nodes.json`.

- **Root is matched** (resolvedId points to an existing node): Skip this step entirely. No attachment edge is needed.

## Step 6 — Remap and deduplicate edges

For every subgraph edge, replace `source` and `target` with their resolved IDs from the resolution map.

Drop an edge if:
- `source === target` after remapping (self-loop from deduplication), OR
- An edge with the same `source`, `target`, and `type` already exists in `data/edges.json`.

**Only if the root was new** (Step 5 was not skipped): also add the attachment edge:
```json
{ "source": "<user-provided parent ID>", "target": "<resolved root ID>", "type": "contains", "primary": true }
```

If this attachment edge would duplicate an existing edge in `data/edges.json`, skip it.

## Step 7 — Write output

**New nodes**: subgraph nodes where `resolvedId === subgraphNodeId` (no match found). Append them to `data/nodes.json`.

**New edges**: the remapped, deduplicated edges plus the attachment edge. Append them to `data/edges.json`.

Read the current file contents with the Read tool, merge the arrays, then write with the Write tool. Do **not** modify existing nodes or edges.

## Step 8 — Delete the subgraph files

Use the Bash tool to remove both files:

```bash
rm "data/subgraph_<timestamp>_nodes.json" "data/subgraph_<timestamp>_edges.json"
```

## Step 9 — Report

Tell the user:
- How many nodes were **new** (added) vs **matched** (deduplicated).
- How many edges were added.
- If the root was new: the attachment point: `"<parent node title>" → "<root title>"`.
- If the root was matched: note that the root was merged with existing node `<resolvedId>`.

# Step 5 — Node levels, collapse/expand, and search

## Goal

Add three coupled webapp features to `public/index.html`:

1. **Node level** — derive each node's depth from the root via primary-parent edges. Used internally; not persisted.
2. **Collapse / expand** — per-node toggle. State stored in `localStorage`. Default on first load: expanded up to level 1 (root visible, its immediate children visible, level 2+ hidden).
3. **Search bar** — title-only, case-insensitive substring. Selecting a match expands every parent chain (primary + every secondary) up to the root, so the canonical row plus every ghost row of the matched node become visible with their full ancestry. Expansion is **sticky** — clearing the search does not collapse anything.

This is a **pure frontend change**. No backend, no API, no data-model changes. Vanilla JS + CSS only.

## What changes

### 1. Node level (derived, not stored)

When rendering, compute each node's level by BFS from the root using **primary edges only**:

- Root has level 0.
- A primary child has level = parent.level + 1.

Level is recomputed on every render. It is **not** written to `nodes.json`, **not** exposed via the API, and **not** part of any persisted state. Its sole purpose in this prompt is the first-load default of the collapse/expand state.

Level does **not** affect ghost-row indentation: a ghost row renders at its lexical position under its secondary parent, independent of the underlying node's canonical level.

### 2. Collapse / expand

#### State

A single `localStorage` key:

- Key: `dag-kb:expanded`
- Value: a JSON array of node IDs that are currently **expanded**.

Rendering rule: a node's children list (primary children + ghost rows for its secondary children, per the existing rendering) is rendered iff the node's ID is in the expanded set. If the ID is absent, the children `<ul>` is not added to the DOM.

#### First-load initialization

If `localStorage["dag-kb:expanded"]` is absent or unparseable, initialize the in-memory set to `{ <root.id> }` and persist it. This yields: root visible at top, its immediate children (level 1) visible, level-2+ hidden — i.e. expanded up to level 1.

On subsequent loads, the persisted set is the source of truth (no re-initialization based on level).

#### Stale-ID cleanup

When loading the persisted set, drop any ID that no longer corresponds to a node in `graph.nodes`. Persist the cleaned set back. This silently absorbs deletions and root changes without errors.

#### Chevron UI

- Each **canonical** node-row gets a small chevron toggle as the first element of the row (before the title), provided the node has at least one child somewhere — i.e. at least one outgoing edge (primary or secondary) where the node is the `source`. Nodes with no children get no chevron (they have nothing to toggle).
- Visual: `▶` when collapsed, `▼` when expanded. Keep it minimal — no animation required. Use a button or span; reuse the row's existing layout (the `node-row` flex container).
- Clicking the chevron toggles the node's membership in the expanded set, persists to localStorage, and re-renders.
- **Ghost rows do NOT get a chevron**, even if the underlying node has children. Ghost rows never render children (per existing spec).

#### Behavior on CRUD and merge

- A newly added node (via the `+` button or via a subgraph merge) is not in the expanded set, so by default its own children stay hidden until the user opens it. Its parent stays expanded if it was already.
- A deleted node's ID is purged from the expanded set on the next load by the stale-ID cleanup step.

### 3. Search

#### UI

A single text input placed at the top of the page, above or beside the existing `<h1>`. Placeholder: `Search…`. A small `✕` clear affordance inside or next to the input (optional but nice) resets the value.

Below the input, render a dropdown list of matches (max 20). The dropdown is shown iff the input is focused AND its value is non-empty AND there is at least one match. Otherwise the dropdown is hidden.

Style the dropdown minimally — match the existing aesthetic of the webapp (no shadow stack, no fancy chrome). A simple absolutely-positioned `<ul>` with hover highlight is enough.

#### Matching

- Case-insensitive **substring** match on `title` only.
- Synonyms and description are **not** matched in this version.
- One row per matching node, regardless of how many parents it has.
- Empty input → no matches, dropdown hidden.

Each dropdown row shows the node title. (Showing the primary-parent breadcrumb is out of scope for this prompt.)

#### Selecting a match

Triggered by click on a dropdown row, or by `Enter` while the dropdown is open. On selection:

1. Collect all parent IDs of the matched node: every `source` of every edge whose `target === matchedId`. (Both primary and non-primary parents are included.)
2. For each parent ID, walk that parent's **primary-parent chain** upward until the root, collecting every node on the way.
3. Add all of these IDs (the direct parents from step 1 and all ancestors from step 2) to the expanded set. Persist to localStorage.
4. Re-render.
5. Scroll the matched node's **canonical row** into view: `scrollIntoView({ behavior: 'smooth', block: 'center' })`.
6. Briefly apply the existing `highlight` class (~1 s) to **every occurrence** of the matched node — its canonical row and each ghost row. This is the user's visual cue that the node has multiple locations.

After selection, the dropdown closes (regardless of focus).

Implementation hint for step 6: give every rendered row a `data-node-id="<uuid>"` attribute (on the `<li>`) so `document.querySelectorAll('[data-node-id="…"]')` returns both the canonical row and all ghost rows.

#### Sticky clear

Clearing the input (via `✕` button, backspacing to empty, or `Esc`) hides the dropdown but does **not** collapse anything. The expanded set stays as it was. This is the intended behavior.

#### Keyboard (nice-to-have, not required)

If easy to do in vanilla JS:

- `Esc` while the input has focus: clear the input value and hide the dropdown.
- `↑` / `↓` while the dropdown is open: move a visual highlight within the dropdown.
- `Enter` while the dropdown is open: select the highlighted item (default to the first match if none is highlighted yet).

The click path is the must-have. Skip keyboard navigation if it complicates the implementation.

## Interactions and edge cases

- **Search adds to expanded set; never removes.** Subtrees the user already opened stay open.
- **Matched node is the root.** Nothing to expand. Just scroll and highlight.
- **Matched node has multiple parents.** All chains get expanded. The node appears as the canonical row (under its primary parent) plus one ghost row under each secondary parent — every occurrence is now visible with full ancestry.
- **Ghost rows and chevrons.** Ghost rows never get a chevron and never render children. Children appear only under the canonical row, controlled by the canonical row's expanded state.
- **After server CRUD.** The existing `load()` flow remains the trigger for re-rendering. After re-render, the persisted expanded set still drives which subtrees are open.
- **Root collapsed by user.** Allowed. The user can re-expand by clicking the root's chevron. No special-casing.

## Constraints

- Pure frontend. No backend, no API, no new dependencies. Vanilla JS + CSS, single file (`public/index.html`).
- No changes to `nodes.json` / `edges.json` schema.
- Match the existing minimal style of `public/index.html`. Reuse the existing `highlight` and `ghost` classes where they apply.
- No frameworks, no build step, no external libraries.
- Don't touch unrelated code, styles, or behaviors. The `+`, copy ID, delete buttons and ghost-row click-to-jump behavior stay exactly as they are today.

## SPECIFICATIONS.v2.md updates

In the **Webapp — Localhost / Display** section, after the existing bullets, add three short subsections (in this order):

1. **Node level** — derived from primary-parent depth, recomputed on render, not stored. Used as the basis for the default collapse rule.
2. **Collapse / expand** — per-node toggle. State persisted in `localStorage` under `dag-kb:expanded` as an array of expanded node IDs. On first load (no key present), the expanded set is initialized to `[root.id]`, so the user sees the root and its immediate children (expanded up to level 1). The chevron toggles membership; ghost rows have no chevron.
3. **Search** — input at the top of the page. Case-insensitive substring match on **title only**. Selecting a match adds, to the expanded set, every direct parent of the matched node and every ancestor up to the root via primary-parent edges, for **every** parent — so the canonical row and all ghost rows of the matched node become visible with their full ancestry. Clearing the search is sticky: previously-expanded ancestors stay expanded.

In the **Out of Scope (for MVP)** list at the bottom, **remove** the line:

```
- Search / filter
```

(Search now exists; filter remains out of scope.)

## Test

1. Start `node server.js`, clear `localStorage` for the origin, open `http://localhost:3000`. The root row is visible and expanded; its immediate children (level 1) are visible; level-2 children are hidden. `localStorage["dag-kb:expanded"]` contains the root ID.
2. Click the chevron on a level-1 node → its children appear. Reload → still expanded.
3. Click the chevron again → children hidden. Reload → still collapsed. The ID is no longer in `dag-kb:expanded`.
4. Type a substring of a deep node's title (level 3+) into the search bar. The dropdown lists matches. Click a match. The matched node's canonical row scrolls into view, briefly highlighted; every ancestor in its primary-parent chain has been added to the expanded set so the row is reachable from the root.
5. Clear the input. The previously expanded ancestors **remain expanded** (sticky).
6. Find (or construct) a node with both a primary parent and at least one secondary parent. Search-select it. Both its canonical row (under the primary parent) and every ghost row (under each secondary parent) are visible at the same time, with their full primary-parent chains expanded up to the root. The `highlight` flash appears on every occurrence briefly.
7. Search-select the root node. No expansion needed. The root scrolls into view and is highlighted.
8. Add a child via the `+` button. The new node is not in the expanded set; its own children (none yet) stay collapsed by default. Its parent stays expanded.
9. Delete a node whose ID is in `dag-kb:expanded`. On next load, no errors; the stale ID has been silently dropped from the persisted set.
10. Ghost rows have no chevron, even when the underlying node has children. Clicking a ghost row still jumps to (and highlights) the canonical row — existing behavior unchanged.
11. The `+`, copy ID, and delete buttons on canonical rows behave exactly as before. No regressions.

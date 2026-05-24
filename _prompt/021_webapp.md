# Step 2.1 — Replace secondary-parent badge with ghost rows

## Goal

Change how the webapp displays nodes that have **secondary parents** (non-primary edges where the node is the target). Replace the existing badge-with-reveal with **ghost rows** rendered inline in the indented list.

This implements the updated `SPECIFICATIONS.v2.md` section on the webapp display.

## What changes

### Spec recap

A ghost row is an additional rendering of a node under each of its secondary parents:

- Rendered in a **muted style** (greyed and italic).
- Prefixed with an arrow icon (e.g. `↗`) to mark it as a reference, not the canonical location.
- **Not expandable** — its children are NOT rendered under it. Children only appear under the primary parent.
- **Clicking a ghost row jumps to the canonical row** (the same node rendered under its primary parent) and scrolls it into view.
- Ghost rows do not display the action buttons (**+**, **copy ID**, **delete**). Those only appear on the canonical row.

### Rendering algorithm

When building the nested `<ul>`/`<li>` tree:

1. Walk the tree using **primary edges only** (unchanged).
2. For each node being rendered as a child list under a parent, additionally insert one ghost `<li>` for every node whose **secondary parent** is the current parent. (A node's secondary parents = sources of all non-primary edges targeting that node.)
3. Ghost `<li>` elements:
   - Have a stable DOM id or `data-` attribute pointing to the canonical row's DOM id, so the click handler can find and scroll to it.
   - Carry a class (e.g. `ghost`) for the muted styling.
   - Contain only the arrow icon + the node title. No badge, no buttons, no nested `<ul>`.

The canonical row should have a stable DOM id (e.g. `node-<uuid>`) so ghost rows can target it.

### Click-to-jump behavior

Clicking a ghost row:
- Calls `scrollIntoView({ behavior: "smooth", block: "center" })` on the canonical row.
- Briefly highlights the canonical row (e.g. add a `highlight` class for ~1s, then remove it) so the user sees where they landed.

### Remove

- The badge element, its click handler, and the inline reveal / tooltip showing secondary-parent titles. Ghost rows replace all of that.
- Any CSS that was only used by the badge.

## Constraints

- No new dependencies. Vanilla JS + CSS only.
- Re-render path stays the same — after any CRUD operation, the list is rebuilt from `/api/graph`, including ghost rows.
- No backend changes. This is a pure frontend change.
- Don't touch unrelated code, styles, or behavior. The +, copy ID, delete buttons on canonical rows are unchanged.

## Test

1. `node server.js` still starts with no errors.
2. Open `http://localhost:3000` — the indented list renders as before for nodes with only a primary parent.
3. A node with one or more secondary parents appears as a ghost row (muted, italic, `↗` prefix, no buttons) under each secondary parent — in addition to its canonical row under the primary parent.
4. Clicking a ghost row scrolls the canonical row into view and briefly highlights it.
5. Ghost rows have no children rendered beneath them, even if the underlying node has children. Children only appear under the canonical row.
6. The old badge is gone — no badge element appears in the DOM for any node.

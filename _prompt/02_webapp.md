# Step 2 — Localhost webapp for manual CRUD

## Goal

Build a localhost web application that lets the user view and manually edit the DAG (`data/nodes.json` + `data/edges.json`). This is the only interface for human CRUD — the Claude skill handles all intelligent operations.

## What to build

### Backend

A Node.js + Express server (e.g. `server.js`) at the project root:

- Serves the frontend as a static file.
- Provides a REST API to read and write the JSON data files.
- Default port: `3000`.

Minimum API surface:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/graph` | Returns `{ nodes, edges }` from `data/nodes.json` + `data/edges.json` |
| POST | `/api/nodes` | Creates a new node + primary edge to a parent |
| DELETE | `/api/nodes/:id` | Deletes a node and its entire primary-edge subtree (cascade), plus all edges involving deleted nodes |

`POST /api/nodes` body:
```json
{
  "parentId": "<uuid>",
  "title": "...",
  "description": "..."   // optional
}
```
Creates the node with a generated UUID and an empty `synonyms` array. Adds one edge: `{ source: parentId, target: newId, type: "contains", primary: true }`.

### Frontend

A single HTML file (`public/index.html`) with vanilla JS. No build step, no framework, no bundler.

#### Display

Render the graph as a **nested indented list** (`<ul>`/`<li>`). Use only **primary edges** to determine the hierarchy. The root node (no primary parent) is at the top level.

For each node, show:
- The node **title**.
- A small badge if the node has **secondary parents** (non-primary edges where this node is the target). Clicking the badge shows the list of those parent node titles (a simple inline reveal or tooltip is fine).
- Three action buttons: **+** (add child), **copy ID**, **delete**.

#### Add child node

Clicking **+** reveals an inline form directly below the node (not a modal):
- `title` input (required)
- `description` input (optional)
- Submit / Cancel

On submit: `POST /api/nodes`, then re-render the list.

#### Copy node ID

Clicking **copy ID** copies the node's UUID to the clipboard. No feedback required beyond what the browser provides natively (or a brief "Copied" label swap if easy).

#### Delete node (cascade)

Clicking **delete** shows a `confirm()` dialog: `"Delete [title] and all its children?"`. On confirm: `DELETE /api/nodes/:id`, then re-render.

The server performs the cascade: collect all descendants via primary edges, delete those nodes and all edges that reference any of the deleted IDs.

### Constraints

- No Claude API calls anywhere.
- No authentication, no persistence beyond the JSON files.
- No drag-and-drop, no graph canvas, no search.
- Node editing (title, description, synonyms) is out of scope — done via the Claude skill.

## Test

1. `node server.js` starts with no errors.
2. Open `http://localhost:3000` — the root node is displayed.
3. Add a child node → it appears indented under its parent after submit.
4. Copy a node ID → paste it somewhere and confirm it is a valid UUID.
5. Delete a node that has children → the node and all its descendants disappear; `data/nodes.json` and `data/edges.json` reflect the deletion.
6. A node with a secondary parent edge shows the badge; clicking it reveals the parent title.

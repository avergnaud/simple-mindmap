const express = require('express');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const NODES_FILE = path.join(__dirname, 'data', 'nodes.json');
const EDGES_FILE = path.join(__dirname, 'data', 'edges.json');

function readJSON(file) {
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

app.get('/api/graph', (req, res) => {
  res.json({ nodes: readJSON(NODES_FILE), edges: readJSON(EDGES_FILE) });
});

app.post('/api/nodes', (req, res) => {
  const { parentId, title, description, type } = req.body;
  if (!parentId || !title) return res.status(400).json({ error: 'parentId and title required' });

  const edgeType = type || 'contains';
  if (edgeType !== 'contains' && edgeType !== 'states') {
    return res.status(400).json({ error: 'type must be "contains" or "states"' });
  }

  const nodes = readJSON(NODES_FILE);
  const edges = readJSON(EDGES_FILE);

  const newNode = { id: randomUUID(), title, synonyms: [] };
  if (description) newNode.description = description;

  nodes.push(newNode);
  edges.push({ source: parentId, target: newNode.id, type: edgeType, primary: true });

  writeJSON(NODES_FILE, nodes);
  writeJSON(EDGES_FILE, edges);

  res.json(newNode);
});

app.post('/api/nodes/:id/move', (req, res) => {
  const { id } = req.params;
  const { direction } = req.body;
  if (direction !== 'up' && direction !== 'down') {
    return res.status(400).json({ error: 'direction must be "up" or "down"' });
  }

  const edges = readJSON(EDGES_FILE);
  const primaryEdge = edges.find(e => e.primary && e.target === id);
  if (!primaryEdge) return res.status(404).json({ error: 'no primary edge for node' });

  const siblings = edges
    .filter(e => e.primary && e.source === primaryEdge.source)
    .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER));

  const idx = siblings.indexOf(primaryEdge);
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= siblings.length) {
    return res.status(400).json({ error: 'cannot move beyond boundary' });
  }

  [siblings[idx], siblings[swapIdx]] = [siblings[swapIdx], siblings[idx]];
  siblings.forEach((e, i) => { e.order = i; });

  writeJSON(EDGES_FILE, edges);
  res.json({ ok: true });
});

app.patch('/api/nodes/:id', (req, res) => {
  const { id } = req.params;
  const { title } = req.body;
  if (typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'title must be a non-empty string' });
  }

  const nodes = readJSON(NODES_FILE);
  const node = nodes.find(n => n.id === id);
  if (!node) return res.status(404).json({ error: 'node not found' });

  node.title = title.trim();
  writeJSON(NODES_FILE, nodes);

  res.json(node);
});

app.delete('/api/nodes/:id', (req, res) => {
  const { id } = req.params;
  let nodes = readJSON(NODES_FILE);
  let edges = readJSON(EDGES_FILE);

  const toDelete = new Set([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of edges) {
      if (edge.primary && toDelete.has(edge.source) && !toDelete.has(edge.target)) {
        toDelete.add(edge.target);
        changed = true;
      }
    }
  }

  nodes = nodes.filter(n => !toDelete.has(n.id));
  edges = edges.filter(e => !toDelete.has(e.source) && !toDelete.has(e.target));

  writeJSON(NODES_FILE, nodes);
  writeJSON(EDGES_FILE, edges);

  res.json({ deleted: [...toDelete] });
});

app.listen(3000, () => console.log('Listening on http://localhost:3000'));

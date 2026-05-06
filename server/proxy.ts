import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';
import db from './db.js';
import { setupWebSocket } from './ws.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);
const PORT = parseInt(process.env.PORT || '3001', 10);
const BASE = 'https://www.17lands.com';
const isProd = process.env.NODE_ENV === 'production';

app.use(cors({ origin: isProd ? true : /^http:\/\/localhost:\d+$/ }));
app.use(express.json({ limit: '1mb' }));

// --- Review CRUD ---

app.post('/reviews', (req, res) => {
  const { draftId, draftLog } = req.body;
  if (!draftId || !draftLog) {
    res.status(400).json({ error: 'draftId and draftLog are required' });
    return;
  }

  const id = uuidv4();
  const editToken = uuidv4();

  db.prepare(
    `INSERT INTO reviews (id, edit_token, draft_id, draft_log) VALUES (?, ?, ?, ?)`
  ).run(id, editToken, draftId, JSON.stringify(draftLog));

  res.status(201).json({ id, editToken });
});

app.get('/reviews/:id', (req, res) => {
  const row = db.prepare(
    `SELECT id, draft_id, draft_log, annotations, timelines, summary, created_at, updated_at FROM reviews WHERE id = ?`
  ).get(req.params.id) as Record<string, string> | undefined;

  if (!row) {
    res.status(404).json({ error: 'Review not found' });
    return;
  }

  res.json({
    id: row.id,
    draftId: row.draft_id,
    draftLog: JSON.parse(row.draft_log),
    annotations: JSON.parse(row.annotations),
    timelines: JSON.parse(row.timelines),
    summary: JSON.parse(row.summary || '{"rating":null,"closingThoughts":"","improvements":""}'),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
});

app.put('/reviews/:id', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(403).json({ error: 'Missing or invalid authorization' });
    return;
  }
  const token = authHeader.slice(7);

  const row = db.prepare(
    `SELECT edit_token FROM reviews WHERE id = ?`
  ).get(req.params.id) as { edit_token: string } | undefined;

  if (!row) {
    res.status(404).json({ error: 'Review not found' });
    return;
  }

  if (row.edit_token !== token) {
    res.status(403).json({ error: 'Invalid edit token' });
    return;
  }

  const { annotations, timelines, summary } = req.body;

  db.prepare(
    `UPDATE reviews SET annotations = ?, timelines = ?, summary = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(
    JSON.stringify(annotations ?? []),
    JSON.stringify(timelines ?? []),
    JSON.stringify(summary ?? { rating: null, closingThoughts: '', improvements: '' }),
    req.params.id,
  );

  const updated = db.prepare(
    `SELECT updated_at FROM reviews WHERE id = ?`
  ).get(req.params.id) as { updated_at: string };

  res.json({ ok: true, updatedAt: updated.updated_at });
});

// --- Annotation Layers REST (fallback for non-WS clients) ---

app.get('/reviews/:id/layers', (req, res) => {
  const rows = db.prepare(
    `SELECT id, review_id, user_id, user_name, user_color, annotations, updated_at FROM annotation_layers WHERE review_id = ?`
  ).all(req.params.id) as any[];

  res.json(rows.map((row: any) => ({
    id: row.id,
    reviewId: row.review_id,
    userId: row.user_id,
    userName: row.user_name,
    userColor: row.user_color,
    annotations: JSON.parse(row.annotations),
    updatedAt: row.updated_at,
  })));
});

// --- 17Lands proxy ---

app.use('/api', async (req, res) => {
  const target = `${BASE}${req.originalUrl.replace('/api', '')}`;
  try {
    const response = await fetch(target);
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      res.json(data);
    } else {
      const text = await response.text();
      res.status(response.status).send(text);
    }
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(502).json({ error: 'Failed to fetch from 17Lands' });
  }
});

// --- Static files (production) ---

if (isProd) {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.get('{*path}', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// --- Start server with WebSocket ---

setupWebSocket(server);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

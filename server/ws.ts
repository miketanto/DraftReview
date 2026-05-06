import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import db from './db.js';

interface CollabUser {
  id: string;
  name: string;
  color: string;
}

interface ConnectedClient {
  ws: WebSocket;
  user: CollabUser;
  reviewId: string;
}

const rooms = new Map<string, ConnectedClient[]>();

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    let client: ConnectedClient | null = null;

    ws.on('message', (raw) => {
      let msg: any;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      if (msg.type === 'join') {
        const { reviewId, user } = msg;
        client = { ws, user, reviewId };

        if (!rooms.has(reviewId)) rooms.set(reviewId, []);
        rooms.get(reviewId)!.push(client);

        // Send existing layers
        const layers = getLayersForReview(reviewId);
        ws.send(JSON.stringify({ type: 'layers-snapshot', layers }));

        // Broadcast presence
        broadcastPresence(reviewId);
      }

      if (msg.type === 'annotation-update' && client) {
        const { layer } = msg;
        persistLayer(layer);
        broadcast(client.reviewId, { type: 'layer-update', layer }, client);
      }

      if (msg.type === 'cursor-move' && client) {
        broadcast(client.reviewId, {
          type: 'cursor',
          userId: client.user.id,
          packNumber: msg.packNumber,
          pickNumber: msg.pickNumber,
        }, client);
      }

      if (msg.type === 'leave') {
        removeClient(client);
        client = null;
      }
    });

    ws.on('close', () => {
      removeClient(client);
    });
  });
}

function removeClient(client: ConnectedClient | null) {
  if (!client) return;
  const room = rooms.get(client.reviewId);
  if (room) {
    const idx = room.indexOf(client);
    if (idx >= 0) room.splice(idx, 1);
    if (room.length === 0) {
      rooms.delete(client.reviewId);
    } else {
      broadcastPresence(client.reviewId);
    }
  }
}

function broadcast(reviewId: string, msg: any, exclude?: ConnectedClient) {
  const room = rooms.get(reviewId);
  if (!room) return;
  const data = JSON.stringify(msg);
  for (const c of room) {
    if (c !== exclude && c.ws.readyState === WebSocket.OPEN) {
      c.ws.send(data);
    }
  }
}

function broadcastPresence(reviewId: string) {
  const room = rooms.get(reviewId);
  if (!room) return;
  const users = room.map((c) => c.user);
  const data = JSON.stringify({ type: 'presence', users });
  for (const c of room) {
    if (c.ws.readyState === WebSocket.OPEN) {
      c.ws.send(data);
    }
  }
}

function getLayersForReview(reviewId: string) {
  const rows = db.prepare(
    `SELECT id, review_id, user_id, user_name, user_color, annotations, updated_at FROM annotation_layers WHERE review_id = ?`
  ).all(reviewId) as any[];

  return rows.map((row) => ({
    id: row.id,
    reviewId: row.review_id,
    userId: row.user_id,
    userName: row.user_name,
    userColor: row.user_color,
    annotations: JSON.parse(row.annotations),
    updatedAt: row.updated_at,
  }));
}

function persistLayer(layer: any) {
  const existing = db.prepare(
    `SELECT id FROM annotation_layers WHERE id = ?`
  ).get(layer.id);

  if (existing) {
    db.prepare(
      `UPDATE annotation_layers SET annotations = ?, user_name = ?, user_color = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(JSON.stringify(layer.annotations), layer.userName, layer.userColor, layer.id);
  } else {
    db.prepare(
      `INSERT INTO annotation_layers (id, review_id, user_id, user_name, user_color, annotations) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(layer.id, layer.reviewId, layer.userId, layer.userName, layer.userColor, JSON.stringify(layer.annotations));
  }
}

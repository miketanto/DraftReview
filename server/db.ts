import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'reviews.db');

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    edit_token TEXT NOT NULL,
    draft_id TEXT NOT NULL,
    draft_log TEXT NOT NULL,
    annotations TEXT NOT NULL DEFAULT '[]',
    timelines TEXT NOT NULL DEFAULT '[]',
    summary TEXT NOT NULL DEFAULT '{"rating":null,"closingThoughts":"","improvements":""}',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

try {
  db.exec(`ALTER TABLE reviews ADD COLUMN summary TEXT NOT NULL DEFAULT '{"rating":null,"closingThoughts":"","improvements":""}'`);
} catch {
  // column already exists
}

db.exec(`
  CREATE TABLE IF NOT EXISTS annotation_layers (
    id TEXT PRIMARY KEY,
    review_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_color TEXT NOT NULL,
    annotations TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (review_id) REFERENCES reviews(id)
  )
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_layers_review_id ON annotation_layers(review_id)
`);

export default db;

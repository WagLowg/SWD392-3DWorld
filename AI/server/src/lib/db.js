import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from '../config.js';

fs.mkdirSync(config.dataDir, { recursive: true });
export const db = new DatabaseSync(path.join(config.dataDir, 'studio.db'));
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
  password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'customer', created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id), title TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'private', source_mode TEXT NOT NULL DEFAULT 'single',
  active_version_id TEXT, favorite INTEGER NOT NULL DEFAULT 0, archived INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id, updated_at);
CREATE TABLE IF NOT EXISTS source_images (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id), project_id TEXT,
  storage_key TEXT NOT NULL, mime TEXT NOT NULL, size_bytes INTEGER NOT NULL,
  width INTEGER NOT NULL, height INTEGER NOT NULL, original_name TEXT NOT NULL,
  checksum TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id), project_id TEXT NOT NULL REFERENCES projects(id),
  provider TEXT NOT NULL, provider_task_id TEXT, type TEXT NOT NULL, status TEXT NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0, provider_status TEXT, error_code TEXT, error_message TEXT,
  request_key TEXT NOT NULL, variant_index INTEGER NOT NULL DEFAULT 0,
  config_json TEXT NOT NULL, image_ids_json TEXT NOT NULL,
  credits INTEGER NOT NULL, price_version TEXT NOT NULL, ingest_attempts INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, finished_at INTEGER, last_synced_at INTEGER,
  UNIQUE(owner_id, request_key, variant_index)
);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_provider ON tasks(provider_task_id);
CREATE TABLE IF NOT EXISTS versions (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id), parent_version_id TEXT,
  source_task_id TEXT, label TEXT NOT NULL, metadata_json TEXT NOT NULL DEFAULT '{}',
  dims_json TEXT, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY, version_id TEXT NOT NULL REFERENCES versions(id), owner_id TEXT NOT NULL,
  kind TEXT NOT NULL, format TEXT NOT NULL, storage_key TEXT NOT NULL,
  size_bytes INTEGER NOT NULL, checksum TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS ledger (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id), amount INTEGER NOT NULL,
  type TEXT NOT NULL, task_id TEXT, note TEXT, created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_task_type ON ledger(task_id, type) WHERE task_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS pod_handoffs (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, version_id TEXT NOT NULL, print_request_id TEXT NOT NULL UNIQUE,
  request_key TEXT NOT NULL, config_json TEXT NOT NULL, file_snapshot_json TEXT NOT NULL,
  status TEXT NOT NULL, created_at INTEGER NOT NULL, UNIQUE(owner_id, request_key)
);
CREATE TABLE IF NOT EXISTS audit (
  id TEXT PRIMARY KEY, actor_id TEXT, action TEXT NOT NULL, target_id TEXT,
  detail_json TEXT, created_at INTEGER NOT NULL
);
`);

export const id = (prefix) => `${prefix}_${crypto.randomBytes(9).toString('base64url')}`;
export const now = () => Date.now();

/** Chạy fn trong một transaction SQLite (atomic). */
export function tx(fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const r = fn();
    db.exec('COMMIT');
    return r;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

export const one = (sql, ...p) => db.prepare(sql).get(...p);
export const all = (sql, ...p) => db.prepare(sql).all(...p);
export const run = (sql, ...p) => db.prepare(sql).run(...p);

export function audit(actorId, action, targetId, detail) {
  run(
    'INSERT INTO audit (id, actor_id, action, target_id, detail_json, created_at) VALUES (?,?,?,?,?,?)',
    id('aud'), actorId ?? null, action, targetId ?? null, detail ? JSON.stringify(detail) : null, now(),
  );
}

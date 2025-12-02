-- Initial database schema with WAL mode and core tables
-- Version: 1
-- Created: 2025-12-02

-- Enable WAL mode for better concurrency
PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;
PRAGMA foreign_keys=ON;

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    user_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    synced_at INTEGER NOT NULL DEFAULT 0,
    is_dirty INTEGER DEFAULT 0,
    version INTEGER DEFAULT 1
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    avatar_url TEXT,
    last_login_at INTEGER,
    preferences TEXT -- JSON
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at INTEGER NOT NULL
);

-- Cache table for API responses
CREATE TABLE IF NOT EXISTS cache (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    expires_at INTEGER NOT NULL
);

-- Sync queue for offline operations
CREATE TABLE IF NOT EXISTS sync_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    operation TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    attempts INTEGER DEFAULT 0,
    last_error TEXT,
    status TEXT DEFAULT 'pending'
);

-- Sync metadata
CREATE TABLE IF NOT EXISTS sync_metadata (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    last_sync_at INTEGER DEFAULT 0,
    last_sync_status TEXT DEFAULT 'never',
    last_full_sync_at INTEGER DEFAULT 0
);

-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at INTEGER NOT NULL
);

-- Insert initial data
INSERT OR IGNORE INTO sync_metadata (id, last_sync_at, last_sync_status) 
VALUES (1, 0, 'never');

INSERT OR IGNORE INTO schema_version (version, applied_at) 
VALUES (1, strftime('%s', 'now'));

-- Initial settings
INSERT OR IGNORE INTO settings (key, value, updated_at) 
VALUES 
  ('sync_enabled', 'true', strftime('%s', 'now')),
  ('sync_interval', '300', strftime('%s', 'now')),
  ('theme', 'system', strftime('%s', 'now'));

// Database module for offline storage
// Handles SQLite operations and schema management

use rusqlite::{Connection, Result, params};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SyncChange {
    pub id: i64,
    pub table_name: String,
    pub operation: String, // "insert", "update", "delete"
    pub record_id: String,
    pub data: String, // JSON data
    pub created_at: i64,
    pub synced: bool,
}

pub struct Database {
    pub conn: Mutex<Connection>,
}

impl Database {
    /// Initialize database with schema
    pub fn new(db_path: PathBuf) -> Result<Self> {
        let conn = Connection::open(db_path)?;
        
        // Create tables
        conn.execute(
            "CREATE TABLE IF NOT EXISTS sync_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                table_name TEXT NOT NULL,
                operation TEXT NOT NULL,
                record_id TEXT NOT NULL,
                data TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                synced INTEGER NOT NULL DEFAULT 0
            )",
            [],
        )?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_sync_queue_synced 
             ON sync_queue(synced, created_at)",
            [],
        )?;

        // Create cache tables for common entities
        conn.execute(
            "CREATE TABLE IF NOT EXISTS cached_clients (
                id TEXT PRIMARY KEY,
                data TEXT NOT NULL,
                updated_at INTEGER NOT NULL
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS cached_engagements (
                id TEXT PRIMARY KEY,
                client_id TEXT NOT NULL,
                data TEXT NOT NULL,
                updated_at INTEGER NOT NULL
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS cached_tasks (
                id TEXT PRIMARY KEY,
                engagement_id TEXT NOT NULL,
                data TEXT NOT NULL,
                updated_at INTEGER NOT NULL
            )",
            [],
        )?;

        Ok(Database {
            conn: Mutex::new(conn),
        })
    }

    /// Queue a change for sync
    pub fn queue_change(
        &self,
        table_name: &str,
        operation: &str,
        record_id: &str,
        data: &str,
    ) -> Result<i64> {
        let conn = self.conn.lock().unwrap();
        let timestamp = chrono::Utc::now().timestamp();

        conn.execute(
            "INSERT INTO sync_queue (table_name, operation, record_id, data, created_at, synced)
             VALUES (?1, ?2, ?3, ?4, ?5, 0)",
            params![table_name, operation, record_id, data, timestamp],
        )?;

        Ok(conn.last_insert_rowid())
    }

    /// Get pending changes for sync
    pub fn get_pending_changes(&self) -> Result<Vec<SyncChange>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, table_name, operation, record_id, data, created_at, synced
             FROM sync_queue
             WHERE synced = 0
             ORDER BY created_at ASC
             LIMIT 100"
        )?;

        let changes = stmt.query_map([], |row| {
            Ok(SyncChange {
                id: row.get(0)?,
                table_name: row.get(1)?,
                operation: row.get(2)?,
                record_id: row.get(3)?,
                data: row.get(4)?,
                created_at: row.get(5)?,
                synced: row.get(6)?,
            })
        })?;

        changes.collect()
    }

    /// Mark change as synced
    pub fn mark_synced(&self, change_id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE sync_queue SET synced = 1 WHERE id = ?1",
            params![change_id],
        )?;
        Ok(())
    }

    /// Cache entity data
    pub fn cache_entity(&self, table: &str, id: &str, data: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let timestamp = chrono::Utc::now().timestamp();

        match table {
            "clients" => {
                conn.execute(
                    "INSERT OR REPLACE INTO cached_clients (id, data, updated_at)
                     VALUES (?1, ?2, ?3)",
                    params![id, data, timestamp],
                )?;
            }
            "engagements" => {
                // Extract client_id from JSON data (simplified)
                conn.execute(
                    "INSERT OR REPLACE INTO cached_engagements (id, client_id, data, updated_at)
                     VALUES (?1, '', ?2, ?3)",
                    params![id, data, timestamp],
                )?;
            }
            "tasks" => {
                conn.execute(
                    "INSERT OR REPLACE INTO cached_tasks (id, engagement_id, data, updated_at)
                     VALUES (?1, '', ?2, ?3)",
                    params![id, data, timestamp],
                )?;
            }
            _ => {}
        }

        Ok(())
    }

    /// Get cached entity
    pub fn get_cached_entity(&self, table: &str, id: &str) -> Result<Option<String>> {
        let conn = self.conn.lock().unwrap();
        
        let query = match table {
            "clients" => "SELECT data FROM cached_clients WHERE id = ?1",
            "engagements" => "SELECT data FROM cached_engagements WHERE id = ?1",
            "tasks" => "SELECT data FROM cached_tasks WHERE id = ?1",
            _ => return Ok(None),
        };

        let mut stmt = conn.prepare(query)?;
        let mut rows = stmt.query(params![id])?;

        if let Some(row) = rows.next()? {
            Ok(Some(row.get(0)?))
        } else {
            Ok(None)
        }
    }

    /// Clear old synced changes (keep last 7 days)
    pub fn cleanup_old_changes(&self) -> Result<usize> {
        let conn = self.conn.lock().unwrap();
        let seven_days_ago = chrono::Utc::now().timestamp() - (7 * 24 * 60 * 60);

        let deleted = conn.execute(
            "DELETE FROM sync_queue WHERE synced = 1 AND created_at < ?1",
            params![seven_days_ago],
        )?;

        Ok(deleted)
    }
}

use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tauri::Manager;

/// Cached document for offline access
#[derive(Debug, Serialize, Deserialize)]
pub struct CachedDocument {
    pub id: String,
    pub title: String,
    pub content: Option<String>,
    pub doc_type: String,
    pub synced_at: i64,
}

/// Cached task for offline access
#[derive(Debug, Serialize, Deserialize)]
pub struct CachedTask {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub status: String,
    pub due_date: Option<String>,
    pub synced_at: i64,
}

/// Sync data structure
#[derive(Debug, Serialize, Deserialize)]
pub struct SyncData {
    pub documents: Vec<CachedDocument>,
    pub tasks: Vec<CachedTask>,
    pub last_sync: i64,
}

/// Local changes to push to server
#[derive(Debug, Serialize, Deserialize)]
pub struct LocalChanges {
    pub documents: Vec<CachedDocument>,
    pub tasks: Vec<CachedTask>,
}

/// Get the database path in the app data directory
fn get_db_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    // Create directory if it doesn't exist
    std::fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Failed to create app data dir: {}", e))?;

    Ok(app_data_dir.join("prisma_glow.db"))
}

/// Initialize the local SQLite database
#[tauri::command]
pub fn init_local_db(app: AppHandle) -> Result<(), String> {
    let db_path = get_db_path(&app)?;
    let conn = Connection::open(&db_path).map_err(|e| format!("Failed to open database: {}", e))?;

    // Create documents table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS documents (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            content TEXT,
            doc_type TEXT NOT NULL,
            synced_at INTEGER NOT NULL,
            is_dirty INTEGER DEFAULT 0
        )",
        [],
    )
    .map_err(|e| format!("Failed to create documents table: {}", e))?;

    // Create tasks table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT NOT NULL,
            due_date TEXT,
            synced_at INTEGER NOT NULL,
            is_dirty INTEGER DEFAULT 0
        )",
        [],
    )
    .map_err(|e| format!("Failed to create tasks table: {}", e))?;

    // Create cache table for general key-value storage
    conn.execute(
        "CREATE TABLE IF NOT EXISTS cache (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            expires_at INTEGER
        )",
        [],
    )
    .map_err(|e| format!("Failed to create cache table: {}", e))?;

    // Create sync metadata table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS sync_metadata (
            id INTEGER PRIMARY KEY,
            last_sync_at INTEGER,
            last_sync_status TEXT
        )",
        [],
    )
    .map_err(|e| format!("Failed to create sync_metadata table: {}", e))?;

    // Insert initial sync metadata if not exists
    conn.execute(
        "INSERT OR IGNORE INTO sync_metadata (id, last_sync_at, last_sync_status) VALUES (1, 0, 'never')",
        [],
    )
    .map_err(|e| format!("Failed to insert sync metadata: {}", e))?;

    Ok(())
}

/// Sync data from server to local database
#[tauri::command]
pub fn sync_to_local(app: AppHandle, data: SyncData) -> Result<(), String> {
    let db_path = get_db_path(&app)?;
    let conn = Connection::open(&db_path).map_err(|e| format!("Failed to open database: {}", e))?;

    // Sync documents
    for doc in data.documents {
        conn.execute(
            "INSERT OR REPLACE INTO documents (id, title, content, doc_type, synced_at, is_dirty)
             VALUES (?1, ?2, ?3, ?4, ?5, 0)",
            rusqlite::params![doc.id, doc.title, doc.content, doc.doc_type, doc.synced_at],
        )
        .map_err(|e| format!("Failed to sync document: {}", e))?;
    }

    // Sync tasks
    for task in data.tasks {
        conn.execute(
            "INSERT OR REPLACE INTO tasks (id, title, description, status, due_date, synced_at, is_dirty)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0)",
            rusqlite::params![
                task.id,
                task.title,
                task.description,
                task.status,
                task.due_date,
                task.synced_at
            ],
        )
        .map_err(|e| format!("Failed to sync task: {}", e))?;
    }

    // Update sync metadata
    conn.execute(
        "UPDATE sync_metadata SET last_sync_at = ?1, last_sync_status = 'success' WHERE id = 1",
        rusqlite::params![data.last_sync],
    )
    .map_err(|e| format!("Failed to update sync metadata: {}", e))?;

    Ok(())
}

/// Get local changes to push to server
#[tauri::command]
pub fn sync_from_local(app: AppHandle) -> Result<LocalChanges, String> {
    let db_path = get_db_path(&app)?;
    let conn = Connection::open(&db_path).map_err(|e| format!("Failed to open database: {}", e))?;

    // Get dirty documents
    let mut stmt = conn
        .prepare("SELECT id, title, content, doc_type, synced_at FROM documents WHERE is_dirty = 1")
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let documents = stmt
        .query_map([], |row| {
            Ok(CachedDocument {
                id: row.get(0)?,
                title: row.get(1)?,
                content: row.get(2)?,
                doc_type: row.get(3)?,
                synced_at: row.get(4)?,
            })
        })
        .map_err(|e| format!("Failed to query documents: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect documents: {}", e))?;

    // Get dirty tasks
    let mut stmt = conn
        .prepare(
            "SELECT id, title, description, status, due_date, synced_at FROM tasks WHERE is_dirty = 1",
        )
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let tasks = stmt
        .query_map([], |row| {
            Ok(CachedTask {
                id: row.get(0)?,
                title: row.get(1)?,
                description: row.get(2)?,
                status: row.get(3)?,
                due_date: row.get(4)?,
                synced_at: row.get(5)?,
            })
        })
        .map_err(|e| format!("Failed to query tasks: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect tasks: {}", e))?;

    Ok(LocalChanges { documents, tasks })
}

/// Get offline data from a specific table
#[tauri::command]
pub fn get_offline_data(app: AppHandle, table: String) -> Result<Vec<serde_json::Value>, String> {
    let db_path = get_db_path(&app)?;
    let conn = Connection::open(&db_path).map_err(|e| format!("Failed to open database: {}", e))?;

    match table.as_str() {
        "documents" => {
            let mut stmt = conn
                .prepare(
                    "SELECT id, title, content, doc_type, synced_at FROM documents ORDER BY synced_at DESC",
                )
                .map_err(|e| format!("Failed to prepare statement: {}", e))?;

            let results = stmt
                .query_map([], |row| {
                    Ok(serde_json::json!({
                        "id": row.get::<_, String>(0)?,
                        "title": row.get::<_, String>(1)?,
                        "content": row.get::<_, Option<String>>(2)?,
                        "doc_type": row.get::<_, String>(3)?,
                        "synced_at": row.get::<_, i64>(4)?
                    }))
                })
                .map_err(|e| format!("Failed to query: {}", e))?
                .collect::<Result<Vec<_>, _>>()
                .map_err(|e| format!("Failed to collect results: {}", e))?;

            Ok(results)
        }
        "tasks" => {
            let mut stmt = conn
                .prepare(
                    "SELECT id, title, description, status, due_date, synced_at FROM tasks ORDER BY due_date ASC",
                )
                .map_err(|e| format!("Failed to prepare statement: {}", e))?;

            let results = stmt
                .query_map([], |row| {
                    Ok(serde_json::json!({
                        "id": row.get::<_, String>(0)?,
                        "title": row.get::<_, String>(1)?,
                        "description": row.get::<_, Option<String>>(2)?,
                        "status": row.get::<_, String>(3)?,
                        "due_date": row.get::<_, Option<String>>(4)?,
                        "synced_at": row.get::<_, i64>(5)?
                    }))
                })
                .map_err(|e| format!("Failed to query: {}", e))?
                .collect::<Result<Vec<_>, _>>()
                .map_err(|e| format!("Failed to collect results: {}", e))?;

            Ok(results)
        }
        _ => Err(format!("Unknown table: {}", table)),
    }
}

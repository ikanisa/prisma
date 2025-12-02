// Sync commands for desktop app
// Full bidirectional sync implementation

use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

use crate::AppState;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Document {
    pub id: String,
    pub title: String,
    pub content: Option<String>,
    pub user_id: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub synced_at: i64,
    pub is_dirty: bool,
}

// Save documents to local database
#[tauri::command]
pub async fn save_documents_local(
    state: State<'_, AppState>,
    documents: Vec<Document>,
) -> Result<usize, String> {
    let conn_guard = state.db_conn.lock().unwrap();
    let conn = conn_guard.as_ref().ok_or("Database not initialized")?;

    let mut count = 0;
    for doc in documents {
        conn.execute(
            "INSERT OR REPLACE INTO documents 
             (id, title, content, user_id, created_at, updated_at, synced_at, is_dirty)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                doc.id,
                doc.title,
                doc.content,
                doc.user_id,
                doc.created_at,
                doc.updated_at,
                doc.synced_at,
                if doc.is_dirty { 1 } else { 0 }
            ],
        )
        .map_err(|e| e.to_string())?;
        count += 1;
    }

    // Update sync metadata
    let now = chrono::Utc::now().timestamp();
    conn.execute(
        "UPDATE sync_metadata SET last_sync_at = ?1, last_sync_status = ?2 WHERE id = 1",
        params![now, "success"],
    )
    .map_err(|e| e.to_string())?;

    Ok(count)
}

// Get local documents
#[tauri::command]
pub async fn get_local_documents(
    state: State<'_, AppState>,
) -> Result<Vec<Document>, String> {
    let conn_guard = state.db_conn.lock().unwrap();
    let conn = conn_guard.as_ref().ok_or("Database not initialized")?;

    let mut stmt = conn
        .prepare("SELECT id, title, content, user_id, created_at, updated_at, synced_at, is_dirty FROM documents ORDER BY updated_at DESC")
        .map_err(|e| e.to_string())?;

    let documents = stmt
        .query_map([], |row| {
            Ok(Document {
                id: row.get(0)?,
                title: row.get(1)?,
                content: row.get(2)?,
                user_id: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
                synced_at: row.get(6)?,
                is_dirty: row.get::<_, i32>(7)? == 1,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(documents)
}

// Get dirty documents (need sync)
#[tauri::command]
pub async fn get_dirty_documents(
    state: State<'_, AppState>,
) -> Result<Vec<Document>, String> {
    let conn_guard = state.db_conn.lock().unwrap();
    let conn = conn_guard.as_ref().ok_or("Database not initialized")?;

    let mut stmt = conn
        .prepare("SELECT id, title, content, user_id, created_at, updated_at, synced_at, is_dirty FROM documents WHERE is_dirty = 1")
        .map_err(|e| e.to_string())?;

    let documents = stmt
        .query_map([], |row| {
            Ok(Document {
                id: row.get(0)?,
                title: row.get(1)?,
                content: row.get(2)?,
                user_id: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
                synced_at: row.get(6)?,
                is_dirty: row.get::<_, i32>(7)? == 1,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(documents)
}

// Mark document as synced
#[tauri::command]
pub async fn mark_document_synced(
    state: State<'_, AppState>,
    document_id: String,
) -> Result<(), String> {
    let conn_guard = state.db_conn.lock().unwrap();
    let conn = conn_guard.as_ref().ok_or("Database not initialized")?;

    let now = chrono::Utc::now().timestamp();
    conn.execute(
        "UPDATE documents SET is_dirty = 0, synced_at = ?1 WHERE id = ?2",
        params![now, document_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

// Full bidirectional sync
#[tauri::command]
pub async fn sync_all_data(
    state: State<'_, AppState>,
    auth_token: String,
) -> Result<SyncResult, String> {
    let supabase_url = std::env::var("NEXT_PUBLIC_SUPABASE_URL")
        .unwrap_or_else(|_| "YOUR_SUPABASE_URL".to_string());
    let supabase_key = std::env::var("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        .unwrap_or_else(|_| "YOUR_SUPABASE_KEY".to_string());

    let client = reqwest::Client::new();
    let mut result = SyncResult {
        downloaded: 0,
        uploaded: 0,
        conflicts: 0,
        errors: Vec::new(),
    };

    // Step 1: Get dirty local documents
    let dirty_docs = get_dirty_documents(state.clone()).await?;

    // Step 2: Upload dirty documents to server
    for doc in dirty_docs {
        match client
            .post(format!("{}/rest/v1/documents", supabase_url))
            .header("apikey", &supabase_key)
            .bearer_auth(&auth_token)
            .json(&doc)
            .send()
            .await
        {
            Ok(response) => {
                if response.status().is_success() {
                    mark_document_synced(state.clone(), doc.id).await?;
                    result.uploaded += 1;
                } else {
                    result.errors.push(format!("Upload failed for {}: {}", doc.id, response.status()));
                }
            }
            Err(e) => {
                result.errors.push(format!("Upload error for {}: {}", doc.id, e));
            }
        }
    }

    // Step 3: Download documents from server
    match client
        .get(format!("{}/rest/v1/documents?select=*", supabase_url))
        .header("apikey", &supabase_key)
        .bearer_auth(&auth_token)
        .send()
        .await
    {
        Ok(response) => {
            if response.status().is_success() {
                let server_docs: Vec<Document> = response.json().await.map_err(|e| e.to_string())?;
                let count = save_documents_local(state.clone(), server_docs).await?;
                result.downloaded = count;
            } else {
                result.errors.push(format!("Download failed: {}", response.status()));
            }
        }
        Err(e) => {
            result.errors.push(format!("Download error: {}", e));
        }
    }

    Ok(result)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SyncResult {
    pub downloaded: usize,
    pub uploaded: usize,
    pub conflicts: usize,
    pub errors: Vec<String>,
}

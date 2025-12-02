// Tauri commands for database operations

use crate::database::Database;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct QueueChangeRequest {
    pub table_name: String,
    pub operation: String,
    pub record_id: String,
    pub data: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SyncResult {
    pub success: bool,
    pub synced_count: usize,
    pub pending_count: usize,
    pub error: Option<String>,
}

/// Queue a change for sync to server
#[tauri::command]
pub async fn queue_change(
    db: State<'_, Database>,
    request: QueueChangeRequest,
) -> Result<i64, String> {
    db.queue_change(
        &request.table_name,
        &request.operation,
        &request.record_id,
        &request.data,
    )
    .map_err(|e| e.to_string())
}

/// Get all pending changes
#[tauri::command]
pub async fn get_pending_changes(db: State<'_, Database>) -> Result<Vec<crate::database::SyncChange>, String> {
    db.get_pending_changes().map_err(|e| e.to_string())
}

/// Mark a change as synced
#[tauri::command]
pub async fn mark_change_synced(
    db: State<'_, Database>,
    change_id: i64,
) -> Result<(), String> {
    db.mark_synced(change_id).map_err(|e| e.to_string())
}

/// Cache entity data locally
#[tauri::command]
pub async fn cache_entity(
    db: State<'_, Database>,
    table: String,
    id: String,
    data: String,
) -> Result<(), String> {
    db.cache_entity(&table, &id, &data)
        .map_err(|e| e.to_string())
}

/// Get cached entity data
#[tauri::command]
pub async fn get_cached_entity(
    db: State<'_, Database>,
    table: String,
    id: String,
) -> Result<Option<String>, String> {
    db.get_cached_entity(&table, &id)
        .map_err(|e| e.to_string())
}

/// Cleanup old synced changes
#[tauri::command]
pub async fn cleanup_sync_queue(db: State<'_, Database>) -> Result<usize, String> {
    db.cleanup_old_changes().map_err(|e| e.to_string())
}

/// Sync pending changes to server
#[tauri::command]
pub async fn sync_to_server(
    db: State<'_, Database>,
) -> Result<SyncResult, String> {
    // Get pending changes
    let pending = db.get_pending_changes()
        .map_err(|e| e.to_string())?;

    let total_pending = pending.len();

    // TODO: Actually sync to server via API
    // For now, this is a placeholder that marks all as synced
    // In production, this would:
    // 1. Send changes to API endpoint
    // 2. Handle conflicts
    // 3. Mark as synced only if successful

    let mut synced_count = 0;

    for change in &pending {
        // Placeholder: mark as synced
        // In production: send to API and only mark if successful
        if let Err(e) = db.mark_synced(change.id) {
            return Ok(SyncResult {
                success: false,
                synced_count,
                pending_count: total_pending - synced_count,
                error: Some(e.to_string()),
            });
        }
        synced_count += 1;
    }

    Ok(SyncResult {
        success: true,
        synced_count,
        pending_count: 0,
        error: None,
    })
}

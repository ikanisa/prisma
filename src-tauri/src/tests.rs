#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_auth_token_serialization() {
        let token = AuthToken {
            access_token: "test_access".to_string(),
            refresh_token: "test_refresh".to_string(),
            expires_at: 1234567890,
        };

        let json = serde_json::to_string(&token).unwrap();
        assert!(json.contains("test_access"));
        
        let deserialized: AuthToken = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.access_token, "test_access");
    }

    #[test]
    fn test_user_serialization() {
        let user = User {
            id: "user123".to_string(),
            email: "test@example.com".to_string(),
            name: Some("Test User".to_string()),
        };

        let json = serde_json::to_string(&user).unwrap();
        assert!(json.contains("user123"));
    }

    #[test]
    fn test_sync_status_serialization() {
        let status = SyncStatus {
            last_sync_at: Some(1234567890),
            last_sync_status: "success".to_string(),
            pending_items: 0,
        };

        let json = serde_json::to_string(&status).unwrap();
        assert!(json.contains("success"));
    }

    #[tokio::test]
    async fn test_init_local_db() {
        let state = AppState::default();
        
        // Initialize database in memory
        let result = init_local_db_internal(&state, ":memory:".to_string()).await;
        assert!(result.is_ok());
    }

    #[test]
    fn test_get_app_version() {
        let version = get_app_version();
        assert!(!version.is_empty());
        assert_eq!(version, env!("CARGO_PKG_VERSION"));
    }

    #[test]
    fn test_get_platform() {
        let platform = get_platform();
        assert!(!platform.is_empty());
        #[cfg(target_os = "macos")]
        assert_eq!(platform, "macos");
        #[cfg(target_os = "windows")]
        assert_eq!(platform, "windows");
        #[cfg(target_os = "linux")]
        assert_eq!(platform, "linux");
    }
}

// Helper function for testing
async fn init_local_db_internal(state: &AppState, path: String) -> Result<(), String> {
    let conn = rusqlite::Connection::open(path).map_err(|e| e.to_string())?;
    
    conn.execute(
        "CREATE TABLE IF NOT EXISTS documents (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            content TEXT,
            user_id TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            synced_at INTEGER DEFAULT 0,
            is_dirty INTEGER DEFAULT 0
        )",
        [],
    )
    .map_err(|e| e.to_string())?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS sync_metadata (
            id INTEGER PRIMARY KEY,
            last_sync_at INTEGER,
            last_sync_status TEXT,
            pending_items INTEGER DEFAULT 0
        )",
        [],
    )
    .map_err(|e| e.to_string())?;

    let mut db_conn = state.db_conn.lock().unwrap();
    *db_conn = Some(conn);

    Ok(())
}

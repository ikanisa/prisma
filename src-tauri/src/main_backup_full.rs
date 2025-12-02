// Prevents additional console window on Windows in release mode
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod sync_commands;
mod shortcuts;

use tauri::Manager;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use sync_commands::*;

// ============================================================================
// DATA STRUCTURES
// ============================================================================

#[derive(Debug, Serialize, Deserialize, Clone)]
struct AuthToken {
    access_token: String,
    refresh_token: String,
    expires_at: i64,
}

#[derive(Debug, Serialize, Deserialize)]
struct User {
    id: String,
    email: String,
    name: Option<String>,
}

struct AppState {
    db_conn: Mutex<Option<rusqlite::Connection>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            db_conn: Mutex::new(None),
        }
    }
}

// ============================================================================
// AUTHENTICATION COMMANDS
// ============================================================================

#[tauri::command]
async fn login(email: String, password: String) -> Result<(User, AuthToken), String> {
    // Get Supabase URL from environment or config
    let supabase_url = std::env::var("NEXT_PUBLIC_SUPABASE_URL")
        .unwrap_or_else(|_| "YOUR_SUPABASE_URL".to_string());
    let supabase_key = std::env::var("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        .unwrap_or_else(|_| "YOUR_SUPABASE_KEY".to_string());

    // Call Supabase auth API
    let client = reqwest::Client::new();
    let auth_url = format!("{}/auth/v1/token?grant_type=password", supabase_url);
    
    let response = client
        .post(&auth_url)
        .header("apikey", &supabase_key)
        .json(&serde_json::json!({
            "email": email,
            "password": password
        }))
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Login failed ({}): {}", status, error_text));
    }

    let auth_data: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    // Extract tokens
    let access_token = auth_data["access_token"]
        .as_str()
        .ok_or("No access token")?
        .to_string();
    let refresh_token = auth_data["refresh_token"]
        .as_str()
        .ok_or("No refresh token")?
        .to_string();
    let expires_in = auth_data["expires_in"].as_i64().unwrap_or(3600);
    let expires_at = chrono::Utc::now().timestamp() + expires_in;

    let token = AuthToken {
        access_token: access_token.clone(),
        refresh_token,
        expires_at,
    };

    // Store in macOS Keychain
    #[cfg(target_os = "macos")]
    {
        let entry = keyring::Entry::new("com.prismaglow.desktop", "auth_token")
            .map_err(|e| format!("Keychain error: {}", e))?;
        entry
            .set_password(&serde_json::to_string(&token).unwrap())
            .map_err(|e| format!("Failed to store token: {}", e))?;
    }

    // Fetch user profile
    let user_response = client
        .get(format!("{}/auth/v1/user", supabase_url))
        .header("apikey", &supabase_key)
        .bearer_auth(&access_token)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch user: {}", e))?;

    let user_data: serde_json::Value = user_response
        .json()
        .await
        .map_err(|e| format!("Failed to parse user: {}", e))?;

    let user = User {
        id: user_data["id"].as_str().unwrap_or("").to_string(),
        email: user_data["email"].as_str().unwrap_or(&email).to_string(),
        name: user_data["user_metadata"]["name"]
            .as_str()
            .map(|s| s.to_string()),
    };

    Ok((user, token))
}

#[tauri::command]
async fn logout() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let entry = keyring::Entry::new("com.prismaglow.desktop", "auth_token")
            .map_err(|e| format!("Keychain error: {}", e))?;
        let _ = entry.delete_password(); // Ignore if not exists
    }
    Ok(())
}

#[tauri::command]
async fn get_stored_token() -> Result<Option<AuthToken>, String> {
    #[cfg(target_os = "macos")]
    {
        let entry = keyring::Entry::new("com.prismaglow.desktop", "auth_token")
            .map_err(|e| format!("Keychain error: {}", e))?;
        
        match entry.get_password() {
            Ok(token_str) => {
                let token: AuthToken = serde_json::from_str(&token_str)
                    .map_err(|e| format!("Invalid token format: {}", e))?;
                
                // Check if expired
                if token.expires_at < chrono::Utc::now().timestamp() {
                    return Ok(None);
                }
                
                Ok(Some(token))
            }
            Err(_) => Ok(None),
        }
    }
    
    #[cfg(not(target_os = "macos"))]
    Ok(None)
}

// ============================================================================
// DATABASE COMMANDS
// ============================================================================

#[tauri::command]
async fn init_local_db(app_handle: tauri::AppHandle, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    
    std::fs::create_dir_all(&app_data_dir).map_err(|e| e.to_string())?;
    
    let db_path = app_data_dir.join("prisma.db");
    let conn = rusqlite::Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    // Create tables
    conn.execute(
        "CREATE TABLE IF NOT EXISTS documents (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            content TEXT,
            user_id TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            synced_at INTEGER NOT NULL,
            is_dirty INTEGER DEFAULT 0
        )",
        [],
    )
    .map_err(|e| format!("Failed to create documents table: {}", e))?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS sync_metadata (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            last_sync_at INTEGER,
            last_sync_status TEXT
        )",
        [],
    )
    .map_err(|e| format!("Failed to create sync_metadata table: {}", e))?;

    conn.execute(
        "INSERT OR IGNORE INTO sync_metadata (id, last_sync_at, last_sync_status) VALUES (1, 0, 'never')",
        [],
    )
    .map_err(|e| format!("Failed to insert sync metadata: {}", e))?;

    // Store connection in state
    *state.db_conn.lock().unwrap() = Some(conn);

    Ok(())
}

#[tauri::command]
async fn get_sync_status(state: tauri::State<'_, AppState>) -> Result<serde_json::Value, String> {
    let conn_guard = state.db_conn.lock().unwrap();
    let conn = conn_guard.as_ref().ok_or("Database not initialized")?;

    let mut stmt = conn
        .prepare("SELECT last_sync_at, last_sync_status FROM sync_metadata WHERE id = 1")
        .map_err(|e| e.to_string())?;

    let result = stmt.query_row([], |row| {
        Ok(serde_json::json!({
            "last_sync_at": row.get::<_, i64>(0)?,
            "last_sync_status": row.get::<_, String>(1)?
        }))
    }).map_err(|e| e.to_string())?;

    Ok(result)
}

// ============================================================================
// API COMMANDS
// ============================================================================

#[tauri::command]
async fn api_get(endpoint: String, token: String) -> Result<serde_json::Value, String> {
    let base_url = std::env::var("NEXT_PUBLIC_API_URL")
        .unwrap_or_else(|_| "https://api.prisma-glow.com".to_string());
    
    let url = format!("{}/{}", base_url, endpoint.trim_start_matches('/'));
    
    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .bearer_auth(&token)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("API error: {}", response.status()));
    }

    response.json().await.map_err(|e| format!("Parse error: {}", e))
}

#[tauri::command]
async fn api_post(endpoint: String, body: serde_json::Value, token: String) -> Result<serde_json::Value, String> {
    let base_url = std::env::var("NEXT_PUBLIC_API_URL")
        .unwrap_or_else(|_| "https://api.prisma-glow.com".to_string());
    
    let url = format!("{}/{}", base_url, endpoint.trim_start_matches('/'));
    
    let client = reqwest::Client::new();
    let response = client
        .post(&url)
        .bearer_auth(&token)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("API error: {}", response.status()));
    }

    response.json().await.map_err(|e| format!("Parse error: {}", e))
}

// ============================================================================
// FILE SYSTEM COMMANDS
// ============================================================================

#[tauri::command]
async fn read_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
async fn write_file(path: String, contents: String) -> Result<(), String> {
    std::fs::write(path, contents).map_err(|e| e.to_string())
}

// ============================================================================
// SYSTEM COMMANDS
// ============================================================================

#[tauri::command]
fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
fn get_platform() -> String {
    std::env::consts::OS.to_string()
}

// ============================================================================
// MAIN
// ============================================================================

fn main() {
    tauri::Builder::default()
        .menu(shortcuts::create_menu())
        .on_menu_event(shortcuts::handle_menu_event)
        .setup(|app| {
            // Open DevTools in debug mode
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            // Auth
            login,
            logout,
            get_stored_token,
            // Database
            init_local_db,
            get_sync_status,
            // API
            api_get,
            api_post,
            // Sync
            sync_all_data,
            save_documents_local,
            get_local_documents,
            get_dirty_documents,
            mark_document_synced,
            // File system
            read_file,
            write_file,
            // System
            get_app_version,
            get_platform,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

use serde::{Deserialize, Serialize};

/// Update check result
#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateCheckResult {
    pub available: bool,
    pub version: Option<String>,
    pub notes: Option<String>,
    pub date: Option<String>,
}

/// Check for available updates
#[tauri::command]
pub async fn check_for_update(app_handle: tauri::AppHandle) -> Result<UpdateCheckResult, String> {
    match app_handle.updater().check().await {
        Ok(update) => {
            if update.is_update_available() {
                Ok(UpdateCheckResult {
                    available: true,
                    version: Some(update.latest_version().to_string()),
                    notes: update.body().map(|s| s.to_string()),
                    date: update.date().map(|d| d.to_string()),
                })
            } else {
                Ok(UpdateCheckResult {
                    available: false,
                    version: None,
                    notes: None,
                    date: None,
                })
            }
        }
        Err(e) => Err(format!("Failed to check for updates: {}", e)),
    }
}

/// Get the current application version
#[tauri::command]
pub fn get_current_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

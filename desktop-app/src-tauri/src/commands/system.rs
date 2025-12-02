use serde::Serialize;
use tauri::AppHandle;

/// Update check result
#[derive(Debug, Serialize)]
pub struct UpdateCheckResult {
    pub available: bool,
    pub version: Option<String>,
    pub notes: Option<String>,
}

/// Get the current application version
#[tauri::command]
pub fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Get the current platform
#[tauri::command]
pub fn get_platform() -> String {
    std::env::consts::OS.to_string()
}

/// Get the system theme (light or dark)
#[tauri::command]
pub fn get_system_theme() -> String {
    #[cfg(target_os = "macos")]
    {
        // On macOS, check system appearance
        // For now, return a default; full implementation requires Objective-C bindings
        "system".to_string()
    }

    #[cfg(not(target_os = "macos"))]
    {
        "system".to_string()
    }
}

/// Check for application updates
#[tauri::command]
pub async fn check_for_updates(app: AppHandle) -> Result<UpdateCheckResult, String> {
    use tauri_plugin_updater::UpdaterExt;

    match app.updater() {
        Ok(updater) => match updater.check().await {
            Ok(Some(update)) => Ok(UpdateCheckResult {
                available: true,
                version: Some(update.version.clone()),
                notes: update.body.clone(),
            }),
            Ok(None) => Ok(UpdateCheckResult {
                available: false,
                version: None,
                notes: None,
            }),
            Err(e) => Err(format!("Failed to check for updates: {}", e)),
        },
        Err(e) => Err(format!("Updater not available: {}", e)),
    }
}

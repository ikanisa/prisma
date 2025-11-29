use tauri::Window;

/// Minimize the application window
#[tauri::command]
pub fn minimize_window(window: Window) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

/// Toggle maximize/restore the application window
#[tauri::command]
pub fn maximize_window(window: Window) -> Result<(), String> {
    if window.is_maximized().unwrap_or(false) {
        window.unmaximize().map_err(|e| e.to_string())
    } else {
        window.maximize().map_err(|e| e.to_string())
    }
}

/// Close the application window
#[tauri::command]
pub fn close_window(window: Window) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())
}

/// Toggle fullscreen mode
#[tauri::command]
pub fn toggle_fullscreen(window: Window) -> Result<(), String> {
    let is_fullscreen = window.is_fullscreen().unwrap_or(false);
    window.set_fullscreen(!is_fullscreen).map_err(|e| e.to_string())
}

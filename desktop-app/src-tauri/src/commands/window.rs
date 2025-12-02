use tauri::{AppHandle, WebviewWindow};

/// Minimize the application window
#[tauri::command]
pub fn minimize_window(window: WebviewWindow) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

/// Toggle maximize/restore the application window
#[tauri::command]
pub fn maximize_window(window: WebviewWindow) -> Result<(), String> {
    if window.is_maximized().unwrap_or(false) {
        window.unmaximize().map_err(|e| e.to_string())
    } else {
        window.maximize().map_err(|e| e.to_string())
    }
}

/// Close the application window
#[tauri::command]
pub fn close_window(window: WebviewWindow) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())
}

/// Toggle fullscreen mode
#[tauri::command]
pub fn toggle_fullscreen(window: WebviewWindow) -> Result<(), String> {
    let is_fullscreen = window.is_fullscreen().unwrap_or(false);
    window
        .set_fullscreen(!is_fullscreen)
        .map_err(|e| e.to_string())
}

/// Window state information
#[derive(serde::Serialize)]
pub struct WindowState {
    pub is_maximized: bool,
    pub is_fullscreen: bool,
    pub is_minimized: bool,
    pub is_visible: bool,
    pub is_focused: bool,
}

/// Get current window state
#[tauri::command]
pub fn get_window_state(window: WebviewWindow) -> Result<WindowState, String> {
    Ok(WindowState {
        is_maximized: window.is_maximized().unwrap_or(false),
        is_fullscreen: window.is_fullscreen().unwrap_or(false),
        is_minimized: window.is_minimized().unwrap_or(false),
        is_visible: window.is_visible().unwrap_or(true),
        is_focused: window.is_focused().unwrap_or(false),
    })
}

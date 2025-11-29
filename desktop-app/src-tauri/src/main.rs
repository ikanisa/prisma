// Prevents additional console window on Windows in release mode
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

// File system commands
#[tauri::command]
async fn select_file() -> Result<String, String> {
    use tauri_plugin_dialog::DialogExt;
    
    tauri::async_runtime::spawn(async {
        // File picker implementation would go here
        Ok::<String, String>(String::from(""))
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn read_file(path: String) -> Result<String, String> {
    use std::fs;
    fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
async fn write_file(path: String, contents: String) -> Result<(), String> {
    use std::fs;
    fs::write(path, contents).map_err(|e| e.to_string())
}

// System commands
#[tauri::command]
fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
fn get_platform() -> String {
    std::env::consts::OS.to_string()
}

// App state
#[derive(Default)]
struct AppState {
    // Add application state here
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // Setup code here
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
            select_file,
            read_file,
            write_file,
            get_app_version,
            get_platform,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod commands;

use tauri::{CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem};

fn main() {
    // Create system tray menu items
    let quit = CustomMenuItem::new("quit".to_string(), "Quit");
    let show = CustomMenuItem::new("show".to_string(), "Show");
    let hide = CustomMenuItem::new("hide".to_string(), "Hide");
    let new_task = CustomMenuItem::new("new_task".to_string(), "New Task");
    let ask_ai = CustomMenuItem::new("ask_ai".to_string(), "Ask AI...");
    let sync = CustomMenuItem::new("sync".to_string(), "Sync Now");

    // Build the system tray menu
    let tray_menu = SystemTrayMenu::new()
        .add_item(ask_ai)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(new_task)
        .add_item(sync)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(show)
        .add_item(hide)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(quit);

    let system_tray = SystemTray::new().with_menu(tray_menu);

    tauri::Builder::default()
        .system_tray(system_tray)
        .plugin(tauri_plugin_store::Builder::default().build())
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::LeftClick {
                position: _,
                size: _,
                ..
            } => {
                if let Some(window) = app.get_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
                "quit" => {
                    std::process::exit(0);
                }
                "show" => {
                    if let Some(window) = app.get_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
                "hide" => {
                    if let Some(window) = app.get_window("main") {
                        let _ = window.hide();
                    }
                }
                "ask_ai" => {
                    let _ = app.emit_all("open-ai-dialog", ());
                }
                "new_task" => {
                    let _ = app.emit_all("open-new-task", ());
                }
                "sync" => {
                    let _ = app.emit_all("trigger-sync", ());
                }
                _ => {}
            },
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            // Window commands
            commands::window::minimize_window,
            commands::window::maximize_window,
            commands::window::close_window,
            commands::window::toggle_fullscreen,
            // File system commands
            commands::file_system::open_file_dialog,
            commands::file_system::save_file_dialog,
            commands::file_system::read_file,
            commands::file_system::write_file,
            commands::file_system::list_directory,
            // Database commands
            commands::database::init_local_db,
            commands::database::sync_to_local,
            commands::database::sync_from_local,
            commands::database::get_offline_data,
            // Updater commands
            commands::updater::check_for_update,
            commands::updater::get_current_version,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

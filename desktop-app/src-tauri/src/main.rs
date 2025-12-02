// Prevents additional console window on Windows in release mode
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent,
};

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // Setup system tray
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let show = MenuItem::with_id(app, "show", "Show Window", true, None::<&str>)?;
            let hide = MenuItem::with_id(app, "hide", "Hide Window", true, None::<&str>)?;
            let sync = MenuItem::with_id(app, "sync", "Sync Now", true, None::<&str>)?;
            let new_task = MenuItem::with_id(app, "new_task", "New Task...", true, None::<&str>)?;
            let ask_ai = MenuItem::with_id(app, "ask_ai", "Ask AI...", true, None::<&str>)?;

            let menu = Menu::with_items(
                app,
                &[&ask_ai, &new_task, &sync, &show, &hide, &quit],
            )?;

            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .icon(app.default_window_icon().unwrap().clone())
                .menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "hide" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.hide();
                        }
                    }
                    "sync" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.emit("trigger-sync", ());
                        }
                    }
                    "new_task" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.emit("open-new-task", ());
                        }
                    }
                    "ask_ai" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.emit("open-ai-dialog", ());
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            // Setup devtools in debug mode
            #[cfg(debug_assertions)]
            {
                if let Some(window) = app.get_webview_window("main") {
                    window.open_devtools();
                }
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            // Hide window instead of closing when clicking the close button
            if let WindowEvent::CloseRequested { api, .. } = event {
                #[cfg(not(target_os = "macos"))]
                {
                    window.hide().unwrap();
                    api.prevent_close();
                }
                #[cfg(target_os = "macos")]
                {
                    // On macOS, hide the window but keep the app running
                    tauri::AppHandle::hide(window.app_handle()).unwrap();
                    api.prevent_close();
                }
            }
        })
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_os::init())
        .invoke_handler(tauri::generate_handler![
            // Window commands
            commands::window::minimize_window,
            commands::window::maximize_window,
            commands::window::close_window,
            commands::window::toggle_fullscreen,
            commands::window::get_window_state,
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
            // System commands
            commands::system::get_app_version,
            commands::system::get_platform,
            commands::system::get_system_theme,
            commands::system::check_for_updates,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

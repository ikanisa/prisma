use tauri::{
    CustomMenuItem, Manager, Runtime, SystemTray, SystemTrayEvent, SystemTrayMenu,
    SystemTrayMenuItem,
};

/// Build the system tray configuration
pub fn build_system_tray() -> SystemTray {
    let tray_menu = build_tray_menu();
    SystemTray::new().with_menu(tray_menu)
}

/// Build the tray menu with all items
fn build_tray_menu() -> SystemTrayMenu {
    // Primary actions
    let ask_ai = CustomMenuItem::new("ask_ai", "Ask AI...")
        .accelerator("CmdOrCtrl+Shift+A");
    let new_task = CustomMenuItem::new("new_task", "New Task")
        .accelerator("CmdOrCtrl+Shift+T");
    
    // Sync actions
    let sync = CustomMenuItem::new("sync", "Sync Now")
        .accelerator("CmdOrCtrl+Shift+S");
    
    // Window controls
    let show = CustomMenuItem::new("show", "Show Window");
    let hide = CustomMenuItem::new("hide", "Hide Window");
    
    // Quick navigation
    let dashboard = CustomMenuItem::new("dashboard", "Open Dashboard");
    let documents = CustomMenuItem::new("documents", "Documents");
    let tasks_menu = CustomMenuItem::new("tasks", "Tasks");
    
    // System
    let preferences = CustomMenuItem::new("preferences", "Preferences...");
    let quit = CustomMenuItem::new("quit", "Quit Prisma Glow");

    SystemTrayMenu::new()
        // Primary actions
        .add_item(ask_ai)
        .add_native_item(SystemTrayMenuItem::Separator)
        // Quick create
        .add_item(new_task)
        .add_native_item(SystemTrayMenuItem::Separator)
        // Navigation
        .add_item(dashboard)
        .add_item(documents)
        .add_item(tasks_menu)
        .add_native_item(SystemTrayMenuItem::Separator)
        // Sync
        .add_item(sync)
        .add_native_item(SystemTrayMenuItem::Separator)
        // Window
        .add_item(show)
        .add_item(hide)
        .add_native_item(SystemTrayMenuItem::Separator)
        // System
        .add_item(preferences)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(quit)
}

/// Handle system tray events
pub fn handle_tray_event<R: Runtime>(app: &tauri::AppHandle<R>, event: SystemTrayEvent) {
    match event {
        SystemTrayEvent::LeftClick { .. } => {
            // Show and focus the main window on left click
            if let Some(window) = app.get_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
        SystemTrayEvent::DoubleClick { .. } => {
            // Toggle window visibility on double click
            if let Some(window) = app.get_window("main") {
                if window.is_visible().unwrap_or(false) {
                    let _ = window.hide();
                } else {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        }
        SystemTrayEvent::MenuItemClick { id, .. } => {
            handle_menu_click(app, &id);
        }
        _ => {}
    }
}

/// Handle menu item clicks
fn handle_menu_click<R: Runtime>(app: &tauri::AppHandle<R>, id: &str) {
    match id {
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
            let _ = app.emit_all("navigate", "/ai-assistant");
            show_window(app);
        }
        "new_task" => {
            let _ = app.emit_all("navigate", "/tasks/new");
            show_window(app);
        }
        "sync" => {
            let _ = app.emit_all("trigger-sync", ());
        }
        "dashboard" => {
            let _ = app.emit_all("navigate", "/dashboard");
            show_window(app);
        }
        "documents" => {
            let _ = app.emit_all("navigate", "/documents");
            show_window(app);
        }
        "tasks" => {
            let _ = app.emit_all("navigate", "/tasks");
            show_window(app);
        }
        "preferences" => {
            let _ = app.emit_all("navigate", "/settings");
            show_window(app);
        }
        _ => {}
    }
}

/// Helper to show and focus the main window
fn show_window<R: Runtime>(app: &tauri::AppHandle<R>) {
    if let Some(window) = app.get_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

/// Update the tray icon badge (for notification count)
#[allow(dead_code)]
pub fn update_badge<R: Runtime>(app: &tauri::AppHandle<R>, count: u32) {
    // Note: Badge support varies by platform
    // This is a placeholder for future implementation
    let _ = app.emit_all("badge-update", count);
}

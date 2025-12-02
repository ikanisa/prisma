use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

/// Information about a file or directory
#[derive(Debug, Serialize, Deserialize)]
pub struct PathInfo {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
}

/// Result of opening a file dialog
#[derive(Debug, Serialize, Deserialize)]
pub struct FileOpenResult {
    pub path: String,
    pub content: String,
}

/// Filter for file dialogs
#[derive(Debug, Deserialize)]
pub struct FileFilter {
    pub name: String,
    pub extensions: Vec<String>,
}

/// Open a native file picker dialog
#[tauri::command]
pub async fn open_file_dialog(
    app: tauri::AppHandle,
    filters: Option<Vec<FileFilter>>,
) -> Result<Option<FileOpenResult>, String> {
    use tauri_plugin_dialog::DialogExt;

    let mut builder = app.dialog().file();

    if let Some(filter_list) = filters {
        for filter in filter_list {
            let extensions: Vec<&str> = filter.extensions.iter().map(|s| s.as_str()).collect();
            builder = builder.add_filter(&filter.name, &extensions);
        }
    } else {
        // Default filters
        builder = builder
            .add_filter("Documents", &["pdf", "docx", "txt", "md"])
            .add_filter("Spreadsheets", &["xlsx", "csv"])
            .add_filter("All Files", &["*"]);
    }

    let file_path = builder.blocking_pick_file();

    match file_path {
        Some(path) => {
            let path_str = path.path.to_string_lossy().to_string();
            let content = fs::read_to_string(&path.path).map_err(|e| format!("Failed to read file: {}", e))?;

            Ok(Some(FileOpenResult {
                path: path_str,
                content,
            }))
        }
        None => Ok(None),
    }
}

/// Open a native save file dialog and save content
#[tauri::command]
pub async fn save_file_dialog(
    app: tauri::AppHandle,
    content: String,
    default_name: Option<String>,
    filters: Option<Vec<FileFilter>>,
) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;

    let mut builder = app.dialog().file();

    if let Some(name) = default_name {
        builder = builder.set_file_name(&name);
    }

    if let Some(filter_list) = filters {
        for filter in filter_list {
            let extensions: Vec<&str> = filter.extensions.iter().map(|s| s.as_str()).collect();
            builder = builder.add_filter(&filter.name, &extensions);
        }
    } else {
        builder = builder
            .add_filter("Document", &["pdf", "docx"])
            .add_filter("Markdown", &["md"])
            .add_filter("Text", &["txt"]);
    }

    let file_path = builder.blocking_save_file();

    match file_path {
        Some(path) => {
            let path_str = path.path.to_string_lossy().to_string();
            fs::write(&path.path, content).map_err(|e| format!("Failed to write file: {}", e))?;
            Ok(Some(path_str))
        }
        None => Ok(None),
    }
}

/// Read file contents from a given path
#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))
}

/// Write content to a file at the given path
#[tauri::command]
pub fn write_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content).map_err(|e| format!("Failed to write file: {}", e))
}

/// List contents of a directory
#[tauri::command]
pub fn list_directory(path: String) -> Result<Vec<PathInfo>, String> {
    let dir_path = PathBuf::from(&path);

    if !dir_path.exists() {
        return Err(format!("Directory does not exist: {}", path));
    }

    if !dir_path.is_dir() {
        return Err(format!("Path is not a directory: {}", path));
    }

    let entries =
        fs::read_dir(&dir_path).map_err(|e| format!("Failed to read directory: {}", e))?;

    let mut results = Vec::new();
    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let metadata = entry
            .metadata()
            .map_err(|e| format!("Failed to read metadata: {}", e))?;

        results.push(PathInfo {
            name: entry.file_name().to_string_lossy().to_string(),
            path: entry.path().to_string_lossy().to_string(),
            is_dir: metadata.is_dir(),
            size: metadata.len(),
        });
    }

    // Sort directories first, then files
    results.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    Ok(results)
}

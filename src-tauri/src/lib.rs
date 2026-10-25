// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::mpsc;
use walkdir::WalkDir;
use chrono::{DateTime, Local};

#[derive(Debug, Serialize, Deserialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
    pub size: u64,
    pub modified: i64,
    pub is_supported: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DirectoryEntry {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
    pub size: u64,
    pub modified: i64,
}

const SUPPORTED_EXTENSIONS: &[&str] = &["pdf", "epub", "cbz", "txt", "html", "htm", "xhtml"];

fn is_supported_format(path: &Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| SUPPORTED_EXTENSIONS.contains(&ext.to_lowercase().as_str()))
        .unwrap_or(false)
}

fn get_file_entry(path: &Path) -> Result<FileEntry, String> {
    let metadata = fs::metadata(path).map_err(|e| e.to_string())?;
    let modified: DateTime<Local> = metadata.modified().map_err(|e| e.to_string())?.into();

    let is_directory = metadata.is_dir();
    let size = if is_directory { 0 } else { metadata.len() };
    let name = path.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string();
    let path_str = path.to_string_lossy().to_string();
    let is_supported = !is_directory && is_supported_format(path);

    Ok(FileEntry {
        name,
        path: path_str,
        is_directory,
        size,
        modified: modified.timestamp(),
        is_supported,
    })
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn pick_directory(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;

    let (tx, rx) = mpsc::channel();

    app.dialog()
        .file()
        .set_title("Select a directory")
        .pick_folder(move |path| {
            let _ = tx.send(path.map(|p| p.to_string()));
        });

    // Wait for the callback (blocking is fine here since this runs on a Tauri command thread)
    rx.recv().map_err(|e| e.to_string())
}

#[tauri::command]
async fn list_directory(path: String) -> Result<Vec<FileEntry>, String> {
    let path = PathBuf::from(path);

    if !path.exists() {
        return Err("Path does not exist".to_string());
    }

    if !path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    let mut entries = Vec::new();

    for entry in WalkDir::new(&path).min_depth(1).max_depth(1) {
        let entry = entry.map_err(|e| e.to_string())?;
        let file_entry = get_file_entry(entry.path())?;
        entries.push(file_entry);
    }

    // Sort: directories first, then by name
    entries.sort_by(|a, b| {
        match (a.is_directory, b.is_directory) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });

    Ok(entries)
}

#[tauri::command]
async fn read_file(path: String) -> Result<Vec<u8>, String> {
    let path = PathBuf::from(path);
    fs::read(path).map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_file_metadata(path: String) -> Result<FileEntry, String> {
    let path = PathBuf::from(path);
    get_file_entry(&path)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            greet,
            pick_directory,
            list_directory,
            read_file,
            get_file_metadata
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

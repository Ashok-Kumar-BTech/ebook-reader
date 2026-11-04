// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
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

const SUPPORTED_EXTENSIONS: &[&str] = &[
    "pdf", "epub", "cbz", "cbr", "txt", "html", "htm", "xhtml", "docx",
];

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
        modified: modified.timestamp_millis(),
        is_supported,
    })
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

    let read_dir = fs::read_dir(&path).map_err(|e| e.to_string())?;
    let mut entries = Vec::new();

    for dir_entry in read_dir {
        if let Ok(entry) = dir_entry {
            if let Ok(file_entry) = get_file_entry(&entry.path()) {
                entries.push(file_entry);
            }
        }
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
fn log_from_frontend(level: String, target: String, args: String) {
    println!("[FRONTEND:{}] [{}] {}", level.to_uppercase(), target, args);
}

#[tauri::command]
async fn read_file(path: String) -> Result<tauri::ipc::Response, String> {
    let path = PathBuf::from(path);
    let bytes = fs::read(path).map_err(|e| e.to_string())?;
    Ok(tauri::ipc::Response::new(bytes))
}

#[tauri::command]
async fn get_file_metadata(path: String) -> Result<FileEntry, String> {
    let path = PathBuf::from(path);
    get_file_entry(&path)
}

#[tauri::command]
fn get_cli_open_path() -> Option<String> {
    let args: Vec<String> = std::env::args().collect();
    if args.len() > 1 {
        for arg in &args[1..] {
            if !arg.starts_with('-') {
                let p = Path::new(arg);
                if p.exists() {
                    return Some(arg.clone());
                }
            }
        }
    }
    None
}

fn validate_reveal_path(path: &str) -> Result<PathBuf, String> {
    let p = PathBuf::from(path);
    if !p.exists() {
        return Err(format!("Path does not exist: {}", path));
    }
    Ok(p)
}

#[tauri::command]
async fn reveal_in_file_manager(path: String) -> Result<(), String> {
    let p = validate_reveal_path(&path)?;
    let _ = &p; // Used in Linux/macOS target configs

    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        let clean_path = path.replace('/', "\\");
        Command::new("explorer")
            .arg(format!("/select,{}", clean_path))
            .spawn()
            .map_err(|e| format!("Failed to launch Windows Explorer: {}", e))?;
        Ok(())
    }

    #[cfg(target_os = "linux")]
    {
        use std::process::Command;

        let target_dir = if p.is_dir() {
            p.to_path_buf()
        } else {
            p.parent().map(|parent| parent.to_path_buf()).unwrap_or_else(|| p.to_path_buf())
        };

        let mut launched = false;
        // If it's a file, try file managers supporting direct item selection
        if !p.is_dir() {
            for (cmd, args) in [
                ("nautilus", vec!["--select", path.as_str()]),
                ("dolphin", vec!["--select", path.as_str()]),
                ("nemo", vec!["--no-desktop", path.as_str()]),
            ] {
                if Command::new(cmd).args(&args).spawn().is_ok() {
                    launched = true;
                    break;
                }
            }
        }

        if !launched {
            // Universal Freedesktop standard xdg-open on target directory (PRD §14)
            if Command::new("xdg-open").arg(&target_dir).spawn().is_err() {
                // Secondary fallback: gio open
                Command::new("gio")
                    .args(["open", &target_dir.to_string_lossy()])
                    .spawn()
                    .map_err(|e| format!("Failed to open file manager via xdg-open or gio: {}", e))?;
            }
        }

        Ok(())
    }

    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        Command::new("open")
            .args(["-R", &path])
            .spawn()
            .map_err(|e| format!("Failed to reveal item in Finder: {}", e))?;
        Ok(())
    }

    #[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos")))]
    {
        let _ = p;
        Err("Platform does not support revealing items in file manager".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_android_fs::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            #[cfg(desktop)]
            {
                use tauri::Manager;
                if let Some(window) = app.get_webview_window("main") {
                    if let Ok(icon) = tauri::image::Image::from_bytes(include_bytes!("../icons/128x128.png")) {
                        let _ = window.set_icon(icon);
                    }
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            log_from_frontend,
            list_directory,
            read_file,
            get_file_metadata,
            get_cli_open_path,
            reveal_in_file_manager
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;

    #[test]
    fn test_is_supported_format() {
        assert!(is_supported_format(Path::new("book.pdf")));
        assert!(is_supported_format(Path::new("book.EPUB")));
        assert!(is_supported_format(Path::new("comic.CBZ")));
        assert!(is_supported_format(Path::new("comic.cbr")));
        assert!(is_supported_format(Path::new("notes.txt")));
        assert!(is_supported_format(Path::new("index.html")));
        assert!(is_supported_format(Path::new("doc.docx")));

        assert!(!is_supported_format(Path::new("binary.exe")));
        assert!(!is_supported_format(Path::new("video.mp4")));
        assert!(!is_supported_format(Path::new("image.png")));
        assert!(!is_supported_format(Path::new("noextension")));
    }

    #[test]
    fn test_supported_extensions_constant() {
        assert!(SUPPORTED_EXTENSIONS.contains(&"pdf"));
        assert!(SUPPORTED_EXTENSIONS.contains(&"epub"));
        assert!(SUPPORTED_EXTENSIONS.contains(&"cbz"));
        assert!(SUPPORTED_EXTENSIONS.contains(&"docx"));
        assert_eq!(SUPPORTED_EXTENSIONS.len(), 9);
    }

    #[test]
    fn test_validate_reveal_path() {
        let non_existent = validate_reveal_path("this_file_should_not_exist_987654.pdf");
        assert!(non_existent.is_err());
        assert!(non_existent.unwrap_err().contains("does not exist"));

        let cargo_toml = validate_reveal_path("Cargo.toml");
        assert!(cargo_toml.is_ok());
    }
}


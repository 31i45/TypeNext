use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_fs::FilePath;

#[derive(Debug, Serialize, Deserialize)]
pub struct FileContent {
    pub path: String,
    pub content: String,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SaveResult {
    pub path: String,
    pub success: bool,
}

fn read_file_with_encoding(path: &std::path::Path) -> Result<String, String> {
    let bytes = std::fs::read(path).map_err(|e| e.to_string())?;
    let content = if bytes.starts_with(&[0xEF, 0xBB, 0xBF]) {
        String::from_utf8_lossy(&bytes[3..]).to_string()
    } else if let Ok(s) = std::str::from_utf8(&bytes) {
        s.to_string()
    } else {
        let (cow, _, _) = encoding_rs::GBK.decode(&bytes);
        cow.to_string()
    };
    Ok(content.replace("\r\n", "\n").replace('\r', "\n"))
}

fn write_file_at(path: &str, content: &str) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    let content = content.replace('\n', "\r\n");
    std::fs::write(path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn pick_file(app: AppHandle) -> Result<Option<FileContent>, String> {
    let file_path = app.dialog().file()
        .add_filter("Markdown", &["md", "markdown", "mdown", "mkd"])
        .add_filter("Text", &["txt"])
        .add_filter("All Files", &["*"])
        .blocking_pick_file();

    match file_path {
        Some(FilePath::Path(path)) => {
            let path_str = path.to_string_lossy().to_string();
            let content = read_file_with_encoding(&path)?;
            let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("Untitled").to_string();
            Ok(Some(FileContent { path: path_str, content, name }))
        }
        _ => Ok(None),
    }
}

#[tauri::command]
pub async fn save_file_dialog(
    app: AppHandle,
    default_path: Option<String>,
) -> Result<Option<SaveResult>, String> {
    let default_name = default_path.as_deref().unwrap_or("Untitled.md");
    let file_path = app.dialog().file()
        .add_filter("Markdown", &["md", "markdown", "mdown", "mkd"])
        .add_filter("HTML", &["html", "htm"])
        .add_filter("Text", &["txt"])
        .add_filter("All Files", &["*"])
        .set_file_name(default_name)
        .blocking_save_file();

    match file_path {
        Some(FilePath::Path(path)) => {
            let path_str = path.to_string_lossy().to_string();
            Ok(Some(SaveResult { path: path_str, success: true }))
        }
        _ => Ok(None),
    }
}

#[tauri::command]
pub async fn write_file(path: String, content: String) -> Result<bool, String> {
    write_file_at(&path, &content)?;
    Ok(true)
}

#[tauri::command]
pub async fn read_file(path: String) -> Result<String, String> {
    read_file_with_encoding(std::path::Path::new(&path))
}

mod commands;

use commands::auth::{hash_password, verify_password};
use commands::pdf::generate_pdf;
use commands::sync::trigger_sync;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            hash_password,
            verify_password,
            trigger_sync,
            generate_pdf,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

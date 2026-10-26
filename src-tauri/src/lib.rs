pub mod app_state;
pub mod commands;
pub mod db;
pub mod error;
pub mod models;
pub mod services;

use app_state::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let data_dir = app.path().app_data_dir()?;
            let state = AppState::new(data_dir)
                .map_err(|error| -> Box<dyn std::error::Error> { Box::new(error) })?;
            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_app_info,
            commands::list_categories,
            commands::create_category,
            commands::rename_category,
            commands::set_category_active,
            commands::move_category,
            commands::list_expenses,
            commands::create_expense,
            commands::update_expense,
            commands::delete_expense,
            commands::get_month_summary,
        ])
        .run(tauri::generate_context!())
        .expect("failed to run 黑马记账");
}

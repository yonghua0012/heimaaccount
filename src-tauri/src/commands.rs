use crate::app_state::AppState;
use crate::error::AppError;
use crate::models::{Category, Expense, ExpenseDraft, ExpenseFilter, MonthSummary};
use crate::services::{categories, expenses, stats};
use tauri::State;

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OperationResult {
    pub message: String,
    pub affected_count: Option<usize>,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppInfo {
    pub name: String,
    pub version: String,
    pub data_dir: String,
}

#[tauri::command]
pub fn get_app_info(state: State<'_, AppState>) -> AppInfo {
    AppInfo {
        name: "黑马记账".into(),
        version: env!("CARGO_PKG_VERSION").into(),
        data_dir: state.data_dir_ref().display().to_string(),
    }
}

#[tauri::command]
pub fn list_categories(state: State<'_, AppState>) -> Result<Vec<Category>, AppError> {
    let _guard = state.lock()?;
    categories::list_categories(&state.open()?)
}

#[tauri::command]
pub fn create_category(
    state: State<'_, AppState>,
    parent_id: Option<String>,
    name: String,
) -> Result<Category, AppError> {
    let _guard = state.lock()?;
    categories::create_category(&mut state.open()?, parent_id.as_deref(), &name)
}

#[tauri::command]
pub fn rename_category(
    state: State<'_, AppState>,
    id: String,
    name: String,
) -> Result<Category, AppError> {
    let _guard = state.lock()?;
    categories::rename_category(&state.open()?, &id, &name)
}

#[tauri::command]
pub fn set_category_active(
    state: State<'_, AppState>,
    id: String,
    active: bool,
) -> Result<Category, AppError> {
    let _guard = state.lock()?;
    categories::set_category_active(&state.open()?, &id, active)
}

#[tauri::command]
pub fn move_category(
    state: State<'_, AppState>,
    id: String,
    new_parent_id: String,
) -> Result<Category, AppError> {
    let _guard = state.lock()?;
    categories::move_category(&state.open()?, &id, &new_parent_id)
}

#[tauri::command]
pub fn list_expenses(
    state: State<'_, AppState>,
    filter: ExpenseFilter,
) -> Result<Vec<Expense>, AppError> {
    let _guard = state.lock()?;
    expenses::list_expenses(&state.open()?, filter)
}

#[tauri::command]
pub fn create_expense(
    state: State<'_, AppState>,
    draft: ExpenseDraft,
) -> Result<Expense, AppError> {
    let _guard = state.lock()?;
    expenses::create_expense(&mut state.open()?, draft)
}

#[tauri::command]
pub fn update_expense(
    state: State<'_, AppState>,
    id: String,
    draft: ExpenseDraft,
) -> Result<Expense, AppError> {
    let _guard = state.lock()?;
    expenses::update_expense(&mut state.open()?, &id, draft)
}

#[tauri::command]
pub fn delete_expense(state: State<'_, AppState>, id: String) -> Result<(), AppError> {
    let _guard = state.lock()?;
    expenses::delete_expense(&state.open()?, &id)
}

#[tauri::command]
pub fn get_month_summary(
    state: State<'_, AppState>,
    month: String,
) -> Result<MonthSummary, AppError> {
    let _guard = state.lock()?;
    stats::month_summary(&state.open()?, &month)
}

#[tauri::command]
pub fn ensure_daily_backup(state: State<'_, AppState>) -> Result<OperationResult, AppError> {
    let path = crate::services::backups::ensure_daily_backup(&state)?;
    Ok(OperationResult {
        message: format!("自动备份已保存到 {}", path.display()),
        affected_count: None,
    })
}

#[tauri::command]
pub fn create_backup(
    state: State<'_, AppState>,
    destination: String,
) -> Result<OperationResult, AppError> {
    let _guard = state.lock()?;
    crate::services::backups::create_backup(&state.open()?, std::path::Path::new(&destination))?;
    Ok(OperationResult {
        message: "备份已保存".into(),
        affected_count: None,
    })
}

#[tauri::command]
pub fn restore_backup(
    state: State<'_, AppState>,
    source: String,
) -> Result<OperationResult, AppError> {
    crate::services::backups::restore_backup(&state, std::path::Path::new(&source))?;
    Ok(OperationResult {
        message: "备份已恢复，请重新打开应用".into(),
        affected_count: None,
    })
}

#[tauri::command]
pub fn export_csv(
    state: State<'_, AppState>,
    destination: String,
) -> Result<OperationResult, AppError> {
    let _guard = state.lock()?;
    let count = crate::services::csv_export::export_all_csv(
        &state.open()?,
        std::path::Path::new(&destination),
    )?;
    Ok(OperationResult {
        message: format!("已导出 {count} 条记录"),
        affected_count: Some(count),
    })
}

#[tauri::command]
pub fn open_data_dir(state: State<'_, AppState>) -> String {
    state.data_dir_ref().display().to_string()
}

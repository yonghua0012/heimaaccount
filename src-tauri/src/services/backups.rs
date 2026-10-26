use crate::app_state::AppState;
use crate::db::open_database;
use crate::error::AppError;
use chrono::Local;
use rusqlite::backup::Backup;
use rusqlite::{Connection, OpenFlags};
use std::path::{Path, PathBuf};
use std::time::Duration;
use uuid::Uuid;

const CURRENT_SCHEMA: i64 = 1;

pub fn create_backup(source: &Connection, destination: &Path) -> Result<(), AppError> {
    let parent = destination
        .parent()
        .filter(|path| !path.as_os_str().is_empty())
        .unwrap_or_else(|| Path::new("."));
    std::fs::create_dir_all(parent)?;
    let staging_dir = tempfile::tempdir_in(parent)?;
    let staged = staging_dir.path().join("backup.db");
    let mut target = Connection::open(&staged)?;
    {
        let backup = Backup::new(source, &mut target)?;
        backup.run_to_completion(100, Duration::from_millis(10), None)?;
    }
    target.pragma_update(None, "journal_mode", "DELETE")?;
    drop(target);
    validate_backup(&staged)?;

    let previous = parent.join(format!(".backup-previous-{}.db", Uuid::new_v4()));
    if destination.exists() {
        std::fs::rename(destination, &previous)?;
    }
    if let Err(error) = std::fs::rename(&staged, destination) {
        if previous.exists() {
            let _ = std::fs::rename(&previous, destination);
        }
        return Err(AppError::storage(error));
    }
    if previous.exists() {
        let _ = std::fs::remove_file(previous);
    }
    Ok(())
}

pub fn validate_backup(path: &Path) -> Result<(), AppError> {
    if !path.is_file() {
        return Err(AppError::validation("请选择有效的备份文件"));
    }
    let conn = Connection::open_with_flags(path, OpenFlags::SQLITE_OPEN_READ_ONLY)
        .map_err(|_| AppError::validation("无法读取该备份文件"))?;
    let integrity: String = conn
        .query_row("PRAGMA integrity_check", [], |row| row.get(0))
        .map_err(|_| AppError::validation("备份文件不是有效的黑马记账数据库"))?;
    if integrity != "ok" {
        return Err(AppError::validation("备份数据库完整性检查未通过"));
    }
    let schema: Option<i64> = conn
        .query_row("SELECT MAX(version) FROM schema_version", [], |row| {
            row.get(0)
        })
        .ok();
    if schema != Some(CURRENT_SCHEMA) {
        return Err(AppError::validation("备份数据库版本不受支持"));
    }
    Ok(())
}

pub fn ensure_daily_backup(state: &AppState) -> Result<PathBuf, AppError> {
    let _guard = state.lock()?;
    let today = Local::now().date_naive();
    let destination = state
        .data_dir_ref()
        .join("backups")
        .join(format!("{}.db", today.format("%Y-%m-%d")));
    if destination.exists() && validate_backup(&destination).is_ok() {
        return Ok(destination);
    }
    create_backup(&state.open()?, &destination)?;
    cleanup_backups(state.data_dir_ref(), 30)?;
    Ok(destination)
}

fn cleanup_backups(data_dir: &Path, keep: usize) -> Result<(), AppError> {
    let mut files: Vec<(std::time::SystemTime, PathBuf)> =
        std::fs::read_dir(data_dir.join("backups"))?
            .filter_map(Result::ok)
            .filter(|entry| entry.path().extension().and_then(|value| value.to_str()) == Some("db"))
            .filter_map(|entry| {
                let modified = entry.metadata().ok()?.modified().ok()?;
                Some((modified, entry.path()))
            })
            .collect();
    files.sort_by_key(|entry| std::cmp::Reverse(entry.0));
    for (_, path) in files.into_iter().skip(keep) {
        std::fs::remove_file(path)?;
    }
    Ok(())
}

pub fn restore_backup(state: &AppState, source: &Path) -> Result<(), AppError> {
    validate_backup(source)?;
    let _guard = state.lock()?;
    let data_dir = state.data_dir_ref();
    let recovery = data_dir.join("backups").join(format!(
        "before-restore-{}-{}.db",
        Local::now().format("%Y%m%d-%H%M%S"),
        Uuid::new_v4()
    ));
    create_backup(&state.open()?, &recovery)?;

    let staging_dir = tempfile::tempdir_in(data_dir)?;
    let staged = staging_dir.path().join("restore.db");
    std::fs::copy(source, &staged)?;
    validate_backup(&staged)?;

    let db_path = state.db_path();
    let current = state.open()?;
    current.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);")?;
    drop(current);

    let previous = data_dir.join(format!("database-previous-{}.db", Uuid::new_v4()));
    if db_path.exists() {
        std::fs::rename(&db_path, &previous)?;
    }
    for suffix in ["-wal", "-shm"] {
        let sidecar = PathBuf::from(format!("{}{suffix}", db_path.display()));
        if sidecar.exists() {
            std::fs::remove_file(sidecar)?;
        }
    }
    if let Err(error) = std::fs::rename(&staged, &db_path) {
        if previous.exists() {
            let _ = std::fs::rename(&previous, &db_path);
        }
        return Err(AppError::storage(error));
    }
    if let Err(error) = open_database(&db_path) {
        let _ = std::fs::remove_file(&db_path);
        if previous.exists() {
            let _ = std::fs::rename(&previous, &db_path);
            let _ = open_database(&db_path);
        }
        return Err(error);
    }
    if previous.exists() {
        let _ = std::fs::remove_file(previous);
    }
    Ok(())
}

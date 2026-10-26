use crate::db::open_database;
use crate::error::AppError;
use rusqlite::Connection;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

pub struct AppState {
    pub data_dir: PathBuf,
    pub db_lock: Mutex<()>,
}

impl AppState {
    pub fn new(data_dir: PathBuf) -> Result<Self, AppError> {
        std::fs::create_dir_all(data_dir.join("backups"))?;
        std::fs::create_dir_all(data_dir.join("logs"))?;
        std::fs::create_dir_all(data_dir.join("exports"))?;
        let state = Self {
            data_dir,
            db_lock: Mutex::new(()),
        };
        drop(state.open()?);
        Ok(state)
    }

    pub fn db_path(&self) -> PathBuf {
        self.data_dir.join("heima-ledger.db")
    }

    pub fn open(&self) -> Result<Connection, AppError> {
        open_database(&self.db_path())
    }

    pub fn lock(&self) -> Result<std::sync::MutexGuard<'_, ()>, AppError> {
        self.db_lock
            .lock()
            .map_err(|_| AppError::storage("数据库锁已损坏，请重新启动应用"))
    }

    pub fn data_dir_ref(&self) -> &Path {
        &self.data_dir
    }
}

use serde::Serialize;
use std::fmt::{Display, Formatter};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppError {
    pub code: String,
    pub message: String,
}

impl AppError {
    pub fn validation(message: impl Into<String>) -> Self {
        Self {
            code: "VALIDATION".into(),
            message: message.into(),
        }
    }

    pub fn conflict(message: impl Into<String>) -> Self {
        Self {
            code: "CONFLICT".into(),
            message: message.into(),
        }
    }

    pub fn not_found(message: impl Into<String>) -> Self {
        Self {
            code: "NOT_FOUND".into(),
            message: message.into(),
        }
    }

    pub fn storage(error: impl Display) -> Self {
        Self {
            code: "STORAGE".into(),
            message: format!("本地数据操作失败：{error}"),
        }
    }
}

impl Display for AppError {
    fn fmt(&self, formatter: &mut Formatter<'_>) -> std::fmt::Result {
        formatter.write_str(&self.message)
    }
}

impl std::error::Error for AppError {}

impl From<rusqlite::Error> for AppError {
    fn from(value: rusqlite::Error) -> Self {
        Self::storage(value)
    }
}

impl From<std::io::Error> for AppError {
    fn from(value: std::io::Error) -> Self {
        Self::storage(value)
    }
}

impl From<csv::Error> for AppError {
    fn from(value: csv::Error) -> Self {
        Self::storage(value)
    }
}

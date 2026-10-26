use crate::error::AppError;
use chrono::{SecondsFormat, Utc};
use rusqlite::Connection;

pub fn apply(conn: &mut Connection) -> Result<(), AppError> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS schema_version (
            version INTEGER PRIMARY KEY,
            applied_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS category (
            id TEXT PRIMARY KEY,
            parent_id TEXT REFERENCES category(id),
            name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 20),
            sort_order INTEGER NOT NULL,
            active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
            built_in INTEGER NOT NULL DEFAULT 0 CHECK(built_in IN (0, 1)),
            created_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_category_parent
            ON category(parent_id, sort_order);

        CREATE TABLE IF NOT EXISTS expense (
            id TEXT PRIMARY KEY,
            amount_cents INTEGER NOT NULL
                CHECK(amount_cents BETWEEN 1 AND 9999999999),
            spent_on TEXT NOT NULL,
            category_id TEXT NOT NULL REFERENCES category(id),
            note TEXT CHECK(note IS NULL OR length(note) <= 200),
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_expense_spent_on
            ON expense(spent_on);
        CREATE INDEX IF NOT EXISTS idx_expense_category
            ON expense(category_id);

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        PRAGMA foreign_keys = ON;",
    )?;

    let now = Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true);
    conn.execute(
        "INSERT OR IGNORE INTO schema_version(version, applied_at) VALUES (1, ?1)",
        [now],
    )?;
    Ok(())
}

pub mod schema;
pub mod seed;

use crate::error::AppError;
use rusqlite::Connection;
use std::path::Path;

fn configure(conn: &Connection) -> Result<(), AppError> {
    conn.execute_batch("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;")?;
    Ok(())
}

pub fn migrate(conn: &mut Connection) -> Result<(), AppError> {
    configure(conn)?;
    schema::apply(conn)?;
    seed::insert(conn)?;
    Ok(())
}

pub fn open_in_memory() -> Result<Connection, AppError> {
    let mut conn = Connection::open_in_memory()?;
    migrate(&mut conn)?;
    Ok(conn)
}

pub fn open_database(path: &Path) -> Result<Connection, AppError> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let mut conn = Connection::open(path)?;
    configure(&conn)?;
    conn.pragma_update(None, "journal_mode", "WAL")?;
    migrate(&mut conn)?;
    Ok(conn)
}

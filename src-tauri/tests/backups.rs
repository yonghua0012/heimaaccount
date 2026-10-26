use heima_ledger_lib::app_state::AppState;
use heima_ledger_lib::db::{open_database, open_in_memory};
use heima_ledger_lib::models::{ExpenseDraft, ExpenseFilter};
use heima_ledger_lib::services::backups::{create_backup, restore_backup, validate_backup};
use heima_ledger_lib::services::expenses::{create_expense, list_expenses};
use tempfile::tempdir;

#[test]
fn backup_file_passes_integrity_and_schema_validation() {
    let directory = tempdir().unwrap();
    let source_path = directory.path().join("source.db");
    let backup_path = directory.path().join("backup.db");
    let mut source = open_database(&source_path).unwrap();
    create_expense(
        &mut source,
        ExpenseDraft {
            amount_cents: 1850,
            spent_on: "2026-10-26".into(),
            category_id: "food-meals".into(),
            note: Some("午餐".into()),
        },
    )
    .unwrap();

    create_backup(&source, &backup_path).unwrap();
    validate_backup(&backup_path).unwrap();

    let restored = open_database(&backup_path).unwrap();
    let rows = list_expenses(
        &restored,
        ExpenseFilter {
            month: "2026-10".into(),
            ..ExpenseFilter::default()
        },
    )
    .unwrap();
    assert_eq!(rows.len(), 1);
    assert_eq!(rows[0].amount_cents, 1850);
}

#[test]
fn validation_rejects_an_unrelated_sqlite_file() {
    let directory = tempdir().unwrap();
    let path = directory.path().join("invalid.db");
    let conn = rusqlite::Connection::open(&path).unwrap();
    conn.execute_batch("CREATE TABLE unrelated(value TEXT);")
        .unwrap();
    drop(conn);

    assert_eq!(validate_backup(&path).unwrap_err().code, "VALIDATION");
}

#[test]
fn failed_restore_validation_keeps_current_records() {
    let directory = tempdir().unwrap();
    let state = AppState::new(directory.path().to_path_buf()).unwrap();
    let mut current = state.open().unwrap();
    create_expense(
        &mut current,
        ExpenseDraft {
            amount_cents: 2600,
            spent_on: "2026-10-26".into(),
            category_id: "food-meals".into(),
            note: Some("保留记录".into()),
        },
    )
    .unwrap();
    drop(current);

    let invalid = directory.path().join("invalid-backup.db");
    rusqlite::Connection::open(&invalid)
        .unwrap()
        .execute_batch("CREATE TABLE unrelated(value TEXT);")
        .unwrap();
    assert_eq!(
        restore_backup(&state, &invalid).unwrap_err().code,
        "VALIDATION"
    );

    let rows = list_expenses(
        &state.open().unwrap(),
        ExpenseFilter {
            month: "2026-10".into(),
            ..ExpenseFilter::default()
        },
    )
    .unwrap();
    assert_eq!(rows.len(), 1);
    assert_eq!(rows[0].amount_cents, 2600);
}

#[test]
fn memory_database_is_supported_by_export_queries() {
    let conn = open_in_memory().unwrap();
    assert_eq!(
        conn.query_row("SELECT COUNT(*) FROM expense", [], |row| {
            row.get::<_, i64>(0)
        })
        .unwrap(),
        0
    );
}

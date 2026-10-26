use heima_ledger_lib::app_state::AppState;
use heima_ledger_lib::models::ExpenseDraft;
use tempfile::tempdir;

#[test]
fn expense_draft_deserializes_camel_case_from_the_frontend() {
    let draft: ExpenseDraft = serde_json::from_str(
        r#"{"amountCents":1850,"spentOn":"2026-10-26","categoryId":"food-meals","note":"午餐"}"#,
    )
    .unwrap();

    assert_eq!(draft.amount_cents, 1850);
    assert_eq!(draft.category_id, "food-meals");
}

#[test]
fn application_state_creates_the_database_and_support_directories() {
    let directory = tempdir().unwrap();
    let state = AppState::new(directory.path().to_path_buf()).unwrap();

    assert!(state.db_path().is_file());
    assert!(directory.path().join("backups").is_dir());
    assert!(directory.path().join("logs").is_dir());
    assert!(directory.path().join("exports").is_dir());
}

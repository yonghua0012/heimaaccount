use heima_ledger_lib::db::open_in_memory;
use heima_ledger_lib::models::{ExpenseDraft, ExpenseFilter};
use heima_ledger_lib::services::expenses::{
    create_expense, delete_expense, list_expenses, update_expense,
};

fn draft(amount_cents: i64, spent_on: &str, category_id: &str) -> ExpenseDraft {
    ExpenseDraft {
        amount_cents,
        spent_on: spent_on.into(),
        category_id: category_id.into(),
        note: Some("  工作日午餐  ".into()),
    }
}

#[test]
fn creates_trims_and_lists_an_expense() {
    let mut conn = open_in_memory().unwrap();
    let created = create_expense(&mut conn, draft(1850, "2026-10-26", "food-meals")).unwrap();
    let rows = list_expenses(
        &conn,
        ExpenseFilter {
            month: "2026-10".into(),
            ..ExpenseFilter::default()
        },
    )
    .unwrap();

    assert_eq!(created.amount_cents, 1850);
    assert_eq!(created.note.as_deref(), Some("工作日午餐"));
    assert_eq!(rows.len(), 1);
}

#[test]
fn rejects_invalid_amounts_dates_and_leaf_categories() {
    let mut conn = open_in_memory().unwrap();

    assert_eq!(
        create_expense(&mut conn, draft(0, "2026-10-26", "food-meals"))
            .unwrap_err()
            .code,
        "VALIDATION"
    );
    assert_eq!(
        create_expense(&mut conn, draft(100, "2026-02-30", "food-meals"))
            .unwrap_err()
            .code,
        "VALIDATION"
    );
    assert_eq!(
        create_expense(&mut conn, draft(100, "2026-10-26", "food"))
            .unwrap_err()
            .code,
        "VALIDATION"
    );
}

#[test]
fn rejects_notes_longer_than_two_hundred_characters() {
    let mut conn = open_in_memory().unwrap();
    let mut invalid = draft(100, "2026-10-26", "food-meals");
    invalid.note = Some("记".repeat(201));

    assert_eq!(
        create_expense(&mut conn, invalid).unwrap_err().code,
        "VALIDATION"
    );
}

#[test]
fn filters_by_child_parent_and_literal_keyword() {
    let mut conn = open_in_memory().unwrap();
    create_expense(&mut conn, draft(1000, "2026-10-01", "food-meals")).unwrap();
    let mut shopping = draft(2000, "2026-10-02", "shopping-home");
    shopping.note = Some("100% 纯棉".into());
    create_expense(&mut conn, shopping).unwrap();

    let by_parent = list_expenses(
        &conn,
        ExpenseFilter {
            month: "2026-10".into(),
            parent_category_id: Some("food".into()),
            ..ExpenseFilter::default()
        },
    )
    .unwrap();
    let literal_percent = list_expenses(
        &conn,
        ExpenseFilter {
            month: "2026-10".into(),
            keyword: Some("%".into()),
            ..ExpenseFilter::default()
        },
    )
    .unwrap();

    assert_eq!(by_parent.len(), 1);
    assert_eq!(literal_percent.len(), 1);
    assert_eq!(literal_percent[0].parent_category_id, "shopping");
}

#[test]
fn updates_and_deletes_an_expense() {
    let mut conn = open_in_memory().unwrap();
    let row = create_expense(&mut conn, draft(1000, "2026-10-01", "food-meals")).unwrap();
    let updated = update_expense(
        &mut conn,
        &row.id,
        draft(1200, "2026-10-02", "food-breakfast"),
    )
    .unwrap();
    delete_expense(&conn, &row.id).unwrap();
    let remaining = list_expenses(
        &conn,
        ExpenseFilter {
            month: "2026-10".into(),
            ..ExpenseFilter::default()
        },
    )
    .unwrap();

    assert_eq!(updated.amount_cents, 1200);
    assert_eq!(updated.category_id, "food-breakfast");
    assert!(remaining.is_empty());
}

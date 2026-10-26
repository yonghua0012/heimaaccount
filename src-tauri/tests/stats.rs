use heima_ledger_lib::db::open_in_memory;
use heima_ledger_lib::models::ExpenseDraft;
use heima_ledger_lib::services::expenses::create_expense;
use heima_ledger_lib::services::stats::month_summary;

fn add(conn: &mut rusqlite::Connection, cents: i64, date: &str, category: &str) {
    create_expense(
        conn,
        ExpenseDraft {
            amount_cents: cents,
            spent_on: date.into(),
            category_id: category.into(),
            note: None,
        },
    )
    .unwrap();
}

#[test]
fn totals_match_the_two_level_breakdown() {
    let mut conn = open_in_memory().unwrap();
    add(&mut conn, 1000, "2026-10-01", "food-meals");
    add(&mut conn, 500, "2026-10-31", "food-cafe");
    add(&mut conn, 2000, "2026-10-15", "housing-utilities");
    add(&mut conn, 9999, "2026-11-01", "food-meals");

    let summary = month_summary(&conn, "2026-10").unwrap();
    let first_level_sum: i64 = summary.categories.iter().map(|item| item.amount_cents).sum();
    let food = summary
        .categories
        .iter()
        .find(|item| item.category_id == "food")
        .unwrap();
    let food_child_sum: i64 = food.children.iter().map(|item| item.amount_cents).sum();

    assert_eq!(summary.total_cents, 3500);
    assert_eq!(first_level_sum, 3500);
    assert_eq!(food.amount_cents, 1500);
    assert_eq!(food_child_sum, 1500);
}

#[test]
fn rejects_an_invalid_month() {
    let conn = open_in_memory().unwrap();
    assert_eq!(
        month_summary(&conn, "2026-13").unwrap_err().code,
        "VALIDATION"
    );
}

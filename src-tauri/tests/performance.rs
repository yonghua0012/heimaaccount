use heima_ledger_lib::db::open_in_memory;
use heima_ledger_lib::models::ExpenseFilter;
use heima_ledger_lib::services::expenses::list_expenses;
use heima_ledger_lib::services::stats::month_summary;
use std::time::Instant;

#[test]
fn filters_and_summarizes_ten_thousand_records_accurately() {
    let mut conn = open_in_memory().unwrap();
    let transaction = conn.transaction().unwrap();
    for index in 0..10_000 {
        let day = 1 + (index % 28);
        transaction
            .execute(
                "INSERT INTO expense
                 (id, amount_cents, spent_on, category_id, note, created_at, updated_at)
                 VALUES (?1, 100, ?2, 'food-meals', ?3, ?4, ?4)",
                rusqlite::params![
                    format!("record-{index}"),
                    format!("2026-10-{day:02}"),
                    format!("测试 {index}"),
                    "2026-10-01T00:00:00Z"
                ],
            )
            .unwrap();
    }
    transaction.commit().unwrap();

    let started = Instant::now();
    let rows = list_expenses(
        &conn,
        ExpenseFilter {
            month: "2026-10".into(),
            parent_category_id: Some("food".into()),
            keyword: Some("测试".into()),
            ..ExpenseFilter::default()
        },
    )
    .unwrap();
    let summary = month_summary(&conn, "2026-10").unwrap();

    assert_eq!(rows.len(), 10_000);
    assert_eq!(summary.total_cents, 1_000_000);
    assert!(started.elapsed().as_secs() < 3);
}

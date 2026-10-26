use heima_ledger_lib::db::open_in_memory;
use heima_ledger_lib::models::ExpenseDraft;
use heima_ledger_lib::services::csv_export::export_all_csv;
use heima_ledger_lib::services::expenses::create_expense;
use tempfile::tempdir;

#[test]
fn exports_utf8_csv_with_chinese_and_two_decimal_amounts() {
    let mut conn = open_in_memory().unwrap();
    create_expense(
        &mut conn,
        ExpenseDraft {
            amount_cents: 1850,
            spent_on: "2026-10-26".into(),
            category_id: "food-meals".into(),
            note: Some("工作日午餐".into()),
        },
    )
    .unwrap();
    let directory = tempdir().unwrap();
    let path = directory.path().join("expenses.csv");

    let count = export_all_csv(&conn, &path).unwrap();
    let bytes = std::fs::read(&path).unwrap();
    let text = String::from_utf8(bytes[3..].to_vec()).unwrap();

    assert_eq!(count, 1);
    assert_eq!(&bytes[0..3], &[0xEF, 0xBB, 0xBF]);
    assert!(text.contains("餐饮美食"));
    assert!(text.contains("工作日午餐"));
    assert!(text.contains("18.50"));
}

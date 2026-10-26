use heima_ledger_lib::db::open_in_memory;
use heima_ledger_lib::services::categories::{
    create_category, list_categories, move_category, rename_category, set_category_active,
};

fn custom_category(conn: &mut rusqlite::Connection) -> String {
    create_category(conn, Some("food"), "工作午餐")
        .expect("category is created")
        .id
}

#[test]
fn creates_a_second_level_category_under_an_existing_parent() {
    let mut conn = open_in_memory().unwrap();
    let category = create_category(&mut conn, Some("food"), "工作午餐").unwrap();

    assert_eq!(category.parent_id.as_deref(), Some("food"));
    assert!(category.active);
    assert!(!category.built_in);
}

#[test]
fn rejects_duplicates_blank_names_and_third_levels() {
    let mut conn = open_in_memory().unwrap();
    create_category(&mut conn, Some("food"), "工作午餐").unwrap();
    let first = list_categories(&conn)
        .unwrap()
        .into_iter()
        .find(|item| item.name == "工作午餐")
        .unwrap();

    assert_eq!(
        create_category(&mut conn, Some("food"), "工作午餐")
            .unwrap_err()
            .code,
        "CONFLICT"
    );
    assert_eq!(
        create_category(&mut conn, Some("food"), "  ")
            .unwrap_err()
            .code,
        "VALIDATION"
    );
    assert_eq!(
        create_category(&mut conn, Some(&first.id), "更细一级")
            .unwrap_err()
            .code,
        "VALIDATION"
    );
}

#[test]
fn prevents_deactivating_a_parent_with_active_children() {
    let conn = open_in_memory().unwrap();
    let error = set_category_active(&conn, "food", false).unwrap_err();
    assert_eq!(error.code, "CONFLICT");
}

#[test]
fn renames_and_moves_an_unused_category() {
    let mut conn = open_in_memory().unwrap();
    let id = custom_category(&mut conn);
    let renamed = rename_category(&conn, &id, "客户午餐").unwrap();
    let moved = move_category(&conn, &id, "social").unwrap();

    assert_eq!(renamed.name, "客户午餐");
    assert_eq!(moved.parent_id.as_deref(), Some("social"));
}

#[test]
fn keeps_the_seeded_parent_order_in_the_category_list() {
    let conn = open_in_memory().unwrap();
    let roots: Vec<String> = list_categories(&conn)
        .unwrap()
        .into_iter()
        .filter(|item| item.parent_id.is_none())
        .map(|item| item.name)
        .collect();

    assert_eq!(roots.first().map(String::as_str), Some("餐饮美食"));
    assert_eq!(roots.last().map(String::as_str), Some("其他支出"));
}

#[test]
fn rejects_active_children_under_an_inactive_parent() {
    let mut conn = open_in_memory().unwrap();
    let parent = create_category(&mut conn, None, "临时大类").unwrap();
    set_category_active(&conn, &parent.id, false).unwrap();
    let error = create_category(&mut conn, Some(&parent.id), "临时小类").unwrap_err();

    assert_eq!(error.code, "VALIDATION");
}

#[test]
fn refuses_to_move_a_category_that_is_already_used() {
    let mut conn = open_in_memory().unwrap();
    let id = custom_category(&mut conn);
    conn.execute(
        "INSERT INTO expense
         (id, amount_cents, spent_on, category_id, note, created_at, updated_at)
         VALUES ('used-category-record', 1200, '2026-10-26', ?1, NULL, ?2, ?2)",
        rusqlite::params![id, "2026-10-26T00:00:00Z"],
    )
    .unwrap();
    let error = move_category(&conn, &id, "social").unwrap_err();

    assert_eq!(error.code, "CONFLICT");
}

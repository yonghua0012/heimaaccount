use heima_ledger_lib::db::open_in_memory;

#[test]
fn migrates_and_seeds_the_confirmed_category_tree() {
    let conn = open_in_memory().expect("database opens");

    let schema_version: i64 = conn
        .query_row("SELECT MAX(version) FROM schema_version", [], |row| {
            row.get(0)
        })
        .expect("schema version exists");
    let category_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM category", [], |row| row.get(0))
        .expect("category rows exist");
    let parent_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM category WHERE parent_id IS NULL",
            [],
            |row| row.get(0),
        )
        .expect("parent rows exist");

    assert_eq!(schema_version, 1);
    assert_eq!(category_count, 79);
    assert_eq!(parent_count, 13);
    assert_eq!(category_count - parent_count, 66);
}

#[test]
fn seeded_children_all_point_to_level_one_categories() {
    let conn = open_in_memory().expect("database opens");
    let invalid_count: i64 = conn
        .query_row(
            "SELECT COUNT(*)
             FROM category child
             LEFT JOIN category parent ON parent.id = child.parent_id
             WHERE child.parent_id IS NOT NULL
               AND (parent.id IS NULL OR parent.parent_id IS NOT NULL)",
            [],
            |row| row.get(0),
        )
        .expect("category join succeeds");

    assert_eq!(invalid_count, 0);
}

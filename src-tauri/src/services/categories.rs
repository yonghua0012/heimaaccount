use crate::error::AppError;
use crate::models::Category;
use chrono::{SecondsFormat, Utc};
use rusqlite::{params, Connection, OptionalExtension};
use uuid::Uuid;

fn validate_name(name: &str) -> Result<String, AppError> {
    let trimmed = name.trim();
    let length = trimmed.chars().count();
    if !(1..=20).contains(&length) {
        return Err(AppError::validation("分类名称需要 1 到 20 个字符"));
    }
    Ok(trimmed.to_string())
}

fn read_category(conn: &Connection, id: &str) -> Result<Category, AppError> {
    conn.query_row(
        "SELECT id, parent_id, name, sort_order, active, built_in
         FROM category WHERE id = ?1",
        [id],
        |row| {
            Ok(Category {
                id: row.get(0)?,
                parent_id: row.get(1)?,
                name: row.get(2)?,
                sort_order: row.get(3)?,
                active: row.get::<_, i64>(4)? == 1,
                built_in: row.get::<_, i64>(5)? == 1,
            })
        },
    )
    .optional()?
    .ok_or_else(|| AppError::not_found("分类不存在"))
}

pub fn list_categories(conn: &Connection) -> Result<Vec<Category>, AppError> {
    let mut statement = conn.prepare(
        "SELECT child.id, child.parent_id, child.name, child.sort_order,
                child.active, child.built_in
         FROM category child
         LEFT JOIN category parent ON parent.id = child.parent_id
         ORDER BY COALESCE(parent.sort_order, child.sort_order),
                  CASE WHEN child.parent_id IS NULL THEN 0 ELSE 1 END,
                  child.sort_order,
                  child.name",
    )?;
    let rows = statement.query_map([], |row| {
        Ok(Category {
            id: row.get(0)?,
            parent_id: row.get(1)?,
            name: row.get(2)?,
            sort_order: row.get(3)?,
            active: row.get::<_, i64>(4)? == 1,
            built_in: row.get::<_, i64>(5)? == 1,
        })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(AppError::from)
}

pub fn create_category(
    conn: &mut Connection,
    parent_id: Option<&str>,
    name: &str,
) -> Result<Category, AppError> {
    let clean_name = validate_name(name)?;
    let transaction = conn.transaction()?;

    if let Some(parent) = parent_id {
        let parent_row = read_category(&transaction, parent)?;
        if parent_row.parent_id.is_some() {
            return Err(AppError::validation("分类最多只能有两级"));
        }
        if !parent_row.active {
            return Err(AppError::validation("不能在不启用的大类下新增分类"));
        }
    }

    let duplicate: i64 = transaction.query_row(
        "SELECT COUNT(*) FROM category
         WHERE name = ?1 COLLATE NOCASE
           AND ((parent_id IS NULL AND ?2 IS NULL) OR parent_id = ?2)",
        params![clean_name, parent_id],
        |row| row.get(0),
    )?;
    if duplicate > 0 {
        return Err(AppError::conflict("同一级分类下不能有重名分类"));
    }

    let next_sort: i64 = transaction.query_row(
        "SELECT COALESCE(MAX(sort_order), 0) + 10 FROM category
         WHERE (parent_id IS NULL AND ?1 IS NULL) OR parent_id = ?1",
        [parent_id],
        |row| row.get(0),
    )?;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true);
    transaction.execute(
        "INSERT INTO category
         (id, parent_id, name, sort_order, active, built_in, created_at)
         VALUES (?1, ?2, ?3, ?4, 1, 0, ?5)",
        params![id, parent_id, clean_name, next_sort, now],
    )?;
    transaction.commit()?;
    read_category(conn, &id)
}

pub fn rename_category(conn: &Connection, id: &str, name: &str) -> Result<Category, AppError> {
    let clean_name = validate_name(name)?;
    let existing = read_category(conn, id)?;
    let duplicate: i64 = conn.query_row(
        "SELECT COUNT(*) FROM category
         WHERE id <> ?1
           AND name = ?2 COLLATE NOCASE
           AND ((parent_id IS NULL AND ?3 IS NULL) OR parent_id = ?3)",
        params![id, clean_name, existing.parent_id],
        |row| row.get(0),
    )?;
    if duplicate > 0 {
        return Err(AppError::conflict("同一级分类下不能有重名分类"));
    }
    conn.execute(
        "UPDATE category SET name = ?2 WHERE id = ?1",
        params![id, clean_name],
    )?;
    read_category(conn, id)
}

pub fn set_category_active(
    conn: &Connection,
    id: &str,
    active: bool,
) -> Result<Category, AppError> {
    let category = read_category(conn, id)?;
    if active {
        if let Some(parent_id) = category.parent_id.as_deref() {
            let parent = read_category(conn, parent_id)?;
            if !parent.active {
                return Err(AppError::validation("请先启用所属大类"));
            }
        }
    }
    if !active && category.parent_id.is_none() {
        let active_children: i64 = conn.query_row(
            "SELECT COUNT(*) FROM category WHERE parent_id = ?1 AND active = 1",
            [id],
            |row| row.get(0),
        )?;
        if active_children > 0 {
            return Err(AppError::conflict("请先停用该大类下的二级分类"));
        }
    }
    let active_value = if active { 1 } else { 0 };
    conn.execute(
        "UPDATE category SET active = ?2 WHERE id = ?1",
        params![id, active_value],
    )?;
    read_category(conn, id)
}

pub fn move_category(
    conn: &Connection,
    id: &str,
    new_parent_id: &str,
) -> Result<Category, AppError> {
    let category = read_category(conn, id)?;
    if category.parent_id.is_none() {
        return Err(AppError::validation("首版只支持调整二级分类所属大类"));
    }
    let parent = read_category(conn, new_parent_id)?;
    if parent.parent_id.is_some() {
        return Err(AppError::validation("分类最多只能有两级"));
    }
    if !parent.active {
        return Err(AppError::validation("目标大类当前未启用"));
    }
    let used: i64 = conn.query_row(
        "SELECT COUNT(*) FROM expense WHERE category_id = ?1",
        [id],
        |row| row.get(0),
    )?;
    if used > 0 {
        return Err(AppError::conflict("已有支出记录使用该分类，不能调整归属"));
    }
    let duplicate: i64 = conn.query_row(
        "SELECT COUNT(*) FROM category
         WHERE id <> ?1 AND parent_id = ?2 AND name = ?3 COLLATE NOCASE",
        params![id, new_parent_id, category.name],
        |row| row.get(0),
    )?;
    if duplicate > 0 {
        return Err(AppError::conflict("目标大类下已有同名分类"));
    }
    conn.execute(
        "UPDATE category SET parent_id = ?2 WHERE id = ?1",
        params![id, new_parent_id],
    )?;
    read_category(conn, id)
}

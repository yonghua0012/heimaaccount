use crate::error::AppError;
use crate::models::{Expense, ExpenseDraft, ExpenseFilter};
use chrono::{Months, NaiveDate, SecondsFormat, Utc};
use rusqlite::types::Value;
use rusqlite::{params, params_from_iter, Connection, OptionalExtension};
use uuid::Uuid;

fn validate_month(month: &str) -> Result<(), AppError> {
    NaiveDate::parse_from_str(&format!("{month}-01"), "%Y-%m-%d")
        .map(|_| ())
        .map_err(|_| AppError::validation("月份格式应为 YYYY-MM"))
}

fn validate_draft(conn: &Connection, draft: &ExpenseDraft) -> Result<String, AppError> {
    if !(1..=9_999_999_999).contains(&draft.amount_cents) {
        return Err(AppError::validation(
            "金额需要在 ¥0.01 到 ¥99,999,999.99 之间",
        ));
    }
    NaiveDate::parse_from_str(&draft.spent_on, "%Y-%m-%d")
        .map_err(|_| AppError::validation("日期格式应为 YYYY-MM-DD"))?;
    let note = draft
        .note
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty());
    if note.is_some_and(|value| value.chars().count() > 200) {
        return Err(AppError::validation("备注不能超过 200 个字符"));
    }
    let parent_id: Option<String> = conn
        .query_row(
            "SELECT parent_id FROM category WHERE id = ?1 AND parent_id IS NOT NULL",
            [&draft.category_id],
            |row| row.get(0),
        )
        .optional()?;
    if parent_id.is_none() {
        return Err(AppError::validation("请选择一个有效的二级分类"));
    }
    Ok(note.unwrap_or_default().to_string())
}

fn category_is_active(conn: &Connection, category_id: &str) -> Result<bool, AppError> {
    conn.query_row(
        "SELECT active FROM category WHERE id = ?1 AND parent_id IS NOT NULL",
        [category_id],
        |row| row.get::<_, i64>(0),
    )
    .optional()
    .map(|value| value == Some(1))
    .map_err(AppError::from)
}

fn query_expense(conn: &Connection, id: &str) -> Result<Expense, AppError> {
    conn.query_row(
        "SELECT e.id, e.amount_cents, e.spent_on, e.category_id,
                child.name, parent.id, parent.name, e.note,
                e.created_at, e.updated_at
         FROM expense e
         JOIN category child ON child.id = e.category_id
         JOIN category parent ON parent.id = child.parent_id
         WHERE e.id = ?1",
        [id],
        |row| {
            Ok(Expense {
                id: row.get(0)?,
                amount_cents: row.get(1)?,
                spent_on: row.get(2)?,
                category_id: row.get(3)?,
                category_name: row.get(4)?,
                parent_category_id: row.get(5)?,
                parent_category_name: row.get(6)?,
                note: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        },
    )
    .optional()?
    .ok_or_else(|| AppError::not_found("支出记录不存在"))
}

pub fn read_expense(conn: &Connection, id: &str) -> Result<Expense, AppError> {
    query_expense(conn, id)
}

pub fn create_expense(conn: &mut Connection, draft: ExpenseDraft) -> Result<Expense, AppError> {
    let note = validate_draft(conn, &draft)?;
    if !category_is_active(conn, &draft.category_id)? {
        return Err(AppError::validation("该分类已停用，请选择其他分类"));
    }
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true);
    let trimmed_note = if note.is_empty() { None } else { Some(note) };
    conn.execute(
        "INSERT INTO expense
         (id, amount_cents, spent_on, category_id, note, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)",
        params![
            id,
            draft.amount_cents,
            draft.spent_on,
            draft.category_id,
            trimmed_note,
            now
        ],
    )?;
    query_expense(conn, &id)
}

pub fn update_expense(
    conn: &mut Connection,
    id: &str,
    draft: ExpenseDraft,
) -> Result<Expense, AppError> {
    let existing = query_expense(conn, id)?;
    let note = validate_draft(conn, &draft)?;
    if draft.category_id != existing.category_id && !category_is_active(conn, &draft.category_id)? {
        return Err(AppError::validation("该分类已停用，请选择其他分类"));
    }
    let now = Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true);
    let trimmed_note = if note.is_empty() { None } else { Some(note) };
    conn.execute(
        "UPDATE expense
         SET amount_cents = ?2, spent_on = ?3, category_id = ?4,
             note = ?5, updated_at = ?6
         WHERE id = ?1",
        params![
            id,
            draft.amount_cents,
            draft.spent_on,
            draft.category_id,
            trimmed_note,
            now
        ],
    )?;
    query_expense(conn, id)
}

pub fn delete_expense(conn: &Connection, id: &str) -> Result<(), AppError> {
    let affected = conn.execute("DELETE FROM expense WHERE id = ?1", [id])?;
    if affected == 0 {
        return Err(AppError::not_found("支出记录不存在"));
    }
    Ok(())
}

pub fn list_expenses(conn: &Connection, filter: ExpenseFilter) -> Result<Vec<Expense>, AppError> {
    validate_month(&filter.month)?;
    let start = format!("{}-01", filter.month);
    let next_month = NaiveDate::parse_from_str(&start, "%Y-%m-%d")
        .expect("validated month")
        .checked_add_months(Months::new(1))
        .expect("next month")
        .format("%Y-%m-%d")
        .to_string();

    let mut sql = String::from(
        "SELECT e.id, e.amount_cents, e.spent_on, e.category_id,
                child.name, parent.id, parent.name, e.note,
                e.created_at, e.updated_at
         FROM expense e
         JOIN category child ON child.id = e.category_id
         JOIN category parent ON parent.id = child.parent_id
         WHERE e.spent_on >= ?1 AND e.spent_on < ?2",
    );
    let mut values = vec![Value::Text(start), Value::Text(next_month)];
    if let Some(parent_id) = filter.parent_category_id {
        values.push(Value::Text(parent_id));
        sql.push_str(&format!(" AND parent.id = ?{}", values.len()));
    }
    if let Some(category_id) = filter.category_id {
        values.push(Value::Text(category_id));
        sql.push_str(&format!(" AND child.id = ?{}", values.len()));
    }
    if let Some(keyword) = filter.keyword.map(|value| value.trim().to_string()) {
        if !keyword.is_empty() {
            let escaped = keyword
                .replace('\\', "\\\\")
                .replace('%', "\\%")
                .replace('_', "\\_");
            values.push(Value::Text(format!("%{escaped}%")));
            sql.push_str(&format!(" AND e.note LIKE ?{} ESCAPE '\\'", values.len()));
        }
    }
    sql.push_str(" ORDER BY e.spent_on DESC, e.created_at DESC, e.id DESC");

    let mut statement = conn.prepare(&sql)?;
    let rows = statement.query_map(params_from_iter(values.iter()), |row| {
        Ok(Expense {
            id: row.get(0)?,
            amount_cents: row.get(1)?,
            spent_on: row.get(2)?,
            category_id: row.get(3)?,
            category_name: row.get(4)?,
            parent_category_id: row.get(5)?,
            parent_category_name: row.get(6)?,
            note: row.get(7)?,
            created_at: row.get(8)?,
            updated_at: row.get(9)?,
        })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(AppError::from)
}

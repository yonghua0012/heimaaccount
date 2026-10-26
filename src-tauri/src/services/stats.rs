use crate::error::AppError;
use crate::models::{CategoryTotal, MonthSummary};
use chrono::{Months, NaiveDate};
use rusqlite::{params, Connection};
use std::collections::HashMap;

fn month_range(month: &str) -> Result<(String, String), AppError> {
    let start = NaiveDate::parse_from_str(&format!("{month}-01"), "%Y-%m-%d")
        .map_err(|_| AppError::validation("月份格式应为 YYYY-MM"))?;
    let next = start
        .checked_add_months(Months::new(1))
        .ok_or_else(|| AppError::validation("月份超出支持范围"))?;
    Ok((
        start.format("%Y-%m-%d").to_string(),
        next.format("%Y-%m-%d").to_string(),
    ))
}

pub fn month_summary(conn: &Connection, month: &str) -> Result<MonthSummary, AppError> {
    let (start, next) = month_range(month)?;
    let total_cents: i64 = conn.query_row(
        "SELECT COALESCE(SUM(amount_cents), 0)
         FROM expense WHERE spent_on >= ?1 AND spent_on < ?2",
        params![start, next],
        |row| row.get(0),
    )?;

    let mut statement = conn.prepare(
        "SELECT parent.id, parent.name, child.id, child.name,
                SUM(expense.amount_cents) AS amount
         FROM expense
         JOIN category child ON child.id = expense.category_id
         JOIN category parent ON parent.id = child.parent_id
         WHERE expense.spent_on >= ?1 AND expense.spent_on < ?2
         GROUP BY parent.id, parent.name, child.id, child.name
         ORDER BY parent.sort_order, parent.name, child.sort_order, child.name",
    )?;
    let rows = statement.query_map(params![start, next], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, String>(2)?,
            row.get::<_, String>(3)?,
            row.get::<_, i64>(4)?,
        ))
    })?;

    let mut parents: Vec<CategoryTotal> = Vec::new();
    let mut parent_index: HashMap<String, usize> = HashMap::new();
    for row in rows {
        let (parent_id, parent_name, child_id, child_name, amount_cents) = row?;
        let index = if let Some(index) = parent_index.get(&parent_id) {
            *index
        } else {
            let index = parents.len();
            parent_index.insert(parent_id.clone(), index);
            parents.push(CategoryTotal {
                category_id: parent_id,
                category_name: parent_name,
                amount_cents: 0,
                children: Vec::new(),
            });
            index
        };
        parents[index].amount_cents += amount_cents;
        parents[index].children.push(CategoryTotal {
            category_id: child_id,
            category_name: child_name,
            amount_cents,
            children: Vec::new(),
        });
    }

    let grouped_total: i64 = parents.iter().map(|item| item.amount_cents).sum();
    if grouped_total != total_cents {
        return Err(AppError {
            code: "STORAGE".into(),
            message: "分类统计与月度合计不一致，请检查本地数据".into(),
        });
    }

    Ok(MonthSummary {
        month: month.to_string(),
        total_cents,
        categories: parents,
    })
}

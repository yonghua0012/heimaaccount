use crate::error::AppError;
use crate::models::{Expense, ExpenseFilter};
use crate::services::expenses::list_expenses;
use rusqlite::Connection;
use std::io::Write;
use std::path::Path;

pub fn export_all_csv(conn: &Connection, destination: &Path) -> Result<usize, AppError> {
    let months: Vec<String> = {
        let mut statement = conn.prepare(
            "SELECT DISTINCT substr(spent_on, 1, 7) AS month
             FROM expense ORDER BY month DESC",
        )?;
        let rows = statement.query_map([], |row| row.get(0))?;
        rows.collect::<Result<Vec<String>, _>>()?
    };

    let mut expenses: Vec<Expense> = Vec::new();
    for month in months {
        expenses.extend(list_expenses(
            conn,
            ExpenseFilter {
                month,
                ..ExpenseFilter::default()
            },
        )?);
    }

    let parent = destination
        .parent()
        .filter(|path| !path.as_os_str().is_empty())
        .unwrap_or_else(|| Path::new("."));
    let mut temp = tempfile::NamedTempFile::new_in(parent)?;
    temp.write_all(&[0xEF, 0xBB, 0xBF])?;
    {
        let mut writer = csv::WriterBuilder::new()
            .has_headers(false)
            .from_writer(&mut temp);
        writer.write_record([
            "日期",
            "一级分类",
            "二级分类",
            "金额（元）",
            "备注",
            "记录编号",
        ])?;
        for expense in &expenses {
            writer.write_record([
                expense.spent_on.clone(),
                expense.parent_category_name.clone(),
                expense.category_name.clone(),
                format!(
                    "{}.{:02}",
                    expense.amount_cents / 100,
                    expense.amount_cents % 100
                ),
                expense.note.clone().unwrap_or_default(),
                expense.id.clone(),
            ])?;
        }
        writer.flush()?;
    }
    temp.as_file_mut().sync_all()?;
    temp.persist(destination)
        .map_err(|error| AppError::storage(error.error))?;
    Ok(expenses.len())
}

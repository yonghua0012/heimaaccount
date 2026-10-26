use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Category {
    pub id: String,
    pub parent_id: Option<String>,
    pub name: String,
    pub sort_order: i64,
    pub active: bool,
    pub built_in: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExpenseDraft {
    pub amount_cents: i64,
    pub spent_on: String,
    pub category_id: String,
    pub note: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Expense {
    pub id: String,
    pub amount_cents: i64,
    pub spent_on: String,
    pub category_id: String,
    pub category_name: String,
    pub parent_category_id: String,
    pub parent_category_name: String,
    pub note: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ExpenseFilter {
    pub month: String,
    pub parent_category_id: Option<String>,
    pub category_id: Option<String>,
    pub keyword: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CategoryTotal {
    pub category_id: String,
    pub category_name: String,
    pub amount_cents: i64,
    pub children: Vec<CategoryTotal>,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MonthSummary {
    pub month: String,
    pub total_cents: i64,
    pub categories: Vec<CategoryTotal>,
}

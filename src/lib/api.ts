import { invoke } from "@tauri-apps/api/core";
import type {
  Category,
  Expense,
  ExpenseDraft,
  ExpenseFilter,
  MonthSummary,
} from "../types/domain";

export interface AppInfo {
  name: string;
  version: string;
  dataDir: string;
}

export function getErrorMessage(cause: unknown, fallback: string): string {
  if (
    typeof cause === "object" &&
    cause !== null &&
    "message" in cause &&
    typeof cause.message === "string"
  ) {
    return cause.message;
  }
  if (cause instanceof Error && cause.message) {
    return cause.message;
  }
  return fallback;
}

export const api = {
  getAppInfo: () => invoke<AppInfo>("get_app_info"),
  listCategories: () => invoke<Category[]>("list_categories"),
  createCategory: (parentId: string | null, name: string) =>
    invoke<Category>("create_category", { parentId, name }),
  renameCategory: (id: string, name: string) =>
    invoke<Category>("rename_category", { id, name }),
  setCategoryActive: (id: string, active: boolean) =>
    invoke<Category>("set_category_active", { id, active }),
  moveCategory: (id: string, newParentId: string) =>
    invoke<Category>("move_category", { id, newParentId }),
  listExpenses: (filter: ExpenseFilter) =>
    invoke<Expense[]>("list_expenses", { filter }),
  createExpense: (draft: ExpenseDraft) =>
    invoke<Expense>("create_expense", { draft }),
  updateExpense: (id: string, draft: ExpenseDraft) =>
    invoke<Expense>("update_expense", { id, draft }),
  deleteExpense: (id: string) => invoke<void>("delete_expense", { id }),
  getMonthSummary: (month: string) =>
    invoke<MonthSummary>("get_month_summary", { month }),
};

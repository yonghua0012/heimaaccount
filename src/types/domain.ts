export type PageKey = "overview" | "expenses" | "stats" | "game" | "settings";

export interface Category {
  id: string;
  parentId: string | null;
  name: string;
  sortOrder: number;
  active: boolean;
  builtIn: boolean;
}

export interface ExpenseDraft {
  amountCents: number;
  spentOn: string;
  categoryId: string;
  note: string | null;
}

export interface Expense {
  id: string;
  amountCents: number;
  spentOn: string;
  categoryId: string;
  categoryName: string;
  parentCategoryId: string;
  parentCategoryName: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseFilter {
  month: string;
  parentCategoryId?: string | null;
  categoryId?: string | null;
  keyword?: string | null;
}

export interface CategoryTotal {
  categoryId: string;
  categoryName: string;
  amountCents: number;
  children: CategoryTotal[];
}

export interface MonthSummary {
  month: string;
  totalCents: number;
  categories: CategoryTotal[];
}

export interface AppErrorShape {
  code: string;
  message: string;
}

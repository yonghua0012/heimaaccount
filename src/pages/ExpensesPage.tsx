import { useEffect, useState } from "react";
import { ExpenseFilters } from "../features/expenses/ExpenseFilters";
import { ExpenseTable } from "../features/expenses/ExpenseTable";
import { api, getErrorMessage } from "../lib/api";
import { currentMonth } from "../lib/date";
import type { Category, Expense, ExpenseFilter } from "../types/domain";

interface ExpensesPageProps {
  categories: Category[];
  revision: number;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}

export function ExpensesPage({
  categories,
  revision,
  onEdit,
  onDelete,
}: ExpensesPageProps) {
  const [filter, setFilter] = useState<ExpenseFilter>({ month: currentMonth() });
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api
      .listExpenses(filter)
      .then((rows) => {
        if (!active) return;
        setExpenses(rows);
        setError("");
      })
      .catch((cause) => {
        if (active) setError(getErrorMessage(cause, "加载失败"));
      });
    return () => {
      active = false;
    };
  }, [filter, revision]);

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">全部账目</p>
          <h1>支出明细</h1>
        </div>
      </header>
      <ExpenseFilters
        categories={categories}
        filter={filter}
        onChange={setFilter}
      />
      {error && <p role="alert">{error}</p>}
      <ExpenseTable expenses={expenses} onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
}

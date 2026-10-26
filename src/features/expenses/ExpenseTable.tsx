import { formatCny } from "../../lib/money";
import type { Expense } from "../../types/domain";

interface ExpenseTableProps {
  expenses: Expense[];
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}

export function ExpenseTable({
  expenses,
  onEdit,
  onDelete,
}: ExpenseTableProps) {
  if (expenses.length === 0) {
    return <p className="empty-state">当前筛选条件下没有支出记录。</p>;
  }
  return (
    <div className="table-scroll">
      <table className="expense-table">
        <thead>
          <tr>
            <th>日期</th>
            <th>分类</th>
            <th>备注</th>
            <th className="amount">金额</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((expense) => (
            <tr key={expense.id}>
              <td>{expense.spentOn}</td>
              <td>
                {expense.parentCategoryName} / {expense.categoryName}
              </td>
              <td>{expense.note || "—"}</td>
              <td className="amount">{formatCny(expense.amountCents)}</td>
              <td className="row-actions">
                <button type="button" onClick={() => onEdit(expense)}>
                  编辑 {expense.note || expense.categoryName}
                </button>
                <button type="button" onClick={() => onDelete(expense)}>
                  删除 {expense.note || expense.categoryName}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

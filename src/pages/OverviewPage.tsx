import { useEffect, useState } from "react";
import { api, getErrorMessage } from "../lib/api";
import { currentMonth, monthLabel } from "../lib/date";
import { formatCny } from "../lib/money";
import type { Expense, MonthSummary } from "../types/domain";

interface OverviewPageProps {
  revision: number;
  onAdd: () => void;
  onEdit: (expense: Expense) => void;
}

export function OverviewPage({ revision, onAdd, onEdit }: OverviewPageProps) {
  const [month, setMonth] = useState(currentMonth());
  const [summary, setSummary] = useState<MonthSummary | null>(null);
  const [recent, setRecent] = useState<Expense[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([api.getMonthSummary(month), api.listExpenses({ month })])
      .then(([nextSummary, expenses]) => {
        if (!active) return;
        setSummary(nextSummary);
        setRecent(expenses.slice(0, 10));
        setError("");
      })
      .catch((cause) => {
        if (active) setError(getErrorMessage(cause, "加载失败"));
      });
    return () => {
      active = false;
    };
  }, [month, revision]);

  return (
    <div className="page-stack">
      <header className="page-header overview-hero">
        <div>
          <p className="eyebrow">{monthLabel(month)}</p>
          <h1>本月支出</h1>
          <strong className="hero-amount">
            {formatCny(summary?.totalCents ?? 0)}
          </strong>
        </div>
        <button type="button" className="primary add-button" onClick={onAdd}>
          + 记一笔
        </button>
      </header>
      <label className="month-jump">
        <span>查看月份</span>
        <input
          type="month"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
        />
      </label>
      {error && <p role="alert">{error}</p>}
      <div className="overview-grid">
        <section className="panel">
          <header className="section-header">
            <h2>分类排行</h2>
            <span>{summary?.categories.length ?? 0} 个分类</span>
          </header>
          {summary?.categories.length === 0 && (
            <p className="empty-state">本月还没有支出。</p>
          )}
          <div className="ranking-list">
            {summary?.categories.map((item, index) => {
              const percent =
                summary.totalCents === 0
                  ? 0
                  : (item.amountCents / summary.totalCents) * 100;
              return (
                <div className="ranking-row" key={item.categoryId}>
                  <span className="rank-number">{index + 1}</span>
                  <div>
                    <div className="ranking-label">
                      <span>{item.categoryName}</span>
                      <strong>{formatCny(item.amountCents)}</strong>
                    </div>
                    <div className="bar" aria-hidden="true">
                      <span style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        <section className="panel">
          <header className="section-header">
            <h2>最近记录</h2>
            <span>最近 10 笔</span>
          </header>
          {recent.length === 0 && (
            <p className="empty-state">记下第一笔支出，让钱有迹可循。</p>
          )}
          <div className="recent-list">
            {recent.map((expense) => (
              <button
                key={expense.id}
                type="button"
                className="recent-row"
                onClick={() => onEdit(expense)}
              >
                <span className="recent-date">{expense.spentOn.slice(5)}</span>
                <span className="recent-category">
                  {expense.parentCategoryName} / {expense.categoryName}
                  <small>{expense.note || "无备注"}</small>
                </span>
                <strong>{formatCny(expense.amountCents)}</strong>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

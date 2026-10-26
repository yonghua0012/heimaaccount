import { useEffect, useState } from "react";
import { api, getErrorMessage } from "../lib/api";
import { currentMonth, monthLabel } from "../lib/date";
import { formatCny } from "../lib/money";
import type { MonthSummary } from "../types/domain";

interface StatsPageProps {
  revision: number;
}

export function StatsPage({ revision }: StatsPageProps) {
  const [month, setMonth] = useState(currentMonth());
  const [summary, setSummary] = useState<MonthSummary | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api
      .getMonthSummary(month)
      .then((value) => {
        if (!active) return;
        setSummary(value);
        setError("");
      })
      .catch((cause) => {
        if (active) setError(getErrorMessage(cause, "统计加载失败"));
      });
    return () => {
      active = false;
    };
  }, [month, revision]);

  function toggle(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="page-stack">
      <header className="page-header overview-hero">
        <div>
          <p className="eyebrow">{monthLabel(month)}</p>
          <h1>分类统计</h1>
          <strong className="hero-amount">
            {formatCny(summary?.totalCents ?? 0)}
          </strong>
        </div>
        <input
          className="month-picker"
          type="month"
          aria-label="统计月份"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
        />
      </header>
      {error && <p role="alert">{error}</p>}
      <section className="stat-list panel">
        {summary?.categories.length === 0 && (
          <p className="empty-state">本月还没有支出。</p>
        )}
        {summary?.categories.map((parent) => {
          const isOpen = expanded.has(parent.categoryId);
          const percent =
            summary.totalCents === 0
              ? 0
              : (parent.amountCents / summary.totalCents) * 100;
          return (
            <article key={parent.categoryId} className="stat-item">
              <button
                type="button"
                className="stat-heading"
                aria-expanded={isOpen}
                aria-label={`${isOpen ? "收起" : "展开"} ${parent.categoryName}`}
                onClick={() => toggle(parent.categoryId)}
              >
                <span>{parent.categoryName}</span>
                <strong>{formatCny(parent.amountCents)}</strong>
                <span>{percent.toFixed(1)}%</span>
              </button>
              <div className="bar" aria-hidden="true">
                <span style={{ width: `${percent}%` }} />
              </div>
              {isOpen && (
                <ul className="stat-children">
                  {parent.children.map((child) => (
                    <li key={child.categoryId}>
                      <span>{child.categoryName}</span>
                      <span>{formatCny(child.amountCents)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
}

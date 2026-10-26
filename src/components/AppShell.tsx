import type { ReactNode } from "react";
import type { PageKey } from "../types/domain";

interface AppShellProps {
  page: PageKey;
  onPageChange: (page: PageKey) => void;
  children: ReactNode;
}

const items: Array<{ key: PageKey; label: string }> = [
  { key: "overview", label: "总览" },
  { key: "expenses", label: "支出明细" },
  { key: "stats", label: "分类统计" },
  { key: "settings", label: "设置" },
];

export function AppShell({ page, onPageChange, children }: AppShellProps) {
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">黑马记账</div>
        <nav aria-label="主导航">
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              className={page === item.key ? "active" : ""}
              aria-current={page === item.key ? "page" : undefined}
              onClick={() => onPageChange(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <p className="sidebar-note">每一笔，都算数。</p>
      </aside>
      <section className="content">{children}</section>
    </main>
  );
}

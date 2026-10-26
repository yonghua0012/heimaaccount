import { useEffect, useState } from "react";
import { AppShell } from "./components/AppShell";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { ExpenseDrawer } from "./components/ExpenseDrawer";
import { FeedbackBanner } from "./components/FeedbackBanner";
import { api, getErrorMessage } from "./lib/api";
import { formatCny } from "./lib/money";
import { ExpensesPage } from "./pages/ExpensesPage";
import { OverviewPage } from "./pages/OverviewPage";
import type { Category, Expense, PageKey } from "./types/domain";

export default function App() {
  const [page, setPage] = useState<PageKey>("overview");
  const [categories, setCategories] = useState<Category[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: "success" | "warning";
  } | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    api
      .listCategories()
      .then(setCategories)
      .catch((cause) =>
        setLoadError(getErrorMessage(cause, "分类加载失败")),
      );
  }, [revision]);

  function openCreate() {
    setEditing(null);
    setDrawerOpen(true);
  }

  function openEdit(expense: Expense) {
    setEditing(expense);
    setDrawerOpen(true);
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api.deleteExpense(deleting.id);
      setDeleting(null);
      setFeedback({ message: "支出记录已删除", tone: "success" });
      setRevision((value) => value + 1);
    } catch (cause) {
      setFeedback({
        message: getErrorMessage(cause, "删除失败"),
        tone: "warning",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell page={page} onPageChange={setPage}>
      {feedback && (
        <FeedbackBanner
          message={feedback.message}
          tone={feedback.tone}
          onClose={() => setFeedback(null)}
        />
      )}
      {loadError && <p role="alert">{loadError}</p>}
      {page === "overview" && (
        <OverviewPage revision={revision} onAdd={openCreate} onEdit={openEdit} />
      )}
      {page === "expenses" && (
        <ExpensesPage
          categories={categories}
          revision={revision}
          onEdit={openEdit}
          onDelete={setDeleting}
        />
      )}
      {page === "stats" && (
        <div className="page-stack">
          <header className="page-header">
            <h1>分类统计</h1>
          </header>
        </div>
      )}
      {page === "settings" && (
        <div className="page-stack">
          <header className="page-header">
            <h1>设置</h1>
          </header>
        </div>
      )}
      <ExpenseDrawer
        open={drawerOpen}
        categories={categories}
        expense={editing}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => {
          setDrawerOpen(false);
          setFeedback({
            message: editing ? "支出已更新" : "支出已保存",
            tone: "success",
          });
          setEditing(null);
          setRevision((value) => value + 1);
        }}
      />
      {deleting && (
        <ConfirmDialog
          title="确认删除这笔支出？"
          detail={`${deleting.spentOn} · ${deleting.parentCategoryName} / ${deleting.categoryName} · ${formatCny(deleting.amountCents)}`}
          confirmLabel="确认删除"
          busy={busy}
          onCancel={() => setDeleting(null)}
          onConfirm={() => void confirmDelete()}
        />
      )}
    </AppShell>
  );
}

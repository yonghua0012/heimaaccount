import { useEffect, useMemo, useRef, useState } from "react";
import { api, getErrorMessage } from "../lib/api";
import { currentLocalDate } from "../lib/date";
import { parseMoneyToCents } from "../lib/money";
import type { Category, Expense } from "../types/domain";
import { CategoryPicker } from "./CategoryPicker";
import { MoneyInput } from "./MoneyInput";

interface ExpenseDrawerProps {
  open: boolean;
  categories: Category[];
  expense: Expense | null;
  onClose: () => void;
  onSaved: (expense: Expense) => void;
}

function initialAmount(expense: Expense | null): string {
  return expense ? (expense.amountCents / 100).toFixed(2) : "";
}

export function ExpenseDrawer({
  open,
  categories,
  expense,
  onClose,
  onSaved,
}: ExpenseDrawerProps) {
  const [amount, setAmount] = useState(initialAmount(expense));
  const [categoryId, setCategoryId] = useState<string | null>(
    expense?.categoryId ?? null,
  );
  const [spentOn, setSpentOn] = useState(
    expense?.spentOn ?? currentLocalDate(),
  );
  const [note, setNote] = useState(expense?.note ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setAmount(initialAmount(expense));
    setCategoryId(expense?.categoryId ?? null);
    setSpentOn(expense?.spentOn ?? currentLocalDate());
    setNote(expense?.note ?? "");
    setError("");
  }, [expense, open]);

  const recentIds = useMemo(() => {
    try {
      return JSON.parse(
        localStorage.getItem("recentCategoryIds") ?? "[]",
      ) as string[];
    } catch {
      return [];
    }
  }, [open]);

  if (!open) return null;

  async function save() {
    const amountCents = parseMoneyToCents(amount);
    if (amountCents === null) {
      setError("请输入大于 0 的有效金额，最多两位小数");
      amountRef.current?.focus();
      return;
    }
    if (!categoryId) {
      setError("请选择二级分类");
      return;
    }
    if (!spentOn) {
      setError("请选择消费日期");
      return;
    }
    if (Array.from(note.trim()).length > 200) {
      setError("备注不能超过 200 个字符");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const draft = {
        amountCents,
        spentOn,
        categoryId,
        note: note.trim() || null,
      };
      const saved = expense
        ? await api.updateExpense(expense.id, draft)
        : await api.createExpense(draft);
      localStorage.setItem(
        "recentCategoryIds",
        JSON.stringify(
          [categoryId, ...recentIds.filter((id) => id !== categoryId)].slice(
            0,
            6,
          ),
        ),
      );
      onSaved(saved);
    } catch (cause) {
      setError(getErrorMessage(cause, "保存失败，请重试"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="expense-drawer-title"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Escape" && !saving) onClose();
          if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
            void save();
          }
        }}
      >
        <header className="drawer-header">
          <div>
            <p className="eyebrow">快速记录</p>
            <h2 id="expense-drawer-title">
              {expense ? "编辑支出" : "记一笔"}
            </h2>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="关闭"
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <MoneyInput value={amount} onChange={setAmount} inputRef={amountRef} />
        <CategoryPicker
          categories={categories}
          value={categoryId}
          onChange={setCategoryId}
          recentIds={recentIds}
        />
        <label className="field">
          <span>日期</span>
          <input
            aria-label="日期"
            type="date"
            value={spentOn}
            onChange={(event) => setSpentOn(event.target.value)}
          />
        </label>
        <label className="field">
          <span>备注</span>
          <textarea
            aria-label="备注"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="这笔钱花在了哪里？"
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <footer className="drawer-footer">
          <span>Ctrl / ⌘ + Enter 保存</span>
          <div>
            <button type="button" className="secondary" onClick={onClose}>
              取消
            </button>
            <button
              type="button"
              className="primary"
              disabled={saving}
              onClick={() => void save()}
            >
              {saving ? "保存中" : "保存支出"}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

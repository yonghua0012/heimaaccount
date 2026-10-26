import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { api } from "../lib/api";
import type { Category } from "../types/domain";
import { ExpenseDrawer } from "./ExpenseDrawer";

vi.mock("../lib/api", () => ({
  getErrorMessage: (cause: unknown, fallback: string) =>
    cause instanceof Error ? cause.message : fallback,
  api: {
    createExpense: vi.fn().mockResolvedValue({}),
    updateExpense: vi.fn().mockResolvedValue({}),
  },
}));

const categories: Category[] = [
  {
    id: "food",
    parentId: null,
    name: "餐饮美食",
    sortOrder: 10,
    active: true,
    builtIn: true,
  },
  {
    id: "food-meals",
    parentId: "food",
    name: "正餐",
    sortOrder: 10,
    active: true,
    builtIn: true,
  },
];

describe("ExpenseDrawer", () => {
  it("saves a complete expense in cents", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    render(
      <ExpenseDrawer
        open
        categories={categories}
        expense={null}
        onClose={vi.fn()}
        onSaved={onSaved}
      />,
    );

    await user.type(screen.getByLabelText("金额"), "18.50");
    await user.click(screen.getByRole("button", { name: "餐饮美食" }));
    await user.click(screen.getByRole("button", { name: "正餐" }));
    await user.type(screen.getByLabelText("备注"), "工作日午餐");
    await user.click(screen.getByRole("button", { name: "保存支出" }));

    expect(api.createExpense).toHaveBeenCalledWith(
      expect.objectContaining({
        amountCents: 1850,
        categoryId: "food-meals",
        note: "工作日午餐",
      }),
    );
    expect(onSaved).toHaveBeenCalled();
  });

  it("does not save an invalid amount", async () => {
    const user = userEvent.setup();
    render(
      <ExpenseDrawer
        open
        categories={categories}
        expense={null}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText("金额"), "0");
    await user.click(screen.getByRole("button", { name: "保存支出" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "请输入大于 0 的有效金额",
    );
    expect(api.createExpense).not.toHaveBeenCalled();
  });
});

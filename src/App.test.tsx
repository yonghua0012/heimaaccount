import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { api } from "./lib/api";

vi.mock("./lib/api", () => ({
  getErrorMessage: (cause: unknown, fallback: string) =>
    cause instanceof Error ? cause.message : fallback,
  api: {
    listCategories: vi.fn(),
    listExpenses: vi.fn(),
    getMonthSummary: vi.fn(),
    createExpense: vi.fn(),
    updateExpense: vi.fn(),
    deleteExpense: vi.fn(),
  },
}));

const categories = [
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

const expense = {
  id: "e1",
  amountCents: 1850,
  spentOn: "2026-10-26",
  categoryId: "food-meals",
  categoryName: "正餐",
  parentCategoryId: "food",
  parentCategoryName: "餐饮美食",
  note: "午餐",
  createdAt: "2026-10-26T10:00:00Z",
  updatedAt: "2026-10-26T10:00:00Z",
};

beforeEach(() => {
  vi.mocked(api.listCategories).mockResolvedValue(categories);
  vi.mocked(api.listExpenses).mockResolvedValue([expense]);
  vi.mocked(api.getMonthSummary).mockResolvedValue({
    month: "2026-10",
    totalCents: 1850,
    categories: [
      {
        categoryId: "food",
        categoryName: "餐饮美食",
        amountCents: 1850,
        children: [
          {
            categoryId: "food-meals",
            categoryName: "正餐",
            amountCents: 1850,
            children: [],
          },
        ],
      },
    ],
  });
});

describe("expense workflows", () => {
  it("opens the list and edits a record", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "支出明细" }));

    expect(await screen.findByText("午餐")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "编辑 午餐" }));
    expect(screen.getByRole("dialog", { name: "编辑支出" })).toBeInTheDocument();
  });

  it("deletes only after confirmation", async () => {
    const user = userEvent.setup();
    vi.mocked(api.deleteExpense).mockResolvedValue(undefined);
    render(<App />);
    await user.click(screen.getByRole("button", { name: "支出明细" }));
    await user.click(await screen.findByRole("button", { name: "删除 午餐" }));

    expect(api.deleteExpense).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "确认删除" }));
    await waitFor(() => expect(api.deleteExpense).toHaveBeenCalledWith("e1"));
  });
});

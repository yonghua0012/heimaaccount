import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
    createCategory: vi.fn(),
    renameCategory: vi.fn(),
    setCategoryActive: vi.fn(),
    moveCategory: vi.fn(),
    ensureDailyBackup: vi.fn(),
    getAppInfo: vi.fn(),
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
  vi.mocked(api.ensureDailyBackup).mockResolvedValue({
    message: "自动备份已保存",
    affectedCount: null,
  });
  vi.mocked(api.getAppInfo).mockResolvedValue({
    name: "黑马记账",
    version: "0.1.0",
    dataDir: "C:\\Test\\HeimaLedger",
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
    await waitFor(() => expect(api.ensureDailyBackup).toHaveBeenCalled());
  });

  it("shows the hierarchical monthly breakdown", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "分类统计" }));

    expect(await screen.findByText("餐饮美食")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "展开 餐饮美食" }));
    expect(screen.getByText("正餐")).toBeInTheDocument();
    expect(screen.getAllByText("¥18.50")).toHaveLength(3);
  });

  it("creates a second-level category from settings", async () => {
    const user = userEvent.setup();
    vi.mocked(api.createCategory).mockResolvedValue({
      id: "food-work",
      parentId: "food",
      name: "工作午餐",
      sortOrder: 80,
      active: true,
      builtIn: false,
    });
    render(<App />);
    await user.click(screen.getByRole("button", { name: "设置" }));
    await screen.findByRole("option", { name: "餐饮美食" });
    await user.selectOptions(screen.getByLabelText("所属大类"), "food");
    await user.type(screen.getByLabelText("分类名称"), "工作午餐");
    await user.click(screen.getByRole("button", { name: "新增分类" }));

    await waitFor(() =>
      expect(api.createCategory).toHaveBeenCalledWith("food", "工作午餐"),
    );
  });

  it("shows local data controls and application information", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "设置" }));

    expect(await screen.findByText("黑马记账 0.1.0")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "立即备份" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "从备份恢复" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "导出 CSV" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "打开数据目录" })).toBeInTheDocument();
  });

  it("focuses the safe action when a delete confirmation opens", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "支出明细" }));
    await user.click(await screen.findByRole("button", { name: "删除 午餐" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "取消" })).toHaveFocus(),
    );
  });

  it("closes a confirmation dialog with Escape", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "支出明细" }));
    await user.click(await screen.findByRole("button", { name: "删除 午餐" }));
    fireEvent.keyDown(
      screen.getByRole("dialog", { name: "确认删除这笔支出？" }),
      { key: "Escape" },
    );

    expect(
      screen.queryByRole("dialog", { name: "确认删除这笔支出？" }),
    ).not.toBeInTheDocument();
  });

  it("exposes the current navigation page to assistive technology", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "分类统计" }));
    expect(
      screen.getByRole("button", { name: "分类统计" }),
    ).toHaveAttribute("aria-current", "page");
  });
});

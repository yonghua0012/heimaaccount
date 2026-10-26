import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Category } from "../types/domain";
import { CategoryPicker } from "./CategoryPicker";

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
  {
    id: "food-cafe",
    parentId: "food",
    name: "咖啡茶饮",
    sortOrder: 20,
    active: true,
    builtIn: true,
  },
];

describe("CategoryPicker", () => {
  it("selects a second-level category after its parent", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <CategoryPicker
        categories={categories}
        value={null}
        onChange={onChange}
        recentIds={[]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "餐饮美食" }));
    await user.click(screen.getByRole("button", { name: "正餐" }));

    expect(onChange).toHaveBeenCalledWith("food-meals");
  });
});

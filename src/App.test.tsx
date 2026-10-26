import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App shell", () => {
  it("renders the product and primary navigation", () => {
    render(<App />);

    expect(screen.getByText("黑马记账")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "总览" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "支出明细" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "分类统计" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "设置" })).toBeInTheDocument();
  });
});

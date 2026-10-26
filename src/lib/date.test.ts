import { describe, expect, it } from "vitest";
import { monthLabel } from "./date";

describe("date helpers", () => {
  it("formats a YYYY-MM month for the interface", () => {
    expect(monthLabel("2026-10")).toBe("2026 年 10 月");
  });
});

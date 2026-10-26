import { describe, expect, it } from "vitest";
import { formatCny, parseMoneyToCents } from "./money";

describe("money helpers", () => {
  it("parses yuan amounts to integer cents", () => {
    expect(parseMoneyToCents("18")).toBe(1800);
    expect(parseMoneyToCents("18.5")).toBe(1850);
    expect(parseMoneyToCents("¥18.50")).toBe(1850);
    expect(parseMoneyToCents(" 0.01 ")).toBe(1);
  });

  it("rejects invalid and out-of-range amounts", () => {
    expect(parseMoneyToCents("")).toBeNull();
    expect(parseMoneyToCents("0")).toBeNull();
    expect(parseMoneyToCents("1.001")).toBeNull();
    expect(parseMoneyToCents("-2")).toBeNull();
    expect(parseMoneyToCents("abc")).toBeNull();
    expect(parseMoneyToCents("100000000")).toBeNull();
  });

  it("formats cents as two-decimal RMB", () => {
    expect(formatCny(123456).replace(/\s/g, "")).toBe("¥1,234.56");
  });
});

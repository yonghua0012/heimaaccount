const MAX_CENTS = 9_999_999_999;

export function parseMoneyToCents(raw: string): number | null {
  const normalized = raw.trim().replace(/^¥/, "").replace(/,/g, "");
  if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(normalized)) {
    return null;
  }
  const [whole, fraction = ""] = normalized.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return cents >= 1 && cents <= MAX_CENTS ? cents : null;
}

export function formatCny(cents: number): string {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function currentLocalDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function currentMonth(): string {
  return currentLocalDate().slice(0, 7);
}

export function monthLabel(month: string): string {
  const [year, monthNumber] = month.split("-");
  return `${year} 年 ${Number(monthNumber)} 月`;
}

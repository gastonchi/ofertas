import { isYmd } from "@/modules/alerts/date-range";
import { argentinaDay } from "@/scraping/db";

export const EXPENSE_PAGE_SIZE = 20;

export type ExpenseListParams = {
  from: string;
  to: string;
  q: string;
  page: number;
};

function monthStartYmd(today: string): string {
  const [year, month] = today.split("-");
  return `${year}-${month}-01`;
}

export function defaultExpenseListRange(today = argentinaDay()): {
  from: string;
  to: string;
} {
  return { from: monthStartYmd(today), to: today };
}

export function parseExpenseListParams(
  raw: Record<string, string | string[] | undefined>,
  today = argentinaDay(),
): ExpenseListParams {
  const defaults = defaultExpenseListRange(today);
  const fromRaw = String(raw.from ?? "").trim();
  const toRaw = String(raw.to ?? "").trim();
  const from = isYmd(fromRaw) ? fromRaw : defaults.from;
  let to = isYmd(toRaw) ? toRaw : defaults.to;
  if (from > to) to = from;

  const q = String(raw.q ?? "").trim().slice(0, 80);
  const pageRaw = Number(String(raw.page ?? "1"));
  const page =
    Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  return { from, to, q, page };
}

export function expenseListQueryString(
  params: ExpenseListParams,
  overrides?: Partial<ExpenseListParams>,
): string {
  const merged = { ...params, ...overrides };
  const search = new URLSearchParams();
  search.set("from", merged.from);
  search.set("to", merged.to);
  if (merged.q) search.set("q", merged.q);
  if (merged.page > 1) search.set("page", String(merged.page));
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

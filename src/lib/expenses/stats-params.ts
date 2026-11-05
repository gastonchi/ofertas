import { isYmd } from "@/modules/alerts/date-range";
import { argentinaDay } from "@/scraping/db";

export type ExpenseStatsPreset =
  | "month"
  | "prev-month"
  | "3m"
  | "6m"
  | "ytd"
  | "custom";

export type ExpenseStatsParams = {
  from: string;
  to: string;
  /** UUID de rubro; vacío = todos */
  rubro: string;
  preset: ExpenseStatsPreset;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PRESET_SET = new Set<string>([
  "month",
  "prev-month",
  "3m",
  "6m",
  "ytd",
  "custom",
]);

function parseRubroParam(raw: string): string {
  const value = raw.trim();
  return UUID_RE.test(value) ? value : "";
}

function parseYmdParts(ymd: string): { year: number; month: number; day: number } {
  const [year, month, day] = ymd.split("-").map(Number);
  return { year, month, day };
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatYmd(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function monthStart(year: number, month: number): string {
  return formatYmd(year, month, 1);
}

function shiftMonth(year: number, month: number, delta: number): {
  year: number;
  month: number;
} {
  let m = month + delta;
  let y = year;
  while (m <= 0) {
    m += 12;
    y -= 1;
  }
  while (m > 12) {
    m -= 12;
    y += 1;
  }
  return { year: y, month: m };
}

export function addDaysYmd(ymd: string, days: number): string {
  const dt = new Date(`${ymd}T12:00:00.000-03:00`);
  dt.setTime(dt.getTime() + days * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(dt);
}

export function periodDayCount(from: string, to: string): number {
  const start = new Date(`${from}T12:00:00.000-03:00`).getTime();
  const end = new Date(`${to}T12:00:00.000-03:00`).getTime();
  return Math.round((end - start) / 86_400_000) + 1;
}

/** Meses calendario (YYYY-MM) con al menos un día dentro de [from, to]. */
export function listMonthKeys(from: string, to: string): string[] {
  const start = parseYmdParts(from);
  const end = parseYmdParts(to);
  const keys: string[] = [];
  let { year, month } = start;
  const endKey = end.year * 100 + end.month;
  while (year * 100 + month <= endKey) {
    keys.push(`${year}-${pad2(month)}`);
    ({ year, month } = shiftMonth(year, month, 1));
  }
  return keys;
}

export function previousPeriodRange(
  from: string,
  to: string,
): { from: string; to: string } {
  const days = periodDayCount(from, to);
  const prevTo = addDaysYmd(from, -1);
  const prevFrom = addDaysYmd(prevTo, -(days - 1));
  return { from: prevFrom, to: prevTo };
}

export function resolveStatsPresetRange(
  preset: ExpenseStatsPreset,
  today = argentinaDay(),
): { from: string; to: string } {
  const { year, month } = parseYmdParts(today);

  switch (preset) {
    case "month":
      return { from: monthStart(year, month), to: today };
    case "prev-month": {
      const prev = shiftMonth(year, month, -1);
      return {
        from: monthStart(prev.year, prev.month),
        to: formatYmd(
          prev.year,
          prev.month,
          lastDayOfMonth(prev.year, prev.month),
        ),
      };
    }
    case "3m": {
      const start = shiftMonth(year, month, -2);
      return { from: monthStart(start.year, start.month), to: today };
    }
    case "6m": {
      const start = shiftMonth(year, month, -5);
      return { from: monthStart(start.year, start.month), to: today };
    }
    case "ytd":
      return { from: `${year}-01-01`, to: today };
    case "custom":
    default:
      return resolveStatsPresetRange("6m", today);
  }
}

export function defaultExpenseStatsParams(
  today = argentinaDay(),
): ExpenseStatsParams {
  const range = resolveStatsPresetRange("6m", today);
  return {
    ...range,
    rubro: "",
    preset: "6m",
  };
}

export function parseExpenseStatsParams(
  raw: Record<string, string | string[] | undefined>,
  today = argentinaDay(),
): ExpenseStatsParams {
  const presetRaw = String(raw.preset ?? "").trim();
  const fromRaw = String(raw.from ?? "").trim();
  const toRaw = String(raw.to ?? "").trim();
  const hasCustomDates = isYmd(fromRaw) && isYmd(toRaw);

  let preset: ExpenseStatsPreset;
  if (PRESET_SET.has(presetRaw)) {
    preset = presetRaw as ExpenseStatsPreset;
  } else if (hasCustomDates) {
    preset = "custom";
  } else {
    preset = "6m";
  }

  const rubro = parseRubroParam(String(raw.rubro ?? ""));

  if (preset === "custom" && hasCustomDates) {
    const from = fromRaw;
    const to = toRaw >= fromRaw ? toRaw : fromRaw;
    return { from, to, rubro, preset };
  }

  const range = resolveStatsPresetRange(preset, today);
  let { from, to } = range;
  if (from > to) to = from;
  return { from, to, rubro, preset };
}

export function expenseStatsQueryString(
  params: ExpenseStatsParams,
  overrides?: Partial<ExpenseStatsParams>,
): string {
  const merged = { ...params, ...overrides };
  const search = new URLSearchParams();
  search.set("preset", merged.preset);
  if (merged.preset === "custom") {
    search.set("from", merged.from);
    search.set("to", merged.to);
  }
  if (merged.rubro) search.set("rubro", merged.rubro);
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const dt = new Date(`${year}-${month}-01T12:00:00.000-03:00`);
  return new Intl.DateTimeFormat("es-AR", {
    month: "short",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(dt);
}

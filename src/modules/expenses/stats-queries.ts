import { requireAuth } from "@/lib/auth";
import { createDb } from "@/lib/db/client";
import {
  DEFAULT_EXPENSE_ICON,
  isExpenseIcon,
  type ExpenseIconKey,
} from "@/lib/expenses/icons";
import {
  listMonthKeys,
  monthLabel,
  previousPeriodRange,
  type ExpenseStatsParams,
} from "@/lib/expenses/stats-params";
import type {
  ExpenseStats,
  StatsBreakdownRow,
  StatsMonthRow,
} from "@/lib/expenses/stats-types";
import { isMissingExpensesSchema } from "@/modules/expenses/queries";

type Row = Record<string, unknown>;

const STATS_SELECT =
  "amount, spent_on, category_id, subcategory_id, expense_categories (name, icon), expense_subcategories (name)";

type RawExpense = {
  amount: number;
  spent_on: string;
  category_id: string;
  subcategory_id: string | null;
  category_name: string;
  category_icon: ExpenseIconKey;
  subcategory_name: string | null;
};

function mapRaw(row: Row): RawExpense {
  const category = (row.expense_categories ?? {}) as Row;
  const subcategory = row.expense_subcategories as Row | null;
  const icon = String(category.icon ?? "");
  return {
    amount: Number(row.amount ?? 0),
    spent_on: String(row.spent_on ?? ""),
    category_id: String(row.category_id ?? ""),
    subcategory_id:
      row.subcategory_id != null ? String(row.subcategory_id) : null,
    category_name: String(category.name ?? "Sin rubro"),
    category_icon: isExpenseIcon(icon) ? icon : DEFAULT_EXPENSE_ICON,
    subcategory_name:
      subcategory && typeof subcategory.name === "string"
        ? subcategory.name
        : null,
  };
}

async function fetchExpensesBetween(
  from: string,
  to: string,
  rubro: string,
): Promise<RawExpense[] | null> {
  const db = createDb();
  let query = db
    .from("expenses")
    .select(STATS_SELECT)
    .gte("spent_on", from)
    .lte("spent_on", to);

  if (rubro) {
    query = query.eq("category_id", rubro);
  }

  const { data, error } = await query;

  if (error) {
    if (isMissingExpensesSchema(error)) return null;
    throw new Error(error.message);
  }

  return ((data ?? []) as Row[]).map(mapRaw);
}

function sumAmount(rows: RawExpense[]): number {
  return rows.reduce((acc, row) => acc + row.amount, 0);
}

function percent(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

function buildBreakdown(
  rows: RawExpense[],
  level: "rubro" | "subrubro",
  total: number,
  monthsInRange: number,
): StatsBreakdownRow[] {
  const map = new Map<
    string,
    { name: string; icon: StatsBreakdownRow["icon"]; amount: number }
  >();

  for (const row of rows) {
    if (level === "rubro") {
      const existing = map.get(row.category_id);
      map.set(row.category_id, {
        name: row.category_name,
        icon: row.category_icon,
        amount: (existing?.amount ?? 0) + row.amount,
      });
    } else {
      const id = row.subcategory_id ?? `__none__:${row.category_id}`;
      const name = row.subcategory_name ?? "Sin subrubro";
      const existing = map.get(id);
      map.set(id, {
        name,
        icon: null,
        amount: (existing?.amount ?? 0) + row.amount,
      });
    }
  }

  return [...map.entries()]
    .map(([id, value]) => ({
      id,
      name: value.name,
      icon: value.icon,
      amount: value.amount,
      percent: percent(value.amount, total),
      monthlyAverage:
        monthsInRange > 0
          ? Math.round(value.amount / monthsInRange)
          : value.amount,
    }))
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name, "es"));
}

function buildByMonth(
  rows: RawExpense[],
  from: string,
  to: string,
): StatsMonthRow[] {
  const monthKeys = listMonthKeys(from, to);
  const byMonthCat = new Map<string, Map<string, { name: string; amount: number }>>();

  for (const key of monthKeys) {
    byMonthCat.set(key, new Map());
  }

  for (const row of rows) {
    const monthKey = row.spent_on.slice(0, 7);
    if (!byMonthCat.has(monthKey)) continue;
    const cats = byMonthCat.get(monthKey)!;
    const existing = cats.get(row.category_id);
    cats.set(row.category_id, {
      name: row.category_name,
      amount: (existing?.amount ?? 0) + row.amount,
    });
  }

  return monthKeys.map((month) => {
    const cats = byMonthCat.get(month)!;
    const segments = [...cats.entries()]
      .map(([categoryId, value]) => ({
        categoryId,
        name: value.name,
        amount: value.amount,
      }))
      .sort((a, b) => b.amount - a.amount);
    const total = segments.reduce((acc, seg) => acc + seg.amount, 0);
    return {
      month,
      label: monthLabel(month),
      total,
      segments,
    };
  });
}

function topCategoryIds(byMonth: StatsMonthRow[], limit = 6): string[] {
  const totals = new Map<string, { name: string; amount: number }>();
  for (const month of byMonth) {
    for (const seg of month.segments) {
      const existing = totals.get(seg.categoryId);
      totals.set(seg.categoryId, {
        name: seg.name,
        amount: (existing?.amount ?? 0) + seg.amount,
      });
    }
  }
  return [...totals.entries()]
    .sort((a, b) => b[1].amount - a[1].amount)
    .slice(0, limit)
    .map(([id]) => id);
}

function computeChangePercent(
  current: number,
  previous: number,
): number | null {
  if (previous <= 0) return current > 0 ? null : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export async function getExpenseStats(
  params: ExpenseStatsParams,
): Promise<ExpenseStats | null> {
  await requireAuth();

  const prev = previousPeriodRange(params.from, params.to);
  const [currentRows, previousRows] = await Promise.all([
    fetchExpensesBetween(params.from, params.to, params.rubro),
    fetchExpensesBetween(prev.from, prev.to, params.rubro),
  ]);

  if (currentRows === null || previousRows === null) return null;

  const monthsInRange = listMonthKeys(params.from, params.to).length;
  const total = sumAmount(currentRows);
  const previousTotal = sumAmount(previousRows);
  const breakdownLevel = params.rubro ? "subrubro" : "rubro";
  const byMonth = buildByMonth(currentRows, params.from, params.to);

  return {
    from: params.from,
    to: params.to,
    total,
    monthlyAverage:
      monthsInRange > 0 ? Math.round(total / monthsInRange) : total,
    monthsInRange,
    previousPeriod: { ...prev, total: previousTotal },
    changeVsPreviousPercent: computeChangePercent(total, previousTotal),
    breakdownLevel,
    breakdown: buildBreakdown(
      currentRows,
      breakdownLevel,
      total,
      monthsInRange,
    ),
    byMonth,
    chartCategoryIds: topCategoryIds(byMonth),
  };
}

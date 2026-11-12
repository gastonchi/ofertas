import { requireAuth } from "@/lib/auth";
import { displayName, isAppUser } from "@/lib/auth/users";
import { createDb } from "@/lib/db/client";
import { DEFAULT_EXPENSE_ICON, isExpenseIcon } from "@/lib/expenses/icons";
import { CREDIT_CARD_NOTE_PREFIX } from "@/lib/expenses/installments";
import {
  EXPENSE_PAGE_SIZE,
  type ExpenseListParams,
} from "@/lib/expenses/list-params";
import type {
  ExpenseCategory,
  ExpenseListResult,
  ExpenseRow,
  ExpenseSubcategory,
} from "@/lib/expenses/types";

type Row = Record<string, unknown>;

const EXPENSE_SELECT =
  "id, category_id, subcategory_id, amount, spent_on, notes, created_by, created_at, expense_categories (name, icon), expense_subcategories (name)";

function escapeIlike(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function toSubcategory(row: Row): ExpenseSubcategory {
  return {
    id: String(row.id),
    category_id: String(row.category_id),
    name: String(row.name ?? ""),
    sort_order: Number(row.sort_order ?? 0),
    active: row.active !== false,
  };
}

function byOrderThenName(
  a: { sort_order: number; name: string },
  b: { sort_order: number; name: string },
) {
  return a.sort_order - b.sort_order || a.name.localeCompare(b.name, "es");
}

function mapExpenseRow(row: Row): ExpenseRow {
  const category = (row.expense_categories ?? {}) as Row;
  const subcategory = row.expense_subcategories as Row | null;
  const icon = String(category.icon ?? "");
  const createdBy = String(row.created_by ?? "");
  return {
    id: String(row.id),
    category_id: String(row.category_id ?? ""),
    subcategory_id:
      row.subcategory_id != null ? String(row.subcategory_id) : null,
    amount: Number(row.amount ?? 0),
    spent_on: String(row.spent_on ?? ""),
    notes: typeof row.notes === "string" && row.notes ? row.notes : null,
    created_by: createdBy,
    created_by_name: isAppUser(createdBy) ? displayName(createdBy) : createdBy,
    created_at: String(row.created_at ?? ""),
    category_name: String(category.name ?? ""),
    category_icon: isExpenseIcon(icon) ? icon : DEFAULT_EXPENSE_ICON,
    subcategory_name:
      subcategory && typeof subcategory.name === "string"
        ? subcategory.name
        : null,
  };
}

export function isMissingExpensesSchema(error: {
  code?: string;
  message: string;
}): boolean {
  return error.code === "PGRST205" || error.code === "42P01";
}

/** `null` si todavía no se ejecutó la migración de gastos. */
export async function listExpenseCategories({
  includeInactive = false,
}: { includeInactive?: boolean } = {}): Promise<ExpenseCategory[] | null> {
  await requireAuth();
  const db = createDb();
  const { data, error } = await db
    .from("expense_categories")
    .select("id, name, icon, sort_order, active, expense_subcategories (*)");

  if (error) {
    if (isMissingExpensesSchema(error)) return null;
    throw new Error(error.message);
  }

  return ((data ?? []) as Row[])
    .map((row) => {
      const icon = String(row.icon ?? "");
      const subs = Array.isArray(row.expense_subcategories)
        ? (row.expense_subcategories as Row[]).map(toSubcategory)
        : [];
      return {
        id: String(row.id),
        name: String(row.name ?? ""),
        icon: isExpenseIcon(icon) ? icon : DEFAULT_EXPENSE_ICON,
        sort_order: Number(row.sort_order ?? 0),
        active: row.active !== false,
        subcategories: subs
          .filter((sub) => includeInactive || sub.active)
          .sort(byOrderThenName),
      };
    })
    .filter((category) => includeInactive || category.active)
    .sort(byOrderThenName);
}

export async function listExpensesPaginated(
  params: ExpenseListParams,
): Promise<ExpenseListResult | null> {
  await requireAuth();
  const db = createDb();
  const pageSize = EXPENSE_PAGE_SIZE;
  const from = (params.page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = db
    .from("expenses")
    .select(EXPENSE_SELECT, { count: "exact" })
    .gte("spent_on", params.from)
    .lte("spent_on", params.to)
    .order("spent_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (params.rubro) {
    query = query.eq("category_id", params.rubro);
  }

  if (!params.showTc) {
    query = query.or(
      `notes.is.null,notes.not.ilike.${CREDIT_CARD_NOTE_PREFIX}%`,
    );
  }

  const q = params.q.trim();
  if (q) {
    const pattern = `%${escapeIlike(q)}%`;
    const orParts = [`notes.ilike.${pattern}`];

    const amount = Number(q.replace(/\./g, "").replace(/,/g, ""));
    if (/^\d+$/.test(q.replace(/\./g, "").replace(/,/g, "")) && amount > 0) {
      orParts.push(`amount.eq.${amount}`);
    }

    const qLower = q.toLowerCase();
    if (qLower.includes("gast") || qLower.includes("gastón")) {
      orParts.push("created_by.eq.gaston");
    }
    if (qLower.includes("mica")) {
      orParts.push("created_by.eq.micaela");
    }

    const { data: catMatches } = await db
      .from("expense_categories")
      .select("id")
      .ilike("name", pattern);
    const catIds = (catMatches ?? []).map((row) => String(row.id));
    if (catIds.length > 0) {
      orParts.push(`category_id.in.(${catIds.join(",")})`);
    }

    const { data: subMatches } = await db
      .from("expense_subcategories")
      .select("id")
      .ilike("name", pattern);
    const subIds = (subMatches ?? []).map((row) => String(row.id));
    if (subIds.length > 0) {
      orParts.push(`subcategory_id.in.(${subIds.join(",")})`);
    }

    query = query.or(orParts.join(","));
  }

  const { data, error, count } = await query.range(from, to);

  if (error) {
    if (isMissingExpensesSchema(error)) return null;
    throw new Error(error.message);
  }

  const total = count ?? 0;
  const maxPage = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(params.page, maxPage);

  if (page !== params.page && total > 0) {
    return listExpensesPaginated({ ...params, page });
  }

  return {
    rows: ((data ?? []) as Row[]).map(mapExpenseRow),
    total,
    page,
    pageSize,
  };
}

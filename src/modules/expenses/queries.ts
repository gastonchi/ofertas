import { requireAuth } from "@/lib/auth";
import { displayName, isAppUser } from "@/lib/auth/users";
import { createDb } from "@/lib/db/client";
import { DEFAULT_EXPENSE_ICON, isExpenseIcon } from "@/lib/expenses/icons";
import type {
  ExpenseCategory,
  ExpenseRow,
  ExpenseSubcategory,
} from "@/lib/expenses/types";

type Row = Record<string, unknown>;

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

export async function listRecentExpenses(limit = 10): Promise<ExpenseRow[]> {
  await requireAuth();
  const db = createDb();
  const { data, error } = await db
    .from("expenses")
    .select(
      "id, amount, spent_on, notes, created_by, created_at, expense_categories (name, icon), expense_subcategories (name)",
    )
    .order("spent_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingExpensesSchema(error)) return [];
    throw new Error(error.message);
  }

  return ((data ?? []) as Row[]).map((row) => {
    const category = (row.expense_categories ?? {}) as Row;
    const subcategory = row.expense_subcategories as Row | null;
    const icon = String(category.icon ?? "");
    const createdBy = String(row.created_by ?? "");
    return {
      id: String(row.id),
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
  });
}

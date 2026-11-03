"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth";
import { createDb } from "@/lib/db/client";
import { DEFAULT_EXPENSE_ICON, isExpenseIcon } from "@/lib/expenses/icons";
import { isMissingExpensesSchema } from "@/modules/expenses/queries";

export type CategoryFormState = {
  error?: string;
  success?: string;
};

/** `archived`: tenía gastos, así que se ocultó en lugar de borrarse. */
export type CategoryMutationResult =
  | { ok: true; archived?: boolean }
  | { error: string };

const MAX_NAME = 40;

type DbError = { code?: string; message: string };

function friendlyError(error: DbError, kind: "rubro" | "subrubro"): string {
  if (isMissingExpensesSchema(error)) {
    return "Faltan las tablas de gastos. Ejecutá supabase/migrations/20261103_expenses.sql en el SQL Editor.";
  }
  if (error.code === "23505") {
    return kind === "rubro"
      ? "Ya existe un rubro con ese nombre."
      : "Ese rubro ya tiene un subrubro con ese nombre.";
  }
  return error.message;
}

function parseName(raw: unknown): string | { error: string } {
  const name = String(raw ?? "").trim().replace(/\s+/g, " ");
  if (!name) return { error: "El nombre es obligatorio." };
  if (name.length > MAX_NAME) {
    return { error: `El nombre admite hasta ${MAX_NAME} caracteres.` };
  }
  return name;
}

function revalidateExpenseViews() {
  revalidatePath("/gastos");
  revalidatePath("/gastos/listado");
  revalidatePath("/gastos/rubros");
}

async function nextSortOrder(
  db: SupabaseClient,
  table: "expense_categories" | "expense_subcategories",
  categoryId?: string,
): Promise<number> {
  let query = db
    .from(table)
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);
  if (categoryId) query = query.eq("category_id", categoryId);
  const { data } = await query.maybeSingle();
  return Number(data?.sort_order ?? 0) + 1;
}

export async function saveCategoryAction(
  _prev: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  await requireAuth();

  const id = String(formData.get("id") ?? "").trim();
  const name = parseName(formData.get("name"));
  if (typeof name !== "string") return name;
  const iconRaw = String(formData.get("icon") ?? "");
  const icon = isExpenseIcon(iconRaw) ? iconRaw : DEFAULT_EXPENSE_ICON;

  const db = createDb();
  const { error } = id
    ? await db.from("expense_categories").update({ name, icon }).eq("id", id)
    : await db.from("expense_categories").insert({
        name,
        icon,
        sort_order: await nextSortOrder(db, "expense_categories"),
      });

  if (error) return { error: friendlyError(error, "rubro") };

  revalidateExpenseViews();
  return { success: id ? "Rubro actualizado." : "Rubro creado." };
}

async function deleteOrArchive(
  table: "expense_categories" | "expense_subcategories",
  id: string,
): Promise<CategoryMutationResult> {
  await requireAuth();
  const db = createDb();
  const { error } = await db.from(table).delete().eq("id", id);

  if (error?.code === "23503") {
    const archived = await db.from(table).update({ active: false }).eq("id", id);
    if (archived.error) return { error: archived.error.message };
    revalidateExpenseViews();
    return { ok: true, archived: true };
  }
  if (error) return { error: error.message };

  revalidateExpenseViews();
  return { ok: true };
}

async function setActive(
  table: "expense_categories" | "expense_subcategories",
  id: string,
  active: boolean,
): Promise<CategoryMutationResult> {
  await requireAuth();
  const db = createDb();
  const { error } = await db.from(table).update({ active }).eq("id", id);
  if (error) return { error: error.message };
  revalidateExpenseViews();
  return { ok: true };
}

export async function deleteCategoryAction(
  id: string,
): Promise<CategoryMutationResult> {
  return deleteOrArchive("expense_categories", id);
}

export async function setCategoryActiveAction(
  id: string,
  active: boolean,
): Promise<CategoryMutationResult> {
  return setActive("expense_categories", id, active);
}

export async function moveCategoryAction(
  id: string,
  direction: "up" | "down",
): Promise<CategoryMutationResult> {
  await requireAuth();
  const db = createDb();
  const { data, error } = await db
    .from("expense_categories")
    .select("id, name, sort_order")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) return { error: error.message };

  const ids = (data ?? []).map((row) => String(row.id));
  const index = ids.indexOf(id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= ids.length) return { ok: true };

  [ids[index], ids[target]] = [ids[target]!, ids[index]!];

  const updates = ids
    .map((rowId, position) => ({ rowId, sort_order: position + 1 }))
    .filter(
      ({ rowId, sort_order }) =>
        data!.find((row) => String(row.id) === rowId)?.sort_order !== sort_order,
    );

  for (const { rowId, sort_order } of updates) {
    const result = await db
      .from("expense_categories")
      .update({ sort_order })
      .eq("id", rowId);
    if (result.error) return { error: result.error.message };
  }

  revalidateExpenseViews();
  return { ok: true };
}

export async function addSubcategoryAction(
  categoryId: string,
  rawName: string,
): Promise<CategoryMutationResult> {
  await requireAuth();
  const name = parseName(rawName);
  if (typeof name !== "string") return name;

  const db = createDb();
  const { error } = await db.from("expense_subcategories").insert({
    category_id: categoryId,
    name,
    sort_order: await nextSortOrder(db, "expense_subcategories", categoryId),
  });
  if (error) return { error: friendlyError(error, "subrubro") };

  revalidateExpenseViews();
  return { ok: true };
}

export async function renameSubcategoryAction(
  id: string,
  rawName: string,
): Promise<CategoryMutationResult> {
  await requireAuth();
  const name = parseName(rawName);
  if (typeof name !== "string") return name;

  const db = createDb();
  const { error } = await db
    .from("expense_subcategories")
    .update({ name })
    .eq("id", id);
  if (error) return { error: friendlyError(error, "subrubro") };

  revalidateExpenseViews();
  return { ok: true };
}

export async function deleteSubcategoryAction(
  id: string,
): Promise<CategoryMutationResult> {
  return deleteOrArchive("expense_subcategories", id);
}

export async function setSubcategoryActiveAction(
  id: string,
  active: boolean,
): Promise<CategoryMutationResult> {
  return setActive("expense_subcategories", id, active);
}

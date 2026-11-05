"use server";

import { revalidatePath } from "next/cache";
import { requireAuth, requireSessionUser } from "@/lib/auth";
import { createDb } from "@/lib/db/client";
import {
  MAX_EXPENSE_AMOUNT,
  MAX_EXPENSE_NOTES,
  type ExpenseInput,
} from "@/lib/expenses/types";
import { isYmd } from "@/modules/alerts/date-range";
import { isMissingExpensesSchema } from "@/modules/expenses/queries";

export type ExpenseActionResult = { ok: true } | { error: string };

const MISSING_SCHEMA =
  "Faltan las tablas de gastos. Ejecutá supabase/migrations/20261103_expenses.sql en el SQL Editor.";

const EXPENSE_PATHS = [
  "/gastos",
  "/gastos/listado",
  "/gastos/estadisticas",
] as const;

function revalidateExpenseViews() {
  for (const path of EXPENSE_PATHS) revalidatePath(path);
}

async function validateExpensePayload(
  input: ExpenseInput,
): Promise<{ error: string } | { payload: ExpenseInput }> {
  const amount = Number(input.amount);
  const notes = String(input.notes ?? "").trim();
  const spentOn = String(input.spentOn ?? "");

  if (!Number.isInteger(amount) || amount <= 0) {
    return { error: "El monto tiene que ser un número entero mayor a 0." };
  }
  if (amount > MAX_EXPENSE_AMOUNT) {
    return { error: "El monto es demasiado grande." };
  }
  if (!isYmd(spentOn)) {
    return { error: "La fecha no es válida." };
  }
  if (notes.length > MAX_EXPENSE_NOTES) {
    return {
      error: `Las observaciones admiten hasta ${MAX_EXPENSE_NOTES} caracteres.`,
    };
  }

  const db = createDb();
  const { data: category, error: categoryError } = await db
    .from("expense_categories")
    .select("id, active, expense_subcategories (id, active)")
    .eq("id", input.categoryId)
    .maybeSingle();

  if (categoryError) {
    if (isMissingExpensesSchema(categoryError)) return { error: MISSING_SCHEMA };
    return { error: "No se encontró el rubro." };
  }
  if (!category) {
    return { error: "No se encontró el rubro." };
  }

  const subs = (
    (category.expense_subcategories ?? []) as { id: string; active: boolean }[]
  ).filter((sub) => sub.active);
  const subcategoryId = input.subcategoryId || null;

  if (subcategoryId && !subs.some((sub) => sub.id === subcategoryId)) {
    const archivedOk = await db
      .from("expense_subcategories")
      .select("id")
      .eq("id", subcategoryId)
      .eq("category_id", input.categoryId)
      .maybeSingle();
    if (!archivedOk.data) {
      return { error: "El subrubro no corresponde al rubro." };
    }
  }
  if (!subcategoryId && subs.length > 0) {
    return { error: "Elegí un subrubro." };
  }

  return {
    payload: {
      categoryId: input.categoryId,
      subcategoryId,
      amount,
      spentOn,
      notes,
    },
  };
}

export async function createExpenseAction(
  input: ExpenseInput,
): Promise<ExpenseActionResult> {
  const user = await requireSessionUser();
  const validated = await validateExpensePayload(input);
  if ("error" in validated) return validated;
  const { payload } = validated;

  const db = createDb();
  const { data: category } = await db
    .from("expense_categories")
    .select("active")
    .eq("id", payload.categoryId)
    .maybeSingle();
  if (category?.active === false) {
    return { error: "El rubro ya no está disponible." };
  }

  const { error } = await db.from("expenses").insert({
    category_id: payload.categoryId,
    subcategory_id: payload.subcategoryId,
    amount: payload.amount,
    spent_on: payload.spentOn,
    notes: payload.notes || null,
    created_by: user,
  });

  if (error) {
    if (isMissingExpensesSchema(error)) return { error: MISSING_SCHEMA };
    return { error: error.message };
  }

  revalidateExpenseViews();
  return { ok: true };
}

export async function updateExpenseAction(
  id: string,
  input: ExpenseInput,
): Promise<ExpenseActionResult> {
  await requireAuth();
  const validated = await validateExpensePayload(input);
  if ("error" in validated) return validated;
  const { payload } = validated;

  const db = createDb();
  const { error } = await db
    .from("expenses")
    .update({
      category_id: payload.categoryId,
      subcategory_id: payload.subcategoryId,
      amount: payload.amount,
      spent_on: payload.spentOn,
      notes: payload.notes || null,
    })
    .eq("id", id);

  if (error) {
    if (isMissingExpensesSchema(error)) return { error: MISSING_SCHEMA };
    return { error: error.message };
  }

  revalidateExpenseViews();
  return { ok: true };
}

export async function deleteExpenseAction(
  id: string,
): Promise<ExpenseActionResult> {
  await requireAuth();
  const db = createDb();
  const { error } = await db.from("expenses").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateExpenseViews();
  return { ok: true };
}

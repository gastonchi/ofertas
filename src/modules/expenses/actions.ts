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

export async function createExpenseAction(
  input: ExpenseInput,
): Promise<ExpenseActionResult> {
  const user = await requireSessionUser();

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
    return { error: `Las observaciones admiten hasta ${MAX_EXPENSE_NOTES} caracteres.` };
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
  if (!category || category.active === false) {
    return { error: "El rubro ya no está disponible." };
  }

  const activeSubs = (
    (category.expense_subcategories ?? []) as { id: string; active: boolean }[]
  ).filter((sub) => sub.active);
  const subcategoryId = input.subcategoryId || null;

  if (subcategoryId && !activeSubs.some((sub) => sub.id === subcategoryId)) {
    return { error: "El subrubro no corresponde al rubro." };
  }
  if (!subcategoryId && activeSubs.length > 0) {
    return { error: "Elegí un subrubro." };
  }

  const { error } = await db.from("expenses").insert({
    category_id: input.categoryId,
    subcategory_id: subcategoryId,
    amount,
    spent_on: spentOn,
    notes: notes || null,
    created_by: user,
  });

  if (error) {
    if (isMissingExpensesSchema(error)) return { error: MISSING_SCHEMA };
    return { error: error.message };
  }

  revalidatePath("/gastos");
  return { ok: true };
}

export async function deleteExpenseAction(
  id: string,
): Promise<ExpenseActionResult> {
  await requireAuth();
  const db = createDb();
  const { error } = await db.from("expenses").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/gastos");
  return { ok: true };
}

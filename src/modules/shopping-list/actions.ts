"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { createDb } from "@/lib/db/client";
import type { TrackedProductRow } from "@/lib/types";

function revalidateShoppingListViews() {
  revalidatePath("/lista-compras");
  revalidatePath("/productos");
}

function isMissingShoppingListTable(message: string): boolean {
  return message.includes("shopping_list_items");
}

export async function getProductByEan(
  ean: string,
): Promise<TrackedProductRow | null> {
  await requireAuth();
  const trimmed = String(ean ?? "").replace(/\D/g, "");
  if (!/^\d{8,14}$/.test(trimmed)) return null;

  const db = createDb();
  const { data, error } = await db
    .from("tracked_products")
    .select("*")
    .eq("ean", trimmed)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as TrackedProductRow;
  return { ...row, alerts_enabled: row.alerts_enabled !== false };
}

export async function addToShoppingListAction(
  productId: string,
  quantityDelta = 1,
): Promise<{ error?: string; added?: boolean }> {
  await requireAuth();
  const id = String(productId ?? "").trim();
  const delta = Math.floor(Number(quantityDelta));
  if (!id) return { error: "Falta el producto." };
  if (!Number.isFinite(delta) || delta < 1 || delta > 999) {
    return { error: "La cantidad debe ser entre 1 y 999." };
  }

  const db = createDb();
  const { data: existing, error: readError } = await db
    .from("shopping_list_items")
    .select("id, quantity")
    .eq("product_id", id)
    .maybeSingle();

  if (readError) {
    if (isMissingShoppingListTable(readError.message)) {
      return {
        error:
          "Falta la tabla shopping_list_items. Ejecutá supabase/migrations/20261105_shopping_list.sql.",
      };
    }
    return { error: readError.message };
  }

  if (existing) {
    const nextQty = Math.min(999, Number(existing.quantity) + delta);
    const { error } = await db
      .from("shopping_list_items")
      .update({ quantity: nextQty })
      .eq("id", existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await db.from("shopping_list_items").insert({
      product_id: id,
      quantity: delta,
    });
    if (error) {
      if (isMissingShoppingListTable(error.message)) {
        return {
          error:
            "Falta la tabla shopping_list_items. Ejecutá supabase/migrations/20261105_shopping_list.sql.",
        };
      }
      return { error: error.message };
    }
  }

  revalidateShoppingListViews();
  return { added: true };
}

export async function setShoppingListQuantityAction(
  itemId: string,
  quantity: number,
): Promise<{ error?: string }> {
  await requireAuth();
  const id = String(itemId ?? "").trim();
  const qty = Math.floor(Number(quantity));
  if (!id) return { error: "Falta el ítem." };
  if (!Number.isFinite(qty) || qty < 1 || qty > 999) {
    return { error: "La cantidad debe ser entre 1 y 999." };
  }

  const db = createDb();
  const { error } = await db
    .from("shopping_list_items")
    .update({ quantity: qty })
    .eq("id", id);

  if (error) {
    if (isMissingShoppingListTable(error.message)) {
      return {
        error:
          "Falta la tabla shopping_list_items. Ejecutá supabase/migrations/20261105_shopping_list.sql.",
      };
    }
    return { error: error.message };
  }

  revalidateShoppingListViews();
  return {};
}

export async function removeShoppingListItemAction(
  itemId: string,
): Promise<{ error?: string }> {
  await requireAuth();
  const id = String(itemId ?? "").trim();
  if (!id) return { error: "Falta el ítem." };

  const db = createDb();
  const { error } = await db.from("shopping_list_items").delete().eq("id", id);

  if (error) {
    if (isMissingShoppingListTable(error.message)) {
      return {
        error:
          "Falta la tabla shopping_list_items. Ejecutá supabase/migrations/20261105_shopping_list.sql.",
      };
    }
    return { error: error.message };
  }

  revalidateShoppingListViews();
  return {};
}

export async function addProductToShoppingListAfterCreate(
  productId: string,
): Promise<void> {
  await requireAuth();
  const id = String(productId ?? "").trim();
  if (!id) return;

  const db = createDb();
  const { data: existing } = await db
    .from("shopping_list_items")
    .select("id, quantity")
    .eq("product_id", id)
    .maybeSingle();

  if (existing) {
    await db
      .from("shopping_list_items")
      .update({ quantity: Math.min(999, Number(existing.quantity) + 1) })
      .eq("id", existing.id);
  } else {
    await db.from("shopping_list_items").insert({
      product_id: id,
      quantity: 1,
    });
  }

  revalidateShoppingListViews();
}

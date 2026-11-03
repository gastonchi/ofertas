import { requireAuth } from "@/lib/auth";
import { createDb } from "@/lib/db/client";
import { resolveEnabledStores } from "@/lib/stores";
import type { ShoppingListEntry, TrackedProductRow } from "@/lib/types";
import {
  enrichProductsImages,
  getProductPriceStats,
} from "@/modules/products/queries";
import { getSettings } from "@/modules/settings/actions";

export async function listShoppingListProductIds(): Promise<string[]> {
  await requireAuth();
  const db = createDb();
  const { data, error } = await db
    .from("shopping_list_items")
    .select("product_id");

  if (error) {
    if (error.message.includes("shopping_list_items")) {
      return [];
    }
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => String(row.product_id));
}

export async function listShoppingListEntries(): Promise<ShoppingListEntry[]> {
  await requireAuth();
  const db = createDb();
  const { data, error } = await db
    .from("shopping_list_items")
    .select("*, product:tracked_products(*)")
    .order("updated_at", { ascending: false });

  if (error) {
    if (error.message.includes("shopping_list_items")) {
      throw new Error(
        "Falta la tabla shopping_list_items. Ejecutá supabase/migrations/20261105_shopping_list.sql.",
      );
    }
    throw new Error(error.message);
  }

  const settings = await getSettings();
  const stores = resolveEnabledStores(settings?.default_stores);

  const rows = (data ?? []) as {
    id: string;
    product_id: string;
    quantity: number;
    created_at: string;
    updated_at: string;
    product: TrackedProductRow | null;
  }[];

  const products = rows
    .map((row) => row.product)
    .filter((product): product is TrackedProductRow => product != null);

  const enriched = await enrichProductsImages(products, stores);

  const productById = new Map(enriched.map((product) => [product.id, product]));

  const entries = await Promise.all(
    rows.map(async (row) => {
      const product = productById.get(row.product_id);
      if (!product) return null;

      const stats = await getProductPriceStats(product, stores);
      const latest = stats.latest;

      return {
        item: {
          id: row.id,
          product_id: row.product_id,
          quantity: row.quantity,
          created_at: row.created_at,
          updated_at: row.updated_at,
        },
        product,
        bestPriceStore: latest?.store ?? null,
        bestPrice: latest?.price ?? null,
      } satisfies ShoppingListEntry;
    }),
  );

  return entries.filter(
    (entry): entry is ShoppingListEntry => entry != null,
  );
}

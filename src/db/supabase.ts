import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { OfferMatch, OfferSnapshot, StoreId, TrackedProduct } from "../types.js";
import { ALL_STORES } from "../types.js";

export function createDb(url: string, key: string): SupabaseClient {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function isStoreId(value: string): value is StoreId {
  return (ALL_STORES as readonly string[]).includes(value);
}

/** Productos activos desde el panel admin (tabla tracked_products). */
export async function loadTrackedProducts(
  db: SupabaseClient,
): Promise<TrackedProduct[]> {
  const { data, error } = await db
    .from("tracked_products")
    .select("name, ean, target_price, stores, active")
    .eq("active", true)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Supabase tracked_products: ${error.message}`);
  }

  return (data ?? []).map((row) => {
    const stores = Array.isArray(row.stores)
      ? row.stores.map(String).filter(isStoreId)
      : [];

    return {
      name: String(row.name),
      ean: String(row.ean),
      target_price: Number(row.target_price),
      stores: stores.length > 0 ? stores : undefined,
    };
  });
}

/** Día civil en Argentina para deduplicar alertas. */
export function argentinaDay(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export async function savePriceHistory(
  db: SupabaseClient,
  snapshot: OfferSnapshot,
): Promise<void> {
  const { error } = await db.from("price_history").insert({
    ean: snapshot.ean,
    store: snapshot.store,
    product_name: snapshot.productName,
    price: snapshot.price,
    list_price: snapshot.listPrice,
    promotions: snapshot.promotions,
    checked_at: snapshot.checkedAt,
  });

  if (error) {
    throw new Error(`Supabase price_history: ${error.message}`);
  }
}

export async function wasAlertSentToday(
  db: SupabaseClient,
  match: OfferMatch,
  day = argentinaDay(),
): Promise<boolean> {
  const { data, error } = await db
    .from("alerts_sent")
    .select("id")
    .eq("ean", match.snapshot.ean)
    .eq("store", match.snapshot.store)
    .eq("fingerprint", match.fingerprint)
    .eq("alert_day", day)
    .limit(1);

  if (error) {
    throw new Error(`Supabase alerts_sent select: ${error.message}`);
  }

  return (data?.length ?? 0) > 0;
}

export async function recordAlertSent(
  db: SupabaseClient,
  match: OfferMatch,
  day = argentinaDay(),
): Promise<void> {
  const { error } = await db.from("alerts_sent").insert({
    ean: match.snapshot.ean,
    store: match.snapshot.store,
    fingerprint: match.fingerprint,
    alert_day: day,
    payload: {
      trackedName: match.trackedName,
      targetPrice: match.targetPrice,
      triggers: match.triggers,
      snapshot: match.snapshot,
    },
  });

  if (error) {
    // Carrera entre jobs: si ya existe, no fallamos el run.
    if (error.code === "23505") return;
    throw new Error(`Supabase alerts_sent insert: ${error.message}`);
  }
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { isStoreId } from "../lib/stores";
import type { OfferMatch, OfferSnapshot, TrackedProduct } from "../lib/types";

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

export async function loadAlertEmail(
  db: SupabaseClient,
  fallback?: string,
): Promise<string | undefined> {
  const { data, error } = await db
    .from("app_settings")
    .select("alert_email")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (error.code === "PGRST205" || error.message.includes("app_settings")) {
      return fallback;
    }
    throw new Error(`Supabase app_settings: ${error.message}`);
  }

  return data?.alert_email || fallback;
}

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
    if (error.code === "23505") return;
    throw new Error(`Supabase alerts_sent insert: ${error.message}`);
  }
}

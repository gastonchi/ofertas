import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { OfferMatch, OfferSnapshot } from "../types.js";

export function createDb(url: string, key: string): SupabaseClient {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
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

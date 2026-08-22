import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth";
import { createDb } from "@/lib/db/client";
import type { AlertRow, PriceHistoryRow } from "@/lib/types";

export async function listRecentAlerts(limit = 40): Promise<AlertRow[]> {
  await requireAuth();
  const db = createDb();
  return fetchAlerts(db, limit);
}

export async function listAlertsInRange(
  fromDay: string,
  toDay: string,
): Promise<AlertRow[]> {
  await requireAuth();
  const db = createDb();
  const { data, error } = await db
    .from("alerts_sent")
    .select("*")
    .gte("alert_day", fromDay)
    .lte("alert_day", toDay)
    .order("sent_at", { ascending: false })
    .limit(1000);

  if (error) throw new Error(error.message);
  return (data ?? []) as AlertRow[];
}

export async function listRecentPrices(limit = 8): Promise<PriceHistoryRow[]> {
  await requireAuth();
  const db = createDb();
  return fetchPrices(db, limit);
}

export async function fetchAlerts(
  db: SupabaseClient,
  limit: number,
): Promise<AlertRow[]> {
  const { data, error } = await db
    .from("alerts_sent")
    .select("*")
    .order("sent_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as AlertRow[];
}

export async function fetchPrices(
  db: SupabaseClient,
  limit: number,
): Promise<PriceHistoryRow[]> {
  const { data, error } = await db
    .from("price_history")
    .select("id, ean, store, product_name, price, list_price, checked_at")
    .order("checked_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as PriceHistoryRow[];
}

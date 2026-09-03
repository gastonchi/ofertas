import type { SupabaseClient } from "@supabase/supabase-js";
import { isStoreId } from "../lib/stores";
import {
  DEFAULT_ALERT_DAYS,
  DEFAULT_ALERT_HOURS,
  isWeekday,
  normalizeHourLabel,
  type Weekday,
} from "../lib/schedule";
import { ALL_STORES, type OfferMatch, type OfferSnapshot, type StoreId, type TrackedProduct } from "../lib/types";

export type JobSettings = {
  alertEmail?: string;
  stores: StoreId[];
  alertDays: Weekday[];
  alertHours: string[];
};

export const FALLBACK_JOB_SETTINGS: JobSettings = {
  stores: [...ALL_STORES],
  alertDays: [...DEFAULT_ALERT_DAYS],
  alertHours: [...DEFAULT_ALERT_HOURS],
};

function parseStoreList(value: unknown): StoreId[] {
  if (!Array.isArray(value)) return [...ALL_STORES];
  const stores = value.map(String).filter(isStoreId);
  return stores.length > 0 ? stores : [...ALL_STORES];
}

function parseDayList(value: unknown): Weekday[] {
  if (!Array.isArray(value)) return [...DEFAULT_ALERT_DAYS];
  const days = value.map(String).filter(isWeekday);
  return days.length > 0 ? days : [...DEFAULT_ALERT_DAYS];
}

function parseHourList(value: unknown): string[] {
  if (!Array.isArray(value)) return [...DEFAULT_ALERT_HOURS];
  const hours = [
    ...new Set(
      value
        .map(String)
        .map(normalizeHourLabel)
        .filter((hour): hour is string => Boolean(hour)),
    ),
  ].sort();
  return hours.length > 0 ? hours : [...DEFAULT_ALERT_HOURS];
}

function settingsFromRow(
  row: {
    alert_email?: string | null;
    default_stores?: unknown;
    alert_days?: unknown;
    alert_hours?: unknown;
  } | null,
  fallbackEmail?: string,
): JobSettings {
  return {
    alertEmail: row?.alert_email || fallbackEmail,
    stores: parseStoreList(row?.default_stores),
    alertDays: parseDayList(row?.alert_days),
    alertHours: parseHourList(row?.alert_hours),
  };
}

function isMissingRelation(error: { code?: string; message: string }): boolean {
  return error.code === "PGRST205" || error.message.includes("app_settings");
}

function isMissingColumn(error: { code?: string; message: string }): boolean {
  return (
    error.code === "PGRST204" ||
    error.message.includes("alert_days") ||
    error.message.includes("alert_hours")
  );
}

export async function loadTrackedProducts(
  db: SupabaseClient,
): Promise<TrackedProduct[]> {
  const withAlerts = await db
    .from("tracked_products")
    .select("name, ean, target_price, active, alerts_enabled")
    .eq("active", true)
    .order("created_at", { ascending: true });

  const result =
    withAlerts.error &&
    (withAlerts.error.code === "PGRST204" ||
      withAlerts.error.message.includes("alerts_enabled"))
      ? await db
          .from("tracked_products")
          .select("name, ean, target_price, active")
          .eq("active", true)
          .order("created_at", { ascending: true })
      : withAlerts;

  if (result.error) {
    throw new Error(`Supabase tracked_products: ${result.error.message}`);
  }

  return (result.data ?? []).map((row) => {
    const data = row as {
      name: unknown;
      ean: unknown;
      target_price: unknown;
      alerts_enabled?: boolean;
    };

    return {
      name: String(data.name),
      ean: String(data.ean),
      target_price: Number(data.target_price),
      alertsEnabled: data.alerts_enabled !== false,
    };
  });
}

export async function loadJobSettings(
  db: SupabaseClient,
  fallbackEmail?: string,
): Promise<JobSettings> {
  const full = await db
    .from("app_settings")
    .select("alert_email, default_stores, alert_days, alert_hours")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!full.error) {
    return settingsFromRow(full.data, fallbackEmail);
  }

  if (isMissingRelation(full.error)) {
    return { ...FALLBACK_JOB_SETTINGS, alertEmail: fallbackEmail };
  }

  if (!isMissingColumn(full.error)) {
    throw new Error(`Supabase app_settings: ${full.error.message}`);
  }

  const legacy = await db
    .from("app_settings")
    .select("alert_email, default_stores")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (legacy.error) {
    if (isMissingRelation(legacy.error)) {
      return { ...FALLBACK_JOB_SETTINGS, alertEmail: fallbackEmail };
    }
    throw new Error(`Supabase app_settings: ${legacy.error.message}`);
  }

  return settingsFromRow(legacy.data, fallbackEmail);
}

export async function loadAlertEmail(
  db: SupabaseClient,
  fallback?: string,
): Promise<string | undefined> {
  const settings = await loadJobSettings(db, fallback);
  return settings.alertEmail;
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

export async function updateTrackedProductImage(
  db: SupabaseClient,
  ean: string,
  imageUrl: string | undefined,
): Promise<void> {
  const url = imageUrl?.trim();
  if (!url) return;

  const { error } = await db
    .from("tracked_products")
    .update({ image_url: url })
    .eq("ean", ean.trim())
    .is("image_url", null);

  if (error) {
    if (error.code === "PGRST204" || error.message.includes("image_url")) {
      return;
    }
    throw new Error(`Supabase tracked_products image: ${error.message}`);
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

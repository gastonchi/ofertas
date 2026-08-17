"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { createDb } from "@/lib/db/client";
import {
  DEFAULT_ALERT_DAYS,
  DEFAULT_ALERT_HOURS,
  isWeekday,
  parseAlertHours,
  parseWeekdays,
} from "@/lib/schedule";
import { isStoreId, parseStores } from "@/lib/stores";
import { ALL_STORES, type AppSettings } from "@/lib/types";

export type SettingsActionState = {
  error?: string;
  success?: string;
};

function normalizeSettings(row: Record<string, unknown> | null): AppSettings | null {
  if (!row) return null;

  const stores = Array.isArray(row.default_stores)
    ? row.default_stores.map(String).filter(isStoreId)
    : [];
  const days = Array.isArray(row.alert_days)
    ? row.alert_days.map(String).filter(isWeekday)
    : [];
  const hours = Array.isArray(row.alert_hours)
    ? row.alert_hours.map(String)
    : [];

  return {
    id: String(row.id),
    alert_email: typeof row.alert_email === "string" ? row.alert_email : null,
    default_stores: stores.length > 0 ? stores : [...ALL_STORES],
    alert_days: days.length > 0 ? days : [...DEFAULT_ALERT_DAYS],
    alert_hours: hours.length > 0 ? hours : [...DEFAULT_ALERT_HOURS],
    updated_at: String(row.updated_at ?? ""),
  };
}

export async function getSettings(): Promise<AppSettings | null> {
  await requireAuth();
  const db = createDb();
  const { data, error } = await db
    .from("app_settings")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (error.code === "PGRST205" || error.message.includes("app_settings")) {
      return null;
    }
    throw new Error(error.message);
  }

  return normalizeSettings((data as Record<string, unknown> | null) ?? null);
}

export async function updateSettingsAction(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requireAuth();

  const alert_email = String(formData.get("alert_email") ?? "").trim();
  const default_stores = parseStores(formData.getAll("default_stores"));
  const alert_days = parseWeekdays(formData.getAll("alert_days"));
  const alert_hours = parseAlertHours(formData.getAll("alert_hours"));

  if (alert_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(alert_email)) {
    return { error: "El email no es válido." };
  }

  const db = createDb();
  const existing = await db
    .from("app_settings")
    .select("id")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing.error && existing.error.code !== "PGRST205") {
    return { error: existing.error.message };
  }

  const payload = {
    alert_email: alert_email || null,
    default_stores,
    alert_days,
    alert_hours,
  };

  const query = existing.data?.id
    ? db.from("app_settings").update(payload).eq("id", existing.data.id)
    : db.from("app_settings").insert(payload);

  const { error } = await query;
  if (error) {
    if (error.code === "PGRST205" || error.message.includes("app_settings")) {
      return {
        error:
          "Falta la tabla app_settings. Ejecutá supabase/schema.sql en el SQL Editor.",
      };
    }
    if (error.code === "PGRST204" || error.message.includes("alert_days") || error.message.includes("alert_hours")) {
      return {
        error:
          "Faltan columnas de horario. Ejecutá supabase/schema.sql en el SQL Editor.",
      };
    }
    return { error: error.message };
  }

  revalidatePath("/configuracion");
  revalidatePath("/");
  revalidatePath("/productos");
  return { success: "Configuración guardada." };
}

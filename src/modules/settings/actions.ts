"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { createDb } from "@/lib/db/client";
import { parseStores } from "@/lib/stores";
import type { AppSettings } from "@/lib/types";

export type SettingsActionState = {
  error?: string;
  success?: string;
};

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

  return data as AppSettings | null;
}

export async function updateSettingsAction(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requireAuth();

  const alert_email = String(formData.get("alert_email") ?? "").trim();
  const default_stores = parseStores(formData.getAll("default_stores"));

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
    return { error: error.message };
  }

  revalidatePath("/configuracion");
  revalidatePath("/");
  return { success: "Configuración guardada." };
}

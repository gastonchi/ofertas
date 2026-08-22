"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { createDb } from "@/lib/db/client";
import { parseStores, resolveProductStores } from "@/lib/stores";
import type { ProductNameLookupSource, TrackedProductRow } from "@/lib/types";
import { lookupProductNameByEan } from "@/scraping/lookup-name";
import { loadJobSettings } from "@/scraping/db";
import { refreshProductPrices } from "@/scraping/refresh-product-prices";
import { productHasPriceToday } from "@/modules/products/queries";

export type ProductActionState = {
  error?: string;
  success?: string;
};

function parseProductForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const ean = String(formData.get("ean") ?? "").trim();
  const targetRaw = String(formData.get("target_price") ?? "").trim();
  const target_price = Number(targetRaw.replace(",", "."));
  const stores = parseStores(formData.getAll("stores"));
  const active =
    formData.get("active") === "on" || formData.get("active") === "true";
  const alerts_enabled =
    formData.get("alerts_enabled") === "on" ||
    formData.get("alerts_enabled") === "true";

  if (!name) return { error: "El nombre es obligatorio." } as const;
  if (!/^\d{8,14}$/.test(ean)) {
    return { error: "El EAN debe tener entre 8 y 14 dígitos." } as const;
  }
  if (!Number.isFinite(target_price) || target_price <= 0) {
    return { error: "El precio objetivo debe ser un número mayor a 0." } as const;
  }

  return { name, ean, target_price, stores, active, alerts_enabled } as const;
}

function revalidateProductViews() {
  revalidatePath("/");
  revalidatePath("/productos");
}

export type ProductLookupState = {
  name: string | null;
  source: ProductNameLookupSource | null;
  error?: string;
};

export async function lookupProductNameAction(
  ean: string,
): Promise<ProductLookupState> {
  await requireAuth();
  const trimmed = String(ean ?? "").replace(/\D/g, "");
  if (!/^\d{8,14}$/.test(trimmed)) {
    return {
      name: null,
      source: null,
      error: "El EAN debe tener entre 8 y 14 dígitos.",
    };
  }

  const result = await lookupProductNameByEan(trimmed);
  if (!result) return { name: null, source: null };
  return result;
}

export async function listProducts(): Promise<TrackedProductRow[]> {
  await requireAuth();
  const db = createDb();
  const { data, error } = await db
    .from("tracked_products")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    ...(row as TrackedProductRow),
    alerts_enabled: (row as TrackedProductRow).alerts_enabled !== false,
  }));
}

export async function createProductAction(
  _prev: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  await requireAuth();
  const parsed = parseProductForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const db = createDb();
  const { error } = await db.from("tracked_products").insert({
    name: parsed.name,
    ean: parsed.ean,
    target_price: parsed.target_price,
    stores: parsed.stores,
    active: true,
    alerts_enabled: true,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Ya existe un producto con ese EAN." };
    }
    return { error: error.message };
  }

  revalidateProductViews();
  return { success: "Producto creado." };
}

export async function updateProductAction(
  _prev: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  await requireAuth();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Falta el id del producto." };

  const parsed = parseProductForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const db = createDb();
  const { error } = await db
    .from("tracked_products")
    .update({
      name: parsed.name,
      ean: parsed.ean,
      target_price: parsed.target_price,
      stores: parsed.stores,
      active: parsed.active,
      alerts_enabled: parsed.alerts_enabled,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { error: "Ya existe un producto con ese EAN." };
    }
    return { error: error.message };
  }

  revalidateProductViews();
  return { success: "Producto actualizado." };
}

export async function deleteProductAction(formData: FormData) {
  await requireAuth();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Falta el id del producto.");

  const db = createDb();
  const { error } = await db.from("tracked_products").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidateProductViews();
}

export async function toggleProductAlertsAction(
  formData: FormData,
): Promise<{ alertsEnabled: boolean } | { error: string }> {
  await requireAuth();
  const id = String(formData.get("id") ?? "");
  const alertsEnabled = String(formData.get("alerts_enabled") ?? "") === "true";
  if (!id) return { error: "Falta el id del producto." };

  const next = !alertsEnabled;
  const db = createDb();
  const { error } = await db
    .from("tracked_products")
    .update({ alerts_enabled: next })
    .eq("id", id);

  if (error) {
    if (error.code === "PGRST204" || error.message.includes("alerts_enabled")) {
      return {
        error:
          "Falta la columna alerts_enabled. Ejecutá supabase/schema.sql en el SQL Editor.",
      };
    }
    return { error: error.message };
  }

  revalidateProductViews();
  return { alertsEnabled: next };
}

export async function refreshProductPriceAction(
  productId: string,
): Promise<{ error: string } | { saved: number; message: string }> {
  await requireAuth();
  const id = String(productId ?? "").trim();
  if (!id) return { error: "Falta el id del producto." };

  const db = createDb();
  const { data, error } = await db
    .from("tracked_products")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: "No se encontró el producto." };

  const product = data as TrackedProductRow;
  const hasToday = await productHasPriceToday(product);
  if (hasToday) {
    return { error: "Hoy ya hay un precio cargado para este producto." };
  }

  const jobSettings = await loadJobSettings(db);
  const stores = resolveProductStores(product.stores, jobSettings.stores);
  if (stores.length === 0) {
    return {
      error: "Este producto no tiene tiendas en común con Configuración.",
    };
  }

  const result = await refreshProductPrices(
    db,
    {
      name: product.name,
      ean: product.ean,
      target_price: Number(product.target_price),
      stores: product.stores,
      alertsEnabled: product.alerts_enabled !== false,
    },
    jobSettings.stores,
  );

  revalidateProductViews();
  revalidatePath(`/productos/${id}`);

  if (result.saved === 0) {
    const details = [
      ...result.errors.map((item) => `${item.store}: ${item.message}`),
      result.notFound.length > 0
        ? `No encontrado en ${result.notFound.join(", ")}`
        : "",
    ]
      .filter(Boolean)
      .join(" · ");
    return {
      error: details || "No se pudo obtener el precio en ninguna tienda.",
    };
  }

  const extras = [
    result.notFound.length > 0
      ? `Sin resultado en ${result.notFound.join(", ")}`
      : "",
    result.errors.length > 0
      ? result.errors.map((item) => `${item.store}: ${item.message}`).join(" · ")
      : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    saved: result.saved,
    message:
      extras.length > 0
        ? `Se guardaron ${result.saved} precio(s). ${extras}`
        : `Se guardaron ${result.saved} precio(s).`,
  };
}

export async function toggleProductActiveAction(formData: FormData) {
  await requireAuth();
  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  if (!id) throw new Error("Falta el id del producto.");

  const db = createDb();
  const { error } = await db
    .from("tracked_products")
    .update({ active: !active })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidateProductViews();
}

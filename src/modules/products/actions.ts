"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { createDb } from "@/lib/db/client";
import { parseStores } from "@/lib/stores";
import type { ProductNameLookupSource, TrackedProductRow } from "@/lib/types";
import { lookupProductNameByEan } from "@/scraping/lookup-name";

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

  if (!name) return { error: "El nombre es obligatorio." } as const;
  if (!/^\d{8,14}$/.test(ean)) {
    return { error: "El EAN debe tener entre 8 y 14 dígitos." } as const;
  }
  if (!Number.isFinite(target_price) || target_price <= 0) {
    return { error: "El precio objetivo debe ser un número mayor a 0." } as const;
  }

  return { name, ean, target_price, stores, active } as const;
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
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as TrackedProductRow[];
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

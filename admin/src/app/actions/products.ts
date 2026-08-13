"use server";

import { revalidatePath } from "next/cache";
import { isAuthenticated } from "@/lib/auth";
import { parseStores } from "@/lib/stores";
import { createAdminDb } from "@/lib/supabase";
import type { TrackedProductRow } from "@/lib/types";

export type ProductActionState = {
  error?: string;
  success?: string;
};

async function requireAuth() {
  if (!(await isAuthenticated())) {
    throw new Error("No autorizado");
  }
}

function parseProductForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const ean = String(formData.get("ean") ?? "").trim();
  const targetRaw = String(formData.get("target_price") ?? "").trim();
  const target_price = Number(targetRaw.replace(",", "."));
  const stores = parseStores(formData.getAll("stores"));
  const active = formData.get("active") === "on" || formData.get("active") === "true";

  if (!name) return { error: "El nombre es obligatorio." } as const;
  if (!/^\d{8,14}$/.test(ean)) {
    return { error: "El EAN debe tener entre 8 y 14 dígitos." } as const;
  }
  if (!Number.isFinite(target_price) || target_price <= 0) {
    return { error: "El precio objetivo debe ser un número mayor a 0." } as const;
  }

  return { name, ean, target_price, stores, active } as const;
}

export async function createProductAction(
  _prev: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  await requireAuth();
  const parsed = parseProductForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const db = createAdminDb();
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

  revalidatePath("/");
  revalidatePath("/productos");
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

  const db = createAdminDb();
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

  revalidatePath("/");
  revalidatePath("/productos");
  return { success: "Producto actualizado." };
}

export async function deleteProductAction(formData: FormData) {
  await requireAuth();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Falta el id del producto.");

  const db = createAdminDb();
  const { error } = await db.from("tracked_products").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/productos");
}

export async function toggleProductActiveAction(formData: FormData) {
  await requireAuth();
  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  if (!id) throw new Error("Falta el id del producto.");

  const db = createAdminDb();
  const { error } = await db
    .from("tracked_products")
    .update({ active: !active })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/productos");
}

export async function listProducts(): Promise<TrackedProductRow[]> {
  await requireAuth();
  const db = createAdminDb();
  const { data, error } = await db
    .from("tracked_products")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as TrackedProductRow[];
}

"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Bell, BellOff, DollarSign, Trash2 } from "lucide-react";
import Swal from "sweetalert2";
import {
  deleteProductAction,
  toggleProductAlertsAction,
} from "@/modules/products/actions";
import { EditProductPanel } from "@/components/products/product-form";
import type { TrackedProductRow } from "@/lib/types";

async function deleteProductWithSwal(product: TrackedProductRow): Promise<void> {
  const confirmed = await Swal.fire({
    icon: "warning",
    title: "Eliminar producto",
    text: `¿Querés eliminar "${product.name}"? Esta acción no se puede deshacer.`,
    showCancelButton: true,
    confirmButtonText: "Eliminar",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#b42318",
    cancelButtonColor: "#6b7280",
    reverseButtons: true,
    focusCancel: true,
  });

  if (!confirmed.isConfirmed) return;

  const formData = new FormData();
  formData.set("id", product.id);

  try {
    await deleteProductAction(formData);
    await Swal.fire({
      icon: "success",
      title: "Producto eliminado",
      timer: 2200,
      showConfirmButton: false,
    });
  } catch {
    await Swal.fire({
      icon: "error",
      title: "No se pudo eliminar el producto.",
      confirmButtonColor: "#1f6a45",
    });
  }
}

async function toggleAlertsWithSwal(
  product: TrackedProductRow,
): Promise<void> {
  const formData = new FormData();
  formData.set("id", product.id);
  formData.set("alerts_enabled", product.alerts_enabled ? "true" : "false");

  const result = await toggleProductAlertsAction(formData);
  if ("error" in result) {
    await Swal.fire({
      icon: "error",
      title: result.error,
      confirmButtonColor: "#1f6a45",
    });
    return;
  }

  await Swal.fire({
    icon: result.alertsEnabled ? "success" : "info",
    title: product.name,
    text: result.alertsEnabled ? "Alertas activadas" : "Alertas desactivadas",
    timer: 2800,
    showConfirmButton: false,
    customClass: {
      title: "swal-product-name",
      htmlContainer: "swal-alert-copy",
    },
  });
}

export function ProductActions({ product }: { product: TrackedProductRow }) {
  const [pending, startTransition] = useTransition();
  const alertsOn = product.alerts_enabled;
  const BellIcon = alertsOn ? Bell : BellOff;

  return (
    <div className="card-actions">
      <Link
        href={`/productos/${product.id}`}
        className="btn-prices btn-icon"
        aria-label={`Ver precios de ${product.name}`}
        title="Precios"
      >
        <DollarSign size={18} aria-hidden />
      </Link>
      <EditProductPanel product={product} />
      <button
        type="button"
        className={`btn-alert btn-icon ${alertsOn ? "" : "alert-off"}`.trim()}
        disabled={pending}
        onClick={() => startTransition(() => toggleAlertsWithSwal(product))}
        aria-label={
          alertsOn
            ? `Desactivar alertas de ${product.name}`
            : `Activar alertas de ${product.name}`
        }
        title={alertsOn ? "Alertas activas" : "Alertas desactivadas"}
      >
        <BellIcon size={18} aria-hidden />
      </button>
      <button
        type="button"
        className="btn-danger btn-icon"
        disabled={pending}
        onClick={() => startTransition(() => deleteProductWithSwal(product))}
        aria-label={`Eliminar ${product.name}`}
        title="Eliminar"
      >
        <Trash2 size={18} aria-hidden />
      </button>
    </div>
  );
}

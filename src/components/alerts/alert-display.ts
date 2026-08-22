import type { AlertRow } from "@/lib/types";

export function getAlertDisplay(alert: AlertRow) {
  const name =
    alert.payload?.trackedName ??
    alert.payload?.snapshot?.productName ??
    alert.ean;
  const triggers =
    alert.payload?.triggers?.map((t) => t.message).join(" · ") ??
    "Oferta detectada";
  const price = alert.payload?.snapshot?.price;

  return { name, triggers, price };
}

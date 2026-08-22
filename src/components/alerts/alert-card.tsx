import { formatArs, formatDateTime } from "@/lib/format";
import { StoreLogo } from "@/components/ui/store-logo";
import type { AlertRow } from "@/lib/types";

export function AlertCard({ alert }: { alert: AlertRow }) {
  const name =
    alert.payload?.trackedName ??
    alert.payload?.snapshot?.productName ??
    alert.ean;
  const triggers =
    alert.payload?.triggers?.map((t) => t.message).join(" · ") ??
    "Oferta detectada";
  const price = alert.payload?.snapshot?.price;

  return (
    <article className="info-card">
      <header className="info-card-head">
        <h3 className="product-name">{name}</h3>
        <StoreLogo store={alert.store} size="sm" />
      </header>
      <p className="muted info-card-copy">{triggers}</p>
      <dl className="info-card-meta">
        <div>
          <dt>Precio</dt>
          <dd>{typeof price === "number" ? formatArs(price) : "—"}</dd>
        </div>
        <div>
          <dt>Enviada</dt>
          <dd>{formatDateTime(alert.sent_at)}</dd>
        </div>
      </dl>
    </article>
  );
}

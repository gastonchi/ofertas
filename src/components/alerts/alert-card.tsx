import { getAlertDisplay } from "@/components/alerts/alert-display";
import { formatArs, formatDateTime } from "@/lib/format";
import { StoreLogo } from "@/components/ui/store-logo";
import type { AlertRow } from "@/lib/types";

export function AlertCard({ alert }: { alert: AlertRow }) {
  const { name, triggers, price } = getAlertDisplay(alert);

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
          <dd className="price-emphasis">
            {typeof price === "number" ? formatArs(price) : "—"}
          </dd>
        </div>
        <div>
          <dt>Enviada</dt>
          <dd>{formatDateTime(alert.sent_at)}</dd>
        </div>
      </dl>
    </article>
  );
}

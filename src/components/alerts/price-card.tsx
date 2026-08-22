import { formatArs, formatDateTime } from "@/lib/format";
import { StoreLogo } from "@/components/ui/store-logo";
import type { PriceHistoryRow } from "@/lib/types";

export function PriceCard({ row }: { row: PriceHistoryRow }) {
  return (
    <article className="info-card">
      <header className="info-card-head">
        <h3 className="product-name">{row.product_name ?? row.ean}</h3>
        <StoreLogo store={row.store} size="sm" />
      </header>
      <dl className="info-card-meta">
        <div>
          <dt>EAN</dt>
          <dd>
            <code className="mono">{row.ean}</code>
          </dd>
        </div>
        <div>
          <dt>Precio</dt>
          <dd>{formatArs(Number(row.price))}</dd>
        </div>
        <div className="info-card-span">
          <dt>Chequeado</dt>
          <dd>{formatDateTime(row.checked_at)}</dd>
        </div>
      </dl>
    </article>
  );
}

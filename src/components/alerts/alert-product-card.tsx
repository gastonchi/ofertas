import { getAlertDisplay } from "@/components/alerts/alert-display";
import { ProductThumb } from "@/components/products/product-thumb";
import { formatArs } from "@/lib/format";
import { STORE_LABELS, isStoreId } from "@/lib/stores";
import type { AlertRow } from "@/lib/types";

export function AlertProductCard({ alert }: { alert: AlertRow }) {
  const display = getAlertDisplay(alert);
  const showPrice = display.effectivePrice ?? display.price;
  const showList =
    display.listPrice != null &&
    showPrice != null &&
    display.listPrice > showPrice;
  const storeKey = alert.store.trim().toLowerCase();
  const storeName = isStoreId(storeKey) ? STORE_LABELS[storeKey] : alert.store;

  return (
    <article className="alert-product-card">
      <header className="alert-product-head">
        <ProductThumb
          name={display.name}
          imageUrl={display.imageUrl}
          size="lg"
        />
        <div className="alert-product-head-copy">
          <h3 className="product-name">{display.name}</h3>
          {display.targetPrice != null ? (
            <span className="chip alert-product-meta">
              Meta: <strong>{formatArs(display.targetPrice)}</strong>
            </span>
          ) : null}
        </div>
      </header>

      <div className="alert-product-offer">
        <div className="alert-product-prices">
          <span className="price-emphasis">
            {showPrice != null ? formatArs(showPrice) : "—"}
            {display.hasPromo ? (
              <span className="alert-product-unit muted"> c/u</span>
            ) : null}
          </span>
          {showList ? (
            <span className="alert-product-list-price muted">
              {formatArs(display.listPrice!)}
            </span>
          ) : null}
        </div>

        {display.promoDetail ? (
          <p className="alert-product-promo">{display.promoDetail}</p>
        ) : null}

        <ul className="alert-product-triggers">
          {display.triggerMessages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      </div>

      {display.url ? (
        <footer className="alert-product-foot">
          <a
            href={display.url}
            className="btn-secondary alert-product-cta"
            target="_blank"
            rel="noopener noreferrer"
          >
            Ver en {storeName}
          </a>
        </footer>
      ) : null}
    </article>
  );
}

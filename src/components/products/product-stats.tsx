import type { ReactNode } from "react";
import { formatArs, formatWeekdayDate } from "@/lib/format";
import { StoreLogo } from "@/components/ui/store-logo";
import type { PriceStat, ProductPriceStats, StorePriceQuote } from "@/lib/types";

function promoDetailText(quote: StorePriceQuote): string | null {
  const pricing = quote.bestPromotion?.pricing;
  if (!quote.hasPromo || !pricing || pricing.summary === "promo") return null;
  return `${pricing.summary} · llevando ${pricing.unitsToBuy} pagás ${formatArs(pricing.totalToPay)}`;
}

function StatCard({
  label,
  stat,
}: {
  label: string;
  stat: PriceStat;
}) {
  return (
    <article className="stat-card product-best-stat">
      <header className="stat-card-head">
        <span>{label}</span>
        <strong>{stat ? formatArs(stat.price) : "—"}</strong>
      </header>
      {stat ? (
        <>
          {stat.hasPromo ? (
            <p className="stat-promo-hint muted">
              c/u con promo · góndola {formatArs(stat.shelfPrice)}
            </p>
          ) : stat.listPrice != null && stat.listPrice > stat.shelfPrice ? (
            <p className="stat-promo-hint muted">
              góndola · lista {formatArs(stat.listPrice)}
            </p>
          ) : null}
          <p className="stat-store">
            <StoreLogo store={stat.store} size="md" />
            <span className="muted">{formatWeekdayDate(stat.checked_at)}</span>
          </p>
        </>
      ) : (
        <p className="stat-store muted">Sin datos en este período</p>
      )}
    </article>
  );
}

function StorePriceCard({
  quote,
  isBest,
}: {
  quote: StorePriceQuote;
  isBest: boolean;
}) {
  const displayPrice =
    quote.effectivePrice != null ? quote.effectivePrice : quote.price;
  const promoText = promoDetailText(quote);
  const showList =
    quote.listPrice != null &&
    quote.price != null &&
    quote.listPrice > quote.price;
  const showShelf =
    quote.hasPromo &&
    quote.price != null &&
    quote.effectivePrice != null &&
    quote.price !== quote.effectivePrice;

  return (
    <article
      className={
        isBest
          ? "info-card info-card-best store-price-card"
          : "info-card store-price-card"
      }
    >
      <header className="info-card-head">
        <StoreLogo store={quote.store} size="lg" />
        <div className="store-price-head-values">
          <strong>
            {displayPrice != null ? formatArs(displayPrice) : "—"}
          </strong>
          {quote.hasPromo ? (
            <span className="store-price-unit-label muted">c/u con promo</span>
          ) : null}
        </div>
      </header>

      {quote.price != null ? (
        <dl className="info-card-meta store-price-meta">
          {showList ? (
            <>
              <dt>Lista</dt>
              <dd>{formatArs(quote.listPrice!)}</dd>
            </>
          ) : null}
          {showShelf ? (
            <>
              <dt>Góndola</dt>
              <dd>{formatArs(quote.price)}</dd>
            </>
          ) : null}
          {!showList && !showShelf && quote.listPrice != null ? (
            <>
              <dt>Lista</dt>
              <dd>{formatArs(quote.listPrice)}</dd>
            </>
          ) : null}
        </dl>
      ) : null}

      {promoText ? (
        <p className="info-card-copy store-promo-copy">{promoText}</p>
      ) : quote.promotions && quote.promotions.length > 0 ? (
        <p className="info-card-copy store-promo-copy muted">
          {quote.promotions.map((p) => p.name).join(" · ")}
        </p>
      ) : null}

      {quote.checked_at ? (
        <p className="muted info-card-copy">{formatWeekdayDate(quote.checked_at)}</p>
      ) : null}

      {quote.price == null ? (
        <p className="muted info-card-copy">No encontrado</p>
      ) : isBest ? (
        <span className="chip">Mejor precio</span>
      ) : null}
    </article>
  );
}

export function ProductStats({
  stats,
  emptyAction,
}: {
  stats: ProductPriceStats;
  emptyAction?: ReactNode;
}) {
  const hasHistory = stats.latest !== null;

  return (
    <>
      <section className="stats-grid">
        <StatCard label="Último mejor precio" stat={stats.latest} />
        <StatCard label="Mejor en 7 días" stat={stats.best7d} />
        <StatCard label="Mejor en 30 días" stat={stats.best30d} />
      </section>
      <section className="panel">
        <div className="panel-head">
          <h2>Último precio por súper</h2>
        </div>
        <div className="card-grid">
          {stats.latestByStore.map((quote) => {
            const isBest =
              quote.effectivePrice != null &&
              stats.latest !== null &&
              quote.effectivePrice === stats.latest.price;
            return (
              <StorePriceCard key={quote.store} quote={quote} isBest={isBest} />
            );
          })}
        </div>
        {!hasHistory && emptyAction ? (
          <p className="empty-state empty-state-with-action">
            Todavía no hay historial de precios.
            {emptyAction}
          </p>
        ) : null}
      </section>
    </>
  );
}

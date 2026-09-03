import type { ReactNode } from "react";
import { formatArs, formatWeekdayDate } from "@/lib/format";
import { StoreLogo } from "@/components/ui/store-logo";
import {
  StorePriceCard,
} from "@/components/products/store-price-card";
import type { PriceStat, ProductPriceStats } from "@/lib/types";

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
          ) : stat.listPrice != null ? (
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

export function ProductStats({
  stats,
  emptyAction,
}: {
  stats: ProductPriceStats;
  emptyAction?: ReactNode;
}) {
  const hasHistory = stats.latest !== null;
  const bestEffectivePrice = stats.latest?.price ?? null;

  return (
    <>
      <section className="panel">
        <div className="panel-head">
          <h2>Último precio por súper</h2>
        </div>
        <div className="card-grid">
          {stats.latestByStore.map((quote) => {
            const isBest =
              quote.effectivePrice != null &&
              bestEffectivePrice != null &&
              quote.effectivePrice === bestEffectivePrice;
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

      <section className="panel product-history-panel">
        <div className="panel-head">
          <h2>Precios históricos</h2>
        </div>
        <div className="stats-grid">
          <StatCard label="Mejor en 7 días" stat={stats.best7d} />
          <StatCard label="Mejor en 15 días" stat={stats.best15d} />
          <StatCard label="Mejor en 30 días" stat={stats.best30d} />
        </div>
      </section>
    </>
  );
}

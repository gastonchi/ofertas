import type { ReactNode } from "react";
import { formatArs, formatWeekdayDate } from "@/lib/format";
import { StoreLogo } from "@/components/ui/store-logo";
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
        <p className="stat-store">
          <StoreLogo store={stat.store} size="md" />
          <span className="muted">{formatWeekdayDate(stat.checked_at)}</span>
        </p>
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
          {stats.latestByStore.map((stat) => {
            const isBest =
              stat.price != null &&
              stats.latest !== null &&
              stat.price === stats.latest.price;
            return (
              <article
                key={stat.store}
                className={
                  isBest
                    ? "info-card info-card-best store-price-card"
                    : "info-card store-price-card"
                }
              >
                <header className="info-card-head">
                  <StoreLogo store={stat.store} size="lg" />
                  <strong>
                    {stat.price != null ? formatArs(stat.price) : "—"}
                  </strong>
                </header>
                {stat.checked_at ? (
                  <p className="muted info-card-copy">
                    {formatWeekdayDate(stat.checked_at)}
                  </p>
                ) : null}
                {stat.price == null ? (
                  <p className="muted info-card-copy">No encontrado</p>
                ) : isBest ? (
                  <span className="chip">Mejor precio</span>
                ) : null}
              </article>
            );
          })}
        </div>
        {stats.latest === null && emptyAction ? (
          <p className="empty-state empty-state-with-action">
            Todavía no hay historial de precios.
            {emptyAction}
          </p>
        ) : null}
      </section>
    </>
  );
}

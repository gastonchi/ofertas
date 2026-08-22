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
    <article className="stat-card">
      <span>{label}</span>
      {stat ? (
        <>
          <strong>{formatArs(stat.price)}</strong>
          <p className="stat-store">
            <StoreLogo store={stat.store} size="md" />
            <span className="muted">{formatWeekdayDate(stat.checked_at)}</span>
          </p>
        </>
      ) : (
        <>
          <strong>—</strong>
          <p className="stat-store muted">Sin datos en este período</p>
        </>
      )}
    </article>
  );
}

export function ProductStats({ stats }: { stats: ProductPriceStats }) {
  return (
    <>
      <section className="stats-grid">
        <StatCard label="Mejor precio actual" stat={stats.latest} />
        <StatCard label="Mejor precio · 7 días" stat={stats.best7d} />
        <StatCard label="Mejor precio · 30 días" stat={stats.best30d} />
      </section>
      <section className="panel">
        <div className="panel-head">
          <h2>Último precio por súper</h2>
        </div>
        {stats.latestByStore.length === 0 ? (
          <p className="empty-state">Todavía no hay historial de precios.</p>
        ) : (
          <div className="card-grid">
            {stats.latestByStore.map((stat) => {
              const isBest =
                stats.latest !== null && stat.price === stats.latest.price;
              return (
                <article
                  key={stat.store}
                  className={isBest ? "info-card info-card-best" : "info-card"}
                >
                  <header className="info-card-head">
                    <StoreLogo store={stat.store} size="lg" />
                    <strong>{formatArs(stat.price)}</strong>
                  </header>
                  <p className="muted info-card-copy">
                    {formatWeekdayDate(stat.checked_at)}
                  </p>
                  {isBest ? <span className="chip">Mejor precio</span> : null}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}

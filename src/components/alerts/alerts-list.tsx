"use client";

import { useMemo, useState } from "react";
import { AlertProductCard } from "@/components/alerts/alert-product-card";
import { AlertsDayPicker } from "@/components/alerts/alerts-day-picker";
import { getAlertDisplay } from "@/components/alerts/alert-display";
import { StoreLogo } from "@/components/ui/store-logo";
import { isStoreId, STORE_LABELS } from "@/lib/stores";
import { ALL_STORES, type AlertRow, type StoreId } from "@/lib/types";

function normalizeStore(store: string) {
  return store.trim().toLowerCase();
}

function compareByName(a: AlertRow, b: AlertRow) {
  return getAlertDisplay(a).name.localeCompare(getAlertDisplay(b).name, "es", {
    sensitivity: "base",
  });
}

export function AlertsList({
  alerts,
  day,
  max,
}: {
  alerts: AlertRow[];
  day: string;
  max: string;
}) {
  const [enabledStores, setEnabledStores] = useState<Set<StoreId>>(
    () => new Set(ALL_STORES),
  );
  const [query, setQuery] = useState("");

  function toggleStore(store: StoreId) {
    setEnabledStores((current) => {
      const next = new Set(current);
      if (next.has(store)) next.delete(store);
      else next.add(store);
      return next;
    });
  }

  const storeSections = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const byStore = new Map<StoreId, AlertRow[]>();

    for (const alert of alerts) {
      const store = normalizeStore(alert.store);
      if (!isStoreId(store) || !enabledStores.has(store)) continue;

      const name = getAlertDisplay(alert).name.toLowerCase();
      const ean = alert.ean.toLowerCase();
      if (needle && !name.includes(needle) && !ean.includes(needle)) continue;

      const list = byStore.get(store) ?? [];
      list.push(alert);
      byStore.set(store, list);
    }

    return ALL_STORES
      .filter((store) => enabledStores.has(store) && byStore.has(store))
      .map((store) => ({
        store,
        alerts: [...(byStore.get(store) ?? [])].sort(compareByName),
      }));
  }, [alerts, enabledStores, query]);

  const visibleCount = storeSections.reduce(
    (total, section) => total + section.alerts.length,
    0,
  );

  const emptyMessage =
    visibleCount === 0 ? (
      <p className="empty-state">
        {query.trim()
          ? "No hay alertas que coincidan con la búsqueda."
          : alerts.length === 0
            ? "No hay alertas para este día."
            : "No hay alertas para las tiendas seleccionadas."}
      </p>
    ) : null;

  return (
    <div className="alerts-list-shell">
      <div className="alerts-list-toolbar">
        <AlertsDayPicker day={day} max={max} />
        <label className="data-table-search alerts-list-search">
          <span className="sr-only">Filtrar por nombre o EAN</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nombre o EAN"
          />
        </label>
      </div>

      <div
        className="store-filter alerts-store-filter"
        role="group"
        aria-label="Filtrar por supermercado"
      >
        {ALL_STORES.map((store) => {
          const on = enabledStores.has(store);
          return (
            <button
              key={store}
              type="button"
              className={`store-filter-btn${on ? "" : " is-off"}`}
              aria-pressed={on}
              aria-label={`${on ? "Ocultar" : "Mostrar"} ${STORE_LABELS[store]}`}
              onClick={() => toggleStore(store)}
            >
              <StoreLogo store={store} size="sm" />
            </button>
          );
        })}
      </div>

      {emptyMessage ?? (
        <div className="alerts-store-sections">
          {storeSections.map(({ store, alerts: storeAlerts }) => (
            <section key={store} className="alerts-store-section">
              <header className="alerts-store-head">
                <StoreLogo store={store} size="lg" />
                <div className="alerts-store-head-copy">
                  <h2>{STORE_LABELS[store]}</h2>
                  <span className="chip">
                    {storeAlerts.length === 1
                      ? "1 alerta"
                      : `${storeAlerts.length} alertas`}
                  </span>
                </div>
              </header>
              <div className="alerts-product-grid">
                {storeAlerts.map((alert) => (
                  <AlertProductCard key={alert.id} alert={alert} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

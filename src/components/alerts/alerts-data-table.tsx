"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { AlertCard } from "@/components/alerts/alert-card";
import { AlertsDateRange } from "@/components/alerts/alerts-date-range";
import { getAlertDisplay } from "@/components/alerts/alert-display";
import { DataTable } from "@/components/ui/data-table";
import { StoreLogo } from "@/components/ui/store-logo";
import { formatArs, formatDateTime } from "@/lib/format";
import { isStoreId, STORE_LABELS } from "@/lib/stores";
import { ALL_STORES, type AlertRow, type StoreId } from "@/lib/types";

type SortKey = "name" | "store";
type SortDir = "asc" | "desc";

function storeLabel(store: string) {
  const key = store.trim().toLowerCase();
  return isStoreId(key) ? STORE_LABELS[key] : store;
}

function compareAlerts(a: AlertRow, b: AlertRow, key: SortKey, dir: SortDir) {
  const left =
    key === "name" ? getAlertDisplay(a).name : storeLabel(a.store);
  const right =
    key === "name" ? getAlertDisplay(b).name : storeLabel(b.store);
  const cmp = left.localeCompare(right, "es", { sensitivity: "base" });
  return dir === "asc" ? cmp : -cmp;
}

function SortIcon({
  active,
  dir,
}: {
  active: boolean;
  dir: SortDir;
}) {
  if (!active) return <ArrowUpDown size={16} aria-hidden />;
  return dir === "asc" ? (
    <ArrowUp size={16} aria-hidden />
  ) : (
    <ArrowDown size={16} aria-hidden />
  );
}

function SortControl({
  label,
  sortKey,
  sort,
  onToggle,
  variant,
}: {
  label: string;
  sortKey: SortKey;
  sort: { key: SortKey; dir: SortDir } | null;
  onToggle: (key: SortKey) => void;
  variant: "chip" | "header";
}) {
  const active = sort?.key === sortKey;
  const dirLabel = active
    ? sort.dir === "asc"
      ? "ascendente"
      : "descendente"
    : "sin orden";

  return (
    <button
      type="button"
      className={`${variant === "chip" ? "sort-chip" : "sort-header"}${active ? " is-active" : ""}`}
      aria-label={`Ordenar por ${label}, ${dirLabel}`}
      onClick={() => onToggle(sortKey)}
    >
      {label}
      <SortIcon active={active} dir={sort?.dir ?? "asc"} />
    </button>
  );
}

function normalizeStore(store: string) {
  return store.trim().toLowerCase();
}

export function AlertsDataTable({
  alerts,
  from,
  to,
  max,
}: {
  alerts: AlertRow[];
  from: string;
  to: string;
  max: string;
}) {
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir } | null>(null);
  const [enabledStores, setEnabledStores] = useState<Set<StoreId>>(
    () => new Set(ALL_STORES),
  );

  const [query, setQuery] = useState("");

  function toggleSort(key: SortKey) {
    setSort((current) => {
      if (current?.key !== key) return { key, dir: "asc" };
      if (current.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  }

  function toggleStore(store: StoreId) {
    setEnabledStores((current) => {
      const next = new Set(current);
      if (next.has(store)) next.delete(store);
      else next.add(store);
      return next;
    });
  }

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = alerts.filter((alert) => {
      const store = normalizeStore(alert.store);
      if (!isStoreId(store) || !enabledStores.has(store)) return false;
      if (!needle) return true;
      const name = getAlertDisplay(alert).name.toLowerCase();
      const ean = alert.ean.toLowerCase();
      return name.includes(needle) || ean.includes(needle);
    });
    if (!sort) return filtered;
    return [...filtered].sort((a, b) => compareAlerts(a, b, sort.key, sort.dir));
  }, [alerts, enabledStores, query, sort]);

  const emptyMessage =
    rows.length === 0 ? (
      <p className="empty-state">
        {query.trim()
          ? "No hay alertas que coincidan con la búsqueda."
          : alerts.length === 0
            ? "No hay alertas en ese rango de fechas."
            : "No hay alertas para las tiendas seleccionadas."}
      </p>
    ) : null;

  return (
    <DataTable
      storageKey="alerts"
      header={<AlertsDateRange from={from} to={to} max={max} />}
      toolbar={
        <>
          <div className="store-filter" role="group" aria-label="Filtrar por supermercado">
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
          <div className="sort-toolbar" role="group" aria-label="Ordenar alertas">
            <SortControl
              label="Producto"
              sortKey="name"
              sort={sort}
              onToggle={toggleSort}
              variant="chip"
            />
            <SortControl
              label="Tienda"
              sortKey="store"
              sort={sort}
              onToggle={toggleSort}
              variant="chip"
            />
          </div>
        </>
      }
      endToolbar={
        <label className="data-table-search">
          <span className="sr-only">Filtrar por nombre o EAN</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nombre o EAN"
          />
        </label>
      }
      table={
        emptyMessage ?? (
        <table className="data-table">
          <thead>
            <tr>
              <th>
                <SortControl
                  label="Producto"
                  sortKey="name"
                  sort={sort}
                  onToggle={toggleSort}
                  variant="header"
                />
              </th>
              <th>
                <SortControl
                  label="Tienda"
                  sortKey="store"
                  sort={sort}
                  onToggle={toggleSort}
                  variant="header"
                />
              </th>
              <th>Motivo</th>
              <th>Precio</th>
              <th>Enviada</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((alert) => {
              const display = getAlertDisplay(alert);
              return (
                <tr key={alert.id}>
                  <td>
                    <div className="product-name">{display.name}</div>
                    <code className="mono">{alert.ean}</code>
                  </td>
                  <td>
                    <StoreLogo store={alert.store} size="sm" />
                  </td>
                  <td>{display.triggers}</td>
                  <td className="price-emphasis">
                    {typeof display.price === "number"
                      ? formatArs(display.price)
                      : "—"}
                  </td>
                  <td>{formatDateTime(alert.sent_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        )
      }
      cards={
        emptyMessage ??
        rows.map((alert) => (
          <AlertCard key={alert.id} alert={alert} />
        ))
      }
    />
  );
}

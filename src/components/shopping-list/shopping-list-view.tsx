"use client";

import { useMemo, useState } from "react";
import {
  SHOPPING_LIST_STOCK_LEVEL_LABELS,
  type ShoppingListStockLevel,
} from "@/lib/shopping-list/stock-level";
import type { ShoppingListEntry } from "@/lib/types";
import {
  ShoppingListItemCard,
  ShoppingListItemTableRow,
} from "@/components/shopping-list/shopping-list-item-row";

type StockLevelFilter = "all" | ShoppingListStockLevel;

const STOCK_FILTER_OPTIONS: { value: StockLevelFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  {
    value: "none_left",
    label: SHOPPING_LIST_STOCK_LEVEL_LABELS.none_left,
  },
  { value: "low", label: SHOPPING_LIST_STOCK_LEVEL_LABELS.low },
];

export function ShoppingListView({ entries }: { entries: ShoppingListEntry[] }) {
  const [query, setQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<StockLevelFilter>("all");

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return entries.filter(({ product, item }) => {
      if (stockFilter !== "all" && item.stock_level !== stockFilter) {
        return false;
      }
      if (!needle) return true;
      return product.name.toLowerCase().includes(needle);
    });
  }, [entries, query, stockFilter]);

  if (entries.length === 0) {
    return (
      <p className="empty-state">
        La lista está vacía. Agregá productos desde la pantalla Productos o
        escaneá un código de barras.
      </p>
    );
  }

  return (
    <>
      <div className="data-table-toolbar-row product-search-row shopping-list-toolbar">
        <label className="data-table-search">
          <span className="sr-only">Buscar por nombre de producto</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar en la lista"
          />
        </label>
        <div
          className="shopping-list-stock-filter"
          role="group"
          aria-label="Filtrar por urgencia"
        >
          {STOCK_FILTER_OPTIONS.map((option) => {
            const active = stockFilter === option.value;
            return (
              <button
                key={option.value}
                type="button"
                className={
                  active
                    ? "shopping-list-stock-filter-btn is-active"
                    : "shopping-list-stock-filter-btn"
                }
                aria-pressed={active}
                onClick={() => setStockFilter(option.value)}
              >
                {option.value === "all" ? (
                  option.label
                ) : (
                  <span
                    className={`stock-level-pill stock-level-pill--${option.value}`}
                  >
                    {option.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="empty-state">
          No hay productos que coincidan con la búsqueda.
        </p>
      ) : (
        <>
          <div className="table-wrap desktop-only">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Urgencia</th>
                  <th>Cantidad</th>
                  <th>Objetivo</th>
                  <th>Mejor precio</th>
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {rows.map((entry) => (
                  <ShoppingListItemTableRow key={entry.item.id} entry={entry} />
                ))}
              </tbody>
            </table>
          </div>
          <div className="card-grid mobile-only shopping-list-grid">
            {rows.map((entry) => (
              <ShoppingListItemCard key={entry.item.id} entry={entry} />
            ))}
          </div>
        </>
      )}
    </>
  );
}

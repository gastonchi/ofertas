"use client";

import { useMemo, useState } from "react";
import type { ShoppingListEntry } from "@/lib/types";
import {
  ShoppingListItemCard,
  ShoppingListItemTableRow,
} from "@/components/shopping-list/shopping-list-item-row";

export function ShoppingListView({ entries }: { entries: ShoppingListEntry[] }) {
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return entries;
    return entries.filter(({ product }) =>
      product.name.toLowerCase().includes(needle),
    );
  }, [entries, query]);

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
      <div className="data-table-toolbar-row product-search-row">
        <label className="data-table-search">
          <span className="sr-only">Buscar por nombre de producto</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar en la lista"
          />
        </label>
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

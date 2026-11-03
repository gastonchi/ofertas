"use client";

import type { ShoppingListEntry } from "@/lib/types";
import {
  ShoppingListItemCard,
  ShoppingListItemTableRow,
} from "@/components/shopping-list/shopping-list-item-row";

export function ShoppingListView({ entries }: { entries: ShoppingListEntry[] }) {
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
            {entries.map((entry) => (
              <ShoppingListItemTableRow key={entry.item.id} entry={entry} />
            ))}
          </tbody>
        </table>
      </div>
      <div className="card-grid mobile-only shopping-list-grid">
        {entries.map((entry) => (
          <ShoppingListItemCard key={entry.item.id} entry={entry} />
        ))}
      </div>
    </>
  );
}

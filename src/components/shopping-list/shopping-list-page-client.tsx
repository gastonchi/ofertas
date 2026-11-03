"use client";

import { useCallback, useState } from "react";
import { ScanBarcode } from "lucide-react";
import { NewProductPanel } from "@/components/products/product-form";
import type { ProductCreateDraft } from "@/components/products/product-create-draft";
import { ShoppingListAddPanel } from "@/components/shopping-list/shopping-list-add-panel";
import { ShoppingListView } from "@/components/shopping-list/shopping-list-view";
import type { ShoppingListEntry, StoreId } from "@/lib/types";

export function ShoppingListPageClient({
  entries,
  trackedStores,
}: {
  entries: ShoppingListEntry[];
  trackedStores: StoreId[];
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState<ProductCreateDraft | null>(null);

  const openCreate = useCallback((next?: ProductCreateDraft) => {
    setDraft(next ?? null);
    setCreateOpen(true);
  }, []);

  return (
    <>
      <div className="panel-head">
        <p className="muted" style={{ margin: 0 }}>
          Productos y cantidades para la próxima compra. Los datos vienen de tu
          listado de productos.
        </p>
        <div className="panel-actions">
          <ShoppingListAddPanel
            trackedStores={trackedStores}
            onCreateProduct={(next) => openCreate(next)}
            renderTrigger={(open) => (
              <button type="button" className="btn-primary" onClick={open}>
                <ScanBarcode size={18} aria-hidden />
                Escanear código
              </button>
            )}
          />
        </div>
      </div>
      <div className="panel">
        <ShoppingListView entries={entries} />
      </div>
      <NewProductPanel
        open={createOpen}
        draft={draft}
        addToShoppingList
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) setDraft(null);
        }}
      />
    </>
  );
}

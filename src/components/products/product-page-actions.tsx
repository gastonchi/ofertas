"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { LookupPricesPanel } from "@/components/products/lookup-prices-panel";
import { NewProductPanel } from "@/components/products/product-form";
import type { ProductCreateDraft } from "@/components/products/product-create-draft";
import type { StoreId } from "@/lib/types";

export function ProductPageActions({
  trackedStores,
}: {
  trackedStores: StoreId[];
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState<ProductCreateDraft | null>(null);

  function openCreate(next?: ProductCreateDraft) {
    setDraft(next ?? null);
    setCreateOpen(true);
  }

  return (
    <div className="panel-actions">
      <button
        type="button"
        className="btn-primary"
        onClick={() => openCreate()}
      >
        <Plus size={18} aria-hidden />
        Nuevo producto
      </button>
      <LookupPricesPanel
        trackedStores={trackedStores}
        onAddProduct={(next) => openCreate(next)}
      />
      <NewProductPanel
        open={createOpen}
        draft={draft}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) setDraft(null);
        }}
      />
    </div>
  );
}

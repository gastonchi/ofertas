"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { Plus } from "lucide-react";
import { LookupPricesPanel } from "@/components/products/lookup-prices-panel";
import { NewProductPanel } from "@/components/products/product-form";
import type { ProductCreateDraft } from "@/components/products/product-create-draft";
import type { StoreId } from "@/lib/types";

type ProductPageActionsContextValue = {
  openCreate: (draft?: ProductCreateDraft) => void;
  trackedStores: StoreId[];
};

const ProductPageActionsContext =
  createContext<ProductPageActionsContextValue | null>(null);

function useProductPageActions() {
  const ctx = useContext(ProductPageActionsContext);
  if (!ctx) {
    throw new Error(
      "ProductPageActions components must be used within ProductPageActionsProvider",
    );
  }
  return ctx;
}

export function ProductPageActionsProvider({
  trackedStores,
  children,
}: {
  trackedStores: StoreId[];
  children: ReactNode;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState<ProductCreateDraft | null>(null);

  const openCreate = useCallback((next?: ProductCreateDraft) => {
    setDraft(next ?? null);
    setCreateOpen(true);
  }, []);

  return (
    <ProductPageActionsContext.Provider
      value={{ openCreate, trackedStores }}
    >
      {children}
      <NewProductPanel
        open={createOpen}
        draft={draft}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) setDraft(null);
        }}
      />
    </ProductPageActionsContext.Provider>
  );
}

export function ProductNewTitleAction() {
  const { openCreate } = useProductPageActions();

  return (
    <button
      type="button"
      className="btn-primary btn-icon mobile-only"
      onClick={() => openCreate()}
      aria-label="Nuevo producto"
      title="Nuevo producto"
    >
      <Plus size={20} aria-hidden />
    </button>
  );
}

export function ProductPageToolbar() {
  const { openCreate, trackedStores } = useProductPageActions();

  return (
    <div className="panel-actions">
      <button
        type="button"
        className="btn-primary desktop-only"
        onClick={() => openCreate()}
      >
        <Plus size={18} aria-hidden />
        Nuevo producto
      </button>
      <LookupPricesPanel
        trackedStores={trackedStores}
        onAddProduct={(next) => openCreate(next)}
      />
    </div>
  );
}

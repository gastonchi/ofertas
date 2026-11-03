"use client";

import { useCallback, useState, type ReactNode } from "react";
import { Plus, ScanBarcode } from "lucide-react";
import { BarcodeField } from "@/components/products/barcode-field";
import type { ProductCreateDraft } from "@/components/products/product-create-draft";
import {
  bestEffectivePriceFromQuotes,
  StorePriceCard,
} from "@/components/products/store-price-card";
import { Modal } from "@/components/ui/modal";
import { formatArs } from "@/lib/format";
import type { StoreId, StorePricesLookupResult } from "@/lib/types";
import { lookupStorePricesAction } from "@/modules/products/actions";
import {
  addToShoppingListAction,
  getProductByEan,
} from "@/modules/shopping-list/actions";

function draftFromLookup(
  ean: string,
  result: StorePricesLookupResult,
): ProductCreateDraft {
  const prices = result.stores
    .map((item) => item.effectivePrice ?? item.price)
    .filter((price): price is number => price != null);
  const average =
    prices.length > 0
      ? prices.reduce((sum, price) => sum + price, 0) / prices.length
      : null;
  const suggested =
    average != null ? Math.max(1, Math.round(average * 0.9)) : null;

  return {
    ean,
    name: result.name?.trim() || ean,
    targetPrice: suggested != null ? String(suggested) : "",
    targetHint:
      average != null && suggested != null
        ? `Objetivo sugerido: precio promedio - 10% (${formatArs(average)} → ${formatArs(suggested)}).`
        : undefined,
  };
}

type ScanPhase =
  | { kind: "idle" }
  | { kind: "added"; productName: string }
  | { kind: "unknown"; ean: string; result: StorePricesLookupResult };

export function ShoppingListAddPanel({
  trackedStores,
  onCreateProduct,
  renderTrigger,
}: {
  trackedStores: StoreId[];
  onCreateProduct: (draft: ProductCreateDraft) => void;
  renderTrigger?: (open: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [ean, setEan] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<ScanPhase>({ kind: "idle" });

  function close() {
    setOpen(false);
    setEan("");
    setLookingUp(false);
    setError(null);
    setPhase({ kind: "idle" });
  }

  const onScan = useCallback(
    async (scannedEan: string) => {
      setEan(scannedEan);
      setLookingUp(true);
      setError(null);
      setPhase({ kind: "idle" });

      try {
        const existing = await getProductByEan(scannedEan);
        if (existing) {
          const added = await addToShoppingListAction(existing.id);
          if (added.error) {
            setError(added.error);
            return;
          }
          setPhase({ kind: "added", productName: existing.name });
          return;
        }

        const lookup = await lookupStorePricesAction(scannedEan);
        if ("error" in lookup) {
          setError(lookup.error);
          return;
        }
        setPhase({ kind: "unknown", ean: scannedEan, result: lookup });
      } catch {
        setError("No se pudo procesar el código.");
      } finally {
        setLookingUp(false);
      }
    },
    [],
  );

  const unknownResult =
    phase.kind === "unknown" ? phase.result : null;
  const bestPrice = unknownResult
    ? bestEffectivePriceFromQuotes(unknownResult.stores)
    : null;

  const openModal = () => setOpen(true);

  return (
    <>
      {renderTrigger ? (
        renderTrigger(openModal)
      ) : (
        <button type="button" className="btn-secondary" onClick={openModal}>
          <ScanBarcode size={18} aria-hidden />
          Escanear código
        </button>
      )}
      <Modal open={open} title="Agregar a la lista" onClose={close}>
        <div className="lookup-prices">
          <BarcodeField
            id="shopping-list-ean"
            name="shopping-list-ean"
            value={ean}
            onValueChange={setEan}
            onScan={onScan}
            lookingUp={lookingUp}
            autoFocus
          />
          {lookingUp ? <p className="muted">Buscando producto…</p> : null}
          {error ? <p className="form-error">{error}</p> : null}
          {phase.kind === "added" ? (
            <p className="form-success">
              «{phase.productName}» agregado a la lista.
            </p>
          ) : null}
          {phase.kind === "unknown" ? (
            <>
              <p className="muted">
                Este producto no está en tu listado. Podés crearlo y agregarlo
                a la lista de compras.
              </p>
              {phase.result.name ? (
                <h3 className="product-name">{phase.result.name}</h3>
              ) : (
                <p className="muted">Sin nombre en las tiendas.</p>
              )}
              <div className="card-grid">
                {trackedStores.map((store) => {
                  const quote =
                    phase.result.stores.find((item) => item.store === store) ?? {
                      store,
                      price: null,
                    };
                  const effective = quote.effectivePrice ?? quote.price;
                  const isBest =
                    effective != null &&
                    bestPrice != null &&
                    effective === bestPrice;
                  return (
                    <StorePriceCard
                      key={store}
                      quote={quote}
                      isBest={isBest}
                    />
                  );
                })}
              </div>
              <button
                type="button"
                className="btn-primary lookup-add-btn"
                onClick={() => {
                  onCreateProduct(
                    draftFromLookup(phase.ean, phase.result),
                  );
                  close();
                }}
              >
                <Plus size={18} aria-hidden />
                Crear producto y agregar a la lista
              </button>
            </>
          ) : null}
        </div>
      </Modal>
    </>
  );
}

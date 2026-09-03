"use client";

import { useCallback, useState } from "react";
import { Plus, Search } from "lucide-react";
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

export function LookupPricesPanel({
  trackedStores,
  onAddProduct,
}: {
  trackedStores: StoreId[];
  onAddProduct: (draft: ProductCreateDraft) => void;
}) {
  const [open, setOpen] = useState(false);
  const [ean, setEan] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StorePricesLookupResult | null>(null);

  function close() {
    setOpen(false);
    setEan("");
    setLookingUp(false);
    setError(null);
    setResult(null);
  }

  const lookup = useCallback(async (scannedEan: string) => {
    setEan(scannedEan);
    setLookingUp(true);
    setError(null);
    setResult(null);

    try {
      const next = await lookupStorePricesAction(scannedEan);
      if ("error" in next) {
        setError(next.error);
        return;
      }
      setResult(next);
    } catch {
      setError("No se pudo consultar las tiendas.");
    } finally {
      setLookingUp(false);
    }
  }, []);

  const bestPrice = result ? bestEffectivePriceFromQuotes(result.stores) : null;

  return (
    <>
      <button
        type="button"
        className="btn-secondary"
        onClick={() => setOpen(true)}
      >
        <Search size={18} aria-hidden />
        Consultar precio
      </button>
      <Modal open={open} title="Consultar precio" onClose={close}>
        <div className="lookup-prices">
          <BarcodeField
            id="lookup-ean"
            name="lookup-ean"
            value={ean}
            onValueChange={setEan}
            onScan={lookup}
            lookingUp={lookingUp}
            autoFocus
          />
          {lookingUp ? (
            <p className="muted">Consultando súpers…</p>
          ) : null}
          {error ? <p className="form-error">{error}</p> : null}
          {result ? (
            <>
              {result.name ? (
                <h3 className="product-name">{result.name}</h3>
              ) : (
                <p className="muted">No se encontró el nombre del producto.</p>
              )}
              <div className="card-grid">
                {trackedStores.map((store) => {
                  const quote = result.stores.find((item) => item.store === store) ?? {
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
                  onAddProduct(draftFromLookup(ean, result));
                  close();
                }}
              >
                <Plus size={18} aria-hidden />
                Agregar producto
              </button>
            </>
          ) : null}
        </div>
      </Modal>
    </>
  );
}

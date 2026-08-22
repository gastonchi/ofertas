"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { BarcodeField } from "@/components/products/barcode-field";
import { Modal } from "@/components/ui/modal";
import { ALL_STORES, type TrackedProductRow } from "@/lib/types";
import { StoreLogo } from "@/components/ui/store-logo";
import {
  createProductAction,
  lookupProductNameAction,
  updateProductAction,
  type ProductActionState,
} from "@/modules/products/actions";

const initial: ProductActionState = {};

export function ProductForm({
  product,
  defaultStores,
  onDone,
}: {
  product?: TrackedProductRow;
  defaultStores?: TrackedProductRow["stores"];
  onDone?: () => void;
}) {
  const action = product ? updateProductAction : createProductAction;
  const [state, formAction, pending] = useActionState(action, initial);
  const [name, setName] = useState(product?.name ?? "");
  const [ean, setEan] = useState(product?.ean ?? "");
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);
  const lookupSeq = useRef(0);
  const selectedStores = product
    ? product.stores
    : defaultStores?.length
      ? defaultStores
      : [...ALL_STORES];

  useEffect(() => {
    if (state.success) onDone?.();
  }, [state.success, onDone]);

  const lookupName = useCallback(async (scannedEan: string) => {
    const seq = ++lookupSeq.current;
    setEan(scannedEan);
    setLookingUp(true);
    setLookupMessage("Buscando nombre…");

    try {
      const result = await lookupProductNameAction(scannedEan);
      if (seq !== lookupSeq.current) return;

      if (result.error) {
        setName(scannedEan);
        setLookupMessage(result.error);
        return;
      }

      if (result.name) {
        setName(result.name);
        setLookupMessage(
          result.source === "carrefour"
            ? "Nombre tomado de Carrefour."
            : "Nombre tomado de Día.",
        );
        return;
      }

      setName(scannedEan);
      setLookupMessage(
        "No se encontró en Carrefour ni Día. Quedó el código de barras.",
      );
    } catch {
      if (seq !== lookupSeq.current) return;
      setName(scannedEan);
      setLookupMessage(
        "No se pudo consultar las tiendas. Quedó el código de barras.",
      );
    } finally {
      if (seq === lookupSeq.current) setLookingUp(false);
    }
  }, []);

  return (
    <form action={formAction} className="product-form">
      {product ? <input type="hidden" name="id" value={product.id} /> : null}
      <BarcodeField
        id="ean"
        name="ean"
        value={ean}
        onValueChange={setEan}
        onScan={lookupName}
        lookingUp={lookingUp}
        autoFocus={!product}
      />
      <div className="field">
        <label htmlFor="name">Nombre</label>
        <input
          id="name"
          name="name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ej. Yerba Playadito 1 kg"
        />
        {lookupMessage ? (
          <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
            {lookupMessage}
          </p>
        ) : null}
      </div>
      <div className="field">
        <label htmlFor="target_price">Precio objetivo</label>
        <input
          id="target_price"
          name="target_price"
          type="number"
          min={1}
          step={1}
          required
          defaultValue={product?.target_price ?? ""}
        />
      </div>
      <fieldset className="stores-fieldset">
        <legend>Tiendas</legend>
        <p className="muted" style={{ margin: "0 0 0.65rem", fontSize: "0.85rem" }}>
          Se cruza con las tiendas de Configuración. Si allá desmarcás una, el
          job no la consulta aunque esté tildada acá.
        </p>
        <div className="stores-grid">
          {ALL_STORES.map((store) => (
            <label key={store} className="check-label">
              <input
                type="checkbox"
                name="stores"
                value={store}
                defaultChecked={selectedStores.includes(store)}
              />
              <StoreLogo store={store} size="sm" />
            </label>
          ))}
        </div>
      </fieldset>
      {product ? (
        <>
          <label className="check-label">
            <input
              type="checkbox"
              name="active"
              value="true"
              defaultChecked={product.active}
            />
            Activo (incluido en el chequeo)
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              name="alerts_enabled"
              value="true"
              defaultChecked={product.alerts_enabled}
            />
            Alertas por email
          </label>
        </>
      ) : null}
      {state.error ? <p className="form-error">{state.error}</p> : null}
      {state.success ? <p className="form-success">{state.success}</p> : null}
      <button type="submit" className="btn-primary" disabled={pending || lookingUp}>
        {pending
          ? "Guardando…"
          : product
            ? "Guardar cambios"
            : "Agregar producto"}
      </button>
    </form>
  );
}

export function NewProductPanel({
  defaultStores,
}: {
  defaultStores?: TrackedProductRow["stores"];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="btn-primary"
        onClick={() => setOpen(true)}
      >
        <Plus size={18} aria-hidden />
        Nuevo producto
      </button>
      <Modal
        open={open}
        title="Nuevo producto"
        onClose={() => setOpen(false)}
      >
        <ProductForm
          defaultStores={defaultStores}
          onDone={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}

export function EditProductPanel({ product }: { product: TrackedProductRow }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="btn-edit btn-icon"
        onClick={() => setOpen(true)}
        aria-label={`Editar ${product.name}`}
        title="Editar"
      >
        <Pencil size={18} aria-hidden />
      </button>
      <Modal
        open={open}
        title="Editar producto"
        onClose={() => setOpen(false)}
      >
        <ProductForm product={product} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}

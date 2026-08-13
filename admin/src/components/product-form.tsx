"use client";

import { useActionState, useEffect, useState } from "react";
import { ALL_STORES } from "@/lib/types";
import { STORE_LABELS } from "@/lib/stores";
import {
  createProductAction,
  updateProductAction,
  type ProductActionState,
} from "@/app/actions/products";
import type { TrackedProductRow } from "@/lib/types";

const initial: ProductActionState = {};

export function ProductForm({
  product,
  onDone,
}: {
  product?: TrackedProductRow;
  onDone?: () => void;
}) {
  const action = product ? updateProductAction : createProductAction;
  const [state, formAction, pending] = useActionState(action, initial);

  useEffect(() => {
    if (state.success) onDone?.();
  }, [state.success, onDone]);

  return (
    <form action={formAction} className="product-form">
      {product ? <input type="hidden" name="id" value={product.id} /> : null}
      <div className="field">
        <label htmlFor="name">Nombre</label>
        <input
          id="name"
          name="name"
          required
          defaultValue={product?.name ?? ""}
          placeholder="Ej. Yerba Playadito 1 kg"
        />
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="ean">EAN</label>
          <input
            id="ean"
            name="ean"
            required
            inputMode="numeric"
            pattern="\d{8,14}"
            defaultValue={product?.ean ?? ""}
            placeholder="7790…"
          />
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
      </div>
      <fieldset className="stores-fieldset">
        <legend>Tiendas</legend>
        <div className="stores-grid">
          {ALL_STORES.map((store) => (
            <label key={store} className="check-label">
              <input
                type="checkbox"
                name="stores"
                value={store}
                defaultChecked={
                  product ? product.stores.includes(store) : true
                }
              />
              {STORE_LABELS[store]}
            </label>
          ))}
        </div>
      </fieldset>
      {product ? (
        <label className="check-label">
          <input
            type="checkbox"
            name="active"
            value="true"
            defaultChecked={product.active}
          />
          Activo (incluido en el chequeo)
        </label>
      ) : null}
      {state.error ? <p className="form-error">{state.error}</p> : null}
      {state.success ? <p className="form-success">{state.success}</p> : null}
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending
          ? "Guardando…"
          : product
            ? "Guardar cambios"
            : "Agregar producto"}
      </button>
    </form>
  );
}

export function NewProductPanel() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
        Nuevo producto
      </button>
    );
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Nuevo producto</h2>
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
          Cerrar
        </button>
      </div>
      <ProductForm onDone={() => setOpen(false)} />
    </div>
  );
}

export function EditProductPanel({ product }: { product: TrackedProductRow }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" className="btn-ghost" onClick={() => setOpen(true)}>
        Editar
      </button>
    );
  }

  return (
    <div className="inline-edit">
      <ProductForm product={product} onDone={() => setOpen(false)} />
      <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
        Cancelar
      </button>
    </div>
  );
}

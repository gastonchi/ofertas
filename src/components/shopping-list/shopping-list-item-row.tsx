"use client";

import { useTransition } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { ShoppingListProductLink } from "@/components/shopping-list/shopping-list-product-link";
import { ProductThumb } from "@/components/products/product-thumb";
import { StoreLogo } from "@/components/ui/store-logo";
import { formatArs } from "@/lib/format";
import type { ShoppingListEntry } from "@/lib/types";
import {
  removeShoppingListItemAction,
  setShoppingListQuantityAction,
} from "@/modules/shopping-list/actions";

function useShoppingListItemActions(entry: ShoppingListEntry) {
  const [pending, startTransition] = useTransition();
  const { item } = entry;

  function changeQuantity(next: number) {
    startTransition(async () => {
      await setShoppingListQuantityAction(item.id, next);
    });
  }

  function remove() {
    startTransition(async () => {
      await removeShoppingListItemAction(item.id);
    });
  }

  return { pending, changeQuantity, remove, quantity: item.quantity };
}

export function ShoppingListQtyStepper({
  quantity,
  pending,
  productName,
  onChange,
}: {
  quantity: number;
  pending: boolean;
  productName: string;
  onChange: (next: number) => void;
}) {
  return (
    <div className="qty-stepper" aria-label={`Cantidad de ${productName}`}>
      <button
        type="button"
        className="qty-stepper-btn"
        disabled={pending || quantity <= 1}
        onClick={() => onChange(quantity - 1)}
        aria-label="Quitar una unidad"
      >
        <Minus size={18} aria-hidden />
      </button>
      <span className="qty-stepper-value">{quantity}</span>
      <button
        type="button"
        className="qty-stepper-btn"
        disabled={pending || quantity >= 999}
        onClick={() => onChange(quantity + 1)}
        aria-label="Agregar una unidad"
      >
        <Plus size={18} aria-hidden />
      </button>
    </div>
  );
}

export function ShoppingListItemCard({ entry }: { entry: ShoppingListEntry }) {
  const { product, bestPriceStore, bestPrice } = entry;
  const { pending, changeQuantity, remove, quantity } =
    useShoppingListItemActions(entry);

  return (
    <article className="shopping-list-card">
      <div className="shopping-list-card-main">
        <ProductThumb
          name={product.name}
          imageUrl={product.image_url}
          size="lg"
        />
        <div className="shopping-list-card-copy">
          <h3 className="shopping-list-product-title">
            <ShoppingListProductLink productId={product.id} name={product.name} />
          </h3>
          <p className="shopping-list-target muted">
            Objetivo:{" "}
            <strong>{formatArs(Number(product.target_price))}</strong>
          </p>
          {bestPrice != null ? (
            <p className="shopping-list-best muted">
              Mejor reciente: {formatArs(bestPrice)}
            </p>
          ) : null}
        </div>
        {bestPriceStore ? (
          <div className="shopping-list-store" title="Mejor precio reciente">
            <StoreLogo store={bestPriceStore} size="md" />
          </div>
        ) : null}
      </div>
      <footer className="shopping-list-card-foot">
        <ShoppingListQtyStepper
          quantity={quantity}
          pending={pending}
          productName={product.name}
          onChange={changeQuantity}
        />
        <button
          type="button"
          className="btn-danger btn-icon"
          disabled={pending}
          onClick={remove}
          aria-label={`Quitar ${product.name} de la lista`}
          title="Quitar de la lista"
        >
          <Trash2 size={18} aria-hidden />
        </button>
      </footer>
    </article>
  );
}

export function ShoppingListItemTableRow({ entry }: { entry: ShoppingListEntry }) {
  const { product, bestPriceStore, bestPrice } = entry;
  const { pending, changeQuantity, remove, quantity } =
    useShoppingListItemActions(entry);

  return (
    <tr>
      <td>
        <div className="product-row-main">
          <ProductThumb
            name={product.name}
            imageUrl={product.image_url}
            layout="card"
          />
          <ShoppingListProductLink productId={product.id} name={product.name} />
        </div>
      </td>
      <td>
        <ShoppingListQtyStepper
          quantity={quantity}
          pending={pending}
          productName={product.name}
          onChange={changeQuantity}
        />
      </td>
      <td>{formatArs(Number(product.target_price))}</td>
      <td>
        <div className="shopping-list-table-price">
          {bestPrice != null ? (
            <span>{formatArs(bestPrice)}</span>
          ) : (
            <span className="muted">—</span>
          )}
          {bestPriceStore ? (
            <StoreLogo store={bestPriceStore} size="sm" />
          ) : null}
        </div>
      </td>
      <td>
        <button
          type="button"
          className="btn-danger btn-icon"
          disabled={pending}
          onClick={remove}
          aria-label={`Quitar ${product.name} de la lista`}
          title="Quitar de la lista"
        >
          <Trash2 size={18} aria-hidden />
        </button>
      </td>
    </tr>
  );
}

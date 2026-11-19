"use client";

import { useEffect, useTransition, useState } from "react";
import {
  SHOPPING_LIST_STOCK_LEVELS,
  SHOPPING_LIST_STOCK_LEVEL_LABELS,
  type ShoppingListStockLevel,
} from "@/lib/shopping-list/stock-level";
import { setShoppingListStockLevelAction } from "@/modules/shopping-list/actions";

export function ShoppingListStockLevelBadge({
  level,
}: {
  level: ShoppingListStockLevel;
}) {
  return (
    <span className={`stock-level-pill stock-level-pill--${level}`}>
      {SHOPPING_LIST_STOCK_LEVEL_LABELS[level]}
    </span>
  );
}

export function ShoppingListStockLevelControl({
  itemId,
  value,
  disabled,
}: {
  itemId: string;
  value: ShoppingListStockLevel;
  disabled?: boolean;
}) {
  const [local, setLocal] = useState(value);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setLocal(value);
  }, [value]);

  return (
    <select
      className="shopping-list-stock-select"
      value={local}
      disabled={disabled || pending}
      aria-label="Urgencia de compra"
      onChange={(event) => {
        const next = event.target.value as ShoppingListStockLevel;
        setLocal(next);
        startTransition(async () => {
          await setShoppingListStockLevelAction(itemId, next);
        });
      }}
    >
      {SHOPPING_LIST_STOCK_LEVELS.map((level) => (
        <option key={level} value={level}>
          {SHOPPING_LIST_STOCK_LEVEL_LABELS[level]}
        </option>
      ))}
    </select>
  );
}
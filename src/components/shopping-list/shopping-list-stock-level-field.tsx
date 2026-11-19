"use client";

import {
  SHOPPING_LIST_STOCK_LEVELS,
  SHOPPING_LIST_STOCK_LEVEL_LABELS,
  type ShoppingListStockLevel,
} from "@/lib/shopping-list/stock-level";

export function ShoppingListStockLevelField({
  name = "shopping_list_stock_level",
  defaultValue = "low",
}: {
  name?: string;
  defaultValue?: ShoppingListStockLevel;
}) {
  return (
    <fieldset className="shopping-list-stock-fieldset">
      <legend className="shopping-list-stock-legend">Urgencia de compra</legend>
      <p className="muted shopping-list-stock-hint">
        ¿Cuánto queda en casa de este producto?
      </p>
      <div className="shopping-list-stock-options" role="radiogroup">
        {SHOPPING_LIST_STOCK_LEVELS.map((level) => (
          <label key={level} className="shopping-list-stock-option">
            <input
              type="radio"
              name={name}
              value={level}
              defaultChecked={level === defaultValue}
              required
            />
            <span
              className={`stock-level-pill stock-level-pill--${level}`}
            >
              {SHOPPING_LIST_STOCK_LEVEL_LABELS[level]}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
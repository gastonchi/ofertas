export type ShoppingListStockLevel = "none_left" | "low";

export const SHOPPING_LIST_STOCK_LEVELS: ShoppingListStockLevel[] = [
  "none_left",
  "low",
];

export const SHOPPING_LIST_STOCK_LEVEL_LABELS: Record<
  ShoppingListStockLevel,
  string
> = {
  none_left: "No hay más",
  low: "Queda poco",
};

export function isShoppingListStockLevel(
  value: unknown,
): value is ShoppingListStockLevel {
  return value === "none_left" || value === "low";
}

export function parseShoppingListStockLevel(
  value: unknown,
): ShoppingListStockLevel | null {
  const raw = String(value ?? "").trim();
  return isShoppingListStockLevel(raw) ? raw : null;
}
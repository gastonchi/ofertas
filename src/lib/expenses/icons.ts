export const EXPENSE_ICONS = [
  "shopping-cart",
  "utensils",
  "coffee",
  "graduation-cap",
  "book-open",
  "car",
  "fuel",
  "bus",
  "bike",
  "plane",
  "shirt",
  "heart-pulse",
  "pill",
  "spray-can",
  "scissors",
  "house",
  "hammer",
  "lightbulb",
  "smartphone",
  "wifi",
  "tv",
  "music",
  "gamepad",
  "dumbbell",
  "baby",
  "paw-print",
  "gift",
  "sparkles",
  "landmark",
  "credit-card",
  "receipt",
  "piggy-bank",
  "shapes",
] as const;

export type ExpenseIconKey = (typeof EXPENSE_ICONS)[number];

export const DEFAULT_EXPENSE_ICON: ExpenseIconKey = "shapes";

export function isExpenseIcon(value: string): value is ExpenseIconKey {
  return (EXPENSE_ICONS as readonly string[]).includes(value);
}

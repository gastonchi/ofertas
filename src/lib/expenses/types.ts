import type { ExpenseIconKey } from "./icons";

export type ExpenseSubcategory = {
  id: string;
  category_id: string;
  name: string;
  sort_order: number;
  active: boolean;
};

export type ExpenseCategory = {
  id: string;
  name: string;
  icon: ExpenseIconKey;
  sort_order: number;
  active: boolean;
  subcategories: ExpenseSubcategory[];
};

export type ExpenseInput = {
  categoryId: string;
  subcategoryId: string | null;
  amount: number;
  spentOn: string;
  notes: string;
};

export type ExpenseRow = {
  id: string;
  amount: number;
  spent_on: string;
  notes: string | null;
  created_by: string;
  created_by_name: string;
  created_at: string;
  category_name: string;
  category_icon: ExpenseIconKey;
  subcategory_name: string | null;
};

/** Límite de la columna integer de Postgres, con margen. */
export const MAX_EXPENSE_AMOUNT = 2_000_000_000;

export const MAX_EXPENSE_NOTES = 500;

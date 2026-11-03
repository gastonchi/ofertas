"use client";

import { useMemo, useState } from "react";
import type { ExpenseCategory, ExpenseRow } from "@/lib/expenses/types";
import { MAX_EXPENSE_NOTES } from "@/lib/expenses/types";
import { updateExpenseAction } from "@/modules/expenses/actions";

export type ExpenseEditState = { error?: string; success?: string };

export function ExpenseEditForm({
  expense,
  categories,
  onDone,
}: {
  expense: ExpenseRow;
  categories: ExpenseCategory[];
  onDone: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState(expense.category_id);
  const [subcategoryId, setSubcategoryId] = useState(
    expense.subcategory_id ?? "",
  );
  const [amount, setAmount] = useState(String(expense.amount));
  const [spentOn, setSpentOn] = useState(expense.spent_on);
  const [notes, setNotes] = useState(expense.notes ?? "");

  const category = categories.find((item) => item.id === categoryId) ?? null;

  const subcategories = useMemo(() => {
    if (!category) return [];
    const active = category.subcategories.filter((sub) => sub.active);
    if (
      expense.subcategory_id &&
      !active.some((sub) => sub.id === expense.subcategory_id)
    ) {
      const archived = category.subcategories.find(
        (sub) => sub.id === expense.subcategory_id,
      );
      if (archived) return [...active, archived];
    }
    return active;
  }, [category, expense.subcategory_id]);

  const needsSub = subcategories.length > 0;

  function onAmountInput(raw: string) {
    const digits = raw.replace(/\D/g, "").replace(/^0+/, "");
    setAmount(digits);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const parsedAmount = Number(amount);
    const result = await updateExpenseAction(expense.id, {
      categoryId,
      subcategoryId: needsSub ? subcategoryId || null : null,
      amount: parsedAmount,
      spentOn,
      notes,
    });
    setPending(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    onDone();
  }

  return (
    <form className="product-form" onSubmit={onSubmit}>
      <div className="field">
        <label htmlFor="edit-category">Rubro</label>
        <select
          id="edit-category"
          value={categoryId}
          onChange={(event) => {
            setCategoryId(event.target.value);
            setSubcategoryId("");
          }}
          required
        >
          {categories.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
              {!item.active ? " (archivado)" : ""}
            </option>
          ))}
        </select>
      </div>
      {needsSub ? (
        <div className="field">
          <label htmlFor="edit-subcategory">Subrubro</label>
          <select
            id="edit-subcategory"
            value={subcategoryId}
            onChange={(event) => setSubcategoryId(event.target.value)}
            required
          >
            <option value="">Elegí…</option>
            {subcategories.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name}
                {!sub.active ? " (archivado)" : ""}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div className="field">
        <label htmlFor="edit-amount">Monto</label>
        <input
          id="edit-amount"
          type="text"
          inputMode="numeric"
          required
          value={amount ? Number(amount).toLocaleString("es-AR") : ""}
          onChange={(event) => onAmountInput(event.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="edit-date">Fecha</label>
        <input
          id="edit-date"
          type="date"
          required
          value={spentOn}
          onChange={(event) => setSpentOn(event.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="edit-notes">Observaciones</label>
        <textarea
          id="edit-notes"
          rows={3}
          maxLength={MAX_EXPENSE_NOTES}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}

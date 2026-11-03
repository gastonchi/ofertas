"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import Swal from "sweetalert2";
import { CategoryIcon } from "@/components/expenses/category-icon";
import type { ExpenseRow } from "@/lib/expenses/types";
import { formatArs, formatDay } from "@/lib/format";
import { deleteExpenseAction } from "@/modules/expenses/actions";

function expenseLabel(expense: ExpenseRow): string {
  return expense.subcategory_name
    ? `${expense.category_name} › ${expense.subcategory_name}`
    : expense.category_name;
}

async function deleteExpenseWithSwal(expense: ExpenseRow): Promise<void> {
  const confirmed = await Swal.fire({
    icon: "warning",
    title: "Eliminar gasto",
    text: `${expenseLabel(expense)} · ${formatArs(expense.amount)} (${formatDay(expense.spent_on)})`,
    showCancelButton: true,
    confirmButtonText: "Eliminar",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#b42318",
    cancelButtonColor: "#6b7280",
    reverseButtons: true,
    focusCancel: true,
  });
  if (!confirmed.isConfirmed) return;

  const result = await deleteExpenseAction(expense.id);
  if ("error" in result) {
    await Swal.fire({
      icon: "error",
      title: "No se pudo eliminar el gasto.",
      text: result.error,
      confirmButtonColor: "#1f6a45",
    });
  }
}

export function RecentExpenses({ expenses }: { expenses: ExpenseRow[] }) {
  const [pending, startTransition] = useTransition();

  if (expenses.length === 0) {
    return <p className="empty-state">Todavía no hay gastos registrados.</p>;
  }

  return (
    <ul className="expense-list">
      {expenses.map((expense) => (
        <li key={expense.id} className="expense-item">
          <span className="expense-category-icon">
            <CategoryIcon icon={expense.category_icon} size={20} />
          </span>
          <div className="expense-item-copy">
            <p className="product-name">{expenseLabel(expense)}</p>
            <p className="muted expense-item-meta">
              {formatDay(expense.spent_on)} · {expense.created_by_name}
            </p>
            {expense.notes ? (
              <p className="expense-item-notes">{expense.notes}</p>
            ) : null}
          </div>
          <div className="expense-item-end">
            <strong className="price-emphasis">{formatArs(expense.amount)}</strong>
            <button
              type="button"
              className="btn-danger btn-icon"
              disabled={pending}
              onClick={() => startTransition(() => deleteExpenseWithSwal(expense))}
              aria-label={`Eliminar gasto ${expenseLabel(expense)}`}
              title="Eliminar"
            >
              <Trash2 size={18} aria-hidden />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

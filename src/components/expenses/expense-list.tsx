"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState, type FormEvent } from "react";
import { Pencil, Trash2 } from "lucide-react";
import Swal from "sweetalert2";
import { CategoryIcon } from "@/components/expenses/category-icon";
import { ExpenseEditForm } from "@/components/expenses/expense-edit-form";
import { DataTable } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import type { ExpenseCategory, ExpenseListResult, ExpenseRow } from "@/lib/expenses/types";
import {
  expenseListQueryString,
  type ExpenseListParams,
} from "@/lib/expenses/list-params";
import { formatArs, formatDay } from "@/lib/format";
import { deleteExpenseAction } from "@/modules/expenses/actions";

function expenseLabel(expense: ExpenseRow): string {
  return expense.subcategory_name
    ? `${expense.category_name} › ${expense.subcategory_name}`
    : expense.category_name;
}

async function deleteExpenseWithSwal(expense: ExpenseRow): Promise<boolean> {
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
  if (!confirmed.isConfirmed) return false;

  const result = await deleteExpenseAction(expense.id);
  if ("error" in result) {
    await Swal.fire({
      icon: "error",
      title: "No se pudo eliminar el gasto.",
      text: result.error,
      confirmButtonColor: "#1f6a45",
    });
    return false;
  }
  return true;
}

function ExpenseActions({
  expense,
  onEdit,
  layout,
}: {
  expense: ExpenseRow;
  onEdit: () => void;
  layout: "icons" | "grid";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isGrid = layout === "grid";

  return (
    <div className={isGrid ? "card-actions card-actions-grid" : "card-actions"}>
      <button
        type="button"
        className={isGrid ? "btn-edit card-action-btn" : "btn-edit btn-icon"}
        disabled={pending}
        onClick={onEdit}
        aria-label={`Editar ${expenseLabel(expense)}`}
        title="Editar"
      >
        <Pencil size={18} aria-hidden />
        {isGrid ? <span>Editar</span> : null}
      </button>
      <button
        type="button"
        className={isGrid ? "btn-danger card-action-btn" : "btn-danger btn-icon"}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            if (await deleteExpenseWithSwal(expense)) router.refresh();
          })
        }
        aria-label={`Eliminar ${expenseLabel(expense)}`}
        title="Eliminar"
      >
        <Trash2 size={18} aria-hidden />
        {isGrid ? <span>Eliminar</span> : null}
      </button>
    </div>
  );
}

function ExpenseCard({
  expense,
  onEdit,
}: {
  expense: ExpenseRow;
  onEdit: () => void;
}) {
  return (
    <article className="info-card expense-record-card">
      <header className="info-card-head">
        <span className="expense-category-icon">
          <CategoryIcon icon={expense.category_icon} size={22} />
        </span>
        <div className="expense-item-copy">
          <h3 className="product-name">{expenseLabel(expense)}</h3>
          <p className="muted expense-item-meta">
            {formatDay(expense.spent_on)} · {expense.created_by_name}
          </p>
        </div>
        <strong className="price-emphasis">{formatArs(expense.amount)}</strong>
      </header>
      {expense.notes ? (
        <p className="info-card-copy expense-item-notes">{expense.notes}</p>
      ) : null}
      <ExpenseActions expense={expense} onEdit={onEdit} layout="grid" />
    </article>
  );
}

function Pagination({
  params,
  result,
}: {
  params: ExpenseListParams;
  result: ExpenseListResult;
}) {
  const router = useRouter();
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  if (totalPages <= 1) return null;

  const fromRow = (result.page - 1) * result.pageSize + 1;
  const toRow = Math.min(result.page * result.pageSize, result.total);

  function go(page: number) {
    router.push(
      `/gastos/listado${expenseListQueryString(params, { page })}`,
    );
  }

  const pages: number[] = [];
  const window = 2;
  for (
    let p = Math.max(1, result.page - window);
    p <= Math.min(totalPages, result.page + window);
    p += 1
  ) {
    pages.push(p);
  }

  return (
    <nav className="expense-pagination" aria-label="Paginación">
      <p className="muted expense-pagination-meta">
        {fromRow}–{toRow} de {result.total}
      </p>
      <div className="expense-pagination-controls">
        <button
          type="button"
          className="btn-secondary"
          disabled={result.page <= 1}
          onClick={() => go(result.page - 1)}
        >
          Anterior
        </button>
        <div className="expense-pagination-pages" role="group" aria-label="Páginas">
          {pages.map((page) => (
            <button
              key={page}
              type="button"
              className={
                page === result.page
                  ? "btn-primary expense-page-btn"
                  : "btn-secondary expense-page-btn"
              }
              aria-current={page === result.page ? "page" : undefined}
              onClick={() => go(page)}
            >
              {page}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="btn-secondary"
          disabled={result.page >= totalPages}
          onClick={() => go(result.page + 1)}
        >
          Siguiente
        </button>
      </div>
    </nav>
  );
}

export function ExpenseList({
  result,
  params,
  categories,
}: {
  result: ExpenseListResult;
  params: ExpenseListParams;
  categories: ExpenseCategory[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<ExpenseRow | null>(null);
  const [from, setFrom] = useState(params.from);
  const [to, setTo] = useState(params.to);
  const [q, setQ] = useState(params.q);
  const [rubro, setRubro] = useState(params.rubro);
  const [showTc, setShowTc] = useState(params.showTc);

  const hasTextFilter = Boolean(params.q);
  const hasRubroFilter = Boolean(params.rubro);
  const hasExtraFilters = hasTextFilter || hasRubroFilter;

  function toggleShowTc(next: boolean) {
    setShowTc(next);
    router.push(
      `/gastos/listado${expenseListQueryString({
        ...params,
        from,
        to,
        q,
        rubro,
        showTc: next,
        page: 1,
      })}`,
    );
  }

  function applyFilters(event: FormEvent) {
    event.preventDefault();
    router.push(
      `/gastos/listado${expenseListQueryString({
        from,
        to,
        q,
        rubro,
        showTc,
        page: 1,
      })}`,
    );
  }

  function clearFilters() {
    setQ("");
    setRubro("");
    router.push(
      `/gastos/listado${expenseListQueryString({
        ...params,
        q: "",
        rubro: "",
        page: 1,
      })}`,
    );
  }

  const toolbar = (
    <form className="date-range expense-list-filters" onSubmit={applyFilters}>
      <label>
        Desde
        <input
          type="date"
          name="from"
          value={from}
          onChange={(event) => setFrom(event.target.value)}
          required
        />
      </label>
      <label>
        Hasta
        <input
          type="date"
          name="to"
          value={to}
          onChange={(event) => setTo(event.target.value)}
          required
        />
      </label>
      <div className="expense-list-query">
        <label className="data-table-search expense-list-search">
          <span className="sr-only">Buscar</span>
          <input
            type="search"
            name="q"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Monto, nota, usuario…"
          />
        </label>
        <label className="expense-list-rubro">
          <span className="sr-only">Rubro</span>
          <select
            name="rubro"
            value={rubro}
            onChange={(event) => setRubro(event.target.value)}
          >
            <option value="">Todos los rubros</option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
                {!item.active ? " (archivado)" : ""}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="expense-list-tc-toggle">
        <input
          type="checkbox"
          checked={showTc}
          onChange={(event) => toggleShowTc(event.target.checked)}
        />
        Mostrar cuotas de TC
      </label>
      <button type="submit" className="btn-primary">
        Filtrar
      </button>
      {hasExtraFilters ? (
        <button type="button" className="btn-ghost" onClick={clearFilters}>
          Limpiar filtros
        </button>
      ) : null}
    </form>
  );

  const empty = (
    <p className="empty-state">
      {hasExtraFilters
        ? "No hay gastos que coincidan con el filtro."
        : params.showTc
          ? "No hay gastos en este período."
          : "No hay gastos en este período (las cuotas de TC están ocultas)."}
    </p>
  );

  return (
    <>
      <DataTable
        storageKey="expenses-list"
        defaultView="cards"
        toolbar={toolbar}
        table={
          result.rows.length === 0 ? (
            empty
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Rubro</th>
                  <th>Monto</th>
                  <th>Usuario</th>
                  <th>Observaciones</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((expense) => (
                  <tr key={expense.id}>
                    <td>{formatDay(expense.spent_on)}</td>
                    <td>
                      <div className="expense-table-rubro">
                        <CategoryIcon icon={expense.category_icon} size={18} />
                        <span>{expenseLabel(expense)}</span>
                      </div>
                    </td>
                    <td>
                      <strong>{formatArs(expense.amount)}</strong>
                    </td>
                    <td>{expense.created_by_name}</td>
                    <td className="expense-table-notes">
                      {expense.notes ?? "—"}
                    </td>
                    <td>
                      <ExpenseActions
                        expense={expense}
                        onEdit={() => setEditing(expense)}
                        layout="icons"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        }
        cards={
          result.rows.length === 0 ? (
            empty
          ) : (
            result.rows.map((expense) => (
              <ExpenseCard
                key={expense.id}
                expense={expense}
                onEdit={() => setEditing(expense)}
              />
            ))
          )
        }
      />
      {result.rows.length > 0 ? (
        <Pagination params={params} result={result} />
      ) : null}

      <Modal
        open={editing !== null}
        title="Editar gasto"
        onClose={() => setEditing(null)}
      >
        {editing ? (
          <ExpenseEditForm
            key={editing.id}
            expense={editing}
            categories={categories}
            onDone={() => {
              setEditing(null);
              router.refresh();
            }}
          />
        ) : null}
      </Modal>
    </>
  );
}

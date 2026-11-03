"use client";

import {
  useActionState,
  useEffect,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import {
  ArchiveRestore,
  ArrowDown,
  ArrowUp,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import Swal from "sweetalert2";
import { CategoryIcon } from "@/components/expenses/category-icon";
import { Modal } from "@/components/ui/modal";
import {
  DEFAULT_EXPENSE_ICON,
  EXPENSE_ICONS,
  type ExpenseIconKey,
} from "@/lib/expenses/icons";
import type { ExpenseCategory, ExpenseSubcategory } from "@/lib/expenses/types";
import {
  addSubcategoryAction,
  deleteCategoryAction,
  deleteSubcategoryAction,
  moveCategoryAction,
  renameSubcategoryAction,
  saveCategoryAction,
  setCategoryActiveAction,
  setSubcategoryActiveAction,
  type CategoryFormState,
  type CategoryMutationResult,
} from "@/modules/expenses/category-actions";

const BRAND = "#1f6a45";
const DANGER = "#b42318";
const ARCHIVED_COPY =
  "Tenía gastos registrados, así que se archivó: ya no aparece en la carga pero se conserva en el historial.";

async function reportResult(
  result: CategoryMutationResult,
  archivedTitle: string,
): Promise<boolean> {
  if ("error" in result) {
    await Swal.fire({ icon: "error", title: result.error, confirmButtonColor: BRAND });
    return false;
  }
  if (result.archived) {
    await Swal.fire({
      icon: "info",
      title: archivedTitle,
      text: ARCHIVED_COPY,
      confirmButtonColor: BRAND,
    });
  }
  return true;
}

async function deleteCategoryWithSwal(category: ExpenseCategory) {
  const confirmed = await Swal.fire({
    icon: "warning",
    title: "Eliminar rubro",
    text: `¿Querés eliminar "${category.name}" y sus subrubros?`,
    showCancelButton: true,
    confirmButtonText: "Eliminar",
    cancelButtonText: "Cancelar",
    confirmButtonColor: DANGER,
    cancelButtonColor: "#6b7280",
    reverseButtons: true,
    focusCancel: true,
  });
  if (!confirmed.isConfirmed) return;
  await reportResult(await deleteCategoryAction(category.id), "Rubro archivado");
}

async function editSubcategoryWithSwal(sub: ExpenseSubcategory) {
  const result = await Swal.fire({
    title: "Subrubro",
    input: "text",
    inputValue: sub.name,
    inputAttributes: { maxlength: "40", "aria-label": "Nombre del subrubro" },
    showDenyButton: true,
    showCancelButton: true,
    confirmButtonText: "Guardar",
    denyButtonText: sub.active ? "Eliminar" : "Reactivar",
    cancelButtonText: "Cancelar",
    confirmButtonColor: BRAND,
    denyButtonColor: sub.active ? DANGER : BRAND,
    cancelButtonColor: "#6b7280",
    inputValidator: (value) =>
      value.trim() ? undefined : "El nombre es obligatorio.",
  });

  if (result.isConfirmed) {
    const name = String(result.value ?? "").trim();
    if (name && name !== sub.name) {
      await reportResult(await renameSubcategoryAction(sub.id, name), "");
    }
    return;
  }

  if (result.isDenied) {
    await reportResult(
      sub.active
        ? await deleteSubcategoryAction(sub.id)
        : await setSubcategoryActiveAction(sub.id, true),
      "Subrubro archivado",
    );
  }
}

function CategoryForm({
  category,
  onDone,
}: {
  category?: ExpenseCategory;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState<CategoryFormState, FormData>(
    saveCategoryAction,
    {},
  );
  const [icon, setIcon] = useState<ExpenseIconKey>(
    category?.icon ?? DEFAULT_EXPENSE_ICON,
  );

  useEffect(() => {
    if (state.success) onDone();
  }, [state.success, onDone]);

  return (
    <form action={action} className="product-form">
      {category ? <input type="hidden" name="id" value={category.id} /> : null}
      <div className="field">
        <label htmlFor="category-name">Nombre</label>
        <input
          id="category-name"
          name="name"
          required
          maxLength={40}
          defaultValue={category?.name ?? ""}
          placeholder="Ej: Mascotas"
        />
      </div>
      <fieldset className="stores-fieldset">
        <legend>Ícono</legend>
        <div className="icon-picker">
          {EXPENSE_ICONS.map((key) => (
            <label
              key={key}
              className={key === icon ? "icon-option is-selected" : "icon-option"}
              title={key}
            >
              <input
                type="radio"
                name="icon"
                value={key}
                checked={key === icon}
                onChange={() => setIcon(key)}
                className="sr-only"
              />
              <CategoryIcon icon={key} size={22} />
            </label>
          ))}
        </div>
      </fieldset>
      {state.error ? <p className="form-error">{state.error}</p> : null}
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}

function AddSubcategoryForm({ categoryId }: { categoryId: string }) {
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    startTransition(async () => {
      if (await reportResult(await addSubcategoryAction(categoryId, trimmed), "")) {
        setName("");
      }
    });
  }

  return (
    <form className="subcat-add" onSubmit={onSubmit}>
      <label htmlFor={`subcat-${categoryId}`} className="sr-only">
        Nuevo subrubro
      </label>
      <input
        id={`subcat-${categoryId}`}
        value={name}
        maxLength={40}
        placeholder="Nuevo subrubro"
        onChange={(event) => setName(event.target.value)}
      />
      <button
        type="submit"
        className="btn-edit btn-icon"
        disabled={pending || !name.trim()}
        aria-label="Agregar subrubro"
        title="Agregar subrubro"
      >
        <Plus size={18} aria-hidden />
      </button>
    </form>
  );
}

function CategoryCard({
  category,
  isFirst,
  isLast,
  onEdit,
}: {
  category: ExpenseCategory;
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const run = (task: () => Promise<unknown>) => startTransition(async () => {
    await task();
  });

  return (
    <article className={category.active ? "info-card" : "info-card dimmed-card"}>
      <div className="category-card-head">
        <span className="expense-category-icon">
          <CategoryIcon icon={category.icon} size={22} />
        </span>
        <div className="category-card-title">
          <p className="product-name">{category.name}</p>
          {!category.active ? <span className="chip chip-muted">Archivado</span> : null}
        </div>
      </div>

      <div className="card-actions">
        <button
          type="button"
          className="btn-secondary btn-icon"
          disabled={pending || isFirst}
          onClick={() => run(async () => reportResult(await moveCategoryAction(category.id, "up"), ""))}
          aria-label={`Subir ${category.name}`}
          title="Subir"
        >
          <ArrowUp size={18} aria-hidden />
        </button>
        <button
          type="button"
          className="btn-secondary btn-icon"
          disabled={pending || isLast}
          onClick={() => run(async () => reportResult(await moveCategoryAction(category.id, "down"), ""))}
          aria-label={`Bajar ${category.name}`}
          title="Bajar"
        >
          <ArrowDown size={18} aria-hidden />
        </button>
        <button
          type="button"
          className="btn-edit btn-icon"
          disabled={pending}
          onClick={onEdit}
          aria-label={`Editar ${category.name}`}
          title="Editar"
        >
          <Pencil size={18} aria-hidden />
        </button>
        {category.active ? (
          <button
            type="button"
            className="btn-danger btn-icon"
            disabled={pending}
            onClick={() => run(() => deleteCategoryWithSwal(category))}
            aria-label={`Eliminar ${category.name}`}
            title="Eliminar"
          >
            <Trash2 size={18} aria-hidden />
          </button>
        ) : (
          <button
            type="button"
            className="btn-edit"
            disabled={pending}
            onClick={() => run(async () => reportResult(await setCategoryActiveAction(category.id, true), ""))}
          >
            <ArchiveRestore size={18} aria-hidden />
            Reactivar
          </button>
        )}
      </div>

      <div className="subcat-list">
        {category.subcategories.length === 0 ? (
          <p className="muted subcat-empty">Sin subrubros: se pasa directo al monto.</p>
        ) : (
          category.subcategories.map((sub) => (
            <button
              key={sub.id}
              type="button"
              className={sub.active ? "subcat-chip" : "subcat-chip is-archived"}
              disabled={pending}
              onClick={() => run(() => editSubcategoryWithSwal(sub))}
              title={sub.active ? "Editar o eliminar" : "Archivado: tocá para reactivar"}
            >
              {sub.name}
            </button>
          ))
        )}
      </div>
      <AddSubcategoryForm categoryId={category.id} />
    </article>
  );
}

export function CategoryManager({ categories }: { categories: ExpenseCategory[] }) {
  const [editing, setEditing] = useState<ExpenseCategory | "new" | null>(null);
  const close = () => setEditing(null);

  return (
    <>
      <div className="panel-head">
        <p className="muted" style={{ margin: 0 }}>
          Los rubros activos aparecen en la carga de gastos en este orden. Tocá un
          subrubro para renombrarlo o eliminarlo.
        </p>
        <button type="button" className="btn-primary" onClick={() => setEditing("new")}>
          <Plus size={18} aria-hidden />
          Nuevo rubro
        </button>
      </div>

      {categories.length === 0 ? (
        <p className="empty-state">Todavía no hay rubros.</p>
      ) : (
        <div className="card-grid">
          {categories.map((category, index) => (
            <CategoryCard
              key={category.id}
              category={category}
              isFirst={index === 0}
              isLast={index === categories.length - 1}
              onEdit={() => setEditing(category)}
            />
          ))}
        </div>
      )}

      <Modal
        open={editing !== null}
        title={editing === "new" ? "Nuevo rubro" : "Editar rubro"}
        onClose={close}
      >
        {editing ? (
          <CategoryForm
            key={editing === "new" ? "new" : editing.id}
            category={editing === "new" ? undefined : editing}
            onDone={close}
          />
        ) : null}
      </Modal>
    </>
  );
}

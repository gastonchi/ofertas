"use client";

import {
  useRef,
  useState,
  useTransition,
  type CSSProperties,
  type TouchEvent,
} from "react";
import { ChevronLeft, ChevronRight, Delete } from "lucide-react";
import Swal from "sweetalert2";
import { CategoryIcon } from "@/components/expenses/category-icon";
import { SubcategoryMark } from "@/components/expenses/subcategory-mark";
import { resolveSubcategoryVisual } from "@/lib/expenses/subcategory-visual";
import {
  creditCardInstallmentSchedule,
  MAX_CREDIT_CARD_INSTALLMENTS,
} from "@/lib/expenses/installments";
import { formatArs, formatDay } from "@/lib/format";
import {
  MAX_EXPENSE_AMOUNT,
  MAX_EXPENSE_NOTES,
  type ExpenseCategory,
} from "@/lib/expenses/types";
import { createExpenseAction } from "@/modules/expenses/actions";

type StepKey = "category" | "subcategory" | "amount" | "details";

const STEP_TITLES: Record<StepKey, string> = {
  category: "¿En qué gastaste?",
  subcategory: "Elegí el subrubro",
  amount: "¿Cuánto?",
  details: "Fecha y observaciones",
};

const QUICK_AMOUNTS = [
  { value: 1_000, label: "+1k" },
  { value: 10_000, label: "+10k" },
  { value: 50_000, label: "+50k" },
  { value: 100_000, label: "+100k" },
];

const SWIPE_MIN_PX = 60;

export function ExpenseWizard({
  categories,
  today,
  userName,
}: {
  categories: ExpenseCategory[];
  today: string;
  userName: string;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [subcategoryId, setSubcategoryId] = useState<string | null>(null);
  const [amount, setAmount] = useState(0);
  const [spentOn, setSpentOn] = useState(today);
  const [notes, setNotes] = useState("");
  const [creditCard, setCreditCard] = useState(false);
  const [installments, setInstallments] = useState(1);
  const [pending, startTransition] = useTransition();
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const rootRef = useRef<HTMLElement>(null);

  const category = categories.find((item) => item.id === categoryId) ?? null;
  const subcategory =
    category?.subcategories.find((item) => item.id === subcategoryId) ?? null;

  const steps: StepKey[] =
    category && category.subcategories.length > 0
      ? ["category", "subcategory", "amount", "details"]
      : ["category", "amount", "details"];
  const currentStep = steps[stepIndex] ?? "category";

  function goTo(index: number) {
    setStepIndex(Math.max(0, Math.min(index, steps.length - 1)));
    const top = rootRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) rootRef.current?.scrollIntoView({ block: "start" });
  }

  function canAdvance(step: StepKey): boolean {
    if (step === "category") return Boolean(category);
    if (step === "subcategory") return Boolean(subcategory);
    if (step === "amount") return amount > 0;
    return false;
  }

  function pickCategory(id: string) {
    if (id !== categoryId) setSubcategoryId(null);
    setCategoryId(id);
    setStepIndex(1);
  }

  function pickSubcategory(id: string) {
    setSubcategoryId(id);
    goTo(stepIndex + 1);
  }

  function addAmount(delta: number) {
    setAmount((value) => Math.min(value + delta, MAX_EXPENSE_AMOUNT));
  }

  function onAmountInput(raw: string) {
    const digits = raw.replace(/\D/g, "").replace(/^0+/, "");
    setAmount(digits ? Math.min(Number(digits), MAX_EXPENSE_AMOUNT) : 0);
  }

  function reset() {
    setCategoryId(null);
    setSubcategoryId(null);
    setAmount(0);
    setSpentOn(today);
    setNotes("");
    setCreditCard(false);
    setInstallments(1);
    goTo(0);
  }

  const installmentPreview =
    creditCard && amount > 0 && spentOn
      ? creditCardInstallmentSchedule(spentOn, installments, amount)
      : null;

  function onTouchStart(event: TouchEvent) {
    const target = event.target as HTMLElement;
    if (target.closest("input, textarea")) {
      touchStart.current = null;
      return;
    }
    const touch = event.touches[0];
    touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
  }

  function onTouchEnd(event: TouchEvent) {
    const start = touchStart.current;
    const touch = event.changedTouches[0];
    touchStart.current = null;
    if (!start || !touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx > 0 && stepIndex > 0) goTo(stepIndex - 1);
    if (dx < 0 && canAdvance(currentStep)) goTo(stepIndex + 1);
  }

  function save() {
    if (!category || amount <= 0) return;
    startTransition(async () => {
      const result = await createExpenseAction({
        categoryId: category.id,
        subcategoryId: subcategory?.id ?? null,
        amount,
        spentOn,
        notes,
        creditCardInstallments: creditCard ? installments : null,
      });

      if ("error" in result) {
        await Swal.fire({
          icon: "error",
          title: result.error,
          confirmButtonColor: "#1f6a45",
        });
        return;
      }

      const created = result.created ?? 1;
      const firstCuota = installmentPreview?.[0];
      reset();
      await Swal.fire({
        icon: "success",
        title:
          creditCard && created > 1 ? "Cuotas guardadas" : "Gasto guardado",
        text:
          creditCard && firstCuota
            ? `${created === 1 ? "1 cuota" : `${created} cuotas`} · ${formatArs(firstCuota.amount)} c/u · 1.ª ${formatDay(firstCuota.spentOn)}`
            : `${category.name}${subcategory ? ` › ${subcategory.name}` : ""} · ${formatArs(amount)}`,
        timer: 2200,
        showConfirmButton: false,
      });
    });
  }

  const summary = category ? (
    <p className="expense-summary">
      <CategoryIcon icon={category.icon} size={16} />
      <span>
        {category.name}
        {subcategory ? ` › ${subcategory.name}` : ""}
      </span>
      {amount > 0 && currentStep === "details" ? (
        <strong>{formatArs(amount)}</strong>
      ) : null}
    </p>
  ) : null;

  return (
    <section ref={rootRef} className="expense-wizard" aria-label="Registrar gasto">
      <header className="expense-wizard-head">
        <button
          type="button"
          className="btn-ghost btn-icon expense-back"
          onClick={() => goTo(stepIndex - 1)}
          disabled={stepIndex === 0}
          aria-label="Paso anterior"
          style={{ visibility: stepIndex === 0 ? "hidden" : "visible" }}
        >
          <ChevronLeft size={22} aria-hidden />
        </button>
        <div className="expense-wizard-title">
          <h2>{STEP_TITLES[currentStep]}</h2>
          {stepIndex > 0 ? summary : null}
        </div>
        <ol className="expense-steps-dots" aria-label={`Paso ${stepIndex + 1} de ${steps.length}`}>
          {steps.map((step, index) => (
            <li
              key={step}
              className={index === stepIndex ? "is-active" : index < stepIndex ? "is-done" : ""}
            />
          ))}
        </ol>
      </header>

      <div
        className="expense-steps-viewport"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="expense-steps-track"
          style={{ transform: `translateX(-${stepIndex * 100}%)` }}
        >
          {steps.map((step, index) => (
            <div
              key={step}
              className="expense-step"
              inert={index !== stepIndex}
              aria-hidden={index !== stepIndex}
            >
              {step === "category" ? (
                <div className="expense-category-grid">
                  {categories.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={
                        item.id === categoryId
                          ? "expense-category-btn is-selected"
                          : "expense-category-btn"
                      }
                      aria-pressed={item.id === categoryId}
                      onClick={() => pickCategory(item.id)}
                    >
                      <span className="expense-category-icon">
                        <CategoryIcon icon={item.icon} size={24} />
                      </span>
                      <span className="expense-category-label">{item.name}</span>
                    </button>
                  ))}
                </div>
              ) : null}

              {step === "subcategory" && category ? (
                <div className="expense-option-grid">
                  {category.subcategories.map((item) => {
                    const visual = resolveSubcategoryVisual(item.name);
                    const selected = item.id === subcategoryId;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={
                          selected
                            ? "expense-option-btn expense-option-btn-visual is-selected"
                            : "expense-option-btn expense-option-btn-visual"
                        }
                        style={
                          {
                            "--sub-accent": visual.accent,
                            "--sub-surface": visual.surface,
                          } as CSSProperties
                        }
                        aria-pressed={selected}
                        onClick={() => pickSubcategory(item.id)}
                      >
                        <span className="expense-option-mark">
                          <SubcategoryMark mark={visual.mark} size={22} />
                        </span>
                        <span className="expense-option-label">{item.name}</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {step === "amount" ? (
                <form
                  className="expense-amount"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (amount > 0) goTo(stepIndex + 1);
                  }}
                >
                  <label htmlFor="expense-amount" className="sr-only">
                    Monto en pesos
                  </label>
                  <div className="expense-amount-field">
                    <span aria-hidden>$</span>
                    <input
                      id="expense-amount"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="0"
                      value={amount > 0 ? amount.toLocaleString("es-AR") : ""}
                      onChange={(event) => onAmountInput(event.target.value)}
                    />
                    {amount > 0 ? (
                      <button
                        type="button"
                        className="btn-ghost btn-icon"
                        onClick={() => setAmount(0)}
                        aria-label="Borrar monto"
                      >
                        <Delete size={20} aria-hidden />
                      </button>
                    ) : null}
                  </div>
                  <div className="expense-quick-amounts">
                    {QUICK_AMOUNTS.map((quick) => (
                      <button
                        key={quick.value}
                        type="button"
                        className="btn-secondary"
                        onClick={() => addAmount(quick.value)}
                      >
                        {quick.label}
                      </button>
                    ))}
                  </div>
                  <button
                    type="submit"
                    className="btn-primary expense-next"
                    disabled={amount <= 0}
                  >
                    Continuar
                    <ChevronRight size={18} aria-hidden />
                  </button>
                </form>
              ) : null}

              {step === "details" ? (
                <form
                  className="product-form expense-details"
                  onSubmit={(event) => {
                    event.preventDefault();
                    save();
                  }}
                >
                  <div className="field">
                    <label htmlFor="expense-date">
                      {creditCard ? "Fecha de compra" : "Fecha"}
                    </label>
                    <input
                      id="expense-date"
                      type="date"
                      required
                      value={spentOn}
                      onChange={(event) => setSpentOn(event.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="expense-notes">Observaciones</label>
                    <textarea
                      id="expense-notes"
                      rows={3}
                      maxLength={MAX_EXPENSE_NOTES}
                      placeholder="Opcional"
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                    />
                  </div>
                  <p className="muted expense-user">
                    Registra: <strong>{userName}</strong>
                  </p>
                  <div className="expense-tc-block">
                    <label className="expense-tc-check">
                      <input
                        type="checkbox"
                        checked={creditCard}
                        onChange={(event) => {
                          setCreditCard(event.target.checked);
                          if (!event.target.checked) setInstallments(1);
                        }}
                      />
                      Compra con TC
                    </label>
                    {creditCard ? (
                      <div className="field expense-tc-installments">
                        <label htmlFor="expense-installments">Cuotas</label>
                        <select
                          id="expense-installments"
                          value={installments}
                          onChange={(event) =>
                            setInstallments(Number(event.target.value))
                          }
                        >
                          {Array.from(
                            { length: MAX_CREDIT_CARD_INSTALLMENTS },
                            (_, index) => index + 1,
                          ).map((count) => (
                            <option key={count} value={count}>
                              {count}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}
                    {installmentPreview ? (
                      <p className="muted expense-tc-hint">
                        {installments === 1
                          ? `Impacta el ${formatDay(installmentPreview[0].spentOn)}: ${formatArs(installmentPreview[0].amount)}`
                          : `${installments} cuotas desde el ${formatDay(installmentPreview[0].spentOn)} · ${formatArs(installmentPreview[0].amount)}${installments > 1 && installmentPreview.some((c) => c.amount !== installmentPreview[0].amount) ? " c/u (puede variar $1)" : ` c/u`}`}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="submit"
                    className="btn-primary expense-save"
                    disabled={pending || !category || amount <= 0 || !spentOn}
                  >
                    {pending
                      ? "Guardando…"
                      : creditCard
                        ? `Guardar ${formatArs(amount)} en ${installments} cuota${installments === 1 ? "" : "s"}`
                        : `Guardar ${formatArs(amount)}`}
                  </button>
                </form>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

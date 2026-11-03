import { AppShell } from "@/components/layout/app-shell";
import { CategoryManager } from "@/components/expenses/category-manager";
import { hasSupabaseConfig } from "@/lib/env";
import { listExpenseCategories } from "@/modules/expenses/queries";

export const dynamic = "force-dynamic";

export default async function ExpenseCategoriesPage() {
  const configured = hasSupabaseConfig();
  const categories = configured
    ? await listExpenseCategories({ includeInactive: true })
    : null;

  return (
    <AppShell title="Rubros" pathname="/gastos/rubros">
      {!configured ? (
        <p className="setup-banner">
          Faltan <code>SUPABASE_URL</code> y{" "}
          <code>SUPABASE_SERVICE_ROLE_KEY</code>.
        </p>
      ) : null}
      {configured && !categories ? (
        <p className="setup-banner">
          Faltan las tablas de gastos. Ejecutá{" "}
          <code>supabase/migrations/20261103_expenses.sql</code> en el SQL Editor.
        </p>
      ) : null}
      {categories ? <CategoryManager categories={categories} /> : null}
    </AppShell>
  );
}

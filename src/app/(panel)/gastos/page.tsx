import Link from "next/link";
import { Tags } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ExpenseWizard } from "@/components/expenses/expense-wizard";
import { RecentExpenses } from "@/components/expenses/recent-expenses";
import { requireSessionUser } from "@/lib/auth";
import { displayName } from "@/lib/auth/users";
import { hasSupabaseConfig } from "@/lib/env";
import {
  listExpenseCategories,
  listRecentExpenses,
} from "@/modules/expenses/queries";
import { argentinaDay } from "@/scraping/db";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const configured = hasSupabaseConfig();
  const user = await requireSessionUser();
  const categories = configured ? await listExpenseCategories() : null;
  const recent = categories ? await listRecentExpenses(10) : [];

  return (
    <AppShell
      title="Gastos"
      pathname="/gastos"
      titleAction={
        <Link href="/gastos/rubros" className="btn-secondary">
          <Tags size={18} aria-hidden />
          Rubros
        </Link>
      }
    >
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

      {categories && categories.length === 0 ? (
        <p className="empty-state empty-state-with-action">
          No hay rubros cargados.
          <Link href="/gastos/rubros" className="btn-primary">
            Crear rubros
          </Link>
        </p>
      ) : null}

      {categories && categories.length > 0 ? (
        <ExpenseWizard
          categories={categories}
          today={argentinaDay()}
          userName={displayName(user)}
        />
      ) : null}

      {categories ? (
        <section className="panel">
          <div className="panel-head">
            <h2>Últimos gastos</h2>
          </div>
          <RecentExpenses expenses={recent} />
        </section>
      ) : null}
    </AppShell>
  );
}

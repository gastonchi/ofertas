import Link from "next/link";
import { BarChart3, Plus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ExpenseList } from "@/components/expenses/expense-list";
import { hasSupabaseConfig } from "@/lib/env";
import { parseExpenseListParams } from "@/lib/expenses/list-params";
import {
  listExpenseCategories,
  listExpensesPaginated,
} from "@/modules/expenses/queries";
import { argentinaDay } from "@/scraping/db";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function ExpenseListPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const configured = hasSupabaseConfig();
  const raw = await searchParams;
  const params = parseExpenseListParams(raw, argentinaDay());
  const categories = configured
    ? await listExpenseCategories({ includeInactive: true })
    : null;
  const result =
    categories !== null
      ? await listExpensesPaginated(params)
      : null;

  return (
    <AppShell
      title="Listado de gastos"
      pathname="/gastos/listado"
      titleAction={
        <div className="app-header-actions">
          <Link href="/gastos/estadisticas" className="btn-secondary">
            <BarChart3 size={18} aria-hidden />
            Estadísticas
          </Link>
          <Link href="/gastos" className="btn-primary">
            <Plus size={18} aria-hidden />
            Cargar gasto
          </Link>
        </div>
      }
    >
      {!configured ? (
        <p className="setup-banner">
          Faltan <code>SUPABASE_URL</code> y{" "}
          <code>SUPABASE_SERVICE_ROLE_KEY</code>.
        </p>
      ) : null}
      {configured && categories === null ? (
        <p className="setup-banner">
          Faltan las tablas de gastos. Ejecutá{" "}
          <code>supabase/migrations/20261103_expenses.sql</code> en el SQL Editor.
        </p>
      ) : null}

      {result && categories ? (
        <section className="panel">
          <ExpenseList
            result={result}
            params={params}
            categories={categories}
          />
        </section>
      ) : null}
    </AppShell>
  );
}

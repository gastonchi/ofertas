import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ExpenseStatsView } from "@/components/expenses/expense-stats";
import { hasSupabaseConfig } from "@/lib/env";
import { parseExpenseStatsParams } from "@/lib/expenses/stats-params";
import { listExpenseCategories } from "@/modules/expenses/queries";
import { getExpenseStats } from "@/modules/expenses/stats-queries";
import { argentinaDay } from "@/scraping/db";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function ExpenseStatsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const configured = hasSupabaseConfig();
  const raw = await searchParams;
  const params = parseExpenseStatsParams(raw, argentinaDay());
  const categories = configured
    ? await listExpenseCategories({ includeInactive: true })
    : null;
  const stats =
    categories !== null ? await getExpenseStats(params) : null;

  return (
    <AppShell
      title="Estadísticas de gastos"
      pathname="/gastos/estadisticas"
      titleAction={
        <Link href="/gastos/listado" className="btn-secondary">
          Ver listado
        </Link>
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

      {stats && categories ? (
        <section className="panel">
          <p className="expense-stats-lead muted">
            <BarChart3 size={18} aria-hidden />
            Distribución en pesos y porcentaje, promedio mensual por rubro y
            evolución para detectar subas o recortes.
          </p>
          <ExpenseStatsView
            stats={stats}
            params={params}
            categories={categories}
          />
        </section>
      ) : null}
    </AppShell>
  );
}

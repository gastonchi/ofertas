"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CategoryIcon } from "@/components/expenses/category-icon";
import { categoryColorMap, chartColor } from "@/lib/expenses/chart-colors";
import {
  expenseStatsQueryString,
  type ExpenseStatsParams,
  type ExpenseStatsPreset,
} from "@/lib/expenses/stats-params";
import type { ExpenseStats } from "@/lib/expenses/stats-types";
import type { ExpenseCategory } from "@/lib/expenses/types";
import { formatArs, formatDay } from "@/lib/format";

const PRESETS: { id: ExpenseStatsPreset; label: string }[] = [
  { id: "month", label: "Este mes" },
  { id: "prev-month", label: "Mes anterior" },
  { id: "3m", label: "3 meses" },
  { id: "6m", label: "6 meses" },
  { id: "ytd", label: "Año en curso" },
];

function formatPercent(value: number): string {
  return `${value.toLocaleString("es-AR", { maximumFractionDigits: 1 })} %`;
}

function ChangeBadge({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="expense-stats-change muted">Sin período previo</span>;
  }
  if (value === 0) {
    return <span className="expense-stats-change muted">Igual al período anterior</span>;
  }
  const up = value > 0;
  return (
    <span className={up ? "expense-stats-change is-up" : "expense-stats-change is-down"}>
      {up ? "+" : ""}
      {formatPercent(value)} vs período anterior
    </span>
  );
}

function ArsTooltip({
  active,
  payload,
  label,
  showPercent,
  total,
}: {
  active?: boolean;
  payload?: { name?: string | number; value?: string | number }[];
  label?: string;
  showPercent?: boolean;
  total?: number;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const value = Number(item.value ?? 0);
  const name = item.name != null ? String(item.name) : label;
  return (
    <div className="expense-chart-tooltip">
      {label ? <p className="expense-chart-tooltip-label">{label}</p> : null}
      <p>
        <strong>{name}</strong>
      </p>
      <p>{formatArs(value)}</p>
      {showPercent && total && total > 0 ? (
        <p className="muted">{formatPercent((value / total) * 100)}</p>
      ) : null}
    </div>
  );
}

export function ExpenseStatsView({
  stats,
  params,
  categories,
}: {
  stats: ExpenseStats;
  params: ExpenseStatsParams;
  categories: ExpenseCategory[];
}) {
  const router = useRouter();
  const [from, setFrom] = useState(params.from);
  const [to, setTo] = useState(params.to);
  const [rubro, setRubro] = useState(params.rubro);
  const [valueMode, setValueMode] = useState<"amount" | "percent">("amount");

  const colorByCategory = useMemo(
    () => categoryColorMap(stats.chartCategoryIds),
    [stats.chartCategoryIds],
  );

  const pieData = stats.breakdown.map((row, index) => ({
    name: row.name,
    value: row.amount,
    fill: row.icon ? chartColor(index) : chartColor(index + 2),
  }));

  const barData = stats.breakdown.map((row, index) => ({
    name: row.name.length > 18 ? `${row.name.slice(0, 16)}…` : row.name,
    fullName: row.name,
    amount: row.amount,
    percent: row.percent,
    fill: chartColor(index),
  }));

  const evolutionData = stats.byMonth.map((month) => {
    const row: Record<string, string | number> = {
      label: month.label,
      total: month.total,
    };
    for (const seg of month.segments) {
      row[seg.categoryId] = seg.amount;
    }
    return row;
  });

  const categoryNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const month of stats.byMonth) {
      for (const seg of month.segments) {
        map.set(seg.categoryId, seg.name);
      }
    }
    return map;
  }, [stats.byMonth]);

  function go(next: Partial<ExpenseStatsParams>) {
    router.push(
      `/gastos/estadisticas${expenseStatsQueryString(params, next)}`,
    );
  }

  function applyCustomRange(event: FormEvent) {
    event.preventDefault();
    go({ preset: "custom", from, to, rubro });
  }

  const breakdownTitle =
    stats.breakdownLevel === "subrubro" ? "Por subrubro" : "Por rubro";

  return (
    <div className="expense-stats">
      <form className="expense-stats-filters" onSubmit={applyCustomRange}>
        <div className="expense-stats-presets" role="group" aria-label="Período">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={
                params.preset === preset.id
                  ? "btn-primary expense-stats-preset"
                  : "btn-secondary expense-stats-preset"
              }
              onClick={() => go({ preset: preset.id, rubro: params.rubro })}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="expense-stats-custom-filters">
          <div className="expense-stats-dates">
            <label className="expense-stats-date-field">
              <span className="expense-stats-date-label">Desde</span>
              <input
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                aria-label="Desde"
              />
            </label>
            <label className="expense-stats-date-field">
              <span className="expense-stats-date-label">Hasta</span>
              <input
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                aria-label="Hasta"
              />
            </label>
          </div>
          <div className="expense-stats-filters-actions">
            <label className="expense-stats-rubro-field">
              <span className="expense-stats-rubro-label">Rubro</span>
              <select
                value={rubro}
                onChange={(event) => setRubro(event.target.value)}
              >
                <option value="">Todos los rubros</option>
                {categories
                  .filter((cat) => cat.active)
                  .map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
              </select>
            </label>
            <button type="submit" className="btn-primary expense-stats-apply">
              Aplicar
            </button>
          </div>
        </div>
        <p className="muted expense-stats-period-note">
          Período: {formatDay(stats.from)} – {formatDay(stats.to)}
          {params.rubro
            ? ` · ${categories.find((c) => c.id === params.rubro)?.name ?? "Rubro"}`
            : null}
        </p>
      </form>

      <div className="stats-grid expense-stats-summary">
        <article className="stat-card">
          <span className="muted">Total del período</span>
          <strong>{formatArs(stats.total)}</strong>
          <ChangeBadge value={stats.changeVsPreviousPercent} />
        </article>
        <article className="stat-card">
          <span className="muted">Promedio mensual</span>
          <strong>{formatArs(stats.monthlyAverage)}</strong>
          <span className="muted expense-stats-sub">
            Total del período ÷ {stats.monthsInRange}{" "}
            {stats.monthsInRange === 1 ? "mes" : "meses"} — referencia de
            ingresos para cubrir el gasto
          </span>
        </article>
      </div>

      <div className="expense-stats-charts">
        <section className="panel expense-stats-panel">
          <header className="expense-stats-panel-head">
            <h2>{breakdownTitle}</h2>
            <div
              className="expense-stats-toggle"
              role="group"
              aria-label="Ver montos o porcentajes"
            >
              <button
                type="button"
                className={
                  valueMode === "amount" ? "btn-primary" : "btn-secondary"
                }
                onClick={() => setValueMode("amount")}
              >
                $
              </button>
              <button
                type="button"
                className={
                  valueMode === "percent" ? "btn-primary" : "btn-secondary"
                }
                onClick={() => setValueMode("percent")}
              >
                %
              </button>
            </div>
          </header>
          {stats.breakdown.length === 0 ? (
            <p className="muted">No hay gastos en este período.</p>
          ) : (
            <div className="expense-stats-chart-row">
              <div className="expense-stats-chart-box">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={56}
                      outerRadius={96}
                      paddingAngle={2}
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={
                        <ArsTooltip showPercent total={stats.total} />
                      }
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="expense-stats-chart-box">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={barData} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                    <XAxis
                      type="number"
                      tickFormatter={(v) =>
                        valueMode === "percent"
                          ? `${v}%`
                          : `$${(v / 1000).toFixed(0)}k`
                      }
                    />
                    <YAxis type="category" dataKey="name" width={88} tick={{ fontSize: 12 }} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const row = payload[0].payload as {
                          fullName: string;
                          amount: number;
                          percent: number;
                        };
                        return (
                          <div className="expense-chart-tooltip">
                            <p>
                              <strong>{row.fullName}</strong>
                            </p>
                            <p>{formatArs(row.amount)}</p>
                            <p className="muted">{formatPercent(row.percent)}</p>
                          </div>
                        );
                      }}
                    />
                    <Bar
                      dataKey={valueMode === "percent" ? "percent" : "amount"}
                      radius={[0, 6, 6, 0]}
                    >
                      {barData.map((entry) => (
                        <Cell key={entry.fullName} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </section>

        <section className="panel expense-stats-panel">
          <header className="expense-stats-panel-head">
            <h2>Evolución mensual</h2>
            <span className="muted">Total y principales rubros</span>
          </header>
          {stats.byMonth.every((m) => m.total === 0) ? (
            <p className="muted">Sin datos para graficar.</p>
          ) : (
            <>
              <div className="expense-stats-chart-box expense-stats-evolution">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={evolutionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis
                      tickFormatter={(v) => `$${(Number(v) / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => (
                        <ArsTooltip
                          active={active}
                          payload={
                            payload as {
                              name?: string | number;
                              value?: string | number;
                            }[]
                          }
                          label={typeof label === "string" ? label : undefined}
                        />
                      )}
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      name="Total"
                      stroke="#1f6a45"
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="expense-stats-chart-box expense-stats-evolution">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={evolutionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis
                      tickFormatter={(v) => `$${(Number(v) / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => (
                        <ArsTooltip
                          active={active}
                          payload={
                            payload as {
                              name?: string | number;
                              value?: string | number;
                            }[]
                          }
                          label={typeof label === "string" ? label : undefined}
                        />
                      )}
                    />
                    <Legend />
                    {stats.chartCategoryIds.map((categoryId) => (
                      <Bar
                        key={categoryId}
                        dataKey={categoryId}
                        name={categoryNames.get(categoryId) ?? categoryId}
                        stackId="rubros"
                        fill={colorByCategory.get(categoryId) ?? "#5b6b62"}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </section>
      </div>

      <section className="panel expense-stats-table-panel">
        <header className="expense-stats-panel-head">
          <h2>Detalle {breakdownTitle.toLowerCase()}</h2>
        </header>
        <div className="desktop-only">
          <table className="data-table expense-stats-table">
            <thead>
              <tr>
                <th>{stats.breakdownLevel === "subrubro" ? "Subrubro" : "Rubro"}</th>
                <th>Monto</th>
                <th>% del total</th>
                <th>Prom. mensual</th>
              </tr>
            </thead>
            <tbody>
              {stats.breakdown.map((row) => (
                <tr key={row.id}>
                  <td>
                    <span className="expense-stats-table-name">
                      {row.icon ? (
                        <CategoryIcon icon={row.icon} size={18} />
                      ) : null}
                      {row.name}
                    </span>
                  </td>
                  <td>{formatArs(row.amount)}</td>
                  <td>{formatPercent(row.percent)}</td>
                  <td>{formatArs(row.monthlyAverage)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mobile-only card-grid">
          {stats.breakdown.map((row) => (
            <article key={row.id} className="info-card">
              <header className="info-card-head">
                <span className="expense-stats-table-name">
                  {row.icon ? (
                    <CategoryIcon icon={row.icon} size={20} />
                  ) : null}
                  <strong>{row.name}</strong>
                </span>
                <strong className="price-emphasis">{formatArs(row.amount)}</strong>
              </header>
              <p className="muted">
                {formatPercent(row.percent)} del total · Prom. mensual{" "}
                {formatArs(row.monthlyAverage)}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

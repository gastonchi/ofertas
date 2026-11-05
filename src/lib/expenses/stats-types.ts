import type { ExpenseIconKey } from "@/lib/expenses/icons";

export type StatsBreakdownRow = {
  id: string;
  name: string;
  icon: ExpenseIconKey | null;
  amount: number;
  percent: number;
  monthlyAverage: number;
};

export type StatsMonthSegment = {
  categoryId: string;
  name: string;
  amount: number;
};

export type StatsMonthRow = {
  /** YYYY-MM */
  month: string;
  label: string;
  total: number;
  segments: StatsMonthSegment[];
};

export type ExpenseStats = {
  from: string;
  to: string;
  total: number;
  /** Total del período ÷ meses calendario incluidos en el rango */
  monthlyAverage: number;
  monthsInRange: number;
  previousPeriod: {
    from: string;
    to: string;
    total: number;
  };
  /** Variación % vs período anterior (misma cantidad de días); null si no hay base */
  changeVsPreviousPercent: number | null;
  breakdownLevel: "rubro" | "subrubro";
  breakdown: StatsBreakdownRow[];
  byMonth: StatsMonthRow[];
  /** Rubros con más gasto (para leyenda de evolución) */
  chartCategoryIds: string[];
};

/** Paleta alineada al tema (verdes, azules, tierra). */
export const EXPENSE_CHART_COLORS = [
  "#1f6a45",
  "#1578a0",
  "#9a6700",
  "#6b4c9a",
  "#b42318",
  "#2d6a4f",
  "#40916c",
  "#52b788",
  "#74c69d",
  "#95d5b2",
  "#5b6b62",
  "#8b5a2b",
] as const;

export function chartColor(index: number): string {
  return EXPENSE_CHART_COLORS[index % EXPENSE_CHART_COLORS.length];
}

export function categoryColorMap(ids: string[]): Map<string, string> {
  const map = new Map<string, string>();
  ids.forEach((id, index) => {
    map.set(id, chartColor(index));
  });
  return map;
}

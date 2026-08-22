export function formatArs(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(value));
}

export function formatWeekdayDate(value: string): string {
  const date = new Date(value);
  const weekday = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(date);
  const numbered = new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(date);
  const label = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return `${label} ${numbered}`;
}

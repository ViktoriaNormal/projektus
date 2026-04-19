export type DatePreset = "short" | "dmy" | "long" | "datetime" | "time" | "monthDay" | "weekday" | "iso";

const OPTIONS: Record<Exclude<DatePreset, "iso">, Intl.DateTimeFormatOptions> = {
  short: { day: "2-digit", month: "2-digit", year: "2-digit" },
  dmy: { day: "2-digit", month: "2-digit", year: "numeric" },
  long: { day: "numeric", month: "long", year: "numeric" },
  datetime: { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" },
  time: { hour: "2-digit", minute: "2-digit" },
  monthDay: { day: "2-digit", month: "2-digit" },
  weekday: { weekday: "long", day: "numeric", month: "long", year: "numeric" },
};

export function formatDate(value: Date | string | number | null | undefined, preset: DatePreset = "short"): string {
  if (value == null || value === "") return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return "—";
  if (preset === "iso") return d.toISOString();
  return d.toLocaleString("ru-RU", OPTIONS[preset]);
}

export function formatDateRange(start: Date | string, end: Date | string, preset: DatePreset = "short"): string {
  return `${formatDate(start, preset)} — ${formatDate(end, preset)}`;
}

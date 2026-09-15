import type { CSSProperties } from "react";

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return dayKey(a) === dayKey(b);
}

// Monday-first, matching CalendarGrid/CalendarAgenda's week order.
export function startOfWeek(d: Date): Date {
  const diffToMonday = (d.getDay() + 6) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - diffToMonday);
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

// A tinted background + solid-color text reads as "this status" without the
// harsh, attention-grabbing block a solid fill gives a small calendar chip —
// and stays legible in both themes since the tint is derived from the same
// color as the text, not a separate light/dark override.
export function statusChipStyle(color: string): CSSProperties {
  return { backgroundColor: `${color}26`, color };
}

export function dayLabel(d: Date, today: Date): string {
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  if (isSameDay(d, today)) return "Hoy";
  if (isSameDay(d, tomorrow)) return "Mañana";
  const raw = d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "short" });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function timeLabel(d: Date): string {
  return d.toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit" });
}

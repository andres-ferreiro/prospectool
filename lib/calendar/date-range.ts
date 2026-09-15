import { addDays, startOfWeek } from "./format";

export interface DateRange {
  from: string;
  to: string;
}

// The 7 days of the week containing `reference`, Monday-first.
export function weekRange(reference: Date): DateRange {
  const from = startOfWeek(reference);
  const to = addDays(from, 6);
  to.setHours(23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
}

// Full calendar weeks spanning the month, not just day 1..last — the month
// grid always renders complete weeks (including the leading/trailing days
// of adjacent months), so appointments on those visible days need to be
// fetched too. Weeks are Monday-first, matching CalendarGrid/CalendarAgenda.
export function monthRange(reference: Date): DateRange {
  const year = reference.getFullYear();
  const month = reference.getMonth();

  const firstOfMonth = new Date(year, month, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const from = new Date(year, month, 1 - startOffset);

  const lastOfMonth = new Date(year, month + 1, 0);
  const endOffset = 6 - ((lastOfMonth.getDay() + 6) % 7);
  const to = new Date(year, month + 1, 0 + endOffset, 23, 59, 59, 999);

  return { from: from.toISOString(), to: to.toISOString() };
}

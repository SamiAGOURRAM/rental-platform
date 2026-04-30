export interface DateRange {
  start: Date;
  end: Date;
}

/** Number of rental days (inclusive on both ends) */
export function rentalDays(range: DateRange): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const days = Math.ceil((range.end.getTime() - range.start.getTime()) / msPerDay) + 1;
  return Math.max(days, 1);
}

/** Returns true if two date ranges overlap */
export function rangesOverlap(a: DateRange, b: DateRange): boolean {
  return a.start <= b.end && a.end >= b.start;
}

/** Parse a YYYY-MM-DD string to a Date (UTC midnight) */
export function parseDate(dateStr: string): Date {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  if (isNaN(d.getTime())) throw new Error(`Invalid date: ${dateStr}`);
  return d;
}

/** Format a Date to YYYY-MM-DD */
export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Add days to a date */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

// Calendar dates are plain local "YYYY-MM-DD" strings, matching the `date`
// column in Postgres, so there is no timezone shifting anywhere.

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** Monday of the week containing `d`. */
export function startOfWeek(d: Date): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const offset = (r.getDay() + 6) % 7;
  r.setDate(r.getDate() - offset);
  return r;
}

export function weekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** "Oct 5 – 11, 2026", "Sep 29 – Oct 5, 2026", "Dec 29, 2025 – Jan 4, 2026" */
export function formatWeekRange(days: Date[]): string {
  const first = days[0];
  const last = days[days.length - 1];
  const month = (d: Date) => d.toLocaleString(undefined, { month: "short" });
  const y1 = first.getFullYear();
  const y2 = last.getFullYear();
  const start = `${month(first)} ${first.getDate()}${y1 !== y2 ? `, ${y1}` : ""}`;
  const end =
    first.getMonth() === last.getMonth() && y1 === y2
      ? `${last.getDate()}`
      : `${month(last)} ${last.getDate()}`;
  return `${start} – ${end}, ${y2}`;
}

export function formatDuration(seconds: number | null): string {
  if (seconds == null) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** "14:30:00" -> "14:30" */
export function formatTime(t: string | null): string {
  return t ? t.slice(0, 5) : "";
}

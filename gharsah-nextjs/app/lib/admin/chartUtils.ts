const MONTH_LABEL = new Intl.DateTimeFormat("ar-SA", { year: "numeric", month: "short" });
const DAY_LABEL = new Intl.DateTimeFormat("ar-SA", { month: "numeric", day: "numeric" });

/**
 * Zero-fills a {day, count} series (as returned by e.g. `eventCountsByDay`/
 * `visitsByDay` in analyticsRepo.ts, which only return days that actually
 * had at least one event) into exactly `days` consecutive points ending
 * today — a day with real zero activity must still show as 0 on the chart,
 * never be silently skipped, per "historical values should start at zero,
 * never be fabricated". UTC day boundaries, matching every other date
 * computation in this codebase (`new Date().toISOString()` throughout).
 */
export function fillDailyRange(rows: { day: string; count: number }[], days: number): { label: string; value: number }[] {
  const byDay = new Map(rows.map((r) => [r.day, r.count]));
  const today = new Date();
  const out: { label: string; value: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i));
    const iso = d.toISOString().slice(0, 10);
    out.push({ label: DAY_LABEL.format(d), value: byDay.get(iso) ?? 0 });
  }
  return out;
}

/** ISO string for "N days ago, start of day-window" — the `sinceIso` cutoff most analyticsRepo range queries take. */
export function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

/** Buckets day-level {day: "YYYY-MM-DD", count} rows into month-level {label, value} points for the trend charts — daily granularity is too sparse/noisy to read as a line at this project's scale. */
export function bucketByMonth(rows: { day: string; count: number }[]): { label: string; value: number }[] {
  const byMonth = new Map<string, number>();
  for (const row of rows) {
    const month = row.day.slice(0, 7); // "YYYY-MM"
    byMonth.set(month, (byMonth.get(month) ?? 0) + row.count);
  }
  return Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, value]) => ({
      label: MONTH_LABEL.format(new Date(`${month}-01T00:00:00Z`)),
      value,
    }));
}

/** The four ranges every analytics/statistics page (main + per-metric drilldowns) offers — kept in one place so they can never drift apart. */
export type RangeValue = "today" | "7" | "30" | "all";
export const RANGE_DAYS: Record<RangeValue, number | null> = { today: 1, "7": 7, "30": 30, all: null };

export function isoTodayStartUtc(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

/** The `sinceIso` cutoff for a given range — "today" means the current UTC calendar day specifically (not a rolling 24h window), matching what an admin would expect "اليوم" to mean. */
export function resolveRangeSinceIso(range: RangeValue): string | null {
  if (range === "today") return isoTodayStartUtc();
  if (range === "all") return null;
  return isoDaysAgo(RANGE_DAYS[range]!);
}

/**
 * Turns a raw {day,count}[] into chart-ready points for the given range:
 * zero-filled daily points for "today"/"7"/"30" (a single-point "today"
 * series is handled gracefully by AdminTrendChart itself — it renders one
 * big number instead of a one-point line), month-bucketed for "all" since
 * daily granularity over a campaign's whole lifetime would be too noisy.
 */
export function rangeDaySeries(range: RangeValue, rows: { day: string; count: number }[]): { label: string; value: number }[] {
  const days = RANGE_DAYS[range];
  return days ? fillDailyRange(rows, days) : bucketByMonth(rows);
}

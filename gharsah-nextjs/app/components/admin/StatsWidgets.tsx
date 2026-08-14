import Link from "next/link";
import type { RangeValue } from "@/app/lib/admin/chartUtils";

/** The exact required empty-state copy — used everywhere a chart/list/table has no real data yet. Never replaced with invented numbers. */
export const NO_DATA_YET = "لا توجد بيانات كافية حتى الآن";

export function ChartCard({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
  return (
    <section className="card-elevated rounded-2xl border border-border bg-background/90 p-5 backdrop-blur-sm">
      <h2 className="text-sm font-bold text-foreground">{title}</h2>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function RankedList({
  rows,
  valueLabel,
  emptyText = NO_DATA_YET,
}: {
  rows: { label: string; value: number; sub?: string }[];
  valueLabel: string;
  emptyText?: string;
}) {
  // A "top N" list built from zero-filled campaign engagement rows is
  // never actually empty (every campaign gets a row), so without this it
  // would show a confident-looking ranking of campaigns that all have 0 —
  // same all-zero rule as the bar/trend charts, for the same reason.
  if (rows.length === 0 || rows.every((r) => r.value === 0)) {
    return <p className="py-6 text-center text-sm text-muted">{emptyText}</p>;
  }
  return (
    <ol className="space-y-2.5">
      {rows.map((r, i) => (
        <li key={`${r.label}-${i}`} className="flex items-center justify-between gap-3 text-sm">
          <span className="flex min-w-0 items-center gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[10px] font-bold text-primary-dark">
              {i + 1}
            </span>
            <span className="min-w-0 truncate font-medium text-foreground">{r.label}</span>
            {r.sub && <span className="shrink-0 text-xs text-muted">{r.sub}</span>}
          </span>
          <span className="shrink-0 text-xs font-semibold text-muted">
            {r.value} {valueLabel}
          </span>
        </li>
      ))}
    </ol>
  );
}

export const RANGE_OPTIONS: { value: RangeValue; label: string }[] = [
  { value: "today", label: "اليوم" },
  { value: "7", label: "٧ أيام" },
  { value: "30", label: "٣٠ يومًا" },
  { value: "all", label: "الكل" },
];

export function isRangeValue(value: string | undefined): value is RangeValue {
  return RANGE_OPTIONS.some((o) => o.value === value);
}

/** Shared date-range tab strip — `basePath` is the current page's own path (without query string), so each drilldown page can reuse this unchanged. */
export function RangeTabs({ basePath, range }: { basePath: string; range: RangeValue }) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-border bg-background p-1">
      {RANGE_OPTIONS.map((opt) => (
        <Link
          key={opt.value}
          href={`${basePath}?range=${opt.value}`}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
            range === opt.value ? "bg-primary-dark text-white" : "text-muted hover:bg-wash"
          }`}
        >
          {opt.label}
        </Link>
      ))}
    </div>
  );
}

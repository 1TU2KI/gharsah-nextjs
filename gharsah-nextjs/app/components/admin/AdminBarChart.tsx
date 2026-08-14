"use client";

/**
 * Lightweight horizontal bar chart — hand-rolled SVG, no charting library
 * (per the "no unnecessary heavy chart dependencies" requirement). Follows
 * the project's dataviz skill: thin marks with rounded data-ends, values are
 * ALWAYS direct-labeled next to each bar (never color-alone identity) —
 * required here specifically because a couple of these category pairs sit
 * in the 6–8 ΔE "floor" band under CVD simulation, which the skill treats
 * as legal only when paired with a secondary encoding like a direct label.
 * A native `<title>` gives every bar an accessible hover tooltip without
 * any JS state.
 */
export type BarChartDatum = {
  label: string;
  value: number;
  color: string;
};

export default function AdminBarChart({ data, unit }: { data: BarChartDatum[]; unit?: string }) {
  const maxValue = Math.max(1, ...data.map((d) => d.value));

  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return <p className="py-8 text-center text-sm text-muted">لا توجد بيانات كافية حتى الآن</p>;
  }

  return (
    <ul className="space-y-3">
      {data.map((d) => {
        const pct = Math.max(2, Math.round((d.value / maxValue) * 100));
        return (
          <li key={d.label}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">{d.label}</span>
              <span className="font-semibold text-foreground">
                {d.value}
                {unit}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-primary-100" title={`${d.label}: ${d.value}${unit ?? ""}`}>
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{ width: `${pct}%`, backgroundColor: d.color }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

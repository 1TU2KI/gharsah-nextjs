import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Compact, near-square analytics/stat card — replaces the old wide
 * rectangle `StatCard` on the Overview and Statistics pages. Deliberately
 * NOT a hard CSS `aspect-square`: with real (sometimes long) Arabic labels
 * like `استخدام "دع غرسة تختار"`, forcing a strict aspect ratio risks
 * clipped/overlapping text at odd widths. Compactness instead comes from
 * tight padding + a denser grid (4–5 per row on desktop, see the pages
 * using this) — the card ends up close to square in practice without
 * ever fighting real content.
 *
 * Optionally a `Link` (when `href` is given) — the whole card is the click
 * target, with hover/active states applied to its own surface rather than
 * relying on the anchor for styling, so non-clickable cards (no `href`,
 * e.g. nothing to drill into yet) render identically minus the pointer
 * affordances.
 */
export type MetricCardTone = "default" | "emerald" | "teal" | "amber" | "red";

const TONE_VALUE_CLASS: Record<MetricCardTone, string> = {
  default: "text-foreground",
  emerald: "text-primary",
  teal: "text-[#0C787E]",
  amber: "text-amber-600",
  red: "text-red-600",
};

const TONE_ICON_CLASS: Record<MetricCardTone, string> = {
  default: "bg-wash text-muted",
  emerald: "bg-primary-50 text-primary-dark",
  teal: "bg-[#E7F2F2] text-[#0C787E]",
  amber: "bg-amber-50 text-amber-600",
  red: "bg-red-50 text-red-600",
};

export type MetricCardProps = {
  label: string;
  value: string | number;
  /** Only rendered when given — never invented; see the "real data only" rule for the pages that use this. */
  secondary?: string;
  icon?: ReactNode;
  tone?: MetricCardTone;
  /** When present, the whole card becomes a link to a drilldown (or an existing management page like /campaigns) and gets hover/press affordances. */
  href?: string;
};

export default function MetricCard({ label, value, secondary, icon, tone = "default", href }: MetricCardProps) {
  const body = (
    <div
      className={`card-elevated flex h-full min-h-[7.5rem] flex-col justify-between rounded-2xl border border-border bg-background/90 p-4 backdrop-blur-sm transition-all duration-150 ${
        href ? "group-hover:-translate-y-0.5 group-hover:border-primary/35 group-hover:shadow-[0_12px_26px_-12px_rgba(20,83,45,0.32)] group-active:translate-y-0 group-active:shadow-none" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold leading-5 text-muted">{label}</p>
        {icon && (
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${TONE_ICON_CLASS[tone]}`}>
            <span className="h-4 w-4">{icon}</span>
          </span>
        )}
      </div>

      <div className="mt-2">
        <p className={`text-2xl font-extrabold leading-none ${TONE_VALUE_CLASS[tone]}`}>{value}</p>
        <div className="mt-1.5 flex h-4 items-center justify-between">
          {secondary ? <p className="truncate text-[11px] text-muted">{secondary}</p> : <span />}
          {href && (
            <span className="shrink-0 text-[11px] font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
              التفاصيل ←
            </span>
          )}
        </div>
      </div>
    </div>
  );

  if (!href) return body;

  return (
    <Link href={href} className="group block h-full cursor-pointer">
      {body}
    </Link>
  );
}

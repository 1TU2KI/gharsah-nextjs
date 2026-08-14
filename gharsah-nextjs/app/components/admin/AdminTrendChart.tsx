"use client";

import { useId, useState } from "react";

export type TrendDatum = { label: string; value: number };

const WIDTH = 600;
const HEIGHT = 190;
const PAD_X = 14;
const PAD_Y = 26;

/**
 * "Gharsah growth chart" — a single-series trend line redesigned around the
 * site's own growth motif (see the seed→stem→petals animation in
 * DonationTransition.tsx) instead of a generic chart-library look:
 *
 * - Every value is still plotted at its exact real height/position — only
 *   the MARKER shape carries the growth identity, never the data itself.
 * - Zero-value days get a tiny, near-invisible dot (never the large ringed
 *   circle every point used to get) — the baseline stays calm, and only
 *   real activity draws the eye.
 * - Real (non-zero) days get a small two-leaf sprout mark; the single
 *   highest point additionally gets a slightly larger sprout with a soft
 *   radial glow behind it, so the busiest day in the range reads as a
 *   small "growth spike" at a glance without any exaggeration of the
 *   actual value.
 * - Hover grows the nearest marker slightly (CSS transform transition,
 *   no bounce/spring easing) and opens an SVG `<foreignObject>` tooltip
 *   card — styled with the same tokens as every other admin surface
 *   (`bg-background`/`border-border`/`text-muted`), not a native
 *   browser tooltip — showing the exact date and value.
 */
export default function AdminTrendChart({ data, unit }: { data: TrendDatum[]; unit?: string }) {
  const gradientId = useId();
  const glowId = useId();
  const [hovered, setHovered] = useState<number | null>(null);

  // A zero-filled range (see fillDailyRange in chartUtils.ts) is never
  // actually empty — every day is a real point, just all at 0 — so a flat
  // line here would be a technically-accurate but uninformative wall of
  // zero markers. Same rule AdminBarChart already applies to its own
  // all-zero case, for consistency.
  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return <p className="py-8 text-center text-sm text-muted">لا توجد بيانات كافية حتى الآن</p>;
  }
  if (data.length === 1) {
    return (
      <div className="py-8 text-center">
        <p className="text-2xl font-extrabold text-foreground">{data[0].value}</p>
        <p className="mt-1 text-xs text-muted">{data[0].label}</p>
      </div>
    );
  }

  const maxValue = Math.max(1, ...data.map((d) => d.value));
  const stepX = (WIDTH - PAD_X * 2) / (data.length - 1);

  const points = data.map((d, i) => ({
    x: PAD_X + i * stepX,
    y: PAD_Y + (HEIGHT - PAD_Y * 2) * (1 - d.value / maxValue),
    ...d,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${HEIGHT - PAD_Y} L ${points[0].x} ${HEIGHT - PAD_Y} Z`;

  const peakIndex = points.reduce((best, p, i) => (p.value > points[best].value ? i : best), 0);
  const peakValue = points[peakIndex].value;

  // Three date labels along the baseline (first/middle/last) — enough
  // temporal context to read the chart at a glance without crowding it
  // the way labeling every single day would.
  const dateLabelIndices = new Set([0, Math.round((points.length - 1) / 2), points.length - 1]);

  const hoveredPoint = hovered !== null ? points[hovered] : null;
  const tooltipWidth = 92;
  const tooltipHeight = 40;
  const tooltipX = hoveredPoint ? Math.min(Math.max(hoveredPoint.x - tooltipWidth / 2, 2), WIDTH - tooltipWidth - 2) : 0;
  const tooltipY = hoveredPoint ? Math.max(hoveredPoint.y - tooltipHeight - 12, 2) : 0;

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full overflow-visible" role="img" aria-label="مخطط بياني عبر الوقت">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary-light)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--primary-light)" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={glowId}>
          <stop offset="0%" stopColor="var(--primary-light)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="var(--primary-light)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Recessive baseline — the "soil line" the sprouts grow from */}
      <line x1={PAD_X} y1={HEIGHT - PAD_Y} x2={WIDTH - PAD_X} y2={HEIGHT - PAD_Y} stroke="var(--border)" strokeWidth="1" />

      <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
      <path d={linePath} fill="none" stroke="var(--primary)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />

      {points.map((p, i) => {
        const isPeak = i === peakIndex && peakValue > 0;
        const isHovered = hovered === i;
        const baseScale = p.value === 0 ? 1 : isPeak ? 1.6 : 1;
        const scale = isHovered ? baseScale * 1.35 : baseScale;

        return (
          <g key={p.label}>
            {isPeak && <circle cx={p.x} cy={p.y} r={13} fill={`url(#${glowId})`} />}

            <g
              style={{
                transform: `translate(${p.x}px, ${p.y}px) scale(${scale})`,
                transformOrigin: `${p.x}px ${p.y}px`,
                transition: "transform 150ms ease-out",
              }}
            >
              {p.value === 0 ? (
                <circle r="1.5" fill="var(--border)" />
              ) : (
                <SproutMarker color={isHovered || isPeak ? "var(--primary-dark)" : "var(--primary)"} />
              )}
            </g>

            {dateLabelIndices.has(i) && (
              <text x={p.x} y={HEIGHT - PAD_Y + 16} textAnchor="middle" fontSize="9.5" fill="var(--muted)">
                {p.label}
              </text>
            )}

            {/* Larger, invisible hit target — the visible marker above is
                deliberately small, so hovering needs a generous target to
                actually be usable with a mouse. */}
            <circle
              cx={p.x}
              cy={p.y}
              r="11"
              fill="transparent"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered((h) => (h === i ? null : h))}
            />
          </g>
        );
      })}

      {hoveredPoint && (
        <foreignObject x={tooltipX} y={tooltipY} width={tooltipWidth} height={tooltipHeight} className="pointer-events-none overflow-visible">
          <div className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-center shadow-[0_8px_20px_-6px_rgba(20,83,45,0.35)]">
            <p className="text-[10px] font-semibold text-muted">{hoveredPoint.label}</p>
            <p className="text-xs font-bold text-foreground">
              {hoveredPoint.value}
              {unit ? ` ${unit}` : ""}
            </p>
          </div>
        </foreignObject>
      )}
    </svg>
  );
}

/**
 * A small two-leaf sprout, drawn in a local coordinate space with its stem
 * base at the origin — the same "growth from a single point" idea as the
 * donation-transition logo animation, shrunk down to a chart marker. The
 * enclosing `<g>` (see above) handles placement/scale/hover-grow, so this
 * only ever draws itself at unit size around (0,0).
 */
function SproutMarker({ color }: { color: string }) {
  return (
    <g>
      <line x1="0" y1="0" x2="0" y2="-3" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
      <path d="M0,-2.6 Q-4,-3.6 -4.6,-6.6 Q-1,-6 0,-2.6 Z" fill={color} />
      <path d="M0,-2.6 Q4,-3.6 4.6,-6.6 Q1,-6 0,-2.6 Z" fill={color} />
    </g>
  );
}

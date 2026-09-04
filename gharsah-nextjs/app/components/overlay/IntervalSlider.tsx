"use client";

import { formatMinutesLabel } from "@/app/lib/overlay/formatMinutes";

const MIN_INTERVAL_MINUTES = 1;
const MAX_INTERVAL_MINUTES = 60;

/**
 * The interval slider + its "موصى به" recommended-position marker —
 * originally built for Campaign Overlay's "إعداد الأوفرلاي" section, now
 * shared verbatim with Gharsah Overlay so both overlay types offer the
 * exact same timing UX. All the marker/glow visuals still live in
 * globals.css (`.overlay-interval-recommended-*`, `.overlay-mode-featured-
 * badge*`) — untouched, this component just reuses those existing classes.
 *
 * `defaultValue` is the recommended minute value (25 for both overlay
 * types today) — kept as a prop rather than hardcoded so this never
 * silently drifts if one type's recommendation ever differs from the
 * other's. Marker position math: this slider renders right-to-left in the
 * page's RTL layout (the native thumb's minimum sits at the physical
 * right, its maximum at the physical left — confirmed empirically against
 * the rendered thumb position), so the fraction of track between the LEFT
 * edge and `defaultValue` is (MAX − defaultValue) / (MAX − MIN).
 */
export default function IntervalSlider({
  value,
  onChange,
  label,
  defaultValue = 25,
}: {
  value: number;
  onChange: (minutes: number) => void;
  /** e.g. "الوقت بين كل حالة وحالة" (Campaign Overlay) or "الوقت بين كل ظهور والذي يليه" (Gharsah Overlay). */
  label: string;
  defaultValue?: number;
}) {
  const isAtRecommendedInterval = value === defaultValue;
  const recommendedIntervalLeftPercent = ((MAX_INTERVAL_MINUTES - defaultValue) / (MAX_INTERVAL_MINUTES - MIN_INTERVAL_MINUTES)) * 100;

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor="overlay-interval" className="text-xs font-semibold text-foreground">
          {label}
        </label>
        <span className="flex items-center gap-1.5">
          {/* Shown only while the slider sits exactly on the recommended
              default — disappears the moment it's dragged elsewhere. */}
          {isAtRecommendedInterval && (
            <span className="overlay-mode-featured-badge--selected inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold">موصى به</span>
          )}
          <span className="rounded-full bg-primary-100 px-2.5 py-1 text-xs font-extrabold text-primary-dark">{formatMinutesLabel(value)}</span>
        </span>
      </div>

      <div className={`relative mt-7 ${isAtRecommendedInterval ? "mb-9" : "mb-1"}`}>
        {/* Recommended marker — permanent regardless of the current value:
            the "موصى به" tag + its connector line stay ABOVE the track at
            all times (quiet by default, stronger while actually at the
            recommended value). The value itself sits BELOW the track with
            its own mirrored connector line, shown only while active — the
            thumb is already sitting right there otherwise. */}
        <div
          className="pointer-events-none absolute bottom-full z-10 mb-2 flex -translate-x-1/2 flex-col items-center"
          style={{ left: `${recommendedIntervalLeftPercent}%` }}
        >
          <span
            className={`overlay-mode-featured-badge whitespace-nowrap rounded-full px-1.5 py-0.5 text-[9px] font-bold ${isAtRecommendedInterval ? "overlay-mode-featured-badge--selected" : ""}`}
          >
            موصى به
          </span>
          <span className={`overlay-interval-recommended-line mt-1 h-2.5 ${isAtRecommendedInterval ? "overlay-interval-recommended-line--active" : ""}`} />
        </div>

        {/* Soft ambient glow spreading along the track around the
            recommended mark — centered vertically on the track itself. */}
        <div
          className={`overlay-interval-recommended-glow pointer-events-none absolute top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 ${isAtRecommendedInterval ? "overlay-interval-recommended-glow--active" : ""}`}
          style={{ left: `${recommendedIntervalLeftPercent}%` }}
        />

        <input
          id="overlay-interval"
          type="range"
          min={MIN_INTERVAL_MINUTES}
          max={MAX_INTERVAL_MINUTES}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ accentColor: "var(--primary)" }}
          className="relative z-20 h-2 w-full cursor-pointer rounded-full"
        />

        {isAtRecommendedInterval && (
          <div className="pointer-events-none absolute top-full z-10 mt-2 flex -translate-x-1/2 flex-col items-center" style={{ left: `${recommendedIntervalLeftPercent}%` }}>
            <span className="overlay-interval-recommended-line overlay-interval-recommended-line--active h-2.5" />
            <span className="overlay-interval-recommended-value mt-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-extrabold">{formatMinutesLabel(defaultValue)}</span>
          </div>
        )}
      </div>

      <div className="mt-1 flex justify-between text-[10px] text-muted">
        <span>1 د</span>
        <span>15 د</span>
        <span>30 د</span>
        <span>45 د</span>
        <span>60 د</span>
      </div>
    </div>
  );
}

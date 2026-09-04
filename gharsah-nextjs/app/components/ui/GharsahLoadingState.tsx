import GharsahLoader from "./GharsahLoader";
import GharsahLoaderDots from "./GharsahLoaderDots";

type Variant = "fullScreen" | "compact" | "inline";

const SIZE_BY_VARIANT: Record<Variant, number> = {
  fullScreen: 112,
  compact: 72,
  inline: 40,
};

/**
 * The ONE shared loading visual for normal public-site waits — route-level
 * `loading.tsx` Suspense fallbacks, and any future component-level loading
 * state — all built on the same static `GharsahLoader` logo + the same
 * `GharsahLoaderDots` (the actual loading indicator now), never a
 * per-caller reimplementation or a different spinner.
 *
 * Deliberately NOT `InitialLoadOverlay`: that component is the hard-load-
 * only, `position: fixed` overlay gated on the real `window.load` signal
 * plus its own minimum-duration timer, mounted exactly once in the root
 * layout. It composes the SAME `GharsahLoader`/`GharsahLoaderDots` building
 * blocks directly (its own fixed-position wrapper already provides a sized,
 * centered context, so it doesn't need this component's `min-h-*` wrapper)
 * rather than nesting this component inside it.
 *
 * Also deliberately NOT `DonationTransition`/`PlantGrowthVisual`: the
 * "اجعل نيتك أوسع" donation-redirect transition is a wholly separate visual
 * system (a growing plant illustration, not this logo) and must never be
 * swapped in here or vice versa.
 *
 * Three variants, one shared source of truth:
 * - `fullScreen` (default): a large centered block filling the page's
 *   content area (`min-h-[70vh]`) — for a full route's `loading.tsx`. Not
 *   `position: fixed` — Header/Footer stay in place around it, unlike
 *   `InitialLoadOverlay`'s true full-viewport cover.
 * - `compact`: a smaller centered block (`min-h-[30vh]`) with a smaller
 *   logo, for a single component/section that's still loading within an
 *   otherwise-already-rendered page.
 * - `inline`: just the bare logo at a small size, no wrapper sizing and no
 *   dots — for dropping into existing flex/text flow (e.g. beside a label)
 *   without forcing any centering block or extra visual weight.
 */
export default function GharsahLoadingState({
  variant = "fullScreen",
  size,
  className = "",
}: {
  variant?: Variant;
  /** Overrides the variant's own default logo size, if a caller genuinely needs a one-off size. */
  size?: number;
  /** Extra classes merged onto the wrapper `<div>` — ignored for `inline`, which renders no wrapper. */
  className?: string;
}) {
  const resolvedSize = size ?? SIZE_BY_VARIANT[variant];

  if (variant === "inline") {
    return <GharsahLoader size={resolvedSize} />;
  }

  const minHeight = variant === "compact" ? "min-h-[30vh]" : "min-h-[70vh]";

  return (
    <div className={`flex ${minHeight} flex-col items-center justify-center gap-4 ${className}`}>
      <GharsahLoader size={resolvedSize} />
      <GharsahLoaderDots />
    </div>
  );
}

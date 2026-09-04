/**
 * The 3-dot sequential pulse shown beneath the Gharsah logo everywhere a
 * loading state appears on the public site — the initial full-screen
 * overlay (InitialLoadOverlay) AND every route-level `loading.tsx` fallback
 * (via GharsahLoadingState) — defined once here so neither place hand-rolls
 * its own copy of this markup. This is now the MAIN loading indicator (the
 * logo itself is static); all the actual animation is CSS
 * (`.site-loading-dot*` in globals.css, dot1 → dot2 → dot3 → repeat via
 * staggered `animation-delay` on one shared keyframe) — this component is
 * pure markup, hidden entirely under `prefers-reduced-motion` (see the
 * matching CSS rule) rather than left pulsing.
 */
export default function GharsahLoaderDots() {
  return (
    <div className="site-loading-dots" aria-hidden="true">
      <span className="site-loading-dot site-loading-dot--1" />
      <span className="site-loading-dot site-loading-dot--2" />
      <span className="site-loading-dot site-loading-dot--3" />
    </div>
  );
}

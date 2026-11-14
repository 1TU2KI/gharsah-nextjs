"use client";

import Image from "next/image";
import { useId } from "react";
import { useLanguage } from "../../lib/i18n/LanguageProvider";

/**
 * The complete, real Gharsah logo — shown immediately, fully static, no
 * construction animation. This used to build itself petal-by-petal via a
 * hand-drawn SVG approximation that crossfaded into the real /logo.png once
 * "bloomed" (see globals.css git history for that choreography); removed
 * entirely per explicit request — the loading signal now lives in the 3
 * dots beneath it (see GharsahLoaderDots), not in the logo growing. This
 * component only ever displays the real logo file, never redraws it.
 *
 * Deliberately its own component, reused everywhere a Gharsah-branded
 * loading state appears on the public site (InitialLoadOverlay for the
 * initial hard load, GharsahLoadingState for every route-level `loading.tsx`
 * fallback) — one shared source of truth, never a per-page reimplementation.
 * Never used for the donation-redirect transition ("اجعل نيتك أوسع"), which
 * is a wholly separate growing-plant illustration (DonationTransition.tsx /
 * PlantGrowthVisual) with its own animation and CSS namespace.
 *
 * `glass` (loading screens only): the same logo as Liquid Glass INSIDE the
 * petal shapes — every layer is clipped to /logo.png's own alpha, so the
 * silhouette is exact and there is no box or circle around it:
 *   0. shadow — a faint soft shade under the petals (legibility on pale stripes);
 *   1. body   — translucent pearly white + backdrop blur: filled glass the
 *               page background shows through;
 *   2. depth  — the logo's own shading as a silvery grey (inverted, so the
 *               overlaps read as denser glass), screened in at low strength;
 *   3. rim    — a thin white highlight just inside the outer silhouette;
 *   4. sheen  — a soft diagonal light reflection.
 * See `.gharsah-loader--glass` in globals.css.
 */
export default function GharsahLoader({ size = 96, glass = false }: { size?: number; glass?: boolean }) {
  const { t } = useLanguage();
  const filterId = `glg-edges-${useId().replace(/:/g, "")}`;

  if (!glass) {
    return (
      <div className="gharsah-loader" style={{ width: size, height: size }} role="status" aria-label={t.ui.loading}>
        <Image src="/logo.png" alt="" aria-hidden="true" width={size} height={size} className="gharsah-loader__logo" priority />
      </div>
    );
  }

  return (
    <div className="gharsah-loader gharsah-loader--glass" style={{ width: size, height: size }} role="status" aria-label={t.ui.loading}>
      <svg width="0" height="0" aria-hidden="true" focusable="false" className="absolute">
        {/* Thin white rim just inside the outer silhouette: the logo's alpha
            minus a slightly eroded copy of it, filled white. Alpha-only, so
            it's smooth — no color-gradient noise. */}
        <filter id={filterId} x="0" y="0" width="100%" height="100%">
          <feMorphology in="SourceAlpha" operator="erode" radius="0.8" result="inner" />
          <feComposite in="SourceAlpha" in2="inner" operator="out" result="rim" />
          <feFlood floodColor="#ffffff" />
          <feComposite in2="rim" operator="in" />
        </filter>
      </svg>
      <span className="gharsah-loader__glass-shadow" aria-hidden="true">
        <span />
      </span>
      <span className="gharsah-loader__glass-body" aria-hidden="true" />
      <Image src="/logo.png" alt="" aria-hidden="true" width={size} height={size} className="gharsah-loader__glass-depth" priority />
      <Image
        src="/logo.png"
        alt=""
        aria-hidden="true"
        width={size}
        height={size}
        className="gharsah-loader__glass-rim"
        style={{ filter: `url(#${filterId})` }}
        priority
      />
      <span className="gharsah-loader__glass-sheen" aria-hidden="true" />
    </div>
  );
}

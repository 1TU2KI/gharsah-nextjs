"use client";

import Image from "next/image";
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
 */
export default function GharsahLoader({ size = 96 }: { size?: number }) {
  const { t } = useLanguage();

  return (
    <div className="gharsah-loader" style={{ width: size, height: size }} role="status" aria-label={t.ui.loading}>
      <Image src="/logo.png" alt="" aria-hidden="true" width={size} height={size} className="gharsah-loader__logo" priority />
    </div>
  );
}

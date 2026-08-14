"use client";

import Image from "next/image";
import { useLanguage } from "../../lib/i18n/LanguageProvider";

/**
 * Petal paths are hand-derived approximations of the Gharsah lotus mark
 * (five vesica-shaped leaves fanned from one base point), used only for the
 * growth animation. The animation crossfades into the real /logo.png once
 * fully bloomed, so this shape only needs to read as "inspired by" the logo
 * rather than match it pixel-for-pixel.
 */
const petals = [
  { key: "bottom-left", className: "gharsah-loader__petal--bottom-left", d: "M100,170 Q82.46,108.06 29.88,135.84 Q40.4,194.36 100,170 Z" },
  { key: "bottom-right", className: "gharsah-loader__petal--bottom-right", d: "M100,170 Q117.54,108.06 170.12,135.84 Q159.6,194.36 100,170 Z" },
  { key: "mid-left", className: "gharsah-loader__petal--mid-left", d: "M100,170 Q101.64,111.6 46.9,91.25 Q45.26,149.6 100,170 Z" },
  { key: "mid-right", className: "gharsah-loader__petal--mid-right", d: "M100,170 Q98.36,111.6 153.1,91.25 Q154.74,149.6 100,170 Z" },
  { key: "top", className: "gharsah-loader__petal--top", d: "M100,170 Q126,111.5 100,40 Q74,111.5 100,170 Z" },
];

export default function GharsahLoader({ size = 96 }: { size?: number }) {
  const { t } = useLanguage();

  return (
    <div className="gharsah-loader" style={{ width: size, height: size }} role="status" aria-label={t.ui.loading}>
      <svg className="gharsah-loader__svg" viewBox="0 0 200 200" aria-hidden="true">
        <defs>
          <linearGradient id="gharsah-loader-flower" x1="100" y1="200" x2="100" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" className="gharsah-loader__stop-a" />
            <stop offset="55%" className="gharsah-loader__stop-b" />
            <stop offset="100%" className="gharsah-loader__stop-c" />
          </linearGradient>
        </defs>

        <line className="gharsah-loader__stem" x1="100" y1="190" x2="100" y2="170" strokeWidth="5" strokeLinecap="round" />
        <circle className="gharsah-loader__seed" cx="100" cy="190" r="5" />

        {petals.map((petal) => (
          <path
            key={petal.key}
            d={petal.d}
            fill="url(#gharsah-loader-flower)"
            fillOpacity={0.92}
            className={`gharsah-loader__petal ${petal.className}`}
          />
        ))}
      </svg>

      <Image src="/logo.png" alt="" aria-hidden="true" width={size} height={size} className="gharsah-loader__logo" priority />
    </div>
  );
}

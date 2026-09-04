"use client";

import Link from "next/link";
import AlmostThereGrid from "./AlmostThereGrid";
import { useLanguage } from "../../lib/i18n/LanguageProvider";
import type { Campaign } from "../../lib/campaigns";

/**
 * "اقتربت..." / "Almost There" — a spotlight of (at most) the 3 active
 * campaigns closest to completion. The compact homepage version of the same
 * ranking/layout the dedicated /near page shows in full (see
 * AlmostThereGrid.tsx for the shared podium arrangement) — a small "عرض
 * اقتربت كاملة" link next to the heading points there, mirroring the
 * "عرض جميع الحالات النشطة" pattern ActiveCasesSectionClient already uses
 * for its own full-page counterpart.
 */
export default function AlmostThereSectionClient({ campaigns }: { campaigns: Campaign[] }) {
  const { t, locale } = useLanguage();

  return (
    <section className="relative overflow-x-hidden py-20">
      <div className="relative z-10 mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="text-center sm:text-start">
            <h2
              className={`text-3xl font-extrabold text-foreground sm:text-4xl ${locale === "en" ? "tracking-tight" : ""}`}
            >
              {t.almostThere.heading}
            </h2>
            <p className="mt-2 max-w-xl text-muted">{t.almostThere.description}</p>
          </div>
          <Link
            href="/near"
            className="rounded-full border border-primary/30 bg-background px-6 py-2.5 text-sm font-semibold text-primary-dark transition-colors hover:bg-primary-50"
          >
            {t.almostThere.viewFullPage}
          </Link>
        </div>

        <div className="mt-12">
          <AlmostThereGrid campaigns={campaigns} />
        </div>

        {/* Subtle CTA to the dedicated OBS/streamer overlay page — same
            link/wording NearPageClient.tsx uses at the end of the full
            /near page, just placed here too since it fits cleanly below
            this compact homepage version. */}
        <p className="mt-8 text-center text-sm">
          <Link href="/overlay" className="font-semibold text-primary-dark transition-colors hover:underline active:opacity-70">
            {t.almostThere.overlayCta}
          </Link>
        </p>
      </div>
    </section>
  );
}

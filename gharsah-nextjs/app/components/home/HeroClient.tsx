"use client";

import Link from "next/link";
import { ArrowIcon, CheckBadgeIcon, DonationBoxIcon, LeafIcon, PulseIcon } from "./icons";
import HeroBackground from "./HeroBackground";
import OpeningVerse from "./OpeningVerse";
import { useLanguage } from "../../lib/i18n/LanguageProvider";

export default function HeroClient({
  totalCount,
  averageActivePercent,
  completedCount,
  activeCount,
}: {
  totalCount: number;
  averageActivePercent: number | null;
  completedCount: number;
  activeCount: number;
}) {
  const { t, locale } = useLanguage();

  return (
    <section className="relative overflow-x-hidden">
      <HeroBackground />

      <div className="relative z-10 px-6 pt-14 sm:pt-20">
        <OpeningVerse />
      </div>

      <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 md:grid-cols-2 md:py-28">
        <div className="text-center md:text-start">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-100 px-4 py-1.5 text-sm font-semibold text-primary-dark">
            <LeafIcon className="h-4 w-4" />
            {t.hero.pill}
          </span>

          <h1
            className={`mt-6 text-center text-4xl font-extrabold text-foreground sm:text-5xl ${
              locale === "en" ? "leading-[1.08] tracking-tight" : "leading-snug"
            }`}
          >
            {t.hero.titleLine1}
            <br />
            <span className="text-[clamp(1.5rem,6vw,42px)]">{t.hero.titleLine2}</span>
          </h1>

          <p className="mx-auto mt-5 max-w-md text-balance text-lg leading-8 text-muted md:mx-0 md:max-w-xl">
            {t.hero.description}
          </p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center md:justify-start">
            <Link
              href="/cases/active"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-7 py-3.5 text-base font-semibold text-on-accent shadow-[0_10px_24px_-8px_rgba(20,83,45,0.45)] transition-all hover:bg-accent-strong hover:shadow-[0_14px_28px_-8px_rgba(20,83,45,0.55)]"
            >
              {t.hero.browseCases}
              <ArrowIcon className="h-4 w-4 rotate-180" />
            </Link>
            <Link
              href="/cases/completed"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#0C787E]/30 bg-background px-7 py-3.5 text-base font-semibold text-[#0C787E] transition-colors hover:bg-[#E7F2F2]"
            >
              {t.hero.completedCases}
            </Link>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-sm">
          <div className="card-elevated rounded-[2rem] bg-background/70 p-8 ring-1 ring-background/60 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white">
                <DonationBoxIcon className="h-8 w-8" />
              </span>
              <div>
                <p className="text-sm text-muted">{t.hero.totalCampaigns}</p>
                <p className="text-lg font-bold text-foreground">{totalCount}</p>
              </div>
            </div>

            <div className="mt-6 h-2.5 w-full overflow-hidden rounded-full bg-primary-100">
              <div
                className="h-full rounded-full bg-gradient-to-l from-primary to-primary-light"
                style={{ width: `${averageActivePercent ?? 0}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-muted">
              {averageActivePercent !== null ? t.hero.activeCompletion(averageActivePercent) : t.hero.notEnoughData}
            </p>

            {/* DOM order is Completed-then-Active (not Active-then-Completed):
                in this RTL layout, the grid's first item lands on the visual
                right and the second on the visual left, so this ordering is
                what actually renders Active on the left / Completed on the
                right, as required. */}
            <div className="mt-6 grid grid-cols-1 gap-4 border-t border-border pt-6 sm:grid-cols-2">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#DBEBEC] text-[#0C787E]">
                  <CheckBadgeIcon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{completedCount}</p>
                  <p className="text-xs text-muted">{t.hero.completedLabel}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary">
                  <PulseIcon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{activeCount}</p>
                  <p className="text-xs text-muted">{t.hero.activeLabel}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

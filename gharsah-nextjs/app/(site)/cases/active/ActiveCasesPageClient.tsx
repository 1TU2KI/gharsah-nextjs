"use client";

import { useMemo, useState } from "react";
import CampaignCard from "@/app/components/home/CampaignCard";
import OpeningVerse from "@/app/components/home/OpeningVerse";
import EmptyState from "@/app/components/ui/EmptyState";
import { HeartIcon } from "@/app/components/home/icons";
import SortDropdown from "@/app/components/cases/SortDropdown";
import { useLanguage } from "@/app/lib/i18n/LanguageProvider";
import type { Campaign } from "@/app/lib/campaigns";

/**
 * /cases/active-only sort control (see t.cases.sortLabel/sortOptions).
 * Deliberately scoped to this one page/component — completed cases, Almost
 * There, the homepage preview grid, overlay, and admin all render their own
 * campaign lists independently and are untouched by this.
 *
 * Exactly the 4 requested modes, no generic "default" option — the page
 * itself defaults to `dateDesc` (newest added first) below, so a visitor
 * never has to pick a mode manually just to see a meaningful order.
 */
type SortMode = "percentDesc" | "percentAsc" | "dateDesc" | "dateAsc";

/**
 * Campaigns missing a live `percent` (non-Ehsan platforms, or a failed live
 * fetch — see campaignLiveSync.ts) are always pushed to the end, in both
 * directions, rather than guessed as 0% or 100% — sorting must only ever
 * use real data.
 */
function sortActiveCampaigns(campaigns: Campaign[], mode: SortMode): Campaign[] {
  const sorted = [...campaigns];
  switch (mode) {
    case "percentDesc":
      sorted.sort((a, b) => {
        if (a.percent === undefined) return b.percent === undefined ? 0 : 1;
        if (b.percent === undefined) return -1;
        return b.percent - a.percent;
      });
      break;
    case "percentAsc":
      sorted.sort((a, b) => {
        if (a.percent === undefined) return b.percent === undefined ? 0 : 1;
        if (b.percent === undefined) return -1;
        return a.percent - b.percent;
      });
      break;
    case "dateDesc":
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      break;
    case "dateAsc":
      sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      break;
  }
  return sorted;
}

export default function ActiveCasesPageClient({ campaigns }: { campaigns: Campaign[] }) {
  const { t, locale } = useLanguage();
  const [sortMode, setSortMode] = useState<SortMode>("dateDesc");
  const sortedCampaigns = useMemo(() => sortActiveCampaigns(campaigns, sortMode), [campaigns, sortMode]);

  return (
    <main className="flex-1">
      <section className="relative overflow-x-hidden py-16">
        <div className="relative z-10 mx-auto max-w-6xl px-6">
          <div>
            <OpeningVerse
              verse="﴿ لَنْ تَنَالُوا الْبِرَّ حَتَّى تُنْفِقُوا مِمَّا تُحِبُّونَ ۚ وَمَا تُنْفِقُوا مِن شَيْءٍ فَإِنَّ اللَّهَ بِهِ عَلِيمٌ ﴾"
              reference="سورة آل عمران، الآية 92"
              translation="Never will you attain the good [reward] until you spend [in the way of Allah] from that which you love. And whatever you spend - indeed, Allah is Knowing of it."
              referenceEn="Aal-Imran, Verse 92"
            />

            <div className="mt-12 text-center">
              <h1
                className={`text-3xl font-extrabold text-foreground sm:text-4xl ${locale === "en" ? "tracking-tight" : ""}`}
              >
                {t.cases.activeHeading}
              </h1>
              <p className="mx-auto mt-3 max-w-xl text-muted">{t.cases.activeDescription}</p>
              <p className="mt-3 text-xs font-semibold text-muted">{t.cases.countLabel(campaigns.length)}</p>
            </div>
          </div>

          {/* The random-campaign pick moved into the shared site Header
              (see Header.tsx) — this row is now just the sort control,
              end-aligned (the LEFT edge in this site's RTL layout) above
              the grid, matching the grid's own max-w-6xl/px-6 container. */}
          {campaigns.length > 0 && (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2 sm:justify-end">
              <SortDropdown<SortMode>
                label={t.cases.sortLabel}
                value={sortMode}
                onChange={setSortMode}
                options={[
                  { value: "percentDesc", label: t.cases.sortOptions.percentDesc },
                  { value: "percentAsc", label: t.cases.sortOptions.percentAsc },
                  { value: "dateDesc", label: t.cases.sortOptions.dateDesc },
                  { value: "dateAsc", label: t.cases.sortOptions.dateAsc },
                ]}
              />
            </div>
          )}

          {campaigns.length > 0 ? (
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {sortedCampaigns.map((campaign) => (
                <CampaignCard key={campaign.slug} campaign={campaign} />
              ))}
            </div>
          ) : (
            <div className="mt-12">
              <EmptyState icon={HeartIcon} title={t.cases.emptyActiveTitle} message={t.cases.emptyActiveMessage} />
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

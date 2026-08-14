"use client";

import CampaignCard from "@/app/components/home/CampaignCard";
import OpeningVerse from "@/app/components/home/OpeningVerse";
import EmptyState from "@/app/components/ui/EmptyState";
import { HeartIcon } from "@/app/components/home/icons";
import SectionBackdrop from "@/app/components/decor/SectionBackdrop";
import RandomCaseButton from "@/app/components/cases/RandomCaseButton";
import { useLanguage } from "@/app/lib/i18n/LanguageProvider";
import type { Campaign } from "@/app/lib/campaigns";

export default function ActiveCasesPageClient({ campaigns }: { campaigns: Campaign[] }) {
  const { t, locale } = useLanguage();

  return (
    <main className="flex-1">
      <section className="relative overflow-x-hidden py-16">
        <SectionBackdrop tone="green" />

        <div className="relative z-10 mx-auto max-w-6xl px-6">
          {/* `relative` scopes RandomCaseButton's lg:absolute floating
              position to just this intro block's own bottom edge, not the
              whole (card-count-dependent) section height — so it can never
              drift into the grid or the footer regardless of how many
              campaigns are listed below. */}
          <div className="relative">
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

            <RandomCaseButton campaigns={campaigns} />
          </div>

          {campaigns.length > 0 ? (
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {campaigns.map((campaign) => (
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

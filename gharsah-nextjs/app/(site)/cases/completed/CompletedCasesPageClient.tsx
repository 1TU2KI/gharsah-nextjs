"use client";

import CampaignCard from "@/app/components/home/CampaignCard";
import OpeningVerse from "@/app/components/home/OpeningVerse";
import EmptyState from "@/app/components/ui/EmptyState";
import { CheckBadgeIcon } from "@/app/components/home/icons";
import SectionBackdrop from "@/app/components/decor/SectionBackdrop";
import { useLanguage } from "@/app/lib/i18n/LanguageProvider";
import type { Campaign } from "@/app/lib/campaigns";

export default function CompletedCasesPageClient({ campaigns }: { campaigns: Campaign[] }) {
  const { t, locale } = useLanguage();

  return (
    <main className="flex-1">
      <section className="relative overflow-x-hidden py-16">
        <SectionBackdrop tone="teal" />

        <div className="relative z-10 mx-auto max-w-6xl px-6">
          <OpeningVerse
            verse="﴿ وَمَا تُنْفِقُوا مِن شَيْءٍ فَإِنَّ اللَّهَ بِهِ عَلِيمٌ ﴾"
            reference="سورة آل عمران، الآية 92"
            translation="And whatever you spend - indeed, Allah is Knowing of it."
            referenceEn="Aal-Imran, Verse 92"
          />

          <div className="mt-12 text-center">
            <h1
              className={`text-3xl font-extrabold text-foreground sm:text-4xl ${locale === "en" ? "tracking-tight" : ""}`}
            >
              {t.cases.completedHeading}
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-muted">{t.cases.completedDescription}</p>
            <p className="mt-3 text-xs font-semibold text-muted">{t.cases.countLabel(campaigns.length)}</p>
          </div>

          {campaigns.length > 0 ? (
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {campaigns.map((campaign) => (
                <CampaignCard key={campaign.slug} campaign={campaign} />
              ))}
            </div>
          ) : (
            <div className="mt-12">
              <EmptyState
                icon={CheckBadgeIcon}
                title={t.cases.emptyCompletedTitle}
                message={t.cases.emptyCompletedMessage}
                tone="blue"
              />
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

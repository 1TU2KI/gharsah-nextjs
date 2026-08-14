"use client";

import Link from "next/link";
import CampaignCard from "./CampaignCard";
import EmptyState from "../ui/EmptyState";
import { CheckBadgeIcon } from "./icons";
import SectionBackdrop from "../decor/SectionBackdrop";
import { useLanguage } from "../../lib/i18n/LanguageProvider";
import type { Campaign } from "../../lib/campaigns";

export default function CompletedCasesSectionClient({
  campaigns,
  totalCount,
}: {
  campaigns: Campaign[];
  totalCount: number;
}) {
  const { t, locale } = useLanguage();

  return (
    <section className="relative overflow-x-hidden py-20">
      <SectionBackdrop tone="teal" />

      <div className="relative z-10 mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="text-center sm:text-start">
            <h2
              className={`text-3xl font-extrabold text-foreground sm:text-4xl ${locale === "en" ? "tracking-tight" : ""}`}
            >
              {t.cases.completedHeading}
            </h2>
            <p className="mt-2 text-muted">{t.cases.completedDescription}</p>
            <p className="mt-2 text-xs font-semibold text-muted">{t.cases.countLabel(totalCount)}</p>
          </div>
          <Link
            href="/cases/completed"
            className="rounded-full border border-[#0C787E]/30 bg-background px-6 py-2.5 text-sm font-semibold text-[#0C787E] transition-colors hover:bg-[#E7F2F2]"
          >
            {t.cases.viewAllCompleted}
          </Link>
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
  );
}

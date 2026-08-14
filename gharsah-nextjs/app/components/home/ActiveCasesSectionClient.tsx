"use client";

import Link from "next/link";
import CampaignCard from "./CampaignCard";
import EmptyState from "../ui/EmptyState";
import { HeartIcon } from "./icons";
import SectionBackdrop from "../decor/SectionBackdrop";
import { useLanguage } from "../../lib/i18n/LanguageProvider";
import type { Campaign } from "../../lib/campaigns";

export default function ActiveCasesSectionClient({
  campaigns,
  totalCount,
}: {
  campaigns: Campaign[];
  totalCount: number;
}) {
  const { t, locale } = useLanguage();

  return (
    <section className="relative overflow-x-hidden py-20">
      <SectionBackdrop tone="green" />

      <div className="relative z-10 mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="text-center sm:text-start">
            <h2
              className={`text-3xl font-extrabold text-foreground sm:text-4xl ${locale === "en" ? "tracking-tight" : ""}`}
            >
              {t.cases.activeHeading}
            </h2>
            <p className="mt-2 text-muted">{t.cases.activeDescription}</p>
            <p className="mt-2 text-xs font-semibold text-muted">{t.cases.countLabel(totalCount)}</p>
          </div>
          <Link
            href="/cases/active"
            className="rounded-full border border-primary/30 bg-background px-6 py-2.5 text-sm font-semibold text-primary-dark transition-colors hover:bg-primary-50"
          >
            {t.cases.viewAllActive}
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
            <EmptyState icon={HeartIcon} title={t.cases.emptyActiveTitle} message={t.cases.emptyActiveMessage} />
          </div>
        )}
      </div>
    </section>
  );
}

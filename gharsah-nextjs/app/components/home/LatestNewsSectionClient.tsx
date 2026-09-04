"use client";

import Link from "next/link";
import NewsItemCard from "@/app/components/news/NewsItemCard";
import { useLanguage } from "../../lib/i18n/LanguageProvider";
import type { PublicNewsItem } from "../../lib/news/data";

/**
 * Homepage preview of the "الأخبار" feed — at most 3 items (enforced by the
 * server-side fetch in LatestNewsSection.tsx, never sliced here), with a
 * "عرض جميع التحديثات ←" link to the full `/updates` page. Same
 * heading/CTA layout convention as AlmostThereSectionClient.tsx.
 */
export default function LatestNewsSectionClient({ items }: { items: PublicNewsItem[] }) {
  const { t } = useLanguage();

  return (
    <section className="relative overflow-x-hidden py-20">
      <div className="relative z-10 mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="text-center sm:text-start">
            <h2 className="text-3xl font-extrabold text-foreground sm:text-4xl">{t.news.homeHeading}</h2>
            <p className="mt-2 max-w-xl text-muted">{t.news.homeDescription}</p>
          </div>
          <Link
            href="/updates"
            className="rounded-full border border-primary/30 bg-background px-6 py-2.5 text-sm font-semibold text-primary-dark transition-colors hover:bg-primary-50"
          >
            {t.news.viewAll}
          </Link>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {items.map((item) => (
            <NewsItemCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}

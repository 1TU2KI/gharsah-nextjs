"use client";

import NewsItemCard from "@/app/components/news/NewsItemCard";
import { useLanguage } from "@/app/lib/i18n/LanguageProvider";
import type { PublicNewsItem } from "@/app/lib/news/data";

/**
 * Page shell for `/updates` — same pattern as `/about`/`/overlay` (centered
 * heading over the shared global background, real content below).
 * Deliberately a single-column chronological list, not a "newspaper" layout — this is
 * meant to read as an activity/update timeline, per the brief.
 */
export default function UpdatesPageClient({ items }: { items: PublicNewsItem[] }) {
  const { t } = useLanguage();

  return (
    <main className="flex-1">
      <section className="relative overflow-x-hidden py-16">
        <div className="relative z-10 mx-auto max-w-3xl px-6">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold text-foreground sm:text-4xl">{t.news.pageHeading}</h1>
            <p className="mx-auto mt-3 max-w-xl text-muted">{t.news.pageDescription}</p>
          </div>

          <div className="mt-10 space-y-4">
            {items.length === 0 ? (
              <p className="rounded-2xl border border-border bg-background/80 p-8 text-center text-sm text-muted">{t.news.emptyMessage}</p>
            ) : (
              items.map((item) => <NewsItemCard key={item.id} item={item} />)
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

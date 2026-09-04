"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import { CheckBadgeIcon, ExternalLinkIcon, LeafIcon, WarningIcon, WrenchIcon, CodeIcon, MegaphoneIcon } from "@/app/components/home/icons";
import { NEWS_TYPE_META } from "@/app/lib/news/presentation";
import { useLanguage } from "@/app/lib/i18n/LanguageProvider";
import type { PublicNewsItem } from "@/app/lib/news/data";
import { formatLocaleDate } from "@/app/lib/dateFormat";

const TYPE_ICON: Record<PublicNewsItem["type"], ComponentType<{ className?: string }>> = {
  campaign_completed: CheckBadgeIcon,
  campaign_added: LeafIcon,
  urgent: WarningIcon,
  maintenance: WrenchIcon,
  dev_update: CodeIcon,
  general: MegaphoneIcon,
};

function formatDate(iso: string, locale: "ar" | "en"): string {
  return formatLocaleDate(iso, locale, { dateStyle: "medium", timeStyle: "short" });
}

/**
 * One shared presentational card for a single news/update item — used by
 * both the full `/updates` feed and the homepage "آخر التحديثات" preview
 * (never a second/duplicated card implementation). Themed per `item.type`
 * via NEWS_TYPE_META (mirrors CampaignCard.tsx's own `statusTheme`
 * pattern). Manual post text (`bodyAr`/`titleAr`) is rendered EXACTLY as
 * the admin wrote it regardless of locale — `bodyEn`/`titleEn` are only
 * ever populated for automatic campaign events (see NewsItemRow's own
 * comment), so falling back to the Arabic text in English mode is the
 * correct behavior for manual posts, not a bug.
 */
export default function NewsItemCard({ item }: { item: PublicNewsItem }) {
  const { locale, t } = useLanguage();
  const meta = NEWS_TYPE_META[item.type];
  const Icon = TYPE_ICON[item.type];
  const title = (locale === "ar" ? item.titleAr : item.titleEn) || (locale === "ar" ? meta.labelAr : meta.labelEn);
  // `bodyEn` is only ever set for automatic campaign events — a manual
  // post's `bodyEn` is always null, so this correctly falls back to the
  // Arabic text verbatim in English mode for manual posts (never translated).
  const body = locale === "en" && item.bodyEn ? item.bodyEn : item.bodyAr;

  return (
    <article className={`relative flex h-full flex-col overflow-hidden rounded-2xl border p-5 backdrop-blur-sm transition-all ${meta.themeClass}`}>
      {/* Large decorative category watermark — centered behind everything
          else (negative z-index, see globals.css), absolutely positioned
          so it never affects card height/spacing, and purely decorative
          (`pointer-events-none`, `aria-hidden`) — never a second category
          label, just a subtle brand-colored emblem in the background. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
        <Icon className={`news-watermark-icon ${meta.watermarkClass}`} />
      </div>

      {/* The ONE category indicator on this card — icon + name, reusing
          the same small circular-chip language previously used only at
          the bottom, now the sole indicator (top badge removed per the
          brief: no category should ever appear twice on one card). */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5">
          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${meta.badgeClass}`}>
            <Icon className="h-3.5 w-3.5" />
          </span>
          <span className="text-xs font-semibold text-foreground">{locale === "ar" ? meta.labelAr : meta.labelEn}</span>
        </span>
        <span className="text-[11px] text-muted">{formatDate(item.createdAt, locale)}</span>
      </div>

      <h3 className="mt-3 text-base font-bold text-foreground">{title}</h3>
      <p className="mt-1.5 flex-1 whitespace-pre-line text-sm leading-6 text-foreground/80">{body}</p>

      {item.link &&
        (item.linkIsExternal ? (
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 self-start text-sm font-semibold text-primary-dark transition-colors hover:underline"
          >
            {t.news.viewCampaign}
            <ExternalLinkIcon className="h-3.5 w-3.5" />
          </a>
        ) : (
          <Link href={item.link} className="mt-3 inline-flex items-center gap-1.5 self-start text-sm font-semibold text-primary-dark transition-colors hover:underline">
            {t.news.viewCampaign}
            <ExternalLinkIcon className="h-3.5 w-3.5" />
          </Link>
        ))}
    </article>
  );
}

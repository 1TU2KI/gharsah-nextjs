import type { ManualNewsType, NewsType } from "@/app/lib/db/newsRepo";

/**
 * All type-dependent visual/label metadata in one place — mirrors
 * CampaignCard.tsx's own `statusTheme` lookup-object pattern (never
 * scattered per-type conditionals). `themeClass`/`badgeClass` reference
 * named classes in globals.css (`.news-card--*`/`.news-badge--*`), since
 * blue/red/yellow aren't part of Gharsah's green/turquoise brand palette
 * and need their own hand-tuned light/dark-safe colors, unlike the
 * existing green-only brand tokens.
 */
export type NewsTypeMeta = {
  labelAr: string;
  labelEn: string;
  themeClass: string;
  badgeClass: string;
  /** Named class in globals.css (`.news-watermark-icon--*`) controlling the large decorative background icon's color/opacity — see NewsItemCard.tsx. */
  watermarkClass: string;
};

export const NEWS_TYPE_META: Record<NewsType, NewsTypeMeta> = {
  campaign_completed: {
    labelAr: "اكتملت حالة",
    labelEn: "Case Completed",
    themeClass: "news-card news-card--completed",
    badgeClass: "news-badge news-badge--completed",
    watermarkClass: "news-watermark-icon--completed",
  },
  campaign_added: {
    labelAr: "حالة جديدة",
    labelEn: "New Case",
    themeClass: "news-card news-card--added",
    badgeClass: "news-badge news-badge--added",
    watermarkClass: "news-watermark-icon--added",
  },
  urgent: {
    labelAr: "عاجل",
    labelEn: "Breaking",
    themeClass: "news-card news-card--urgent",
    badgeClass: "news-badge news-badge--urgent",
    watermarkClass: "news-watermark-icon--urgent",
  },
  maintenance: {
    labelAr: "صيانة",
    labelEn: "Maintenance",
    themeClass: "news-card news-card--maintenance",
    badgeClass: "news-badge news-badge--maintenance",
    watermarkClass: "news-watermark-icon--maintenance",
  },
  // Deliberately the SAME theme/badge/watermark classes as "maintenance"
  // (shared yellow/black visual family, per the brief) — kept as a fully
  // separate `NewsType` value rather than a sub-field of one "maintenance"
  // type, so Admin/the public feed can filter and label them independently.
  dev_update: {
    labelAr: "تحديث من المطور",
    labelEn: "Developer Update",
    themeClass: "news-card news-card--maintenance",
    badgeClass: "news-badge news-badge--maintenance",
    watermarkClass: "news-watermark-icon--maintenance",
  },
  general: {
    labelAr: "تحديث",
    labelEn: "Update",
    themeClass: "news-card news-card--general",
    badgeClass: "news-badge news-badge--general",
    watermarkClass: "news-watermark-icon--general",
  },
};

/** The 4 manually-creatable types, in the order shown in the admin "نوع التحديث" selector. */
export const MANUAL_NEWS_TYPE_OPTIONS: { value: ManualNewsType; label: string }[] = [
  { value: "urgent", label: "عاجل" },
  { value: "maintenance", label: "صيانة" },
  { value: "dev_update", label: "تحديث من المطور" },
  { value: "general", label: "تحديث عام" },
];

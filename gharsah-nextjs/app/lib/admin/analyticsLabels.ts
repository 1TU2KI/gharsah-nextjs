/** Shared Arabic display labels for raw analytics values — used by both the main Statistics page and its per-metric drilldowns (`statistics/[metric]/page.tsx`), so the two never drift out of sync. */

export const ROUTE_LABEL: Record<string, string> = {
  "/": "الرئيسية",
  "/cases/active": "الحالات النشطة",
  "/cases/completed": "الحالات المكتملة",
  "/about": "عن غرسة",
  "/contact": "تواصل معنا",
  "/terms": "الشروط والأحكام",
};

export const NAV_LABEL: Record<string, string> = {
  home: "الرئيسية",
  activeCases: "الحالات النشطة",
  completedCases: "الحالات المكتملة",
  about: "عن غرسة",
  terms: "الشروط والأحكام",
  contact: "تواصل معنا",
  donateNow: "تبرع الآن",
};

export const REFERRER_LABEL: Record<string, string> = {
  direct: "مباشر",
  internal: "داخلي",
  google: "Google",
  bing: "Bing",
  duckduckgo: "DuckDuckGo",
  instagram: "Instagram",
  twitter_x: "X (Twitter)",
  discord: "Discord",
  facebook: "Facebook",
  whatsapp: "WhatsApp",
  tiktok: "TikTok",
  snapchat: "Snapchat",
  telegram: "Telegram",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  other: "مصادر أخرى",
};

export const DEVICE_LABEL: Record<string, string> = { desktop: "حاسوب", mobile: "جوال", tablet: "لوحي" };

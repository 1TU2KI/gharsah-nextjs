import { listCampaignRows, type CampaignRow } from "./db/campaignsRepo";
import { getPlatforms } from "./db/settings";

/**
 * Public read API for campaign data — used by every visitor-facing page
 * (homepage, /cases/active, /cases/completed, campaign detail pages,
 * random-case selection). The actual source of truth is the SQLite
 * database (`app/lib/db/campaignsRepo.ts`), managed entirely through the
 * admin dashboard; this file only maps DB rows to the shape the public
 * components already expect, so none of them needed to change when
 * campaigns moved off a hardcoded array (see `app/lib/db/seed.ts` for the
 * one-time migration of the original static dataset).
 *
 * `getCampaigns()`/`getCampaignBySlug()` stay synchronous on purpose —
 * `node:sqlite` is synchronous, and `generateStaticParams` in
 * `[slug]/page.tsx` calls `getCampaigns()` directly (not awaited), so this
 * preserved every existing call site without changes.
 *
 * IMPORTANT — this module must never be *value*-imported by a "use client"
 * component. It (transitively, via campaignsRepo/settings) imports
 * `node:sqlite`; a client component importing a real export from here pulls
 * that whole chain into the browser bundle, which Turbopack can't build
 * ("chunking context does not support external modules"). Client components
 * (CampaignCard, CampaignDetailClient) must only ever do
 * `import type { Campaign } from "./campaigns"` — fully erased at compile
 * time — and read pre-resolved fields off the `Campaign` object (see
 * `platformLabel`/`platformLogo`/`platformHomepageUrl` below) instead of
 * calling a platform-lookup function themselves.
 */
export type CampaignStatus = "active" | "completed" | "closed";

export type LocalizedText = {
  ar: string;
  en: string;
};

export type Campaign = {
  /** The campaign's stable DB primary key — used only to key analytics events (see app/lib/analytics/), never rendered or exposed in a URL. Plain data threaded through server-side like `platformLabel` below, so this is safe for client components to read despite the "no value-imports from this module" rule in the doc comment above. */
  id: string;
  slug: string;
  order: number;
  url: string;
  platform: string;
  /** Omit for campaigns that don't follow the "رحمه/رحمها الله" memorial pattern (e.g. community/organization campaigns) — relation is then shown plainly on its own. */
  memorialPrefix?: LocalizedText;
  username?: string;
  relation: LocalizedText;
  title: LocalizedText;
  status: CampaignStatus;
  /**
   * `ar` is sync-only — only ever set by a successful live fetch. `en` is
   * always the manually-authored translation stored in the database, since
   * there is no live English source.
   */
  description: {
    ar?: string;
    en: string;
  };
  /** Sync-only, 0-100. Only set once a live fetch succeeds. */
  percent?: number;
  /**
   * Resolved once, server-side, from the admin-editable platforms setting
   * (Settings → منصات التبرع) — see the module doc comment above for why
   * client components read these instead of calling a lookup function.
   */
  platformLabel: LocalizedText;
  platformLogo: string | null;
  platformHomepageUrl: string;
};

function rowToCampaign(row: CampaignRow): Campaign {
  const platformConfig = getPlatforms().find((p) => p.value === row.platform);

  return {
    id: row.id,
    slug: row.slug,
    order: row.order_index,
    url: row.url,
    platform: row.platform,
    memorialPrefix:
      row.memorial_prefix_ar && row.memorial_prefix_en
        ? { ar: row.memorial_prefix_ar, en: row.memorial_prefix_en }
        : undefined,
    username: row.username ?? undefined,
    relation: { ar: row.relation_ar, en: row.relation_en },
    title: { ar: row.title_ar, en: row.title_en },
    status: row.status,
    description: { ar: row.description_ar ?? undefined, en: row.description_en },
    percent: row.percent ?? undefined,
    platformLabel: platformConfig ? { ar: platformConfig.labelAr, en: platformConfig.labelEn } : { ar: row.platform, en: row.platform },
    platformLogo: platformConfig?.logo ?? null,
    platformHomepageUrl: platformConfig?.homepageUrl ?? row.platform,
  };
}

export function getCampaigns(): Campaign[] {
  return listCampaignRows().map(rowToCampaign);
}

export function getCampaignBySlug(slug: string): Campaign | undefined {
  return getCampaigns().find((c) => c.slug === slug);
}

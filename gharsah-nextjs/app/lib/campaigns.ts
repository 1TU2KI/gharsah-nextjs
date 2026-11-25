import { listCampaignRows, type CampaignRow } from "./db/campaignsRepo";
import { getPlatforms } from "./db/settings";
import { fallbackEnglishTitle, isValidEnglish } from "./translation/arabic";
import { fieldStatus, isLiveReplaceable, isTranslated, parseManual, parseMeta, type TranslatedField } from "./translation/meta";

/**
 * The English the public site may show for one field: only English that
 * belongs to the CURRENT Arabic (a current translation, or English an admin
 * typed). Stale English — saved for an older Arabic text, e.g. while a new
 * translation failed or awaits review — is kept in the database but not
 * shown, so a campaign is never displayed with another person's name.
 * Hand-written English with no Arabic counterpart (older descriptions) is shown.
 */
function displayableEnglish(row: CampaignRow): Record<TranslatedField, string> {
  const manual = parseManual(row.translation_manual);
  const meta = parseMeta(row.translation_meta);
  const pick = (field: TranslatedField, arabic: string | null, english: string): string => {
    const status = fieldStatus(arabic, english, manual.has(field), meta[field]);
    if (status === "none") return isValidEnglish(english) ? english : "";
    return isTranslated(status) ? english : "";
  };
  return {
    title: pick("title", row.title_ar, row.title_en),
    relation: pick("relation", row.relation_ar, row.relation_en),
    description: pick("description", row.description_ar, row.description_en),
  };
}

function liveReplaceable(row: CampaignRow, shown: Record<TranslatedField, string>): ("title" | "description")[] {
  const manual = parseManual(row.translation_manual);
  const meta = parseMeta(row.translation_meta);
  return (["title", "description"] as const).filter((field) => isLiveReplaceable(shown[field], manual.has(field), meta[field]));
}

/**
 * Public read API for campaign data — used by every visitor-facing page
 * (homepage, /cases/active, /cases/completed, campaign detail pages,
 * random-case selection). The actual source of truth is the Postgres
 * database (`app/lib/db/campaignsRepo.ts`), managed entirely through the
 * admin dashboard; this file only maps DB rows to the shape the public
 * components already expect, so none of them needed to change when
 * campaigns moved off a hardcoded array (see `app/lib/db/seed.ts` for the
 * one-time migration of the original static dataset).
 *
 * `getCampaigns()`/`getCampaignBySlug()` are async — the Neon Postgres
 * driver is HTTP-based and asynchronous, so every caller (including
 * `generateStaticParams` in `[slug]/page.tsx`, which Next.js supports as an
 * async function) awaits these.
 *
 * IMPORTANT — this module must never be *value*-imported by a "use client"
 * component. It (transitively, via campaignsRepo/settings) imports
 * server-only database code; a client component importing a real export
 * from here pulls that whole chain into the browser bundle, which
 * Turbopack can't build ("chunking context does not support external
 * modules"). Client components (CampaignCard, CampaignDetailClient) must
 * only ever do `import type { Campaign } from "./campaigns"` — fully
 * erased at compile time — and read pre-resolved fields off the `Campaign`
 * object (see `platformLabel`/`platformLogo`/`platformHomepageUrl` below)
 * instead of calling a platform-lookup function themselves.
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
  /** Compact public redirect code for gharsah.sa/c/<code> (see app/c/[code]/route.ts) — never null in practice (backfilled for every campaign on startup), typed nullable only because the DB column technically allows it for the brief instant before that backfill runs. */
  shortCode: string | null;
  /** Fields whose English live sync may swap for a cached translation of changed live Arabic (see isLiveReplaceable) — never hand-typed, reviewed or hand-authored English. */
  liveReplaceableEnglish?: ("title" | "description")[];
  /** ISO timestamp of the row's real DB `created_at` — i.e. when the campaign was actually added to Gharsah, not when it was last edited. Exposed only for the /cases/active sort-by-date-added control; not otherwise rendered anywhere. */
  createdAt: string;
  /** Recorded completion time; older campaigns may have no known date. */
  completedAt?: string | null;
};

async function rowToCampaign(row: CampaignRow): Promise<Campaign> {
  const platforms = await getPlatforms();
  const shown = displayableEnglish(row);
  const platformConfig = platforms.find((p) => p.value === row.platform);

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
    // English mode never shows Arabic (or a URL): until valid English exists
    // the title uses a neutral English fallback and the subtitle/description
    // are simply left out. Older rows may still hold Arabic in *_en columns
    // (from a previous translator) — isValidEnglish screens those out too.
    relation: { ar: row.relation_ar, en: shown.relation },
    title: { ar: row.title_ar, en: shown.title || fallbackEnglishTitle(row.title_ar) },
    status: row.status,
    description: { ar: row.description_ar ?? undefined, en: shown.description },
    liveReplaceableEnglish: liveReplaceable(row, shown),
    percent: row.percent ?? undefined,
    platformLabel: platformConfig ? { ar: platformConfig.labelAr, en: platformConfig.labelEn } : { ar: row.platform, en: row.platform },
    platformLogo: platformConfig?.logo ?? null,
    platformHomepageUrl: platformConfig?.homepageUrl ?? row.platform,
    shortCode: row.short_code,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

export async function getCampaigns(): Promise<Campaign[]> {
  const rows = await listCampaignRows();
  return Promise.all(rows.map(rowToCampaign));
}

export async function getCampaignBySlug(slug: string): Promise<Campaign | undefined> {
  const campaigns = await getCampaigns();
  return campaigns.find((c) => c.slug === slug);
}

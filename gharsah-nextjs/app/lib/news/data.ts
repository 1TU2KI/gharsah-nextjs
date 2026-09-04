import { listPublishedNewsItems, type NewsItemRow, type NewsSource, type NewsType } from "@/app/lib/db/newsRepo";
import { getCampaignRowById } from "@/app/lib/db/campaignsRepo";

/**
 * One public-facing news item, already resolved to plain display data — the
 * public `/updates` page and the homepage "آخر التحديثات" preview both read
 * this shape, never the raw `NewsItemRow` directly (so neither has to know
 * about DB integer-boolean encoding or re-resolve a campaign link itself).
 */
export type PublicNewsItem = {
  id: string;
  type: NewsType;
  source: NewsSource;
  titleAr: string | null;
  titleEn: string | null;
  bodyAr: string;
  /** Always null for manual posts — see NewsItemRow's own comment. */
  bodyEn: string | null;
  createdAt: string;
  /** Resolved fresh on every read (never stored) — a custom admin-provided
   * URL wins if set, otherwise an automatic campaign event links to its
   * campaign ONLY if that campaign still exists and isn't archived, per
   * "link to the campaign if it is still publicly accessible". `null` means
   * no link at all — the post still renders with its own title/body. */
  link: string | null;
  /** True when `link` points off-site (a manual post's custom URL can be anything); automatic campaign links are always internal. */
  linkIsExternal: boolean;
};

async function resolveLink(row: NewsItemRow): Promise<{ link: string | null; external: boolean }> {
  if (row.custom_url) {
    return { link: row.custom_url, external: !row.custom_url.startsWith("/") };
  }
  if (!row.campaign_id) return { link: null, external: false };

  // Same single detail route every other public page links a campaign to
  // (see CampaignCard.tsx) — there is no separate /cases/completed/[slug]
  // route, active and completed campaigns share this one.
  const campaign = await getCampaignRowById(row.campaign_id);
  if (!campaign || campaign.archived_at) return { link: null, external: false };
  return { link: `/cases/active/${campaign.slug}`, external: false };
}

async function toPublicNewsItem(row: NewsItemRow): Promise<PublicNewsItem> {
  const { link, external } = await resolveLink(row);
  return {
    id: row.id,
    type: row.type,
    source: row.source,
    titleAr: row.title_ar,
    titleEn: row.title_en,
    bodyAr: row.body_ar,
    bodyEn: row.body_en,
    createdAt: row.created_at,
    link,
    linkIsExternal: external,
  };
}

/** `limit` omitted → full `/updates` feed; `limit: 3` → homepage preview. Both go through this one function, never a duplicated query/resolution path. */
export async function getPublicNewsFeed(limit?: number): Promise<PublicNewsItem[]> {
  const rows = await listPublishedNewsItems(limit);
  return Promise.all(rows.map(toPublicNewsItem));
}

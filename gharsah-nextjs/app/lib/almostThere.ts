import type { Campaign } from "./campaigns";
import { getActiveCampaignsLive } from "./campaignLiveSync";

/**
 * "اقتربت..." ranking: the ACTIVE campaigns closest to completion, sourced
 * entirely from the same live-synced data ActiveCasesSection already fetches
 * (see campaignLiveSync.ts) — no separate fetch, no manually maintained
 * list. `getActiveCampaignsLive()` already filters to live-resolved
 * "active" status, so a campaign that crosses into "completed" (whether via
 * the achievement banner or reaching 100%, see campaignLiveSync.ts) simply
 * stops appearing here on its own on the next call, automatically replaced
 * by whichever active campaign is next closest — nothing to update by hand.
 *
 * Campaigns with no known percent are excluded rather than treated as 0% (a
 * missing value isn't "far from completion," it's just unknown) — same
 * "never fabricate" rule the rest of the analytics/admin pages follow. If
 * fewer than `limit` campaigns qualify, only the ones that do are returned —
 * never padded with placeholders.
 */
export async function getAlmostThereCampaigns(limit = 3): Promise<Campaign[]> {
  const rankable = await getRankableActiveCampaigns();
  return rankable.sort((a, b) => (b.percent ?? 0) - (a.percent ?? 0)).slice(0, limit);
}

/**
 * The inverse of getAlmostThereCampaigns — active campaigns with the
 * LOWEST completion percentage first, for the overlay's "أقل 3 حالات
 * اكتمالاً" mode (see app/lib/overlay/resolveCampaigns.ts). Same
 * eligibility rule as "اقتربت..." (active status, known percent only) via
 * the shared getRankableActiveCampaigns() below — only the sort direction
 * differs, so the two rankings can never drift apart on what counts as
 * "eligible."
 */
export async function getLowestProgressCampaigns(limit = 3): Promise<Campaign[]> {
  const rankable = await getRankableActiveCampaigns();
  return rankable.sort((a, b) => (a.percent ?? 0) - (b.percent ?? 0)).slice(0, limit);
}

/** Active campaigns with a known percent — the one shared eligibility filter both getAlmostThereCampaigns and getLowestProgressCampaigns sort in opposite directions. A missing percent is excluded rather than treated as 0 (unknown isn't "closest" or "furthest" from anything). */
async function getRankableActiveCampaigns(): Promise<Campaign[]> {
  const active = await getActiveCampaignsLive();
  return active.filter((c) => c.percent !== undefined);
}

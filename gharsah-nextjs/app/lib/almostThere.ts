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
  const active = await getActiveCampaignsLive();
  return active
    .filter((c) => c.percent !== undefined)
    .sort((a, b) => (b.percent ?? 0) - (a.percent ?? 0))
    .slice(0, limit);
}

import type { Campaign } from "@/app/lib/campaigns";
import { getAlmostThereCampaigns, getLowestProgressCampaigns } from "@/app/lib/almostThere";
import { getActiveCampaignsLive } from "@/app/lib/campaignLiveSync";
import type { OverlayMode } from "./queryParams";

/**
 * The ONE place all 4 overlay display modes are actually decided — used by
 * both buildOverlayResponse() (every real poll/render) and, indirectly, the
 * "اختيار حالات محددة" picker's own list on `/overlay` (which reads the
 * same `getActiveCampaignsLive()` this file uses, see that page's server
 * component) — never a second/duplicated campaign list or ranking
 * implementation anywhere.
 *
 * All 4 modes are ACTIVE-campaigns-only, via the SAME live-resolved status
 * check (`getActiveCampaignsLive()` — already excludes archived campaigns
 * and resolves live-synced status, not just the manually-set DB field, so a
 * campaign that just crossed to "completed" is excluded here the instant it
 * would be everywhere else too):
 * - "near": unchanged existing "اقتربت..." ranking (getAlmostThereCampaigns).
 * - "lowest": the inverse ranking (getLowestProgressCampaigns) — active
 *   campaigns, LOWEST percent first.
 * - "all": every currently active public campaign, no count limit.
 * - "selected": only the ACTIVE campaigns whose slug is in `selectedSlugs`,
 *   in the order given. A slug that doesn't match any real ACTIVE campaign
 *   — whether it never existed, or the campaign it once named has since
 *   completed — is dropped silently (never surfaced as an error on
 *   stream), so a manually-selected campaign automatically stops appearing
 *   the moment it's no longer active, even though the URL still names it.
 *   If NONE of the requested slugs match anything active (or none were
 *   given at all), this safely falls back to "near" rather than showing an
 *   empty overlay from a bad/stale URL.
 */
export async function resolveOverlayCampaigns(mode: OverlayMode, selectedSlugs: string[], count: number): Promise<Campaign[]> {
  switch (mode) {
    case "selected": {
      if (selectedSlugs.length === 0) return getAlmostThereCampaigns(count);
      const active = await getActiveCampaignsLive();
      const bySlug = new Map(active.map((c) => [c.slug, c]));
      const matched = selectedSlugs.map((slug) => bySlug.get(slug)).filter((c): c is Campaign => Boolean(c));
      return matched.length > 0 ? matched : getAlmostThereCampaigns(count);
    }
    case "all":
      return getActiveCampaignsLive();
    case "lowest":
      return getLowestProgressCampaigns(count);
    case "near":
    default:
      return getAlmostThereCampaigns(count);
  }
}

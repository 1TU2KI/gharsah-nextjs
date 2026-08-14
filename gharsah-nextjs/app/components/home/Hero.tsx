import HeroClient from "./HeroClient";
import { getCampaignsWithLiveFields } from "../../lib/campaignLiveSync";

/**
 * All figures here come from the same live-resolved campaign data used by
 * the campaign cards/detail pages (`getCampaignsWithLiveFields`) — never
 * hardcoded. Raised/goal amounts and donor counts are deliberately excluded
 * (see CLAUDE.md's sync reliability findings): they aren't synced anywhere
 * else on the site, so showing them here would be a fake/estimated figure.
 *
 * Stays a Server Component purely for the data fetch; the actual markup
 * (which needs the language context to translate its labels) lives in
 * `HeroClient`.
 */
export default async function Hero() {
  const campaigns = await getCampaignsWithLiveFields();
  const activeCampaigns = campaigns.filter((c) => c.status === "active");
  const completedCampaigns = campaigns.filter((c) => c.status === "completed" || c.status === "closed");
  const totalCount = activeCampaigns.length + completedCampaigns.length;

  const activePercentages = activeCampaigns
    .map((c) => c.percent)
    .filter((percent): percent is number => percent !== undefined);
  const averageActivePercent =
    activePercentages.length > 0
      ? Math.round(activePercentages.reduce((sum, percent) => sum + percent, 0) / activePercentages.length)
      : null;

  return (
    <HeroClient
      totalCount={totalCount}
      averageActivePercent={averageActivePercent}
      completedCount={completedCampaigns.length}
      activeCount={activeCampaigns.length}
    />
  );
}

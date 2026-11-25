import CompletedCasesSectionClient from "./CompletedCasesSectionClient";
import { getCompletedCampaignsLive } from "../../lib/campaignLiveSync";

export default async function CompletedCasesSection() {
  const allCampaigns = await getCompletedCampaignsLive();
  const campaigns = [...allCampaigns]
    .sort(
      (a, b) =>
        (Date.parse(b.completedAt ?? "") || 0) - (Date.parse(a.completedAt ?? "") || 0) ||
        (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0),
    )
    .slice(0, 3);

  return <CompletedCasesSectionClient campaigns={campaigns} totalCount={allCampaigns.length} />;
}

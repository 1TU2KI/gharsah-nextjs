import ActiveCasesSectionClient from "./ActiveCasesSectionClient";
import { getActiveCampaignsLive } from "../../lib/campaignLiveSync";

export default async function ActiveCasesSection() {
  const allCampaigns = await getActiveCampaignsLive();
  const campaigns = [...allCampaigns]
    .sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0))
    .slice(0, 3);

  return <ActiveCasesSectionClient campaigns={campaigns} totalCount={allCampaigns.length} />;
}
